/* OPCOES DE CABECALHO — arquivo de trabalho, nao faz parte do site.

   Pedido dela em 25/08/2026, mostrando uma referencia de fora:
     "tire e tente organizar esse cabecalho igual esse layout, mas mantenha a
      nossa identidade visual, me de opcoes"

   O que a referencia acerta e o bloco verde cheio erra: o verde chapado ocupa
   um terco da folha, empurra a lista para baixo e faz o papel gastar tinta. A
   referencia usa uma FAIXA fina, titulo em texto e os dados em colunas.

   A identidade continua: verde da casa (#1d6b57), a mesma escada de cinzas, os
   mesmos cantos. Nenhuma cor nova entra aqui.

   Na IMPRESSAO ficam so dois quadradinhos, nesta ordem: DEMANDAS GERAIS e
   URGENTES. No site continuam todos. */

const OPCOES_CABECALHO = [

  { nome: "1. Faixa fina",
    resumo: "Como a referência: linha verde no topo, título em texto, dados em colunas.",
    monta: function (d) {
      return ''
      + '<div class="cab-novo cab-1">'
      +   '<div class="risco"></div>'
      +   '<h1 contenteditable="true">' + d.assunto + '</h1>'
      +   '<div class="sub" contenteditable="true">' + d.linhaSub + '</div>'
      +   '<div class="campos">'
      +     campo("Unidade", d.unidade)
      +     campo("Emissão", d.emitido)
      +     campo("Executor", d.executor)
      +     campo("Responsável técnica", d.rt)
      +   '</div>'
      + '</div>';
    }},

  { nome: "2. Faixa fina com o piso em destaque",
    resumo: "O mesmo, mas a loja e o piso saltam na primeira linha.",
    monta: function (d) {
      return ''
      + '<div class="cab-novo cab-2">'
      +   '<div class="risco"></div>'
      +   '<div class="etiqueta" contenteditable="true">Relatório de manutenção e infraestrutura</div>'
      +   '<h1 contenteditable="true">' + d.sigla + ' · ' + d.piso + '</h1>'
      +   '<div class="sub" contenteditable="true">' + d.mesAno + '</div>'
      +   '<div class="campos">'
      +     campo("Unidade", d.unidade)
      +     campo("Emissão", d.emitido)
      +     campo("Executor", d.executor)
      +     campo("Responsável técnica", d.rt)
      +   '</div>'
      + '</div>';
    }},

  { nome: "3. Barra verde estreita",
    resumo: "Guarda um pouco do verde da casa, mas numa barra baixa em vez do bloco inteiro.",
    monta: function (d) {
      return ''
      + '<div class="cab-novo cab-3">'
      +   '<div class="barra-verde">'
      +     '<b contenteditable="true">' + d.assunto + '</b>'
      +     '<span contenteditable="true">' + d.sigla + ' · ' + d.piso + ' · ' + d.mesAno + '</span>'
      +   '</div>'
      +   '<div class="campos">'
      +     campo("Unidade", d.unidade)
      +     campo("Emissão", d.emitido)
      +     campo("Executor", d.executor)
      +     campo("Responsável técnica", d.rt)
      +   '</div>'
      + '</div>';
    }},

  { nome: "4. Duas colunas",
    resumo: "Assunto de um lado, quem assina do outro. O mais enxuto em altura.",
    monta: function (d) {
      return ''
      + '<div class="cab-novo cab-4">'
      +   '<div class="risco"></div>'
      +   '<div class="duas">'
      +     '<div>'
      +       '<h1 contenteditable="true">' + d.assunto + '</h1>'
      +       '<div class="sub" contenteditable="true">' + d.sigla + ' · ' + d.piso + ' · ' + d.mesAno + '</div>'
      +     '</div>'
      +     '<div class="quem">'
      +       campo("Executor", d.executor)
      +       campo("Responsável técnica", d.rt)
      +     '</div>'
      +   '</div>'
      +   '<div class="campos">'
      +     campo("Unidade", d.unidade)
      +     campo("Emissão", d.emitido)
      +   '</div>'
      + '</div>';
    }}
];

function campo(rotulo, valor) {
  return '<div class="campo"><span>' + rotulo + '</span>'
       + '<b contenteditable="true">' + valor + '</b></div>';
}

function estiloDosCabecalhos() {
  return [
    ".cab-novo{margin-bottom:11px}",
    ".cab-novo .risco{height:4px;background:#1d6b57;border-radius:2px;margin-bottom:11px}",
    ".cab-novo h1{font-size:20px;font-weight:700;color:#155244;line-height:1.15;margin:0}",
    ".cab-novo .etiqueta{font-size:8.6px;letter-spacing:.14em;text-transform:uppercase;",
    "  color:#667085;margin-bottom:3px}",
    ".cab-novo .sub{font-size:8.8px;letter-spacing:.12em;text-transform:uppercase;",
    "  color:#667085;margin:3px 0 0}",
    ".cab-novo .campos{display:flex;gap:20px;flex-wrap:wrap;margin-top:10px;",
    "  padding-top:9px;border-top:1px solid #eaecf0}",
    ".cab-novo .campo{min-width:118px}",
    ".cab-novo .campo span{display:block;font-size:8px;letter-spacing:.12em;",
    "  text-transform:uppercase;color:#98a2b3;margin-bottom:1px}",
    ".cab-novo .campo b{font-size:11px;color:#344054;font-weight:600}",
    /* 3: barra verde estreita */
    ".cab-3 .barra-verde{background:#1d6b57;color:#fff;border-radius:6px;",
    "  padding:9px 14px;display:flex;justify-content:space-between;align-items:baseline;",
    "  gap:12px;flex-wrap:wrap;-webkit-print-color-adjust:exact;print-color-adjust:exact}",
    ".cab-3 .barra-verde b{font-size:15px}",
    ".cab-3 .barra-verde span{font-size:9.4px;letter-spacing:.12em;text-transform:uppercase;opacity:.92}",
    /* 4: duas colunas */
    ".cab-4 .duas{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap}",
    ".cab-4 .quem{display:flex;gap:18px}",
    ".cab-4 .campos{margin-top:9px}"
  ].join("\n");
}

