import L from 'leaflet';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

export interface SubsolarPoint {
  timestampMs: number;
  declinationDeg: number;
  longitudeDeg: number;
  sinDecl: number;
  cosDecl: number;
}

/**
 * Computes the exact astronomical subsolar point (latitude = solar declination,
 * longitude = solar Greenwich hour angle) for a given UTC timestamp using NOAA / Meeus equations.
 */
export function computeSubsolarPoint(timestampMs: number = Date.now()): SubsolarPoint {
  const jd = timestampMs / 86_400_000 + 2440587.5;
  const n = jd - 2451545.0;

  const meanLongDeg = ((280.46 + 0.9856474 * n) % 360 + 360) % 360;
  const meanAnomalyRad = (((357.528 + 0.9856003 * n) % 360 + 360) % 360) * DEG2RAD;

  const eclipticLongDeg =
    meanLongDeg +
    1.915 * Math.sin(meanAnomalyRad) +
    0.02 * Math.sin(2 * meanAnomalyRad);
  const eclipticLongRad = eclipticLongDeg * DEG2RAD;

  const obliquityRad = (23.439 - 0.0000004 * n) * DEG2RAD;

  const sinDecl = Math.sin(obliquityRad) * Math.sin(eclipticLongRad);
  const declinationRad = Math.asin(Math.max(-1, Math.min(1, sinDecl)));
  const declinationDeg = declinationRad * RAD2DEG;

  const raDeg =
    Math.atan2(
      Math.cos(obliquityRad) * Math.sin(eclipticLongRad),
      Math.cos(eclipticLongRad)
    ) * RAD2DEG;

  const gmstDeg =
    ((280.46061837 + 360.98564736629 * n) % 360 + 360) % 360;

  const longitudeDeg = ((((raDeg - gmstDeg) % 360) + 540) % 360) - 180;

  return {
    timestampMs,
    declinationDeg,
    longitudeDeg,
    sinDecl: Math.sin(declinationRad),
    cosDecl: Math.cos(declinationRad),
  };
}

/**
 * Returns the real-time solar elevation angle in degrees (-90° .. +90°) at [latDeg, lngDeg].
 * Standard sunrise/sunset (with atmospheric refraction) occurs at -0.833°.
 */
export function getSolarAltitudeDeg(
  latDeg: number,
  lngDeg: number,
  subsolarOrTime: SubsolarPoint | number = Date.now()
): number {
  const sub =
    typeof subsolarOrTime === 'number'
      ? computeSubsolarPoint(subsolarOrTime)
      : subsolarOrTime;

  const latRad = latDeg * DEG2RAD;
  const hourAngleRad = (lngDeg - sub.longitudeDeg) * DEG2RAD;
  const sinAlt =
    Math.sin(latRad) * sub.sinDecl +
    Math.cos(latRad) * sub.cosDecl * Math.cos(hourAngleRad);

  return Math.asin(Math.max(-1, Math.min(1, sinAlt))) * RAD2DEG;
}

/**
 * Returns true if the sun is below the refractive horizon (-0.833°) at [latDeg, lngDeg].
 */
export function isNightAtCoords(
  latDeg: number,
  lngDeg: number,
  subsolarOrTime: SubsolarPoint | number = Date.now()
): boolean {
  return getSolarAltitudeDeg(latDeg, lngDeg, subsolarOrTime) <= -0.833;
}

/**
 * Computes the continuous geographic Day/Night terminator curve across [-360°, +360°] longitude.
 */
