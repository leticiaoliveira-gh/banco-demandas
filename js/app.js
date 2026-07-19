const RT_DEFAULT="[nome-removido] (Nutricionista de Produção – RT)";

/* ===== Empresas dinâmicas (gerenciáveis pela Central de Empresas) ===== */
let EMPRESAS=[],EMPRESAS_MOD="";
async function loadEmpresas(){
 EMPRESAS_MOD=await metaGet("empresasMod")||"";
 let v=await metaGet("empresas");
 if(!v||!Array.isArray(v)||!v.length){
   /* migração: semeia das 2 lojas originais preservando os flags legados active_* */
   v=[];
   for(const s of [{code:"CF",name:"[loja-A]"},{code:"AC",name:"[loja-B]"}]){
     const act=await metaGet("active_"+s.code);
     v.push({code:s.code,name:s.name,ativa:act===null?true:!!act});
   }
   await metaSet("empresas",v);
 }
 EMPRESAS=v;
 /* pedido de 17/07: nomes completos com a rede (só uma vez; ela pode ajustar no ✎) */
 if(!(await metaGet("mig_nome_rede"))){
   let mudou=false;
   for(const e of EMPRESAS){
     if(e.name==="[loja-A]"){e.name="[loja-A] · [rede-removida]";mudou=true;}
     if(e.name==="[loja-B]"){e.name="[loja-B] · [rede-removida]";mudou=true;}
   }
   if(mudou){EMPRESAS_MOD=nowISO();await metaSet("empresas",EMPRESAS);await metaSet("empresasMod",EMPRESAS_MOD);}
   await metaSet("mig_nome_rede",true);
 }
}
/* botão ▶ Iniciar da capa: entra direto na (única) empresa ativa */
function iniciarCentral(){
 const ativas=EMPRESAS.filter(e=>e.ativa);
 if(ativas.length===1){enterStore(ativas[0].code);return;}
 if(!ativas.length){toast("Ative a empresa em que você está para começar");return;}
 toast("Deixe ativa só a empresa em que você está — aí o ▶ Iniciar entra direto nela");
}
/* linha da Responsável Técnica na capa (editável; entra no backup e na sincronização) */
let RT_INFO="",RT_INFO_MOD="";
async function loadRtInfo(){RT_INFO=await metaGet("rtInfo")||"";RT_INFO_MOD=await metaGet("rtInfoMod")||"";}
function renderRtInfo(){
 const el=document.getElementById("rt-linha");
 if(el)el.textContent="👩‍⚕️ "+(RT_INFO||"[nome-removido] (Nutricionista de Produção – RT) · CRN: toque p/ preencher")+"  ✎";
}
async function editarRtInfo(){
 const v=prompt("Informações da Responsável Técnica (aparecem na capa):",RT_INFO||"[nome-removido] (Nutricionista de Produção – RT) · CRN: ");
 if(v===null)return;
 RT_INFO=v.trim();RT_INFO_MOD=nowISO();
 await metaSet("rtInfo",RT_INFO);await metaSet("rtInfoMod",RT_INFO_MOD);
 dataChanged();renderRtInfo();toast("Atualizado ✓");
}
function empresa(code){return EMPRESAS.find(e=>e.code===code);}
async function saveEmpresas(){EMPRESAS_MOD=nowISO();await metaSet("empresas",EMPRESAS);await metaSet("empresasMod",EMPRESAS_MOD);dataChanged();}

/* ===== Áreas por empresa na SINCRONIZAÇÃO (espelho do meta areas_<code>) ===== */
let AREAS_ALL={},AREAS_MOD="";
async function loadAreasAll(){
 AREAS_MOD=await metaGet("areasMod")||"";
 AREAS_ALL={};
 for(const e of EMPRESAS){const v=await metaGet("areas_"+e.code);if(Array.isArray(v))AREAS_ALL[e.code]=v;}
}

/* ===== Pendências de configuração (checklist "onde a conversa parou") =====
   Lista em tópicos exibida na capa; entra no backup e na sincronização. */
let PENDENCIAS=[],PENDENCIAS_MOD="";
/* status.json — "onde paramos", atualizado a cada publicação; o site lê sozinho ao abrir */
let STATUS_SITE=null;
async function loadStatusSite(){
 try{
   const r=await fetch("status.json?ts="+Date.now(),{cache:"no-store"});
   if(r.ok)STATUS_SITE=await r.json();
 }catch(e){}
}
const PENDENCIAS_INICIAIS=[
 "Extrair os registros de NC do banco do Lenovo e importar no site (pauta das 18h)",
 "Colar o arquivo [modulo-privado] para deixar as urgências iguais às do bot (no Lenovo)",
 "Cadastrar as áreas de [loja-A] na aba NP · Gestão de NC (botão 🗂 Áreas)",
 "Conferir os backups exportados no Lenovo e no Samsung (18h)",
 "Transferir as configurações do Lenovo para o Samsung (18h)",
 "Montar as configurações atreladas ao login (nomes em português, markitdown etc.) (18h)",
 "Ativar o backup automático no Lenovo e no Samsung (capa → card do backup)",
 "Configurar a sincronização entre dispositivos (repo privado + token)",
 "Confirmar o formato da aba Demandas Gerais no uso"
];
async function loadPendencias(){
 PENDENCIAS_MOD=await metaGet("pendenciasMod")||"";
 let v=await metaGet("pendencias");
 if(!v||!Array.isArray(v)){
   v=PENDENCIAS_INICIAIS.map(t=>({uid:newUid(),texto:t,feita:false}));
   PENDENCIAS_MOD=nowISO();
   await metaSet("pendencias",v);await metaSet("pendenciasMod",PENDENCIAS_MOD);
 }
 PENDENCIAS=v;
}
async function savePendencias(){PENDENCIAS_MOD=nowISO();await metaSet("pendencias",PENDENCIAS);await metaSet("pendenciasMod",PENDENCIAS_MOD);dataChanged();}
function gerirPendencias(){
 const linhas=PENDENCIAS.map((p,i)=>
  `<div class="nc-area-row"><label style="display:flex;gap:9px;align-items:flex-start;cursor:pointer;font-weight:400;flex:1">
    <input type="checkbox" ${p.feita?"checked":""} style="width:auto;margin-top:3px" onchange="togglePendencia(${i},this.checked)">
    <span style="${p.feita?"text-decoration:line-through;color:var(--muted)":""}">${esc(p.texto)}</span></label>
   <button class="btn ghost sm" onclick="removePendencia(${i})">🗑</button></div>`).join("");
 ncModal(`
  <h2>📋 Pendências de configuração</h2>
  <p class="desc">Tudo que ainda falta resolver no site, em tópicos — marque quando concluir. A lista entra no backup e na sincronização.</p>
  ${linhas||'<p class="desc">Nenhuma pendência — tudo resolvido ✓</p>'}
  <div class="field" style="margin-top:14px"><label>Nova pendência</label><input id="pend-nova" placeholder="Descreva o que falta resolver..."></div>
  <div class="form-actions">
   <button class="btn" onclick="addPendencia()">Adicionar</button>
   <button class="btn ghost" onclick="ncFechar()">Fechar</button>
  </div>`);
}
async function togglePendencia(i,val){if(!PENDENCIAS[i])return;PENDENCIAS[i].feita=!!val;await savePendencias();gerirPendencias();renderHome();}
async function addPendencia(){
 const t=document.getElementById("pend-nova").value.trim();if(!t)return;
 PENDENCIAS.push({uid:newUid(),texto:t,feita:false});
 await savePendencias();gerirPendencias();renderHome();toast("Pendência adicionada ✓");}
