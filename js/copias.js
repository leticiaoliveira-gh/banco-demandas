/* =====================================================================
   CÓPIAS DE SEGURANÇA  (Parte 2, item 4 - 20/09/2026)

   A tela onde a Lê vê, em português, se o trabalho dela está mesmo
   guardado. Três linhas de defesa, da mais forte para a mais simples:

     1. a cópia da madrugada, tirada pela nuvem (funciona com o
        computador dela desligado) e conferida de verdade aos domingos;
     2. a cópia das 20h na pasta do computador dela;
     3. o arquivo que ela mesma baixa quando quiser.

   Regra que mandou neste arquivo: nada some da lista. Cópia antiga que
   perdeu o conteúdo continua aparecendo, com o motivo escrito.
   ===================================================================== */

let copiasLista = [], copiasSituacao = null, copiasCarregando = false;

function copiasTemNuvem() {
  return typeof nuvemLigada === "function" && nuvemLigada();
}
function copiasBase() {
  return (typeof nuvemCfg === "function") ? nuvemCfg().endereco : "";
}
function copiasHdrs() {
  return (typeof nuvemCfg === "function")
    ? { "X-Chave": nuvemCfg().chave, "content-type": "application/json" }
    : { "content-type": "application/json" };
}

/* data bonita: "sábado, 20/09 às 02:10" */
function copiasData(iso) {
  if (!iso) return "sem data";
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  const dias = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const dd = String(d.getDate()).padStart(2, "0"), mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0"), mi = String(d.getMinutes()).padStart(2, "0");
  return dias[d.getDay()] + ", " + dd + "/" + mm + " às " + hh + ":" + mi;
}
function copiasQuandoFoi(iso) {
  if (!iso) return "";
  const h = (Date.now() - new Date(iso).getTime()) / 3600e3;
  if (h < 1) return "há poucos minutos";
  if (h < 24) return "há " + Math.round(h) + "h";
  const d = Math.round(h / 24);
  return "há " + d + (d === 1 ? " dia" : " dias");
}
const COPIAS_NOMES = {
  diaria: "Automática da madrugada",
  mensal: "Guardada do mês",
  manual: "Feita por você",
  "antes-de-restaurar": "Tirada antes de uma restauração"
};

/* ---------------------------------------------------------------- tela */
function copiasAbrir() {
  if (typeof ncModal !== "function") return;
  ncModal(`<h2 style="margin-bottom:4px">🛟 Cópias de segurança</h2>
    <p class="desc">Aqui você vê se o seu trabalho está guardado. A cópia é tirada sozinha toda madrugada,
    mesmo com o computador desligado, e é <b>aberta e conferida</b> aos domingos. Nenhuma linha desta lista
    é apagada.</p>
    <div id="cop-faixa"></div>
    <div class="lix-topo">
      <span id="cop-resumo">Carregando…</span>
      <button class="btn ghost sm" onclick="copiasFazerAgora()" id="cop-agora">Fazer uma agora</button>
    </div>
    <div id="cop-lista" class="lix-lista"></div>
    <div class="form-actions"><button class="btn ghost" onclick="ncFechar()">Fechar</button></div>`);
  copiasPintar();
  copiasCarregar();
}

async function copiasCarregar() {
  if (!copiasTemNuvem()) { copiasSituacao = null; copiasPintar(); return; }
  copiasCarregando = true; copiasPintar();
  try {
    const r = await fetch(copiasBase() + "/api/copias", { headers: copiasHdrs(), cache: "no-store" });
    if (!r.ok) throw new Error("resposta " + r.status);
    const j = await r.json();
    copiasLista = j.copias || [];
    copiasSituacao = j;
  } catch (e) {
    copiasSituacao = { erro: (e && e.message) || String(e) };
  }
  copiasCarregando = false;
  copiasPintar();
}

