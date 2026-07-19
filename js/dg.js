/* ===== Aba Demandas Gerais — agenda de tarefas com checklist =====
   Cada demanda é um item {tipo:"dg"} com uma lista PLANA de linhas em `itens[]`,
   onde a hierarquia vive no campo `nivel` (0..n). Isso representa o mesmo que
   as listas aninhadas do Notion, mas é muito mais simples de renderizar e mesclar.

   ATENÇÃO (sync): o merge é last-write-wins por OBJETO INTEIRO (js/sync.js).
   Marcar um subitem no celular enquanto edita o título no PC faz o mais recente
   sobrescrever o outro. O uso é sequencial (um aparelho por vez), então tudo bem —
   mas não introduzir edição simultânea sem repensar isso. */

const DG_PRIOS={
  URGENTE:{rotulo:"URGENTE",cor:"#e5484d",fundo:"#ffecec"},
  ALTA:{rotulo:"ALTA",cor:"#a23bb0",fundo:"#f6ecf8"},
  MEDIA:{rotulo:"MÉDIA",cor:"#b3730a",fundo:"#fdf0e0"},
  BAIXA:{rotulo:"BAIXA",cor:"#12b76a",fundo:"#e6f7ef"}
};
const DG_SIT={
  nao_iniciado:{rotulo:"Não iniciado",cor:"#8a8b96",fundo:"#f1f1f3"},
  andamento:{rotulo:"Em andamento",cor:"#1668b8",fundo:"#e7f0f9"},
  concluido:{rotulo:"Concluído",cor:"#047857",fundo:"#d1fae5"}
};
const DG_SEM={rotulo:"SEM PRIORIDADE",cor:"#8a8b96",fundo:"#f1f1f3"};
let DG_ABERTAS={};        /* uid da demanda -> aberta? (só visual, não sincroniza) */
let DG_GRUPO="prioridade";

function dgVivos(){return DATA.filter(d=>!d.deleted&&d.tipo==="dg"&&d.loja===currentStore);}
function dgProgresso(d){const l=(d.itens||[]).filter(i=>i.tipoLinha==="check");
  return {feitos:l.filter(i=>i.feito).length,total:l.length};}

function renderDG(){
  const box=document.getElementById("tab-dg");if(!box)return;
  const q=semAcento((document.getElementById("dgQ")?.value)||"");
  const fSit=document.getElementById("dgSit")?.value||"";
  let lista=dgVivos().filter(d=>{
    if(fSit&&(d.situacao||"nao_iniciado")!==fSit)return false;
    if(!q)return true;
    const alvo=semAcento(d.titulo||"")+" "+semAcento((d.itens||[]).map(i=>i.texto).join(" "));
    return alvo.includes(q);
  });
  /* agrupamento no estilo do Notion */
  const grupos=[];
  if(DG_GRUPO==="prioridade"){
    for(const k of Object.keys(DG_PRIOS))grupos.push({chave:k,...DG_PRIOS[k],itens:lista.filter(d=>d.prioridade===k)});
    grupos.push({chave:"",...DG_SEM,itens:lista.filter(d=>!d.prioridade)});
  }else{
    for(const k of Object.keys(DG_SIT))grupos.push({chave:k,rotulo:DG_SIT[k].rotulo.toUpperCase(),cor:DG_SIT[k].cor,fundo:DG_SIT[k].fundo,itens:lista.filter(d=>(d.situacao||"nao_iniciado")===k)});
  }
  const corpo=grupos.filter(g=>g.itens.length).map(g=>`
    <div class="dg-grupo">
      <div class="dg-grupo-h" style="color:${g.cor};background:${g.fundo}">${esc(g.rotulo)}<span class="dg-cont">${g.itens.length}</span></div>
      ${g.itens.map(dgLinhaHTML).join("")}
    </div>`).join("");
  box.innerHTML=`
    <div class="dg-bar">
      <div class="emp-search" style="flex:1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="dgQ" placeholder="Buscar na agenda (título ou item da lista)..." value="${esc((document.getElementById("dgQ")?.value)||"")}" oninput="renderDG()">
      </div>
      <select id="dgGrupo" onchange="DG_GRUPO=this.value;renderDG()" title="Agrupar por">
        <option value="prioridade"${DG_GRUPO==="prioridade"?" selected":""}>Agrupar: Prioridade</option>
        <option value="situacao"${DG_GRUPO==="situacao"?" selected":""}>Agrupar: Situação</option>
      </select>
      <select id="dgSit" onchange="renderDG()" title="Filtrar por situação">
        <option value="">Todas as situações</option>
        ${Object.keys(DG_SIT).map(k=>`<option value="${k}"${fSit===k?" selected":""}>${DG_SIT[k].rotulo}</option>`).join("")}
      </select>
      <button class="btn sm" onclick="dgNova()">+ Nova demanda</button>
    </div>
    ${corpo||`<div class="empty">Nenhuma demanda aqui ainda. Use "+ Nova demanda" para criar a primeira.</div>`}`;
  requestAnimationFrame(()=>{const i=document.getElementById("dgQ");if(i&&q)  {i.focus();i.setSelectionRange(i.value.length,i.value.length);}});
}

