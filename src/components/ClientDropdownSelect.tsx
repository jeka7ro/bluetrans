import React, { useState, useEffect, useRef } from 'react';
import { Building2, ChevronDown, Plus, Check } from 'lucide-react';
import { formatCountryBadge } from '../data/mockData';

export interface SavedClientRecord {
  id: string;
  name: string;
  countryCode: string;
  vatCode: string;
  defaultFromCity: string;
  defaultToCity: string;
  defaultTemp: number;
  defaultLdm: number;
  defaultWeightTons: number;
  cargoCategory: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  rateEurPerKm?: number;
  rateEurPerLdm?: number;
  paymentTermDays?: number;
}

const CLIENTS_STORAGE_KEY = 'bluetrans_tms_saved_clients_v1';

export const DEFAULT_SAVED_CLIENTS: SavedClientRecord[] = [
  {
    id: 'cli-1',
    name: 'Agrana Fruit Central',
    countryCode: 'AT',
    vatCode: 'ATU19482105',
    defaultFromCity: 'Viena',
    defaultToCity: 'Rotterdam',
    defaultTemp: 4,
    defaultLdm: 4.2,
    defaultWeightTons: 5.6,
    cargoCategory: 'Fructe & Preparate Refrigerate',
  },
  {
    id: 'cli-2',
    name: 'Unilever Frozen',
    countryCode: 'NL',
    vatCode: 'NL001492811B01',
    defaultFromCity: 'Oradea',
    defaultToCity: 'Rotterdam',
    defaultTemp: -18,
    defaultLdm: 5.2,
    defaultWeightTons: 9.8,
    cargoCategory: 'Produse Congelate Z1 (-18°C)',
  },
  {
    id: 'cli-3',
    name: 'TERASSA FRIGO',
    countryCode: 'NL',
    vatCode: 'NL810294812B01',
    defaultFromCity: 'Viena',
    defaultToCity: 'Rotterdam',
    defaultTemp: -1,
    defaultLdm: 4.2,
    defaultWeightTons: 6.3,
    cargoCategory: 'Grupaj Frigo Controlat',
  },
  {
    id: 'cli-4',
    name: 'LEMMER FLORA',
    countryCode: 'NL',
    vatCode: 'NL823910442B01',
    defaultFromCity: 'Rotterdam',
    defaultToCity: 'Stockholm',
    defaultTemp: 4,
    defaultLdm: 6.8,
    defaultWeightTons: 9.4,
    cargoCategory: 'Flori & Plante (+4°C)',
  },
  {
    id: 'cli-5',
    name: 'Transilvania Lactate',
    countryCode: 'RO',
    vatCode: 'RO14829104',
    defaultFromCity: 'Cluj-Napoca',
    defaultToCity: 'München',
    defaultTemp: 4,
    defaultLdm: 6.8,
    defaultWeightTons: 11.4,
    cargoCategory: 'Lactate & Brânzeturi Bi-Temp',
  },
  {
    id: 'cli-6',
    name: 'MeatPack Hungary',
    countryCode: 'HU',
    vatCode: 'HU10948215',
    defaultFromCity: 'Szolnok',
    defaultToCity: 'Almere',
    defaultTemp: -20,
    defaultLdm: 6.8,
    defaultWeightTons: 12.4,
    cargoCategory: 'Carne Congelată (-20°C)',
  },
  {
    id: 'cli-7',
    name: 'Danone Fresh RO',
    countryCode: 'RO',
    vatCode: 'RO9812410',
    defaultFromCity: 'Oradea',
    defaultToCity: 'Köln',
    defaultTemp: 4,
    defaultLdm: 3.0,
    defaultWeightTons: 4.5,
    cargoCategory: 'Iaurturi & Proaspete (+4°C)',
  },
  {
    id: 'cli-8',
    name: 'FrieslandCampina',
    countryCode: 'NL',
    vatCode: 'NL004192831B01',
    defaultFromCity: 'Szolnok',
    defaultToCity: 'Frankfurt',
    defaultTemp: 2,
    defaultLdm: 4.6,
    defaultWeightTons: 7.2,
    cargoCategory: 'Brânzeturi & Lactate (+2°C)',
  },
  {
    id: 'cli-9',
    name: 'Caroli Foods Bi-Temp',
    countryCode: 'RO',
    vatCode: 'RO6519284',
    defaultFromCity: 'Oradea',
    defaultToCity: 'Stuttgart',
    defaultTemp: 2,
    defaultLdm: 9.6,
    defaultWeightTons: 15.8,
    cargoCategory: 'Mezeluri & Preparate (+2°C)',
  },
  {
    id: 'cli-10',
    name: 'Bayernland eG',
    countryCode: 'DE',
    vatCode: 'DE129384102',
    defaultFromCity: 'München',
    defaultToCity: 'Almere',
    defaultTemp: 4,
    defaultLdm: 2.2,
    defaultWeightTons: 3.8,
    cargoCategory: 'Unt & Specialități Lactate',
  },
  {
    id: 'cli-11',
    name: "Nature's Pride Holland",
    countryCode: 'NL',
    vatCode: 'NL812491023B01',
    defaultFromCity: 'Rotterdam',
    defaultToCity: 'Göteborg',
    defaultTemp: 6,
    defaultLdm: 5.2,
    defaultWeightTons: 8.6,
    cargoCategory: 'Fructe Exotice & Avocado (+6°C)',
  },
  {
    id: 'cli-12',
    name: 'Arla Foods SE',
    countryCode: 'SE',
    vatCode: 'SE556579440001',
    defaultFromCity: 'Stockholm',
    defaultToCity: 'Oradea',
    defaultTemp: 4,
    defaultLdm: 10.2,
    defaultWeightTons: 12.8,
    cargoCategory: 'Retur Suedia · Lactate (+4°C)',
  },
  {
    id: 'cli-13',
    name: 'Hochland Deutschland GmbH',
    countryCode: 'DE',
    vatCode: 'DE128749104',
    defaultFromCity: 'München',
    defaultToCity: 'Oradea',
    defaultTemp: 4,
    defaultLdm: 4.0,
    defaultWeightTons: 6.4,
    cargoCategory: 'Cașcaval & Brânză Topită (+4°C)',
  },
];

