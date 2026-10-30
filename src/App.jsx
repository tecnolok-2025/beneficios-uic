import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, BadgePercent, Building2, Check, ChevronRight, CircleAlert, Factory,
  Eye, EyeOff, HeartHandshake, LayoutGrid, LockKeyhole, LogOut, Mail, Menu, Phone, Plus, RefreshCw,
  Search, ShieldCheck, Sparkles, Upload, Download, FolderOpen, Globe2, ImagePlus, MessageCircle, Users, X
} from 'lucide-react'
import { rankBenefits } from './search.js'
import { effectiveStatus } from './status.js'

const recentSlugs = new Set(['dnv-certificacion-sistemas-gestion-uic', 'finanzas-corporativas-praxis', 'tibest-broker-seguros-uic', 'ceop-internacional-formacion-liderazgo-uic', 'affinity-broker-seguros-condiciones-preferenciales', 'app-uic-comunicacion-servicios-acceso', 'talento-pyme-plataforma-vinculacion-laboral', 'requerimientos-institucionales-cpf', 'portal-beneficios-uic-digital', 'convenio-marco-aderpe-uic', 'uipba-open-english-business-80-off', 'uipba-provincia-seguros-tarifas-bonificadas', 'uipba-unlp-ingenieria-posgrado-15', 'uipba-programa-proveedores-energia-mineria-oil-gas', 'uipba-asistencia-pyme', 'uipba-iram-bonificaciones', 'uipba-sancor-salud-beneficio-historico', 'uipba-movistar-negocios-bonificaciones', 'uipba-banco-nacion-beneficios-pyme', 'uipba-ucema-descuentos-capacitacion', 'uipba-softlanding-asesoramiento-tarifa-diferencial', 'uipba-centro-despachantes-aduana', 'uipba-bvmw-cooperacion-alemania', 'red-summa-education-convenio-institucional-uic', 'cadema-bureau-barrancas-beneficio-uic', 'expo-globalports-2026-descuento-uic'])

const emptyBenefit = {
  title: '', partner: '', category: '', status: 'activo', featured: false, summary: '', description: '',
  concreteBenefit: '', costsDiscounts: '', requirements: [], scope: '', contactName: 'María José Godoy (Majo) – Administración UIC',
  contactPhone: '3489 65 0104', contactEmail: 'uic@uic-campana.com.ar', companyContacts: [], agreementUrl: '', agreementLinks: [], externalImageUrl: '', externalImageAlt: '', startDate: '', endDate: '', published: true
}

const ADMIN_SESSION_EXPIRED_EVENT = 'uic:admin-session-expired'

async function request(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...options, headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.error || `No se pudo completar la operación (HTTP ${response.status})`)
    error.status = response.status
    error.code = data.code || ''
    const adminRequest = String(url).startsWith('/api/admin/') && !String(url).startsWith('/api/admin/login') && !String(url).startsWith('/api/admin/logout')
    if (response.status === 401 && adminRequest) {
      error.code = error.code || 'ADMIN_SESSION_EXPIRED'
      try { window.dispatchEvent(new CustomEvent(ADMIN_SESSION_EXPIRED_EVENT, { detail: { url: String(url) } })) } catch {}
    }
    throw error
  }
  return data
}

function go(path) {
  const target = path || '/'
  // Navegación robusta v3.9.6: los cambios entre pantallas principales realizan
  // una carga completa del documento. Así no dependemos de un estado React
  // anterior, del BFCache ni de un evento SPA para pintar la nueva vista.
  if (location.pathname === target && !location.search && !location.hash) {
    location.reload()
    return
  }
  location.assign(target)
}
function useRoute() {
  const [route, setRoute] = useState(location.pathname)
  useEffect(() => {
    const update = () => setRoute(location.pathname)
    const restore = event => {
      // Si el navegador recupera una pantalla desde memoria, sincronizamos la
      // ruta inmediatamente. main.jsx agrega una segunda protección para BFCache.
      if (event?.persisted) setRoute(location.pathname)
    }
    addEventListener('popstate', update)
    addEventListener('pageshow', restore)
    return () => {
      removeEventListener('popstate', update)
      removeEventListener('pageshow', restore)
    }
  }, [])
  return route
}

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
        <span className="neo-version"><small>NUEVO PORTAL</small><strong>v{health?.version || '3.9.8.1'}</strong></span>
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

function PasswordInput({ value, onChange, placeholder = '', autoFocus = false, minLength, required = false, ariaLabel = 'Mostrar u ocultar contraseña' }) {
  const [visible,setVisible]=useState(false)
  return <span className="neo-password-field"><input type={visible?'text':'password'} value={value||''} onChange={onChange} placeholder={placeholder} autoFocus={autoFocus} minLength={minLength} required={required}/><button type="button" className="neo-password-eye" onClick={()=>setVisible(current=>!current)} aria-label={visible?'Ocultar contraseña':ariaLabel} title={visible?'Ocultar contraseña':'Ver contraseña'}>{visible?<EyeOff/>:<Eye/>}</button></span>
}

