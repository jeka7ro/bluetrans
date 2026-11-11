import L from 'leaflet';

interface StormLobeOffset {
  dLat: number;
  dLng: number;
  radiusMeters: number;
  phase: number;
}

interface SynopticStormFront {
  id: string;
  baseCenter: [number, number];
  driftDegPerSec: [number, number]; // [dLat/s, dLng/s]
  kind: 'rain-heavy' | 'rain-moderate' | 'gale-rain' | 'snow';
  lobes: StormLobeOffset[];
}

interface WindParticle {
  lat: number;
  lng: number;
  age: number;
  maxAge: number;
  speedScale: number;
  trail: [number, number][];
}

interface PrecipDrop {
  frontIdx: number;
  offsetLat: number;
  offsetLng: number;
  fallPhase: number;
  fallSpeed: number;
  lengthPx: number;
}

interface RainViewerCache {
  fetchedAt: number;
  tileUrls: string[];
}

let rainViewerCache: RainViewerCache | null = null;

const EUROPE_BOUNDS = {
  minLat: 42.5,
  maxLat: 62.2,
  minLng: -2.5,
  maxLng: 28.8,
};

const SYNOPTIC_FRONTS: SynopticStormFront[] = [
  {
    id: 'benelux-northsea',
    baseCenter: [52.35, 5.75],
    driftDegPerSec: [0.022, 0.085],
    kind: 'rain-heavy',
    lobes: [
      { dLat: 0, dLng: 0, radiusMeters: 195000, phase: 0.0 },
      { dLat: 0.55, dLng: 1.15, radiusMeters: 165000, phase: 1.1 },
      { dLat: -0.48, dLng: -0.95, radiusMeters: 155000, phase: 2.3 },
      { dLat: 0.25, dLng: 2.1, radiusMeters: 140000, phase: 3.4 },
      { dLat: -0.65, dLng: 0.45, radiusMeters: 135000, phase: 4.6 },
    ],
  },
  {
    id: 'rhein-frankfurt-koln',
    baseCenter: [50.25, 8.15],
    driftDegPerSec: [0.015, 0.072],
    kind: 'rain-moderate',
    lobes: [
      { dLat: 0, dLng: 0, radiusMeters: 175000, phase: 0.5 },
      { dLat: 0.45, dLng: -0.9, radiusMeters: 145000, phase: 1.8 },
      { dLat: -0.42, dLng: 1.05, radiusMeters: 155000, phase: 3.1 },
      { dLat: -0.75, dLng: 2.05, radiusMeters: 130000, phase: 4.2 },
    ],
  },
  {
    id: 'kattegat-oresund-gale',
    baseCenter: [55.52, 11.15],
    driftDegPerSec: [0.018, 0.105],
    kind: 'gale-rain',
    lobes: [
      { dLat: 0, dLng: 0, radiusMeters: 165000, phase: 0.8 },
      { dLat: 0.32, dLng: 1.35, radiusMeters: 145000, phase: 2.1 },
      { dLat: -0.28, dLng: -1.15, radiusMeters: 135000, phase: 3.9 },
    ],
  },
  {
    id: 'scandinavia-e4-snow',
    baseCenter: [58.42, 15.55],
    driftDegPerSec: [0.025, 0.068],
    kind: 'snow',
    lobes: [
      { dLat: 0, dLng: 0, radiusMeters: 215000, phase: 0.3 },
      { dLat: 0.68, dLng: 1.45, radiusMeters: 185000, phase: 1.7 },
      { dLat: -0.58, dLng: -1.25, radiusMeters: 170000, phase: 2.9 },
      { dLat: 0.35, dLng: -0.65, radiusMeters: 150000, phase: 4.4 },
    ],
  },
];

/**
 * Smooth synoptic European wind field returning [dLatPerSec, dLngPerSec, speedKmh].
 * Models prevailing Atlantic Westerlies, the 42 km/h Øresund/Kattegat coastal jet,
 * and NW -> SE channeling along the Danube corridor (Viena -> Budapesta -> Oradea).
 */
