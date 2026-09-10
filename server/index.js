import compression from 'compression'
import crypto from 'node:crypto'
import express from 'express'
import rateLimit from 'express-rate-limit'
import fs from 'node:fs/promises'
import helmet from 'helmet'
import multer from 'multer'
import path from 'node:path'
import pg from 'pg'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const metadata = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'))
const VERSION = metadata.version
const GENERATION = 'BENEFICIOS_UIC_352'
const BUILD_COMMIT = String(process.env.RENDER_GIT_COMMIT || '').slice(0, 12) || null
const PORT = Number(process.env.PORT || 10000)
const dist = path.join(root, 'dist')
const app = express()

function normalizeDatabaseUrl(value) {
  if (!value || /localhost|127\.0\.0\.1/.test(value)) return value
  const parsed = new URL(value)
  if (['prefer', 'require', 'verify-ca'].includes(parsed.searchParams.get('sslmode'))) parsed.searchParams.set('sslmode', 'verify-full')
  return parsed.toString()
}

const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL)
const pool = databaseUrl ? new pg.Pool({ connectionString: databaseUrl, max: 5, ...(/localhost|127\.0\.0\.1/.test(databaseUrl) ? { ssl: false } : {}) }) : null

async function readLocalCatalog() {
  try {
    const content = await fs.readFile(path.join(root, 'data/catalog.json'), 'utf8')
    const items = JSON.parse(content)
    return Array.isArray(items) ? items : []
  } catch (error) {
    console.warn(`Catálogo local no disponible (${error.code || error.message}). El servicio continuará con Neon.`)
    return []
  }
}

const localCatalog = await readLocalCatalog()

function rowToBenefit(row, flyers = []) {
  return {
    id: row.id, slug: row.slug, title: row.title, partner: row.partner, category: row.category,
    status: row.status, featured: row.featured, summary: row.summary, description: row.description,
    concreteBenefit: row.concrete_benefit, costsDiscounts: row.costs_discounts,
    requirements: row.requirements || [], scope: row.scope, contactName: row.contact_name,
    contactPhone: row.contact_phone, contactEmail: row.contact_email, companyContacts: row.company_contacts || [],
    agreementUrl: row.agreement_url || '', agreementLinks: row.agreement_links || [], externalImageUrl: row.external_image_url || '', externalImageAlt: row.external_image_alt || '', startDate: row.start_date, endDate: row.end_date, published: row.published, flyers: flyers.length ? flyers : (row.external_image_url ? [{ id: `external-${row.id}`, url: row.external_image_url, alt: row.external_image_alt || row.partner || row.title }] : [])
  }
}

function localBenefit(item, index) {
  return { id: `local-${index + 1}`, ...item, published: item.published !== false, flyers: item.externalImageUrl ? [{ id: `external-local-${index + 1}`, url: item.externalImageUrl, alt: item.externalImageAlt || item.partner || item.title }] : [] }
}

