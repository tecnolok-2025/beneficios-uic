import compression from 'compression'
import crypto from 'node:crypto'
import express from 'express'
import rateLimit from 'express-rate-limit'
import fs from 'node:fs/promises'
import helmet from 'helmet'
import multer from 'multer'
import nodemailer from 'nodemailer'
import path from 'node:path'
import pg from 'pg'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const metadata = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'))
const VERSION = metadata.version
const GENERATION = 'BENEFICIOS_UIC_391'
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
let databaseAvailable = Boolean(pool)
if (pool) {
  pool.on('error', error => {
    databaseAvailable = false
    console.error(`Neon: error en conexión inactiva; el proceso continuará activo (${error.code || error.message})`)
  })
}

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

async function readJsonData(filename, fallback) {
  try { return JSON.parse(await fs.readFile(path.join(root, 'data', filename), 'utf8')) }
  catch (error) { console.warn(`${filename} no disponible (${error.code || error.message})`); return fallback }
}
const diffusionRecipientSeed = await readJsonData('diffusion-recipients.json', [])
const diffusionConfig = await readJsonData('diffusion-config.json', { approvalEmail: 'uic@uic-campana.com.ar', maintenanceContact: { name: 'María José Godoy (Majo)', phone: '3489 65 0104', email: 'uic@uic-campana.com.ar' }, companyOverrides: {}, testCompanies: [] })
const PILOT_COMPANY_KEY = 'tecno-logisti-k-sa'


function dateOnly(value) {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).slice(0, 10)
}

