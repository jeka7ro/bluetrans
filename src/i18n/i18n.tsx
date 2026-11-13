import React, {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { Check, ChevronDown } from 'lucide-react';

export type AppLanguage = 'ro' | 'en' | 'fr' | 'de';

export interface LanguageOption {
  code: AppLanguage;
  flag: string;
  label: string;
  name: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'ro', flag: '🇷🇴', label: 'RO', name: 'Română' },
  { code: 'en', flag: '🇬🇧', label: 'EN', name: 'English' },
  { code: 'fr', flag: '🇫🇷', label: 'FR', name: 'Français' },
  { code: 'de', flag: '🇩🇪', label: 'DE', name: 'Deutsch' },
];

type TranslationTuple = [ro: string, en: string, fr: string, de: string];

/**
 * Authentic European Freight Forwarding, Road Haulage & Cold-Chain TMS Terminology Dictionary
 * Sorted automatically from longest phrase to shortest phrase at initialization.
 */
const RAW_DICTIONARY: TranslationTuple[] = [
  // ======================== APP SHELL, HEADER & NAVIGATION ========================
  [
    'Blue Trans Spedition · Sistem Integrat de Planificare, Grupaje Bi-Temp, Smart Trailer Swap și Portal Șoferi',
    'Blue Trans Spedition · Integrated Planning, Bi-Temp Groupage, Smart Trailer Swap & Driver Portal System',
    'Blue Trans Spedition · Système Intégré de Planification, Groupage Bi-Temp, Échange de Remorques et Portail Chauffeurs',
    'Blue Trans Spedition · Integriertes System für Disposition, Bi-Temp-Sammelgut, Smart Trailer Swap & Fahrerportal',
  ],
  [
    'Caută remorcă (BH 67 STS), șofer, oraș (Viena, Rotterdam)...',
    'Search trailer (BH 67 STS), driver, city (Vienna, Rotterdam)...',
    'Rechercher remorque (BH 67 STS), chauffeur, ville (Vienne, Rotterdam)...',
    'Auflieger (BH 67 STS), Fahrer, Stadt (Wien, Rotterdam) suchen...',
  ],
  [
    'Filtrează remorcă (BH 67 STS), șofer, rută...',
    'Filter trailer (BH 67 STS), driver, route...',
    'Filtrer remorque (BH 67 STS), chauffeur, itinéraire...',
    'Auflieger (BH 67 STS), Fahrer, Route filtern...',
  ],
  [
    'Acces complet: toate modulele TMS, finanțe, arhitectură și supervizare șoferi',
    'Full access: all TMS modules, finance, architecture & driver supervision',
    'Accès complet : tous les modules TMS, finances, architecture et supervision chauffeurs',
    'Vollzugriff: alle TMS-Module, Finanzen, Architektur & Fahrerüberwachung',
  ],
  [
    'Coordonează cursele, Planning 7 Zile, Grupaje, Swap și transmite instrucțiuni șoferilor',
    'Coordinates trips, 7-Day Planning, Groupage, Trailer Swap & dispatches instructions to drivers',
    'Coordonne les trajets, Planning 7 Jours, Groupage, Échange et transmet les instructions aux chauffeurs',
    'Koordiniert Touren, 7-Tage-Planung, Sammelgut, Tausch & sendet Anweisungen an Fahrer',
  ],
  [
    'Acces dedicat: Oferte Clienți, Validare CMR, Facturare și Profitabilitate Flotă',
    'Dedicated access: Client Quotes, CMR Validation, Invoicing & Fleet Profitability',
    'Accès dédié : Offres Clients, Validation CMR, Facturation et Rentabilité Flotte',
    'Dedizierter Zugriff: Kundenangebote, CMR-Prüfung, Abrechnung & Flottenrentabilität',
  ],
  [
    'Vede EXCLUSIV ruta atribuită lui, fișa tehnică a camionului și Adminul acelei curse',
    'Sees EXCLUSIVELY their assigned route, truck technical sheet & Trip Dispatcher',
    'Voit EXCLUSIVEMENT son itinéraire attribué, la fiche technique du camion et le Dispatcheur',
    'Sieht AUSSCHLIESSLICH die zugewiesene Route, das LKW-Datenblatt und den Disponenten',
  ],
  ['Administrator General (Acces Complet TMS)', 'General Administrator (Full TMS Access)', 'Administrateur Général (Accès Complet TMS)', 'Hauptadministrator (Vollzugriff TMS)'],
  ['Admin Cursă / Dispecer Coordonator (Planning, Grupaj, Swap & Șoferi)', 'Trip Admin / Lead Dispatcher (Planning, Groupage, Swap & Drivers)', 'Dispatcheur Coordonnateur (Planning, Groupage, Échange & Chauffeurs)', 'Tourenleiter / Leitender Disponent (Planung, Sammelgut, Tausch & Fahrer)'],
  ['Financiar & Facturare (Oferte, CMR, Profitabilitate)', 'Finance & Invoicing (Quotes, CMR, Profitability)', 'Finances & Facturation (Offres, CMR, Rentabilité)', 'Finanzen & Abrechnung (Angebote, CMR, Rentabilität)'],
  ['Administrator General', 'General Administrator', 'Administrateur Général', 'Hauptadministrator'],
  ['Director Operațiuni & Flotă · Oradea (BH)', 'Operations & Fleet Director · Oradea (BH)', 'Directeur Opérations & Flotte · Oradea (BH)', 'Betriebs- & Flottenleiter · Oradea (BH)'],
  ['Director Operațiuni', 'Operations Director', 'Directeur des Opérations', 'Betriebsleiter'],
  ['Admin Cursă / Dispecer', 'Trip Admin / Dispatcher', 'Dispatcheur / Resp. Trajet', 'Tourenleiter / Disponent'],
  ['Admin Cursă Vest', 'West Corridor Dispatcher', 'Dispatcheur Corridor Ouest', 'Disponent Korridor West'],
  ['Financiar & Facturare', 'Finance & Invoicing', 'Finances & Facturation', 'Finanzen & Abrechnung'],
  ['Facturare & CMR', 'Invoicing & CMR', 'Facturation & CMR', 'Abrechnung & CMR'],
  ['Șofer Camion', 'HGV Truck Driver', 'Chauffeur Poids Lourd', 'LKW-Fahrer'],
  ['Comută pe Modul Luminos', 'Switch to Light Mode', 'Passer au Mode Clair', 'Zum hellen Modus wechseln'],
  ['Comută pe Modul Întunecat', 'Switch to Dark Mode', 'Passer au Mode Sombre', 'Zum dunklen Modus wechseln'],
  ['Mod Luminos', 'Light Mode', 'Mode Clair', 'Heller Modus'],
  ['Mod Întunecat', 'Dark Mode', 'Mode Sombre', 'Dunkler Modus'],
  ['Schimbă tema', 'Toggle theme', 'Changer le thème', 'Design wechseln'],
  ['Deconectare', 'Sign Out', 'Déconnexion', 'Abmelden'],
  ['Planning 7 Zile', '7-Day Planning', 'Planning 7 Jours', '7-Tage-Planung'],
  ['Planificare 7 Zile', '7-Day Planning', 'Planning 7 Jours', '7-Tage-Planung'],
  ['Calendar & Drag-Drop', 'Calendar & Drag-Drop', 'Calendrier & Glisser-Déposer', 'Kalender & Drag-and-Drop'],
  ['7 Zile', '7 Days', '7 Jours', '7 Tage'],
  ['Urmărire Live', 'Live GPS Tracking', 'Suivi GPS en Direct', 'Live-GPS-Ortung'],
  ['Hartă Live', 'Live Map', 'Carte Live', 'Live-Karte'],
  ['GPS · Autostrăzi HGV', 'GPS · HGV Motorways', 'GPS · Autoroutes PL', 'GPS · LKW-Autobahnen'],
  ['8 Criterii · Transfer', '8 Criteria · Cross-Dock', '8 Critères · Transbordement', '8 Kriterien · Cross-Dock'],
  ['4 Scenarii · Tahograf', '4 Scenarios · Tachograph', '4 Scénarios · Tachygraphe', '4 Szenarien · Tachograph'],
  ['Portal Șofer (Cabină)', 'Driver Portal (In-Cab)', 'Portail Chauffeur (Cabine)', 'Fahrerportal (Fahrerhaus)'],
  ['Rută · Tehnic · Admin Cursă', 'Route · Tech Sheet · Dispatcher', 'Itinéraire · Fiche Tech · Dispatcheur', 'Route · Technik · Disponent'],
  ['Oferte Clienți', 'Client Quotes', 'Offres Clients', 'Kundenangebote'],
  ['E-mail & Soft-Lock', 'Email & Soft-Lock', 'E-mail & Réservation Souple', 'E-Mail & Soft-Lock'],
  ['Comenzi & Curse', 'Orders & Trips', 'Commandes & Trajets', 'Aufträge & Touren'],
  ['Flotă, Șoferi & Facturi', 'Fleet, Drivers & Billing', 'Flotte, Chauffeurs & Factures', 'Flotte, Fahrer & Rechnungen'],
  ['Euro 6 · Km · ITP · CMR', 'Euro 6 · Mileage · MOT · CMR', 'Euro 6 · Km · CT · CMR', 'Euro 6 · Km · TÜV · CMR'],
  ['Clienți & Contracte', 'Clients & Contracts', 'Clients & Contrats', 'Kunden & Verträge'],
  ['Bază Clienți · Tarife', 'Client Database · Rates', 'Base Clients · Tarifs', 'Kundenstamm · Tarife'],
  ['Analiză & Scenarii', 'Analysis & Scenarios', 'Analyse & Scénarios', 'Analyse & Szenarien'],
  ['Arhitectură & Scenarii', 'Architecture & Scenarios', 'Architecture & Scénarios', 'Architektur & Szenarien'],
  ['+ Comandă nouă', '+ New Order', '+ Nouvelle Commande', '+ Neuer Auftrag'],
  ['+ Comandă', '+ New Order', '+ Commande', '+ Auftrag'],
  ['Operațional', 'Operations', 'Opérationnel', 'Operativ'],
  ['De făcut azi', 'Today’s Tasks', 'À faire aujourd’hui', 'Heute zu erledigen'],
  ['Planificare', 'Planning', 'Planification', 'Planung'],
  ['Comenzi & curse', 'Orders & Trips', 'Commandes & trajets', 'Aufträge & Touren'],
  ['Flotă', 'Fleet', 'Flotte', 'Flotte'],
  ['Camioane · ITP · Acte', 'Trucks · MOT · Docs', 'Camions · CT · Docs', 'LKW · TÜV · Dokumente'],
  ['Clienți', 'Clients', 'Clients', 'Kunden'],
  ['Contracte · Tarife · Coridoare', 'Contracts · Rates · Corridors', 'Contrats · Tarifs · Corridors', 'Verträge · Tarife · Korridore'],
  ['Șoferi', 'Drivers', 'Chauffeurs', 'Fahrer'],
  ['Documente · Tahograf · CE 561', 'Docs · Tachograph · EC 561', 'Documents · Tachy · CE 561', 'Dokumente · Tacho · VO 561'],
  ['Facturare', 'Invoicing', 'Facturation', 'Abrechnung'],
  ['Facturi', 'Billing', 'Factures', 'Rechnungen'],
  ['Facturi · CMR · e-Factura XML', 'Invoices · CMR · e-Invoice XML', 'Factures · CMR · e-Facture XML', 'Rechnungen · CMR · E-Rechnung XML'],
  ['Integrări & SaaS', 'Integrations & SaaS', 'Intégrations & SaaS', 'Integrationen & SaaS'],
  ['Utilizatori', 'Users', 'Utilisateurs', 'Benutzer'],
  ['Mai mult', 'More', 'Plus', 'Mehr'],

  // ======================== LOGIN VIEW ========================
  ['PORTAL SECURIZAT PE ROLURI (RBAC)', 'ROLE-BASED SECURE PORTAL (RBAC)', 'PORTAIL SÉCURISÉ PAR RÔLES (RBAC)', 'ROLLENBASIERTES SICHERHEITSPORTAL (RBAC)'],
  ['Selectează tipul de portal:', 'Select portal mode:', 'Sélectionnez le type de portail :', 'Portaltyp auswählen:'],
  ['Dispecerat / Admin / Financiar', 'Dispatch / Admin / Finance', 'Exploitation / Admin / Finances', 'Disposition / Admin / Finanzen'],
  ['Dispecerat & Admin', 'Dispatch & Admin', 'Exploitation & Admin', 'Disposition & Admin'],
  ['Cabina Șoferului (rută & fișă tehnică proprie)', 'Driver In-Cab Portal (own route & vehicle tech sheet)', 'Cabine Chauffeur (itinéraire & fiche technique propre)', 'Fahrerhaus-Portal (eigene Route & Fahrzeugdatenblatt)'],
  ['Grad de Acces / Rol Operațional', 'Access Level / Operational Role', 'Niveau d’Accès / Rôle Opérationnel', 'Zugriffsstufe / Betriebsrolle'],
  ['E-mail Instituțional Blue Trans', 'Blue Trans Corporate Email', 'E-mail Professionnel Blue Trans', 'Blue Trans Firmen-E-Mail'],
  ['Parolă Cont', 'Account Password', 'Mot de Passe', 'Kontopasswort'],
  ['Autentificare în Sistem', 'Sign In to TMS', 'Connexion au Système', 'Im System anmelden'],
  ['Selectează Camionul / Semiremorca Atribuită Șoferului', 'Select Assigned Truck / Refrigerated Trailer', 'Sélectionnez le Camion / Semi-Remorque Attribué', 'Zugewiesenen LKW / Kühlauflieger auswählen'],
  ['Cod PIN Card Tahograf / Cabină (4 cifre)', 'Tachograph Card / In-Cab PIN (4 digits)', 'Code PIN Carte Tachygraphe / Cabine (4 chiffres)', 'Tachographenkarten- / Kabinen-PIN (4 Ziffern)'],
  ['Introdu codul PIN Tahograf (4 cifre) al șoferului.', 'Please enter the driver’s 4-digit Tachograph PIN.', 'Veuillez saisir le code PIN Tachygraphe (4 chiffres) du chauffeur.', 'Bitte geben Sie die 4-stellige Tachographen-PIN des Fahrers ein.'],
  ['Te rugăm să introduci adresa de e-mail și parola contului.', 'Please enter your corporate email address and password.', 'Veuillez saisir votre adresse e-mail et votre mot de passe.', 'Bitte geben Sie Ihre E-Mail-Adresse und Ihr Passwort ein.'],
  ['CONTURI ACTIVE ÎN PLATFORMĂ · AUTENTIFICARE 1-CLICK SAU ÎN FORMULAR', 'ACTIVE PLATFORM ACCOUNTS · 1-CLICK DEMO LOGIN OR FORM SIGN-IN', 'COMPTES ACTIFS · CONNEXION 1-CLIC OU FORMULAIRE', 'AKTIVE KONTEN · 1-KLICK-LOGIN ODER FORMULARANMELDUNG'],
  ['1. Grade Administrative, Dispecerat (Admini de Cursă) & Financiar', '1. Executive Management, Dispatchers (Trip Admins) & Finance', '1. Direction, Exploitation (Dispatcheurs) & Finances', '1. Geschäftsführung, Disposition (Tourenleiter) & Finanzen'],
  ['2. Conturi Șoferi Flotă (7 Ansambluri Active + Adminul Cursei)', '2. Fleet Driver Accounts (7 Active Combinations + Trip Dispatcher)', '2. Comptes Chauffeurs Flotte (7 Ensembles Actifs + Dispatcheur)', '2. Flottenfahrer-Konten (7 Aktive Züge + Tourenleiter)'],
  ['ADMIN CURSĂ / DISPECER VEST', 'WEST CORRIDOR DISPATCHER', 'DISPATCHEUR CORRIDOR OUEST', 'DISPONENT KORRIDOR WEST'],
  ['ADMIN CURSĂ / DISPECER NORD & EXPRESS', 'NORTH & EXPRESS DISPATCHER', 'DISPATCHEUR NORD & EXPRESS', 'DISPONENT NORD & EXPRESS'],
  ['Admin Cursă Coridor AT / DE / NL (BH 67 STS, BH 69 STS, BH 74 STS)', 'Corridor AT / DE / NL Dispatcher (BH 67 STS, BH 69 STS, BH 74 STS)', 'Dispatcheur Corridor AT / DE / NL (BH 67 STS, BH 69 STS, BH 74 STS)', 'Disponent Korridor AT / DE / NL (BH 67 STS, BH 69 STS, BH 74 STS)'],
  ['Admin Cursă Scandinavia & Express (BH 75 STS, BH 91 STS, BH 23/31 STS)', 'Scandinavia & Express Dispatcher (BH 75 STS, BH 91 STS, BH 23/31 STS)', 'Dispatcheur Scandinavie & Express (BH 75 STS, BH 91 STS, BH 23/31 STS)', 'Disponent Skandinavien & Express (BH 75 STS, BH 91 STS, BH 23/31 STS)'],
  ['Acces dedicat pe Oferte Clienți (marjă & contribuție netă), Comenzi & CMR, Flotă & Emitere Facturi.', 'Dedicated access to Client Quotes (margin & net contribution), Orders & CMR, Fleet & Invoicing.', 'Accès dédié aux Offres Clients (marge & contribution nette), Commandes & CMR, Flotte & Facturation.', 'Dedizierter Zugriff auf Kundenangebote (Marge & Deckungsbeitrag), Aufträge & CMR, Flotte & Rechnungsstellung.'],
  ['Intră direct →', 'Instant Login →', 'Connexion directe →', 'Direkt anmelden →'],
  ['Cabină →', 'In-Cab →', 'Cabine →', 'Kabine →'],

  // ======================== CONTROL CENTER & LIVE MAP ========================
  [
    'Control Center & Grupaje Frigorifice Bi-Temp',
    'Control Center & Bi-Temp Refrigerated Groupage',
    'Centre de Contrôle & Groupage Frigorifique Bi-Temp',
    'Leitstelle & Bi-Temp-Kühlsammelgut',
  ],
  [
    'Control Center & Grupaje Frigo Bi-Temp',
    'Control Center & Bi-Temp Cold-Chain Groupage',
    'Centre de Contrôle & Groupage Frigo Bi-Temp',
    'Leitstelle & Bi-Temp-Kühlsammelgut',
  ],
  [
    'Vezi dintr-o privire direcția fiecărei remorci, descărcările pe traseu, metrii de podea (LDM) disponibili și oportunitățile de grupaj sau schimb de remorcă.',
    'Monitor at a glance every trailer direction, en-route unloadings, available loading meters (LDM), and groupage or trailer swap opportunities.',
    'Visualisez en un coup d’œil la direction de chaque remorque, les déchargements en route, les mètres de plancher (LDM) disponibles et les opportunités de groupage ou d’échange.',
    'Überblicken Sie auf einen Blick jede Aufliegerrichtung, Zwischenentladungen, freie Lademeter (LDM) sowie Sammelgut- und Auflieger-Tausch-Optionen.',
  ],
  [
    'Vezi dintr-o privire direcția fiecărei remorci, descărcările programate și spațiul liber în LDM pe ambele zone de temperatură.',
    'View at a glance each trailer’s corridor, scheduled unloadings, and available LDM floor space across both temperature zones.',
    'Visualisez en un coup d’œil la direction de chaque remorque, les déchargements prévus et l’espace LDM libre sur les deux zones de température.',
    'Sehen Sie auf einen Blick die Richtung jedes Aufliegers, geplante Entladungen und freie Lademeter (LDM) in beiden Temperaturzonen.',
  ],
  ['Remorci pe traseu', 'Trailers En Route', 'Remorques en Route', 'Auflieger unterwegs'],
  ['Active în UE', 'Active in EU', 'Actives dans l’UE', 'Aktiv in der EU'],
  ['LDM liberi acum', 'Free LDM Now', 'LDM disponibles', 'Freie LDM aktuell'],
  ['LDM disponibili', 'Available LDM', 'LDM disponibles', 'Verfügbare LDM'],
  ['Cu spațiu liber', 'With free space', 'Avec espace libre', 'Mit freiem Laderaum'],
  ['Pe 7 vehicule', 'Across 7 vehicles', 'Sur 7 véhicules', 'Auf 7 Fahrzeugen'],
  ['Curând libere', 'Releasing Soon', 'Bientôt disponibles', 'Bald verfügbar'],
  ['În 24–48h', 'Within 24–48h', 'Sous 24–48h', 'In 24–48 Std.'],
  ['Curse în lucru', 'Active Trips', 'Trajets en cours', 'Aktive Touren'],
  ['+14% eficiență', '+14% efficiency', '+14 % d’efficacité', '+14 % Effizienz'],
  ['Alerte urgente', 'Urgent Alerts', 'Alertes urgentes', 'Dringende Warnungen'],
  [
    'URMĂRIRE LIVE · TRASEE RUTIERE CAMIOANE (AUTOSTRĂZI TEN-T / HGV)',
    'LIVE GPS TRACKING · HGV TRUCK CORRIDORS (TEN-T MOTORWAYS)',
    'SUIVI GPS EN DIRECT · CORRIDORS ROUTIERS POIDS LOURDS (AUTOROUTES TEN-T / PL)',
    'LIVE-GPS-ORTUNG · LKW-FERNVERKEHRSROUTEN (TEN-T-AUTOBAHNEN / HGV)',
  ],
  [
    'Monitorizare GPS Cargo Track, Coridoare Rutiere OSRM & Senzori Frigo Bi-Temp',
    'Cargo Track GPS Telemetry, OSRM HGV Corridors & Bi-Temp Reefer Sensors',
    'Télématique GPS Cargo Track, Corridors Routiers OSRM & Capteurs Frigo Bi-Temp',
    'Cargo Track GPS-Telemetrie, OSRM-LKW-Korridore & Bi-Temp-Kühlsensoren',
  ],
  [
    'Trasee Rutiere Camioane (Autostrăzi TEN-T / HGV)',
    'HGV Truck Road Routes (TEN-T Motorways)',
    'Itinéraires Routiers Poids Lourds (Autoroutes TEN-T / PL)',
    'LKW-Straßenrouten (TEN-T-Autobahnen / HGV)',
  ],
  ['Coridoare rutiere reale:', 'Real motorway corridors:', 'Corridors routiers réels :', 'Reale Autobahnkorridore:'],
  ['Traseu Rutier Camioane (OSRM HGV)', 'HGV Truck Route (OSRM)', 'Itinéraire Poids Lourds (OSRM)', 'LKW-Straßenroute (OSRM HGV)'],
  ['Traseu Rutier Camioane', 'HGV Truck Route', 'Itinéraire Poids Lourds', 'LKW-Straßenroute'],
  ['© OpenStreetMap · Rutare Autostrăzi HGV', '© OpenStreetMap · HGV Motorway Routing', '© OpenStreetMap · Routage Autoroutes PL', '© OpenStreetMap · LKW-Autobahnrouting'],
  [
    '● Zoom mouse / trackpad activ',
    '● Mouse / trackpad zoom active',
    '● Zoom souris / pavé tactile actif',
    '● Maus- / Trackpad-Zoom aktiv',
  ],
  [
    'Click pe hartă pt. zoom din mouse / trackpad',
    'Click map to enable mouse / trackpad zoom',
    'Cliquez sur la carte pour activer le zoom souris / trackpad',
    'Klicken Sie auf die Karte für Maus- / Trackpad-Zoom',
  ],
  [
    'Activează / Dezactivează Radar Meteo AccuWeather (Ploi, Ninsoare & Curenți de Vânt)',
    'Toggle AccuWeather Radar Overlay (Rain, Snow & Wind Streams)',
    'Activer / Désactiver le Radar Météo AccuWeather (Pluie, Neige & Courants de Vent)',
    'AccuWeather-Wetterradar ein-/ausschalten (Regen, Schnee & Windströmungen)',
  ],
  ['Vreme (Ploi & Vânt): ON', 'Weather (Rain & Wind): ON', 'Météo (Pluie & Vent) : ON', 'Wetter (Regen & Wind): EIN'],
  ['Vreme (Ploi & Vânt): OFF', 'Weather (Rain & Wind): OFF', 'Météo (Pluie & Vent) : OFF', 'Wetter (Regen & Wind): AUS'],
  ['Închide Full Screen', 'Exit Full Screen', 'Quitter le plein écran', 'Vollbild schließen'],
  ['Ploaie ușoară', 'Light rain', 'Pluie faible', 'Leichter Regen'],
  ['Averse / Ploaie', 'Showers / Rain', 'Averses / Pluie', 'Schauer / Regen'],
  ['Lapoviță / Ninsoare', 'Sleet / Snow', 'Neige fondue / Neige', 'Schneeregen / Schnee'],
  ['Curenți Vânt (km/h)', 'Wind Streams (km/h)', 'Courants de vent (km/h)', 'Windströmungen (km/h)'],
  ['🌧️ Front Ploaie A3/A61 (80% precip.)', '🌧️ Rain Front A3/A61 (80% precip.)', '🌧️ Front de Pluie A3/A61 (80 % précip.)', '🌧️ Regenfront A3/A61 (80 % Niederschlag)'],
  ['🌧️ Averse & Vânt Marea Nordului (A1/A12)', '🌧️ North Sea Showers & Wind (A1/A12)', '🌧️ Averses & Vent Mer du Nord (A1/A12)', '🌧️ Nordsee-Schauer & Wind (A1/A12)'],
  ['🌬️ Rafale Vânt 42 km/h & Ploaie (Pod Øresund)', '🌬️ Wind Gusts 42 km/h & Rain (Øresund Bridge)', '🌬️ Rafales 42 km/h & Pluie (Pont de l’Øresund)', '🌬️ Windböen 42 km/h & Regen (Öresundbrücke)'],
  ['❄️ Front Lapoviță & Ninsoare Suedia (E4)', '❄️ Sleet & Snow Front Sweden (E4)', '❄️ Front Neige Fondue & Neige Suède (E4)', '❄️ Schneeregen- & Schneefront Schweden (E4)'],
  ['☀️ Cer Senin & Carosabil Uscat (M35/M3)', '☀️ Clear Sky & Dry Roadway (M35/M3)', '☀️ Ciel Dégagé & Chaussée Sèche (M35/M3)', '☀️ Klarer Himmel & Trockene Fahrbahn (M35/M3)'],
  ['🌬️ Vânt V-SV 38 km/h', '🌬️ W-SW Wind 38 km/h', '🌬️ Vent O-SO 38 km/h', '🌬️ Wind W-SW 38 km/h'],
  ['🌬️ Rafale Pod 42 km/h', '🌬️ Bridge Gusts 42 km/h', '🌬️ Rafales Pont 42 km/h', '🌬️ Brückenböen 42 km/h'],
  ['❄️ Vânt Polar 34 km/h', '❄️ Polar Wind 34 km/h', '❄️ Vent Polaire 34 km/h', '❄️ Polarwind 34 km/h'],
  ['🌬️ Curenți Vest 28 km/h', '🌬️ Westerly Streams 28 km/h', '🌬️ Courants Ouest 28 km/h', '🌬️ Westströmung 28 km/h'],
  ['🌬️ Vânt Ușor 18 km/h', '🌬️ Light Breeze 18 km/h', '🌬️ Vent Léger 18 km/h', '🌬️ Leichter Wind 18 km/h'],
  ['Toate Cursele', 'All Trips', 'Tous les Trajets', 'Alle Touren'],
  ['Toată Flota', 'Entire Fleet', 'Toute la Flotte', 'Gesamte Flotte'],
  ['7.750 km tehnici', '7,750 tech km', '7 750 km techniques', '7.750 Technik-km'],
  ['Distanță tehnică:', 'Technical distance:', 'Distance technique :', 'Technische Strecke:'],
  ['Perioadă tranzit:', 'Transit window:', 'Période de transit :', 'Transitzeitraum:'],
  ['Parcurs:', 'Driven:', 'Parcouru :', 'Gefahren:'],
  ['Rămas:', 'Remaining:', 'Restant :', 'Verbleibend:'],
  ['În tranzit', 'In transit', 'En transit', 'Im Transit'],
  ['La descărcare', 'At unloading dock', 'En déchargement', 'Beim Entladen'],
  ['Încărcare grupaj', 'Groupage loading', 'Chargement groupage', 'Sammelgut-Beladung'],
  ['Senin · Uscat', 'Clear · Dry road', 'Dégagé · Sec', 'Klar · Trocken'],
  ['Parțial noros', 'Partly cloudy', 'Partiellement nuageux', 'Teilweise bewölkt'],
  ['Vânt de coastă', 'Coastal wind', 'Vent côtier', 'Küstenwind'],
  ['Averse A3/A5', 'Showers A3/A5', 'Averses A3/A5', 'Schauer A3/A5'],
  ['Vânt moderat', 'Moderate wind', 'Vent modéré', 'Mäßiger Wind'],
  ['Vânt 42 km/h', 'Wind 42 km/h', 'Vent 42 km/h', 'Wind 42 km/h'],
  ['Lapoviță · E4', 'Sleet · E4', 'Neige fondue · E4', 'Schneeregen · E4'],
  ['Lapoviță ușoară', 'Light sleet', 'Neige fondue faible', 'Leichter Schneeregen'],
  ['Nori trecători', 'Passing clouds', 'Nuages passagers', 'Durchziehende Wolken'],
  ['Burniță A8', 'Drizzle A8', 'Bruine A8', 'Nieselregen A8'],
  ['Ploaie E45', 'Rain E45', 'Pluie E45', 'Regen E45'],
  ['Senin / Nori', 'Fair / Clouds', 'Clair / Nuageux', 'Heiter / Bewölkt'],
  ['Detalii Bi-Temp →', 'Bi-Temp Details →', 'Détails Bi-Temp →', 'Bi-Temp-Details →'],
  ['3 Puncte Swap', '3 Swap Hubs', '3 Points d’Échange', '3 Tausch-Hubs'],
  [
    'Remorci active, trasee și LDM liberi',
    'Active trailers, routes & available LDM',
    'Remorques actives, itinéraires et LDM disponibles',
    'Aktive Auflieger, Routen & freie LDM',
  ],
  [
    '→ Direcție planificată și descărcări pe traseu',
    '→ Planned corridor & en-route unloadings',
    '→ Direction planifiée et déchargements en route',
    '→ Geplante Richtung & Zwischenentladungen',
  ],
  ['Spațiu disponibil', 'Space available', 'Espace disponible', 'Laderaum verfügbar'],
  ['Aproape completă', 'Nearly full', 'Presque complet', 'Fast ausgelastet'],
  ['CE PRIMEȘTE DISPECERUL', 'DISPATCHER INBOX', 'BOÎTE DE RÉCEPTION DISPATCH', 'DISPONENTEN-EINGANG'],
  ['Ce primește dispecerul', 'Dispatcher Inbox', 'Boîte de réception dispatcheur', 'Disponenten-Eingang'],
  ['Preț oferit clientului', 'Price quoted to client', 'Prix proposé au client', 'Angebotspreis für Kunden'],
  ['Preț oferit', 'Offered Rate', 'Prix proposé', 'Angebotspreis'],
  ['Cost suplimentar', 'Incremental cost', 'Coût supplémentaire', 'Zusatzkosten'],
  ['Contribuție estimată', 'Estimated net margin', 'Contribution nette estimée', 'Geschätzter Deckungsbeitrag'],
  ['Contribuție est.', 'Est. net margin', 'Contrib. nette est.', 'Gesch. Deckungsbeitrag'],
  ['Ofertă trimisă · Soft-Lock activ', 'Quote sent · Soft-Lock active', 'Offre envoyée · Soft-Lock actif', 'Angebot gesendet · Soft-Lock aktiv'],
  ['Detalii & Conflict →', 'Details & Conflict →', 'Détails & Conflit →', 'Details & Konflikt →'],
  ['Recomandări grupaj pe traseu', 'En-route groupage matches', 'Recommandations de groupage en route', 'Sammelgut-Empfehlungen auf der Route'],
  ['Vezi toate →', 'View all →', 'Voir tout →', 'Alle anzeigen →'],

  // ======================== PLANNING 7 DAYS & MODAL ========================
  ['NOIEMBRIE 2026', 'NOVEMBER 2026', 'NOVEMBRE 2026', 'NOVEMBER 2026'],
  [
    'Click pe orice celulă pt. Creare Rapidă · Drag & Drop activ',
    'Click any cell for Quick Create · Drag & Drop active',
    'Cliquez sur une cellule pour Création Rapide · Glisser-Déposer actif',
    'Zelle anklicken für Schnellerstellung · Drag & Drop aktiv',
  ],
  ['9 – 15 Noi 2026', '9 – 15 Nov 2026', '9 – 15 Nov 2026', '9. – 15. Nov. 2026'],
  ['Albastru (Confirmate)', 'Blue (Confirmed FTL)', 'Bleu (Confirmé)', 'Blau (Bestätigt)'],
  ['Galben (Descărcare / Parțial)', 'Amber (Unloading / Partial)', 'Jaune (Déchargement / Partiel)', 'Gelb (Entladung / Teilpartie)'],
  ['Verde (Grupaj Activ)', 'Green (Active Groupage)', 'Vert (Groupage Actif)', 'Grün (Aktives Sammelgut)'],
  ['Mov (Prioritar / Swap)', 'Purple (Priority / Swap)', 'Violet (Prioritaire / Échange)', 'Violett (Priorität / Tausch)'],
  ['COMENZI ÎN AȘTEPTARE', 'UNASSIGNED ORDERS', 'COMMANDES EN ATTENTE', 'OFFENE AUFTRÄGE'],
  ['CAMIOANE & REMORCI (ECHIPE)', 'TRUCKS & TRAILERS (CREWS)', 'CAMIONS & REMORQUES (ÉQUIPAGES)', 'ZUGMASCHINEN & AUFLIEGER (TEAMS)'],
  ['Trage un camion peste lucrare / cursă.', 'Drag a truck onto any shipment / slot.', 'Glissez un camion sur un trajet / créneau.', 'Ziehen Sie einen LKW auf einen Auftrag / Slot.'],
  ['CREARE RAPIDĂ ÎN CELULĂ', 'QUICK CELL SHIPMENT CREATION', 'CRÉATION RAPIDE DANS LA CELLULE', 'SCHNELLERSTELLUNG IN DER ZELLE'],
  ['Creare rapidă', 'Quick create', 'Création rapide', 'Schnellerstellung'],
  ['Disponibil', 'Available', 'Disponible', 'Verfügbar'],
  [
    'DETALII COMPLETE PARTIDĂ MARFĂ & CURSĂ',
    'COMPLETE CARGO SHIPMENT & TRIP DETAILS',
    'DÉTAILS COMPLETS DU LOT DE MARCHANDISE & TRAJET',
    'VOLLSTÄNDIGE FRACHTPARTIE- & TOURENDETAILS',
  ],
  ['Alocat pe ansamblul', 'Assigned to vehicle combination', 'Attribué à l’ensemble routier', 'Zugewiesen an Sattelzug'],
  ['SPAȚIU OCUPAT (LDM)', 'OCCUPIED FLOOR SPACE (LDM)', 'ESPACE PLANCHER OCCUPÉ (LDM)', 'BELEGTER LADERAUM (LDM)'],
  ['TONAJ & PALEȚI', 'WEIGHT & PALLETS', 'TONNAGE & PALETTES', 'GEWICHT & PALETTEN'],
  ['REGIM TERMIC CERUT', 'REQUIRED TEMPERATURE', 'RÉGIME THERMIQUE REQUIS', 'SOLL-TEMPERATUR'],
  ['Distanță / Ocol:', 'Distance / Detour:', 'Distance / Détour :', 'Strecke / Umweg:'],
  ['CONTRIBUȚIE NETĂ EST.', 'EST. NET CONTRIBUTION', 'CONTRIBUTION NETTE EST.', 'GESCH. DECKUNGSBEITRAG'],
  [
    'MODIFICARE RAPIDĂ ALOCARE CAMION, ZI SAU ORĂ',
    'QUICK REASSIGNMENT OF TRUCK, DAY OR TIME SLOT',
    'MODIFICATION RAPIDE CAMION, JOUR OU CRÉNEAU HORAIRE',
    'SCHNELLÄNDERUNG VON LKW, TAG ODER ZEITFENSTER',
  ],
  ['Ansamblu (Cap Tractor + Remorcă)', 'Vehicle Combination (Tractor + Trailer)', 'Ensemble (Tracteur + Remorque)', 'Sattelzug (Zugmaschine + Auflieger)'],
  ['Ansamblu (Tractor + Remorcă)', 'Combination (Tractor + Trailer)', 'Ensemble (Tracteur + Remorque)', 'Zugkombination (Zugmaschine + Auflieger)'],
  ['Ziua Planificată', 'Planned Day', 'Jour Planifié', 'Geplanter Tag'],
  ['Ora Planificată', 'Planned Time Slot', 'Heure Planifiée', 'Geplante Uhrzeit'],
  [
    'TRASEUL COMPLET AL CURSEI',
    'COMPLETE TRIP ROUTE',
    'ITINÉRAIRE COMPLET DU TRAJET',
    'KOMPLETTE TOURENROUTE',
  ],
  ['& HARTA RUTIERĂ LIVE', '& LIVE ROAD MAP', '& CARTE ROUTIÈRE LIVE', '& LIVE-STRASSENKARTE'],
  ['Liber actual:', 'Currently free:', 'Disponible actuel :', 'Aktuell frei:'],
  ['Tahograf șofer:', 'Driver tachograph:', 'Tachygraphe chauffeur :', 'Fahrer-Tachograph:'],
  ['Marchează În Lucru', 'Mark In Progress', 'Marquer En Cours', 'Als In Arbeit markieren'],
  ['Marchează Operat / Încărcat', 'Mark Operated / Loaded', 'Marquer Opéré / Chargé', 'Als Verladen markieren'],
  ['Print CMR', 'Print CMR', 'Imprimer CMR', 'CMR drucken'],
  ['Factură Proformă', 'Proforma Invoice', 'Facture Proforma', 'Proforma-Rechnung'],
  ['Șterge din Celulă', 'Remove from Cell', 'Supprimer de la cellule', 'Aus Zelle löschen'],
  ['Salvează & Închide', 'Save & Close', 'Enregistrer & Fermer', 'Speichern & Schließen'],
  ['SIMULATOR COMPARTIMENTARE BI-TEMP 13.6M & LDM PE SEGMENTE', '13.6M BI-TEMP COMPARTMENT & SEGMENT LDM SIMULATOR', 'SIMULATEUR COMPARTIMENTAGE BI-TEMP 13,6 M & LDM PAR SEGMENT', '13,6-M-BI-TEMP-TRENNWAND- & SEGMENT-LDM-SIMULATOR'],

  // ======================== SMART GROUPAGE (8 CRITERIA) ========================
  ['Motor Inteligent de Grupaj (8 Criterii)', 'Smart Groupage Engine (8 Criteria)', 'Moteur de Groupage Intelligent (8 Critères)', 'Intelligente Sammelgut-Engine (8 Kriterien)'],
  [
    'Identifică automat remorcile compatibile pe cele 8 criterii, compară variantele înainte de confirmare și propune transferuri de marfă între remorci.',
    'Automatically matches compatible trailers across 8 criteria, compares options before confirmation, and suggests cross-dock cargo transfers.',
    'Identifie automatiquement les remorques compatibles selon 8 critères, compare les variantes avant confirmation et propose des transbordements.',
    'Ermittelt automatisch kompatible Auflieger anhand von 8 Kriterien, vergleicht Optionen vor der Bestätigung und schlägt Cross-Dock-Umladungen vor.',
  ],
  ['Recomandări Grupaj (8 Criterii AI)', 'Groupage Matches (8 AI Criteria)', 'Recommandations Groupage (8 Critères IA)', 'Sammelgut-Empfehlungen (8 KI-Kriterien)'],
  ['Comparație Multi-Variantă & Transfer Marfă', 'Multi-Option Comparison & Cargo Transfer', 'Comparaison Multi-Variantes & Transbordement', 'Mehrvarianten-Vergleich & Frachtumschlag'],
  ['Comparator Multi-Variantă (8 Criterii)', 'Multi-Option Comparator (8 Criteria)', 'Comparateur Multi-Variantes (8 Critères)', 'Mehrvarianten-Vergleich (8 Kriterien)'],
  ['Compară variantele compatibile înainte de confirmare', 'Compare compatible trailer options before confirming', 'Comparez les variantes compatibles avant confirmation', 'Kompatible Aufliegeroptionen vor Bestätigung vergleichen'],
  ['Transfer de Marfă între Remorci (Cross-Dock)', 'Trailer-to-Trailer Cargo Transfer (Cross-Dock)', 'Transbordement de Marchandise entre Remorques (Cross-Dock)', 'Frachtumschlag zwischen Aufliegern (Cross-Dock)'],
  ['Consolidare grupaje în puncte permise și fezabile', 'Consolidate groupage shipments at authorized cross-dock hubs', 'Consolider les groupages aux points autorisés et réalisables', 'Sammelgut an zulässigen und machbaren Hubs konsolidieren'],
  ['Comandă Internă', 'Internal Order', 'Commande Interne', 'Interner Auftrag'],
  ['Clienți Recurenți', 'Contract Clients', 'Clients Récurrents', 'Stammkunden'],
  ['Bursă (TimoCom / Trans.eu)', 'Freight Exchange (TimoCom / Trans.eu)', 'Bourse de Fret (TimoCom / Trans.eu)', 'Frachtenbörse (TimoCom / Trans.eu)'],
  ['1. Traseu:', '1. Corridor:', '1. Itinéraire :', '1. Korridor:'],
  ['2. LDM Segment:', '2. Segment LDM:', '2. LDM Segment :', '2. Segment-LDM:'],
  ['3. Temperatură:', '3. Temperature:', '3. Température :', '3. Temperatur:'],
  ['4. Fereastră:', '4. Time Window:', '4. Créneau :', '4. Zeitfenster:'],
  ['5. Km extra', '5. Detour km', '5. Km détour', '5. Umweg-km'],
  ['6. Timp extra', '6. Extra time', '6. Temps suppl.', '6. Zusatzzeit'],
  ['7. Cost incr.', '7. Incr. cost', '7. Coût incr.', '7. Zusatzkosten'],
  ['8. Profit Net', '8. Net Profit', '8. Profit Net', '8. Nettogewinn'],
  ['Alocă pe Remorcă', 'Assign to Trailer', 'Attribuer à la Remorque', 'Auflieger zuweisen'],
  ['Aprobat în Planning', 'Approved in Planning', 'Approuvé dans le Planning', 'In Planung freigegeben'],
  ['Confirmă Varianta', 'Confirm Option', 'Confirmer la Variante', 'Variante bestätigen'],
  ['Variantă Confirmată', 'Option Confirmed', 'Variante Confirmée', 'Variante bestätigt'],
  ['Aprobă Transfer', 'Approve Cross-Dock Transfer', 'Approuver le Transbordement', 'Umschlag genehmigen'],
  ['Varianta 1 (Recomandată AI)', 'Option 1 (AI Recommended)', 'Variante 1 (Recommandée IA)', 'Variante 1 (KI-Empfehlung)'],
  ['Varianta 2 (Alternativă Directă)', 'Option 2 (Direct Alternative)', 'Variante 2 (Alternative Directe)', 'Variante 2 (Direktalternative)'],
  ['Varianta 3 (Cu Transfer Marfă în Hub)', 'Option 3 (With Hub Cross-Dock Transfer)', 'Variante 3 (Avec Transbordement Hub)', 'Variante 3 (Mit Hub-Cross-Dock-Umschlag)'],

  // ======================== SMART TRAILER SWAP ========================
  ['Modul Diferențiator · Smart Trailer Swap', 'Key Differentiator · Smart Trailer Swap', 'Module Différenciateur · Smart Trailer Swap', 'Kernmodul · Intelligenter Auflieger-Tausch'],
  ['Schimburi Inteligente de Remorci', 'Smart Trailer Swaps (Relay & Drop-and-Hook)', 'Échanges Intelligents de Remorques (Relais)', 'Intelligenter Auflieger-Tausch (Begegnungsverkehr)'],
  [
    'Propune puncte de întâlnire, verifică ETA-urile și timpii legali de conducere, și permite selecția independentă a direcției pentru fiecare tractor după schimb.',
    'Proposes motorway meeting hubs, verifies ETAs and legal EC 561/2006 driving times, and lets you select independent post-swap actions for each tractor.',
    'Propose des points de relais, vérifie les ETA et temps de conduite CE 561/2006, et permet de choisir indépendamment la mission post-échange de chaque tracteur.',
    'Schlägt Treffpunkte vor, prüft ETAs und gesetzliche Lenkzeiten (VO 561/2006) und erlaubt die unabhängige Auswahl der Folgeaktion je Zugmaschine.',
  ],
  ['Punct de Întâlnire Propus', 'Proposed Swap Meeting Hub', 'Point de Rencontre Proposé', 'Vorgeschlagener Tausch-Treffpunkt'],
  ['Beneficiu Simulat', 'Simulated Benefit', 'Bénéfice Simulé', 'Simulierter Nutzen'],
  ['Ore Salvate', 'Hours Saved', 'Heures Économisées', 'Eingesparte Stunden'],
  ['Fezabilitate Verificată', 'Verified Feasibility', 'Faisabilité Vérifiée', 'Geprüfte Machbarkeit'],
  ['2. Revenire pe direcția din care a venit', '2. Return toward origin corridor', '2. Retour vers le corridor d’origine', '2. Rückfahrt in Herkunftsrichtung'],
  ['3. Deplasare către altă destinație, inclusiv cu remorcă goală', '3. Reposition to another destination (including empty trailer)', '3. Déplacement vers une autre destination (y compris à vide)', '3. Weiterfahrt zu anderem Ziel (auch mit Leerauflieger)'],
  ['4. Continuarea traseului și descărcarea remorcii nou primite, conform instrucțiunilor TMS', '4. Continue route & unload newly hooked trailer per TMS dispatch', '4. Poursuite du trajet et déchargement de la remorque reprise selon TMS', '4. Fortsetzung der Route & Entladung des übernommenen Aufliegers laut TMS'],
  [
    'Ambii șoferi trebuie să confirme înainte ca dispecerul să aprobe schimbul de remorci.',
    'Both drivers must confirm before the dispatcher can approve the trailer swap.',
    'Les deux chauffeurs doivent confirmer avant que le dispatcheur n’approuve l’échange.',
    'Beide Fahrer müssen bestätigen, bevor der Disponent den Aufliegertausch freigeben kann.',
  ],
  ['Aprobat & Activ în Planning', 'Approved & Active in Planning', 'Approuvé & Actif dans le Planning', 'Freigegeben & Aktiv in der Planung'],
  ['Aprobă Schimbul de Remorci', 'Approve Trailer Swap', 'Approuver l’Échange de Remorques', 'Aufliegertausch genehmigen'],
  ['Așteaptă confirmare șoferi', 'Awaiting driver confirmations', 'En attente de confirmation des chauffeurs', 'Wartet auf Fahrerbestätigung'],
  ['Confirmă Șofer', 'Confirm Driver', 'Confirmer Chauffeur', 'Fahrer bestätigen'],
  ['ETA Întâlnire:', 'Meeting ETA:', 'ETA Rencontre :', 'Treffpunkt-ETA:'],
  ['Poziție GPS:', 'GPS Position:', 'Position GPS :', 'GPS-Position:'],
  ['Remorcă actuală:', 'Current trailer:', 'Remorque actuelle :', 'Aktueller Auflieger:'],
  ['Tahograf rămas:', 'Remaining driving time:', 'Tachygraphe restant :', 'Restlenkzeit:'],

  // ======================== DRIVER PORTAL (IN-CAB) ========================
  ['MODUL ȘOFER AUTENTIFICAT · VIZIBILITATE RESTRICȚIONATĂ LA CURSA PROPRIE', 'AUTHENTICATED DRIVER MODE · VISIBILITY RESTRICTED TO ASSIGNED TRIP', 'MODE CHAUFFEUR AUTHENTIFIÉ · VISIBILITÉ LIMITÉE AU TRAJET ATTRIBUÉ', 'AUTHENTIFIZIERTER FAHRERMODUS · SICHTBARKEIT AUF EIGENE TOUR BESCHRÄNKT'],
  ['SUPERVIZARE CABINĂ ȘOFER & ADMIN CURSĂ', 'DRIVER IN-CAB TELEMETRY & DISPATCHER SUPERVISION', 'SUPERVISION CABINE CHAUFFEUR & DISPATCHEUR', 'FAHRERHAUS-ÜBERWACHUNG & DISPONENTEN-LEITSTELLE'],
  ['Schimbă cabina șoferului:', 'Switch driver cabin:', 'Changer la cabine chauffeur :', 'Fahrerhaus wechseln:'],
  ['ADMINUL ACELEI CURSE · COORDONATOR DIRECT', 'ASSIGNED TRIP DISPATCHER · DIRECT COORDINATOR', 'DISPATCHEUR DU TRAJET · COORDONNATEUR DIRECT', 'ZUSTÄNDIGER TOURENLEITER · DIREKTER KOORDINATOR'],
  ['Telefon Dispecer Cursă', 'Call Trip Dispatcher', 'Appeler le Dispatcheur', 'Tourenleiter anrufen'],
  ['Canal / Tură Activă', 'Active Dispatch Channel / Shift', 'Canal / Équipe Active', 'Aktiver Funkkanal / Schicht'],
  ['FOAIE DE PARCURS ELECTRONICĂ · CORIDOR AUTORIZAT HGV', 'ELECTRONIC WAYBILL · AUTHORIZED HGV CORRIDOR', 'FEUILLE DE ROUTE ÉLECTRONIQUE · CORRIDOR PL AUTORISÉ', 'ELEKTRONISCHES FAHRTENBUCH · ZUGELASSENER LKW-KORRIDOR'],
  ['Confirmă Sosire & Operare Rampă', 'Confirm Arrival & Dock Operation', 'Confirmer Arrivée & Opération Quai', 'Ankunft & Rampenabfertigung bestätigen'],
  ['Rampă & Descărcare Confirmată', 'Dock & Unloading Confirmed', 'Quai & Déchargement Confirmés', 'Rampe & Entladung bestätigt'],
  ['FIȘA TEHNICĂ VEHICUL & SEMIRIMORCĂ FRIGO', 'TRACTOR & REEFER SEMI-TRAILER TECHNICAL SHEET', 'FICHE TECHNIQUE TRACTEUR & SEMI-REMORQUE FRIGO', 'TECHNISCHES DATENBLATT ZUGMASCHINE & KÜHLAUFLIEGER'],
  ['Cap Tractor / Vehicul:', 'Tractor Unit / Vehicle:', 'Tracteur Routier / Véhicule :', 'Zugmaschine / Fahrzeug:'],
  ['Semiremorcă / Caroserie:', 'Semi-Trailer / Body:', 'Semi-Remorque / Carrosserie :', 'Auflieger / Aufbau:'],
  ['Șofer Titular / Telefon:', 'Lead Driver / Phone:', 'Chauffeur Titulaire / Téléphone :', 'Hauptfahrer / Telefon:'],
  ['Poziție Curentă GPS:', 'Current GPS Location:', 'Position GPS Actuelle :', 'Aktuelle GPS-Position:'],
  ['PARAMETRI FRIGO BI-TEMP', 'BI-TEMP REEFER TELEMETRY', 'PARAMÈTRES FRIGO BI-TEMP', 'BI-TEMP-KÜHLAGGREGATDATEN'],
  ['Agregat Frigorific:', 'Reefer Unit:', 'Groupe Frigorifique :', 'Kühlaggregat:'],
  ['Perete Bulkhead:', 'Bulkhead Partition:', 'Paroi Séparatrice (Bulkhead) :', 'Trennwand (Bulkhead):'],
  ['TONAJ & TELEMETRIE TEHNICĂ', 'PAYLOAD & TECHNICAL TELEMETRY', 'TONNAGE & TÉLÉMÉTRIE TECHNIQUE', 'NUTZLAST & TECHNISCHE TELEMETRIE'],
  ['Încărcare LDM:', 'LDM Floor Occupancy:', 'Occupation LDM :', 'LDM-Auslastung:'],
  ['Masă totală:', 'Payload weight:', 'Masse chargée :', 'Ladungsgewicht:'],
  ['TAHOGRAF DIGITAL', 'DIGITAL TACHOGRAPH (EC 561/2006)', 'TACHYGRAPHE NUMÉRIQUE (CE 561/2006)', 'DIGITALER TACHOGRAPH (VO 561/2006)'],
  ['Azi rămas:', 'Remaining today:', 'Restant aujourd’hui :', 'Heute verbleibend:'],
  ['Următoarea pauză 45m:', 'Next 45m break:', 'Prochaine pause 45 min :', 'Nächste 45-Min.-Pause:'],
  ['Săptămânal:', 'Bi-weekly driving:', 'Conduite bi-hebdo :', 'Doppelwochenlenkzeit:'],
  ['Pauză / Odihnă', 'Break / Rest', 'Pause / Repos', 'Pause / Ruhezeit'],
  ['Altă muncă', 'Other work', 'Autre travail', 'Andere Arbeit'],
  ['Comunicare Directă Cabină ↔ Admin Cursă', 'Direct In-Cab ↔ Dispatcher Messaging', 'Communication Directe Cabine ↔ Dispatcheur', 'Direktkommunikation Fahrerhaus ↔ Disponent'],
  ['Trimite instrucțiune nouă către șofer...', 'Send new dispatch instruction to driver...', 'Envoyer une nouvelle instruction au chauffeur...', 'Neue Dispositionsanweisung an Fahrer senden...'],
  ['Scrie raport către Adminul Cursei (rampă, sigiliu, temperatură)...', 'Send status report to Trip Dispatcher (dock, seal, temperature)...', 'Écrire un rapport au Dispatcheur (quai, scellé, température)...', 'Bericht an Tourenleiter senden (Rampe, Plombe, Temperatur)...'],
  ['Trimite', 'Send', 'Envoyer', 'Senden'],
  ['Confirmă Acordul Șoferului pt. Schimb Remorcă', 'Confirm Driver Agreement for Trailer Swap', 'Confirmer l’Accord du Chauffeur pour l’Échange', 'Fahrerzustimmung für Aufliegertausch bestätigen'],

  // ======================== CLIENT QUOTES & SOFT-LOCK ========================
  ['Ofertare Comercială & Regula Soft-Lock', 'Commercial Quoting & Soft-Lock Rule', 'Offres Commerciales & Règle Soft-Lock', 'Kundenangebote & Soft-Lock-Regel'],
  ['Optimizarea Grupajelor & Disponibilități Viitoare', 'Groupage Optimization & Future Capacity', 'Optimisation des Groupages & Disponibilités Futures', 'Sammelgut-Optimierung & Zukünftige Kapazitäten'],
  [
    'Ofertele primite pentru spațiul liber NU blochează definitiv LDM-ul până la acceptare, dar avertizează la apariția unei comenzi incompatibile.',
    'Incoming quotes for free space do NOT hard-lock LDM capacity until accepted by dispatch, while alerting on conflicting shipments.',
    'Les offres reçues pour l’espace libre NE bloquent PAS définitivement les LDM avant acceptation, mais signalent tout conflit.',
    'Eingehende Angebote für freien Laderaum blockieren LDM NICHT endgültig bis zur Annahme, warnen jedoch bei Konflikten.',
  ],
  ['Ce primește dispecerul & E-mail comercial automat', 'Dispatcher Inbox & Automated Commercial Email', 'Boîte Dispatcheur & E-mail Commercial Automatique', 'Disponenten-Eingang & Automatische Angebots-E-Mail'],
  ['Disponibilități Viitoare', 'Future Fleet Availability', 'Disponibilités Futures', 'Zukünftige Fahrzeugverfügbarkeit'],
  ['Simulează Ofertă Nouă de la Client', 'Simulate Incoming Client Quote', 'Simuler une Nouvelle Offre Client', 'Neues Kundenangebot simulieren'],
  ['Regulă obligatorie (Soft-Lock 3 LDM din 4,2 LDM)', 'Mandatory Rule (Soft-Lock 3 LDM out of 4.2 LDM)', 'Règle obligatoire (Soft-Lock 3 LDM sur 4,2 LDM)', 'Pflichtregel (Soft-Lock 3 LDM von 4,2 LDM)'],
  ['Acceptă', 'Accept Quote', 'Accepter', 'Annehmen'],
  ['Contraofertă', 'Counteroffer', 'Contre-offre', 'Gegenangebot'],
  ['Refuză', 'Decline', 'Refuser', 'Ablehnen'],
  ['Template & Link de Ofertare Client', 'Client Quote Email Template & Portal Link', 'Modèle d’E-mail & Lien Portail Client', 'Kundenangebots-Vorlage & Portal-Link'],
  ['Unde și când putem încărca în următoarele zile', 'Where and when trailers become 100% free in the coming days', 'Où et quand nos remorques se libèrent dans les prochains jours', 'Wo und wann Auflieger in den nächsten Tagen frei werden'],

  // ======================== ORDERS & TRIPS + WIZARD ========================
  ['COMENZI (LOADS) & CURSE (TRIPS) · DESIGN DESKTOP TMS', 'ORDERS (LOADS) & TRIPS · DESKTOP TMS DISPATCH', 'COMMANDES (LOTS) & TRAJETS · EXPLOITATION TMS', 'AUFTRÄGE (LADUNGEN) & TOUREN · TMS-DISPOSITION'],
  ['Gestiune Comenzi, Documente CMR și Alocare Cursă în 3 Pași', 'Order Management, CMR Waybills & 3-Step Trip Dispatch', 'Gestion des Commandes, Documents CMR et Attribution en 3 Étapes', 'Auftragsverwaltung, CMR-Frachtbriefe & 3-Schritte-Tourendisposition'],
  [
    'Creează comenzi noi de transport frigorific sau grupaj, verifică documentele CMR și alocă-le direct pe remorcile cu LDM disponibili.',
    'Create new refrigerated FTL or groupage orders, verify international CMR documents, and assign them to trailers with available LDM.',
    'Créez de nouvelles commandes frigo ou groupage, vérifiez les CMR internationaux et attribuez-les aux remorques disposant de LDM.',
    'Erstellen Sie neue Kühl- oder Sammelgutaufträge, prüfen Sie internationale CMR-Frachtbriefe und weisen Sie diese freien Aufliegern zu.',
  ],
  ['← Cursă nouă (Alocare Comandă pe Remorcă, Cap Tractor și Șofer)', '← New Trip (Assign Order to Trailer, Tractor & Driver)', '← Nouveau Trajet (Attribuer Commande sur Remorque, Tracteur et Chauffeur)', '← Neue Tour (Auftrag auf Auflieger, Zugmaschine & Fahrer disponieren)'],
  ['WIZARD PLANIFICARE CURSĂ NOUĂ / GRUPAJ', 'NEW TRIP / GROUPAGE DISPATCH WIZARD', 'ASSISTANT NOUVEAU TRAJET / GROUPAGE', 'ASSISTENT FÜR NEUE TOUR / SAMMELGUT'],
  ['1. Detalii Comandă', '1. Order Details', '1. Détails Commande', '1. Auftragsdetails'],
  ['2. Alocare Vehicul & Șofer', '2. Vehicle & Driver Assignment', '2. Attribution Véhicule & Chauffeur', '2. Fahrzeug- & Fahrerzuweisung'],
  ['3. Confirmare & LDM', '3. Confirmation & LDM', '3. Confirmation & LDM', '3. Bestätigung & LDM'],
  ['Confirmă & Trimite în Planning 7 Zile', 'Confirm & Send to 7-Day Planning', 'Confirmer & Envoyer au Planning 7 Jours', 'Bestätigen & an 7-Tage-Planung senden'],
  ['Nr. Comandă', 'Order ID', 'N° Commande', 'Auftrags-Nr.'],
  ['Marfă & LDM', 'Cargo & LDM', 'Marchandise & LDM', 'Fracht & LDM'],
  ['Distanță Șosea', 'Road Distance', 'Distance Routière', 'Straßenstrecke'],
  ['Temperatură', 'Temperature', 'Température', 'Temperatur'],
  ['Remorcă Alocată', 'Assigned Trailer', 'Remorque Attribuée', 'Zugewiesener Auflieger'],
  ['Ansamblu Alocat', 'Assigned Combination', 'Ensemble Attribué', 'Zugewiesener Sattelzug'],
  ['Ocupare LDM / Tonaj', 'LDM / Payload Occupancy', 'Occupation LDM / Tonnage', 'LDM- / Nutzlast-Belegung'],

  // ======================== FLEET, DRIVERS, CLIENTS & BILLING ========================
  ['ADMINISTRARE FLOTĂ (NORMA EURO, KM, ITP/ATP) · ȘOFERI · CLIENȚI · FACTURI & CMR', 'FLEET MANAGEMENT (EURO STANDARD, KM, MOT/ATP) · DRIVERS · CLIENTS · INVOICING & CMR', 'GESTION FLOTTE (NORME EURO, KM, CT/ATP) · CHAUFFEURS · CLIENTS · FACTURES & CMR', 'FLOTTENVERWALTUNG (EURO-NORM, KM, TÜV/ATP) · FAHRER · KUNDEN · RECHNUNGEN & CMR'],
  ['Fișe Tehnice Flotă, Documente Șoferi, Bază Clienți & Facturare CMR', 'Fleet Technical Sheets, Driver Credentials, Client Database & CMR Billing', 'Fiches Techniques Flotte, Documents Chauffeurs, Base Clients & Facturation CMR', 'Flottendatenblätter, Fahrerdokumente, Kundenstamm & CMR-Abrechnung'],
  [
    'Monitorizează în timp real norma Euro, kilometrajul din CAN-Bus, expirările ITP/RCA/ATP și documentele șoferilor.',
    'Monitor real-time Euro emission class, CAN-Bus odometer, MOT/Insurance/ATP Cold-Chain expiries, and driver qualifications.',
    'Suivez en temps réel la norme Euro, le kilométrage CAN-Bus, les échéances CT/Assurance/ATP Frigo et les documents chauffeurs.',
    'Überwachen Sie in Echtzeit Euro-Schadstoffklasse, CAN-Bus-Kilometerstand, TÜV/Versicherungs-/ATP-Ablaufdaten und Fahrerdokumente.',
  ],
  ['1. Flotă (Norma Euro, Km, ITP/ATP)', '1. Fleet (Euro Class, Km, MOT/ATP)', '1. Flotte (Norme Euro, Km, CT/ATP)', '1. Flotte (Euro-Norm, Km, TÜV/ATP)'],
  ['2. Șoferi, Permise/Atestate & Tahograf', '2. Drivers, Licenses/CPC & Tachograph', '2. Chauffeurs, Permis/FIMO & Tachygraphe', '2. Fahrer, Führerschein/BKrFQG & Tachograph'],
  ['3. Clienți & Contracte', '3. Clients & Contracts', '3. Clients & Contrats', '3. Kunden & Verträge'],
  ['4. Facturare & Profitabilitate', '4. Invoicing & Profitability', '4. Facturation & Rentabilité', '4. Abrechnung & Rentabilität'],
  ['Fișa Tehnică a Flotei: Norma Euro, Kilometraj Bord, ITP/RCA/ATP, Consum & Senzori Frigo', 'Fleet Technical Sheet: Euro Class, Odometer, MOT/Insurance/ATP, Fuel & Reefer Sensors', 'Fiche Technique Flotte : Norme Euro, Kilométrage, CT/Assurance/ATP, Conso & Capteurs Frigo', 'Flottendatenblatt: Euro-Norm, Kilometerstand, TÜV/Versicherung/ATP, Verbrauch & Kühlsensoren'],
  ['Remorcă & Cap Tractor', 'Trailer & Tractor Unit', 'Remorque & Tracteur', 'Auflieger & Zugmaschine'],
  ['Norma Euro & Maut', 'Euro Class & Toll (Maut)', 'Norme Euro & Péage (Maut)', 'Euro-Norm & Mautklasse'],
  ['Kilometraj Bord & Revizie', 'Odometer & Next Service', 'Kilométrage & Révision', 'Kilometerstand & Wartung'],
  ['Expirări ITP / RCA / ATP Frigo', 'MOT / Insurance / ATP Reefer Expiry', 'Échéances CT / RC / ATP Frigo', 'Ablauf TÜV / Haftpflicht / ATP-Kühlzertifikat'],
  ['Consum & Agregat Frigo', 'Fuel Consumption & Reefer Unit', 'Consommation & Groupe Frigo', 'Verbrauch & Kühlaggregat'],
  ['Status & Acțiuni', 'Status & Actions', 'Statut & Actions', 'Status & Aktionen'],
  ['Editează Fișa', 'Edit Tech Sheet', 'Modifier la Fiche', 'Datenblatt bearbeiten'],
  ['În cursă activă', 'On active trip', 'En trajet actif', 'Auf aktiver Tour'],
  ['Disponibil Bază Oradea', 'Available at Oradea Base', 'Disponible Base Oradea', 'Verfügbar Basis Oradea'],
  ['Gestiune Șoferi, Valabilitate Documente (Permis C+E, Atestat CPI/CPC, Card Tahograf) & Timpi CE 561/2006', 'Driver Management, Document Validity (C+E License, Driver CPC, Tachograph Card) & EC 561/2006 Hours', 'Gestion Chauffeurs, Validité Documents (Permis C+E, FIMO/FCO, Carte Tachy) & Temps CE 561/2006', 'Fahrerverwaltung, Dokumentengültigkeit (Klasse C+E, Schlüsselzahl 95, Fahrerkarte) & VO 561/2006 Zeiten'],
  ['+ Adaugă Șofer Nou', '+ Add New Driver', '+ Ajouter un Chauffeur', '+ Neuen Fahrer anlegen'],
  ['Șofer / Echipaj & Telefon', 'Driver / Crew & Phone', 'Chauffeur / Équipage & Téléphone', 'Fahrer / Besatzung & Telefon'],
  ['Permis Conducere', 'Driving License', 'Permis de Conduire', 'Führerschein'],
  ['Atestat CPI/CPC & Card Tahograf', 'Driver CPC & Tachograph Card', 'FIMO/FCO & Carte Tachygraphe', 'Schlüsselzahl 95 & Fahrerkarte'],
  ['Aviz Medical / Psiho', 'Medical / Psych Certificate', 'Aptitude Médicale / Psycho', 'Ärztliches / Psych. Attest'],
  ['Tahograf Digital (Azi / Săpt.)', 'Digital Tachograph (Today / Bi-wk)', 'Tachygraphe (Auj. / Bi-hebdo)', 'Digitaler Tachograph (Heute / 2-Wo.)'],
  ['Bază de Clienți & Contracte Comerciale (Sincronizată cu Drop-Listul din Formulare)', 'Commercial Client & Contract Database (Synced with Order Drop-Downs)', 'Base Clients & Contrats Commerciaux (Synchronisée avec les Formulaires)', 'Kundenstamm & Handelsverträge (Synchronisiert mit Auftragsformularen)'],
  ['+ Adaugă Client & Contract', '+ Add Client & Contract', '+ Ajouter Client & Contrat', '+ Kunde & Vertrag anlegen'],
  ['Companie Client & Categorie Marfă', 'Client Company & Cargo Category', 'Société Cliente & Catégorie Marchandise', 'Kundenunternehmen & Frachtkategorie'],
  ['Țară & Cod CUI / VAT', 'Country & EU VAT ID', 'Pays & N° TVA Intracommunautaire', 'Land & USt-IdNr.'],
  ['Coridor Implicit', 'Default Corridor', 'Corridor par Défaut', 'Standardkorridor'],
  ['Parametri Standard (LDM / T / °C)', 'Default Specs (LDM / T / °C)', 'Paramètres Standards (LDM / T / °C)', 'Standardparameter (LDM / T / °C)'],
  ['Tarif Contractual & Scadență', 'Contract Rate & Payment Terms', 'Tarif Contractuel & Échéance', 'Vertragstarif & Zahlungsziel'],
  ['Responsabil Logistică', 'Logistics Contact', 'Responsable Logistique', 'Logistik-Ansprechpartner'],
  ['Acțiuni CRUD', 'CRUD Actions', 'Actions CRUD', 'CRUD-Aktionen'],
  ['Facturare Curse, Venit Suplimentar din Grupaj, Marjă Netă & Generare CMR / Factură PDF', 'Trip Invoicing, Incremental Groupage Revenue, Net Margin & CMR / PDF Invoice Generation', 'Facturation Trajets, Revenu Groupage Supplémentaire, Marge Nette & Génération CMR / Facture PDF', 'Tourenabrechnung, Sammelgut-Mehrerlös, Nettomarge & CMR- / PDF-Rechnungserstellung'],
  ['Creștere Medie Venit / Cursă prin Grupaj Dinamic', 'Average Revenue Increase / Trip via Dynamic Groupage', 'Hausse Moyenne Revenu / Trajet via Groupage Dynamique', 'Durchschnittlicher Mehrerlös / Tour durch dynamisches Sammelgut'],
  ['Factură / Cursă', 'Invoice / Trip', 'Facture / Trajet', 'Rechnung / Tour'],
  ['Ansamblu & Rută', 'Vehicle Combination & Route', 'Ensemble & Itinéraire', 'Sattelzug & Route'],
  ['Venit Total', 'Total Revenue', 'Revenu Total', 'Gesamterlös'],
  ['Din care Grupaj', 'Of which Groupage', 'Dont Groupage', 'Davon Sammelgut'],
  ['Cost Direct', 'Direct Cost', 'Coût Direct', 'Direktkosten'],
  ['Profit Net (%)', 'Net Profit (%)', 'Profit Net (%)', 'Nettogewinn (%)'],
  ['Documente & Acțiuni', 'Documents & Actions', 'Documents & Actions', 'Dokumente & Aktionen'],
  ['Emisă (Scadentă 30 zile)', 'Issued (Net 30 days)', 'Émise (Échéance 30 jours)', 'Ausgestellt (Ziel 30 Tage)'],
  ['Achitată', 'Paid', 'Payée', 'Bezahlt'],
  ['În așteptare aviz', 'Pending POD', 'En attente POD', 'Wartet auf Abliefernachweis'],
  ['Print Factură', 'Print Invoice', 'Imprimer Facture', 'Rechnung drucken'],
  [
    'DECODOR SERIE ȘASIU (VIN ISO 3779) · AFISARE MODEL 3D STUDIO & CULOARE OEM',
    'CHASSIS VIN DECODER (ISO 3779) · 3D STUDIO MODEL & OEM COLOR RENDERER',
    'DÉCODEUR VIN CHÂSSIS (ISO 3779) · MODÈLE STUDIO 3D & COULEUR OEM',
    'FAHRGESTELLNUMMER-DECODER (VIN ISO 3779) · 3D-MODELL & OEM-LACKFARBE',
  ],
  [
    'Caută orice Camion sau Remorcă după VIN — Identificare Automată Model, Motorizare & Culoare',
    'Look up any Truck or Trailer by VIN — Automatic Model, Engine & Paint Color Identification',
    'Rechercher un Camion ou une Remorque par VIN — Identification Modèle, Moteur & Couleur',
    'LKW oder Auflieger per FIN/VIN suchen — Automatische Modell-, Motor- & Farberkennung',
  ],
  ['Deschide Fișa Completă', 'Open Full Vehicle Dossier', 'Ouvrir le Dossier Complet', 'Vollständige Fahrzeugakte öffnen'],
  ['VIN-uri Flotă Blue Trans (Click rapid):', 'Blue Trans Fleet VINs (Quick select):', 'VIN de la Flotte Blue Trans (Sélection rapide) :', 'Blue Trans Flotten-FINs (Schnellauswahl):'],
  ['Culoare OEM:', 'OEM Paint Color:', 'Couleur OEM :', 'OEM-Lackfarbe:'],
  ['Vedere Ansamblu Cuplat (16.5m)', 'Coupled Road Train View (16.5m)', 'Vue Ensemble Couplé (16,5 m)', 'Ansicht Komplettzug (16,5 m)'],
  ['Vedere Individuală', 'Single Unit View', 'Vue Unité Seule', 'Einzelansicht'],
  ['VIN DECODAT CU SUCCES', 'VIN DECODED SUCCESSFULLY', 'VIN DÉCODÉ AVEC SUCCÈS', 'FIN/VIN ERFOLGREICH DECODIERT'],
  ['CAP TRACTOR (HGV)', 'TRACTOR UNIT (HGV)', 'TRACTEUR ROUTIER (PL)', 'SATTELZUGMASCHINE (LKW)'],
  ['SEMIREMORCĂ FRIGO', 'REEFER SEMI-TRAILER', 'SEMI-REMORQUE FRIGO', 'KÜHLAUFLIEGER'],
  ['UTILITARĂ EXPRESS FRIGO', 'EXPRESS REEFER VAN', 'UTILITAIRE EXPRESS FRIGO', 'EXPRESS-KÜHLTRANSPORTER'],
  ['WMI (1–3) · Producător & Uzină', 'WMI (1–3) · Manufacturer & Plant', 'WMI (1–3) · Constructeur & Usine', 'WMI (1–3) · Hersteller & Werk'],
  ['Cod Culoare & Finisaj Caroserie', 'Paint Color Code & Body Finish', 'Code Couleur & Finition Carrosserie', 'Farbcode & Lackierung'],
  ['Motorizare / Agregat Frigorific', 'Engine / Reefer Unit', 'Motorisation / Groupe Frigorifique', 'Motorisierung / Kühlaggregat'],
  ['Transmisie / Axe & Suspensie', 'Transmission / Axles & Suspension', 'Transmission / Essieux & Suspension', 'Getriebe / Achsen & Federung'],
  ['Cabină / Caroserie Izotermă', 'Cab Profile / Insulated Body', 'Cabine / Carrosserie Isotherme', 'Fahrerhaus / Isolieraufbau'],
  ['Rezervoare / Anvelope & MMA', 'Fuel Tanks / Tires & GVW', 'Réservoirs / Pneus & PTAC', 'Kraftstofftanks / Reifen & zGG'],
  ['Ansamblu, Serie VIN & Culoare', 'Combination, VIN & Paint Color', 'Ensemble, Série VIN & Couleur', 'Sattelzug, FIN/VIN & Lackfarbe'],
  ['Dosar Tehnic (Camion / Remorcă)', 'Technical Dossier (Truck / Trailer)', 'Dossier Technique (Camion / Remorque)', 'Fahrzeugakte (LKW / Auflieger)'],
  ['Fișă Camion', 'Truck Sheet', 'Fiche Camion', 'LKW-Akte'],
  ['Fișă Remorcă', 'Trailer Sheet', 'Fiche Remorque', 'Auflieger-Akte'],
  ['Editează Date / VIN / Culoare', 'Edit Specs / VIN / Color', 'Modifier Données / VIN / Couleur', 'Daten / VIN / Farbe bearbeiten'],
  ['DOSAR TEHNIC COMPLET CAMION & SEMIREMORCĂ FRIGO', 'COMPLETE TRUCK & REEFER SEMI-TRAILER TECHNICAL DOSSIER', 'DOSSIER TECHNIQUE COMPLET CAMION & SEMI-REMORQUE FRIGO', 'VOLLSTÄNDIGE TECHNISCHE AKTE ZUGMASCHINE & KÜHLAUFLIEGER'],
  ['Cap tractor', 'Tractor unit', 'Tracteur routier', 'Zugmaschine'],
  ['Semiremorcă', 'Semi-trailer', 'Semi-remorque', 'Auflieger'],
  ['Ansamblu, anvelope & acte', 'Road train, tires & docs', 'Ensemble, pneus & docs', 'Sattelzug, Reifen & Dok.'],
  ['Editează VIN & date', 'Edit VIN & specs', 'Modifier VIN & données', 'VIN & Daten bearbeiten'],
  ['Schimbă Culoarea Camionului:', 'Change Truck Paint Color:', 'Changer la Couleur du Camion :', 'LKW-Lackfarbe ändern:'],
  ['Culoare Semiremorcă Frigo:', 'Reefer Trailer Color:', 'Couleur Semi-Remorque Frigo :', 'Farbe Kühlauflieger:'],
  ['Salvează Fișa Tehnică & VIN', 'Save Technical Sheet & VIN', 'Enregistrer Fiche Technique & VIN', 'Datenblatt & VIN speichern'],

  // ======================== CMR & INVOICE MODAL ========================
  ['Scrisoare CMR Internațional', 'International CMR Consignment Note', 'Lettre de Voiture Internationale CMR', 'Internationaler CMR-Frachtbrief'],
  ['Factură Proformă / Fiscală (EUR)', 'Proforma / Commercial Invoice (EUR)', 'Facture Proforma / Commerciale (EUR)', 'Proforma- / Handelsrechnung (EUR)'],
  ['Printează / Export PDF', 'Print / Export PDF', 'Imprimer / Exporter PDF', 'Drucken / PDF-Export'],
  [' Închide', ' Close', ' Fermer', ' Schließen'],
  ['Închide', 'Close', 'Fermer', 'Schließen'],
  ['EXEMPLAR PENTRU EXPEDITOR / TRANSPORTATOR · CONVENȚIA CMR', 'COPY FOR SENDER / CARRIER · CMR CONVENTION', 'EXEMPLAIRE POUR L’EXPÉDITEUR / TRANSPORTEUR · CONVENTION CMR', 'EXEMPLAR FÜR ABSENDER / FRACHTFÜHRER · CMR-ÜBEREINKOMMEN'],
  ['SCRISOARE DE TRANSPORT INTERNAȚIONAL (CMR)', 'INTERNATIONAL CONSIGNMENT NOTE (CMR)', 'LETTRE DE VOITURE INTERNATIONALE (CMR)', 'INTERNATIONALER FRACHTBRIEF (CMR)'],
  ['Acest transport este supus, cu toate clauzele contrare, Convenției referitoare la contractul de transport internațional de mărfuri pe șosele (CMR).', 'This carriage is subject, notwithstanding any clause to the contrary, to the Convention on the Contract for the International Carriage of Goods by Road (CMR).', 'Ce transport est soumis, nonobstant toute clause contraire, à la Convention relative au contrat de transport international de marchandises par route (CMR).', 'Diese Beförderung unterliegt trotz einer gegenteiligen Abmachung den Bestimmungen des Übereinkommens über den Beförderungsvertrag im internationalen Straßengüterverkehr (CMR).'],
  ['1. Expeditor (Nume, adresă, țară)', '1. Sender (Name, address, country)', '1. Expéditeur (Nom, adresse, pays)', '1. Absender (Name, Anschrift, Land)'],
  ['16. Transportator (Nume, adresă, CUI)', '16. Carrier (Name, address, VAT ID)', '16. Transporteur (Nom, adresse, TVA)', '16. Frachtführer (Name, Anschrift, USt-IdNr.)'],
  ['2. Destinatar (Nume, adresă, țară)', '2. Consignee (Name, address, country)', '2. Destinataire (Nom, adresse, pays)', '2. Empfänger (Name, Anschrift, Land)'],
  ['23. Ansamblu Rutier (Cap Tractor + Semiremorcă) & Șofer', '23. Road Vehicle Combination (Tractor + Semi-Trailer) & Driver', '23. Ensemble Routier (Tracteur + Semi-Remorque) & Chauffeur', '23. Sattelzug (Zugmaschine + Auflieger) & Fahrer'],
  ['3. Locul și data încărcării mărfii', '3. Place and date of taking over the goods', '3. Lieu et date de la prise en charge de la marchandise', '3. Ort und Tag der Übernahme des Gutes'],
  ['4. Locul prevăzut pentru livrarea mărfii', '4. Place designated for delivery of the goods', '4. Lieu prévu pour la livraison de la marchandise', '4. Ort, der für die Ablieferung des Gutes vorgesehen ist'],
  ['6–9. Mărci, Număr Colete & Natura Mărfii', '6–9. Marks, Number of Packages & Nature of Goods', '6–9. Marques, Nombre de Colis & Nature de la Marchandise', '6–9. Kennzeichen, Anzahl der Packstücke & Art des Gutes'],
  ['11. Greutate Brută (T)', '11. Gross Weight (T)', '11. Poids Brut (T)', '11. Rohgewicht (T)'],
  ['12. Spațiu Podea (LDM)', '12. Floor Space (LDM)', '12. Mètres de Plancher (LDM)', '12. Lademeter (LDM)'],
  ['13. Instrucțiuni Temperatură Frigo', '13. Reefer Temperature Instructions', '13. Instructions de Température Frigo', '13. Kühltemperatur-Anweisungen'],
  ['22. Semnătura și ștampila expeditorului', '22. Signature and stamp of the sender', '22. Signature et timbre de l’expéditeur', '22. Unterschrift und Stempel des Absenders'],
  ['23. Semnătura și ștampila transportatorului', '23. Signature and stamp of the carrier', '23. Signature et timbre du transporteur', '23. Unterschrift und Stempel des Frachtführers'],
  ['24. Marfa primită — Semnătura și ștampila destinatarului', '24. Goods received — Signature and stamp of the consignee', '24. Marchandises reçues — Signature et timbre du destinataire', '24. Gut empfangen — Unterschrift und Stempel des Empfängers'],
  ['FACTURĂ TRANSPORT INTERNAȚIONAL DE MARFĂ (EUR)', 'INTERNATIONAL FREIGHT TRANSPORT INVOICE (EUR)', 'FACTURE DE TRANSPORT INTERNATIONAL DE MARCHANDISES (EUR)', 'RECHNUNG FÜR INTERNATIONALEN GÜTERKRAFTVERKEHR (EUR)'],
  ['Denumire Servicii Transport & Detalii Cursă', 'Transport Service Description & Trip Details', 'Désignation des Services de Transport & Détails du Trajet', 'Bezeichnung der Transportleistung & Tourendetails'],
  ['Cantitate / LDM', 'Quantity / LDM', 'Quantité / LDM', 'Menge / LDM'],
  ['Regim TVA', 'VAT Regime', 'Régime TVA', 'MwSt.-Regelung'],
  ['Valoare Netă (EUR)', 'Net Amount (EUR)', 'Montant Net (EUR)', 'Nettobetrag (EUR)'],
  ['Total Net de Plată:', 'Total Net Payable:', 'Total Net à Payer :', 'Gesamtnettobetrag:'],

  // ======================== ANALYSIS & SCENARIOS ========================
  ['ANALIZĂ TEHNICĂ & OPERAȚIONALĂ · BLUE TRANS SPEDITION', 'TECHNICAL & OPERATIONAL ARCHITECTURE · BLUE TRANS SPEDITION', 'ANALYSE TECHNIQUE & OPÉRATIONNELLE · BLUE TRANS SPEDITION', 'TECHNISCHE & OPERATIVE ANALYSE · BLUE TRANS SPEDITION'],
  ['Analiza Funcționalităților, Reguli Operaționale, Prioritizare MVP și Scenarii Reale de Testare', 'Feature Analysis, Operational Invariants, MVP Roadmap & Real-World Testing Scenarios', 'Analyse Fonctionnelle, Règles Opérationnelles, Feuille de Route MVP et Scénarios Réels de Test', 'Funktionsanalyse, Betriebsregeln, MVP-Roadmap & Reale Testszenarien'],
  ['1. Ce funcții ajută efectiv dispecerii în fiecare zi', '1. Core features that empower dispatchers every single day', '1. Quelles fonctions aident réellement les dispatcheurs au quotidien', '1. Welche Funktionen Disponenten im Tagesgeschäft effektiv entlasten'],
  ['2. Ce informații lipseau din interfața inițială (și le-am adăugat)', '2. Essential telemetry & logistics parameters added to the TMS', '2. Informations essentielles ajoutées à l’interface TMS', '2. Wichtige Telemetrie- & Logistikdaten, die ergänzt wurden'],
  ['3. Ce operațiuni consumă cel mai mult timp în prezent', '3. Most time-consuming manual dispatch tasks eliminated', '3. Opérations manuelles les plus chronophages éliminées', '3. Zeitaufwendigste manuelle Dispositionsaufgaben, die automatisiert wurden'],
  ['4. Ce situații de grupaj și schimb de remorci trebuie testate', '4. Groupage & Smart Trailer Swap scenarios required for QA', '4. Scénarios de groupage et d’échange de remorques à tester', '4. Zu testende Sammelgut- und Aufliegertausch-Szenarien'],
  ['5. Ce reguli și excepții obligatorii trebuie respectate', '5. Mandatory business rules & cold-chain invariants', '5. Règles métier et invariants frigorifiques obligatoires', '5. Verbindliche Geschäftsregeln & Kühlketten-Invarianten'],
  ['6. Ce funcții trebuie dezvoltate primele (Roadmap MVP → SaaS)', '6. Phased implementation priority (MVP → Multi-Tenant SaaS Roadmap)', '6. Priorités de développement par phase (Feuille de route MVP → SaaS)', '6. Entwicklungs-Priorisierung nach Phasen (MVP → SaaS-Roadmap)'],
  ['Scenarii Reale din Activitatea BLUE TRANS Pregătite pentru Testarea Software-ului', 'Real-World BLUE TRANS Operational Scenarios Ready for Software Testing', 'Scénarios Réels d’Exploitation BLUE TRANS Prêts pour les Tests Logiciels', 'Reale BLUE TRANS Praxisszenarien für den Software-Testbetrieb'],
  ['SCENARIUL DE TEST #1 · GRUPAJ BI-TEMP DINAMIC PE CORIDORUL HU → AT → DE → NL', 'TEST SCENARIO #1 · DYNAMIC BI-TEMP GROUPAGE ON CORRIDOR HU → AT → DE → NL', 'SCÉNARIO DE TEST N°1 · GROUPAGE BI-TEMP DYNAMIQUE SUR LE CORRIDOR HU → AT → DE → NL', 'TESTSZENARIO #1 · DYNAMISCHES BI-TEMP-SAMMELGUT AUF DEM KORRIDOR HU → AT → DE → NL'],
  ['SCENARIUL DE TEST #2 · SMART TRAILER SWAP LA GRANIȚA HU/AT (HEGYESHALOM)', 'TEST SCENARIO #2 · SMART TRAILER SWAP AT THE HU/AT BORDER (HEGYESHALOM)', 'SCÉNARIO DE TEST N°2 · SMART TRAILER SWAP À LA FRONTIÈRE HU/AT (HEGYESHALOM)', 'TESTSZENARIO #2 · SMART TRAILER SWAP AN DER GRENZE HU/AT (HEGYESHALOM)'],
  ['SCENARIUL DE TEST #3 · RELEU CU ECHIPAJ DE 2 ȘOFERI ÎN GERMANIA (A3)', 'TEST SCENARIO #3 · 2-DRIVER TEAM RELAY IN GERMANY (A3 MOTORWAY)', 'SCÉNARIO DE TEST N°3 · RELAIS ÉQUIPAGE DOUBLE EN ALLEMAGNE (AUTOROUTE A3)', 'TESTSZENARIO #3 · 2-FAHRER-STAFETTENÜBERGABE IN DEUTSCHLAND (A3)'],
  ['SCENARIUL DE TEST #4 · VÂNZARE ANTICIPATĂ DISPONIBILITĂȚI VIITOARE (NL / SE)', 'TEST SCENARIO #4 · ADVANCE SALE OF FUTURE FLEET AVAILABILITY (NL / SE)', 'SCÉNARIO DE TEST N°4 · VENTE ANTICIPÉE DES DISPONIBILITÉS FUTURES (NL / SE)', 'TESTSZENARIO #4 · VORVERKAUF ZUKÜNFTIGER FAHRZEUGVERFÜGBARKEITEN (NL / SE)'],
  [
    '• Vederea „dintr-o privire” a LDM pe segmente (fără a deschide remorca):',
    '• At-a-glance segment LDM visibility (without opening the trailer sheet):',
    '• Vue instantanée des LDM par segment (sans ouvrir la fiche remorque) :',
    '• Segment-LDM auf einen Blick (ohne Öffnen des Aufliegerblatts):',
  ],
  [
    'Bara vizuală de 13.6 LDM care arată instant unde se eliberează spațiu după prima descărcare (ex: după Viena se eliberează 4.2 LDM spre Rotterdam).',
    'Visual 13.6 LDM bar showing immediately where floor space opens up after intermediate unloadings (e.g. +4.2 LDM free after Vienna toward Rotterdam).',
    'Barre visuelle de 13,6 LDM montrant instantanément où l’espace se libère après un déchargement intermédiaire (ex. +4,2 LDM après Vienne vers Rotterdam).',
    'Visueller 13,6-LDM-Balken, der sofort zeigt, wo nach Zwischenentladungen Platz frei wird (z. B. +4,2 LDM ab Wien Richtung Rotterdam).',
  ],
  [
    '• Calculatorul de Contribuție Netă la Grupaj:',
    '• Incremental Groupage Net Margin Calculator:',
    '• Calculateur de Contribution Nette au Groupage :',
    '• Deckungsbeitragsrechner für Sammelgut-Beiladungen:',
  ],
  [
    'Când apare o marfă de 3 LDM cu 550 €, dispecerul vede în 2 secunde costul incremental real (km de ocol + taxe drum AT/DE/MAUT + timp rampă = 180 €) și marja netă (+370 €).',
    'When a 3 LDM shipment at €550 arrives, the dispatcher sees within 2 seconds the true incremental cost (detour km + AT/DE road tolls + dock time = €180) and net margin (+€370).',
    'Lorsqu’un lot de 3 LDM à 550 € se présente, le dispatcheur voit en 2 secondes le coût incrémental réel (détour + péages AT/DE + quai = 180 €) et la marge nette (+370 €).',
    'Bei einer 3-LDM-Partie für 550 € sieht der Disponent in 2 Sekunden die echten Zusatzkosten (Umweg-km + AT/DE-Maut + Rampenzeit = 180 €) und den Deckungsbeitrag (+370 €).',
  ],
  [
    '• Simulatorul Drag & Drop cu verificare Tahograf + Temperatură:',
    '• Drag & Drop Dispatch Simulator with Tachograph + Temperature validation:',
    '• Simulateur Glisser-Déposer avec vérification Tachygraphe + Température :',
    '• Drag-&-Drop-Dispositionssimulator mit Tachographen- & Temperaturprüfung:',
  ],
  [
    'Previne alocarea unei comenzi pe un camion al cărui șofer rămâne fără program de condus înainte de rampa de descărcare.',
    'Prevents assigning an order to a truck whose driver would run out of legal driving hours before reaching the unloading dock.',
    'Empêche d’attribuer une commande à un camion dont le chauffeur dépasserait ses heures de conduite avant le quai de livraison.',
    'Verhindert die Zuweisung eines Auftrags an einen LKW, dessen Fahrer vor der Entladerampe keine Lenkzeit mehr hätte.',
  ],
  [
    '• Generatorul 1-Click de Oferte către Clienții de pe Coridor:',
    '• 1-Click Capacity Quote Generator for Corridor Clients:',
    '• Générateur d’Offres en 1 Clic pour les Clients du Corridor :',
    '• 1-Klick-Angebotsgenerator für Korridorkunden:',
  ],
  [
    'Elimină zecile de mesaje manuale pe WhatsApp/e-mail când rămân 3–5 LDM liberi.',
    'Eliminates dozens of manual WhatsApp/email messages whenever 3–5 LDM of floor space become available.',
    'Élimine des dizaines de messages manuels sur WhatsApp/e-mail lorsqu’il reste 3 à 5 LDM disponibles.',
    'Ersetzt dutzende manuelle WhatsApp-/E-Mail-Nachrichten, sobald 3–5 LDM frei werden.',
  ],
  [
    '• Poziția Peretelui Despărțitor (Bulkhead Bi-Temp) și Ordinea LIFO:',
    '• Movable Bi-Temp Bulkhead Partition & LIFO Unloading Order:',
    '• Position de la Paroi Séparatrice (Bulkhead Bi-Temp) & Ordre LIFO :',
    '• Position der Bi-Temp-Trennwand (Bulkhead) & LIFO-Entladereihenfolge:',
  ],
  [
    '• Timpii de conducere rămași din Tahograf & Regimul Echipaj (1x vs 2x șoferi):',
    '• Remaining Digital Tachograph Driving Hours & Crew Mode (Single vs. Double-Manning):',
    '• Temps de conduite restants au Tachygraphe & Régime Équipage (1x vs 2x chauffeurs) :',
    '• Restlenkzeiten laut Tachograph & Besatzungsmodus (Einzelfahrer vs. 2-Fahrer-Team):',
  ],
  [
    '• Tonajul util disponibil și sarcina pe axă (nu doar LDM!):',
    '• Available Payload Weight & Axle Load (not just LDM floor space!):',
    '• Tonnage utile disponible et charge à l’essieu (pas seulement les LDM !) :',
    '• Verfügbare Nutzlast und Achslast (nicht nur Lademeter!):',
  ],
  [
    '• Schimbul de paleți (Euro-paleți) și înălțimea utilă:',
    '• Euro-Pallet Exchange Ledger & Internal Clearance Height:',
    '• Échange de palettes Europe (Euro-palettes) et hauteur utile :',
    '• Europaletten-Tausch & nutzbare Innenhöhe:',
  ],
  [
    '• Recalcularea manuală a spațiului după descărcări parțiale:',
    '• Manual recalculation of free floor space after partial unloadings:',
    '• Recalcul manuel de l’espace après des déchargements partiels :',
    '• Manuelle Neuberechnung des Laderaums nach Teilentladungen:',
  ],
  [
    '• Sincronizarea pentru Schimbul de Remorci (Trailer Swap):',
    '• Synchronization for Smart Trailer Swap (Relay & Drop-and-Hook):',
    '• Synchronisation pour l’Échange de Remorques (Trailer Swap) :',
    '• Synchronisierung für den Aufliegertausch (Trailer Swap):',
  ],
  [
    '• Căutarea manuală pe burse (TimoCom / Trans.eu) pentru fiecare segment gol:',
    '• Manual searching on freight exchanges (TimoCom / Trans.eu) for every empty leg:',
    '• Recherche manuelle sur les bourses de fret (TimoCom / Trans.eu) pour chaque segment vide :',
    '• Manuelle Suche in Frachtenbörsen (TimoCom / Trans.eu) für jeden Leersegment:',
  ],
  [
    '• Trimiterea manuală de e-mailuri de disponibilitate și negocierea prețului:',
    '• Manually sending capacity emails and negotiating spot rates:',
    '• Envoi manuel d’e-mails de disponibilité et négociation tarifaire :',
    '• Manuelles Versenden von Kapazitäts-E-Mails und Preisverhandlungen:',
  ],
  [
    '• Grupaj în cascadă (Multi-Drop & Multi-Pick):',
    '• Cascading Multi-Drop & Multi-Pick Groupage:',
    '• Groupage en cascade (Multi-Drop & Multi-Pick) :',
    '• Kaskadiertes Sammelgut (Multi-Drop & Multi-Pick):',
  ],
  [
    '• Conflictul de oferte simultane (Soft-Lock Test):',
    '• Simultaneous Client Quote Conflict (Soft-Lock Stress Test):',
    '• Conflit d’offres simultanées (Test Soft-Lock) :',
    '• Konflikt gleichzeitiger Kundenangebote (Soft-Lock-Test):',
  ],
  [
    '• Cele 4 scenarii obligatorii de Smart Trailer Swap:',
    '• The 4 mandatory Smart Trailer Swap operational scenarios:',
    '• Les 4 scénarios opérationnels obligatoires de Smart Trailer Swap :',
    '• Die 4 verbindlichen Smart-Trailer-Swap-Szenarien:',
  ],
  [
    '• Regula Soft-Lock la Oferte:',
    '• Offer Soft-Lock Rule:',
    '• Règle Soft-Lock sur les Offres :',
    '• Soft-Lock-Regel bei Kundenangeboten:',
  ],
  [
    '• Regula Aprobării Schimbului de Remorci:',
    '• Trailer Swap Dual-Confirmation & Dispatch Approval Rule:',
    '• Règle d’Approbation de l’Échange de Remorques :',
    '• Genehmigungsregel für den Aufliegertausch:',
  ],
  [
    '• Regula LIFO și Incompatibilitate Mărfuri/Temperaturi:',
    '• LIFO Unloading Order & Cargo/Temperature Compatibility Rule:',
    '• Règle LIFO et Incompatibilité Marchandises/Températures :',
    '• LIFO-Regel & Fracht-/Temperaturkompatibilität:',
  ],
  [
    '• Faza 1 (Săptămânile 1–4 — Nucleul Operațional):',
    '• Phase 1 (Weeks 1–4 — Core Operational Engine):',
    '• Phase 1 (Semaines 1–4 — Cœur Opérationnel) :',
    '• Phase 1 (Wochen 1–4 — Operativer Kern):',
  ],
  [
    '• Faza 2 (Săptămânile 5–8 — Motorul Comercial):',
    '• Phase 2 (Weeks 5–8 — Commercial Quoting & Groupage Engine):',
    '• Phase 2 (Semaines 5–8 — Moteur Commercial & Groupage) :',
    '• Phase 2 (Wochen 5–8 — Kommerzielle Angebots- & Sammelgut-Engine):',
  ],
  [
    '• Faza 3 (Săptămânile 9–12 — Diferențiatorul Smart Swap & AI):',
    '• Phase 3 (Weeks 9–12 — Smart Swap & AI Differentiator):',
    '• Phase 3 (Semaines 9–12 — Différenciateur Smart Swap & IA) :',
    '• Phase 3 (Wochen 9–12 — Smart-Swap- & KI-Alleinstellungsmerkmal):',
  ],

  // ======================== FORMS, MODALS & MOCK DATA PHRASES ========================
  ['COMANDĂ NOUĂ DE TRANSPORT / GRUPAJ', 'NEW TRANSPORT / GROUPAGE ORDER', 'NOUVELLE COMMANDE DE TRANSPORT / GROUPAGE', 'NEUER TRANSPORT- / SAMMELGUTAUFTRAG'],
  ['Adaugă Cursă sau Comandă', 'Add Trip or Order', 'Ajouter un Trajet ou une Commande', 'Tour oder Auftrag anlegen'],
  ['Client (din Baza de Clienți)', 'Client (from Client Database)', 'Client (depuis la Base Clients)', 'Kunde (aus Kundenstamm)'],
  ['Client / Denumire Cursă (din Baza de Clienți)', 'Client / Shipment Name (from Client Database)', 'Client / Intitulé du Trajet (Base Clients)', 'Kunde / Tourenbezeichnung (aus Kundenstamm)'],
  ['Companie Client (din Baza de Clienți)', 'Client Company (from Client Database)', 'Société Cliente (Base Clients)', 'Kundenunternehmen (aus Kundenstamm)'],
  ['Caută client salvat în bază...', 'Search saved client in database...', 'Rechercher un client enregistré...', 'Gespeicherten Kunden suchen...'],
  ['Selectează client din listă...', 'Select client from database...', 'Sélectionner un client dans la liste...', 'Kunde aus Liste auswählen...'],
  ['Salvează client nou în baza de date', 'Save new client to database', 'Enregistrer le nouveau client dans la base', 'Neuen Kunden in Datenbank speichern'],
  ['Adresă / Oraș Încărcare', 'Loading Address / City', 'Adresse / Ville de Chargement', 'Beladeadresse / Ort'],
  ['Adresă / Oraș Descărcare', 'Delivery Address / City', 'Adresse / Ville de Livraison', 'Entladeadresse / Ort'],
  ['Caută oraș, stradă, cod poștal sau hub (Google Maps)...', 'Search city, street, postal code or logistics hub (Google Maps)...', 'Rechercher ville, rue, code postal ou hub (Google Maps)...', 'Stadt, Straße, PLZ oder Logistik-Hub suchen (Google Maps)...'],
  ['Sugestii Adrese & Hub-uri Google Maps', 'Google Maps Address & Logistics Hub Suggestions', 'Suggestions d’Adresses & Hubs Google Maps', 'Google Maps Adress- & Logistik-Hub-Vorschläge'],
  ['Deschide locația exactă în Google Maps', 'Open exact coordinates in Google Maps', 'Ouvrir l’emplacement exact dans Google Maps', 'Genauen Standort in Google Maps öffnen'],
  ['CALCUL AUTOMAT DISTANȚĂ RUTIERĂ & COST ESTIMAT (GOOGLE MAPS / OSRM)', 'AUTOMATIC ROAD DISTANCE & COST ESTIMATION (GOOGLE MAPS / OSRM)', 'CALCUL AUTOMATIQUE DISTANCE ROUTIÈRE & COÛT ESTIMÉ (GOOGLE MAPS / OSRM)', 'AUTOMATISCHE STRASSENSTRECKEN- & KOSTENKALKULATION (GOOGLE MAPS / OSRM)'],
  ['Distanță rutieră calculată:', 'Calculated road distance:', 'Distance routière calculée :', 'Berechnete Straßenstrecke:'],
  ['Timp Condus Est.', 'Est. Driving Time', 'Temps de Conduite Est.', 'Gesch. Fahrzeit'],
  ['Cost / Tarif Recom.', 'Cost / Recommended Rate', 'Coût / Tarif Recom.', 'Kosten / Empf. Tarif'],
  ['Preț Oferit (€)', 'Offered Freight Rate (€)', 'Prix Proposé (€)', 'Angebotener Frachtpreis (€)'],
  ['Temperatură Cerută (°C)', 'Required Temperature (°C)', 'Température Requise (°C)', 'Soll-Temperatur (°C)'],
  ['Nr. Paleți', 'Pallet Count', 'Nb. Palettes', 'Palettenanzahl'],
  ['Nr. Europaleți', 'Euro-Pallets', 'Nb. Euro-palettes', 'Europaletten'],
  ['Salvează Comanda', 'Save Order', 'Enregistrer la Commande', 'Auftrag speichern'],
  ['Salvează Fișa Tehnică', 'Save Technical Sheet', 'Enregistrer la Fiche Technique', 'Datenblatt speichern'],
  ['Salvează Șofer', 'Save Driver', 'Enregistrer le Chauffeur', 'Fahrer speichern'],
  ['Salvează Client în Bază', 'Save Client to Database', 'Enregistrer le Client', 'Kunde im Stamm speichern'],
  ['Toate comenzile nealocate au fost deja planificate! Creează o comandă nouă pentru a testa wizard-ul.', 'All unassigned orders have been scheduled! Create a new order to test the dispatch wizard.', 'Toutes les commandes en attente ont été planifiées ! Créez une nouvelle commande pour tester l’assistant.', 'Alle offenen Aufträge wurden bereits eingeplant! Erstellen Sie einen neuen Auftrag, um den Assistenten zu testen.'],
  ['Toate propunerile au fost procesate.', 'All incoming client quotes have been processed.', 'Toutes les offres clients ont été traitées.', 'Alle Kundenangebote wurden bearbeitet.'],
  ['Schimb Reciproc pe A1/M1 (Hegyeshalom HU/AT) — Optimizare Tahograf & Retur Bază Oradea', 'Reciprocal Swap on A1/M1 (Hegyeshalom HU/AT) — Tachograph Optimization & Oradea Base Return', 'Échange Réciproque sur A1/M1 (Hegyeshalom HU/AT) — Optimisation Tachygraphe & Retour Base Oradea', 'Gegenseitiger Tausch auf A1/M1 (Hegyeshalom HU/AT) — Tachographen-Optimierung & Rückkehr Oradea'],
  ['Preluare Unilaterală în München (A8/A99) — Preluare Semiremorcă de Tractor Solo', 'Unilateral Handover in Munich (A8/A99) — Solo Tractor Hooks Semi-Trailer', 'Reprise Unilatérale à Munich (A8/A99) — Tracteur Solo Reprend la Semi-Remorque', 'Einseitige Übernahme in München (A8/A99) — Solo-Zugmaschine übernimmt Auflieger'],
  ['Preluare cu Echipaj de 2 Șoferi în Suben (AT/DE) — Cursă Expres Pharma/Fresh spre Benelux', '2-Driver Team Relay in Suben (AT/DE) — Express Pharma/Fresh Run to Benelux', 'Relais Équipage 2 Chauffeurs à Suben (AT/DE) — Transport Express Pharma/Frais vers Benelux', '2-Fahrer-Team-Übernahme in Suben (AT/DE) — Pharma/Frische-Expresstour Richtung Benelux'],
  ['Eliberare Anticipată Remorcă în Venlo (🇳🇱 NL) pentru Încărcare Urgentă Client Unilever', 'Early Trailer Drop & Hook in Venlo (🇳🇱 NL) for Urgent Unilever Loading', 'Libération Anticipée de Remorque à Venlo (🇳🇱 NL) pour Chargement Urgent Unilever', 'Vorzeitige Aufliegerfreigabe in Venlo (🇳🇱 NL) für dringende Unilever-Beladung'],
  ['Scenariul 1 · Schimb Reciproc de Remorci (A ↔ B)', 'Scenario 1 · Reciprocal Trailer Swap (A ↔ B)', 'Scénario 1 · Échange Réciproque de Remorques (A ↔ B)', 'Szenario 1 · Gegenseitiger Aufliegertausch (A ↔ B)'],
  ['Scenariul 2 · Preluare Unilaterală (Tractor Solo preia Remorca)', 'Scenario 2 · Unilateral Handover (Solo Tractor hooks Trailer)', 'Scénario 2 · Reprise Unilatérale (Tracteur Solo reprend Remorque)', 'Szenario 2 · Einseitige Übernahme (Solo-Zugmaschine übernimmt Auflieger)'],
  ['Scenariul 3 · Preluare Echipaj 2 Șoferi (Relay Rapid)', 'Scenario 3 · 2-Driver Crew Relay (Express SLA Save)', 'Scénario 3 · Relais Équipage 2 Chauffeurs (Relais Rapide)', 'Szenario 3 · 2-Fahrer-Team-Stafette (Schnell-Relay)'],
  ['Scenariul 4 · Eliberare Anticipată Remorcă (Drop & Hook)', 'Scenario 4 · Early Trailer Release (Drop & Hook)', 'Scénario 4 · Libération Anticipée de Remorque (Drop & Hook)', 'Szenario 4 · Vorzeitige Aufliegerfreigabe (Drop & Hook)'],
  ['100% Liberă (După descărcare)', '100% Free (After unloading)', '100 % Disponible (Après déchargement)', '100 % Frei (Nach Entladung)'],
  ['Eliberată anticipat (Swap)', 'Released early (Trailer Swap)', 'Libérée par anticipation (Swap)', 'Vorzeitig frei (Trailer Swap)'],
  ['Grupaj Parțial Disponibil', 'Partial Groupage Space Available', 'Espace Groupage Partiel Disponible', 'Teilladeraum für Sammelgut verfügbar'],
  ['Bi-Temp (-25°C la +25°C) · Perete despărțitor', 'Bi-Temp (-25°C to +25°C) · Movable Bulkhead', 'Bi-Temp (-25°C à +25°C) · Paroi séparatrice', 'Bi-Temp (-25°C bis +25°C) · Trennwand'],
  ['Cap Tractor + Semiremorcă 13.6m', 'Tractor Unit + 13.6m Semi-Trailer', 'Tracteur Routier + Semi-Remorque 13,6 m', 'Sattelzugmaschine + 13,6-m-Auflieger'],
  ['Zona 1 (Față)', 'Zone 1 (Front)', 'Zone 1 (Avant)', 'Zone 1 (Vorne)'],
  ['Zona 2 (Spate)', 'Zone 2 (Rear)', 'Zone 2 (Arrière)', 'Zone 2 (Hinten)'],
  ['Fără sigiliu vamal', 'No customs seal (T1)', 'Sans scellé douanier', 'Ohne Zollverschluss'],
  ['Rampă Frigo OK', 'Cold-Dock Certified', 'Quai Frigo Certifié', 'Kühlrampe OK'],

  // ======================== DAYS, CITIES & COMMON TOKENS ========================
  ['Luni', 'Monday', 'Lundi', 'Montag'],
  ['Marți', 'Tuesday', 'Mardi', 'Dienstag'],
  ['Miercuri', 'Wednesday', 'Mercredi', 'Mittwoch'],
  ['Joi', 'Thursday', 'Jeudi', 'Donnerstag'],
  ['Vineri', 'Friday', 'Vendredi', 'Freitag'],
  ['Sâmbătă', 'Saturday', 'Samedi', 'Samstag'],
  ['Duminică', 'Sunday', 'Dimanche', 'Sonntag'],
  ['Budapesta', 'Budapest', 'Budapest', 'Budapest'],
  ['Viena', 'Vienna', 'Vienne', 'Wien'],
  ['Varșovia', 'Warsaw', 'Varsovie', 'Warschau'],
  ['Praga', 'Prague', 'Prague', 'Prag'],
  ['Copenhaga', 'Copenhagen', 'Copenhague', 'Kopenhagen'],
  ['Anulează', 'Cancel', 'Annuler', 'Abbrechen'],
  ['Salvează', 'Save', 'Enregistrer', 'Speichern'],
  ['Editează', 'Edit', 'Modifier', 'Bearbeiten'],
];