async function removePendencia(i){
 if(!PENDENCIAS[i])return;
 if(!confirm("Excluir esta pendência?\n\n"+PENDENCIAS[i].texto))return;
 PENDENCIAS.splice(i,1);await savePendencias();gerirPendencias();renderHome();}

/* ===== Executores gerenciáveis (lista única para todas as empresas) ===== */
let EXECUTORES=[];
async function loadExecutores(){
 let v=await metaGet("executores");
 if(!v||!Array.isArray(v)||!v.length){
   v=[{nome:"[executor-removido]",funcao:"Manutenção"},{nome:"[executor-removido]",funcao:"Elétrica"}];
   await metaSet("executores",v);
 }
 EXECUTORES=v;
}
async function saveExecutores(){await metaSet("executores",EXECUTORES);dataChanged();}
function execOptionsHTML(sel){
 const extra=sel&&sel!=="Outro"&&!EXECUTORES.some(e=>e.nome===sel)?`<option selected>${esc(sel)}</option>`:"";
 return extra+EXECUTORES.map(e=>`<option value="${esc(e.nome)}" ${e.nome===sel?"selected":""}>${esc(e.nome)}</option>`).join("")
  +`<option ${sel==="Outro"?"selected":""}>Outro</option>`;
}
function fillExecSelects(){
 const f=document.getElementById("fExec"),cur=f.value;
 f.innerHTML='<option value="">Todos os responsáveis</option>'
  +EXECUTORES.map(e=>`<option value="${esc(e.nome)}">${esc(e.nome)} (${esc(e.funcao)})</option>`).join("")
  +'<option value="Outro">Outro</option>';
 if([...f.options].some(o=>o.value===cur))f.value=cur;
 const m=document.getElementById("fmExec"),cm=m.value;
 m.innerHTML=EXECUTORES.map(e=>`<option value="${esc(e.nome)}">${esc(e.nome)} (${esc(e.funcao)})</option>`).join("")+'<option>Outro</option>';
 if([...m.options].some(o=>o.value===cm))m.value=cm;
}
async function gerirExecutores(){
 const linhas=EXECUTORES.map((e,i)=>
  `<div class="nc-area-row"><span>${esc(e.nome)} <span style="color:var(--muted)">(${esc(e.funcao)})</span></span>
   <span><button class="btn ghost sm" onclick="renameExecutor(${i})">✎</button>
   <button class="btn ghost sm" onclick="removeExecutor(${i})">🗑</button></span></div>`).join("");
 ncModal(`
  <h2>👷 Executores</h2>
  <p class="desc">Lista única, usada nas duas empresas. "Outro" está sempre disponível.</p>
  ${linhas||'<p class="desc">Nenhum executor.</p>'}
  <div class="grid2" style="margin-top:14px">
   <div class="field"><label>Nome</label><input id="ex-nome" placeholder="Ex.: Carlos"></div>
   <div class="field"><label>Função</label><input id="ex-funcao" placeholder="Ex.: Refrigeração"></div>
  </div>
  <div class="form-actions">
   <button class="btn" onclick="addExecutor()">Adicionar executor</button>
   <button class="btn ghost" onclick="ncFechar()">Fechar</button>
  </div>`);
}
async function addExecutor(){
 const nome=document.getElementById("ex-nome").value.trim();
 const funcao=document.getElementById("ex-funcao").value.trim()||"Geral";
 if(!nome){alert("Preencha o nome.");return;}
 if(EXECUTORES.some(e=>e.nome.toLowerCase()===nome.toLowerCase())||nome==="Outro"){alert("Esse executor já existe.");return;}
 EXECUTORES.push({nome,funcao});
 await saveExecutores();fillExecSelects();toast("Executor adicionado ✓");gerirExecutores();render();
}
async function renameExecutor(i){
 const e=EXECUTORES[i];if(!e)return;
 const novo=prompt("Novo nome para "+e.nome+":",e.nome);if(!novo||!novo.trim())return;
 const antigo=e.nome;e.nome=novo.trim();
 for(const d of DATA)if(d.executor===antigo){d.executor=e.nome;d.mod=nowISO();await putItem(d);}
 await saveExecutores();fillExecSelects();toast("Executor renomeado ✓");gerirExecutores();render();
}
async function removeExecutor(i){
 const e=EXECUTORES[i];if(!e)return;
 if(DATA.some(d=>!d.deleted&&d.executor===e.nome)){
  alert("Há itens atribuídos a "+e.nome+". Reatribua os itens antes de excluir.");return;}
 if(!confirm("Excluir o executor "+e.nome+"?"))return;
 EXECUTORES=EXECUTORES.filter((_,j)=>j!==i);
 await saveExecutores();fillExecSelects();toast("Executor excluído");gerirExecutores();render();
}

/* Tipos de item (rótulos usados no export e nos filtros) */
const TIPOS={dg:"Demandas Gerais",nc:"Relatório de Não Conformidade - Gerência",mnt:"Manutenções e Elétrica"};
let currentTipo="dg";
let currentTab="dg";
let currentStore=null,currentStoreName="";

/* ===== Ícones das abas (SVG: herdam a cor da aba via currentColor) ===== */
const ICO={
  dg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z"/><rect x="4" y="6" width="16" height="15" rx="2"/><path d="M9 12h7M9 16h5"/></svg>',
  nc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 11v4M12 18h.01"/></svg>',
  mnt:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 1-5 5L4 17v3h3l5.7-5.7a4 4 0 0 1 5-5l-2.5 2.5 1.8 1.8L19.5 11a4 4 0 0 0-4.8-4.7z"/></svg>',
  add:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  hub:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>'
};
/* ===== Registro de abas =====
   Cada aba é um "projeto" independente: painel, subtítulo, cards e regras próprios.
   Para criar uma aba nova: 1 entrada aqui + em TAB_ORDER + um <div class="tab-panel"> no HTML.
   FONTE ÚNICA: hub, barra lateral, barra do celular, abas de texto e a busca Ctrl+K
   são todos gerados de TAB_ORDER — nunca escrever uma lista de abas em outro lugar.
   Campos visuais: icone (SVG), cor (cor forte), corFundo (pastel), hub (aparece no hub?). */
