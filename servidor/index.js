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

/* "no-store" = ninguem no caminho (navegador, celular, rede da Cloudflare)
   pode guardar esta resposta e devolver depois. Sem isto, ela abre o site e
   ve a lista de ontem achando que e a de hoje. Vale para TODA resposta de
   dados; a foto e o unico caso contrario (ver rotaFotoBaixar), porque o id
   da foto e o proprio conteudo e nunca muda. */
const JSON_H = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, no-cache, must-revalidate",
  "pragma": "no-cache"
};
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
    `SELECT a.id, a.rotulo, a.usuario_id, s.id sessao_id, s.expira_em, s.encerrada
       FROM acessos a LEFT JOIN sessoes s ON s.acesso_id = a.id
      WHERE a.hash = ?1 AND a.revogado = 0`
  ).bind(h).first();
  if (!row) return null;
  /* sessao com prazo (aparelho emprestado): vencido ou desconectado, fora */
  if (row.sessao_id) {
    if (row.encerrada) return null;
    if (row.expira_em && row.expira_em < AGORA()) return null;
    env.DB.prepare("UPDATE sessoes SET visto_em = ?1 WHERE id = ?2")
      .bind(AGORA(), row.sessao_id).run().catch(() => {});
  }
  /* carimbo de "usado agora", sem travar a resposta */
  env.DB.prepare("UPDATE acessos SET usado_em = ?1 WHERE id = ?2")
    .bind(AGORA(), row.id).run().catch(() => {});
  return row;
}

/* =====================================================================
   ENTRADA COM E-MAIL E SENHA (Parte 3, 20/09/2026)

   EM UMA FRASE: ela digita e-mail e senha; se marcar "manter conectado"
   entra na hora (aparelho dela); se nao marcar, o pedido fica esperando
   o celular dela aprovar - e o celular so aprova depois de conferir que
   o codigo mostrado no computador e o mesmo que apareceu nele.

   A "chave" que sai daqui e a MESMA coisa que a tela de Sincronizacao ja
   usa (nuvem_chave/X-Chave). Login vira so um jeito mais facil de
   conseguir essa chave: acaba a chave de pendrive e a senha do cofre
   antigo, sem trocar nada por baixo.
   ===================================================================== */

const ITERACOES_SENHA = 100000;   /* teto que a Cloudflare permite para PBKDF2 */

function bytesParaHex(b) { return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join(""); }
function hexParaBytes(h) { const a = new Uint8Array(h.length / 2); for (let i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16); return a; }

async function hashSenha(senha, saltHex) {
  const salt = saltHex ? hexParaBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const chaveBase = await crypto.subtle.importKey("raw", new TextEncoder().encode(senha), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERACOES_SENHA }, chaveBase, 256);
  return { hash: bytesParaHex(bits), sal: bytesParaHex(salt) };
}

function tokenAleatorio(bytes) {
  return bytesParaHex(crypto.getRandomValues(new Uint8Array(bytes || 32)));
}

function codigoDeSeisNumeros() {
  return String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
}

/* fim do dia dela (America/Sao_Paulo, sem horario de verao desde 2019) */
function fimDoDiaISO() {
  const agora = new Date(Date.now() - 3 * 3600e3);   /* joga para o "relogio dela" */
  const fim = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate(), 23, 59, 59));
  return new Date(fim.getTime() + 3 * 3600e3).toISOString();   /* volta para UTC de verdade */
}

/* cria a sessao (acesso + sessao juntos) e devolve a chave em texto puro,
   que so existe aqui - dai pra frente o banco so guarda o hash dela */
async function criarSessaoLogin(env, usuarioId, tipo, aparelho, prazoMin) {
  const chave = tokenAleatorio(32);
  const acessoId = crypto.randomUUID();
  const sessaoId = crypto.randomUUID();
  const agora = AGORA();
  let expira = fimDoDiaISO();
  if (prazoMin) {
    const porPrazo = new Date(Date.now() + prazoMin * 60000).toISOString();
    if (porPrazo < expira) expira = porPrazo;
  } else if (tipo === "confiavel") {
    expira = new Date(Date.now() + 5 * 365 * 864e5).toISOString();   /* "para sempre", na pratica */
  }
  await env.DB.prepare(
    "INSERT INTO acessos (id, hash, tipo, rotulo, criado, usuario_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
  ).bind(acessoId, await sha256(chave), tipo, aparelho || null, agora, usuarioId).run();
  await env.DB.prepare(
    "INSERT INTO sessoes (id, acesso_id, aparelho, criado, visto_em, expira_em) VALUES (?1, ?2, ?3, ?4, ?4, ?5)"
  ).bind(sessaoId, acessoId, aparelho || null, agora, expira).run();
  return { chave, acessoId, sessaoId, expira };
}

