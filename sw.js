/* Service worker — network-first com fallback em cache: o app abre offline
   e atualiza sozinho quando há internet. Bump da versão a cada deploy. */
const CACHE = "np-demandas-v68";
const SHELL = ["./", "./index.html", "./css/app.css", "./js/app.js",
  "./js/docxlite.js", "./js/dg.js", "./js/pdflite.js", "./js/ck.js", "./js/ck-modelo2.js", "./js/ck-qualidade.js", "./js/arquivos.js", "./js/cronometro.js", "./js/pdf-abas.js", "./js/configs.js", "./js/nc.js", "./js/sync.js", "./manifest.json",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request).then(r => {
      const clone = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return r;
    }).catch(() =>
      caches.match(e.request, { ignoreSearch: true })
        .then(m => m || caches.match("./index.html")))
  );
});
