/* ===== Aba CHECKLISTS — inspeções por formulário =====
   Referência: o app Checkbits, que Lê usou em 19/07 e quis reproduzir aqui.

   DOIS tipos de item no banco:
   - {tipo:"ckm"} MODELO do checklist: a lista de perguntas (o "formulário").
   - {tipo:"ckp"} PREENCHIMENTO: uma inspeção feita a partir de um modelo.
     status "andamento" = PARCIAL (dá para sair e retomar); "concluido" = ENVIADO.

   ⚠️ REGRA CRÍTICA: as respostas são guardadas em `respostas` CHAVEADAS PELO uid DA
   PERGUNTA — nunca pelo índice. É isso que deixa reordenar/editar/excluir perguntas
   do modelo sem embaralhar o histórico das inspeções já feitas.

   ATENÇÃO (sync): o merge é last-write-wins por OBJETO INTEIRO (js/sync.js), igual ao
   Quadro Geral. Preencher a mesma inspeção em dois aparelhos ao mesmo tempo faz um
   sobrescrever o outro. */

/* ===== OPÇÕES EDITÁVEIS =====
   Mesma mecânica de DG_PRIOS/DG_SIT (js/dg.js): ela renomeia, recolore e reordena.
   REGRA DE OURO: a CHAVE nunca muda — é o que protege as perguntas já gravadas.
   Os TIPOS DE RESPOSTA são estrutura (cada um tem uma tela própria), então ela pode
   renomear e recolorir, mas não criar/excluir. */
const CK_TIPOS_PADRAO={
  simnao:{rotulo:"Sim / Não",cor:"#047857",fundo:"#d1fae5",ordem:0},
  selecao:{rotulo:"Seleção",cor:"#1668b8",fundo:"#e7f0f9",ordem:1},
  texto:{rotulo:"Texto",cor:"#8a8b96",fundo:"#f1f1f3",ordem:2},
  data:{rotulo:"Data",cor:"#b3730a",fundo:"#fdf0e0",ordem:3},
  assinatura:{rotulo:"Assinatura",cor:"#a23bb0",fundo:"#f6ecf8",ordem:4}
};
const CK_COMENT_PADRAO={
  inconforme:{rotulo:"Inconforme",cor:"#e5484d",fundo:"#ffecec",ordem:0},
  opcional:{rotulo:"Opcional",cor:"#8a8b96",fundo:"#f1f1f3",ordem:1},
  nao:{rotulo:"Não",cor:"#8a8b96",fundo:"#f1f1f3",ordem:2}
};
const CK_FOTO_PADRAO={
  opcional:{rotulo:"Opcional",cor:"#8a8b96",fundo:"#f1f1f3",ordem:0},
  obrigatoria:{rotulo:"Obrigatória",cor:"#e5484d",fundo:"#ffecec",ordem:1},
  nao:{rotulo:"Não",cor:"#8a8b96",fundo:"#f1f1f3",ordem:2}
};
let CK_TIPOS={...CK_TIPOS_PADRAO},CK_COMENT={...CK_COMENT_PADRAO},CK_FOTO={...CK_FOTO_PADRAO};
let CK_LISTAS={},CK_OPC_MOD="";

async function ckLoadOpcoes(){
  const g=await metaGet("ckOpcoes");CK_OPC_MOD=await metaGet("ckOpcoesMod")||"";
  if(g&&g.tipos&&Object.keys(g.tipos).length)CK_TIPOS=g.tipos;
  if(g&&g.coment&&Object.keys(g.coment).length)CK_COMENT=g.coment;
  if(g&&g.foto&&Object.keys(g.foto).length)CK_FOTO=g.foto;
  if(g&&g.listas)CK_LISTAS=g.listas;
}
async function ckSalvarOpcoes(){
  CK_OPC_MOD=nowISO();
  await metaSet("ckOpcoes",{tipos:CK_TIPOS,coment:CK_COMENT,foto:CK_FOTO,listas:CK_LISTAS});
  await metaSet("ckOpcoesMod",CK_OPC_MOD);
  dataChanged();renderCk();
}

/* seção aberta dentro da aba: formularios | enviados | parciais (fica no aparelho) */
let CK_SEC=localStorage.getItem("ck_sec")||"formularios";
function ckSetSec(s){CK_SEC=s;localStorage.setItem("ck_sec",s);renderCk();
  if(window.renderRailTabs){renderRailTabs();syncNav();}}

/* ===== Onde a inspeção mora =====
   O MODELO acompanha o grupo (um formulário serve as duas lojas, como a agenda).
   O PREENCHIMENTO é sempre da EMPRESA — quem foi inspecionada foi a loja. */
