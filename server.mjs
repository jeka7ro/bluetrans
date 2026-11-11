import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleAuthApiRequest, resolveDefaultAuthDbPath } from './authServer.mjs'

const __filename = fileURLToPath(import.meta.url)
const ROOT_DIR = path.dirname(__filename)
const DIST_DIR = path.resolve(ROOT_DIR, 'dist')
const BUNDLED_ACTE_DIR = path.resolve(ROOT_DIR, 'public', 'acte-flota')
const ACTE_FLOTA_DIR = process.env.ACTE_FLOTA_DIR
  ? path.resolve(process.env.ACTE_FLOTA_DIR)
  : process.env.RAILWAY_VOLUME_MOUNT_PATH
    ? path.resolve(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'acte-flota')
    : BUNDLED_ACTE_DIR
const AUTH_DB_PATH = resolveDefaultAuthDbPath(ROOT_DIR)

const PORT = Number(process.env.PORT) || 3645
const HOST = process.env.HOST || '0.0.0.0'

const ALLOWED_DOC_EXTS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp'])

const MIME_BY_EXT = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
}

function isAllowedDocFileName(name) {
  const ext = path.extname(name).toLowerCase()
  return ALLOWED_DOC_EXTS.has(ext)
}

function sanitizeSafeFileName(raw) {
  const base = path.basename(String(raw || '').trim())
  return base.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '').trim()
}

function isValidDocumentBuffer(buffer, ext) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 8) return false
  const lower = ext.toLowerCase()
  if (lower === '.pdf') {
    return buffer.subarray(0, 4).toString('ascii') === '%PDF'
  }
  if (lower === '.jpg' || lower === '.jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  }
  if (lower === '.png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    )
  }
  if (lower === '.webp') {
    return (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    )
  }
  return false
}

function readActeFlotaMeta(dirPath) {
  try {
    const metaPath = path.join(dirPath, 'meta.json')
    if (!fs.existsSync(metaPath)) return {}
    const parsed = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed
    }
  } catch {
    // ignore corrupt meta.json
  }
  return {}
}

function writeActeFlotaMeta(dirPath, meta) {
  try {
    fs.mkdirSync(dirPath, { recursive: true })
    const metaPath = path.join(dirPath, 'meta.json')
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf8')
  } catch {
    // ignore write errors on read-only fs
  }
}

function scanActeFlotaDir(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) return []
    const entries = fs.readdirSync(dirPath)
    const docs = []
    for (const name of entries) {
      if (!isAllowedDocFileName(name)) continue
      const fullPath = path.join(dirPath, name)
      const stat = fs.statSync(fullPath)
      if (stat.isFile()) {
        docs.push({ fileName: name, sizeBytes: stat.size })
      }
    }
    docs.sort((a, b) => a.fileName.localeCompare(b.fileName, 'ro', { numeric: true }))
    return docs
  } catch {
    return []
  }
}

function syncActeFlotaIndexFile(dirPath) {
  const files = scanActeFlotaDir(dirPath)
  const rawMeta = readActeFlotaMeta(dirPath)
  const existingSet = new Set(files.map((f) => f.fileName))
  const cleanedMeta = {}
  let metaChanged = false
  for (const [k, v] of Object.entries(rawMeta)) {
    if (existingSet.has(k)) {
      cleanedMeta[k] = v
    } else {
      metaChanged = true
    }
  }
  if (metaChanged) {
    writeActeFlotaMeta(dirPath, cleanedMeta)
  }

  try {
    fs.mkdirSync(dirPath, { recursive: true })
    const indexPath = path.join(dirPath, 'index.json')
    const nextJson = JSON.stringify({ files, meta: cleanedMeta }, null, 2) + '\n'
    const prevJson = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : ''
    if (prevJson !== nextJson) {
      fs.writeFileSync(indexPath, nextJson, 'utf8')
    }
  } catch {
    // ignore write failures on read-only fs
  }
  return { files, meta: cleanedMeta }
}

