const CACHE_NAME = 'ybook-v1'
const SHELL_URLS = ['/']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)

  if (url.pathname === '/feed.json' || url.pathname.endsWith('feed.json')) {
    e.respondWith(
      fetch(e.request)
        .then((resp) => {
          const clone = resp.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone))
          return resp
        })
        .catch(() => caches.match(e.request))
    )
    return
  }

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached
      return fetch(e.request).then((resp) => {
        if (resp.ok && e.request.method === 'GET') {
          const clone = resp.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone))
        }
        return resp
      })
    })
  )
})