function nomeDoAparelho(req) {
  const ua = req.headers.get("User-Agent") || "";
  if (/Windows/.test(ua)) return "Computador (Windows)";
  if (/Mac OS/.test(ua)) return "Computador (Mac)";
  if (/Android/.test(ua)) return "Celular (Android)";
  if (/iPhone|iPad/.test(ua)) return "Celular (iPhone)";
  return "Aparelho";
}

/* POST /api/login  { email, senha, manterConectado } */
async function rotaLogin(req, env) {
  let corpo;
  try { corpo = await req.json(); } catch (e) { return erro("corpo invalido"); }
  const email = String((corpo && corpo.email) || "").trim().toLowerCase();
  const senha = String((corpo && corpo.senha) || "");
  if (!email || !senha) return erro("faltou e-mail ou senha");

  const usuario = await env.DB.prepare("SELECT id, hash_senha, sal FROM usuarios WHERE email = ?1").bind(email).first();
  if (!usuario) return erro("e-mail ou senha errados", 401);
  /* conta sem senha definida: a tela pede para ela criar a dela agora */
  if (!usuario.hash_senha || !usuario.sal) return ok({ ok: true, precisaDefinir: true });
  const conf = await hashSenha(senha, usuario.sal);
  if (conf.hash !== usuario.hash_senha) return erro("e-mail ou senha errados", 401);

  const aparelho = nomeDoAparelho(req);
  const ip = req.headers.get("CF-Connecting-IP") || "";
  const local = req.headers.get("CF-IPCity") || req.headers.get("CF-IPCountry") || "";

  if (corpo.manterConectado) {
    const s = await criarSessaoLogin(env, usuario.id, "confiavel", aparelho, null);
    return ok({ ok: true, entrou: true, chave: s.chave });
  }

  /* nao marcou "manter conectado": fica esperando o celular aprovar */
  const id = crypto.randomUUID();
  const codigo = codigoDeSeisNumeros();
  const agora = AGORA();
  const expira = new Date(Date.now() + 2 * 60000).toISOString();
  await env.DB.prepare(
    `INSERT INTO aprovacoes (id, usuario_id, codigo, aparelho, ip, prazo_min, situacao, criado, expira_em)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'esperando', ?7, ?8)`
  ).bind(id, usuario.id, codigo, aparelho + (local ? " - " + local : ""), ip, 60, agora, expira).run();

  return ok({ ok: true, entrou: false, aprovacaoId: id, codigo });
}

/* POST /api/definir-senha { email, senha } - primeira vez, ou depois de a
   senha ter sido zerada. So funciona enquanto a conta esta SEM senha, por isso
   nao precisa de chave: quem nao tem senha nao tem como provar quem e. Assim a
   senha e escolhida por ela na tela, sem passar por linha de comando (foi ali
   que a primeira se deformou, em 20/09). */
async function rotaDefinirSenha(req, env) {
  let corpo;
  try { corpo = await req.json(); } catch (e) { return erro("corpo invalido"); }
  const email = String((corpo && corpo.email) || "").trim().toLowerCase();
  const senha = String((corpo && corpo.senha) || "");
  if (!email || senha.length < 8) return erro("e-mail vazio ou senha com menos de 8 caracteres");

  const usuario = await env.DB.prepare("SELECT id, hash_senha FROM usuarios WHERE email = ?1").bind(email).first();
  if (!usuario) return erro("e-mail nao encontrado", 404);
  if (usuario.hash_senha) return erro("esta conta ja tem senha", 409);

  const h = await hashSenha(senha);
  await env.DB.prepare("UPDATE usuarios SET hash_senha = ?1, sal = ?2 WHERE id = ?3")
    .bind(h.hash, h.sal, usuario.id).run();

  const s = await criarSessaoLogin(env, usuario.id, "confiavel", nomeDoAparelho(req), null);
  return ok({ ok: true, entrou: true, chave: s.chave });
}