async function initializeDatabase() {
  if (!pool) {
    console.warn('DATABASE_URL no configurada. Se utilizará el catálogo local.')
    return
  }
  const schema = await fs.readFile(path.join(root, 'server/schema.sql'), 'utf8')
  await pool.query(schema)
  for (const item of localCatalog) {
    const result = await pool.query(`INSERT INTO benefits
      (slug,title,partner,category,status,featured,summary,description,concrete_benefit,costs_discounts,requirements,scope,contact_name,contact_phone,contact_email,company_contacts,agreement_url,agreement_links,external_image_url,external_image_alt,start_date,end_date,published)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,TRUE)
      ON CONFLICT (slug) DO UPDATE SET
        category = CASE
          WHEN benefits.slug = 'affinity-broker-seguros-condiciones-preferenciales' AND benefits.category = 'Seguros'
          THEN EXCLUDED.category
          ELSE benefits.category END,
        company_contacts = CASE
          WHEN jsonb_array_length(COALESCE(benefits.company_contacts, '[]'::jsonb)) = 0
            OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(benefits.company_contacts, '[]'::jsonb)) c WHERE COALESCE(c->>'email','') <> '')
          THEN EXCLUDED.company_contacts
          ELSE benefits.company_contacts END,
        agreement_url = CASE WHEN COALESCE(benefits.agreement_url,'') = '' THEN EXCLUDED.agreement_url ELSE benefits.agreement_url END,
        agreement_links = CASE
          WHEN jsonb_array_length(COALESCE(benefits.agreement_links, '[]'::jsonb)) = 0 THEN EXCLUDED.agreement_links
          ELSE benefits.agreement_links END,
        external_image_url = CASE WHEN COALESCE(benefits.external_image_url,'') = '' THEN EXCLUDED.external_image_url ELSE benefits.external_image_url END,
        external_image_alt = CASE WHEN COALESCE(benefits.external_image_alt,'') = '' THEN EXCLUDED.external_image_alt ELSE benefits.external_image_alt END,
        updated_at = CASE WHEN
          (benefits.slug = 'affinity-broker-seguros-condiciones-preferenciales' AND benefits.category = 'Seguros') OR
          (jsonb_array_length(COALESCE(benefits.company_contacts, '[]'::jsonb)) = 0 OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(benefits.company_contacts, '[]'::jsonb)) c WHERE COALESCE(c->>'email','') <> '')) OR
          COALESCE(benefits.agreement_url,'') = '' OR
          jsonb_array_length(COALESCE(benefits.agreement_links, '[]'::jsonb)) = 0 OR
          COALESCE(benefits.external_image_url,'') = ''
          THEN NOW() ELSE benefits.updated_at END
      RETURNING id, slug`, [
      item.slug, item.title, item.partner || '', item.category, item.status || 'activo', Boolean(item.featured), item.summary || '',
      item.description || '', item.concreteBenefit || '', item.costsDiscounts || '', JSON.stringify(item.requirements || []), item.scope || '',
      item.contactName || '', item.contactPhone || '', item.contactEmail || '', JSON.stringify(item.companyContacts || []), item.agreementUrl || '',
      JSON.stringify(item.agreementLinks || []), item.externalImageUrl || '', item.externalImageAlt || '', item.startDate || null, item.endDate || null
    ])
    if (!result.rows?.[0]) throw new Error(`No se pudo sincronizar el beneficio ${item.slug}`)
  }
  // Corrección nominal explícitamente aprobada. No altera textos ni ediciones administrativas de otros beneficios.
  await pool.query(`UPDATE benefits
    SET partner='Paseo Gavazzi · SYGSA S.A. · CADEMA', updated_at=NOW()
    WHERE slug='paseo-gavazzi-sigsa-cadema'
      AND partner IN ('Paseo Gavazzi · SIGSA · Cadema','Paseo Gavazzi · SIGSA · CADEMA')`)

  const verification = await pool.query(`SELECT slug, company_contacts, agreement_url, agreement_links, external_image_url
    FROM benefits WHERE slug = ANY($1::text[])`, [localCatalog.map(item => item.slug)])
  const incomplete = verification.rows.filter(row =>
    !Array.isArray(row.company_contacts) || row.company_contacts.length === 0 ||
    (!row.agreement_url && (!Array.isArray(row.agreement_links) || row.agreement_links.length === 0)) ||
    !row.external_image_url)
  if (incomplete.length) console.warn(`Sincronización de completitud: ${incomplete.length} beneficio(s) conservan campos administrados sin completar: ${incomplete.map(x => x.slug).join(', ')}`)
  else console.log('Sincronización de completitud OK · 32/32 beneficios con contacto, convenio e imagen')
}
async function listBenefits(includeHidden = false) {
  if (!pool) return localCatalog.filter(item => includeHidden || item.published !== false).map(localBenefit)
  const result = await pool.query(`SELECT * FROM benefits ${includeHidden ? '' : 'WHERE published=TRUE'} ORDER BY featured DESC, title`)
  if (!result.rows.length && localCatalog.length) return localCatalog.filter(item => includeHidden || item.published !== false).map(localBenefit)
  const ids = result.rows.map(row => row.id)
  const flyerResult = ids.length ? await pool.query('SELECT id,benefit_id,alt_text,position FROM flyers WHERE benefit_id = ANY($1::bigint[]) ORDER BY position', [ids]) : { rows: [] }
  return result.rows.map(row => rowToBenefit(row, flyerResult.rows.filter(flyer => String(flyer.benefit_id) === String(row.id)).map(flyer => ({ id: flyer.id, url: `/api/flyers/${flyer.id}`, alt: flyer.alt_text }))))
}

function safeText(value, max = 2000) { return String(value ?? '').trim().slice(0, max) }
function safeStatus(value) { return ['activo','revalidacion','proximo'].includes(value) ? value : 'activo' }
function slugify(value) { return safeText(value, 180).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }
function safeId(value) { return /^\d+$/.test(String(value)) ? String(value) : null }

