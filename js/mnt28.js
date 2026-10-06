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
/* a FOLHA ENTREGUE (28/08) é outro tipo de item: nasce quando ela manda
   imprimir a via de trabalho e guarda o que foi ao papel naquele dia. */
STATUS_FNS.m28f={isPend:d=>d.status==="andamento",isDone:d=>d.status==="concluida"};
TABS.mnt28.renderCards=function(){const c=document.getElementById("cards");if(c)c.innerHTML="";};

/* AS QUATRO DIVISÕES DA ABA (28/08) — o mesmo desenho dos Checklists, pedido
   dela vendo a tela de lá. Fica no aparelho, como o CK_SEC: é escolha do
   momento, não configuração do trabalho. */
let M28_SEC=localStorage.getItem("m28_sec")||"demandas";
/* 30/08: "Em andamento" e "Concluídas" saíram da barra; "ver" só vive em tela.
   Estado salvo de uma versão antiga não pode deixar a aba presa num modo morto. */
if(["andamento","concluidas","ver"].includes(M28_SEC))M28_SEC="demandas";
function m28SetSec(s){
  M28_SEC=s;localStorage.setItem("m28_sec",s);
  renderMnt28();
  if(typeof renderRailTabs==="function")renderRailTabs();
  if(typeof syncNav==="function")syncNav();
}

/* filtros da tela (só vivem enquanto ela está na aba) */
/* exec (03/08, LAY-3): "Folha de: Sr. João · Matheus · Todos". A elétrica é do
   Matheus e nunca entra na folha de quem faz obra — mas as duas moram na mesma
   aba, com o mesmo desenho. Trocar o nome aqui troca a folha inteira, inclusive
   a impressa. */
let M28F={q:"",piso:"",area:"",ver:"todos",exec:"",fechadas:{}};

/* quem tem serviço nesta folha — sai dos próprios itens, não de uma lista fixa,
   para o seletor nunca oferecer um nome sem nenhum serviço atrás */
/* QUEM FAZ (24/09, pedido dela: "o botão de cada demanda tem que ter
   todos"). Antes a lista vinha SO do cadastro da aba antiga; quem nao estava
   cadastrado la (ex.: Matheus) nao aparecia, mesmo tendo servico. Agora junta
   o cadastro + todo mundo que ja tem servico em qualquer loja, sem repetir,
   e ainda deixa escrever um nome novo. */
function m28PessoasOpcoes(sel){
  const nomes=[];
  const add=n=>{n=(n||"").trim();if(n&&n!=="Outro"&&!nomes.some(x=>x.toLowerCase()===n.toLowerCase()))nomes.push(n);};
  (typeof EXECUTORES!=="undefined"?EXECUTORES:[]).forEach(e=>add(e.nome));
  DATA.filter(d=>!d.deleted&&d.tipo==="mnt28").map(d=>d.executor).sort().forEach(add);
  add(sel);
  return `<option value=""${sel?"":" selected"}>Ninguém definido</option>`+
    nomes.map(n=>`<option value="${esc(n)}"${n===sel?" selected":""}>${esc(n)}</option>`).join("")+
    `<option value="__nova">Outra pessoa (escrever o nome)…</option>`;
}
function m28TrocouPessoa(sel){
  if(sel.value!=="__nova"){sel.dataset.antes=sel.value;return;}
  const n=(prompt("Nome da pessoa que vai fazer este serviço:")||"").trim();
  if(!n){sel.value=sel.dataset.antes||"";return;}
  let o=[...sel.options].find(x=>x.value.toLowerCase()===n.toLowerCase());
  if(!o){o=document.createElement("option");o.value=n;o.textContent=n;sel.insertBefore(o,sel.lastElementChild);}
  sel.value=o.value;sel.dataset.antes=o.value;
}
function m28Executores(itens){
  return [...new Set((itens||m28Itens()).map(d=>(d.executor||"").trim()).filter(Boolean))].sort();
}
/* "a folha aberta agora": todos os serviços, ou só os da pessoa escolhida.
   É o que os números do topo e o botão do VERIFICAR precisam enxergar — sem
   isto, a folha do Matheus mostraria o contador do Sr. João. */
/* O QUE ESTA NESTA FOLHA — fonte unica (26/08).
   Ate hoje isto filtrava SO por pessoa. A lista da tela filtrava tambem por piso
   e area, e a folha impressa idem; so os numeros do topo ficavam contando a loja
   inteira. Escolhido o 1o piso, a tela dizia 35 e o papel trazia 17.
   Ela viu usando: "quando eu coloco pra imprimir so o primeiro piso, com ou sem
   o que foi feito, o numero nao bate."
   Numero que nao bate com a lista logo abaixo dele e' pior que numero nenhum --
   ela assina esse papel com o CRN. Agora e' um lugar so, e todos leem daqui.

   O filtro de SITUACAO (a fazer / feitos) NAO entra aqui de proposito: os
   numeros do topo mostram justamente "total, a fazer e feitos", e filtrar por
   situacao faria cada um deles contar de uma base diferente. */
function m28ItensDaFolha(){
  let t=m28Itens();
  if(M28F.exec)t=t.filter(d=>(d.executor||"").trim()===M28F.exec);
  if(M28F.piso)t=t.filter(d=>d.piso===M28F.piso);
  if(M28F.area)t=t.filter(d=>m28NormArea(d.area)===m28NormArea(M28F.area));
  return t;
}
/* O QUE OS NÚMEROS CONTAM (28/08) — o mesmo que vai no papel.
   O item posto em "Verificar" continua na lista da tela, mas fora dos números:
   ele não existe na folha do Sr. João, e um total da tela que não bate com o
   papel é pior que total nenhum. Quantos estão em verificação aparece na
   pastilha de cada área, em "N a verificar". */
function m28ItensContados(){ return m28ItensDaFolha().filter(d=>!d.verificar); }
/* "a verificar" no papel = lupa ligada OU qualquer coisa escrita no lembrete
   particular (01/10, pedido dela: "só de ter algo ali dentro já deve ser
   considerado"). Na janela de imprimir ela escolhe levar ou não. */
function m28AVerificar(d){ return !!d.verificar||!!String(d.nota||"").trim(); }
/* o que ela ainda precisa conferir na loja — a loja TODA, sem depender do
   filtro de tela nem de mês aberto. Era m28ItensDaFolha() e por isso a aba
   "Verificar" aparecia zerada. */
function m28ParaVerificar(){ return m28ItensCru().filter(d=>d.verificar); }

/* =====================================================================
   AS FOLHAS ENTREGUES (28/08) — o histórico que faltava
   ---------------------------------------------------------------------
   Palavras dela: "eu quero ver o que foi concluído dos meses anteriores,
   quero que isso fique como um histórico".
   Hoje, quando ela gera a folha de agosto, a de julho deixa de existir no
   site: sobra o PDF na nuvem e mais nada. A gerência pergunta "o que foi
   feito no mês passado?" e a resposta não está na ferramenta.

   Cada folha guarda os UIDS dos serviços que foram ao papel naquele dia,
   nunca as posições: ela renomeia área e edita texto o tempo todo, e o
   histórico tem de continuar apontando para o mesmo serviço.
   ===================================================================== */
function m28Folhas(status){
  let t=DATA.filter(d=>!d.deleted&&d.tipo==="m28f"&&d.loja===currentStore);
  if(status)t=t.filter(d=>d.status===status);
  return t.sort((a,b)=>String(b.emitidoEm||b.criadoEm||"").localeCompare(String(a.emitidoEm||a.criadoEm||"")));
}
/* os serviços daquela folha, na ordem da folha. O que ela apagou depois vira
   um lugar vazio: o total não pode encolher sozinho meses depois. */
function m28ItensDaEntrega(f){
  /* FOLHA CONGELADA (29/08): ao concluir o mês, a folha vira uma foto fixa
     daquele dia (f.snap) e não muda mais, aconteça o que acontecer depois.
     Pedido dela: "só o relatório do mês atual é atualizado". Folhas antigas
     concluídas antes desta versão não têm snap: caem no modo antigo (vivo). */
  if(f&&f.status==="concluida"&&Array.isArray(f.snap))return f.snap;
  const por={};for(const d of m28ItensCru())por[d.uid]=d;
  return (f.itens||[]).map(u=>por[u]||null);
}
/* quantos daquela folha já estão feitos HOJE. Enquanto a folha está aberta o
   número é vivo; ao concluir, ele é congelado em feitosNoFim. */
function m28AndamentoFolha(f){
  if(f.status==="concluida")return {feitas:f.feitosNoFim||0,total:f.totalNoFim||(f.itens||[]).length};
  const itens=m28ItensDaEntrega(f);
  return {feitas:itens.filter(d=>d&&d.feito).length,total:(f.itens||[]).length};
}
function m28NomeFolha(f){
  const mes=m28Mes({emitidoEm:f.emitidoEm||f.criadoEm||""});
  return [m28PisoBonito(f.piso||""),mes].filter(Boolean).join(", ")||"Folha";
}
function m28AcharFolha(uid){ return DATA.find(d=>d.uid===uid&&d.tipo==="m28f"); }

/* RETOMAR — o mesmo gesto do checklist: volta para a lista de trabalho já com
   os filtros daquela folha, para ela continuar marcando o que foi feito. */
function m28Retomar(uid){
  const f=m28AcharFolha(uid);if(!f)return;
  M28F.piso=f.piso||"";M28F.exec=f.executor||"";M28F.area="";M28F.ver="todos";
  M28F.q="";M28F.fechadas={};
  M28_FOLHA_ABERTA=uid;
  m28SetSec("demandas");
  toast("Mostrando a folha de "+m28NomeFolha(f));
}
/* VER — a folha do jeito que foi entregue, em leitura. */
function m28VerFolha(uid){
  const f=m28AcharFolha(uid);if(!f)return;
  M28_FOLHA_VER=uid;m28SetSec("ver");
}
async function m28ConcluirFolha(uid){
  const f=m28AcharFolha(uid);if(!f)return;
  const a=m28AndamentoFolha(f);
  const nome=f.titulo||m28NomeFolha(f);
  if(!confirm("Concluir "+nome+"?\n\n"
    +"O mês vira histórico, com o resultado de agora: "
    +a.feitas+" de "+a.total+" feitos.\nDá para reabrir depois."))return;
  /* congela: foto fixa dos serviços como estão AGORA. Depois disto,
     mudança em demanda ou na lista de compras não mexe mais neste mês. */
  await m28CongelarFolha(f);
  M28_FOLHA_VER=null;M28_FOLHA_ABERTA=null;
  m28VoltarMeses();
}
async function m28ReabrirFolha(uid){
  const f=m28AcharFolha(uid);if(!f)return;
  f.status="andamento";f.concluidaEm=null;
  delete f.feitosNoFim;delete f.totalNoFim;
  delete f.snap;   /* reabriu para trabalhar: volta a ser folha viva */
  f.mod=nowISO();
  await putItem(f);dataChanged();
  M28_FOLHA_VER=null;
  if(f.competencia){m28AbrirMes(uid);}   /* mês do formato novo: volta para dentro dele */
  else{M28_MES_ANTIGO=null;m28VoltarMeses();}
  toast("Reaberto");
}
async function m28ExcluirFolha(uid){
  const f=m28AcharFolha(uid);if(!f)return;
  if(!confirm("Excluir o registro da folha de "+m28NomeFolha(f)+"?\n\n"
    +"Os serviços NÃO são apagados: some só o registro desta entrega."))return;
  f.deleted=true;f.mod=nowISO();
  await putItem(f);dataChanged();
  if(M28_FOLHA_VER===uid)M28_FOLHA_VER=null;
  if(M28_FOLHA_ABERTA===uid)M28_FOLHA_ABERTA=null;
  renderMnt28();toast("Registro excluído");
}
/* qual folha está sendo vista ou retomada; só memória de tela */
let M28_FOLHA_VER=null,M28_FOLHA_ABERTA=null;

/* ---- itens desta aba, da empresa aberta ---- */
/* CRU = a loja inteira, sem recorte de mês. É a base de: pilha de meses,
   nascimento do mês novo, e a aba "Verificar". */
function m28ItensCru(){
  return DATA.filter(d=>!d.deleted&&d.tipo==="mnt28"&&d.loja===currentStore);
}
/* m28Itens = o recorte do mês aberto. Fora de um mês (a pilha), é a loja
   inteira. Dentro de um mês do formato novo em andamento, são só os itens
   daquele mês — assim capa, números, seletores e lista falam do mês. */
function m28Itens(){
  const base=m28ItensCru();
  if(typeof M28_FOLHA_ABERTA==="undefined"||!M28_FOLHA_ABERTA)return base;
  const f=m28AcharFolha(M28_FOLHA_ABERTA);
  if(!f||!f.competencia||f.status!=="andamento")return base;
  const ids=new Set(f.itens||[]);
  return base.filter(d=>ids.has(d.uid));
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
  /* IDENTIDADE C (27/08): ela vai ter relatorio de manutencao, de qualidade e
     de eletrica, e quer bater o olho e saber qual e' qual sem ler tudo -- e sem
     repetir a mesma ideia duas vezes, que era o problema do "Relatorio de
     manutencao" em cima de "Manutencao e Infraestrutura". Agora e' uma frase
     so: o TIPO em destaque, o resto do nome depois. Os dois continuam
     editaveis pelo lapis -- nada fixo no codigo. */
  tipoRelatorio:"Manutenção",
  etiqueta:"Relatório de manutenção",
  tituloPrefixo:"Manutenção e Infraestrutura —",
  rotExec:"Responsável pelos serviços",
  colFeito:"Feito?",colFazer:"Demanda",
  /* "Observacoes" era vago demais, palavra dela em 25/08. Virou "Lembretes".
     CUIDADO: o campo so-dela continua sendo "Letícia revisar urgente", com cadeado. */
  colData:"Data Registrada",colObs:"Lembretes",
  /* na FOLHA o recado virou pastilha embaixo da demanda, e o rotulo virou o
     prefixo dela. Ela escreveu "Obs:" a mao no papel, entao e' "Obs:". Na TELA
     continua "Lembretes", que e' o nome da coluna la. */
  colObsImp:"Obs:",
  rotUnidade:"Unidade",rotEmitido:"Emitido em",
  /* LAY-6 (26/08): os tres da faixa e o de quem assina. Como todo rotulo daqui,
     ela troca pelo painel de textos -- nada e' fixo no codigo. */
  rotLoja:"Loja",rotPiso:"Piso",rotMes:"Mês",rotRt:"Resp. técnica",
  /* SJ-1c (03/08, decisão dela): o bloco de causa só existe quando MUITOS
     serviços têm a mesma origem — a maresia é o caso. Vazio = não aparece.
     O texto é dela; eu não crio bloco por conta própria. */
  causaTitulo:"",causaTexto:"",
  /* RASTREAMENTO DE RALOS (28/09, pedido dela): todo servico de ralo sai das
     areas e vira UMA lista no fim da folha. A explicacao vai uma vez so, em
     cima; embaixo, so o piso e a area de cada ralo, com a caixinha. */
  ralosTitulo:"Rastreamento de Conferência de Ralos",
  ralosTexto:"Em cada área abaixo, conferir TODOS os ralos:\n• o ralo é sifonado?\n• a grelha tem dispositivo de fechamento funcionando?\n\nPrender o ralo que estiver solto.\nTrocar a grelha (ou o ralo) que estiver quebrada, amassada, sem fechamento ou que não for sifonada.\n\nTela improvisada não serve: no lugar dela, usar cesto coletor removível embaixo da grelha."};
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

/* =====================================================================
   BLOCOS DE MÊS (30/08) — a aba vira uma pilha de meses
   ---------------------------------------------------------------------
   Pedido dela: clicar em "Manutenções" e ver um bloco por mês
   (Julho, Agosto, Setembro…), em ordem crescente. Clicar num bloco
   abre o relatório daquele mês; os filtros de piso e pessoa moram
   dentro do mês. O mês novo nasce sozinho quando a data vira e leva
   só o que ainda falta fazer. Julho e Agosto NÃO são tocados: o bloco
   deles é derivado da data das folhas antigas e abre em leitura.
   ===================================================================== */
