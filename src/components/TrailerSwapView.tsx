import React, { useState } from 'react';
import {
  Repeat,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import {
  TRAILER_SWAP_SCENARIOS,
  TrailerSwapScenario,
  PostSwapAction,
} from '../data/mockData';
import { EuroRoPlate } from './EuroRoPlate';

const POST_SWAP_OPTIONS: { value: PostSwapAction; label: string; badge: string }[] = [
  {
    value: 'ORADEA_BASE',
    label: 'Se întoarce la baza din Oradea',
    badge: 'Retur Oradea',
  },
  {
    value: 'RETURN_ORIGIN_DIR',
    label: 'Se întoarce pe direcția din care a venit',
    badge: 'Retur pe coridor',
  },
  {
    value: 'NEW_DESTINATION_EMPTY_OR_LOAD',
    label: 'Merge spre altă destinație (și fără marfă)',
    badge: 'Altă destinație',
  },
  {
    value: 'CONTINUE_NEW_TRAILER_ROUTE',
    label: 'Continuă cursa cu remorca preluată',
    badge: 'Continuă cursa',
  },
];

function extractPlate(raw: string): string | null {
  const m = raw.match(/\b([A-Z]{1,2}\s\d{2,3}\s[A-Z]{3})\b/);
  return m ? m[1] : null;
}

function cleanDriverName(raw: string): string {
  return raw.replace(/\s*\([^)]*\)\s*/g, '').trim();
}

