import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MessageSquareDiff,
  Copy,
  Send,
  Sparkles,
  ShieldAlert,
  X,
  Link2,
  MessageCircle,
} from 'lucide-react';
import { ClientShipmentProposal, TrailerUnit } from '../data/mockData';
import { GoogleMapsAddressInput } from './GoogleMapsAddressInput';
import { ClientDropdownSelect } from './ClientDropdownSelect';
import {
  computeCostBreakdown,
  evaluateCorridorAlignment,
} from '../utils/smartLogisticsEngine';
import {
  apiCreatePublicOfferLink,
  apiSendNotification,
  buildPublicOfferUrl,
  type OfferLinkRecord,
  type OutboxEntry,
} from '../data/tmsSyncClient';

interface ClientOffersViewProps {
  proposals: ClientShipmentProposal[];
  trailers: TrailerUnit[];
  onAcceptProposal: (proposalId: string) => void;
  onCounterOfferProposal: (proposalId: string, counterEur: number) => void;
  onDeclineProposal: (proposalId: string) => void;
  onCreateNewProposal: (proposal: Omit<ClientShipmentProposal, 'id'>) => void;
  authToken?: string;
  tenantId?: string;
  companyName?: string;
  offerLinks?: OfferLinkRecord[];
  onOfferLinkCreated?: (link: OfferLinkRecord) => void;
  onNotificationSent?: (entry: OutboxEntry) => void;
}

