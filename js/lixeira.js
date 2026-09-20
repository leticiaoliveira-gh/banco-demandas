/* ===== LIXEIRA — o que foi apagado fica guardado e volta inteiro (19/09) =====
   O site nunca apagou de verdade: excluir só marca o item como lápide
   (deleted=true + mod novo), que é o que faz a exclusão viajar entre os
   aparelhos. Faltava a tela para ela ver essas lápides e trazer de volta.

   Nada aqui apaga nada. O único botão é "Restaurar" — nunca "Devolver"
   (palavra escolhida por ela em 19/09). O restaurar passa pelo putItem,
   então o desfazer (Ctrl+Z) continua pegando.                              */

var LIXEIRA_TODAS = false;   /* falso = só a empresa aberta */

function lixeiraLista(){
  if(typeof DATA==="undefined")return [];
  return DATA
    .filter(d=>d&&d.deleted&&(LIXEIRA_TODAS||d.loja===(typeof currentStore!=="undefined"?currentStore:d.loja)))
    .sort((a,b)=>String(b.mod||"").localeCompare(String(a.mod||"")));
}

function lixeiraTexto(d){
  return String(d.fazer||d.nc||d.acao||d.texto_bruto||d.titulo||"(item sem texto)").trim();
}

function lixeiraQuadro(d){
  const t=d.tipo||"mnt";
  /* o nome do quadro é o que ELA deu à aba, não a sigla interna: procuramos
     a aba que guarda este tipo e usamos o rótulo dela. */
  if(typeof TABS!=="undefined"&&typeof rotuloAba==="function"){
    for(const k in TABS){
      if(TABS[k]&&TABS[k].tipo===t){
        try{ return rotuloAba(k); }catch(e){}
      }
    }
  }
  if(typeof rotuloTipo==="function"){
    try{ return rotuloTipo(t); }catch(e){}
  }
  return t;
}

function lixeiraEmpresa(code){
  if(typeof EMPRESAS!=="undefined"&&Array.isArray(EMPRESAS)){
    const e=EMPRESAS.find(x=>x.code===code);
    if(e)return e.name;
  }
  return code||"";
}

function lixeiraQuando(d){
  const s=String(d.mod||"");
  if(s.length<10)return "";
  /* o "mod" é hora universal; a data que ela lê é a do relógio dela */
  const dt=new Date(s);
  if(!isNaN(dt)){
    const z=n=>String(n).padStart(2,"0");
    return z(dt.getDate())+"/"+z(dt.getMonth()+1)+"/"+dt.getFullYear();
  }
  return s.slice(8,10)+"/"+s.slice(5,7)+"/"+s.slice(0,4);
}

function lixeiraLinhas(){
  const itens=lixeiraLista();
  if(!itens.length){
    return `<div class="bd-vazio">
      <div class="bd-vazio-ico">🗑</div>
      <div class="bd-vazio-tit">A lixeira está vazia</div>
      <div class="bd-vazio-txt">Quando você excluir uma demanda, ela fica guardada aqui até você trazer de volta.</div>
    </div>`;
  }
  const corte=itens.slice(0,300);
  const linhas=corte.map(d=>{
    const detalhe=[lixeiraQuadro(d),d.area?String(d.area):"",LIXEIRA_TODAS?lixeiraEmpresa(d.loja):"","apagada em "+lixeiraQuando(d)]
      .filter(Boolean).join(" · ");
    return `<div class="lix-linha">
      <div class="lix-txt"><strong>${esc(lixeiraTexto(d))}</strong><small>${esc(detalhe)}</small></div>
      <button class="btn ghost lix-bt" onclick="lixeiraRestaurar(${d.id})">Restaurar</button>
    </div>`;
  }).join("");
  const sobra=itens.length>corte.length
    ? `<p class="desc" style="margin:10px 0 0">Mostrando as ${corte.length} mais recentes de ${itens.length}.</p>` : "";
  return linhas+sobra;
}

function lixeiraPintar(){
  const alvo=document.getElementById("lix-lista");
  if(alvo)alvo.innerHTML=lixeiraLinhas();
  const cont=document.getElementById("lix-cont");
  if(cont)cont.textContent=lixeiraLista().length;
}

function lixeiraTrocarEscopo(){
  LIXEIRA_TODAS=!LIXEIRA_TODAS;
  const bt=document.getElementById("lix-escopo");
  if(bt)bt.textContent=LIXEIRA_TODAS?"Ver só desta empresa":"Ver de todas as empresas";
  lixeiraPintar();
}

async function lixeiraRestaurar(id){
  if(typeof DATA==="undefined")return;
  const it=DATA.find(d=>d.id===id);
  if(!it)return;
  it.deleted=false;
  it.mod=(typeof nowISO==="function")?nowISO():new Date().toISOString();
  await putItem(it);
  if(typeof dataChanged==="function")dataChanged();
  if(typeof toast==="function")toast("Demanda restaurada ✓");
  if(typeof render==="function")render();
  lixeiraPintar();
}

function lixeiraAbrir(){
  if(typeof ncModal!=="function")return;
  const nome=(typeof currentStore!=="undefined")?lixeiraEmpresa(currentStore):"";
  ncModal(`<h2 style="margin-bottom:4px">🗑 Lixeira</h2>
    <p class="desc">O que você excluiu fica guardado aqui. Toque em <b>Restaurar</b> e a demanda volta inteira, com foto, observação e data. Nada é apagado de verdade.</p>
    <div class="lix-topo">
      <span><b id="lix-cont">0</b> na lixeira${nome&&!LIXEIRA_TODAS?" de "+esc(nome):""}</span>
      <button class="btn ghost sm" id="lix-escopo" onclick="lixeiraTrocarEscopo()">${LIXEIRA_TODAS?"Ver só desta empresa":"Ver de todas as empresas"}</button>
    </div>
    <div id="lix-lista" class="lix-lista"></div>
    <div class="form-actions"><button class="btn ghost" onclick="ncFechar()">Fechar</button></div>`);
  lixeiraPintar();
}
