/* ==================================================================
   COMPRAS — a aba de quem compra
   ==================================================================

   POR QUE ESTA ABA EXISTE (26/08/2026)

   Ela perguntou se havia uma aba para compras. Não havia. O resultado:
   "comprar 30 bandejas brancas" e "comprar 1 papeleira" viviam na aba de
   qualidade e na folha de manutenção, misturados com desvio de boas práticas
   e com serviço de quem conserta. Duas consequências, as duas ruins:

     1. quem compra nunca via a lista — não existia lista;
     2. o número de não conformidades que ela leva à gerência ficava inflado
        por coisas que não são desvio de manipulação, são compra.

   O levantamento de 26/08 achou 63 pedidos de compra espalhados assim.

   O DESENHO É DELA. Registrado quando pediu a aba:
     fixa para todas as empresas · por piso e área · unificada por setor ·
     numerada · com campo de link de compra e link de dica de compra.

   O QUE OS DADOS ACRESCENTARAM
   As respostas da gerência já estavam escritas dentro dos pedidos antigos:
   "comprado, aguardando instalar", "ciente, não vai comprar", "no momento não
   irá comprar". Isso virou o campo SITUAÇÃO — sem ele, um pedido recusado fica
   para sempre na lista como se estivesse esperando.

   O MODO DE QUEM COMPRA (o botão "Juntar iguais")
   O mesmo item pedido em três áreas são três linhas aqui, porque cada área
   precisa saber o que falta nela. Mas quem compra precisa de UMA linha com a
   soma. O botão junta os iguais e mostra em quantos lugares o item é pedido.

   REGRAS QUE VALEM AQUI
   - Ela NUNCA orça: item de compra nunca vira "orçar". A ideia técnica dela
     vai no campo de observação, e quem faz preço é quem compra.
   - Nada grava com metaSet: só metaSetU, senão o desfazer dela não pega.
   - Global de outro arquivo sempre com typeof, nunca window.X.
   ================================================================== */

/* as quatro situações possíveis, na ordem em que a vida acontece */
const CMP_SIT = {
  pedido:   {rot:"Pedido",              selo:"bd-selo-info"},
  comprado: {rot:"Comprado",            selo:"bd-selo-ok"},
  instalar: {rot:"Comprado, a instalar", selo:"bd-selo-atencao"},
  recusado: {rot:"Não vai comprar",     selo:"bd-selo-neutro"}
};
const CMP_SIT_ORDEM = ["pedido","instalar","comprado","recusado"];

/* o filtro da tela. Mora só na memória: é escolha do momento, não configuração */
let CMPF = {q:"", piso:"", area:"", sit:"", juntar:false};
let CMP_EDITANDO = null;

function cmpItens(){
  return DATA.filter(d => !d.deleted && d.tipo === "cmp" && d.loja === currentStore);
}
function cmpTexto(d){ return (d.oque || "").trim(); }
function cmpSit(d){ return CMP_SIT[d.situacao] ? d.situacao : "pedido"; }
/* O QUE CONTA COMO PENDENTE (28/08) — sem isto, o cartão da empresa e o
   "X em aberto" do topo davam ZERO para esta aba: a conta padrão procura
   status "Pendente", palavra que este tipo nunca usou. */
/* comprado e a instalar ja sairam da fila de compra; recusado nao conta nem
   como pendente nem como resolvido, porque a gerencia decidiu nao comprar. */
STATUS_FNS.cmp={isPend:d=>cmpSit(d)==="pedido",
  isDone:d=>cmpSit(d)==="comprado"||cmpSit(d)==="instalar"};

/* piso escrito de dois jeitos já fez serviço sumir do filtro da folha em 25/08.
   Aqui a comparação é sempre pela forma limpa, nunca letra por letra. */
function cmpChavePiso(p){
  return (p || "").normalize("NFD").replace(/[̀-ͯ]/g,"")
         .replace(/\s+/g," ").trim().toUpperCase();
}
function cmpCmpPiso(a,b){
  const n = t => { const m = cmpChavePiso(t).match(/^(\d+)/); return m ? +m[1] : 99; };
  return n(a) - n(b) || cmpChavePiso(a).localeCompare(cmpChavePiso(b));
}

