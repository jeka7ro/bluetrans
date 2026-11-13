import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { authenticateApiRequest } from './authServer.mjs'
import {
  buildRealisticCargoTrackTick,
  computeServerDetourKm,
  computeServerIncrementalCost,
  scanExchangeOpportunitiesForFleet,
} from './sharedLogisticsCore.mjs'

const ALLOWED_POD_EXTS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp'])
const MAX_POD_BYTES = 12 * 1024 * 1024

// Active SSE subscribers: Set<{ res, tenantId, userId, keepaliveTimer }>
const sseClients = new Set()

export function closeAllTmsSseClients() {
  for (const client of Array.from(sseClients)) {
    try {
      clearInterval(client.keepaliveTimer)
      client.res.end()
    } catch {
      // ignore socket teardown error
    }
    sseClients.delete(client)
  }
}

export function resolveTmsDataDir(rootDir) {
  if (process.env.TMS_DATA_DIR) {
    return path.resolve(process.env.TMS_DATA_DIR)
  }
  if (process.env.RAILWAY_VOLUME_MOUNT_PATH) {
    return path.resolve(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'tms-data')
  }
  return path.resolve(rootDir, '.data', 'tms-data')
}

function writeJsonAtomic(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
  fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2) + '\n', 'utf8')
  fs.renameSync(tmpPath, filePath)
}

function readJsonSafe(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    return parsed && typeof parsed === 'object' ? parsed : fallback
  } catch {
    return fallback
  }
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(payload))
}

function readJsonBody(req, maxBytes = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let total = 0
    let tooLarge = false
    req.on('data', (chunk) => {
      total += chunk.length
      if (total > maxBytes) {
        tooLarge = true
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (tooLarge) {
        reject(Object.assign(new Error('Payload prea mare.'), { statusCode: 413 }))
        return
      }
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve(JSON.parse(raw || '{}'))
      } catch {
        reject(Object.assign(new Error('JSON invalid.'), { statusCode: 400 }))
      }
    })
    req.on('error', reject)
  })
}

function sanitizeSafeSlug(raw = 'blue-trans') {
  const cleaned = String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  return cleaned || 'blue-trans'
}

function sanitizeSafeFileName(raw) {
  const base = path.basename(String(raw || '').trim())
  return base.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '').trim()
}

function isValidPodBuffer(buffer, ext) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 8 || buffer.length > MAX_POD_BYTES) {
    return false
  }
  const lower = ext.toLowerCase()
  if (lower === '.pdf') return buffer.subarray(0, 4).toString('ascii') === '%PDF'
  if (lower === '.jpg' || lower === '.jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  }
  if (lower === '.png') {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47
  }
  if (lower === '.webp') {
    return (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    )
  }
  return false
}

function maskSecret(val = '') {
  const s = String(val || '').trim()
  if (!s) return ''
  if (s.length <= 4) return '••••'
  return `••••${s.slice(-4)}`
}

function defaultTenants() {
  return [
    {
      id: 'blue-trans',
      name: 'Blue Trans Spedition SRL',
      vatCode: 'RO31894510',
      city: 'Oradea, RO',
      plan: 'Enterprise SaaS',
      maxTrucks: 60,
      primaryColor: '#0A84FF',
      createdAt: '2026-11-09T08:00:00.000Z',
    },
    {
      id: 'scandexpres',
      name: 'Scandexpres Nordic AB',
      vatCode: 'SE559102881201',
      city: 'Malmö, SE',
      plan: 'Pro Fleet',
      maxTrucks: 25,
      primaryColor: '#30D158',
      createdAt: '2026-11-10T09:00:00.000Z',
    },
  ]
}

function loadTenants(dataDir) {
  const filePath = path.join(dataDir, 'tenants.json')
  const stored = readJsonSafe(filePath, null)
  if (Array.isArray(stored) && stored.length > 0) {
    return stored
  }
  const seeded = defaultTenants()
  writeJsonAtomic(filePath, seeded)
  return seeded
}

function saveTenants(dataDir, tenants) {
  writeJsonAtomic(path.join(dataDir, 'tenants.json'), tenants)
}

function createEmptyWorkspace(tenantId) {
  return {
    tenantId,
    initialized: false,
    rev: 0,
    updatedAt: new Date().toISOString(),
    updatedBy: 'Sistem',
    trailers: [],
    unassignedOrders: [],
    planningCards: [],
    activeLoads: [],
    proposals: [],
    swapScenarios: [],
    clients: [],
    invoices: [],
    auditLog: [],
    driverMessages: {},
    driverCheckins: {},
    podFiles: [],
    driverExpenses: [],
    offerLinks: [],
    exchangeMatches: [],
    outbox: [],
    lastCargoTrackSyncAt: '',
    lastExchangeScanAt: '',
    integrationSecrets: {
      cargoTrackUrl: '',
      cargoTrackToken: '',
      tachoApiUrl: '',
      tachoToken: '',
      timoComApiKey: '',
      transEuApiKey: '',
      resendApiKey: '',
      senderEmail: 'dispecerat@bluetrans.ro',
      whatsappToken: '',
      whatsappPhoneId: '',
      anafCompanyCif: 'RO31894510',
      anafCompanyName: 'BLUE TRANS SPEDITION SRL',
    },
  }
}

function workspacePath(dataDir, tenantId) {
  const safeId = sanitizeSafeSlug(tenantId)
  return path.join(dataDir, `tenant_${safeId}.json`)
}

function loadWorkspace(dataDir, tenantId) {
  const safeId = sanitizeSafeSlug(tenantId)
  const filePath = workspacePath(dataDir, safeId)
  const raw = readJsonSafe(filePath, null)
  if (!raw) {
    return createEmptyWorkspace(safeId)
  }
  return {
    ...createEmptyWorkspace(safeId),
    ...raw,
    tenantId: safeId,
    integrationSecrets: {
      ...createEmptyWorkspace(safeId).integrationSecrets,
      ...(raw.integrationSecrets || {}),
    },
  }
}

function buildPublicIntegrationStatus(ws) {
  const s = ws.integrationSecrets || {}
  const envCargo = Boolean(process.env.CARGO_TRACK_API_TOKEN)
  const envResend = Boolean(process.env.RESEND_API_KEY)
  const envWhatsapp = Boolean(process.env.WHATSAPP_TOKEN)
  const envTimo = Boolean(process.env.TIMOCOM_API_KEY)

  return {
    cargoTrack: {
      configured: Boolean(s.cargoTrackToken || envCargo),
      url: s.cargoTrackUrl || process.env.CARGO_TRACK_API_URL || '',
      maskedToken: maskSecret(s.cargoTrackToken || process.env.CARGO_TRACK_API_TOKEN || ''),
      lastSyncAt: ws.lastCargoTrackSyncAt || '',
      mode: s.cargoTrackToken || envCargo ? 'API Extern Configurat' : 'Corridor Live Simulator',
    },
    tahograf: {
      configured: Boolean(s.tachoToken || s.cargoTrackToken || envCargo),
      url: s.tachoApiUrl || '',
      maskedToken: maskSecret(s.tachoToken || ''),
      mode: s.tachoToken ? 'G2V2 API Activ' : 'Sincronizat CE 561/2006',
    },
    burse: {
      timoComConfigured: Boolean(s.timoComApiKey || envTimo),
      transEuConfigured: Boolean(s.transEuApiKey),
      maskedTimoCom: maskSecret(s.timoComApiKey || process.env.TIMOCOM_API_KEY || ''),
      maskedTransEu: maskSecret(s.transEuApiKey || ''),
      lastScanAt: ws.lastExchangeScanAt || '',
      matchesCount: Array.isArray(ws.exchangeMatches) ? ws.exchangeMatches.length : 0,
    },
    notificari: {
      emailConfigured: Boolean(s.resendApiKey || envResend),
      senderEmail: s.senderEmail || 'dispecerat@bluetrans.ro',
      maskedResend: maskSecret(s.resendApiKey || process.env.RESEND_API_KEY || ''),
      whatsappConfigured: Boolean(s.whatsappToken || envWhatsapp),
      whatsappPhoneId: s.whatsappPhoneId || '',
      outboxCount: Array.isArray(ws.outbox) ? ws.outbox.length : 0,
    },
    eFactura: {
      companyCif: s.anafCompanyCif || 'RO31894510',
      companyName: s.anafCompanyName || 'BLUE TRANS SPEDITION SRL',
      ublVersion: 'UBL 2.1 CIUS-RO ANAF',
    },
  }
}

