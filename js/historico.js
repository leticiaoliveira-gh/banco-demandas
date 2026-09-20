/* ===== HISTÓRICO DE CADA DEMANDA — a linha do tempo (19/09) ================
   Cada demanda passa a contar a própria história: quando nasceu, o que mudou
   e quando foi concluída. Serve de prova na hora de cobrar.

   Guarda desde o dia em que a demanda nasceu e NUNCA apaga: a linha do tempo
   viaja junto com a demanda (fica dentro dela, campo "h"), então vale no
   celular, no computador e no backup. Se a demanda for para a lixeira e
   voltar, a história volta inteira também.

   Nada aqui muda a demanda. Só anota o que já aconteceu.

   O nome "HIST" já é do desfazer (Ctrl+Z), por isso aqui tudo começa com
   "histo" — são coisas diferentes e não podem se misturar.            */

const HISTO_MAX   = 200;                       /* teto de segurança por demanda */
const HISTO_TIPOS = {mnt:1, mnt28:1, cmp:1, dg:1, nc:1};  /* quadros que têm linha do tempo */
let   HISTO_PAUSA = false;                     /* ligado durante sincronizar/importar */

/* -------------------------------------------------------- o que observamos */
const HISTO_CAMPOS = [
  {k:"fazer",     nome:"O texto"},
  {k:"oque",      nome:"O texto"},
  {k:"nc",        nome:"O texto"},
  {k:"acao",      nome:"A ação", f:true},
  {k:"titulo",    nome:"O título"},
  {k:"area",      nome:"A área", f:true,                curto:true},
  {k:"piso",      nome:"O piso",                curto:true},
  {k:"executor",  nome:"O responsável",         curto:true},
  {k:"status",    nome:"A situação", f:true,              curto:true},
  {k:"situacao",  nome:"A situação", f:true,            curto:true},
  {k:"prioridade",nome:"A prioridade", f:true,          curto:true},
  {k:"urgencia",  nome:"A urgência", f:true,            curto:true},
  {k:"qtd",       nome:"A quantidade", f:true,          curto:true},
  {k:"loja",      nome:"A empresa", f:true,             curto:true, empresa:true},
  {k:"obs",       nome:"A observação", f:true},
  {k:"nota",      nome:"O lembrete particular"},
  {k:"relato",    nome:"O relato"},
  {k:"link",      nome:"O link"}
];
const HISTO_BOOL = [
  {k:"feito",     sim:"Concluída.",                       nao:"Reaberta."},
  {k:"urg",       sim:"Marcada como urgente.",            nao:"Tirada de urgente."},
  {k:"verificar", sim:"Marcada para verificar na loja.",  nao:"Tirada de verificar."}
];

function histoValor(c, v){
  if(v===undefined||v===null||v==="")return "";
  if(c.empresa&&typeof EMPRESAS!=="undefined"&&Array.isArray(EMPRESAS)){
    const e=EMPRESAS.find(x=>x.code===v); if(e)return e.name;
  }
  return String(v);
}

/* compara o antes e o depois e devolve as frases do que mudou */
function histoDiferencas(antes, depois){
  const fr=[];
  if(!antes) return ["Registrada."];

  if(!antes.deleted && depois.deleted) return ["Excluída."];
  if(antes.deleted && !depois.deleted) return ["Restaurada."];

  for(const c of HISTO_CAMPOS){
    if(!(c.k in depois) && !(c.k in antes)) continue;
    const a=histoValor(c, antes[c.k]), b=histoValor(c, depois[c.k]);
    if(a===b) continue;
    const ado=c.f?"ada":"ado";                       /* alterada / alterado */
    if(!b){ fr.push(c.nome+" foi apag"+ado+"."); continue; }
    /* campo curto (área, responsável, situação) diz sempre o novo valor.
       Campo de escrever mostra o conteúdo quando cabe numa linha; quando é
       texto longo, diz só que mudou, senão a linha do tempo vira um paredão. */
    if(c.curto){ fr.push(c.nome+" passou para "+b+"."); continue; }
    if(b.length<=70){ fr.push(c.nome+(a?" foi alter"+ado+" para: ":" foi acrescent"+ado+": ")+b); continue; }
    fr.push(a ? c.nome+" foi alter"+ado+"." : c.nome+" foi acrescent"+ado+".");
  }
  for(const c of HISTO_BOOL){
    const a=!!antes[c.k], b=!!depois[c.k];
    if(a!==b) fr.push(b?c.sim:c.nao);
  }
  const na=Array.isArray(antes.fotos)?antes.fotos.length:0;
  const nb=Array.isArray(depois.fotos)?depois.fotos.length:0;
  if(nb>na) fr.push(nb-na===1?"Foto anexada.":(nb-na)+" fotos anexadas.");
  if(nb<na) fr.push(na-nb===1?"Foto removida.":(na-nb)+" fotos removidas.");

  return fr;
}

