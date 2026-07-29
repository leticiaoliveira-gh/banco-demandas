const RT_DEFAULT="ResponsÃƒÂ¡vel TÃƒÂ©cnica";

/* ===== Empresas dinÃƒÂ¢micas (gerenciÃƒÂ¡veis pela Central de Empresas) ===== */
/* Grupo = conjunto de lojas que dividem a MESMA agenda de Demandas Gerais.
   Empresa nova nasce sem grupo; a pessoa liga o grupo pelo Ã¢Å“Å½ da empresa. */
const GRUPO_SF="SF";
let EMPRESAS=[],EMPRESAS_MOD="";
function grupoDe(code){const e=(EMPRESAS||[]).find(x=>x.code===code);return (e&&e.grupo)||"";}
function lojasDoGrupo(g){return (EMPRESAS||[]).filter(e=>e.grupo===g);}
async function loadEmpresas(){
 EMPRESAS_MOD=await metaGet("empresasMod")||"";
 let v=await metaGet("empresas");
 if(!v||!Array.isArray(v))v=[];
 EMPRESAS=v;
 /* faxina: o cÃƒÂ³digo de um grupo chegou a virar "empresa" numa importaÃƒÂ§ÃƒÂ£o Ã¢â‚¬â€ grupo
    nÃƒÂ£o ÃƒÂ© loja, nÃƒÂ£o pode aparecer na capa. (achado em 19/07) */
 const semGrupoFantasma=EMPRESAS.filter(e=>e.code!==GRUPO_SF);
 if(semGrupoFantasma.length!==EMPRESAS.length){
   EMPRESAS=semGrupoFantasma;EMPRESAS_MOD=nowISO();
   await metaSet("empresas",EMPRESAS);await metaSet("empresasMod",EMPRESAS_MOD);
 }
}
/* botÃƒÂ£o Ã¢â€“Â¶ Iniciar da capa: entra direto na (ÃƒÂºnica) empresa ativa */
function iniciarCentral(){
 const ativas=EMPRESAS.filter(e=>e.ativa);
 if(ativas.length===1){enterStore(ativas[0].code);return;}
 if(!ativas.length){toast("Ative a empresa em que vocÃƒÂª estÃƒÂ¡ para comeÃƒÂ§ar");return;}
 toast("Deixe ativa sÃƒÂ³ a empresa em que vocÃƒÂª estÃƒÂ¡ Ã¢â‚¬â€ aÃƒÂ­ o Ã¢â€“Â¶ Iniciar entra direto nela");
}
/* linha da ResponsÃƒÂ¡vel TÃƒÂ©cnica na capa (editÃƒÂ¡vel; entra no backup e na sincronizaÃƒÂ§ÃƒÂ£o) */
let RT_INFO="",RT_INFO_MOD="";
async function loadRtInfo(){RT_INFO=await metaGet("rtInfo")||"";RT_INFO_MOD=await metaGet("rtInfoMod")||"";}
function renderRtInfo(){
 const el=document.getElementById("rt-linha");
 if(el)el.textContent="Ã°Å¸â€˜Â©Ã¢â‚¬ÂÃ¢Å¡â€¢Ã¯Â¸Â "+(RT_INFO||"Nome e registro profissional Ã‚Â· toque p/ preencher")+"  Ã¢Å“Å½";
}
/* Renomear a tela inicial. Ela cobriu em 20/07 ("NÃƒÆ’O CONSIGO EDITARRRR / dica: troca
   nome"): o modo ediÃƒÂ§ÃƒÂ£o existia, mas exigia ligar um botÃƒÂ£o antes Ã¢â‚¬â€ e nada na tela
   dizia isso. Renomear virou uma aÃƒÂ§ÃƒÂ£o direta, no mesmo padrÃƒÂ£o do Ã¢Å“Å½ da capa. */
async function renomearCapa(){
  const atual=txt("capa.titulo","Central de Empresas");
  const v=prompt("Como vocÃƒÂª quer chamar esta tela?\n\n(Ex.: Central de Empresas, CENTRAL, Painel, InÃƒÂ­cio)",atual);
  if(v===null)return;
  await setTexto("capa.titulo",v,"Central de Empresas");
  aplicarTextos();toast("Nome trocado Ã¢Å“â€œ Ã¢â‚¬â€ pode voltar atrÃƒÂ¡s na seta Ã¢â€ Â ou no Ctrl+Z");
}
async function editarRtInfo(){
 const v=prompt("InformaÃƒÂ§ÃƒÂµes da ResponsÃƒÂ¡vel TÃƒÂ©cnica (aparecem na capa):",RT_INFO||"Nome (Cargo Ã¢â‚¬â€ RT) Ã‚Â· Registro Profissional: ");
 if(v===null)return;
 RT_INFO=v.trim();RT_INFO_MOD=nowISO();
 await metaSetU("rtInfo",RT_INFO);await metaSetU("rtInfoMod",RT_INFO_MOD);
 dataChanged();renderRtInfo();toast("Atualizado Ã¢Å“â€œ");
}
function empresa(code){return EMPRESAS.find(e=>e.code===code);}
async function saveEmpresas(){EMPRESAS_MOD=nowISO();await metaSetU("empresas",EMPRESAS);await metaSetU("empresasMod",EMPRESAS_MOD);dataChanged();}

/* ===== ÃƒÂreas por empresa na SINCRONIZAÃƒâ€¡ÃƒÆ’O (espelho do meta areas_<code>) ===== */
let AREAS_ALL={},AREAS_MOD="";
async function loadAreasAll(){
 AREAS_MOD=await metaGet("areasMod")||"";
 AREAS_ALL={};
 for(const e of EMPRESAS){const v=await metaGet("areas_"+e.code);if(Array.isArray(v))AREAS_ALL[e.code]=v;}
}

/* ===== PendÃƒÂªncias de configuraÃƒÂ§ÃƒÂ£o (checklist "onde a conversa parou") =====
   Lista em tÃƒÂ³picos exibida na capa; entra no backup e na sincronizaÃƒÂ§ÃƒÂ£o. */
let PENDENCIAS=[],PENDENCIAS_MOD="";
/* status.json Ã¢â‚¬â€ "onde paramos", atualizado a cada publicaÃƒÂ§ÃƒÂ£o; o site lÃƒÂª sozinho ao abrir */
let STATUS_SITE=null;
async function loadStatusSite(){
 try{
   const r=await fetch("status.json?ts="+Date.now(),{cache:"no-store"});
   if(r.ok)STATUS_SITE=await r.json();
 }catch(e){}
}
const PENDENCIAS_INICIAIS=[];
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
async function savePendencias(){PENDENCIAS_MOD=nowISO();await metaSetU("pendencias",PENDENCIAS);await metaSetU("pendenciasMod",PENDENCIAS_MOD);dataChanged();}
function gerirPendencias(){
 const linhas=PENDENCIAS.map((p,i)=>
  `<div class="nc-area-row"><label style="display:flex;gap:9px;align-items:flex-start;cursor:pointer;font-weight:400;flex:1">
    <input type="checkbox" ${p.feita?"checked":""} style="width:auto;margin-top:3px" onchange="togglePendencia(${i},this.checked)">
    <span style="${p.feita?"text-decoration:line-through;color:var(--muted)":""}">${esc(p.texto)}</span></label>
   <button class="btn ghost sm" onclick="removePendencia(${i})">Ã°Å¸â€”â€˜</button></div>`).join("");
 ncModal(`
  <h2>Ã°Å¸â€œâ€¹ PendÃƒÂªncias de configuraÃƒÂ§ÃƒÂ£o</h2>
  <p class="desc">Tudo que ainda falta resolver no site, em tÃƒÂ³picos Ã¢â‚¬â€ marque quando concluir. A lista entra no backup e na sincronizaÃƒÂ§ÃƒÂ£o.</p>
  ${linhas||'<p class="desc">Nenhuma pendÃƒÂªncia Ã¢â‚¬â€ tudo resolvido Ã¢Å“â€œ</p>'}
  <div class="field" style="margin-top:14px"><label>Nova pendÃƒÂªncia</label><input id="pend-nova" placeholder="Descreva o que falta resolver..."></div>
  <div class="form-actions">
   <button class="btn" onclick="addPendencia()">Adicionar</button>
   <button class="btn ghost" onclick="ncFechar()">Fechar</button>
  </div>`);
}
async function togglePendencia(i,val){if(!PENDENCIAS[i])return;PENDENCIAS[i].feita=!!val;await savePendencias();gerirPendencias();renderHome();}
async function addPendencia(){
 const t=document.getElementById("pend-nova").value.trim();if(!t)return;
 PENDENCIAS.push({uid:newUid(),texto:t,feita:false});
 await savePendencias();gerirPendencias();renderHome();toast("PendÃƒÂªncia adicionada Ã¢Å“â€œ");}
async function removePendencia(i){
 if(!PENDENCIAS[i])return;
 if(!confirm("Excluir esta pendÃƒÂªncia?\n\n"+PENDENCIAS[i].texto))return;
 PENDENCIAS.splice(i,1);await savePendencias();gerirPendencias();renderHome();}

/* ===== Executores gerenciÃƒÂ¡veis (lista ÃƒÂºnica para todas as empresas) ===== */
let EXECUTORES=[],EXECUTORES_MOD="";
async function loadExecutores(){
 let v=await metaGet("executores");
 if(!v||!Array.isArray(v))v=[];
 EXECUTORES=v;EXECUTORES_MOD=await metaGet("executoresMod")||"";
}
async function saveExecutores(){EXECUTORES_MOD=nowISO();
 await metaSetU("executores",EXECUTORES);await metaSetU("executoresMod",EXECUTORES_MOD);dataChanged();}
function execOptionsHTML(sel){
 const extra=sel&&sel!=="Outro"&&!EXECUTORES.some(e=>e.nome===sel)?`<option selected>${esc(sel)}</option>`:"";
 return extra+EXECUTORES.map(e=>`<option value="${esc(e.nome)}" ${e.nome===sel?"selected":""}>${esc(e.nome)}</option>`).join("")
  +`<option ${sel==="Outro"?"selected":""}>Outro</option>`;
}
function fillExecSelects(){
 const f=document.getElementById("fExec"),cur=f.value;
 f.innerHTML='<option value="">Todos os responsÃƒÂ¡veis</option>'
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
   <span><button class="btn ghost sm" onclick="renameExecutor(${i})">Ã¢Å“Å½</button>
   <button class="btn ghost sm" onclick="removeExecutor(${i})">Ã°Å¸â€”â€˜</button></span></div>`).join("");
 ncModal(`
  <h2>Ã°Å¸â€˜Â· Executores</h2>
  <p class="desc">Lista ÃƒÂºnica, usada nas duas empresas. "Outro" estÃƒÂ¡ sempre disponÃƒÂ­vel.</p>
  ${linhas||'<p class="desc">Nenhum executor.</p>'}
  <div class="grid2" style="margin-top:14px">
   <div class="field"><label>Nome</label><input id="ex-nome" placeholder="Ex.: Carlos"></div>
   <div class="field"><label>FunÃƒÂ§ÃƒÂ£o</label><input id="ex-funcao" placeholder="Ex.: RefrigeraÃƒÂ§ÃƒÂ£o"></div>
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
 if(EXECUTORES.some(e=>e.nome.toLowerCase()===nome.toLowerCase())||nome==="Outro"){alert("Esse executor jÃƒÂ¡ existe.");return;}
 EXECUTORES.push({nome,funcao});
 await saveExecutores();fillExecSelects();toast("Executor adicionado Ã¢Å“â€œ");gerirExecutores();render();
}
async function renameExecutor(i){
 const e=EXECUTORES[i];if(!e)return;
 const novo=prompt("Novo nome para "+e.nome+":",e.nome);if(!novo||!novo.trim())return;
 const antigo=e.nome;e.nome=novo.trim();
 for(const d of DATA)if(d.executor===antigo){d.executor=e.nome;d.mod=nowISO();await putItem(d);}
 await saveExecutores();fillExecSelects();toast("Executor renomeado Ã¢Å“â€œ");gerirExecutores();render();
}
async function removeExecutor(i){
 const e=EXECUTORES[i];if(!e)return;
 if(DATA.some(d=>!d.deleted&&d.executor===e.nome)){
  alert("HÃƒÂ¡ itens atribuÃƒÂ­dos a "+e.nome+". Reatribua os itens antes de excluir.");return;}
 if(!confirm("Excluir o executor "+e.nome+"?"))return;
 EXECUTORES=EXECUTORES.filter((_,j)=>j!==i);
 await saveExecutores();fillExecSelects();toast("Executor excluÃƒÂ­do");gerirExecutores();render();
}

/* Tipos de item (rÃƒÂ³tulos usados no export e nos filtros) */
/* rÃƒÂ³tulo do tipo no CSV: segue o nome que ela deu ÃƒÂ  aba */
function rotuloTipo(t){const m={dg:"dg",nc:"nc",mnt:"list"};return rotuloAba(m[t]||t);}
let currentTipo="dg";
let currentTab="dg";
let currentStore=null,currentStoreName="";

/* ===== ÃƒÂcones das abas (SVG: herdam a cor da aba via currentColor) ===== */
const ICO={
  dg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z"/><rect x="4" y="6" width="16" height="15" rx="2"/><path d="M9 12h7M9 16h5"/></svg>',
  nc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 11v4M12 18h.01"/></svg>',
  mnt:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 1-5 5L4 17v3h3l5.7-5.7a4 4 0 0 1 5-5l-2.5 2.5 1.8 1.8L19.5 11a4 4 0 0 0-4.8-4.7z"/></svg>',
  ck:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1z"/><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8.5 12.5l2 2 4.5-4.5"/></svg>',
  ckq:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 6 6 .9-4.5 4.2 1.2 6.4L12 16.8 6.3 19.5l1.2-6.4L3 8.9 9 8z"/></svg>',
  add:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  hub:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>'
};
/* ===== Registro de abas =====
   Cada aba ÃƒÂ© um "projeto" independente: painel, subtÃƒÂ­tulo, cards e regras prÃƒÂ³prios.
   Para criar uma aba nova: 1 entrada aqui + em TAB_ORDER + um <div class="tab-panel"> no HTML.
   FONTE ÃƒÅ¡NICA: hub, barra lateral, barra do celular, abas de texto e a busca Ctrl+K
   sÃƒÂ£o todos gerados de TAB_ORDER Ã¢â‚¬â€ nunca escrever uma lista de abas em outro lugar.
   Campos visuais: icone (SVG), cor (cor forte), corFundo (pastel), hub (aparece no hub?). */
const TAB_ORDER=["dg","ck","ckq","nc","list","mnt28","ind","add"];
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
      onShow(){currentTipo="ckm";
        /* o que ÃƒÂ© cada ÃƒÂ¡rea (cÃƒÂ¢mara, banheiro, produÃƒÂ§ÃƒÂ£o) mora no meta e ÃƒÂ© por empresa */
        if(typeof ckAmbCarregar==="function")ckAmbCarregar().then(renderCk);else renderCk();}},
  ckq:{label:"Qualidade / BPF",tipo:"ckqm",panel:"tab-ckq",
      icone:ICO.ckq,cor:"#0f5b52",corFundo:"#e0efec",hub:true,
      subtitle:n=>"",
      renderCards(){document.getElementById("cards").innerHTML="";},
      onShow(){currentTipo="ckqm";
        const passo=()=>{if(typeof ckAmbCarregar==="function")ckAmbCarregar().then(renderCkq);else renderCkq();};
        if(typeof ckqCarregarSetores==="function")ckqCarregarSetores().then(passo);else passo();}},
  nc:{label:"RelatÃƒÂ³rio de NÃƒÂ£o Conformidade - GerÃƒÂªncia",tipo:"nc",panel:"tab-nc",
      icone:ICO.nc,cor:"#1668b8",corFundo:"#e7f0f9",hub:true,
      subtitle:n=>"RelatÃƒÂ³rio de NÃƒÂ£o Conformidade Ã¢â‚¬â€ GerÃƒÂªncia Ã¢â‚¬â€ "+n,
      onShow(){renderNC();}},
  list:{label:"ManutenÃƒÂ§ÃƒÂµes e ElÃƒÂ©trica",tipo:"mnt",panel:"tab-list",
      icone:ICO.mnt,cor:"#b3730a",corFundo:"#fdf0e0",hub:true,
      subtitle:n=>(EXECUTORES.length?EXECUTORES.map(e=>e.funcao+" ("+e.nome+")").join(" e "):"ManutenÃƒÂ§ÃƒÂµes e ElÃƒÂ©trica")+" Ã¢â‚¬â€ "+n,
      onShow(){configTableTab("mnt");}},
  /* MNT 28.07.26 (28/07): folha SÃƒâ€œ de manutenÃƒÂ§ÃƒÂ£o Ã¢â‚¬â€ obra, conserto, pintura,
     troca, instalaÃƒÂ§ÃƒÂ£o e limpeza pesada. Nasceu porque a folha antiga misturava
     qualidade com manutenÃƒÂ§ÃƒÂ£o e 180 itens de manipulador de alimento chegavam ÃƒÂ 
     mÃƒÂ£o de quem conserta. Aba nova, ao lado; a antiga continua intacta. */
  mnt28:{label:"MNT 28.07.26",tipo:"mnt28",panel:"tab-mnt28",
      icone:ICO.mnt,cor:"#155244",corFundo:"#e8f5f0",hub:true,
      subtitle:n=>"ManutenÃƒÂ§ÃƒÂ£o e Infraestrutura Ã¢â‚¬â€ "+n,
      renderCards(){document.getElementById("cards").innerHTML="";},
      onShow(){currentTipo="mnt28";if(typeof renderMnt28==="function")renderMnt28();}},
  ind:{label:"Indicadores",tipo:null,panel:"tab-ind",
      icone:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><rect x="5" y="12" width="3.4" height="7" rx="1"/><rect x="10.3" y="7" width="3.4" height="12" rx="1"/><rect x="15.6" y="10" width="3.4" height="9" rx="1"/></svg>',
      cor:"#0e7490",corFundo:"#e2f1f5",hub:true,
      subtitle:n=>"",
      renderCards(){document.getElementById("cards").innerHTML="";},
      onShow(){if(typeof renderInd==="function")renderInd();}},
  add:{label:"Adicionar Manualmente",tipo:null,panel:"tab-add",
      icone:ICO.add,cor:"#8a8b96",corFundo:"#f1f1f3",hub:false,
      subtitle:n=>"Cadastro manual de itens Ã¢â‚¬â€ "+n,
      onShow(){configAddTab();}}
};
const ABAS_HUB=()=>TAB_ORDER.filter(t=>TABS[t].hub);
/* ===== NOMES DAS ABAS EDITÃƒÂVEIS (regra fixa de LÃƒÂª: TUDO ÃƒÂ© editÃƒÂ¡vel) =====
   O nome que ela escrever vence o nome de fÃƒÂ¡brica, e viaja entre os aparelhos. */
