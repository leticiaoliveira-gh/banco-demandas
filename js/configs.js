/* =====================================================================
   VER CONFIGURAÇÕES — a tela única que ela pediu, no modelo do Notion.
   Print dela: "Ver configurações" com Layout · Filtrar · Ordenar · Agrupar ·
   Cor condicional. Observação dela: "Tudo deve ser editável. Eu já pedi mas não
   ficou como eu quero. Faça no mesmo modelo do Notion e já me agradará."

   IDEIA: as opções JÁ EXISTIAM, mas espalhadas — uma barra em cada aba, cada
   uma com um jeito. Aqui elas viram UMA porta só, igual em toda aba, montada a
   partir do que a aba declara em CFG_ABAS. Aba nova = uma entrada ali.
   Nada é reimplementado: cada linha chama a função que já faz o trabalho.
   ===================================================================== */

/* o que cada aba oferece. Cada item: {rot, dica, valor(), acao} */
const CFG_ABAS={
  dg:()=>[
    {gr:"layout",rot:"Layout",dica:"Como as demandas aparecem",
     valor:()=>(typeof DG_VISAO!=="undefined"&&DG_VISAO==="painel")?"Painel":"Lista",
     acao:()=>{dgSetVisao((typeof DG_VISAO!=="undefined"&&DG_VISAO==="painel")?"lista":"painel");cfgAbrir();}},
    {gr:"agrupar",rot:"Agrupar por",dica:"O que separa os blocos",
     valor:()=>(typeof DG_GRUPO!=="undefined"&&DG_GRUPO==="situacao")?"Situação":"Prioridade",
     acao:()=>{const s=document.getElementById("dgGrupo");
       if(s){s.value=(typeof DG_GRUPO!=="undefined"&&DG_GRUPO==="situacao")?"prioridade":"situacao";s.dispatchEvent(new Event("change"));}
       cfgAbrir();}},
    {gr:"filtrar",rot:"Filtrar",dica:"Situação, loja e busca",
     valor:()=>cfgConta([document.getElementById("dgSit")?.value,document.getElementById("dgEscopo")?.value,document.getElementById("dgQ")?.value]),
     acao:()=>{cfgFechar();document.getElementById("dgQ")?.focus();}},
    {gr:"cor",rot:"Cores das prioridades",dica:"Nome e cor de cada etiqueta",
     valor:()=>(typeof DG_PRIOS!=="undefined")?Object.keys(DG_PRIOS).length+" etiquetas":"—",
     acao:()=>{cfgFechar();dgGerirOpcoes("prios");}},
    {gr:"cor",rot:"Cores das situações",dica:"Nome e cor de cada situação",
     valor:()=>(typeof DG_SIT!=="undefined")?Object.keys(DG_SIT).length+" situações":"—",
     acao:()=>{cfgFechar();dgGerirOpcoes("sits");}}
  ],
  nc:()=>[
    {gr:"filtrar",rot:"Filtrar",dica:"Piso, área, urgência e status",
     valor:()=>cfgConta([ncF&&ncF.piso,ncF&&ncF.area,ncF&&ncF.urg,ncF&&ncF.q,(ncF&&ncF.status!=="Abertas")?ncF.status:""]),
     acao:()=>{cfgFechar();document.getElementById("ncQ")?.focus();}},
    {gr:"ordenar",rot:"Ordenar",dica:"Piso → área → a ordem que você arrastar",
     valor:()=>"Arraste pela alça ⠿",acao:()=>{cfgFechar();toast("Segure o ⠿ de uma NC e arraste dentro da área");}},
    {gr:"cor",rot:"Cores das urgências",dica:"Nome e cor de cada urgência",
     valor:()=>(typeof NC_URG!=="undefined")?Object.keys(NC_URG).length+" urgências":"—",
     acao:()=>{cfgFechar();dgGerirOpcoes("urg");}},
    {gr:"outros",rot:"Áreas e pisos",dica:"O mapa de áreas desta loja",
     valor:()=>((typeof NC_AREAS!=="undefined"&&NC_AREAS[currentStore])||[]).length+" áreas",
     acao:()=>{cfgFechar();if(typeof ncGerirAreas==="function")ncGerirAreas();}}
  ],
  list:()=>[
    {gr:"filtrar",rot:"Filtrar",dica:"Responsável, status e área",
     valor:()=>cfgConta([document.getElementById("fExec")?.value,document.getElementById("fStatus")?.value,document.getElementById("fArea")?.value,document.getElementById("q")?.value]),
     acao:()=>{cfgFechar();document.getElementById("q")?.focus();}},
    {gr:"ordenar",rot:"Ordenar",dica:"Pendentes primeiro, depois a sua ordem",
     valor:()=>"Arraste pela alça ⠿",acao:()=>{cfgFechar();toast("Segure o ⠿ de uma linha e arraste");}},
    {gr:"outros",rot:"Executores",dica:"Quem resolve as manutenções",
     valor:()=>(typeof EXECUTORES!=="undefined")?EXECUTORES.length+" pessoas":"—",
     acao:()=>{cfgFechar();gerirExecutores();}}
  ],
  ck:()=>[
    {gr:"layout",rot:"Seção aberta",dica:"Formulários, concluídas ou parciais",
     valor:()=>(typeof CK_SEC!=="undefined")?({formularios:"Formulários",enviados:"Concluídas",parciais:"Parciais"}[CK_SEC]||CK_SEC):"—",
     acao:()=>{cfgFechar();toast("Troque nas abinhas do topo da tela");}},
    {gr:"filtrar",rot:"Buscar",dica:"Por nome, loja ou data",
     valor:()=>(typeof CK_Q!=="undefined"&&CK_Q.trim())?"“"+CK_Q+"”":"sem busca",
     acao:()=>{cfgFechar();document.getElementById("ckQ")?.focus();}},
    {gr:"cor",rot:"Tipos de resposta",dica:"Nome e cor de cada tipo",
     valor:()=>(typeof CK_TIPOS!=="undefined")?Object.keys(CK_TIPOS).length+" tipos":"—",
     acao:()=>{cfgFechar();dgGerirOpcoes("cktipos");}},
    {gr:"cor",rot:"Listas de opções",dica:"As listas que aparecem nas perguntas",
     valor:()=>(typeof CK_LISTAS!=="undefined")?Object.keys(CK_LISTAS).length+" listas":"—",
     acao:()=>{cfgFechar();ckGerirListas();}},
    {gr:"outros",rot:"Áreas da loja",dica:"O que é câmara, banheiro, produção",
     valor:()=>"Configurar",acao:()=>{cfgFechar();if(typeof ckAmbientes==="function")ckAmbientes();}}
  ]
};
/* quantos filtros estão ligados agora — o Notion mostra esse número ao lado */
function cfgConta(vals){
  const n=(vals||[]).filter(v=>v!=null&&String(v).trim()!=="").length;
  return n?n+(n===1?" ligado":" ligados"):"nenhum";
}
const CFG_GRUPOS=[
  ["layout","Layout","Como esta tela é desenhada"],
  ["filtrar","Filtrar","O que aparece e o que fica escondido"],
  ["ordenar","Ordenar","A sequência dos itens"],
  ["agrupar","Agrupar","O que separa os blocos"],
  ["cor","Cores","Nome e cor das etiquetas"],
  ["outros","Desta aba","Configurações só deste quadro"]
];