/* ------------------------------------------------------------------ filtrar */
function cmpFiltrados(){
  const q = (CMPF.q || "").toLowerCase().trim();
  return cmpItens().filter(d => {
    if (CMPF.piso && cmpChavePiso(d.piso) !== cmpChavePiso(CMPF.piso)) return false;
    if (CMPF.area && (d.area || "") !== CMPF.area) return false;
    if (CMPF.sit && cmpSit(d) !== CMPF.sit) return false;
    if (!q) return true;
    return (cmpTexto(d) + " " + (d.area||"") + " " + (d.obs||"")).toLowerCase().includes(q);
  });
}

/* ---------------------------------------------------------------- a tela */
async function renderCompras(){
  const el = document.getElementById("tab-compras");
  if (!el) return;

  const todos = cmpItens();
  const itens = cmpFiltrados();
  const loja  = (typeof empresa === "function" && empresa(currentStore) || {}).name
                || currentStoreName || currentStore || "";

  const conta = {};
  CMP_SIT_ORDEM.forEach(s => conta[s] = todos.filter(d => cmpSit(d) === s).length);
  /* um item comprado mas ainda nao instalado NAO esta esperando compra: ja foi
     comprado. Contar nos dois lugares faria o numero mentir para os dois lados. */
  const esperando = conta.pedido;

  const pisos = [...new Set(todos.map(d => d.piso).filter(Boolean))].sort(cmpCmpPiso);
  const areas = [...new Set(todos.filter(d => !CMPF.piso ||
                  cmpChavePiso(d.piso) === cmpChavePiso(CMPF.piso))
                  .map(d => d.area).filter(Boolean))].sort();

  el.innerHTML = `
    <div class="cmp-capa">
      <div class="cmp-capa-et">Lista de compras</div>
      <div class="cmp-capa-tit">${esc(loja)}</div>
      <div class="cmp-capa-sub">O que precisa ser comprado, por piso e por área</div>
    </div>

    <div class="bd-kpis cmp-nums">
      <div class="bd-kpi"><div class="bd-kpi-nome">Esperando compra</div>
        <div class="bd-kpi-num">${esperando}</div></div>
      <div class="bd-kpi"><div class="bd-kpi-nome">Já comprados</div>
        <div class="bd-kpi-num">${conta.comprado + conta.instalar}</div></div>
      <div class="bd-kpi"><div class="bd-kpi-nome">A gerência recusou</div>
        <div class="bd-kpi-num">${conta.recusado}</div></div>
    </div>

    <div class="cmp-barra">
      <input autocomplete="off" spellcheck="false" type="search" class="bd-campo cmp-busca" id="cmp-q" placeholder="Procurar o que comprar…"
             value="${esc(CMPF.q)}" oninput="cmpFiltro('q',this.value)">
      <select class="bd-campo" onchange="cmpFiltro('piso',this.value)" aria-label="Piso">
        <option value="">Todos os pisos</option>
        ${pisos.map(p => `<option value="${esc(p)}"${CMPF.piso===p?" selected":""}>${esc(p)}</option>`).join("")}
      </select>
      <select class="bd-campo" onchange="cmpFiltro('area',this.value)" aria-label="Área">
        <option value="">Todas as áreas</option>
        ${areas.map(a => `<option value="${esc(a)}"${CMPF.area===a?" selected":""}>${esc(a)}</option>`).join("")}
      </select>
      <select class="bd-campo" onchange="cmpFiltro('sit',this.value)" aria-label="Situação">
        <option value="">Qualquer situação</option>
        ${CMP_SIT_ORDEM.map(s => `<option value="${s}"${CMPF.sit===s?" selected":""}>${CMP_SIT[s].rot}</option>`).join("")}
      </select>
      <button class="bd-btn ${CMPF.juntar?"bd-btn-principal":"bd-btn-secundario"}"
              onclick="cmpJuntar()" aria-pressed="${CMPF.juntar}">
        ${CMPF.juntar ? "Ver por área" : "Juntar iguais"}
      </button>
      <button class="bd-btn bd-btn-secundario" onclick="cmpNovo()">+ Item</button>
      <button class="bd-btn bd-btn-secundario" onclick="cmpImprimir()">Imprimir / PDF</button>
    </div>

    <div id="cmp-lista"></div>`;

  cmpRenderLista();
}