function m28CompDe(iso){const p=String(iso||"").split("-");return (p[0]&&p[1])?p[0]+"-"+p[1]:"";}
function m28CompHoje(){const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");}
function m28TituloComp(comp){
  const p=String(comp||"").split("-");
  const mes=M28_MESES[Number(p[1])-1]||"";
  return mes?(mes.charAt(0).toUpperCase()+mes.slice(1)+"/"+(p[0]||"")):comp;
}

/* a lista de meses: (a) folhas do formato novo (têm competencia) e
   (b) as folhas antigas de Jul/Ago, agrupadas pela competência que se
   deriva da data delas. Ordem crescente por competência. */
function m28MesesLista(){
  const todas=m28Folhas();
  const mapa={};
  todas.filter(f=>f.competencia).forEach(f=>{
    mapa[f.competencia]={comp:f.competencia,titulo:f.titulo||m28TituloComp(f.competencia),
      uid:f.uid,status:f.status,antiga:false,folhas:[f]};
  });
  todas.filter(f=>!f.competencia).forEach(f=>{
    const comp=m28CompDe(f.emitidoEm||f.criadoEm||"");if(!comp)return;
    if(mapa[comp]&&!mapa[comp].antiga){mapa[comp].folhas.push(f);return;}
    if(!mapa[comp])mapa[comp]={comp,titulo:m28TituloComp(comp),uid:null,
      status:"antiga",antiga:true,folhas:[]};
    mapa[comp].folhas.push(f);
  });
  /* (c) meses SEM folha nenhuma, tirados da data das próprias demandas.
     É o caso de quem começou antes de existir bloco de mês (julho): as
     demandas existem, folha entregue não. Só valem meses já passados —
     o mês corrente é sempre a folha viva. Bloco só de leitura. */
  const hoje=m28CompHoje();
  m28ItensCru().forEach(d=>{
    const comp=m28CompDe(d.dataRegistro||d.relato||d.criadoEm||"");
    if(!comp||comp>=hoje||mapa[comp])return;
    mapa[comp]={comp,titulo:m28TituloComp(comp),uid:null,
      status:"antiga",antiga:true,derivado:true,folhas:[]};
  });
  const lista=Object.values(mapa).sort((a,b)=>a.comp.localeCompare(b.comp));
  lista.forEach(m=>{
    if(m.derivado){
      const its=m28ItensCru().filter(d=>
        m28CompDe(d.dataRegistro||d.relato||d.criadoEm||"")===m.comp);
      m.feitas=its.filter(d=>d.feito).length;m.total=its.length;
    }else{
      let fe=0,to=0;m.folhas.forEach(f=>{const a=m28AndamentoFolha(f);fe+=a.feitas;to+=a.total;});
      m.feitas=fe;m.total=to;
    }
    m.ano=(m.comp.split("-")[0]||"");
  });
  return lista;
}

/* CONGELAR — a foto fixa do mês, extraída de m28ConcluirFolha para o
   nascimento automático do mês seguinte também poder usar. */
async function m28CongelarFolha(f){
  if(!f||f.status==="concluida")return;
  const a=m28AndamentoFolha(f);
  f.status="concluida";f.concluidaEm=today();
  f.feitosNoFim=a.feitas;f.totalNoFim=a.total;
  f.snap=m28ItensDaEntrega(f).map(d=>d?{
    uid:d.uid,fazer:d.fazer||"",area:d.area||"",piso:d.piso||"",
    obs:d.obs||"",feito:!!d.feito,urg:!!d.urg,
    dataRegistro:d.dataRegistro||"",relato:d.relato||"",
    naCompras:m28TemCompra(d)
  }:null);
  f.mod=nowISO();
  await putItem(f);dataChanged();
}
async function m28CriarMes(comp,uids){
  const itens=Array.isArray(uids)?[...new Set(uids)]:[];
  const o={uid:newUid(),mod:nowISO(),tipo:"m28f",loja:currentStore,status:"andamento",
    competencia:comp,titulo:m28TituloComp(comp),piso:"",executor:"",
    emitidoEm:comp+"-01",criadoEm:today(),concluidaEm:null,corte:"",
    itens,total:itens.length,feitosNaEntrega:0,urgentes:0,criado:"mes-automatico"};
  o.id=await putItem(o);DATA.push(o);dataChanged();
  return o;
}
/* roda dentro do renderMnt28: garante que o mês corrente existe.
   Sem relógio nem setInterval — acontece quando ela abre a aba. */
let M28_MES_CHECADO=false;
async function m28GarantirMesCorrente(){
  if(M28_MES_CHECADO)return;
  M28_MES_CHECADO=true;
  const hoje=m28CompHoje();
  const novas=m28Folhas().filter(f=>f.competencia);
  if(novas.find(f=>f.competencia===hoje))return;
  const cru=m28ItensCru();
  const anteriores=novas.filter(f=>f.competencia<hoje)
    .sort((a,b)=>a.competencia.localeCompare(b.competencia));
  const ultima=anteriores[anteriores.length-1];
  let base;
  if(ultima){
    if(ultima.status==="andamento")await m28CongelarFolha(ultima);
    const daUltima=(ultima.itens||[]).filter(u=>{const d=cru.find(x=>x.uid===u);return d&&!d.feito;});
    const jaEmMes=new Set();novas.forEach(f=>(f.itens||[]).forEach(u=>jaEmMes.add(u)));
    const soltos=cru.filter(d=>!d.feito&&!jaEmMes.has(d.uid)).map(d=>d.uid);
    base=[...daUltima,...soltos];
  }else{
    /* primeiríssima vez (setembro/2026): todas as demandas vivas em aberto */
    base=cru.filter(d=>!d.feito).map(d=>d.uid);
  }
  await m28CriarMes(hoje,base);
}

/* qual mês está aberto na tela; só memória de tela */
let M28_MES_ANTIGO=null;
/* preferências da pilha (ordem/ano/busca) — escolha do momento, fica no aparelho */
let M28_PILHA={ordem:"cresc",ano:"",q:""};
try{const g=JSON.parse(localStorage.getItem("m28_pilha")||"{}");
  M28_PILHA=Object.assign(M28_PILHA,g);}catch(e){}
function m28PilhaSet(k,v){
  M28_PILHA[k]=v;
  try{localStorage.setItem("m28_pilha",JSON.stringify(M28_PILHA));}catch(e){}
  renderMnt28();
}

function m28AbrirMes(uid){
  const f=m28AcharFolha(uid);if(!f)return;
  M28F={q:"",piso:"",area:"",ver:"todos",exec:"",fechadas:{}};
  M28_MES_ANTIGO=null;
  if(f.status==="concluida"){M28_FOLHA_ABERTA=null;M28_FOLHA_VER=uid;m28SetSec("ver");return;}
  M28_FOLHA_VER=null;M28_FOLHA_ABERTA=uid;m28SetSec("demandas");
}
function m28VerMesAntigo(comp){
  const m=m28MesesLista().find(x=>x.comp===comp);if(!m)return;
  if(m.derivado){M28_MES_ANTIGO=comp;renderMnt28();return;}
  if(!m.folhas.length)return;
  if(m.folhas.length===1){m28VerFolha(m.folhas[0].uid);return;}
  M28_MES_ANTIGO=comp;renderMnt28();
}
/* nome mostrado: a pasta da Dayse agora se chama Compras (os dados guardam o nome antigo) */
function m28NomeExec(e){return /^dayse$/i.test(String(e||"").trim())?"Compras":e;}
function m28NormArea(s){return String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/\s+/g," ").trim().toLowerCase();}
function m28VoltarMeses(){
  M28_FOLHA_ABERTA=null;M28_FOLHA_VER=null;M28_MES_ANTIGO=null;
  M28F={q:"",piso:"",area:"",ver:"todos",exec:"",fechadas:{}};
  m28SetSec("demandas");
}
function m28VoltarDoVer(){
  M28_FOLHA_VER=null;
  if(M28_MES_ANTIGO){renderMnt28();return;}
  m28VoltarMeses();
}

/* A PILHA DE MESES — peça bd-linha-mes da biblioteca, sem emoji.
   Barra fina em cima: busca longa (uso futuro) e, à direita, o seletor
   de ordem e, quando há mais de um ano, o seletor de ano. */
function m28PilhaMesesHTML(){
  let lista=m28MesesLista();
  const hoje=m28CompHoje();
  const anos=[...new Set(lista.map(m=>m.ano))].sort();
  const q=(M28_PILHA.q||"").trim().toLowerCase();
  if(q)lista=lista.filter(m=>m.titulo.toLowerCase().includes(q)||m.comp.includes(q));
  if(M28_PILHA.ano)lista=lista.filter(m=>m.ano===M28_PILHA.ano);
  if(M28_PILHA.ordem==="decr")lista=lista.slice().reverse();
  else if(M28_PILHA.ordem==="abc")lista=lista.slice().sort((a,b)=>a.titulo.localeCompare(b.titulo,"pt"));

  const opAno=anos.length>1?`<select class="m28-pilha-sel" aria-label="Ver por ano"
      onchange="m28PilhaSet('ano',this.value)">
      <option value="">Todos os anos</option>
      ${anos.map(a=>`<option value="${esc(a)}"${M28_PILHA.ano===a?" selected":""}>${esc(a)}</option>`).join("")}
    </select>`:"";
  const ordens=[["cresc","Mais antigos"],["decr","Mais recentes"],["abc","A–Z"]];
  const seg=`<div class="m28-pilha-seg" role="group" aria-label="Ordenar os meses">
      ${ordens.map(([v,txt])=>`<button type="button"${M28_PILHA.ordem===v?' class="on"':""}
        onclick="m28PilhaSet('ordem','${v}')">${txt}</button>`).join("")}
    </div>`;
  const lupa=`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
  const barra=`<div class="m28-pilha-faixa">
      <p class="m28-pilha-rot">Meses</p>
      <div class="m28-pilha-barra">
        <div class="m28-pilha-busca-cx">${lupa}
          <input type="text" aria-label="Buscar mês ou ano"
            placeholder="Buscar mês ou ano. Ex.: setembro, 2027"
            value="${esc(M28_PILHA.q||"")}" oninput="m28PilhaSet('q',this.value)">
        </div>
        ${seg}${opAno}
      </div>
    </div>`;

  if(!m28MesesLista().length)return barra+`<div class="bd-vazio">
    <div class="bd-vazio-tit">Ainda não há nenhum mês</div>
    <div class="bd-vazio-txt">Assim que você abrir esta aba num dia 1º, o mês começa sozinho.</div></div>`;
  if(!lista.length)return barra+`<div class="bd-vazio">
    <div class="bd-vazio-tit">Nenhum mês com esse filtro</div>
    <div class="bd-vazio-txt">Limpe a busca ou escolha "Todos os anos".</div></div>`;

  const linhas=lista.map(m=>{
    const atual=(m.comp===hoje)&&!m.antiga&&m.status!=="concluida";
    const abrir=m.antiga?`m28VerMesAntigo('${m.comp}')`:`m28AbrirMes('${m.uid}')`;
    return `<button type="button" class="bd-linha-mes${atual?" bd-linha-mes-atual":""}" onclick="${abrir}">
      <span class="bd-linha-mes-mk${atual?"":" bd-linha-mes-done"}" aria-hidden="true"></span>
      <span class="bd-linha-mes-nome">${esc(m.titulo)}</span>
      <span class="bd-linha-mes-selo ${atual?"bd-linha-mes-selo-atual":"bd-linha-mes-selo-fech"}">${atual?"Mês atual":"Fechado"}</span>
      <span class="bd-linha-mes-chev" aria-hidden="true">&rsaquo;</span>
    </button>`;
  }).join("");
  return barra+`<div class="m28-pilha">${linhas}</div>
    <div class="bd-aviso bd-aviso-atencao m28-pilha-nota">
      <span class="bd-aviso-ico" aria-hidden="true">i</span>
      <div>O mês novo nasce sozinho quando a data vira e leva só o que ainda falta fazer. Você só mexe no mês atual.</div>
    </div>`;
}
/* barra do topo dentro de um mês aberto: voltar + nome + concluir */
function m28BarraMesHTML(){
  const f=M28_FOLHA_ABERTA&&m28AcharFolha(M28_FOLHA_ABERTA);
  const tit=f?(f.titulo||m28TituloComp(f.competencia||m28CompDe(f.emitidoEm||f.criadoEm))):"";
  return `<div class="m28-mesbar">
    <button class="btn ghost sm" onclick="m28VoltarMeses()">← Meses</button>
    <span class="m28-mesbar-tit">${esc(tit)}</span>
    ${f?`<button class="btn sm" onclick="m28ConcluirFolha('${f.uid}')" title="Encerrar este mês e guardar o resultado">Concluir este mês</button>`:""}
  </div>`;
}
/* mês antigo (Jul/Ago) com mais de uma folha: mini lista para escolher qual ver */
function m28MesAntigoHTML(comp){
  const m=m28MesesLista().find(x=>x.comp===comp);
  const l=(m&&m.folhas)||[];
  return `<div class="m28-folha-topo">
      <div><b>${esc(m28TituloComp(comp))}</b>
        <div class="m28-escolha-sub">${l.length} folha${l.length===1?"":"s"} entregue${l.length===1?"":"s"} neste mês. Toque para ver.</div></div>
      <div><button class="btn ghost sm" onclick="m28VoltarMeses()">← Meses</button></div>
    </div>
    <div class="ck-tab-wrap"><table class="ck-tab">
    <thead><tr><th>Entregue em</th><th>Folha</th><th>Responsável</th><th>Resultado</th><th></th></tr></thead>
    <tbody>${l.map(f=>{const a=m28AndamentoFolha(f);return `<tr>
      <td>${esc(brDate(f.emitidoEm||f.criadoEm||""))}</td>
      <td>${esc(m28NomeFolha(f))}</td>
      <td>${esc(m28NomeExec(f.executor||"—"))}</td>
      <td><span class="ck-and">${a.feitas} de ${a.total} feitos</span></td>
      <td class="ck-td-ac"><button class="btn ghost sm" onclick="m28VerFolha('${f.uid}')">Ver</button></td>
    </tr>`;}).join("")}</tbody></table></div>`;
}
/* mês SEM folha entregue (ex.: julho, quando ela começou antes dos blocos):
   mostra as demandas registradas naquele mês, só leitura. */
function m28MesDerivadoHTML(comp){
  const its=m28ItensCru()
    .filter(d=>m28CompDe(d.dataRegistro||d.relato||d.criadoEm||"")===comp)
    .sort(m28Comparar);
  let html="",area=null,n=0;
  for(const d of its){
    if(d.area!==area){area=d.area;n=0;
      if(html)html+="</div>";
      html+=`<div class="m28-grupo"><div class="m28-area"><span class="m28-area-nome">${esc(area||"Sem área")}</span></div>`;}
    n++;
    html+=`<div class="m28-item${d.feito?" feito":""}">
      <span class="m28-check" role="img" aria-label="${d.feito?"feito":"não feito"}">${d.feito?"✓":""}</span>
      <span class="m28-num">${n}.</span>
      <div class="m28-fazer">${d.urg?`<span class="m28-urgselo">Urgente</span> `:""}<span class="m28-linhas">${esc(m28SemTravessao(d.fazer||""))}</span></div>
      <div class="m28-desde">${m28Desde(d)}</div><div class="m28-obs">${d.obs?m28Texto(d.obs):""}</div><div></div></div>`;
  }
  if(html)html+="</div>";
  const feitos=its.filter(d=>d.feito).length;
  return `<div class="m28-folha-topo">
      <div><b>${esc(m28TituloComp(comp))}</b>
        <div class="m28-escolha-sub">${its.length} ${its.length===1?"demanda registrada":"demandas registradas"} neste mês${feitos?" · "+feitos+" "+(feitos===1?"feita":"feitas"):""}. Só leitura.</div></div>
      <div><button class="btn ghost sm" onclick="m28VoltarMeses()">← Meses</button></div>
    </div>${html||'<div class="bd-vazio"><div class="bd-vazio-tit">Nenhuma demanda neste mês</div></div>'}`;
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
/* A FRASE DE IDENTIDADE: "TIPO · resto do nome", sem repetir a palavra.
   Se o nome comeca com a mesma palavra do tipo (o caso de hoje: "Manutenção" e
   "Manutenção e Infraestrutura"), essa palavra sai do resto antes de juntar --
   senao ela apareceria duas vezes na mesma linha, que era exatamente a queixa
   dela. Loja que tiver um "tipo" diferente do comeco do nome (ex.: tipo
   "Elétrica" com nome "Manutenção e Infraestrutura") no futuro simplesmente
   nao teria nada para cortar, e as duas partes aparecem inteiras. */
function m28Identidade(){
  const tipo=(m28T().tipoRelatorio||"").trim();
  let resto=m28Assunto();
  if(tipo){
    const primeira=tipo.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
    const restoSemAcento=resto.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
    if(restoSemAcento.startsWith(primeira)){
      resto=resto.slice(tipo.length).replace(/^\s*[eE]\s+/,"").trim();
    }
  }
  return {tipo,resto};
}
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
  /* Dentro de um mês aberto (bloco novo), o cabeçalho segue a competência do
     mês -- senão a folha de Setembro sairia com o título e a data do mês de
     origem, e ela clicaria em setembro e leria agosto (30/08). */
  if(typeof M28_FOLHA_ABERTA!=="undefined"&&M28_FOLHA_ABERTA){
    const fm=m28AcharFolha(M28_FOLHA_ABERTA);
    if(fm&&fm.competencia)cab.emitidoEm=fm.emitidoEm||(fm.competencia+"-01");
  }
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
/* A ÁREA MANDA ANTES DA ORDEM (27/08).
   Antes `ordem` vinha primeiro, e serviços da MESMA área com números de ordem
   distantes ficavam separados: na folha o "CORREDOR - ACESSO INTERNO" aparecia
   duas vezes, cada uma dizendo "4 serviços". Com cada área virando um bloco
   fechado isso ficou impossível de ignorar.
   Agora a área é sempre contígua, e a ordem dela vale DENTRO da área. */
function m28Comparar(a,b){
  /* Pedido dela (17/09): URGENTE sempre em 1º dentro da área, na frente dos
     outros -- fixo, pra ter lógica, não só naquela área que ela marcou. */
  return m28CmpPiso(a.piso,b.piso)
    ||m28PosArea(a.piso,a.area)-m28PosArea(b.piso,b.area)
    ||String(a.area||"").localeCompare(String(b.area||""))
    ||((b.urg?1:0)-(a.urg?1:0))
    ||((a.ordem??1e9)-(b.ordem??1e9));
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
  await m28GarantirMesCorrente();   /* o mês corrente nasce sozinho quando a data vira */
  /* DUAS BASES, e nao uma -- cada seletor da barra precisa continuar mostrando
     TODOS os caminhos, senao ela escolhe um piso e fica presa nele.
       basePlena = a loja inteira    -> monta os seletores (piso, area, pessoa)
       itens     = o recorte de agora -> alimenta os numeros e a lista
     Foi por confundir as duas que os numeros do topo passaram meses contando a
     loja inteira embaixo de uma lista de um piso so. */
  const basePlena=m28Itens();
  const todos=m28ItensContados();   /* fora os "Verificar": contam o mesmo que o papel */
  /* LAY-3: escolhida uma pessoa, TUDO passa a ser a folha dela — capa, números
     e lista. Números da folha inteira embaixo do nome de uma pessoa só seriam
     um número que a prejudica, e isso aqui não pode acontecer. */
  const itens=todos;   /* pessoa, piso e area ja vem aplicados (m28ItensDaFolha) */
  const c=m28Cab(itens.length?itens:todos);
  const loja=(empresa(currentStore)||{}).name||currentStoreName||currentStore||"";
  /* o executor que ELA gravou no cabeçalho vence o que veio na carga —
     antes era ao contrário e a edição dela não aparecia (F-3) */
  const exec=M28F.exec||c.executor||(itens.find(d=>d.executor)||{}).executor||"";
  const total=itens.length,feitos=itens.filter(d=>d.feito).length;
  const areas=[...new Set(itens.map(d=>d.area))];        /* para o "em N áreas" */
  /* estas duas listas alimentam os SELETORES: saem da base plena, nunca do
     recorte, ou não haveria caminho de volta depois de escolher um piso */
  const pisos=[...new Set(basePlena.map(d=>d.piso))].sort(m28CmpPiso);
  /* áreas que só diferem em maiúscula, acento ou espaço contam como UMA */
  const areasTodas=(()=>{const vis=new Map();
    basePlena.filter(d=>!M28F.piso||d.piso===M28F.piso).forEach(d=>{
      const k=m28NormArea(d.area);if(k&&!vis.has(k))vis.set(k,String(d.area).trim().replace(/\s+/g," "));});
    return [...vis.values()].sort((a,b)=>a.localeCompare(b,"pt"));})();

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
      ${exec?`<div class="m28-capa-i"><span class="rot">${esc(m28T().rotExec)}</span><span class="val">${esc(m28NomeExec(exec))}</span>
        <button class="m28-lapis" onclick="m28TrocarExecutor()" title="Trocar o responsável pelos serviços" aria-label="Trocar o responsável pelos serviços">✎</button></div>`:""}
      <div class="m28-capa-i"><span class="rot">${esc(m28T().rotUnidade)}</span><span class="val">${esc(loja)}</span></div>
      <div class="m28-capa-i"><span class="rot">${esc(m28T().rotEmitido)}</span><span class="val">${brDate(c.emitidoEm||today())}</span>
        <button class="m28-lapis" onclick="m28TrocarEmissao()" title="Trocar a data de emissão" aria-label="Trocar a data de emissão">✎</button></div>
    </div></div>`;

  /* painel de números: peça PRONTA da biblioteca (bd-kpis / bd-kpi), nada do zero */
  /* O CARTAO DIZ QUANDO E' ELE QUE ESTA NA LISTA (26/08).
     Escolhido "so o que falta", a lista mostra 5 e o cartao continua marcando 8
     -- e esta certo: os tres cartoes sao total, a fazer e feitos, e filtrar por
     situacao faria cada um contar de uma base diferente. So que, olhando, parece
     numero parado. Entao o cartao que corresponde ao filtro se acende e diz
     "e o que esta na lista": a conta continua honesta e a ligacao fica visivel. */
  /* v11.56 (pedido dela, 01/10): TRÊS cards, sem frase embaixo. "Serviços" = o que falta fazer. */
  const kpi=(nome,valor,classe,ativo)=>`<div class="bd-kpi${ativo?" m28-kpi-ativo":""}">
      <div class="bd-kpi-topo"><span class="bd-kpi-nome">${esc(nome)}</span></div>
      <div class="bd-kpi-num${classe?" "+classe:""}">${valor}</div>
    </div>`;
  const urgentes=itens.filter(d=>d.urg&&!d.feito).length;
  const numeros=`<div class="bd-kpis m28-nums">
    ${kpi("Serviços",total-feitos,"m28-pend",M28F.ver==="fazer")}
    ${kpi("Urgentes",urgentes,"m28-urg")}
    ${kpi("Feitos",feitos,"m28-ok",M28F.ver==="feitos")}
  </div>`;

  /* SÃO DUAS FOLHAS JUNTAS (26/08).
     Ela escolheu o 1º piso e "só o que falta", viu 35 e esperava 17. Os 35
     estavam certos: são 17 de uma pessoa mais 18 da outra. Mas nada na tela
     dizia isso -- o seletor marcava "Folha de: todos" numa letra discreta, e
     ela pensa nas duas como documentos separados (a manutenção dele, a elétrica
     do outro). Palavras dela: "já adianto que não está batendo".
     O número não muda: o que faltava era ele se explicar. E cada nome vira
     botão, para escolher num toque em vez de procurar o seletor. */
  const porPessoa=(()=>{
    if(M28F.exec)return "";                        /* já escolheu alguém */
    const quem=m28Executores(itens);
    if(quem.length<2)return "";                    /* uma pessoa só: nada a dividir */
    const partes=quem.map(e=>{
      const n=itens.filter(d=>(d.executor||"").trim()===e&&!d.feito).length;
      return `<button type="button" class="m28-pessoa" onclick="m28Filtro('exec',${JSON.stringify(e).replace(/"/g,"&quot;")})">`
        +`<b>${n}</b> de ${esc(m28NomeExec(e))}</button>`;
    }).join("");
    return `<div class="bd-aviso bd-aviso-info m28-juntas">
      <span class="bd-aviso-ico" aria-hidden="true">${icone("pessoas")}</span>
      <div><b>São ${quem.length} folhas somadas aqui.</b>
        Toque num nome para ver só a folha dele:
        <span class="m28-pessoas">${partes}</span></div>
    </div>`;
  })();

  const nVer=m28QtdVerificar();
  const opPiso=pisos.map(p=>`<option value="${esc(p)}"${M28F.piso===p?" selected":""}>Piso: ${esc(p)}</option>`).join("");
  const opArea=areasTodas.map(a=>`<option value="${esc(a)}"${M28F.area===a?" selected":""}>Área: ${esc(a)}</option>`).join("");
  /* só aparece quando há mais de uma pessoa com serviço — com um executor só,
     um seletor de um item é ruído na barra */
  /* sai de TODOS, nunca dos filtrados: senão, escolhida uma pessoa, o seletor
     ficaria só com ela e não haveria caminho de volta */
  const execs=m28Executores(basePlena);
  const opExec=execs.length>1?execs.map(e=>{
    const n=basePlena.filter(d=>(d.executor||"").trim()===e&&(!M28F.piso||d.piso===M28F.piso)).length;
    return `<option value="${esc(e)}"${M28F.exec===e?" selected":""}>Para: ${esc(m28NomeExec(e))} (${n})</option>`;
  }).join(""):"";
  const barra=`<div class="toolbar m28-barra m28-filtros">
    ${opExec?`<select aria-label="Escolher de quem é a folha" onchange="m28Filtro('exec',this.value)"
      title="A folha inteira passa a ser desta pessoa — na tela e na impressão"><option value="">Para: todos</option>${opExec}</select>`:""}
    <select aria-label="Filtrar por piso" onchange="m28Filtro('piso',this.value)"><option value="">Piso: todos</option>${opPiso}</select>
    <select aria-label="Filtrar por área" onchange="m28Filtro('area',this.value)"><option value="">Área: todas</option>${opArea}</select>
    <select aria-label="Pendências" onchange="m28Filtro('ver',this.value)">
      <option value="todos"${M28F.ver==="todos"?" selected":""}>Pendências: todas</option>
      <option value="fazer"${M28F.ver==="fazer"?" selected":""}>Pendências: ativas</option>
      <option value="feitos"${M28F.ver==="feitos"?" selected":""}>Pendências: concluídas</option>
    </select>
    <button class="m28-lemb${M28F.ver==="lembretes"?" on":""}" aria-pressed="${M28F.ver==="lembretes"}"
      onclick="m28Filtro('ver',M28F.ver==='lembretes'?'todos':'lembretes')"
      title="Mostrar só os serviços com lembrete da Letícia">Lembretes Letícia</button>
    <div class="search m28-lupa">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="text" id="m28q" aria-label="Buscar nesta folha" autocomplete="off" spellcheck="false"
        placeholder="Buscar serviço…" title="Busca no serviço, na área e na observação" value="${esc(M28F.q)}" oninput="m28Filtro('q',this.value)">
    </div>
    <button class="btn ghost sm" onclick="m28Novo()" title="Acrescentar um serviço nesta folha">+ Serviço</button>
  </div>
  <div class="toolbar m28-barra m28-botoes">
    ${nVer?`<button class="btn ghost sm" onclick="m28MoverVerificar()"
      title="Tirar da folha impressa as ${nVer} observações que começam com VERIFICAR — elas continuam aqui, só para você">${icone("cadeado")} Tirar ${nVer} “VERIFICAR” da folha impressa</button>`:""}
    <button class="btn ghost sm" onclick="m28Imprimir('imprimir')" title="Abrir a folha pronta para imprimir no papel">${icone("imprimir")} Imprimir</button>
    <button class="btn ghost sm" onclick="m28Imprimir('pdf')" title="Abrir a folha pronta para salvar em PDF">${icone("pdf")} PDF</button>
    <button class="btn ghost sm" onclick="m28Imprimir('word')" title="Baixar esta folha em Word, para editar o texto">${icone("doc")} Word</button>
    <button class="btn ghost sm" onclick="m28ParaPlanilha()" title="Baixar esta folha em planilha (abre no Excel)">${icone("planilha")} Planilha</button>
    <button class="btn ghost sm" onclick="m28ParaWhatsApp()" title="Copiar esta folha em texto, pronta para colar no WhatsApp">${icone("conversa")} WhatsApp</button>
    <button class="btn ghost sm" onclick="m28PainelRalos()" title="Rastreamento de ralos: a lista que sai no fim da folha">${icone("gota")} Rastreamento Ralos</button>
  </div>`;

  /* AS QUATRO DIVISÕES (28/08) — o desenho dos Checklists, que ela já conhece.
     As classes vêm prontas do css/app.css (.ck-barra/.ck-secs/.ck-sec), com os
     44px de toque já garantidos em css/aparencia.css. Nada de peça nova.
     A CONTAGEM DE CADA DIVISÃO É O .length DA MESMA FUNÇÃO QUE MONTA A LISTA:
     número que não bate com a lista logo abaixo já deu problema aqui. */
  const secs=[
    ["demandas",icone("mnt"),"Demandas",   M28_FOLHA_ABERTA?m28LinhasDaTela().length:m28MesesLista().length],
    ["verificar",icone("lupa"),"Verificar", m28ParaVerificar().length]];
  const abas=`<div class="ck-barra"><div class="ck-secs">`
    +secs.map(([k,ic,nm,n])=>`<button class="ck-sec${k==="verificar"?" m28-ver":""}${M28_SEC===k?" on":""}" onclick="m28SetSec('${k}')"
        aria-pressed="${M28_SEC===k?"true":"false"}"><span class="ic" aria-hidden="true">${ic}</span>
        <span class="nm">${nm}</span><span class="qt">${n}</span></button>`).join("")
    +`</div></div>`;

  if(M28_SEC==="ver"){ el.innerHTML=abas+m28VerFolhaHTML(); return; }
  if(M28_SEC==="verificar"){ el.innerHTML=abas+m28VerificarHTML(); return; }

  /* aba "Demandas": sem mês aberto = a pilha de meses (ou o mês antigo com
     mais de uma folha); com mês aberto = o relatório daquele mês. */
  if(!M28_FOLHA_ABERTA && M28_MES_ANTIGO){
    const mm=m28MesesLista().find(x=>x.comp===M28_MES_ANTIGO);
    el.innerHTML=abas+((mm&&mm.derivado)?m28MesDerivadoHTML(M28_MES_ANTIGO):m28MesAntigoHTML(M28_MES_ANTIGO));
    return;
  }
  if(!M28_FOLHA_ABERTA){ el.innerHTML=abas+m28PilhaMesesHTML(); return; }

  /* v11.57: os 3 cards ficam embaixo do aviso das paradas */
  el.innerHTML=m28BarraMesHTML()+capa+abas+porPessoa+barra+(typeof paradaFaixa==="function"?paradaFaixa("mnt28"):"")+(M28_VIS&&M28_VIS.kpis===false?"":numeros)+'<div id="m28-lista"></div>';
  m28RenderLista();
}

