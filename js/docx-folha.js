/* =====================================================================
   WORD IDÊNTICO AO PDF (01/10/2026) — pedido dela: "extremamente importante,
   quando eu colocar para Word eu quero que baixe um documento exatamente
   igual ao PDF, não uma cópia parecida, para eu conseguir editar".

   COMO: este arquivo NÃO reconstrói a folha. Ele LÊ a folha já paginada que o
   PDF usa (a janela de impressão, com .folha / .capa / .grupo / .li ...) e
   copia cada caixa para o Word: mesmas quebras de página, mesmas cores,
   mesmos tamanhos de letra, mesmas larguras de coluna (medidas no próprio
   navegador) e as fotos no tamanho que estão na folha. Tudo vira tabela e
   parágrafo de Word de verdade, então ela edita à vontade.

   Se o visual do PDF mudar (layout da capa, cores...), o Word acompanha sozinho,
   porque lê os estilos calculados e não uma cópia deles.

   Limites do Word (não existem lá): cantos arredondados e degradê/foto de fundo
   da capa — a capa sai com a cor sólida mais próxima.

   Uso: const blob = await m28DomParaDocx(janelaDaFolha);
   ===================================================================== */
(function(){
"use strict";
const FONTE="Segoe UI";
const TW=15;                         /* 1 px = 15 twips (96 dpi) */
const tw=px=>Math.max(0,Math.round(px*TW));
const esc=s=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

/* ---------- cores ---------- */
function rgba(css){
  const m=/rgba?\(([^)]+)\)/.exec(css||"");if(!m)return null;
  const p=m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);
  return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};
}
const hx=n=>Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,"0").toUpperCase();
function hex(css,sobre){                /* css -> "RRGGBB"; mistura com o fundo se for translúcida */
  const c=rgba(css);if(!c||c.a===0)return null;
  if(c.a<1){const b=rgba(sobre)||{r:255,g:255,b:255};
    return hx(c.r*c.a+b.r*(1-c.a))+hx(c.g*c.a+b.g*(1-c.a))+hx(c.b*c.a+b.b*(1-c.a));}
  return hx(c.r)+hx(c.g)+hx(c.b);
}

/* ---------- parágrafos e trechos ---------- */
function rPr(o){
  o=o||{};
  return "<w:rPr><w:rFonts w:ascii=\""+(o.fonte||FONTE)+"\" w:hAnsi=\""+(o.fonte||FONTE)+"\" w:cs=\""+(o.fonte||FONTE)+"\"/>"
    +(o.bold?"<w:b/><w:bCs/>":"")+(o.italic?"<w:i/>":"")
    +(o.color?"<w:color w:val=\""+o.color+"\"/>":"")
    +(o.ls?"<w:spacing w:val=\""+o.ls+"\"/>":"")
    +"<w:sz w:val=\""+o.sz+"\"/><w:szCs w:val=\""+o.sz+"\"/>"
    +(o.borda?"<w:bdr w:val=\"single\" w:sz=\"4\" w:space=\"0\" w:color=\""+o.borda+"\"/>":"")
    +(o.fundo?"<w:shd w:val=\"clear\" w:color=\"auto\" w:fill=\""+o.fundo+"\"/>":"")
    +"</w:rPr>";
}
function run(txt,o){
  if(txt===""||txt==null)return "";
  const partes=String(txt).split("\n");
  return partes.map((t,i)=>"<w:r>"+rPr(o)+(i?"<w:br/>":"")+(t===""?"":"<w:t xml:space=\"preserve\">"+esc(t)+"</w:t>")+"</w:r>").join("");
}
/* o formato de um trecho de texto, lido do estilo calculado do elemento onde ele mora */
function fmt(win,el,sobre){
  const cs=win.getComputedStyle(el);
  const px=parseFloat(cs.fontSize)||13;
  const fundo=hex(cs.backgroundColor,sobre||"rgb(255,255,255)");
  const ls=parseFloat(cs.letterSpacing);
  const bw=parseFloat(cs.borderTopWidth)||0;
  return {sz:Math.max(2,Math.round(px*1.5)),bold:(parseInt(cs.fontWeight,10)||400)>=600,
    italic:cs.fontStyle==="italic",color:hex(cs.color,sobre)||"000000",
    ls:isFinite(ls)&&ls>0?Math.round(ls*TW):0,caps:cs.textTransform==="uppercase",
    pre:/pre/.test(cs.whiteSpace),fundo:fundo,
    borda:(bw>0&&cs.borderTopStyle!=="none"&&el.tagName!=="DIV")?hex(cs.borderTopColor,sobre):null,
    lh:parseFloat(cs.lineHeight)||px*1.5,
    alinha:cs.textAlign,cs:cs};
}
function pPr(o){
  o=o||{};
  let x="";
  if(o.keepNext)x+="<w:keepNext/>";
  if(o.quebra)x+="<w:pageBreakBefore/>";
  if(o.borda)x+="<w:pBdr>"+o.borda+"</w:pBdr>";
  if(o.fundo)x+="<w:shd w:val=\"clear\" w:color=\"auto\" w:fill=\""+o.fundo+"\"/>";
  x+="<w:spacing w:before=\""+(o.antes||0)+"\" w:after=\""+(o.depois||0)+"\" w:line=\""+(o.linha||240)+"\" w:lineRule=\""+(o.exato?"exact":"auto")+"\"/>";
  if(o.ind)x+="<w:ind w:left=\""+(o.ind.l||0)+"\" w:right=\""+(o.ind.r||0)+"\""+(o.ind.h?" w:hanging=\""+o.ind.h+"\"":"")+"/>";
  x+="<w:jc w:val=\""+(o.jc||"left")+"\"/>";
  return "<w:pPr>"+x+(o.rpr||"")+"</w:pPr>";
}
const para=(runs,o)=>"<w:p>"+pPr(o)+runs+"</w:p>";
/* parágrafo vazio de altura exata (px): é o "espaço" entre dois blocos, e impede o Word de grudar tabelas */
const espaco=(px,quebra)=>para("",{exato:1,linha:Math.max(20,tw(px)),quebra:quebra,rpr:"<w:rPr><w:sz w:val=\"2\"/></w:rPr>"});
const JC={left:"left",start:"left",right:"right",end:"right",center:"center",justify:"both"};

