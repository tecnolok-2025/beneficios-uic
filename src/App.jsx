import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, BadgePercent, Building2, Check, ChevronRight, CircleAlert, Factory,
  HeartHandshake, LayoutGrid, LockKeyhole, LogOut, Mail, Menu, Phone, Plus, RefreshCw,
  Search, ShieldCheck, Sparkles, Upload, Users, X
} from 'lucide-react'
import { rankBenefits } from './search.js'
import { effectiveStatus } from './status.js'

const recentSlugs = new Set(['dnv-certificacion-sistemas-gestion-uic', 'finanzas-corporativas-praxis', 'tibest-broker-seguros-uic', 'ceop-internacional-formacion-liderazgo-uic', 'affinity-broker-seguros-condiciones-preferenciales', 'app-uic-comunicacion-servicios-acceso', 'talento-pyme-plataforma-vinculacion-laboral', 'requerimientos-institucionales-cpf', 'portal-beneficios-uic-digital', 'convenio-marco-aderpe-uic', 'uipba-open-english-business-80-off', 'uipba-provincia-seguros-tarifas-bonificadas', 'uipba-unlp-ingenieria-posgrado-15', 'uipba-programa-proveedores-energia-mineria-oil-gas', 'uipba-asistencia-pyme', 'uipba-iram-bonificaciones', 'uipba-sancor-salud-beneficio-historico', 'uipba-movistar-negocios-bonificaciones', 'uipba-banco-nacion-beneficios-pyme', 'uipba-ucema-descuentos-capacitacion', 'uipba-softlanding-asesoramiento-tarifa-diferencial', 'uipba-centro-despachantes-aduana', 'uipba-bvmw-cooperacion-alemania', 'red-summa-education-convenio-institucional-uic', 'cadema-bureau-barrancas-beneficio-uic', 'expo-globalports-2026-descuento-uic'])

const emptyBenefit = {
  title: '', partner: '', category: '', status: 'activo', featured: false, summary: '', description: '',
  concreteBenefit: '', costsDiscounts: '', requirements: [], scope: '', contactName: 'María José Godoy (Majo) – Administración UIC',
  contactPhone: '3489 65 0104', contactEmail: 'uic@uic-campana.com.ar', companyContacts: [], agreementUrl: '', agreementLinks: [], externalImageUrl: '', externalImageAlt: '', startDate: '', endDate: '', published: true
}

async function request(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...options, headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || `No se pudo completar la operación (HTTP ${response.status})`)
  return data
}

function go(path) { history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')) }
function useRoute() { const [route, setRoute] = useState(location.pathname); useEffect(() => { const update = () => setRoute(location.pathname); addEventListener('popstate', update); return () => removeEventListener('popstate', update) }, []); return route }

function Brand() {
  return <button className="neo-brand" onClick={() => go('/')} aria-label="Volver al inicio">
    <span className="neo-mark"><Check /></span>
    <span className="neo-brand-copy"><strong>BENEFICIOS <em>UIC</em></strong><small>UNIÓN INDUSTRIAL DE CAMPANA</small></span>
  </button>
}

function Header({ admin = false }) {
  const [health, setHealth] = useState(null)
  const [menu, setMenu] = useState(false)
  const [updating, setUpdating] = useState(false)
  useEffect(() => { request(`/api/health?t=${Date.now()}`).then(setHealth).catch(() => {}) }, [])
  const updateVersion = async () => {
    if (updating) return
    setUpdating(true)
    try {
      sessionStorage.setItem('beneficios-uic-scroll', String(window.scrollY || 0))
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map(registration => registration.unregister()))
      }
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map(key => caches.delete(key)))
      }
      await fetch(`/api/version?t=${Date.now()}`, { cache: 'reload', credentials: 'same-origin' }).catch(() => null)
    } finally {
      window.location.reload()
    }
  }
  return <header className="neo-header">
    <div className="neo-shell neo-nav">
      <Brand />
      <div className="neo-uic"><img src="/logo-uic-oficial.jpeg" alt="Unión Industrial de Campana"/></div>
      <nav className="neo-actions">
        <span className="neo-version"><small>NUEVO PORTAL</small><strong>v{health?.version || '3.9.2'}</strong></span>
        <button className="neo-update" type="button" onClick={updateVersion} disabled={updating} aria-live="polite"><RefreshCw className={updating ? 'neo-spin' : ''}/><span>{updating ? 'Actualizando…' : 'Actualizar versión'}</span></button>
        <button className="neo-admin-link neo-desktop" onClick={() => go(admin ? '/' : '/administracion')}>{admin ? <ArrowLeft/> : <Plus/>}{admin ? 'Volver al portal' : 'Agregar beneficio'}</button>
        <button className="neo-menu-button" onClick={() => setMenu(value => !value)} aria-label="Abrir menú">{menu ? <X/> : <Menu/>}</button>
      </nav>
    </div>
    {menu && <div className="neo-mobile-menu"><button onClick={() => go(admin ? '/' : '/administracion')}>{admin ? 'Volver al portal' : 'Administrar beneficios'}</button><a href="https://uic-campana.com.ar/hacete-socio/" target="_blank" rel="noreferrer">Hacete socio</a></div>}
  </header>
}

function BenefitCard({ item }) {
  const isNew = recentSlugs.has(item.slug)
  const displayStatus = effectiveStatus(item)
  const needsValidation = displayStatus === 'revalidacion'
  const isFinished = displayStatus === 'finalizado'
  return <article className={`neo-card ${needsValidation ? 'neo-card-validation' : ''} ${isFinished ? 'neo-card-finished' : ''}`} onClick={() => go(`/beneficio/${item.slug}`)} onKeyDown={event => { if (event.key === 'Enter') go(`/beneficio/${item.slug}`) }} tabIndex="0">
    <div className="neo-card-head"><span className="neo-card-icon"><Building2/></span><span className="neo-card-category">{item.category}</span><div className="neo-card-badges">{isNew && <span className="neo-new"><Sparkles/> NUEVO</span>}{needsValidation && <span className="neo-validation"><CircleAlert/> A CHEQUEAR VALIDACIÓN</span>}{isFinished && <span className="neo-finished"><CircleAlert/> FINALIZADO</span>}</div></div>
    <div className="neo-card-company">{item.partner || 'Convenio UIC'}</div>
    <h3>{item.title}</h3>
    <p>{item.summary}</p>
    <div className="neo-condition"><BadgePercent/><span>{item.costsDiscounts || item.concreteBenefit || 'Condición preferencial para socios UIC'}</span></div>
    <button>Ver beneficio <ArrowRight/></button>
  </article>
}