/* ------------------------------------------------------------- a lista */
function cmpRenderLista(){
  const alvo = document.getElementById("cmp-lista");
  if (!alvo) return;
  const itens = cmpFiltrados();

  if (!itens.length){
    alvo.innerHTML = `<div class="bd-vazio">
      <div class="bd-vazio-tit">Nenhum item aqui ainda</div>
      <div class="bd-vazio-txt">${cmpItens().length
        ? "Nada com esse filtro. Limpe a busca para ver tudo."
        : "Toque em <b>+ Item</b> para escrever o primeiro pedido de compra."}</div>
    </div>`;
    return;
  }

  alvo.innerHTML = CMPF.juntar ? cmpListaJunta(itens) : cmpListaPorArea(itens);
}

/* o modo de sempre: por piso, depois por área, numerado de ponta a ponta */
function cmpListaPorArea(itens){
  const por = {};
  itens.forEach(d => {
    const p = d.piso || "Sem piso", a = d.area || "Sem área";
    (por[p] = por[p] || {}), (por[p][a] = por[p][a] || []).push(d);
  });
  let n = 0, saida = "";
  Object.keys(por).sort(cmpCmpPiso).forEach(p => {
    saida += `<h3 class="cmp-piso">${esc(p)}</h3>`;
    Object.keys(por[p]).sort().forEach(a => {
      const lista = por[p][a];
      saida += `<div class="cmp-area"><span>${esc(a)}</span>
                  <b>${lista.length} ${lista.length===1?"item":"itens"}</b></div>`;
      lista.forEach(d => { n++; saida += cmpLinha(d, n); });
    });
  });
  return saida;
}

/* o modo de quem compra: um item, uma linha, com a soma e os lugares onde é pedido */
function cmpListaJunta(itens){
  const grupos = {};
  itens.forEach(d => {
    /* junta pelo texto sem acento e sem maiúscula: "Comprar 1 papeleira" e
       "comprar 1 PAPELEIRA" são o mesmo pedido de compra */
    const k = cmpTexto(d).normalize("NFD").replace(/[̀-ͯ]/g,"")
              .replace(/[^a-z0-9 ]/gi," ").replace(/\s+/g," ").trim().toLowerCase();
    (grupos[k] = grupos[k] || []).push(d);
  });
  const chaves = Object.keys(grupos).sort((x,y) => grupos[y].length - grupos[x].length
                 || cmpTexto(grupos[x][0]).localeCompare(cmpTexto(grupos[y][0])));
  let n = 0, saida = `<div class="cmp-aviso bd-aviso bd-aviso-info">
    <b>Modo de quem compra.</b> Os pedidos iguais viraram uma linha só, com os lugares
    onde cada um foi pedido. Para saber o que falta em cada área, volte para “Ver por área”.
  </div>`;
  chaves.forEach(k => {
    const g = grupos[k];
    n++;
    const lugares = [...new Set(g.map(d => (d.area || "Sem área")))];
    const soma = g.reduce((t,d) => t + (Number(d.qtd) || 1), 0);
    const d = g[0];
    saida += `<div class="cmp-item cmp-junto">
      <div class="cmp-n">${n}</div>
      <div class="cmp-corpo">
        <div class="cmp-oque">${esc(cmpTexto(d))}</div>
        ${/* a quantidade nao pode sumir quando o item foi pedido num lugar so:
             "30 bandejas" pedidas uma vez continuam sendo 30 para quem compra */""}
        <div class="cmp-onde">${g.length > 1
          ? `<b>${soma} no total</b> · pedido em ${lugares.length} ${lugares.length===1?"lugar":"lugares"}: ${esc(lugares.join(", "))}`
          : `${soma > 1 ? `<b>${soma} unidades</b> · ` : ""}${esc(lugares[0])}`}</div>
        ${cmpLinks(d)}
      </div>
      <div class="cmp-lado">${cmpSelos(g)}</div>
    </div>`;
  });
  return saida;
}