function sampleEuropeanWindField(
  lat: number,
  lng: number,
  timeSec: number
): [number, number, number] {
  const wave = Math.sin(lng * 0.22 - timeSec * 0.35 + lat * 0.14);
  const meridional = Math.cos(lat * 0.28 + lng * 0.12 + timeSec * 0.22);

  // Base Westerly jet (West -> East)
  let dLng = 0.62 + 0.18 * Math.sin((lat - 46) * 0.18);
  let dLat = 0.11 * wave + 0.06 * meridional;
  let speedKmh = 28;

  // Kattegat / Storebælt / Øresund coastal gale acceleration (42 km/h)
  const dOresund = Math.hypot((lat - 55.5) * 1.4, (lng - 11.4) * 0.8);
  if (dOresund < 4.5) {
    const boost = (1 - dOresund / 4.5) * 0.42;
    dLng += boost;
    dLat += boost * 0.18;
    speedKmh = Math.round(30 + (1 - dOresund / 4.5) * 14);
  }

  // Danube / Alpine corridor deflection (NW -> SE from Munich/Vienna toward Budapest/Romania)
  if (lat < 49.2 && lng > 11.0 && lng < 24.5) {
    dLat -= 0.16;
    dLng += 0.08;
  }

  // Scandinavian SW -> NE trough toward Stockholm
  if (lat >= 56.0 && lng >= 11.5) {
    dLat += 0.16;
    dLng += 0.12;
    speedKmh = Math.max(speedKmh, 32);
  }

  return [dLat, dLng, speedKmh];
}