// Sort longest first so multi-word phrases match before sub-phrases
const SORTED_DICTIONARY: TranslationTuple[] = [...RAW_DICTIONARY].sort(
  (a, b) => b[0].length - a[0].length
);

const WORD_REPLACEMENTS: Record<
  Exclude<AppLanguage, 'ro'>,
  Array<[RegExp, string]>
> = {
  en: [
    [/\bȘofer:\s*/g, 'Driver: '],
    [/\bȘofer alocat:\s*/g, 'Assigned driver: '],
    [/\bȘofer titular:\s*/g, 'Lead driver: '],
    [/\bOcupat:\s*/g, 'Occupied: '],
    [/\bPlecat Ieri\b/g, 'Departed Yesterday'],
    [/\bPlecat\s+/g, 'Departed '],
    [/\bTrecut\s+/g, 'Passed '],
    [/\bAzi\s+/g, 'Today '],
    [/\bMâine\s+/g, 'Tomorrow '],
    [/\bPoimâine\s+/g, 'Day after tomorrow '],
    [/\bOra\s+/g, 'Time '],
    [/\bLDM liberi\b/g, 'free LDM'],
    [/\bm liberi\b/g, 'm free'],
    [/\bdin\s+(\d+(?:\.\d+)?m)\s+total remorcă/g, 'of $1 total trailer'],
    [/\bVenit\s+/g, 'Rev. '],
    [/\bh azi\b/g, 'h today'],
    [/\bDescarcă acum la\s+/g, 'Unloading now at '],
    [/\bDescarcă la\s+/g, 'Unloads at '],
    [/\bDescărcare\s+/g, 'Unloading '],
    [/\bÎncărcare\s+/g, 'Loading '],
    [/\bFlori & Plante\b/g, 'Flowers & Plants'],
    [/\bLactate & Brânzeturi\b/g, 'Dairy & Cheese'],
    [/\bBrânzeturi\b/g, 'Cheese'],
    [/\bCașcaval\b/g, 'Hard Cheese'],
    [/\bLactate\b/g, 'Dairy'],
    [/\bCarne refrigerată\b/g, 'Chilled meat'],
    [/\bCarne Congelată\b/g, 'Frozen Meat'],
    [/\bFactură\b/g, 'Invoice'],
    [/\bOferte\b/g, 'Quotes'],
    [/\bPlanificată\b/g, 'Scheduled'],
    [/\bFinalizată\b/g, 'Completed'],
    [/\bCamionetă Express\b/g, 'Express Van'],
    [/\bCap Tractor\b/g, 'Tractor Unit'],
    [/\bSemiremorcă\b/g, 'Semi-Trailer'],
    [/\bRemorci\b/g, 'Trailers'],
    [/\bRemorcă\b/g, 'Trailer'],
    [/\bȘoferi\b/g, 'Drivers'],
    [/\bȘofer\b/g, 'Driver'],
    [/\bClienți\b/g, 'Clients'],
    [/\bComenzi\b/g, 'Orders'],
    [/\bGrupaje\b/g, 'Groupage'],
    [/\bFlotă\b/g, 'Fleet'],
    [/\bAnaliză\b/g, 'Analysis'],
    [/\bCaută\b/g, 'Search'],
    [/\b9 Noi\b/g, '9 Nov'],
    [/\b10 Noi\b/g, '10 Nov'],
    [/\b11 Noi\b/g, '11 Nov'],
    [/\b12 Noi\b/g, '12 Nov'],
    [/\b13 Noi\b/g, '13 Nov'],
    [/\b14 Noi\b/g, '14 Nov'],
    [/\b15 Noi\b/g, '15 Nov'],
    [/\b8 Noi\b/g, '8 Nov'],
    [/\bLUN\b/g, 'MON'],
    [/\bMAR\b/g, 'TUE'],
    [/\bMIE\b/g, 'WED'],
    [/\bJOI\b/g, 'THU'],
    [/\bVIN\b/g, 'FRI'],
    [/\bSÂM\b/g, 'SAT'],
    [/\bDUM\b/g, 'SUN'],
  ],
  fr: [
    [/\bȘofer:\s*/g, 'Chauffeur : '],
    [/\bȘofer alocat:\s*/g, 'Chauffeur attribué : '],
    [/\bȘofer titular:\s*/g, 'Chauffeur titulaire : '],
    [/\bOcupat:\s*/g, 'Occupé : '],
    [/\bPlecat Ieri\b/g, 'Parti hier'],
    [/\bPlecat\s+/g, 'Parti '],
    [/\bTrecut\s+/g, 'Passé '],
    [/\bAzi\s+/g, 'Auj. '],
    [/\bMâine\s+/g, 'Demain '],
    [/\bPoimâine\s+/g, 'Après-demain '],
    [/\bOra\s+/g, 'Heure '],
    [/\bLDM liberi\b/g, 'LDM dispo.'],
    [/\bm liberi\b/g, 'm dispo.'],
    [/\bdin\s+(\d+(?:\.\d+)?m)\s+total remorcă/g, 'sur $1 total remorque'],
    [/\bVenit\s+/g, 'Revenu '],
    [/\bCost\s+/g, 'Coût '],
    [/\bh azi\b/g, 'h auj.'],
    [/\bDescarcă acum la\s+/g, 'Décharge maintenant à '],
    [/\bDescarcă la\s+/g, 'Décharge à '],
    [/\bDescărcare\s+/g, 'Déchargement '],
    [/\bÎncărcare\s+/g, 'Chargement '],
    [/\bFlori & Plante\b/g, 'Fleurs & Plantes'],
    [/\bLactate & Brânzeturi\b/g, 'Produits laitiers & Fromages'],
    [/\bBrânzeturi\b/g, 'Fromages'],
    [/\bCașcaval\b/g, 'Fromage affiné'],
    [/\bLactate\b/g, 'Produits laitiers'],
    [/\bCarne refrigerată\b/g, 'Viande réfrigérée'],
    [/\bCarne Congelată\b/g, 'Viande surgelée'],
    [/\bFactură\b/g, 'Facture'],
    [/\bOferte\b/g, 'Offres'],
    [/\bPlanificată\b/g, 'Planifié'],
    [/\bFinalizată\b/g, 'Terminé'],
    [/\bCamionetă Express\b/g, 'Fourgon Express'],
    [/\bCap Tractor\b/g, 'Tracteur Routier'],
    [/\bSemiremorcă\b/g, 'Semi-Remorque'],
    [/\bRemorci\b/g, 'Remorques'],
    [/\bRemorcă\b/g, 'Remorque'],
    [/\bȘoferi\b/g, 'Chauffeurs'],
    [/\bȘofer\b/g, 'Chauffeur'],
    [/\bClienți\b/g, 'Clients'],
    [/\bComenzi\b/g, 'Commandes'],
    [/\bGrupaje\b/g, 'Groupages'],
    [/\bFlotă\b/g, 'Flotte'],
    [/\bAnaliză\b/g, 'Analyse'],
    [/\bCaută\b/g, 'Rechercher'],
    [/\b9 Noi\b/g, '9 Nov'],
    [/\b10 Noi\b/g, '10 Nov'],
    [/\b11 Noi\b/g, '11 Nov'],
    [/\b12 Noi\b/g, '12 Nov'],
    [/\b13 Noi\b/g, '13 Nov'],
    [/\b14 Noi\b/g, '14 Nov'],
    [/\b15 Noi\b/g, '15 Nov'],
    [/\b8 Noi\b/g, '8 Nov'],
    [/\bLUN\b/g, 'LUN'],
    [/\bMAR\b/g, 'MAR'],
    [/\bMIE\b/g, 'MER'],
    [/\bJOI\b/g, 'JEU'],
    [/\bVIN\b/g, 'VEN'],
    [/\bSÂM\b/g, 'SAM'],
    [/\bDUM\b/g, 'DIM'],
  ],
  de: [
    [/\bȘofer:\s*/g, 'Fahrer: '],
    [/\bȘofer alocat:\s*/g, 'Zugewiesener Fahrer: '],
    [/\bȘofer titular:\s*/g, 'Hauptfahrer: '],
    [/\bOcupat:\s*/g, 'Belegt: '],
    [/\bPlecat Ieri\b/g, 'Gestern abgef.'],
    [/\bPlecat\s+/g, 'Abgefahren '],
    [/\bTrecut\s+/g, 'Passiert '],
    [/\bAzi\s+/g, 'Heute '],
    [/\bMâine\s+/g, 'Morgen '],
    [/\bPoimâine\s+/g, 'Übermorgen '],
    [/\bOra\s+/g, 'Uhrzeit '],
    [/\bLDM liberi\b/g, 'freie LDM'],
    [/\bm liberi\b/g, 'm frei'],
    [/\bdin\s+(\d+(?:\.\d+)?m)\s+total remorcă/g, 'von $1 Gesamtauflieger'],
    [/\bVenit\s+/g, 'Erlös '],
    [/\bCost\s+/g, 'Kosten '],
    [/\bh azi\b/g, 'h heute'],
    [/\bDescarcă acum la\s+/g, 'Entlädt jetzt in '],
    [/\bDescarcă la\s+/g, 'Entlädt in '],
    [/\bDescărcare\s+/g, 'Entladung '],
    [/\bÎncărcare\s+/g, 'Beladung '],
    [/\bFlori & Plante\b/g, 'Blumen & Pflanzen'],
    [/\bLactate & Brânzeturi\b/g, 'Milchprodukte & Käse'],
    [/\bBrânzeturi\b/g, 'Käse'],
    [/\bCașcaval\b/g, 'Schnittkäse'],
    [/\bLactate\b/g, 'Milchprodukte'],
    [/\bCarne refrigerată\b/g, 'Kühlfleisch'],
    [/\bCarne Congelată\b/g, 'Tiefkühlfleisch'],
    [/\bFactură\b/g, 'Rechnung'],
    [/\bOferte\b/g, 'Angebote'],
    [/\bPlanificată\b/g, 'Geplant'],
    [/\bFinalizată\b/g, 'Abgeschlossen'],
    [/\bCamionetă Express\b/g, 'Express-Transporter'],
    [/\bCap Tractor\b/g, 'Sattelzugmaschine'],
    [/\bSemiremorcă\b/g, 'Sattelauflieger'],
    [/\bRemorci\b/g, 'Auflieger'],
    [/\bRemorcă\b/g, 'Auflieger'],
    [/\bȘoferi\b/g, 'Fahrer'],
    [/\bȘofer\b/g, 'Fahrer'],
    [/\bClienți\b/g, 'Kunden'],
    [/\bComenzi\b/g, 'Aufträge'],
    [/\bGrupaje\b/g, 'Sammelgut'],
    [/\bFlotă\b/g, 'Flotte'],
    [/\bAnaliză\b/g, 'Analyse'],
    [/\bCaută\b/g, 'Suchen'],
    [/\b9 Noi\b/g, '9. Nov'],
    [/\b10 Noi\b/g, '10. Nov'],
    [/\b11 Noi\b/g, '11. Nov'],
    [/\b12 Noi\b/g, '12. Nov'],
    [/\b13 Noi\b/g, '13. Nov'],
    [/\b14 Noi\b/g, '14. Nov'],
    [/\b15 Noi\b/g, '15. Nov'],
    [/\b8 Noi\b/g, '8. Nov'],
    [/\bLUN\b/g, 'MO'],
    [/\bMAR\b/g, 'DI'],
    [/\bMIE\b/g, 'MI'],
    [/\bJOI\b/g, 'DO'],
    [/\bVIN\b/g, 'FR'],
    [/\bSÂM\b/g, 'SA'],
    [/\bDUM\b/g, 'SO'],
  ],
};

