/* =====================================================================
   MNT 28.07.26 — Relatório de Manutenção e Infraestrutura
   ---------------------------------------------------------------------
   POR QUE ESTA ABA EXISTE (28/07/2026)
   A folha antiga misturava QUALIDADE com MANUTENÇÃO: das 264 linhas,
   180 caíam num bloco "Outro" e eram serviço de manipulador de alimento
   (retirar papelão, limpar bancada, identificar carne). Isso nunca pode
   chegar à mão de quem conserta. Aqui entra SÓ obra, conserto, pintura,
   troca, instalação e limpeza pesada — e só do executor da folha.

   REGRAS DESTA ABA (decididas por ela)
   - 3 colunas: FEITO · O QUE FAZER (problema + correção juntos) · OBSERVAÇÕES
   - a ÁREA não se repete linha a linha: vira cabeçalho do grupo (piso → área)
   - as observações dela aparecem todas, inclusive "VERIFICAR — tenho dúvida"
   - sem assinatura na impressão e sem a palavra "ordem de serviço"
   - tudo editável pelo ✎, sem código e sem IA
   ===================================================================== */

/* status próprio: aqui "pendente" é o que ainda não foi feito */
STATUS_FNS.mnt28={isPend:d=>!d.feito,isDone:d=>!!d.feito};
TABS.mnt28.renderCards=function(){const c=document.getElementById("cards");if(c)c.innerHTML="";};

/* filtros da tela (só vivem enquanto ela está na aba) */
let M28F={q:"",piso:"",area:"",ver:"todos"};

/* ---- itens desta aba, da empresa aberta ---- */
function m28Itens(){
  return DATA.filter(d=>!d.deleted&&d.tipo==="mnt28"&&d.loja===currentStore);
}
/* ===== A ORDEM DOS PISOS E ÁREAS E O CABEÇALHO MORAM NO BANCO DELA =====
   Aprendido testando (28/07): se isto dependesse do arquivo da carga, no site
   publicado e no celular dela — onde esse arquivo não existe — a folha sairia
   fora de ordem e o cabeçalho sem período e sem RT. Gravamos na primeira carga
   e a partir daí viaja na sincronização, como qualquer configuração dela. */
let M28_ORDEM=null,M28_CAB=null;
async function m28Config(){
  if(M28_ORDEM===null)M28_ORDEM=await metaGet("mnt28Ordem")||{};
  if(M28_CAB===null)M28_CAB=await metaGet("mnt28Cabecalho")||{};
}
function m28Ordem(){
  if(M28_ORDEM&&Object.keys(M28_ORDEM).length)return M28_ORDEM;
  const c=window.MNT28_CARGA;
  return (c&&c.ordemAreas)||null;
}
function m28Cab(){
  const c=window.MNT28_CARGA||{};
  return Object.assign({},M28_CAB||{},
    c.periodo?{periodo:c.periodo,rt:c.rt,emitidoEm:c.emitidoEm,executor:c.executor}:{});
}
function m28PosPiso(p){const o=m28Ordem();if(!o)return 0;const k=Object.keys(o);const i=k.indexOf(p);return i<0?99:i;}
function m28PosArea(p,a){const o=m28Ordem();if(!o||!o[p])return 0;const i=o[p].indexOf(a);return i<0?999:i;}

/* =====================================================================
   CARGA ÚNICA — os 106 serviços revisados por ela em 28/07/2026
   ---------------------------------------------------------------------
   O arquivo dados/mnt28-carga.js tem DADOS REAIS da loja e por isso mora
   FORA do repositório público (pasta dados/ está no .gitignore). Se ele
   não existir — é o caso do site publicado —, esta função não faz nada:
   os itens já chegaram pela sincronização, como qualquer dado dela.
   Entra UMA vez só; a marca fica gravada para nunca duplicar.
   ===================================================================== */
