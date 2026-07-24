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

/* ===== a tela ===== */
function renderInd(){
  const el=document.getElementById("tab-ind");if(!el)return;
  const nums=indNumeros(),per=indPeriodo(),evo=indEvolucao(),prev=indPrevencao();
  const lojas=indLojasDoGrupo(),temGrupo=lojas.length>1;
  const pct=indPctTexto(nums);
  const maxBar=Math.max(1,...evo.map(m=>Math.max(m.ident,m.resolv)));

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

  <h3 data-txt="ind.h.evolucao" style="font-size:13px;margin:0 0 8px">Evolução — identificados × resolvidos (6 meses)</h3>
  <div style="display:flex;gap:14px;align-items:flex-end;height:150px;padding:8px 4px 0;border:1px solid #e4e6ea;border-radius:12px;margin-bottom:6px;overflow-x:auto">
    ${evo.map(m=>`
      <div style="flex:1;min-width:56px;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%">
        <div style="flex:1;display:flex;gap:5px;align-items:flex-end;width:100%;justify-content:center">
          <div title="Identificados: ${m.ident}" style="width:16px;border-radius:4px 4px 0 0;background:#9db8b0;height:${Math.round(m.ident*100/maxBar)}%;min-height:${m.ident?"3px":"0"}"></div>
          <div title="Resolvidos: ${m.resolv}" style="width:16px;border-radius:4px 4px 0 0;background:#17756a;height:${Math.round(m.resolv*100/maxBar)}%;min-height:${m.resolv?"3px":"0"}"></div>
        </div>
        <span style="font-size:10.5px;color:#8a8b96">${esc(m.rot)}</span>
        <span style="font-size:10px;color:#5b7a72">${m.ident}·${m.resolv}</span>
      </div>`).join("")}
  </div>
  <p style="font-size:10.5px;color:#8a8b96;margin:0 0 20px">
    <span style="display:inline-block;width:10px;height:10px;background:#9db8b0;border-radius:3px;vertical-align:-1px"></span> <span data-txt="ind.leg.ident">identificados</span>
    &nbsp;<span style="display:inline-block;width:10px;height:10px;background:#17756a;border-radius:3px;vertical-align:-1px"></span> <span data-txt="ind.leg.resolv">resolvidos</span></p>

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
