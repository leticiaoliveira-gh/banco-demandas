/* MODO RASCUNHO — arquivo de trabalho, nao faz parte do site.

   Deixa a folha inteira editavel para ela experimentar o formato: escrever por
   cima de qualquer texto, tirar linha que nao quer ver, e no fim apertar um
   botao que devolve, em portugues, so o que ela mudou.

   Nada aqui toca no banco nem no site publicado. */

function ligarEdicao() {
  const SELETORES = [
    ".capa .et", ".capa h1", ".capa .ex b", ".capa .rt b", ".capa .rt i",
    ".capa .un b", ".capa .un span", ".capa .ex b.valor", ".num span", ".num b",
    ".bl.piso h2", ".bl.ar span", ".bl.ar b", ".bl.cab span",
    ".li .f", ".li .q", ".li .o",
    ".bl.causa b", ".bl.causa span", ".topo"
  ];

  /* O nome do responsavel e os valores de unidade/data sao TEXTO SOLTO dentro
     da div, sem etiqueta propria. Sem uma etiqueta em volta nao da para tornar
     editavel nem para ler depois: entao envolvo cada um num <b> primeiro. */
  document.querySelectorAll(".capa .ex, .capa .un div").forEach(function (caixa) {
    Array.prototype.slice.call(caixa.childNodes).forEach(function (no) {
      if (no.nodeType === 3 && no.textContent.trim()) {
        const b = document.createElement("b");
        b.className = "valor";
        b.textContent = no.textContent.trim();
        caixa.replaceChild(b, no);
      }
    });
  });

  let quantos = 0;
  SELETORES.forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (el) {
      el.contentEditable = "true";
      el.spellcheck = false;
      quantos++;
    });
  });

  const est = document.createElement("style");
  est.textContent = [
    "[contenteditable]{outline:1px dashed #c3d0cb;outline-offset:2px;border-radius:2px;min-width:16px}",
    ".capa [contenteditable]{outline-color:rgba(255,255,255,.45)}",
    "[contenteditable]:hover{outline-color:#2a9d8a}",
    "[contenteditable]:focus{outline:2px solid #ffb703;background:rgba(255,183,3,.15)}",
    ".li{position:relative}",
    ".li:hover{background:#fbfdfc}",
    ".li .apagar{position:absolute;right:2px;top:2px;border:0;background:#fef3f2;",
    "  color:#b42318;border-radius:6px;width:30px;height:30px;cursor:pointer;",
    "  font-size:15px;line-height:1;opacity:0;transition:opacity .15s}",
    ".li:hover .apagar{opacity:1}",
    ".li.riscada{opacity:.38;text-decoration:line-through}",
    "#painel{position:sticky;top:0;z-index:99;background:#fff;border-bottom:2px solid #1d6b57;",
    "  padding:12px 16px;margin:0 0 14px;display:flex;gap:10px;align-items:center;",
    "  flex-wrap:wrap;font:14px/1.5 -apple-system,'Segoe UI',Roboto,Arial,sans-serif;",
    "  box-shadow:0 4px 14px rgba(16,24,40,.12)}",
    "#painel b{color:#155244}",
    "#painel p{flex:1;min-width:200px;font-size:13px;color:#667085;margin:0}",
    "#painel button{border:1.5px solid #d0d5dd;background:#fff;color:#344054;border-radius:8px;",
    "  padding:10px 15px;font:inherit;font-weight:600;cursor:pointer;min-height:46px}",
    "#painel button.forte{background:#1d6b57;border-color:#1d6b57;color:#fff}",
    "#painel button:hover{border-color:#2a9d8a}",
    "#saida{white-space:pre-wrap;background:#101828;color:#e6efeb;border-radius:10px;",
    "  padding:16px;margin:14px auto;max-width:210mm;display:none;",
    "  font:12.5px/1.6 ui-monospace,Consolas,monospace}",
    "#saida.abre{display:block}",
    "@media print{#painel,#saida,.li .apagar{display:none!important}",
    "  [contenteditable]{outline:none!important;background:none!important}}"
  ].join("\n");
  document.head.appendChild(est);

  /* um X por linha, para ela tirar do rascunho o que nao quer na folha */
  document.querySelectorAll(".li").forEach(function (li) {
    const x = document.createElement("button");
    x.type = "button";
    x.className = "apagar";
    x.title = "Tirar esta linha do rascunho";
    x.setAttribute("aria-label", "Tirar esta linha do rascunho");
    x.textContent = "×";
    x.addEventListener("click", function () { li.classList.toggle("riscada"); });
    li.appendChild(x);
  });

  const painel = document.createElement("div");
  painel.id = "painel";
  painel.innerHTML =
      "<b>Modo rascunho</b>"
    + "<p>Clique em cima de qualquer texto e escreva por cima. O × tira a linha. "
    + "Nada aqui mexe no site nem no seu banco.</p>"
    + '<button type="button" id="bLimpar">Recomeçar</button>'
    + '<button type="button" class="forte" id="bPegar">Ficou assim, me mostre</button>';
  document.body.insertBefore(painel, document.body.firstChild);

  document.getElementById("bLimpar").addEventListener("click", function () {
    location.reload();
  });

  document.getElementById("bPegar").addEventListener("click", montarResumo);

  /* guarda como cada pedaco estava, para depois eu saber SO o que ela mudou */
  document.querySelectorAll("[contenteditable]").forEach(function (el) {
    el.dataset.antes = limpo(el.textContent);
  });

  console.log("modo rascunho ligado: " + quantos + " pedacos editaveis");
}