let ABA_NOMES={},ABA_NOMES_MOD="";
async function loadAbaNomes(){ABA_NOMES=await metaGet("abaNomes")||{};ABA_NOMES_MOD=await metaGet("abaNomesMod")||"";}
function rotuloAba(t){return (ABA_NOMES&&ABA_NOMES[t])||(TABS[t]&&TABS[t].label)||t;}
async function renomearAba(t,novo){
  novo=String(novo||"").trim();if(!novo||novo===rotuloAba(t))return;
  ABA_NOMES[t]=novo;ABA_NOMES_MOD=nowISO();
  await metaSetU("abaNomes",ABA_NOMES);await metaSetU("abaNomesMod",ABA_NOMES_MOD);
  renderTabs();updateSubtitle(currentTab);dataChanged();toast("Nome do quadro atualizado Ã¢Å“â€œ");
}
/* ===== LINHA LIVRE DE CADA QUADRO (regra de LÃƒÂª, 20/07: "tÃƒÂ­tulos independentes") =====
   Embaixo do tÃƒÂ­tulo de cada aba ela escreve o que quiser Ã¢â‚¬â€ igual ao Notion.
   Ãƒâ€° CONTEÃƒÅ¡DO dela, entÃƒÂ£o edita direto no clique (nÃƒÂ£o precisa do modo ediÃƒÂ§ÃƒÂ£o);
   o que exige modo ediÃƒÂ§ÃƒÂ£o ÃƒÂ© a CONFIGURAÃƒâ€¡ÃƒÆ’O (nome do quadro, nome da empresa).
   Chave "hub" = a linha da tela de entrada da empresa. Viaja no backup e na sync. */
let ABA_SUB={},ABA_SUB_MOD="";
async function loadAbaSub(){ABA_SUB=await metaGet("abaSub")||{};ABA_SUB_MOD=await metaGet("abaSubMod")||"";}
async function setAbaSub(chave,valor){
  valor=String(valor||"").trim();
  if(valor===(ABA_SUB[chave]||""))return;
  if(valor)ABA_SUB[chave]=valor;else delete ABA_SUB[chave];
  ABA_SUB_MOD=nowISO();
  await metaSetU("abaSub",ABA_SUB);await metaSetU("abaSubMod",ABA_SUB_MOD);
  dataChanged();toast("Salvo Ã¢Å“â€œ");
}

/* ===== TEXTOS DO SITE EDITÃƒÂVEIS =====
   Regra fixa de LÃƒÂª: tudo tem de ser editÃƒÂ¡vel por ela, sem mexer em cÃƒÂ³digo.
   Todo texto que ela pode trocar passa por txt("chave","texto de fÃƒÂ¡brica") e/ou
   carrega data-txt="chave" no HTML. O MODO EDIÃƒâ€¡ÃƒÆ’O liga a caneta em todos de uma vez. */
let TEXTOS={},TEXTOS_MOD="",MODO_EDICAO=false;
async function loadTextos(){TEXTOS=await metaGet("textos")||{};TEXTOS_MOD=await metaGet("textosMod")||"";}
function txt(chave,padrao){const v=TEXTOS&&TEXTOS[chave];return (v===undefined||v==="")?padrao:v;}
async function setTexto(chave,valor,padrao){
  valor=String(valor||"").trim();
  if(!valor||valor===padrao){delete TEXTOS[chave];}else{TEXTOS[chave]=valor;}
  TEXTOS_MOD=nowISO();
  await metaSetU("textos",TEXTOS);await metaSetU("textosMod",TEXTOS_MOD);
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
  /* placeholders tambÃƒÂ©m sÃƒÂ£o editÃƒÂ¡veis, pelo atributo */
  (raiz||document).querySelectorAll("[data-txt-ph]").forEach(el=>{
    const k=el.dataset.txtPh;
    if(el.dataset.padraoPh===undefined)el.dataset.padraoPh=el.placeholder||"";
    el.placeholder=txt(k,el.dataset.padraoPh);
  });
}
function ligarEdicao(el){
  el.contentEditable="plaintext-only";el.classList.add("editando");
  el.title="Clique e escreva o texto que vocÃƒÂª quiser";
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
  /* o cabeÃƒÂ§alho segue o modo Ã¢â‚¬â€ no hub, currentTab ÃƒÂ© nulo, entÃƒÂ£o redesenha o hub */
  if(currentStore&&!currentTab&&document.getElementById("view-hub")?.style.display==="block")showHub();
  else updateSubtitle(currentTab);
  toast(MODO_EDICAO?"Modo ediÃƒÂ§ÃƒÂ£o LIGADO Ã¢â‚¬â€ clique em qualquer texto para trocar"
                   :"Modo ediÃƒÂ§ÃƒÂ£o desligado");
  if(MODO_EDICAO)barraModoEdicao();else{const b=document.getElementById("barraEdicao");if(b)b.remove();}
}
function barraModoEdicao(){
  if(document.getElementById("barraEdicao"))return;
  const b=document.createElement("div");b.id="barraEdicao";b.className="barra-edicao";
  b.innerHTML=`<b>Ã¢Å“ÂÃ¯Â¸Â Modo ediÃƒÂ§ÃƒÂ£o ligado</b>
    <span>Clique em qualquer texto marcado e escreva. Enter confirma, Esc cancela.</span>
    <button class="btn ghost sm" onclick="restaurarTextos()">Ã¢â€ Âº Restaurar os originais</button>
    <button class="btn sm" onclick="toggleModoEdicao()">Ã¢Å“â€œ Concluir</button>`;
  document.body.appendChild(b);
}
async function restaurarTextos(){
  if(!Object.keys(TEXTOS).length){toast("Nenhum texto foi trocado ainda");return;}
  if(!confirm("Restaurar TODOS os textos do site para o original?\n\n"
    +Object.keys(TEXTOS).length+" texto(s) que vocÃƒÂª escreveu serÃƒÂ£o desfeitos."))return;
  TEXTOS={};TEXTOS_MOD=nowISO();
  await metaSetU("textos",TEXTOS);await metaSetU("textosMod",TEXTOS_MOD);
  document.querySelectorAll("[data-txt]").forEach(el=>{if(el.dataset.padrao!==undefined)el.textContent=el.dataset.padrao;});
  aplicarTextos();dataChanged();toast("Textos restaurados Ã¢Å“â€œ");
}

/* nome da loja editÃƒÂ¡vel na pÃƒÂ­lula (mantÃƒÂ©m o sufixo da rede que vier depois do "Ã‚Â·") */
async function renomearLojaCurto(novo){
  const e=empresa(currentStore);if(!e)return;
  novo=String(novo||"").trim();if(!novo)return;
  const resto=e.name.includes("Ã‚Â·")?" Ã‚Â·"+e.name.split("Ã‚Â·").slice(1).join("Ã‚Â·"):"";
  const completo=novo+resto;
  if(completo===e.name)return;
  e.name=completo;currentStoreName=nomeCurto(completo);
  await saveEmpresas();fillLojaSelects();updateSubtitle(currentTab);toast("Empresa renomeada Ã¢Å“â€œ");
}
/* "Nome da loja Ã‚Â· Nome da rede" -> "Nome da loja" (usado dentro das abas) */
function nomeCurto(n){return String(n||"").split("Ã‚Â·")[0].trim()||String(n||"");}
/* A barra de abas de TEXTO foi removida a pedido de LÃƒÂª (19/07: "estÃƒÂ¡ poluÃƒÂ­do").
   A navegaÃƒÂ§ÃƒÂ£o vive na barra lateral (ÃƒÂ­cones), na barra do celular, no hub e no Ctrl+K. */
function renderTabs(){renderRailTabs();renderMobileNav();}
/* ===== Hub de cards (porta de entrada da empresa) ===== */
function renderHub(){
  const box=document.getElementById("hub-grid");if(!box)return;
  /* MODO CADERNO (25/07, escolha dela): cada quadro ÃƒÂ© uma folha de caderno que jÃƒÂ¡
     mostra como estÃƒÂ¡ a coisa Ã¢â‚¬â€ quantos faltam, barrinha e selo escrito.
     As peÃƒÂ§as vÃƒÂªm PRONTAS da biblioteca (biblioteca/pecas.css, classes bd-*):
     bd-card / bd-card-faixa / bd-card-icone / bd-selo / bd-barra. Nada do zero. */
  const vivos=DATA.filter(d=>!d.deleted&&d.loja===currentStore);
  box.innerHTML=ABAS_HUB().map(t=>{const a=TABS[t];
    const meus=a.tipo?vivos.filter(d=>d.tipo===a.tipo):[];
    const pend=meus.filter(isPendente).length, done=meus.filter(isConcluido).length;
    const tot=pend+done, pct=tot?Math.round(done/tot*100):0;
    const urg=a.tipo==="nc"?meus.filter(d=>d.urgencia==="URGENTE"&&isPendente(d)).length:0;
    /* o selo SEMPRE tem palavra escrita Ã¢â‚¬â€ a cor nunca conta a histÃƒÂ³ria sozinha */
    let selo="";
    if(!a.tipo)                selo=`<span class="bd-selo bd-selo-neutro"><i></i>quadro</span>`;
    else if(urg)               selo=`<span class="bd-selo bd-selo-erro"><i></i>${urg} urgente${urg===1?"":"s"}</span>`;
    else if(pend)              selo=`<span class="bd-selo bd-selo-atencao"><i></i>${pend} em aberto</span>`;
    else if(tot)               selo=`<span class="bd-selo bd-selo-ok"><i></i>em dia</span>`;
    else                       selo=`<span class="bd-selo bd-selo-neutro"><i></i>vazio</span>`;
    return `<button class="bd-card bd-card-clique hub-livro" data-hub="${t}"
        onclick="showTab('${t}')" title="Abrir ${esc(rotuloAba(t))}">
      <span class="bd-card-faixa" style="background:${a.cor}"></span>
      <span class="hub-livro-corpo">
        <span class="hub-livro-cab">
          <span class="hub-livro-ico" aria-hidden="true" style="background:${a.corFundo};color:${a.cor}">${a.icone}</span>
          ${selo}
        </span>
        <span class="bd-card-tit">${esc(rotuloAba(t))}</span>
        <span class="bd-card-sub">${tot?`${tot} item${tot===1?"":"ns"} no total`:"nada lanÃƒÂ§ado ainda"}</span>
        ${tot?`<span class="bd-barra"><span style="width:${pct}%"></span></span>
        <span class="bd-barra-legenda"><span>${done} de ${tot} resolvidas</span><span>${pct}%</span></span>`:""}
      </span></button>`;}).join("");
}
function showHub(){
  if(!currentStore)return goHome();
  document.querySelectorAll(".tab-panel").forEach(p=>p.style.display="none");
  document.getElementById("view-hub").style.display="block";
  document.getElementById("cards").style.display="none";
  document.getElementById("tabs").style.display="none";
  currentTab=null;
  /* o hub passa pelo MESMO cabeÃƒÂ§alho das abas Ã¢â‚¬â€ antes escrevia o tÃƒÂ­tulo na mÃƒÂ£o e
     por isso "editar nÃƒÂ£o funcionava no tÃƒÂ­tulo" aqui (queixa dela, 20/07). */
  const h1=document.getElementById("appTitle");
  h1.textContent=txt("hub.titulo","SumÃƒÂ¡rio");
  renderEyebrow();
  if(MODO_EDICAO){
    h1.contentEditable="plaintext-only";h1.classList.add("editando");
    h1.title="Escreva o nome desta tela de entrada";
    h1.onblur=()=>{setTexto("hub.titulo",h1.textContent,"SumÃƒÂ¡rio");};
    h1.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();h1.blur();}
      if(e.key==="Escape"){h1.textContent=txt("hub.titulo","SumÃƒÂ¡rio");h1.blur();}};
  }else{h1.contentEditable="false";h1.classList.remove("editando");h1.onblur=h1.onkeydown=null;
    h1.title="Para renomear: Ã¢Å“ÂÃ¯Â¸Â Editar textos";}
  document.getElementById("appSubtitle").innerHTML=subLivreHTML("hub");
  renderHub();renderBreadcrumb();syncNav();window.scrollTo(0,0);
}
/* ===== NavegaÃƒÂ§ÃƒÂ£o permanente (barra lateral + barra do celular) ===== */
function navItemHTML(t){const a=TABS[t];
  return `<button class="ricon nav-item" data-tab="${t}" style="color:${a.cor}" title="${esc(rotuloAba(t))}" aria-label="${esc(rotuloAba(t))}" onclick="showTab('${t}')">${a.icone}<span class="rlabel">${esc(rotuloAba(t))}</span></button>`;}
/* ===== BARRA LATERAL QUE ABRE E FECHA =====
   Fechada = sÃƒÂ³ ÃƒÂ­cones (como sempre foi). Aberta = ÃƒÂ­cone + nome por extenso, e as
   seÃƒÂ§ÃƒÂµes da aba atual aparecem recuadas embaixo dela. Fica no aparelho. */
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
/* seÃƒÂ§ÃƒÂµes de dentro de uma aba (hoje sÃƒÂ³ a de Checklists tem) Ã¢â‚¬â€ sÃƒÂ³ aparecem
   com a barra aberta e na aba em que se estÃƒÂ¡ */
