/* =====================================================================
   O CARTEIRO NOVO — fala com o cofre dela na Cloudflare
   (Fase 1 do plano da nova estrutura, 19/09/2026)

   O QUE MUDA PARA ELA: nada. Continua abrindo o site do mesmo jeito,
   editando do mesmo jeito. Muda so por onde o dado viaja.

   COMO CONVIVE COM O SISTEMA DE HOJE (decisao dela, 19/09):
   o js/sync.js do GitHub CONTINUA ligado e gravando, sem prazo, ate ela
   dizer com todas as letras que pode desligar. Os dois rodam juntos:
   cinto e suspensorio.

   O QUE VEM DA NUVEM NOVA (primeira migracao, decisao dela):
   so dois quadros, em TODAS as empresas:
     · Manutencoes e Infraestrutura  (tipo "mnt28")
     · Compras                       (tipo "cmp")
   Os outros quadros continuam no caminho de hoje, sem ela perceber
   diferenca nenhuma. Entram depois, um a um, quando ela pedir.

   PORTABILIDADE: este arquivo so fala HTTP comum. Trocar a Cloudflare
   por outro lugar (inclusive o computador dela) e trocar o endereco
   guardado em NUVEM_ENDERECO. Nada mais.
   ===================================================================== */

/* os quadros que ja moram na nuvem nova */
const QUADROS_NUVEM = ["mnt28", "cmp"];

/* de quanto em quanto tempo conversa sozinho, com o site aberto e parado */
const NUVEM_INTERVALO = 5 * 60000;

let nuvemT = null, nuvemBusy = false, nuvemDirty = false, nuvemLast = 0;

/* ---------------------------------------------------------------------
   A FILA DE ENVIO (24/09 — "marquei feito e voltou")
   Antes: cada alteracao esperava 60 segundos e ai o site mandava TODAS as
   fichas de novo. Fechou o site nesse minuto? A alteracao ficava presa no
   aparelho, e o outro aparelho continuava com a versao velha.
   Agora: cada ficha alterada entra numa fila guardada no aparelho (nao se
   perde se fechar), e sai para a nuvem em ~3 segundos. Ao esconder ou
   fechar a aba, a fila sai na hora.
   --------------------------------------------------------------------- */
let nuvemFila = new Set(), nuvemMesclando = false, nuvemUltimoOk = null;
const NUVEM_ESPERA = 3000;
/* quantas fichas vao por vez (30/09): pouco de proposito, para cada pedaco
   confirmado sair da fila e uma rede ruim nao perder o que ja foi */
const NUVEM_LOTE = 40;
/* a fila mora na gaveta do navegador (localStorage), que as abas dividem e
   que nao dispara o aviso "mudou configuracao" para as outras abas */
async function nuvemFilaCarregar() {
  try { const f = JSON.parse(localStorage.getItem("nuvem_fila") || "[]"); if (Array.isArray(f)) f.forEach(u => nuvemFila.add(u)); } catch (e) {}
  try { const t = await metaGet("nuvemUltimoOk"); if (t) nuvemUltimoOk = t; } catch (e) {}
}
function nuvemFilaGuardar() { try { localStorage.setItem("nuvem_fila", JSON.stringify([...nuvemFila])); } catch (e) {} }
function nuvemFilaAnotar(o) {
  if (nuvemMesclando || !o || !o.uid || !nuvemDoQuadro(o)) return;
  nuvemFila.add(o.uid);
  nuvemFilaGuardar();
}
/* a hora em que a nuvem confirmou por ultimo — e o que o selo mostra */
function nuvemHoraOk() { return nuvemUltimoOk; }

/* guarda o ultimo erro para o selo (js/sync.js) nunca dizer "Sincronizado"
   enquanto o cofre novo esta falhando por baixo */
let nuvemUltimoErro = null;
function nuvemTemErro() { return nuvemLigada() && !!nuvemUltimoErro; }

