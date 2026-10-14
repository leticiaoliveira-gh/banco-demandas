/* =====================================================================
   CRONOGRAMA DE LICENÇAS E MANUTENÇÕES PREVENTIVAS (13/10/2026)
   ---------------------------------------------------------------------
   Nasceu da planilha dela "Controle de licenças e manutenções preventivas".
   Pedido: "faz melhor do que esse da imagem — layout, separação, mais
   funcional", "o cronograma seria ótimo pro lembrete", "eu gosto de
   imprimir ele pra pôr no quadro".

   Igual à planilha: ela só lança a ÚLTIMA vez que foi feito; o site conta
   o período e mostra a próxima. Ao trocar a data, a antiga vai para o
   histórico (fica a marca de "feito" na linha do tempo).

   Ficha "cro": loja, area, resp, periodo (meses; 0 = validade indeterminada),
   ultima (AAAA-MM-DD), historico [{data}], obs, ordem.

   SITUAÇÃO (mesmas cores da planilha, sempre com a palavra escrita):
   vencido (passou da data) · vence logo (até 30 dias) · em dia
   ===================================================================== */

const CRO_LOGO=30;            /* "vence logo": quantos dias antes avisar */
let CRO_INICIO=null;          /* 1º mês da linha do tempo (AAAA-MM-01) */
let CRO_EDIT=null;            /* id do item com o formulário aberto */

function croItens(loja){
  loja=loja||currentStore;
  return DATA.filter(d=>!d.deleted&&d.tipo==="cro"&&d.loja===loja)
    .sort((a,b)=>(Number(a.ordem)||0)-(Number(b.ordem)||0)||String(a.area).localeCompare(String(b.area),"pt"));
}
function croProxima(d){
  if(!d||!d.ultima||!Number(d.periodo))return "";
  return ctlMaisMeses(d.ultima,Number(d.periodo));
}
function croSituacao(d){
  if(!Number(d.periodo))return d.ultima?"indet":"vazio";
  if(!d.ultima)return "vazio";
  const n=ctlDias(ctlHoje(),croProxima(d));
  if(n<0)return "vencido";
  if(n<=CRO_LOGO)return "logo";
  return "ok";
}
const CRO_SIT={
  vencido:{rot:"Vencido",cls:"bd-selo-erro"},
  logo:   {rot:"Vence logo",cls:"bd-selo-atencao"},
  ok:     {rot:"Em dia",cls:"bd-selo-ok"},
  indet:  {rot:"Validade indeterminada",cls:"bd-selo-info"},
  vazio:  {rot:"Sem data",cls:"bd-selo-neutro"}
};
function croResumo(loja){
  const it=croItens(loja);
  const r={total:it.length,vencidos:0,logo:0,semana:0,proximo:null};
  const hoje=ctlHoje();
  it.forEach(d=>{
    const s=croSituacao(d);
    if(s==="vencido")r.vencidos++;
    if(s==="logo")r.logo++;
    const p=croProxima(d);
    if(p&&p>=hoje&&ctlDias(hoje,p)<=7)r.semana++;
    if(p&&p>=hoje&&(!r.proximo||p<r.proximo.data))r.proximo={area:d.area,data:p};
  });
  return r;
}
function croPeriodoTxt(d){
  const n=Number(d.periodo);
  if(!n)return "Validade indeterminada";
  if(n===12)return "Todo ano";
  return "A cada "+n+" "+(n===1?"mês":"meses");
}

