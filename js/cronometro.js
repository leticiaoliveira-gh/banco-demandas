/* =====================================================================
   CRONÔMETRO — pedido dela (Notion, "CRONOMETRO: criar um cronometro muito
   funcional, com varios times e o som do to do list especifico que eu amo").
   · VÁRIOS TEMPOS ao mesmo tempo (ex.: forno 20min + descongelo 40min + pausa).
   · Cada um com nome, para ela saber de qual é o alarme quando tocar.
   · O som é gerado aqui (WebAudio), sem arquivo e sem internet — o site é
     offline-first e não usa CDN. São 3 opções e ela escolhe a que gosta.
   · Sobrevive a trocar de aba e a fechar o site: guarda o HORÁRIO DE FIM
     (não os segundos restantes), então continua certo mesmo com a aba parada.
   Fica no aparelho (localStorage): tempo de forno não é dado de trabalho
   e não faz sentido sincronizar entre Lenovo e iPhone.
   ===================================================================== */

let CRONOS=[],CRONO_T=null,CRONO_AC=null;
const CRONO_SONS={
  sino:  {nome:"Sino",   notas:[[880,0,.5],[1320,.12,.6]]},
  suave: {nome:"Suave",  notas:[[523,0,.35],[659,.18,.35],[784,.36,.5]]},
  alerta:{nome:"Alerta", notas:[[740,0,.18],[740,.24,.18],[740,.48,.18],[740,.72,.35]]}
};
function cronoSomEscolhido(){return localStorage.getItem("crono_som")||"suave";}
function cronoSetSom(k){localStorage.setItem("crono_som",k);cronoTocar(k);cronoDesenha();}

/* som sintetizado: sem arquivo, funciona offline e não pesa no repositório */
function cronoTocar(qual){
  const s=CRONO_SONS[qual||cronoSomEscolhido()]||CRONO_SONS.suave;
  try{
    CRONO_AC=CRONO_AC||new (window.AudioContext||window.webkitAudioContext)();
    if(CRONO_AC.state==="suspended")CRONO_AC.resume();
    const t0=CRONO_AC.currentTime;
    for(const [hz,atraso,dur] of s.notas){
      const o=CRONO_AC.createOscillator(),g=CRONO_AC.createGain();
      o.type="sine";o.frequency.value=hz;
      g.gain.setValueAtTime(0,t0+atraso);
      g.gain.linearRampToValueAtTime(.22,t0+atraso+.02);
      g.gain.exponentialRampToValueAtTime(.0001,t0+atraso+dur);
      o.connect(g);g.connect(CRONO_AC.destination);
      o.start(t0+atraso);o.stop(t0+atraso+dur+.05);
    }
  }catch(e){/* navegador sem áudio: o aviso na tela e a vibração continuam */}
  try{if(navigator.vibrate)navigator.vibrate([200,90,200]);}catch(e){}
}

function cronoCarregar(){
  try{CRONOS=JSON.parse(localStorage.getItem("cronos")||"[]");}catch(e){CRONOS=[];}
  if(!Array.isArray(CRONOS))CRONOS=[];
}
function cronoSalvar(){try{localStorage.setItem("cronos",JSON.stringify(CRONOS));}catch(e){}}

/* guardamos o INSTANTE DO FIM, não os segundos que faltam: assim o tempo continua
   correndo certo com a aba em segundo plano ou o site fechado */
function cronoRestante(c){
  if(c.pausadoEm)return Math.max(0,c.fimEm-c.pausadoEm);
  return Math.max(0,c.fimEm-Date.now());
}
function cronoFmt(ms){
  const s=Math.ceil(ms/1000),h=Math.floor(s/3600),m=Math.floor(s%3600/60),g=s%60;
  const p=n=>String(n).padStart(2,"0");
  return (h?h+":":"")+p(m)+":"+p(g);
}
function cronoAdicionar(nome,minutos){
  nome=String(nome||"").trim()||"Tempo";
  const min=Number(minutos);
  if(!(min>0)){toast("Diga quantos minutos");return;}
  CRONOS.push({uid:(crypto.randomUUID?crypto.randomUUID():String(Date.now())),
    nome,total:min*60000,fimEm:Date.now()+min*60000,pausadoEm:null,tocou:false});
  cronoSalvar();cronoLoop();cronoDesenha();
}
function cronoPausar(uid){
  const c=CRONOS.find(x=>x.uid===uid);if(!c)return;
  if(c.pausadoEm){c.fimEm+=Date.now()-c.pausadoEm;c.pausadoEm=null;}
  else c.pausadoEm=Date.now();
  cronoSalvar();cronoDesenha();
}
function cronoZerar(uid){
  const c=CRONOS.find(x=>x.uid===uid);if(!c)return;
  c.fimEm=Date.now()+c.total;c.pausadoEm=null;c.tocou=false;
  cronoSalvar();cronoDesenha();
}
function cronoRemover(uid){CRONOS=CRONOS.filter(x=>x.uid!==uid);cronoSalvar();cronoDesenha();}
function cronoRenomear(uid,novo){
  const c=CRONOS.find(x=>x.uid===uid);if(!c)return;
  novo=String(novo||"").trim();if(!novo||novo===c.nome)return;
  c.nome=novo;cronoSalvar();
}