/* 08/10: o site so conversa com a nuvem DEPOIS de abrir por inteiro.
   Antes, ao entrar no PC do trabalho, a tela de entrada ja chamava a nuvem
   com a gaveta do aparelho ainda fechada: a conversa falhava e acendia
   "Nao salvou" sem nada estar faltando. */
let nuvemAbriu = false, nuvemIniciado = false;
/* o que a nuvem tem (lista completa, so quando a conversa conferiu tudo
   desde o zero): serve para nao devolver a ela o que acabou de chegar dela */
let nuvemNaNuvem = null;

/* soluco da rede ou nuvem ocupada nao e erro: espera um pouco e pede de
   novo (3 vezes). So falha de verdade se as tres falharem. */
async function nuvemPedir(url, opcoes) {
  let ultimo = null;
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    if (tentativa) await new Promise(f => setTimeout(f, 800 * tentativa));
    try {
      const r = await fetch(url, opcoes);
      if (r.ok || (r.status !== 429 && r.status < 500)) return r;
      ultimo = r;
    } catch (e) { ultimo = e; }
  }
  if (ultimo instanceof Error) throw ultimo;
  return ultimo;
}

/* ---------------------------------------------------------------------
   ONDE MORA A CHAVE
   Mesmo cuidado do sync.js: no aparelho dela fica guardado de verdade;
   em computador de terceiro fica so na aba aberta e some ao fechar.
   --------------------------------------------------------------------- */
function nuvemGetAny(k) {
  let v;
  try { v = localStorage.getItem(k); } catch (e) { v = null; }
  if (v != null) return v;
  try { v = sessionStorage.getItem(k); } catch (e) { v = null; }
  return v;
}
function nuvemCfg() {
  return {
    endereco: (nuvemGetAny("nuvem_endereco") || "").trim().replace(/\/+$/, ""),
    chave: (nuvemGetAny("nuvem_chave") || "").trim()
  };
}
function nuvemLigada() { const c = nuvemCfg(); return !!(c.endereco && c.chave); }
function nuvemHdrs() { return { "X-Chave": nuvemCfg().chave, "content-type": "application/json" }; }

/* marcador de ate onde ja veio, para nunca baixar o banco inteiro de novo */
async function nuvemMarco(k) { return (await metaGet("nuvem_" + k)) || ""; }
async function nuvemSetMarco(k, v) { await metaSet("nuvem_" + k, v); }

/* ---------------------------------------------------------------------
   AS CONFIGURACOES QUE VIAJAM
   Cada uma anda junto com o proprio carimbo de hora (o "...Mod"), que e
   quem decide qual aparelho tem a versao mais nova. Esta lista e a mesma
   do envelope de backup — se um dia nascer uma configuracao nova, ela
   entra aqui tambem, senao nao chega ao celular dela.
   --------------------------------------------------------------------- */
const NUVEM_CFG_PARES = [
  ["empresas", "empresasMod"], ["pendencias", "pendenciasMod"],
  ["rtInfo", "rtInfoMod"], ["abaNomes", "abaNomesMod"],
  ["abaSub", "abaSubMod"], ["capaCfg", "capaCfgMod"],
  ["textos", "textosMod"], ["dgOpcoes", "dgOpcoesMod"],
  ["ncUrgencias", "ncUrgenciasMod"], ["ckOpcoes", "ckOpcoesMod"],
  ["areas", "areasMod"], ["executores", "executoresMod"],
  ["assinaturaRT", "assinaturaRTMod"], ["ambTipos", "ambTiposMod"],
  ["ckqSetores", "ckqSetoresMod"], ["ncPalavras", "ncPalavrasMod"],
  ["folhasCfg", "folhasCfgMod"]
];

/* ---------------------------------------------------------------------
   BAIXAR
   Paginado de proposito: sao mais de mil fichas, e o celular dela nao
   pode engasgar numa rede ruim. Vem so o que mudou desde a ultima vez.
   --------------------------------------------------------------------- */
