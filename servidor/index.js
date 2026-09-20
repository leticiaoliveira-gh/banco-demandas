/* =====================================================================
   CENTRAL DE DEMANDAS - o carteiro proprio (Fase 1)

   Hoje o site fala com o GitHub (js/sync.js). A partir daqui ele passa a
   falar com esta API, que mora na conta da Cloudflare dela.

   O QUE ISTO E, EM UMA FRASE: um programa pequeno que recebe "me da o que
   mudou" e "guarda isto aqui", e conversa com tres cofres SQLite.

   PORTABILIDADE (regra fixa): tudo aqui e HTTP comum + SQL comum. Nao ha
   nenhuma esperteza da Cloudflare no meio. Trocar para o computador dela,
   para um servidor barato ou para outro provedor e trocar o "adaptador"
   do fim deste arquivo, nada mais.

   Ligacoes (wrangler.toml):
     env.DB      -> central-demandas   (fichas + configuracoes + acessos)
     env.FOTOS   -> central-fotos      (as imagens, em banco separado)
     env.COPIAS  -> central-copias     (o armario de backup)
     env.ASSETS  -> a pasta do site (index.html, js/, css/, biblioteca/)
     env.CHAVE_MESTRA -> segredo, usado UMA vez para criar o primeiro acesso
   ===================================================================== */

const JSON_H = { "content-type": "application/json; charset=utf-8" };
const AGORA = () => new Date().toISOString();

/* Nada de "*" na origem: o site e servido por este mesmo Worker, entao a
   propria origem basta. Manter fechado e o que impede outro site de ler
   os dados dela com a aba aberta. */
function cors(req, resp) {
  const origem = req.headers.get("Origin");
  const alvo = new URL(req.url).origin;
  if (origem && origem === alvo) {
    resp.headers.set("Access-Control-Allow-Origin", origem);
    resp.headers.set("Access-Control-Allow-Credentials", "true");
  }
  resp.headers.set("Vary", "Origin");
  return resp;
}

function ok(dados, status) {
  return new Response(JSON.stringify(dados), { status: status || 200, headers: JSON_H });
}
function erro(msg, status) {
  return ok({ ok: false, erro: msg }, status || 400);
}

/* ---------------------------------------------------------------------
   QUEM ESTA ENTRANDO
   A chave viaja no cabecalho X-Chave. No banco fica so o SHA-256 dela:
   se o banco vazar, a chave nao vai junto.
   --------------------------------------------------------------------- */
async function sha256(txt) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(txt));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}

async function autenticar(req, env) {
  const chave = (req.headers.get("X-Chave") || "").trim();
  if (!chave) return null;
  const h = await sha256(chave);
  const row = await env.DB.prepare(
    "SELECT id, rotulo FROM acessos WHERE hash = ?1 AND revogado = 0"
  ).bind(h).first();
  if (!row) return null;
  /* carimbo de "usado agora", sem travar a resposta */
  env.DB.prepare("UPDATE acessos SET usado_em = ?1 WHERE id = ?2")
    .bind(AGORA(), row.id).run().catch(() => {});
  return row;
}

/* ---------------------------------------------------------------------
   JUNCAO CAMPO A CAMPO (a licao do r/PWA, item 2 do plano)

   O perigo real: o celular dela fica com uma versao velha do site, manda
   uma ficha SEM um campo que o computador acabou de criar, e o campo
   some do banco sem ninguem perceber.

   Regra: campo que o aparelho NAO mandou e campo que fica como estava.
   So vence quem trouxe valor. E se o que esta no banco for mais novo que
   o que chegou, o banco ganha por inteiro.
   --------------------------------------------------------------------- */
function juntarCampos(guardado, chegando) {
  const saida = { ...(guardado || {}) };
  for (const k of Object.keys(chegando || {})) {
    const v = chegando[k];
    if (v === undefined) continue;
    saida[k] = v;
  }
  return saida;
}

/* ---------------------------------------------------------------------
   ROTAS
   --------------------------------------------------------------------- */

