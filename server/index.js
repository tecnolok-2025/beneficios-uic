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
const GENERATION = 'BENEFICIOS_UIC_3985'
const BUILD_COMMIT = String(process.env.RENDER_GIT_COMMIT || '').slice(0, 12) || null
const PORT = Number(process.env.PORT || 10000)
const dist = path.join(root, 'dist')
const benefitsLogoBuffer = await fs.readFile(path.join(root, 'public', 'logo-beneficios-uic.png')).catch(() => null)
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
const diffusionConfig = await readJsonData('diffusion-config.json', { approvalEmail: 'tesoreria@uic-campana.com.ar', maintenanceContact: { name: 'María José Godoy (Majo)', phone: '3489 65 0104', email: 'tesoreria@uic-campana.com.ar' }, companyOverrides: {}, testCompanies: [], testRecipients: [] })
const PILOT_COMPANY_KEY = 'tecno-logisti-k-sa'
const TEST_RECIPIENTS = Array.isArray(diffusionConfig.testRecipients) ? diffusionConfig.testRecipients : []


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
function cookieValue(req,name){ return decodeURIComponent((req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(`${name}=`))?.slice(name.length+1)||'') }
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
const DIFFUSION_SEND_INTERVAL_MS = Math.max(45000, Number(process.env.DIFFUSION_SEND_INTERVAL_MS || 45000))
function argentinaDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone:'America/Argentina/Buenos_Aires', year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(new Date(date))
  const map=Object.fromEntries(parts.filter(p=>p.type!=='literal').map(p=>[p.type,p.value])); return `${map.year}-${map.month}-${map.day}`
}
function dateParts(value) { const [year,month,day]=String(value).slice(0,10).split('-').map(Number); return {year,month,day} }
function anchoredDate(year, month, day) { const last=new Date(Date.UTC(year,month,0)).getUTCDate(); return `${year}-${String(month).padStart(2,'0')}-${String(Math.min(day,last)).padStart(2,'0')}` }
function shiftMonth(year, month, delta) { const d=new Date(Date.UTC(year,month-1+delta,1)); return {year:d.getUTCFullYear(),month:d.getUTCMonth()+1} }
function monthlyCycle(anchorDate, today = argentinaDateString()) {
  const anchor=dateParts(anchorDate); const now=dateParts(today); const thisOccurrence=anchoredDate(now.year,now.month,anchor.day)
  if(today>=thisOccurrence){const next=shiftMonth(now.year,now.month,1);return {start:thisOccurrence,end:anchoredDate(next.year,next.month,anchor.day),anchorDay:anchor.day}}
  const prev=shiftMonth(now.year,now.month,-1);return {start:anchoredDate(prev.year,prev.month,anchor.day),end:thisOccurrence,anchorDay:anchor.day}
}
function argentinaMidnightUtc(dateString) { return new Date(`${dateString}T03:00:00.000Z`) }
async function benefitSlotStatus(companyKey, benefitSlug) {
  const result=await pool.query('SELECT * FROM diffusion_benefit_schedules WHERE company_key=$1 AND benefit_slug=$2',[companyKey,benefitSlug]); const schedule=result.rows[0]
  if(!schedule)return {allowed:true,anchorDate:null,currentStart:null,nextAllowed:null,usedThisCycle:false}
  const today=argentinaDateString(); const cycle=monthlyCycle(dateOnly(schedule.anchor_date),today); const last=schedule.last_authorized_at?argentinaDateString(schedule.last_authorized_at):null; const used=Boolean(last&&last>=cycle.start&&last<cycle.end)
  return {allowed:!used,anchorDate:dateOnly(schedule.anchor_date),currentStart:cycle.start,nextAllowed:cycle.end,usedThisCycle:used}
}
async function authorizeBenefitSlot(client, campaign) {
  const existing=(await client.query('SELECT * FROM diffusion_benefit_schedules WHERE company_key=$1 AND benefit_slug=$2 FOR UPDATE',[campaign.company_key,campaign.benefit_slug])).rows[0]
  const today=argentinaDateString()
  if(!existing){const next=monthlyCycle(today,today).end;await client.query(`INSERT INTO diffusion_benefit_schedules (company_key,benefit_slug,anchor_date,last_authorized_at,last_campaign_id,next_slot_at,updated_at) VALUES ($1,$2,$3,NOW(),$4,$5,NOW())`,[campaign.company_key,campaign.benefit_slug,today,campaign.id,next]);return {anchorDate:today,nextAllowed:next}}
  const cycle=monthlyCycle(dateOnly(existing.anchor_date),today); const last=existing.last_authorized_at?argentinaDateString(existing.last_authorized_at):null
  if(last&&last>=cycle.start&&last<cycle.end){const error=new Error(`Este beneficio ya utilizó su oportunidad del ciclo mensual actual. La próxima habilitación será el ${cycle.end.split('-').reverse().join('/')}.`);error.status=409;error.nextAllowed=cycle.end;throw error}
  await client.query(`UPDATE diffusion_benefit_schedules SET last_authorized_at=NOW(),last_campaign_id=$3,next_slot_at=$4,updated_at=NOW() WHERE company_key=$1 AND benefit_slug=$2`,[campaign.company_key,campaign.benefit_slug,campaign.id,cycle.end])
  return {anchorDate:dateOnly(existing.anchor_date),nextAllowed:cycle.end}
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
async function testModeEnabled() {
  // Seguridad fail-closed: ante cualquier duda o error, el sistema queda en PRUEBA.
  if (pool && databaseAvailable) {
    try {
      const result = await pool.query('SELECT test_mode_enabled FROM diffusion_mail_settings WHERE id=1')
      if (result.rows[0]) return result.rows[0].test_mode_enabled !== false
    } catch {}
  }
  return true
}
async function massDiffusionEnabled() {
  if (pool && databaseAvailable) {
    try {
      const result = await pool.query('SELECT mass_send_enabled FROM diffusion_mail_settings WHERE id=1')
      if (result.rows[0]) return Boolean(result.rows[0].mass_send_enabled)
    } catch {}
  }
  return String(process.env.DIFFUSION_MASS_SEND_ENABLED || '').toLowerCase() === 'true'
}
function normalizedTestRecipients() {
  const byEmail = new Map()
  for (const item of TEST_RECIPIENTS) {
    const email = normalizeEmail(item?.email)
    if (!validEmail(email) || byEmail.has(email)) continue
    byEmail.set(email, { id: null, company_name: safeText(item?.name, 220), contact_name: safeText(item?.contactName, 220), email, phone: safeText(item?.phone, 100), test_only: true })
  }
  return [...byEmail.values()]
}
function isAllowedTestRecipient(email) {
  const normalized = normalizeEmail(email)
  return normalizedTestRecipients().some(item => item.email === normalized)
}
function mailEncryptionKey() {
  return crypto.createHash('sha256').update(String(process.env.DIFFUSION_MAIL_SECRET || process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || 'uic-difusion-desarrollo')).digest()
}
function codeHash(value, scope = 'generic') {
  return crypto.createHmac('sha256', mailEncryptionKey()).update(`${scope}:${String(value || '')}`).digest('hex')
}
function sixDigitCode() { return String(crypto.randomInt(0, 1000000)).padStart(6, '0') }
function safeEqualText(a, b) {
  const aa=Buffer.from(String(a||'')); const bb=Buffer.from(String(b||'')); return aa.length===bb.length && crypto.timingSafeEqual(aa,bb)
}
function passwordHash(password) {
  const salt=crypto.randomBytes(16); const derived=crypto.scryptSync(String(password),salt,64)
  return `scrypt$${salt.toString('base64url')}$${derived.toString('base64url')}`
}
function verifyPassword(password, stored) {
  try { const [kind,saltText,hashText]=String(stored||'').split('$'); if(kind!=='scrypt') return false; const actual=crypto.scryptSync(String(password),Buffer.from(saltText,'base64url'),64); const expected=Buffer.from(hashText,'base64url'); return actual.length===expected.length && crypto.timingSafeEqual(actual,expected) } catch { return false }
}
function encryptMailSecret(value) {
  if (!value) return ''
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', mailEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`
}
function decryptMailSecret(value) {
  if (!value) return ''
  try {
    const [version, ivText, tagText, encryptedText] = String(value).split('.')
    if (version !== 'v1' || !ivText || !tagText || !encryptedText) return ''
    const decipher = crypto.createDecipheriv('aes-256-gcm', mailEncryptionKey(), Buffer.from(ivText, 'base64url'))
    decipher.setAuthTag(Buffer.from(tagText, 'base64url'))
    return Buffer.concat([decipher.update(Buffer.from(encryptedText, 'base64url')), decipher.final()]).toString('utf8')
  } catch { return '' }
}
async function diffusionMailSettings() {
  const fallback = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true').toLowerCase() !== 'false',
    username: process.env.SMTP_USER || '', password: process.env.SMTP_PASS || '',
    fromEmail: process.env.DIFFUSION_FROM_EMAIL || process.env.SMTP_USER || 'tesoreria@uic-campana.com.ar',
    fromName: process.env.DIFFUSION_FROM_NAME || 'Unión Industrial de Campana · Beneficios',
    testRecipient: process.env.DIFFUSION_TEST_RECIPIENT || '', massSendEnabled: String(process.env.DIFFUSION_MASS_SEND_ENABLED || '').toLowerCase()==='true', testModeEnabled: true
  }
  if (!pool || !databaseAvailable) return fallback
  try {
    const result = await pool.query('SELECT * FROM diffusion_mail_settings WHERE id=1'); const row=result.rows[0]; if(!row) return fallback
    const storedPassword=decryptMailSecret(row.smtp_password_encrypted)
    return { host:row.smtp_host||fallback.host, port:Number(row.smtp_port||fallback.port), secure:Boolean(row.smtp_secure), username:row.smtp_user||fallback.username,
      password:storedPassword||fallback.password, fromEmail:row.from_email||fallback.fromEmail, fromName:row.from_name||fallback.fromName,
      testRecipient:row.test_recipient||fallback.testRecipient, massSendEnabled:Boolean(row.mass_send_enabled), testModeEnabled:row.test_mode_enabled !== false }
  } catch { return fallback }
}
async function createMailer() {
  const config=await diffusionMailSettings(); if(!config.username||!config.password||!config.host||!config.port) return null
  return { transporter:nodemailer.createTransport({host:config.host,port:Number(config.port),secure:Boolean(config.secure),auth:{user:config.username,pass:config.password}}), config }
}
function campaignSubject(companyName) { return `Nuevo beneficio exclusivo UIC · ${safeText(companyName, 180)}` }
function unsubscribeToken(recipient) { return codeHash(`${recipient.id}:${normalizeEmail(recipient.email)}`, 'unsubscribe') }
function queueTrackingToken(recipient) { return codeHash(`${recipient.campaign_id}:${recipient.id}:${normalizeEmail(recipient.email)}`, 'diffusion-open') }
function queueUnsubscribeToken(recipient) { return codeHash(`${recipient.campaign_id}:${recipient.id}:${recipient.recipient_id||0}:${normalizeEmail(recipient.email)}`, 'diffusion-unsubscribe') }
function publicBaseUrl(req) { return String(process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/,'') }
const EMAIL_TEMPLATE_IDS = new Set(['institutional','gallery4','duo','imageLeft','imageRight','alternating','stacked','editorial'])
const EMAIL_BLOCK_KEYS = ['headline','intro','body','body2','closing']
function decodeBasicEntities(value='') {
  return String(value).replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'")
}
function escapeHtml(value='') { return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;') }
function sanitizeRichHtml(value='') {
  let source=String(value||'').replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\/\1\s*>/gi,'')
  const allowed=new Set(['p','br','strong','b','em','i','u','ul','ol','li','h2','h3','a','div'])
  const out=[]; const tokens=source.match(/<[^>]*>|[^<]+/g)||[]
  for(const token of tokens){
    if(!token.startsWith('<')){out.push(escapeHtml(decodeBasicEntities(token)));continue}
    const closing=/^<\s*\//.test(token); const match=token.match(/^<\s*\/?\s*([a-z0-9]+)/i); if(!match)continue
    let tag=match[1].toLowerCase(); if(!allowed.has(tag))continue; if(tag==='b')tag='strong'; if(tag==='i')tag='em'; if(tag==='div')tag='p'
    if(closing){if(tag!=='br')out.push(`</${tag}>`);continue}
    if(tag==='br'){out.push('<br>');continue}
    if(tag==='a'){
      const hrefMatch=token.match(/href\s*=\s*["']([^"']+)["']/i); const href=hrefMatch?.[1]||''
      if(/^https?:\/\//i.test(href)||/^mailto:/i.test(href)) out.push(`<a href="${escapeHtml(href)}" style="color:#087fad;text-decoration:underline">`); else out.push('<a>')
      continue
    }
    out.push(`<${tag}>`)
  }
  return out.join('').replace(/<p>\s*<\/p>/g,'').slice(0,18000)
}
function richToPlain(value='') { return decodeBasicEntities(String(value||'').replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>|<\/li>|<\/h[23]>/gi,'\n').replace(/<[^>]+>/g,' ')).replace(/[ \t]+/g,' ').replace(/\n\s+/g,'\n').trim() }
function sanitizeLayout(templateId, raw={}) {
  const id=EMAIL_TEMPLATE_IDS.has(templateId)?templateId:'institutional'; const blocks={}; const source=raw&&typeof raw==='object'&&raw.blocks&&typeof raw.blocks==='object'?raw.blocks:{}
  for(const key of EMAIL_BLOCK_KEYS) blocks[key]=sanitizeRichHtml(source[key]||'')
  const bannerText=safeText(raw?.bannerText||'BENEFICIOS EXCLUSIVOS PARA SOCIOS UIC',120)
  const companyDisplayName=safeText(raw?.companyDisplayName||'',180)
  const sourceSignature=raw&&typeof raw==='object'&&raw.signature&&typeof raw.signature==='object'?raw.signature:null
  const signature=sourceSignature?{name:safeText(sourceSignature.name,200),role:safeText(sourceSignature.role,160),email:validEmail(sourceSignature.email)?normalizeEmail(sourceSignature.email):safeText(sourceSignature.email,250),phone:safeText(sourceSignature.phone,100)}:null
  return {version:3,templateId:id,bannerText,companyDisplayName,signature,blocks}
}
function layoutPlainText(layout={}) { return EMAIL_BLOCK_KEYS.map(key=>richToPlain(layout?.blocks?.[key]||'')).filter(Boolean).join('\n\n').slice(0,12000) }
function fileAt(inlineFiles,position){return inlineFiles.find(f=>Number(f.position)===Number(position))||null}
function emailImage(file,{maxWidth=620,maxHeight=320,label=''}={}){
  if(!file)return ''
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:14px 0"><tr><td align="center"><img src="cid:${file.cid}" alt="${escapeHtml(label||file.filename||'Imagen del beneficio')}" width="${maxWidth}" style="display:block;width:100%;max-width:${maxWidth}px;max-height:${maxHeight}px;height:auto;object-fit:contain;border:0;border-radius:10px;margin:0 auto"></td></tr></table>`
}
function emailGallery(inlineFiles,positions,{columns=4,maxHeight=220}={}){
  const files=positions.map(pos=>fileAt(inlineFiles,pos)).filter(Boolean); if(!files.length)return ''
  const width=Math.floor(100/Math.max(columns,files.length)); const maxWidth=columns===4?145:columns===3?195:columns===2?295:620
  return `<table role="presentation" class="uic-gallery uic-gallery-${columns}" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0"><tr>${files.map((file,i)=>`<td width="${width}%" valign="top" align="center" style="padding:4px"><img src="cid:${file.cid}" alt="Figura ${i+1}" width="${maxWidth}" style="display:block;width:100%;max-width:${maxWidth}px;max-height:${maxHeight}px;height:auto;object-fit:contain;border:0;border-radius:8px;margin:0 auto"></td>`).join('')}</tr></table>`
}
function richSection(html,{pad='0 0 14px',muted=false}={}) { return html?`<div style="padding:${pad};color:${muted?'#496a7e':'#17384c'}">${html}</div>`:'' }
function splitSection(left,right){if(!left&&!right)return '';return `<table role="presentation" class="uic-stack" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0"><tr><td width="40%" valign="top" style="padding:6px 10px 6px 0">${left||''}</td><td width="60%" valign="top" style="padding:6px 0 6px 10px">${right||''}</td></tr></table>`}
function campaignLayoutHtml(campaign,inlineFiles=[]){
  const template=EMAIL_TEMPLATE_IDS.has(campaign.template_id)?campaign.template_id:'institutional'; const hasStructuredLayout=campaign.layout_json&&typeof campaign.layout_json==='object'&&campaign.layout_json.blocks&&typeof campaign.layout_json.blocks==='object'&&Object.values(campaign.layout_json.blocks).some(Boolean); const layout=hasStructuredLayout?campaign.layout_json:sanitizeLayout(template,{blocks:{headline:`<h2>${escapeHtml(campaign.benefit_title||campaign.subject)}</h2>`,body:markupToHtml(campaign.body_markup)}}); const b=layout.blocks||{}
  const headline=b.headline?`<div style="font-size:28px;line-height:1.15;font-weight:800;color:#063e68;margin:6px 0 18px">${b.headline}</div>`:''
  const intro=richSection(b.intro,{muted:true}); const body=richSection(b.body); const body2=richSection(b.body2); const closing=richSection(b.closing)
  if(template==='gallery4')return `${headline}${intro}${emailGallery(inlineFiles,[0,1,2,3],{columns:4,maxHeight:210})}${body}${closing}`
  if(template==='duo')return `${headline}${intro}${emailGallery(inlineFiles,[0,1],{columns:2,maxHeight:280})}${body}${closing}`
  if(template==='imageLeft')return `${headline}${intro}${splitSection(emailImage(fileAt(inlineFiles,0),{maxWidth:245,maxHeight:280}),body)}${emailImage(fileAt(inlineFiles,1),{maxWidth:360,maxHeight:230})}${closing}`
  if(template==='imageRight')return `${headline}${intro}${splitSection(body,emailImage(fileAt(inlineFiles,0),{maxWidth:245,maxHeight:280}))}${emailImage(fileAt(inlineFiles,1),{maxWidth:360,maxHeight:230})}${closing}`
  if(template==='alternating')return `${headline}${intro}${emailImage(fileAt(inlineFiles,0),{maxWidth:360,maxHeight:240})}${body}${emailImage(fileAt(inlineFiles,1),{maxWidth:360,maxHeight:240})}${body2}${emailGallery(inlineFiles,[2,3],{columns:2,maxHeight:220})}${closing}`
  if(template==='stacked')return `${headline}${intro}${[0,1,2,3].map(pos=>emailImage(fileAt(inlineFiles,pos),{maxWidth:360,maxHeight:300})).join('')}${body}${closing}`
  if(template==='editorial')return `${headline}${intro}${emailImage(fileAt(inlineFiles,0),{maxWidth:520,maxHeight:300})}${body}${emailGallery(inlineFiles,[1,2,3],{columns:3,maxHeight:190})}${body2}${closing}`
  return `${headline}${intro}${emailImage(fileAt(inlineFiles,0),{maxWidth:420,maxHeight:300})}${body}${closing}`
}
function campaignEmailHtml(campaign, inlineFiles = [], options = {}) {
  const opts=typeof options==='string'?{unsubscribeUrl:options}:options||{}
  const unsubscribeUrl=String(opts.unsubscribeUrl||'')
  const trackingUrl=String(opts.trackingUrl||'')
  const unsubscribePreview=Boolean(opts.unsubscribePreview)
  const family=['Arial','Verdana','Tahoma','Georgia'].includes(campaign.font_family)?campaign.font_family:'Arial'; const size=campaign.font_size==='large'?18:campaign.font_size==='small'?13:15
  const layout=campaign.layout_json&&typeof campaign.layout_json==='object'?campaign.layout_json:{}
  const signatureSource=layout.signature&&typeof layout.signature==='object'?layout.signature:null
  const sigName=safeText(signatureSource?signatureSource.name:(campaign.originator_name||campaign.company_name),200)
  const sigRole=safeText(signatureSource?signatureSource.role:campaign.originator_role,160)
  const sigEmail=safeText(signatureSource?signatureSource.email:campaign.originator_email,250)
  const sigPhone=safeText(signatureSource?signatureSource.phone:campaign.originator_phone,100)
  const signature=(sigName||sigRole||sigEmail||sigPhone)?`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;border-top:1px solid #d9e5eb"><tr><td style="padding-top:16px">${sigName?`<strong>${escapeHtml(sigName)}</strong>`:''}${sigRole?`<br><span>${escapeHtml(sigRole)}</span>`:''}${sigEmail?`<br>${validEmail(sigEmail)?`<a href="mailto:${escapeHtml(sigEmail)}" style="color:#087fad">${escapeHtml(sigEmail)}</a>`:`<span>${escapeHtml(sigEmail)}</span>`}`:''}${sigPhone?`<br><span>${escapeHtml(sigPhone)}</span>`:''}</td></tr></table>`:''
  const unsubscribe=unsubscribeUrl?`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;background:#f4f8fa;border:1px solid #d9e5eb;border-radius:10px"><tr><td align="center" style="padding:14px 16px;font-family:${family},sans-serif"><div style="font-size:12px;color:#60798b;margin-bottom:9px">¿Preferís no recibir futuras comunicaciones de Beneficios UIC?</div><a href="${escapeHtml(unsubscribeUrl)}" style="display:inline-block;background:#ffffff;border:1px solid #0b8fbd;border-radius:7px;padding:8px 13px;color:#087fad;font-size:12px;font-weight:700;text-decoration:none">NO QUIERO RECIBIR MÁS ESTOS CORREOS</a></td></tr></table>`:unsubscribePreview?`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;background:#f4f8fa;border:1px solid #d9e5eb;border-radius:10px"><tr><td align="center" style="padding:14px 16px;font-family:${family},sans-serif"><div style="font-size:12px;color:#60798b;margin-bottom:9px">¿Preferís no recibir futuras comunicaciones de Beneficios UIC?</div><span style="display:inline-block;background:#ffffff;border:1px solid #0b8fbd;border-radius:7px;padding:8px 13px;color:#087fad;font-size:12px;font-weight:700">NO QUIERO RECIBIR MÁS ESTOS CORREOS</span><div style="font-size:10px;color:#8095a1;margin-top:7px">En la prueba este botón es sólo una vista previa. En el envío real queda habilitado.</div></td></tr></table>`:''
  const content=campaignLayoutHtml(campaign,inlineFiles)
  const responsive=`<style>@media only screen and (max-width:520px){.uic-stack td{display:block!important;width:100%!important;padding:6px 0!important}.uic-gallery-4 td{display:inline-block!important;width:50%!important;box-sizing:border-box}.uic-gallery-3 td{display:inline-block!important;width:33.333%!important;box-sizing:border-box}}</style>`
  const bannerText=safeText(layout.bannerText||'BENEFICIOS EXCLUSIVOS PARA SOCIOS UIC',120)
  const displayCompany=safeText(layout.companyDisplayName||campaign.company_name,180)
  const logo=benefitsLogoBuffer?`<img src="cid:uic-benefits-brand" alt="Beneficios UIC" width="34" height="34" style="display:block;width:34px;height:34px;border:0;border-radius:8px">`:''
  const tracking=trackingUrl?`<img src="${escapeHtml(trackingUrl)}" alt="" width="1" height="1" style="display:block;width:1px;height:1px;opacity:0;border:0" aria-hidden="true">`:''
  return `${responsive}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#eef4f7" style="background:#eef4f7;margin:0;padding:0"><tr><td align="center" style="padding:18px 8px"><table role="presentation" width="680" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:680px;background:#fff;border-radius:14px;overflow:hidden"><tr><td style="background:#063e68;color:#fff;padding:9px 16px 9px 22px;font-family:${family},sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="font-size:12px;font-weight:700;letter-spacing:1.2px;color:#fff">${escapeHtml(bannerText)}</td><td width="42" align="right" valign="middle">${logo}</td></tr></table></td></tr><tr><td style="padding:24px 26px 8px;font-family:${family},sans-serif;font-size:${size}px;line-height:1.55;color:#17384c"><strong style="font-size:21px;color:#063e68">UNIÓN INDUSTRIAL DE CAMPANA</strong><br><span style="font-size:12px;color:#6b8290">Beneficios que fortalecen vínculos</span><div style="height:3px;background:#f47a20;width:54px;margin:14px 0 18px"></div><div style="font-size:13px;font-weight:700;color:#087fad;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">${escapeHtml(displayCompany)}</div>${content}${signature}${unsubscribe}<p style="font-size:11px;color:#718895;margin:24px 0 6px;border-top:1px solid #e3ebef;padding-top:14px">Comunicación emitida a través del Portal de Beneficios de la Unión Industrial de Campana. Las condiciones particulares deberán confirmarse con la empresa prestadora.</p>${tracking}</td></tr></table></td></tr></table>`
}
async function campaignMedia(campaignId) {
  const result=await pool.query('SELECT id,filename,mime_type,file_data,placement,position FROM diffusion_campaign_files WHERE campaign_id=$1 ORDER BY placement DESC, position, id',[campaignId])
  const inlineFiles=result.rows.filter(r=>r.placement==='inline').map((r,i)=>({filename:r.filename,content:r.file_data,contentType:r.mime_type,cid:`uic-inline-${campaignId}-${r.id}-${i}`,contentDisposition:'inline',position:Number(r.position||0)}))
  const attachments=result.rows.filter(r=>r.placement!=='inline').map(r=>({filename:r.filename,content:r.file_data,contentType:r.mime_type}))
  return {inlineFiles,attachments,all:[...inlineFiles,...attachments]}
}
async function sendDiffusionMail({to, subject, html, attachments=[]}) {
  const mailer=await createMailer(); if(!mailer){const error=new Error('La casilla emisora todavía no está configurada o no pudo autenticarse.');error.status=503;throw error}
  const from=mailer.config.fromName?`"${mailer.config.fromName.replace(/["<>]/g,'')}" <${mailer.config.fromEmail}>`:mailer.config.fromEmail
  const brandAttachment=benefitsLogoBuffer?{filename:'beneficios-uic.png',content:benefitsLogoBuffer,contentType:'image/png',cid:'uic-benefits-brand',contentDisposition:'inline'}:null
  return mailer.transporter.sendMail({from,to,subject,html,attachments:brandAttachment?[brandAttachment,...attachments]:attachments})
}

