/* ===== RELATÓRIO DE DIVERGÊNCIAS (PPR semanal) =====
   Junta num documento só tudo que foi marcado 👎 nos preenchimentos de checklist
   do período (aba Checklists: tipos ckp E ckqp, concluídos E parciais), agrupado
   por piso → área, no formato do PPR que ela entrega à gerência.

   REGRAS herdadas do resto do site:
   - SEM nota e SEM percentual: é uma CONSOLIDAÇÃO DE DIVERGÊNCIAS, não uma
     avaliação item a item (regra da v8.3 — número que a prejudica não entra).
   - Globals de OUTROS arquivos sempre via typeof X!=="undefined" (lição da v7.8).
   - Checkbox "Resolvida" grava `resolvidoEm` NA RESPOSTA DE ORIGEM via putItem,
     no mesmo espírito de ckPontoConcluir — relatório e checklist andam juntos.
   - Item avulso = {tipo:"pprx"} da loja (divergência vista fora do checklist).
   - A casca visual (capa degradê, assinaturas, barra de envio) reaproveita o
     desenho do ckPDF/ckRelPDF (js/ck.js + js/ck-modelo2.js). */

/* período mostrado (fica só na memória da tela; padrão: últimos 7 dias) */
let PPR_DE="",PPR_ATE="";
function pprPadrao(){
  const ate=new Date(),de=new Date();de.setDate(de.getDate()-6);
  const iso=d=>d.toISOString().slice(0,10);
  if(!PPR_ATE)PPR_ATE=iso(ate);
  if(!PPR_DE)PPR_DE=iso(de);
}
function pprSetPeriodo(campo,v){
  if(campo==="de")PPR_DE=v;else PPR_ATE=v;
  pprDesenha();
}
/* a data que vale para "entrou na semana": conclusão, senão última mexida */
function pprDataDe(p){
  return String(p.concluidoEm||p.atualizacao||p.criadoEm||"").slice(0,10);
}
function pprNoPeriodo(iso){
  if(!iso)return false;
  return (!PPR_DE||iso>=PPR_DE)&&(!PPR_ATE||iso<=PPR_ATE);
}

/* de onde vem cada divergência: piso + área.
   As seções do Checklist Diário já carregam o piso no nome ("1º PISO — SALÃO");
   quando não há esse padrão, agrupa pela própria seção/área/setor. */
function pprLocal(secao,area,setor){
  const s=String(secao||"").trim();
  const m=s.match(/^(.+?PISO)\s*[—-]\s*(.+)$/i);
  if(m)return {piso:m[1].toUpperCase(),area:m[2].trim()};
  const setorRot=(setor&&typeof ckqSetorRot==="function")?ckqSetorRot(setor):(setor||"");
  const a=[setorRot,area].filter(Boolean).join(" · ")||s||"Geral da loja";
  return {piso:"GERAL",area:a};
}

