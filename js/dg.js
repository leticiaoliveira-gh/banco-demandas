/* ===== Aba Demandas Gerais — agenda de tarefas com checklist =====
   Cada demanda é um item {tipo:"dg"} com uma lista PLANA de linhas em `itens[]`,
   onde a hierarquia vive no campo `nivel` (0..n). Isso representa o mesmo que
   as listas aninhadas do Notion, mas é muito mais simples de renderizar e mesclar.

   ATENÇÃO (sync): o merge é last-write-wins por OBJETO INTEIRO (js/sync.js).
   Marcar um subitem no celular enquanto edita o título no PC faz o mais recente
   sobrescrever o outro. O uso é sequencial (um aparelho por vez), então tudo bem —
   mas não introduzir edição simultânea sem repensar isso. */

const DG_PRIOS={
  URGENTE:{rotulo:"URGENTE",cor:"#e5484d",fundo:"#ffecec"},
  ALTA:{rotulo:"ALTA",cor:"#a23bb0",fundo:"#f6ecf8"},
  MEDIA:{rotulo:"MÉDIA",cor:"#b3730a",fundo:"#fdf0e0"},
  BAIXA:{rotulo:"BAIXA",cor:"#12b76a",fundo:"#e6f7ef"}
};
const DG_SIT={
  nao_iniciado:{rotulo:"Não iniciado",cor:"#8a8b96",fundo:"#f1f1f3"},
  andamento:{rotulo:"Em andamento",cor:"#1668b8",fundo:"#e7f0f9"},
  concluido:{rotulo:"Concluído",cor:"#047857",fundo:"#d1fae5"}
};
const DG_SEM={rotulo:"SEM PRIORIDADE",cor:"#8a8b96",fundo:"#f1f1f3"};
let DG_ABERTAS={};        /* uid da demanda -> aberta? (só visual, não sincroniza) */
let DG_GRUPO="prioridade";
/* grupos/blocos recolhidos — igual ao Notion. Fica no aparelho (não sincroniza) */
let DG_FECHADOS=(()=>{try{return JSON.parse(localStorage.getItem("dg_fechados"))||{};}catch(e){return {};}})();
/* DUAS VISÕES da mesma agenda (Lê escolhe qual prefere):
   "lista"  = agrupada por prioridade, em duas colunas (a que ela já aprovou)
   "painel" = quadro geral: faixa de FOCO ("o que eu faço agora") + colunas por prioridade */
let DG_VISAO=localStorage.getItem("dg_visao")||"lista";
let DG_FOCO="";     /* filtro rápido da faixa de foco: atrasadas | hoje | andamento | urgentes */

/* Onde a demanda mora:
   - loja = código do GRUPO (ex.: "SF") quando vale para as lojas do grupo;
   - loja = código da EMPRESA quando ela não pertence a nenhum grupo;
   - escopo = "" (todas as lojas do grupo) ou o código de UMA loja (exclusiva dela). */
function dgLojaBase(){const g=grupoDe(currentStore);return g||currentStore;}
function dgVivos(){
  const base=dgLojaBase();
  return DATA.filter(d=>!d.deleted&&d.tipo==="dg"&&d.loja===base
    &&(!d.escopo||d.escopo===currentStore));
}
function dgCompartilhada(d){return grupoDe(currentStore)&&!d.escopo;}
function dgOrdenar(l){return l.slice().sort((a,b)=>
  (a.ordem??1e9)-(b.ordem??1e9) || String(a.prazo||"9").localeCompare(String(b.prazo||"9")));}
function dgProgresso(d){const l=(d.itens||[]).filter(i=>i.tipoLinha==="check");
  return {feitos:l.filter(i=>i.feito).length,total:l.length};}

