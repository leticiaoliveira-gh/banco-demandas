const RT_DEFAULT="[nome-removido] (Nutricionista de Produção – RT)";

/* ===== Empresas dinâmicas (gerenciáveis pela Central de Empresas) ===== */
/* Grupo = conjunto de lojas que dividem a MESMA agenda de Demandas Gerais.
   Só as lojas do [rede-removida] (CF e AC) têm grupo; empresa nova nasce sem. */
const GRUPO_SF="SF";
let EMPRESAS=[],EMPRESAS_MOD="";
function grupoDe(code){const e=(EMPRESAS||[]).find(x=>x.code===code);return (e&&e.grupo)||"";}
function lojasDoGrupo(g){return (EMPRESAS||[]).filter(e=>e.grupo===g);}
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
 /* faxina: o código do GRUPO chegou a virar "empresa" numa importação — não é loja,
    não pode aparecer na capa. (achado em 19/07) */
 const semGrupoFantasma=EMPRESAS.filter(e=>e.code!==GRUPO_SF);
 if(semGrupoFantasma.length!==EMPRESAS.length){
   EMPRESAS=semGrupoFantasma;EMPRESAS_MOD=nowISO();
   await metaSet("empresas",EMPRESAS);await metaSet("empresasMod",EMPRESAS_MOD);
 }
 /* GRUPO (19/07): as lojas do [rede-removida] dividem a MESMA agenda de Demandas Gerais.
    Empresa criada depois nasce SEM grupo -> agenda própria (regra explícita de Lê). */
 if(!(await metaGet("mig_grupo_sf"))){
   let mudou=false;
   for(const e of EMPRESAS){
     if((e.code==="CF"||e.code==="AC")&&!e.grupo){e.grupo=GRUPO_SF;mudou=true;}
   }
   if(mudou){EMPRESAS_MOD=nowISO();await metaSet("empresas",EMPRESAS);await metaSet("empresasMod",EMPRESAS_MOD);}
   await metaSet("mig_grupo_sf",true);
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
/* rótulo do tipo no CSV: segue o nome que ela deu à aba */
function rotuloTipo(t){const m={dg:"dg",nc:"nc",mnt:"list"};return rotuloAba(m[t]||t);}
let currentTipo="dg";
let currentTab="dg";
let currentStore=null,currentStoreName="";

/* ===== Ícones das abas (SVG: herdam a cor da aba via currentColor) ===== */
const ICO={
  dg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z"/><rect x="4" y="6" width="16" height="15" rx="2"/><path d="M9 12h7M9 16h5"/></svg>',
  nc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 11v4M12 18h.01"/></svg>',
  mnt:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 1-5 5L4 17v3h3l5.7-5.7a4 4 0 0 1 5-5l-2.5 2.5 1.8 1.8L19.5 11a4 4 0 0 0-4.8-4.7z"/></svg>',
  ck:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1z"/><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8.5 12.5l2 2 4.5-4.5"/></svg>',
  add:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  hub:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>'
};
/* ===== Registro de abas =====
   Cada aba é um "projeto" independente: painel, subtítulo, cards e regras próprios.
   Para criar uma aba nova: 1 entrada aqui + em TAB_ORDER + um <div class="tab-panel"> no HTML.
   FONTE ÚNICA: hub, barra lateral, barra do celular, abas de texto e a busca Ctrl+K
   são todos gerados de TAB_ORDER — nunca escrever uma lista de abas em outro lugar.
   Campos visuais: icone (SVG), cor (cor forte), corFundo (pastel), hub (aparece no hub?). */
const TAB_ORDER=["dg","ck","nc","list","add"];
const TABS={
  dg:{label:"Quadro Geral",tipo:"dg",panel:"tab-dg",
      icone:ICO.dg,cor:"#1d6b57",corFundo:"#e8f4ef",hub:true,
      subtitle:n=>"",
      renderCards(){document.getElementById("cards").innerHTML="";},
      onShow(){currentTipo="dg";renderDG();}},
  ck:{label:"Checklists",tipo:"ckm",panel:"tab-ck",
      icone:ICO.ck,cor:"#7c3aed",corFundo:"#f1ebfd",hub:true,
      subtitle:n=>"",
      renderCards(){document.getElementById("cards").innerHTML="";},
      onShow(){currentTipo="ckm";renderCk();}},
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
/* ===== NOMES DAS ABAS EDITÁVEIS (regra fixa de Lê: TUDO é editável) =====
   O nome que ela escrever vence o nome de fábrica, e viaja entre os aparelhos. */
let ABA_NOMES={},ABA_NOMES_MOD="";
async function loadAbaNomes(){ABA_NOMES=await metaGet("abaNomes")||{};ABA_NOMES_MOD=await metaGet("abaNomesMod")||"";}
function rotuloAba(t){return (ABA_NOMES&&ABA_NOMES[t])||(TABS[t]&&TABS[t].label)||t;}
async function renomearAba(t,novo){
  novo=String(novo||"").trim();if(!novo||novo===rotuloAba(t))return;
  ABA_NOMES[t]=novo;ABA_NOMES_MOD=nowISO();
  await metaSet("abaNomes",ABA_NOMES);await metaSet("abaNomesMod",ABA_NOMES_MOD);
  renderTabs();updateSubtitle(currentTab);dataChanged();toast("Nome do quadro atualizado ✓");
}
/* ===== TEXTOS DO SITE EDITÁVEIS =====
   Regra fixa de Lê: tudo tem de ser editável por ela, sem mexer em código.
   Todo texto que ela pode trocar passa por txt("chave","texto de fábrica") e/ou
   carrega data-txt="chave" no HTML. O MODO EDIÇÃO liga a caneta em todos de uma vez. */
let TEXTOS={},TEXTOS_MOD="",MODO_EDICAO=false;
async function loadTextos(){TEXTOS=await metaGet("textos")||{};TEXTOS_MOD=await metaGet("textosMod")||"";}
function txt(chave,padrao){const v=TEXTOS&&TEXTOS[chave];return (v===undefined||v==="")?padrao:v;}
async function setTexto(chave,valor,padrao){
  valor=String(valor||"").trim();
  if(!valor||valor===padrao){delete TEXTOS[chave];}else{TEXTOS[chave]=valor;}
  TEXTOS_MOD=nowISO();
  await metaSet("textos",TEXTOS);await metaSet("textosMod",TEXTOS_MOD);
  dataChanged();
}
/* aplica os textos guardados em tudo que tem data-txt (chamado a cada render) */
function aplicarTextos(raiz){
  (raiz||document).querySelectorAll("[data-txt]").forEach(el=>{
    if(el.dataset.padrao===undefined)el.dataset.padrao=el.textContent;
    const v=TEXTOS[el.dataset.txt];
    if(v!==undefined&&v!==""&&el.textContent!==v)el.textContent=v;
    else if((v===undefined||v==="")&&el.textContent!==el.dataset.padrao)el.textContent=el.dataset.padrao;
    if(MODO_EDICAO)ligarEdicao(el);
  });
  /* placeholders também são editáveis, pelo atributo */
  (raiz||document).querySelectorAll("[data-txt-ph]").forEach(el=>{
    const k=el.dataset.txtPh;
    if(el.dataset.padraoPh===undefined)el.dataset.padraoPh=el.placeholder||"";
    el.placeholder=txt(k,el.dataset.padraoPh);
  });
}
function ligarEdicao(el){
  el.contentEditable="plaintext-only";el.classList.add("editando");
  el.title="Clique e escreva o texto que você quiser";
  el.onblur=()=>setTexto(el.dataset.txt,el.textContent,el.dataset.padrao);
  el.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();el.blur();}
    if(e.key==="Escape"){el.textContent=txt(el.dataset.txt,el.dataset.padrao);el.blur();}};
}
function desligarEdicao(el){
  el.contentEditable="false";el.classList.remove("editando");
  el.onblur=el.onkeydown=null;el.title="";
}
function toggleModoEdicao(){
  MODO_EDICAO=!MODO_EDICAO;
  document.body.classList.toggle("modo-edicao",MODO_EDICAO);
  document.querySelectorAll("[data-txt]").forEach(el=>MODO_EDICAO?ligarEdicao(el):desligarEdicao(el));
  updateSubtitle(currentTab);   /* o nome do quadro e a pílula da loja seguem o modo */
  toast(MODO_EDICAO?"Modo edição LIGADO — clique em qualquer texto para trocar"
                   :"Modo edição desligado");
  if(MODO_EDICAO)barraModoEdicao();else{const b=document.getElementById("barraEdicao");if(b)b.remove();}
}
function barraModoEdicao(){
  if(document.getElementById("barraEdicao"))return;
  const b=document.createElement("div");b.id="barraEdicao";b.className="barra-edicao";
  b.innerHTML=`<b>✏️ Modo edição ligado</b>
    <span>Clique em qualquer texto marcado e escreva. Enter confirma, Esc cancela.</span>
    <button class="btn ghost sm" onclick="restaurarTextos()">↺ Restaurar os originais</button>
    <button class="btn sm" onclick="toggleModoEdicao()">✓ Concluir</button>`;
  document.body.appendChild(b);
}
async function restaurarTextos(){
  if(!Object.keys(TEXTOS).length){toast("Nenhum texto foi trocado ainda");return;}
  if(!confirm("Restaurar TODOS os textos do site para o original?\n\n"
    +Object.keys(TEXTOS).length+" texto(s) que você escreveu serão desfeitos."))return;
  TEXTOS={};TEXTOS_MOD=nowISO();
  await metaSet("textos",TEXTOS);await metaSet("textosMod",TEXTOS_MOD);
  document.querySelectorAll("[data-txt]").forEach(el=>{if(el.dataset.padrao!==undefined)el.textContent=el.dataset.padrao;});
  aplicarTextos();dataChanged();toast("Textos restaurados ✓");
}