function Home() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todos')
  useEffect(() => { request('/api/beneficios').then(setItems).catch(error => setError(error.message)).finally(() => setLoading(false)) }, [])
  const categories = useMemo(() => ['Todos', ...new Set(items.map(item => item.category))], [items])
  const visible = useMemo(() => {
    const categoryItems = category === 'Todos' ? items : items.filter(item => item.category === category)
    return rankBenefits(categoryItems, query)
  }, [items, category, query])
  const explore = () => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })
  const showLatestAgreement = () => go('/beneficio/ceop-internacional-formacion-liderazgo-uic')
  useEffect(() => {
    const saved = Number(sessionStorage.getItem('beneficios-uic-scroll'))
    if (Number.isFinite(saved) && saved > 0) {
      sessionStorage.removeItem('beneficios-uic-scroll')
      requestAnimationFrame(() => window.scrollTo({ top: saved, behavior: 'auto' }))
    }
  }, [])
  return <><Header/><main>
    <section className="neo-hero">
      <div className="neo-hero-orbit"/><div className="neo-hero-dots"/><div className="neo-hero-industry" aria-hidden="true"/>
      <div className="neo-shell neo-hero-layout">
        <div className="neo-hero-copy">
          <span className="neo-eyebrow"><Factory/> PORTAL INDUSTRIAL UIC · BENEFICIOS PARA SOCIOS</span>
          <h1>Tu empresa puede llegar <em>más lejos.</em></h1>
          <p>Acuerdos, servicios y oportunidades para fortalecer la competitividad de las empresas que integran la Unión Industrial de Campana.</p><div className="neo-hero-signals"><span>INDUSTRIA</span><span>INNOVACIÓN</span><span>COMUNIDAD</span></div>
          <div className="neo-hero-buttons"><button onClick={explore}>Descubrir beneficios <ArrowRight/></button><button onClick={showLatestAgreement}><Sparkles/> Descubrir beneficios de nuevos acuerdos</button><button className="neo-diffusion-entry" onClick={() => go('/difusion')}><Mail/> Difusión de Beneficios</button></div>
          <div className="neo-reassurance"><ShieldCheck/> Información validada y administrada por la Unión Industrial de Campana</div>
        </div>
        <aside className="neo-impact">
          <span className="neo-impact-label">IMPACTO PARA EL SOCIO</span>
          <div className="neo-big-number"><strong>{items.length || 51}</strong><span>beneficios<br/>en el portal</span></div>
          <div className="neo-impact-grid"><div><strong>{categories.length ? categories.length - 1 : 16}</strong><span>rubros</span></div><div><strong>{items.filter(item => effectiveStatus(item) === 'activo').length || 43}</strong><span>beneficios activos</span></div><div><strong>{items.filter(item => effectiveStatus(item) === 'revalidacion').length || 8}</strong><span>a validar</span></div></div>
          <div className="neo-impact-foot"><Check/> Acceso simple, condiciones claras y contacto directo.</div>
        </aside>
      </div>
    </section>

    <section className="neo-promises"><div className="neo-shell"><div><BadgePercent/><span><strong>Condiciones preferenciales</strong>Descuentos y bonificaciones</span></div><div><Users/><span><strong>Red industrial</strong>Socios de Campana y adherentes</span></div><div><Factory/><span><strong>Soluciones empresariales</strong>Servicios para producir mejor</span></div></div></section>

    <section id="catalogo" className="neo-catalog neo-shell">
      <div className="neo-section-title"><span>EXPLORÁ EL NUEVO CATÁLOGO</span><h2>Encontrá una oportunidad para tu empresa</h2><p>Elegí un rubro o buscá por servicio, empresa o palabra clave.</p></div>
      <label className="neo-search"><Search/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscá DNV, CEOP, TIBEST, Praxis, Talento PyME…" aria-label="Buscar beneficios" autoComplete="off"/>{query && <button onClick={() => setQuery('')} aria-label="Limpiar"><X/></button>}</label><div className="neo-search-help"><ShieldCheck/><span><strong>Búsqueda flexible:</strong> encuentra por empresa, parte del nombre, rubro, contacto o palabra clave; ignora tildes y tolera pequeños errores.</span><div className="neo-search-examples">{['DNV','CEOP','TIBEST','Praxis'].map(example => <button key={example} onClick={() => setQuery(example)}>{example}</button>)}</div></div>
      <div className="neo-categories">{categories.map(name => <button key={name} className={`${category === name ? 'active' : ''} ${name === 'UIPBA' ? 'neo-uipba-category' : ''}`} onClick={() => setCategory(name)}>{name === 'Todos' ? <LayoutGrid/> : name === 'UIPBA' ? <Building2/> : <ChevronRight/>}<span>{name}</span></button>)}</div>
      {category === 'UIPBA' && <div className="neo-uipba-note"><Building2/><div><strong>ENTIDAD MADRE · UIPBA</strong><span>Reúne beneficios, servicios y convenios trasladados a los socios UIC. Las fichas marcadas <b>A CHEQUEAR VALIDACIÓN</b> provienen de antecedentes publicados por UIPBA y requieren confirmar vigencia antes de utilizarlas.</span></div></div>}
      <div className="neo-results"><strong>{category}</strong><span>{visible.length} resultado{visible.length === 1 ? '' : 's'}</span></div>
      {error ? <div className="neo-empty"><CircleAlert/><h3>No pudimos cargar los beneficios</h3><p>{error}</p></div> : loading ? <div className="neo-empty">Cargando el nuevo catálogo…</div> : <div className="neo-grid">{visible.map(item => <BenefitCard key={item.id} item={item}/>)}</div>}
    </section>

    <section className="neo-membership"><div className="neo-shell"><div className="neo-membership-icon"><Users/></div><div><span>¿TODAVÍA NO SOS SOCIO?</span><h2>Sumate a una comunidad que genera oportunidades</h2><p>Conocé cómo asociarte y empezá a acceder a todos los beneficios de la UIC.</p></div><a href="https://uic-campana.com.ar/hacete-socio/" target="_blank" rel="noreferrer">Hacete socio <ArrowRight/></a></div></section>
  </main><Footer/></>
}

function Detail({ slug }) {
  const [item, setItem] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { request(`/api/beneficios/${slug}`).then(data => { setItem(data); request('/api/traces', { method: 'POST', body: JSON.stringify({ slug: data.slug, title: data.title, action: 'vista' }) }).catch(() => {}) }).catch(error => setError(error.message)) }, [slug])
  if (error) return <><Header/><div className="neo-empty neo-page-empty"><CircleAlert/><h2>{error}</h2><button onClick={() => go('/')}>Volver</button></div></>
  if (!item) return <div className="neo-loading">Cargando beneficio…</div>
  const contact = () => request('/api/traces', { method: 'POST', body: JSON.stringify({ slug: item.slug, title: item.title, action: 'contacto' }) }).catch(() => {})
  const displayStatus = effectiveStatus(item)
  const needsValidation = displayStatus === 'revalidacion'
  const isFinished = displayStatus === 'finalizado'
  return <><Header/><main className="neo-detail">
    <section className="neo-detail-hero"><div className="neo-shell"><button onClick={() => go('/')}><ArrowLeft/> Volver al catálogo</button><div className="neo-detail-tags"><span className="neo-detail-category">{item.category}</span>{needsValidation && <span className="neo-validation"><CircleAlert/> A CHEQUEAR VALIDACIÓN</span>}{isFinished && <span className="neo-finished"><CircleAlert/> FINALIZADO</span>}</div><h1>{item.title}</h1><p><Building2/> {item.partner}</p></div></section>
    <div className="neo-shell neo-detail-layout"><div className="neo-detail-body">
      {needsValidation && <section className="neo-validation-panel"><span><CircleAlert/> ESTADO DEL BENEFICIO</span><h2>A chequear validación con UIPBA</h2><p>Existe un antecedente institucional publicado, pero UIC debe confirmar vigencia y condiciones actuales antes de gestionarlo como beneficio activo.</p></section>}{isFinished && <section className="neo-finished-panel"><span><CircleAlert/> ESTADO DEL BENEFICIO</span><h2>Beneficio finalizado</h2><p>La vigencia de esta edición ya concluyó. La ficha se conserva como antecedente y podrá reactivarse cuando UIC cargue las condiciones de una nueva edición.</p></section>}
      <section className="neo-highlight"><span>BENEFICIO PRINCIPAL</span><h2>{item.concreteBenefit || item.summary}</h2></section>
      <section><span>CONDICIONES ECONÓMICAS</span><h2>{item.costsDiscounts || 'Consultar condiciones vigentes'}</h2></section>
      <section><span>EN QUÉ CONSISTE</span><p>{item.description || item.summary}</p></section>
      <section><span>CÓMO ACCEDER</span><ul>{(item.requirements || []).map((requirement, index) => <li key={index}><Check/>{requirement}</li>)}</ul>{item.scope && <p><strong>Alcance:</strong> {item.scope}</p>}</section>
      {item.flyers?.length > 0 && <section><span>MATERIAL VISUAL</span><div className="neo-flyers">{item.flyers.map(flyer => <img key={flyer.id} src={flyer.url} alt={flyer.alt || item.title}/>)}</div></section>}
    </div><aside className="neo-contact"><span>CONTACTO UIC</span><h2>{needsValidation ? 'Consultá la validación' : isFinished ? 'Consultá la próxima edición' : 'Solicitá este beneficio'}</h2><p>{needsValidation ? 'La UIC verificará con UIPBA si el beneficio continúa vigente y cuáles son sus condiciones actuales.' : isFinished ? 'La edición informada ya finalizó. UIC podrá orientarte sobre futuras ediciones o beneficios equivalentes.' : 'La UIC verificará tu condición de socio y te orientará para acceder.'}</p>{item.contactName && <div><Users/>{item.contactName}</div>}{item.contactPhone && <a onClick={contact} href={`tel:${item.contactPhone}`}><Phone/>{item.contactPhone}</a>}{item.contactEmail && <a onClick={contact} href={`mailto:${item.contactEmail}`}><Mail/>{item.contactEmail}</a>}</aside></div>
    <section className="neo-contact-directory neo-shell"><div className="neo-contact-directory-title"><span>DATOS DE CONTACTO</span><h2>Contactos del beneficio</h2><p>Los contactos de la empresa y de la UIC se administran desde el panel privado y pueden actualizarse cuando cambien.</p></div><div className="neo-contact-directory-grid"><article><span>EMPRESA / PRESTADOR</span><h3>{item.partner || 'Empresa adherida'}</h3>{(item.companyContacts || []).length ? (item.companyContacts || []).map((person,index) => <div className="neo-person-contact" key={`${person.email || person.phone || person.name}-${index}`}><strong>{person.name || `Contacto ${index + 1}`}</strong>{person.role && <small>{person.role}</small>}{person.phone && <a onClick={contact} href={`tel:${person.phone}`}><Phone/>{person.phone}</a>}{person.email && <a onClick={contact} href={`mailto:${person.email}`}><Mail/>{person.email}</a>}</div>) : <p className="neo-contact-pending">Contacto de la empresa a completar desde Administración.</p>}</article><article><span>UNIÓN INDUSTRIAL DE CAMPANA</span><h3>Contacto UIC</h3>{item.contactName && <div className="neo-person-contact"><strong>{item.contactName}</strong>{item.contactPhone && <a onClick={contact} href={`tel:${item.contactPhone}`}><Phone/>{item.contactPhone}</a>}{item.contactEmail && <a onClick={contact} href={`mailto:${item.contactEmail}`}><Mail/>{item.contactEmail}</a>}</div>}</article></div><div className="neo-agreement-links">{((item.agreementLinks || []).length ? item.agreementLinks : (item.agreementUrl ? [{ label: 'Más información del beneficio', url: item.agreementUrl }] : [])).map((link,index) => <a className="neo-source-link" key={`${link.url}-${index}`} href={link.url} target="_blank" rel="noreferrer">{link.label || `Convenio / beneficio ${index + 1}`} <ArrowRight/></a>)}</div></section>
  </main><Footer/></>
}