/* ---- coleta: todos os 👎 do período ---- */
function pprDivergencias(){
  const out=[];
  /* checklists da aba (ckm/ckp) */
  for(const p of DATA){
    if(p.deleted||p.tipo!=="ckp"||p.loja!==currentStore)continue;
    if(p.status!=="concluido"&&p.status!=="andamento")continue;
    if(!pprNoPeriodo(pprDataDe(p)))continue;
    const mo=(typeof ckAchar==="function")?ckAchar(p.modeloUid):null;
    if(!mo)continue;
    for(const c of ckExpandir(mo,p)){
      const r=(p.respostas||{})[c.chave];
      if(!r||r.na)continue;
      if(!(r.valor==="nao"||r.valor==="I"))continue;
      const loc=pprLocal(c.q.secao,c.area,"");
      out.push({origem:"ckp",pUid:p.uid,chave:c.chave,titulo:c.q.titulo||"",
        comentario:r.comentario||"",fotos:r.fotos||[],resolvidoEm:r.resolvidoEm||"",
        data:pprDataDe(p),fonte:p.modeloTitulo||"",piso:loc.piso,area:loc.area});
    }
  }
  /* checklists de Qualidade/BPF (ckqm/ckqp), se a aba existir */
  if(typeof ckqAchar==="function"&&typeof ckqExpandir==="function"){
    for(const p of DATA){
      if(p.deleted||p.tipo!=="ckqp"||p.loja!==currentStore)continue;
      if(p.status!=="concluido"&&p.status!=="andamento")continue;
      if(!pprNoPeriodo(pprDataDe(p)))continue;
      const mo=ckqAchar(p.modeloUid);if(!mo)continue;
      for(const c of ckqExpandir(mo,p)){
        const r=(p.respostas||{})[c.chave];
        if(!r||r.na)continue;
        if(!(r.valor==="nao"||r.valor==="I"))continue;
        const loc=pprLocal(c.q.secao,c.area,c.setor);
        out.push({origem:"ckqp",pUid:p.uid,chave:c.chave,titulo:c.q.titulo||"",
          comentario:r.comentario||"",fotos:r.fotos||[],resolvidoEm:r.resolvidoEm||"",
          data:pprDataDe(p),fonte:p.modeloTitulo||"",piso:loc.piso,area:loc.area});
      }
    }
  }
  /* itens avulsos dela ({tipo:"pprx"}) */
  for(const d of DATA){
    if(d.deleted||d.tipo!=="pprx"||d.loja!==currentStore)continue;
    if(!pprNoPeriodo(String(d.data||d.criadoEm||"").slice(0,10)))continue;
    const loc=pprLocal(d.area,"","");
    out.push({origem:"pprx",pUid:d.uid,chave:"",titulo:d.texto||"",
      comentario:"",fotos:[],resolvidoEm:d.resolvidoEm||"",
      data:String(d.data||d.criadoEm||"").slice(0,10),fonte:"Item avulso",
      piso:loc.piso,area:loc.area});
  }
  return out;
}
/* agrupa piso → área, na ordem do prédio (GERAL, 1º PISO, 2º PISO, resto) */
function pprGrupos(){
  const ordem=p=>p==="GERAL"?0:/^1/.test(p)?1:/^2/.test(p)?2:3;
  const grupos={};
  for(const d of pprDivergencias()){
    (grupos[d.piso]=grupos[d.piso]||{})[d.area]=(grupos[d.piso][d.area]||[]);
    grupos[d.piso][d.area].push(d);
  }
  return Object.keys(grupos)
    .sort((a,b)=>ordem(a)-ordem(b)||a.localeCompare(b,"pt-BR"))
    .map(p=>({piso:p,areas:Object.keys(grupos[p]).sort((a,b)=>a.localeCompare(b,"pt-BR"))
      .map(a=>({area:a,itens:grupos[p][a]}))}));
}