/* nome da loja editável na pílula (mantém o sufixo da rede: "· [rede-removida]") */
async function renomearLojaCurto(novo){
  const e=empresa(currentStore);if(!e)return;
  novo=String(novo||"").trim();if(!novo)return;
  const resto=e.name.includes("·")?" ·"+e.name.split("·").slice(1).join("·"):"";
  const completo=novo+resto;
  if(completo===e.name)return;
  e.name=completo;currentStoreName=nomeCurto(completo);
  await saveEmpresas();fillLojaSelects();updateSubtitle(currentTab);toast("Empresa renomeada ✓");
}
/* "[loja-B] · [rede-removida]" -> "[loja-B]" (usado dentro das abas) */
function nomeCurto(n){return String(n||"").split("·")[0].trim()||String(n||"");}
/* A barra de abas de TEXTO foi removida a pedido de Lê (19/07: "está poluído").
   A navegação vive na barra lateral (ícones), na barra do celular, no hub e no Ctrl+K. */
function renderTabs(){renderRailTabs();renderMobileNav();}
/* ===== Hub de cards (porta de entrada da empresa) ===== */
function renderHub(){
  const box=document.getElementById("hub-grid");if(!box)return;
  box.innerHTML=ABAS_HUB().map(t=>{const a=TABS[t];
    /* card BRANCO: a cor fica só na barra, no fundo do ícone e no título (pedido de Lê, 19/07) */
    return `<button class="hub-card" data-hub="${t}" style="color:${a.cor}" onclick="showTab('${t}')" title="${esc(rotuloAba(t))}">
      <span class="bar" style="background:${a.cor}"></span>
      <span class="ico" style="background:${a.corFundo}">${a.icone}</span>
      <span class="nm">${esc(rotuloAba(t))}</span></button>`;}).join("");
}
function showHub(){
  if(!currentStore)return goHome();
  document.querySelectorAll(".tab-panel").forEach(p=>p.style.display="none");
  document.getElementById("view-hub").style.display="block";
  document.getElementById("cards").style.display="none";
  document.getElementById("tabs").style.display="none";
  currentTab=null;
  document.getElementById("appTitle").textContent=nomeCurto(currentStoreName||"");
  document.getElementById("appSubtitle").innerHTML=`<span class="loja-pill">Escolha um quadro</span>`;
  renderHub();renderBreadcrumb();syncNav();window.scrollTo(0,0);
}
/* ===== Navegação permanente (barra lateral + barra do celular) ===== */
function navItemHTML(t){const a=TABS[t];
  return `<button class="ricon nav-item" data-tab="${t}" style="color:${a.cor}" title="${esc(rotuloAba(t))}" aria-label="${esc(rotuloAba(t))}" onclick="showTab('${t}')">${a.icone}<span class="rlabel">${esc(rotuloAba(t))}</span></button>`;}