function backgroundBaseUrl() { return String(process.env.PUBLIC_BASE_URL || 'https://beneficios-uic.onrender.com').replace(/\/$/,'') }
async function buildQueueRecipients(campaign, massEnabled, testMode = true) {
  const origin=normalizeEmail(campaign.originator_email); const approval=normalizeEmail(process.env.DIFFUSION_APPROVAL_EMAIL||diffusionConfig.approvalEmail||'tesoreria@uic-campana.com.ar')
  const byEmail=new Map()
  // Modo PRUEBA o masivo deshabilitado: lista blanca cerrada de exactamente los destinos de control.
  if(testMode || !massEnabled){
    for(const control of normalizedTestRecipients()){
      const dbRow=(await pool.query('SELECT id,company_name,contact_name,email,phone FROM diffusion_recipients WHERE lower(email)=lower($1) ORDER BY id LIMIT 1',[control.email])).rows[0]
      byEmail.set(control.email,dbRow||control)
    }
    return [...byEmail.values()]
  }
  const rows=(await pool.query(`SELECT id,company_name,contact_name,email,phone FROM diffusion_recipients WHERE enabled=TRUE AND email_valid=TRUE AND email<>'' AND opted_out_at IS NULL ORDER BY company_name,id`)).rows
  for(const row of rows){const email=normalizeEmail(row.email);if(validEmail(email)&&!byEmail.has(email))byEmail.set(email,row)}
  for(const control of normalizedTestRecipients()) if(!byEmail.has(control.email)) byEmail.set(control.email,control)
  // En modo general evitamos duplicar el correo de origen y el correo de aprobación. En PRUEBA no se filtran: la lista blanca manda.
  byEmail.delete(origin)
  byEmail.delete(approval)
  return [...byEmail.values()]
}
async function queueCampaign(client, campaign, recipients, nextAllowed) {
  await client.query('DELETE FROM diffusion_campaign_queue_recipients WHERE campaign_id=$1',[campaign.id])
  for(const recipient of recipients){const email=normalizeEmail(recipient.email);if(!validEmail(email))continue;await client.query(`INSERT INTO diffusion_campaign_queue_recipients (campaign_id,recipient_id,email,company_name,contact_name,status) VALUES ($1,$2,$3,$4,$5,'pending') ON CONFLICT (campaign_id,email) DO NOTHING`,[campaign.id,recipient.id||null,email,recipient.company_name||'',recipient.contact_name||''])}
  const total=(await client.query(`SELECT COUNT(*)::int AS count FROM diffusion_campaign_queue_recipients WHERE campaign_id=$1`,[campaign.id])).rows[0].count
  const result=await client.query(`UPDATE diffusion_campaigns SET status='queued',approved_at=NOW(),next_allowed_at=$2,total_recipients=$3,sent_count=0,failed_count=0,recipient_count=0,queue_started_at=NULL,completed_at=NULL,cancel_requested_at=NULL,cancelled_at=NULL,last_progress_at=NOW(),queue_note='En cola de distribución',updated_at=NOW() WHERE id=$1 RETURNING *`,[campaign.id,argentinaMidnightUtc(nextAllowed),total])
  return result.rows[0]
}
async function finishCancelledCampaign(id) {
  await pool.query(`UPDATE diffusion_campaign_queue_recipients SET status='cancelled',updated_at=NOW() WHERE campaign_id=$1 AND status IN ('pending','sending')`,[id])
  const result=await pool.query(`UPDATE diffusion_campaigns SET status='cancelled',cancelled_at=NOW(),completed_at=NOW(),recipient_count=sent_count,queue_note='Cancelado por el usuario. La oportunidad mensual ya fue consumida.',body_markup='',content_deleted_at=NOW(),updated_at=NOW() WHERE id=$1 RETURNING *`,[id])
  await pool.query('DELETE FROM diffusion_campaign_files WHERE campaign_id=$1',[id]); return result.rows[0]
}
let diffusionQueueBusy=false
async function processDiffusionQueue() {
  if(diffusionQueueBusy||!pool||!databaseAvailable)return
  diffusionQueueBusy=true
  try{
    const campaign=(await pool.query(`SELECT * FROM diffusion_campaigns WHERE status IN ('sending','queued') ORDER BY CASE WHEN status='sending' THEN 0 ELSE 1 END,approved_at,id LIMIT 1`)).rows[0]
    if(!campaign)return
    if(campaign.cancel_requested_at){await finishCancelledCampaign(campaign.id);return}
    if(campaign.status==='queued')await pool.query(`UPDATE diffusion_campaigns SET status='sending',queue_started_at=COALESCE(queue_started_at,NOW()),queue_note='Enviando',last_progress_at=NOW(),updated_at=NOW() WHERE id=$1`,[campaign.id])
    const fresh=await getCampaign(campaign.id);if(fresh.cancel_requested_at){await finishCancelledCampaign(campaign.id);return}
    const recipient=(await pool.query(`SELECT * FROM diffusion_campaign_queue_recipients WHERE campaign_id=$1 AND status='pending' ORDER BY id LIMIT 1`,[campaign.id])).rows[0]
    if(!recipient){await pool.query(`UPDATE diffusion_campaigns SET status='sent',sent_at=NOW(),completed_at=NOW(),recipient_count=sent_count,queue_note=CASE WHEN failed_count>0 THEN 'Finalizado con algunos errores' ELSE 'Envío finalizado' END,body_markup='',content_deleted_at=NOW(),updated_at=NOW() WHERE id=$1`,[campaign.id]);await pool.query('DELETE FROM diffusion_campaign_files WHERE campaign_id=$1',[campaign.id]);return}
    // Cinturón de seguridad final: aunque una campaña vieja hubiese quedado en cola, Modo PRUEBA bloquea cualquier correo fuera de la lista blanca antes del SMTP.
    if(await testModeEnabled() && !isAllowedTestRecipient(recipient.email)){
      await pool.query(`UPDATE diffusion_campaign_queue_recipients SET status='cancelled',error_text='Bloqueado por Modo PRUEBA de seguridad.',updated_at=NOW() WHERE id=$1`,[recipient.id])
      await pool.query(`UPDATE diffusion_campaigns SET last_progress_at=NOW(),queue_note='Modo PRUEBA activo · destinatarios externos bloqueados',updated_at=NOW() WHERE id=$1`,[campaign.id])
      return
    }
    await pool.query(`UPDATE diffusion_campaign_queue_recipients SET status='sending',attempts=attempts+1,updated_at=NOW() WHERE id=$1`,[recipient.id])
    try{
      const latest=await getCampaign(campaign.id);if(latest.cancel_requested_at){await pool.query(`UPDATE diffusion_campaign_queue_recipients SET status='pending',updated_at=NOW() WHERE id=$1`,[recipient.id]);await finishCancelledCampaign(campaign.id);return}
      const media=await campaignMedia(campaign.id);let unsubscribe='';if(recipient.recipient_id){unsubscribe=`${backgroundBaseUrl()}/api/difusion/unsubscribe?c=${campaign.id}&q=${recipient.id}&id=${recipient.recipient_id}&token=${encodeURIComponent(queueUnsubscribeToken(recipient))}`}
      const tracking=`${backgroundBaseUrl()}/api/difusion/open.gif?c=${campaign.id}&q=${recipient.id}&token=${encodeURIComponent(queueTrackingToken(recipient))}`
      const testBanner=await testModeEnabled()?'<div style="background:#fff5cc;padding:12px;border:1px solid #e3bd3f;color:#5c4a12"><strong>MODO PRUEBA · DISTRIBUCIÓN CONTROLADA</strong><br>Este correo fue autorizado dentro del circuito de prueba UIC. El padrón general de socios permanece bloqueado.</div>':''
      await sendDiffusionMail({to:recipient.email,subject:latest.subject,html:`${testBanner}${campaignEmailHtml(latest,media.inlineFiles,{unsubscribeUrl:unsubscribe,trackingUrl:tracking})}`,attachments:media.all})
      await pool.query(`UPDATE diffusion_campaign_queue_recipients SET status='sent',sent_at=NOW(),updated_at=NOW() WHERE id=$1`,[recipient.id]);await pool.query(`UPDATE diffusion_campaigns SET sent_count=sent_count+1,recipient_count=sent_count+1,last_progress_at=NOW(),queue_note='Enviando',updated_at=NOW() WHERE id=$1`,[campaign.id])
    }catch(error){await pool.query(`UPDATE diffusion_campaign_queue_recipients SET status='failed',failed_at=NOW(),error_text=$2,updated_at=NOW() WHERE id=$1`,[recipient.id,safeText(error.message,500)]);await pool.query(`UPDATE diffusion_campaigns SET failed_count=failed_count+1,last_progress_at=NOW(),queue_note='Enviando · se registró un error individual',updated_at=NOW() WHERE id=$1`,[campaign.id])}
  }finally{diffusionQueueBusy=false}
}
function queueEtaSeconds(remainingRecipients) { return Math.max(0,Number(remainingRecipients)||0) * Math.ceil(DIFFUSION_SEND_INTERVAL_MS/1000) }
async function monitorPayload(companyKey) {
  const active=(await pool.query(`SELECT id,company_key,company_name,benefit_slug,benefit_title,status,approved_at,queue_started_at,completed_at,cancel_requested_at,cancelled_at,sent_count,failed_count,total_recipients,next_allowed_at,queue_note FROM diffusion_campaigns WHERE status IN ('queued','sending') ORDER BY CASE WHEN status='sending' THEN 0 ELSE 1 END,approved_at,id`)).rows
  let ahead=0; const metrics=new Map(); let queueNumber=0
  for(const row of active){const remaining=Math.max(0,Number(row.total_recipients||0)-Number(row.sent_count||0)-Number(row.failed_count||0));if(row.status==='sending'){metrics.set(String(row.id),{queuePosition:0,estimatedStartAt:new Date().toISOString(),estimatedFinishAt:new Date(Date.now()+queueEtaSeconds(remaining)*1000).toISOString(),remaining})}else{queueNumber+=1;metrics.set(String(row.id),{queuePosition:queueNumber,estimatedStartAt:new Date(Date.now()+queueEtaSeconds(ahead)*1000).toISOString(),estimatedFinishAt:new Date(Date.now()+queueEtaSeconds(ahead+remaining)*1000).toISOString(),remaining})}ahead+=remaining}
  const campaigns=(await pool.query(`SELECT c.id,c.company_key,c.company_name,c.benefit_slug,c.benefit_title,c.status,c.approved_at,c.queue_started_at,c.completed_at,c.cancel_requested_at,c.cancelled_at,c.sent_count,c.failed_count,c.total_recipients,c.next_allowed_at,c.queue_note,c.created_at,
    COALESCE((SELECT COUNT(*)::int FROM diffusion_campaign_queue_recipients q WHERE q.campaign_id=c.id AND q.first_opened_at IS NOT NULL),0) AS opened_recipients,
    COALESCE((SELECT SUM(q.open_count)::int FROM diffusion_campaign_queue_recipients q WHERE q.campaign_id=c.id),0) AS total_opens,
    COALESCE((SELECT COUNT(*)::int FROM diffusion_campaign_queue_recipients q WHERE q.campaign_id=c.id AND q.unsubscribed_at IS NOT NULL),0) AS unsubscribed_count,
    (SELECT MAX(q.last_opened_at) FROM diffusion_campaign_queue_recipients q WHERE q.campaign_id=c.id) AS last_opened_at
    FROM diffusion_campaigns c WHERE c.company_key=$1 AND c.status IN ('queued','sending','sent','cancelled') ORDER BY COALESCE(c.approved_at,c.created_at) DESC LIMIT 20`,[companyKey])).rows.map(row=>({...row,open_rate:Number(row.sent_count||0)>0?Math.round(Number(row.opened_recipients||0)*10000/Number(row.sent_count||0))/100:0,...(metrics.get(String(row.id))||{queuePosition:null,estimatedStartAt:null,estimatedFinishAt:null,remaining:0})}))
  const today=argentinaDateString()
  const schedules=(await pool.query(`SELECT company_key,benefit_slug,anchor_date,last_authorized_at,last_campaign_id,next_slot_at FROM diffusion_benefit_schedules WHERE company_key=$1 ORDER BY benefit_slug`,[companyKey])).rows.map(row=>{const anchor=dateOnly(row.anchor_date);const cycle=monthlyCycle(anchor,today);const last=row.last_authorized_at?argentinaDateString(row.last_authorized_at):null;const used=Boolean(last&&last>=cycle.start&&last<cycle.end);return {...row,anchor_date:anchor,next_slot_at:used?cycle.end:cycle.start,current_cycle_start:cycle.start,current_cycle_end:cycle.end,available_now:!used,next_available_at:used?cycle.end:today}})
  return {campaigns,schedules,sendIntervalSeconds:Math.ceil(DIFFUSION_SEND_INTERVAL_MS/1000),generatedAt:new Date().toISOString()}
}
const COMPANY_COOKIE='uic_diffusion_company'
function createCompanySession(account) {
  const payload=Buffer.from(JSON.stringify({id:account.id,companyKey:account.company_key,email:normalizeEmail(account.email),exp:Date.now()+8*60*60*1000})).toString('base64url')
  const sig=crypto.createHmac('sha256',String(process.env.SESSION_SECRET||process.env.ADMIN_PASSWORD||'uic-session')).update(payload).digest('base64url')
  return `${payload}.${sig}`
}
function companySession(req) {
  try { const raw=cookieValue(req,COMPANY_COOKIE); if(!raw) return null; const [payload,sig]=raw.split('.'); const expected=crypto.createHmac('sha256',String(process.env.SESSION_SECRET||process.env.ADMIN_PASSWORD||'uic-session')).update(payload).digest('base64url'); if(!safeEqualText(sig,expected)) return null; const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8')); return data.exp>Date.now()?data:null } catch { return null }
}
function requireCompany(req,res,next){const session=companySession(req);if(!session)return res.status(401).json({error:'Ingresá con la cuenta de tu empresa.'});req.companySession=session;next()}
function requireDiffusionActor(req,res,next){if(isAdmin(req)){req.diffusionActor={type:'admin'};return next()}const session=companySession(req);if(session){req.companySession=session;req.diffusionActor={type:'company',companyKey:session.companyKey,email:session.email};return next()}return res.status(401).json({error:'Acceso requerido'})}
function actorCanUseCompany(req,companyKey){return req.diffusionActor?.type==='admin'||req.diffusionActor?.companyKey===companyKey}
function campaignOwnedByActor(req,campaign){return req.diffusionActor?.type==='admin'||(req.diffusionActor?.type==='company'&&req.diffusionActor.companyKey===campaign.company_key&&normalizeEmail(req.diffusionActor.email)===normalizeEmail(campaign.originator_email))}


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
  const items=await listBenefits(true); const grouped=new Map()
  for(const item of items){
    const name=String(diffusionConfig.companyOverrides?.[item.slug]||item.partner||item.title||'Empresa sin identificar').trim(); const key=slugify(name)||item.slug
    if(!grouped.has(key)) grouped.set(key,{key,name,contactName:'',email:'',phone:'',role:'',contacts:[],testMode:false,benefits:[]})
    const company=grouped.get(key)
    const rawContacts=[...(item.companyContacts||[])]
    for(const c of rawContacts){const email=normalizeEmail(c.email); if((c.name||email||c.phone)&&!company.contacts.some(x=>normalizeEmail(x.email)===email&&String(x.name||'')===String(c.name||''))) company.contacts.push({name:c.name||'',role:c.role||'',email:c.email||'',phone:c.phone||''})}
    const first=company.contacts.find(c=>validEmail(c.email))||company.contacts[0]; if(first){company.contactName=first.name||company.contactName;company.email=first.email||company.email;company.phone=first.phone||company.phone;company.role=first.role||company.role}
    company.benefits.push({id:item.id,slug:item.slug,title:item.title,category:item.category,summary:item.summary})
  }
  for(const seed of diffusionConfig.testCompanies||[]){ const company={contacts:[{name:seed.contactName||'',role:seed.role||'',email:seed.email||'',phone:seed.phone||''}],...seed}; grouped.set(seed.key,company) }
  if(pool&&databaseAvailable){
    try{
      const recipients=await pool.query(`SELECT company_name,contact_name,email,phone FROM diffusion_recipients WHERE email<>'' ORDER BY id`)
      for(const row of recipients.rows){const key=slugify(row.company_name); const company=grouped.get(key); if(!company) continue; if(!company.contacts.some(c=>normalizeEmail(c.email)===normalizeEmail(row.email))) company.contacts.push({name:row.contact_name||'',role:'',email:row.email||'',phone:row.phone||''})}
    }catch{}
  }
  return [...grouped.values()].map(company=>{const allowed=authorizedCompanyEmails(company);const first=company.contacts.find(c=>normalizeEmail(c.email)===allowed[0]);return {...company,email:first?.email||'',contactName:first?.name||company.contactName||'',phone:first?.phone||company.phone||'',role:first?.role||company.role||'',hasRegisteredEmail:allowed.length>0}}).sort((a,b)=>a.name.localeCompare(b.name,'es'))
}
async function findDiffusionCompany(companyKey){ return (await buildDiffusionCompanies()).find(c=>c.key===companyKey)||null }
function authorizedCompanyEmails(company){ const institutional=new Set(['uic@uic-campana.com.ar']); return [...new Set((company?.contacts||[]).map(c=>normalizeEmail(c.email)).filter(email=>validEmail(email)&&!institutional.has(email)))] }


