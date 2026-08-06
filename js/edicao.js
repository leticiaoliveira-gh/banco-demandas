/* ===================================================================
   MODO DE EDIÇÃO TOTAL — 05/08/2026
   Pedido dela: "autonomia total de gerenciamento no futuro, sem alterar
   o design". Então aqui NÃO existe cor, medida, fonte ou sombra nova:
   só comportamento, e só enquanto o modo de edição está ligado.

   O que este arquivo acrescenta, por cima do que o site já tinha:
     · arrastar o CARD INTEIRO (antes só pela alça ⠿, que ela nunca
       conseguiu pegar) — com a SortableJS, que mora em js/lib/;
     · esconder um card do Sumário, com volta garantida (nada é apagado);
     · a ordem e os escondidos gravados por metaSetU → entram no desfazer
       e sobem para a nuvem, chegando ao celular.

   REDE DE PROTEÇÃO: se a SortableJS não carregar (arquivo removido,
   navegador antigo), este arquivo desiste em silêncio e o site continua
   inteiro, com o arraste por alça de sempre. Nada do que funcionava foi
   apagado.
   =================================================================== */

let HUB_CFG={ordem:[],escondidos:[]},HUB_CFG_MOD="";
let EDICAO_SORT=[];

async function loadHubCfg(){
  const c=await metaGet("hubCfg");
  HUB_CFG={ordem:(c&&c.ordem)||[],escondidos:(c&&c.escondidos)||[]};
  HUB_CFG_MOD=await metaGet("hubCfgMod")||"";
}
async function salvarHubCfg(){
  HUB_CFG_MOD=nowISO();
  await metaSetU("hubCfg",HUB_CFG);
  await metaSetU("hubCfgMod",HUB_CFG_MOD);
  if(window.dataChanged)dataChanged();
}

/* a ordem que ela arrastou vence a de fábrica; card escondido sai da lista */
function hubVisiveis(lista){
  const ord=HUB_CFG.ordem||[],esc=HUB_CFG.escondidos||[];
  const ordenada=[...ord.filter(t=>lista.includes(t)),...lista.filter(t=>!ord.includes(t))];
  return ordenada.filter(t=>!esc.includes(t));
}
function hubEscondidos(lista){return lista.filter(t=>(HUB_CFG.escondidos||[]).includes(t));}

/* ---- ligar/desligar (chamado por toggleModoEdicao, em js/app.js) ---- */
function edicaoAplicar(ligado){
  document.body.classList.toggle("editando-cards",!!ligado);
  edicaoSoltarTudo();
  if(!ligado){edicaoTirarControles();return;}
  edicaoPorControles();
  if(typeof Sortable==="undefined")return;   /* sem a biblioteca: segue o de sempre */
  const hub=document.getElementById("hub-grid");
  if(hub&&document.getElementById("view-hub")?.style.display==="block")
    EDICAO_SORT.push(new Sortable(hub,{
      animation:160,ghostClass:"card-fantasma",chosenClass:"card-pego",
      /* forceFallback: o mesmo gesto no computador e no celular. Sem isso o
         Windows usa o arraste nativo dele, que se comporta diferente do toque
         — e era justamente o "não consigo arrastar" dela. */
      forceFallback:true,fallbackTolerance:4,
      delay:120,delayOnTouchOnly:true,   /* rolar a tela com o dedo continua rolando */
      onEnd:async()=>{
        HUB_CFG.ordem=[...hub.querySelectorAll("[data-hub]")].map(e=>e.dataset.hub);
        await salvarHubCfg();
        toast("Ordem dos quadros salva ✓");
      }}));
  const emp=document.getElementById("store-list");
  if(emp&&document.getElementById("view-home")?.style.display!=="none")
    EDICAO_SORT.push(new Sortable(emp,{
      animation:160,ghostClass:"card-fantasma",chosenClass:"card-pego",
      /* forceFallback: o mesmo gesto no computador e no celular. Sem isso o
         Windows usa o arraste nativo dele, que se comporta diferente do toque
         — e era justamente o "não consigo arrastar" dela. */
      forceFallback:true,fallbackTolerance:4,
      draggable:".store-row",delay:120,delayOnTouchOnly:true,
      onEnd:async()=>{
        [...emp.querySelectorAll(".store-row[data-code]")].forEach((l,i)=>{
          const e=empresa(l.dataset.code);if(e)e.ordem=i;});
        await saveEmpresas();
        toast("Ordem das empresas salva ✓");
      }}));
}
function edicaoSoltarTudo(){
  EDICAO_SORT.forEach(s=>{try{s.destroy();}catch(e){}});
  EDICAO_SORT=[];
}

/* ---- os controles discretos, só no modo de edição ---- */
function edicaoTirarControles(){
  document.querySelectorAll(".card-ctrl,.escondidos-linha").forEach(e=>e.remove());
}
function edicaoPorControles(){
  edicaoTirarControles();
  const hub=document.getElementById("hub-grid");
  if(!hub||document.getElementById("view-hub")?.style.display!=="block")return;
  hub.querySelectorAll("[data-hub]").forEach(card=>{
    const t=card.dataset.hub;
    const b=document.createElement("span");
    b.className="card-ctrl";
    b.setAttribute("role","button");
    b.tabIndex=0;
    b.title="Esconder este quadro da tela (dá para trazer de volta)";
    b.textContent="✕";
    const acao=ev=>{ev.stopPropagation();ev.preventDefault();esconderCard(t);};
    b.onclick=acao;
    b.onkeydown=ev=>{if(ev.key==="Enter"||ev.key===" ")acao(ev);};
    card.appendChild(b);
  });
  const escondidos=hubEscondidos(ABAS_HUB());
  const linha=document.createElement("div");
  linha.className="escondidos-linha";
  linha.innerHTML=escondidos.length
    ? `<b>${escondidos.length} quadro${escondidos.length===1?"":"s"} escondido${escondidos.length===1?"":"s"}:</b> `
      +escondidos.map(t=>`<button class="btn ghost sm" data-voltar="${t}">${esc(rotuloAba(t))} · trazer de volta</button>`).join(" ")
    : `Nenhum quadro escondido. O <b>✕</b> no canto do card esconde — e ele volta por aqui.`;
  linha.querySelectorAll("[data-voltar]").forEach(b=>b.onclick=()=>mostrarCard(b.dataset.voltar));
  hub.parentNode.insertBefore(linha,hub.nextSibling);
}

/* ---- esconder e trazer de volta: NADA é apagado ---- */
async function esconderCard(t){
  if(!HUB_CFG.escondidos.includes(t))HUB_CFG.escondidos.push(t);
  await salvarHubCfg();
  renderHub();edicaoPorControles();edicaoAplicar(true);
  toast(rotuloAba(t)+" escondido — seus dados continuam lá. A seta ← desfaz.");
}
async function mostrarCard(t){
  HUB_CFG.escondidos=HUB_CFG.escondidos.filter(x=>x!==t);
  await salvarHubCfg();
  renderHub();edicaoPorControles();edicaoAplicar(true);
  toast(rotuloAba(t)+" de volta ✓");
}