function Login({ onSuccess, mode = 'admin', onBack = null, notice = '' }) {
  const [password, setPassword] = useState(''); const [error, setError] = useState('')
  const diffusion = mode === 'diffusion'
  const login = async event => { event.preventDefault(); setError(''); try { await request('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) }); onSuccess() } catch (error) { setError(error.message) } }
  return <div className="neo-login"><form onSubmit={login}><div className="neo-lock"><LockKeyhole/></div><span>{diffusion ? 'ACCESO ADMINISTRADOR' : 'NUEVA ADMINISTRACIÓN'}</span><h1>{diffusion ? 'Difusión de Beneficios' : 'Gestión de beneficios'}</h1><p>{diffusion ? 'Ingresá con la misma clave administrativa del Portal de Beneficios. Este acceso habilita Empresas, Destinatarios, Validaciones y Correo emisor.' : 'Ingresá con la clave configurada en Render.'}</p>{notice&&<div className="neo-session-expired"><CircleAlert/><span>{notice}</span></div>}<label>Contraseña administrativa<PasswordInput value={password} onChange={event => setPassword(event.target.value)} autoFocus/></label>{error && <div className="neo-form-error">{error}</div>}<button>Ingresar <ArrowRight/></button><button type="button" className="neo-back" onClick={() => onBack ? onBack() : go('/')}><ArrowLeft/> {diffusion ? 'Volver a elegir tipo de acceso' : 'Volver al Portal de Beneficios'}</button></form></div>
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
  const [authenticated, setAuthenticated] = useState(null); const [items, setItems] = useState([]); const [selected, setSelected] = useState(null); const [sessionNotice,setSessionNotice]=useState('')
  const reload = async selectedId => { const data = await request('/api/admin/beneficios'); const list=Array.isArray(data)?data:[]; setItems(list); if (selectedId) setSelected(list.find(item => String(item.id) === String(selectedId)) || null) }
  useEffect(() => { request('/api/admin/me').then(async data => { setAuthenticated(data.authenticated); if (data.authenticated) await reload() }).catch(() => setAuthenticated(false)) }, [])
  useEffect(()=>{const expired=()=>{setAuthenticated(false);setItems([]);setSelected(null);setSessionNotice('Tu sesión administrativa venció. Por seguridad, la operación que estabas intentando no se guardó. Ingresá nuevamente para continuar.')};window.addEventListener(ADMIN_SESSION_EXPIRED_EVENT,expired);return()=>window.removeEventListener(ADMIN_SESSION_EXPIRED_EVENT,expired)},[])
  if (authenticated === null) return <div className="neo-loading">Verificando acceso…</div>
  if (!authenticated) return <Login notice={sessionNotice} onSuccess={async () => { setSessionNotice(''); setAuthenticated(true); await reload() }}/>
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
  const reactivate=async()=>{if(!confirm('¿Rehabilitar manualmente a este destinatario?'))return;setSaving(true);try{const saved=await request(`/api/admin/difusion/recipients/${item.id}/reactivate`,{method:'POST',body:'{}'});setForm(saved);setMessage('Recepción rehabilitada');onSaved?.(saved)}catch(e){setMessage(e.message)}finally{setSaving(false)}}
  const optedOut=Boolean(form.opted_out_at)
  return <article className={`neo-recipient-contact ${!form.email_valid?'invalid':''} ${optedOut?'opted-out':''}`}>
    <div className="neo-recipient-fields"><input value={form.company_name||''} onChange={e=>change('company_name',e.target.value)} aria-label="Empresa"/><input value={form.contact_name||''} onChange={e=>change('contact_name',e.target.value)} placeholder="Contacto" aria-label="Contacto"/><input value={form.email||''} onChange={e=>change('email',e.target.value)} placeholder="Correo" aria-label="Correo"/><input value={form.phone||''} onChange={e=>change('phone',e.target.value)} placeholder="Teléfono" aria-label="Teléfono"/></div>
    <div className="neo-recipient-meta"><span>{form.source_type==='socio'?`SOCIO UIC${form.member_number?` Nº ${form.member_number}`:''}`:form.source_type==='socio_confirmar'?'SOCIO A CONFIRMAR':form.source_type==='convenio'?'CONVENIO / NO SOCIO':'ALTA MANUAL'}</span>{!form.email_valid&&<strong>Correo a revisar · este contacto no recibe envíos</strong>}{optedOut&&<strong className="neo-opted-out-label">DESHABILITADO POR EL DESTINATARIO</strong>}{form.notes&&<small>{form.notes}</small>}</div>
    <div className="neo-recipient-actions"><button onClick={save} disabled={saving}>{saving?'Guardando…':'Guardar contacto'}</button>{optedOut&&<button type="button" onClick={reactivate} disabled={saving}>Rehabilitar manualmente</button>}{message&&<small>{message}</small>}</div>
  </article>
}

function RecipientCompany({ sourceType, companyName, contacts, onChanged }) {
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState('')
  const isPilot=normalizeCompanySearch(companyName)===normalizeCompanySearch('TECNO LOGISTI-K SA')
  const validContacts=contacts.filter(x=>x.email_valid&&!x.opted_out_at)
  const enabled=isPilot||(validContacts.length>0&&validContacts.some(x=>x.enabled))
  const toggle=async(value)=>{setBusy(true);setMessage('');try{const updated=await request('/api/admin/difusion/recipient-companies/toggle',{method:'PUT',body:JSON.stringify({sourceType,companyName,enabled:value})});onChanged?.(updated);setMessage(value?'Empresa habilitada':'Empresa destildada')}catch(e){setMessage(e.message)}finally{setBusy(false)}}
  return <section className={`neo-recipient-company ${!validContacts.length&&!isPilot?'invalid':''}`}>
    <div className="neo-recipient-company-head"><label className="neo-recipient-check"><input type="checkbox" checked={enabled} disabled={busy||isPilot||(!validContacts.length&&!isPilot)} onChange={e=>toggle(e.target.checked)}/><span>{isPilot?'Destino de control permanente':'Recibe comunicaciones'}</span></label><div><strong>{companyName}</strong><small>{contacts.length} contacto{contacts.length===1?'':'s'} · {sourceType==='socio'?'Socio UIC':sourceType==='socio_confirmar'?'Socio a confirmar':sourceType==='convenio'?'Convenio / no socio':'Alta manual'}</small></div><span className={`neo-recipient-company-state ${enabled?'on':'off'}`}>{enabled?isPilot?'CONTROL SIEMPRE ACTIVO':'HABILITADA':'DESTILDADA'}</span></div>
    {message&&<div className="neo-recipient-company-message">{message}</div>}
    <div className="neo-recipient-company-contacts">{contacts.map(item=><RecipientContactRow key={item.id} item={item} onSaved={onChanged}/>)}</div>
  </section>
}

function RecipientManager({ maintenanceContact }) {
  const [items,setItems]=useState([]); const [query,setQuery]=useState(''); const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const [adding,setAdding]=useState(false)
  const [newItem,setNewItem]=useState({sourceType:'socio',companyName:'',contactName:'',email:'',phone:'',enabled:true,notes:''})
  const load=()=>request('/api/admin/difusion/recipients').then(setItems).catch(e=>setError(e.message)).finally(()=>setLoading(false)); useEffect(load,[])
  const filtered=useMemo(()=>{const needle=normalizeCompanySearch(query);return items.filter(x=>!needle||normalizeCompanySearch(`${x.company_name} ${x.contact_name} ${x.email}`).includes(needle))},[items,query])
  const groups=[['socio','SOCIOS UIC'],['socio_confirmar','SOCIOS A CONFIRMAR'],['convenio','CONVENIOS / NO SOCIOS'],['manual','ALTAS MANUALES']]
  const add=async()=>{setAdding(true);setError('');try{await request('/api/admin/difusion/recipients',{method:'POST',body:JSON.stringify(newItem)});setNewItem({sourceType:'socio',companyName:'',contactName:'',email:'',phone:'',enabled:true,notes:''});await load()}catch(e){setError(e.message)}finally{setAdding(false)}}
  const mergeUpdated=(updated)=>{const list=Array.isArray(updated)?updated:[updated];setItems(current=>current.map(x=>list.find(u=>u.id===x.id)||x))}
  if(loading)return <div className="neo-loading">Cargando destinatarios…</div>; if(error&&!items.length)return <MaintenancePanel contact={maintenanceContact}/>
  const enabledEmails=new Set(items.filter(x=>x.enabled&&x.email_valid&&!x.opted_out_at).map(x=>(x.email||'').trim().toLowerCase()).filter(Boolean))
  return <section className="neo-recipients"><div className="neo-section-heading"><span>PADRÓN ÚNICO DE ENVÍO</span><h2>Padrón general de destinatarios</h2><p>Cada empresa tiene una casilla independiente. Los contactos importados pueden quedar identificados internamente como <strong>Socio a confirmar</strong>; esta clasificación no modifica el contenido del correo. Los correos repetidos se deduplican antes del envío: una misma dirección recibe una sola copia y, al incorporar nuevos datos, prevalece siempre el registro que ya existía. Si un destinatario utiliza el enlace de baja, queda identificado como <strong>Deshabilitado por el destinatario</strong>.</p></div>
    <div className="neo-recipient-summary"><div><strong>{items.length}</strong><span>contactos registrados</span></div><div><strong>{enabledEmails.size}</strong><span>correos únicos habilitados</span></div><div><strong>{items.filter(x=>x.opted_out_at).length}</strong><span>bajas solicitadas por destinatarios</span></div></div>
    <label className="neo-search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar empresa, contacto o correo…"/>{query&&<button onClick={()=>setQuery('')}><X/></button>}</label>
    <details className="neo-add-recipient"><summary><Plus/> Agregar empresa o contacto</summary><div className="neo-add-recipient-form"><select value={newItem.sourceType} onChange={e=>setNewItem({...newItem,sourceType:e.target.value})}><option value="socio">Socio UIC</option><option value="socio_confirmar">Socio a confirmar</option><option value="convenio">Convenio / no socio</option><option value="manual">Alta manual</option></select><input placeholder="Empresa" value={newItem.companyName} onChange={e=>setNewItem({...newItem,companyName:e.target.value})}/><input placeholder="Contacto" value={newItem.contactName} onChange={e=>setNewItem({...newItem,contactName:e.target.value})}/><input placeholder="Correo" value={newItem.email} onChange={e=>setNewItem({...newItem,email:e.target.value})}/><input placeholder="Teléfono" value={newItem.phone} onChange={e=>setNewItem({...newItem,phone:e.target.value})}/><label><input type="checkbox" checked={newItem.enabled} onChange={e=>setNewItem({...newItem,enabled:e.target.checked})}/> Recibe comunicaciones</label><button onClick={add} disabled={adding}>{adding?'Agregando…':'Agregar'}</button></div></details>
    {error&&<div className="neo-form-error">{error}</div>}
    {groups.map(([type,title])=>{const group=filtered.filter(x=>x.source_type===type);if(!group.length)return null;const byCompany=[...group.reduce((map,item)=>{const key=item.company_name||'Sin empresa';if(!map.has(key))map.set(key,[]);map.get(key).push(item);return map},new Map()).entries()];return <div className="neo-recipient-group" key={type}><div className="neo-recipient-group-head"><h3>{title}</h3><span>{byCompany.length} empresa{byCompany.length===1?'':'s'}</span></div>{byCompany.map(([companyName,contacts])=><RecipientCompany key={`${type}:${companyName}`} sourceType={type} companyName={companyName} contacts={contacts} onChanged={mergeUpdated}/>)}</div>})}
  </section>
}

const EMAIL_LAYOUTS = [
  { id:'institutional', name:'01 · Institucional', description:'Franja UIC, título, texto, una imagen protagonista y cierre.', imageSlots:1, blocks:['headline','intro','body','closing'] },
  { id:'gallery4', name:'02 · Galería 4', description:'Hasta cuatro imágenes compactas en una sola línea, con texto antes y después.', imageSlots:4, blocks:['headline','intro','body','closing'] },
  { id:'duo', name:'03 · Dos protagonistas', description:'Dos imágenes equilibradas lado a lado y desarrollo central.', imageSlots:2, blocks:['headline','intro','body','closing'] },
  { id:'imageLeft', name:'04 · Imagen + texto', description:'Imagen a la izquierda y texto destacado a la derecha; cierre inferior.', imageSlots:2, blocks:['headline','intro','body','closing'] },
  { id:'imageRight', name:'05 · Texto + imagen', description:'Texto destacado a la izquierda e imagen a la derecha; segunda imagen opcional.', imageSlots:2, blocks:['headline','intro','body','closing'] },
  { id:'alternating', name:'06 · Intercalado', description:'Texto e imágenes alternados para contar una historia paso a paso.', imageSlots:4, blocks:['headline','intro','body','body2','closing'] },
  { id:'stacked', name:'07 · Láminas verticales', description:'Hasta cuatro piezas verticales una debajo de otra, siempre con tamaño contenido.', imageSlots:4, blocks:['headline','intro','body','closing'] },
  { id:'editorial', name:'08 · Editorial premium', description:'Cabecera fuerte, imagen principal y galería secundaria de hasta tres imágenes.', imageSlots:4, blocks:['headline','intro','body','body2','closing'] }
]

const DEFAULT_EMAIL_BLOCKS = {
  headline:'', intro:'', body:'', body2:'', closing:''
}

function htmlText(value='') {
  if (typeof document === 'undefined') return String(value).replace(/<[^>]+>/g,' ')
  const div=document.createElement('div'); div.innerHTML=String(value); return (div.textContent||'').replace(/\s+/g,' ').trim()
}

function editorEscape(value='') { return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }

function sanitizeEditorPaste(html='', plain='') {
  if(!html || typeof DOMParser==='undefined') return editorEscape(plain).replace(/\n/g,'<br>')
  try{
    const doc=new DOMParser().parseFromString(html,'text/html'); const allowed=new Set(['P','BR','STRONG','B','EM','I','U','UL','OL','LI','H2','H3','A'])
    const clean=node=>{if(node.nodeType===Node.TEXT_NODE)return editorEscape(node.textContent||'');if(node.nodeType!==Node.ELEMENT_NODE)return '';const tag=node.tagName;if(!allowed.has(tag))return [...node.childNodes].map(clean).join('');const normalized=tag==='B'?'STRONG':tag==='I'?'EM':tag;const inner=[...node.childNodes].map(clean).join('');if(normalized==='BR')return '<br>';if(normalized==='A'){const href=node.getAttribute('href')||'';return /^https?:\/\//i.test(href)||/^mailto:/i.test(href)?`<a href="${editorEscape(href)}">${inner}</a>`:inner}return `<${normalized.toLowerCase()}>${inner}</${normalized.toLowerCase()}>`}
    return [...doc.body.childNodes].map(clean).join('') || editorEscape(plain).replace(/\n/g,'<br>')
  }catch{return editorEscape(plain).replace(/\n/g,'<br>')}
}


const LOCAL_PUBLICATION_FORMAT='UIC_BENEFICIOS_PUBLICACION'
const LOCAL_PUBLICATION_VERSION=1
const LOCAL_PUBLICATION_EXTENSION='.uicpub'
const LOCAL_PUBLICATION_MAX_BYTES=35*1024*1024

function localText(value='',max=500){return String(value??'').trim().slice(0,max)}
function localSafeBlock(value=''){return sanitizeEditorPaste(String(value||''),htmlText(value||''))}
function fileToDataUrl(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(new Error(`No se pudo incorporar ${file?.name||'el archivo'} al respaldo local.`));reader.readAsDataURL(file)})}
async function fileToText(file){try{if(typeof file?.text==='function')return await file.text()}catch{}return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(new Error('No se pudo leer el archivo seleccionado desde tu computadora.'));reader.readAsText(file,'utf-8')})}
function dataUrlToBlob(dataUrl,fallbackType='application/octet-stream'){
  const value=String(dataUrl||'');const comma=value.indexOf(',');if(!value.startsWith('data:')||comma<0)throw new Error('El archivo local contiene una imagen dañada.')
  const meta=value.slice(5,comma);const encoded=value.slice(comma+1);const base64=/;base64(?:;|$)/i.test(meta);const mime=(meta.split(';')[0]||fallbackType||'application/octet-stream').trim();
  try{if(base64){const binary=atob(encoded);const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return new Blob([bytes],{type:mime})}return new Blob([decodeURIComponent(encoded)],{type:mime})}catch{throw new Error('El archivo local contiene una imagen que no pudo reconstruirse.')}
}
async function snapshotFile(file){return {name:localText(file.name,250)||'archivo',type:localText(file.type,120),lastModified:Number(file.lastModified||Date.now()),dataUrl:await fileToDataUrl(file)}}
async function restoreSnapshotFile(snapshot,allowedTypes){
  if(!snapshot||typeof snapshot!=='object'||!allowedTypes.has(String(snapshot.type||''))||typeof snapshot.dataUrl!=='string'||!snapshot.dataUrl.startsWith('data:'))throw new Error('El archivo local contiene un adjunto no admitido.')
  const blob=dataUrlToBlob(snapshot.dataUrl,String(snapshot.type||''));if(blob.size>5*1024*1024)throw new Error(`El archivo ${snapshot.name||''} supera 5 MB.`)
  return new File([blob],localText(snapshot.name,250)||'archivo',{type:String(snapshot.type||blob.type),lastModified:Number(snapshot.lastModified||Date.now())})
}
async function readLocalPublicationFile(file,company){
  if(!file)throw new Error('Elegí un archivo de publicación.')
  if(!String(file.name||'').toLowerCase().endsWith(LOCAL_PUBLICATION_EXTENSION))throw new Error(`El archivo debe tener extensión ${LOCAL_PUBLICATION_EXTENSION}.`)
  if(file.size>LOCAL_PUBLICATION_MAX_BYTES)throw new Error('El archivo local supera el máximo de 35 MB.')
  let raw;try{raw=JSON.parse(await fileToText(file))}catch{throw new Error('El archivo no es una publicación UIC válida o está dañado.')}
  if(raw?.format!==LOCAL_PUBLICATION_FORMAT||Number(raw?.formatVersion)!==LOCAL_PUBLICATION_VERSION)throw new Error('El formato del archivo no corresponde a una publicación UIC compatible.')
  if(String(raw.companyKey||'')!==String(company.key||''))throw new Error('Este archivo pertenece a otra empresa y no puede abrirse desde este acceso.')
  const rawLayout=raw.layoutJson&&typeof raw.layoutJson==='object'?raw.layoutJson:{};const rawBlocks=rawLayout.blocks&&typeof rawLayout.blocks==='object'?rawLayout.blocks:{}
  const blocks={...DEFAULT_EMAIL_BLOCKS};for(const key of Object.keys(blocks))blocks[key]=localSafeBlock(rawBlocks[key]||'')
  const signatureRaw=rawLayout.signature&&typeof rawLayout.signature==='object'?rawLayout.signature:{}
  const layoutJson={version:4,bannerText:localText(rawLayout.bannerText||'BENEFICIOS EXCLUSIVOS PARA SOCIOS UIC',120),companyDisplayName:localText(rawLayout.companyDisplayName||company.name,180),signature:{name:localText(signatureRaw.name,200),role:localText(signatureRaw.role,160),email:localText(signatureRaw.email,250),phone:localText(signatureRaw.phone,100),website:localText(signatureRaw.website,500)},blocks}
  const imageSlots=[null,null,null,null];const imageTypes=new Set(['image/jpeg','image/png'])
  for(const item of Array.isArray(raw.inlineImages)?raw.inlineImages:[]){const slot=Number(item?.slot);if(Number.isInteger(slot)&&slot>=0&&slot<=3)imageSlots[slot]=await restoreSnapshotFile(item.file,imageTypes)}
  const brandLogo=raw.brandLogo?await restoreSnapshotFile(raw.brandLogo,imageTypes):null
  const attachmentTypes=new Set(['image/jpeg','image/png','application/pdf']);const attachments=[]
  for(const item of (Array.isArray(raw.attachments)?raw.attachments:[]).slice(0,3))attachments.push(await restoreSnapshotFile(item,attachmentTypes))
  return {benefit_slug:localText(raw.benefitSlug,180),benefit_title:localText(raw.benefitTitle,300),template_id:EMAIL_LAYOUTS.some(x=>x.id===raw.templateId)?raw.templateId:'institutional',font_family:['Arial','Verdana','Tahoma','Georgia'].includes(raw.fontFamily)?raw.fontFamily:'Arial',font_size:['small','normal','large'].includes(raw.fontSize)?raw.fontSize:'normal',layout_json:layoutJson,_imageSlots:imageSlots,_brandLogo:brandLogo,_attachments:attachments,_localSource:true,_localFileName:file.name}
}
function localPublicationFilename(company,benefit){const clean=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'_').replace(/^_+|_+$/g,'').slice(0,55)||'Publicacion';const stamp=new Date().toISOString().slice(0,10);return `UIC_${clean(company.name)}_${clean(benefit.title)}_${stamp}${LOCAL_PUBLICATION_EXTENSION}`}
async function chooseLocalPublicationHandle(filename){
  if(typeof window==='undefined'||typeof window.showSaveFilePicker!=='function')return undefined
  try{return await window.showSaveFilePicker({suggestedName:filename,types:[{description:'Publicación de Beneficios UIC',accept:{'application/json':[LOCAL_PUBLICATION_EXTENSION]}}]})}
  catch(error){if(error?.name==='AbortError')return null;throw error}
}
async function chooseLocalPublicationFile(){
  if(typeof window==='undefined'||typeof window.showOpenFilePicker!=='function')return undefined
  try{const handles=await window.showOpenFilePicker({multiple:false,excludeAcceptAllOption:false,types:[{description:'Publicación de Beneficios UIC',accept:{'application/json':[LOCAL_PUBLICATION_EXTENSION]}}]});return handles?.[0]?await handles[0].getFile():null}
  catch(error){if(error?.name==='AbortError')return null;throw error}
}
async function writeLocalPublication(blob,filename,handle){
  if(handle){const writable=await handle.createWritable();await writable.write(blob);await writable.close();return 'chosen'}
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return 'download'
}
function whatsappUrl(phone=''){let digits=String(phone||'').replace(/\D/g,'');if(digits.startsWith('00'))digits=digits.slice(2);if(digits.startsWith('0'))digits=digits.slice(1);if(!digits.startsWith('54')&&digits.length===10)digits=`549${digits}`;return digits.length>=10?`https://wa.me/${digits}`:''}

async function optimizeEmailImage(file) {
  if(!file||!/^image\/(jpeg|png)$/i.test(file.type)) return file
  try{
    const bitmap=await createImageBitmap(file); const maxWidth=900,maxHeight=1200; const scale=Math.min(1,maxWidth/bitmap.width,maxHeight/bitmap.height); if(scale>=.999&&file.size<=900*1024){bitmap.close?.();return file}
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();
    const type=file.type==='image/png'?'image/png':'image/jpeg'; const blob=await new Promise(resolve=>canvas.toBlob(resolve,type,type==='image/jpeg'?.86:undefined)); if(!blob)return file; return new File([blob],file.name,{type,lastModified:Date.now()})
  }catch{return file}
}

function RichTextBlock({ label, value, onChange, placeholder }) {
  const ref=useRef(null)
  useEffect(()=>{if(ref.current&&ref.current.innerHTML!==value)ref.current.innerHTML=value||''},[value])
  const sync=()=>onChange(ref.current?.innerHTML||'')
  const command=(cmd,arg=null)=>{ref.current?.focus();document.execCommand(cmd,false,arg);sync()}
  const insertLink=()=>{const url=window.prompt('Pegá el enlace completo (https://...)','https://');if(url&&/^https?:\/\//i.test(url))command('createLink',url)}
  const pasteClean=e=>{e.preventDefault();const plain=e.clipboardData.getData('text/plain');const html=e.clipboardData.getData('text/html');document.execCommand('insertHTML',false,sanitizeEditorPaste(html,plain));sync()}
  return <div className="neo-rich-block">
    <div className="neo-rich-block-head"><strong>{label}</strong><small>Lo que ves aquí es lo que se respetará en el correo.</small></div>
    <div className="neo-rich-toolbar">
      <button type="button" title="Negrita" onMouseDown={e=>e.preventDefault()} onClick={()=>command('bold')}><b>B</b></button>
      <button type="button" title="Cursiva" onMouseDown={e=>e.preventDefault()} onClick={()=>command('italic')}><i>I</i></button>
      <button type="button" title="Subrayado" onMouseDown={e=>e.preventDefault()} onClick={()=>command('underline')}><u>U</u></button>
      <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>command('insertUnorderedList')}>• Lista</button>
      <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>command('insertOrderedList')}>1. Lista</button>
      <button type="button" onMouseDown={e=>e.preventDefault()} onClick={insertLink}>Enlace</button>
      <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>command('removeFormat')}>Limpiar formato</button>
    </div>
    <div ref={ref} className="neo-rich-editor" contentEditable suppressContentEditableWarning data-placeholder={placeholder} onInput={sync} onBlur={sync} onPaste={pasteClean}/>
  </div>
}