export function loadSavedClients(): SavedClientRecord[] {
  try {
    const raw = localStorage.getItem(CLIENTS_STORAGE_KEY);
    if (!raw) return DEFAULT_SAVED_CLIENTS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_SAVED_CLIENTS;
}

export function saveClientToDb(newClient: SavedClientRecord): SavedClientRecord[] {
  const existing = loadSavedClients();
  const updated = [
    newClient,
    ...existing.filter(
      (c) => c.name.toLowerCase() !== newClient.name.toLowerCase()
    ),
  ];
  try {
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }
  return updated;
}

export function saveAllClientsToDb(list: SavedClientRecord[]): SavedClientRecord[] {
  try {
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore storage errors
  }
  return list;
}

interface ClientDropdownSelectProps {
  label?: string;
  value: string;
  onChange: (clientName: string) => void;
  onSelectClientRecord?: (client: SavedClientRecord) => void;
}

export const ClientDropdownSelect: React.FC<ClientDropdownSelectProps> = ({
  label = 'Client (din Baza de Clienți)',
  value,
  onChange,
  onSelectClientRecord,
}) => {
  const [clients, setClients] = useState<SavedClientRecord[]>(() =>
    loadSavedClients()
  );
  const [isOpen, setIsOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientCountry, setNewClientCountry] = useState('RO');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setAddingNew(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentClient = clients.find(
    (c) => c.name.toLowerCase() === value.trim().toLowerCase()
  );

  const filteredClients = clients.filter(
    (c) =>
      !searchFilter.trim() ||
      c.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.cargoCategory.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.countryCode.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.defaultFromCity.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.defaultToCity.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handleSaveNewClient = () => {
    const trimmed = newClientName.trim();
    if (!trimmed) return;
    const record: SavedClientRecord = {
      id: `cli-custom-${Date.now()}`,
      name: trimmed,
      countryCode: newClientCountry.toUpperCase() || 'RO',
      vatCode: `${newClientCountry.toUpperCase()}99182736`,
      defaultFromCity: 'Oradea',
      defaultToCity: 'Rotterdam',
      defaultTemp: 4,
      defaultLdm: 4.2,
      defaultWeightTons: 6.0,
      cargoCategory: 'Contract Frigo Standard',
    };
    const updated = saveClientToDb(record);
    setClients(updated);
    onChange(record.name);
    if (onSelectClientRecord) {
      onSelectClientRecord(record);
    }
    setNewClientName('');
    setAddingNew(false);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center justify-between mb-1">
        <label className="block font-bold text-white/80 text-xs">
          {label}
        </label>
        <span className="text-[10px] font-bold text-[#0284c7]">
          {clients.length} clienți în bază
        </span>
      </div>

      {/* Main Drop-List Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full tahoe-card-inner rounded-full px-3.5 py-2 text-xs text-white font-bold border border-white/15 flex items-center justify-between gap-2 cursor-pointer hover:border-[#0A84FF] transition text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="w-3.5 h-3.5 text-[#0284c7] shrink-0" />
          <span className="truncate">{value || 'Selectează client din listă...'}</span>
          {currentClient && (
            <span
              className="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold shrink-0"
              style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}
            >
              {formatCountryBadge(currentClient.countryCode)} · {currentClient.defaultFromCity} → {currentClient.defaultToCity}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-white/60 shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute left-0 right-0 top-full mt-1 z-50 rounded-2xl border border-slate-300/90 shadow-2xl overflow-hidden"
          style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
        >
          {/* Top Search & Add New Bar */}
          <div
            className="p-2 border-b border-slate-200 flex items-center gap-1.5"
            style={{ backgroundColor: '#f8fafc' }}
          >
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Caută client salvat în bază..."
              className="flex-1 rounded-full px-3 py-1.5 text-xs font-semibold border border-slate-300 focus:outline-none focus:border-[#0284c7]"
              style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
            />
            <button
              type="button"
              onClick={() => setAddingNew((v) => !v)}
              className="px-3 py-1.5 rounded-full text-[10.5px] font-extrabold flex items-center gap-1 shrink-0 cursor-pointer"
              style={{ backgroundColor: '#0284c7', color: '#ffffff' }}
            >
              <Plus className="w-3 h-3" />
              <span>Client nou</span>
            </button>
          </div>

          {/* Inline Add New Client Form */}
          {addingNew && (
            <div
              className="p-2.5 border-b border-slate-200 space-y-2"
              style={{ backgroundColor: '#f0f9ff' }}
            >
              <div
                className="text-[10px] font-extrabold uppercase"
                style={{ color: '#0369a1' }}
              >
                Salvează client nou în baza de date
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Denumire firmă (ex: Kaufland Frigo RO)"
                  className="flex-1 rounded-full px-3 py-1.5 text-xs font-bold border border-slate-300"
                  style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
                />
                <input
                  type="text"
                  maxLength={2}
                  value={newClientCountry}
                  onChange={(e) => setNewClientCountry(e.target.value)}
                  placeholder="RO"
                  className="w-12 text-center rounded-full px-1.5 py-1.5 text-xs font-extrabold uppercase border border-slate-300"
                  style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
                />
                <button
                  type="button"
                  onClick={handleSaveNewClient}
                  className="px-3.5 py-1.5 rounded-full text-xs font-extrabold cursor-pointer"
                  style={{ backgroundColor: '#16a34a', color: '#ffffff' }}
                >
                  Salvează
                </button>
              </div>
            </div>
          )}

          {/* Saved Clients Drop-List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
            {filteredClients.map((client) => {
              const isSelected =
                client.name.toLowerCase() === value.trim().toLowerCase();
              return (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => {
                    onChange(client.name);
                    if (onSelectClientRecord) {
                      onSelectClientRecord(client);
                    }
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-sky-50 transition flex items-center justify-between gap-2 cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-black shrink-0"
                        style={{ backgroundColor: '#003399', color: '#ffffff' }}
                      >
                        {formatCountryBadge(client.countryCode)}
                      </span>
                      <span
                        className="text-xs font-extrabold truncate"
                        style={{ color: '#0f172a' }}
                      >
                        {client.name}
                      </span>
                      <span
                        className="text-[10px] font-semibold"
                        style={{ color: '#64748b' }}
                      >
                        ({client.vatCode})
                      </span>
                    </div>
                    <div
                      className="text-[10.5px] font-semibold truncate mt-0.5"
                      style={{ color: '#0284c7' }}
                    >
                      {client.defaultFromCity} → {client.defaultToCity} · {client.defaultLdm} LDM ·{' '}
                      {client.defaultTemp > 0 ? `+${client.defaultTemp}` : client.defaultTemp}°C ·{' '}
                      <span style={{ color: '#475569' }}>{client.cargoCategory}</span>
                    </div>
                  </div>
                  {isSelected && (
                    <Check
                      className="w-4 h-4 shrink-0"
                      style={{ color: '#0284c7' }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