function dgLinhaHTML(d){
  const p=dgProgresso(d),aberta=!!DG_ABERTAS[d.uid],sit=DG_SIT[d.situacao||"nao_iniciado"]||DG_SIT.nao_iniciado;
  const concl=(d.situacao==="concluido");
  return `<div class="dg-item${concl?" done":""}">
    <div class="dg-item-top" onclick="dgToggleAberta('${d.uid}')">
      <span class="dg-caret${aberta?" open":""}">▸</span>
      <span class="dg-tit">${esc(d.titulo||"(sem título)")}</span>
      ${p.total?`<span class="dg-prog" title="itens concluídos">${p.feitos}/${p.total}</span>`:""}
      <span class="dg-badge" style="color:${sit.cor};background:${sit.fundo}">${sit.rotulo}</span>
      ${d.prazo?`<span class="dg-prazo" title="Prazo">${brDate(d.prazo)}</span>`:""}
    </div>
    ${aberta?`<div class="dg-corpo">
      <div class="dg-acts">
        <select onchange="dgSetCampo('${d.uid}','prioridade',this.value)" title="Prioridade">
          <option value="">Sem prioridade</option>
          ${Object.keys(DG_PRIOS).map(k=>`<option value="${k}"${d.prioridade===k?" selected":""}>${DG_PRIOS[k].rotulo}</option>`).join("")}
        </select>
        <select onchange="dgSetCampo('${d.uid}','situacao',this.value)" title="Situação">
          ${Object.keys(DG_SIT).map(k=>`<option value="${k}"${(d.situacao||"nao_iniciado")===k?" selected":""}>${DG_SIT[k].rotulo}</option>`).join("")}
        </select>
        <input type="date" value="${esc(d.prazo||"")}" onchange="dgSetCampo('${d.uid}','prazo',this.value)" title="Prazo">
        <button class="btn ghost sm" onclick="dgEditarTitulo('${d.uid}')">✎ Renomear</button>
        <button class="btn ghost sm" onclick="dgAddLinha('${d.uid}')">+ Item</button>
        ${d.notionUrl?`<a class="btn ghost sm" href="${esc(d.notionUrl)}" target="_blank" rel="noopener" title="Abrir a tarefa original no Notion">↗ Notion</a>`:""}
        <button class="btn ghost sm" style="margin-left:auto" onclick="dgExcluir('${d.uid}')">🗑</button>
      </div>
      ${dgItensHTML(d)}
    </div>`:""}
  </div>`;
}

