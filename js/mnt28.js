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
/* exec (03/08, LAY-3): "Folha de: Sr. João · Matheus · Todos". A elétrica é do
   Matheus e nunca entra na folha de quem faz obra — mas as duas moram na mesma
   aba, com o mesmo desenho. Trocar o nome aqui troca a folha inteira, inclusive
   a impressa. */
let M28F={q:"",piso:"",area:"",ver:"todos",exec:"",fechadas:{}};

/* quem tem serviço nesta folha — sai dos próprios itens, não de uma lista fixa,
   para o seletor nunca oferecer um nome sem nenhum serviço atrás */
function m28Executores(itens){
  return [...new Set((itens||m28Itens()).map(d=>(d.executor||"").trim()).filter(Boolean))].sort();
}
/* "a folha aberta agora": todos os serviços, ou só os da pessoa escolhida.
   É o que os números do topo e o botão do VERIFICAR precisam enxergar — sem
   isto, a folha do Matheus mostraria o contador do Sr. João. */
function m28ItensDaFolha(){
  const t=m28Itens();
  return M28F.exec?t.filter(d=>(d.executor||"").trim()===M28F.exec):t;
}

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
/* 30/07 — padrões trocados pela folha anotada dela (Folha 1):
   título por extenso, colunas "Feito? | Demanda | Data Registro | Observações".
   Continua tudo editável pelo ✎ — isto é só o novo ponto de partida. */
const M28_TXT_PADRAO={
  etiqueta:"Relatório de manutenção",
  tituloPrefixo:"Manutenção e Infraestrutura —",
  rotExec:"Responsável pelos serviços",
  colFeito:"Feito?",colFazer:"Demanda",
  /* "Observacoes" era vago demais, palavra dela em 25/08. Virou "Lembretes".
     CUIDADO: o campo so-dela continua sendo "Letícia revisar urgente", com cadeado. */
  colData:"Data Registro",colObs:"Lembretes",colObsImp:"Lembretes",
  rotUnidade:"Unidade",rotEmitido:"Emitido em",
  /* LAY-6 (26/08): os tres da faixa e o de quem assina. Como todo rotulo daqui,
     ela troca pelo painel de textos -- nada e' fixo no codigo. */
  rotLoja:"Loja",rotPiso:"Piso",rotMes:"Mês",rotRt:"Resp. técnica",
  /* SJ-1c (03/08, decisão dela): o bloco de causa só existe quando MUITOS
     serviços têm a mesma origem — a maresia é o caso. Vazio = não aparece.
     O texto é dela; eu não crio bloco por conta própria. */
  causaTitulo:"",causaTexto:""};
let M28_TXT=null,M28_VIS=null;
function m28T(){return M28_TXT||M28_TXT_PADRAO;}
async function m28Config(){
  if(M28_ORDEM===null)M28_ORDEM=await metaGet("mnt28Ordem")||{};
  if(M28_CAB===null)M28_CAB=await metaGet("mnt28Cabecalho")||{};
  if(M28_TXT===null)M28_TXT=Object.assign({},M28_TXT_PADRAO,await metaGet("mnt28Textos")||{});
  if(M28_VIS===null)M28_VIS=Object.assign({kpis:true,origem:true},await metaGet("mnt28Visual")||{});
}
/* recarga forçada — chamada pelo Ctrl+Z e pela sincronização, que mudam o banco
   por baixo do que já está na memória da página. Sem isto, ela desfazia a troca
   de um texto da folha e a tela continuava mostrando o texto velho. */
async function m28RecarregarConfig(){
  M28_ORDEM=null;M28_CAB=null;M28_TXT=null;M28_VIS=null;
  await m28Config();
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
  const partes=String(iso).split("-");
  const mes=M28_MESES[Number(partes[1])-1]||"";
  const ano=partes[0]||"";
  const quando=mes?(mes.charAt(0).toUpperCase()+mes.slice(1)+" de "+ano):"";
  /* LAY-4 (25/08): a folha diz de QUAL loja e de QUAL piso ela e. Sem isso as
     tres folhas saiam com o mesmo nome no topo e ele recebia duas iguais. */
  const sigla=(currentStore||"").trim();
  const piso=(M28F.piso||"").trim();
  const pedacos=[];
  if(sigla)pedacos.push(sigla);
  if(piso)pedacos.push(m28PisoBonito(piso));
  const onde=pedacos.join(" - ");
  if(!onde)return m28T().tituloPrefixo+(quando?" · "+quando:"");
  return onde+(quando?" · "+quando:"");
}

/* "1º PISO", "1o piso" e "1º Piso" sao o mesmo piso: no titulo sai um so jeito */
/* LAY-6 (26/08): o cabecalho da folha passou a ser a opcao 4, escolhida por ela
   numa pagina em que viu as cinco lado a lado, em papel, com os dados de verdade.
   O bloco verde FICA -- palavras dela: "eu quero aquele fundo verde, aquilo ali e'
   o que mais chama a atencao". O que muda e' o tamanho de cada informacao: quatro
   coisas em destaque (o assunto, a loja, o piso e o mes) e o resto numa linha fina
   embaixo, dentro do proprio verde.
   Estas tres funcoes existem porque a faixa mostra loja, piso e mes SEPARADOS --
   antes os tres viviam grudados numa frase so, dentro de m28Titulo(). */
function m28Assunto(){
  /* "Manutencao e Infraestrutura —" e' o comeco do titulo que ela edita pelo lapis.
     Na faixa ele aparece sozinho, entao o travessao do fim sai. */
  return String(m28T().tituloPrefixo||"").replace(/\s*[—–-]\s*$/,"").trim();
}
function m28Mes(c){
  const iso=(c&&c.emitidoEm)||today();
  const partes=String(iso).split("-");
  const mes=M28_MESES[Number(partes[1])-1]||"";
  return mes?(mes.charAt(0).toUpperCase()+mes.slice(1)+" de "+(partes[0]||"")):"";
}
function m28PisoBonito(nome){
  const c=(nome||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
          .replace(/\s+/g," ").trim().toLowerCase();
  const n=c.match(/^([123])[oº]? ?piso$/);
  return n?n[1]+"º Piso":nome;
}
/* ===== O NOME E A LINHA DE BAIXO — DELA, EDITÁVEIS (29/07) =====
   Antes o nome vinha do texto livre dos "seus dados" (que já trazia a palavra
   Nutricionista dentro) e a linha de baixo era montada de novo a partir de cargo
   e CRN: a mesma informação aparecia duas vezes na folha dela.
   Agora são dois campos, guardados no cabeçalho da aba e trocados pelo lápis.
   Se ela ainda não trocou nada, vale o que ela pediu em 29/07. */
/* ela tirou "de Producao" em 25/08: a folha vai para fora e o cargo curto basta */
const M28_RT_LINHA="Nutricionista – RT · CRN-4: 22103217";
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
  await (typeof folhasCfgSet==="function"?folhasCfgSet:metaSetU)("mnt28Cabecalho",M28_CAB); /* metaSetU: o desfazer pega */
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
  await (typeof folhasCfgSet==="function"?folhasCfgSet:metaSetU)("mnt28Cabecalho",M28_CAB);
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
  if(c.ordemAreas){M28_ORDEM=c.ordemAreas;await (typeof folhasCfgSet==="function"?folhasCfgSet:metaSetU)("mnt28Ordem",c.ordemAreas);}
  M28_CAB={periodo:c.periodo||"",rt:c.rt||"",crn:c.crn||"",
    emitidoEm:c.emitidoEm||today(),executor:c.executor||"",lojaNome:c.lojaNome||""};
  await (typeof folhasCfgSet==="function"?folhasCfgSet:metaSetU)("mnt28Cabecalho",M28_CAB);
  await metaSetU("mnt28Cargas",feitas.concat([c.cargaId]));
  if(novos.length){dataChanged();toast(novos.length+" serviços carregados ✓");}
  return novos.length>0;
}

