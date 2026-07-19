/* =====================================================================
   DocxLite — gerador mínimo de .docx no navegador, sem dependências.
   Um .docx é um ZIP de XMLs; aqui o ZIP é "store" (sem compressão),
   o que todo Word/LibreOffice aceita. Suporta: parágrafos com negrito/
   cor/tamanho/alinhamento, tabelas com fundo colorido e imagens JPEG/PNG.
   Uso: const d=new DocxLite(); d.p("Olá",{bold:true}); await d.image(dataURL);
        const blob=await d.blob();
   ===================================================================== */

/* ---- ZIP store-only ---- */
const DocxZip=(()=>{
 const CRC=(()=>{const t=new Uint32Array(256);
  for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c;}
  return d=>{let c=0xFFFFFFFF;for(let i=0;i<d.length;i++)c=t[(c^d[i])&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0;};})();
 const le=(n,b)=>{const a=new Uint8Array(b);for(let i=0;i<b;i++)a[i]=(n>>>(8*i))&0xFF;return a;};
 return function(files){ /* files: [{name, data:Uint8Array}] */
  const parts=[],central=[];let off=0;
  for(const f of files){
   const name=new TextEncoder().encode(f.name),crc=CRC(f.data);
   const head=[le(0x04034b50,4),le(20,2),le(0,2),le(0,2),le(0,2),le(0x5821,2),/* data fixa */
    le(crc,4),le(f.data.length,4),le(f.data.length,4),le(name.length,2),le(0,2)];
   const headLen=30+name.length;
   parts.push(...head,name,f.data);
   central.push([le(0x02014b50,4),le(20,2),le(20,2),le(0,2),le(0,2),le(0,2),le(0x5821,2),
    le(crc,4),le(f.data.length,4),le(f.data.length,4),le(name.length,2),le(0,2),le(0,2),
    le(0,2),le(0,2),le(0,4),le(off,4),name]);
   off+=headLen+f.data.length;
  }
  const cdStart=off;let cdLen=0;
  for(const c of central)for(const a of c){parts.push(a);cdLen+=a.length;}
  parts.push(le(0x06054b50,4),le(0,2),le(0,2),le(files.length,2),le(files.length,2),
   le(cdLen,4),le(cdStart,4),le(0,2));
  return new Blob(parts,{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
 };})();

function DocxLite(){
 this.body=[];this.media=[];/* {name,data,cx,cy} */
}
DocxLite.prototype.esc=function(s){return String(s==null?"":s)
 .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");};
/* parágrafo: opts {bold,color:"RRGGBB",size:half-points,align:"center"} */
DocxLite.prototype.p=function(text,opts){opts=opts||{};
 const rPr=(opts.bold?"<w:b/>":"")+(opts.color?`<w:color w:val="${opts.color}"/>`:"")
  +(opts.size?`<w:sz w:val="${opts.size}"/><w:szCs w:val="${opts.size}"/>`:"");
 const pPr=(opts.align?`<w:pPr><w:jc w:val="${opts.align}"/></w:pPr>`:"");
 this.body.push(`<w:p>${pPr}<w:r>${rPr?`<w:rPr>${rPr}</w:rPr>`:""}<w:t xml:space="preserve">${this.esc(text)}</w:t></w:r></w:p>`);
};
/* tabela: rows = [[{text,bold,fill:"RRGGBB",color:"RRGGBB"}...]] */
DocxLite.prototype.table=function(rows){
 const cols=rows[0].length,w=Math.floor(9000/cols);
 const border='<w:tblBorders>'+["top","left","bottom","right","insideH","insideV"]
  .map(s=>`<w:${s} w:val="single" w:sz="4" w:color="BBBBBB"/>`).join("")+'</w:tblBorders>';
 let xml=`<w:tbl><w:tblPr><w:tblW w:w="${w*cols}" w:type="dxa"/>${border}</w:tblPr>`
  +`<w:tblGrid>${Array(cols).fill(`<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>`;
 for(const row of rows){
  xml+="<w:tr>";
  for(const c of row){
   const rPr=(c.bold?"<w:b/>":"")+(c.color?`<w:color w:val="${c.color}"/>`:"");
   xml+=`<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${c.fill?`<w:shd w:val="clear" w:color="auto" w:fill="${c.fill}"/>`:""}</w:tcPr>`
    +`<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r>${rPr?`<w:rPr>${rPr}</w:rPr>`:""}<w:t xml:space="preserve">${this.esc(c.text)}</w:t></w:r></w:p></w:tc>`;
  }
  xml+="</w:tr>";
 }
 xml+="</w:tbl>";
 this.body.push(xml);
};
/* imagem a partir de dataURL (jpeg/png) */
DocxLite.prototype.image=function(dataURL,opts){opts=opts||{};
 return new Promise(res=>{
  const img=new Image();
  img.onload=()=>{
   const maxPx=opts.maxWidthPx||360;
   const sc=Math.min(1,maxPx/img.width);
   const cx=Math.round(img.width*sc*9525),cy=Math.round(img.height*sc*9525);/* px→EMU (96dpi) */
   const m=dataURL.match(/^data:image\/(png|jpe?g);base64,(.*)$/s);
   if(!m){res();return;}
   const ext=m[1]==="png"?"png":"jpeg";
   const bin=atob(m[2]),data=new Uint8Array(bin.length);
   for(let i=0;i<bin.length;i++)data[i]=bin.charCodeAt(i);
   const n=this.media.length+1,rid="rImg"+n,name=`image${n}.${ext}`;
   this.media.push({name,data,rid});
   this.body.push(`<w:p><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">`
    +`<wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${n}" name="${name}"/>`
    +`<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">`
    +`<pic:pic><pic:nvPicPr><pic:cNvPr id="${n}" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr>`
    +`<pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>`
    +`<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>`
    +`<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>`
    +`</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`);
   res();
  };
  img.onerror=()=>res();
  img.src=dataURL;
 });
};
DocxLite.prototype.blob=function(){
 const enc=s=>new TextEncoder().encode(s);
 const XMLH='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n';
 const doc=XMLH+'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
  +' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
  +' xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"'
  +' xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"'
  +' xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
  +'<w:body>'+this.body.join("")
  +'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>'
  +'<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>';
 const contentTypes=XMLH+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
  +'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
  +'<Default Extension="xml" ContentType="application/xml"/>'
  +'<Default Extension="jpeg" ContentType="image/jpeg"/>'
  +'<Default Extension="png" ContentType="image/png"/>'
  +'<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
  +'<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
  +'<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
  +'<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'
  +'</Types>';
 const relsRoot=XMLH+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
  +'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
  +'<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
  +'<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>'
  +'</Relationships>';
 const relsDoc=XMLH+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
  +'<Relationship Id="rStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
  +this.media.map(m=>`<Relationship Id="${m.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${m.name}"/>`).join("")
  +'</Relationships>';
 const styles=XMLH+'<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
  +'<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>'
  +'<w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>';
 const core=XMLH+'<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"'
  +' xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Relatório de Não Conformidades</dc:title>'
  +'<dc:creator>Central de Demandas NP</dc:creator></cp:coreProperties>';
 const app=XMLH+'<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">'
  +'<Application>Central de Demandas NP</Application></Properties>';
 const files=[
  {name:"[Content_Types].xml",data:enc(contentTypes)},
  {name:"_rels/.rels",data:enc(relsRoot)},
  {name:"word/document.xml",data:enc(doc)},
  {name:"word/_rels/document.xml.rels",data:enc(relsDoc)},
  {name:"word/styles.xml",data:enc(styles)},
  {name:"docProps/core.xml",data:enc(core)},
  {name:"docProps/app.xml",data:enc(app)},
  ...this.media.map(m=>({name:"word/media/"+m.name,data:m.data}))
 ];
 return Promise.resolve(DocxZip(files));
};
