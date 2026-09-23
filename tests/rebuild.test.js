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

test('01 · conserva el catálogo v3.6.0 e incorpora 3 beneficios nuevos hasta 48', async () => {
  const items = await catalog()
  assert.equal(items.length, 48)
  assert.equal(JSON.parse(await read('data/initial-benefits.json')).length, 48)
  assert.ok(items.some(item => item.slug === praxisSlug))
})

test('02 · mantiene los rubros existentes y suma Eventos y exposiciones', async () => {
  const items = await catalog()
  const categories = new Set(items.map(item => item.category))
  assert.equal(categories.size, 15)
  assert.ok(categories.has('UIPBA'))
  assert.ok(categories.has('Eventos y exposiciones'))
})

test('03 · estados y slugs quedan coherentes con la revisión 3.7.1', async () => {
  const items = await catalog()
  assert.equal(items.filter(item => item.status === 'activo').length, 40)
  assert.equal(items.filter(item => item.status === 'revalidacion').length, 8)
  assert.equal(new Set(items.map(item => item.slug)).size, 48)
})

test('04 · Escuela Técnica Roberto Rocca se conserva sin cambios de rubro', async () => {
  const items = await catalog()
  const latest = items.find(item => item.slug === latestSlug)
  assert.ok(latest)
  assert.equal(latest.partner, 'Escuela Técnica Roberto Rocca')
  assert.equal(latest.category, 'Capacitación y talento')
})

