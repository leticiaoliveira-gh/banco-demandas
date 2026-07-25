/* =====================================================================
   ABA INDICADORES — "minha área não faz a empresa ganhar dinheiro,
   mas evita que perca" — números REAIS para a gerência/diretoria.

   REGRAS herdadas do resto do site (não quebrar):
   - Globals de OUTROS arquivos sempre via typeof X!=="undefined" (v7.8).
   - Configuração nova grava com metaSetU, nunca metaSet (v8.7) —
     esta aba não grava configuração nenhuma; filtros ficam só na memória.
   - NUNCA um número que deponha contra ela (v8.3): 0% resolvido vira
     "em acompanhamento", nunca vermelho acusatório. NUNCA inventar R$.
   - Textos fixos com data-txt; entrada em CFG_ABAS; sem biblioteca externa
     (barras do gráfico são HTML/CSS puro — o site é offline-first).
   ===================================================================== */

/* ---- filtros (só na memória da tela; não é configuração dela) ---- */
let IND_PER="mes";   /* mes | anterior | 6m */
let IND_LOJA="";     /* "" = todas as lojas do grupo; ou o código de uma */

/* ---- período ---- */
function indYm(off){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()+(off||0));
  return d.toISOString().slice(0,7);}
function indPeriodo(){
  if(IND_PER==="anterior"){const ym=indYm(-1);return{de:ym,ate:ym,rot:"Mês anterior ("+indMesRot(ym)+")"};}
  if(IND_PER==="6m")return{de:indYm(-5),ate:indYm(0),rot:"Últimos 6 meses"};
  const ym=indYm(0);return{de:ym,ate:ym,rot:"Mês atual ("+indMesRot(ym)+")"};
}
function indMesRot(ym){
  const M=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  const [a,m]=String(ym).split("-");return (M[(+m||1)-1]||"")+"/"+String(a).slice(2);
}
function indNoPer(ym){const p=indPeriodo();return ym&&ym>=p.de&&ym<=p.ate;}

/* ---- lojas: quando a empresa tem grupo, dá para filtrar por loja ---- */
function indLojasDoGrupo(){
  const g=(typeof grupoDe==="function")?grupoDe(currentStore):"";
  if(!g)return [empresa(currentStore)].filter(Boolean);
  return lojasDoGrupo(g).filter(e=>e.code!==g);
}
function indCodes(){
  if(IND_LOJA)return [IND_LOJA];
  return indLojasDoGrupo().map(e=>e.code);
}

/* ---- leitura dos itens reais (nc + mnt) ---- */
function indItens(){
  const cod=indCodes();
  return DATA.filter(d=>!d.deleted&&(d.tipo==="nc"||d.tipo==="mnt")&&cod.includes(d.loja));
}
function indResolvido(d){
  if(d.tipo==="nc")return d.status==="Resolvida";
  return /conclu|realizad|resolvid/i.test(String(d.status||""));
}
/* data em que foi resolvido: nc guarda resolvida_em; mnt usa a última mexida */
function indDataFim(d){
  return String((d.tipo==="nc"?d.resolvida_em:d.atualizacao)||"").slice(0,10);
}
function indDataIni(d){return String(d.relato||"").slice(0,10);}
function indDias(a,b){
  if(!a||!b)return null;
  const n=(new Date(b)-new Date(a))/86400000;
  return (isFinite(n)&&n>=0)?Math.round(n):null;
}

/* ---- os números do período ---- */
function indNumeros(){
  const it=indItens();
  const ident=it.filter(d=>indNoPer(indDataIni(d).slice(0,7)));
  const resolv=it.filter(d=>indResolvido(d)&&indNoPer(indDataFim(d).slice(0,7)));
  const identResolv=ident.filter(indResolvido);
  const pct=ident.length?Math.round(identResolv.length*100/ident.length):null;
  const tempos=resolv.map(d=>indDias(indDataIni(d),indDataFim(d))).filter(n=>n!==null);
  const tMedio=tempos.length?Math.round(tempos.reduce((a,b)=>a+b,0)/tempos.length):null;
  const urgentes=resolv.filter(d=>d.tipo==="nc"&&d.urgencia==="URGENTE").length;
  /* reincidência evitada = resolvido que NÃO voltou (nunca foi reaberto) */
  const semVolta=resolv.filter(d=>!(d.reaberturas>0)).length;
  return {ident:ident.length,resolv:resolv.length,pct,tMedio,urgentes,semVolta};
}

