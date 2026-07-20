/* ===== pdflite — gerador de PDF puro, sem dependência nenhuma =====
   Mesmo espírito do js/docxlite.js: o site é offline-first e não usa CDN, então o PDF
   é escrito byte a byte aqui. Motivo: ela pediu que o WhatsApp fosse COM O ARQUIVO
   ANEXADO, e para isso precisa existir um File de verdade (navigator.share({files})).
   O print do navegador dá PDF ótimo, mas o arquivo fica com ELE, não com a gente.

   O que suporta: A4, Helvetica normal/negrito/itálico, texto com quebra automática de
   linha e de página, retângulos coloridos, linhas e imagens JPEG.
   Acentuação: WinAnsiEncoding (cp1252) — cobre o português inteiro.

   Uso:
     const d=new PDFLite();
     d.retangulo(0,0,595,120,"#0f5b52");
     d.texto("Título",{x:40,y:40,tam:22,cor:"#ffffff",negrito:true});
     d.paragrafo("Texto longo que quebra sozinho...",{x:40,larg:515,tam:11});
     const blob=d.blob();
*/
function PDFLite(op){
  op=op||{};
  this.L=op.largura||595.28;      /* A4 em pontos */
  this.A=op.altura||841.89;
  this.margemBaixo=op.margemBaixo||48;
  this.paginas=[];                /* cada página = {ops:[], imgs:[]} */
  this.imgs=[];                   /* {nome, dados, larg, alt} */
  this.novaPagina();
}
PDFLite.prototype.novaPagina=function(){
  this.pag={ops:[],usa:{}};
  this.paginas.push(this.pag);
  this.y=this.margemTopo||40;     /* y "de cima para baixo", como todo mundo pensa */
  return this;
};
/* PDF conta o y de baixo para cima; aqui a gente pensa de cima para baixo */
PDFLite.prototype._y=function(y){return this.A-y;};

PDFLite.prototype._cor=function(c){
  c=String(c||"#000000").replace("#","");
  if(c.length===3)c=c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
  const r=parseInt(c.slice(0,2),16)/255,g=parseInt(c.slice(2,4),16)/255,b=parseInt(c.slice(4,6),16)/255;
  return [r.toFixed(3),g.toFixed(3),b.toFixed(3)].join(" ");
};
/* texto do PDF: parênteses e barra invertida têm de ser escapados */
PDFLite.prototype._esc=function(s){
  return String(s==null?"":s).replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)");
};
PDFLite.prototype._fonte=function(neg,ita){
  return neg?(ita?"F4":"F2"):(ita?"F3":"F1");
};

/* --- largura aproximada do texto, para quebrar linha e centralizar ---
   Larguras médias do Helvetica (em milésimos de em). Não é a métrica exata da fonte,
   mas erra pouco e evita embutir uma tabela de 200 linhas. */
PDFLite.LARG={" ":278,"!":278,'"':355,"#":556,"$":556,"%":889,"&":667,"'":191,"(":333,")":333,
"*":389,"+":584,",":278,"-":333,".":278,"/":278,"0":556,"1":556,"2":556,"3":556,"4":556,"5":556,
"6":556,"7":556,"8":556,"9":556,":":278,";":278,"<":584,"=":584,">":584,"?":556,"@":1015,
"A":667,"B":667,"C":722,"D":722,"E":667,"F":611,"G":778,"H":722,"I":278,"J":500,"K":667,"L":556,
"M":833,"N":722,"O":778,"P":667,"Q":778,"R":722,"S":667,"T":611,"U":722,"V":667,"W":944,"X":667,
"Y":667,"Z":611,"[":278,"\\":278,"]":278,"^":469,"_":556,"`":333,
"a":556,"b":556,"c":500,"d":556,"e":556,"f":278,"g":556,"h":556,"i":222,"j":222,"k":500,"l":222,
"m":833,"n":556,"o":556,"p":556,"q":556,"r":333,"s":500,"t":278,"u":556,"v":500,"w":722,"x":500,
"y":500,"z":500,"{":334,"|":260,"}":334,"~":584};
PDFLite.prototype.largura=function(txt,tam,neg){
  let w=0;
  for(const ch of String(txt||"")){
    let m=PDFLite.LARG[ch];
    if(m==null)m=(ch.charCodeAt(0)>127)?556:500;   /* acentuada: largura de letra normal */
    w+=m;
  }
  w=w/1000*tam;
  return neg?w*1.06:w;                             /* negrito é um tico mais largo */
};

