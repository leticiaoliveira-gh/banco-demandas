/* ===== REVISAR — comentário no relatório, estilo Word =====
   Pedido dela (22/09): um botão "Revisar" na tela do relatório (a que já vira
   PDF) que abre um painel do lado, igual comentário do Word. Ela clica num
   trecho, escreve o que quer mudar ali, e no fim aperta "Copiar pedidos" e
   cola na conversa comigo. Quem faz as mudanças sou eu — todas de uma vez ou
   uma por sessão, como ela mandar; este botão só junta os pedidos dela.

   Uso, em qualquer arquivo que abre relatório numa janela nova:
     const w=window.open("");
     w.document.write("...");
     w.document.close();
     revisarAtivar(w,{chave:"nc-2026-09-loja1",titulo:"Relatório de Não Conformidades"});

   chave = identifica ESTE relatório (varia por loja/mês/inspeção), para os
   comentários não se misturarem com os de outro relatório. Os comentários
   ficam guardados no navegador (localStorage) até ela apertar "Copiar
   pedidos" — troca de aparelho não leva os comentários juntos, é rascunho.
*/
function revisarAtivar(w,op){
  if(!w||!w.document||w.closed)return;
  op=op||{};
  const chave="revisar_"+(op.chave||"geral");
  const d=w.document;
  let dados=[];
  try{dados=JSON.parse(localStorage.getItem(chave)||"[]");}catch(e){dados=[];}
  let ligado=false,prox=1;
  dados.forEach(c=>{if(c.n>=prox)prox=c.n+1;});

  const css=d.createElement("style");
  css.textContent=
    ".rv-btn{position:fixed;top:58px;right:14px;z-index:99999;min-height:44px;padding:8px 16px;"+
    "display:inline-flex;align-items:center;border-radius:8px;box-sizing:border-box;"+
    "border:1px solid #1d6b57;background:#fff;color:#1d6b57;font:600 13px/1 -apple-system,Segoe UI,Arial,sans-serif;"+
    "cursor:pointer;box-shadow:0 1px 3px rgba(16,24,40,.15)}"+
    ".rv-btn.on{background:#1d6b57;color:#fff}"+
    ".rv-marca{position:relative;display:inline-flex;align-items:center;justify-content:center;min-width:19px;height:19px;"+
    "border-radius:50%;background:#f59e0b;color:#fff;font:700 11px/1 -apple-system,sans-serif;"+
    "margin-right:6px;cursor:pointer;vertical-align:middle}"+
    ".rv-marca::after{content:'';position:absolute;top:50%;left:50%;width:44px;height:44px;transform:translate(-50%,-50%)}"+
    "body.rv-ligado [data-rv-clicavel]{cursor:pointer}"+
    "body.rv-ligado [data-rv-clicavel]:hover{outline:2px dashed #f59e0b;outline-offset:2px;background:#fffaeb}"+
    ".rv-painel{position:fixed;top:0;right:0;width:300px;max-width:88vw;height:100%;"+
    "background:#fff;border-left:1px solid #e6e7eb;box-shadow:-4px 0 14px rgba(16,24,40,.12);"+
    "z-index:99998;display:none;flex-direction:column;font-family:-apple-system,Segoe UI,Arial,sans-serif}"+
    ".rv-painel.aberto{display:flex}"+
    ".rv-painel-topo{padding:14px 16px;border-bottom:1px solid #eaecf0;font-weight:700;color:#155244;"+
    "font-size:14px;display:flex;justify-content:space-between;align-items:center}"+
    ".rv-painel-topo button{position:relative;background:none;border:0;font-size:19px;cursor:pointer;color:#667085;"+
    "padding:2px 6px;min-width:44px;min-height:44px}"+
    ".rv-lista{flex:1;overflow:auto;padding:10px 12px}"+
    ".rv-card{border:1px solid #eaecf0;border-radius:10px;padding:10px;margin-bottom:10px;background:#f9fafb}"+
    ".rv-card b{font-size:12px;color:#475467}"+
    ".rv-card .txt{font-size:11.5px;color:#667085;margin:4px 0 8px;line-height:1.4;max-height:32px;overflow:hidden}"+
    ".rv-card textarea{width:100%;min-height:56px;font:13px/1.4 inherit;padding:7px;box-sizing:border-box;"+
    "border:1px solid #d0d5dd;border-radius:7px;resize:vertical}"+
    ".rv-card .rv-apagar{position:relative;margin-top:6px;font-size:11.5px;color:#b42318;background:none;"+
    "border:0;cursor:pointer;padding:0;min-height:44px;display:inline-flex;align-items:center}"+
    ".rv-rodape{padding:12px;border-top:1px solid #eaecf0}"+
    ".rv-rodape button{width:100%;padding:12px;border-radius:9px;border:0;background:#1d6b57;color:#fff;"+
    "font:600 13.5px/1 inherit;cursor:pointer;min-height:44px}"+
    ".rv-vazio{font-size:12.5px;color:#667085;padding:8px 2px;line-height:1.5}"+
    "@media print{.rv-btn,.rv-painel{display:none!important}}"+
    "@media (max-width:640px){.rv-painel{width:100%;max-width:100%}.rv-btn{right:8px}}";
  d.head.appendChild(css);

  const btn=d.createElement("button");
  btn.type="button";btn.className="rv-btn";btn.textContent="✎ Revisar";
  d.body.appendChild(btn);

  const painel=d.createElement("div");
  painel.className="rv-painel";
  painel.innerHTML='<div class="rv-painel-topo"><span>Revisar este relatório</span>'
    +'<button type="button" data-fechar aria-label="Fechar">✕</button></div>'
    +'<div class="rv-lista"></div>'
    +'<div class="rv-rodape"><button type="button" data-copiar>📋 Copiar pedidos</button></div>';
  d.body.appendChild(painel);

  function salvar(){try{localStorage.setItem(chave,JSON.stringify(dados));}catch(e){}}
  function trechoDe(el){return (el.textContent||"").replace(/\s+/g," ").trim().slice(0,90);}
  function escHtml(s){return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;");}

  function redesenhar(){
    const lista=painel.querySelector(".rv-lista");
    if(!dados.length){
      lista.innerHTML='<div class="rv-vazio">Clique em qualquer trecho do relatório (um título, um item, um parágrafo) para deixar um comentário aqui.</div>';
      return;
    }
    lista.innerHTML=dados.map(c=>
      '<div class="rv-card" data-card="'+c.n+'"><b>Nº '+c.n+'</b>'
      +'<div class="txt">'+escHtml(c.trecho)+'</div>'
      +'<textarea placeholder="O que você quer mudar aqui?" data-nota="'+c.n+'">'+escHtml(c.nota)+'</textarea>'
      +'<button type="button" class="rv-apagar" data-apagar="'+c.n+'">Apagar comentário</button></div>'
    ).join("");
  }
  redesenhar();
  if(dados.length)painel.classList.add("aberto");

  function marcarElemento(el,n){
    const marca=d.createElement("span");
    marca.className="rv-marca";marca.textContent=n;
    marca.addEventListener("click",ev=>{ev.stopPropagation();abrirCard(n);});
    el.insertBefore(marca,el.firstChild);
  }
  function abrirCard(n){
    painel.classList.add("aberto");
    const card=painel.querySelector('.rv-card[data-card="'+n+'"]');
    if(card){card.scrollIntoView({block:"center"});const ta=card.querySelector("textarea");if(ta)ta.focus();}
  }

  const ALVOS="p,li,h1,h2,h3,h4,td,.card,.area,.piso,.item,.txt,.tit,.prob,.acao";
  d.body.addEventListener("click",ev=>{
    if(!ligado)return;
    if(ev.target.closest(".rv-painel")||ev.target.closest(".rv-btn"))return;
    if(ev.target.closest(".rv-marca"))return;
    const el=ev.target.closest(ALVOS);
    if(!el||el.hasAttribute("data-rv-clicavel"))return;
    const n=prox++;
    const trecho=trechoDe(el);
    el.setAttribute("data-rv-clicavel","1");
    marcarElemento(el,n);
    dados.push({n,trecho,nota:""});
    salvar();redesenhar();
    painel.classList.add("aberto");
    setTimeout(()=>abrirCard(n),30);
  });

  painel.addEventListener("click",ev=>{
    if(ev.target.matches("[data-fechar]"))painel.classList.remove("aberto");
    if(ev.target.matches("[data-apagar]")){
      const n=+ev.target.dataset.apagar;
      dados=dados.filter(c=>c.n!==n);
      salvar();redesenhar();
    }
    if(ev.target.matches("[data-copiar]")){
      if(!dados.length){w.alert("Ainda não tem nenhum comentário. Clique num trecho do relatório primeiro.");return;}
      const s="COMENTÁRIOS SOBRE: "+(op.titulo||"relatório")+"\n\n"
        +dados.map(c=>c.n+". "+c.trecho+"\n   pedido: "+(c.nota||"(sem nota)")).join("\n\n");
      const area=d.createElement("textarea");
      area.value=s;area.style.position="fixed";area.style.left="-9999px";
      d.body.appendChild(area);area.focus();area.select();
      let ok=false;
      try{ok=d.execCommand("copy");}catch(e){ok=false;}
      d.body.removeChild(area);
      if(ok)w.alert("Copiado. Agora cole (Ctrl+V) na conversa comigo.");
      else w.alert("Não deu para copiar sozinho. Selecione e copie o texto:\n\n"+s);
    }
  });

  painel.addEventListener("input",ev=>{
    if(ev.target.dataset&&ev.target.dataset.nota){
      const n=+ev.target.dataset.nota;
      const c=dados.find(x=>x.n===n);
      if(c){c.nota=ev.target.value;salvar();}
    }
  });

  btn.addEventListener("click",()=>{
    ligado=!ligado;
    btn.classList.toggle("on",ligado);
    d.body.classList.toggle("rv-ligado",ligado);
    if(ligado)painel.classList.add("aberto");
  });
}