function TemplateMini({ id, imageSlots }) {
  return <div className={`neo-template-mini mini-${id}`} aria-hidden="true">
    <i className="bar"/><i className="text"/><i className="text short"/>
    {Array.from({length:Math.max(1,imageSlots)}).map((_,i)=><i className={`image i${i+1}`} key={i}/>) }
  </div>
}

function EmailVisualPreview({ templateId, blocks, imageUrls, brandLogoUrl='', company, benefit, bannerText, companyDisplayName, signature={}, mode='desktop' }) {
  const text=(key, fallback)=><div className={`neo-preview-rich preview-${key}`} dangerouslySetInnerHTML={{__html:blocks[key]||fallback||''}}/>
  const image=(i, cls='')=>imageUrls[i]?<div className={`neo-preview-image ${cls}`}><img src={imageUrls[i]} alt={`Figura ${i+1}`}/></div>:<div className={`neo-preview-image placeholder ${cls}`}><span>Imagen {i+1}</span></div>
  const gallery=(positions=[0,1,2,3],cls='')=><div className={`neo-preview-gallery ${cls}`}>{positions.map(i=><div key={i}>{image(i)}</div>)}</div>
  let content=null
  if(templateId==='gallery4') content=<>{text('intro','Introducción del beneficio')}{gallery([0,1,2,3],'four')}{text('body','Desarrollo principal')}{text('closing','Cierre')}</>
  else if(templateId==='duo') content=<>{text('intro','Introducción del beneficio')}{gallery([0,1],'two')}{text('body','Desarrollo principal')}{text('closing','Cierre')}</>
  else if(templateId==='imageLeft') content=<>{text('intro','Introducción del beneficio')}<div className="neo-preview-split">{image(0)}{text('body','Texto destacado')}</div>{imageUrls[1]&&image(1,'compact')}{text('closing','Cierre')}</>
  else if(templateId==='imageRight') content=<>{text('intro','Introducción del beneficio')}<div className="neo-preview-split reverse">{text('body','Texto destacado')}{image(0)}</div>{imageUrls[1]&&image(1,'compact')}{text('closing','Cierre')}</>
  else if(templateId==='alternating') content=<>{text('intro','Introducción')}{image(0,'compact')}{text('body','Primer desarrollo')}{image(1,'compact')}{text('body2','Segundo desarrollo')}{gallery([2,3],'two tail')}{text('closing','Cierre')}</>
  else if(templateId==='stacked') content=<>{text('intro','Introducción')}{Array.from({length:4}).map((_,i)=><div key={i}>{image(i,'stacked')}</div>)}{text('body','Desarrollo principal')}{text('closing','Cierre')}</>
  else if(templateId==='editorial') content=<>{text('intro','Introducción')}{image(0,'hero')}{text('body','Desarrollo principal')}{gallery([1,2,3],'three secondary')}{text('body2','Segundo bloque')}{text('closing','Cierre')}</>
  else content=<>{text('intro','Introducción del beneficio')}{image(0,'hero')}{text('body','Desarrollo principal')}{text('closing','Cierre')}</>
  return <div className={`neo-email-preview-shell ${mode}`}><div className="neo-email-preview">
    <div className="neo-preview-ribbon"><span>{bannerText||'BENEFICIOS EXCLUSIVOS PARA SOCIOS UIC'}</span><img src="/logo-beneficios-uic.png" alt="Beneficios UIC"/></div>
    <div className="neo-preview-brand"><strong>UNIÓN INDUSTRIAL DE CAMPANA</strong><small>Beneficios que fortalecen vínculos</small></div>
    <div className="neo-preview-company">{companyDisplayName||company.name}</div>
    {text('headline',benefit.title)}
    {content}
    {(brandLogoUrl||signature.name||signature.role||signature.email||signature.phone||signature.website)&&<div className="neo-preview-signature">{brandLogoUrl&&<img className="neo-preview-signature-logo" src={brandLogoUrl} alt="Logo de la empresa"/>}{signature.name&&<strong>{signature.name}</strong>}{signature.role&&<span>{signature.role}</span>}{signature.email&&<span>{signature.email}</span>}{signature.phone&&<span>{signature.phone}</span>}{signature.website&&<span>{signature.website}</span>}</div>}
    <div className="neo-preview-unsubscribe subtle"><small>Preferencias de recepción</small><span>Si necesitás dejar de recibir estas comunicaciones, en el correo real encontrarás un enlace discreto que solicita una confirmación adicional.</span></div><div className="neo-preview-footer">Comunicación emitida a través del Portal de Beneficios UIC · La baja nunca se ejecuta con un solo toque.</div>
  </div></div>
}