/* ---- tela ---- */
async function renderMnt28(){
  const el=document.getElementById("tab-mnt28");if(!el)return;
  await m28Config();
  await m28CargaInicial();
  const todos=m28Itens();
  /* LAY-3: escolhida uma pessoa, TUDO passa a ser a folha dela — capa, números
     e lista. Números da folha inteira embaixo do nome de uma pessoa só seriam
     um número que a prejudica, e isso aqui não pode acontecer. */
  const itens=M28F.exec?todos.filter(d=>(d.executor||"").trim()===M28F.exec):todos;
  const c=m28Cab(itens.length?itens:todos);
  const loja=(empresa(currentStore)||{}).name||currentStoreName||currentStore||"";
  /* o executor que ELA gravou no cabeçalho vence o que veio na carga —
     antes era ao contrário e a edição dela não aparecia (F-3) */
  const exec=M28F.exec||c.executor||(itens.find(d=>d.executor)||{}).executor||"";
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
        ${/* o lápis fica NO título (30/07): ela toca na palavra que quer mudar,
             não procura num menu. Abre a janelinha com todos os textos da folha. */""}
        <div class="m28-capa-et">${esc(m28T().etiqueta)}
          <button class="m28-lapis" onclick="m28GerirTextos()" title="Trocar esta etiqueta e os outros textos da folha" aria-label="Trocar esta etiqueta e os outros textos da folha">✎</button></div>
        <h1>${esc(m28Titulo(c))}
          <button class="m28-lapis" onclick="m28GerirTextos()" title="Trocar o título e os outros textos da folha" aria-label="Trocar o título e os outros textos da folha">✎</button></h1>
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
      ${/* Folha 1 dela: o responsável saiu de baixo do título e veio para esta linha */""}
      ${exec?`<div class="m28-capa-i"><span class="rot">${esc(m28T().rotExec)}</span><span class="val">${esc(exec)}</span>
        <button class="m28-lapis" onclick="m28TrocarExecutor()" title="Trocar o responsável pelos serviços" aria-label="Trocar o responsável pelos serviços">✎</button></div>`:""}
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
  /* Folha 1 dela: o card "Pisos" saiu e entrou o card URGENTES — com a palavra,
     porque cor sozinha nunca diz nada. Urgente é o que ELA marcar no lápis. */
  const urgentes=itens.filter(d=>d.urg&&!d.feito).length;
  const numeros=`<div class="bd-kpis m28-nums">
    ${kpi("Serviços",total,"em "+areas.length+(areas.length===1?" área":" áreas"))}
    ${kpi("A fazer",total-feitos,(total?Math.round((total-feitos)/total*100):0)+"% do total","m28-pend")}
    ${kpi("Feitos",feitos,"marcados por você","m28-ok")}
    ${kpi("Urgentes",urgentes,urgentes?"destacados para o executor":"nenhum marcado","m28-urg")}
  </div>`;

  const nVer=m28QtdVerificar();
  const opPiso=pisos.map(p=>`<option value="${esc(p)}"${M28F.piso===p?" selected":""}>${esc(p)}</option>`).join("");
  const opArea=areas.sort().map(a=>`<option value="${esc(a)}"${M28F.area===a?" selected":""}>${esc(a)}</option>`).join("");
  /* só aparece quando há mais de uma pessoa com serviço — com um executor só,
     um seletor de um item é ruído na barra */
  /* sai de TODOS, nunca dos filtrados: senão, escolhida uma pessoa, o seletor
     ficaria só com ela e não haveria caminho de volta */
  const execs=m28Executores(todos);
  const opExec=execs.length>1?execs.map(e=>{
    const n=todos.filter(d=>(d.executor||"").trim()===e).length;
    return `<option value="${esc(e)}"${M28F.exec===e?" selected":""}>Folha de: ${esc(e)} (${n})</option>`;
  }).join(""):"";
  const barra=`<div class="toolbar m28-barra">
    <div class="search">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="text" id="m28q" aria-label="Buscar nesta folha" autocomplete="off" spellcheck="false"
        placeholder="Buscar por serviço, área ou observação…" value="${esc(M28F.q)}" oninput="m28Filtro('q',this.value)">
    </div>
    ${opExec?`<select aria-label="Escolher de quem é a folha" onchange="m28Filtro('exec',this.value)"
      title="A folha inteira passa a ser desta pessoa — na tela e na impressão"><option value="">Folha de: todos</option>${opExec}</select>`:""}
    <select aria-label="Filtrar por piso" onchange="m28Filtro('piso',this.value)"><option value="">Todos os pisos</option>${opPiso}</select>
    <select aria-label="Filtrar por área" onchange="m28Filtro('area',this.value)"><option value="">Todas as áreas</option>${opArea}</select>
    <select aria-label="Mostrar" onchange="m28Filtro('ver',this.value)">
      <option value="todos"${M28F.ver==="todos"?" selected":""}>Todos</option>
      <option value="fazer"${M28F.ver==="fazer"?" selected":""}>Só o que falta</option>
      <option value="feitos"${M28F.ver==="feitos"?" selected":""}>Só os feitos</option>
      <option value="lembretes"${M28F.ver==="lembretes"?" selected":""}>🔒 Só com o meu lembrete</option>
    </select>
    <button class="btn ghost sm" onclick="m28Novo()" title="Acrescentar um serviço nesta folha">+ Serviço</button>
    ${nVer?`<button class="btn ghost sm" onclick="m28MoverVerificar()"
      title="Tirar da folha impressa as ${nVer} observações que começam com VERIFICAR — elas continuam aqui, só para você">🔒 Tirar ${nVer} “VERIFICAR” da folha impressa</button>`:""}
    <button class="btn ghost sm" onclick="m28Imprimir()" title="Abrir a folha pronta para imprimir ou salvar em PDF">🖨 Imprimir / PDF</button>
    ${/* F-4 e PL-1: as mesmas linhas da tela, levadas para fora. Respeitam os
         filtros — escolhida a folha do Matheus, sai só a dele. */""}
    <button class="btn ghost sm" onclick="m28ParaWord()" title="Baixar esta folha em Word, para editar ou anexar">📄 Word</button>
    <button class="btn ghost sm" onclick="m28ParaWhatsApp()" title="Copiar esta folha em texto, pronta para colar no WhatsApp">💬 WhatsApp</button>
    <button class="btn ghost sm" onclick="m28ParaPlanilha()" title="Baixar esta folha em planilha (abre no Excel)">📊 Planilha</button>
  </div>`;

  el.innerHTML=capa+(M28_VIS&&M28_VIS.kpis===false?"":numeros)+barra+'<div id="m28-lista"></div>';
  m28RenderLista();
}

