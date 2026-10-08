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
/* ---------- PDF (só os de texto) ----------
   Dois caminhos, nesta ordem:
   1) LEITURA COM FONTE (30/09): separa os objetos do arquivo, descobre qual fonte
      escreve cada pedaço e traduz pela tabela /ToUnicode dela. É isto que faz o PDF
      IMPRESSO PELO NAVEGADOR virar texto — o Chrome embute a fonte e cada letra vira
      um número de desenho, que sem a tradução sai como lixo.
   2) RESERVA: o jeito antigo, que só entende fonte simples (WinAnsiEncoding) — é o
      caso do PDF gerado pelo próprio site (js/pdflite.js).
   PDF escaneado (foto de papel) não tem texto por dentro: os dois devolvem vazio. */
async function lerPDF(buf){
  const bytes=new Uint8Array(buf);
  const cru=new TextDecoder("latin1").decode(bytes);
  let linhas=[];
  try{linhas=await pdfLinhasComFonte(cru,bytes);}catch(e){linhas=[];}
  if(!linhas.length)linhas=await pdfLinhasSimples(cru,bytes);
  return {tipo:"linhas",linhas,parcial:!linhas.length};
}
/* os objetos do arquivo: número -> {dic, dados}. `dados` é o fluxo cru, quando existe.
   O tamanho vem do /Length do próprio objeto; quando ele é indireto (/Length 9 0 R),
   vale até o "endstream". */
function pdfObjetos(cru,bytes){
  const objs={},re=/(\d+)\s+0\s+obj\b/g;let m;
  while((m=re.exec(cru))){
    const num=m[1],p=m.index+m[0].length;
    const iS=cru.indexOf("stream",p),iE=cru.indexOf("endobj",p);
    if(iS>=0&&(iE<0||iS<iE)){
      const dic=cru.slice(p,iS);
      let ini=iS+6;
      if(cru[ini]==="\r")ini++;
      if(cru[ini]==="\n")ini++;
      let tam=+(((dic.match(/\/Length\s+(\d+)(?!\s+\d+\s+R)/)||[])[1])||0);
      if(!tam){const f=cru.indexOf("endstream",ini);tam=f<0?0:f-ini;}
      objs[num]={dic,dados:bytes.slice(ini,ini+tam)};
      re.lastIndex=ini+tam;
    }else objs[num]={dic:cru.slice(p,iE<0?p:iE),dados:null};
  }
  return objs;
}
/* o fluxo de um objeto já virado texto (descomprime quando é /FlateDecode) */
async function pdfFluxo(o){
  if(!o||!o.dados||!o.dados.length)return "";
  if(!/\/Flate/.test(o.dic))return new TextDecoder("latin1").decode(o.dados);
  for(const modo of ["deflate","deflate-raw"]){
    try{
      const r=new Blob([o.dados]).stream().pipeThrough(new DecompressionStream(modo));
      return new TextDecoder("latin1").decode(await new Response(r).arrayBuffer());
    }catch(e){}
  }
  return "";
}
/* o dicionário de uma chave, esteja ele escrito ali dentro ou num objeto à parte */
function pdfSubDic(objs,txt,chave){
  if(!txt)return "";
  const ref=txt.match(new RegExp("\\/"+chave+"\\s+(\\d+)\\s+0\\s+R"));
  if(ref)return objs[ref[1]]?objs[ref[1]].dic:"";
  const i=txt.search(new RegExp("\\/"+chave+"\\s*<<"));
  if(i<0)return "";
  const p=txt.indexOf("<<",i);let nivel=0;
  for(let j=p;j<txt.length-1;j++){
    if(txt[j]==="<"&&txt[j+1]==="<"){nivel++;j++;}
    else if(txt[j]===">"&&txt[j+1]===">"){nivel--;j++;if(!nivel)return txt.slice(p,j+1);}
  }
  return "";
}
/* /ToUnicode: a tabela "número do desenho -> letra", escrita em bfchar/bfrange */
function pdfToUnicode(txt){
  const mapa={};
  const uni=s=>{let o="";for(let i=0;i+3<s.length;i+=4)o+=String.fromCharCode(parseInt(s.slice(i,i+4),16));return o;};
  for(const b of txt.matchAll(/beginbfchar([\s\S]*?)endbfchar/g))
    for(const p of b[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]*)>/g))
      mapa[parseInt(p[1],16)]=uni(p[2]);
  for(const b of txt.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)){
    const re=/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(?:<([0-9A-Fa-f]*)>|\[([\s\S]*?)\])/g;let r;
    while((r=re.exec(b[1]))){
      const a=parseInt(r[1],16),z=parseInt(r[2],16);
      if(r[3]!==undefined&&r[3].length>=4){
        const base=r[3],cabeca=base.slice(0,-4),fim=parseInt(base.slice(-4),16);
        for(let c=a;c<=z&&c-a<65536;c++)
          mapa[c]=uni(cabeca+((fim+(c-a))&0xFFFF).toString(16).padStart(4,"0"));
      }else if(r[4]!==undefined){
        const lista=[...r[4].matchAll(/<([0-9A-Fa-f]*)>/g)].map(x=>uni(x[1]));
        for(let i=0;i<lista.length&&a+i<=z;i++)mapa[a+i]=lista[i];
      }
    }
  }
  return mapa;
}
/* fontes do arquivo: número do objeto -> {dois bytes?, tabela de tradução} */
async function pdfFontes(objs){
  const fs={};
  for(const n of Object.keys(objs)){
    const d=objs[n].dic;
    if(!/\/Type\s*\/Font/.test(d))continue;
    const tu=(d.match(/\/ToUnicode\s+(\d+)\s+0\s+R/)||[])[1];
    fs[n]={dois:/\/Subtype\s*\/Type0/.test(d)||/Identity-[HV]/.test(d),
           mapa:tu?pdfToUnicode(await pdfFluxo(objs[tu])):null};
  }
  return fs;
}
/* percorre as páginas na ordem, cada uma com o conteúdo e as fontes dela */
async function pdfLinhasComFonte(cru,bytes){
  const objs=pdfObjetos(cru,bytes);
  const fontes=await pdfFontes(objs);
  /* sem nenhuma tabela de tradução não é PDF de navegador: deixa para o leitor reserva
     (é o caso do PDF do próprio site, que o jeito antigo já lê bem) */
  if(!Object.keys(fontes).some(n=>fontes[n].mapa))return [];
  const paginas=Object.keys(objs).filter(n=>/\/Type\s*\/Page[\s\/>]/.test(objs[n].dic))
    .sort((a,b)=>+a-+b);
  if(!paginas.length)return [];
  const linhas=[];
  for(const n of paginas){
    const dic=objs[n].dic;
    const porNome={};
    for(const f of pdfSubDic(objs,pdfSubDic(objs,dic,"Resources"),"Font")
        .matchAll(/\/([^\s\/\[\]<>]+)\s+(\d+)\s+0\s+R/g))
      porNome[f[1]]=fontes[f[2]]||null;
    const lista=(dic.match(/\/Contents\s*\[([^\]]*)\]/)||[])[1];
    const ids=lista?[...lista.matchAll(/(\d+)\s+0\s+R/g)].map(x=>x[1])
                   :[...dic.matchAll(/\/Contents\s+(\d+)\s+0\s+R/g)].map(x=>x[1]);
    let conteudo="";
    for(const id of ids)conteudo+=await pdfFluxo(objs[id])+"\n";
    for(const l of pdfLinhasDoConteudo(conteudo,porNome))linhas.push(l);
  }
  return linhas;
}
/* um conteúdo de página -> linhas de texto na ordem do papel.
   Guarda onde cada pedaço foi escrito (x,y) para juntar de volta o que é da mesma
   linha: é assim que a data da direita volta junto da demanda da esquerda. */