function CampaignEditor({ company, benefit, settings, savedCampaign=null, onClose, onOpenLocalFile }) {
  const fixedSubject=`Nuevo beneficio exclusivo UIC · ${company.name}`
  const savedLayout=(savedCampaign?.layout_json&&typeof savedCampaign.layout_json==='object')?savedCampaign.layout_json:{}
  const defaultSignature={name:company.contactName||company.name,role:company.role||'',email:company.email||'',phone:company.phone||'',website:''}
  const [templateId,setTemplateId]=useState(savedCampaign?.template_id||'institutional'); const [blocks,setBlocks]=useState({...DEFAULT_EMAIL_BLOCKS,...(savedLayout.blocks||{}),headline:savedLayout.blocks?.headline||benefit.title||''}); const [bannerText,setBannerText]=useState(savedLayout.bannerText||'BENEFICIOS EXCLUSIVOS PARA SOCIOS UIC'); const [companyDisplayName,setCompanyDisplayName]=useState(savedLayout.companyDisplayName||company.name); const [signature,setSignature]=useState({...defaultSignature,...(savedLayout.signature||{})}); const [fontFamily,setFontFamily]=useState(savedCampaign?.font_family||'Arial'); const [fontSize,setFontSize]=useState(savedCampaign?.font_size||'normal'); const [imageSlots,setImageSlots]=useState(savedCampaign?._imageSlots||[null,null,null,null]); const [brandLogo,setBrandLogo]=useState(savedCampaign?._brandLogo||null); const [attachments,setAttachments]=useState(savedCampaign?._attachments||[]); const [previewMode,setPreviewMode]=useState('desktop'); const [persistedId,setPersistedId]=useState(savedCampaign?.id||null); const [campaign,setCampaign]=useState(savedCampaign?.id?savedCampaign:null); const [testCode,setTestCode]=useState(''); const [busy,setBusy]=useState(false); const [message,setMessage]=useState(savedCampaign?._localSource?`Archivo local abierto: ${savedCampaign._localFileName}. No se cargó ningún borrador en Neon.`:savedCampaign?.id?'Publicación operativa recuperada.':''); const localInputRef=useRef(null)
  const layout=EMAIL_LAYOUTS.find(x=>x.id===templateId)||EMAIL_LAYOUTS[0]
  const invalidate=()=>{setTestCode('');if(persistedId)setCampaign(current=>current?({...current,id:persistedId,status:'draft',test_sent_at:null,test_verified_at:null,approval_requested_at:null}):null);else if(campaign)setCampaign(null)}
  const updateBlock=(key,value)=>{setBlocks(current=>({...current,[key]:value}));invalidate()}
  const updateSignature=(key,value)=>{setSignature(current=>({...current,[key]:value}));invalidate()}
  const setImage=(index,file)=>{setImageSlots(current=>{const next=[...current];next[index]=file||null;return next});invalidate()}
  const visibleImages=imageSlots.slice(0,layout.imageSlots)
  const allImageUrls=useMemo(()=>imageSlots.map(file=>file?URL.createObjectURL(file):''),[imageSlots])
  useEffect(()=>()=>{allImageUrls.forEach(url=>url&&URL.revokeObjectURL(url))},[allImageUrls])
  const imageUrls=allImageUrls.slice(0,layout.imageSlots)
  const brandLogoUrl=useMemo(()=>brandLogo?URL.createObjectURL(brandLogo):'',[brandLogo]);useEffect(()=>()=>{if(brandLogoUrl)URL.revokeObjectURL(brandLogoUrl)},[brandLogoUrl])
  const totalText=Object.values(blocks).map(htmlText).join(' ').trim(); const imageCount=visibleImages.filter(Boolean).length
  const recommended=imageCount>=3?'gallery4':imageCount===2?'duo':imageCount===1?'institutional':'institutional'
  const layoutPayload=()=>({version:4,bannerText,companyDisplayName,signature:{name:localText(signature.name,200),role:localText(signature.role,160),email:localText(signature.email,250),phone:localText(signature.phone,100),website:localText(signature.website,500)},blocks})
  const seedFromBenefit=()=>{setBlocks(current=>({...current,headline:current.headline||editorEscape(benefit.title||''),intro:current.intro||`<p>${editorEscape(benefit.summary||'Presentamos este beneficio exclusivo para socios UIC.')}</p>`,body:current.body||`<p>Conocé las condiciones y alcances de esta propuesta de ${editorEscape(benefit.category||'beneficios empresariales')}. Antes de contratar, verificá con la empresa prestadora la disponibilidad y las condiciones particulares vigentes.</p>`,closing:current.closing||'<p><strong>Para más información, comunicate directamente con la empresa prestadora e indicá que sos socio UIC.</strong></p>'}));invalidate()}
  const quality=[]; if(!htmlText(blocks.headline))quality.push('Falta un título visible.'); if(totalText.length<120)quality.push('El mensaje todavía es muy breve.'); if(totalText.length>5000)quality.push('El texto es largo para lectura móvil; conviene resumir.'); if(imageCount===0)quality.push('No hay imágenes: el modelo institucional funciona mejor en este caso.'); if(imageCount>=3&&templateId!=='gallery4'&&templateId!=='editorial'&&templateId!=='stacked')quality.push('Con 3 o 4 imágenes conviene Galería 4, Editorial premium o Láminas verticales.')
  const saveLocal=async()=>{setBusy(true);setMessage('');try{const filename=localPublicationFilename(company,benefit);const handle=await chooseLocalPublicationHandle(filename);if(handle===null){setMessage('Guardado cancelado. No se modificó ningún archivo.');return}const inlineImages=[];for(let i=0;i<visibleImages.length;i++)if(visibleImages[i])inlineImages.push({slot:i,file:await snapshotFile(visibleImages[i])});const savedAttachments=[];for(const file of attachments)savedAttachments.push(await snapshotFile(file));const savedLogo=brandLogo?await snapshotFile(brandLogo):null;const payload={format:LOCAL_PUBLICATION_FORMAT,formatVersion:LOCAL_PUBLICATION_VERSION,appVersion:'3.9.9.1',savedAt:new Date().toISOString(),companyKey:company.key,companyName:company.name,benefitSlug:benefit.slug,benefitTitle:benefit.title,subject:fixedSubject,templateId,fontFamily,fontSize,layoutJson:layoutPayload(),brandLogo:savedLogo,inlineImages,attachments:savedAttachments};const blob=new Blob([JSON.stringify(payload)],{type:'application/vnd.uic.publicacion+json'});const mode=await writeLocalPublication(blob,filename,handle);setMessage(mode==='chosen'?`Archivo ${LOCAL_PUBLICATION_EXTENSION} guardado en la ubicación que elegiste. No se almacenó en Neon ni en el servidor.`:`Archivo ${LOCAL_PUBLICATION_EXTENSION} descargado. Tu navegador no permite elegir carpeta desde la web; usó la ubicación de descargas configurada. No se almacenó en Neon.`)}catch(e){setMessage(e.message)}finally{setBusy(false)}}
  const operationalData=()=>{const data=new FormData();Object.entries({operationMode:'test',companyKey:company.key,companyName:company.name,benefitSlug:benefit.slug,benefitTitle:benefit.title,originatorName:company.contactName||'',originatorEmail:company.email||'',templateId,layoutJson:JSON.stringify(layoutPayload()),bodyMarkup:totalText,fontFamily,fontSize,inlineImagePositions:JSON.stringify(visibleImages.map((f,i)=>f?i:null).filter(v=>v!==null))}).forEach(([k,v])=>data.append(k,v));visibleImages.filter(Boolean).forEach(file=>data.append('inlineImages',file));if(brandLogo)data.append('brandLogo',brandLogo);attachments.forEach(file=>data.append('attachments',file));return data}
  const syncOperational=async()=>{const saved=await request(persistedId?`/api/difusion/campaigns/${persistedId}`:'/api/admin/difusion/campaigns',{method:persistedId?'PUT':'POST',body:operationalData()});setPersistedId(saved.id);setCampaign(saved);return saved}
  const test=async()=>{setBusy(true);setMessage('');try{const prepared=await syncOperational();if(prepared.safety_status==='blocked'){setMessage(`El control automático bloqueó la publicación: ${prepared.safety_notes||'revisá el contenido antes de enviar una prueba.'}`);return}const result=await request(`/api/admin/difusion/campaigns/${prepared.id}/test`,{method:'POST',body:'{}'});setCampaign(result);setMessage('Prueba enviada al correo REGISTRADO de la empresa. Neon sólo conserva esta instancia operativa necesaria para prueba, validación y envío; no funciona como respaldo de borradores.')}catch(e){setMessage(e.message)}finally{setBusy(false)}}
  const verifyCode=async()=>{if(!campaign)return;setBusy(true);setMessage('');try{const result=await request(`/api/admin/difusion/campaigns/${campaign.id}/verify-test`,{method:'POST',body:JSON.stringify({code:testCode})});setCampaign(result);setMessage('Código verificado. La identidad del correo quedó confirmada y ya podés solicitar validación UIC.')}catch(e){setMessage(e.message)}finally{setBusy(false)}}
  const requestApproval=async()=>{if(!campaign)return;setBusy(true);setMessage('');try{const result=await request(`/api/admin/difusion/campaigns/${campaign.id}/request-approval`,{method:'POST',body:'{}'});setCampaign(result);setMessage('Solicitud enviada a UIC para validación. Todavía no se envió al padrón general.')}catch(e){setMessage(e.message)}finally{setBusy(false)}}
  const acceptLocalFile=file=>{if(!file)return;const hasWork=Boolean(totalText.trim()||imageSlots.some(Boolean)||attachments.length||brandLogo);if(hasWork&&!window.confirm('Vas a reemplazar lo que está actualmente en pantalla por el archivo local seleccionado. ¿Continuar?'))return;onOpenLocalFile?.(file)}
  const openLocal=e=>{const file=e.target.files?.[0];e.target.value='';acceptLocalFile(file)}
  const pickLocal=async()=>{setMessage('');try{const file=await chooseLocalPublicationFile();if(file===undefined){localInputRef.current?.click();return}acceptLocalFile(file)}catch(e){setMessage(e.message||'No se pudo abrir el selector de archivos.')} }
  return <section className="neo-campaign-editor neo-builder-v3981"><div className="neo-campaign-head"><div><span>CONSTRUCTOR VISUAL UIC · {company.name}</span><h2>{savedCampaign?._localSource?'Editar publicación recuperada':'Diseñá la comunicación'}</h2><p>{benefit.title}</p></div><button type="button" onClick={onClose}><X/> Cerrar</button></div>
    <section className="neo-local-workbar"><div><span>ARCHIVO DE TRABAJO LOCAL</span><strong>Tu respaldo queda en tu computadora, no en Neon</strong><p>Guardá todas las versiones que quieras con extensión <b>{LOCAL_PUBLICATION_EXTENSION}</b>. En Chrome/Edge de PC se abre el selector para elegir carpeta y nombre. Cada archivo conserva textos, diseño, imágenes, logo, adjuntos y firma editable.</p></div><div><button type="button" onClick={saveLocal} disabled={busy||!totalText.trim()}><Download/> Elegir dónde guardar {LOCAL_PUBLICATION_EXTENSION}</button><button type="button" className="secondary" onClick={pickLocal} disabled={busy}><FolderOpen/> Abrir archivo de mi PC</button><input ref={localInputRef} className="neo-local-file-input" type="file" accept={`${LOCAL_PUBLICATION_EXTENSION},application/json,application/vnd.uic.publicacion+json`} onChange={openLocal}/></div></section>
    <div className="neo-campaign-warning"><ShieldCheck/><div><strong>Secuencia obligatoria</strong><p>Crear o abrir archivo local → editar → guardar en tu PC → prueba → código de 6 dígitos → validación UIC. Neon recién interviene cuando pedís enviar una prueba y sólo para el circuito operativo.</p></div></div>
    {!settings?.mailConfigured&&<div className="neo-campaign-disabled"><CircleAlert/><span>La casilla emisora todavía no está configurada. No se puede realizar la prueba hasta completar “Correo emisor”.</span></div>}
    <label>Asunto institucional · no editable<input value={fixedSubject} readOnly className="neo-readonly"/></label>
    <div className="neo-auto-edit-grid"><label>Franja institucional · automática y editable<input value={bannerText} maxLength="120" onChange={e=>{setBannerText(e.target.value);invalidate()}}/></label><label>Nombre visible de la empresa · automático y editable<input value={companyDisplayName} maxLength="180" onChange={e=>{setCompanyDisplayName(e.target.value);invalidate()}}/></label><small>El sistema completa estos datos automáticamente, pero podés corregir cómo se muestran sin modificar el padrón ni la identidad real de la empresa.</small></div>

    <section className="neo-template-picker"><div className="neo-section-heading"><span>PASO 1 · ELEGÍ EL MODELO</span><h3>8 estructuras profesionales</h3><p>El modelo define dónde se escribe y dónde se colocan las imágenes. Podés cambiarlo mientras trabajás sin perder los textos.</p></div><div className="neo-template-grid">{EMAIL_LAYOUTS.map(item=><button type="button" key={item.id} className={templateId===item.id?'selected':''} onClick={()=>{setTemplateId(item.id);invalidate()}}><TemplateMini id={item.id} imageSlots={item.imageSlots}/><strong>{item.name}</strong><span>{item.description}</span></button>)}</div></section>

    <section className="neo-smart-composer"><Sparkles/><div><strong>Asistente de composición UIC</strong><p>{imageCount===0?'Sin imágenes cargadas: conviene una comunicación institucional limpia.':`Detectamos ${imageCount} imagen${imageCount===1?'':'es'}. El modelo recomendado es ${EMAIL_LAYOUTS.find(x=>x.id===recommended)?.name}.`}</p>{quality.length?<ul>{quality.map((q,i)=><li key={i}>{q}</li>)}</ul>:<small>La composición tiene una estructura equilibrada para la prueba.</small>}</div><div className="neo-smart-actions"><button type="button" onClick={seedFromBenefit}>Usar texto base del beneficio</button>{templateId!==recommended&&<button type="button" onClick={()=>{setTemplateId(recommended);invalidate()}}>Aplicar recomendación</button>}</div></section>

    <div className="neo-builder-workspace"><div className="neo-builder-controls"><div className="neo-editor-global"><label>Tipografía<select value={fontFamily} onChange={e=>{setFontFamily(e.target.value);invalidate()}}><option>Arial</option><option>Verdana</option><option>Tahoma</option><option>Georgia</option></select></label><label>Tamaño<select value={fontSize} onChange={e=>{setFontSize(e.target.value);invalidate()}}><option value="small">Compacto</option><option value="normal">Normal</option><option value="large">Amplio</option></select></label></div>
      <RichTextBlock label="Título principal" value={blocks.headline} onChange={v=>updateBlock('headline',v)} placeholder="Escribí el título principal…"/>
      <RichTextBlock label="Introducción" value={blocks.intro} onChange={v=>updateBlock('intro',v)} placeholder="Presentá el beneficio en pocas líneas…"/>
      <div className="neo-image-slot-editor"><div><strong>Imágenes del modelo</strong><small>Máximo {layout.imageSlots}. El sistema las reduce automáticamente: nunca se insertan a tamaño original.</small></div><div className="neo-image-slot-grid">{Array.from({length:layout.imageSlots}).map((_,i)=><label key={i} className={imageSlots[i]?'filled':''}><span>Imagen {i+1}</span><small>{imageSlots[i]?`${imageSlots[i].name} · ${Math.max(1,Math.round(imageSlots[i].size/1024))} KB`:'JPG / PNG · reducción automática'}</small><input type="file" accept="image/jpeg,image/png" onChange={async e=>{const file=e.target.files?.[0]||null;setImage(i,file?await optimizeEmailImage(file):null)}}/>{imageSlots[i]&&<button type="button" onClick={e=>{e.preventDefault();setImage(i,null)}}>Quitar</button>}</label>)}</div></div>
      <RichTextBlock label="Desarrollo principal" value={blocks.body} onChange={v=>updateBlock('body',v)} placeholder="Desarrollá el beneficio, condiciones y ventajas…"/>
      {(layout.blocks||[]).includes('body2')&&<RichTextBlock label="Segundo bloque de texto" value={blocks.body2} onChange={v=>updateBlock('body2',v)} placeholder="Agregá un segundo desarrollo si el modelo lo requiere…"/>}
      <RichTextBlock label="Cierre" value={blocks.closing} onChange={v=>updateBlock('closing',v)} placeholder="Cerrá con una invitación o llamado a la acción…"/>
      <section className="neo-signature-editor"><div><span>FIRMA DEL DOCUMENTO · EDITABLE</span><strong>Corregí exactamente cómo querés que aparezca</strong><p>Estos campos sólo modifican la firma visible. La identidad de acceso y el correo que recibe la prueba siguen siendo los datos registrados por UIC.</p></div><div className="neo-signature-fields"><label>Nombre<input value={signature.name} maxLength="200" onChange={e=>updateSignature('name',e.target.value)}/></label><label>Cargo / función<input value={signature.role} maxLength="160" onChange={e=>updateSignature('role',e.target.value)}/></label><label>Correo visible<input type="email" value={signature.email} maxLength="250" onChange={e=>updateSignature('email',e.target.value)}/></label><label>Teléfono visible<input value={signature.phone} maxLength="100" onChange={e=>updateSignature('phone',e.target.value)}/></label><label className="neo-signature-wide">Página web<input value={signature.website||''} maxLength="500" placeholder="https://www.empresa.com.ar" onChange={e=>updateSignature('website',e.target.value)}/></label><div className="neo-signature-logo-control"><div><ImagePlus/><span><strong>Logo de la empresa</strong><small>JPG o PNG. Se mostrará proporcionado, sin deformarse, con un tamaño normal de firma.</small></span></div><label className={brandLogo?'has-logo':''}>{brandLogo?<><img src={brandLogoUrl} alt="Vista previa del logo"/><span>{brandLogo.name}</span></>:<><Upload/><span>Insertar logo</span></>}<input type="file" accept="image/jpeg,image/png" onChange={async e=>{const file=e.target.files?.[0]||null;if(file){setBrandLogo(await optimizeEmailImage(file));invalidate()}e.target.value=''}}/></label>{brandLogo&&<button type="button" onClick={()=>{setBrandLogo(null);invalidate()}}>Quitar logo</button>}</div></div></section>
      <div className="neo-attachment-box"><strong>ARCHIVOS ADJUNTOS</strong><p>Los adjuntos continúan separados del diseño visual del cuerpo.</p><label className="neo-upload"><Upload/><span>{attachments.length?`${attachments.length} archivo(s) adjunto(s)`:'Adjuntar JPG, PNG o PDF · máximo 3'}</span><input type="file" multiple accept="image/jpeg,image/png,application/pdf" onChange={e=>{setAttachments([...e.target.files].slice(0,3));invalidate()}}/></label></div>
    </div><aside className="neo-builder-preview"><div className="neo-preview-toolbar"><strong>VISTA PREVIA REAL</strong><div><button type="button" className={previewMode==='desktop'?'active':''} onClick={()=>setPreviewMode('desktop')}>Escritorio</button><button type="button" className={previewMode==='mobile'?'active':''} onClick={()=>setPreviewMode('mobile')}>Celular</button></div></div><EmailVisualPreview templateId={templateId} blocks={blocks} imageUrls={imageUrls} brandLogoUrl={brandLogoUrl} company={company} benefit={benefit} bannerText={bannerText} companyDisplayName={companyDisplayName} signature={signature} mode={previewMode}/></aside></div>

    <div className="neo-signature-preview"><span>FIRMA VISIBLE EN EL CORREO</span>{brandLogoUrl&&<img className="neo-signature-preview-logo" src={brandLogoUrl} alt="Logo de la empresa"/>}{signature.name&&<strong>{signature.name}</strong>}{signature.role&&<small>{signature.role}</small>}{signature.email&&<small>{signature.email}</small>}{signature.phone&&<small>{signature.phone}</small>}{signature.website&&<small>{signature.website}</small>}<p>La firma se puede editar arriba. La baja del destinatario se presenta como una preferencia discreta y exige una confirmación adicional antes de aplicarse.</p></div>
    {campaign&&<div className={`neo-safety-result ${campaign.safety_status}`}><strong>Control automático: {campaign.safety_status==='ok'?'APROBADO INICIALMENTE':campaign.safety_status==='review'?'REQUIERE VALIDACIÓN':'BLOQUEADO'}</strong><span>{campaign.safety_notes}</span></div>}
    {campaign?.test_sent_at&&!campaign?.test_verified_at&&<div className="neo-test-code-box"><Mail/><div><strong>Confirmá el código recibido</strong><p>Copiá los 6 dígitos que llegaron junto con el correo de prueba. El código cambia en cada prueba y vence a los 30 minutos.</p></div><input inputMode="numeric" maxLength="6" value={testCode} onChange={e=>setTestCode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="000000"/><button type="button" onClick={verifyCode} disabled={busy||testCode.length!==6}>Verificar código</button></div>}
    {campaign?.test_verified_at&&<div className="neo-test-verified"><Check/><strong>Correo de la empresa verificado</strong><span>La prueba y el código fueron confirmados. Ya puede solicitarse la validación institucional.</span></div>}
    {message&&<div className="neo-message">{message}</div>}
    <div className="neo-campaign-actions"><button type="button" onClick={saveLocal} disabled={busy||!totalText.trim()}><Download/> Guardar archivo local {LOCAL_PUBLICATION_EXTENSION}</button><button type="button" className="secondary" onClick={pickLocal} disabled={busy}><FolderOpen/> Abrir archivo local</button><button type="button" onClick={test} disabled={busy||!totalText.trim()||!settings?.mailConfigured}>{busy?'Procesando…':'Enviar correo de prueba'}</button><button type="button" className={campaign?.test_verified_at?'attention-validation':''} onClick={requestApproval} disabled={busy||!campaign?.test_verified_at}>Solicitar validación UIC</button></div>
  </section>
}
function TestModeSafety({ settings, onSettingsChanged }) {
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState('')
  const enabled=settings?.testModeEnabled !== false
  const toggle=async next=>{
    setMessage('')
    let confirm=''
    if(!next){confirm=window.prompt('ATENCIÓN: al salir del Modo PRUEBA se habilita la posibilidad de distribuir al padrón si luego activás el envío masivo. Escribí SALIR DE PRUEBA para continuar.','')||'';if(!confirm)return}
    setBusy(true)
    try{await request('/api/admin/difusion/test-mode',{method:'PUT',body:JSON.stringify({enabled:next,confirm})});setMessage(next?'Modo PRUEBA ACTIVADO. El padrón general quedó bloqueado y sólo pueden recibir los tres destinos de control.':'Modo PRUEBA desactivado. El padrón general sigue bloqueado hasta habilitarlo expresamente en Validaciones.');await onSettingsChanged?.()}catch(e){setMessage(e.message)}finally{setBusy(false)}
  }
  const recipients=settings?.testRecipients||[]
  return <section className={`neo-test-mode-safety ${enabled?'active':'off'}`}><div className="neo-test-mode-main"><ShieldCheck/><div><span>SEGURIDAD DE DISTRIBUCIÓN</span><h2>{enabled?'MODO PRUEBA ACTIVADO':'MODO PRUEBA DESACTIVADO'}</h2><p>{enabled?'Mientras este tilde permanezca marcado, ningún correo de distribución puede salir al padrón general. El servidor admite únicamente los tres correos de control indicados abajo.':'El modo de seguridad está desactivado. Para enviar al padrón todavía deberá habilitarse además el envío masivo desde Validaciones.'}</p></div><label className="neo-test-mode-check"><input type="checkbox" checked={enabled} disabled={busy} onChange={e=>toggle(e.target.checked)}/><strong>{enabled?'PRUEBA · BLOQUEO ACTIVO':'PRUEBA DESACTIVADA'}</strong></label></div><div className="neo-test-recipient-grid">{recipients.map(item=><article key={item.email}><Check/><div><strong>{item.name}</strong><span>{item.email}</span><small>{item.contactName||'Contacto de prueba'}{item.phone?` · ${item.phone}`:''}</small></div></article>)}</div>{message&&<div className="neo-message">{message}</div>}<small className="neo-test-mode-foot">Protección fail-closed: si el sistema no puede confirmar el estado, asume Modo PRUEBA activo.</small></section>
}

function ApprovalQueue({ settings, onSettingsChanged }) {
  const [items,setItems]=useState([]); const [loading,setLoading]=useState(true); const [message,setMessage]=useState(''); const [toggling,setToggling]=useState(false)
  const signer=item=>{const sig=item?.layout_json?.signature||{};return {name:sig.name||item.originator_name||'',role:sig.role||item.originator_role||'',email:sig.email||item.originator_email||'',phone:sig.phone||item.originator_phone||'',website:sig.website||''}}
  const load=()=>request('/api/admin/difusion/campaigns?status=pending').then(setItems).catch(e=>setMessage(e.message)).finally(()=>setLoading(false)); useEffect(load,[])
  const reject=async id=>{const reason=window.prompt('Motivo del rechazo (opcional):','Requiere corrección antes de enviar.')||'';try{await request(`/api/admin/difusion/campaigns/${id}/reject`,{method:'POST',body:JSON.stringify({reason})});await load()}catch(e){setMessage(e.message)}}
  const approve=async item=>{const forcedTest=['uic-institucional','indusvar-group','tecno-logisti-k-sa'].includes(item.company_key);const generalEnabled=!forcedTest&&settings?.testModeEnabled===false&&settings?.massSendEnabled;const word=generalEnabled?'ENVIAR':'VALIDAR';const first=window.confirm(`PRIMERA CONFIRMACIÓN DE SEGURIDAD\n\n${generalEnabled?'Esta acción autoriza el ingreso de la campaña al padrón general.':forcedTest?'Esta es una empresa interna de MODO PRUEBA. El servidor la limitará siempre a los tres destinos de control.':'Modo PRUEBA activo: sólo podrán ingresar a la cola los tres destinatarios autorizados.'}\n\n¿Querés continuar?`);if(!first)return;const confirmation=window.prompt(`SEGUNDA CONFIRMACIÓN: escribí ${word} para autorizar esta comunicación.`, '');if(!confirmation)return;try{const result=await request(`/api/admin/difusion/campaigns/${item.id}/approve`,{method:'POST',body:JSON.stringify({confirmFirst:true,confirm:confirmation})});setMessage(`Comunicación autorizada e incorporada a la cola. Destinatarios previstos: ${result.recipients}${result.testModeEnabled?' · MODO PRUEBA':''}. Próxima oportunidad mensual: ${result.nextAllowed?new Date(`${result.nextAllowed}T12:00:00`).toLocaleDateString('es-AR'):'según calendario del beneficio'}.`);await load()}catch(e){setMessage(e.message)}}
  const toggleMass=async enabled=>{setToggling(true);setMessage('');try{if(enabled&&settings?.testModeEnabled!==false)throw new Error('Modo PRUEBA está activo. Primero completá el PASO 1 para salir de prueba.');let confirmation='';if(enabled){confirmation=window.prompt('Esta acción habilita el padrón general. Escribí HABILITAR para continuar.','')||'';if(!confirmation){setToggling(false);return}}await request('/api/admin/difusion/mass-send',{method:'PUT',body:JSON.stringify({enabled,confirm:confirmation})});setMessage(enabled?'PADRÓN GENERAL HABILITADO. Las próximas validaciones podrán ingresar a la distribución general.':'PADRÓN GENERAL BLOQUEADO. La distribución vuelve a quedar limitada a destinos de control.');await onSettingsChanged?.()}catch(e){setMessage(e.message)}finally{setToggling(false)}}
  const setTestModeFromValidation=async enabled=>{setToggling(true);setMessage('');try{let confirm='';if(!enabled){confirm=window.prompt('PASO 1 DE 2 · Para salir de Modo PRUEBA escribí SALIR DE PRUEBA. Esto NO habilita todavía el padrón general.','')||'';if(!confirm){setToggling(false);return}}await request('/api/admin/difusion/test-mode',{method:'PUT',body:JSON.stringify({enabled,confirm})});setMessage(enabled?'MODO PRUEBA ACTIVADO. El padrón general quedó bloqueado automáticamente.':'PASO 1 COMPLETADO: Modo PRUEBA desactivado. Ahora, si realmente querés distribución general, completá el PASO 2 y habilitá el padrón.');await onSettingsChanged?.()}catch(e){setMessage(e.message)}finally{setToggling(false)}}
  if(loading)return <div className="neo-loading neo-tab-loading">Cargando validaciones en segundo plano…</div>
  return <section className="neo-approvals"><div className="neo-section-heading"><span>COMISIÓN DIRECTIVA / ADMINISTRACIÓN</span><h2>Validaciones pendientes</h2><p>Esta pantalla es exclusivamente administrativa. Las empresas nunca acceden a esta sección.</p></div>
    <div className="neo-general-send-gate"><article className={settings?.testModeEnabled!==false?'current':'done'}><span>PASO 1 · SEGURIDAD</span><strong>{settings?.testModeEnabled!==false?'Modo PRUEBA activo · padrón bloqueado':'Modo PRUEBA desactivado'}</strong><p>Por defecto el sistema siempre arranca y permanece en prueba. Para un envío general primero hay que salir deliberadamente de este modo. Salir de prueba <b>todavía no envía nada</b>.</p>{settings?.testModeEnabled!==false?<button type="button" disabled={toggling} onClick={()=>setTestModeFromValidation(false)}>Desactivar Modo PRUEBA para preparar envío general</button>:<button type="button" className="safe" disabled={toggling} onClick={()=>setTestModeFromValidation(true)}>Volver a Modo PRUEBA</button>}</article><article className={settings?.testModeEnabled!==false?'locked':settings?.massSendEnabled?'danger-ready':'current'}><span>PASO 2 · PADRÓN GENERAL</span><strong>{settings?.massSendEnabled&&settings?.testModeEnabled===false?'Padrón general HABILITADO':'Padrón general BLOQUEADO'}</strong><p>{settings?.testModeEnabled!==false?'Este paso está bloqueado hasta completar el PASO 1. Así evitamos habilitaciones accidentales.':'Sólo activalo cuando realmente quieras que las comunicaciones validadas puedan entrar al padrón general. Requiere escribir HABILITAR.'}</p><button type="button" className={settings?.massSendEnabled?'danger':'warning'} disabled={toggling||settings?.testModeEnabled!==false} onClick={()=>toggleMass(!settings?.massSendEnabled)}>{settings?.massSendEnabled?'Bloquear nuevamente el padrón':'Habilitar padrón general'}</button></article></div>
    {!settings?.mailConfigured&&<div className="neo-campaign-disabled"><CircleAlert/><span>Configurá primero la casilla emisora en “Correo emisor”.</span></div>}{message&&<div className="neo-message">{message}</div>}
    {!items.length?<div className="neo-empty-approval"><Check/><strong>No hay comunicaciones pendientes.</strong></div>:items.map(item=>{const contact=signer(item);const wa=whatsappUrl(contact.phone);return <article className="neo-approval-card" key={item.id}><div className="neo-approval-head"><span>{item.company_name}</span><strong>{item.benefit_title}</strong></div><h3>{item.subject}</h3><pre>{item.body_markup}</pre><div className="neo-approval-signer"><div><span>DATOS DEL FIRMANTE</span><strong>{contact.name||'Sin nombre visible'}</strong>{contact.role&&<small>{contact.role}</small>}</div><div className="neo-approval-contact-actions">{contact.phone&&<a href={`tel:${contact.phone}`}><Phone/> Llamar · {contact.phone}</a>}{wa&&<a href={wa} target="_blank" rel="noreferrer"><MessageCircle/> WhatsApp</a>}{contact.email&&<a href={`mailto:${contact.email}`}><Mail/> {contact.email}</a>}{contact.website&&<a href={/^https?:\/\//i.test(contact.website)?contact.website:`https://${contact.website}`} target="_blank" rel="noreferrer"><Globe2/> Web</a>}</div></div><div className="neo-approval-meta"><span>Correo registrado: {item.originator_email}</span><span>Control: {item.safety_status}</span><span>{item.files?.filter(f=>f.placement==='inline').length||0} imagen(es) en cuerpo</span><span>{item.files?.filter(f=>f.placement==='logo').length||0} logo</span><span>{item.files?.filter(f=>f.placement==='attachment').length||0} adjunto(s)</span><span>Código: {item.test_verified_at?'VERIFICADO':'PENDIENTE'}</span></div><div className="neo-approval-actions"><button type="button" className="danger" onClick={()=>reject(item.id)}>Rechazar</button><button type="button" onClick={()=>approve(item)}>{['uic-institucional','indusvar-group','tecno-logisti-k-sa'].includes(item.company_key)?'Validar · EMPRESA DE PRUEBA (3 destinos)':settings?.testModeEnabled!==false?'Validar · MODO PRUEBA (3 destinos)':settings?.massSendEnabled?'Aprobar y enviar padrón':'Validar · destinos de control'}</button></div></article>})}
  </section>
}

function MailSettings({ onSettingsChanged }) {
  const empty={host:'smtp.gmail.com',port:465,secure:true,username:'tesoreria@uic-campana.com.ar',password:'',fromEmail:'tesoreria@uic-campana.com.ar',fromName:'Unión Industrial de Campana · Beneficios',testRecipient:'',passwordConfigured:false,massSendEnabled:false,testModeEnabled:true}
  const [form,setForm]=useState(empty); const [loading,setLoading]=useState(true); const [busy,setBusy]=useState(false); const [message,setMessage]=useState(''); const [error,setError]=useState('')
  const load=()=>request('/api/admin/difusion/mail-settings').then(data=>setForm({...empty,...data,password:''})).catch(e=>setError(e.message)).finally(()=>setLoading(false)); useEffect(load,[])
  const change=(key,value)=>setForm(current=>({...current,[key]:value}))
  const save=async()=>{setBusy(true);setMessage('');setError('');try{const result=await request('/api/admin/difusion/mail-settings',{method:'PUT',body:JSON.stringify(form)});setMessage(`Configuración guardada. Remitente: ${result.fromEmail}`);change('password','');await load();onSettingsChanged?.()}catch(e){setError(e.message)}finally{setBusy(false)}}
  const test=async()=>{const first=window.confirm(`PRIMERA CONFIRMACIÓN\n\nSe enviará un único correo técnico a: ${form.testRecipient||form.fromEmail}. No se utilizará el padrón.\n\n¿Continuar?`);if(!first)return;const confirmation=window.prompt('SEGUNDA CONFIRMACIÓN: escribí PROBAR para enviar este correo técnico.','')||'';if(confirmation.trim().toUpperCase()!=='PROBAR')return;setBusy(true);setMessage('');setError('');try{const result=await request('/api/admin/difusion/mail-settings/test',{method:'POST',body:JSON.stringify({recipient:form.testRecipient,confirmFirst:true,confirm:confirmation})});setMessage(`Prueba técnica enviada correctamente a ${result.recipient}. No se utilizó el padrón.`)}catch(e){setError(e.message)}finally{setBusy(false)}}
  if(loading)return <div className="neo-loading neo-tab-loading">Cargando configuración de correo…</div>
  return <section className="neo-mail-settings"><div className="neo-section-heading"><span>CONFIGURACIÓN ADMINISTRATIVA</span><h2>Correo emisor de Difusión</h2><p>Casilla provisoria y de validación: <strong>tesoreria@uic-campana.com.ar</strong>. En el futuro podrá reemplazarse por <strong>beneficios@uic-campana.com.ar</strong>. El correo institucional general de UIC no se utiliza como emisor ni como casilla de aprobación; en Modo PRUEBA sí integra la lista blanca de destinatarios de control.</p></div>
    <div className="neo-mail-safety"><ShieldCheck/><div><strong>Configuración protegida</strong><p>La contraseña SMTP guardada permanece cifrada y no se recupera en pantalla; el ojo permite revisar únicamente lo que estés escribiendo antes de guardar. El padrón general requiere salir de Modo PRUEBA y habilitarlo expresamente desde “Validaciones”.</p></div></div>
    <div className="neo-mail-grid"><label>Servidor SMTP<input value={form.host} onChange={e=>change('host',e.target.value)} placeholder="smtp.gmail.com"/></label><label>Puerto<input type="number" value={form.port} onChange={e=>change('port',Number(e.target.value))}/></label><label className="neo-mail-check"><input type="checkbox" checked={form.secure} onChange={e=>change('secure',e.target.checked)}/> Conexión segura SSL/TLS</label><label>Usuario / correo SMTP<input value={form.username} onChange={e=>change('username',e.target.value)}/></label><label>Contraseña o clave de aplicación<PasswordInput value={form.password} onChange={e=>change('password',e.target.value)} placeholder={form.passwordConfigured?'Configurada · dejar vacío para conservar':'Ingresar clave SMTP'}/></label><label>Correo remitente<input value={form.fromEmail} onChange={e=>change('fromEmail',e.target.value)}/></label><label>Nombre remitente<input value={form.fromName} onChange={e=>change('fromName',e.target.value)}/></label><label>Correo para prueba técnica<input value={form.testRecipient} onChange={e=>change('testRecipient',e.target.value)} placeholder="Tu correo para recibir una prueba"/></label></div>
    {error&&<div className="neo-form-error">{error}</div>}{message&&<div className="neo-message">{message}</div>}<div className="neo-mail-actions"><button type="button" onClick={save} disabled={busy}>{busy?'Procesando…':'Guardar configuración'}</button><button type="button" onClick={test} disabled={busy||!form.passwordConfigured}>Enviar prueba técnica</button></div><div className="neo-mail-state"><span>Contraseña SMTP: <strong>{form.passwordConfigured?'CONFIGURADA':'PENDIENTE'}</strong></span><span>Modo PRUEBA: <strong>{form.testModeEnabled!==false?'ACTIVO':'DESACTIVADO'}</strong></span><span>Padrón general: <strong>{form.testModeEnabled!==false?'BLOQUEADO POR PRUEBA':form.massSendEnabled?'HABILITADO':'BLOQUEADO'}</strong></span></div>
  </section>
}

function DiffusionGuide() {
  return <section className="neo-diffusion-placeholder neo-diffusion-guide"><Mail/><h2>Cómo ingresar y utilizar Difusión de Beneficios</h2><p className="neo-guide-lead">Este espacio está destinado a empresas e instituciones con convenio vigente con la UIC. Permite preparar promociones, beneficios y novedades propias. El acceso se valida siempre contra el correo previamente registrado para esa entidad.</p>
    <div className="neo-guide-account"><strong>🔐 Si es la primera vez que ingresás</strong><p>1) Buscá y seleccioná tu empresa. 2) Elegí <b>Registrarme</b>. 3) Escribí el correo que ya figura registrado para esa empresa. 4) Si coincide, recibirás en esa misma casilla un código temporal de 6 dígitos. 5) Copiá el código en el Portal y creá tu contraseña personal. Desde ese momento podrás ingresar con correo + contraseña. Si tu empresa no tiene correo cargado, el Portal no permitirá registrarse y deberás solicitar a Administración UIC que incorpore uno.</p></div>
    <div className="neo-guide-account"><strong>🔑 Si ya estás registrado o perdiste la contraseña</strong><p>Para ingresar utilizá <b>Ingresar</b> con el correo registrado y tu contraseña. Si la olvidaste, elegí <b>Olvidé mi contraseña</b>: el Portal enviará un nuevo código únicamente al correo que ya tiene asociado esa empresa. Con ese código podrás crear una nueva contraseña. El sistema nunca muestra públicamente cuál es el correo registrado.</p></div>
    <ol><li><strong>1 · Elegí tu empresa.</strong><span>Podés buscarla por nombre o por beneficio. Ver otras empresas no permite ingresar en ellas: cada registro se valida contra su propio correo.</span></li><li><strong>2 · Ingresá o registrate.</strong><span>El correo que escribas debe coincidir exactamente con uno de los correos autorizados de esa empresa. Si no coincide, el acceso se rechaza y deberás consultar con Administración UIC.</span></li><li><strong>3 · Revisá tus beneficios.</strong><span>Una misma cuenta puede administrar varios beneficios de su empresa. Cada beneficio conserva su propio estado y su propio período entre envíos.</span></li><li><strong>4 · Prepará y guardá el borrador.</strong><span>El asunto es institucional y no puede modificarse. Podés editar el cuerpo, insertar hasta cuatro imágenes dentro del correo y agregar archivos adjuntos por separado. Recomendamos descargar una copia antes de continuar.</span></li><li><strong>5 · Hacé obligatoriamente el modo prueba.</strong><span>La prueba se envía únicamente al correo registrado del responsable. Revisá cómo se ve el texto, las imágenes, la firma y los adjuntos. Esta prueba no consume el período mensual.</span></li><li><strong>6 · Confirmá el código de 6 dígitos.</strong><span>El correo de prueba incluye una clave aleatoria. Copiala y pegala en el Portal. Si modificás el borrador o pedís una nueva prueba, el código anterior deja de servir.</span></li><li><strong>7 · Solicitá validación UIC.</strong><span>Sólo después de una prueba verificada se habilita la solicitud. La validación llega al circuito privado de la UIC; la empresa nunca accede a Destinatarios, Validaciones ni Correo emisor.</span></li><li><strong>8 · Esperá la confirmación.</strong><span>Cuando la UIC valida, la empresa recibe nuevamente el correo final en su propia casilla. Esa recepción confirma que la publicación fue autorizada.</span></li><li><strong>9 · Cola y monitor.</strong><span>Una vez validado, el envío ingresa a una cola. En tu panel verás la posición, los correos enviados y pendientes, una estimación de inicio y finalización y el estado actualizado automáticamente.</span></li><li><strong>10 · Cancelación.</strong><span>Podés cancelar un trabajo pendiente o en curso. Los correos ya enviados no pueden retirarse y los pendientes dejan de procesarse. La cancelación consume igualmente la oportunidad del ciclo mensual.</span></li><li><strong>11 · Una oportunidad por mes, sin acumulación.</strong><span>La primera autorización fija la fecha mensual del beneficio. Si la habilitación corresponde, por ejemplo, al día 5, los ciclos siguientes comienzan siempre el día 5. Si un mes no enviás, esa oportunidad se pierde; no se suman dos envíos al mes siguiente. Si el envío se demora en la cola o se cancela, la próxima fecha sigue siendo la fecha mensual original.</span></li><li><strong>12 · Distribución.</strong><span>Mientras Modo PRUEBA permanezca activo, la distribución queda limitada exclusivamente a los destinatarios internos de control definidos por la UIC. Ningún socio del padrón puede recibir el envío. Cuando Administración desactive expresamente esta protección y luego habilite el padrón, cada dirección recibirá una única copia aunque esté repetida y cada destinatario podrá darse de baja desde el pie del correo.</span></li></ol>
    <div className="neo-guide-warning"><ShieldCheck/><span><strong>La seguridad depende del correo registrado.</strong> Nadie puede registrarse en nombre de otra empresa si no controla una de las casillas previamente asociadas a esa empresa.</span></div>
  </section>
}

function CompanySelectionPlaceholder() {
  return <div className="neo-diffusion-placeholder neo-company-selection-placeholder"><Building2/><h2>Seleccioná una empresa o institución</h2><p>Buscala en el listado de la izquierda. Después podrás ingresar, registrarte por primera vez o recuperar tu contraseña.</p></div>
}

function DiffusionRoleChoice({ onAdmin, onBeneficiary }) {
  return <><Header/><main className="neo-diffusion-page"><div className="neo-shell"><div className="neo-diffusion-top"><button type="button" onClick={()=>go('/')}><ArrowLeft/> Volver al Portal de Beneficios</button></div>
    <section className="neo-diffusion-intro"><div><span>DIFUSIÓN DE BENEFICIOS · v3.9.9.2</span><h1>¿Cómo querés ingresar?</h1><p>Elegí el tipo de acceso. El administrador utiliza la clave privada de la UIC. Si tu empresa o institución firmó un convenio, ingresá como beneficiario para gestionar y publicar sus promociones, beneficios y novedades.</p></div><div className="neo-diffusion-lock"><ShieldCheck/><strong>Accesos separados y seguros</strong><small>El beneficiario no necesita la clave privada de la UIC y sólo puede operar sobre su propia entidad. El administrador conserva las herramientas de control.</small></div></section>
    <section className="neo-role-choice">
      <button type="button" className="neo-role-card" onClick={onAdmin}><span className="neo-role-icon"><LockKeyhole/></span><div><span>ACCESO PRIVADO UIC</span><h2>Como administrador</h2><p>Requiere la clave administrativa. Permite gestionar empresas, destinatarios, validaciones, correo emisor y ver cualquier empresa en modo de prueba.</p><strong>Ingresar como administrador <ArrowRight/></strong></div></button>
      <button type="button" className="neo-role-card beneficiary" onClick={onBeneficiary}><span className="neo-role-icon"><Building2/></span><div><span>EMPRESA O INSTITUCIÓN CON CONVENIO</span><h2>Como beneficiario</h2><p>Si tu empresa o institución firmó un convenio con la UIC, no necesitás la clave privada del administrador. Ingresá con el registro validado de tu entidad para preparar y publicar promociones, beneficios y novedades.</p><strong>Ingresar como beneficiario <ArrowRight/></strong></div></button>
    </section>
    <div className="neo-role-note neo-role-public-notice"><CircleAlert/><div><strong>IMPORTANTE · EMPRESAS E INSTITUCIONES CON CONVENIO</strong><span>Si ya firmaste un convenio con la UIC, podés ingresar como <b>beneficiario</b> sin utilizar la clave privada del administrador. Desde allí podrás preparar y publicar <b>promociones, beneficios y novedades</b>. El acceso se valida con el correo registrado de tu entidad.</span></div></div>
  </div></main><Footer/></>
}

function CompanyAuthPortal({ onAuthenticated, onSwitchRole }) {
  const [companies,setCompanies]=useState([]); const [query,setQuery]=useState(''); const [selected,setSelected]=useState(null); const [mode,setMode]=useState('login'); const [phase,setPhase]=useState('form'); const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [code,setCode]=useState(''); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false)
  useEffect(()=>{request('/api/difusion/companies').then(setCompanies).catch(e=>setMessage(e.message))},[])
  const visible=useMemo(()=>{const n=normalizeCompanySearch(query);return companies.filter(c=>!n||normalizeCompanySearch(`${c.name} ${(c.benefits||[]).map(b=>b.title).join(' ')}`).includes(n))},[companies,query])
  const choose=c=>{setSelected(c);setMode('login');setPhase('form');setEmail('');setPassword('');setCode('');setMessage('')}
  const selectMode=next=>{setMode(next);setPhase('form');setPassword('');setCode('');setMessage('')}
  const submitLogin=async e=>{e.preventDefault();setBusy(true);setMessage('');try{await request('/api/difusion/company/login',{method:'POST',body:JSON.stringify({companyKey:selected.key,email,password})});await onAuthenticated()}catch(err){setMessage(err.message)}finally{setBusy(false)}}
  const requestRegister=async e=>{e.preventDefault();setBusy(true);setMessage('');try{await request('/api/difusion/company/register/request',{method:'POST',body:JSON.stringify({companyKey:selected.key,email})});setPhase('code');setMessage('Enviamos un código de 6 dígitos al correo registrado. Revisá esa casilla para completar el alta.')}catch(err){setMessage(err.message)}finally{setBusy(false)}}
  const verifyRegister=async e=>{e.preventDefault();setBusy(true);setMessage('');try{await request('/api/difusion/company/register/verify',{method:'POST',body:JSON.stringify({companyKey:selected.key,email,code,password})});await onAuthenticated()}catch(err){setMessage(err.message)}finally{setBusy(false)}}
  const requestForgot=async e=>{e.preventDefault();setBusy(true);setMessage('');try{await request('/api/difusion/company/forgot/request',{method:'POST',body:JSON.stringify({companyKey:selected.key,email})});setPhase('code');setMessage('Enviamos un código temporal al correo registrado.')}catch(err){setMessage(err.message)}finally{setBusy(false)}}
  const resetPassword=async e=>{e.preventDefault();setBusy(true);setMessage('');try{await request('/api/difusion/company/forgot/reset',{method:'POST',body:JSON.stringify({companyKey:selected.key,email,code,password})});setMode('login');setPhase('form');setPassword('');setCode('');setMessage('Contraseña actualizada. Ya podés ingresar.')}catch(err){setMessage(err.message)}finally{setBusy(false)}}
  return <><Header/><main className="neo-diffusion-page"><div className="neo-shell"><div className="neo-diffusion-top"><button type="button" onClick={()=>go('/')}><ArrowLeft/> Volver al Portal de Beneficios</button><button type="button" className="neo-admin-entry" onClick={onSwitchRole}><RefreshCw/> Cambiar tipo de acceso</button></div>
    <section className="neo-diffusion-intro"><div><span>BENEFICIARIOS · v3.9.9.2</span><h1>Elegí tu empresa</h1><p>Buscá la empresa o institución que firmó un convenio con la UIC, revisá sus beneficios y utilizá el acceso propio de esa entidad para preparar sus publicaciones.</p></div><div className="neo-diffusion-lock"><ShieldCheck/><strong>Identidad protegida por correo</strong><small>El listado de empresas es visible, pero el acceso sólo se habilita cuando el correo ingresado coincide con un correo previamente registrado para esa empresa.</small></div></section>
    <DiffusionGuide/>
    <section className="neo-diffusion-workspace"><div className="neo-diffusion-directory"><label className="neo-search neo-diffusion-search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar empresa o beneficio…"/>{query&&<button type="button" onClick={()=>setQuery('')}><X/></button>}</label><div className="neo-diffusion-company-list">{visible.map(c=><button type="button" key={c.key} className={`${selected?.key===c.key?'active':''} ${c.testMode?'test-company':''}`.trim()} onClick={()=>choose(c)}><Building2/><span><strong>{c.name}{c.testMode&&<em className="neo-test-company-badge">MODO PRUEBA</em>}</strong><small>{c.benefitCount} beneficio{c.benefitCount===1?'':'s'}</small></span><ChevronRight/></button>)}</div></div>
      <div className="neo-diffusion-preview">{!selected?<CompanySelectionPlaceholder/>:<div className="neo-company-access"><span>EMPRESA SELECCIONADA</span><h2>{selected.name}</h2>{selected.testMode&&<div className="neo-test-company-notice"><ShieldCheck/><div><strong>Empresa interna · MODO PRUEBA</strong><small>Convive con las empresas reales, pero sus envíos quedan forzados por servidor a los 3 destinos de control.</small></div></div>}<div className="neo-public-benefits">{(selected.benefits||[]).map(b=><div key={b.slug}><strong>{b.title}</strong><small>{b.category}</small></div>)}</div>
        {!selected.hasRegisteredEmail?<div className="neo-no-company-email"><CircleAlert/><div><strong>Esta empresa no tiene correo registrado para el acceso.</strong><p>No es posible registrarse, ingresar por primera vez ni recuperar contraseña hasta que Administración UIC incorpore un correo válido. Por favor comunicate con Administración UIC para actualizar el dato.</p></div></div>:<>
          <div className="neo-auth-help"><strong>{mode==='login'?'¿Ya estás registrado?':mode==='register'?'Registro por primera vez':'Recuperación de contraseña'}</strong><span>{mode==='login'?'Ingresá con el mismo correo con el que te registraste y tu contraseña personal.':mode==='register'?'Escribí el correo que ya figura asociado a esta empresa. Si coincide, enviaremos allí un código de 6 dígitos para crear la contraseña.':'Escribí el correo registrado. Si coincide, recibirás un código temporal para definir una nueva contraseña.'}</span></div>
          <div className="neo-auth-tabs"><button className={mode==='login'?'active':''} onClick={()=>selectMode('login')}>Ingresar</button><button className={mode==='register'?'active':''} onClick={()=>selectMode('register')}>Registrarme</button><button className={mode==='forgot'?'active':''} onClick={()=>selectMode('forgot')}>Olvidé mi contraseña</button></div>
          {mode==='login'&&<form className="neo-company-auth-form" onSubmit={submitLogin}><label>Correo registrado<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Contraseña<PasswordInput value={password} onChange={e=>setPassword(e.target.value)} required/></label><button disabled={busy}>{busy?'Verificando…':'Ingresar'}</button></form>}
          {mode==='register'&&phase==='form'&&<form className="neo-company-auth-form" onSubmit={requestRegister}><p>El Portal no mostrará el correo guardado. Sólo enviará el código si la dirección que escribís coincide con un correo autorizado de {selected.name}.</p><label>Correo registrado<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><button disabled={busy}>{busy?'Enviando…':'Enviar código de registro'}</button></form>}
          {mode==='register'&&phase==='code'&&<form className="neo-company-auth-form" onSubmit={verifyRegister}><p>Revisá la casilla indicada. El código vence a los 15 minutos.</p><label>Código de 6 dígitos<input inputMode="numeric" maxLength="6" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} required/></label><label>Crear contraseña<PasswordInput minLength={8} value={password} onChange={e=>setPassword(e.target.value)} required/></label><button disabled={busy||code.length!==6}>{busy?'Registrando…':'Confirmar registro'}</button></form>}
          {mode==='forgot'&&phase==='form'&&<form className="neo-company-auth-form" onSubmit={requestForgot}><p>El código de recuperación sólo puede enviarse a un correo ya asociado a esta empresa.</p><label>Correo registrado<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><button disabled={busy}>{busy?'Enviando…':'Enviar código de recuperación'}</button></form>}
          {mode==='forgot'&&phase==='code'&&<form className="neo-company-auth-form" onSubmit={resetPassword}><label>Código de 6 dígitos<input inputMode="numeric" maxLength="6" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} required/></label><label>Nueva contraseña<PasswordInput minLength={8} value={password} onChange={e=>setPassword(e.target.value)} required/></label><button disabled={busy||code.length!==6}>{busy?'Actualizando…':'Crear nueva contraseña'}</button></form>}
        </>}
        {message&&<div className="neo-message">{message}</div>}
      </div>}</div>
    </section>
  </div></main><Footer/></>
}

