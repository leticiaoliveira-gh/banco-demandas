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

/* ===== PERGUNTA × ÁREA =====
   Um checklist pode ter perguntas que se repetem em cada área visitada (`escopoP`).
   ckExpandir devolve a lista real de coisas a responder: {q, area, chave}.
   A CHAVE da resposta é "uid" quando a pergunta é da loja e "uid@Área" quando é por área.
   Checklist SEM escopo (o Semanal) cai no caminho de sempre: chave = uid. */
function ckTemAreas(m){return ckPerguntas(m).some(q=>q.escopoP&&q.escopoP!=="loja");}
function ckChave(q,area){
  return (area&&q.escopoP&&q.escopoP!=="loja")?q.uid+"@"+area:q.uid;
}
function ckExpandir(m,p){
  const perg=ckPerguntas(m);
  if(!ckTemAreas(m))return perg.map(q=>({q,area:"",chave:q.uid}));
  const out=[];
  for(const q of perg)if(!q.escopoP||q.escopoP==="loja")out.push({q,area:"",chave:q.uid});
  for(const a of (p&&p.areas)||[]){
    const t=(typeof ckTipoDaArea==="function")?ckTipoDaArea(a):"apoio";
    for(const q of perg){
      if(!q.escopoP||q.escopoP==="loja")continue;
      if(q.escopoP==="ambiente"||q.escopoP==="tipo:"+t)out.push({q,area:a,chave:ckChave(q,a)});
    }
  }
  return out;
}
function ckAndamento(p){
  const m=ckAchar(p.modeloUid);
  const total=m?ckExpandir(m,p).length:Object.keys(p.respostas||{}).length;
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
  for(const {q:perg,chave} of ckExpandir(m,p)){
    if(perg.tipoResp==="data"||perg.tipoResp==="texto"||perg.tipoResp==="assinatura")continue;
    const peso=perg.peso==null?1:Number(perg.peso)||0;
    if(!peso)continue;
    const r=(p.respostas||{})[chave];
    if(!r||r.na||r.valor===undefined||r.valor==="")continue;   /* não respondida/N-A: fora */
    total+=peso;
    if(!ckRuim(perg,r))pontos+=peso;
  }
  return {pontos,total,pct:total?Math.round(pontos/total*1000)/10:null};
}
/* nota de um recorte (uma seção, uma área) — usada no relatório */
function ckNotaDe(p,celulas){
  let pontos=0,total=0;
  for(const {q,chave} of celulas){
    if(q.tipoResp==="data"||q.tipoResp==="texto"||q.tipoResp==="assinatura")continue;
    const peso=q.peso==null?1:Number(q.peso)||0;
    if(!peso)continue;
    const r=(p.respostas||{})[chave];
    if(!r||r.na||r.valor===undefined||r.valor==="")continue;
    total+=peso;if(!ckRuim(q,r))pontos+=peso;
  }
  return {pontos,total,pct:total?Math.round(pontos/total*1000)/10:null};
}
/* devolve as CÉLULAS inconformes ({q,area,chave}), não só as perguntas */
function ckInconformes(p){
  const m=ckAchar(p.modeloUid);if(!m)return [];
  return ckExpandir(m,p).filter(c=>ckRuim(c.q,(p.respostas||{})[c.chave]));
}