/* ===== BARRA LATERAL QUE ABRE E FECHA (pedido de Lê, 20/07, vendo o Checkbits) =====
   Fechada = só ícones (como sempre foi). Aberta = ícone + nome por extenso, e as
   seções da aba atual aparecem recuadas embaixo dela. Fica no aparelho. */
let RAIL_ABERTA=localStorage.getItem("rail_aberta")==="1";
function toggleRail(){
  RAIL_ABERTA=!RAIL_ABERTA;localStorage.setItem("rail_aberta",RAIL_ABERTA?"1":"0");
  aplicarRail();renderRailTabs();syncNav();
}
function aplicarRail(){
  const r=document.getElementById("rail");if(r)r.classList.toggle("aberta",RAIL_ABERTA);
  const b=document.getElementById("btRail");
  if(b)b.title=RAIL_ABERTA?"Fechar o menu":"Abrir o menu";
}
/* seções de dentro de uma aba (hoje só a de Checklists tem) — só aparecem
   com a barra aberta e na aba em que se está */
function railSubHTML(t){
  if(!RAIL_ABERTA||t!==currentTab)return "";
  if(t==="ck"&&typeof CK_SEC!=="undefined"){
    const secs=[["formularios","📋",txt("ck.sec.formularios","Formulários")],
                ["enviados","✅",txt("ck.sec.enviados","Enviados")],
                ["parciais","⏸",txt("ck.sec.parciais","Parciais")]];
    return `<div class="rail-sub">${secs.map(([k,ic,nm])=>
      `<button class="rail-subit${CK_SEC===k?" on":""}" onclick="showTab('ck');ckSetSec('${k}')"
        title="${esc(nm)}"><span>${ic}</span>${esc(nm)}</button>`).join("")}</div>`;
  }
  return "";
}
function renderRailTabs(){const b=document.getElementById("railTabs");
  if(b)b.innerHTML=TAB_ORDER.map(t=>navItemHTML(t)+railSubHTML(t)).join("");
  aplicarRail();}
function renderMobileNav(){const b=document.getElementById("mobileNav");
  /* no celular a barra lateral some, então o DESFAZER também mora aqui */
  if(b)b.innerHTML=`<button class="ricon nav-item" title="Hub da empresa" aria-label="Hub da empresa" onclick="showHub()">${ICO.hub}</button>`
    +TAB_ORDER.map(navItemHTML).join("")
    +`<button class="ricon" id="btDesfazerM" onclick="desfazer()" title="Desfazer" aria-label="Desfazer">←</button>`;}
/* destaque da aba atual — única função que marca "active" em TODAS as navegações */
function syncNav(){
  document.querySelectorAll("[data-tab]").forEach(el=>{
    const on=el.dataset.tab===currentTab;
    el.classList.toggle("active",on);
    if(on)el.setAttribute("aria-current","page");else el.removeAttribute("aria-current");
  });
}
/* menu "⋯" — guarda as ações raras (exportar, importar, cadastro manual, mapa) */
function toggleMenuMais(ev){
  ev.stopPropagation();
  const m=document.getElementById("menuMais");if(!m)return;
  m.hidden=!m.hidden;
  if(!m.hidden)setTimeout(()=>document.addEventListener("click",fecharMenuMais,{once:true}),0);
}
function fecharMenuMais(){const m=document.getElementById("menuMais");if(m)m.hidden=true;}

/* trilha removida a pedido de Lê (19/07) — o cabeçalho já diz o quadro e a loja */
function renderBreadcrumb(){
  const c=document.getElementById("crumb");if(!c)return;
  const aba=currentTab&&TABS[currentTab]?` › <b>${esc(rotuloAba(currentTab))}</b>`:" › <b>Início</b>";
  c.innerHTML=`<span onclick="goHome()" title="Voltar à Central de Empresas">Capa</span> › <span onclick="showHub()" title="Voltar ao início desta empresa">${esc(currentStoreName||"Empresa")}</span>${aba}`;
}
/* Cabeçalho padrão de TODAS as abas (pedido de Lê, 19/07):
   título grande = nome do quadro · embaixo, a loja numa pílula verde. */