test('05 · no reaparece el filtro Acuerdos nuevos y el botón destaca un acuerdo reciente', async () => {
  const app = await read('src/App.jsx')
  assert.doesNotMatch(app, /'Acuerdos nuevos'/)
  assert.match(app, /Descubrir beneficios de nuevos acuerdos/)
  assert.match(app, /red-summa-education-convenio-institucional-uic/)
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

test('10 · versión y generación 3.7.1 son coherentes', async () => {
  const pkg = JSON.parse(await read('package.json'))
  const server = await read('server/index.js')
  const html = await read('index.html')
  assert.equal(pkg.name, 'beneficios-uic')
  assert.equal(pkg.version, '3.7.1')
  assert.match(server, /BENEFICIOS_UIC_371/)
  assert.match(html, /BENEFICIOS_UIC_371/)
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



test('19 · los 48 beneficios quedan completos con contacto, convenio e imagen', async () => {
  const items = await catalog()
  assert.equal(items.length, 48)
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
  assert.equal(new Set(items.map(x => x.category)).size, 15)
})


test('21 · v3.7.1 conserva búsqueda pública e identidad industrial premium', async () => {
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
  assert.equal(rankBenefits(items, 'CADEMA')[0]?.slug, 'cadema-bureau-barrancas-beneficio-uic')
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


test('28 · v3.7.1 conserva la migración no destructiva de Affinity en Neon', async () => {
  const server = await read('server/index.js')
  assert.match(server, /affinity-broker-seguros-condiciones-preferenciales/)
  assert.match(server, /benefits\.category = 'Seguros'/)
  assert.match(server, /THEN EXCLUDED\.category/)
  const items = await catalog()
  const affinity = items.find(item => item.slug === 'affinity-broker-seguros-condiciones-preferenciales')
  assert.equal(affinity.category, 'Broker de seguros')
})


test('29 · categoría UIPBA contiene 13 beneficios con cinco activos y ocho a validar', async () => {
  const items = await catalog()
  const uipba = items.filter(item => item.category === 'UIPBA')
  assert.equal(uipba.length, 13)
  assert.equal(uipba.filter(item => item.status === 'activo').length, 5)
  assert.equal(uipba.filter(item => item.status === 'revalidacion').length, 8)
})

test('30 · Open English usa la pieza adjunta y condiciones comunicadas', async () => {
  const items = await catalog()
  const item = items.find(x => x.slug === 'uipba-open-english-business-80-off')
  assert.ok(item)
  assert.equal(item.status, 'activo')
  assert.match(item.costsDiscounts, /80% OFF/i)
  assert.match(item.costsDiscounts, /2 licencias/i)
  assert.equal(item.companyContacts[0].email, 'asistenciapyme@uipba.org.ar')
  assert.equal(item.externalImageUrl, '/benefits/uipba-open-english-business.png')
  const image = await fs.readFile(path.join(root, 'public/benefits/uipba-open-english-business.png'))
  assert.ok(image.length > 100000)
})

test('31 · portal muestra botón UIPBA y aviso A CHEQUEAR VALIDACIÓN', async () => {
  const app = await read('src/App.jsx')
  const styles = await read('src/styles.css')
  assert.match(app, /name === 'UIPBA'/)
  assert.match(app, /A CHEQUEAR VALIDACIÓN/)
  assert.match(app, /neo-uipba-note/)
  assert.match(app, /neo-validation-panel/)
  assert.match(styles, /\.neo-uipba-category/)
  assert.match(styles, /\.neo-validation/)
})


test('32 · incorpora RED SUMMA como acuerdo institucional con contacto externo y pieza adjunta', async () => {
  const items = await catalog()
  const item = items.find(x => x.slug === 'red-summa-education-convenio-institucional-uic')
  assert.ok(item)
  assert.equal(item.category, 'Acuerdos institucionales')
  assert.match(item.costsDiscounts, /8% adicional/)
  assert.match(item.costsDiscounts, /5% adicional/)
  assert.match(item.costsDiscounts, /60% o más/)
  assert.equal(item.contactName, 'María José Godoy (Majo) – Administración UIC')
  assert.equal(item.companyContacts[0].name, 'Javier Arteaga')
  assert.equal(item.companyContacts[0].email, 'Javier.arteaga@asturias.edu.co')
  const image = await fs.readFile(path.join(root, 'public/benefits/red-summa-uic-education.png'))
  assert.ok(image.length > 100000)
})

test('33 · incorpora CADEMA BUREAU como beneficio inmobiliario empresarial', async () => {
  const items = await catalog()
  const item = items.find(x => x.slug === 'cadema-bureau-barrancas-beneficio-uic')
  assert.ok(item)
  assert.equal(item.category, 'Beneficios inmobiliarios')
  assert.match(item.concreteBenefit, /10%/)
  assert.equal(item.companyContacts[0].phone, '+54 9 3489 36-8518')
  assert.equal(item.companyContacts[0].email, 'ventas@cademaprop.com.ar')
  assert.match(item.agreementUrl, /cademaprop\.com\.ar\/bureau-barrancas-de-campana/)
  const image = await fs.readFile(path.join(root, 'public/benefits/cadema-bureau-barrancas.webp'))
  assert.ok(image.length > 50000)
})

test('34 · incorpora GlobalPorts en Eventos y exposiciones con vencimiento 2026', async () => {
  const items = await catalog()
  const item = items.find(x => x.slug === 'expo-globalports-2026-descuento-uic')
  assert.ok(item)
  assert.equal(item.category, 'Eventos y exposiciones')
  assert.equal(item.endDate, '2026-11-04')
  assert.match(item.concreteBenefit, /10% de descuento/)
  assert.equal(item.companyContacts[0].email, 'info@globalports.com.ar')
  assert.equal(item.companyContacts[0].phone, '+54 9 11 6651 3444')
})

test('35 · estado FINALIZADO se activa automáticamente al superar endDate', async () => {
  const { effectiveStatus } = await import('../src/status.js')
  const item = (await catalog()).find(x => x.slug === 'expo-globalports-2026-descuento-uic')
  assert.equal(effectiveStatus(item, '2026-11-04'), 'activo')
  assert.equal(effectiveStatus(item, '2026-11-05'), 'finalizado')
  const app = await read('src/App.jsx')
  const styles = await read('src/styles.css')
  assert.match(app, /FINALIZADO/)
  assert.match(app, /Fecha de fin \/ vencimiento automático/)
  assert.match(styles, /\.neo-card-finished/)
  assert.match(styles, /\.neo-finished-panel/)
})


test('37 · v3.7.1 endurece migración y evita caída por desconexión temporal de Neon', async () => {
  const server = await read('server/index.js')
  const schema = await read('server/schema.sql')
  assert.match(schema, /ADD COLUMN IF NOT EXISTS start_date DATE/)
  assert.match(schema, /ADD COLUMN IF NOT EXISTS end_date DATE/)
  assert.match(schema, /ADD COLUMN IF NOT EXISTS analysis_warnings JSONB/)
  assert.match(server, /pool\.on\('error'/)
  assert.match(server, /local-fallback/)
  assert.match(server, /Neon no pudo inicializarse/)
})
