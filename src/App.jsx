import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, ArrowRight, BadgePercent, Building2, Check, ChevronRight, CircleAlert, Factory,
  HeartHandshake, LayoutGrid, LockKeyhole, LogOut, Mail, Menu, Phone, Plus, RefreshCw,
  Search, ShieldCheck, Sparkles, Upload, Users, X
} from 'lucide-react'

const recentSlugs = new Set(['capacitacion-retencion-talento-etrr'])

const emptyBenefit = {
  title: '', partner: '', category: '', status: 'activo', featured: false, summary: '', description: '',
  concreteBenefit: '', costsDiscounts: '', requirements: [], scope: '', contactName: 'María José Godoy (Majo) – Administración UIC',
  contactPhone: '3489 65 0104', contactEmail: 'uic@uic-campana.com.ar', companyContacts: [], agreementUrl: '', startDate: '', endDate: '', published: true
}

async function request(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...options, headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación')
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
      <div className="neo-uic"><span>UIC</span><p>Unión Industrial<br/>de Campana</p></div>
      <nav className="neo-actions">
        <span className="neo-version"><small>NUEVO PORTAL</small><strong>v{health?.version || '3.0.3'}</strong></span>
        <button className="neo-update" type="button" onClick={updateVersion} disabled={updating} aria-live="polite"><RefreshCw className={updating ? 'neo-spin' : ''}/><span>{updating ? 'Actualizando…' : 'Actualizar versión'}</span></button>
        <button className="neo-admin-link neo-desktop" onClick={() => go(admin ? '/' : '/administracion')}>{admin ? <ArrowLeft/> : <Plus/>}{admin ? 'Volver al portal' : 'Agregar beneficio'}</button>
        <button className="neo-menu-button" onClick={() => setMenu(value => !value)} aria-label="Abrir menú">{menu ? <X/> : <Menu/>}</button>
      </nav>
    </div>
    {menu && <div className="neo-mobile-menu"><button onClick={() => go(admin ? '/' : '/administracion')}>{admin ? 'Volver al portal' : 'Administrar beneficios'}</button><a href="https://uic-campana.com.ar/hacete-socio/" target="_blank" rel="noreferrer">Consultar asociación</a></div>}
  </header>
}

