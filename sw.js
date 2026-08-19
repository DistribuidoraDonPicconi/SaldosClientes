// Service Worker mínimo: solo lo necesario para que la app sea
// instalable como PWA. No cachea datos (siempre pide a Firestore
// online), así el saldo de los clientes nunca queda desactualizado.
const CACHE_NAME = 'saldos-dp-v2';
const ARCHIVOS_CACHE = ['./index.html', './manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARCHIVOS_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(nombres.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Network-first, y SOLO para pedidos GET al mismo origen (el shell de
// la app: index.html, manifest, íconos). Todo lo que va a otro origen
// -- el login de Google, Firebase Auth, Firestore, las fuentes/CDN --
// se deja pasar de largo sin tocar. Interceptar esos pedidos podría
// cachear datos o credenciales donde no corresponde, y en el caso de
// Firestore podría interponerse en cómo el SDK maneja sus propios
// reintentos y conexiones.
self.addEventListener('fetch', (event) => {
  if(event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if(url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((resp) => {
        const copia = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
        return resp;
      })
      .catch(() => caches.match(event.request))
  );
});
