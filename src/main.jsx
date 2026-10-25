import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

const RECOVERY_KEY = 'beneficios-uic-ui-recovery-396'

class PortalErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error('Beneficios UIC: recuperación de interfaz', error)
    try {
      const key = `${RECOVERY_KEY}:${location.pathname}`
      const last = Number(sessionStorage.getItem(key) || 0)
      if (!last || Date.now() - last > 60000) {
        sessionStorage.setItem(key, String(Date.now()))
        setTimeout(() => location.reload(), 120)
      }
    } catch {}
  }

  render() {
    if (!this.state.failed) return this.props.children
    return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:'28px',background:'#f3f8fa',fontFamily:'Arial,sans-serif',color:'#17384c'}}>
      <section style={{width:'min(720px,100%)',background:'#fff',border:'1px solid #c9e1ec',borderRadius:'18px',padding:'30px',boxShadow:'0 12px 36px rgba(25,74,96,.08)'}}>
        <small style={{fontWeight:800,letterSpacing:'1.4px',color:'#0796c8'}}>PORTAL DE BENEFICIOS UIC</small>
        <h1 style={{margin:'10px 0 8px'}}>Actualizando esta pantalla</h1>
        <p style={{lineHeight:1.55}}>La vista necesita volver a cargarse. El Portal intenta recuperarla automáticamente para evitar que quede una pantalla en blanco.</p>
        <div style={{display:'flex',gap:'10px',flexWrap:'wrap',marginTop:'20px'}}>
          <button onClick={()=>location.reload()} style={{border:0,borderRadius:'10px',padding:'12px 18px',fontWeight:800,cursor:'pointer'}}>Actualizar pantalla</button>
          <button onClick={()=>location.assign('/')} style={{border:'1px solid #9fcddd',background:'#fff',borderRadius:'10px',padding:'12px 18px',fontWeight:800,cursor:'pointer'}}>Volver al Portal de Beneficios</button>
        </div>
      </section>
    </main>
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => registrations.forEach(registration => registration.unregister())).catch(() => {})
  if ('caches' in window) caches.keys().then(keys => keys.forEach(key => caches.delete(key))).catch(() => {})
}

// Chrome puede restaurar una SPA completa desde BFCache sin consultar nuevamente
// el servidor. Si eso ocurre, forzamos una única recarga para que la pantalla
// corresponda siempre con la URL visible.
window.addEventListener('pageshow', event => {
  if (event.persisted) window.location.reload()
})

const root = createRoot(document.getElementById('root'))
root.render(<React.StrictMode><PortalErrorBoundary><App /></PortalErrorBoundary></React.StrictMode>)
requestAnimationFrame(() => window.dispatchEvent(new Event('uic:portal-ready')))