/* POST /api/trocar-senha { senhaAtual, senhaNova } - estando logada */
async function rotaTrocarSenha(req, quem, env) {
  let corpo;
  try { corpo = await req.json(); } catch (e) { return erro("corpo invalido"); }
  const nova = String((corpo && corpo.senhaNova) || "");
  if (nova.length < 8) return erro("a senha nova precisa de pelo menos 8 caracteres");

  const usuario = await env.DB.prepare("SELECT hash_senha, sal FROM usuarios WHERE id = ?1").bind(quem.usuario_id).first();
  if (!usuario) return erro("nao encontrado", 404);
  const conf = await hashSenha(String((corpo && corpo.senhaAtual) || ""), usuario.sal);
  if (conf.hash !== usuario.hash_senha) return erro("senha atual errada", 401);

  const h = await hashSenha(nova);
  await env.DB.prepare("UPDATE usuarios SET hash_senha = ?1, sal = ?2 WHERE id = ?3")
    .bind(h.hash, h.sal, quem.usuario_id).run();
  return ok({ ok: true });
}

/* GET /api/aprovacoes/<id> - o computador emprestado fica perguntando isto
   ate a situacao mudar. Sem chave nenhuma: ele ainda nao tem uma. */
async function rotaAprovacaoConsultar(id, env) {
  const a = await env.DB.prepare("SELECT * FROM aprovacoes WHERE id = ?1").bind(id).first();
  if (!a) return erro("pedido nao encontrado", 404);
  if (a.situacao === "esperando" && a.expira_em < AGORA()) {
    await env.DB.prepare("UPDATE aprovacoes SET situacao = 'expirada' WHERE id = ?1").bind(id).run();
    return ok({ ok: true, situacao: "expirada" });
  }
  if (a.situacao === "aprovada" && !a.entregue) {
    /* a chave so sai do servidor esta unica vez; depois disso some do banco */
    await env.DB.prepare("UPDATE aprovacoes SET entregue = 1, chave_temp = NULL WHERE id = ?1").bind(id).run();
    return ok({ ok: true, situacao: "aprovada", chave: a.chave_temp || null });
  }
  return ok({ ok: true, situacao: a.situacao });
}

/* GET /api/aprovacoes - a tela do celular: pedidos esperando dela */
async function rotaAprovacoesListar(quem, env) {
  const r = await env.DB.prepare(
    `SELECT id, codigo, aparelho, ip, criado, expira_em FROM aprovacoes
      WHERE usuario_id = ?1 AND situacao = 'esperando' AND expira_em > ?2
      ORDER BY criado DESC`
  ).bind(quem.usuario_id, AGORA()).all();
  return ok({ ok: true, pedidos: r.results || [] });
}

/* POST /api/aprovacoes/<id>/decidir  { aprovar, codigoConfirmado, prazoMin }
   Chamado pelo CELULAR, ja logado. Confere o codigo antes de aprovar - e
   isso que impede aprovar um pedido que nao e o dela. */
async function rotaAprovacaoDecidir(id, req, quem, env) {
  let corpo;
  try { corpo = await req.json(); } catch (e) { return erro("corpo invalido"); }
  const a = await env.DB.prepare("SELECT * FROM aprovacoes WHERE id = ?1 AND usuario_id = ?2").bind(id, quem.usuario_id).first();
  if (!a) return erro("pedido nao encontrado", 404);
  if (a.situacao !== "esperando") return erro("este pedido ja foi respondido");
  if (a.expira_em < AGORA()) { await env.DB.prepare("UPDATE aprovacoes SET situacao='expirada' WHERE id=?1").bind(id).run(); return erro("o pedido venceu, peca para tentar de novo"); }

  if (!corpo.aprovar) {
    await env.DB.prepare("UPDATE aprovacoes SET situacao = 'negada' WHERE id = ?1").bind(id).run();
    return ok({ ok: true, situacao: "negada" });
  }
  if (String(corpo.codigoConfirmado || "") !== a.codigo) return erro("o codigo nao bateu");

  const prazoMin = [60, 240, null].includes(corpo.prazoMin) ? corpo.prazoMin : 60;
  const s = await criarSessaoLogin(env, quem.usuario_id, "temporario", a.aparelho, prazoMin);
  /* guarda a chave so ate o computador que pediu vir buscar (rotaAprovacaoConsultar);
     dura segundos (o computador fica perguntando sem parar) e some assim que
     e entregue - nunca fica junto do resto dos dados dela. */
  await env.DB.prepare(
    "UPDATE aprovacoes SET situacao = 'aprovada', acesso_id = ?1, chave_temp = ?2 WHERE id = ?3"
  ).bind(s.acessoId, s.chave, id).run();
  return ok({ ok: true, situacao: "aprovada" });
}

