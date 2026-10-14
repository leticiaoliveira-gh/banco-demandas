/* =====================================================================
   CONTROLES DA LOJA (13/10/2026) — o que liga os dois quadros novos
   (Temperatura das Câmaras e Cronograma de licenças e preventivas)
   ao resto do site: o cartão do Sumário, a linha da empresa na capa,
   a agenda e a planilha para baixar.
   ---------------------------------------------------------------------
   Pedido dela: "me lembre de fazer a checagem de 15 em 15 ou toda semana",
   "tem que ter um lembrete no site", "o cronograma seria ótimo pro lembrete".
   Nada aqui muda data sozinho: o site só CONTA a partir do que ela lançou.
   ===================================================================== */

/* ---- datas (sempre em texto AAAA-MM-DD, meio-dia para não cair no fuso) ---- */
function ctlData(iso){ return new Date(String(iso).slice(0,10)+"T12:00:00"); }
function ctlIso(dt){
  const p=n=>String(n).padStart(2,"0");
  return dt.getFullYear()+"-"+p(dt.getMonth()+1)+"-"+p(dt.getDate());
}
function ctlHoje(){ return ctlIso(new Date()); }
function ctlMaisDias(iso,n){ const d=ctlData(iso); d.setDate(d.getDate()+n); return ctlIso(d); }
/* soma meses sem pular o fim do mês: 31/08 + 6 meses = 28/02 (ou 29) */
function ctlMaisMeses(iso,n){
  const d=ctlData(iso), dia=d.getDate();
  const alvo=new Date(d.getFullYear(), d.getMonth()+n, 1, 12);
  const ult=new Date(alvo.getFullYear(), alvo.getMonth()+1, 0).getDate();
  alvo.setDate(Math.min(dia, ult));
  return ctlIso(alvo);
}
function ctlDias(de,ate){ return Math.round((ctlData(ate)-ctlData(de))/864e5); }
function ctlBr(iso){ return iso ? String(iso).slice(0,10).split("-").reverse().join("/") : "—"; }
function ctlBrCurta(iso){ const b=ctlBr(iso); return b.length===10 ? b.slice(0,5) : b; }
const CTL_MESES=["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
function ctlMesExtenso(iso){
  const n=["janeiro","fevereiro","março","abril","maio","junho","julho","agosto",
           "setembro","outubro","novembro","dezembro"][ctlData(iso).getMonth()];
  return n.charAt(0).toUpperCase()+n.slice(1)+" de "+String(iso).slice(0,4);
}

/* número com vírgula, como ela escreve: "4,6" e "-18" */
function ctlNum(v){
  if(v===null||v===undefined)return "";
  const s=String(v).trim().replace(",",".");
  if(s===""||s==="-")return "";
  const n=Number(s);
  return Number.isFinite(n)?n:"";
}
function ctlNumBr(v,casas){
  if(v===""||v===null||v===undefined||!Number.isFinite(Number(v)))return "";
  return Number(v).toFixed(casas===undefined?1:casas).replace(".",",");
}

function ctlLojaNome(code){
  const e=(typeof empresa==="function"&&empresa(code||currentStore))||{};
  return e.name||(typeof currentStoreName!=="undefined"&&currentStoreName)||code||currentStore||"";
}

/* gravar um item destes quadros: o mesmo caminho de todo o site (desfazer,
   histórico e nuvem passam por putItem/dataChanged) */
async function ctlGravar(o){
  o.mod=nowISO();
  if(o.id===undefined){ const id=await putItem(o); o.id=id; DATA.push(o); }
  else await putItem(o);
  dataChanged();
  return o;
}

/* ---- planilha para baixar (plano B: abre no Excel, sem o site) ---- */
function ctlBaixarPlanilha(nome, linhas){
  const cel=v=>{ const s=String(v===undefined||v===null?"":v); return /[";\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; };
  const csv="﻿"+linhas.map(l=>l.map(cel).join(";")).join("\r\n");
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  a.download=nome+".csv";
  document.body.appendChild(a); a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);
}

/* ---- a folha impressa: o mesmo cabeçalho verde das outras folhas ---- */
function ctlFolhaCss(paisagem){
  return `
    @page{size:A4 ${paisagem?"landscape":"portrait"};margin:0}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
      color:#344054;font-size:11.5px;line-height:1.4;background:#e9ebee}
    .folha{width:${paisagem?"297mm":"210mm"};min-height:${paisagem?"210mm":"297mm"};background:#fff;
      margin:0 auto 14px;padding:10mm 11mm 12mm;box-shadow:0 4px 18px rgba(16,24,40,.14)}
    .capa{background:${typeof capaFundoFolha==="function"?capaFundoFolha("linear-gradient(155deg,#146b61 0%,#1a8074 100%)"):"#1a8074"};
      color:#fff;padding:8px 12px;border-radius:8px;margin-bottom:8px;
      -webkit-print-color-adjust:exact;print-color-adjust:exact}
    .linha1{display:flex;justify-content:space-between;align-items:flex-end;gap:12px}
    .et{font-size:7.4px;font-weight:700;text-transform:uppercase;letter-spacing:1.4px;color:rgba(255,255,255,.88)}
    .assunto{font-size:16px;font-weight:700;letter-spacing:-.3px;line-height:1.1;margin-top:2px}
    .pe{display:flex;gap:14px;align-items:baseline;font-size:9.6px;white-space:nowrap}
    .pe div{display:flex;align-items:baseline;gap:5px}
    .pe span{font-size:7.4px;text-transform:uppercase;letter-spacing:.9px;color:rgba(255,255,255,.82)}
    .pe b{font-weight:600;font-size:10.2px;color:#fff}
    .faixa{display:flex;margin-top:6px;border:1px solid rgba(255,255,255,.34);border-radius:6px;
      overflow:hidden;background:rgba(255,255,255,.14);-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .faixa div{flex:1;padding:3px 10px;border-right:1px solid rgba(255,255,255,.28);text-align:center}
    .faixa div:last-child{border-right:0}
    .faixa span{display:block;font-size:6.8px;text-transform:uppercase;letter-spacing:1px;
      color:rgba(255,255,255,.92);font-weight:600}
    .faixa b{font-size:12px;font-weight:700;letter-spacing:.2px;color:#fff}
    .pc{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    table{width:100%;border-collapse:collapse}
    tr{break-inside:avoid;page-break-inside:avoid}
    .leg{margin-top:10px;font-size:9.5px;color:#475467;line-height:1.5}
    .leg b{color:#344054}
    .ass{display:flex;gap:24px;margin-top:22px;font-size:10px;color:#475467}
    .ass div{flex:1;border-top:1px solid #98a2b3;padding-top:4px;text-align:center}
    @media print{
      @page{size:A4 ${paisagem?"landscape":"portrait"};margin:9mm 10mm 10mm}
      body{background:#fff}
      .folha{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}
    }`;
}
function ctlFolhaCapa(et, assunto, pe, faixa){
  const peH=pe.map(x=>`<div><span>${esc(x[0])}</span><b>${esc(x[1])}</b></div>`).join("");
  const fx=faixa.filter(x=>x[1]).map(x=>`<div><span>${esc(x[0])}</span><b>${esc(x[1])}</b></div>`).join("");
  return `<div class="capa"><div class="linha1">
      <div><div class="et">${esc(et)}</div><div class="assunto">${esc(assunto)}</div></div>
      <div class="pe">${peH}</div></div>
    ${fx?`<div class="faixa">${fx}</div>`:""}</div>`;
}
function ctlAbrirFolha(titulo, css, corpo){
  const w=window.open("");
  if(!w){ toast("O navegador bloqueou a janela de impressão. Libere as janelas para este site."); return false; }
  w.document.open();
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
    <title>${esc(titulo)}</title><style>${css}</style></head><body>${corpo}</body></html>`);
  w.document.close();
  setTimeout(()=>{ try{ w.focus(); w.print(); }catch(e){} },300);
  return true;
}

/* ---- os lembretes ---- */
/* Cartão do Sumário: o selo conta a situação do quadro (com palavra escrita) */
function ctlHubInfo(aba, loja){
  loja=loja||currentStore;
  if(aba==="tmp"&&typeof tmpEstado==="function"){
    const e=tmpEstado(loja);
    if(!e.camaras) return {selo:`<span class="bd-selo bd-selo-neutro"><i></i>vazio</span>`,sub:"nenhuma câmara cadastrada"};
    let selo;
    if(!e.ultima) selo=`<span class="bd-selo bd-selo-atencao"><i></i>fazer 1ª medição</span>`;
    else if(e.dias<0) selo=`<span class="bd-selo bd-selo-erro"><i></i>atrasada ${-e.dias} dia${e.dias===-1?"":"s"}</span>`;
    else if(e.dias<=2) selo=`<span class="bd-selo bd-selo-atencao"><i></i>medir ${e.dias===0?"hoje":"até "+ctlBrCurta(e.proxima)}</span>`;
    else selo=`<span class="bd-selo bd-selo-ok"><i></i>em dia</span>`;
    if(e.naoImpressa) selo+=`<span class="bd-selo bd-selo-info hub-selo-2"><i></i>falta imprimir</span>`;
    const sub=e.ultima?`última ${ctlBr(e.ultima.data)} · próxima ${ctlBr(e.proxima)}`:`${e.camaras} câmaras, nenhuma medição`;
    return {selo,sub};
  }
  if(aba==="cro"&&typeof croResumo==="function"){
    const r=croResumo(loja);
    if(!r.total) return {selo:`<span class="bd-selo bd-selo-neutro"><i></i>vazio</span>`,sub:"nada cadastrado ainda"};
    let selo;
    if(r.vencidos) selo=`<span class="bd-selo bd-selo-erro"><i></i>${r.vencidos} vencido${r.vencidos===1?"":"s"}</span>`;
    else if(r.logo) selo=`<span class="bd-selo bd-selo-atencao"><i></i>${r.logo} vence${r.logo===1?"":"m"} logo</span>`;
    else selo=`<span class="bd-selo bd-selo-ok"><i></i>em dia</span>`;
    const sub=r.proximo?`próximo: ${r.proximo.area} em ${ctlBr(r.proximo.data)}`:`${r.total} itens`;
    return {selo,sub};
  }
  return null;
}

/* Linha da empresa na capa: só aparece quando há o que fazer (ela não quer poluição) */
function ctlCapaLinha(code){
  const partes=[];
  if(typeof tmpEstado==="function"){
    const e=tmpEstado(code);
    if(e.camaras){
      if(!e.ultima) partes.push("Temperatura: fazer a 1ª medição");
      else if(e.dias<0) partes.push("Temperatura atrasada "+(-e.dias)+" dia"+(e.dias===-1?"":"s"));
      else if(e.dias<=2) partes.push("Temperatura: medir "+(e.dias===0?"hoje":"até "+ctlBrCurta(e.proxima)));
      if(e.naoImpressa) partes.push("imprimir a temperatura");
    }
  }
  if(typeof croResumo==="function"){
    const r=croResumo(code);
    if(r.vencidos) partes.push(r.vencidos+" vencido"+(r.vencidos===1?"":"s")+" no cronograma");
    else if(r.semana) partes.push(r.semana+" vence"+(r.semana===1?"":"m")+" esta semana no cronograma");
  }
  return partes.length?`<div class="store-sub"><b class="ctl-lembra">${esc(partes.join(" · "))}</b></div>`:"";
}

/* Agenda do Sumário: a próxima medição e as próximas datas do cronograma */
function ctlAgenda(loja){
  const out=[];
  if(typeof tmpEstado==="function"){
    const e=tmpEstado(loja);
    if(e.camaras&&e.proxima) out.push({dia:e.proxima,aba:"tmp",titulo:"Medir a temperatura das câmaras"});
    if(e.naoImpressa) out.push({dia:e.naoImpressa.data,aba:"tmp",titulo:"Imprimir a medição de temperatura de "+ctlBr(e.naoImpressa.data)});
  }
  if(typeof croItens==="function"){
    for(const d of croItens(loja)){
      const p=croProxima(d);
      if(p) out.push({dia:p,aba:"cro",titulo:d.area+(d.resp?" ("+d.resp+")":""),urgente:p<ctlHoje()});
    }
  }
  return out;
}