function BenefitCard({ item }) {
  const isNew = recentSlugs.has(item.slug)
  return <article className="neo-card" onClick={() => go(`/beneficio/${item.slug}`)} onKeyDown={event => { if (event.key === 'Enter') go(`/beneficio/${item.slug}`) }} tabIndex="0">
    <div className="neo-card-head"><span className="neo-card-icon"><Building2/></span><span className="neo-card-category">{item.category}</span>{isNew && <span className="neo-new"><Sparkles/> NUEVO</span>}</div>
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
  const visible = items.filter(item => {
    const categoryMatch = category === 'Todos' || item.category === category
    return categoryMatch && `${item.title} ${item.partner} ${item.summary}`.toLowerCase().includes(query.toLowerCase())
  })
  const explore = () => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })
  const showLatestAgreement = () => go('/beneficio/capacitacion-retencion-talento-etrr')
  useEffect(() => {
    const saved = Number(sessionStorage.getItem('beneficios-uic-scroll'))
    if (Number.isFinite(saved) && saved > 0) {
      sessionStorage.removeItem('beneficios-uic-scroll')
      requestAnimationFrame(() => window.scrollTo({ top: saved, behavior: 'auto' }))
    }
  }, [])
  return <><Header/><main>
    <section className="neo-hero">
      <div className="neo-hero-orbit"/><div className="neo-hero-dots"/>
      <div className="neo-shell neo-hero-layout">
        <div className="neo-hero-copy">
          <span className="neo-eyebrow"><HeartHandshake/> Beneficios exclusivos para socios</span>
          <h1>Tu empresa puede llegar <em>más lejos.</em></h1>
          <p>Un nuevo espacio para descubrir acuerdos, servicios y oportunidades que convierten la pertenencia a la UIC en valor concreto.</p>
          <div className="neo-hero-buttons"><button onClick={explore}>Descubrir beneficios <ArrowRight/></button><button onClick={showLatestAgreement}><Sparkles/> Descubrir beneficios de nuevos acuerdos</button></div>
          <div className="neo-reassurance"><ShieldCheck/> Información validada y administrada por la Unión Industrial de Campana</div>
        </div>
        <aside className="neo-impact">
          <span className="neo-impact-label">IMPACTO PARA EL SOCIO</span>
          <div className="neo-big-number"><strong>{items.length || 25}</strong><span>beneficios<br/>vigentes</span></div>
          <div className="neo-impact-grid"><div><strong>10</strong><span>rubros</span></div><div><strong>{items.filter(item => item.status === 'activo').length || 25}</strong><span>beneficios activos</span></div></div>
          <div className="neo-impact-foot"><Check/> Acceso simple, condiciones claras y contacto directo.</div>
        </aside>
      </div>
    </section>

    <section className="neo-promises"><div className="neo-shell"><div><BadgePercent/><span><strong>Condiciones preferenciales</strong>Descuentos y bonificaciones</span></div><div><Users/><span><strong>Red industrial</strong>Socios de Campana y adherentes</span></div><div><Factory/><span><strong>Soluciones empresariales</strong>Servicios para producir mejor</span></div></div></section>

    <section id="catalogo" className="neo-catalog neo-shell">
      <div className="neo-section-title"><span>EXPLORÁ EL NUEVO CATÁLOGO</span><h2>Encontrá una oportunidad para tu empresa</h2><p>Elegí un rubro o buscá por servicio, empresa o palabra clave.</p></div>
      <label className="neo-search"><Search/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="¿Qué necesita tu empresa?"/>{query && <button onClick={() => setQuery('')} aria-label="Limpiar"><X/></button>}</label>
      <div className="neo-categories">{categories.map(name => <button key={name} className={category === name ? 'active' : ''} onClick={() => setCategory(name)}>{name === 'Todos' ? <LayoutGrid/> : <ChevronRight/>}<span>{name}</span></button>)}</div>
      <div className="neo-results"><strong>{category}</strong><span>{visible.length} resultado{visible.length === 1 ? '' : 's'}</span></div>
      {error ? <div className="neo-empty"><CircleAlert/><h3>No pudimos cargar los beneficios</h3><p>{error}</p></div> : loading ? <div className="neo-empty">Cargando el nuevo catálogo…</div> : <div className="neo-grid">{visible.map(item => <BenefitCard key={item.id} item={item}/>)}</div>}
    </section>

    <section className="neo-membership"><div className="neo-shell"><div className="neo-membership-icon"><Users/></div><div><span>¿TODAVÍA NO SOS SOCIO?</span><h2>Sumate a una comunidad que genera oportunidades</h2><p>Conocé cómo asociarte y empezá a acceder a todos los beneficios de la UIC.</p></div><a href="https://uic-campana.com.ar/hacete-socio/" target="_blank" rel="noreferrer">Consultar asociación <ArrowRight/></a></div></section>
  </main><Footer/></>
}

