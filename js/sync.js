/* =====================================================================
   Sincronização entre dispositivos — GitHub Contents API
   Os dados são gravados como banco.json num repositório PRIVADO separado
   (padrão: banco-demandas-dados), nunca no repositório público do site.
   Credencial: fine-grained PAT, guardado só neste navegador (localStorage,
   fora do IndexedDB para nunca sair num backup exportado).
   ===================================================================== */

const SYNC_DEFAULT_OWNER="leticiaoliveira-gh";
const SYNC_DEFAULT_REPO="banco-demandas-dados";
const SYNC_FILE="banco.json";

let syncSha=null,syncT=null,syncBusy=false,syncDirty=false,syncLast=0;

/* Guarda de credencial com 2 modos:
   - localStorage: PERMANENTE, para dispositivos da própria usuária (Lenovo, Samsung, iPhone).
   - sessionStorage: só nesta ABA, some sozinho ao fechar — para PC de terceiros/trabalho,
     onde nada pode ficar salvo entre uma sessão e outra. */
function syncGetAny(k){
 let v;try{v=localStorage.getItem(k);}catch(e){v=null;}
 if(v!=null)return v;
 try{v=sessionStorage.getItem(k);}catch(e){v=null;}
 return v;
}
function syncIsTemporario(){
 try{return !localStorage.getItem("gh_sync_token")&&!!sessionStorage.getItem("gh_sync_token");}catch(e){return false;}
}
function syncCfg(){return {
  owner:(syncGetAny("gh_sync_owner")||SYNC_DEFAULT_OWNER).trim(),
  repo:(syncGetAny("gh_sync_repo")||SYNC_DEFAULT_REPO).trim(),
  token:(syncGetAny("gh_sync_token")||"").trim()};}
function syncEnabled(){return !!syncCfg().token;}
function syncApi(c){return "https://api.github.com/repos/"+c.owner+"/"+c.repo+"/contents/"+SYNC_FILE;}
function syncHdrs(c){return {"Authorization":"Bearer "+c.token,"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"};}

/* base64 seguro para UTF-8 (acentos) */
function b64encUtf8(s){const b=new TextEncoder().encode(s);let bin="";const CH=0x8000;
 for(let i=0;i<b.length;i+=CH)bin+=String.fromCharCode.apply(null,b.subarray(i,i+CH));return btoa(bin);}
function b64decUtf8(b64){const bin=atob((b64||"").replace(/\s/g,""));const arr=new Uint8Array(bin.length);
 for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);return new TextDecoder().decode(arr);}

/* ---- estado visual ----
   Capa (syncPillHome): botão permanente, é ONDE se configura.
   Dentro da empresa (syncPill): só aparece quando está sincronizando ou com
   problema — quando está tudo certo, some para não poluir a barra. */
function setSyncState(s){
 const map={off:"⚙ Sincronização",sync:"⇅ Sincronizando…",ok:"✓ Sincronizado",err:"⚠ Sync com erro",offline:"⚠ Sem conexão"};
 const cor=(s==="err"||s==="offline")?"var(--amber)":(s==="ok"?"var(--green)":"");
 const home=document.getElementById("syncPillHome");
 if(home){home.textContent=map[s]||map.off;home.style.color=cor;}
 const pill=document.getElementById("syncPill");
 if(pill){pill.textContent=map[s]||map.off;pill.style.color=cor;
  pill.style.display=(s==="sync"||s==="err"||s==="offline")?"":"none";}
}

function syncRefreshViews(){
 fillLojaSelects();
 if(document.getElementById("view-app").style.display!=="none")showTab(currentTab);
 else renderHome();}