/* GET /api/dispositivos - "Computadores conectados" */
async function rotaDispositivosListar(quem, env) {
  const r = await env.DB.prepare(
    `SELECT s.id, a.tipo, a.rotulo, s.aparelho, s.criado, s.visto_em, s.expira_em
       FROM sessoes s JOIN acessos a ON a.id = s.acesso_id
      WHERE a.usuario_id = ?1 AND s.encerrada = 0 AND a.revogado = 0 AND s.expira_em > ?2
      ORDER BY s.visto_em DESC`
  ).bind(quem.usuario_id, AGORA()).all();
  return ok({ ok: true, dispositivos: r.results || [], estaSessao: quem.sessao_id });
}

/* POST /api/dispositivos/<sessaoId>/desconectar */
async function rotaDispositivoDesconectar(sessaoId, quem, env) {
  const s = await env.DB.prepare(
    `SELECT s.id, a.usuario_id FROM sessoes s JOIN acessos a ON a.id = s.acesso_id WHERE s.id = ?1`
  ).bind(sessaoId).first();
  if (!s || s.usuario_id !== quem.usuario_id) return erro("nao encontrado", 404);
  await env.DB.prepare("UPDATE sessoes SET encerrada = 1 WHERE id = ?1").bind(sessaoId).run();
  return ok({ ok: true, desconectado: sessaoId });
}

/* POST /api/verificar-senha - so confere, nao cria nada. Usado para
   destravar a tela depois dos 20 minutos parada. */
async function rotaVerificarSenha(req, quem, env) {
  let corpo;
  try { corpo = await req.json(); } catch (e) { return erro("corpo invalido"); }
  const usuario = await env.DB.prepare("SELECT hash_senha, sal FROM usuarios WHERE id = ?1").bind(quem.usuario_id).first();
  if (!usuario) return erro("nao encontrado", 404);
  const conf = await hashSenha(String(corpo.senha || ""), usuario.sal);
  if (conf.hash !== usuario.hash_senha) return erro("senha errada", 401);
  return ok({ ok: true });
}

/* POST /api/emergencia/gerar - os 10 codigos novos. Os antigos somem: nunca
   dois lotes validos ao mesmo tempo, senao ela nao saberia qual PDF vale. */
async function rotaEmergenciaGerar(quem, env) {
  await env.DB.prepare("DELETE FROM codigos_emergencia WHERE usuario_id = ?1").bind(quem.usuario_id).run();
  const codigos = [];
  const comandos = [];
  for (let i = 0; i < 10; i++) {
    const cod = tokenAleatorio(5).toUpperCase().match(/.{1,4}/g).join("-");   /* ex: A1B2-C3D4-E5 */
    codigos.push(cod);
    comandos.push(env.DB.prepare(
      "INSERT INTO codigos_emergencia (id, usuario_id, hash, criado) VALUES (?1, ?2, ?3, ?4)"
    ).bind(crypto.randomUUID(), quem.usuario_id, await sha256(cod), AGORA()));
  }
  await env.DB.batch(comandos);
  return ok({ ok: true, codigos });
}

/* POST /api/emergencia/usar { email, codigo } - sem estar logada, para
   quando perdeu o celular. Cada codigo funciona uma vez so. */
async function rotaEmergenciaUsar(req, env) {
  let corpo;
  try { corpo = await req.json(); } catch (e) { return erro("corpo invalido"); }
  const email = String((corpo && corpo.email) || "").trim().toLowerCase();
  const codigo = String((corpo && corpo.codigo) || "").trim().toUpperCase();
  const usuario = await env.DB.prepare("SELECT id FROM usuarios WHERE email = ?1").bind(email).first();
  if (!usuario) return erro("e-mail ou codigo errados", 401);
  const h = await sha256(codigo);
  const linha = await env.DB.prepare(
    "SELECT id FROM codigos_emergencia WHERE usuario_id = ?1 AND hash = ?2 AND usado_em IS NULL"
  ).bind(usuario.id, h).first();
  if (!linha) return erro("codigo invalido ou ja usado", 401);
  await env.DB.prepare("UPDATE codigos_emergencia SET usado_em = ?1 WHERE id = ?2").bind(AGORA(), linha.id).run();
  const s = await criarSessaoLogin(env, usuario.id, "confiavel", "Entrada por codigo de emergencia", null);
  const restantes = await env.DB.prepare(
    "SELECT COUNT(*) n FROM codigos_emergencia WHERE usuario_id = ?1 AND usado_em IS NULL"
  ).bind(usuario.id).first();
  return ok({ ok: true, chave: s.chave, codigosRestantes: (restantes && restantes.n) || 0 });
}