const companyAuthLimit=rateLimit({windowMs:15*60*1000,limit:20,standardHeaders:true,legacyHeaders:false})
app.get('/api/difusion/companies', async (_req,res,next)=>{
  try{const companies=(await buildDiffusionCompanies()).filter(c=>!c.testMode);res.json(companies.map(c=>({key:c.key,name:c.name,benefitCount:c.benefits.length,benefits:c.benefits,hasRegisteredEmail:c.hasRegisteredEmail})))}catch(error){next(error)}
})
app.get('/api/difusion/company/me', async (req,res,next)=>{
  try{const session=companySession(req);if(!session)return res.json({authenticated:false});if(!pool||!databaseAvailable)return maintenanceResponse(res);const result=await pool.query('SELECT id,company_key,company_name,email,active,verified_at,last_login_at FROM diffusion_company_accounts WHERE id=$1 AND active=TRUE',[session.id]);if(!result.rows[0])return res.json({authenticated:false});res.json({authenticated:true,account:result.rows[0]})}catch(error){next(error)}
})
app.post('/api/difusion/company/register/request',companyAuthLimit,requireDiffusionDatabase,async(req,res,next)=>{
  try{
    const companyKey=safeText(req.body.companyKey,180);const email=normalizeEmail(req.body.email);const company=await findDiffusionCompany(companyKey)
    if(!company)return res.status(404).json({error:'Empresa no encontrada.'})
    const allowed=authorizedCompanyEmails(company);if(!allowed.length)return res.status(409).json({code:'NO_EMAIL',error:'Esta empresa no tiene un correo habilitado para registrarse. Por favor comuníquese con Administración UIC para incorporar o corregir el correo.'})
    if(!validEmail(email)||!allowed.includes(email))return res.status(403).json({code:'EMAIL_MISMATCH',error:'El correo ingresado no coincide con el correo registrado para esta empresa. Por favor verifique el dato o comuníquese con Administración UIC.'})
    const existing=await pool.query('SELECT id,active,verified_at FROM diffusion_company_accounts WHERE company_key=$1 AND email=$2',[companyKey,email]);if(existing.rows[0]?.active&&existing.rows[0]?.verified_at)return res.status(409).json({code:'ALREADY_REGISTERED',error:'Esta cuenta ya se encuentra registrada. Utilice Ingresar u Olvidé mi contraseña.'})
    const code=sixDigitCode();const hash=codeHash(code,`register:${companyKey}:${email}`);const expires=new Date(Date.now()+15*60*1000)
    await pool.query(`INSERT INTO diffusion_company_accounts (company_key,company_name,email,register_code_hash,register_code_expires_at,updated_at) VALUES ($1,$2,$3,$4,$5,NOW()) ON CONFLICT (company_key,email) DO UPDATE SET company_name=EXCLUDED.company_name,register_code_hash=EXCLUDED.register_code_hash,register_code_expires_at=EXCLUDED.register_code_expires_at,updated_at=NOW()`,[companyKey,company.name,email,hash,expires])
    await sendDiffusionMail({to:email,subject:`Código de registro · Difusión de Beneficios UIC · ${company.name}`,html:`<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#17384c"><h2>Registro de empresa · Difusión de Beneficios UIC</h2><p>Se solicitó registrar el acceso de <strong>${safeText(company.name,250)}</strong>.</p><p>Su código de verificación es:</p><div style="font-size:34px;font-weight:700;letter-spacing:8px;background:#eef7fb;padding:18px;text-align:center;border-radius:10px">${code}</div><p>El código vence en 15 minutos. Si usted no inició este proceso, ignore este mensaje.</p></div>`})
    res.json({sent:true,expiresMinutes:15})
  }catch(error){next(error)}
})
app.post('/api/difusion/company/register/verify',companyAuthLimit,requireDiffusionDatabase,async(req,res,next)=>{
  try{
    const companyKey=safeText(req.body.companyKey,180);const email=normalizeEmail(req.body.email);const code=safeText(req.body.code,12);const password=String(req.body.password||'')
    if(!/^\d{6}$/.test(code))return res.status(400).json({error:'Ingresá el código de 6 dígitos recibido por correo.'});if(password.length<8)return res.status(400).json({error:'La contraseña debe tener al menos 8 caracteres.'})
    const result=await pool.query('SELECT * FROM diffusion_company_accounts WHERE company_key=$1 AND email=$2',[companyKey,email]);const account=result.rows[0];if(!account||!account.register_code_hash||!account.register_code_expires_at||new Date(account.register_code_expires_at)<=new Date()||!safeEqualText(account.register_code_hash,codeHash(code,`register:${companyKey}:${email}`)))return res.status(400).json({error:'El código es incorrecto o venció. Solicite uno nuevo.'})
    const updated=await pool.query(`UPDATE diffusion_company_accounts SET password_hash=$1,active=TRUE,verified_at=NOW(),register_code_hash='',register_code_expires_at=NULL,last_login_at=NOW(),updated_at=NOW() WHERE id=$2 RETURNING *`,[passwordHash(password),account.id]);const saved=updated.rows[0]
    res.cookie(COMPANY_COOKIE,createCompanySession(saved),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',maxAge:28800000,path:'/'}).json({authenticated:true,companyKey:saved.company_key,email:saved.email})
  }catch(error){next(error)}
})
app.post('/api/difusion/company/login',companyAuthLimit,requireDiffusionDatabase,async(req,res,next)=>{
  try{const companyKey=safeText(req.body.companyKey,180);const email=normalizeEmail(req.body.email);const password=String(req.body.password||'');const result=await pool.query('SELECT * FROM diffusion_company_accounts WHERE company_key=$1 AND email=$2 AND active=TRUE',[companyKey,email]);const account=result.rows[0];if(!account||!verifyPassword(password,account.password_hash))return res.status(401).json({error:'Empresa, correo o contraseña incorrectos.'});await pool.query('UPDATE diffusion_company_accounts SET last_login_at=NOW(),updated_at=NOW() WHERE id=$1',[account.id]);res.cookie(COMPANY_COOKIE,createCompanySession(account),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',maxAge:28800000,path:'/'}).json({authenticated:true,companyKey:account.company_key,email:account.email})}catch(error){next(error)}
})
app.post('/api/difusion/company/forgot/request',companyAuthLimit,requireDiffusionDatabase,async(req,res,next)=>{
  try{const companyKey=safeText(req.body.companyKey,180);const email=normalizeEmail(req.body.email);const company=await findDiffusionCompany(companyKey);if(!company)return res.status(404).json({error:'Empresa no encontrada.'});const allowed=authorizedCompanyEmails(company);if(!allowed.length)return res.status(409).json({code:'NO_EMAIL',error:'Esta empresa no tiene un correo habilitado para recuperar acceso. Comuníquese con Administración UIC.'});if(!allowed.includes(email))return res.status(403).json({error:'El correo ingresado no coincide con el registrado para esta empresa. Comuníquese con Administración UIC si necesita actualizarlo.'});const result=await pool.query('SELECT * FROM diffusion_company_accounts WHERE company_key=$1 AND email=$2 AND active=TRUE',[companyKey,email]);const account=result.rows[0];if(!account)return res.status(404).json({error:'No existe una cuenta activa con ese correo. Utilice Registrarme.'});const code=sixDigitCode();const hash=codeHash(code,`reset:${companyKey}:${email}`);const expires=new Date(Date.now()+15*60*1000);await pool.query('UPDATE diffusion_company_accounts SET reset_code_hash=$1,reset_code_expires_at=$2,updated_at=NOW() WHERE id=$3',[hash,expires,account.id]);await sendDiffusionMail({to:email,subject:`Recuperación de contraseña · Difusión UIC · ${company.name}`,html:`<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#17384c"><h2>Recuperación de contraseña</h2><p>Su código temporal para <strong>${safeText(company.name,250)}</strong> es:</p><div style="font-size:34px;font-weight:700;letter-spacing:8px;background:#eef7fb;padding:18px;text-align:center;border-radius:10px">${code}</div><p>El código vence en 15 minutos. Luego deberá crear una nueva contraseña.</p></div>`});res.json({sent:true,expiresMinutes:15})}catch(error){next(error)}
})
app.post('/api/difusion/company/forgot/reset',companyAuthLimit,requireDiffusionDatabase,async(req,res,next)=>{
  try{const companyKey=safeText(req.body.companyKey,180);const email=normalizeEmail(req.body.email);const code=safeText(req.body.code,12);const password=String(req.body.password||'');if(!/^\d{6}$/.test(code)||password.length<8)return res.status(400).json({error:'Ingresá el código de 6 dígitos y una contraseña de al menos 8 caracteres.'});const result=await pool.query('SELECT * FROM diffusion_company_accounts WHERE company_key=$1 AND email=$2 AND active=TRUE',[companyKey,email]);const account=result.rows[0];if(!account||!account.reset_code_hash||!account.reset_code_expires_at||new Date(account.reset_code_expires_at)<=new Date()||!safeEqualText(account.reset_code_hash,codeHash(code,`reset:${companyKey}:${email}`)))return res.status(400).json({error:'El código es incorrecto o venció.'});await pool.query(`UPDATE diffusion_company_accounts SET password_hash=$1,reset_code_hash='',reset_code_expires_at=NULL,updated_at=NOW() WHERE id=$2`,[passwordHash(password),account.id]);res.json({reset:true})}catch(error){next(error)}
})
app.post('/api/difusion/company/logout',(_req,res)=>res.clearCookie(COMPANY_COOKIE,{path:'/'}).json({authenticated:false}))
app.get('/api/difusion/company/settings',requireCompany,async(_req,res)=>{const mail=await diffusionMailSettings();res.json({mailConfigured:Boolean(mail.username&&mail.password),fromEmail:mail.fromEmail,maintenanceContact:diffusionConfig.maintenanceContact})})
app.get('/api/difusion/company/dashboard',requireCompany,requireDiffusionDatabase,async(req,res,next)=>{
  try{const company=await findDiffusionCompany(req.companySession.companyKey);if(!company)return res.status(404).json({error:'Empresa no encontrada.'});const account=await pool.query('SELECT company_name,email FROM diffusion_company_accounts WHERE id=$1 AND active=TRUE',[req.companySession.id]);if(!account.rows[0])return res.status(401).json({error:'Cuenta no disponible.'});res.json({...company,email:account.rows[0].email,contactName:company.contacts.find(c=>normalizeEmail(c.email)===normalizeEmail(account.rows[0].email))?.name||company.contactName,role:company.contacts.find(c=>normalizeEmail(c.email)===normalizeEmail(account.rows[0].email))?.role||company.role,phone:company.contacts.find(c=>normalizeEmail(c.email)===normalizeEmail(account.rows[0].email))?.phone||company.phone})}catch(error){next(error)}
})

app.get('/api/admin/difusion/settings', requireAdmin, async (req, res) => {
  const mail = await diffusionMailSettings(); const testMode = await testModeEnabled(); const massEnabled = await massDiffusionEnabled()
  res.json({
    databaseAvailable: Boolean(pool && databaseAvailable), massSendEnabled: massEnabled, sendEnabled: massEnabled && !testMode,
    testModeEnabled: testMode, testRecipients: normalizedTestRecipients().map(({company_name,contact_name,email,phone})=>({name:company_name,contactName:contact_name,email,phone})),
    testSendEnabled: Boolean(mail.username && mail.password), mailConfigured: Boolean(mail.username && mail.password),
    fromEmail: mail.fromEmail, approvalEmail: process.env.DIFFUSION_APPROVAL_EMAIL || diffusionConfig.approvalEmail || 'tesoreria@uic-campana.com.ar',
    pilotCompanyKey: PILOT_COMPANY_KEY, maintenanceContact: diffusionConfig.maintenanceContact, accessRole: 'admin'
  })
})

app.get('/api/admin/difusion/mail-settings', requireAdmin, requireDiffusionDatabase, async (_req, res, next) => {
  try {
    const mail = await diffusionMailSettings()
    res.json({ host: mail.host, port: mail.port, secure: mail.secure, username: mail.username, fromEmail: mail.fromEmail, fromName: mail.fromName, testRecipient: mail.testRecipient, passwordConfigured: Boolean(mail.password), massSendEnabled: await massDiffusionEnabled(), testModeEnabled: await testModeEnabled() })
  } catch (error) { next(error) }
})
app.put('/api/admin/difusion/mail-settings', requireAdmin, requireDiffusionDatabase, async (req, res, next) => {
  try {
    const host=safeText(req.body.host,250); const port=Number(req.body.port); const secure=Boolean(req.body.secure)
    const username=safeText(req.body.username,250); const password=String(req.body.password||''); const fromEmail=safeText(req.body.fromEmail,250); const fromName=safeText(req.body.fromName,180); const testRecipient=safeText(req.body.testRecipient,250)
    if (!host || !Number.isInteger(port) || port < 1 || port > 65535) return res.status(400).json({error:'Completá un servidor SMTP y puerto válidos.'})
    if (!validEmail(username) || !validEmail(fromEmail)) return res.status(400).json({error:'El usuario SMTP y el correo remitente deben ser direcciones válidas.'})
    if (testRecipient && !validEmail(testRecipient)) return res.status(400).json({error:'El correo de prueba no es válido.'})
    const current=await pool.query('SELECT smtp_password_encrypted FROM diffusion_mail_settings WHERE id=1')
    const encrypted=password ? encryptMailSecret(password) : (current.rows[0]?.smtp_password_encrypted || '')
    await pool.query(`INSERT INTO diffusion_mail_settings (id,smtp_host,smtp_port,smtp_secure,smtp_user,smtp_password_encrypted,from_email,from_name,test_recipient,updated_at)
      VALUES (1,$1,$2,$3,$4,$5,$6,$7,$8,NOW()) ON CONFLICT (id) DO UPDATE SET smtp_host=EXCLUDED.smtp_host,smtp_port=EXCLUDED.smtp_port,smtp_secure=EXCLUDED.smtp_secure,smtp_user=EXCLUDED.smtp_user,smtp_password_encrypted=EXCLUDED.smtp_password_encrypted,from_email=EXCLUDED.from_email,from_name=EXCLUDED.from_name,test_recipient=EXCLUDED.test_recipient,updated_at=NOW()`,[host,port,secure,username,encrypted,fromEmail,fromName||'Unión Industrial de Campana · Beneficios',testRecipient])
    const mail=await diffusionMailSettings()
    res.json({saved:true,passwordConfigured:Boolean(mail.password),fromEmail:mail.fromEmail})
  } catch(error){next(error)}
})

app.put('/api/admin/difusion/test-mode', requireAdmin, requireDiffusionDatabase, async (req,res,next)=>{
  try{
    const enabled=Boolean(req.body.enabled); const confirm=String(req.body.confirm||'').trim().toUpperCase()
    if(!enabled && confirm!=='SALIR DE PRUEBA') return res.status(400).json({error:'Para desactivar Modo PRUEBA escribí SALIR DE PRUEBA.'})
    if(enabled){
      await pool.query('UPDATE diffusion_mail_settings SET test_mode_enabled=TRUE,mass_send_enabled=FALSE,updated_at=NOW() WHERE id=1')
      // Protección adicional: cualquier destinatario pendiente que no esté en la lista blanca queda bloqueado antes del próximo ciclo del worker.
      const allowed=normalizedTestRecipients().map(item=>item.email)
      if(allowed.length) await pool.query(`UPDATE diffusion_campaign_queue_recipients SET status='cancelled',error_text='Bloqueado automáticamente al activar Modo PRUEBA.',updated_at=NOW() WHERE status='pending' AND lower(email) <> ALL($1::text[])`,[allowed])
      return res.json({testModeEnabled:true,massSendEnabled:false})
    }
    await pool.query('UPDATE diffusion_mail_settings SET test_mode_enabled=FALSE,updated_at=NOW() WHERE id=1')
    res.json({testModeEnabled:false,massSendEnabled:await massDiffusionEnabled()})
  }catch(error){next(error)}
})
app.put('/api/admin/difusion/mass-send', requireAdmin, requireDiffusionDatabase, async (req,res,next)=>{
  try{
    const enabled=Boolean(req.body.enabled); const confirm=String(req.body.confirm||'').trim().toUpperCase()
    if(enabled && await testModeEnabled()) return res.status(409).json({error:'Modo PRUEBA está activo. Desactivá primero el tilde de seguridad y confirmá SALIR DE PRUEBA.'})
    if(enabled&&confirm!=='HABILITAR')return res.status(400).json({error:'Para habilitar el padrón general escribí HABILITAR.'})
    await pool.query('UPDATE diffusion_mail_settings SET mass_send_enabled=$1,updated_at=NOW() WHERE id=1',[enabled]);res.json({massSendEnabled:enabled,testModeEnabled:await testModeEnabled()})
  }catch(error){next(error)}
})
app.post('/api/admin/difusion/mail-settings/test', requireAdmin, requireDiffusionDatabase, async (req,res,next)=>{
  try {
    if(req.body.confirmFirst!==true||String(req.body.confirm||'').trim().toUpperCase()!=='PROBAR')return res.status(400).json({error:'La prueba técnica requiere doble confirmación: aceptar el aviso y escribir PROBAR.'})
    const mail=await diffusionMailSettings(); const recipient=safeText(req.body.recipient,250)||mail.testRecipient||mail.fromEmail
    if(!validEmail(recipient)) return res.status(400).json({error:'Indicá un correo válido para recibir la prueba.'})
    await sendDiffusionMail({to:recipient,subject:'[PRUEBA] Configuración de correo · Portal de Beneficios UIC',html:`<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#17384c"><h2>Prueba de correo · Difusión de Beneficios UIC</h2><p>La configuración SMTP funciona correctamente.</p><p><strong>Remitente configurado:</strong> ${safeText(mail.fromEmail,250)}</p><p>Este mensaje es una prueba técnica y no fue enviado al padrón de socios.</p></div>`})
    res.json({sent:true,recipient})
  } catch(error){next(error)}
})
app.get('/api/admin/difusion/companies', requireAdmin, async (_req, res, next) => { try { res.json(await buildDiffusionCompanies()) } catch (error) { next(error) } })

app.get('/api/admin/difusion/recipients', requireAdmin, requireDiffusionDatabase, async (_req, res, next) => {
  try { const result = await pool.query(`SELECT * FROM diffusion_recipients ORDER BY CASE source_type WHEN 'socio' THEN 0 WHEN 'convenio' THEN 1 ELSE 2 END, company_name, contact_name`); res.json(result.rows) } catch (error) { next(error) }
})
app.put('/api/admin/difusion/recipient-companies/toggle', requireAdmin, requireDiffusionDatabase, async (req, res, next) => {
  try {
    const sourceType=safeText(req.body.sourceType,30); const companyName=safeText(req.body.companyName,250); const enabled=Boolean(req.body.enabled)
    if (!['socio','convenio','manual'].includes(sourceType) || !companyName) return res.status(400).json({ error: 'Empresa inválida' })
    if(slugify(companyName)===PILOT_COMPANY_KEY && !enabled) return res.status(400).json({error:'TECNO LOGISTI-K SA permanece siempre habilitada como destino de control.'})
    const result=await pool.query(`UPDATE diffusion_recipients SET enabled=CASE WHEN $1::boolean=TRUE THEN (email_valid AND opted_out_at IS NULL) ELSE FALSE END, updated_at=NOW() WHERE source_type=$2 AND company_name=$3 RETURNING *`,[enabled,sourceType,companyName])
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
    const emailValid=validEmail(email); const current=await pool.query('SELECT opted_out_at FROM diffusion_recipients WHERE id=$1',[id]); const enabled=Boolean(req.body.enabled) && emailValid && !current.rows[0]?.opted_out_at
    const result=await pool.query(`UPDATE diffusion_recipients SET company_name=$1,contact_name=$2,email=$3,phone=$4,enabled=$5,email_valid=$6,notes=$7,updated_at=NOW() WHERE id=$8 RETURNING *`,[company,contact,email,phone,enabled,emailValid,notes,id])
    if (!result.rows[0]) return res.status(404).json({ error: 'Destinatario no encontrado' })
    res.json(result.rows[0])
  } catch (error) { next(error) }
})

app.post('/api/admin/difusion/recipients/:id/reactivate', requireAdmin, requireDiffusionDatabase, async(req,res,next)=>{
  try{const id=safeId(req.params.id);if(!id)return res.status(400).json({error:'Destinatario inválido'});const result=await pool.query(`UPDATE diffusion_recipients SET opted_out_at=NULL,opted_out_reason='',enabled=email_valid,updated_at=NOW() WHERE id=$1 RETURNING *`,[id]);if(!result.rows[0])return res.status(404).json({error:'Destinatario no encontrado'});res.json(result.rows[0])}catch(error){next(error)}
})

const campaignUpload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:7}})
app.post('/api/admin/difusion/campaigns',requireDiffusionActor,requireDiffusionDatabase,campaignUpload.fields([{name:'attachments',maxCount:3},{name:'inlineImages',maxCount:4}]),async(req,res,next)=>{
  try{
    if(String(req.body.operationMode||'')!=='test')return res.status(410).json({error:'Los borradores ya no se guardan en Neon. Usá “Guardar archivo en mi PC” y abrí luego el archivo .uicpub.'})
    const companyKey=safeText(req.body.companyKey,160);if(!actorCanUseCompany(req,companyKey))return res.status(403).json({error:'No tenés acceso a esta empresa.'});const company=await findDiffusionCompany(companyKey);if(!company)return res.status(404).json({error:'Empresa no encontrada.'})
    const benefitSlug=safeText(req.body.benefitSlug,180);const benefit=company.benefits.find(b=>b.slug===benefitSlug);if(!benefit)return res.status(403).json({error:'El beneficio no corresponde a esta empresa.'})
    let originatorEmail=req.diffusionActor?.type==='company'?normalizeEmail(req.diffusionActor.email):normalizeEmail(req.body.originatorEmail);const allowedEmails=authorizedCompanyEmails(company);if(!validEmail(originatorEmail)||!allowedEmails.includes(originatorEmail))return res.status(403).json({error:'El correo de origen no coincide con un contacto registrado para esta empresa.'})
    const contact=company.contacts.find(c=>normalizeEmail(c.email)===originatorEmail)||{};const originatorName=safeText(contact.name||req.body.originatorName||company.contactName||company.name,200);const originatorPhone=safeText(contact.phone||company.phone||'',100);const originatorRole=safeText(contact.role||company.role||'',160)
    const subject=campaignSubject(company.name);const templateId=EMAIL_TEMPLATE_IDS.has(String(req.body.templateId||''))?String(req.body.templateId):'institutional';let rawLayout={};try{rawLayout=JSON.parse(String(req.body.layoutJson||'{}'))}catch{return res.status(400).json({error:'El diseño del correo no pudo interpretarse. Volvé a seleccionar el modelo.'})}const layoutJson=sanitizeLayout(templateId,rawLayout);const bodyMarkup=plainMarkup(layoutPlainText(layoutJson));const fontFamily=['Arial','Verdana','Tahoma','Georgia'].includes(req.body.fontFamily)?req.body.fontFamily:'Arial';const fontSize=['small','normal','large'].includes(req.body.fontSize)?req.body.fontSize:'normal';if(!bodyMarkup)return res.status(400).json({error:'Completá al menos un bloque de texto de la comunicación.'})
    const attachments=req.files?.attachments||[];const inlineImages=req.files?.inlineImages||[];const allowedAttach=new Set(['image/jpeg','image/png','application/pdf']);const allowedInline=new Set(['image/jpeg','image/png']);if(attachments.some(f=>!allowedAttach.has(f.mimetype)||!fileSignatureMatches(f))||inlineImages.some(f=>!allowedInline.has(f.mimetype)||!fileSignatureMatches(f)))return res.status(400).json({error:'Los adjuntos admiten JPG, PNG o PDF; las imágenes del cuerpo admiten JPG o PNG.'});let inlinePositions=[];try{inlinePositions=JSON.parse(String(req.body.inlineImagePositions||'[]'))}catch{};if(!Array.isArray(inlinePositions)||inlinePositions.length!==inlineImages.length)inlinePositions=inlineImages.map((_,i)=>i);inlinePositions=inlinePositions.map((value,i)=>{const n=Number(value);return Number.isInteger(n)&&n>=0&&n<=3?n:i})
    const safety=assessCampaign(subject,bodyMarkup,[...attachments,...inlineImages]);
    await pool.query(`DELETE FROM diffusion_campaigns WHERE company_key=$1 AND benefit_slug=$2 AND LOWER(originator_email)=LOWER($3) AND status IN ('draft','blocked') AND approval_requested_at IS NULL`,[companyKey,benefit.slug,originatorEmail])
    const result=await pool.query(`INSERT INTO diffusion_campaigns (company_key,company_name,benefit_slug,benefit_title,originator_name,originator_email,originator_phone,originator_role,subject,body_markup,font_family,font_size,template_id,layout_json,status,safety_status,safety_notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16,$17) RETURNING *`,[companyKey,company.name,benefit.slug,benefit.title,originatorName,originatorEmail,originatorPhone,originatorRole,subject,bodyMarkup,fontFamily,fontSize,templateId,JSON.stringify(layoutJson),safety.status==='blocked'?'blocked':'draft',safety.status,safety.notes])
    for(let i=0;i<inlineImages.length;i++){const file=inlineImages[i];await pool.query(`INSERT INTO diffusion_campaign_files (campaign_id,filename,mime_type,size_bytes,file_data,placement,position) VALUES ($1,$2,$3,$4,$5,'inline',$6)`,[result.rows[0].id,safeText(file.originalname,250),file.mimetype,file.size,file.buffer,inlinePositions[i]])}let pos=0;for(const file of attachments)await pool.query(`INSERT INTO diffusion_campaign_files (campaign_id,filename,mime_type,size_bytes,file_data,placement,position) VALUES ($1,$2,$3,$4,$5,'attachment',$6)`,[result.rows[0].id,safeText(file.originalname,250),file.mimetype,file.size,file.buffer,pos++])
    res.status(201).json({...result.rows[0],files:[...inlineImages.map(f=>({filename:f.originalname,mimeType:f.mimetype,sizeBytes:f.size,placement:'inline'})),...attachments.map(f=>({filename:f.originalname,mimeType:f.mimetype,sizeBytes:f.size,placement:'attachment'}))]})
  }catch(error){next(error)}
})
async function getCampaign(id){const result=await pool.query('SELECT * FROM diffusion_campaigns WHERE id=$1',[id]);return result.rows[0]||null}
async function campaignFilesMeta(id){return (await pool.query(`SELECT id,filename,mime_type AS "mimeType",size_bytes AS "sizeBytes",placement,position FROM diffusion_campaign_files WHERE campaign_id=$1 ORDER BY CASE WHEN placement='inline' THEN 0 ELSE 1 END,position,id`,[id])).rows}
function editableCampaignStatus(status){return ['draft','blocked','rejected'].includes(String(status||''))}
app.get('/api/difusion/campaigns',requireDiffusionActor,requireDiffusionDatabase,async(req,res,next)=>{
  try{
    const companyKey=req.diffusionActor?.type==='admin'?safeText(req.query.companyKey,160):req.diffusionActor?.companyKey
    if(!companyKey||!actorCanUseCompany(req,companyKey))return res.status(403).json({error:'No tenés acceso a estas publicaciones.'})
    const params=[companyKey];let where='c.company_key=$1'
    if(req.diffusionActor?.type==='company'){params.push(normalizeEmail(req.diffusionActor.email));where+=' AND LOWER(c.originator_email)=LOWER($2)'}
    const rows=(await pool.query(`SELECT c.id,c.company_key,c.company_name,c.benefit_slug,c.benefit_title,c.subject,c.template_id,c.status,c.safety_status,c.test_sent_at,c.test_verified_at,c.approval_requested_at,c.approved_at,c.rejected_at,c.sent_at,c.cancelled_at,c.created_at,c.updated_at,c.content_deleted_at,COALESCE((SELECT COUNT(*)::int FROM diffusion_campaign_files f WHERE f.campaign_id=c.id),0) AS file_count FROM diffusion_campaigns c WHERE ${where} ORDER BY c.updated_at DESC,c.id DESC LIMIT 40`,params)).rows
    res.json(rows.map(row=>({...row,editable:editableCampaignStatus(row.status)&&!row.content_deleted_at})))
  }catch(error){next(error)}
})
app.get('/api/difusion/campaigns/:id',requireDiffusionActor,requireDiffusionDatabase,async(req,res,next)=>{
  try{const id=safeId(req.params.id);const campaign=id?await getCampaign(id):null;if(!campaign)return res.status(404).json({error:'Publicación no encontrada.'});if(!campaignOwnedByActor(req,campaign))return res.status(403).json({error:'No tenés acceso a esta publicación.'});res.json({...campaign,editable:editableCampaignStatus(campaign.status)&&!campaign.content_deleted_at,files:await campaignFilesMeta(id)})}catch(error){next(error)}
})
app.get('/api/difusion/campaigns/:id/files/:fileId',requireDiffusionActor,requireDiffusionDatabase,async(req,res,next)=>{
  try{const id=safeId(req.params.id);const fileId=safeId(req.params.fileId);const campaign=id?await getCampaign(id):null;if(!campaign||!fileId)return res.status(404).end();if(!campaignOwnedByActor(req,campaign))return res.status(403).end();const result=await pool.query('SELECT filename,mime_type,file_data FROM diffusion_campaign_files WHERE id=$1 AND campaign_id=$2',[fileId,id]);const file=result.rows[0];if(!file)return res.status(404).end();res.setHeader('Content-Type',file.mime_type||'application/octet-stream');res.setHeader('Content-Disposition',`inline; filename*=UTF-8''${encodeURIComponent(file.filename||'archivo')}`);res.setHeader('Cache-Control','private, no-store');res.send(file.file_data)}catch(error){next(error)}
})
app.put('/api/difusion/campaigns/:id',requireDiffusionActor,requireDiffusionDatabase,campaignUpload.fields([{name:'attachments',maxCount:3},{name:'inlineImages',maxCount:4}]),async(req,res,next)=>{
  try{
    if(String(req.body.operationMode||'')!=='test')return res.status(410).json({error:'Los borradores ya no se actualizan en Neon. Guardá un archivo .uicpub en tu PC.'})
    const id=safeId(req.params.id);const current=id?await getCampaign(id):null;if(!current)return res.status(404).json({error:'Publicación no encontrada.'});if(!campaignOwnedByActor(req,current))return res.status(403).json({error:'No tenés acceso a esta publicación.'});if(!editableCampaignStatus(current.status)||current.content_deleted_at)return res.status(409).json({error:'Esta publicación ya ingresó al circuito de validación/envío y no puede modificarse como instancia operativa. Abrí tu archivo local .uicpub para iniciar una nueva prueba.'})
    const company=await findDiffusionCompany(current.company_key);if(!company)return res.status(404).json({error:'Empresa no encontrada.'});const benefit=company.benefits.find(b=>b.slug===current.benefit_slug);if(!benefit)return res.status(403).json({error:'El beneficio ya no está habilitado para esta empresa.'})
    const templateId=EMAIL_TEMPLATE_IDS.has(String(req.body.templateId||''))?String(req.body.templateId):'institutional';let rawLayout={};try{rawLayout=JSON.parse(String(req.body.layoutJson||'{}'))}catch{return res.status(400).json({error:'El diseño del correo no pudo interpretarse. Volvé a seleccionar el modelo.'})}const layoutJson=sanitizeLayout(templateId,rawLayout);const bodyMarkup=plainMarkup(layoutPlainText(layoutJson));if(!bodyMarkup)return res.status(400).json({error:'Completá al menos un bloque de texto de la comunicación.'})
    const fontFamily=['Arial','Verdana','Tahoma','Georgia'].includes(req.body.fontFamily)?req.body.fontFamily:'Arial';const fontSize=['small','normal','large'].includes(req.body.fontSize)?req.body.fontSize:'normal';const attachments=req.files?.attachments||[];const inlineImages=req.files?.inlineImages||[];const allowedAttach=new Set(['image/jpeg','image/png','application/pdf']);const allowedInline=new Set(['image/jpeg','image/png']);if(attachments.some(f=>!allowedAttach.has(f.mimetype)||!fileSignatureMatches(f))||inlineImages.some(f=>!allowedInline.has(f.mimetype)||!fileSignatureMatches(f)))return res.status(400).json({error:'Los adjuntos admiten JPG, PNG o PDF; las imágenes del cuerpo admiten JPG o PNG.'})
    let inlinePositions=[];try{inlinePositions=JSON.parse(String(req.body.inlineImagePositions||'[]'))}catch{};if(!Array.isArray(inlinePositions)||inlinePositions.length!==inlineImages.length)inlinePositions=inlineImages.map((_,i)=>i);inlinePositions=inlinePositions.map((value,i)=>{const n=Number(value);return Number.isInteger(n)&&n>=0&&n<=3?n:i})
    const safety=assessCampaign(current.subject,bodyMarkup,[...attachments,...inlineImages]);const client=await pool.connect();try{await client.query('BEGIN');const updated=(await client.query(`UPDATE diffusion_campaigns SET body_markup=$2,font_family=$3,font_size=$4,template_id=$5,layout_json=$6::jsonb,status=$7,safety_status=$8,safety_notes=$9,test_sent_at=NULL,test_code_hash='',test_code_expires_at=NULL,test_verified_at=NULL,approval_requested_at=NULL,rejected_at=NULL,updated_at=NOW() WHERE id=$1 RETURNING *`,[id,bodyMarkup,fontFamily,fontSize,templateId,JSON.stringify(layoutJson),safety.status==='blocked'?'blocked':'draft',safety.status,safety.notes])).rows[0];await client.query('DELETE FROM diffusion_campaign_files WHERE campaign_id=$1',[id]);for(let i=0;i<inlineImages.length;i++){const file=inlineImages[i];await client.query(`INSERT INTO diffusion_campaign_files (campaign_id,filename,mime_type,size_bytes,file_data,placement,position) VALUES ($1,$2,$3,$4,$5,'inline',$6)`,[id,safeText(file.originalname,250),file.mimetype,file.size,file.buffer,inlinePositions[i]])}let pos=0;for(const file of attachments)await client.query(`INSERT INTO diffusion_campaign_files (campaign_id,filename,mime_type,size_bytes,file_data,placement,position) VALUES ($1,$2,$3,$4,$5,'attachment',$6)`,[id,safeText(file.originalname,250),file.mimetype,file.size,file.buffer,pos++]);await client.query('COMMIT');res.json({...updated,files:await campaignFilesMeta(id)})}catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
  }catch(error){next(error)}
})
app.post('/api/difusion/campaigns/:id/duplicate',requireDiffusionActor,requireDiffusionDatabase,async(req,res,next)=>{
  const client=await pool.connect();try{const id=safeId(req.params.id);const campaign=id?await getCampaign(id):null;if(!campaign)return res.status(404).json({error:'Publicación no encontrada.'});if(!campaignOwnedByActor(req,campaign))return res.status(403).json({error:'No tenés acceso a esta publicación.'});if(campaign.content_deleted_at||!campaign.body_markup)return res.status(409).json({error:'El contenido original ya no está disponible para duplicar.'});await client.query('BEGIN');const copy=(await client.query(`INSERT INTO diffusion_campaigns (company_key,company_name,benefit_slug,benefit_title,originator_name,originator_email,originator_phone,originator_role,subject,body_markup,font_family,font_size,template_id,layout_json,status,safety_status,safety_notes) SELECT company_key,company_name,benefit_slug,benefit_title,originator_name,originator_email,originator_phone,originator_role,subject,body_markup,font_family,font_size,template_id,layout_json,'draft',safety_status,safety_notes FROM diffusion_campaigns WHERE id=$1 RETURNING *`,[id])).rows[0];await client.query(`INSERT INTO diffusion_campaign_files (campaign_id,filename,mime_type,size_bytes,file_data,placement,position) SELECT $2,filename,mime_type,size_bytes,file_data,placement,position FROM diffusion_campaign_files WHERE campaign_id=$1`,[id,copy.id]);await client.query('COMMIT');res.status(201).json({...copy,editable:true,files:await campaignFilesMeta(copy.id)})}catch(error){await client.query('ROLLBACK');next(error)}finally{client.release()}
})
app.delete('/api/difusion/campaigns/:id',requireDiffusionActor,requireDiffusionDatabase,async(req,res,next)=>{
  try{const id=safeId(req.params.id);const campaign=id?await getCampaign(id):null;if(!campaign)return res.status(404).json({error:'Publicación no encontrada.'});if(!campaignOwnedByActor(req,campaign))return res.status(403).json({error:'No tenés acceso a esta publicación.'});if(!editableCampaignStatus(campaign.status)||campaign.content_deleted_at)return res.status(409).json({error:'Sólo pueden eliminarse borradores o publicaciones devueltas para corrección.'});await pool.query('DELETE FROM diffusion_campaigns WHERE id=$1',[id]);res.json({ok:true})}catch(error){next(error)}
})
async function cooldownFor(companyKey,benefitSlug){const slot=await benefitSlotStatus(companyKey,benefitSlug);return slot.allowed?null:argentinaMidnightUtc(slot.nextAllowed)}
app.get('/api/admin/difusion/campaigns',requireAdmin,requireDiffusionDatabase,async(req,res,next)=>{try{const status=safeText(req.query.status,30);const result=await pool.query(`SELECT c.*,COALESCE((SELECT json_agg(json_build_object('filename',f.filename,'mimeType',f.mime_type,'sizeBytes',f.size_bytes,'placement',f.placement) ORDER BY f.position,f.id) FROM diffusion_campaign_files f WHERE f.campaign_id=c.id),'[]'::json) AS files FROM diffusion_campaigns c ${status?'WHERE c.status=$1':''} ORDER BY c.created_at DESC LIMIT 100`,status?[status]:[]);res.json(result.rows)}catch(error){next(error)}})
app.post('/api/admin/difusion/campaigns/:id/test',requireDiffusionActor,requireDiffusionDatabase,async(req,res,next)=>{
  try{const id=safeId(req.params.id);const campaign=id?await getCampaign(id):null;if(!campaign)return res.status(404).json({error:'Comunicación no encontrada'});if(!campaignOwnedByActor(req,campaign))return res.status(403).json({error:'No tenés acceso a esta comunicación.'});if(campaign.safety_status==='blocked')return res.status(400).json({error:'El contenido fue bloqueado por el control automático y debe corregirse.'});const code=sixDigitCode();const expires=new Date(Date.now()+30*60*1000);const media=await campaignMedia(id);const html=campaignEmailHtml(campaign,media.inlineFiles,{unsubscribePreview:true});await sendDiffusionMail({to:campaign.originator_email,subject:`[PRUEBA · NO ENVIADO A SOCIOS] ${campaign.subject}`,html:`<div style="background:#fff5cc;padding:14px;border:1px solid #e8c44a"><strong>PRUEBA DE DIFUSIÓN UIC</strong><br>Este envío es sólo para revisar la publicación. No consume el cupo mensual y no fue enviado a socios.<div style="margin-top:14px;font-size:13px">Para confirmar que este correo pertenece realmente a la empresa, copiá este código en el Portal:</div><div style="font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;padding:14px">${code}</div><small>Vence en 30 minutos y cambia en cada nueva prueba.</small></div>${html}`,attachments:media.all});const result=await pool.query(`UPDATE diffusion_campaigns SET test_sent_at=NOW(),test_code_hash=$2,test_code_expires_at=$3,test_verified_at=NULL,updated_at=NOW() WHERE id=$1 RETURNING *`,[id,codeHash(code,`campaign-test:${id}:${campaign.originator_email}`),expires]);res.json({...result.rows[0],testCodeRequired:true})}catch(error){next(error)}
})
app.post('/api/admin/difusion/campaigns/:id/verify-test',requireDiffusionActor,requireDiffusionDatabase,async(req,res,next)=>{
  try{const id=safeId(req.params.id);const campaign=id?await getCampaign(id):null;if(!campaign)return res.status(404).json({error:'Comunicación no encontrada'});if(!campaignOwnedByActor(req,campaign))return res.status(403).json({error:'No tenés acceso a esta comunicación.'});const code=safeText(req.body.code,12);if(!/^\d{6}$/.test(code))return res.status(400).json({error:'Ingresá los 6 dígitos recibidos en el correo de prueba.'});if(!campaign.test_code_hash||!campaign.test_code_expires_at||new Date(campaign.test_code_expires_at)<=new Date()||!safeEqualText(campaign.test_code_hash,codeHash(code,`campaign-test:${id}:${campaign.originator_email}`)))return res.status(400).json({error:'El código es incorrecto o venció. Enviá una nueva prueba para generar otro.'});const result=await pool.query(`UPDATE diffusion_campaigns SET test_verified_at=NOW(),test_code_hash='',test_code_expires_at=NULL,updated_at=NOW() WHERE id=$1 RETURNING *`,[id]);res.json(result.rows[0])}catch(error){next(error)}
})
app.post('/api/admin/difusion/campaigns/:id/request-approval',requireDiffusionActor,requireDiffusionDatabase,async(req,res,next)=>{
  try{const id=safeId(req.params.id);const campaign=id?await getCampaign(id):null;if(!campaign)return res.status(404).json({error:'Comunicación no encontrada'});if(!campaignOwnedByActor(req,campaign))return res.status(403).json({error:'No tenés acceso a esta comunicación.'});if(campaign.safety_status==='blocked')return res.status(400).json({error:'El contenido fue bloqueado por seguridad.'});if(!campaign.test_sent_at||!campaign.test_verified_at)return res.status(400).json({error:'Primero enviá la prueba y verificá el código de 6 dígitos recibido por la empresa.'});const nextAllowed=await cooldownFor(campaign.company_key,campaign.benefit_slug);if(nextAllowed&&new Date(nextAllowed)>new Date())return res.status(409).json({error:`Este beneficio podrá volver a solicitar envío a partir del ${new Date(nextAllowed).toLocaleDateString('es-AR')}.`,nextAllowed});const approvalEmail=process.env.DIFFUSION_APPROVAL_EMAIL||diffusionConfig.approvalEmail||'tesoreria@uic-campana.com.ar';const media=await campaignMedia(id);await sendDiffusionMail({to:approvalEmail,subject:`[VALIDACIÓN PENDIENTE] ${campaign.company_name} · ${campaign.subject}`,html:`<div style="background:#e9f5fb;padding:12px;border:1px solid #52a8cf"><strong>VALIDACIÓN REQUERIDA</strong><br>La empresa recibió la prueba y verificó correctamente el código enviado a su correo registrado. Esta comunicación NO fue enviada a socios.</div>${campaignEmailHtml(campaign,media.inlineFiles,{unsubscribePreview:true})}`,attachments:media.all});const result=await pool.query(`UPDATE diffusion_campaigns SET status='pending',approval_requested_at=NOW(),updated_at=NOW() WHERE id=$1 RETURNING *`,[id]);res.json(result.rows[0])}catch(error){next(error)}
})
app.post('/api/admin/difusion/campaigns/:id/reject',requireAdmin,requireDiffusionDatabase,async(req,res,next)=>{try{const id=safeId(req.params.id);if(!id)return res.status(400).json({error:'Comunicación inválida'});const client=await pool.connect();try{await client.query('BEGIN');const result=await client.query(`UPDATE diffusion_campaigns SET status='rejected',rejected_at=NOW(),safety_notes=$2,body_markup='',layout_json='{}'::jsonb,content_deleted_at=NOW(),updated_at=NOW() WHERE id=$1 AND status='pending' RETURNING *`,[id,safeText(req.body.reason,500)||'Rechazada por validación administrativa.']);if(!result.rows[0]){await client.query('ROLLBACK');return res.status(409).json({error:'La comunicación ya no está pendiente.'})}await client.query('DELETE FROM diffusion_campaign_files WHERE campaign_id=$1',[id]);await client.query('COMMIT');res.json(result.rows[0])}catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}}catch(error){next(error)}})
app.post('/api/admin/difusion/campaigns/:id/approve',requireAdmin,requireDiffusionDatabase,async(req,res,next)=>{
  try{
    const testMode=await testModeEnabled(); const massEnabled=await massDiffusionEnabled(); const generalEnabled=!testMode&&massEnabled; const requiredWord=generalEnabled?'ENVIAR':'VALIDAR'; if(req.body.confirmFirst!==true)return res.status(400).json({error:'Falta la primera confirmación de seguridad.'}); if(String(req.body.confirm||'').trim().toUpperCase()!==requiredWord)return res.status(400).json({error:`Para evitar acciones accidentales escribí ${requiredWord} en la segunda confirmación.`})
    const id=safeId(req.params.id); const campaign=id?await getCampaign(id):null; if(!campaign||campaign.status!=='pending')return res.status(409).json({error:'La comunicación no está pendiente de validación.'}); if(campaign.safety_status==='blocked'||!campaign.test_verified_at)return res.status(400).json({error:'La comunicación no superó todos los controles previos.'})
    const slot=await benefitSlotStatus(campaign.company_key,campaign.benefit_slug); if(!slot.allowed)return res.status(409).json({error:`Este beneficio ya utilizó su oportunidad del ciclo mensual actual. La próxima habilitación será el ${slot.nextAllowed.split('-').reverse().join('/')}. Los meses no son acumulativos.`,nextAllowed:slot.nextAllowed})
    const media=await campaignMedia(id); const baseHtml=campaignEmailHtml(campaign,media.inlineFiles,{unsubscribePreview:true})
    if(!testMode || isAllowedTestRecipient(campaign.originator_email)){
      await sendDiffusionMail({to:campaign.originator_email,subject:campaign.subject,html:`<div style="background:#e9f8ef;padding:12px;border:1px solid #8ac7a4"><strong>PUBLICACIÓN VALIDADA POR UIC</strong><br>${testMode?'Modo PRUEBA activo: esta copia se encuentra dentro de la lista blanca de control.':'Esta copia confirma que la comunicación fue validada. El envío al padrón ingresará ahora en la cola de distribución.'}</div>${baseHtml}`,attachments:media.all})
    }
    const recipients=await buildQueueRecipients(campaign,massEnabled,testMode)
    const client=await pool.connect()
    try{
      await client.query('BEGIN'); const schedule=await authorizeBenefitSlot(client,campaign); const queued=await queueCampaign(client,campaign,recipients,schedule.nextAllowed); await client.query('COMMIT')
      const monitor=await monitorPayload(campaign.company_key); const mine=monitor.campaigns.find(item=>String(item.id)===String(id))
      res.json({...queued,queued:true,massMode:testMode?'test_mode':massEnabled?'general':'control_only',recipients:queued.total_recipients,nextAllowed:schedule.nextAllowed,monitor:mine,testModeEnabled:testMode})
    }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
  }catch(error){next(error)}
})