async function m28CargaInicial(){
  const c=window.MNT28_CARGA;
  if(!c||!Array.isArray(c.itens)||!c.itens.length)return false;
  const feitas=await metaGet("mnt28Cargas")||[];
  if(feitas.includes(c.cargaId))return false;
  /* segunda trava: se o uid já existe no banco, não entra de novo */
  const jaTem=new Set(DATA.map(d=>d.uid));
  const novos=[];
  for(const it of c.itens){
    if(jaTem.has(it.uid))continue;
    const o={uid:it.uid,mod:nowISO(),tipo:"mnt28",loja:c.loja,
      piso:it.piso,area:it.area,fazer:it.fazer,obs:it.obs||"",
      origem:it.origem||"",executor:c.executor||"",feito:false,
      ordem:it.ordem,relato:c.emitidoEm||today(),criado:"carga:"+c.cargaId};
    const id=await putItem(o);o.id=id;DATA.push(o);novos.push(o);
  }
  /* guarda a ordem oficial e o cabeçalho NO BANCO: é o que faz a folha continuar
     organizada no celular dela, onde o arquivo da carga não existe */
  if(c.ordemAreas){M28_ORDEM=c.ordemAreas;await metaSetU("mnt28Ordem",c.ordemAreas);}
  M28_CAB={periodo:c.periodo||"",rt:c.rt||"",crn:c.crn||"",
    emitidoEm:c.emitidoEm||today(),executor:c.executor||"",lojaNome:c.lojaNome||""};
  await metaSetU("mnt28Cabecalho",M28_CAB);
  await metaSetU("mnt28Cargas",feitas.concat([c.cargaId]));
  if(novos.length){dataChanged();toast(novos.length+" serviços carregados ✓");}
  return novos.length>0;
}

/* ---- tela ---- */
async function renderMnt28(){
  const el=document.getElementById("tab-mnt28");if(!el)return;
  await m28Config();
  await m28CargaInicial();
  const itens=m28Itens();
  const c=m28Cab();
  const loja=(empresa(currentStore)||{}).name||currentStoreName||currentStore||"";
  const exec=(itens.find(d=>d.executor)||{}).executor||c.executor||"";
  const total=itens.length,feitos=itens.filter(d=>d.feito).length;
  const areas=[...new Set(itens.map(d=>d.area))];
  const pisos=[...new Set(itens.map(d=>d.piso))]
    .sort((a,b)=>m28PosPiso(a)-m28PosPiso(b));

  const capa=`<div class="m28-capa">
    <div class="m28-capa-et">Relatório de manutenção</div>
    <h1>Manutenção e Infraestrutura</h1>
    <div class="m28-capa-sub">Obras, consertos e instalações${exec?" — "+esc(exec):""}</div>
    <div class="m28-capa-linha">
      <div class="m28-capa-i"><div class="rot">Unidade</div><div class="val">${esc(loja)}</div></div>
      <div class="m28-capa-i"><div class="rot">Período</div><div class="val">${esc(c.periodo||"—")}</div></div>
      <div class="m28-capa-i"><div class="rot">Emitido em</div><div class="val">${brDate(c.emitidoEm||today())}</div></div>
      <div class="m28-capa-i"><div class="rot">Responsável técnica</div><div class="val">${esc((c.rt||RT_INFO||RT_DEFAULT)+(c.crn?" · "+c.crn:""))}</div></div>
    </div></div>`;

  /* painel de números: peça PRONTA da biblioteca (bd-kpis / bd-kpi), nada do zero */
  const kpi=(nome,valor,obs,classe)=>`<div class="bd-kpi">
      <div class="bd-kpi-topo"><span class="bd-kpi-nome">${esc(nome)}</span></div>
      <div class="bd-kpi-num${classe?" "+classe:""}">${valor}</div>
      <div class="bd-kpi-var"><span class="bd-kpi-obs">${esc(obs)}</span></div>
    </div>`;
  const numeros=`<div class="bd-kpis m28-nums">
    ${kpi("Serviços",total,"em "+areas.length+(areas.length===1?" área":" áreas"))}
    ${kpi("A fazer",total-feitos,(total?Math.round((total-feitos)/total*100):0)+"% do total","m28-pend")}
    ${kpi("Feitos",feitos,"marcados por você","m28-ok")}
    ${kpi("Pisos",pisos.length,pisos.join(" e ")||"—")}
  </div>`;

  const opPiso=pisos.map(p=>`<option value="${esc(p)}"${M28F.piso===p?" selected":""}>${esc(p)}</option>`).join("");
  const opArea=areas.sort().map(a=>`<option value="${esc(a)}"${M28F.area===a?" selected":""}>${esc(a)}</option>`).join("");
  const barra=`<div class="toolbar m28-barra">
    <div class="search">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="text" id="m28q" aria-label="Buscar nesta folha" autocomplete="off" spellcheck="false"
        placeholder="Buscar por serviço, área ou observação…" value="${esc(M28F.q)}" oninput="m28Filtro('q',this.value)">
    </div>
    <select aria-label="Filtrar por piso" onchange="m28Filtro('piso',this.value)"><option value="">Todos os pisos</option>${opPiso}</select>
    <select aria-label="Filtrar por área" onchange="m28Filtro('area',this.value)"><option value="">Todas as áreas</option>${opArea}</select>
    <select aria-label="Mostrar" onchange="m28Filtro('ver',this.value)">
      <option value="todos"${M28F.ver==="todos"?" selected":""}>Todos</option>
      <option value="fazer"${M28F.ver==="fazer"?" selected":""}>Só o que falta</option>
      <option value="feitos"${M28F.ver==="feitos"?" selected":""}>Só os feitos</option>
    </select>
    <button class="btn ghost sm" onclick="m28Novo()" title="Acrescentar um serviço nesta folha">+ Serviço</button>
    <button class="btn ghost sm" onclick="m28Imprimir()" title="Abrir a folha pronta para imprimir ou salvar em PDF">🖨 Imprimir / PDF</button>
  </div>`;

  el.innerHTML=capa+numeros+barra+'<div id="m28-lista"></div>';
  m28RenderLista();
}