function renderDG(){
  const box=document.getElementById("tab-dg");if(!box)return;
  const q=semAcento((document.getElementById("dgQ")?.value)||"");
  const fSit=document.getElementById("dgSit")?.value||"";
  let lista=dgVivos().filter(d=>{
    if(fSit&&(d.situacao||"nao_iniciado")!==fSit)return false;
    if(!q)return true;
    const alvo=semAcento(d.titulo||"")+" "+semAcento((d.itens||[]).map(i=>i.texto).join(" "));
    return alvo.includes(q);
  });
  const fEsc=document.getElementById("dgEscopo")?.value||"";
  if(fEsc==="minha")lista=lista.filter(d=>d.escopo===currentStore);
  else if(fEsc==="compart")lista=lista.filter(d=>!d.escopo);

  /* dois blocos: as EXCLUSIVAS desta loja em cima, depois as que valem para as duas */
  const temGrupo=!!grupoDe(currentStore);
  const soDaLoja=dgOrdenar(lista.filter(d=>d.escopo===currentStore));
  const doGrupo=dgOrdenar(lista.filter(d=>!d.escopo));
  const nomeLoja=nomeCurto((empresa(currentStore)||{}).name||currentStore);
  /* cada bloco é uma COLUNA com moldura própria, envolvendo todas as prioridades dentro */
  let corpo="";
  const blocoHTML=(id,titulo,itens,cls)=>{
    const fechado=!!DG_FECHADOS["bloco|"+id];
    return `<div class="dg-bloco ${cls||""}">
      <div class="dg-bloco-h" onclick="dgToggleGrupo('bloco|${id}')" title="${fechado?"Abrir":"Fechar"} esta coluna">
        <span class="dg-caret${fechado?"":" open"}">▸</span>${titulo}<span class="dg-cont">${itens.length}</span></div>
      ${fechado?"":`<div class="dg-bloco-corpo">${dgGruposHTML(itens,id)}</div>`}</div>`;};
  if(DG_VISAO==="painel"){
    corpo=dgPainelHTML(lista);                       /* quadro geral, tudo junto */
  }else if(temGrupo){
    /* esquerda: o que vale para as duas lojas | direita: o que é só desta loja */
    corpo=`<div class="dg-colunas">
      ${blocoHTML("grupo","Demandas e Prioridades",doGrupo,"compart")}
      ${blocoHTML("loja",esc(nomeLoja)+" <span class='dg-excl'>(exclusivas)</span>",soDaLoja,"so-loja")}
    </div>`;
  }else{
    corpo=`<div class="dg-bloco"><div class="dg-bloco-corpo">${dgGruposHTML(doGrupo,"g")}</div></div>`;
  }
  box.innerHTML=`
    <div class="dg-bar">
      <div class="emp-search" style="flex:1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="dgQ" placeholder="Buscar na agenda (título ou item da lista)..." value="${esc((document.getElementById("dgQ")?.value)||"")}" oninput="renderDG()">
      </div>
      <select id="dgGrupo" onchange="DG_GRUPO=this.value;renderDG()" title="Agrupar por">
        <option value="prioridade"${DG_GRUPO==="prioridade"?" selected":""}>Agrupar: Prioridade</option>
        <option value="situacao"${DG_GRUPO==="situacao"?" selected":""}>Agrupar: Situação</option>
      </select>
      <select id="dgSit" onchange="renderDG()" title="Filtrar por situação">
        <option value="">Todas as situações</option>
        ${Object.keys(DG_SIT).map(k=>`<option value="${k}"${fSit===k?" selected":""}>${DG_SIT[k].rotulo}</option>`).join("")}
      </select>
      ${grupoDe(currentStore)?`<select id="dgEscopo" onchange="renderDG()" title="Filtrar por loja">
        <option value=""${fEsc===""?" selected":""}>Todas as demandas</option>
        <option value="compart"${fEsc==="compart"?" selected":""}>Só as das duas lojas</option>
        <option value="minha"${fEsc==="minha"?" selected":""}>Só desta loja</option>
      </select>`:""}
      <span class="dg-visao" title="Trocar o jeito de ver a agenda">
        <button class="${DG_VISAO==="lista"?"on":""}" onclick="dgSetVisao('lista')">☰ Lista</button>
        <button class="${DG_VISAO==="painel"?"on":""}" onclick="dgSetVisao('painel')">▦ Painel</button>
      </span>
      <button class="btn ghost sm" onclick="dgImprimir()" title="Gerar a folha do dia para imprimir ou salvar em PDF">🖨 Folha do dia</button>
      <button class="btn sm" onclick="dgNova()">+ Nova demanda</button>
    </div>
    ${dgBarraMassaHTML()}
    ${corpo||`<div class="empty">Nenhuma demanda aqui ainda. Use "+ Nova demanda" para criar a primeira.</div>`}`;
  requestAnimationFrame(()=>{const i=document.getElementById("dgQ");if(i&&q)  {i.focus();i.setSelectionRange(i.value.length,i.value.length);}});
}

/* ===== VISÃO 2: PAINEL =====
   Referência: Matriz de Eisenhower (urgente x importante) + "board view".
   A ideia é responder, nesta ordem: (1) o que eu faço AGORA, (2) como está o todo. */
