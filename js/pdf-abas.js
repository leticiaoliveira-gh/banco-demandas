/* =====================================================================
   PDF COM UMA PÁGINA POR ABA — pedido dela (20/07):
   "incluir na exportação também um pdf com um print de cada página/aba,
    nomeado por aba > faça o que gastar menos e me deixe saber".

   O QUE EU ESCOLHI E POR QUÊ (dito a ela na entrega):
   print de tela DE VERDADE exigiria uma biblioteca externa (html2canvas), e o
   site é offline-first e não usa CDN — seria pesado e quebraria sem internet.
   Então cada aba vira uma PÁGINA montada com o mesmo gerador do relatório dela
   (js/pdflite.js): sai leve, o texto dá para copiar e buscar, e cada página leva
   o NOME DA ABA no topo, que é o que ela pediu.
   Respeita os nomes que ela deu às abas (rotuloAba) e o que ela filtrou na tela.
   ===================================================================== */

const PA_M=40, PA_LARG=595.28-80;
const PA_VERDE="#0f5b52", PA_CINZA="#8a8b96", PA_TEXTO="#2d2e3a";

/* cabeçalho de cada página: nome da aba + loja + data */
function paCabecalho(d,titulo,sub){
  d.retangulo(0,0,595.28,64,PA_VERDE);
  d.texto(String(titulo||"").toUpperCase(),{x:PA_M,y:20,tam:15,cor:"#ffffff",negrito:true});
  d.texto(sub||"",{x:PA_M,y:41,tam:9,cor:"#cfe4df"});
  d.y=84;
}
function paSecao(d,txt){
  d.espaco(30);d.pular(8);
  d.texto(txt,{x:PA_M,y:d.y,tam:10,cor:PA_VERDE,negrito:true});
  d.y+=6;d.linha(PA_M,d.y+6,PA_M+PA_LARG,d.y+6,"#cfe4df",0.7);d.y+=14;
}
/* uma linha de item: marcador + texto que quebra sozinho */
function paItem(d,texto,detalhe,cor){
  d.espaco(26);
  const linhas=d.quebrar(texto,PA_LARG-16,9.5,false);
  d.texto("•",{x:PA_M,y:d.y,tam:9.5,cor:cor||PA_CINZA});
  for(const l of linhas){d.espaco(14);d.texto(l,{x:PA_M+12,y:d.y,tam:9.5,cor:PA_TEXTO});d.y+=12;}
  if(detalhe){
    for(const l of d.quebrar(detalhe,PA_LARG-16,8,false)){
      d.espaco(12);d.texto(l,{x:PA_M+12,y:d.y,tam:8,cor:PA_CINZA});d.y+=10;}
  }
  d.y+=4;
}
function paVazio(d,msg){
  d.espaco(20);
  d.texto(msg,{x:PA_M,y:d.y,tam:9.5,cor:PA_CINZA,italico:true});d.y+=16;
}
function paRodape(d,n){
  d.texto("Página "+n,{x:PA_M,y:800,tam:8,cor:PA_CINZA,larg:PA_LARG,direita:true});
}