function m28Filtro(k,v){M28F[k]=v;m28RenderLista();}

function m28RenderLista(){
  const el=document.getElementById("m28-lista");if(!el)return;
  const q=(M28F.q||"").toLowerCase();
  let rows=m28Itens().filter(d=>{
    if(M28F.piso&&d.piso!==M28F.piso)return false;
    if(M28F.area&&d.area!==M28F.area)return false;
    if(M28F.ver==="fazer"&&d.feito)return false;
    if(M28F.ver==="feitos"&&!d.feito)return false;
    if(q&&!((d.fazer||"")+" "+(d.obs||"")+" "+(d.area||"")+" "+(d.piso||"")).toLowerCase().includes(q))return false;
    return true;});

  if(!rows.length){
    el.innerHTML='<div class="m28-vazio">Nenhum serviço com esses filtros. '
      +'Limpe a busca ou escolha “Todos” para ver a folha inteira.</div>';
    return;
  }
  rows.sort((a,b)=>m28PosPiso(a.piso)-m28PosPiso(b.piso)
    ||m28PosArea(a.piso,a.area)-m28PosArea(b.piso,b.area)
    ||((a.ordem??1e9)-(b.ordem??1e9)));

  const nPiso={},nArea={},fArea={};
  for(const d of rows){
    nPiso[d.piso]=(nPiso[d.piso]||0)+1;
    const k=d.piso+"|"+d.area;
    nArea[k]=(nArea[k]||0)+1;
    if(d.feito)fArea[k]=(fArea[k]||0)+1;
  }
  let html="",piso=null,area=null;
  for(const d of rows){
    if(d.piso!==piso){piso=d.piso;area=null;
      html+=`<div class="m28-piso">${esc(piso||"Sem piso")}<span class="m28-count">${nPiso[d.piso]} ${nPiso[d.piso]===1?"serviço":"serviços"}</span></div>`;}
    if(d.area!==area){area=d.area;const k=d.piso+"|"+d.area;
      const f=fArea[k]||0,n=nArea[k];
      html+=`<div class="m28-area"><span class="m28-area-nome">${esc(area)}</span>`
        +`<span class="m28-count">${f?f+" de "+n+" feitos":n+(n===1?" serviço":" serviços")}</span>`
        +`<div class="m28-tab-cab"><span>Feito</span><span>O que fazer</span><span>Observações</span></div></div>`;}
    html+=`<div class="m28-item${d.feito?" feito":""}" data-id="${d.id}">
      <button class="m28-check" role="checkbox" aria-checked="${d.feito?"true":"false"}"
        aria-label="Marcar como feito: ${esc((d.fazer||"").slice(0,70))}"
        title="${d.feito?"Marcado como feito — toque para desmarcar":"Marcar como feito"}"
        onclick="m28Marcar(${d.id})"><span aria-hidden="true">${d.feito?"✓":""}</span></button>
      <div class="m28-fazer">${esc(d.fazer||"")}
        ${d.origem?`<span class="m28-origem">${esc(d.origem)}</span>`:""}</div>
      <div class="m28-obs">${d.obs?esc(d.obs):'<span class="m28-vaziotxt">—</span>'}</div>
      <div class="m28-acts">
        <button class="btn ghost sm" onclick="m28Editar(${d.id})" aria-label="Editar este serviço" title="Mudar o texto ou a observação deste serviço">✎</button>
        <button class="delbtn" aria-label="Excluir este serviço" title="Excluir este serviço" onclick="m28Excluir(${d.id})">🗑</button>
      </div></div>`;
  }
  el.innerHTML=html;
}

