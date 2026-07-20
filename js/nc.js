/* =====================================================================
   Gestão de Não Conformidade — aba de registro por empresa.
   Recursos: áreas por piso, urgência automática por palavras-chave
   (URGENTE / OBSERVAÇÃO; ambíguo → OBSERVAÇÃO + revisar), consolidação
   de repetições, resolver/reabrir, reincidência mês a mês com contador,
   redação técnica formal (as RDCs orientam o tom, nunca aparecem no texto),
   relatório mensal por empresa (impressão/PDF e Word).
   ===================================================================== */

/* status próprio da aba (usado por isPendente/isConcluido do núcleo) */
STATUS_FNS.nc={isPend:d=>d.status!=="Resolvida",isDone:d=>d.status==="Resolvida"};
/* cards próprios da aba (registro de abas do núcleo) */
TABS.nc.renderCards=function(){ncRenderCards();};

/* ---- áreas por empresa (store meta, chave areas_<code>) ---- */
let NC_AREAS={};/* code -> [{n,nome,piso}] */
async function ncAreas(code){
 if(NC_AREAS[code])return NC_AREAS[code];
 const v=await metaGet("areas_"+code);
 NC_AREAS[code]=v||[];
 return NC_AREAS[code];
}
async function ncSaveAreas(code){await metaSet("areas_"+code,NC_AREAS[code]||[]);AREAS_ALL[code]=NC_AREAS[code]||[];AREAS_MOD=nowISO();await metaSet("areasMod",AREAS_MOD);dataChanged();}
function ncPisos(areas){const seen=[];for(const a of areas)if(!seen.includes(a.piso))seen.push(a.piso);return seen;}

/* ---- classificação automática de urgência ----
   Algoritmo por palavras-chave:
   1) o texto é normalizado (minúsculas + acentos removidos);
   2) prioridade: URGENTE > ATENÇÃO > OBSERVAÇÃO — a primeira lista que
      tiver palavra reconhecida vence;
   3) NENHUMA palavra reconhecida → OBSERVAÇÃO + revisão pendente. */
/* urgências EDITÁVEIS por ela (mesma regra do Quadro Geral: a chave nunca muda) */
const NC_URG_PADRAO={URGENTE:{rotulo:"URGENTE",cor:"#e5484d",fundo:"#ffecec",ordem:0},
 OBSERVACAO:{rotulo:"OBSERVAÇÃO",cor:"#047857",fundo:"#d1fae5",ordem:1}};
let NC_URG={...NC_URG_PADRAO},NC_URG_MOD="";
/* compatibilidade: itens antigos ATENCAO exibem como OBSERVAÇÃO */
Object.defineProperty(NC_URG,"ATENCAO",{value:NC_URG.OBSERVACAO,enumerable:false});
async function ncLoadUrgencias(){
  const g=await metaGet("ncUrgencias");NC_URG_MOD=await metaGet("ncUrgenciasMod")||"";
  if(g&&Object.keys(g).length){
    NC_URG={...g};
    if(!Object.getOwnPropertyDescriptor(NC_URG,"ATENCAO"))
      Object.defineProperty(NC_URG,"ATENCAO",{value:NC_URG.OBSERVACAO||Object.values(NC_URG)[0],enumerable:false});
  }
}
async function ncSalvarUrgencias(){
  NC_URG_MOD=nowISO();
  const puro={};for(const k of ordenarOpc(NC_URG))puro[k]=NC_URG[k];
  await metaSetU("ncUrgencias",puro);await metaSetU("ncUrgenciasMod",NC_URG_MOD);
  dataChanged();if(window.renderNC)renderNC();
}
/* usa o MESMO gerenciador do Quadro Geral, para a experiência ser igual em todas as abas */
function ncGerirUrgencias(){dgGerirOpcoes("urg");}
function ncNormalizar(t){return (t||"").toLowerCase().trim().normalize("NFKD").replace(/[\u0300-\u036f]/g,"");}
const NC_KW={
 URGENTE:["mofo","mofad","bolor","contamina","contaminaç","cruzad",
  "temperatura","descongel","fora do padrao","fora da validade",
  "vencid","vencimento","validade",
  "rato","ratos","roedor","camundongo",
  "barata","baratas","inseto","insetos","mosca","moscas",
  "formiga","formigas","praga","pombo","pomba","passaro",
  "infiltra","vazamento","esgoto","agua suja","agua parada"],
 ATENCAO:["pintura","descasc","tinta descasc",
  "vedaç","veda","borracha",
  "lampada","lâmpada","queimad","iluminaç",
  "equipamento com defeito","defeito","quebrad","solto","solta",
  "rachad","trinca","manutenç"],
 OBSERVACAO:["organiza","desorganiz","sinaliza","sinalizaç",
  "padroniza","padronizaç","identificaç","estetic","estétic"]
};
function ncClassificar(texto){
 const t=ncNormalizar(texto);
 const tem=l=>l.some(k=>t.includes(k));
 if(tem(NC_KW.URGENTE))return{urgencia:"URGENTE",revisar:false};
 if(tem(NC_KW.ATENCAO)||tem(NC_KW.OBSERVACAO))return{urgencia:"OBSERVACAO",revisar:false};
 return{urgencia:"OBSERVACAO",revisar:true}; /* nada reconhecido → OBSERVAÇÃO + revisar */
}

/* ---- detecção automática de área "Nome da área: descrição" ----
   Algoritmo de classificação por radicais e correspondência ponderada. */
const NC_PALAVRAS_IRRELEVANTES=new Set(["de","da","do","das","dos","e","em","na","no","nas","nos","com","sem","a","o","as","os","para","por"]);
const NC_LIMIAR_AREA=0.5;
function ncTokenizar(tn){
 const limpo=[...tn].map(c=>(/[a-z0-9]/.test(c)||/\s/.test(c))?c:" ").join("");
 return limpo.split(/\s+/).filter(p=>p&&!NC_PALAVRAS_IRRELEVANTES.has(p)&&p.length>=3);
}
function ncPontuarArea(tokensCand,tokensArea){
 if(!tokensArea.length)return 0;
 let acertos=0;
 for(const ta of tokensArea)if(tokensCand.some(tc=>ta.startsWith(tc)||tc.startsWith(ta)))acertos++;
 return acertos/tokensArea.length;
}
function ncDetectarArea(texto,areas){
 if(!texto.includes(":"))return null;
 const tokensCand=ncTokenizar(ncNormalizar(texto.split(":")[0]));
 if(!tokensCand.length)return null;
 let melhor=null,melhorP=0;
 for(const a of areas){
   const p=ncPontuarArea(tokensCand,ncTokenizar(ncNormalizar(a.nome)));
   if(p>melhorP){melhorP=p;melhor=a;}
 }
 return (melhor&&melhorP>=NC_LIMIAR_AREA)?melhor:null;
}