/* ---- evolução mês a mês (últimos 6 meses, sempre) ---- */
function indEvolucao(){
  const it=indItens(),out=[];
  for(let off=-5;off<=0;off++){
    const ym=indYm(off);
    out.push({ym,rot:indMesRot(ym),
      ident:it.filter(d=>indDataIni(d).slice(0,7)===ym).length,
      resolv:it.filter(d=>indResolvido(d)&&indDataFim(d).slice(0,7)===ym).length});
  }
  return out;
}

/* ---- prevenção de perdas: o que foi visto no checklist (👎) e resolvido ----
   Classifica pelo TEXTO da pergunta/seção — só contagens reais, nunca R$. */
const IND_CATS=[
  {k:"validade",re:/venc|validade|prazo\s+de\s+consumo|data\s+de\s+fabrica/i,
   frase:n=>n+(n===1?" produto/lote com prazo de validade irregular retirado ou corrigido antes de chegar ao cliente":" produtos/lotes com prazo de validade irregular retirados ou corrigidos antes de chegarem ao cliente")},
  {k:"temperatura",re:/temperat|c[âa]mara|freezer|geladeira|refrigera|congel|frio/i,
   frase:n=>n+(n===1?" desvio de temperatura corrigido, protegendo os produtos armazenados":" desvios de temperatura corrigidos, protegendo os produtos armazenados")},
  {k:"higiene",re:/limp|higien|saniti|sujidade/i,
   frase:n=>n+(n===1?" falha de limpeza/higienização corrigida, reduzindo risco sanitário":" falhas de limpeza/higienização corrigidas, reduzindo risco sanitário")},
  {k:"pragas",re:/praga|inset|roedor|barata|mosca/i,
   frase:n=>n+(n===1?" indício de praga tratado antes de virar problema de fiscalização":" indícios de pragas tratados antes de virarem problema de fiscalização")},
  {k:"equipamento",re:/equipament|balan[çc]a|forno|fatiador|serra|motor|exaust/i,
   frase:n=>n+(n===1?" equipamento com defeito encaminhado, evitando parada de produção":" equipamentos com defeito encaminhados, evitando parada de produção")},
  {k:"estrutura",re:/piso|parede|teto|porta|ralo|infiltra|el[ée]tric|l[âa]mpada|tomada/i,
   frase:n=>n+(n===1?" problema de estrutura/instalação corrigido antes de gerar interdição ou acidente":" problemas de estrutura/instalação corrigidos antes de gerarem interdição ou acidente")}
];
function indColetaCheck(){
  const cod=indCodes(),out=[];
  const varre=(tipo,achar,expandir)=>{
    if(typeof achar!=="function"||typeof expandir!=="function")return;
    for(const p of DATA){
      if(p.deleted||p.tipo!==tipo||!cod.includes(p.loja))continue;
      if(p.status!=="concluido"&&p.status!=="andamento")continue;
      const mo=achar(p.modeloUid);if(!mo)continue;
      for(const c of expandir(mo,p)){
        const r=(p.respostas||{})[c.chave];
        if(!r||r.na)continue;
        if(!(r.valor==="nao"||r.valor==="I"))continue;
        const quando=String(r.resolvidoEm||p.concluidoEm||p.atualizacao||"").slice(0,7);
        if(!indNoPer(quando))continue;
        out.push({titulo:(c.q&&c.q.titulo)||"",secao:(c.q&&c.q.secao)||"",
          resolvido:!!r.resolvidoEm});
      }
    }
  };
  varre("ckp",(typeof ckAchar!=="undefined")?ckAchar:null,(typeof ckExpandir!=="undefined")?ckExpandir:null);
  varre("ckqp",(typeof ckqAchar!=="undefined")?ckqAchar:null,(typeof ckqExpandir!=="undefined")?ckqExpandir:null);
  return out;
}
function indPrevencao(){
  const achados=indColetaCheck();
  const linhas=[];
  for(const cat of IND_CATS){
    const n=achados.filter(a=>a.resolvido&&(cat.re.test(a.titulo)||cat.re.test(a.secao))).length;
    if(n)linhas.push({k:cat.k,n,frase:cat.frase(n)});
  }
  /* + o que foi resolvido nas abas de NC e Manutenções, como argumento geral */
  const nums=indNumeros();
  return {linhas,pendCheck:achados.filter(a=>!a.resolvido).length,nums};
}