function formatMonitorDate(value) { if(!value)return '—'; try{return new Date(value).toLocaleString('es-AR',{dateStyle:'short',timeStyle:'short'})}catch{return String(value)} }
function formatMonitorDay(value) { if(!value)return '—'; const raw=String(value).slice(0,10); const [y,m,d]=raw.split('-'); return y&&m&&d?`${d}/${m}/${y}`:raw }
function CampaignMonitor({ companyKey, benefits=[], adminPreview=false }) {
  const [data,setData]=useState({campaigns:[],schedules:[]}); const [loading,setLoading]=useState(true); const [message,setMessage]=useState(''); const [busyId,setBusyId]=useState(null); const [trace,setTrace]=useState(null); const [traceBusy,setTraceBusy]=useState(null)
  const load=async({quiet=false}={})=>{try{const url=adminPreview?`/api/admin/difusion/monitor?companyKey=${encodeURIComponent(companyKey)}`:'/api/difusion/company/monitor';setData(await request(url));if(!quiet)setMessage('')}catch(e){if(!quiet)setMessage(e.message)}finally{setLoading(false)}}
  useEffect(()=>{setLoading(true);load()},[companyKey,adminPreview])
  const activeRefreshMs=(data.campaigns||[]).some(item=>['queued','sending'].includes(item.status))?15000:(data.campaigns||[]).some(item=>item.status==='pending')?45000:0
  useEffect(()=>{if(!activeRefreshMs)return;const timer=setInterval(()=>{if(document.visibilityState==='visible')load({quiet:true})},activeRefreshMs);return()=>clearInterval(timer)},[companyKey,adminPreview,activeRefreshMs])
  const cancel=async item=>{const next=item.next_allowed_at?formatMonitorDay(item.next_allowed_at):'la próxima fecha mensual';const sent=Number(item.sent_count||0);const total=Number(item.total_recipients||0);const ok=window.confirm(`¿Cancelar este envío?\n\nYa enviados: ${sent} de ${total}.\nLos correos ya enviados no pueden retirarse.\nAl cancelar se pierde la oportunidad del ciclo mensual actual y no se acumula. La próxima habilitación seguirá siendo ${next}, calculada desde la fecha original de autorización.`);if(!ok)return;setBusyId(item.id);try{const result=await request(`/api/admin/difusion/campaigns/${item.id}/cancel`,{method:'POST',body:'{}'});setMessage(result.note||`Envío cancelado. Próxima habilitación: ${result.nextAllowed?formatMonitorDay(result.nextAllowed):next}.`);await load()}catch(e){setMessage(e.message)}finally{setBusyId(null)}}
  const loadTrace=async item=>{if(!adminPreview)return;setTraceBusy(item.id);try{const detail=await request(`/api/admin/difusion/campaigns/${item.id}/trace`);setTrace(current=>current?.campaign?.id===item.id?null:detail)}catch(e){setMessage(e.message)}finally{setTraceBusy(null)}}
  const schedules=new Map((data.schedules||[]).map(x=>[x.benefit_slug,x]))
  const phase=item=>{
    if(item.status==='blocked')return {code:'blocked',label:'REQUIERE CORRECCIÓN',title:'El control automático bloqueó la prueba',detail:item.safety_notes||'Revisá el contenido antes de volver a intentar.',step:1}
    if(item.status==='rejected')return {code:'rejected',label:'DEVUELTO POR UIC',title:'La comunicación necesita correcciones',detail:item.safety_notes||'Abrí tu archivo local, corregí la publicación y volvé a iniciar la prueba.',step:3}
    if(item.status==='pending')return {code:'pending',label:'ESPERANDO VALIDACIÓN UIC',title:'UIC está revisando la comunicación',detail:'La prueba y el código ya fueron confirmados. Todavía no se envió al padrón.',step:3}
    if(item.status==='queued')return {code:'queued',label:'AUTORIZADO · EN COLA',title:'UIC autorizó la comunicación',detail:'El envío quedó incorporado a la cola y comenzará según su posición.',step:4}
    if(item.status==='sending')return {code:'sending',label:'ENVIANDO',title:'La distribución está en curso',detail:'El sistema está enviando de manera controlada y actualiza el avance automáticamente.',step:5}
    if(item.status==='sent')return {code:'sent',label:'FINALIZADO',title:'La distribución terminó',detail:Number(item.failed_count||0)>0?'El envío terminó con algunos destinatarios con error.':'El envío finalizó. La trazabilidad seguirá registrando aperturas detectadas y bajas.',step:5}
    if(item.status==='cancelled')return {code:'cancelled',label:'CANCELADO',title:'El envío fue detenido',detail:'Los correos ya enviados no pueden retirarse y la oportunidad del ciclo quedó consumida.',step:5}
    if(item.test_verified_at)return {code:'verified',label:'PRUEBA VERIFICADA',title:'Identidad confirmada',detail:'El código de 6 dígitos fue validado. Falta solicitar la validación UIC desde la publicación.',step:2}
    if(item.test_sent_at)return {code:'test',label:'PRUEBA ENVIADA',title:'Esperando confirmación del código',detail:'Revisá el correo registrado de la empresa e ingresá en el Portal el código de 6 dígitos.',step:1}
    return {code:'draft',label:'PREPARANDO PRUEBA',title:'La instancia operativa está preparada',detail:'Todavía no hay una prueba confirmada.',step:1}
  }
  const timelineSteps=['Prueba','Código verificado','Validación UIC','Cola','Distribución']
  return <section className="neo-send-monitor"><div className="neo-section-heading"><span>MONITOR Y TRAZABILIDAD</span><h2>Situación de tus comunicaciones</h2><p>Acá podés seguir el recorrido completo, <strong>desde la prueba hasta la distribución</strong>. Las aperturas son <strong>aperturas detectadas</strong>, no lecturas garantizadas, porque algunos clientes de correo bloquean o precargan imágenes. Cada beneficio dispone de <strong>una oportunidad por ciclo mensual</strong> y no se acumula.</p></div>
    <div className="neo-monitor-toolbar"><span>{activeRefreshMs?`Actualización automática cada ${Math.round(activeRefreshMs/1000)} s mientras hay actividad.`:'Sin consultas permanentes: el historial se actualiza sólo cuando vos lo pedís.'}</span><button type="button" onClick={()=>load()}><RefreshCw/> Actualizar estado</button></div>
    {loading?<div className="neo-loading">Cargando monitor…</div>:<>{message&&<div className="neo-message">{message}</div>}<div className="neo-cycle-grid">{benefits.map(benefit=>{const schedule=schedules.get(benefit.slug);return <div className={`neo-cycle-card ${schedule?.available_now?'available':schedule?'used':'new'}`} key={benefit.slug}><span>{benefit.title}</span>{!schedule?<><strong>Sin fecha mensual fijada</strong><small>La primera aprobación UIC establecerá el día de referencia para los meses siguientes.</small></>:schedule.available_now?<><strong>Disponible en el ciclo actual</strong><small>Día fijo: {Number(String(schedule.anchor_date).slice(8,10))}. Si no se utiliza antes del {formatMonitorDay(schedule.current_cycle_end)}, esta oportunidad se pierde.</small></>:<><strong>Oportunidad utilizada</strong><small>Día fijo: {Number(String(schedule.anchor_date).slice(8,10))}. Próxima habilitación: {formatMonitorDay(schedule.current_cycle_end)}.</small></>}</div>})}</div>{!(data.campaigns||[]).length?<div className="neo-monitor-empty"><Mail/><strong>Todavía no hay comunicaciones en seguimiento.</strong><span>Después de enviar una prueba, el monitor mostrará el recorrido: código, validación UIC, cola, distribución y trazabilidad.</span></div>:<div className="neo-monitor-list">{data.campaigns.map(item=>{const sent=Number(item.sent_count||0),failed=Number(item.failed_count||0),total=Number(item.total_recipients||0),processed=sent+failed,progress=total?Math.min(100,Math.round(processed*100/total)):0;const schedule=schedules.get(item.benefit_slug);const current=phase(item);return <article className={`neo-monitor-card ${current.code}`} key={item.id}><div className="neo-monitor-card-head"><div><span>{current.label}</span><h3>{item.benefit_title}</h3><small>Última actualización: {formatMonitorDate(item.updated_at||item.created_at)}</small></div>{['queued','sending','sent','cancelled'].includes(item.status)&&<strong>{sent}/{total}</strong>}</div><div className="neo-monitor-now"><Check/><div><strong>{current.title}</strong><span>{current.detail}</span></div></div><div className="neo-monitor-timeline" aria-label="Etapas de la comunicación">{timelineSteps.map((label,index)=>{const n=index+1;const done=current.code==='sent'||(current.code!=='rejected'&&current.code!=='blocked'&&n<current.step)||(current.code==='sending'&&n<=5)||(current.code==='queued'&&n<=4)||(current.code==='pending'&&n<=2)||(current.code==='verified'&&n<=2);const active=n===current.step&&!['sent','cancelled'].includes(current.code);return <div className={`${done?'done':''} ${active?'active':''}`} key={label}><i>{done?<Check/>:n}</i><span>{label}</span></div>})}</div>{['queued','sending','sent','cancelled'].includes(item.status)&&<><div className="neo-monitor-progress"><i style={{width:`${item.status==='sent'?100:progress}%`}}/></div><div className="neo-monitor-metrics"><span><b>{sent}</b> enviados</span><span><b>{Math.max(0,total-processed)}</b> pendientes</span><span><b>{failed}</b> con error</span><span><b>{Number(item.opened_recipients||0)}</b> destinatarios con apertura detectada</span><span><b>{Number(item.total_opens||0)}</b> aperturas totales detectadas</span><span><b>{Number(item.open_rate||0)}%</b> tasa detectada</span><span><b>{Number(item.unsubscribed_count||0)}</b> bajas confirmadas</span>{item.status==='queued'&&<span><b>{item.queuePosition||1}</b> posición en cola</span>}</div><div className="neo-monitor-times">{item.status==='queued'&&<span>Inicio estimado: <strong>{formatMonitorDate(item.estimatedStartAt)}</strong></span>}{item.status==='sending'&&<span>Envío iniciado: <strong>{formatMonitorDate(item.queue_started_at)}</strong></span>}{['queued','sending'].includes(item.status)&&<span>Finalización estimada: <strong>{formatMonitorDate(item.estimatedFinishAt)}</strong></span>}{item.last_opened_at&&<span>Última apertura detectada: <strong>{formatMonitorDate(item.last_opened_at)}</strong></span>}<span>Próxima oportunidad: <strong>{formatMonitorDay(item.next_allowed_at||schedule?.next_slot_at)}</strong></span></div></>}{item.test_sent_at&&<div className="neo-monitor-milestones"><span>Prueba enviada <b>{formatMonitorDate(item.test_sent_at)}</b></span>{item.test_verified_at&&<span>Código verificado <b>{formatMonitorDate(item.test_verified_at)}</b></span>}{item.approval_requested_at&&<span>Validación solicitada <b>{formatMonitorDate(item.approval_requested_at)}</b></span>}{item.approved_at&&<span>Autorizado por UIC <b>{formatMonitorDate(item.approved_at)}</b></span>}{item.completed_at&&<span>Proceso terminado <b>{formatMonitorDate(item.completed_at)}</b></span>}</div>}{item.queue_note&&<p className="neo-monitor-note">{item.queue_note}</p>}{adminPreview&&sent>0&&<button type="button" className="neo-monitor-trace-button" disabled={traceBusy===item.id} onClick={()=>loadTrace(item)}>{traceBusy===item.id?'Cargando trazabilidad…':trace?.campaign?.id===item.id?'Ocultar trazabilidad':'Ver trazabilidad por empresa y correo'}</button>}{adminPreview&&trace?.campaign?.id===item.id&&<div className="neo-trace-panel"><div className="neo-trace-summary"><span><b>{trace.summary.sent}</b> enviados</span><span><b>{trace.summary.opened}</b> abiertos detectados</span><span><b>{trace.summary.notDetected}</b> sin apertura detectada</span><span><b>{trace.summary.openRate}%</b> apertura</span><span><b>{trace.summary.unsubscribed}</b> bajas</span></div><div className="neo-trace-table-wrap"><table className="neo-trace-table"><thead><tr><th>Empresa</th><th>Correo</th><th>Estado</th><th>Apertura</th><th>Veces</th><th>Baja</th></tr></thead><tbody>{trace.recipients.map(row=><tr key={row.id}><td>{row.company_name||'—'}</td><td>{row.email}</td><td>{row.status}</td><td>{row.first_opened_at?formatMonitorDate(row.first_opened_at):'No detectada'}</td><td>{Number(row.open_count||0)}</td><td>{row.unsubscribed_at?formatMonitorDate(row.unsubscribed_at):'—'}</td></tr>)}</tbody></table></div><small>“No detectada” no significa necesariamente “no leído”: algunos clientes bloquean imágenes o protegen la privacidad.</small></div>}{['queued','sending'].includes(item.status)&&<button type="button" className="neo-monitor-cancel" disabled={busyId===item.id} onClick={()=>cancel(item)}>{busyId===item.id?'Cancelando…':'Cancelar envío'}</button>}{item.status==='cancelled'&&<div className="neo-monitor-cancelled"><CircleAlert/><span>Cancelado con {sent} correo{sent===1?'':'s'} ya enviado{sent===1?'':'s'}. El cupo mensual no se recupera ni se traslada.</span></div>}</article>})}</div>}</>}
  </section>
}