/* GET /api/situacao - o site pergunta "estou em dia?" */
async function rotaSituacao(env) {
  const i = await env.DB.prepare(
    "SELECT COUNT(*) n, MAX(mod) ultimo FROM itens WHERE apagado = 0"
  ).first();
  const m = await env.DB.prepare("SELECT COUNT(*) n, MAX(mod) ultimo FROM meta").first();
  const f = await env.FOTOS.prepare(
    "SELECT COUNT(*) n FROM fotos WHERE apagada_em IS NULL"
  ).first();
  return ok({
    ok: true,
    agora: AGORA(),
    itens: i.n || 0,
    itensUltimo: i.ultimo || "",
    meta: m.n || 0,
    metaUltimo: m.ultimo || "",
    fotos: f.n || 0
  });
}

/* GET /api/itens?desde=ISO&limite=500&cursor=uid
   Paginado de proposito: 1.222 fichas hoje, e o celular dela nao pode
   engasgar tentando baixar tudo de uma vez numa rede ruim. */
const LIMITE_PADRAO = 500;
const LIMITE_MAX = 2000;

async function rotaItensBaixar(url, env) {
  const desde = url.searchParams.get("desde") || "";
  const cursor = url.searchParams.get("cursor") || "";
  let limite = parseInt(url.searchParams.get("limite") || LIMITE_PADRAO, 10);
  if (!Number.isFinite(limite) || limite < 1) limite = LIMITE_PADRAO;
  if (limite > LIMITE_MAX) limite = LIMITE_MAX;

  /* ordem por (mod, uid) para a paginacao nunca pular nem repetir ficha
     quando duas foram salvas no mesmo segundo */
  const r = await env.DB.prepare(
    `SELECT uid, dados, mod, apagado FROM itens
      WHERE mod > ?1 OR (mod = ?1 AND uid > ?2)
      ORDER BY mod, uid LIMIT ?3`
  ).bind(desde, cursor, limite + 1).all();

  const linhas = r.results || [];
  const temMais = linhas.length > limite;
  const pagina = temMais ? linhas.slice(0, limite) : linhas;

  const itens = pagina.map(l => {
    let d = {};
    try { d = JSON.parse(l.dados); } catch (e) { d = {}; }
    d.uid = l.uid;
    d.mod = l.mod;
    if (l.apagado) d.deleted = true;
    return d;
  });

  const ultimo = pagina.length ? pagina[pagina.length - 1] : null;
  return ok({
    ok: true,
    itens,
    temMais,
    proxDesde: ultimo ? ultimo.mod : desde,
    proxCursor: ultimo ? ultimo.uid : cursor
  });
}

/* POST /api/itens  { itens: [...] }  - manda um lote */
async function rotaItensEnviar(req, env) {
  let corpo;
  try { corpo = await req.json(); } catch (e) { return erro("corpo invalido"); }
  const lista = Array.isArray(corpo && corpo.itens) ? corpo.itens : null;
  if (!lista) return erro("faltou a lista de itens");
  if (lista.length > LIMITE_MAX) return erro("lote grande demais");

  const agora = AGORA();
  let gravados = 0, ignorados = 0;
  const comandos = [];

  for (const it of lista) {
    if (!it || !it.uid) { ignorados++; continue; }
    const mod = it.mod || agora;
    const atual = await env.DB.prepare(
      "SELECT dados, mod, apagado FROM itens WHERE uid = ?1"
    ).bind(it.uid).first();

    /* o banco ja tem versao mais nova? entao o que chegou e passado */
    if (atual && (atual.mod || "") > mod) { ignorados++; continue; }

    let guardado = {};
    if (atual) { try { guardado = JSON.parse(atual.dados); } catch (e) { guardado = {}; } }

    const { id, uid, mod: _m, deleted, ...campos } = it;
    const dados = juntarCampos(guardado, campos);
    const apagado = deleted ? 1 : 0;

    comandos.push(env.DB.prepare(
      `INSERT INTO itens (uid, dados, mod, apagado, tipo, empresa, criado)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
       ON CONFLICT(uid) DO UPDATE SET
         dados = ?2, mod = ?3, apagado = ?4, tipo = ?5, empresa = ?6`
    ).bind(
      it.uid,
      JSON.stringify(dados),
      mod,
      apagado,
      dados.tipo || null,
      dados.store || dados.empresa || null,
      (atual && atual.criado) || agora
    ));
    gravados++;
  }

  if (comandos.length) await env.DB.batch(comandos);
  return ok({ ok: true, gravados, ignorados, agora });
}