function Login({ onSuccess, mode = 'admin' }) {
  const [password, setPassword] = useState(''); const [error, setError] = useState('')
  const diffusion = mode === 'diffusion'
  const login = async event => { event.preventDefault(); setError(''); try { await request('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) }); onSuccess() } catch (error) { setError(error.message) } }
  return <div className="neo-login"><form onSubmit={login}><div className="neo-lock"><LockKeyhole/></div><span>{diffusion ? 'ACCESO TEMPORAL RESTRINGIDO' : 'NUEVA ADMINISTRACIÓN'}</span><h1>{diffusion ? 'Difusión de Beneficios' : 'Gestión de beneficios'}</h1><p>{diffusion ? 'Módulo en construcción. Durante esta etapa sólo puede ingresar el administrador utilizando la misma clave del Portal de Beneficios.' : 'Ingresá con la clave configurada en Render.'}</p><label>Contraseña administrativa<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoFocus/></label>{error && <div className="neo-form-error">{error}</div>}<button>Ingresar <ArrowRight/></button><button type="button" className="neo-back" onClick={() => go('/')}><ArrowLeft/> Volver al Portal de Beneficios</button></form></div>
}

function Field({ label, value, onChange, textarea = false, type = 'text' }) {
  return <label>{label}{textarea ? <textarea value={value || ''} onChange={event => onChange(event.target.value)} rows="4"/> : <input type={type} value={value || ''} onChange={event => onChange(event.target.value)}/>}</label>
}

function CompanyContactsEditor({ contacts = [], onChange }) {
  const list = Array.isArray(contacts) ? contacts : []
  const addContact = () => onChange([...list, { name: '', role: '', phone: '', email: '' }])
  const updateContact = (index, key, value) => onChange(list.map((contact, position) => position === index ? { ...contact, [key]: value } : contact))
  const removeContact = index => onChange(list.filter((_contact, position) => position !== index))
  return <div className="neo-full neo-company-contacts"><div className="neo-company-contacts-head"><div><span>CONTACTOS Y TRAZABILIDAD</span><h3>Contactos de la empresa / prestador</h3><p>Podés agregar, modificar o eliminar personas, teléfonos y correos sin tocar el contacto propio de la UIC.</p></div><button type="button" onClick={addContact}><Plus/> Agregar contacto</button></div>{list.length === 0 ? <div className="neo-company-contacts-empty">Todavía no hay contactos de la empresa cargados.</div> : list.map((person,index) => <div className="neo-company-contact-row" key={index}><Field label="Nombre" value={person.name} onChange={value => updateContact(index,'name',value)}/><Field label="Cargo / función" value={person.role} onChange={value => updateContact(index,'role',value)}/><Field label="Teléfono" value={person.phone} onChange={value => updateContact(index,'phone',value)}/><Field label="Correo" type="email" value={person.email} onChange={value => updateContact(index,'email',value)}/><button type="button" className="neo-remove-contact" onClick={() => removeContact(index)}><X/> Quitar</button></div>)}</div>
}

function AgreementLinksEditor({ links = [], onChange }) {
  const list = Array.isArray(links) ? links : []
  const addLink = () => onChange([...list, { label: '', url: '' }])
  const updateLink = (index, key, value) => onChange(list.map((link, position) => position === index ? { ...link, [key]: value } : link))
  const removeLink = index => onChange(list.filter((_link, position) => position !== index))
  return <div className="neo-full neo-agreement-editor"><div className="neo-company-contacts-head"><div><span>CONVENIOS / PUBLICACIONES</span><h3>Enlaces del beneficio</h3><p>Admite uno o varios convenios en la misma ficha. Paseo Gavazzi conserva juntos SYGSA S.A. y CADEMA.</p></div><button type="button" onClick={addLink}><Plus/> Agregar enlace</button></div>{list.length === 0 ? <div className="neo-company-contacts-empty">Todavía no hay enlaces cargados.</div> : list.map((link,index) => <div className="neo-agreement-row" key={index}><Field label="Nombre del convenio / publicación" value={link.label} onChange={value => updateLink(index,'label',value)}/><Field label="URL" value={link.url} onChange={value => updateLink(index,'url',value)}/><button type="button" className="neo-remove-contact" onClick={() => removeLink(index)}><X/> Quitar</button></div>)}</div>
}

function Editor({ items, selected, setSelected, reload }) {
  const [form, setForm] = useState(selected || emptyBenefit)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [files, setFiles] = useState([])
  const [saving, setSaving] = useState(false)
  const [listQuery, setListQuery] = useState('')
  useEffect(() => setForm(selected || emptyBenefit), [selected])
  const filteredItems = useMemo(() => rankBenefits(items, listQuery), [items, listQuery])
  const change = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const save = async () => {
    if (saving) return
    setSaving(true); setMessage(''); setError('')
    try {
      const saved = await request(selected ? `/api/admin/beneficios/${selected.id}` : '/api/admin/beneficios', { method: selected ? 'PUT' : 'POST', body: JSON.stringify(form) })
      if (files.length) {
        const oversized = files.find(file => file.size > 12 * 1024 * 1024)
        if (oversized) throw new Error(`La imagen ${oversized.name} supera el límite de 12 MB.`)
        const data = new FormData()
        files.forEach(file => data.append('flyers', file, file.name))
        try {
          await request(`/api/admin/beneficios/${saved.id}/flyers`, { method: 'POST', body: data })
        } catch (uploadError) {
          setError(`Los datos del beneficio se guardaron, pero la imagen no pudo cargarse: ${uploadError.message}`)
          await reload(saved.id)
          return
        }
      }
      setFiles([])
      setMessage(files.length ? 'Cambios e imagen guardados correctamente.' : (selected ? 'Cambios guardados.' : 'Beneficio creado.'))
      await reload(saved.id)
    } catch (error) { setError(error.message) }
    finally { setSaving(false) }
  }
  const remove = async () => {
    if (!selected || !confirm(`¿Eliminar ${selected.title}?`)) return
    setMessage(''); setError('')
    try {
      await request(`/api/admin/beneficios/${selected.id}`, { method: 'DELETE', body: '{}' })
      setSelected(null)
      await reload()
      setMessage('Beneficio eliminado.')
    } catch (removeError) { setError(removeError.message) }
  }
  return <div className="neo-admin-layout"><aside className="neo-admin-list"><label className="neo-admin-search"><Search/><input value={listQuery} onChange={event => setListQuery(event.target.value)} placeholder="Buscar empresa, rubro, contacto o palabra clave" aria-label="Buscar beneficio o empresa" autoComplete="off"/>{listQuery && <button type="button" onClick={() => setListQuery('')} aria-label="Limpiar búsqueda"><X/></button>}</label><div className="neo-admin-search-meta"><span>{listQuery ? `${filteredItems.length} de ${items.length} resultados` : `${items.length} beneficios`}</span></div><button className="neo-new-benefit" onClick={() => setSelected(null)}><Plus/> Nuevo beneficio</button>{filteredItems.length ? filteredItems.map(item => <button className={selected?.id === item.id ? 'active' : ''} key={item.id} onClick={() => setSelected(item)}><strong>{item.title}</strong><span>{item.partner || 'Sin empresa informada'}</span></button>) : <div className="neo-admin-no-results"><Search/><strong>Sin coincidencias</strong><span>Probá por beneficio, empresa, rubro o palabra clave.</span></div>}</aside>
    <section className="neo-editor"><div className="neo-editor-title"><div><span>{selected ? 'EDITAR BENEFICIO' : 'NUEVO BENEFICIO'}</span><h2>{selected?.title || 'Crear una oportunidad'}</h2></div></div><div className="neo-form-grid">
      <Field label="Título" value={form.title} onChange={value => change('title', value)}/><Field label="Empresa" value={form.partner} onChange={value => change('partner', value)}/><Field label="Rubro" value={form.category} onChange={value => change('category', value)}/><label>Estado<select value={form.status} onChange={event => change('status', event.target.value)}><option value="activo">Activo</option><option value="revalidacion">A chequear validación</option><option value="proximo">Próximamente</option><option value="finalizado">Finalizado</option></select></label>
      <Field label="Fecha de inicio / publicación" type="date" value={form.startDate || ''} onChange={value => change('startDate', value)}/><Field label="Fecha de fin / vencimiento automático" type="date" value={form.endDate || ''} onChange={value => change('endDate', value)}/><div className="neo-full"><Field label="Resumen" textarea value={form.summary} onChange={value => change('summary', value)}/></div><div className="neo-full"><Field label="Beneficio concreto" textarea value={form.concreteBenefit} onChange={value => change('concreteBenefit', value)}/></div><div className="neo-full"><Field label="Costos, descuentos y condiciones" textarea value={form.costsDiscounts} onChange={value => change('costsDiscounts', value)}/></div><div className="neo-full"><Field label="Descripción" textarea value={form.description} onChange={value => change('description', value)}/></div><div className="neo-full"><Field label="Requisitos (uno por línea)" textarea value={(form.requirements || []).join('\n')} onChange={value => change('requirements', value.split('\n').filter(Boolean))}/></div>
      <div className="neo-full neo-uic-contact-heading"><span>CONTACTO UIC</span><p>Este contacto institucional se mantiene separado de los contactos de la empresa.</p></div><Field label="Persona de contacto UIC" value={form.contactName} onChange={value => change('contactName', value)}/><Field label="Teléfono UIC" value={form.contactPhone} onChange={value => change('contactPhone', value)}/><Field label="Correo UIC" type="email" value={form.contactEmail} onChange={value => change('contactEmail', value)}/><Field label="Alcance" value={form.scope} onChange={value => change('scope', value)}/><CompanyContactsEditor contacts={form.companyContacts || []} onChange={value => change('companyContacts', value)}/><AgreementLinksEditor links={form.agreementLinks || []} onChange={value => { change('agreementLinks', value); change('agreementUrl', value?.[0]?.url || '') }}/><div className="neo-full"><Field label="Imagen externa / respaldo visual (URL)" value={form.externalImageUrl || ''} onChange={value => change('externalImageUrl', value)}/><Field label="Texto alternativo de imagen" value={form.externalImageAlt || ''} onChange={value => change('externalImageAlt', value)}/></div><label className="neo-check"><input type="checkbox" checked={form.published !== false} onChange={event => change('published', event.target.checked)}/> Publicar en el portal</label><label className="neo-upload"><Upload/> <span>{files.length ? `${files.length} imagen${files.length === 1 ? '' : 'es'} seleccionada${files.length === 1 ? '' : 's'}` : 'Agregar flyers'}</span><input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={event => { setError(''); setFiles([...event.target.files]) }}/></label>{files.length > 0 && <div className="neo-upload-files">{files.map(file => <span key={`${file.name}-${file.size}`}>{file.name} · {(file.size / 1024).toFixed(0)} KB</span>)}</div>}
    </div>{message && <div className="neo-message">{message}</div>}{error && <div className="neo-form-error">{error}</div>}<div className="neo-editor-actions">{selected && <button className="danger" onClick={remove}>Eliminar</button>}<button onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar beneficio'} <Check/></button></div></section></div>
}

function Admin() {
  const [authenticated, setAuthenticated] = useState(null); const [items, setItems] = useState([]); const [selected, setSelected] = useState(null)
  const reload = async selectedId => { const data = await request('/api/admin/beneficios'); setItems(data); if (selectedId) setSelected(data.find(item => String(item.id) === String(selectedId)) || null) }
  useEffect(() => { request('/api/admin/me').then(async data => { setAuthenticated(data.authenticated); if (data.authenticated) await reload() }).catch(() => setAuthenticated(false)) }, [])
  if (authenticated === null) return <div className="neo-loading">Verificando acceso…</div>
  if (!authenticated) return <Login onSuccess={async () => { setAuthenticated(true); await reload() }}/>
  const logout = async () => { await request('/api/admin/logout', { method: 'POST', body: '{}' }); setAuthenticated(false) }
  return <><Header admin/><main className="neo-admin-page"><div className="neo-shell"><div className="neo-admin-heading"><div><span>PANEL PRIVADO</span><h1>Administración del nuevo portal</h1><p>Alta, edición, publicación y material visual desde una sola pantalla.</p></div><button onClick={logout}><LogOut/> Cerrar sesión</button></div><Editor items={items} selected={selected} setSelected={setSelected} reload={reload}/></div></main></>
}

function normalizeCompanySearch(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() }

function MaintenancePanel({ contact }) {
  return <div className="neo-maintenance"><ShieldCheck/><span>PORTAL DE BENEFICIOS UIC</span><h2>Estamos realizando tareas de mantenimiento.</h2><p>Pedimos disculpas por la interrupción. Estamos trabajando para mantener el servicio disponible, seguro y actualizado. Por favor intentá nuevamente más tarde. Si necesitás asistencia, podés comunicarte con Administración UIC.</p><strong>{contact?.name || 'María José Godoy (Majo)'}</strong><a href={`tel:${contact?.phone || '3489650104'}`}>{contact?.phone || '3489 65 0104'}</a><button type="button" onClick={() => go('/')}><ArrowLeft/> Volver al Portal de Beneficios</button></div>
}

function RecipientContactRow({ item, onSaved }) {
  const [form,setForm]=useState({...item}); const [saving,setSaving]=useState(false); const [message,setMessage]=useState('')
  useEffect(()=>setForm({...item}),[item])
  const change=(key,value)=>setForm(current=>({...current,[key]:value}))
  const save=async()=>{setSaving(true);setMessage('');try{const saved=await request(`/api/admin/difusion/recipients/${item.id}`,{method:'PUT',body:JSON.stringify({companyName:form.company_name,contactName:form.contact_name,email:form.email,phone:form.phone,enabled:form.enabled,notes:form.notes})});setForm(saved);setMessage('Guardado');onSaved?.(saved)}catch(e){setMessage(e.message)}finally{setSaving(false)}}
  return <article className={`neo-recipient-contact ${!form.email_valid ? 'invalid' : ''}`}>
    <div className="neo-recipient-fields"><input value={form.company_name || ''} onChange={e=>change('company_name',e.target.value)} aria-label="Empresa"/><input value={form.contact_name || ''} onChange={e=>change('contact_name',e.target.value)} placeholder="Contacto" aria-label="Contacto"/><input value={form.email || ''} onChange={e=>change('email',e.target.value)} placeholder="Correo" aria-label="Correo"/><input value={form.phone || ''} onChange={e=>change('phone',e.target.value)} placeholder="Teléfono" aria-label="Teléfono"/></div>
    <div className="neo-recipient-meta"><span>{form.source_type === 'socio' ? `SOCIO UIC${form.member_number ? ` Nº ${form.member_number}` : ''}` : form.source_type === 'convenio' ? 'CONVENIO / NO SOCIO' : 'ALTA MANUAL'}</span>{!form.email_valid && <strong>Correo a revisar · este contacto no recibe envíos</strong>}{form.notes && <small>{form.notes}</small>}</div>
    <div className="neo-recipient-actions"><button onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar contacto'}</button>{message && <small>{message}</small>}</div>
  </article>
}

function RecipientCompany({ sourceType, companyName, contacts, onChanged }) {
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState('')
  const validContacts=contacts.filter(x=>x.email_valid)
  const enabled=validContacts.length>0 && validContacts.some(x=>x.enabled)
  const toggle=async(value)=>{setBusy(true);setMessage('');try{const updated=await request('/api/admin/difusion/recipient-companies/toggle',{method:'PUT',body:JSON.stringify({sourceType,companyName,enabled:value})});onChanged?.(updated);setMessage(value?'Empresa habilitada':'Empresa destildada')}catch(e){setMessage(e.message)}finally{setBusy(false)}}
  return <section className={`neo-recipient-company ${!validContacts.length ? 'invalid' : ''}`}>
    <div className="neo-recipient-company-head">
      <label className="neo-recipient-check"><input type="checkbox" checked={enabled} disabled={busy||!validContacts.length} onChange={e=>toggle(e.target.checked)}/><span>Recibe comunicaciones</span></label>
      <div><strong>{companyName}</strong><small>{contacts.length} contacto{contacts.length===1?'':'s'} · {sourceType==='socio'?'Socio UIC':sourceType==='convenio'?'Convenio / no socio':'Alta manual'}</small></div>
      <span className={`neo-recipient-company-state ${enabled?'on':'off'}`}>{enabled?'HABILITADA':'DESTILDADA'}</span>
    </div>
    {message&&<div className="neo-recipient-company-message">{message}</div>}
    <div className="neo-recipient-company-contacts">{contacts.map(item=><RecipientContactRow key={item.id} item={item} onSaved={onChanged}/>)}</div>
  </section>
}

function RecipientManager({ maintenanceContact }) {
  const [items,setItems]=useState([]); const [query,setQuery]=useState(''); const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const [adding,setAdding]=useState(false)
  const [newItem,setNewItem]=useState({sourceType:'socio',companyName:'',contactName:'',email:'',phone:'',enabled:true,notes:''})
  const load=()=>request('/api/admin/difusion/recipients').then(setItems).catch(e=>setError(e.message)).finally(()=>setLoading(false))
  useEffect(load,[])
  const filtered=useMemo(()=>{const needle=normalizeCompanySearch(query);return items.filter(x=>!needle||normalizeCompanySearch(`${x.company_name} ${x.contact_name} ${x.email}`).includes(needle))},[items,query])
  const groups=[['socio','SOCIOS UIC'],['convenio','CONVENIOS / NO SOCIOS'],['manual','ALTAS MANUALES']]
  const add=async()=>{setAdding(true);setError('');try{await request('/api/admin/difusion/recipients',{method:'POST',body:JSON.stringify(newItem)});setNewItem({sourceType:'socio',companyName:'',contactName:'',email:'',phone:'',enabled:true,notes:''});await load()}catch(e){setError(e.message)}finally{setAdding(false)}}
  const mergeUpdated=(updated)=>{const list=Array.isArray(updated)?updated:[updated];setItems(current=>current.map(x=>list.find(u=>u.id===x.id)||x))}
  if(loading)return <div className="neo-loading">Cargando destinatarios…</div>
  if(error && !items.length)return <MaintenancePanel contact={maintenanceContact}/>
  return <section className="neo-recipients"><div className="neo-section-heading"><span>PADRÓN ÚNICO DE ENVÍO</span><h2>Socios y empresas con convenio</h2><p>Cada empresa tiene su propia casilla <strong>Recibe comunicaciones</strong>. Destildar no borra la empresa ni sus contactos: sólo la excluye de los próximos envíos. Las empresas con más de un contacto conservan una sola habilitación empresarial.</p></div>
    <div className="neo-recipient-summary"><div><strong>{new Set(items.map(x=>`${x.source_type}:${x.company_name}`)).size}</strong><span>empresas</span></div><div><strong>{new Set(items.filter(x=>x.enabled&&x.email_valid).map(x=>`${x.source_type}:${x.company_name}`)).size}</strong><span>empresas habilitadas</span></div><div><strong>{new Set(items.filter(x=>x.source_type==='convenio').map(x=>x.company_name)).size}</strong><span>convenios / no socios</span></div></div>
    <label className="neo-search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar empresa, contacto o correo…"/>{query&&<button onClick={()=>setQuery('')}><X/></button>}</label>
    <details className="neo-add-recipient"><summary><Plus/> Agregar empresa o contacto</summary><div className="neo-add-recipient-form"><select value={newItem.sourceType} onChange={e=>setNewItem({...newItem,sourceType:e.target.value})}><option value="socio">Socio UIC</option><option value="convenio">Convenio / no socio</option><option value="manual">Alta manual</option></select><input placeholder="Empresa" value={newItem.companyName} onChange={e=>setNewItem({...newItem,companyName:e.target.value})}/><input placeholder="Contacto" value={newItem.contactName} onChange={e=>setNewItem({...newItem,contactName:e.target.value})}/><input placeholder="Correo" value={newItem.email} onChange={e=>setNewItem({...newItem,email:e.target.value})}/><input placeholder="Teléfono" value={newItem.phone} onChange={e=>setNewItem({...newItem,phone:e.target.value})}/><label><input type="checkbox" checked={newItem.enabled} onChange={e=>setNewItem({...newItem,enabled:e.target.checked})}/> Recibe comunicaciones</label><button onClick={add} disabled={adding}>{adding?'Agregando…':'Agregar'}</button></div></details>
    {error&&<div className="neo-form-error">{error}</div>}
    {groups.map(([type,title])=>{const group=filtered.filter(x=>x.source_type===type);if(!group.length)return null;const byCompany=[...group.reduce((map,item)=>{const key=item.company_name||'Sin empresa';if(!map.has(key))map.set(key,[]);map.get(key).push(item);return map},new Map()).entries()];return <div className="neo-recipient-group" key={type}><div className="neo-recipient-group-head"><h3>{title}</h3><span>{byCompany.length} empresa{byCompany.length===1?'':'s'}</span></div>{byCompany.map(([companyName,contacts])=><RecipientCompany key={`${type}:${companyName}`} sourceType={type} companyName={companyName} contacts={contacts} onChanged={mergeUpdated}/>)}</div>})}
  </section>
}

function CampaignEditor({ company, benefit, settings, onClose }) {
  const fixedSubject=`Nuevo beneficio exclusivo UIC · ${company.name}`
  const [body,setBody]=useState(''); const [fontFamily,setFontFamily]=useState('Arial'); const [fontSize,setFontSize]=useState('normal'); const [files,setFiles]=useState([]); const [campaign,setCampaign]=useState(null); const [busy,setBusy]=useState(false); const [message,setMessage]=useState(''); const textareaRef=useRef(null)
  const invalidate=()=>{if(campaign)setCampaign(null)}
  const wrap=(left,right=left)=>{const el=textareaRef.current;if(!el)return;const a=el.selectionStart,b=el.selectionEnd;const value=body;setBody(value.slice(0,a)+left+value.slice(a,b)+right+value.slice(b));invalidate();requestAnimationFrame(()=>{el.focus();el.setSelectionRange(a+left.length,b+left.length)})}
  const save=async()=>{setBusy(true);setMessage('');try{const data=new FormData();Object.entries({companyKey:company.key,companyName:company.name,benefitSlug:benefit.slug,benefitTitle:benefit.title,originatorName:company.contactName||'Néstor Manucci',originatorEmail:company.email||'',bodyMarkup:body,fontFamily,fontSize}).forEach(([k,v])=>data.append(k,v));files.forEach(file=>data.append('files',file));const saved=await request('/api/admin/difusion/campaigns',{method:'POST',body:data});setCampaign(saved);setMessage(saved.safety_status==='blocked'?'Contenido bloqueado: revisá el texto antes de continuar.':'Borrador guardado. Ahora realizá obligatoriamente el correo de prueba.') }catch(e){setMessage(e.message)}finally{setBusy(false)}}
  const action=async(kind)=>{if(!campaign)return setMessage('Guardá primero el borrador.');setBusy(true);setMessage('');try{const result=await request(`/api/admin/difusion/campaigns/${campaign.id}/${kind}`,{method:'POST',body:'{}'});setCampaign(result);setMessage(kind==='test'?'Prueba enviada únicamente al responsable. No consume el cupo mensual. Revisala antes de solicitar validación.':'Solicitud enviada a UIC para validación. Todavía no se envió al padrón general.')}catch(e){setMessage(e.message)}finally{setBusy(false)}}
  const downloadCopy=()=>{const text=`DIFUSIÓN DE BENEFICIOS UIC\nEmpresa: ${company.name}\nBeneficio: ${benefit.title}\nAsunto: ${fixedSubject}\n\n${body}\n\nAdjuntos: ${files.map(file=>file.name).join(', ')||'Sin adjuntos'}\n`;const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`Difusion_UIC_${company.name.replace(/[^a-z0-9]+/gi,'_')}.txt`;a.click();URL.revokeObjectURL(url)}
  return <section className="neo-campaign-editor"><div className="neo-campaign-head"><div><span>PILOTO CONTROLADO · {company.name}</span><h2>Preparar difusión</h2><p>{benefit.title}</p></div><button type="button" onClick={onClose}><X/> Cerrar</button></div>
    <div className="neo-campaign-warning"><ShieldCheck/><div><strong>Secuencia obligatoria</strong><p>1) Guardar borrador. 2) Enviar una prueba al correo de la empresa. 3) Revisar cómo llegó y corregir si hace falta. 4) Recién después solicitar validación UIC. 5) Una vez validada, la empresa recibe nuevamente la comunicación como constancia. Mientras el piloto esté activo, el padrón general no recibe correos.</p></div></div>
    {!settings?.mailConfigured&&<div className="neo-campaign-disabled"><CircleAlert/><span>La casilla emisora todavía no está configurada. El administrador debe completar “Correo emisor” antes de poder enviar la prueba.</span></div>}
    {settings?.mailConfigured&&!settings?.massSendEnabled&&<div className="neo-campaign-disabled"><ShieldCheck/><span>Modo seguro activo: prueba y validación interna disponibles; envío masivo al padrón expresamente bloqueado.</span></div>}
    <label>Asunto institucional · no editable<input value={fixedSubject} readOnly className="neo-readonly"/></label>
    <div className="neo-editor-toolbar"><button type="button" onClick={()=>wrap('**')}>B</button><button type="button" onClick={()=>wrap('_')}>I</button><button type="button" onClick={()=>wrap('__')}>U</button><select value={fontFamily} onChange={e=>{setFontFamily(e.target.value);invalidate()}}><option>Arial</option><option>Verdana</option><option>Tahoma</option><option>Georgia</option></select><select value={fontSize} onChange={e=>{setFontSize(e.target.value);invalidate()}}><option value="small">Texto chico</option><option value="normal">Texto normal</option><option value="large">Texto grande</option></select></div>
    <label>Cuerpo del correo<textarea ref={textareaRef} value={body} onChange={e=>{setBody(e.target.value);invalidate()}} rows="12" placeholder="Escribí la comunicación. El asunto está definido por UIC y no puede modificarse." maxLength="12000"/></label>
    <label className="neo-upload"><Upload/><span>{files.length?`${files.length} archivo(s) seleccionado(s)`:'Adjuntar JPG, PNG o PDF · hasta 3 archivos'}</span><input type="file" multiple accept="image/jpeg,image/png,application/pdf" onChange={e=>{setFiles([...e.target.files].slice(0,3));invalidate()}}/></label>
    {files.length>0&&<div className="neo-upload-files">{files.map(f=><span key={`${f.name}-${f.size}`}>{f.name} · {(f.size/1024/1024).toFixed(2)} MB</span>)}</div>}
    {campaign&&<div className={`neo-safety-result ${campaign.safety_status}`}><strong>Control automático: {campaign.safety_status==='ok'?'APROBADO INICIALMENTE':campaign.safety_status==='review'?'REQUIERE VALIDACIÓN':'BLOQUEADO'}</strong><span>{campaign.safety_notes}</span></div>}
    {message&&<div className="neo-message">{message}</div>}
    <div className="neo-campaign-actions"><button type="button" onClick={save} disabled={busy||!body.trim()}>{busy?'Procesando…':'Guardar borrador'}</button><button type="button" onClick={downloadCopy} disabled={!body.trim()}>Descargar copia</button><button type="button" onClick={()=>action('test')} disabled={busy||!campaign||campaign.safety_status==='blocked'||!settings?.mailConfigured}>Enviar correo de prueba</button><button type="button" onClick={()=>action('request-approval')} disabled={busy||!campaign||!campaign.test_sent_at}>Solicitar validación UIC</button></div>
    <div className="neo-validation-explanation"><Mail/><p><strong>La prueba es obligatoria.</strong> Si no se realizó con éxito, el sistema no habilita “Solicitar validación UIC”. Cuando UIC valide la publicación, la empresa volverá a recibir el mismo correo final en su casilla. Esa recepción será la confirmación de que fue validado.</p></div>
  </section>
}

