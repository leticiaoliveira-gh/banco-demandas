/* =====================================================================
   MNT 28.07.26 — Relatório de Manutenção e Infraestrutura
   ---------------------------------------------------------------------
   POR QUE ESTA ABA EXISTE (28/07/2026)
   A folha antiga misturava QUALIDADE com MANUTENÇÃO: das 264 linhas,
   180 caíam num bloco "Outro" e eram serviço de manipulador de alimento
   (retirar papelão, limpar bancada, identificar carne). Isso nunca pode
   chegar à mão de quem conserta. Aqui entra SÓ obra, conserto, pintura,
   troca, instalação e limpeza pesada — e só do executor da folha.

   REGRAS DESTA ABA (decididas por ela)
   - 3 colunas: FEITO · O QUE FAZER (problema + correção juntos) · OBSERVAÇÕES
   - a ÁREA não se repete linha a linha: vira cabeçalho do grupo (piso → área)
   - as observações dela aparecem todas, inclusive "VERIFICAR — tenho dúvida"
   - sem assinatura na impressão e sem a palavra "ordem de serviço"
   - tudo editável pelo ✎, sem código e sem IA
   ===================================================================== */

/* status próprio: aqui "pendente" é o que ainda não foi feito */
STATUS_FNS.mnt28={isPend:d=>!d.feito,isDone:d=>!!d.feito};
TABS.mnt28.renderCards=function(){const c=document.getElementById("cards");if(c)c.innerHTML="";};

/* filtros da tela (só vivem enquanto ela está na aba) */
let M28F={q:"",piso:"",area:"",ver:"todos"};

/* ---- itens desta aba, da empresa aberta ---- */
function m28Itens(){
  return DATA.filter(d=>!d.deleted&&d.tipo==="mnt28"&&d.loja===currentStore);
}
/* ===== A ORDEM DOS PISOS E ÁREAS E O CABEÇALHO MORAM NO BANCO DELA =====
   Aprendido testando (28/07): se isto dependesse do arquivo da carga, no site
   publicado e no celular dela — onde esse arquivo não existe — a folha sairia
   fora de ordem e o cabeçalho sem período e sem RT. Gravamos na primeira carga
   e a partir daí viaja na sincronização, como qualquer configuração dela. */
let M28_ORDEM=null,M28_CAB=null;
/* ===== F-3 · TODA PALAVRA DA FOLHA É DELA (30/07) =====
   Ela pediu: "deixa eu editar absolutamente tudo e organizar do meu jeito".
   Estes são os textos fixos da folha — título, colunas, rótulos. Cada um pode
   ser trocado pelo painel de configuração, sem código. O que ela não trocou
   usa o padrão; apagar o campo volta ao padrão. */
const M28_TXT_PADRAO={
  etiqueta:"Relatório de manutenção",
  tituloPrefixo:"Relatório MNT — Mês:",
  rotExec:"Responsável pelos serviços",
  colFeito:"Foi feito?",colFazer:"O que fazer?",
  colData:"Data registro",colObs:"Recado · lembrete",colObsImp:"Recado",
  rotUnidade:"Unidade",rotEmitido:"Emitido em"};
let M28_TXT=null,M28_VIS=null;
function m28T(){return M28_TXT||M28_TXT_PADRAO;}
async function m28Config(){
  if(M28_ORDEM===null)M28_ORDEM=await metaGet("mnt28Ordem")||{};
  if(M28_CAB===null)M28_CAB=await metaGet("mnt28Cabecalho")||{};
  if(M28_TXT===null)M28_TXT=Object.assign({},M28_TXT_PADRAO,await metaGet("mnt28Textos")||{});
  if(M28_VIS===null)M28_VIS=Object.assign({kpis:true,origem:true},await metaGet("mnt28Visual")||{});
}
function m28Ordem(){
  if(M28_ORDEM&&Object.keys(M28_ORDEM).length)return M28_ORDEM;
  const c=window.MNT28_CARGA;
  return (c&&c.ordemAreas)||null;
}
/* Título com o mês por extenso, tirado da data de emissão. Ela troca a data
   e o título acompanha sozinho — não precisa reescrever nada. */
const M28_MESES=["janeiro","fevereiro","março","abril","maio","junho",
  "julho","agosto","setembro","outubro","novembro","dezembro"];
function m28Titulo(c){
  const iso=(c&&c.emitidoEm)||today();
  const m=Number(String(iso).split("-")[1])-1;
  const mes=M28_MESES[m]||"";
  return m28T().tituloPrefixo+" "+(mes?mes.toUpperCase():"—");
}
/* ===== O NOME E A LINHA DE BAIXO — DELA, EDITÁVEIS (29/07) =====
   Antes o nome vinha do texto livre dos "seus dados" (que já trazia a palavra
   Nutricionista dentro) e a linha de baixo era montada de novo a partir de cargo
   e CRN: a mesma informação aparecia duas vezes na folha dela.
   Agora são dois campos, guardados no cabeçalho da aba e trocados pelo lápis.
   Se ela ainda não trocou nada, vale o que ela pediu em 29/07. */
const M28_RT_LINHA="Nutricionista de Produção – RT · CRN-4: 22103217";
/* do texto livre antigo, aproveita só a primeira parte (antes da vírgula ou do
   travessão) — que é onde o nome dela está. Nunca fica vazio. */