function m28Filtro(k,v){
  M28F[k]=v;
  /* trocar de folha muda a capa, os números e o botão de imprimir — não só a
     lista. Por isso o executor redesenha a aba inteira; os outros filtros não. */
  if(k==="exec"){M28F.fechadas={};renderMnt28();return;}
  m28RenderLista();
}

function m28RenderLista(){
  const el=document.getElementById("m28-lista");if(!el)return;
  const q=(M28F.q||"").toLowerCase();
  let rows=m28Itens().filter(d=>{
    if(M28F.exec&&(d.executor||"").trim()!==M28F.exec)return false;   /* a folha é de uma pessoa só */
    if(M28F.piso&&d.piso!==M28F.piso)return false;
    if(M28F.area&&d.area!==M28F.area)return false;
    if(M28F.ver==="fazer"&&d.feito)return false;
    if(M28F.ver==="feitos"&&!d.feito)return false;
    if(M28F.ver==="lembretes"&&!(d.nota||"").trim())return false;   /* o "só pra mim" à vista, sempre */
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
      const fechada=!!M28F.fechadas[k];
      /* Folha 2 dela: cada área pode FECHAR, igual ao Notion — a setinha gira e
         os serviços somem até abrir de novo. Só arruma a vista: nada se apaga. */
      html+=`<div class="m28-area${fechada?" fechada":""}" data-piso="${esc(d.piso)}" data-area="${esc(area)}">`
        +`<button class="m28-abrefecha" onclick="m28AbreFecha('${esc(k).replace(/'/g,"\'")}')"
            aria-expanded="${fechada?"false":"true"}" title="${fechada?"Abrir esta área":"Fechar esta área"}"
            aria-label="${fechada?"Abrir":"Fechar"} a área ${esc(area)}">${fechada?"›":"⌄"}</button>`
        +`<span class="m28-area-nome">${esc(area)}</span>`
        +`<button class="m28-lapis m28-lapis-area" onclick="m28RenomearArea('${esc(d.piso).replace(/'/g,"\'")}','${esc(area).replace(/'/g,"\'")}')"
            title="Renomear esta área (vale para a folha inteira)" aria-label="Renomear a área ${esc(area)}">✎</button>`
        +`<span class="m28-count">${f?f+" de "+n+" feitos":n+(n===1?" serviço":" serviços")}</span>`
        +(fechada?"":`<div class="m28-tab-cab"><span>${esc(m28T().colFeito)}</span><span>${esc(m28T().colFazer)}</span><span>${esc(m28T().colData)}</span><span>${esc(m28T().colObs)}</span></div>`)
        +`</div>`;}
    if(M28F.fechadas[d.piso+"|"+d.area])continue;
    if(M28_EDITANDO===d.id){html+=m28FormHTML(d);continue;}
    const fotos=(d.fotos||[]).map((f,i)=>`<img class="m28-foto" src="${f}" alt="Foto do serviço"
        onclick="m28VerFoto(${d.id},${i})" title="Toque para ver grande">`).join("");
    html+=`<div class="m28-item${d.feito?" feito":""}" data-id="${d.id}">
      <button class="m28-check" role="checkbox" aria-checked="${d.feito?"true":"false"}"
        aria-label="Marcar como feito: ${esc((d.fazer||"").slice(0,70))}"
        title="${d.feito?"Marcado como feito — toque para desmarcar":"Marcar como feito"}"
        onclick="m28Marcar(${d.id})"><span aria-hidden="true">${d.feito?"✓":""}</span></button>
      <div class="m28-fazer m28-linhas">${d.urg?`<span class="m28-urgselo">Urgente</span> `:""}${esc(m28SemTravessao(d.fazer||""))}
        ${(d.origem&&!(M28_VIS&&M28_VIS.origem===false))?`<span class="m28-origem">${esc(d.origem)}</span>`:""}
        ${typeof orientacaoHTML==="function"?orientacaoHTML(d):""}
        ${fotos?`<div class="m28-fotos">${fotos}</div>`:""}</div>
      <div class="m28-desde">${m28Desde(d)}</div>
      ${/* DUAS CAIXAS DIFERENTES (29/07): o RECADO sai na folha de quem
            conserta; o LEMBRETE é só dela e nunca é impresso. Antes havia
            uma só, e o que ela anotava para si saía impresso para o Sr. João.
            O selo escrito ("só eu vejo") acompanha a cor — cor nunca sozinha. */""}
      <div class="m28-obs">${d.obs?m28Texto(d.obs):(d.nota?"":'<span class="m28-vaziotxt">—</span>')}
        ${d.nota?`<div class="m28-nota"><span class="m28-nota-selo">🔒 Letícia revisar urgente · não sai na folha</span>${m28Texto(d.nota)}</div>`:""}</div>
      <div class="m28-acts">
        <button class="btn ghost sm" onclick="m28ParaQualidade(${d.id})" aria-label="Transferir para o relatório de Qualidade"
          title="Transferir: sai desta folha e vira uma Não Conformidade no relatório de Qualidade">⇄</button>
        <button class="btn ghost sm" onclick="m28Editar(${d.id})" aria-label="Editar este serviço" title="Mudar este serviço aqui mesmo, sem sair da tela">✎</button>
        <button class="delbtn" aria-label="Excluir este serviço" title="Excluir este serviço" onclick="m28Excluir(${d.id})">🗑</button>
      </div></div>`;
  }
  html+=m28CausaHTML();
  el.innerHTML=html;
}
/* =====================================================================
   F-4 e PL-1 (03/08) — a folha sai em WORD, em WHATSAPP e em PLANILHA
   A tela é a fonte; estes três são só formas de levar o mesmo conteúdo
   para fora. Respeitam os filtros da barra, inclusive o de responsável:
   escolhida a folha do Matheus, sai só a dele.
   ===================================================================== */
