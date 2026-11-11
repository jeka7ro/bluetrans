import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  MapPin,
  ExternalLink,
  Navigation,
  Check,
  LocateFixed,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { formatCountryBadge } from '../data/mockData';

export interface GoogleMapsPlaceSuggestion {
  id: string;
  city: string;
  countryCode: string;
  fullAddress: string;
  hubName: string;
  highwayExit: string;
  lat: number;
  lng: number;
}

export const EUROPEAN_LOGISTICS_PLACES: GoogleMapsPlaceSuggestion[] = [
  {
    id: 'ro-oradea-1',
    city: 'Oradea',
    countryCode: 'RO',
    fullAddress: 'Calea Borșului 45, 410605 Oradea, România',
    hubName: 'Baza Logistică Frigo Blue Trans Spedition',
    highwayExit: 'A3 / DN1 · Punct Trecere Borș II',
    lat: 47.0722,
    lng: 21.8831,
  },
  {
    id: 'ro-cluj-1',
    city: 'Cluj-Napoca',
    countryCode: 'RO',
    fullAddress: 'Str. Bulevardul Muncii 18, 400641 Cluj-Napoca, România',
    hubName: 'Parc Industrial Tetarom III · Depozit Frigo',
    highwayExit: 'A3 Transilvania / E60',
    lat: 46.7884,
    lng: 23.6558,
  },
  {
    id: 'ro-timisoara-1',
    city: 'Timișoara',
    countryCode: 'RO',
    fullAddress: 'Calea Șagului 201, 300516 Timișoara, România',
    hubName: 'CTPark Timișoara South · Hub Logistic',
    highwayExit: 'A1 / E70 Giarmata',
    lat: 45.7125,
    lng: 21.1984,
  },
  {
    id: 'ro-arad-1',
    city: 'Arad',
    countryCode: 'RO',
    fullAddress: 'Zona Industrială Vest, Str. III Nr. 8, 310491 Arad, România',
    hubName: 'Terminal Cross-Dock Nădlac / Arad Vest',
    highwayExit: 'A1 · Punct Trecere Nădlac II',
    lat: 46.1951,
    lng: 21.268,
  },
  {
    id: 'ro-bucuresti-1',
    city: 'București',
    countryCode: 'RO',
    fullAddress: 'Autostrada București-Pitești Km 23, 087015 Bolintin-Deal, România',
    hubName: 'CTPark Bucharest West · Depozit Frigo Z1/Z2',
    highwayExit: 'A1 Km 23 / Centura A0',
    lat: 44.442,
    lng: 25.829,
  },
  {
    id: 'hu-szolnok-1',
    city: 'Szolnok',
    countryCode: 'HU',
    fullAddress: 'Piroskai út 12, 5000 Szolnok, Ungaria',
    hubName: 'MeatPack Hungary & Frigo Logistics Park',
    highwayExit: 'M4 / E60 Szolnok-Észak',
    lat: 47.1753,
    lng: 20.1812,
  },
  {
    id: 'hu-budapesta-1',
    city: 'Budapesta',
    countryCode: 'HU',
    fullAddress: 'BILK Logisztikai Központ, Európa u. 6, 1239 Budapest, Ungaria',
    hubName: 'Budapest Intermodal Logistics Center (BILK)',
    highwayExit: 'M0 / M1 / M5 Soroksár',
    lat: 47.3894,
    lng: 19.1242,
  },
  {
    id: 'at-viena-1',
    city: 'Viena',
    countryCode: 'AT',
    fullAddress: 'IZ NÖ-Süd Straße 14, 2355 Wiener Neudorf, Austria',
    hubName: 'Agrana & REWE Frigo Terminal Viena Sud',
    highwayExit: 'A2 / S1 Knoten Vösendorf',
    lat: 48.0845,
    lng: 16.3218,
  },
  {
    id: 'at-suben-1',
    city: 'Suben',
    countryCode: 'AT',
    fullAddress: 'Suben 85, 4975 Suben, Austria',
    hubName: 'Autohof & Cross-Dock Terminal Suben (AT/DE)',
    highwayExit: 'A8 Innkreis Autobahn · Exit 1',
    lat: 48.4041,
    lng: 13.4315,
  },
  {
    id: 'de-munchen-1',
    city: 'München',
    countryCode: 'DE',
    fullAddress: 'Am Moosfeld 11, 81829 München, Germania',
    hubName: 'Frischezentrum & Nagel-Group Frigo München',
    highwayExit: 'A99 / A94 München-Riem',
    lat: 48.1351,
    lng: 11.6682,
  },
  {
    id: 'de-stuttgart-1',
    city: 'Stuttgart',
    countryCode: 'DE',
    fullAddress: 'kornwestheimer Str. 44, 70825 Korntal-Münchingen (Stuttgart), Germania',
    hubName: 'GVZ Region Stuttgart · Terminal Refrigerate',
    highwayExit: 'A81 Exit 17 Stuttgart-Zuffenhausen',
    lat: 48.8354,
    lng: 9.1422,
  },
  {
    id: 'de-frankfurt-1',
    city: 'Frankfurt',
    countryCode: 'DE',
    fullAddress: 'CargoCity Süd, Gebäude 537, 60549 Frankfurt am Main, Germania',
    hubName: 'Nagel-Group Cross-Dock Frigo Frankfurt-Süd',
    highwayExit: 'A3 / A5 Frankfurter Kreuz',
    lat: 50.0265,
    lng: 8.5431,
  },
  {
    id: 'de-koln-1',
    city: 'Köln',
    countryCode: 'DE',
    fullAddress: 'Am Eifeltor 5, 50997 Köln, Germania',
    hubName: 'DUSS & Frigo Hub Köln-Eifeltor',
    highwayExit: 'A4 Exit 11b Köln-Klettenberg',
    lat: 50.8924,
    lng: 6.9128,
  },
  {
    id: 'de-hamburg-1',
    city: 'Hamburg',
    countryCode: 'DE',
    fullAddress: 'Alternwerder Hauptdeich 7, 21129 Hamburg, Germania',
    hubName: 'Hafen Hamburg · Kühlhaus & Container Terminal',
    highwayExit: 'A7 Exit 30 Hamburg-Waltershof',
    lat: 53.5211,
    lng: 9.9142,
  },
  {
    id: 'nl-rotterdam-1',
    city: 'Rotterdam',
    countryCode: 'NL',
    fullAddress: 'Waalhaven Oostzijde 85, 3087 BM Rotterdam, Olanda',
    hubName: 'Unilever & Cool Port Rotterdam Frigo Terminal',
    highwayExit: 'A15 Exit 19a Rotterdam-Waalhaven',
    lat: 51.8842,
    lng: 4.4321,
  },
  {
    id: 'nl-almere-1',
    city: 'Almere',
    countryCode: 'NL',
    fullAddress: 'Damsluisweg 42, 1332 ED Almere, Olanda',
    hubName: 'Bakker Logistiek Cold Store Almere',
    highwayExit: 'A6 Exit 6 Almere-Buiten',
    lat: 52.3982,
    lng: 5.2741,
  },
  {
    id: 'nl-venlo-1',
    city: 'Venlo',
    countryCode: 'NL',
    fullAddress: 'Venlo Trade Port, Columbusweg 30, 5928 LA Venlo, Olanda',
    hubName: 'Fresh Park Venlo · Hub Horticol & Frigo',
    highwayExit: 'A67 / A73 Zaarderheiken',
    lat: 51.3912,
    lng: 6.1245,
  },
  {
    id: 'se-stockholm-1',
    city: 'Stockholm',
    countryCode: 'SE',
    fullAddress: 'Grossistvägen 10, 120 44 Årsta (Stockholm), Suedia',
    hubName: 'Årsta Partihallar · Arla & ICA Frigo Hub',
    highwayExit: 'E4 / E20 Årstaberg',
    lat: 59.2945,
    lng: 18.0312,
  },
  {
    id: 'se-goteborg-1',
    city: 'Göteborg',
    countryCode: 'SE',
    fullAddress: 'Ytterhamnsmotet 4, 418 78 Göteborg, Suedia',
    hubName: 'Port of Gothenburg · Nordic Cold Chain Terminal',
    highwayExit: 'E6 / Rv155 Arendal',
    lat: 57.6952,
    lng: 11.8324,
  },
  {
    id: 'be-bruxelles-1',
    city: 'Bruxelles',
    countryCode: 'BE',
    fullAddress: 'Werkhuizenkaai 22, 1000 Bruxelles, Belgia',
    hubName: 'Mabru · European Fresh Center Brussels',
    highwayExit: 'R0 / A12 Bruxelles-Nord',
    lat: 50.8732,
    lng: 4.3612,
  },
];