function updateSubtitle(t){
  const h1=document.getElementById("appTitle"),sub=document.getElementById("appSubtitle");
  const aba=TABS[t]&&rotuloAba(t);
  if(h1){
    h1.textContent=aba||nomeCurto(currentStoreName||"");
    /* SÓ edita no modo edição — antes ficava sempre editável e ela renomeou a aba
       sem querer só de clicar (aconteceu em 19/07: "Quadro Geral" virou "[loja-B]") */
    if(aba&&MODO_EDICAO){
      h1.contentEditable="plaintext-only";h1.classList.add("editando");
      h1.title="Escreva o novo nome deste quadro";
      h1.onblur=()=>renomearAba(t,h1.textContent);
      h1.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();h1.blur();}
        if(e.key==="Escape"){h1.textContent=rotuloAba(t);h1.blur();}};
    }else{h1.contentEditable="false";h1.classList.remove("editando");
      h1.onblur=h1.onkeydown=null;h1.title=MODO_EDICAO?"":"Para renomear: menu ⋯ → Editar os textos do site";}
  }
  if(sub)sub.innerHTML=currentStore
    ?`<span class="loja-pill"${MODO_EDICAO?` contenteditable="plaintext-only" title="Escreva o novo nome da empresa"
        onblur="renomearLojaCurto(this.textContent)"
        onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}"`
      :` title="Para renomear: menu ⋯ → Editar os textos do site"`}>${esc(nomeCurto(currentStoreName||""))}</span>`
    :"";
}

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
function getOne(id){return new Promise(r=>{const q=tx(STORE,"readonly").get(id);q.onsuccess=()=>r(q.result||null);q.onerror=()=>r(null);});}
/* Toda gravação passa por aqui — é por isso que o DESFAZER funciona no site inteiro:
   antes de gravar/apagar, guardamos como o item estava. */
async function putItem(o){
  if(HIST_LIGADO&&o&&o.id!==undefined)await histRegistrar({tipo:"put",id:o.id,antes:await getOne(o.id),depois:JSON.parse(JSON.stringify(o))});
  const id=await new Promise(r=>{const q=tx(STORE,"readwrite").put(o);q.onsuccess=()=>r(q.result);});
  if(HIST_LIGADO&&(o.id===undefined))await histRegistrar({tipo:"put",id,antes:null,depois:JSON.parse(JSON.stringify({...o,id}))});
  return id;
}
async function delDB(id){
  if(HIST_LIGADO)await histRegistrar({tipo:"del",id,antes:await getOne(id),depois:null});
  return new Promise(r=>{const q=tx(STORE,"readwrite").delete(id);q.onsuccess=()=>r();});
}

/* ===== DESFAZER / REFAZER (Ctrl+Z e Ctrl+Shift+Z, e os botões ← →) =====
   Guarda o que mudou em cada ação. Ações feitas juntas (ex.: alterar 5 demandas
   de uma vez) entram como UM passo só, para desfazer tudo de uma vez. */
let HIST=[],HIST_POS=-1,HIST_LIGADO=true,HIST_ATUAL=null,HIST_T=null;
const HIST_MAX=40;
async function histRegistrar(m){
  if(!HIST_ATUAL){HIST_ATUAL={quando:Date.now(),mudancas:[]};}
  HIST_ATUAL.mudancas.push(m);
  clearTimeout(HIST_T);
  HIST_T=setTimeout(histFechar,350);          /* o que acontece junto vira um passo só */
}
function histFechar(){
  if(!HIST_ATUAL||!HIST_ATUAL.mudancas.length){HIST_ATUAL=null;return;}
  HIST=HIST.slice(0,HIST_POS+1);
  HIST.push(HIST_ATUAL);
  if(HIST.length>HIST_MAX)HIST.shift();
  HIST_POS=HIST.length-1;HIST_ATUAL=null;
  atualizarBotoesHist();
}
function histRotulo(p){
  const n=p.mudancas.length;
  const criou=p.mudancas.filter(m=>!m.antes).length,apagou=p.mudancas.filter(m=>!m.depois).length;
  if(criou===n)return n===1?"criação":n+" criações";
  if(apagou===n)return n===1?"exclusão":n+" exclusões";
  return n===1?"alteração":n+" alterações";
}
async function histAplicar(passo,voltando){
  HIST_LIGADO=false;
  try{
    const mudancas=voltando?[...passo.mudancas].reverse():passo.mudancas;
    for(const m of mudancas){
      const alvo=voltando?m.antes:m.depois;
      if(alvo){await new Promise(r=>{const q=tx(STORE,"readwrite").put(alvo);q.onsuccess=()=>r();});}
      else{await new Promise(r=>{const q=tx(STORE,"readwrite").delete(m.id);q.onsuccess=()=>r();});}
    }
    DATA=await getAll();
    if(typeof renderDG==="function"&&currentTab==="dg")renderDG();
    if(typeof renderCk==="function"&&currentTab==="ck")renderCk();
    /* telas em tela cheia da aba Checklists: repintar, senão o desfazer muda o
       banco e a tela continua mostrando o valor velho */
    if(typeof ckRedesenhaPasso==="function")ckRedesenhaPasso();
    if(typeof ckRedesenhaLista==="function"&&document.getElementById("ck-constr"))ckRedesenhaLista();
    if(typeof renderNC==="function"&&currentTab==="nc")renderNC();
    if(typeof render==="function"&&(currentTab==="list"||currentTab==="add"))render();
    if(document.getElementById("view-home").style.display!=="none")await renderHome();
    if(window.syncSchedule)syncSchedule();
  }finally{HIST_LIGADO=true;}
}
async function desfazer(){
  histFechar();
  if(HIST_POS<0){toast("Nada para desfazer");return;}
  const p=HIST[HIST_POS];
  await histAplicar(p,true);HIST_POS--;atualizarBotoesHist();
  toast("Desfeito: "+histRotulo(p));
}
async function refazer(){
  histFechar();
  if(HIST_POS>=HIST.length-1){toast("Nada para refazer");return;}
  HIST_POS++;const p=HIST[HIST_POS];
  await histAplicar(p,false);atualizarBotoesHist();
  toast("Refeito: "+histRotulo(p));
}
function atualizarBotoesHist(){
  const d=document.getElementById("btDesfazer"),r=document.getElementById("btRefazer");
  const dm=document.getElementById("btDesfazerM");
  if(dm){dm.disabled=HIST_POS<0;dm.title=HIST_POS<0?"Nada para desfazer":"Desfazer "+histRotulo(HIST[HIST_POS]);}
  if(d){d.disabled=HIST_POS<0;d.title=HIST_POS<0?"Nada para desfazer":"Desfazer "+histRotulo(HIST[HIST_POS])+" (Ctrl+Z)";}
  if(r){r.disabled=HIST_POS>=HIST.length-1;r.title=HIST_POS>=HIST.length-1?"Nada para refazer":"Refazer (Ctrl+Shift+Z)";}
}
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
 setTimeout(aplicarTextos,0);
 renderRtInfo();
 const vivos=DATA.filter(d=>!d.deleted);
 const lb=await metaGet("lastBackup");
 /* estado do backup automático em pasta */
 let autoOk=false,backupInfo="",backupBtns=`<button class="btn ghost sm" onclick="exportExcel()"><span data-txt="capa.fazerBackup">⬇ Fazer backup</span></button>`;
 if(window.showDirectoryPicker){
   const dirH=await metaGet("backupDir");
   if(!dirH)backupBtns+=` <button class="btn ghost sm" onclick="setupAutoBackup()"><span data-txt="capa.autoBackup">⚙ Ativar automático</span></button>`;
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
   <div class="card"><div class="lbl" data-txt="capa.pendTitulo">PENDÊNCIAS DE CONFIGURAÇÃO</div>
     <div class="val accent">${pendAbertas.length}</div>
     <div class="sub" style="margin-top:2px">${pendAbertas.length===1?"pendência em aberto":"pendências em aberto"}</div>
     <div class="sub" style="margin-top:10px;line-height:1.5"><b><span data-txt="capa.ondeParamos">Onde paramos</span>${quando}:</b><br>${ondeParamos}</div>
     <div style="margin-top:10px"><button class="btn ghost sm" onclick="gerirPendencias()"><span data-txt="capa.verLista">📋 Ver lista completa</span></button></div></div>`;
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
       <div class="store-title">${esc(emp.name)} (${esc(emp.code)})</div>
       <div class="store-sub">${pend} pendente${pend===1?"":"s"} · ${done} concluído${done===1?"":"s"}</div>
     </div>
     <div class="store-toggle-wrap">
       <label class="switch" title="Ativar/desativar empresa"><input type="checkbox" aria-label="Ativar ou desativar empresa" ${emp.ativa?"checked":""} onchange="onToggleEmpresa('${emp.code}',this.checked)"><span class="slider"></span></label>
       <span class="store-toggle-label ${emp.ativa?"on":"off"}">${emp.ativa?"Ativa":"Inativa"}</span>
     </div>
     <button class="btn ghost sm" title="Renomear empresa" onclick="renameEmpresa('${emp.code}')">✎</button>
     <button class="btn ghost sm" title="Excluir empresa" onclick="removeEmpresa('${emp.code}')">🗑</button>
     ${emp.ativa
       ?`<button class="btn iniciar" onclick="enterStore('${emp.code}')">Iniciar →</button>`
       :`<span class="btn iniciar off" title="Ative a empresa no botão ao lado para poder entrar">🔒</span>`}
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
 /* dentro das abas o nome vai CURTO ("[loja-B]"); o completo fica só na Capa */
 document.getElementById("appTitle").textContent=nomeCurto(e.name);
 currentStoreName=nomeCurto(e.name);
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
   <div class="card"><div class="lbl" data-txt="cards.total">Total de itens</div><div class="sub">nesta empresa</div><div class="val">${total}</div></div>
   <div class="card"><div class="lbl" data-txt="cards.pend">Pendentes</div><div class="sub">aguardando</div><div class="val accent">${pend}</div></div>
   <div class="card"><div class="lbl" data-txt="cards.done">Concluídos</div><div class="sub">resolvidos</div><div class="val green">${done}</div></div>`;}

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
/* ===== ORDEM DE SERVIÇO (ideia do exemplo "print records" do Airtable) =====
   Folha para entregar em mãos ao executor: o que fazer, onde, com espaço para
   ele assinar quando terminar. Sai do filtro atual da tabela. */
function ordemDeServico(){
  const rows=linhasFiltradas().filter(d=>isPendente(d));
  if(!rows.length){alert("Nenhum item pendente no filtro atual.");return;}
  const loja=(empresa(currentStore)||{}).name||currentStore;
  const porExec={};
  for(const d of rows){const e=d.executor||"Sem responsável definido";(porExec[e]=porExec[e]||[]).push(d);}
  let corpo="";
  for(const exec of Object.keys(porExec).sort()){
    const itens=porExec[exec];
    corpo+=`<section><div class="cab"><h2>${esc(exec)}</h2><span>${itens.length} serviço${itens.length===1?"":"s"}</span></div>
      <table><thead><tr><th class="c">Feito</th><th>Área</th><th>O que fazer</th><th class="d">Prazo/Obs.</th></tr></thead><tbody>
      ${itens.map(d=>`<tr>
        <td class="c"><span class="bx"></span></td>
        <td>${esc(d.area||"—")}</td>
        <td><b>${esc(d.nc||"")}</b>${d.acao?`<div class="ac">${esc(d.acao)}</div>`:""}</td>
        <td class="d">${d.relato?brDate(d.relato):""}</td></tr>`).join("")}
      </tbody></table>
      <div class="ass"><div><span></span>Assinatura de ${esc(exec)}</div><div><span></span>Data de conclusão</div></div>
      </section>`;
  }
  const w=window.open("");
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
  <title>Ordem de Serviço — ${esc(loja)}</title><style>
  @page{margin:14mm}
  body{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#2d2e3a;font-size:12px;margin:0}
  h1{font-size:21px;margin:0 0 2px}
  .top{color:#8a8b96;font-size:11px;margin-bottom:20px}
  section{break-inside:avoid;margin-bottom:26px}
  .cab{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #1d6b57;padding-bottom:5px;margin-bottom:9px}
  .cab h2{font-size:15px;color:#1d6b57;margin:0}
  .cab span{font-size:11px;color:#8a8b96}
  table{width:100%;border-collapse:collapse}
  th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#8a8b96;border-bottom:1px solid #ddd;padding:5px 6px}
  td{padding:8px 6px;border-bottom:1px solid #eee;vertical-align:top}
  .c{width:44px;text-align:center}
  .d{width:92px;color:#8a8b96;font-size:11px}
  .bx{display:inline-block;width:13px;height:13px;border:1.5px solid #555;border-radius:2px}
  .ac{color:#047857;font-size:11px;margin-top:3px}
  .ass{display:flex;gap:34px;margin-top:16px}
  .ass div{flex:1;font-size:10px;color:#8a8b96}
  .ass span{display:block;border-bottom:1px solid #999;height:26px;margin-bottom:3px}
  .noprint{margin-bottom:14px}
  @media print{.noprint{display:none}}
  </style></head><body>
  <div class="noprint"><button onclick="print()" style="padding:8px 14px;cursor:pointer;font-size:13px">🖨 Imprimir / Salvar PDF</button></div>
  <h1>Ordem de Serviço</h1>
  <div class="top">${esc(loja)} · ${rows.length} serviço${rows.length===1?"":"s"} pendente${rows.length===1?"":"s"} · emitida em ${brDate(today())} · RT: ${esc(RT_INFO||RT_DEFAULT)}</div>
  ${corpo}</body></html>`);
  w.document.close();
}

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
 /* textos personalizados por ela valem em toda tela nova */
 setTimeout(aplicarTextos,0);
 const tab=TABS[t]||TABS.dg;
 currentTab=t;
 if(tab.tipo)currentTipo=tab.tipo;
 document.querySelectorAll(".tab-panel").forEach(p=>p.style.display="none");
 const hub=document.getElementById("view-hub");if(hub)hub.style.display="none";
 document.getElementById("cards").style.display="";
 document.getElementById("tabs").style.display="";
 document.getElementById(tab.panel).style.display="block";
 renderRailTabs();   /* redesenha para as seções da aba atual aparecerem recuadas */
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
/* BUG CORRIGIDO EM 20/07: aqui se lia window.DG_PRIOS, window.NC_URG etc.
   Variável declarada com let/const NÃO vira propriedade de window — então as três
   davam sempre "undefined" e as opções que ela configurou (nomes e cores de
   prioridade, situação e urgência da NC) NUNCA entravam no backup nem na
   sincronização, sem nenhum erro aparecer na tela. Só ficavam no aparelho de origem.
   LIÇÃO: em script clássico, `let X` no topo do arquivo não é `window.X` —
   para enxergar uma global de outro arquivo, usar typeof. */