async function nuvemPull() {
  const c = nuvemCfg();
  /* marcador novo ("rev_"): conta pela hora em que a NUVEM recebeu, nao
     pelo relogio de cada aparelho. Na primeira vez depois da troca ele
     comeca do zero e confere tudo — mas so baixa (e so busca foto de)
     ficha que o aparelho nao tem igual. */
  let desde = await nuvemMarco("rev_desde"), cursor = await nuvemMarco("rev_cursor");
  const completo = !desde && !cursor, vistos = new Set();
  const itens = [];
  const localPorUid = new Map(DATA.filter(d => d.uid).map(d => [d.uid, d]));
  let voltas = 0;

  while (voltas++ < 40) {
    const u = c.endereco + "/api/itens?desde=" + encodeURIComponent(desde) +
      "&cursor=" + encodeURIComponent(cursor) + "&limite=500";
    const r = await nuvemPedir(u, { headers: nuvemHdrs(), cache: "no-store" });
    if (!r.ok) throw new Error("GET itens " + r.status);
    const j = await r.json();
    for (const it of (j.itens || [])) {
      if (it && it.uid) vistos.add(it.uid);
      const l = localPorUid.get(it.uid);
      if (l && (l.mod || "") >= (it.mod || "")) {
        /* o aparelho ja tem esta versao (ou uma mais nova, que ainda nao
           subiu): nao baixa de novo; se for mais nova, entra na fila */
        if ((l.mod || "") > (it.mod || "") && nuvemDoQuadro(l)) nuvemFila.add(l.uid);
        continue;
      }
      itens.push(await nuvemFotosParaCa(it));
    }
    desde = j.proxDesde || desde;
    cursor = j.proxCursor || cursor;
    if (!j.temMais) break;
  }
  if (completo) nuvemNaNuvem = vistos;

  /* configuracoes */
  const rm = await nuvemPedir(c.endereco + "/api/meta?desde=" + encodeURIComponent(await nuvemMarco("metaDesde")),
    { headers: nuvemHdrs(), cache: "no-store" });
  if (!rm.ok) throw new Error("GET meta " + rm.status);
  const jm = await rm.json();

  /* monta o mesmo envelope que a sincronizacao de hoje ja sabe fundir —
     assim a regra de "quem vence" continua sendo UMA so no site inteiro,
     em vez de duas parecidas que um dia discordam */
  const env = { itens };
  let metaUltimo = await nuvemMarco("metaDesde");
  for (const [chave, chaveMod] of NUVEM_CFG_PARES) {
    const linha = jm.meta && jm.meta[chave];
    if (!linha) continue;
    env[chave] = linha.v;
    env[chaveMod] = linha.mod;
    if ((linha.mod || "") > metaUltimo) metaUltimo = linha.mod;
  }

  nuvemMesclando = true;
  let res;
  try { res = await syncMergeEnvelope(env); } finally { nuvemMesclando = false; }
  /* 06/10: o aparelho tem configuracao que a nuvem nao tem -> manda nesta mesma conversa */
  if (res && res.localAhead) nuvemDirty = true;
  await nuvemSetMarco("rev_desde", desde);
  await nuvemSetMarco("rev_cursor", cursor);
  await nuvemSetMarco("metaDesde", metaUltimo);
  return res;
}

/* ---------------------------------------------------------------------
   ENVIAR
   So os quadros ja migrados. O filtro e o mesmo em toda empresa e loja.
   --------------------------------------------------------------------- */
function nuvemDoQuadro(d) {
  return !!d && QUADROS_NUVEM.indexOf(d.tipo) >= 0;
}