/* =====================================================================
   AS TELAS DO HISTÓRICO (28/08)
   Reusam as peças da biblioteca (bd-*) e as classes de tabela do checklist
   (.ck-tab-wrap/.ck-tab/.ck-and/.ck-td-ac), que já existem no css/app.css.
   ===================================================================== */
function m28ListaFolhasHTML(status){
  const l=m28Folhas(status);
  if(!l.length)return `<div class="bd-vazio">
    <div class="bd-vazio-ico" aria-hidden="true">${status==="andamento"?icone("calendario"):icone("ok")}</div>
    <div class="bd-vazio-tit">${status==="andamento"?"Nenhuma folha entregue ainda":"Nenhuma folha concluída ainda"}</div>
    <div class="bd-vazio-txt">${status==="andamento"
      ? "Quando você mandar imprimir a folha de trabalho, ela fica guardada aqui, e o andamento sobe sozinho conforme você marca o que foi feito."
      : "Quando terminar um mês, abra a folha em “Em andamento” e aperte “Concluir esta folha”. Ela vira histórico aqui."}</div></div>`;
  return `<div class="ck-tab-wrap"><table class="ck-tab">
    <thead><tr><th>Entregue em</th><th>Folha</th><th>Responsável</th>
      <th>${status==="andamento"?"Andamento":"Resultado"}</th><th></th></tr></thead>
    <tbody>${l.map(f=>{
      const a=m28AndamentoFolha(f);
      const pct=a.total?Math.round(a.feitas/a.total*100):0;
      return `<tr>
        <td>${esc(brDate(f.emitidoEm||f.criadoEm||""))}</td>
        <td>${esc(m28NomeFolha(f))}<span class="m28-count-ver" style="margin-left:6px">${f.total} ${f.total===1?"serviço":"serviços"}</span></td>
        <td>${esc(m28NomeExec(f.executor||"—"))}</td>
        <td><span class="ck-and">${a.feitas} de ${a.total} feitos</span>${a.total?` <span class="m28-pct">${pct}%</span>`:""}</td>
        <td class="ck-td-ac">
          ${status==="andamento"
            ? `<button class="btn sm" onclick="m28Retomar('${f.uid}')" title="Voltar para a lista com os filtros desta folha">▶ Retomar</button>
               <button class="btn ghost sm" onclick="m28VerFolha('${f.uid}')" title="Ver os serviços desta folha" aria-label="Ver os serviços desta folha">${icone("lupa")}</button>`
            : `<button class="btn ghost sm" onclick="m28VerFolha('${f.uid}')" title="Ver os serviços desta folha, como ela foi entregue">${icone("lupa")} Ver</button>
               <button class="btn ghost sm" onclick="m28ReabrirFolha('${f.uid}')" title="Reabrir: volta para Em andamento" aria-label="Reabrir: volta para Em andamento">${icone("voltar")}</button>`}
          <button class="delbtn" onclick="m28ExcluirFolha('${f.uid}')" title="Excluir só o registro desta entrega" aria-label="Excluir só o registro desta entrega">${icone("lixo")}</button>
        </td></tr>`;}).join("")}</tbody></table></div>`;
}

/* a folha do jeito que foi entregue. O serviço que ela apagou depois não some:
   vira um lugar vazio, para o total nunca encolher sozinho meses depois. */
function m28VerFolhaHTML(){
  const f=m28AcharFolha(M28_FOLHA_VER);
  if(!f)return `<div class="bd-vazio"><div class="bd-vazio-tit">Folha não encontrada</div></div>`;
  const itens=m28ItensDaEntrega(f), a=m28AndamentoFolha(f);
  let html="",area=null,n=0;
  for(const d of itens){
    if(!d){html+=`<div class="m28-item"><span></span><span class="m28-num m28-num-ver">—</span>
      <div class="m28-fazer"><span class="m28-vaziotxt">serviço removido depois da entrega</span></div>
      <div></div><div></div><div></div></div>`;continue;}
    if(d.area!==area){area=d.area;n=0;
      if(html)html+="</div>";
      html+=`<div class="m28-grupo"><div class="m28-area"><span class="m28-area-nome">${esc(area||"Sem área")}</span></div>`;}
    n++;
    html+=`<div class="m28-item${d.feito?" feito":""}">
      <span class="m28-check" role="img" aria-label="${d.feito?"feito":"não feito"}">${d.feito?"✓":""}</span>
      <span class="m28-num">${n}.</span>
      <div class="m28-fazer">${d.urg?`<span class="m28-urgselo">Urgente</span> `:""}${(("naCompras" in d)?d.naCompras:m28TemCompra(d))?`<span class="m28-cmpselo">Na lista de compras</span> `:""}<span class="m28-linhas">${esc(m28SemTravessao(d.fazer||""))}</span></div>
      <div class="m28-desde">${m28Desde(d)}</div><div class="m28-obs">${d.obs?m28Texto(d.obs):""}</div><div></div></div>`;
  }
  if(html)html+="</div>";
  return `<div class="m28-folha-topo">
      <div><b>${esc(m28NomeFolha(f))}</b>
        <div class="m28-escolha-sub">Entregue em ${esc(brDate(f.emitidoEm||f.criadoEm||""))}${f.executor?" · "+esc(m28NomeExec(f.executor)):""}
          · ${a.feitas} de ${a.total} feitos</div></div>
      <div>
        <button class="btn ghost sm" onclick="m28VoltarDoVer()">← Voltar</button>
        ${f.status==="andamento"
          ? `<button class="btn sm" onclick="m28ConcluirFolha('${f.uid}')" title="Encerrar esta folha e guardar o resultado">Concluir esta folha</button>`
          : `<button class="btn ghost sm" onclick="m28ReabrirFolha('${f.uid}')">↩ Reabrir</button>`}
      </div>
    </div>${html||'<div class="bd-vazio"><div class="bd-vazio-tit">Esta folha está vazia</div></div>'}`;
}

/* O QUE ELA PRECISA CONFERIR NA LOJA.
   Palavras dela: "eu nunca lembro que eu tenho que verificar essas demandas,
   já caiu no esquecimento várias vezes". */
function m28VerificarHTML(){
  const l=m28ParaVerificar().sort(m28Comparar);
  if(!l.length)return `<div class="bd-vazio">
    <div class="bd-vazio-ico" aria-hidden="true">${icone("lupa")}</div>
    <div class="bd-vazio-tit">Nada para conferir na loja</div>
    <div class="bd-vazio-txt">Quando você marcar uma demanda com a lupa, ela sai da folha do Sr. João e vem parar aqui, esperando você conferir na loja.</div></div>`;
  let html="",area=null,n=0;
  for(const d of l){
    if(d.area!==area){area=d.area;n=0;
      if(html)html+="</div>";
      html+=`<div class="m28-grupo"><div class="m28-area"><span class="m28-area-nome">${esc(area||"Sem área")}</span></div>`;}
    n++;
    html+=`<div class="m28-item">
      <button class="m28-check" onclick="m28Verificar(${d.id})" title="Já conferi: volta para a folha do Sr. João"
        aria-label="Já conferi: ${esc((d.fazer||"").slice(0,60))}"></button>
      <span class="m28-num">${n}.</span>
      <div class="m28-fazer"><span class="m28-linhas">${esc(m28SemTravessao(d.fazer||""))}</span></div>
      <div class="m28-desde">${m28Desde(d)}</div>
      <div class="m28-obs">${d.obs?m28Texto(d.obs):""}${d.nota?`<div class="m28-nota"><span class="m28-nota-selo">só eu vejo</span>${m28Texto(d.nota)}</div>`:""}</div>
      <div class="m28-acts"><button class="btn ghost sm" onclick="m28Editar(${d.id})" title="Mudar este serviço">✎</button></div></div>`;
  }
  if(html)html+="</div>";
  return `<div class="m28-folha-topo">
      <div><b>${l.length} ${l.length===1?"serviço":"serviços"} para conferir na loja</b>
        <div class="m28-escolha-sub">Não saem na folha do Sr. João. Marque a caixinha quando conferir: o serviço volta para a folha.</div></div>
      <div><button class="btn sm" onclick="m28ListaDeBolso()" title="Abre a lista para você levar no celular">${icone("dg")} Levar para a loja</button></div>
    </div>${html}`;
}

/* =====================================================================
   A LISTA DE BOLSO (28/08) — a peça que quebra o esquecimento
   ---------------------------------------------------------------------
   Palavras dela: "eu preciso de alguma forma me lembrar das demandas que eu
   preciso verificar porque senão vai cair no esquecimento como já caiu
   várias vezes".
   A causa do esquecimento não é falta de lista: é que a lista não existe no
   momento em que ela está NA LOJA. Então esta janela é feita para o celular,
   de pé, no corredor: letra grande, alvo de dedo, e a caixinha resolve na
   hora (o serviço volta para a folha do Sr. João).
   ===================================================================== */