function m28Filtradas(){
  let rows=m28ItensDaFolha();
  if(M28F.ver==="fazer")rows=rows.filter(d=>!d.feito);
  if(M28F.ver==="feitos")rows=rows.filter(d=>d.feito);
  if(M28F.piso)rows=rows.filter(d=>d.piso===M28F.piso);
  if(M28F.area)rows=rows.filter(d=>d.area===M28F.area);
  return rows.sort(m28Comparar);
}
function m28NomeArquivo(){
  const c=m28Cab(m28Filtradas());
  const quem=M28F.exec||c.executor||"";
  return m28Titulo(c).replace(/[\\/:*?"<>|]/g,"-")+(quem?" - "+quem.replace(/[\\/:*?"<>|]/g,"-"):"");
}
/* PL-1: a planilha vira EXPORTAÇÃO. O site é o original — ela edita aqui e
   a planilha sai igual, quando precisar mandar para alguém. */
function m28ParaPlanilha(){
  const rows=m28Filtradas();
  if(!rows.length){alert("Nenhum serviço para exportar com os filtros atuais.");return;}
  const head=["Piso","Área","O que fazer","Feito","Data do registro","Tempo parado",
    "Responsável","Orientação técnica","Tipo","Base legal","Urgente","Observações","Origem"];
  const linha=d=>[d.piso,d.area,d.fazer,d.feito?"Sim":"Não",brDate(d.dataRegistro),
    m28TempoTexto(m28Meses(d.dataRegistro)),d.executor||"",
    d.orientacao||"",(typeof ORI_TIPOS!=="undefined"&&ORI_TIPOS[d.orientacaoTipo])?ORI_TIPOS[d.orientacaoTipo].rotulo:"",
    d.orientacaoBase||"",d.urg?"Sim":"",d.obs||"",d.origem||""];
  /* ponto e vírgula + BOM: é assim que o Excel em português abre certo */
  const csv=[head,...rows.map(linha)]
    .map(r=>r.map(c=>'"'+String(c==null?"":c).replace(/"/g,'""')+'"').join(";")).join("\r\n");
  download(m28NomeArquivo()+".csv","﻿"+csv,"text/csv");
  toast("Planilha exportada ✓ ("+rows.length+" serviços)");
}
/* F-4: a folha em Word, para ela editar ou anexar num relatório */
async function m28ParaWord(){
  if(typeof DocxLite!=="function"){toast("O gerador de Word não carregou — recarregue a página.");return;}
  const rows=m28Filtradas();
  if(!rows.length){alert("Nenhum serviço para gerar com os filtros atuais.");return;}
  const c=m28Cab(rows);
  const exec=M28F.exec||c.executor||"";
  const loja=(empresa(currentStore)||{}).name||currentStoreName||currentStore||"";
  const doc=new DocxLite();
  doc.p(m28T().etiqueta,{size:16,color:"6B7280"});
  doc.p(m28Titulo(c),{bold:true,size:32,color:"155244"});
  if(exec)doc.p(m28T().rotExec+": "+exec,{size:21});
  doc.p(m28T().rotUnidade+": "+loja+"    "+m28T().rotEmitido+": "+brDate(c.emitidoEm||today()),{size:19,color:"5C5D68"});
  doc.p(m28RtNome(c),{bold:true,size:21});
  doc.p(m28RtLinha(c),{size:18,color:"5C5D68"});
  doc.p("");
  let piso=null,area=null;
  for(const d of rows){
    if(d.piso!==piso){piso=d.piso;area=null;doc.p("");doc.p((piso||"Sem piso").toUpperCase(),{bold:true,size:24,color:"1D6B57"});}
    if(d.area!==area){area=d.area;doc.p(area,{bold:true,size:21});}
    doc.p((d.feito?"[x] ":"[ ] ")+(d.urg?"URGENTE — ":"")+(d.fazer||""),d.urg?{bold:true,color:"B42318"}:{});
    /* LEG-1 (25/08): a norma nao vai para quem executa, so para a gerencia.
       Vale em toda forma de entregar a folha dele: PDF, Word e WhatsApp. */
    const ori="";
    if(ori)doc.p(ori,{size:18,color:"475467"});
    const desde=d.dataRegistro?brDate(d.dataRegistro)+(m28TempoTexto(m28Meses(d.dataRegistro))?" · "+m28TempoTexto(m28Meses(d.dataRegistro)):""):"";
    if(desde)doc.p(desde,{size:17,color:"667085"});
    /* o lembrete 🔒 dela NUNCA sai — nem aqui */
    if(d.obs)doc.p(d.obs,{size:18,color:"5C5D68"});
  }
  const ct=(m28T().causaTitulo||"").trim(),cx=(m28T().causaTexto||"").trim();
  if(ct||cx){doc.p("");doc.p(ct||"Por que isto se repete",{bold:true,size:19,color:"4A6B62"});doc.p(cx,{size:18});}
  download(m28NomeArquivo()+".docx",await doc.blob());
  toast("Word gerado ✓ ("+rows.length+" serviços)");
}
/* F-4: texto pronto para colar no WhatsApp — sem tabela, sem formatação que
   o WhatsApp não entenda; só *negrito* e traços */
function m28ParaWhatsApp(){
  const rows=m28Filtradas();
  if(!rows.length){alert("Nenhum serviço para enviar com os filtros atuais.");return;}
  const c=m28Cab(rows);
  const exec=M28F.exec||c.executor||"";
  let t="*"+m28Titulo(c)+"*\n";
  if(exec)t+=m28T().rotExec+": "+exec+"\n";
  t+=m28T().rotEmitido+": "+brDate(c.emitidoEm||today())+"\n";
  let piso=null,area=null;
  for(const d of rows){
    if(d.piso!==piso){piso=d.piso;area=null;t+="\n*"+(piso||"Sem piso").toUpperCase()+"*\n";}
    if(d.area!==area){area=d.area;t+="\n_"+area+"_\n";}
    t+=(d.feito?"✅ ":"⬜ ")+(d.urg?"*URGENTE* — ":"")+(d.fazer||"")+"\n";
    /* LEG-1 (25/08): a norma nao vai para quem executa, so para a gerencia.
       Vale em toda forma de entregar a folha dele: PDF, Word e WhatsApp. */
    const ori="";
    if(ori)t+="   ↳ "+ori+"\n";
    if(d.obs)t+="   "+d.obs+"\n";
  }
  const ct=(m28T().causaTitulo||"").trim(),cx=(m28T().causaTexto||"").trim();
  if(ct||cx)t+="\n*"+(ct||"Por que isto se repete")+"*\n"+cx+"\n";
  m28CopiarTexto(t,rows.length);
}
async function m28CopiarTexto(t,n){
  try{
    await navigator.clipboard.writeText(t);
    toast("Copiado ✓ ("+n+" serviços) — cole no WhatsApp");
  }catch(e){
    /* sem permissão de área de transferência: mostra para ela copiar à mão */
    ncModal(`<h2>Folha para o WhatsApp</h2>
      <p class="desc">Seu navegador não deixou copiar sozinho. Selecione tudo e copie.</p>
      <textarea class="bd-campo" rows="14" style="font-size:13px" onclick="this.select()">${esc(t)}</textarea>
      <div class="form-actions"><button class="btn" onclick="ncFechar()">Fechar</button></div>`);
    const a=document.querySelector("#nc-modal textarea");if(a){a.focus();a.select();}
  }
}

/* SJ-1c: um bloco só, no fim da folha, explicando a causa que se repete.
   Só aparece se ela escreveu — nunca nasce sozinho. */
function m28CausaHTML(){
  const t=(m28T().causaTitulo||"").trim(),x=(m28T().causaTexto||"").trim();
  if(!t&&!x)return "";
  return `<div class="ori-causa">
    <div class="ori-causa-t">${esc(t||"Por que isto se repete")}
      <button class="m28-lapis m28-lapis-area" onclick="m28GerirTextos()"
        title="Mudar este bloco" aria-label="Mudar o bloco de causa">✎</button></div>
    <div class="ori-causa-tx">${esc(x)}</div></div>`;
}

/* ===== "VERIFICAR" GANHA SELO ESCRITO (29/07) =====
   "VERIFICAR" não é dúvida do site: é lembrete dela de conferir na loja, e
   NUNCA se apaga. Estava escondido no meio do texto cinza. Agora vira um selo
   com a PALAVRA escrita — vermelho ajuda, mas quem informa é a palavra, porque
   cor sozinha não pode ser a única forma de dizer algo (e há quem não a veja). */
/* O TRAVESSAO LONGO SAI DO TEXTO, E SO DO TEXTO (25/08).
   Correcao dela no mesmo dia: "e pra voce manter sim o travessao nos titulos, no
   cabecalho, no CRN, no nome das areas. Ele so nao e pra ser usado em texto."
   Entao: demanda, observacao e lembrete passam por aqui; titulo, faixa do topo,
   linha do CRN e nome de area NAO passam.
   Regra dela, repetida varias vezes: "eu nao sei nem usar isso, nao sei nem
   como que faz isso no teclado e nao quero saber, porque eu nao uso. Fica
   muito inteligente e artificial."
   Ele volta a aparecer sempre que um texto e colado de fora (Word, WhatsApp,
   celular), entao a limpeza mora AQUI, na saida: vale para o que ja existe e
   para o que ainda vier. Vira ponto quando separa duas frases, virgula quando
   so aparta. */
function m28SemTravessao(t){
  if(!t) return t;
  return String(t)
    .replace(/\s*[—–]\s*(?=[A-ZÀ-Ü])/g, ". ")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/([,.;:])\s*([,.;:])/g, "$1")
    .replace(/[ \t]{2,}/g, " ");
}

function m28Texto(t){
  const s=esc(m28SemTravessao(t||""));
  return s.replace(/^\s*VERIFICAR\b[\s:—-]*/i,'<span class="m28-verificar">Verificar</span>');
}
/* Quantos recados impressos ainda são, na verdade, lembrete dela */
function m28QtdVerificar(){
  return m28ItensDaFolha().filter(d=>/^\s*VERIFICAR\b/i.test(d.obs||"")).length;
}
/* Um clique só: leva todos esses para "meu lembrete", que não é impresso.
   Não faço isso sozinho porque é texto dela — mas deixo a um toque. */
async function m28MoverVerificar(){
  const alvos=m28ItensDaFolha().filter(d=>/^\s*VERIFICAR\b/i.test(d.obs||""));
  if(!alvos.length)return;
  if(!confirm("Mover "+alvos.length+" observação(ões) que começam com VERIFICAR para \"Letícia revisar urgente\"?\n\n"
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
  /* a lista de quem executa é a MESMA da aba antiga (ela já cadastra e renomeia
     por lá) — nunca uma segunda lista para ela manter em dois lugares */
  const opExec=(typeof execOptionsHTML!=="undefined")
    ? execOptionsHTML(d.executor||"")
    : `<option selected>${esc(d.executor||"")}</option>`;
  return `<div class="m28-form" data-id="${d.id}">
    <div class="bd-grupo">
      <label class="bd-rotulo" for="m28f-fazer">O que fazer?</label>
      <textarea class="bd-campo" id="m28f-fazer" rows="3"
        placeholder="Escreva o problema e a correção na mesma frase…">${esc(m28SemTravessao(d.fazer||""))}</textarea>
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
      ${/* LAY-3 (03/08): quem executa passa a ser DESTE serviço, não da folha
           inteira. É o que faz a folha do Matheus existir sem aba nova. A lista
           é a mesma que ela já edita na aba antiga — não se cria outra. */""}
      <div class="bd-grupo">
        <label class="bd-rotulo" for="m28f-exec">Quem faz</label>
        <select class="bd-campo" id="m28f-exec">${opExec}</select>
        <span class="bd-ajuda">Manda o serviço para a folha desta pessoa.</span>
      </div>
    </div>
    <div class="m28-form-linha">
      <div class="bd-grupo">
        <label class="bd-rotulo" for="m28f-obs">Recado para quem vai executar</label>
        <textarea class="bd-campo" id="m28f-obs" rows="2"
          placeholder="Ex.: usar tinta epóxi, própria para área úmida.">${esc(m28SemTravessao(d.obs||""))}</textarea>
        <span class="bd-ajuda">Isto <b>sai impresso</b> na folha dele.</span>
      </div>
      <div class="bd-grupo">
        <label class="bd-rotulo" for="m28f-nota">Letícia revisar urgente 🔒</label>
        <textarea class="bd-campo" id="m28f-nota" rows="2"
          placeholder="Ex.: VERIFICAR — confirmar na loja se ainda existe.">${esc(d.nota||"")}</textarea>
        <span class="bd-ajuda">Só você vê. <b>Nunca é impresso.</b></span>
      </div>
    </div>
    ${/* LEG-0 (03/08): a orientação técnica com a base legal. Sai impressa na
         folha, junto do serviço, com a categoria escrita. */""}
    ${typeof orientacaoFormHTML==="function"?orientacaoFormHTML(d,"m28f"):""}
    <div class="bd-grupo">
      <label class="m28-urgchk"><input type="checkbox" id="m28f-urg" ${d.urg?"checked":""}>
        <span class="m28-urgselo">Urgente</span> destacar este serviço para o executor</label>
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
  d.urg=!!document.getElementById("m28f-urg")?.checked;
  if(typeof orientacaoLer==="function")Object.assign(d,orientacaoLer("m28f"));
  const ex=document.getElementById("m28f-exec");
  const execAntes=(d.executor||"").trim();
  if(ex)d.executor=ex.value==="Outro"?"":ex.value;
  d.mod=nowISO();
  await putItem(d);dataChanged();
  M28_EDITANDO=null;m28AtualizarTopo();
  /* trocou de dono: a barra precisa se refazer, senão o seletor fica sem o nome
     novo (ou com um nome que já não tem nenhum serviço atrás) */
  if((d.executor||"").trim()!==execAntes){renderMnt28();toast("Serviço enviado para a folha de "+(d.executor||"ninguém")+" ✓");return;}
  m28RenderLista();toast("Serviço atualizado ✓");
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
  const itens=m28ItensDaFolha(),total=itens.length,feitos=itens.filter(d=>d.feito).length;
  const el=document.getElementById("tab-mnt28");if(!el)return;
  const nums=el.querySelectorAll(".m28-nums .bd-kpi");
  if(nums.length>=3){
    nums[0].querySelector(".bd-kpi-num").textContent=total;
    nums[1].querySelector(".bd-kpi-num").textContent=total-feitos;
    nums[1].querySelector(".bd-kpi-obs").textContent=(total?Math.round((total-feitos)/total*100):0)+"% do total";
    nums[2].querySelector(".bd-kpi-num").textContent=feitos;
    if(nums[3]){const u=itens.filter(d=>d.urg&&!d.feito).length;
      nums[3].querySelector(".bd-kpi-num").textContent=u;
      nums[3].querySelector(".bd-kpi-obs").textContent=u?"destacados para o executor":"nenhum marcado";}
  }
}

/* =====================================================================
   IMPRESSÃO — a folha que vai para a mão do executor
   Mesmo caminho do resto do site: abre uma janela e usa a caixa de
   impressão do navegador (Salvar como PDF). Sem assinatura e sem a
   palavra "ordem de serviço", por decisão dela.
   ===================================================================== */
/* Quantas fotos cabem por servico na folha impressa.
   Ela reprovou em 25/08 uma folha de 18 paginas: "nao tem como eu entregar isso".
   Um item tem 4 fotos; sem teto, uma linha come meia pagina e a folha incha
   de novo. Tres e o que cabe na largura da coluna sem quebrar. */
const MAX_FOTOS_FOLHA = 3;

/* A tira de fotos que sai embaixo do servico na folha impressa (pedido dela em
   25/08: "eu PRECISO das imagens"). Fora da folha nada muda: quem nao tem foto
   sai exatamente como saia antes. */
function m28FotosFolha(d){
  const fotos=(d.fotos||[]).filter(f=>typeof f==="string"&&f.startsWith("data:"));
  if(!fotos.length)return "";
  const mostra=fotos.slice(0,MAX_FOTOS_FOLHA);
  const sobra=fotos.length-mostra.length;
  return '<i class="fts">'
    +mostra.map(f=>`<img src="${f}" alt="">`).join("")
    +(sobra?`<i>+${sobra} no site</i>`:"")
    +'</i>';
}

function m28Imprimir(){
  let rows=m28Itens();
  if(M28F.exec)rows=rows.filter(d=>(d.executor||"").trim()===M28F.exec);   /* a folha é de uma pessoa só */
  if(M28F.ver==="fazer")rows=rows.filter(d=>!d.feito);
  if(M28F.ver==="feitos")rows=rows.filter(d=>d.feito);
  if(M28F.piso)rows=rows.filter(d=>d.piso===M28F.piso);
  if(M28F.area)rows=rows.filter(d=>d.area===M28F.area);
  if(!rows.length){alert("Nenhum serviço para imprimir com os filtros atuais.");return;}
  rows.sort(m28Comparar);

  const c=m28Cab(rows);
  const loja=(empresa(currentStore)||{}).name||currentStoreName||currentStore||"";
  /* LAY-3: com a folha filtrada por pessoa, quem manda no cabeçalho é ELA —
     imprimir a folha do Matheus com o nome do Sr. João no topo seria pior que
     não ter folha. Sem filtro, vale o que ela gravou no cabeçalho, como antes. */
  const exec=M28F.exec||c.executor||(rows.find(d=>d.executor)||{}).executor||"";
  const feitos=rows.filter(d=>d.feito).length;
  const urgentes=rows.filter(d=>d.urg&&!d.feito).length;
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
    /* LEG-1 (25/08): A NORMA NAO SAI MAIS NA FOLHA DE QUEM EXECUTA.
       Palavras dela: "isso aqui e pra o Sr. Joao, ele nao vai ficar lendo
       legislacao; legislacao quem tem que ler e gerencia e dono". A orientacao
       continua guardada no banco e continua saindo no relatorio da gerencia e
       na tela — some so daqui, da folha de marcar. */
    const ori="";
    blocos+=`<div class="bl li${d.urg?" urgl":""}"><span class="c"><i class="bx">${d.feito?"✓":""}</i></span>`
      +`<span class="f linhas">${d.urg?'<i class="ug">URGENTE</i> ':""}${esc(m28SemTravessao(d.fazer||""))}`
      +(ori?`<i class="ori-p">${esc(ori)}</i>`:"")
      +m28FotosFolha(d)+`</span><span class="q">${desde}</span>`
      +`<span class="o linhas">${esc(m28SemTravessao(d.obs||""))}</span></div>`;
  }
  /* SJ-1c: o bloco de causa fecha a folha — a gerência lê no fim e entende que
     não são 22 problemas, é 1. Só existe se ela escreveu. */
  const causaT=(m28T().causaTitulo||"").trim(),causaX=(m28T().causaTexto||"").trim();
  if(causaT||causaX)blocos+=`<div class="bl causa"><b>${esc(causaT||"Por que isto se repete")}</b>`
    +`<span>${esc(causaX)}</span></div>`;
  /* LAY-6 (26/08): a faixa em tres. Ela escolheu a opcao 4 vendo as cinco em
     papel. Os tres pedacos vao SEPARADOS e cada um com o nome do que e', para
     ninguem confundir o piso com o mes -- e porque ele recebe mais de uma folha
     no mesmo dia. Cada pedaco so aparece se existir: loja sem piso nao deixa
     buraco na faixa. */
  const faixa=[[m28T().rotLoja,(currentStore||"").trim()],
               [m28T().rotPiso,m28PisoBonito((M28F.piso||"").trim())],
               [m28T().rotMes,m28Mes(c)]]
    .filter(x=>x[1])
    .map(x=>`<div><span>${esc(x[0])}</span><b>${esc(x[1])}</b></div>`).join("");
  const cabecalho=`<div class="capa">
      <div class="et">${esc(m28T().etiqueta)}</div>
      <div class="assunto">${esc(m28Assunto())}</div>
      ${faixa?`<div class="faixa">${faixa}</div>`:""}
      ${/* a linha fina: quem executa, quem assina, a unidade e a data. Continua
           dentro do verde, so que pequena -- ela pediu para destacar as quatro de
           cima "fora as outras coisas". */""}
      <div class="pe">
        <div><span>${esc(m28T().rotUnidade)}</span><b>${esc(loja)}</b></div>
        ${/* DEFEITO CORRIGIDO (29/07): aqui estava brDate(today()) — a data que
             ela trocava pelo lápis aparecia certa na tela e voltava para a data
             de hoje na folha impressa. Agora a folha respeita o que ela editou. */""}
        <div><span>${esc(m28T().rotEmitido)}</span><b>${brDate(c.emitidoEm||today())}</b></div>
        ${exec?`<div><span>${esc(m28T().rotExec)}</span><b>${esc(exec)}</b></div>`:""}
        <div><span>${esc(m28T().rotRt)}</span><b>${esc(m28RtNome(c))}</b><i>${esc(m28RtLinha(c))}</i></div>
      </div>
    </div>
    ${/* LAY-5 (25/08): na FOLHA IMPRESSA ficam so dois numeros, nesta ordem.
         Ela viu a redundancia: "demandas, ja nao seria a fazer?" — com nada
         feito os dois dao o mesmo numero, e total = a fazer + feitos. Quem conta
         os feitos e ela, no site, depois que ele devolve a folha marcada.
         Na TELA continuam os quatro. */""}
    <div class="nums">
      <div class="num"><span>Demandas gerais</span><b>${rows.length}</b></div>
      <div class="num${urgentes?" urgente":""}"><span>Urgentes</span><b>${urgentes}</b></div>
    </div>`;
  const titulo="Manutenção e Infraestrutura — "+loja;

  const w=window.open("");
  if(!w){alert("O navegador bloqueou a janela de impressão. Libere as janelas para este site e tente de novo.");return;}
  const ESTILO=`
  @page{size:A4;margin:0}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    color:#344054;font-size:12.4px;line-height:1.5;background:#e9ebee}
  .folha{width:210mm;height:297mm;background:#fff;margin:0 auto 14px;padding:11mm 12mm 15mm;
    position:relative;box-shadow:0 4px 18px rgba(16,24,40,.14);overflow:hidden}
  .topo{font-size:8.6px;color:#667085;border-bottom:1px solid #eaecf0;padding-bottom:5px;margin-bottom:9px}
  /* LAY-6 (26/08): o bloco verde continua -- o que mudou foi o tamanho de cada
     coisa dentro dele. Em cima o assunto e a faixa com loja, piso e mes; embaixo,
     em letra fina, quem executa, quem assina, a unidade e a data. */
  .capa{background:linear-gradient(150deg,#0f5b52 0%,#17756a 55%,#2a9d8a 100%);color:#fff;
    padding:12px 16px;border-radius:8px;margin-bottom:11px;
    -webkit-print-color-adjust:exact;print-color-adjust:exact}
  .et{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,.72)}
  .capa .assunto{font-size:21px;font-weight:700;letter-spacing:-.4px;line-height:1.1;margin-top:3px}
  /* a faixa em tres partes iguais. Cada pedaco leva o NOME do que e' (Loja, Piso,
     Mes) porque no papel a posicao sozinha nao diz -- e ele recebe mais de uma
     folha no mesmo dia. */
  .capa .faixa{display:flex;margin-top:10px;border:1px solid rgba(255,255,255,.3);
    border-radius:6px;overflow:hidden}
  .capa .faixa div{flex:1;padding:6px 11px;border-right:1px solid rgba(255,255,255,.24);text-align:center}
  .capa .faixa div:last-child{border-right:0}
  .capa .faixa span{display:block;font-size:7px;text-transform:uppercase;letter-spacing:1px;
    color:rgba(255,255,255,.66)}
  .capa .faixa b{font-size:14px;font-weight:700;letter-spacing:.2px}
  /* a linha fina de baixo, ainda dentro do verde */
  .capa .pe{display:flex;gap:18px;flex-wrap:wrap;align-items:baseline;
    margin-top:9px;padding-top:7px;border-top:1px solid rgba(255,255,255,.26);font-size:9.6px}
  .capa .pe div{display:flex;align-items:baseline;gap:5px}
  .capa .pe span{font-size:7.6px;text-transform:uppercase;letter-spacing:.9px;color:rgba(255,255,255,.62)}
  .capa .pe b{font-weight:600;font-size:10.2px}
  .capa .pe i{font-style:normal;font-size:8.6px;color:rgba(255,255,255,.72)}
  .nums{display:flex;gap:7px;margin-bottom:10px}
  .num{flex:1;border:1px solid #eaecf0;border-radius:7px;padding:6px 9px;background:#f9fafb;text-align:center}
  .num span{display:block;font-size:7.8px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;color:#667085}
  .num b{font-size:16px;color:#101828;font-variant-numeric:tabular-nums}
  h2{font-size:11.5px;font-weight:700;color:#0f5b52;text-transform:uppercase;letter-spacing:.6px;
    border-bottom:2px solid #1d6b57;padding-bottom:4px;margin:7px 0 2px}
  .ar{display:flex;justify-content:space-between;align-items:baseline;background:#e8f5f0;
    border-left:3px solid #1d6b57;padding:5px 9px;margin-top:14px;font-size:12px;font-weight:700;
    color:#155244;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .ar b{font-weight:600;color:#667085;font-size:9px}
  .cab,.li{display:grid;grid-template-columns:46px 1fr 66px 18%;gap:8px;padding:4px 8px}
  .cab{font-size:9.3px;text-transform:uppercase;letter-spacing:.5px;color:#667085;font-weight:700;text-align:center;
    border-bottom:1px solid #eaecf0}
  .cab .c,.li .c{text-align:center}
  .li{border-bottom:1px solid #f2f4f7;align-items:start;font-size:12.4px}
  .li .o{color:#667085;font-size:11.4px}
  /* o enter que ela deu vira quebra de linha de verdade, aqui e na tela */
  .li .linhas{white-space:pre-wrap}
  .num.urgente{background:#fef3f2;border-color:#fecdca}
  .num.urgente span{color:#b42318}
  .num.urgente b{color:#912018}
  /* a foto vai DENTRO da coluna do servico: nunca se separa dele na quebra */
  .li .fts{display:flex;gap:4px;margin-top:5px;flex-wrap:wrap}
  .li .fts img{width:32mm;height:24mm;object-fit:cover;
    border:1px solid #eaecf0;border-radius:3px;
    -webkit-print-color-adjust:exact;print-color-adjust:exact}
  .li .fts i{font-style:normal;font-size:9px;color:#667085;align-self:flex-end}
  .li .q{font-size:10.8px;color:#667085}
  .li .q b{display:block;color:#344054;font-weight:600;font-variant-numeric:tabular-nums}
  .li .q i{font-style:normal;display:block;font-size:8.8px}
  .li .q i.grave{color:#b42318;font-weight:600}
  .ug{font-style:normal;font-weight:700;color:#b42318;letter-spacing:.4px}
  /* orientação técnica com a base legal — a categoria vai ESCRITA entre
     colchetes, porque no papel a cor do selo não existe */
  .li .ori-p{font-style:normal;display:block;font-size:9.4px;color:#5c5d68;
    line-height:1.45;margin-top:2px}
  /* o bloco de causa que fecha a folha (só quando ela escreve) */
  .causa{display:block;margin-top:12px;padding:9px 11px;background:#f9fafb;
    border-left:3px solid #1d6b57;border-radius:0 6px 6px 0}
  .causa b{display:block;font-size:8.4px;font-weight:700;text-transform:uppercase;
    letter-spacing:.6px;color:#4a6b62;margin-bottom:3px}
  .causa span{display:block;font-size:9.6px;line-height:1.5;color:#344054}
  .li.urgl .f{color:#1f2937}
  .cab .f{text-align:left}
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
  await (typeof folhasCfgSet==="function"?folhasCfgSet:metaSetU)("mnt28Cabecalho",M28_CAB);
  dataChanged();renderMnt28();toast("Responsável atualizado ✓");
}
/* mostrar/esconder pedaços da tela (painel de números, selos de origem) */
async function m28Alternar(chave){
  await m28Config();
  M28_VIS=Object.assign({},M28_VIS,{[chave]:M28_VIS[chave]===false});
  await (typeof folhasCfgSet==="function"?folhasCfgSet:metaSetU)("mnt28Visual",M28_VIS);
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
    rotUnidade:"Rótulo: unidade",rotEmitido:"Rótulo: emitido em",
    rotLoja:"Faixa: loja",rotPiso:"Faixa: piso",rotMes:"Faixa: mês",
    rotRt:"Rótulo: responsável técnica"};
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
    ${/* SJ-1c: o bloco de causa, no fim da folha. Vazio = não aparece. */""}
    <div class="bd-grupo" style="border-top:1px solid #eceded;padding-top:12px;margin-top:4px">
      <label class="bd-rotulo" for="m28tx-causaTitulo">Bloco de causa — título</label>
      <input class="bd-campo" id="m28tx-causaTitulo" value="${esc(M28_TXT.causaTitulo||"")}"
        placeholder="Ex.: Maresia — a causa de 22 serviços desta folha">
    </div>
    <div class="bd-grupo">
      <label class="bd-rotulo" for="m28tx-causaTexto">Bloco de causa — explicação</label>
      <textarea class="bd-campo" id="m28tx-causaTexto" rows="3"
        placeholder="Ex.: ferro pintado no litoral perde para o sal…">${esc(M28_TXT.causaTexto||"")}</textarea>
      <span class="bd-ajuda">Aparece <b>uma vez só</b>, no fim da folha, na tela e impressa.
        Deixe vazio e ele não existe. Use quando <b>muitos serviços</b> têm a mesma origem.</span>
    </div>
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
  await (typeof folhasCfgSet==="function"?folhasCfgSet:metaSetU)("mnt28Textos",novo);
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

/* =====================================================================
   FOLHAS ANOTADAS DE 29/07 — abrir/fechar área, renomear área e a
   transferência para o relatório de Qualidade (30/07)
   ===================================================================== */
/* Folha 2: a setinha da área — fecha e abre, igual ao Notion. Só arruma a
   vista; nada é apagado. O estado vive só nesta visita à aba. */
function m28AbreFecha(k){
  M28F.fechadas[k]=!M28F.fechadas[k];
  m28RenderLista();
}
/* Folha 3: "não consigo editar os nomes de cada área" — agora consegue, daqui
   mesmo. Renomeia no CADASTRO da empresa e em TODOS os serviços da área de uma
   vez (o vínculo é pelo nome). Tudo no mesmo passo do Ctrl+Z. */
async function m28RenomearArea(piso,areaAtual){
  const novo=prompt("Novo nome para a área "+areaAtual+" ("+piso+"):\n\nVale para a folha inteira e para o cadastro da empresa.",areaAtual);
  if(novo===null)return;
  const nome=novo.trim();
  if(!nome||nome===areaAtual)return;
  /* 1) cadastro da empresa (é a lista que todas as abas leem) */
  if(typeof NC_AREAS!=="undefined"&&typeof ncSaveAreas==="function"){
    const lista=(typeof AREAS_ALL!=="undefined"&&AREAS_ALL[currentStore])||[];
    NC_AREAS[currentStore]=lista.map(a=>(a.nome===areaAtual&&(a.piso||"").trim()===(piso||"").trim())?{...a,nome}:a);
    await ncSaveAreas(currentStore);
  }
  /* 2) todos os serviços desta folha que apontam para a área */
  let n=0;
  for(const d of m28Itens()){
    if(d.area===areaAtual&&d.piso===piso){d.area=nome;d.mod=nowISO();await putItem(d);n++;}
  }
  dataChanged();renderMnt28();
  toast("Área renomeada em "+n+(n===1?" serviço":" serviços")+" ✓");
}
/* Folha 1: o botão de mandar para a QUALIDADE — o serviço sai desta folha
   (que é de obra e conserto) e vira uma Não Conformidade no relatório de
   Qualidade, com a mesma área e a urgência acompanhando. Ctrl+Z desfaz os
   dois lados, porque tudo passa por putItem. */
async function m28ParaQualidade(id){
  const d=DATA.find(x=>x.id===id);if(!d)return;
  if(!confirm("Transferir para o relatório de Qualidade?\n\n"+(d.fazer||"")+"\n\nEle SAI desta folha e vira uma Não Conformidade lá."))return;
  const nc={uid:newUid(),mod:nowISO(),tipo:"nc",loja:currentStore,
    piso:d.piso,area:d.area,nc:d.fazer||"",acao:"",
    urgencia:d.urg?"URGENTE":"OBSERVACAO",revisar:!d.urg,
    rt:RT_INFO||RT_DEFAULT,executor:"",fotos:Array.isArray(d.fotos)?d.fotos.slice():[],
    relato:d.dataRegistro||today(),atualizacao:today(),status:"Pendente",
    criado:"transferido da folha MNT"};
  const nid=await putItem(nc);nc.id=nid;DATA.push(nc);
  d.deleted=true;d.mod=nowISO();await putItem(d);
  dataChanged();m28AtualizarTopo();m28RenderLista();
  toast("Transferido para a Qualidade ✓ (Ctrl+Z desfaz)");
}