const TAB_ORDER=["dg","nc","list","add"];
const TABS={
  dg:{label:"Demandas Gerais",tipo:"dg",panel:"tab-list",
      icone:ICO.dg,cor:"#1d6b57",corFundo:"#e8f4ef",hub:true,
      subtitle:n=>"Demandas gerais da unidade — "+n,
      onShow(){configTableTab("dg");}},
  nc:{label:"Relatório de Não Conformidade - Gerência",tipo:"nc",panel:"tab-nc",
      icone:ICO.nc,cor:"#1668b8",corFundo:"#e7f0f9",hub:true,
      subtitle:n=>"Relatório de Não Conformidade — Gerência — "+n,
      onShow(){renderNC();}},
  list:{label:"Manutenções e Elétrica",tipo:"mnt",panel:"tab-list",
      icone:ICO.mnt,cor:"#b3730a",corFundo:"#fdf0e0",hub:true,
      subtitle:n=>(EXECUTORES.length?EXECUTORES.map(e=>e.funcao+" ("+e.nome+")").join(" e "):"Manutenções e Elétrica")+" — "+n,
      onShow(){configTableTab("mnt");}},
  add:{label:"Adicionar Manualmente",tipo:null,panel:"tab-add",
      icone:ICO.add,cor:"#8a8b96",corFundo:"#f1f1f3",hub:false,
      subtitle:n=>"Cadastro manual de itens — "+n,
      onShow(){configAddTab();}}
};
const ABAS_HUB=()=>TAB_ORDER.filter(t=>TABS[t].hub);
function renderTabs(){
  document.getElementById("tabs").innerHTML=ABAS_HUB().map(t=>
    `<div class="tab${t===currentTab?" active":""}" data-tab="${t}" onclick="showTab('${t}')">${TABS[t].label}</div>`).join("");
  renderRailTabs();renderMobileNav();
}
/* ===== Hub de cards (porta de entrada da empresa) ===== */
function renderHub(){
  const box=document.getElementById("hub-grid");if(!box)return;
  box.innerHTML=ABAS_HUB().map(t=>{const a=TABS[t];
    return `<button class="hub-card" data-hub="${t}" style="background:${a.corFundo};color:${a.cor}" onclick="showTab('${t}')" title="${esc(a.label)}">
      <span class="bar" style="background:${a.cor}"></span>
      <span class="ico">${a.icone}</span>
      <span class="nm">${esc(a.label)}</span></button>`;}).join("");
}
function showHub(){
  if(!currentStore)return goHome();
  document.querySelectorAll(".tab-panel").forEach(p=>p.style.display="none");
  document.getElementById("view-hub").style.display="block";
  document.getElementById("cards").style.display="none";
  document.getElementById("tabs").style.display="none";
  currentTab=null;
  document.getElementById("appSubtitle").textContent="Escolha por onde começar — "+currentStoreName;
  renderHub();renderBreadcrumb();syncNav();window.scrollTo(0,0);
}
/* ===== Navegação permanente (barra lateral + barra do celular) ===== */
function navItemHTML(t){const a=TABS[t];
  return `<button class="ricon nav-item" data-tab="${t}" style="color:${a.cor}" title="${esc(a.label)}" aria-label="${esc(a.label)}" onclick="showTab('${t}')">${a.icone}</button>`;}
function renderRailTabs(){const b=document.getElementById("railTabs");if(b)b.innerHTML=TAB_ORDER.map(navItemHTML).join("");}
function renderMobileNav(){const b=document.getElementById("mobileNav");
  if(b)b.innerHTML=`<button class="ricon nav-item" title="Hub da empresa" aria-label="Hub da empresa" onclick="showHub()">${ICO.hub}</button>`+TAB_ORDER.map(navItemHTML).join("");}
/* destaque da aba atual — única função que marca "active" em TODAS as navegações */
function syncNav(){
  document.querySelectorAll("[data-tab]").forEach(el=>{
    const on=el.dataset.tab===currentTab;
    el.classList.toggle("active",on);
    if(on)el.setAttribute("aria-current","page");else el.removeAttribute("aria-current");
  });
}
function renderBreadcrumb(){
  const c=document.getElementById("crumb");if(!c)return;
  const aba=currentTab&&TABS[currentTab]?` › <b>${esc(TABS[currentTab].label)}</b>`:" › <b>Início</b>";
  c.innerHTML=`<span onclick="goHome()" title="Voltar à Central de Empresas">Capa</span> › <span onclick="showHub()" title="Voltar ao início desta empresa">${esc(currentStoreName||"Empresa")}</span>${aba}`;
}
function updateSubtitle(t){document.getElementById("appSubtitle").textContent=(TABS[t]||TABS.dg).subtitle(currentStoreName);}

/* Status por tipo de aba — a aba NC ganha vocabulário próprio na Fase 3 */
const STATUS_FNS={
  default:{isPend:d=>d.status==="Pendente",isDone:d=>d.status==="Concluído"}
};
function isPendente(d){return !d.deleted&&((STATUS_FNS[d.tipo]||STATUS_FNS.default).isPend)(d);}
function isConcluido(d){return !d.deleted&&((STATUS_FNS[d.tipo]||STATUS_FNS.default).isDone)(d);}
let db,DATA=[];const DB_NAME="banco_nc_v3_base",STORE="itens";
const today=()=>new Date().toISOString().slice(0,10);
const brDate=iso=>iso?iso.split("-").reverse().join("/"):"";
const nowISO=()=>new Date().toISOString();
/* uid: identificador estável por item (o id autoIncrement muda entre dispositivos) */
const newUid=()=>(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+"-"+Math.random().toString(36).slice(2));
/* itens do SEED ganham uid derivado do conteúdo: o mesmo em todo dispositivo,
   para a sincronização não duplicar o banco inicial */
function hashStr(s){let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))>>>0;return h.toString(36);}
const seedUid=(area,nc,exec)=>"ini-"+hashStr((area||"")+"|"+(nc||"")+"|"+(exec||""));
/* mod antigo fixo: qualquer edição real (mod=agora) vence a cópia intocada do seed */
const SEED_MOD="2025-01-01T00:00:00.000Z";

function openDB(){return new Promise((res,rej)=>{const req=indexedDB.open(DB_NAME,1);
 req.onupgradeneeded=e=>{const d=e.target.result;
   if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:"id",autoIncrement:true});
   if(!d.objectStoreNames.contains("meta"))d.createObjectStore("meta",{keyPath:"k"});};
 req.onsuccess=e=>{db=e.target.result;res()};req.onerror=e=>rej(e);});}
