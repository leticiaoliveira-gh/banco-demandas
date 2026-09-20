/* ===== AVISO DE DEMANDA PARADA (19/09) ====================================
   O site avisa sozinho quando uma demanda ficou tempo demais sem ninguém
   mexer, em vez de ela ter que lembrar de procurar.

   "Parada" é medido pela última mexida na demanda (o campo mod), que é o
   mesmo relógio que faz a demanda viajar entre os aparelhos. Registrar,
   trocar o responsável, anotar, anexar foto: tudo isso zera a contagem.

   O prazo começa em 30 dias e é ELA quem muda, ali mesmo na janela do
   aviso. Nada é apagado, nada muda de lugar sozinho: o aviso só conta e
   mostra, em ordem, quem está parada há mais tempo.                      */

const PARADA_PADRAO = 30;
let   PARADA_DIAS   = PARADA_PADRAO;

async function paradaCarregar(){
  try{
    const v=await metaGet("paradaDias");
    if(typeof v==="number"&&v>=1&&v<=365)PARADA_DIAS=v;
  }catch(e){}
}
async function paradaSalvarDias(n){
  n=Math.max(1,Math.min(365,Number(n)||PARADA_PADRAO));
  PARADA_DIAS=n;
  await metaSetU("paradaDias",n);          /* metaSetU: o desfazer pega */
  if(typeof dataChanged==="function")dataChanged();
  paradaPintarJanela();
  if(typeof renderMnt28==="function"&&currentTab==="mnt28")renderMnt28();
  if(typeof renderCompras==="function"&&currentTab==="compras")renderCompras();
}

/* ------------------------------------------------------------ quem conta */
const PARADA_TIPOS={mnt:1, mnt28:1, cmp:1, dg:1, nc:1};
const PARADA_PRONTO=/conclu|feito|pronto|comprad|instalad|entregue|recusad|cancelad|resolvid/i;

function paradaEncerrada(d){
  if(d.feito===true)return true;
  for(const k of ["status","situacao","sit","prioridade"]){
    if(d[k]&&PARADA_PRONTO.test(String(d[k])))return true;
  }
  return false;
}
function paradaQuantosDias(d){
  const t=Date.parse(d.mod||"");
  if(isNaN(t))return null;
  return Math.floor((Date.now()-t)/86400000);
}
/* tipo: "mnt28", "cmp"… Sem tipo, conta o quadro inteiro da empresa aberta. */
function paradaLista(tipo){
  if(typeof DATA==="undefined")return [];
  const loja=(typeof currentStore!=="undefined")?currentStore:null;
  return DATA.filter(d=>{
      if(!d||d.deleted)return false;
      if(!PARADA_TIPOS[d.tipo])return false;
      if(tipo&&d.tipo!==tipo)return false;
      if(loja&&d.loja!==loja)return false;
      if(paradaEncerrada(d))return false;
      const n=paradaQuantosDias(d);
      return n!==null&&n>=PARADA_DIAS;
    })
    .sort((a,b)=>paradaQuantosDias(b)-paradaQuantosDias(a));
}

/* ----------------------------------------------------- o selo de cada linha */
function paradaSelo(d){
  if(!d||d.deleted||paradaEncerrada(d))return "";
  const n=paradaQuantosDias(d);
  if(n===null||n<PARADA_DIAS)return "";
  /* a palavra vem sempre escrita: quem não distingue as cores lê o mesmo aviso */
  const grave=n>=PARADA_DIAS*1.5;
  return `<span class="bd-selo ${grave?"bd-selo-erro":"bd-selo-atencao"} prd-selo"><i></i>Parada há ${n} dias</span>`;
}

/* ------------------------------------------------------- a faixa do quadro */
function paradaFaixa(tipo){
  const l=paradaLista(tipo);
  if(!l.length)return "";
  const n=l.length;
  return `<div class="bd-aviso bd-aviso-atencao prd-faixa">
    <span class="bd-aviso-ico" aria-hidden="true">!</span>
    <div class="prd-faixa-txt">
      <strong>${n===1?"1 demanda está parada":n+" demandas estão paradas"} há mais de ${PARADA_DIAS} dias.</strong>
      <div>Ninguém mexeu ${n===1?"nela":"nelas"} nesse tempo todo.</div>
    </div>
    <button class="btn ghost sm prd-bt" onclick="paradaAbrir('${tipo||""}')">Ver as paradas</button>
  </div>`;
}

/* ----------------------------------------------------------- a janela dela */
let PARADA_TIPO_ABERTO="";

function paradaTexto(d){
  return String(d.fazer||d.oque||d.nc||d.acao||d.texto_bruto||d.titulo||"(item sem texto)").trim();
}
function paradaLinhas(){
  const l=paradaLista(PARADA_TIPO_ABERTO);
  if(!l.length){
    return `<div class="bd-vazio">
      <div class="bd-vazio-ico">👍</div>
      <div class="bd-vazio-tit">Nada parado por aqui</div>
      <div class="bd-vazio-txt">Toda demanda em aberto teve alguma mexida nos últimos ${PARADA_DIAS} dias.</div>
    </div>`;
  }
  return l.map(d=>{
    const onde=[d.area?String(d.area):"", d.piso?String(d.piso):"", d.executor?String(d.executor):""]
      .filter(Boolean).join(" · ");
    return `<div class="prd-linha">
      <div class="prd-txt"><strong>${esc(paradaTexto(d))}</strong>${onde?`<small>${esc(onde)}</small>`:""}
        <div class="prd-marca">${paradaSelo(d)}</div></div>
      <button class="btn ghost sm prd-relogio" onclick="histoAbrir(${d.id})"
        aria-label="Ver o histórico desta demanda" title="Ver a história desta demanda">🕘</button>
    </div>`;
  }).join("");
}
function paradaPintarJanela(){
  const alvo=document.getElementById("prd-lista");
  if(alvo)alvo.innerHTML=paradaLinhas();
  const c=document.getElementById("prd-dias-txt");
  if(c)c.textContent=PARADA_DIAS;
}
function paradaAbrir(tipo){
  if(typeof ncModal!=="function")return;
  PARADA_TIPO_ABERTO=tipo||"";
  ncModal(`<h2 style="margin-bottom:4px">⏳ Demandas paradas</h2>
    <p class="desc">Estão aqui as demandas em aberto que ninguém mexeu há
      <b id="prd-dias-txt">${PARADA_DIAS}</b> dias ou mais, das que estão paradas há mais tempo
      para as mais recentes. Nada é apagado nem muda de lugar.</p>
    <div class="prd-ajuste bd-grupo">
      <label class="bd-rotulo" for="prd-dias">Avisar a partir de quantos dias parada</label>
      <input class="bd-campo prd-dias" id="prd-dias" type="number" min="1" max="365" step="1"
        value="${PARADA_DIAS}" onchange="paradaSalvarDias(this.value)">
      <div class="bd-ajuda">Você escolhe. Começa em ${PARADA_PADRAO} dias.</div>
    </div>
    <div id="prd-lista" class="prd-lista"></div>
    <div class="form-actions"><button class="btn ghost" onclick="ncFechar()">Fechar</button></div>`);
  paradaPintarJanela();
}