/* ===================================================================== tela */
function renderCronograma(){
  const el=document.getElementById("tab-cro");if(!el)return;
  const it=croItens(), r=croResumo(), hoje=ctlHoje();
  if(!CRO_INICIO)CRO_INICIO=hoje.slice(0,8)+"01";

  let aviso="";
  if(r.vencidos){
    const nomes=it.filter(d=>croSituacao(d)==="vencido").map(d=>d.area).join(", ");
    aviso=croAviso("erro","✕",r.vencidos+(r.vencidos===1?" item vencido":" itens vencidos"),nomes+". Quando fizer, toque em “Feito hoje” ou ajuste a data.");
  }
  if(r.logo){
    const nomes=it.filter(d=>croSituacao(d)==="logo").map(d=>d.area+" ("+ctlBrCurta(croProxima(d))+")").join(", ");
    aviso+=croAviso("atencao","⚠",r.logo+(r.logo===1?" vence":" vencem")+" nos próximos "+CRO_LOGO+" dias",nomes+".");
  }
  if(!aviso&&it.length)aviso=croAviso("ok","✓","Tudo em dia",r.proximo?"Próximo: "+r.proximo.area+" em "+ctlBr(r.proximo.data)+".":"");

  const emDia=it.filter(d=>{const s=croSituacao(d);return s==="ok"||s==="indet";}).length;
  el.innerHTML=`
    <div class="ctl-capa ctl-capa-cro">
      <div class="ctl-capa-et">Cronograma</div>
      <div class="ctl-capa-tit">${esc(ctlLojaNome())}</div>
      <div class="ctl-capa-sub">Licenças e manutenções preventivas: lance a última vez, o site conta a próxima</div>
    </div>
    ${aviso}
    <div class="bd-kpis ctl-nums">
      <div class="bd-kpi"><div class="bd-kpi-nome">Vencidos</div><div class="bd-kpi-num">${r.vencidos}</div></div>
      <div class="bd-kpi"><div class="bd-kpi-nome">Vencem em ${CRO_LOGO} dias</div><div class="bd-kpi-num">${r.logo}</div></div>
      <div class="bd-kpi"><div class="bd-kpi-nome">Em dia</div><div class="bd-kpi-num">${emDia}</div></div>
      <div class="bd-kpi"><div class="bd-kpi-nome">Próximo</div>
        <div class="bd-kpi-num">${r.proximo?ctlBrCurta(r.proximo.data):"—"}</div>
        <div class="bd-kpi-obs">${r.proximo?esc(r.proximo.area):""}</div></div>
    </div>
    <div class="ctl-barra">
      <button class="bd-btn bd-btn-principal" onclick="croImprimir()">Imprimir para o quadro</button>
      <button class="bd-btn bd-btn-secundario" onclick="croNovo()">+ Item</button>
      <button class="bd-btn bd-btn-fantasma" onclick="croPlanilha()">Baixar planilha (Excel)</button>
    </div>
    ${it.length?`<div class="bd-card ctl-bloco cro-lista">${it.map(croLinhaHTML).join("")}</div>
      <div class="ctl-sec cro-sec">Próximos 12 meses
        <span class="cro-nav">
          <button class="bd-btn bd-btn-fantasma bd-btn-p" onclick="croMeses(-1)" aria-label="Mês anterior">‹</button>
          <button class="bd-btn bd-btn-fantasma bd-btn-p" onclick="CRO_INICIO=null;renderCronograma()">Hoje</button>
          <button class="bd-btn bd-btn-fantasma bd-btn-p" onclick="croMeses(1)" aria-label="Próximo mês">›</button>
        </span></div>
      <div class="bd-card cro-grade-box">${croGradeHTML(it,CRO_INICIO,false)}</div>
      ${croLegendaHTML()}`
    :`<div class="bd-vazio"><div class="bd-vazio-ico">📅</div>
      <div class="bd-vazio-tit">Nada no cronograma desta loja</div>
      <div class="bd-vazio-txt">Cadastre licenças e preventivas (bebedouro, caixa d'água, dedetização…) com a última data. O site avisa antes de vencer.</div>
      <button class="bd-btn bd-btn-secundario" onclick="croNovo()">+ Primeiro item</button></div>`}`;
}
function croAviso(tipo,ico,tit,txt){
  return `<div class="bd-aviso bd-aviso-${tipo} ctl-aviso"><span class="bd-aviso-ico">${ico}</span>
    <div><b>${esc(tit)}</b>${esc(txt)}</div></div>`;
}
function croMeses(n){CRO_INICIO=ctlMaisMeses(CRO_INICIO,n);renderCronograma();}

function croLinhaHTML(d){
  if(CRO_EDIT===d.id)return croFormHTML(d);
  const s=croSituacao(d),S=CRO_SIT[s],p=croProxima(d);
  const falta=p?ctlDias(ctlHoje(),p):null;
  const quando=!p?"":(falta<0?"venceu há "+(-falta)+" dia"+(falta===-1?"":"s"):falta===0?"vence hoje":"faltam "+falta+" dia"+(falta===1?"":"s"));
  return `<div class="cro-lin cro-s-${s}">
    <div class="cro-area"><b>${esc(d.area||"(sem nome)")}</b>
      <small>${esc(d.resp||"sem responsável")} · ${croPeriodoTxt(d)}${d.obs?" · "+esc(d.obs):""}</small></div>
    <label class="ctl-rot cro-ult">Última vez<input type="date" class="bd-campo" value="${esc(d.ultima||"")}"
      onchange="croMudarData(${d.id},this.value)"></label>
    <div class="cro-prox"><span>Próxima</span><b>${p?ctlBr(p):(Number(d.periodo)?"—":"não vence")}</b>
      ${quando?`<small>${quando}</small>`:""}</div>
    <span class="bd-selo ${S.cls} cro-sit"><i></i>${S.rot}</span>
    <span class="cro-acoes">
      ${Number(d.periodo)?`<button class="bd-btn bd-btn-secundario bd-btn-p" onclick="croFeito(${d.id})" title="Marca que foi feito hoje e recalcula a próxima">Feito hoje</button>`:""}
      <button class="bd-btn bd-btn-fantasma bd-btn-p" onclick="CRO_EDIT=${d.id};renderCronograma()" aria-label="Editar ${esc(d.area||"")}">Editar</button>
    </span>
  </div>`;
}
function croFormHTML(d){
  const resps=[...new Set(croItens().map(x=>x.resp).filter(Boolean))];
  return `<div class="cro-form">
    <label class="ctl-rot ctl-rot-largo">O que é<input id="crf-area" class="bd-campo" value="${esc(d.area||"")}" placeholder="ex.: Bebedouro - 1º piso"></label>
    <label class="ctl-rot">Responsável<input id="crf-resp" class="bd-campo" list="crf-resps" value="${esc(d.resp||"")}">
      <datalist id="crf-resps">${resps.map(x=>`<option value="${esc(x)}">`).join("")}</datalist></label>
    <label class="ctl-rot">De quanto em quanto tempo<select id="crf-per" class="bd-campo">
      ${[[1,"Todo mês"],[2,"A cada 2 meses"],[3,"A cada 3 meses"],[4,"A cada 4 meses"],[6,"A cada 6 meses"],[12,"Todo ano"],[24,"A cada 2 anos"],[0,"Validade indeterminada"]]
        .map(([v,t])=>`<option value="${v}"${Number(d.periodo||0)===v?" selected":""}>${t}</option>`).join("")}
    </select></label>
    <label class="ctl-rot">Última vez<input id="crf-ult" type="date" class="bd-campo" value="${esc(d.ultima||"")}"></label>
    <label class="ctl-rot ctl-rot-largo">Observação<input id="crf-obs" class="bd-campo" value="${esc(d.obs||"")}"></label>
    <div class="ctl-pe-btns ctl-form-btns">
      <button class="bd-btn bd-btn-principal" onclick="croSalvar(${d.id})">Salvar</button>
      <button class="bd-btn bd-btn-secundario" onclick="CRO_EDIT=null;renderCronograma()">Cancelar</button>
      <button class="bd-btn bd-btn-fantasma" onclick="croExcluir(${d.id})">Excluir</button>
    </div></div>`;
}

/* a linha do tempo: 12 meses, uma marca por mês em que algo foi feito ou vence */
function croMarcasDoMes(d,ano,mes){
  const chave=ano+"-"+String(mes+1).padStart(2,"0");
  const feitos=[d.ultima,...(d.historico||[]).map(h=>h.data)].filter(x=>x&&x.slice(0,7)===chave);
  if(feitos.length)return {tipo:"feito",txt:ctlBrCurta(feitos[0])};
  if(!Number(d.periodo)||!d.ultima)return null;
  /* as próximas datas (a próxima e as seguintes, para ver o ano todo) */
  let p=croProxima(d), n=0;
  while(p&&p.slice(0,7)<chave&&n<40){p=ctlMaisMeses(p,Number(d.periodo));n++;}
  if(!p||p.slice(0,7)!==chave)return null;
  const hoje=ctlHoje(), f=ctlDias(hoje,p);
  if(n===0&&f<0)return {tipo:"vencido",txt:ctlBrCurta(p)};
  if(n===0&&f<=CRO_LOGO)return {tipo:"logo",txt:ctlBrCurta(p)};
  return {tipo:"previsto",txt:ctlBrCurta(p)};
}
function croGradeHTML(it,inicio,folha){
  const meses=[];
  for(let i=0;i<12;i++){const iso=ctlMaisMeses(inicio,i);meses.push([ctlData(iso).getFullYear(),ctlData(iso).getMonth()]);}
  const hoje=ctlHoje().slice(0,7);
  const cab=meses.map(([a,m])=>{
    const atual=a+"-"+String(m+1).padStart(2,"0")===hoje;
    return `<th class="${atual?"cro-mes-atual":""}">${CTL_MESES[m]}<small>${String(a).slice(2)}</small></th>`;}).join("");
  /* vencido que ficou antes do primeiro mês da grade: mostra na 1ª coluna */
  const linhas=it.map(d=>{
    let cels;
    if(!Number(d.periodo)){
      cels=`<td colspan="12" class="cro-indet">Validade indeterminada${d.ultima?" · desde "+ctlBr(d.ultima):""}</td>`;
    }else{
      cels=meses.map(([a,m],i)=>{
        let mk=croMarcasDoMes(d,a,m);
        if(i===0&&!mk&&croSituacao(d)==="vencido"&&croProxima(d).slice(0,7)<(a+"-"+String(m+1).padStart(2,"0")))
          mk={tipo:"vencido",txt:"desde "+ctlBrCurta(croProxima(d))};
        return `<td>${mk?`<span class="cro-mk cro-mk-${mk.tipo}${folha?" pc":""}">${esc(mk.txt)}</span>`:""}</td>`;
      }).join("");
    }
    return `<tr><th class="cro-g-area">${esc(d.area||"")}<small>${esc(d.resp||"")}</small></th>${cels}</tr>`;
  }).join("");
  return `<table class="cro-grade"><thead><tr><th class="cro-g-area"></th>${cab}</tr></thead><tbody>${linhas}</tbody></table>`;
}
function croLegendaHTML(){
  return `<div class="cro-leg">
    <span><span class="cro-mk cro-mk-feito">dd/mm</span> feito</span>
    <span><span class="cro-mk cro-mk-previsto">dd/mm</span> previsto</span>
    <span><span class="cro-mk cro-mk-logo">dd/mm</span> vence em até ${CRO_LOGO} dias</span>
    <span><span class="cro-mk cro-mk-vencido">dd/mm</span> vencido</span></div>`;
}

/* ---- ações ---- */
async function croMudarData(id,valor){
  const d=DATA.find(x=>x.id===id);if(!d)return;
  if(valor===(d.ultima||""))return;
  /* a data antiga vira histórico (só se for anterior: corrigir um erro de digitação não conta) */
  if(d.ultima&&valor&&valor>d.ultima){
    d.historico=(d.historico||[]).filter(h=>h.data!==d.ultima);
    d.historico.push({data:d.ultima});
  }
  d.ultima=valor||"";
  await ctlGravar(d);
  renderCronograma();
  const p=croProxima(d);
  toast(p?"Próxima: "+ctlBr(p):"Data salva");
}
async function croFeito(id){
  const d=DATA.find(x=>x.id===id);if(!d)return;
  const hoje=ctlHoje();
  if(d.ultima===hoje){toast("Já está marcado como feito hoje.");return;}
  if(!confirm("Marcar “"+d.area+"” como feito hoje ("+ctlBr(hoje)+")?"))return;
  await croMudarData(id,hoje);
}
async function croNovo(){
  const it=croItens();
  const o={uid:newUid(),tipo:"cro",loja:currentStore,area:"",resp:"",periodo:6,ultima:"",
    historico:[],obs:"",ordem:it.reduce((m,d)=>Math.max(m,Number(d.ordem)||0),0)+1,criado:"manual"};
  await ctlGravar(o);
  CRO_EDIT=o.id;renderCronograma();
  const p=document.getElementById("crf-area");if(p)p.focus();
}
async function croSalvar(id){
  const d=DATA.find(x=>x.id===id);if(!d)return;
  const v=k=>document.getElementById(k).value.trim();
  if(!v("crf-area")){toast("Escreva o que é (ex.: Bebedouro - 1º piso).");return;}
  const nova=v("crf-ult");
  if(d.ultima&&nova&&nova>d.ultima){
    d.historico=(d.historico||[]).filter(h=>h.data!==d.ultima);d.historico.push({data:d.ultima});
  }
  Object.assign(d,{area:v("crf-area"),resp:v("crf-resp"),periodo:Number(v("crf-per"))||0,ultima:nova,obs:v("crf-obs")});
  await ctlGravar(d);
  CRO_EDIT=null;renderCronograma();toast("Salvo ✓");
}
async function croExcluir(id){
  const d=DATA.find(x=>x.id===id);if(!d)return;
  if(!confirm("Excluir “"+(d.area||"este item")+"” do cronograma?\n\nDá para desfazer com Ctrl+Z."))return;
  d.deleted=true;await ctlGravar(d);
  CRO_EDIT=null;renderCronograma();toast("Item excluído");
}

/* ============================================================== imprimir */
function croImprimir(){
  const it=croItens();
  if(!it.length){toast("Cadastre um item primeiro.");return;}
  const hoje=ctlHoje(), r=croResumo();
  const linhas=it.map(d=>{
    const s=croSituacao(d),S=CRO_SIT[s],p=croProxima(d);
    return `<tr><td><b>${esc(d.area||"")}</b>${d.obs?`<i>${esc(d.obs)}</i>`:""}</td><td>${esc(d.resp||"")}</td>
      <td class="c">${Number(d.periodo)?d.periodo+(Number(d.periodo)===1?" mês":" meses"):"—"}</td>
      <td class="c">${ctlBr(d.ultima)}</td><td class="c"><b>${p?ctlBr(p):"indeterminada"}</b></td>
      <td class="c"><span class="st st-${s} pc">${esc(S.rot)}</span></td></tr>`;}).join("");
  const css=ctlFolhaCss(true)+`
    .tb th{font-size:8px;text-transform:uppercase;letter-spacing:.8px;color:#fff;background:#1d6b57;
      padding:5px 7px;text-align:left;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .tb td{padding:5px 7px;border-bottom:1px solid #eaecf0;font-size:11px;vertical-align:middle}
    .tb td i{display:block;font-style:normal;font-size:9px;color:#667085}
    .tb td.c{text-align:center;white-space:nowrap}
    .st{display:inline-block;font-size:9px;font-weight:700;padding:1px 8px;border-radius:99px;border:1px solid}
    .st-ok{background:#e8f5ee;border-color:#9fd3b5;color:#14653f}
    .st-logo{background:#fdf1e3;border-color:#eab676;color:#8a5216}
    .st-vencido{background:#fef3f2;border-color:#f3b4ae;color:#b42318}
    .st-indet,.st-vazio{background:#eef4ff;border-color:#b2ccff;color:#1d4ed8}
    h3{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#155244;margin:12px 0 5px}
    .cro-grade{width:100%;border-collapse:collapse;table-layout:fixed}
    .cro-grade th,.cro-grade td{border:1px solid #eaecf0;text-align:center;font-size:9px;padding:3px 2px;height:22px}
    .cro-grade thead th{background:#f2f4f7;color:#344054;font-weight:700;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .cro-grade thead th small{display:block;font-weight:400;color:#667085;font-size:7.5px}
    .cro-grade .cro-mes-atual{background:#e8f5f0;color:#155244}
    .cro-g-area{width:46mm;text-align:left!important;font-size:9.5px!important;font-weight:700;color:#344054;padding-left:6px!important}
    .cro-g-area small{display:block;font-weight:400;color:#667085;font-size:8px}
    .cro-indet{color:#1d4ed8;font-style:italic;background:#f5f8ff}
    .cro-mk{display:inline-block;border-radius:4px;padding:1px 4px;font-weight:700;font-size:8.5px;border:1px solid}
    .cro-mk-feito{background:#e8f5ee;border-color:#9fd3b5;color:#14653f}
    .cro-mk-feito::before{content:"✓ "}
    .cro-mk-previsto{background:#fff;border-color:#98a2b3;color:#344054}
    .cro-mk-logo{background:#fdf1e3;border-color:#eab676;color:#8a5216}
    .cro-mk-vencido{background:#fef3f2;border-color:#f3b4ae;color:#b42318}
    .cro-leg{display:flex;flex-wrap:wrap;gap:12px;margin-top:6px;font-size:9px;color:#475467}`;
  const html=`<div class="folha">
    ${ctlFolhaCapa("Cronograma · "+String(ctlLojaNome()).split(/\s+[–—·-]\s+/)[0],
      "Licenças e Manutenções Preventivas",[["Emitido em",ctlBr(hoje)],["Responsável",(typeof RT_INFO!=="undefined"&&RT_INFO)||"RT"]],
      [["Itens",String(r.total)],["Vencidos",String(r.vencidos)],["Vencem em "+CRO_LOGO+" dias",String(r.logo)],
       ["Próximo",r.proximo?r.proximo.area+" · "+ctlBr(r.proximo.data):"—"]])}
    <table class="tb"><thead><tr class="pc"><th>Item</th><th>Responsável</th><th style="text-align:center">Período</th>
      <th style="text-align:center">Última vez</th><th style="text-align:center">Próxima</th><th style="text-align:center">Situação</th></tr></thead>
      <tbody>${linhas}</tbody></table>
    <h3>Próximos 12 meses</h3>
    ${croGradeHTML(it,hoje.slice(0,8)+"01",true)}
    ${croLegendaHTML().replace(/class="cro-mk /g,'class="pc cro-mk ')}
    <div class="leg">O site calcula a próxima data a partir da última vez que foi feito.
      Vence logo = faltam ${CRO_LOGO} dias ou menos.</div>
  </div>`;
  const nome=typeof nomePadrao==="function"?nomePadrao("CRO",hoje,["Cronograma"]):"Cronograma";
  ctlAbrirFolha(nome,css,html);
}
function croPlanilha(){
  const linhas=[["Item","Responsável","Período (meses)","Última vez","Próxima","Situação","Observação"]];
  croItens().forEach(d=>linhas.push([d.area||"",d.resp||"",Number(d.periodo)||"indeterminada",
    ctlBr(d.ultima),croProxima(d)?ctlBr(croProxima(d)):"",CRO_SIT[croSituacao(d)].rot,d.obs||""]));
  ctlBaixarPlanilha("Cronograma - "+currentStore,linhas);
}

/* pendente = vencido ou vence logo; concluído = em dia (conta no total da loja) */
if(typeof STATUS_FNS!=="undefined"){
  STATUS_FNS.cro={
    isPend:d=>{const s=croSituacao(d);return s==="vencido"||s==="logo";},
    isDone:d=>{const s=croSituacao(d);return s==="ok"||s==="indet";}
  };
}