function ApprovalQueue({ settings }) {
  const [items,setItems]=useState([]); const [loading,setLoading]=useState(true); const [message,setMessage]=useState('')
  const load=()=>request('/api/admin/difusion/campaigns?status=pending').then(setItems).catch(e=>setMessage(e.message)).finally(()=>setLoading(false)); useEffect(load,[])
  const reject=async id=>{const reason=window.prompt('Motivo del rechazo (opcional):','Requiere corrección antes de enviar.')||'';try{await request(`/api/admin/difusion/campaigns/${id}/reject`,{method:'POST',body:JSON.stringify({reason})});await load()}catch(e){setMessage(e.message)}}
  const approve=async id=>{const word=settings?.massSendEnabled?'ENVIAR':'VALIDAR';const confirm=window.prompt(`CONTROL DE SEGURIDAD: escribí ${word} para autorizar esta comunicación.`, '');if(!confirm)return;try{const result=await request(`/api/admin/difusion/campaigns/${id}/approve`,{method:'POST',body:JSON.stringify({confirm})});setMessage(result.massSent?`Envío autorizado: primero llegó al responsable y luego a ${result.bccRecipients} destinatarios habilitados.`:'Validación piloto completada. La empresa recibió su copia final; NO se envió ningún correo al padrón general.');await load()}catch(e){setMessage(e.message)}}
  if(loading)return <div className="neo-loading neo-tab-loading">Cargando validaciones en segundo plano…</div>
  return <section className="neo-approvals"><div className="neo-section-heading"><span>COMISIÓN DIRECTIVA / ADMINISTRACIÓN</span><h2>Validaciones pendientes</h2><p>Esta pantalla es exclusivamente administrativa. Ninguna empresa externa tendrá acceso. Durante el piloto, validar envía la constancia final sólo al originador y mantiene bloqueado el padrón general.</p></div>{!settings?.mailConfigured&&<div className="neo-campaign-disabled"><CircleAlert/><span>Configurá primero la casilla emisora en “Correo emisor”.</span></div>}{!settings?.massSendEnabled&&<div className="neo-campaign-disabled"><ShieldCheck/><span>Envío masivo protegido: VALIDAR no distribuye a socios mientras el modo piloto esté activo.</span></div>}{message&&<div className="neo-message">{message}</div>}{!items.length?<div className="neo-empty-approval"><Check/><strong>No hay comunicaciones pendientes.</strong></div>:items.map(item=><article className="neo-approval-card" key={item.id}><div className="neo-approval-head"><span>{item.company_name}</span><strong>{item.benefit_title}</strong></div><h3>{item.subject}</h3><pre>{item.body_markup}</pre><div className="neo-approval-meta"><span>Origen: {item.originator_email}</span><span>Control: {item.safety_status}</span><span>{item.files?.length||0} adjunto(s)</span><span>Prueba: {item.test_sent_at?'realizada':'pendiente'}</span></div><div className="neo-approval-actions"><button type="button" className="danger" onClick={()=>reject(item.id)}>Rechazar</button><button type="button" onClick={()=>approve(item.id)}>{settings?.massSendEnabled?'Aprobar y enviar':'Validar · modo piloto'}</button></div></article>)}</section>
}