function railSubHTML(t){
  if(!RAIL_ABERTA||t!==currentTab)return "";
  if(t==="ck"&&typeof CK_SEC!=="undefined"){
    const secs=[["formularios","Ã°Å¸â€œâ€¹",txt("ck.sec.formularios","FormulÃƒÂ¡rios")],
                ["enviados","Ã¢Å“â€¦",txt("ck.sec.enviados","Enviados")],
                ["parciais","Ã¢ÂÂ¸",txt("ck.sec.parciais","Parciais")]];
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
  /* no celular a barra lateral some, entÃƒÂ£o o DESFAZER tambÃƒÂ©m mora aqui */
  if(b)b.innerHTML=`<button class="ricon nav-item" title="Hub da empresa" aria-label="Hub da empresa" onclick="showHub()">${ICO.hub}</button>`
    +TAB_ORDER.map(navItemHTML).join("")
    +`<button class="ricon" id="btDesfazerM" onclick="desfazer()" title="Desfazer" aria-label="Desfazer">Ã¢â€ Â</button>`;}
/* destaque da aba atual Ã¢â‚¬â€ ÃƒÂºnica funÃƒÂ§ÃƒÂ£o que marca "active" em TODAS as navegaÃƒÂ§ÃƒÂµes */
function syncNav(){
  document.querySelectorAll("[data-tab]").forEach(el=>{
    const on=el.dataset.tab===currentTab;
    el.classList.toggle("active",on);
    if(on)el.setAttribute("aria-current","page");else el.removeAttribute("aria-current");
  });
}
/* menu "Ã¢â€¹Â¯" Ã¢â‚¬â€ guarda as aÃƒÂ§ÃƒÂµes raras (exportar, importar, cadastro manual, mapa) */
function toggleMenuMais(ev){
  ev.stopPropagation();
  const m=document.getElementById("menuMais");if(!m)return;
  m.hidden=!m.hidden;
  if(!m.hidden)setTimeout(()=>document.addEventListener("click",fecharMenuMais,{once:true}),0);
}
function fecharMenuMais(){const m=document.getElementById("menuMais");if(m)m.hidden=true;}

/* trilha removida a pedido de LÃƒÂª (19/07) Ã¢â‚¬â€ o cabeÃƒÂ§alho jÃƒÂ¡ diz o quadro e a loja */
function renderBreadcrumb(){
  const c=document.getElementById("crumb");if(!c)return;
  const aba=currentTab&&TABS[currentTab]?` Ã¢â‚¬Âº <b>${esc(rotuloAba(currentTab))}</b>`:" Ã¢â‚¬Âº <b>InÃƒÂ­cio</b>";
  c.innerHTML=`<span onclick="goHome()" title="Voltar ÃƒÂ  Central de Empresas">Capa</span> Ã¢â‚¬Âº <span onclick="showHub()" title="Voltar ao inÃƒÂ­cio desta empresa">${esc(currentStoreName||"Empresa")}</span>${aba}`;
}
/* CabeÃƒÂ§alho padrÃƒÂ£o de TODAS as abas Ã¢â‚¬â€ "TÃƒÂTULOS INDEPENDENTES":
   1) EM CIMA a loja, sÃƒÂ³ para identificar. NÃƒÆ’O ÃƒÂ© editÃƒÂ¡vel aqui Ã¢â‚¬â€ renomear a empresa
      sÃƒÂ³ na Capa, no Ã¢Å“Å½ (senÃƒÂ£o o mesmo nome mudava em dois lugares).
   2) NO MEIO o tÃƒÂ­tulo do quadro (editÃƒÂ¡vel no modo ediÃƒÂ§ÃƒÂ£o).
   3) EMBAIXO uma linha LIVRE, escrita direto no clique. */
function renderEyebrow(){
  const el=document.getElementById("appLoja");if(!el)return;
  el.innerHTML=currentStore
    ?`<span class="sep">Ã‚Â·</span><span class="loja-tag" title="Para renomear a empresa: volte ÃƒÂ  Capa e use o Ã¢Å“Å½">${esc(nomeCurto(currentStoreName||""))}</span>`
    :"";
}
/* a linha livre: clicou, escreveu, saiu Ã¢â‚¬â€ salvou. Enter confirma, Esc cancela.
   Formato de PÃƒÂLULA com "Ã¢â‚¬Âº", igual ao desenho que ela mandou em 20/07.
   Vazia, oferece as duas frases que ela mesma sugeriu, para nÃƒÂ£o comeÃƒÂ§ar do branco. */
const FRASES_PRONTAS=["O que preciso resolver hoje?","O que realmente merece a minha atenÃƒÂ§ÃƒÂ£o agora?"];
function subLivreHTML(chave){
  const v=ABA_SUB[chave]||"";
  const sugestoes=v?"":`<span class="head-sug">${FRASES_PRONTAS.map(f=>
    `<button onclick="usarFrase('${esc(chave)}',this.textContent)">${esc(f)}</button>`).join("")}</span>`;
  return `<span class="head-sub${v?"":" vazio"}" contenteditable="plaintext-only"
    data-sub="${esc(chave)}" title="Escreva aqui o que quiser Ã¢â‚¬â€ some quando vocÃƒÂª apagar"
    onblur="setAbaSub(this.dataset.sub,this.textContent);this.classList.toggle('vazio',!this.textContent.trim())"
    onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}
               if(event.key==='Escape'){this.textContent=(ABA_SUB[this.dataset.sub]||'');this.blur();}"
    >${esc(v)}</span>${sugestoes}`;
}
async function usarFrase(chave,frase){
  await setAbaSub(chave,frase);
  const alvo=(chave==="hub")?null:chave;
  if(alvo)updateSubtitle(alvo);
  else document.getElementById("appSubtitle").innerHTML=subLivreHTML("hub");
}
function updateSubtitle(t){
  const h1=document.getElementById("appTitle"),sub=document.getElementById("appSubtitle");
  const aba=TABS[t]&&rotuloAba(t);
  renderEyebrow();
  if(h1){
    h1.textContent=aba||nomeCurto(currentStoreName||"");
    /* SÃƒâ€œ edita no modo ediÃƒÂ§ÃƒÂ£o Ã¢â‚¬â€ antes ficava sempre editÃƒÂ¡vel e o nome da aba
       era renomeado sem intenÃƒÂ§ÃƒÂ£o sÃƒÂ³ de clicar */
    if(aba&&MODO_EDICAO){
      h1.contentEditable="plaintext-only";h1.classList.add("editando");
      h1.title="Escreva o novo nome deste quadro";
      h1.onblur=()=>renomearAba(t,h1.textContent);
      h1.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();h1.blur();}
        if(e.key==="Escape"){h1.textContent=rotuloAba(t);h1.blur();}};
    }else{h1.contentEditable="false";h1.classList.remove("editando");
      h1.onblur=h1.onkeydown=null;h1.title=MODO_EDICAO?"":"Para renomear: menu Ã¢â€¹Â¯ Ã¢â€ â€™ Editar os textos do site";}
  }
  if(sub)sub.innerHTML=currentStore?subLivreHTML(t||"hub"):"";
}

/* Status por tipo de aba Ã¢â‚¬â€ a aba NC ganha vocabulÃƒÂ¡rio prÃƒÂ³prio na Fase 3 */
const STATUS_FNS={
  default:{isPend:d=>d.status==="Pendente",isDone:d=>d.status==="ConcluÃƒÂ­do"}
};
function isPendente(d){return !d.deleted&&((STATUS_FNS[d.tipo]||STATUS_FNS.default).isPend)(d);}
function isConcluido(d){return !d.deleted&&((STATUS_FNS[d.tipo]||STATUS_FNS.default).isDone)(d);}
let db,DATA=[];const DB_NAME="banco_nc_v3_base",STORE="itens";
const today=()=>new Date().toISOString().slice(0,10);
const brDate=iso=>iso?iso.split("-").reverse().join("/"):"";
const nowISO=()=>new Date().toISOString();
/* uid: identificador estÃƒÂ¡vel por item (o id autoIncrement muda entre dispositivos) */
const newUid=()=>(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+"-"+Math.random().toString(36).slice(2));
/* itens do SEED ganham uid derivado do conteÃƒÂºdo: o mesmo em todo dispositivo,
   para a sincronizaÃƒÂ§ÃƒÂ£o nÃƒÂ£o duplicar o banco inicial */
function hashStr(s){let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))>>>0;return h.toString(36);}
const seedUid=(area,nc,exec)=>"ini-"+hashStr((area||"")+"|"+(nc||"")+"|"+(exec||""));
/* mod antigo fixo: qualquer ediÃƒÂ§ÃƒÂ£o real (mod=agora) vence a cÃƒÂ³pia intocada do seed */
const SEED_MOD="2025-01-01T00:00:00.000Z";

function openDB(){return new Promise((res,rej)=>{const req=indexedDB.open(DB_NAME,1);
 req.onupgradeneeded=e=>{const d=e.target.result;
   if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:"id",autoIncrement:true});
   if(!d.objectStoreNames.contains("meta"))d.createObjectStore("meta",{keyPath:"k"});};
 req.onsuccess=e=>{db=e.target.result;res()};req.onerror=e=>rej(e);});}
function tx(s,m){return db.transaction(s,m).objectStore(s);}
function getAll(){return new Promise(r=>{const q=tx(STORE,"readonly").getAll();q.onsuccess=()=>r(q.result);});}
function getOne(id){return new Promise(r=>{const q=tx(STORE,"readonly").get(id);q.onsuccess=()=>r(q.result||null);q.onerror=()=>r(null);});}
/* Toda gravaÃƒÂ§ÃƒÂ£o passa por aqui Ã¢â‚¬â€ ÃƒÂ© por isso que o DESFAZER funciona no site inteiro:
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

/* ===== DESFAZER / REFAZER (Ctrl+Z e Ctrl+Shift+Z, e os botÃƒÂµes Ã¢â€ Â Ã¢â€ â€™) =====
   Guarda o que mudou em cada aÃƒÂ§ÃƒÂ£o. AÃƒÂ§ÃƒÂµes feitas juntas (ex.: alterar 5 demandas
   de uma vez) entram como UM passo sÃƒÂ³, para desfazer tudo de uma vez. */
let HIST=[],HIST_POS=-1,HIST_LIGADO=true,HIST_ATUAL=null,HIST_T=null;
const HIST_MAX=40;
async function histRegistrar(m){
  if(!HIST_ATUAL){HIST_ATUAL={quando:Date.now(),mudancas:[]};}
  HIST_ATUAL.mudancas.push(m);
  clearTimeout(HIST_T);
  HIST_T=setTimeout(histFechar,350);          /* o que acontece junto vira um passo sÃƒÂ³ */
}
function histFechar(){
  if(!HIST_ATUAL||!HIST_ATUAL.mudancas.length){HIST_ATUAL=null;return;}
  HIST=HIST.slice(0,HIST_POS+1);
  HIST.push(HIST_ATUAL);
  if(HIST.length>HIST_MAX)HIST.shift();
  HIST_POS=HIST.length-1;HIST_ATUAL=null;
  atualizarBotoesHist();
}
/* nome do passo em portuguÃƒÂªs Ã¢â‚¬â€ ÃƒÂ© o que aparece no toast e na dica das setas */
const META_NOME={textos:"o texto",abaNomes:"o nome do quadro",abaSub:"a linha do tÃƒÂ­tulo",
  empresas:"as empresas",pendencias:"as pendÃƒÂªncias",rtInfo:"os seus dados",
  dgOpcoes:"as prioridades",ncUrgencias:"as urgÃƒÂªncias",ckOpcoes:"o checklist",
  executores:"os executores",assinaturaRT:"a sua assinatura",ambTipos:"os tipos de ambiente"};
function histRotulo(p){
  const n=p.mudancas.length;
  /* passo sÃƒÂ³ de configuraÃƒÂ§ÃƒÂ£o: dizer O QUE mudou, nÃƒÂ£o "1 alteraÃƒÂ§ÃƒÂ£o" */
  const metas=p.mudancas.filter(m=>m.tipo==="meta");
  if(metas.length===p.mudancas.length&&metas.length){
    const nomes=[...new Set(metas.map(m=>META_NOME[String(m.chave).replace(/Mod$/,"")]).filter(Boolean))];
    if(nomes.length)return nomes.join(" e ");
    return "a configuraÃƒÂ§ÃƒÂ£o";
  }
  const criou=p.mudancas.filter(m=>!m.antes).length,apagou=p.mudancas.filter(m=>!m.depois).length;
  if(criou===n)return n===1?"criaÃƒÂ§ÃƒÂ£o":n+" criaÃƒÂ§ÃƒÂµes";
  if(apagou===n)return n===1?"exclusÃƒÂ£o":n+" exclusÃƒÂµes";
  return n===1?"alteraÃƒÂ§ÃƒÂ£o":n+" alteraÃƒÂ§ÃƒÂµes";
}
async function histAplicar(passo,voltando){
  HIST_LIGADO=false;
  try{
    const mudancas=voltando?[...passo.mudancas].reverse():passo.mudancas;
    let mexeuConfig=false;
    for(const m of mudancas){
      const alvo=voltando?m.antes:m.depois;
      if(m.tipo==="meta"){await metaSet(m.chave,alvo);mexeuConfig=true;continue;}
      if(alvo){await new Promise(r=>{const q=tx(STORE,"readwrite").put(alvo);q.onsuccess=()=>r();});}
      else{await new Promise(r=>{const q=tx(STORE,"readwrite").delete(m.id);q.onsuccess=()=>r();});}
    }
    DATA=await getAll();
    if(mexeuConfig)await recarregarConfig();
    if(typeof renderDG==="function"&&currentTab==="dg")renderDG();
    if(typeof renderCk==="function"&&currentTab==="ck")renderCk();
    /* telas em tela cheia da aba Checklists: repintar, senÃƒÂ£o o desfazer muda o
       banco e a tela continua mostrando o valor velho */
    if(typeof ckRedesenhaPasso==="function")ckRedesenhaPasso();
    if(typeof ckRedesenhaLista==="function"&&document.getElementById("ck-constr"))ckRedesenhaLista();
    if(typeof renderNC==="function"&&currentTab==="nc")renderNC();
    if(typeof render==="function"&&(currentTab==="list"||currentTab==="add"))render();
    if(document.getElementById("view-home").style.display!=="none")await renderHome();
    if(window.syncSchedule)syncSchedule();
  }finally{HIST_LIGADO=true;}
}
/* POR QUE ELAS "FUNCIONAVAM QUANDO QUERIAM" (queixa de LÃƒÂª, 20/07):
   o histÃƒÂ³rico vive na memÃƒÂ³ria da pÃƒÂ¡gina. Ao recarregar o site ele zera, as setas
   ficavam CINZAS e mortas, e parecia defeito. Agora elas nunca ficam desligadas:
   clicou sem ter o que desfazer, ela recebe a explicaÃƒÂ§ÃƒÂ£o escrita. */
async function desfazer(){
  histFechar();
  if(HIST_POS<0){toast("Nada para voltar Ã¢â‚¬â€ o histÃƒÂ³rico recomeÃƒÂ§a toda vez que o site ÃƒÂ© aberto");return;}
  const p=HIST[HIST_POS];
  await histAplicar(p,true);HIST_POS--;atualizarBotoesHist();
  toast("Desfeito: "+histRotulo(p));
}
async function refazer(){
  histFechar();
  if(HIST_POS>=HIST.length-1){toast("Nada para avanÃƒÂ§ar Ã¢â‚¬â€ vocÃƒÂª jÃƒÂ¡ estÃƒÂ¡ no passo mais recente");return;}
  HIST_POS++;const p=HIST[HIST_POS];
  await histAplicar(p,false);atualizarBotoesHist();
  toast("Refeito: "+histRotulo(p));
}
function atualizarBotoesHist(){
  const d=document.getElementById("btDesfazer"),r=document.getElementById("btRefazer");
  const dm=document.getElementById("btDesfazerM");
  /* nunca ficam "disabled": sÃƒÂ³ apagadinhas. Assim o clique sempre responde algo. */
  const semVoltar=HIST_POS<0,semAvancar=HIST_POS>=HIST.length-1;
  if(dm){dm.classList.toggle("apagado",semVoltar);dm.title=semVoltar?"Nada para voltar agora":"Voltar: "+histRotulo(HIST[HIST_POS]);}
  if(d){d.classList.toggle("apagado",semVoltar);d.title=semVoltar?"Nada para voltar agora (Ctrl+Z)":"Voltar: "+histRotulo(HIST[HIST_POS])+" (Ctrl+Z)";}
  if(r){r.classList.toggle("apagado",semAvancar);r.title=semAvancar?"Nada para avanÃƒÂ§ar agora (Ctrl+Shift+Z)":"AvanÃƒÂ§ar (Ctrl+Shift+Z)";}
}
function metaGet(k){return new Promise(r=>{const q=tx("meta","readonly").get(k);q.onsuccess=()=>r(q.result?q.result.v:null);q.onerror=()=>r(null);});}
function metaSet(k,v){return new Promise(r=>{const q=tx("meta","readwrite").put({k,v});q.onsuccess=()=>r();});}
/* ===== metaSetU Ã¢â‚¬â€ GRAVAÃƒâ€¡ÃƒÆ’O DE CONFIGURAÃƒâ€¡ÃƒÆ’O QUE DÃƒÂ PARA DESFAZER (20/07) =====
   BURACO QUE ELA ACHOU: o Ctrl+Z e as setas sÃƒÂ³ conheciam itens (putItem/delDB).
   Tudo que ÃƒÂ© TEXTO e CONFIGURAÃƒâ€¡ÃƒÆ’O Ã¢â‚¬â€ tÃƒÂ­tulo do site, nome de quadro, a linha livre,
   nome de empresa, pendÃƒÂªncias, cor de prioridade Ã¢â‚¬â€ passava por metaSet, que nÃƒÂ£o
   registrava nada. Ela editou o tÃƒÂ­tulo e nÃƒÂ£o tinha como voltar em lugar nenhum.
   Agora essas gravaÃƒÂ§ÃƒÂµes passam por aqui e entram no mesmo histÃƒÂ³rico dos itens. */
async function metaSetU(k,v){
  if(HIST_LIGADO)await histRegistrar({tipo:"meta",chave:k,
    antes:await metaGet(k),depois:v===undefined?null:JSON.parse(JSON.stringify(v))});
  return metaSet(k,v);
}
/* depois de desfazer/refazer uma configuraÃƒÂ§ÃƒÂ£o, o valor tem de voltar tambÃƒÂ©m para a
   memÃƒÂ³ria Ã¢â‚¬â€ senÃƒÂ£o o banco volta e a tela continua mostrando o texto antigo */
async function recarregarConfig(){
  await loadEmpresas();await loadPendencias();await loadRtInfo();
  await loadAbaNomes();await loadAbaSub();await loadTextos();await loadCapaCfg();
  await loadExecutores();await loadAreasAll();
  if(window.dgLoadOpcoes)await dgLoadOpcoes();
  if(window.ckLoadOpcoes)await ckLoadOpcoes();
  if(window.ncLoadUrgencias)await ncLoadUrgencias();
  if(window.ckAmbCarregarTodas)await ckAmbCarregarTodas();
  if(window.ckqCarregarSetores)await ckqCarregarSetores();
  if(window.fillExecSelects)fillExecSelects();
  renderTabs();aplicarTextos();
  if(currentStore&&currentTab)updateSubtitle(currentTab);
  else if(currentStore)showHub();
}

/* O banco inicial (SEED) foi removido do cÃƒÂ³digo pÃƒÂºblico por privacidade:
   dados reais ficam apenas no navegador dos dispositivos da usuÃƒÂ¡ria, nos
   backups exportados e no repositÃƒÂ³rio privado de sincronizaÃƒÂ§ÃƒÂ£o.
   Dispositivos novos comeÃƒÂ§am vazios e recebem via Importar ou sync. */
async function seedIfEmpty(){}

/* ---- capa / Central de Empresas ---- */
const brDateTime=iso=>iso?new Date(iso).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"";

/* CELULAR (iPhone/iPad/Android): backup em pasta nÃƒÂ£o existe lÃƒÂ¡ e o arquivo baixado
   nÃƒÂ£o tem onde ficar. Tudo dela chega no celular pela sincronizaÃƒÂ§ÃƒÂ£o Ã¢â‚¬â€ entÃƒÂ£o nenhum
   aviso de backup aparece no aparelho. Pedido dela: "parar de pedir backup no iPhone". */