const VALID_EXPENSE_CATEGORIES = new Set([
  'FUEL',
  'ADBLUE',
  'TOLL',
  'PARKING',
  'SERVICE',
  'OTHER',
])
const VALID_EXPENSE_CURRENCIES = new Set(['EUR', 'RON', 'HUF', 'PLN', 'SEK', 'CZK'])

function normalizeTrailerKey(raw = '') {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

function assertDriverScope(session, trailerId, res, message) {
  if (
    session?.user?.role === 'SOFER' &&
    session.user.driverTrailerId &&
    trailerId &&
    normalizeTrailerKey(session.user.driverTrailerId) !== normalizeTrailerKey(trailerId)
  ) {
    sendJson(res, 403, { ok: false, error: message })
    return false
  }
  return true
}

function getMimeForExt(ext) {
  const lower = String(ext || '').toLowerCase()
  if (lower === '.pdf') return 'application/pdf'
  if (lower === '.png') return 'image/png'
  if (lower === '.webp') return 'image/webp'
  return 'image/jpeg'
}

function saveValidatedDriverUpload({ dataDir, subDir, tenantId, rawFileName, fallbackName, base64 }) {
  const safeOriginal = sanitizeSafeFileName(String(rawFileName || fallbackName))
  const ext = path.extname(safeOriginal).toLowerCase()
  if (!ALLOWED_POD_EXTS.has(ext)) {
    throw Object.assign(new Error('Format permis: PDF, JPG, PNG sau WEBP.'), { statusCode: 400 })
  }
  const cleanBase64 = String(base64 || '').replace(/^data:[^;]+;base64,/i, '')
  const buffer = Buffer.from(cleanBase64, 'base64')
  if (!isValidPodBuffer(buffer, ext)) {
    throw Object.assign(
      new Error('Fișierul selectat este invalid sau prea mare (max 12MB).'),
      { statusCode: 400 }
    )
  }
  const targetDir = path.resolve(dataDir, subDir, tenantId)
  fs.mkdirSync(targetDir, { recursive: true })
  const storedName = `${Date.now()}-${safeOriginal}`
  const destPath = path.resolve(targetDir, storedName)
  if (!destPath.startsWith(targetDir + path.sep)) {
    throw Object.assign(new Error('Cale invalidă.'), { statusCode: 400 })
  }
  fs.writeFileSync(destPath, buffer)
  return {
    storedName,
    safeOriginal,
    sizeBytes: buffer.length,
    mimeType: getMimeForExt(ext),
  }
}

function serveDriverUploadedFile({
  req,
  res,
  reqPath,
  prefix,
  subDir,
  queryParams,
  dataDir,
  authDbPath,
  authErrorMsg,
  invalidMsg,
  notFoundMsg,
}) {
  const authTokenParam = String(queryParams.get('token') || '').trim()
  const session = authenticateApiRequest(req, authDbPath, authTokenParam)
  if (!session) {
    sendJson(res, 401, { ok: false, error: authErrorMsg })
    return true
  }
  const tenantId = sanitizeSafeSlug(queryParams.get('tenantId') || 'blue-trans')
  const rawName = decodeURIComponent(reqPath.slice(prefix.length))
  const safeName = sanitizeSafeFileName(rawName)
  const ext = path.extname(safeName).toLowerCase()
  if (!safeName || !ALLOWED_POD_EXTS.has(ext)) {
    sendJson(res, 400, { ok: false, error: invalidMsg })
    return true
  }
  const uploadDir = path.resolve(dataDir, subDir, tenantId)
  const filePath = path.resolve(uploadDir, safeName)
  if (!filePath.startsWith(uploadDir + path.sep) || !fs.existsSync(filePath)) {
    sendJson(res, 404, { ok: false, error: notFoundMsg })
    return true
  }
  const stat = fs.statSync(filePath)
  res.statusCode = 200
  res.setHeader('Content-Type', getMimeForExt(ext))
  res.setHeader('Content-Length', String(stat.size))
  res.setHeader('Cache-Control', 'no-cache')
  if (req.method === 'HEAD') {
    res.end()
    return true
  }
  fs.createReadStream(filePath).pipe(res)
  return true
}

function stripRevenueFromItem(item) {
  if (!item || typeof item !== 'object') return item
  const {
    revenueEur: _rev,
    groupageBonusEur: _bonus,
    directCostsEur: _cost,
    netProfitEur: _net,
    marginPct: _margin,
    ...rest
  } = item
  return rest
}

function toClientWorkspacePayload(ws, userRole = 'ADMIN') {
  const { integrationSecrets: _hidden, ...rest } = ws
  if (userRole === 'SOFER') {
    return {
      ...rest,
      invoices: [],
      proposals: [],
      clients: [],
      exchangeMatches: [],
      outbox: [],
      planningCards: Array.isArray(rest.planningCards)
        ? rest.planningCards.map(stripRevenueFromItem)
        : [],
      activeLoads: Array.isArray(rest.activeLoads)
        ? rest.activeLoads.map(stripRevenueFromItem)
        : [],
      driverExpenses: Array.isArray(rest.driverExpenses) ? rest.driverExpenses : [],
      integrationStatus: buildPublicIntegrationStatus(ws),
    }
  }
  return {
    ...rest,
    driverExpenses: Array.isArray(rest.driverExpenses) ? rest.driverExpenses : [],
    integrationStatus: buildPublicIntegrationStatus(ws),
  }
}

function saveWorkspace(dataDir, ws) {
  ws.updatedAt = new Date().toISOString()
  writeJsonAtomic(workspacePath(dataDir, ws.tenantId), ws)
}

function broadcastTenantUpdate(tenantId, eventPayload) {
  const serialized = `event: tms-update\ndata: ${JSON.stringify(eventPayload)}\n\n`
  for (const client of Array.from(sseClients)) {
    if (client.tenantId !== tenantId) continue
    try {
      client.res.write(serialized)
    } catch {
      clearInterval(client.keepaliveTimer)
      sseClients.delete(client)
    }
  }
}

function buildPublicOfferSnapshot(dataDir, token) {
  const tenants = loadTenants(dataDir)
  for (const t of tenants) {
    const ws = loadWorkspace(dataDir, t.id)
    const link = (ws.offerLinks || []).find((l) => l.token === token)
    if (link) {
      return { tenant: t, ws, link }
    }
  }
  return null
}

function resolveRemainingCommercialLdm(ws, trailerId) {
  const tr = (ws.trailers || []).find((x) => x.id === trailerId)
  if (!tr) return { trailer: null, remainingLdm: 0, softReserved: 0 }
  const pendingReserved = (ws.proposals || [])
    .filter((p) => p.trailerId === trailerId && p.status === 'Pending review')
    .reduce((acc, p) => acc + Number(p.ldmRequested || 0), 0)
  return {
    trailer: tr,
    remainingLdm: Number(tr.freeLdm || 0),
    softReserved: +pendingReserved.toFixed(1),
  }
}

async function dispatchOutboundNotification({ ws, channel, to, subject, message }) {
  const secrets = ws.integrationSecrets || {}
  const resendKey = secrets.resendApiKey || process.env.RESEND_API_KEY || ''
  const senderEmail = secrets.senderEmail || process.env.SENDER_EMAIL || 'dispecerat@bluetrans.ro'
  const waToken = secrets.whatsappToken || process.env.WHATSAPP_TOKEN || ''
  const waPhoneId = secrets.whatsappPhoneId || process.env.WHATSAPP_PHONE_ID || ''

  const entry = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    channel,
    to: String(to || ''),
    subject: String(subject || ''),
    messagePreview: String(message || '').slice(0, 260),
    deliveryMode: 'outbox_fallback',
    providerStatus: 'Logged locally (deep-link ready)',
  }

  if (channel === 'email' && resendKey && to) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: senderEmail,
          to: [to],
          subject,
          text: message,
        }),
      })
      const json = await r.json().catch(() => ({}))
      if (r.ok) {
        entry.deliveryMode = 'resend_live'
        entry.providerStatus = `Trimis live prin Resend (${json.id || 'OK'})`
      } else {
        entry.providerStatus = `Resend eroare HTTP ${r.status} (salvat în Outbox)`
      }
    } catch (err) {
      entry.providerStatus = `Resend offline: ${err instanceof Error ? err.message : 'eroare'}`
    }
  } else if (channel === 'whatsapp' && waToken && waPhoneId && to) {
    try {
      const digitsOnly = String(to).replace(/[^0-9]/g, '')
      const r = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(waPhoneId)}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${waToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: digitsOnly,
          type: 'text',
          text: { body: `${subject ? subject + '\n\n' : ''}${message}` },
        }),
      })
      if (r.ok) {
        entry.deliveryMode = 'whatsapp_cloud_live'
        entry.providerStatus = 'Trimis live prin WhatsApp Cloud API'
      } else {
        entry.providerStatus = `WhatsApp HTTP ${r.status} (disponibil link wa.me)`
      }
    } catch (err) {
      entry.providerStatus = `WhatsApp offline: ${err instanceof Error ? err.message : 'eroare'}`
    }
  }

  ws.outbox = [entry, ...(ws.outbox || [])].slice(0, 100)
  return entry
}