/* ---- merge por item: chave uid, vence o maior mod ---- */
async function syncMergeEnvelope(env){
 let changed=false,localAhead=false;
 const remoteItens=Array.isArray(env&&env.itens)?env.itens:[];
 const remoteByUid=new Map(remoteItens.filter(r=>r&&r.uid).map(r=>[r.uid,r]));
 const localByUid=new Map(DATA.filter(d=>d.uid).map(d=>[d.uid,d]));
 for(const [uid,r] of remoteByUid){
   const l=localByUid.get(uid);
   if(!l){const {id,...rest}=r;const nid=await putItem(rest);rest.id=nid;DATA.push(rest);changed=true;}
   else if((r.mod||"")>(l.mod||"")){const keep=l.id;Object.assign(l,r);l.id=keep;await putItem(l);changed=true;}
   else if((l.mod||"")>(r.mod||""))localAhead=true;
 }
 for(const [uid] of localByUid)if(!remoteByUid.has(uid))localAhead=true;
 /* empresas: vence a lista com empresasMod mais novo, preservando códigos só-locais */
 if(env&&Array.isArray(env.empresas)&&(env.empresasMod||"")>EMPRESAS_MOD){
   const codes=new Set(env.empresas.map(e=>e&&e.code).filter(Boolean));
   EMPRESAS=env.empresas.filter(e=>e&&e.code).concat(EMPRESAS.filter(e=>!codes.has(e.code)));
   EMPRESAS_MOD=env.empresasMod;
   await metaSet("empresas",EMPRESAS);await metaSet("empresasMod",EMPRESAS_MOD);
   changed=true;
 }else if(env&&(EMPRESAS_MOD||"")>(env.empresasMod||""))localAhead=true;
 /* pendências de configuração: vence a lista com pendenciasMod mais novo */
 if(env&&Array.isArray(env.pendencias)&&(env.pendenciasMod||"")>PENDENCIAS_MOD){
   PENDENCIAS=env.pendencias;PENDENCIAS_MOD=env.pendenciasMod;
   await metaSet("pendencias",PENDENCIAS);await metaSet("pendenciasMod",PENDENCIAS_MOD);
   changed=true;
 }else if(env&&(PENDENCIAS_MOD||"")>(env.pendenciasMod||""))localAhead=true;
 /* áreas por empresa: vence o areasMod mais novo (novidade v4.6) */
 if(env&&env.areas&&typeof env.areas==="object"&&(env.areasMod||"")>(AREAS_MOD||"")){
   for(const code of Object.keys(env.areas)){
     const lista=env.areas[code];
     if(!Array.isArray(lista))continue;
     AREAS_ALL[code]=lista;
     if(typeof NC_AREAS!=="undefined")NC_AREAS[code]=lista;
     await metaSet("areas_"+code,lista);
   }
   AREAS_MOD=env.areasMod;await metaSet("areasMod",AREAS_MOD);
   const wrapNC=document.getElementById("tab-nc");if(wrapNC)wrapNC.dataset.store="";
   changed=true;
 }else if(env&&(AREAS_MOD||"")>(env.areasMod||""))localAhead=true;
 /* informações da RT (CRN etc.): vence o rtInfoMod mais novo */
 if(env&&typeof env.rtInfo==="string"&&(env.rtInfoMod||"")>RT_INFO_MOD){
   RT_INFO=env.rtInfo;RT_INFO_MOD=env.rtInfoMod;
   await metaSet("rtInfo",RT_INFO);await metaSet("rtInfoMod",RT_INFO_MOD);
   changed=true;
 }else if(env&&(RT_INFO_MOD||"")>(env.rtInfoMod||""))localAhead=true;
 /* nomes das abas que ela renomeou: vence o mais novo */
 if(env&&env.abaNomes&&(env.abaNomesMod||"")>(ABA_NOMES_MOD||"")){
   ABA_NOMES=env.abaNomes;ABA_NOMES_MOD=env.abaNomesMod;
   await metaSet("abaNomes",ABA_NOMES);await metaSet("abaNomesMod",ABA_NOMES_MOD);
   if(window.renderTabs)renderTabs();changed=true;
 }else if(env&&(ABA_NOMES_MOD||"")>(env.abaNomesMod||""))localAhead=true;
 /* a linha livre que ela escreve embaixo do título de cada quadro (20/07) */
 if(env&&env.abaSub&&(env.abaSubMod||"")>(ABA_SUB_MOD||"")){
   ABA_SUB=env.abaSub;ABA_SUB_MOD=env.abaSubMod;
   await metaSet("abaSub",ABA_SUB);await metaSet("abaSubMod",ABA_SUB_MOD);
   if(window.updateSubtitle&&currentTab)updateSubtitle(currentTab);changed=true;
 }else if(env&&(ABA_SUB_MOD||"")>(env.abaSubMod||""))localAhead=true;
 /* textos que ela reescreveu pelo modo edição */
 if(env&&env.textos&&(env.textosMod||"")>(TEXTOS_MOD||"")){
   TEXTOS=env.textos;TEXTOS_MOD=env.textosMod;
   await metaSet("textos",TEXTOS);await metaSet("textosMod",TEXTOS_MOD);
   if(window.aplicarTextos)aplicarTextos();changed=true;
 }else if(env&&(TEXTOS_MOD||"")>(env.textosMod||""))localAhead=true;
 /* opções de prioridade/situação que ela configurou
    (modDG/modNC/modCK vêm de js/app.js — window.DG_OPC_MOD daria sempre undefined,
     porque `let` no topo de um script não vira propriedade de window) */
 if(env&&env.dgOpcoes&&(env.dgOpcoesMod||"")>modDG()){
   if(env.dgOpcoes.prios)DG_PRIOS=env.dgOpcoes.prios;
   if(env.dgOpcoes.sits)DG_SIT=env.dgOpcoes.sits;
   if(env.dgOpcoes.papeis){DG_CHAVE_CONCLUIDO=env.dgOpcoes.papeis.concluido||DG_CHAVE_CONCLUIDO;
     DG_CHAVE_ANDAMENTO=env.dgOpcoes.papeis.andamento||DG_CHAVE_ANDAMENTO;
     DG_CHAVE_URGENTE=env.dgOpcoes.papeis.urgente||DG_CHAVE_URGENTE;}
   DG_OPC_MOD=env.dgOpcoesMod;
   await metaSet("dgOpcoes",env.dgOpcoes);await metaSet("dgOpcoesMod",DG_OPC_MOD);
   if(window.renderDG)renderDG();changed=true;
 }else if(env&&modDG()>(env.dgOpcoesMod||""))localAhead=true;
 /* opções da aba Checklists (tipos de resposta, comentário, foto e listas de seleção) */
 if(env&&env.ckOpcoes&&(env.ckOpcoesMod||"")>modCK()){
   if(env.ckOpcoes.tipos)CK_TIPOS=env.ckOpcoes.tipos;
   if(env.ckOpcoes.coment)CK_COMENT=env.ckOpcoes.coment;
   if(env.ckOpcoes.foto)CK_FOTO=env.ckOpcoes.foto;
   if(env.ckOpcoes.listas)CK_LISTAS=env.ckOpcoes.listas;
   CK_OPC_MOD=env.ckOpcoesMod;
   await metaSet("ckOpcoes",env.ckOpcoes);await metaSet("ckOpcoesMod",CK_OPC_MOD);
   if(window.renderCk)renderCk();changed=true;
 }else if(env&&modCK()>(env.ckOpcoesMod||""))localAhead=true;
 /* urgências da aba de Não Conformidade */
 if(env&&env.ncUrgencias&&(env.ncUrgenciasMod||"")>modNC()){
   NC_URG={...env.ncUrgencias};NC_URG_MOD=env.ncUrgenciasMod;
   await metaSet("ncUrgencias",env.ncUrgencias);await metaSet("ncUrgenciasMod",NC_URG_MOD);
   if(window.renderNC)renderNC();changed=true;
 }else if(env&&modNC()>(env.ncUrgenciasMod||""))localAhead=true;
 return {changed,localAhead};
}