function limpo(t) {
  return (t || "").replace(/\s+/g, " ").trim();
}

function montarResumo() {
  function ler(sel) {
    const e = document.querySelector(sel);
    return e ? limpo(e.textContent) : "";
  }

  const linhas = ["COMO EU QUERO A FOLHA:", "", "CABECALHO"];
  linhas.push("  etiqueta de cima: " + ler(".capa .et"));
  linhas.push("  titulo: " + ler(".capa h1"));
  linhas.push("  responsavel: " + ler(".capa .ex b.valor"));
  linhas.push("  nome: " + ler(".capa .rt b"));
  linhas.push("  linha do CRN: " + ler(".capa .rt i"));
  linhas.push("  unidade: " + ler(".capa .un div:nth-child(1) b.valor"));
  linhas.push("  emitido em: " + ler(".capa .un div:nth-child(2) b.valor"));
  linhas.push("  faixa de cima: " + ler(".topo"));
  linhas.push("  os quatro numeros: " + Array.prototype.map.call(
    document.querySelectorAll(".num"), function (x) {
      const r = x.querySelector("span"), v = x.querySelector("b");
      return limpo(r ? r.textContent : "") + " = " + limpo(v ? v.textContent : "");
    }).join(" | "));

  const cab = document.querySelector(".bl.cab");
  if (cab) {
    linhas.push("  colunas da tabela: " + Array.prototype.map.call(
      cab.children, function (c) { return limpo(c.textContent); }).join(" | "));
  }

  const riscadas = Array.prototype.slice.call(document.querySelectorAll(".li.riscada"));
  if (riscadas.length) {
    linhas.push("", "LINHAS QUE EU TIREI (" + riscadas.length + "):");
    riscadas.forEach(function (li) {
      const f = li.querySelector(".f");
      linhas.push("  - " + (f ? limpo(f.textContent).slice(0, 90) : ""));
    });
  }

  const mudou = [];
  document.querySelectorAll("[contenteditable]").forEach(function (el) {
    const antes = el.dataset.antes;
    const agora = limpo(el.textContent);
    if (antes !== undefined && antes !== agora) {
      mudou.push('  "' + antes + '"   ->   "' + agora + '"');
    }
  });
  if (mudou.length) {
    linhas.push("", "O QUE EU REESCREVI (" + mudou.length + "):");
    linhas.push.apply(linhas, mudou);
  } else {
    linhas.push("", "(nao reescrevi nada ainda)");
  }

  const texto = linhas.join("\n");
  let saida = document.getElementById("saida");
  if (!saida) {
    saida = document.createElement("div");
    saida.id = "saida";
    document.body.appendChild(saida);
  }
  saida.textContent = texto;
  saida.classList.add("abre");
  saida.scrollIntoView({ block: "center", behavior: "smooth" });

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(texto).then(function () {
      saida.textContent = texto + "\n\n(ja copiei para voce: e so colar na conversa)";
    }, function () {});
  }
}