function dgEhAtrasada(d){return d.prazo&&d.prazo<today()&&d.situacao!=="concluido";}
function dgEhHoje(d){return d.prazo===today()&&d.situacao!=="concluido";}
function dgPainelHTML(lista){
  const atrasadas=lista.filter(dgEhAtrasada);
  const hoje=lista.filter(dgEhHoje);
  const andamento=lista.filter(d=>d.situacao==="andamento");
  const urgentes=lista.filter(d=>d.prioridade==="URGENTE"&&d.situacao!=="concluido");
  const foco=[
    {ch:"atrasadas",rot:"Atrasadas",n:atrasadas.length,cor:"#e5484d",fundo:"#ffecec",dica:"Passou do prazo"},
    {ch:"hoje",rot:"Para hoje",n:hoje.length,cor:"#b3730a",fundo:"#fdf0e0",dica:"Vence hoje"},
    {ch:"urgentes",rot:"Urgentes",n:urgentes.length,cor:"#a23bb0",fundo:"#f6ecf8",dica:"Marcadas como urgente"},
    {ch:"andamento",rot:"Em andamento",n:andamento.length,cor:"#1668b8",fundo:"#e7f0f9",dica:"Já comecei"}
  ];
  const faixa=`<div class="dg-foco">${foco.map(f=>
    `<button class="dg-foco-c${DG_FOCO===f.ch?" on":""}" style="--c:${f.cor};--f:${f.fundo}"
       onclick="dgSetFoco('${f.ch}')" title="${f.dica} — clique para ver só estas">
       <span class="n">${f.n}</span><span class="r">${f.rot}</span></button>`).join("")}
    ${DG_FOCO?`<button class="dg-foco-x" onclick="dgSetFoco('')" title="Mostrar tudo de novo">✕ limpar</button>`:""}
  </div>`;
  /* aplica o filtro da faixa */
  let l=lista;
  if(DG_FOCO==="atrasadas")l=atrasadas; else if(DG_FOCO==="hoje")l=hoje;
  else if(DG_FOCO==="andamento")l=andamento; else if(DG_FOCO==="urgentes")l=urgentes;
  /* colunas por prioridade — o quadro geral */
  const cols=[...Object.keys(DG_PRIOS).map(k=>({chave:k,...DG_PRIOS[k]})),{chave:"",...DG_SEM}];
  const quadro=`<div class="dg-quadro">${cols.map(c=>{
    const itens=dgOrdenar(l.filter(d=>(d.prioridade||"")===c.chave));
    return `<div class="dg-col" data-chave="${c.chave}">
      <div class="dg-col-h" style="color:${c.cor};background:${c.fundo}">${esc(c.rotulo)}<span class="dg-cont">${itens.length}</span></div>
      <div class="dg-grupo" data-chave="${c.chave}">
        ${itens.map(d=>dgCartaoHTML(d)).join("")||`<div class="dg-vazio">—</div>`}
      </div></div>`;}).join("")}</div>`;
  return faixa+quadro;
}
function dgCartaoHTML(d){
  const p=dgProgresso(d),sit=DG_SIT[d.situacao||"nao_iniciado"]||DG_SIT.nao_iniciado;
  const atras=dgEhAtrasada(d),hoje=dgEhHoje(d);
  const aberta=!!DG_ABERTAS[d.uid];
  const cp=DG_PRIOS[d.prioridade];
  return `<div class="dg-item dg-cartao${d.situacao==="concluido"?" done":""}" data-uid="${d.uid}"
      style="${cp?`box-shadow:inset 3px 0 0 ${cp.cor}`:""}">
    <div class="dg-cartao-top" onclick="dgToggleAberta('${d.uid}')">
      <span class="dg-alca" title="Segure e arraste" onpointerdown="dgArrastarIni(event,this)" onclick="event.stopPropagation()">⠿</span>
      <input type="checkbox" class="dg-sel" ${DG_SEL.has(d.uid)?"checked":""}
        title="Selecionar" onclick="dgToggleSel('${d.uid}',event)">
      <span class="dg-tit">${esc(d.titulo||"(sem título)")}</span>
      <button class="dg-lupa" title="Modo foco" onclick="event.stopPropagation();dgFoco('${d.uid}')">⤢</button>
    </div>
    <div class="dg-cartao-pe" onclick="dgToggleAberta('${d.uid}')">
      ${d.escopo?`<span class="dg-mini" title="Só desta loja">📍</span>`:""}
      ${p.total?`<span class="dg-mini">${p.feitos}/${p.total}</span>`:""}
      <span class="dg-mini" style="color:${sit.cor}">${sit.rotulo}</span>
      ${d.prazo?`<span class="dg-mini${atras?" atrasado":hoje?" hoje":""}">${atras?"⚠ ":""}${brDate(d.prazo)}</span>`:""}
    </div>
    ${aberta?`<div class="dg-corpo">${dgItensHTML(d)}</div>`:""}
  </div>`;
}
function dgSetFoco(f){DG_FOCO=(DG_FOCO===f)?"":f;renderDG();}
function dgSetVisao(v){DG_VISAO=v;localStorage.setItem("dg_visao",v);DG_FOCO="";renderDG();}