const COOKIE = 'uic_nuevo_admin'
function signature(value) { return crypto.createHmac('sha256', process.env.SESSION_SECRET || 'desarrollo').update(value).digest('base64url') }
function createSession() { const expires = Math.floor(Date.now() / 1000) + 28800; const value = `admin.${expires}`; return `${value}.${signature(value)}` }
function isAdmin(req) {
  const cookie = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) || ''
  const parts = decodeURIComponent(cookie).split('.')
  if (parts.length !== 3 || parts[0] !== 'admin' || Number(parts[1]) < Date.now() / 1000) return false
  const expected = Buffer.from(signature(`${parts[0]}.${parts[1]}`)); const actual = Buffer.from(parts[2])
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
}
function requireAdmin(req, res, next) { return isAdmin(req) ? next() : res.status(401).json({ error: 'Acceso administrativo requerido' }) }

app.set('trust proxy', 1)
app.disable('etag')
app.use(helmet({ contentSecurityPolicy: { directives: { 'img-src': ["'self'", 'data:', 'blob:', 'https://upload.wikimedia.org'], 'connect-src': ["'self'"] } } }))
app.use(compression())
app.use(express.json({ limit: '2mb' }))
app.use((req, res, next) => { res.setHeader('X-App-Version', VERSION); res.setHeader('X-UI-Generation', GENERATION); next() })
app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next() })

app.get('/api/version', (_req, res) => res.json({ ok: true, version: VERSION, generation: GENERATION, commit: BUILD_COMMIT }))

app.get('/api/health', async (_req, res) => {
  try {
    const items = await listBenefits()
    const dalmine = items.find(item => item.slug === 'club-villa-dalmine-beneficios-uic')
    res.json({ ok: true, version: VERSION, generation: GENERATION, commit: BUILD_COMMIT, database: Boolean(pool), catalogSource: pool ? 'neon' : 'local', catalog: { published: items.length, active: items.filter(x => x.status === 'activo').length, categories: new Set(items.map(x => x.category)).size, villaDalmine: Boolean(dalmine) } })
  } catch (error) { res.status(503).json({ ok: false, version: VERSION, generation: GENERATION, error: error.message }) }
})

app.get('/api/beneficios', async (_req, res, next) => { try { res.json(await listBenefits()) } catch (error) { next(error) } })
app.get('/api/beneficios/:slug', async (req, res, next) => {
  try {
    const items = await listBenefits()
    const item = items.find(benefit => benefit.slug === req.params.slug)
    if (!item) return res.status(404).json({ error: 'Beneficio no encontrado' })
    res.json(item)
  } catch (error) { next(error) }
})

app.get('/api/flyers/:id', async (req, res, next) => {
  try {
    if (!pool || !safeId(req.params.id)) return res.status(404).end()
    const result = await pool.query('SELECT image_data,mime_type FROM flyers WHERE id=$1', [req.params.id])
    if (!result.rows[0]?.image_data) return res.status(404).end()
    res.type(result.rows[0].mime_type || 'application/octet-stream').send(result.rows[0].image_data)
  } catch (error) { next(error) }
})

const traceLimit = rateLimit({ windowMs: 60000, limit: 120, standardHeaders: true, legacyHeaders: false })
app.post('/api/traces', traceLimit, async (req, res, next) => {
  try {
    if (!pool) return res.status(202).json({ saved: false })
    const rawIp = String(req.ip || '')
    const masked = rawIp.includes(':') ? `${rawIp.split(':').slice(0,3).join(':')}::` : `${rawIp.split('.').slice(0,3).join('.')}.0`
    const hash = crypto.createHash('sha256').update(`${process.env.IP_HASH_SALT || 'local'}:${rawIp}`).digest('hex')
    await pool.query('INSERT INTO traces (benefit_slug,benefit_title,action,ip_masked,ip_hash,device,browser) VALUES ($1,$2,$3,$4,$5,$6,$7)', [safeText(req.body.slug,120), safeText(req.body.title,200), ['vista','contacto'].includes(req.body.action) ? req.body.action : 'vista', masked, hash, 'No identificado', safeText(req.headers['user-agent'],300)])
    res.status(201).json({ saved: true })
  } catch (error) { next(error) }
})