/* POST /api/primeiro-usuario  { email, senha } - roda uma vez, com o
   segredo CHAVE_MESTRA, igual a rotaAcessoCriar. Cria a conta dela. */
async function rotaPrimeiroUsuario(req, env) {
  let corpo;
  try { corpo = await req.json(); } catch (e) { return erro("corpo invalido"); }
  const mestra = (req.headers.get("X-Mestra") || "").trim();
  if (!env.CHAVE_MESTRA || mestra !== env.CHAVE_MESTRA) return erro("nao autorizado", 401);
  const email = String((corpo && corpo.email) || "").trim().toLowerCase();
  const senha = String((corpo && corpo.senha) || "");
  if (!email || senha.length < 8) return erro("e-mail vazio ou senha curta demais");
  const h = await hashSenha(senha);
  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO usuarios (id, email, hash_senha, sal, criado) VALUES (?1, ?2, ?3, ?4, ?5)"
  ).bind(id, email, h.hash, h.sal, AGORA()).run();
  return ok({ ok: true, id });
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

/* =====================================================================
   COPIAS DE SEGURANCA (Parte 2, item 4 - 20/09/2026)

   A ideia em uma frase: toda madrugada o cofre tira uma fotografia inteira
   de tudo e guarda num armario separado (central-copias). Todo domingo ele
   ABRE uma dessas fotografias e confere de verdade - porque copia que nunca
   foi aberta nao e copia, e esperanca.

   Por que num banco separado: problema no cofre principal nao leva as
   copias junto.

   NADA SOME DA LISTA DELA. Passados os 30 dias, a copia diaria perde o
   conteudo pesado para o armario nao estourar, mas a LINHA continua na
   lista com a data, os numeros e o motivo escrito. A primeira copia de
   cada mes vira "mensal" e fica inteira por 12 meses.
   ===================================================================== */

const COPIA_LOTE = 200;

function idCopia() {
  return AGORA().replace(/[-:.TZ]/g, "").slice(0, 14) + "-" + crypto.randomUUID().slice(0, 8);
}

/* tira a fotografia inteira: fichas + configuracoes */
async function copiaFazer(env, tipo, nota) {
  const id = idCopia();
  const agora = AGORA();

  const itens = (await env.DB.prepare("SELECT uid, dados, mod, apagado FROM itens").all()).results || [];
  const meta = (await env.DB.prepare("SELECT k, v, mod FROM meta").all()).results || [];
  let nFotos = 0;
  try {
    const f = await env.FOTOS.prepare("SELECT COUNT(*) n FROM fotos").first();
    nFotos = (f && f.n) || 0;
  } catch (e) { nFotos = 0; }

  await env.COPIAS.prepare(
    "INSERT INTO copias (id, data, tipo, n_itens, n_meta, n_fotos, testada, nota) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7)"
  ).bind(id, agora, tipo || "diaria", itens.length, meta.length, nFotos, nota || null).run();

  for (let i = 0; i < itens.length; i += COPIA_LOTE) {
    await env.COPIAS.batch(itens.slice(i, i + COPIA_LOTE).map(l => env.COPIAS.prepare(
      "INSERT OR REPLACE INTO copias_itens (copia_id, uid, dados, mod, apagado) VALUES (?1, ?2, ?3, ?4, ?5)"
    ).bind(id, l.uid, l.dados, l.mod, l.apagado || 0)));
  }
  for (let i = 0; i < meta.length; i += COPIA_LOTE) {
    await env.COPIAS.batch(meta.slice(i, i + COPIA_LOTE).map(l => env.COPIAS.prepare(
      "INSERT OR REPLACE INTO copias_meta (copia_id, k, v, mod) VALUES (?1, ?2, ?3, ?4)"
    ).bind(id, l.k, l.v, l.mod)));
  }
  return { id: id, data: agora, tipo: tipo || "diaria", n_itens: itens.length, n_meta: meta.length, n_fotos: nFotos };
}

/* O TESTE - abre a copia e confere ficha por ficha. Nao e "o arquivo
   existe?": e ler cada ficha de volta, ver se o texto ainda faz sentido e
   conferir se as fotos citadas estao mesmo no cofre de fotos. */