function m28ListaDeBolso(){
  const l=m28ParaVerificar().sort(m28Comparar);
  if(!l.length){toast("Não há nada para conferir na loja");return;}
  const antigo=document.getElementById("m28-bolso");if(antigo)antigo.remove();
  const loja=(empresa(currentStore)||{}).name||currentStoreName||currentStore||"";
  const m=document.createElement("div");
  m.className="bd-fundo";m.id="m28-bolso";
  m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");
  m.setAttribute("aria-label","Lista para levar para a loja");
  const fechar=()=>{m.remove();document.removeEventListener("keydown",tecla);renderMnt28();};
  const tecla=ev=>{if(ev.key==="Escape")fechar();};
  m.innerHTML=`<div class="bd-janela m28-bolso-janela" onclick="event.stopPropagation()">
      <div class="bd-janela-topo"><div><b>Conferir na loja</b>
        <div class="m28-escolha-sub">${esc(loja)}${M28F.piso?" · "+esc(m28PisoBonito(M28F.piso)):""}
          · <span id="m28-bolso-n">${l.length}</span> para conferir</div></div>
        <button class="bd-janela-x" aria-label="Fechar">✕</button></div>
      <div class="bd-janela-corpo m28-bolso-corpo" id="m28-bolso-lista"></div>
      <div class="bd-janela-rodape"><span class="bd-ajuda">Marcou? O serviço volta para a folha do Sr. João.</span></div>
    </div>`;
  m.onclick=fechar;m.querySelector(".bd-janela-x").onclick=fechar;
  document.body.appendChild(m);
  document.addEventListener("keydown",tecla);
  m28BolsoLista();
}
function m28BolsoLista(){
  const box=document.getElementById("m28-bolso-lista");if(!box)return;
  const l=m28ParaVerificar().sort(m28Comparar);
  const n=document.getElementById("m28-bolso-n");if(n)n.textContent=l.length;
  if(!l.length){box.innerHTML=`<div class="bd-vazio"><div class="bd-vazio-ico" aria-hidden="true">✅</div>
    <div class="bd-vazio-tit">Conferiu tudo</div>
    <div class="bd-vazio-txt">Todos os serviços voltaram para a folha.</div></div>`;return;}
  let html="",area=null;
  for(const d of l){
    if(d.area!==area){area=d.area;
      html+=`<div class="m28-bolso-area">${esc(area||"Sem área")}</div>`;}
    html+=`<button class="m28-bolso-item" onclick="m28BolsoConferir(${d.id})">
      <span class="m28-bolso-cx" aria-hidden="true"></span>
      <span class="m28-bolso-txt">${esc(m28SemTravessao(d.fazer||""))}
        ${d.obs?`<i>${esc(m28SemTravessao(d.obs))}</i>`:""}</span></button>`;
  }
  box.innerHTML=html;
}
async function m28BolsoConferir(id){
  const d=DATA.find(x=>x.id===id);if(!d)return;
  d.verificar=false;d.mod=nowISO();
  await putItem(d);dataChanged();
  m28BolsoLista();
  toast("Conferido, voltou para a folha");
}

/* QUALQUER filtro refaz a aba inteira (26/08).
   Antes so o executor fazia isso, e os outros filtros mexiam apenas na lista.
   Resultado: ela escolhia o 1o piso, a lista mostrava 35 servicos e os cartoes
   la em cima continuavam dizendo 155 -- os da loja inteira. E o seletor de AREA
   continuava oferecendo as areas do piso anterior.
   Ela: "quando eu filtrar so o que falta ou todos ou area ou qualquer outro
   filtro, tudo isso precisa atualizar sozinho. Esses cards etc."
   A busca por texto e' a unica excecao: e' digitada letra a letra, e redesenhar
   a aba a cada tecla custaria o foco do campo no meio da palavra. */
function m28Filtro(k,v){
  M28F[k]=v;
  if(k==="q"){ m28RenderLista(); m28AtualizarTopo(); return; }
  if(k==="exec"||k==="piso") M28F.fechadas={};
  if(k==="piso") M28F.area="";   /* area de outro piso nao existe neste */
  renderMnt28();
}

/* O QUE A LISTA DA TELA MOSTRA — UM LUGAR SÓ (28/08).
   O botão "Demandas" conta o .length DESTA função, e a lista desenha ESTA
   função. Enquanto eram duas contas separadas, o botão dizia 20 e a lista
   trazia 26 quando o filtro estava em "Todos". Já deu problema aqui duas
   vezes; agora não há como divergir. */
function m28LinhasDaTela(){
  const q=(M28F.q||"").toLowerCase();
  return m28Itens().filter(d=>{
    /* o que está em "Verificar" tem divisão própria desde 28/08: sai daqui.
       Quantos há em cada área continua na pastilha, em "N a verificar". */
    if(d.verificar)return false;
    if(M28F.exec&&(d.executor||"").trim()!==M28F.exec)return false;   /* a folha é de uma pessoa só */
    if(M28F.piso&&d.piso!==M28F.piso)return false;
    if(M28F.area&&d.area!==M28F.area)return false;
    if(M28F.ver==="fazer"&&d.feito)return false;
    if(M28F.ver==="feitos"&&!d.feito)return false;
    if(M28F.ver==="lembretes"&&!(d.nota||"").trim())return false;   /* o "só pra mim" à vista, sempre */
    if(q&&!((d.fazer||"")+" "+(d.obs||"")+" "+(d.nota||"")+" "+(d.area||"")+" "+(d.piso||"")).toLowerCase().includes(q))return false;
    return true;});
}

/* toda vez que a lista se refaz, ela fica no mesmo lugar da tela (24/09).
   M28_PULAR: a demanda que acabou de mudar de posicao (concluida), que nao
   pode servir de referencia. */
let M28_PULAR=null;
function m28RenderLista(){
  const g=(typeof lugarGuardar==="function")?lugarGuardar(M28_PULAR):null;
  M28_PULAR=null;
  m28RenderListaDesenho();
  if(g&&typeof lugarVoltar==="function")lugarVoltar(g);
}
function m28RenderListaDesenho(){
  const el=document.getElementById("m28-lista");if(!el)return;
  let rows=m28LinhasDaTela();

  if(!rows.length){
    el.innerHTML='<div class="m28-vazio">Nenhum serviço com esses filtros. '
      +'Limpe a busca ou escolha “Todos” para ver a folha inteira.</div>';
    return;
  }
  rows.sort(m28Comparar);
  /* RALOS NA TELA TAMBEM (28/09, "regra global" dela): o que e' ralo sai da
     area e vai para o bloco "Rastreamento de Conferencia de Ralos" no fim,
     igual ao papel. Cada servico continua com o check e o lapis de sempre. */
  const sepT=m28SepararRalos(rows), ehR=new Set();
  for(const r of sepT.ralos)for(const d of r.itens)ehR.add(d);
  rows=sepT.manut.concat(sepT.ralos.flatMap(r=>r.itens));
  const pre=d=>ehR.has(d)?"R|":"";

  /* A CONTAGEM DA TELA CONTA O MESMO QUE O PAPEL (28/08).
     O item posto em "Verificar" não vai na folha do Sr. João, então também não
     entra em "N serviços" aqui: número que não bate com o papel é pior que
     número nenhum, e ela assina esse papel. */
  const nPiso={},nArea={},fArea={};
  for(const d of rows){
    const k=pre(d)+d.piso+"|"+d.area;
    nPiso[pre(d)+d.piso]=(nPiso[pre(d)+d.piso]||0)+1;
    nArea[k]=(nArea[k]||0)+1;
    if(d.feito)fArea[k]=(fArea[k]||0)+1;
  }
  /* quantos há em verificação em cada área: sai da lista própria deles, porque
     eles já não estão em `rows`. Assim a pastilha continua avisando que existe
     algo esperando conferência ali, sem o item ocupar a lista de trabalho. */
  const vArea={};
  for(const d of m28ParaVerificar())vArea[d.piso+"|"+d.area]=(vArea[d.piso+"|"+d.area]||0)+1;
  /* MESMO DESENHO DA FOLHA IMPRESSA (27/08): cada área é um bloco fechado, e a
     lista é numerada, sem os títulos de coluna. Ela pediu o padrão igual em
     tudo, tela e papel. `aberto` guarda se já existe um bloco a fechar. */
  let html="",piso=null,area=null,nDemanda=0,aberto=false,emRalos=false;
  const fecha=()=>{if(aberto){html+="</div>";aberto=false;}};
  for(const d of rows){
    if(ehR.has(d)&&!emRalos){emRalos=true;piso=null;area=null;fecha();
      const rx=(m28T().ralosTexto||"").trim();
      /* a setinha também fecha o bloco inteiro de ralos (01/10, pedido dela) */
      const rf=!!M28F.fechadas["RALOS"];
      html+=`<div class="m28-ralos-cab"><div class="m28-ralos-tit"><button class="m28-abrefecha" onclick="m28AbreFecha('RALOS')"
          aria-expanded="${rf?"false":"true"}" title="${rf?"Abrir os ralos":"Fechar todos os ralos"}"
          aria-label="${rf?"Abrir":"Fechar"} o rastreamento de ralos">${M28_CHEV}</button>${icone("gota")} ${esc(m28T().ralosTitulo||M28_TXT_PADRAO.ralosTitulo)}</div>`
        +(rx&&!rf?`<p class="m28-ralos-txt">${esc(m28SemTravessao(rx))}</p>`:"")+`</div>`;}
    if(emRalos&&M28F.fechadas["RALOS"])continue;   /* bloco de ralos fechado: some tudo dele */
    if(d.piso!==piso){piso=d.piso;area=null;fecha();
      const np=nPiso[pre(d)+d.piso]||0;
      const kp="P|"+pre(d)+d.piso,pf=!!M28F.fechadas[kp];
      html+=`<div class="m28-piso${pf?" fechado":""}"><button class="m28-abrefecha m28-abrefecha-piso" onclick="m28AbreFecha('${esc(kp).replace(/'/g,"'")}')"
          aria-expanded="${pf?"false":"true"}" title="${pf?"Abrir este piso":"Fechar este piso inteiro"}"
          aria-label="${pf?"Abrir":"Fechar"} o piso ${esc(piso||"Sem piso")}">${M28_CHEV}</button><span class="m28-piso-nome">${esc(piso||"Sem piso")}${emRalos?" · Ralos":""}</span><span class="m28-count">${np} ${np===1?"serviço":"serviços"}</span></div>`;}
    if(M28F.fechadas["P|"+pre(d)+d.piso]){area=null;fecha();continue;}   /* piso fechado: some tudo dele */
    if(d.area!==area){area=d.area;nDemanda=0;const k=pre(d)+d.piso+"|"+d.area;
      fecha();html+='<div class="m28-grupo">';aberto=true;
      const f=fArea[k]||0,n=nArea[k]||0,v=vArea[k]||0;
      const fechada=!!M28F.fechadas[k];
      /* Folha 2 dela: cada área pode FECHAR, igual ao Notion — a setinha gira e
         os serviços somem até abrir de novo. Só arruma a vista: nada se apaga. */
      html+=`<div class="m28-area${fechada?" fechada":""}" data-piso="${esc(d.piso)}" data-area="${esc(area)}">`
        +`<button class="m28-abrefecha" onclick="m28AbreFecha('${esc(k).replace(/'/g,"\'")}')"
            aria-expanded="${fechada?"false":"true"}" title="${fechada?"Abrir esta área":"Fechar esta área"}"
            aria-label="${fechada?"Abrir":"Fechar"} a área ${esc(area)}">${M28_CHEV}</button>`
        +`<span class="m28-area-nome">${esc(area)}</span>`
        +`<button class="m28-lapis m28-lapis-area" onclick="m28RenomearArea('${esc(d.piso).replace(/'/g,"\'")}','${esc(area).replace(/'/g,"\'")}')"
            title="Renomear esta área (vale para a folha inteira)" aria-label="Renomear a área ${esc(area)}">✎</button>`
        /* área que só tem item em verificação não diz "0 serviços": diria a ela
           que não há nada aqui, quando na verdade há algo esperando a conferência */
        +`<span class="m28-count">${n?(f?f+" de "+n+" feitos":n+(n===1?" serviço":" serviços")):""}`
        +(v&&!emRalos?`<i class="m28-count-ver">${v} a verificar</i>`:"")+`</span>`
        +`</div>`;}
    if(M28F.fechadas[pre(d)+d.piso+"|"+d.area])continue;
    /* o número da tela é o MESMO número do papel: é assim que ela combina os
       serviços com o Sr. João. Os "Verificar" já saíram da lista, então aqui a
       contagem é direta. */
    nDemanda++;
    const numero=nDemanda+".";
    if(M28_EDITANDO===d.id){html+=m28FormHTML(d);continue;}
    const fotos=(d.fotos||[]).map((f,i)=>`<img class="m28-foto" src="${f}" alt="Foto do serviço"
        onclick="m28VerFoto(${d.id},${i})" title="Toque para ver grande">`).join("");
    html+=`<div class="m28-item${d.feito?" feito":""}" data-id="${d.id}">
      <button class="m28-check" role="checkbox" aria-checked="${d.feito?"true":"false"}"
        aria-label="Marcar como feito: ${esc((d.fazer||"").slice(0,70))}"
        title="${d.feito?"Marcado como feito — toque para desmarcar":"Marcar como feito"}"
        onclick="m28Marcar(${d.id})"><span aria-hidden="true">${d.feito?"✓":""}</span></button>
      <span class="m28-num">${numero}</span>
      ${/* o texto da demanda vai num <span> proprio com pre-wrap: so o enter que
           ELA deu vira quebra de linha. Antes o pre-wrap pegava a div inteira e
           a indentacao do proprio codigo aqui embaixo virava linha em branco
           depois de cada demanda -- era o "espaco" que ela via. */""}
      <div class="m28-fazer">${d.urg&&!ehR.has(d)?`<span class="m28-urgselo">Urgente</span> `:""}${d.verificar?`<span class="m28-verselo">Verificar · não sai na folha</span> `:""}${m28TemCompra(d)?`<span class="m28-cmpselo">Na lista de compras</span> `:""}<span class="m28-linhas">${esc(m28SemTravessao(d.fazer||""))}</span>${(d.origem&&!(M28_VIS&&M28_VIS.origem===false))?` <span class="m28-origem">${esc(d.origem)}</span>`:""}${typeof orientacaoHTML==="function"?orientacaoHTML(d):""}${fotos?`<div class="m28-fotos">${fotos}</div>`:""}</div>
      <div class="m28-desde">${m28Desde(d)}</div>
      ${/* DUAS CAIXAS DIFERENTES (29/07): o RECADO sai na folha de quem
            conserta; o LEMBRETE é só dela e nunca é impresso. Antes havia
            uma só, e o que ela anotava para si saía impresso para o Sr. João.
            O selo escrito ("só eu vejo") acompanha a cor — cor nunca sozinha. */""}
      <div class="m28-obs">${d.obs?m28Texto(d.obs):(d.nota?"":'<span class="m28-vaziotxt">—</span>')}
        ${d.nota?`<div class="m28-nota"><span class="m28-nota-selo">Letícia revisar urgente · não sai na folha</span>${m28Texto(d.nota)}</div>`:""}</div>
      <div class="m28-acts">
        <button class="btn ghost sm${d.verificar?" m28-ver-on":""}" onclick="m28Verificar(${d.id})"
          aria-pressed="${d.verificar?"true":"false"}"
          aria-label="${d.verificar?"Voltar a incluir na folha impressa":"Marcar como “Verificar”: fica na sua tela, mas não sai na folha impressa"}"
          title="${d.verificar?"Está fora da folha impressa — toque para voltar a incluir":"Marcar “Verificar”: some da folha impressa do Sr. João, continua aqui na sua tela"}">${icone("lupa")}</button>
        <button class="btn ghost sm" onclick="m28ParaQualidade(${d.id})" aria-label="Transferir para o relatório de Qualidade"
          title="Transferir: sai desta folha e vira uma Não Conformidade no relatório de Qualidade">${icone("troca")}</button>
        <button class="btn ghost sm${m28TemCompra(d)?" m28-cmp-on":""}" onclick="m28ParaCompras(${d.id})"
          aria-pressed="${m28TemCompra(d)?"true":"false"}"
          aria-label="${m28TemCompra(d)?"Tirar este item da lista de compras":"Também colocar este item na aba de Compras"}"
          title="${m28TemCompra(d)?"Está na lista de compras — toque para tirar. A demanda continua aqui.":"Também colocar na aba de Compras. A demanda continua aqui."}">Compras</button>
        <button class="btn ghost sm" onclick="histoAbrir(${d.id})" aria-label="Ver o histórico desta demanda"
          title="A história desta demanda: quando nasceu, o que mudou e quando foi concluída">${icone("relogio")}</button>
        <button class="btn ghost sm" onclick="m28Editar(${d.id})" aria-label="Editar este serviço" title="Mudar este serviço aqui mesmo, sem sair da tela">${icone("lapis")}</button>
        <button class="delbtn" aria-label="Excluir este serviço" title="Excluir este serviço" onclick="m28Excluir(${d.id})">${icone("lixo")}</button>
      </div></div>`;
  }
  fecha();
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
  let rows=m28ItensDaFolha();   /* pessoa, piso e area ja vem aplicados */
  rows=rows.filter(d=>!m28AVerificar(d));   /* "Verificar": fica na tela, fora da folha que sai */
  if(M28F.ver==="fazer")rows=rows.filter(d=>!d.feito);
  if(M28F.ver==="feitos")rows=rows.filter(d=>d.feito);
  return rows.sort(m28Comparar);
}
/* RALOS (28/09). E' ralo quando o texto do servico fala em ralo -- a nao ser
   que ela tenha tirado a mao no painel "Rastreamento ralos" (d.ralo=false) ou
   posto a mao um servico que nao fala a palavra (d.ralo=true). */
function m28EhRalo(d){
  if(d.ralo===false)return false;
  if(d.ralo===true)return true;
  return /\bralos?\b/i.test(d.fazer||"");
}
/* separa a folha em duas: o servico comum e a lista de ralos, uma linha por
   area (dois servicos de ralo na mesma area viram uma linha so). A linha so
   sai marcada quando TODOS os servicos de ralo daquela area estao feitos. */
