/* ===== Leitor de arquivos: Excel, CSV, Word, PDF, texto e imagens =====
   Tudo acontece DENTRO do navegador — nenhum arquivo sai do computador dela,
   nada é enviado para servidor nenhum, e não depende de biblioteca externa.

   O que consegue LER (virar texto/linhas):
     .csv .txt .md    → direto
     .xlsx            → planilha do Excel (abre o zip e lê as células)
     .docx            → Word (abre o zip e lê o texto do documento)
     .pdf             → só PDFs "de texto" (os gerados por Word/Excel). PDF escaneado
                        é foto de papel: não tem texto dentro, então não dá.
   O que só consegue GUARDAR (anexar, sem ler):
     .jpg .png        → vira anexo da demanda (reduzido, para não pesar)
     qualquer outro   → avisa que não sabe ler. */

/* ---------- ZIP mínimo (xlsx e docx são arquivos zip por dentro) ---------- */
async function zipLer(buf){
  const dv=new DataView(buf),td=new TextDecoder();
  let fim=-1;
  for(let i=buf.byteLength-22;i>=0&&i>buf.byteLength-70000;i--){
    if(dv.getUint32(i,true)===0x06054b50){fim=i;break;}
  }
  if(fim<0)throw new Error("zip");
  const qtd=dv.getUint16(fim+10,true);let p=dv.getUint32(fim+16,true);
  const saida={};
  for(let i=0;i<qtd;i++){
    if(dv.getUint32(p,true)!==0x02014b50)break;
    const metodo=dv.getUint16(p+10,true),tam=dv.getUint32(p+20,true);
    const nLen=dv.getUint16(p+28,true),eLen=dv.getUint16(p+30,true),cLen=dv.getUint16(p+32,true);
    const off=dv.getUint32(p+42,true);
    const nome=td.decode(new Uint8Array(buf,p+46,nLen));
    const lh=off,lnLen=dv.getUint16(lh+26,true),leLen=dv.getUint16(lh+28,true);
    const ini=lh+30+lnLen+leLen;
    const dados=new Uint8Array(buf,ini,tam);
    saida[nome]={metodo,dados};
    p+=46+nLen+eLen+cLen;
  }
  return {
    async texto(nome){
      const e=saida[nome];if(!e)return "";
      if(e.metodo===0)return td.decode(e.dados);
      const ds=new DecompressionStream("deflate-raw");
      const r=new Blob([e.dados]).stream().pipeThrough(ds);
      return td.decode(await new Response(r).arrayBuffer());
    },
    nomes:Object.keys(saida)
  };
}

/* ---------- Excel (.xlsx) ---------- */
async function lerXLSX(buf){
  const zip=await zipLer(buf);
  const compart=[];
  const ss=await zip.texto("xl/sharedStrings.xml");
  if(ss){for(const m of ss.matchAll(/<si>([\s\S]*?)<\/si>/g)){
    compart.push([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x=>x[1]).join(""));}}
  const folha=zip.nomes.find(n=>/^xl\/worksheets\/sheet1\.xml$/.test(n))||zip.nomes.find(n=>/^xl\/worksheets\//.test(n));
  const xml=await zip.texto(folha);
  const linhas=[];
  for(const lm of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)){
    const cels=[];
    /* pega <c ...>...</c> e também as células vazias <c .../> */
    for(const cm of lm[1].matchAll(/<c\s*([^>\/]*)(?:\/>|>([\s\S]*?)<\/c>)/g)){
      const attrs=cm[1]||"",dentro=cm[2]||"";
      const tipo=(attrs.match(/t="([^"]+)"/)||[])[1];
      const v=(dentro.match(/<v>([\s\S]*?)<\/v>/)||[])[1];
      const inline=[...dentro.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x=>x[1]).join("");
      let val=inline||v||"";
      if(tipo==="s"&&v!==undefined)val=compart[+v]||"";
      cels.push(descXml(val));
    }
    if(cels.some(c=>c.trim()))linhas.push(cels);
  }
  return {tipo:"tabela",linhas};
}
/* ---------- Word (.docx) ---------- */
async function lerDOCX(buf){
  const zip=await zipLer(buf);
  const xml=await zip.texto("word/document.xml");
  const paras=[];
  for(const pm of xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)){
    const t=[...pm[0].matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map(x=>descXml(x[1])).join("");
    const nivel=(pm[0].match(/<w:ilvl w:val="(\d+)"/)||[])[1];
    if(t.trim())paras.push({texto:t.trim(),nivel:nivel?Math.min(4,+nivel):0});
  }
  return {tipo:"linhas",linhas:paras};
}
/* ---------- PDF (só os de texto) ---------- */
async function lerPDF(buf){
  const bytes=new Uint8Array(buf);
  const cru=new TextDecoder("latin1").decode(bytes);
  let texto="";
  /* fluxos comprimidos (o caso comum de PDF gerado por Word/Excel) */
  const marcas=[...cru.matchAll(/stream\r?\n/g)];
  for(const m of marcas){
    const ini=m.index+m[0].length;
    const fim=cru.indexOf("endstream",ini);if(fim<0)continue;
    try{
      const pedaco=bytes.slice(ini,fim);
      const ds=new DecompressionStream("deflate");
      const r=new Blob([pedaco]).stream().pipeThrough(ds);
      texto+=new TextDecoder("latin1").decode(await new Response(r).arrayBuffer())+"\n";
    }catch(e){}
  }
  if(!texto)texto=cru;
  /* extrai o que está entre parênteses dos comandos de escrita */
  const linhas=[];
  for(const bloco of texto.split(/BT|ET/)){
    const partes=[...bloco.matchAll(/\(((?:\\.|[^\\()])*)\)\s*Tj|\[((?:[^\]\\]|\\.)*)\]\s*TJ/g)];
    let atual="";
    for(const p of partes){
      const cru2=p[1]!==undefined?p[1]:(p[2]||"").replace(/\)\s*-?\d+(\.\d+)?\s*\(/g,"");
      atual+=cru2.replace(/\\([()\\])/g,"$1").replace(/\\(\d{3})/g,(_,o)=>String.fromCharCode(parseInt(o,8)));
    }
    if(atual.trim())linhas.push({texto:atual.trim(),nivel:0});
  }
  return {tipo:"linhas",linhas,parcial:!linhas.length};
}
function descXml(s){return String(s||"").replace(/&lt;/g,"<").replace(/&gt;/g,">")
  .replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&amp;/g,"&");}