async function nuvemPush() {
  const c = nuvemCfg();
  /* so o que esta na fila. Na primeira vez neste aparelho vai tudo uma vez,
     para nada que so existia aqui ficar para tras.
     30/09 (v11.18): "tudo" agora ENTRA NA FILA, em vez de ser um envio unico
     de tudo-ou-nada. Antes, uma unica ficha com problema derrubava o envio
     inteiro, para sempre e em silencio — foi assim que o trabalho de 28/09
     ficou preso num computador e se perdeu. */
  if (!(await metaGet("nuvemFilaLigada"))) {
    /* 08/10: o que a nuvem ja tem (conferido agora, desde o zero) nao volta
       para ela. Num PC que acabou de entrar, tudo veio da nuvem: fila vazia.
       Ficha mais nova aqui do que la ja entrou na fila durante o baixar. */
    DATA.forEach(d => {
      if (d && d.uid && nuvemDoQuadro(d) && !(nuvemNaNuvem && nuvemNaNuvem.has(d.uid))) nuvemFila.add(d.uid);
    });
    nuvemFilaGuardar();
    await metaSet("nuvemFilaLigada", nowISO());
  }
  const enviando = new Set(nuvemFila);
  const lista = DATA.filter(d => nuvemDoQuadro(d) && enviando.has(d.uid));
  const naLista = new Set(lista.map(d => d.uid));
  const recusados = [];
  let falhou = null;

  /* em lotes pequenos: cada lote que a nuvem confirma sai da fila na hora.
     Ficha que der problema fica na fila e NAO segura as outras. */
  for (let i = 0; i < lista.length; i += NUVEM_LOTE) {
    const lote = [], foi = [];
    for (const d of lista.slice(i, i + NUVEM_LOTE)) {
      const { id, ...resto } = d;   /* o "id" e numero local, nao viaja */
      try { lote.push(await nuvemFotosParaCofre(resto)); foi.push([d.uid, d.mod || ""]); }
      catch (e) { falhou = e; console.warn("[nuvem] ficha nao saiu:", d.uid, e && e.message || e); }
    }
    if (!lote.length) continue;
    const r = await nuvemPedir(c.endereco + "/api/itens", {
      method: "POST", headers: nuvemHdrs(), body: JSON.stringify({ itens: lote })
    });
    if (!r.ok) throw new Error("POST itens " + r.status);
    try { const j = await r.json(); if (j && Array.isArray(j.recusados)) recusados.push(...j.recusados); } catch (e) {}
    /* sai da fila so o que foi enviado E nao mudou de novo durante o envio */
    for (const [uid, mod] of foi) {
      const agora = DATA.find(x => x.uid === uid);
      if (!agora || (agora.mod || "") === mod) nuvemFila.delete(uid);
    }
    nuvemFilaGuardar();
  }
  /* anotacao de ficha que nao existe mais neste aparelho: nao ha o que enviar */
  for (const u of enviando) if (!naLista.has(u)) nuvemFila.delete(u);
  nuvemFilaGuardar();

  /* a nuvem tinha versao mais nova de alguma ficha (alterada em outro
     aparelho): vale a da nuvem, e a tela troca na hora */
  if (recusados.length) {
    const vindos = [];
    for (const it of recusados) vindos.push(await nuvemFotosParaCa(it));
    nuvemMesclando = true;
    let res;
    try { res = await syncMergeEnvelope({ itens: vindos }); } finally { nuvemMesclando = false; }
    if (res && res.changed && typeof syncRefreshViews === "function") syncRefreshViews();
  }

  /* configuracoes: vao inteiras, cada uma com o proprio carimbo */
  const env = buildBackupEnvelope();
  const pacote = {};
  for (const [chave, chaveMod] of NUVEM_CFG_PARES) {
    const mod = env[chaveMod] || "";
    if (!mod) continue;                       /* sem carimbo, sem envio */
    pacote[chave] = { v: env[chave], mod };
  }
  /* 06/10 (v11.82): a configuracao das folhas leva o carimbo de CADA chave
     separado ("mods"), para a nuvem juntar chave por chave e nunca apagar
     o que este aparelho nao tem */
  if (pacote.folhasCfg && pacote.folhasCfg.v) {
    const { _mods, ...valores } = pacote.folhasCfg.v;
    pacote.folhasCfg = { v: valores, mod: pacote.folhasCfg.mod, mods: _mods || {} };
  }
  if (Object.keys(pacote).length) {
    const r = await nuvemPedir(c.endereco + "/api/meta", {
      method: "POST", headers: nuvemHdrs(), body: JSON.stringify({ meta: pacote })
    });
    if (!r.ok) throw new Error("POST meta " + r.status);
  }

  nuvemDirty = nuvemFila.size > 0;
  if (typeof seloPendentes !== "undefined" && !nuvemDirty) seloPendentes = 0;
  await metaSet("nuvemUltimoEnvio", nowISO());
  /* alguma ficha ficou para tras: o selo e o aviso TEM que dizer */
  if (falhou) throw falhou;
}