function rowToBenefit(row, flyers = []) {
  return {
    id: row.id, slug: row.slug, title: row.title, partner: row.partner, category: row.category,
    status: row.status, featured: row.featured, summary: row.summary, description: row.description,
    concreteBenefit: row.concrete_benefit, costsDiscounts: row.costs_discounts,
    requirements: row.requirements || [], scope: row.scope, contactName: row.contact_name,
    contactPhone: row.contact_phone, contactEmail: row.contact_email, companyContacts: row.company_contacts || [],
    agreementUrl: row.agreement_url || '', agreementLinks: row.agreement_links || [], externalImageUrl: row.external_image_url || '', externalImageAlt: row.external_image_alt || '', startDate: dateOnly(row.start_date), endDate: dateOnly(row.end_date), published: row.published, flyers: flyers.length ? flyers : (row.external_image_url ? [{ id: `external-${row.id}`, url: row.external_image_url, alt: row.external_image_alt || row.partner || row.title }] : [])
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

  // v3.8.0 · actualización explícita de la ficha Praxis solicitada por UIC.
  // Se limita a este slug y no modifica flyers cargados desde Administración ni otras fichas de Neon.
  const praxis = localCatalog.find(item => item.slug === 'finanzas-corporativas-praxis')
  if (praxis) {
    await pool.query(`UPDATE benefits SET
      title=$1, partner=$2, category=$3, status=$4, featured=$5,
      summary=$6, description=$7, concrete_benefit=$8, costs_discounts=$9,
      requirements=$10, scope=$11, contact_name=$12, contact_phone=$13, contact_email=$14,
      company_contacts=$15, agreement_url=$16, agreement_links=$17,
      external_image_url=$18, external_image_alt=$19, start_date=$20, end_date=$21,
      published=$22, updated_at=NOW()
      WHERE slug='finanzas-corporativas-praxis'`, [
        praxis.title, praxis.partner, praxis.category, praxis.status || 'activo', Boolean(praxis.featured),
        praxis.summary || '', praxis.description || '', praxis.concreteBenefit || '', praxis.costsDiscounts || '',
        JSON.stringify(praxis.requirements || []), praxis.scope || '', praxis.contactName || '', praxis.contactPhone || '', praxis.contactEmail || '',
        JSON.stringify(praxis.companyContacts || []), praxis.agreementUrl || '', JSON.stringify(praxis.agreementLinks || []),
        praxis.externalImageUrl || '', praxis.externalImageAlt || '', praxis.startDate || null, praxis.endDate || null, praxis.published !== false
      ])
  }

  for (const recipient of diffusionRecipientSeed) {
    await pool.query(`INSERT INTO diffusion_recipients
      (source_key,source_type,member_number,company_name,contact_name,cuit,email,phone,active_code,enabled,email_valid,notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (source_key) DO NOTHING`, [
        recipient.sourceKey, recipient.sourceType, recipient.memberNumber || '', recipient.companyName || '', recipient.contactName || '',
        recipient.cuit || '', recipient.email || '', recipient.phone || '', recipient.activeCode || '', recipient.enabled !== false,
        recipient.emailValid !== false, recipient.notes || ''
      ])
  }

  // v3.9.1 · correcciones puntuales del padrón confirmadas por UIC el 24/10/2026.
  // Se aplican sólo sobre los valores originales/incompletos para no pisar futuras ediciones manuales del administrador.
  await pool.query(`UPDATE diffusion_recipients SET email='info@tecnodealer.com.ar', enabled=TRUE, email_valid=TRUE, notes='Correo confirmado por UIC el 24/10/2026.', updated_at=NOW() WHERE source_key='socio:44' AND COALESCE(email,'')=''`)
  await pool.query(`UPDATE diffusion_recipients SET email='info@montajesinteracero.com.ar', enabled=TRUE, email_valid=TRUE, notes='Correo confirmado por UIC el 24/10/2026.', updated_at=NOW() WHERE source_key='socio:67' AND email='ficinatecnica@montajesinteracero.com.a'`)
  await pool.query(`UPDATE diffusion_recipients SET email='martin@eraina.com.ar', enabled=TRUE, email_valid=TRUE, notes='Correo confirmado por UIC el 24/10/2026.', updated_at=NOW() WHERE source_key='socio:92' AND email='dministracion@hotelplazacampana.com.a'`)
  await pool.query(`UPDATE diffusion_recipients SET company_name='SWA/NEUCO', email='', enabled=FALSE, email_valid=FALSE, notes='Nombre actualizado por UIC. Correo pendiente de confirmación; permanece destildado.', updated_at=NOW() WHERE source_key='socio:210' AND company_name='SWA' AND email='contacto@swa-trabajosustentable.com.a'`)

  const verification = await pool.query(`SELECT slug, company_contacts, agreement_url, agreement_links, external_image_url
    FROM benefits WHERE slug = ANY($1::text[])`, [localCatalog.map(item => item.slug)])
  const incomplete = verification.rows.filter(row =>
    !Array.isArray(row.company_contacts) || row.company_contacts.length === 0 ||
    (!row.agreement_url && (!Array.isArray(row.agreement_links) || row.agreement_links.length === 0)) ||
    !row.external_image_url)
  if (incomplete.length) console.warn(`Sincronización de completitud: ${incomplete.length} beneficio(s) conservan campos administrados sin completar: ${incomplete.map(x => x.slug).join(', ')}`)
  else console.log(`Sincronización de completitud OK · ${localCatalog.length}/${localCatalog.length} beneficios con contacto, convenio e imagen`)
}
async function listBenefits(includeHidden = false) {
  const localItems = () => localCatalog.filter(item => includeHidden || item.published !== false).map(localBenefit)
  if (!pool) return localItems()
  try {
    const result = await pool.query(`SELECT * FROM benefits ${includeHidden ? '' : 'WHERE published=TRUE'} ORDER BY featured DESC, title`)
    databaseAvailable = true
    if (!result.rows.length && localCatalog.length) return localItems()
    const ids = result.rows.map(row => row.id)
    const flyerResult = ids.length ? await pool.query('SELECT id,benefit_id,alt_text,position FROM flyers WHERE benefit_id = ANY($1::bigint[]) ORDER BY position', [ids]) : { rows: [] }
    return result.rows.map(row => rowToBenefit(row, flyerResult.rows.filter(flyer => String(flyer.benefit_id) === String(row.id)).map(flyer => ({ id: flyer.id, url: `/api/flyers/${flyer.id}`, alt: flyer.alt_text }))))
  } catch (error) {
    databaseAvailable = false
    console.error(`Neon temporalmente no disponible; usando catálogo local (${error.code || error.message})`)
    if (localCatalog.length) return localItems()
    throw error
  }
}

function argentinaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}
function effectiveServerStatus(item, today = argentinaDateKey()) {
  const raw = item?.status || 'activo'
  if (raw === 'finalizado' || raw === 'revalidacion') return raw
  const endDate = dateOnly(item?.endDate || item?.end_date)
  return endDate && endDate < today ? 'finalizado' : raw
}