/* ---------- CSV ---------- */
function lerCSV(txt){
  const sep=(txt.split("\n")[0].match(/;/g)||[]).length>(txt.split("\n")[0].match(/,/g)||[]).length?";":",";
  const linhas=[];let campo="",lin=[],aspas=false;
  for(let i=0;i<txt.length;i++){const c=txt[i];
    if(aspas){ if(c==='"'&&txt[i+1]==='"'){campo+='"';i++;} else if(c==='"')aspas=false; else campo+=c; }
    else if(c==='"')aspas=true;
    else if(c===sep){lin.push(campo);campo="";}
    else if(c==="\n"){lin.push(campo);if(lin.some(x=>x.trim()))linhas.push(lin);lin=[];campo="";}
    else if(c!=="\r")campo+=c;
  }
  if(campo||lin.length){lin.push(campo);if(lin.some(x=>x.trim()))linhas.push(lin);}
  return {tipo:"tabela",linhas};
}

/* ===== TELA: escolher o arquivo, ver o que ele achou e decidir o que virar ===== */
let ARQ_LIDO=null;
function abrirArquivo(){
  let inp=document.getElementById("arqInput");
  if(!inp){
    inp=document.createElement("input");inp.type="file";inp.id="arqInput";inp.style.display="none";
    inp.accept=".csv,.txt,.md,.xlsx,.xlsm,.docx,.pdf,.json,.jpg,.jpeg,.png,.webp";
    inp.onchange=arqSelecionado;document.body.appendChild(inp);
  }
  inp.value="";inp.click();
}
async function arqSelecionado(e){
  const f=e.target.files[0];if(!f)return;
  toast("Lendo "+f.name+"…");
  try{
    ARQ_LIDO=await lerArquivo(f);
    if(ARQ_LIDO.tipo==="json"){                 /* backup do próprio site */
      ncFechar();document.getElementById("importFile").click();return;
    }
    arqPreview();
  }catch(err){
    alert("Não consegui ler \""+f.name+"\".\n\n"+(err.message||"")+
      "\n\nEste site lê: Excel (.xlsx), CSV, texto, Word (.docx), PDF de texto e imagens."+
      "\n\nPDF escaneado (foto de papel) não tem texto por dentro — nesses casos, anexe como imagem.");
  }
}
function arqPreview(){
  const a=ARQ_LIDO;if(!a)return;
  if(a.tipo==="imagem"){
    ncModal(`<h2>Imagem: ${esc(a.nome)}</h2>
      <p class="desc">Imagem não tem texto para ler. Ela pode ser guardada como anexo de uma demanda nova.</p>
      <img src="${a.dataUrl}" style="max-width:100%;border-radius:10px;border:1px solid var(--border)">
      <div class="field" style="margin-top:12px"><label>Título da demanda</label>
        <input id="arq-tit" value="${esc(a.nome.replace(/\.[^.]+$/,""))}"></div>
      <div class="form-actions">
        <button class="btn" onclick="arqCriarDemanda()">Criar demanda com esta imagem</button>
        <button class="btn ghost" onclick="ncFechar()">Cancelar</button></div>`);
    return;
  }
  const linhas=a.tipo==="tabela"?a.linhas:(a.linhas||[]).map(l=>[l.texto]);
  if(!linhas.length){
    ncModal(`<h2>${esc(a.nome)}</h2>
      <p class="desc">Abri o arquivo, mas não encontrei texto dentro dele.
      ${a.parcial?"Se for um PDF escaneado (foto de papel), o texto não existe como texto — só como imagem.":""}</p>
      <div class="form-actions"><button class="btn ghost" onclick="ncFechar()">Fechar</button></div>`);
    return;
  }
  const amostra=linhas.slice(0,12);
  const tab=a.tipo==="tabela"
    ? `<table class="arq-tab"><tbody>${amostra.map(l=>`<tr>${l.slice(0,6).map(c=>`<td>${esc(String(c).slice(0,42))}</td>`).join("")}</tr>`).join("")}</tbody></table>`
    : `<ul class="arq-lista">${amostra.map(l=>`<li>${esc(String(l[0]).slice(0,90))}</li>`).join("")}</ul>`;
  const cols=a.tipo==="tabela"?(linhas[0]||[]).map((c,i)=>`<option value="${i}">${esc(String(c).slice(0,30))||"coluna "+(i+1)}</option>`).join(""):"";
  ncModal(`<h2>${esc(a.nome)}</h2>
    <p class="desc">Encontrei <b>${linhas.length}</b> linha${linhas.length===1?"":"s"}. Veja o começo:</p>
    <div class="arq-box">${tab}</div>
    ${linhas.length>12?`<p class="desc" style="margin-top:6px">…e mais ${linhas.length-12}.</p>`:""}
    <div class="field" style="margin-top:14px"><label>O que fazer com isso?</label>
      <select id="arq-destino" onchange="arqTrocaDestino()">
        <option value="demanda">Criar UMA demanda, com cada linha virando um item da lista</option>
        <option value="varias">Criar VÁRIAS demandas (uma por linha)</option>
        ${a.tipo==="tabela"?`<option value="mnt">Criar itens de Manutenção e Elétrica</option>`:""}
      </select></div>
    <div id="arq-extra"></div>
    <div class="form-actions">
      <button class="btn" onclick="arqAplicar()">Trazer para o site</button>
      <button class="btn ghost" onclick="ncFechar()">Cancelar</button></div>`);
  arqTrocaDestino();
}
function arqTrocaDestino(){
  const d=document.getElementById("arq-destino").value,ex=document.getElementById("arq-extra");
  const a=ARQ_LIDO,tabela=a.tipo==="tabela";
  const cols=tabela?(a.linhas[0]||[]).map((c,i)=>({i,nome:String(c).slice(0,34)||"Coluna "+(i+1)})):[];
  const sel=(id,rot,padrao)=>`<div class="field"><label>${rot}</label><select id="${id}">
    ${cols.map(c=>`<option value="${c.i}"${c.i===padrao?" selected":""}>${esc(c.nome)}</option>`).join("")}
    <option value="-1">— nenhuma —</option></select></div>`;
  if(d==="demanda")ex.innerHTML=`<div class="field"><label>Título da demanda</label>
    <input id="arq-tit" value="${esc(a.nome.replace(/\.[^.]+$/,""))}"></div>
    ${tabela?`<label class="arq-ck"><input type="checkbox" id="arq-cab" checked> A primeira linha é o cabeçalho (ignorar)</label>`:""}`;
  else if(d==="varias")ex.innerHTML=(tabela?sel("arq-col","Qual coluna vira o título da demanda?",0)+
    `<label class="arq-ck"><input type="checkbox" id="arq-cab" checked> A primeira linha é o cabeçalho (ignorar)</label>`:"");
  else ex.innerHTML=sel("arq-area","Coluna da Área",0)+sel("arq-nc","Coluna do que precisa ser feito",1)+
    sel("arq-acao","Coluna da ação (opcional)",-1)+sel("arq-exec","Coluna do executor (opcional)",-1)+
    `<label class="arq-ck"><input type="checkbox" id="arq-cab" checked> A primeira linha é o cabeçalho (ignorar)</label>`;
}
const arqVal=(l,i)=>i>=0&&l[i]!==undefined?String(l[i]).trim():"";
async function arqAplicar(){
  const a=ARQ_LIDO,d=document.getElementById("arq-destino").value;
  const tabela=a.tipo==="tabela";
  let linhas=tabela?a.linhas:(a.linhas||[]).map(l=>[l.texto]);
  const cab=document.getElementById("arq-cab");
  if(cab&&cab.checked)linhas=linhas.slice(1);
  if(!linhas.length){toast("Nada para trazer");return;}
  if(d==="demanda"){
    const itens=linhas.map((l,idx)=>({uid:newUid(),
      texto:tabela?l.filter(c=>String(c).trim()).join(" · "):String(l[0]),
      feito:false,nivel:(!tabela&&a.linhas[idx+(cab&&cab.checked?1:0)])?(a.linhas[idx+(cab&&cab.checked?1:0)].nivel||0):0,
      tipoLinha:"check"}));
    const o={uid:newUid(),mod:nowISO(),tipo:"dg",loja:dgLojaBase(),criado:"arquivo",escopo:"",ordem:0,
      titulo:(document.getElementById("arq-tit").value||a.nome).trim(),prioridade:"",situacao:"nao_iniciado",
      prazo:"",criadoEm:today(),itens};
    const id=await putItem(o);o.id=id;DATA.push(o);dataChanged();
    ncFechar();DG_ABERTAS[o.uid]=true;showTab("dg");renderDG();
    toast("Demanda criada com "+itens.length+" itens ✓");return;
  }
  if(d==="varias"){
    const ci=tabela?+document.getElementById("arq-col").value:0;
    let n=0;
    for(const l of linhas){
      const t=tabela?arqVal(l,ci):String(l[0]).trim();if(!t)continue;
      const o={uid:newUid(),mod:nowISO(),tipo:"dg",loja:dgLojaBase(),criado:"arquivo",escopo:"",ordem:n,
        titulo:t,prioridade:"",situacao:"nao_iniciado",prazo:"",criadoEm:today(),
        itens:tabela?l.map((c,i)=>i!==ci&&String(c).trim()?{uid:newUid(),texto:String(c).trim(),feito:false,nivel:0,tipoLinha:"check"}:null).filter(Boolean):[]};
      const id=await putItem(o);o.id=id;DATA.push(o);n++;
    }
    dataChanged();ncFechar();showTab("dg");renderDG();toast(n+" demandas criadas ✓");return;
  }
  /* manutenções */
  const iA=+document.getElementById("arq-area").value,iN=+document.getElementById("arq-nc").value;
  const iAc=+document.getElementById("arq-acao").value,iE=+document.getElementById("arq-exec").value;
  let n=0;
  for(const l of linhas){
    const nc=arqVal(l,iN);if(!nc)continue;
    const o={uid:newUid(),mod:nowISO(),tipo:"mnt",loja:currentStore,criado:"arquivo",
      area:arqVal(l,iA),nc,acao:arqVal(l,iAc),rt:RT_INFO||RT_DEFAULT,executor:arqVal(l,iE),
      relato:today(),atualizacao:today(),status:"Pendente"};
    const id=await putItem(o);o.id=id;DATA.push(o);n++;
  }
  dataChanged();ncFechar();showTab("list");render();toast(n+" itens de manutenção criados ✓");
}
async function arqCriarDemanda(){
  const a=ARQ_LIDO;
  const o={uid:newUid(),mod:nowISO(),tipo:"dg",loja:dgLojaBase(),criado:"arquivo",escopo:"",ordem:0,
    titulo:(document.getElementById("arq-tit").value||a.nome).trim(),prioridade:"",situacao:"nao_iniciado",
    prazo:"",criadoEm:today(),itens:[],fotos:[a.dataUrl]};
  const id=await putItem(o);o.id=id;DATA.push(o);dataChanged();
  ncFechar();DG_ABERTAS[o.uid]=true;showTab("dg");renderDG();toast("Demanda criada com a imagem ✓");
}

