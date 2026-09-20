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
  let desde = await nuvemMarco("desde"), cursor = await nuvemMarco("cursor");
  const itens = [];
  let voltas = 0;

  while (voltas++ < 40) {
    const u = c.endereco + "/api/itens?desde=" + encodeURIComponent(desde) +
      "&cursor=" + encodeURIComponent(cursor) + "&limite=500";
    const r = await fetch(u, { headers: nuvemHdrs(), cache: "no-store" });
    if (!r.ok) throw new Error("GET itens " + r.status);
    const j = await r.json();
    for (const it of (j.itens || [])) itens.push(await nuvemFotosParaCa(it));
    desde = j.proxDesde || desde;
    cursor = j.proxCursor || cursor;
    if (!j.temMais) break;
  }

  /* configuracoes */
  const rm = await fetch(c.endereco + "/api/meta?desde=" + encodeURIComponent(await nuvemMarco("metaDesde")),
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

  const res = await syncMergeEnvelope(env);
  await nuvemSetMarco("desde", desde);
  await nuvemSetMarco("cursor", cursor);
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
  const lista = DATA.filter(nuvemDoQuadro);

  /* em lotes, para nao estourar a memoria do celular nem o limite da API */
  for (let i = 0; i < lista.length; i += 400) {
    const lote = [];
    for (const d of lista.slice(i, i + 400)) {
      const { id, ...resto } = d;   /* o "id" e numero local, nao viaja */
      lote.push(await nuvemFotosParaCofre(resto));
    }
    const r = await fetch(c.endereco + "/api/itens", {
      method: "POST", headers: nuvemHdrs(), body: JSON.stringify({ itens: lote })
    });
    if (!r.ok) throw new Error("POST itens " + r.status);
  }

  /* configuracoes: vao inteiras, cada uma com o proprio carimbo */
  const env = buildBackupEnvelope();
  const pacote = {};
  for (const [chave, chaveMod] of NUVEM_CFG_PARES) {
    const mod = env[chaveMod] || "";
    if (!mod) continue;                       /* sem carimbo, sem envio */
    pacote[chave] = { v: env[chave], mod };
  }
  if (Object.keys(pacote).length) {
    const r = await fetch(c.endereco + "/api/meta", {
      method: "POST", headers: nuvemHdrs(), body: JSON.stringify({ meta: pacote })
    });
    if (!r.ok) throw new Error("POST meta " + r.status);
  }

  nuvemDirty = false;
  await metaSet("nuvemUltimoEnvio", nowISO());
}

/* ---------------------------------------------------------------------
   A CONVERSA COMPLETA
   --------------------------------------------------------------------- */
async function nuvemNow() {
  if (!nuvemLigada() || nuvemBusy) return;
  nuvemBusy = true; clearTimeout(nuvemT);
  try {
    const res = await nuvemPull();
    if (res && res.changed) {
      if (typeof syncRefreshViews === "function") syncRefreshViews();
      if (typeof scheduleBackup === "function") scheduleBackup();
    }
    if (nuvemDirty || (res && res.localAhead)) await nuvemPush();
    nuvemLast = Date.now();
    await metaSet("nuvemUltimaConversa", nowISO());
  } catch (e) {
    /* falhar aqui NAO pode assustar nem travar nada: o sistema de hoje
       continua gravando no GitHub, e a copia do aparelho e a principal */
    console.warn("nuvem:", e && e.message || e);
  }
  nuvemBusy = false;
}

function nuvemSchedule() {
  if (!nuvemLigada()) return;
  nuvemDirty = true;
  clearTimeout(nuvemT);
  nuvemT = setTimeout(nuvemNow, 60000);
}

function nuvemInit() {
  if (!nuvemLigada()) return;
  nuvemNow();
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && nuvemLigada() && !nuvemBusy && Date.now() - nuvemLast > 60000) nuvemNow();
  });
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
  const r = await fetch(c.endereco + "/api/foto?id=" + encodeURIComponent(id), {
    method: "POST",
    headers: { "X-Chave": c.chave, "content-type": blob.type || "image/jpeg" },
    body: blob
  });
  if (!r.ok) throw new Error("POST foto " + r.status);
  return r.json();
}

async function nuvemFotoBaixar(id) {
  const r = await fetch(nuvemFotoURL(id), { headers: { "X-Chave": nuvemCfg().chave } });
  if (!r.ok) throw new Error("GET foto " + r.status);
  return r.blob();
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
  const bin = atob(b64 || "");
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
    const id = await nuvemFotoId(f);
    await nuvemFotoEnviar(id, nuvemDataParaBlob(f));
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
  nuvemDirty = true;
  nuvemNow();
  return "";
}

function nuvemDesconectar() {
  try {
    ["nuvem_endereco", "nuvem_chave"].forEach(k => {
      localStorage.removeItem(k); sessionStorage.removeItem(k);
    });
  } catch (e) {}
}
