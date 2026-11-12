import L from 'leaflet';
import type { AppleWeatherType } from './planningRouteSync';

export type WeatherPillAnchor = 'top' | 'bottom' | 'left' | 'right';

export interface LiveWeatherStation {
  id: string;
  city: string;
  lat: number;
  lng: number;
  /** Screen-space callout direction anchored at the exact [lat, lng] city coordinate */
  pillAnchor?: WeatherPillAnchor;
  /** Minimum Leaflet zoom level at which to display this city's weather pill (default: always when pillAnchor is set) */
  minZoomForPill?: number;
  tempC: number;
  precipitationMm: number;
  rainMm: number;
  showersMm: number;
  snowfallCm: number;
  cloudCoverPct: number;
  weatherCode: number;
  weatherType: AppleWeatherType;
  weatherDescRo: string;
  windSpeedKmh: number;
  windDirDeg: number;
  observedAt: string;
}

export interface LiveEuropeanWeatherSnapshot {
  fetchedAtMs: number;
  radarTimestampUnix: number | null;
  stations: LiveWeatherStation[];
  byId: Record<string, LiveWeatherStation>;
}

interface StationSeed {
  id: string;
  city: string;
  aliases: string[];
  lat: number;
  lng: number;
  /** Screen-space callout direction anchored at the exact [lat, lng] city coordinate */
  pillAnchor?: WeatherPillAnchor;
  /** Optional minimum zoom level to display secondary hub pills when zoomed in / Full Screen */
  minZoomForPill?: number;
}

/**
 * 24 real European logistics corridor & synoptic stations queried in 1 batch request from Open-Meteo.
 */
