import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = file => fs.readFile(path.join(root, file), 'utf8')
const catalog = async () => JSON.parse(await read('data/catalog.json'))
const latestSlug = 'capacitacion-retencion-talento-etrr'
const praxisSlug = 'finanzas-corporativas-praxis'

test('01 · conserva los beneficios existentes e incorpora seis nuevas fichas hasta 32', async () => {
  const items = await catalog()
  assert.equal(items.length, 32)
  assert.equal(JSON.parse(await read('data/initial-benefits.json')).length, 32)
  assert.ok(items.some(item => item.slug === praxisSlug))
})

test('02 · mantiene 13 rubros funcionales con tres nuevas categorías', async () => {
  const items = await catalog()
  assert.equal(new Set(items.map(item => item.category)).size, 13)
})

test('03 · todos los beneficios están activos y los slugs son únicos', async () => {
  const items = await catalog()
  assert.ok(items.every(item => item.status === 'activo'))
  assert.equal(new Set(items.map(item => item.slug)).size, 32)
})

test('04 · Escuela Técnica Roberto Rocca se conserva sin cambios de rubro', async () => {
  const items = await catalog()
  const latest = items.find(item => item.slug === latestSlug)
  assert.ok(latest)
  assert.equal(latest.partner, 'Escuela Técnica Roberto Rocca')
  assert.equal(latest.category, 'Capacitación y talento')
})

test('05 · no reaparece el filtro Acuerdos nuevos y el botón apunta al nuevo acuerdo Affinity', async () => {
  const app = await read('src/App.jsx')
  assert.doesNotMatch(app, /'Acuerdos nuevos'/)
  assert.match(app, /Descubrir beneficios de nuevos acuerdos/)
  assert.match(app, /affinity-broker-seguros-condiciones-preferenciales/)
})

test('06 · Actualizar versión sigue trabajando dentro del portal', async () => {
  const app = await read('src/App.jsx')
  assert.match(app, /getRegistrations\(\)/)
  assert.match(app, /caches\.keys\(\)/)
  assert.match(app, /window\.location\.reload\(\)/)
  assert.doesNotMatch(app, /href="\/actualizar-version"/)
})

test('07 · la vista móvil conserva una sola columna de tarjetas', async () => {
  const styles = await read('src/styles.css')
  assert.match(styles, /@media \(max-width: 650px\)[\s\S]*\.neo-grid \{ grid-template-columns: 1fr; \}/)
})

test('08 · Neon preserva CRUD y suma contactos y múltiples convenios editables', async () => {
  const server = await read('server/index.js')
  const schema = await read('server/schema.sql')
  assert.match(server, /ON CONFLICT \(slug\) DO UPDATE SET/)
  assert.match(server, /company_contacts/)
  assert.match(server, /agreement_links/)
  assert.match(schema, /company_contacts JSONB/)
  assert.match(schema, /agreement_links JSONB/)
  assert.match(schema, /ADD COLUMN IF NOT EXISTS agreement_links/)
})

test('09 · el catálogo local continúa como respaldo sin borrar Neon', async () => {
  const server = await read('server/index.js')
  assert.match(server, /async function readLocalCatalog/)
  assert.match(server, /El servicio continuará con Neon/)
  assert.match(server, /return \[\]/)
})

test('10 · versión y generación 3.5.1 son coherentes', async () => {
  const pkg = JSON.parse(await read('package.json'))
  const server = await read('server/index.js')
  const html = await read('index.html')
  assert.equal(pkg.name, 'beneficios-uic')
  assert.equal(pkg.version, '3.5.1')
  assert.match(server, /BENEFICIOS_UIC_351/)
  assert.match(html, /BENEFICIOS_UIC_351/)
})

test('11 · control anticaché y neutralización de service workers siguen activos', async () => {
  const server = await read('server/index.js')
  assert.match(server, /no-store, no-cache, must-revalidate/)
  assert.match(server, /'\/sw\.js'/)
  assert.match(server, /self\.registration\.unregister\(\)/)
})

test('12 · detalle duplica textos pequeños y agrega directorio de contactos', async () => {
  const app = await read('src/App.jsx')
  const styles = await read('src/styles.css')
  assert.match(app, /neo-contact-directory/)
  assert.match(app, /CompanyContactsEditor/)
  assert.match(app, /Agregar contacto/)
  assert.match(styles, /neo-detail-body section > span[\s\S]*font-size: 18px/)
  assert.match(styles, /neo-contact-directory-grid/)
})

test('13 · Praxis está en Gestión empresarial y Render conserva el servicio actual', async () => {
  const items = await catalog()
  const praxis = items.find(item => item.slug === praxisSlug)
  const render = await read('render.yaml')
  assert.equal(praxis?.partner, 'Praxis Finanzas')
  assert.equal(praxis?.category, 'Gestión empresarial')
  assert.match(praxis?.agreementUrl || '', /uic-campana\.com\.ar/)
  assert.match(render, /startCommand: npm start/)
  assert.match(render, /healthCheckPath: \/api\/health/)
})


