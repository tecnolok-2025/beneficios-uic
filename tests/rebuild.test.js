import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = file => fs.readFile(path.join(root, file), 'utf8')

test('el nuevo catálogo conserva 24 beneficios en 10 rubros', async () => {
  const catalog = JSON.parse(await read('data/catalog.json'))
  const compatibilityCatalog = JSON.parse(await read('data/initial-benefits.json'))
  assert.equal(catalog.length, 24)
  assert.deepEqual(compatibilityCatalog, catalog)
  assert.equal(new Set(catalog.map(item => item.slug)).size, 24)
  assert.equal(new Set(catalog.map(item => item.category)).size, 10)
  assert.ok(catalog.every(item => item.status === 'activo'))
})

test('la interfaz fue reconstruida con una identidad nueva', async () => {
  const app = await read('src/App.jsx')
  const styles = await read('src/styles.css')
  assert.match(app, /Tu empresa puede llegar/)
  assert.match(app, /nuevo espacio para descubrir acuerdos/i)
  assert.match(styles, /\.neo-hero/)
  assert.match(styles, /\.neo-card/)
  assert.doesNotMatch(app, /BENEFICIOS QUE\s+POTENCIAN/i)
  assert.doesNotMatch(styles, /hero-v15|benefit-grid-v15|categories-v15/)
})

test('la actualización y la asociación son visibles y correctas', async () => {
  const app = await read('src/App.jsx')
  assert.match(app, /Actualizar versión/)
  assert.match(app, /Consultar asociación/)
  assert.match(app, /https:\/\/uic-campana\.com\.ar\/hacete-socio\//)
})

test('el servidor no se cae si falta el catálogo local', async () => {
  const server = await read('server/index.js')
  assert.match(server, /async function readLocalCatalog/)
  assert.match(server, /El servicio continuará con Neon/)
  assert.match(server, /return \[\]/)
  assert.doesNotMatch(server, /throw.*Catálogo local/s)
})

test('servidor y HTML exigen la misma generación nueva', async () => {
  const server = await read('server/index.js')
  const html = await read('index.html')
  const pkg = JSON.parse(await read('package.json'))
  assert.equal(pkg.name, 'beneficios-uic-nuevo')
  assert.equal(pkg.version, '3.0.0')
  assert.equal(pkg.engines.node, '>=22.0.0 <25.0.0')
  assert.match(server, /BENEFICIOS_UIC_NUEVO_300/)
  assert.match(html, /BENEFICIOS_UIC_NUEVO_300/)
  assert.match(server, /Frontend nuevo ausente/)
})

test('Neon se preserva y el alta, edición, eliminación y flyers siguen disponibles', async () => {
  const server = await read('server/index.js')
  assert.match(server, /ON CONFLICT \(slug\) DO NOTHING/)
  assert.match(server, /app\.post\('\/api\/admin\/beneficios'/)
  assert.match(server, /app\.put\('\/api\/admin\/beneficios\/:id'/)
  assert.match(server, /app\.delete\('\/api\/admin\/beneficios\/:id'/)
  assert.match(server, /imageUpload\.array\('flyers'/)
})

test('la interfaz móvil utiliza una sola columna para las tarjetas', async () => {
  const styles = await read('src/styles.css')
  assert.match(styles, /@media \(max-width: 650px\)[\s\S]*\.neo-grid \{ grid-template-columns: 1fr; \}/)
})