/* ---- reincidência dinâmica: nº do mês em aberto (1 = mês do relato) ---- */
function ncMeses(d,refYm){
 const rel=(d.relato||"").slice(0,7);if(!rel)return 1;
 const ry=+rel.slice(0,4),rm=+rel.slice(5,7),y=+refYm.slice(0,4),m=+refYm.slice(5,7);
 return Math.max(1,(y-ry)*12+(m-rm)+1);
}
const ncOrdinal=n=>n+"º mês";

/* ---- redação técnica (rascunho por modelo; skill redacao-tecnica-uan
        pode refinar depois). Tom formal, direto, sem culpabilizar,
        1–3 linhas, sem citar RDC. ---- */
function ncRedacao(item){
 const pts=[item.texto_bruto,...(item.pontos||[])].filter(Boolean)
  .map(t=>t.trim().replace(/\s+/g," ").replace(/[.;\s]+$/,""))
  .map(t=>t.charAt(0).toUpperCase()+t.slice(1));
 const acao={URGENTE:"Recomenda-se correção imediata.",
  ATENCAO:"Recomenda-se correção no curto prazo.",
  OBSERVACAO:"Recomenda-se adequação na rotina de manutenção e higienização."}[item.urgencia]||"Recomenda-se ação corretiva.";
 return "Constatado na área "+item.area+": "+pts.join("; ").toLowerCase().replace(/^./,c=>c.toUpperCase())+". "+acao;
}

/* ---- helpers ---- */
function ncItens(){return DATA.filter(d=>!d.deleted&&d.tipo==="nc"&&d.loja===currentStore);}
function ncTag(u){const c=NC_URG[u]||NC_URG.ATENCAO;
 return `<span class="nc-tag" style="color:${c.cor};background:${c.fundo}">${c.rotulo}</span>`;}
async function ncPut(it){it.mod=nowISO();it.atualizacao=today();await putItem(it);dataChanged();}

/* ---- cards próprios da aba ---- */
function ncRenderCards(){
 const it=ncItens(),ab=it.filter(d=>d.status!=="Resolvida");
 const n=u=>ab.filter(d=>d.urgencia===u).length;
 const ym=today().slice(0,7);
 const reinc=ab.filter(d=>ncMeses(d,ym)>=2).length;
 const res=it.filter(d=>d.status==="Resolvida"&&(d.resolvida_em||"").startsWith(ym)).length;
 document.getElementById("cards").innerHTML=`
  <div class="card"><div class="lbl">Urgentes</div><div class="sub">abertas</div><div class="val red">${n("URGENTE")}</div></div>
  <div class="card"><div class="lbl">Observação</div><div class="sub">abertas</div><div class="val green">${n("OBSERVACAO")+n("ATENCAO")}</div></div>
  <div class="card"><div class="lbl">Reincidentes</div><div class="sub">2º mês ou mais</div><div class="val purple">${reinc}</div></div>
  <div class="card"><div class="lbl">Resolvidas</div><div class="sub">neste mês</div><div class="val blue">${res}</div></div>`;
}

/* ---- estado de filtros da aba ---- */
let ncF={piso:"",area:"",urg:"",status:"Abertas",q:""};
let ncCapFotos=[];      /* dataURLs pendentes do formulário */
let ncCapUrgManual=null;/* urgência escolhida manualmente no formulário */

/* ---- render principal da aba ---- */
async function renderNC(){
 if(window.aplicarTextos)setTimeout(aplicarTextos,0);
 const wrap=document.getElementById("tab-nc");
 const areas=await ncAreas(currentStore);
 if(wrap.dataset.store!==currentStore){
  wrap.dataset.store=currentStore;
  ncF={piso:"",area:"",urg:"",status:"Abertas",q:""};ncCapFotos=[];ncCapUrgManual=null;
  wrap.innerHTML=`
   <div id="nc-capture"></div>
   <div class="toolbar" id="nc-toolbar"></div>
   <div id="nc-list"></div>`;
  ncBuildCapture(areas);
  ncBuildToolbar(areas);
 }
 ncRenderList();
}

function ncOptions(list,sel){return list.map(v=>`<option value="${esc(v)}" ${v===sel?"selected":""}>${esc(v)}</option>`).join("");}

