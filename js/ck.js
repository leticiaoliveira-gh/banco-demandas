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
   renomear e recolorir, mas NÃO criar/excluir — ver dgGerirOpcoes/podeCriar. */
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
  CK_ASSINATURA=await metaGet("assinaturaRT")||"";
}
async function ckSalvarOpcoes(){
  CK_OPC_MOD=nowISO();
  await metaSet("ckOpcoes",{tipos:CK_TIPOS,coment:CK_COMENT,foto:CK_FOTO,listas:CK_LISTAS});
  await metaSet("ckOpcoesMod",CK_OPC_MOD);
  dataChanged();renderCk();
}
/* rótulo de uma opção, caindo no padrão se ela apagou/renomeou */
const ckRot=(mapa,k,padrao)=>((mapa[k]||{}).rotulo)||padrao||k;

/* assinatura dela: desenha UMA vez e o site aplica sozinho em toda inspeção */
let CK_ASSINATURA="";

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
async function ckSalvar(d){d.mod=nowISO();await putItem(d);dataChanged();}

function ckAndamento(p){
  const m=ckAchar(p.modeloUid);
  const total=m?ckPerguntas(m).length:Object.keys(p.respostas||{}).length;
  return {feitas:Object.keys(p.respostas||{}).length,total};
}
/* uma resposta é "ruim" (inconforme)? sim/não => "nao"; seleção => opção marcada ruim */
function ckRuim(perg,resp){
  if(!resp||resp.na)return false;
  if(perg.tipoResp==="simnao")return resp.valor==="nao";
  if(perg.tipoResp==="selecao"){
    const L=CK_LISTAS[perg.opcoesLista];if(!L)return false;
    const o=(L.opcoes||[]).find(x=>x.chave===resp.valor);
    return !!(o&&o.ruim);
  }
  return false;
}
/* NOTA: conformes ÷ aplicáveis. N/A e perguntas com peso 0 ficam FORA da conta. */
function ckNota(p){
  const m=ckAchar(p.modeloUid);if(!m)return {pontos:0,total:0,pct:null};
  let pontos=0,total=0;
  for(const perg of ckPerguntas(m)){
    if(perg.tipoResp==="data"||perg.tipoResp==="texto"||perg.tipoResp==="assinatura")continue;
    const peso=perg.peso==null?1:Number(perg.peso)||0;
    if(!peso)continue;
    const r=(p.respostas||{})[perg.uid];
    if(!r||r.na||r.valor===undefined||r.valor==="")continue;   /* não respondida/N-A: fora */
    total+=peso;
    if(!ckRuim(perg,r))pontos+=peso;
  }
  return {pontos,total,pct:total?Math.round(pontos/total*1000)/10:null};
}
function ckInconformes(p){
  const m=ckAchar(p.modeloUid);if(!m)return [];
  return ckPerguntas(m).filter(perg=>ckRuim(perg,(p.respostas||{})[perg.uid]));
}