/* ===== conteúdo de cada aba ===== */
function paQuadroGeral(d,loja){
  paCabecalho(d,rotuloAba("dg"),loja+" · "+brDate(today()));
  const vivos=(typeof dgVivos==="function")?dgVivos():[];
  const feito=(typeof DG_CHAVE_CONCLUIDO!=="undefined")?DG_CHAVE_CONCLUIDO:"concluido";
  const prios=(typeof DG_PRIOS!=="undefined")?DG_PRIOS:{};
  const abertas=vivos.filter(x=>x.situacao!==feito);
  d.texto(abertas.length+" em aberto · "+(vivos.length-abertas.length)+" concluídas",
    {x:PA_M,y:d.y,tam:9,cor:PA_CINZA});d.y+=18;
  if(!abertas.length)return paVazio(d,"Nenhuma demanda em aberto.");
  const chaves=Object.keys(prios).length?Object.keys(prios).sort((a,b)=>(prios[a].ordem||0)-(prios[b].ordem||0)):[""];
  for(const k of chaves){
    const doGrupo=abertas.filter(x=>(x.prioridade||"")===k);
    if(!doGrupo.length)continue;
    paSecao(d,((prios[k]&&prios[k].rotulo)||"Sem prioridade")+"  ("+doGrupo.length+")");
    for(const it of doGrupo){
      const subs=(it.itens||[]).filter(i=>i.tipoLinha==="check"&&!i.feito).length;
      const det=[it.prazo?"Prazo "+brDate(it.prazo):"",subs?subs+" item(ns) pendente(s)":""].filter(Boolean).join(" · ");
      paItem(d,it.titulo||"(sem título)",det,(prios[k]&&prios[k].cor));
    }
  }
}
function paManutencoes(d,loja){
  paCabecalho(d,rotuloAba("list"),loja+" · "+brDate(today()));
  const base=DATA.filter(x=>!x.deleted&&(x.tipo||"mnt")==="mnt"&&x.loja===currentStore);
  const pend=base.filter(isPendente),ok=base.filter(isConcluido);
  d.texto(pend.length+" pendentes · "+ok.length+" concluídos",{x:PA_M,y:d.y,tam:9,cor:PA_CINZA});d.y+=18;
  if(!pend.length)return paVazio(d,"Nenhuma manutenção pendente.");
  const porExec={};
  for(const x of pend)(porExec[x.executor||"Sem responsável"]=porExec[x.executor||"Sem responsável"]||[]).push(x);
  for(const exec of Object.keys(porExec).sort()){
    paSecao(d,exec+"  ("+porExec[exec].length+")");
    for(const x of porExec[exec])
      paItem(d,x.nc||"(sem descrição)",[x.area,x.relato?brDate(x.relato):""].filter(Boolean).join(" · "));
  }
}
function paNaoConformidades(d,loja){
  paCabecalho(d,rotuloAba("nc"),loja+" · "+brDate(today()));
  const base=DATA.filter(x=>!x.deleted&&x.tipo==="nc"&&x.loja===currentStore);
  const abertas=base.filter(x=>x.status!=="Resolvida");
  d.texto(abertas.length+" em aberto · "+(base.length-abertas.length)+" resolvidas",
    {x:PA_M,y:d.y,tam:9,cor:PA_CINZA});d.y+=18;
  if(!abertas.length)return paVazio(d,"Nenhuma não conformidade em aberto.");
  const porArea={};
  for(const x of abertas)(porArea[x.area||"Sem área"]=porArea[x.area||"Sem área"]||[]).push(x);
  for(const a of Object.keys(porArea).sort()){
    paSecao(d,a+"  ("+porArea[a].length+")");
    for(const x of porArea[a]){
      const u=(typeof NC_URG!=="undefined"&&NC_URG[x.urgencia])||null;
      paItem(d,x.texto_tecnico||x.texto_bruto||"(sem descrição)",
        [u&&u.rotulo,x.relato?brDate(x.relato):""].filter(Boolean).join(" · "),u&&u.cor);
    }
  }
}
function paChecklists(d,loja){
  paCabecalho(d,rotuloAba("ck"),loja+" · "+brDate(today()));
  const modelos=(typeof ckModelos==="function")?ckModelos():[];
  const feitas=(typeof ckPreenchimentos==="function")?ckPreenchimentos("concluido"):[];
  const parciais=(typeof ckPreenchimentos==="function")?ckPreenchimentos("andamento"):[];
  d.texto(modelos.length+" checklists · "+feitas.length+" concluídas · "+parciais.length+" em andamento",
    {x:PA_M,y:d.y,tam:9,cor:PA_CINZA});d.y+=18;
  if(modelos.length){
    paSecao(d,"Checklists montados");
    for(const m of modelos)
      paItem(d,m.titulo||"(sem nome)",(ckPerguntas(m)||[]).length+" perguntas");
  }
  if(feitas.length){
    paSecao(d,"Inspeções concluídas");
    for(const p of feitas.slice(0,40)){
      const m=ckAchar(p.modelo);
      paItem(d,(m&&m.titulo)||"Inspeção",
        [p.data?brDate(p.data):"",(p.nota!=null?"nota "+p.nota+"%":"")].filter(Boolean).join(" · "));
    }
    if(feitas.length>40)paVazio(d,"(mostrando as 40 mais recentes de "+feitas.length+")");
  }
  if(!modelos.length&&!feitas.length)paVazio(d,"Nada registrado nesta aba ainda.");
}