function tx(s,m){return db.transaction(s,m).objectStore(s);}
function getAll(){return new Promise(r=>{const q=tx(STORE,"readonly").getAll();q.onsuccess=()=>r(q.result);});}
function putItem(o){return new Promise(r=>{const q=tx(STORE,"readwrite").put(o);q.onsuccess=()=>r(q.result);});}
function delDB(id){return new Promise(r=>{const q=tx(STORE,"readwrite").delete(id);q.onsuccess=()=>r();});}
function metaGet(k){return new Promise(r=>{const q=tx("meta","readonly").get(k);q.onsuccess=()=>r(q.result?q.result.v:null);q.onerror=()=>r(null);});}
function metaSet(k,v){return new Promise(r=>{const q=tx("meta","readwrite").put({k,v});q.onsuccess=()=>r();});}

/* O banco inicial (SEED) foi removido do código público por privacidade:
   dados reais ficam apenas no navegador dos dispositivos da usuária, nos
   backups exportados e no repositório privado de sincronização.
   Dispositivos novos começam vazios e recebem via Importar ou sync. */
async function seedIfEmpty(){}

/* ---- capa / Central de Empresas ---- */
const brDateTime=iso=>iso?new Date(iso).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"";

async function renderHome(){
 renderRtInfo();
 const vivos=DATA.filter(d=>!d.deleted);
 const lb=await metaGet("lastBackup");
 /* estado do backup automático em pasta */
 let autoOk=false,backupInfo="",backupBtns=`<button class="btn ghost sm" onclick="exportExcel()">⬇ Fazer backup</button>`;
 if(window.showDirectoryPicker){
   const dirH=await metaGet("backupDir");
   if(!dirH)backupBtns+=` <button class="btn ghost sm" onclick="setupAutoBackup()">⚙ Ativar automático</button>`;
   else{
     let perm="denied";try{perm=await dirH.queryPermission({mode:"readwrite"});}catch(e){}
     if(perm==="granted"){autoOk=true;backupInfo=" · automático ativo ✓";}
     else backupBtns+=` <button class="btn ghost sm" onclick="reauthBackup()">🔓 Reautorizar pasta</button>`;
   }
 }
 const pendAbertas=PENDENCIAS.filter(p=>!p.feita);
 const st=STATUS_SITE||{};
 const ondeParamos=st.ondeParamos?esc(st.ondeParamos):"—";
 const dISO=/^\d{4}-\d{2}-\d{2}$/.test(st.atualizadoEm||"")?st.atualizadoEm.split("-").reverse().join("/"):(st.atualizadoEm||"");
 const quando=dISO?` <span style="opacity:.7">(${esc(dISO)})</span>`:"";
 document.getElementById("home-cards").innerHTML=`
   <div class="card"><div class="lbl">PENDÊNCIAS DE CONFIGURAÇÃO</div>
     <div class="val accent">${pendAbertas.length}</div>
     <div class="sub" style="margin-top:2px">${pendAbertas.length===1?"pendência em aberto":"pendências em aberto"}</div>
     <div class="sub" style="margin-top:10px;line-height:1.5"><b>Onde paramos${quando}:</b><br>${ondeParamos}</div>
     <div style="margin-top:10px"><button class="btn ghost sm" onclick="gerirPendencias()">📋 Ver lista completa</button></div></div>`;
 /* backup compacto no topo da capa (ao lado do ⚙ Sincronização) */
 const topB=document.getElementById("backup-top");
 if(topB)topB.innerHTML=`<span class="backup-top-lbl" title="Último backup">Backup: ${lb?brDateTime(lb):"nenhum ainda"}${backupInfo}</span>${backupBtns}`;
 /* lembrete: sem backup automático e sem export recente */
 const dias=lb?Math.floor((Date.now()-new Date(lb).getTime())/864e5):null;
 document.getElementById("backup-banner").innerHTML=
   (vivos.length&&!autoOk&&(dias===null||dias>=7))?
   `<div class="card" style="border-color:var(--amber);margin-bottom:22px">⚠️ ${lb?("Seu último backup foi há "+dias+" dia"+(dias===1?"":"s")):"Você ainda não fez nenhum backup"} — os dados ficam salvos apenas neste navegador. <button class="btn sm" style="margin-left:8px" onclick="exportExcel()">Exportar agora</button></div>`:"";
 let html="";
 /* busca, filtro e ordenação das empresas (capa) */
 const _q=(document.getElementById("empQ")?.value||"").trim().toLowerCase();
 const _f=document.getElementById("empFiltro")?.value||"";
 const _o=document.getElementById("empOrdem")?.value||"az";
 const _pendDe=e=>vivos.filter(d=>d.loja===e.code&&isPendente(d)).length;
 let lista=EMPRESAS.filter(e=>
   (!_q||(e.name+" "+e.code).toLowerCase().includes(_q))&&
   (_f===""||(_f==="ativas"?e.ativa:!e.ativa)));
 lista=lista.slice().sort((a,b)=>_o==="pend"?_pendDe(b)-_pendDe(a):a.name.localeCompare(b.name,"pt-BR"));
 if(!lista.length)html=`<div class="store-row"><div class="store-info"><div class="store-sub">Nenhuma empresa encontrada.</div></div></div>`;
 for(const emp of lista){
   const pend=vivos.filter(d=>d.loja===emp.code&&isPendente(d)).length;
   const done=vivos.filter(d=>d.loja===emp.code&&isConcluido(d)).length;
   html+=`<div class="store-row">
     <div class="store-info">
       <div class="store-title">${esc(emp.name)}</div>
       <div class="store-sub">${pend} pendente${pend===1?"":"s"} · ${done} concluído${done===1?"":"s"}</div>
     </div>
     <span class="store-badge">${esc(emp.code)}</span>
     <div class="store-toggle-wrap">
       <label class="switch" title="Ativar/desativar empresa"><input type="checkbox" aria-label="Ativar ou desativar empresa" ${emp.ativa?"checked":""} onchange="onToggleEmpresa('${emp.code}',this.checked)"><span class="slider"></span></label>
       <span class="store-toggle-label ${emp.ativa?"on":"off"}">${emp.ativa?"Ativa":"Inativa"}</span>
     </div>
     <button class="btn ghost sm" title="Renomear empresa" onclick="renameEmpresa('${emp.code}')">✎</button>
     <button class="btn ghost sm" title="Excluir empresa" onclick="removeEmpresa('${emp.code}')">🗑</button>
     <button class="btn iniciar" ${emp.ativa?"":'disabled title="Ative a empresa para iniciar"'} onclick="enterStore('${emp.code}')">Iniciar →</button>
   </div>`;
 }
 document.getElementById("store-list").innerHTML=html;
 /* últimas 5 NCs com tag colorida (da home do painel original do projeto NC) */
 const boxNcs=document.getElementById("home-ncs");
 if(boxNcs){
  const ult=(typeof NC_URG!=="undefined")?vivos.filter(d=>d.tipo==="nc").sort((a,b)=>(b.mod||"").localeCompare(a.mod||"")).slice(0,5):[];
  boxNcs.innerHTML=ult.length?`<div class="section-title" style="margin-top:26px">Últimas NCs</div><div class="store-list">`+
   ult.map(d=>{const c=NC_URG[d.urgencia]||NC_URG.ATENCAO;
    return `<div class="store-row" style="padding:13px 18px;gap:10px">
     <span class="nc-tag" style="color:${c.cor};background:${c.fundo};flex:none">${c.rotulo}</span>
     <div class="store-info">
       <div style="font-size:13px">${esc((d.texto_tecnico||d.texto_bruto||"").slice(0,110))}</div>
       <div class="store-sub">${esc(d.loja)} · ${esc(d.area||"")} · ${brDate(d.relato)}${d.status==="Resolvida"?" · resolvida ✓":""}</div>
     </div></div>`;}).join("")+"</div>":"";
 }
}

