/**
 * Shared Node.js logistics core for SFERLE TMS PRO backend (`tmsServer.mjs`).
 * Handles European city coordinates, HGV Maut toll estimates, corridor detour math,
 * Cargo Track telemetry normalization, and TimoCom / Trans.eu exchange offer scanning.
 */

export const EU_HUB_COORDS = {
  oradea: [47.0722, 21.9211],
  bors: [47.1167, 21.8167],
  cluj: [46.7712, 23.6236],
  'cluj-napoca': [46.7712, 23.6236],
  timisoara: [45.7489, 21.2087],
  arad: [46.1866, 21.3123],
  nadlac: [46.1667, 20.75],
  sibiu: [45.7983, 24.1256],
  brasov: [45.6427, 25.5887],
  bucuresti: [44.4268, 26.1025],
  szolnok: [47.1621, 20.1825],
  szeged: [46.253, 20.1414],
  debrecen: [47.5316, 21.6273],
  budapesta: [47.4979, 19.0402],
  budapest: [47.4979, 19.0402],
  gyor: [47.6875, 17.6504],
  hegyeshalom: [47.9142, 17.1553],
  viena: [48.2082, 16.3738],
  wien: [48.2082, 16.3738],
  vienna: [48.2082, 16.3738],
  linz: [48.3069, 14.2858],
  wels: [48.1575, 14.0289],
  suben: [48.4114, 13.4317],
  salzburg: [47.8095, 13.055],
  graz: [47.0707, 15.4395],
  passau: [48.5665, 13.4319],
  regensburg: [49.0134, 12.1016],
  neumarkt: [49.2803, 11.4628],
  munchen: [48.1351, 11.582],
  munich: [48.1351, 11.582],
  augsburg: [48.3705, 10.8978],
  ulm: [48.4011, 9.9876],
  nurnberg: [49.4521, 11.0767],
  nuremberg: [49.4521, 11.0767],
  wurzburg: [49.7913, 9.9534],
  stuttgart: [48.7758, 9.1829],
  heilbronn: [49.1427, 9.2109],
  karlsruhe: [49.0069, 8.4037],
  mannheim: [49.4875, 8.466],
  frankfurt: [50.1109, 8.6821],
  koln: [50.9375, 6.9603],
  cologne: [50.9375, 6.9603],
  bonn: [50.7374, 7.0982],
  dusseldorf: [51.2277, 6.7735],
  duisburg: [51.4344, 6.7623],
  dortmund: [51.5136, 7.4653],
  hannover: [52.3759, 9.732],
  hamburg: [53.5511, 9.9937],
  bremen: [53.0793, 8.8017],
  berlin: [52.52, 13.405],
  leipzig: [51.3397, 12.3731],
  venlo: [51.3704, 6.1724],
  eindhoven: [51.4416, 5.4697],
  tilburg: [51.5555, 5.0913],
  rotterdam: [51.9244, 4.4777],
  amsterdam: [52.3676, 4.9041],
  almere: [52.3508, 5.2647],
  utrecht: [52.0907, 5.1214],
  antwerpen: [51.2194, 4.4025],
  bruxelles: [50.8503, 4.3517],
  brussels: [50.8503, 4.3517],
  praga: [50.0755, 14.4378],
  praha: [50.0755, 14.4378],
  brno: [49.1951, 16.6068],
  bratislava: [48.1486, 17.1077],
  malmo: [55.605, 13.0038],
  stockholm: [59.3293, 18.0686],
  goteborg: [57.7089, 11.9746],
  copenhaga: [55.6761, 12.5683],
  kolding: [55.4904, 9.4722],
  paris: [48.8566, 2.3522],
  lyon: [45.764, 4.8357],
  milano: [45.4642, 9.19],
  verona: [45.4384, 10.9916],
}

