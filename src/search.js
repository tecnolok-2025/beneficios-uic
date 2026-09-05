export function normalizeSearch(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9@.+-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function searchText(item = {}) {
  const contacts = (item.companyContacts || []).flatMap(person => [person.name, person.role, person.phone, person.email])
  const links = (item.agreementLinks || []).flatMap(link => [link.label, link.url])
  return [
    item.title, item.partner, item.category, item.slug, item.summary, item.description,
    item.concreteBenefit, item.costsDiscounts, item.scope, ...(item.requirements || []),
    item.contactName, item.contactPhone, item.contactEmail, ...contacts, ...links, item.externalImageAlt
  ].filter(Boolean).join(' ')
}

function editDistance(a = '', b = '') {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i]
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
    }
    previous = current
  }
  return previous[b.length]
}

const searchSynonyms = {
  medio: ['ambiente', 'ambiental', 'sustentabilidad'],
  ambiente: ['ambiental', 'sustentabilidad'],
  ambiental: ['ambiente', 'sustentabilidad'],
  finanza: ['finanzas', 'financiamiento', 'financiero'],
  financiamiento: ['finanzas', 'financiero'],
  medicina: ['salud', 'laboral'],
  energia: ['solar', 'electrica', 'electricidad'],
  video: ['audiovisual', 'comunicacion'],
  audiovisual: ['video', 'comunicacion'],
  inmueble: ['inmobiliario'],
  inmobiliario: ['inmueble']
}

function tokenVariants(token) {
  return [token, ...(searchSynonyms[token] || [])]
}

function fuzzyTokenMatch(token, words) {
  if (token.length < 4) return false
  const limit = token.length >= 6 ? 2 : 1
  return words.some(word =>
    word.length >= 3 &&
    Math.abs(word.length - token.length) <= limit &&
    editDistance(token, word) <= limit
  )
}

export function searchScore(item, rawQuery) {
  const query = normalizeSearch(rawQuery)
  if (!query) return 1
  const tokens = query.split(' ').filter(Boolean)
  const fields = [
    [item.partner, 18], [item.title, 16], [item.category, 12], [item.slug, 10], [item.summary, 8],
    [item.concreteBenefit, 7], [item.costsDiscounts, 7], [item.description, 5], [item.scope, 4],
    [(item.requirements || []).join(' '), 4],
    [(item.companyContacts || []).flatMap(person => [person.name, person.role, person.phone, person.email]).join(' '), 6],
    [(item.agreementLinks || []).flatMap(link => [link.label, link.url]).join(' '), 3]
  ].map(([value, weight]) => [normalizeSearch(value), weight])

  const haystack = normalizeSearch(searchText(item))
  const words = haystack.split(' ').filter(Boolean)
  let score = haystack.includes(query) ? 70 : 0

  for (const token of tokens) {
    let tokenMatched = false
    for (const variant of tokenVariants(token)) {
      for (const [field, weight] of fields) {
        if (!field) continue
        if (field === variant) { score += weight * 4; tokenMatched = true }
        else if (field.startsWith(variant)) { score += weight * 3; tokenMatched = true }
        else if (field.includes(variant)) { score += weight * 2; tokenMatched = true }
      }
      if (tokenMatched) break
    }
    if (!tokenMatched && fuzzyTokenMatch(token, words)) { score += 5; tokenMatched = true }
    if (!tokenMatched) return 0
  }
  return score
}

export function rankBenefits(items, query) {
  if (!normalizeSearch(query)) return items
  return items
    .map((item, index) => ({ item, index, score: searchScore(item, query) }))
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(result => result.item)
}