function Detail({ slug }) {
  const [item, setItem] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { request(`/api/beneficios/${slug}`).then(data => { setItem(data); request('/api/traces', { method: 'POST', body: JSON.stringify({ slug: data.slug, title: data.title, action: 'vista' }) }).catch(() => {}) }).catch(error => setError(error.message)) }, [slug])
  if (error) return <><Header/><div className="neo-empty neo-page-empty"><CircleAlert/><h2>{error}</h2><button onClick={() => go('/')}>Volver</button></div></>
  if (!item) return <div className="neo-loading">Cargando beneficio…</div>
  const contact = () => request('/api/traces', { method: 'POST', body: JSON.stringify({ slug: item.slug, title: item.title, action: 'contacto' }) }).catch(() => {})
  return <><Header/><main className="neo-detail">
    <section className="neo-detail-hero"><div className="neo-shell"><button onClick={() => go('/')}><ArrowLeft/> Volver al catálogo</button><span>{item.category}</span><h1>{item.title}</h1><p><Building2/> {item.partner}</p></div></section>
    <div className="neo-shell neo-detail-layout"><div className="neo-detail-body">
      <section className="neo-highlight"><span>BENEFICIO PRINCIPAL</span><h2>{item.concreteBenefit || item.summary}</h2></section>
      <section><span>CONDICIONES ECONÓMICAS</span><h2>{item.costsDiscounts || 'Consultar condiciones vigentes'}</h2></section>
      <section><span>EN QUÉ CONSISTE</span><p>{item.description || item.summary}</p></section>
      <section><span>CÓMO ACCEDER</span><ul>{(item.requirements || []).map((requirement, index) => <li key={index}><Check/>{requirement}</li>)}</ul>{item.scope && <p><strong>Alcance:</strong> {item.scope}</p>}</section>
      {item.flyers?.length > 0 && <section><span>MATERIAL VISUAL</span><div className="neo-flyers">{item.flyers.map(flyer => <img key={flyer.id} src={flyer.url} alt={flyer.alt || item.title}/>)}</div></section>}
    </div><aside className="neo-contact"><span>CONTACTO UIC</span><h2>Solicitá este beneficio</h2><p>La UIC verificará tu condición de socio y te orientará para acceder.</p>{item.contactName && <div><Users/>{item.contactName}</div>}{item.contactPhone && <a onClick={contact} href={`tel:${item.contactPhone}`}><Phone/>{item.contactPhone}</a>}{item.contactEmail && <a onClick={contact} href={`mailto:${item.contactEmail}`}><Mail/>{item.contactEmail}</a>}</aside></div>
    <section className="neo-contact-directory neo-shell"><div className="neo-contact-directory-title"><span>DATOS DE CONTACTO</span><h2>Contactos del beneficio</h2><p>Los contactos de la empresa y de la UIC se administran desde el panel privado y pueden actualizarse cuando cambien.</p></div><div className="neo-contact-directory-grid"><article><span>EMPRESA / PRESTADOR</span><h3>{item.partner || 'Empresa adherida'}</h3>{(item.companyContacts || []).length ? (item.companyContacts || []).map((person,index) => <div className="neo-person-contact" key={`${person.email || person.phone || person.name}-${index}`}><strong>{person.name || `Contacto ${index + 1}`}</strong>{person.role && <small>{person.role}</small>}{person.phone && <a onClick={contact} href={`tel:${person.phone}`}><Phone/>{person.phone}</a>}{person.email && <a onClick={contact} href={`mailto:${person.email}`}><Mail/>{person.email}</a>}</div>) : <p className="neo-contact-pending">Contacto de la empresa a completar desde Administración.</p>}</article><article><span>UNIÓN INDUSTRIAL DE CAMPANA</span><h3>Contacto UIC</h3>{item.contactName && <div className="neo-person-contact"><strong>{item.contactName}</strong>{item.contactPhone && <a onClick={contact} href={`tel:${item.contactPhone}`}><Phone/>{item.contactPhone}</a>}{item.contactEmail && <a onClick={contact} href={`mailto:${item.contactEmail}`}><Mail/>{item.contactEmail}</a>}</div>}</article></div>{item.agreementUrl && <a className="neo-source-link" href={item.agreementUrl} target="_blank" rel="noreferrer">Más información del beneficio <ArrowRight/></a>}</section>
  </main><Footer/></>
}