function ehCelular(){
  const ua=navigator.userAgent||"";
  if(/iPhone|iPad|iPod|Android/i.test(ua))return true;
  /* iPad com iOS 13+ se apresenta como Mac; o toque ÃƒÂ© o que o entrega */
  return /Mac/i.test(navigator.platform||"")&&(navigator.maxTouchPoints||0)>1;
}
async function renderHome(){
 setTimeout(aplicarTextos,0);
 renderRtInfo();
 const vivos=DATA.filter(d=>!d.deleted);
 const lb=await metaGet("lastBackup");
 /* estado do backup automÃƒÂ¡tico em pasta */
 /* 23/07 (pedido dela Ã¢â‚¬â€ menos poluiÃƒÂ§ÃƒÂ£o): UM botÃƒÂ£ozinho "Ã¢Â¬â€¡ Backup" + estado curto.
    "Ativar automÃƒÂ¡tico" saiu do topo Ã¢â‚¬â€ mora no painel Ã¢â€ â€¢ Organizar a capa.
    "Reautorizar" sÃƒÂ³ aparece quando a pasta perdeu a permissÃƒÂ£o (aÃƒÂ­ ÃƒÂ© necessÃƒÂ¡rio). */
 let autoOk=false,backupInfo="",backupBtns=`<button class="btn ghost sm" title="Baixar agora um backup completo (Excel + arquivo do site)" onclick="exportExcel()"><span data-txt="capa.fazerBackup">Ã¢Â¬â€¡ Backup</span></button>`;
 if(window.showDirectoryPicker){
   const dirH=await metaGet("backupDir");
   if(dirH){
     let perm="denied";try{perm=await dirH.queryPermission({mode:"readwrite"});}catch(e){}
     if(perm==="granted"){autoOk=true;backupInfo=" Ã‚Â· auto Ã¢Å“â€œ";}
     else backupBtns+=` <button class="btn ghost sm" onclick="reauthBackup()">Ã°Å¸â€â€œ Reautorizar pasta</button>`;
   }
 }
 const pendAbertas=PENDENCIAS.filter(p=>!p.feita);
 const st=STATUS_SITE||{};
 const ondeParamos=st.ondeParamos?esc(st.ondeParamos):"Ã¢â‚¬â€";
 const dISO=/^\d{4}-\d{2}-\d{2}$/.test(st.atualizadoEm||"")?st.atualizadoEm.split("-").reverse().join("/"):(st.atualizadoEm||"");
 const quando=dISO?` <span style="opacity:.7">(${esc(dISO)})</span>`:"";
 /* 23/07: o card "PENDÃƒÅ NCIAS DE CONFIGURAÃƒâ€¡ÃƒÆ’O" SAIU da capa (pedido dela: "nunca
    olho, nunca confio"). Os DADOS continuam existindo e sincronizando Ã¢â‚¬â€ a lista
    abre por gerirPendencias() no painel Ã¢â€ â€¢ Organizar a capa. Fica sÃƒÂ³ o "Onde
    paramos" (status.json), enxuto. */
 /* 23/07 (2Ã‚Âª rodada): ela mandou tirar TAMBÃƒâ€°M o "Onde paramos" e qualquer card
    da capa ("nunca confio, nunca entro"). A capa fica sÃƒÂ³ com empresas. O texto
    do status.json continua disponÃƒÂ­vel no Ã°Å¸â€”Âº Mapa do site, para quando quiser. */
 document.getElementById("home-cards").innerHTML="";
 renderHomeStats(vivos);
 /* painel do modo organizar: o que ela quer ver na capa */
 const po=document.getElementById("capa-organizar");
 if(po){
  po.hidden=!CAPA_ORGANIZANDO;
  po.innerHTML=!CAPA_ORGANIZANDO?"":`
    <div class="org-tit">Ã¢â€ â€¢ Organizando a capa</div>
    <p class="org-txt">Segure a alÃƒÂ§a <b>Ã¢Â Â¿</b> de cada empresa e arraste para a ordem que vocÃƒÂª quiser.
      Marque abaixo o que deve aparecer nesta tela.</p>
    <label class="org-op"><input type="checkbox" ${CAPA_CFG.mostrarNumeros?"checked":""}
      onchange="capaMostrar('mostrarNumeros',this.checked)"> Faixa com os <b>nÃƒÂºmeros</b> (Quadro Geral, Urgentes, ManutenÃƒÂ§ÃƒÂµes, InspeÃƒÂ§ÃƒÂµes)</label>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
      <button class="btn ghost sm" title="A lista continua existindo e sincronizando Ã¢â‚¬â€ sÃƒÂ³ saiu da capa" onclick="gerirPendencias()">Ã°Å¸â€œâ€¹ PendÃƒÂªncias de configuraÃƒÂ§ÃƒÂ£o${pendAbertas.length?" ("+pendAbertas.length+")":""}</button>
      ${window.showDirectoryPicker&&!autoOk?`<button class="btn ghost sm" onclick="setupAutoBackup()"><span data-txt="capa.autoBackup">Ã¢Å¡â„¢ Ativar backup automÃƒÂ¡tico</span></button>`:""}
    </div>
    <button class="btn sm" style="margin-top:12px" onclick="toggleOrganizarCapa()">Ã¢Å“â€œ Concluir</button>`;
 }
 /* backup compacto no topo da capa (ao lado do Ã¢Å¡â„¢ SincronizaÃƒÂ§ÃƒÂ£o) Ã¢â‚¬â€
    no CELULAR o bloco inteiro nÃƒÂ£o aparece (ver ehCelular acima) */
 const noCel=ehCelular();
 const topB=document.getElementById("backup-top");
 if(topB)topB.innerHTML=noCel?"":`<span class="backup-top-lbl" title="ÃƒÅ¡ltimo backup">Backup: ${lb?brDateTime(lb):"nenhum ainda"}${backupInfo}</span>${backupBtns}`;
 /* Lembrete de backup SILENCIADO (23/07, pedido dela: "parar de pedir").
    NÃƒÂ£o aparece: com backup automÃƒÂ¡tico ativo, com backup recente (<14 dias),
    em dispositivo temporÃƒÂ¡rio (PC do trabalho Ã¢â‚¬â€ nada fica lÃƒÂ¡ mesmo) ou sem dados.
    Quando aparece, ÃƒÂ© UMA linha discreta, nÃƒÂ£o um cartÃƒÂ£o de aviso. */
 const dias=lb?Math.floor((Date.now()-new Date(lb).getTime())/864e5):null;
 const tempSync=(typeof syncIsTemporario==="function")&&syncIsTemporario();
 document.getElementById("backup-banner").innerHTML=
   (vivos.length&&!noCel&&!autoOk&&!tempSync&&(dias===null||dias>=14))?
   `<div style="font-size:12.5px;margin:0 0 16px;opacity:.75">${lb?("ÃƒÅ¡ltimo backup hÃƒÂ¡ "+dias+" dias"):"Nenhum backup feito neste navegador"} Ã‚Â· <span class="back-link" onclick="exportExcel()">baixar agora</span></div>`:"";
 let html="";
 /* busca, filtro e ordenaÃƒÂ§ÃƒÂ£o das empresas (capa) */
 const _q=(document.getElementById("empQ")?.value||"").trim().toLowerCase();
 const _f=document.getElementById("empFiltro")?.value||"";
 const _o=document.getElementById("empOrdem")?.value||"az";
 const _pendDe=e=>vivos.filter(d=>d.loja===e.code&&isPendente(d)).length;
 let lista=EMPRESAS.filter(e=>
   (!_q||(e.name+" "+e.code).toLowerCase().includes(_q))&&
   (_f===""||(_f==="ativas"?e.ativa:!e.ativa)));
 /* a ORDEM QUE ELA ARRASTOU manda, quando existe; AÃ¢â‚¬â€œZ ÃƒÂ© sÃƒÂ³ o padrÃƒÂ£o de fÃƒÂ¡brica */
 const temOrdem=EMPRESAS.some(e=>typeof e.ordem==="number");
 lista=lista.slice().sort((a,b)=>
   _o==="pend"?_pendDe(b)-_pendDe(a)
   :(temOrdem?((a.ordem??999)-(b.ordem??999)):a.name.localeCompare(b.name,"pt-BR")));
 if(!lista.length)html=`<div class="store-row"><div class="store-info"><div class="store-sub">Nenhuma empresa encontrada.</div></div></div>`;
 for(const emp of lista){
   /* A LINHA DE CONTAGEM VOLTOU (20/07). Ela pediu para tirar, eu tirei, e o
      resultado foi pior: as empresas ficaram coladas. Ela mandou reverter tudo ao
      original Ã¢â‚¬â€ "eu odiei o que vocÃƒÂª fez". Manter assim atÃƒÂ© ela pedir outra coisa. */
   const pend=vivos.filter(d=>d.loja===emp.code&&isPendente(d)).length;
   const done=vivos.filter(d=>d.loja===emp.code&&isConcluido(d)).length;
   /* VISUAL v9.15 (escolha dela: vidro no computador, modo loja no celular).
      Os dois desenhos leem os MESMOS dados desta linha Ã¢â‚¬â€ quem troca de cara ÃƒÂ© sÃƒÂ³
      o CSS (css/aparencia.css). Nada de tela duplicada. */
   const urg=vivos.filter(d=>d.loja===emp.code&&d.tipo==="nc"&&d.urgencia==="URGENTE"&&isPendente(d)).length;
   const tot=pend+done, pct=tot?Math.round(done/tot*100):0;
   html+=`<div class="store-row" data-code="${esc(emp.code)}"${urg?' data-urg="1"':""}${emp.ativa?"":' data-off="1"'}>
     ${CAPA_ORGANIZANDO?`<span class="capa-alca" title="Segure e arraste para mudar a ordem"
        onpointerdown="capaArrIni(event,'${emp.code}')">Ã¢Â Â¿</span>`:""}
     <div class="store-info">
       <div class="store-title">${esc(emp.name)} (${esc(emp.code)})</div>
       ${/* 29/07: a contagem "X pendentes Ã‚Â· Y concluÃƒÂ­dos" e a barrinha saÃƒÂ­ram
            daqui a pedido dela (marcou de rosa na folha impressa). Os nÃƒÂºmeros
            continuam existindo Ã¢â‚¬â€ moram nas etiquetas do topo e nos Indicadores.
            PARA VOLTAR: ÃƒÂ© sÃƒÂ³ devolver as duas linhas que estavam aqui. */""}
       ${urg?`<div class="store-sub"><b class="sr-urg">${urg} urgente${urg===1?"":"s"}</b></div>`:""}
     </div>
     ${/* ORDEM (29/07, pedido dela): lÃƒÂ¡pis e lixeira primeiro, e a chavinha
          Ativa/Inativa COLADA no Ã¢â€“Â¶ Iniciar Ã¢â‚¬â€ ÃƒÂ© a dupla que ela usa junto,
          entÃƒÂ£o a mÃƒÂ£o vai a um lugar sÃƒÂ³. */""}
     <button class="btn ghost sm" title="Renomear empresa" onclick="renameEmpresa('${emp.code}')">Ã¢Å“Å½</button>
     <button class="btn ghost sm" title="Excluir empresa" onclick="removeEmpresa('${emp.code}')">Ã°Å¸â€”â€˜</button>
     <div class="store-toggle-wrap">
       <label class="switch" title="Ativar/desativar empresa"><input type="checkbox" aria-label="Ativar ou desativar empresa" ${emp.ativa?"checked":""} onchange="onToggleEmpresa('${emp.code}',this.checked)"><span class="slider"></span></label>
       <span class="store-toggle-label ${emp.ativa?"on":"off"}">${emp.ativa?"Ativa":"Inativa"}</span>
     </div>
     ${emp.ativa
       ?`<button class="btn iniciar" onclick="enterStore('${emp.code}')">Iniciar Ã¢â€ â€™</button>`
       :`<span class="btn iniciar off" title="Ative a empresa na chavinha ao lado para poder entrar">Ã°Å¸â€â€™</span>`}
   </div>`;
 }
 document.getElementById("store-list").innerHTML=html;
 /* ETIQUETAS DO TOPO (sÃƒÂ³ no computador, pelo CSS) e BOTÃƒÆ’O DE REGISTRAR (sÃƒÂ³ no celular).
    NÃƒÂºmeros de verdade, tirados do banco Ã¢â‚¬â€ nada escrito na mÃƒÂ£o. */
 const chips=document.getElementById("home-chips");
 if(chips){
   const urgT=vivos.filter(d=>d.tipo==="nc"&&d.urgencia==="URGENTE"&&isPendente(d)).length;
   const abertoT=vivos.filter(d=>isPendente(d)).length;
   const ativasT=EMPRESAS.filter(e=>e.ativa).length;
   chips.innerHTML=
     /* BOTÃƒÆ’O de verdade, nÃƒÂ£o texto clicÃƒÂ¡vel: quem navega por teclado tem de alcanÃƒÂ§ar */
     (urgT?`<button type="button" class="chip urg" onclick="abrirUrgentes()" title="Ver as urgentes">${urgT} urgente${urgT===1?"":"s"}</button>`:"")+
     `<span class="chip">${abertoT} em aberto</span>`+
     `<span class="chip">${ativasT} loja${ativasT===1?"":"s"} ligada${ativasT===1?"":"s"}</span>`;
 }
 const acaoCel=document.getElementById("capa-acao-cel");
 if(acaoCel)acaoCel.innerHTML=EMPRESAS.some(e=>e.ativa)
   ?`<button class="btn" onclick="registrarAgora()" title="Abre o registro com a cÃƒÂ¢mera a um toque">Ã°Å¸â€œÂ· Registrar agora</button>`:"";
 /* ÃƒÂºltimas 5 NCs com tag colorida (da home do painel original do projeto NC) */
 const boxNcs=document.getElementById("home-ncs");
 if(boxNcs){
  const ult=(typeof NC_URG!=="undefined")?vivos.filter(d=>d.tipo==="nc").sort((a,b)=>(b.mod||"").localeCompare(a.mod||"")).slice(0,5):[];
  boxNcs.innerHTML=ult.length?`<div class="section-title" style="margin-top:26px">ÃƒÅ¡ltimas NCs</div><div class="store-list">`+
   ult.map(d=>{const c=NC_URG[d.urgencia]||NC_URG.ATENCAO;
    return `<div class="store-row" style="padding:13px 18px;gap:10px">
     <span class="nc-tag" style="color:${c.cor};background:${c.fundo};flex:none">${c.rotulo}</span>
     <div class="store-info">
       <div style="font-size:13px">${esc((d.texto_tecnico||d.texto_bruto||"").slice(0,110))}</div>
       <div class="store-sub">${esc(d.loja)} Ã‚Â· ${esc(d.area||"")} Ã‚Â· ${brDate(d.relato)}${d.status==="Resolvida"?" Ã‚Â· resolvida Ã¢Å“â€œ":""}</div>
     </div></div>`;}).join("")+"</div>":"";
 }
}

/* ===== FAIXA DE NÃƒÅ¡MEROS DA CAPA (20/07) =====
   Pedido dela: "cards sÃƒÂ³ com coisas ÃƒÂºteis e funcionais" no topo, e aproveitar o
   lado direito vazio. Cada card RESPONDE UMA PERGUNTA e ÃƒÂ© um atalho: clicou, entra
   na empresa ativa jÃƒÂ¡ no quadro certo. Sem empresa ativa, avisa em vez de nÃƒÂ£o fazer nada. */
/* ===== ORGANIZAR A CAPA (pedido dela, 20/07: "igual ao meu iPhone Ã¢â‚¬â€ pressiona,
   fica balanÃƒÂ§ando e deixa editar") =====
   Liga o modo, os cartÃƒÂµes das empresas balanÃƒÂ§am, ela arrasta pela alÃƒÂ§a para
   colocar na ordem que quiser, e escolhe o que aparece na capa.
   A ORDEM ÃƒÂ© dela e viaja entre os aparelhos (campo `ordem` na empresa). */
let CAPA_CFG={mostrarNumeros:false,mostrarPendencias:true},CAPA_CFG_MOD="";
let CAPA_ORGANIZANDO=false;
async function loadCapaCfg(){
  const v=await metaGet("capaCfg");
  if(v&&typeof v==="object")CAPA_CFG={...CAPA_CFG,...v};
  CAPA_CFG_MOD=await metaGet("capaCfgMod")||"";
}
async function salvarCapaCfg(){
  CAPA_CFG_MOD=nowISO();
  await metaSetU("capaCfg",CAPA_CFG);await metaSetU("capaCfgMod",CAPA_CFG_MOD);
  dataChanged();await renderHome();
}
async function capaMostrar(qual,val){CAPA_CFG[qual]=!!val;await salvarCapaCfg();
  toast(val?"Passou a aparecer na capa Ã¢Å“â€œ":"Saiu da capa Ã¢Å“â€œ");}
function toggleOrganizarCapa(){
  CAPA_ORGANIZANDO=!CAPA_ORGANIZANDO;
  document.body.classList.toggle("organizando-capa",CAPA_ORGANIZANDO);
  renderHome();
  toast(CAPA_ORGANIZANDO?"Arraste pela alÃƒÂ§a Ã¢Â Â¿ para colocar na ordem que vocÃƒÂª quiser"
                        :"Capa organizada Ã¢Å“â€œ");
}
/* arraste das empresas Ã¢â‚¬â€ mesma ideia da alÃƒÂ§a do Quadro Geral: os handlers ficam no
   DOCUMENT (na alÃƒÂ§a, mover o nÃƒÂ³ no DOM cancela a captura e o gesto morre) */