const loginLimit = rateLimit({ windowMs: 900000, limit: 10, standardHeaders: true, legacyHeaders: false })
app.post('/api/admin/login', loginLimit, (req, res) => {
  const expected = String(process.env.ADMIN_PASSWORD || '')
  const actual = String(req.body.password || '')
  if (!expected || expected.length !== actual.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) return res.status(401).json({ error: 'Clave incorrecta' })
  res.cookie(COOKIE, createSession(), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 28800000, path: '/' }).json({ authenticated: true })
})
app.post('/api/admin/logout', (_req, res) => res.clearCookie(COOKIE, { path: '/' }).json({ authenticated: false }))
app.get('/api/admin/me', (req, res) => res.json({ authenticated: isAdmin(req) }))
app.get('/api/admin/beneficios', requireAdmin, async (_req, res, next) => { try { res.json(await listBenefits(true)) } catch (error) { next(error) } })

function cleanAgreementLinks(value) {
  if (!Array.isArray(value)) return []
  return value.slice(0, 10).map(link => ({
    label: safeText(link?.label, 250), url: safeText(link?.url, 1000)
  })).filter(link => link.url)
}

function cleanCompanyContacts(value) {
  if (!Array.isArray(value)) return []
  return value.slice(0, 20).map(contact => ({
    name: safeText(contact?.name, 200), role: safeText(contact?.role, 160),
    phone: safeText(contact?.phone, 100), email: safeText(contact?.email, 250)
  })).filter(contact => contact.name || contact.role || contact.phone || contact.email)
}

function values(body) {
  return [safeText(body.title,200), safeText(body.partner,200), safeText(body.category,120), safeStatus(body.status), Boolean(body.featured), safeText(body.summary,1000), safeText(body.description,5000), safeText(body.concreteBenefit,2000), safeText(body.costsDiscounts,2000), JSON.stringify(Array.isArray(body.requirements) ? body.requirements.map(x => safeText(x,500)).filter(Boolean) : []), safeText(body.scope,1000), safeText(body.contactName,200), safeText(body.contactPhone,100), safeText(body.contactEmail,250), JSON.stringify(cleanCompanyContacts(body.companyContacts)), safeText(body.agreementUrl,1000), JSON.stringify(cleanAgreementLinks(body.agreementLinks)), safeText(body.externalImageUrl,1000), safeText(body.externalImageAlt,250), body.startDate || null, body.endDate || null, body.published !== false]
}

app.post('/api/admin/beneficios', requireAdmin, async (req, res, next) => {
  try {
    if (!pool) return res.status(503).json({ error: 'Neon no está configurado' })
    if (!safeText(req.body.title) || !safeText(req.body.category)) return res.status(400).json({ error: 'Título y rubro son obligatorios' })
    const baseSlug = slugify(req.body.title)
    if (!baseSlug) return res.status(400).json({ error: 'El título debe contener letras o números' })
    let slug = baseSlug; let suffix = 1
    while ((await pool.query('SELECT 1 FROM benefits WHERE slug=$1', [slug])).rowCount) slug = `${baseSlug}-${++suffix}`
    const result = await pool.query(`INSERT INTO benefits (slug,title,partner,category,status,featured,summary,description,concrete_benefit,costs_discounts,requirements,scope,contact_name,contact_phone,contact_email,company_contacts,agreement_url,agreement_links,external_image_url,external_image_alt,start_date,end_date,published)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) RETURNING *`, [slug, ...values(req.body)])
    res.status(201).json(rowToBenefit(result.rows[0]))
  } catch (error) { next(error) }
})

app.put('/api/admin/beneficios/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = safeId(req.params.id)
    if (!pool || !id) return res.status(400).json({ error: 'Beneficio inválido' })
    const result = await pool.query(`UPDATE benefits SET title=$1,partner=$2,category=$3,status=$4,featured=$5,summary=$6,description=$7,concrete_benefit=$8,costs_discounts=$9,requirements=$10,scope=$11,contact_name=$12,contact_phone=$13,contact_email=$14,company_contacts=$15,agreement_url=$16,agreement_links=$17,external_image_url=$18,external_image_alt=$19,start_date=$20,end_date=$21,published=$22,updated_at=NOW() WHERE id=$23 RETURNING *`, [...values(req.body), id])
    if (!result.rows[0]) return res.status(404).json({ error: 'Beneficio no encontrado' })
    res.json(rowToBenefit(result.rows[0]))
  } catch (error) { next(error) }
})

app.delete('/api/admin/beneficios/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = safeId(req.params.id)
    if (!pool || !id) return res.status(400).json({ error: 'Beneficio inválido' })
    const result = await pool.query('DELETE FROM benefits WHERE id=$1', [id])
    if (!result.rowCount) return res.status(404).json({ error: 'Beneficio no encontrado' })
    res.json({ deleted: true })
  } catch (error) { next(error) }
})

const imageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024, files: 10 } })
app.post('/api/admin/beneficios/:id/flyers', requireAdmin, imageUpload.array('flyers', 10), async (req, res, next) => {
  try {
    const id = safeId(req.params.id)
    if (!pool || !id) return res.status(400).json({ error: 'Beneficio inválido' })
    const allowed = new Set(['image/jpeg','image/png','image/webp','image/gif'])
    if ((req.files || []).some(file => !allowed.has(file.mimetype))) return res.status(400).json({ error: 'Formato de imagen no permitido' })
    const current = await pool.query('SELECT COALESCE(MAX(position),-1)::int AS position FROM flyers WHERE benefit_id=$1', [id])
    let position = current.rows[0].position
    for (const file of req.files || []) {
      const alt = safeText(file.originalname, 250) || 'Flyer del beneficio'
      await pool.query('INSERT INTO flyers (benefit_id,url,alt_text,position,image_data,mime_type) VALUES ($1,$2,$3,$4,$5,$6)', [id, '', alt, ++position, file.buffer, file.mimetype])
    }
    res.status(201).json({ uploaded: (req.files || []).length })
  } catch (error) { next(error) }
})

app.delete('/api/admin/flyers/:id', requireAdmin, async (req, res, next) => {
  try { if (!pool || !safeId(req.params.id)) return res.status(400).json({ error: 'Flyer inválido' }); await pool.query('DELETE FROM flyers WHERE id=$1', [req.params.id]); res.json({ deleted: true }) } catch (error) { next(error) }
})

const legacyServiceWorker = `
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.map(key => caches.delete(key)))
    await self.clients.claim()
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    await self.registration.unregister()
    for (const client of windows) {
      try { await client.navigate('/?actualizado=' + Date.now()) } catch {}
    }
  })())
})
`

app.get(['/sw.js', '/service-worker.js', '/serviceWorker.js', '/serviceworker.js'], (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.setHeader('Service-Worker-Allowed', '/')
  res.type('application/javascript').send(legacyServiceWorker)
})

app.get('/actualizar-version', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.setHeader('Clear-Site-Data', '"cache", "storage"')
  res.type('html').send(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Actualizando Beneficios UIC</title></head><body style="font-family:Arial;padding:40px"><h1>Actualizando el nuevo portal</h1><p>Limpiando versiones anteriores…</p><script>Promise.all([('serviceWorker'in navigator?navigator.serviceWorker.getRegistrations().then(r=>Promise.all(r.map(x=>x.unregister()))):Promise.resolve()),('caches'in window?caches.keys().then(k=>Promise.all(k.map(x=>caches.delete(x)))):Promise.resolve())]).finally(()=>location.replace('/?actualizado=${VERSION}&t='+Date.now()))</script></body></html>`)
})

const compiledHtml = await fs.readFile(path.join(dist, 'index.html'), 'utf8').catch(() => '')
if (!compiledHtml.includes(GENERATION)) throw new Error(`Frontend nuevo ausente: falta ${GENERATION}. Ejecutá npm run build.`)

app.use(express.static(dist, { index: false, setHeaders: (res, filename) => res.setHeader('Cache-Control', filename.includes(`${path.sep}assets${path.sep}`) ? 'public,max-age=31536000,immutable' : 'no-cache') }))
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    return res.sendFile(path.join(dist, 'index.html'))
  }
  next()
})
app.use((error, req, res, _next) => {
  console.error(error)
  if (error?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'La imagen supera el límite de 12 MB.' })
  if (error?.code === 'LIMIT_FILE_COUNT') return res.status(400).json({ error: 'Se pueden cargar hasta 10 imágenes por vez.' })
  if (req.path.includes('/flyers') && error?.code === '23502') return res.status(500).json({ error: 'No se pudo guardar la imagen por una incompatibilidad de la estructura anterior de Neon. La revisión 3.1.0 conserva la corrección de esa migración.' })
  res.status(error.status || 500).json({ error: error.status ? error.message : 'Ocurrió un error inesperado' })
})

await initializeDatabase()
const server = app.listen(PORT, '0.0.0.0', () => console.log(`Beneficios UIC NUEVO v${VERSION} · ${GENERATION} · puerto ${PORT}`))
process.on('SIGTERM', async () => { server.close(); await pool?.end(); process.exit(0) })