/* os selos de situação de um grupo: se todos iguais, um selo; se não, a conta */
function cmpSelos(g){
  const c = {};
  g.forEach(d => c[cmpSit(d)] = (c[cmpSit(d)] || 0) + 1);
  return CMP_SIT_ORDEM.filter(s => c[s]).map(s =>
    `<span class="bd-selo ${CMP_SIT[s].selo}">${CMP_SIT[s].rot}${g.length>1?` (${c[s]})`:""}</span>`
  ).join("");
}

function cmpLinks(d){
  const l = [];
  if (d.link) l.push(`<a href="${esc(d.link)}" target="_blank" rel="noopener">Onde comprar</a>`);
  if (d.linkDica) l.push(`<a href="${esc(d.linkDica)}" target="_blank" rel="noopener">Dica de compra</a>`);
  return l.length ? `<div class="cmp-links">${l.join("")}</div>` : "";
}

function cmpLinha(d, n){
  if (CMP_EDITANDO === d.id) return cmpForm(d, n);
  const s = cmpSit(d);
  return `<div class="cmp-item${d.urg ? " cmp-urg" : ""}">
    <div class="cmp-n">${n}</div>
    <div class="cmp-corpo">
      <div class="cmp-oque">${d.urg ? '<i class="cmp-urgselo">URGENTE</i> ' : ""}${esc(cmpTexto(d))}</div>
      ${Number(d.qtd) > 1 ? `<div class="cmp-qtd">${Number(d.qtd)} unidades</div>` : ""}
      ${d.obs ? `<div class="cmp-obs">${esc(d.obs)}</div>` : ""}
      ${d.nota ? `<div class="cmp-nota"><b>Letícia revisar urgente 🔒</b>${esc(d.nota)}</div>` : ""}
      ${cmpLinks(d)}
    </div>
    <div class="cmp-lado">
      <span class="bd-selo ${CMP_SIT[s].selo}">${CMP_SIT[s].rot}</span>
      <button class="cmp-lapis" onclick="cmpEditar(${d.id})" aria-label="Editar este item">✎</button>
    </div>
  </div>`;
}