/* GET /api/meta?desde=ISO  e  POST /api/meta { meta: {k: {v, mod}} } */
async function rotaMetaBaixar(url, env) {
  const desde = url.searchParams.get("desde") || "";
  const r = await env.DB.prepare(
    "SELECT k, v, mod FROM meta WHERE mod > ?1 ORDER BY mod"
  ).bind(desde).all();
  const meta = {};
  for (const l of r.results || []) {
    let v = null;
    try { v = JSON.parse(l.v); } catch (e) { v = l.v; }
    meta[l.k] = { v, mod: l.mod };
  }
  return ok({ ok: true, meta });
}

async function rotaMetaEnviar(req, env) {
  let corpo;
  try { corpo = await req.json(); } catch (e) { return erro("corpo invalido"); }
  const pacote = corpo && corpo.meta;
  if (!pacote || typeof pacote !== "object") return erro("faltou meta");

  const agora = AGORA();
  const comandos = [];
  let gravados = 0, ignorados = 0;

  for (const k of Object.keys(pacote)) {
    const item = pacote[k];
    if (!item || typeof item !== "object") { ignorados++; continue; }
    const mod = item.mod || agora;
    const atual = await env.DB.prepare("SELECT mod FROM meta WHERE k = ?1").bind(k).first();
    if (atual && (atual.mod || "") >= mod) { ignorados++; continue; }
    comandos.push(env.DB.prepare(
      `INSERT INTO meta (k, v, mod) VALUES (?1, ?2, ?3)
       ON CONFLICT(k) DO UPDATE SET v = ?2, mod = ?3`
    ).bind(k, JSON.stringify(item.v === undefined ? null : item.v), mod));
    gravados++;
  }

  if (comandos.length) await env.DB.batch(comandos);
  return ok({ ok: true, gravados, ignorados, agora });
}

/* ---- FOTOS ---------------------------------------------------------
   A ficha guarda so a referencia "foto:<id>". A imagem vem daqui, sob
   demanda, e o aparelho guarda a sua copia. Foto nunca e sobrescrita e
   apagar so manda para a lixeira (90 dias).
   REGRA DELA: imagem inteira, nunca cortada nem encolhida para caber. */
async function rotaFotoBaixar(id, env) {
  const r = await env.FOTOS.prepare(
    "SELECT imagem, mime FROM fotos WHERE id = ?1 AND apagada_em IS NULL"
  ).bind(id).first();
  if (!r) return erro("foto nao encontrada", 404);
  /* O cofre devolve a imagem como lista de numeros. Sem esta conversao a
     resposta sai vazia e a foto some da tela. */
  const bruto = r.imagem;
  const corpo = bruto instanceof ArrayBuffer ? new Uint8Array(bruto)
              : ArrayBuffer.isView(bruto)    ? new Uint8Array(bruto.buffer, bruto.byteOffset, bruto.byteLength)
              : Array.isArray(bruto)         ? new Uint8Array(bruto)
              : bruto;
  return new Response(corpo, {
    headers: {
      "content-type": r.mime || "image/jpeg",
      /* imutavel: a foto de um id nunca muda, entao o aparelho pode guardar para sempre */
      "cache-control": "public, max-age=31536000, immutable"
    }
  });
}

async function rotaFotoEnviar(req, env) {
  const id = (new URL(req.url)).searchParams.get("id");
  if (!id) return erro("faltou o id da foto");
  const ja = await env.FOTOS.prepare("SELECT id FROM fotos WHERE id = ?1").bind(id).first();
  if (ja) return ok({ ok: true, id, novo: false });   /* nunca sobrescreve */

  const bytes = new Uint8Array(await req.arrayBuffer());
  if (!bytes.length) return erro("foto vazia");
  const mime = req.headers.get("content-type") || "image/jpeg";
  await env.FOTOS.prepare(
    "INSERT INTO fotos (id, imagem, mime, tamanho, criado) VALUES (?1, ?2, ?3, ?4, ?5)"
  ).bind(id, bytes, mime, bytes.length, AGORA()).run();
  return ok({ ok: true, id, novo: true, tamanho: bytes.length });
}