async function copiaTestar(env, id) {
  const cab = await env.COPIAS.prepare("SELECT * FROM copias WHERE id = ?1").bind(id).first();
  if (!cab) return { ok: false, erro: "copia nao encontrada" };

  const linhas = (await env.COPIAS.prepare("SELECT uid, dados FROM copias_itens WHERE copia_id = ?1").bind(id).all()).results || [];
  const metas = (await env.COPIAS.prepare("SELECT k, v FROM copias_meta WHERE copia_id = ?1").bind(id).all()).results || [];

  const falhas = [];
  if (linhas.length !== cab.n_itens) falhas.push("faltam fichas: guardei " + cab.n_itens + ", li " + linhas.length);
  if (metas.length !== cab.n_meta) falhas.push("faltam configuracoes: guardei " + cab.n_meta + ", li " + metas.length);

  const refsFoto = [];
  for (const l of linhas) {
    let d = null;
    try { d = JSON.parse(l.dados); } catch (e) { d = null; }
    if (!d || typeof d !== "object") { falhas.push("ficha ilegivel: " + l.uid); continue; }
    if (Array.isArray(d.fotos)) for (const f of d.fotos)
      if (typeof f === "string" && f.indexOf("foto:") === 0) refsFoto.push(f.slice(5));
  }
  for (const m of metas) { try { JSON.parse(m.v); } catch (e) { falhas.push("configuracao ilegivel: " + m.k); } }

  /* abre algumas fotos de verdade (ate 12, espalhadas pela lista) */
  let fotosOk = 0, fotosVistas = 0;
  if (refsFoto.length) {
    const passo = Math.max(1, Math.floor(refsFoto.length / 12));
    for (let i = 0; i < refsFoto.length && fotosVistas < 12; i += passo) {
      fotosVistas++;
      let r = null;
      try { r = await env.FOTOS.prepare("SELECT LENGTH(bytes) tam FROM fotos WHERE id = ?1").bind(refsFoto[i]).first(); } catch (e) { r = null; }
      if (r && r.tam > 0) fotosOk++; else falhas.push("foto nao abriu: " + refsFoto[i]);
    }
  }

  const passou = falhas.length === 0;
  const nota = passou
    ? ("Testada em " + AGORA() + ": " + linhas.length + " fichas, " + metas.length + " configuracoes e " + fotosOk + " de " + fotosVistas + " fotos abertas. Tudo certo.")
    : ("Teste FALHOU em " + AGORA() + ": " + falhas.slice(0, 5).join(" | "));

  await env.COPIAS.prepare("UPDATE copias SET testada = ?1, nota = ?2 WHERE id = ?3").bind(passou ? 1 : 0, nota, id).run();
  return { ok: passou, id: id, nota: nota, falhas: falhas.slice(0, 20) };
}

/* A ARRUMACAO DO ARMARIO - a linha NUNCA some, so o conteudo pesado. */
async function copiaArrumarArmario(env) {
  const agora = Date.now();
  const corte30 = new Date(agora - 30 * 864e5).toISOString();
  const corte12m = new Date(agora - 366 * 864e5).toISOString();
  let liberadas = 0, promovidas = 0;

  const velhas = (await env.COPIAS.prepare(
    "SELECT id, data, tipo, nota FROM copias WHERE data < ?1 ORDER BY data"
  ).bind(corte30).all()).results || [];

  const mesJaTem = new Set(((await env.COPIAS.prepare(
    "SELECT DISTINCT substr(data,1,7) m FROM copias WHERE tipo = 'mensal'"
  ).all()).results || []).map(r => r.m));

  for (const c of velhas) {
    const mes = String(c.data).slice(0, 7);
    if (c.tipo === "diaria" && !mesJaTem.has(mes)) {
      await env.COPIAS.prepare("UPDATE copias SET tipo = 'mensal' WHERE id = ?1").bind(c.id).run();
      mesJaTem.add(mes); promovidas++; continue;
    }
    if (c.tipo === "mensal" && c.data >= corte12m) continue;
    if (String(c.nota || "").indexOf("Conteudo liberado") === 0) continue;

    await env.COPIAS.prepare("DELETE FROM copias_itens WHERE copia_id = ?1").bind(c.id).run();
    await env.COPIAS.prepare("DELETE FROM copias_meta WHERE copia_id = ?1").bind(c.id).run();
    await env.COPIAS.prepare("UPDATE copias SET nota = ?1 WHERE id = ?2").bind(
      "Conteudo liberado em " + AGORA() + " para o armario nao estourar. A linha fica aqui de proposito: nada some da sua lista.", c.id).run();
    liberadas++;
  }
  return { liberadas: liberadas, promovidas: promovidas };
}