/* dentro de cada bloco, os grupos por prioridade (ou situação) do jeito que ela já usa */
function dgGruposHTML(lista,pref){
  if(!lista.length)return `<div class="dg-vazio">Nada aqui por enquanto.</div>`;
  const grupos=[];
  if(DG_GRUPO==="prioridade"){
    for(const k of Object.keys(DG_PRIOS))grupos.push({chave:k,...DG_PRIOS[k],itens:lista.filter(d=>d.prioridade===k)});
    grupos.push({chave:"",...DG_SEM,itens:lista.filter(d=>!d.prioridade)});
  }else{
    for(const k of Object.keys(DG_SIT))grupos.push({chave:k,rotulo:DG_SIT[k].rotulo.toUpperCase(),cor:DG_SIT[k].cor,fundo:DG_SIT[k].fundo,itens:lista.filter(d=>(d.situacao||"nao_iniciado")===k)});
  }
  /* cada grupo recolhe no ▸, igual ao Notion: fechado mostra só a etiqueta e a contagem */
  return grupos.filter(g=>g.itens.length).map(g=>{
    const ch=(pref||"")+"|"+g.chave, fechado=!!DG_FECHADOS[ch];
    return `<div class="dg-grupo" data-chave="${esc(g.chave)}">
      <div class="dg-grupo-lin" onclick="dgToggleGrupo('${esc(ch)}')" title="${fechado?"Abrir":"Fechar"} este grupo">
        <span class="dg-caret${fechado?"":" open"}">▸</span>
        <span class="dg-grupo-h" style="color:${g.cor};background:${g.fundo}">${esc(g.rotulo)}</span>
        <span class="dg-cont">${g.itens.length}</span>
      </div>
      ${fechado?"":g.itens.map((d,i)=>dgLinhaHTML(d,g.itens,i)).join("")}
    </div>`;}).join("");
}
function dgToggleGrupo(ch){DG_FECHADOS[ch]=!DG_FECHADOS[ch];dgSalvarFechados();renderDG();}
function dgSalvarFechados(){try{localStorage.setItem("dg_fechados",JSON.stringify(DG_FECHADOS));}catch(e){}}

function dgLinhaHTML(d,irmaos,idx){
  const p=dgProgresso(d),aberta=!!DG_ABERTAS[d.uid],sit=DG_SIT[d.situacao||"nao_iniciado"]||DG_SIT.nao_iniciado;
  const concl=(d.situacao==="concluido");
  const cp=DG_PRIOS[d.prioridade];      /* listra colorida = prioridade, sem precisar escrever */
  return `<div class="dg-item${concl?" done":""}" data-uid="${d.uid}"
      style="${cp?`box-shadow:inset 3px 0 0 ${cp.cor}`:""}" ${cp?`title="${cp.rotulo}"`:""}>
    <div class="dg-item-top" onclick="dgToggleAberta('${d.uid}')">
      <span class="dg-alca" title="Segure e arraste para mudar a ordem"
        onpointerdown="dgArrastarIni(event,this)" onclick="event.stopPropagation()">⠿</span>
      <input type="checkbox" class="dg-sel" ${DG_SEL.has(d.uid)?"checked":""}
        title="Selecionar para alterar várias de uma vez" onclick="dgToggleSel('${d.uid}',event)">
      <span class="dg-caret${aberta?" open":""}">▸</span>
      <span class="dg-tit">${esc(d.titulo||"(sem título)")}</span>
      <button class="dg-lupa" title="Abrir sozinha na tela (modo foco)" onclick="event.stopPropagation();dgFoco('${d.uid}')">⤢</button>
      ${p.total?`<span class="dg-prog" title="itens concluídos">${p.feitos}/${p.total}</span>`:""}
      <span class="dg-badge" style="color:${sit.cor};background:${sit.fundo}">${sit.rotulo}</span>
      ${d.prazo?`<span class="dg-prazo" title="Prazo">${brDate(d.prazo)}</span>`:""}
    </div>
    ${aberta?`<div class="dg-corpo">
      <div class="dg-acts">
        <select onchange="dgSetCampo('${d.uid}','prioridade',this.value)" title="Prioridade">
          <option value="">Sem prioridade</option>
          ${Object.keys(DG_PRIOS).map(k=>`<option value="${k}"${d.prioridade===k?" selected":""}>${DG_PRIOS[k].rotulo}</option>`).join("")}
        </select>
        <select onchange="dgSetCampo('${d.uid}','situacao',this.value)" title="Situação">
          ${Object.keys(DG_SIT).map(k=>`<option value="${k}"${(d.situacao||"nao_iniciado")===k?" selected":""}>${DG_SIT[k].rotulo}</option>`).join("")}
        </select>
        <input type="date" value="${esc(d.prazo||"")}" onchange="dgSetCampo('${d.uid}','prazo',this.value)" title="Prazo">
        ${grupoDe(currentStore)?`<select onchange="dgSetCampo('${d.uid}','escopo',this.value)" title="Esta demanda vale para quais lojas?">
          <option value=""${!d.escopo?" selected":""}>Vale para: as duas lojas</option>
          ${lojasDoGrupo(grupoDe(currentStore)).map(l=>`<option value="${esc(l.code)}"${d.escopo===l.code?" selected":""}>Só ${esc(nomeCurto(l.name))}</option>`).join("")}
        </select>`:""}
        <button class="btn ghost sm" onclick="dgEditarTitulo('${d.uid}')">✎ Renomear</button>
        <button class="btn ghost sm" onclick="dgAddLinha('${d.uid}')">+ Item</button>
        ${d.notionUrl?`<a class="btn ghost sm" href="${esc(d.notionUrl)}" target="_blank" rel="noopener" title="Abrir a tarefa original no Notion">↗ Notion</a>`:""}
        <button class="btn ghost sm" style="margin-left:auto" onclick="dgExcluir('${d.uid}')">🗑</button>
      </div>
      ${dgItensHTML(d)}
    </div>`:""}
  </div>`;
}