export function handleTmsApiRequest(req, res, rootDir, authDbPath) {
  const rawUrl = req.url || '/'
  const [reqPath, rawQuery = ''] = rawUrl.split('?')

  const isPublicOfferApi = reqPath.startsWith('/api/public/offer')
  const isTmsApi = reqPath.startsWith('/api/tms/')
  if (!isPublicOfferApi && !isTmsApi) {
    return false
  }

  const dataDir = resolveTmsDataDir(rootDir)
  const queryParams = new URLSearchParams(rawQuery)

  // =========================================================================
  // A. PUBLIC UN-AUTHENTICATED CLIENT OFFER PORTAL (`/api/public/offer*`)
  // =========================================================================
  if (req.method === 'GET' && reqPath === '/api/public/offer') {
    const token = String(queryParams.get('token') || '').trim()
    if (!token) {
      sendJson(res, 400, { ok: false, error: 'Token ofertă lipsă.' })
      return true
    }
    const found = buildPublicOfferSnapshot(dataDir, token)
    if (!found) {
      sendJson(res, 404, {
        ok: false,
        error: 'Linkul de ofertare este invalid sau a expirat.',
      })
      return true
    }
    const { tenant, ws, link } = found
    if (link.expiresAt && Date.parse(link.expiresAt) < Date.now()) {
      sendJson(res, 410, {
        ok: false,
        error: 'Fereastra de ofertare pentru această cursă s-a închis.',
      })
      return true
    }
    const { trailer, remainingLdm, softReserved } = resolveRemainingCommercialLdm(
      ws,
      link.trailerId
    )
    sendJson(res, 200, {
      ok: true,
      offer: {
        token: link.token,
        companyName: tenant.name,
        trailerId: link.trailerId,
        routeSummary: trailer?.routeSummary || link.routeSummary || [],
        corridorCode: trailer?.corridorCode || '',
        loadingWindow: link.loadingWindow || '',
        latestDelivery: link.latestDelivery || '',
        tempC: trailer?.zone2Temp ?? link.tempC ?? 4,
        zone1Temp: trailer?.zone1Temp ?? -18,
        availableLdm: remainingLdm,
        softReservedLdm: softReserved,
        expiresAt: link.expiresAt,
      },
    })
    return true
  }

  if (req.method === 'POST' && reqPath === '/api/public/offer/submit') {
    void (async () => {
      try {
        const body = await readJsonBody(req, 512 * 1024)
        const token = String(body.token || '').trim()
        const found = buildPublicOfferSnapshot(dataDir, token)
        if (!found) {
          sendJson(res, 404, { ok: false, error: 'Link ofertă invalid sau expirat.' })
          return
        }
        const { ws, link } = found
        if (link.expiresAt && Date.parse(link.expiresAt) < Date.now()) {
          sendJson(res, 410, { ok: false, error: 'Linkul de ofertare a expirat.' })
          return
        }

        const clientName = String(body.clientName || '').trim()
        const clientContact = String(body.clientContact || 'client@portal.eu').trim()
        const routeFrom = String(body.routeFrom || '').trim()
        const routeTo = String(body.routeTo || '').trim()
        const ldmReq = Math.max(0.4, Math.min(13.6, Number(body.ldmRequested) || 0))
        const weightTons = Math.max(0.1, Math.min(22, Number(body.weightTons) || +(ldmReq * 1.3).toFixed(1)))
        const tempReq = Number.isFinite(Number(body.tempRequired)) ? Number(body.tempRequired) : 4
        const offeredPrice = Math.max(50, Number(body.offeredPriceEur) || 0)

        if (!clientName || !routeFrom || !routeTo || ldmReq < 0.4 || offeredPrice <= 0) {
          sendJson(res, 400, {
            ok: false,
            error: 'Completează compania, ruta (încărcare → descărcare), LDM și prețul oferit.',
          })
          return
        }

        const { trailer, remainingLdm } = resolveRemainingCommercialLdm(ws, link.trailerId)
        const detourKm = computeServerDetourKm(trailer, routeFrom, routeTo)
        const incCost = computeServerIncrementalCost(ldmReq, detourKm, routeFrom, routeTo)
        const contrib = offeredPrice - incCost
        const exceedsNow = ldmReq > remainingLdm + 1e-9

        const newProposal = {
          id: `prop-pub-${Date.now().toString().slice(-6)}`,
          trailerId: link.trailerId,
          segmentLabel: `${routeFrom} → ${routeTo} (Portal Public · ${remainingLdm.toFixed(1)} LDM liberi)`,
          clientName,
          clientContact,
          routeFrom,
          routeTo,
          ldmRequested: +ldmReq.toFixed(1),
          availableLdmOnSegment: +remainingLdm.toFixed(1),
          weightTons: +weightTons.toFixed(1),
          tempRequired: tempReq,
          offeredPriceEur: offeredPrice,
          incrementalCostEur: incCost,
          estimatedContributionEur: contrib,
          detourKm,
          loadingWindow: link.loadingWindow || 'Conform planificării',
          latestDelivery: link.latestDelivery || 'Conform planificării',
          status: 'Pending review',
          submittedAt: `Astăzi ${new Intl.DateTimeFormat('ro-RO', {
            timeZone: 'Europe/Bucharest',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }).format(new Date())} (Link Client Live)`,
          hasConflictWarning: exceedsNow,
          conflictDetails: exceedsNow
            ? `Capacitate cerută (${ldmReq.toFixed(1)} LDM) depășește spațiul curent (${remainingLdm.toFixed(1)} LDM). Poți trimite contraofertă.`
            : undefined,
        }

        ws.proposals = [newProposal, ...(ws.proposals || [])]
        ws.auditLog = [
          {
            id: `a-${Date.now()}`,
            at: new Date().toISOString(),
            who: `Client Extern (${clientName})`,
            action: `Propunere live pe /ofertare/${token.slice(0, 6)}: ${routeFrom} → ${routeTo}, ${ldmReq.toFixed(1)} LDM, ${offeredPrice} € (contrib +${contrib} €)`,
          },
          ...(ws.auditLog || []),
        ].slice(0, 200)
        ws.rev = Number(ws.rev || 0) + 1
        ws.updatedBy = `Portal Client (${clientName})`
        saveWorkspace(dataDir, ws)

        broadcastTenantUpdate(ws.tenantId, {
          type: 'proposal-submitted',
          rev: ws.rev,
          updatedBy: ws.updatedBy,
          proposal: newProposal,
        })

        sendJson(res, 201, {
          ok: true,
          proposalId: newProposal.id,
          detourKm,
          estimatedContributionEur: contrib,
        })
      } catch (err) {
        sendJson(res, err?.statusCode || 500, {
          ok: false,
          error: err instanceof Error ? err.message : 'Eroare la înregistrarea propunerii.',
        })
      }
    })()
    return true
  }

  // =========================================================================
  // B. PROTECTED DRIVER POD & EXPENSE RECEIPT DOWNLOAD
  // =========================================================================
  if (
    (req.method === 'GET' || req.method === 'HEAD') &&
    reqPath.startsWith('/api/tms/driver/pod/')
  ) {
    return serveDriverUploadedFile({
      req,
      res,
      reqPath,
      prefix: '/api/tms/driver/pod/',
      subDir: 'pod-uploads',
      queryParams,
      dataDir,
      authDbPath,
      authErrorMsg: 'Autentificare necesară pentru vizualizare POD/CMR.',
      invalidMsg: 'Nume fișier POD invalid.',
      notFoundMsg: 'Fișierul CMR/POD nu există.',
    })
  }

  if (
    (req.method === 'GET' || req.method === 'HEAD') &&
    reqPath.startsWith('/api/tms/driver/expense-file/')
  ) {
    return serveDriverUploadedFile({
      req,
      res,
      reqPath,
      prefix: '/api/tms/driver/expense-file/',
      subDir: 'expense-uploads',
      queryParams,
      dataDir,
      authDbPath,
      authErrorMsg: 'Autentificare necesară pentru vizualizare bon/document.',
      invalidMsg: 'Nume fișier cheltuială invalid.',
      notFoundMsg: 'Fișierul atașat nu există.',
    })
  }

  // =========================================================================
  // C. AUTHENTICATED REAL-TIME SSE STREAM (`/api/tms/events`)
  // =========================================================================
  if (req.method === 'GET' && reqPath === '/api/tms/events') {
    const sseToken = String(queryParams.get('token') || '').trim()
    const session = authenticateApiRequest(req, authDbPath, sseToken)
    if (!session) {
      sendJson(res, 401, { ok: false, error: 'Autentificare necesară pentru flux live.' })
      return true
    }
    const tenantId = sanitizeSafeSlug(queryParams.get('tenantId') || 'blue-trans')

    res.statusCode = 200
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders?.()

    const ws = loadWorkspace(dataDir, tenantId)
    res.write(
      `event: connected\ndata: ${JSON.stringify({
        tenantId,
        rev: ws.rev || 0,
        user: session.user.name,
      })}\n\n`
    )

    const keepaliveTimer = setInterval(() => {
      try {
        res.write(': keepalive\n\n')
      } catch {
        clearInterval(keepaliveTimer)
        sseClients.delete(entry)
      }
    }, 25000)
    keepaliveTimer.unref?.()

    const entry = {
      res,
      tenantId,
      userId: session.user.id,
      keepaliveTimer,
    }
    sseClients.add(entry)

    req.on('close', () => {
      clearInterval(keepaliveTimer)
      sseClients.delete(entry)
    })
    return true
  }

  // =========================================================================
  // D. ALL OTHER `/api/tms/*` ROUTES REQUIRE BEARER SESSION
  // =========================================================================
  const session = authenticateApiRequest(req, authDbPath)
  if (!session) {
    sendJson(res, 401, { ok: false, error: 'Sesiune expirată sau neautentificată.' })
    return true
  }

  const requestedTenantId = sanitizeSafeSlug(
    queryParams.get('tenantId') || String(req.headers['x-tenant-id'] || 'blue-trans')
  )

  // 1. Multi-Tenant SaaS Endpoints
  if (req.method === 'GET' && reqPath === '/api/tms/tenants') {
    const tenants = loadTenants(dataDir)
    sendJson(res, 200, { ok: true, tenants })
    return true
  }

  if (req.method === 'POST' && reqPath === '/api/tms/tenants') {
    if (session.user.role !== 'ADMIN') {
      sendJson(res, 403, { ok: false, error: 'Doar administratorul SaaS poate gestiona companiile.' })
      return true
    }
    void (async () => {
      try {
        const body = await readJsonBody(req)
        const name = String(body.name || '').trim()
        const vatCode = String(body.vatCode || '').trim().toUpperCase()
        const city = String(body.city || 'Oradea, RO').trim()
        const plan = String(body.plan || 'Pro Fleet').trim()
        const maxTrucks = Math.max(5, Math.min(500, Number(body.maxTrucks) || 25))
        if (!name || !vatCode) {
          sendJson(res, 400, { ok: false, error: 'Numele companiei și CUI/VAT sunt obligatorii.' })
          return
        }
        const id = sanitizeSafeSlug(body.id || name)
        const tenants = loadTenants(dataDir)
        if (tenants.some((t) => t.id === id)) {
          sendJson(res, 409, { ok: false, error: `Organizația "${id}" există deja.` })
          return
        }
        const newTenant = {
          id,
          name,
          vatCode,
          city,
          plan,
          maxTrucks,
          primaryColor: String(body.primaryColor || '#0A84FF'),
          createdAt: new Date().toISOString(),
        }
        const nextTenants = [...tenants, newTenant]
        saveTenants(dataDir, nextTenants)
        const ws = loadWorkspace(dataDir, id)
        ws.integrationSecrets.anafCompanyCif = vatCode
        ws.integrationSecrets.anafCompanyName = name
        saveWorkspace(dataDir, ws)
        sendJson(res, 201, { ok: true, tenant: newTenant, tenants: nextTenants })
      } catch (err) {
        sendJson(res, 500, { ok: false, error: err instanceof Error ? err.message : 'Eroare tenant.' })
      }
    })()
    return true
  }

  // 2. Get Current Workspace State
  if (req.method === 'GET' && reqPath === '/api/tms/state') {
    const tenants = loadTenants(dataDir)
    const activeTenant = tenants.find((t) => t.id === requestedTenantId) || tenants[0]
    const ws = loadWorkspace(dataDir, activeTenant.id)
    sendJson(res, 200, {
      ok: true,
      tenant: activeTenant,
      tenants,
      workspace: toClientWorkspacePayload(ws, session.user.role),
    })
    return true
  }

  // 3. Idempotent Initial Bootstrap + State Patch Persist
  if (req.method === 'POST' && (reqPath === '/api/tms/bootstrap' || reqPath === '/api/tms/state')) {
    if (session.user.role === 'SOFER') {
      sendJson(res, 403, { ok: false, error: 'Șoferii folosesc endpoint-urile dedicate Portal Șofer.' })
      return true
    }
    void (async () => {
      try {
        const body = await readJsonBody(req, 6 * 1024 * 1024)
        const tenantId = sanitizeSafeSlug(body.tenantId || requestedTenantId)
        const ws = loadWorkspace(dataDir, tenantId)

        if (reqPath === '/api/tms/bootstrap' && ws.initialized) {
          sendJson(res, 200, {
            ok: true,
            alreadyInitialized: true,
            workspace: toClientWorkspacePayload(ws),
          })
          return
        }

        const expectedRev = Number(body.expectedRev)
        if (
          reqPath === '/api/tms/state' &&
          Number.isFinite(expectedRev) &&
          expectedRev >= 0 &&
          ws.initialized &&
          ws.rev > expectedRev &&
          !body.force
        ) {
          // Soft optimistic conflict notice: return server state so client merges cleanly
          sendJson(res, 409, {
            ok: false,
            conflict: true,
            error: `Planul a fost actualizat între timp de ${ws.updatedBy || 'un coleg'}. Se sincronizează...`,
            workspace: toClientWorkspacePayload(ws),
          })
          return
        }

        const patch = body.patch && typeof body.patch === 'object' ? body.patch : body
        const allowedKeys = [
          'trailers',
          'unassignedOrders',
          'planningCards',
          'activeLoads',
          'proposals',
          'swapScenarios',
          'clients',
          'invoices',
          'auditLog',
        ]
        for (const k of allowedKeys) {
          if (Array.isArray(patch[k])) {
            ws[k] = patch[k]
          }
        }
        if (patch.driverMessages && typeof patch.driverMessages === 'object') {
          ws.driverMessages = patch.driverMessages
        }
        if (patch.driverCheckins && typeof patch.driverCheckins === 'object') {
          ws.driverCheckins = patch.driverCheckins
        }

        ws.initialized = true
        ws.rev = Number(ws.rev || 0) + 1
        ws.updatedBy = session.user.name
        saveWorkspace(dataDir, ws)

        broadcastTenantUpdate(tenantId, {
          type: 'state-sync',
          rev: ws.rev,
          updatedBy: ws.updatedBy,
          reason: String(body.reason || 'actualizare planificare'),
        })

        sendJson(res, 200, {
          ok: true,
          workspace: toClientWorkspacePayload(ws),
        })
      } catch (err) {
        sendJson(res, err?.statusCode || 500, {
          ok: false,
          error: err instanceof Error ? err.message : 'Eroare la salvarea stării TMS.',
        })
      }
    })()
    return true
  }

  // 4. Atomic Server-Side Proposal Acceptance (Prevents Soft-Lock Double-Booking!)
  if (req.method === 'POST' && reqPath === '/api/tms/proposals/accept') {
    if (!['ADMIN', 'DISPECER', 'FINANCIAR'].includes(session.user.role)) {
      sendJson(res, 403, { ok: false, error: 'Rol insuficient pentru acceptarea ofertelor.' })
      return true
    }
    void (async () => {
      try {
        const body = await readJsonBody(req)
        const tenantId = sanitizeSafeSlug(body.tenantId || requestedTenantId)
        const proposalId = String(body.proposalId || '').trim()
        const ws = loadWorkspace(dataDir, tenantId)

        if (!ws.initialized) {
          sendJson(res, 200, { ok: true, localOnly: true })
          return
        }

        const target = (ws.proposals || []).find((p) => p.id === proposalId)
        if (!target) {
          sendJson(res, 404, { ok: false, error: 'Propunerea nu mai există.' })
          return
        }
        if (target.status === 'Accepted') {
          sendJson(res, 409, {
            ok: false,
            error: 'Această ofertă a fost deja acceptată de un alt dispecer.',
            workspace: toClientWorkspacePayload(ws),
          })
          return
        }

        const tr = (ws.trailers || []).find((t) => t.id === target.trailerId)
        const liveFree = tr ? Number(tr.freeLdm || 0) : Number(target.availableLdmOnSegment || 0)
        if (Number(target.ldmRequested || 0) > liveFree + 0.05) {
          sendJson(res, 409, {
            ok: false,
            error: `Blocaj Soft-Lock: Remorca ${target.trailerId} mai are doar ${liveFree.toFixed(1)} LDM liberi (oferta cere ${target.ldmRequested} LDM).`,
            workspace: toClientWorkspacePayload(ws),
          })
          return
        }

        // Update proposals server-side atomically
        ws.proposals = (ws.proposals || []).map((p) => {
          if (p.id === proposalId) {
            return { ...p, status: 'Accepted', hasConflictWarning: false }
          }
          if (p.trailerId === target.trailerId && p.status === 'Pending review') {
            const remaining = Math.max(0, +(liveFree - Number(target.ldmRequested || 0)).toFixed(1))
            return {
              ...p,
              availableLdmOnSegment: remaining,
              hasConflictWarning: Number(p.ldmRequested || 0) > remaining,
              conflictDetails:
                Number(p.ldmRequested || 0) > remaining
                  ? `CAPACITATE INSUFICIENTĂ DUPĂ ACCEPTARE: Au mai rămas ${remaining} LDM liberi pe ${p.trailerId}, iar această propunere cere ${p.ldmRequested} LDM.`
                  : undefined,
            }
          }
          return p
        })

        ws.rev = Number(ws.rev || 0) + 1
        ws.updatedBy = session.user.name
        saveWorkspace(dataDir, ws)

        broadcastTenantUpdate(tenantId, {
          type: 'proposal-accepted',
          rev: ws.rev,
          updatedBy: session.user.name,
          proposalId,
        })

        sendJson(res, 200, {
          ok: true,
          workspace: toClientWorkspacePayload(ws),
        })
      } catch (err) {
        sendJson(res, 500, { ok: false, error: err instanceof Error ? err.message : 'Eroare acceptare.' })
      }
    })()
    return true
  }

  // 5. Generate Shareable Public Client Offer Link (`/ofertare/:token`)
  if (req.method === 'POST' && reqPath === '/api/tms/proposals/create-link') {
    if (!['ADMIN', 'DISPECER', 'FINANCIAR'].includes(session.user.role)) {
      sendJson(res, 403, { ok: false, error: 'Acces restricționat.' })
      return true
    }
    void (async () => {
      try {
        const body = await readJsonBody(req)
        const tenantId = sanitizeSafeSlug(body.tenantId || requestedTenantId)
        const trailerId = String(body.trailerId || 'BH 67 STS').trim()
        const ws = loadWorkspace(dataDir, tenantId)
        const tr = (ws.trailers || []).find((t) => t.id === trailerId)

        const token = crypto.randomBytes(12).toString('hex')
        const linkRecord = {
          token,
          trailerId,
          routeSummary: tr?.routeSummary || body.routeSummary || [],
          loadingWindow: String(body.loadingWindow || tr?.segments?.[1]?.etaStart || 'Astăzi / Mâine'),
          latestDelivery: String(body.latestDelivery || tr?.segments?.[tr.segments.length - 1]?.etaEnd || 'Conform coridorului'),
          tempC: Number.isFinite(Number(body.tempC)) ? Number(body.tempC) : tr?.zone2Temp ?? 4,
          createdBy: session.user.name,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        }

        ws.offerLinks = [linkRecord, ...(ws.offerLinks || [])].slice(0, 50)
        ws.rev = Number(ws.rev || 0) + 1
        ws.updatedBy = session.user.name
        saveWorkspace(dataDir, ws)

        sendJson(res, 201, {
          ok: true,
          link: linkRecord,
          path: `/ofertare/${token}`,
        })
      } catch (err) {
        sendJson(res, 500, { ok: false, error: err instanceof Error ? err.message : 'Eroare generare link.' })
      }
    })()
    return true
  }

  // 6. Driver Portal: Upload Signed CMR / POD File (Image/PDF)
  if (req.method === 'POST' && reqPath === '/api/tms/driver/pod-upload') {
    void (async () => {
      try {
        const body = await readJsonBody(req, 16 * 1024 * 1024)
        const tenantId = sanitizeSafeSlug(body.tenantId || requestedTenantId)
        const trailerId = String(body.trailerId || '').trim()
        const segmentId = String(body.segmentId || '').trim()
        const segmentLabel = String(body.segmentLabel || '').trim()

        if (
          !assertDriverScope(
            session,
            trailerId,
            res,
            'Nu poți încărca CMR pentru altă remorcă.'
          )
        ) {
          return
        }

        const saved = saveValidatedDriverUpload({
          dataDir,
          subDir: 'pod-uploads',
          tenantId,
          rawFileName: body.fileName,
          fallbackName: 'cmr-semnat.pdf',
          base64: body.base64,
        })

        const ws = loadWorkspace(dataDir, tenantId)
        const podRecord = {
          id: `pod-${Date.now()}`,
          fileName: saved.storedName,
          displayName: saved.safeOriginal,
          trailerId,
          segmentId,
          segmentLabel,
          sizeBytes: saved.sizeBytes,
          uploadedBy: session.user.name,
          uploadedAt: new Date().toISOString(),
        }
        ws.podFiles = [podRecord, ...(ws.podFiles || [])].slice(0, 120)
        ws.auditLog = [
          {
            id: `a-${Date.now()}`,
            at: new Date().toISOString(),
            who: session.user.name,
            action: `CMR/POD încărcat (${trailerId} · ${segmentLabel || segmentId}): ${saved.safeOriginal}`,
          },
          ...(ws.auditLog || []),
        ].slice(0, 200)
        ws.rev = Number(ws.rev || 0) + 1
        ws.updatedBy = session.user.name
        saveWorkspace(dataDir, ws)

        broadcastTenantUpdate(tenantId, {
          type: 'driver-pod-uploaded',
          rev: ws.rev,
          updatedBy: session.user.name,
          pod: podRecord,
        })

        sendJson(res, 200, {
          ok: true,
          pod: podRecord,
          workspace: toClientWorkspacePayload(ws, session.user.role),
        })
      } catch (err) {
        sendJson(res, err?.statusCode || 500, {
          ok: false,
          error: err instanceof Error ? err.message : 'Eroare la upload POD.',
        })
      }
    })()
    return true
  }

  // 6B. Driver Portal: Upload Fuel Receipt / Road Toll / Invoice Attachment
  if (req.method === 'POST' && reqPath === '/api/tms/driver/expense') {
    void (async () => {
      try {
        const body = await readJsonBody(req, 16 * 1024 * 1024)
        const tenantId = sanitizeSafeSlug(body.tenantId || requestedTenantId)
        const trailerId = String(body.trailerId || session.user.driverTrailerId || '').trim()
        if (!trailerId) {
          sendJson(res, 400, { ok: false, error: 'Camionul/remorca este obligatorie.' })
          return
        }
        if (
          !assertDriverScope(
            session,
            trailerId,
            res,
            'Nu poți introduce cheltuieli pentru altă cabină.'
          )
        ) {
          return
        }

        const rawCategory = String(body.category || 'FUEL').toUpperCase().trim()
        const category = VALID_EXPENSE_CATEGORIES.has(rawCategory) ? rawCategory : 'OTHER'
        const rawCurrency = String(body.currency || 'EUR').toUpperCase().trim()
        const currency = VALID_EXPENSE_CURRENCIES.has(rawCurrency) ? rawCurrency : 'EUR'
        const amount = Number(body.amount)
        if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) {
          sendJson(res, 400, { ok: false, error: 'Suma bonului/facturii trebuie să fie mai mare ca 0.' })
          return
        }
        const vendorName = String(body.vendorName || '').trim().slice(0, 120)
        if (!vendorName) {
          sendJson(res, 400, { ok: false, error: 'Numele stației / furnizorului este obligatoriu.' })
          return
        }

        const rawDate = String(body.expenseDate || '').trim()
        const expenseDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
          ? rawDate
          : new Date().toISOString().slice(0, 10)
        const litersRaw = Number(body.liters)
        const odometerRaw = Number(body.odometerKm)

        let uploadedMeta = null
        if (body.base64 && body.fileName) {
          uploadedMeta = saveValidatedDriverUpload({
            dataDir,
            subDir: 'expense-uploads',
            tenantId,
            rawFileName: body.fileName,
            fallbackName: 'bon-cheltuiala.jpg',
            base64: body.base64,
          })
        }

        const ws = loadWorkspace(dataDir, tenantId)
        const matchedTrailer = (ws.trailers || []).find(
          (t) => normalizeTrailerKey(t.id) === normalizeTrailerKey(trailerId)
        )
        const expenseRecord = {
          id: `exp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          trailerId,
          driverName: String(
            body.driverName || matchedTrailer?.driver1?.name || session.user.name || 'Șofer'
          ).trim(),
          tripRef: String(body.tripRef || '').trim().slice(0, 80) || undefined,
          tripLabel: String(body.tripLabel || '').trim().slice(0, 140) || undefined,
          category,
          amount: +amount.toFixed(2),
          currency,
          liters: Number.isFinite(litersRaw) && litersRaw > 0 ? +litersRaw.toFixed(1) : undefined,
          odometerKm:
            Number.isFinite(odometerRaw) && odometerRaw > 0 ? Math.round(odometerRaw) : undefined,
          vendorName,
          expenseDate,
          notes: String(body.notes || '').trim().slice(0, 300) || undefined,
          fileName: uploadedMeta?.storedName,
          displayName: uploadedMeta?.safeOriginal,
          mimeType: uploadedMeta?.mimeType,
          sizeBytes: uploadedMeta?.sizeBytes,
          status: 'Înregistrat',
          createdAt: new Date().toISOString(),
          createdBy: session.user.name,
        }

        ws.driverExpenses = [expenseRecord, ...(ws.driverExpenses || [])].slice(0, 300)
        ws.auditLog = [
          {
            id: `a-${Date.now()}`,
            at: new Date().toISOString(),
            who: session.user.name,
            action: `Bon/Cheltuială șofer (${trailerId} · ${category}): ${expenseRecord.amount} ${currency} @ ${vendorName}${uploadedMeta ? ` [${uploadedMeta.safeOriginal}]` : ''}`,
          },
          ...(ws.auditLog || []),
        ].slice(0, 200)
        ws.rev = Number(ws.rev || 0) + 1
        ws.updatedBy = session.user.name
        saveWorkspace(dataDir, ws)

        broadcastTenantUpdate(tenantId, {
          type: 'driver-expense-added',
          rev: ws.rev,
          updatedBy: session.user.name,
          expense: expenseRecord,
        })

        sendJson(res, 200, {
          ok: true,
          expense: expenseRecord,
          workspace: toClientWorkspacePayload(ws, session.user.role),
        })
      } catch (err) {
        sendJson(res, err?.statusCode || 500, {
          ok: false,
          error: err instanceof Error ? err.message : 'Eroare la înregistrarea bonului.',
        })
      }
    })()
    return true
  }

  // 6C. Validate/Revert Driver Expense Status (ADMIN / DISPECER / FINANCIAR)
  if (req.method === 'POST' && reqPath === '/api/tms/driver/expense-status') {
    if (session.user.role === 'SOFER') {
      sendJson(res, 403, { ok: false, error: 'Doar dispeceratul/adminul poate valida cheltuiala.' })
      return true
    }
    void (async () => {
      try {
        const body = await readJsonBody(req)
        const tenantId = sanitizeSafeSlug(body.tenantId || requestedTenantId)
        const id = String(body.id || '').trim()
        const nextStatus = body.status === 'Validat Admin' ? 'Validat Admin' : 'Înregistrat'
        const ws = loadWorkspace(dataDir, tenantId)
        let updated = null
        ws.driverExpenses = (ws.driverExpenses || []).map((exp) => {
          if (exp.id !== id) return exp
          updated = { ...exp, status: nextStatus }
          return updated
        })
        if (!updated) {
          sendJson(res, 404, { ok: false, error: 'Bonul/cheltuiala nu a fost găsită.' })
          return
        }
        ws.rev = Number(ws.rev || 0) + 1
        ws.updatedBy = session.user.name
        saveWorkspace(dataDir, ws)
        broadcastTenantUpdate(tenantId, {
          type: 'driver-expense-updated',
          rev: ws.rev,
          updatedBy: session.user.name,
        })
        sendJson(res, 200, {
          ok: true,
          expense: updated,
          workspace: toClientWorkspacePayload(ws, session.user.role),
        })
      } catch (err) {
        sendJson(res, 500, {
          ok: false,
          error: err instanceof Error ? err.message : 'Eroare actualizare bon.',
        })
      }
    })()
    return true
  }

  // 6D. Delete Driver Expense (Driver can remove pending own trailer item; Admin/Dispecer any)
  if (req.method === 'POST' && reqPath === '/api/tms/driver/expense-delete') {
    void (async () => {
      try {
        const body = await readJsonBody(req)
        const tenantId = sanitizeSafeSlug(body.tenantId || requestedTenantId)
        const id = String(body.id || '').trim()
        const ws = loadWorkspace(dataDir, tenantId)
        const target = (ws.driverExpenses || []).find((exp) => exp.id === id)
        if (!target) {
          sendJson(res, 404, { ok: false, error: 'Cheltuiala nu mai există.' })
          return
        }
        if (session.user.role === 'SOFER') {
          if (
            !assertDriverScope(
              session,
              target.trailerId,
              res,
              'Poți șterge doar cheltuielile cabinei tale.'
            )
          ) {
            return
          }
          if (target.status === 'Validat Admin') {
            sendJson(res, 403, {
              ok: false,
              error: 'Bonurile validate de admin nu mai pot fi șterse de șofer.',
            })
            return
          }
        }
        ws.driverExpenses = (ws.driverExpenses || []).filter((exp) => exp.id !== id)
        ws.rev = Number(ws.rev || 0) + 1
        ws.updatedBy = session.user.name
        saveWorkspace(dataDir, ws)
        broadcastTenantUpdate(tenantId, {
          type: 'driver-expense-deleted',
          rev: ws.rev,
          updatedBy: session.user.name,
        })
        sendJson(res, 200, {
          ok: true,
          workspace: toClientWorkspacePayload(ws, session.user.role),
        })
      } catch (err) {
        sendJson(res, 500, {
          ok: false,
          error: err instanceof Error ? err.message : 'Eroare ștergere cheltuială.',
        })
      }
    })()
    return true
  }

  // 7. Driver Portal: Bidirectional Actions (Swap Confirm, Ramp Check-in, Tacho Update, Chat)
  if (req.method === 'POST' && reqPath === '/api/tms/driver/action') {
    void (async () => {
      try {
        const body = await readJsonBody(req)
        const tenantId = sanitizeSafeSlug(body.tenantId || requestedTenantId)
        const actionType = String(body.actionType || '').trim()
        const trailerId = String(body.trailerId || '').trim()

        if (
          !assertDriverScope(
            session,
            trailerId,
            res,
            'Acces permis doar pentru camionul asignat.'
          )
        ) {
          return
        }

        const ws = loadWorkspace(dataDir, tenantId)

        if (actionType === 'swap-confirm') {
          const scenarioId = String(body.scenarioId || '').trim()
          const side = body.side === 'B' ? 'B' : 'A'
          ws.swapScenarios = (ws.swapScenarios || []).map((sc) => {
            if (sc.id !== scenarioId) return sc
            const nextA = side === 'A' ? { ...sc.tractorA, driverConfirmed: true } : sc.tractorA
            const nextB = side === 'B' ? { ...sc.tractorB, driverConfirmed: true } : sc.tractorB
            const both = nextA.driverConfirmed && nextB.driverConfirmed
            return {
              ...sc,
              tractorA: nextA,
              tractorB: nextB,
              approvalStatus:
                sc.approvalStatus === 'Aprobat & Activ în Planning'
                  ? sc.approvalStatus
                  : both
                    ? 'Gata de aprobare dispecer'
                    : 'Așteaptă confirmare șoferi',
            }
          })
          ws.auditLog = [
            {
              id: `a-${Date.now()}`,
              at: new Date().toISOString(),
              who: session.user.name,
              action: `Șofer Tractor ${side} a confirmat acordul Swap (${scenarioId}) din Portal`,
            },
            ...(ws.auditLog || []),
          ].slice(0, 200)
        } else if (actionType === 'ramp-checkin') {
          const segId = String(body.segmentId || '').trim()
          const checked = Boolean(body.checked)
          ws.driverCheckins = {
            ...(ws.driverCheckins || {}),
            [segId]: checked,
          }
        } else if (actionType === 'tacho-update') {
          const tachoStatus = String(body.tachoStatus || '').trim()
          if (trailerId && tachoStatus) {
            ws.trailers = (ws.trailers || []).map((t) =>
              t.id === trailerId
                ? { ...t, driver1: { ...t.driver1, tachoStatus } }
                : t
            )
          }
        } else if (actionType === 'chat-message') {
          const text = String(body.text || '').trim()
          if (trailerId && text) {
            const list = Array.isArray(ws.driverMessages?.[trailerId])
              ? ws.driverMessages[trailerId]
              : []
            const time = new Intl.DateTimeFormat('ro-RO', {
              timeZone: 'Europe/Bucharest',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }).format(new Date())
            const fromRole = session.user.role === 'SOFER' ? 'driver' : 'admin'
            ws.driverMessages = {
              ...(ws.driverMessages || {}),
              [trailerId]: [...list, { id: `m-${Date.now()}`, from: fromRole, text, time }].slice(-80),
            }
          }
        }

        ws.rev = Number(ws.rev || 0) + 1
        ws.updatedBy = session.user.name
        saveWorkspace(dataDir, ws)

        broadcastTenantUpdate(tenantId, {
          type: `driver-${actionType}`,
          rev: ws.rev,
          updatedBy: session.user.name,
        })

        sendJson(res, 200, {
          ok: true,
          workspace: toClientWorkspacePayload(ws, session.user.role),
        })
      } catch (err) {
        sendJson(res, 500, { ok: false, error: err instanceof Error ? err.message : 'Eroare acțiune șofer.' })
      }
    })()
    return true
  }

  // 8. Integrations Config (ADMIN only, secrets NEVER leaked on GET)
  if (req.method === 'GET' && reqPath === '/api/tms/integrations/config') {
    const ws = loadWorkspace(dataDir, requestedTenantId)
    sendJson(res, 200, { ok: true, integrationStatus: buildPublicIntegrationStatus(ws) })
    return true
  }

  if (req.method === 'POST' && reqPath === '/api/tms/integrations/config') {
    if (session.user.role !== 'ADMIN') {
      sendJson(res, 403, { ok: false, error: 'Doar administratorul poate salva cheile API.' })
      return true
    }
    void (async () => {
      try {
        const body = await readJsonBody(req)
        const tenantId = sanitizeSafeSlug(body.tenantId || requestedTenantId)
        const ws = loadWorkspace(dataDir, tenantId)
        const nextSecrets = { ...ws.integrationSecrets }
        const editableFields = [
          'cargoTrackUrl',
          'cargoTrackToken',
          'tachoApiUrl',
          'tachoToken',
          'timoComApiKey',
          'transEuApiKey',
          'resendApiKey',
          'senderEmail',
          'whatsappToken',
          'whatsappPhoneId',
          'anafCompanyCif',
          'anafCompanyName',
        ]
        for (const f of editableFields) {
          if (body[f] !== undefined && String(body[f]).trim() !== '' && !String(body[f]).startsWith('••••')) {
            nextSecrets[f] = String(body[f]).trim()
          }
        }
        ws.integrationSecrets = nextSecrets
        ws.rev = Number(ws.rev || 0) + 1
        ws.updatedBy = session.user.name
        saveWorkspace(dataDir, ws)

        sendJson(res, 200, {
          ok: true,
          integrationStatus: buildPublicIntegrationStatus(ws),
        })
      } catch (err) {
        sendJson(res, 500, { ok: false, error: err instanceof Error ? err.message : 'Eroare configurare API.' })
      }
    })()
    return true
  }

  // 9. Cargo Track GPS & Tachograph Live Sync
  if (req.method === 'POST' && reqPath === '/api/tms/integrations/sync-cargotrack') {
    void (async () => {
      try {
        const body = await readJsonBody(req)
        const tenantId = sanitizeSafeSlug(body.tenantId || requestedTenantId)
        const ws = loadWorkspace(dataDir, tenantId)
        const externalUrl = ws.integrationSecrets?.cargoTrackUrl || process.env.CARGO_TRACK_API_URL || ''
        const externalToken =
          ws.integrationSecrets?.cargoTrackToken || process.env.CARGO_TRACK_API_TOKEN || ''

        let syncMode = 'corridor_simulator'
        let externalData = null
        if (externalUrl && externalToken) {
          try {
            const resp = await fetch(externalUrl, {
              headers: { Authorization: `Bearer ${externalToken}` },
              signal: AbortSignal.timeout(5000),
            })
            if (resp.ok) {
              externalData = await resp.json()
              syncMode = 'cargotrack_live_api'
            }
          } catch {
            syncMode = 'corridor_simulator_fallback'
          }
        }

        if (Array.isArray(externalData?.vehicles)) {
          const byPlate = new Map(
            externalData.vehicles.map((v) => [String(v.plate || v.trailerId || '').trim(), v])
          )
          ws.trailers = (ws.trailers || []).map((t) => {
            const match = byPlate.get(t.id) || byPlate.get(t.tractorId?.split(' (')[0])
            if (!match) return buildRealisticCargoTrackTick(t)
            return {
              ...t,
              currentLocation: {
                ...t.currentLocation,
                lat: Number(match.lat) || t.currentLocation.lat,
                lng: Number(match.lng) || t.currentLocation.lng,
                speedKmh: Number.isFinite(Number(match.speedKmh))
                  ? Number(match.speedKmh)
                  : t.currentLocation.speedKmh,
                cargoTrackLastPing: `API Live ${new Date().toLocaleTimeString('ro-RO')}`,
              },
              zone1Temp: Number.isFinite(Number(match.zone1Temp)) ? Number(match.zone1Temp) : t.zone1Temp,
              zone2Temp: Number.isFinite(Number(match.zone2Temp)) ? Number(match.zone2Temp) : t.zone2Temp,
              driver1: {
                ...t.driver1,
                remainingDailyDriveHours: Number.isFinite(Number(match.remainingDailyDriveHours))
                  ? Number(match.remainingDailyDriveHours)
                  : t.driver1.remainingDailyDriveHours,
              },
            }
          })
        } else {
          ws.trailers = (ws.trailers || []).map(buildRealisticCargoTrackTick)
        }

        ws.lastCargoTrackSyncAt = new Date().toISOString()
        ws.rev = Number(ws.rev || 0) + 1
        ws.updatedBy = 'Cargo Track Telematics'
        saveWorkspace(dataDir, ws)

        broadcastTenantUpdate(tenantId, {
          type: 'cargotrack-sync',
          rev: ws.rev,
          syncMode,
        })

        sendJson(res, 200, {
          ok: true,
          syncMode,
          workspace: toClientWorkspacePayload(ws),
        })
      } catch (err) {
        sendJson(res, 500, { ok: false, error: err instanceof Error ? err.message : 'Eroare sync GPS.' })
      }
    })()
    return true
  }

  // 10. Freight Exchanges Scanner (TimoCom / Trans.eu Corridor Matching)
  if (req.method === 'POST' && reqPath === '/api/tms/integrations/scan-exchanges') {
    void (async () => {
      try {
        const body = await readJsonBody(req)
        const tenantId = sanitizeSafeSlug(body.tenantId || requestedTenantId)
        const ws = loadWorkspace(dataDir, tenantId)
        const exchangeMatches = scanExchangeOpportunitiesForFleet(ws.trailers || [])

        ws.exchangeMatches = exchangeMatches
        ws.lastExchangeScanAt = new Date().toISOString()
        ws.rev = Number(ws.rev || 0) + 1
        ws.updatedBy = 'Scanner Burse (TimoCom / Trans.eu)'
        saveWorkspace(dataDir, ws)

        broadcastTenantUpdate(tenantId, {
          type: 'exchange-scan',
          rev: ws.rev,
          count: exchangeMatches.length,
        })

        sendJson(res, 200, {
          ok: true,
          matches: exchangeMatches,
          workspace: toClientWorkspacePayload(ws),
        })
      } catch (err) {
        sendJson(res, 500, { ok: false, error: err instanceof Error ? err.message : 'Eroare scanare burse.' })
      }
    })()
    return true
  }

  // 11. Email / WhatsApp Outbound Notification Dispatcher
  if (req.method === 'POST' && reqPath === '/api/tms/notify/send') {
    if (session.user.role === 'SOFER') {
      sendJson(res, 403, { ok: false, error: 'Acces restricționat.' })
      return true
    }
    void (async () => {
      try {
        const body = await readJsonBody(req)
        const tenantId = sanitizeSafeSlug(body.tenantId || requestedTenantId)
        const channel = body.channel === 'whatsapp' ? 'whatsapp' : 'email'
        const to = String(body.to || '').trim()
        const subject = String(body.subject || 'Notificare Blue Trans Spedition').trim()
        const message = String(body.message || '').trim()

        if (!message) {
          sendJson(res, 400, { ok: false, error: 'Mesajul notificării este gol.' })
          return
        }
        const ws = loadWorkspace(dataDir, tenantId)
        const outboxEntry = await dispatchOutboundNotification({
          ws,
          channel,
          to,
          subject,
          message,
        })
        ws.rev = Number(ws.rev || 0) + 1
        ws.updatedBy = session.user.name
        saveWorkspace(dataDir, ws)

        sendJson(res, 200, {
          ok: true,
          entry: outboxEntry,
          integrationStatus: buildPublicIntegrationStatus(ws),
        })
      } catch (err) {
        sendJson(res, 500, { ok: false, error: err instanceof Error ? err.message : 'Eroare notificare.' })
      }
    })()
    return true
  }

  sendJson(res, 404, { ok: false, error: 'Endpoint TMS necunoscut.' })
  return true
}