/* GET /api/copias - a lista que a tela dela mostra */
async function rotaCopiasListar(env) {
  const r = await env.COPIAS.prepare(
    "SELECT id, data, tipo, n_itens, n_meta, n_fotos, testada, nota FROM copias ORDER BY data DESC LIMIT 400"
  ).all();
  const lista = r.results || [];
  const ultima = lista.length ? lista[0].data : "";
  const horas = ultima ? (Date.now() - new Date(ultima).getTime()) / 3600e3 : null;
  const testada = lista.find(c => c.testada);
  return ok({
    ok: true,
    copias: lista,
    ultima: ultima,
    atrasada: horas === null || horas > 26,   /* e isto que acende a faixa vermelha */
    ultimaTestada: (testada && testada.data) || ""
  });
}

/* POST /api/copias - o botao "Fazer agora" */
async function rotaCopiaAgora(env) {
  const r = await copiaFazer(env, "manual", "Feita por voce, no botao Fazer agora.");
  const t = await copiaTestar(env, r.id);
  return ok({ ok: true, copia: r, teste: t });
}

/* GET /api/copias/<id> - baixar inteira, no mesmo formato que o site importa */
async function rotaCopiaBaixar(id, env) {
  const cab = await env.COPIAS.prepare("SELECT * FROM copias WHERE id = ?1").bind(id).first();
  if (!cab) return erro("copia nao encontrada", 404);
  const linhas = (await env.COPIAS.prepare("SELECT uid, dados, mod, apagado FROM copias_itens WHERE copia_id = ?1").bind(id).all()).results || [];
  const metas = (await env.COPIAS.prepare("SELECT k, v, mod FROM copias_meta WHERE copia_id = ?1").bind(id).all()).results || [];

  const pacote = { versao: 6, exportadoEm: cab.data, copiaDe: id, itens: [] };
  for (const l of linhas) {
    let d = {};
    try { d = JSON.parse(l.dados); } catch (e) { d = {}; }
    d.uid = l.uid; d.mod = l.mod;
    if (l.apagado) d.deleted = true;
    pacote.itens.push(d);
  }
  for (const m of metas) {
    try { pacote[m.k] = JSON.parse(m.v); } catch (e) { pacote[m.k] = m.v; }
    pacote[m.k + "Mod"] = m.mod;
  }
  return ok(pacote);
}

/* POST /api/copias/<id>/restaurar
   ANTES DE QUALQUER COISA tira uma copia do jeito que esta agora: se a
   restauracao nao for o que ela esperava, da para voltar.

   A LICAO DAS FOTOS: nao basta reescrever o dado; o carimbo "mod" tem de
   subir, senao o proprio servidor recusa a versao restaurada por achar que
   o que ja estava la e mais novo. */
async function rotaCopiaRestaurar(id, env) {
  const cab = await env.COPIAS.prepare("SELECT * FROM copias WHERE id = ?1").bind(id).first();
  if (!cab) return erro("copia nao encontrada", 404);
  if (String(cab.nota || "").indexOf("Conteudo liberado") === 0)
    return erro("esta copia e so o registro: o conteudo dela ja foi liberado", 409);

  const antes = await copiaFazer(env, "antes-de-restaurar",
    "Tirada automaticamente antes de restaurar a copia de " + cab.data + ".");

  const linhas = (await env.COPIAS.prepare("SELECT uid, dados, mod, apagado FROM copias_itens WHERE copia_id = ?1").bind(id).all()).results || [];
  const metas = (await env.COPIAS.prepare("SELECT k, v FROM copias_meta WHERE copia_id = ?1").bind(id).all()).results || [];

  const agora = AGORA();
  for (let i = 0; i < linhas.length; i += COPIA_LOTE) {
    await env.DB.batch(linhas.slice(i, i + COPIA_LOTE).map(l => env.DB.prepare(
      "INSERT INTO itens (uid, dados, mod, apagado, criado) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT(uid) DO UPDATE SET dados = ?2, mod = ?3, apagado = ?4"
    ).bind(l.uid, l.dados, agora, l.apagado || 0, agora)));
  }
  for (let i = 0; i < metas.length; i += COPIA_LOTE) {
    await env.DB.batch(metas.slice(i, i + COPIA_LOTE).map(m => env.DB.prepare(
      "INSERT INTO meta (k, v, mod) VALUES (?1, ?2, ?3) ON CONFLICT(k) DO UPDATE SET v = ?2, mod = ?3"
    ).bind(m.k, m.v, agora)));
  }
  return ok({ ok: true, restaurada: id, fichas: linhas.length, configuracoes: metas.length, copiaDeAntes: antes.id });
}