app.get('/api/difusion/company/monitor',requireCompany,requireDiffusionDatabase,async(req,res,next)=>{try{res.json(await monitorPayload(req.companySession.companyKey))}catch(error){next(error)}})
app.get('/api/admin/difusion/monitor',requireAdmin,requireDiffusionDatabase,async(req,res,next)=>{try{const companyKey=safeText(req.query.companyKey,180);if(!companyKey)return res.status(400).json({error:'Indicá la empresa a consultar.'});res.json(await monitorPayload(companyKey))}catch(error){next(error)}})
app.get('/api/admin/difusion/campaigns/:id/trace',requireAdmin,requireDiffusionDatabase,async(req,res,next)=>{
  try{
    const id=safeId(req.params.id);if(!id)return res.status(400).json({error:'Campaña inválida.'})
    const campaign=await getCampaign(id);if(!campaign)return res.status(404).json({error:'Campaña no encontrada.'})
    const rows=(await pool.query(`SELECT id,email,company_name,contact_name,status,sent_at,failed_at,error_text,first_opened_at,last_opened_at,open_count,unsubscribed_at FROM diffusion_campaign_queue_recipients WHERE campaign_id=$1 ORDER BY company_name,email`,[id])).rows
    const sent=rows.filter(r=>r.status==='sent').length;const opened=rows.filter(r=>r.first_opened_at).length;const failed=rows.filter(r=>r.status==='failed').length;const unsubscribed=rows.filter(r=>r.unsubscribed_at).length
    res.json({campaign:{id:campaign.id,companyName:campaign.company_name,benefitTitle:campaign.benefit_title,status:campaign.status},summary:{total:rows.length,sent,opened,notDetected:Math.max(0,sent-opened),failed,unsubscribed,openRate:sent?Math.round(opened*10000/sent)/100:0},recipients:rows})
  }catch(error){next(error)}
})
app.post('/api/admin/difusion/campaigns/:id/cancel',requireDiffusionActor,requireDiffusionDatabase,async(req,res,next)=>{
  try{const id=safeId(req.params.id);const campaign=id?await getCampaign(id):null;if(!campaign)return res.status(404).json({error:'Envío no encontrado.'});if(!campaignOwnedByActor(req,campaign))return res.status(403).json({error:'No tenés acceso a este envío.'});if(!['queued','sending'].includes(campaign.status))return res.status(409).json({error:'Este envío ya no puede cancelarse.'});const nextAllowed=campaign.next_allowed_at?dateOnly(campaign.next_allowed_at):null
    if(campaign.status==='queued'){const cancelled=await finishCancelledCampaign(id);return res.json({...cancelled,cancelled:true,nextAllowed})}
    const result=await pool.query(`UPDATE diffusion_campaigns SET cancel_requested_at=NOW(),queue_note='Cancelación solicitada. Se detendrá antes del próximo correo pendiente.',updated_at=NOW() WHERE id=$1 RETURNING *`,[id]);res.json({...result.rows[0],cancelRequested:true,nextAllowed,note:'Los correos ya enviados no pueden retirarse. Si había un correo en transmisión al momento de cancelar, ese envío puede completarse; no se iniciarán nuevos destinatarios.'})
  }catch(error){next(error)}
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


const transparentGif=Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==','base64')
app.get('/api/difusion/open.gif', async(req,res)=>{
  res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate')
  res.setHeader('Pragma','no-cache');res.setHeader('Expires','0');res.type('image/gif')
  try{
    if(pool&&databaseAvailable){const campaignId=safeId(req.query.c);const queueId=safeId(req.query.q);const token=String(req.query.token||'');if(campaignId&&queueId&&token){const row=(await pool.query('SELECT id,campaign_id,email FROM diffusion_campaign_queue_recipients WHERE id=$1 AND campaign_id=$2',[queueId,campaignId])).rows[0];if(row&&safeEqualText(token,queueTrackingToken(row)))await pool.query(`UPDATE diffusion_campaign_queue_recipients SET first_opened_at=COALESCE(first_opened_at,NOW()),last_opened_at=NOW(),open_count=open_count+1,updated_at=NOW() WHERE id=$1`,[queueId])}}
  }catch(error){console.warn(`Trazabilidad de apertura: ${error.code||error.message}`)}
  res.send(transparentGif)
})

app.get('/api/difusion/unsubscribe', requireDiffusionDatabase, async(req,res,next)=>{
  try{
    const id=safeId(req.query.id);const campaignId=safeId(req.query.c);const queueId=safeId(req.query.q);const token=String(req.query.token||'');if(!id||!token)return res.status(400).type('html').send('<h2>Enlace inválido</h2>')
    const result=await pool.query('SELECT * FROM diffusion_recipients WHERE id=$1',[id]);const recipient=result.rows[0];if(!recipient)return res.status(400).type('html').send('<h2>El enlace no es válido o ya no corresponde a este destinatario.</h2>')
    let valid=false;let queueRow=null
    if(campaignId&&queueId){queueRow=(await pool.query('SELECT * FROM diffusion_campaign_queue_recipients WHERE id=$1 AND campaign_id=$2 AND recipient_id=$3',[queueId,campaignId,id])).rows[0];valid=Boolean(queueRow&&normalizeEmail(queueRow.email)===normalizeEmail(recipient.email)&&safeEqualText(token,queueUnsubscribeToken(queueRow)))}
    else valid=safeEqualText(token,unsubscribeToken(recipient))
    if(!valid)return res.status(400).type('html').send('<h2>El enlace no es válido o ya no corresponde a este destinatario.</h2>')
    if(slugify(recipient.company_name)===PILOT_COMPANY_KEY)return res.type('html').send('<div style="font-family:Arial;padding:40px;max-width:700px;margin:auto"><h2>Este destino permanece habilitado como control interno de la UIC.</h2><p>Para modificar esta condición comuníquese con Administración UIC.</p></div>')
    await pool.query(`UPDATE diffusion_recipients SET enabled=FALSE,opted_out_at=COALESCE(opted_out_at,NOW()),opted_out_reason='Deshabilitado por el destinatario desde el enlace del correo.',updated_at=NOW() WHERE id=$1`,[id])
    if(queueRow)await pool.query(`UPDATE diffusion_campaign_queue_recipients SET unsubscribed_at=COALESCE(unsubscribed_at,NOW()),updated_at=NOW() WHERE id=$1`,[queueId])
    res.type('html').send('<div style="font-family:Arial;padding:40px;max-width:700px;margin:auto"><h2>Recepción deshabilitada</h2><p>Su dirección fue deshabilitada para futuras comunicaciones del módulo Difusión de Beneficios UIC.</p><p>No recibirá nuevos envíos mientras permanezca en este estado. Si necesita revertir esta decisión, comuníquese con Administración UIC.</p></div>')
  }catch(error){next(error)}
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
  if(pool&&databaseAvailable){
    await pool.query(`DELETE FROM diffusion_campaigns WHERE status IN ('draft','blocked') AND approval_requested_at IS NULL`)
    await pool.query(`UPDATE diffusion_campaign_queue_recipients SET status='failed',failed_at=NOW(),error_text='Envío interrumpido durante reinicio: no se reintenta automáticamente para evitar una copia duplicada.',updated_at=NOW() WHERE status='sending'`)
    await pool.query(`UPDATE diffusion_campaigns c SET status='queued',queue_note='Reanudado después de reinicio del servicio',sent_count=(SELECT COUNT(*)::int FROM diffusion_campaign_queue_recipients q WHERE q.campaign_id=c.id AND q.status='sent'),failed_count=(SELECT COUNT(*)::int FROM diffusion_campaign_queue_recipients q WHERE q.campaign_id=c.id AND q.status='failed'),recipient_count=(SELECT COUNT(*)::int FROM diffusion_campaign_queue_recipients q WHERE q.campaign_id=c.id AND q.status='sent'),updated_at=NOW() WHERE c.status='sending' AND c.cancel_requested_at IS NULL`)
    const cancelledOnRestart=(await pool.query(`SELECT id FROM diffusion_campaigns WHERE status='sending' AND cancel_requested_at IS NOT NULL`)).rows;for(const row of cancelledOnRestart)await finishCancelledCampaign(row.id)
  }
} catch (error) {
  databaseAvailable = false
  console.error(`Neon no pudo inicializarse; el portal continuará con catálogo local y reintentará en las consultas (${error.code || error.message})`)
}
const queueTimer=setInterval(()=>processDiffusionQueue().catch(error=>console.error(`Cola de difusión: ${error.code||error.message}`)),DIFFUSION_SEND_INTERVAL_MS);queueTimer.unref?.()
const server = app.listen(PORT, '0.0.0.0', () => console.log(`Beneficios UIC NUEVO v${VERSION} · ${GENERATION} · puerto ${PORT}`))
process.on('SIGTERM', async () => { server.close(); await pool?.end(); process.exit(0) })