function MailSettings({ onSettingsChanged }) {
  const empty={host:'smtp.gmail.com',port:465,secure:true,username:'tesoreria@uic-campana.com.ar',password:'',fromEmail:'tesoreria@uic-campana.com.ar',fromName:'Unión Industrial de Campana · Beneficios',testRecipient:'',passwordConfigured:false,massSendEnabled:false}
  const [form,setForm]=useState(empty); const [loading,setLoading]=useState(true); const [busy,setBusy]=useState(false); const [message,setMessage]=useState(''); const [error,setError]=useState('')
  const load=()=>request('/api/admin/difusion/mail-settings').then(data=>setForm({...empty,...data,password:''})).catch(e=>setError(e.message)).finally(()=>setLoading(false)); useEffect(load,[])
  const change=(key,value)=>setForm(current=>({...current,[key]:value}))
  const save=async()=>{setBusy(true);setMessage('');setError('');try{const result=await request('/api/admin/difusion/mail-settings',{method:'PUT',body:JSON.stringify(form)});setMessage(`Configuración guardada. Remitente: ${result.fromEmail}`);change('password','');await load();onSettingsChanged?.()}catch(e){setError(e.message)}finally{setBusy(false)}}
  const test=async()=>{setBusy(true);setMessage('');setError('');try{const result=await request('/api/admin/difusion/mail-settings/test',{method:'POST',body:JSON.stringify({recipient:form.testRecipient})});setMessage(`Prueba técnica enviada correctamente a ${result.recipient}. No se utilizó el padrón.`)}catch(e){setError(e.message)}finally{setBusy(false)}}
  if(loading)return <div className="neo-loading neo-tab-loading">Cargando configuración de correo…</div>
  return <section className="neo-mail-settings"><div className="neo-section-heading"><span>CONFIGURACIÓN ADMINISTRATIVA</span><h2>Correo emisor de Difusión</h2><p>Casilla provisoria: <strong>tesoreria@uic-campana.com.ar</strong>. En el futuro podrá reemplazarse por <strong>beneficios@uic-campana.com.ar</strong> desde esta misma pantalla. La contraseña SMTP nunca vuelve a mostrarse una vez guardada.</p></div>
    <div className="neo-mail-safety"><ShieldCheck/><div><strong>Modo piloto protegido</strong><p>La prueba técnica, la prueba de cada publicación y la solicitud interna de validación pueden funcionar. El envío masivo a socios permanece bloqueado hasta habilitarlo expresamente en Render.</p></div></div>
    <div className="neo-mail-grid"><label>Servidor SMTP<input value={form.host} onChange={e=>change('host',e.target.value)} placeholder="smtp.gmail.com"/></label><label>Puerto<input type="number" value={form.port} onChange={e=>change('port',Number(e.target.value))}/></label><label className="neo-mail-check"><input type="checkbox" checked={form.secure} onChange={e=>change('secure',e.target.checked)}/> Conexión segura SSL/TLS</label><label>Usuario / correo SMTP<input value={form.username} onChange={e=>change('username',e.target.value)}/></label><label>Contraseña o clave de aplicación<input type="password" value={form.password} onChange={e=>change('password',e.target.value)} placeholder={form.passwordConfigured?'Configurada · dejar vacío para conservar':'Ingresar clave SMTP'}/></label><label>Correo remitente<input value={form.fromEmail} onChange={e=>change('fromEmail',e.target.value)}/></label><label>Nombre remitente<input value={form.fromName} onChange={e=>change('fromName',e.target.value)}/></label><label>Correo para prueba técnica<input value={form.testRecipient} onChange={e=>change('testRecipient',e.target.value)} placeholder="Tu correo para recibir una prueba"/></label></div>
    {error&&<div className="neo-form-error">{error}</div>}{message&&<div className="neo-message">{message}</div>}
    <div className="neo-mail-actions"><button type="button" onClick={save} disabled={busy}>{busy?'Procesando…':'Guardar configuración'}</button><button type="button" onClick={test} disabled={busy||!form.passwordConfigured}>Enviar prueba técnica</button></div>
    <div className="neo-mail-state"><span>Contraseña SMTP: <strong>{form.passwordConfigured?'CONFIGURADA':'PENDIENTE'}</strong></span><span>Envío masivo: <strong>{form.massSendEnabled?'HABILITADO':'BLOQUEADO'}</strong></span></div>
  </section>
}