/* ---------------------------------------------------------------------
   A CONVERSA COMPLETA
   --------------------------------------------------------------------- */
async function nuvemNow() {
  if (!nuvemLigada() || nuvemBusy || !nuvemAbriu) return;
  nuvemBusy = true; clearTimeout(nuvemT);
  try {
    const res = await nuvemPull();
    if (res && res.changed) {
      if (typeof syncRefreshViews === "function") syncRefreshViews();
      if (typeof scheduleBackup === "function") scheduleBackup();
    }
    if (nuvemDirty || nuvemFila.size || !(await metaGet("nuvemFilaLigada"))) await nuvemPush();
    nuvemLast = Date.now();
    nuvemUltimoErro = null;
    nuvemUltimoOk = nowISO();
    await metaSet("nuvemUltimaConversa", nuvemUltimoOk);
    await metaSet("nuvemUltimoOk", nuvemUltimoOk);
  } catch (e) {
    /* falhar aqui NAO pode travar nada: o sistema de hoje continua gravando
       no GitHub, e a copia do aparelho e a principal. Mas o selo TEM que
       avisar — antes ficava calado e dizia "Sincronizado" mentindo. */
    nuvemUltimoErro = e && e.message || String(e);
    console.warn("nuvem:", nuvemUltimoErro);
  }
  nuvemBusy = false;
  if (typeof aplicarSeloConexao === "function") aplicarSeloConexao();
  /* alterou enquanto conversava? sai logo em seguida */
  if (!nuvemUltimoErro && nuvemFila.size) nuvemAgendar(NUVEM_ESPERA);
  /* 08/10: deu errado? tenta de novo sozinho em 30 segundos, sem esperar
     os 5 minutos — o aviso some assim que a nuvem responder */
  else if (nuvemUltimoErro) nuvemAgendar(30000);
}
function nuvemAgendar(ms) {
  clearTimeout(nuvemT);
  nuvemT = setTimeout(nuvemNow, ms);
}

function nuvemSchedule() {
  if (!nuvemLigada()) return;
  nuvemDirty = true;
  nuvemAgendar(NUVEM_ESPERA);
}

async function nuvemInit() {
  nuvemAbriu = true;          /* o site terminou de abrir: agora pode conversar */
  if (!nuvemLigada() || nuvemIniciado) return;
  nuvemIniciado = true;
  /* toda gravacao do site passa por putItem: anotar aqui cobre toda tela */
  if (typeof putItem === "function" && !putItem.__nuvem) {
    const _put = putItem;
    putItem = async function (o) { const r = await _put(o); nuvemFilaAnotar(o); return r; };
    putItem.__nuvem = true;
  }
  await nuvemFilaCarregar();
  nuvemNow();
  document.addEventListener("visibilitychange", () => {
    if (!nuvemLigada()) return;
    /* escondeu/fechou a aba com coisa na fila: manda ja, nao espera */
    if (document.hidden) { if (nuvemFila.size && !nuvemBusy) nuvemNow(); return; }
    if (!nuvemBusy && Date.now() - nuvemLast > 60000) nuvemNow();
  });
  window.addEventListener("pagehide", () => { if (nuvemLigada() && nuvemFila.size && !nuvemBusy) nuvemNow(); });
  window.addEventListener("online", () => { if (nuvemLigada()) nuvemNow(); });
  setInterval(() => {
    if (document.hidden || !nuvemLigada() || nuvemBusy) return;
    if (Date.now() - nuvemLast >= NUVEM_INTERVALO) nuvemNow();
  }, 60000);
}