let CAPA_ARR=null;
function capaArrIni(ev,code){
  if(!CAPA_ORGANIZANDO)return;
  ev.preventDefault();
  const linha=ev.currentTarget.closest(".store-row");if(!linha)return;
  CAPA_ARR={code,linha,y0:ev.clientY};
  linha.classList.add("arrastando");
  document.addEventListener("pointermove",capaArrMove);
  document.addEventListener("pointerup",capaArrFim,{once:true});
  /* iPhone: se o gesto ÃƒÂ© interrompido (chamada, notificaÃƒÂ§ÃƒÂ£o, dedo saiu da tela)
     o browser nÃƒÂ£o dispara pointerup Ã¢â‚¬â€ arraste ficava "grudado". */
  document.addEventListener("pointercancel",capaArrFim,{once:true});
}
function capaArrMove(ev){
  if(!CAPA_ARR)return;
  CAPA_ARR.linha.style.transform="translateY("+(ev.clientY-CAPA_ARR.y0)+"px)";
  const linhas=[...document.querySelectorAll("#store-list .store-row")].filter(l=>l!==CAPA_ARR.linha);
  for(const l of linhas){
    const r=l.getBoundingClientRect();
    if(ev.clientY>r.top&&ev.clientY<r.bottom){
      const meio=r.top+r.height/2;
      l.parentNode.insertBefore(CAPA_ARR.linha,ev.clientY<meio?l:l.nextSibling);
      CAPA_ARR.y0=ev.clientY;CAPA_ARR.linha.style.transform="";
      break;
    }
  }
}
async function capaArrFim(){
  document.removeEventListener("pointermove",capaArrMove);
  if(!CAPA_ARR)return;
  CAPA_ARR.linha.classList.remove("arrastando");CAPA_ARR.linha.style.transform="";
  CAPA_ARR=null;
  /* grava a ordem que ficou na tela */
  const codes=[...document.querySelectorAll("#store-list .store-row")].map(l=>l.dataset.code);
  codes.forEach((c,i)=>{const e=empresa(c);if(e)e.ordem=i;});
  await saveEmpresas();await renderHome();toast("Ordem salva Ã¢Å“â€œ");
}
function abrirQuadro(tab){
 const ativas=EMPRESAS.filter(e=>e.ativa);
 if(ativas.length!==1){toast("Deixe ativa a empresa em que vocÃƒÂª estÃƒÂ¡ para entrar direto");return;}
 enterStore(ativas[0].code);showTab(tab);
}
/* ERRO MEU (20/07): ela tinha ANOTADO "colocar um card de Quadro Geral na capa?" com
   interrogaÃƒÂ§ÃƒÂ£o Ã¢â‚¬â€ era PERGUNTA, e eu tratei como pedido e enchi a capa de cards.
   Resposta dela: "por que inseriu cards ali sem eu pedir? retorna sem".
   Agora vÃƒÂªm DESLIGADOS; ela liga em Organizar a capa se um dia quiser. */
function renderHomeStats(vivos){
 const box=document.getElementById("home-stats");if(!box)return;
 if(!CAPA_CFG.mostrarNumeros){box.innerHTML="";box.hidden=true;return;}
 box.hidden=false;
 const cod=EMPRESAS.map(e=>e.code);
 const dgs=vivos.filter(d=>d.tipo==="dg");
 const feito=(typeof DG_CHAVE_CONCLUIDO!=="undefined")?DG_CHAVE_CONCLUIDO:"concluido";
 const urg=(typeof DG_CHAVE_URGENTE!=="undefined")?DG_CHAVE_URGENTE:"URGENTE";
 const dgAbertas=dgs.filter(d=>d.situacao!==feito).length;
 const dgUrg=dgs.filter(d=>d.situacao!==feito&&d.prioridade===urg).length;
 const mnt=vivos.filter(d=>d.tipo==="mnt"&&cod.includes(d.loja)&&isPendente(d)).length;
 const insp=vivos.filter(d=>d.tipo==="ckp"&&d.status==="concluido").length;
 const cards=[
  {t:"dg", lbl:"Quadro Geral",  n:dgAbertas,sub:"demandas em aberto",  cor:"#1d6b57",ico:"Ã°Å¸â€”â€™"},
  {t:"dg", lbl:"Urgentes",      n:dgUrg,    sub:"pedem atenÃƒÂ§ÃƒÂ£o hoje",  cor:"#c0212a",ico:"Ã°Å¸â€Â¥"},
  {t:"list",lbl:"ManutenÃƒÂ§ÃƒÂµes",  n:mnt,      sub:"serviÃƒÂ§os pendentes",  cor:"#b3730a",ico:"Ã°Å¸â€Â§"},
  {t:"ck", lbl:"InspeÃƒÂ§ÃƒÂµes",     n:insp,     sub:"checklists concluÃƒÂ­dos",cor:"#7c3aed",ico:"Ã¢Å“â€¦"}
 ];
 box.innerHTML=cards.map(c=>
  `<button class="stat" style="--c:${c.cor}" onclick="abrirQuadro('${c.t}')" title="Abrir ${esc(c.lbl)} na empresa ativa">
     <span class="ic">${c.ico}</span>
     <span class="n">${c.n}</span>
     <span class="l">${esc(c.lbl)}</span>
     <span class="s">${esc(c.sub)}</span>
   </button>`).join("");
}

async function onToggleEmpresa(code,val){const e=empresa(code);if(!e)return;
 e.ativa=val;
 /* regra (17/07): sÃƒÂ³ UMA empresa ativa por vez Ã¢â‚¬â€ ativar uma desativa as demais */
 if(val)for(const x of EMPRESAS)if(x.code!==code)x.ativa=false;
 await saveEmpresas();fillLojaSelects();await renderHome();
 toast(val?`${code} ativada${EMPRESAS.length>1?" Ã¢â‚¬â€ as demais foram desativadas":""}`:`${code} desativada`);}

function toggleEmpresaForm(){const f=document.getElementById("empresa-form");f.style.display=f.style.display==="none"?"block":"none";}

async function addEmpresa(ev){ev.preventDefault();
 const name=document.getElementById("empNome").value.trim();
 const code=document.getElementById("empCode").value.trim().toUpperCase();
 if(!/^[A-Z0-9]{2,4}$/.test(code)){alert("O cÃƒÂ³digo deve ter de 2 a 4 letras/nÃƒÂºmeros (ex.: BZ).");return;}
 if(empresa(code)){alert("JÃƒÂ¡ existe uma empresa com o cÃƒÂ³digo "+code+".");return;}
 /* SÃƒâ€œ uma empresa ativa por vez (regra da capa: o Ã¢â€“Â¶ Iniciar entra direto na ÃƒÂºnica
    ativa). Antes: criar empresa nova deixava duas ativas e o botÃƒÂ£o travava. */
 for(const e of EMPRESAS)e.ativa=false;
 EMPRESAS.push({code,name,ativa:true});
 await saveEmpresas();
 document.getElementById("empNome").value="";document.getElementById("empCode").value="";
 toggleEmpresaForm();fillLojaSelects();await renderHome();toast("Empresa "+name+" ("+code+") criada e ativada Ã¢Å“â€œ");}

async function renameEmpresa(code){const e=empresa(code);if(!e)return;
 const n=prompt("Novo nome para "+e.name+" ("+code+"):",e.name);
 if(!n||!n.trim())return;
 e.name=n.trim();await saveEmpresas();fillLojaSelects();await renderHome();toast("Empresa renomeada Ã¢Å“â€œ");}

async function removeEmpresa(code){const e=empresa(code);if(!e)return;
 if(DATA.some(d=>!d.deleted&&d.loja===code)){
   alert("A empresa "+e.name+" ("+code+") tem itens no banco e nÃƒÂ£o pode ser excluÃƒÂ­da.\n\nUse o botÃƒÂ£o de ativar/desativar para inativÃƒÂ¡-la Ã¢â‚¬â€ ela some dos cadastros mas o histÃƒÂ³rico continua.");return;}
 if(!confirm("Excluir a empresa "+e.name+" ("+code+")?"))return;
 EMPRESAS=EMPRESAS.filter(x=>x.code!==code);
 await saveEmpresas();fillLojaSelects();await renderHome();toast("Empresa excluÃƒÂ­da");}

function enterStore(code){
 currentStore=code;
 const e=empresa(code)||{name:"Empresa"};
 /* dentro das abas o nome vai CURTO; o completo (com "Ã‚Â· Rede") fica sÃƒÂ³ na Capa */
 document.getElementById("appTitle").textContent=nomeCurto(e.name);
 currentStoreName=nomeCurto(e.name);
 showView("app");showHub();   /* entra pelo HUB de cards, nÃƒÂ£o direto numa aba */
}

function goHome(){currentStore=null;currentTab=null;showView("home");renderHome();}

function showView(v){
 document.getElementById("view-home").style.display=v==="home"?"block":"none";
 document.getElementById("view-app").style.display=v==="app"?"block":"none";
 /* navegaÃƒÂ§ÃƒÂ£o de abas sÃƒÂ³ faz sentido dentro de uma empresa */
 const rt=document.getElementById("railTabs"),mn=document.getElementById("mobileNav");
 if(rt)rt.hidden=(v!=="app");
 if(mn)mn.hidden=(v!=="app");
 window.scrollTo(0,0);
}

/* "+ Nova" fica sempre visÃƒÂ­vel: sem empresa escolhida, o item nasceria ÃƒÂ³rfÃƒÂ£o */
function quickAdd(){
 if(!currentStore){goHome();toast("Escolha uma empresa primeiro");return;}
 showView("app");showTab("add");}

/* ---- render ---- */
/* selects de empresa nas cÃƒÂ©lulas da tabela (mover item de empresa continua possÃƒÂ­vel) */
function lojaOptionsHTML(sel){
 let extra=sel&&!empresa(sel)?`<option value="${esc(sel)}" selected>${esc(sel)}</option>`:"";
 return extra+EMPRESAS.map(e=>`<option value="${e.code}" ${e.code===sel?"selected":""}>${e.code}</option>`).join("");}
/* Itens travados por empresa: cada loja vÃƒÂª e cadastra sÃƒÂ³ o que ÃƒÂ© dela.
   Mantida como no-op p/ compatibilidade com chamadas antigas. */
function fillLojaSelects(){}

function renderCards(){
 const base=DATA.filter(d=>!d.deleted&&(d.tipo||"mnt")===currentTipo&&d.loja===currentStore);
 const total=base.length,pend=base.filter(isPendente).length,done=base.filter(isConcluido).length;
 document.getElementById("cards").innerHTML=`
   <div class="card"><div class="lbl" data-txt="cards.total">Total de itens</div><div class="sub">nesta empresa</div><div class="val">${total}</div></div>
   <div class="card"><div class="lbl" data-txt="cards.pend">Pendentes</div><div class="sub">aguardando</div><div class="val accent">${pend}</div></div>
   <div class="card"><div class="lbl" data-txt="cards.done">ConcluÃƒÂ­dos</div><div class="sub">resolvidos</div><div class="val green">${done}</div></div>`;}