// Doar Europa (rutele camioanelor): casetă geografică + coduri de țară europene
const EUROPE_BBOX = '-11,34,45,72';
const EUROPE_COUNTRY_CODES = new Set([
  'AL','AD','AT','BY','BE','BA','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IS','IE','IT','XK','LV','LI',
  'LT','LU','MT','MD','MC','ME','NL','MK','NO','PL','PT','RO','RU','SM','RS','SK','SI','ES','SE','CH','TR','UA','GB','VA',
]);

export function normalizePlaceKey(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/ł/g, 'l')
    .replace(/ø/g, 'o')
    .replace(/đ/g, 'd')
    .trim();
}

const LEARNED_PLACE_COORDS = new Map<string, [number, number]>(
  EUROPEAN_LOGISTICS_PLACES.flatMap((p) => {
    const coords: [number, number] = [p.lat, p.lng];
    return [
      [normalizePlaceKey(p.city), coords],
      [normalizePlaceKey(p.fullAddress), coords],
    ];
  })
);

export function registerLearnedPlaceCoords(place: {
  city: string;
  fullAddress?: string;
  lat: number;
  lng: number;
}): void {
  if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return;
  const coords: [number, number] = [place.lat, place.lng];
  const cityKey = normalizePlaceKey(place.city);
  if (cityKey) LEARNED_PLACE_COORDS.set(cityKey, coords);
  if (place.fullAddress) {
    const addrKey = normalizePlaceKey(place.fullAddress);
    if (addrKey) LEARNED_PLACE_COORDS.set(addrKey, coords);
  }
}