/* ===== ANEXAR DENTRO DE UM ITEM (demanda, NC ou manutenção) =====
   Mesma leitura de arquivos da tela geral, mas o resultado gruda NAQUELE item:
   imagem vira anexo visual; planilha/Word/PDF viram itens da lista (ou anexo). */
let ANEXO_ALVO=null;
function anexarNoItem(uid){
  ANEXO_ALVO=uid;
  let inp=document.getElementById("anexoInput");
  if(!inp){
    inp=document.createElement("input");inp.type="file";inp.id="anexoInput";inp.style.display="none";
    inp.accept=".csv,.txt,.md,.xlsx,.xlsm,.docx,.pdf,.jpg,.jpeg,.png,.webp";
    inp.onchange=anexoSelecionado;document.body.appendChild(inp);
  }
  inp.value="";inp.click();
}
async function anexoSelecionado(e){
  const f=e.target.files[0];if(!f||!ANEXO_ALVO)return;
  const item=DATA.find(d=>d.uid===ANEXO_ALVO&&!d.deleted);
  if(!item){toast("Item não encontrado");return;}
  toast("Lendo "+f.name+"…");
  try{
    const a=await lerArquivo(f);
    if(a.tipo==="imagem"){
      (item.fotos=item.fotos||[]).push(a.dataUrl);
      item.mod=nowISO();await putItem(item);dataChanged();
      if(typeof renderDG==="function")renderDG();
      if(typeof renderNC==="function"&&item.tipo==="nc")renderNC();
      /* a aba Manutenções também mostra anexo agora (20/07) */
      if(typeof render==="function"&&item.tipo==="mnt")render();
      toast("Imagem anexada ✓");return;
    }
    const linhas=a.tipo==="tabela"?a.linhas.map(l=>l.filter(c=>String(c).trim()).join(" · "))
                                  :(a.linhas||[]).map(l=>l.texto);
    const uteis=linhas.filter(t=>String(t).trim());
    if(!uteis.length){alert("Abri \""+f.name+"\", mas não achei texto dentro.");return;}
    if(item.tipo==="dg"){
      const novos=uteis.map((t,i)=>({uid:newUid(),texto:String(t),feito:false,
        nivel:(a.tipo==="linhas"&&a.linhas[i])?(a.linhas[i].nivel||0):0,tipoLinha:"check"}));
      if(!confirm("Trazer "+novos.length+" linha(s) de \""+f.name+"\" para dentro desta demanda?"))return;
      (item.itens=item.itens||[]).push(...novos);
      item.mod=nowISO();await putItem(item);dataChanged();renderDG();
      toast(novos.length+" itens adicionados ✓");
    }else{
      /* NC e manutenção não têm lista: o conteúdo entra na observação */
      const txtArq=uteis.join("\n");
      if(!confirm("Anexar o conteúdo de \""+f.name+"\" na observação deste item?"))return;
      item.obs=((item.obs||"")+(item.obs?"\n\n":"")+"["+f.name+"]\n"+txtArq).slice(0,20000);
      item.mod=nowISO();await putItem(item);dataChanged();
      if(typeof renderNC==="function")renderNC();
      if(typeof render==="function")render();
      toast("Conteúdo anexado na observação ✓");
    }
  }catch(err){
    alert("Não consegui ler \""+f.name+"\".\n\n"+(err.message||"")+
      "\n\nAceita: Excel (.xlsx), CSV, texto, Word (.docx), PDF de texto e imagens.");
  }
  e.target.value="";ANEXO_ALVO=null;
}
/* mostra os anexos de imagem de um item (usado na demanda) */
function anexosHTML(d){
  if(!d.fotos||!d.fotos.length)return "";
  return `<div class="anexos">${d.fotos.map((f,i)=>
    `<span class="anexo"><img src="${f}" onclick="verImagemGrande('${f}')" title="Clique para ampliar">
      <button onclick="removerAnexo('${d.uid}',${i})" title="Remover">×</button></span>`).join("")}</div>`;
}

