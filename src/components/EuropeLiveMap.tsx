import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Clock,
  Globe,
  Maximize2,
  Minimize2,
  Navigation,
  Radio,
  Repeat,
  ThermometerSnowflake,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { TrailerUnit, formatCountryBadge } from '../data/mockData';
import { REAL_TRUCK_HIGHWAY_GEOMETRIES } from '../data/highwayGeometries';
import {
  AppleWeatherType,
  CORRIDOR_ROUTES,
  MapTripItem,
  RouteDefinition,
} from '../utils/planningRouteSync';
import {
  attachLiveRainViewerRadar,
  getCachedLiveEuropeanWeather,
  LiveEuropeanWeatherSnapshot,
  resolveLiveCheckpointWeather,
  subscribeLiveEuropeanWeather,
} from '../utils/accuWeatherCanvas';
import {
  attachSolarTerminatorOverlay,
  computeSubsolarPoint,
  isNightAtCoords,
} from '../utils/solarTerminator';
import {
  computeHgvRouteMetrics,
  resolveHgvVehicleProfile,
} from '../utils/googleMapsLinks';

export { CORRIDOR_ROUTES };
export type { RouteDefinition };

interface EuropeLiveMapProps {
  trailers: TrailerUnit[];
  liveFleetPositions?: {
    plate: string;
    place: string;
    coords: [number, number];
    speedKmh?: number;
    ping?: string;
  }[];
  activeTrips?: MapTripItem[];
  pastTrips?: MapTripItem[];
  singleTripItem?: MapTripItem;
  tripScopeFilter?: 'active' | 'past';
  onTripScopeFilterChange?: (scope: 'active' | 'past') => void;
  onSelectTrailer?: (trailerId: string) => void;
  onNavigateSwap?: () => void;
  heightClass?: string;
  singleTripMode?: boolean;
  hideRouteDetailsBelow?: boolean;
  embeddedInCard?: boolean;
  cleanCompactHud?: boolean;
}

// Restul capetelor tractor reale din evidența flotei (Google Sheet).
// ATENȚIE: pozițiile sunt de TEST (mock) — se înlocuiesc cu GPS real când e conectat furnizorul.
const MOCK_FLEET_POSITIONS: { plate: string; place: string; coords: [number, number] }[] = [
  { plate: 'BH 50 STS', place: 'Oradea (bază)', coords: [47.075, 21.93] },
  { plate: 'IF 74 STS', place: 'Szolnok (HU)', coords: [47.1621, 20.1825] },
  { plate: 'BH 49 STS', place: 'Budapesta M0 (HU)', coords: [47.42, 19.15] },
  { plate: 'BH 12 STS', place: 'Arad (RO)', coords: [46.1866, 21.3123] },
  { plate: 'BH 30 STS', place: 'Győr (HU)', coords: [47.6875, 17.6504] },
  { plate: 'BH 72 STS', place: 'Salzburg (AT)', coords: [47.8095, 13.055] },
  { plate: 'BH 81 STS', place: 'München (DE)', coords: [48.1351, 11.582] },
  { plate: 'BH 07 XTS', place: 'Stuttgart (DE)', coords: [48.7758, 9.1829] },
  { plate: 'IF 12 STS', place: 'Frankfurt (DE)', coords: [50.1109, 8.6821] },
  { plate: 'IF 20 STS', place: 'Venlo (NL)', coords: [51.3704, 6.1724] },
  { plate: 'IF 30 BTS', place: 'Hamburg (DE)', coords: [53.5511, 9.9937] },
  { plate: 'BH 41 STS', place: 'Cluj-Napoca (RO)', coords: [46.7712, 23.6236] },
  { plate: 'B 166 STS', place: 'București (RO)', coords: [44.4268, 26.1025] },
];

const SWAP_HUBS = [
  {
    id: 'swap-1',
    name: 'Autohof Hegyeshalom (M1/A4)',
    coords: [47.9144, 17.1528] as [number, number],
    desc: 'SWAP-01: BH 46 STS ↔ B 506 STS (Sync 7 min)',
  },
  {
    id: 'swap-2',
    name: 'Autohof Neumarkt (A3 DE)',
    coords: [49.2789, 11.4611] as [number, number],
    desc: 'SWAP-02: Releu Echipaj 2 Șoferi pt. BH 69 STS',
  },
  {
    id: 'swap-3',
    name: 'Greenport Venlo (A67 NL/DE)',
    coords: [51.385, 6.145] as [number, number],
    desc: 'SWAP-03: Drop & Hook eliberare anticipată BH 91 STS',
  },
];

// Pre-loaded 560-point OSRM highway geometries for 100% terrestrial HGV truck routes (zero aerial lines)
const osrmRoadGeometryCache: Record<string, [number, number][]> = {
  ...REAL_TRUCK_HIGHWAY_GEOMETRIES,
};

function buildFallbackItemsFromTrailers(trailers: TrailerUnit[]): MapTripItem[] {
  const items: MapTripItem[] = [];
  for (const trailer of trailers) {
    const baseRoute = CORRIDOR_ROUTES[trailer.id];
    if (!baseRoute) continue;
    const fromCity = trailer.routeSummary[0] || baseRoute.checkpoints[0]?.city || '';
    const toCity =
      trailer.routeSummary[trailer.routeSummary.length - 1] ||
      baseRoute.checkpoints[baseRoute.checkpoints.length - 1]?.city ||
      '';
    items.push({
      mapId: trailer.id,
      lifecycle: 'in_transit',
      badgeLabel: 'În tranzit',
      shortTimeBadge: 'LIVE',
      scheduleFullLabel: baseRoute.transitWindow,
      routeSummaryText: `${fromCity} → ${toCity}`,
      trailer,
      routeDef: baseRoute,
    });
  }
  return items;
}