export function lookupLearnedPlaceCoords(rawText: string): [number, number] | null {
  const q = normalizePlaceKey(rawText);
  if (!q) return null;
  const direct = LEARNED_PLACE_COORDS.get(q);
  if (direct) return direct;
  const firstSegment = normalizePlaceKey(rawText.split(/[,(]/)[0] || '');
  if (firstSegment && LEARNED_PLACE_COORDS.has(firstSegment)) {
    return LEARNED_PLACE_COORDS.get(firstSegment)!;
  }
  return null;
}

export interface DetectedUserGpsLocation extends GoogleMapsPlaceSuggestion {
  accuracyMeters: number;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Identifies the user's current physical location using the browser Geolocation API
 * (must be invoked from an explicit user click gesture) and reverse-geocodes it
 * to a street/city address in Romanian.
 */
export async function detectCurrentUserGpsPlace(): Promise<DetectedUserGpsLocation> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    throw new Error(
      'Browserul curent nu suportă localizarea GPS (navigator.geolocation).'
    );
  }

  const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    });
  }).catch((err: unknown) => {
    const geoErr = err as { code?: number };
    if (geoErr?.code === 1) {
      throw new Error(
        'Accesul la locație este blocat în browser. Permite „Locație” din pictograma din stânga barei de adresă pentru a te localiza automat.'
      );
    }
    if (geoErr?.code === 2) {
      throw new Error(
        'Poziția GPS / Wi-Fi nu a putut fi determinată momentan (verifică Serviciile de Localizare din sistem).'
      );
    }
    if (geoErr?.code === 3) {
      throw new Error(
        'Timpul de identificare GPS a expirat. Apasă din nou pe „Unde sunt”.'
      );
    }
    throw new Error('Nu am putut prelua poziția GPS curentă.');
  });

  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;
  const accuracyMeters = Math.max(5, Math.round(pos.coords.accuracy || 25));

  // 1. Primary Reverse Geocoding via OpenStreetMap Nominatim (Romanian labels)
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=ro`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (res.ok) {
      const data: any = await res.json();
      const addr = data?.address || {};
      const city =
        addr.city ||
        addr.town ||
        addr.municipality ||
        addr.village ||
        addr.suburb ||
        addr.county ||
        'Locația mea';
      const countryCode = String(addr.country_code || 'RO').toUpperCase();
      const roadPart = addr.road
        ? `${addr.road}${addr.house_number ? ` ${addr.house_number}` : ''}`
        : '';
      const postcodePart = addr.postcode ? `${addr.postcode} ` : '';
      const countryName = addr.country || countryCode;
      const fullAddress = [
        roadPart,
        `${postcodePart}${city}`.trim(),
        countryName,
      ]
        .filter(Boolean)
        .join(', ');

      const resolved: DetectedUserGpsLocation = {
        id: `gps-${lat.toFixed(4)}-${lng.toFixed(4)}`,
        city,
        countryCode,
        fullAddress: fullAddress || `${city} (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        hubName: data?.name || roadPart || 'Locația ta curentă (GPS Live)',
        highwayExit: `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)} (±${accuracyMeters}m)`,
        lat,
        lng,
        accuracyMeters,
      };
      registerLearnedPlaceCoords(resolved);
      return resolved;
    }
  } catch {
    // Fall through to Photon reverse geocoder
  }

  // 2. Secondary Reverse Geocoding via Photon Komoot
  try {
    const res = await fetch(
      `https://photon.komoot.io/reverse?lon=${lng}&lat=${lat}`,
      { signal: AbortSignal.timeout(3500) }
    );
    if (res.ok) {
      const data: any = await res.json();
      const feat = data?.features?.[0];
      if (feat?.properties) {
        const p = feat.properties;
        const city = p.city || p.town || p.locality || p.name || 'Locația mea';
        const countryCode = String(p.countrycode || 'RO').toUpperCase();
        const street = p.street
          ? `${p.street}${p.housenumber ? ` ${p.housenumber}` : ''}, `
          : '';
        const fullAddress = `${street}${p.postcode ? `${p.postcode} ` : ''}${city}, ${p.country || countryCode}`;
        const resolved: DetectedUserGpsLocation = {
          id: `gps-photon-${lat.toFixed(4)}-${lng.toFixed(4)}`,
          city,
          countryCode,
          fullAddress,
          hubName: p.name || 'Locația ta curentă (GPS Live)',
          highwayExit: `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)} (±${accuracyMeters}m)`,
          lat,
          lng,
          accuracyMeters,
        };
        registerLearnedPlaceCoords(resolved);
        return resolved;
      }
    }
  } catch {
    // Fall through to nearest European city + raw GPS coordinates
  }

  // 3. Offline Fallback: nearest known hub + exact GPS coordinates
  let nearest = EUROPEAN_LOGISTICS_PLACES[0];
  let bestDist = Infinity;
  for (const hub of EUROPEAN_LOGISTICS_PLACES) {
    const d = haversineKm(lat, lng, hub.lat, hub.lng);
    if (d < bestDist) {
      bestDist = d;
      nearest = hub;
    }
  }
  const cityLabel =
    bestDist <= 35 ? nearest.city : `GPS ${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  const fallback: DetectedUserGpsLocation = {
    id: `gps-offline-${lat.toFixed(4)}-${lng.toFixed(4)}`,
    city: cityLabel,
    countryCode: bestDist <= 120 ? nearest.countryCode : 'RO',
    fullAddress:
      bestDist <= 35
        ? `Lângă ${nearest.city} · GPS ${lat.toFixed(5)}, ${lng.toFixed(5)} (±${accuracyMeters}m)`
        : `Coordonate GPS ${lat.toFixed(5)}, ${lng.toFixed(5)} (±${accuracyMeters}m)`,
    hubName: 'Poziție GPS identificată local',
    highwayExit: `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    lat,
    lng,
    accuracyMeters,
  };
  registerLearnedPlaceCoords(fallback);
  return fallback;
}