/* ===== VISUALIZADOR DE IMAGEM (17/09) =====
   Pedido dela: clicar numa foto anexada tem que abrir de verdade (o antigo
   window.open('') vazio ficava bloqueado pelo navegador) e, uma vez aberta,
   tem que dar pra girar. Uma peça só, reaproveitada em toda foto do site
   (demanda, Não Conformidade, manutenção) em vez de repetir o mesmo código. */
let IMG_VIEWER_GRAUS=0,IMG_VIEWER_SRC=null;
function verImagemGrande(src){
  IMG_VIEWER_GRAUS=0;IMG_VIEWER_SRC=src;
  let m=document.getElementById("img-viewer");
  if(!m){
    m=document.createElement("div");m.id="img-viewer";m.className="bd-visualizador";
    m.onclick=e=>{if(e.target===m)fecharImagemGrande();};
    m.innerHTML=`<button class="bd-visualizador-btn bd-visualizador-x" onclick="fecharImagemGrande()" title="Fechar">×</button>
      <button class="bd-visualizador-btn bd-visualizador-girar" onclick="girarImagemGrande()" title="Girar">⟳</button>
      <button class="bd-visualizador-btn bd-visualizador-marcar" id="img-viewer-marcar" onclick="marcarImagemGrande()" title="Escrever e marcar na foto" aria-label="Escrever e marcar na foto">✏️</button>
      <img id="img-viewer-img" alt="Foto ampliada">`;
    document.body.appendChild(m);
  }
  if(typeof marcarSair==="function")marcarSair();
  document.getElementById("img-viewer-img").src=src;
  document.getElementById("img-viewer-img").style.transform="";
  m.style.display="flex";
}
function girarImagemGrande(){
  if(MARCAR.ativo){toast("Saia da marcação para girar a foto.");return;}
  IMG_VIEWER_GRAUS=(IMG_VIEWER_GRAUS+90)%360;
  document.getElementById("img-viewer-img").style.transform=`rotate(${IMG_VIEWER_GRAUS}deg)`;
}
async function fecharImagemGrande(){
  if(MARCAR.ativo){if(!marcarPodeSair())return;marcarSair();}
  const m=document.getElementById("img-viewer");if(m)m.style.display="none";
  /* GIROU? FICA GIRADA (pedido dela, 24/09: "gira mas nao fixa").
     Antes o giro era so na tela. Agora, ao fechar, a foto girada e gravada
     no lugar da antiga, em toda demanda que usa essa foto — vale para a
     nuvem, para o outro aparelho e para a impressao. */
  const graus=IMG_VIEWER_GRAUS,antiga=IMG_VIEWER_SRC;
  IMG_VIEWER_GRAUS=0;IMG_VIEWER_SRC=null;
  if(!graus||!antiga)return;
  try{
    const nova=await girarFotoGravar(antiga,graus);
    if(await trocarFotoEmTodoLugar(antiga,nova))toast("Foto girada e salva ✓");
  }catch(e){toast("Não consegui salvar a foto girada. Tente de novo.");}
}
/* troca uma foto pela versao nova (girada ou marcada) em TODO lugar que usa
   ela: nos itens guardados, na nuvem e nas miniaturas que ja estao na tela. */