/* ===== a tela ===== */
function pprRelatorio(){
  if(!currentStore){toast("Escolha uma empresa primeiro");return;}
  pprPadrao();
  pprDesenha();
}
function pprFechar(){
  const el=document.getElementById("ppr-tela");if(el)el.remove();
  document.body.style.overflow="";
  if(typeof renderCk==="function")renderCk();
}
function pprDesenha(){
  pprPadrao();
  const grupos=pprGrupos();
  const total=grupos.reduce((n,g)=>n+g.areas.reduce((m,a)=>m+a.itens.length,0),0);
  const feitas=grupos.reduce((n,g)=>n+g.areas.reduce((m,a)=>m+a.itens.filter(i=>i.resolvidoEm).length,0),0);
  let el=document.getElementById("ppr-tela");
  if(!el){el=document.createElement("div");el.id="ppr-tela";el.className="ck-preench";document.body.appendChild(el);}
  document.body.style.overflow="hidden";
  el.innerHTML=`<div class="ck-pr-topo">
      <button class="ck-pr-x" onclick="pprFechar()" title="Voltar para a aba">✕</button>
      <span class="ck-pr-nome">📄 Relatório da semana (PPR) — divergências</span>
    </div>
    <div class="ck-pr-box larga">
      <div class="ck-lst-h">
        <h2>Divergências do período</h2>
        <div class="ck-lst-info" style="flex-wrap:wrap;gap:8px">
          <label style="font-size:12px">De <input type="date" value="${esc(PPR_DE)}" onchange="pprSetPeriodo('de',this.value)"></label>
          <label style="font-size:12px">até <input type="date" value="${esc(PPR_ATE)}" onchange="pprSetPeriodo('ate',this.value)"></label>
          <span>${feitas}/${total} resolvidas</span>
          <button class="btn ghost sm" onclick="pprAvulso()">➕ Adicionar item avulso</button>
          <button class="btn sm" ${total?"":"disabled"} onclick="pprPDF()">📄 Gerar o documento</button>
        </div>
      </div>
      ${!total?`<div class="ck-vazio"><p class="t">Nenhuma divergência (👎) nos checklists deste período.</p>
        <p class="d">Preencha o Checklist Diário durante a semana, ou mude as datas acima.
        Você também pode registrar um item avulso — algo que viu fora do checklist.</p></div>`
      :grupos.map(g=>`
        <div class="ck-lst-sec" style="margin-top:14px">${esc(g.piso==="GERAL"?"GERAL / OUTROS":g.piso)}</div>
        ${g.areas.map(a=>`
          <div class="ck-lst" style="margin-bottom:8px">
            <div class="ck-lst-sec" style="font-size:12px;opacity:.85">${esc(a.area)} · ${a.itens.length}</div>
            ${a.itens.map(i=>`
              <div class="ck-lin-r ${i.resolvidoEm?"feita":"ruim"}">
                <div class="tx">
                  <b style="${i.resolvidoEm?"text-decoration:line-through;opacity:.65":""}">☐ ${esc(i.titulo)}</b>
                  ${i.comentario?`<span class="d">${esc(i.comentario)}</span>`:""}
                  <span class="d" style="opacity:.6">${esc(brDate(i.data))} · ${esc(i.fonte)}</span>
                  ${(i.fotos||[]).length?`<span class="d">${i.fotos.map(f=>`<img src="${f}" style="max-height:52px;border-radius:6px;margin:3px 4px 0 0">`).join("")}</span>`:""}
                </div>
                <div style="display:flex;gap:6px;align-items:center">
                  <label style="font-size:11.5px;white-space:nowrap;cursor:pointer">
                    <input type="checkbox" ${i.resolvidoEm?"checked":""}
                      onchange="pprResolver('${i.origem}','${i.pUid}','${esc(i.chave)}',this.checked)"> Resolvida</label>
                  ${i.origem==="pprx"?`<button class="btn ghost sm" onclick="pprAvulso('${i.pUid}')" title="Editar">✏️</button>
                    <button class="btn ghost sm" onclick="pprAvulsoExcluir('${i.pUid}')" title="Excluir">🗑</button>`:""}
                </div>
              </div>`).join("")}
          </div>`).join("")}`).join("")}
    </div>`;
}

/* "Resolvida" — grava na RESPOSTA DE ORIGEM (ou no item avulso), via putItem */
async function pprResolver(origem,pUid,chave,on){
  const d=DATA.find(x=>x.uid===pUid&&!x.deleted);if(!d)return;
  if(origem==="pprx"){d.resolvidoEm=on?today():"";}
  else{
    const r=(d.respostas||{})[chave];if(!r)return;
    r.resolvidoEm=on?today():"";
  }
  d.mod=nowISO();d.atualizacao=nowISO();
  await putItem(d);dataChanged();
  pprDesenha();
}