interface GoogleMapsAddressInputProps {
  label?: string;
  value: string;
  onChange: (newValue: string) => void;
  onSelectPlace?: (place: GoogleMapsPlaceSuggestion) => void;
  placeholder?: string;
  useFullAddress?: boolean;
  required?: boolean;
  className?: string;
}

export const GoogleMapsAddressInput: React.FC<GoogleMapsAddressInputProps> = ({
  label,
  value,
  onChange,
  onSelectPlace,
  placeholder = 'Caută oraș, stradă, cod poștal sau hub (Google Maps)...',
  useFullAddress = false,
  required = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [remoteSuggestions, setRemoteSuggestions] = useState<GoogleMapsPlaceSuggestion[]>([]);
  const [selectedAddressDetail, setSelectedAddressDetail] = useState<string>('');
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownBox, setDropdownBox] = useState<{ left: number; top: number; width: number } | null>(null);

  const handleDetectMyLocation = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLocatingGps) return;
    setIsLocatingGps(true);
    setGpsError(null);
    setIsOpen(false);
    try {
      const place = await detectCurrentUserGpsPlace();
      const nextVal = useFullAddress
        ? `${place.city} (${place.fullAddress})`
        : place.city;
      onChange(nextVal);
      setSelectedAddressDetail(`${place.fullAddress} · ±${place.accuracyMeters}m GPS`);
      onSelectPlace?.(place);
    } catch (err) {
      setGpsError(
        err instanceof Error
          ? err.message
          : 'Nu am putut identifica poziția curentă.'
      );
    } finally {
      setIsLocatingGps(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !(dropdownRef.current && dropdownRef.current.contains(target))
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lista de sugestii se afișează deasupra ferestrei (portal), ca să nu fie tăiată sau să acopere alte câmpuri
  useLayoutEffect(() => {
    if (!isOpen) return;
    const update = () => {
      const el = inputWrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const width = Math.max(r.width, 340);
      const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
      setDropdownBox({ left, top: r.bottom + 4, width });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [isOpen, value]);

  // Filter built-in European hubs immediately
  const query = value.trim().toLowerCase();
  const localMatches = EUROPEAN_LOGISTICS_PLACES.filter(
    (p) =>
      !query ||
      p.city.toLowerCase().includes(query) ||
      p.fullAddress.toLowerCase().includes(query) ||
      p.hubName.toLowerCase().includes(query) ||
      p.countryCode.toLowerCase().includes(query)
  ).slice(0, 6);

  // Live Geocoding fallback via Photon API for any arbitrary street/address in Europe
  useEffect(() => {
    if (query.length < 3) {
      setRemoteSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(value)}&limit=6&bbox=${EUROPE_BBOX}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data?.features)) return;

        const mapped: GoogleMapsPlaceSuggestion[] = data.features
          .filter((f: any) =>
            EUROPE_COUNTRY_CODES.has(String(f?.properties?.countrycode || '').toUpperCase())
          )
          .slice(0, 4)
          .map(
          (f: any, idx: number) => {
            const props = f.properties || {};
            const coords = f.geometry?.coordinates || [16.37, 48.2];
            const city =
              props.city || props.town || props.name || props.state || value;
            const countryCode = (props.countrycode || 'EU').toUpperCase();
            const street = props.street
              ? `${props.street}${props.housenumber ? ' ' + props.housenumber : ''}, `
              : '';
            const postcode = props.postcode ? `${props.postcode} ` : '';
            const fullAddress = `${street}${postcode}${city}, ${props.country || countryCode}`;
            return {
              id: `photon-${idx}-${city}`,
              city,
              countryCode,
              fullAddress,
              hubName: props.name || `Adresă verificată Google Maps`,
              highwayExit: `GPS: ${coords[1].toFixed(4)}, ${coords[0].toFixed(4)}`,
              lat: coords[1],
              lng: coords[0],
            };
          }
        );
        mapped.forEach((m) => registerLearnedPlaceCoords(m));
        setRemoteSuggestions(mapped);
      } catch {
        // Offline or network blocked: localMatches still work 100%
      }
    }, 260);

    return () => clearTimeout(timer);
  }, [value, query]);

  const combinedSuggestions = [
    ...localMatches,
    ...remoteSuggestions.filter(
      (r) =>
        !localMatches.some(
          (l) => l.city.toLowerCase() === r.city.toLowerCase()
        )
    ),
  ].slice(0, 7);

  const matchedHub = EUROPEAN_LOGISTICS_PLACES.find(
    (p) =>
      p.city.toLowerCase() === query ||
      p.fullAddress.toLowerCase() === query
  );

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    matchedHub ? matchedHub.fullAddress : value || 'Oradea Romania'
  )}`;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <div className="flex items-center justify-between gap-1 mb-1">
          <label className="block font-bold text-white/80 text-xs shrink-0">
            {label}
          </label>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleDetectMyLocation}
              disabled={isLocatingGps}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#0A84FF]/15 hover:bg-[#0A84FF]/25 border border-[#0A84FF]/35 text-[9.5px] font-extrabold text-[#64D2FF] transition cursor-pointer disabled:opacity-60 whitespace-nowrap"
              title="Identifică automat unde ești acum (GPS / Locația mea)"
            >
              {isLocatingGps ? (
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
              ) : (
                <LocateFixed className="w-2.5 h-2.5" />
              )}
              <span>{isLocatingGps ? 'GPS...' : 'Unde sunt'}</span>
            </button>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-0.5 text-[9.5px] font-bold text-[#0284c7] hover:underline shrink-0 whitespace-nowrap"
              title="Deschide locația exactă în Google Maps"
            >
              <span>Harta</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      )}

      <div className="relative flex items-center" ref={inputWrapRef}>
        <span
          className="absolute left-2.5 z-10 pointer-events-none flex items-center justify-center w-5 h-5 rounded-full"
          style={{ backgroundColor: 'rgba(234, 67, 53, 0.14)' }}
        >
          <MapPin className="w-3.5 h-3.5" style={{ color: '#EA4335' }} />
        </span>

        <input
          type="text"
          required={required}
          value={value}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setGpsError(null);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full tahoe-card-inner rounded-full pl-9 pr-14 py-2 text-xs text-white font-semibold border border-white/15 focus:outline-none focus:border-[#0A84FF]"
        />

        <div className="absolute right-1.5 z-10 flex items-center gap-0.5">
          <button
            type="button"
            onClick={handleDetectMyLocation}
            disabled={isLocatingGps}
            aria-label={`Identifică locația mea curentă pentru ${label || 'adresă'}`}
            title="Identifică unde sunt acum (GPS)"
            className="p-1 rounded-full hover:bg-[#0A84FF]/20 text-[#0A84FF] transition cursor-pointer disabled:opacity-50"
          >
            {isLocatingGps ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LocateFixed className="w-3.5 h-3.5" />
            )}
          </button>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded-full hover:bg-white/10 text-[#0284c7]"
            title="Vezi pe Google Maps"
          >
            <Navigation className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* GPS Error message if browser location permission is off */}
      {gpsError && (
        <div
          role="alert"
          className="mt-1 flex items-start gap-1 text-[10px] text-amber-400 font-semibold leading-snug"
        >
          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
          <span>{gpsError}</span>
        </div>
      )}

      {/* Subtitle showing resolved street address / hub from Google Maps */}
      {(matchedHub || selectedAddressDetail) && (
        <div className="mt-1 flex items-center gap-1 text-[10px] text-white/60 truncate">
          <Check className="w-3 h-3 text-[#16a34a] shrink-0" />
          <span className="truncate">
            {matchedHub ? matchedHub.fullAddress : selectedAddressDetail}
          </span>
        </div>
      )}

      {/* Autocomplete Suggestions Dropdown */}
      {isOpen && combinedSuggestions.length > 0 && dropdownBox &&
        createPortal(
        <div
          ref={dropdownRef}
          className="rounded-2xl border border-slate-300/80 shadow-2xl overflow-hidden max-h-60 overflow-y-auto"
          style={{
            position: 'fixed',
            left: dropdownBox.left,
            top: dropdownBox.top,
            width: dropdownBox.width,
            zIndex: 10050,
            backgroundColor: '#ffffff',
            color: '#0f172a',
          }}
        >
          <div
            className="px-3 py-1.5 border-b border-slate-200 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider"
            style={{ backgroundColor: '#f1f5f9', color: '#475569' }}
          >
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" style={{ color: '#EA4335' }} />
              Sugestii Adrese & Hub-uri Google Maps
            </span>
            <span>UE · HGV</span>
          </div>

          <div className="divide-y divide-slate-100">
            {combinedSuggestions.map((place) => (
              <button
                key={place.id}
                type="button"
                onClick={() => {
                  registerLearnedPlaceCoords(place);
                  const nextVal = useFullAddress
                    ? `${place.city} (${place.fullAddress})`
                    : place.city;
                  onChange(nextVal);
                  setSelectedAddressDetail(place.fullAddress);
                  if (onSelectPlace) {
                    onSelectPlace(place);
                  }
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-sky-50 transition flex items-start gap-2 cursor-pointer"
              >
                <span
                  className="mt-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-black shrink-0"
                  style={{ backgroundColor: '#003399', color: '#ffffff' }}
                >
                  {formatCountryBadge(place.countryCode)}
                </span>
                <div className="min-w-0 flex-1">
                  <div
                    className="text-xs font-extrabold truncate"
                    style={{ color: '#0f172a' }}
                  >
                    {place.city} —{' '}
                    <span
                      className="font-semibold"
                      style={{ color: '#0284c7' }}
                    >
                      {place.hubName}
                    </span>
                  </div>
                  <div
                    className="text-[10.5px] truncate"
                    style={{ color: '#475569' }}
                  >
                    {place.fullAddress}
                  </div>
                  <div
                    className="text-[9.5px] font-semibold"
                    style={{ color: '#64748b' }}
                  >
                    {place.highwayExit}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