/* ---- número "ruim" nunca sai acusatório: vira acompanhamento neutro ---- */
function indPctTexto(nums){
  if(nums.ident===0)return {v:"—",s:"sem novos registros no período"};
  if(nums.pct===0)return {v:"em acompanhamento",s:nums.ident+" em tratativa",neutro:true};
  return {v:nums.pct+"%",s:"dos registros do período já resolvidos"};
}

/* =====================================================================
   OS GRÁFICOS — usam as peças bd-g-* da biblioteca (catalogo/graficos).
   Regras da biblioteca respeitadas aqui:
   · o valor vai SEMPRE escrito junto da cor (cor nunca conta sozinha);
   · a 2ª série é TRACEJADA, então dá para ler impresso em preto e branco;
   · nada de texto dentro do SVG (nome de mês e número ficam fora, em HTML);
   · no máximo 6 cores da paleta — o que sobra vira "Outros".
   ===================================================================== */

/* 1) "Qual área está pior?" — barras deitadas com o que está EM ABERTO */
function indGrafAreas(){
  const abertos=indItens().filter(d=>!indResolvido(d));
  const porArea={};
  for(const d of abertos){
    const a=String(d.area||"").trim()||"Sem área definida";
    porArea[a]=porArea[a]||{n:0,urg:0};
    porArea[a].n++;
    if(d.tipo==="nc"&&d.urgencia==="URGENTE")porArea[a].urg++;
  }
  const rank=Object.entries(porArea).sort((a,b)=>b[1].n-a[1].n||b[1].urg-a[1].urg);
  if(!rank.length)return `<div class="bd-g"><div class="bd-g-tit">${txt("ind.g.areas","Onde estão os pontos em aberto")}</div>
    <div class="bd-g-sub">nada em aberto no momento</div>
    <div class="bd-g-nota">Quando houver pontos abertos, as áreas aparecem aqui, da pior para a melhor.</div></div>`;
  /* a paleta tem 6 cores e não se acrescenta uma sétima: o resto vira "Outros" */
  const topo=rank.slice(0,6), resto=rank.slice(6);
  const restoN=resto.reduce((s,[,v])=>s+v.n,0);
  if(restoN)topo.push(["Outros ("+resto.length+" áreas)",{n:restoN,urg:0}]);
  const max=Math.max(1,...topo.map(([,v])=>v.n));
  const linhas=topo.map(([nome,v])=>{
    const cor=v.urg?"c5":"c1";   /* vermelho só onde há urgente — e escrito também */
    return `<div class="bd-g-lin">
      <div class="bd-g-nome">${esc(nome)}</div>
      <div class="bd-g-trilho" data-dica="${esc(nome)}: ${v.n} em aberto${v.urg?", "+v.urg+" urgente"+(v.urg===1?"":"s"):""}">
        <div class="bd-g-barra ${cor}" style="width:${Math.max(2,Math.round(v.n*100/max))}%"></div></div>
      <div class="bd-g-val">${v.n}${v.urg?" ⚠":""}</div></div>`;}).join("");
  const comUrg=topo.filter(([,v])=>v.urg).length;
  return `<div class="bd-g">
    <div class="bd-g-tit">${txt("ind.g.areas","Onde estão os pontos em aberto")}</div>
    <div class="bd-g-sub">por área, do maior para o menor</div>
    <div class="bd-g-corpo bd-g-barras">${linhas}</div>
    <div class="bd-g-nota">${comUrg?("⚠ marca área com ponto urgente ("+comUrg+" no total).")
      :"Nenhuma dessas áreas tem ponto urgente."}</div></div>`;
}