/* ---- ações (tudo passa por putItem: o desfazer do site pega) ---- */
async function m28Marcar(id){
  const d=DATA.find(x=>x.id===id);if(!d)return;
  d.feito=!d.feito;d.mod=nowISO();
  await putItem(d);dataChanged();
  m28AtualizarTopo();m28RenderLista();
}
async function m28Editar(id){
  const d=DATA.find(x=>x.id===id);if(!d)return;
  const t=prompt("O que fazer (aparece na folha do executor):",d.fazer||"");
  if(t===null)return;
  const o=prompt("Observações (fica na coluna do lado; pode deixar vazio):",d.obs||"");
  if(o===null)return;
  d.fazer=t.trim();d.obs=o.trim();d.mod=nowISO();
  await putItem(d);dataChanged();
  m28RenderLista();toast("Serviço atualizado ✓");
}
async function m28Excluir(id){
  const d=DATA.find(x=>x.id===id);if(!d)return;
  if(!confirm("Excluir este serviço?\n\n"+(d.fazer||"")))return;
  d.deleted=true;d.mod=nowISO();
  await putItem(d);dataChanged();
  m28AtualizarTopo();m28RenderLista();toast("Serviço excluído");
}
async function m28Novo(){
  const itens=m28Itens();
  const pisos=[...new Set(itens.map(d=>d.piso))].sort((a,b)=>m28PosPiso(a)-m28PosPiso(b));
  const piso=prompt("Em qual piso?\n\n"+pisos.join("\n"),M28F.piso||pisos[0]||"1º PISO");
  if(piso===null)return;
  const doPiso=[...new Set(itens.filter(d=>d.piso===piso.trim()).map(d=>d.area))].sort();
  const area=prompt("Em qual área?\n\n"+(doPiso.join("\n")||"(nenhuma área ainda neste piso)"),M28F.area||doPiso[0]||"");
  if(area===null)return;
  const fazer=prompt("O que fazer? Escreva o problema e a correção na mesma frase.","");
  if(fazer===null||!fazer.trim())return;
  const obs=prompt("Observações (pode deixar vazio):","");
  if(obs===null)return;
  const o={uid:newUid(),mod:nowISO(),tipo:"mnt28",loja:currentStore,
    piso:piso.trim(),area:area.trim(),fazer:fazer.trim(),obs:obs.trim(),
    origem:"",executor:(itens.find(d=>d.executor)||{}).executor||"",
    feito:false,ordem:(m28PosArea(piso.trim(),area.trim())*1000)+999,
    relato:today(),criado:"manual"};
  const id=await putItem(o);o.id=id;DATA.push(o);dataChanged();
  m28AtualizarTopo();m28RenderLista();toast("Serviço acrescentado ✓");
}
/* só os números do topo — evita redesenhar a folha inteira a cada toque */
function m28AtualizarTopo(){
  const itens=m28Itens(),total=itens.length,feitos=itens.filter(d=>d.feito).length;
  const el=document.getElementById("tab-mnt28");if(!el)return;
  const nums=el.querySelectorAll(".m28-nums .bd-kpi");
  if(nums.length>=3){
    nums[0].querySelector(".bd-kpi-num").textContent=total;
    nums[1].querySelector(".bd-kpi-num").textContent=total-feitos;
    nums[1].querySelector(".bd-kpi-obs").textContent=(total?Math.round((total-feitos)/total*100):0)+"% do total";
    nums[2].querySelector(".bd-kpi-num").textContent=feitos;
  }
}