async function onToggleEmpresa(code,val){const e=empresa(code);if(!e)return;
 e.ativa=val;
 /* regra (17/07): só UMA empresa ativa por vez — ativar uma desativa as demais */
 if(val)for(const x of EMPRESAS)if(x.code!==code)x.ativa=false;
 await saveEmpresas();fillLojaSelects();await renderHome();
 toast(val?`${code} ativada${EMPRESAS.length>1?" — as demais foram desativadas":""}`:`${code} desativada`);}

function toggleEmpresaForm(){const f=document.getElementById("empresa-form");f.style.display=f.style.display==="none"?"block":"none";}

async function addEmpresa(ev){ev.preventDefault();
 const name=document.getElementById("empNome").value.trim();
 const code=document.getElementById("empCode").value.trim().toUpperCase();
 if(!/^[A-Z0-9]{2,4}$/.test(code)){alert("O código deve ter de 2 a 4 letras/números (ex.: BZ).");return;}
 if(empresa(code)){alert("Já existe uma empresa com o código "+code+".");return;}
 EMPRESAS.push({code,name,ativa:true});
 await saveEmpresas();
 document.getElementById("empNome").value="";document.getElementById("empCode").value="";
 toggleEmpresaForm();fillLojaSelects();await renderHome();toast("Empresa "+name+" ("+code+") criada ✓");}

async function renameEmpresa(code){const e=empresa(code);if(!e)return;
 const n=prompt("Novo nome para "+e.name+" ("+code+"):",e.name);
 if(!n||!n.trim())return;
 e.name=n.trim();await saveEmpresas();fillLojaSelects();await renderHome();toast("Empresa renomeada ✓");}

async function removeEmpresa(code){const e=empresa(code);if(!e)return;
 if(DATA.some(d=>!d.deleted&&d.loja===code)){
   alert("A empresa "+e.name+" ("+code+") tem itens no banco e não pode ser excluída.\n\nUse o botão de ativar/desativar para inativá-la — ela some dos cadastros mas o histórico continua.");return;}
 if(!confirm("Excluir a empresa "+e.name+" ("+code+")?"))return;
 EMPRESAS=EMPRESAS.filter(x=>x.code!==code);
 await saveEmpresas();fillLojaSelects();await renderHome();toast("Empresa excluída");}

function enterStore(code){
 currentStore=code;
 const e=empresa(code)||{name:"Empresa"};
 document.getElementById("appTitle").textContent=e.name+" ("+code+")";
 currentStoreName=e.name;
 showView("app");showHub();   /* entra pelo HUB de cards, não direto numa aba */
}

function goHome(){currentStore=null;currentTab=null;showView("home");renderHome();}

function showView(v){
 document.getElementById("view-home").style.display=v==="home"?"block":"none";
 document.getElementById("view-app").style.display=v==="app"?"block":"none";
 /* navegação de abas só faz sentido dentro de uma empresa */
 const rt=document.getElementById("railTabs"),mn=document.getElementById("mobileNav");
 if(rt)rt.hidden=(v!=="app");
 if(mn)mn.hidden=(v!=="app");
 window.scrollTo(0,0);
}

/* "+ Nova" fica sempre visível: sem empresa escolhida, o item nasceria órfão */
function quickAdd(){
 if(!currentStore){goHome();toast("Escolha uma empresa primeiro");return;}
 showView("app");showTab("add");}

/* ---- render ---- */
/* selects de empresa nas células da tabela (mover item de empresa continua possível) */
function lojaOptionsHTML(sel){
 let extra=sel&&!empresa(sel)?`<option value="${esc(sel)}" selected>${esc(sel)}</option>`:"";
 return extra+EMPRESAS.map(e=>`<option value="${e.code}" ${e.code===sel?"selected":""}>${e.code}</option>`).join("");}
/* Itens travados por empresa: cada loja vê e cadastra só o que é dela.
   Mantida como no-op p/ compatibilidade com chamadas antigas. */
function fillLojaSelects(){}

function renderCards(){
 const base=DATA.filter(d=>!d.deleted&&(d.tipo||"mnt")===currentTipo&&d.loja===currentStore);
 const total=base.length,pend=base.filter(isPendente).length,done=base.filter(isConcluido).length;
 document.getElementById("cards").innerHTML=`
   <div class="card"><div class="lbl">Total de itens</div><div class="sub">nesta empresa</div><div class="val">${total}</div></div>
   <div class="card"><div class="lbl">Pendentes</div><div class="sub">aguardando</div><div class="val accent">${pend}</div></div>
   <div class="card"><div class="lbl">Concluídos</div><div class="sub">resolvidos</div><div class="val green">${done}</div></div>`;}

function fillAreas(){const areas=[...new Set(DATA.filter(d=>!d.deleted&&d.tipo!=="nc"&&d.loja===currentStore).map(d=>d.area))].sort();
 const sel=document.getElementById("fArea"),cur=sel.value;
 sel.innerHTML='<option value="">Todas as áreas</option>'+areas.map(a=>`<option>${a}</option>`).join("");sel.value=cur;
 document.getElementById("areas").innerHTML=areas.map(a=>`<option value="${a}">`).join("");}

