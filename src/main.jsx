import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => registrations.forEach(registration => registration.unregister())).catch(() => {})
  if ('caches' in window) caches.keys().then(keys => keys.forEach(key => caches.delete(key))).catch(() => {})
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)