const temDG=()=>typeof DG_PRIOS!=="undefined";
const modDG=()=>typeof DG_OPC_MOD!=="undefined"?(DG_OPC_MOD||""):"";
const temNC=()=>typeof NC_URG!=="undefined";
const modNC=()=>typeof NC_URG_MOD!=="undefined"?(NC_URG_MOD||""):"";
const temCK=()=>typeof CK_TIPOS!=="undefined";
const modCK=()=>typeof CK_OPC_MOD!=="undefined"?(CK_OPC_MOD||""):"";
function buildBackupEnvelope(){return {versao:4,exportadoEm:nowISO(),empresasMod:EMPRESAS_MOD,empresas:EMPRESAS,pendenciasMod:PENDENCIAS_MOD,pendencias:PENDENCIAS,rtInfo:RT_INFO,rtInfoMod:RT_INFO_MOD,abaNomes:ABA_NOMES,abaNomesMod:ABA_NOMES_MOD,textos:TEXTOS,textosMod:TEXTOS_MOD,dgOpcoes:temDG()?{prios:DG_PRIOS,sits:DG_SIT,papeis:{concluido:DG_CHAVE_CONCLUIDO,andamento:DG_CHAVE_ANDAMENTO,urgente:DG_CHAVE_URGENTE}}:null,dgOpcoesMod:modDG(),ncUrgencias:temNC()?JSON.parse(JSON.stringify(NC_URG)):null,ncUrgenciasMod:modNC(),ckOpcoes:temCK()?{tipos:CK_TIPOS,coment:CK_COMENT,foto:CK_FOTO,listas:CK_LISTAS}:null,ckOpcoesMod:modCK(),areasMod:AREAS_MOD,areas:AREAS_ALL,itens:DATA};}