/* ===== item avulso ({tipo:"pprx"}) ===== */
function pprAvulso(uid){
  const d=uid?DATA.find(x=>x.uid===uid&&!x.deleted):null;
  ncModal(`<h2>${d?"Editar item avulso":"Divergência fora do checklist"}</h2>
    <p class="desc">Algo que você viu na loja e quer que entre no relatório da semana,
    mesmo sem estar em nenhum checklist.</p>
    <div class="field"><label>O que você viu</label>
      <textarea id="ppr-av-tx" rows="3">${esc(d?d.texto||"":"")}</textarea></div>
    <div class="grid2">
      <div class="field"><label>Área / seção (ex.: 1º PISO — SALÃO)</label>
        <input id="ppr-av-ar" value="${esc(d?d.area||"":"")}"></div>
      <div class="field"><label>Data</label>
        <input type="date" id="ppr-av-dt" value="${esc(d?String(d.data||"").slice(0,10):today())}"></div>
    </div>
    <div class="form-actions">
      <button class="btn ghost" onclick="ncFechar()">Cancelar</button>
      <button class="btn" onclick="pprAvulsoSalvar('${uid||""}')">Salvar</button>
    </div>`);
}
async function pprAvulsoSalvar(uid){
  const tx=(document.getElementById("ppr-av-tx").value||"").trim();
  if(!tx){toast("Escreva o que você viu");return;}
  const ar=(document.getElementById("ppr-av-ar").value||"").trim();
  const dt=(document.getElementById("ppr-av-dt").value||"").trim()||today();
  let d=uid?DATA.find(x=>x.uid===uid&&!x.deleted):null;
  if(!d){
    d={uid:newUid(),tipo:"pprx",loja:currentStore,criadoEm:today(),resolvidoEm:""};
    DATA.push(d);
  }
  d.texto=tx;d.area=ar;d.data=dt;d.mod=nowISO();
  d.id=await putItem(d);dataChanged();
  ncFechar();pprDesenha();toast("Item guardado ✓");
}
async function pprAvulsoExcluir(uid){
  const d=DATA.find(x=>x.uid===uid&&!x.deleted);if(!d)return;
  if(!confirm("Excluir este item avulso?\n\n"+(d.texto||"")))return;
  d.deleted=true;d.mod=nowISO();
  await putItem(d);dataChanged();pprDesenha();
}

