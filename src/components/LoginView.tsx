import React, { useState } from 'react';
import {
  Truck,
  Lock,
  Mail,
  KeyRound,
  ShieldCheck,
  Navigation,
  UserCheck,
  ArrowRight,
  Sun,
  Moon,
  Radio,
} from 'lucide-react';
import { TrailerUnit } from '../data/mockData';
import { UserRoleType } from '../App';
import { LanguageToggleBar } from '../i18n/i18n';
import { DynamicBrandLogo } from './DynamicBrandLogo';

interface LoginViewProps {
  trailers: TrailerUnit[];
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onLoginSuccess: (
    role: UserRoleType,
    userName: string,
    userEmail: string,
    driverTrailerId?: string
  ) => void;
}

interface PresetAccount {
  id: string;
  role: UserRoleType;
  roleBadge: string;
  name: string;
  email: string;
  pinOrPass: string;
  department: string;
  permissionsSummary: string;
  trailerId?: string;
}

export const LoginView: React.FC<LoginViewProps> = ({
  trailers,
  theme,
  onToggleTheme,
  onLoginSuccess,
}) => {
  const [loginCategory, setLoginCategory] = useState<'STAFF' | 'DRIVER'>('STAFF');
  const [selectedRole, setSelectedRole] = useState<UserRoleType>('ADMIN');
  const [emailInput, setEmailInput] = useState<string>('alexandru.ionescu@bluetrans.ro');
  const [passwordInput, setPasswordInput] = useState<string>('BlueTrans2026!');
  const [selectedDriverPlate, setSelectedDriverPlate] = useState<string>(
    trailers[0]?.id || 'BH 67 STS'
  );
  const [driverPin, setDriverPin] = useState<string>('6701');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const staffAccounts: PresetAccount[] = [
    {
      id: 'acc-admin',
      role: 'ADMIN',
      roleBadge: 'ADMINISTRATOR GENERAL',
      name: 'Alexandru Ionescu',
      email: 'alexandru.ionescu@bluetrans.ro',
      pinOrPass: 'BlueTrans2026!',
      department: 'Director Operațiuni & Flotă · Oradea (BH)',
      permissionsSummary:
        'Acces integral: Control Center, Planning 7 Zile, Smart Groupage, Smart Trailer Swap, Oferte Clienți, Facturare, Analiză și Supervizare Șoferi.',
    },
    {
      id: 'acc-disp-vest',
      role: 'DISPECER',
      roleBadge: 'ADMIN CURSĂ / DISPECER VEST',
      name: 'Elena Munteanu',
      email: 'elena.munteanu@bluetrans.ro',
      pinOrPass: 'DispecerVest26!',
      department: 'Admin Cursă Coridor AT / DE / NL (BH 67 STS, BH 69 STS, BH 74 STS)',
      permissionsSummary:
        'Coordonează cursele atribuite, Planning 7 Zile, Grupaje, Trailer Swap și transmite instrucțiuni tehnice directe către șoferi.',
    },
    {
      id: 'acc-disp-nord',
      role: 'DISPECER',
      roleBadge: 'ADMIN CURSĂ / DISPECER NORD & EXPRESS',
      name: 'Radu Cristea',
      email: 'radu.cristea@bluetrans.ro',
      pinOrPass: 'DispecerNord26!',
      department: 'Admin Cursă Scandinavia & Express (BH 75 STS, BH 91 STS, BH 23/31 STS)',
      permissionsSummary:
        'Coordonează cursele spre Danemarca/Suedia și divizia Express 3.5T/7.5T, inclusiv comunicarea cu șoferii din cabină.',
    },
    {
      id: 'acc-fin',
      role: 'FINANCIAR',
      roleBadge: 'FINANCIAR & FACTURARE CMR',
      name: 'Anca Marinescu',
      email: 'anca.marinescu@bluetrans.ro',
      pinOrPass: 'Financiar2026!',
      department: 'Contabilitate, Validare CMR & Profitabilitate Curse',
      permissionsSummary:
        'Acces dedicat pe Oferte Clienți (marjă & contribuție netă), Comenzi & CMR, Flotă & Emitere Facturi.',
    },
  ];

  const handleSelectStaffPreset = (acc: PresetAccount) => {
    setLoginCategory('STAFF');
    setSelectedRole(acc.role);
    setEmailInput(acc.email);
    setPasswordInput(acc.pinOrPass);
    setErrorMsg(null);
  };

  const handleSelectDriverPreset = (trailer: TrailerUnit, idx: number) => {
    setLoginCategory('DRIVER');
    setSelectedRole('SOFER');
    setSelectedDriverPlate(trailer.id);
    setDriverPin(`${trailer.id.replace(/\D/g, '')}0${idx + 1}`.slice(0, 4));
    setErrorMsg(null);
  };

  const handleSubmitLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (loginCategory === 'STAFF') {
      if (!emailInput.trim() || !passwordInput.trim()) {
        setErrorMsg('Te rugăm să introduci adresa de e-mail și parola contului.');
        return;
      }
      const matched = staffAccounts.find(
        (a) => a.email.toLowerCase() === emailInput.trim().toLowerCase()
      );
      const roleToUse = matched ? matched.role : selectedRole;
      const nameToUse = matched
        ? `${matched.name} (${matched.roleBadge})`
        : emailInput.split('@')[0];

      onLoginSuccess(roleToUse, nameToUse, emailInput.trim());
    } else {
      if (!driverPin.trim() || driverPin.trim().length < 4) {
        setErrorMsg('Introdu codul PIN Tahograf (4 cifre) al șoferului.');
        return;
      }
      const tr =
        trailers.find((t) => t.id === selectedDriverPlate) || trailers[0];
      onLoginSuccess(
        'SOFER',
        `${tr.driver1.name} (${tr.tractorId} / ${tr.id})`,
        `sofer.${tr.id.toLowerCase().replace(/\s+/g, '')}@bluetrans.ro`,
        tr.id
      );
    }
  };

  const currentDriverObj =
    trailers.find((t) => t.id === selectedDriverPlate) || trailers[0];

  return (
    <div
      data-theme={theme}
      className="min-h-screen tahoe-wallpaper text-[#f5f5f7] flex flex-col justify-between p-4 sm:p-6 lg:p-10 transition-colors duration-200"
    >
      {/* Top Bar on Login Screen: Brand + Theme Switcher */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <DynamicBrandLogo height={80} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white leading-tight">
                SFERLE TMS
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-[#0A84FF]/20 text-[#0A84FF] border border-[#0A84FF]/35 leading-none">
                PRO
              </span>
            </div>
            <div className="text-xs font-medium text-white/60 mt-0.5">
              Blue Trans Spedition · Oradea (BH)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <LanguageToggleBar />

          <button
            type="button"
            onClick={onToggleTheme}
            className="px-4 py-2 rounded-full tahoe-btn-secondary text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-[#FF9F0A]" />
                <span>Mod Luminos</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-[#0A84FF]" />
                <span>Mod Întunecat</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Center Login Grid: Left = Login Form | Right = Role & Driver Accounts */}
      <div className="max-w-6xl w-full mx-auto my-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* LEFT 5 COLS: AUTHENTICATION FORM */}
        <div className="lg:col-span-5 tahoe-glass-elevated rounded-[30px] p-6 sm:p-8 flex flex-col justify-between space-y-6 border border-white/20">
          <div className="space-y-5">
            {/* macOS Window Dots + Security Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                <span className="w-3 h-3 rounded-full bg-[#27C93F]" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/30 flex items-center gap-1.5">
                <Radio className="w-3 h-3 animate-pulse" />
                SSO & Tahograf Activ
              </span>
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64D2FF]">
                PORTAL SECURIZAT PE ROLURI (RBAC)
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
                Autentificare în Sistem
              </h1>
              <p className="text-xs sm:text-sm text-white/65 mt-1">
                Selectează tipul de portal: <strong>Dispecerat / Admin / Financiar</strong> sau{' '}
                <strong>Cabina Șoferului (rută & fișă tehnică proprie)</strong>.
              </p>
            </div>

            {/* Mode Switcher: Staff vs Driver Cab */}
            <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-full tahoe-card-inner">
              <button
                type="button"
                onClick={() => {
                  setLoginCategory('STAFF');
                  setSelectedRole('ADMIN');
                }}
                className={`py-2.5 px-3 rounded-full text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer ${
                  loginCategory === 'STAFF'
                    ? 'tahoe-btn-primary text-white shadow'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Dispecerat & Admin</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoginCategory('DRIVER');
                  setSelectedRole('SOFER');
                }}
                className={`py-2.5 px-3 rounded-full text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer ${
                  loginCategory === 'DRIVER'
                    ? 'tahoe-btn-primary text-white shadow'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <Navigation className="w-4 h-4" />
                <span>Portal Șofer (Cabină)</span>
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold">
                {errorMsg}
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmitLogin} className="space-y-4">
              {loginCategory === 'STAFF' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-white/75 mb-1.5">
                      Grad de Acces / Rol Operațional
                    </label>
                    <select
                      value={selectedRole}
                      onChange={(e) => {
                        const r = e.target.value as UserRoleType;
                        setSelectedRole(r);
                        const preset = staffAccounts.find((a) => a.role === r);
                        if (preset) {
                          setEmailInput(preset.email);
                          setPasswordInput(preset.pinOrPass);
                        }
                      }}
                      className="w-full tahoe-card-inner rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-white border border-white/15 focus:outline-none focus:border-[#0A84FF]"
                    >
                      <option value="ADMIN" className="bg-slate-900 text-white">
                        Administrator General (Acces Complet TMS)
                      </option>
                      <option value="DISPECER" className="bg-slate-900 text-white">
                        Admin Cursă / Dispecer Coordonator (Planning, Grupaj, Swap & Șoferi)
                      </option>
                      <option value="FINANCIAR" className="bg-slate-900 text-white">
                        Financiar & Facturare (Oferte, CMR, Profitabilitate)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white/75 mb-1.5">
                      E-mail Instituțional Blue Trans
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-white/45 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="nume@bluetrans.ro"
                        className="w-full tahoe-card-inner rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm font-semibold text-white border border-white/15 focus:outline-none focus:border-[#0A84FF]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white/75 mb-1.5">
                      Parolă Cont
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-white/45 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="w-full tahoe-card-inner rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm font-semibold text-white border border-white/15 focus:outline-none focus:border-[#0A84FF]"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-white/75 mb-1.5">
                      Selectează Camionul / Semiremorca Atribuită Șoferului
                    </label>
                    <select
                      value={selectedDriverPlate}
                      onChange={(e) => setSelectedDriverPlate(e.target.value)}
                      className="w-full tahoe-card-inner rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-white border border-white/15 focus:outline-none focus:border-[#0A84FF]"
                    >
                      {trailers.map((t) => (
                        <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                          {t.id} · Șofer: {t.driver1.name} ({t.routeSummary[0]} →{' '}
                          {t.routeSummary[t.routeSummary.length - 1]})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3.5 rounded-2xl tahoe-card-inner space-y-1 text-xs border border-[#0A84FF]/30">
                    <div className="font-bold text-[#64D2FF]">
                      Ansamblu: {currentDriverObj.tractorId} + {currentDriverObj.id}
                    </div>
                    <div className="text-white/80">
                      Șofer titular: <strong>{currentDriverObj.driver1.name}</strong>
                      {currentDriverObj.driver2
                        ? ` · Co-șofer: ${currentDriverObj.driver2.name}`
                        : ''}
                    </div>
                    <div className="text-[11px] text-[#30D158] font-semibold">
                      Rută atribuită: {currentDriverObj.routeSummary.join(' → ')}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white/75 mb-1.5">
                      Cod PIN Card Tahograf / Cabină (4 cifre)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-white/45 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        maxLength={8}
                        value={driverPin}
                        onChange={(e) => setDriverPin(e.target.value)}
                        placeholder="6701"
                        className="w-full tahoe-card-inner rounded-xl pl-10 pr-4 py-2.5 text-sm font-extrabold tracking-widest text-white border border-white/15 focus:outline-none focus:border-[#0A84FF] tabular-nums"
                      />
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                className="w-full py-3.5 px-5 rounded-full tahoe-btn-primary text-sm font-extrabold text-white flex items-center justify-center gap-2 shadow-xl cursor-pointer mt-2"
              >
                <span>
                  {loginCategory === 'STAFF'
                    ? `Autentificare ca ${
                        selectedRole === 'ADMIN'
                          ? 'Administrator General'
                          : selectedRole === 'DISPECER'
                          ? 'Admin Cursă / Dispecer'
                          : 'Financiar & Facturare'
                      }`
                    : `Intră în Cabina Șoferului (${selectedDriverPlate})`}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-white/50">
            <span>Criptare TLS 1.3 · Cargo Track SSO</span>
            <span>Blue Trans Spedition SRL</span>
          </div>
        </div>

        {/* RIGHT 7 COLS: QUICK ROLE & DRIVER ACCOUNTS FOR INSTANT LOGIN */}
        <div className="lg:col-span-7 tahoe-glass rounded-[30px] p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#30D158]">
                CONTURI ACTIVE ÎN PLATFORMĂ · AUTENTIFICARE 1-CLICK SAU ÎN FORMULAR
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
                1. Grade Administrative, Dispecerat (Admini de Cursă) & Financiar
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {staffAccounts.map((acc) => {
                const isSelected =
                  loginCategory === 'STAFF' && emailInput === acc.email;
                return (
                  <div
                    key={acc.id}
                    onClick={() => handleSelectStaffPreset(acc)}
                    className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-[#0A84FF]/20 border-[#0A84FF] shadow-md'
                        : 'tahoe-card-inner border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="px-2 py-0.5 rounded-md bg-[#0A84FF]/20 text-[#64D2FF] text-[10px] font-extrabold">
                          {acc.roleBadge}
                        </span>
                        {isSelected && (
                          <UserCheck className="w-4 h-4 text-[#30D158] shrink-0" />
                        )}
                      </div>
                      <div className="text-sm font-extrabold text-white pt-0.5">
                        {acc.name}
                      </div>
                      <div className="text-[11px] text-[#64D2FF] font-medium">
                        {acc.department}
                      </div>
                      <p className="text-[11px] text-white/65 leading-snug">
                        {acc.permissionsSummary}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                      <span className="text-[10px] text-white/50 truncate">
                        {acc.email}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onLoginSuccess(
                            acc.role,
                            `${acc.name} (${acc.roleBadge})`,
                            acc.email
                          );
                        }}
                        className="px-3.5 py-1 rounded-full tahoe-btn-primary text-[11px] font-bold text-white cursor-pointer shrink-0"
                      >
                        Intră direct →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Driver Cab Accounts Section */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64D2FF]">
                  MODULUL PENTRU ȘOFERI (VIZIBILITATE EXCLUSIVĂ PE RUTA ȘI CAMIONUL ATRIBUIT)
                </span>
                <h3 className="text-base sm:text-lg font-extrabold text-white">
                  2. Conturi Șoferi Flotă (7 Ansambluri Active + Adminul Cursei)
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
              {trailers.map((t, idx) => {
                const isSelected =
                  loginCategory === 'DRIVER' && selectedDriverPlate === t.id;
                const courseAdmin =
                  t.id === 'BH 75 STS' ||
                  t.id === 'BH 91 STS' ||
                  t.id.includes('EXP')
                    ? 'Radu Cristea'
                    : 'Elena Munteanu';

                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectDriverPreset(t, idx)}
                    className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-[#30D158]/20 border-[#30D158]'
                        : 'tahoe-card-inner border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-xs font-extrabold text-white truncate">
                        {t.driver1.name} ·{' '}
                        <span className="text-[#64D2FF]">{t.id}</span>
                      </div>
                      <div className="text-[10px] text-white/70 truncate">
                        Ruta: <strong>{t.routeSummary.join(' → ')}</strong>
                      </div>
                      <div className="text-[10px] text-[#30D158] font-semibold">
                        Admin Cursă: {courseAdmin} · {t.zone1Temp}°C / +{t.zone2Temp}°C
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onLoginSuccess(
                          'SOFER',
                          `${t.driver1.name} (${t.tractorId} / ${t.id})`,
                          `sofer.${t.id.toLowerCase().replace(/\s+/g, '')}@bluetrans.ro`,
                          t.id
                        );
                      }}
                      className="px-3.5 py-1.5 rounded-full bg-[#30D158] hover:bg-[#28b84c] text-slate-950 font-extrabold text-[11px] shrink-0 cursor-pointer"
                    >
                      Cabină →
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="max-w-6xl w-full mx-auto text-center text-xs text-white/45">
        SFERLE TMS PRO · Sistem Integrat de Planificare, Grupaje Bi-Temp, Smart Trailer Swap și Portal Șoferi
      </div>
    </div>
  );
};