async function syncPull(){
 const c=syncCfg();
 const r=await fetch(syncApi(c),{headers:syncHdrs(c),cache:"no-store"});
 if(r.status===404){syncSha=null;return {changed:false,localAhead:DATA.length>0||EMPRESAS.length>0};}
 if(!r.ok)throw new Error("GET "+r.status);
 const j=await r.json();syncSha=j.sha;
 /* ARMADILHA (achada em 19/07, com o banco em 1,1 MB): acima de 1 MB o GitHub
    devolve a ficha do arquivo SEM o conteúdo — e a sincronização quebrava com
    "banco.json inválido". Nesse caso, buscar o conteúdo pela via dos blobs,
    que aguenta arquivos grandes. */
 let txt="";
 if(j.content&&j.content.replace(/\s/g,""))txt=b64decUtf8(j.content);
 else{
   const rb=await fetch("https://api.github.com/repos/"+c.owner+"/"+c.repo+"/git/blobs/"+j.sha,
     {headers:{...syncHdrs(c),Accept:"application/vnd.github.raw"},cache:"no-store"});
   if(!rb.ok)throw new Error("GET blob "+rb.status);
   txt=await rb.text();
 }
 let env=null;try{env=JSON.parse(txt);}catch(e){throw new Error("banco.json inválido");}
 return await syncMergeEnvelope(env);
}

