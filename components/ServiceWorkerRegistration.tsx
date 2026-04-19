'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator && typeof window !== 'undefined') {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js').then(
          function(registration) {
            console.log('✅ Service Worker registered:', registration)
          },
          function(error) {
            console.log('❌ Service Worker registration failed:', error)
          }
        )
      })
    }
  }, [])

  return null
}