function ncBuildCapture(areas){
 const el=document.getElementById("nc-capture");
 if(!areas.length){
  el.innerHTML=`<div class="form-wrap nc-cap">
   <h2>Relatório de Não Conformidade - Gerência — ${esc(currentStoreName)}</h2>
   <p class="desc">Esta empresa ainda não tem áreas cadastradas ("mesmas regras, áreas diferentes"). Cadastre as áreas por piso para começar a registrar NCs.</p>
   <button class="btn" onclick="ncGerirAreas()">🗂 Cadastrar áreas</button></div>`;
  return;
 }
 const pisos=ncPisos(areas);
 el.innerHTML=`<div class="form-wrap nc-cap">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
   <button class="btn" onclick="ncToggleCap()"><span data-txt="nc.registrar">➕ Registrar NC</span></button>
   <span>
    <button class="btn ghost sm" onclick="ncGerirAreas()"><span data-txt="nc.areas">🗂 Áreas</span></button>
    <button class="btn ghost sm" onclick="ncRelatorio()"><span data-txt="nc.relatorio">📄 Relatório mensal</span></button>
   </span>
  </div>
  <div id="nc-cap-body" style="display:none;margin-top:14px">
  <p class="desc">Escolha o local, descreva o problema e anexe fotos — a urgência é classificada sozinha.</p>
  <div class="grid2">
   <div class="field"><label data-txt="nc.piso">Piso *</label>
    <select id="nc-cap-piso" onchange="ncCapPiso()"><option value="">Selecione o piso...</option>${ncOptions(pisos,"")}</select></div>
   <div class="field"><label data-txt="nc.area">Área *</label>
    <select id="nc-cap-area" disabled><option value="">Escolha o piso primeiro</option></select></div>
  </div>
  <div class="field"><label data-txt="nc.oque">O que foi encontrado? *</label>
   <textarea id="nc-cap-texto" placeholder="Ex.: Vazamento no cano da pia, água acumulando no piso..." oninput="ncCapSugerir()"></textarea></div>
  <div class="grid2">
   <div class="field"><label data-txt="nc.acao">Ação corretiva (opcional)</label>
    <textarea id="nc-cap-acao" placeholder="Ex.: Substituir a borracha de vedação com prioridade..."></textarea></div>
   <div class="field"><label data-txt="nc.obs">Observação (opcional)</label>
    <textarea id="nc-cap-obs" placeholder="Ex.: Setor já recebeu orientação verbal em junho..."></textarea></div>
  </div>
  <div class="field"><label>Urgência (sugerida automaticamente — toque para trocar)</label>
   <div class="nc-chips" id="nc-cap-chips"></div></div>
  <div class="field"><label data-txt="nc.fotos">Fotos (opcional)</label>
   <input type="file" id="nc-cap-foto" accept="image/*" capture="environment" multiple onchange="ncCapFoto(event)">
   <div class="nc-thumbs" id="nc-cap-thumbs"></div></div>
  <div class="form-actions">
   <button class="btn" onclick="ncCapSalvar()"><span data-txt="nc.salvar">Salvar NC</span></button>
   <button class="btn ghost" onclick="ncToggleCap()">Fechar</button>
  </div></div></div>`;
 ncCapRenderChips("OBSERVACAO",false);
}
function ncToggleCap(){const b=document.getElementById("nc-cap-body");if(b)b.style.display=b.style.display==="none"?"block":"none";}
async function ncCapPiso(){
 const areas=await ncAreas(currentStore);
 const piso=document.getElementById("nc-cap-piso").value;
 const sel=document.getElementById("nc-cap-area");
 const opts=areas.filter(a=>a.piso===piso);
 sel.disabled=!opts.length;
 sel.innerHTML='<option value="">Selecione a área...</option>'+opts.map(a=>`<option value="${esc(a.nome)}">${a.n?a.n+". ":""}${esc(a.nome)}</option>`).join("");
}
async function ncCapSugerir(){
 const texto=document.getElementById("nc-cap-texto").value;
 if(!ncCapUrgManual){ /* escolha manual prevalece */
   const r=ncClassificar(texto);
   ncCapRenderChips(r.urgencia,r.revisar);
 }
 /* regra do bot: texto no formato "Área: descrição" preenche piso e área sozinho */
 const selA=document.getElementById("nc-cap-area");
 if(texto.includes(":")&&selA&&!selA.value){
   const areas=await ncAreas(currentStore);
   const m=ncDetectarArea(texto,areas);
   if(m){
     document.getElementById("nc-cap-piso").value=m.piso;
     await ncCapPiso();
     selA.value=m.nome;
     toast("Área detectada: "+m.nome+" ✓");
   }
 }
}
function ncCapRenderChips(atual,revisar){
 const el=document.getElementById("nc-cap-chips");if(!el)return;
 el.dataset.urg=atual;el.dataset.revisar=revisar?"1":"";
 el.innerHTML=ordenarOpc(NC_URG).map(u=>{const c=NC_URG[u];
  return `<span class="nc-chip ${u===atual?"on":""}" style="${u===atual?`background:${c.fundo};color:${c.cor};border-color:${c.cor}`:""}" onclick="ncCapUrgManual='${u}';ncCapRenderChips('${u}',false)">${c.rotulo}</span>`;}).join("")
  +(revisar?'<span class="nc-chip warn">⚠ revisar</span>':"");
}
async function ncCapFoto(e){
 for(const f of e.target.files){const d=await ncComprimir(f);if(d)ncCapFotos.push(d);}
 e.target.value="";
 document.getElementById("nc-cap-thumbs").innerHTML=ncCapFotos.map((d,i)=>
  `<span class="nc-thumb"><img src="${d}"><button onclick="ncCapFotos.splice(${i},1);ncCapFoto({target:{files:[]}})" title="Remover">×</button></span>`).join("");
}
function ncComprimir(file){return new Promise(res=>{
 const img=new Image();
 img.onload=()=>{const MAX=800,sc=Math.min(1,MAX/Math.max(img.width,img.height));
  const cv=document.createElement("canvas");cv.width=Math.round(img.width*sc);cv.height=Math.round(img.height*sc);
  cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height);
  URL.revokeObjectURL(img.src);res(cv.toDataURL("image/jpeg",0.7));};
 /* iPhone entrega HEIC — navegador não lê, img.onerror dispara. */
 img.onerror=()=>{URL.revokeObjectURL(img.src);
  toast("Não consegui abrir esta foto — se veio do iPhone, salve como JPEG antes.");
  res(null);};
 img.src=URL.createObjectURL(file);});}

async function ncCapSalvar(){
 const piso=document.getElementById("nc-cap-piso").value;
 const area=document.getElementById("nc-cap-area").value;
 const texto=document.getElementById("nc-cap-texto").value.trim();
 if(!piso||!area){alert("Escolha o piso e a área.");return;}
 if(!texto&&!ncCapFotos.length){alert("Descreva o problema ou anexe uma foto.");return;}
 const acao=document.getElementById("nc-cap-acao").value.trim();
 const obs=document.getElementById("nc-cap-obs").value.trim();
 const chips=document.getElementById("nc-cap-chips");
 const urg=chips.dataset.urg||"OBSERVACAO";
 const revisar=!texto?true:(ncCapUrgManual?false:chips.dataset.revisar==="1");
 /* consolidação: mesma NC na mesma área vira 1 item com múltiplos pontos */
 const existente=ncItens().find(d=>d.status!=="Resolvida"&&d.area===area);
 if(texto&&existente&&confirm(`Já existe NC aberta em "${area}":\n\n"${existente.texto_bruto}"\n\nAdicionar como novo ponto da mesma NC?`)){
  existente.pontos=existente.pontos||[];existente.pontos.push(texto);
  existente.fotos=(existente.fotos||[]).concat(ncCapFotos);
  if(urg==="URGENTE")existente.urgencia="URGENTE"; /* ponto mais grave puxa a urgência */
  existente.texto_tecnico="";                       /* redação precisa ser regenerada */
  if(acao)existente.acao=[existente.acao,acao].filter(Boolean).join(" ");
  if(obs)existente.obs=[existente.obs,obs].filter(Boolean).join(" ");
  await ncPut(existente);
 }else{
  const o={uid:newUid(),tipo:"nc",criado:"nc",loja:currentStore,piso,area,
   texto_bruto:texto,texto_tecnico:"",pontos:[],urgencia:urg,revisar,acao,obs,
   fotos:ncCapFotos.slice(),status:"Aberta",relato:today(),resolvida_em:null,
   reaberturas:0,atualizacao:today(),mod:nowISO()};
  o.id=await putItem(o);DATA.push(o);dataChanged();
 }
 ncCapFotos=[];ncCapUrgManual=null;
 document.getElementById("nc-cap-texto").value="";
 document.getElementById("nc-cap-acao").value="";
 document.getElementById("nc-cap-obs").value="";
 document.getElementById("nc-cap-thumbs").innerHTML="";
 ncCapRenderChips("OBSERVACAO",false);
 toast("NC registrada ✓");
 ncRenderCards();ncRenderList();
}