function cleanFlagText(raw: string): string {
  return raw
    .replace(/[\u{1F1E6}-\u{1F1FF}]{2}\s*/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getPlainScenarioTitle(scenario: TrailerSwapScenario): string {
  switch (scenario.scenarioType) {
    case 'RECIPROCAL_SWAP':
      return 'Schimb reciproc de remorci';
    case 'UNILATERAL_TAKEOVER':
      return 'Tractor liber preia remorca';
    case 'DOUBLE_CREW_RELAY':
      return 'Echipaj 2 șoferi preia cursa';
    case 'EARLY_TRAILER_RELEASE':
      return 'Lăsare remorcă la rampă';
    default:
      return 'Schimb de remorcă';
  }
}

function getShortMeetingPlace(scenario: TrailerSwapScenario): string {
  switch (scenario.id) {
    case 'swap-1':
      return 'Hegyeshalom (HU/AT)';
    case 'swap-2':
      return 'München-Ost (DE)';
    case 'swap-3':
      return 'Neumarkt · A3 (DE)';
    case 'swap-4':
      return 'Venlo (NL)';
    default:
      return scenario.meetingPoint.name.split('/')[0].trim();
  }
}

function getOneLineExplanation(scenario: TrailerSwapScenario): string {
  switch (scenario.id) {
    case 'swap-1':
      return 'Popa Ioan se întoarce diseară acasă la Oradea cu BH 45 STS, iar Bălan Cristian (odihnit) duce BH 67 STS la Viena și Rotterdam fără pauză de 11 h.';
    case 'swap-2':
      return 'Rus Vasile rămâne la odihnă în München, iar tractorul liber IF 74 STS preia remorca BH 74 STS ca să livreze la timp în Stuttgart.';
    case 'swap-3':
      return 'Mureșan Dan intră în pauză pe A3, iar echipajul de 2 șoferi de pe B 507 STS preia remorca BH 69 STS fără risc de întârziere la Frankfurt.';
    case 'swap-4':
      return 'Dobre Mihai lasă remorca BH 91 STS la terminalul din Venlo pentru încărcarea Unilever și pleacă pe retur spre Viena.';
    default:
      return scenario.description;
  }
}

export const TrailerSwapView: React.FC = () => {
  const [scenarios, setScenarios] = useState<TrailerSwapScenario[]>(
    TRAILER_SWAP_SCENARIOS
  );
  const [activeScenarioId, setActiveScenarioId] = useState<string>(
    TRAILER_SWAP_SCENARIOS[0].id
  );
  const [tractorAActions, setTractorAActions] = useState<Record<string, PostSwapAction>>({
    'swap-1': 'ORADEA_BASE',
    'swap-2': 'NEW_DESTINATION_EMPTY_OR_LOAD',
    'swap-3': 'RETURN_ORIGIN_DIR',
    'swap-4': 'RETURN_ORIGIN_DIR',
  });
  const [tractorBActions, setTractorBActions] = useState<Record<string, PostSwapAction>>({
    'swap-1': 'CONTINUE_NEW_TRAILER_ROUTE',
    'swap-2': 'CONTINUE_NEW_TRAILER_ROUTE',
    'swap-3': 'CONTINUE_NEW_TRAILER_ROUTE',
    'swap-4': 'CONTINUE_NEW_TRAILER_ROUTE',
  });
  const [customDestA, setCustomDestA] = useState<Record<string, string>>({
    'swap-2': 'Depozit Frigo München-Nord',
    'swap-4': 'Retur Venlo → Viena / Oradea',
  });
  const [customDestB, setCustomDestB] = useState<Record<string, string>>({});
  const [selectedMeetingIdx, setSelectedMeetingIdx] = useState<number>(0);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const activeScenario =
    scenarios.find((s) => s.id === activeScenarioId) || scenarios[0];

  const totalSavedHours = scenarios.reduce(
    (sum, s) => sum + s.financialImpact.savedHours,
    0
  );
  const totalNetBenefit = scenarios.reduce(
    (sum, s) => sum + s.financialImpact.netBenefitEur,
    0
  );

  const handleToggleDriverConfirm = (tractorKey: 'tractorA' | 'tractorB') => {
    setBannerMessage(null);
    setScenarios((prev) =>
      prev.map((s) => {
        if (s.id !== activeScenario.id) return s;
        const updated = {
          ...s,
          [tractorKey]: {
            ...s[tractorKey],
            driverConfirmed: !s[tractorKey].driverConfirmed,
          },
        };
        const bothConfirmed =
          updated.tractorA.driverConfirmed && updated.tractorB.driverConfirmed;
        if (updated.approvalStatus !== 'Aprobat & Activ în Planning') {
          updated.approvalStatus = bothConfirmed
            ? 'Gata de aprobare dispecer'
            : 'Așteaptă confirmare șoferi';
        }
        return updated;
      })
    );
  };

  const handleApproveSwap = () => {
    if (
      !activeScenario.tractorA.driverConfirmed ||
      !activeScenario.tractorB.driverConfirmed
    ) {
      const missing: string[] = [];
      if (!activeScenario.tractorA.driverConfirmed) {
        missing.push(cleanDriverName(activeScenario.tractorA.driverNames));
      }
      if (!activeScenario.tractorB.driverConfirmed) {
        missing.push(cleanDriverName(activeScenario.tractorB.driverNames));
      }
      setBannerMessage(
        `Confirmă mai întâi telefonic/în aplicație cu: ${missing.join(' și ')}.`
      );
      return;
    }

    setScenarios((prev) =>
      prev.map((s) =>
        s.id === activeScenario.id
          ? { ...s, approvalStatus: 'Aprobat & Activ în Planning' }
          : s
      )
    );

    const plateA = extractPlate(activeScenario.tractorA.tractorId) || activeScenario.tractorA.tractorId;
    const plateB = extractPlate(activeScenario.tractorB.tractorId) || activeScenario.tractorB.tractorId;
    const optALabel =
      POST_SWAP_OPTIONS.find((o) => o.value === tractorAActions[activeScenario.id])
        ?.label || '';
    const optBLabel =
      POST_SWAP_OPTIONS.find((o) => o.value === tractorBActions[activeScenario.id])
        ?.label || '';

    setBannerMessage(
      `Schimb aprobat la ${getShortMeetingPlace(activeScenario)}: ${plateA} (${optALabel.toLowerCase()}) · ${plateB} (${optBLabel.toLowerCase()}).`
    );
  };

  const handleReopenSwap = () => {
    setScenarios((prev) =>
      prev.map((s) =>
        s.id === activeScenario.id
          ? {
              ...s,
              approvalStatus:
                s.tractorA.driverConfirmed && s.tractorB.driverConfirmed
                  ? 'Gata de aprobare dispecer'
                  : 'Așteaptă confirmare șoferi',
            }
          : s
      )
    );
    setBannerMessage(null);
  };

  const plateTractorA =
    extractPlate(activeScenario.tractorA.tractorId) ||
    activeScenario.tractorA.tractorId;
  const plateTrailerA = extractPlate(activeScenario.tractorA.currentTrailerId);
  const plateTractorB =
    extractPlate(activeScenario.tractorB.tractorId) ||
    activeScenario.tractorB.tractorId;
  const plateTrailerB = extractPlate(activeScenario.tractorB.currentTrailerId);

  const isReciprocal = activeScenario.scenarioType === 'RECIPROCAL_SWAP';
  const bothDriversConfirmed =
    activeScenario.tractorA.driverConfirmed &&
    activeScenario.tractorB.driverConfirmed;
  const isApproved =
    activeScenario.approvalStatus === 'Aprobat & Activ în Planning';

  const currentMeetingName =
    selectedMeetingIdx === 0
      ? cleanFlagText(activeScenario.meetingPoint.name)
      : cleanFlagText(
          activeScenario.meetingPoint.alternativePoints[selectedMeetingIdx - 1]
            ?.name || activeScenario.meetingPoint.name
        );
  const currentWaitMinutes =
    selectedMeetingIdx === 0
      ? activeScenario.meetingPoint.waitWindowMinutes
      : activeScenario.meetingPoint.alternativePoints[selectedMeetingIdx - 1]
          ?.waitMin ?? activeScenario.meetingPoint.waitWindowMinutes;

  return (
    <div className="space-y-2.5 sm:space-y-3.5">
      {/* Compact Header — single row on mobile without helper prose, unchanged on desktop */}
      <div className="tahoe-glass rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 flex flex-nowrap sm:flex-wrap items-center justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <h1 className="text-base sm:text-xl font-bold text-white tracking-tight truncate">
            Schimburi de remorci
          </h1>
          <p className="hidden sm:block text-xs text-white/60">
            Alege o propunere, verifică confirmarea ambilor șoferi și aprobă schimbul.
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 text-[11px] sm:text-xs tabular-nums shrink-0">
          <div className="tahoe-card-inner rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1 sm:gap-2">
            <span className="hidden sm:inline text-white/55">Timp câștigat:</span>
            <strong className="text-[#30D158] text-xs sm:text-sm font-extrabold">
              +{totalSavedHours.toFixed(1)} h
            </strong>
          </div>
          <div className="tahoe-card-inner rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1 sm:gap-2">
            <span className="hidden sm:inline text-white/55">Câștig estimat:</span>
            <strong className="text-[#FF9F0A] text-xs sm:text-sm font-extrabold">
              +{totalNetBenefit.toLocaleString('ro-RO')} €
            </strong>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {bannerMessage && (
        <div className="tahoe-glass-elevated border border-[#0A84FF]/40 text-white px-4 py-2.5 rounded-full text-xs sm:text-sm flex items-center justify-between gap-3">
          <span className="font-medium">{bannerMessage}</span>
          <button
            onClick={() => setBannerMessage(null)}
            className="px-3 py-1 rounded-full bg-white/10 text-xs text-[#64D2FF] font-bold shrink-0 cursor-pointer"
          >
            Închide
          </button>
        </div>
      )}

      {/* 4 Clean Proposal Selector Cards — 2-per-row on mobile, 4-col on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
        {scenarios.map((s) => {
          const isSelected = s.id === activeScenario.id;
          const pA = extractPlate(s.tractorA.tractorId) || s.tractorA.tractorId;
          const pB = extractPlate(s.tractorB.tractorId) || s.tractorB.tractorId;
          const sApproved = s.approvalStatus === 'Aprobat & Activ în Planning';
          const sReady =
            !sApproved &&
            s.tractorA.driverConfirmed &&
            s.tractorB.driverConfirmed;

          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setActiveScenarioId(s.id);
                setSelectedMeetingIdx(0);
                setBannerMessage(null);
              }}
              className={`text-left p-3.5 rounded-2xl transition cursor-pointer flex flex-col justify-between gap-2 ${
                isSelected
                  ? 'tahoe-glass-elevated ring-2 ring-[#0A84FF]'
                  : 'tahoe-glass hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold whitespace-nowrap ${
                    sApproved
                      ? 'bg-[#30D158]/20 text-[#30D158]'
                      : sReady
                      ? 'bg-[#0A84FF]/15 text-[#64D2FF]'
                      : 'bg-[#FF9F0A]/20 text-[#FF9F0A]'
                  }`}
                >
                  {sApproved
                    ? '✓ Aprobat'
                    : sReady
                    ? 'Gata de aprobat'
                    : 'Confirmă șoferul'}
                </span>
                <span className="text-[11px] tabular-nums font-extrabold text-[#30D158] whitespace-nowrap">
                  +{s.financialImpact.savedHours}h · +{s.financialImpact.netBenefitEur} €
                </span>
              </div>

              <div>
                <div className="text-xs sm:text-[13px] font-bold text-white leading-snug">
                  {getPlainScenarioTitle(s)}
                </div>
                <div className="text-[11px] text-white/60 mt-0.5 flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 text-[#FF9F0A] shrink-0" />
                  <span className="truncate">{getShortMeetingPlace(s)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/[0.08] flex items-center gap-1.5 text-[11px] font-extrabold text-white tabular-nums">
                <span>{pA}</span>
                <Repeat className="w-3 h-3 text-[#0A84FF] shrink-0" />
                <span>{pB}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Swap Operational Workspace */}
      <div className="tahoe-glass rounded-2xl p-4 sm:p-5 space-y-4">
        {/* 1-Line Summary Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 pb-3.5 border-b border-white/[0.08]">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white">
                {getPlainScenarioTitle(activeScenario)} — {getShortMeetingPlace(activeScenario)}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[#30D158]/15 text-[#30D158] text-[11px] font-semibold inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Tahograf OK
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#0A84FF]/15 text-[#64D2FF] text-[11px] font-semibold inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Frigo & cuplă OK
              </span>
            </div>
            <p className="text-xs sm:text-[13px] text-white/70">
              {getOneLineExplanation(activeScenario)}
            </p>
          </div>
        </div>

        {/* 3-Column Visual Flow: Camion 1  <->  Punctul de întâlnire & Aprobare  <->  Camion 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
          {/* COLUMN 1: CAMION 1 */}
          <div className="lg:col-span-4 tahoe-card-inner rounded-2xl p-4 flex flex-col justify-between gap-3.5">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-[#64D2FF]">
                    Camion 1
                  </span>
                  <EuroRoPlate plate={plateTractorA} size="sm" />
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleDriverConfirm('tractorA')}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                    activeScenario.tractorA.driverConfirmed
                      ? 'bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/35'
                      : 'bg-[#FF9F0A]/20 text-[#FF9F0A] border border-[#FF9F0A]/40'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  {activeScenario.tractorA.driverConfirmed
                    ? '✓ Șofer confirmat'
                    : 'Confirmă cu șoferul'}
                </button>
              </div>

              <div className="text-sm sm:text-base font-bold text-white">
                Șofer: {cleanDriverName(activeScenario.tractorA.driverNames)}
              </div>

              <div className="space-y-2 text-xs bg-white/[0.04] p-3 rounded-xl border border-white/[0.08]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white/55">Remorcă acum:</span>
                  {plateTrailerA ? (
                    <EuroRoPlate plate={plateTrailerA} size="sm" />
                  ) : (
                    <strong className="text-white/80">Fără remorcă (solo)</strong>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white/55 shrink-0">Unde e acum:</span>
                  <strong className="text-white text-right truncate">
                    {cleanFlagText(activeScenario.tractorA.currentPosition)}
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white/55 shrink-0">Ajunge la schimb:</span>
                  <strong className="text-[#30D158] tabular-nums text-right">
                    {activeScenario.tractorA.etaAtMeetingPoint} ({activeScenario.tractorA.distanceToMeetingKm} km)
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white/55 shrink-0">Condus rămas:</span>
                  <strong className="text-[#FF9F0A] tabular-nums text-right">
                    {activeScenario.tractorA.remainingDriveHours.split(' (')[0]}
                  </strong>
                </div>
              </div>
            </div>

            {/* Post-Swap Selector for Tractor A */}
            <div className="pt-3 border-t border-white/[0.08] space-y-2">
              <label className="block text-[11px] font-bold text-white/75">
                Ce face {plateTractorA} după schimb?
              </label>
              <select
                value={
                  tractorAActions[activeScenario.id] ||
                  activeScenario.tractorA.defaultPostAction
                }
                onChange={(e) =>
                  setTractorAActions((prev) => ({
                    ...prev,
                    [activeScenario.id]: e.target.value as PostSwapAction,
                  }))
                }
                className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-xs text-white font-semibold border border-white/15 focus:outline-none focus:border-[#0A84FF]"
              >
                {POST_SWAP_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {(tractorAActions[activeScenario.id] ||
                activeScenario.tractorA.defaultPostAction) ===
                'NEW_DESTINATION_EMPTY_OR_LOAD' && (
                <input
                  type="text"
                  value={customDestA[activeScenario.id] || ''}
                  onChange={(e) =>
                    setCustomDestA((prev) => ({
                      ...prev,
                      [activeScenario.id]: e.target.value,
                    }))
                  }
                  placeholder="Scrie destinația nouă..."
                  className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-xs text-white border border-white/15"
                />
              )}

              <div className="text-[11px] text-white/55 leading-snug">
                {activeScenario.tractorA.customDestinationHint}
              </div>
            </div>
          </div>

          {/* COLUMN 2 (CENTER): PUNCTUL DE ÎNTÂLNIRE + CE SCHIMBĂ + BUTON APROBARE */}
          <div className="lg:col-span-4 tahoe-card-inner rounded-2xl p-4 flex flex-col justify-between gap-3.5 border border-[#0A84FF]/25">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF9F0A]">
                  <MapPin className="w-4 h-4 shrink-0" />
                  Punctul de întâlnire
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#FF9F0A]/15 text-[#FF9F0A] text-[11px] font-bold tabular-nums">
                  Așteptare: {currentWaitMinutes} min
                </span>
              </div>

              <div>
                <div className="text-sm font-bold text-white leading-snug">
                  {currentMeetingName}
                </div>
                <div className="text-[11px] text-white/55 mt-0.5">
                  {activeScenario.meetingPoint.highway} · {activeScenario.meetingPoint.parkingSecurity.split('·')[0].trim()}
                </div>
              </div>

              {/* Optional alternative parking buttons */}
              {activeScenario.meetingPoint.alternativePoints.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10.5px] font-semibold text-white/50">
                    Loc de parcare ales:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedMeetingIdx(0)}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold cursor-pointer ${
                        selectedMeetingIdx === 0
                          ? 'bg-[#0A84FF] text-white'
                          : 'bg-white/[0.06] text-white/70'
                      }`}
                    >
                      Recomandat ({activeScenario.meetingPoint.waitWindowMinutes} min)
                    </button>
                    {activeScenario.meetingPoint.alternativePoints.map((alt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedMeetingIdx(idx + 1)}
                        className={`px-3 py-1 rounded-full text-[11px] font-semibold cursor-pointer ${
                          selectedMeetingIdx === idx + 1
                            ? 'bg-[#0A84FF] text-white'
                            : 'bg-white/[0.06] text-white/70'
                        }`}
                      >
                        {alt.name.split(' (')[0]} ({alt.waitMin} min)
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Visual Trailer Handoff Box */}
              <div className="bg-white/[0.04] rounded-xl p-3 border border-white/[0.08] space-y-2">
                <div className="text-[10.5px] font-bold uppercase tracking-wide text-white/55">
                  Cum pleacă din parcare:
                </div>
                {isReciprocal && plateTrailerA && plateTrailerB ? (
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-bold text-white">{plateTractorA}</span>
                      <span className="inline-flex items-center gap-1 text-[#64D2FF] font-bold">
                        preia <ArrowRight className="w-3 h-3" /> {plateTrailerB}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-bold text-white">{plateTractorB}</span>
                      <span className="inline-flex items-center gap-1 text-[#30D158] font-bold">
                        preia <ArrowRight className="w-3 h-3" /> {plateTrailerA}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-bold text-white">{plateTractorA}</span>
                      <span className="text-white/70 font-semibold">
                        decuplează {plateTrailerA || 'remorca'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-bold text-white">{plateTractorB}</span>
                      <span className="inline-flex items-center gap-1 text-[#30D158] font-bold">
                        preia <ArrowRight className="w-3 h-3" /> {plateTrailerA || 'remorca'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Single Clear Approval Section */}
            <div className="pt-3 border-t border-white/[0.08] space-y-2">
              {!bothDriversConfirmed && !isApproved && (
                <div className="flex items-start gap-2 rounded-xl bg-[#FF9F0A]/15 border border-[#FF9F0A]/30 px-3 py-2 text-[11px] text-[#FF9F0A] font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Confirmă cu ambii șoferi (butoanele din stânga și dreapta) înainte să aprobi schimbul.
                  </span>
                </div>
              )}

              {isApproved ? (
                <div className="space-y-2">
                  <div className="w-full py-2.5 px-4 rounded-full bg-emerald-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Schimb aprobat în planificare
                  </div>
                  <button
                    type="button"
                    onClick={handleReopenSwap}
                    className="w-full py-1.5 rounded-full text-[11px] font-semibold text-white/60 hover:text-white flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Anulează aprobarea (modifică)
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleApproveSwap}
                  className={`w-full py-3 px-4 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                    bothDriversConfirmed
                      ? 'tahoe-btn-primary shadow-md'
                      : 'tahoe-btn-secondary opacity-75'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {bothDriversConfirmed
                    ? 'Aprobă schimbul de remorci'
                    : 'Așteaptă confirmarea șoferilor'}
                </button>
              )}
            </div>
          </div>

          {/* COLUMN 3: CAMION 2 */}
          <div className="lg:col-span-4 tahoe-card-inner rounded-2xl p-4 flex flex-col justify-between gap-3.5">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-[#30D158]">
                    Camion 2
                  </span>
                  <EuroRoPlate plate={plateTractorB} size="sm" />
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleDriverConfirm('tractorB')}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                    activeScenario.tractorB.driverConfirmed
                      ? 'bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/35'
                      : 'bg-[#FF9F0A]/20 text-[#FF9F0A] border border-[#FF9F0A]/40'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  {activeScenario.tractorB.driverConfirmed
                    ? '✓ Șofer confirmat'
                    : 'Confirmă cu șoferul'}
                </button>
              </div>

              <div className="text-sm sm:text-base font-bold text-white flex flex-wrap items-center gap-2">
                <span>Șofer: {cleanDriverName(activeScenario.tractorB.driverNames)}</span>
                {activeScenario.tractorB.isDoubleCrew && (
                  <span className="px-2 py-0.5 rounded-full bg-[#5E5CE6]/20 text-[#5E5CE6] text-[10.5px] font-bold">
                    2 șoferi
                  </span>
                )}
              </div>

              <div className="space-y-2 text-xs bg-white/[0.04] p-3 rounded-xl border border-white/[0.08]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white/55">Remorcă acum:</span>
                  {plateTrailerB ? (
                    <EuroRoPlate plate={plateTrailerB} size="sm" />
                  ) : (
                    <strong className="text-white/80">Fără remorcă (solo)</strong>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white/55 shrink-0">Unde e acum:</span>
                  <strong className="text-white text-right truncate">
                    {cleanFlagText(activeScenario.tractorB.currentPosition)}
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white/55 shrink-0">Ajunge la schimb:</span>
                  <strong className="text-[#30D158] tabular-nums text-right">
                    {activeScenario.tractorB.etaAtMeetingPoint} ({activeScenario.tractorB.distanceToMeetingKm} km)
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white/55 shrink-0">Condus rămas:</span>
                  <strong className="text-[#30D158] tabular-nums text-right">
                    {activeScenario.tractorB.remainingDriveHours.split(' (')[0]}
                  </strong>
                </div>
              </div>
            </div>

            {/* Post-Swap Selector for Tractor B */}
            <div className="pt-3 border-t border-white/[0.08] space-y-2">
              <label className="block text-[11px] font-bold text-white/75">
                Ce face {plateTractorB} după schimb?
              </label>
              <select
                value={
                  tractorBActions[activeScenario.id] ||
                  activeScenario.tractorB.defaultPostAction
                }
                onChange={(e) =>
                  setTractorBActions((prev) => ({
                    ...prev,
                    [activeScenario.id]: e.target.value as PostSwapAction,
                  }))
                }
                className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-xs text-white font-semibold border border-white/15 focus:outline-none focus:border-[#30D158]"
              >
                {POST_SWAP_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {(tractorBActions[activeScenario.id] ||
                activeScenario.tractorB.defaultPostAction) ===
                'NEW_DESTINATION_EMPTY_OR_LOAD' && (
                <input
                  type="text"
                  value={customDestB[activeScenario.id] || ''}
                  onChange={(e) =>
                    setCustomDestB((prev) => ({
                      ...prev,
                      [activeScenario.id]: e.target.value,
                    }))
                  }
                  placeholder="Scrie destinația nouă..."
                  className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-xs text-white border border-white/15"
                />
              )}

              <div className="text-[11px] text-white/55 leading-snug">
                {activeScenario.tractorB.customDestinationHint}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