async function syncPush(isRetry){
 const c=syncCfg();
 /* expurga lápides com mais de 30 dias (a exclusão já propagou) */
 const corte=new Date(Date.now()-30*864e5).toISOString();
 for(const d of [...DATA])if(d.deleted&&(d.mod||"")<corte){await delDB(d.id);DATA.splice(DATA.indexOf(d),1);}
 const body={message:"sync "+nowISO(),content:b64encUtf8(JSON.stringify(buildBackupEnvelope(),null,1))};
 if(body.content.length>5*1024*1024&&!window.__syncBigWarned){
   window.__syncBigWarned=true;
   toast("⚠ Os dados de sincronização passaram de 5 MB — fotos pesam. Considere excluir fotos de NCs antigas já resolvidas.");
 }
 if(syncSha)body.sha=syncSha;
 const r=await fetch(syncApi(c),{method:"PUT",headers:syncHdrs(c),body:JSON.stringify(body)});
 if((r.status===409||r.status===422)&&!isRetry){
   /* outro dispositivo gravou primeiro: puxa, refunde e tenta 1x de novo */
   await syncPull();return syncPush(true);
 }
 if(!r.ok)throw new Error("PUT "+r.status);
 const j=await r.json();syncSha=j.content&&j.content.sha||null;syncDirty=false;
}

async function syncNow(){
 if(!syncEnabled()||syncBusy)return;
 syncBusy=true;clearTimeout(syncT);setSyncState("sync");
 try{
   const res=await syncPull();
   if(res.changed)syncRefreshViews();
   /* envia quando há mudança local pendente, algo só-local, ou o arquivo remoto ainda não existe */
   if(syncDirty||res.localAhead||syncSha===null)await syncPush();
   syncLast=Date.now();setSyncState("ok");
 }catch(e){
   setSyncState(navigator.onLine===false?"offline":"err");
 }
 syncBusy=false;
}

function syncSchedule(){if(!syncEnabled())return;syncDirty=true;clearTimeout(syncT);syncT=setTimeout(syncNow,60000);}

function syncInit(){
 setSyncState(syncEnabled()?"sync":"off");
 if(syncEnabled()){
   syncNow();
   if(syncIsTemporario())setTimeout(()=>toast("🔓 Sincronização temporária ativa — some sozinha ao fechar esta aba."),2500);
   /* aviso de validade do token (fine-grained PAT dura no máx. 1 ano) */
   const td=syncGetAny("gh_sync_token_date");
   if(td&&(Date.now()-new Date(td).getTime())>335*864e5)
     setTimeout(()=>toast("⚠ O token de sincronização está perto de vencer — gere um novo em GitHub → Settings → Developer settings."),2500);
 }else setSyncState("off");
 document.addEventListener("visibilitychange",()=>{
   if(!document.hidden&&syncEnabled()&&!syncBusy&&Date.now()-syncLast>60000)syncNow();});
 window.addEventListener("online",()=>{if(syncEnabled())syncNow();});
}

/* ---- tela de configuração ---- */
function openSyncModal(){
 let m=document.getElementById("sync-modal");
 if(!m){
   m=document.createElement("div");m.id="sync-modal";
   m.style.cssText="position:fixed;inset:0;background:rgba(20,20,30,.45);z-index:60;display:flex;align-items:center;justify-content:center;padding:16px";
   m.innerHTML=`
   <div class="form-wrap" style="max-width:560px;max-height:90vh;overflow:auto" onclick="event.stopPropagation()">
     <h2>⚙ Sincronização entre dispositivos</h2>
     <p class="desc">Seus dados são gravados num repositório <b>privado</b> do seu GitHub (nunca no site público). Configure uma vez em cada dispositivo e tudo passa a se atualizar sozinho.</p>
     <div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin-bottom:18px;font-size:12.5px;line-height:1.6">
       <b>Como criar (só na primeira vez):</b><br>
       1. No GitHub, crie um repositório <b>privado</b> chamado <b>banco-demandas-dados</b> (github.com/new).<br>
       2. Vá em <b>Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token</b>.<br>
       3. Em <i>Repository access</i>, escolha <b>Only select repositories</b> → selecione <b>banco-demandas-dados</b>.<br>
       4. Em <i>Permissions → Repository permissions → Contents</i>, escolha <b>Read and write</b>.<br>
       5. Validade: <b>1 ano</b>. Gere e copie o token (começa com <code>github_pat_</code>) e cole abaixo.
     </div>
     <div class="grid2">
       <div class="field"><label>Usuário do GitHub</label><input id="syOwner"></div>
       <div class="field"><label>Repositório privado</label><input id="syRepo"></div>
     </div>
     <div class="field"><label>Token (fine-grained PAT)</label><input id="syToken" type="password" placeholder="github_pat_..."></div>
     <label style="display:flex;gap:9px;align-items:flex-start;font-size:12.5px;margin:2px 0 16px;cursor:pointer;line-height:1.5">
       <input type="checkbox" id="syTemp" style="width:auto;margin-top:2px">
       <span><b>Não salvar neste dispositivo</b> — use em computador de trabalho ou de terceiros. O acesso funciona só até você fechar esta aba; depois disso, nada fica guardado aqui, mesmo que outra pessoa use o PC em seguida.</span>
     </label>
     <div id="syMsg" style="font-size:12.5px;margin-bottom:12px"></div>
     <div class="form-actions" style="flex-wrap:wrap">
       <button class="btn ghost" onclick="testSyncConnection()">Testar conexão</button>
       <button class="btn" onclick="saveSyncConfig()">Salvar e sincronizar</button>
       <button class="btn ghost" onclick="disableSync()">Desativar</button>
       <button class="btn ghost" onclick="closeSyncModal()">Fechar</button>
     </div>
   </div>`;
   m.onclick=closeSyncModal;
   document.body.appendChild(m);
 }
 const c=syncCfg();
 document.getElementById("syOwner").value=c.owner;
 document.getElementById("syRepo").value=c.repo;
 document.getElementById("syToken").value=c.token;
 document.getElementById("syTemp").checked=syncIsTemporario();
 document.getElementById("syMsg").textContent=syncEnabled()?
   (syncIsTemporario()?"Sincronização TEMPORÁRIA ativa — some ao fechar esta aba.":"Sincronização ativa neste dispositivo."):"";
 m.style.display="flex";
}
function closeSyncModal(){const m=document.getElementById("sync-modal");if(m)m.style.display="none";}

