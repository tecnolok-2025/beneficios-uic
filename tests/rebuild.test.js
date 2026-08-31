import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = file => fs.readFile(path.join(root, file), 'utf8')
const catalog = async () => JSON.parse(await read('data/catalog.json'))

const latestSlug = 'capacitacion-retencion-talento-etrr'

test('01 · conserva exactamente 24 beneficios', async () => {
  const items = await catalog()
  assert.equal(items.length, 24)
  assert.equal(JSON.parse(await read('data/initial-benefits.json')).length, 24)
})

test('02 · organiza el catálogo en exactamente 10 rubros', async () => {
  const items = await catalog()
  assert.equal(new Set(items.map(item => item.category)).size, 10)
})

test('03 · todos los beneficios están activos y los slugs son únicos', async () => {
  const items = await catalog()
  assert.ok(items.every(item => item.status === 'activo'))
  assert.equal(new Set(items.map(item => item.slug)).size, 24)
})

test('04 · el último acuerdo es Escuela Técnica Roberto Rocca y está en Capacitación y talento', async () => {
  const items = await catalog()
  const latest = items.find(item => item.slug === latestSlug)
  assert.ok(latest)
  assert.equal(latest.partner, 'Escuela Técnica Roberto Rocca')
  assert.equal(latest.category, 'Capacitación y talento')
})

test('05 · interfaz pública corresponde al rediseño nuevo', async () => {
  const app = await read('src/App.jsx')
  const styles = await read('src/styles.css')
  assert.match(app, /Tu empresa puede llegar/)
  assert.match(app, /nuevo espacio para descubrir acuerdos/i)
  assert.match(styles, /\.neo-hero/)
  assert.doesNotMatch(app, /BENEFICIOS QUE\s+POTENCIAN/i)
  assert.doesNotMatch(app, /'Acuerdos nuevos'/)
  assert.match(app, /Descubrir beneficios de nuevos acuerdos/)
  assert.match(app, /capacitacion-retencion-talento-etrr/)
})

test('06 · Actualizar versión funciona dentro del portal y conserva la pantalla', async () => {
  const app = await read('src/App.jsx')
  assert.match(app, /Actualizar versión/)
  assert.match(app, /getRegistrations\(\)/)
  assert.match(app, /caches\.keys\(\)/)
  assert.match(app, /window\.location\.reload\(\)/)
  assert.doesNotMatch(app, /href="\/actualizar-version"/)
  assert.match(app, /beneficios-uic-scroll/)
})

test('07 · móvil usa una sola columna de tarjetas', async () => {
  const styles = await read('src/styles.css')
  assert.match(styles, /@media \(max-width: 650px\)[\s\S]*\.neo-grid \{ grid-template-columns: 1fr; \}/)
})

test('08 · Neon se preserva con alta, edición, eliminación y flyers', async () => {
  const server = await read('server/index.js')
  assert.match(server, /ON CONFLICT \(slug\) DO NOTHING/)
  assert.match(server, /app\.post\('\/api\/admin\/beneficios'/)
  assert.match(server, /app\.put\('\/api\/admin\/beneficios\/:id'/)
  assert.match(server, /app\.delete\('\/api\/admin\/beneficios\/:id'/)
  assert.match(server, /imageUpload\.array\('flyers'/)
})

test('09 · el servidor tolera ausencia de catálogo local sin borrar Neon', async () => {
  const server = await read('server/index.js')
  assert.match(server, /async function readLocalCatalog/)
  assert.match(server, /El servicio continuará con Neon/)
  assert.match(server, /return \[\]/)
})

test('10 · versión y generación 3.0.2 son coherentes en servidor y HTML', async () => {
  const pkg = JSON.parse(await read('package.json'))
  const server = await read('server/index.js')
  const html = await read('index.html')
  assert.equal(pkg.version, '3.0.2')
  assert.match(server, /BENEFICIOS_UIC_NUEVO_302/)
  assert.match(html, /BENEFICIOS_UIC_NUEVO_302/)
  assert.match(server, /Frontend nuevo ausente/)
})

test('11 · API y navegación declaran control anticaché', async () => {
  const server = await read('server/index.js')
  assert.match(server, /app\.use\('\/api'[\s\S]*Cache-Control'[\s\S]*no-store/)
  assert.match(server, /no-store, no-cache, must-revalidate/)
  assert.match(server, /Clear-Site-Data/)
})

test('12 · neutraliza service workers heredados en rutas habituales', async () => {
  const server = await read('server/index.js')
  assert.match(server, /'\/sw\.js'/)
  assert.match(server, /'\/service-worker\.js'/)
  assert.match(server, /caches\.keys\(\)/)
  assert.match(server, /self\.registration\.unregister\(\)/)
})

test('13 · Render queda configurado para build, start y health check actuales', async () => {
  const render = await read('render.yaml')
  const nodeVersion = (await read('.node-version')).trim()
  assert.match(render, /npm ci --include=dev && npm run build/)
  assert.match(render, /startCommand: npm start/)
  assert.match(render, /healthCheckPath: \/api\/health/)
  assert.equal(nodeVersion, '24.14.1')
})