function Login({ onSuccess }) {
  const [password, setPassword] = useState(''); const [error, setError] = useState('')
  const login = async event => { event.preventDefault(); setError(''); try { await request('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) }); onSuccess() } catch (error) { setError(error.message) } }
  return <div className="neo-login"><form onSubmit={login}><div className="neo-lock"><LockKeyhole/></div><span>NUEVA ADMINISTRACIÓN</span><h1>Gestión de beneficios</h1><p>Ingresá con la clave configurada en Render.</p><label>Contraseña<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoFocus/></label>{error && <div className="neo-form-error">{error}</div>}<button>Ingresar <ArrowRight/></button><button type="button" className="neo-back" onClick={() => go('/')}><ArrowLeft/> Volver al portal</button></form></div>
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

function Editor({ items, selected, setSelected, reload }) {
  const [form, setForm] = useState(selected || emptyBenefit)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [files, setFiles] = useState([])
  useEffect(() => setForm(selected || emptyBenefit), [selected])
  const change = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const save = async () => { setMessage(''); setError(''); try { const saved = await request(selected ? `/api/admin/beneficios/${selected.id}` : '/api/admin/beneficios', { method: selected ? 'PUT' : 'POST', body: JSON.stringify(form) }); if (files.length) { const data = new FormData(); files.forEach(file => data.append('flyers', file)); await request(`/api/admin/beneficios/${saved.id}/flyers`, { method: 'POST', body: data }) } setMessage(selected ? 'Cambios guardados.' : 'Beneficio creado.'); await reload(saved.id) } catch (error) { setError(error.message) } }
  const remove = async () => { if (!selected || !confirm(`¿Eliminar ${selected.title}?`)) return; await request(`/api/admin/beneficios/${selected.id}`, { method: 'DELETE', body: '{}' }); setSelected(null); await reload(); }
  return <div className="neo-admin-layout"><aside className="neo-admin-list"><button className="neo-new-benefit" onClick={() => setSelected(null)}><Plus/> Nuevo beneficio</button>{items.map(item => <button className={selected?.id === item.id ? 'active' : ''} key={item.id} onClick={() => setSelected(item)}><strong>{item.title}</strong><span>{item.partner}</span></button>)}</aside>
    <section className="neo-editor"><div className="neo-editor-title"><div><span>{selected ? 'EDITAR BENEFICIO' : 'NUEVO BENEFICIO'}</span><h2>{selected?.title || 'Crear una oportunidad'}</h2></div></div><div className="neo-form-grid">
      <Field label="Título" value={form.title} onChange={value => change('title', value)}/><Field label="Empresa" value={form.partner} onChange={value => change('partner', value)}/><Field label="Rubro" value={form.category} onChange={value => change('category', value)}/><label>Estado<select value={form.status} onChange={event => change('status', event.target.value)}><option value="activo">Activo</option><option value="revalidacion">En revalidación</option><option value="proximo">Próximamente</option></select></label>
      <div className="neo-full"><Field label="Resumen" textarea value={form.summary} onChange={value => change('summary', value)}/></div><div className="neo-full"><Field label="Beneficio concreto" textarea value={form.concreteBenefit} onChange={value => change('concreteBenefit', value)}/></div><div className="neo-full"><Field label="Costos, descuentos y condiciones" textarea value={form.costsDiscounts} onChange={value => change('costsDiscounts', value)}/></div><div className="neo-full"><Field label="Descripción" textarea value={form.description} onChange={value => change('description', value)}/></div><div className="neo-full"><Field label="Requisitos (uno por línea)" textarea value={(form.requirements || []).join('\n')} onChange={value => change('requirements', value.split('\n').filter(Boolean))}/></div>
      <div className="neo-full neo-uic-contact-heading"><span>CONTACTO UIC</span><p>Este contacto institucional se mantiene separado de los contactos de la empresa.</p></div><Field label="Persona de contacto UIC" value={form.contactName} onChange={value => change('contactName', value)}/><Field label="Teléfono UIC" value={form.contactPhone} onChange={value => change('contactPhone', value)}/><Field label="Correo UIC" type="email" value={form.contactEmail} onChange={value => change('contactEmail', value)}/><Field label="Alcance" value={form.scope} onChange={value => change('scope', value)}/><CompanyContactsEditor contacts={form.companyContacts || []} onChange={value => change('companyContacts', value)}/><div className="neo-full"><Field label="Link de información / convenio" value={form.agreementUrl} onChange={value => change('agreementUrl', value)}/></div><label className="neo-check"><input type="checkbox" checked={form.published !== false} onChange={event => change('published', event.target.checked)}/> Publicar en el portal</label><label className="neo-upload"><Upload/> Agregar flyers<input type="file" multiple accept="image/*" onChange={event => setFiles([...event.target.files])}/></label>
    </div>{message && <div className="neo-message">{message}</div>}{error && <div className="neo-form-error">{error}</div>}<div className="neo-editor-actions">{selected && <button className="danger" onClick={remove}>Eliminar</button>}<button onClick={save}>Guardar beneficio <Check/></button></div></section></div>
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

function Footer() { return <footer className="neo-footer"><div className="neo-shell"><Brand/><p>Unión Industrial de Campana · Beneficios que fortalecen a nuestra comunidad productiva.</p><a href="https://uic-campana.com.ar/" target="_blank" rel="noreferrer">uic-campana.com.ar</a></div></footer> }

export default function App() {
  const route = useRoute()
  if (route === '/administracion') return <Admin/>
  if (route.startsWith('/beneficio/')) return <Detail slug={decodeURIComponent(route.split('/')[2] || '')}/>
  return <Home/>
}