/* --- desenho --- */
PDFLite.prototype.retangulo=function(x,y,larg,alt,cor,raio){
  this.pag.ops.push(this._cor(cor)+" rg");
  this.pag.ops.push(x.toFixed(2)+" "+this._y(y+alt).toFixed(2)+" "+larg.toFixed(2)+" "+alt.toFixed(2)+" re f");
  return this;
};
PDFLite.prototype.linha=function(x1,y1,x2,y2,cor,esp){
  this.pag.ops.push(this._cor(cor)+" RG "+(esp||0.7)+" w");
  this.pag.ops.push(x1.toFixed(2)+" "+this._y(y1).toFixed(2)+" m "+x2.toFixed(2)+" "+this._y(y2).toFixed(2)+" l S");
  return this;
};
/* uma linha de texto, sem quebra */
PDFLite.prototype.texto=function(txt,o){
  o=o||{};
  const tam=o.tam||11,f=this._fonte(o.negrito,o.italico);
  /* centro/direita precisam de x + larg. Antes: x sozinho virava NaN e
     o comando PDF ficava mal-formado. */
  const base=(o.x==null?0:o.x);
  let x=base;
  if(o.centro)x=base+((o.larg||0)-this.largura(txt,tam,o.negrito))/2;
  if(o.direita)x=base+(o.larg||0)-this.largura(txt,tam,o.negrito);
  this.pag.usa[f]=true;
  this.pag.ops.push("BT "+this._cor(o.cor)+" rg /"+f+" "+tam+" Tf 1 0 0 1 "
    +x.toFixed(2)+" "+this._y((o.y==null?this.y:o.y)+tam*0.85).toFixed(2)+" Tm ("
    +this._esc(txt)+") Tj ET");
  return this;
};
/* quebra o texto na largura e devolve as linhas */
PDFLite.prototype.quebrar=function(txt,larg,tam,neg){
  const linhas=[];
  for(const bruto of String(txt==null?"":txt).split("\n")){
    const pal=bruto.split(/\s+/).filter(x=>x!=="");
    if(!pal.length){linhas.push("");continue;}
    let atual="";
    for(const p of pal){
      const t=atual?atual+" "+p:p;
      if(this.largura(t,tam,neg)>larg&&atual){linhas.push(atual);atual=p;}
      else atual=t;
    }
    if(atual)linhas.push(atual);
  }
  return linhas;
};
/* parágrafo com quebra de linha E de página. Devolve a altura ocupada. */
PDFLite.prototype.paragrafo=function(txt,o){
  o=o||{};
  const tam=o.tam||11,alt=o.alturaLinha||tam*1.35;
  const linhas=this.quebrar(txt,o.larg||this.L-80,tam,o.negrito);
  for(const l of linhas){
    this.espaco(alt);
    this.texto(l,{x:o.x||40,y:this.y,tam,cor:o.cor,negrito:o.negrito,italico:o.italico,
      larg:o.larg,centro:o.centro,direita:o.direita});
    this.y+=alt;
  }
  return linhas.length*alt;
};
/* garante que cabe: se não couber, abre página nova */
PDFLite.prototype.espaco=function(precisa){
  if(this.y+precisa>this.A-this.margemBaixo){this.novaPagina();this.y=40;}
  return this;
};
PDFLite.prototype.pular=function(n){this.y+=(n==null?10:n);return this;};

/* --- imagem JPEG (as fotos das inspeções já são JPEG) --- */
PDFLite.prototype.jpeg=function(dataUrl,x,y,larg,alt){
  const b64=String(dataUrl).split(",")[1];if(!b64)return this;
  const bin=atob(b64);
  const d=this._jpegTam(bin);
  if(!d)return this;
  /* respeita a proporção dentro da caixa pedida */
  const esc=Math.min(larg/d.w,alt/d.h);
  const w=d.w*esc,h=d.h*esc;
  const nome="Im"+(this.imgs.length+1);
  this.imgs.push({nome,dados:bin,larg:d.w,alt:d.h});
  this.pag.usa[nome]=true;
  this.pag.ops.push("q "+w.toFixed(2)+" 0 0 "+h.toFixed(2)+" "+x.toFixed(2)+" "
    +this._y(y+h).toFixed(2)+" cm /"+nome+" Do Q");
  return this;
};
/* lê largura e altura no cabeçalho do JPEG (marcador SOF) */
PDFLite.prototype._jpegTam=function(bin){
  let i=2;
  while(i<bin.length){
    if(bin.charCodeAt(i)!==0xFF){i++;continue;}
    const m=bin.charCodeAt(i+1);
    if(m>=0xC0&&m<=0xCF&&m!==0xC4&&m!==0xC8&&m!==0xCC){
      return {h:(bin.charCodeAt(i+5)<<8)|bin.charCodeAt(i+6),
              w:(bin.charCodeAt(i+7)<<8)|bin.charCodeAt(i+8)};
    }
    i+=2+((bin.charCodeAt(i+2)<<8)|bin.charCodeAt(i+3));
  }
  return null;
};