test('14 · administración incorpora buscador flexible por beneficio, empresa y palabras clave', async () => {
  const app = await read('src/App.jsx')
  const styles = await read('src/styles.css')
  assert.match(app, /Buscar beneficio o empresa/)
  const search = await read('src/search.js')
  assert.match(search, /normalizeSearch/)
  assert.match(app, /rankBenefits/)
  assert.match(search, /searchScore/)
  assert.match(search, /fuzzyTokenMatch/)
  assert.match(styles, /\.neo-admin-search/)
  assert.match(styles, /\.neo-admin-no-results/)
})

test('15 · cabecera usa el logo UIC oficial incluido en la entrega', async () => {
  const app = await read('src/App.jsx')
  const logo = await fs.readFile(path.join(root, 'public/logo-uic-oficial.jpeg'))
  assert.match(app, /logo-uic-oficial\.jpeg/)
  assert.match(app, /alt="Unión Industrial de Campana"/)
  assert.ok(logo.length > 10000)
})

test('16 · empresa o prestador recibe mayor jerarquía visual', async () => {
  const styles = await read('src/styles.css')
  assert.match(styles, /\.neo-card-company[\s\S]*font-size: 19px[\s\S]*font-weight: 900/)
  assert.match(styles, /\.neo-detail-hero p[\s\S]*font-size: 22px[\s\S]*font-weight: 850/)
  assert.match(styles, /\.neo-admin-list > button span[\s\S]*font-size: 12px[\s\S]*font-weight: 750/)
})