function seedPersistentActeFlotaDir() {
  try {
    fs.mkdirSync(ACTE_FLOTA_DIR, { recursive: true })
    if (ACTE_FLOTA_DIR !== BUNDLED_ACTE_DIR && fs.existsSync(BUNDLED_ACTE_DIR)) {
      const seedManifestPath = path.join(ACTE_FLOTA_DIR, '.seeded-manifest.json')
      const existingDocsInTarget = scanActeFlotaDir(ACTE_FLOTA_DIR)
      let seededList = []
      if (existingDocsInTarget.length > 0 && fs.existsSync(seedManifestPath)) {
        try {
          const raw = JSON.parse(fs.readFileSync(seedManifestPath, 'utf8'))
          if (raw && Array.isArray(raw.seededFiles)) {
            seededList = raw.seededFiles.map((s) => String(s))
          }
        } catch {
          seededList = []
        }
      }

      const seededSet = new Set(seededList)
      const bundledDocs = scanActeFlotaDir(BUNDLED_ACTE_DIR)
      let copiedCount = 0

      for (const entry of bundledDocs) {
        if (seededSet.has(entry.fileName)) continue
        const srcFile = path.join(BUNDLED_ACTE_DIR, entry.fileName)
        const dstFile = path.join(ACTE_FLOTA_DIR, entry.fileName)
        if (!fs.existsSync(dstFile)) {
          fs.copyFileSync(srcFile, dstFile)
          copiedCount += 1
        }
        seededSet.add(entry.fileName)
      }

      const bundledMeta = readActeFlotaMeta(BUNDLED_ACTE_DIR)
      const targetMeta = readActeFlotaMeta(ACTE_FLOTA_DIR)
      let metaMerged = false
      for (const [fileName, metaVal] of Object.entries(bundledMeta)) {
        if (!targetMeta[fileName] && fs.existsSync(path.join(ACTE_FLOTA_DIR, fileName))) {
          targetMeta[fileName] = metaVal
          metaMerged = true
        }
      }
      if (metaMerged) {
        writeActeFlotaMeta(ACTE_FLOTA_DIR, targetMeta)
      }

      fs.writeFileSync(
        seedManifestPath,
        JSON.stringify(
          {
            seededFiles: Array.from(seededSet),
            updatedAt: new Date().toISOString(),
          },
          null,
          2
        ) + '\n',
        'utf8'
      )

      if (copiedCount > 0) {
        console.log(
          `[acte-flota] Copiat ${copiedCount} documente inițiale (CIV) în volumul persistent: ${ACTE_FLOTA_DIR}`
        )
      }
    }
  } catch (err) {
    console.error('[acte-flota] Eroare la inițializarea directorului de acte:', err)
  }
  return syncActeFlotaIndexFile(ACTE_FLOTA_DIR)
}

function pickUniqueFileName(dirPath, desiredSafeName) {
  const ext = path.extname(desiredSafeName)
  const stem = desiredSafeName.slice(0, desiredSafeName.length - ext.length)
  let candidate = desiredSafeName
  let counter = 2
  while (fs.existsSync(path.join(dirPath, candidate))) {
    candidate = `${stem} (${counter})${ext}`
    counter += 1
  }
  return candidate
}

function readJsonBody(req, maxBytes = 36 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let totalBytes = 0
    let tooLarge = false
    req.on('data', (chunk) => {
      totalBytes += chunk.length
      if (totalBytes > maxBytes) {
        tooLarge = true
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (tooLarge) {
        reject(Object.assign(new Error('Fișierul depășește 25 MB.'), { statusCode: 413 }))
        return
      }
      try {
        const rawBody = Buffer.concat(chunks).toString('utf8')
        resolve(JSON.parse(rawBody || '{}'))
      } catch {
        reject(Object.assign(new Error('Payload JSON invalid.'), { statusCode: 400 }))
      }
    })
    req.on('error', (err) => reject(err))
  })
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(payload))
}

function streamFileWithRange(req, res, filePath, mimeType, cacheControl, inlineFileName) {
  const stat = fs.statSync(filePath)
  const total = stat.size
  res.setHeader('Content-Type', mimeType)
  res.setHeader('Accept-Ranges', 'bytes')
  res.setHeader('Cache-Control', cacheControl)
  if (inlineFileName) {
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(inlineFileName)}`
    )
  }

  const rangeHeader = req.headers.range
  if (rangeHeader && rangeHeader.startsWith('bytes=')) {
    const [startStr, endStr] = rangeHeader.replace(/bytes=/, '').split('-')
    const start = Number.parseInt(startStr, 10)
    const end = endStr ? Number.parseInt(endStr, 10) : total - 1
    if (
      !Number.isNaN(start) &&
      !Number.isNaN(end) &&
      start >= 0 &&
      end >= start &&
      end < total
    ) {
      res.statusCode = 206
      res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`)
      res.setHeader('Content-Length', String(end - start + 1))
      if (req.method === 'HEAD') {
        res.end()
        return
      }
      fs.createReadStream(filePath, { start, end }).pipe(res)
      return
    }
  }

  res.statusCode = 200
  res.setHeader('Content-Length', String(total))
  if (req.method === 'HEAD') {
    res.end()
    return
  }
  fs.createReadStream(filePath).pipe(res)
}