function DiffusionGuide() {
  return <div className="neo-diffusion-placeholder neo-diffusion-guide"><Mail/><h2>Elegí tu empresa</h2><p className="neo-guide-lead">Podés revisar sus beneficios y estado de habilitación. Antes de comenzar, conocé el circuito completo de difusión.</p><ol><li><strong>1 · Elegí la empresa y el beneficio.</strong><span>Ingresá únicamente en la empresa que te corresponde y verificá qué beneficio querés comunicar.</span></li><li><strong>2 · Prepará y guardá el borrador.</strong><span>El asunto lo define automáticamente UIC. Podés trabajar el cuerpo, formato y adjuntos. Conservá también una copia propia de tu material.</span></li><li><strong>3 · Hacé obligatoriamente el modo prueba.</strong><span>La primera copia llega solamente al correo del responsable. Revisá texto, imágenes, adjuntos y presentación. Esta prueba no consume el cupo mensual.</span></li><li><strong>4 · Corregí si es necesario.</strong><span>Si cambiás cualquier contenido, volvé a guardar y realizá una nueva prueba. La validación permanece bloqueada hasta completar una prueba exitosa.</span></li><li><strong>5 · Solicitá validación UIC.</strong><span>La comunicación queda pendiente para revisión institucional. Las empresas no acceden a Destinatarios ni a Validaciones.</span></li><li><strong>6 · Confirmación de validación.</strong><span>Cuando UIC la valide, recibirás nuevamente el correo final en tu casilla. Esa recepción es la confirmación de que la publicación fue autorizada.</span></li><li><strong>7 · Envío al padrón.</strong><span>Durante esta etapa piloto está deshabilitado. Cuando se habilite, sólo llegará a las empresas del padrón que estén tildadas para recibir comunicaciones.</span></li></ol><div className="neo-guide-warning"><ShieldCheck/><span><strong>Nunca se habilita un envío sin prueba previa.</strong> Si la prueba no se realizó, el sistema no permite avanzar a validación ni a distribución.</span></div></div>
}