function AdminTestModeAlert({ settings }) {
  if(settings?.testModeEnabled===false)return null
  return <div className="neo-admin-test-alert" role="status"><CircleAlert/><div><strong>MODO PRUEBA ACTIVO</strong><span>SEGURIDAD PERMANENTE: el padrón general está bloqueado. Sólo pueden recibir comunicaciones de distribución los tres destinatarios de prueba autorizados.</span></div></div>
}

function CompanyDashboard({ company, settings, adminPreview=false, onBack, onLogout, onSwitchRole }) {
  const [editing,setEditing]=useState(null); const [openBusy,setOpenBusy]=useState(false); const [openError,setOpenError]=useState(''); const localInputRef=useRef(null)
  const openLocal=async file=>{setOpenBusy(true);setOpenError('');try{const saved=await readLocalPublicationFile(file,company);let benefit=company.benefits.find(b=>b.slug===saved.benefit_slug);if(!benefit&&company.testMode&&company.benefits.length===1)benefit=company.benefits[0];if(!benefit)throw new Error('El beneficio asociado al archivo local ya no está habilitado para esta empresa.');setEditing({benefit,savedCampaign:saved})}catch(e){const msg=e?.message||'No se pudo abrir el archivo local.';setOpenError(msg)}finally{setOpenBusy(false)}}
  const selectLocal=e=>{const file=e.target.files?.[0];e.target.value='';if(file)openLocal(file)}
  const pickLocal=async()=>{setOpenError('');try{const file=await chooseLocalPublicationFile();if(file===undefined){localInputRef.current?.click();return}if(file)await openLocal(file)}catch(e){setOpenError(e?.message||'No se pudo abrir el selector de archivos.')}}
  if(editing)return <><Header admin={adminPreview}/><main className="neo-diffusion-page"><div className="neo-shell"><CampaignEditor company={company} benefit={editing.benefit} settings={settings} savedCampaign={editing.savedCampaign} onOpenLocalFile={openLocal} onClose={()=>setEditing(null)}/></div></main><Footer/></>
  return <><Header admin={adminPreview}/><main className="neo-diffusion-page"><div className="neo-shell"><div className="neo-diffusion-top"><button type="button" onClick={adminPreview?onBack:()=>go('/')}><ArrowLeft/> {adminPreview?'Volver al panel administrador':'Volver al Portal de Beneficios'}</button><div className="neo-diffusion-top-actions">{!adminPreview&&<button type="button" className="neo-admin-entry" onClick={onSwitchRole}><RefreshCw/> Cambiar tipo de acceso</button>}{!adminPreview&&<button type="button" onClick={onLogout}><LogOut/> Cerrar sesión</button>}</div></div>
    <section className="neo-diffusion-intro"><div><span>{adminPreview?'VISTA ADMINISTRADOR · COMO EMPRESA':'PANEL DE EMPRESA'}</span><h1>{company.name}</h1><p>{company.contactName}{company.role?` · ${company.role}`:''} · {company.email}</p></div><div className="neo-diffusion-lock"><ShieldCheck/><strong>Acceso limitado a esta empresa</strong><small>Desde este panel no existe acceso a Destinatarios, Validaciones ni Correo emisor.</small></div></section>
    <div className="neo-company-dashboard-guide"><strong>Secuencia de trabajo</strong><span>Crear o abrir archivo local {LOCAL_PUBLICATION_EXTENSION} → editar → guardar en tu PC → prueba → código de 6 dígitos → validación UIC → cola de envío → monitor. Los borradores no se almacenan en Neon.</span></div>
    <CampaignMonitor companyKey={company.key} benefits={company.benefits} adminPreview={adminPreview}/>
    <section className="neo-company-benefits"><div className="neo-section-heading"><span>MIS BENEFICIOS</span><h2>Crear una nueva publicación</h2><p>Podés empezar una publicación nueva o levantar un archivo de trabajo anterior guardado en tu propia computadora. Abrir o guardar un archivo local no consume Neon.</p></div>
      <div className="neo-local-open-panel"><div><FolderOpen/><div><span>RECUPERAR TRABAJO ANTERIOR</span><strong>Abrir una publicación guardada en mi PC</strong><p>Elegí un archivo <b>{LOCAL_PUBLICATION_EXTENSION}</b>. Puede haber 5, 20 o 100 versiones en tu disco: ninguna ocupa espacio en Neon.</p></div></div><button type="button" onClick={pickLocal} disabled={openBusy}><FolderOpen/> {openBusy?'Abriendo archivo…':'Abrir archivo local'}</button><input ref={localInputRef} className="neo-local-file-input" type="file" accept={`${LOCAL_PUBLICATION_EXTENSION},application/json,application/vnd.uic.publicacion+json`} onChange={selectLocal}/></div>
      {openBusy&&<div className="neo-loading neo-tab-loading neo-local-open-feedback">Leyendo y reconstruyendo el archivo desde tu computadora…</div>}{openError&&<div className="neo-form-error neo-local-open-feedback"><strong>No se pudo abrir el archivo.</strong><span>{openError}</span><small>El archivo no se envió a Neon ni al servidor.</small></div>}
      {company.benefits.map(b=><article key={b.slug}><div><span>{b.category}</span><h3>{b.title}</h3><p>{b.summary}</p></div><button type="button" disabled={!company.email} title={!company.email?'La empresa no tiene correo registrado. Incorporalo desde Administración UIC antes de preparar una difusión.':''} onClick={()=>company.email&&setEditing({benefit:b,savedCampaign:null})}>{company.email?'Nueva publicación':'Sin correo registrado'}</button></article>)}
    </section>
  </div></main><Footer/></>
}