/* 2) "Está melhorando?" — linha do tempo, 6 meses, resolvidos (cheia) x identificados (tracejada) */
function indGrafEvolucao(evo){
  const max=Math.max(1,...evo.map(m=>Math.max(m.ident,m.resolv)));
  const n=evo.length||1;
  const X=i=>Math.round(14+i*(326-14)/(n>1?n-1:1));
  const Y=v=>Math.round(128-(v/max)*(128-12));
  const pts=k=>evo.map((m,i)=>X(i)+","+Y(m[k])).join(" ");
  const ult=evo[n-1]||{ident:0,resolv:0};
  const vazio=evo.every(m=>!m.ident&&!m.resolv);
  return `<div class="bd-g">
    <div class="bd-g-tit">${txt("ind.g.evo","Está melhorando?")}</div>
    <div class="bd-g-sub">últimos 6 meses — identificados × resolvidos</div>
    <div class="bd-g-corpo">
      <svg class="bd-g-svg" viewBox="0 0 340 130" role="img"
        aria-label="Gráfico de linha dos últimos 6 meses. Resolvidos terminam em ${ult.resolv}; identificados terminam em ${ult.ident}.">
        <line class="bd-g-grade" x1="0" y1="12" x2="340" y2="12"/>
        <line class="bd-g-grade" x1="0" y1="51" x2="340" y2="51"/>
        <line class="bd-g-grade" x1="0" y1="90" x2="340" y2="90"/>
        <line class="bd-g-grade" x1="0" y1="128" x2="340" y2="128"/>
        <polyline class="bd-g-linha-s1" points="${pts("resolv")}"/>
        <circle class="bd-g-ponto-cheio" cx="${X(n-1)}" cy="${Y(ult.resolv)}"/>
        <polyline class="bd-g-linha-s2" points="${pts("ident")}"/>
        <circle class="bd-g-ponto-s2" cx="${X(n-1)}" cy="${Y(ult.ident)}"/>
      </svg>
      <div class="bd-g-eixo-x">${evo.map(m=>`<span>${esc(m.rot)}</span>`).join("")}</div>
    </div>
    <div class="bd-g-legenda">
      <span class="bd-g-leg"><i style="background:#0a7d63"></i>Resolvidos — linha cheia · <b>${ult.resolv} no mês</b></span>
      <span class="bd-g-leg"><i style="background:#1668b8"></i>Identificados — linha tracejada · <b>${ult.ident} no mês</b></span>
    </div>
    ${vazio?`<div class="bd-g-nota">Ainda sem lançamentos nestes meses.</div>`:""}</div>`;
}

/* 3) "Estou perto do alvo?" — medidor. NUNCA um número que a prejudique:
      sem registros ou 0% não vira vermelho acusatório, vira acompanhamento. */
function indGrafMeta(nums,pct){
  if(nums.ident===0||nums.pct===null||nums.pct===0){
    return `<div class="bd-g">
      <div class="bd-g-tit">${txt("ind.g.meta","Resolução do período")}</div>
      <div class="bd-g-sub">${nums.ident===0?"sem novos registros no período":nums.ident+" registro(s) em tratativa"}</div>
      <div class="bd-g-corpo bd-g-meta">
        <div class="bd-g-meta-arco" style="--p:0%"></div>
        <div class="bd-g-meta-num" style="font-size:19px">em acompanhamento</div>
        <div class="bd-g-meta-txt">o percentual entra quando houver conclusão</div>
        <div class="bd-g-meta-lados"><span>0%</span><span>100%</span></div>
      </div></div>`;
  }
  const p=nums.pct;
  return `<div class="bd-g">
    <div class="bd-g-tit">${txt("ind.g.meta","Resolução do período")}</div>
    <div class="bd-g-sub">dos registros do período já resolvidos</div>
    <div class="bd-g-corpo bd-g-meta">
      <div class="bd-g-meta-arco" style="--p:${(p/2).toFixed(1)}%"></div>
      <div class="bd-g-meta-num">${p}%</div>
      <div class="bd-g-meta-txt">${nums.resolv} de ${nums.ident} concluídos</div>
      <div class="bd-g-meta-lados"><span>0%</span><span>100%</span></div>
    </div></div>`;
}

