/* MODO LAYOUT — arquivo de trabalho, nao faz parte do site.

   Vai junto com o modo-rascunho.js. Enquanto aquele libera o TEXTO, este libera
   o DESENHO: mover bloco de lugar, aumentar e diminuir, juntar dois num so.

   Pedido dela em 25/08/2026:
     "eu quero que tenha a opcao de aumentar ou diminuir. e tambem de mesclar os
      quadradinhos. tirar um quadrado, que representa o meu nome, e a minha
      funcao, e colocar em outro lugar, eu poderia, assim como outros?"

   Nada aqui toca no banco nem no site publicado. */

/* Palavras que ela pode querer no lugar das que estao la. Clicar no rotulo abre
   a lista. "A fazer" ela marcou com "?" — ainda esta decidindo. */
const SUGESTOES = {
  "A fazer":   ["Pendentes", "Em aberto", "Falta fazer", "A executar",
                "Não feitos", "Aguardando", "Em andamento", "Para fazer"],
  "Serviços":  ["DEMANDAS", "Total", "Itens", "Solicitações", "Serviços"],
  "DEMANDAS":  ["Total de demandas", "Demandas", "Serviços", "Itens"],
  "Feitos":    ["Concluídos", "Resolvidos", "Prontos", "Executados", "Entregues"],
  "Urgentes":  ["Prioridade", "Urgente", "Atenção", "Prioritários"]
};

function ligarLayout() {
  const est = document.createElement("style");
  est.textContent = [
    /* alca de arrastar */
    "[data-mover]{position:relative}",
    "[data-mover].arrastando{opacity:.45}",
    "[data-mover].alvo{outline:2px dashed #1d6b57;outline-offset:3px}",
    ".alca{position:absolute;left:-9px;top:-9px;z-index:5;width:26px;height:26px;",
    "  border:0;border-radius:50%;background:#1d6b57;color:#fff;cursor:grab;",
    "  font-size:13px;line-height:1;opacity:0;transition:opacity .15s}",
    "[data-mover]:hover .alca{opacity:1}",
    ".alca:active{cursor:grabbing}",
    /* botoes de tamanho e de juntar */
    ".ferramentas{position:absolute;right:-6px;top:-9px;z-index:5;display:flex;gap:3px;",
    "  opacity:0;transition:opacity .15s}",
    "[data-mover]:hover .ferramentas{opacity:1}",
    ".ferramentas button{border:0;border-radius:6px;background:#155244;color:#fff;",
    "  width:26px;height:26px;cursor:pointer;font-size:13px;line-height:1;padding:0}",
    ".ferramentas button:hover{background:#2a9d8a}",
    ".ferramentas button.juntar{background:#8a5209;width:auto;padding:0 8px;font-size:11px}",
    ".ferramentas button.juntar.pronto{background:#b42318}",
    ".num.juntado{flex:2}",
    /* URGENTES em vermelho leve, da mesma escada de cores do site.
       A PALAVRA continua escrita: em preto e branco a cor some, e cor nunca
       pode ser a unica forma de dizer alguma coisa. */
    ".num.urgente{background:#fef3f2;border-color:#fecdca}",
    ".num.urgente span{color:#b42318}",
    ".num.urgente b{color:#912018}",
    ".num.urgente.zero{background:#fcfcfd;border-color:#eaecf0}",
    ".num.urgente.zero span{color:#667085}",
    ".num.urgente.zero b{color:#344054}",
    /* painel do layout */
    "#painelLayout{position:sticky;top:64px;z-index:98;background:#155244;color:#fff;",
    "  padding:10px 16px;margin:0 0 12px;display:flex;gap:10px;align-items:center;",
    "  flex-wrap:wrap;font:13px/1.5 -apple-system,'Segoe UI',Roboto,Arial,sans-serif}",
    "#painelLayout b{font-size:14px}",
    "#painelLayout p{flex:1;min-width:220px;margin:0;opacity:.9}",
    "#painelLayout button{border:1.5px solid rgba(255,255,255,.45);background:transparent;",
    "  color:#fff;border-radius:8px;padding:8px 13px;font:inherit;font-weight:600;",
    "  cursor:pointer;min-height:42px}",
    "#painelLayout button:hover{background:rgba(255,255,255,.16)}",
    /* lista de palavras */
    "#palavras{position:fixed;z-index:200;background:#fff;border:2px solid #1d6b57;",
    "  border-radius:10px;padding:8px;box-shadow:0 10px 30px rgba(16,24,40,.28);",
    "  display:none;max-width:280px}",
    "#palavras.abre{display:block}",
    "#palavras button{display:block;width:100%;text-align:left;border:0;background:none;",
    "  padding:10px 12px;font:inherit;font-size:14px;cursor:pointer;border-radius:7px;",
    "  min-height:44px;color:#344054}",
    "#palavras button:hover{background:#e8f5f0;color:#155244}",
    "@media print{#painelLayout,#palavras,.alca,.ferramentas{display:none!important}",
    "  [data-mover].alvo{outline:none!important}}"
  ].join("\n");
  document.head.appendChild(est);

  /* --------- o que pode ser movido: os 4 quadradinhos e as caixas da capa --------- */
  const MOVIVEIS = [".num", ".capa > div"];
  MOVIVEIS.forEach(function (sel) {
    document.querySelectorAll(sel).forEach(prepararBloco);
  });

  pintarUrgentes();
  montarPainel();
  montarListaDePalavras();
}