/* ---------------------------------------------------------------------
   FOTOS
   A ficha guarda so a referencia "foto:<id>". A imagem vem sob demanda e
   o aparelho fica com a copia dele. Foto nunca e sobrescrita, e apagar
   so manda para a lixeira de 90 dias.
   REGRA DELA: imagem INTEIRA, nunca cortada nem encolhida para caber.
   --------------------------------------------------------------------- */
function nuvemFotoURL(id) {
  const c = nuvemCfg();
  return c.endereco ? c.endereco + "/api/foto/" + encodeURIComponent(id) : "";
}

async function nuvemFotoEnviar(id, blob) {
  const c = nuvemCfg();
  const r = await nuvemPedir(c.endereco + "/api/foto?id=" + encodeURIComponent(id), {
    method: "POST",
    headers: { "X-Chave": c.chave, "content-type": blob.type || "image/jpeg" },
    body: blob
  });
  if (!r.ok) throw new Error("POST foto " + r.status);
  return r.json();
}

/* Quando muitas fotos sao pedidas ao mesmo tempo, o cofre pode responder
   "estou ocupado" (429/503). Nao e erro: e so esperar um instante e pedir de
   novo. Tenta ate 4 vezes, esperando cada vez um pouco mais, para nenhuma
   foto faltar na tela dela. */
async function nuvemFotoBaixar(id) {
  const hdr = { "X-Chave": nuvemCfg().chave };
  let ultimo = 0;
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    if (tentativa) await new Promise(f => setTimeout(f, 400 * tentativa));
    let r;
    /* a partir da 2a tentativa pede a foto de novo do cofre, ignorando a
       copia guardada no aparelho: e o que resolve uma foto que ficou
       guardada em branco */
    const modo = tentativa ? { headers: hdr, cache: "reload" } : { headers: hdr, cache: "no-store" };
    try { r = await fetch(nuvemFotoURL(id), modo); }
    catch (e) { ultimo = 0; continue; }
    if (r.ok) {
      const b = await r.blob();
      if (b.size) return b;
      ultimo = 0;          /* veio em branco: nao serve, tenta de novo */
      continue;
    }
    ultimo = r.status;
    if (r.status !== 429 && r.status !== 503 && r.status < 500) break;
  }
  throw new Error("GET foto " + ultimo);
}

/* O NOME DA FOTO E A PROPRIA FOTO.
   O id sai do conteudo da imagem (impressao digital). Duas copias da mesma
   foto viram um arquivo so no cofre, e reenviar a mesma foto nunca duplica. */
async function nuvemFotoId(dataUrl) {
  const b = new TextEncoder().encode(dataUrl);
  const h = await crypto.subtle.digest("SHA-256", b);
  return Array.from(new Uint8Array(h)).map(x => x.toString(16).padStart(2, "0")).join("").slice(0, 32);
}
function nuvemDataParaBlob(dataUrl) {
  const [cab, b64] = String(dataUrl).split(",");
  const mime = (cab.match(/data:([^;]+)/) || [, "image/jpeg"])[1];
  /* 30/09: foto com a escrita defeituosa devolve null em vez de estourar */
  let bin;
  try { bin = atob((b64 || "").replace(/\s+/g, "")); } catch (e) { return null; }
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Blob([u8], { type: mime });
}
function nuvemBlobParaData(blob) {
  return new Promise((res, rej) => {
    const f = new FileReader();
    f.onload = () => res(f.result); f.onerror = rej;
    f.readAsDataURL(blob);
  });
}

