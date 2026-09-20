/* =====================================================================
   PAINEL DE SEGURANÇA (Parte 3, 20/09/2026)
   Aprovações pendentes (celular), computadores conectados e os 10
   códigos de emergência. Mesmo padrão de janela do openSyncModal()
   (js/sync.js): cria a caixa na hora, com innerHTML, e some ao fechar.
   ===================================================================== */

let segurancaTimer = null;

function segurancaFechar(){
  const m=document.getElementById("segurancaModal");
  if(m)m.remove();
  clearInterval(segurancaTimer);
}

function segurancaAbrir(){
  if(!nuvemLigada()){ toast("Entre no site primeiro."); return; }
  if(document.getElementById("segurancaModal"))return;
  const m=document.createElement("div");
  m.id="segurancaModal";
  m.className="bd-fundo";
  m.style.cssText="z-index:9998;display:flex;align-items:flex-start;justify-content:center;padding:24px 16px;overflow:auto";
  m.onclick=function(e){ if(e.target===m)segurancaFechar(); };
  m.innerHTML=
    '<div class="bd-janela" style="max-width:520px">' +
    '<div class="bd-janela-topo">' +
      '<div><div style="font-size:17px;font-weight:700;color:var(--bd-c900)">Segurança</div>' +
      '<div class="bd-ajuda">Aprovações, computadores conectados e código de emergência</div></div>' +
      '<button class="bd-janela-x" onclick="segurancaFechar()">✕</button>' +
    '</div>' +
    '<div class="bd-janela-corpo" id="segurancaCorpo"><div class="bd-ajuda">Carregando…</div></div>' +
    '</div>';
  document.body.appendChild(m);
  segurancaCarregar();
  clearInterval(segurancaTimer);
  segurancaTimer=setInterval(segurancaCarregar,15000);
}

async function segurancaCarregar(){
  const corpo=document.getElementById("segurancaCorpo");
  if(!corpo)return;
  try{
    const [rAprov,rDisp]=await Promise.all([
      fetch(loginApiBase()+"/api/aprovacoes",{headers:nuvemHdrs()}),
      fetch(loginApiBase()+"/api/dispositivos",{headers:nuvemHdrs()})
    ]);
    const aprov=(await rAprov.json()).aprovacoes||[];
    const disp=(await rDisp.json());
    segurancaRenderizar(corpo,aprov,disp.dispositivos||[],disp.estaSessao);
  }catch(e){
    corpo.innerHTML='<div class="bd-aviso bd-aviso-erro">Sem internet para ver a segurança agora.</div>';
  }
}

function segurancaAparelhoTxt(a){
  return (a||"aparelho desconhecido");
}

function segurancaRenderizar(corpo,aprov,disp,estaSessao){
  let html="";

  if(aprov.length){
    html+='<div style="font-size:13.5px;font-weight:620;color:var(--bd-c900);margin-bottom:8px">Pedidos esperando aprovação</div>';
    for(const a of aprov){
      html+=
        '<div class="bd-card" style="margin-bottom:10px">' +
        '<div class="bd-card-topo">' +
          '<div class="bd-card-tit">'+segurancaAparelhoTxt(a.aparelho)+'</div>' +
          '<div class="bd-card-sub">pediu entrada agora — confira o número no computador dele</div>' +
          '<div style="text-align:center;font-size:28px;font-weight:700;letter-spacing:3px;color:var(--bd-verde);margin:10px 0">'+a.codigo+'</div>' +
        '</div>' +
        '<div class="bd-card-rodape" style="display:flex;flex-direction:column;gap:8px">' +
          '<label class="bd-rotulo">Por quanto tempo</label>' +
          '<select class="bd-campo" id="prazo-'+a.id+'">' +
            '<option value="60">1 hora</option>' +
            '<option value="240">4 horas</option>' +
            '<option value="">Até 18h de hoje</option>' +
          '</select>' +
          '<div style="display:flex;gap:8px;margin-top:4px">' +
            '<button class="bd-btn bd-btn-principal" style="flex:1" onclick="segurancaDecidir(\''+a.id+'\',true)">Aprovar</button>' +
            '<button class="bd-btn bd-btn-secundario" style="flex:1" onclick="segurancaDecidir(\''+a.id+'\',false)">Recusar</button>' +
          '</div>' +
        '</div></div>';
    }
  }

  html+='<div style="font-size:13.5px;font-weight:620;color:var(--bd-c900);margin:14px 0 8px">Computadores conectados</div>';
  if(!disp.length){
    html+='<div class="bd-ajuda">Nenhum computador conectado agora.</div>';
  }else{
    for(const d of disp){
      const aqui=d.id===estaSessao;
      html+=
        '<div class="bd-card" style="margin-bottom:8px"><div class="bd-card-topo" style="display:flex;justify-content:space-between;align-items:center;gap:10px">' +
        '<div><div class="bd-card-tit">'+segurancaAparelhoTxt(d.aparelho)+(aqui?' <span class="bd-selo bd-selo-info">este aqui</span>':'')+'</div>' +
        '<div class="bd-card-sub">'+(d.visto_em?"visto por último "+d.visto_em:"")+'</div></div>' +
        (aqui?'':'<button class="bd-btn bd-btn-perigo bd-btn-p" onclick="segurancaDesconectar(\''+d.id+'\')">Desconectar</button>') +
        '</div></div>';
    }
  }

  html+='<div style="font-size:13.5px;font-weight:620;color:var(--bd-c900);margin:14px 0 8px">Código de emergência</div>';
  html+='<div class="bd-ajuda" style="margin-bottom:8px">Gera 10 códigos de uso único e um PDF para imprimir e guardar, caso perca o celular.</div>';
  html+='<button class="bd-btn bd-btn-secundario bd-btn-largo" style="width:100%" onclick="segurancaGerarEmergencia()">Gerar novos códigos de emergência</button>';

  corpo.innerHTML=html;
}

