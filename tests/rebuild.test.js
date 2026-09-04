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

test('01 · conserva los beneficios existentes y agrega Villa Dálmine como beneficio 26', async () => {
  const items = await catalog()
  assert.equal(items.length, 26)
  assert.equal(JSON.parse(await read('data/initial-benefits.json')).length, 26)
  assert.ok(items.some(item => item.slug === praxisSlug))
})

test('02 · mantiene exactamente 10 rubros funcionales', async () => {
  const items = await catalog()
  assert.equal(new Set(items.map(item => item.category)).size, 10)
})

test('03 · todos los beneficios están activos y los slugs son únicos', async () => {
  const items = await catalog()
  assert.ok(items.every(item => item.status === 'activo'))
  assert.equal(new Set(items.map(item => item.slug)).size, 26)
})

test('04 · el último acuerdo destacado sigue siendo Escuela Técnica Roberto Rocca', async () => {
  const items = await catalog()
  const latest = items.find(item => item.slug === latestSlug)
  assert.ok(latest)
  assert.equal(latest.partner, 'Escuela Técnica Roberto Rocca')
  assert.equal(latest.category, 'Capacitación y talento')
})

test('05 · no reaparece el filtro Acuerdos nuevos y el botón apunta a ETRR', async () => {
  const app = await read('src/App.jsx')
  assert.doesNotMatch(app, /'Acuerdos nuevos'/)
  assert.match(app, /Descubrir beneficios de nuevos acuerdos/)
  assert.match(app, /capacitacion-retencion-talento-etrr/)
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

test('08 · Neon preserva CRUD y suma contactos de empresa editables', async () => {
  const server = await read('server/index.js')
  const schema = await read('server/schema.sql')
  assert.match(server, /ON CONFLICT \(slug\) DO NOTHING/)
  assert.match(server, /company_contacts/)
  assert.match(server, /agreement_url/)
  assert.match(schema, /company_contacts JSONB/)
  assert.match(schema, /ADD COLUMN IF NOT EXISTS company_contacts/)
})

test('09 · el catálogo local continúa como respaldo sin borrar Neon', async () => {
  const server = await read('server/index.js')
  assert.match(server, /async function readLocalCatalog/)
  assert.match(server, /El servicio continuará con Neon/)
  assert.match(server, /return \[\]/)
})

test('10 · versión y generación 3.2.1 son coherentes', async () => {
  const pkg = JSON.parse(await read('package.json'))
  const server = await read('server/index.js')
  const html = await read('index.html')
  assert.equal(pkg.name, 'beneficios-uic')
  assert.equal(pkg.version, '3.2.1')
  assert.match(server, /BENEFICIOS_UIC_321/)
  assert.match(html, /BENEFICIOS_UIC_321/)
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


test('14 · administración incorpora buscador escalable por beneficio y empresa', async () => {
  const app = await read('src/App.jsx')
  const styles = await read('src/styles.css')
  assert.match(app, /Buscar beneficio o empresa/)
  assert.match(app, /normalizeSearch/)
  assert.match(app, /item\.title.*item\.partner.*item\.category.*item\.summary/)
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

test('17 · auditoría mantiene Neon sin sobrescritura y refuerza casos límite', async () => {
  const server = await read('server/index.js')
  assert.match(server, /ON CONFLICT \(slug\) DO NOTHING/)
  assert.match(server, /localCatalog\.filter\(item => includeHidden \|\| item\.published !== false\)/)
  assert.match(server, /El título debe contener letras o números/)
  assert.match(server, /Beneficio no encontrado/)
})

test('18 · asociación queda unificada como Hacete socio', async () => {
  const app = await read('src/App.jsx')
  assert.match(app, />Hacete socio</)
  assert.doesNotMatch(app, />Consultar asociación/)
})


test('Villa Dálmine queda como beneficio 26 con contactos e imagen', async () => {
  const items = JSON.parse(await read('data/catalog.json'))
  const item = items.find(x => x.slug === 'club-villa-dalmine-beneficios-uic')
  assert.ok(item)
  assert.equal(item.partner, 'Club Villa Dálmine')
  assert.equal(item.companyContacts[0].email, 'secretaria@villadalmine.com.ar')
  assert.match(item.externalImageUrl, /wikimedia\.org/)
  assert.equal(new Set(items.map(x => x.category)).size, 10)
})