function ckLojaBase(){const g=grupoDe(currentStore);return g||currentStore;}
function ckModelos(){
  const base=ckLojaBase();
  return DATA.filter(d=>!d.deleted&&d.tipo==="ckm"&&d.loja===base&&(!d.escopo||d.escopo===currentStore))
             .sort((a,b)=>(a.ordem??1e9)-(b.ordem??1e9)||String(a.titulo||"").localeCompare(String(b.titulo||"")));
}
function ckPreenchimentos(status){
  return DATA.filter(d=>!d.deleted&&d.tipo==="ckp"&&d.loja===currentStore
                     &&(!status||d.status===status))
             .sort((a,b)=>String(b.atualizacao||b.criadoEm||"").localeCompare(String(a.atualizacao||a.criadoEm||"")));
}
function ckAchar(uid){return DATA.find(d=>d.uid===uid&&!d.deleted);}
function ckPerguntas(m){return (m.perguntas||[]).filter(p=>!p.removida)
                                .sort((a,b)=>(a.ordem??1e9)-(b.ordem??1e9));}

/* quantas perguntas já foram respondidas num preenchimento */
function ckAndamento(p){
  const m=ckAchar(p.modeloUid);
  const total=m?ckPerguntas(m).length:Object.keys(p.respostas||{}).length;
  return {feitas:Object.keys(p.respostas||{}).length,total};
}

/* ===== Tela ===== */
function renderCk(){
  const box=document.getElementById("tab-ck");if(!box)return;
  box.innerHTML=`
    <div class="ck-barra">
      <div class="ck-secs">
        ${ckSecBotao("formularios","📋",txt("ck.sec.formularios","Formulários"),ckModelos().length)}
        ${ckSecBotao("enviados","✅",txt("ck.sec.enviados","Enviados"),ckPreenchimentos("concluido").length)}
        ${ckSecBotao("parciais","⏸",txt("ck.sec.parciais","Parciais"),ckPreenchimentos("andamento").length)}
      </div>
      <div class="ck-acoes">
        ${CK_SEC==="formularios"?`<button class="btn sm" onclick="ckNovo()"><span data-txt="ck.novo">＋ Novo checklist</span></button>`:""}
      </div>
    </div>
    <div class="ck-corpo">${
      CK_SEC==="formularios"?ckListaModelosHTML():
      CK_SEC==="enviados"?ckListaPreenchHTML("concluido"):
      ckListaPreenchHTML("andamento")}</div>`;
  aplicarTextos(box);
}
function ckSecBotao(k,ico,rotulo,n){
  return `<button class="ck-sec${CK_SEC===k?" on":""}" onclick="ckSetSec('${k}')" title="${esc(rotulo)}">
    <span class="ic">${ico}</span><span class="nm">${esc(rotulo)}</span><span class="qt">${n}</span></button>`;
}
function ckVazio(titulo,dica){
  return `<div class="ck-vazio"><p class="t">${esc(titulo)}</p><p class="d">${esc(dica)}</p></div>`;
}

function ckListaModelosHTML(){
  const l=ckModelos();
  if(!l.length)return ckVazio(
    txt("ck.vazio.form","Nenhum checklist criado ainda."),
    txt("ck.vazio.formd","Um checklist é a lista de perguntas da inspeção — por exemplo \"Manutenção e Infraestrutura (Semanal)\". Clique em ＋ Novo checklist para montar o primeiro."));
  return `<div class="ck-cards">${l.map(m=>{
    const n=ckPerguntas(m).length;
    return `<div class="ck-card">
      <div class="ck-card-top">
        <b class="ck-card-tit">${esc(m.titulo||"(sem nome)")}</b>
        <span class="ck-qtd">${n} ${n===1?"pergunta":"perguntas"}</span>
      </div>
      ${m.descricao?`<p class="ck-card-desc">${esc(m.descricao)}</p>`:""}
      <div class="ck-card-pe">
        <button class="btn sm" onclick="ckIniciar('${m.uid}')" title="Fazer a inspeção agora">▶ <span data-txt="ck.preencher">Preencher</span></button>
        <button class="btn ghost sm" onclick="ckAbrirConstrutor('${m.uid}')" title="Editar as perguntas">✎ <span data-txt="ck.editar">Editar perguntas</span></button>
        <button class="btn ghost sm" onclick="ckRenomear('${m.uid}')" title="Renomear o checklist">✏️</button>
        <button class="btn ghost sm" onclick="ckDuplicarModelo('${m.uid}')" title="Duplicar o checklist inteiro">🗐</button>
        <button class="btn ghost sm" onclick="ckExcluirModelo('${m.uid}')" title="Excluir o checklist">🗑</button>
      </div></div>`;}).join("")}</div>`;
}