/* lista plana com níveis; uma "secao" fechada esconde as linhas de nível maior até a próxima seção de nível <= */
function dgItensHTML(d){
  const itens=d.itens||[];
  if(!itens.length)return `<div class="dg-vazio">Sem itens. Use "+ Item" para começar a lista.</div>`;
  let html="",escondeAte=-1;
  itens.forEach((it,i)=>{
    if(escondeAte>=0){ if(it.nivel>escondeAte)return; escondeAte=-1; }
    const pad=12+(it.nivel||0)*20;
    if(it.tipoLinha==="secao"){
      if(!it.aberto)escondeAte=it.nivel||0;
      html+=`<div class="dg-sec" style="padding-left:${pad}px" onclick="dgToggleSecao('${d.uid}',${i})">
        <span class="dg-caret${it.aberto?" open":""}">▸</span>${esc(it.texto)}</div>`;
    }else if(it.tipoLinha==="texto"){
      html+=`<div class="dg-txt" style="padding-left:${pad+18}px">${dgLink(it.texto)}</div>`;
    }else{
      html+=`<label class="dg-chk" style="padding-left:${pad}px">
        <input type="checkbox" ${it.feito?"checked":""} onchange="dgToggleItem('${d.uid}',${i},this.checked)">
        <span class="${it.feito?"feito":""}">${dgLink(it.texto)}</span>
        <button class="dg-del" title="Excluir este item" onclick="event.preventDefault();dgDelLinha('${d.uid}',${i})">×</button></label>`;
    }
  });
  return `<div class="dg-lista">${html}</div>`;
}
/* links markdown [texto](url) viram links de verdade; o resto é escapado */
function dgLink(t){
  return esc(t||"").replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,
    (m,txt,url)=>`<a href="${url}" target="_blank" rel="noopener">${txt}</a>`);
}

/* ===== 1) FOLHA DO DIA (imprimir/PDF) — ideia do exemplo "print records" do Airtable.
   Gera uma folha com quadradinhos para riscar à mão enquanto anda pela unidade. ===== */