/* ===== a tela ===== */
function renderInd(){
  const el=document.getElementById("tab-ind");if(!el)return;
  const nums=indNumeros(),per=indPeriodo(),evo=indEvolucao(),prev=indPrevencao();
  const lojas=indLojasDoGrupo(),temGrupo=lojas.length>1;
  const pct=indPctTexto(nums);

  const cartao=(v,rot,sub,cls)=>`<div class="card"><div class="lbl">${rot}</div>
    <div class="sub">${sub||""}</div><div class="val ${cls||"accent"}">${v}</div></div>`;

  el.innerHTML=`
  <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px">
    <span data-txt="ind.filtro.periodo" style="font-size:12px;color:#8a8b96">Período</span>
    <select onchange="IND_PER=this.value;renderInd()" style="font:inherit;font-size:12.5px;padding:6px 8px;border:1px solid #d6dbd9;border-radius:8px">
      <option value="mes" ${IND_PER==="mes"?"selected":""}>Mês atual</option>
      <option value="anterior" ${IND_PER==="anterior"?"selected":""}>Mês anterior</option>
      <option value="6m" ${IND_PER==="6m"?"selected":""}>Últimos 6 meses</option>
    </select>
    ${temGrupo?`<span data-txt="ind.filtro.loja" style="font-size:12px;color:#8a8b96">Loja</span>
    <select onchange="IND_LOJA=this.value;renderInd()" style="font:inherit;font-size:12.5px;padding:6px 8px;border:1px solid #d6dbd9;border-radius:8px">
      <option value="">Todas do grupo</option>
      ${lojas.map(e=>`<option value="${esc(e.code)}" ${IND_LOJA===e.code?"selected":""}>${esc(nomeCurto(e.name))}</option>`).join("")}
    </select>`:""}
    <span style="font-size:12px;color:#8a8b96">· ${esc(per.rot)}</span>
    <span style="flex:1"></span>
    <button class="btn sm" onclick="indResumo()"><span data-txt="ind.btn.resumo">📄 Resumo para a gerência</span></button>
  </div>

  <div class="cards-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:18px">
    ${cartao(nums.ident,txt("ind.c.ident","Problemas identificados"),"registrados no período")}
    ${cartao(nums.resolv,txt("ind.c.resolv","Resolvidos"),"concluídos no período")}
    ${cartao(pct.v,txt("ind.c.pct","Resolução"),pct.s,pct.neutro?"":"accent")}
    ${cartao(nums.tMedio!==null?nums.tMedio+" d":"—",txt("ind.c.tempo","Tempo médio"),"do relato à conclusão")}
    ${cartao(nums.urgentes,txt("ind.c.urg","Urgentes tratados"),"pontos críticos resolvidos")}
    ${cartao(nums.semVolta,txt("ind.c.reinc","Sem reincidência"),"resolvidos que não voltaram")}
  </div>

  <!-- GRÁFICOS: peças bd-g-* da biblioteca de design (catalogo/graficos).
       Nada desenhado à mão aqui, e nenhum texto dentro do desenho — nome de
       mês e número ficam fora, em texto normal, para não esticarem. -->
  <div style="display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));margin-bottom:22px">
    ${indGrafAreas()}
    ${indGrafEvolucao(evo)}
    ${indGrafMeta(nums,pct)}
  </div>

  <h3 data-txt="ind.h.prev" style="font-size:13px;margin:0 0 4px">Prevenção de perdas — argumentos com números reais</h3>
  <p data-txt="ind.p.prev" style="font-size:11.5px;color:#8a8b96;margin:0 0 10px">O que a rotina de qualidade evitou neste período. São contagens reais dos checklists e registros — use no relatório ou na reunião.</p>
  <div style="border:1px solid #e4e6ea;border-radius:12px;padding:12px 16px;margin-bottom:22px">
    ${prev.linhas.length||nums.resolv?`<ul style="margin:0;padding-left:18px;line-height:1.9;font-size:12.5px">
      ${prev.linhas.map(l=>`<li>${esc(l.frase)}</li>`).join("")}
      ${nums.resolv?`<li>${nums.resolv} não conformidade${nums.resolv===1?"":"s"} tratada${nums.resolv===1?"":"s"} até a conclusão no período${nums.urgentes?", "+nums.urgentes+" delas de caráter urgente":""}</li>`:""}
      ${nums.semVolta?`<li>${nums.semVolta} correç${nums.semVolta===1?"ão":"ões"} sem reincidência — o problema foi eliminado, não remendado</li>`:""}
    </ul>`:`<p style="font-size:12.5px;color:#8a8b96;margin:0" data-txt="ind.prev.vazio">Ainda não há correções concluídas neste período. Os pontos levantados estão em acompanhamento.</p>`}
    ${prev.pendCheck?`<p style="font-size:11px;color:#8a8b96;margin:8px 0 0">${prev.pendCheck} ponto${prev.pendCheck===1?"":"s"} dos checklists em tratativa.</p>`:""}
  </div>`;
  if(typeof aplicarTextos==="function")aplicarTextos(el);
}