async function trocarFotoEmTodoLugar(antiga,nova){
  const donos=DATA.filter(d=>!d.deleted&&Array.isArray(d.fotos)&&d.fotos.includes(antiga));
  if(!donos.length)return false;
  for(const d of donos){
    d.fotos=d.fotos.map(f=>f===antiga?nova:f);
    d.mod=nowISO();await putItem(d);
  }
  dataChanged();
  /* troca a miniatura na tela sem redesenhar nada (ela nao perde o lugar) */
  document.querySelectorAll("img").forEach(im=>{if(im.getAttribute("src")===antiga)im.src=nova;});
  document.querySelectorAll("[onclick]").forEach(el=>{
    const oc=el.getAttribute("onclick");
    if(oc&&oc.indexOf(antiga)>=0)el.setAttribute("onclick",oc.split(antiga).join(nova));});
  return true;
}
/* desenha a foto INTEIRA girada (nunca cortada: largura e altura trocam) */
function girarFotoGravar(src,graus){
  return new Promise((ok,falha)=>{
    const im=new Image();
    im.onload=()=>{
      const deitada=(graus%180)!==0;
      const cv=document.createElement("canvas");
      cv.width=deitada?im.naturalHeight:im.naturalWidth;
      cv.height=deitada?im.naturalWidth:im.naturalHeight;
      const cx=cv.getContext("2d");
      cx.translate(cv.width/2,cv.height/2);cx.rotate(graus*Math.PI/180);
      cx.drawImage(im,-im.naturalWidth/2,-im.naturalHeight/2);
      const png=/^data:image\/png/i.test(src);
      ok(png?cv.toDataURL("image/png"):cv.toDataURL("image/jpeg",0.92));
    };
    im.onerror=()=>falha(new Error("imagem"));
    im.src=src;
  });
}
/* ═══════════ MARCAR NA FOTO (28/09/26) ═══════════
   Pedido de Le: do lado do botao de girar, poder escrever e circular em
   cima da foto, igual ela faz no papel com caneta vermelha. Caneta livre,
   circulo, seta e texto; desfazer, limpar e salvar. O que ela marca fica
   gravado NA PROPRIA FOTO (vale na nuvem, no celular e na impressao). */