/* Vermelho so quando ha urgente de verdade. Com zero urgentes o quadradinho
   fica neutro: pintar de vermelho um zero assusta a gerencia a toa. */
function pintarUrgentes() {
  document.querySelectorAll(".num").forEach(function (n) {
    const rot = n.querySelector("span"), val = n.querySelector("b");
    if (!rot) return;
    const eUrgente = /urgen|priorid|aten/i.test(rot.textContent);
    n.classList.toggle("urgente", eUrgente);
    if (eUrgente) {
      const zero = !val || parseInt(val.textContent, 10) === 0;
      n.classList.toggle("zero", zero);
    }
  });
}

function prepararBloco(bloco) {
  bloco.dataset.mover = "1";
  bloco.draggable = false;

  const alca = document.createElement("button");
  alca.type = "button";
  alca.className = "alca";
  alca.title = "Segure e arraste para mudar de lugar";
  alca.setAttribute("aria-label", "Mover este bloco");
  alca.textContent = "✥";
  alca.draggable = true;
  bloco.appendChild(alca);

  const fer = document.createElement("div");
  fer.className = "ferramentas";
  fer.innerHTML =
      '<button type="button" data-menor title="Diminuir">−</button>'
    + '<button type="button" data-maior title="Aumentar">+</button>'
    + '<button type="button" class="juntar" data-juntar title="Juntar com o bloco do lado">juntar</button>';
  bloco.appendChild(fer);

  /* ---- arrastar: a alca carrega o bloco inteiro ---- */
  alca.addEventListener("dragstart", function (ev) {
    bloco.classList.add("arrastando");
    ev.dataTransfer.effectAllowed = "move";
    try { ev.dataTransfer.setData("text/plain", "bloco"); } catch (e) {}
    window.__blocoArrastado = bloco;
  });
  alca.addEventListener("dragend", function () {
    bloco.classList.remove("arrastando");
    document.querySelectorAll(".alvo").forEach(function (x) { x.classList.remove("alvo"); });
    window.__blocoArrastado = null;
  });

  bloco.addEventListener("dragover", function (ev) {
    const vindo = window.__blocoArrastado;
    if (!vindo || vindo === bloco) return;
    if (vindo.parentElement !== bloco.parentElement) return;  /* so troca com irmao */
    ev.preventDefault();
    bloco.classList.add("alvo");
  });
  bloco.addEventListener("dragleave", function () { bloco.classList.remove("alvo"); });
  bloco.addEventListener("drop", function (ev) {
    ev.preventDefault();
    bloco.classList.remove("alvo");
    const vindo = window.__blocoArrastado;
    if (!vindo || vindo === bloco || vindo.parentElement !== bloco.parentElement) return;
    const pai = bloco.parentElement;
    const filhos = Array.prototype.slice.call(pai.children);
    /* solta ANTES ou DEPOIS, conforme a direcao do movimento */
    if (filhos.indexOf(vindo) < filhos.indexOf(bloco)) pai.insertBefore(vindo, bloco.nextSibling);
    else pai.insertBefore(vindo, bloco);
  });

  /* ---- tamanho ---- */
  fer.querySelector("[data-menor]").addEventListener("click", function () {
    mudarTamanho(bloco, -1);
  });
  fer.querySelector("[data-maior]").addEventListener("click", function () {
    mudarTamanho(bloco, 1);
  });

  /* ---- juntar com o bloco do lado ---- */
  fer.querySelector("[data-juntar]").addEventListener("click", function () {
    juntarComVizinho(bloco, this);
  });

  /* clicar num rotulo abre a lista de palavras */
  const rot = bloco.querySelector("span");
  if (rot) {
    rot.addEventListener("dblclick", function (ev) {
      abrirPalavras(rot, ev);
    });
    rot.title = "Escreva por cima, ou dê dois cliques para ver outras palavras";
  }
}