export function computeTerminatorCurveLatLngs(
  subsolar: SubsolarPoint,
  stepDeg = 1.5
): [number, number][] {
  const pts: [number, number][] = [];
  const safeSinDecl =
    Math.abs(subsolar.sinDecl) < 1e-4
      ? subsolar.sinDecl >= 0
        ? 1e-4
        : -1e-4
      : subsolar.sinDecl;
  const tanDecl = safeSinDecl / subsolar.cosDecl;

  for (let lng = -360; lng <= 360; lng += stepDeg) {
    const dLngRad = (lng - subsolar.longitudeDeg) * DEG2RAD;
    const latRad = Math.atan(-Math.cos(dLngRad) / tanDecl);
    const latDeg = Math.max(-85, Math.min(85, latRad * RAD2DEG));
    pts.push([latDeg, lng]);
  }
  return pts;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Maps solar altitude angle (degrees) to translucent RGBA shadow / twilight tint:
 *  - > +1.2°        : 100% clear daylight (alpha 0)
 *  - +1.2° .. -0.83°: warm golden horizon scattering
 *  - -0.83° .. -6°  : civil twilight
 *  - -6° .. -12°    : nautical twilight
 *  - -12° .. -18°   : astronomical twilight
 *  - <= -18°        : deep translucent indigo night (keeps map labels & borders crisp)
 */
function sampleTerminatorRgba(altDeg: number): [number, number, number, number] {
  if (altDeg >= 1.4) {
    return [0, 0, 0, 0];
  }

  if (altDeg > -0.833) {
    // Subtle warm sunset/sunrise glow right on the horizon
    const k = smoothstep(1.4, -0.833, altDeg);
    const r = Math.round(180 * (1 - k * 0.82));
    const g = Math.round(115 * (1 - k * 0.72));
    const b = Math.round(35 + k * 42);
    const a = Math.round(k * 28);
    return [r, g, b, a];
  }

  if (altDeg > -6) {
    // Civil twilight (-0.833° -> -6°)
    const k = smoothstep(-0.833, -6, altDeg);
    return [
      Math.round(28 - k * 16),
      Math.round(32 - k * 6),
      Math.round(74 - k * 12),
      Math.round(28 + k * 44), // 28 -> 72
    ];
  }

  if (altDeg > -12) {
    // Nautical twilight (-6° -> -12°)
    const k = smoothstep(-6, -12, altDeg);
    return [
      Math.round(12 - k * 4),
      Math.round(26 - k * 6),
      Math.round(62 - k * 10),
      Math.round(72 + k * 34), // 72 -> 106
    ];
  }

  if (altDeg > -18) {
    // Astronomical twilight (-12° -> -18°)
    const k = smoothstep(-12, -18, altDeg);
    return [
      Math.round(8 - k * 3),
      Math.round(20 - k * 5),
      Math.round(52 - k * 10),
      Math.round(106 + k * 20), // 106 -> 126
    ];
  }

  // Deep astronomical night (<= -18°)
  const deepK = smoothstep(-18, -48, altDeg);
  return [5, 14, 40, Math.round(126 + deepK * 12)]; // 126 -> 138 (~0.49 - 0.54 alpha)
}

function tileYToLatRad(yTileFloat: number, zPow: number): number {
  const n = Math.PI - (2 * Math.PI * yTileFloat) / zPow;
  return Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

/**
 * Attaches a real-time astronomical Day/Night Solar Terminator overlay to a Leaflet map:
 *  1. High-speed bilinear Web Mercator GridLayer painting true solar altitude twilight & night zones
 *  2. Crisp golden sunset/sunrise Terminator curve across the globe
 *  3. Subsolar Sun zenith indicator visible at global / continental zoom
 * Refreshes automatically every 60 seconds.
 */
export function attachSolarTerminatorOverlay(map: L.Map): () => void {
  const shadePaneName = 'solarTerminatorShadePane';
  if (!map.getPane(shadePaneName)) {
    const pane = map.createPane(shadePaneName);
    pane.style.zIndex = '225';
    pane.style.pointerEvents = 'none';
  }

  const linePaneName = 'solarTerminatorLinePane';
  if (!map.getPane(linePaneName)) {
    const pane = map.createPane(linePaneName);
    pane.style.zIndex = '235';
    pane.style.pointerEvents = 'none';
  }

  let currentSubsolar = computeSubsolarPoint(Date.now());
  const SAMPLE = 64;

  const TerminatorGridLayer = L.GridLayer.extend({
    createTile(coords: L.Coords): HTMLElement {
      const tile = document.createElement('canvas');
      tile.width = 256;
      tile.height = 256;

      const offscreen = document.createElement('canvas');
      offscreen.width = SAMPLE;
      offscreen.height = SAMPLE;
      const offCtx = offscreen.getContext('2d');
      const ctx = tile.getContext('2d');
      if (!offCtx || !ctx) return tile;

      const zPow = Math.pow(2, coords.z);
      const img = offCtx.createImageData(SAMPLE, SAMPLE);
      const data = img.data;

      const sinLats = new Float64Array(SAMPLE);
      const cosLats = new Float64Array(SAMPLE);
      for (let py = 0; py < SAMPLE; py++) {
        const yFloat = coords.y + (py + 0.5) / SAMPLE;
        const latRad = tileYToLatRad(yFloat, zPow);
        sinLats[py] = Math.sin(latRad);
        cosLats[py] = Math.cos(latRad);
      }

      const cosHourAngles = new Float64Array(SAMPLE);
      for (let px = 0; px < SAMPLE; px++) {
        const xFloat = coords.x + (px + 0.5) / SAMPLE;
        const lngDeg = (xFloat / zPow) * 360 - 180;
        const hRad = (lngDeg - currentSubsolar.longitudeDeg) * DEG2RAD;
        cosHourAngles[px] = Math.cos(hRad);
      }

      let offset = 0;
      for (let py = 0; py < SAMPLE; py++) {
        const sLat = sinLats[py] * currentSubsolar.sinDecl;
        const cLat = cosLats[py] * currentSubsolar.cosDecl;
        for (let px = 0; px < SAMPLE; px++) {
          const sinAlt = sLat + cLat * cosHourAngles[px];
          const altDeg =
            Math.asin(sinAlt < -1 ? -1 : sinAlt > 1 ? 1 : sinAlt) * RAD2DEG;
          const [r, g, b, a] = sampleTerminatorRgba(altDeg);
          data[offset] = r;
          data[offset + 1] = g;
          data[offset + 2] = b;
          data[offset + 3] = a;
          offset += 4;
        }
      }

      offCtx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(offscreen, 0, 0, 256, 256);
      return tile;
    },
  });

  const gridLayer: L.GridLayer = new (TerminatorGridLayer as unknown as new (
    opts?: L.GridLayerOptions
  ) => L.GridLayer)({
    pane: shadePaneName,
    tileSize: 256,
    opacity: 1,
    updateWhenZooming: false,
    updateWhenIdle: false,
    keepBuffer: 2,
  });
  gridLayer.addTo(map);

  const lineGroup = L.layerGroup([], { pane: linePaneName }).addTo(map);

  const renderTerminatorVectors = () => {
    lineGroup.clearLayers();
    const curvePts = computeTerminatorCurveLatLngs(currentSubsolar, 1.5);

    // Soft atmospheric amber glow along the sunset/sunrise horizon
    L.polyline(curvePts, {
      pane: linePaneName,
      color: 'rgba(245, 158, 11, 0.24)',
      weight: 6,
      lineCap: 'round',
      lineJoin: 'round',
      interactive: false,
    }).addTo(lineGroup);

    // Crisp golden terminator line (0° horizon)
    L.polyline(curvePts, {
      pane: linePaneName,
      color: 'rgba(251, 191, 36, 0.82)',
      weight: 1.6,
      dashArray: '5 4',
      lineCap: 'round',
      lineJoin: 'round',
      interactive: false,
    }).addTo(lineGroup);

    // Subsolar Sun zenith marker across wrapped world copies (-360, 0, +360)
    const zoom = map.getZoom();
    if (zoom <= 5) {
      const sunHtml = `
        <div style="
          transform:translate(-50%, -50%);
          display:inline-flex;
          align-items:center;
          justify-content:center;
          width:24px;
          height:24px;
          border-radius:9999px;
          background:radial-gradient(circle, rgba(254,243,199,0.98) 0%, rgba(245,158,11,0.92) 60%, rgba(245,158,11,0) 100%);
          box-shadow:0 0 16px rgba(251, 191, 36, 0.85);
          pointer-events:none;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="5" fill="#FFFBEB"/>
            <g stroke="#FFFBEB" stroke-width="2" stroke-linecap="round">
              <line x1="12" y1="2" x2="12" y2="4.5"/>
              <line x1="12" y1="19.5" x2="12" y2="22"/>
              <line x1="2" y1="12" x2="4.5" y2="12"/>
              <line x1="19.5" y1="12" x2="22" y2="12"/>
              <line x1="4.9" y1="4.9" x2="6.7" y2="6.7"/>
              <line x1="17.3" y1="17.3" x2="19.1" y2="19.1"/>
              <line x1="19.1" y1="4.9" x2="17.3" y2="6.7"/>
              <line x1="6.7" y1="17.3" x2="4.9" y2="19.1"/>
            </g>
          </svg>
        </div>
      `;
      const sunIcon = L.divIcon({
        className: 'solar-zenith-marker',
        html: sunHtml,
        iconSize: [0, 0],
      });

      [-360, 0, 360].forEach((wrapOffset) => {
        L.marker(
          [currentSubsolar.declinationDeg, currentSubsolar.longitudeDeg + wrapOffset],
          {
            icon: sunIcon,
            interactive: false,
            pane: linePaneName,
          }
        ).addTo(lineGroup);
      });
    }
  };

  renderTerminatorVectors();
  map.on('zoomend', renderTerminatorVectors);

  const refreshTimer = setInterval(() => {
    if (typeof document !== 'undefined' && document.hidden) return;
    currentSubsolar = computeSubsolarPoint(Date.now());
    gridLayer.redraw();
    renderTerminatorVectors();
  }, 60_000);

  return () => {
    clearInterval(refreshTimer);
    map.off('zoomend', renderTerminatorVectors);
    try {
      map.removeLayer(gridLayer);
      map.removeLayer(lineGroup);
    } catch {
      // ignore if map already destroyed
    }
  };
}