/* POST /api/copias/<id>/testar - o teste a pedido, fora de domingo */
async function rotaCopiaTestar(id, env) {
  return ok(await copiaTestar(env, id));
}

/* O RELOGIO DO COFRE: madrugada tira a copia; domingo abre e confere.
   Funciona com o computador dela desligado - quem trabalha e a nuvem. */
async function relogioDoCofre(evento, env) {
  const r = await copiaFazer(env, "diaria", null);
  const domingo = new Date().getUTCDay() === 0;
  if (domingo) await copiaTestar(env, r.id);
  await copiaArrumarArmario(env);
  return r;
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

      /* rotas de entrada que ainda nao tem chave nenhuma */
      if (cam === "/api/primeiro-usuario" && req.method === "POST")
        return cors(req, await rotaPrimeiroUsuario(req, env));
      if (cam === "/api/login" && req.method === "POST")
        return cors(req, await rotaLogin(req, env));
      if (cam === "/api/definir-senha" && req.method === "POST")
        return cors(req, await rotaDefinirSenha(req, env));
      if (cam === "/api/emergencia/usar" && req.method === "POST")
        return cors(req, await rotaEmergenciaUsar(req, env));
      if (cam.startsWith("/api/aprovacoes/") && req.method === "GET" && !cam.endsWith("/decidir")) {
        const id = decodeURIComponent(cam.slice("/api/aprovacoes/".length));
        return cors(req, await rotaAprovacaoConsultar(id, env));
      }

      const quem = await autenticar(req, env);
      if (!quem) return cors(req, erro("nao autorizado", 401));

      if (cam === "/api/aprovacoes" && req.method === "GET")
        return cors(req, await rotaAprovacoesListar(quem, env));
      if (cam.startsWith("/api/aprovacoes/") && cam.endsWith("/decidir") && req.method === "POST") {
        const id = decodeURIComponent(cam.slice("/api/aprovacoes/".length, -"/decidir".length));
        return cors(req, await rotaAprovacaoDecidir(id, req, quem, env));
      }
      if (cam === "/api/dispositivos" && req.method === "GET")
        return cors(req, await rotaDispositivosListar(quem, env));
      if (cam.startsWith("/api/dispositivos/") && cam.endsWith("/desconectar") && req.method === "POST") {
        const id = decodeURIComponent(cam.slice("/api/dispositivos/".length, -"/desconectar".length));
        return cors(req, await rotaDispositivoDesconectar(id, quem, env));
      }
      if (cam === "/api/verificar-senha" && req.method === "POST")
        return cors(req, await rotaVerificarSenha(req, quem, env));
      if (cam === "/api/trocar-senha" && req.method === "POST")
        return cors(req, await rotaTrocarSenha(req, quem, env));
      if (cam === "/api/emergencia/gerar" && req.method === "POST")
        return cors(req, await rotaEmergenciaGerar(quem, env));

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

      if (cam === "/api/copias" && req.method === "GET")
        return cors(req, await rotaCopiasListar(env));
      if (cam === "/api/copias" && req.method === "POST")
        return cors(req, await rotaCopiaAgora(env));
      if (cam.startsWith("/api/copias/")) {
        const resto = cam.slice("/api/copias/".length).split("/");
        const idc = decodeURIComponent(resto[0] || "");
        if (!resto[1] && req.method === "GET") return cors(req, await rotaCopiaBaixar(idc, env));
        if (resto[1] === "restaurar" && req.method === "POST") return cors(req, await rotaCopiaRestaurar(idc, env));
        if (resto[1] === "testar" && req.method === "POST") return cors(req, await rotaCopiaTestar(idc, env));
      }

      return cors(req, erro("caminho desconhecido", 404));
    } catch (e) {
      return cors(req, erro("falha no servidor: " + (e && e.message || e), 500));
    }
  },

  /* o relogio: madrugada tira a copia, domingo abre e confere.
     Roda na nuvem - o computador dela pode estar desligado. */
  async scheduled(evento, env, ctx) {
    ctx.waitUntil(relogioDoCofre(evento, env).catch(e => console.log("copia falhou:", e && e.message || e)));
  }
};