function mudarTamanho(bloco, passo) {
  const atual = parseFloat(bloco.dataset.peso || "1");
  const novo = Math.min(4, Math.max(0.5, atual + passo * 0.5));
  bloco.dataset.peso = novo;
  bloco.style.flex = novo + " 1 0";
}

function juntarComVizinho(bloco, botao) {
  const vizinho = bloco.nextElementSibling || bloco.previousElementSibling;
  if (!vizinho || !vizinho.dataset.mover) {
    botao.textContent = "sem vizinho";
    setTimeout(function () { botao.textContent = "juntar"; }, 1400);
    return;
  }
  if (bloco.__guardado) {
    /* desfaz: o bloco guardado esta FORA do documento, entao a referencia tem
       de estar em memoria. Procurar por id nao acha o que ja foi removido. */
    const g = bloco.__guardado;
    bloco.parentElement.insertBefore(g, bloco.nextSibling);
    const rotA = bloco.querySelector("span"), valA = bloco.querySelector("b");
    if (rotA && bloco.__rotAntes !== undefined) rotA.textContent = bloco.__rotAntes;
    if (valA && bloco.__valAntes !== undefined) valA.textContent = bloco.__valAntes;
    bloco.__guardado = null;
    bloco.classList.remove("juntado");
    botao.textContent = "juntar";
    botao.classList.remove("pronto");
    return;
  }
  /* junta: o texto do vizinho entra neste bloco, e o vizinho sai da folha */
  const rotA = bloco.querySelector("span"), valA = bloco.querySelector("b");
  const rotB = vizinho.querySelector("span"), valB = vizinho.querySelector("b");
  bloco.__rotAntes = rotA ? rotA.textContent.trim() : undefined;
  bloco.__valAntes = valA ? valA.textContent.trim() : undefined;
  if (rotA && rotB) rotA.textContent = rotA.textContent.trim() + " + " + rotB.textContent.trim();
  if (valA && valB) valA.textContent = valA.textContent.trim() + " + " + valB.textContent.trim();
  bloco.__guardado = vizinho;
  vizinho.remove();
  bloco.classList.add("juntado");
  botao.textContent = "separar";
  botao.classList.add("pronto");
}

/* ------------------------------------------------------ lista de palavras */

function montarListaDePalavras() {
  const caixa = document.createElement("div");
  caixa.id = "palavras";
  document.body.appendChild(caixa);
  document.addEventListener("click", function (ev) {
    if (!ev.target.closest("#palavras") && !ev.target.closest("[data-mover] span")) {
      caixa.classList.remove("abre");
    }
  });
}

function abrirPalavras(rotulo, ev) {
  const caixa = document.getElementById("palavras");
  const atual = rotulo.textContent.trim();
  const chave = Object.keys(SUGESTOES).find(function (k) {
    return k.toLowerCase() === atual.toLowerCase();
  });
  const lista = chave ? SUGESTOES[chave] : [];
  if (!lista.length) return;

  caixa.innerHTML = '<div style="font-size:12px;color:#667085;padding:4px 12px 8px">'
    + "No lugar de “" + atual + "”:</div>"
    + lista.map(function (p) {
        return '<button type="button">' + p + "</button>";
      }).join("");
  caixa.style.left = Math.min(ev.clientX, window.innerWidth - 300) + "px";
  caixa.style.top = (ev.clientY + 10) + "px";
  caixa.classList.add("abre");

  caixa.onclick = function (e) {
    const b = e.target.closest("button");
    if (!b) return;
    rotulo.textContent = b.textContent;
    caixa.classList.remove("abre");
    if (typeof pintarUrgentes === "function") pintarUrgentes();
  };
}

/* ------------------------------------------------------------- painel */

function montarPainel() {
  const p = document.createElement("div");
  p.id = "painelLayout";
  p.innerHTML =
      "<b>Modo desenho</b>"
    + "<p>Passe o mouse num quadradinho: aparece <b>✥</b> para arrastar, "
    + "<b>−</b> e <b>+</b> para o tamanho, e <b>juntar</b> para virar um só. "
    + "Dois cliques num rótulo mostra outras palavras.</p>"
    + '<button type="button" id="bUrgentePrimeiro">Urgentes em primeiro</button>'
    + '<button type="button" id="bConjuntos">Quais quadradinhos mostrar</button>';
  const painelTexto = document.getElementById("painel");
  if (painelTexto) painelTexto.insertAdjacentElement("afterend", p);
  else document.body.insertBefore(p, document.body.firstChild);

  document.getElementById("bConjuntos").addEventListener("click", abrirConjuntos);

  document.getElementById("bUrgentePrimeiro").addEventListener("click", function () {
    const nums = document.querySelector(".nums");
    if (!nums) return;
    const urg = Array.prototype.slice.call(nums.children).find(function (n) {
      const s = n.querySelector("span");
      return s && /urgen|priorid|aten/i.test(s.textContent);
    });
    if (urg) nums.insertBefore(urg, nums.firstChild);
  });
}

