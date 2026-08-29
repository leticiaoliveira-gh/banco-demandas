/* =====================================================================
   AGENDA DO SUMÁRIO (28/08) — o que é meu hoje, de todas as abas
   ---------------------------------------------------------------------
   Pedido dela, com as palavras dela: "pensei em criar um calendário, daí
   vai ter tudo que eu tenho em pendência naquele dia, e se eu não marcar
   como concluído ele vai pulando pro próximo dia, e eu marco a semana que
   estarei em cada empresa. Esse calendário seria geral e não somente da
   demanda de manutenções".

   DUAS COISAS QUE NÃO PODEM MUDAR:

   1. NADA É REAGENDADO NO BANCO. O que venceu e não foi resolvido aparece
      em "Atrasado", no topo, todo dia, até ela resolver. É o "vai pulando
      pro próximo dia" dela, sem mexer nas datas que ela escreveu. Data que
      o site muda sozinho é data em que ela não pode confiar, e ela assina
      esse trabalho com o CRN.

   2. NASCE DESLIGADO. Ela já mandou tirar bloco de tela duas vezes ("por
      que inseriu cards ali sem eu pedir? retorna sem"). Liga na caixinha
      de "Organizar a capa".

   DE ONDE SAI CADA PENDÊNCIA:
   | Quadro Geral (dg)          | prazo               | prazo de verdade |
   | Tratativa de inspeção      | tratativa.prazo     | prazo de verdade |
   | Manutenção (mnt28)         | dia de visita       | compromisso dela |
   Só o Quadro Geral e as tratativas têm data de vencimento. As outras abas
   guardam data do passado (quando aconteceu), que é idade, não prazo — por
   isso não entram na lista de hoje.
   ===================================================================== */

/* os dias em que ela estará em cada loja. Mora na configuração da capa, que
   já viaja no backup e na sincronização — nada a fazer em js/sync.js. */
function agVisitas(loja){
  const v=(CAPA_CFG&&CAPA_CFG.visitas)||{};
  return (v[loja||currentStore]||[]).slice().sort();
}
async function agMarcarVisita(dia){
  const loja=currentStore;if(!loja||!dia)return;
  CAPA_CFG.visitas=CAPA_CFG.visitas||{};
  const l=(CAPA_CFG.visitas[loja]||[]).slice();
  const i=l.indexOf(dia);
  if(i>=0)l.splice(i,1);else l.push(dia);
  CAPA_CFG.visitas[loja]=l.sort();
  await salvarCapaCfg();
  agRender();
  toast(i>=0?"Dia desmarcado":"Dia marcado: você estará na loja");
}

/* ---- o que está pendente e tem data ---- */
function agPendencias(){
  const hoje=today(),out=[];
  const vivos=DATA.filter(d=>!d.deleted&&d.loja===currentStore);

  /* Quadro Geral: o único campo de prazo de verdade do site */
  for(const d of vivos){
    if(d.tipo!=="dg")continue;
    if(typeof DG_CHAVE_CONCLUIDO!=="undefined"&&d.situacao===DG_CHAVE_CONCLUIDO)continue;
    const q=String(d.prazo||"").slice(0,10);
    if(!q)continue;
    out.push({dia:q,aba:"dg",titulo:d.titulo||"(sem título)",
      urgente:typeof DG_CHAVE_URGENTE!=="undefined"&&d.prioridade===DG_CHAVE_URGENTE});
  }
  /* Tratativas: o prazo que ela combina ao tratar uma não conformidade */
  for(const d of vivos){
    if(d.tipo!=="ckp"&&d.tipo!=="ckqp")continue;
    const r=d.respostas||{};
    for(const k in r){
      const t=r[k]&&r[k].tratativa;
      if(!t||t.feito)continue;
      const q=String(t.prazo||"").slice(0,10);
      if(!q)continue;
      out.push({dia:q,aba:d.tipo==="ckp"?"ck":"ckq",
        titulo:(t.acao||t.oque||"Tratativa de inspeção")});
    }
  }
  /* Os dias de visita: no dia de ir à loja, o que ela precisa conferir lá */
  const nVer=vivos.filter(d=>d.tipo==="mnt28"&&d.verificar&&!d.feito).length;
  if(nVer)for(const dia of agVisitas()){
    if(dia<hoje)continue;   /* visita que já passou não é compromisso futuro */
    out.push({dia,aba:"mnt28",visita:true,
      titulo:"Conferir na loja: "+nVer+(nVer===1?" serviço":" serviços")});
  }
  return out.sort((a,b)=>a.dia.localeCompare(b.dia));
}