/* ---------- tabelas ---------- */
const bd=(lado,b)=>b?"<w:"+lado+" w:val=\"single\" w:sz=\""+b.sz+"\" w:space=\"0\" w:color=\""+b.cor+"\"/>"
                    :"<w:"+lado+" w:val=\"nil\"/>";
function celula(c){
  const m=c.mar||{};
  return "<w:tc><w:tcPr><w:tcW w:w=\""+c.w+"\" w:type=\"dxa\"/>"
    +(c.span>1?"<w:gridSpan w:val=\""+c.span+"\"/>":"")
    +"<w:tcBorders>"+["top","left","bottom","right"].map(l=>(c.b&&c.b[l])?bd(l,c.b[l]):"").join("")+"</w:tcBorders>"
    +(c.fundo?"<w:shd w:val=\"clear\" w:color=\"auto\" w:fill=\""+c.fundo+"\"/>":"")
    +"<w:tcMar><w:top w:w=\""+(m.t||0)+"\" w:type=\"dxa\"/><w:left w:w=\""+(m.l||0)+"\" w:type=\"dxa\"/>"
    +"<w:bottom w:w=\""+(m.b||0)+"\" w:type=\"dxa\"/><w:right w:w=\""+(m.r||0)+"\" w:type=\"dxa\"/></w:tcMar>"
    +"<w:vAlign w:val=\""+(c.v||"top")+"\"/></w:tcPr>"+(c.xml||para(""))+"</w:tc>";
}
function tabela(linhas,larguras,o){
  o=o||{};
  const tot=larguras.reduce((a,b)=>a+b,0);
  let x="<w:tbl><w:tblPr><w:tblW w:w=\""+tot+"\" w:type=\"dxa\"/><w:tblInd w:w=\"0\" w:type=\"dxa\"/>"
    +"<w:tblBorders>"+["top","left","bottom","right","insideH","insideV"].map(l=>bd(l,o.borda&&o.borda[l])).join("")+"</w:tblBorders>"
    +"<w:tblLayout w:type=\"fixed\"/>"
    +"<w:tblCellMar><w:top w:w=\"0\" w:type=\"dxa\"/><w:left w:w=\"0\" w:type=\"dxa\"/><w:bottom w:w=\"0\" w:type=\"dxa\"/><w:right w:w=\"0\" w:type=\"dxa\"/></w:tblCellMar>"
    +"</w:tblPr><w:tblGrid>"+larguras.map(w=>"<w:gridCol w:w=\""+w+"\"/>").join("")+"</w:tblGrid>";
  for(const l of linhas)x+="<w:tr><w:trPr><w:cantSplit/></w:trPr>"+l.map(celula).join("")+"</w:tr>";
  return x+"</w:tbl>";
}
/* converte medidas em px (que somam a largura real da caixa) em twips que somam EXATO "total" */
function escalar(pxs,total){
  const s=pxs.reduce((a,b)=>a+b,0)||1;
  const t=pxs.map(p=>Math.round(p/s*total));
  t[t.length-1]+=total-t.reduce((a,b)=>a+b,0);
  return t;
}

/* ---------- imagens ---------- */
async function bytesDaFoto(win,img){
  const m=/^data:image\/(png|jpe?g);base64,(.*)$/s.exec(img.src);
  let ext,b64;
  if(m){ext=m[1]==="png"?"png":"jpeg";b64=m[2];}
  else{ /* webp etc.: passa por canvas e vira JPEG */
    const cv=win.document.createElement("canvas");
    cv.width=img.naturalWidth;cv.height=img.naturalHeight;
    cv.getContext("2d").drawImage(img,0,0);
    ext="jpeg";b64=cv.toDataURL("image/jpeg",.92).split(",")[1];
  }
  const bin=atob(b64),dados=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)dados[i]=bin.charCodeAt(i);
  return {ext,dados};
}