/* ---------------------------------------------------------------------
   A FOTO VIAJA SEPARADA DA FICHA
   No cofre a ficha guarda so "foto:<id>" — ficha pequena, viagem leve.
   NO APARELHO a foto continua inteira dentro da ficha, exatamente como
   e hoje: e isso que faz o site continuar mostrando as fotos sem
   internet. Nada muda na tela dela.
   --------------------------------------------------------------------- */
async function nuvemFotosParaCofre(d) {
  if (!d || !Array.isArray(d.fotos) || !d.fotos.length) return d;
  const saida = [];
  for (const f of d.fotos) {
    if (typeof f !== "string") continue;
    if (!f.startsWith("data:")) { saida.push(f); continue; }  /* ja e referencia */
    /* foto sem imagem nenhuma (sobra de uma conversa que caiu) nao vai para
       o cofre: o cofre recusa e a ficha ficaria tentando para sempre */
    if (f.length < 64) continue;
    const blob = nuvemDataParaBlob(f);
    /* foto que nao da para ler (30/09): viaja dentro da ficha, do jeito que
       esta. Nunca mais uma foto ruim segura o envio das fichas. */
    if (!blob || !blob.size) { saida.push(f); continue; }
    const id = await nuvemFotoId(f);
    await nuvemFotoEnviar(id, blob);
    saida.push("foto:" + id);
  }
  return { ...d, fotos: saida };
}

async function nuvemFotosParaCa(d) {
  if (!d || !Array.isArray(d.fotos) || !d.fotos.length) return d;
  const saida = [];
  for (const f of d.fotos) {
    if (typeof f !== "string") continue;
    if (!f.startsWith("foto:")) { saida.push(f); continue; }  /* ja e a imagem */
    try {
      saida.push(await nuvemBlobParaData(await nuvemFotoBaixar(f.slice(5))));
    } catch (e) {
      /* foto que nao veio nao derruba a ficha: a ficha entra, a foto tenta
         de novo na proxima conversa */
      console.warn("[nuvem] foto nao veio:", f, e);
      saida.push(f);
    }
  }
  return { ...d, fotos: saida };
}

/* ---------------------------------------------------------------------
   LIGAR E DESLIGAR (usado pela tela de configuracao)
   Testa ANTES de guardar: se o cofre nao responder, nada e salvo e ela
   nao fica achando que conectou.
   --------------------------------------------------------------------- */
async function nuvemTestar(endereco, chave) {
  try {
    const r = await fetch(endereco.replace(/\/+$/, "") + "/api/situacao",
      { headers: { "X-Chave": chave }, cache: "no-store" });
    if (r.status === 401) return "A chave nao foi aceita.";
    if (!r.ok) return "O cofre respondeu com erro " + r.status + ".";
    return "";
  } catch (e) {
    return navigator.onLine === false ? "Sem internet agora." : "Nao consegui falar com o cofre.";
  }
}

async function nuvemConectar(endereco, chave, temporario) {
  const erro = await nuvemTestar(endereco, chave);
  if (erro) return erro;
  const guarda = temporario ? sessionStorage : localStorage;
  const outra = temporario ? localStorage : sessionStorage;
  try {
    ["nuvem_endereco", "nuvem_chave"].forEach(k => outra.removeItem(k));
    guarda.setItem("nuvem_endereco", endereco.replace(/\/+$/, ""));
    guarda.setItem("nuvem_chave", chave);
  } catch (e) { return "Este navegador nao deixou guardar o acesso."; }
  /* 08/10: entrar NAO marca "falta enviar". O que estiver mais novo aqui
     ja entra na fila ao baixar (fichas) ou pelo localAhead (configuracoes);
     marcar tudo como pendente acendia "Nao salvou" sem nada pendente. */
  /* 08/10: na entrada (site ainda abrindo) quem conversa e o nuvemInit,
     no fim da abertura. Com o site ja aberto, conversa agora. */
  if (nuvemAbriu) { if (nuvemIniciado) nuvemNow(); else nuvemInit(); }
  return "";
}