function linhasFiltradas(){
 const q=document.getElementById("q").value.toLowerCase();
 const fE=document.getElementById("fExec").value;
 const fS=document.getElementById("fStatus").value,fA=document.getElementById("fArea").value;
 return DATA.filter(d=>{
   if(d.deleted)return false;
   if((d.tipo||"mnt")!==currentTipo)return false;
   if(d.loja!==currentStore)return false; /* itens travados por empresa */
   if(fE&&d.executor!==fE)return false;
   if(fS&&d.status!==fS)return false;if(fA&&d.area!==fA)return false;
   if(q&&!((d.nc||"").toLowerCase().includes(q)||(d.acao||"").toLowerCase().includes(q)||(d.area||"").toLowerCase().includes(q)))return false;
   return true;});
}
/* move de uma vez todos os itens do filtro atual para outra empresa
   (evita retrabalho: filtre por área/busca/status e mova em massa) */
async function moverFiltrados(){
 const rows=linhasFiltradas();
 if(!rows.length){alert("Nenhum item no filtro atual para mover.");return;}
 const outras=EMPRESAS.filter(e=>e.code!==currentStore);
 if(!outras.length){alert("Não há outra empresa cadastrada.");return;}
 const ops=outras.map((e,i)=>(i+1)+" = "+e.name+" ("+e.code+")").join("\n");
 const resp=prompt("Mover os "+rows.length+" itens do filtro atual para qual empresa?\n\n"+ops+"\n\nDigite o número:");
 if(!resp)return;
 const alvo=outras[parseInt(resp,10)-1];
 if(!alvo){alert("Opção inválida.");return;}
 if(!confirm("Confirmar: mover "+rows.length+" item"+(rows.length===1?"":"s")+" de "+currentStoreName+" para "+alvo.name+"?"))return;
 for(const d of rows){d.loja=alvo.code;d.mod=nowISO();d.atualizacao=today();await putItem(d);}
 dataChanged();render();toast(rows.length+" itens movidos para "+alvo.code+" ✓");
}

function render(){
 renderCards();fillAreas();
 let rows=linhasFiltradas();
 rows.sort((a,b)=>(isPendente(a)?0:1)-(isPendente(b)?0:1));
 const tb=document.getElementById("tbody");
 if(!rows.length){tb.innerHTML='<tr><td colspan="10"><div class="empty">'+(currentTipo==="dg"?"Nenhuma demanda geral cadastrada ainda. Use “+ Nova” para adicionar.":"Nenhum item encontrado.")+'</div></td></tr>';return;}
 tb.innerHTML=rows.map(d=>{const done=d.status==="Concluído";return `<tr>
   <td><select class="cell" onchange="setField(${d.id},'loja',this.value)">${lojaOptionsHTML(d.loja)}</select></td>
   <td><textarea class="cell" rows="1" onchange="setField(${d.id},'area',this.value)" oninput="grow(this)">${esc(d.area)}</textarea></td>
   <td><textarea class="cell" rows="1" onchange="setField(${d.id},'nc',this.value)" oninput="grow(this)">${esc(d.nc)}</textarea></td>
   <td><textarea class="cell" rows="1" onchange="setField(${d.id},'acao',this.value)" oninput="grow(this)">${esc(d.acao)}</textarea></td>
   <td><textarea class="cell" rows="1" onchange="setField(${d.id},'rt',this.value)" oninput="grow(this)">${esc(d.rt)}</textarea></td>
   <td><select class="cell" onchange="setField(${d.id},'executor',this.value)">${execOptionsHTML(d.executor)}</select></td>
   <td><input type="date" class="cell" value="${d.relato||""}" onchange="setField(${d.id},'relato',this.value)"></td>
   <td><div class="atu">${brDate(d.atualizacao)}</div></td>
   <td><div class="stwrap"><label class="switch" title="Marcar resolvido"><input type="checkbox" aria-label="Marcar como concluído" ${done?"checked":""} onchange="setField(${d.id},'status',this.checked?'Concluído':'Pendente')"><span class="slider"></span></label><span class="stlabel ${done?"done":"pend"}">${d.status}</span></div></td>
   <td><button class="delbtn" title="Excluir" onclick="removeItem(${d.id})">🗑</button></td>
 </tr>`;}).join("");
 requestAnimationFrame(()=>document.querySelectorAll("textarea.cell").forEach(grow));}