function syCfgFromForm(){return {
 owner:document.getElementById("syOwner").value.trim(),
 repo:document.getElementById("syRepo").value.trim(),
 token:document.getElementById("syToken").value.trim()};}

async function testSyncConnection(){
 const c=syCfgFromForm(),msg=document.getElementById("syMsg");
 if(!c.owner||!c.repo||!c.token){msg.textContent="Preencha usuário, repositório e token.";msg.style.color="var(--amber)";return;}
 msg.textContent="Testando…";msg.style.color="";
 try{
   const r=await fetch("https://api.github.com/repos/"+c.owner+"/"+c.repo,{headers:syncHdrs(c)});
   if(r.status===404)throw new Error("Repositório não encontrado — confira o nome e se o token tem acesso a ele.");
   if(r.status===401)throw new Error("Token inválido ou expirado.");
   if(!r.ok)throw new Error("Erro "+r.status+" ao acessar o repositório.");
   const j=await r.json();
   if(!j.private){msg.textContent="⚠ Esse repositório é PÚBLICO. Use um repositório privado para os seus dados.";msg.style.color="var(--amber)";return;}
   if(!(j.permissions&&j.permissions.push)){msg.textContent="⚠ O token não tem permissão de escrita (Contents: Read and write).";msg.style.color="var(--amber)";return;}
   msg.textContent="✓ Conexão OK — repositório privado com permissão de escrita.";msg.style.color="var(--green)";
 }catch(e){msg.textContent="✗ "+e.message;msg.style.color="var(--amber)";}
}

async function saveSyncConfig(){
 const c=syCfgFromForm(),msg=document.getElementById("syMsg");
 if(!c.owner||!c.repo||!c.token){msg.textContent="Preencha usuário, repositório e token.";msg.style.color="var(--amber)";return;}
 const temporario=document.getElementById("syTemp").checked;
 const guarda=temporario?sessionStorage:localStorage;
 const outra=temporario?localStorage:sessionStorage;
 try{["gh_sync_owner","gh_sync_repo","gh_sync_token","gh_sync_token_date"].forEach(k=>outra.removeItem(k));}catch(e){}
 if(c.token!==(syncGetAny("gh_sync_token")||""))guarda.setItem("gh_sync_token_date",nowISO());
 guarda.setItem("gh_sync_owner",c.owner);
 guarda.setItem("gh_sync_repo",c.repo);
 guarda.setItem("gh_sync_token",c.token);
 closeSyncModal();toast(temporario?"Sincronização temporária ativada ✓ (some ao fechar a aba)":"Sincronização configurada ✓");
 syncDirty=true;syncNow();
}

function disableSync(){
 try{["gh_sync_token","gh_sync_owner","gh_sync_repo","gh_sync_token_date"].forEach(k=>{localStorage.removeItem(k);sessionStorage.removeItem(k);});}catch(e){}
 setSyncState("off");closeSyncModal();toast("Sincronização desativada neste dispositivo");
}
