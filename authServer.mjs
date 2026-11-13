import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const VALID_ROLES = new Set(['ADMIN', 'DISPECER', 'FINANCIAR', 'SOFER'])
const VALID_STATUSES = new Set(['ACTIVE', 'INVITED', 'DISABLED'])

function hashPassword(password, saltHex) {
  const salt = saltHex || crypto.randomBytes(16).toString('hex')
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex')
  return { salt, hash: derived }
}

function verifyPassword(password, salt, expectedHash) {
  if (!salt || !expectedHash) return false
  try {
    const actual = Buffer.from(
      crypto.scryptSync(String(password), salt, 64).toString('hex'),
      'hex'
    )
    const expected = Buffer.from(String(expectedHash), 'hex')
    if (actual.length !== expected.length) return false
    return crypto.timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

function normalizeUsername(raw, fallbackEmail = '') {
  const base = String(raw || '').trim() || String(fallbackEmail || '').split('@')[0] || ''
  return base
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 48)
}

function createDefaultUsers() {
  const now = new Date().toISOString()
  const seeds = [
    {
      id: 'usr-admin-1',
      name: 'Alexandru Ionescu',
      email: 'admin@bluetrans.ro',
      username: 'admin',
      role: 'ADMIN',
      status: 'ACTIVE',
      initialPass: 'BlueTrans2026!',
    },
    {
      id: 'usr-disp-1',
      name: 'Elena Munteanu',
      email: 'elena.munteanu@bluetrans.ro',
      username: 'elena.munteanu',
      role: 'DISPECER',
      status: 'ACTIVE',
      initialPass: 'DispecerVest26!',
    },
    {
      id: 'usr-disp-2',
      name: 'Radu Cristea',
      email: 'radu.cristea@bluetrans.ro',
      username: 'radu.cristea',
      role: 'DISPECER',
      status: 'ACTIVE',
      initialPass: 'DispecerNord26!',
    },
    {
      id: 'usr-fin-1',
      name: 'Anca Marinescu',
      email: 'anca.marinescu@bluetrans.ro',
      username: 'anca.marinescu',
      role: 'FINANCIAR',
      status: 'ACTIVE',
      initialPass: 'Financiar2026!',
    },
  ]

  return seeds.map((s) => {
    const { salt, hash } = hashPassword(s.initialPass)
    return {
      id: s.id,
      name: s.name,
      email: s.email,
      username: s.username,
      role: s.role,
      driverTrailerId: s.driverTrailerId || '',
      status: s.status,
      passwordSalt: salt,
      passwordHash: hash,
      inviteToken: '',
      inviteExpiresAt: '',
      invitedBy: 'Sistem',
      createdAt: now,
      lastLoginAt: '',
    }
  })
}

function loadAuthStore(dbFilePath) {
  try {
    if (fs.existsSync(dbFilePath)) {
      const parsed = JSON.parse(fs.readFileSync(dbFilePath, 'utf8'))
      if (parsed && Array.isArray(parsed.users) && parsed.users.length > 0) {
        return {
          users: parsed.users,
          sessions:
            parsed.sessions && typeof parsed.sessions === 'object' ? parsed.sessions : {},
        }
      }
    }
  } catch {
    // ignore corrupt store and recreate defaults
  }

  const initial = {
    users: createDefaultUsers(),
    sessions: {},
  }
  saveAuthStore(dbFilePath, initial)
  return initial
}

function saveAuthStore(dbFilePath, store) {
  try {
    fs.mkdirSync(path.dirname(dbFilePath), { recursive: true })
    const nowMs = Date.now()
    const cleanSessions = {}
    for (const [token, sess] of Object.entries(store.sessions || {})) {
      if (sess && sess.expiresAt && Date.parse(sess.expiresAt) > nowMs) {
        cleanSessions[token] = sess
      }
    }
    const payload = {
      users: store.users,
      sessions: cleanSessions,
    }
    fs.writeFileSync(dbFilePath, JSON.stringify(payload, null, 2) + '\n', 'utf8')
  } catch (err) {
    console.error('[auth] Eroare salvare auth-users.json:', err)
  }
}

function toPublicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    username: u.username,
    role: u.role,
    driverTrailerId: u.driverTrailerId || '',
    status: u.status,
    createdAt: u.createdAt || '',
    lastLoginAt: u.lastLoginAt || '',
  }
}

function toAdminUser(u) {
  return {
    ...toPublicUser(u),
    inviteToken: u.inviteToken || '',
    inviteExpiresAt: u.inviteExpiresAt || '',
    invitedBy: u.invitedBy || '',
  }
}