function grow(t){t.style.height="auto";t.style.height=t.scrollHeight+"px";}
function esc(s){return (s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}

async function setField(id,field,val){
 const it=DATA.find(d=>d.id===id);if(!it)return;
 it[field]=val;it.atualizacao=today();it.mod=nowISO();await putItem(it);dataChanged();
 if(field==="status"||field==="loja"){render();toast("Atualizado ✓");}
 else{renderCards();fillAreas();} /* sem redesenhar a tabela: o cursor fica onde está */
}
async function removeItem(id){const it=DATA.find(d=>d.id===id);
 if(!confirm("Excluir este item?\n\n"+(it?(it.nc||it.texto_bruto||""):"")))return;
 if(window.syncEnabled&&syncEnabled()&&it){
   /* com sync ativo a exclusão vira "lápide": propaga aos outros dispositivos sem ressuscitar */
   it.deleted=true;it.mod=nowISO();await putItem(it);
 }else{
   await delDB(id);DATA=DATA.filter(d=>d.id!==id);
 }
 dataChanged();toast("Item excluído");render();}
async function addItem(e){e.preventDefault();
 const o={uid:newUid(),mod:nowISO(),tipo:document.getElementById("fmTipo").value,loja:document.getElementById("fmLoja").value,area:document.getElementById("fmArea").value.trim(),
   nc:document.getElementById("fmNc").value.trim(),acao:document.getElementById("fmAcao").value.trim(),
   rt:document.getElementById("fmRt").value.trim()||RT_DEFAULT,executor:document.getElementById("fmExec").value,
   relato:document.getElementById("fmData").value||today(),atualizacao:today(),
   status:document.getElementById("fmStatus").value,criado:"manual"};
 const id=await putItem(o);o.id=id;DATA.push(o);dataChanged();
 document.getElementById("ncForm").reset();
 document.getElementById("fmRt").value=RT_DEFAULT;document.getElementById("fmData").value=today();
 toast((o.tipo==="dg"?"Demanda":"Não conformidade")+" adicionada ✓");showTab(o.tipo==="dg"?"dg":"list");}

function showTab(t){
 const tab=TABS[t]||TABS.dg;
 currentTab=t;
 if(tab.tipo)currentTipo=tab.tipo;
 document.querySelectorAll(".tab-panel").forEach(p=>p.style.display="none");
 const hub=document.getElementById("view-hub");if(hub)hub.style.display="none";
 document.getElementById("cards").style.display="";
 document.getElementById("tabs").style.display="";
 document.getElementById(tab.panel).style.display="block";
 syncNav();
 updateSubtitle(t);
 renderBreadcrumb();
 (tab.renderCards||renderCards)();
 if(tab.onShow)tab.onShow();
 window.scrollTo(0,0);}

/* abas que usam a tabela compartilhada (dg / mnt) */
function configTableTab(tipo){
 currentTipo=tipo;
 document.getElementById("thNC").textContent=tipo==="dg"?"Demanda":"Não Conformidade";
 document.getElementById("q").placeholder=tipo==="dg"?"Buscar por demanda, ação ou área...":"Buscar por não conformidade, ação ou área...";
 render();}

/* aba de cadastro manual (serve dg/mnt; a aba NC terá formulário próprio) */
function configAddTab(){
 const t=(currentTipo==="dg")?"dg":"mnt";
 document.getElementById("fmTipo").value=t;
 document.getElementById("lbNc").textContent=t==="dg"?"Demanda *":"Não Conformidade *";
 /* itens travados por empresa: cadastro sempre na empresa atual */
 const m=document.getElementById("fmLoja");
 m.innerHTML=`<option value="${esc(currentStore)}">${esc(currentStoreName)} (${esc(currentStore)})</option>`;
 fillAreas();document.getElementById("fmData").value=today();}

/* ===== NP · Gestão de NC — Fase 3: porte integral do projeto (regras, campos, cálculos) ===== */
function renderNC(){}

/* ===== export / import / backup automático ===== */
/* Envelope versionado: leva itens E empresas; o import aceita também o formato antigo (array puro) */
function buildBackupEnvelope(){return {versao:4,exportadoEm:nowISO(),empresasMod:EMPRESAS_MOD,empresas:EMPRESAS,pendenciasMod:PENDENCIAS_MOD,pendencias:PENDENCIAS,rtInfo:RT_INFO,rtInfoMod:RT_INFO_MOD,areasMod:AREAS_MOD,areas:AREAS_ALL,itens:DATA};}

function buildCsvGeral(){
 const head=["Aba","Empresa","Área","Não Conformidade / Demanda","Ação Corretiva","Responsável Técnica","Executor","Data do Relato","Data de Atualização","Status"];
 const rows=DATA.filter(d=>!d.deleted&&d.tipo!=="nc").map(d=>[TIPOS[d.tipo||"mnt"],d.loja,d.area,d.nc,d.acao,d.rt,d.executor,brDate(d.relato),brDate(d.atualizacao),d.status]);
 return [head,...rows].map(r=>r.map(c=>'"'+String(c==null?"":c).replace(/"/g,'""')+'"').join(";")).join("\r\n");
}
async function exportExcel(){
 download("nao_conformidades.csv","﻿"+buildCsvGeral(),"text/csv");
 if(window.ncExportCSV)ncExportCSV(); /* CSV próprio da aba NC (colunas diferentes) */
 download("backup_banco_demandas.json",JSON.stringify(buildBackupEnvelope(),null,2),"application/json");
 await metaSet("lastBackup",nowISO());
 if(document.getElementById("view-home").style.display!=="none")renderHome();
 toast("Excel (CSV) + backup exportados");}
function download(name,content,type){const b=content instanceof Blob?content:new Blob([content],{type});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=name;a.click();URL.revokeObjectURL(a.href);}

async function importJSON(e){const f=e.target.files[0];if(!f)return;const txt=await f.text();
 try{
  const parsed=JSON.parse(txt);
  /* aceita: array puro (backups antigos) OU envelope {versao, empresas, itens} */
  const arr=Array.isArray(parsed)?parsed:(parsed&&Array.isArray(parsed.itens)?parsed.itens:null);
  if(!arr)throw 0;
  if(!confirm("Importar "+arr.length+" itens? Isso substitui o banco atual."))return;
  for(const d of DATA)await delDB(d.id);DATA=[];
  if(!Array.isArray(parsed)&&Array.isArray(parsed.empresas)){
    for(const em of parsed.empresas){if(em&&em.code&&!empresa(em.code))EMPRESAS.push({code:em.code,name:em.name||em.code,ativa:em.ativa!==false});}
    await saveEmpresas();
  }
  if(!Array.isArray(parsed)&&Array.isArray(parsed.pendencias)){
    PENDENCIAS=parsed.pendencias;await savePendencias();
  }
  let novaEmp=false;
  for(const o of arr){const {id,...rest}=o;
   if(!rest.tipo)rest.tipo="mnt";if(!rest.uid)rest.uid=newUid();if(!rest.mod)rest.mod=nowISO();
   if(rest.loja&&!empresa(rest.loja)){EMPRESAS.push({code:rest.loja,name:rest.loja,ativa:true});novaEmp=true;}
   const nid=await putItem(rest);rest.id=nid;DATA.push(rest);}
  if(novaEmp)await saveEmpresas();
  fillLojaSelects();
  toast("Importado com sucesso");render();dataChanged();
 }catch(err){alert("Arquivo inválido. Use o backup .json exportado por este app.");}e.target.value="";}

/* ---- backup automático em pasta (Chrome/Edge no computador) ---- */
let backupT=null;
function dataChanged(){scheduleBackup();if(window.syncSchedule)syncSchedule();}
function scheduleBackup(){clearTimeout(backupT);backupT=setTimeout(doBackup,30000);}

async function setupAutoBackup(){
 if(!window.showDirectoryPicker){alert("O backup automático em pasta funciona no Chrome ou Edge no computador.\nNo celular/Safari, use o botão Fazer backup periodicamente.");return;}
 try{
   const dir=await showDirectoryPicker({mode:"readwrite"});
   await metaSet("backupDir",dir);
   toast("Backup automático configurado ✓");
   await doBackup(true);
   renderHome();
 }catch(e){/* usuária cancelou o seletor */}
}
async function reauthBackup(){
 const dir=await metaGet("backupDir");if(!dir)return;
 try{const p=await dir.requestPermission({mode:"readwrite"});
   if(p==="granted"){toast("Pasta de backup reautorizada ✓");await doBackup(true);renderHome();}
 }catch(e){}
}
async function doBackup(force){
 const dir=await metaGet("backupDir");if(!dir)return;
 try{
   const perm=dir.queryPermission?await dir.queryPermission({mode:"readwrite"}):"granted";
   if(perm!=="granted"){if(!force)return;/* precisa de gesto da usuária: card da capa mostra "Reautorizar" */}
   /* padrão da usuária: subpasta datada "Backup NC - DD.MM.AA" com json + csvs dentro */
   const d=new Date(),p2=n=>String(n).padStart(2,"0");
   const nomePasta="Backup NC - "+p2(d.getDate())+"."+p2(d.getMonth()+1)+"."+String(d.getFullYear()).slice(2);
   const sub=await dir.getDirectoryHandle(nomePasta,{create:true});
   const grava=async(nome,conteudo)=>{const fh=await sub.getFileHandle(nome,{create:true});
     const w=await fh.createWritable();await w.write(conteudo);await w.close();};
   await grava("backup_banco_demandas.json",JSON.stringify(buildBackupEnvelope(),null,2));
   await grava("nao_conformidades.csv","﻿"+buildCsvGeral());
   if(window.ncBuildCSV){const c=ncBuildCSV();if(c)await grava("gestao_nc.csv","﻿"+c);}
   await metaSet("lastBackup",nowISO());
   /* regra do projeto: manter apenas as últimas 7 pastas diárias */
   try{
     const pastas=[];
     for await(const [nome,h] of dir.entries())
       if(h.kind==="directory"&&/^Backup NC - \d{2}\.\d{2}\.\d{2}$/.test(nome))pastas.push(nome);
     const chave=s=>s.slice(-8).split(".").reverse().join(""); /* DD.MM.AA → AAMMDD p/ ordenar */
     pastas.sort((a,b)=>chave(a).localeCompare(chave(b)));
     while(pastas.length>7)await dir.removeEntry(pastas.shift(),{recursive:true}).catch(()=>{});
   }catch(e){}
   if(document.getElementById("view-home").style.display!=="none")renderHome();
 }catch(e){/* sem permissão/pasta removida — o card da capa oferece reautorizar */}
}

/* ===== privacidade: apagar tudo que o site guardou NESTE navegador =====
   Para uso em computadores de terceiros — remove registros locais, token
   de sincronização e cache. Backups e outros dispositivos não são afetados. */
async function limparDispositivo(){
 if(!confirm("Apagar TODOS os dados deste dispositivo?\n\nIsso remove os registros locais, o token de sincronização e o cache do site NESTE navegador.\nSeus outros dispositivos, a sincronização e os backups NÃO são afetados."))return;
 if(!confirm("Tem certeza? Esta ação não pode ser desfeita neste dispositivo."))return;
 try{if(db)db.close();}catch(e){}
 await new Promise(r=>{const q=indexedDB.deleteDatabase(DB_NAME);q.onsuccess=q.onerror=q.onblocked=()=>r();});
 try{["gh_sync_token","gh_sync_owner","gh_sync_repo","gh_sync_token_date"].forEach(k=>{localStorage.removeItem(k);sessionStorage.removeItem(k);});}catch(e){}
 try{if(window.caches)for(const k of await caches.keys())await caches.delete(k);}catch(e){}
 try{if(navigator.serviceWorker){const rs=await navigator.serviceWorker.getRegistrations();for(const rg of rs)await rg.unregister();}}catch(e){}
 alert("Dados deste dispositivo apagados ✓");
 location.reload();
}

/* ===== Busca rápida de abas (Ctrl+K) — pular para qualquer aba sem tirar a mão do teclado ===== */
let PAL_SEL=0,PAL_ITENS=[],PAL_FOCO=null;
function openPalette(){
 if(!currentStore){toast("Escolha uma empresa primeiro");return;}
 PAL_FOCO=document.activeElement;
 const o=document.getElementById("palOverlay");o.style.display="flex";
 const i=document.getElementById("palInput");i.value="";paletteFilter();i.focus();
}
function closePalette(){
 document.getElementById("palOverlay").style.display="none";
 if(PAL_FOCO&&PAL_FOCO.focus)PAL_FOCO.focus();PAL_FOCO=null;
}
/* sem acento e em minúsculas: digitar "manutencao" ou "nao" também encontra */
function semAcento(s){return (s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();}
function paletteFilter(){
 const q=semAcento(document.getElementById("palInput").value.trim());
 /* ranking: quem COMEÇA com o termo vem antes (digitar "man" deve achar Manutenções,
    não "deMANdas"); depois quem tem alguma palavra começando com ele; por fim o resto */
 const peso=t=>{const l=semAcento(TABS[t].label);
   if(l.startsWith(q))return 0;
   if(l.split(/[\s·\-]+/).some(p=>p.startsWith(q)))return 1;
   return 2;};
 PAL_ITENS=TAB_ORDER.filter(t=>!q||semAcento(TABS[t].label).includes(q));
 if(q)PAL_ITENS.sort((a,b)=>peso(a)-peso(b));
 PAL_SEL=0;paletteDraw();
}
function paletteDraw(){
 const l=document.getElementById("palList");
 l.innerHTML=PAL_ITENS.length?PAL_ITENS.map((t,i)=>{const a=TABS[t];
   return `<div class="pal-item${i===PAL_SEL?" sel":""}" onclick="showTab('${t}');closePalette()">
     <span class="pal-ico" style="color:${a.cor}">${a.icone}</span>${esc(a.label)}</div>`;}).join("")
   :`<div class="pal-item" style="color:var(--muted)">Nenhuma aba encontrada</div>`;
}
function paletteMove(d){if(!PAL_ITENS.length)return;PAL_SEL=(PAL_SEL+d+PAL_ITENS.length)%PAL_ITENS.length;paletteDraw();}
function paletteEnter(){const t=PAL_ITENS[PAL_SEL];if(t){showTab(t);closePalette();}}
function initAtalhos(){
 document.addEventListener("keydown",e=>{
   const aberto=document.getElementById("palOverlay").style.display==="flex";
   if((e.ctrlKey||e.metaKey)&&(e.key==="k"||e.key==="K")){e.preventDefault();aberto?closePalette():openPalette();return;}
   if(!aberto)return;
   if(e.key==="Escape"){e.preventDefault();closePalette();}
   else if(e.key==="ArrowDown"){e.preventDefault();paletteMove(1);}
   else if(e.key==="ArrowUp"){e.preventDefault();paletteMove(-1);}
   else if(e.key==="Enter"){e.preventDefault();paletteEnter();}
 });
}

/* (avatar/foto removidos a pedido da usuária em 17/07 — era só estético) */
let toastT;function toast(m){const t=document.getElementById("toast");t.textContent=m;t.classList.add("show");clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove("show"),2000);}

(async function(){await openDB();await seedIfEmpty();DATA=await getAll();
 /* migrações aditivas e idempotentes (nunca removem nada) */
 for(const d of DATA){
   let dirty=false;
   if(!d.tipo){d.tipo="mnt";dirty=true;}   /* itens antigos = Manutenções e Elétrica */
   if(!d.uid){d.uid=(d.criado==="inicial")?seedUid(d.area,d.nc,d.executor):newUid();dirty=true;}  /* estável p/ sync; seed = determinístico */
   if(dirty)await putItem(d);
 }
 await loadEmpresas();await loadExecutores();await loadPendencias();await loadRtInfo();await loadAreasAll();await loadStatusSite();
 document.getElementById("fmData").value=today();
 renderTabs();fillExecSelects();initAtalhos();
 goHome();
 if(window.syncInit)syncInit();
 /* PWA: service worker só em https (GitHub Pages); no file:// é ignorado */
 if("serviceWorker" in navigator&&location.protocol==="https:")
   navigator.serviceWorker.register("sw.js").catch(()=>{});
})();