async function copiasPintar() {
  const faixa = document.getElementById("cop-faixa");
  const resumo = document.getElementById("cop-resumo");
  const lista = document.getElementById("cop-lista");
  if (!lista) return;

  /* a cópia das 20h na pasta do computador dela */
  let local = "";
  try { local = (typeof metaGet === "function") ? (await metaGet("lastBackup")) || "" : ""; } catch (e) { local = ""; }

  /* faixa vermelha: mais de um dia sem cópia na nuvem */
  let f = "";
  if (!copiasTemNuvem()) {
    f = `<div class="bd-aviso bd-aviso-atencao" role="status">
      <b>A guarda automática ainda não está ligada.</b> Hoje o seu trabalho depende da cópia
      das 20h na pasta deste computador. Ligue a nuvem para ter a cópia de madrugada.</div>`;
  } else if (copiasSituacao && copiasSituacao.erro) {
    f = `<div class="bd-aviso bd-aviso-erro" role="alert">
      <b>Não consegui ver as cópias agora.</b> Tente de novo em alguns minutos.
      <button class="btn ghost sm" onclick="copiasCarregar()">Tentar de novo</button></div>`;
  } else if (copiasSituacao && copiasSituacao.atrasada) {
    f = `<div class="bd-aviso bd-aviso-erro" role="alert">
      <b>Passou mais de um dia sem cópia.</b> Não espere: toque em fazer uma agora.
      <button class="btn primary sm" onclick="copiasFazerAgora()">Fazer agora</button></div>`;
  }
  if (faixa) faixa.innerHTML = f;

  if (resumo) {
    if (copiasCarregando) resumo.textContent = "Carregando…";
    else if (!copiasTemNuvem()) resumo.innerHTML = "Cópia na pasta deste computador: <b>" + (local ? copiasData(local) + " (" + copiasQuandoFoi(local) + ")" : "ainda não houve") + "</b>";
    else {
      const t = copiasSituacao && copiasSituacao.ultimaTestada;
      resumo.innerHTML = "<b>" + copiasLista.length + "</b> cópias guardadas" +
        (t ? " · última conferida de verdade em " + copiasData(t) : " · nenhuma conferida ainda");
    }
  }

  const linhas = [];

  /* linha fixa: a cópia das 20h no computador dela, mais uma entre as outras */
  linhas.push(`<div class="lix-item">
    <div class="lix-txt"><b>Pasta deste computador (20h)</b>
      <div class="desc">${local ? copiasData(local) + " · " + copiasQuandoFoi(local) : "ainda não houve. Ela só acontece com o site aberto às 20h"}</div></div>
    <div class="lix-acoes"><span class="bd-selo ${local ? "bd-selo-ok" : "bd-selo-neutro"}">${local ? "Existe" : "Sem cópia"}</span></div>
  </div>`);

  if (!copiasTemNuvem()) {
    lista.innerHTML = linhas.join("");
    return;
  }
  if (copiasCarregando && !copiasLista.length) { lista.innerHTML = linhas.join("") + `<p class="desc">Carregando as cópias da nuvem…</p>`; return; }

  for (const c of copiasLista) {
    const vazia = String(c.nota || "").indexOf("Conteudo liberado") === 0;
    const nome = COPIAS_NOMES[c.tipo] || c.tipo;
    const selo = c.testada
      ? `<span class="bd-selo bd-selo-ok" title="${esc(c.nota || "")}">Testada ✓</span>`
      : (vazia ? `<span class="bd-selo bd-selo-neutro">Só o registro</span>`
               : `<span class="bd-selo bd-selo-neutro">Não conferida</span>`);
    linhas.push(`<div class="lix-item">
      <div class="lix-txt">
        <b>${esc(nome)}</b>, ${copiasData(c.data)}
        <div class="desc">${c.n_itens} demandas · ${c.n_fotos} fotos · ${c.n_meta} configurações${vazia ? " · conteúdo liberado para poupar espaço; a linha fica aqui de propósito" : ""}</div>
        ${c.nota && !vazia ? `<div class="desc">${esc(c.nota)}</div>` : ""}
      </div>
      <div class="lix-acoes">
        ${selo}
        ${vazia ? "" : `
        <button class="btn ghost sm" onclick="copiasBaixar('${c.id}','arquivo')" title="O arquivo inteiro, para guardar ou reimportar">Arquivo</button>
        <button class="btn ghost sm" onclick="copiasBaixar('${c.id}','planilha')" title="Abre no Excel">Planilha</button>
        <button class="btn ghost sm" onclick="copiasBaixar('${c.id}','pdf')" title="Abre pronto para imprimir ou salvar em PDF">PDF</button>
        <button class="btn ghost sm" onclick="copiasTestar('${c.id}')" title="Abrir a cópia e conferir ficha por ficha">Conferir</button>
        <button class="btn ghost sm" onclick="copiasRestaurar('${c.id}')" title="Voltar o site para como estava nesta data">Restaurar</button>`}
      </div>
    </div>`);
  }
  lista.innerHTML = linhas.join("");
}

