/**
 * Build HGV-aware Google Maps links, 40T truck transit calculations, and GPX exports.
 * Note: Google Maps public URL API only supports passenger-car `travelmode=driving` and does not
 * enforce truck height/weight restrictions natively. We therefore pin European 40T motorway hubs
 * and border crossings as mandatory waypoints AND provide a `.gpx` truck corridor export for
 * dedicated HGV navigation apps (Garmin dezl, TomTom GO Expert, Sygic Truck, OsmAnd).
 */

export interface HgvVehicleProfile {
  isHgv: boolean;
  label: string;
  shortBadge: string;
  specsLabel: string;
  avgSpeedKmh: number;
  googleMapsWarningRo: string;
}

export interface HgvRouteMetrics {
  distanceKm: number;
  effectiveAvgKmh: number;
  pureDriveHours: number;
  shortBreaksCount: number;
  shortBreakMinutesTotal: number;
  dailyRestsCount: number;
  dailyRestHoursTotal: number;
  totalElapsedHours: number;
  compactDriveLabel: string;
  tachoBreakdownRo: string;
}

export interface GoogleMapsDirectionsOptions {
  hgv?: boolean;
}

export const DEFAULT_HGV_40T_PROFILE: HgvVehicleProfile = {
  isHgv: true,
  label: 'Camion 40T (HGV)',
  shortBadge: 'Camion 40T · H 4.0m',
  specsLabel: 'Camion 40T · H 4.0m · L 16.5m · l 2.55m · Vit. med. 73 km/h + CE 561',
  avgSpeedKmh: 73,
  googleMapsWarningRo:
    'Google Maps calculează doar cu profil autoturism (fără limite de înălțime/tonaj) — ruta include punctele obligatorii de autostradă HGV; verifică indicatoarele >7.5t & H 4.0m sau descarcă GPX Camion.',
};

export function resolveHgvVehicleProfile(
  totalLdm = 13.6
): HgvVehicleProfile {
  if (totalLdm > 0 && totalLdm <= 6.2) {
    return {
      isHgv: false,
      label: 'Utilitară Express',
      shortBadge: 'Express ≤7.5t',
      specsLabel: 'Utilitară ≤7.5t · Vit. med. 86 km/h',
      avgSpeedKmh: 86,
      googleMapsWarningRo:
        'Profil vehicul ușor / express (până în 7.5t). Verifică accesul local la rampă.',
    };
  }
  return DEFAULT_HGV_40T_PROFILE;
}

/**
 * Calculates real 40T truck drive duration & mandatory CE 561/2006 breaks
 * rather than passenger car speeds.
 */
export function computeHgvRouteMetrics(
  distanceKm: number,
  options?: { isHgv?: boolean; isDoubleCrew?: boolean }
): HgvRouteMetrics {
  const safeKm = Math.max(0, Math.round(distanceKm));
  const isHgv = options?.isHgv !== false;
  const isDoubleCrew = Boolean(options?.isDoubleCrew);
  const effectiveAvgKmh = isHgv ? 73 : 86;

  if (safeKm === 0) {
    return {
      distanceKm: 0,
      effectiveAvgKmh,
      pureDriveHours: 0,
      shortBreaksCount: 0,
      shortBreakMinutesTotal: 0,
      dailyRestsCount: 0,
      dailyRestHoursTotal: 0,
      totalElapsedHours: 0,
      compactDriveLabel: '0h 00m HGV',
      tachoBreakdownRo: isHgv ? '0h condus · Regim 40T' : '0h condus',
    };
  }

  const pureDriveHours = safeKm / effectiveAvgKmh;
  const shortBreaksCount = isHgv
    ? Math.floor(Math.max(0, pureDriveHours - 0.08) / 4.5)
    : 0;
  const shortBreakMinutesTotal = shortBreaksCount * 45;
  const maxDailyDriveHours = isDoubleCrew ? 18 : 9;
  const dailyRestDurationHours = isDoubleCrew ? 9 : 11;
  const dailyRestsCount = isHgv
    ? Math.floor(Math.max(0, pureDriveHours - 0.08) / maxDailyDriveHours)
    : 0;
  const dailyRestHoursTotal = dailyRestsCount * dailyRestDurationHours;
  const totalElapsedHours =
    pureDriveHours + shortBreakMinutesTotal / 60 + dailyRestHoursTotal;

  const drvH = Math.floor(pureDriveHours);
  const drvM = Math.round((pureDriveHours - drvH) * 60);
  const normH = drvM === 60 ? drvH + 1 : drvH;
  const normM = drvM === 60 ? 0 : drvM;
  const driveClock = `${normH}h ${String(normM).padStart(2, '0')}m`;

  let compactDriveLabel = `${driveClock} ${isHgv ? 'HGV' : 'est.'}`;
  if (isHgv && dailyRestsCount > 0) {
    compactDriveLabel = `${driveClock} condus (+${shortBreakMinutesTotal}m & ${dailyRestsCount}×repaus CE)`;
  } else if (isHgv && shortBreaksCount > 0) {
    compactDriveLabel = `${driveClock} condus (+${shortBreakMinutesTotal}m CE)`;
  }

  const partsRo: string[] = [
    `${driveClock} volan (${effectiveAvgKmh} km/h)`,
  ];
  if (shortBreaksCount > 0) {
    partsRo.push(`${shortBreaksCount}×45m pauză CE`);
  }
  if (dailyRestsCount > 0) {
    partsRo.push(`${dailyRestsCount}×${dailyRestDurationHours}h repaus zilnic`);
  }

  return {
    distanceKm: safeKm,
    effectiveAvgKmh,
    pureDriveHours: +pureDriveHours.toFixed(1),
    shortBreaksCount,
    shortBreakMinutesTotal,
    dailyRestsCount,
    dailyRestHoursTotal,
    totalElapsedHours: +totalElapsedHours.toFixed(1),
    compactDriveLabel,
    tachoBreakdownRo: partsRo.join(' + '),
  };
}