function Diffusion() {
  const [authenticated,setAuthenticated]=useState(null); const [companies,setCompanies]=useState([]); const [settings,setSettings]=useState(null); const [query,setQuery]=useState(''); const [selectedCompany,setSelectedCompany]=useState(null); const [tab,setTab]=useState('empresas'); const [editing,setEditing]=useState(null); const [maintenance,setMaintenance]=useState(false)
  const load=async()=>{const [companyData,settingData]=await Promise.all([request('/api/admin/difusion/companies'),request('/api/admin/difusion/settings')]);setCompanies(companyData);setSettings(settingData);setMaintenance(!settingData.databaseAvailable)}
  useEffect(()=>{request('/api/admin/me').then(async data=>{setAuthenticated(data.authenticated);if(data.authenticated)await load()}).catch(()=>setAuthenticated(false))},[])
  const visible=useMemo(()=>{const needle=normalizeCompanySearch(query);return companies.filter(company=>!needle||normalizeCompanySearch(company.name).includes(needle)||company.benefits.some(item=>normalizeCompanySearch(`${item.title} ${item.category}`).includes(needle)))},[companies,query])
  const switchTab=next=>{setTab(next);setEditing(null);requestAnimationFrame(()=>document.querySelector('.neo-diffusion-tabs')?.scrollIntoView({block:'nearest'}))}
  if(authenticated===null)return <div className="neo-loading">Verificando acceso…</div>
  if(!authenticated)return <Login mode="diffusion" onSuccess={async()=>{setAuthenticated(true);await load()}}/>
  const selected=selectedCompany?companies.find(company=>company.key===selectedCompany)||null:null
  return <><Header admin/><main className="neo-diffusion-page"><div className="neo-shell"><div className="neo-diffusion-top"><button type="button" onClick={()=>go('/')}><ArrowLeft/> Volver al Portal de Beneficios</button><span><ShieldCheck/> ACCESO TEMPORAL · SOLO ADMINISTRADOR</span></div>
    <section className="neo-diffusion-intro"><div><span>PILOTO v3.9.2</span><h1>Difusión de Beneficios</h1><p>El acceso público continúa bloqueado. Tecno Logisti-K SA funciona como empresa piloto para probar borradores, correo de prueba y validación sin distribuir mensajes al padrón general.</p></div><div className="neo-diffusion-lock"><LockKeyhole/><strong>Acceso público deshabilitado</strong><small>Destinatarios, Validaciones y Correo emisor son herramientas exclusivas del administrador y nunca serán visibles para las empresas.</small></div></section>
    <nav className="neo-diffusion-tabs" aria-label="Secciones de Difusión"><button type="button" className={tab==='empresas'?'active':''} onClick={()=>switchTab('empresas')}><Building2/> Empresas y beneficios</button><button type="button" className={tab==='destinatarios'?'active':''} onClick={()=>switchTab('destinatarios')}><Users/> Destinatarios</button><button type="button" className={tab==='validaciones'?'active':''} onClick={()=>switchTab('validaciones')}><ShieldCheck/> Validaciones</button><button type="button" className={tab==='correo'?'active':''} onClick={()=>switchTab('correo')}><Mail/> Correo emisor</button></nav>
    {maintenance?<MaintenancePanel contact={settings?.maintenanceContact}/>:<div className="neo-diffusion-tab-stack">
      <div hidden={tab!=='destinatarios'}><RecipientManager maintenanceContact={settings?.maintenanceContact}/></div>
      <div hidden={tab!=='validaciones'}><ApprovalQueue settings={settings}/></div>
      <div hidden={tab!=='correo'}><MailSettings onSettingsChanged={load}/></div>
      <div hidden={tab!=='empresas'}>{editing?<CampaignEditor company={editing.company} benefit={editing.benefit} settings={settings} onClose={()=>setEditing(null)}/>:<><section className="neo-diffusion-status"><div><strong>{companies.length}</strong><span>empresas / prestadores identificados</span></div><div><strong>1</strong><span>empresa piloto habilitada</span></div><div><strong>{settings?.mailConfigured?'PRUEBA LISTA':'CORREO PENDIENTE'}</strong><span>{settings?.massSendEnabled?'envío masivo habilitado':'padrón masivo bloqueado'}</span></div></section><section className="neo-diffusion-workspace"><div className="neo-diffusion-directory"><div className="neo-diffusion-directory-head"><span>DIRECTORIO DE EMPRESAS</span><h2>Seleccioná una empresa</h2><p>Tecno Logisti-K SA está incorporada como empresa de prueba. Las demás continúan en modo vista previa hasta la apertura pública.</p></div><label className="neo-search neo-diffusion-search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar empresa o beneficio…"/>{query&&<button type="button" onClick={()=>setQuery('')}><X/></button>}</label><div className="neo-diffusion-company-list">{visible.map(company=><button type="button" key={company.key} className={selectedCompany===company.key?'active':''} onClick={()=>setSelectedCompany(company.key)}><Building2/><span><strong>{company.name}</strong><small>{company.benefits.length} beneficio{company.benefits.length===1?'':'s'}{company.testMode?' · PILOTO':''}</small></span><ChevronRight/></button>)}</div></div><div className="neo-diffusion-preview">{selected?<><div className="neo-diffusion-preview-head"><span>{selected.testMode?'EMPRESA PILOTO HABILITADA':'VISTA PREVIA DEL FUTURO PANEL'}</span><h2>{selected.name}</h2><p>{selected.testMode?`${selected.contactName} · ${selected.role} · ${selected.email}`:'Una sola cuenta de empresa administrará todos sus beneficios; el cupo será independiente por beneficio.'}</p></div>{selected.benefits.map(item=><article key={item.slug}><div><span>{item.category}</span><h3>{item.title}</h3><p>{item.summary}</p></div><div className="neo-diffusion-benefit-state"><strong>{selected.testMode?'🟢 Piloto habilitado':'🔒 Acceso aún cerrado'}</strong><small>{selected.testMode?'Guardar → prueba obligatoria → validación UIC. El padrón general sigue bloqueado.':'Se habilitará cuando finalice la etapa piloto.'}</small><button type="button" disabled={!selected.testMode} onClick={()=>selected.testMode&&setEditing({company:selected,benefit:item})}>{selected.testMode?'Preparar difusión':'Preparar difusión · Próxima etapa'}</button></div></article>)}</>:<DiffusionGuide/>}</div></section></>}</div>
    </div>}
    <div className="neo-diffusion-bottom"><button type="button" onClick={()=>go('/')}><ArrowLeft/> Volver al Portal de Beneficios</button></div></div></main><Footer/></>
}

function Footer() { return <footer className="neo-footer"><div className="neo-shell"><Brand/><p>Unión Industrial de Campana · Beneficios que fortalecen a nuestra comunidad productiva.</p><a href="https://uic-campana.com.ar/" target="_blank" rel="noreferrer">uic-campana.com.ar</a></div></footer> }

export default function App() {
  const route = useRoute()
  if (route === '/administracion') return <Admin/>
  if (route === '/difusion') return <Diffusion/>
  if (route.startsWith('/beneficio/')) return <Detail slug={decodeURIComponent(route.split('/')[2] || '')}/>
  return <Home/>
}