function readBearerToken(req) {
  const auth = String(req.headers.authorization || '')
  if (auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim()
  }
  return ''
}

function resolveSessionUser(store, req) {
  const token = readBearerToken(req)
  if (!token) return null
  const sess = store.sessions[token]
  if (!sess) return null
  if (!sess.expiresAt || Date.parse(sess.expiresAt) <= Date.now()) {
    delete store.sessions[token]
    return null
  }
  const user = store.users.find((u) => u.id === sess.userId)
  if (!user || user.status !== 'ACTIVE') return null
  return { user, token }
}

function createSessionToken(store, userId, remember) {
  const token = crypto.randomBytes(32).toString('hex')
  const ttlMs = remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
  store.sessions[token] = {
    userId,
    remember: Boolean(remember),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + ttlMs).toISOString(),
  }
  return token
}

function readSmallJsonBody(req, maxBytes = 256 * 1024) {
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

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(payload))
}

function countActiveAdmins(users, excludeId = '') {
  return users.filter(
    (u) => u.role === 'ADMIN' && u.status === 'ACTIVE' && u.id !== excludeId
  ).length
}

export function resolveDefaultAuthDbPath(rootDir) {
  if (process.env.AUTH_DB_PATH) {
    return path.resolve(process.env.AUTH_DB_PATH)
  }
  if (process.env.RAILWAY_VOLUME_MOUNT_PATH) {
    return path.resolve(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'auth-users.json')
  }
  if (process.env.ACTE_FLOTA_DIR) {
    return path.resolve(path.dirname(path.resolve(process.env.ACTE_FLOTA_DIR)), 'auth-users.json')
  }
  return path.resolve(rootDir, '.data', 'auth-users.json')
}

