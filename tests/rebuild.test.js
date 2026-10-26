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

test('01 · conserva la base v3.7.1 y llega a 51 fichas sin duplicar Praxis', async () => {
  const items = await catalog()
  assert.equal(items.length, 51)
  assert.equal(JSON.parse(await read('data/initial-benefits.json')).length, 51)
  assert.ok(items.some(item => item.slug === praxisSlug))
})

test('02 · mantiene los rubros existentes y suma Certificación y calidad', async () => {
  const items = await catalog()
  const categories = new Set(items.map(item => item.category))
  assert.equal(categories.size, 16)
  assert.ok(categories.has('UIPBA'))
  assert.ok(categories.has('Eventos y exposiciones'))
  assert.ok(categories.has('Certificación y calidad'))
})

test('03 · estados y slugs quedan coherentes con la revisión 3.8.0', async () => {
  const items = await catalog()
  assert.equal(items.filter(item => item.status === 'activo').length, 43)
  assert.equal(items.filter(item => item.status === 'revalidacion').length, 8)
  assert.equal(new Set(items.map(item => item.slug)).size, 51)
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
  assert.match(app, /ceop-internacional-formacion-liderazgo-uic/)
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

test('10 · versión y generación 3.9.8.6 son coherentes', async () => {
  const pkg = JSON.parse(await read('package.json'))
  const server = await read('server/index.js')
  const html = await read('index.html')
  assert.equal(pkg.name, 'beneficios-uic')
  assert.equal(pkg.version, '3.9.8.6')
  assert.match(server, /BENEFICIOS_UIC_3986/)
  assert.match(html, /BENEFICIOS_UIC_3986/)
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
  assert.equal(praxis?.partner, 'Praxis Finanzas · Departamento de Finanzas Corporativas UIC')
  assert.equal(praxis?.category, 'Gestión empresarial')
  assert.match(praxis?.agreementUrl || '', /praxisfinanzas\.com\.ar/)
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



test('19 · los 51 beneficios quedan completos con contacto, convenio e imagen', async () => {
  const items = await catalog()
  assert.equal(items.length, 51)
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
  assert.equal(new Set(items.map(x => x.category)).size, 16)
})


test('21 · v3.8.0 conserva búsqueda pública e identidad industrial premium', async () => {
  const app = await read('src/App.jsx')
  const styles = await read('src/styles.css')
  const pattern = await fs.readFile(path.join(root, 'public/industrial-uic-pattern.svg'), 'utf8')
  assert.match(app, /Búsqueda flexible/)
  assert.match(app, /Buscá DNV, CEOP, TIBEST, Praxis, Talento PyME/)
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


test('28 · v3.8.0 conserva la migración no destructiva de Affinity en Neon', async () => {
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



test('36 · v3.8.0 incorpora CEOP, TIBEST y DNV y actualiza Praxis sin duplicarlo', async () => {
  const items = await catalog()
  const ceop = items.find(x => x.slug === 'ceop-internacional-formacion-liderazgo-uic')
  const tibest = items.find(x => x.slug === 'tibest-broker-seguros-uic')
  const dnv = items.find(x => x.slug === 'dnv-certificacion-sistemas-gestion-uic')
  const praxis = items.filter(x => x.slug === 'finanzas-corporativas-praxis')
  assert.equal(ceop?.category, 'Acuerdos institucionales')
  assert.equal(tibest?.category, 'Broker de seguros')
  assert.equal(dnv?.category, 'Certificación y calidad')
  assert.equal(praxis.length, 1)
  assert.equal(praxis[0].category, 'Gestión empresarial')
  assert.equal(ceop.companyContacts[0].name, 'Hugo López')
  assert.equal(ceop.companyContacts[1].name, 'Sandra Rodríguez')
  assert.doesNotMatch(JSON.stringify(ceop), /Martha Mamtoiuk/i)
})

test('36b · nuevos convenios usan imágenes locales extraídas de los documentos fuente', async () => {
  const items = await catalog()
  for (const slug of ['ceop-internacional-formacion-liderazgo-uic','tibest-broker-seguros-uic','finanzas-corporativas-praxis','dnv-certificacion-sistemas-gestion-uic']) {
    const item = items.find(x => x.slug === slug)
    assert.match(item.externalImageUrl, /^\/benefits\/.+\.png$/)
    const image = await fs.readFile(path.join(root, 'public', item.externalImageUrl.replace(/^\//, '')))
    assert.ok(image.length > 3000, slug)
  }
})

test('36c · DNV y TIBEST conservan los beneficios económicos principales del convenio', async () => {
  const items = await catalog()
  const dnv = items.find(x => x.slug === 'dnv-certificacion-sistemas-gestion-uic')
  const tibest = items.find(x => x.slug === 'tibest-broker-seguros-uic')
  assert.match(dnv.costsDiscounts, /12%/)
  assert.match(dnv.costsDiscounts, /10%/)
  assert.match(tibest.costsDiscounts, /no fija un porcentaje uniforme/i)
  assert.equal(tibest.companyContacts[0].email, 'alejandro.hipler@tibest.com.ar')
})

test('36d · migración de Neon refresca sólo la ficha Praxis ya existente', async () => {
  const server = await read('server/index.js')
  assert.match(server, /actualización explícita de la ficha Praxis solicitada por UIC/)
  assert.match(server, /WHERE slug='finanzas-corporativas-praxis'/)
  assert.match(server, /no modifica flyers cargados desde Administración/)
})

test('37 · v3.8.0 conserva migración robusta y fallback ante desconexión temporal de Neon', async () => {
  const server = await read('server/index.js')
  const schema = await read('server/schema.sql')
  assert.match(schema, /ADD COLUMN IF NOT EXISTS start_date DATE/)
  assert.match(schema, /ADD COLUMN IF NOT EXISTS end_date DATE/)
  assert.match(schema, /ADD COLUMN IF NOT EXISTS analysis_warnings JSONB/)
  assert.match(server, /pool\.on\('error'/)
  assert.match(server, /local-fallback/)
  assert.match(server, /Neon no pudo inicializarse/)
})


test('42 · v3.9.4 ofrece acceso separado administrador / beneficiario y conserva registro por correo propio', async () => {
  const app = await read('src/App.jsx')
  const server = await read('server/index.js')
  assert.match(app, /DiffusionRoleChoice/)
  assert.match(app, /Como administrador/)
  assert.match(app, /Como beneficiario/)
  assert.match(app, /CompanyAuthPortal/)
  assert.match(app, /Elegí tu empresa/)
  assert.match(app, /Registrarme/)
  assert.match(app, /Olvidé mi contraseña/)
  assert.match(server, /\/api\/difusion\/company\/register\/request/)
  assert.match(server, /\/api\/difusion\/company\/login/)
  assert.match(server, /\/api\/difusion\/company\/forgot\/request/)
  assert.match(server, /authorizedCompanyEmails/)
})

test('43 · el directorio permite buscar empresas y el administrador puede ver la experiencia de cada empresa', async () => {
  const app = await read('src/App.jsx')
  const server = await read('server/index.js')
  assert.match(app, /Buscar empresa o beneficio/)
  assert.match(app, /Ver como empresa/)
  assert.match(app, /VISTA ADMINISTRADOR · COMO EMPRESA/)
  assert.match(server, /const grouped\s*=\s*new Map\(\)/)
  assert.match(app, /company\.benefits\.map/)
})

test('44 · Difusión conserva retorno explícito al Portal de Beneficios', async () => {
  const app = await read('src/App.jsx')
  const matches = app.match(/Volver al Portal de Beneficios/g) || []
  assert.ok(matches.length >= 3)
})

test('45 · herramientas sensibles siguen exclusivas del administrador aunque exista acceso de empresas', async () => {
  const app = await read('src/App.jsx')
  const server = await read('server/index.js')
  assert.match(app, /Desde este panel no existe acceso a Destinatarios, Validaciones ni Correo emisor/)
  assert.match(app, /Herramientas privadas/)
  assert.match(app, /Destinatarios, Validaciones y Correo emisor sólo existen en este modo administrador/)
  assert.match(server, /requireDiffusionActor/)
  assert.match(server, /requireAdmin/)
})

test('46 · v3.9.1 carga padrón de socios y convenios no socios con habilitación por empresa', async () => {
  const recipients = JSON.parse(await read('data/diffusion-recipients.json'))
  assert.equal(recipients.filter(x => x.sourceType === 'socio').length, 94)
  assert.equal(new Set(recipients.filter(x => x.sourceType === 'convenio').map(x => x.companyName)).size, 19)
  const app = await read('src/App.jsx')
  const server = await read('server/index.js')
  assert.match(app, /PADRÓN ÚNICO DE ENVÍO/)
  assert.match(app, /Recibe comunicaciones/)
  assert.match(app, /recipient-companies\/toggle/)
  assert.match(server, /recipient-companies\/toggle/)
})

test('47 · v3.9.1 aplica correcciones UIC del padrón del 24-10-2026', async () => {
  const recipients = JSON.parse(await read('data/diffusion-recipients.json'))
  const byKey = Object.fromEntries(recipients.map(x => [x.sourceKey, x]))
  assert.equal(byKey['socio:44'].email, 'info@tecnodealer.com.ar')
  assert.equal(byKey['socio:44'].enabled, true)
  assert.equal(byKey['socio:67'].email, 'info@montajesinteracero.com.ar')
  assert.equal(byKey['socio:92'].email, 'martin@eraina.com.ar')
  assert.equal(byKey['socio:210'].companyName, 'SWA/NEUCO')
  assert.equal(byKey['socio:210'].email, '')
  assert.equal(byKey['socio:210'].enabled, false)
  assert.equal(byKey['socio:259'].companyName, 'BULLETBABA SRL - TIBEST')
})

test('48 · v3.9.8.3 conserva TLK y amplía el control a lista blanca de tres destinatarios', async () => {
  const config = JSON.parse(await read('data/diffusion-config.json'))
  assert.equal(config.testCompanies[0].name, 'TECNO LOGISTI-K SA')
  assert.equal(config.testCompanies[0].email, 'nestor.manucci@tecnolok.com.ar')
  const server = await read('server/index.js')
  assert.match(server, /MODO PRUEBA · DISTRIBUCIÓN CONTROLADA/)
  assert.match(server, /normalizedTestRecipients/)
  assert.match(server, /isAllowedTestRecipient/)
})

test('49 · v3.9.8.6 identifica versión, generación y dependencia SMTP', async () => {
  const pkg = JSON.parse(await read('package.json'))
  const lock = JSON.parse(await read('package-lock.json'))
  const index = await read('index.html')
  const server = await read('server/index.js')
  assert.equal(pkg.version, '3.9.8.6')
  assert.equal(pkg.dependencies.nodemailer, '^10.2.1')
  assert.equal(lock.packages['node_modules/nodemailer'].version, '10.2.1')
  assert.match(index, /BENEFICIOS_UIC_3986/)
  assert.match(server, /BENEFICIOS_UIC_3986/)
})

test('50 · administrador puede agregar socios o convenios y cada empresa conserva su casilla', async () => {
  const app = await read('src/App.jsx')
  const server = await read('server/index.js')
  assert.match(app, /<option value="socio">Socio UIC<\/option>/)
  assert.match(app, /<option value="convenio">Convenio \/ no socio<\/option>/)
  assert.match(app, /Recibe comunicaciones/)
  assert.match(server, /recipient-companies\/toggle/)
})

test('51 · pestañas administrativas permanecen montadas para navegación inmediata', async () => {
  const app = await read('src/App.jsx')
  assert.match(app, /neo-diffusion-tab-stack/)
  assert.match(app, /hidden=\{tab!==\'destinatarios\'\}/)
  assert.match(app, /hidden=\{tab!==\'validaciones\'\}/)
  assert.match(app, /hidden=\{tab!==\'correo\'\}/)
})

test('52 · correo emisor usa Tesorería para envío y validación provisional', async () => {
  const app = await read('src/App.jsx')
  const server = await read('server/index.js')
  const config = JSON.parse(await read('data/diffusion-config.json'))
  assert.equal(config.approvalEmail, 'tesoreria@uic-campana.com.ar')
  assert.match(app, /tesoreria@uic-campana\.com\.ar/)
  assert.match(app, /beneficios@uic-campana\.com\.ar/)
  assert.match(server, /diffusion_mail_settings/)
  assert.match(server, /aes-256-gcm/)
})

test('53 · asunto es institucional, automático y no editable', async () => {
  const app = await read('src/App.jsx')
  const server = await read('server/index.js')
  assert.match(app, /Nuevo beneficio exclusivo UIC/)
  assert.match(app, /readOnly className="neo-readonly"/)
  assert.match(server, /function campaignSubject/)
  assert.match(server, /campaignSubject\(company\.name\)/)
})

test('54 · prueba genera código aleatorio de seis dígitos y exige verificación', async () => {
  const app = await read('src/App.jsx')
  const server = await read('server/index.js')
  const schema = await read('server/schema.sql')
  assert.match(server, /sixDigitCode/)
  assert.match(server, /campaign-test:/)
  assert.match(server, /test_verified_at/)
  assert.match(app, /Confirmá el código recibido/)
  assert.match(app, /verify-test/)
  assert.match(schema, /test_code_hash/)
})

test('55 · masivos se controlan desde Validaciones y Modo PRUEBA bloquea el padrón', async () => {
  const app = await read('src/App.jsx')
  const server = await read('server/index.js')
  assert.match(app, /Habilitar padrón general/)
  assert.match(app, /Padrón general BLOQUEADO/)
  assert.match(server, /\/api\/admin\/difusion\/mass-send/)
  assert.match(server, /mass_send_enabled/)
  assert.match(server, /PILOT_COMPANY_KEY/)
})

test('56 · pantalla inicial explica registro, recuperación, prueba, código y validación', async () => {
  const app = await read('src/App.jsx')
  assert.match(app, /function DiffusionGuide/)
  assert.match(app, /Si es la primera vez que ingresás/)
  assert.match(app, /perdiste la contraseña|la olvidaste/i)
  assert.match(app, /código de 6 dígitos/i)
  assert.match(app, /Solicitá validación UIC/)
})

test('57 · mantenimiento institucional no expone infraestructura técnica', async () => {
  const app = await read('src/App.jsx')
  const maintenance = await read('public/maintenance.html')
  assert.match(app, /Pedimos disculpas por la interrupción/)
  assert.match(maintenance, /Estamos realizando tareas de mantenimiento/)
  assert.doesNotMatch(maintenance, /Neon|Render|database|error/i)
})

test('58 · herramientas sensibles quedan exclusivas del administrador', async () => {
  const app = await read('src/App.jsx')
  const server = await read('server/index.js')
  assert.match(app, /Las empresas nunca acceden a esta sección/)
  assert.match(app, /no existe acceso a Destinatarios, Validaciones ni Correo emisor/)
  assert.match(server, /app\.get\('\/api\/admin\/difusion\/recipients', requireAdmin/)
  assert.match(server, /app\.get\('\/api\/admin\/difusion\/mail-settings', requireAdmin/)
})

test('59 · registro de empresa valida correo existente y excluye el correo general UIC', async () => {
  const server = await read('server/index.js')
  const schema = await read('server/schema.sql')
  assert.match(server, /authorizedCompanyEmails/)
  assert.match(server, /uic@uic-campana\.com\.ar/)
  assert.match(server, /EMAIL_MISMATCH/)
  assert.match(server, /NO_EMAIL/)
  assert.match(schema, /CREATE TABLE IF NOT EXISTS diffusion_company_accounts/)
})

test('60 · recuperación de contraseña usa código temporal y hash scrypt', async () => {
  const server = await read('server/index.js')
  assert.match(server, /forgot\/request/)
  assert.match(server, /forgot\/reset/)
  assert.match(server, /crypto\.scryptSync/)
  assert.match(server, /reset_code_hash/)
})

test('61 · administrador puede ver la experiencia de cualquier empresa', async () => {
  const app = await read('src/App.jsx')
  assert.match(app, /Ver como empresa/)
  assert.match(app, /VISTA ADMINISTRADOR · COMO EMPRESA/)
  assert.match(app, /CompanyDashboard/)
})

test('62 · cuerpo del mail acepta cuatro imágenes embebidas y adjuntos separados', async () => {
  const app = await read('src/App.jsx')
  const server = await read('server/index.js')
  const schema = await read('server/schema.sql')
  assert.match(app, /Máximo \{layout\.imageSlots\}/)
  assert.match(app, /imageSlots/)
  assert.match(app, /attachments/)
  assert.match(server, /maxCount:4/)
  assert.match(server, /placement/)
  assert.match(schema, /diffusion_campaign_files ADD COLUMN IF NOT EXISTS placement/)
})

test('63 · envío final deduplica correos y permite baja por destinatario', async () => {
  const server = await read('server/index.js')
  const app = await read('src/App.jsx')
  const schema = await read('server/schema.sql')
  assert.match(server, /const byEmail=new Map/)
  assert.match(server, /unsubscribeToken/)
  assert.match(server, /\/api\/difusion\/unsubscribe/)
  assert.match(app, /DESHABILITADO POR EL DESTINATARIO/)
  assert.match(schema, /opted_out_at/)
})


test('64 · navegación actual no depende de eventos SPA manuales', async () => {
  const app = await read('src/App.jsx')
  assert.match(app, /location\.assign\(target\)/)
  assert.match(app, /location\.reload\(\)/)
  assert.doesNotMatch(app, /const NAV_EVENT = 'uic:navigate'/)
  assert.doesNotMatch(app, /new PopStateEvent\('popstate'\)/)
})

test('65 · al elegir beneficiario se abandona la sesión administrativa para probar permisos reales de empresa', async () => {
  const app = await read('src/App.jsx')
  assert.match(app, /nextRole==='admin'/)
  assert.match(app, /nextRole==='beneficiary'|else\{/)
  assert.match(app, /\/api\/admin\/logout/)
  assert.match(app, /Cambiar tipo de acceso/)
  assert.match(app, /EMPRESAS E INSTITUCIONES CON CONVENIO/)
})

test('66 · pantalla beneficiario explica minuciosamente registro, recuperación y falta de correo', async () => {
  const app = await read('src/App.jsx')
  assert.match(app, /Si es la primera vez que ingresás/)
  assert.match(app, /Si ya estás registrado o perdiste la contraseña/)
  assert.match(app, /Enviar código de registro/)
  assert.match(app, /Enviar código de recuperación/)
  assert.match(app, /Esta empresa no tiene correo registrado para el acceso/)
  assert.match(app, /el código vence a los 15 minutos/i)
})


test('67 · v3.9.5 incorpora cola durable y monitor de envíos por empresa', async () => {
  const server = await read('server/index.js')
  const schema = await read('server/schema.sql')
  const app = await read('src/App.jsx')
  assert.match(schema, /diffusion_campaign_queue_recipients/)
  assert.match(schema, /diffusion_benefit_schedules/)
  assert.match(server, /processDiffusionQueue/)
  assert.match(server, /monitorPayload/)
  assert.match(server, /\/api\/difusion\/company\/monitor/)
  assert.match(app, /MONITOR Y TRAZABILIDAD/)
  assert.match(app, /posición en cola/)
})

test('68 · cancelación detiene pendientes y conserva enviados', async () => {
  const server = await read('server/index.js')
  const app = await read('src/App.jsx')
  assert.match(server, /cancel_requested_at/)
  assert.match(server, /finishCancelledCampaign/)
  assert.match(server, /status='cancelled'/)
  assert.match(app, /Cancelar envío/)
  assert.match(app, /Los correos ya enviados no pueden retirarse/)
})

test('69 · ciclo mensual queda anclado a la autorización y no acumula meses', async () => {
  const server = await read('server/index.js')
  const app = await read('src/App.jsx')
  const schema = await read('server/schema.sql')
  assert.match(server, /monthlyCycle/)
  assert.match(server, /authorizeBenefitSlot/)
  assert.match(schema, /anchor_date DATE NOT NULL/)
  assert.match(app, /Una oportunidad por mes, sin acumulación/)
  assert.match(app, /la próxima fecha sigue siendo la fecha mensual original/)
})

test('70 · cola calcula estimaciones y reanuda tras reinicio', async () => {
  const server = await read('server/index.js')
  assert.match(server, /estimatedStartAt/)
  assert.match(server, /estimatedFinishAt/)
  assert.match(server, /DIFFUSION_SEND_INTERVAL_MS/)
  assert.match(server, /Reanudado después de reinicio del servicio/)
  assert.match(server, /no se reintenta automáticamente para evitar una copia duplicada/)
})


test('71 · v3.9.6 incorpora watchdog previo a React contra pantalla blanca', async () => {
  const html = await read('index.html')
  const recovery = await read('public/boot-recovery.js')
  assert.match(html, /boot-recovery\.js/)
  assert.match(recovery, /rootIsEmpty/)
  assert.match(recovery, /recoverIfBlank/)
  assert.match(recovery, /serviceWorker/)
  assert.match(recovery, /caches\.keys/)
  assert.match(recovery, /Recuperando la pantalla/)
})

test('72 · v3.9.6 evita bucles de recuperación y ofrece salida institucional', async () => {
  const recovery = await read('public/boot-recovery.js')
  assert.match(recovery, /sessionStorage\.getItem\(pathKey\)/)
  assert.match(recovery, /60000/)
  assert.match(recovery, /Reintentar/)
  assert.match(recovery, /Volver al Portal de Beneficios/)
})

test('73 · v3.9.6 protege restauraciones BFCache', async () => {
  const main = await read('src/main.jsx')
  const app = await read('src/App.jsx')
  assert.match(main, /pageshow/)
  assert.match(main, /event\.persisted/)
  assert.match(main, /window\.location\.reload\(\)/)
  assert.match(app, /addEventListener\('pageshow', restore\)/)
})

test('74 · v3.9.8.6 conserva Error Boundary y generación técnica', async () => {
  const main = await read('src/main.jsx')
  const server = await read('server/index.js')
  const pkg = JSON.parse(await read('package.json'))
  assert.equal(pkg.version, '3.9.8.6')
  assert.match(main, /class PortalErrorBoundary/)
  assert.match(main, /uic:portal-ready/)
  assert.match(server, /BENEFICIOS_UIC_3986/)
})

test('75 · v3.9.7 reemplaza el editor lineal por Constructor Visual UIC con ocho modelos', async () => {
  const app = await read('src/App.jsx')
  assert.match(app, /CONSTRUCTOR VISUAL UIC/)
  assert.match(app, /const EMAIL_LAYOUTS = \[/)
  for (const id of ['institutional','gallery4','duo','imageLeft','imageRight','alternating','stacked','editorial']) assert.match(app, new RegExp(`id:'${id}'`))
  assert.match(app, /8 estructuras profesionales/)
})

test('76 · editor visual permite escribir con formato visible y pega texto sin estilos ajenos', async () => {
  const app = await read('src/App.jsx')
  assert.match(app, /function RichTextBlock/)
  assert.match(app, /contentEditable/)
  assert.match(app, /getData\('text\/plain'\)/)
  assert.match(app, /removeFormat/)
  assert.match(app, /Lo que ves aquí es lo que se respetará en el correo/)
})

test('77 · constructor conserva máximo cuatro imágenes y vista previa escritorio-celular', async () => {
  const app = await read('src/App.jsx')
  const styles = await read('src/styles.css')
  assert.match(app, /imageSlots.*\[null,null,null,null\]/)
  assert.match(app, /VISTA PREVIA REAL/)
  assert.match(app, />Escritorio</)
  assert.match(app, />Celular</)
  assert.match(styles, /neo-email-preview-shell\.mobile/)
  assert.match(styles, /neo-preview-gallery\.four/)
})

test('78 · servidor persiste plantilla y layout estructurado y sanea el HTML enriquecido', async () => {
  const server = await read('server/index.js')
  const schema = await read('server/schema.sql')
  assert.match(server, /EMAIL_TEMPLATE_IDS/)
  assert.match(server, /sanitizeRichHtml/)
  assert.match(server, /sanitizeLayout/)
  assert.match(server, /template_id,layout_json/)
  assert.match(schema, /ADD COLUMN IF NOT EXISTS template_id/)
  assert.match(schema, /ADD COLUMN IF NOT EXISTS layout_json JSONB/)
})

test('79 · correo final usa tablas compatibles con email y evita CSS grid en el render servidor', async () => {
  const server = await read('server/index.js')
  assert.match(server, /role="presentation"/)
  assert.match(server, /function emailGallery/)
  assert.match(server, /max-width:680px/)
  const renderer = server.slice(server.indexOf('function campaignEmailHtml'), server.indexOf('async function campaignMedia'))
  assert.doesNotMatch(renderer, /display:grid/)
})

test('80 · asistente de composición recomienda modelo según cantidad de imágenes', async () => {
  const app = await read('src/App.jsx')
  assert.match(app, /Asistente de composición UIC/)
  assert.match(app, /const recommended=imageCount>=3\?'gallery4':imageCount===2\?'duo'/)
  assert.match(app, /Aplicar recomendación/)
})

test('81 · imágenes del constructor se reducen antes de enviarse al servidor', async () => {
  const app = await read('src/App.jsx')
  assert.match(app, /async function optimizeEmailImage/)
  assert.match(app, /maxWidth=900,maxHeight=1200/)
  assert.match(app, /canvas\.toBlob/)
  assert.match(app, /reducción automática/)
})


test('82 · v3.9.8.1 agrega trazabilidad de aperturas por destinatario sin llamarla lectura garantizada', async () => {
  const server = await read('server/index.js')
  const schema = await read('server/schema.sql')
  const app = await read('src/App.jsx')
  assert.match(schema, /first_opened_at/)
  assert.match(schema, /last_opened_at/)
  assert.match(schema, /open_count INTEGER NOT NULL DEFAULT 0/)
  assert.match(server, /\/api\/difusion\/open\.gif/)
  assert.match(server, /opened_recipients/)
  assert.match(app, /aperturas detectadas/i)
  assert.match(app, /No detectada.*no significa necesariamente.*no leído/is)
})

test('83 · administrador puede auditar empresa, correo, apertura y baja de cada campaña', async () => {
  const server = await read('server/index.js')
  const app = await read('src/App.jsx')
  assert.match(server, /campaigns\/:id\/trace/)
  assert.match(server, /company_name,contact_name,status,sent_at/)
  assert.match(app, /Ver trazabilidad por empresa y correo/)
  assert.match(app, /neo-trace-table/)
})

test('84 · baja queda visible en prueba y activa en el envío real con atribución de campaña', async () => {
  const server = await read('server/index.js')
  const app = await read('src/App.jsx')
  const schema = await read('server/schema.sql')
  assert.match(server, /Preferencias de recepción \/ solicitar baja/)
  assert.match(server, /unsubscribePreview/)
  assert.match(server, /queueUnsubscribeToken/)
  assert.match(schema, /unsubscribed_at/)
  assert.match(app, /Preferencias de recepción/)
})

test('85 · franja y nombre visible se autocompletan pero pueden editarse', async () => {
  const server = await read('server/index.js')
  const app = await read('src/App.jsx')
  assert.match(server, /bannerText/)
  assert.match(server, /companyDisplayName/)
  assert.match(app, /automática y editable/)
  assert.match(app, /setBannerText/)
  assert.match(app, /setCompanyDisplayName/)
})

test('86 · logo de Beneficios UIC se integra a la franja del correo y la vista previa', async () => {
  const server = await read('server/index.js')
  const app = await read('src/App.jsx')
  const logo = await fs.readFile(path.join(root, 'public/logo-beneficios-uic.png'))
  assert.ok(logo.length > 1000)
  assert.match(server, /cid:uic-benefits-brand/)
  assert.match(app, /logo-beneficios-uic\.png/)
})

test('87 · cola impone como mínimo 45 segundos entre destinatarios', async () => {
  const server = await read('server/index.js')
  const env = await read('.env.example')
  assert.match(server, /Math\.max\(45000, Number\(process\.env\.DIFFUSION_SEND_INTERVAL_MS \|\| 45000\)\)/)
  assert.match(env, /DIFFUSION_SEND_INTERVAL_MS=45000/)
})


test('88 · Modo PRUEBA es fail-closed y nace activado por defecto', async () => {
  const server = await read('server/index.js')
  const schema = await read('server/schema.sql')
  assert.match(schema, /test_mode_enabled BOOLEAN NOT NULL DEFAULT TRUE/)
  assert.match(server, /async function testModeEnabled/)
  assert.match(server, /return true\n}/)
  assert.match(server, /Modo PRUEBA de seguridad/)
})

test('89 · lista blanca de prueba contiene exactamente UIC, INDUSVAR y TLK', async () => {
  const config = JSON.parse(await read('data/diffusion-config.json'))
  assert.deepEqual(config.testRecipients.map(x => x.email).sort(), [
    'nestor.manucci@gmail.com',
    'nestor.manucci@tecnolok.com.ar',
    'uic@uic-campana.com.ar'
  ].sort())
  assert.ok(config.testRecipients.some(x => x.name === 'INDUSVAR GROUP' && x.phone === '11 6681 2532'))
  assert.ok(config.testRecipients.some(x => x.name === 'UNIÓN INDUSTRIAL DE CAMPANA' && x.phone === '3489 65 0104'))
})

test('90 · envío general exige salir de prueba y mantiene doble llave administrativa', async () => {
  const server = await read('server/index.js')
  const app = await read('src/App.jsx')
  assert.match(server, /SALIR DE PRUEBA/)
  assert.match(server, /Modo PRUEBA está activo\. Desactivá primero/)
  assert.match(app, /MODO PRUEBA ACTIVADO/)
  assert.match(app, /Padrón general BLOQUEADO/)
  assert.match(app, /PRUEBA · BLOQUEO ACTIVO/)
})

test('91 · worker vuelve a validar la lista blanca inmediatamente antes del SMTP', async () => {
  const server = await read('server/index.js')
  const worker = server.slice(server.indexOf('async function processDiffusionQueue'), server.indexOf('function queueEtaSeconds'))
  assert.match(worker, /await testModeEnabled\(\)/)
  assert.match(worker, /isAllowedTestRecipient\(recipient\.email\)/)
  assert.match(worker, /Bloqueado por Modo PRUEBA de seguridad/)
})

test('92 · todos los campos de contraseña visibles usan control de ojo', async () => {
  const app = await read('src/App.jsx')
  const styles = await read('src/styles.css')
  assert.match(app, /function PasswordInput/)
  assert.match(app, /EyeOff/)
  assert.equal((app.match(/<PasswordInput/g) || []).length, 5)
  assert.equal((app.match(/type="password"/g) || []).length, 0)
  assert.match(styles, /neo-password-eye/)
})

test('93 · botón Difusión de Beneficios queda jerarquizado en la portada', async () => {
  const app = await read('src/App.jsx')
  const styles = await read('src/styles.css')
  assert.match(app, /neo-diffusion-entry/)
  assert.match(styles, /\.neo-diffusion-entry[\s\S]*border: 2px solid #f47a20[\s\S]*font-size: 15px/)
})


test('94 · los borradores se guardan como archivo local .uicpub y no como archivo Neon', async () => {
  const app = await read('src/App.jsx')
  assert.match(app, /LOCAL_PUBLICATION_EXTENSION='\.uicpub'/)
  assert.match(app, /Elegir dónde guardar/)
  assert.match(app, /Abrir archivo de mi PC/)
  assert.match(app, /No se almacenó en Neon ni en el servidor/)
  assert.doesNotMatch(app, /Mis publicaciones guardadas/)
  assert.doesNotMatch(app, />Duplicar</)
  assert.doesNotMatch(app, /function SavedCampaigns/)
})

test('95 · abrir un archivo local recupera layout, imágenes, adjuntos y firma sin consultar Neon', async () => {
  const app = await read('src/App.jsx')
  const reader = app.slice(app.indexOf('async function readLocalPublicationFile'), app.indexOf('function localPublicationFilename'))
  assert.match(reader, /_imageSlots/)
  assert.match(reader, /_attachments/)
  assert.match(reader, /signature/)
  assert.doesNotMatch(reader, /request\(/)
  assert.doesNotMatch(reader, /\/api\//)
})

test('96 · panel administrador muestra aviso rojo permanente de modo prueba', async () => {
  const app = await read('src/App.jsx')
  const styles = await read('src/styles.css')
  assert.match(app, /function AdminTestModeAlert/)
  assert.match(app, /MODO PRUEBA ACTIVO/)
  assert.match(styles, /\.neo-admin-test-alert/)
  assert.match(styles, /position:sticky/)
})

test('97 · envíos administrativos críticos requieren confirmación doble', async () => {
  const app = await read('src/App.jsx')
  const server = await read('server/index.js')
  assert.match(app, /PRIMERA CONFIRMACIÓN DE SEGURIDAD/)
  assert.match(app, /SEGUNDA CONFIRMACIÓN/)
  assert.match(server, /confirmFirst!==true/)
  assert.match(server, /segunda confirmación/)
  assert.match(server, /escribir PROBAR/)
})


test('98 · v3.9.8.5 no expone la empresa piloto en la experiencia pública', async () => {
  const app = await read('src/App.jsx')
  const server = await read('server/index.js')
  const publicArea = app.slice(app.indexOf('function DiffusionGuide()'), app.indexOf('function formatMonitorDate'))
  assert.doesNotMatch(publicArea, /TECNO LOGISTI-K SA/)
  assert.match(server, /buildDiffusionCompanies\(\)\)\.filter\(c=>!c\.testMode\)/)
  assert.match(server, /api\/admin\/difusion\/companies.*buildDiffusionCompanies/)
})

test('99 · v3.9.8.5 comunica acceso por convenio y aviso destacado', async () => {
  const app = await read('src/App.jsx')
  const css = await read('src/styles.css')
  assert.match(app, /Si tu empresa o institución firmó un convenio con la UIC/)
  assert.match(app, /promociones, beneficios y novedades/)
  assert.match(app, /neo-role-public-notice/)
  assert.match(css, /neoPublicNoticePulse/)
  assert.match(css, /prefers-reduced-motion/)
})


test('100 · Neon sólo recibe la publicación cuando comienza la prueba operativa', async () => {
  const app = await read('src/App.jsx')
  const server = await read('server/index.js')
  assert.match(app, /operationMode:'test'/)
  assert.match(app, /const test=async\(\)=>\{setBusy\(true\).*?syncOperational/s)
  assert.doesNotMatch(app, /Guardar borrador/)
  assert.match(server, /operationMode\|\|'\'\)!=='test'/)
  assert.match(server, /Los borradores ya no se guardan en Neon/)
})

test('101 · firma visible es editable y viaja dentro del layout sin alterar el correo registrado', async () => {
  const app = await read('src/App.jsx')
  const server = await read('server/index.js')
  assert.match(app, /FIRMA DEL DOCUMENTO · EDITABLE/)
  assert.match(app, /updateSignature\('name'/)
  assert.match(app, /updateSignature\('role'/)
  assert.match(app, /updateSignature\('email'/)
  assert.match(app, /updateSignature\('phone'/)
  assert.match(app, /originatorEmail:company\.email/)
  assert.match(server, /layout\.signature/)
  assert.match(server, /sigEmail/)
})

test('102 · la versión limpia borradores remotos heredados y evita acumulación por beneficio', async () => {
  const server = await read('server/index.js')
  assert.match(server, /DELETE FROM diffusion_campaigns WHERE status IN \('draft','blocked'\) AND approval_requested_at IS NULL AND test_sent_at IS NULL AND test_verified_at IS NULL/)
  assert.match(server, /DELETE FROM diffusion_campaigns WHERE company_key=\$1 AND benefit_slug=\$2 AND LOWER\(originator_email\)=LOWER\(\$3\)/)
})


test('103 · monitor acompaña el ciclo completo desde prueba hasta distribución', async () => {
  const server = await read('server/index.js')
  const app = await read('src/App.jsx')
  assert.match(server, /c\.status IN \('pending','rejected','queued','sending','sent','cancelled','blocked'\)/)
  assert.match(server, /c\.status='draft' AND c\.test_sent_at IS NOT NULL/)
  assert.match(app, /ESPERANDO VALIDACIÓN UIC/)
  assert.match(app, /PRUEBA ENVIADA/)
  assert.match(app, /PRUEBA VERIFICADA/)
  assert.match(app, /AUTORIZADO · EN COLA/)
  assert.match(app, /MONITOR Y TRAZABILIDAD/)
})

test('104 · monitor reduce consultas Neon cuando no hay actividad', async () => {
  const app = await read('src/App.jsx')
  assert.match(app, /activeRefreshMs=.*15000.*45000.*:0/s)
  assert.match(app, /Sin consultas permanentes/)
  assert.match(app, /Actualizar estado/)
  assert.doesNotMatch(app, /setInterval\(.*5000/s)
})

test('105 · reinicio conserva instancias operativas con prueba ya enviada', async () => {
  const server = await read('server/index.js')
  assert.match(server, /status IN \('draft','blocked'\) AND approval_requested_at IS NULL AND test_sent_at IS NULL AND test_verified_at IS NULL/)
})

test('106 · monitor informa aperturas agregadas sin exponer detalle de destinatarios a beneficiarios', async () => {
  const app = await read('src/App.jsx')
  assert.match(app, /aperturas totales detectadas/)
  assert.match(app, /Última apertura detectada/)
  assert.match(app, /adminPreview&&sent>0/)
  assert.match(app, /Ver trazabilidad por empresa y correo/)
})