/* ------------------------------------------------------------- o formulário */
function cmpForm(d, n){
  const pisos = [...new Set(cmpItens().map(x => x.piso).filter(Boolean))].sort(cmpCmpPiso);
  const areas = [...new Set(cmpItens().map(x => x.area).filter(Boolean))].sort();
  if (d.piso && !pisos.includes(d.piso)) pisos.push(d.piso);
  if (d.area && !areas.includes(d.area)) areas.push(d.area);
  return `<div class="cmp-item cmp-editando">
    <div class="cmp-n">${n}</div>
    <div class="cmp-form">
      <div class="bd-grupo">
        <label class="bd-rotulo" for="cmpf-oque">O que comprar</label>
        <textarea class="bd-campo" id="cmpf-oque" rows="2"
          placeholder="Comprar 2 lixeiras pequenas com tampa e pedal.">${esc(d.oque || "")}</textarea>
      </div>
      <div class="cmp-form-linha">
        <div class="bd-grupo"><label class="bd-rotulo" for="cmpf-qtd">Quantidade</label>
          <input class="bd-campo" id="cmpf-qtd" type="number" min="1" value="${Number(d.qtd) || 1}"></div>
        <div class="bd-grupo"><label class="bd-rotulo" for="cmpf-piso">Piso</label>
          <select class="bd-campo" id="cmpf-piso">
            ${pisos.map(p => `<option${p===d.piso?" selected":""}>${esc(p)}</option>`).join("")}
          </select></div>
        <div class="bd-grupo"><label class="bd-rotulo" for="cmpf-area">Área</label>
          <select class="bd-campo" id="cmpf-area">
            ${areas.map(a => `<option${a===d.area?" selected":""}>${esc(a)}</option>`).join("")}
          </select></div>
        <div class="bd-grupo"><label class="bd-rotulo" for="cmpf-sit">Situação</label>
          <select class="bd-campo" id="cmpf-sit">
            ${CMP_SIT_ORDEM.map(s => `<option value="${s}"${cmpSit(d)===s?" selected":""}>${CMP_SIT[s].rot}</option>`).join("")}
          </select></div>
      </div>
      <div class="cmp-form-linha">
        <div class="bd-grupo"><label class="bd-rotulo" for="cmpf-link">Onde comprar (link)</label>
          <input class="bd-campo" id="cmpf-link" value="${esc(d.link || "")}" placeholder="https://…"></div>
        <div class="bd-grupo"><label class="bd-rotulo" for="cmpf-dica">Dica de compra (link)</label>
          <input class="bd-campo" id="cmpf-dica" value="${esc(d.linkDica || "")}" placeholder="https://…"></div>
      </div>
      <div class="bd-grupo">
        <label class="bd-rotulo" for="cmpf-obs">Lembretes</label>
        <textarea class="bd-campo" id="cmpf-obs" rows="2"
          placeholder="O que a gerência respondeu, a marca certa, a medida.">${esc(d.obs || "")}</textarea>
      </div>
      <div class="bd-grupo">
        <label class="bd-rotulo" for="cmpf-nota">Letícia revisar urgente 🔒 <span class="bd-ajuda">não sai na impressão</span></label>
        <textarea class="bd-campo" id="cmpf-nota" rows="2">${esc(d.nota || "")}</textarea>
      </div>
      <label class="bd-check-linha">
        <input type="checkbox" class="bd-check" id="cmpf-urg"${d.urg ? " checked" : ""}>
        <span class="bd-check-txt">Urgente</span>
      </label>
      <div class="cmp-form-acoes">
        <button class="bd-btn bd-btn-principal" onclick="cmpSalvar(${d.id})">Salvar</button>
        <button class="bd-btn bd-btn-secundario" onclick="cmpCancelar()">Cancelar</button>
        <button class="bd-btn bd-btn-perigo" onclick="cmpExcluir(${d.id})">Excluir</button>
      </div>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ ações */
function cmpFiltro(k, v){
  CMPF[k] = v;
  if (k === "piso") CMPF.area = "";
  if (k === "q") { cmpRenderLista(); return; }
  renderCompras();
}
function cmpJuntar(){ CMPF.juntar = !CMPF.juntar; renderCompras(); }
function cmpEditar(id){ CMP_EDITANDO = id; cmpRenderLista(); }
function cmpCancelar(){ CMP_EDITANDO = null; cmpRenderLista(); }

async function cmpNovo(){
  const itens = cmpItens();
  const pisos = [...new Set(itens.map(d => d.piso).filter(Boolean))].sort(cmpCmpPiso);
  const o = {
    uid: newUid(), mod: nowISO(), tipo: "cmp", loja: currentStore,
    piso: CMPF.piso || pisos[0] || "1º PISO",
    area: CMPF.area || (itens.find(d => d.area) || {}).area || "",
    oque: "", qtd: 1, situacao: "pedido", link: "", linkDica: "",
    obs: "", nota: "", urg: false, fotos: [],
    dataRegistro: today(), relato: today(), criado: "manual"
  };
  const id = await putItem(o); o.id = id; DATA.push(o); dataChanged();
  CMP_EDITANDO = id;
  renderCompras();
  const c = document.querySelector(".cmp-form textarea"); if (c) c.focus();
}

async function cmpSalvar(id){
  const d = DATA.find(x => x.id === id); if (!d) return;
  const oque = document.getElementById("cmpf-oque").value.trim();
  if (!oque){ toast("Escreva o que precisa ser comprado."); return; }
  d.oque = oque;
  d.qtd = Math.max(1, Number(document.getElementById("cmpf-qtd").value) || 1);
  d.piso = document.getElementById("cmpf-piso").value;
  d.area = document.getElementById("cmpf-area").value;
  d.situacao = document.getElementById("cmpf-sit").value;
  d.link = document.getElementById("cmpf-link").value.trim();
  d.linkDica = document.getElementById("cmpf-dica").value.trim();
  d.obs = document.getElementById("cmpf-obs").value.trim();
  d.nota = document.getElementById("cmpf-nota").value.trim();
  d.urg = !!document.getElementById("cmpf-urg")?.checked;
  d.mod = nowISO();
  await putItem(d); dataChanged();
  CMP_EDITANDO = null;
  renderCompras(); toast("Item de compra salvo ✓");
}

async function cmpExcluir(id){
  const d = DATA.find(x => x.id === id); if (!d) return;
  /* item que veio da folha de manutenção (botão "Compras" da demanda): ao tirar
     daqui, a marca "na lista de compras" sai da demanda, mas a demanda continua
     na manutenção. Ela pediu esse aviso em 29/08. */
  const msg = d.origemMnt
    ? "Este item veio da folha de manutenção" + (d.area ? " (" + d.area + ")" : "")
      + ".\n\nAo tirar daqui, a marca “na lista de compras” sai da demanda, mas a "
      + "demanda continua na manutenção.\n\nTirar da lista de compras?"
    : "Excluir este item de compra?\n\n" + cmpTexto(d);
  if (!confirm(msg)) return;
  d.deleted = true; d.mod = nowISO();
  await putItem(d); dataChanged();
  CMP_EDITANDO = null; renderCompras(); toast("Item excluído");
}

/* -------------------------------------------------------------- imprimir */
/* A lista que vai para a mão de quem compra. Mesmo desenho da folha de
   manutenção: cabeçalho verde com a faixa em três, escolhido por ela em 26/08. */
function cmpImprimir(){
  const itens = cmpFiltrados().filter(d => cmpSit(d) !== "recusado");
  if (!itens.length){ toast("Não há nada para imprimir com este filtro."); return; }
  const loja = (typeof empresa === "function" && empresa(currentStore) || {}).name
               || currentStoreName || currentStore || "";
  const iso = today(), partes = iso.split("-");
  const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho",
                 "agosto","setembro","outubro","novembro","dezembro"];
  const mes = meses[Number(partes[1]) - 1] || "";
  const quando = mes ? (mes.charAt(0).toUpperCase() + mes.slice(1) + " de " + partes[0]) : "";

  const faixa = [["loja", "Loja", (currentStore || "").trim()],
                 ["piso", "Piso", CMPF.piso || "Todos"],
                 ["mes",  "Mês",  quando]]
    .filter(x => x[2])
    .map(x => `<div class="${x[0]}"><span>${esc(x[1])}</span><b>${esc(x[2])}</b></div>`).join("");

  let corpo = "", n = 0;
  const por = {};
  itens.forEach(d => {
    const p = d.piso || "Sem piso", a = d.area || "Sem área";
    (por[p] = por[p] || {}), (por[p][a] = por[p][a] || []).push(d);
  });
  Object.keys(por).sort(cmpCmpPiso).forEach(p => {
    Object.keys(por[p]).sort().forEach(a => {
      corpo += `<div class="ar">${esc(a)} <b>${esc(p)}</b></div>`;
      corpo += `<div class="cab"><div class="c">Nº</div><div class="f">O que comprar</div>
                <div class="c">Qtd.</div><div class="c">Situação</div></div>`;
      por[p][a].forEach(d => {
        n++;
        corpo += `<div class="li"><div class="c">${n}</div>
          <div class="f">${d.urg ? '<i class="ug">URGENTE</i> ' : ""}${esc(cmpTexto(d))}
            ${d.obs ? `<i class="obs-p"><b>Obs:</b>${esc(d.obs)}</i>` : ""}</div>
          <div class="c">${Number(d.qtd) || 1}</div>
          <div class="c">${CMP_SIT[cmpSit(d)].rot}</div></div>`;
      });
    });
  });

  const w = window.open("");
  if (!w){ toast("O navegador bloqueou a janela de impressão. Libere as janelas para este site."); return; }
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
    <title>Lista de compras — ${esc(loja)}</title><style>
    @page{size:A4;margin:0}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
      color:#344054;font-size:12.4px;line-height:1.5;background:#e9ebee}
    .folha{width:210mm;min-height:297mm;background:#fff;margin:0 auto 14px;padding:11mm 12mm 15mm;
      box-shadow:0 4px 18px rgba(16,24,40,.14)}
    .topo{font-size:8.6px;color:#667085;border-bottom:1px solid #eaecf0;padding-bottom:5px;margin-bottom:9px}
    /* mesmo cabecalho da folha de manutencao -- se um mudar, o outro muda junto */
    .capa{background:linear-gradient(155deg,#146b61 0%,#1a8074 100%);color:#fff;
      padding:12px 16px;border-radius:8px;margin-bottom:11px;
      -webkit-print-color-adjust:exact;print-color-adjust:exact}
    .et{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,.88)}
    .assunto{font-size:21px;font-weight:700;letter-spacing:-.4px;line-height:1.1;margin-top:3px}
    .faixa{display:flex;margin-top:10px;border:1px solid rgba(255,255,255,.34);border-radius:6px;
      overflow:hidden;background:rgba(255,255,255,.14);
      -webkit-print-color-adjust:exact;print-color-adjust:exact}
    .faixa div{flex:1;padding:7px 11px;border-right:1px solid rgba(255,255,255,.28);text-align:center}
    .faixa div:last-child{border-right:0}
    .faixa span{display:block;font-size:7.4px;text-transform:uppercase;letter-spacing:1px;
      color:rgba(255,255,255,.92);font-weight:600}
    .faixa b{font-size:14.5px;font-weight:700;letter-spacing:.2px;color:#fff}
    .faixa .mes{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .faixa .mes span{color:#7a2b23}
    .faixa .mes b{color:#b42318}
    .pe{display:flex;gap:18px;flex-wrap:wrap;align-items:baseline;margin-top:9px;padding-top:7px;
      border-top:1px solid rgba(255,255,255,.26);font-size:9.6px}
    .pe div{display:flex;align-items:baseline;gap:5px}
    .pe span{font-size:7.6px;text-transform:uppercase;letter-spacing:.9px;color:rgba(255,255,255,.82)}
    .pe b{font-weight:600;font-size:10.2px;color:#fff}
    .ar{display:flex;justify-content:space-between;align-items:baseline;background:#e8f5f0;
      border-left:3px solid #1d6b57;padding:5px 9px;margin-top:14px;font-size:12px;font-weight:700;
      color:#155244;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .ar b{font-weight:600;color:#667085;font-size:9px}
    .cab,.li{display:grid;grid-template-columns:32px 1fr 46px 96px;gap:8px;padding:4px 8px}
    .cab{font-size:9.3px;text-transform:uppercase;letter-spacing:.5px;color:#667085;font-weight:700;
      text-align:center;border-bottom:1px solid #eaecf0}
    .cab .f{text-align:left}
    .cab .c,.li .c{text-align:center}
    .li{border-bottom:1px solid #f2f4f7;align-items:start}
    /* a pastilha do recado, igual a da folha de manutencao */
    .li .obs-p{display:block;font-style:normal;font-size:11.2px;line-height:1.45;
      color:#475467;background:#f2f4f7;border-radius:6px;padding:5px 9px;margin-top:5px;
      white-space:pre-wrap;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .li .obs-p b{font-weight:700;color:#344054;margin-right:4px}
    .ug{font-style:normal;font-weight:700;color:#b42318;letter-spacing:.4px}
    </style></head><body><div class="folha">
      <div class="topo">Central de Demandas NP · ${esc(loja)} · Emitido em ${brDate(iso)}</div>
      <div class="capa">
        <div class="et">Lista de compras</div>
        <div class="assunto">Compras e Reposição</div>
        ${faixa ? `<div class="faixa">${faixa}</div>` : ""}
        <div class="pe">
          <div><span>Unidade</span><b>${esc(loja)}</b></div>
          <div><span>Emitido em</span><b>${brDate(iso)}</b></div>
          <div><span>Itens</span><b>${n}</b></div>
        </div>
      </div>
      ${corpo}
    </div></body></html>`;
  w.document.open(); w.document.write(html); w.document.close();
  setTimeout(() => { try { w.focus(); w.print(); } catch(e){} }, 300);
}