function safeText(value, max = 2000) { return String(value ?? '').trim().slice(0, max) }
function safeStatus(value) { return ['activo','revalidacion','proximo','finalizado'].includes(value) ? value : 'activo' }
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

function maintenanceResponse(res) {
  return res.status(503).json({ maintenance: true, error: 'El Portal de Beneficios se encuentra temporalmente en mantenimiento. Por favor intentá nuevamente más tarde o comunicate con Administración UIC.', contact: diffusionConfig.maintenanceContact })
}
function requireDiffusionDatabase(_req, res, next) { return pool && databaseAvailable ? next() : maintenanceResponse(res) }
function validEmail(value) { return /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)*\.[A-Za-z]{2,}$/u.test(String(value || '').trim()) }
function normalizeEmail(value) { return String(value || '').trim().toLowerCase() }
function addCalendarMonth(date = new Date()) {
  const source = new Date(date)
  const year = source.getUTCFullYear(); const month = source.getUTCMonth(); const day = source.getUTCDate()
  const firstNext = new Date(Date.UTC(year, month + 1, 1, source.getUTCHours(), source.getUTCMinutes(), source.getUTCSeconds()))
  const lastDay = new Date(Date.UTC(firstNext.getUTCFullYear(), firstNext.getUTCMonth() + 1, 0)).getUTCDate()
  firstNext.setUTCDate(Math.min(day, lastDay))
  return firstNext
}
function plainMarkup(value) { return safeText(value, 12000).replace(/[<>]/g, '') }
function markupToHtml(value) {
  let text = String(value || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  text = text.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_\n]+)__/g, '<u>$1</u>')
    .replace(/_([^_\n]+)_/g, '<em>$1</em>')
  return text.split(/\n{2,}/).map(block => `<p>${block.replace(/\n/g, '<br>')}</p>`).join('')
}
function assessCampaign(subject, body, files = []) {
  const combined = `${subject || ''}\n${body || ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const blocked = [/[<>]\s*script/i, /javascript\s*:/i, /\b(?:hijo de puta|pelotudo|forro|mierda|puta)\b/i, /\b(?:nazi|genocidio)\b.*\b(?:apoyo|celebro|promuevo)\b/i]
  if (blocked.some(pattern => pattern.test(combined))) return { status: 'blocked', notes: 'El contenido requiere corrección antes de continuar.' }
  const suspicious = [/contrase(?:n|ñ)a/i, /clave bancaria/i, /transfer[ií].*urgente/i, /bitcoin|cripto.*urgente/i]
  const needsReview = suspicious.some(pattern => pattern.test(combined)) || files.length > 0
  return { status: needsReview ? 'review' : 'ok', notes: needsReview ? 'Revisión administrativa obligatoria antes del envío final.' : 'Control automático inicial superado.' }
}
function fileSignatureMatches(file) {
  const b = file.buffer || Buffer.alloc(0)
  if (file.mimetype === 'image/jpeg') return b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
  if (file.mimetype === 'image/png') return b.length > 8 && b.slice(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))
  if (file.mimetype === 'application/pdf') return b.slice(0,5).toString() === '%PDF-'
  return false
}
function diffusionMailReady() {
  return String(process.env.DIFFUSION_SEND_ENABLED || '').toLowerCase() === 'true' && Boolean(process.env.SMTP_USER && process.env.SMTP_PASS)
}
function createMailer() {
  if (!diffusionMailReady()) return null
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true').toLowerCase() !== 'false',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  })
}
function campaignEmailHtml(campaign) {
  const family = ['Arial','Verdana','Tahoma','Georgia'].includes(campaign.font_family) ? campaign.font_family : 'Arial'
  const size = campaign.font_size === 'large' ? 18 : campaign.font_size === 'small' ? 13 : 15
  return `<div style="font-family:${family},sans-serif;font-size:${size}px;line-height:1.55;color:#15324a;max-width:760px;margin:auto"><div style="border-bottom:4px solid #159bc7;padding:0 0 16px"><strong style="font-size:22px">UNIÓN INDUSTRIAL DE CAMPANA</strong><br><span style="color:#527286">BENEFICIOS PARA SOCIOS</span></div><h2>${safeText(campaign.subject,300)}</h2><p><strong>Empresa:</strong> ${safeText(campaign.company_name,250)}<br><strong>Beneficio:</strong> ${safeText(campaign.benefit_title,300)}</p>${markupToHtml(campaign.body_markup)}<hr><p style="font-size:12px;color:#60798b">Comunicación emitida a través del Portal de Beneficios de la Unión Industrial de Campana. Las condiciones particulares deberán confirmarse con la empresa prestadora.</p></div>`
}
async function campaignAttachments(campaignId) {
  const result = await pool.query('SELECT filename,mime_type,file_data FROM diffusion_campaign_files WHERE campaign_id=$1 ORDER BY id', [campaignId])
  return result.rows.map(row => ({ filename: row.filename, content: row.file_data, contentType: row.mime_type }))
}
async function sendDiffusionMail({ to, bcc, subject, html, attachments = [] }) {
  const transporter = createMailer()
  if (!transporter) { const error = new Error('El envío real está deshabilitado hasta configurar la casilla emisora y activar DIFFUSION_SEND_ENABLED.'); error.status = 503; throw error }
  return transporter.sendMail({ from: process.env.DIFFUSION_FROM_EMAIL || process.env.SMTP_USER || 'beneficios_campana@gmail.com', to, ...(bcc?.length ? { bcc } : {}), subject, html, attachments })
}

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
    res.json({ ok: true, version: VERSION, generation: GENERATION, commit: BUILD_COMMIT, databaseConfigured: Boolean(pool), database: databaseAvailable, catalogSource: databaseAvailable ? 'neon' : (pool ? 'local-fallback' : 'local'), catalog: { published: items.length, active: items.filter(x => effectiveServerStatus(x) === 'activo').length, finalizado: items.filter(x => effectiveServerStatus(x) === 'finalizado').length, categories: new Set(items.map(x => x.category)).size, villaDalmine: Boolean(dalmine) } })
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

async function buildDiffusionCompanies() {
  const items = await listBenefits(true)
  const grouped = new Map()
  for (const item of items) {
    const name = String(diffusionConfig.companyOverrides?.[item.slug] || item.partner || item.title || 'Empresa sin identificar').trim()
    const key = slugify(name) || item.slug
    if (!grouped.has(key)) grouped.set(key, { key, name, contactName: item.companyContacts?.[0]?.name || '', email: item.companyContacts?.[0]?.email || '', phone: item.companyContacts?.[0]?.phone || '', testMode: false, benefits: [] })
    grouped.get(key).benefits.push({ id: item.id, slug: item.slug, title: item.title, category: item.category, summary: item.summary })
  }
  for (const company of diffusionConfig.testCompanies || []) grouped.set(company.key, company)
  return [...grouped.values()].sort((a,b) => a.name.localeCompare(b.name, 'es'))
}

app.get('/api/admin/difusion/settings', requireAdmin, (req, res) => res.json({
  databaseAvailable: Boolean(pool && databaseAvailable), sendEnabled: String(process.env.DIFFUSION_SEND_ENABLED || '').toLowerCase() === 'true',
  mailConfigured: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS), approvalEmail: process.env.DIFFUSION_APPROVAL_EMAIL || diffusionConfig.approvalEmail || 'uic@uic-campana.com.ar',
  pilotCompanyKey: PILOT_COMPANY_KEY, maintenanceContact: diffusionConfig.maintenanceContact
}))
app.get('/api/admin/difusion/companies', requireAdmin, async (_req, res, next) => { try { res.json(await buildDiffusionCompanies()) } catch (error) { next(error) } })

app.get('/api/admin/difusion/recipients', requireAdmin, requireDiffusionDatabase, async (_req, res, next) => {
  try { const result = await pool.query(`SELECT * FROM diffusion_recipients ORDER BY CASE source_type WHEN 'socio' THEN 0 WHEN 'convenio' THEN 1 ELSE 2 END, company_name, contact_name`); res.json(result.rows) } catch (error) { next(error) }
})
app.put('/api/admin/difusion/recipient-companies/toggle', requireAdmin, requireDiffusionDatabase, async (req, res, next) => {
  try {
    const sourceType=safeText(req.body.sourceType,30); const companyName=safeText(req.body.companyName,250); const enabled=Boolean(req.body.enabled)
    if (!['socio','convenio','manual'].includes(sourceType) || !companyName) return res.status(400).json({ error: 'Empresa inválida' })
    const result=await pool.query(`UPDATE diffusion_recipients SET enabled=CASE WHEN $1::boolean=TRUE THEN email_valid ELSE FALSE END, updated_at=NOW() WHERE source_type=$2 AND company_name=$3 RETURNING *`,[enabled,sourceType,companyName])
    if (!result.rows.length) return res.status(404).json({ error: 'Empresa no encontrada' })
    res.json(result.rows)
  } catch (error) { next(error) }
})
app.post('/api/admin/difusion/recipients', requireAdmin, requireDiffusionDatabase, async (req, res, next) => {
  try {
    const company = safeText(req.body.companyName,250); const contact = safeText(req.body.contactName,200); const email = safeText(req.body.email,250); const phone = safeText(req.body.phone,100)
    const requestedType=safeText(req.body.sourceType,30); const sourceType=['socio','convenio','manual'].includes(requestedType)?requestedType:'manual'
    if (!company) return res.status(400).json({ error: 'La empresa es obligatoria' })
    const emailValid = validEmail(email); const enabled = Boolean(req.body.enabled) && emailValid
    const sourceKey = `${sourceType}:manual:${crypto.randomUUID()}`
    const result = await pool.query(`INSERT INTO diffusion_recipients (source_key,source_type,company_name,contact_name,email,phone,enabled,email_valid,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [sourceKey,sourceType,company,contact,email,phone,enabled,emailValid,safeText(req.body.notes,500)])
    res.status(201).json(result.rows[0])
  } catch (error) { next(error) }
})
app.put('/api/admin/difusion/recipients/:id', requireAdmin, requireDiffusionDatabase, async (req, res, next) => {
  try {
    const id=safeId(req.params.id); if (!id) return res.status(400).json({ error: 'Destinatario inválido' })
    const company=safeText(req.body.companyName,250); const contact=safeText(req.body.contactName,200); const email=safeText(req.body.email,250); const phone=safeText(req.body.phone,100); const notes=safeText(req.body.notes,500)
    if (!company) return res.status(400).json({ error: 'La empresa es obligatoria' })
    const emailValid=validEmail(email); const enabled=Boolean(req.body.enabled) && emailValid
    const result=await pool.query(`UPDATE diffusion_recipients SET company_name=$1,contact_name=$2,email=$3,phone=$4,enabled=$5,email_valid=$6,notes=$7,updated_at=NOW() WHERE id=$8 RETURNING *`,[company,contact,email,phone,enabled,emailValid,notes,id])
    if (!result.rows[0]) return res.status(404).json({ error: 'Destinatario no encontrado' })
    res.json(result.rows[0])
  } catch (error) { next(error) }
})

const campaignUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 3 } })
app.post('/api/admin/difusion/campaigns', requireAdmin, requireDiffusionDatabase, campaignUpload.array('files',3), async (req, res, next) => {
  try {
    const companyKey=safeText(req.body.companyKey,160); if (companyKey !== PILOT_COMPANY_KEY) return res.status(403).json({ error: 'En v3.9.1 sólo Tecno Logisti-K SA está habilitada como empresa de prueba.' })
    const companyName=safeText(req.body.companyName,250); const benefitSlug=safeText(req.body.benefitSlug,180); const benefitTitle=safeText(req.body.benefitTitle,300)
    const originatorName=safeText(req.body.originatorName,200); const originatorEmail=safeText(req.body.originatorEmail,250)
    const subject=safeText(req.body.subject,300); const bodyMarkup=plainMarkup(req.body.bodyMarkup); const fontFamily=['Arial','Verdana','Tahoma','Georgia'].includes(req.body.fontFamily) ? req.body.fontFamily : 'Arial'; const fontSize=['small','normal','large'].includes(req.body.fontSize) ? req.body.fontSize : 'normal'
    if (!companyName || !benefitSlug || !benefitTitle || !subject || !bodyMarkup || !validEmail(originatorEmail)) return res.status(400).json({ error: 'Completá empresa, beneficio, asunto, contenido y un correo de origen válido.' })
    const allowed=new Set(['image/jpeg','image/png','application/pdf']); const files=req.files || []
    if (files.some(file => !allowed.has(file.mimetype) || !fileSignatureMatches(file))) return res.status(400).json({ error: 'Sólo se aceptan JPG, PNG y PDF válidos. El tipo real del archivo debe coincidir con su formato.' })
    const safety=assessCampaign(subject,bodyMarkup,files)
    await pool.query(`DELETE FROM diffusion_campaigns WHERE company_key=$1 AND benefit_slug=$2 AND status IN ('draft','pending','rejected','blocked')`,[companyKey,benefitSlug])
    const result=await pool.query(`INSERT INTO diffusion_campaigns (company_key,company_name,benefit_slug,benefit_title,originator_name,originator_email,subject,body_markup,font_family,font_size,status,safety_status,safety_notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,[companyKey,companyName,benefitSlug,benefitTitle,originatorName,originatorEmail,subject,bodyMarkup,fontFamily,fontSize,safety.status==='blocked'?'blocked':'draft',safety.status,safety.notes])
    for (const file of files) await pool.query(`INSERT INTO diffusion_campaign_files (campaign_id,filename,mime_type,size_bytes,file_data) VALUES ($1,$2,$3,$4,$5)`,[result.rows[0].id,safeText(file.originalname,250),file.mimetype,file.size,file.buffer])
    res.status(201).json({ ...result.rows[0], files: files.map(file => ({ filename:file.originalname,mimeType:file.mimetype,sizeBytes:file.size })) })
  } catch (error) { next(error) }
})

async function getCampaign(id) {
  const result=await pool.query('SELECT * FROM diffusion_campaigns WHERE id=$1',[id]); return result.rows[0] || null
}
async function cooldownFor(companyKey, benefitSlug) {
  const result=await pool.query(`SELECT next_allowed_at FROM diffusion_campaigns WHERE company_key=$1 AND benefit_slug=$2 AND status='sent' AND next_allowed_at IS NOT NULL ORDER BY sent_at DESC LIMIT 1`,[companyKey,benefitSlug])
  return result.rows[0]?.next_allowed_at || null
}
app.get('/api/admin/difusion/campaigns', requireAdmin, requireDiffusionDatabase, async (req,res,next) => {
  try { const status=safeText(req.query.status,30); const result=await pool.query(`SELECT c.*, COALESCE((SELECT json_agg(json_build_object('filename',f.filename,'mimeType',f.mime_type,'sizeBytes',f.size_bytes) ORDER BY f.id) FROM diffusion_campaign_files f WHERE f.campaign_id=c.id),'[]'::json) AS files FROM diffusion_campaigns c ${status ? 'WHERE c.status=$1' : ''} ORDER BY c.created_at DESC LIMIT 100`, status ? [status] : []); res.json(result.rows) } catch(error){ next(error) }
})
app.post('/api/admin/difusion/campaigns/:id/test', requireAdmin, requireDiffusionDatabase, async (req,res,next) => {
  try {
    const id=safeId(req.params.id); const campaign=id?await getCampaign(id):null; if(!campaign) return res.status(404).json({error:'Comunicación no encontrada'})
    if(campaign.safety_status==='blocked') return res.status(400).json({error:'El contenido fue bloqueado por el control automático y debe corregirse.'})
    const attachments=await campaignAttachments(id); await sendDiffusionMail({to:campaign.originator_email,subject:`[PRUEBA · NO ENVIADO A SOCIOS] ${campaign.subject}`,html:`<div style="background:#fff5cc;padding:12px;border:1px solid #e8c44a"><strong>PRUEBA DE DIFUSIÓN UIC</strong><br>Este envío es sólo para verificar cómo se verá la comunicación. No consume el cupo mensual y no fue enviado a socios.</div>${campaignEmailHtml(campaign)}`,attachments})
    const result=await pool.query(`UPDATE diffusion_campaigns SET test_sent_at=NOW(),updated_at=NOW() WHERE id=$1 RETURNING *`,[id]); res.json(result.rows[0])
  } catch(error){ next(error) }
})
app.post('/api/admin/difusion/campaigns/:id/request-approval', requireAdmin, requireDiffusionDatabase, async (req,res,next) => {
  try {
    const id=safeId(req.params.id); const campaign=id?await getCampaign(id):null; if(!campaign) return res.status(404).json({error:'Comunicación no encontrada'})
    if(campaign.safety_status==='blocked') return res.status(400).json({error:'El contenido fue bloqueado por seguridad.'})
    if(!campaign.test_sent_at) return res.status(400).json({error:'Primero enviá el correo de prueba al responsable de la empresa.'})
    const nextAllowed=await cooldownFor(campaign.company_key,campaign.benefit_slug); if(nextAllowed && new Date(nextAllowed)>new Date()) return res.status(409).json({error:`Este beneficio podrá volver a solicitar envío a partir del ${new Date(nextAllowed).toLocaleDateString('es-AR')}.`,nextAllowed})
    const approvalEmail=process.env.DIFFUSION_APPROVAL_EMAIL || diffusionConfig.approvalEmail || 'uic@uic-campana.com.ar'; const attachments=await campaignAttachments(id)
    await sendDiffusionMail({to:approvalEmail,subject:`[VALIDACIÓN PENDIENTE] ${campaign.company_name} · ${campaign.subject}`,html:`<div style="background:#e9f5fb;padding:12px;border:1px solid #52a8cf"><strong>VALIDACIÓN REQUERIDA</strong><br>La empresa ya recibió su prueba. Esta comunicación NO fue enviada a socios. Ingresá al Portal de Beneficios → Difusión de Beneficios → Validaciones para aprobar o rechazar.</div>${campaignEmailHtml(campaign)}`,attachments})
    const result=await pool.query(`UPDATE diffusion_campaigns SET status='pending',approval_requested_at=NOW(),updated_at=NOW() WHERE id=$1 RETURNING *`,[id]); res.json(result.rows[0])
  } catch(error){ next(error) }
})
app.post('/api/admin/difusion/campaigns/:id/reject', requireAdmin, requireDiffusionDatabase, async (req,res,next) => {
  try { const id=safeId(req.params.id); if(!id) return res.status(400).json({error:'Comunicación inválida'}); const result=await pool.query(`UPDATE diffusion_campaigns SET status='rejected',rejected_at=NOW(),safety_notes=$2,updated_at=NOW() WHERE id=$1 AND status='pending' RETURNING *`,[id,safeText(req.body.reason,500)||'Rechazada por validación administrativa.']); if(!result.rows[0]) return res.status(409).json({error:'La comunicación ya no está pendiente.'}); res.json(result.rows[0]) } catch(error){ next(error) }
})
app.post('/api/admin/difusion/campaigns/:id/approve', requireAdmin, requireDiffusionDatabase, async (req,res,next) => {
  try {
    if(String(req.body.confirm||'').trim().toUpperCase()!=='ENVIAR') return res.status(400).json({error:'Para evitar envíos accidentales escribí ENVIAR en la confirmación.'})
    const id=safeId(req.params.id); const campaign=id?await getCampaign(id):null; if(!campaign || campaign.status!=='pending') return res.status(409).json({error:'La comunicación no está pendiente de validación.'})
    if(campaign.safety_status==='blocked') return res.status(400).json({error:'El contenido está bloqueado por seguridad.'})
    const nextAllowed=await cooldownFor(campaign.company_key,campaign.benefit_slug); if(nextAllowed && new Date(nextAllowed)>new Date()) return res.status(409).json({error:`Este beneficio podrá volver a enviar a partir del ${new Date(nextAllowed).toLocaleDateString('es-AR')}.`,nextAllowed})
    const recipients=await pool.query(`SELECT email FROM diffusion_recipients WHERE enabled=TRUE AND email_valid=TRUE AND email<>'' ORDER BY company_name`)
    const origin=normalizeEmail(campaign.originator_email); const approvalEmail=process.env.DIFFUSION_APPROVAL_EMAIL || diffusionConfig.approvalEmail || 'uic@uic-campana.com.ar'
    const unique=[...new Set(recipients.rows.map(x=>normalizeEmail(x.email)).filter(email=>validEmail(email)&&email!==origin&&email!==normalizeEmail(approvalEmail)))]
    const attachments=await campaignAttachments(id); const html=campaignEmailHtml(campaign)
    // Regla UIC: el primer correo final siempre llega al responsable que originó la comunicación.
    await sendDiffusionMail({to:campaign.originator_email,subject:campaign.subject,html,attachments})
    // Recién después del primer envío satisfactorio se distribuye al padrón activo, siempre en CCO.
    await sendDiffusionMail({to:approvalEmail,bcc:unique,subject:campaign.subject,html,attachments})
    const sentAt=new Date(); const nextAllowedAt=addCalendarMonth(sentAt)
    const result=await pool.query(`UPDATE diffusion_campaigns SET status='sent',approved_at=NOW(),sent_at=$2,next_allowed_at=$3,recipient_count=$4,body_markup='',content_deleted_at=NOW(),updated_at=NOW() WHERE id=$1 RETURNING *`,[id,sentAt,nextAllowedAt,unique.length])
    await pool.query('DELETE FROM diffusion_campaign_files WHERE campaign_id=$1',[id])
    res.json({...result.rows[0],sentToOriginator:true,bccRecipients:unique.length})
  } catch(error){ next(error) }
})

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

try {
  await initializeDatabase()
  databaseAvailable = Boolean(pool)
} catch (error) {
  databaseAvailable = false
  console.error(`Neon no pudo inicializarse; el portal continuará con catálogo local y reintentará en las consultas (${error.code || error.message})`)
}
const server = app.listen(PORT, '0.0.0.0', () => console.log(`Beneficios UIC NUEVO v${VERSION} · ${GENERATION} · puerto ${PORT}`))
process.on('SIGTERM', async () => { server.close(); await pool?.end(); process.exit(0) })