const MARCAR={ativo:false,cor:"#e03131",fator:.010,modo:"caneta",tracos:[],
  cv:null,cx:null,img:null,natW:0,natH:0,desenhando:null};

function marcarImagemGrande(){
  if(MARCAR.ativo){marcarCancelar();return;}
  const m=document.getElementById("img-viewer"),img=document.getElementById("img-viewer-img");
  if(!m||!img)return;
  const entrar=()=>{
    MARCAR.ativo=true;MARCAR.tracos=[];MARCAR.img=img;
    MARCAR.natW=img.naturalWidth||img.width;MARCAR.natH=img.naturalHeight||img.height;
    const cv=document.createElement("canvas");
    cv.id="img-viewer-canvas";cv.className="bd-marcar-tela";
    cv.width=MARCAR.natW;cv.height=MARCAR.natH;
    m.appendChild(cv);MARCAR.cv=cv;MARCAR.cx=cv.getContext("2d");
    cv.addEventListener("pointerdown",marcarComecou);
    cv.addEventListener("pointermove",marcarMoveu);
    cv.addEventListener("pointerup",marcarSoltou);
    cv.addEventListener("pointercancel",marcarSoltou);
    m.appendChild(marcarBarra());
    document.getElementById("img-viewer-marcar").classList.add("ativo");
    window.addEventListener("resize",marcarEncaixar);
    marcarEncaixar();marcarRedesenhar();
  };
  /* girou e ainda nao fixou? grava o giro antes, para marcar na foto de pe */
  if(IMG_VIEWER_GRAUS){
    const graus=IMG_VIEWER_GRAUS,antiga=IMG_VIEWER_SRC;
    girarFotoGravar(antiga,graus).then(async nova=>{
      IMG_VIEWER_GRAUS=0;IMG_VIEWER_SRC=nova;
      await trocarFotoEmTodoLugar(antiga,nova);
      img.style.transform="";
      img.addEventListener("load",entrar,{once:true});
      img.src=nova;
    }).catch(()=>{toast("Não consegui preparar a foto. Tente de novo.");});
    return;
  }
  entrar();
}

/* barra de ferramentas embaixo da foto */
function marcarBarra(){
  const b=document.createElement("div");
  b.id="img-viewer-barra";b.className="bd-marcar-barra";
  const cores=[["#e03131","Vermelho"],["#1971c2","Azul"],["#f59f00","Amarelo"],["#101828","Preto"]];
  b.innerHTML=
    `<button class="bd-marcar-btn ativo" data-modo="caneta" title="Caneta" aria-label="Caneta">✏️</button>`+
    `<button class="bd-marcar-btn" data-modo="circulo" title="Círculo" aria-label="Círculo">◯</button>`+
    `<button class="bd-marcar-btn" data-modo="seta" title="Seta" aria-label="Seta">↗</button>`+
    `<button class="bd-marcar-btn" data-modo="texto" title="Escrever" aria-label="Escrever">T</button>`+
    `<span class="bd-marcar-sep"></span>`+
    cores.map(([c,n],i)=>`<button class="bd-marcar-cor${i===0?" ativo":""}" data-cor="${c}" style="background:${c}" title="${n}" aria-label="Cor ${n}"></button>`).join("")+
    `<span class="bd-marcar-sep"></span>`+
    `<button class="bd-marcar-btn" data-fator=".006" title="Traço fino" aria-label="Traço fino">Fino</button>`+
    `<button class="bd-marcar-btn ativo" data-fator=".010" title="Traço médio" aria-label="Traço médio">Médio</button>`+
    `<button class="bd-marcar-btn" data-fator=".017" title="Traço grosso" aria-label="Traço grosso">Grosso</button>`+
    `<span class="bd-marcar-sep"></span>`+
    `<button class="bd-marcar-btn" id="marcar-desfazer" onclick="marcarDesfazer()" title="Desfazer" aria-label="Desfazer" disabled>↶</button>`+
    `<button class="bd-marcar-btn" onclick="marcarLimpar()" title="Apagar tudo" aria-label="Apagar tudo">🗑️</button>`+
    `<span class="bd-marcar-sep"></span>`+
    `<button class="bd-marcar-btn" onclick="marcarCancelar()">Cancelar</button>`+
    `<button class="bd-marcar-btn bd-marcar-salvar" onclick="marcarSalvar()">Salvar na foto</button>`+
    `<span class="bd-marcar-dica">Arraste em cima da foto para marcar. Depois clique em Salvar na foto.</span>`;
  b.addEventListener("click",e=>{
    const el=e.target.closest("button");if(!el)return;
    if(el.dataset.modo){MARCAR.modo=el.dataset.modo;
      b.querySelectorAll("[data-modo]").forEach(x=>x.classList.toggle("ativo",x===el));}
    if(el.dataset.cor){MARCAR.cor=el.dataset.cor;
      b.querySelectorAll("[data-cor]").forEach(x=>x.classList.toggle("ativo",x===el));}
    if(el.dataset.fator){MARCAR.fator=parseFloat(el.dataset.fator);
      b.querySelectorAll("[data-fator]").forEach(x=>x.classList.toggle("ativo",x===el));}
  });
  return b;
}