/* ---- as faixas: atrasado, hoje, amanhã, esta semana, depois ---- */
function agFaixa(dia){
  const hoje=today();
  if(dia<hoje)return "atrasado";
  if(dia===hoje)return "hoje";
  const d=new Date(hoje+"T12:00:00");
  d.setDate(d.getDate()+1);
  const amanha=d.toISOString().slice(0,10);
  if(dia===amanha)return "amanha";
  d.setDate(d.getDate()+6);
  return dia<=d.toISOString().slice(0,10)?"semana":"depois";
}
const AG_FAIXAS=[["atrasado","Atrasado"],["hoje","Hoje"],["amanha","Amanhã"],
  ["semana","Esta semana"],["depois","Mais para a frente"]];

/* ---- a tela ---- */
let AG_MES=null;   /* null = lista; "2026-08" = grade daquele mês */
function agRender(){
  const box=document.getElementById("hub-calendario");if(!box)return;
  if(!CAPA_CFG.mostrarAgenda){box.innerHTML="";box.hidden=true;return;}
  box.hidden=false;
  const itens=agPendencias(),hoje=today();
  const porFaixa={};
  for(const p of itens)(porFaixa[agFaixa(p.dia)]=porFaixa[agFaixa(p.dia)]||[]).push(p);

  const nAtras=(porFaixa.atrasado||[]).length,nHoje=(porFaixa.hoje||[]).length;
  const nSemana=(porFaixa.amanha||[]).length+(porFaixa.semana||[]).length;
  const naLoja=agVisitas().includes(hoje);
  const nVer=DATA.filter(d=>!d.deleted&&d.loja===currentStore&&d.tipo==="mnt28"&&d.verificar&&!d.feito).length;

  const chip=(n,rot,cls)=>`<span class="bd-ag-chip${n?" "+cls:""}">${n} ${rot}</span>`;
  let html=`<div class="bd-card bd-ag-card"><div class="bd-ag-topo">
      <div><b>Minha agenda</b>
        <div class="bd-ag-sub">${itens.length?"O que tem data marcada, de todos os quadros desta loja."
          :"Nada com data marcada nesta loja."}</div></div>
      <div class="bd-ag-chips">${chip(nAtras,"atrasado","atras")}${chip(nHoje,"para hoje","hoje")}${chip(nSemana,"esta semana","sem")}</div>
    </div>`;

  /* o dia da visita: é o momento em que o lembrete precisa aparecer */
  if(naLoja&&nVer)html+=`<div class="bd-aviso bd-aviso-info bd-ag-visita">
      <span class="bd-aviso-ico" aria-hidden="true">📍</span>
      <div><b>Hoje você está nesta loja.</b> Há ${nVer} ${nVer===1?"serviço":"serviços"} para conferir.
        <div><button class="btn sm" onclick="m28ListaDeBolso()">📋 Abrir a lista para levar</button></div></div>
    </div>`;

  html+=AG_MES?agGradeHTML():agListaHTML(porFaixa);
  html+=`<div class="bd-ag-pe">
      <button class="btn ghost sm" onclick="agVerMes()">${AG_MES?"← Voltar para a lista":"📅 Ver o mês"}</button>
      <span class="bd-ajuda">Marque no mês os dias em que você estará nesta loja.</span>
    </div></div>`;
  box.innerHTML=html;
}