/* ---- toolbar de filtros ---- */
async function ncBuildToolbar(areas){
 const pisos=ncPisos(areas);
 document.getElementById("nc-toolbar").innerHTML=`
  <div class="search"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
   <input type="text" id="nc-f-q" data-txt-ph="nc.busca" placeholder="Buscar nas NCs..." oninput="ncF.q=this.value;ncRenderList()"></div>
  <select onchange="ncF.piso=this.value;ncF.area='';ncFillAreaFilter();ncRenderList()"><option value="">Todos os pisos</option>${ncOptions(pisos,ncF.piso)}</select>
  <select id="nc-f-area" onchange="ncF.area=this.value;ncRenderList()"><option value="">Todas as áreas</option>${areas.map(a=>`<option>${esc(a.nome)}</option>`).join("")}</select>
  <button class="filtro-cfg-bt" onclick="ncGerirUrgencias()" title="Configurar as urgências">⚙</button><select onchange="ncF.urg=this.value;ncRenderList()"><option value="">Todas as urgências</option>${ordenarOpc(NC_URG).map(u=>`<option value="${u}">${NC_URG[u].rotulo}</option>`).join("")}</select>
  <select onchange="ncF.status=this.value;ncRenderList()">
   <option value="Abertas">Abertas</option><option value="Resolvidas">Resolvidas</option><option value="Todas">Todas</option></select>`;
}

/* filtro de área acompanha o piso escolhido */
async function ncFillAreaFilter(){
 const sel=document.getElementById("nc-f-area");if(!sel)return;
 const areas=await ncAreas(currentStore);
 const list=ncF.piso?areas.filter(a=>a.piso===ncF.piso):areas;
 sel.innerHTML='<option value="">Todas as áreas</option>'+list.map(a=>`<option>${esc(a.nome)}</option>`).join("");
}

/* ---- lista agrupada por piso → área ---- */
function ncRenderList(){
 const el=document.getElementById("nc-list");if(!el)return;
 const ym=today().slice(0,7);
 let rows=ncItens().filter(d=>{
  if(ncF.status==="Abertas"&&d.status==="Resolvida")return false;
  if(ncF.status==="Resolvidas"&&d.status!=="Resolvida")return false;
  if(ncF.piso&&d.piso!==ncF.piso)return false;
  if(ncF.area&&d.area!==ncF.area)return false;
  if(ncF.urg&&d.urgencia!==ncF.urg)return false;
  if(ncF.q){const q=ncF.q.toLowerCase();
   if(!((d.texto_bruto||"")+" "+(d.texto_tecnico||"")+" "+(d.pontos||[]).join(" ")+" "+(d.area||"")).toLowerCase().includes(q))return false;}
  return true;});
 if(!rows.length){el.innerHTML='<div class="tablewrap"><div class="empty">Nenhuma NC '+(ncF.status==="Resolvidas"?"resolvida":"aberta")+' encontrada. Registre a primeira pelo formulário acima.</div></div>';return;}
 const areas=NC_AREAS[currentStore]||[];
 const ordPiso=ncPisos(areas);
 const ordArea=a=>{const i=areas.findIndex(x=>x.nome===a);return i<0?999:i;};
 /* dentro da área, a ordem que ELA arrastou vence a data (20/07 — esta aba não
    tinha arraste nenhum). O agrupamento por piso → área continua mandando: arrastar
    para outra área mudaria a área da NC, o que não é o que ela quer aqui. */
 rows.sort((a,b)=>ordPiso.indexOf(a.piso)-ordPiso.indexOf(b.piso)||ordArea(a.area)-ordArea(b.area)
   ||((a.ordem??1e9)-(b.ordem??1e9))||(a.relato||"").localeCompare(b.relato||""));
 const nPiso={},nArea={};
 for(const d of rows){nPiso[d.piso]=(nPiso[d.piso]||0)+1;const k=d.piso+"|"+d.area;nArea[k]=(nArea[k]||0)+1;}
 let html="",piso=null,area=null;
 for(const d of rows){
  if(d.piso!==piso){piso=d.piso;area=null;html+=`<div class="nc-piso">${esc(piso||"Sem piso")} <span class="nc-count">${nPiso[d.piso]} NC${nPiso[d.piso]===1?"":"s"}</span></div>`;}
  if(d.area!==area){area=d.area;html+=`<div class="nc-area-h">${esc(area)} <span class="nc-count">${nArea[d.piso+"|"+d.area]}</span></div>`;}
  const meses=ncMeses(d,ym),resolvida=d.status==="Resolvida";
  const badges=(meses>=2&&!resolvida?`<span class="nc-badge reinc">↻ ${ncOrdinal(meses)}</span>`:"")
   +(d.revisar?'<span class="nc-badge warn">⚠ revisar</span>':"")
   +((d.reaberturas||0)>0?`<span class="nc-badge">reaberta ${d.reaberturas}x</span>`:"");
  const pontos=(d.pontos||[]).map(p=>`<div class="nc-ponto">• ${esc(p)}</div>`).join("");
  const fotos=(d.fotos||[]).map((f,i)=>`<img class="nc-mini" src="${f}" onclick="ncVerFoto(${d.id},${i})">`).join("");
  html+=`<div class="nc-item ${resolvida?"done":""}" data-id="${d.id}" data-area="${esc(d.area||"")}">
   <div class="nc-item-top"><span class="nc-alca" title="Segure e arraste para mudar a ordem dentro desta área" onpointerdown="ncArrIni(event,${d.id})">⠿</span>${ncTag(d.urgencia)}${badges}<span class="nc-data">${brDate(d.relato)}${resolvida?" · resolvida em "+brDate(d.resolvida_em):""}</span></div>
   <div class="nc-texto">${esc(d.texto_tecnico||d.texto_bruto||"(sem descrição — ver fotos)")}</div>
   ${pontos}${fotos?`<div class="nc-fotos">${fotos}</div>`:""}
   <div class="nc-acts">
    <button class="btn ghost sm" onclick="anexarNoItem('${d.uid}')" title="Anexar arquivo ou imagem nesta NC">📎</button>
     <button class="btn ghost sm" onclick="ncEditar(${d.id})"><span data-txt="nc.editar">✎ Editar</span></button>
    ${resolvida?`<button class="btn ghost sm" onclick="ncReabrir(${d.id})"><span data-txt="nc.reabrir">↩ Reabrir</span></button>`
     :`<button class="btn sm" onclick="ncResolver(${d.id})"><span data-txt="nc.resolver">✓ Resolver</span></button>`}
    <button class="delbtn" title="Excluir" onclick="removeItem(${d.id})">🗑</button>
   </div></div>`;
 }
 el.innerHTML=html;
}

/* ===== ARRASTE DA ABA DE NC (20/07) — só DENTRO da mesma área =====
   Arrastar para outra área mudaria a área da NC sem ela pedir; para isso existe
   o ✎ Editar. Handlers no DOCUMENT, como no resto do site. */