/* o resumo do modo rascunho passa a contar tambem a ordem e o tamanho */
function resumoDoLayout() {
  const linhas = [];
  const nums = document.querySelectorAll(".num");
  if (nums.length) {
    linhas.push("  ordem dos quadradinhos: " + Array.prototype.map.call(nums, function (n) {
      const s = n.querySelector("span"), b = n.querySelector("b");
      const peso = n.dataset.peso && n.dataset.peso !== "1" ? " (tamanho " + n.dataset.peso + "x)" : "";
      return (s ? s.textContent.trim() : "") + " = " + (b ? b.textContent.trim() : "") + peso;
    }).join(" | "));
  }
  const capa = document.querySelectorAll(".capa > div[data-mover]");
  if (capa.length > 1) {
    linhas.push("  ordem das caixas da capa: " + Array.prototype.map.call(capa, function (c) {
      const t = c.className || (c.querySelector("h1") ? "titulo" : "caixa");
      return t.replace("alca", "").trim() || "titulo";
    }).join(" | "));
  }
  return linhas;
}


/* ---------------------------------------------- quais quadradinhos mostrar

   Ela viu a redundancia em 25/08: "demandas, ja nao seria a fazer? acho
   redundante". Tem razao: com nada feito, DEMANDAS e A FAZER dao o mesmo
   numero, e total = a fazer + feitos. Aqui ela ve cada conjunto na folha. */

const CONJUNTOS = [
  {rot: "Urgentes · Demandas · Feitos",
   quais: ["urgen", "demanda|servi", "feito|conclu"],
   por: "Três. O que falta se lê sozinho: demandas menos feitos."},
  {rot: "Urgentes · A fazer · Feitos",
   quais: ["urgen", "a fazer|pendent|em aberto|falta", "feito|conclu"],
   por: "Três, sem o total. Ele aparece na lista de qualquer jeito."},
  {rot: "Urgentes · Demandas",
   quais: ["urgen", "demanda|servi"],
   por: "Dois. O mais limpo: quantas são, e quantas não podem esperar."},
  {rot: "Todos os quatro",
   quais: null,
   por: "Como está hoje."}
];

function abrirConjuntos(ev) {
  const caixa = document.getElementById("palavras");
  caixa.innerHTML = '<div style="font-size:12px;color:#667085;padding:4px 12px 8px">'
    + "Quais quadradinhos aparecem:</div>"
    + CONJUNTOS.map(function (c, i) {
        return '<button type="button" data-c="' + i + '" style="padding:11px 12px">'
             + '<b style="display:block;color:#155244">' + c.rot + "</b>"
             + '<span style="font-size:12px;color:#98a2b3">' + c.por + "</span></button>";
      }).join("");
  caixa.style.left = Math.min(ev.clientX, window.innerWidth - 320) + "px";
  caixa.style.top = (ev.clientY + 12) + "px";
  caixa.classList.add("abre");

  caixa.onclick = function (e) {
    const b = e.target.closest("[data-c]");
    if (!b) return;
    aplicarConjunto(CONJUNTOS[+b.getAttribute("data-c")]);
    caixa.classList.remove("abre");
  };
}

function aplicarConjunto(conj) {
  const nums = document.querySelector(".nums");
  if (!nums) return;

  /* nada e apagado: o que sai fica guardado para poder voltar */
  if (!window.__todosOsNumeros) {
    window.__todosOsNumeros = Array.prototype.slice.call(nums.children);
  }
  const todos = window.__todosOsNumeros;

  nums.innerHTML = "";
  if (!conj.quais) {
    todos.forEach(function (n) { nums.appendChild(n); });
  } else {
    conj.quais.forEach(function (padrao) {
      const re = new RegExp(padrao, "i");
      const achou = todos.find(function (n) {
        const s = n.querySelector("span");
        return s && re.test(s.textContent) && n.parentElement !== nums;
      });
      if (achou) nums.appendChild(achou);
    });
  }
  pintarUrgentes();
}
