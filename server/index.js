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
const GENERATION = 'BENEFICIOS_UIC_393'
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
const diffusionConfig = await readJsonData('diffusion-config.json', { approvalEmail: 'tesoreria@uic-campana.com.ar', maintenanceContact: { name: 'María José Godoy (Majo)', phone: '3489 65 0104', email: 'tesoreria@uic-campana.com.ar' }, companyOverrides: {}, testCompanies: [] })
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
async function massDiffusionEnabled() {
  if (pool && databaseAvailable) {
    try {
      const result = await pool.query('SELECT mass_send_enabled FROM diffusion_mail_settings WHERE id=1')
      if (result.rows[0]) return Boolean(result.rows[0].mass_send_enabled)
    } catch {}
  }
  return String(process.env.DIFFUSION_MASS_SEND_ENABLED || '').toLowerCase() === 'true'
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
    testRecipient: process.env.DIFFUSION_TEST_RECIPIENT || '', massSendEnabled: String(process.env.DIFFUSION_MASS_SEND_ENABLED || '').toLowerCase()==='true'
  }
  if (!pool || !databaseAvailable) return fallback
  try {
    const result = await pool.query('SELECT * FROM diffusion_mail_settings WHERE id=1'); const row=result.rows[0]; if(!row) return fallback
    const storedPassword=decryptMailSecret(row.smtp_password_encrypted)
    return { host:row.smtp_host||fallback.host, port:Number(row.smtp_port||fallback.port), secure:Boolean(row.smtp_secure), username:row.smtp_user||fallback.username,
      password:storedPassword||fallback.password, fromEmail:row.from_email||fallback.fromEmail, fromName:row.from_name||fallback.fromName,
      testRecipient:row.test_recipient||fallback.testRecipient, massSendEnabled:Boolean(row.mass_send_enabled) }
  } catch { return fallback }
}
async function createMailer() {
  const config=await diffusionMailSettings(); if(!config.username||!config.password||!config.host||!config.port) return null
  return { transporter:nodemailer.createTransport({host:config.host,port:Number(config.port),secure:Boolean(config.secure),auth:{user:config.username,pass:config.password}}), config }
}
function campaignSubject(companyName) { return `Nuevo beneficio exclusivo UIC · ${safeText(companyName, 180)}` }
function unsubscribeToken(recipient) { return codeHash(`${recipient.id}:${normalizeEmail(recipient.email)}`, 'unsubscribe') }
function publicBaseUrl(req) { return String(process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/,'') }
function campaignEmailHtml(campaign, inlineFiles = [], unsubscribeUrl = '') {
  const family=['Arial','Verdana','Tahoma','Georgia'].includes(campaign.font_family)?campaign.font_family:'Arial'; const size=campaign.font_size==='large'?18:campaign.font_size==='small'?13:15
  const inlineHtml=inlineFiles.length?`<div style="margin:22px 0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">${inlineFiles.map((f,i)=>`<div style="border:1px solid #d8e4eb;border-radius:10px;padding:8px;text-align:center"><img src="cid:${f.cid}" alt="Figura ${i+1}" style="display:block;max-width:100%;max-height:520px;margin:auto;object-fit:contain"><div style="font-size:11px;color:#6b7f8c;margin-top:6px">Figura ${i+1}</div></div>`).join('')}</div>`:''
  const signature=`<div style="margin-top:24px;padding-top:16px;border-top:1px solid #d9e5eb"><strong>${safeText(campaign.originator_name||campaign.company_name,200)}</strong>${campaign.originator_role?`<br><span>${safeText(campaign.originator_role,160)}</span>`:''}${campaign.originator_email?`<br><a href="mailto:${safeText(campaign.originator_email,250)}">${safeText(campaign.originator_email,250)}</a>`:''}${campaign.originator_phone?`<br><span>${safeText(campaign.originator_phone,100)}</span>`:''}</div>`
  const unsubscribe=unsubscribeUrl?`<p style="font-size:12px;color:#60798b;margin-top:18px">Si no desea seguir recibiendo estas comunicaciones, <a href="${unsubscribeUrl}">presione aquí para deshabilitar futuros envíos</a>.</p>`:''
  return `<div style="font-family:${family},sans-serif;font-size:${size}px;line-height:1.55;color:#15324a;max-width:760px;margin:auto"><div style="border-bottom:4px solid #159bc7;padding:0 0 16px"><strong style="font-size:22px">UNIÓN INDUSTRIAL DE CAMPANA</strong><br><span style="color:#527286">BENEFICIOS PARA SOCIOS</span></div><h2>${safeText(campaign.subject,300)}</h2><p><strong>Empresa:</strong> ${safeText(campaign.company_name,250)}<br><strong>Beneficio:</strong> ${safeText(campaign.benefit_title,300)}</p>${markupToHtml(campaign.body_markup)}${inlineHtml}${signature}${unsubscribe}<hr><p style="font-size:12px;color:#60798b">Comunicación emitida a través del Portal de Beneficios de la Unión Industrial de Campana. Las condiciones particulares deberán confirmarse con la empresa prestadora.</p></div>`
}
async function campaignMedia(campaignId) {
  const result=await pool.query('SELECT id,filename,mime_type,file_data,placement,position FROM diffusion_campaign_files WHERE campaign_id=$1 ORDER BY placement DESC, position, id',[campaignId])
  const inlineFiles=result.rows.filter(r=>r.placement==='inline').map((r,i)=>({filename:r.filename,content:r.file_data,contentType:r.mime_type,cid:`uic-inline-${campaignId}-${r.id}-${i}`,contentDisposition:'inline'}))
  const attachments=result.rows.filter(r=>r.placement!=='inline').map(r=>({filename:r.filename,content:r.file_data,contentType:r.mime_type}))
  return {inlineFiles,attachments,all:[...inlineFiles,...attachments]}
}
async function sendDiffusionMail({to, subject, html, attachments=[]}) {
  const mailer=await createMailer(); if(!mailer){const error=new Error('La casilla emisora todavía no está configurada o no pudo autenticarse.');error.status=503;throw error}
  const from=mailer.config.fromName?`"${mailer.config.fromName.replace(/["<>]/g,'')}" <${mailer.config.fromEmail}>`:mailer.config.fromEmail
  return mailer.transporter.sendMail({from,to,subject,html,attachments})
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
  try{const companies=await buildDiffusionCompanies();res.json(companies.map(c=>({key:c.key,name:c.name,benefitCount:c.benefits.length,benefits:c.benefits,hasRegisteredEmail:c.hasRegisteredEmail})))}catch(error){next(error)}
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
  const mail = await diffusionMailSettings()
  res.json({
    databaseAvailable: Boolean(pool && databaseAvailable), massSendEnabled: await massDiffusionEnabled(), sendEnabled: await massDiffusionEnabled(),
    testSendEnabled: Boolean(mail.username && mail.password), mailConfigured: Boolean(mail.username && mail.password),
    fromEmail: mail.fromEmail, approvalEmail: process.env.DIFFUSION_APPROVAL_EMAIL || diffusionConfig.approvalEmail || 'tesoreria@uic-campana.com.ar',
    pilotCompanyKey: PILOT_COMPANY_KEY, maintenanceContact: diffusionConfig.maintenanceContact, accessRole: 'admin'
  })
})