function buildCsvGeral(){
 const head=["Aba","Empresa","Área","Não Conformidade / Demanda","Ação Corretiva","Responsável Técnica","Executor","Data do Relato","Data de Atualização","Status"];
 const rows=DATA.filter(d=>!d.deleted&&d.tipo!=="nc").map(d=>[rotuloTipo(d.tipo||"mnt"),d.loja,d.area,d.nc,d.acao,d.rt,d.executor,brDate(d.relato),brDate(d.atualizacao),d.status]);
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
  /* SEGURANÇA (19/07): antes isto apagava tudo sem alternativa. Agora ela escolhe,
     e JUNTAR é o padrão — importar por engano não pode custar os dados dela. */
  const juntar=confirm(
    "O arquivo tem "+arr.length+" itens. Você tem "+DATA.filter(d=>!d.deleted).length+" itens hoje.\n\n"+
    "OK = JUNTAR os dois (o que já existe é mantido; itens repetidos não duplicam)\n"+
    "Cancelar = escolher a outra opção");
  if(!juntar){
    if(!confirm("SUBSTITUIR TUDO?\n\nSeus "+DATA.filter(d=>!d.deleted).length+
      " itens atuais serão APAGADOS e ficará só o conteúdo do arquivo.\n\nTem certeza?"))return;
    if(!confirm("Última confirmação: isso não tem como desfazer.\n\nApagar tudo e usar só o arquivo?"))return;
    for(const d of DATA)await delDB(d.id);DATA=[];
  }
  if(!Array.isArray(parsed)&&Array.isArray(parsed.empresas)){
    for(const em of parsed.empresas){if(em&&em.code&&!empresa(em.code))EMPRESAS.push({code:em.code,name:em.name||em.code,ativa:em.ativa!==false});}
    await saveEmpresas();
  }
  if(!Array.isArray(parsed)&&Array.isArray(parsed.pendencias)){
    PENDENCIAS=parsed.pendencias;await savePendencias();
  }
  let novaEmp=false,novos=0,pulados=0;
  const jaTenho=new Set(DATA.map(d=>d.uid));
  for(const o of arr){const {id,...rest}=o;
   if(!rest.tipo)rest.tipo="mnt";if(!rest.uid)rest.uid=newUid();if(!rest.mod)rest.mod=nowISO();
   if(jaTenho.has(rest.uid)){pulados++;continue;}          /* não duplica ao juntar */
   /* o código do GRUPO (ex.: SF) não é empresa — não pode virar uma linha na capa */
   if(rest.loja&&rest.loja!==GRUPO_SF&&!empresa(rest.loja)){EMPRESAS.push({code:rest.loja,name:rest.loja,ativa:true});novaEmp=true;}
   const nid=await putItem(rest);rest.id=nid;DATA.push(rest);jaTenho.add(rest.uid);novos++;}
  if(novaEmp)await saveEmpresas();
  fillLojaSelects();
  toast(novos+(novos===1?" item importado":" itens importados")+(pulados?" · "+pulados+" já estavam aqui":"")+" ✓");
  render();if(typeof renderDG==="function")renderDG();dataChanged();
 }catch(err){alert("Não consegui ler este arquivo.\n\nEste botão aceita apenas o arquivo .json de backup"
   +" gerado por este próprio site (botão \"⬇ Fazer backup\" na capa).\n\n"
   +"Planilhas (.xlsx/.csv), PDF e Word não entram por aqui.");}e.target.value="";}

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
 const peso=t=>{const l=semAcento(rotuloAba(t));
   if(l.startsWith(q))return 0;
   if(l.split(/[\s·\-]+/).some(p=>p.startsWith(q)))return 1;
   return 2;};
 PAL_ITENS=TAB_ORDER.filter(t=>!q||semAcento(rotuloAba(t)).includes(q));
 if(q)PAL_ITENS.sort((a,b)=>peso(a)-peso(b));
 PAL_SEL=0;paletteDraw();
}
function paletteDraw(){
 const l=document.getElementById("palList");
 l.innerHTML=PAL_ITENS.length?PAL_ITENS.map((t,i)=>{const a=TABS[t];
   return `<div class="pal-item${i===PAL_SEL?" sel":""}" onclick="showTab('${t}');closePalette()">
     <span class="pal-ico" style="color:${a.cor}">${a.icone}</span>${esc(rotuloAba(t))}</div>`;}).join("")
   :`<div class="pal-item" style="color:var(--muted)">Nenhuma aba encontrada</div>`;
}
function paletteMove(d){if(!PAL_ITENS.length)return;PAL_SEL=(PAL_SEL+d+PAL_ITENS.length)%PAL_ITENS.length;paletteDraw();}
function paletteEnter(){const t=PAL_ITENS[PAL_SEL];if(t){showTab(t);closePalette();}}
function initAtalhos(){
 document.addEventListener("keydown",e=>{
   /* desfazer/refazer valem no site inteiro — menos enquanto ela digita num campo */
   const digitando=/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)
     ||document.activeElement.isContentEditable;
   if((e.ctrlKey||e.metaKey)&&(e.key==="z"||e.key==="Z")&&!digitando){
     e.preventDefault();e.shiftKey?refazer():desfazer();return;}
   if((e.ctrlKey||e.metaKey)&&(e.key==="y"||e.key==="Y")&&!digitando){e.preventDefault();refazer();return;}
   /* Esc fecha o modo foco da demanda antes de qualquer outra coisa */
   if(e.key==="Escape"&&document.getElementById("dg-foco-tela")){e.preventDefault();dgFocoFechar();return;}
   const aberto=document.getElementById("palOverlay").style.display==="flex";
   if((e.ctrlKey||e.metaKey)&&(e.key==="k"||e.key==="K")){e.preventDefault();aberto?closePalette():openPalette();return;}
   if(!aberto)return;
   if(e.key==="Escape"){e.preventDefault();closePalette();}
   else if(e.key==="ArrowDown"){e.preventDefault();paletteMove(1);}
   else if(e.key==="ArrowUp"){e.preventDefault();paletteMove(-1);}
   else if(e.key==="Enter"){e.preventDefault();paletteEnter();}
 });
}