/* --- unicode -> cp1252 (WinAnsi), que é o encoding declarado nas fontes --- */
PDFLite.CP1252={0x20AC:128,0x201A:130,0x0192:131,0x201E:132,0x2026:133,0x2020:134,0x2021:135,
0x02C6:136,0x2030:137,0x0160:138,0x2039:139,0x0152:140,0x017D:142,0x2018:145,0x2019:146,
0x201C:147,0x201D:148,0x2022:149,0x2013:150,0x2014:151,0x02DC:152,0x2122:153,0x0161:154,
0x203A:155,0x0153:156,0x017E:158,0x0178:159};
PDFLite.prototype._bytes=function(s){
  let out="";
  for(const ch of String(s)){
    const c=ch.codePointAt(0);
    if(c<256)out+=String.fromCharCode(c);
    else if(PDFLite.CP1252[c])out+=String.fromCharCode(PDFLite.CP1252[c]);
    else out+="?";
  }
  return out;
};

/* --- montar o arquivo --- */
PDFLite.prototype.blob=function(){
  const objs=[];                       /* corpo de cada objeto, 1-indexado */
  const put=s=>{objs.push(s);return objs.length;};

  const fontes={
    F1:put("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"),
    F2:put("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"),
    F3:put("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>"),
    F4:put("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-BoldOblique /Encoding /WinAnsiEncoding >>")
  };
  const imgIds={};
  for(const im of this.imgs){
    imgIds[im.nome]=put("<< /Type /XObject /Subtype /Image /Width "+im.larg+" /Height "+im.alt
      +" /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length "
      +im.dados.length+" >>\nstream\n"+im.dados+"\nendstream");
  }

  const idPaginas=put("");             /* reservado: preenchido no fim */
  const idsPag=[];
  for(const pg of this.paginas){
    const conteudo=pg.ops.join("\n");
    const idC=put("<< /Length "+this._bytes(conteudo).length+" >>\nstream\n"+conteudo+"\nendstream");
    const fs=Object.keys(fontes).map(k=>"/"+k+" "+fontes[k]+" 0 R").join(" ");
    const xo=Object.keys(pg.usa).filter(k=>imgIds[k]).map(k=>"/"+k+" "+imgIds[k]+" 0 R").join(" ");
    idsPag.push(put("<< /Type /Page /Parent "+idPaginas+" 0 R /MediaBox [0 0 "
      +this.L.toFixed(2)+" "+this.A.toFixed(2)+"] /Resources << /Font << "+fs+" >>"
      +(xo?" /XObject << "+xo+" >>":"")+" >> /Contents "+idC+" 0 R >>"));
  }
  objs[idPaginas-1]="<< /Type /Pages /Kids ["+idsPag.map(i=>i+" 0 R").join(" ")
    +"] /Count "+idsPag.length+" >>";
  const idCat=put("<< /Type /Catalog /Pages "+idPaginas+" 0 R >>");
  const idInfo=put("<< /Producer (Central de Demandas NP) /Creator (Central de Demandas NP) >>");

  let saida="%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offs=[0];
  for(let i=0;i<objs.length;i++){
    offs.push(this._bytes(saida).length);
    saida+=(i+1)+" 0 obj\n"+objs[i]+"\nendobj\n";
  }
  const inicioXref=this._bytes(saida).length;
  saida+="xref\n0 "+(objs.length+1)+"\n0000000000 65535 f \n";
  for(let i=1;i<=objs.length;i++)
    saida+=String(offs[i]).padStart(10,"0")+" 00000 n \n";
  saida+="trailer\n<< /Size "+(objs.length+1)+" /Root "+idCat+" 0 R /Info "+idInfo
    +" 0 R >>\nstartxref\n"+inicioXref+"\n%%EOF";

  const bin=this._bytes(saida);
  const u8=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i)&0xFF;
  return new Blob([u8],{type:"application/pdf"});
};
