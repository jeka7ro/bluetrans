import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ThermometerSnowflake,
  Truck,
  CalendarClock,
  AlertTriangle,
  Send,
  ShieldCheck,
  Sun,
  Moon,
} from 'lucide-react';
import {
  apiFetchPublicOffer,
  apiSubmitPublicOffer,
  type PublicOfferSnapshot,
} from '../data/tmsSyncClient';
import { estimateHgvRoadKm, computeCostBreakdown } from '../utils/smartLogisticsEngine';
import { GoogleMapsAddressInput } from './GoogleMapsAddressInput';
import { DynamicBrandLogo } from './DynamicBrandLogo';
import { EuroRoPlate } from './EuroRoPlate';

interface PublicClientOfferViewProps {
  token: string;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const PublicClientOfferView: React.FC<PublicClientOfferViewProps> = ({
  token,
  theme,
  onToggleTheme,
}) => {
  const [offer, setOffer] = useState<PublicOfferSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [clientName, setClientName] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [routeFrom, setRouteFrom] = useState('Viena');
  const [routeTo, setRouteTo] = useState('Rotterdam');
  const [ldmRequested, setLdmRequested] = useState('2.4');
  const [weightTons, setWeightTons] = useState('3.2');
  const [tempRequired, setTempRequired] = useState('4');
  const [offeredPriceEur, setOfferedPriceEur] = useState('550');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedResult, setSubmittedResult] = useState<{
    proposalId: string;
    detourKm: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetchPublicOffer(token)
      .then((res) => {
        if (cancelled) return;
        if (!res.ok || !res.offer) {
          setLoadError(res.error || 'Linkul de ofertare nu este valid sau a expirat.');
        } else {
          setOffer(res.offer);
          const cities = res.offer.routeSummary || [];
          if (cities.length >= 2) {
            setRouteFrom(cities[Math.min(1, cities.length - 2)] || cities[0]);
            setRouteTo(cities[cities.length - 1]);
          }
          setTempRequired(String(res.offer.tempC ?? 4));
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError('Nu s-a putut contacta serverul pentru detalii cursă.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const parsedLdm = Math.max(0.4, Math.min(13.6, Number(ldmRequested.replace(',', '.')) || 0));
  const parsedWeight = Math.max(0.1, Math.min(22, Number(weightTons.replace(',', '.')) || 1));
  const parsedTemp = Number(tempRequired.replace(',', '.')) || 4;
  const parsedPrice = Math.max(0, Number(offeredPriceEur.replace(',', '.')) || 0);

  const approxKm = estimateHgvRoadKm(routeFrom, routeTo);
  const exceedsCurrentSpace = Boolean(offer && parsedLdm > offer.availableLdm + 0.05);
  const tempWarn = Boolean(
    offer &&
      Math.abs(parsedTemp - offer.tempC) > 2 &&
      Math.abs(parsedTemp - offer.zone1Temp) > 2
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await apiSubmitPublicOffer({
        token,
        clientName: clientName.trim(),
        clientContact: clientContact.trim(),
        routeFrom: routeFrom.trim(),
        routeTo: routeTo.trim(),
        ldmRequested: parsedLdm,
        weightTons: parsedWeight,
        tempRequired: parsedTemp,
        offeredPriceEur: parsedPrice,
      });
      if (!res.ok) {
        setSubmitError(res.error || 'Eroare la trimiterea cererii.');
      } else {
        setSubmittedResult({
          proposalId: res.proposalId || 'OFERTA-NOUA',
          detourKm: res.detourKm || 0,
        });
      }
    } catch {
      setSubmitError('Conexiune întreruptă. Încearcă din nou.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-theme={theme}
      className="min-h-screen tahoe-wallpaper text-[#f5f5f7] flex flex-col"
    >
      <header className="tps-navy-header h-[74px] px-4 sm:px-6 border-b border-white/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <DynamicBrandLogo height={44} />
          <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-[11px] font-bold bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/35">
            Client Spot Capacity Portal · Live Sync
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleTheme}
          className="w-9 h-9 rounded-full tahoe-btn-secondary flex items-center justify-center cursor-pointer"
          aria-label="Schimbă tema"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-[#FF9F0A]" />
          ) : (
            <Moon className="w-4 h-4 text-[#0A84FF]" />
          )}
        </button>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {loading && (
          <div className="tahoe-glass rounded-[28px] p-8 text-center text-white/75 text-sm">
            Se încarcă capacitatea frigorifică disponibilă în timp real...
          </div>
        )}

        {!loading && loadError && (
          <div className="tahoe-glass rounded-[28px] p-8 text-center space-y-3 border border-rose-500/35">
            <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
            <h1 className="text-lg font-bold text-white">Link Ofertare Indisponibil</h1>
            <p className="text-sm text-white/70">{loadError}</p>
          </div>
        )}

        {!loading && offer && (
          <>
            {/* Redacted safe live truck summary */}
            <div className="tahoe-glass-elevated rounded-[28px] p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#64D2FF]">
                    {offer.companyName} · Capacitate Disponibilă pe Coridor
                  </span>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-0.5 flex flex-wrap items-center gap-2.5">
                    <span>{offer.routeSummary.join(' → ')}</span>
                    <EuroRoPlate plate={offer.trailerId} size="sm" />
                  </h1>
                </div>
                <span className="px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/40">
                  {offer.availableLdm.toFixed(1)} LDM Liberi
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="tahoe-card-inner rounded-2xl p-3">
                  <div className="text-white/55 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-[#64D2FF]" /> Coridor
                  </div>
                  <div className="font-bold text-white mt-1">{offer.corridorCode || 'EU West'}</div>
                </div>
                <div className="tahoe-card-inner rounded-2xl p-3">
                  <div className="text-white/55 flex items-center gap-1">
                    <ThermometerSnowflake className="w-3.5 h-3.5 text-[#64D2FF]" /> Regim Termic
                  </div>
                  <div className="font-bold text-white mt-1">
                    +{offer.tempC}°C (Z1: {offer.zone1Temp}°C)
                  </div>
                </div>
                <div className="tahoe-card-inner rounded-2xl p-3">
                  <div className="text-white/55 flex items-center gap-1">
                    <CalendarClock className="w-3.5 h-3.5 text-[#FF9F0A]" /> Încărcare
                  </div>
                  <div className="font-bold text-white mt-1">{offer.loadingWindow}</div>
                </div>
                <div className="tahoe-card-inner rounded-2xl p-3">
                  <div className="text-white/55 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#30D158]" /> Rezervă Soft-Lock
                  </div>
                  <div className="font-bold text-white mt-1">
                    {offer.softReservedLdm > 0
                      ? `${offer.softReservedLdm} LDM în evaluare`
                      : 'Spațiu liber 100%'}
                  </div>
                </div>
              </div>
            </div>

            {submittedResult ? (
              <div className="tahoe-glass-elevated rounded-[28px] p-6 sm:p-8 text-center space-y-3 border border-[#30D158]/45">
                <CheckCircle2 className="w-12 h-12 text-[#30D158] mx-auto" />
                <h2 className="text-xl font-extrabold text-white">
                  Propunere recepționată de dispecerat!
                </h2>
                <p className="text-sm text-white/75 max-w-lg mx-auto">
                  Referință <strong>{submittedResult.proposalId}</strong> · Deviere calculată pe coridor:{' '}
                  <strong>+{submittedResult.detourKm} km</strong>. Echipa {offer.companyName} a primit alerta live în Planning și revine cu confirmare sau contraofertă.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="tahoe-glass rounded-[28px] p-5 sm:p-6 space-y-4 text-xs"
              >
                <h2 className="text-base font-bold text-white">
                  Trimite cererea de transport și tariful propus
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white/75 font-semibold mb-1">
                      Nume Companie *
                    </label>
                    <input
                      type="text"
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Ex: Agrana Fresh Europe GmbH"
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-white/75 font-semibold mb-1">
                      Email / Telefon contact *
                    </label>
                    <input
                      type="text"
                      required
                      value={clientContact}
                      onChange={(e) => setClientContact(e.target.value)}
                      placeholder="logistics@companie.eu / +43..."
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <GoogleMapsAddressInput
                    label="Loc Încărcare"
                    required
                    value={routeFrom}
                    onChange={setRouteFrom}
                    placeholder="Oraș sau adresă încărcare..."
                  />
                  <GoogleMapsAddressInput
                    label="Loc Descărcare"
                    required
                    value={routeTo}
                    onChange={setRouteTo}
                    placeholder="Oraș sau adresă descărcare..."
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-white/75 font-semibold mb-1">
                      LDM Solicitat *
                    </label>
                    <input
                      type="number"
                      min="0.4"
                      max="13.6"
                      step="0.2"
                      required
                      value={ldmRequested}
                      onChange={(e) => setLdmRequested(e.target.value)}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-white tabular-nums font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-white/75 font-semibold mb-1">
                      Greutate (Tone) *
                    </label>
                    <input
                      type="number"
                      min="0.1"
                      max="22"
                      step="0.1"
                      required
                      value={weightTons}
                      onChange={(e) => setWeightTons(e.target.value)}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-white tabular-nums font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-white/75 font-semibold mb-1">
                      Temp (°C) *
                    </label>
                    <input
                      type="number"
                      required
                      value={tempRequired}
                      onChange={(e) => setTempRequired(e.target.value)}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-white tabular-nums font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-white/75 font-semibold mb-1">
                      Tarif Oferit (€) *
                    </label>
                    <input
                      type="number"
                      min="50"
                      required
                      value={offeredPriceEur}
                      onChange={(e) => setOfferedPriceEur(e.target.value)}
                      className="w-full bg-black/40 border border-[#30D158]/50 rounded-xl px-3 py-2.5 text-[#30D158] tabular-nums font-extrabold"
                    />
                  </div>
                </div>

                {(exceedsCurrentSpace || tempWarn || approxKm > 0) && (
                  <div className="p-3.5 rounded-2xl bg-black/30 border border-white/10 space-y-1 text-[11px]">
                    {approxKm > 0 && (
                      <div className="text-white/75">
                        Distanță estimată traseu client: <strong>{approxKm} km</strong> · Cost minim estimat de referință: ~{computeCostBreakdown(parsedLdm, 18).totalIncrementalEur} €
                      </div>
                    )}
                    {exceedsCurrentSpace && (
                      <div className="text-[#FF9F0A] font-semibold">
                        Atenție: cereți {parsedLdm.toFixed(1)} LDM peste cei {offer.availableLdm.toFixed(1)} LDM liberi — dispecerul poate trimite contraofertă.
                      </div>
                    )}
                    {tempWarn && (
                      <div className="text-[#FF9F0A] font-semibold">
                        Temperatură diferită față de regimul actual al remorcii (+{offer.tempC}°C / {offer.zone1Temp}°C).
                      </div>
                    )}
                  </div>
                )}

                {submitError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-200 font-semibold">
                    {submitError}
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="tahoe-btn-primary px-6 py-3 rounded-full text-xs font-extrabold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{submitting ? 'Se transmite...' : 'Trimite Propunerea către Dispecerat'}</span>
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </main>
    </div>
  );
};