function m28SepararRalos(rows){
  const manut=[],ralos=[],idx={};
  for(const d of rows){
    if(!m28EhRalo(d)){manut.push(d);continue;}
    const k=(d.piso||"")+"|"+(d.area||"");
    if(!idx[k]){idx[k]={piso:d.piso||"",area:d.area||"",feito:true,urg:false,itens:[]};ralos.push(idx[k]);}
    idx[k].itens.push(d);
    if(!d.feito)idx[k].feito=false;
    if(d.urg&&!d.feito)idx[k].urg=true;
  }
  return {manut,ralos};
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
  /* RALOS (28/09): mesma regra do papel -- vem no fim, marcados na coluna Lista */
  const sepP=m28SepararRalos(rows), ehRP=new Set(sepP.ralos.flatMap(r=>r.itens));
  const ordem=sepP.manut.concat(sepP.ralos.flatMap(r=>r.itens));
  const head=["Lista","Piso","Área","O que fazer","Feito","Data do registro","Tempo parado",
    "Responsável","Orientação técnica","Tipo","Base legal","Urgente","Observações","Origem"];
  const linha=d=>[ehRP.has(d)?"Rastreamento de ralos":"Manutenção",d.piso,d.area,d.fazer,d.feito?"Sim":"Não",brDate(d.dataRegistro),
    m28TempoTexto(m28Meses(d.dataRegistro)),d.executor||"",
    d.orientacao||"",(typeof ORI_TIPOS!=="undefined"&&ORI_TIPOS[d.orientacaoTipo])?ORI_TIPOS[d.orientacaoTipo].rotulo:"",
    d.orientacaoBase||"",d.urg?"Sim":"",d.obs||"",d.origem||""];
  /* ponto e vírgula + BOM: é assim que o Excel em português abre certo */
  const csv=[head,...ordem.map(linha)]
    .map(r=>r.map(c=>'"'+String(c==null?"":c).replace(/"/g,'""')+'"').join(";")).join("\r\n");
  download(m28NomeArquivo()+".csv","﻿"+csv,"text/csv");
  toast("Planilha exportada ✓ ("+rows.length+" serviços)");
}
/* F-4 (16/09 refeito): a folha em Word no MESMO LAYOUT da folha impressa/PDF
   (m28ImprimirFolha) — cabeçalho verde, faixa loja/piso/mês, números,
   bloco por área e lista numerada — só que em tabelas e parágrafos de Word
   de verdade, então ela continua editando e formatando à vontade. */
/* 01/10/2026: o Word nasce da MESMA folha paginada do PDF (js/docx-folha.js lê a
   janela da folha). A versão antiga, que remontava a folha por conta própria,
   saía só parecida e foi retirada. */
function m28ParaWord(){ m28Imprimir("word"); }
/* F-4: texto pronto para colar no WhatsApp — sem tabela, sem formatação que
   o WhatsApp não entenda; só *negrito* e traços */
function m28ParaWhatsApp(){
  const todas=m28Filtradas();
  if(!todas.length){alert("Nenhum serviço para enviar com os filtros atuais.");return;}
  const sep=m28SepararRalos(todas), rows=sep.manut;
  const c=m28Cab(todas);
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
  if(sep.ralos.length){
    t+="\n*"+(m28T().ralosTitulo||M28_TXT_PADRAO.ralosTitulo).toUpperCase()+"*\n";
    const rx=(m28T().ralosTexto||"").trim();if(rx)t+=rx+"\n";
    let rp=null,nr=0;
    for(const r of sep.ralos){
      if(r.piso!==rp){rp=r.piso;nr=0;t+="\n*"+(m28PisoBonito(r.piso||"")||"Sem piso").toUpperCase()+"*\n";}
      nr++;t+=(r.feito?"✅ ":"⬜ ")+nr+". "+(r.area||"")+"\n";
    }
  }
  const ct=(m28T().causaTitulo||"").trim(),cx=(m28T().causaTexto||"").trim();
  if(ct||cx)t+="\n*"+(ct||"Por que isto se repete")+"*\n"+cx+"\n";
  m28CopiarTexto(t,todas.length);
}
/* O PAINEL "RASTREAMENTO RALOS" (28/09), ao lado de Word e Planilha.
   Aqui ela ve quais servicos foram para a lista de ralos, tira ou poe cada
   um, troca o titulo e a explicacao, e pode imprimir so a folha dos ralos. */
async function m28PainelRalos(){
  await m28Config();
  const antigo=document.getElementById("m28-ralos");if(antigo)antigo.remove();
  const cand=m28ItensDaFolha().filter(d=>!d.verificar&&(m28EhRalo(d)||/\bralos?\b/i.test((d.fazer||"")+" "+(d.obs||""))))
    .sort(m28Comparar);
  let lista="",piso=null;
  for(const d of cand){
    if(d.piso!==piso){piso=d.piso;lista+=`<div class="bd-rotulo" style="margin:12px 0 4px">${esc(m28PisoBonito(d.piso||"")||"Sem piso")}</div>`;}
    lista+=`<label style="display:flex;gap:10px;align-items:flex-start;padding:8px 2px;border-bottom:1px solid #eceded;cursor:pointer;min-height:44px">
      <input type="checkbox" data-rl="${esc(String(d.id))}"${m28EhRalo(d)?" checked":""} style="margin-top:3px;width:18px;height:18px;flex:none">
      <span><b>${esc(d.area||"Sem área")}</b><br><span class="desc">${esc(d.fazer||"")}</span></span></label>`;
  }
  const p=document.createElement("div");
  p.id="m28-ralos";p.className="cfg-painel";
  p.innerHTML=`<div class="cfg-cx" onclick="event.stopPropagation()">
    <div class="cfg-topo"><b>Rastreamento de ralos</b>
      <button class="btn ghost sm" onclick="document.getElementById('m28-ralos').remove()" aria-label="Fechar">✕</button></div>
    <p class="desc" style="margin:4px 2px 10px">Todo serviço de ralo sai da área dele e vai para
      uma lista só, no fim da folha (impressa, Word e WhatsApp). A explicação aparece uma vez;
      embaixo, só o piso e a área, com a caixinha.</p>
    <div class="bd-grupo"><label class="bd-rotulo" for="m28rl-tit">Título</label>
      <input class="bd-campo" id="m28rl-tit" value="${esc(M28_TXT.ralosTitulo||"")}" placeholder="${esc(M28_TXT_PADRAO.ralosTitulo)}"></div>
    <div class="bd-grupo"><label class="bd-rotulo" for="m28rl-txt">O que precisa ser feito (uma vez só)</label>
      <textarea class="bd-campo" id="m28rl-txt" rows="9">${esc(M28_TXT.ralosTexto||"")}</textarea>
      <span class="bd-ajuda">Use Enter para pular linha. Deixe vazio para voltar ao texto padrão.</span></div>
    <div class="bd-rotulo" style="margin-top:6px">Serviços que entram na lista (${cand.length})</div>
    ${lista||'<p class="desc">Nenhum serviço fala em ralo nesta folha.</p>'}
    <div class="m28-form-acoes" style="margin-top:12px">
      <button class="bd-btn bd-btn-principal" onclick="m28SalvarRalos()">Salvar</button>
      <button class="bd-btn bd-btn-fantasma" onclick="m28SalvarRalos(true)">Salvar e imprimir só os ralos</button>
      <button class="bd-btn bd-btn-fantasma" onclick="document.getElementById('m28-ralos').remove()">Cancelar</button>
    </div></div>`;
  p.onclick=()=>p.remove();
  document.body.appendChild(p);
}
async function m28SalvarRalos(imprimir){
  const p=document.getElementById("m28-ralos");if(!p)return;
  for(const cb of p.querySelectorAll("input[data-rl]")){
    const d=DATA.find(x=>String(x.id)===cb.getAttribute("data-rl"));if(!d)continue;
    const auto=/\bralos?\b/i.test(d.fazer||"");
    /* so grava quando ela contraria a regra automatica; seguir a regra = sem marca */
    const quer=cb.checked, marca=(quer===auto)?undefined:quer;
    if(d.ralo!==marca){if(marca===undefined)delete d.ralo;else d.ralo=marca;d.mod=nowISO();await putItem(d);}
  }
  const novo=Object.assign({},M28_TXT);
  const tit=document.getElementById("m28rl-tit").value.trim(), tx=document.getElementById("m28rl-txt").value.trim();
  novo.ralosTitulo=tit||M28_TXT_PADRAO.ralosTitulo;
  novo.ralosTexto=tx||M28_TXT_PADRAO.ralosTexto;
  const guardar={};
  for(const k in M28_TXT_PADRAO)if(novo[k]&&novo[k]!==M28_TXT_PADRAO[k])guardar[k]=novo[k];
  await (typeof folhasCfgSet==="function"?folhasCfgSet:metaSetU)("mnt28Textos",guardar);
  M28_TXT=Object.assign({},M28_TXT_PADRAO,guardar);
  p.remove();dataChanged();renderMnt28();toast("Rastreamento de ralos salvo ✓");
  if(imprimir)m28ImprimirFolha({soRalos:true});
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
  if(meses<12)return meses+" "+(meses===1?"mês":"meses");
  const anos=Math.floor(meses/12), resto=meses%12;
  let t=anos+" "+(anos===1?"ano":"anos");
  if(resto)t+=" e "+resto+" "+(resto===1?"mês":"meses");
  return t;
}
function m28Desde(d){
  if(!d.dataRegistro)return '<span class="m28-vaziotxt">—</span>';
  const meses=m28Meses(d.dataRegistro), tempo=m28TempoTexto(meses);
  const grave=meses!==null&&meses>=1;       /* 1 mês ou mais: vermelho. Decisão dela (29/08): "1 mês já é tempo demais". */
  return `<span class="m28-data">${brDateCurta(d.dataRegistro)}</span>`
    +(tempo?`<span class="m28-tempo${grave?" grave":""}">${tempo}</span>`:"")
    +(typeof paradaSelo==="function"?paradaSelo(d):"");
}
function m28VerFoto(id,i){
  const d=DATA.find(x=>x.id===id);if(!d||!d.fotos||!d.fotos[i])return;
  verImagemGrande(d.fotos[i]);
}

/* ---- ações (tudo passa por putItem: o desfazer do site pega) ---- */
/* =====================================================================
   TAMBÉM COMPRAR (29/08) — a demanda de manutenção também entra na aba de
   Compras e CONTINUA aqui (ela escolheu "fica nas duas"). O vínculo é o uid
   da demanda gravado em `origemMnt` no item de compra. A marca "na lista de
   compras" é SEMPRE CALCULADA: se o item de compra some (comprado lá, ou
   excluído), a marca some sozinha, sem bookkeeping.
   Sai da lista de compras quando: ela toca em "Compras" de novo, marca a
   demanda como concluída, ou exclui a demanda. Tudo reversível por Ctrl+Z. */
function m28CompraDe(d){
  if(!d||!d.uid||typeof DATA==="undefined")return null;
  return DATA.find(x=>x.tipo==="cmp"&&!x.deleted&&x.origemMnt===d.uid)||null;
}
function m28TemCompra(d){ return !!m28CompraDe(d); }
async function m28ParaCompras(id){
  const d=DATA.find(x=>x.id===id);if(!d)return;
  const jaTem=m28CompraDe(d);
  if(jaTem){
    if(!confirm("Tirar este item da lista de compras?\n\n"+(d.fazer||"")
      +"\n\nA demanda continua aqui na manutenção."))return;
    jaTem.deleted=true;jaTem.mod=nowISO();
    await putItem(jaTem);dataChanged();
    m28RenderLista();toast("Tirado da lista de compras (Ctrl+Z desfaz)");
    return;
  }
  const o={uid:newUid(),mod:nowISO(),tipo:"cmp",loja:d.loja||currentStore,
    piso:d.piso||"",area:d.area||"",
    oque:(d.fazer||"").trim(),qtd:1,situacao:"pedido",link:"",linkDica:"",
    obs:(d.obs||d.orientacao||"").trim(),nota:"",urg:!!d.urg,fotos:[],
    origemMnt:d.uid,
    dataRegistro:today(),relato:today(),criado:"da-manutencao"};
  o.id=await putItem(o);DATA.push(o);dataChanged();
  m28RenderLista();
  toast("Também na lista de Compras ✓ (a demanda continua aqui)");
}

async function m28Marcar(id){
  const d=DATA.find(x=>x.id===id);if(!d)return;
  d.feito=!d.feito;d.mod=nowISO();
  await putItem(d);
  /* concluiu a demanda: o item vinculado sai da lista de Compras (pedido dela
     29/08). Para trazer de volta, ela toca em "Compras" na demanda de novo. */
  if(d.feito){
    const c=m28CompraDe(d);
    if(c){c.deleted=true;c.mod=nowISO();await putItem(c);
      toast("Concluído. Saiu também da lista de compras.");}
  }
  dataChanged();
  M28_PULAR=id;
  m28AtualizarTopo();m28RenderLista();
}
/* "VERIFICAR" (27/08) — pedido dela: um item que ela ainda precisa conferir na
   loja NAO pode ir no papel do Sr. Joao (nao e' serviço a entregar), mas tem
   que continuar aparecendo na tela dela. Antes nao havia jeito: ou estava "a
   fazer", ou "feito", ou sumia para a Qualidade. Agora e' uma chave: fora da
   folha impressa e da contagem dela; na tela fica, com o selo escrito.
   Desmarcar volta tudo — nada se perde. */
async function m28Verificar(id){
  const d=DATA.find(x=>x.id===id);if(!d)return;
  d.verificar=!d.verificar;d.mod=nowISO();
  await putItem(d);dataChanged();
  m28AtualizarTopo();m28RenderLista();
  toast(d.verificar?"Marcado como “Verificar” — não sai na folha impressa":"Volta a sair na folha impressa");
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
    /* preventScroll: o cursor entra no campo sem a tela pular */
    if(c){c.focus({preventScroll:true});c.setSelectionRange(c.value.length,c.value.length);}
  }else if(typeof telaPendenteAplicar==="function")telaPendenteAplicar();
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
  const fotos=(d.fotos||[]).map((f,i)=>`<span class="m28-thumb"><img src="${f}" width="64" height="64" alt="Foto ${i+1} deste serviço"
      onclick="verImagemGrande('${f}')" title="Toque para ver grande">
      <button type="button" onclick="m28TirarFoto(${d.id},${i})" aria-label="Remover a foto ${i+1}" title="Remover">×</button></span>`).join("");
  /* a lista de quem executa é a MESMA da aba antiga (ela já cadastra e renomeia
     por lá) — nunca uma segunda lista para ela manter em dois lugares */
  const opExec=m28PessoasOpcoes((d.executor||"").trim());
  return `<div class="m28-form" data-id="${d.id}" role="group" aria-label="Editando esta demanda">
    <p class="m28-form-titulo">Editando esta demanda</p>
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
        <select class="bd-campo" id="m28f-exec" data-antes="${esc((d.executor||"").trim())}" onchange="m28TrocouPessoa(this)">${opExec}</select>
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
        <label class="bd-rotulo" for="m28f-nota">Letícia revisar urgente</label>
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
  if(ex&&ex.value!=="__nova")d.executor=ex.value==="Outro"?"":ex.value;
  d.mod=nowISO();
  await putItem(d);dataChanged();
  M28_EDITANDO=null;m28AtualizarTopo();
  /* trocou de dono: a barra precisa se refazer, senão o seletor fica sem o nome
     novo (ou com um nome que já não tem nenhum serviço atrás) */
  if((d.executor||"").trim()!==execAntes){
    const g=(typeof lugarGuardar==="function")?lugarGuardar():null;
    renderMnt28();if(g)lugarVoltar(g);
    toast("Serviço enviado para a folha de "+(d.executor||"ninguém")+" ✓");
    if(typeof telaPendenteAplicar==="function")telaPendenteAplicar();return;}
  m28RenderLista();toast("Serviço atualizado ✓");
  if(typeof telaPendenteAplicar==="function")telaPendenteAplicar();
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
  await putItem(d);
  const c=m28CompraDe(d);
  if(c){c.deleted=true;c.mod=nowISO();await putItem(c);}
  dataChanged();
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
  /* nasceu dentro de um mês aberto? entra na lista daquele mês na hora */
  const fMes=(typeof M28_FOLHA_ABERTA!=="undefined"&&M28_FOLHA_ABERTA)&&m28AcharFolha(M28_FOLHA_ABERTA);
  if(fMes&&fMes.competencia&&fMes.status==="andamento"){
    fMes.itens=[...(fMes.itens||[]),o.uid];
    fMes.total=fMes.itens.length;
    fMes.mod=nowISO();
    await putItem(fMes);
  }
  M28_EDITANDO=id;
  m28AtualizarTopo();m28RenderLista();
  const c=document.querySelector('.m28-form textarea');if(c)c.focus();
}
/* só os números do topo — evita redesenhar a folha inteira a cada toque */
function m28AtualizarTopo(){
  const itens=m28ItensContados(),total=itens.length,feitos=itens.filter(d=>d.feito).length;
  const el=document.getElementById("tab-mnt28");if(!el)return;
  const nums=el.querySelectorAll(".m28-nums .bd-kpi");
  if(nums.length>=3){
    nums[0].querySelector(".bd-kpi-num").textContent=total-feitos;
    nums[1].querySelector(".bd-kpi-num").textContent=itens.filter(d=>d.urg&&!d.feito).length;
    nums[2].querySelector(".bd-kpi-num").textContent=feitos;
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

/* =====================================================================
   AS DUAS FOLHAS (26/08) — pedido dela, com as palavras dela:

     "eu quero imprimir um relatório e marcar eu mesma o que o Sr. João já
      fez, à mão, pra mostrar pra empresa que as coisas estão sendo feitas"

   São duas leituras do mesmo trabalho, e cada uma serve a uma pessoa:

     SÓ O QUE FALTA     vai para a mão de quem executa. É a folha de sempre.
     TUDO, PARA MARCAR  vai para a empresa. Leva também o que já foi resolvido,
                        com os quadradinhos VAZIOS, e ela marca à mão.

   DUAS COISAS QUE NÃO PODEM MUDAR:

   1. Na folha de marcar, o quadradinho sai vazio MESMO no serviço já feito no
      site. Papel que chega marcado não prova serviço nenhum — quem marca é ela.
      Isto não altera o banco: o "feito" continua lá, intacto.

   2. A data de corte existe para a folha não mentir. Ela emite como se fosse do
      dia da entrega anterior; se levasse junto o que foi criado depois, a
      empresa veria coisas que naquele dia ainda não existiam, e a folha
      deixaria de provar o que ela quer provar.

   Antes isto só existia numa ferramenta minha, e ela dependia de eu gerar e
   subir o arquivo. Agora sai do próprio botão. Era esse o pedido: "dessa forma
   vai ficar salvo e você não vai mais precisar ficar colocando nada na nuvem".
   ===================================================================== */
let M28_SAIDA="imprimir";   /* "imprimir" (papel) ou "pdf": só muda o texto da janela da folha */
function m28Imprimir(saida){
  M28_SAIDA=saida==="pdf"?"pdf":(saida==="word"?"word":(saida==="wordimg"?"wordimg":"imprimir"));
  const todosIt=m28ItensDaFolha();
  const itens=todosIt.filter(d=>!m28AVerificar(d));   /* a janela promete o que a folha vai levar */
  const nVer=todosIt.length-itens.length;             /* os "a verificar": ela escolhe levar ou não */
  const faltam=itens.filter(d=>!d.feito).length;
  const feitos=itens.filter(d=>d.feito).length;
  /* nada resolvido ainda e nada a verificar: as duas folhas seriam iguais, então
     não há escolha a fazer e a janela só atrapalharia. É via de trabalho, então registra. */
  if(!feitos&&!nVer){m28GuardarEntrega({}).then(()=>m28ImprimirFolha({}));return;}

  const hoje=today();
  const emitido=(m28Cab(itens)||{}).emitidoEm||hoje;

  const m=document.createElement("div");
  m.className="bd-fundo";
  m.setAttribute("role","dialog");
  m.setAttribute("aria-modal","true");
  m.setAttribute("aria-label","Qual folha você quer");
  m.innerHTML=`<div class="bd-janela m28-escolha" onclick="event.stopPropagation()">
      <div class="bd-janela-topo"><div><b>Qual folha você quer?</b>
        <div class="m28-escolha-sub">${M28F.exec
          ? `Folha de <b>${esc(M28F.exec)}</b>${M28F.piso?` · ${esc(m28PisoBonito(M28F.piso))}`:""}`
          : `<b>Sem escolher a pessoa:</b> vai sair uma folha só, com o serviço de
             todo mundo misturado. Feche aqui e escolha o nome lá em cima.`}</div></div>
        <button class="bd-janela-x" aria-label="Fechar">✕</button></div>
      <div class="bd-janela-corpo">
        <button class="m28-opcao" data-modo="falta">
          <b>Só o que falta</b>
          <span>${faltam} ${faltam===1?"serviço":"serviços"} em aberto. É a folha de trabalho de quem executa.</span>
        </button>
        ${nVer?`<label class="m28-corte" style="display:flex;gap:10px;align-items:flex-start;min-height:44px">
          <input type="checkbox" id="m28-com-ver" style="width:auto;margin-top:4px">
          <span><b>Levar também ${nVer===1?"o 1 serviço":`os ${nVer} serviços`} com lembrete seu (verificar)</b><br>
            <span class="bd-ajuda">Sem marcar, ficam só na sua tela e não saem no papel.</span></span>
        </label>`:""}
        ${feitos?`<button class="m28-opcao" data-modo="marcar">
          <b>Tudo, para marcar à mão</b>
          <span>${itens.length} ${itens.length===1?"serviço":"serviços"}, com
            ${feitos===1?"o que já foi resolvido":`os ${feitos} que já foram resolvidos`}
            e os quadradinhos vazios. É a folha que mostra à empresa o que foi feito.</span>
        </button>`:""}
        <div class="m28-corte">
          <label class="bd-rotulo" for="m28-corte-data">Data desta folha</label>
          <input class="bd-campo" type="date" id="m28-corte-data" value="${esc(emitido)}" max="${esc(hoje)}">
          <span class="bd-ajuda">É o mês que sai no topo da folha. Na folha de marcar,
            o que foi registrado depois desta data também não entra — senão ela mostra
            à empresa coisas que naquele dia ainda não existiam.</span>
        </div>
      </div>
    </div>`;

  const focoAnterior=document.activeElement;
  const fechar=()=>{m.remove();document.removeEventListener("keydown",tecla);
    if(focoAnterior&&focoAnterior.focus)focoAnterior.focus();};
  const tecla=ev=>{
    if(ev.key==="Escape"){fechar();return;}
    if(ev.key!=="Tab")return;
    const focaveis=m.querySelectorAll("button, input");
    if(!focaveis.length)return;
    const primeiro=focaveis[0],ultimo=focaveis[focaveis.length-1];
    if(ev.shiftKey&&document.activeElement===primeiro){ev.preventDefault();ultimo.focus();}
    else if(!ev.shiftKey&&document.activeElement===ultimo){ev.preventDefault();primeiro.focus();}
  };
  m.onclick=fechar;
  m.querySelector(".bd-janela-x").onclick=fechar;
  m.querySelectorAll(".m28-opcao").forEach(b=>{
    b.onclick=()=>{
      const marcar=b.getAttribute("data-modo")==="marcar";
      const data=(m.querySelector("#m28-corte-data")||{}).value||"";
      const comVerificar=!!(m.querySelector("#m28-com-ver")||{}).checked;
      fechar();
      /* SÓ A VIA DE TRABALHO VIRA HISTÓRICO (28/08). A via "tudo, para marcar à
         mão" é a segunda cópia da mesma entrega, para a empresa: se registrasse
         também, a mesma folha apareceria duas vezes no histórico. */
      if(marcar){ m28ImprimirFolha({tudo:true,emBranco:true,corte:data,emitidoEm:data,comVerificar}); }
      else { m28GuardarEntrega({emitidoEm:data}).then(()=>m28ImprimirFolha({emitidoEm:data,comVerificar})); }
    };
  });
  document.addEventListener("keydown",tecla);
  document.body.appendChild(m);
  const primeiro=m.querySelector(".m28-opcao");if(primeiro)primeiro.focus();
}

/* QUEM VAI AO PAPEL — UM LUGAR SÓ (28/08).
   Este cálculo era feito dentro de m28ImprimirFolha. Agora o registro da folha
   entregue precisa da MESMA lista, e duas contas separadas para a mesma coisa
   já foi a origem de defeito aqui antes (o topo dizia 35, o papel trazia 17).
   Então quem monta o papel e quem guarda o histórico leem daqui. */
function m28LinhasDaFolha(op){
  op=op||{};
  let rows=m28ItensDaFolha();   /* pessoa, piso e area: a mesma conta da tela */
  /* os itens que ela marcou "Verificar" ficam na tela dela, mas NUNCA no papel
     do Sr. João -- são lembrete de conferir na loja, não serviço a entregar.
     Fora da folha de marcar também: naquela data ela ainda não os confirmou. */
  /* 01/10: ela escolhe na janela de imprimir se leva ou não os "a verificar"
     (lupa ou lembrete começando com VERIFICAR). Sem escolha, ficam de fora. */
  if(!op.comVerificar)rows=rows.filter(d=>!m28AVerificar(d));
  /* na folha de marcar, o que ela filtrou na tela não manda: a folha é a foto
     do trabalho inteiro naquela data, feito e não feito */
  if(!op.tudo){
    if(M28F.ver==="fazer")rows=rows.filter(d=>!d.feito);
    if(M28F.ver==="feitos")rows=rows.filter(d=>d.feito);
  }
  /* A DATA DE CORTE. Sem ela a folha "de julho" levaria o que foi registrado em
     agosto, e a empresa veria coisas que naquele dia ainda não existiam. */
  if(op.corte)rows=rows.filter(d=>{
    const quando=String(d.dataRegistro||d.relato||"").slice(0,10);
    return !quando||quando<=op.corte;
  });
  return rows.sort(m28Comparar);
}

/* IMPRIMIR/EXPORTAR (30/08): o mês já é o registro — não se cria mais uma
   folha nova a cada impressão. Só se atualiza a data e o corte do mês aberto,
   para o topo da folha impressa sair com o mês certo. */
async function m28GuardarEntrega(op){
  op=op||{};
  const f=M28_FOLHA_ABERTA&&m28AcharFolha(M28_FOLHA_ABERTA);
  if(!f||f.status!=="andamento")return;
  if(op.emitidoEm)f.emitidoEm=op.emitidoEm;
  if(op.corte!==undefined)f.corte=op.corte||"";
  f.mod=nowISO();
  await putItem(f);dataChanged();
}

function m28ImprimirFolha(op){
  op=op||{};
  let rows=m28LinhasDaFolha(op);
  if(!rows.length){alert("Nenhum serviço para imprimir com os filtros atuais.");return;}
  /* EM BRANCO: cópia com o quadradinho vazio, mesmo no que já está feito. Quem
     marca é ela, à mão — papel que chega marcado não prova serviço nenhum.
     É uma cópia: o "feito" continua intacto no banco. */
  if(op.emBranco)rows=rows.map(d=>Object.assign({},d,{feito:false}));
  /* RALOS (28/09): saem das areas e vao para a lista do fim. O cabecalho
     (mes, piso, data) continua olhando a folha INTEIRA. */
  const todas=rows, sep=m28SepararRalos(rows);
  rows=op.soRalos?[]:sep.manut;
  if(op.soRalos&&!sep.ralos.length){alert("Nenhum ralo nesta folha.");return;}

  const c=Object.assign({},m28Cab(todas),op.emitidoEm?{emitidoEm:op.emitidoEm}:{});
  const loja=(empresa(currentStore)||{}).name||currentStoreName||currentStore||"";
  /* LAY-3: com a folha filtrada por pessoa, quem manda no cabeçalho é ELA —
     imprimir a folha do Matheus com o nome do Sr. João no topo seria pior que
     não ter folha. Sem filtro, vale o que ela gravou no cabeçalho, como antes. */
  const exec=M28F.exec||c.executor||(todas.find(d=>d.executor)||{}).executor||"";
  /* cada area da lista de ralos conta como UMA demanda: e' uma caixinha a marcar */
  const urgentes=rows.filter(d=>d.urg&&!d.feito).length/* ralo nao conta urgente */;
  const totalDemandas=rows.length+sep.ralos.length;
  /* NADA de sufixo no titulo (26/08): "(para marcar)" era recado meu para ela
     nao trocar as duas vias, mas ia impresso no papel que a empresa le, e la
     nao quer dizer nada. Quem separa as duas e' o nome do arquivo. */
  const sufixo="";
  const rt=c.rt||RT_INFO||RT_DEFAULT, crn=c.crn||"";

  /* blocos soltos; quem monta as folhas é o paginador no fim do documento.
     CADA ÁREA VIRA UM BLOCO FECHADO (27/08). Ela viu numa página de comparação
     e escolheu a opção 1: borda fina e fundo branco, sem sombra (sombra vira
     mancha cinza no papel e gasta tinta), com a faixa verde cobrindo a linha
     inteira, inclusive a pastilha da contagem.
     A LISTA É NUMERADA e os títulos de coluna saíram: caixinha, número, texto.
     A numeração RECOMEÇA em cada área, como ela pediu. */
  const nArea={};for(const d of rows){const k=d.piso+"|"+d.area;nArea[k]=(nArea[k]||0)+1;}
  let blocos="",piso=null,area=null,nDemanda=0;
  for(const d of rows){
    if(d.piso!==piso){piso=d.piso;area=null;
      blocos+=`<div class="bl piso"><h2>${esc(piso||"Sem piso")}</h2></div>`;}
    if(d.area!==area){area=d.area;nDemanda=0;
      /* Pedido dela (17/09): o piso tambem aparece AQUI, na faixa de cada area --
         nao so uma vez no topo da secao. Assim nenhuma pagina fica sem dizer de
         qual piso e', mesmo que a area continue depois de uma quebra. */
      const pisoArea=m28PisoBonito(d.piso||"");
      blocos+=`<div class="bl ar" data-piso="${esc(pisoArea)}" data-area="${esc(area)}" data-n="${nArea[d.piso+"|"+d.area]}"><div class="ar-top"><span class="ar-e">${pisoArea?`<i class="ar-piso">${esc(pisoArea)}</i>`:""}${esc(area)}</span>`
        +`<b>${nArea[d.piso+"|"+d.area]} ${nArea[d.piso+"|"+d.area]===1?"serviço":"serviços"}</b></div>`
        +`<div class="ar-sub"><i class="qh">Data registrada</i></div></div>`;}
    nDemanda++;
    const meses=m28Meses(d.dataRegistro), tempo=m28TempoTexto(meses);
    const desde=d.dataRegistro
      ? `<b>${brDateCurta(d.dataRegistro)}</b>${tempo?`<i${meses>=1?' class="grave"':""}>${tempo}</i>`:""}` : "";
    /* LEG-1 (25/08): A NORMA NAO SAI MAIS NA FOLHA DE QUEM EXECUTA.
       Palavras dela: "isso aqui e pra o Sr. Joao, ele nao vai ficar lendo
       legislacao; legislacao quem tem que ler e gerencia e dono". A orientacao
       continua guardada no banco e continua saindo no relatorio da gerencia e
       na tela — some so daqui, da folha de marcar. */
    const ori="";
    /* O RECADO EMBAIXO DA DEMANDA, em pastilha (26/08).
       Ela desenhou isto na folha impressa: o lembrete saiu da coluna da direita
       e nasce debaixo da frase, comecando onde a frase comeca -- NUNCA debaixo
       do quadradinho de marcar, que foi o ponto que ela fez questao de marcar.
       Com a coluna a menos, a demanda ganhou a largura que faltava. */
    const recado=(d.obs||"").trim();
    blocos+=`<div class="bl li${d.urg?" urgl":""}" data-piso="${esc(m28PisoBonito(d.piso||""))}"><span class="c"><i class="bx">${d.feito?"✓":""}</i></span>`
      +`<span class="nm">${nDemanda}.</span>`
      +`<span class="f linhas">${esc(m28SemTravessao(d.fazer||""))}`
      +(ori?`<i class="ori-p">${esc(ori)}</i>`:"")
      +(recado?`<i class="obs-p linhas"><b>${esc(m28T().colObsImp)}</b>${esc(m28SemTravessao(recado))}${m28FotosFolha(d)}</i>`:m28FotosFolha(d))
      +`</span><span class="q">${desde}${d.urg?'<br><i class="ug">URGENTE</i>':""}</span></div>`;
  }
  /* O RASTREAMENTO DE RALOS (28/09) vem depois de todas as areas, em folha
     propria: explicacao uma vez so e, por piso, a lista numerada das areas. */
  if(sep.ralos.length){
    blocos+=`<div class="bl piso rl-cab"><h2>${esc(m28T().ralosTitulo||M28_TXT_PADRAO.ralosTitulo)}</h2>`
      +((m28T().ralosTexto||"").trim()?`<p class="rl-txt linhas">${esc(m28SemTravessao(m28T().ralosTexto.trim()))}</p>`:"")+`</div>`;
    let rp=null,nr=0;
    const porPiso={};for(const r of sep.ralos)porPiso[r.piso]=(porPiso[r.piso]||0)+1;
    for(const r of sep.ralos){
      const pb=m28PisoBonito(r.piso||"");
      if(r.piso!==rp){rp=r.piso;nr=0;
        blocos+=`<div class="bl ar rl" data-piso="${esc(pb)}"><div class="ar-top"><span class="ar-e">`
          +`<i class="ar-piso">${esc(pb||"Sem piso")}</i>Ralos</span>`
          +`<b>${porPiso[r.piso]} ${porPiso[r.piso]===1?"área":"áreas"}</b></div></div>`;}
      nr++;
      blocos+=`<div class="bl li rl" data-piso="${esc(pb)}"><span class="c"><i class="bx">${r.feito?"✓":""}</i></span>`
        +`<span class="nm">${nr}.</span><span class="f">${esc(r.area||"Sem área")}${m28FotosFolha({fotos:r.itens.flatMap(d=>d.fotos||[])})}</span><span class="q"></span></div>`;
    }
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
  /* cada pedaco leva o proprio nome de classe: marcar o mes pela POSICAO daria
     errado assim que a loja ou o piso viessem vazios e a faixa encurtasse */
  /* O PISO SAI DA FOLHA, NAO DO FILTRO (28/08). Antes vinha so de M28F.piso: se
     ela mandava imprimir sem ter escolhido o piso no seletor, a faixa e o topo
     das paginas seguintes saiam SEM o piso, mesmo com a folha inteira sendo de
     um piso so. Ela viu no papel: "mas cade o piso?". Agora, sem filtro, se
     todas as demandas forem do mesmo piso, e' esse o piso que sai. */
  const pisosNaFolha=[...new Set(todas.map(d=>(d.piso||"").trim()).filter(Boolean))]
    .sort(m28CmpPiso).map(x=>m28PisoBonito(x));
  /* O PISO NUNCA SOME (28/08). Palavras dela: "mesmo quando eu filtrar todas as
     areas para o PDF, ele precisa mostrar obrigatoriamente o piso". Sem filtro
     de piso, sai o piso que a folha realmente tem; com mais de um, saem os dois
     nomeados. O topo das paginas seguintes vai alem: mostra o piso DAQUELA
     pagina, escolhido pelo paginador. */
  const pisoDaFolha=(M28F.piso||"").trim()
    ? m28PisoBonito((M28F.piso||"").trim())
    : pisosNaFolha.join(" e ");
  const faixa=[["loja",m28T().rotLoja,(currentStore||"").trim()],
               ["piso",m28T().rotPiso,pisoDaFolha],
               ["mes", m28T().rotMes, m28Mes(c)]]
    .filter(x=>x[2])
    .map(x=>`<div class="${x[0]}"><span>${esc(x[1])}</span><b>${esc(x[2])}</b></div>`).join("");
  /* O TOPO DAS PAGINAS SEGUINTES (26/08) — opcao 1, escolhida por ela vendo as
     quatro em papel. Ela desenhou a mao na folha: tres caixas iguais com a loja,
     o piso e o mes. Motivo dela: "pra identificar rapido a empresa, piso e o mes
     que to avaliando e nao ficar retornando pra primeira pagina toda hora".
     So da SEGUNDA pagina em diante -- na primeira o cabecalho verde ja diz tudo. */
  const topoSeguintes=[[m28T().rotLoja,(currentStore||"").trim(),""],
                       [m28T().rotPiso,pisoDaFolha.toUpperCase(),"pp"],
                       [m28T().rotMes,m28Mes(c),""]]
    .filter(x=>x[1])
    .map(x=>`<div${x[2]?` class="${x[2]}"`:""}>${esc(x[1])}</div>`).join("");

  const ident=m28Identidade();
  const cabecalho=`<div class="capa">
      ${/* Pedido dela (17/09): titulo do cabecalho todo em maiusculo, junto com
           "e" -- "MANUTENCAO E INFRAESTRUTURA", nao mais "MANUTENCAO · Infraestrutura". */""}
      <div class="identidade"><b>${esc((ident.tipo+(ident.resto?" e "+ident.resto:"")).toUpperCase())}</b></div>
      ${faixa?`<div class="faixa">${faixa}</div>`:""}
      ${/* LINHA DE BAIXO, opcao B (27/08): duas colunas -- unidade e emissao numa
           linha, executor e responsavel tecnica na outra. Cada item com seu
           proprio espaco, sem disputar largura numa fileira so. */""}
      <div class="cpe">
        <div><span>${esc(m28T().rotUnidade)}</span><b>${esc(loja)}</b></div>
        ${/* DEFEITO CORRIGIDO (29/07): aqui estava brDate(today()) — a data que
             ela trocava pelo lápis aparecia certa na tela e voltava para a data
             de hoje na folha impressa. Agora a folha respeita o que ela editou. */""}
        ${/* Pedido dela (17/09): responsavel tecnica do lado de "Emitido em" na
             mesma fileira, entao os dois ficaram juntos no fim da grade. */""}
        ${/* Pedido dela (24/09): cabecalho mais compacto, numa fileira so --
             unidade a esquerda, responsavel tecnica no MEIO, emitido em a direita. */""}
        ${false&&exec?`<div><span>${esc(m28T().rotExec)}</span><b>${esc(m28NomeExec(exec))}</b></div>`:""}
        <div class="rt"><span>${esc(m28T().rotRt)}</span><b>${esc(m28RtNome(c))}</b><i>${esc(m28RtLinha(c))}</i></div>
        <div class="em"><span>${esc(m28T().rotEmitido)}</span><b>${brDate(c.emitidoEm||today())}</b></div>
      </div>
    </div>
    ${/* LAY-5 (25/08): na FOLHA IMPRESSA ficam so dois numeros, nesta ordem.
         Ela viu a redundancia: "demandas, ja nao seria a fazer?" — com nada
         feito os dois dao o mesmo numero, e total = a fazer + feitos. Quem conta
         os feitos e ela, no site, depois que ele devolve a folha marcada.
         Na TELA continuam os quatro. */""}
    ${/* A ORDEM DOS DOIS NUMEROS (28/09): DEMANDAS GERAIS a ESQUERDA, URGENTES a
         DIREITA. Regra dela, dita de novo vendo a folha de setembro: "demandas
         gerais lado esquerdo, urgente lado direito, pronto, e' isso".
         Substitui a ordem invertida de 26/08. Nao mexer sem pedido dela. */""}
    <div class="nums">
      <div class="num"><span>Demandas gerais</span><b>${totalDemandas}</b></div>
      <div class="num${urgentes?" urgente":""}"><span>Urgentes</span><b>${urgentes}</b></div>
    </div>`;
  const titulo="Manutenção e Infraestrutura — "+loja+sufixo;

  const w=window.open("");
  if(!w){alert("O navegador bloqueou a janela de impressão. Libere as janelas para este site e tente de novo.");return;}
  const ESTILO=`
  @page{size:A4;margin:0}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    color:#344054;font-size:13.2px;line-height:1.5;background:#e9ebee}
  .folha{width:210mm;height:297mm;background:#fff;margin:0 auto 14px;padding:11mm 12mm 15mm;
    position:relative;box-shadow:0 4px 18px rgba(16,24,40,.14);overflow:hidden}
  /* a folha que precisou crescer para nao engolir texto: sem altura fixa e sem
     corte. O rodape dela acompanha o fim do conteudo em vez de ficar preso. */
  .folha.solta{height:auto;min-height:297mm;overflow:visible}
  .folha.solta .pe{position:static;margin-top:12px}
  .topo{font-size:8.6px;color:#667085;border-bottom:1px solid #eaecf0;padding-bottom:5px;margin-bottom:9px}
  /* as tres caixas do alto das paginas 2 em diante */
  .topo2{display:flex;border:1px solid #cfd8d5;border-radius:5px;overflow:hidden;margin-bottom:10px}
  .topo2 div{flex:1;padding:5px 10px;border-right:1px solid #cfd8d5;text-align:center;
    font-size:12.3px;font-weight:700;color:#155244}
  .topo2 div:last-child{border-right:0}
  /* LAY-6 (26/08): o bloco verde continua -- o que mudou foi o tamanho de cada
     coisa dentro dele. Em cima o assunto e a faixa com loja, piso e mes; embaixo,
     em letra fina, quem executa, quem assina, a unidade e a data. */
  /* O FUNDO (26/08). Ela comparou os dois papeis: "o fundo do anterior tava bem
     mais bonito que o atual". O sólido de agora ficou chapado; o antigo tinha um
     degradê MUITO curto que dava profundidade. A diferença dos dois tons aqui é
     pequena de propósito: o degradê largo era justamente o que fazia a ponta
     direita sair lavada no papel. */
  .capa{background:${capaFundoFolha('linear-gradient(178deg,#14655d 0%,#1a7a70 60%,#1e8578 100%)')};color:#fff;
    padding:9px 14px;border-radius:8px;margin-bottom:9px;
    -webkit-print-color-adjust:exact;print-color-adjust:exact}
  /* IDENTIDADE C: uma frase so, "TIPO · resto do nome" -- ela escolheu vendo as
     opcoes em 27/08. O tipo vem em negrito e maiuscula; o resto, no peso normal
     do titulo, do mesmo tamanho, para nao competir visualmente. */
  .capa .identidade{font-size:20px;font-weight:600;letter-spacing:-.2px;line-height:1.15}
  .capa .identidade b{font-weight:800;letter-spacing:.3px}
  /* a faixa em tres partes iguais. Cada pedaco leva o NOME do que e' (Loja, Piso,
     Mes) porque no papel a posicao sozinha nao diz -- e ele recebe mais de uma
     folha no mesmo dia. */
  /* A FAIXA. Ela pediu "aquele fundinho claro, painel de vidro" e letras "mais
     vivas": os rotulos estavam em 66% de branco e sumiam no papel. Fundo mais
     presente e texto quase branco. */
  .capa .faixa{display:flex;margin-top:7px;border:1px solid rgba(255,255,255,.34);
    border-radius:6px;overflow:hidden;background:rgba(255,255,255,.14);
    -webkit-print-color-adjust:exact;print-color-adjust:exact}
  .capa .faixa div{flex:1;padding:5px 11px;border-right:1px solid rgba(255,255,255,.28);text-align:center}
  .capa .faixa div:last-child{border-right:0}
  .capa .faixa span{display:block;font-size:8px;text-transform:uppercase;letter-spacing:1px;
    color:rgba(255,255,255,.92);font-weight:600}
  .capa .faixa b{font-size:15.5px;font-weight:700;letter-spacing:.2px;color:#fff}
  /* O MES EM VERMELHO, pedido dela: "quero que todos os meses sejam da cor
     vermelha pra identificacao ser mais facil". Vermelho sobre o verde escuro
     seria ilegivel, entao a pastilha do mes ganha fundo claro e o vermelho vai
     no texto -- salta e continua legivel na fotocopia. */
  .capa .faixa .mes{background:#b42318;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .capa .faixa .mes span{color:rgba(255,255,255,.86)}
  .capa .faixa .mes b{color:#fff}
  /* a linha fina de baixo, ainda dentro do verde */
  /* LINHA DE BAIXO, opcao B: duas colunas -- unidade e emissao numa linha,
     executor e responsavel tecnica na outra. Ela achou a fileira unica
     "embolada"; cada dupla ganha a largura inteira da coluna dela agora. */
  /* 24/09: as tres numa fileira so (unidade | RT no meio | emitido a direita),
     pedido dela para o cabecalho ficar mais compacto. */
  .capa .cpe{display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px 16px;align-items:start;
    margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,.26);font-size:10.4px}
  .capa .cpe div{display:flex;flex-direction:column;gap:1px}
  .capa .cpe .rt{text-align:center;align-items:center}
  .capa .cpe .em{text-align:right;align-items:flex-end}
  .capa .cpe span{font-size:8.2px;text-transform:uppercase;letter-spacing:.9px;color:rgba(255,255,255,.82)}
  .capa .cpe b{font-weight:600;font-size:11.4px;color:#fff}
  .capa .cpe i{font-style:normal;font-size:9.2px;color:rgba(255,255,255,.88)}
  ${document.body.dataset.capa==="fluido"?`
  .capa{padding:11px 16px;border-radius:10px}
  .capa .identidade{font-size:17px;font-weight:700;letter-spacing:3.2px;line-height:1.2;text-shadow:0 1px 6px rgba(0,0,0,.4)}
  .capa .identidade b{font-weight:700;letter-spacing:3.2px}
  .capa .faixa{border-radius:8px;background:rgba(2,16,13,.38)}
  .capa .faixa .mes{background:linear-gradient(180deg,rgba(235,60,60,.55),rgba(185,28,28,.5));box-shadow:inset 0 1px 0 rgba(255,255,255,.35)}`:""}
  .nums{display:flex;gap:7px;margin-bottom:9px}
  .num{flex:1;border:1px solid #eaecf0;border-radius:7px;padding:5px 9px;background:#f9fafb;text-align:center}
  .num span{display:block;font-size:8.4px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;color:#667085}
  .num b{font-size:17px;color:#101828;font-variant-numeric:tabular-nums}
  h2{font-size:12.3px;font-weight:700;color:#0f5b52;text-transform:uppercase;letter-spacing:.6px;
    border-bottom:2px solid #1d6b57;padding-bottom:4px;margin:6px 0 2px}
  /* O BLOCO DA ÁREA (27/08) — opção 1 escolhida por ela em papel: borda fina,
     fundo branco, sem sombra. Sombra vira mancha cinza na impressão e gasta
     tinta; ela imprime colorido e são três páginas. */
  /* O ESPACO DE UMA AREA PARA OUTRA (28/09) -- pedido dela apontando o papel
     com o dedo: "esse espacinho ta muito justo, pode ficar um pouquinho maior,
     nao tem necessidade de ficar tao junto". Era 12px. Subiu para 20px (uns
     5mm), que e' o respiro que a folha antiga tinha. A primeira area da folha
     nao ganha esse espaco: ela encosta no cabecalho, como sempre. */
  .grupo{border:1px solid #d7dce2;border-radius:9px;overflow:hidden;margin-top:20px;background:#fff}
  .corpo>.grupo:first-child{margin-top:8px}
  /* a faixa verde cobre a LINHA INTEIRA, inclusive a pastilha da contagem:
     antes a pastilha ficava solta fora da faixa e ela pediu para entrar */
  /* A FAIXA NUMA FILEIRA SO, TUDO NO MEIO (28/09). Ela apontou no papel: o
     piso e a area ficavam grudados no alto da faixa verde, com um vazio
     embaixo (o rotulo "Data registrada" ocupava uma segunda linha so dele).
     Agora piso, area, contagem e o rotulo ficam na mesma linha, centralizados
     na altura da faixa. */
  .ar{display:flex;flex-direction:row;align-items:center;gap:10px;background:#e8f5f0;
    padding:6px 11px;font-size:12.8px;font-weight:700;
    color:#155244;border-bottom:1px solid #d7e6e0;
    -webkit-print-color-adjust:exact;print-color-adjust:exact}
  .ar .ar-top{flex:1;min-width:0;display:flex;justify-content:space-between;align-items:center;gap:8px}
  .ar b{font-weight:700;color:#155244;font-size:10.5px;
    background:#fff;border:1px solid #cfe5dd;border-radius:10px;padding:1px 8px;
    -webkit-print-color-adjust:exact;print-color-adjust:exact}
  /* a área que continua na página seguinte avisa, para ninguém achar que é outra */
  .ar i{font-style:normal;font-weight:400;font-size:9px;color:#4a6b62;margin-left:7px;
    text-transform:none;letter-spacing:0}
  /* O PISO NA PRÓPRIA FAIXA DA ÁREA (17/09) — pedido dela vendo a folha impressa:
     nao basta aparecer uma vez la em cima, tem que repetir aqui tambem. Pastilha
     pequena antes do nome da area, no mesmo tom verde do resto da faixa. */
  .ar .ar-piso{font-style:normal;font-weight:700;font-size:10.5px;color:#0f5b52;
    background:#fff;border:1px solid #cfe5dd;border-radius:10px;padding:1px 8px;
    margin-right:7px;text-transform:uppercase;letter-spacing:.4px;
    -webkit-print-color-adjust:exact;print-color-adjust:exact}
  /* O TÍTULO DA COLUNA DA DATA (ela aprovou 30/08, "numa linha só"): fica na faixa
     verde da área, à direita, junto da contagem. Some das outras colunas, que se
     explicam sozinhas (27/08); a data é a única que precisava dizer o que é.
     Está na faixa, então o paginador clona junto em toda página que a área ocupa. */
  /* O ROTULO "DATA REGISTRADA" EM CIMA DA PROPRIA COLUNA (28/09). Ela viu na
     folha de setembro: "essa data registrada ta horrorosa, parece tudo muito
     desconexo". O motivo: o rotulo ficava empurrado para a ponta pela pastilha
     de contagem, e as datas de baixo caiam mais para a esquerda -- cada um num
     lugar. Agora a pastilha fica colada no nome da area, e o rotulo ocupa a
     MESMA largura da coluna da data, centralizado igual a ela. */
  .ar .ar-e{flex:1;min-width:0;display:flex;align-items:center;gap:8px}
  .ar .ar-sub{margin:0;text-align:right;flex:none}
  .ar .ar-sub .qh{font-style:normal;font-weight:600;font-size:8.2px;margin:0;
    text-transform:uppercase;letter-spacing:.5px;color:#6b7b76;white-space:nowrap}
  /* LISTA NUMERADA, sem títulos de coluna (27/08): caixinha, número, texto, data.
     O número recomeça em cada área. */
  /* 28/09: a coluna era 142px e a pastilha longa ("1 ano e 7 meses") nao cabia
     ao lado da data -- saia espremida. Subiu para 160px, o mesmo numero do
     rotulo da faixa, para os dois ficarem na mesma prumada. */
  .li{display:grid;grid-template-columns:26px 20px 1fr 160px;gap:7px;padding:10px 11px}
  .li .c{text-align:center}
  .li .nm{font-weight:700;color:#475467;text-align:right;font-variant-numeric:tabular-nums;
    font-size:12px;padding-top:.5px}
  /* a coluna da data: a data e o tempo na MESMA linha, sempre (pedido dela
     29/08). Nada de "meses" quebrando para baixo. */
  .li .q{text-align:right;white-space:nowrap}  /* 28/09: "+ direita" (pedido dela) */
  /* A DIVISAO DE UM SERVICO PARA O OUTRO (28/09) -- pedido dela apontando o
     papel: "a divisao entre 1 servico e outro esta muito clara, a divisao entre
     as demandas esta quase invisivel". A linha era #f2f4f7, cinza quase branco:
     no papel sumia e os dois servicos da mesma area viravam um texto so. Agora
     usa o MESMO cinza da borda do bloco da area (#d7dce2), que ja esta aprovado
     no papel, com mais respiro em cima e embaixo (7px -> 10px). */
  .li{border-bottom:1px solid #c3ccd4;align-items:start;font-size:13.2px}
  .li:last-child{border-bottom:0}
  .li .o{color:#667085;font-size:12.2px}
  /* o recado (27/08): ela escolheu vendo em papel a opcao B -- so a palavra
     "Obs:" ganha a capsula cinza; a frase segue em texto normal, sem fundo,
     para poluir menos e ainda achar o recado de longe */
  /* 24/09: ela achou o Obs "embolado" e pediu letra MAIOR. A frase agora fica
     numa coluna propria ao lado da capsula "Obs:" -- a segunda linha nao volta
     mais para baixo da capsula, comeca alinhada com a primeira. */
  .li .obs-p{display:grid;grid-template-columns:auto 1fr;column-gap:8px;align-items:start;
    font-style:normal;font-size:12.4px;line-height:1.5;color:#344054;margin-top:6px}
  .li .obs-p b{font-weight:700;color:#344054;background:#eceff3;border-radius:5px;
    padding:1px 7px;font-size:10.8px;margin-top:1px;
    -webkit-print-color-adjust:exact;print-color-adjust:exact}
  /* o enter que ela deu vira quebra de linha de verdade, aqui e na tela */
  .li .linhas{white-space:pre-wrap}
  /* 24/09 (pedido dela: "fundo vermelho e poluicao visual"): o urgente nao
     pinta mais o numero nem a linha. So a palavra URGENTE marca. */
  /* a foto vai DENTRO da coluna do servico: nunca se separa dele na quebra */
  .li .fts{display:flex;gap:4px;margin-top:5px;flex-wrap:wrap;align-items:flex-start}
  /* a foto INTEIRA, nunca cortada (27/08): "object-fit:cover" recortava toda
     foto para um retangulo deitado -- as fotos dela sao em pe e sumia metade
     (o pedaco de madeira embaixo da lixeira, por exemplo). Agora cada foto
     entra inteira, dentro de uma caixa maxima, guardando a proporcao dela. */
  .li .fts img{max-width:54mm;max-height:48mm;width:auto;height:auto;object-fit:contain;
    border:1px solid #eaecf0;border-radius:3px;background:#f8fafc;
    -webkit-print-color-adjust:exact;print-color-adjust:exact}
  .li .fts i{font-style:normal;font-size:9px;color:#667085;align-self:flex-end}
  /* 01/10 (pedido dela): com Obs, a foto alinha no INICIO DO TEXTO da Obs (o
     hifen), nao na caixinha "Obs:". A foto entra na grade da Obs, 2a coluna.
     Sem Obs, continua alinhada ao texto do servico. */
  .li .obs-p .fts{grid-column:2;white-space:normal}
  .li .q{font-size:10.8px;color:#667085}
  .li .q b{display:inline;color:#344054;font-weight:600;font-variant-numeric:tabular-nums}
  /* o tempo de atraso vira PASTILHA, na MESMA linha da data (29/08). */
  .li .q i{font-style:normal;display:inline-block;font-size:8.6px;margin-left:5px;
    background:#f2f4f7;border-radius:99px;padding:1px 7px;
    -webkit-print-color-adjust:exact;print-color-adjust:exact}
  .li .q i.grave{background:#fef3f2;color:#b42318;font-weight:700}

  /* rastreamento de ralos: a explicacao, uma vez so, embaixo do titulo */
  .rl-cab .rl-txt{margin:6px 0 4px;padding:8px 11px;background:#f9fafb;border-left:3px solid #1d6b57;
    border-radius:0 6px 6px 0;font-size:12.4px;line-height:1.5;color:#344054;white-space:pre-line;
    -webkit-print-color-adjust:exact;print-color-adjust:exact}
  .li.rl{grid-template-columns:26px 20px 1fr;padding:8px 11px}
  .li.rl .q{display:none}
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
  /* A faixa vermelha entra como SOMBRA INTERNA, nao como borda. Borda ocupa
     espaco: com border-left + padding-left a linha urgente saia 1px fora do
     alinhamento das outras e do cabecalho da tabela. Sombra nao empurra nada. */
  /* 24/09: a linha urgente ficou igual as outras (sem fundo rosa e sem faixa) */
  /* o selo URGENTE: fundo cheio para saltar na folha de tres paginas. A PALAVRA
     continua escrita porque na fotocopia em preto e branco a cor nao existe. */
  .ug{display:inline-block;font-style:normal;font-weight:700;letter-spacing:.4px;
    background:#fff;color:#b42318;border:1px solid #b42318;border-radius:3px;padding:0 5px;margin-right:4px;
    font-size:8.6px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  /* 06/10 (pedido dela na folha impressa: "esse urgente antes do texto nao ta bom"):
     o selo saiu da frente do servico e foi para a coluna da data, embaixo dela.
     Assim todo servico comeca no mesmo alinhamento. */
  .li .q .ug{margin:5px 0 0;font-size:8.6px;font-weight:700;background:#fff;color:#b42318;
    border:1px solid #b42318;border-radius:3px;padding:0 5px}
  .bx{display:inline-block;width:12px;height:12px;border:1.4px solid #667085;border-radius:2px;
    line-height:10px;font-size:10px;color:#067647;font-weight:700;font-style:normal;text-align:center}
  .pe{position:absolute;left:12mm;right:12mm;bottom:6mm;display:flex;justify-content:flex-end;
    font-size:8.4px;color:#667085;border-top:1px solid #eaecf0;padding-top:5px}
  .pe .pag{font-variant-numeric:tabular-nums}
  .aviso{width:210mm;margin:14px auto;background:#fffaeb;border:1px solid #fedf89;color:#b54708;
    border-radius:8px;padding:12px 15px;font-size:12.5px;line-height:1.5}
  .aviso b{color:#93370d}
  .aviso.encolhi{background:#eff8ff;border-color:#b2ddff;color:#175cd3}
  .aviso.encolhi b{color:#194185}
  .aviso ul{margin:6px 0 6px 18px}
  .aviso li i{font-style:normal;color:#475467}
  .aviso button{margin-top:10px;padding:12px 18px;cursor:pointer;font-size:13.5px;border-radius:8px;
    border:0;background:#1d6b57;color:#fff;font-weight:600}
  @media print{.aviso{display:none}body{background:#fff}
    .folha{box-shadow:none;margin:0;break-after:page}.folha:last-child{break-after:auto}}`;

  /* O paginador: monta folha por folha, medindo, para a numeração ser NOSSA.
     Assim ela pode desligar o cabeçalho/rodapé do navegador (que traz a data,
     a hora e o "about:blank" que ela detesta) sem perder o número da página. */
  /* AS FOTOS PRECISAM ESTAR CARREGADAS ANTES DE MEDIR (27/08).
     A conta de "coube ou não coube" é feita medindo a altura de verdade. Uma
     foto que ainda não carregou ocupa altura zero: a demanda parecia caber, e
     a foto aparecia cortada na quebra da página. Aconteceu na folha dela.
     Então o paginador só começa depois que todas as imagens estão prontas.
     A foto NUNCA é encolhida para caber: regra fixa dela. */
  const PAGINADOR=`(function(){
    var alvo=document.getElementById("alvo");
    var caixa=document.createElement("div");
    caixa.innerHTML=window.__BLOCOS;
    var fila=Array.prototype.slice.call(caixa.children);
    var imgs=caixa.querySelectorAll("img");
    var faltam=0;
    for(var m=0;m<imgs.length;m++) if(!imgs[m].complete) faltam++;
    if(faltam){
      /* sem isto o navegador nem começa a baixar: a caixa está fora da página */
      caixa.style.cssText="position:absolute;left:-99999px;top:0;width:186mm";
      document.body.appendChild(caixa);
      var pronto=function(){ if(--faltam<=0){ caixa.remove(); montar(); } };
      for(var m2=0;m2<imgs.length;m2++) if(!imgs[m2].complete){
        imgs[m2].addEventListener("load",pronto);
        imgs[m2].addEventListener("error",pronto);
      }
      return;
    }
    montar();
    function montar(){
    function novaFolha(primeira){
      var f=document.createElement("div");
      f.className="folha";
      /* a 1a folha leva o cabecalho verde inteiro; as seguintes, so as tres
         caixas com loja, piso e mes -- para ela saber de qual folha e' sem
         voltar ao comeco */
      f.innerHTML=(primeira
          ? '<div class="topo">'+window.__TITULO+'</div>'+window.__CABECALHO
          : (window.__TOPO2 ? '<div class="topo2">'+window.__TOPO2+'</div>'
                            : '<div class="topo">'+window.__TITULO+'</div>'))
        +'<div class="corpo"></div>';
      alvo.appendChild(f);
      return f;
    }
    /* QUANTO O RODAPE OCUPA — MEDIDO, nao chutado (26/08).
       Aqui havia o numero 58, e ele nao dava conta: na pagina 2 da folha dela
       sobrava 17px, e o texto acabou impresso POR CIMA do rodape. Ela viu no
       papel e mandou consertar.
       O rodape e' position:absolute -- nao empurra nada, so cobre. Entao a conta
       tem de saber a altura dele de verdade. Ele so e' criado depois, na hora de
       numerar as paginas; por isso um de mentira e' medido antes e jogado fora. */
    var RESERVA=(function(){
      var f=document.createElement("div");
      f.className="folha";
      f.style.visibility="hidden";
      var pe=document.createElement("div");
      pe.className="pe";
      pe.innerHTML='<span>x</span><span>x</span><span>1 / 1</span>';
      f.appendChild(pe);
      alvo.appendChild(f);
      var ocupa=f.getBoundingClientRect().bottom-pe.getBoundingClientRect().top;
      f.remove();
      /* o que o rodape ocupa, MAIS UM DEDO DE FOLGA (40px, uns 10mm).
         Com respiro pequeno a conta fechava na tela e estourava no papel: o
         Chrome recompoe a fonte ao imprimir e uma linha a mais aparece do nada.
         Foi assim que o texto saiu por cima do rodape na folha dela. Uma linha
         a menos por pagina e' um preco barato perto de entregar papel ilegivel. */
      return Math.ceil(ocupa)+40;
    })();

    var folha=novaFolha(true), corpo=folha.querySelector(".corpo");
    function estourou(){
      var f=folha.getBoundingClientRect(), c=corpo.getBoundingClientRect();
      return (c.bottom-f.top) > (f.height-RESERVA);
    }

    /* O BURACO NO PE DA FOLHA (28/09). Regra NOVA dela, no lugar da antiga
       "a foto nunca e' encolhida". Vendo a folha de setembro impressa:
       "eu nao gosto quando fica sobrando espaco embaixo da folha... voce podia
       ter diminuido um pouco a foto e incluia na pagina 2. Ou voce ja ajusta e
       recorta um pouquinho a imagem pra caber. Mas sempre me avisa".
       Entao, antes de empurrar a demanda para a folha seguinte e deixar o vao,
       a foto dela tenta tres tamanhos menores. Se num deles a demanda couber,
       ela FICA nesta folha e o encolhimento vai para o aviso da tela.
       O limite e' 55% (a foto fica com uns 3cm de altura): no teste da folha
       de setembro a demanda da padaria so cabia na pagina 2 com 55%, e menor
       que isso a foto deixa de servir para o Sr. Joao reconhecer o lugar. */
    var ENCOLHIDAS=[];
    var FOTO_L=54, FOTO_A=48;                 /* o tamanho cheio, em mm */
    var ESCALAS=[0.88,0.80,0.70,0.62,0.55];
    function rotuloDe(el){
      var n=el.querySelector(".nm"), t=el.querySelector(".linhas");
      /* ARMADILHA do arquivo: aqui dentro e' uma template string. Uma barra
         invertida some antes de o navegador ler. Por isso nada de regex: o
         espaco em branco e' limpo na mao, letra por letra. */
      var cru=(t?t.textContent:el.textContent||""), txt="";
      for(var c=0;c<cru.length;c++){ var ch=cru.charAt(c); txt+=(ch<=" ")?" ":ch; }
      while(txt.indexOf("  ")>=0) txt=txt.split("  ").join(" ");
      txt=txt.replace(" ","")===""?"":txt;
      txt=txt.slice(0,200);
      while(txt.charAt(0)===" ") txt=txt.slice(1);
      while(txt.charAt(txt.length-1)===" ") txt=txt.slice(0,-1);
      if(txt.length>52) txt=txt.slice(0,52)+"...";
      return (n?n.textContent.trim()+" ":"")+txt;
    }
    function tentaEncolher(el){
      var ims=el.querySelectorAll(".fts img");
      if(!ims.length) return false;
      for(var e=0;e<ESCALAS.length;e++){
        for(var q=0;q<ims.length;q++){
          ims[q].style.maxWidth=(FOTO_L*ESCALAS[e]).toFixed(1)+"mm";
          ims[q].style.maxHeight=(FOTO_A*ESCALAS[e]).toFixed(1)+"mm";
        }
        if(!estourou()){
          ENCOLHIDAS.push({t:rotuloDe(el),p:Math.round((1-ESCALAS[e])*100)});
          return true;
        }
      }
      for(var r=0;r<ims.length;r++){ ims[r].style.maxWidth=""; ims[r].style.maxHeight=""; }
      return false;
    }

    /* CADA ÁREA É UM BLOCO FECHADO E NENHUMA DEMANDA PARTE NO MEIO (27/08).
       Palavras dela: "pode sim a área começar em uma parte e terminar em outra
       página; o que eu não quero é uma demanda começando em uma página e o
       resto ficar para a segunda".
       Então: a demanda entra dentro do grupo da área; se não coube, ela sai
       INTEIRA e recomeça na folha seguinte, dentro de uma cópia do mesmo
       cabeçalho de área, marcada como continuação. */
    var grupo=null, cabAtual=null;
    function abreGrupo(cabecalho,continuacao){
      grupo=document.createElement("div");
      grupo.className="grupo";
      var cab=cabecalho.cloneNode(true);
      if(continuacao){
        var marca=document.createElement("i");
        marca.textContent="continuação";
        /* logo depois do nome da area, antes da pastilha de contagem */
        var ae=cab.querySelector(".ar-e")||cab.querySelector("span");
        var pil=ae.querySelector("b");
        if(pil) ae.insertBefore(marca,pil); else ae.appendChild(marca);
      }
      grupo.appendChild(cab);
      corpo.appendChild(grupo);
      cabAtual=cabecalho;
      return grupo;
    }
    /* ARMADILHA (27/08): este bloco inteiro é uma template string do arquivo.
       Uma expressão como /\\bar\\b/ escrita aqui com uma barra só vira o
       caractere invisível de backspace antes de o navegador ler o código, e o
       teste nunca casa: TODA área era tratada como demanda e a folha saía com
       um bloco só. Aqui a comparação é feita pela lista de classes, sem regex. */
    function tem(cls,nome){ return (" "+cls+" ").indexOf(" "+nome+" ")>=0; }
    for(var i=0;i<fila.length;i++){
      var el=fila[i], cls=el.className||"";
      if(tem(cls,"piso")){
        grupo=null;cabAtual=null;
        /* CADA PISO COMECA EM FOLHA NOVA (pedido dela, 24/09: "quando imprimo 2
           pisos juntos precisa existir uma quebra; a diferenca e a numeracao
           unificada"). A numeracao das paginas continua de 1 ate o fim. */
        /* O BURACO ENTRE OS PISOS (06/10). Vendo a folha de outubro: "se ainda
           tiver um espaco grande entre 5 e 6 sobe uma demanda que couber pra nao
           ficar esse buraco". Entao a folha nova so vem quando o que sobra e'
           pouco; com espaco o piso seguinte comeca ali mesmo, com a faixa dele
           separando os dois. Se a primeira demanda do piso nao couber, a faixa
           desce junto com ela (nunca fica sozinha no pe da folha). */
        if(corpo.children.length){
          var fR=folha.getBoundingClientRect(), cR=corpo.getBoundingClientRect();
          var sobra=(fR.height-RESERVA)-(cR.bottom-fR.top);
          /* 06/10 (pedido dela): o rastreamento de ralos SEMPRE abre folha nova,
             separado de onde acabam as demandas do ultimo piso */
          if(sobra<fR.height*0.15 || tem(cls,"rl-cab")){ folha=novaFolha(false); corpo=folha.querySelector(".corpo"); }
        }
        corpo.appendChild(el);
        if(estourou()){
          corpo.removeChild(el);
          folha=novaFolha(false); corpo=folha.querySelector(".corpo");
          corpo.appendChild(el);
        }
        continue;
      }
      if(tem(cls,"ar")){ abreGrupo(el,false); continue; }
      /* uma demanda */
      if(!grupo) grupo=corpo.appendChild(document.createElement("div")),grupo.className="grupo";
      grupo.appendChild(el);
      /* nao coube: antes de deixar o vao, a foto tenta caber menor */
      if(estourou() && !tentaEncolher(el)){
        grupo.removeChild(el);
        /* o cabeçalho da área tinha acabado de entrar e nada coube: leva o
           grupo inteiro para a folha seguinte, em vez de deixar um cabeçalho
           órfão no pé da página */
        var soCabecalho = grupo.children.length<=1;
        if(soCabecalho && grupo.parentNode===corpo) corpo.removeChild(grupo);
        /* a faixa do piso nao fica sozinha no pe da folha: desce junto */
        var faixa=(soCabecalho && corpo.lastElementChild && tem(corpo.lastElementChild.className||"","piso"))
          ? corpo.removeChild(corpo.lastElementChild) : null;
        folha=novaFolha(false); corpo=folha.querySelector(".corpo");
        if(faixa) corpo.appendChild(faixa);
        if(soCabecalho){ corpo.appendChild(grupo); }
        else if(cabAtual){ abreGrupo(cabAtual,true); }
        else { grupo=corpo.appendChild(document.createElement("div")); grupo.className="grupo"; }
        grupo.appendChild(el);
        /* SE NEM SOZINHA A DEMANDA CABE, o texto NAO some (26/08).
           A folha tem altura fixa e overflow escondido; um servico com texto
           muito longo ou muitas fotos pode passar da folha inteira, e ai nao ha
           para onde empurrar -- o que sobra some sem aviso. Perder o alinhamento
           e' ruim; perder texto de uma folha que ela assina com o CRN e' pior.
           A foto NUNCA e' encolhida para caber: regra fixa dela. */
        if(estourou()){
          folha.classList.add("solta");
          folha=novaFolha(false); corpo=folha.querySelector(".corpo");
          grupo=cabAtual?abreGrupo(cabAtual,true):null;
        }
      }
    }
    /* grupo que ficou so com o cabecalho da area, sem nenhuma demanda dentro,
       nao vai para o papel: e' sobra do rearranjo, nao conteudo */
    var gs=alvo.querySelectorAll(".grupo");
    for(var g=gs.length-1;g>=0;g--) if(gs[g].children.length<=1) gs[g].remove();
    /* folha que sobrou vazia depois de uma solta nao vai para o papel */
    var vazias=alvo.querySelectorAll(".folha");
    for(var z=vazias.length-1;z>=0;z--){
      var c2=vazias[z].querySelector(".corpo");
      if(c2 && !c2.children.length) vazias[z].remove();
    }
    var folhas=alvo.querySelectorAll(".folha");
    for(var k=0;k<folhas.length;k++){
      var pe=document.createElement("div");
      pe.className="pe";
      /* so o numero da pagina, encostado a direita -- escolha dela: discreto e
         fora do caminho. O nome do relatorio ja esta no alto de toda pagina. */
      pe.innerHTML='<span class="pag">'+(k+1)+' / '+folhas.length+'</span>';
      folhas[k].appendChild(pe);
    }
    /* O PISO DA PAGINA (28/08). Com a folha de um piso so, todas as paginas
       dizem o mesmo. Com mais de um, cada pagina passa a dizer o piso que ELA
       traz, em vez de repetir "1o e 2o Piso" em todas: e' esse o motivo das
       tres caixas do alto, nao voltar a primeira pagina para saber onde esta. */
    var comTopo=alvo.querySelectorAll(".folha .topo2 .pp");
    for(var t=0;t<comTopo.length;t++){
      var f2=comTopo[t].closest(".folha");
      /* folha com dois pisos (06/10) diz os dois */
      var tds=f2?f2.querySelectorAll("[data-piso]"):[], vistos=[];
      for(var v=0;v<tds.length;v++){
        var pv=(tds[v].getAttribute("data-piso")||"").toUpperCase();
        if(pv && vistos.indexOf(pv)<0) vistos.push(pv);
      }
      if(vistos.length) comTopo[t].textContent=vistos.sort().join(" E ");
    }
    /* SEMPRE AVISAR (28/09): foto encolhida para caber aparece aqui, na tela,
       antes de ela imprimir. O aviso some no papel, igual o amarelo de cima. */
    if(ENCOLHIDAS.length){
      var av=document.createElement("div");
      av.className="aviso encolhi";
      var h='<b>Diminuí '+(ENCOLHIDAS.length===1?'uma foto':ENCOLHIDAS.length+' fotos')
        +' para não sobrar espaço vazio no fim da folha:</b><ul>';
      for(var a=0;a<ENCOLHIDAS.length;a++){
        var tx=ENCOLHIDAS[a].t.split("&").join("&amp;").split("<").join("&lt;");
        h+='<li>'+tx+' <i>(ficou '+ENCOLHIDAS[a].p+'% menor)</i></li>';
      }
      h+='</ul>Se preferir a foto no tamanho cheio, me avise.';
      av.innerHTML=h;
      alvo.parentNode.insertBefore(av,alvo);
    }
    document.body.setAttribute("data-folha-pronta","1");
    }
  })();`;

  const doc=w.document;
  doc.open();
  doc.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>'
    +esc(titulo)+'</title><style>'+ESTILO+'</style></head><body>'
    +'<div class="aviso">'+((M28_SAIDA==="word"||M28_SAIDA==="wordimg")
      ? '<b>Word:</b> a folha abaixo é a mesma do PDF. O download começa sozinho; se não começar, use o botão.<br>'
        +'<button onclick="baixarWord()">Baixar Word</button>'
      : '<b>Antes de '+(M28_SAIDA==="pdf"?'salvar em PDF':'imprimir')+':</b> na caixa que abrir, '
        +(M28_SAIDA==="pdf"?'em <b>Destino</b> escolha <b>Salvar como PDF</b>, depois ':'')
        +'abra <b>Mais definições</b> e <b>desmarque “Cabeçalhos e rodapés”</b>. '
        +'Isso tira a data, a hora e o “about:blank”. A numeração das páginas é nossa '
        +'e continua aparecendo embaixo.<br>'
        +'<button onclick="print()">'+(M28_SAIDA==="pdf"?'Salvar PDF':'Imprimir')+'</button> '
        +'<button onclick="baixarWord()" style="background:#fff;color:#1d6b57;border:1px solid #1d6b57">Baixar Word</button>')
    +'</div>'
    +'<div id="alvo"></div></body></html>');
  doc.close();
  /* passa os dados por variável (nada de montar script dentro de string) */
  w.__BLOCOS=blocos; w.__CABECALHO=cabecalho; w.__TITULO=titulo;
  w.__TOPO2=topoSeguintes;
  const s=doc.createElement("script");
  s.textContent=PAGINADOR;
  doc.body.appendChild(s);
  /* WORD: lê a folha já paginada (a mesma do PDF). Roda aqui, na janela da folha. */
  const nomeWord=m28NomeArquivo()+".docx";
  w.baixarWord=async function(){
    try{
      const blob=await m28DomParaDocx(w,M28_SAIDA==="wordimg");
      download(nomeWord,blob);
      toast("Word gerado ✓");
    }catch(e){ w.alert("Não consegui gerar o Word: "+(e&&e.message||e)); }
  };
  if(M28_SAIDA==="word"||M28_SAIDA==="wordimg"){
    const espera=setInterval(()=>{
      if(w.closed){clearInterval(espera);return;}
      if(w.document.body&&w.document.body.getAttribute("data-folha-pronta")==="1"){
        clearInterval(espera);w.baixarWord();
      }
    },300);
  }
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
  const ROTS={tipoRelatorio:"Tipo do relatório (folha impressa, na frente do título)",
    etiqueta:"Etiqueta pequena do topo",
    tituloPrefixo:"Começo do título (o mês entra sozinho depois)",
    rotExec:"Rótulo acima do responsável",
    /* colFeito e colFazer saíram da janela (27/08): os títulos de coluna não
       existem mais na tela nem na folha, então editá-los não mudaria nada. */
    colData:"Coluna: data",colObs:"Coluna: observações (na tela)",
    colObsImp:"Folha impressa: o que vem antes do recado",
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
    const el=document.getElementById("m28tx-"+k);
    /* campo que nao esta NESTA janela (ex.: os textos dos ralos, que moram no
       painel "Rastreamento ralos") guarda o que ja estava -- nunca apaga */
    if(!el){if(M28_TXT&&M28_TXT[k]&&M28_TXT[k]!==M28_TXT_PADRAO[k])novo[k]=M28_TXT[k];continue;}
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
/* seta desenhada (não letra): fica sempre no centro do quadrado; o CSS gira quando fecha */
const M28_CHEV='<svg class="m28-chev" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M3.5 6l4.5 4.5L12.5 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
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