function fillAreas(){const areas=[...new Set(DATA.filter(d=>!d.deleted&&d.tipo!=="nc"&&d.loja===currentStore).map(d=>d.area))].sort();
 const sel=document.getElementById("fArea"),cur=sel.value;
 sel.innerHTML='<option value="">Todas as ÃƒÂ¡reas</option>'+areas.map(a=>`<option>${a}</option>`).join("");sel.value=cur;
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
   (evita retrabalho: filtre por ÃƒÂ¡rea/busca/status e mova em massa) */
/* ===== ORDEM DE SERVIÃƒâ€¡O (ideia do exemplo "print records" do Airtable) =====
   Folha para entregar em mÃƒÂ£os ao executor: o que fazer, onde, com espaÃƒÂ§o para
   ele assinar quando terminar. Sai do filtro atual da tabela. */
function ordemDeServico(){
  const rows=linhasFiltradas().filter(d=>isPendente(d));
  if(!rows.length){alert("Nenhum item pendente no filtro atual.");return;}
  const loja=(empresa(currentStore)||{}).name||currentStore;
  const porExec={};
  for(const d of rows){const e=d.executor||"Sem responsÃƒÂ¡vel definido";(porExec[e]=porExec[e]||[]).push(d);}
  let corpo="";
  for(const exec of Object.keys(porExec).sort()){
    const itens=porExec[exec];
    corpo+=`<section><div class="cab"><h2>${esc(exec)}</h2><span>${itens.length} serviÃƒÂ§o${itens.length===1?"":"s"}</span></div>
      <table><thead><tr><th class="c">Feito</th><th>ÃƒÂrea</th><th>O que fazer</th><th class="d">Prazo/Obs.</th></tr></thead><tbody>
      ${itens.map(d=>`<tr>
        <td class="c"><span class="bx"></span></td>
        <td>${esc(d.area||"Ã¢â‚¬â€")}</td>
        <td><b>${esc(d.nc||"")}</b>${d.acao?`<div class="ac">${esc(d.acao)}</div>`:""}</td>
        <td class="d">${d.relato?brDate(d.relato):""}</td></tr>`).join("")}
      </tbody></table>
      <div class="ass"><div><span></span>Assinatura de ${esc(exec)}</div><div><span></span>Data de conclusÃƒÂ£o</div></div>
      </section>`;
  }
  const w=window.open("");
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
  <title>Ordem de ServiÃƒÂ§o Ã¢â‚¬â€ ${esc(loja)}</title><style>
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
  <div class="noprint"><button onclick="print()" style="padding:8px 14px;cursor:pointer;font-size:13px">Ã°Å¸â€“Â¨ Imprimir / Salvar PDF</button></div>
  <h1>Ordem de ServiÃƒÂ§o</h1>
  <div class="top">${esc(loja)} Ã‚Â· ${rows.length} serviÃƒÂ§o${rows.length===1?"":"s"} pendente${rows.length===1?"":"s"} Ã‚Â· emitida em ${brDate(today())} Ã‚Â· RT: ${esc(RT_INFO||RT_DEFAULT)}</div>
  ${corpo}</body></html>`);
  w.document.close();
}

async function moverFiltrados(){
 const rows=linhasFiltradas();
 if(!rows.length){alert("Nenhum item no filtro atual para mover.");return;}
 const outras=EMPRESAS.filter(e=>e.code!==currentStore);
 if(!outras.length){alert("NÃƒÂ£o hÃƒÂ¡ outra empresa cadastrada.");return;}
 const ops=outras.map((e,i)=>(i+1)+" = "+e.name+" ("+e.code+")").join("\n");
 const resp=prompt("Mover os "+rows.length+" itens do filtro atual para qual empresa?\n\n"+ops+"\n\nDigite o nÃƒÂºmero:");
 if(!resp)return;
 const alvo=outras[parseInt(resp,10)-1];
 if(!alvo){alert("OpÃƒÂ§ÃƒÂ£o invÃƒÂ¡lida.");return;}
 if(!confirm("Confirmar: mover "+rows.length+" item"+(rows.length===1?"":"s")+" de "+currentStoreName+" para "+alvo.name+"?"))return;
 for(const d of rows){d.loja=alvo.code;d.mod=nowISO();d.atualizacao=today();await putItem(d);}
 dataChanged();render();toast(rows.length+" itens movidos para "+alvo.code+" Ã¢Å“â€œ");
}

/* ===== ARRASTE NA TABELA DE MANUTENÃƒâ€¡Ãƒâ€¢ES (20/07) =====
   Era a ÃƒÂºnica aba de lista sem arraste. Mesma regra do resto do site: handlers no
   DOCUMENT (na alÃƒÂ§a, mover a linha no DOM cancela a captura e o gesto morre).
   Reordena por "vagas": as linhas VISÃƒÂVEIS trocam entre si as posiÃƒÂ§ÃƒÂµes que jÃƒÂ¡
   ocupavam Ã¢â‚¬â€ assim filtrar e arrastar nÃƒÂ£o bagunÃƒÂ§a o que estÃƒÂ¡ fora do filtro. */
let MNT_ARR=null;
function mntArrIni(ev,id){
  ev.preventDefault();
  const tr=ev.currentTarget.closest("tr");if(!tr)return;
  MNT_ARR={id,tr,y0:ev.clientY};
  tr.classList.add("arrastando");
  document.addEventListener("pointermove",mntArrMove);
  document.addEventListener("pointerup",mntArrFim,{once:true});
  document.addEventListener("pointercancel",mntArrFim,{once:true});
}
function mntArrMove(ev){
  if(!MNT_ARR)return;
  const linhas=[...document.querySelectorAll("#tbody tr")].filter(l=>l!==MNT_ARR.tr);
  for(const l of linhas){
    const r=l.getBoundingClientRect();
    if(ev.clientY>r.top&&ev.clientY<r.bottom){
      const meio=r.top+r.height/2;
      l.parentNode.insertBefore(MNT_ARR.tr,ev.clientY<meio?l:l.nextSibling);
      break;
    }
  }
}
async function mntArrFim(){
  document.removeEventListener("pointermove",mntArrMove);
  if(!MNT_ARR)return;
  MNT_ARR.tr.classList.remove("arrastando");MNT_ARR=null;
  const ids=[...document.querySelectorAll("#tbody tr")].map(l=>Number(l.dataset.id)).filter(n=>!isNaN(n));
  const itens=ids.map(i=>DATA.find(d=>d.id===i)).filter(Boolean);
  /* as VAGAS que essas linhas jÃƒÂ¡ ocupavam, redistribuÃƒÂ­das na nova sequÃƒÂªncia */
  const vagas=itens.map(x=>x.ordem).filter(v=>typeof v==="number").sort((a,b)=>a-b);
  for(let i=0;i<itens.length;i++){
    const nova=(vagas.length===itens.length)?vagas[i]:i;
    if(itens[i].ordem!==nova){itens[i].ordem=nova;itens[i].mod=nowISO();await putItem(itens[i]);}
  }
  dataChanged();render();toast("Ordem salva Ã¢Å“â€œ");
}

function render(){
 renderCards();fillAreas();
 let rows=linhasFiltradas();
 /* a ordem que ELA arrastou manda; pendente/concluÃƒÂ­do continua sendo o desempate */
 const temOrdem=rows.some(d=>typeof d.ordem==="number");
 rows.sort((a,b)=>(isPendente(a)?0:1)-(isPendente(b)?0:1)
   ||(temOrdem?((a.ordem??1e9)-(b.ordem??1e9)):0));
 const tb=document.getElementById("tbody");
 /* colspan acompanha a coluna da alÃƒÂ§a Ã¢â‚¬â€ senÃƒÂ£o a mensagem de "vazio" desalinha */
 if(!rows.length){tb.innerHTML='<tr><td colspan="11"><div class="empty">'+(currentTipo==="dg"?"Nenhuma demanda geral cadastrada ainda. Use Ã¢â‚¬Å“+ NovaÃ¢â‚¬Â para adicionar.":"Nenhum item encontrado.")+'</div></td></tr>';return;}
 tb.innerHTML=rows.map(d=>{const done=d.status==="ConcluÃƒÂ­do";return `<tr data-id="${d.id}">
   <td class="td-alca"><span class="mnt-alca" title="Segure e arraste para mudar a ordem" onpointerdown="mntArrIni(event,${d.id})">Ã¢Â Â¿</span></td>
   <td><select class="cell" onchange="setField(${d.id},'loja',this.value)">${lojaOptionsHTML(d.loja)}</select></td>
   <td><textarea class="cell" rows="1" onchange="setField(${d.id},'area',this.value)" oninput="grow(this)">${esc(d.area)}</textarea></td>
   <td><textarea class="cell" rows="1" onchange="setField(${d.id},'nc',this.value)" oninput="grow(this)">${esc(d.nc)}</textarea></td>
   <td><textarea class="cell" rows="1" onchange="setField(${d.id},'acao',this.value)" oninput="grow(this)">${esc(d.acao)}</textarea></td>
   <td><textarea class="cell" rows="1" onchange="setField(${d.id},'rt',this.value)" oninput="grow(this)">${esc(d.rt)}</textarea></td>
   <td><select class="cell" onchange="setField(${d.id},'executor',this.value)">${execOptionsHTML(d.executor)}</select></td>
   <td><input type="date" class="cell" value="${d.relato||""}" onchange="setField(${d.id},'relato',this.value)"></td>
   <td><div class="atu">${brDate(d.atualizacao)}</div></td>
   <td><div class="stwrap"><label class="switch" title="Marcar resolvido"><input type="checkbox" aria-label="Marcar como concluÃƒÂ­do" ${done?"checked":""} onchange="setField(${d.id},'status',this.checked?'ConcluÃƒÂ­do':'Pendente')"><span class="slider"></span></label><span class="stlabel ${done?"done":"pend"}">${d.status}</span></div></td>
   <td class="td-acts">
     <button class="delbtn" title="Anexar foto ou arquivo nesta manutenÃƒÂ§ÃƒÂ£o" onclick="anexarNoItem('${d.uid}')">Ã°Å¸â€œÅ½</button>
     <button class="delbtn" title="Excluir" onclick="removeItem(${d.id})">Ã°Å¸â€”â€˜</button>
     ${(d.fotos&&d.fotos.length)?`<span class="tem-anexo" title="${d.fotos.length} anexo(s)">${d.fotos.length}Ã°Å¸â€œÂ·</span>`:""}
   </td>
 </tr>`;}).join("");
 requestAnimationFrame(()=>document.querySelectorAll("textarea.cell").forEach(grow));}

function grow(t){t.style.height="auto";t.style.height=t.scrollHeight+"px";}
function esc(s){return (s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}

async function setField(id,field,val){
 const it=DATA.find(d=>d.id===id);if(!it)return;
 it[field]=val;it.atualizacao=today();it.mod=nowISO();await putItem(it);dataChanged();
 if(field==="status"||field==="loja"){render();toast("Atualizado Ã¢Å“â€œ");}
 else{renderCards();fillAreas();} /* sem redesenhar a tabela: o cursor fica onde estÃƒÂ¡ */
}
async function removeItem(id){const it=DATA.find(d=>d.id===id);
 if(!confirm("Excluir este item?\n\n"+(it?(it.nc||it.texto_bruto||""):"")))return;
 if(it){
   /* SEMPRE lÃƒÂ¡pide: se um dia a sync for ligada, o item deletado propaga.
      Antes: sem sync fazia hard-delete e o item ressuscitava no primeiro pull. */
   it.deleted=true;it.mod=nowISO();await putItem(it);
 }
 dataChanged();toast("Item excluÃƒÂ­do");render();}
async function addItem(e){e.preventDefault();
 const o={uid:newUid(),mod:nowISO(),tipo:document.getElementById("fmTipo").value,loja:document.getElementById("fmLoja").value,area:document.getElementById("fmArea").value.trim(),
   nc:document.getElementById("fmNc").value.trim(),acao:document.getElementById("fmAcao").value.trim(),
   rt:document.getElementById("fmRt").value.trim()||RT_DEFAULT,executor:document.getElementById("fmExec").value,
   relato:document.getElementById("fmData").value||today(),atualizacao:today(),
   status:document.getElementById("fmStatus").value,criado:"manual"};
 const id=await putItem(o);o.id=id;DATA.push(o);dataChanged();
 document.getElementById("ncForm").reset();
 document.getElementById("fmRt").value=RT_DEFAULT;document.getElementById("fmData").value=today();
 toast((o.tipo==="dg"?"Demanda":"NÃƒÂ£o conformidade")+" adicionada Ã¢Å“â€œ");showTab(o.tipo==="dg"?"dg":"list");}

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
 renderRailTabs();   /* redesenha para as seÃƒÂ§ÃƒÂµes da aba atual aparecerem recuadas */
 syncNav();
 updateSubtitle(t);
 renderBreadcrumb();
 (tab.renderCards||renderCards)();
 if(tab.onShow)tab.onShow();
 window.scrollTo(0,0);}

/* abas que usam a tabela compartilhada (dg / mnt) */
function configTableTab(tipo){
 currentTipo=tipo;
 document.getElementById("thNC").textContent=tipo==="dg"?"Demanda":"NÃƒÂ£o Conformidade";
 document.getElementById("q").placeholder=tipo==="dg"?"Buscar por demanda, aÃƒÂ§ÃƒÂ£o ou ÃƒÂ¡rea...":"Buscar por nÃƒÂ£o conformidade, aÃƒÂ§ÃƒÂ£o ou ÃƒÂ¡rea...";
 render();}

/* aba de cadastro manual (serve dg/mnt; a aba NC terÃƒÂ¡ formulÃƒÂ¡rio prÃƒÂ³prio) */
function configAddTab(){
 const t=(currentTipo==="dg")?"dg":"mnt";
 document.getElementById("fmTipo").value=t;
 document.getElementById("lbNc").textContent=t==="dg"?"Demanda *":"NÃƒÂ£o Conformidade *";
 /* itens travados por empresa: cadastro sempre na empresa atual */
 const m=document.getElementById("fmLoja");
 m.innerHTML=`<option value="${esc(currentStore)}">${esc(currentStoreName)} (${esc(currentStore)})</option>`;
 fillAreas();document.getElementById("fmData").value=today();}

/* ===== NP Ã‚Â· GestÃƒÂ£o de NC Ã¢â‚¬â€ Fase 3: porte integral do projeto (regras, campos, cÃƒÂ¡lculos) ===== */
function renderNC(){}

/* ===== export / import / backup automÃƒÂ¡tico ===== */
/* Envelope versionado: leva itens E empresas; o import aceita tambÃƒÂ©m o formato antigo (array puro) */
/* BUG CORRIGIDO EM 20/07: aqui se lia window.DG_PRIOS, window.NC_URG etc.
   VariÃƒÂ¡vel declarada com let/const NÃƒÆ’O vira propriedade de window Ã¢â‚¬â€ entÃƒÂ£o as trÃƒÂªs
   davam sempre "undefined" e as opÃƒÂ§ÃƒÂµes que ela configurou (nomes e cores de
   prioridade, situaÃƒÂ§ÃƒÂ£o e urgÃƒÂªncia da NC) NUNCA entravam no backup nem na
   sincronizaÃƒÂ§ÃƒÂ£o, sem nenhum erro aparecer na tela. SÃƒÂ³ ficavam no aparelho de origem.
   LIÃƒâ€¡ÃƒÆ’O: em script clÃƒÂ¡ssico, `let X` no topo do arquivo nÃƒÂ£o ÃƒÂ© `window.X` Ã¢â‚¬â€
   para enxergar uma global de outro arquivo, usar typeof. */
const temDG=()=>typeof DG_PRIOS!=="undefined";
const modDG=()=>typeof DG_OPC_MOD!=="undefined"?(DG_OPC_MOD||""):"";
const temNC=()=>typeof NC_URG!=="undefined";
const modNC=()=>typeof NC_URG_MOD!=="undefined"?(NC_URG_MOD||""):"";
const temCK=()=>typeof CK_TIPOS!=="undefined";
const modCK=()=>typeof CK_OPC_MOD!=="undefined"?(CK_OPC_MOD||""):"";
function buildBackupEnvelope(){return {versao:6,exportadoEm:nowISO(),empresasMod:EMPRESAS_MOD,empresas:EMPRESAS,pendenciasMod:PENDENCIAS_MOD,pendencias:PENDENCIAS,rtInfo:RT_INFO,rtInfoMod:RT_INFO_MOD,abaNomes:ABA_NOMES,abaNomesMod:ABA_NOMES_MOD,abaSub:ABA_SUB,abaSubMod:ABA_SUB_MOD,capaCfg:CAPA_CFG,capaCfgMod:CAPA_CFG_MOD,textos:TEXTOS,textosMod:TEXTOS_MOD,dgOpcoes:temDG()?{prios:DG_PRIOS,sits:DG_SIT,papeis:{concluido:DG_CHAVE_CONCLUIDO,andamento:DG_CHAVE_ANDAMENTO,urgente:DG_CHAVE_URGENTE}}:null,dgOpcoesMod:modDG(),ncUrgencias:temNC()?JSON.parse(JSON.stringify(NC_URG)):null,ncUrgenciasMod:modNC(),ckOpcoes:temCK()?{tipos:CK_TIPOS,coment:CK_COMENT,foto:CK_FOTO,listas:CK_LISTAS}:null,ckOpcoesMod:modCK(),areasMod:AREAS_MOD,areas:AREAS_ALL,executores:EXECUTORES,executoresMod:EXECUTORES_MOD,assinaturaRT:(typeof CK_ASSINATURA!=="undefined")?CK_ASSINATURA:"",assinaturaRTMod:(typeof CK_ASSIN_MOD!=="undefined")?CK_ASSIN_MOD:"",ambTipos:(typeof CK_AMB_ALL!=="undefined")?CK_AMB_ALL:{},ambTiposMod:(typeof CK_AMB_MOD!=="undefined")?CK_AMB_MOD:"",ckqSetores:(typeof CKQ_SETORES_ALL!=="undefined")?CKQ_SETORES_ALL:{},ckqSetoresMod:(typeof CKQ_SETORES_MOD!=="undefined")?CKQ_SETORES_MOD:"",itens:DATA};}

function buildCsvGeral(){
 const head=["Aba","Empresa","ÃƒÂrea","NÃƒÂ£o Conformidade / Demanda","AÃƒÂ§ÃƒÂ£o Corretiva","ResponsÃƒÂ¡vel TÃƒÂ©cnica","Executor","Data do Relato","Data de AtualizaÃƒÂ§ÃƒÂ£o","Status"];
 const rows=DATA.filter(d=>!d.deleted&&d.tipo!=="nc").map(d=>[rotuloTipo(d.tipo||"mnt"),d.loja,d.area,d.nc,d.acao,d.rt,d.executor,brDate(d.relato),brDate(d.atualizacao),d.status]);
 return [head,...rows].map(r=>r.map(c=>'"'+String(c==null?"":c).replace(/"/g,'""')+'"').join(";")).join("\r\n");
}
/* NOMES DOS ARQUIVOS (corrigido em 20/07 Ã¢â‚¬â€ ela reparou, com razÃƒÂ£o, que mentiam):
   o "nao_conformidades.csv" na verdade traz o Quadro Geral + ManutenÃƒÂ§ÃƒÂµes, e o
   "gestao_nc.csv" ÃƒÂ© o nome velho da aba. Agora cada arquivo diz o que ÃƒÂ© e leva a data. */
function selo(){const d=new Date(),p=n=>String(n).padStart(2,"0");
 return p(d.getDate())+"."+p(d.getMonth()+1)+"."+String(d.getFullYear()).slice(2);}
async function exportExcel(){
 download("Demandas e Manutencoes - "+selo()+".csv","Ã¯Â»Â¿"+buildCsvGeral(),"text/csv");
 if(window.ncExportCSV)ncExportCSV(); /* CSV prÃƒÂ³prio da aba NC (colunas diferentes) */
 download("Backup completo do site - "+selo()+".json",JSON.stringify(buildBackupEnvelope(),null,2),"application/json");
 /* UM PDF POR ABA, com o nome da aba Ã¢â‚¬â€ pedido dela (20/07). SÃƒÂ³ dÃƒÂ¡ para montar
    dentro de uma empresa: as abas leem os dados da loja aberta. */
 if(currentStore&&typeof pdfsPorAba==="function"){
   try{for(const a of pdfsPorAba())download(a.nome,a.blob,"application/pdf");}catch(e){}
 }
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
  /* SEGURANÃƒâ€¡A (19/07): antes isto apagava tudo sem alternativa. Agora ela escolhe,
     e JUNTAR ÃƒÂ© o padrÃƒÂ£o Ã¢â‚¬â€ importar por engano nÃƒÂ£o pode custar os dados dela. */
  const juntar=confirm(
    "O arquivo tem "+arr.length+" itens. VocÃƒÂª tem "+DATA.filter(d=>!d.deleted).length+" itens hoje.\n\n"+
    "OK = JUNTAR os dois (o que jÃƒÂ¡ existe ÃƒÂ© mantido; itens repetidos nÃƒÂ£o duplicam)\n"+
    "Cancelar = escolher a outra opÃƒÂ§ÃƒÂ£o");
  if(!juntar){
    if(!confirm("SUBSTITUIR TUDO?\n\nSeus "+DATA.filter(d=>!d.deleted).length+
      " itens atuais serÃƒÂ£o APAGADOS e ficarÃƒÂ¡ sÃƒÂ³ o conteÃƒÂºdo do arquivo.\n\nTem certeza?"))return;
    if(!confirm("ÃƒÅ¡ltima confirmaÃƒÂ§ÃƒÂ£o: isso nÃƒÂ£o tem como desfazer.\n\nApagar tudo e usar sÃƒÂ³ o arquivo?"))return;
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
   if(jaTenho.has(rest.uid)){pulados++;continue;}          /* nÃƒÂ£o duplica ao juntar */
   /* o cÃƒÂ³digo do GRUPO (ex.: SF) nÃƒÂ£o ÃƒÂ© empresa Ã¢â‚¬â€ nÃƒÂ£o pode virar uma linha na capa */
   if(rest.loja&&rest.loja!==GRUPO_SF&&!empresa(rest.loja)){EMPRESAS.push({code:rest.loja,name:rest.loja,ativa:true});novaEmp=true;}
   const nid=await putItem(rest);rest.id=nid;DATA.push(rest);jaTenho.add(rest.uid);novos++;}
  if(novaEmp)await saveEmpresas();
  fillLojaSelects();
  toast(novos+(novos===1?" item importado":" itens importados")+(pulados?" Ã‚Â· "+pulados+" jÃƒÂ¡ estavam aqui":"")+" Ã¢Å“â€œ");
  render();if(typeof renderDG==="function")renderDG();dataChanged();
 }catch(err){alert("NÃƒÂ£o consegui ler este arquivo.\n\nEste botÃƒÂ£o aceita apenas o arquivo .json de backup"
   +" gerado por este prÃƒÂ³prio site (botÃƒÂ£o \"Ã¢Â¬â€¡ Backup\" na capa).\n\n"
   +"Planilhas (.xlsx/.csv), PDF e Word nÃƒÂ£o entram por aqui.");}e.target.value="";}

/* ---- backup automÃƒÂ¡tico em pasta (Chrome/Edge no computador) ---- */
let backupT=null;
function dataChanged(){scheduleBackup();if(window.syncSchedule)syncSchedule();}
function scheduleBackup(){clearTimeout(backupT);backupT=setTimeout(doBackup,30000);}

async function setupAutoBackup(){
 if(!window.showDirectoryPicker){alert("O backup automÃƒÂ¡tico em pasta funciona no Chrome ou Edge no computador.\nNo celular/Safari, use o botÃƒÂ£o Fazer backup periodicamente.");return;}
 try{
   const dir=await showDirectoryPicker({mode:"readwrite"});
   await metaSet("backupDir",dir);
   toast("Backup automÃƒÂ¡tico configurado Ã¢Å“â€œ");
   await doBackup(true);
   renderHome();
 }catch(e){/* usuÃƒÂ¡ria cancelou o seletor */}
}
async function reauthBackup(){
 const dir=await metaGet("backupDir");if(!dir)return;
 try{const p=await dir.requestPermission({mode:"readwrite"});
   if(p==="granted"){toast("Pasta de backup reautorizada Ã¢Å“â€œ");await doBackup(true);renderHome();}
 }catch(e){}
}
async function doBackup(force){
 const dir=await metaGet("backupDir");if(!dir)return;
 try{
   const perm=dir.queryPermission?await dir.queryPermission({mode:"readwrite"}):"granted";
   if(perm!=="granted"){if(!force)return;/* precisa de gesto da usuÃƒÂ¡ria: card da capa mostra "Reautorizar" */}
   /* padrÃƒÂ£o da usuÃƒÂ¡ria: subpasta datada "Backup NC - DD.MM.AA" com json + csvs dentro */
   const d=new Date(),p2=n=>String(n).padStart(2,"0");
   const nomePasta="Backup NC - "+p2(d.getDate())+"."+p2(d.getMonth()+1)+"."+String(d.getFullYear()).slice(2);
   const sub=await dir.getDirectoryHandle(nomePasta,{create:true});
   const grava=async(nome,conteudo)=>{const fh=await sub.getFileHandle(nome,{create:true});
     const w=await fh.createWritable();await w.write(conteudo);await w.close();};
   await grava("Backup completo do site.json",JSON.stringify(buildBackupEnvelope(),null,2));
   await grava("Demandas e Manutencoes.csv","Ã¯Â»Â¿"+buildCsvGeral());
   if(window.ncBuildCSV){const c=ncBuildCSV();if(c)await grava("Relatorio de Nao Conformidade.csv","Ã¯Â»Â¿"+c);}
   /* UM PDF POR ABA dentro da pasta do dia, com o nome da aba (pedido dela, 20/07).
      Vai numa subpasta "PDF das abas" para nÃƒÂ£o misturar com as planilhas.
      Precisa de uma empresa aberta Ã¢â‚¬â€ as abas leem os dados da loja atual. */
   if(currentStore&&typeof pdfsPorAba==="function"){
     try{
       const sub2=await sub.getDirectoryHandle("PDF das abas",{create:true});
       for(const a of pdfsPorAba()){
         const fh=await sub2.getFileHandle(a.nome,{create:true});
         const w=await fh.createWritable();await w.write(a.blob);await w.close();
       }
     }catch(e){/* sem permissÃƒÂ£o ou sem empresa aberta: o resto do backup continua */}
   }
   await metaSet("lastBackup",nowISO());
   /* regra do projeto: manter apenas as ÃƒÂºltimas 7 pastas diÃƒÂ¡rias */
   try{
     const pastas=[];
     for await(const [nome,h] of dir.entries())
       if(h.kind==="directory"&&/^Backup NC - \d{2}\.\d{2}\.\d{2}$/.test(nome))pastas.push(nome);
     const chave=s=>s.slice(-8).split(".").reverse().join(""); /* DD.MM.AA Ã¢â€ â€™ AAMMDD p/ ordenar */
     pastas.sort((a,b)=>chave(a).localeCompare(chave(b)));
     while(pastas.length>7)await dir.removeEntry(pastas.shift(),{recursive:true}).catch(()=>{});
   }catch(e){}
   if(document.getElementById("view-home").style.display!=="none")renderHome();
 }catch(e){/* sem permissÃƒÂ£o/pasta removida Ã¢â‚¬â€ o card da capa oferece reautorizar */}
}

/* ===== privacidade: apagar tudo que o site guardou NESTE navegador =====
   Para uso em computadores de terceiros Ã¢â‚¬â€ remove registros locais, token
   de sincronizaÃƒÂ§ÃƒÂ£o e cache. Backups e outros dispositivos nÃƒÂ£o sÃƒÂ£o afetados. */
async function limparDispositivo(){
 if(!confirm("Apagar TODOS os dados deste dispositivo?\n\nIsso remove os registros locais, o token de sincronizaÃƒÂ§ÃƒÂ£o e o cache do site NESTE navegador.\nSeus outros dispositivos, a sincronizaÃƒÂ§ÃƒÂ£o e os backups NÃƒÆ’O sÃƒÂ£o afetados."))return;
 if(!confirm("Tem certeza? Esta aÃƒÂ§ÃƒÂ£o nÃƒÂ£o pode ser desfeita neste dispositivo."))return;
 try{if(db)db.close();}catch(e){}
 await new Promise(r=>{const q=indexedDB.deleteDatabase(DB_NAME);q.onsuccess=q.onerror=q.onblocked=()=>r();});
 /* APAGAR DE VERDADE (23/07): nÃƒÂ£o bastava tirar o token Ã¢â‚¬â€ sobravam preferÃƒÂªncias,
    o ÃƒÂºltimo usuÃƒÂ¡rio/repositÃƒÂ³rio e o que ficou na sessÃƒÂ£o. Em PC emprestado, tudo sai.
    SÃƒÂ³ os prefixos DESTE site sÃƒÂ£o varridos (o github.io ÃƒÂ© compartilhado com outras
    pÃƒÂ¡ginas dela Ã¢â‚¬â€ um localStorage.clear() levaria junto o que nÃƒÂ£o ÃƒÂ© daqui). */
 try{
   const PREF=["gh_sync_","sy_last_","ck_","ckq_","dg_","DG_","crono","capa_","nc_","pal_"];
   for(const k of Object.keys(localStorage))
     if(PREF.some(p=>k.startsWith(p)))localStorage.removeItem(k);
 }catch(e){}
 try{sessionStorage.clear();}catch(e){}
 try{if(window.caches)for(const k of await caches.keys())await caches.delete(k);}catch(e){}
 try{if(navigator.serviceWorker){const rs=await navigator.serviceWorker.getRegistrations();for(const rg of rs)await rg.unregister();}}catch(e){}
 alert("Dados deste dispositivo apagados Ã¢Å“â€œ");
 location.reload();
}

/* ===== Busca rÃƒÂ¡pida de abas (Ctrl+K) Ã¢â‚¬â€ pular para qualquer aba sem tirar a mÃƒÂ£o do teclado ===== */
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
/* sem acento e em minÃƒÂºsculas: digitar "manutencao" ou "nao" tambÃƒÂ©m encontra */
function semAcento(s){return (s||"").normalize("NFD").replace(/[ÃŒâ‚¬-ÃÂ¯]/g,"").toLowerCase();}
function paletteFilter(){
 const q=semAcento(document.getElementById("palInput").value.trim());
 /* ranking: quem COMEÃƒâ€¡A com o termo vem antes (digitar "man" deve achar ManutenÃƒÂ§ÃƒÂµes,
    nÃƒÂ£o "deMANdas"); depois quem tem alguma palavra comeÃƒÂ§ando com ele; por fim o resto */
 const peso=t=>{const l=semAcento(rotuloAba(t));
   if(l.startsWith(q))return 0;
   if(l.split(/[\sÃ‚Â·\-]+/).some(p=>p.startsWith(q)))return 1;
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
/* ===== ATALHO DIRETO (Plano D) =====
   Abrir o site com  ?rapido=CF  jÃƒÂ¡ cai na tela de registrar NC daquela loja,
   com a cÃƒÂ¢mera a um toque. Ãƒâ€° o que faz o atalho do iPhone valer a pena: um
   toque no ÃƒÂ­cone da tela inicial e ela jÃƒÂ¡ estÃƒÂ¡ fotografando, sem navegar.
   ?rapido=CF&aba=ck leva ao Checklist da loja em vez da NC. */
/* abrir o registro de uma loja com a cÃƒÂ¢mera pronta Ã¢â‚¬â€ usado pelo ?rapido=CF e pelo
   botÃƒÂ£o "Ã°Å¸â€œÂ· Registrar agora" do celular (uma funÃƒÂ§ÃƒÂ£o sÃƒÂ³, nÃƒÂ£o duas cÃƒÂ³pias) */
function irRegistrar(loja,aba){
  if(!empresa(loja)){toast("NÃƒÂ£o achei a empresa "+loja);return false;}
  enterStore(loja);
  aba=(aba||"nc").toLowerCase();
  showTab(TABS[aba]?aba:"nc");
  if(aba==="nc")setTimeout(()=>{
    const b=document.getElementById("nc-cap-body");
    if(b&&b.style.display==="none")ncToggleCap();
    const f=document.getElementById("nc-cap-foto");
    if(f)f.scrollIntoView({block:"center"});
  },250);
  return true;
}
/* botÃƒÂ£o do celular: uma loja ligada vai direto; mais de uma, ela escolhe. */
function registrarAgora(){
  const ativas=EMPRESAS.filter(e=>e.ativa);
  if(!ativas.length){toast("Ligue uma empresa antes (botÃƒÂ£o ao lado do nome).");return;}
  if(ativas.length===1){irRegistrar(ativas[0].code);return;}
  ncModal(`<h2 style="margin-bottom:4px">Ã°Å¸â€œÂ· Registrar em qual loja?</h2>
    <p class="desc">VocÃƒÂª estÃƒÂ¡ em qual unidade agora?</p>
    ${ativas.map(e=>`<button class="btn" style="width:100%;margin-bottom:8px"
      onclick="ncFechar();irRegistrar('${e.code}')">${esc(e.name)}</button>`).join("")}
    <div class="form-actions"><button class="btn ghost" onclick="ncFechar()">Cancelar</button></div>`);
}
/* etiqueta "N urgentes" da capa: entra na loja com mais urgentes, jÃƒÂ¡ na aba de NC */
function abrirUrgentes(){
  const vivos=DATA.filter(d=>!d.deleted);
  const conta=c=>vivos.filter(d=>d.loja===c&&d.tipo==="nc"&&d.urgencia==="URGENTE"&&isPendente(d)).length;
  const alvo=EMPRESAS.filter(e=>e.ativa).sort((a,b)=>conta(b.code)-conta(a.code))[0];
  if(!alvo){toast("Ligue uma empresa antes.");return;}
  enterStore(alvo.code);showTab("nc");
}
function atalhoRapido(){
  const q=new URLSearchParams(location.search);
  const loja=(q.get("rapido")||"").toUpperCase();
  if(!loja)return false;
  if(!irRegistrar(loja,q.get("aba")))return false;
  /* tira o ?rapido da barra: recarregar nÃƒÂ£o deve reabrir o formulÃƒÂ¡rio */
  try{history.replaceState(null,"",location.pathname);}catch(e){}
  return true;
}
/* VERSÃƒÆ’O DO SITE em UM lugar sÃƒÂ³. Estava escrita ÃƒÂ  mÃƒÂ£o em 3 pontos do index.html e
   um deles sempre ficava para trÃƒÂ¡s. Todo elemento com data-versao recebe este texto. */
const APP_VERSAO="9.27";
/* Quando esta versÃƒÂ£o do site foi publicada. Aparece ao lado do "v" para ela
   saber, de bater o olho, se o que estÃƒÂ¡ na tela ÃƒÂ© o mais novo. O "v" ÃƒÂ© de
   VERSÃƒÆ’O: cada mexida no site sobe esse nÃƒÂºmero. */
const APP_DATA="29/07/2026 · 07:02";
function carimbarVersao(){
  document.querySelectorAll("[data-versao]").forEach(el=>{
    el.textContent="v"+APP_VERSAO;
    el.title="VersÃƒÂ£o do site "+APP_VERSAO+" Ã¢â‚¬â€ publicada em "+APP_DATA;
  });
  /* a data sÃƒÂ³ aparece por extenso onde hÃƒÂ¡ espaÃƒÂ§o (rodapÃƒÂ© da capa) */
  document.querySelectorAll("[data-versao-data]").forEach(el=>{
    el.textContent="v"+APP_VERSAO+" Ã‚Â· atualizado em "+APP_DATA;
    el.title="O Ã¢â‚¬Å“vÃ¢â‚¬Â ÃƒÂ© de versÃƒÂ£o: cada mexida no site sobe esse nÃƒÂºmero.";
  });
}
function initAtalhos(){
 document.addEventListener("keydown",e=>{
   /* desfazer/refazer valem no site inteiro Ã¢â‚¬â€ menos enquanto ela digita num campo */
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

/* ===== COMO FAÃƒâ€¡O PARA... Ã¢â‚¬â€ manual navegÃƒÂ¡vel em portuguÃƒÂªs, sem cÃƒÂ³digo.
   Cada item tem passo a passo curto (o que clicar). O acesso ÃƒÂ© pela Capa,
   pelo mapa do site e pelo menu Ã¢â€¹Â¯. Escrito com base no fluxo real do dia. */
const COMO_FACO=[
  {k:"bot-registrar",titulo:"Registrar uma ocorrÃƒÂªncia pelo Telegram (bot da loja)",passos:[
    "Abra a conversa da loja no Telegram: NP Cabo Frio ou NP Arraial do Cabo.",
    "Mande foto, texto ou ÃƒÂ¡udio Ã¢â‚¬â€ em mensagens separadas, na ordem que quiser. Tudo entra no MESMO registro.",
    "Na primeira vez do dia, toque em Ã°Å¸â€œÂ Escolher a ÃƒÂ¡rea Ã¢â€ â€™ piso Ã¢â€ â€™ ÃƒÂ¡rea. Ela fica marcada para os prÃƒÂ³ximos registros.",
    "Confira a linha \"Ã¢Å¾Â¡ Vai para\": ManutenÃƒÂ§ÃƒÂµes ou RelatÃƒÂ³rio de NC. Se o bot errou, toque em Ã¢â€ â€ Mudar.",
    "Toque em Ã¢Å“â€¦ Concluir registro. Ele sobe para o site sozinho (ou espera a internet voltar, sem perder nada)."
  ]},
  {k:"bot-area",titulo:"Trocar de ÃƒÂ¡rea ou de piso no bot do Telegram",passos:[
    "Para outra ÃƒÂ¡rea do MESMO piso: digite /area e envie. Toque na ÃƒÂ¡rea nova.",
    "Para trocar de piso: digite /piso e envie.",
    "Se tiver registro em aberto, o bot pede para tocar Ã¢Å“â€¦ Concluir primeiro Ã¢â‚¬â€ depois ele mesmo abre a lista da prÃƒÂ³xima ÃƒÂ¡rea."
  ]},
  {k:"criar-empresa",titulo:"Criar uma empresa nova",passos:[
    "Na Capa, aperte o botÃƒÂ£o + Nova empresa (ao lado do tÃƒÂ­tulo Empresas).",
    "Escreva o nome e um cÃƒÂ³digo curto de 2 a 4 letras (ex.: BZ).",
    "Aperte Adicionar empresa. A empresa nova jÃƒÂ¡ entra ativa e as outras ficam inativas."
  ]},
  {k:"trocar-empresa",titulo:"Trocar a empresa em que vocÃƒÂª estÃƒÂ¡",passos:[
    "Volte ÃƒÂ  Capa (ÃƒÂ­cone da casa Ã°Å¸ÂÂ  na barra lateral).",
    "Clique no cadeado Ã°Å¸â€â€™ da empresa que estava desligada Ã¢â‚¬â€ ela vira ativa e as outras ficam inativas.",
    "Clique na linha da empresa para entrar."
  ]},
  {k:"editar-nome",titulo:"Mudar o nome de um quadro (aba)",passos:[
    "Dentro da empresa, entre no quadro que quer renomear.",
    "Aperte o Ã¢â€¹Â¯ no topo Ã¢â€ â€™ Ã¢Å“ÂÃ¯Â¸Â Editar os textos do site.",
    "Clique em cima do tÃƒÂ­tulo e escreva o novo nome. Clique fora para salvar."
  ]},
  {k:"filtros-cores",titulo:"Trocar as cores e nomes das prioridades/urgÃƒÂªncias",passos:[
    "Entre no quadro (Quadro Geral, NC ou Checklists).",
    "Aperte Ã¢Å¡â„¢ ConfiguraÃƒÂ§ÃƒÂµes no topo.",
    "Na linha Cores, aperte Trocar. Escolha a nova cor ou renomeie. Salva sozinho."
  ]},
  {k:"nova-inspecao",titulo:"Fazer uma inspeÃƒÂ§ÃƒÂ£o de Qualidade / BPF",passos:[
    "Entre na aba Qualidade / BPF (rail lateral ou hub).",
    "Se for a primeira vez, aperte Ã°Å¸ÂÅ¾ Criar os modelos prontos.",
    "Escolha o modelo (ex.: BPF Semanal) e aperte Ã¢â€“Â¶ Iniciar.",
    "Responda Ã°Å¸â€˜Â / Ã°Å¸â€˜Å½ / N-A em cada pergunta. Ao marcar Ã°Å¸â€˜Å½, aparece caixa de comentÃƒÂ¡rio e o botÃƒÂ£o Ã°Å¸â€œÅ’ Abrir tratativa.",
    "Ao terminar todas as etapas, aperte Ã¢Å“â€œ Concluir inspeÃƒÂ§ÃƒÂ£o.",
    "Na aba ConcluÃƒÂ­das, aperte Ã°Å¸â€œâ€ž RelatÃƒÂ³rio para gerar o PDF."
  ]},
  {k:"tratativa",titulo:"Registrar uma tratativa que vira demanda",passos:[
    "Numa inspeÃƒÂ§ÃƒÂ£o, marque Ã°Å¸â€˜Å½ na pergunta com problema.",
    "Aperte Ã°Å¸â€œÅ’ Abrir tratativa (5W2H).",
    "Preencha o que fazer, onde, quem, prazo. O campo Registrar como jÃƒÂ¡ vem sugerido (ManutenÃƒÂ§ÃƒÂ£o ou NC).",
    "Aperte Registrar. O item aparece na aba correspondente automaticamente."
  ]},
  {k:"backup",titulo:"Fazer um backup agora",passos:[
    "Na Capa, aperte Ã¢Â¬â€¡ Backup (ao lado do Ã¢Å¡â„¢ SincronizaÃƒÂ§ÃƒÂ£o).",
    "O site baixa os arquivos direto para a pasta de downloads.",
    "Se o backup automÃƒÂ¡tico estÃƒÂ¡ ativo, esta pasta tambÃƒÂ©m ÃƒÂ© atualizada sozinha."
  ]},
  {k:"backup-auto",titulo:"Ativar o backup automÃƒÂ¡tico no computador",passos:[
    "SÃƒÂ³ funciona no Chrome/Edge do computador (nÃƒÂ£o vai no celular).",
    "Na Capa, aperte Ã¢â€ â€¢ Organizar a capa (no rodapÃƒÂ©) e depois Ã¢Å¡â„¢ Ativar backup automÃƒÂ¡tico.",
    "Escolha a pasta onde os backups devem ficar (ex.: Backups - RelatÃƒÂ³rio NÃƒÂ£o Conformidades).",
    "Pronto. A partir de agora, cada mudanÃƒÂ§a grava sozinha em uma subpasta com a data."
  ]},
  {k:"celular-novo",titulo:"Instalar em um aparelho novo (iPhone/Android)",passos:[
    "Abra o site https://leticiaoliveira-gh.github.io/banco-demandas/",
    "iPhone: Compartilhar Ã¢â€ â€™ Adicionar ÃƒÂ  Tela de InÃƒÂ­cio. Android: menu Ã¢â€¹Â¯ do Chrome Ã¢â€ â€™ Instalar.",
    "Abra pelo ÃƒÂ­cone novo. Aperte Ã¢Å¡â„¢ SincronizaÃƒÂ§ÃƒÂ£o na capa.",
    "Preencha Dono, RepositÃƒÂ³rio e cole o token do GitHub. Aperte Salvar.",
    "Os dados descem sozinhos em alguns segundos."
  ]},
  {k:"pc-terceiros",titulo:"Usar em um computador que nÃƒÂ£o ÃƒÂ© seu",passos:[
    "Abra o site normalmente e aperte Ã¢Å¡â„¢ SincronizaÃƒÂ§ÃƒÂ£o.",
    "Marque a opÃƒÂ§ÃƒÂ£o NÃƒÆ’O SALVAR NESTE APARELHO (o token some quando fechar a aba).",
    "Ao terminar o expediente, aperte na Capa Ã°Å¸Å¡Âª Sair e apagar deste PC Ã¢â‚¬â€ envia o que vocÃƒÂª fez e apaga o rastro."
  ]},
  {k:"desfazer",titulo:"Desfazer algo que fiz sem querer",passos:[
    "Aperte Ctrl+Z (ou o botÃƒÂ£o Ã¢â€ Â no topo da rail lateral).",
    "Serve para tudo: texto, cor, exclusÃƒÂ£o, mover item, renomear. 40 passos guardados.",
    "Para refazer, Ctrl+Shift+Z ou botÃƒÂ£o Ã¢â€ â€™."
  ]},
  {k:"foto-iphone",titulo:"Foto do iPhone nÃƒÂ£o abre",passos:[
    "Se a mensagem \"salve como JPEG\" aparecer, ÃƒÂ© o formato HEIC do iPhone (o navegador nÃƒÂ£o lÃƒÂª).",
    "iPhone: Ajustes Ã¢â€ â€™ CÃƒÂ¢mera Ã¢â€ â€™ Formatos Ã¢â€ â€™ Mais compatÃƒÂ­vel. As prÃƒÂ³ximas fotos jÃƒÂ¡ saem em JPEG.",
    "As fotos antigas em HEIC: abra na galeria, aperte Compartilhar Ã¢â€ â€™ Salvar como arquivo (JPEG)."
  ]},
  {k:"perder-token",titulo:"Perdi o token do GitHub Ã¢â‚¬â€ e agora?",passos:[
    "Abra github.com, entre com sua conta.",
    "Menu do seu avatar Ã¢â€ â€™ Settings Ã¢â€ â€™ Developer settings Ã¢â€ â€™ Personal access tokens (classic).",
    "Aperte Generate new token (classic). Nome: banco-demandas sync, escopo REPO, sem expiraÃƒÂ§ÃƒÂ£o.",
    "Copie o token novo. Cole em cada aparelho pelo Ã¢Å¡â„¢ SincronizaÃƒÂ§ÃƒÂ£o.",
    "SÃƒÂ³ depois de todos os aparelhos estarem sincronizando, apague o antigo (se ainda existir)."
  ]}
];

function comoFacoLista(){
  const linhas=COMO_FACO.map(x=>`<li><a onclick="comoFaco('${x.k}')" style="cursor:pointer;color:#0f5b52;text-decoration:underline">${esc(x.titulo)}</a></li>`).join("");
  ncModal(`<h2 style="margin-bottom:4px">Ã¢Ââ€œ Como faÃƒÂ§o para...</h2>
    <p class="desc">Passo a passo curto para as coisas mais comuns do dia.</p>
    <div class="mapa-cx" style="margin-bottom:10px"><h3>Ã°Å¸â€œâ€¦ O caminho do meu dia</h3>
      <ol style="line-height:1.8;padding-left:22px;margin:4px 0">
        <li><b>Na loja</b> Ã¢â‚¬â€ viu algo errado? Registra pelo bot do Telegram da loja (foto/texto/ÃƒÂ¡udio; a ÃƒÂ¡rea fica marcada).</li>
        <li><b>Na loja</b> Ã¢â‚¬â€ checklist do dia na aba Checklists (se faltar algo, o botÃƒÂ£o "ir direto ao que falta" te leva).</li>
        <li><b>No escritÃƒÂ³rio</b> Ã¢â‚¬â€ abrir RelatÃƒÂ³rio de NC e ManutenÃƒÂ§ÃƒÂµes, completar o que chegou do bot (urgÃƒÂªncia, quem resolve, prazo).</li>
        <li><b>Entregar</b> Ã¢â‚¬â€ Ã°Å¸â€“Â¨ resumo para a gerÃƒÂªncia e Ã°Å¸â€œÂ± enviar no WhatsApp.</li>
        <li><b>De vez em quando</b> Ã¢â‚¬â€ conferir a sincronizaÃƒÂ§ÃƒÂ£o verde na Capa. O resto ÃƒÂ© automÃƒÂ¡tico.</li>
      </ol>
      <p class="mapa-nota">SÃƒÂ³ isso ÃƒÂ© o dia a dia. Todo o resto do site ÃƒÂ© configuraÃƒÂ§ÃƒÂ£o Ã¢â‚¬â€ nÃƒÂ£o precisa decorar.</p></div>
    <ul style="line-height:1.9;padding-left:20px">${linhas}</ul>
    <div class="form-actions"><button class="btn ghost" onclick="ncFechar()">Fechar</button></div>`);
}
function comoFaco(k){
  const it=COMO_FACO.find(x=>x.k===k);if(!it)return;
  const passos=it.passos.map((p,i)=>`<li style="margin-bottom:6px">${esc(p)}</li>`).join("");
  ncModal(`<h2 style="margin-bottom:4px">${esc(it.titulo)}</h2>
    <ol style="line-height:1.6;padding-left:22px">${passos}</ol>
    <div class="form-actions">
      <button class="btn ghost" onclick="comoFacoLista()">Ã¢â€ Â Voltar ÃƒÂ  lista</button>
      <button class="btn" onclick="ncFechar()">Entendi</button>
    </div>`);
}

/* ===== MAPA DO SITE Ã¢â‚¬â€ como tudo se liga, em portuguÃƒÂªs, para poder mexer sozinha.
   Ideia tirada do exemplo "base schema" do Airtable (diagrama da estrutura).
   Isto atende a pendÃƒÂªncia de AUTONOMIA: entender o prÃƒÂ³prio site sem depender de ninguÃƒÂ©m. ===== */
function mapaDoSite(){
  const vivos=DATA.filter(d=>!d.deleted);
  const cont=t=>vivos.filter(d=>d.tipo===t).length;
  const emp=EMPRESAS.map(e=>`<li><b>${esc(e.name)}</b> (${esc(e.code)})${e.grupo?` Ã‚Â· grupo <b>${esc(e.grupo)}</b>`:" Ã‚Â· sem grupo (agenda prÃƒÂ³pria)"}${e.ativa?"":" Ã‚Â· inativa"}</li>`).join("");
  const abas=TAB_ORDER.map(t=>`<li><b>${esc(rotuloAba(t))}</b> Ã¢â‚¬â€ guarda itens do tipo <code>${esc(TABS[t].tipo||"Ã¢â‚¬â€")}</code>, aparece no quadro de entrada: ${TABS[t].hub?"sim":"nÃƒÂ£o"}</li>`).join("");
  ncModal(`<h2 style="margin-bottom:4px">Ã°Å¸â€”Âº Mapa do site</h2>
  <p class="desc">Como as peÃƒÂ§as se ligam. Serve para vocÃƒÂª mexer no site sozinha Ã¢â‚¬â€ e para explicar a quem for te ajudar.</p>

  <div class="mapa-cx"><h3>1. Onde os dados moram</h3>
    <ul>
      <li><b>Neste navegador</b> Ã¢â‚¬â€ tudo fica gravado aqui dentro (IndexedDB <code>banco_nc_v3_base</code>). Funciona sem internet.</li>
      <li><b>No repositÃƒÂ³rio privado</b> <code>banco-demandas-dados</code> (arquivo <code>banco.json</code>) Ã¢â‚¬â€ ÃƒÂ© a cÃƒÂ³pia que viaja entre Lenovo, iPhone e Samsung.</li>
      <li><b>No site pÃƒÂºblico</b> <code>banco-demandas</code> Ã¢â‚¬â€ sÃƒÂ³ o cÃƒÂ³digo (as telas). <b>Nenhum dado seu fica aqui.</b></li>
    </ul></div>

  <div class="mapa-cx"><h3>2. Suas empresas</h3><ul>${emp}</ul>
    <p class="mapa-nota">Empresas do mesmo <b>grupo</b> dividem a agenda do Quadro Geral. Empresa nova nasce sem grupo, com agenda sÃƒÂ³ dela.</p></div>

  <div class="mapa-cx"><h3>3. As abas</h3><ul>${abas}</ul>
    <p class="mapa-nota">Para criar uma aba nova, mexe-se em <code>js/app.js</code>: uma linha em <code>TABS</code>, uma em <code>TAB_ORDER</code> e um painel no <code>index.html</code>. O resto (quadro de entrada, barra lateral, Ctrl+K) se atualiza sozinho.</p></div>

  <div class="mapa-cx"><h3>4. O que vocÃƒÂª tem hoje</h3>
    <ul>
      <li>Quadro Geral: <b>${cont("dg")}</b> demandas</li>
      <li>RelatÃƒÂ³rio de NÃƒÂ£o Conformidade: <b>${cont("nc")}</b> itens</li>
      <li>ManutenÃƒÂ§ÃƒÂµes e ElÃƒÂ©trica: <b>${cont("mnt")}</b> itens</li>
      <li>PendÃƒÂªncias de configuraÃƒÂ§ÃƒÂ£o: <b>${PENDENCIAS.filter(p=>!p.feita).length}</b> em aberto</li>
    </ul></div>

  <div class="mapa-cx"><h3>5. Os arquivos do site</h3>
    <ul>
      <li><code>index.html</code> Ã¢â‚¬â€ o esqueleto das telas</li>
      <li><code>css/app.css</code> Ã¢â‚¬â€ todas as cores, tamanhos e espaÃƒÂ§amentos</li>
      <li><code>js/app.js</code> Ã¢â‚¬â€ o nÃƒÂºcleo: empresas, abas, banco, backup</li>
      <li><code>js/dg.js</code> Ã¢â‚¬â€ a aba Quadro Geral</li>
      <li><code>js/ck.js</code> Ã¢â‚¬â€ a aba Checklists (modelos de inspeÃƒÂ§ÃƒÂ£o e preenchimentos)</li>
      <li><code>js/nc.js</code> Ã¢â‚¬â€ a aba de NÃƒÂ£o Conformidade e o relatÃƒÂ³rio</li>
      <li><code>js/sync.js</code> Ã¢â‚¬â€ a sincronizaÃƒÂ§ÃƒÂ£o entre aparelhos</li>
      <li><code>status.json</code> Ã¢â‚¬â€ o texto "onde paramos" que aparece na capa</li>
      <li><code>sw.js</code> Ã¢â‚¬â€ faz o site abrir sem internet</li>
    </ul>
    <p class="mapa-nota"><b>Regra de ouro ao publicar:</b> toda vez que se muda um arquivo, ÃƒÂ© preciso trocar o nÃƒÂºmero de versÃƒÂ£o em duas partes Ã¢â‚¬â€ o <code>?v=</code> no <code>index.html</code> e o <code>CACHE</code> no <code>sw.js</code>. Sem isso, o site continua mostrando o formato antigo.</p></div>

  <div class="mapa-cx"><h3>6. Se vocÃƒÂª quiser sair do site um dia</h3>
    <ul>
      <li><b>Ã¢Â¬â€¡ Exportar Excel</b> (dentro de uma empresa) tira tudo em planilha.</li>
      <li><b>Ã¢Â¬â€¡ Backup</b> (na capa) salva um arquivo com absolutamente tudo.</li>
      <li>Esse arquivo abre em qualquer computador, sem depender deste site nem de nenhuma inteligÃƒÂªncia artificial.</li>
    </ul></div>
  <div class="form-actions"><button class="btn" onclick="ncFechar()">Fechar</button></div>`);
}

/* (avatar/foto removidos a pedido da usuÃƒÂ¡ria em 17/07 Ã¢â‚¬â€ era sÃƒÂ³ estÃƒÂ©tico) */
let toastT;function toast(m){const t=document.getElementById("toast");t.textContent=m;t.classList.add("show");clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove("show"),2000);}

(async function(){await openDB();await seedIfEmpty();DATA=await getAll();
 /* migraÃƒÂ§ÃƒÂµes aditivas e idempotentes (nunca removem nada).
    HIST_LIGADO=false: sem isso o loop enche o histÃƒÂ³rico e o primeiro Ctrl+Z
    desfaz a migraÃƒÂ§ÃƒÂ£o em vez da ÃƒÂºltima aÃƒÂ§ÃƒÂ£o da usuÃƒÂ¡ria. */
 HIST_LIGADO=false;
 try{
   for(const d of DATA){
     let dirty=false;
     if(!d.tipo){d.tipo="mnt";dirty=true;}   /* itens antigos = ManutenÃƒÂ§ÃƒÂµes e ElÃƒÂ©trica */
     if(!d.uid){d.uid=(d.criado==="inicial")?seedUid(d.area,d.nc,d.executor):newUid();dirty=true;}  /* estÃƒÂ¡vel p/ sync; seed = determinÃƒÂ­stico */
     /* limpeza: a importaÃƒÂ§ÃƒÂ£o do Notion trouxe restos de HTML como linha (ex.: "<tr>") */
     if(d.tipo==="dg"&&Array.isArray(d.itens)){
       const antes=d.itens.length;
       d.itens=d.itens.filter(i=>!/^\s*<\/?[a-z][^>]*>\s*$/i.test(i.texto||""));
       if(d.itens.length!==antes){d.mod=nowISO();dirty=true;}
     }
     /* 19/07: demandas gerais das lojas do grupo passam a ser do GRUPO (agenda ÃƒÂºnica CF+AC) */
     if(d.tipo==="dg"&&d.loja!==GRUPO_SF&&(d.loja==="CF"||d.loja==="AC")&&!d.escopo){
       d.loja=GRUPO_SF;d.escopo="";d.mod=nowISO();dirty=true;}
     if(dirty)await putItem(d);
   }
 }finally{HIST_LIGADO=true;}
 await loadEmpresas();await loadExecutores();await loadPendencias();await loadRtInfo();await loadAreasAll();await loadAbaNomes();await loadAbaSub();await loadTextos();await loadCapaCfg();if(window.dgLoadOpcoes)await dgLoadOpcoes();if(window.ckLoadOpcoes)await ckLoadOpcoes();if(window.ncLoadUrgencias)await ncLoadUrgencias();if(window.ckqCarregarSetores)await ckqCarregarSetores();if(window.ckqMigrarPerguntasReais)await ckqMigrarPerguntasReais();await loadStatusSite();
 document.getElementById("fmData").value=today();
 renderTabs();fillExecSelects();initAtalhos();atualizarBotoesHist();carimbarVersao();
 goHome();
 atalhoRapido();          /* ?rapido=CF abre direto no registro de NC daquela loja */
 if(window.syncInit)syncInit();
 /* PWA: service worker sÃƒÂ³ em https (GitHub Pages); no file:// ÃƒÂ© ignorado */
 if("serviceWorker" in navigator&&location.protocol==="https:")
   navigator.serviceWorker.register("sw.js").catch(()=>{});
})();