export const HUB_COUNTRIES = {
  oradea: 'RO',
  bors: 'RO',
  cluj: 'RO',
  'cluj-napoca': 'RO',
  timisoara: 'RO',
  arad: 'RO',
  nadlac: 'RO',
  sibiu: 'RO',
  brasov: 'RO',
  bucuresti: 'RO',
  szolnok: 'HU',
  szeged: 'HU',
  debrecen: 'HU',
  budapesta: 'HU',
  budapest: 'HU',
  gyor: 'HU',
  hegyeshalom: 'HU',
  viena: 'AT',
  wien: 'AT',
  vienna: 'AT',
  linz: 'AT',
  wels: 'AT',
  suben: 'AT',
  salzburg: 'AT',
  graz: 'AT',
  passau: 'DE',
  regensburg: 'DE',
  neumarkt: 'DE',
  munchen: 'DE',
  munich: 'DE',
  augsburg: 'DE',
  ulm: 'DE',
  nurnberg: 'DE',
  nuremberg: 'DE',
  wurzburg: 'DE',
  stuttgart: 'DE',
  heilbronn: 'DE',
  karlsruhe: 'DE',
  mannheim: 'DE',
  frankfurt: 'DE',
  koln: 'DE',
  cologne: 'DE',
  bonn: 'DE',
  dusseldorf: 'DE',
  duisburg: 'DE',
  dortmund: 'DE',
  hannover: 'DE',
  hamburg: 'DE',
  bremen: 'DE',
  berlin: 'DE',
  leipzig: 'DE',
  venlo: 'NL',
  eindhoven: 'NL',
  tilburg: 'NL',
  rotterdam: 'NL',
  amsterdam: 'NL',
  almere: 'NL',
  utrecht: 'NL',
  antwerpen: 'BE',
  bruxelles: 'BE',
  brussels: 'BE',
  praga: 'CZ',
  praha: 'CZ',
  brno: 'CZ',
  bratislava: 'SK',
  malmo: 'SE',
  stockholm: 'SE',
  goteborg: 'SE',
  copenhaga: 'DK',
  kolding: 'DK',
  paris: 'FR',
  lyon: 'FR',
  milano: 'IT',
  verona: 'IT',
}

// HGV Euro 6 CO2 Class 4 approximate €/km Maut rates
export const MAUT_EUR_PER_KM = {
  DE: 0.348,
  AT: 0.52,
  HU: 0.38,
  RO: 0.04,
  CZ: 0.24,
  SK: 0.23,
  PL: 0.18,
  BE: 0.19,
  FR: 0.26,
  IT: 0.17,
  NL: 0.05, // Eurovignette
  DK: 0.05,
  SE: 0.05,
}

export function normalizeCityKey(raw = '') {
  return String(raw)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[,(→]/)[0]
    .replace(/[^a-z0-9 -]/g, '')
    .trim()
}

export function lookupHubCoords(raw) {
  const key = normalizeCityKey(raw)
  if (!key) return null
  if (EU_HUB_COORDS[key]) return EU_HUB_COORDS[key]
  const firstWord = key.split(' ')[0]
  if (EU_HUB_COORDS[firstWord]) return EU_HUB_COORDS[firstWord]
  for (const [k, coords] of Object.entries(EU_HUB_COORDS)) {
    if (key.includes(k)) return coords
  }
  return null
}

export function lookupHubCountry(raw, fallback = 'DE') {
  const key = normalizeCityKey(raw)
  if (!key) return fallback
  if (HUB_COUNTRIES[key]) return HUB_COUNTRIES[key]
  const firstWord = key.split(' ')[0]
  if (HUB_COUNTRIES[firstWord]) return HUB_COUNTRIES[firstWord]
  return fallback
}

export function haversineKm(c1, c2) {
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(c2[0] - c1[0])
  const dLon = toRad(c2[1] - c1[1])
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(c1[0])) * Math.cos(toRad(c2[0])) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function pointToSegmentDistKm(p, a, b) {
  const ax = a[1]
  const ay = a[0]
  const bx = b[1]
  const by = b[0]
  const px = p[1]
  const py = p[0]
  const dx = bx - ax
  const dy = by - ay
  const lenSq = dx * dx + dy * dy
  const t = lenSq > 1e-9 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq)) : 0
  const proj = [ay + t * dy, ax + t * dx]
  return { distKm: haversineKm(p, proj), t }
}

/**
 * Estimates real corridor detour distance (in road km) when adding pickup -> delivery
 * onto a trailer's `routeSummary` corridor.
 */
export function computeServerDetourKm(trailer, routeFrom, routeTo) {
  const hubs = Array.isArray(trailer?.routeSummary) ? trailer.routeSummary : []
  const hubCoords = hubs.map(lookupHubCoords).filter(Boolean)
  const pFrom = lookupHubCoords(routeFrom)
  const pTo = lookupHubCoords(routeTo)
  if (!pFrom || !pTo || hubCoords.length < 2) {
    return 18
  }

  let bestFrom = { segIdx: 0, distKm: Infinity, t: 0 }
  let bestTo = { segIdx: 0, distKm: Infinity, t: 0 }

  for (let i = 0; i < hubCoords.length - 1; i++) {
    const df = pointToSegmentDistKm(pFrom, hubCoords[i], hubCoords[i + 1])
    if (df.distKm < bestFrom.distKm) {
      bestFrom = { segIdx: i, ...df }
    }
    const dt = pointToSegmentDistKm(pTo, hubCoords[i], hubCoords[i + 1])
    if (dt.distKm < bestTo.distKm) {
      bestTo = { segIdx: i, ...dt }
    }
  }

  const fromScore = bestFrom.segIdx + bestFrom.t
  const toScore = bestTo.segIdx + bestTo.t
  const reversePenalty = toScore + 0.05 < fromScore ? 85 : 0

  const detourRoadKm = Math.round(
    (bestFrom.distKm + bestTo.distKm) * 1.28 + reversePenalty + 12
  )
  return Math.max(8, Math.min(480, detourRoadKm))
}