app.get('/api/admin/difusion/mail-settings', requireAdmin, requireDiffusionDatabase, async (_req, res, next) => {
  try {
    const mail = await diffusionMailSettings()
    res.json({ host: mail.host, port: mail.port, secure: mail.secure, username: mail.username, fromEmail: mail.fromEmail, fromName: mail.fromName, testRecipient: mail.testRecipient, passwordConfigured: Boolean(mail.password), massSendEnabled: await massDiffusionEnabled() })
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

app.put('/api/admin/difusion/mass-send', requireAdmin, requireDiffusionDatabase, async (req,res,next)=>{
  try{const enabled=Boolean(req.body.enabled);const confirm=String(req.body.confirm||'').trim().toUpperCase();if(enabled&&confirm!=='HABILITAR')return res.status(400).json({error:'Para habilitar el padrón general escribí HABILITAR.'});await pool.query('UPDATE diffusion_mail_settings SET mass_send_enabled=$1,updated_at=NOW() WHERE id=1',[enabled]);res.json({massSendEnabled:enabled})}catch(error){next(error)}
})
app.post('/api/admin/difusion/mail-settings/test', requireAdmin, requireDiffusionDatabase, async (req,res,next)=>{
  try {
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
    const companyKey=safeText(req.body.companyKey,160);if(!actorCanUseCompany(req,companyKey))return res.status(403).json({error:'No tenés acceso a esta empresa.'});const company=await findDiffusionCompany(companyKey);if(!company)return res.status(404).json({error:'Empresa no encontrada.'})
    const benefitSlug=safeText(req.body.benefitSlug,180);const benefit=company.benefits.find(b=>b.slug===benefitSlug);if(!benefit)return res.status(403).json({error:'El beneficio no corresponde a esta empresa.'})
    let originatorEmail=req.diffusionActor?.type==='company'?normalizeEmail(req.diffusionActor.email):normalizeEmail(req.body.originatorEmail);const allowedEmails=authorizedCompanyEmails(company);if(!validEmail(originatorEmail)||!allowedEmails.includes(originatorEmail))return res.status(403).json({error:'El correo de origen no coincide con un contacto registrado para esta empresa.'})
    const contact=company.contacts.find(c=>normalizeEmail(c.email)===originatorEmail)||{};const originatorName=safeText(contact.name||req.body.originatorName||company.contactName||company.name,200);const originatorPhone=safeText(contact.phone||company.phone||'',100);const originatorRole=safeText(contact.role||company.role||'',160)
    const subject=campaignSubject(company.name);const bodyMarkup=plainMarkup(req.body.bodyMarkup);const fontFamily=['Arial','Verdana','Tahoma','Georgia'].includes(req.body.fontFamily)?req.body.fontFamily:'Arial';const fontSize=['small','normal','large'].includes(req.body.fontSize)?req.body.fontSize:'normal';if(!bodyMarkup)return res.status(400).json({error:'Escribí el cuerpo de la comunicación.'})
    const attachments=req.files?.attachments||[];const inlineImages=req.files?.inlineImages||[];const allowedAttach=new Set(['image/jpeg','image/png','application/pdf']);const allowedInline=new Set(['image/jpeg','image/png']);if(attachments.some(f=>!allowedAttach.has(f.mimetype)||!fileSignatureMatches(f))||inlineImages.some(f=>!allowedInline.has(f.mimetype)||!fileSignatureMatches(f)))return res.status(400).json({error:'Los adjuntos admiten JPG, PNG o PDF; las imágenes del cuerpo admiten JPG o PNG.'})
    const safety=assessCampaign(subject,bodyMarkup,[...attachments,...inlineImages]);await pool.query(`DELETE FROM diffusion_campaigns WHERE company_key=$1 AND benefit_slug=$2 AND status IN ('draft','pending','rejected','blocked')`,[companyKey,benefitSlug])
    const result=await pool.query(`INSERT INTO diffusion_campaigns (company_key,company_name,benefit_slug,benefit_title,originator_name,originator_email,originator_phone,originator_role,subject,body_markup,font_family,font_size,status,safety_status,safety_notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,[companyKey,company.name,benefit.slug,benefit.title,originatorName,originatorEmail,originatorPhone,originatorRole,subject,bodyMarkup,fontFamily,fontSize,safety.status==='blocked'?'blocked':'draft',safety.status,safety.notes])
    let pos=0;for(const file of inlineImages)await pool.query(`INSERT INTO diffusion_campaign_files (campaign_id,filename,mime_type,size_bytes,file_data,placement,position) VALUES ($1,$2,$3,$4,$5,'inline',$6)`,[result.rows[0].id,safeText(file.originalname,250),file.mimetype,file.size,file.buffer,pos++]);pos=0;for(const file of attachments)await pool.query(`INSERT INTO diffusion_campaign_files (campaign_id,filename,mime_type,size_bytes,file_data,placement,position) VALUES ($1,$2,$3,$4,$5,'attachment',$6)`,[result.rows[0].id,safeText(file.originalname,250),file.mimetype,file.size,file.buffer,pos++])
    res.status(201).json({...result.rows[0],files:[...inlineImages.map(f=>({filename:f.originalname,mimeType:f.mimetype,sizeBytes:f.size,placement:'inline'})),...attachments.map(f=>({filename:f.originalname,mimeType:f.mimetype,sizeBytes:f.size,placement:'attachment'}))]})
  }catch(error){next(error)}
})
async function getCampaign(id){const result=await pool.query('SELECT * FROM diffusion_campaigns WHERE id=$1',[id]);return result.rows[0]||null}
async function cooldownFor(companyKey,benefitSlug){const result=await pool.query(`SELECT next_allowed_at FROM diffusion_campaigns WHERE company_key=$1 AND benefit_slug=$2 AND status='sent' AND next_allowed_at IS NOT NULL ORDER BY sent_at DESC LIMIT 1`,[companyKey,benefitSlug]);return result.rows[0]?.next_allowed_at||null}
app.get('/api/admin/difusion/campaigns',requireAdmin,requireDiffusionDatabase,async(req,res,next)=>{try{const status=safeText(req.query.status,30);const result=await pool.query(`SELECT c.*,COALESCE((SELECT json_agg(json_build_object('filename',f.filename,'mimeType',f.mime_type,'sizeBytes',f.size_bytes,'placement',f.placement) ORDER BY f.position,f.id) FROM diffusion_campaign_files f WHERE f.campaign_id=c.id),'[]'::json) AS files FROM diffusion_campaigns c ${status?'WHERE c.status=$1':''} ORDER BY c.created_at DESC LIMIT 100`,status?[status]:[]);res.json(result.rows)}catch(error){next(error)}})
app.post('/api/admin/difusion/campaigns/:id/test',requireDiffusionActor,requireDiffusionDatabase,async(req,res,next)=>{
  try{const id=safeId(req.params.id);const campaign=id?await getCampaign(id):null;if(!campaign)return res.status(404).json({error:'Comunicación no encontrada'});if(!campaignOwnedByActor(req,campaign))return res.status(403).json({error:'No tenés acceso a esta comunicación.'});if(campaign.safety_status==='blocked')return res.status(400).json({error:'El contenido fue bloqueado por el control automático y debe corregirse.'});const code=sixDigitCode();const expires=new Date(Date.now()+30*60*1000);const media=await campaignMedia(id);const html=campaignEmailHtml(campaign,media.inlineFiles);await sendDiffusionMail({to:campaign.originator_email,subject:`[PRUEBA · NO ENVIADO A SOCIOS] ${campaign.subject}`,html:`<div style="background:#fff5cc;padding:14px;border:1px solid #e8c44a"><strong>PRUEBA DE DIFUSIÓN UIC</strong><br>Este envío es sólo para revisar la publicación. No consume el cupo mensual y no fue enviado a socios.<div style="margin-top:14px;font-size:13px">Para confirmar que este correo pertenece realmente a la empresa, copiá este código en el Portal:</div><div style="font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;padding:14px">${code}</div><small>Vence en 30 minutos y cambia en cada nueva prueba.</small></div>${html}`,attachments:media.all});const result=await pool.query(`UPDATE diffusion_campaigns SET test_sent_at=NOW(),test_code_hash=$2,test_code_expires_at=$3,test_verified_at=NULL,updated_at=NOW() WHERE id=$1 RETURNING *`,[id,codeHash(code,`campaign-test:${id}:${campaign.originator_email}`),expires]);res.json({...result.rows[0],testCodeRequired:true})}catch(error){next(error)}
})
app.post('/api/admin/difusion/campaigns/:id/verify-test',requireDiffusionActor,requireDiffusionDatabase,async(req,res,next)=>{
  try{const id=safeId(req.params.id);const campaign=id?await getCampaign(id):null;if(!campaign)return res.status(404).json({error:'Comunicación no encontrada'});if(!campaignOwnedByActor(req,campaign))return res.status(403).json({error:'No tenés acceso a esta comunicación.'});const code=safeText(req.body.code,12);if(!/^\d{6}$/.test(code))return res.status(400).json({error:'Ingresá los 6 dígitos recibidos en el correo de prueba.'});if(!campaign.test_code_hash||!campaign.test_code_expires_at||new Date(campaign.test_code_expires_at)<=new Date()||!safeEqualText(campaign.test_code_hash,codeHash(code,`campaign-test:${id}:${campaign.originator_email}`)))return res.status(400).json({error:'El código es incorrecto o venció. Enviá una nueva prueba para generar otro.'});const result=await pool.query(`UPDATE diffusion_campaigns SET test_verified_at=NOW(),test_code_hash='',test_code_expires_at=NULL,updated_at=NOW() WHERE id=$1 RETURNING *`,[id]);res.json(result.rows[0])}catch(error){next(error)}
})
app.post('/api/admin/difusion/campaigns/:id/request-approval',requireDiffusionActor,requireDiffusionDatabase,async(req,res,next)=>{
  try{const id=safeId(req.params.id);const campaign=id?await getCampaign(id):null;if(!campaign)return res.status(404).json({error:'Comunicación no encontrada'});if(!campaignOwnedByActor(req,campaign))return res.status(403).json({error:'No tenés acceso a esta comunicación.'});if(campaign.safety_status==='blocked')return res.status(400).json({error:'El contenido fue bloqueado por seguridad.'});if(!campaign.test_sent_at||!campaign.test_verified_at)return res.status(400).json({error:'Primero enviá la prueba y verificá el código de 6 dígitos recibido por la empresa.'});const nextAllowed=await cooldownFor(campaign.company_key,campaign.benefit_slug);if(nextAllowed&&new Date(nextAllowed)>new Date())return res.status(409).json({error:`Este beneficio podrá volver a solicitar envío a partir del ${new Date(nextAllowed).toLocaleDateString('es-AR')}.`,nextAllowed});const approvalEmail=process.env.DIFFUSION_APPROVAL_EMAIL||diffusionConfig.approvalEmail||'tesoreria@uic-campana.com.ar';const media=await campaignMedia(id);await sendDiffusionMail({to:approvalEmail,subject:`[VALIDACIÓN PENDIENTE] ${campaign.company_name} · ${campaign.subject}`,html:`<div style="background:#e9f5fb;padding:12px;border:1px solid #52a8cf"><strong>VALIDACIÓN REQUERIDA</strong><br>La empresa recibió la prueba y verificó correctamente el código enviado a su correo registrado. Esta comunicación NO fue enviada a socios.</div>${campaignEmailHtml(campaign,media.inlineFiles)}`,attachments:media.all});const result=await pool.query(`UPDATE diffusion_campaigns SET status='pending',approval_requested_at=NOW(),updated_at=NOW() WHERE id=$1 RETURNING *`,[id]);res.json(result.rows[0])}catch(error){next(error)}
})
app.post('/api/admin/difusion/campaigns/:id/reject',requireAdmin,requireDiffusionDatabase,async(req,res,next)=>{try{const id=safeId(req.params.id);if(!id)return res.status(400).json({error:'Comunicación inválida'});const result=await pool.query(`UPDATE diffusion_campaigns SET status='rejected',rejected_at=NOW(),safety_notes=$2,updated_at=NOW() WHERE id=$1 AND status='pending' RETURNING *`,[id,safeText(req.body.reason,500)||'Rechazada por validación administrativa.']);if(!result.rows[0])return res.status(409).json({error:'La comunicación ya no está pendiente.'});res.json(result.rows[0])}catch(error){next(error)}})
app.post('/api/admin/difusion/campaigns/:id/approve',requireAdmin,requireDiffusionDatabase,async(req,res,next)=>{
  try{
    const massEnabled=await massDiffusionEnabled();const requiredWord=massEnabled?'ENVIAR':'VALIDAR';if(String(req.body.confirm||'').trim().toUpperCase()!==requiredWord)return res.status(400).json({error:`Para evitar acciones accidentales escribí ${requiredWord} en la confirmación.`});const id=safeId(req.params.id);const campaign=id?await getCampaign(id):null;if(!campaign||campaign.status!=='pending')return res.status(409).json({error:'La comunicación no está pendiente de validación.'});if(campaign.safety_status==='blocked'||!campaign.test_verified_at)return res.status(400).json({error:'La comunicación no superó todos los controles previos.'});const nextAllowed=await cooldownFor(campaign.company_key,campaign.benefit_slug);if(nextAllowed&&new Date(nextAllowed)>new Date())return res.status(409).json({error:`Este beneficio podrá volver a enviar a partir del ${new Date(nextAllowed).toLocaleDateString('es-AR')}.`,nextAllowed})
    const media=await campaignMedia(id);const baseHtml=campaignEmailHtml(campaign,media.inlineFiles);await sendDiffusionMail({to:campaign.originator_email,subject:campaign.subject,html:`<div style="background:#e9f8ef;padding:12px;border:1px solid #8ac7a4"><strong>PUBLICACIÓN VALIDADA POR UIC</strong><br>Esta copia confirma que la comunicación fue validada.</div>${baseHtml}`,attachments:media.all})
    const pilot=diffusionConfig.testCompanies?.find(c=>c.key===PILOT_COMPANY_KEY);const pilotEmail=normalizeEmail(pilot?.email);const origin=normalizeEmail(campaign.originator_email)
    if(!massEnabled){let pilotRecipients=0;if(validEmail(pilotEmail)&&pilotEmail!==origin){await sendDiffusionMail({to:pilotEmail,subject:`[PILOTO MASIVO] ${campaign.subject}`,html:`<div style="background:#eef7fb;padding:12px;border:1px solid #7cb7d2"><strong>PILOTO DE DISTRIBUCIÓN</strong><br>El padrón general está deshabilitado. Tecno Logisti-K SA es el único destino de control masivo.</div>${baseHtml}`,attachments:media.all});pilotRecipients=1}const result=await pool.query(`UPDATE diffusion_campaigns SET status='approved_pilot',approved_at=NOW(),recipient_count=$2,updated_at=NOW() WHERE id=$1 RETURNING *`,[id,pilotRecipients]);return res.json({...result.rows[0],sentToOriginator:true,pilotMassRecipients:pilotRecipients,massSent:false,pilot:true})}
    const rows=(await pool.query(`SELECT id,company_name,contact_name,email,phone FROM diffusion_recipients WHERE enabled=TRUE AND email_valid=TRUE AND email<>'' AND opted_out_at IS NULL ORDER BY company_name,id`)).rows;const byEmail=new Map();for(const r of rows){const e=normalizeEmail(r.email);if(validEmail(e)&&!byEmail.has(e))byEmail.set(e,r)};if(validEmail(pilotEmail)&&!byEmail.has(pilotEmail)){const pilotRow=(await pool.query('SELECT id,company_name,contact_name,email,phone FROM diffusion_recipients WHERE lower(email)=lower($1) ORDER BY id LIMIT 1',[pilotEmail])).rows[0];if(pilotRow)byEmail.set(pilotEmail,pilotRow)};byEmail.delete(origin);byEmail.delete(normalizeEmail(process.env.DIFFUSION_APPROVAL_EMAIL||diffusionConfig.approvalEmail||'tesoreria@uic-campana.com.ar'))
    let sent=0;const base=publicBaseUrl(req);for(const [email,recipient] of byEmail){const token=unsubscribeToken(recipient);const unsubscribe=`${base}/api/difusion/unsubscribe?id=${recipient.id}&token=${encodeURIComponent(token)}`;await sendDiffusionMail({to:email,subject:campaign.subject,html:campaignEmailHtml(campaign,media.inlineFiles,unsubscribe),attachments:media.all});sent++}
    const sentAt=new Date();const nextAllowedAt=addCalendarMonth(sentAt);const result=await pool.query(`UPDATE diffusion_campaigns SET status='sent',approved_at=NOW(),sent_at=$2,next_allowed_at=$3,recipient_count=$4,body_markup='',content_deleted_at=NOW(),updated_at=NOW() WHERE id=$1 RETURNING *`,[id,sentAt,nextAllowedAt,sent]);await pool.query('DELETE FROM diffusion_campaign_files WHERE campaign_id=$1',[id]);res.json({...result.rows[0],sentToOriginator:true,recipients:sent,massSent:true,pilot:false})
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


app.get('/api/difusion/unsubscribe', requireDiffusionDatabase, async(req,res,next)=>{
  try{const id=safeId(req.query.id);const token=String(req.query.token||'');if(!id||!token)return res.status(400).type('html').send('<h2>Enlace inválido</h2>');const result=await pool.query('SELECT * FROM diffusion_recipients WHERE id=$1',[id]);const recipient=result.rows[0];if(!recipient||!safeEqualText(token,unsubscribeToken(recipient)))return res.status(400).type('html').send('<h2>El enlace no es válido o ya no corresponde a este destinatario.</h2>');if(slugify(recipient.company_name)===PILOT_COMPANY_KEY)return res.type('html').send('<div style="font-family:Arial;padding:40px;max-width:700px;margin:auto"><h2>TECNO LOGISTI-K SA permanece habilitada como destino de control UIC.</h2><p>Para modificar esta condición comuníquese con Administración UIC.</p></div>');await pool.query(`UPDATE diffusion_recipients SET enabled=FALSE,opted_out_at=NOW(),opted_out_reason='Deshabilitado por el destinatario desde el enlace del correo.',updated_at=NOW() WHERE id=$1`,[id]);res.type('html').send('<div style="font-family:Arial;padding:40px;max-width:700px;margin:auto"><h2>Recepción deshabilitada</h2><p>Su dirección fue deshabilitada para futuras comunicaciones del módulo Difusión de Beneficios UIC.</p><p>Si necesita revertir esta decisión, comuníquese con Administración UIC.</p></div>')}catch(error){next(error)}
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