/* ===== Tela principal da aba ===== */
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
        ${CK_SEC==="formularios"?`
          <button class="btn sm" onclick="ckNovo()"><span data-txt="ck.novo">＋ Novo checklist</span></button>
          <button class="filtro-cfg-bt" onclick="dgGerirOpcoes('cktipos')" title="Renomear ou recolorir os tipos de resposta">⚙ <span data-txt="ck.cfg.tipos">Tipos</span></button>
          <button class="filtro-cfg-bt" onclick="ckGerirListas()" title="Criar e editar as listas de opções">⚙ <span data-txt="ck.cfg.listas">Listas</span></button>`:""}
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
  if(!l.length)return `<div class="ck-vazio">
    <p class="t" data-txt="ck.vazio.form">Nenhum checklist criado ainda.</p>
    <p class="d" data-txt="ck.vazio.formd">Um checklist é a lista de perguntas da inspeção.
      Você pode começar do zero, ou já sair com o de Manutenção e Infraestrutura montado —
      e depois mudar o que quiser nele.</p>
    <div class="ck-vazio-bts">
      <button class="btn" onclick="ckModeloPronto()">✨ <span data-txt="ck.pronto.bt">Criar o checklist de Manutenção e Infraestrutura</span></button>
      <button class="btn ghost" onclick="ckNovo()"><span data-txt="ck.novo2">＋ Criar um vazio</span></button>
    </div></div>`;
  return `<div class="ck-cards">${l.map(m=>{
    const n=ckPerguntas(m).length;
    return `<div class="ck-card">
      <div class="ck-card-top">
        <b class="ck-card-tit">${esc(m.titulo||"(sem nome)")}</b>
        <span class="ck-qtd">${n} ${n===1?"pergunta":"perguntas"}</span>
      </div>
      ${m.descricao?`<p class="ck-card-desc">${esc(m.descricao)}</p>`:""}
      <div class="ck-card-pe">
        <button class="btn sm" ${n?"":"disabled title='Adicione perguntas antes de preencher'"} onclick="ckIniciar('${m.uid}')">▶ <span data-txt="ck.preencher">Preencher</span></button>
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
      ${status==="concluido"?`<th data-txt="ck.col.inc">Inconformes</th><th data-txt="ck.col.nota">Nota</th>`
                            :`<th data-txt="ck.col.andamento">Andamento</th>`}
      <th></th></tr></thead>
    <tbody>${l.map(p=>{
      const a=ckAndamento(p),inc=status==="concluido"?ckInconformes(p).length:0;
      return `<tr>
        <td>${esc(brDate(p.concluidoEm||p.criadoEm||""))}</td>
        <td>${esc(p.modeloTitulo||"(checklist apagado)")}</td>
        <td>${esc(p.respondente||"—")}</td>
        ${status==="concluido"
          ?`<td>${inc?`<span class="ck-inc">${inc}</span>`:`<span class="ck-ok">nenhum</span>`}</td>
            <td><b class="ck-nota">${p.nota&&p.nota.pct!=null?String(p.nota.pct).replace(".",",")+"%":"—"}</b></td>`
          :`<td><span class="ck-and">${a.feitas}/${a.total||"?"}</span></td>`}
        <td class="ck-td-ac">
          ${status==="concluido"
            ?`<button class="btn ghost sm" onclick="ckVer('${p.uid}')" title="Abrir a inspeção">🔍</button>
              <button class="btn ghost sm" onclick="ckPDF('${p.uid}')" title="Imprimir / salvar em PDF">🖨</button>`
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
  CK_SEC="formularios";ckAbrirConstrutor(o.uid);
  toast("Checklist criado ✓");
}
/* MODELO PRONTO — as 8 perguntas do formulário que Lê usou de referência.
   Ela pediu "faça igual": a aba nascer vazia deixava o trabalho todo com ela.
   É um PONTO DE PARTIDA: depois de criado, tudo é editável como qualquer outro. */
const CK_MODELO_SMK=[
  ["Vedação/porta de freezers e geladeiras está íntegra?","Comentário obrigatório se NÃO.","simnao",false,"inconforme","opcional",1],
  ["Iluminação de loja está 100% operante?","Comentário obrigatório se NÃO.","simnao",false,"inconforme","opcional",1],
  ["Ar-condicionado/ventilação (se houver) funcionando?","Marque N/A se não aplicável.","simnao",true,"inconforme","opcional",1],
  ["Balanças (setores e checkout) estão funcionando corretamente?","Comentário obrigatório se NÃO.","simnao",false,"inconforme","nao",1],
  ["Há demanda de manutenção aberta esta semana?","Se SIM, descrever no comentário e abrir o plano de ação.","simnao",false,"inconforme","opcional",1],
  ["Prioridade da manutenção (se houver)","Selecione a prioridade.","selecao",true,"inconforme","nao",0],
  ["Data da inspeção semanal","Informe a data.","data",false,"opcional","nao",0],
  ["Responsável pela inspeção","Assinatura legível.","assinatura",false,"opcional","nao",0]
];
async function ckModeloPronto(){
  if(!currentStore){toast("Escolha uma empresa primeiro");return;}
  /* a lista de prioridades que a pergunta 6 usa; "Alta" conta como inconforme */
  let chaveLista=Object.keys(CK_LISTAS).find(k=>CK_LISTAS[k].nome==="Prioridade da manutenção");
  if(!chaveLista){
    chaveLista="lst_"+newUid();
    CK_LISTAS[chaveLista]={nome:"Prioridade da manutenção",opcoes:[
      {chave:"o_baixa",rotulo:"Baixa",cor:"#12b76a",fundo:clarear("#12b76a"),ruim:false},
      {chave:"o_media",rotulo:"Média",cor:"#b3730a",fundo:clarear("#b3730a"),ruim:false},
      {chave:"o_alta",rotulo:"Alta",cor:"#e5484d",fundo:clarear("#e5484d"),ruim:true}]};
    CK_OPC_MOD=nowISO();
    await metaSet("ckOpcoes",{tipos:CK_TIPOS,coment:CK_COMENT,foto:CK_FOTO,listas:CK_LISTAS});
    await metaSet("ckOpcoesMod",CK_OPC_MOD);
  }
  const o={uid:newUid(),mod:nowISO(),tipo:"ckm",loja:ckLojaBase(),escopo:"",
    criado:"modelo",criadoEm:today(),ordem:ckModelos().length,ativo:true,
    titulo:"Manutenção e Infraestrutura (Semanal)",
    descricao:"Inspeção semanal da loja. Marque 👎 no que estiver fora do padrão.",
    perguntas:CK_MODELO_SMK.map(([t,d,tp,na,co,fo,peso],i)=>({
      uid:newUid(),titulo:t,descricao:d,tipoResp:tp,
      opcoesLista:tp==="selecao"?chaveLista:"",
      na,coment:co,foto:fo,peso,ordem:i,removida:false}))};
  o.id=await putItem(o);DATA.push(o);dataChanged();
  CK_SEC="formularios";renderCk();ckAbrirConstrutor(o.uid);
  toast("Checklist pronto ✓ Mude o que quiser nele");
}
async function ckRenomear(uid){
  const m=ckAchar(uid);if(!m)return;
  const t=prompt("Nome do checklist:",m.titulo||"");if(t===null)return;
  if(!t.trim()||t.trim()===m.titulo)return;
  m.titulo=t.trim();await ckSalvar(m);renderCk();toast("Nome atualizado ✓");
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

/* ===================================================================
   CONSTRUTOR DE PERGUNTAS — a tela dos prints do Checkbits
   =================================================================== */
let CK_MODELO_ABERTO="",CK_BUSCA="",CK_SEL=new Set();

function ckAbrirConstrutor(uid){
  CK_MODELO_ABERTO=uid;CK_BUSCA="";CK_SEL.clear();ckDesenhaConstrutor();
}
function ckFecharConstrutor(){
  const el=document.getElementById("ck-constr");if(el)el.remove();
  document.body.style.overflow="";CK_MODELO_ABERTO="";CK_SEL.clear();renderCk();
}
function ckPerguntasVisiveis(m){
  const q=semAcento(CK_BUSCA||"");
  return ckPerguntas(m).filter(p=>!q||semAcento((p.titulo||"")+" "+(p.descricao||"")).includes(q));
}
function ckDesenhaConstrutor(){
  const m=ckAchar(CK_MODELO_ABERTO);if(!m)return ckFecharConstrutor();
  let el=document.getElementById("ck-constr");
  if(!el){el=document.createElement("div");el.id="ck-constr";el.className="ck-constr";document.body.appendChild(el);}
  document.body.style.overflow="hidden";
  const vis=ckPerguntasVisiveis(m),todas=ckPerguntas(m);
  el.innerHTML=`<div class="ck-constr-box">
    <div class="ck-constr-h">
      <div style="flex:1;min-width:0">
        <h2 class="ck-ed-tit" contenteditable="plaintext-only" spellcheck="false"
          onblur="ckSetModelo('titulo',this.innerText.trim())"
          onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}">${esc(m.titulo||"")}</h2>
        <div class="ck-ed-desc" contenteditable="plaintext-only" spellcheck="false"
          data-ph="Descrição do checklist (opcional)"
          onblur="ckSetModelo('descricao',this.innerText.trim())">${esc(m.descricao||"")}</div>
      </div>
      <button class="btn ghost sm" onclick="ckFecharConstrutor()">✕ <span data-txt="ck.fechar">Fechar</span></button>
    </div>
    <div class="ck-constr-barra">
      <div class="search" style="flex:1">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" value="${esc(CK_BUSCA)}" data-txt-ph="ck.buscar" placeholder="Encontrar perguntas..."
          oninput="CK_BUSCA=this.value;ckRedesenhaLista()">
      </div>
      <span class="ck-qtd">${todas.length} ${todas.length===1?"pergunta":"perguntas"}</span>
      <button class="btn sm" onclick="ckAddPergunta()">＋ <span data-txt="ck.item">Pergunta</span></button>
    </div>
    ${ckBarraMassaHTML()}
    <div class="ck-constr-corpo" id="ck-lista">${ckTabelaHTML(m,vis)}</div>
    <div class="ck-constr-pe">
      <span class="ck-dica" data-txt="ck.dica.arraste">Arraste pela alça ⠿ para mudar a ordem. O texto edita clicando em cima.</span>
      <button class="btn" onclick="ckFecharConstrutor()"><span data-txt="ck.pronto">Pronto</span></button>
    </div></div>`;
  aplicarTextos(el);
}
function ckRedesenhaLista(){
  const m=ckAchar(CK_MODELO_ABERTO);if(!m)return;
  const box=document.getElementById("ck-lista");if(!box)return;
  box.innerHTML=ckTabelaHTML(m,ckPerguntasVisiveis(m));
  const b=document.querySelector(".ck-massa-wrap");
  if(b)b.outerHTML=ckBarraMassaHTML();
  aplicarTextos(box);
}
function ckTabelaHTML(m,vis){
  if(!ckPerguntas(m).length)return ckVazio(
    txt("ck.vazio.perg","Este checklist ainda não tem perguntas."),
    txt("ck.vazio.pergd","Clique em ＋ Pergunta para criar a primeira. Cada pergunta vira uma tela na hora de preencher."));
  if(!vis.length)return ckVazio(txt("ck.vazio.busca","Nenhuma pergunta encontrada."),
    txt("ck.vazio.buscad","Tente outras palavras, ou limpe a busca."));
  const todas=ckPerguntas(m);
  return `<table class="ck-perg">
    <thead><tr>
      <th class="c-arr"></th><th class="c-n">#</th>
      <th data-txt="ck.h.titulo">Título</th>
      <th data-txt="ck.h.desc">Descrição</th>
      <th data-txt="ck.h.tipo">Tipo</th>
      <th data-txt="ck.h.na">Não Aplicável</th>
      <th data-txt="ck.h.coment">Comentários</th>
      <th data-txt="ck.h.foto">Foto</th>
      <th data-txt="ck.h.peso">Peso</th>
      <th class="c-ac"></th>
    </tr></thead>
    <tbody>${vis.map(p=>{
      const n=todas.indexOf(p)+1;
      return `<tr class="ck-lin${CK_SEL.has(p.uid)?" sel":""}" data-uid="${p.uid}">
        <td class="c-arr"><span class="ck-alca" title="Arraste para mudar a ordem"
          onpointerdown="ckArrIni(event,this)">⠿</span>
          <input type="checkbox" class="ck-chk" ${CK_SEL.has(p.uid)?"checked":""}
            onchange="ckToggleSel('${p.uid}')" title="Selecionar"></td>
        <td class="c-n">${n}</td>
        <td><div class="ck-ed" contenteditable="plaintext-only" spellcheck="false"
              data-ph="Escreva a pergunta"
              onblur="ckSetPergunta('${p.uid}','titulo',this.innerText.trim())"
              onkeydown="ckTeclaPergunta(event,'${p.uid}',this)">${esc(p.titulo||"")}</div></td>
        <td><div class="ck-ed sub" contenteditable="plaintext-only" spellcheck="false"
              data-ph="Instrução para quem preenche"
              onblur="ckSetPergunta('${p.uid}','descricao',this.innerText.trim())">${esc(p.descricao||"")}</div></td>
        <td>${ckSelectHTML(p,"tipoResp",CK_TIPOS)}
            ${p.tipoResp==="selecao"?ckSelectListaHTML(p):""}</td>
        <td>${ckPilulaSimNao(p,"na")}</td>
        <td>${ckSelectHTML(p,"coment",CK_COMENT)}</td>
        <td>${ckSelectHTML(p,"foto",CK_FOTO)}</td>
        <td><input class="ck-peso" type="number" min="0" max="9" step="1"
              value="${p.peso==null?1:p.peso}" title="Quanto essa pergunta vale na nota (0 = não conta)"
              onchange="ckSetPergunta('${p.uid}','peso',this.value)"></td>
        <td class="c-ac">
          <button class="ck-mini" onclick="ckDuplicarPergunta('${p.uid}')" title="Duplicar esta pergunta">🗐</button>
          <button class="ck-mini" onclick="ckAddPergunta('${p.uid}')" title="Criar uma pergunta logo abaixo">＋</button>
          <button class="ck-mini del" onclick="ckExcluirPergunta('${p.uid}')" title="Excluir esta pergunta">🗑</button>
        </td></tr>`;}).join("")}</tbody></table>`;
}
function ckSelectHTML(p,campo,mapa){
  return `<select class="ck-sel" onchange="ckSetPergunta('${p.uid}','${campo}',this.value)">
    ${ordenarOpc(mapa).map(k=>`<option value="${k}"${(p[campo]||"")===k?" selected":""}>${esc(mapa[k].rotulo)}</option>`).join("")}
  </select>`;
}
function ckSelectListaHTML(p){
  const ks=Object.keys(CK_LISTAS);
  return `<select class="ck-sel mini" onchange="ckSetPergunta('${p.uid}','opcoesLista',this.value)" title="Qual lista de opções usar">
    <option value="">— escolha a lista —</option>
    ${ks.map(k=>`<option value="${k}"${p.opcoesLista===k?" selected":""}>${esc(CK_LISTAS[k].nome)}</option>`).join("")}
  </select>${ks.length?"":`<button class="ck-mini" onclick="ckGerirListas()" title="Criar uma lista de opções">⚙</button>`}`;
}
function ckPilulaSimNao(p,campo){
  const on=!!p[campo];
  return `<button class="ck-pil${on?" on":""}" onclick="ckSetPergunta('${p.uid}','${campo}',${on?"false":"true"})"
    title="${on?"Permite marcar Não Aplicável":"Não permite marcar Não Aplicável"}">${on?"Sim":"Não"}</button>`;
}

async function ckSetModelo(campo,val){
  const m=ckAchar(CK_MODELO_ABERTO);if(!m)return;
  if(campo==="titulo"&&!val)return;                 /* não deixa ficar sem nome */
  if(m[campo]===val)return;
  m[campo]=val;await ckSalvar(m);
}
async function ckSetPergunta(uid,campo,val){
  const m=ckAchar(CK_MODELO_ABERTO);if(!m)return;
  const p=(m.perguntas||[]).find(x=>x.uid===uid);if(!p)return;
  if(campo==="peso")val=Math.max(0,Math.min(9,parseInt(val,10)||0));
  if(p[campo]===val)return;
  p[campo]=val;await ckSalvar(m);
  /* campos de texto não redesenham (perderia o cursor); os outros sim */
  if(campo!=="titulo"&&campo!=="descricao")ckRedesenhaLista();
}
async function ckAddPergunta(depoisDe){
  const m=ckAchar(CK_MODELO_ABERTO);if(!m)return;
  const lista=ckPerguntas(m);
  const nova={uid:newUid(),titulo:"",descricao:"",tipoResp:"simnao",opcoesLista:"",
    na:false,coment:"inconforme",foto:"opcional",peso:1,ordem:0,removida:false};
  const pos=depoisDe?lista.findIndex(p=>p.uid===depoisDe)+1:lista.length;
  lista.splice(pos,0,nova);
  lista.forEach((p,i)=>p.ordem=i);
  m.perguntas=[...lista,...(m.perguntas||[]).filter(p=>p.removida)];
  await ckSalvar(m);ckRedesenhaLista();
  /* leva o cursor direto para a pergunta nova — ela escreve sem clicar */
  requestAnimationFrame(()=>{
    const l=document.querySelector(`.ck-lin[data-uid="${nova.uid}"] .ck-ed`);
    if(l){l.focus();}else{document.getElementById("ck-lista")?.scrollTo(0,1e6);}
  });
}
async function ckTeclaPergunta(ev,uid,el){
  if(ev.key==="Enter"&&!ev.shiftKey){        /* Enter = cria a próxima pergunta */
    ev.preventDefault();el.blur();
    await ckSetPergunta(uid,"titulo",el.innerText.trim());
    await ckAddPergunta(uid);
  }
}
async function ckDuplicarPergunta(uid){
  const m=ckAchar(CK_MODELO_ABERTO);if(!m)return;
  const lista=ckPerguntas(m),i=lista.findIndex(p=>p.uid===uid);if(i<0)return;
  const copia={...JSON.parse(JSON.stringify(lista[i])),uid:newUid()};
  lista.splice(i+1,0,copia);lista.forEach((p,n)=>p.ordem=n);
  m.perguntas=[...lista,...(m.perguntas||[]).filter(p=>p.removida)];
  await ckSalvar(m);ckRedesenhaLista();toast("Pergunta duplicada ✓");
}
async function ckExcluirPergunta(uid){
  const m=ckAchar(CK_MODELO_ABERTO);if(!m)return;
  const p=(m.perguntas||[]).find(x=>x.uid===uid);if(!p)return;
  /* já foi respondida em alguma inspeção? então NÃO apaga: marca removida.
     Apagar de vez deixaria respostas órfãs no histórico. */
  const usada=DATA.some(d=>!d.deleted&&d.tipo==="ckp"&&d.modeloUid===m.uid&&(d.respostas||{})[uid]);
  if(!confirm("Excluir a pergunta?\n\n"+(p.titulo||"(sem texto)")
    +(usada?"\n\nEla já foi respondida em inspeções antigas. Vou tirá-la das PRÓXIMAS inspeções, mas as respostas antigas continuam guardadas no histórico.":"")))return;
  if(usada){p.removida=true;}
  else{m.perguntas=(m.perguntas||[]).filter(x=>x.uid!==uid);}
  ckPerguntas(m).forEach((x,i)=>x.ordem=i);
  CK_SEL.delete(uid);
  await ckSalvar(m);ckRedesenhaLista();toast("Pergunta excluída");
}
/* ---- seleção múltipla (CK_SEL próprio: compartilhar o Set do Quadro Geral
       faria excluir demanda que ela não está vendo) ---- */
function ckToggleSel(uid){CK_SEL.has(uid)?CK_SEL.delete(uid):CK_SEL.add(uid);ckRedesenhaLista();}
function ckSelTodas(){
  const m=ckAchar(CK_MODELO_ABERTO);if(!m)return;
  const vis=ckPerguntasVisiveis(m);
  if(CK_SEL.size>=vis.length)CK_SEL.clear();else vis.forEach(p=>CK_SEL.add(p.uid));
  ckRedesenhaLista();
}
function ckBarraMassaHTML(){
  if(!CK_SEL.size)return `<div class="ck-massa-wrap"></div>`;
  const n=CK_SEL.size;
  return `<div class="ck-massa-wrap"><div class="ck-massa">
    <b>${n}</b> selecionada${n===1?"":"s"}
    <select onchange="ckMassa('tipoResp',this.value);this.selectedIndex=0" title="Mudar o tipo de todas">
      <option value="">Tipo…</option>
      ${ordenarOpc(CK_TIPOS).map(k=>`<option value="${k}">${esc(CK_TIPOS[k].rotulo)}</option>`).join("")}
    </select>
    <select onchange="ckMassa('coment',this.value);this.selectedIndex=0" title="Mudar a regra de comentário">
      <option value="">Comentários…</option>
      ${ordenarOpc(CK_COMENT).map(k=>`<option value="${k}">${esc(CK_COMENT[k].rotulo)}</option>`).join("")}
    </select>
    <select onchange="ckMassa('foto',this.value);this.selectedIndex=0" title="Mudar a regra de foto">
      <option value="">Foto…</option>
      ${ordenarOpc(CK_FOTO).map(k=>`<option value="${k}">${esc(CK_FOTO[k].rotulo)}</option>`).join("")}
    </select>
    <button class="btn ghost sm" onclick="ckSelTodas()">Marcar todas</button>
    <button class="btn ghost sm" onclick="ckMassaExcluir()">🗑</button>
    <button class="btn ghost sm" onclick="CK_SEL.clear();ckRedesenhaLista()">✕ Cancelar</button>
  </div></div>`;
}
async function ckMassa(campo,valor){
  if(!valor||!CK_SEL.size)return;
  const m=ckAchar(CK_MODELO_ABERTO);if(!m)return;
  const n=CK_SEL.size;
  if(typeof dgPodeGravarEmMassa==="function"&&!dgPodeGravarEmMassa(n))return;
  for(const p of m.perguntas||[])if(CK_SEL.has(p.uid))p[campo]=valor;
  await ckSalvar(m);CK_SEL.clear();ckRedesenhaLista();
  toast(n+" pergunta"+(n===1?"":"s")+" atualizada"+(n===1?"":"s")+" ✓");
}
async function ckMassaExcluir(){
  const m=ckAchar(CK_MODELO_ABERTO);if(!m||!CK_SEL.size)return;
  const n=CK_SEL.size;
  if(!confirm("Excluir "+n+" pergunta"+(n===1?"":"s")+"?"))return;
  if(typeof dgPodeGravarEmMassa==="function"&&!dgPodeGravarEmMassa(n))return;
  for(const uid of CK_SEL){
    const p=(m.perguntas||[]).find(x=>x.uid===uid);if(!p)continue;
    const usada=DATA.some(d=>!d.deleted&&d.tipo==="ckp"&&d.modeloUid===m.uid&&(d.respostas||{})[uid]);
    if(usada)p.removida=true;else m.perguntas=m.perguntas.filter(x=>x.uid!==uid);
  }
  ckPerguntas(m).forEach((x,i)=>x.ordem=i);
  CK_SEL.clear();await ckSalvar(m);ckRedesenhaLista();toast(n+" excluída"+(n===1?"":"s"));
}

/* ---- ARRASTAR as linhas da tabela ----
   Arraste PRÓPRIO, não o do Quadro Geral (js/dg.js). Ali o arraste também troca a
   demanda de grupo e muda a prioridade; aqui são linhas de UMA tabela, sem grupo.
   Reaproveitar aquele mexendo nele já derrubou o Quadro Geral duas vezes — não vale.
   Lições herdadas dele: handlers no DOCUMENT (mover o nó cancela setPointerCapture)
   e pointer events, para funcionar com o dedo no iPhone. */
let CK_ARR=null;
function ckArrIni(ev,alca){
  ev.preventDefault();ev.stopPropagation();
  const lin=alca.closest(".ck-lin");if(!lin)return;
  const corpo=lin.closest("tbody");if(!corpo)return;
  const marca=document.createElement("tr");marca.className="ck-marca";
  marca.innerHTML=`<td colspan="10"></td>`;
  CK_ARR={lin,corpo,marca,y:ev.clientY,moveu:false};
  lin.classList.add("arrastando");
  document.addEventListener("pointermove",ckArrMove,{passive:false});
  document.addEventListener("pointerup",ckArrFim);
  document.addEventListener("pointercancel",ckArrFim);
  document.body.style.userSelect="none";
}
function ckArrMove(ev){
  if(!CK_ARR)return;
  ev.preventDefault();
  if(Math.abs(ev.clientY-CK_ARR.y)>3)CK_ARR.moveu=true;
  if(!CK_ARR.moveu)return;
  const {lin,corpo,marca}=CK_ARR;
  lin.style.transform=`translateY(${ev.clientY-CK_ARR.y}px)`;
  const alvos=[...corpo.querySelectorAll(".ck-lin")].filter(e=>e!==lin);
  let antesDe=null;
  for(const el of alvos){
    const r=el.getBoundingClientRect();
    if(ev.clientY<r.top+r.height/2){antesDe=el;break;}
  }
  if(antesDe)corpo.insertBefore(marca,antesDe);else corpo.appendChild(marca);
  CK_ARR.antesDe=antesDe;
}
async function ckArrFim(){
  if(!CK_ARR)return;
  const {lin,corpo,marca,moveu,antesDe}=CK_ARR;
  if(moveu){if(antesDe&&antesDe.parentElement===corpo)corpo.insertBefore(lin,antesDe);
            else corpo.appendChild(lin);}
  if(marca&&marca.parentElement)marca.remove();
  lin.classList.remove("arrastando");lin.style.transform="";
  document.removeEventListener("pointermove",ckArrMove);
  document.removeEventListener("pointerup",ckArrFim);
  document.removeEventListener("pointercancel",ckArrFim);
  document.body.style.userSelect="";
  const mexeu=moveu;CK_ARR=null;
  if(!mexeu)return;
  const m=ckAchar(CK_MODELO_ABERTO);if(!m)return;
  const uids=[...corpo.querySelectorAll(".ck-lin")].map(e=>e.dataset.uid);
  /* A busca pode estar escondendo perguntas. Então: as visíveis trocam de lugar
     ENTRE SI, ocupando as mesmas posições que já ocupavam; as escondidas ficam
     onde estão. Simples e à prova de bagunça. */
  const lista=ckPerguntas(m);
  lista.forEach((p,i)=>p.ordem=i);                       /* normaliza 0..n */
  const doDom=uids.map(u=>lista.find(x=>x.uid===u)).filter(Boolean);
  const vagas=doDom.map(p=>p.ordem).sort((a,b)=>a-b);    /* posições disponíveis */
  doDom.forEach((p,i)=>p.ordem=vagas[i]);
  await ckSalvar(m);ckRedesenhaLista();
}

/* ===== LISTAS DE OPÇÕES (para as perguntas do tipo "Seleção") ===== */
function ckGerirListas(){
  const ks=Object.keys(CK_LISTAS);
  const corpo=ks.length?ks.map(k=>{
    const L=CK_LISTAS[k];
    return `<div class="ck-lista-bloco">
      <div class="ck-lista-h">
        <input class="opc-nome" value="${esc(L.nome)}" onchange="ckListaRenomear('${k}',this.value)">
        <button class="btn ghost sm" onclick="ckListaExcluir('${k}')" title="Excluir a lista">🗑</button>
      </div>
      ${(L.opcoes||[]).map((o,i)=>`<div class="opc-linha">
        <span class="opc-cor" style="background:${o.cor}" title="Trocar a cor" onclick="ckOpcCor('${k}',${i})"></span>
        <input class="opc-nome" value="${esc(o.rotulo)}" onchange="ckOpcRenomear('${k}',${i},this.value)">
        <label class="ck-ruim" title="Marcar como resposta ruim: abre a tratativa e conta contra a nota">
          <input type="checkbox" ${o.ruim?"checked":""} onchange="ckOpcRuim('${k}',${i},this.checked)"> inconforme
        </label>
        <button class="btn ghost sm" onclick="ckOpcExcluir('${k}',${i})" title="Excluir a opção">🗑</button>
      </div>`).join("")}
      <div class="opc-nova">
        <input id="ck-nova-${k}" placeholder="Nova opção" onkeydown="if(event.key==='Enter')ckOpcAdd('${k}')">
        <button class="btn sm" onclick="ckOpcAdd('${k}')">+ Criar</button>
      </div></div>`;}).join(""):
    `<p class="desc">Você ainda não criou nenhuma lista.</p>`;
  ncModal(`<h2>Listas de opções</h2>
    <p class="desc">Uma lista serve para perguntas de escolha — por exemplo "Estado de conservação:
    Bom / Regular / Ruim". Marque <b>inconforme</b> nas opções que representam problema: são elas
    que abrem a tratativa e descontam da nota.</p>
    ${corpo}
    <div class="opc-nova" style="margin-top:14px">
      <input id="ck-lista-nova" placeholder="Nome da nova lista" onkeydown="if(event.key==='Enter')ckListaNova()">
      <button class="btn sm" onclick="ckListaNova()">+ Criar lista</button>
    </div>
    <div class="form-actions"><button class="btn" onclick="ncFechar()">Fechar</button></div>`);
}
async function ckListaNova(){
  const inp=document.getElementById("ck-lista-nova"),nome=(inp.value||"").trim();
  if(!nome)return;
  CK_LISTAS["lst_"+newUid()]={nome,opcoes:[]};
  await ckSalvarOpcoes();ckGerirListas();
}
async function ckListaRenomear(k,v){v=String(v||"").trim();
  if(!v||!CK_LISTAS[k])return;CK_LISTAS[k].nome=v;await ckSalvarOpcoes();ckGerirListas();}
async function ckListaExcluir(k){
  const usos=ckModelos().reduce((n,m)=>n+ckPerguntas(m).filter(p=>p.opcoesLista===k).length,0);
  if(usos){alert(usos+" pergunta(s) usam esta lista.\n\nTroque a lista dessas perguntas antes de excluir.");return;}
  if(!confirm("Excluir a lista \""+CK_LISTAS[k].nome+"\"?"))return;
  delete CK_LISTAS[k];await ckSalvarOpcoes();ckGerirListas();
}
async function ckOpcAdd(k){
  const inp=document.getElementById("ck-nova-"+k),nome=(inp.value||"").trim();
  if(!nome||!CK_LISTAS[k])return;
  const L=CK_LISTAS[k],cor=CORES_PRONTAS[(L.opcoes||[]).length%CORES_PRONTAS.length];
  /* chave própria e estável: renomear depois não quebra as respostas gravadas */
  (L.opcoes=L.opcoes||[]).push({chave:"o_"+newUid(),rotulo:nome,cor,fundo:clarear(cor),ruim:false});
  await ckSalvarOpcoes();ckGerirListas();
}
async function ckOpcRenomear(k,i,v){v=String(v||"").trim();
  if(!v)return;CK_LISTAS[k].opcoes[i].rotulo=v;await ckSalvarOpcoes();ckGerirListas();}
async function ckOpcCor(k,i){
  const o=CK_LISTAS[k].opcoes[i],j=CORES_PRONTAS.indexOf(o.cor);
  o.cor=CORES_PRONTAS[(j+1)%CORES_PRONTAS.length];o.fundo=clarear(o.cor);
  await ckSalvarOpcoes();ckGerirListas();
}
async function ckOpcRuim(k,i,v){CK_LISTAS[k].opcoes[i].ruim=!!v;await ckSalvarOpcoes();ckGerirListas();}
async function ckOpcExcluir(k,i){
  CK_LISTAS[k].opcoes.splice(i,1);await ckSalvarOpcoes();ckGerirListas();}

/* ===================================================================
   PREENCHER a inspeção — uma pergunta por vez (tela do celular)
   =================================================================== */
let CK_PREENCH="";        /* uid do ckp aberto */

async function ckIniciar(modeloUid){
  const m=ckAchar(modeloUid);if(!m)return;
  if(!ckPerguntas(m).length){toast("Adicione perguntas antes de preencher");return;}
  const o={uid:newUid(),mod:nowISO(),tipo:"ckp",loja:currentStore,
    modeloUid:m.uid,modeloTitulo:m.titulo||"",
    status:"andamento",posicao:0,
    criadoEm:today(),iniciadoEm:nowISO(),atualizacao:nowISO(),
    respondente:"",assinatura:"",nota:null,respostas:{}};
  o.id=await putItem(o);DATA.push(o);dataChanged();
  CK_PREENCH=o.uid;ckDesenhaPasso();
}
function ckRetomar(uid){const p=ckAchar(uid);if(!p)return;CK_PREENCH=uid;ckDesenhaPasso();}
function ckVer(uid){const p=ckAchar(uid);if(!p)return;CK_PREENCH=uid;ckDesenhaResumo(true);}

function ckFecharPreench(){
  const el=document.getElementById("ck-preench");if(el)el.remove();
  document.body.style.overflow="";CK_PREENCH="";renderCk();
}
/* chamado pelo desfazer (js/app.js histAplicar) para a tela não ficar desatualizada */
function ckRedesenhaPasso(){if(document.getElementById("ck-preench")&&CK_PREENCH)ckDesenhaPasso();}

function ckDesenhaPasso(){
  const p=ckAchar(CK_PREENCH);if(!p)return ckFecharPreench();
  const m=ckAchar(p.modeloUid);
  if(!m){alert("O checklist deste preenchimento foi excluído.");return ckFecharPreench();}
  const perg=ckPerguntas(m);
  if(p.posicao>=perg.length)return ckDesenhaResumo(false);
  const i=Math.max(0,Math.min(p.posicao||0,perg.length-1));
  const q=perg[i],r=(p.respostas||{})[q.uid]||{};
  let el=document.getElementById("ck-preench");
  if(!el){el=document.createElement("div");el.id="ck-preench";el.className="ck-preench";document.body.appendChild(el);}
  document.body.style.overflow="hidden";
  el.innerHTML=`<div class="ck-pr-topo">
      <button class="ck-pr-x" onclick="ckSairPreench()" title="Sair e guardar em Parciais">✕</button>
      <span class="ck-pr-nome">${esc(m.titulo||"")}</span>
    </div>
    <div class="ck-pr-box">
      <div class="ck-pr-h">
        <h2>${esc(q.titulo||"(pergunta sem texto)")}</h2>
        <span class="ck-pr-cont">${i+1}/${perg.length}</span>
      </div>
      ${q.descricao?`<p class="ck-pr-desc">${esc(q.descricao)}</p>`:""}
      <div class="ck-pr-resp">${ckRespostaHTML(q,r)}</div>
      ${q.na?`<label class="ck-pr-na"><input type="checkbox" ${r.na?"checked":""}
        onchange="ckResponder('${q.uid}','na',this.checked)"> <span data-txt="ck.na">Não se aplica</span></label>`:""}
      ${q.coment!=="nao"?`<div class="ck-pr-com">
        <label>${esc(ckRot(CK_COMENT,q.coment,"Comentário"))==="Inconforme"?txt("ck.com.obrig","Comentário (obrigatório se estiver inconforme)"):txt("ck.com.opc","Comentário")}</label>
        <textarea rows="2" data-txt-ph="ck.com.ph" placeholder="Descreva o ocorrido"
          onchange="ckResponder('${q.uid}','comentario',this.value)">${esc(r.comentario||"")}</textarea>
      </div>`:""}
      ${q.foto!=="nao"?ckFotoHTML(q,r):""}
      <div class="ck-pr-pe">
        <button class="btn ghost" ${i===0?"disabled":""} onclick="ckPasso(-1)">‹ <span data-txt="ck.voltar">Voltar</span></button>
        <button class="btn" onclick="ckPasso(1)"><span data-txt="ck.avancar">Avançar</span> ›</button>
      </div>
    </div>`;
  aplicarTextos(el);
  if(q.tipoResp==="assinatura")ckCanvasLigar("ck-cv-"+q.uid,q.uid);
}
function ckRespostaHTML(q,r){
  if(q.tipoResp==="simnao")return `<div class="ck-simnao">
    <button class="ck-nao${r.valor==="nao"?" on":""}" onclick="ckResponder('${q.uid}','valor','nao')">👎</button>
    <button class="ck-sim${r.valor==="sim"?" on":""}" onclick="ckResponder('${q.uid}','valor','sim')">👍</button></div>`;
  if(q.tipoResp==="selecao"){
    const L=CK_LISTAS[q.opcoesLista];
    if(!L||!(L.opcoes||[]).length)return `<p class="ck-pr-aviso">Esta pergunta é de escolha, mas não tem lista de opções. Configure em ⚙ Listas.</p>`;
    return `<div class="ck-radios">${L.opcoes.map(o=>`
      <label class="ck-radio${r.valor===o.chave?" on":""}">
        <input type="radio" name="r-${q.uid}" ${r.valor===o.chave?"checked":""}
          onchange="ckResponder('${q.uid}','valor','${o.chave}')">
        <span>${esc(o.rotulo)}</span>${o.ruim?`<em class="ck-tag-ruim">inconforme</em>`:""}
      </label>`).join("")}</div>`;
  }
  if(q.tipoResp==="data")return `<input class="ck-in" type="date" value="${esc(r.valor||today())}"
    onchange="ckResponder('${q.uid}','valor',this.value)">`;
  if(q.tipoResp==="texto")return `<textarea class="ck-in" rows="3" placeholder="Escreva aqui"
    onchange="ckResponder('${q.uid}','valor',this.value)">${esc(r.valor||"")}</textarea>`;
  if(q.tipoResp==="assinatura")return `<div class="ck-assin">
    ${r.valor?`<img class="ck-assin-img" src="${r.valor}" alt="assinatura">`
             :`<canvas id="ck-cv-${q.uid}" class="ck-cv" width="600" height="200"></canvas>`}
    <div class="ck-assin-pe">
      ${CK_ASSINATURA&&!r.valor?`<button class="btn ghost sm" onclick="ckUsarMinhaAssinatura('${q.uid}')">✍ <span data-txt="ck.usarassin">Usar a minha assinatura</span></button>`:""}
      <button class="btn ghost sm" onclick="ckLimparAssin('${q.uid}')"><span data-txt="ck.limpar">Limpar</span></button>
    </div></div>`;
  return "";
}
function ckFotoHTML(q,r){
  const fotos=r.fotos||[];
  return `<div class="ck-pr-foto">
    <div class="ck-origem"><span data-txt="ck.origem">Origem da foto:</span>
      <label><input type="radio" name="og-${q.uid}" checked onchange="ckOrigem('${q.uid}',true)"> <span data-txt="ck.camera">Câmera</span></label>
      <label><input type="radio" name="og-${q.uid}" onchange="ckOrigem('${q.uid}',false)"> <span data-txt="ck.galeria">Galeria</span></label>
    </div>
    <input type="file" id="ck-file-${q.uid}" accept="image/*" capture="environment" style="display:none"
      onchange="ckAddFoto(event,'${q.uid}')">
    <button class="btn ghost sm" ${fotos.length>=CK_MAX_FOTOS?"disabled":""}
      onclick="document.getElementById('ck-file-${q.uid}').click()">📷
      ${fotos.length>=CK_MAX_FOTOS?txt("ck.fotomax","Limite de fotos atingido"):txt("ck.tirarfoto","Tirar / escolher foto")}</button>
    ${q.foto==="obrigatoria"&&!fotos.length?`<span class="ck-obrig" data-txt="ck.fotoobrig">Foto obrigatória</span>`:""}
    <div class="ck-thumbs">${fotos.map((f,i)=>`<span class="ck-thumb">
      <img src="${f}"><button onclick="ckDelFoto('${q.uid}',${i})" title="Remover">×</button></span>`).join("")}</div>
  </div>`;
}
/* LIMITE DE PESO: o banco inteiro vai num arquivo só para o GitHub, que trava perto
   de alguns MB. Foto menor e no máximo 2 por resposta — ver o aviso em ckGravaResposta. */
const CK_MAX_FOTOS=2;
function ckComprimirCk(file){return new Promise(res=>{
  const img=new Image();
  img.onload=()=>{const MAX=640,sc=Math.min(1,MAX/Math.max(img.width,img.height));
    const cv=document.createElement("canvas");cv.width=Math.round(img.width*sc);cv.height=Math.round(img.height*sc);
    cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height);
    URL.revokeObjectURL(img.src);res(cv.toDataURL("image/jpeg",0.6));};
  img.src=URL.createObjectURL(file);});}
function ckOrigem(uid,camera){
  const inp=document.getElementById("ck-file-"+uid);if(!inp)return;
  if(camera)inp.setAttribute("capture","environment");else inp.removeAttribute("capture");
}
async function ckAddFoto(ev,qUid){
  const f=ev.target.files&&ev.target.files[0];ev.target.value="";
  if(!f)return;
  const p=ckAchar(CK_PREENCH);if(!p)return;
  const r=(p.respostas=p.respostas||{})[qUid]=(p.respostas[qUid]||{fotos:[]});
  r.fotos=r.fotos||[];
  if(r.fotos.length>=CK_MAX_FOTOS){toast("Máximo de "+CK_MAX_FOTOS+" fotos por pergunta");return;}
  r.fotos.push(await ckComprimirCk(f));r.em=nowISO();
  await ckGravaResposta(p);ckDesenhaPasso();
}
async function ckDelFoto(qUid,i){
  const p=ckAchar(CK_PREENCH);if(!p)return;
  const r=(p.respostas||{})[qUid];if(!r||!r.fotos)return;
  r.fotos.splice(i,1);await ckGravaResposta(p);ckDesenhaPasso();
}
async function ckResponder(qUid,campo,valor){
  const p=ckAchar(CK_PREENCH);if(!p)return;
  p.respostas=p.respostas||{};
  const r=p.respostas[qUid]=p.respostas[qUid]||{fotos:[]};
  r[campo]=valor;r.em=nowISO();
  if(campo==="na"&&valor)r.valor="";           /* N/A limpa a resposta */
  await ckGravaResposta(p);
  /* botão e rádio redesenham para marcar a escolha; texto/comentário não (perderia o cursor) */
  if(campo==="valor"||campo==="na")ckDesenhaPasso();
}
async function ckGravaResposta(p){
  p.atualizacao=nowISO();
  await ckSalvar(p);
  ckAvisarPeso();
}
/* aviso honesto sobre o limite da sincronização (uma vez por sessão) */
let CK_AVISOU=false;
function ckAvisarPeso(){
  if(CK_AVISOU)return;
  let bytes=0;
  for(const d of DATA)if(d.tipo==="ckp")bytes+=JSON.stringify(d.respostas||{}).length;
  if(bytes>3e6){CK_AVISOU=true;
    alert("Aviso sobre o espaço\n\nAs fotos das inspeções já ocupam bastante espaço.\n\n"
      +"Tudo é enviado num arquivo só para a nuvem, e acima de uns poucos MB a "
      +"sincronização começa a falhar.\n\nSugestão: exporte um backup e apague as "
      +"inspeções antigas que você já entregou ao gerente.");}
}
async function ckPasso(dir){
  const p=ckAchar(CK_PREENCH);if(!p)return;
  const m=ckAchar(p.modeloUid);if(!m)return;
  const perg=ckPerguntas(m),i=p.posicao||0;
  if(dir>0){
    const q=perg[i],r=(p.respostas||{})[q.uid]||{};
    const erro=ckValidar(q,r);
    if(erro){alert(erro);return;}
  }
  p.posicao=Math.max(0,Math.min(i+dir,perg.length));
  await ckSalvar(p);
  if(p.posicao>=perg.length)ckDesenhaResumo(false);else ckDesenhaPasso();
}
/* as regras que ela configurou na coluna Comentários/Foto valem aqui */
function ckValidar(q,r){
  if(r.na)return "";
  const respondeu=r.valor!==undefined&&r.valor!=="";
  if(!respondeu&&q.tipoResp!=="texto")return "Responda a pergunta antes de avançar.";
  if(q.coment==="inconforme"&&ckRuim(q,r)&&!String(r.comentario||"").trim())
    return "Esta resposta está inconforme.\n\nEscreva o comentário explicando o que houve.";
  if(q.foto==="obrigatoria"&&!(r.fotos||[]).length)
    return "Esta pergunta exige foto.\n\nTire ou escolha uma foto antes de avançar.";
  return "";
}
async function ckSairPreench(){
  const p=ckAchar(CK_PREENCH);
  if(p&&p.status==="andamento"){
    const a=ckAndamento(p);
    toast("Guardado em Parciais ("+a.feitas+"/"+a.total+") — dá para retomar depois");
  }
  ckFecharPreench();CK_SEC=p&&p.status==="concluido"?"enviados":"parciais";
  localStorage.setItem("ck_sec",CK_SEC);renderCk();
}

/* ---- assinatura no dedo ---- */
function ckCanvasLigar(id,qUid){
  const cv=document.getElementById(id);if(!cv)return;
  const ctx=cv.getContext("2d");
  ctx.lineWidth=2.5;ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle="#2d2e3a";
  let desenhando=false;
  const pos=e=>{const r=cv.getBoundingClientRect();
    return [(e.clientX-r.left)*(cv.width/r.width),(e.clientY-r.top)*(cv.height/r.height)];};
  cv.addEventListener("pointerdown",e=>{e.preventDefault();desenhando=true;
    const [x,y]=pos(e);ctx.beginPath();ctx.moveTo(x,y);});
  cv.addEventListener("pointermove",e=>{if(!desenhando)return;e.preventDefault();
    const [x,y]=pos(e);ctx.lineTo(x,y);ctx.stroke();});
  const fim=async e=>{if(!desenhando)return;desenhando=false;
    await ckResponder(qUid,"valor",cv.toDataURL("image/png"));};
  cv.addEventListener("pointerup",fim);cv.addEventListener("pointerleave",fim);
  cv.addEventListener("pointercancel",fim);
}
async function ckLimparAssin(qUid){await ckResponder(qUid,"valor","");}
async function ckUsarMinhaAssinatura(qUid){
  if(!CK_ASSINATURA){toast("Você ainda não guardou uma assinatura");return;}
  await ckResponder(qUid,"valor",CK_ASSINATURA);
}
/* a assinatura dela: desenha UMA vez, fica guardada e entra sozinha nas inspeções */
function ckMinhaAssinatura(){
  ncModal(`<h2>Minha assinatura</h2>
    <p class="desc">Desenhe a sua assinatura uma vez. Ela fica guardada neste site e entra
    sozinha no fim de cada inspeção — você não precisa assinar de novo.
    O PDF continua saindo com uma linha em branco para o gerente assinar à mão.</p>
    ${CK_ASSINATURA?`<div class="ck-assin-atual"><img src="${CK_ASSINATURA}" alt="assinatura guardada"></div>`:""}
    <canvas id="ck-cv-rt" class="ck-cv" width="600" height="200"></canvas>
    <div class="form-actions">
      <button class="btn ghost" onclick="ckAssinLimparRT()">Limpar</button>
      <button class="btn" onclick="ckAssinSalvarRT()">Guardar assinatura</button>
    </div>`);
  setTimeout(()=>{
    const cv=document.getElementById("ck-cv-rt");if(!cv)return;
    const ctx=cv.getContext("2d");
    ctx.lineWidth=2.5;ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle="#2d2e3a";
    let d=false;
    const pos=e=>{const r=cv.getBoundingClientRect();
      return [(e.clientX-r.left)*(cv.width/r.width),(e.clientY-r.top)*(cv.height/r.height)];};
    cv.addEventListener("pointerdown",e=>{e.preventDefault();d=true;const [x,y]=pos(e);ctx.beginPath();ctx.moveTo(x,y);});
    cv.addEventListener("pointermove",e=>{if(!d)return;e.preventDefault();const [x,y]=pos(e);ctx.lineTo(x,y);ctx.stroke();});
    ["pointerup","pointerleave","pointercancel"].forEach(t=>cv.addEventListener(t,()=>{d=false;}));
  },0);
}
function ckAssinLimparRT(){const cv=document.getElementById("ck-cv-rt");
  if(cv)cv.getContext("2d").clearRect(0,0,cv.width,cv.height);}
async function ckAssinSalvarRT(){
  const cv=document.getElementById("ck-cv-rt");if(!cv)return;
  CK_ASSINATURA=cv.toDataURL("image/png");
  await metaSet("assinaturaRT",CK_ASSINATURA);
  dataChanged();ncFechar();toast("Assinatura guardada ✓");
}

/* ===================================================================
   RESUMO / FECHAMENTO — conferir tudo, nota e assinatura
   =================================================================== */
function ckDesenhaResumo(soLeitura){
  const p=ckAchar(CK_PREENCH);if(!p)return ckFecharPreench();
  const m=ckAchar(p.modeloUid);
  const perg=m?ckPerguntas(m):[];
  const nota=p.status==="concluido"&&p.nota?p.nota:ckNota(p);
  const inc=ckInconformes(p);
  let el=document.getElementById("ck-preench");
  if(!el){el=document.createElement("div");el.id="ck-preench";el.className="ck-preench";document.body.appendChild(el);}
  document.body.style.overflow="hidden";
  el.innerHTML=`<div class="ck-pr-topo">
      <button class="ck-pr-x" onclick="ckSairPreench()" title="Fechar">✕</button>
      <span class="ck-pr-nome">${esc(p.modeloTitulo||"")}</span>
    </div>
    <div class="ck-pr-box larga">
      <div class="ck-pr-h"><h2 data-txt="ck.fim.titulo">Responsável pela inspeção</h2>
        <span class="ck-pr-cont">${perg.length}/${perg.length}</span></div>

      <div class="ck-kpis">
        <div class="ck-kpi"><b class="${nota.pct!=null&&nota.pct<70?"ruim":""}">${nota.pct!=null?String(nota.pct).replace(".",",")+"%":"—"}</b><span data-txt="ck.kpi.nota">Nota</span></div>
        <div class="ck-kpi"><b class="${inc.length?"ruim":""}">${inc.length}</b><span data-txt="ck.kpi.inc">Inconformes</span></div>
        <div class="ck-kpi"><b>${Object.keys(p.respostas||{}).length}/${perg.length}</b><span data-txt="ck.kpi.resp">Respondidas</span></div>
      </div>

      <details class="ck-resumo"><summary data-txt="ck.resumo">Resumo das respostas</summary>
        ${perg.map((q,i)=>{
          const r=(p.respostas||{})[q.uid]||{},ruim=ckRuim(q,r);
          return `<div class="ck-res-lin${ruim?" ruim":""}">
            <span class="n">${i+1}</span>
            <div class="tx"><b>${esc(q.titulo||"")}</b>
              <span class="v">${esc(ckValorTexto(q,r))}</span>
              ${r.comentario?`<span class="c">${esc(r.comentario)}</span>`:""}
              ${(r.fotos||[]).length?`<span class="f">${r.fotos.length} foto(s)</span>`:""}
              ${ruim?`<button class="btn ghost sm" onclick="ckTratativa('${q.uid}')">${r.tratativa?"✎ Ver tratativa":"⚠ Abrir tratativa"}</button>`:""}
            </div></div>`;}).join("")}
      </details>

      ${p.status==="concluido"?`
        <div class="ck-assinado">
          <p><b data-txt="ck.assinadopor">Assinado por:</b> ${esc(p.respondente||"—")} · ${esc(brDate(p.concluidoEm||""))}</p>
          ${p.assinatura?`<img class="ck-assin-img" src="${p.assinatura}" alt="assinatura">`:""}
        </div>
        <div class="ck-pr-pe">
          <button class="btn ghost" onclick="ckSairPreench()"><span data-txt="ck.fechar2">Fechar</span></button>
          <button class="btn" onclick="ckPDF('${p.uid}')">🖨 <span data-txt="ck.pdf">Imprimir / PDF</span></button>
        </div>`
      :`
        <div class="ck-pr-com">
          <label data-txt="ck.quem">Quem fez a inspeção</label>
          <input class="ck-in" id="ck-quem" value="${esc(p.respondente||RT_INFO||RT_DEFAULT)}">
        </div>
        <div class="ck-assin-fim">
          ${CK_ASSINATURA?`<img class="ck-assin-img" src="${CK_ASSINATURA}" alt="assinatura">
             <p class="ck-dica" data-txt="ck.assinauto">Sua assinatura entra sozinha. Para trocá-la, use "Minha assinatura".</p>`
            :`<p class="ck-dica" data-txt="ck.semassin">Você ainda não guardou a sua assinatura — dá para concluir sem ela.</p>`}
          <button class="btn ghost sm" onclick="ckMinhaAssinatura()">✍ <span data-txt="ck.minhaassin">Minha assinatura</span></button>
        </div>
        <div class="ck-pr-pe">
          <button class="btn ghost" onclick="ckVoltarUltima()">‹ <span data-txt="ck.rever">Rever respostas</span></button>
          <button class="btn" onclick="ckConcluir()">✔ <span data-txt="ck.concluir">Concluir e assinar</span></button>
        </div>`}
    </div>`;
  aplicarTextos(el);
}
function ckValorTexto(q,r){
  if(r.na)return "Não se aplica";
  if(r.valor===undefined||r.valor==="")return "— não respondida —";
  if(q.tipoResp==="simnao")return r.valor==="sim"?"Sim":"Não";
  if(q.tipoResp==="selecao"){
    const L=CK_LISTAS[q.opcoesLista];
    const o=L&&(L.opcoes||[]).find(x=>x.chave===r.valor);
    return o?o.rotulo:r.valor;
  }
  if(q.tipoResp==="data")return brDate(r.valor);
  if(q.tipoResp==="assinatura")return "(assinado)";
  return r.valor;
}
async function ckVoltarUltima(){
  const p=ckAchar(CK_PREENCH);if(!p)return;
  const m=ckAchar(p.modeloUid);const n=m?ckPerguntas(m).length:1;
  p.posicao=Math.max(0,n-1);await ckSalvar(p);ckDesenhaPasso();
}
async function ckConcluir(){
  const p=ckAchar(CK_PREENCH);if(!p)return;
  const m=ckAchar(p.modeloUid);const perg=m?ckPerguntas(m):[];
  const faltam=perg.filter(q=>{const r=(p.respostas||{})[q.uid]||{};
    return !r.na&&(r.valor===undefined||r.valor==="")&&q.tipoResp!=="texto";});
  if(faltam.length&&!confirm(faltam.length+" pergunta(s) ficaram sem resposta.\n\nConcluir mesmo assim?\n\n"
    +faltam.slice(0,5).map(q=>"· "+(q.titulo||"")).join("\n")))return;
  p.respondente=(document.getElementById("ck-quem")?.value||"").trim()||RT_INFO||RT_DEFAULT;
  p.assinatura=CK_ASSINATURA||"";
  p.nota=ckNota(p);
  p.status="concluido";p.concluidoEm=today();p.atualizacao=nowISO();
  await ckSalvar(p);
  CK_SEC="enviados";localStorage.setItem("ck_sec",CK_SEC);
  ckDesenhaResumo(true);
  toast("Inspeção concluída ✓"+(p.nota.pct!=null?" — nota "+String(p.nota.pct).replace(".",",")+"%":""));
}

/* ===================================================================
   TRATATIVAS (5W2H) — e a demanda que nasce daqui
   =================================================================== */
function ckTratativa(qUid){
  const p=ckAchar(CK_PREENCH);if(!p)return;
  const m=ckAchar(p.modeloUid);if(!m)return;
  const q=ckPerguntas(m).find(x=>x.uid===qUid);if(!q)return;
  const r=(p.respostas||{})[qUid]||{},t=r.tratativa||{};
  ncModal(`<h2 data-txt="ck.trat.titulo">Tratativas</h2>
    <p class="ck-trat-perg"><b>${esc(q.titulo||"")}</b>${q.descricao?`<br><span class="desc">${esc(q.descricao)}</span>`:""}</p>
    <div class="ck-trat">
      <label data-txt="ck.trat.com">Comentários</label>
      <textarea id="tr-com" rows="2" data-txt-ph="ck.trat.comph" placeholder="Descreva o ocorrido">${esc(t.comentario||r.comentario||"")}</textarea>

      <p class="ck-trat-sub" data-txt="ck.trat.plano">Plano de ação:</p>
      <label class="obg" data-txt="ck.trat.oque">O que deve ser feito? *</label>
      <textarea id="tr-oque" rows="2" data-txt-ph="ck.trat.oqueph" placeholder="O que deve ser feito?">${esc(t.oque||"")}</textarea>

      <label class="obg" data-txt="ck.trat.quem">Quem poderia resolver? *</label>
      <select id="tr-quem">
        <option value="">— escolha —</option>
        ${execOptionsHTML(t.quem||"")}
      </select>

      <label data-txt="ck.trat.prazo">Vamos definir um prazo?</label>
      <input id="tr-prazo" type="date" value="${esc(t.prazo||today())}">

      <label data-txt="ck.trat.porque">Por quê deve ser feito?</label>
      <input id="tr-porque" value="${esc(t.porque||"")}" data-txt-ph="ck.trat.porqueph" placeholder="Por quê deve ser feito?">

      <label data-txt="ck.trat.onde">Onde será feito?</label>
      <input id="tr-onde" value="${esc(t.onde||"")}" data-txt-ph="ck.trat.ondeph" placeholder="Onde será feito?">

      <label data-txt="ck.trat.como">Como fazer? Indique se souber.</label>
      <input id="tr-como" value="${esc(t.como||"")}" data-txt-ph="ck.trat.comoph" placeholder="Como fazer?">

      <label data-txt="ck.trat.custo">Quanto pode custar?</label>
      <input id="tr-custo" value="${esc(t.custo||"")}" data-txt-ph="ck.trat.custoph" placeholder="R$">
    </div>
    ${t.demandaUid?`<p class="ck-trat-ok" data-txt="ck.trat.jacriada">✔ Esta tratativa já virou uma demanda na aba Manutenções e Elétrica. Salvar de novo atualiza a demanda.</p>`
                  :`<p class="desc" data-txt="ck.trat.viradem">Ao salvar, isto vira uma demanda na aba Manutenções e Elétrica, com a foto junto — você não precisa digitar de novo.</p>`}
    <div class="form-actions">
      <button class="btn ghost" onclick="ncFechar()">Cancelar</button>
      <button class="btn" onclick="ckTratativaSalvar('${qUid}')" data-txt="ck.trat.salvar">Salvar</button>
    </div>`);
}
async function ckTratativaSalvar(qUid){
  const p=ckAchar(CK_PREENCH);if(!p)return;
  const v=id=>(document.getElementById(id)?.value||"").trim();
  const t={comentario:v("tr-com"),oque:v("tr-oque"),quem:v("tr-quem"),prazo:v("tr-prazo"),
           porque:v("tr-porque"),onde:v("tr-onde"),como:v("tr-como"),custo:v("tr-custo")};
  if(!t.oque){alert("Escreva o que deve ser feito.");return;}
  if(!t.quem){alert("Escolha quem poderia resolver.");return;}
  const r=(p.respostas=p.respostas||{})[qUid]=(p.respostas[qUid]||{fotos:[]});
  if(t.comentario)r.comentario=t.comentario;

  const m=ckAchar(p.modeloUid);
  const q=m?ckPerguntas(m).find(x=>x.uid===qUid):null;
  const extras=[t.porque?"Por quê: "+t.porque:"",t.custo?"Custo estimado: "+t.custo:"",
    t.comentario?"Ocorrido: "+t.comentario:"",
    "Origem: checklist \""+(p.modeloTitulo||"")+"\" de "+brDate(p.criadoEm||today()),
    q?"Pergunta: "+(q.titulo||""):""].filter(Boolean).join(" · ");

  /* CRIA (ou atualiza) a demanda na aba Manutenções e Elétrica.
     loja = a EMPRESA: renderCards filtra por d.loja===currentStore (js/app.js). */
  let dem=t.demandaUid?ckAchar(r.tratativa&&r.tratativa.demandaUid):null;
  if(r.tratativa&&r.tratativa.demandaUid)dem=ckAchar(r.tratativa.demandaUid);
  const novo=!dem;
  if(!dem)dem={uid:newUid(),tipo:"mnt",loja:p.loja||currentStore,criado:"checklist",
               relato:today()};
  dem.mod=nowISO();
  dem.area=t.onde||dem.area||"";
  dem.nc=t.oque;                       /* vira o título na tabela de Manutenções */
  dem.acao=t.como||"";
  dem.rt=RT_INFO||RT_DEFAULT;
  dem.executor=t.quem;
  dem.atualizacao=today();
  dem.status=dem.status||"Pendente";   /* grafia exata usada pelos filtros */
  dem.prazo=t.prazo||"";
  dem.obs=extras;
  dem.origemCkp=p.uid;dem.origemPergunta=qUid;
  if((r.fotos||[]).length)dem.fotos=[...r.fotos];
  const id=await putItem(dem);
  if(novo){dem.id=id;DATA.push(dem);}

  t.demandaUid=dem.uid;
  r.tratativa=t;r.tratativaUid=dem.uid;r.em=nowISO();
  await ckSalvar(p);
  ncFechar();ckDesenhaResumo(p.status==="concluido");
  toast(novo?"Tratativa salva ✓ Demanda criada em Manutenções":"Tratativa e demanda atualizadas ✓");
}

/* ===================================================================
   PDF / impressão da inspeção
   =================================================================== */
function ckPDF(uid){
  const p=ckAchar(uid)||ckAchar(CK_PREENCH);if(!p)return;
  const m=ckAchar(p.modeloUid);
  const perg=m?ckPerguntas(m):[];
  const nota=p.nota||ckNota(p);
  const inc=ckInconformes(p);
  const loja=nomeCurto((empresa(p.loja)||{}).name||p.loja||"");
  const linhas=perg.map((q,i)=>{
    const r=(p.respostas||{})[q.uid]||{},ruim=ckRuim(q,r);
    const t=r.tratativa;
    return `<div class="q ${ruim?"ruim":""}">
      <div class="qh"><span class="n">${i+1}</span><b>${esc(q.titulo||"")}</b>
        <span class="v ${ruim?"vr":""}">${esc(ckValorTexto(q,r))}</span></div>
      ${r.comentario?`<div class="c">${esc(r.comentario)}</div>`:""}
      ${(r.fotos||[]).length?`<div class="fotos">${r.fotos.map(f=>`<img src="${f}">`).join("")}</div>`:""}
      ${t?`<div class="pa"><b>Plano de ação:</b> ${esc(t.oque||"")}
          ${t.quem?` · <b>Quem:</b> ${esc(t.quem)}`:""}${t.prazo?` · <b>Prazo:</b> ${brDate(t.prazo)}`:""}
          ${t.como?`<br><b>Como:</b> ${esc(t.como)}`:""}${t.onde?` · <b>Onde:</b> ${esc(t.onde)}`:""}
          ${t.custo?` · <b>Custo:</b> ${esc(t.custo)}`:""}</div>`:""}
    </div>`;}).join("");
  const w=window.open("");
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
  <title>${esc(p.modeloTitulo||"Inspeção")} — ${esc(loja)}</title><style>
  @page{margin:14mm}
  body{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#2d2e3a;font-size:12px;margin:0}
  h1{font-size:19px;margin:0 0 3px}
  .sub{color:#8a8b96;font-size:11px;margin-bottom:14px}
  .kpis{display:flex;gap:10px;margin:0 0 16px}
  .k{border:1px solid #e6e7eb;border-radius:9px;padding:8px 14px;text-align:center;min-width:92px}
  .k b{display:block;font-size:19px}.k span{font-size:10px;color:#8a8b96;text-transform:uppercase;letter-spacing:.4px}
  .k .ruim{color:#c0212a}
  .q{border:1px solid #e6e7eb;border-radius:9px;padding:9px 11px;margin-bottom:7px;page-break-inside:avoid}
  .q.ruim{border-left:4px solid #c0212a;background:#fff7f7}
  .qh{display:flex;gap:8px;align-items:baseline}
  .qh .n{color:#8a8b96;font-size:10px;min-width:16px}
  .qh b{flex:1;font-weight:600}
  .v{font-weight:700;white-space:nowrap}.vr{color:#c0212a}
  .c{color:#4b4c57;font-size:11px;margin:5px 0 0 24px;font-style:italic}
  .fotos{margin:6px 0 0 24px;display:flex;gap:6px;flex-wrap:wrap}
  .fotos img{max-width:150px;max-height:110px;border-radius:5px;border:1px solid #e6e7eb}
  .pa{margin:6px 0 0 24px;background:#f4f7f6;border-left:3px solid #1d6b57;padding:6px 9px;
      border-radius:0 6px 6px 0;font-size:11px}
  .ass{display:flex;gap:34px;margin-top:26px;page-break-inside:avoid}
  .ass div{flex:1}
  .ass img{max-height:56px;display:block}
  .linha{border-bottom:1px solid #2d2e3a;height:50px}
  .rot{font-size:10.5px;color:#8a8b96;margin-top:4px}
  </style></head><body>
  <h1>${esc(p.modeloTitulo||"Inspeção")}</h1>
  <div class="sub">${esc(loja)} · realizada em ${esc(brDate(p.concluidoEm||p.criadoEm||today()))}
    · RT: ${esc(p.respondente||RT_INFO||RT_DEFAULT)}</div>
  <div class="kpis">
    <div class="k"><b class="${nota.pct!=null&&nota.pct<70?"ruim":""}">${nota.pct!=null?String(nota.pct).replace(".",",")+"%":"—"}</b><span>Nota</span></div>
    <div class="k"><b class="${inc.length?"ruim":""}">${inc.length}</b><span>Inconformes</span></div>
    <div class="k"><b>${perg.length}</b><span>Itens</span></div>
  </div>
  ${linhas}
  <div class="ass">
    <div>${p.assinatura?`<img src="${p.assinatura}">`:`<div class="linha"></div>`}
      <div class="rot">${esc(p.respondente||RT_INFO||RT_DEFAULT)}<br>Responsável pela inspeção</div></div>
    <div><div class="linha"></div>
      <div class="rot">Nome e assinatura do gerente<br>Data: ____/____/______</div></div>
  </div>
  </body></html>`);
  w.document.close();
  setTimeout(()=>{try{w.print();}catch(e){}},400);
}