/* deixa a folha de marcar exatamente em cima da foto, do tamanho dela */
function marcarEncaixar(){
  if(!MARCAR.ativo||!MARCAR.cv||!MARCAR.img)return;
  const r=MARCAR.img.getBoundingClientRect();
  Object.assign(MARCAR.cv.style,{left:r.left+"px",top:r.top+"px",
    width:r.width+"px",height:r.height+"px"});
}
function marcarPonto(ev){
  const r=MARCAR.cv.getBoundingClientRect();
  return [ (ev.clientX-r.left)*(MARCAR.natW/r.width),
           (ev.clientY-r.top )*(MARCAR.natH/r.height) ];
}
function marcarGrossura(){return Math.max(2,Math.round(Math.max(MARCAR.natW,MARCAR.natH)*MARCAR.fator));}

function marcarComecou(ev){
  if(!MARCAR.ativo)return;
  ev.preventDefault();
  const p=marcarPonto(ev),x=p[0],y=p[1];
  if(MARCAR.modo==="texto"){
    const txt=prompt("Escrever o quê?");
    if(txt&&txt.trim()){
      MARCAR.tracos.push({t:"texto",cor:MARCAR.cor,x:x,y:y,txt:txt.trim(),
        tam:Math.max(14,Math.round(Math.max(MARCAR.natW,MARCAR.natH)*MARCAR.fator*3.2))});
      marcarRedesenhar();
    }
    return;
  }
  try{MARCAR.cv.setPointerCapture(ev.pointerId);}catch(e){}
  const gr=marcarGrossura();
  MARCAR.desenhando = MARCAR.modo==="caneta"
    ? {t:"caneta",cor:MARCAR.cor,gr:gr,pts:[[x,y]]}
    : {t:MARCAR.modo,cor:MARCAR.cor,gr:gr,x1:x,y1:y,x2:x,y2:y};
}
function marcarMoveu(ev){
  if(!MARCAR.desenhando)return;
  ev.preventDefault();
  const p=marcarPonto(ev),d=MARCAR.desenhando;
  if(d.t==="caneta")d.pts.push([p[0],p[1]]);else{d.x2=p[0];d.y2=p[1];}
  marcarRedesenhar();
}
function marcarSoltou(){
  const d=MARCAR.desenhando;if(!d)return;
  MARCAR.desenhando=null;
  const vazio=(d.t==="caneta")?d.pts.length<2:(Math.abs(d.x2-d.x1)<4&&Math.abs(d.y2-d.y1)<4);
  if(!vazio)MARCAR.tracos.push(d);
  marcarRedesenhar();
}
function marcarDesfazer(){MARCAR.tracos.pop();marcarRedesenhar();}
function marcarLimpar(){
  if(!MARCAR.tracos.length)return;
  if(!confirm("Apagar todas as marcas que você fez agora?"))return;
  MARCAR.tracos=[];marcarRedesenhar();
}
function marcarRedesenhar(){
  if(!MARCAR.cx)return;
  MARCAR.cx.clearRect(0,0,MARCAR.natW,MARCAR.natH);
  marcarPintar(MARCAR.cx,MARCAR.tracos.concat(MARCAR.desenhando?[MARCAR.desenhando]:[]));
  const dz=document.getElementById("marcar-desfazer");
  if(dz)dz.disabled=!MARCAR.tracos.length;
}
/* desenha a lista de marcas num contexto (na tela e na hora de gravar) */
function marcarPintar(cx,lista){
  cx.lineCap="round";cx.lineJoin="round";
  for(const d of lista){
    cx.strokeStyle=d.cor;cx.fillStyle=d.cor;cx.lineWidth=d.gr||3;
    if(d.t==="caneta"){
      cx.beginPath();
      d.pts.forEach((pt,i)=>i?cx.lineTo(pt[0],pt[1]):cx.moveTo(pt[0],pt[1]));
      cx.stroke();
    }else if(d.t==="circulo"){
      cx.beginPath();
      cx.ellipse((d.x1+d.x2)/2,(d.y1+d.y2)/2,Math.abs(d.x2-d.x1)/2,Math.abs(d.y2-d.y1)/2,0,0,Math.PI*2);
      cx.stroke();
    }else if(d.t==="seta"){
      const ang=Math.atan2(d.y2-d.y1,d.x2-d.x1),pt=Math.max(d.gr*3.5,12);
      cx.beginPath();cx.moveTo(d.x1,d.y1);cx.lineTo(d.x2,d.y2);cx.stroke();
      cx.beginPath();cx.moveTo(d.x2,d.y2);
      cx.lineTo(d.x2-pt*Math.cos(ang-Math.PI/7),d.y2-pt*Math.sin(ang-Math.PI/7));
      cx.lineTo(d.x2-pt*Math.cos(ang+Math.PI/7),d.y2-pt*Math.sin(ang+Math.PI/7));
      cx.closePath();cx.fill();
    }else if(d.t==="texto"){
      cx.font="700 "+d.tam+"px system-ui,Segoe UI,Arial,sans-serif";
      cx.textBaseline="top";
      cx.lineWidth=Math.max(3,d.tam*.18);cx.strokeStyle="rgba(255,255,255,.92)";
      cx.strokeText(d.txt,d.x,d.y);
      cx.fillStyle=d.cor;cx.fillText(d.txt,d.x,d.y);
    }
  }
}

