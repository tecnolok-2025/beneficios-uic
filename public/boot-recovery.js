(() => {
  const VERSION = '396'
  const KEY_PREFIX = `beneficios-uic-boot-recovery-${VERSION}:`
  const pathKey = `${KEY_PREFIX}${location.pathname}`

  function rootIsEmpty() {
    const root = document.getElementById('root')
    if (!root) return true
    return root.childElementCount === 0 && !String(root.textContent || '').trim()
  }

  async function clearLegacyUi() {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map(registration => registration.unregister()))
      }
    } catch {}
    try {
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map(key => caches.delete(key)))
      }
    } catch {}
  }

  function showRecovery() {
    const root = document.getElementById('root')
    if (!root || !rootIsEmpty()) return
    root.innerHTML = `
      <main style="min-height:100vh;display:grid;place-items:center;padding:28px;background:#f3f8fa;font-family:Arial,sans-serif;color:#17384c">
        <section style="width:min(720px,100%);background:#fff;border:1px solid #c9e1ec;border-radius:18px;padding:30px;box-shadow:0 12px 36px rgba(25,74,96,.08)">
          <small style="font-weight:800;letter-spacing:1.4px;color:#0796c8">PORTAL DE BENEFICIOS UIC</small>
          <h1 style="margin:10px 0 8px">Recuperando la pantalla</h1>
          <p style="line-height:1.55">La interfaz no terminó de cargarse. Podés reintentar esta pantalla o volver al Portal de Beneficios.</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:20px">
            <button id="uic-retry-view" type="button" style="border:0;border-radius:10px;padding:12px 18px;font-weight:800;cursor:pointer">Reintentar</button>
            <button id="uic-return-home" type="button" style="border:1px solid #9fcddd;background:#fff;border-radius:10px;padding:12px 18px;font-weight:800;cursor:pointer">Volver al Portal de Beneficios</button>
          </div>
        </section>
      </main>`
    document.getElementById('uic-retry-view')?.addEventListener('click', async () => {
      sessionStorage.removeItem(pathKey)
      await clearLegacyUi()
      location.replace(`${location.pathname}?ui=${VERSION}&retry=${Date.now()}`)
    })
    document.getElementById('uic-return-home')?.addEventListener('click', () => location.assign('/'))
  }

  async function recoverIfBlank() {
    if (!rootIsEmpty()) return
    let previous = 0
    try { previous = Number(sessionStorage.getItem(pathKey) || 0) } catch {}
    const now = Date.now()
    if (!previous || now - previous > 60000) {
      try { sessionStorage.setItem(pathKey, String(now)) } catch {}
      await clearLegacyUi()
      const separator = location.search ? '&' : '?'
      location.replace(`${location.pathname}${location.search}${separator}ui=${VERSION}&recover=${now}${location.hash || ''}`)
      return
    }
    showRecovery()
  }

  window.__UIC_PORTAL_READY__ = false
  window.addEventListener('uic:portal-ready', () => {
    window.__UIC_PORTAL_READY__ = true
    try { sessionStorage.removeItem(pathKey) } catch {}
  }, { once: true })

  window.addEventListener('error', () => {
    if (rootIsEmpty()) setTimeout(recoverIfBlank, 250)
  })
  window.addEventListener('unhandledrejection', () => {
    if (rootIsEmpty()) setTimeout(recoverIfBlank, 250)
  })

  setTimeout(() => {
    if (!window.__UIC_PORTAL_READY__ && rootIsEmpty()) recoverIfBlank()
  }, 3500)
})()