function agListaHTML(porFaixa){
  if(!Object.keys(porFaixa).length)return `<div class="bd-ag-vazio">
    Quando você puser um prazo numa demanda do Quadro Geral, ou combinar um prazo numa
    inspeção, ele aparece aqui. Marque também no mês os dias em que estará na loja.</div>`;
  let h="";
  for(const [k,rot] of AG_FAIXAS){
    const l=porFaixa[k];if(!l||!l.length)continue;
    h+=`<div class="bd-ag-faixa bd-ag-${k}">${rot}<span>${l.length}</span></div>`;
    for(const p of l)h+=agLinhaHTML(p);
  }
  return `<div class="bd-ag-lista">${h}</div>`;
}
function agLinhaHTML(p){
  const a=TABS[p.aba]||{};
  const nome=typeof rotuloAba==="function"?rotuloAba(p.aba):(a.label||"");
  return `<button class="bd-ag-item" onclick="${p.visita?"m28ListaDeBolso()":`showTab('${p.aba}')`}"
      title="Abrir ${esc(nome)}">
    <span class="bd-ag-dia">${esc(brDate(p.dia).slice(0,5))}</span>
    <span class="bd-ag-txt">${p.urgente?'<i class="bd-ag-urg">Urgente</i> ':""}${esc(p.titulo)}
      <i class="bd-ag-aba"><i style="background:${a.cor||"#667085"}"></i>${esc(nome)}</i></span></button>`;
}

/* ---- a grade do mês ---- */
function agVerMes(){ AG_MES=AG_MES?null:today().slice(0,7); agRender(); }
function agMesMover(n){
  const [a,m]=AG_MES.split("-").map(Number);
  const d=new Date(a,m-1+n,1);
  AG_MES=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
  agRender();
}
function agGradeHTML(){
  const [ano,mes]=AG_MES.split("-").map(Number);
  const hoje=today(),visitas=agVisitas();
  const porDia={};
  for(const p of agPendencias())(porDia[p.dia]=porDia[p.dia]||[]).push(p);
  const primeiro=new Date(ano,mes-1,1), dias=new Date(ano,mes,0).getDate();
  const nomeMes=(typeof M28_MESES!=="undefined"?M28_MESES[mes-1]:"")||"";
  let cel="";
  for(let i=0;i<primeiro.getDay();i++)cel+=`<span class="bd-ag-vaz"></span>`;
  for(let d=1;d<=dias;d++){
    const iso=ano+"-"+String(mes).padStart(2,"0")+"-"+String(d).padStart(2,"0");
    const n=(porDia[iso]||[]).length, vis=visitas.includes(iso);
    const atras=iso<hoje&&n;
    /* a cor nunca conta a história sozinha: a palavra vai no texto de ajuda e
       na etiqueta de leitura de tela, e o dia atrasado leva um "!" na pastilha */
    const diz=[vis?"você estará na loja":"",
               iso===hoje?"hoje":"",
               n?(atras?n+" atrasado"+(n===1?"":"s"):n+" com data"):""].filter(Boolean).join(" · ");
    cel+=`<button class="bd-ag-dd${iso===hoje?" hoje":""}${vis?" visita":""}${atras?" atras":""}"
        onclick="agMarcarVisita('${iso}')"
        title="Dia ${d}${diz?" — "+diz:""}. Toque para ${vis?"desmarcar":"marcar"} que você estará na loja."
        aria-label="Dia ${d}${diz?", "+diz:""}"
        aria-pressed="${vis?"true":"false"}">
      <span class="bd-ag-dn">${d}</span>
      ${n?`<span class="bd-ag-pt">${atras?"!":""}${n}</span>`:""}
      ${vis?`<span class="bd-ag-vs" aria-hidden="true">📍</span>`:""}</button>`;
  }
  return `<div class="bd-ag-mes">
    <div class="bd-ag-mes-topo">
      <button class="btn ghost sm" onclick="agMesMover(-1)" aria-label="Mês anterior">‹</button>
      <b>${esc((nomeMes.charAt(0).toUpperCase()+nomeMes.slice(1))+" de "+ano)}</b>
      <button class="btn ghost sm" onclick="agMesMover(1)" aria-label="Próximo mês">›</button>
    </div>
    <div class="bd-ag-sem"><span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span></div>
    <div class="bd-ag-grade">${cel}</div>
    <div class="bd-ag-leg"><span class="bd-ag-leg-i"><i class="p"></i>tem coisa com data</span>
      <span class="bd-ag-leg-i"><i class="a">!</i>tem coisa atrasada</span>
      <span class="bd-ag-leg-i"><i class="v">📍</i>você estará na loja</span></div></div>`;
}
