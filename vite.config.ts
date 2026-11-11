import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

interface ActeFlotaIndexEntry {
  fileName: string
  sizeBytes: number
}

interface ActeFlotaDocMeta {
  docKind?: string
  customTitle?: string
  expiryDate?: string
  note?: string
  plate?: string
  updatedAt?: string
}

const ALLOWED_DOC_EXTS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp'])

function isAllowedDocFileName(name: string): boolean {
  const ext = path.extname(name).toLowerCase()
  return ALLOWED_DOC_EXTS.has(ext)
}

function sanitizeSafeFileName(raw: string): string {
  const base = path.basename(String(raw || '').trim())
  return base.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '').trim()
}

function isValidDocumentBuffer(buffer: Buffer, ext: string): boolean {
  if (buffer.length < 8) return false
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

function readActeFlotaMeta(dirPath: string): Record<string, ActeFlotaDocMeta> {
  try {
    const metaPath = path.join(dirPath, 'meta.json')
    if (!fs.existsSync(metaPath)) return {}
    const parsed = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, ActeFlotaDocMeta>
    }
  } catch {
    // ignore corrupt meta.json
  }
  return {}
}

function writeActeFlotaMeta(
  dirPath: string,
  meta: Record<string, ActeFlotaDocMeta>
): void {
  try {
    fs.mkdirSync(dirPath, { recursive: true })
    const metaPath = path.join(dirPath, 'meta.json')
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf8')
  } catch {
    // ignore in read-only environments
  }
}

function scanActeFlotaDir(dirPath: string): ActeFlotaIndexEntry[] {
  try {
    if (!fs.existsSync(dirPath)) return []
    const entries = fs.readdirSync(dirPath)
    const docs: ActeFlotaIndexEntry[] = []
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

function syncActeFlotaIndexFile(dirPath: string): {
  files: ActeFlotaIndexEntry[]
  meta: Record<string, ActeFlotaDocMeta>
} {
  const files = scanActeFlotaDir(dirPath)
  const rawMeta = readActeFlotaMeta(dirPath)
  const existingSet = new Set(files.map((f) => f.fileName))
  const cleanedMeta: Record<string, ActeFlotaDocMeta> = {}
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
    // ignore write failures in read-only environments
  }
  return { files, meta: cleanedMeta }
}

function pickUniqueFileName(dirPath: string, desiredSafeName: string): string {
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

function readJsonBody(
  req: import('node:http').IncomingMessage,
  maxBytes = 36 * 1024 * 1024
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let rawBody = ''
    let tooLarge = false
    req.on('data', (chunk: Buffer) => {
      rawBody += chunk.toString('utf8')
      if (rawBody.length > maxBytes) {
        tooLarge = true
      }
    })
    req.on('end', () => {
      if (tooLarge) {
        reject(Object.assign(new Error('Fișierul depășește 25 MB.'), { statusCode: 413 }))
        return
      }
      try {
        resolve(JSON.parse(rawBody || '{}') as Record<string, unknown>)
      } catch {
        reject(Object.assign(new Error('Payload JSON invalid.'), { statusCode: 400 }))
      }
    })
    req.on('error', (err) => reject(err))
  })
}

function sendJson(
  res: import('node:http').ServerResponse,
  statusCode: number,
  payload: Record<string, unknown>
): void {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(payload))
}