/* ===== o documento (mesma casca do ckPDF: capa degradê + barra de envio) ===== */
function pprQuem(){
  const quem=RT_INFO||RT_DEFAULT;
  const nome=String(quem).split("·")[0].replace(/\(.*?\)/,"").trim()||quem;
  const cred=String(quem).includes("·")?String(quem).split("·").slice(1).join("·").trim():"";
  const cargo=(String(quem).match(/\(([^)]+)\)/)||[])[1]||"Responsável Técnica";
  return {nome,cred,cargo};
}
function pprPDF(){
  const grupos=pprGrupos();
  const total=grupos.reduce((n,g)=>n+g.areas.reduce((m,a)=>m+a.itens.length,0),0);
  if(!total){toast("Nenhuma divergência no período");return;}
  const feitas=grupos.reduce((n,g)=>n+g.areas.reduce((m,a)=>m+a.itens.filter(i=>i.resolvidoEm).length,0),0);
  const loja=nomeCurto((empresa(currentStore)||{}).name||currentStore||"");
  const {nome,cred,cargo}=pprQuem();
  const periodoBR=brDate(PPR_DE)+" a "+brDate(PPR_ATE);

  /* resumo em TEXTO — o que vai no WhatsApp/copiar */
  const resumoTxt=["*Relatório de Divergências (PPR semanal)*",loja+" — "+periodoBR,"",
    "Divergências no período: *"+total+"*",
    "Já resolvidas: *"+feitas+"*   |   Em aberto: *"+(total-feitas)+"*",""]
    .concat(grupos.map(g=>["— "+(g.piso==="GERAL"?"GERAL / OUTROS":g.piso)+" —"]
      .concat(g.areas.map(a=>a.area+":"
        +a.itens.map(i=>"\n   "+(i.resolvidoEm?"[OK]":"[  ]")+" "+i.titulo
          +(i.comentario?" — "+i.comentario:"")).join("")))
      .join("\n")).join("\n"))
    .concat(["",nome+(cred?" — "+cred:"")]).join("\n");

  /* PDF de verdade (js/pdflite.js) — é o que vai anexado no WhatsApp do celular */
  let pdfURL="",nomePDF="";
  try{
    if(typeof PDFLite==="function"){
      pdfURL=URL.createObjectURL(pprRelPDF(grupos,{total,feitas,loja,periodoBR}));
      nomePDF="Relatorio-Divergencias-PPR_"+String(loja).normalize("NFD").replace(/[̀-ͯ]/g,"")
        .replace(/[^\w]+/g,"-")+"_"+String(PPR_ATE||today())+".pdf";
    }
  }catch(e){console.warn("PPR PDF:",e);}

  const assin=(typeof CK_ASSINATURA!=="undefined"&&CK_ASSINATURA)?CK_ASSINATURA:"";
  const w=window.open("");
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
  <title>Relatório de Divergências — ${esc(loja)} — ${esc(periodoBR)}</title><style>
  @page{margin:15mm 14mm 18mm}
  *{box-sizing:border-box}
  body{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#22242e;font-size:11.5px;
       margin:0;line-height:1.45;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .cap{background:linear-gradient(135deg,#0f5b52,#17756a 55%,#2a9d8a);color:#fff;
       border-radius:12px;padding:20px 22px;margin-bottom:16px}
  .cap .et{font-size:9.5px;letter-spacing:2.2px;text-transform:uppercase;opacity:.72}
  .cap h1{font-size:22px;margin:5px 0 2px;font-weight:650;letter-spacing:-.2px}
  .cap .loja{font-size:13.5px;opacity:.92}
  .cap .rt{margin-top:14px;padding-top:11px;border-top:1px solid rgba(255,255,255,.24);
           display:flex;justify-content:space-between;align-items:flex-end;gap:16px}
  .cap .rt .nm{font-size:13px;font-weight:650}
  .cap .rt .cg{font-size:10px;opacity:.78;margin-top:1px}
  .cap .rt .dt{font-size:10px;opacity:.85;text-align:right;white-space:nowrap}
  .placar{display:flex;gap:9px;margin-bottom:16px}
  .m{flex:1;border:1px solid #e4e6ea;border-radius:10px;padding:10px 12px}
  .m b{display:block;font-size:21px;font-weight:650;line-height:1.1}
  .m span{font-size:9px;color:#8a8b96;text-transform:uppercase;letter-spacing:.6px}
  .m.al b{color:#c0212a}.m b.vd{color:#12b76a}
  .nota-hist{font-size:9.5px;color:#8a8b96;font-style:italic;margin:-4px 0 14px;line-height:1.5}
  h2.piso{font-size:12px;text-transform:uppercase;letter-spacing:1.3px;color:#17756a;
         margin:20px 0 8px;padding-bottom:5px;border-bottom:1.5px solid #d9e2df}
  .area{margin-bottom:12px;page-break-inside:avoid}
  .area h3{font-size:12.5px;margin:0 0 6px;padding:5px 10px;background:#eef3f1;border-radius:7px;
           color:#0f5b52;display:flex;justify-content:space-between;align-items:center}
  .area h3 span{font-size:9.5px;font-weight:500;color:#5b7a72;text-transform:uppercase;letter-spacing:.5px}
  .it{margin:0 0 5px 6px;padding-left:8px;border-left:3px solid #c0212a;font-size:11px}
  .it.ok{border-left-color:#12b76a;color:#0d8a52;text-decoration:line-through;opacity:.8}
  .it .cm{display:block;color:#3f4149;text-decoration:none;font-size:10.4px;margin-top:1px}
  .it .ft{display:block;margin-top:3px}
  .it .ft img{max-width:132px;max-height:98px;border-radius:6px;border:1px solid #e4e6ea;margin-right:5px}
  .ass{display:flex;gap:40px;margin-top:34px;page-break-inside:avoid}
  .ass div{flex:1}
  .ass img{max-height:52px;display:block;margin-bottom:-6px}
  .linha{border-bottom:1px solid #22242e;height:46px}
  .rot{font-size:10px;color:#6b7280;margin-top:5px;line-height:1.5}
  .rot b{color:#22242e;font-weight:600}
  .pe{margin-top:22px;padding-top:9px;border-top:1px solid #eceef0;
      font-size:8.8px;color:#9aa0a8;line-height:1.6}
  .barra{position:sticky;top:0;z-index:9;background:#fff;border-bottom:1px solid #e4e6ea;
    padding:10px 0 11px;margin-bottom:14px;display:flex;gap:7px;flex-wrap:wrap;align-items:center}
  .barra b.tt{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#8a8b96;margin-right:4px}
  .barra button{font:inherit;font-size:12px;padding:9px 14px;border-radius:9px;cursor:pointer;
    border:1px solid #d6dbd9;background:#fff;color:#22242e;display:inline-flex;align-items:center;gap:6px}
  .barra button.pri{background:#17756a;border-color:#17756a;color:#fff;font-weight:600}
  .barra button:hover{border-color:#17756a}
  .barra .dica{font-size:10.5px;color:#8a8b96;flex-basis:100%;margin-top:-2px}
  @media print{.barra{display:none}}
  @media(max-width:640px){.barra button{flex:1 1 42%;justify-content:center}}
  </style></head><body>

  <div class="barra">
    <b class="tt">Este relatório</b>
    <button class="pri" onclick="zap()">📱 Enviar no WhatsApp</button>
    <button onclick="baixar()">⬇ Baixar o PDF</button>
    <button onclick="window.print()">🖨 Imprimir</button>
    <button onclick="copiar()">📋 Copiar o texto</button>
    <span class="dica" id="dica">No celular, o WhatsApp abre com o <b>PDF anexado e o texto pronto</b> — você confere antes de enviar. Ao imprimir, ligue "Gráficos de plano de fundo" para o cabeçalho sair verde.</span>
  </div>

  <script>
  var RESUMO=${JSON.stringify(resumoTxt)};
  var PDFURL=${JSON.stringify(pdfURL)};
  var ARQPDF=${JSON.stringify(nomePDF||"Relatorio-PPR.pdf")};
  var ASSUNTO=${JSON.stringify("Relatório de Divergências (PPR) — "+loja+" — "+periodoBR)};
  function arquivoPDF(){
    if(!PDFURL)return Promise.resolve(null);
    return fetch(PDFURL).then(function(r){return r.blob();}).then(function(b){
      return new File([b],ARQPDF,{type:"application/pdf"});
    }).catch(function(){return null;});
  }
  function baixar(){
    if(!PDFURL){alert("Não consegui montar o PDF aqui.\\n\\nUse o botão 🖨 Imprimir e escolha \\"Salvar como PDF\\".");return;}
    var a=document.createElement("a");a.href=PDFURL;a.download=ARQPDF;a.click();
  }
  function zap(){
    arquivoPDF().then(function(f){
      if(f&&navigator.canShare&&navigator.canShare({files:[f]})){
        navigator.share({files:[f],text:RESUMO,title:ASSUNTO}).catch(function(){});
        return;
      }
      if(PDFURL)baixar();
      var d=document.getElementById("dica");
      if(d)d.innerHTML="<b>PDF baixado.</b> O WhatsApp vai abrir com o texto pronto — "
        +"arraste o PDF da pasta de downloads para a conversa e confira antes de enviar.";
      setTimeout(function(){
        window.open("https://web.whatsapp.com/send?text="+encodeURIComponent(RESUMO),"_blank");
      },700);
    });
  }
  function copiar(){
    navigator.clipboard.writeText(RESUMO).then(function(){
      alert("Texto copiado.\\n\\nAgora é só colar onde você quiser.");
    },function(){
      var t=document.createElement("textarea");t.value=RESUMO;document.body.appendChild(t);
      t.select();document.execCommand("copy");t.remove();alert("Texto copiado.");
    });
  }
  <\/script>

  <div class="cap">
    <div class="et">PPR semanal</div>
    <h1>Relatório de Divergências</h1>
    <div class="loja">${esc(loja)}</div>
    <div class="rt">
      <div><div class="nm">${esc(nome)}</div>
        <div class="cg">${esc(cargo)}${cred?" · "+esc(cred):""}</div></div>
      <div class="dt">Período<br><b>${esc(periodoBR)}</b></div>
    </div>
  </div>

  <div class="placar">
    <div class="m al"><b>${total}</b><span>Divergências</span></div>
    <div class="m"><b class="vd">${feitas}</b><span>Já resolvidas</span></div>
    <div class="m"><b>${total-feitas}</b><span>Em aberto</span></div>
  </div>
  <p class="nota-hist">Este documento consolida as divergências apontadas nas verificações do
  período. Por reunir apenas as ocorrências, e não uma avaliação item a item de toda a unidade,
  não se aplica percentual de conformidade.</p>

  ${grupos.map(g=>`
    <h2 class="piso">${esc(g.piso==="GERAL"?"Geral / Outros":g.piso)}</h2>
    ${g.areas.map(a=>`
      <div class="area">
        <h3>${esc(a.area)}<span>${a.itens.length} item${a.itens.length===1?"":"s"}</span></h3>
        ${a.itens.map(i=>`
          <div class="it${i.resolvidoEm?" ok":""}">${i.resolvidoEm?"☑":"☐"} ${esc(i.titulo)}
            ${i.comentario?`<span class="cm">${esc(i.comentario)}</span>`:""}
            ${(i.fotos||[]).length?`<span class="ft">${i.fotos.slice(0,2).map(f=>`<img src="${f}">`).join("")}</span>`:""}
          </div>`).join("")}
      </div>`).join("")}`).join("")}

  <div class="ass">
    <div>${assin?`<img src="${assin}">`:""}<div class="linha" style="${assin?"height:0":""}"></div>
      <p class="rot"><b>${esc(nome)}</b><br>${esc(cargo)}${cred?"<br>"+esc(cred):""}</p></div>
    <div><div class="linha"></div>
      <p class="rot"><b>Ciente — Gerência</b><br>Nome e assinatura<br>Data: ____/____/______</p></div>
  </div>
  <p class="pe">Consolidação semanal das verificações de rotina (PPR) · ${esc(loja)} · ${esc(periodoBR)}</p>
  </body></html>`);
  w.document.close();
}

/* o mesmo documento em PDF DE VERDADE (js/pdflite.js), para anexar no WhatsApp */
function pprRelPDF(grupos,info){
  const C={verde:"#17756a",verdeEsc:"#0f5b52",vermelho:"#c0212a",
    cinza:"#6b7280",cinzaClaro:"#9aa0a8",linha:"#e4e6ea",fundo:"#eef3f1",texto:"#22242e"};
  const {nome,cred,cargo}=pprQuem();
  const M=40,LARG=515;
  const d=new PDFLite();
  d.y=M;
  /* capa (o degradê "fingido" em dois blocos, como no ckRelPDF) */
  d.retangulo(M,M,LARG,104,C.verdeEsc);
  d.retangulo(M+LARG*0.55,M,LARG*0.45,104,C.verde);
  d.texto("PPR SEMANAL",{x:M+18,y:M+16,tam:8,cor:"#cfe4df"});
  d.texto("Relatório de Divergências",{x:M+18,y:M+29,tam:19,cor:"#ffffff",negrito:true});
  d.texto(info.loja,{x:M+18,y:M+54,tam:12,cor:"#d8ebe6"});
  d.linha(M+18,M+76,M+LARG-18,M+76,"#4f9a8e",0.6);
  d.texto(nome,{x:M+18,y:M+82,tam:11,cor:"#ffffff",negrito:true});
  d.texto(cargo+(cred?" · "+cred:""),{x:M+18,y:M+94,tam:8,cor:"#cfe4df"});
  d.texto("Período",{x:M,y:M+82,tam:8,cor:"#cfe4df",larg:LARG-18,direita:true});
  d.texto(info.periodoBR,{x:M,y:M+92,tam:10,cor:"#ffffff",negrito:true,larg:LARG-18,direita:true});
  d.y=M+124;
  /* placar (sem nota, sem percentual) */
  const boxA=48,mlarg=(LARG-14)/3;let mx=M;
  const mini=[["Divergências",String(info.total),C.vermelho],
              ["Já resolvidas",String(info.feitas),"#12b76a"],
              ["Em aberto",String(info.total-info.feitas),(info.total-info.feitas)?C.vermelho:C.texto]];
  for(const [rot,val,cor] of mini){
    d.linha(mx,d.y,mx+mlarg,d.y,C.linha,0.7);
    d.linha(mx,d.y+boxA,mx+mlarg,d.y+boxA,C.linha,0.7);
    d.linha(mx,d.y,mx,d.y+boxA,C.linha,0.7);
    d.linha(mx+mlarg,d.y,mx+mlarg,d.y+boxA,C.linha,0.7);
    d.texto(val,{x:mx+10,y:d.y+9,tam:17,cor,negrito:true});
    d.texto(rot.toUpperCase(),{x:mx+10,y:d.y+32,tam:7,cor:C.cinzaClaro});
    mx+=mlarg+7;
  }
  d.y+=boxA+14;
  d.paragrafo("Este documento consolida as divergências apontadas nas verificações do período. "
    +"Por reunir apenas as ocorrências, e não uma avaliação item a item de toda a unidade, "
    +"não se aplica percentual de conformidade.",
    {x:M,larg:LARG,tam:8,cor:C.cinzaClaro,italico:true,alturaLinha:11});
  d.y+=8;
  /* piso → área → itens com ☐/☑ */
  for(const g of grupos){
    d.espaco(34);d.y+=8;
    d.texto((g.piso==="GERAL"?"GERAL / OUTROS":g.piso).toUpperCase(),
      {x:M,y:d.y,tam:9,cor:C.verde,negrito:true});
    d.y+=13;d.linha(M,d.y,M+LARG,d.y,"#d9e2df",1);d.y+=8;
    for(const a of g.areas){
      d.espaco(30);
      d.retangulo(M,d.y,LARG,17,C.fundo);
      d.texto(a.area,{x:M+9,y:d.y+4,tam:9.5,cor:C.verdeEsc,negrito:true});
      d.texto(a.itens.length+" item"+(a.itens.length===1?"":"s"),
        {x:M,y:d.y+5,tam:7,cor:"#5b7a72",larg:LARG-9,direita:true});
      d.y+=22;
      for(const i of a.itens){
        const ok=!!i.resolvidoEm;
        const linhas=d.quebrar(i.titulo+(i.comentario?" — "+i.comentario:""),LARG-60,9);
        d.espaco(linhas.length*11.5+4);
        d.texto(ok?"[x]":"[ ]",{x:M+8,y:d.y,tam:9,cor:ok?"#0d8a52":C.cinza,negrito:true});
        d.paragrafo(i.titulo+(i.comentario?" — "+i.comentario:""),
          {x:M+30,larg:LARG-60,tam:9,cor:ok?"#0d8a52":"#3f4149",alturaLinha:11.5});
        for(const f of (i.fotos||[]).slice(0,2)){
          if(!/^data:image\/jpe?g/i.test(f))continue;
          d.espaco(84);d.jpeg(f,M+30,d.y,118,78);d.y+=82;
        }
        d.y+=3;
      }
      d.y+=4;
    }
  }
  /* assinaturas: a dela + linha em branco para a Gerência */
  d.espaco(96);d.y+=22;
  const meio=M+LARG/2+10;
  d.linha(M,d.y+40,M+220,d.y+40,C.texto,0.8);
  d.linha(meio,d.y+40,meio+220,d.y+40,C.texto,0.8);
  d.texto(nome,{x:M,y:d.y+46,tam:9,cor:C.texto,negrito:true});
  d.texto(cargo,{x:M,y:d.y+58,tam:8,cor:C.cinza});
  if(cred)d.texto(cred,{x:M,y:d.y+68,tam:8,cor:C.cinza});
  d.texto("Ciente — Gerência",{x:meio,y:d.y+46,tam:9,cor:C.texto,negrito:true});
  d.texto("Nome e assinatura",{x:meio,y:d.y+58,tam:8,cor:C.cinza});
  d.texto("Data: ____/____/______",{x:meio,y:d.y+68,tam:8,cor:C.cinza});
  d.y+=86;
  d.espaco(24);
  d.linha(M,d.y,M+LARG,d.y,"#eceef0",0.7);
  d.y+=6;
  d.paragrafo("Consolidação semanal das verificações de rotina (PPR) · "
    +info.loja+" · "+info.periodoBR,
    {x:M,larg:LARG,tam:7,cor:C.cinzaClaro,alturaLinha:9.5});
  return d.blob();
}