/* ------------------------------------------------------------- ações */
async function copiasFazerAgora() {
  if (!copiasTemNuvem()) { if (typeof toast === "function") toast("Ligue a nuvem primeiro"); return; }
  const b = document.getElementById("cop-agora");
  if (b) { b.disabled = true; b.textContent = "Fazendo…"; }
  try {
    const r = await fetch(copiasBase() + "/api/copias", { method: "POST", headers: copiasHdrs() });
    const j = await r.json();
    if (!r.ok || !j.ok) throw new Error(j && j.erro || "falhou");
    if (typeof toast === "function") toast("Cópia feita e conferida ✓");
  } catch (e) {
    if (typeof toast === "function") toast("Não consegui agora. Tente de novo.");
  }
  if (b) { b.disabled = false; b.textContent = "Fazer uma agora"; }
  copiasCarregar();
}

async function copiasTestar(id) {
  if (typeof toast === "function") toast("Abrindo e conferindo…");
  try {
    const r = await fetch(copiasBase() + "/api/copias/" + encodeURIComponent(id) + "/testar",
      { method: "POST", headers: copiasHdrs() });
    const j = await r.json();
    if (typeof toast === "function") toast(j.ok ? "Conferida: está tudo lá ✓" : "Atenção: a conferência achou problema");
  } catch (e) {
    if (typeof toast === "function") toast("Não consegui conferir agora");
  }
  copiasCarregar();
}

async function copiasPegar(id) {
  const r = await fetch(copiasBase() + "/api/copias/" + encodeURIComponent(id), { headers: copiasHdrs(), cache: "no-store" });
  if (!r.ok) throw new Error("resposta " + r.status);
  return await r.json();
}