/* ===== MAPA DO SITE — como tudo se liga, em português, para Lê poder mexer sozinha.
   Ideia tirada do exemplo "base schema" do Airtable (diagrama da estrutura).
   Isto atende a pendência de AUTONOMIA: entender o próprio site sem depender de ninguém. ===== */
function mapaDoSite(){
  const vivos=DATA.filter(d=>!d.deleted);
  const cont=t=>vivos.filter(d=>d.tipo===t).length;
  const emp=EMPRESAS.map(e=>`<li><b>${esc(e.name)}</b> (${esc(e.code)})${e.grupo?` · grupo <b>${esc(e.grupo)}</b>`:" · sem grupo (agenda própria)"}${e.ativa?"":" · inativa"}</li>`).join("");
  const abas=TAB_ORDER.map(t=>`<li><b>${esc(rotuloAba(t))}</b> — guarda itens do tipo <code>${esc(TABS[t].tipo||"—")}</code>, aparece no quadro de entrada: ${TABS[t].hub?"sim":"não"}</li>`).join("");
  ncModal(`<h2 style="margin-bottom:4px">🗺 Mapa do site</h2>
  <p class="desc">Como as peças se ligam. Serve para você mexer no site sozinha — e para explicar a quem for te ajudar.</p>

  <div class="mapa-cx"><h3>1. Onde os dados moram</h3>
    <ul>
      <li><b>Neste navegador</b> — tudo fica gravado aqui dentro (IndexedDB <code>banco_nc_v3_base</code>). Funciona sem internet.</li>
      <li><b>No repositório privado</b> <code>banco-demandas-dados</code> (arquivo <code>banco.json</code>) — é a cópia que viaja entre Lenovo, iPhone e Samsung.</li>
      <li><b>No site público</b> <code>banco-demandas</code> — só o código (as telas). <b>Nenhum dado seu fica aqui.</b></li>
    </ul></div>

  <div class="mapa-cx"><h3>2. Suas empresas</h3><ul>${emp}</ul>
    <p class="mapa-nota">Empresas do mesmo <b>grupo</b> dividem a agenda do Quadro Geral. Empresa nova nasce sem grupo, com agenda só dela.</p></div>

  <div class="mapa-cx"><h3>3. As abas</h3><ul>${abas}</ul>
    <p class="mapa-nota">Para criar uma aba nova, mexe-se em <code>js/app.js</code>: uma linha em <code>TABS</code>, uma em <code>TAB_ORDER</code> e um painel no <code>index.html</code>. O resto (quadro de entrada, barra lateral, Ctrl+K) se atualiza sozinho.</p></div>

  <div class="mapa-cx"><h3>4. O que você tem hoje</h3>
    <ul>
      <li>Quadro Geral: <b>${cont("dg")}</b> demandas</li>
      <li>Relatório de Não Conformidade: <b>${cont("nc")}</b> itens</li>
      <li>Manutenções e Elétrica: <b>${cont("mnt")}</b> itens</li>
      <li>Pendências de configuração: <b>${PENDENCIAS.filter(p=>!p.feita).length}</b> em aberto</li>
    </ul></div>

  <div class="mapa-cx"><h3>5. Os arquivos do site</h3>
    <ul>
      <li><code>index.html</code> — o esqueleto das telas</li>
      <li><code>css/app.css</code> — todas as cores, tamanhos e espaçamentos</li>
      <li><code>js/app.js</code> — o núcleo: empresas, abas, banco, backup</li>
      <li><code>js/dg.js</code> — a aba Quadro Geral</li>
      <li><code>js/ck.js</code> — a aba Checklists (modelos de inspeção e preenchimentos)</li>
      <li><code>js/nc.js</code> — a aba de Não Conformidade e o relatório</li>
      <li><code>js/sync.js</code> — a sincronização entre aparelhos</li>
      <li><code>status.json</code> — o texto "onde paramos" que aparece na capa</li>
      <li><code>sw.js</code> — faz o site abrir sem internet</li>
    </ul>
    <p class="mapa-nota"><b>Regra de ouro ao publicar:</b> toda vez que se muda um arquivo, é preciso trocar o número de versão em duas partes — o <code>?v=</code> no <code>index.html</code> e o <code>CACHE</code> no <code>sw.js</code>. Sem isso, o site continua mostrando o formato antigo.</p></div>

  <div class="mapa-cx"><h3>6. Se você quiser sair do site um dia</h3>
    <ul>
      <li><b>⬇ Exportar Excel</b> (dentro de uma empresa) tira tudo em planilha.</li>
      <li><b>⬇ Fazer backup</b> (na capa) salva um arquivo com absolutamente tudo.</li>
      <li>Esse arquivo abre em qualquer computador, sem depender deste site nem de nenhuma inteligência artificial.</li>
    </ul></div>
  <div class="form-actions"><button class="btn" onclick="ncFechar()">Fechar</button></div>`);
}