/* ===== o PDF inteiro ===== */
function pdfDeTodasAsAbas(){
  if(!currentStore){toast("Entre numa empresa primeiro");return;}
  if(typeof PDFLite!=="function"){alert("O gerador de PDF não carregou. Recarregue a página.");return;}
  const loja=nomeCurto((empresa(currentStore)||{}).name||currentStore);
  const d=new PDFLite();

  /* capa */
  d.retangulo(0,0,595.28,180,PA_VERDE);
  d.texto("RELATÓRIO GERAL",{x:PA_M,y:52,tam:9,cor:"#cfe4df"});
  d.texto(loja,{x:PA_M,y:70,tam:24,cor:"#ffffff",negrito:true});
  d.texto(txt("capa.titulo","Central de Empresas"),{x:PA_M,y:106,tam:11,cor:"#d8ebe6"});
  d.linha(PA_M,130,PA_M+200,130,"#4f9a8e",0.8);
  d.texto(RT_INFO||RT_DEFAULT,{x:PA_M,y:140,tam:9,cor:"#ffffff"});
  d.texto("Gerado em "+brDate(today()),{x:PA_M,y:156,tam:8,cor:"#cfe4df"});
  d.y=210;
  d.texto("O que tem neste documento",{x:PA_M,y:d.y,tam:11,cor:PA_VERDE,negrito:true});d.y+=20;
  const secoes=[["dg",rotuloAba("dg")],["ck",rotuloAba("ck")],["nc",rotuloAba("nc")],["list",rotuloAba("list")]];
  for(const [,nome] of secoes){
    d.texto("•  "+nome,{x:PA_M,y:d.y,tam:10,cor:PA_TEXTO});d.y+=17;
  }
  d.y+=10;
  for(const l of d.quebrar("Cada quadro do site vira uma página deste documento, com o que está registrado hoje. "
    +"O texto pode ser copiado e pesquisado.",PA_LARG,9))
    {d.texto(l,{x:PA_M,y:d.y,tam:9,cor:PA_CINZA});d.y+=13;}

  /* uma página por aba, na ordem das abas do site */
  const montadores={dg:paQuadroGeral,ck:paChecklists,nc:paNaoConformidades,list:paManutencoes};
  for(const t of TAB_ORDER){
    if(!montadores[t])continue;
    d.novaPagina();
    try{montadores[t](d,loja);}
    catch(e){paVazio(d,"Não consegui montar esta parte: "+(e&&e.message||e));}
  }
  /* numeração no rodapé de todas as páginas */
  const guardaPag=d.pag,guardaY=d.y;
  d.paginas.forEach((pg,i)=>{d.pag=pg;paRodape(d,i+1);});
  d.pag=guardaPag;d.y=guardaY;

  const nome="Relatorio Geral - "+loja.replace(/[^\wÀ-ÿ ]/g,"")+" - "+brDate(today()).replace(/\//g,".")+".pdf";
  download(nome,d.blob(),"application/pdf");
  toast("PDF gerado ✓ "+d.paginas.length+" páginas");
}