function m28RtNome(c){
  if(c&&c.rtNome)return c.rtNome;
  const bruto=String((c&&c.rt)||RT_INFO||"").trim();
  if(!bruto)return RT_DEFAULT;
  return bruto.split(/[,–—]|\s-\s/)[0].trim()||bruto;
}
function m28RtLinha(c){
  return (c&&c.rtLinha!==undefined&&c.rtLinha!==null)?c.rtLinha:M28_RT_LINHA;
}
async function m28TrocarRt(qual){
  await m28Config();
  const ehNome=qual==="nome";
  const atual=ehNome?m28RtNome(m28Cab(m28Itens())):m28RtLinha(m28Cab(m28Itens()));
  const v=prompt(ehNome
      ?"Seu nome, como deve sair na folha:"
      :"A linha de baixo (cargo e registro), como deve sair na folha:",atual);
  if(v===null)return;                       /* cancelou: não mexe em nada */
  M28_CAB=Object.assign({},M28_CAB||{},ehNome?{rtNome:v.trim()}:{rtLinha:v.trim()});
  await metaSetU("mnt28Cabecalho",M28_CAB); /* metaSetU: o desfazer pega */
  dataChanged();renderMnt28();toast(ehNome?"Nome atualizado ✓":"Linha atualizada ✓");
}
async function m28TrocarEmissao(){
  await m28Config();
  const atual=(M28_CAB&&M28_CAB.emitidoEm)||today();
  const v=prompt("Data de emissão do relatório (dia/mês/ano):",brDate(atual));
  if(v===null)return;
  const p=v.trim().split(/[\/\-.]/);
  if(p.length!==3){toast("Escreva assim: 29/07/2026");return;}
  const [d,m,a]=p.map(x=>x.trim());
  const iso=`${a.length===2?"20"+a:a}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  if(isNaN(new Date(iso).getTime())){toast("Data não reconhecida. Escreva assim: 29/07/2026");return;}
  M28_CAB=Object.assign({},M28_CAB||{},{emitidoEm:iso});
  await metaSetU("mnt28Cabecalho",M28_CAB);
  dataChanged();renderMnt28();toast("Data de emissão atualizada ✓");
}
function m28Cab(itens){
  const c=window.MNT28_CARGA||{};
  /* a carga entra só como base; O QUE ELA EDITOU VENCE — por isso M28_CAB
     vem por último. Sem isso, a data que ela trocou voltaria sozinha. */
  const cab=Object.assign({},
    c.periodo?{periodo:c.periodo,rt:c.rt,crn:c.crn,cargo:c.cargo,emitidoEm:c.emitidoEm,executor:c.executor}:{},
    M28_CAB||{});
  /* Se ela importar num aparelho novo, o período e a RT ainda não estão
     gravados. Em vez de mostrar um traço, montamos a partir do que os próprios
     serviços dizem e do nome que ela já cadastrou na capa. Nunca fica vazio. */
  if(!cab.periodo&&itens&&itens.length){
    const datas=itens.map(d=>d.relato).filter(Boolean).sort();
    cab.periodo=datas.length
      ? (datas[0]===datas[datas.length-1]
          ? "Levantamento de "+brDate(datas[0])
          : "Levantamento de "+brDate(datas[0])+" a "+brDate(datas[datas.length-1]))
      : "Levantamento em andamento";
  }
  if(!cab.rt)cab.rt=RT_INFO||RT_DEFAULT;
  if(!cab.executor&&itens)cab.executor=(itens.find(d=>d.executor)||{}).executor||"";
  return cab;
}
/* Ordem do piso: pela lista oficial se existir; senão alfabética ("1º PISO"
   antes de "2º PISO"), que dá o mesmo resultado. Nunca fica sem ordem.
   CUIDADO (defeito real, pego no teste do site publicado em 28/07): isto TEM
   de comparar os dois pisos entre si. Uma versão anterior devolvia o mesmo
   número para todos os pisos quando a lista oficial não estava no banco, os
   pisos empatavam e a folha saía com "1º PISO" aparecendo duas vezes. */
function m28CmpPiso(a,b){
  const o=m28Ordem();
  if(o){const k=Object.keys(o),ia=k.indexOf(a),ib=k.indexOf(b);
    if(ia>=0&&ib>=0)return ia-ib;
    if(ia>=0)return -1;
    if(ib>=0)return 1;}
  return String(a||"").localeCompare(String(b||""),"pt-BR",{numeric:true});
}
function m28PosArea(p,a){const o=m28Ordem();if(!o||!o[p])return 999;const i=o[p].indexOf(a);return i<0?999:i;}
/* Cada serviço carrega o número da própria posição (campo "ordem"), calculado
   a partir da lista oficial de áreas. É o que faz a folha continuar na ordem
   certa mesmo se ela importar o arquivo num aparelho novo, sem mais nada. */
function m28Comparar(a,b){
  return m28CmpPiso(a.piso,b.piso)
    ||((a.ordem??1e9)-(b.ordem??1e9))
    ||m28PosArea(a.piso,a.area)-m28PosArea(b.piso,b.area)
    ||String(a.area||"").localeCompare(String(b.area||""));
}

/* =====================================================================
   CARGA ÚNICA — os 106 serviços revisados por ela em 28/07/2026
   ---------------------------------------------------------------------
   O arquivo dados/mnt28-carga.js tem DADOS REAIS da loja e por isso mora
   FORA do repositório público (pasta dados/ está no .gitignore). Se ele
   não existir — é o caso do site publicado —, esta função não faz nada:
   os itens já chegaram pela sincronização, como qualquer dado dela.
   Entra UMA vez só; a marca fica gravada para nunca duplicar.
   ===================================================================== */
async function m28CargaInicial(){
  const c=window.MNT28_CARGA;
  if(!c||!Array.isArray(c.itens)||!c.itens.length)return false;
  const feitas=await metaGet("mnt28Cargas")||[];
  if(feitas.includes(c.cargaId))return false;
  /* segunda trava: se o uid já existe no banco, não entra de novo */
  const jaTem=new Set(DATA.map(d=>d.uid));
  const novos=[];
  for(const it of c.itens){
    if(jaTem.has(it.uid))continue;
    const o={uid:it.uid,mod:nowISO(),tipo:"mnt28",loja:c.loja,
      piso:it.piso,area:it.area,fazer:it.fazer,obs:it.obs||"",nota:it.nota||"",
      /* a data que ELA anotou na planilha — é o que mostra há quanto tempo
         o serviço está parado. Sem data na planilha, fica em branco. */
      /* 29/07: a carga passou a trazer FOTO junto do serviço (as que ela tirou na
         visita). Antes isto era fotos:[] fixo e toda foto da carga era descartada. */
      dataRegistro:it.dataRegistro||"",fotos:Array.isArray(it.fotos)?it.fotos.slice():[],
      origem:it.origem||"",executor:c.executor||"",feito:false,
      ordem:it.ordem,relato:c.emitidoEm||today(),criado:"carga:"+c.cargaId};
    const id=await putItem(o);o.id=id;DATA.push(o);novos.push(o);
  }
  /* guarda a ordem oficial e o cabeçalho NO BANCO: é o que faz a folha continuar
     organizada no celular dela, onde o arquivo da carga não existe */
  if(c.ordemAreas){M28_ORDEM=c.ordemAreas;await metaSetU("mnt28Ordem",c.ordemAreas);}
  M28_CAB={periodo:c.periodo||"",rt:c.rt||"",crn:c.crn||"",
    emitidoEm:c.emitidoEm||today(),executor:c.executor||"",lojaNome:c.lojaNome||""};
  await metaSetU("mnt28Cabecalho",M28_CAB);
  await metaSetU("mnt28Cargas",feitas.concat([c.cargaId]));
  if(novos.length){dataChanged();toast(novos.length+" serviços carregados ✓");}
  return novos.length>0;
}

/* ---- tela ---- */
async function renderMnt28(){
  const el=document.getElementById("tab-mnt28");if(!el)return;
  await m28Config();
  await m28CargaInicial();
  const itens=m28Itens();
  const c=m28Cab(itens);
  const loja=(empresa(currentStore)||{}).name||currentStoreName||currentStore||"";
  /* o executor que ELA gravou no cabeçalho vence o que veio na carga —
     antes era ao contrário e a edição dela não aparecia (F-3) */
  const exec=c.executor||(itens.find(d=>d.executor)||{}).executor||"";
  const total=itens.length,feitos=itens.filter(d=>d.feito).length;
  const areas=[...new Set(itens.map(d=>d.area))];
  const pisos=[...new Set(itens.map(d=>d.piso))]
    .sort(m28CmpPiso);

  /* CABEÇALHO COMPACTO (29/07): título com o mês da emissão, que se atualiza
     sozinho — mas a data continua editável por ela (o lápis ao lado).
     A identificação segue o desenho de assinatura que ela desenhou à mão:
     nome centralizado em cima, cargo e registro na linha de baixo. */
  const capa=`<div class="m28-capa">
    <div class="m28-capa-topo">
      <div>
        <div class="m28-capa-et">${esc(m28T().etiqueta)}</div>
        <h1>${esc(m28Titulo(c))}</h1>
        ${exec?`<div class="m28-exec"><span>${esc(m28T().rotExec)}</span>${esc(exec)}
          <button class="m28-lapis" onclick="m28TrocarExecutor()" title="Trocar o responsável pelos serviços" aria-label="Trocar o responsável pelos serviços">✎</button></div>`:""}
      </div>
      ${/* 29/07: a informação de nutricionista aparecia DUAS VEZES — uma dentro do
            nome (o texto livre que ela digitou nos "seus dados") e outra na linha de
            baixo, montada de cargo + CRN. Agora é uma coisa só: NOME em cima, UMA
            linha embaixo — e as duas ela edita pelo lápis, sem código. */""}
      <div class="m28-capa-rt">
        <div class="nome">${esc(m28RtNome(c))}
          <button class="m28-lapis" onclick="m28TrocarRt('nome')" title="Trocar o seu nome" aria-label="Trocar o seu nome">✎</button></div>
        <div class="crn">${esc(m28RtLinha(c))}
          <button class="m28-lapis" onclick="m28TrocarRt('linha')" title="Trocar o cargo e o registro" aria-label="Trocar o cargo e o registro">✎</button></div>
      </div>
    </div>
    <div class="m28-capa-linha">
      <div class="m28-capa-i"><span class="rot">${esc(m28T().rotUnidade)}</span><span class="val">${esc(loja)}</span></div>
      <div class="m28-capa-i"><span class="rot">${esc(m28T().rotEmitido)}</span><span class="val">${brDate(c.emitidoEm||today())}</span>
        <button class="m28-lapis" onclick="m28TrocarEmissao()" title="Trocar a data de emissão" aria-label="Trocar a data de emissão">✎</button></div>
    </div></div>`;

  /* painel de números: peça PRONTA da biblioteca (bd-kpis / bd-kpi), nada do zero */
  const kpi=(nome,valor,obs,classe)=>`<div class="bd-kpi">
      <div class="bd-kpi-topo"><span class="bd-kpi-nome">${esc(nome)}</span></div>
      <div class="bd-kpi-num${classe?" "+classe:""}">${valor}</div>
      <div class="bd-kpi-var"><span class="bd-kpi-obs">${esc(obs)}</span></div>
    </div>`;
  const numeros=`<div class="bd-kpis m28-nums">
    ${kpi("Serviços",total,"em "+areas.length+(areas.length===1?" área":" áreas"))}
    ${kpi("A fazer",total-feitos,(total?Math.round((total-feitos)/total*100):0)+"% do total","m28-pend")}
    ${kpi("Feitos",feitos,"marcados por você","m28-ok")}
    ${kpi("Pisos",pisos.length,pisos.join(" e ")||"—")}
  </div>`;

  const nVer=m28QtdVerificar();
  const opPiso=pisos.map(p=>`<option value="${esc(p)}"${M28F.piso===p?" selected":""}>${esc(p)}</option>`).join("");
  const opArea=areas.sort().map(a=>`<option value="${esc(a)}"${M28F.area===a?" selected":""}>${esc(a)}</option>`).join("");
  const barra=`<div class="toolbar m28-barra">
    <div class="search">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="text" id="m28q" aria-label="Buscar nesta folha" autocomplete="off" spellcheck="false"
        placeholder="Buscar por serviço, área ou observação…" value="${esc(M28F.q)}" oninput="m28Filtro('q',this.value)">
    </div>
    <select aria-label="Filtrar por piso" onchange="m28Filtro('piso',this.value)"><option value="">Todos os pisos</option>${opPiso}</select>
    <select aria-label="Filtrar por área" onchange="m28Filtro('area',this.value)"><option value="">Todas as áreas</option>${opArea}</select>
    <select aria-label="Mostrar" onchange="m28Filtro('ver',this.value)">
      <option value="todos"${M28F.ver==="todos"?" selected":""}>Todos</option>
      <option value="fazer"${M28F.ver==="fazer"?" selected":""}>Só o que falta</option>
      <option value="feitos"${M28F.ver==="feitos"?" selected":""}>Só os feitos</option>
    </select>
    <button class="btn ghost sm" onclick="m28Novo()" title="Acrescentar um serviço nesta folha">+ Serviço</button>
    ${nVer?`<button class="btn ghost sm" onclick="m28MoverVerificar()"
      title="Tirar da folha impressa as ${nVer} observações que começam com VERIFICAR — elas continuam aqui, só para você">🔒 Tirar ${nVer} “VERIFICAR” da folha impressa</button>`:""}
    <button class="btn ghost sm" onclick="m28Imprimir()" title="Abrir a folha pronta para imprimir ou salvar em PDF">🖨 Imprimir / PDF</button>
  </div>`;

  el.innerHTML=capa+(M28_VIS&&M28_VIS.kpis===false?"":numeros)+barra+'<div id="m28-lista"></div>';
  m28RenderLista();
}

function m28Filtro(k,v){M28F[k]=v;m28RenderLista();}

function m28RenderLista(){
  const el=document.getElementById("m28-lista");if(!el)return;
  const q=(M28F.q||"").toLowerCase();
  let rows=m28Itens().filter(d=>{
    if(M28F.piso&&d.piso!==M28F.piso)return false;
    if(M28F.area&&d.area!==M28F.area)return false;
    if(M28F.ver==="fazer"&&d.feito)return false;
    if(M28F.ver==="feitos"&&!d.feito)return false;
    if(q&&!((d.fazer||"")+" "+(d.obs||"")+" "+(d.nota||"")+" "+(d.area||"")+" "+(d.piso||"")).toLowerCase().includes(q))return false;
    return true;});

  if(!rows.length){
    el.innerHTML='<div class="m28-vazio">Nenhum serviço com esses filtros. '
      +'Limpe a busca ou escolha “Todos” para ver a folha inteira.</div>';
    return;
  }
  rows.sort(m28Comparar);

  const nPiso={},nArea={},fArea={};
  for(const d of rows){
    nPiso[d.piso]=(nPiso[d.piso]||0)+1;
    const k=d.piso+"|"+d.area;
    nArea[k]=(nArea[k]||0)+1;
    if(d.feito)fArea[k]=(fArea[k]||0)+1;
  }
  let html="",piso=null,area=null;
  for(const d of rows){
    if(d.piso!==piso){piso=d.piso;area=null;
      html+=`<div class="m28-piso">${esc(piso||"Sem piso")}<span class="m28-count">${nPiso[d.piso]} ${nPiso[d.piso]===1?"serviço":"serviços"}</span></div>`;}
    if(d.area!==area){area=d.area;const k=d.piso+"|"+d.area;
      const f=fArea[k]||0,n=nArea[k];
      html+=`<div class="m28-area" data-piso="${esc(d.piso)}" data-area="${esc(area)}"><span class="m28-area-nome">${esc(area)}</span>`
        +`<span class="m28-count">${f?f+" de "+n+" feitos":n+(n===1?" serviço":" serviços")}</span>`
        +`<div class="m28-tab-cab"><span>${esc(m28T().colFeito)}</span><span>${esc(m28T().colFazer)}</span><span>${esc(m28T().colData)}</span><span>${esc(m28T().colObs)}</span></div></div>`;}
    if(M28_EDITANDO===d.id){html+=m28FormHTML(d);continue;}
    const fotos=(d.fotos||[]).map((f,i)=>`<img class="m28-foto" src="${f}" alt="Foto do serviço"
        onclick="m28VerFoto(${d.id},${i})" title="Toque para ver grande">`).join("");
    html+=`<div class="m28-item${d.feito?" feito":""}" data-id="${d.id}">
      <button class="m28-check" role="checkbox" aria-checked="${d.feito?"true":"false"}"
        aria-label="Marcar como feito: ${esc((d.fazer||"").slice(0,70))}"
        title="${d.feito?"Marcado como feito — toque para desmarcar":"Marcar como feito"}"
        onclick="m28Marcar(${d.id})"><span aria-hidden="true">${d.feito?"✓":""}</span></button>
      <div class="m28-fazer">${esc(d.fazer||"")}
        ${(d.origem&&!(M28_VIS&&M28_VIS.origem===false))?`<span class="m28-origem">${esc(d.origem)}</span>`:""}
        ${fotos?`<div class="m28-fotos">${fotos}</div>`:""}</div>
      <div class="m28-desde">${m28Desde(d)}</div>
      ${/* DUAS CAIXAS DIFERENTES (29/07): o RECADO sai na folha de quem
            conserta; o LEMBRETE é só dela e nunca é impresso. Antes havia
            uma só, e o que ela anotava para si saía impresso para o Sr. João.
            O selo escrito ("só eu vejo") acompanha a cor — cor nunca sozinha. */""}
      <div class="m28-obs">${d.obs?m28Texto(d.obs):(d.nota?"":'<span class="m28-vaziotxt">—</span>')}
        ${d.nota?`<div class="m28-nota"><span class="m28-nota-selo">🔒 só eu vejo</span>${m28Texto(d.nota)}</div>`:""}</div>
      <div class="m28-acts">
        <button class="btn ghost sm" onclick="m28Editar(${d.id})" aria-label="Editar este serviço" title="Mudar este serviço aqui mesmo, sem sair da tela">✎</button>
        <button class="delbtn" aria-label="Excluir este serviço" title="Excluir este serviço" onclick="m28Excluir(${d.id})">🗑</button>
      </div></div>`;
  }
  el.innerHTML=html;
}

/* ===== "VERIFICAR" GANHA SELO ESCRITO (29/07) =====
   "VERIFICAR" não é dúvida do site: é lembrete dela de conferir na loja, e
   NUNCA se apaga. Estava escondido no meio do texto cinza. Agora vira um selo
   com a PALAVRA escrita — vermelho ajuda, mas quem informa é a palavra, porque
   cor sozinha não pode ser a única forma de dizer algo (e há quem não a veja). */
function m28Texto(t){
  const s=esc(t||"");
  return s.replace(/^\s*VERIFICAR\b[\s:—-]*/i,'<span class="m28-verificar">Verificar</span>');
}
/* Quantos recados impressos ainda são, na verdade, lembrete dela */
function m28QtdVerificar(){
  return m28Itens().filter(d=>/^\s*VERIFICAR\b/i.test(d.obs||"")).length;
}
/* Um clique só: leva todos esses para "meu lembrete", que não é impresso.
   Não faço isso sozinho porque é texto dela — mas deixo a um toque. */
async function m28MoverVerificar(){
  const alvos=m28Itens().filter(d=>/^\s*VERIFICAR\b/i.test(d.obs||""));
  if(!alvos.length)return;
  if(!confirm("Mover "+alvos.length+" observação(ões) que começam com VERIFICAR para \"Meu lembrete\"?\n\n"
    +"Elas continuam na tela para você, com o cadeado, e deixam de sair impressas na folha do executor.\n"
    +"Nada é apagado — dá para voltar pelo lápis a qualquer momento."))return;
  for(const d of alvos){
    d.nota=(d.nota?d.nota+" · ":"")+d.obs;
    d.obs="";d.mod=nowISO();
    await putItem(d);
  }
  dataChanged();renderMnt28();
  toast(alvos.length+" passaram para o seu lembrete ✓");
}

/* ===== DESDE QUANDO ESTÁ PARADO =====
   A data sozinha ("30/01/2025") não diz nada a quem lê. O tempo diz.
   Mostramos os dois: a data prova, o tempo cobra. Sem data = em branco,
   como ela pediu (nunca inventar data que a planilha não tem). */
function m28Meses(iso){
  if(!iso)return null;
  const [a,m,dd]=iso.split("-").map(Number);
  if(!a)return null;
  const hoje=new Date(), quando=new Date(a,(m||1)-1,dd||1);
  return (hoje.getFullYear()-quando.getFullYear())*12+(hoje.getMonth()-quando.getMonth());
}
function m28TempoTexto(meses){
  if(meses===null||meses<0)return "";
  if(meses<1)return "este mês";
  if(meses<12)return "há "+meses+" "+(meses===1?"mês":"meses");
  const anos=Math.floor(meses/12), resto=meses%12;
  let t="há "+anos+" "+(anos===1?"ano":"anos");
  if(resto)t+=" e "+resto+" "+(resto===1?"mês":"meses");
  return t;
}
function m28Desde(d){
  if(!d.dataRegistro)return '<span class="m28-vaziotxt">—</span>';
  const meses=m28Meses(d.dataRegistro), tempo=m28TempoTexto(meses);
  const grave=meses!==null&&meses>=12;      /* 1 ano ou mais: destaque */
  return `<span class="m28-data">${brDate(d.dataRegistro)}</span>`
    +(tempo?`<span class="m28-tempo${grave?" grave":""}">${tempo}</span>`:"");
}
function m28VerFoto(id,i){
  const d=DATA.find(x=>x.id===id);if(!d||!d.fotos||!d.fotos[i])return;
  const w=window.open("");
  if(!w){toast("O navegador bloqueou a janela da foto.");return;}
  w.document.write(`<title>Foto do serviço</title>
    <body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh">
    <img src="${d.fotos[i]}" style="max-width:100%;max-height:100vh" alt="Foto do serviço"></body>`);
  w.document.close();
}

/* ---- ações (tudo passa por putItem: o desfazer do site pega) ---- */
async function m28Marcar(id){
  const d=DATA.find(x=>x.id===id);if(!d)return;
  d.feito=!d.feito;d.mod=nowISO();
  await putItem(d);dataChanged();
  m28AtualizarTopo();m28RenderLista();
}
/* ===== EDITAR NA PRÓPRIA TELA =====
   Antes isto abria a janelinha cinza do navegador (o prompt). Ela odiou, com
   razão: some o resto da tela, não dá para escolher a área numa lista e não
   dá para pôr foto. Agora o serviço vira um formulário no lugar dele mesmo,
   com as peças da biblioteca (bd-campo, bd-rotulo, bd-btn). */
let M28_EDITANDO=null;
function m28Editar(id){
  M28_EDITANDO=(M28_EDITANDO===id)?null:id;
  m28RenderLista();
  if(M28_EDITANDO){
    const c=document.querySelector('.m28-form textarea');
    if(c){c.focus();c.setSelectionRange(c.value.length,c.value.length);}
  }
}
/* piso e área saem da lista que ELA já cadastrou na empresa — nunca digitados */
function m28ListaAreas(){
  const cad=(typeof AREAS_ALL!=="undefined"&&AREAS_ALL[currentStore])||[];
  const por={};
  for(const a of cad){const p=(a.piso||"Sem piso").trim();(por[p]=por[p]||[]).push(a.nome);}
  /* o que já é usado nesta folha entra também, para nada ficar órfão */
  for(const d of m28Itens()){
    const p=(d.piso||"Sem piso").trim();
    por[p]=por[p]||[];
    if(!por[p].includes(d.area))por[p].push(d.area);
  }
  return por;
}
function m28FormHTML(d){
  const por=m28ListaAreas();
  const pisos=Object.keys(por).sort(m28CmpPiso);
  const pisoAtual=pisos.includes(d.piso)?d.piso:(pisos[0]||d.piso);
  const opPiso=pisos.map(p=>`<option value="${esc(p)}"${p===d.piso?" selected":""}>${esc(p)}</option>`).join("");
  const opArea=(por[pisoAtual]||[]).sort().map(a=>`<option value="${esc(a)}"${a===d.area?" selected":""}>${esc(a)}</option>`).join("");
  const fotos=(d.fotos||[]).map((f,i)=>`<span class="m28-thumb"><img src="${f}" width="64" height="64" alt="Foto ${i+1} deste serviço">
      <button type="button" onclick="m28TirarFoto(${d.id},${i})" aria-label="Remover a foto ${i+1}" title="Remover">×</button></span>`).join("");
  return `<div class="m28-form" data-id="${d.id}">
    <div class="bd-grupo">
      <label class="bd-rotulo" for="m28f-fazer">O que fazer?</label>
      <textarea class="bd-campo" id="m28f-fazer" rows="3"
        placeholder="Escreva o problema e a correção na mesma frase…">${esc(d.fazer||"")}</textarea>
    </div>
    <div class="m28-form-linha">
      <div class="bd-grupo">
        <label class="bd-rotulo" for="m28f-piso">Piso</label>
        <select class="bd-campo" id="m28f-piso" onchange="m28TrocouPiso(${d.id})">${opPiso}</select>
      </div>
      <div class="bd-grupo">
        <label class="bd-rotulo" for="m28f-area">Área</label>
        <select class="bd-campo" id="m28f-area">${opArea}</select>
      </div>
      <div class="bd-grupo">
        <label class="bd-rotulo" for="m28f-data">Data do registro</label>
        <input class="bd-campo" type="date" id="m28f-data" value="${esc(d.dataRegistro||"")}">
        <span class="bd-ajuda">Sem data? Deixe vazio.</span>
      </div>
    </div>
    <div class="m28-form-linha">
      <div class="bd-grupo">
        <label class="bd-rotulo" for="m28f-obs">Recado para quem vai executar</label>
        <textarea class="bd-campo" id="m28f-obs" rows="2"
          placeholder="Ex.: usar tinta epóxi, própria para área úmida.">${esc(d.obs||"")}</textarea>
        <span class="bd-ajuda">Isto <b>sai impresso</b> na folha dele.</span>
      </div>
      <div class="bd-grupo">
        <label class="bd-rotulo" for="m28f-nota">Meu lembrete 🔒</label>
        <textarea class="bd-campo" id="m28f-nota" rows="2"
          placeholder="Ex.: VERIFICAR — confirmar na loja se ainda existe.">${esc(d.nota||"")}</textarea>
        <span class="bd-ajuda">Só você vê. <b>Nunca é impresso.</b></span>
      </div>
    </div>
    <div class="bd-grupo">
      <span class="bd-rotulo">Fotos</span>
      <div class="m28-thumbs">${fotos}
        <label class="m28-addfoto" title="Acrescentar foto deste serviço" tabindex="0"
          onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.querySelector('input').click();}">＋ Foto
          <input type="file" accept="image/*" capture="environment" multiple
            onchange="m28PorFoto(event,${d.id})" class="m28-oculto"></label>
      </div>
    </div>
    <div class="m28-form-acoes">
      <button class="bd-btn bd-btn-principal" onclick="m28Salvar(${d.id})">Salvar</button>
      <button class="bd-btn bd-btn-fantasma" onclick="m28Editar(${d.id})">Cancelar</button>
    </div>
  </div>`;
}
function m28TrocouPiso(id){
  const d=DATA.find(x=>x.id===id);if(!d)return;
  const p=document.getElementById("m28f-piso").value;
  const sel=document.getElementById("m28f-area");
  const lista=(m28ListaAreas()[p]||[]).sort();
  sel.innerHTML=lista.map(a=>`<option value="${esc(a)}">${esc(a)}</option>`).join("");
}
async function m28Salvar(id){
  const d=DATA.find(x=>x.id===id);if(!d)return;
  const fazer=document.getElementById("m28f-fazer").value.trim();
  if(!fazer){toast("Escreva o que precisa ser feito.");return;}
  d.fazer=fazer;
  d.obs=document.getElementById("m28f-obs").value.trim();
  d.nota=document.getElementById("m28f-nota").value.trim();
  d.piso=document.getElementById("m28f-piso").value;
  d.area=document.getElementById("m28f-area").value;
  d.dataRegistro=document.getElementById("m28f-data").value||"";
  d.mod=nowISO();
  await putItem(d);dataChanged();
  M28_EDITANDO=null;m28RenderLista();toast("Serviço atualizado ✓");
}
async function m28PorFoto(ev,id){
  const d=DATA.find(x=>x.id===id);if(!d)return;
  d.fotos=d.fotos||[];
  for(const f of ev.target.files){
    const img=await ncComprimir(f);        /* reaproveita o compressor da aba de NC */
    if(img)d.fotos.push(img);
  }
  ev.target.value="";
  d.mod=nowISO();await putItem(d);dataChanged();m28RenderLista();
}
async function m28TirarFoto(id,i){
  const d=DATA.find(x=>x.id===id);if(!d||!d.fotos)return;
  d.fotos.splice(i,1);d.mod=nowISO();
  await putItem(d);dataChanged();m28RenderLista();
}
async function m28Excluir(id){
  const d=DATA.find(x=>x.id===id);if(!d)return;
  if(!confirm("Excluir este serviço?\n\n"+(d.fazer||"")))return;
  d.deleted=true;d.mod=nowISO();
  await putItem(d);dataChanged();
  m28AtualizarTopo();m28RenderLista();toast("Serviço excluído");
}
/* Serviço novo nasce em branco e JÁ ABRE o formulário na tela, com piso e
   área escolhidos na lista dela — nunca digitados. */
async function m28Novo(){
  const itens=m28Itens();
  const por=m28ListaAreas();
  const pisos=Object.keys(por).sort(m28CmpPiso);
  const piso=M28F.piso||pisos[0]||"1º PISO";
  const area=M28F.area||(por[piso]||[])[0]||"";
  const o={uid:newUid(),mod:nowISO(),tipo:"mnt28",loja:currentStore,
    piso,area,fazer:"",obs:"",nota:"",dataRegistro:"",fotos:[],
    origem:"",executor:(itens.find(d=>d.executor)||{}).executor||"",
    feito:false,ordem:(m28PosArea(piso,area)*1000)+999,
    relato:today(),criado:"manual"};
  const id=await putItem(o);o.id=id;DATA.push(o);dataChanged();
  M28_EDITANDO=id;
  m28AtualizarTopo();m28RenderLista();
  const c=document.querySelector('.m28-form textarea');if(c)c.focus();
}
/* só os números do topo — evita redesenhar a folha inteira a cada toque */
function m28AtualizarTopo(){
  const itens=m28Itens(),total=itens.length,feitos=itens.filter(d=>d.feito).length;
  const el=document.getElementById("tab-mnt28");if(!el)return;
  const nums=el.querySelectorAll(".m28-nums .bd-kpi");
  if(nums.length>=3){
    nums[0].querySelector(".bd-kpi-num").textContent=total;
    nums[1].querySelector(".bd-kpi-num").textContent=total-feitos;
    nums[1].querySelector(".bd-kpi-obs").textContent=(total?Math.round((total-feitos)/total*100):0)+"% do total";
    nums[2].querySelector(".bd-kpi-num").textContent=feitos;
  }
}

/* =====================================================================
   IMPRESSÃO — a folha que vai para a mão do executor
   Mesmo caminho do resto do site: abre uma janela e usa a caixa de
   impressão do navegador (Salvar como PDF). Sem assinatura e sem a
   palavra "ordem de serviço", por decisão dela.
   ===================================================================== */
function m28Imprimir(){
  let rows=m28Itens();
  if(M28F.ver==="fazer")rows=rows.filter(d=>!d.feito);
  if(M28F.ver==="feitos")rows=rows.filter(d=>d.feito);
  if(M28F.piso)rows=rows.filter(d=>d.piso===M28F.piso);
  if(M28F.area)rows=rows.filter(d=>d.area===M28F.area);
  if(!rows.length){alert("Nenhum serviço para imprimir com os filtros atuais.");return;}
  rows.sort(m28Comparar);

  const c=m28Cab(rows);
  const loja=(empresa(currentStore)||{}).name||currentStoreName||currentStore||"";
  const exec=c.executor||(rows.find(d=>d.executor)||{}).executor||"";
  const feitos=rows.filter(d=>d.feito).length;
  const nAreas=new Set(rows.map(d=>d.piso+"|"+d.area)).size;
  const rt=c.rt||RT_INFO||RT_DEFAULT, crn=c.crn||"";

  /* blocos soltos; quem monta as folhas é o paginador no fim do documento */
  const nArea={};for(const d of rows){const k=d.piso+"|"+d.area;nArea[k]=(nArea[k]||0)+1;}
  let blocos="",piso=null,area=null;
  for(const d of rows){
    if(d.piso!==piso){piso=d.piso;area=null;
      blocos+=`<div class="bl piso"><h2>${esc(piso||"Sem piso")}</h2></div>`;}
    if(d.area!==area){area=d.area;
      blocos+=`<div class="bl ar"><span>${esc(area)}</span><b>${nArea[d.piso+"|"+d.area]}</b></div>`
        +`<div class="bl cab"><span class="c">${esc(m28T().colFeito)}</span><span class="f">${esc(m28T().colFazer)}</span>`
        /* na folha impressa entra SÓ o recado (d.obs). O lembrete dela (d.nota)
           não aparece aqui em lugar nenhum — é essa a razão de ele existir. */
        +`<span class="q">${esc(m28T().colData)}</span><span class="o">${esc(m28T().colObsImp)}</span></div>`;}
    const meses=m28Meses(d.dataRegistro), tempo=m28TempoTexto(meses);
    const desde=d.dataRegistro
      ? `<b>${brDate(d.dataRegistro)}</b>${tempo?`<i${meses>=12?' class="grave"':""}>${tempo}</i>`:""}` : "";
    blocos+=`<div class="bl li"><span class="c"><i class="bx">${d.feito?"✓":""}</i></span>`
      +`<span class="f">${esc(d.fazer||"")}</span><span class="q">${desde}</span>`
      +`<span class="o">${esc(d.obs||"")}</span></div>`;
  }
  const cabecalho=`<div class="capa">
      <div><div class="et">${esc(m28T().etiqueta)}</div>
        <h1>${esc(m28Titulo(c))}</h1>
        ${exec?`<div class="ex"><span>${esc(m28T().rotExec)}</span>${esc(exec)}</div>`:""}</div>
      ${/* mesma correção da tela: nome em cima, UMA linha embaixo — sem repetir
           a informação de nutricionista, como estava saindo antes */""}
      <div class="rt"><b>${esc(m28RtNome(c))}</b><i>${esc(m28RtLinha(c))}</i></div>
      <div class="un"><div><span>${esc(m28T().rotUnidade)}</span>${esc(loja)}</div>
        ${/* DEFEITO CORRIGIDO (29/07): aqui estava brDate(today()) — a data que
             ela trocava pelo lápis aparecia certa na tela e voltava para a data
             de hoje na folha impressa. Agora a folha respeita o que ela editou. */""}
        <div><span>${esc(m28T().rotEmitido)}</span>${brDate(c.emitidoEm||today())}</div></div>
    </div>
    <div class="nums">
      <div class="num"><span>Serviços</span><b>${rows.length}</b></div>
      <div class="num"><span>A fazer</span><b>${rows.length-feitos}</b></div>
      <div class="num"><span>Feitos</span><b>${feitos}</b></div>
      <div class="num"><span>Áreas</span><b>${nAreas}</b></div>
    </div>`;
  const titulo="Manutenção e Infraestrutura — "+loja;

  const w=window.open("");
  if(!w){alert("O navegador bloqueou a janela de impressão. Libere as janelas para este site e tente de novo.");return;}
  const ESTILO=`
  @page{size:A4;margin:0}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    color:#344054;font-size:10.6px;line-height:1.42;background:#e9ebee}
  .folha{width:210mm;height:297mm;background:#fff;margin:0 auto 14px;padding:11mm 12mm 15mm;
    position:relative;box-shadow:0 4px 18px rgba(16,24,40,.14);overflow:hidden}
  .topo{font-size:8.6px;color:#667085;border-bottom:1px solid #eaecf0;padding-bottom:5px;margin-bottom:9px}
  .capa{background:linear-gradient(150deg,#0f5b52 0%,#17756a 55%,#2a9d8a 100%);color:#fff;
    padding:13px 16px;border-radius:8px;margin-bottom:11px;display:flex;flex-wrap:wrap;
    justify-content:space-between;align-items:flex-start;gap:14px;
    -webkit-print-color-adjust:exact;print-color-adjust:exact}
  .et{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,.75)}
  .capa h1{font-size:19px;font-weight:700;letter-spacing:-.3px;line-height:1.15;margin-top:2px}
  .capa h1 span{font-size:12px;font-weight:500;color:rgba(255,255,255,.9);display:block;margin-top:1px}
  .rt{text-align:center;font-size:10px;line-height:1.4;flex:none;min-width:190px;
    padding-top:2px;border-top:1px solid rgba(255,255,255,.3)}
  .ex{font-size:10.5px;color:rgba(255,255,255,.92);margin-top:4px}
  .ex span{display:block;font-size:7.6px;text-transform:uppercase;letter-spacing:.9px;
    color:rgba(255,255,255,.62)}
  .rt b{display:block;font-weight:600}
  .rt i{font-style:normal;color:rgba(255,255,255,.82);font-size:9px}
  .un{display:flex;gap:22px;margin-top:9px;padding-top:8px;font-size:9.6px;flex-basis:100%;
    border-top:1px solid rgba(255,255,255,.25)}
  .un span{color:rgba(255,255,255,.7);text-transform:uppercase;font-size:8px;letter-spacing:.8px;margin-right:5px}
  .nums{display:flex;gap:7px;margin-bottom:10px}
  .num{flex:1;border:1px solid #eaecf0;border-radius:7px;padding:6px 9px;background:#f9fafb;text-align:center}
  .num span{display:block;font-size:7.8px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;color:#667085}
  .num b{font-size:16px;color:#101828;font-variant-numeric:tabular-nums}
  h2{font-size:11.5px;font-weight:700;color:#0f5b52;text-transform:uppercase;letter-spacing:.6px;
    border-bottom:2px solid #1d6b57;padding-bottom:4px;margin:7px 0 2px}
  .ar{display:flex;justify-content:space-between;align-items:baseline;background:#e8f5f0;
    border-left:3px solid #1d6b57;padding:4px 8px;margin-top:14px;font-size:10.6px;font-weight:700;
    color:#155244;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .ar b{font-weight:600;color:#667085;font-size:9px}
  .cab,.li{display:grid;grid-template-columns:46px 1fr 66px 18%;gap:8px;padding:4px 8px}
  .cab{font-size:7.9px;text-transform:uppercase;letter-spacing:.5px;color:#667085;font-weight:700;
    border-bottom:1px solid #eaecf0}
  .cab .c,.li .c{text-align:center}
  .li{border-bottom:1px solid #f2f4f7;align-items:start;font-size:10.6px}
  .li .o{color:#667085;font-size:9.6px}
  .li .q{font-size:9.2px;color:#667085}
  .li .q b{display:block;color:#344054;font-weight:600;font-variant-numeric:tabular-nums}
  .li .q i{font-style:normal;display:block;font-size:8.8px}
  .li .q i.grave{color:#b42318;font-weight:600}
  .bx{display:inline-block;width:12px;height:12px;border:1.4px solid #667085;border-radius:2px;
    line-height:10px;font-size:10px;color:#067647;font-weight:700;font-style:normal;text-align:center}
  .pe{position:absolute;left:12mm;right:12mm;bottom:6mm;display:flex;justify-content:space-between;
    font-size:8.4px;color:#667085;border-top:1px solid #eaecf0;padding-top:5px}
  .aviso{width:210mm;margin:14px auto;background:#fffaeb;border:1px solid #fedf89;color:#b54708;
    border-radius:8px;padding:12px 15px;font-size:12.5px;line-height:1.5}
  .aviso b{color:#93370d}
  .aviso button{margin-top:10px;padding:12px 18px;cursor:pointer;font-size:13.5px;border-radius:8px;
    border:0;background:#1d6b57;color:#fff;font-weight:600}
  @media print{.aviso{display:none}body{background:#fff}
    .folha{box-shadow:none;margin:0;break-after:page}.folha:last-child{break-after:auto}}`;

  /* O paginador: monta folha por folha, medindo, para a numeração ser NOSSA.
     Assim ela pode desligar o cabeçalho/rodapé do navegador (que traz a data,
     a hora e o "about:blank" que ela detesta) sem perder o número da página. */
  const PAGINADOR=`(function(){
    var alvo=document.getElementById("alvo");
    var caixa=document.createElement("div");
    caixa.innerHTML=window.__BLOCOS;
    var fila=Array.prototype.slice.call(caixa.children);
    function novaFolha(primeira){
      var f=document.createElement("div");
      f.className="folha";
      f.innerHTML='<div class="topo">'+window.__TITULO+'</div>'
        +(primeira?window.__CABECALHO:"")+'<div class="corpo"></div>';
      alvo.appendChild(f);
      return f;
    }
    var folha=novaFolha(true), corpo=folha.querySelector(".corpo");
    function estourou(){
      var f=folha.getBoundingClientRect(), c=corpo.getBoundingClientRect();
      return (c.bottom-f.top) > (f.height-58);
    }
    for(var i=0;i<fila.length;i++){
      corpo.appendChild(fila[i]);
      if(estourou()){
        corpo.removeChild(fila[i]);
        var volta=[];
        while(corpo.lastChild && /(piso|ar|cab)/.test(corpo.lastChild.className||"")){
          volta.unshift(corpo.lastChild); corpo.removeChild(corpo.lastChild);
        }
        folha=novaFolha(false); corpo=folha.querySelector(".corpo");
        for(var v=0;v<volta.length;v++) corpo.appendChild(volta[v]);
        corpo.appendChild(fila[i]);
      }
    }
    var folhas=alvo.querySelectorAll(".folha");
    for(var k=0;k<folhas.length;k++){
      var pe=document.createElement("div");
      pe.className="pe";
      pe.innerHTML='<span>'+window.__TITULO+'</span><span>'+(k+1)+' / '+folhas.length+'</span>';
      folhas[k].appendChild(pe);
    }
  })();`;

  const doc=w.document;
  doc.open();
  doc.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>'
    +esc(titulo)+'</title><style>'+ESTILO+'</style></head><body>'
    +'<div class="aviso"><b>Antes de imprimir ou salvar em PDF:</b> na caixa que abrir, '
    +'abra <b>Mais definições</b> e <b>desmarque “Cabeçalhos e rodapés”</b>. '
    +'Isso tira a data, a hora e o “about:blank”. A numeração das páginas é nossa '
    +'e continua aparecendo embaixo.<br>'
    +'<button onclick="print()">🖨 Imprimir / Salvar PDF</button></div>'
    +'<div id="alvo"></div></body></html>');
  doc.close();
  /* passa os dados por variável (nada de montar script dentro de string) */
  w.__BLOCOS=blocos; w.__CABECALHO=cabecalho; w.__TITULO=titulo;
  const s=doc.createElement("script");
  s.textContent=PAGINADOR;
  doc.body.appendChild(s);
}

/* =====================================================================
   F-3 · PAINEL DE CONFIGURAÇÃO DA ABA MNT (30/07)
   ---------------------------------------------------------------------
   Ela clicou em "Ver configurações" nesta aba (30/07, no PC do trabalho) e
   a porta abriu vazia — a aba não estava cadastrada no painel. Agora está,
   e por ele ela mexe em TUDO sem código: cabeçalho, textos das colunas,
   o que aparece e o que se esconde. Tudo grava com metaSetU (desfazer pega)
   e viaja na sincronização como qualquer configuração dela.
   ===================================================================== */
async function m28TrocarExecutor(){
  await m28Config();
  const atual=(M28_CAB&&M28_CAB.executor)||(m28Itens().find(d=>d.executor)||{}).executor||"";
  const v=prompt("Quem é o responsável pelos serviços desta folha?",atual);
  if(v===null)return;
  M28_CAB=Object.assign({},M28_CAB||{},{executor:v.trim()});
  await metaSetU("mnt28Cabecalho",M28_CAB);
  dataChanged();renderMnt28();toast("Responsável atualizado ✓");
}
/* mostrar/esconder pedaços da tela (painel de números, selos de origem) */
async function m28Alternar(chave){
  await m28Config();
  M28_VIS=Object.assign({},M28_VIS,{[chave]:M28_VIS[chave]===false});
  await metaSetU("mnt28Visual",M28_VIS);
  dataChanged();renderMnt28();
  if(typeof cfgAbrir==="function")cfgAbrir();   /* reabre o painel no lugar */
}
/* a janelinha com TODOS os textos fixos da folha, cada um num campo */
async function m28GerirTextos(){
  await m28Config();
  const ROTS={etiqueta:"Etiqueta pequena do topo",
    tituloPrefixo:"Começo do título (o mês entra sozinho depois)",
    rotExec:"Rótulo acima do responsável",
    colFeito:"Coluna: feito",colFazer:"Coluna: o que fazer",
    colData:"Coluna: data",colObs:"Coluna: observações (na tela)",
    colObsImp:"Coluna: observações (na folha impressa)",
    rotUnidade:"Rótulo: unidade",rotEmitido:"Rótulo: emitido em"};
  const antigo=document.getElementById("m28-txcfg");if(antigo)antigo.remove();
  let campos="";
  for(const k in ROTS){
    campos+=`<div class="bd-grupo"><label class="bd-rotulo" for="m28tx-${k}">${esc(ROTS[k])}</label>
      <input class="bd-campo" id="m28tx-${k}" value="${esc(M28_TXT[k]||"")}"
        placeholder="${esc(M28_TXT_PADRAO[k])}"></div>`;
  }
  const p=document.createElement("div");
  p.id="m28-txcfg";p.className="cfg-painel";
  p.innerHTML=`<div class="cfg-cx" onclick="event.stopPropagation()">
    <div class="cfg-topo"><b>Textos da folha</b>
      <button class="btn ghost sm" onclick="document.getElementById('m28-txcfg').remove()" aria-label="Fechar">✕</button></div>
    <p class="desc" style="margin:4px 2px 10px">Troque qualquer palavra. Deixar um campo
      vazio volta ao texto padrão (que aparece apagadinho dentro dele).</p>
    ${campos}
    <div class="m28-form-acoes" style="margin-top:12px">
      <button class="bd-btn bd-btn-principal" onclick="m28SalvarTextos()">Salvar</button>
      <button class="bd-btn bd-btn-fantasma" onclick="document.getElementById('m28-txcfg').remove()">Cancelar</button>
    </div></div>`;
  p.onclick=()=>p.remove();
  document.body.appendChild(p);
  const c=p.querySelector("input");if(c)c.focus();
}
async function m28SalvarTextos(){
  const novo={};
  for(const k in M28_TXT_PADRAO){
    const el=document.getElementById("m28tx-"+k);if(!el)continue;
    const v=el.value.trim();
    if(v&&v!==M28_TXT_PADRAO[k])novo[k]=v;    /* só guarda o que difere do padrão */
  }
  await metaSetU("mnt28Textos",novo);
  M28_TXT=Object.assign({},M28_TXT_PADRAO,novo);
  const j=document.getElementById("m28-txcfg");if(j)j.remove();
  dataChanged();renderMnt28();toast("Textos da folha atualizados ✓");
}
/* o cadastro no painel "Ver configurações" — a mesma porta das outras abas */
if(typeof CFG_ABAS!=="undefined")CFG_ABAS.mnt28=()=>[
  {gr:"layout",rot:"Painel de números",dica:"Os 4 cartões do topo (serviços, a fazer…)",
   valor:()=>((M28_VIS||{}).kpis===false)?"Escondido":"Visível",acao:()=>m28Alternar("kpis")},
  {gr:"layout",rot:"Selos de origem",dica:"As etiquetas VT 27/04, PPR… junto dos serviços",
   valor:()=>((M28_VIS||{}).origem===false)?"Escondidos":"Visíveis",acao:()=>m28Alternar("origem")},
  {gr:"filtrar",rot:"Filtrar",dica:"Busca, piso, área e o que mostrar",
   valor:()=>cfgConta([M28F.q,M28F.piso,M28F.area,M28F.ver!=="todos"?M28F.ver:""]),
   acao:()=>{cfgFechar();const q=document.getElementById("m28q");if(q)q.focus();}},
  {gr:"outros",rot:"Seu nome",dica:"Como sai no alto da folha",
   valor:()=>m28RtNome(M28_CAB||{}),
   acao:()=>{cfgFechar();m28TrocarRt("nome");}},
  {gr:"outros",rot:"Cargo e registro",dica:"A linha embaixo do nome",
   valor:()=>{const l=m28RtLinha(M28_CAB||{});return l.length>24?l.slice(0,24)+"…":l;},
   acao:()=>{cfgFechar();m28TrocarRt("linha");}},
  {gr:"outros",rot:"Responsável pelos serviços",dica:"Quem executa esta folha",
   valor:()=>(M28_CAB&&M28_CAB.executor)||(m28Itens().find(d=>d.executor)||{}).executor||"—",
   acao:()=>{cfgFechar();m28TrocarExecutor();}},
  {gr:"outros",rot:"Data de emissão",dica:"A data que sai na folha e dá o mês do título",
   valor:()=>brDate((M28_CAB&&M28_CAB.emitidoEm)||today()),
   acao:()=>{cfgFechar();m28TrocarEmissao();}},
  {gr:"outros",rot:"Textos da folha",dica:"Título, colunas e rótulos — troque qualquer palavra",
   valor:()=>"10 textos",
   acao:()=>{cfgFechar();m28GerirTextos();}}
];
