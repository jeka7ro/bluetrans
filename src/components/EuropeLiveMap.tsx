import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import {
  CheckCircle2,
  CircleDot,
  Clock,
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
  startAccuWeatherCanvasAnimation,
} from '../utils/accuWeatherCanvas';

export { CORRIDOR_ROUTES };
export type { RouteDefinition };

interface EuropeLiveMapProps {
  trailers: TrailerUnit[];
  activeTrips?: MapTripItem[];
  pastTrips?: MapTripItem[];
  singleTripItem?: MapTripItem;
  tripScopeFilter?: 'active' | 'past';
  onTripScopeFilterChange?: (scope: 'active' | 'past') => void;
  onSelectTrailer?: (trailerId: string) => void;
  onNavigateSwap?: () => void;
  heightClass?: string;
  singleTripMode?: boolean;
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
  activeTrips,
  pastTrips = [],
  singleTripItem,
  tripScopeFilter,
  onTripScopeFilterChange,
  onSelectTrailer,
  onNavigateSwap,
  heightClass = 'h-[360px] sm:h-[420px]',
  singleTripMode = false,
}) => {
  const mapHostWrapperRef = useRef<HTMLDivElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const weatherCanvasRef = useRef<HTMLCanvasElement | null>(null);
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

  useEffect(() => {
    try {
      localStorage.setItem('bluetrans_map_weather_on_v1', showWeatherRadar ? '1' : '0');
    } catch {
      // ignore
    }
  }, [showWeatherRadar]);

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
          map.fitBounds(L.latLngBounds(roadPath), { padding: [28, 28] });
        }
        setTimeout(() => map.invalidateSize(), 100);
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
        map.flyToBounds(L.latLngBounds(allPoints), {
          padding: [28, 28],
          duration: 0.55,
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
      minZoom: 4,
      maxZoom: 15,
      zoomControl: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
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

    const targetItem = isSingle
      ? currentScopeItems[0]
      : focusedMapId !== 'ALL'
        ? currentScopeItems.find((it) => it.mapId === focusedMapId)
        : undefined;

    if (targetItem) {
      const roadPath =
        roadGeometries[targetItem.mapId] || targetItem.routeDef.coordinates;
      if (roadPath.length >= 2) {
        map.fitBounds(L.latLngBounds(roadPath), {
          padding: isFullScreen ? [56, 56] : [28, 28],
        });
      }
    } else if (currentScopeItems.length > 0) {
      const allPts = currentScopeItems.flatMap(
        (it) => roadGeometries[it.mapId] || it.routeDef.coordinates
      );
      if (allPts.length >= 2) {
        map.fitBounds(L.latLngBounds(allPts), {
          padding: isFullScreen ? [48, 48] : [24, 24],
        });
      }
    } else {
      const mainBounds = L.latLngBounds([
        [46.8, 4.2],
        [56.2, 22.2],
      ]);
      map.fitBounds(mainBounds, { padding: isFullScreen ? [48, 48] : [24, 24] });
    }

    const initTimer = setTimeout(() => {
      if (!mapInstanceRef.current || !mapContainerRef.current?.isConnected) return;
      map.invalidateSize();
      if (targetItem) {
        const roadPath =
          roadGeometries[targetItem.mapId] || targetItem.routeDef.coordinates;
        if (roadPath.length >= 2) {
          map.fitBounds(L.latLngBounds(roadPath), {
            padding: isFullScreen ? [56, 56] : [28, 28],
          });
        }
      }
    }, 120);

    const resizeObs = new ResizeObserver(() => {
      if (!mapInstanceRef.current || !mapContainerRef.current?.isConnected) return;
      map.invalidateSize();
    });
    if (mapContainerRef.current) {
      resizeObs.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(initTimer);
      resizeObs.disconnect();
      map.stop();
      map.remove();
      mapInstanceRef.current = null;
      layerGroupRef.current = null;
      weatherLayerGroupRef.current = null;
    };
  }, [isFullScreen]);

  // Live AccuWeather Doppler Radar Tiles + 60fps Animated Wind Streamlines & Rain/Snow Canvas
  useEffect(() => {
    const map = mapInstanceRef.current;
    const weatherGroup = weatherLayerGroupRef.current;
    const canvas = weatherCanvasRef.current;
    const hostEl = mapHostWrapperRef.current || mapContainerRef.current;
    if (!map || !weatherGroup) return;

    weatherGroup.clearLayers();
    if (!showWeatherRadar) {
      if (canvas) {
        const c2d = canvas.getContext('2d');
        c2d?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const detachRadarTiles = attachLiveRainViewerRadar(map);
    const stopCanvasAnim =
      canvas && hostEl
        ? startAccuWeatherCanvasAnimation(map, canvas, hostEl)
        : () => {};

    const getSvgWeatherPin = (kind: 'rain' | 'wind' | 'snow' | 'sun') => {
      if (kind === 'sun') {
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5.5" fill="#FBBF24"/><g stroke="#F59E0B" stroke-width="2" stroke-linecap="round"><line x1="12" y1="2" x2="12" y2="4.5"/><line x1="12" y1="19.5" x2="12" y2="22"/><line x1="2" y1="12" x2="4.5" y2="12"/><line x1="19.5" y1="12" x2="22" y2="12"/><line x1="4.9" y1="4.9" x2="6.7" y2="6.7"/><line x1="17.3" y1="17.3" x2="19.1" y2="19.1"/><line x1="19.1" y1="4.9" x2="17.3" y2="6.7"/><line x1="6.7" y1="17.3" x2="4.9" y2="19.1"/></g></svg>`;
      }
      if (kind === 'snow') {
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M8.5 15H17.2C19.3 15 21 13.4 21 11.3C21 9.4 19.6 7.8 17.8 7.6C17.1 5.2 14.9 3.5 12.3 3.5C9.3 3.5 6.9 5.7 6.6 8.6C5 9 3.8 10.4 3.8 12.1C3.8 13.7 5.1 15 6.8 15H8.5Z" fill="#38BDF8"/><circle cx="8.5" cy="18.5" r="1.4" fill="#E0F2FE"/><circle cx="12.5" cy="19.8" r="1.4" fill="#E0F2FE"/><circle cx="16.5" cy="18.5" r="1.4" fill="#E0F2FE"/></svg>`;
      }
      if (kind === 'wind') {
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M3 9.5H16.5C18.2 9.5 19.5 8.2 19.5 6.5C19.5 4.8 18.2 3.5 16.5 3.5C15 3.5 13.8 4.6 13.6 6" stroke="#38BDF8" stroke-width="2.2" stroke-linecap="round"/><path d="M3 14H18.5C20.2 14 21.5 15.3 21.5 17C21.5 18.7 20.2 20 18.5 20C17 20 15.8 18.9 15.6 17.5" stroke="#0EA5E9" stroke-width="2.2" stroke-linecap="round"/></svg>`;
      }
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M8.5 15.5H17.2C19.3 15.5 21 13.9 21 11.8C21 9.9 19.6 8.3 17.8 8.1C17.1 5.7 14.9 4 12.3 4C9.3 4 6.9 6.2 6.6 9.1C5 9.5 3.8 10.9 3.8 12.6C3.8 14.2 5.1 15.5 6.8 15.5H8.5Z" fill="#3B82F6"/><g stroke="#38BDF8" stroke-width="2" stroke-linecap="round"><line x1="8.5" y1="17.5" x2="7.5" y2="20.5"/><line x1="12.5" y1="17.5" x2="11.5" y2="20.5"/><line x1="16.5" y1="17.5" x2="15.5" y2="20.5"/></g></svg>`;
    };

    const synopticBadges: {
      center: [number, number];
      borderColor: string;
      kind: 'rain' | 'wind' | 'snow' | 'sun';
      label: string;
    }[] = [
      {
        center: [50.45, 7.85],
        borderColor: '#22c55e',
        kind: 'rain',
        label: '+7°C · Ploaie',
      },
      {
        center: [52.65, 6.25],
        borderColor: '#eab308',
        kind: 'rain',
        label: '+8°C · Averse',
      },
      {
        center: [55.52, 11.15],
        borderColor: '#38bdf8',
        kind: 'wind',
        label: '+4°C · 42 km/h',
      },
      {
        center: [58.35, 15.65],
        borderColor: '#818cf8',
        kind: 'snow',
        label: '+1°C · Ninsoare',
      },
      {
        center: [47.35, 20.15],
        borderColor: '#f59e0b',
        kind: 'sun',
        label: '+11°C · 24 km/h',
      },
    ];

    synopticBadges.forEach((front) => {
      const frontBadge = L.divIcon({
        className: 'accuweather-front-badge',
        html: `
          <div style="
            transform:translate(-50%, -50%);
            display:inline-flex;
            align-items:center;
            gap:5px;
            width:max-content;
            background:rgba(15, 23, 42, 0.90);
            border:1.5px solid ${front.borderColor};
            border-radius:9999px;
            padding:2.5px 8.5px;
            color:#ffffff;
            font-size:10px;
            font-weight:800;
            white-space:nowrap;
            box-shadow:0 4px 12px rgba(0,0,0,0.45);
            pointer-events:none;
          ">
            ${getSvgWeatherPin(front.kind)}
            <span style="color:#ffffff;">${front.label}</span>
          </div>
        `,
        iconSize: [0, 0],
      });
      L.marker(front.center, { icon: frontBadge, interactive: false }).addTo(
        weatherGroup
      );
    });

    return () => {
      detachRadarTiles();
      stopCanvasAnim();
    };
  }, [showWeatherRadar, isFullScreen]);

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

      // 3. Checkpoint City Dots along the highlighted route
      if (isHighlighted) {
        route.checkpoints.forEach((cp) => {
          const dotIcon = L.divIcon({
            className: 'custom-cp-dot',
            html: `
              <div style="
                display:flex;
                flex-direction:column;
                align-items:center;
                transform:translate(-50%, -50%);
              ">
                <div style="
                  width:10px;
                  height:10px;
                  border-radius:9999px;
                  background:${cp.completed ? '#16a34a' : '#ffffff'};
                  border:2.5px solid ${cp.completed ? '#16a34a' : lineColor};
                  box-shadow:0 2px 6px rgba(0,0,0,0.45);
                "></div>
                <span style="
                  margin-top:2px;
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
        html: isHighlighted
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

    // 5. Smart Trailer Swap Hubs & Idle Fleet Pins ONLY in Active overview (never in Trecute)
    if (effectiveScope === 'active' && !isSingle) {
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
        MOCK_FLEET_POSITIONS.forEach((v) => {
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
              " title="${v.plate} — ${v.place} (fără cursă activă)">
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
  ]);

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

  const renderAppleWeatherIcon = (type: AppleWeatherType) => {
    switch (type) {
      case 'sun':
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

  const renderMapControlsBar = () => (
    <div className="absolute top-2.5 left-2.5 right-2.5 sm:left-auto sm:top-3 sm:right-3 z-[450] flex items-center justify-end gap-1 sm:gap-1.5">
      <button
        type="button"
        onClick={() => setShowWeatherRadar((prev) => !prev)}
        aria-pressed={showWeatherRadar}
        aria-label="Comută radar meteo pe hartă"
        className="px-2 sm:px-3 py-1.5 rounded-full backdrop-blur-md border border-white/25 flex items-center gap-1.5 sm:gap-2 shadow-lg cursor-pointer transition shrink-0"
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          color: '#ffffff',
        }}
        title="Comută Radar Vreme (Ploaie, Ninsoare & Vânt) pe Hartă"
      >
        <span className="inline-flex items-center gap-1">
          {renderAppleWeatherIcon('rain')}
          {renderAppleWeatherIcon('wind')}
        </span>
        <span
          className="relative inline-flex items-center w-8 h-4 rounded-full transition-colors duration-200 p-0.5"
          style={{
            backgroundColor: showWeatherRadar ? '#30D158' : 'rgba(100, 116, 139, 0.75)',
          }}
        >
          <span
            className="w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200"
            style={{
              transform: showWeatherRadar ? 'translateX(16px)' : 'translateX(0px)',
            }}
          />
        </span>
      </button>

      <button
        type="button"
        onClick={handleZoomIn}
        aria-label="Mărește harta"
        className="px-2.5 sm:px-3 py-1.5 rounded-full backdrop-blur-md border border-white/25 text-xs font-extrabold flex items-center gap-1 shadow-lg cursor-pointer shrink-0 whitespace-nowrap"
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          color: '#ffffff',
        }}
      >
        <ZoomIn className="w-3.5 h-3.5" style={{ color: '#4ade80' }} aria-hidden="true" />
        <span style={{ color: '#ffffff' }}>+</span>
      </button>

      <button
        type="button"
        onClick={handleZoomOut}
        aria-label="Micșorează harta"
        className="px-2.5 sm:px-3 py-1.5 rounded-full backdrop-blur-md border border-white/25 text-xs font-extrabold flex items-center gap-1 shadow-lg cursor-pointer shrink-0 whitespace-nowrap"
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          color: '#ffffff',
        }}
      >
        <ZoomOut className="w-3.5 h-3.5" style={{ color: '#38bdf8' }} aria-hidden="true" />
        <span style={{ color: '#ffffff' }}>−</span>
      </button>

      <button
        type="button"
        onClick={handleToggleFullScreen}
        aria-label={isFullScreen ? 'Închide harta pe tot ecranul' : 'Deschide harta pe tot ecranul'}
        className="px-2.5 sm:px-3.5 py-1.5 rounded-full backdrop-blur-md border border-white/25 text-xs font-extrabold flex items-center gap-1.5 shadow-lg cursor-pointer shrink-0 whitespace-nowrap"
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
            <span style={{ color: '#ffffff' }}>Închide</span>
          </>
        ) : (
          <>
            <Maximize2 className="w-3.5 h-3.5 shrink-0" style={{ color: '#38bdf8' }} aria-hidden="true" />
            <span className="hidden min-[360px]:inline" style={{ color: '#ffffff' }}>Full Screen</span>
          </>
        )}
      </button>
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
              {showWeatherRadar && (
                <canvas
                  ref={weatherCanvasRef}
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full pointer-events-none z-[320]"
                />
              )}
              {renderMapControlsBar()}
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
        singleTripMode
          ? 'space-y-3'
          : 'tahoe-glass rounded-[28px] p-4 sm:p-5 space-y-4'
      }
    >
      <div className="flex flex-col gap-3.5">
        {/* ROW 1: Full-Width Interactive Leaflet Map Container */}
        <div
          ref={mapHostWrapperRef}
          className={`w-full shrink-0 min-w-0 relative rounded-[22px] overflow-hidden border border-white/15 shadow-2xl ${
            singleTripMode
              ? 'h-[300px] sm:h-[340px]'
              : 'h-[370px] sm:h-[470px] lg:h-[500px]'
          }`}
          style={{
            minHeight: singleTripMode ? '300px' : '370px',
            contentVisibility: 'auto',
            containIntrinsicSize: singleTripMode
              ? 'auto none auto 340px'
              : 'auto none auto 500px',
          }}
        >
          <div
            ref={mapContainerRef}
            className="w-full h-full z-0"
            style={{
              height: '100%',
              minHeight: singleTripMode ? '300px' : '370px',
            }}
          />

          {showWeatherRadar && (
            <canvas
              ref={weatherCanvasRef}
              aria-hidden="true"
              className="absolute inset-0 w-full h-full pointer-events-none z-[320]"
            />
          )}

          {renderMapControlsBar()}

          {/* Compact Bottom-Left Highway Corridor Pill */}
          <div
            className="absolute bottom-3 left-3 z-[400] px-3 py-1.5 rounded-full backdrop-blur-md border border-white/20 inline-flex items-center gap-1.5 text-[11px] font-semibold shadow-lg pointer-events-none select-none"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              color: '#ffffff',
            }}
          >
            <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] shrink-0" />
            <span style={{ color: '#ffffff' }}>Traseu Rutier Camioane</span>
          </div>
        </div>

        {/* ROW 2: Two Side-by-Side Cards Below the Map (Trips Selector + Route Checkpoints) */}
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
                        {(activeRouteDef.totalTechKm - activeRouteDef.drivenKm).toLocaleString(
                          'ro-RO'
                        )}{' '}
                        km
                      </strong>{' '}
                      ({activeRouteDef.estDriveHours})
                    </>
                  )}
                </span>
              </div>
              <div className="text-[10px] text-white/60 tabular-nums flex items-center justify-between gap-2 min-w-0">
                <span className="truncate min-w-0">
                  Program: <strong>{activeRouteDef.transitWindow}</strong>
                </span>
                <span className="text-[#30D158] font-bold shrink-0">
                  Parcurs: {activeRouteDef.drivenKm.toLocaleString('ro-RO')} km
                </span>
              </div>
            </div>

            {/* Route Checkpoints */}
            <div
              className={
                singleTripMode
                  ? 'grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5'
                  : 'space-y-2 relative pl-0.5'
              }
            >
              {activeRouteDef.checkpoints.map((cp, idx) => (
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
                    <div
                      className="inline-flex items-center gap-1 shrink-0"
                      aria-label={`Vreme la tranzit: ${cp.tempC > 0 ? `+${cp.tempC}` : cp.tempC}°C, ${cp.weatherDesc}`}
                    >
                      {renderAppleWeatherIcon(cp.weatherType)}
                      <span className="text-[10.5px] font-extrabold text-white tabular-nums">
                        {cp.tempC > 0 ? `+${cp.tempC}` : cp.tempC}°
                      </span>
                    </div>

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
              ))}
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
      </div>
    </div>
  );
};