function cfgFechar(){const m=document.getElementById("cfg-painel");if(m)m.remove();}
function cfgAbrir(){
  if(!currentTab||!CFG_ABAS[currentTab]){
    toast("Abra um quadro para ver as configurações dele");return;}
  cfgFechar();
  let linhas;
  try{linhas=CFG_ABAS[currentTab]();}catch(e){linhas=[];}
  let corpo="";
  for(const [g,nomeG,dicaG] of CFG_GRUPOS){
    const doGrupo=linhas.filter(l=>l.gr===g);
    if(!doGrupo.length)continue;
    corpo+=`<div class="cfg-grupo"><div class="cfg-grupo-t">${esc(nomeG)}<span>${esc(dicaG)}</span></div>`;
    doGrupo.forEach((l,i)=>{
      let v="";try{v=l.valor();}catch(e){v="—";}
      corpo+=`<button class="cfg-linha" onclick="cfgAcao('${g}',${i})">
        <span class="cfg-rot">${esc(l.rot)}<span class="cfg-dica">${esc(l.dica||"")}</span></span>
        <span class="cfg-val">${esc(String(v))}</span><span class="cfg-seta">›</span></button>`;
    });
    corpo+="</div>";
  }
  const p=document.createElement("div");
  p.id="cfg-painel";p.className="cfg-painel";
  p.innerHTML=`<div class="cfg-cx" onclick="event.stopPropagation()">
    <div class="cfg-topo">
      <b>Ver configurações</b>
      <button class="btn ghost sm" onclick="cfgFechar()">✕</button>
    </div>
    <div class="cfg-aba">${esc(rotuloAba(currentTab))}</div>
    ${corpo||'<p class="desc" style="padding:10px 2px">Este quadro ainda não tem configurações próprias.</p>'}
    <div class="cfg-rodape">
      <button class="cfg-linha" onclick="cfgFechar();toggleModoEdicao()">
        <span class="cfg-rot">Editar os textos<span class="cfg-dica">Trocar qualquer palavra desta tela</span></span>
        <span class="cfg-seta">›</span></button>
      <button class="cfg-linha" onclick="cfgFechar();renomearAbaPelaTela()">
        <span class="cfg-rot">Renomear este quadro<span class="cfg-dica">O nome que aparece no título e no menu</span></span>
        <span class="cfg-seta">›</span></button>
    </div>
  </div>`;
  p.onclick=cfgFechar;
  document.body.appendChild(p);
}
/* guarda a lista desenhada para o clique achar a função certa */
function cfgAcao(grupo,i){
  let linhas=[];try{linhas=CFG_ABAS[currentTab]();}catch(e){}
  const alvo=linhas.filter(l=>l.gr===grupo)[i];
  if(alvo&&alvo.acao)alvo.acao();
}
/* renomear a aba sem precisar do modo edição (mesmo caminho do ✎ da capa) */
async function renomearAbaPelaTela(){
  const atual=rotuloAba(currentTab);
  const v=prompt("Como você quer chamar este quadro?",atual);
  if(v===null)return;
  await renomearAba(currentTab,v);
}
