/* Service worker â€” network-first com fallback em cache: o app abre offline
   e atualiza sozinho quando hÃ¡ internet. Bump da versÃ£o a cada deploy. */
const CACHE = "np-demandas-v93";
/* ATENCAO: "dados/mnt28-carga.js" NAO entra aqui de proposito. E o arquivo com
   os dados reais da loja, existe so no computador dela e nao vai para o
   repositorio publico. Se entrasse nesta lista, o cache inteiro falharia no
   site publicado (addAll e tudo-ou-nada) e o app pararia de abrir offline. */
const SHELL = ["./", "./index.html", "./css/app.css", "./css/polimento.css", "./css/aparencia.css", "./css/mnt28.css", "./biblioteca/pecas.css", "./biblioteca/graficos.css", "./biblioteca/relatorio.css", "./js/app.js",
  "./js/docxlite.js", "./js/dg.js", "./js/pdflite.js", "./js/ck.js", "./js/ck-modelo2.js", "./js/ck-qualidade.js", "./js/arquivos.js", "./js/cronometro.js", "./js/pdf-abas.js", "./js/configs.js", "./js/nc.js", "./js/ppr.js", "./js/ind.js", "./js/mnt28.js", "./js/sync.js", "./manifest.json",
  "./catalogo/index.html", "./catalogo/pecas.css",
  "./catalogo/graficos/index.html", "./catalogo/graficos/graficos.css",
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
  /* NUNCA guardar o cofre de acesso: em PC de terceiro ele nÃ£o pode sobrar
     no cache depois que ela sai. Sempre direto da rede. */
  if (e.request.url.includes("cofre.json")) return;
  /* Mesma regra para a pasta dados/: sao as cargas com dados reais das lojas.
     Se ficassem no cache, sobrariam no PC de terceiro depois do "Sair e apagar". */
  if (e.request.url.includes("/dados/")) return;
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