function marcarPodeSair(){
  if(!MARCAR.ativo||!MARCAR.tracos.length)return true;
  return confirm("Você marcou a foto e ainda não salvou.\n\nSair e perder as marcas?");
}
function marcarCancelar(){if(marcarPodeSair())marcarSair();}
function marcarSair(){
  if(!MARCAR.ativo)return;
  window.removeEventListener("resize",marcarEncaixar);
  const cv=document.getElementById("img-viewer-canvas"),b=document.getElementById("img-viewer-barra"),
        bt=document.getElementById("img-viewer-marcar");
  if(cv)cv.remove();if(b)b.remove();if(bt)bt.classList.remove("ativo");
  MARCAR.ativo=false;MARCAR.tracos=[];MARCAR.desenhando=null;
  MARCAR.cv=null;MARCAR.cx=null;MARCAR.img=null;
}
async function marcarSalvar(){
  if(!MARCAR.tracos.length){toast("Faça uma marca na foto primeiro.");return;}
  const antiga=IMG_VIEWER_SRC,tracos=MARCAR.tracos.slice();
  try{
    const nova=await marcarGravar(antiga,tracos);
    const achou=await trocarFotoEmTodoLugar(antiga,nova);
    IMG_VIEWER_SRC=nova;
    const img=document.getElementById("img-viewer-img");if(img)img.src=nova;
    MARCAR.tracos=[];marcarSair();
    toast(achou?"Foto marcada e salva ✓":"Marca aplicada (esta foto não está guardada em nenhuma demanda)");
  }catch(e){toast("Não consegui salvar a marcação. Tente de novo.");}
}
/* gruda as marcas na foto de verdade, no tamanho original */
function marcarGravar(src,tracos){
  return new Promise(function(ok,falha){
    const im=new Image();
    im.onload=function(){
      const cv=document.createElement("canvas");
      cv.width=im.naturalWidth;cv.height=im.naturalHeight;
      const cx=cv.getContext("2d");
      cx.drawImage(im,0,0);
      marcarPintar(cx,tracos);
      const png=/^data:image\/png/i.test(src);
      ok(png?cv.toDataURL("image/png"):cv.toDataURL("image/jpeg",0.92));
    };
    im.onerror=function(){falha(new Error("imagem"));};
    im.src=src;
  });
}

async function removerAnexo(uid,i){
  const d=DATA.find(x=>x.uid===uid&&!x.deleted);if(!d||!d.fotos)return;
  if(!confirm("Remover este anexo?"))return;
  d.fotos.splice(i,1);d.mod=nowISO();await putItem(d);dataChanged();
  if(typeof renderDG==="function")renderDG();
}

/* ---------- porta de entrada ---------- */
async function lerArquivo(file){
  const nome=file.name,ext=(nome.split(".").pop()||"").toLowerCase();
  if(["jpg","jpeg","png","webp","gif"].includes(ext)){
    const dataUrl=await (typeof ncComprimir==="function"?ncComprimir(file):new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(file);}));
    return {tipo:"imagem",nome,dataUrl};
  }
  if(ext==="csv"||ext==="txt"||ext==="md")return {...lerCSV(await file.text()),nome};
  const buf=await file.arrayBuffer();
  if(ext==="xlsx"||ext==="xlsm")return {...await lerXLSX(buf),nome};
  if(ext==="docx")return {...await lerDOCX(buf),nome};
  if(ext==="pdf")return {...await lerPDF(buf),nome};
  if(ext==="json")return {tipo:"json",nome,texto:await file.text()};
  throw new Error("Não sei ler arquivos ."+ext);
}