export function translateRomanianText(
  roText: string,
  lang: AppLanguage
): string {
  if (lang === 'ro' || !roText || !roText.trim()) return roText;

  const langIdx = lang === 'en' ? 1 : lang === 'fr' ? 2 : 3;
  let result = roText;

  for (const tuple of SORTED_DICTIONARY) {
    const roPhrase = tuple[0];
    if (result.includes(roPhrase)) {
      result = result.split(roPhrase).join(tuple[langIdx]);
    }
  }

  for (const [regex, replacement] of WORD_REPLACEMENTS[lang]) {
    result = result.replace(regex, replacement);
  }

  return result;
}

interface TrackedTextNode extends Text {
  __roOrig?: string;
  __lastTranslated?: string;
}

interface TrackedElement extends HTMLElement {
  __roPlaceholder?: string;
  __roTitle?: string;
}

function applyDomTranslation(root: HTMLElement, lang: AppLanguage) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') {
        return NodeFilter.FILTER_REJECT;
      }
      if (parent.closest('[data-no-translate="true"]')) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let currentNode = walker.nextNode() as TrackedTextNode | null;
  while (currentNode) {
    const parent = currentNode.parentElement;
    // Preserve implicit <option> value before translating its label
    if (
      parent &&
      parent.tagName === 'OPTION' &&
      !parent.hasAttribute('value')
    ) {
      parent.setAttribute('value', parent.textContent || '');
    }

    const currentVal = currentNode.nodeValue || '';
    if (
      currentNode.__roOrig === undefined ||
      (currentNode.__lastTranslated !== undefined &&
        currentVal !== currentNode.__lastTranslated)
    ) {
      currentNode.__roOrig = currentVal;
    }

    const targetVal =
      lang === 'ro'
        ? currentNode.__roOrig
        : translateRomanianText(currentNode.__roOrig, lang);

    if (currentVal !== targetVal) {
      currentNode.nodeValue = targetVal;
    }
    currentNode.__lastTranslated = targetVal;
    currentNode = walker.nextNode() as TrackedTextNode | null;
  }

  // Translate placeholder and title attributes
  const elements = root.querySelectorAll<TrackedElement>(
    '[placeholder], [title]'
  );
  elements.forEach((el) => {
    if (el.closest('[data-no-translate="true"]')) return;

    const ph = el.getAttribute('placeholder');
    if (ph !== null) {
      if (el.__roPlaceholder === undefined) {
        el.__roPlaceholder = ph;
      }
      const nextPh =
        lang === 'ro'
          ? el.__roPlaceholder
          : translateRomanianText(el.__roPlaceholder, lang);
      if (ph !== nextPh) {
        el.setAttribute('placeholder', nextPh);
      }
    }

    const title = el.getAttribute('title');
    if (title !== null) {
      if (el.__roTitle === undefined) {
        el.__roTitle = title;
      }
      const nextTitle =
        lang === 'ro'
          ? el.__roTitle
          : translateRomanianText(el.__roTitle, lang);
      if (title !== nextTitle) {
        el.setAttribute('title', nextTitle);
      }
    }
  });
}