function AdminDiffusionPanel({ onSwitchRole }) {
  const [companies,setCompanies]=useState([]); const [settings,setSettings]=useState(null); const [query,setQuery]=useState(''); const [selectedCompany,setSelectedCompany]=useState(null); const [tab,setTab]=useState('empresas'); const [maintenance,setMaintenance]=useState(false); const [previewCompany,setPreviewCompany]=useState(null)
  const load=async()=>{const [companyData,settingData]=await Promise.all([request('/api/admin/difusion/companies'),request('/api/admin/difusion/settings')]);setCompanies(companyData);setSettings(settingData);setMaintenance(!settingData.databaseAvailable)}; useEffect(()=>{load()},[])
  const visible=useMemo(()=>{const n=normalizeCompanySearch(query);return companies.filter(c=>!n||normalizeCompanySearch(c.name).includes(n)||c.benefits.some(b=>normalizeCompanySearch(`${b.title} ${b.category}`).includes(n)))},[companies,query])
  const selected=selectedCompany?companies.find(c=>c.key===selectedCompany)||null:null
  const switchTab=next=>{setTab(next);requestAnimationFrame(()=>document.querySelector('.neo-diffusion-tabs')?.scrollIntoView({block:'nearest'}))}
  if(previewCompany)return <CompanyDashboard company={previewCompany} settings={settings} adminPreview onBack={()=>setPreviewCompany(null)}/>
  return <><Header admin/><main className="neo-diffusion-page"><div className="neo-shell"><AdminTestModeAlert settings={settings}/><div className="neo-diffusion-top"><button type="button" onClick={()=>go('/')}><ArrowLeft/> Volver al Portal de Beneficios</button><div className="neo-diffusion-top-actions"><button type="button" className="neo-admin-entry" onClick={onSwitchRole}><RefreshCw/> Cambiar tipo de acceso</button><span><ShieldCheck/> ADMINISTRADOR · CONTROL TOTAL</span></div></div>
    <section className="neo-diffusion-intro"><div><span>REVISIÓN v3.9.9.2</span><h1>Difusión de Beneficios</h1><p>Administración, validaciones, padrón, correo y vista de experiencia de cada empresa.</p></div><div className="neo-diffusion-lock"><LockKeyhole/><strong>Herramientas privadas</strong><small>Destinatarios, Validaciones y Correo emisor sólo existen en este modo administrador.</small></div></section>
    <TestModeSafety settings={settings} onSettingsChanged={load}/>
    <nav className="neo-diffusion-tabs"><button className={tab==='empresas'?'active':''} onClick={()=>switchTab('empresas')}><Building2/> Empresas</button><button className={tab==='destinatarios'?'active':''} onClick={()=>switchTab('destinatarios')}><Users/> Destinatarios</button><button className={tab==='validaciones'?'active':''} onClick={()=>switchTab('validaciones')}><ShieldCheck/> Validaciones</button><button className={tab==='correo'?'active':''} onClick={()=>switchTab('correo')}><Mail/> Correo emisor</button></nav>
    {maintenance?<MaintenancePanel contact={settings?.maintenanceContact}/>:<div className="neo-diffusion-tab-stack"><div hidden={tab!=='destinatarios'}><RecipientManager maintenanceContact={settings?.maintenanceContact}/></div><div hidden={tab!=='validaciones'}><ApprovalQueue settings={settings} onSettingsChanged={load}/></div><div hidden={tab!=='correo'}><MailSettings onSettingsChanged={load}/></div><div hidden={tab!=='empresas'}><section className="neo-diffusion-status"><div><strong>{companies.length}</strong><span>empresas / prestadores</span></div><div><strong>{companies.filter(c=>c.hasRegisteredEmail).length}</strong><span>con correo habilitado para registro</span></div><div><strong>{settings?.testModeEnabled!==false?'PRUEBA · 3 DESTINOS':settings?.massSendEnabled?'MASIVO ON':'CONTROL'}</strong><span>estado de distribución</span></div></section><section className="neo-diffusion-workspace"><div className="neo-diffusion-directory"><label className="neo-search neo-diffusion-search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar empresa o beneficio…"/>{query&&<button onClick={()=>setQuery('')}><X/></button>}</label><div className="neo-diffusion-company-list">{visible.map(c=><button key={c.key} className={`${selectedCompany===c.key?'active':''} ${c.testMode?'test-company':''}`.trim()} onClick={()=>setSelectedCompany(c.key)}><Building2/><span><strong>{c.name}{c.testMode&&<em className="neo-test-company-badge">MODO PRUEBA</em>}</strong><small>{c.benefits.length} beneficio{c.benefits.length===1?'':'s'} · {c.hasRegisteredEmail?'correo disponible':'SIN CORREO'}</small></span><ChevronRight/></button>)}</div></div><div className="neo-diffusion-preview">{selected?<><div className="neo-diffusion-preview-head"><span>CONTROL ADMINISTRATIVO</span><h2>{selected.name}</h2><p>{selected.email||'Sin correo válido'}{selected.contactName?` · ${selected.contactName}`:''}</p><button type="button" className="neo-view-as-company" onClick={()=>setPreviewCompany(selected)}>Ver como empresa</button></div>{selected.benefits.map(b=><article key={b.slug}><div><span>{b.category}</span><h3>{b.title}</h3><p>{b.summary}</p></div></article>)}</>:<DiffusionGuide/>}</div></section></div></div>}
    <div className="neo-diffusion-bottom"><button type="button" onClick={()=>go('/')}><ArrowLeft/> Volver al Portal de Beneficios</button></div>
  </div></main><Footer/></>
}