let NC_ARR=null;
function ncArrIni(ev,id){
  ev.preventDefault();
  const cx=ev.currentTarget.closest(".nc-item");if(!cx)return;
  NC_ARR={id,cx,area:cx.dataset.area};
  cx.classList.add("arrastando");
  document.addEventListener("pointermove",ncArrMove);
  document.addEventListener("pointerup",ncArrFim,{once:true});
  document.addEventListener("pointercancel",ncArrFim,{once:true});
}
function ncArrMove(ev){
  if(!NC_ARR)return;
  /* só troca de lugar com NCs da MESMA área */
  const irmaos=[...document.querySelectorAll('.nc-item[data-area="'+CSS.escape(NC_ARR.area)+'"]')]
    .filter(l=>l!==NC_ARR.cx);
  for(const l of irmaos){
    const r=l.getBoundingClientRect();
    if(ev.clientY>r.top&&ev.clientY<r.bottom){
      const meio=r.top+r.height/2;
      l.parentNode.insertBefore(NC_ARR.cx,ev.clientY<meio?l:l.nextSibling);
      break;
    }
  }
}
async function ncArrFim(){
  document.removeEventListener("pointermove",ncArrMove);
  if(!NC_ARR)return;
  NC_ARR.cx.classList.remove("arrastando");
  const area=NC_ARR.area;NC_ARR=null;
  const ids=[...document.querySelectorAll('.nc-item[data-area="'+CSS.escape(area)+'"]')]
    .map(l=>Number(l.dataset.id)).filter(n=>!isNaN(n));
  const itens=ids.map(i=>DATA.find(d=>d.id===i)).filter(Boolean);
  for(let i=0;i<itens.length;i++){
    if(itens[i].ordem!==i){itens[i].ordem=i;itens[i].mod=nowISO();await putItem(itens[i]);}
  }
  dataChanged();renderNC();toast("Ordem salva ✓");
}

function ncVerFoto(id,i){const d=DATA.find(x=>x.id===id);if(!d)return;
 const w=window.open("");w.document.write(`<body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${d.fotos[i]}" style="max-width:100%;max-height:100vh"></body>`);}

async function ncResolver(id){const d=DATA.find(x=>x.id===id);if(!d)return;
 d.status="Resolvida";d.resolvida_em=today();await ncPut(d);
 toast("NC resolvida ✓");ncRenderCards();ncRenderList();}
async function ncReabrir(id){const d=DATA.find(x=>x.id===id);if(!d)return;
 d.status="Aberta";d.reaberturas=(d.reaberturas||0)+1;d.resolvida_em=null;await ncPut(d);
 toast("NC reaberta");ncRenderCards();ncRenderList();}

/* ---- modal genérico ---- */
function ncModal(html){
 if(window.aplicarTextos)setTimeout(()=>aplicarTextos(document.getElementById("nc-modal")),0);
 let m=document.getElementById("nc-modal");
 if(!m){m=document.createElement("div");m.id="nc-modal";m.className="nc-overlay";
  m.onclick=()=>ncFechar();document.body.appendChild(m);}
 m.innerHTML=`<div class="form-wrap nc-modal-box" onclick="event.stopPropagation()">${html}</div>`;
 m.style.display="flex";
}
function ncFechar(){const m=document.getElementById("nc-modal");if(m)m.style.display="none";}

/* ---- edição ---- */
async function ncEditar(id){
 const d=DATA.find(x=>x.id===id);if(!d)return;
 const areas=await ncAreas(currentStore),pisos=ncPisos(areas);
 const areaOpts=p=>areas.filter(a=>a.piso===p).map(a=>`<option ${a.nome===d.area?"selected":""}>${esc(a.nome)}</option>`).join("");
 ncModal(`
  <h2>Editar NC</h2>
  <div class="grid2">
   <div class="field"><label>Piso</label><select id="nc-e-piso">${ncOptions(pisos,d.piso)}</select></div>
   <div class="field"><label>Área</label><select id="nc-e-area">${areaOpts(d.piso)}</select></div>
  </div>
  <div class="field"><label>Texto bruto (como foi anotado)</label><textarea id="nc-e-bruto">${esc(d.texto_bruto||"")}</textarea></div>
  ${(d.pontos||[]).map((p,i)=>`<div class="field"><label>Ponto extra ${i+1}</label><textarea data-ponto="${i}">${esc(p)}</textarea></div>`).join("")}
  <div class="field"><label>Redação técnica (vai para o relatório)</label><textarea id="nc-e-tec" placeholder="Use o botão abaixo para gerar um rascunho formal...">${esc(d.texto_tecnico||"")}</textarea>
   <button class="btn ghost sm" style="margin-top:6px" onclick="document.getElementById('nc-e-tec').value=ncRedacaoForm()">✨ Gerar redação técnica</button></div>
  <div class="grid2">
   <div class="field"><label>Ação corretiva (aparece com ✔ no relatório)</label><textarea id="nc-e-acao">${esc(d.acao||"")}</textarea></div>
   <div class="field"><label>Observação (aparece com 👁 no relatório)</label><textarea id="nc-e-obs">${esc(d.obs||"")}</textarea></div>
  </div>
  <div class="grid2">
   <div class="field"><label>Urgência</label><select id="nc-e-urg">${ordenarOpc(NC_URG).map(u=>`<option value="${u}" ${u===d.urgencia?"selected":""}>${NC_URG[u].rotulo}</option>`).join("")}</select></div>
   <div class="field"><label>Data do relato</label><input type="date" id="nc-e-relato" value="${d.relato||""}"></div>
  </div>
  <div class="field"><label><input type="checkbox" id="nc-e-rev" ${d.revisar?"checked":""} style="width:auto;margin-right:6px">Marcada para revisão</label></div>
  <div class="field"><label>Fotos</label><div class="nc-thumbs">${(d.fotos||[]).map((f,i)=>`<span class="nc-thumb"><img src="${f}"><button onclick="ncEditRef.fotos.splice(${i},1);ncEditar(${d.id})" title="Remover">×</button></span>`).join("")}</div>
   <input type="file" accept="image/*" capture="environment" multiple onchange="ncEditFoto(event,${d.id})"></div>
  <div class="form-actions">
   <button class="btn" onclick="ncSalvarEdicao(${d.id})">Salvar</button>
   <button class="btn ghost" onclick="ncFechar()">Cancelar</button>
  </div>`);
 ncEditRef=d;
 const pisoSel=document.getElementById("nc-e-piso");
 pisoSel.onchange=()=>{document.getElementById("nc-e-area").innerHTML=areas.filter(a=>a.piso===pisoSel.value).map(a=>`<option>${esc(a.nome)}</option>`).join("");};
}
let ncEditRef=null;
/* rascunho de redação com os valores ATUAIS do formulário de edição */
function ncRedacaoForm(){
 return ncRedacao({
  area:document.getElementById("nc-e-area").value,
  urgencia:document.getElementById("nc-e-urg").value,
  texto_bruto:document.getElementById("nc-e-bruto").value.trim(),
  pontos:[...document.querySelectorAll("#nc-modal [data-ponto]")].map(t=>t.value.trim()).filter(Boolean)
 });
}
async function ncEditFoto(e,id){for(const f of e.target.files)ncEditRef.fotos=(ncEditRef.fotos||[]).concat([await ncComprimir(f)]);ncEditar(id);}
async function ncSalvarEdicao(id){
 const d=DATA.find(x=>x.id===id);if(!d)return;
 d.piso=document.getElementById("nc-e-piso").value;
 d.area=document.getElementById("nc-e-area").value;
 d.texto_bruto=document.getElementById("nc-e-bruto").value.trim();
 d.pontos=[...document.querySelectorAll("#nc-modal [data-ponto]")].map(t=>t.value.trim()).filter(Boolean);
 d.texto_tecnico=document.getElementById("nc-e-tec").value.trim();
 d.acao=document.getElementById("nc-e-acao").value.trim();
 d.obs=document.getElementById("nc-e-obs").value.trim();
 d.urgencia=document.getElementById("nc-e-urg").value;
 d.relato=document.getElementById("nc-e-relato").value||d.relato;
 d.revisar=document.getElementById("nc-e-rev").checked;
 await ncPut(d);ncFechar();toast("NC atualizada ✓");ncRenderCards();ncRenderList();
}