/* (avatar/foto removidos a pedido da usuária em 17/07 — era só estético) */
let toastT;function toast(m){const t=document.getElementById("toast");t.textContent=m;t.classList.add("show");clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove("show"),2000);}

(async function(){await openDB();await seedIfEmpty();DATA=await getAll();
 /* migrações aditivas e idempotentes (nunca removem nada) */
 for(const d of DATA){
   let dirty=false;
   if(!d.tipo){d.tipo="mnt";dirty=true;}   /* itens antigos = Manutenções e Elétrica */
   if(!d.uid){d.uid=(d.criado==="inicial")?seedUid(d.area,d.nc,d.executor):newUid();dirty=true;}  /* estável p/ sync; seed = determinístico */
   /* limpeza: a importação do Notion trouxe restos de HTML como linha (ex.: "<tr>") */
   if(d.tipo==="dg"&&Array.isArray(d.itens)){
     const antes=d.itens.length;
     d.itens=d.itens.filter(i=>!/^\s*<\/?[a-z][^>]*>\s*$/i.test(i.texto||""));
     if(d.itens.length!==antes){d.mod=nowISO();dirty=true;}
   }
   /* 19/07: demandas gerais das lojas do grupo passam a ser do GRUPO (agenda única CF+AC) */
   if(d.tipo==="dg"&&d.loja!==GRUPO_SF&&(d.loja==="CF"||d.loja==="AC")&&!d.escopo){
     d.loja=GRUPO_SF;d.escopo="";d.mod=nowISO();dirty=true;}
   if(dirty)await putItem(d);
 }
 await loadEmpresas();await loadExecutores();await loadPendencias();await loadRtInfo();await loadAreasAll();await loadAbaNomes();await loadTextos();if(window.dgLoadOpcoes)await dgLoadOpcoes();if(window.ckLoadOpcoes)await ckLoadOpcoes();if(window.ncLoadUrgencias)await ncLoadUrgencias();await loadStatusSite();
 document.getElementById("fmData").value=today();
 renderTabs();fillExecSelects();initAtalhos();atualizarBotoesHist();
 goHome();
 if(window.syncInit)syncInit();
 /* PWA: service worker só em https (GitHub Pages); no file:// é ignorado */
 if("serviceWorker" in navigator&&location.protocol==="https:")
   navigator.serviceWorker.register("sw.js").catch(()=>{});
})();