async function rotaFotoApagar(id, env) {
  await env.FOTOS.prepare(
    "UPDATE fotos SET apagada_em = ?1 WHERE id = ?2 AND apagada_em IS NULL"
  ).bind(AGORA(), id).run();
  return ok({ ok: true, id, lixeira: true });
}

/* ---- PRIMEIRO ACESSO ------------------------------------------------
   Roda UMA vez, com o segredo CHAVE_MESTRA, para criar a primeira chave.
   Depois disso a propria tela do site cria as outras (digital, senha,
   pareamento) e este caminho para de aceitar qualquer coisa. */
async function rotaAcessoCriar(req, env) {
  let corpo;
  try { corpo = await req.json(); } catch (e) { return erro("corpo invalido"); }
  const mestra = (req.headers.get("X-Mestra") || "").trim();
  if (!env.CHAVE_MESTRA || mestra !== env.CHAVE_MESTRA) return erro("nao autorizado", 401);
  const chave = (corpo && corpo.chave || "").trim();
  if (chave.length < 32) return erro("chave curta demais");
  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO acessos (id, hash, tipo, rotulo, criado) VALUES (?1, ?2, ?3, ?4, ?5)"
  ).bind(id, await sha256(chave), corpo.tipo || "chave", corpo.rotulo || null, AGORA()).run();
  return ok({ ok: true, id });
}

/* ---------------------------------------------------------------------
   PORTA DE ENTRADA
   --------------------------------------------------------------------- */
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cam = url.pathname;

    if (req.method === "OPTIONS") {
      const r = new Response(null, { status: 204 });
      r.headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
      r.headers.set("Access-Control-Allow-Headers", "content-type, X-Chave, X-Mestra");
      return cors(req, r);
    }

    /* A pasta dados/ nunca vai para o ar (dados reais dela). O index.html
       ainda chama dados/mnt28-carga.js, que so existe no computador dela.
       Aqui esse caminho devolve um arquivo vazio: o site funciona igual e
       o console nao mostra erro vermelho. */
    if (cam.startsWith("/dados/") && cam.endsWith(".js"))
      return new Response("/* sem carga local no site publicado */", {
        headers: { "content-type": "application/javascript; charset=utf-8" } });

    /* tudo que nao comeca com /api/ e o site em si */
    if (!cam.startsWith("/api/")) return env.ASSETS.fetch(req);

    try {
      /* a unica rota que nao exige chave: criar a primeira (exige o segredo) */
      if (cam === "/api/acesso" && req.method === "POST")
        return cors(req, await rotaAcessoCriar(req, env));

      /* "estou vivo?" - nao devolve dado nenhum, so serve para o selo de conexao */
      if (cam === "/api/ping") return cors(req, ok({ ok: true, agora: AGORA() }));

      const quem = await autenticar(req, env);
      if (!quem) return cors(req, erro("nao autorizado", 401));

      if (cam === "/api/situacao" && req.method === "GET")
        return cors(req, await rotaSituacao(env));
      if (cam === "/api/itens" && req.method === "GET")
        return cors(req, await rotaItensBaixar(url, env));
      if (cam === "/api/itens" && req.method === "POST")
        return cors(req, await rotaItensEnviar(req, env));
      if (cam === "/api/meta" && req.method === "GET")
        return cors(req, await rotaMetaBaixar(url, env));
      if (cam === "/api/meta" && req.method === "POST")
        return cors(req, await rotaMetaEnviar(req, env));

      if (cam.startsWith("/api/foto/")) {
        const id = decodeURIComponent(cam.slice("/api/foto/".length));
        if (req.method === "GET") return cors(req, await rotaFotoBaixar(id, env));
        if (req.method === "DELETE") return cors(req, await rotaFotoApagar(id, env));
      }
      if (cam === "/api/foto" && req.method === "POST")
        return cors(req, await rotaFotoEnviar(req, env));

      return cors(req, erro("caminho desconhecido", 404));
    } catch (e) {
      return cors(req, erro("falha no servidor: " + (e && e.message || e), 500));
    }
  }
};