/* lista plana com níveis; uma "secao" fechada esconde as linhas de nível maior até a próxima seção de nível <= */
function dgItensHTML(d){
  const itens=d.itens||[];
  if(!itens.length)return `<div class="dg-vazio">Sem itens. Use "+ Item" para começar a lista.</div>`;
  let html="",escondeAte=-1;
  itens.forEach((it,i)=>{
    if(escondeAte>=0){ if(it.nivel>escondeAte)return; escondeAte=-1; }
    const pad=12+(it.nivel||0)*20;
    if(it.tipoLinha==="secao"){
      if(!it.aberto)escondeAte=it.nivel||0;
      html+=`<div class="dg-sec" style="padding-left:${pad}px" onclick="dgToggleSecao('${d.uid}',${i})">
        <span class="dg-caret${it.aberto?" open":""}">▸</span>${esc(it.texto)}</div>`;
    }else if(it.tipoLinha==="texto"){
      html+=`<div class="dg-txt" style="padding-left:${pad+18}px">${dgLink(it.texto)}</div>`;
    }else{
      html+=`<label class="dg-chk" style="padding-left:${pad}px">
        <input type="checkbox" ${it.feito?"checked":""} onchange="dgToggleItem('${d.uid}',${i},this.checked)">
        <span class="${it.feito?"feito":""}">${dgLink(it.texto)}</span>
        <button class="dg-del" title="Excluir este item" onclick="event.preventDefault();dgDelLinha('${d.uid}',${i})">×</button></label>`;
    }
  });
  return `<div class="dg-lista">${html}</div>`;
}
/* links markdown [texto](url) viram links de verdade; o resto é escapado */
function dgLink(t){
  return esc(t||"").replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,
    (m,txt,url)=>`<a href="${url}" target="_blank" rel="noopener">${txt}</a>`);
}

/* ---- ações ---- */
function dgAchar(uid){return DATA.find(d=>d.uid===uid&&!d.deleted);}
async function dgSalvar(d){d.mod=nowISO();await putItem(d);dataChanged();}
function dgToggleAberta(uid){DG_ABERTAS[uid]=!DG_ABERTAS[uid];renderDG();}
async function dgToggleSecao(uid,i){const d=dgAchar(uid);if(!d)return;
  d.itens[i].aberto=!d.itens[i].aberto;await dgSalvar(d);renderDG();}
async function dgToggleItem(uid,i,val){const d=dgAchar(uid);if(!d)return;
  d.itens[i].feito=!!val;await dgSalvar(d);renderDG();}
async function dgSetCampo(uid,campo,val){const d=dgAchar(uid);if(!d)return;
  d[campo]=val;await dgSalvar(d);renderDG();}
async function dgEditarTitulo(uid){const d=dgAchar(uid);if(!d)return;
  const t=prompt("Título da demanda:",d.titulo||"");if(t===null)return;
  d.titulo=t.trim()||d.titulo;await dgSalvar(d);renderDG();}
async function dgAddLinha(uid){const d=dgAchar(uid);if(!d)return;
  const t=prompt("Novo item da lista:");if(!t||!t.trim())return;
  (d.itens=d.itens||[]).push({uid:newUid(),texto:t.trim(),feito:false,nivel:0,tipoLinha:"check"});
  await dgSalvar(d);renderDG();}
async function dgDelLinha(uid,i){const d=dgAchar(uid);if(!d)return;
  if(!confirm("Excluir este item?\n\n"+(d.itens[i]?.texto||"")))return;
  d.itens.splice(i,1);await dgSalvar(d);renderDG();}
async function dgNova(){
  if(!currentStore){toast("Escolha uma empresa primeiro");return;}
  const t=prompt("Nova demanda:");if(!t||!t.trim())return;
  const o={uid:newUid(),mod:nowISO(),tipo:"dg",loja:currentStore,criado:"manual",
    titulo:t.trim(),prioridade:"",situacao:"nao_iniciado",prazo:"",criadoEm:today(),itens:[]};
  const id=await putItem(o);o.id=id;DATA.push(o);dataChanged();
  DG_ABERTAS[o.uid]=true;renderDG();}
async function dgExcluir(uid){const d=dgAchar(uid);if(!d)return;
  if(!confirm("Excluir a demanda?\n\n"+(d.titulo||"")+"\n\nOs itens da lista também serão apagados."))return;
  if(window.syncEnabled&&syncEnabled()){d.deleted=true;d.mod=nowISO();await putItem(d);}   /* lápide: propaga a exclusão */
  else{await delDB(d.id);DATA=DATA.filter(x=>x.id!==d.id);}
  dataChanged();renderDG();}