function pdfLinhasDoConteudo(txt,porNome){
  const pedacos=[];
  let fonte=null,corpo=12,tl=0,bloco=0;
  /* contas de posição: o Chrome imprime a página de cabeça para baixo (um "cm" que
     inverte o eixo) e ainda muda a escala no meio. Por isso cada pedaço é convertido
     para a posição real no papel antes de comparar. */
  const mul=(m,n)=>[m[0]*n[0]+m[1]*n[2], m[0]*n[1]+m[1]*n[3],
                    m[2]*n[0]+m[3]*n[2], m[2]*n[1]+m[3]*n[3],
                    m[4]*n[0]+m[5]*n[2]+n[4], m[4]*n[1]+m[5]*n[3]+n[5]];
  let ctm=[1,0,0,1,0,0],pilhaCtm=[],tm=[1,0,0,1,0,0],tlm=[1,0,0,1,0,0];
  const letras=(bruto,ehHex)=>{
    const cods=[];
    if(ehHex){
      const h=bruto.replace(/[^0-9A-Fa-f]/g,""),passo=(fonte&&fonte.dois)?4:2;
      for(let i=0;i<h.length;i+=passo)cods.push(parseInt(h.slice(i,i+passo).padEnd(passo,"0"),16));
    }else{
      const s=bruto.replace(/\\n/g,"\n").replace(/\\r/g,"\r").replace(/\\t/g,"\t")
        .replace(/\\(\d{1,3})/g,(_,o)=>String.fromCharCode(parseInt(o,8)))
        .replace(/\\([()\\])/g,"$1");
      if(fonte&&fonte.dois)for(let i=0;i<s.length;i+=2)cods.push((s.charCodeAt(i)<<8)|(s.charCodeAt(i+1)||0));
      else for(let i=0;i<s.length;i++)cods.push(s.charCodeAt(i));
    }
    let out="";
    for(const c of cods){
      if(fonte&&fonte.mapa){const v=fonte.mapa[c];out+=(v===undefined?(fonte.dois?"":String.fromCharCode(c)):v);}
      else out+=String.fromCharCode(c);
    }
    return out;
  };
  const escrever=t=>{
    if(!t)return;
    const m=mul(tm,ctm);
    pedacos.push({x:m[4],y:m[5],g:bloco,t});
  };
  /* leitor de fichas: nomes (/F1), números, textos entre ( ) e < >, [ ] e operadores */
  const re=/\/[^\s\/\[\]<>(){}]+|<[0-9A-Fa-f\s]*>|\((?:\\[\s\S]|[^\\()])*\)|\[|\]|-?\d*\.?\d+|[A-Za-z*'"]+/g;
  let f,pilha=[],arr=null;
  while((f=re.exec(txt))){
    const t=f[0];
    if(t==="["){arr=[];continue;}
    if(t==="]"){pilha.push(arr||[]);arr=null;continue;}
    const ficha=t[0]==="/"?{nome:t.slice(1)}
      :t[0]==="<"?{hex:t}
      :t[0]==="("?{txt:t.slice(1,-1)}
      :/^-?\d*\.?\d+$/.test(t)?{num:+t}:null;
    if(ficha){(arr||pilha).push(ficha);continue;}
    const op=t,p=pilha,ns=p.filter(v=>v&&"num" in v);
    if(op==="q"){pilhaCtm.push(ctm);}
    else if(op==="Q"){if(pilhaCtm.length)ctm=pilhaCtm.pop();}
    else if(op==="cm"){if(ns.length>=6)ctm=mul(ns.slice(-6).map(v=>v.num),ctm);}
    else if(op==="BT"){tm=[1,0,0,1,0,0];tlm=tm;bloco++;}
    else if(op==="Tf"){
      const nm=p.filter(v=>v&&v.nome).pop();if(nm)fonte=porNome[nm.nome]||null;
      if(ns.length)corpo=ns[ns.length-1].num||corpo;
    }
    else if(op==="Td"||op==="TD"){
      const ty=ns.length?ns[ns.length-1].num:0,tx=ns.length>1?ns[ns.length-2].num:0;
      tlm=mul([1,0,0,1,tx,ty],tlm);tm=tlm;if(op==="TD")tl=-ty;
    }
    else if(op==="Tm"){
      if(ns.length>=6){tlm=ns.slice(-6).map(v=>v.num);tm=tlm;}
    }
    else if(op==="TL"){if(ns.length)tl=ns[ns.length-1].num;}
    else if(op==="T*"){tlm=mul([1,0,0,1,0,-tl],tlm);tm=tlm;}
    else if(op==="Tj"||op==="TJ"||op==="'"||op==='"'){
      if(op!=="Tj"&&op!=="TJ"){tlm=mul([1,0,0,1,0,-tl],tlm);tm=tlm;}
      if(op==="TJ"){
        const lista=p.filter(v=>Array.isArray(v)).pop()||[];
        let s="";
        for(const v of lista){
          if(v&&v.hex!==undefined)s+=letras(v.hex,true);
          else if(v&&v.txt!==undefined)s+=letras(v.txt,false);
          else if(v&&"num" in v&&v.num<=-120&&s&&!/\s$/.test(s))s+=" ";
        }
        escrever(s);
      }else{
        const s=p.filter(v=>v&&(v.txt!==undefined||v.hex!==undefined)).pop();
        if(s)escrever(s.hex!==undefined?letras(s.hex,true):letras(s.txt,false));
      }
    }
    pilha=[];arr=null;
  }
  /* de volta à ordem do papel: de cima para baixo, da esquerda para a direita.
     O navegador escreve UMA LETRA POR VEZ, e abre um bloco novo para cada pedaço de
     texto da tela. Letras do mesmo bloco são coladas (os espaços de verdade já vêm
     escritos); entre blocos diferentes entra um espaço — é assim que a data da direita
     não cola no fim da frase. */
  pedacos.sort((a,b)=>Math.abs(a.y-b.y)>2.5?b.y-a.y:a.x-b.x);
  const linhas=[];let alturaAtual=null,blocoAnterior=null,atual="",x0=0,x1=0,partes=[],parte=null;
  /* x0/x1 = onde a linha começa e termina no papel (serve para separar recuo de
     sublista do texto que só virou de linha). `partes` guarda os trechos da mesma
     linha que estão longe um do outro — é o caso da data, na coluna da direita. */
  const fecharParte=()=>{if(parte&&parte.texto.trim())partes.push(parte);parte=null;};
  const fechar=()=>{
    fecharParte();
    if(atual.trim())linhas.push({texto:atual.replace(/\s+/g," ").trim(),nivel:0,x0,x1,
      partes:partes.map(q=>({texto:q.texto.replace(/\s+/g," ").trim(),x0:q.x0,x1:q.x1}))});
    partes=[];
  };
  for(const pd of pedacos){
    if(alturaAtual===null||Math.abs(pd.y-alturaAtual)>2.5){
      fechar();atual=pd.t;alturaAtual=pd.y;x0=pd.x;x1=pd.x;
      parte={texto:pd.t,x0:pd.x,x1:pd.x};
    }else{
      if(pd.x-x1>25){fecharParte();parte={texto:pd.t,x0:pd.x,x1:pd.x};}
      else if(parte){parte.texto+=(pd.g!==blocoAnterior&&!/\s$/.test(parte.texto)&&!/^\s/.test(pd.t)?" ":"")+pd.t;parte.x1=pd.x;}
      x1=pd.x;
      const outroBloco=pd.g!==blocoAnterior;
      atual+=(outroBloco&&!/\s$/.test(atual)&&!/^\s/.test(pd.t)?" ":"")+pd.t;
    }
    blocoAnterior=pd.g;
  }
  fechar();
  return linhas;
}
/* RESERVA: o leitor antigo — serve para PDF de fonte simples, como o do próprio site */
async function pdfLinhasSimples(cru,bytes){
  let texto="";
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
  return linhas;
}
/* ---------- TRANSCREVER A FOLHA IMPRESSA DA MANUTENÇÃO ----------
   Recebe as linhas de lerPDF (cada uma com x0/x1 e os pedaços em .partes) e
   remonta os serviços do jeito que a folha saiu impressa por m28ImprimirFolha
   (js/mnt28.js). Colunas medidas na folha de verdade:
   título de piso 34 · faixa da área 55 · item 75 · continuação 88 ·
   "Obs:" 93 (dobra em 121) · coluna da data 440+ · rodapé 549. */
const M28FL={DATA:440,DOBRA:400,BORDA:428,LETRA:4.4,COLA:35};
function m28fEsc(r){return String(r).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");}
function m28fEsq(l){
  const ps=(l.partes||[]).filter(p=>p.x0<M28FL.DATA);
  let t="";
  for(let i=0;i<ps.length;i++)t+=(i&&ps[i].x0-ps[i-1].x1>M28FL.COLA?" ":"")+ps[i].texto;
  return t.replace(/\s+/g," ").trim();
}
function m28fDir(l){
  return (l.partes||[]).filter(p=>p.x0>=M28FL.DATA).map(p=>p.texto).join(" ").trim();
}
function m28fFim(l){
  const ps=(l.partes||[]).filter(p=>p.x0<M28FL.DATA);
  return ps.length?ps[ps.length-1].x1:0;
}
function m28fIni(l){
  const ps=(l.partes||[]).filter(p=>p.x0<M28FL.DATA);
  return ps.length?ps[0].x0:(l.x0||0);
}
function m28fData(t){
  const m=String(t||"").match(/(\d{2})\/(\d{2})\/(\d{2,4})/);
  if(!m)return "";
  return (m[3].length===2?"20"+m[3]:m[3])+"-"+m[2]+"-"+m[1];
}
/* linha que chega perto da margem direita era dobra de linha (vira espaço);
   linha que termina antes era quebra de verdade (vira linha nova) */
function m28fJuntar(ps){
  let s="";
  ps.forEach((p,i)=>{
    if(!i){s=p.t;return;}
    const palavra=String(p.t).split(/\s+/)[0]||"";
    const cabia=ps[i-1].fim+4+palavra.length*M28FL.LETRA<=M28FL.BORDA;
    s+=(ps[i-1].fim>=M28FL.DOBRA||!cabia?" ":"\n")+p.t;
  });
  return s.replace(/[ \t]+/g," ").replace(/\n{2,}/g,"\n").trim();
}
function m28fRotulosObs(){
  const r=["Obs"];
  try{
    if(typeof m28T==="function"){
      const c=m28T().colObsImp;
      if(c)r.push(String(c).replace(/:\s*$/,""));
    }
  }catch(e){}
  return r;
}
function lerFolhaMnt28(linhas){
  const L=(linhas||[]).filter(l=>l&&l.partes&&l.partes.length);
  if(!L.length)return null;
  if(!L.some(l=>/DATA REGISTRADA/i.test(l.texto||"")))return null;
  const folha={folha:true,loja:"",unidade:"",mes:"",emitido:"",itens:[],areas:[]};
  for(let i=0;i<Math.min(L.length,14);i++){
    const ps=L[i].partes.map(p=>p.texto);
    if(/^LOJA$/i.test(ps[0]||"")&&L[i+1]){
      const q=L[i+1].partes.map(p=>p.texto);
      folha.loja=(q[0]||"").trim();folha.mes=(q[q.length-1]||"").trim();
    }
    if(/^UNIDADE$/i.test(ps[0]||"")&&L[i+1]){
      const q=L[i+1].partes.map(p=>p.texto);
      folha.unidade=(q[0]||"").trim();folha.emitido=(q[q.length-1]||"").trim();
    }
  }
  const obsRot=m28fRotulosObs();
  const ehObs=t=>obsRot.some(r=>new RegExp("^"+m28fEsc(r)+"\\s*:\\s*","i").test(t));
  const semObs=t=>{
    for(const r of obsRot){
      const re=new RegExp("^"+m28fEsc(r)+"\\s*:\\s*","i");
      if(re.test(t))return t.replace(re,"");
    }
    return t;
  };
  let piso="",area="",it=null,emObs=false,emRalos=false;
  const ralosL=[];
  const fecha=()=>{
    if(!it)return;
    it.fazer=m28fJuntar(it._fazer);
    it.obs=m28fJuntar(it._obs);
    delete it._fazer;delete it._obs;
    if(it.fazer)folha.itens.push(it);
    it=null;emObs=false;
  };
  for(const l of L){
    const x=m28fIni(l),esq=m28fEsq(l),dir=m28fDir(l);
    if(!esq)continue;
    if(x>=540||/^\d+\s*\/\s*\d+$/.test(esq))continue;          /* rodapé "3 / 9" */
    if(piso&&x>=108&&x<=132&&l.partes.length>=2)continue;       /* cabeçalho da página */
    if(emRalos){                                                /* texto do manual dos ralos */
      if(/^\d+\s*º?\s*PISO\s+Ralos\b/i.test(esq))break;         /* daqui pra baixo é só a lista de áreas */
      ralosL.push({t:esq,fim:m28fFim(l)});continue;
    }
    if(x<45){                                                   /* títulos grandes */
      if(/^\d+\s*º?\s*PISO$/i.test(esq)){fecha();piso=esq;area="";continue;}
      if(/RASTREAMENTO/i.test(esq)){fecha();emRalos=true;folha.ralosTitulo=esq;continue;}
      continue;
    }
    if(!piso)continue;
    if(x<=62&&/\bserviços?\b/i.test(dir)){                      /* faixa da área */
      fecha();
      const nome=esq.replace(/\s*continuação\s*$/i,"").trim()
        .replace(new RegExp("^"+m28fEsc(piso)+"\\s*","i"),"").trim();
      const total=parseInt((dir.match(/(\d+)\s*serviços?/i)||[])[1]||"0",10);
      if(nome!==area){area=nome;folha.areas.push({piso,area,total});}
      continue;
    }
    const mi=x<=82&&esq.match(/^(✓\s*)?(\d+)\s*\.\s+(.*)$/);
    if(mi&&area){                                               /* serviço numerado */
      fecha();
      let txt=mi[3].trim(),urg=false;
      if(/^URGENTE\b[\s:]*/i.test(txt)){urg=true;txt=txt.replace(/^URGENTE\b[\s:]*/i,"");}
      it={piso,area,num:parseInt(mi[2],10),feito:!!mi[1],urg,fazer:"",obs:"",
          dataRegistro:m28fData(dir),_fazer:[{t:txt,fim:m28fFim(l)}],_obs:[]};
      continue;
    }
    if(it){                                                     /* continuação do serviço */
      if(ehObs(esq)){emObs=true;it._obs.push({t:semObs(esq).trim(),fim:m28fFim(l)});continue;}
      (emObs?it._obs:it._fazer).push({t:esq,fim:m28fFim(l)});
    }
  }
  fecha();
  if(ralosL.length){                                      /* o texto do manual, do jeito que ela escreveu */
    /* "(RDC ...)" e "2." sempre começam linha nova, mesmo depois de uma linha cheia */
    const blocos=[];
    for(const q of ralosL){
      if(!blocos.length||/^(\(|\d+\s*\.\s)/.test(q.t))blocos.push([]);
      blocos[blocos.length-1].push(q);
    }
    folha.ralosTexto=blocos.map(m28fJuntar).join("\n");
  }
  return folha.itens.length?folha:null;
}
/* ---------- TELA: CONFERIR A TRANSCRIÇÃO ANTES DE APLICAR ----------
   O PDF da folha não tem dados escondidos por dentro (é o papel impresso pelo
   navegador). Então o site lê o texto, remonta os serviços (lerFolhaMnt28) e
   mostra AQUI, área por área, o que é novo, o que muda e o que já está igual.
   Nada entra no banco sem ela apertar "Aplicar no site".
   Peças da biblioteca: bd-janela, bd-card, bd-selo, bd-aviso, bd-check, bd-btn. */
let TPD=null;

/* texto comparável: sem travessão (a folha impressa já sai assim), sem acento,
   sem maiúscula e sem pontuação — só o que importa para reconhecer o serviço */
function m28fChave(t){
  let s=String(t||"");
  try{if(typeof m28SemTravessao==="function")s=m28SemTravessao(s);}catch(e){}
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"")
    .replace(/[^a-z0-9]+/g," ").trim();
}
/* a grafia que o site usa para este piso e esta área (a folha sai em maiúscula) */
function m28fGrafia(piso,area){
  let p=piso,a=area;
  try{
    if(typeof m28PisoBonito==="function")p=m28PisoBonito(piso)||piso;
    const por=(typeof m28ListaAreas==="function")?m28ListaAreas():{};
    for(const k of Object.keys(por)){
      if(m28fChave(k)!==m28fChave(piso))continue;
      p=k;
      for(const nome of (por[k]||[]))if(m28fChave(nome)===m28fChave(area)){a=nome;break;}
      break;
    }
  }catch(e){}
  return {piso:p,area:a};
}
function m28fSim(v){return v?"sim":"não";}
/* a data aparece do jeito que ela lê: 28/09/2026 */
function m28fDataBr(d){const m=String(d||"").match(/^(\d{4})-(\d{2})-(\d{2})/);return m?m[3]+"/"+m[2]+"/"+m[1]:String(d||"");}
function transcricaoComparar(folha){
  const jaTem=(typeof m28ItensCru==="function")?m28ItensCru():[];
  const mapa=new Map();
  for(const d of jaTem){
    const ch=m28fChave(d.piso)+"~"+m28fChave(d.area)+"~"+m28fChave(d.fazer);
    if(!mapa.has(ch))mapa.set(ch,d);
  }
  const usados=new Set(),linhas=[];
  folha.itens.forEach((p,i)=>{
    const ch=m28fChave(p.piso)+"~"+m28fChave(p.area)+"~"+m28fChave(p.fazer);
    const alvo=mapa.get(ch)||null;
    if(alvo&&usados.has(ch)){                 /* dois serviços com o mesmo texto: o 2º não repete */
      linhas.push({i,pdf:p,alvo:null,mud:[],estado:"igual",marcado:false});return;
    }
    if(alvo)usados.add(ch);
    const mud=[];
    if(alvo){
      if(!!alvo.feito!==!!p.feito)
        mud.push({campo:"feito",rotulo:"Feito",de:m28fSim(alvo.feito),para:m28fSim(p.feito)});
      if(!!alvo.urg!==!!p.urg)
        mud.push({campo:"urg",rotulo:"Urgente",de:m28fSim(alvo.urg),para:m28fSim(p.urg)});
      if(p.obs&&m28fChave(p.obs)!==m28fChave(alvo.obs))
        mud.push({campo:"obs",rotulo:"Recado",de:alvo.obs||"(vazio)",para:p.obs});
      if(p.dataRegistro&&p.dataRegistro!==String(alvo.dataRegistro||"").slice(0,10))
        mud.push({campo:"dataRegistro",rotulo:"Data registrada",
          de:alvo.dataRegistro?m28fDataBr(alvo.dataRegistro):"(vazia)",para:m28fDataBr(p.dataRegistro)});
    }
    const estado=!alvo?"novo":(mud.length?"atualiza":"igual");
    linhas.push({i,pdf:p,alvo,mud,estado,marcado:estado!=="igual"});
  });
  return linhas;
}
function abrirTranscricaoPDF(folha,nomeArquivo){
  const linhas=transcricaoComparar(folha);
  TPD={folha,linhas,nome:nomeArquivo||""};
  const corte=(s,n)=>{s=String(s||"");return s.length>n?s.slice(0,n-1)+"…":s;};
  const selo={novo:'<span class="bd-selo bd-selo-info"><i></i>NOVO</span>',
    atualiza:'<span class="bd-selo bd-selo-atencao"><i></i>ATUALIZA</span>',
    igual:'<span class="bd-selo bd-selo-ok"><i></i>IGUAL</span>'};
  const nNovo=linhas.filter(l=>l.estado==="novo").length;
  const nAtu=linhas.filter(l=>l.estado==="atualiza").length;
  const nIgual=linhas.filter(l=>l.estado==="igual").length;
  const grupos=[];
  for(const l of linhas){
    const k=l.pdf.piso+" | "+l.pdf.area;
    let g=grupos.find(x=>x.k===k);
    if(!g){g={k,piso:l.pdf.piso,area:l.pdf.area,linhas:[]};grupos.push(g);}
    g.linhas.push(l);
  }
  const linhaHTML=l=>{
    if(l.estado==="igual")return "";
    const p=l.pdf;
    return `<label class="tpd-linha bd-check-linha">
      <input type="checkbox" class="bd-check tpd-cx" data-i="${l.i}"${l.marcado?" checked":""}>
      <span class="bd-check-txt">
        <span class="tpd-topo">${selo[l.estado]}${p.urg?'<span class="bd-selo bd-selo-erro"><i></i>URGENTE</span>':""}${p.feito?'<span class="bd-selo bd-selo-ok"><i></i>FEITO</span>':""}</span>
        <span class="tpd-fazer">${esc(corte(p.fazer,220))}</span>
        ${p.obs?`<span class="tpd-obs">Recado: ${esc(corte(p.obs,160))}</span>`:""}
        ${p.dataRegistro?`<span class="tpd-obs">Data registrada: ${esc(m28fDataBr(p.dataRegistro))}</span>`:""}
        ${l.mud.length?`<span class="tpd-mud">${l.mud.map(m=>`<b>${esc(m.rotulo)}:</b> ${esc(corte(m.de,60))} → ${esc(corte(m.para,60))}`).join("<br>")}</span>`:""}
      </span></label>`;
  };
  const grupoHTML=g=>{
    const n=g.linhas.filter(l=>l.estado!=="igual").length;
    const ig=g.linhas.length-n;
    return `<div class="bd-card tpd-card">
      <div class="bd-card-topo"><div class="bd-card-tit">${esc(g.area||"(sem área)")}</div>
        <div class="bd-card-sub">${esc(g.piso)} · ${g.linhas.length} ${g.linhas.length===1?"serviço":"serviços"} na folha${ig?` · ${ig} já igual${ig>1?"is":""}`:""}</div></div>
      ${n?`<div class="bd-card-corpo tpd-corpo">${g.linhas.map(linhaHTML).join("")}</div>`
        :`<div class="bd-card-corpo tpd-corpo"><p class="tpd-nada">Nada a mudar nesta área.</p></div>`}
    </div>`;
  };
  const lojaDif=folha.loja&&currentStore&&m28fChave(folha.loja)!==m28fChave(currentStore);
  /* texto do manual dos ralos: só aparece quando é diferente do que o site tem */
  const rl=transcricaoRalos(folha);
  const rlHTML=rl?`<div class="bd-card tpd-card">
      <div class="bd-card-topo"><div class="bd-card-tit">Texto do Rastreamento de Ralos</div>
        <div class="bd-card-sub">o manual que sai uma vez só, no fim da folha</div></div>
      <div class="bd-card-corpo tpd-corpo"><label class="tpd-linha bd-check-linha">
        <input type="checkbox" class="bd-check tpd-rl" checked>
        <span class="bd-check-txt">
          <span class="tpd-topo"><span class="bd-selo bd-selo-atencao"><i></i>ATUALIZA</span></span>
          <span class="tpd-fazer" style="white-space:pre-wrap">${esc(rl.texto)}</span>
          ${rl.atual?`<span class="tpd-obs" style="white-space:pre-wrap">No site hoje: ${esc(corte(rl.atual,300))}</span>`:""}
        </span></label></div></div>`:"";
  const corpo=`
    <div class="bd-kpis rec-kpis">
      <div class="bd-kpi"><div class="bd-kpi-nome">Novos</div><div class="bd-kpi-num">${nNovo}</div></div>
      <div class="bd-kpi"><div class="bd-kpi-nome">Atualizam</div><div class="bd-kpi-num">${nAtu}</div></div>
      <div class="bd-kpi"><div class="bd-kpi-nome">Já iguais</div><div class="bd-kpi-num">${nIgual}</div></div>
    </div>
    ${lojaDif?`<div class="bd-aviso bd-aviso-erro rec-bloco"><span class="bd-aviso-ico">!</span>
      <div><b>Esta folha é de outra loja</b>A folha diz <b>${esc(folha.loja)}</b> e você está em <b>${esc(currentStore)}</b>. Se aplicar, os serviços entram na loja aberta agora.</div></div>`:""}
    <div class="bd-aviso bd-aviso-info rec-bloco"><span class="bd-aviso-ico">i</span>
      <div><b>As fotos não vêm no PDF</b>O papel traz o texto. As fotos que já estão no site continuam lá, nada é apagado.</div></div>
    <div class="tpd-acoes">
      <button class="bd-btn bd-btn-secundario bd-btn-p tpd-todos">Marcar todos</button>
      <button class="bd-btn bd-btn-fantasma bd-btn-p tpd-nenhum">Desmarcar todos</button>
    </div>
    ${rlHTML}
    ${grupos.map(grupoHTML).join("")}`;
  const m=document.createElement("div");
  m.className="bd-fundo rec-fundo";
  m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");
  m.setAttribute("aria-label","Transcrição do PDF");
  m.innerHTML=`<div class="bd-janela rec-janela tpd-janela" onclick="event.stopPropagation()">
      <div class="bd-janela-topo"><div><b>Transcrição do PDF</b>
        <div class="rec-sub">${esc(folha.unidade||"")}${folha.mes?" · "+esc(folha.mes):""} · ${linhas.length} ${linhas.length===1?"serviço lido":"serviços lidos"}</div></div>
        <button class="bd-janela-x" aria-label="Fechar">✕</button></div>
      <div class="bd-janela-corpo rec-corpo">${corpo}</div>
      <div class="bd-janela-rodape">
        <button class="bd-btn bd-btn-secundario tpd-cancelar">Cancelar</button>
        <button class="bd-btn bd-btn-principal tpd-ok">Aplicar no site</button></div>
    </div>`;
  const focoAnterior=document.activeElement;
  const fechar=()=>{m.remove();document.removeEventListener("keydown",tecla);TPD=null;
    if(focoAnterior&&focoAnterior.focus)focoAnterior.focus();};
  const tecla=ev=>{
    if(ev.key==="Escape"){fechar();return;}
    if(ev.key!=="Tab")return;
    const f=m.querySelectorAll("button, input");
    if(!f.length)return;
    const pri=f[0],ult=f[f.length-1];
    if(ev.shiftKey&&document.activeElement===pri){ev.preventDefault();ult.focus();}
    else if(!ev.shiftKey&&document.activeElement===ult){ev.preventDefault();pri.focus();}
  };
  m.onclick=()=>{};   /* clique fora NAO fecha: ela nao perde o que marcou sem querer */
  m.querySelector(".bd-janela-x").onclick=fechar;
  m.querySelector(".tpd-cancelar").onclick=fechar;
  const marcar=v=>m.querySelectorAll(".tpd-cx").forEach(c=>{c.checked=v;});
  m.querySelector(".tpd-todos").onclick=()=>marcar(true);
  m.querySelector(".tpd-nenhum").onclick=()=>marcar(false);
  m.querySelector(".tpd-ok").onclick=async()=>{
    const escolhidos=[...m.querySelectorAll(".tpd-cx")].filter(c=>c.checked).map(c=>+c.dataset.i);
    const cRl=m.querySelector(".tpd-rl"),querRl=!!(cRl&&cRl.checked);
    if(!escolhidos.length&&!querRl){alert("Nada está marcado, então não há o que aplicar.");return;}
    const bt=m.querySelector(".tpd-ok");bt.disabled=true;bt.classList.add("bd-btn-carregando");
    try{ await aplicarTranscricaoPDF(escolhidos,querRl); fechar(); }
    catch(err){ bt.disabled=false;bt.classList.remove("bd-btn-carregando");
      alert("Não consegui aplicar agora.\n\n"+(err.message||"")); }
  };
  document.addEventListener("keydown",tecla);
  document.body.appendChild(m);
  m.querySelector(".tpd-ok").focus();
}
/* O texto do manual dos ralos que veio no PDF, quando é diferente do que o site
   tem hoje. Devolve null quando o PDF não trouxe o texto ou já está igual. */
function transcricaoRalos(folha){
  const novo=String((folha&&folha.ralosTexto)||"").trim();
  if(!novo)return null;
  let atual="";
  try{if(typeof m28T==="function")atual=String(m28T().ralosTexto||"").trim();}catch(e){}
  if(m28fChave(atual)===m28fChave(novo))return null;
  return {texto:novo,atual};
}
/* grava só o texto do manual; o resto da configuração dos ralos não é tocado */
async function aplicarTextoRalos(texto){
  if(typeof m28Config==="function")await m28Config();
  const padrao=(typeof M28_TXT_PADRAO!=="undefined")?M28_TXT_PADRAO:{};
  const novo=Object.assign({},(typeof m28T==="function")?m28T():{});
  novo.ralosTexto=texto;
  const guardar={};
  for(const k in padrao)if(novo[k]&&novo[k]!==padrao[k])guardar[k]=novo[k];
  await (typeof folhasCfgSet==="function"?folhasCfgSet:metaSetU)("mnt28Textos",guardar);
  if(typeof M28_TXT!=="undefined")M28_TXT=Object.assign({},padrao,guardar);
}
/* grava no banco só o que ela deixou marcado */
async function aplicarTranscricaoPDF(escolhidos,querRalos){
  if(!TPD)return;
  if(querRalos){const r=transcricaoRalos(TPD.folha);if(r)await aplicarTextoRalos(r.texto);}
  const antes=new Map(DATA.filter(d=>d.uid).map(d=>[d.uid,d.fazer||d.nc||""]));
  const tocados=[];
  for(const i of escolhidos){
    const l=TPD.linhas[i];if(!l)continue;
    const p=l.pdf;
    if(l.alvo){                                   /* já existe: muda só o que veio diferente */
      const d=l.alvo;
      for(const mm of l.mud){
        if(mm.campo==="feito")d.feito=!!p.feito;
        else if(mm.campo==="urg")d.urg=!!p.urg;
        else if(mm.campo==="obs")d.obs=p.obs;
        else if(mm.campo==="dataRegistro")d.dataRegistro=p.dataRegistro;
      }
      d.mod=nowISO();
      await putItem(d);
      tocados.push({uid:d.uid,fazer:d.fazer});
      continue;
    }
    const g=m28fGrafia(p.piso,p.area);            /* novo: mesmo molde do botão "novo serviço" */
    const o={uid:newUid(),mod:nowISO(),tipo:"mnt28",loja:currentStore,
      piso:g.piso,area:g.area,fazer:p.fazer,obs:p.obs||"",nota:"",
      dataRegistro:p.dataRegistro||"",fotos:[],origem:"",
      executor:(DATA.find(d=>d.tipo==="mnt28"&&d.loja===currentStore&&d.executor&&(typeof m28DoSetor!=="function"||m28DoSetor(d)))||{}).executor||"",
      feito:!!p.feito,urg:!!p.urg,
      ordem:((typeof m28PosArea==="function"?m28PosArea(g.piso,g.area):999)*1000)+900+Math.min(p.num||0,99),
      relato:p.dataRegistro||today(),criado:"pdf"};
    if(typeof M28_SETOR!=="undefined"&&M28_SETOR==="ele")o.setor="eletrica";
    const id=await putItem(o);o.id=id;DATA.push(o);
    tocados.push({uid:o.uid,fazer:o.fazer});
    /* se há um mês aberto, o serviço novo entra na lista daquele mês na hora */
    try{
      const fMes=(typeof M28_FOLHA_ABERTA!=="undefined"&&M28_FOLHA_ABERTA)&&m28AcharFolha(M28_FOLHA_ABERTA);
      if(fMes&&fMes.competencia&&fMes.status==="andamento"){
        fMes.itens=[...(fMes.itens||[]),o.uid];
        fMes.total=fMes.itens.length;fMes.mod=nowISO();
        await putItem(fMes);
      }
    }catch(e){}
  }
  dataChanged();
  try{if(typeof renderMnt28==="function")await renderMnt28();}catch(e){}
  if(typeof reciboDaImportacao==="function")reciboDaImportacao(tocados,antes);
  else toast(tocados.length+" serviço(s) atualizado(s)");
}
/* Lê o TEXTO de um PDF impresso pelo navegador e devolve a folha remontada
   (ou null quando não é a folha da manutenção / não dá para ler o texto). */
async function lerFolhaImpressa(buf){
  try{
    const r=await lerPDF(buf);
    if(!r||!r.linhas||!r.linhas.length)return null;
    return lerFolhaMnt28(r.linhas);
  }catch(e){return null;}
}
/* ---------- DADOS ESCONDIDOS NO PDF DO PRÓPRIO SITE ----------
   O PDF gerado por pdfDeTodasAsAbas leva dentro um bloco (base64 de JSON comprimido)
   entre %NPDADOS-BEGIN e %NPDADOS-END. Devolve o envelope de atualização, ou null
   se o PDF não veio do site. */
async function lerDadosDoPDF(buf){
  try{
    const cru=new TextDecoder("latin1").decode(new Uint8Array(buf));
    const m=cru.match(/%NPDADOS-BEGIN\s*([A-Za-z0-9+\/=\s]+?)\s*%NPDADOS-END/);
    if(!m)return null;
    const bin=atob(m[1].replace(/\s+/g,"")),u8=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
    const r=new Blob([u8]).stream().pipeThrough(new DecompressionStream("gzip"));
    const env=JSON.parse(await new Response(r).text());
    return (env&&Array.isArray(env.itens))?env:null;
  }catch(e){return null;}
}
/* o contrário: envelope -> texto base64 (gzip) para esconder no PDF */
async function empacotarDadosPDF(env){
  const r=new Blob([JSON.stringify(env)]).stream().pipeThrough(new CompressionStream("gzip"));
  const u8=new Uint8Array(await new Response(r).arrayBuffer());
  let bin="";for(let i=0;i<u8.length;i+=8192)bin+=String.fromCharCode.apply(null,u8.subarray(i,i+8192));
  return btoa(bin);
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
    /* PDF que o próprio site gerou: atualiza igual ao .json, pelo mesmo caminho */
    if(/\.pdf$/i.test(f.name)&&await lerDadosDoPDF(await f.arrayBuffer())){
      const imp=document.getElementById("importFile"),dt=new DataTransfer();
      dt.items.add(f);imp.files=dt.files;ncFechar();imp.dispatchEvent(new Event("change"));return;
    }
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