const initialIndex = seedPersistentActeFlotaDir()

const server = http.createServer((req, res) => {
  const rawUrl = req.url || '/'
  const reqUrl = rawUrl.split('?')[0]

  // 0. Authentication & Users / Invitations API (`/api/auth/*`)
  if (handleAuthApiRequest(req, res, AUTH_DB_PATH)) {
    return
  }

  // 1. Healthcheck endpoint (for Railway & uptime monitoring)
  if ((req.method === 'GET' || req.method === 'HEAD') && reqUrl === '/api/health') {
    const docs = scanActeFlotaDir(ACTE_FLOTA_DIR)
    sendJson(res, 200, {
      ok: true,
      service: 'blue-trans-spedition',
      documentsCount: docs.length,
      persistentVolume: Boolean(
        process.env.ACTE_FLOTA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH
      ),
    })
    return
  }

  // 2. Dynamic Acte Flotă index
  if (req.method === 'GET' && reqUrl === '/acte-flota/index.json') {
    const { files, meta } = syncActeFlotaIndexFile(ACTE_FLOTA_DIR)
    sendJson(res, 200, { files, meta })
    return
  }

  // 3. Stream PDF / Image documents from ACTE_FLOTA_DIR
  if (
    (req.method === 'GET' || req.method === 'HEAD') &&
    reqUrl.startsWith('/acte-flota/') &&
    reqUrl !== '/acte-flota/index.json'
  ) {
    let decodedName = ''
    try {
      decodedName = decodeURIComponent(reqUrl.slice('/acte-flota/'.length))
    } catch {
      decodedName = ''
    }
    const safeName = sanitizeSafeFileName(decodedName)
    if (safeName && isAllowedDocFileName(safeName)) {
      const filePath = path.resolve(ACTE_FLOTA_DIR, safeName)
      if (filePath.startsWith(ACTE_FLOTA_DIR + path.sep) && fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath)
        if (stat.isFile()) {
          const ext = path.extname(safeName).toLowerCase()
          const mime = MIME_BY_EXT[ext] || 'application/octet-stream'
          streamFileWithRange(req, res, filePath, mime, 'no-cache', safeName)
          return
        }
      }
    }
    sendJson(res, 404, { ok: false, error: 'Documentul solicitat nu a fost găsit.' })
    return
  }

  // 4. Upload / Replace Fleet Document (CIV, Talon, RCA, CASCO, CMR, ITP, etc.)
  if (req.method === 'POST' && reqUrl === '/api/acte-flota/upload') {
    void (async () => {
      try {
        const parsed = await readJsonBody(req)
        const safeName = sanitizeSafeFileName(String(parsed.fileName || ''))
        if (!safeName || !isAllowedDocFileName(safeName)) {
          sendJson(res, 400, {
            ok: false,
            error: 'Sunt permise doar documente PDF sau imagini (.pdf, .jpg, .png, .webp).',
          })
          return
        }

        const ext = path.extname(safeName).toLowerCase()
        const cleanBase64 = String(parsed.base64 || '').replace(/^data:[^;]+;base64,/i, '')
        const buffer = Buffer.from(cleanBase64, 'base64')
        if (!isValidDocumentBuffer(buffer, ext)) {
          sendJson(res, 400, {
            ok: false,
            error: 'Fișierul selectat nu este un PDF sau o imagine validă.',
          })
          return
        }

        fs.mkdirSync(ACTE_FLOTA_DIR, { recursive: true })
        const replaceOldName = parsed.replaceFileName
          ? sanitizeSafeFileName(String(parsed.replaceFileName))
          : ''

        let finalName = safeName
        if (replaceOldName) {
          const oldPath = path.resolve(ACTE_FLOTA_DIR, replaceOldName)
          if (
            oldPath.startsWith(ACTE_FLOTA_DIR + path.sep) &&
            replaceOldName !== safeName &&
            fs.existsSync(oldPath)
          ) {
            fs.unlinkSync(oldPath)
          }
          if (replaceOldName !== safeName && fs.existsSync(path.join(ACTE_FLOTA_DIR, safeName))) {
            finalName = pickUniqueFileName(ACTE_FLOTA_DIR, safeName)
          }
        } else if (fs.existsSync(path.join(ACTE_FLOTA_DIR, safeName))) {
          finalName = pickUniqueFileName(ACTE_FLOTA_DIR, safeName)
        }

        const targetPath = path.resolve(ACTE_FLOTA_DIR, finalName)
        if (!targetPath.startsWith(ACTE_FLOTA_DIR + path.sep)) {
          sendJson(res, 400, { ok: false, error: 'Cale fișier nepermisă.' })
          return
        }

        fs.writeFileSync(targetPath, buffer)

        const meta = readActeFlotaMeta(ACTE_FLOTA_DIR)
        const prevMeta = replaceOldName ? meta[replaceOldName] || {} : {}
        if (replaceOldName && replaceOldName !== finalName) {
          delete meta[replaceOldName]
        }
        meta[finalName] = {
          ...prevMeta,
          docKind: parsed.docKind ? String(parsed.docKind) : prevMeta.docKind,
          customTitle:
            parsed.customTitle !== undefined
              ? String(parsed.customTitle).trim()
              : prevMeta.customTitle,
          expiryDate:
            parsed.expiryDate !== undefined
              ? String(parsed.expiryDate).trim()
              : prevMeta.expiryDate,
          note:
            parsed.note !== undefined ? String(parsed.note).trim() : prevMeta.note,
          plate: parsed.plate ? String(parsed.plate).trim() : prevMeta.plate,
          updatedAt: new Date().toISOString(),
        }
        writeActeFlotaMeta(ACTE_FLOTA_DIR, meta)

        const synced = syncActeFlotaIndexFile(ACTE_FLOTA_DIR)
        sendJson(res, 200, {
          ok: true,
          fileName: finalName,
          sizeBytes: buffer.length,
          files: synced.files,
          meta: synced.meta,
        })
      } catch (err) {
        const code =
          err && typeof err === 'object' && 'statusCode' in err
            ? Number(err.statusCode) || 500
            : 500
        sendJson(res, code, {
          ok: false,
          error:
            err instanceof Error
              ? err.message
              : 'Eroare la salvarea documentului pe server.',
        })
      }
    })()
    return
  }

  // 5. Update Fleet Document metadata / category
  if (req.method === 'POST' && reqUrl === '/api/acte-flota/update') {
    void (async () => {
      try {
        const parsed = await readJsonBody(req, 2 * 1024 * 1024)
        const currentName = sanitizeSafeFileName(String(parsed.fileName || ''))
        if (!currentName || !isAllowedDocFileName(currentName)) {
          sendJson(res, 400, { ok: false, error: 'Nume fișier invalid.' })
          return
        }
        const currentPath = path.resolve(ACTE_FLOTA_DIR, currentName)
        if (!currentPath.startsWith(ACTE_FLOTA_DIR + path.sep) || !fs.existsSync(currentPath)) {
          sendJson(res, 404, { ok: false, error: 'Documentul nu a fost găsit pe server.' })
          return
        }

        let finalName = currentName
        if (parsed.newFileName) {
          const desired = sanitizeSafeFileName(String(parsed.newFileName))
          if (
            desired &&
            isAllowedDocFileName(desired) &&
            path.extname(desired).toLowerCase() === path.extname(currentName).toLowerCase() &&
            desired !== currentName
          ) {
            finalName = fs.existsSync(path.join(ACTE_FLOTA_DIR, desired))
              ? pickUniqueFileName(ACTE_FLOTA_DIR, desired)
              : desired
            const nextPath = path.resolve(ACTE_FLOTA_DIR, finalName)
            if (nextPath.startsWith(ACTE_FLOTA_DIR + path.sep)) {
              fs.renameSync(currentPath, nextPath)
            } else {
              finalName = currentName
            }
          }
        }

        const meta = readActeFlotaMeta(ACTE_FLOTA_DIR)
        const prev = meta[currentName] || {}
        if (finalName !== currentName) {
          delete meta[currentName]
        }
        meta[finalName] = {
          ...prev,
          docKind: parsed.docKind !== undefined ? String(parsed.docKind) : prev.docKind,
          customTitle:
            parsed.customTitle !== undefined
              ? String(parsed.customTitle).trim()
              : prev.customTitle,
          expiryDate:
            parsed.expiryDate !== undefined
              ? String(parsed.expiryDate).trim()
              : prev.expiryDate,
          note: parsed.note !== undefined ? String(parsed.note).trim() : prev.note,
          plate: parsed.plate !== undefined ? String(parsed.plate).trim() : prev.plate,
          updatedAt: new Date().toISOString(),
        }
        writeActeFlotaMeta(ACTE_FLOTA_DIR, meta)

        const synced = syncActeFlotaIndexFile(ACTE_FLOTA_DIR)
        sendJson(res, 200, {
          ok: true,
          fileName: finalName,
          files: synced.files,
          meta: synced.meta,
        })
      } catch (err) {
        sendJson(res, 500, {
          ok: false,
          error:
            err instanceof Error ? err.message : 'Eroare la actualizarea documentului.',
        })
      }
    })()
    return
  }

  // 6. Delete Fleet Document
  if (req.method === 'POST' && reqUrl === '/api/acte-flota/delete') {
    void (async () => {
      try {
        const parsed = await readJsonBody(req, 512 * 1024)
        const targetName = sanitizeSafeFileName(String(parsed.fileName || ''))
        if (!targetName || !isAllowedDocFileName(targetName)) {
          sendJson(res, 400, { ok: false, error: 'Nume fișier invalid.' })
          return
        }
        const targetPath = path.resolve(ACTE_FLOTA_DIR, targetName)
        if (!targetPath.startsWith(ACTE_FLOTA_DIR + path.sep)) {
          sendJson(res, 400, { ok: false, error: 'Cale fișier nepermisă.' })
          return
        }
        if (fs.existsSync(targetPath)) {
          fs.unlinkSync(targetPath)
        }
        const meta = readActeFlotaMeta(ACTE_FLOTA_DIR)
        if (meta[targetName]) {
          delete meta[targetName]
          writeActeFlotaMeta(ACTE_FLOTA_DIR, meta)
        }
        const synced = syncActeFlotaIndexFile(ACTE_FLOTA_DIR)
        sendJson(res, 200, {
          ok: true,
          deletedFileName: targetName,
          files: synced.files,
          meta: synced.meta,
        })
      } catch (err) {
        sendJson(res, 500, {
          ok: false,
          error: err instanceof Error ? err.message : 'Eroare la ștergerea documentului.',
        })
      }
    })()
    return
  }

  // 7. Static files from Vite production build (`dist/`) + SPA fallback
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(res, 405, { ok: false, error: 'Metodă HTTP nepermisă.' })
    return
  }

  let decodedPath = '/'
  try {
    decodedPath = decodeURIComponent(reqUrl)
  } catch {
    decodedPath = '/'
  }

  const relativePath =
    decodedPath === '/favicon.ico' ? 'favicon.png' : decodedPath.replace(/^\/+/, '')
  const candidatePath = path.resolve(DIST_DIR, relativePath || 'index.html')
  if (
    (candidatePath === DIST_DIR || candidatePath.startsWith(DIST_DIR + path.sep)) &&
    fs.existsSync(candidatePath) &&
    fs.statSync(candidatePath).isFile()
  ) {
    const ext = path.extname(candidatePath).toLowerCase()
    const mime = MIME_BY_EXT[ext] || 'application/octet-stream'
    const isHashedAsset = decodedPath.startsWith('/assets/')
    const cacheControl = isHashedAsset
      ? 'public, max-age=31536000, immutable'
      : ext === '.html'
        ? 'no-cache'
        : 'public, max-age=3600'
    streamFileWithRange(req, res, candidatePath, mime, cacheControl)
    return
  }

  // SPA fallback to dist/index.html for client-side routes
  if (!decodedPath.startsWith('/api/') && !path.extname(decodedPath)) {
    const indexHtmlPath = path.join(DIST_DIR, 'index.html')
    if (fs.existsSync(indexHtmlPath)) {
      streamFileWithRange(req, res, indexHtmlPath, 'text/html; charset=utf-8', 'no-cache')
      return
    }
  }

  sendJson(res, 404, { ok: false, error: 'Resursa solicitată nu există.' })
})

server.listen(PORT, HOST, () => {
  console.log(
    `[Blue Trans Spedition] Server pornit pe http://${HOST}:${PORT} · acte-flota: ${ACTE_FLOTA_DIR} (${initialIndex.files.length} documente)`
  )
})

function shutdown(signal) {
  console.log(`[Blue Trans Spedition] Oprire controlată (${signal})...`)
  server.close(() => {
    process.exit(0)
  })
  setTimeout(() => process.exit(0), 5000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