/* ---------- a exportação ---------- */
window.m28DomParaDocx=async function(win,modoImagem){
  const D=win.document;
  const alvo=D.getElementById("alvo");
  const folhas=Array.from(alvo.querySelectorAll(".folha"));
  if(!folhas.length)throw new Error("Folha ainda não montada");
  const doc=new DocxLite();
  doc.fonte=FONTE;
  const LARG=10546;                                  /* 186 mm de texto em twips */
  const R=el=>el.getBoundingClientRect();
  const cs=el=>win.getComputedStyle(el);

  /* ---- foto: parágrafo com todas as imagens de uma demanda ---- */
  async function fotos(fts,indL,quebra){
    const imgs=Array.from(fts.querySelectorAll("img"));
    let runs="";
    for(const img of imgs){
      const r=R(img);
      const {ext,dados}=await bytesDaFoto(win,img);
      const n=doc.media.length+1,rid="rImg"+n,nome="image"+n+"."+ext;
      doc.media.push({name:nome,data:dados,rid:rid});
      const cx=Math.round(r.width*9525),cy=Math.round(r.height*9525);
      runs+="<w:r><w:drawing><wp:inline distT=\"0\" distB=\"0\" distL=\"0\" distR=\"0\"><wp:extent cx=\""+cx+"\" cy=\""+cy+"\"/>"
        +"<wp:docPr id=\""+n+"\" name=\""+nome+"\"/><a:graphic><a:graphicData uri=\"http://schemas.openxmlformats.org/drawingml/2006/picture\">"
        +"<pic:pic><pic:nvPicPr><pic:cNvPr id=\""+n+"\" name=\""+nome+"\"/><pic:cNvPicPr/></pic:nvPicPr>"
        +"<pic:blipFill><a:blip r:embed=\""+rid+"\"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>"
        +"<pic:spPr><a:xfrm><a:off x=\"0\" y=\"0\"/><a:ext cx=\""+cx+"\" cy=\""+cy+"\"/></a:xfrm><a:prstGeom prst=\"rect\"><a:avLst/></a:prstGeom>"
        +"<a:ln w=\"9525\"><a:solidFill><a:srgbClr val=\"EAECF0\"/></a:solidFill></a:ln></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>"
        +run("  ",{sz:8});
    }
    /* "+N no site" */
    const nota=fts.querySelector(":scope > i");
    if(nota){const f=fmt(win,nota);runs+=run(nota.textContent,{sz:f.sz,color:f.color});}
    return para(runs,{antes:tw(parseFloat(cs(fts).marginTop)||5),ind:{l:indL||0},linha:240});
  }

  /* ---- texto corrido de um elemento: percorre os filhos, trecho a trecho ---- */
  function trechos(el,sobre,ignora){
    let x="";
    const anda=(n)=>{
      if(n.nodeType===3){
        const pai=n.parentNode,f=fmt(win,pai,sobre);
        let t=n.textContent;
        if(!f.pre)t=t.replace(/\s+/g," ");
        if(f.caps)t=t.toUpperCase();
        if(t!=="")x+=run(t,{sz:f.sz,bold:f.bold,italic:f.italic,color:f.color,ls:f.ls,
          fundo:pai!==el?f.fundo:null,borda:pai!==el?f.borda:null});
        return;
      }
      if(n.nodeType!==1)return;
      if(n.tagName==="IMG"||(ignora&&ignora(n)))return;
      if(n.classList.contains("fts"))return;
      for(const c of n.childNodes)anda(c);
    };
    for(const c of el.childNodes)anda(c);
    return x;
  }

  /* ---- uma demanda (.li) ---- */
  async function linhaLi(li,ultima,quebra){
    const rl=li.classList.contains("rl");
    const kids=Array.from(li.children);
    const [c,nm,f]=kids,q=(kids[3]&&cs(kids[3]).display!=="none")?kids[3]:null;
    const L=R(li),px=[R(nm).left-L.left,R(f).left-R(nm).left,(q?R(q).left:L.right)-R(f).left];
    if(q)px.push(L.right-R(q).left);
    const pad=parseFloat(cs(li).paddingLeft)||11,padV=parseFloat(cs(li).paddingTop)||10;
    const gap=parseFloat(cs(li).columnGap)||7;
    const larg=escalar(px,LARG);
    px.length=0;
    const marV=tw(padV);
    const borda=ultima?null:{sz:6,cor:hex(cs(li).borderBottomColor)||"C3CCD4"};
    const fn=fmt(win,nm);
    const fc=fmt(win,li.querySelector(".bx"));
    const marcado=!!li.querySelector(".bx").textContent.trim();
    const cx=para(run(marcado?"☑":"☐",{sz:Math.round(parseFloat(cs(li.querySelector(".bx")).fontSize)*1.5)+2,
        color:marcado?"067647":"667085",fonte:"Segoe UI Symbol"}),
      {jc:"center",exato:1,linha:tw(fn.lh),quebra:quebra});
    const num=para(run(nm.textContent,{sz:fn.sz,bold:fn.bold,color:fn.color}),{jc:"right",exato:1,linha:tw(fn.lh),quebra:quebra});
    /* a coluna do serviço: frase (com a etiqueta URGENTE), recado, fotos */
    const ff=fmt(win,f);
    const obs=f.querySelector(".obs-p");
    let sv=para(trechos(f,null,n=>n===obs||n.classList.contains("obs-p")),{exato:1,linha:tw(ff.lh),quebra:quebra});
    if(obs){
      const b=obs.querySelector("b"),fo=fmt(win,obs),fb=fmt(win,b);
      const ind=Math.ceil(R(b).width+(parseFloat(cs(obs).columnGap)||8))+1;
      const pill=run(" "+b.textContent+" ",{sz:fb.sz,bold:true,color:fb.color,fundo:fb.fundo});
      /* texto do recado = tudo que não é a etiqueta e não são as fotos */
      let corpo="";
      for(const n of obs.childNodes){
        if(n===b||(n.nodeType===1&&(n.tagName==="B"||n.classList.contains("fts"))))continue;
        if(n.nodeType===3){const t=n.textContent;if(t)corpo+=run(t,{sz:fo.sz,color:fo.color});}
      }
      sv+=para(pill+"<w:r><w:tab/></w:r>"+corpo,
        {antes:tw(parseFloat(cs(obs).marginTop)||6),exato:1,linha:tw(fo.lh),ind:{l:tw(ind),h:tw(ind)}});
      const ft=obs.querySelector(".fts");if(ft)sv+=await fotos(ft,tw(ind),false);
    }else{
      const ft=f.querySelector(":scope > .fts");if(ft)sv+=await fotos(ft,0,false);
    }
    const cel=[
      {w:larg[0],mar:{t:marV,b:marV,l:tw(pad),r:tw(gap)},xml:cx,b:{bottom:borda}},
      {w:larg[1],mar:{t:marV,b:marV,r:tw(gap)},xml:num,b:{bottom:borda}},
      {w:larg[2],mar:{t:marV,b:marV,r:Math.max(0,tw(gap)-90)},xml:sv,b:{bottom:borda}}
    ];
    if(q){
      const fq=fmt(win,q);
      let dq="";
      for(const n of q.childNodes){
        if(n.nodeType!==1)continue;
        const f2=fmt(win,n,"rgb(255,255,255)");
        dq+=run((n.tagName==="I"?" ":"")+n.textContent+(n.tagName==="I"?" ":""),
          {sz:f2.sz,bold:f2.bold,color:f2.color,fundo:n.tagName==="I"?f2.fundo:null});
        if(n.tagName==="B")dq+=run(" ",{sz:f2.sz});
      }
      cel.push({w:larg[3],mar:{t:marV,b:marV,r:tw(pad)},xml:para(dq,{jc:"right",exato:1,linha:tw(fq.lh),quebra:quebra}),b:{bottom:borda}});
    }
    return {cel:cel,larg:larg};
  }

  /* ---- faixa verde da área (.ar) ---- */
  function linhaAr(ar,quebra){
    const fa=fmt(win,ar);
    const top=ar.querySelector(".ar-top"),e=ar.querySelector(".ar-e"),cont=top.querySelector(":scope > b"),sub=ar.querySelector(".ar-sub");
    const A=R(ar),fundo=hex(cs(ar).backgroundColor)||"E8F5F0";
    const px=sub?[R(cont).left-A.left,R(sub).left-R(cont).left,A.right-R(sub).left]
                :[R(cont).left-A.left,A.right-R(cont).left];
    const larg=escalar(px,LARG);
    if(sub&&larg[2]<1700){const d=1700-larg[2];larg[2]+=d;larg[0]-=d;}
    const pv=tw(parseFloat(cs(ar).paddingTop)||6),pl=tw(parseFloat(cs(ar).paddingLeft)||11);
    let esq="";
    for(const n of e.childNodes){
      if(n.nodeType===3){const t=n.textContent;if(t.trim()){const f=fmt(win,e);esq+=run(t,{sz:f.sz,bold:true,color:f.color});}continue;}
      if(n.nodeType!==1)continue;
      const f=fmt(win,n,"rgb(232,245,240)");
      const txt=f.caps?n.textContent.toUpperCase():n.textContent;
      if(n.classList.contains("ar-piso"))esq+=run(" "+txt+" ",{sz:f.sz,bold:true,color:f.color,fundo:"FFFFFF",borda:"CFE5DD"})+run("  ",{sz:f.sz});
      else esq+=run("  "+txt,{sz:f.sz,color:f.color});
    }
    const fb=fmt(win,cont,"rgb(232,245,240)");
    const dir=para(run(" "+cont.textContent+" ",{sz:fb.sz,bold:true,color:fb.color,fundo:"FFFFFF",borda:"CFE5DD"}),
      {jc:"right",exato:1,linha:tw(fa.lh),keepNext:1});
    const bb={bottom:{sz:6,cor:"D7E6E0"}};
    const cel=[{w:larg[0],fundo:fundo,v:"center",mar:{t:pv,b:pv,l:pl},b:bb,xml:para(esq,{exato:1,linha:tw(fa.lh),keepNext:1,quebra:quebra})},
               {w:larg[1],fundo:fundo,v:"center",mar:{t:pv,b:pv,r:sub?tw(10):pl},b:bb,xml:dir}];
    if(sub){const fs=fmt(win,sub.querySelector(".qh"));
      cel.push({w:larg[2],fundo:fundo,v:"center",mar:{t:pv,b:pv,r:pl},b:bb,
        xml:para(run(fs.caps?"DATA REGISTRADA":sub.textContent,{sz:fs.sz,bold:true,color:fs.color,ls:fs.ls}),{jc:"right",exato:1,linha:tw(fs.lh),keepNext:1})});}
    return {cel:cel,larg:larg};
  }

  /* ---- um grupo (.grupo): uma tabela com borda fina ---- */
  async function grupo(g,quebra){
    const linhas=[];
    const kids=Array.from(g.children);
    const bcor=hex(cs(g).borderTopColor)||"D7DCE2";
    for(let i=0;i<kids.length;i++){
      const k=kids[i],q=quebra&&i===0;
      if(k.classList.contains("ar")){
        linhas.push(linhaAr(k,q).cel);
      }else if(k.classList.contains("li")){
        const r=await linhaLi(k,i===kids.length-1,q);
        linhas.push(r.cel);
      }else if(k.classList.contains("causa")){
        const b=k.querySelector("b"),sp=k.querySelector("span");
        const fb=fmt(win,b),fs=fmt(win,sp);
        const fundo=hex(cs(k).backgroundColor)||"F9FAFB";
        linhas.push([{w:LARG,span:99,fundo:fundo,mar:{t:tw(9),b:tw(9),l:tw(11),r:tw(11)},
          b:{left:{sz:18,cor:hex(cs(k).borderLeftColor)||"1D6B57"}},
          xml:para(run(fb.caps?b.textContent.toUpperCase():b.textContent,{sz:fb.sz,bold:true,color:fb.color,ls:fb.ls}),{exato:1,linha:tw(fb.lh),depois:tw(3)})
            +para(run(sp.textContent,{sz:fs.sz,color:fs.color}),{exato:1,linha:tw(fs.lh)})}]);
      }
    }
    /* as linhas têm 4 colunas (ou 3 na lista de ralos / faixa); a grade usa a MAIOR divisão */
    return montaGrade(linhas,bcor);
  }
  /* tabela com colunas variáveis por linha: uma grade comum com tantas colunas quantas as bordas pedem.
     Aqui cada linha tem larguras que somam LARG; usa-se gridSpan para encaixar todas numa grade de pontos de corte. */
  function montaGrade(linhas,bcor){
    const cortes=new Set([0,LARG]);
    for(const l of linhas){let a=0;for(const c of l){if(c.span!==99){a+=c.w;cortes.add(a);}}}
    const pts=Array.from(cortes).sort((a,b)=>a-b);
    const grade=[];for(let i=1;i<pts.length;i++)grade.push(pts[i]-pts[i-1]);
    const rows=linhas.map(l=>{
      let a=0;
      return l.map(c=>{
        const ini=a,fim=c.span===99?LARG:a+c.w;a=fim;
        const i0=pts.indexOf(ini),i1=pts.indexOf(fim);
        return Object.assign({},c,{span:Math.max(1,i1-i0),w:fim-ini});
      });
    });
    return tabela(rows,grade,{borda:{top:{sz:6,cor:bcor},left:{sz:6,cor:bcor},bottom:{sz:6,cor:bcor},right:{sz:6,cor:bcor}}});
  }


  /* ---- capa como figura: degradê, cantos e sombras idênticos ao PDF (fallback: capa editável) ---- */
  async function capaImagem(c,quebra,pagina){
    try{
      const r=R(c),W=pagina?Math.round(r.width):Math.ceil(r.width),H=pagina?Math.round(r.height):Math.ceil(r.height),E=pagina?2.5:3;
      const cl=c.cloneNode(true);
      const o=[c].concat(Array.from(c.querySelectorAll("*"))),d=[cl].concat(Array.from(cl.querySelectorAll("*")));
      o.forEach((e,i)=>{const k=cs(e);let t="";for(let j=0;j<k.length;j++){const n=k[j];t+=n+":"+k.getPropertyValue(n)+";";}
        d[i].setAttribute("style",t);
        if(e!==c&&!e.children.length&&e.textContent.trim()){const rr=R(e),lh=parseFloat(k.lineHeight)||rr.height;
          if(rr.height<=lh*1.4)d[i].style.whiteSpace="nowrap";}});
      cl.style.margin="0";cl.style.width=W+"px";cl.style.height=H+"px";cl.style.boxSizing="border-box";
      const xml=new XMLSerializer().serializeToString(cl);
      const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+W*E+'" height="'+H*E+'"><foreignObject width="'+W+'" height="'+H+'" transform="scale('+E+')">'+xml+'</foreignObject></svg>';
      const img=new win.Image();
      await new Promise((ok,no)=>{img.onload=ok;img.onerror=no;img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);});
      const cv=D.createElement("canvas");cv.width=W*E;cv.height=H*E;
      cv.getContext("2d").drawImage(img,0,0);
      const b64=cv.toDataURL("image/png").split(",")[1];
      if(b64.length<2000)return null;
      const bin=atob(b64),dados=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)dados[i]=bin.charCodeAt(i);
      const n=doc.media.length+1,rid="rImg"+n,nome="image"+n+".png";
      doc.media.push({name:nome,data:dados,rid:rid});
      const cx=pagina?7560310:Math.round(W*9525),cy=pagina?10690860:Math.round(H*9525);
      const run1="<w:r><w:drawing><wp:inline distT=\"0\" distB=\"0\" distL=\"0\" distR=\"0\"><wp:extent cx=\""+cx+"\" cy=\""+cy+"\"/>"
        +"<wp:docPr id=\""+n+"\" name=\""+nome+"\"/><a:graphic><a:graphicData uri=\"http://schemas.openxmlformats.org/drawingml/2006/picture\">"
        +"<pic:pic><pic:nvPicPr><pic:cNvPr id=\""+n+"\" name=\""+nome+"\"/><pic:cNvPicPr/></pic:nvPicPr>"
        +"<pic:blipFill><a:blip r:embed=\""+rid+"\"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>"
        +"<pic:spPr><a:xfrm><a:off x=\"0\" y=\"0\"/><a:ext cx=\""+cx+"\" cy=\""+cy+"\"/></a:xfrm><a:prstGeom prst=\"rect\"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>";
      return para(run1,{linha:240,quebra:quebra});
    }catch(e){return null;}
  }

  /* ---- cabeçalho verde (.capa) ---- */
  function capa(c,quebra){
    const verde=(D.body.dataset&&D.body.dataset.capa)?"": "";
    const base=(()=>{const b=cs(c).backgroundImage||"";const m=/#([0-9a-f]{6})\b/ig.exec(b);
      const l=(window.document.body.dataset||{}).capa;
      if(l==="aurora"||l==="fluido")return "03211C";
      /* verde do meio do degradê claro */
      return "1A7A70";})();
    const sobre="rgb("+parseInt(base.slice(0,2),16)+","+parseInt(base.slice(2,4),16)+","+parseInt(base.slice(4,6),16)+")";
    const W=LARG,padL=tw(parseFloat(cs(c).paddingLeft)||14),padT=tw(parseFloat(cs(c).paddingTop)||9);
    const wInt=W-2*padL;
    let x="";
    const idt=c.querySelector(".identidade"),fi=fmt(win,idt);
    x+=para(run(idt.textContent,{sz:fi.sz,bold:true,color:"FFFFFF",ls:fi.ls}),{exato:1,linha:tw(fi.lh),quebra:quebra});
    const fx=c.querySelector(".faixa");
    if(fx){
      x+=espaco(parseFloat(cs(fx).marginTop)||7);
      const cels=Array.from(fx.children);
      const cw=escalar(cels.map(d=>R(d).width),wInt);
      const bFx=hex(cs(fx).borderTopColor,sobre)||"FFFFFF";
      const fFx=hex(cs(fx).backgroundColor,sobre)||base;
      const lin=[cels.map((d,i)=>{
        const sp=d.querySelector("span"),b=d.querySelector("b");
        const fs=fmt(win,sp,sobre),fb=fmt(win,b,sobre);
        const proprio=hex(cs(d).backgroundColor,sobre);
        const fundo=(proprio&&d.classList.contains("mes"))?proprio:fFx;
        return {w:cw[i],fundo:fundo,mar:{t:tw(parseFloat(cs(d).paddingTop)||5),b:tw(parseFloat(cs(d).paddingBottom)||5),l:tw(11),r:tw(11)},
          b:{right:i<cels.length-1?{sz:6,cor:hex(cs(d).borderRightColor,sobre)||bFx}:null},
          xml:para(run(sp.textContent.toUpperCase(),{sz:fs.sz,bold:true,color:fs.color,ls:fs.ls}),{jc:"center",exato:1,linha:tw(fs.lh)})
            +para(run(b.textContent,{sz:fb.sz,bold:true,color:"FFFFFF",ls:fb.ls}),{jc:"center",exato:1,linha:tw(fb.lh)})};
      })];
      x+=tabela(lin,cw,{borda:{top:{sz:6,cor:bFx},left:{sz:6,cor:bFx},bottom:{sz:6,cor:bFx},right:{sz:6,cor:bFx}}});
    }
    const cpe=c.querySelector(".cpe");
    if(cpe){
      x+=espaco(parseFloat(cs(cpe).marginTop)||6);
      const cels=Array.from(cpe.children);
      const gap=parseFloat(cs(cpe).columnGap)||16;
      const larg=escalar(cels.map(d=>R(d).width+gap),wInt);
      const cor=hex(cs(cpe).borderTopColor,sobre)||"FFFFFF";
      const lin=[cels.map((d,i)=>{
        const jc=i===0?"left":(d.classList.contains("rt")?"center":"right");
        let ps="";
        for(const n of d.children){
          const f=fmt(win,n,sobre);
          ps+=para(run(f.caps?n.textContent.toUpperCase():n.textContent,{sz:f.sz,bold:f.bold,color:f.color,ls:f.ls}),{jc:jc,exato:1,linha:tw(f.lh)});
        }
        return {w:larg[i],mar:{t:tw(parseFloat(cs(cpe).paddingTop)||6),r:i<cels.length-1?tw(gap):0},
          b:{top:{sz:6,cor:cor}},xml:ps};
      })];
      x+=tabela(lin,larg,{});
    }
    /* o bloco inteiro: uma célula verde com tudo dentro */
    const dentro=x+para("",{exato:1,linha:20,rpr:"<w:rPr><w:sz w:val=\"2\"/></w:rPr>"});
    return tabela([[{w:W,fundo:base,mar:{t:padT,b:padT,l:padL,r:padL},xml:dentro}]],[W],{});
  }

  /* ---- caixas "loja | piso | mês" do alto das páginas 2+ (.topo2) ---- */
  function topo2(t,quebra){
    const cels=Array.from(t.children);
    const larg=escalar(cels.map(d=>R(d).width),LARG);
    const cor=hex(cs(t).borderTopColor)||"CFD8D5";
    const lin=[cels.map((d,i)=>{
      const f=fmt(win,d);
      return {w:larg[i],mar:{t:tw(parseFloat(cs(d).paddingTop)||5),b:tw(parseFloat(cs(d).paddingBottom)||5),l:tw(10),r:tw(10)},
        b:{right:i<cels.length-1?{sz:6,cor:cor}:null},
        xml:para(run(d.textContent,{sz:f.sz,bold:true,color:f.color}),{jc:"center",exato:1,linha:tw(f.lh),quebra:quebra})};
    })];
    return tabela(lin,larg,{borda:{top:{sz:6,cor:cor},left:{sz:6,cor:cor},bottom:{sz:6,cor:cor},right:{sz:6,cor:cor}}});
  }

  /* ---- os dois números (.nums) ---- */
  function nums(n){
    const cels=Array.from(n.children);
    const gap=parseFloat(cs(n).columnGap)||7;
    const pxs=[];cels.forEach((d,i)=>{pxs.push(R(d).width);if(i<cels.length-1)pxs.push(gap);});
    const larg=escalar(pxs,LARG);
    const lin=[[]];
    cels.forEach((d,i)=>{
      const sp=d.querySelector("span"),b=d.querySelector("b");
      const fs=fmt(win,sp),fb=fmt(win,b);
      const cor=hex(cs(d).borderTopColor)||"EAECF0";
      const fundo=hex(cs(d).backgroundColor)||"F9FAFB";
      const bb={sz:6,cor:cor};
      lin[0].push({w:larg[i*2],fundo:fundo,mar:{t:tw(5),b:tw(5),l:tw(9),r:tw(9)},b:{top:bb,left:bb,bottom:bb,right:bb},
        xml:para(run(sp.textContent.toUpperCase(),{sz:fs.sz,bold:true,color:fs.color,ls:fs.ls}),{jc:"center",exato:1,linha:tw(fs.lh)})
          +para(run(b.textContent,{sz:fb.sz,bold:true,color:fb.color}),{jc:"center",exato:1,linha:tw(fb.lh)})});
      if(i<cels.length-1)lin[0].push({w:larg[i*2+1],xml:para("",{exato:1,linha:20})});
    });
    return tabela(lin,larg,{});
  }

  /* ---- título de piso (.bl.piso): h2 com linha embaixo (+ explicação dos ralos) ---- */
  function piso(p,quebra){
    const h=p.querySelector("h2"),f=fmt(win,h);
    const corLinha=hex(cs(h).borderBottomColor)||"1D6B57";
    let x=para(run(f.caps?h.textContent.toUpperCase():h.textContent,{sz:f.sz,bold:true,color:f.color,ls:f.ls}),
      {exato:1,linha:tw(f.lh),quebra:quebra,keepNext:1,
       borda:"<w:bottom w:val=\"single\" w:sz=\"12\" w:space=\"3\" w:color=\""+corLinha+"\"/>"});
    const t=p.querySelector(".rl-txt");
    if(t){
      const ft=fmt(win,t),cl=hex(cs(t).borderLeftColor)||"1D6B57";
      x+=espaco(parseFloat(cs(t).marginTop)||6);
      x+=para(run(t.textContent.trim(),{sz:ft.sz,color:ft.color}),
        {exato:1,linha:tw(ft.lh),fundo:hex(cs(t).backgroundColor)||"F9FAFB",ind:{l:tw(11),r:tw(11)},
         borda:"<w:left w:val=\"single\" w:sz=\"18\" w:space=\"8\" w:color=\""+cl+"\"/>"});
    }
    return x;
  }

  if(modoImagem){
    let x="";
    for(let i=0;i<folhas.length;i++){
      const p=await capaImagem(folhas[i],i>0,true);
      if(!p)throw new Error("Não consegui desenhar a página "+(i+1));
      x+=p;
    }
    doc.body.push(x);
    doc.sect="<w:sectPr><w:pgSz w:w=\"11906\" w:h=\"16838\"/><w:pgMar w:top=\"0\" w:right=\"0\" w:bottom=\"0\" w:left=\"0\" w:header=\"0\" w:footer=\"0\" w:gutter=\"0\"/></w:sectPr>";
    return doc.blob();
  }
  /* ---- percorre cada folha, na ordem, com os mesmos espaços ---- */
  let corpoXml="";
  for(let fi=0;fi<folhas.length;fi++){
    const fo=folhas[fi];
    const blocos=[];
    for(const k of fo.children){
      if(k.classList.contains("pe"))continue;
      if(k.classList.contains("corpo")){for(const b of k.children)blocos.push(b);}
      else blocos.push(k);
    }
    let anterior=null;
    for(let bi=0;bi<blocos.length;bi++){
      const b=blocos[bi],primeiro=bi===0&&fi>0;
      if(anterior){
        const gap=R(b).top-R(anterior).bottom;
        corpoXml+=espaco(gap>0?gap:0);
      }
      const c=b.classList;
      if(c.contains("topo")){
        const f=fmt(win,b);
        corpoXml+=para(run(b.textContent,{sz:f.sz,color:f.color}),
          {exato:1,linha:tw(f.lh),quebra:primeiro,
           borda:"<w:bottom w:val=\"single\" w:sz=\"6\" w:space=\"4\" w:color=\"EAECF0\"/>"});
      }
      else if(c.contains("capa"))corpoXml+=(await capaImagem(b,primeiro))||capa(b,primeiro);
      else if(c.contains("nums"))corpoXml+=nums(b);
      else if(c.contains("topo2"))corpoXml+=topo2(b,primeiro);
      else if(c.contains("grupo"))corpoXml+=await grupo(b,primeiro);
      else if(c.contains("piso"))corpoXml+=piso(b,primeiro);
      else if(c.contains("causa")){
        const bb=b.querySelector("b"),sp=b.querySelector("span"),fb=fmt(win,bb),fs=fmt(win,sp);
        corpoXml+=para(run(bb.textContent.toUpperCase(),{sz:fb.sz,bold:true,color:fb.color,ls:fb.ls}),
            {exato:1,linha:tw(fb.lh),fundo:"F9FAFB",ind:{l:tw(11),r:tw(11)},depois:tw(3),quebra:primeiro,
             borda:"<w:left w:val=\"single\" w:sz=\"18\" w:space=\"8\" w:color=\"1D6B57\"/>"})
          +para(run(sp.textContent,{sz:fs.sz,color:fs.color}),
            {exato:1,linha:tw(fs.lh),fundo:"F9FAFB",ind:{l:tw(11),r:tw(11)},
             borda:"<w:left w:val=\"single\" w:sz=\"18\" w:space=\"8\" w:color=\"1D6B57\"/>"});
      }
      anterior=b;
    }
  }
  doc.body.push(corpoXml);

  /* rodapé de verdade, "N / total", igual ao do PDF */
  const pe=alvo.querySelector(".pe"),fpe=pe?fmt(win,pe.querySelector(".pag")||pe):{sz:13,color:"667085"};
  const campo=(cod)=>"<w:r>"+rPr({sz:fpe.sz,color:fpe.color})+"<w:fldChar w:fldCharType=\"begin\"/></w:r>"
    +"<w:r>"+rPr({sz:fpe.sz,color:fpe.color})+"<w:instrText xml:space=\"preserve\"> "+cod+" </w:instrText></w:r>"
    +"<w:r>"+rPr({sz:fpe.sz,color:fpe.color})+"<w:fldChar w:fldCharType=\"separate\"/></w:r>"
    +"<w:r>"+rPr({sz:fpe.sz,color:fpe.color})+"<w:t>1</w:t></w:r>"
    +"<w:r>"+rPr({sz:fpe.sz,color:fpe.color})+"<w:fldChar w:fldCharType=\"end\"/></w:r>";
  doc.footerXml="<w:ftr xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\">"
    +para(campo("PAGE")+run(" / ",{sz:fpe.sz,color:fpe.color})+campo("NUMPAGES"),
      {jc:"right",linha:240,borda:"<w:top w:val=\"single\" w:sz=\"6\" w:space=\"4\" w:color=\"EAECF0\"/>"})
    +"</w:ftr>";
  /* página A4 com as mesmas margens da folha (11 / 12 / 15 mm) */
  doc.sect="<w:sectPr><w:footerReference w:type=\"default\" r:id=\"rFooter\"/><w:pgSz w:w=\"11906\" w:h=\"16838\"/>"
    +"<w:pgMar w:top=\"624\" w:right=\"680\" w:bottom=\"850\" w:left=\"680\" w:header=\"0\" w:footer=\"340\" w:gutter=\"0\"/></w:sectPr>";
  return doc.blob();
};
})();