/* ---------------------------------------------------------------------
   ANTES DE APAGAR ESTE APARELHO (30/09, v11.18)
   Em 28/09 ela clicou em "Sair e apagar deste PC" e o site apagou um dia
   inteiro de trabalho que nunca tinha chegado a nuvem. Nunca mais.
   Esta funcao manda tudo e CONFERE. Devolve "" quando esta tudo na nuvem,
   ou uma frase simples dizendo por que nao esta. Quem apaga (js/app.js)
   so apaga com "".
   --------------------------------------------------------------------- */
async function nuvemGarantirEnviado() {
  if (!nuvemLigada()) return "";
  /* o que ela estava digitando grava ao sair do campo */
  try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (e) {}
  await new Promise(f => setTimeout(f, 600));
  for (let volta = 0; volta < 3; volta++) {
    for (let i = 0; i < 600 && nuvemBusy; i++) await new Promise(f => setTimeout(f, 200));
    if (nuvemBusy) return "A conversa com a nuvem ainda não terminou.";
    nuvemDirty = true;
    await nuvemNow();
    if (!nuvemUltimoErro && !nuvemFila.size && !nuvemBusy) return "";
  }
  if (navigator.onLine === false) return "Este aparelho está sem internet.";
  if (nuvemFila.size) return "Ainda " + (nuvemFila.size === 1 ? "há 1 demanda" : "há " + nuvemFila.size + " demandas") + " que a nuvem não recebeu.";
  return "A nuvem não confirmou que recebeu.";
}

/* sair de verdade de um computador que nao e dela: encerra o acesso la na
   nuvem e tira a chave daqui. So e chamada DEPOIS de conferido o envio. */
async function nuvemSairDoAparelho() {
  const c = nuvemCfg();
  if (c.endereco && c.chave) {
    try { await fetch(c.endereco + "/api/sair", { method: "POST", headers: nuvemHdrs() }); } catch (e) {}
  }
  try {
    ["nuvem_endereco", "nuvem_chave", "nuvem_fila"].forEach(k => {
      localStorage.removeItem(k); sessionStorage.removeItem(k);
    });
  } catch (e) {}
  nuvemFila.clear();
}

function nuvemDesconectar() {
  try {
    ["nuvem_endereco", "nuvem_chave"].forEach(k => {
      localStorage.removeItem(k); sessionStorage.removeItem(k);
    });
  } catch (e) {}
  nuvemUltimoErro = null;
  if (typeof aplicarSeloConexao === "function") aplicarSeloConexao();
}

/* ---------------------------------------------------------------------
   ATIVAR ESTE APARELHO (20/09) — o passo dela.
   Formulario simples de duas caixas (endereco e chave), sem nada do
   GitHub. Quem gera a chave e uma pessoa com acesso ao painel da
   Cloudflare (nunca este botao sozinho: criar chave sem checagem de
   quem esta pedindo abriria o cofre para qualquer um que achasse o link).
   --------------------------------------------------------------------- */
async function nuvemAtivarComFormulario() {
  const end = document.getElementById("nuvemEndereco");
  const cha = document.getElementById("nuvemChaveInput");
  const msg = document.getElementById("nuvemAtivarMsg");
  const endereco = (end && end.value || location.origin).trim();
  const chave = (cha && cha.value || "").trim();
  if (!chave) { if (msg) { msg.textContent = "Cole a chave que foi gerada para este aparelho."; msg.style.color = "var(--amber)"; } return; }
  if (msg) { msg.textContent = "Ativando…"; msg.style.color = ""; }
  const erro = await nuvemConectar(endereco, chave, false);
  if (erro) { if (msg) { msg.textContent = erro; msg.style.color = "var(--amber)"; } return; }
  if (msg) { msg.textContent = "Ativado ✓"; msg.style.color = "var(--green)"; }
  toast("Aparelho ativado ✓");
  if (typeof closeSyncModal === "function") setTimeout(closeSyncModal, 700);
  if (typeof renderHome === "function") renderHome();
}