async function copiasBaixar(id, formato) {
  if (typeof toast === "function") toast("Preparando…");
  let p;
  try { p = await copiasPegar(id); }
  catch (e) { if (typeof toast === "function") toast("Não consegui baixar agora"); return; }

  const dia = String(p.exportadoEm || "").slice(0, 10).split("-").reverse().join(".");
  const vivas = (p.itens || []).filter(i => !i.deleted);

  if (formato === "arquivo") {
    download("Cópia de segurança " + dia + ".json", JSON.stringify(p, null, 1), "application/json");
    return;
  }

  const cols = ["empresa", "piso", "area", "nc", "obs", "status", "prazo", "resp", "criado", "mod"];
  if (formato === "planilha") {
    const linhas = [cols.join(";")];
    for (const i of vivas)
      linhas.push(cols.map(c => '"' + String(i[c] == null ? "" : i[c]).replace(/"/g, '""').replace(/[\r\n]+/g, " ") + '"').join(";"));
    download("Cópia de segurança " + dia + ".csv", "﻿" + linhas.join("\r\n"), "text/csv;charset=utf-8");
    return;
  }

  /* PDF: abre pronto para o Ctrl+P do navegador salvar. Sem programa nenhum. */
  const w = window.open("", "_blank");
  if (!w) { if (typeof toast === "function") toast("O navegador bloqueou a janela"); return; }
  const corpo = vivas.map(i => `<tr><td>${esc(i.empresa)}</td><td>${esc(i.area)}</td><td>${esc(i.nc)}</td><td>${esc(i.status)}</td><td>${esc(i.prazo)}</td></tr>`).join("");
  w.document.write(`<!doctype html><html lang="pt-BR"><meta charset="utf-8">
    <title>Cópia de segurança ${dia}</title>
    <style>body{font:13px/1.45 system-ui,Arial;margin:24px;color:#222}
      h1{font-size:19px;color:#155244;margin:0 0 2px}p.s{color:#555;margin:0 0 16px}
      table{border-collapse:collapse;width:100%}th,td{border:1px solid #cfd8d4;padding:6px 8px;text-align:left;vertical-align:top}
      th{background:#e8f5f0;color:#155244}tr{break-inside:avoid}</style>
    <h1>Cópia de segurança de ${dia}</h1>
    <p class="s">${vivas.length} demandas guardadas nesta cópia. Para salvar em PDF: Ctrl+P e escolha “Salvar como PDF”.</p>
    <table><thead><tr><th>Empresa</th><th>Área</th><th>Demanda</th><th>Situação</th><th>Prazo</th></tr></thead><tbody>${corpo}</tbody></table>`);
  w.document.close();
}

/* RESTAURAR - a palavra é dela. Duas travas: uma cópia do estado de
   agora é tirada antes, e ela precisa confirmar sabendo o que muda. */
async function copiasRestaurar(id) {
  const c = copiasLista.find(x => x.id === id);
  if (!c) return;
  ncModal(`<h2 style="margin-bottom:4px">Restaurar esta cópia?</h2>
    <p class="desc">O site vai voltar para como estava em <b>${copiasData(c.data)}</b>:
    <b>${c.n_itens} demandas</b> e <b>${c.n_meta} configurações</b>.
    Tudo que você escreveu <b>depois</b> dessa data será substituído.</p>
    <p class="desc">Antes de mexer em qualquer coisa eu guardo uma cópia de como o site está
    <b>agora</b>. Se não for o que você esperava, dá para voltar por ela.</p>
    <div class="form-actions">
      <button class="btn ghost" onclick="copiasAbrir()">Não, deixa como está</button>
      <button class="btn primary" onclick="copiasRestaurarConfirmado('${id}')">Sim, restaurar</button>
    </div>`);
}

async function copiasRestaurarConfirmado(id) {
  ncModal(`<h2>Restaurando…</h2><p class="desc">Um instante. Não feche o site.</p>`);
  try {
    const r = await fetch(copiasBase() + "/api/copias/" + encodeURIComponent(id) + "/restaurar",
      { method: "POST", headers: copiasHdrs() });
    const j = await r.json();
    if (!r.ok || !j.ok) throw new Error(j && j.erro || "falhou");

    /* o servidor já voltou tudo; agora este aparelho puxa o que mudou */
    if (typeof nuvemNow === "function") await nuvemNow();
    if (typeof render === "function") render();

    ncModal(`<h2 style="margin-bottom:4px">Pronto ✓</h2>
      <p class="desc">Voltaram <b>${j.fichas} demandas</b> e <b>${j.configuracoes} configurações</b>.
      A cópia de como o site estava antes disto ficou guardada na lista, com a data de hoje.</p>
      <div class="form-actions"><button class="btn primary" onclick="copiasAbrir()">Ver as cópias</button></div>`);
  } catch (e) {
    ncModal(`<h2 style="margin-bottom:4px">Não deu certo</h2>
      <p class="desc">Nada foi alterado. Tente de novo daqui a pouco.</p>
      <div class="form-actions"><button class="btn ghost" onclick="copiasAbrir()">Voltar</button></div>`);
  }
}