/* ---- gestão de áreas ---- */
async function ncGerirAreas(){
 const areas=await ncAreas(currentStore),pisos=ncPisos(areas);
 const porPiso=pisos.map(p=>`<div class="nc-piso">${esc(p)}</div>`+areas.map((a,i)=>({a,i})).filter(x=>x.a.piso===p).map(({a,i})=>
  `<div class="nc-area-row"><span>${a.n?a.n+". ":""}${esc(a.nome)}</span>
   <span><button class="btn ghost sm" onclick="ncRenomearArea(${i})">✎</button>
   <button class="btn ghost sm" onclick="ncRemoverArea(${i})">🗑</button></span></div>`).join("")).join("");
 ncModal(`
  <h2>🗂 Áreas de ${esc(currentStoreName)}</h2>
  <p class="desc">${areas.length} área${areas.length===1?"":"s"} cadastrada${areas.length===1?"":"s"}. Mesmas regras para toda empresa, áreas próprias de cada uma.</p>
  ${porPiso||'<p class="desc">Nenhuma área ainda.</p>'}
  <div class="grid2" style="margin-top:14px">
   <div class="field"><label>Nova área</label><input id="nc-a-nome" placeholder="Ex.: Padaria"></div>
   <div class="field"><label>Piso</label><input id="nc-a-piso" list="nc-pisos-list" placeholder="Ex.: 1º Piso — Parte Central">
    <datalist id="nc-pisos-list">${pisos.map(p=>`<option value="${esc(p)}">`).join("")}</datalist></div>
  </div>
  <div class="form-actions">
   <button class="btn" onclick="ncAddArea()">Adicionar área</button>
   <button class="btn ghost" onclick="ncFechar()">Fechar</button>
  </div>`);
}
async function ncAddArea(){
 const nome=document.getElementById("nc-a-nome").value.trim();
 const piso=document.getElementById("nc-a-piso").value.trim();
 if(!nome||!piso){alert("Preencha o nome da área e o piso.");return;}
 const areas=await ncAreas(currentStore);
 if(areas.some(a=>a.nome.toLowerCase()===nome.toLowerCase())){alert("Essa área já existe.");return;}
 areas.push({n:areas.length+1,nome,piso});
 await ncSaveAreas(currentStore);
 toast("Área adicionada ✓");ncGerirAreas();
 const wrap=document.getElementById("tab-nc");wrap.dataset.store="";renderNC();
}
async function ncRenomearArea(i){
 const areas=await ncAreas(currentStore);const a=areas[i];if(!a)return;
 const novo=prompt("Novo nome para a área:",a.nome);if(!novo||!novo.trim())return;
 const antigo=a.nome;a.nome=novo.trim();
 for(const d of DATA)if(d.tipo==="nc"&&d.loja===currentStore&&d.area===antigo){d.area=a.nome;d.mod=nowISO();await putItem(d);}
 await ncSaveAreas(currentStore);
 toast("Área renomeada ✓");ncGerirAreas();
 const wrap=document.getElementById("tab-nc");wrap.dataset.store="";renderNC();
}
async function ncRemoverArea(i){
 const areas=await ncAreas(currentStore);const a=areas[i];if(!a)return;
 if(DATA.some(d=>!d.deleted&&d.tipo==="nc"&&d.loja===currentStore&&d.area===a.nome)){
  alert("Há NCs registradas nessa área — não é possível excluí-la.");return;}
 if(!confirm("Excluir a área \""+a.nome+"\"?"))return;
 NC_AREAS[currentStore]=areas.filter((_,j)=>j!==i);
 await ncSaveAreas(currentStore);
 toast("Área excluída");ncGerirAreas();
 const wrap=document.getElementById("tab-nc");wrap.dataset.store="";renderNC();
}

/* ---- relatório mensal (1 documento por empresa) ---- */
function ncRelatorio(){
 ncModal(`
  <h2>📄 Relatório mensal — ${esc(currentStoreName)}</h2>
  <p class="desc">Um documento por empresa, com tabela por urgência, reincidências, fotos e conclusão técnica.</p>
  <div class="field"><label>Mês do relatório</label><input type="month" id="nc-r-mes" value="${today().slice(0,7)}"></div>
  <div class="form-actions" style="flex-wrap:wrap">
   <button class="btn" onclick="ncRelatorioDocx()">⬇ Word (.docx)</button>
   <button class="btn ghost" onclick="ncRelatorioPrint()">🖨 Imprimir / PDF</button>
   <button class="btn ghost" onclick="ncFechar()">Fechar</button>
  </div>`);
}
function ncDadosRelatorio(ym){
 const it=ncItens();
 const abertas=it.filter(d=>d.status!=="Resolvida"&&(d.relato||"").slice(0,7)<=ym);
 const resolvidas=it.filter(d=>d.status==="Resolvida"&&(d.resolvida_em||"").startsWith(ym));
 const ordU={URGENTE:0,ATENCAO:1,OBSERVACAO:2};
 abertas.sort((a,b)=>ordU[a.urgencia]-ordU[b.urgencia]||(a.piso||"").localeCompare(b.piso||"")||(a.area||"").localeCompare(b.area||""));
 return {abertas,resolvidas,
  cont:u=>abertas.filter(d=>d.urgencia===u).length,
  reinc:abertas.filter(d=>ncMeses(d,ym)>=2).length};
}
function ncTextoRelatorio(d){return d.texto_tecnico||ncRedacao(d);}
/* problema e ação separados (design aprovado 19/07: piso→área, urgente em
   vermelho sem rótulo, ✔ ação corretiva, 👁 observação) */