const EUROPEAN_STATION_SEEDS: StationSeed[] = [
  {
    id: 'oradea',
    city: 'Oradea',
    aliases: ['oradea', 'bors', 'debrecen', 'satu mare', 'arad'],
    lat: 47.0722,
    lng: 21.9217,
    pillAnchor: 'right',
  },
  {
    id: 'bucuresti',
    city: 'București',
    aliases: ['bucuresti', 'ploiesti', 'pitesti', 'giurgiu', 'constanta', 'craiova'],
    lat: 44.4268,
    lng: 26.1025,
    pillAnchor: 'bottom',
    minZoomForPill: 7,
  },
  {
    id: 'cluj',
    city: 'Cluj-Napoca',
    aliases: ['cluj', 'cluj-napoca', 'turda', 'sibiu', 'brasov', 'targu mures', 'alba iulia', 'sebes'],
    lat: 46.7712,
    lng: 23.6236,
    pillAnchor: 'top',
    minZoomForPill: 6,
  },
  {
    id: 'szeged',
    city: 'Szeged',
    aliases: ['szeged', 'timisoara', 'nadlac', 'kecskemet'],
    lat: 46.253,
    lng: 20.1414,
    pillAnchor: 'bottom',
    minZoomForPill: 7,
  },
  {
    id: 'szolnok',
    city: 'Szolnok',
    aliases: ['szolnok'],
    lat: 47.1621,
    lng: 20.1825,
  },
  {
    id: 'budapesta',
    city: 'Budapesta',
    aliases: ['budapesta', 'budapest', 'gyor', 'tatabanya', 'hegyeshalom'],
    lat: 47.41,
    lng: 19.15,
    pillAnchor: 'bottom',
    minZoomForPill: 7,
  },
  {
    id: 'bratislava',
    city: 'Bratislava',
    aliases: ['bratislava', 'brno'],
    lat: 48.1486,
    lng: 17.1077,
  },
  {
    id: 'viena',
    city: 'Viena',
    aliases: ['viena', 'vienna', 'wien', 'linz', 'graz'],
    lat: 48.2082,
    lng: 16.3738,
    pillAnchor: 'top',
  },
  {
    id: 'suben',
    city: 'Suben',
    aliases: ['suben', 'passau', 'salzburg'],
    lat: 48.4064,
    lng: 13.4314,
  },
  {
    id: 'munchen',
    city: 'München',
    aliases: ['munchen', 'munich', 'augsburg', 'ulm', 'regensburg', 'neumarkt', 'nurnberg', 'nuremberg', 'innsbruck'],
    lat: 48.1351,
    lng: 11.582,
    pillAnchor: 'bottom',
    minZoomForPill: 7,
  },
  {
    id: 'stuttgart',
    city: 'Stuttgart',
    aliases: ['stuttgart', 'karlsruhe', 'mannheim'],
    lat: 48.7758,
    lng: 9.1829,
  },
  {
    id: 'frankfurt',
    city: 'Frankfurt',
    aliases: ['frankfurt', 'wurzburg', 'kassel'],
    lat: 50.1109,
    lng: 8.6821,
    pillAnchor: 'right',
    minZoomForPill: 7,
  },
  {
    id: 'koln',
    city: 'Köln',
    aliases: ['koln', 'cologne', 'dusseldorf', 'duisburg', 'dortmund', 'essen', 'liege', 'luxemburg'],
    lat: 50.9375,
    lng: 6.9603,
    pillAnchor: 'left',
  },
  {
    id: 'venlo',
    city: 'Venlo',
    aliases: ['venlo', 'eindhoven', 'tilburg', 'breda'],
    lat: 51.3704,
    lng: 6.1724,
  },
  {
    id: 'rotterdam',
    city: 'Rotterdam',
    aliases: ['rotterdam', 'antwerpen', 'anvers', 'bruxelles', 'brussels', 'gent'],
    lat: 51.9244,
    lng: 4.4777,
    pillAnchor: 'top',
  },
  {
    id: 'almere',
    city: 'Almere',
    aliases: ['almere', 'amsterdam', 'utrecht', 'zwolle', 'lemmer'],
    lat: 52.3508,
    lng: 5.2647,
  },
  {
    id: 'hamburg',
    city: 'Hamburg',
    aliases: ['hamburg', 'bremen', 'osnabruck', 'hannover'],
    lat: 53.5511,
    lng: 9.9937,
    pillAnchor: 'right',
    minZoomForPill: 7,
  },
  {
    id: 'kolding',
    city: 'Kolding',
    aliases: ['kolding', 'odense', 'flensburg', 'padborg'],
    lat: 55.4904,
    lng: 9.4722,
  },
  {
    id: 'malmo',
    city: 'Malmö',
    aliases: ['malmo', 'malmo (pod oresund)', 'copenhaga', 'kobenhavn', 'helsingborg'],
    lat: 55.605,
    lng: 13.0038,
    pillAnchor: 'right',
  },
  {
    id: 'goteborg',
    city: 'Göteborg',
    aliases: ['goteborg', 'gothenburg', 'jonkoping'],
    lat: 57.7089,
    lng: 11.9746,
    pillAnchor: 'left',
    minZoomForPill: 6,
  },
  {
    id: 'stockholm',
    city: 'Stockholm',
    aliases: ['stockholm', 'linkoping', 'norrkoping', 'sodertalje'],
    lat: 59.3293,
    lng: 18.0686,
    pillAnchor: 'left',
  },
  {
    id: 'berlin',
    city: 'Berlin',
    aliases: ['berlin', 'leipzig', 'dresda', 'dresden', 'praga', 'praha'],
    lat: 52.52,
    lng: 13.405,
    pillAnchor: 'right',
    minZoomForPill: 6,
  },
  {
    id: 'varsovia',
    city: 'Varșovia',
    aliases: ['varsovia', 'warszawa', 'wroclaw', 'poznan', 'katowice'],
    lat: 52.2297,
    lng: 21.0122,
    pillAnchor: 'right',
    minZoomForPill: 6,
  },
  {
    id: 'milano',
    city: 'Milano',
    aliases: ['milano', 'torino', 'verona', 'bologna', 'ljubljana', 'zagreb', 'paris', 'lyon'],
    lat: 45.4642,
    lng: 9.19,
    pillAnchor: 'bottom',
    minZoomForPill: 6,
  },
];

const WEATHER_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RADAR_TTL_MS = 5 * 60 * 1000; // 5 minutes

let liveWeatherSnapshotCache: LiveEuropeanWeatherSnapshot | null = null;
let liveWeatherInFlight: Promise<LiveEuropeanWeatherSnapshot | null> | null = null;
const weatherSubscribers = new Set<(snap: LiveEuropeanWeatherSnapshot) => void>();
let weatherRefreshInterval: ReturnType<typeof setInterval> | null = null;

function normalizeCityToken(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ø/gi, 'o')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .trim();
}

/**
 * Strictly maps REAL live Open-Meteo station measurements to weather state:
 * - NEVER reports rain/drizzle/snow if actual measured precipitation right now is 0.0 mm
 *   (prevents WMO 51/61 1-hour residual codes from falsely showing rain over dry cities).
 */