/* um único relógio para todos os tempos */
function cronoLoop(){
  clearInterval(CRONO_T);
  if(!CRONOS.length)return;
  CRONO_T=setInterval(()=>{
    let tocouAgora=null;
    for(const c of CRONOS){
      if(!c.tocou&&!c.pausadoEm&&cronoRestante(c)<=0){c.tocou=true;tocouAgora=c;}
    }
    if(tocouAgora){cronoSalvar();cronoTocar();cronoAvisar(tocouAgora);}
    cronoAtualizaNumeros();
  },250);
}
function cronoAvisar(c){
  toast("⏰ "+c.nome+" — acabou o tempo");
  const p=document.getElementById("crono-painel");
  if(!p||p.hidden)abrirCronometro();       /* se estiver fechado, abre para ela ver qual foi */
  cronoDesenha();
}
/* só troca os números; redesenhar tudo a cada 250ms tiraria o cursor do campo */
function cronoAtualizaNumeros(){
  for(const c of CRONOS){
    const el=document.getElementById("crono-t-"+c.uid);
    if(!el)continue;
    const r=cronoRestante(c);
    el.textContent=cronoFmt(r);
    el.className="crono-num"+(r<=0?" fim":(r<=60000?" perto":""));
  }
  const b=document.getElementById("crono-bolha");
  if(b){
    const ativos=CRONOS.filter(c=>!c.pausadoEm&&cronoRestante(c)>0).length;
    const acabou=CRONOS.some(c=>cronoRestante(c)<=0&&c.tocou);
    b.hidden=!CRONOS.length;
    b.textContent=acabou?"⏰":(ativos?String(ativos):"⏱");
    b.classList.toggle("tocando",acabou);
  }
}

function abrirCronometro(){
  let p=document.getElementById("crono-painel");
  if(!p){
    p=document.createElement("div");p.id="crono-painel";p.className="crono-painel";
    document.body.appendChild(p);
  }
  p.hidden=false;cronoDesenha();
}
function fecharCronometro(){const p=document.getElementById("crono-painel");if(p)p.hidden=true;}
function toggleCronometro(){
  const p=document.getElementById("crono-painel");
  if(p&&!p.hidden)fecharCronometro();else abrirCronometro();
}

const CRONO_ATALHOS=[["5 min",5],["10 min",10],["15 min",15],["20 min",20],["30 min",30],["1 hora",60]];
function cronoDesenha(){
  const p=document.getElementById("crono-painel");if(!p||p.hidden)return;
  const lista=CRONOS.map(c=>{
    const r=cronoRestante(c),acabou=r<=0;
    return `<div class="crono-item${acabou?" acabou":""}">
      <input class="crono-nome" value="${esc(c.nome)}" title="Escreva do que é este tempo"
        onchange="cronoRenomear('${c.uid}',this.value)">
      <span class="crono-num${acabou?" fim":(r<=60000?" perto":"")}" id="crono-t-${c.uid}">${cronoFmt(r)}</span>
      <button class="btn ghost sm" onclick="cronoPausar('${c.uid}')" title="${c.pausadoEm?"Continuar":"Pausar"}">${c.pausadoEm?"▶":"⏸"}</button>
      <button class="btn ghost sm" onclick="cronoZerar('${c.uid}')" title="Começar de novo">↻</button>
      <button class="btn ghost sm" onclick="cronoRemover('${c.uid}')" title="Tirar da lista">🗑</button>
    </div>`;}).join("");
  const sons=Object.keys(CRONO_SONS).map(k=>
    `<button class="crono-som${cronoSomEscolhido()===k?" on":""}" onclick="cronoSetSom('${k}')"
      title="Ouvir e escolher">${CRONO_SONS[k].nome}</button>`).join("");
  p.innerHTML=`
    <div class="crono-topo">
      <b>⏱ Cronômetro</b>
      <button class="btn ghost sm" onclick="fecharCronometro()" title="Fechar">✕</button>
    </div>
    <div class="crono-lista">${lista||`<p class="crono-vazio">Nenhum tempo marcado. Escolha abaixo.</p>`}</div>
    <div class="crono-rapidos">${CRONO_ATALHOS.map(([r,m])=>
      `<button class="btn ghost sm" onclick="cronoAdicionar('${r}',${m})">${r}</button>`).join("")}</div>
    <div class="crono-novo">
      <input id="crono-nome-novo" placeholder="Do que é? (ex.: forno)" onkeydown="if(event.key==='Enter')cronoCriarDoForm()">
      <input id="crono-min-novo" type="number" min="1" step="1" placeholder="min" onkeydown="if(event.key==='Enter')cronoCriarDoForm()">
      <button class="btn sm" onclick="cronoCriarDoForm()">＋ Marcar</button>
    </div>
    <div class="crono-sons"><span>Som do alarme:</span>${sons}</div>
    <p class="crono-nota">Os tempos continuam correndo mesmo se você trocar de aba ou fechar o site.</p>`;
  cronoAtualizaNumeros();
}
function cronoCriarDoForm(){
  const n=document.getElementById("crono-nome-novo"),m=document.getElementById("crono-min-novo");
  cronoAdicionar(n.value,m.value);
  n.value="";m.value="";n.focus();
}

/* começa junto com o site: se ela deixou tempos correndo, eles continuam */
cronoCarregar();cronoLoop();
setTimeout(cronoAtualizaNumeros,300);