function dgImprimir(){
  const lista=dgOrdenar(dgVisiveis());
  if(!lista.length){toast("Nada para imprimir com os filtros de agora");return;}
  const loja=nomeCurto((empresa(currentStore)||{}).name||currentStore);
  const grupos=[...Object.keys(DG_PRIOS).map(k=>({ch:k,...DG_PRIOS[k]})),{ch:"",...DG_SEM}];
  let corpo="";
  for(const g of grupos){
    const itens=lista.filter(d=>(d.prioridade||"")===g.ch);
    if(!itens.length)continue;
    corpo+=`<div class="g" style="border-color:${g.cor}"><span style="color:${g.cor}">${esc(g.rotulo)}</span> · ${itens.length}</div>`;
    for(const d of itens){
      const p=dgProgresso(d),sub=(d.itens||[]).filter(i=>i.tipoLinha==="check"&&!i.feito);
      corpo+=`<div class="t">
        <div class="th"><span class="bx"></span><b>${esc(d.titulo||"")}</b>
          ${p.total?`<span class="pg">${p.feitos}/${p.total}</span>`:""}
          ${d.prazo?`<span class="pz${d.prazo<today()?" atr":""}">${brDate(d.prazo)}</span>`:""}
          ${d.escopo?`<span class="pz">só ${esc(nomeCurto((empresa(d.escopo)||{}).name||d.escopo))}</span>`:""}
        </div>
        ${sub.length?`<ul>${sub.slice(0,14).map(i=>`<li style="margin-left:${(i.nivel||0)*14}px"><span class="bx sm"></span>${esc(i.texto)}</li>`).join("")}
          ${sub.length>14?`<li class="mais">… e mais ${sub.length-14} itens</li>`:""}</ul>`:""}
      </div>`;
    }
  }
  const w=window.open("");
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
  <title>Folha do dia — ${esc(loja)}</title><style>
  @page{margin:14mm}
  body{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#2d2e3a;font-size:12px;margin:0}
  h1{font-size:20px;margin:0 0 2px}
  .sub{color:#8a8b96;font-size:11px;margin-bottom:16px}
  .g{font-size:11px;font-weight:700;letter-spacing:.5px;border-left:4px solid;padding:2px 0 2px 8px;margin:16px 0 8px}
  .t{padding:6px 0 6px 2px;border-bottom:1px solid #eee;break-inside:avoid}
  .th{display:flex;align-items:baseline;gap:7px;flex-wrap:wrap}
  .bx{display:inline-block;width:11px;height:11px;border:1.5px solid #555;border-radius:2px;flex:none}
  .bx.sm{width:9px;height:9px;border-color:#999}
  .pg{font-size:10px;color:#8a8b96}
  .pz{font-size:10px;color:#8a8b96;border:1px solid #ddd;border-radius:8px;padding:0 6px}
  .pz.atr{color:#e5484d;border-color:#e5484d}
  ul{list-style:none;padding:4px 0 0 20px;margin:0}
  li{padding:2px 0;display:flex;gap:6px;align-items:baseline;color:#444}
  li.mais{color:#8a8b96;font-style:italic}
  .noprint{margin-bottom:14px}
  @media print{.noprint{display:none}}
  </style></head><body>
  <div class="noprint"><button onclick="print()" style="padding:8px 14px;cursor:pointer;font-size:13px">🖨 Imprimir / Salvar PDF</button></div>
  <h1>Folha do dia — ${esc(loja)}</h1>
  <div class="sub">${lista.length} demanda${lista.length===1?"":"s"} · gerado em ${brDate(today())}${DG_FOCO?" · filtro: "+esc(DG_FOCO):""}</div>
  ${corpo}</body></html>`);
  w.document.close();
}
/* o que está visível agora (respeita busca, filtros e a faixa de foco) */
function dgVisiveis(){
  const q=semAcento((document.getElementById("dgQ")?.value)||"");
  const fSit=document.getElementById("dgSit")?.value||"";
  const fEsc=document.getElementById("dgEscopo")?.value||"";
  let l=dgVivos().filter(d=>{
    if(fSit&&(d.situacao||"nao_iniciado")!==fSit)return false;
    if(fEsc==="minha"&&d.escopo!==currentStore)return false;
    if(fEsc==="compart"&&d.escopo)return false;
    if(!q)return true;
    return (semAcento(d.titulo||"")+" "+semAcento((d.itens||[]).map(i=>i.texto).join(" "))).includes(q);
  });
  if(DG_VISAO==="painel"&&DG_FOCO){
    if(DG_FOCO==="atrasadas")l=l.filter(dgEhAtrasada);
    else if(DG_FOCO==="hoje")l=l.filter(dgEhHoje);
    else if(DG_FOCO==="andamento")l=l.filter(d=>d.situacao==="andamento");
    else if(DG_FOCO==="urgentes")l=l.filter(d=>d.prioridade==="URGENTE"&&d.situacao!=="concluido");
  }
  return l;
}

/* ===== 2) AÇÕES EM MASSA — ideia do exemplo "update records" ===== */
let DG_SEL=new Set();
function dgModoSel(){return DG_SEL.size>0;}
function dgToggleSel(uid,ev){if(ev)ev.stopPropagation();
  DG_SEL.has(uid)?DG_SEL.delete(uid):DG_SEL.add(uid);renderDG();}
function dgSelTodas(){const v=dgVisiveis();
  if(DG_SEL.size>=v.length)DG_SEL.clear();else v.forEach(d=>DG_SEL.add(d.uid));renderDG();}
function dgLimparSel(){DG_SEL.clear();renderDG();}
/* trava do PC compartilhado: no modo temporário, confirmar antes de alterar em massa */
function dgPodeGravarEmMassa(n){
  const temp=(typeof syncTemporario==="function"&&syncTemporario())||sessionStorage.getItem("gh_token_tmp");
  if(!temp)return true;
  return confirm("Você está num dispositivo temporário (os dados não ficam salvos aqui).\n\n"
    +"Alterar "+n+" demanda"+(n===1?"":"s")+" mesmo assim?");
}
async function dgMassa(campo,valor){
  const n=DG_SEL.size;if(!n)return;
  if(!dgPodeGravarEmMassa(n))return;
  for(const uid of DG_SEL){const d=dgAchar(uid);
    if(d&&d[campo]!==valor){d[campo]=valor;d.mod=nowISO();await putItem(d);}}
  dataChanged();DG_SEL.clear();renderDG();toast(n+" demanda"+(n===1?"":"s")+" atualizada"+(n===1?"":"s")+" ✓");
}
async function dgMassaExcluir(){
  const n=DG_SEL.size;if(!n)return;
  if(!confirm("Excluir "+n+" demanda"+(n===1?"":"s")+"?\n\nOs itens das listas também serão apagados."))return;
  if(!dgPodeGravarEmMassa(n))return;
  for(const uid of DG_SEL){const d=dgAchar(uid);if(!d)continue;
    if(window.syncEnabled&&syncEnabled()){d.deleted=true;d.mod=nowISO();await putItem(d);}
    else{await delDB(d.id);DATA=DATA.filter(x=>x.id!==d.id);}}
  dataChanged();DG_SEL.clear();renderDG();toast(n+" excluída"+(n===1?"":"s"));
}
function dgBarraMassaHTML(){
  if(!dgModoSel())return "";
  const n=DG_SEL.size;
  return `<div class="dg-massa">
    <b>${n}</b> selecionada${n===1?"":"s"}
    <select onchange="dgMassa('prioridade',this.value);this.selectedIndex=0" title="Mudar a prioridade de todas">
      <option value="">Prioridade…</option>
      <option value="">Sem prioridade</option>
      ${Object.keys(DG_PRIOS).map(k=>`<option value="${k}">${DG_PRIOS[k].rotulo}</option>`).join("")}
    </select>
    <select onchange="dgMassa('situacao',this.value);this.selectedIndex=0" title="Mudar a situação de todas">
      <option value="">Situação…</option>
      ${Object.keys(DG_SIT).map(k=>`<option value="${k}">${DG_SIT[k].rotulo}</option>`).join("")}
    </select>
    <button class="btn ghost sm" onclick="dgMassa('situacao','concluido')">✓ Concluir</button>
    <button class="btn ghost sm" onclick="dgSelTodas()">Marcar todas</button>
    <button class="btn ghost sm" onclick="dgMassaExcluir()">🗑</button>
    <button class="btn ghost sm" onclick="dgLimparSel()">✕ Cancelar</button>
  </div>`;
}

/* ===== 3) MODO FOCO — ideia do "expand record": a demanda sozinha na tela ===== */
function dgFoco(uid){
  const d=dgAchar(uid);if(!d)return;
  const p=dgProgresso(d),sit=DG_SIT[d.situacao||"nao_iniciado"]||DG_SIT.nao_iniciado;
  const cp=DG_PRIOS[d.prioridade];
  let el=document.getElementById("dg-foco-tela");
  if(!el){el=document.createElement("div");el.id="dg-foco-tela";el.className="dg-focotela";document.body.appendChild(el);}
  el.innerHTML=`<div class="dg-foco-box">
    <div class="dg-foco-h" style="${cp?`border-color:${cp.cor}`:""}">
      <div>
        <div class="dg-foco-tags">
          ${cp?`<span class="dg-grupo-h" style="color:${cp.cor};background:${cp.fundo}">${cp.rotulo}</span>`:""}
          <span class="dg-badge" style="color:${sit.cor};background:${sit.fundo}">${sit.rotulo}</span>
          ${d.prazo?`<span class="dg-mini${dgEhAtrasada(d)?" atrasado":""}">${brDate(d.prazo)}</span>`:""}
          ${p.total?`<span class="dg-mini">${p.feitos}/${p.total} concluídos</span>`:""}
        </div>
        <h2>${esc(d.titulo||"")}</h2>
      </div>
      <button class="btn ghost sm" onclick="dgFocoFechar()">✕ Fechar</button>
    </div>
    <div class="dg-foco-corpo">${dgItensHTML(d)}</div>
    <div class="dg-foco-pe">
      <button class="btn ghost sm" onclick="dgAddLinha('${d.uid}')">+ Item</button>
      ${d.notionUrl?`<a class="btn ghost sm" href="${esc(d.notionUrl)}" target="_blank" rel="noopener">↗ Notion</a>`:""}
      <span class="dg-mini" style="margin-left:auto">Esc para fechar</span>
    </div>
  </div>`;
  el.onclick=e=>{if(e.target===el)dgFocoFechar();};
  document.body.style.overflow="hidden";
  DG_FOCO_UID=uid;
}
let DG_FOCO_UID=null;
function dgFocoFechar(){const el=document.getElementById("dg-foco-tela");if(el)el.remove();
  document.body.style.overflow="";DG_FOCO_UID=null;renderDG();}

/* ---- ações ---- */
function dgAchar(uid){return DATA.find(d=>d.uid===uid&&!d.deleted);}
async function dgSalvar(d){d.mod=nowISO();await putItem(d);dataChanged();}
function dgToggleAberta(uid){DG_ABERTAS[uid]=!DG_ABERTAS[uid];renderDG();}
async function dgToggleSecao(uid,i){const d=dgAchar(uid);if(!d)return;
  d.itens[i].aberto=!d.itens[i].aberto;await dgSalvar(d);renderDG();}
async function dgToggleItem(uid,i,val){const d=dgAchar(uid);if(!d)return;
  d.itens[i].feito=!!val;await dgSalvar(d);renderDG();}
async function dgSetCampo(uid,campo,val){const d=dgAchar(uid);if(!d)return;
  d[campo]=val;await dgSalvar(d);renderDG();}
async function dgEditarTitulo(uid){const d=dgAchar(uid);if(!d)return;
  const t=prompt("Título da demanda:",d.titulo||"");if(t===null)return;
  d.titulo=t.trim()||d.titulo;await dgSalvar(d);renderDG();}
async function dgAddLinha(uid){const d=dgAchar(uid);if(!d)return;
  const t=prompt("Novo item da lista:");if(!t||!t.trim())return;
  (d.itens=d.itens||[]).push({uid:newUid(),texto:t.trim(),feito:false,nivel:0,tipoLinha:"check"});
  await dgSalvar(d);renderDG();}
async function dgDelLinha(uid,i){const d=dgAchar(uid);if(!d)return;
  if(!confirm("Excluir este item?\n\n"+(d.itens[i]?.texto||"")))return;
  d.itens.splice(i,1);await dgSalvar(d);renderDG();}
/* ---- ARRASTAR para reordenar (alça ⠿), como no Notion ----
   Funciona com mouse E com o dedo (pointer events).
   Dentro da COLUNA ela vai para onde quiser: se soltar em outro grupo de prioridade,
   a PRIORIDADE muda sozinha (é o que o Notion faz). O que ela não faz é pular para a
   outra coluna — isso mudaria a loja, e para isso existe o seletor dentro da demanda. */
let DG_ARR=null;
function dgArrastarIni(ev,alca){
  ev.preventDefault();ev.stopPropagation();
  const item=alca.closest(".dg-item");
  DG_ARR={item,coluna:item.closest(".dg-bloco"),y:ev.clientY,moveu:false};
  item.classList.add("arrastando");
  try{alca.setPointerCapture(ev.pointerId);}catch(e){}   /* não pode derrubar o arraste */
  alca.onpointermove=dgArrastarMove;
  alca.onpointerup=alca.onpointercancel=e=>dgArrastarFim(e,alca);
}
function dgArrastarMove(ev){
  if(!DG_ARR)return;
  ev.preventDefault();
  const {item,coluna}=DG_ARR;
  if(Math.abs(ev.clientY-DG_ARR.y)>3)DG_ARR.moveu=true;
  /* candidatos: todas as tarefas E todos os cabeçalhos de grupo desta coluna */
  const alvos=[...coluna.querySelectorAll(".dg-item, .dg-grupo")].filter(e=>e!==item&&!item.contains(e));
  let destino=null,antesDe=null;
  for(const el of alvos){
    const r=el.getBoundingClientRect();
    if(ev.clientY<r.top+r.height/2){
      if(el.classList.contains("dg-item")){destino=el.parentElement;antesDe=el;}
      else{destino=el;antesDe=el.querySelector(".dg-item");}   /* topo daquele grupo */
      break;
    }
  }
  if(!destino){                                   /* soltou embaixo de tudo: último grupo */
    const gs=coluna.querySelectorAll(".dg-grupo");
    destino=gs[gs.length-1];antesDe=null;
  }
  if(!destino)return;
  if(antesDe)destino.insertBefore(item,antesDe);else destino.appendChild(item);
}
async function dgArrastarFim(ev,alca){
  if(!DG_ARR)return;
  const {item,moveu}=DG_ARR;
  item.classList.remove("arrastando");
  alca.onpointermove=alca.onpointerup=alca.onpointercancel=null;
  try{alca.releasePointerCapture(ev.pointerId);}catch(e){}
  DG_ARR=null;
  if(!moveu)return;                               /* clique simples: não mexe em nada */
  /* mudou de grupo? então a prioridade (ou a situação) passa a ser a do grupo de destino */
  const grupo=item.closest(".dg-grupo"),chave=grupo&&grupo.dataset.chave;
  const d=dgAchar(item.dataset.uid);
  if(d&&chave!==undefined){
    const campo=DG_GRUPO==="prioridade"?"prioridade":"situacao";
    if((d[campo]||"")!==chave){d[campo]=chave;d.mod=nowISO();await putItem(d);
      toast(DG_GRUPO==="prioridade"?("Prioridade: "+(DG_PRIOS[chave]?.rotulo||"sem prioridade")):"Situação atualizada");}
  }
  const uids=[...(grupo||item.parentElement).querySelectorAll(".dg-item")].map(e=>e.dataset.uid);
  await dgGravarOrdem(uids);
}
async function dgGravarOrdem(uids){
  for(let i=0;i<uids.length;i++){const d=dgAchar(uids[i]);
    if(d&&d.ordem!==i){d.ordem=i;d.mod=nowISO();await putItem(d);}}
  dataChanged();renderDG();}

async function dgNova(){
  if(!currentStore){toast("Escolha uma empresa primeiro");return;}
  const t=prompt("Nova demanda:");if(!t||!t.trim())return;
  const o={uid:newUid(),mod:nowISO(),tipo:"dg",loja:dgLojaBase(),criado:"manual",escopo:"",ordem:0,
    titulo:t.trim(),prioridade:"",situacao:"nao_iniciado",prazo:"",criadoEm:today(),itens:[]};
  const id=await putItem(o);o.id=id;DATA.push(o);dataChanged();
  DG_ABERTAS[o.uid]=true;renderDG();}
async function dgExcluir(uid){const d=dgAchar(uid);if(!d)return;
  if(!confirm("Excluir a demanda?\n\n"+(d.titulo||"")+"\n\nOs itens da lista também serão apagados."))return;
  if(window.syncEnabled&&syncEnabled()){d.deleted=true;d.mod=nowISO();await putItem(d);}   /* lápide: propaga a exclusão */
  else{await delDB(d.id);DATA=DATA.filter(x=>x.id!==d.id);}
  dataChanged();renderDG();}