async function segurancaDecidir(id,aprovar){
  const sel=document.getElementById("prazo-"+id);
  const prazo=sel?sel.value:"";
  try{
    const r=await fetch(loginApiBase()+"/api/aprovacoes/"+encodeURIComponent(id)+"/decidir",{
      method:"POST",headers:nuvemHdrs(),
      body:JSON.stringify({aprovar:aprovar,prazoMin:prazo?Number(prazo):null})
    });
    const j=await r.json();
    if(!j.ok){toast(j.erro||"Não deu para decidir agora.");return;}
    toast(aprovar?"Aprovado ✓":"Recusado");
    segurancaCarregar();
  }catch(e){toast("Sem internet agora.");}
}

async function segurancaDesconectar(sessaoId){
  try{
    const r=await fetch(loginApiBase()+"/api/dispositivos/"+encodeURIComponent(sessaoId)+"/desconectar",{
      method:"POST",headers:nuvemHdrs()
    });
    const j=await r.json();
    if(!j.ok){toast(j.erro||"Não deu para desconectar agora.");return;}
    toast("Desconectado ✓");
    segurancaCarregar();
  }catch(e){toast("Sem internet agora.");}
}

async function segurancaGerarEmergencia(){
  try{
    const r=await fetch(loginApiBase()+"/api/emergencia/gerar",{method:"POST",headers:nuvemHdrs()});
    const j=await r.json();
    if(!j.ok){toast(j.erro||"Não deu para gerar os códigos agora.");return;}
    segurancaPdfEmergencia(j.codigos||[]);
    toast("Códigos gerados ✓ — o PDF baixou para o computador");
  }catch(e){toast("Sem internet agora.");}
}

function segurancaPdfEmergencia(codigos){
  const d=new PDFLite();
  d.retangulo(0,0,595,110,"#1d6b57");
  d.texto("Central de Demandas — códigos de emergência",{x:40,y:42,tam:19,cor:"#ffffff",negrito:true});
  d.texto(new Date().toLocaleDateString("pt-BR"),{x:40,y:70,tam:11,cor:"#e8f5f0"});
  d.y=140;
  d.paragrafo("Use um destes códigos para entrar no site se você perder o celular e não puder aprovar a entrada por lá. Cada código funciona uma única vez.",{x:40,larg:515,tam:11.5});
  d.y+=14;
  for(let i=0;i<codigos.length;i++){
    d.texto((i+1)+".  "+codigos[i],{x:40,y:d.y,tam:14,negrito:true});
    d.y+=26;
  }
  d.y+=14;
  d.texto("Como recuperar o acesso",{x:40,y:d.y,tam:13.5,negrito:true});
  d.y+=22;
  d.paragrafo("1) Abra o site no computador ou celular. 2) Toque em \"Perdi o celular, tenho um código de emergência\". 3) Digite o e-mail e um dos códigos acima. 4) Depois de entrar, gere códigos novos aqui mesmo em Segurança — os usados não servem mais.",{x:40,larg:515,tam:11.5});
  download("codigos-emergencia-"+new Date().toISOString().slice(0,10)+".pdf",d.blob(),"application/pdf");
}