/* ===== Tela principal da aba ===== */
function renderCk(){
  const box=document.getElementById("tab-ck");if(!box)return;
  box.innerHTML=`
    <div class="ck-barra">
      <div class="ck-secs">
        ${ckSecBotao("formularios","📋",txt("ck.sec.formularios","Formulários"),ckModelos().length)}
        ${ckSecBotao("enviados","✅",txt("ck.sec.enviados","Concluídas"),ckPreenchimentos("concluido").length)}
        ${ckSecBotao("parciais","⏸",txt("ck.sec.parciais","Parciais"),ckPreenchimentos("andamento").length)}
      </div>
      <div class="ck-acoes">
        ${CK_SEC==="formularios"?`
          <button class="btn sm" onclick="ckNovo()"><span data-txt="ck.novo">＋ Novo checklist</span></button>
          ${typeof ckModeloInfra2==="function"?`<button class="btn sm alt" onclick="ckModeloInfra2()" title="Cria o checklist completo com as perguntas da legislação">✨ <span data-txt="ck.infra2.bt">Infraestrutura e Manutenção 2</span></button>`:""}
          ${typeof ckAmbientes==="function"?`<button class="filtro-cfg-bt" onclick="ckAmbientes()" title="Dizer o que é cada área: câmara, banheiro, produção...">⚙ <span data-txt="ck.cfg.amb">Áreas</span></button>`:""}
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
    const n=ckPerguntas(m).length,porArea=ckTemAreas(m);
    return `<div class="ck-card">
      <div class="ck-card-top">
        <b class="ck-card-tit">${esc(m.titulo||"(sem nome)")}</b>
        <span class="ck-qtd">${n} ${n===1?"pergunta":"perguntas"}</span>
      </div>
      ${m.descricao?`<p class="ck-card-desc">${esc(m.descricao)}</p>`:""}
      ${porArea?`<p class="ck-card-tag">📍 Este checklist pergunta área por área</p>`:""}
      <div class="ck-card-pe">
        <button class="btn sm" ${n?"":"disabled title='Adicione perguntas antes de preencher'"} onclick="ckIniciar('${m.uid}')">▶ <span data-txt="ck.preencher">Preencher</span></button>
        ${porArea&&typeof ckTriagem==="function"?`<button class="btn ghost sm" onclick="ckTriagem('${m.uid}')" title="Ligar as manutenções que você já tem às perguntas">🔗 <span data-txt="ck.tri.bt">Ligar minhas manutenções</span></button>`:""}
        ${porArea&&typeof ckHistorico==="function"?`<button class="btn ghost sm" onclick="ckHistorico('${m.uid}')" title="Monta um relatório já concluído com tudo que você já relatou">📅 <span data-txt="ck.hist.bt">Montar o relatório do mês</span></button>`:""}
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
              <button class="btn ghost sm" onclick="ckPDF('${p.uid}')" title="Relatório para a gerência: resumo e o que precisa ser corrigido">🖨</button>
              <button class="btn ghost sm" onclick="ckPDF('${p.uid}',true)" title="Documento completo, item por item (para a Vigilância Sanitária)">📄</button>
              ${typeof ckMudarData==="function"?`<button class="btn ghost sm" onclick="ckMudarData('${p.uid}')" title="Mudar a data deste relatório">📅</button>`:""}`
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
  const aviso=usos?"\n\nATENÇÃO: "+usos+" inspeção(ões) já foram feitas com ele.\nElas CONTINUAM guardadas em Concluídas/Parciais.":"";
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
/* nº de colunas da tabela do construtor — usado no colspan do cabeçalho de seção e da
   linha-guia do arraste. Passar do total é inofensivo; ficar abaixo QUEBRA o arraste. */
const CK_COLS=14;

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
  /* o checklist tem seções? se NENHUMA pergunta tem, não desenha cabeçalho nenhum —
     é o que mantém o checklist 1 (Semanal) exatamente como sempre foi. */
  const temSecao=todas.some(p=>(p.secao||"").trim());
  let secAtual=null;
  return `<table class="ck-perg${temSecao?" com-sec":""}">
    <thead><tr>
      <th class="c-arr"></th><th class="c-n">#</th>
      <th data-txt="ck.h.titulo">Título</th>
      <th data-txt="ck.h.desc">Descrição</th>
      ${temSecao?`<th data-txt="ck.h.secao">Seção</th><th data-txt="ck.h.onde">Onde pergunta</th>`:""}
      <th data-txt="ck.h.acao">Ação corretiva</th>
      <th data-txt="ck.h.legal">Base legal</th>
      <th data-txt="ck.h.tipo">Tipo</th>
      <th data-txt="ck.h.na">Não Aplicável</th>
      <th data-txt="ck.h.coment">Comentários</th>
      <th data-txt="ck.h.foto">Foto</th>
      <th data-txt="ck.h.peso">Peso</th>
      <th class="c-ac"></th>
    </tr></thead>
    <tbody>${vis.map(p=>{
      const n=todas.indexOf(p)+1;
      let cab="";
      if(temSecao){
        const s=(p.secao||"").trim()||"— sem seção —";
        if(s!==secAtual){secAtual=s;
          const qt=todas.filter(x=>((x.secao||"").trim()||"— sem seção —")===s).length;
          cab=`<tr class="ck-secao-h"><td colspan="${CK_COLS}"><b>${esc(s)}</b>
                 <span>${qt} ${qt===1?"pergunta":"perguntas"}</span></td></tr>`;}
      }
      return cab+`<tr class="ck-lin${CK_SEL.has(p.uid)?" sel":""}" data-uid="${p.uid}">
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
        ${temSecao?`
        <td><input class="ck-sec-in" value="${esc(p.secao||"")}" placeholder="Seção"
              title="Agrupa as perguntas no preenchimento e no relatório"
              onchange="ckSetPergunta('${p.uid}','secao',this.value.trim())"></td>
        <td>${ckSelectEscopoHTML(p)}</td>`:""}
        <td><div class="ck-ed sub acao" contenteditable="plaintext-only" spellcheck="false"
              data-ph="O que fazer se estiver irregular"
              onblur="ckSetPergunta('${p.uid}','acaoPadrao',this.innerText.trim())">${esc(p.acaoPadrao||"")}</div></td>
        <td><div class="ck-ed sub legal" contenteditable="plaintext-only" spellcheck="false"
              data-ph="RDC / item"
              onblur="ckSetPergunta('${p.uid}','baseLegal',this.innerText.trim())">${esc(p.baseLegal||"")}</div></td>
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
/* ONDE a pergunta é feita. Vazio = como sempre foi (uma vez, na inspeção inteira). */
const CK_ESCOPOS={
  "":"Uma vez só",
  loja:"Uma vez na loja",
  ambiente:"Em toda área visitada",
  "tipo:camara":"Só nas câmaras e expositores",
  "tipo:sanitario":"Só em banheiros e vestiários",
  "tipo:producao":"Só nas áreas de manipulação",
  "tipo:residuo":"Só na área de lixo"
};
function ckSelectEscopoHTML(p){
  return `<select class="ck-sel" title="Em quais áreas esta pergunta aparece"
    onchange="ckSetPergunta('${p.uid}','escopoP',this.value)">
    ${Object.keys(CK_ESCOPOS).map(k=>`<option value="${k}"${(p.escopoP||"")===k?" selected":""}>${esc(CK_ESCOPOS[k])}</option>`).join("")}
  </select>`;
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

/* campos digitados à mão: redesenhar enquanto ela digita faria o cursor pular */
const CK_TXT_LIVRE=["titulo","descricao","acaoPadrao","baseLegal"];

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
  /* campos de texto não redesenham (perderia o cursor); os outros sim.
     secao redesenha SIM: os cabeçalhos de seção precisam se reagrupar. */
  if(!CK_TXT_LIVRE.includes(campo))ckRedesenhaLista();
}
async function ckAddPergunta(depoisDe){
  const m=ckAchar(CK_MODELO_ABERTO);if(!m)return;
  const lista=ckPerguntas(m);
  const nova={uid:newUid(),titulo:"",descricao:"",tipoResp:"simnao",opcoesLista:"",
    na:false,coment:"inconforme",foto:"opcional",peso:1,ordem:0,removida:false,
    secao:"",escopoP:"",acaoPadrao:"",baseLegal:""};
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
    ${ckTemSecoes()?`<select onchange="ckMassa('escopoP',this.value===' '?'':this.value);this.selectedIndex=0" title="Mudar onde estas perguntas aparecem">
      <option value="">Onde pergunta…</option>
      ${Object.keys(CK_ESCOPOS).map(k=>`<option value="${k||" "}">${esc(CK_ESCOPOS[k])}</option>`).join("")}
    </select>
    <button class="btn ghost sm" onclick="ckMassaSecao()" title="Pôr todas na mesma seção">Seção…</button>`:""}
    <button class="btn ghost sm" onclick="ckSelTodas()">Marcar todas</button>
    <button class="btn ghost sm" onclick="ckMassaExcluir()">🗑</button>
    <button class="btn ghost sm" onclick="CK_SEL.clear();ckRedesenhaLista()">✕ Cancelar</button>
  </div></div>`;
}
function ckTemSecoes(){
  const m=ckAchar(CK_MODELO_ABERTO);
  return !!(m&&ckPerguntas(m).some(p=>(p.secao||"").trim()));
}
async function ckMassaSecao(){
  const m=ckAchar(CK_MODELO_ABERTO);if(!m||!CK_SEL.size)return;
  const nomes=[...new Set(ckPerguntas(m).map(p=>(p.secao||"").trim()).filter(Boolean))];
  const s=prompt("Pôr as "+CK_SEL.size+" perguntas selecionadas em qual seção?\n\n"
    +"Seções que já existem:\n"+nomes.map(n=>"· "+n).join("\n"));
  if(s===null)return;
  await ckMassa("secao",s.trim()||" ");
}
async function ckMassa(campo,valor){
  const podeVazio=campo==="secao"||campo==="escopoP";
  if(valor===" ")valor="";                       /* " " = a opção "vazio" do seletor */
  if((!valor&&!podeVazio)||!CK_SEL.size)return;
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
  marca.innerHTML=`<td colspan="${CK_COLS}"></td>`;
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
  /* Caiu no meio de outra seção? Adota a seção da vizinha — mesmo comportamento do
     Quadro Geral, onde arrastar para outro grupo muda a prioridade. Sem isso a tabela
     redesenharia com o mesmo cabeçalho de seção repetido em dois lugares. */
  if(ckTemSecoes()){
    const arrastada=lista.find(x=>x.uid===lin.dataset.uid);
    if(arrastada){
      const orden=[...lista].sort((a,b)=>(a.ordem??0)-(b.ordem??0));
      const j=orden.indexOf(arrastada);
      const viz=orden[j-1]||orden[j+1];
      const nova=viz?(viz.secao||""):arrastada.secao;
      if(nova!==arrastada.secao){
        arrastada.secao=nova;
        toast("Pergunta movida para a seção “"+(nova||"sem seção")+"”");
      }
    }
  }
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

/* modo de resposta: "passo" (uma pergunta por tela) ou "lista" (a área inteira numa tela) */
let CK_MODO=localStorage.getItem("ck_modo")||"lista";
function ckSetModo(m){CK_MODO=m;localStorage.setItem("ck_modo",m);ckRedesenhaPreench();}
function ckRedesenhaPreench(){
  if(!document.getElementById("ck-preench")||!CK_PREENCH)return;
  const p=ckAchar(CK_PREENCH);if(!p)return;
  if(p.status==="concluido")return ckDesenhaResumo(true);
  const m=ckAchar(p.modeloUid);
  if(CK_MODO==="lista"&&m&&ckTemAreas(m))ckDesenhaLista();else ckDesenhaPasso();
}

async function ckIniciar(modeloUid){
  const m=ckAchar(modeloUid);if(!m)return;
  if(!ckPerguntas(m).length){toast("Adicione perguntas antes de preencher");return;}
  /* checklist por área: ela escolhe primeiro ONDE vai passar hoje */
  if(ckTemAreas(m))return ckEscolherAreas(m.uid);
  await ckCriarPreench(m,[]);
}
async function ckCriarPreench(m,areas){
  const o={uid:newUid(),mod:nowISO(),tipo:"ckp",loja:currentStore,
    modeloUid:m.uid,modeloTitulo:m.titulo||"",
    status:"andamento",posicao:0,areas:areas||[],
    criadoEm:today(),iniciadoEm:nowISO(),atualizacao:nowISO(),
    respondente:"",assinatura:"",nota:null,respostas:{}};
  o.id=await putItem(o);DATA.push(o);dataChanged();
  CK_PREENCH=o.uid;CK_ETAPA=0;
  if(CK_MODO==="lista"&&ckTemAreas(m))ckDesenhaLista();else ckDesenhaPasso();
}
function ckRetomar(uid){const p=ckAchar(uid);if(!p)return;CK_PREENCH=uid;
  const m=ckAchar(p.modeloUid);
  if(CK_MODO==="lista"&&m&&ckTemAreas(m))ckDesenhaLista();else ckDesenhaPasso();}

/* ---- escolher as áreas da inspeção de hoje ---- */
let CK_AREAS_SEL=new Set(),CK_AREAS_MOD="";
function ckEscolherAreas(modeloUid){
  const m=ckAchar(modeloUid);if(!m)return;
  CK_AREAS_MOD=modeloUid;CK_AREAS_SEL=new Set();
  if(typeof ckAmbCarregar==="function")ckAmbCarregar().then(()=>ckEscolherAreasDesenha(modeloUid));
  else ckEscolherAreasDesenha(modeloUid);
}
function ckEscolherAreasDesenha(modeloUid){
  const areas=(typeof ckAreasDaLoja==="function")?ckAreasDaLoja():[];
  if(!areas.length){
    alert("Esta empresa ainda não tem áreas cadastradas.\n\n"
      +"Cadastre as áreas na aba Manutenções e Elétrica e volte aqui.");return;
  }
  const porTipo={};
  for(const a of areas){const t=ckTipoDaArea(a);(porTipo[t]=porTipo[t]||[]).push(a);}
  ncModal(`<h2>Onde você vai passar hoje?</h2>
    <p class="desc">Marque as áreas que vai inspecionar. Em cada uma o site pergunta
    <b>só o que faz sentido ali</b> — numa câmara ele pergunta do termômetro, num banheiro
    do papel toalha. As perguntas gerais da loja (água, esgoto, dedetização) aparecem
    uma vez só.</p>
    <div class="ck-ar-barra">
      <button class="btn ghost sm" onclick="ckAreasTodas(true)">Marcar todas</button>
      <button class="btn ghost sm" onclick="ckAreasTodas(false)">Limpar</button>
      <button class="btn ghost sm" onclick="ncFechar();ckAmbientes()">⚙ Corrigir o que é cada área</button>
      <span class="ck-ar-cont" id="ck-ar-cont">${CK_AREAS_SEL.size} marcadas</span>
    </div>
    <div class="ck-ar-grupos">
      ${Object.keys(CK_TIPOS_AMB).filter(t=>porTipo[t]).map(t=>`
        <div class="ck-ar-grupo">
          <div class="ck-ar-h" style="border-color:${CK_TIPOS_AMB[t].cor}">
            ${CK_TIPOS_AMB[t].ico} <b>${esc(CK_TIPOS_AMB[t].rotulo)}</b>
            <button class="btn ghost sm" onclick="ckAreasGrupo('${t}')">todas</button>
          </div>
          ${porTipo[t].map(a=>`<label class="ck-ar-item">
            <input type="checkbox" ${CK_AREAS_SEL.has(a)?"checked":""}
              onchange="ckAreaToggle('${esc(a).replace(/'/g,"&#39;")}',this.checked)">
            <span>${esc(a)}</span></label>`).join("")}
        </div>`).join("")}
    </div>
    <div class="form-actions">
      <button class="btn ghost" onclick="ncFechar()">Cancelar</button>
      <button class="btn" onclick="ckAreasConfirmar('${modeloUid}')">Começar a inspeção ›</button>
    </div>`);
}
function ckAreaToggle(a,on){
  on?CK_AREAS_SEL.add(a):CK_AREAS_SEL.delete(a);
  const c=document.getElementById("ck-ar-cont");
  if(c)c.textContent=CK_AREAS_SEL.size+" marcadas";
}
function ckAreasTodas(on){
  CK_AREAS_SEL=on?new Set(ckAreasDaLoja()):new Set();
  ckEscolherAreasDesenha(CK_AREAS_MOD);
}
function ckAreasGrupo(t){
  for(const a of ckAreasDaLoja())if(ckTipoDaArea(a)===t)CK_AREAS_SEL.add(a);
  ckEscolherAreasDesenha(CK_AREAS_MOD);
}
async function ckAreasConfirmar(modeloUid){
  const m=ckAchar(modeloUid);if(!m)return;
  if(!CK_AREAS_SEL.size&&!confirm("Você não marcou nenhuma área.\n\n"
    +"A inspeção vai ter só as perguntas gerais da loja. Continuar?"))return;
  const areas=[...CK_AREAS_SEL].sort((a,b)=>a.localeCompare(b,"pt-BR"));
  ncFechar();await ckCriarPreench(m,areas);
}
function ckVer(uid){const p=ckAchar(uid);if(!p)return;CK_PREENCH=uid;ckDesenhaResumo(true);}

function ckFecharPreench(){
  const el=document.getElementById("ck-preench");if(el)el.remove();
  document.body.style.overflow="";CK_PREENCH="";renderCk();
}
/* chamado pelo desfazer (js/app.js histAplicar) para a tela não ficar desatualizada */
function ckRedesenhaPasso(){if(document.getElementById("ck-preench")&&CK_PREENCH)ckRedesenhaPreench();}

function ckDesenhaPasso(){
  const p=ckAchar(CK_PREENCH);if(!p)return ckFecharPreench();
  const m=ckAchar(p.modeloUid);
  if(!m){alert("O checklist deste preenchimento foi excluído.");return ckFecharPreench();}
  if(CK_MODO==="lista"&&ckTemAreas(m))return ckDesenhaLista();
  const cel=ckExpandir(m,p);
  if(p.posicao>=cel.length)return ckDesenhaResumo(false);
  const i=Math.max(0,Math.min(p.posicao||0,cel.length-1));
  const {q,area,chave}=cel[i],r=(p.respostas||{})[chave]||{};
  let el=document.getElementById("ck-preench");
  if(!el){el=document.createElement("div");el.id="ck-preench";el.className="ck-preench";document.body.appendChild(el);}
  document.body.style.overflow="hidden";
  el.innerHTML=`<div class="ck-pr-topo">
      <button class="ck-pr-x" onclick="ckSairPreench()" title="Sair e guardar em Parciais">✕</button>
      <span class="ck-pr-nome">${esc(m.titulo||"")}</span>
      ${ckTemAreas(m)?`<button class="ck-pr-modo" onclick="ckSetModo('lista')" title="Ver tudo em lista">☰ Lista</button>`:""}
    </div>
    <div class="ck-pr-box">
      ${area?`<div class="ck-pr-area">${ckIcoArea(area)} ${esc(area)}</div>`:""}
      ${q.secao?`<div class="ck-pr-secao">${esc(q.secao)}</div>`:""}
      <div class="ck-pr-h">
        <h2>${esc(q.titulo||"(pergunta sem texto)")}</h2>
        <span class="ck-pr-cont">${i+1}/${cel.length}</span>
      </div>
      ${q.descricao?`<p class="ck-pr-desc">${esc(q.descricao)}</p>`:""}
      ${q.baseLegal?`<p class="ck-legal">§ ${esc(q.baseLegal)}</p>`:""}
      ${ckAvisoNCsHTML(q,area)}
      <div class="ck-pr-resp">${ckRespostaHTML(q,r,chave)}</div>
      ${q.na?`<label class="ck-pr-na"><input type="checkbox" ${r.na?"checked":""}
        onchange="ckResponder('${chave}','na',this.checked)"> <span data-txt="ck.na">Não se aplica</span></label>`:""}
      ${q.coment!=="nao"?`<div class="ck-pr-com">
        <label>${esc(ckRot(CK_COMENT,q.coment,"Comentário"))==="Inconforme"?txt("ck.com.obrig","Comentário (obrigatório se estiver inconforme)"):txt("ck.com.opc","Comentário")}</label>
        <textarea rows="2" data-txt-ph="ck.com.ph" placeholder="Descreva o ocorrido"
          onchange="ckResponder('${chave}','comentario',this.value)">${esc(r.comentario||"")}</textarea>
      </div>`:""}
      ${q.foto!=="nao"?ckFotoHTML(q,r,chave):""}
      <div class="ck-pr-pe">
        <button class="btn ghost" ${i===0?"disabled":""} onclick="ckPasso(-1)">‹ <span data-txt="ck.voltar">Voltar</span></button>
        <button class="btn" onclick="ckPasso(1)"><span data-txt="ck.avancar">Avançar</span> ›</button>
      </div>
    </div>`;
  aplicarTextos(el);
  if(q.tipoResp==="assinatura")ckCanvasLigar("ck-cv-"+chave,chave);
}
/* ===================================================================
   MODO LISTA — uma ETAPA por tela (as perguntas da loja, depois cada área).
   É o que torna 91 perguntas × várias áreas viável numa inspeção de verdade.
   =================================================================== */
let CK_ETAPA=0;
function ckEtapas(m,p){
  const et=[{area:"",rot:"Geral da loja",ico:"🏬"}];
  for(const a of (p.areas||[]))et.push({area:a,rot:a,ico:ckIcoArea(a)});
  return et.filter(e=>ckExpandir(m,p).some(c=>c.area===e.area));
}
function ckDesenhaLista(){
  const p=ckAchar(CK_PREENCH);if(!p)return ckFecharPreench();
  const m=ckAchar(p.modeloUid);
  if(!m){alert("O checklist deste preenchimento foi excluído.");return ckFecharPreench();}
  const cel=ckExpandir(m,p),etapas=ckEtapas(m,p);
  if(!etapas.length)return ckDesenhaResumo(false);
  CK_ETAPA=Math.max(0,Math.min(CK_ETAPA,etapas.length-1));
  const et=etapas[CK_ETAPA];
  const desta=cel.filter(c=>c.area===et.area);
  const feitas=desta.filter(c=>{const r=(p.respostas||{})[c.chave]||{};return r.na||(r.valor!==undefined&&r.valor!=="");}).length;
  let el=document.getElementById("ck-preench");
  if(!el){el=document.createElement("div");el.id="ck-preench";el.className="ck-preench";document.body.appendChild(el);}
  document.body.style.overflow="hidden";

  /* agrupa por seção dentro da etapa */
  const secs=[];
  for(const c of desta){
    const s=c.q.secao||"";
    let g=secs.find(x=>x.s===s);
    if(!g){g={s,itens:[]};secs.push(g);}
    g.itens.push(c);
  }
  el.innerHTML=`<div class="ck-pr-topo">
      <button class="ck-pr-x" onclick="ckSairPreench()" title="Sair e guardar em Parciais">✕</button>
      <span class="ck-pr-nome">${esc(m.titulo||"")}</span>
      <button class="ck-pr-modo" onclick="ckSetModo('passo')" title="Uma pergunta por vez">◻ Uma por vez</button>
    </div>
    <div class="ck-et-trilha">${etapas.map((e,i)=>{
      const c2=cel.filter(c=>c.area===e.area);
      const ok=c2.filter(c=>{const r=(p.respostas||{})[c.chave]||{};return r.na||(r.valor!==undefined&&r.valor!=="");}).length;
      return `<button class="ck-et${i===CK_ETAPA?" on":""}${ok===c2.length?" full":""}"
        onclick="CK_ETAPA=${i};ckDesenhaLista()" title="${esc(e.rot)}">
        <span class="ic">${e.ico}</span><span class="nm">${esc(e.rot)}</span>
        <span class="qt">${ok}/${c2.length}</span></button>`;}).join("")}
    </div>
    <div class="ck-pr-box larga">
      <div class="ck-lst-h">
        <h2>${et.ico} ${esc(et.rot)}</h2>
        <div class="ck-lst-info">
          <span>${feitas}/${desta.length} respondidas</span>
          ${et.area?`<button class="btn ghost sm" onclick="ckRepetirUltima()" title="Copiar as respostas da última inspeção desta área">↻ Repetir da última vez</button>`:""}
          <button class="btn ghost sm" onclick="ckMarcarTudoOk()" title="Marcar 👍 em tudo que ainda não foi respondido">👍 Tudo certo aqui</button>
        </div>
      </div>
      ${ckAvisoNCsArea(et.area)}
      <div class="ck-lst">
        ${secs.map(g=>`
          ${g.s?`<div class="ck-lst-sec">${esc(g.s)}</div>`:""}
          ${g.itens.map(c=>ckLinhaHTML(c,(p.respostas||{})[c.chave]||{})).join("")}
        `).join("")}
      </div>
      <div class="ck-pr-pe">
        <button class="btn ghost" ${CK_ETAPA===0?"disabled":""} onclick="CK_ETAPA--;ckDesenhaLista()">‹ Anterior</button>
        ${CK_ETAPA<etapas.length-1
          ?`<button class="btn" onclick="CK_ETAPA++;ckDesenhaLista()">Próxima área ›</button>`
          :`<button class="btn" onclick="ckIrResumo()">✔ Revisar e concluir</button>`}
      </div>
    </div>`;
  aplicarTextos(el);
}
/* uma linha da lista. É esta a unidade que ckRepintaLinha troca sozinha. */
function ckLinhaHTML(c,r){
  const {q,chave}=c,ruim=ckRuim(q,r);
  const resp=r.na?"na":(r.valor||"");
  const nEmAberto=(typeof ckNCsDaPergunta==="function")
    ?ckNCsDaPergunta(q.uid,c.area).filter(d=>d.status!=="Concluído").length:0;
  const simples=q.tipoResp==="simnao";
  return `<div class="ck-lin-r${ruim?" ruim":""}${resp?" feita":""}" data-k="${esc(chave)}">
    <div class="tx">
      <b>${esc(q.titulo||"")}</b>
      ${q.descricao?`<span class="d">${esc(q.descricao)}</span>`:""}
      ${q.baseLegal?`<span class="lg">§ ${esc(q.baseLegal)}</span>`:""}
      ${nEmAberto?`<button class="ck-nc-tag" onclick="ckVerNCs('${q.uid}','${esc(c.area).replace(/'/g,"&#39;")}')">⚠ ${nEmAberto} em aberto</button>`:""}
      ${r.comentario?`<span class="cm">💬 ${esc(r.comentario)}</span>`:""}
      ${(r.fotos||[]).length?`<span class="cm">📷 ${r.fotos.length}</span>`:""}
    </div>
    <div class="bt">
      ${simples?`
        <button class="ck-b sim${resp==="sim"?" on":""}" onclick="ckResponder('${chave}','valor','sim')" title="Conforme">👍</button>
        <button class="ck-b nao${resp==="nao"?" on":""}" onclick="ckResponder('${chave}','valor','nao')" title="Inconforme">👎</button>
        ${q.na?`<button class="ck-b na${resp==="na"?" on":""}" onclick="ckResponder('${chave}','na',${r.na?"false":"true"})" title="Não se aplica">N/A</button>`:""}`
      :`<button class="ck-b abrir" onclick="ckAbrirUma('${chave}')">Responder ›</button>`}
      <button class="ck-b det" onclick="ckAbrirUma('${chave}')" title="Comentário, foto e plano de ação">⋯</button>
    </div>
  </div>`;
}
/* repinta SÓ a linha tocada — redesenhar 40 linhas a cada toque trava o celular */
function ckRepintaLinha(chave){
  const p=ckAchar(CK_PREENCH);if(!p)return;
  const m=ckAchar(p.modeloUid);if(!m)return;
  const c=ckExpandir(m,p).find(x=>x.chave===chave);if(!c)return;
  const el=document.querySelector(`.ck-lin-r[data-k="${CSS.escape(chave)}"]`);
  if(!el)return ckDesenhaLista();
  el.outerHTML=ckLinhaHTML(c,(p.respostas||{})[chave]||{});
  /* atualiza os contadores da trilha sem redesenhar a lista inteira */
  const cel=ckExpandir(m,p),etapas=ckEtapas(m,p);
  document.querySelectorAll(".ck-et").forEach((b,i)=>{
    const e=etapas[i];if(!e)return;
    const c2=cel.filter(x=>x.area===e.area);
    const ok=c2.filter(x=>{const r=(p.respostas||{})[x.chave]||{};return r.na||(r.valor!==undefined&&r.valor!=="");}).length;
    const qt=b.querySelector(".qt");if(qt)qt.textContent=ok+"/"+c2.length;
    b.classList.toggle("full",ok===c2.length);
  });
}
/* abre UMA célula na tela cheia de sempre (para comentário, foto e plano de ação) */
async function ckAbrirUma(chave){
  const p=ckAchar(CK_PREENCH);if(!p)return;
  const m=ckAchar(p.modeloUid);if(!m)return;
  const i=ckExpandir(m,p).findIndex(c=>c.chave===chave);if(i<0)return;
  p.posicao=i;await ckSalvar(p);
  CK_MODO="passo";ckDesenhaPasso();
}
function ckIrResumo(){
  const p=ckAchar(CK_PREENCH);if(!p)return;
  ckDesenhaResumo(false);
}
/* 👍 em tudo que ficou em branco nesta etapa — o caminho normal de uma área sem problema */
async function ckMarcarTudoOk(){
  const p=ckAchar(CK_PREENCH);if(!p)return;
  const m=ckAchar(p.modeloUid);if(!m)return;
  const et=ckEtapas(m,p)[CK_ETAPA];if(!et)return;
  const alvo=ckExpandir(m,p).filter(c=>c.area===et.area&&c.q.tipoResp==="simnao")
    .filter(c=>{const r=(p.respostas||{})[c.chave]||{};return !r.na&&(r.valor===undefined||r.valor==="");});
  if(!alvo.length){toast("Nada em branco aqui");return;}
  if(!confirm("Marcar 👍 em "+alvo.length+" pergunta(s) que ainda estão em branco?\n\n"
    +"Só confirme se você olhou de verdade — este documento é assinado por você."))return;
  p.respostas=p.respostas||{};
  for(const c of alvo){
    const r=p.respostas[c.chave]=p.respostas[c.chave]||{fotos:[]};
    r.valor="sim";r.em=nowISO();
  }
  await ckGravaResposta(p);ckDesenhaLista();toast(alvo.length+" marcadas ✓");
}
/* copia as respostas da última inspeção CONCLUÍDA desta mesma área */
async function ckRepetirUltima(){
  const p=ckAchar(CK_PREENCH);if(!p)return;
  const m=ckAchar(p.modeloUid);if(!m)return;
  const et=ckEtapas(m,p)[CK_ETAPA];if(!et||!et.area)return;
  const ant=DATA.filter(d=>!d.deleted&&d.tipo==="ckp"&&d.loja===p.loja&&d.modeloUid===p.modeloUid
      &&d.status==="concluido"&&d.uid!==p.uid&&(d.areas||[]).includes(et.area))
    .sort((a,b)=>String(b.concluidoEm||"").localeCompare(String(a.concluidoEm||"")))[0];
  if(!ant){toast("Não há inspeção anterior concluída nesta área");return;}
  const cel=ckExpandir(m,p).filter(c=>c.area===et.area);
  let n=0;
  p.respostas=p.respostas||{};
  for(const c of cel){
    const velha=(ant.respostas||{})[c.chave];
    if(!velha||(velha.valor===undefined&&!velha.na))continue;
    p.respostas[c.chave]={fotos:[],valor:velha.valor,na:velha.na,
      comentario:velha.comentario||"",em:nowISO()};   /* fotos e plano NÃO vêm junto */
    n++;
  }
  if(!n){toast("A inspeção anterior não tem respostas nesta área");return;}
  await ckGravaResposta(p);ckDesenhaLista();
  toast(n+" respostas copiadas de "+brDate(ant.concluidoEm||"")+" — confira uma a uma");
}
function ckAvisoNCsArea(area){
  if(!area||typeof ckItensMnt!=="function")return "";
  const l=ckItensMnt().filter(d=>String(d.area||"").trim()===area&&d.status!=="Concluído");
  if(!l.length)return "";
  return `<div class="ck-ncs area"><b>⚠ ${l.length} manutenção${l.length===1?"":"ões"} em aberto nesta área</b>
    <ul>${l.slice(0,5).map(d=>`<li>${esc(d.nc||"")}</li>`).join("")}</ul>
    ${l.length>5?`<span class="mais">+ ${l.length-5}</span>`:""}</div>`;
}
function ckVerNCs(qUid,area){
  const l=ckNCsDaPergunta(qUid,area);
  if(!l.length)return;
  alert("Manutenções ligadas a esta pergunta:\n\n"
    +l.map(d=>"· "+(d.nc||"")+"  ["+(d.status||"")+"]").join("\n"));
}
function ckIcoArea(a){
  const t=(typeof ckTipoDaArea==="function")?ckTipoDaArea(a):"";
  return (typeof CK_TIPOS_AMB!=="undefined"&&CK_TIPOS_AMB[t])?CK_TIPOS_AMB[t].ico:"📍";
}
/* as não conformidades que ela JÁ tem ligadas a esta pergunta — a prova na mão */
function ckAvisoNCsHTML(q,area){
  if(typeof ckNCsDaPergunta!=="function")return "";
  const l=ckNCsDaPergunta(q.uid,area).filter(d=>d.status!=="Concluído");
  if(!l.length)return "";
  return `<div class="ck-ncs">
    <b>⚠ ${l.length} manutenção${l.length===1?"":"ões"} em aberto aqui:</b>
    <ul>${l.slice(0,6).map(d=>`<li>${esc(d.nc||"")}${d.area&&!area?` <i>(${esc(d.area)})</i>`:""}</li>`).join("")}</ul>
    ${l.length>6?`<span class="mais">+ ${l.length-6}</span>`:""}
  </div>`;
}
function ckRespostaHTML(q,r,chave){
  const k=chave||q.uid;
  if(q.tipoResp==="simnao")return `<div class="ck-simnao">
    <button class="ck-nao${r.valor==="nao"?" on":""}" onclick="ckResponder('${k}','valor','nao')">👎</button>
    <button class="ck-sim${r.valor==="sim"?" on":""}" onclick="ckResponder('${k}','valor','sim')">👍</button></div>`;
  if(q.tipoResp==="selecao"){
    const L=CK_LISTAS[q.opcoesLista];
    if(!L||!(L.opcoes||[]).length)return `<p class="ck-pr-aviso">Esta pergunta é de escolha, mas não tem lista de opções. Configure em ⚙ Listas.</p>`;
    return `<div class="ck-radios">${L.opcoes.map(o=>`
      <label class="ck-radio${r.valor===o.chave?" on":""}">
        <input type="radio" name="r-${k}" ${r.valor===o.chave?"checked":""}
          onchange="ckResponder('${k}','valor','${o.chave}')">
        <span>${esc(o.rotulo)}</span>${o.ruim?`<em class="ck-tag-ruim">inconforme</em>`:""}
      </label>`).join("")}</div>`;
  }
  if(q.tipoResp==="data")return `<input class="ck-in" type="date" value="${esc(r.valor||today())}"
    onchange="ckResponder('${k}','valor',this.value)">`;
  if(q.tipoResp==="texto")return `<textarea class="ck-in" rows="3" placeholder="Escreva aqui"
    onchange="ckResponder('${k}','valor',this.value)">${esc(r.valor||"")}</textarea>`;
  if(q.tipoResp==="assinatura")return `<div class="ck-assin">
    ${r.valor?`<img class="ck-assin-img" src="${r.valor}" alt="assinatura">`
             :`<canvas id="ck-cv-${k}" class="ck-cv" width="600" height="200"></canvas>`}
    <div class="ck-assin-pe">
      ${CK_ASSINATURA&&!r.valor?`<button class="btn ghost sm" onclick="ckUsarMinhaAssinatura('${k}')">✍ <span data-txt="ck.usarassin">Usar a minha assinatura</span></button>`:""}
      <button class="btn ghost sm" onclick="ckLimparAssin('${k}')"><span data-txt="ck.limpar">Limpar</span></button>
    </div></div>`;
  return "";
}
function ckFotoHTML(q,r,chave){
  const fotos=r.fotos||[],k=chave||q.uid;
  const id="ck-file-"+k.replace(/[^a-zA-Z0-9_-]/g,"_");
  return `<div class="ck-pr-foto">
    <div class="ck-origem"><span data-txt="ck.origem">Origem da foto:</span>
      <label><input type="radio" name="og-${k}" checked onchange="ckOrigem('${id}',true)"> <span data-txt="ck.camera">Câmera</span></label>
      <label><input type="radio" name="og-${k}" onchange="ckOrigem('${id}',false)"> <span data-txt="ck.galeria">Galeria</span></label>
    </div>
    <input type="file" id="${id}" accept="image/*" capture="environment" style="display:none"
      onchange="ckAddFoto(event,'${k}')">
    <button class="btn ghost sm" ${fotos.length>=CK_MAX_FOTOS?"disabled":""}
      onclick="document.getElementById('${id}').click()">📷
      ${fotos.length>=CK_MAX_FOTOS?txt("ck.fotomax","Limite de fotos atingido"):txt("ck.tirarfoto","Tirar / escolher foto")}</button>
    ${q.foto==="obrigatoria"&&!fotos.length?`<span class="ck-obrig" data-txt="ck.fotoobrig">Foto obrigatória</span>`:""}
    <div class="ck-thumbs">${fotos.map((f,i)=>`<span class="ck-thumb">
      <img src="${f}"><button onclick="ckDelFoto('${k}',${i})" title="Remover">×</button></span>`).join("")}</div>
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
function ckOrigem(id,camera){
  const inp=document.getElementById(id);if(!inp)return;
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
  await ckGravaResposta(p);ckRedesenhaPreench();
}
async function ckDelFoto(qUid,i){
  const p=ckAchar(CK_PREENCH);if(!p)return;
  const r=(p.respostas||{})[qUid];if(!r||!r.fotos)return;
  r.fotos.splice(i,1);await ckGravaResposta(p);ckDesenhaPasso();
}
async function ckResponder(chave,campo,valor){
  const p=ckAchar(CK_PREENCH);if(!p)return;
  p.respostas=p.respostas||{};
  const r=p.respostas[chave]=p.respostas[chave]||{fotos:[]};
  r[campo]=valor;r.em=nowISO();
  if(campo==="na"&&valor)r.valor="";           /* N/A limpa a resposta */
  await ckGravaResposta(p);
  /* botão e rádio redesenham para marcar a escolha; texto/comentário não (perderia o cursor) */
  if(campo==="valor"||campo==="na"){
    /* no modo lista são até 40 linhas na tela: redesenhar tudo trava o iPhone.
       Repinta SÓ a linha tocada. */
    if(CK_MODO==="lista"){ckRepintaLinha(chave);return;}
    ckDesenhaPasso();
  }
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
  const cel=ckExpandir(m,p),i=p.posicao||0;
  if(dir>0&&cel[i]){
    const erro=ckValidar(cel[i].q,(p.respostas||{})[cel[i].chave]||{});
    if(erro){alert(erro);return;}
  }
  p.posicao=Math.max(0,Math.min(i+dir,cel.length));
  await ckSalvar(p);
  if(p.posicao>=cel.length)ckDesenhaResumo(false);else ckDesenhaPasso();
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
  const perg=m?ckExpandir(m,p):[];
  const nota=p.status==="concluido"&&p.nota?p.nota:ckNota(p);
  const inc=ckInconformes(p);
  const cls=(typeof ckClassifica==="function")?ckClassifica(nota.pct):{rot:"",cor:""};
  const prog=(typeof ckProgressoPontos==="function")?ckProgressoPontos(p):null;
  let el=document.getElementById("ck-preench");
  if(!el){el=document.createElement("div");el.id="ck-preench";el.className="ck-preench";document.body.appendChild(el);}
  document.body.style.overflow="hidden";
  el.innerHTML=`<div class="ck-pr-topo">
      <button class="ck-pr-x" onclick="ckSairPreench()" title="Fechar">✕</button>
      <span class="ck-pr-nome">${esc(p.modeloTitulo||"")}</span>
    </div>
    <div class="ck-pr-box larga">
      <div class="ck-pr-h">
        ${p.origem==="historico"
          ?`<h2>${esc(p.modeloTitulo||"Relatório do mês")}</h2>
            <span class="ck-pr-cont">${esc(brDate(p.concluidoEm||p.criadoEm||""))}
              <button class="ck-mini" onclick="ckMudarData('${p.uid}')" title="Mudar a data">📅</button></span>`
          :`<h2 data-txt="ck.fim.titulo">Responsável pela inspeção</h2>
            <span class="ck-pr-cont">${perg.length}/${perg.length}</span>`}
      </div>

      <div class="ck-kpis">
        ${p.origem==="historico"
          /* consolidação de ocorrências não tem percentual de conformidade — ver ckPDF */
          ?`<div class="ck-kpi"><b>${prog?prog.total:inc.length}</b><span>Pontos levantados</span></div>
            <div class="ck-kpi"><b class="ok">${prog?prog.feitos:0}</b><span>Resolvidos</span></div>
            <div class="ck-kpi"><b class="${prog&&prog.total-prog.feitos?"ruim":""}">${prog?prog.total-prog.feitos:0}</b><span>Em aberto</span></div>`
          :`<div class="ck-kpi"><b class="${nota.pct!=null&&nota.pct<70?"ruim":""}">${nota.pct!=null?String(nota.pct).replace(".",",")+"%":"—"}</b>
              <span data-txt="ck.kpi.nota">Nota</span>
              ${cls.rot?`<i class="ck-cls" style="color:${cls.cor}">${esc(cls.rot)}</i>`:""}</div>
            <div class="ck-kpi"><b class="${inc.length?"ruim":""}">${inc.length}</b><span data-txt="ck.kpi.inc">Inconformes</span></div>
            <div class="ck-kpi"><b>${Object.keys(p.respostas||{}).length}/${perg.length}</b><span data-txt="ck.kpi.resp">Respondidas</span></div>`}
      </div>

      ${prog&&prog.total?`<div class="ck-prog">
        <div class="bar"><span style="width:${Math.round(prog.feitos/prog.total*100)}%"></span></div>
        <b>${prog.feitos} de ${prog.total}</b> já resolvidos
        ${prog.feitos===prog.total?`<i class="ok">tudo resolvido ✓</i>`
          :`<i>${prog.total-prog.feitos} em aberto</i>`}
      </div>`:""}

      ${inc.length?`<div class="ck-pend">
        <b>${inc.length} ponto${inc.length===1?"":"s"} a corrigir.</b>
        ${inc.filter(c=>!((p.respostas||{})[c.chave]||{}).tratativa).length
          ?`<span>${inc.filter(c=>!((p.respostas||{})[c.chave]||{}).tratativa).length} ainda sem plano de ação — abra abaixo.</span>`
          :`<span>Todos já com plano de ação ✓</span>`}
      </div>`:""}

      <details class="ck-resumo"${inc.length?" open":""}><summary data-txt="ck.resumo">${
        prog&&prog.total?"O que precisa ser corrigido":txt("ck.resumo","Resumo das respostas")}</summary>
        ${(prog&&prog.total?inc:perg).map((c,i)=>{
          const q=c.q,r=(p.respostas||{})[c.chave]||{},ruim=ckRuim(q,r);
          /* pontos que vieram das manutenções dela: cada um com o seu "concluído" */
          const meus=(typeof ckItensDaResposta==="function")?ckItensDaResposta(r):[];
          return `<div class="ck-res-lin${ruim?" ruim":""}">
            <span class="n">${i+1}</span>
            <div class="tx"><b>${esc(q.titulo||"")}</b>
              ${c.area?`<span class="a">${ckIcoArea(c.area)} ${esc(c.area)}</span>`:""}
              <span class="v">${esc(ckValorTexto(q,r))}</span>
              ${meus.length?`<div class="ck-pontos">${meus.map(d=>{
                 const ok=d.status==="Concluído";
                 return `<label class="ck-ponto${ok?" ok":""}">
                   <input type="checkbox" ${ok?"checked":""}
                     onchange="ckPontoConcluir('${c.chave}','${d.uid}',this.checked)">
                   <span class="t">${esc(d.nc||"")}</span>
                   <em>${ok?"concluído":"pendente"}</em></label>`;}).join("")}</div>`
               :(r.comentario?`<span class="c">${esc(r.comentario)}</span>`:"")}
              ${(r.fotos||[]).length?`<span class="f">${r.fotos.length} foto(s)</span>`:""}
              ${ruim?`<button class="btn ghost sm" onclick="ckTratativa('${c.chave}')">${r.tratativa?"✎ Ver plano de ação":"⚠ Abrir plano de ação"}</button>`:""}
            </div></div>`;}).join("")}
      </details>

      ${p.status==="concluido"?`
        <div class="ck-assinado">
          <p><b data-txt="ck.assinadopor">Assinado por:</b> ${esc(p.respondente||"—")} · ${esc(brDate(p.concluidoEm||""))}</p>
          ${p.assinatura?`<img class="ck-assin-img" src="${p.assinatura}" alt="assinatura">`:""}
        </div>
        <div class="ck-pr-pe">
          <button class="btn ghost" onclick="ckSairPreench()"><span data-txt="ck.fechar2">Fechar</span></button>
          <button class="btn ghost" onclick="ckPDF('${p.uid}',true)" title="Item por item">📄 <span data-txt="ck.pdf2">Completo</span></button>
          <button class="btn" onclick="ckPDF('${p.uid}')">🖨 <span data-txt="ck.pdf">Relatório para a gerência</span></button>
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
  const m=ckAchar(p.modeloUid);
  if(CK_MODO==="lista"&&m&&ckTemAreas(m))return ckDesenhaLista();
  const n=m?ckExpandir(m,p).length:1;
  p.posicao=Math.max(0,n-1);await ckSalvar(p);ckDesenhaPasso();
}
async function ckConcluir(){
  const p=ckAchar(CK_PREENCH);if(!p)return;
  const m=ckAchar(p.modeloUid);const perg=m?ckExpandir(m,p):[];
  /* No modo lista a validação de comentário/foto obrigatórios NÃO passou pelo wizard.
     Varre tudo aqui — senão dá para concluir com inconformidade sem explicação. */
  const erros=[];
  for(const c of perg){
    const r=(p.respostas||{})[c.chave]||{};
    if(r.valor===undefined&&!r.na)continue;      /* em branco é tratado logo abaixo */
    const e=ckValidar(c.q,r);
    if(e&&!/Responda a pergunta/.test(e))
      erros.push("· "+(c.q.titulo||"")+(c.area?" ["+c.area+"]":""));
  }
  if(erros.length){
    alert("Faltam informações obrigatórias em "+erros.length+" resposta(s):\n\n"
      +erros.slice(0,8).join("\n")+(erros.length>8?"\n…":"")
      +"\n\nAbra cada uma e escreva o comentário (ou anexe a foto) antes de concluir.");
    return;
  }
  const faltam=perg.filter(c=>{const r=(p.respostas||{})[c.chave]||{};
    return !r.na&&(r.valor===undefined||r.valor==="")&&c.q.tipoResp!=="texto";});
  if(faltam.length&&!confirm(faltam.length+" pergunta(s) ficaram sem resposta.\n\nConcluir mesmo assim?\n\n"
    +faltam.slice(0,5).map(c=>"· "+(c.q.titulo||"")+(c.area?" ["+c.area+"]":"")).join("\n")))return;
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
/* a chave é "uid" ou "uid@Área" — devolve a célula correspondente */
function ckCelula(p,chave){
  const m=ckAchar(p.modeloUid);if(!m)return null;
  return ckExpandir(m,p).find(c=>c.chave===chave)||null;
}
function ckTratativa(chave){
  const p=ckAchar(CK_PREENCH);if(!p)return;
  const m=ckAchar(p.modeloUid);if(!m)return;
  const cel=ckCelula(p,chave);
  const q=cel?cel.q:ckPerguntas(m).find(x=>x.uid===chave);if(!q)return;
  const area=cel?cel.area:"";
  const qUid=chave;
  const r=(p.respostas||{})[chave]||{},t=r.tratativa||{};
  /* "Onde será feito?" já vem com a área da inspeção — ela não redigita */
  if(!t.onde&&area)t.onde=area;
  ncModal(`<h2 data-txt="ck.trat.titulo">Tratativas</h2>
    <p class="ck-trat-perg"><b>${esc(q.titulo||"")}</b>${q.descricao?`<br><span class="desc">${esc(q.descricao)}</span>`:""}
      ${q.baseLegal?`<br><span class="ck-legal">§ ${esc(q.baseLegal)}</span>`:""}</p>
    <div class="ck-trat">
      <label data-txt="ck.trat.com">Comentários</label>
      <textarea id="tr-com" rows="2" data-txt-ph="ck.trat.comph" placeholder="Descreva o ocorrido">${esc(t.comentario||r.comentario||"")}</textarea>

      <p class="ck-trat-sub" data-txt="ck.trat.plano">Plano de ação:</p>
      <label class="obg" data-txt="ck.trat.oque">O que deve ser feito? *</label>
      <textarea id="tr-oque" rows="2" data-txt-ph="ck.trat.oqueph" placeholder="O que deve ser feito?">${esc(t.oque||q.acaoPadrao||"")}</textarea>
      ${!t.oque&&q.acaoPadrao?`<p class="ck-trat-dica" data-txt="ck.trat.sugerida">A ação corretiva acima já veio preenchida pela exigência legal. Mude à vontade.</p>`:""}

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
async function ckTratativaSalvar(chave){
  const qUid=chave;
  const p=ckAchar(CK_PREENCH);if(!p)return;
  const cel=ckCelula(p,chave);
  const v=id=>(document.getElementById(id)?.value||"").trim();
  const t={comentario:v("tr-com"),oque:v("tr-oque"),quem:v("tr-quem"),prazo:v("tr-prazo"),
           porque:v("tr-porque"),onde:v("tr-onde"),como:v("tr-como"),custo:v("tr-custo")};
  if(!t.oque){alert("Escreva o que deve ser feito.");return;}
  if(!t.quem){alert("Escolha quem poderia resolver.");return;}
  const r=(p.respostas=p.respostas||{})[qUid]=(p.respostas[qUid]||{fotos:[]});
  if(t.comentario)r.comentario=t.comentario;

  const m=ckAchar(p.modeloUid);
  const q=cel?cel.q:(m?ckPerguntas(m).find(x=>x.uid===qUid):null);
  const extras=[t.porque?"Por quê: "+t.porque:"",t.custo?"Custo estimado: "+t.custo:"",
    t.comentario?"Ocorrido: "+t.comentario:"",
    "Origem: checklist \""+(p.modeloTitulo||"")+"\" de "+brDate(p.criadoEm||today()),
    q?"Pergunta: "+(q.titulo||""):"",
    q&&q.baseLegal?"Base legal: "+q.baseLegal:""].filter(Boolean).join(" · ");

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
  /* já nasce ligada à pergunta: da próxima inspeção ela aparece como prova ali */
  if(q)dem.perguntaRef=q.uid;
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
/* O DOCUMENTO. É o que ela entrega ao gerente — tem o nome dela em cima.
   Regra que ela deu: RESUMO + SÓ OS PROBLEMAS. Sem poluição.
   Quem quiser o checklist item a item usa o botão "completo" (ckPDF(uid,true)). */
function ckPDF(uid,completo){
  const p=ckAchar(uid)||ckAchar(CK_PREENCH);if(!p)return;
  const m=ckAchar(p.modeloUid);
  const cel=m?ckExpandir(m,p):[];
  const nota=p.nota||ckNota(p);
  const inc=ckInconformes(p);
  const cls=(typeof ckClassifica==="function")?ckClassifica(nota.pct):{rot:"",cor:"#1d6b57",grupo:""};
  const prog=(typeof ckProgressoPontos==="function")?ckProgressoPontos(p):null;
  const hist=p.origem==="historico";
  const loja=nomeCurto((empresa(p.loja)||{}).name||p.loja||"");
  const quem=p.respondente||RT_INFO||RT_DEFAULT;
  /* o nome dela vem antes do "·" do CRN — o documento é assinado por ela */
  const nome=String(quem).split("·")[0].replace(/\(.*?\)/,"").trim()||quem;
  const cred=String(quem).includes("·")?String(quem).split("·").slice(1).join("·").trim():"";
  const cargo=(String(quem).match(/\(([^)]+)\)/)||[])[1]||"Responsável Técnica";

  /* ---- conformidade por seção ---- */
  const secs=[];
  for(const c of cel){
    if(c.q.peso===0)continue;
    const s=c.q.secao||"Geral";
    let g=secs.find(x=>x.s===s);
    if(!g){g={s,itens:[]};secs.push(g);}
    g.itens.push(c);
  }
  /* SÓ os assuntos com ocorrência, do pior para o melhor. Os limpos viram UMA linha —
     listar 13 seções "100%" é exatamente a poluição que ela não quer no documento. */
  const avaliadas=secs.map(g=>({...g,n:ckNotaDe(p,g.itens),
      ruins:g.itens.filter(c=>ckRuim(c.q,(p.respostas||{})[c.chave])).length}))
    .filter(g=>g.n.total>0);
  const comProblema=avaliadas.filter(g=>g.ruins).sort((a,b)=>a.n.pct-b.n.pct);
  const limpas=avaliadas.filter(g=>!g.ruins);
  const barras=comProblema.map(g=>{
    const cl=ckClassifica(g.n.pct);
    return `<tr><td class="s">${esc(g.s)}</td>
      <td class="bar"><span style="width:${g.n.pct}%;background:${cl.cor}"></span></td>
      <td class="pc" style="color:${cl.cor}">${String(g.n.pct).replace(".",",")}%</td>
      <td class="nn"><b>${g.ruins}</b></td></tr>`;}).join("")
   +(limpas.length?`<tr class="ok"><td class="s">${limpas.length} assunto${limpas.length===1?"":"s"} sem nenhuma ocorrência</td>
      <td class="bar"><span style="width:100%;background:#12b76a"></span></td>
      <td class="pc" style="color:#12b76a">100%</td><td class="nn">—</td></tr>`:"");

  /* ---- os problemas, agrupados por área ---- */
  const porArea={};
  for(const c of inc)(porArea[c.area||""]=porArea[c.area||""]||[]).push(c);
  const areasOrd=Object.keys(porArea).sort((a,b)=>(a?1:-1)-(b?1:-1)||a.localeCompare(b,"pt-BR"));
  let nProb=0;
  const problemas=areasOrd.map(a=>`
    <div class="area">
      <h3>${a?esc(a):"Geral da loja"}<span>${porArea[a].length} ponto${porArea[a].length===1?"":"s"}</span></h3>
      ${porArea[a].map(c=>{
        const q=c.q,r=(p.respostas||{})[c.chave]||{},t=r.tratativa||{};
        const acao=t.oque||q.acaoPadrao||"";
        const meus=(typeof ckItensDaResposta==="function")?ckItensDaResposta(r):[];
        const todosOk=meus.length&&meus.every(d=>d.status==="Concluído");
        nProb++;
        return `<div class="p${todosOk?" ok":""}">
          <div class="ph"><span class="n">${nProb}</span><b>${esc(q.titulo||"")}</b>
            ${todosOk?`<span class="sel">RESOLVIDO</span>`:""}</div>
          ${meus.length?`<ul class="pts">${meus.map(d=>
             `<li class="${d.status==="Concluído"?"ok":""}">${d.status==="Concluído"?"☑":"☐"} ${esc(d.nc||"")}</li>`).join("")}</ul>`
           :(r.comentario?`<p class="obs"><i>Observado:</i> ${esc(r.comentario)}</p>`:"")}
          ${(r.fotos||[]).length?`<div class="fotos">${r.fotos.map(f=>`<img src="${f}">`).join("")}</div>`:""}
          ${acao?`<p class="ac"><i>Ação corretiva:</i> ${esc(acao)}</p>`:""}
          ${(t.quem||t.prazo)?`<p class="resp">${t.quem?`<b>Responsável:</b> ${esc(t.quem)}`:""}${t.prazo?`   <b>Prazo:</b> ${brDate(t.prazo)}`:""}${t.custo?`   <b>Custo estimado:</b> ${esc(t.custo)}`:""}</p>`:""}
          ${q.baseLegal?`<p class="lg">${esc(q.baseLegal)}</p>`:""}
        </div>`;}).join("")}
    </div>`).join("");

  /* ---- apêndice: o checklist inteiro (só no modo completo) ---- */
  const apendice=!completo?"":`
    <h2 class="tit">Checklist completo</h2>
    <table class="full"><thead><tr><th>Item</th><th>Área</th><th>Resposta</th></tr></thead><tbody>
    ${cel.filter(c=>c.q.peso!==0).map(c=>{
      const r=(p.respostas||{})[c.chave]||{},ruim=ckRuim(c.q,r);
      return `<tr class="${ruim?"r":""}"><td>${esc(c.q.titulo||"")}</td>
        <td class="ar">${esc(c.area||"—")}</td>
        <td class="rs">${esc(ckValorTexto(c.q,r))}</td></tr>`;}).join("")}
    </tbody></table>`;

  /* resumo em TEXTO — é o que vai no WhatsApp e no corpo do e-mail */
  const dataBR=brDate(p.concluidoEm||p.criadoEm||today());
  const resumoTxt=[
    "*"+(hist?(p.modeloTitulo||"Relatório do mês"):"Relatório de Infraestrutura e Manutenção")+"*",
    loja+" — "+dataBR,
    ""
  ].concat(hist
    ?["Pontos levantados: *"+(prog?prog.total:inc.length)+"*",
      "Já resolvidos: *"+(prog?prog.feitos:0)+"*   |   Em aberto: *"+(prog?prog.total-prog.feitos:0)+"*",
      (p.areas&&p.areas.length?"Áreas: "+p.areas.length:""),""].filter(x=>x!==null)
    :["Conformidade: *"+(nota.pct!=null?String(nota.pct).replace(".",",")+"%":"—")+"* ("+cls.rot+")",
      "Pontos a corrigir: *"+inc.length+"*",
      "Itens avaliados: "+nota.total+(p.areas&&p.areas.length?"  |  Áreas visitadas: "+p.areas.length:""),""])
  .concat(inc.length?["*"+(hist?"Não conformidades levantadas:":"O que precisa ser corrigido:")+"*"].concat(
    inc.slice(0,15).map((c,i)=>{
      const r=(p.respostas||{})[c.chave]||{},t=r.tratativa||{};
      const meus=(typeof ckItensDaResposta==="function")?ckItensDaResposta(r):[];
      return (i+1)+". "+(c.area?"["+c.area+"] ":"")+(c.q.titulo||"")
        +(meus.length?meus.map(d=>"\n   "+(d.status==="Concluído"?"[OK]":"[  ]")+" "+(d.nc||"")).join("")
                     :(r.comentario?"\n   → "+r.comentario:""))
        +(t.prazo?"\n   Prazo: "+brDate(t.prazo):"");}),
    inc.length>15?["… e mais "+(inc.length-15)+" ponto(s). O detalhe completo está no PDF."]:[])
   :["Nenhuma não conformidade encontrada nesta inspeção."])
   .concat(["","Base: RDC 216/2004 e RDC 275/2002 (Anexo II)",nome+(cred?" — "+cred:"")])
   .join("\n");
  /* PDF DE VERDADE, gerado aqui (js/pdflite.js). É ele que vai anexado no WhatsApp —
     pedido dela. Se algo falhar, a barra cai no print do navegador, que sempre funciona. */
  let pdfURL="",nomePDF="";
  try{
    if(typeof ckRelPDF==="function"){
      pdfURL=URL.createObjectURL(ckRelPDF(p));
      nomePDF=ckNomeArquivoPDF(p);
    }
  }catch(e){console.warn("PDF:",e);}

  const w=window.open("");
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
  <title>Relatório de Infraestrutura — ${esc(loja)} — ${esc(dataBR)}</title><style>
  @page{margin:15mm 14mm 18mm}
  *{box-sizing:border-box}
  body{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#22242e;font-size:11.5px;
       margin:0;line-height:1.45;-webkit-print-color-adjust:exact;print-color-adjust:exact}

  /* ---- cabeçalho: a marca dela ---- */
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

  /* ---- placar ---- */
  .placar{display:flex;gap:11px;margin-bottom:18px;page-break-inside:avoid}
  .nota{flex:0 0 auto;border:2px solid ${cls.cor};border-radius:12px;padding:12px 20px;text-align:center;min-width:132px}
  .nota b{display:block;font-size:33px;font-weight:700;color:${cls.cor};line-height:1}
  .nota .cl{font-size:12px;font-weight:650;color:${cls.cor};margin-top:3px}
  .nota .gr{font-size:8.5px;color:#8a8b96;text-transform:uppercase;letter-spacing:.7px;margin-top:2px}
  .mini{flex:1;display:flex;gap:9px}
  .m{flex:1;border:1px solid #e4e6ea;border-radius:10px;padding:10px 12px}
  .m b{display:block;font-size:21px;font-weight:650;line-height:1.1}
  .m span{font-size:9px;color:#8a8b96;text-transform:uppercase;letter-spacing:.6px}
  .m.al b{color:#c0212a}
  .m b.vd{color:#12b76a}
  .progr{margin:-6px 0 16px;font-size:10.5px;color:#6b7280}
  .progr .bb{background:#eceef0;border-radius:4px;height:7px;overflow:hidden;margin-bottom:5px}
  .progr .bb span{display:block;height:7px;background:#12b76a;border-radius:4px}
  .progr b{color:#22242e}
  .nota-hist{font-size:9.5px;color:#8a8b96;font-style:italic;margin:-8px 0 16px;line-height:1.5}
  .p.ok{border-left-color:#12b76a;background:#f6fdf9}
  .p .sel{font-size:8.5px;font-weight:700;color:#0d8a52;background:#d1fae5;
    border-radius:4px;padding:2px 7px;letter-spacing:.5px}
  ul.pts{margin:6px 0 0 23px;padding:0;list-style:none}
  ul.pts li{font-size:10.8px;color:#3f4149;margin-bottom:2px}
  ul.pts li.ok{color:#0d8a52;text-decoration:line-through;opacity:.75}

  h2.tit{font-size:12px;text-transform:uppercase;letter-spacing:1.3px;color:#17756a;
         margin:22px 0 9px;padding-bottom:5px;border-bottom:1.5px solid #d9e2df}

  /* ---- tabela de seções ---- */
  table.sec{width:100%;border-collapse:collapse}
  table.sec td{padding:4.5px 0;vertical-align:middle;border-bottom:1px solid #f0f1f3}
  table.sec .s{font-size:11px;width:38%;padding-right:12px}
  table.sec .bar{width:auto}
  table.sec .bar span{display:block;height:7px;border-radius:4px;min-width:2px}
  table.sec .bar{background:#f0f1f3;border-radius:4px;height:7px;overflow:hidden}
  table.sec .pc{width:52px;text-align:right;font-weight:650;font-size:11px;padding-left:10px}
  table.sec .nn{width:42px;text-align:right;font-size:10.5px;color:#c0212a}
  table.sec tr.ok .s{color:#6b7280;font-style:italic}
  .ars{display:flex;flex-wrap:wrap;gap:6px}
  .ar{border:1px solid #dfe2e6;border-left-width:3px;border-radius:7px;padding:4px 10px;font-size:10.5px}
  .ar b{margin-left:7px;font-size:11px}
  .nota.lev{border-color:#17756a}
  .nota.lev b{color:#17756a;font-size:36px}
  .nota.lev .cl{color:#17756a}
  .legenda{font-size:9px;color:#9aa0a8;margin-top:5px;font-style:italic}

  /* ---- os problemas ---- */
  .area{margin-bottom:14px;page-break-inside:avoid}
  .area h3{font-size:12.5px;margin:0 0 7px;padding:5px 10px;background:#eef3f1;border-radius:7px;
           color:#0f5b52;display:flex;justify-content:space-between;align-items:center}
  .area h3 span{font-size:9.5px;font-weight:500;color:#5b7a72;text-transform:uppercase;letter-spacing:.5px}
  .p{border-left:3px solid #c0212a;background:#fffafa;border-radius:0 8px 8px 0;
     padding:8px 11px;margin-bottom:6px;page-break-inside:avoid}
  .ph{display:flex;gap:8px;align-items:baseline}
  .ph .n{font-size:9.5px;color:#c0212a;font-weight:700;min-width:15px}
  .ph b{font-size:11.5px;font-weight:600;flex:1}
  .p p{margin:5px 0 0 23px;font-size:10.8px}
  .p i{font-style:normal;font-weight:650;color:#6b7280}
  .obs{color:#3f4149}
  .ac{background:#eef6f2;border-radius:6px;padding:5px 9px;color:#14584a}
  .ac i{color:#17756a}
  .resp{color:#3f4149;font-size:10.3px}
  .lg{color:#9aa0a8;font-size:9.2px;font-style:italic}
  .fotos{margin:6px 0 0 23px;display:flex;gap:6px;flex-wrap:wrap}
  .fotos img{max-width:138px;max-height:104px;border-radius:6px;border:1px solid #e4e6ea}
  .limpo{background:#eef6f2;border-radius:10px;padding:16px 18px;color:#14584a;font-size:12px}

  /* ---- apêndice ---- */
  table.full{width:100%;border-collapse:collapse;font-size:10px}
  table.full th{text-align:left;padding:5px 7px;background:#f4f5f7;color:#6b7280;
                font-size:9px;text-transform:uppercase;letter-spacing:.5px}
  table.full td{padding:4px 7px;border-bottom:1px solid #f0f1f3;vertical-align:top}
  table.full .ar{color:#8a8b96;width:22%}
  table.full .rs{width:15%;font-weight:600}
  table.full tr.r .rs{color:#c0212a}

  /* ---- assinaturas ---- */
  .ass{display:flex;gap:40px;margin-top:34px;page-break-inside:avoid}
  .ass div{flex:1}
  .ass img{max-height:52px;display:block;margin-bottom:-6px}
  .linha{border-bottom:1px solid #22242e;height:46px}
  .rot{font-size:10px;color:#6b7280;margin-top:5px;line-height:1.5}
  .rot b{color:#22242e;font-weight:600}
  .pe{margin-top:22px;padding-top:9px;border-top:1px solid #eceef0;
      font-size:8.8px;color:#9aa0a8;line-height:1.6}
  /* barra de opções — some na impressão */
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
    <button onclick="email()">✉️ E-mail</button>
    <button onclick="window.print()">🖨 Imprimir</button>
    <button onclick="copiar()">📋 Copiar o texto</button>
    <span class="dica" id="dica">O WhatsApp abre com o <b>PDF anexado e o texto pronto</b> — você lê e confere antes de enviar.</span>
  </div>

  <script>
  var RESUMO=${JSON.stringify(resumoTxt)};
  var PDFURL=${JSON.stringify(pdfURL)};
  var ARQPDF=${JSON.stringify(nomePDF||"Relatorio.pdf")};
  var ASSUNTO=${JSON.stringify("Relatório de Infraestrutura e Manutenção — "+loja+" — "+dataBR)};

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
    /* CELULAR: abre a folha de compartilhar com o PDF JUNTO. O WhatsApp mostra a prévia
       com o anexo e o texto — ela lê e só então aperta enviar. Nada sai sozinho. */
    arquivoPDF().then(function(f){
      if(f&&navigator.canShare&&navigator.canShare({files:[f]})){
        navigator.share({files:[f],text:RESUMO,title:ASSUNTO}).catch(function(){});
        return;
      }
      /* COMPUTADOR: o navegador não deixa anexar arquivo no WhatsApp Web sozinho.
         Então baixo o PDF e abro a conversa com o texto pronto, para ela arrastar. */
      if(PDFURL)baixar();
      var d=document.getElementById("dica");
      if(d)d.innerHTML="<b>PDF baixado.</b> O WhatsApp vai abrir com o texto pronto — "
        +"arraste o PDF da pasta de downloads para a conversa e confira antes de enviar.";
      setTimeout(function(){
        window.open("https://web.whatsapp.com/send?text="+encodeURIComponent(RESUMO),"_blank");
      },700);
    });
  }
  function email(){
    if(PDFURL)baixar();
    location.href="mailto:?subject="+encodeURIComponent(ASSUNTO)+"&body="+encodeURIComponent(RESUMO);
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
    <div class="et">${hist?"Relatório mensal":"Relatório de inspeção"}</div>
    <h1>Infraestrutura e Manutenção</h1>
    <div class="loja">${esc(loja)}</div>
    <div class="rt">
      <div><div class="nm">${esc(nome)}</div>
        <div class="cg">${esc(cargo)}${cred?" · "+esc(cred):""}</div></div>
      <div class="dt">${hist?"Levantamento consolidado em":"Inspeção realizada em"}<br><b>${esc(dataBR)}</b></div>
    </div>
  </div>

  <div class="placar">
    ${hist
      /* CONSOLIDAÇÃO DE OCORRÊNCIAS: aqui NÃO existe percentual de conformidade.
         A nota pressupõe ter avaliado tudo; como só entraram as ocorrências, ela daria
         perto de 0% e faria a loja parecer péssima. Seria enganoso CONTRA ela. */
      ?`<div class="nota lev"><b>${prog?prog.total:inc.length}</b>
          <div class="cl">pontos levantados</div><div class="gr">no período</div></div>
        <div class="mini">
          <div class="m"><b class="vd">${prog?prog.feitos:0}</b><span>Já resolvidos</span></div>
          <div class="m${prog&&prog.total-prog.feitos?" al":""}"><b>${prog?prog.total-prog.feitos:0}</b><span>Em aberto</span></div>
          <div class="m"><b>${(p.areas||[]).length||"—"}</b><span>Áreas</span></div>
        </div>`
      :`<div class="nota"><b>${nota.pct!=null?String(nota.pct).replace(".",",")+"%":"—"}</b>
          <div class="cl">${esc(cls.rot)}</div>${cls.grupo?`<div class="gr">${esc(cls.grupo)}</div>`:""}</div>
        <div class="mini">
          <div class="m${inc.length?" al":""}"><b>${inc.length}</b><span>A corrigir</span></div>
          <div class="m"><b>${nota.total}</b><span>Itens avaliados</span></div>
          <div class="m"><b>${(p.areas||[]).length||"—"}</b><span>Áreas visitadas</span></div>
        </div>`}
  </div>
  ${prog&&prog.total?`<div class="progr"><div class="bb"><span style="width:${Math.round(prog.feitos/prog.total*100)}%"></span></div>
    <b>${prog.feitos} de ${prog.total} pontos já resolvidos</b> · ${prog.total-prog.feitos} em aberto</div>`:""}
  ${hist?`<p class="nota-hist">Este documento consolida as não conformidades de infraestrutura
    levantadas no período, classificadas segundo a lista de verificação das boas práticas.
    Por reunir as ocorrências registradas, e não uma avaliação item a item de toda a unidade,
    <b>não se aplica percentual de conformidade</b> a esta consolidação.</p>`:""}

  ${hist
    /* na consolidação, o que interessa é ONDE se concentram os pontos, não a nota */
    ?(()=>{const porSec={};
       for(const c of inc){const s=c.q.secao||"Geral";
         const n=((p.respostas||{})[c.chave]||{}).itens;
         porSec[s]=(porSec[s]||0)+((n&&n.length)||1);}
       const ord=Object.keys(porSec).sort((a,b)=>porSec[b]-porSec[a]);
       const max=Math.max(...Object.values(porSec),1);
       return ord.length?`<h2 class="tit">Onde estão os pontos</h2>
         <table class="sec"><tbody>${ord.map(s=>
           `<tr><td class="s">${esc(s)}</td>
             <td class="bar"><span style="width:${Math.round(porSec[s]/max*100)}%;background:#17756a"></span></td>
             <td class="pc" style="color:#17756a">${porSec[s]}</td><td class="nn"></td></tr>`).join("")}
         </tbody></table>`:"";})()
    :(barras?`<h2 class="tit">Conformidade por assunto</h2>
      <table class="sec"><tbody>${barras}</tbody></table>`:"")}
  ${(p.areas||[]).length?`<h2 class="tit">${hist?"Áreas com ocorrência":"Áreas visitadas"}</h2>
    <div class="ars">${(p.areas||[]).map(a=>{
      const naArea=cel.filter(c=>c.area===a&&ckRuim(c.q,(p.respostas||{})[c.chave]));
      if(hist){
        let n=0,ok=0;
        for(const c of naArea)for(const d of ckItensDaResposta((p.respostas||{})[c.chave])){
          n++;if(d.status==="Concluído")ok++;}
        if(!n)return "";
        const tudo=ok===n;
        return `<span class="ar" style="border-color:${tudo?"#12b76a":"#c0212a"}">${esc(a)}
          <b style="color:${tudo?"#12b76a":"#c0212a"}">${ok}/${n}</b></span>`;
      }
      const nt=ckNotaDe(p,cel.filter(c=>c.area===a)),cl=ckClassifica(nt.pct);
      return `<span class="ar"${naArea.length?` style="border-color:${cl.cor}"`:""}>${esc(a)}
        <b style="color:${naArea.length?cl.cor:"#12b76a"}">${nt.pct!=null?String(nt.pct).replace(".",",")+"%":"—"}</b></span>`;}).join("")}
    </div>${hist?`<p class="legenda">resolvidos / total de pontos por área</p>`:""}`:""}

  <h2 class="tit">${inc.length?(hist?"Não conformidades levantadas":"Pontos a corrigir"):"Resultado"}</h2>
  ${inc.length?problemas:`<div class="limpo"><b>Nenhuma não conformidade encontrada nesta inspeção.</b><br>
    Todos os itens avaliados estão de acordo com os requisitos verificados.</div>`}

  ${apendice}

  <div class="ass">
    <div>${p.assinatura?`<img src="${p.assinatura}">`:`<div class="linha"></div>`}
      <div class="rot"><b>${esc(nome)}</b><br>${esc(cargo)}${cred?"<br>"+esc(cred):""}</div></div>
    <div><div class="linha"></div>
      <div class="rot"><b>Ciente — Gerência</b><br>Nome e assinatura<br>Data: ____/____/______</div></div>
  </div>

  <div class="pe">
    Documento gerado a partir da lista de verificação de boas práticas · Base normativa:
    RDC ANVISA nº 216/2004 (Boas Práticas para Serviços de Alimentação) e RDC ANVISA nº 275/2002,
    Anexo II (Lista de Verificação das Boas Práticas de Fabricação).
    ${hist?"":"Classificação percentual conforme Saccol <i>et al.</i> (2006)."}
    ${esc(loja)} · ${esc(brDate(p.concluidoEm||p.criadoEm||today()))}
  </div>
  </body></html>`);
  w.document.close();
  /* NÃO chama print() sozinho: agora a barra tem Baixar / WhatsApp / E-mail, e abrir a
     janela de impressão por cima esconde essas opções antes dela ver que existem. */
}