/* =====================================================================
   IMPRESSÃO — a folha que vai para a mão do executor
   Mesmo caminho do resto do site: abre uma janela e usa a caixa de
   impressão do navegador (Salvar como PDF). Sem assinatura e sem a
   palavra "ordem de serviço", por decisão dela.
   ===================================================================== */
function m28Imprimir(){
  let rows=m28Itens();
  if(M28F.ver==="fazer")rows=rows.filter(d=>!d.feito);
  if(M28F.ver==="feitos")rows=rows.filter(d=>d.feito);
  if(M28F.piso)rows=rows.filter(d=>d.piso===M28F.piso);
  if(M28F.area)rows=rows.filter(d=>d.area===M28F.area);
  if(!rows.length){alert("Nenhum serviço para imprimir com os filtros atuais.");return;}
  rows.sort((a,b)=>m28PosPiso(a.piso)-m28PosPiso(b.piso)
    ||m28PosArea(a.piso,a.area)-m28PosArea(b.piso,b.area)
    ||((a.ordem??1e9)-(b.ordem??1e9)));

  const c=m28Cab();
  const loja=(empresa(currentStore)||{}).name||currentStoreName||currentStore||"";
  const exec=(rows.find(d=>d.executor)||{}).executor||c.executor||"";
  const feitos=rows.filter(d=>d.feito).length;
  const areas=[...new Set(rows.map(d=>d.area))];

  let corpo="",piso=null,area=null;
  const nArea={};for(const d of rows){const k=d.piso+"|"+d.area;nArea[k]=(nArea[k]||0)+1;}
  for(const d of rows){
    if(d.piso!==piso){
      if(area!==null)corpo+="</tbody></table>";
      if(piso!==null)corpo+="</section>";
      piso=d.piso;area=null;
      corpo+=`<section><h2>${esc(piso||"Sem piso")}</h2>`;
    }
    if(d.area!==area){
      if(area!==null)corpo+="</tbody></table>";
      area=d.area;
      corpo+=`<div class="ar"><span>${esc(area)}</span><b>${nArea[d.piso+"|"+d.area]}</b></div>
        <table><thead><tr><th class="c">Feito</th><th>O que fazer</th><th class="o">Observações</th></tr></thead><tbody>`;
    }
    corpo+=`<tr><td class="c"><span class="bx">${d.feito?"✓":""}</span></td>
      <td>${esc(d.fazer||"")}</td>
      <td class="o">${esc(d.obs||"")}</td></tr>`;
  }
  if(area!==null)corpo+="</tbody></table>";
  if(piso!==null)corpo+="</section>";

  const w=window.open("");
  if(!w){alert("O navegador bloqueou a janela de impressão. Libere as janelas para este site e tente de novo.");return;}
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
  <title>Manutenção e Infraestrutura — ${esc(loja)}</title><style>
  @page{margin:13mm}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#344054;font-size:11.5px;line-height:1.5}
  .capa{background:linear-gradient(150deg,#0f5b52 0%,#17756a 55%,#2a9d8a 100%);color:#fff;
    padding:20px 22px;border-radius:10px;margin-bottom:18px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .et{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.6px;color:rgba(255,255,255,.75);margin-bottom:5px}
  .capa h1{font-size:23px;font-weight:700;letter-spacing:-.4px;line-height:1.2}
  .sub{font-size:12.5px;color:rgba(255,255,255,.9);margin-top:4px}
  .linha{display:flex;flex-wrap:wrap;gap:22px;margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.25)}
  .linha .rot{font-size:8.5px;text-transform:uppercase;letter-spacing:.9px;color:rgba(255,255,255,.68)}
  .linha .val{font-size:12px;font-weight:600;margin-top:2px}
  .nums{display:flex;gap:9px;margin-bottom:18px}
  .num{flex:1;border:1px solid #eaecf0;border-radius:9px;padding:9px 11px;background:#f9fafb}
  .num .rot{font-size:8.4px;font-weight:600;text-transform:uppercase;letter-spacing:.7px;color:#667085}
  .num .val{font-size:19px;font-weight:700;color:#101828;line-height:1.1;margin-top:3px;font-variant-numeric:tabular-nums}
  section{margin-bottom:16px;break-inside:auto}
  section h2{font-size:12.5px;font-weight:700;color:#0f5b52;text-transform:uppercase;letter-spacing:.6px;
    border-bottom:2px solid #1d6b57;padding-bottom:5px;margin-bottom:9px;break-after:avoid}
  .ar{display:flex;justify-content:space-between;align-items:baseline;background:#e8f5f0;
    border-left:3px solid #1d6b57;padding:5px 9px;margin-top:11px;font-size:11.5px;font-weight:700;
    color:#155244;break-after:avoid;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .ar b{font-weight:600;color:#667085;font-size:10px}
  table{width:100%;border-collapse:collapse;break-inside:auto}
  th{text-align:left;font-size:8.6px;text-transform:uppercase;letter-spacing:.5px;color:#667085;
    border-bottom:1px solid #eaecf0;padding:5px 7px;font-weight:600}
  td{padding:7px;border-bottom:1px solid #f2f4f7;vertical-align:top}
  tr{break-inside:avoid}
  .c{width:42px;text-align:center}
  .o{width:29%;color:#667085;font-size:10.5px}
  .bx{display:inline-block;width:14px;height:14px;border:1.5px solid #667085;border-radius:3px;
    line-height:12px;font-size:11px;color:#067647;font-weight:700}
  .rod{margin-top:16px;padding-top:9px;border-top:1px solid #eaecf0;font-size:9px;color:#667085;
    display:flex;justify-content:space-between}
  .noprint{margin-bottom:14px}
  @media print{.noprint{display:none}}
  </style></head><body>
  <div class="noprint"><button onclick="print()" style="padding:11px 16px;cursor:pointer;font-size:13px;border-radius:8px;border:1px solid #1d6b57;background:#1d6b57;color:#fff">🖨 Imprimir / Salvar PDF</button></div>
  <div class="capa">
    <div class="et">Relatório de manutenção</div>
    <h1>Manutenção e Infraestrutura</h1>
    <div class="sub">Obras, consertos e instalações${exec?" — "+esc(exec):""}</div>
    <div class="linha">
      <div><div class="rot">Unidade</div><div class="val">${esc(loja)}</div></div>
      <div><div class="rot">Período</div><div class="val">${esc(c.periodo||"—")}</div></div>
      <div><div class="rot">Emitido em</div><div class="val">${brDate(today())}</div></div>
      <div><div class="rot">Responsável técnica</div><div class="val">${esc((c.rt||RT_INFO||RT_DEFAULT)+(c.crn?" · "+c.crn:""))}</div></div>
    </div></div>
  <div class="nums">
    <div class="num"><div class="rot">Serviços</div><div class="val">${rows.length}</div></div>
    <div class="num"><div class="rot">A fazer</div><div class="val">${rows.length-feitos}</div></div>
    <div class="num"><div class="rot">Feitos</div><div class="val">${feitos}</div></div>
    <div class="num"><div class="rot">Áreas</div><div class="val">${areas.length}</div></div>
  </div>
  ${corpo}
  <div class="rod"><span>Manutenção e Infraestrutura · ${esc(loja)}</span><span>Documento gerado em ${brDate(today())}</span></div>
  </body></html>`);
  w.document.close();
}