test('17 · auditoría mantiene Neon con migración aditiva y refuerza casos límite', async () => {
  const server = await read('server/index.js')
  assert.match(server, /CASE WHEN COALESCE\(benefits\.agreement_url/)
  assert.match(server, /ELSE benefits\.external_image_url END/)
  assert.match(server, /localCatalog\.filter\(item => includeHidden \|\| item\.published !== false\)/)
  assert.match(server, /El título debe contener letras o números/)
  assert.match(server, /Beneficio no encontrado/)
})

test('18 · asociación queda unificada como Hacete socio', async () => {
  const app = await read('src/App.jsx')
  assert.match(app, />Hacete socio</)
  assert.doesNotMatch(app, />Consultar asociación/)
})



test('19 · los 32 beneficios quedan completos con contacto, convenio e imagen', async () => {
  const items = await catalog()
  assert.equal(items.length, 32)
  for (const item of items) {
    assert.ok(Array.isArray(item.companyContacts) && item.companyContacts.length > 0, `${item.slug}: falta contacto`)
    assert.ok(item.companyContacts.some(contact => contact.name && contact.email), `${item.slug}: falta nombre/correo`)
    assert.ok(Array.isArray(item.agreementLinks) && item.agreementLinks.length > 0, `${item.slug}: falta convenio`)
    assert.ok(item.agreementLinks.every(link => link.label && /^https:\/\//.test(link.url)), `${item.slug}: enlace inválido`)
    assert.match(item.externalImageUrl || '', /^\/benefits\/.+\.(?:svg|png|jpe?g|webp)$/i, `${item.slug}: falta imagen de respaldo`)
  }
})

test('20 · Paseo Gavazzi corrige SYGSA y muestra juntos los dos convenios', async () => {
  const items = await catalog()
  const item = items.find(x => x.slug === 'paseo-gavazzi-sigsa-cadema')
  assert.equal(item?.partner, 'Paseo Gavazzi · SYGSA S.A. · CADEMA')
  assert.equal(item?.agreementLinks?.length, 2)
  assert.ok(item.agreementLinks.some(link => /SYGSA/.test(link.label)))
  assert.ok(item.agreementLinks.some(link => /CADEMA/.test(link.label)))
})

test('Villa Dálmine queda como beneficio 26 con contactos e imagen', async () => {
  const items = JSON.parse(await read('data/catalog.json'))
  const item = items.find(x => x.slug === 'club-villa-dalmine-beneficios-uic')
  assert.ok(item)
  assert.equal(item.partner, 'Club Villa Dálmine')
  assert.equal(item.companyContacts[0].email, 'secretaria@villadalmine.com.ar')
  assert.match(item.externalImageUrl, /^\/benefits\/.+\.(?:svg|png|jpe?g|webp)$/i)
  assert.equal(new Set(items.map(x => x.category)).size, 13)
})


test('21 · v3.5.1 conserva búsqueda pública e identidad industrial premium', async () => {
  const app = await read('src/App.jsx')
  const styles = await read('src/styles.css')
  const pattern = await fs.readFile(path.join(root, 'public/industrial-uic-pattern.svg'), 'utf8')
  assert.match(app, /Búsqueda flexible/)
  assert.match(app, /Buscá Dálmine, seguros, Talento PyME, ADERPE, solar/)
  assert.match(app, /rankBenefits\(categoryItems, query\)/)
  assert.match(styles, /industrial-uic-pattern\.svg/)
  assert.match(styles, /neo-hero-signals/)
  assert.match(pattern, /<svg/)
})

test('22 · motor de búsqueda encuentra Dálmine por tilde, fragmento y pequeño error', async () => {
  const { rankBenefits } = await import('../src/search.js')
  const items = await catalog()
  for (const query of ['Dálmine', 'Dalmine', 'dalmi', 'dalmnie']) {
    const results = rankBenefits(items, query)
    assert.equal(results[0]?.slug, 'club-villa-dalmine-beneficios-uic', query)
  }
})

test('23 · motor de búsqueda indexa rubros, contactos y palabras del contenido', async () => {
  const { rankBenefits } = await import('../src/search.js')
  const items = await catalog()
  assert.equal(rankBenefits(items, 'CADEMA')[0]?.slug, 'paseo-gavazzi-sigsa-cadema')
  assert.equal(rankBenefits(items, 'Jimena')[0]?.slug, 'asesoramiento-legal-innova-lex')
  assert.equal(rankBenefits(items, 'solar')[0]?.slug, 'energia-solar-grupo-solper')
  assert.ok(rankBenefits(items, 'medio ambiente').some(item => item.category === 'Ambiente y sustentabilidad'))
})


test('24 · nuevas categorías y seis incorporaciones quedan presentes', async () => {
  const items = await catalog()
  const categories = new Set(items.map(item => item.category))
  assert.ok(categories.has('Broker de seguros'))
  assert.ok(categories.has('Beneficios digitales'))
  assert.ok(categories.has('Acuerdos institucionales'))
  for (const slug of [
    'affinity-broker-seguros-condiciones-preferenciales',
    'app-uic-comunicacion-servicios-acceso',
    'talento-pyme-plataforma-vinculacion-laboral',
    'requerimientos-institucionales-cpf',
    'portal-beneficios-uic-digital',
    'convenio-marco-aderpe-uic'
  ]) assert.ok(items.some(item => item.slug === slug), slug)
})

test('25 · Affinity conserva contacto y enlace suministrados', async () => {
  const item = (await catalog()).find(x => x.slug === 'affinity-broker-seguros-condiciones-preferenciales')
  assert.equal(item.companyContacts[0].phone, '+54 9 11 5455-0732')
  assert.equal(item.companyContacts[0].email, 'comercial@affinitybroker.com.ar')
  assert.match(item.agreementUrl, /affinity-broker-seguros/)
})

test('26 · las seis nuevas fichas usan imágenes locales adjuntas', async () => {
  const items = await catalog()
  const slugs = new Set(['affinity-broker-seguros-condiciones-preferenciales','app-uic-comunicacion-servicios-acceso','talento-pyme-plataforma-vinculacion-laboral','requerimientos-institucionales-cpf','portal-beneficios-uic-digital','convenio-marco-aderpe-uic'])
  for (const item of items.filter(x => slugs.has(x.slug))) {
    assert.match(item.externalImageUrl, /^\/benefits\/.+\.png$/)
    const local = path.join(root, 'public', item.externalImageUrl.replace(/^\//, ''))
    assert.ok((await fs.stat(local)).size > 10000, item.slug)
  }
})

test('27 · buscador encuentra las nuevas categorías y nombres', async () => {
  const { rankBenefits } = await import('../src/search.js')
  const items = await catalog()
  assert.equal(rankBenefits(items, 'Affinity')[0]?.slug, 'affinity-broker-seguros-condiciones-preferenciales')
  assert.equal(rankBenefits(items, 'Talento PyME')[0]?.slug, 'talento-pyme-plataforma-vinculacion-laboral')
  assert.ok(rankBenefits(items, 'ADERPE').some(item => item.slug === 'convenio-marco-aderpe-uic'))
  assert.ok(rankBenefits(items, 'seguros').some(item => item.category === 'Broker de seguros'))
})


test('28 · v3.5.1 migra de forma no destructiva la categoría de Affinity en Neon', async () => {
  const server = await read('server/index.js')
  assert.match(server, /affinity-broker-seguros-condiciones-preferenciales/)
  assert.match(server, /benefits\.category = 'Seguros'/)
  assert.match(server, /THEN EXCLUDED\.category/)
  const items = await catalog()
  const affinity = items.find(item => item.slug === 'affinity-broker-seguros-condiciones-preferenciales')
  assert.equal(affinity.category, 'Broker de seguros')
})