export const ClientOffersView: React.FC<ClientOffersViewProps> = ({
  proposals,
  trailers,
  onAcceptProposal,
  onCounterOfferProposal,
  onDeclineProposal,
  onCreateNewProposal,
  authToken = '',
  tenantId = 'blue-trans',
  companyName = 'BLUE TRANS SPEDITION',
  offerLinks = [],
  onOfferLinkCreated,
  onNotificationSent,
}) => {
  const [selectedTrailerForEmail, setSelectedTrailerForEmail] = useState<string>('BH 67 STS');
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [showClientFormModal, setShowClientFormModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('dispo@danone-logistics.eu');
  const [recipientPhone, setRecipientPhone] = useState('+40 744 000 000');
  const [isSendingNotify, setIsSendingNotify] = useState(false);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [latestGeneratedUrl, setLatestGeneratedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (showClientFormModal) {
      document.body.classList.add('modal-scroll-locked');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.classList.remove('modal-scroll-locked');
      document.body.style.overflow = '';
    }
    return () => {
      document.body.classList.remove('modal-scroll-locked');
      document.body.style.overflow = '';
    };
  }, [showClientFormModal]);
  const [counterOfferId, setCounterOfferId] = useState<string | null>(null);
  const [counterOfferValue, setCounterOfferValue] = useState<number>(620);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [mobileSection, setMobileSection] = useState<'proposals' | 'email'>('proposals');

  // Client Portal Simulator State
  const [clientName, setClientName] = useState('Danone Fresh Central Europe');
  const [routeFrom, setRouteFrom] = useState('Viena');
  const [routeTo, setRouteTo] = useState('Köln');
  const [ldmReq, setLdmReq] = useState(1.2);
  const [tempReq, setTempReq] = useState(4);
  const [offeredPrice, setOfferedPrice] = useState(290);

  const emailTrailer =
    trailers.find((t) => t.id === selectedTrailerForEmail) || trailers[0];

  const viennaSegment =
    emailTrailer.segments.find((s) => s.fromCity === 'Viena') ||
    emailTrailer.segments[0];
  const commercialAvailableLdm =
    selectedTrailerForEmail === 'BH 67 STS'
      ? Math.max(0, +(12.4 - viennaSegment.occupiedLdm).toFixed(1))
      : emailTrailer.freeLdm;

  const activeRouteDisplay = emailTrailer.routeSummary.join(' → ');
  const activeLoadingWindow =
    viennaSegment?.etaStart && viennaSegment.etaStart !== '—'
      ? `Fereastră rută: ${viennaSegment.etaStart}`
      : 'Disponibil astăzi 15:30 – 17:30';
  const lastSeg = emailTrailer.segments[emailTrailer.segments.length - 1];
  const activeLatestDelivery =
    lastSeg?.etaEnd && lastSeg.etaEnd !== '—'
      ? `Sosire estimată: ${lastSeg.etaEnd} (${lastSeg.toCity})`
      : 'Livrare 24–48h coridor TEN-T';

  const existingLinkForTrailer = offerLinks.find((l) => l.trailerId === emailTrailer.id);
  const effectivePublicUrl =
    latestGeneratedUrl ||
    (existingLinkForTrailer ? buildPublicOfferUrl(existingLinkForTrailer.token) : null);

  const buildEmailProposalText = () =>
    [
      `Subject: Available Frigo Capacity (${commercialAvailableLdm.toFixed(1)} LDM @ ${emailTrailer.zone2Temp > 0 ? '+' : ''}${emailTrailer.zone2Temp}°C) — ${activeRouteDisplay}`,
      '',
      'We would like to inform you that we expect to have refrigerated transport capacity available:',
      `• Route: ${activeRouteDisplay}`,
      `• Trailer: ${emailTrailer.id}`,
      `• Available capacity: ${commercialAvailableLdm.toFixed(1)} loading metres`,
      `• Temperature: ${emailTrailer.zone2Temp > 0 ? '+' : ''}${emailTrailer.zone2Temp}°C`,
      `• Loading window: ${activeLoadingWindow}`,
      `• Latest delivery: ${activeLatestDelivery}`,
      '',
      effectivePublicUrl
        ? `Submit your shipment & rate directly via secure client portal:\n${effectivePublicUrl}`
        : 'Reply with your loading/unloading details, weight, temperature and offered freight rate.',
      '',
      `Best regards,\n${companyName}`,
    ].join('\n');

  const handleCopyEmail = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(buildEmailProposalText());
      }
      setCopiedEmail(true);
      setActionToast('Textul comercial & link-ul au fost copiate în clipboard!');
      setTimeout(() => setCopiedEmail(false), 2500);
    } catch {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2500);
    }
  };

  const handleCreatePublicLink = async () => {
    if (!authToken) {
      setActionToast('Autentifică-te pe server pentru a genera link-ul public securizat /ofertare.');
      return;
    }
    setIsCreatingLink(true);
    try {
      const resp = await apiCreatePublicOfferLink(authToken, tenantId, {
        trailerId: emailTrailer.id,
        routeSummary: emailTrailer.routeSummary,
        loadingWindow: activeLoadingWindow,
        latestDelivery: activeLatestDelivery,
        tempC: emailTrailer.zone2Temp,
      });
      if (resp.ok && resp.link) {
        const fullUrl = buildPublicOfferUrl(resp.link.token);
        setLatestGeneratedUrl(fullUrl);
        onOfferLinkCreated?.(resp.link);
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(fullUrl).catch(() => {});
        }
        setActionToast(`Link securizat creat și copiat: ${fullUrl}`);
      } else {
        setActionToast(resp.error || 'Nu s-a putut genera link-ul public.');
      }
    } finally {
      setIsCreatingLink(false);
    }
  };

  const handleSendOutbound = async (channel: 'email' | 'whatsapp') => {
    const body = buildEmailProposalText();
    const subject = `Capacitate Frigo ${commercialAvailableLdm.toFixed(1)} LDM · ${activeRouteDisplay}`;
    const to = channel === 'email' ? recipientEmail.trim() : recipientPhone.trim();
    if (!to) {
      setActionToast(`Completează destinatarul pentru ${channel === 'email' ? 'E-mail' : 'WhatsApp'}.`);
      return;
    }
    setIsSendingNotify(true);
    try {
      if (authToken) {
        const resp = await apiSendNotification(authToken, tenantId, {
          channel,
          to,
          subject,
          message: body,
        });
        if (resp.ok && resp.entry) {
          onNotificationSent?.(resp.entry);
          setActionToast(
            channel === 'email'
              ? `E-mail transmis (${resp.entry.deliveryMode}) către ${to}!`
              : `Mesaj WhatsApp logat (${resp.entry.deliveryMode}) către ${to}!`
          );
          if (resp.entry.deliveryMode === 'outbox-preview') {
            if (channel === 'email') {
              window.open(`mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
            } else {
              const digits = to.replace(/[^0-9]/g, '');
              window.open(`https://wa.me/${digits}?text=${encodeURIComponent(body)}`, '_blank');
            }
          }
          return;
        }
      }
      setActionToast(`Ofertă pregătită pentru ${to} (${channel}).`);
    } finally {
      setIsSendingNotify(false);
    }
  };

  const handleSubmitClientSimulation = (e: React.FormEvent) => {
    e.preventDefault();
    const corridor = evaluateCorridorAlignment(emailTrailer, routeFrom, routeTo);
    const detourKm = corridor.matchesCorridor ? corridor.detourKm : 38;
    const cost = computeCostBreakdown(ldmReq, detourKm);
    const incCost = cost.totalIncrementalEur;
    const contrib = offeredPrice - incCost;

    onCreateNewProposal({
      trailerId: selectedTrailerForEmail,
      segmentLabel: `${routeFrom} → ${routeTo} (Disponibil: ${commercialAvailableLdm.toFixed(1)} LDM @ +${tempReq}°C)`,
      clientName,
      clientContact: recipientEmail || 'logistics@client-portal.eu',
      routeFrom,
      routeTo,
      ldmRequested: ldmReq,
      availableLdmOnSegment: commercialAvailableLdm,
      weightTons: +(ldmReq * 1.3).toFixed(1),
      tempRequired: tempReq,
      offeredPriceEur: offeredPrice,
      incrementalCostEur: incCost,
      estimatedContributionEur: contrib,
      detourKm,
      loadingWindow: activeLoadingWindow,
      latestDelivery: activeLatestDelivery,
      status: 'Pending review',
      submittedAt: 'Chiar acum (din Portal Client)',
      hasConflictWarning: ldmReq > commercialAvailableLdm,
      conflictDetails:
        ldmReq > commercialAvailableLdm
          ? `ATENȚIE: Clientul solicită ${ldmReq} LDM, dar au mai rămas doar ${commercialAvailableLdm.toFixed(1)} LDM disponibili pe segment!`
          : undefined,
    });

    setShowClientFormModal(false);
    setMobileSection('proposals');
    setActionToast(
      `Propunerea nouă de la "${clientName}" (${ldmReq} LDM, ${offeredPrice} €, ocol ${detourKm} km) a intrat în lista dispecerului în regim Soft-Lock!`
    );
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Header — single compact row on mobile, unchanged on desktop */}
      <div className="tahoe-glass rounded-[22px] sm:rounded-[26px] p-3 sm:p-6 flex flex-row items-center justify-between gap-2 sm:gap-4">
        <h1 className="text-base sm:text-xl font-bold text-white tracking-tight whitespace-nowrap">
          Oferte clienți
        </h1>

        <button
          onClick={() => setShowClientFormModal(true)}
          className="tahoe-btn-primary px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-[11px] sm:text-xs flex items-center justify-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="sm:hidden">+ Ofertă client</span>
          <span className="hidden sm:inline">Simulează Ofertă Nouă de la Client</span>
        </button>
      </div>

      {actionToast && (
        <div className="tahoe-glass-elevated border-[#30D158]/40 text-white px-4 py-3 rounded-full text-xs sm:text-sm flex items-center justify-between gap-3">
          <span>{actionToast}</span>
          <button
            onClick={() => setActionToast(null)}
            className="px-3 py-1 rounded-full bg-white/10 text-xs text-[#64D2FF] font-semibold shrink-0 cursor-pointer"
          >
            OK
          </button>
        </div>
      )}

      {/* Mobile Segmented Control (iOS / macOS Tahoe Pill Switcher) */}
      <div className="xl:hidden flex p-1 rounded-full bg-black/40 border border-white/10">
        <button
          onClick={() => setMobileSection('proposals')}
          className={`flex-1 py-2 rounded-full text-xs font-semibold transition cursor-pointer ${
            mobileSection === 'proposals'
              ? 'bg-[#0A84FF] text-white shadow-md'
              : 'text-white/60 hover:text-white'
          }`}
        >
          Ce primește dispecerul ({proposals.length})
        </button>
        <button
          onClick={() => setMobileSection('email')}
          className={`flex-1 py-2 rounded-full text-xs font-semibold transition cursor-pointer ${
            mobileSection === 'email'
              ? 'bg-[#0A84FF] text-white shadow-md'
              : 'text-white/60 hover:text-white'
          }`}
        >
          E-mail & Link Client
        </button>
      </div>

      {/* Main Responsive Split Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* RIGHT/FIRST ON MOBILE: "Ce primește dispecerul" (Image 1 exact design) */}
        <div
          className={`xl:col-span-7 xl:order-2 space-y-4 ${
            mobileSection === 'email' ? 'hidden xl:block' : 'block'
          }`}
        >
          {proposals.map((prop) => {
            const isPending = prop.status === 'Pending review';

            return (
              <div
                key={prop.id}
                className={`tahoe-glass rounded-[28px] p-5 sm:p-6 transition ${
                  prop.status === 'Accepted'
                    ? 'ring-1 ring-[#30D158]/50'
                    : prop.status === 'Declined'
                    ? 'opacity-60'
                    : ''
                }`}
              >
                {/* Top Header matching Image 1 */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                        New shipment proposal
                      </h2>
                      <span className="px-2 py-0.5 rounded-lg bg-white/[0.08] text-white/80 tabular-nums text-[11px] font-semibold">
                        {prop.trailerId}
                      </span>
                    </div>
                    <div className="text-xs sm:text-sm text-white/65 mt-1">
                      {prop.clientName}: {prop.routeFrom} → {prop.routeTo} · {prop.ldmRequested} LDM · +{prop.tempRequired}°C
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold shrink-0 ${
                      prop.status === 'Pending review'
                        ? 'bg-[#FF9F0A]/15 text-[#FF9F0A] border border-[#FF9F0A]/30'
                        : prop.status === 'Accepted'
                        ? 'bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/30'
                        : prop.status === 'Counteroffer sent'
                        ? 'bg-[#0A84FF]/15 text-[#64D2FF] border border-[#0A84FF]/30'
                        : 'bg-[#FF453A]/15 text-[#FF453A] border border-[#FF453A]/30'
                    }`}
                  >
                    {prop.status === 'Counteroffer sent'
                      ? `Counteroffer: ${prop.counterOfferEur} €`
                      : prop.status}
                  </span>
                </div>

                {/* 3 Metrics Row — Exact Image 1 Layout */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 my-4 py-3.5 px-3.5 sm:px-5 rounded-2xl bg-black/30 border border-white/[0.07]">
                  <div>
                    <div className="text-[11px] sm:text-xs text-white/55">Preț oferit</div>
                    <div className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5 whitespace-nowrap">
                      {prop.offeredPriceEur}&#160;€
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] sm:text-xs text-white/55">
                      Cost suplimentar
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5 whitespace-nowrap">
                      {prop.incrementalCostEur}&#160;€
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] sm:text-xs text-white/55">
                      Contribuție estimată
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-[#30D158] tracking-tight mt-0.5 whitespace-nowrap">
                      {prop.estimatedContributionEur}&#160;€
                    </div>
                  </div>
                </div>

                <p className="text-[11px] sm:text-xs text-white/50 mb-4 leading-relaxed">
                  Calculul include kilometrii suplimentari (+{prop.detourKm} km), taxele de drum, timpul de rampă și costurile incrementale.
                </p>

                {/* Soft-Lock Warning if Conflict */}
                {prop.hasConflictWarning && prop.conflictDetails && (
                  <div className="mb-4 p-3.5 rounded-2xl bg-[#FF9F0A]/12 border border-[#FF9F0A]/30 text-xs text-[#FFD60A] flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-[#FF9F0A] shrink-0 mt-0.5" />
                    <span>{prop.conflictDetails}</span>
                  </div>
                )}

                {/* Counteroffer Input Drawer */}
                {counterOfferId === prop.id && (
                  <div className="mb-4 p-3.5 rounded-2xl bg-[#0A84FF]/12 border border-[#0A84FF]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 text-xs text-white/90">
                      <span>Contraofertă (EUR):</span>
                      <input
                        type="number"
                        value={counterOfferValue}
                        onChange={(e) => setCounterOfferValue(Number(e.target.value))}
                        className="w-24 bg-black/50 border border-[#0A84FF] rounded-xl px-2.5 py-1.5 text-sm tabular-nums font-bold text-white"
                      />
                      <span className="text-[#30D158] tabular-nums text-xs">
                        (+{counterOfferValue - prop.incrementalCostEur} € net)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          onCounterOfferProposal(prop.id, counterOfferValue);
                          setCounterOfferId(null);
                          setActionToast(
                            `Contraoferta de ${counterOfferValue} € a fost trimisă către ${prop.clientName}. Spațiul rămâne în regim Soft-Lock.`
                          );
                        }}
                        className="tahoe-btn-primary px-4 py-1.5 rounded-full text-xs cursor-pointer"
                      >
                        Trimite
                      </button>
                      <button
                        onClick={() => setCounterOfferId(null)}
                        className="tahoe-btn-secondary px-3.5 py-1.5 rounded-full text-xs text-white/70 cursor-pointer"
                      >
                        Anulează
                      </button>
                    </div>
                  </div>
                )}

                {/* 3 Pill Action Buttons matching Image 1: Acceptă | Contraofertă | Refuză */}
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                  <button
                    disabled={!isPending && prop.status !== 'Counteroffer sent'}
                    onClick={() => {
                      onAcceptProposal(prop.id);
                      setActionToast(
                        `Propunerea ${prop.clientName} (${prop.ldmRequested} LDM, +${prop.estimatedContributionEur} €) a fost ACCEPTATĂ! Spațiul pe ${prop.trailerId} s-a recalculat automat în Planning.`
                      );
                    }}
                    className="py-2.5 px-3 rounded-full border border-[#30D158]/60 bg-[#30D158]/10 hover:bg-[#30D158]/20 disabled:opacity-35 text-[#30D158] font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Acceptă</span>
                  </button>

                  <button
                    disabled={!isPending}
                    onClick={() => {
                      setCounterOfferId(prop.id);
                      setCounterOfferValue(prop.offeredPriceEur + 70);
                    }}
                    className="py-2.5 px-3 rounded-full border border-white/20 bg-white/[0.04] hover:bg-white/[0.1] disabled:opacity-35 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <MessageSquareDiff className="w-4 h-4 shrink-0 hidden sm:inline" />
                    <span>Contraofertă</span>
                  </button>

                  <button
                    disabled={!isPending && prop.status !== 'Counteroffer sent'}
                    onClick={() => {
                      onDeclineProposal(prop.id);
                      setActionToast(
                        `Propunerea de la ${prop.clientName} a fost refuzată. Spațiul de ${prop.availableLdmOnSegment} LDM rămâne disponibil.`
                      );
                    }}
                    className="py-2.5 px-3 rounded-full border border-white/20 bg-white/[0.04] hover:border-[#FF453A]/50 hover:text-[#FF453A] disabled:opacity-35 text-white/80 font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <XCircle className="w-4 h-4 shrink-0 hidden sm:inline" />
                    <span>Refuză</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Mandatory Soft-Lock Rule Card from Image 1 */}
          <div className="tahoe-card-inner rounded-[24px] p-4 sm:p-5 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-[#FF9F0A] shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-white/80 space-y-1.5 leading-relaxed">
              <div className="font-bold text-white">
                Regulă obligatorie (Soft-Lock 3 LDM din 4,2 LDM)
              </div>
              <p className="text-white/65">
                Dacă un client trimite o ofertă pentru <strong>3 LDM din cei 4,2 disponibili</strong>, TMS-ul nu blochează definitiv spațiul până la acceptare, dar avertizează dacă între timp apare o altă comandă incompatibilă. După acceptare, comanda intră automat în Planning, iar spațiul disponibil se recalculează pe fiecare segment.
              </p>
            </div>
          </div>
        </div>

        {/* LEFT COLUMN ON DESKTOP: E-mailul Comercial cu Formularul pentru Client (Image 2) */}
        <div
          className={`xl:col-span-5 xl:order-1 tahoe-glass rounded-[28px] p-5 sm:p-6 flex flex-col justify-between space-y-5 ${
            mobileSection === 'proposals' ? 'hidden xl:flex' : 'flex'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64D2FF]">
                  E-mail Comercial Automat
                </span>
                <h2 className="text-base font-bold text-white mt-0.5">
                  Template & Link de Ofertare Client
                </h2>
              </div>
              <select
                value={selectedTrailerForEmail}
                onChange={(e) => setSelectedTrailerForEmail(e.target.value)}
                className="bg-black/40 border border-white/15 rounded-full px-3 py-1.5 text-xs tabular-nums text-white"
              >
                {trailers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.id}
                  </option>
                ))}
              </select>
            </div>

            {/* Email Preview matching Image 2 */}
            <div className="bg-black/35 border border-white/[0.08] rounded-[22px] p-4 sm:p-5 text-xs sm:text-sm text-white/85 space-y-3.5 leading-relaxed">
              <p className="text-white/75">
                We would like to inform you that we expect to have refrigerated transport capacity available on the following route:
              </p>

              <div className="space-y-1 text-white">
                <div>
                  <strong>Route:</strong> {activeRouteDisplay}
                </div>
                <div>
                  <strong>Available capacity:</strong>{' '}
                  <span className="text-[#30D158] font-bold">
                    {commercialAvailableLdm.toFixed(1)} loading metres
                  </span>
                </div>
                <div>
                  <strong>Temperature:</strong> {emailTrailer.zone2Temp > 0 ? '+' : ''}{emailTrailer.zone2Temp}°C
                </div>
                <div>
                  <strong>Loading window:</strong> {activeLoadingWindow}
                </div>
                <div>
                  <strong>Latest delivery:</strong> {activeLatestDelivery}
                </div>
              </div>

              <p className="text-white/75">
                If you have any compatible shipments along this route,{' '}
                <span className="text-[#64D2FF]">we invite you to submit</span> your transport request using the link below:
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCreatePublicLink}
                  disabled={isCreatingLink}
                  className="flex-1 py-2.5 px-3.5 rounded-full bg-[#0A84FF]/20 hover:bg-[#0A84FF]/30 border border-[#0A84FF]/45 text-[#64D2FF] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  <Link2 className="w-4 h-4 shrink-0" />
                  <span>{isCreatingLink ? 'Se generează link...' : 'Generează Link Public (/ofertare)'}</span>
                </button>
                {effectivePublicUrl && (
                  <a
                    href={effectivePublicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3.5 rounded-full bg-[#30D158]/20 border border-[#30D158]/40 text-[#30D158] font-bold text-xs flex items-center gap-1.5 hover:bg-[#30D158]/30 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Portal Client Live</span>
                  </a>
                )}
              </div>

              {effectivePublicUrl && (
                <div className="px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-[11px] text-[#64D2FF] font-mono break-all">
                  {effectivePublicUrl}
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowClientFormModal(true)}
                className="w-full py-2.5 px-4 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-white/90 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#FF9F0A]" />
                <span>Simulează Formular Client Intern</span>
              </button>

              <p className="text-[#64D2FF]/90 text-xs">
                Through this link, you can provide your loading and delivery details, cargo specifications, temperature requirements, and your offered freight rate.
              </p>

              <p className="text-[#64D2FF]/90 text-xs">
                Our planning team will review your proposal and respond with confirmation, a counteroffer, or a polite decline.
              </p>

              <div className="pt-2 border-t border-white/[0.08] text-xs">
                <div className="text-white/60">Best regards,</div>
                <div className="font-bold text-[#64D2FF] tracking-wide mt-0.5">
                  {companyName}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="Email client destinatar..."
                className="bg-black/40 border border-white/15 rounded-full px-3.5 py-2 text-white placeholder-white/40"
              />
              <input
                type="text"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="WhatsApp (+40 / +49...)"
                className="bg-black/40 border border-white/15 rounded-full px-3.5 py-2 text-white placeholder-white/40"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyEmail}
              className="flex-1 min-w-[140px] py-2.5 px-4 rounded-full bg-white text-black font-semibold text-xs flex items-center justify-center gap-1.5 transition hover:bg-white/90 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              {copiedEmail ? 'Copiat ✓' : 'Copiază Ofertă + Link'}
            </button>
            <button
              type="button"
              disabled={isSendingNotify}
              onClick={() => void handleSendOutbound('email')}
              className="tahoe-btn-primary py-2.5 px-4 rounded-full text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>E-mail</span>
            </button>
            <button
              type="button"
              disabled={isSendingNotify}
              onClick={() => void handleSendOutbound('whatsapp')}
              className="py-2.5 px-4 rounded-full bg-[#30D158]/20 border border-[#30D158]/40 text-[#30D158] hover:bg-[#30D158]/30 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Client Portal Form Simulator */}
      {showClientFormModal && (
        <div
          onClick={() => setShowClientFormModal(false)}
          className="modal-backdrop-lock fixed inset-0 z-50 bg-black/70 backdrop-blur-xl flex items-center justify-center p-4 overscroll-contain overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="tahoe-glass-elevated rounded-[28px] max-w-lg w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto overscroll-contain"
          >
            <div className="flex flex-nowrap items-start justify-between gap-3 border-b border-white/10 pb-3">
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-semibold text-[#64D2FF] uppercase tracking-wider">
                  Portal Client · Blue Trans Spedition
                </span>
                <h3 className="text-lg font-bold text-white truncate">
                  Submit Your Shipment & Offer Your Rate
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowClientFormModal(false)}
                aria-label="Închide fereastra"
                className="w-9 h-9 rounded-full tahoe-card-inner border border-white/15 hover:bg-white/15 text-white flex items-center justify-center cursor-pointer shrink-0 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitClientSimulation} className="space-y-3.5 text-xs">
              <ClientDropdownSelect
                label="Companie Client (din Baza de Clienți)"
                value={clientName}
                onChange={setClientName}
                onSelectClientRecord={(client) => {
                  setRouteFrom(client.defaultFromCity);
                  setRouteTo(client.defaultToCity);
                  setTempReq(client.defaultTemp);
                }}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <GoogleMapsAddressInput
                  label="Încărcare"
                  required
                  value={routeFrom}
                  onChange={setRouteFrom}
                  placeholder="Ex: Viena, IZ NÖ-Süd..."
                />
                <GoogleMapsAddressInput
                  label="Descărcare"
                  required
                  value={routeTo}
                  onChange={setRouteTo}
                  placeholder="Ex: Köln, Am Eifeltor 5..."
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-white/70 font-medium mb-1">
                    LDM (Max {commercialAvailableLdm.toFixed(1)})
                  </label>
                  <input
                    type="number"
                    step="0.2"
                    min="0.4"
                    max="13.6"
                    required
                    value={ldmReq}
                    onChange={(e) => setLdmReq(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-white/70 font-medium mb-1">
                    Temp (°C)
                  </label>
                  <input
                    type="number"
                    required
                    value={tempReq}
                    onChange={(e) => setTempReq(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-white/70 font-medium mb-1">
                    Preț Oferit (€)
                  </label>
                  <input
                    type="number"
                    required
                    value={offeredPrice}
                    onChange={(e) => setOfferedPrice(Number(e.target.value))}
                    className="w-full bg-black/40 border border-[#30D158]/50 rounded-xl px-3 py-2.5 text-[#30D158] tabular-nums font-bold"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowClientFormModal(false)}
                  className="tahoe-btn-secondary px-4 py-2.5 rounded-full text-white/80 font-semibold cursor-pointer"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="tahoe-btn-primary px-5 py-2.5 rounded-full font-semibold cursor-pointer"
                >
                  Trimite Propunerea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