function Diffusion() {
  const [role,setRole]=useState(null); const [checking,setChecking]=useState(false); const [admin,setAdmin]=useState(false); const [companyAuth,setCompanyAuth]=useState(false); const [company,setCompany]=useState(null); const [settings,setSettings]=useState(null); const [adminNotice,setAdminNotice]=useState('')
  const clearView=()=>{setAdmin(false);setCompanyAuth(false);setCompany(null);setSettings(null);setChecking(false)}
  const chooseRole=async nextRole=>{
    setRole(nextRole);setChecking(true);setAdmin(false);setCompanyAuth(false);setCompany(null);setSettings(null)
    try{
      if(nextRole==='admin'){
        const a=await request('/api/admin/me').catch(()=>({authenticated:false}))
        setAdmin(Boolean(a.authenticated))
      }else{
        const a=await request('/api/admin/me').catch(()=>({authenticated:false}))
        if(a.authenticated) await request('/api/admin/logout',{method:'POST',body:'{}'}).catch(()=>{})
        const c=await request('/api/difusion/company/me').catch(()=>({authenticated:false}))
        if(c.authenticated){
          const [dashboard,companySettings]=await Promise.all([request('/api/difusion/company/dashboard'),request('/api/difusion/company/settings')])
          setCompanyAuth(true);setCompany(dashboard);setSettings(companySettings)
        }
      }
    }finally{setChecking(false)}
  }
  const refreshBeneficiary=async()=>{setChecking(true);try{const c=await request('/api/difusion/company/me').catch(()=>({authenticated:false}));if(c.authenticated){const [dashboard,companySettings]=await Promise.all([request('/api/difusion/company/dashboard'),request('/api/difusion/company/settings')]);setCompanyAuth(true);setCompany(dashboard);setSettings(companySettings)}else{setCompanyAuth(false);setCompany(null);setSettings(null)}}finally{setChecking(false)}}
  const switchRole=()=>{clearView();setAdminNotice('');setRole(null)}
  useEffect(()=>{const expired=()=>{if(role!=='admin')return;setAdmin(false);setChecking(false);setAdminNotice('Tu sesión administrativa venció. La última operación no se guardó. Volvé a ingresar con la clave para continuar con seguridad.')};window.addEventListener(ADMIN_SESSION_EXPIRED_EVENT,expired);return()=>window.removeEventListener(ADMIN_SESSION_EXPIRED_EVENT,expired)},[role])
  if(!role)return <DiffusionRoleChoice onAdmin={()=>chooseRole('admin')} onBeneficiary={()=>chooseRole('beneficiary')}/>
  if(checking)return <div className="neo-loading">Verificando acceso…</div>
  if(role==='admin')return admin?<AdminDiffusionPanel onSwitchRole={switchRole}/>:<Login mode="diffusion" notice={adminNotice} onBack={switchRole} onSuccess={async()=>{setAdminNotice('');await chooseRole('admin')}}/>
  if(companyAuth&&company)return <CompanyDashboard company={company} settings={settings} onSwitchRole={switchRole} onLogout={async()=>{await request('/api/difusion/company/logout',{method:'POST',body:'{}'});setCompanyAuth(false);setCompany(null);setSettings(null)}}/>
  return <CompanyAuthPortal onAuthenticated={refreshBeneficiary} onSwitchRole={switchRole}/>
}

function Footer() { return <footer className="neo-footer"><div className="neo-shell"><Brand/><p>Unión Industrial de Campana · Beneficios que fortalecen a nuestra comunidad productiva.</p><a href="https://uic-campana.com.ar/" target="_blank" rel="noreferrer">uic-campana.com.ar</a></div></footer> }

export default function App() {
  const route = useRoute()
  if (route === '/administracion') return <Admin/>
  if (route === '/difusion') return <Diffusion/>
  if (route.startsWith('/beneficio/')) return <Detail slug={decodeURIComponent(route.split('/')[2] || '')}/>
  return <Home/>
}