function ncRelProblema(d){
 if(d.texto_tecnico)return d.texto_tecnico;
 const pts=[d.texto_bruto,...(d.pontos||[])].filter(Boolean)
  .map(t=>t.trim().replace(/\s+/g," ").replace(/[.;\s]+$/,""))
  .map(t=>t.charAt(0).toUpperCase()+t.slice(1));
 return pts.length?pts.join("; ")+".":"(sem descrição — ver fotos)";
}
function ncRelAcao(d){
 return d.acao||({URGENTE:"Correção imediata, com prioridade sobre as demais pendências.",
  ATENCAO:"Correção no curto prazo.",
  OBSERVACAO:"Adequação na rotina de manutenção e higienização."}[d.urgencia]||"Ação corretiva a definir.");
}
/* abertas na ordem oficial das áreas: piso → área (como na lista da aba) */
async function ncRelOrdenar(lista){
 const areas=await ncAreas(currentStore),ordPiso=ncPisos(areas);
 const pIdx=p=>{const i=ordPiso.indexOf(p);return i<0?999:i;};
 const aIdx=a=>{const i=areas.findIndex(x=>x.nome===a);return i<0?999:i;};
 const ordU={URGENTE:0,ATENCAO:1,OBSERVACAO:2};
 lista.sort((a,b)=>pIdx(a.piso)-pIdx(b.piso)||aIdx(a.area)-aIdx(b.area)||ordU[a.urgencia]-ordU[b.urgencia]||(a.relato||"").localeCompare(b.relato||""));
 return lista;
}
function ncConclusao(r,ym){
 const tot=r.abertas.length;
 return `No período de referência, permanecem em aberto ${tot} não conformidade${tot===1?"":"s"} `+
  `(${r.cont("URGENTE")} urgente${r.cont("URGENTE")===1?"":"s"} e ${r.cont("OBSERVACAO")+r.cont("ATENCAO")} em observação)`+
  `${r.reinc?`, das quais ${r.reinc} ${r.reinc===1?"é reincidente":"são reincidentes"} de meses anteriores`:""}. `+
  `${r.resolvidas.length?`Foram concluídas ${r.resolvidas.length} correç${r.resolvidas.length===1?"ão":"ões"} no mês. `:""}`+
  `Recomenda-se priorizar os itens destacados em vermelho (urgentes), com acompanhamento contínuo das demais pendências pela responsável técnica.`;
}
const NC_MESES_NOME=["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
function ncTituloMes(ym){return NC_MESES_NOME[+ym.slice(5,7)-1]+" de "+ym.slice(0,4);}

async function ncRelatorioPrint(){
 const ym=document.getElementById("nc-r-mes").value||today().slice(0,7);
 const r=ncDadosRelatorio(ym);
 const rt=(typeof RT_INFO!=="undefined"&&RT_INFO)||RT_DEFAULT;   /* o banner da RT saiu do HTML em 19/07 */
 await ncRelOrdenar(r.abertas);
 let corpo="",piso=null,area=null;
 for(const d of r.abertas){
  if(d.piso!==piso){piso=d.piso;area=null;corpo+=`<div class="piso">${esc(piso||"Sem piso")}</div>`;}
  if(d.area!==area){area=d.area;corpo+=`<div class="area">${esc(area)}</div>`;}
  const m=ncMeses(d,ym),urg=d.urgencia==="URGENTE";
  corpo+=`<div class="card ${urg?"urg":""}">
   <p class="prob">${esc(ncRelProblema(d))}</p>
   <div class="acao">${esc(ncRelAcao(d))}</div>
   ${d.obs?`<div class="obsline">${esc(d.obs)}</div>`:""}
   ${m>=2?`<span class="rei">Reincidente — ${ncOrdinal(m)}</span>`:""}
   ${(d.fotos||[]).length?`<div>${d.fotos.map(f=>`<img src="${f}">`).join("")}</div>`:""}
  </div>`;
 }
 const res=r.resolvidas.map(d=>`<li><b>${esc(d.area)}</b>: ${esc(ncTextoRelatorio(d))} <span class="mut">(resolvida em ${brDate(d.resolvida_em)})</span></li>`).join("");
 const w=window.open("");
 w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório NC ${esc(currentStoreName)} — ${ncTituloMes(ym)}</title>
 <style>body{font-family:"Segoe UI",Calibri,Arial,sans-serif;color:#222;max-width:820px;margin:0 auto;padding:0 16px 32px;font-size:14px;line-height:1.5}
 .cab{background:#1d6b57;color:#fff;margin:0 -16px 20px;padding:24px 24px}
 .cab h1{margin:0;font-size:20px;font-weight:600}
 .cab .sub{opacity:.88;font-size:12.5px;margin-top:5px}
 .mut{color:#888;font-size:12px}
 .kpis{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:4px}
 .kpi{flex:1;min-width:100px;border-radius:10px;padding:12px 10px;text-align:center}
 .kpi .n{font-size:26px;font-weight:700}
 .kpi .l{font-size:10.5px;font-weight:600;letter-spacing:.6px;text-transform:uppercase}
 .k-tot{background:#eef0ee;color:#555}.k-urg{background:#fdecea;color:#c0392b}
 .k-rei{background:#fdf4e3;color:#9a6b1f}.k-ok{background:#e3f1ec;color:#1d6b57}
 .piso{margin:24px 0 4px;font-size:15px;font-weight:700;color:#1d6b57;border-bottom:2px solid #1d6b57;padding-bottom:5px}
 .area{margin:13px 0 2px;font-size:13.5px;font-weight:700;color:#333}
 .card{border:1px solid #e2e7e3;border-left:4px solid #cfd8d2;border-radius:10px;padding:11px 14px;margin:7px 0;page-break-inside:avoid}
 .card.urg{border-left-color:#c0392b;background:#fffbfa}
 .card .prob{margin:0;color:#333}
 .card.urg .prob{color:#c0392b;font-weight:600}
 .acao{margin:8px 0 0;background:#f3f7f4;border-radius:8px;padding:8px 10px;color:#1d5245}
 .acao::before{content:"✔ ";color:#1d6b57;font-weight:700}
 .obsline{margin:8px 0 0;background:#fdf4e3;border-radius:8px;padding:8px 10px;color:#7a561a;font-size:13px}
 .obsline::before{content:"👁 "}
 .rei{display:inline-block;margin-top:8px;font-size:11px;font-weight:700;color:#9a6b1f;background:#fdf4e3;border-radius:10px;padding:2px 10px}
 .card img{max-width:220px;max-height:160px;margin:8px 6px 0 0;border:1px solid #ddd;border-radius:6px;vertical-align:top}
 h2{font-size:14px;margin:24px 0 8px;color:#1d6b57}
 .concl{background:#f3f7f4;border-radius:10px;padding:13px 16px}
 .ass{margin-top:40px;font-size:13px}
 .ass .linha{border-top:1px solid #333;width:280px;margin-bottom:4px}
 .noprint{position:fixed;top:10px;right:10px}
 @media print{.noprint{display:none}.cab{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>
 <button class="noprint" onclick="print()" style="padding:8px 14px;cursor:pointer">🖨 Imprimir / Salvar PDF</button>
 <div class="cab"><h1>Relatório de Não Conformidades</h1>
  <div class="sub">${esc(currentStoreName)} (${esc(currentStore)}) · ${ncTituloMes(ym)} · Emitido em ${brDate(today())}<br>${esc(rt)}</div></div>
 <div class="kpis">
  <div class="kpi k-tot"><div class="n">${r.abertas.length}</div><div class="l">Em aberto</div></div>
  <div class="kpi k-urg"><div class="n">${r.cont("URGENTE")}</div><div class="l">Urgentes</div></div>
  <div class="kpi k-rei"><div class="n">${r.reinc}</div><div class="l">Reincidentes</div></div>
  <div class="kpi k-ok"><div class="n">${r.resolvidas.length}</div><div class="l">Resolvidas</div></div>
 </div>
 ${corpo||'<p class="mut">Nenhuma não conformidade em aberto.</p>'}
 ${res?`<h2>Resolvidas no mês</h2><ul>${res}</ul>`:""}
 <h2>Conclusão técnica</h2><div class="concl">${esc(ncConclusao(r,ym))}</div>
 <div class="ass"><div class="linha"></div>${esc(rt)}</div>
 </body></html>`);
 w.document.close();
}

async function ncRelatorioDocx(){
 const ym=document.getElementById("nc-r-mes").value||today().slice(0,7);
 const r=ncDadosRelatorio(ym);
 const rt=(typeof RT_INFO!=="undefined"&&RT_INFO)||RT_DEFAULT;   /* o banner da RT saiu do HTML em 19/07 */
 const doc=new DocxLite();
 doc.p("Relatório de Não Conformidades — "+currentStoreName+" ("+currentStore+")",{bold:true,size:32});
 doc.p("Referência: "+ncTituloMes(ym)+" · Emitido em "+brDate(today())+" · "+rt,{color:"777777",size:20});
 doc.p("");
 doc.p("Resumo",{bold:true,size:26});
 doc.table([
  [{text:"Em aberto",bold:true,fill:"EEF0EE",color:"555555"},
   {text:"Urgentes",bold:true,fill:"FDECEA",color:"C0392B"},
   {text:"Reincidentes",bold:true,fill:"FDF4E3",color:"9A6B1F"},
   {text:"Resolvidas",bold:true,fill:"E3F1EC",color:"1D6B57"}],
  [{text:String(r.abertas.length)},{text:String(r.cont("URGENTE"))},
   {text:String(r.reinc)},{text:String(r.resolvidas.length)}]]);
 doc.p("");
 if(!r.abertas.length)doc.p("Nenhuma não conformidade em aberto.",{color:"777777"});
 await ncRelOrdenar(r.abertas);
 let piso=null,area=null;
 for(const d of r.abertas){
  if(d.piso!==piso){piso=d.piso;area=null;doc.p("");doc.p((piso||"Sem piso").toUpperCase(),{bold:true,size:26,color:"1D6B57"});}
  if(d.area!==area){area=d.area;doc.p(area,{bold:true,size:23});}
  const m=ncMeses(d,ym),urg=d.urgencia==="URGENTE";
  doc.p(ncRelProblema(d),urg?{bold:true,color:"C0392B"}:{});
  doc.p("✔ Ação corretiva: "+ncRelAcao(d),{color:"1D6B57"});
  if(d.obs)doc.p("👁 Observação: "+d.obs,{color:"9A6B1F"});
  if(m>=2)doc.p("Reincidente — "+ncOrdinal(m),{bold:true,color:"9A6B1F",size:18});
  for(const f of (d.fotos||[]))await doc.image(f,{maxWidthPx:340});
  doc.p("");
 }
 if(r.resolvidas.length){
  doc.p("Resolvidas no mês",{bold:true,size:26});
  for(const d of r.resolvidas)doc.p("• "+d.area+": "+ncTextoRelatorio(d)+" (resolvida em "+brDate(d.resolvida_em)+")");
  doc.p("");
 }
 doc.p("Conclusão técnica",{bold:true,size:26});
 doc.p(ncConclusao(r,ym));
 doc.p("");doc.p("");
 doc.p("_______________________________");
 doc.p(rt);
 const blob=await doc.blob();
 download("relatorio_nc_"+currentStore+"_"+ym+".docx",blob,"application/vnd.openxmlformats-officedocument.wordprocessingml.document");
 toast("Relatório Word gerado ✓");
}

/* ---- CSV próprio da aba (usado no export manual e no backup automático) ---- */
function ncBuildCSV(){
 const itens=DATA.filter(d=>!d.deleted&&d.tipo==="nc");
 if(!itens.length)return null;
 const ym=today().slice(0,7);
 const head=["Empresa","Piso","Área","Texto bruto","Redação técnica","Urgência","Status","Reincidência","Revisar","Relato","Resolvida em"];
 const rows=itens.map(d=>[d.loja,d.piso,d.area,[d.texto_bruto,...(d.pontos||[])].filter(Boolean).join(" | "),
  d.texto_tecnico,NC_URG[d.urgencia]?NC_URG[d.urgencia].rotulo:d.urgencia,d.status,
  d.status!=="Resolvida"&&ncMeses(d,ym)>=2?ncOrdinal(ncMeses(d,ym)):"",d.revisar?"sim":"",
  brDate(d.relato),brDate(d.resolvida_em)]);
 return [head,...rows].map(r=>r.map(c=>'"'+String(c==null?"":c).replace(/"/g,'""')+'"').join(";")).join("\r\n");
}
function ncExportCSV(){
 const csv=ncBuildCSV();
 /* nome antigo "gestao_nc.csv" ficou para trás — ela reparou que os arquivos
    mentiam o conteúdo (20/07). Segue o nome que ELA deu à aba. */
 if(csv)download((typeof rotuloAba==="function"?rotuloAba("nc"):"Relatorio de Nao Conformidade")
   +(typeof selo==="function"?" - "+selo():"")+".csv","﻿"+csv,"text/csv");
}