export function mapWmoCodeToWeather(
  wmoCode: number,
  windSpeedKmh: number,
  precipitationMm: number,
  rainMm = 0,
  showersMm = 0,
  snowfallCm = 0,
  cloudCoverPct = 0
): {
  weatherType: AppleWeatherType;
  weatherDescRo: string;
  isPrecipitating: boolean;
  isSnow: boolean;
} {
  const liveLiquidMm = Math.max(precipitationMm, rainMm + showersMm);
  const hasRealSnow =
    snowfallCm > 0 ||
    (liveLiquidMm > 0 &&
      ((wmoCode >= 71 && wmoCode <= 77) ||
        wmoCode === 85 ||
        wmoCode === 86 ||
        wmoCode === 56 ||
        wmoCode === 57 ||
        wmoCode === 66 ||
        wmoCode === 67));

  if (hasRealSnow) {
    const desc =
      wmoCode === 66 || wmoCode === 67
        ? 'Polei'
        : wmoCode === 85 || wmoCode === 86
          ? 'Ninsoare'
          : 'Ninsoare';
    return {
      weatherType: 'snow',
      weatherDescRo: desc,
      isPrecipitating: true,
      isSnow: true,
    };
  }

  // ONLY report rain when measurable liquid precipitation (> 0 mm) is genuinely falling right now
  if (liveLiquidMm > 0) {
    let baseDesc = 'Ploaie ușoară';
    if (wmoCode >= 95) {
      baseDesc = 'Furtună';
    } else if (wmoCode >= 80 && wmoCode <= 82) {
      baseDesc = 'Averse';
    } else if (wmoCode >= 63 || liveLiquidMm >= 1.5) {
      baseDesc = liveLiquidMm >= 4 ? 'Ploaie intensă' : 'Ploaie';
    } else if ((wmoCode >= 51 && wmoCode <= 55) || liveLiquidMm < 0.3) {
      baseDesc = 'Burniță';
    }
    return {
      weatherType: 'rain',
      weatherDescRo: `${baseDesc} (${liveLiquidMm.toFixed(1)} mm)`,
      isPrecipitating: true,
      isSnow: false,
    };
  }

  // Zero precipitation right now -> report real wind, fog, cloud cover, or clear sky
  if (windSpeedKmh >= 28) {
    return {
      weatherType: 'wind',
      weatherDescRo: `${Math.round(windSpeedKmh)} km/h`,
      isPrecipitating: false,
      isSnow: false,
    };
  }

  if (wmoCode === 45 || wmoCode === 48) {
    return {
      weatherType: 'partly-cloudy',
      weatherDescRo: 'Ceață',
      isPrecipitating: false,
      isSnow: false,
    };
  }

  if (cloudCoverPct >= 75 || wmoCode === 3) {
    return {
      weatherType: 'partly-cloudy',
      weatherDescRo: 'Noros',
      isPrecipitating: false,
      isSnow: false,
    };
  }

  if (cloudCoverPct >= 25 || wmoCode === 2) {
    return {
      weatherType: 'partly-cloudy',
      weatherDescRo: 'Parțial noros',
      isPrecipitating: false,
      isSnow: false,
    };
  }

  return {
    weatherType: 'sun',
    weatherDescRo: 'Senin',
    isPrecipitating: false,
    isSnow: false,
  };
}