export const EuropeLiveMap: React.FC<EuropeLiveMapProps> = ({
  trailers,
  liveFleetPositions,
  activeTrips,
  pastTrips = [],
  singleTripItem,
  tripScopeFilter,
  onTripScopeFilterChange,
  onSelectTrailer,
  onNavigateSwap,
  heightClass = 'h-[360px] sm:h-[420px]',
  singleTripMode = false,
  hideRouteDetailsBelow = false,
  embeddedInCard = false,
  cleanCompactHud = false,
}) => {
  const mapHostWrapperRef = useRef<HTMLDivElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const weatherLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [internalScope, setInternalScope] = useState<'active' | 'past'>('active');
  const effectiveScope = tripScopeFilter ?? internalScope;

  const setScope = (next: 'active' | 'past') => {
    if (onTripScopeFilterChange) {
      onTripScopeFilterChange(next);
    } else {
      setInternalScope(next);
    }
  };

  const resolvedActiveTrips = useMemo<MapTripItem[]>(() => {
    if (singleTripItem) return [singleTripItem];
    if (activeTrips && activeTrips.length > 0) return activeTrips;
    return buildFallbackItemsFromTrailers(trailers);
  }, [singleTripItem, activeTrips, trailers]);

  const resolvedPastTrips = useMemo<MapTripItem[]>(() => {
    if (singleTripItem) return [];
    return pastTrips;
  }, [singleTripItem, pastTrips]);

  const isSingle = singleTripMode || Boolean(singleTripItem) || ( !activeTrips && trailers.length === 1 );

  const currentScopeItems = useMemo<MapTripItem[]>(() => {
    if (isSingle) {
      return singleTripItem ? [singleTripItem] : resolvedActiveTrips.slice(0, 1);
    }
    return effectiveScope === 'past' ? resolvedPastTrips : resolvedActiveTrips;
  }, [isSingle, singleTripItem, effectiveScope, resolvedPastTrips, resolvedActiveTrips]);

  const allKnownItems = useMemo<MapTripItem[]>(() => {
    if (singleTripItem) return [singleTripItem];
    return [...resolvedActiveTrips, ...resolvedPastTrips];
  }, [singleTripItem, resolvedActiveTrips, resolvedPastTrips]);

  const firstItemId = currentScopeItems[0]?.mapId || resolvedActiveTrips[0]?.mapId || 'BH 67 STS';

  const [focusedMapId, setFocusedMapId] = useState<string>(
    isSingle ? firstItemId : 'ALL'
  );
  const [selectedTrackerId, setSelectedTrackerId] = useState<string>(firstItemId);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [showWeatherRadar, setShowWeatherRadar] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('bluetrans_map_weather_on_v1');
      return saved === null ? true : saved === '1';
    } catch {
      return true;
    }
  });
  const [showDayNight, setShowDayNight] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('bluetrans_map_daynight_on_v1');
      return saved === null ? true : saved === '1';
    } catch {
      return true;
    }
  });
  const [solarTick, setSolarTick] = useState<number>(0);

  useEffect(() => {
    try {
      localStorage.setItem('bluetrans_map_weather_on_v1', showWeatherRadar ? '1' : '0');
    } catch {
      // ignore
    }
  }, [showWeatherRadar]);

  useEffect(() => {
    try {
      localStorage.setItem('bluetrans_map_daynight_on_v1', showDayNight ? '1' : '0');
    } catch {
      // ignore
    }
  }, [showDayNight]);

  useEffect(() => {
    const id = setInterval(() => {
      setSolarTick((n) => n + 1);
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const liveSubsolar = useMemo(() => computeSubsolarPoint(Date.now()), [solarTick]);

  const [liveWeatherSnap, setLiveWeatherSnap] =
    useState<LiveEuropeanWeatherSnapshot | null>(() =>
      getCachedLiveEuropeanWeather()
    );
  const [weatherHudCollapsed, setWeatherHudCollapsed] = useState<boolean>(false);
  const [mapViewMeta, setMapViewMeta] = useState<{
    zoom: number;
    centerLat: number;
    centerLng: number;
    inBoundsIds: string[];
  }>({
    zoom: 5,
    centerLat: 50.2,
    centerLng: 12.8,
    inBoundsIds: [],
  });

  useEffect(() => {
    return subscribeLiveEuropeanWeather((snap) => {
      setLiveWeatherSnap(snap);
    });
  }, []);

  const [roadGeometries, setRoadGeometries] = useState<
    Record<string, [number, number][]>
  >(osrmRoadGeometryCache);

  // Sync selection & map bounds when scope ('active' <-> 'past') or singleTripItem changes
  useEffect(() => {
    if (isSingle) {
      const target = currentScopeItems[0];
      if (!target) return;
      setFocusedMapId(target.mapId);
      setSelectedTrackerId(target.mapId);
      const map = mapInstanceRef.current;
      if (map) {
        const roadPath = roadGeometries[target.mapId] || target.routeDef.coordinates;
        if (roadPath.length >= 2) {
          map.fitBounds(L.latLngBounds(roadPath), { padding: [28, 28], animate: false });
        }
        const t = setTimeout(() => {
          if (mapInstanceRef.current === map && mapContainerRef.current?.isConnected) {
            map.invalidateSize({ animate: false });
          }
        }, 100);
        return () => clearTimeout(t);
      }
      return;
    }

    setFocusedMapId('ALL');
    if (currentScopeItems.length > 0) {
      setSelectedTrackerId((prev) =>
        currentScopeItems.some((it) => it.mapId === prev)
          ? prev
          : currentScopeItems[0].mapId
      );
    }
    const map = mapInstanceRef.current;
    if (map && currentScopeItems.length > 0) {
      const allPoints = currentScopeItems.flatMap(
        (it) => roadGeometries[it.mapId] || it.routeDef.coordinates
      );
      if (allPoints.length >= 2) {
        map.fitBounds(L.latLngBounds(allPoints), {
          padding: [28, 28],
          animate: false,
        });
      }
    }
  }, [isSingle, effectiveScope, singleTripItem?.mapId, singleTripItem?.routeSummaryText]);

  // Re-fit single-trip bounds once OSRM geometry arrives
  useEffect(() => {
    if (!isSingle) return;
    const target = currentScopeItems[0];
    const map = mapInstanceRef.current;
    if (!map || !target) return;
    const roadPath = roadGeometries[target.mapId] || target.routeDef.coordinates;
    if (roadPath.length >= 2) {
      map.fitBounds(L.latLngBounds(roadPath), { padding: [28, 28] });
    }
  }, [isSingle, roadGeometries, currentScopeItems]);

  useEffect(() => {
    if (isFullScreen) {
      document.body.classList.add('modal-scroll-locked');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.classList.remove('modal-scroll-locked');
      document.body.style.overflow = '';
    }
    const timer1 = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 60);
    const timer2 = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 240);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('modal-scroll-locked');
      document.body.style.overflow = '';
    };
  }, [isFullScreen]);

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn(1);
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut(1);
  };

  const handleToggleFullScreen = () => {
    setIsFullScreen((prev) => !prev);
  };

  const activeItem: MapTripItem | undefined =
    currentScopeItems.find((it) => it.mapId === selectedTrackerId) ||
    currentScopeItems[0] ||
    resolvedActiveTrips[0];

  // Fetch exact road geometry from OSRM driving router for both base corridors and newly created Planning trips
  useEffect(() => {
    let isMounted = true;

    const loadRealRoadGeometries = async () => {
      const updated: Record<string, [number, number][]> = {
        ...osrmRoadGeometryCache,
      };
      let changed = false;

      for (const item of allKnownItems) {
        if (updated[item.mapId]) continue;
        const coordsList = item.routeDef.coordinates;
        if (!coordsList || coordsList.length < 2) continue;

        try {
          const step = Math.max(1, Math.floor(coordsList.length / 8));
          const anchors = coordsList.filter(
            (_, idx) =>
              idx === 0 || idx === coordsList.length - 1 || idx % step === 0
          );
          const coordString = anchors
            .map(([lat, lng]) => `${lng},${lat}`)
            .join(';');

          const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;
          const res = await fetch(url);
          if (!res.ok) continue;
          const data = await res.json();
          const coords = data?.routes?.[0]?.geometry?.coordinates;
          if (Array.isArray(coords) && coords.length > 12) {
            const latLngs: [number, number][] = coords.map(
              (pair: [number, number]) => [pair[1], pair[0]]
            );
            updated[item.mapId] = latLngs;
            osrmRoadGeometryCache[item.mapId] = latLngs;
            changed = true;
          }
        } catch {
          // Fallback is the terrestrial corridor waypoint array in item.routeDef.coordinates
        }
      }

      if (isMounted && changed) {
        setRoadGeometries({ ...updated });
      }
    };

    loadRealRoadGeometries();
    return () => {
      isMounted = false;
    };
  }, [allKnownItems]);

  // Initialize Leaflet Map (re-mounts cleanly when switching between inline and Full Screen portal)
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [50.2, 12.8],
      zoom: 5,
      minZoom: 2,
      maxZoom: 15,
      worldCopyJump: true,
      maxBounds: [
        [-85, -360],
        [85, 360],
      ],
      maxBoundsViscosity: 0.85,
      zoomControl: false,
      scrollWheelZoom: isFullScreen,
      doubleClickZoom: isFullScreen,
      boxZoom: false,
      attributionControl: true,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap · Rutare Autostrăzi HGV',
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    const weatherGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    layerGroupRef.current = group;
    weatherLayerGroupRef.current = weatherGroup;

    const syncViewportZoom = () => {
      if (!mapInstanceRef.current || !mapContainerRef.current?.isConnected) return;
      const z = map.getZoom();
      const c = map.getCenter();
      setMapViewMeta((prev) => {
        if (
          prev.zoom === z &&
          Math.abs(prev.centerLat - c.lat) < 0.05 &&
          Math.abs(prev.centerLng - c.lng) < 0.05
        ) {
          return prev;
        }
        return {
          ...prev,
          zoom: z,
          centerLat: c.lat,
          centerLng: c.lng,
        };
      });
    };
    map.on('zoomend moveend', syncViewportZoom);

    const targetItem = isSingle
      ? currentScopeItems[0]
      : focusedMapId !== 'ALL'
        ? currentScopeItems.find((it) => it.mapId === focusedMapId)
        : undefined;

    const fitCurrentScopeBounds = () => {
      const containerW = mapContainerRef.current?.clientWidth || 960;
      const compactMobile = containerW < 640;
      const padTL: [number, number] = isFullScreen
        ? compactMobile
          ? [22, 62]
          : [72, 74]
        : [24, 34];
      const padBR: [number, number] = isFullScreen
        ? compactMobile
          ? [22, 36]
          : [72, 54]
        : [24, 24];

      if (targetItem) {
        const roadPath =
          roadGeometries[targetItem.mapId] || targetItem.routeDef.coordinates;
        if (roadPath.length >= 2) {
          map.fitBounds(L.latLngBounds(roadPath), {
            paddingTopLeft: padTL,
            paddingBottomRight: padBR,
            animate: false,
          });
        }
      } else if (currentScopeItems.length > 0) {
        const allPts = currentScopeItems.flatMap(
          (it) => roadGeometries[it.mapId] || it.routeDef.coordinates
        );
        if (allPts.length >= 2) {
          map.fitBounds(L.latLngBounds(allPts), {
            paddingTopLeft: padTL,
            paddingBottomRight: padBR,
            animate: false,
          });
        }
      } else {
        const mainBounds = L.latLngBounds([
          [44.4, 4.2],
          [59.5, 26.2],
        ]);
        map.fitBounds(mainBounds, {
          paddingTopLeft: padTL,
          paddingBottomRight: padBR,
          animate: false,
        });
      }
    };

    fitCurrentScopeBounds();

    const initTimer = setTimeout(() => {
      if (!mapInstanceRef.current || !mapContainerRef.current?.isConnected) return;
      map.invalidateSize({ animate: false });
      fitCurrentScopeBounds();
    }, 120);

    const resizeObs = new ResizeObserver(() => {
      if (!mapInstanceRef.current || !mapContainerRef.current?.isConnected) return;
      map.invalidateSize({ animate: false });
    });
    if (mapContainerRef.current) {
      resizeObs.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(initTimer);
      resizeObs.disconnect();
      map.off();
      try {
        map.stop();
        map.remove();
      } catch {
        // Guard Leaflet teardown race on rapid navigation away from Control Center
      }
      mapInstanceRef.current = null;
      layerGroupRef.current = null;
      weatherLayerGroupRef.current = null;
    };
  }, [isFullScreen]);

  // Real-time Astronomical Day / Night Solar Terminator Overlay across the Globe
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !showDayNight) return;

    const detachTerminator = attachSolarTerminatorOverlay(map);
    return () => {
      detachTerminator();
    };
  }, [showDayNight, isFullScreen]);

  // 100% Real Live RainViewer Doppler Radar ONLY (zero synthetic canvas lines or fake rain streaks)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !showWeatherRadar) return;

    const detachRadarTiles = attachLiveRainViewerRadar(map);
    return () => {
      detachRadarTiles();
    };
  }, [showWeatherRadar, isFullScreen]);

  // 100% Real Live Open-Meteo Corridor Weather Pills anchored at EXACT real [lat, lng] city coordinates
  useEffect(() => {
    const map = mapInstanceRef.current;
    const weatherGroup = weatherLayerGroupRef.current;
    if (!map || !weatherGroup) return;

    if (!showWeatherRadar || !liveWeatherSnap) {
      weatherGroup.clearLayers();
      return;
    }

    const weatherBadgePane = 'weatherBadgesPane';
    if (!map.getPane(weatherBadgePane)) {
      const pane = map.createPane(weatherBadgePane);
      pane.style.zIndex = '650';
      pane.style.pointerEvents = 'none';
    }

    const getSvgWeatherPin = (kind: AppleWeatherType, isNight = false) => {
      if (kind === 'sun') {
        if (isNight) {
          return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10Z" fill="#FDE68A" stroke="#FBBF24" stroke-width="1.4" stroke-linejoin="round"/><circle cx="17.5" cy="6" r="1.2" fill="#FEF3C7"/></svg>`;
        }
        return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5.5" fill="#FBBF24"/><g stroke="#F59E0B" stroke-width="2" stroke-linecap="round"><line x1="12" y1="2" x2="12" y2="4.5"/><line x1="12" y1="19.5" x2="12" y2="22"/><line x1="2" y1="12" x2="4.5" y2="12"/><line x1="19.5" y1="12" x2="22" y2="12"/><line x1="4.9" y1="4.9" x2="6.7" y2="6.7"/><line x1="17.3" y1="17.3" x2="19.1" y2="19.1"/><line x1="19.1" y1="4.9" x2="17.3" y2="6.7"/><line x1="6.7" y1="17.3" x2="4.9" y2="19.1"/></g></svg>`;
      }
      if (kind === 'partly-cloudy') {
        if (isNight) {
          return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M13.6 9.6A4.5 4.5 0 0 1 7.6 3.6a4.5 4.5 0 1 0 6 6Z" fill="#FDE68A"/><path d="M9.2 18.5H17.4C19.6 18.5 21.4 16.8 21.4 14.6C21.4 12.6 19.9 11 18 10.8C17.3 8.3 15 6.5 12.3 6.5C9.2 6.5 6.7 8.8 6.4 11.8C4.7 12.2 3.5 13.7 3.5 15.5C3.5 17.2 4.8 18.5 6.5 18.5H9.2Z" fill="#93C5FD"/></svg>`;
        }
        return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="9" r="3.8" fill="#FBBF24"/><path d="M9.2 18.5H17.4C19.6 18.5 21.4 16.8 21.4 14.6C21.4 12.6 19.9 11 18 10.8C17.3 8.3 15 6.5 12.3 6.5C9.2 6.5 6.7 8.8 6.4 11.8C4.7 12.2 3.5 13.7 3.5 15.5C3.5 17.2 4.8 18.5 6.5 18.5H9.2Z" fill="#93C5FD"/></svg>`;
      }
      if (kind === 'snow') {
        return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M8.5 15H17.2C19.3 15 21 13.4 21 11.3C21 9.4 19.6 7.8 17.8 7.6C17.1 5.2 14.9 3.5 12.3 3.5C9.3 3.5 6.9 5.7 6.6 8.6C5 9 3.8 10.4 3.8 12.1C3.8 13.7 5.1 15 6.8 15H8.5Z" fill="#38BDF8"/><circle cx="8.5" cy="18.5" r="1.4" fill="#E0F2FE"/><circle cx="12.5" cy="19.8" r="1.4" fill="#E0F2FE"/><circle cx="16.5" cy="18.5" r="1.4" fill="#E0F2FE"/></svg>`;
      }
      if (kind === 'wind') {
        return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 9.5H16.5C18.2 9.5 19.5 8.2 19.5 6.5C19.5 4.8 18.2 3.5 16.5 3.5C15 3.5 13.8 4.6 13.6 6" stroke="#38BDF8" stroke-width="2.2" stroke-linecap="round"/><path d="M3 14H18.5C20.2 14 21.5 15.3 21.5 17C21.5 18.7 20.2 20 18.5 20C17 20 15.8 18.9 15.6 17.5" stroke="#0EA5E9" stroke-width="2.2" stroke-linecap="round"/></svg>`;
      }
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M8.5 15.5H17.2C19.3 15.5 21 13.9 21 11.8C21 9.9 19.6 8.3 17.8 8.1C17.1 5.7 14.9 4 12.3 4C9.3 4 6.9 6.2 6.6 9.1C5 9.5 3.8 10.9 3.8 12.6C3.8 14.2 5.1 15.5 6.8 15.5H8.5Z" fill="#3B82F6"/><g stroke="#38BDF8" stroke-width="2" stroke-linecap="round"><line x1="8.5" y1="17.5" x2="7.5" y2="20.5"/><line x1="12.5" y1="17.5" x2="11.5" y2="20.5"/><line x1="16.5" y1="17.5" x2="15.5" y2="20.5"/></g></svg>`;
    };

    const renderWeatherPills = () => {
      if (!mapInstanceRef.current || !mapContainerRef.current?.isConnected) return;
      weatherGroup.clearLayers();

      const currentZoom = map.getZoom();
      const mapCenter = map.getCenter();
      const mapBounds = map.getBounds();
      const visibleIds = liveWeatherSnap.stations
        .filter((st) => mapBounds.contains([st.lat, st.lng]))
        .map((st) => st.id);
      setMapViewMeta((prev) => {
        if (
          prev.zoom === currentZoom &&
          Math.abs(prev.centerLat - mapCenter.lat) < 0.05 &&
          Math.abs(prev.centerLng - mapCenter.lng) < 0.05 &&
          prev.inBoundsIds.join(',') === visibleIds.join(',')
        ) {
          return prev;
        }
        return {
          zoom: currentZoom,
          centerLat: mapCenter.lat,
          centerLng: mapCenter.lng,
          inBoundsIds: visibleIds,
        };
      });

      // At global world zoom (<= 3), keep continents & terminator clean without overlapping European text callouts
      if (currentZoom <= 3) {
        return;
      }

      const routeCitiesSet = new Set(
        currentScopeItems.flatMap((it) =>
          [
            ...(it.trailer?.routeSummary || []),
            ...it.routeDef.checkpoints.map((cp) => cp.city),
          ].map((c) =>
            c
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .trim()
          )
        )
      );

      const candidateStations = liveWeatherSnap.stations.filter(
        (st) =>
          Boolean(st.pillAnchor) &&
          currentZoom >= (st.minZoomForPill ?? 0)
      );

      const mapStations =
        cleanCompactHud && !isFullScreen
          ? candidateStations.filter((st) => {
              const norm = st.city
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .trim();
              return (
                routeCitiesSet.has(norm) ||
                routeCitiesSet.has(norm === 'budapest' ? 'budapesta' : norm) ||
                routeCitiesSet.has(norm === 'vienna' ? 'viena' : norm) ||
                (norm === 'budapesta' && routeCitiesSet.has('budapesta')) ||
                (norm === 'viena' && routeCitiesSet.has('viena')) ||
                (norm === 'koln' && (routeCitiesSet.has('koln') || routeCitiesSet.has('köln')))
              );
            })
          : candidateStations;

      const placedBoxes: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

      mapStations.forEach((st) => {
        // 100% exact geographic coordinates of the city (NEVER offset in degrees)
        const exactCityCoords: [number, number] = [st.lat, st.lng];
        const pt = map.latLngToContainerPoint(exactCityCoords);
        const mapSize = map.getSize();
        // Avoid overlapping top map controls bar
        if (pt.y < 52 || pt.y > mapSize.y - 14 || pt.x < 18 || pt.x > mapSize.x - 18) {
          return;
        }
        let anchor = st.pillAnchor || 'top';

        // Viewport-edge protection on narrow mobile screens (keeps pinpoint dead-on [lat, lng])
        if (anchor === 'left' && pt.x < 142) {
          anchor = 'bottom';
        } else if (anchor === 'right' && pt.x > mapSize.x - 148) {
          anchor = 'bottom';
        } else if (anchor === 'top' && pt.y < 76) {
          anchor = 'bottom';
        }

        if (cleanCompactHud && !isFullScreen) {
          const box = { x1: pt.x - 32, y1: pt.y - 24, x2: pt.x + 32, y2: pt.y + 18 };
          const overlaps = placedBoxes.some(
            (b) => !(box.x2 < b.x1 || box.x1 > b.x2 || box.y2 < b.y1 || box.y1 > b.y2)
          );
          if (overlaps) return;
          placedBoxes.push(box);
        }

        const roundedTemp = Math.round(st.tempC);
        const tempLabel = roundedTemp > 0 ? `+${roundedTemp}°C` : `${roundedTemp}°C`;
        const isBreezyDry =
          st.weatherType !== 'rain' &&
          st.weatherType !== 'snow' &&
          st.windSpeedKmh >= 20;
        const pinKind: AppleWeatherType = isBreezyDry ? 'wind' : st.weatherType;
        const cityIsNight = isNightAtCoords(st.lat, st.lng, liveSubsolar);
        const detailLabel = isBreezyDry
          ? `${Math.round(st.windSpeedKmh)} km/h`
          : st.weatherDescRo;

        const borderColor =
          pinKind === 'snow'
            ? '#818cf8'
            : pinKind === 'rain'
              ? '#38bdf8'
              : pinKind === 'wind'
                ? '#0ea5e9'
                : pinKind === 'sun'
                  ? cityIsNight
                    ? '#818cf8'
                    : '#f59e0b'
                  : 'rgba(148, 163, 184, 0.9)';

        const topShiftPct =
          st.id === 'rotterdam'
            ? pt.x < 120
              ? -35
              : -78
            : pt.x < 75
              ? -22
              : pt.x > mapSize.x - 75
                ? -78
                : -50;

        let pillPosStyle = `left:0; top:-16px; transform:translate(${topShiftPct}%, -100%);`;
        let stemStyle = `left:-1px; top:-16px; width:2px; height:16px; background:${borderColor};`;
        if (anchor === 'bottom') {
          const bottomShiftPct =
            pt.x < 85 ? -18 : pt.x > mapSize.x - 85 ? -82 : -50;
          pillPosStyle = `left:0; top:15px; transform:translateX(${bottomShiftPct}%);`;
          stemStyle = `left:-1px; top:0; width:2px; height:15px; background:${borderColor};`;
        } else if (anchor === 'left') {
          pillPosStyle = 'left:-15px; top:0; transform:translate(-100%, -50%);';
          stemStyle = `left:-15px; top:-1px; width:15px; height:2px; background:${borderColor};`;
        } else if (anchor === 'right') {
          pillPosStyle = 'left:14px; top:0; transform:translateY(-50%);';
          stemStyle = `left:0; top:-1px; width:14px; height:2px; background:${borderColor};`;
        }

        const frontBadge = L.divIcon({
          className: 'accuweather-front-badge',
          html: `
            <div style="position:relative; width:0; height:0; pointer-events:none;">
              <span
                data-city-stem="${st.id}"
                style="position:absolute; ${stemStyle} opacity:0.9; box-shadow:0 1px 3px rgba(0,0,0,0.55); pointer-events:none;"
              ></span>
              <span
                data-city-pinpoint="${st.id}"
                style="
                  position:absolute;
                  left:-3.5px;
                  top:-3.5px;
                  width:7px;
                  height:7px;
                  border-radius:9999px;
                  background:${borderColor};
                  border:1.5px solid #ffffff;
                  box-shadow:0 1px 5px rgba(0,0,0,0.7);
                  pointer-events:none;
                "
              ></span>
              <div
                data-city-pill="${st.id}"
                style="
                  position:absolute;
                  ${pillPosStyle}
                  display:inline-flex;
                  align-items:center;
                  gap:5px;
                  width:max-content;
                  background:rgba(15, 23, 42, 0.92);
                  border:1.5px solid ${borderColor};
                  border-radius:9999px;
                  padding:2px 8px;
                  color:#ffffff;
                  font-size:10px;
                  font-weight:800;
                  white-space:nowrap;
                  box-shadow:0 4px 12px rgba(0,0,0,0.5);
                  pointer-events:none;
                "
              >
                ${getSvgWeatherPin(pinKind, cityIsNight)}
                <span style="color:#ffffff;">${
                  cleanCompactHud && !isFullScreen
                    ? tempLabel
                    : `${st.city} ${tempLabel} · ${detailLabel}`
                }</span>
              </div>
            </div>
          `,
          iconSize: [0, 0],
        });
        L.marker(exactCityCoords, {
          icon: frontBadge,
          interactive: false,
          pane: weatherBadgePane,
        }).addTo(weatherGroup);
      });
    };

    renderWeatherPills();
    map.on('zoomend moveend', renderWeatherPills);
    return () => {
      map.off('zoomend moveend', renderWeatherPills);
    };
  }, [showWeatherRadar, isFullScreen, liveWeatherSnap, liveSubsolar, cleanCompactHud, currentScopeItems]);

  const isGlobeOverview = mapViewMeta.zoom <= 3;

  // Render Real Road Corridors, Checkpoints, Swap Hubs, and Status-Aware Truck Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    const visibleItems =
      focusedMapId === 'ALL'
        ? currentScopeItems
        : currentScopeItems.filter((it) => it.mapId === focusedMapId);

    const activePlatesOnMap = new Set<string>();

    visibleItems.forEach((item) => {
      const { trailer, routeDef: route, lifecycle } = item;
      const trPlate = trailer.tractorId.split(' (')[0];
      activePlatesOnMap.add(trailer.id);
      if (trPlate) activePlatesOnMap.add(trPlate);

      const isHighlighted =
        focusedMapId === item.mapId || selectedTrackerId === item.mapId;

      const roadPath = roadGeometries[item.mapId] || route.coordinates;
      if (!roadPath || roadPath.length < 2) return;

      const lineColor =
        lifecycle === 'past'
          ? isHighlighted
            ? '#10b981'
            : '#64748b'
          : route.color;

      // 1. Road Casing
      L.polyline(roadPath, {
        color: '#0f172a',
        weight: isHighlighted ? 7.5 : 4.5,
        opacity: isHighlighted ? 0.55 : 0.25,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(group);

      // 2. Highway Route Line (Solid for În tranzit & Trecute, Crisp Planned Dash along Highway for Planificată)
      L.polyline(roadPath, {
        color: lineColor,
        weight: isHighlighted ? 4.5 : 2.5,
        opacity: isHighlighted ? 0.98 : 0.68,
        dashArray: lifecycle === 'planned' ? '8 6' : undefined,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(group);

      // 3. Checkpoint City Dots along the highlighted route (10px dot centered dead-on cp.coords)
      if (isHighlighted && !isGlobeOverview) {
        route.checkpoints.forEach((cp) => {
          const dotIcon = L.divIcon({
            className: 'custom-cp-dot',
            html: `
              <div style="position:relative; width:0; height:0;">
                <div style="
                  position:absolute;
                  left:-5px;
                  top:-5px;
                  width:10px;
                  height:10px;
                  border-radius:9999px;
                  background:${cp.completed ? '#16a34a' : '#ffffff'};
                  border:2.5px solid ${cp.completed ? '#16a34a' : lineColor};
                  box-shadow:0 2px 6px rgba(0,0,0,0.45);
                "></div>
                <span style="
                  position:absolute;
                  left:0;
                  top:7px;
                  transform:translateX(-50%);
                  padding:1px 6px;
                  border-radius:5px;
                  background:rgba(15,23,42,0.92);
                  color:#ffffff;
                  font-size:9px;
                  font-weight:700;
                  white-space:nowrap;
                  box-shadow:0 2px 6px rgba(0,0,0,0.35);
                ">${cp.city}</span>
              </div>
            `,
            iconSize: [0, 0],
          });

          L.marker(cp.coords, { icon: dotIcon }).addTo(group);
        });
      }

      // 4. Status-Aware Marker (Live Truck vs Planned Departure vs Completed Check)
      const truckCoords: [number, number] = [
        trailer.currentLocation.lat,
        trailer.currentLocation.lng,
      ];
      const plateDisplay =
        trPlate && trPlate !== trailer.id
          ? `${trPlate} + ${trailer.id}`
          : trailer.id;

      const rightPillText =
        lifecycle === 'past'
          ? `✓ ${item.shortTimeBadge}`
          : lifecycle === 'planned'
            ? `◷ ${item.shortTimeBadge}`
            : `${trailer.freeLdm.toFixed(1)} LDM`;

      const rightPillColor =
        lifecycle === 'past'
          ? '#34d399'
          : lifecycle === 'planned'
            ? '#fbbf24'
            : '#4ade80';

      const iconGlyph =
        lifecycle === 'past'
          ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`
          : lifecycle === 'planned'
            ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`
            : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>`;

      const pinBg =
        lifecycle === 'past'
          ? '#059669'
          : lifecycle === 'planned'
            ? '#d97706'
            : lineColor;

      const truckIcon = L.divIcon({
        className: 'custom-truck-marker',
        html: isGlobeOverview
          ? `
          <div style="
            transform:translate(-5px, -5px);
            width:10px;
            height:10px;
            border-radius:9999px;
            background:${pinBg};
            border:1.5px solid #ffffff;
            box-shadow:0 0 8px ${pinBg};
            cursor:pointer;
          " title="${plateDisplay} · ${item.routeSummaryText}"></div>
        `
          : isHighlighted
            ? `
          <div style="
            display:flex;
            align-items:center;
            gap:6px;
            transform:translate(-16px, -16px);
            cursor:pointer;
            z-index:900;
          ">
            <div style="
              width:32px;
              height:32px;
              border-radius:9999px;
              background:${pinBg};
              border:2.5px solid #ffffff;
              box-shadow:0 4px 14px rgba(0,0,0,0.55);
              display:flex;
              align-items:center;
              justify-content:center;
              color:#ffffff;
              flex-shrink:0;
            ">
              ${iconGlyph}
            </div>
            <div style="
              background:rgba(15, 23, 42, 0.96);
              border:1.5px solid ${pinBg};
              border-radius:9999px;
              padding:3px 8px;
              box-shadow:0 4px 12px rgba(0,0,0,0.45);
              white-space:nowrap;
              display:flex;
              align-items:center;
              gap:5px;
            ">
              <span style="
                display:inline-flex;
                align-items:stretch;
                border-radius:3px;
                overflow:hidden;
                border:1px solid #64748b;
                background:#ffffff;
                height:15px;
              ">
                <span style="
                  background:#003399;
                  color:#ffffff;
                  font-weight:900;
                  font-size:6px;
                  padding:0 3px;
                  display:flex;
                  flex-direction:column;
                  align-items:center;
                  justify-content:center;
                  line-height:1;
                "><span style="color:#ffcc00;font-size:5px;">★</span>RO</span>
                <span style="
                  background:#ffffff;
                  color:#0f172a;
                  font-weight:900;
                  font-size:9.5px;
                  padding:0 5px;
                  display:flex;
                  align-items:center;
                ">${plateDisplay}</span>
              </span>
              <span style="color:${rightPillColor};font-weight:800;font-size:10px;">
                ${rightPillText}
              </span>
            </div>
          </div>
        `
          : `
          <div style="
            transform:translate(-13px, -13px);
            width:26px;
            height:26px;
            border-radius:9999px;
            background:${pinBg};
            border:2px solid #ffffff;
            box-shadow:0 2px 8px rgba(0,0,0,0.5);
            display:flex;
            align-items:center;
            justify-content:center;
            color:#ffffff;
            cursor:pointer;
          " title="${plateDisplay} · ${item.routeSummaryText} (${item.badgeLabel})">
            ${iconGlyph}
          </div>
        `,
        iconSize: [0, 0],
      });

      const marker = L.marker(truckCoords, {
        icon: truckIcon,
        zIndexOffset: isHighlighted ? 1000 : lifecycle === 'in_transit' ? 200 : 120,
      }).addTo(group);

      marker.on('click', () => {
        setSelectedTrackerId(item.mapId);
        const bounds = L.latLngBounds(roadPath);
        map.flyToBounds(bounds, { padding: [36, 36], duration: 0.8 });
      });
    });

    // 5. Smart Trailer Swap Hubs & Idle Fleet Pins ONLY in Active European overview (never in Trecute or Globe overview)
    if (effectiveScope === 'active' && !isSingle && !isGlobeOverview) {
      SWAP_HUBS.forEach((hub) => {
        const swapIcon = L.divIcon({
          className: 'custom-swap-marker',
          html: `
            <div style="
              transform:translate(-12px, -12px);
              width:24px;
              height:24px;
              border-radius:9999px;
              background:#0f172a;
              border:2px solid #f59e0b;
              box-shadow:0 2px 8px rgba(0,0,0,0.5);
              display:flex;
              align-items:center;
              justify-content:center;
              color:#f59e0b;
              font-size:11px;
              font-weight:800;
              cursor:pointer;
            " title="${hub.name} — ${hub.desc}">
              ⇄
            </div>
          `,
          iconSize: [0, 0],
        });

        const swapMarker = L.marker(hub.coords, { icon: swapIcon }).addTo(group);
        swapMarker.on('click', () => {
          if (onNavigateSwap) onNavigateSwap();
        });
      });

      if (focusedMapId === 'ALL') {
        const liveOverrideByPlate = new Map(
          (liveFleetPositions || []).map((p) => [p.plate, p])
        );
        MOCK_FLEET_POSITIONS.map((v) => liveOverrideByPlate.get(v.plate) || v).forEach((v) => {
          if (activePlatesOnMap.has(v.plate)) return;
          const fleetIcon = L.divIcon({
            className: 'custom-fleet-marker',
            html: `
              <div style="
                transform:translate(-50%, -50%);
                display:inline-flex;
                align-items:center;
                gap:4px;
                width:max-content;
                background:rgba(15,23,42,0.92);
                border:1.5px solid #64748b;
                border-radius:9999px;
                padding:2px 8px 2px 4px;
                color:#ffffff;
                font-size:10px;
                font-weight:800;
                white-space:nowrap;
                box-shadow:0 2px 8px rgba(0,0,0,0.45);
                cursor:pointer;
              " title="${v.plate} — ${v.place}">
                <span style="width:9px;height:9px;border-radius:9999px;background:#94a3b8;display:inline-block;"></span>
                <span style="color:#ffffff;">${v.plate}</span>
              </div>
            `,
            iconSize: [0, 0],
          });
          L.marker(v.coords, { icon: fleetIcon, zIndexOffset: 50 }).addTo(group);
        });
      }
    }
  }, [
    currentScopeItems,
    effectiveScope,
    isSingle,
    focusedMapId,
    selectedTrackerId,
    roadGeometries,
    onNavigateSwap,
    isFullScreen,
    isGlobeOverview,
    liveFleetPositions,
  ]);

  const handleToggleGlobeView = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (map.getZoom() <= 3) {
      const allPts = currentScopeItems.flatMap(
        (it) => roadGeometries[it.mapId] || it.routeDef.coordinates
      );
      if (allPts.length >= 2) {
        map.flyToBounds(L.latLngBounds(allPts), {
          padding: [28, 28],
          duration: 0.75,
        });
      } else {
        map.flyTo([50.2, 12.8], 5, { duration: 0.75 });
      }
      return;
    }

    if (!showDayNight) {
      setShowDayNight(true);
    }
    const isNarrowMobile = (mapContainerRef.current?.clientWidth || 960) < 640;
    map.flyTo(isNarrowMobile ? [26, -18] : [24, 5], 2, { duration: 0.75 });
  };

  const handleFocusCorridor = (mapId: string) => {
    setFocusedMapId(mapId);
    const map = mapInstanceRef.current;
    if (!map) return;

    if (mapId === 'ALL') {
      const allPts = currentScopeItems.flatMap(
        (it) => roadGeometries[it.mapId] || it.routeDef.coordinates
      );
      if (allPts.length >= 2) {
        map.flyToBounds(L.latLngBounds(allPts), {
          padding: [24, 24],
          duration: 0.7,
        });
      }
    } else {
      setSelectedTrackerId(mapId);
      const found = currentScopeItems.find((it) => it.mapId === mapId);
      if (found) {
        const roadPath =
          roadGeometries[found.mapId] || found.routeDef.coordinates;
        if (roadPath.length >= 2) {
          map.flyToBounds(L.latLngBounds(roadPath), {
            padding: [36, 36],
            duration: 0.75,
          });
        }
      }
    }
  };

  const renderAppleWeatherIcon = (type: AppleWeatherType, isNight = false) => {
    switch (type) {
      case 'sun':
        if (isNight) {
          return (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden="true">
              <path
                d="M19.6 14.6A7.6 7.6 0 0 1 9.4 4.4a7.6 7.6 0 1 0 10.2 10.2Z"
                fill="#FDE68A"
                stroke="#FBBF24"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              <circle cx="17.5" cy="5.8" r="1.25" fill="#FEF3C7" />
              <circle cx="14.2" cy="8.5" r="0.85" fill="#E0E7FF" />
            </svg>
          );
        }
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden="true">
            <circle cx="12" cy="12" r="5.5" fill="#F59E0B" />
            <circle cx="12" cy="12" r="4.2" fill="#FBBF24" />
            <g stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round">
              <line x1="12" y1="2.5" x2="12" y2="4.5" />
              <line x1="12" y1="19.5" x2="12" y2="21.5" />
              <line x1="2.5" y1="12" x2="4.5" y2="12" />
              <line x1="19.5" y1="12" x2="21.5" y2="12" />
              <line x1="5.3" y1="5.3" x2="6.7" y2="6.7" />
              <line x1="17.3" y1="17.3" x2="18.7" y2="18.7" />
              <line x1="18.7" y1="5.3" x2="17.3" y2="6.7" />
              <line x1="6.7" y1="17.3" x2="5.3" y2="18.7" />
            </g>
          </svg>
        );
      case 'partly-cloudy':
        if (isNight) {
          return (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden="true">
              <path
                d="M13.8 9.6A4.6 4.6 0 0 1 7.6 3.4a4.6 4.6 0 1 0 6.2 6.2Z"
                fill="#FDE68A"
                stroke="#FBBF24"
                strokeWidth="1.1"
              />
              <path
                d="M9.5 18.5H17.5C19.7 18.5 21.5 16.8 21.5 14.6C21.5 12.6 20 11 18.1 10.8C17.4 8.3 15.1 6.5 12.4 6.5C9.3 6.5 6.8 8.8 6.5 11.8C4.8 12.2 3.5 13.7 3.5 15.5C3.5 17.2 4.9 18.5 6.6 18.5H9.5Z"
                fill="#60A5FA"
                fillOpacity="0.92"
                stroke="#3B82F6"
                strokeWidth="1"
              />
            </svg>
          );
        }
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden="true">
            <circle cx="9" cy="9" r="4" fill="#F59E0B" />
            <g stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round">
              <line x1="9" y1="2.5" x2="9" y2="3.8" />
              <line x1="2.5" y1="9" x2="3.8" y2="9" />
              <line x1="4.4" y1="4.4" x2="5.4" y2="5.4" />
              <line x1="13.6" y1="4.4" x2="12.6" y2="5.4" />
            </g>
            <path
              d="M9.5 18.5H17.5C19.7 18.5 21.5 16.8 21.5 14.6C21.5 12.6 20 11 18.1 10.8C17.4 8.3 15.1 6.5 12.4 6.5C9.3 6.5 6.8 8.8 6.5 11.8C4.8 12.2 3.5 13.7 3.5 15.5C3.5 17.2 4.9 18.5 6.6 18.5H9.5Z"
              fill="#60A5FA"
              fillOpacity="0.92"
              stroke="#3B82F6"
              strokeWidth="1"
            />
          </svg>
        );
      case 'rain':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden="true">
            <path
              d="M8.5 15.5H17.2C19.3 15.5 21 13.9 21 11.8C21 9.9 19.6 8.3 17.8 8.1C17.1 5.7 14.9 4 12.3 4C9.3 4 6.9 6.2 6.6 9.1C5 9.5 3.8 10.9 3.8 12.6C3.8 14.2 5.1 15.5 6.8 15.5H8.5Z"
              fill="#3B82F6"
              fillOpacity="0.9"
            />
            <g stroke="#0284C7" strokeWidth="1.8" strokeLinecap="round">
              <line x1="8.5" y1="17.5" x2="7.5" y2="20.5" />
              <line x1="12.5" y1="17.5" x2="11.5" y2="20.5" />
              <line x1="16.5" y1="17.5" x2="15.5" y2="20.5" />
            </g>
          </svg>
        );
      case 'snow':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden="true">
            <path
              d="M8.5 15H17.2C19.3 15 21 13.4 21 11.3C21 9.4 19.6 7.8 17.8 7.6C17.1 5.2 14.9 3.5 12.3 3.5C9.3 3.5 6.9 5.7 6.6 8.6C5 9 3.8 10.4 3.8 12.1C3.8 13.7 5.1 15 6.8 15H8.5Z"
              fill="#38BDF8"
              fillOpacity="0.9"
            />
            <g fill="#0284C7">
              <circle cx="8.5" cy="18.2" r="1.3" />
              <circle cx="12.5" cy="19.5" r="1.3" />
              <circle cx="16.5" cy="18.2" r="1.3" />
            </g>
          </svg>
        );
      case 'wind':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden="true">
            <path
              d="M3 9.5H16.5C18.2 9.5 19.5 8.2 19.5 6.5C19.5 4.8 18.2 3.5 16.5 3.5C15 3.5 13.8 4.6 13.6 6"
              stroke="#0EA5E9"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
            <path
              d="M3 13.5H18.5C20.2 13.5 21.5 14.8 21.5 16.5C21.5 18.2 20.2 19.5 18.5 19.5C17 19.5 15.8 18.4 15.6 17"
              stroke="#0284C7"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
            <path
              d="M5 17H11.5"
              stroke="#38BDF8"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
          </svg>
        );
    }
  };

  const renderEuroRoPlate = (plate: string) => (
    <span
      className="inline-flex items-stretch rounded-[4px] overflow-hidden border border-slate-500/85 shadow-2xs shrink-0 whitespace-nowrap select-none h-[17px]"
      style={{ backgroundColor: '#ffffff' }}
    >
      <span
        className="flex flex-col items-center justify-center bg-[#003399] font-extrabold leading-none px-[3px] text-[5.5px]"
        style={{ backgroundColor: '#003399', color: '#ffffff' }}
      >
        <span
          className="euro-ro-plate-star"
          style={{ color: '#ffcc00', fontSize: '5px', lineHeight: 1 }}
        >
          ★
        </span>
        <span style={{ color: '#ffffff', lineHeight: 1, marginTop: '0.5px' }}>RO</span>
      </span>
      <span
        className="euro-ro-plate-num flex items-center font-black tracking-[0.02em] tabular-nums leading-none whitespace-nowrap px-1.5 text-[9.5px]"
        style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
      >
        {plate}
      </span>
    </span>
  );

  const hudWeatherStations = useMemo(() => {
    if (!showWeatherRadar || !liveWeatherSnap || liveWeatherSnap.stations.length === 0) {
      return [];
    }
    const primaryHubOrder = [
      'oradea',
      'cluj',
      'budapesta',
      'viena',
      'munchen',
      'koln',
      'rotterdam',
      'malmo',
      'stockholm',
    ];

    if (mapViewMeta.zoom >= 6 && mapViewMeta.inBoundsIds.length > 0) {
      const inBoundsSet = new Set(mapViewMeta.inBoundsIds);
      const distSq = (lat: number, lng: number) =>
        (lat - mapViewMeta.centerLat) ** 2 + (lng - mapViewMeta.centerLng) ** 2;

      const inside = liveWeatherSnap.stations
        .filter((st) => inBoundsSet.has(st.id))
        .sort((a, b) => distSq(a.lat, a.lng) - distSq(b.lat, b.lng));

      if (inside.length >= 6) {
        return inside.slice(0, 8);
      }
      const pickedIds = new Set(inside.map((s) => s.id));
      const nearestExtras = liveWeatherSnap.stations
        .filter((st) => !pickedIds.has(st.id))
        .sort((a, b) => distSq(a.lat, a.lng) - distSq(b.lat, b.lng))
        .slice(0, 6 - inside.length);
      return [...inside, ...nearestExtras];
    }

    return primaryHubOrder
      .map((id) => liveWeatherSnap.byId[id])
      .filter((st): st is NonNullable<typeof st> => Boolean(st));
  }, [showWeatherRadar, liveWeatherSnap, mapViewMeta]);

  const renderHudStationIcon = (st: NonNullable<typeof liveWeatherSnap>['stations'][number]) => {
    const stationIsNight = isNightAtCoords(st.lat, st.lng, liveSubsolar);
    const isBreezyDry =
      st.weatherType !== 'rain' &&
      st.weatherType !== 'snow' &&
      st.windSpeedKmh >= 20;
    if (isBreezyDry) return renderAppleWeatherIcon('wind', stationIsNight);
    if (st.weatherType === 'rain' || st.weatherType === 'snow' || st.weatherType === 'sun') {
      return renderAppleWeatherIcon(st.weatherType, stationIsNight);
    }
    const descNorm = st.weatherDescRo.toLowerCase();
    if (descNorm.includes('ceață') || descNorm.includes('ceata')) {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden="true">
          <path
            d="M8.5 14.5H17.2C19.3 14.5 21 12.9 21 10.8C21 8.9 19.6 7.3 17.8 7.1C17.1 4.7 14.9 3 12.3 3C9.3 3 6.9 5.2 6.6 8.1C5 8.5 3.8 9.9 3.8 11.6C3.8 13.2 5.1 14.5 6.8 14.5H8.5Z"
            fill="#94A3B8"
            fillOpacity="0.92"
          />
          <g stroke="#CBD5E1" strokeWidth="1.7" strokeLinecap="round">
            <line x1="5" y1="17.2" x2="19" y2="17.2" />
            <line x1="7" y1="20" x2="17" y2="20" />
          </g>
        </svg>
      );
    }
    if (descNorm === 'noros') {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden="true">
          <path
            d="M10.5 15.5H18.2C20 15.5 21.5 14.1 21.5 12.3C21.5 10.7 20.3 9.3 18.7 9.1C18.1 7 16.2 5.5 13.9 5.5C11.3 5.5 9.2 7.4 8.9 9.9"
            fill="#64748B"
            fillOpacity="0.85"
          />
          <path
            d="M7.5 18.2H16.5C18.7 18.2 20.5 16.5 20.5 14.3C20.5 12.3 19 10.7 17.1 10.5C16.4 8 14.1 6.2 11.4 6.2C8.3 6.2 5.8 8.5 5.5 11.5C3.8 11.9 2.5 13.4 2.5 15.2C2.5 16.9 3.9 18.2 5.6 18.2H7.5Z"
            fill="#93C5FD"
            fillOpacity="0.92"
          />
        </svg>
      );
    }
    return renderAppleWeatherIcon('partly-cloudy', stationIsNight);
  };

  const renderWeatherCitiesHud = () => {
    if ((cleanCompactHud && !isFullScreen) || !showWeatherRadar || hudWeatherStations.length === 0) return null;

    const focusStationOnMap = (lat: number, lng: number) => {
      const map = mapInstanceRef.current;
      if (!map) return;
      map.flyTo([lat, lng], Math.max(map.getZoom(), 7), { duration: 0.55 });
    };

    return (
      <>
        {/* Desktop / Tablet Semi-Transparent Frosted Glass Weather Container (Top-Right under Controls) */}
        <div
          data-testid="weather-cities-hud"
          onPointerDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          className="tms-weather-hud-glass hidden sm:flex flex-col absolute top-[50px] right-3 z-[440] w-[228px] max-h-[calc(100%-62px)] rounded-2xl p-2 select-none"
        >
          <button
            type="button"
            onClick={() => setWeatherHudCollapsed((v) => !v)}
            className="w-full px-1.5 py-1 rounded-xl flex items-center justify-between gap-2 text-left cursor-pointer hover:bg-white/10"
            title={weatherHudCollapsed ? 'Extinde lista orașelor meteo' : 'Restrânge lista orașelor meteo'}
          >
            <span className="inline-flex items-center gap-1.5 min-w-0">
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full bg-[#30D158] shadow-[0_0_6px_#30D158] shrink-0"
              />
              <span
                className="text-[10.5px] font-extrabold uppercase tracking-wider truncate"
                style={{ color: '#e0f2fe' }}
              >
                {mapViewMeta.zoom >= 6 ? 'Vreme în Zonă' : 'Vreme pe Coridor'}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 shrink-0" style={{ color: '#bae6fd' }}>
              <span className="text-[10px] font-bold tabular-nums">{hudWeatherStations.length}</span>
              {weatherHudCollapsed ? (
                <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </span>
          </button>

          {!weatherHudCollapsed && (
            <div className="mt-1 pt-1 border-t border-white/15 flex flex-col gap-0.5 overflow-y-auto no-scrollbar">
              {hudWeatherStations.map((st) => {
                const roundedTemp = Math.round(st.tempC);
                const tempLabel = roundedTemp > 0 ? `+${roundedTemp}°C` : `${roundedTemp}°C`;
                const isBreezyDry =
                  st.weatherType !== 'rain' &&
                  st.weatherType !== 'snow' &&
                  st.windSpeedKmh >= 20;
                const shortDesc = isBreezyDry
                  ? `Vânt ${Math.round(st.windSpeedKmh)} km/h`
                  : st.weatherDescRo.replace(/\s*\([^)]*\)/g, '');

                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => focusStationOnMap(st.lat, st.lng)}
                    className="tms-weather-hud-row w-full px-1.5 py-1 rounded-xl flex items-center justify-between gap-2 text-left cursor-pointer"
                    title={`${st.city}: ${tempLabel} · ${st.weatherDescRo} (click pt. centrare pe hartă)`}
                  >
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 flex items-center justify-center shrink-0">
                        {renderHudStationIcon(st)}
                      </span>
                      <span className="min-w-0 flex flex-col leading-tight">
                        <span
                          className="text-[11.5px] font-bold truncate"
                          style={{ color: '#ffffff' }}
                        >
                          {st.city}
                        </span>
                        <span
                          className="text-[9.5px] font-medium truncate"
                          style={{ color: 'rgba(186, 230, 253, 0.88)' }}
                        >
                          {shortDesc}
                        </span>
                      </span>
                    </span>
                    <span
                      className="text-xs font-extrabold tabular-nums shrink-0"
                      style={{ color: '#ffffff' }}
                    >
                      {tempLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Mobile (< 640px) Compact Semi-Transparent Frosted Glass Strip at Bottom of Map */}
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="tms-weather-hud-glass sm:hidden absolute bottom-5 left-2.5 right-2.5 z-[440] rounded-2xl px-2 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar select-none"
        >
          {hudWeatherStations.map((st) => {
            const roundedTemp = Math.round(st.tempC);
            const tempLabel = roundedTemp > 0 ? `+${roundedTemp}°C` : `${roundedTemp}°C`;
            const isBreezyDry =
              st.weatherType !== 'rain' &&
              st.weatherType !== 'snow' &&
              st.windSpeedKmh >= 20;
            const shortDesc = isBreezyDry
              ? `Vânt`
              : st.weatherDescRo.replace(/\s*\([^)]*\)/g, '');

            return (
              <button
                key={st.id}
                type="button"
                onClick={() => focusStationOnMap(st.lat, st.lng)}
                className="px-2 py-1 rounded-xl bg-white/10 border border-white/15 inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <span className="scale-90 shrink-0">{renderHudStationIcon(st)}</span>
                <span className="flex flex-col items-start leading-none">
                  <span className="text-[10.5px] font-bold whitespace-nowrap" style={{ color: '#ffffff' }}>
                    {st.city}
                  </span>
                  <span className="text-[8.5px] font-medium whitespace-nowrap mt-0.5" style={{ color: 'rgba(186, 230, 253, 0.88)' }}>
                    {shortDesc}
                  </span>
                </span>
                <span className="text-[11px] font-extrabold tabular-nums whitespace-nowrap ml-0.5" style={{ color: '#7dd3fc' }}>
                  {tempLabel}
                </span>
              </button>
            );
          })}
        </div>
      </>
    );
  };

  const renderMapControlsBar = () => (
    <div className="absolute top-2.5 left-2 right-2 sm:left-auto sm:top-3 sm:right-3 z-[450] flex items-center justify-between sm:justify-end gap-1 sm:gap-1.5">
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleToggleGlobeView}
          aria-pressed={isGlobeOverview}
          aria-label={isGlobeOverview ? 'Revino la coridorul din Europa' : 'Vezi unde este zi și noapte pe tot globul'}
          className="h-8 px-2.5 sm:h-auto sm:px-3 sm:py-1.5 rounded-full backdrop-blur-md border text-[11px] sm:text-xs font-extrabold flex items-center justify-center gap-1 sm:gap-1.5 shadow-lg cursor-pointer transition shrink-0 whitespace-nowrap"
          style={{
            backgroundColor: isGlobeOverview
              ? 'rgba(10, 132, 255, 0.94)'
              : 'rgba(15, 23, 42, 0.92)',
            borderColor: isGlobeOverview
              ? 'rgba(125, 211, 252, 0.7)'
              : 'rgba(255, 255, 255, 0.25)',
            color: '#ffffff',
          }}
          title={
            isGlobeOverview
              ? 'Revino la vederea pe Coridorul European'
              : 'Vedere pe Glob (Zi / Noapte în timp real pe Pământ)'
          }
        >
          <Globe
            className="w-3.5 h-3.5 shrink-0"
            style={{ color: isGlobeOverview ? '#ffffff' : '#38bdf8' }}
            aria-hidden="true"
          />
          <span style={{ color: '#ffffff' }}>
            {isGlobeOverview ? 'Coridor' : 'Glob'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setShowDayNight((prev) => !prev)}
          aria-pressed={showDayNight}
          aria-label="Comută umbra Zi / Noapte pe glob"
          className="h-8 px-2 sm:h-auto sm:px-2.5 sm:py-1.5 rounded-full backdrop-blur-md border flex items-center justify-center gap-1 sm:gap-1.5 shadow-lg cursor-pointer transition shrink-0"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            borderColor: showDayNight
              ? 'rgba(251, 191, 36, 0.55)'
              : 'rgba(255, 255, 255, 0.25)',
            color: '#ffffff',
          }}
          title="Comută Umbra Zi / Noapte (Terminator Solar Live pe Glob)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden="true">
            <circle cx="12" cy="12" r="8.5" stroke="#94A3B8" strokeWidth="1.5" fill="rgba(15,23,42,0.8)" />
            <path d="M12 3.5A8.5 8.5 0 0 0 12 20.5Z" fill="#FBBF24" />
            <path d="M15.6 14.3A3.8 3.8 0 0 1 12.8 9.2a3.6 3.6 0 1 0 2.8 5.1Z" fill="#E0E7FF" />
          </svg>
          <span
            aria-hidden="true"
            className="w-2 h-2 rounded-full transition-colors shrink-0"
            style={{
              backgroundColor: showDayNight ? '#30D158' : 'rgba(100, 116, 139, 0.75)',
              boxShadow: showDayNight ? '0 0 6px #30D158' : 'none',
            }}
          />
        </button>

        <button
          type="button"
          onClick={() => setShowWeatherRadar((prev) => !prev)}
          aria-pressed={showWeatherRadar}
          aria-label="Comută radar meteo pe hartă"
          className="h-8 px-2 sm:h-auto sm:px-3 sm:py-1.5 rounded-full backdrop-blur-md border border-white/25 flex items-center gap-1 sm:gap-2 shadow-lg cursor-pointer transition shrink-0"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            color: '#ffffff',
          }}
          title="Comută Radar Vreme (Ploaie, Ninsoare & Vânt) pe Hartă"
        >
          <span className="inline-flex items-center gap-1">
            {renderAppleWeatherIcon('rain')}
            <span className="hidden sm:inline-flex">{renderAppleWeatherIcon('wind')}</span>
          </span>
          <span
            className="relative inline-flex items-center w-7 sm:w-8 h-4 rounded-full transition-colors duration-200 p-0.5"
            style={{
              backgroundColor: showWeatherRadar ? '#30D158' : 'rgba(100, 116, 139, 0.75)',
            }}
          >
            <span
              className="w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200"
              style={{
                transform: showWeatherRadar ? 'translateX(13px)' : 'translateX(0px)',
              }}
            />
          </span>
        </button>
      </div>

      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleZoomIn}
          aria-label="Mărește harta"
          className={`${
            cleanCompactHud && !isFullScreen ? 'hidden sm:flex' : 'flex'
          } w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-full backdrop-blur-md border border-white/25 text-xs font-extrabold items-center justify-center gap-1 shadow-lg cursor-pointer shrink-0 whitespace-nowrap`}
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            color: '#ffffff',
          }}
        >
          <ZoomIn className="w-3.5 h-3.5" style={{ color: '#4ade80' }} aria-hidden="true" />
          <span className="hidden sm:inline" style={{ color: '#ffffff' }}>+</span>
        </button>

        <button
          type="button"
          onClick={handleZoomOut}
          aria-label="Micșorează harta"
          className={`${
            cleanCompactHud && !isFullScreen ? 'hidden sm:flex' : 'flex'
          } w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-full backdrop-blur-md border border-white/25 text-xs font-extrabold items-center justify-center gap-1 shadow-lg cursor-pointer shrink-0 whitespace-nowrap`}
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            color: '#ffffff',
          }}
        >
          <ZoomOut className="w-3.5 h-3.5" style={{ color: '#38bdf8' }} aria-hidden="true" />
          <span className="hidden sm:inline" style={{ color: '#ffffff' }}>−</span>
        </button>

        <button
          type="button"
          onClick={handleToggleFullScreen}
          aria-label={isFullScreen ? 'Închide harta pe tot ecranul' : 'Deschide harta pe tot ecranul'}
          className="w-8 h-8 sm:w-auto sm:h-auto sm:px-3.5 sm:py-1.5 rounded-full backdrop-blur-md border border-white/25 text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-lg cursor-pointer shrink-0 whitespace-nowrap"
          style={{
            backgroundColor: isFullScreen
              ? 'rgba(239, 68, 68, 0.95)'
              : 'rgba(15, 23, 42, 0.92)',
            color: '#ffffff',
          }}
        >
          {isFullScreen ? (
            <>
              <Minimize2 className="w-3.5 h-3.5 shrink-0" style={{ color: '#ffffff' }} aria-hidden="true" />
              <span className="hidden sm:inline" style={{ color: '#ffffff' }}>Închide</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5 shrink-0" style={{ color: '#38bdf8' }} aria-hidden="true" />
              <span className="hidden sm:inline" style={{ color: '#ffffff' }}>Full Screen</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  const activeRouteDef = activeItem?.routeDef || CORRIDOR_ROUTES['BH 67 STS'];
  const activeTrailerObj = activeItem?.trailer || trailers[0];
  const activeLifecycle = activeItem?.lifecycle || 'in_transit';

  // Full Screen Portal
  if (isFullScreen && typeof document !== 'undefined') {
    return (
      <>
        <div className={`${heightClass} w-full rounded-[22px] bg-slate-900/40 border border-white/10`} />
        {createPortal(
          <div className="fixed inset-0 z-[99999] w-screen h-screen h-[100dvh] bg-[#070b14] flex flex-col overflow-hidden">
            <div
              className="px-4 py-2.5 border-b border-white/15 flex flex-nowrap items-center justify-between gap-3 shrink-0"
              style={{
                backgroundColor: '#0f172a',
                color: '#ffffff',
                paddingTop: 'max(0.625rem, env(safe-area-inset-top, 0px))',
              }}
            >
              <div className="min-w-0 flex-1 flex flex-nowrap items-center justify-between gap-3 overflow-x-auto no-scrollbar">
                <div className="flex flex-nowrap items-center gap-2.5 shrink-0">
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#4ade80] whitespace-nowrap">
                    <Radio className="w-3.5 h-3.5 animate-pulse shrink-0" aria-hidden="true" />
                    {activeRouteDef.tripCode}
                  </span>
                  <span className="text-xs font-bold text-white truncate max-w-[320px] sm:max-w-none">
                    Coridor: {activeRouteDef.highwayCorridor}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/30 text-[11px] font-extrabold text-sky-300 tabular-nums whitespace-nowrap shrink-0">
                    {activeRouteDef.totalTechKm.toLocaleString('ro-RO')} km tehnici
                  </span>
                </div>

                {!isSingle && currentScopeItems.length > 1 && (
                  <div className="flex flex-nowrap items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleFocusCorridor('ALL')}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer whitespace-nowrap ${
                        focusedMapId === 'ALL'
                          ? 'bg-[#0A84FF] text-white'
                          : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      Toate ({currentScopeItems.length})
                    </button>
                    {currentScopeItems.map((it) => (
                      <button
                        key={it.mapId}
                        type="button"
                        onClick={() => handleFocusCorridor(it.mapId)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer whitespace-nowrap ${
                          focusedMapId === it.mapId
                            ? 'bg-[#0A84FF] text-white'
                            : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        {it.trailer.id}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsFullScreen(false)}
                aria-label="Închide harta pe tot ecranul"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center justify-center cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div
              ref={mapHostWrapperRef}
              className="relative flex-1 w-full h-full overflow-hidden"
            >
              <div ref={mapContainerRef} className="w-full h-full z-0" />
              {renderMapControlsBar()}
              {renderWeatherCitiesHud()}
            </div>
          </div>,
          document.body
        )}
      </>
    );
  }

  return (
    <div
      className={
        embeddedInCard
          ? 'w-full'
          : singleTripMode
            ? 'space-y-3'
            : 'tahoe-glass rounded-[28px] p-4 sm:p-5 space-y-4'
      }
    >
      <div className="flex flex-col gap-3.5">
        {/* ROW 1: Full-Width Interactive Leaflet Map Container */}
        <div
          ref={mapHostWrapperRef}
          className={`w-full shrink-0 min-w-0 relative overflow-hidden ${
            embeddedInCard
              ? `${heightClass}`
              : `rounded-[22px] border border-white/15 shadow-2xl ${
                  singleTripMode
                    ? 'h-[300px] sm:h-[340px]'
                    : 'h-[370px] sm:h-[470px] lg:h-[500px]'
                }`
          }`}
          style={{
            minHeight: embeddedInCard ? '210px' : singleTripMode ? '300px' : '370px',
            contain: 'layout style paint',
          }}
        >
          <div
            ref={mapContainerRef}
            className="w-full h-full z-0"
            style={{
              height: '100%',
              minHeight: embeddedInCard ? '210px' : singleTripMode ? '300px' : '370px',
            }}
          />

          {renderMapControlsBar()}
          {renderWeatherCitiesHud()}

          {/* Compact Bottom-Left Highway Corridor + Live Day/Night Pill */}
          {!cleanCompactHud && (
          <div
            className={`${
              showWeatherRadar ? 'hidden sm:inline-flex' : 'inline-flex'
            } absolute bottom-3 left-3 z-[400] px-3 py-1.5 rounded-full backdrop-blur-md border border-white/20 items-center gap-2 text-[11px] font-semibold shadow-lg pointer-events-none select-none`}
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              color: '#ffffff',
            }}
          >
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] shrink-0" />
              <span style={{ color: '#ffffff' }}>Traseu Rutier Camioane</span>
            </span>
            {showDayNight && (
              <>
                <span aria-hidden="true" style={{ color: 'rgba(148, 163, 184, 0.65)' }}>·</span>
                <span className="inline-flex items-center gap-1" style={{ color: '#fde68a' }}>
                  <span aria-hidden="true" className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_5px_#fbbf24] shrink-0" />
                  <span style={{ color: '#fde68a' }}>Zi / Noapte Live</span>
                </span>
              </>
            )}
          </div>
          )}
        </div>

        {/* ROW 2: Two Side-by-Side Cards Below the Map (Trips Selector + Route Checkpoints) */}
        {!hideRouteDetailsBelow && (
        <div
          className={
            singleTripMode
              ? 'w-full'
              : 'grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch'
          }
        >
        {/* Trips Selector with Explicit Active / Trecute Separation */}
        {!singleTripMode && (
          <div className="w-full lg:col-span-5 max-h-[360px] lg:max-h-none lg:h-[430px] shrink-0 tahoe-card-inner rounded-[22px] p-3.5 flex flex-col gap-2">
            {/* Segmented Filter: Active vs Trecute */}
            <div
              role="group"
              aria-label="Filtru stare curse pe hartă"
              className="grid grid-cols-2 gap-1 p-1 rounded-full bg-black/20 border border-white/10 shrink-0"
            >
              <button
                type="button"
                aria-pressed={effectiveScope === 'active'}
                onClick={() => setScope('active')}
                className={`px-2.5 py-1.5 rounded-full text-[11px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer border ${
                  effectiveScope === 'active'
                    ? 'bg-[#0A84FF] text-white border-[#64D2FF]/50 shadow-xs'
                    : 'border-transparent text-white/70 hover:text-white'
                }`}
              >
                <Radio className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span>Active ({resolvedActiveTrips.length})</span>
              </button>

              <button
                type="button"
                aria-pressed={effectiveScope === 'past'}
                onClick={() => setScope('past')}
                className={`px-2.5 py-1.5 rounded-full text-[11px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer border ${
                  effectiveScope === 'past'
                    ? 'bg-emerald-600 text-white border-emerald-300/50 shadow-xs'
                    : 'border-transparent text-white/70 hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span>Trecute ({resolvedPastTrips.length})</span>
              </button>
            </div>

            {currentScopeItems.length > 0 && (
              <button
                type="button"
                onClick={() => handleFocusCorridor('ALL')}
                className={`w-full px-3.5 py-1.5 rounded-full text-xs font-extrabold flex items-center justify-between cursor-pointer shrink-0 border ${
                  focusedMapId === 'ALL'
                    ? 'bg-[#0A84FF] text-white border-transparent shadow-md'
                    : 'bg-white/[0.06] text-white/75 hover:text-white border-white/10'
                }`}
              >
                <span>
                  {effectiveScope === 'past'
                    ? `Toate Trecute (${currentScopeItems.length})`
                    : `Toate Active (${currentScopeItems.length})`}
                </span>
                <span className="text-[10px] font-bold opacity-85">
                  {effectiveScope === 'past' ? 'Istoric' : 'Pe hartă'}
                </span>
              </button>
            )}

            <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto pr-0.5 min-h-0">
              {currentScopeItems.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center px-3 py-6 text-xs text-white/60">
                  Nu există curse în această categorie.
                </div>
              ) : (
                currentScopeItems.map((item) => {
                  const t = item.trailer;
                  const isSelected =
                    focusedMapId === item.mapId ||
                    (focusedMapId === 'ALL' && selectedTrackerId === item.mapId);
                  const trPlate = t.tractorId.split(' (')[0];
                  const isTwoPlates = Boolean(trPlate && trPlate !== t.id);
                  const isFocused = focusedMapId === item.mapId;
                  const showSubRoute =
                    item.lifecycle !== 'in_transit' || Boolean(item.sourceCardId);

                  return (
                    <button
                      key={item.mapId}
                      type="button"
                      onClick={() => handleFocusCorridor(item.mapId)}
                      className={`w-full px-3 py-1.5 rounded-2xl text-xs font-semibold flex flex-col gap-1 text-left cursor-pointer shrink-0 border ${
                        isFocused
                          ? 'bg-[#0A84FF] text-white border-transparent shadow-md'
                          : isSelected
                            ? 'bg-white/[0.14] text-white border-white/25'
                            : 'bg-white/[0.05] text-white/75 hover:text-white border-white/10'
                      }`}
                    >
                      <div className="w-full flex items-center justify-between gap-1.5">
                        <span className="inline-flex items-center gap-1 min-w-0">
                          {isTwoPlates && (
                            <>
                              {renderEuroRoPlate(trPlate)}
                              <span className="font-black text-[10px]">+</span>
                            </>
                          )}
                          {renderEuroRoPlate(t.id)}
                        </span>

                        {item.lifecycle === 'past' ? (
                          <span
                            className={`text-[10px] font-extrabold tabular-nums px-2 py-0.5 rounded-full shrink-0 inline-flex items-center gap-1 ${
                              isFocused
                                ? 'bg-white/20 text-white'
                                : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            <CheckCircle2 className="w-2.5 h-2.5" aria-hidden="true" />
                            <span>{item.shortTimeBadge}</span>
                          </span>
                        ) : item.lifecycle === 'planned' ? (
                          <span
                            className={`text-[10px] font-extrabold tabular-nums px-2 py-0.5 rounded-full shrink-0 inline-flex items-center gap-1 ${
                              isFocused
                                ? 'bg-white/20 text-white'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            <Clock className="w-2.5 h-2.5" aria-hidden="true" />
                            <span>{item.shortTimeBadge}</span>
                          </span>
                        ) : (
                          <span
                            className={`text-[10px] font-extrabold tabular-nums px-2 py-0.5 rounded-full shrink-0 ${
                              isFocused
                                ? 'bg-white/20 text-white'
                                : 'bg-[#30D158]/15 text-[#30D158]'
                            }`}
                          >
                            {t.freeLdm.toFixed(1)} LDM
                          </span>
                        )}
                      </div>

                      {showSubRoute && (
                        <div
                          className={`text-[10px] font-semibold truncate w-full ${
                            isFocused ? 'text-white/90' : 'text-white/60'
                          }`}
                        >
                          {item.clientLabel ? `${item.clientLabel} · ` : ''}
                          {item.routeSummaryText}
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Checkpoint Tracker Card + Technical KM */}
        <div
          className={`w-full ${
            singleTripMode ? '' : 'lg:col-span-7 lg:h-[430px]'
          } shrink-0 tahoe-card-inner rounded-[22px] px-4 py-4 flex flex-col justify-between space-y-3 overflow-y-auto`}
        >
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-2 border-b border-white/[0.08] pb-2.5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-base font-bold text-white tabular-nums mr-1">
                    {activeRouteDef.tripCode}
                  </span>
                  {(() => {
                    const trPlate = activeTrailerObj.tractorId.split(' (')[0];
                    const isTwo = Boolean(trPlate && trPlate !== activeTrailerObj.id);
                    return (
                      <span className="inline-flex items-center gap-1">
                        {isTwo && (
                          <>
                            {renderEuroRoPlate(trPlate)}
                            <span className="font-black text-white/75 text-xs">+</span>
                          </>
                        )}
                        {renderEuroRoPlate(activeTrailerObj.id)}
                      </span>
                    );
                  })()}
                </div>
                <div className="text-[11px] text-white/65 mt-1 font-medium truncate">
                  Șofer: <strong className="text-white">{activeTrailerObj.driver1.name}</strong>
                  {activeItem?.clientLabel ? ` · ${activeItem.clientLabel}` : ''}
                </div>
                <div className="text-[10px] tabular-nums text-[#30D158] mt-0.5 font-semibold truncate">
                  {activeRouteDef.highwayCorridor}
                </div>
              </div>

              {activeLifecycle === 'past' ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/35 shrink-0 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                  <span>Trecută</span>
                </span>
              ) : activeLifecycle === 'planned' ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/35 shrink-0 inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" aria-hidden="true" />
                  <span>Planificată</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/30 shrink-0">
                  În tranzit
                </span>
              )}
            </div>

            {/* Technical Distance & Transit Period Summary Box */}
            {(() => {
              const mapProfile = resolveHgvVehicleProfile(activeTrailerObj?.totalLdm ?? 13.6);
              const remainingMapKm = Math.max(
                0,
                activeRouteDef.totalTechKm - activeRouteDef.drivenKm
              );
              const mapHgvMetrics = computeHgvRouteMetrics(remainingMapKm, {
                isHgv: mapProfile.isHgv,
                isDoubleCrew: Boolean(activeTrailerObj?.isDoubleCrew),
              });
              return (
            <div className="rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2 space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[11px] tabular-nums">
                <span className="font-bold text-white">
                  Total:{' '}
                  <span className="text-[#0A84FF] font-extrabold">
                    {activeRouteDef.totalTechKm.toLocaleString('ro-RO')} km
                  </span>
                </span>
                <span className="text-white/75 font-semibold">
                  {activeLifecycle === 'past' ? (
                    <strong className="text-emerald-400">Livrat 100% ✓</strong>
                  ) : (
                    <>
                      Rămas:{' '}
                      <strong className="text-white">
                        {remainingMapKm.toLocaleString('ro-RO')} km
                      </strong>{' '}
                      ({mapHgvMetrics.compactDriveLabel})
                    </>
                  )}
                </span>
              </div>
              <div className="text-[10px] text-white/60 tabular-nums flex items-center justify-between gap-2 min-w-0">
                <span className="truncate min-w-0">
                  {mapProfile.shortBadge} · <strong>{activeRouteDef.transitWindow}</strong>
                </span>
                <span className="text-[#30D158] font-bold shrink-0">
                  Parcurs: {activeRouteDef.drivenKm.toLocaleString('ro-RO')} km
                </span>
              </div>
            </div>
              );
            })()}

            {/* Route Checkpoints */}
            <div
              className={
                singleTripMode
                  ? 'grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5'
                  : 'space-y-2 relative pl-0.5'
              }
            >
              {activeRouteDef.checkpoints.map((cp, idx) => {
                const liveStation = resolveLiveCheckpointWeather(
                  liveWeatherSnap,
                  cp.city,
                  cp.coords
                );

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between gap-2.5 text-xs ${
                      singleTripMode
                        ? 'p-2 rounded-xl bg-white/[0.03] border border-white/10'
                        : 'py-0.5'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {cp.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-[#30D158] shrink-0" aria-hidden="true" />
                      ) : cp.current ? (
                        <CircleDot className="w-4 h-4 text-[#0A84FF] animate-pulse shrink-0" aria-hidden="true" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-white/25 shrink-0" aria-hidden="true" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div
                          className={`font-semibold text-[11.5px] truncate ${
                            cp.completed || cp.current ? 'text-white' : 'text-white/70'
                          }`}
                        >
                          {cp.city} ({formatCountryBadge(cp.country)})
                        </div>
                        <div className="text-[10px] text-white/60 tabular-nums truncate">
                          {cp.eta.split(' (')[0]} ·{' '}
                          <strong className="text-[#0A84FF]">
                            {singleTripMode
                              ? cp.techKm.replace(/\(\+(\d+)\s*km\)/, '(etapă $1 km)')
                              : cp.techKm}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {liveStation && (
                        <div
                          className="inline-flex items-center gap-1 shrink-0"
                          title={`${cp.city} (LIVE ${liveStation.observedAt || 'acum'}): ${Math.round(liveStation.tempC) > 0 ? `+${Math.round(liveStation.tempC)}` : Math.round(liveStation.tempC)}°C · ${liveStation.weatherDescRo} · Vânt ${Math.round(liveStation.windSpeedKmh)} km/h`}
                          aria-label={`Vreme live ${cp.city}: ${Math.round(liveStation.tempC) > 0 ? `+${Math.round(liveStation.tempC)}` : Math.round(liveStation.tempC)}°C, ${liveStation.weatherDescRo}`}
                        >
                          {renderAppleWeatherIcon(
                            liveStation.weatherType,
                            isNightAtCoords(liveStation.lat, liveStation.lng, liveSubsolar)
                          )}
                          <span className="text-[10.5px] font-extrabold text-white tabular-nums">
                            {Math.round(liveStation.tempC) > 0
                              ? `+${Math.round(liveStation.tempC)}`
                              : Math.round(liveStation.tempC)}
                            °
                          </span>
                        </div>
                      )}

                      <span
                        className={`px-1.5 py-0.5 rounded-md tabular-nums text-[10px] font-bold shrink-0 ${
                          cp.freeLdmAfter >= 4
                            ? 'bg-[#30D158]/15 text-[#30D158]'
                            : 'bg-white/[0.06] text-white/65'
                        }`}
                      >
                        {cp.freeLdmAfter.toFixed(1)} LDM
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Telemetry Footer */}
          <div className="pt-3 border-t border-white/[0.08] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/55 flex items-center gap-1">
                <Navigation className="w-3.5 h-3.5 text-[#0A84FF]" aria-hidden="true" />
                {activeLifecycle === 'past'
                  ? 'Cursă finalizată'
                  : activeLifecycle === 'planned'
                    ? `Plecare ${activeItem?.shortTimeBadge || ''}`
                    : `${activeTrailerObj.currentLocation.speedKmh} km/h`}
              </span>
              <span className="text-[#64D2FF] tabular-nums text-xs flex items-center gap-1">
                <ThermometerSnowflake className="w-3.5 h-3.5" aria-hidden="true" />
                {activeTrailerObj.zone1Temp}°C / +{activeTrailerObj.zone2Temp}°C
              </span>
            </div>

            {(onSelectTrailer || onNavigateSwap) && (
              <div className="grid grid-cols-2 gap-2">
                {onSelectTrailer && (
                  <button
                    type="button"
                    onClick={() => onSelectTrailer(activeTrailerObj.id)}
                    className="py-2 px-3 rounded-full tahoe-btn-primary text-[11px] font-semibold cursor-pointer"
                  >
                    Vezi în Planificare →
                  </button>
                )}
                {onNavigateSwap && (
                  <button
                    type="button"
                    onClick={onNavigateSwap}
                    className="py-2 px-3 rounded-full tahoe-btn-secondary text-[11px] font-semibold text-[#FF9F0A] flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Repeat className="w-3 h-3" aria-hidden="true" />
                    <span>3 Puncte Swap</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        </div>
        )}
      </div>
    </div>
  );
};