export function handleAuthApiRequest(req, res, authDbPath) {
  const rawUrl = req.url || '/'
  const [reqPath, rawQuery = ''] = rawUrl.split('?')
  if (!reqPath.startsWith('/api/auth/')) {
    return false
  }

  // 1. POST /api/auth/login
  if (req.method === 'POST' && reqPath === '/api/auth/login') {
    void (async () => {
      try {
        const body = await readSmallJsonBody(req)
        const identifier = String(body.identifier || '').trim().toLowerCase()
        const password = String(body.password || '')
        const remember = Boolean(body.remember)

        if (!identifier || !password) {
          sendJson(res, 400, {
            ok: false,
            error: 'Introdu emailul (sau utilizatorul) și parola.',
          })
          return
        }

        const store = loadAuthStore(authDbPath)
        const user = store.users.find(
          (u) =>
            String(u.email || '').toLowerCase() === identifier ||
            String(u.username || '').toLowerCase() === identifier
        )

        if (!user) {
          sendJson(res, 401, {
            ok: false,
            error: 'Email / utilizator sau parolă incorectă.',
          })
          return
        }

        if (user.status === 'DISABLED') {
          sendJson(res, 403, {
            ok: false,
            error: 'Acest cont este blocat. Contactează administratorul.',
          })
          return
        }

        if (user.status === 'INVITED' && !user.passwordHash) {
          sendJson(res, 403, {
            ok: false,
            error: 'Contul așteaptă activarea prin linkul de invitație.',
          })
          return
        }

        if (!verifyPassword(password, user.passwordSalt, user.passwordHash)) {
          sendJson(res, 401, {
            ok: false,
            error: 'Email / utilizator sau parolă incorectă.',
          })
          return
        }

        user.status = 'ACTIVE'
        user.lastLoginAt = new Date().toISOString()
        const token = createSessionToken(store, user.id, remember)
        saveAuthStore(authDbPath, store)

        sendJson(res, 200, {
          ok: true,
          token,
          user: toPublicUser(user),
        })
      } catch (err) {
        sendJson(res, 500, {
          ok: false,
          error: err instanceof Error ? err.message : 'Eroare la autentificare.',
        })
      }
    })()
    return true
  }

  // 2. GET /api/auth/me
  if (req.method === 'GET' && reqPath === '/api/auth/me') {
    const store = loadAuthStore(authDbPath)
    const found = resolveSessionUser(store, req)
    if (!found) {
      sendJson(res, 401, { ok: false, error: 'Sesiune expirată sau neautentificată.' })
      return true
    }
    sendJson(res, 200, { ok: true, user: toPublicUser(found.user) })
    return true
  }

  // 3. POST /api/auth/logout
  if (req.method === 'POST' && reqPath === '/api/auth/logout') {
    const store = loadAuthStore(authDbPath)
    const token = readBearerToken(req)
    if (token && store.sessions[token]) {
      delete store.sessions[token]
      saveAuthStore(authDbPath, store)
    }
    sendJson(res, 200, { ok: true })
    return true
  }

  // 4. GET /api/auth/invite?token=...
  if (req.method === 'GET' && reqPath === '/api/auth/invite') {
    const params = new URLSearchParams(rawQuery)
    const token = String(params.get('token') || '').trim()
    if (!token) {
      sendJson(res, 400, { ok: false, error: 'Lipsește codul invitației.' })
      return true
    }
    const store = loadAuthStore(authDbPath)
    const user = store.users.find((u) => u.inviteToken && u.inviteToken === token)
    if (!user) {
      sendJson(res, 404, { ok: false, error: 'Invitația nu există sau a fost deja folosită.' })
      return true
    }
    if (user.inviteExpiresAt && Date.parse(user.inviteExpiresAt) <= Date.now()) {
      sendJson(res, 410, { ok: false, error: 'Linkul de invitație a expirat.' })
      return true
    }
    sendJson(res, 200, {
      ok: true,
      invite: {
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        driverTrailerId: user.driverTrailerId || '',
        expiresAt: user.inviteExpiresAt || '',
      },
    })
    return true
  }

  // 5. POST /api/auth/accept-invite
  if (req.method === 'POST' && reqPath === '/api/auth/accept-invite') {
    void (async () => {
      try {
        const body = await readSmallJsonBody(req)
        const token = String(body.token || '').trim()
        const password = String(body.password || '')
        const remember = Boolean(body.remember)

        if (!token) {
          sendJson(res, 400, { ok: false, error: 'Lipsește codul invitației.' })
          return
        }
        if (password.length < 6) {
          sendJson(res, 400, {
            ok: false,
            error: 'Parola trebuie să conțină cel puțin 6 caractere.',
          })
          return
        }

        const store = loadAuthStore(authDbPath)
        const user = store.users.find((u) => u.inviteToken && u.inviteToken === token)
        if (!user) {
          sendJson(res, 404, {
            ok: false,
            error: 'Invitația nu există sau a fost deja activată.',
          })
          return
        }
        if (user.inviteExpiresAt && Date.parse(user.inviteExpiresAt) <= Date.now()) {
          sendJson(res, 410, { ok: false, error: 'Linkul de invitație a expirat.' })
          return
        }

        if (body.name !== undefined && String(body.name).trim()) {
          user.name = String(body.name).trim().slice(0, 80)
        }
        if (body.username !== undefined && String(body.username).trim()) {
          const desiredUsername = normalizeUsername(body.username, user.email)
          const conflict = store.users.some(
            (other) =>
              other.id !== user.id &&
              String(other.username || '').toLowerCase() === desiredUsername
          )
          if (conflict) {
            sendJson(res, 409, {
              ok: false,
              error: 'Acest nume de utilizator este deja folosit.',
            })
            return
          }
          if (desiredUsername) {
            user.username = desiredUsername
          }
        }

        const { salt, hash } = hashPassword(password)
        user.passwordSalt = salt
        user.passwordHash = hash
        user.status = 'ACTIVE'
        user.inviteToken = ''
        user.inviteExpiresAt = ''
        user.lastLoginAt = new Date().toISOString()

        const sessionToken = createSessionToken(store, user.id, remember)
        saveAuthStore(authDbPath, store)

        sendJson(res, 200, {
          ok: true,
          token: sessionToken,
          user: toPublicUser(user),
        })
      } catch (err) {
        sendJson(res, 500, {
          ok: false,
          error: err instanceof Error ? err.message : 'Eroare la activarea contului.',
        })
      }
    })()
    return true
  }

  // Admin-only endpoints below
  const store = loadAuthStore(authDbPath)
  const session = resolveSessionUser(store, req)
  if (!session || session.user.role !== 'ADMIN') {
    sendJson(res, 403, {
      ok: false,
      error: 'Acces permis exclusiv administratorilor.',
    })
    return true
  }

  // 6. GET /api/auth/users
  if (req.method === 'GET' && reqPath === '/api/auth/users') {
    sendJson(res, 200, {
      ok: true,
      users: store.users.map(toAdminUser),
    })
    return true
  }

  // 7. POST /api/auth/users/invite
  if (req.method === 'POST' && reqPath === '/api/auth/users/invite') {
    void (async () => {
      try {
        const body = await readSmallJsonBody(req)
        const name = String(body.name || '').trim().slice(0, 80)
        const email = String(body.email || '').trim().toLowerCase()
        const role = String(body.role || 'DISPECER').toUpperCase()
        const driverTrailerId =
          role === 'SOFER' ? String(body.driverTrailerId || 'BH 67 STS').trim() : ''
        const initialPassword = String(body.initialPassword || '')

        if (!name || !email || !email.includes('@')) {
          sendJson(res, 400, {
            ok: false,
            error: 'Completează numele și o adresă de email validă.',
          })
          return
        }
        if (!VALID_ROLES.has(role)) {
          sendJson(res, 400, { ok: false, error: 'Rol invalid.' })
          return
        }

        const freshStore = loadAuthStore(authDbPath)
        if (freshStore.users.some((u) => String(u.email).toLowerCase() === email)) {
          sendJson(res, 409, {
            ok: false,
            error: 'Există deja un utilizator cu acest email.',
          })
          return
        }

        let username = normalizeUsername(body.username, email)
        if (!username) username = `user.${Date.now().toString().slice(-4)}`
        let suffix = 2
        const baseUsername = username
        while (
          freshStore.users.some((u) => String(u.username).toLowerCase() === username)
        ) {
          username = `${baseUsername}${suffix}`
          suffix += 1
        }

        const now = new Date().toISOString()
        let passwordSalt = ''
        let passwordHash = ''
        let status = 'INVITED'
        let inviteToken = ''
        let inviteExpiresAt = ''

        if (initialPassword) {
          if (initialPassword.length < 6) {
            sendJson(res, 400, {
              ok: false,
              error: 'Parola trebuie să aibă cel puțin 6 caractere.',
            })
            return
          }
          const hashed = hashPassword(initialPassword)
          passwordSalt = hashed.salt
          passwordHash = hashed.hash
          status = 'ACTIVE'
        } else {
          inviteToken = crypto.randomBytes(24).toString('hex')
          inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }

        const newUser = {
          id: `usr-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`,
          name,
          email,
          username,
          role,
          driverTrailerId,
          status,
          passwordSalt,
          passwordHash,
          inviteToken,
          inviteExpiresAt,
          invitedBy: session.user.name,
          createdAt: now,
          lastLoginAt: '',
        }

        freshStore.users.unshift(newUser)
        saveAuthStore(authDbPath, freshStore)

        sendJson(res, 200, {
          ok: true,
          user: toAdminUser(newUser),
          users: freshStore.users.map(toAdminUser),
        })
      } catch (err) {
        sendJson(res, 500, {
          ok: false,
          error: err instanceof Error ? err.message : 'Eroare la crearea invitației.',
        })
      }
    })()
    return true
  }

  // 8. POST /api/auth/users/update
  if (req.method === 'POST' && reqPath === '/api/auth/users/update') {
    void (async () => {
      try {
        const body = await readSmallJsonBody(req)
        const targetId = String(body.id || '').trim()
        const freshStore = loadAuthStore(authDbPath)
        const user = freshStore.users.find((u) => u.id === targetId)
        if (!user) {
          sendJson(res, 404, { ok: false, error: 'Utilizatorul nu a fost găsit.' })
          return
        }

        const nextRole =
          body.role !== undefined ? String(body.role).toUpperCase() : user.role
        const nextStatus =
          body.status !== undefined ? String(body.status).toUpperCase() : user.status

        if (!VALID_ROLES.has(nextRole)) {
          sendJson(res, 400, { ok: false, error: 'Rol invalid.' })
          return
        }
        if (!VALID_STATUSES.has(nextStatus)) {
          sendJson(res, 400, { ok: false, error: 'Status invalid.' })
          return
        }

        if (
          user.role === 'ADMIN' &&
          user.status === 'ACTIVE' &&
          (nextRole !== 'ADMIN' || nextStatus !== 'ACTIVE') &&
          countActiveAdmins(freshStore.users, user.id) === 0
        ) {
          sendJson(res, 400, {
            ok: false,
            error: 'Nu poți dezactiva sau schimba rolul ultimului administrator activ.',
          })
          return
        }

        if (body.name !== undefined && String(body.name).trim()) {
          user.name = String(body.name).trim().slice(0, 80)
        }

        if (body.email !== undefined && String(body.email).trim()) {
          const nextEmail = String(body.email).trim().toLowerCase()
          if (!nextEmail.includes('@')) {
            sendJson(res, 400, { ok: false, error: 'Adresă de email invalidă.' })
            return
          }
          const dupEmail = freshStore.users.some(
            (u) => u.id !== user.id && String(u.email).toLowerCase() === nextEmail
          )
          if (dupEmail) {
            sendJson(res, 409, { ok: false, error: 'Email deja utilizat de alt cont.' })
            return
          }
          user.email = nextEmail
        }

        if (body.username !== undefined && String(body.username).trim()) {
          const nextUsername = normalizeUsername(body.username, user.email)
          const dupUser = freshStore.users.some(
            (u) => u.id !== user.id && String(u.username).toLowerCase() === nextUsername
          )
          if (dupUser) {
            sendJson(res, 409, { ok: false, error: 'Nume de utilizator deja folosit.' })
            return
          }
          if (nextUsername) user.username = nextUsername
        }

        user.role = nextRole
        user.driverTrailerId =
          nextRole === 'SOFER'
            ? String(body.driverTrailerId || user.driverTrailerId || 'BH 67 STS').trim()
            : ''
        user.status = nextStatus

        if (body.newPassword !== undefined && String(body.newPassword).length > 0) {
          const rawPass = String(body.newPassword)
          if (rawPass.length < 6) {
            sendJson(res, 400, {
              ok: false,
              error: 'Parola nouă trebuie să aibă cel puțin 6 caractere.',
            })
            return
          }
          const hashed = hashPassword(rawPass)
          user.passwordSalt = hashed.salt
          user.passwordHash = hashed.hash
          user.inviteToken = ''
          user.inviteExpiresAt = ''
          if (user.status === 'INVITED') {
            user.status = 'ACTIVE'
          }
        } else if (body.regenerateInvite) {
          user.inviteToken = crypto.randomBytes(24).toString('hex')
          user.inviteExpiresAt = new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toISOString()
          if (!user.passwordHash) {
            user.status = 'INVITED'
          }
        }

        if (user.status === 'DISABLED') {
          for (const [tok, s] of Object.entries(freshStore.sessions)) {
            if (s && s.userId === user.id) {
              delete freshStore.sessions[tok]
            }
          }
        }

        saveAuthStore(authDbPath, freshStore)
        sendJson(res, 200, {
          ok: true,
          user: toAdminUser(user),
          users: freshStore.users.map(toAdminUser),
        })
      } catch (err) {
        sendJson(res, 500, {
          ok: false,
          error: err instanceof Error ? err.message : 'Eroare la actualizarea contului.',
        })
      }
    })()
    return true
  }

  // 9. POST /api/auth/users/delete
  if (req.method === 'POST' && reqPath === '/api/auth/users/delete') {
    void (async () => {
      try {
        const body = await readSmallJsonBody(req)
        const targetId = String(body.id || '').trim()
        if (targetId === session.user.id) {
          sendJson(res, 400, {
            ok: false,
            error: 'Nu îți poți șterge propriul cont conectat.',
          })
          return
        }
        const freshStore = loadAuthStore(authDbPath)
        const target = freshStore.users.find((u) => u.id === targetId)
        if (!target) {
          sendJson(res, 404, { ok: false, error: 'Contul nu există.' })
          return
        }
        if (
          target.role === 'ADMIN' &&
          target.status === 'ACTIVE' &&
          countActiveAdmins(freshStore.users, target.id) === 0
        ) {
          sendJson(res, 400, {
            ok: false,
            error: 'Nu poți șterge ultimul administrator activ.',
          })
          return
        }

        freshStore.users = freshStore.users.filter((u) => u.id !== targetId)
        for (const [tok, s] of Object.entries(freshStore.sessions)) {
          if (s && s.userId === targetId) {
            delete freshStore.sessions[tok]
          }
        }
        saveAuthStore(authDbPath, freshStore)

        sendJson(res, 200, {
          ok: true,
          users: freshStore.users.map(toAdminUser),
        })
      } catch (err) {
        sendJson(res, 500, {
          ok: false,
          error: err instanceof Error ? err.message : 'Eroare la ștergerea contului.',
        })
      }
    })()
    return true
  }

  sendJson(res, 404, { ok: false, error: 'Endpoint necunoscut.' })
  return true
}

export function authenticateApiRequest(req, authDbPath, fallbackToken = '') {
  const store = loadAuthStore(authDbPath)
  const bearer = readBearerToken(req) || String(fallbackToken || '').trim()
  if (!bearer) return null
  const sess = store.sessions[bearer]
  if (!sess || !sess.expiresAt || Date.parse(sess.expiresAt) <= Date.now()) {
    return null
  }
  const user = store.users.find((u) => u.id === sess.userId)
  if (!user || user.status !== 'ACTIVE') return null
  return { user: toPublicUser(user), token: bearer }
}