function metersToPixels(meters: number, lat: number, zoom: number): number {
  const metersPerPixel =
    (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
  return meters / Math.max(1, metersPerPixel);
}

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function spawnWindParticle(prewarmTrail = false): WindParticle {
  let lat = randomInRange(EUROPE_BOUNDS.minLat + 0.8, EUROPE_BOUNDS.maxLat - 0.8);
  let lng = randomInRange(EUROPE_BOUNDS.minLng + 0.8, EUROPE_BOUNDS.maxLng - 2.2);
  const maxAge = Math.floor(randomInRange(90, 155));
  const speedScale = randomInRange(0.84, 1.28);
  const trail: [number, number][] = [[lat, lng]];

  if (prewarmTrail) {
    const preSteps = Math.floor(randomInRange(12, 24));
    for (let s = 0; s < preSteps; s++) {
      const [vLat, vLng] = sampleEuropeanWindField(lat, lng, s * 0.05);
      lat += vLat * 0.042 * speedScale * 2.95;
      lng += vLng * 0.042 * speedScale * 2.95;
      trail.push([lat, lng]);
    }
  }

  return {
    lat,
    lng,
    age: prewarmTrail ? Math.floor(Math.random() * (maxAge * 0.65)) : 0,
    maxAge,
    speedScale,
    trail,
  };
}

async function loadRainViewerTileUrls(): Promise<string[]> {
  if (rainViewerCache && Date.now() - rainViewerCache.fetchedAt < 5 * 60 * 1000) {
    return rainViewerCache.tileUrls;
  }
  try {
    const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    if (!res.ok) return [];
    const data = await res.json();
    const host: string = data?.host || 'https://tilecache.rainviewer.com';
    const past: { path?: string }[] = Array.isArray(data?.radar?.past)
      ? data.radar.past
      : [];
    const nowcast: { path?: string }[] = Array.isArray(data?.radar?.nowcast)
      ? data.radar.nowcast
      : [];
    const frames = [...past.slice(-5), ...nowcast.slice(0, 2)].filter(
      (f) => typeof f?.path === 'string' && f.path.length > 0
    );
    // Color scheme 2 = Universal Blue / AccuWeather Doppler; 1_1 = smooth + snow enabled
    const urls = frames.map((f) => `${host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`);
    rainViewerCache = { fetchedAt: Date.now(), tileUrls: urls };
    return urls;
  } catch {
    return [];
  }
}

/**
 * Attaches live animated RainViewer Doppler radar tiles to a low z-index Leaflet pane
 * (underneath truck polylines and pins) with smooth cross-fading between radar frames.
 */
export function attachLiveRainViewerRadar(map: L.Map): () => void {
  let cancelled = false;
  let cycleTimer: ReturnType<typeof setInterval> | null = null;
  const mountedLayers: L.TileLayer[] = [];

  const paneName = 'accuweatherRadarPane';
  if (!map.getPane(paneName)) {
    const pane = map.createPane(paneName);
    pane.style.zIndex = '245';
    pane.style.pointerEvents = 'none';
  }

  loadRainViewerTileUrls().then((urls) => {
    if (cancelled || urls.length === 0 || !map.getContainer()?.isConnected) return;

    urls.forEach((url, idx) => {
      const layer = L.tileLayer(url, {
        pane: paneName,
        tileSize: 256,
        opacity: idx === urls.length - 1 ? 0.46 : 0,
        maxNativeZoom: 7,
        maxZoom: 18,
      });
      layer.addTo(map);
      mountedLayers.push(layer);
    });

    if (mountedLayers.length > 1) {
      let frameIdx = mountedLayers.length - 1;
      cycleTimer = setInterval(() => {
        if (cancelled || !map.getContainer()?.isConnected) return;
        const prevIdx = frameIdx;
        frameIdx = (frameIdx + 1) % mountedLayers.length;
        mountedLayers[frameIdx]?.setOpacity(0.46);
        mountedLayers[prevIdx]?.setOpacity(0);
      }, 950);
    }
  });

  return () => {
    cancelled = true;
    if (cycleTimer) clearInterval(cycleTimer);
    mountedLayers.forEach((layer) => {
      try {
        map.removeLayer(layer);
      } catch {
        // ignore if map already destroyed
      }
    });
  };
}

/**
 * Starts the 60fps AccuWeather Doppler Precipitation + Flowing Wind Streamlines + Rain/Snow
 * HTML5 Canvas animation synchronized 1:1 with Leaflet geographic coordinates.
 */
export function startAccuWeatherCanvasAnimation(
  map: L.Map,
  canvas: HTMLCanvasElement,
  hostElement: HTMLElement
): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const WIND_PARTICLE_COUNT = 175;
  const TRAIL_LENGTH = 26;
  const particles: WindParticle[] = Array.from(
    { length: WIND_PARTICLE_COUNT },
    () => spawnWindParticle(true)
  );

  // Precipitation streaks/flakes anchored around the 4 synoptic storm fronts
  const precipDrops: PrecipDrop[] = [];
  SYNOPTIC_FRONTS.forEach((front, fIdx) => {
    const count = front.kind === 'snow' ? 38 : 36;
    for (let i = 0; i < count; i++) {
      precipDrops.push({
        frontIdx: fIdx,
        offsetLat: randomInRange(-1.25, 1.25),
        offsetLng: randomInRange(-2.1, 2.1),
        fallPhase: Math.random(),
        fallSpeed: front.kind === 'snow' ? randomInRange(0.28, 0.52) : randomInRange(0.95, 1.55),
        lengthPx: front.kind === 'snow' ? randomInRange(1.6, 2.7) : randomInRange(10, 16),
      });
    }
  });

  let width = 0;
  let height = 0;
  let dpr = 1;

  const syncCanvasSize = () => {
    if (!canvas.isConnected) return;
    const rect = hostElement.getBoundingClientRect();
    const nextW = Math.max(1, Math.round(rect.width));
    const nextH = Math.max(1, Math.round(rect.height));
    const nextDpr = Math.min(2, window.devicePixelRatio || 1);
    if (nextW !== width || nextH !== height || nextDpr !== dpr) {
      width = nextW;
      height = nextH;
      dpr = nextDpr;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }
  };

  syncCanvasSize();

  let rafId: number | null = null;
  let isPaused = false;
  let lastTs = performance.now();
  const startOriginSec = performance.now() / 1000;
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  const getDriftedFrontCenter = (
    front: SynopticStormFront,
    elapsedSec: number
  ): [number, number] => {
    // Periodic 28-second synoptic radar sweep cycle so fronts drift smoothly across the corridor
    const cycle = (elapsedSec % 28) / 28;
    const offsetScale = (cycle - 0.35) * 14;
    return [
      front.baseCenter[0] + front.driftDegPerSec[0] * offsetScale,
      front.baseCenter[1] + front.driftDegPerSec[1] * offsetScale,
    ];
  };

  const renderFrame = (nowMs: number, advancePhysics: boolean) => {
    if (!canvas.isConnected || !map.getContainer()?.isConnected) return;
    syncCanvasSize();
    if (width <= 2 || height <= 2) return;

    const dt = Math.min(0.05, Math.max(0.008, (nowMs - lastTs) / 1000));
    lastTs = nowMs;
    const elapsedSec = nowMs / 1000 - startOriginSec;
    const zoom = map.getZoom();

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // 1. LAYER A — Moving AccuWeather Doppler Precipitation Cells (Organic Multi-Lobe Gradients)
    SYNOPTIC_FRONTS.forEach((front) => {
      const [cLat, cLng] = getDriftedFrontCenter(front, elapsedSec);

      front.lobes.forEach((lobe) => {
        const wobbleLat = Math.sin(elapsedSec * 0.9 + lobe.phase) * 0.12;
        const wobbleLng = Math.cos(elapsedSec * 0.75 + lobe.phase) * 0.2;
        const lobeLat = cLat + lobe.dLat + wobbleLat;
        const lobeLng = cLng + lobe.dLng + wobbleLng;

        const pt = map.latLngToContainerPoint([lobeLat, lobeLng]);
        const pulse = 1 + 0.06 * Math.sin(elapsedSec * 1.8 + lobe.phase);
        const radiusPx = Math.max(
          26,
          metersToPixels(lobe.radiusMeters, lobeLat, zoom) * pulse
        );

        if (
          pt.x < -radiusPx ||
          pt.x > width + radiusPx ||
          pt.y < -radiusPx ||
          pt.y > height + radiusPx
        ) {
          return;
        }

        const grad = ctx.createRadialGradient(
          pt.x,
          pt.y,
          radiusPx * 0.06,
          pt.x,
          pt.y,
          radiusPx
        );

        if (front.kind === 'snow') {
          grad.addColorStop(0, 'rgba(192, 132, 252, 0.36)'); // Heavy snow magenta-violet core
          grad.addColorStop(0.35, 'rgba(99, 102, 241, 0.28)'); // Moderate snow indigo
          grad.addColorStop(0.7, 'rgba(56, 189, 248, 0.20)'); // Sleet/light snow cyan
          grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        } else if (front.kind === 'rain-heavy') {
          grad.addColorStop(0, 'rgba(249, 115, 22, 0.36)'); // AccuWeather orange intense core
          grad.addColorStop(0.28, 'rgba(234, 179, 8, 0.30)'); // Yellow moderate-heavy rain
          grad.addColorStop(0.58, 'rgba(132, 204, 22, 0.24)'); // Lime rain band
          grad.addColorStop(0.84, 'rgba(34, 197, 94, 0.16)'); // Emerald light rain edge
          grad.addColorStop(1, 'rgba(34, 197, 94, 0)');
        } else if (front.kind === 'gale-rain') {
          grad.addColorStop(0, 'rgba(234, 179, 8, 0.32)');
          grad.addColorStop(0.42, 'rgba(16, 185, 129, 0.25)');
          grad.addColorStop(0.78, 'rgba(6, 182, 212, 0.18)');
          grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
        } else {
          grad.addColorStop(0, 'rgba(234, 179, 8, 0.32)');
          grad.addColorStop(0.4, 'rgba(132, 204, 22, 0.25)');
          grad.addColorStop(0.78, 'rgba(34, 197, 94, 0.16)');
          grad.addColorStop(1, 'rgba(34, 197, 94, 0)');
        }

        ctx.save();
        // Slight meteorological W-E shear ellipse
        ctx.translate(pt.x, pt.y);
        ctx.scale(1.28, 0.84);
        ctx.beginPath();
        ctx.arc(0, 0, radiusPx, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      });
    });

    // 2. LAYER B — Flowing Wind Streamlines (AccuWeather / Windy Wind Currents)
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      if (advancePhysics) {
        const [vLat, vLng] = sampleEuropeanWindField(p.lat, p.lng, elapsedSec);
        // Scale geographic step gently with zoom so visual pixel speed feels natural at every zoom
        const zoomSpeedAdjust = Math.pow(2, Math.max(0, 5 - zoom) * 0.45);
        p.lat += vLat * dt * p.speedScale * 2.95 * zoomSpeedAdjust;
        p.lng += vLng * dt * p.speedScale * 2.95 * zoomSpeedAdjust;
        p.age += 1;

        p.trail.push([p.lat, p.lng]);
        if (p.trail.length > TRAIL_LENGTH) {
          p.trail.shift();
        }

        const outOfBounds =
          p.lat < EUROPE_BOUNDS.minLat ||
          p.lat > EUROPE_BOUNDS.maxLat ||
          p.lng < EUROPE_BOUNDS.minLng ||
          p.lng > EUROPE_BOUNDS.maxLng;

        if (p.age >= p.maxAge || outOfBounds) {
          particles[i] = spawnWindParticle(false);
          continue;
        }
      }

      if (p.trail.length < 3) continue;

      // Smooth fade-in and fade-out along particle lifetime
      const lifeRatio = p.age / p.maxAge;
      const lifeAlpha =
        lifeRatio < 0.15
          ? lifeRatio / 0.15
          : lifeRatio > 0.82
            ? (1 - lifeRatio) / 0.18
            : 1;

      const screenPts: { x: number; y: number }[] = [];
      let anyOnScreen = false;
      for (let k = 0; k < p.trail.length; k++) {
        const sp = map.latLngToContainerPoint(p.trail[k]);
        screenPts.push(sp);
        if (sp.x >= -20 && sp.x <= width + 20 && sp.y >= -20 && sp.y <= height + 20) {
          anyOnScreen = true;
        }
      }
      if (!anyOnScreen) continue;

      const tail = screenPts[0];
      const head = screenPts[screenPts.length - 1];
      if (Math.hypot(head.x - tail.x, head.y - tail.y) < 3) continue;

      // High-contrast ocean-blue casing so streamlines pop clearly on BOTH Light OSM & Dark maps
      const casingGrad = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
      casingGrad.addColorStop(0, 'rgba(3, 105, 161, 0)');
      casingGrad.addColorStop(0.55, `rgba(2, 132, 199, ${(0.34 * lifeAlpha).toFixed(3)})`);
      casingGrad.addColorStop(1, `rgba(3, 105, 161, ${(0.62 * lifeAlpha).toFixed(3)})`);

      ctx.beginPath();
      ctx.moveTo(screenPts[0].x, screenPts[0].y);
      for (let k = 1; k < screenPts.length; k++) {
        ctx.lineTo(screenPts[k].x, screenPts[k].y);
      }
      ctx.strokeStyle = casingGrad;
      ctx.lineWidth = 2.8;
      ctx.stroke();

      // Luminous cyan-white wind core
      const coreGrad = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
      coreGrad.addColorStop(0, 'rgba(224, 242, 254, 0)');
      coreGrad.addColorStop(0.5, `rgba(186, 230, 253, ${(0.55 * lifeAlpha).toFixed(3)})`);
      coreGrad.addColorStop(1, `rgba(255, 255, 255, ${(0.96 * lifeAlpha).toFixed(3)})`);

      ctx.strokeStyle = coreGrad;
      ctx.lineWidth = 1.45;
      ctx.stroke();

      // Directional wind-head droplet
      ctx.beginPath();
      ctx.arc(head.x, head.y, 1.55, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${(0.92 * lifeAlpha).toFixed(3)})`;
      ctx.fill();
    }

    // 3. LAYER C — Animated Falling Rain Streaks & Drifting Snowflakes inside Storm Cells
    for (let i = 0; i < precipDrops.length; i++) {
      const drop = precipDrops[i];
      const front = SYNOPTIC_FRONTS[drop.frontIdx];
      if (!front) continue;

      if (advancePhysics) {
        drop.fallPhase = (drop.fallPhase + dt * drop.fallSpeed) % 1;
      }

      const [cLat, cLng] = getDriftedFrontCenter(front, elapsedSec);
      const pt = map.latLngToContainerPoint([
        cLat + drop.offsetLat,
        cLng + drop.offsetLng,
      ]);

      if (pt.x < -20 || pt.x > width + 20 || pt.y < -20 || pt.y > height + 20) {
        continue;
      }

      const alpha = Math.sin(drop.fallPhase * Math.PI) * 0.85;

      if (front.kind === 'snow') {
        const swayX = Math.sin(elapsedSec * 2.2 + i) * 5;
        const fallY = (drop.fallPhase - 0.5) * 18;
        const sx = pt.x + swayX;
        const sy = pt.y + fallY;

        ctx.beginPath();
        ctx.arc(sx, sy, drop.lengthPx + 1.1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(14, 165, 233, ${(alpha * 0.34).toFixed(3)})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(sx, sy, drop.lengthPx, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${(alpha * 0.96).toFixed(3)})`;
        ctx.fill();
      } else {
        // Wind-slanted falling rain streak (outer blue contrast + bright cyan-white core)
        const driftX = (drop.fallPhase - 0.5) * 9;
        const driftY = (drop.fallPhase - 0.5) * 22;
        const x1 = pt.x + driftX;
        const y1 = pt.y + driftY;
        const x2 = x1 + drop.lengthPx * 0.34;
        const y2 = y1 + drop.lengthPx;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgba(3, 105, 161, ${(alpha * 0.62).toFixed(3)})`;
        ctx.lineWidth = 2.1;
        ctx.stroke();

        ctx.strokeStyle = `rgba(224, 242, 254, ${(alpha * 0.88).toFixed(3)})`;
        ctx.lineWidth = 1.05;
        ctx.stroke();
      }
    }

    ctx.restore();
  };

  const tick = (nowMs: number) => {
    if (isPaused) {
      rafId = null;
      return;
    }
    renderFrame(nowMs, true);
    rafId = window.requestAnimationFrame(tick);
  };

  const startLoop = () => {
    if (reducedMotionQuery.matches) {
      // Pre-warm trails so static reduced-motion snapshot displays full wind streamlines
      for (let step = 0; step < TRAIL_LENGTH; step++) {
        renderFrame(performance.now() + step * 16, true);
      }
      return;
    }
    if (rafId === null && !isPaused) {
      lastTs = performance.now();
      rafId = window.requestAnimationFrame(tick);
    }
  };

  const pauseLoop = () => {
    isPaused = true;
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const resumeLoop = () => {
    if (!isPaused) return;
    isPaused = false;
    startLoop();
  };

  // Re-project immediately on Leaflet pan/zoom so streamlines never lag behind map dragging
  const handleMapMove = () => {
    if (reducedMotionQuery.matches) {
      renderFrame(performance.now(), false);
    }
  };
  map.on('move zoom resize', handleMapMove);

  const handleVisibilityChange = () => {
    if (document.hidden) {
      pauseLoop();
    } else {
      resumeLoop();
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Pause rendering when browser skips off-screen subtree (`contentvisibilityautostatechange` + IntersectionObserver fallback)
  const handleContentVisibility = (e: Event) => {
    const cvEvent = e as Event & { skipped?: boolean };
    if (cvEvent.skipped) {
      pauseLoop();
    } else {
      resumeLoop();
    }
  };
  hostElement.addEventListener(
    'contentvisibilityautostatechange',
    handleContentVisibility
  );

  let intersectionObs: IntersectionObserver | null = null;
  if (!('contentVisibility' in document.documentElement.style)) {
    intersectionObs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            resumeLoop();
          } else {
            pauseLoop();
          }
        }
      },
      { rootMargin: '200px' }
    );
    intersectionObs.observe(hostElement);
  }

  startLoop();

  return () => {
    pauseLoop();
    map.off('move zoom resize', handleMapMove);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    hostElement.removeEventListener(
      'contentvisibilityautostatechange',
      handleContentVisibility
    );
    intersectionObs?.disconnect();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
}
