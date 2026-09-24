// Colar no javascript_tool, aba do site local (localhost:8787), com o receptor ligado.
// Ajustar LISTA: [executor, piso, nomeDoArquivo]. Gera um .html por folha na pasta do receptor.
const LISTA=[['Sr. João','1º PISO','cf1'],['Sr. João','2º PISO','cf2']];
const EMITIDO='AAAA-MM-DD';
const novo=await fetch('http://127.0.0.1:8799/i').then(r=>r.json());
const velho=DATA, ordSalva=window.MNT28_CARGA&&window.MNT28_CARGA.ordemAreas;
DATA=novo; if(window.MNT28_CARGA) window.MNT28_CARGA.ordemAreas=null; // ordem alfabetica
const res=[];
for(const [exec,piso,nome] of LISTA){
  document.querySelectorAll('iframe').forEach(f=>f.remove());
  M28F.exec=exec; M28F.ver='fazer'; M28F.piso=piso; M28F.area='';
  const fr=document.createElement('iframe');fr.style.cssText='position:fixed;left:0;top:0;width:900px;height:900px;z-index:99999;background:#fff';document.body.appendChild(fr);
  const w=fr.contentWindow; w.print=()=>{}; const orig=window.open; window.open=()=>w;
  let err=null;try{m28ImprimirFolha({emitidoEm:EMITIDO})}catch(e){err=e.message}
  window.open=orig; await new Promise(r=>setTimeout(r,6000));
  const t=w.document.body.innerText;
  const s=await fetch('http://127.0.0.1:8799/'+nome,{method:'PUT',body:'<!DOCTYPE html>'+w.document.documentElement.outerHTML}).then(r=>r.text()).catch(e=>'falhou '+e.message);
  res.push({nome,err,paginas:w.document.querySelectorAll('.folha').length,fotos:w.document.querySelectorAll('.folha img').length,gerais:(t.match(/DEMANDAS GERAIS\n(\d+)/)||[])[1],urg:(t.match(/URGENTES\n(\d+)/)||[])[1],s});
}
DATA=velho; if(window.MNT28_CARGA) window.MNT28_CARGA.ordemAreas=ordSalva; document.querySelectorAll('iframe').forEach(f=>f.remove()); M28F.exec='';
res