/* chamado de dentro do putItem, ANTES de gravar: escreve na própria demanda */
function histoAnotar(antes, depois){
  if(HISTO_PAUSA) return;
  if(!depois || !HISTO_TIPOS[depois.tipo]) return;
  const fr=histoDiferencas(antes, depois);
  if(!fr.length) return;
  if(!Array.isArray(depois.h)) depois.h=[];
  const q=histoAgora();
  for(const t of fr) depois.h.push({q, t});
  if(depois.h.length>HISTO_MAX) depois.h=depois.h.slice(-HISTO_MAX);
}

/* O carimbo é a hora DELA (relógio do aparelho), não a hora de Londres. O campo
   "mod" do site é universal de propósito, para a sincronização; aqui a data é
   para ler, e depois das 21h o universal já virou o dia seguinte.          */
function histoAgora(){
  const d=new Date(), z=n=>String(n).padStart(2,"0");
  return d.getFullYear()+"-"+z(d.getMonth()+1)+"-"+z(d.getDate())+"T"+z(d.getHours())+":"+z(d.getMinutes());
}

/* ------------------------------------------------------------------- a tela */
function histoQuando(iso){
  const s=String(iso||""); if(s.length<10) return "";
  return s.slice(8,10)+"/"+s.slice(5,7)+"/"+s.slice(0,4);
}
function histoHora(iso){
  const s=String(iso||""); return s.length>=16 ? s.slice(11,16) : "";
}
function histoTexto(d){
  return String(d.fazer||d.oque||d.nc||d.acao||d.texto_bruto||d.titulo||"(item sem texto)").trim();
}

function histoPassos(d){
  const lin=Array.isArray(d.h)?d.h:[];
  if(!lin.length){
    return `<div class="bd-vazio">
      <div class="bd-vazio-ico">🕘</div>
      <div class="bd-vazio-tit">Ainda não há história para contar</div>
      <div class="bd-vazio-txt">A partir de agora, tudo o que acontecer com esta demanda fica registrado aqui, com a data.</div>
    </div>`;
  }
  let ultimo="";
  return lin.map(p=>{
    const dia=histoQuando(p.q), hora=histoHora(p.q);
    const mostra = dia!==ultimo; ultimo=dia;
    return `<div class="hst-passo">
      <div class="hst-quando">${mostra?esc(dia):""}</div>
      <div class="hst-o-que">${esc(p.t)}${hora?` <small>${esc(hora)}</small>`:""}</div>
    </div>`;
  }).join("");
}

function histoAbrir(id){
  if(typeof ncModal!=="function") return;
  const d=(typeof DATA!=="undefined")?DATA.find(x=>x.id===id):null;
  if(!d) return;
  const onde=[d.area?String(d.area):"", d.piso?String(d.piso):""].filter(Boolean).join(" · ");
  ncModal(`<h2 style="margin-bottom:4px">🕘 Histórico</h2>
    <p class="hst-cab"><b>${esc(histoTexto(d))}</b>${onde?`<br><span class="desc">${esc(onde)}</span>`:""}</p>
    <div class="hst-lista">${histoPassos(d)}</div>
    <div class="form-actions"><button class="btn ghost" onclick="ncFechar()">Fechar</button></div>`);
}