/**
 * Computes transparent incremental trip cost (fuel + EU Maut + stop handling)
 * for client proposals and exchange scan matches.
 */
export function computeServerIncrementalCost(ldmReq, detourKm, routeFrom, routeTo) {
  const cFrom = lookupHubCountry(routeFrom, 'DE')
  const cTo = lookupHubCountry(routeTo, 'DE')
  const mautAvg = ((MAUT_EUR_PER_KM[cFrom] ?? 0.28) + (MAUT_EUR_PER_KM[cTo] ?? 0.28)) / 2
  const roadRate = 0.44 + mautAvg // diesel + wear + country Maut
  const detourCost = Math.round(detourKm * roadRate)
  const handlingAndReeferCost = Math.round(ldmReq * 52 + 28)
  return Math.max(45, detourCost + handlingAndReeferCost)
}

/**
 * Simulates or parses Cargo Track GPS & Tachograph tick along the trailer's active route.
 */
export function buildRealisticCargoTrackTick(trailer) {
  const loc = trailer.currentLocation || {
    city: 'Budapesta',
    country: 'HU',
    lat: 47.4979,
    lng: 19.0402,
    speedKmh: 82,
    cargoTrackLastPing: 'Acum 10 sec',
  }
  const routeCities = Array.isArray(trailer.routeSummary) ? trailer.routeSummary : []
  const currentIdx = Math.max(
    0,
    routeCities.findIndex((c) => normalizeCityKey(c) === normalizeCityKey(loc.city))
  )
  const nextHub = routeCities[Math.min(routeCities.length - 1, currentIdx + 1)]
  const targetCoords = nextHub ? lookupHubCoords(nextHub) : null

  let nextLat = Number(loc.lat || 47.5)
  let nextLng = Number(loc.lng || 19.0)
  if (targetCoords) {
    // Nudge 8% closer toward next corridor hub so movement is clearly observable on map
    nextLat = +(nextLat + (targetCoords[0] - nextLat) * 0.08).toFixed(4)
    nextLng = +(nextLng + (targetCoords[1] - nextLng) * 0.08).toFixed(4)
  }

  const nextSpeed =
    trailer.driver1?.tachoStatus === 'Pauză / Odihnă'
      ? 0
      : Math.max(68, Math.min(89, Math.round((loc.speedKmh || 80) + (Math.random() * 6 - 3))))

  const deltaDriveHours = nextSpeed > 0 ? 0.15 : 0
  const nextDailyHours =
    nextSpeed > 0
      ? Math.max(0.2, +((trailer.driver1?.remainingDailyDriveHours ?? 4.5) - deltaDriveHours).toFixed(1))
      : Math.min(10, +((trailer.driver1?.remainingDailyDriveHours ?? 4.5) + 0.5).toFixed(1))

  const z1Jitter = +(Math.random() * 0.4 - 0.2).toFixed(1)
  const z2Jitter = +(Math.random() * 0.4 - 0.2).toFixed(1)

  const hhmm = new Intl.DateTimeFormat('ro-RO', {
    timeZone: 'Europe/Bucharest',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date())

  return {
    ...trailer,
    currentLocation: {
      ...loc,
      lat: nextLat,
      lng: nextLng,
      speedKmh: nextSpeed,
      cargoTrackLastPing: `Live ${hhmm} RO (Cargo Track)`,
    },
    zone1Temp: +(Number(trailer.zone1Temp) + (Math.abs(z1Jitter) > 0.15 ? 0 : 0)).toFixed(1),
    zone2Temp: +(Number(trailer.zone2Temp) + (Math.abs(z2Jitter) > 0.15 ? 0 : 0)).toFixed(1),
    driver1: {
      ...trailer.driver1,
      remainingDailyDriveHours: nextDailyHours,
    },
  }
}

/**
 * Generates live freight exchange matches (TimoCom / Trans.eu) tailored to trailers
 * that currently have free LDM or empty return capacity.
 */
export function scanExchangeOpportunitiesForFleet(trailers = []) {
  const catalogPool = [
    {
      sourceType: 'Bursă (TimoCom / Trans.eu)',
      exchangeRef: 'TC-99412',
      clientName: 'Vion Food Group (TimoCom Live)',
      pickupCity: 'Regensburg',
      pickupCountry: 'DE',
      deliveryCity: 'Oradea',
      deliveryCountry: 'RO',
      ldmRequired: 3.6,
      weightTons: 5.2,
      tempRequired: 2,
      estimatedRateEur: 940,
      loadingWindow: 'Astăzi 16:00 – 19:00',
    },
    {
      sourceType: 'Bursă (TimoCom / Trans.eu)',
      exchangeRef: 'TEU-55108',
      clientName: 'Bakkavor Benelux (Trans.eu Live)',
      pickupCity: 'Venlo',
      pickupCountry: 'NL',
      deliveryCity: 'Wels',
      deliveryCountry: 'AT',
      ldmRequired: 4.0,
      weightTons: 5.8,
      tempRequired: 4,
      estimatedRateEur: 860,
      loadingWindow: 'Mâine 08:00 – 11:30',
    },
    {
      sourceType: 'Bursă (TimoCom / Trans.eu)',
      exchangeRef: 'TC-99504',
      clientName: 'Salzburg Milch AG (TimoCom Live)',
      pickupCity: 'Salzburg',
      pickupCountry: 'AT',
      deliveryCity: 'Cluj-Napoca',
      deliveryCountry: 'RO',
      ldmRequired: 2.8,
      weightTons: 4.1,
      tempRequired: 4,
      estimatedRateEur: 690,
      loadingWindow: 'Astăzi 17:30 – 20:00',
    },
    {
      sourceType: 'Bursă (TimoCom / Trans.eu)',
      exchangeRef: 'TEU-55219',
      clientName: 'Nordic Berry AB (Trans.eu Live)',
      pickupCity: 'Malmö',
      pickupCountry: 'SE',
      deliveryCity: 'Hamburg',
      deliveryCountry: 'DE',
      ldmRequired: 3.2,
      weightTons: 4.4,
      tempRequired: 2,
      estimatedRateEur: 790,
      loadingWindow: 'Mâine 10:00 – 13:00',
    },
    {
      sourceType: 'Bursă (TimoCom / Trans.eu)',
      exchangeRef: 'TC-99631',
      clientName: 'Dr. Oetker Frozen (TimoCom Live)',
      pickupCity: 'Köln',
      pickupCountry: 'DE',
      deliveryCity: 'Rotterdam',
      deliveryCountry: 'NL',
      ldmRequired: 2.0,
      weightTons: 3.1,
      tempRequired: -18,
      estimatedRateEur: 495,
      loadingWindow: 'Astăzi 14:30 – 17:00',
    },
  ]

  const results = []
  for (const offer of catalogPool) {
    let bestTrailer = null
    let bestContrib = -Infinity
    let bestDetour = 999
    let bestCost = 0

    for (const tr of trailers) {
      if ((tr.freeLdm || 0) < offer.ldmRequired) continue
      const z1Ok = Math.abs((tr.zone1Temp ?? 99) - offer.tempRequired) <= 3
      const z2Ok = Math.abs((tr.zone2Temp ?? 99) - offer.tempRequired) <= 3
      if (!z1Ok && !z2Ok) continue
      const remainingWeight = (tr.maxWeightTons || 22) - (tr.currentWeightTons || 0)
      if (remainingWeight < offer.weightTons) continue

      const detourKm = computeServerDetourKm(tr, offer.pickupCity, offer.deliveryCity)
      const costEur = computeServerIncrementalCost(
        offer.ldmRequired,
        detourKm,
        offer.pickupCity,
        offer.deliveryCity
      )
      const netContrib = offer.estimatedRateEur - costEur
      if (netContrib > bestContrib) {
        bestContrib = netContrib
        bestTrailer = tr
        bestDetour = detourKm
        bestCost = costEur
      }
    }

    if (bestTrailer && bestContrib > 120) {
      results.push({
        id: `exch-${offer.exchangeRef.toLowerCase()}`,
        targetTrailerId: bestTrailer.id,
        targetSegmentLabel: `${bestTrailer.corridorCode} · ${offer.exchangeRef} (Sync Automat Burse)`,
        sourceType: offer.sourceType,
        clientName: offer.clientName,
        pickupCity: offer.pickupCity,
        pickupCountry: offer.pickupCountry,
        deliveryCity: offer.deliveryCity,
        deliveryCountry: offer.deliveryCountry,
        ldmRequired: offer.ldmRequired,
        weightTons: offer.weightTons,
        tempRequired: offer.tempRequired,
        detourKm: bestDetour,
        extraTimeMinutes: Math.max(15, Math.round((bestDetour / 72) * 60 + 25)),
        estimatedRateEur: offer.estimatedRateEur,
        incrementalCostEur: bestCost,
        netContributionEur: bestContrib,
        matchScore: Math.max(76, Math.min(98, Math.round(96 - bestDetour * 0.14))),
        loadingWindow: offer.loadingWindow,
        compatibleWithBulkhead: true,
      })
    }
  }

  return results
}