function ckListaPreenchHTML(status){
  const l=ckPreenchimentos(status);
  if(!l.length)return ckVazio(
    status==="concluido"?txt("ck.vazio.env","Nenhuma inspeção concluída ainda."):txt("ck.vazio.par","Nenhuma inspeção em andamento."),
    status==="concluido"?txt("ck.vazio.envd","Quando você terminar e assinar uma inspeção, ela aparece aqui, com a nota e o PDF.")
                        :txt("ck.vazio.pard","Se você começar uma inspeção e sair no meio, ela fica guardada aqui — nada se perde, dá para retomar de onde parou."));
  return `<div class="ck-tab-wrap"><table class="ck-tab">
    <thead><tr>
      <th data-txt="ck.col.data">Data</th>
      <th data-txt="ck.col.form">Checklist</th>
      <th data-txt="ck.col.quem">Responsável</th>
      ${status==="concluido"?`<th data-txt="ck.col.nota">Nota</th>`:`<th data-txt="ck.col.andamento">Andamento</th>`}
      <th></th></tr></thead>
    <tbody>${l.map(p=>{
      const a=ckAndamento(p);
      return `<tr>
        <td>${esc(brDate(p.concluidoEm||p.criadoEm||""))}</td>
        <td>${esc(p.modeloTitulo||"(checklist apagado)")}</td>
        <td>${esc(p.respondente||"—")}</td>
        <td>${status==="concluido"
              ?`<b class="ck-nota">${p.nota&&p.nota.pct!=null?p.nota.pct.toFixed(1).replace(".",",")+"%":"—"}</b>`
              :`<span class="ck-and">${a.feitas}/${a.total||"?"}</span>`}</td>
        <td class="ck-td-ac">
          ${status==="concluido"
            ?`<button class="btn ghost sm" onclick="ckVer('${p.uid}')" title="Abrir a inspeção">🔍</button>`
            :`<button class="btn sm" onclick="ckRetomar('${p.uid}')" title="Continuar de onde parou">▶ <span data-txt="ck.retomar">Retomar</span></button>`}
          <button class="btn ghost sm" onclick="ckExcluirPreench('${p.uid}')" title="Excluir esta inspeção">🗑</button>
        </td></tr>`;}).join("")}</tbody></table></div>`;
}

/* ===== Modelos: criar, renomear, duplicar, excluir ===== */
async function ckNovo(){
  if(!currentStore){toast("Escolha uma empresa primeiro");return;}
  const t=prompt("Nome do novo checklist:\n\n(exemplo: Manutenção e Infraestrutura — Semanal)");
  if(!t||!t.trim())return;
  const o={uid:newUid(),mod:nowISO(),tipo:"ckm",loja:ckLojaBase(),escopo:"",
    criado:"manual",criadoEm:today(),ordem:ckModelos().length,ativo:true,
    titulo:t.trim(),descricao:"",perguntas:[]};
  o.id=await putItem(o);DATA.push(o);dataChanged();
  CK_SEC="formularios";renderCk();
  toast("Checklist criado ✓");
}
async function ckRenomear(uid){
  const m=ckAchar(uid);if(!m)return;
  const t=prompt("Nome do checklist:",m.titulo||"");if(t===null)return;
  if(!t.trim()||t.trim()===m.titulo)return;
  m.titulo=t.trim();m.mod=nowISO();await putItem(m);dataChanged();renderCk();
  toast("Nome atualizado ✓");
}
async function ckDuplicarModelo(uid){
  const m=ckAchar(uid);if(!m)return;
  const o=JSON.parse(JSON.stringify(m));
  delete o.id;o.uid=newUid();o.mod=nowISO();o.criadoEm=today();
  o.titulo=(m.titulo||"")+" (cópia)";o.ordem=ckModelos().length;
  /* uid NOVO em cada pergunta: senão as respostas antigas se misturariam com as da cópia */
  o.perguntas=(o.perguntas||[]).map(p=>({...p,uid:newUid()}));
  o.id=await putItem(o);DATA.push(o);dataChanged();renderCk();
  toast("Checklist duplicado ✓");
}
async function ckExcluirModelo(uid){
  const m=ckAchar(uid);if(!m)return;
  /* inspeções guardam o título congelado, então não somem — mas ela precisa saber */
  const usos=DATA.filter(d=>!d.deleted&&d.tipo==="ckp"&&d.modeloUid===uid).length;
  const aviso=usos?"\n\nATENÇÃO: "+usos+" inspeção(ões) já foram feitas com ele.\nElas CONTINUAM guardadas em Enviados/Parciais.":"";
  if(!confirm("Excluir o checklist?\n\n"+(m.titulo||"")+aviso))return;
  await ckApagar(m);renderCk();toast("Checklist excluído");
}
async function ckExcluirPreench(uid){
  const p=ckAchar(uid);if(!p)return;
  if(!confirm("Excluir esta inspeção?\n\n"+(p.modeloTitulo||"")+" — "+brDate(p.criadoEm||"")
    +"\n\nAs respostas e as fotos serão apagadas."))return;
  await ckApagar(p);renderCk();toast("Inspeção excluída");
}
/* lápide quando a sincronização está ligada (senão o item volta do outro aparelho) */
async function ckApagar(d){
  if(window.syncEnabled&&syncEnabled()){d.deleted=true;d.mod=nowISO();await putItem(d);}
  else{await delDB(d.id);DATA=DATA.filter(x=>x.id!==d.id);}
  dataChanged();
}

/* ===== Ainda não construídos (próximas etapas) ===== */
function ckAbrirConstrutor(uid){toast("O construtor de perguntas é a próxima etapa");}
function ckIniciar(uid){toast("Preencher a inspeção vem na etapa 4");}
function ckRetomar(uid){toast("Preencher a inspeção vem na etapa 4");}
function ckVer(uid){toast("A ficha da inspeção vem na etapa 4");}