function acteFlotaSyncPlugin(): Plugin {
  const dirPath = path.resolve(process.cwd(), 'public', 'acte-flota')

  return {
    name: 'sferle-acte-flota-sync',
    buildStart() {
      syncActeFlotaIndexFile(dirPath)
    },
    handleHotUpdate(ctx) {
      const norm = ctx.file.replace(/\\/g, '/')
      if (norm.includes('/public/acte-flota/') || norm.includes('/.agents/')) {
        return []
      }
    },
    configureServer(server) {
      syncActeFlotaIndexFile(dirPath)

      server.middlewares.use((req, res, next) => {
        const reqUrl = (req.url || '').split('?')[0]

        if (req.method === 'GET' && reqUrl === '/acte-flota/index.json') {
          const { files, meta } = syncActeFlotaIndexFile(dirPath)
          sendJson(res, 200, { files, meta })
          return
        }

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
            const filePath = path.resolve(dirPath, safeName)
            if (filePath.startsWith(dirPath + path.sep) && fs.existsSync(filePath)) {
              const stat = fs.statSync(filePath)
              if (stat.isFile()) {
                const ext = path.extname(safeName).toLowerCase()
                const mime =
                  ext === '.pdf'
                    ? 'application/pdf'
                    : ext === '.png'
                      ? 'image/png'
                      : ext === '.webp'
                        ? 'image/webp'
                        : 'image/jpeg'
                res.statusCode = 200
                res.setHeader('Content-Type', mime)
                res.setHeader('Content-Length', String(stat.size))
                res.setHeader('Cache-Control', 'no-cache')
                if (req.method === 'HEAD') {
                  res.end()
                  return
                }
                fs.createReadStream(filePath).pipe(res)
                return
              }
            }
          }
        }

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
              const cleanBase64 = String(parsed.base64 || '').replace(
                /^data:[^;]+;base64,/i,
                ''
              )
              const buffer = Buffer.from(cleanBase64, 'base64')
              if (!isValidDocumentBuffer(buffer, ext)) {
                sendJson(res, 400, {
                  ok: false,
                  error: 'Fișierul selectat nu este un PDF sau o imagine validă.',
                })
                return
              }

              fs.mkdirSync(dirPath, { recursive: true })
              const replaceOldName = parsed.replaceFileName
                ? sanitizeSafeFileName(String(parsed.replaceFileName))
                : ''

              let finalName = safeName
              if (replaceOldName) {
                const oldPath = path.resolve(dirPath, replaceOldName)
                if (
                  oldPath.startsWith(dirPath + path.sep) &&
                  replaceOldName !== safeName &&
                  fs.existsSync(oldPath)
                ) {
                  fs.unlinkSync(oldPath)
                }
                if (replaceOldName !== safeName && fs.existsSync(path.join(dirPath, safeName))) {
                  finalName = pickUniqueFileName(dirPath, safeName)
                }
              } else if (fs.existsSync(path.join(dirPath, safeName))) {
                finalName = pickUniqueFileName(dirPath, safeName)
              }

              const targetPath = path.resolve(dirPath, finalName)
              if (!targetPath.startsWith(dirPath + path.sep)) {
                sendJson(res, 400, { ok: false, error: 'Cale fișier nepermisă.' })
                return
              }

              fs.writeFileSync(targetPath, buffer)

              const meta = readActeFlotaMeta(dirPath)
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
                  parsed.note !== undefined
                    ? String(parsed.note).trim()
                    : prevMeta.note,
                plate: parsed.plate ? String(parsed.plate).trim() : prevMeta.plate,
                updatedAt: new Date().toISOString(),
              }
              writeActeFlotaMeta(dirPath, meta)

              const synced = syncActeFlotaIndexFile(dirPath)
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
                  ? Number((err as { statusCode?: number }).statusCode) || 500
                  : 500
              sendJson(res, code, {
                ok: false,
                error:
                  err instanceof Error
                    ? err.message
                    : 'Eroare la salvarea documentului în public/acte-flota.',
              })
            }
          })()
          return
        }

        if (req.method === 'POST' && reqUrl === '/api/acte-flota/update') {
          void (async () => {
            try {
              const parsed = await readJsonBody(req, 2 * 1024 * 1024)
              const currentName = sanitizeSafeFileName(String(parsed.fileName || ''))
              if (!currentName || !isAllowedDocFileName(currentName)) {
                sendJson(res, 400, { ok: false, error: 'Nume fișier invalid.' })
                return
              }
              const currentPath = path.resolve(dirPath, currentName)
              if (!currentPath.startsWith(dirPath + path.sep) || !fs.existsSync(currentPath)) {
                sendJson(res, 404, { ok: false, error: 'Documentul nu a fost găsit pe disc.' })
                return
              }

              let finalName = currentName
              if (parsed.newFileName) {
                const desired = sanitizeSafeFileName(String(parsed.newFileName))
                if (
                  desired &&
                  isAllowedDocFileName(desired) &&
                  path.extname(desired).toLowerCase() ===
                    path.extname(currentName).toLowerCase() &&
                  desired !== currentName
                ) {
                  finalName = fs.existsSync(path.join(dirPath, desired))
                    ? pickUniqueFileName(dirPath, desired)
                    : desired
                  const nextPath = path.resolve(dirPath, finalName)
                  if (nextPath.startsWith(dirPath + path.sep)) {
                    fs.renameSync(currentPath, nextPath)
                  } else {
                    finalName = currentName
                  }
                }
              }

              const meta = readActeFlotaMeta(dirPath)
              const prev = meta[currentName] || {}
              if (finalName !== currentName) {
                delete meta[currentName]
              }
              meta[finalName] = {
                ...prev,
                docKind:
                  parsed.docKind !== undefined ? String(parsed.docKind) : prev.docKind,
                customTitle:
                  parsed.customTitle !== undefined
                    ? String(parsed.customTitle).trim()
                    : prev.customTitle,
                expiryDate:
                  parsed.expiryDate !== undefined
                    ? String(parsed.expiryDate).trim()
                    : prev.expiryDate,
                note:
                  parsed.note !== undefined ? String(parsed.note).trim() : prev.note,
                plate:
                  parsed.plate !== undefined ? String(parsed.plate).trim() : prev.plate,
                updatedAt: new Date().toISOString(),
              }
              writeActeFlotaMeta(dirPath, meta)

              const synced = syncActeFlotaIndexFile(dirPath)
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
                  err instanceof Error
                    ? err.message
                    : 'Eroare la actualizarea documentului.',
              })
            }
          })()
          return
        }

        if (req.method === 'POST' && reqUrl === '/api/acte-flota/delete') {
          void (async () => {
            try {
              const parsed = await readJsonBody(req, 512 * 1024)
              const targetName = sanitizeSafeFileName(String(parsed.fileName || ''))
              if (!targetName || !isAllowedDocFileName(targetName)) {
                sendJson(res, 400, { ok: false, error: 'Nume fișier invalid.' })
                return
              }
              const targetPath = path.resolve(dirPath, targetName)
              if (!targetPath.startsWith(dirPath + path.sep)) {
                sendJson(res, 400, { ok: false, error: 'Cale fișier nepermisă.' })
                return
              }
              if (fs.existsSync(targetPath)) {
                fs.unlinkSync(targetPath)
              }
              const meta = readActeFlotaMeta(dirPath)
              if (meta[targetName]) {
                delete meta[targetName]
                writeActeFlotaMeta(dirPath, meta)
              }
              const synced = syncActeFlotaIndexFile(dirPath)
              sendJson(res, 200, {
                ok: true,
                deletedFileName: targetName,
                files: synced.files,
                meta: synced.meta,
              })
            } catch (err) {
              sendJson(res, 500, {
                ok: false,
                error:
                  err instanceof Error
                    ? err.message
                    : 'Eroare la ștergerea documentului.',
              })
            }
          })()
          return
        }

        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), acteFlotaSyncPlugin()],
  server: {
    port: 3645,
    strictPort: true,
    watch: {
      ignored: ['**/public/acte-flota/**', '**/.agents/**'],
    },
  },
})