export async function fetchLiveEuropeanWeather(
  force = false
): Promise<LiveEuropeanWeatherSnapshot | null> {
  if (
    !force &&
    liveWeatherSnapshotCache &&
    Date.now() - liveWeatherSnapshotCache.fetchedAtMs < WEATHER_TTL_MS
  ) {
    return liveWeatherSnapshotCache;
  }
  if (liveWeatherInFlight) {
    return liveWeatherInFlight;
  }

  liveWeatherInFlight = (async () => {
    try {
      const lats = EUROPEAN_STATION_SEEDS.map((s) => s.lat.toFixed(4)).join(',');
      const lngs = EUROPEAN_STATION_SEEDS.map((s) => s.lng.toFixed(4)).join(',');
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current=temperature_2m,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m&wind_speed_unit=kmh&timezone=auto`;

      const res = await fetch(url);
      if (!res.ok) return liveWeatherSnapshotCache;
      const payload = await res.json();
      const list: unknown[] = Array.isArray(payload) ? payload : [payload];
      if (list.length !== EUROPEAN_STATION_SEEDS.length) {
        return liveWeatherSnapshotCache;
      }

      const stations: LiveWeatherStation[] = [];
      const byId: Record<string, LiveWeatherStation> = {};

      for (let i = 0; i < EUROPEAN_STATION_SEEDS.length; i++) {
        const seed = EUROPEAN_STATION_SEEDS[i];
        const entry = list[i] as {
          current?: {
            time?: string;
            temperature_2m?: number;
            precipitation?: number;
            rain?: number;
            showers?: number;
            snowfall?: number;
            weather_code?: number;
            cloud_cover?: number;
            wind_speed_10m?: number;
            wind_direction_10m?: number;
          };
        };
        const cur = entry?.current;
        if (!cur || typeof cur.temperature_2m !== 'number') continue;

        const tempC = cur.temperature_2m;
        const precipitationMm =
          typeof cur.precipitation === 'number' ? cur.precipitation : 0;
        const rainMm = typeof cur.rain === 'number' ? cur.rain : 0;
        const showersMm = typeof cur.showers === 'number' ? cur.showers : 0;
        const snowfallCm = typeof cur.snowfall === 'number' ? cur.snowfall : 0;
        const cloudCoverPct =
          typeof cur.cloud_cover === 'number' ? cur.cloud_cover : 0;
        const weatherCode =
          typeof cur.weather_code === 'number' ? cur.weather_code : 0;
        const windSpeedKmh =
          typeof cur.wind_speed_10m === 'number' ? cur.wind_speed_10m : 0;
        const windDirDeg =
          typeof cur.wind_direction_10m === 'number' ? cur.wind_direction_10m : 270;

        const mapped = mapWmoCodeToWeather(
          weatherCode,
          windSpeedKmh,
          precipitationMm,
          rainMm,
          showersMm,
          snowfallCm,
          cloudCoverPct
        );
        const station: LiveWeatherStation = {
          id: seed.id,
          city: seed.city,
          lat: seed.lat,
          lng: seed.lng,
          pillAnchor: seed.pillAnchor,
          minZoomForPill: seed.minZoomForPill,
          tempC,
          precipitationMm,
          rainMm,
          showersMm,
          snowfallCm,
          cloudCoverPct,
          weatherCode,
          weatherType: mapped.weatherType,
          weatherDescRo: mapped.weatherDescRo,
          windSpeedKmh,
          windDirDeg,
          observedAt: cur.time || '',
        };
        stations.push(station);
        byId[station.id] = station;
      }

      if (stations.length === 0) return liveWeatherSnapshotCache;

      const snapshot: LiveEuropeanWeatherSnapshot = {
        fetchedAtMs: Date.now(),
        radarTimestampUnix: rainViewerLatestCache?.radarTimestampUnix ?? null,
        stations,
        byId,
      };
      liveWeatherSnapshotCache = snapshot;
      weatherSubscribers.forEach((cb) => cb(snapshot));
      return snapshot;
    } catch {
      return liveWeatherSnapshotCache;
    } finally {
      liveWeatherInFlight = null;
    }
  })();

  return liveWeatherInFlight;
}

export function getCachedLiveEuropeanWeather(): LiveEuropeanWeatherSnapshot | null {
  return liveWeatherSnapshotCache;
}

export function subscribeLiveEuropeanWeather(
  callback: (snapshot: LiveEuropeanWeatherSnapshot) => void
): () => void {
  weatherSubscribers.add(callback);
  if (liveWeatherSnapshotCache) {
    callback(liveWeatherSnapshotCache);
  }
  void fetchLiveEuropeanWeather(false);

  if (!weatherRefreshInterval && typeof window !== 'undefined') {
    weatherRefreshInterval = setInterval(() => {
      if (weatherSubscribers.size === 0) {
        if (weatherRefreshInterval) {
          clearInterval(weatherRefreshInterval);
          weatherRefreshInterval = null;
        }
        return;
      }
      if (!document.hidden) {
        void fetchLiveEuropeanWeather(true);
      }
    }, WEATHER_TTL_MS);
  }

  return () => {
    weatherSubscribers.delete(callback);
    if (weatherSubscribers.size === 0 && weatherRefreshInterval) {
      clearInterval(weatherRefreshInterval);
      weatherRefreshInterval = null;
    }
  };
}

/**
 * Matches any route checkpoint (by normalized city alias or nearest geographic station)
 * to real-time Open-Meteo station observations.
 */
export function resolveLiveCheckpointWeather(
  snapshot: LiveEuropeanWeatherSnapshot | null,
  cityName: string,
  coords?: [number, number]
): LiveWeatherStation | null {
  if (!snapshot || snapshot.stations.length === 0) return null;

  const norm = normalizeCityToken(cityName);
  if (norm) {
    for (let i = 0; i < EUROPEAN_STATION_SEEDS.length; i++) {
      const seed = EUROPEAN_STATION_SEEDS[i];
      if (seed.aliases.includes(norm) && snapshot.byId[seed.id]) {
        return snapshot.byId[seed.id];
      }
    }
  }

  if (coords) {
    let best: LiveWeatherStation | null = null;
    let bestDistSq = Infinity;
    for (let i = 0; i < snapshot.stations.length; i++) {
      const st = snapshot.stations[i];
      const dLat = st.lat - coords[0];
      const dLng = (st.lng - coords[1]) * 0.72;
      const dSq = dLat * dLat + dLng * dLng;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        best = st;
      }
    }
    return best;
  }

  return null;
}

interface RainViewerLatestCache {
  fetchedAtMs: number;
  latestTileUrl: string | null;
  radarTimestampUnix: number | null;
}

let rainViewerLatestCache: RainViewerLatestCache | null = null;

async function fetchLatestRainViewerUrl(force = false): Promise<string | null> {
  if (
    !force &&
    rainViewerLatestCache &&
    Date.now() - rainViewerLatestCache.fetchedAtMs < RADAR_TTL_MS
  ) {
    return rainViewerLatestCache.latestTileUrl;
  }
  try {
    const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    if (!res.ok) return rainViewerLatestCache?.latestTileUrl ?? null;
    const data = await res.json();
    const host: string = data?.host || 'https://tilecache.rainviewer.com';
    const past: { path?: string; time?: number }[] = Array.isArray(data?.radar?.past)
      ? data.radar.past
      : [];
    const latest = past[past.length - 1];
    if (!latest?.path) {
      rainViewerLatestCache = {
        fetchedAtMs: Date.now(),
        latestTileUrl: null,
        radarTimestampUnix: null,
      };
      return null;
    }
    // Single live Doppler radar frame (scheme 2 = Universal Blue, 1_1 = smooth + snow)
    // 100% transparent over dry areas — ONLY real radar echoes appear on the map.
    const latestTileUrl = `${host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`;
    rainViewerLatestCache = {
      fetchedAtMs: Date.now(),
      latestTileUrl,
      radarTimestampUnix: typeof latest.time === 'number' ? latest.time : null,
    };
    return latestTileUrl;
  } catch {
    return rainViewerLatestCache?.latestTileUrl ?? null;
  }
}

/**
 * Mounts ONLY the real live RainViewer Doppler radar tile layer (refreshed every 5 min).
 * Zero synthetic canvas streaks, zero fake rain drops — dry regions stay 100% clear.
 */
export function attachLiveRainViewerRadar(map: L.Map): () => void {
  let cancelled = false;
  let activeLayer: L.TileLayer | null = null;
  let currentUrl: string | null = null;

  const paneName = 'accuweatherRadarPane';
  if (!map.getPane(paneName)) {
    const pane = map.createPane(paneName);
    pane.style.zIndex = '245';
    pane.style.pointerEvents = 'none';
  }

  const syncLatestRadar = async (force: boolean) => {
    const url = await fetchLatestRainViewerUrl(force);
    if (cancelled || !url || !map.getContainer()?.isConnected) return;
    if (url === currentUrl) return;
    currentUrl = url;

    if (activeLayer) {
      activeLayer.setUrl(url);
    } else {
      activeLayer = L.tileLayer(url, {
        pane: paneName,
        tileSize: 256,
        opacity: 0.55,
        maxNativeZoom: 7,
        maxZoom: 18,
        updateWhenIdle: true,
        keepBuffer: 1,
      });
      activeLayer.addTo(map);
    }
  };

  void syncLatestRadar(false);
  const refreshTimer = setInterval(() => {
    if (!document.hidden) {
      void syncLatestRadar(true);
    }
  }, RADAR_TTL_MS);

  return () => {
    cancelled = true;
    clearInterval(refreshTimer);
    if (activeLayer) {
      try {
        map.removeLayer(activeLayer);
      } catch {
        // ignore if map already destroyed
      }
      activeLayer = null;
    }
  };
}