/* ------------------------------------------------------------------ trocar */

function trocarCabecalho(indice) {
  const capa = document.querySelector(".capa, .cab-novo");
  if (!capa) return;

  if (!window.__capaOriginal) window.__capaOriginal = capa.outerHTML;

  if (indice === null) {
    const atual = document.querySelector(".capa, .cab-novo");
    atual.outerHTML = window.__capaOriginal;
    if (typeof ligarEdicao === "function") { /* a capa antiga volta ja editavel */ }
    return;
  }

  const d = lerDadosDaCapa();
  const novo = document.createElement("div");
  novo.innerHTML = OPCOES_CABECALHO[indice].monta(d);
  capa.replaceWith(novo.firstElementChild);

  document.querySelectorAll(".cab-novo [contenteditable]").forEach(function (el) {
    el.spellcheck = false;
    el.dataset.antes = el.textContent.replace(/\s+/g, " ").trim();
  });
}

/* le o que ja esta na folha, para o cabecalho novo nascer com os mesmos dados */
function lerDadosDaCapa() {
  function t(sel) {
    const e = document.querySelector(sel);
    return e ? e.textContent.replace(/\s+/g, " ").trim() : "";
  }
  const guardado = window.__dadosCapa;
  if (guardado) return guardado;

  const titulo = t(".capa h1");
  /* a sigla e o piso saem do titulo quando ela ja os escreveu la */
  const sigla = (titulo.match(/\b(AC|CF|SF)\b/) || ["AC"])[0];
  const piso = (titulo.match(/[123]º\s*Piso/i) || ["1º Piso"])[0];
  const mes = (titulo.match(/(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)[^0-9]*\d{4}/i)
               || ["Agosto de 2026"])[0];

  const d = {
    assunto: "Manutenção e Infraestrutura",
    sigla: sigla,
    piso: piso,
    mesAno: mes,
    linhaSub: "Relatório de manutenção · " + sigla + " · " + piso + " · " + mes,
    unidade: t(".capa .un div:nth-child(1) b.valor") || t(".capa .un div:nth-child(1) b"),
    emitido: t(".capa .un div:nth-child(2) b.valor") || t(".capa .un div:nth-child(2) b"),
    executor: t(".capa .ex b.valor") || t(".capa .ex b"),
    rt: t(".capa .rt b") + " (" + t(".capa .rt i").replace(/^Nutricionista[^·]*·\s*/, "") + ")"
  };
  window.__dadosCapa = d;
  return d;
}

/* ------------------------------------------------------------------ painel */

function ligarOpcoesCabecalho() {
  const est = document.createElement("style");
  est.textContent = estiloDosCabecalhos();
  document.head.appendChild(est);

  const p = document.getElementById("painelLayout");
  if (!p) return;

  const linha = document.createElement("div");
  linha.style.cssText = "flex-basis:100%;display:flex;gap:6px;flex-wrap:wrap;margin-top:8px";
  linha.innerHTML = OPCOES_CABECALHO.map(function (o, i) {
    return '<button type="button" data-cab="' + i + '" title="' + o.resumo + '">'
         + o.nome + "</button>";
  }).join("") + '<button type="button" data-cab="original">Voltar ao verde de hoje</button>';
  p.appendChild(linha);

  linha.addEventListener("click", function (ev) {
    const b = ev.target.closest("[data-cab]");
    if (!b) return;
    const v = b.getAttribute("data-cab");
    trocarCabecalho(v === "original" ? null : +v);
    linha.querySelectorAll("[data-cab]").forEach(function (x) {
      x.style.background = x === b ? "rgba(255,255,255,.28)" : "transparent";
    });
  });
}

/* ------------------------------------- os dois quadradinhos da impressao */

/* DESLIGADA em 25/08: virou codigo em js/mnt28.js (v9.52). Fica aqui so como
   registro do que foi decidido. Chamar de novo faz os quadradinhos sumirem do
   PDF, porque remonta o que o site ja entrega pronto. */
function soDoisQuadradinhos() {
  const nums = document.querySelector(".nums");
  if (!nums) return;
  if (!window.__todosOsNumeros) {
    window.__todosOsNumeros = Array.prototype.slice.call(nums.children);
  }
  const todos = window.__todosOsNumeros;
  const acha = function (re) {
    return todos.find(function (n) {
      const s = n.querySelector("span");
      return s && re.test(s.textContent);
    });
  };
  const demandas = acha(/demanda|servi/i);
  const urgentes = acha(/urgen|priorid|aten/i);

  nums.innerHTML = "";
  if (demandas) {
    const rot = demandas.querySelector("span");
    if (rot) { rot.textContent = "Demandas gerais"; rot.dataset.antes = "Demandas gerais"; }
    nums.appendChild(demandas);
  }
  if (urgentes) nums.appendChild(urgentes);
  if (typeof pintarUrgentes === "function") pintarUrgentes();
}