/* ===== resumo pronto (copiar / WhatsApp) ===== */
function indResumoTexto(){
  const nums=indNumeros(),per=indPeriodo(),prev=indPrevencao();
  const loja=IND_LOJA?nomeCurto((empresa(IND_LOJA)||{}).name||IND_LOJA)
    :nomeCurto(currentStoreName||(empresa(currentStore)||{}).name||"");
  const quem=(typeof RT_INFO!=="undefined"&&RT_INFO)||(typeof RT_DEFAULT!=="undefined"?RT_DEFAULT:"");
  const L=["*Indicadores — Qualidade e Prevenção de Perdas*",loja+" — "+per.rot,""];
  L.push("• Problemas identificados no período: *"+nums.ident+"*");
  if(nums.resolv||nums.ident===0){
    L.push("• Resolvidos: *"+nums.resolv+"*"+(nums.pct!==null&&nums.pct>0?" ("+nums.pct+"% dos registros do período)":""));
  }else{
    L.push("• Registros em tratativa: *"+nums.ident+"* (em acompanhamento)");
  }
  if(nums.tMedio!==null)L.push("• Tempo médio do relato à conclusão: *"+nums.tMedio+" dia"+(nums.tMedio===1?"":"s")+"*");
  if(nums.urgentes)L.push("• Pontos urgentes resolvidos: *"+nums.urgentes+"*");
  if(nums.semVolta)L.push("• Correções sem reincidência: *"+nums.semVolta+"*");
  if(prev.linhas.length){
    L.push("","*O que a rotina evitou:*");
    for(const l of prev.linhas)L.push("• "+l.frase);
  }
  L.push("","O acompanhamento contínuo evita perdas de produto, autuações e paradas de produção — os números acima são o registro disso.");
  if(quem)L.push("",String(quem));
  return L.join("\n");
}
function indResumo(){
  if(!currentStore){toast("Escolha uma empresa primeiro");return;}
  const txtR=indResumoTexto();
  ncModal(`<h2 data-txt="ind.res.t">Resumo para a gerência</h2>
    <p class="desc" data-txt="ind.res.d">Confira o texto (dá para editar) e envie por onde preferir.</p>
    <div class="field"><textarea id="ind-res-tx" rows="14" style="font-size:12.5px;line-height:1.55">${esc(txtR)}</textarea></div>
    <div class="form-actions" style="flex-wrap:wrap">
      <button class="btn ghost" onclick="ncFechar()">Fechar</button>
      <button class="btn ghost" onclick="indResumoCopiar()">📋 Copiar</button>
      <button class="btn" onclick="indResumoZap()">📱 WhatsApp</button>
    </div>`);
}
function indResumoCopiar(){
  const v=document.getElementById("ind-res-tx").value;
  navigator.clipboard.writeText(v).then(()=>toast("Texto copiado ✓"),()=>{
    const t=document.getElementById("ind-res-tx");t.select();document.execCommand("copy");toast("Texto copiado ✓");});
}
function indResumoZap(){
  const v=document.getElementById("ind-res-tx").value;
  if(navigator.share){navigator.share({text:v}).catch(()=>{});return;}
  window.open("https://web.whatsapp.com/send?text="+encodeURIComponent(v),"_blank");
}

/* ===== configurações da aba (a porta única do site) ===== */
if(typeof CFG_ABAS!=="undefined"){
  CFG_ABAS.ind=()=>[
    {gr:"filtrar",rot:"Período",dica:"Mês atual, anterior ou 6 meses",
     valor:()=>({mes:"Mês atual",anterior:"Mês anterior","6m":"Últimos 6 meses"}[IND_PER]||"Mês atual"),
     acao:()=>{IND_PER=IND_PER==="mes"?"anterior":IND_PER==="anterior"?"6m":"mes";renderInd();cfgAbrir();}},
    {gr:"filtrar",rot:"Loja",dica:"Uma loja do grupo ou todas",
     valor:()=>IND_LOJA?nomeCurto((empresa(IND_LOJA)||{}).name||IND_LOJA):"Todas do grupo",
     acao:()=>{const ls=indLojasDoGrupo().map(e=>e.code);
       const i=ls.indexOf(IND_LOJA);IND_LOJA=(i<0)?(ls[0]||""):(ls[i+1]||"");renderInd();cfgAbrir();}},
    {gr:"outros",rot:"Resumo para a gerência",dica:"Texto pronto com os números do período",
     valor:()=>"gerar",acao:()=>{cfgFechar();indResumo();}}
  ];
}