export function splitRouteStops(routeLabel = ''): string[] {
  return String(routeLabel || '')
    .split(/\s*(?:→|->)\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeCityToken(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isDetailedStreetAddress(stop: string): boolean {
  return (
    /\d/.test(stop) ||
    /\b(str|strada|calea|bd|bulevard|allee|straße|strasse|weg|laan|avenue|industrial|parc|logist|dc|warehouse|terminal|rampa)\b/i.test(
      stop
    )
  );
}

const HGV_RING_ROAD_ALIASES: Record<string, string> = {
  budapesta: 'Budapesta M0 Centură, Ungaria',
  budapest: 'Budapest M0 Ring, Hungary',
  viena: 'Viena S1 / A4, Austria',
  vienna: 'Vienna S1 / A4, Austria',
  wien: 'Wien S1 / A4, Austria',
  bucuresti: 'București Centură DNCB / A1, România',
  bucharest: 'Bucharest A0 / DNCB, Romania',
  arad: 'Arad Centură A1, România',
  sibiu: 'Sibiu Centură A1, România',
  koln: 'Köln A3 / A4 Kreuz Ost, Germania',
  cologne: 'Köln A3 / A4 Kreuz Ost, Germania',
  nurnberg: 'Nürnberg A3 Kreuz, Germania',
  nuremberg: 'Nürnberg A3 Kreuz, Germania',
  frankfurt: 'Frankfurt A3 Frankfurter Kreuz, Germania',
  munchen: 'München A99 Ost, Germania',
  munich: 'München A99 Ost, Germania',
  hamburg: 'Hamburg A1, Germania',
  stuttgart: 'Stuttgart A8, Germania',
  dusseldorf: 'Düsseldorf A3 / A46, Germania',
  duisburg: 'Duisburg A3 / A40, Germania',
  berlin: 'Berlin A10 Ring, Germania',
  praga: 'Praga D0 Ring, Cehia',
  prague: 'Prague D0 Ring, Czechia',
  brno: 'Brno D1 / D2, Cehia',
  graz: 'Graz A2 / A9, Austria',
  linz: 'Linz A1 / A7, Austria',
  ljubljana: 'Ljubljana A1 / A2 Ring, Slovenia',
};

function inferCountryTag(token: string): string {
  if (/(oradea|arad|timisoara|cluj|sibiu|brasov|bucuresti|iasi|constanta|ploiesti|pitesti|craiova|bors|nadlac|\bro\b|romania)/i.test(token)) {
    return 'RO';
  }
  if (/(budapesta|budapest|gyor|debrecen|szeged|\bhu\b|ungaria|hungary)/i.test(token)) {
    return 'HU';
  }
  if (/(viena|vienna|wien|graz|linz|salzburg|nickelsdorf|suben|\bat\b|austria)/i.test(token)) {
    return 'AT';
  }
  if (/(munchen|munich|nurnberg|frankfurt|koln|dusseldorf|duisburg|hamburg|bremen|berlin|stuttgart|passau|\bde\b|germania|germany)/i.test(token)) {
    return 'DE';
  }
  if (/(rotterdam|venlo|amsterdam|utrecht|eindhoven|\bnl\b|olanda|netherlands)/i.test(token)) {
    return 'NL';
  }
  if (/(stockholm|goteborg|malmo|jonkoping|\bse\b|suedia|sweden)/i.test(token)) {
    return 'SE';
  }
  if (/(kolding|odense|copenhagen|kobenhavn|oresund|\bdk\b|danemarca|denmark)/i.test(token)) {
    return 'DK';
  }
  if (/(milano|verona|bologna|roma|trieste|torino|\bit\b|italia|italy)/i.test(token)) {
    return 'IT';
  }
  if (/(ljubljana|maribor|koper|\bsi\b|slovenia)/i.test(token)) {
    return 'SI';
  }
  if (/(praga|prague|brno|\bcz\b|cehia|czech)/i.test(token)) {
    return 'CZ';
  }
  return '';
}

function getTransitionHgvWaypoints(fromStop: string, toStop: string): string[] {
  const fromTok = normalizeCityToken(fromStop);
  const toTok = normalizeCityToken(toStop);
  const fromCountry = inferCountryTag(fromTok);
  const toCountry = inferCountryTag(toTok);

  if (!fromCountry || !toCountry || fromCountry === toCountry) {
    return [];
  }

  const injected: string[] = [];

  // Romania <-> Hungary / West EU
  if (fromCountry === 'RO' && ['HU', 'AT', 'DE', 'NL', 'CZ', 'SE', 'DK', 'SI', 'IT'].includes(toCountry)) {
    const usesSouthernRo = /(arad|timisoara|sibiu|brasov|bucuresti|ploiesti|pitesti|craiova|constanta)/.test(fromTok);
    injected.push(usesSouthernRo ? 'Nădlac II A1 Border, România' : 'Borș II A3 Border, România');
    if (toCountry !== 'HU') {
      injected.push('Budapesta M0 Centură, Ungaria');
    }
  } else if (toCountry === 'RO' && ['HU', 'AT', 'DE', 'NL', 'CZ', 'SE', 'DK', 'SI', 'IT'].includes(fromCountry)) {
    if (fromCountry !== 'HU') {
      injected.push('Budapesta M0 Centură, Ungaria');
    }
    const usesSouthernRo = /(arad|timisoara|sibiu|brasov|bucuresti|ploiesti|pitesti|craiova|constanta)/.test(toTok);
    injected.push(usesSouthernRo ? 'Nădlac II A1 Border, România' : 'Borș II A3 Border, România');
  }

  // HU <-> AT / DE / NL
  if (
    (['RO', 'HU'].includes(fromCountry) && ['AT', 'DE', 'NL'].includes(toCountry)) ||
    (['AT', 'DE', 'NL'].includes(fromCountry) && ['RO', 'HU'].includes(toCountry))
  ) {
    injected.push('Nickelsdorf A4, Austria');
  }

  // AT / HU / RO <-> DE / NL (Danube / Passau A8-A3 HGV axis)
  if (
    (['RO', 'HU', 'AT'].includes(fromCountry) && ['DE', 'NL'].includes(toCountry)) ||
    (['DE', 'NL'].includes(fromCountry) && ['RO', 'HU', 'AT'].includes(toCountry))
  ) {
    injected.push('Passau A3, Germania');
  }

  // DE <-> NL
  if (
    (fromCountry === 'DE' || fromCountry === 'AT' || fromCountry === 'HU' || fromCountry === 'RO') &&
    toCountry === 'NL'
  ) {
    injected.push('Venlo A67, Olanda');
  } else if (fromCountry === 'NL' && ['DE', 'AT', 'HU', 'RO'].includes(toCountry)) {
    injected.push('Venlo A67, Olanda');
  }

  // DE <-> DK / SE
  if (
    (['RO', 'HU', 'AT', 'DE'].includes(fromCountry) && ['DK', 'SE'].includes(toCountry)) ||
    (['DK', 'SE'].includes(fromCountry) && ['RO', 'HU', 'AT', 'DE'].includes(toCountry))
  ) {
    injected.push('Kolding E45, Danemarca');
  }

  // Reverse transit if going Eastbound
  if (['NL', 'DE', 'AT', 'SE', 'DK'].includes(fromCountry) && ['RO', 'HU'].includes(toCountry)) {
    return injected.reverse();
  }

  return injected;
}

/**
 * Enhances intermediate stops with European 40T motorway ring-roads & mandatory border crossings
 * while capping cleanly to <= 8 waypoints so Google Maps never truncates the route.
 */
export function buildHgvCorridorWaypoints(
  origin: string,
  destination: string,
  waypoints: string[] = []
): string[] {
  const fullChain = [origin, ...waypoints, destination]
    .map((s) => String(s || '').trim())
    .filter(Boolean);

  if (fullChain.length < 2) return [];

  const result: string[] = [];
  const seenKeys = new Set<string>([
    normalizeCityToken(origin),
    normalizeCityToken(destination),
  ]);

  const tryPush = (candidate: string) => {
    const tok = normalizeCityToken(candidate);
    if (!tok || seenKeys.has(tok) || result.length >= 8) return;
    seenKeys.add(tok);
    result.push(candidate);
  };

  for (let i = 0; i < fullChain.length - 1; i++) {
    const cur = fullChain[i];
    const next = fullChain[i + 1];

    // If `cur` itself is an intermediate city stop (i > 0), resolve to HGV ring-road when bare
    if (i > 0) {
      const curTok = normalizeCityToken(cur);
      const cityLookupKey = curTok.split(',')[0].trim();
      const ringAlias = !isDetailedStreetAddress(cur)
        ? HGV_RING_ROAD_ALIASES[cityLookupKey] || HGV_RING_ROAD_ALIASES[curTok]
        : undefined;
      tryPush(ringAlias || cur);
    }

    // Add mandatory cross-border HGV corridor checkpoints between `cur` -> `next`
    const borderWaypoints = getTransitionHgvWaypoints(cur, next);
    for (const bw of borderWaypoints) {
      const baseTok = normalizeCityToken(bw.split(',')[0]);
      // Avoid duplicating if the explicit stop list already includes that hub
      const alreadyMentioned = fullChain.some((s) =>
        normalizeCityToken(s).includes(baseTok.split(' ')[0])
      );
      if (!alreadyMentioned || bw.includes('A3') || bw.includes('A1') || bw.includes('A4') || bw.includes('A67')) {
        tryPush(bw);
      }
    }
  }

  return result.slice(0, 8);
}

export function buildGoogleMapsPlaceUrl(addressOrCity: string): string {
  const clean = String(addressOrCity || '').trim() || 'Oradea';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clean)}`;
}

export function buildGoogleMapsDirectionsUrl(
  origin: string,
  destination: string,
  waypoints: string[] = [],
  options?: GoogleMapsDirectionsOptions
): string {
  const cleanOrigin = String(origin || '').trim() || 'Oradea';
  const cleanDest = String(destination || '').trim() || cleanOrigin;
  const rawWaypoints = waypoints
    .map((w) => String(w || '').trim())
    .filter((w) => w && w !== cleanOrigin && w !== cleanDest);

  const isHgv = options?.hgv !== false;
  const finalWaypoints = isHgv
    ? buildHgvCorridorWaypoints(cleanOrigin, cleanDest, rawWaypoints)
    : rawWaypoints.slice(0, 8);

  const params = new URLSearchParams({
    api: '1',
    origin: cleanOrigin,
    destination: cleanDest,
    travelmode: 'driving',
  });
  if (finalWaypoints.length > 0) {
    params.set('waypoints', finalWaypoints.join('|'));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export interface GpxCheckpointInput {
  city: string;
  country?: string;
  coords: [number, number];
  cumKm?: number;
}

function escapeXml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates an RFC-compliant GPX 1.1 truck route file from Blue Trans OSRM highway polylines
 * for Garmin dezl, TomTom GO Expert, Sygic Truck, or OsmAnd HGV navigation.
 */
export function buildTruckCorridorGpxXml(
  routeTitle: string,
  coordinates: [number, number][],
  checkpoints: GpxCheckpointInput[] = [],
  profileNote = 'Camion 40T · H 4.0m · L 16.5m · Coridor aprobat HGV Blue Trans'
): string {
  const isoNow = new Date().toISOString();
  const wptsXml = checkpoints
    .map(
      (cp) =>
        `  <wpt lat="${cp.coords[0].toFixed(6)}" lon="${cp.coords[1].toFixed(
          6
        )}">\n    <name>${escapeXml(
          cp.country ? `${cp.city} (${cp.country})` : cp.city
        )}</name>\n    <desc>${escapeXml(
          cp.cumKm !== undefined ? `${cp.cumKm} km · ${profileNote}` : profileNote
        )}</desc>\n  </wpt>`
    )
    .join('\n');

  const trackPtsXml = coordinates
    .map(
      (pt) =>
        `      <trkpt lat="${pt[0].toFixed(6)}" lon="${pt[1].toFixed(6)}" />`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Blue Trans TMS Pro — HGV 40T" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(routeTitle)}</name>
    <desc>${escapeXml(profileNote)}</desc>
    <time>${isoNow}</time>
  </metadata>
${wptsXml}
  <trk>
    <name>${escapeXml(routeTitle)}</name>
    <desc>${escapeXml(profileNote)}</desc>
    <trkseg>
${trackPtsXml}
    </trkseg>
  </trk>
</gpx>
`;
}

export function downloadTruckCorridorGpx(
  fileBaseName: string,
  routeTitle: string,
  coordinates: [number, number][],
  checkpoints: GpxCheckpointInput[] = []
): void {
  if (typeof window === 'undefined' || coordinates.length < 2) return;
  const gpxXml = buildTruckCorridorGpxXml(routeTitle, coordinates, checkpoints);
  const blob = new Blob([gpxXml], { type: 'application/gpx+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const safeName = fileBaseName
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName || 'coridor-camion-40t'}.gpx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