interface I18nContextValue {
  lang: AppLanguage;
  setLang: (lang: AppLanguage) => void;
  t: (roText: string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'ro',
  setLang: () => {},
  t: (s) => s,
});

export const useI18n = () => useContext(I18nContext);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [lang, setLangState] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem('bluetrans_tms_lang');
      if (saved === 'ro' || saved === 'en' || saved === 'fr' || saved === 'de') {
        return saved;
      }
    } catch {
      // ignore storage errors
    }
    return 'ro';
  });

  const isMutatingRef = useRef(false);

  const setLang = (next: AppLanguage) => {
    setLangState(next);
    try {
      localStorage.setItem('bluetrans_tms_lang', next);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const root = document.body;
    if (!root) return;

    const runTranslation = () => {
      if (isMutatingRef.current) return;
      isMutatingRef.current = true;
      try {
        applyDomTranslation(root, lang);
      } finally {
        isMutatingRef.current = false;
      }
    };

    runTranslation();

    const observer = new MutationObserver(() => {
      runTranslation();
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [lang]);

  return (
    <I18nContext.Provider
      value={{
        lang,
        setLang,
        t: (roText: string) => translateRomanianText(roText, lang),
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export const LanguageToggleBar: React.FC = () => {
  const { lang, setLang } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const activeOption =
    LANGUAGE_OPTIONS.find((opt) => opt.code === lang) || LANGUAGE_OPTIONS[0];

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDownOutside = (e: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleFocusInOutside = (e: FocusEvent) => {
      if (
        containerRef.current &&
        e.target instanceof Node &&
        !containerRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDownOutside);
    document.addEventListener('focusin', handleFocusInOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDownOutside);
      document.removeEventListener('focusin', handleFocusInOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const focusOptionAt = (index: number) => {
    const clamped =
      ((index % LANGUAGE_OPTIONS.length) + LANGUAGE_OPTIONS.length) %
      LANGUAGE_OPTIONS.length;
    requestAnimationFrame(() => {
      optionRefs.current[clamped]?.focus();
    });
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const activeIdx = LANGUAGE_OPTIONS.findIndex((o) => o.code === lang);
      setIsOpen(true);
      focusOptionAt(activeIdx >= 0 ? activeIdx : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIsOpen(true);
      focusOptionAt(LANGUAGE_OPTIONS.length - 1);
    }
  };

  const handleOptionKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    idx: number
  ) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusOptionAt(idx + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusOptionAt(idx - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      focusOptionAt(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      focusOptionAt(LANGUAGE_OPTIONS.length - 1);
    }
  };

  return (
    <div
      ref={containerRef}
      data-no-translate="true"
      className="tps-lang-dropdown relative inline-flex shrink-0"
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={`Limba aplicației: ${activeOption.name} (${activeOption.label})`}
        title={`Limbă: ${activeOption.name}`}
        onClick={() => setIsOpen((v) => !v)}
        onKeyDown={handleTriggerKeyDown}
        className={`tps-lang-trigger h-9 px-3 rounded-full tahoe-btn-secondary inline-flex items-center gap-1.5 text-xs font-extrabold transition cursor-pointer select-none ${
          isOpen ? 'is-open' : ''
        }`}
      >
        <span className="text-sm leading-none" aria-hidden="true">
          {activeOption.flag}
        </span>
        <span className="tps-lang-label tracking-wide">{activeOption.label}</span>
        <ChevronDown
          aria-hidden="true"
          className={`tps-lang-chevron w-3.5 h-3.5 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          id={panelId}
          role="group"
          aria-label="Selectează limba"
          className="tps-lang-menu absolute right-0 top-[calc(100%+8px)] z-50 w-44 p-1.5 rounded-2xl flex flex-col gap-0.5"
        >
          {LANGUAGE_OPTIONS.map((opt, idx) => {
            const isActive = lang === opt.code;
            return (
              <button
                key={opt.code}
                ref={(el) => {
                  optionRefs.current[idx] = el;
                }}
                type="button"
                data-active={isActive ? 'true' : 'false'}
                aria-pressed={isActive}
                onKeyDown={(e) => handleOptionKeyDown(e, idx)}
                onClick={(e) => {
                  setLang(opt.code);
                  setIsOpen(false);
                  if (e.detail === 0) {
                    triggerRef.current?.focus();
                  }
                }}
                className="tps-lang-option w-full px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 text-xs font-semibold transition cursor-pointer text-left"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-sm leading-none shrink-0" aria-hidden="true">
                    {opt.flag}
                  </span>
                  <span className="truncate">{opt.name}</span>
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  <span className="tps-lang-code text-[10px] font-extrabold tracking-wider uppercase">
                    {opt.label}
                  </span>
                  <Check
                    aria-hidden="true"
                    className={`w-3.5 h-3.5 transition-opacity ${
                      isActive ? 'opacity-100 tps-lang-check' : 'opacity-0'
                    }`}
                  />
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
