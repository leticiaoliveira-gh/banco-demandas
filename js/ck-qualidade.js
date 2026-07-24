/* ===== Aba QUALIDADE / BPF — checklist com dupla dimensão de escopo =====
   Diferente do checklist Infra2 (js/ck-modelo2.js): aqui cada pergunta tem DOIS
   escopos, um físico (área) e um comercial (setor: C&A, FLV, F&L, PAD, PEIX,
   ROT, Snack). Uma pergunta "Temperaturas do setor" com escopoP=loja e
   escopoS=setor gera 7 respostas — uma por setor da loja. Se for
   escopoS=setor + escopoP=ambiente, gera 7 × N áreas.

   TIPOS NO BANCO (paralelos a ckm/ckp, para não conflitar):
   - {tipo:"ckqm"} MODELO da inspeção (a lista de perguntas).
   - {tipo:"ckqp"} PREENCHIMENTO (uma inspeção feita a partir de um modelo).

   ⚠️ REGRA CRÍTICA (herdada do Infra2): respostas chaveadas por uid da
   pergunta E não por índice. A chave real é:
     uid                 → escopoS=loja e escopoP=loja
     uid@Setor           → escopoS=setor e escopoP=loja
     uid@Area            → escopoS=loja e escopoP=ambiente/tipo:X
     uid@Setor|Area      → escopoS=setor e escopoP=ambiente/tipo:X
*/

/* ---------- SETORES POR GRUPO (a pessoa edita pela tela) ---------- */
const CKQ_SETORES_PADRAO=[
  {chave:"CA",  rotulo:"Consumo & Atendimento", cor:"#1668b8", fundo:"#e7f0f9"},
  {chave:"FLV", rotulo:"Hortifrúti (FLV)",      cor:"#047857", fundo:"#d1fae5"},
  {chave:"FL",  rotulo:"Frios & Laticínios",    cor:"#8a6d3b", fundo:"#f5ecd7"},
  {chave:"PAD", rotulo:"Padaria",               cor:"#b3730a", fundo:"#fdf0e0"},
  {chave:"PEIX",rotulo:"Peixaria",              cor:"#2b7bb0", fundo:"#dbeaf3"},
  {chave:"ROT", rotulo:"Rotisserie",            cor:"#a23bb0", fundo:"#f6ecf8"},
  {chave:"SNK", rotulo:"Snack",                 cor:"#7c3aed", fundo:"#f1ebfd"}
];
let CKQ_SETORES_ALL={},CKQ_SETORES_MOD="";
async function ckqCarregarSetores(){
  CKQ_SETORES_ALL={};CKQ_SETORES_MOD=await metaGet("ckqSetoresMod")||"";
  const emps=(typeof EMPRESAS!=="undefined"?EMPRESAS:[])||[];
  for(const e of emps){
    const g=grupoDe(e.code)||e.code;
    if(CKQ_SETORES_ALL[g])continue;
    const v=await metaGet("ckqSetores_"+g);
    CKQ_SETORES_ALL[g]=Array.isArray(v)&&v.length?v:[...CKQ_SETORES_PADRAO];
  }
}
function ckqSetores(){
  const g=grupoDe(currentStore)||currentStore;
  return CKQ_SETORES_ALL[g]||[...CKQ_SETORES_PADRAO];
}
async function ckqSalvarSetores(lista){
  const g=grupoDe(currentStore)||currentStore;if(!g)return;
  CKQ_SETORES_ALL[g]=lista;CKQ_SETORES_MOD=nowISO();
  await metaSetU("ckqSetores_"+g,lista);
  await metaSetU("ckqSetoresMod",CKQ_SETORES_MOD);dataChanged();
}
function ckqSetorRot(k){const s=ckqSetores().find(x=>x.chave===k);return s?s.rotulo:k;}

/* ---------- LEITURA DE ITENS ---------- */
function ckqLojaBase(){const g=grupoDe(currentStore);return g||currentStore;}
function ckqModelos(){
  const base=ckqLojaBase();
  return DATA.filter(d=>!d.deleted&&d.tipo==="ckqm"&&d.loja===base&&(!d.escopo||d.escopo===currentStore))
             .sort((a,b)=>(a.ordem??1e9)-(b.ordem??1e9)||String(a.titulo||"").localeCompare(String(b.titulo||"")));
}
function ckqPreenchimentos(status){
  return DATA.filter(d=>!d.deleted&&d.tipo==="ckqp"&&d.loja===currentStore&&(!status||d.status===status))
             .sort((a,b)=>String(b.atualizacao||b.criadoEm||"").localeCompare(String(a.atualizacao||a.criadoEm||"")));
}
function ckqAchar(uid){return DATA.find(d=>d.uid===uid&&!d.deleted);}
function ckqPerguntas(m){return (m.perguntas||[]).filter(p=>!p.removida)
                                .sort((a,b)=>(a.ordem??1e9)-(b.ordem??1e9));}
async function ckqSalvar(d){d.mod=nowISO();await putItem(d);dataChanged();}

/* ---------- ESCOPOS ---------- */
function ckqSetoresDaPergunta(q){
  const s=(q.escopoS||"").trim();
  if(!s||s==="loja")return null;                       /* uma vez, na loja inteira */
  if(s==="setor")return ckqSetores().map(x=>x.chave);
  if(s.startsWith("setor:")){
    const alvo=new Set(s.slice(6).split(",").map(x=>x.trim()).filter(Boolean));
    return ckqSetores().map(x=>x.chave).filter(k=>alvo.has(k));
  }
  return null;
}
function ckqAreasDaPergunta(q,p){
  const e=(q.escopoP||"").trim();
  if(!e||e==="loja")return [""];
  const areas=(p&&p.areas)||[];
  if(e==="ambiente")return areas;
  if(e.startsWith("tipo:")){
    const alvo=e.slice(5);
    const tipoDa=(typeof ckTipoDaArea==="function")?ckTipoDaArea:(()=>"apoio");
    return areas.filter(a=>tipoDa(a)===alvo);
  }
  return [""];
}
function ckqChave(q,area,setor){
  const a=area||"",s=setor||"";
  if(!a&&!s)return q.uid;
  if(!a)return q.uid+"@"+s;
  if(!s)return q.uid+"@"+a;
  return q.uid+"@"+s+"|"+a;
}
function ckqExpandir(m,p){
  const out=[];
  for(const q of ckqPerguntas(m)){
    const setores=ckqSetoresDaPergunta(q);   /* null = sem dimensão setor */
    const areas=ckqAreasDaPergunta(q,p);     /* [""] = sem dimensão área */
    if(setores===null){
      for(const a of areas)out.push({q,setor:"",area:a,chave:ckqChave(q,a,"")});
    }else{
      for(const s of setores)for(const a of areas)
        out.push({q,setor:s,area:a,chave:ckqChave(q,a,s)});
    }
  }
  return out;
}
function ckqPerguntaFoiRespondida(uid,modeloUid){
  const pref=uid+"@";
  return DATA.some(d=>!d.deleted&&d.tipo==="ckqp"&&d.modeloUid===modeloUid&&
    Object.keys(d.respostas||{}).some(k=>k===uid||k.startsWith(pref)));
}

/* ---------- 12 MODELOS PRONTOS (perguntas REAIS das planilhas dela — v9.8) ---------- */
/* Cada pergunta: [titulo, descricao, secao, escopoP, escopoS, tipoResp, coment, foto, peso, escopoDest, acaoPadrao, baseLegal] */
const CKQ_TODOS_SETORES="setor";
const CKQ_PACOTES=[
  /* Fonte: check-list-acougue.doc / Modelo de Checklist AÇOUGUE.pdf (25 atividades, sim/não) */
  {chave:"acougue", titulo:"Açougue / Peixaria / Frios (ronda diária)", descricao:"Ronda rápida por setor de proteína.", cor:"#2b7bb0",
   perguntas:[
    ["Metas de vendas","O setor está na meta? O encarregado domina o assunto?","Gestão","loja","setor:CA,PEIX,FL","simnao","opcional","nao",1,"nc","Alinhar metas com o encarregado",""],
    ["Conferência e variedade dos produtos","Identificação das rupturas e providências tomadas; cortes.","Gestão","loja","setor:CA,PEIX,FL","simnao","inconforme","nao",2,"nc","Identificar rupturas e tomar providências",""],
    ["Qualidade dos produtos","Todos os produtos com total qualidade?","Qualidade","loja","setor:CA,PEIX,FL","simnao","inconforme","opcional",3,"nc","Retirar produtos sem qualidade da venda","RDC 216/2004 4.9"],
    ["Datas de validade","Todas as normas de validade são respeitadas? Produtos vencidos são retirados? É feito PVPS?","Validades","loja","setor:CA,PEIX,FL","simnao","inconforme","obrigatoria",3,"nc","Retirar vencidos; aplicar PVPS","RDC 216/2004 4.9"],
    ["Balcão de atendimento","Balcão limpo, abastecido, organizado, produtos precificados e atendente presente?","Atendimento","loja","setor:CA,PEIX,FL","simnao","inconforme","opcional",2,"nc","Limpar, abastecer e organizar o balcão",""],
    ["Tabela de preços","Localização, apresentação, visibilidade e preços corretos.","Precificação","loja","setor:CA,PEIX,FL","simnao","inconforme","nao",1,"nc","Corrigir e reposicionar tabela",""],
    ["Cartazes promocionais","Terminais, pontos extras e promoções estão com cartaz?","Precificação","loja","setor:CA,PEIX,FL","simnao","opcional","nao",1,"nc","Repor cartazes",""],
    ["Mercadorias em oferta","Produtos anunciados estão destacados e sinalizados?","Precificação","loja","setor:CA,PEIX,FL","simnao","opcional","nao",1,"nc","Destacar e sinalizar ofertas",""],
    ["Higiene da área de vendas","Higiene total nos balcões, gôndolas, ilhas, paredes, teto, equipamentos e produtos?","Higiene","loja","setor:CA,PEIX,FL","simnao","inconforme","opcional",3,"nc","Solicitar higienização completa","RDC 216/2004 4.3"],
    ["Balanças","Balanças limpas e conferidas diariamente? Estão corretas? Taras aplicadas corretamente?","Equipamentos","loja","setor:CA,PEIX,FL","simnao","inconforme","opcional",2,"mnt","Higienizar e aferir balanças",""],
    ["Atendimento","Presença, cortesia e rapidez.","Atendimento","loja","setor:CA,PEIX,FL","simnao","opcional","nao",1,"nc","Reforçar padrão de atendimento",""],
    ["Apresentação da equipe","Uniformes e aparência pessoal, higiene, luvas de aço, máscara, botas e adornos.","Manipuladores","loja","setor:CA,PEIX,FL","simnao","inconforme","opcional",3,"nc","Reforçar padrão de uniforme e EPI","RDC 216/2004 4.6"],
    ["Temperatura de balcões, câmaras e produtos","Balcões, ilhas, câmaras e produtos com suas temperaturas ideais? São conferidas diariamente?","Temperaturas","loja","setor:CA,PEIX,FL","simnao","inconforme","opcional",3,"mnt","Registrar leitura; acionar refrigeração","RDC 216/2004 4.8"],
    ["Câmaras","Limpeza e organização?","Câmaras","loja","setor:CA,PEIX,FL","simnao","inconforme","opcional",2,"nc","Limpar e organizar a câmara",""],
    ["Laboratório","Equipamento estéril, organização, higiene, utensílios e limpeza dos ossos.","Higiene","loja","setor:CA,PEIX,FL","simnao","inconforme","opcional",3,"nc","Higienizar equipamentos e utensílios","RDC 216/2004 4.3"],
    ["Precificação","Todos os produtos estão precificados e com preços corretos?","Precificação","loja","setor:CA,PEIX,FL","simnao","inconforme","nao",1,"nc","Corrigir precificação",""],
    ["Recepção de mercadorias","Acompanhamento do encarregado; procedimentos seguidos.","Recebimento","loja","setor:CA,PEIX,FL","simnao","inconforme","nao",2,"nc","Retomar acompanhamento do recebimento",""],
    ["P.O.P.","São seguidos todos os procedimentos operacionais padrão?","Documentos","loja","setor:CA,PEIX,FL","simnao","inconforme","nao",2,"nc","Retreinar equipe nos POPs","RDC 216/2004 4.11"],
    ["Produtos avariados","Amassados, sujos e deteriorados são retirados e sinalizados?","Avarias","loja","setor:CA,PEIX,FL","simnao","inconforme","opcional",3,"nc","Retirar e sinalizar avariados","RDC 216/2004 4.9"],
    ["Altura de exposição de congelados","Produtos congelados estão expostos dentro da altura limitada?","Exposição","loja","setor:CA,PEIX,FL","simnao","inconforme","opcional",2,"nc","Reduzir altura de exposição",""],
    ["Volumes de estoques","Estoques controlados? Câmaras sem superlotação? Respeitada a circulação de ar frio?","Câmaras","loja","setor:CA,PEIX,FL","simnao","inconforme","opcional",2,"nc","Reduzir volume; liberar circulação de ar",""],
    ["Trocas e avarias","Organizadas, sinalizadas, separadas e com volume controlado? São lançadas diariamente?","Avarias","loja","setor:CA,PEIX,FL","simnao","inconforme","opcional",2,"nc","Organizar, sinalizar e lançar avarias",""],
    ["Normas de armazenagem","São respeitadas todas as normas de armazenagem?","Armazenamento","loja","setor:CA,PEIX,FL","simnao","inconforme","opcional",2,"nc","Adequar armazenagem às normas","RDC 216/2004 4.7"],
    ["Produtos manipulados","Todos os produtos manipulados e processados/fracionados estão identificados e com data de validade?","Identificação","loja","setor:CA,PEIX,FL","simnao","inconforme","opcional",3,"nc","Etiquetar produtos manipulados","RDC 216/2004 4.8"],
    ["Lixeiras","Lixeiras com tampa e pedal? Sem acúmulo de lixo? Horário do procedimento de saída é respeitado?","Resíduos","loja","setor:CA,PEIX,FL","simnao","inconforme","opcional",2,"nc","Adequar lixeiras e rotina de descarte","RDC 216/2004 4.5"],
    ["Data da ronda",null,"Encerramento","loja","loja","data","nao","nao",0,"","",""],
    ["Assinatura do encarregado",null,"Encerramento","loja","loja","assinatura","nao","nao",0,"","",""],
    ["Assinatura do gerente da loja",null,"Encerramento","loja","loja","assinatura","nao","nao",0,"","",""]
  ]},
  /* Fonte: Checklist BPF Cabo Frio (seções Câmara Resfriada/Congelada) + Modelos do que incluir (armazenamento itens 1-3; descongelamento 13-14) */
  {chave:"camaras", titulo:"Armazenamento e Câmaras Frias (ronda diária)", descricao:"Estado das câmaras e armazenamento.", cor:"#1668b8",
   perguntas:[
    ["A área é mantida limpa e organizada?",null,"Higiene","tipo:camara","loja","simnao","inconforme","opcional",3,"nc","Limpar e organizar a câmara","RDC 216/2004 4.1"],
    ["Área mantida livre de focos de insalubridade, objetos em desuso ou estranhos ao ambiente?","Papelão, chapatex, produtos de limpeza, caixas vazias e itens pessoais não podem ficar na câmara.","Higiene","tipo:camara","loja","simnao","inconforme","opcional",3,"nc","Retirar objetos estranhos ao ambiente","RDC 216/2004 4.1"],
    ["Os equipamentos são mantidos limpos?","Evaporadores sem acúmulo de mofo.","Equipamentos","tipo:camara","loja","simnao","inconforme","opcional",2,"mnt","Higienizar; acionar manutenção se necessário",""],
    ["O empilhamento é mantido de acordo com as especificações do fornecedor?","Sem superlotação; paletes e produtos afastados de piso e paredes.","Armazenamento","tipo:camara","loja","simnao","inconforme","opcional",2,"nc","Reorganizar o empilhamento","RDC 216/2004 4.7"],
    ["Os produtos são acondicionados de forma correta, minimizando o risco de contaminação?",null,"Armazenamento","tipo:camara","loja","simnao","inconforme","opcional",3,"nc","Acondicionar corretamente; treinar equipe","RDC 216/2004 4.7"],
    ["Não foi encontrado produto impróprio ao consumo e/ou vencido mantido sem identificação?",null,"Validades","tipo:camara","loja","simnao","inconforme","obrigatoria",3,"nc","Segregar e identificar produto impróprio","RDC 216/2004 4.9"],
    ["Não foi encontrado produto sem identificação?","Etiqueta com designação do produto, data de fracionamento e prazo de validade.","Identificação","tipo:camara","loja","simnao","inconforme","opcional",3,"nc","Etiquetar produtos","RDC 216/2004 4.8"],
    ["Não foi encontrado produto com identificação incorreta?",null,"Identificação","tipo:camara","loja","simnao","inconforme","opcional",2,"nc","Corrigir identificação","RDC 216/2004 4.8"],
    ["Os produtos em processo de descongelamento são mantidos identificados?","Descongelamento sob refrigeração inferior a 5 °C; descongelados mantidos refrigerados quando não utilizados imediatamente.","Identificação","tipo:camara","loja","simnao","inconforme","opcional",3,"nc","Identificar produtos em degelo","RDC 216/2004 4.8"],
    ["Os alimentos armazenados estão protegidos contra contaminantes?",null,"Armazenamento","tipo:camara","loja","simnao","inconforme","opcional",3,"nc","Cobrir e proteger os alimentos","RDC 216/2004 4.8"],
    ["O armazenamento ocorre em condições de tempo e temperatura que garantem a qualidade higiênico-sanitária?","Refrigerados ≤ 5 °C; congelados ≤ -18 °C; termômetro em funcionamento.","Temperaturas","tipo:camara","loja","simnao","inconforme","opcional",3,"mnt","Registrar leitura; acionar refrigeração","RDC 216/2004 4.8"],
    ["Data da ronda",null,"Encerramento","loja","loja","data","nao","nao",0,"","",""],
    ["Assinatura do responsável",null,"Encerramento","loja","loja","assinatura","nao","nao",0,"","",""]
  ]},
  /* Fonte: Checklist BPF Cabo Frio (Área de Vendas 3.3-3.6; Mercearia 6.5) + Modelos do que incluir (preparo 6, 18, 19) + check-list-acougue (itens 4, 19, 24) */
  {chave:"validades", titulo:"Controle de Validades e FIFO (ronda diária)", descricao:"Passagem por setor conferindo prazos.", cor:"#e5484d",
   perguntas:[
    ["Não foi encontrado produto impróprio ao consumo e/ou vencido?",null,"Validades","loja",CKQ_TODOS_SETORES,"simnao","inconforme","obrigatoria",3,"nc","Recolher; segregar; retirar da venda","RDC 216/2004 4.9"],
    ["É evidenciada a prática de PVPS (primeiro que vence, primeiro que sai)?",null,"PVPS","loja",CKQ_TODOS_SETORES,"simnao","inconforme","opcional",2,"nc","Reorganizar por validade",""],
    ["Não foi encontrado produto sem identificação?",null,"Identificação","loja",CKQ_TODOS_SETORES,"simnao","inconforme","opcional",3,"nc","Etiquetar produtos","RDC 216/2004 4.8"],
    ["Não foi encontrado produto com identificação incorreta?",null,"Identificação","loja",CKQ_TODOS_SETORES,"simnao","inconforme","opcional",2,"nc","Corrigir identificação","RDC 216/2004 4.8"],
    ["Os ingredientes não utilizados em sua totalidade estão armazenados e identificados?","Etiqueta com designação do produto, data de fracionamento e prazo de validade após abertura da embalagem.","Identificação","loja",CKQ_TODOS_SETORES,"simnao","inconforme","opcional",2,"nc","Etiquetar fracionados e abertos","RDC 216/2004 4.8"],
    ["O alimento preparado sob refrigeração ou congelamento está identificado com data de preparo e prazo de validade?","Refrigerado a 4 °C ou inferior: consumo em no máximo 5 dias.","Identificação","loja","setor:PAD,ROT,SNK","simnao","inconforme","opcional",3,"nc","Etiquetar; descartar fora do prazo","RDC 216/2004 4.8"],
    ["Produtos avariados (amassados, sujos, deteriorados) são retirados e sinalizados?",null,"Avarias","loja",CKQ_TODOS_SETORES,"simnao","inconforme","opcional",2,"nc","Retirar da venda e sinalizar","RDC 216/2004 4.9"],
    ["Data da ronda",null,"Encerramento","loja","loja","data","nao","nao",0,"","",""],
    ["Assinatura do responsável",null,"Encerramento","loja","loja","assinatura","nao","nao",0,"","",""]
  ]},
  /* Fonte: Check List Semanal de gestão do setor (Prevenção/gestor) + Relatório Higiênico Sanitário Mensal (lixeiras, utensílios e produtos de limpeza) */
  {chave:"higiene", titulo:"Higiene e Limpeza por Setor (semanal)", descricao:"Estado geral de higiene por setor.", cor:"#047857",
   perguntas:[
    ["Higiene na área de vendas","Piso, parede, balcões, equipamentos e vidros.","Higiene","loja",CKQ_TODOS_SETORES,"simnao","inconforme","opcional",3,"nc","Solicitar higienização completa","RDC 216/2004 4.3"],
    ["Câmaras e balcões: organização e higiene",null,"Higiene","loja",CKQ_TODOS_SETORES,"simnao","inconforme","opcional",3,"nc","Limpar e organizar câmaras e balcões",""],
    ["Sala de manipulação: organização, limpeza e higiene",null,"Higiene","loja",CKQ_TODOS_SETORES,"simnao","inconforme","opcional",3,"nc","Limpar e organizar a sala de manipulação","RDC 216/2004 4.3"],
    ["Balanças: calibração e higiene",null,"Equipamentos","loja",CKQ_TODOS_SETORES,"simnao","inconforme","opcional",2,"mnt","Higienizar e aferir balanças",""],
    ["As lixeiras são mantidas com saco plástico adequado, tampa com acionamento por pedal e sem excesso de detritos?",null,"Resíduos","loja",CKQ_TODOS_SETORES,"simnao","inconforme","opcional",2,"nc","Adequar lixeiras e rotina de descarte","RDC 216/2004 4.5"],
    ["Os utensílios de limpeza são constituídos por material lavável e higienizável e são armazenados de forma correta?",null,"Utensílios","loja",CKQ_TODOS_SETORES,"simnao","inconforme","opcional",2,"nc","Substituir/reorganizar utensílios de limpeza","RDC 275/2002"],
    ["Os produtos de higienização possuem registro em órgãos competentes, são homologados e utilizados adequadamente?",null,"Produtos","loja",CKQ_TODOS_SETORES,"simnao","inconforme","opcional",2,"nc","Substituir por produto homologado","RDC 216/2004 4.3"],
    ["Data da ronda",null,"Encerramento","loja","loja","data","nao","nao",0,"","",""]
  ]},
  /* Fonte: Checklist Operacional Hortifruti (SafetyCulture) + pt-checklist-para-supermercados (aba Hortifrúti) */
  {chave:"hortifruti", titulo:"Hortifruti (ronda diária)", descricao:"Especificidades do FLV.", cor:"#047857",
   perguntas:[
    ["Bancadas e equipamentos limpos e com manutenção adequada à venda de produtos frescos?",null,"Organização","loja","setor:FLV","simnao","inconforme","opcional",3,"nc","Higienizar bancadas e equipamentos","RDC 216/2004 4.3"],
    ["Todo FLV recebido é 100% pesado (conferido em balança no ato do recebimento)?","Pesagens registradas em planilha ou sistema para posterior análise.","Recebimento","loja","setor:FLV","simnao","inconforme","nao",2,"nc","Retomar pesagem e registro no recebimento",""],
    ["É feita pré-seleção dos produtos antes de irem para a área de vendas?","Danificados, amassados ou deteriorados não devem ficar expostos.","Seleção","loja","setor:FLV","simnao","inconforme","opcional",3,"nc","Separar impróprios antes da exposição","RDC 216/2004 4.9"],
    ["Os produtos expostos estão livres de deteriorados ou impróprios para consumo?",null,"Seleção","loja","setor:FLV","simnao","inconforme","obrigatoria",3,"nc","Retirar da exposição","RDC 216/2004 4.9"],
    ["Expositores, vascas e geladeiras bem abastecidos, livres de rupturas?","Na reposição, verdes colocados embaixo dos maduros.","Exposição","loja","setor:FLV","simnao","inconforme","opcional",2,"nc","Abastecer e repassar os produtos",""],
    ["Nenhum produto armazenado ou exposto em contato direto com o chão?",null,"Exposição","loja","setor:FLV","simnao","inconforme","opcional",3,"nc","Elevar do piso","RDC 216/2004 4.7"],
    ["Suportes de saquinhos plásticos existentes e abastecidos em todas as vascas e pontos de venda?","Embalagens descartáveis armazenadas e agrupadas em local apropriado.","Exposição","loja","setor:FLV","simnao","opcional","nao",1,"nc","Abastecer suportes; guardar embalagens",""],
    ["Existe área definida e sinalizada para armazenamento de quebras?","Produtos impróprios identificados e separados dos demais.","Quebras","loja","setor:FLV","simnao","inconforme","opcional",2,"nc","Sinalizar e segregar área de quebra",""],
    ["Balanças funcionando corretamente, com etiqueta do Inmetro e lacre?","Balança e resiniteira higienizadas, livres de sujidades.","Equipamentos","loja","setor:FLV","simnao","inconforme","opcional",2,"mnt","Aferir e higienizar; acionar assistência",""],
    ["As armadilhas de moscas estão funcionando?",null,"Pragas","loja","setor:FLV","simnao","inconforme","opcional",2,"mnt","Trocar placas; acionar controle de pragas","RDC 216/2004 4.1"],
    ["Câmara fria organizada: bom empilhamento, respeitando distâncias de parede e altura mínima do chão?","Produtos a no mínimo 10 cm do chão, 10 cm entre si e 10 cm das paredes.","Câmara","loja","setor:FLV","simnao","inconforme","opcional",2,"nc","Reorganizar a câmara","RDC 216/2004 4.7"],
    ["Câmara fria higienizada: paredes e chão limpos e livres de sujidades?","Higienização constante com solução clorada.","Câmara","loja","setor:FLV","simnao","inconforme","opcional",3,"nc","Higienizar a câmara","RDC 216/2004 4.3"],
    ["Todos os produtos têm preços visíveis e estão identificados?",null,"Precificação","loja","setor:FLV","simnao","opcional","nao",1,"nc","Repor etiquetas e preços",""],
    ["Data da ronda",null,"Encerramento","loja","loja","data","nao","nao",0,"","",""],
    ["Assinatura do responsável",null,"Encerramento","loja","loja","assinatura","nao","nao",0,"","",""]
  ]},
  /* Fonte: Modelos do que incluir no checklist (RDC 216 — preparo do alimento, itens 6-21) */
  {chave:"padrot", titulo:"Padaria / Rotisserie (ronda diária)", descricao:"Setores de manipulação e produção pronta.", cor:"#b3730a",
   perguntas:[
    ["Antes de preparar os alimentos, as embalagens primárias são limpas adequadamente?",null,"Preparo","loja","setor:PAD,ROT","simnao","inconforme","opcional",2,"nc","Higienizar embalagens antes do preparo","RDC 216/2004 4.8"],
    ["O tratamento térmico garante que todas as partes do alimento atinjam 70 °C?","Eficácia avaliada pela verificação de temperatura, tempo e aspecto do alimento.","Preparo","loja","setor:PAD,ROT","simnao","inconforme","opcional",3,"nc","Rever tempo/temperatura de cocção","RDC 216/2004 4.8"],
    ["Óleos e gorduras de fritura não ultrapassam 180 °C e são substituídos quando há alteração evidente?",null,"Preparo","loja","setor:PAD,ROT","simnao","inconforme","opcional",3,"nc","Substituir óleo; ajustar temperatura","RDC 216/2004 4.8"],
    ["O descongelamento é realizado sob refrigeração inferior a 5 °C ou em forno micro-ondas?","Alimentos descongelados mantidos sob refrigeração quando não utilizados imediatamente.","Preparo","loja","setor:PAD,ROT","simnao","inconforme","opcional",3,"nc","Corrigir método de descongelamento","RDC 216/2004 4.8"],
    ["Após a cocção, os alimentos quentes são conservados acima de 60 °C por no máximo 6 horas?",null,"Temperaturas","loja","setor:PAD,ROT","simnao","inconforme","opcional",3,"mnt","Ajustar equipamento; descartar fora do padrão","RDC 216/2004 4.8"],
    ["O resfriamento do alimento preparado é feito de 60 °C a 10 °C em até duas horas?","Em seguida conservado abaixo de 5 °C ou congelado a -18 °C ou inferior.","Temperaturas","loja","setor:PAD,ROT","simnao","inconforme","opcional",3,"nc","Rever processo de resfriamento","RDC 216/2004 4.8"],
    ["O alimento preparado refrigerado a 4 °C ou inferior respeita o prazo máximo de 5 dias?",null,"Validades","loja","setor:PAD,ROT","simnao","inconforme","opcional",3,"nc","Descartar fora do prazo","RDC 216/2004 4.8"],
    ["O alimento preparado e armazenado está identificado com data de preparo e prazo de validade?",null,"Identificação","loja","setor:PAD,ROT","simnao","inconforme","opcional",3,"nc","Etiquetar produção","RDC 216/2004 4.8"],
    ["Os ingredientes não utilizados em sua totalidade são armazenados e identificados?","Designação do produto, data de fracionamento e prazo de validade após abertura.","Identificação","loja","setor:PAD,ROT","simnao","inconforme","opcional",2,"nc","Etiquetar fracionados","RDC 216/2004 4.8"],
    ["Os alimentos consumidos crus são higienizados com produtos regularizados pelo Ministério da Saúde?",null,"Higiene","loja","setor:PAD,ROT","simnao","inconforme","opcional",3,"nc","Adequar higienização de hortifrútis","RDC 216/2004 4.8"],
    ["O estabelecimento mantém documentado o controle e a garantia da qualidade dos alimentos preparados?",null,"Documentos","loja","setor:PAD,ROT","simnao","inconforme","nao",2,"nc","Retomar registros de controle","RDC 216/2004 4.8"],
    ["Data da ronda",null,"Encerramento","loja","loja","data","nao","nao",0,"","",""]
  ]},
  /* Fonte: Checklist SegAlim - Boas Práticas Loja Cabo Frio 16.01.2023 (85 perguntas, 15 seções × 7 ambientes) */
  {chave:"bpf", titulo:"BPF Semanal (Boas Práticas — Semanal)", descricao:"Auto-inspeção semanal por área.", cor:"#7c3aed",
   perguntas:[
    /* Por área (recorrentes nas seções 1, 2, 4, 5 e 8) */
    ["A área é mantida limpa e organizada?",null,"Área","ambiente","loja","simnao","inconforme","opcional",3,"nc","Limpar e organizar a área","RDC 216/2004 4.1"],
    ["Área mantida livre de focos de insalubridade, objetos em desuso ou estranhos ao ambiente?",null,"Área","ambiente","loja","simnao","inconforme","opcional",3,"nc","Retirar objetos em desuso","RDC 216/2004 4.1"],
    ["As lixeiras são mantidas fechadas e sem excesso de detritos?",null,"Área","ambiente","loja","simnao","inconforme","opcional",2,"nc","Esvaziar e fechar lixeiras","RDC 216/2004 4.5"],
    ["Os equipamentos são mantidos limpos e passam por higienização ao término das atividades?",null,"Equipamentos","ambiente","loja","simnao","inconforme","opcional",3,"nc","Higienizar equipamentos","RDC 216/2004 4.3"],
    ["Os utensílios são de material lavável e higienizável, mantidos limpos e armazenados corretamente?",null,"Equipamentos","ambiente","loja","simnao","inconforme","opcional",2,"nc","Substituir/higienizar utensílios","RDC 275/2002 2.2"],
    ["Não foi encontrado produto impróprio ao consumo e/ou vencido mantido sem identificação?",null,"Produtos","ambiente","loja","simnao","inconforme","obrigatoria",3,"nc","Segregar e identificar; retirar da venda","RDC 216/2004 4.9"],
    ["Não foi encontrado produto sem identificação ou com identificação incorreta?",null,"Produtos","ambiente","loja","simnao","inconforme","opcional",3,"nc","Etiquetar/corrigir identificação","RDC 216/2004 4.8"],
    ["Os produtos são acondicionados de forma correta, minimizando o risco de contaminação?","Sem empilhamento excessivo e/ou obstrução da refrigeração.","Produtos","ambiente","loja","simnao","inconforme","opcional",3,"nc","Corrigir acondicionamento","RDC 216/2004 4.7"],
    ["Funcionários realizam a higienização adequada das mãos e seguem as normas de asseio pessoal?",null,"Manipuladores","ambiente","loja","simnao","inconforme","opcional",3,"nc","Reforçar higienização e asseio","RDC 216/2004 4.6"],
    ["Funcionários utilizam uniformes adequados, limpos, contentor de cabelo e luvas descartáveis?",null,"Manipuladores","ambiente","loja","simnao","inconforme","opcional",3,"nc","Reforçar padrão de uniforme","RDC 216/2004 4.6"],
    ["As práticas de manipulação são adequadas e não colocam em risco a integridade dos produtos?",null,"Manipuladores","ambiente","loja","simnao","inconforme","opcional",3,"nc","Corrigir práticas; treinar","RDC 216/2004 4.11"],
    /* Câmaras */
    ["O empilhamento nas câmaras é mantido de acordo com as especificações do fornecedor?",null,"Câmaras","tipo:camara","loja","simnao","inconforme","opcional",2,"nc","Reorganizar o empilhamento","RDC 216/2004 4.7"],
    ["Os produtos em processo de descongelamento são mantidos identificados?",null,"Câmaras","tipo:camara","loja","simnao","inconforme","opcional",3,"nc","Identificar produtos em degelo","RDC 216/2004 4.8"],
    /* Lixo / área externa */
    ["O local de armazenamento do lixo é mantido fechado, sem excesso de detritos, e o lixo só fica no local apropriado?",null,"Resíduos","tipo:residuo","loja","simnao","inconforme","opcional",3,"nc","Adequar área de lixo","RDC 216/2004 4.5"],
    /* Sanitários e vestiários */
    ["Instalação sanitária limpa, organizada e dotada de produtos de higiene pessoal conforme legislação?",null,"Sanitários","tipo:sanitario","loja","simnao","inconforme","opcional",3,"nc","Repor produtos; higienizar","RDC 275/2002 1.14"],
    /* Loja inteira */
    ["Os EPIs estão em bom estado de conservação e limpeza?",null,"EPI","loja","loja","simnao","inconforme","opcional",2,"nc","Substituir EPIs danificados","RDC 216/2004 4.6"],
    ["Os utensílios de limpeza são laváveis e os produtos de higienização possuem registro e são homologados?",null,"Domissanitários","loja","loja","simnao","inconforme","opcional",2,"nc","Substituir por produto homologado","RDC 216/2004 4.3"],
    ["Não há evidência de pragas e/ou vestígios?",null,"Pragas","loja","loja","simnao","inconforme","obrigatoria",3,"nc","Acionar controle integrado de pragas","RDC 216/2004 4.1"],
    ["Data da inspeção",null,"Encerramento","loja","loja","data","nao","nao",0,"","",""],
    ["Assinatura da RT",null,"Encerramento","loja","loja","assinatura","nao","nao",0,"","",""]
  ]},
  /* Fonte: Checklist - Equipamentos e Utensílios (planilha trimestral; áreas 1-5 avaliadas por setor C&A...Snack; áreas 6-11 sim/não) */
  {chave:"equip", titulo:"Equipamentos e Utensílios (trimestral)", descricao:"Estado dos equipamentos por área.", cor:"#8a6d3b",
   perguntas:[
    ["Equipamentos concebidos de material lavável e higienizável e mantidos em bom estado de conservação?","Avaliar manipulação, atendimento e vendas do setor.","Áreas do setor","loja",CKQ_TODOS_SETORES,"simnao","inconforme","opcional",3,"mnt","Reparar ou substituir","RDC 275/2002 2.1"],
    ["Equipamentos dispostos de forma a permitir fácil acesso e higienização adequada?",null,"Áreas do setor","loja",CKQ_TODOS_SETORES,"simnao","inconforme","opcional",2,"nc","Reposicionar equipamentos","RDC 275/2002 2.1"],
    ["Equipamentos de conservação de alimentos frios e quentes possuem medidor de temperatura em local apropriado e em adequado funcionamento?",null,"Áreas do setor","loja",CKQ_TODOS_SETORES,"simnao","inconforme","opcional",3,"mnt","Instalar/substituir medidor","RDC 216/2004 4.8"],
    ["Câmara: equipamentos de material lavável, em bom estado e dispostos para fácil higienização?",null,"Câmaras","tipo:camara","loja","simnao","inconforme","opcional",3,"mnt","Reparar ou substituir","RDC 275/2002 2.1"],
    ["Câmara: medidor de temperatura localizado em local apropriado e em adequado funcionamento?",null,"Câmaras","tipo:camara","loja","simnao","inconforme","opcional",3,"mnt","Instalar/substituir termômetro","RDC 216/2004 4.8"],
    ["IPC: quando houver área específica, os equipamentos são mantidos limpos?",null,"Produtos Impróprios (IPC)","loja","loja","simnao","inconforme","opcional",2,"nc","Higienizar área de IPC",""],
    ["Fundo de loja: equipamentos em bom estado e dispostos para fácil acesso e limpeza?",null,"Fundo de Loja","loja","loja","simnao","inconforme","opcional",2,"mnt","Reparar/reorganizar",""],
    ["Área externa / plataforma de recebimento / lixo: equipamentos em bom estado e de fácil limpeza?",null,"Área Externa","loja","loja","simnao","inconforme","opcional",2,"mnt","Reparar/reorganizar",""],
    ["Sanitários: presença de lixeiras com tampa e acionamento por pedal, mantidas fechadas e sem excesso de detritos?","Vale para sanitários de funcionários e de clientes.","Sanitários","tipo:sanitario","loja","simnao","inconforme","opcional",2,"nc","Adequar lixeiras","RDC 275/2002 1.14"],
    ["Vestiários com armários e chuveiros em número suficiente para a quantidade de funcionários?",null,"Vestiários","loja","loja","simnao","inconforme","nao",2,"mnt","Providenciar armários/chuveiros","RDC 275/2002 1.15"],
    ["Data da inspeção",null,"Encerramento","loja","loja","data","nao","nao",0,"","",""],
    ["Assinatura da RT",null,"Encerramento","loja","loja","assinatura","nao","nao",0,"","",""]
  ]},
  /* Fonte: Checklist - Estrutura Organizacional (planilha trimestral; áreas 1-5 por setor; áreas 6-11 sim/não) */
  {chave:"estr", titulo:"Estrutura (trimestral)", descricao:"Estado da estrutura física por área.", cor:"#2b7bb0",
   perguntas:[
    ["Estrutura construída dentro das exigências descritas nas legislações vigentes?",null,"Estrutura","ambiente","loja","simnao","inconforme","opcional",3,"mnt","Adequar à legislação","RDC 275/2002 1.1"],
    ["Estrutura mantida em bom estado de conservação?",null,"Estrutura","ambiente","loja","simnao","inconforme","opcional",3,"mnt","Reparar","RDC 275/2002 1.1"],
    ["O local dispõe de iluminação suficiente e as lâmpadas são mantidas protegidas?",null,"Estrutura","ambiente","loja","simnao","inconforme","opcional",2,"mnt","Trocar lâmpada / instalar proteção","RDC 275/2002 1.9"],
    ["Sistema de exaustão e/ou insuflamento com troca de ar capaz de prevenir contaminações?",null,"Estrutura","ambiente","loja","simnao","inconforme","opcional",2,"mnt","Ajustar ventilação/exaustão","RDC 275/2002 1.10"],
    ["Área externa: pátio com superfície dura ou pavimentada, adequada ao trânsito sobre rodas, com escoamento adequado e limpa?","Existência de barreira física da área externa para a área interna.","Área Externa","loja","loja","simnao","inconforme","opcional",2,"mnt","Adequar pátio/barreira física","RDC 275/2002 1.1"],
    ["Sanitários: instalação suficiente para o número de funcionários, independentes por sexo, identificados e de uso exclusivo dos manipuladores?",null,"Sanitários","tipo:sanitario","loja","simnao","inconforme","nao",2,"mnt","Adequar instalações sanitárias","RDC 275/2002 1.14"],
    ["Sanitários: portas com fechamento automático?",null,"Sanitários","tipo:sanitario","loja","simnao","inconforme","opcional",2,"mnt","Instalar mola/fechamento automático","RDC 275/2002 1.14"],
    ["Sanitários e vestiários mantidos em bom estado de conservação?",null,"Sanitários","tipo:sanitario","loja","simnao","inconforme","opcional",2,"mnt","Reparar","RDC 275/2002 1.15"],
    ["Data da inspeção",null,"Encerramento","loja","loja","data","nao","nao",0,"","",""],
    ["Assinatura da RT",null,"Encerramento","loja","loja","assinatura","nao","nao",0,"","",""]
  ]},
  /* Fonte: Relatório Higiênico Sanitário Mensal (escala B/R/I/NV; requisitos recorrentes por área avaliada) */
  {chave:"rhs", titulo:"RHS Mensal (SEGA) — Higiênico-Sanitário", descricao:"Auto-inspeção mensal por área com escala B/R/I/NV.", cor:"#8a6d3b",
   perguntas:[
    ["A estrutura é mantida limpa?",null,"Estrutura","ambiente","loja","nota4","inconforme","opcional",3,"nc","Higienizar","RDC 275/2002 1.1"],
    ["A estrutura é mantida em bom estado de conservação?",null,"Estrutura","ambiente","loja","nota4","inconforme","opcional",3,"mnt","Reparar","RDC 275/2002 1.1"],
    ["Local mantido organizado?",null,"Organização","ambiente","loja","nota4","inconforme","opcional",2,"nc","Reorganizar",""],
    ["Ausência de produtos não pertinentes à área (sucatas, equipamentos em desuso e objetos pessoais)?",null,"Organização","ambiente","loja","nota4","inconforme","opcional",2,"nc","Retirar itens não pertinentes","RDC 216/2004 4.1"],
    ["Não há evidência de pragas e/ou vestígios?",null,"Pragas","ambiente","loja","nota4","inconforme","opcional",3,"nc","Acionar controle integrado de pragas","RDC 216/2004 4.1"],
    ["Os equipamentos são mantidos sem resíduos?",null,"Equipamentos","ambiente","loja","nota4","inconforme","opcional",3,"nc","Higienizar equipamentos","RDC 216/2004 4.3"],
    ["Equipamentos concebidos de material lavável e higienizável e mantidos em bom estado de conservação?",null,"Equipamentos","ambiente","loja","nota4","inconforme","opcional",3,"mnt","Reparar/substituir","RDC 275/2002 2.1"],
    ["As lixeiras estão disponíveis, com saco plástico adequado, tampa com pedal e mantidas fechadas?",null,"Resíduos","ambiente","loja","nota4","inconforme","opcional",2,"nc","Adequar lixeiras","RDC 216/2004 4.5"],
    ["O local dispõe de iluminação suficiente e as lâmpadas são mantidas protegidas?",null,"Estrutura","ambiente","loja","nota4","inconforme","nao",2,"mnt","Trocar lâmpada / instalar proteção","RDC 275/2002 1.9"],
    ["Na amostragem realizada não foi encontrado produto impróprio ao consumo e/ou vencido sem identificação?",null,"Produtos","ambiente","loja","nota4","inconforme","opcional",3,"nc","Segregar e identificar; retirar da venda","RDC 216/2004 4.9"],
    ["Não há produtos mantidos diretamente no piso e/ou encostados na parede?",null,"Produtos","ambiente","loja","nota4","inconforme","opcional",2,"nc","Elevar e afastar produtos","RDC 216/2004 4.7"],
    ["Os EPIs estão disponíveis, em bom estado e são utilizados adequadamente (considerar luva de limpeza)?",null,"Manipuladores","ambiente","loja","nota4","inconforme","opcional",2,"nc","Repor/substituir EPIs","RDC 216/2004 4.6"],
    ["Asseio pessoal: funcionários sem barba, maquiagem, adornos e unhas compridas/com esmalte; uniformes adequados; contentor de cabelo, máscara e luvas usados adequadamente?",null,"Manipuladores","ambiente","loja","nota4","inconforme","opcional",3,"nc","Reforçar padrão de asseio e uniforme","RDC 216/2004 4.6"],
    ["Data da inspeção",null,"Encerramento","loja","loja","data","nao","nao",0,"","",""],
    ["Assinatura da RT",null,"Encerramento","loja","loja","assinatura","nao","nao",0,"","",""]
  ]},
  /* Fonte: VT AC - ABRIL e VT CF - Dezembro (Visita Técnica mensal: não conformidades por setor com responsável Gerência/Compras/Manutenção/Elétrica) */
  {chave:"cip", titulo:"CIP / Visita Técnica (mensal)", descricao:"Registro da visita da manutenção refrigeração.", cor:"#1668b8",
   perguntas:[
    ["Realizado por","Nome de quem realizou a visita técnica.","Registro","loja","loja","texto","opcional","nao",0,"","",""],
    ["Data da visita",null,"Registro","loja","loja","data","opcional","nao",0,"","",""],
    ["Limpeza e organização em dia (Gerência)?","Sem acúmulo de papelão, chapatex, lixo, caixas vazias ou itens de limpeza fora do lugar; bancadas e balcões limpos.","Limpeza e Organização","ambiente","loja","simnao","inconforme","obrigatoria",3,"nc","Registrar não conformidade e prazo com a gerência","RDC 216/2004 4.1"],
    ["Sem pendências de manutenção e infraestrutura (João)?","Piso, rodapés, portas, pintura/ferrugem, telas de ralo, vazamentos.","Manutenção","ambiente","loja","simnao","inconforme","obrigatoria",3,"mnt","Registrar não conformidade e prazo com a manutenção","RDC 275/2002 1.1"],
    ["Sem pendências elétricas (Matheus)?","Lâmpadas queimadas, fiação exposta, tomadas, disjuntores sinalizados.","Elétrica","ambiente","loja","simnao","inconforme","opcional",3,"mnt","Registrar não conformidade e prazo com a elétrica",""],
    ["Sem compras pendentes para o ambiente (Compras)?","Bandejas, borrachas de freezer, guarda-corpo, utensílios e equipamentos a substituir.","Compras","ambiente","loja","simnao","inconforme","opcional",2,"mnt","Registrar solicitação de compra",""],
    ["Produtos do ambiente identificados (inclusive itens em degelo)?",null,"Produtos","ambiente","loja","simnao","inconforme","opcional",3,"nc","Identificar produtos","RDC 216/2004 4.8"],
    ["Não conformidades encontradas","Descrever cada não conformidade, o responsável (Gerência/Compras/Manutenção/Elétrica) e a data registrada.","Registro","loja","loja","texto","opcional","nao",0,"","",""],
    ["Assinatura da RT",null,"Encerramento","loja","loja","assinatura","nao","nao",0,"","",""]
  ]},
  /* Fonte: Check List de Prevenção (atualizado) — CHECK LIST SEMANAL por seção (Hortifruti, Açougue, Industrializados, Padaria, Frios) */
  {chave:"perdas", titulo:"Prevenção de Perdas (semanal)", descricao:"Vencimentos, quebras e avarias por setor.", cor:"#e5484d",
   perguntas:[
    ["Metas / planejamento","O encarregado faz o acompanhamento da seção?","Gestão","loja",CKQ_TODOS_SETORES,"simnao","opcional","nao",1,"nc","Retomar acompanhamento da seção",""],
    ["Conferências e variedades de produtos","Identificação de rupturas e providências a serem tomadas.","Gestão","loja",CKQ_TODOS_SETORES,"simnao","inconforme","nao",2,"nc","Identificar rupturas e providenciar reposição",""],
    ["Qualidade dos produtos","Frescor, apresentação etc.","Qualidade","loja",CKQ_TODOS_SETORES,"simnao","inconforme","opcional",3,"nc","Retirar produtos sem qualidade","RDC 216/2004 4.9"],
    ["Data de validade: conferência diária realizada?",null,"Vencimentos","loja",CKQ_TODOS_SETORES,"simnao","inconforme","obrigatoria",3,"nc","Conferir validades; retirar vencidos","RDC 216/2004 4.9"],
    ["Padrão dos embalados","Variedade, higiene, apresentação e precificação.","Qualidade","loja",CKQ_TODOS_SETORES,"simnao","inconforme","opcional",2,"nc","Adequar padrão dos embalados",""],
    ["Temperatura dos balcões (congelados/resfriados) dentro do padrão?","Resfriados 0 a 2 °C; congelados -15 a -18 °C.","Temperaturas","loja",CKQ_TODOS_SETORES,"simnao","inconforme","opcional",3,"mnt","Registrar leitura; acionar refrigeração","RDC 216/2004 4.8"],
    ["Estoques (depósito): volume, layout, organização e limpeza adequados?",null,"Estoques","loja","loja","simnao","inconforme","opcional",2,"nc","Reorganizar depósito",""],
    ["Recebimento: acompanhamento das mercadorias pelo encarregado?",null,"Recebimento","loja","loja","simnao","inconforme","nao",2,"nc","Retomar acompanhamento do recebimento",""],
    ["Quebras: organização de avarias dos setores em dia?","Avarias separadas, sinalizadas e lançadas.","Quebras","loja","loja","simnao","inconforme","opcional",2,"nc","Organizar e lançar avarias",""],
    ["Data da ronda",null,"Encerramento","loja","loja","data","nao","nao",0,"","",""]
  ]}
];


/* MIGRAÇÃO v9.8 (23/07): os 12 modelos prontos foram reescritos com as perguntas
   REAIS das planilhas dela (Missão 1 do status.json). Modelos já semeados no banco
   com o texto inventado são atualizados AQUI — só os que nunca foram respondidos
   (preenchimento existente = histórico dela, não se toca). Idempotente via meta. */
async function ckqMigrarPerguntasReais(){
  /* dispositivo recém-limpo boota VAZIO e a sync só traz os modelos depois —
     não gravar a flag sem ter modelo para olhar, senão a migração nunca roda
     (aconteceu no Lenovo em 23/07; a nuvem foi corrigida à mão). */
  if(!DATA.some(d=>!d.deleted&&d.tipo==="ckqm"&&d.chavePronta))return;
  if(await metaGet("mig_ckq_real_v1"))return;
  let mudou=0;HIST_LIGADO=false;
  try{
    for(const m of DATA){
      if(m.deleted||m.tipo!=="ckqm"||!m.chavePronta)continue;
      const pk=CKQ_PACOTES.find(p=>p.chave===m.chavePronta);if(!pk)continue;
      const respondido=DATA.some(d=>!d.deleted&&d.tipo==="ckqp"&&d.modeloUid===m.uid);
      if(respondido)continue;                 /* inspeção feita = não mexer */
      m.perguntas=pk.perguntas.map((r,i)=>({
        uid:newUid(),ordem:i,
        titulo:r[0]||"",descricao:r[1]||"",secao:r[2]||"",
        escopoP:r[3]||"",escopoS:r[4]||"",
        tipoResp:r[5]||"simnao",coment:r[6]||"opcional",foto:r[7]||"opcional",
        peso:Number(r[8])||0,escopoDest:r[9]||"",
        acaoPadrao:r[10]||"",baseLegal:r[11]||""
      }));
      m.mod=nowISO();await putItem(m);mudou++;
    }
    await metaSet("mig_ckq_real_v1",nowISO());
  }finally{HIST_LIGADO=true;}
  if(mudou)dataChanged();
}

async function ckqSemearModelos(){
  const base=ckqLojaBase();if(!base){toast("Abra uma empresa primeiro");return;}
  let criados=0;
  for(const pk of CKQ_PACOTES){
    const ja=DATA.some(d=>!d.deleted&&d.tipo==="ckqm"&&d.loja===base&&d.chavePronta===pk.chave);
    if(ja)continue;
    const m={uid:newUid(),mod:nowISO(),tipo:"ckqm",loja:base,escopo:"",
      titulo:pk.titulo,descricao:pk.descricao,cor:pk.cor,chavePronta:pk.chave,
      ordem:ckqModelos().length+criados,setores:null,
      perguntas:pk.perguntas.map((r,i)=>({
        uid:newUid(),ordem:i,
        titulo:r[0]||"",descricao:r[1]||"",secao:r[2]||"",
        escopoP:r[3]||"",escopoS:r[4]||"",
        tipoResp:r[5]||"simnao",coment:r[6]||"opcional",foto:r[7]||"opcional",
        peso:Number(r[8])||0,escopoDest:r[9]||"",
        acaoPadrao:r[10]||"",baseLegal:r[11]||""
      }))};
    m.id=await putItem(m);DATA.push(m);criados++;
  }
  dataChanged();renderCkq();
  toast(criados?criados+" modelo"+(criados===1?"":"s")+" pronto"+(criados===1?"":"s")+" criado"+(criados===1?"":"s")+" ✓":"Todos os modelos prontos já existem");
}

/* ---------- CRUD MODELO ---------- */
async function ckqNovoModelo(){
  const base=ckqLojaBase();if(!base){toast("Abra uma empresa primeiro");return;}
  const t=prompt("Nome do checklist novo:","Checklist sem título");
  if(t===null)return;
  const m={uid:newUid(),mod:nowISO(),tipo:"ckqm",loja:base,escopo:"",
    titulo:t.trim()||"Checklist sem título",descricao:"",cor:"#7c3aed",
    ordem:ckqModelos().length,setores:null,perguntas:[]};
  m.id=await putItem(m);DATA.push(m);dataChanged();
  CKQ_MODELO_ABERTO=m.uid;renderCkq();
}
async function ckqRenomearModelo(uid){
  const m=ckqAchar(uid);if(!m)return;
  const v=prompt("Novo nome do checklist:",m.titulo||"");
  if(v===null)return;
  m.titulo=v.trim()||m.titulo;await ckqSalvar(m);renderCkq();
}
async function ckqDuplicarModelo(uid){
  const m=ckqAchar(uid);if(!m)return;
  const copia=JSON.parse(JSON.stringify(m));
  delete copia.id;delete copia.chavePronta;
  copia.uid=newUid();copia.mod=nowISO();
  copia.titulo=(m.titulo||"Checklist")+" (cópia)";
  copia.ordem=ckqModelos().length;
  copia.perguntas=(copia.perguntas||[]).map(p=>({...p,uid:newUid()}));
  copia.id=await putItem(copia);DATA.push(copia);dataChanged();renderCkq();
  toast("Checklist duplicado ✓");
}
async function ckqExcluirModelo(uid){
  const m=ckqAchar(uid);if(!m)return;
  const usada=DATA.some(d=>!d.deleted&&d.tipo==="ckqp"&&d.modeloUid===uid);
  if(!confirm("Excluir o checklist \""+(m.titulo||"")+"\"?"+(usada?"\n\nEle já foi respondido — as inspeções antigas ficam guardadas.":"")))return;
  m.deleted=true;m.mod=nowISO();await putItem(m);dataChanged();
  if(CKQ_MODELO_ABERTO===uid)CKQ_MODELO_ABERTO=null;
  renderCkq();toast("Checklist excluído");
}

/* ---------- CRUD PERGUNTA ---------- */
async function ckqNovaPergunta(){
  const m=ckqAchar(CKQ_MODELO_ABERTO);if(!m)return;
  const p={uid:newUid(),ordem:(m.perguntas||[]).length,
    titulo:"Nova pergunta",descricao:"",secao:"",
    escopoP:"loja",escopoS:"loja",
    tipoResp:"simnao",coment:"opcional",foto:"opcional",peso:1,escopoDest:"",
    acaoPadrao:"",baseLegal:""};
  m.perguntas=[...(m.perguntas||[]),p];await ckqSalvar(m);renderCkq();
}
async function ckqEditarPergunta(pUid,campo,valor){
  const m=ckqAchar(CKQ_MODELO_ABERTO);if(!m)return;
  const p=(m.perguntas||[]).find(x=>x.uid===pUid);if(!p)return;
  if(campo==="peso"){valor=Number(valor)||0;}
  p[campo]=valor;await ckqSalvar(m);
}
async function ckqExcluirPergunta(uid){
  const m=ckqAchar(CKQ_MODELO_ABERTO);if(!m)return;
  const p=(m.perguntas||[]).find(x=>x.uid===uid);if(!p)return;
  const usada=ckqPerguntaFoiRespondida(uid,m.uid);
  if(!confirm("Excluir a pergunta?\n\n"+(p.titulo||"")+(usada?"\n\nJá foi respondida — vai ser marcada como removida (as respostas antigas continuam guardadas).":"")))return;
  if(usada)p.removida=true;
  else m.perguntas=(m.perguntas||[]).filter(x=>x.uid!==uid);
  ckqPerguntas(m).forEach((x,i)=>x.ordem=i);
  await ckqSalvar(m);renderCkq();
}

/* ---------- INSPEÇÃO ---------- */
let CKQ_MODELO_ABERTO=null,CKQ_INSP=null,CKQ_SEC="formularios",CKQ_ETAPA=0;
function ckqSetSec(s){CKQ_SEC=s;CKQ_MODELO_ABERTO=null;CKQ_INSP=null;renderCkq();}

async function ckqIniciar(modeloUid){
  const m=ckqAchar(modeloUid);if(!m)return;
  const areasBase=(typeof AREAS_ALL!=="undefined"&&AREAS_ALL[currentStore])?AREAS_ALL[currentStore].map(a=>a.nome):[];
  const p={uid:newUid(),mod:nowISO(),tipo:"ckqp",loja:currentStore,
    modeloUid:m.uid,modeloTitulo:m.titulo,
    status:"andamento",posicao:0,
    areas:areasBase,setores:ckqSetores().map(s=>s.chave),
    criadoEm:today(),iniciadoEm:nowISO(),atualizacao:nowISO(),
    respondente:RT_INFO||RT_DEFAULT,assinatura:CK_ASSINATURA||"",nota:null,respostas:{}};
  p.id=await putItem(p);DATA.push(p);dataChanged();
  CKQ_INSP=p.uid;CKQ_ETAPA=0;renderCkq();
}
function ckqRetomar(uid){CKQ_INSP=uid;CKQ_ETAPA=0;renderCkq();}
function ckqSair(){CKQ_INSP=null;renderCkq();}

async function ckqResponder(chave,campo,valor){
  const p=ckqAchar(CKQ_INSP);if(!p)return;
  p.respostas=p.respostas||{};
  const r=p.respostas[chave]=p.respostas[chave]||{fotos:[],comentario:"",em:nowISO()};
  r[campo]=valor;r.em=nowISO();
  p.atualizacao=nowISO();
  await ckqSalvar(p);
  const cel=document.querySelector('[data-ckq-cel="'+CSS.escape(chave)+'"]');
  if(cel)cel.outerHTML=ckqCelulaHTML(p,chave);
}

async function ckqConcluir(){
  const p=ckqAchar(CKQ_INSP);if(!p)return;
  const m=ckqAchar(p.modeloUid);if(!m)return;
  /* validação: 👎 com comentário obrigatório mas vazio */
  const faltando=[];
  for(const cel of ckqExpandir(m,p)){
    const r=(p.respostas||{})[cel.chave];
    if(r&&(r.valor==="nao"||r.valor==="I")&&cel.q.coment==="inconforme"&&!(r.comentario||"").trim()){
      faltando.push(cel.q.titulo);if(faltando.length>=3)break;
    }
  }
  if(faltando.length){alert("Falta comentário em ponto(s) marcado(s) como inconforme:\n\n· "+faltando.join("\n· "));return;}
  p.status="concluido";p.concluidoEm=nowISO();p.atualizacao=nowISO();
  if(CK_ASSINATURA&&!p.assinatura)p.assinatura=CK_ASSINATURA;
  p.nota=ckqNota(p,m);
  await ckqSalvar(p);
  CKQ_SEC="enviados";CKQ_INSP=null;renderCkq();toast("Inspeção concluída ✓");
}
function ckqNota(p,m){
  if(p&&p.origem==="historico")return null;
  const cels=ckqExpandir(m,p);let peso=0,ok=0;
  /* B=100% R=66% I=0% para a escala B/R/I/NV (SEGA); NV nao entra na conta,
     do mesmo jeito que N/A no simnao. */
  const val={sim:1,B:1,R:0.66,nao:0,I:0};
  for(const cel of cels){
    const pe=Number(cel.q.peso)||0;if(!pe)continue;
    const r=(p.respostas||{})[cel.chave];if(!r||!r.valor||r.valor==="na"||r.valor==="NV")continue;
    peso+=pe;if(val[r.valor]!=null)ok+=pe*val[r.valor];
  }
  return peso?Math.round((ok/peso)*100):null;
}
function ckqClassificar(n){
  if(n==null)return {rot:"—",cor:"#8a8b96"};
  if(n>=91)return{rot:"Muito bom",cor:"#047857"};
  if(n>=70)return{rot:"Bom",cor:"#1d6b57"};
  if(n>=50)return{rot:"Regular",cor:"#b3730a"};
  if(n>=20)return{rot:"Ruim",cor:"#e5484d"};
  return{rot:"Muito ruim",cor:"#8b1a1e"};
}

/* ---------- TRATATIVA 5W2H (vira mnt ou nc) ---------- */
async function ckqTratativa(chave){
  const p=ckqAchar(CKQ_INSP);if(!p)return;
  const m=ckqAchar(p.modeloUid);if(!m)return;
  const cel=ckqExpandir(m,p).find(c=>c.chave===chave);if(!cel)return;
  const r=(p.respostas||{})[chave]||{};
  const setorRot=cel.setor?ckqSetorRot(cel.setor):"";
  const dest=cel.q.escopoDest||(cel.q.baseLegal?"nc":"mnt");
  const onde=[setorRot,cel.area].filter(Boolean).join(" · ")||currentStoreName;
  ncModal(`<h2>Tratativa (5W2H)</h2>
    <p class="desc"><b>${esc(cel.q.titulo||"")}</b><br><span style="color:#666">${esc(onde)}</span></p>
    <div class="field"><label>O que deve ser feito</label>
      <textarea id="ckq-t-oq">${esc(r.tratativa?.oq||cel.q.acaoPadrao||"")}</textarea></div>
    <div class="grid2">
      <div class="field"><label>Onde</label><input id="ckq-t-onde" value="${esc(r.tratativa?.onde||onde)}"></div>
      <div class="field"><label>Quem</label><input id="ckq-t-quem" value="${esc(r.tratativa?.quem||"")}"></div>
    </div>
    <div class="grid2">
      <div class="field"><label>Prazo</label><input type="date" id="ckq-t-prazo" value="${esc(r.tratativa?.prazo||"")}"></div>
      <div class="field"><label>Registrar como</label>
        <select id="ckq-t-dest">
          <option value="mnt" ${dest==="mnt"?"selected":""}>Manutenção (aba Manutenções)</option>
          <option value="nc"  ${dest==="nc" ?"selected":""}>Não Conformidade (aba NC)</option>
        </select></div>
    </div>
    <div class="field"><label>Observação (por quê / como)</label>
      <textarea id="ckq-t-obs">${esc(r.tratativa?.obs||"")}</textarea></div>
    <div class="form-actions">
      <button class="btn" onclick="ckqSalvarTratativa('${chave}')">Registrar</button>
      <button class="btn ghost" onclick="ncFechar()">Cancelar</button>
    </div>`);
}
async function ckqSalvarTratativa(chave){
  const p=ckqAchar(CKQ_INSP);if(!p)return;
  const m=ckqAchar(p.modeloUid);if(!m)return;
  const cel=ckqExpandir(m,p).find(c=>c.chave===chave);if(!cel)return;
  const t={
    oq:(document.getElementById("ckq-t-oq").value||"").trim(),
    onde:(document.getElementById("ckq-t-onde").value||"").trim(),
    quem:(document.getElementById("ckq-t-quem").value||"").trim(),
    prazo:(document.getElementById("ckq-t-prazo").value||"").trim(),
    obs:(document.getElementById("ckq-t-obs").value||"").trim(),
    dest:document.getElementById("ckq-t-dest").value
  };
  if(!t.oq){toast("Escreva o que deve ser feito");return;}
  p.respostas[chave]=p.respostas[chave]||{fotos:[],comentario:"",em:nowISO()};
  const r=p.respostas[chave];r.tratativa=t;r.em=nowISO();
  /* atualiza item existente ou cria novo */
  let alvo=r.itemUid?DATA.find(d=>d.uid===r.itemUid):null;
  if(!alvo){
    alvo={uid:newUid(),mod:nowISO(),tipo:t.dest,loja:currentStore,
      area:cel.area||"",nc:cel.q.titulo,acao:t.oq,rt:RT_INFO||RT_DEFAULT,
      executor:t.quem||"",relato:today(),atualizacao:nowISO(),
      status:"Pendente",obs:t.obs,prazo:t.prazo,
      urgencia:(t.dest==="nc"?"OBSERVACAO":undefined),
      origem:{ckq:p.uid,chave}};
    alvo.id=await putItem(alvo);DATA.push(alvo);
    r.itemUid=alvo.uid;
  }else{
    alvo.mod=nowISO();alvo.tipo=t.dest;alvo.area=cel.area||"";
    alvo.nc=cel.q.titulo;alvo.acao=t.oq;alvo.executor=t.quem||"";
    alvo.obs=t.obs;alvo.prazo=t.prazo;alvo.atualizacao=nowISO();
    await putItem(alvo);
  }
  await ckqSalvar(p);ncFechar();
  toast("Tratativa registrada — item aberto em "+(t.dest==="mnt"?"Manutenções":"NC")+" ✓");
}

/* ---------- ETAPAS (LISTA por área/setor) ----------
   Etapa 0 = geral da loja (perguntas escopoS=loja e escopoP=loja)
   Etapa 1..N = cada combinação setor×área que tem pergunta */
function ckqEtapas(m,p){
  const et=[{k:"loja",rot:"Loja — geral",setor:"",area:""}];
  const cels=ckqExpandir(m,p);
  const marcadas=new Set(["loja"]);
  for(const c of cels){
    if(!c.setor&&!c.area)continue;
    const k=(c.setor||"L")+"|"+(c.area||"");
    if(marcadas.has(k))continue;
    marcadas.add(k);
    const setorRot=c.setor?ckqSetorRot(c.setor):"Loja";
    const rot=c.area?(setorRot+(c.setor?" · ":" · ")+c.area):setorRot;
    et.push({k,rot,setor:c.setor,area:c.area});
  }
  return et;
}
function ckqCelulasDaEtapa(m,p,etapa){
  const cels=ckqExpandir(m,p);
  if(etapa.k==="loja")return cels.filter(c=>!c.setor&&!c.area);
  return cels.filter(c=>(c.setor||"")===(etapa.setor||"")&&(c.area||"")===(etapa.area||""));
}

/* ---------- HTML: célula/etapa/lista de modelos ---------- */
function ckqCelulaHTML(p,chave){
  const m=ckqAchar(p.modeloUid);if(!m)return "";
  const cel=ckqExpandir(m,p).find(c=>c.chave===chave);if(!cel)return "";
  const r=(p.respostas||{})[chave]||{};
  const q=cel.q;
  const sel=v=>r.valor===v?" ativo":"";
  let corpo="";
  if(q.tipoResp==="simnao"||!q.tipoResp){
    corpo=`<div class="ckq-btns">
      <button class="ckq-bt sim${sel("sim")}"onclick="ckqResponder('${chave}','valor','sim')">👍</button>
      <button class="ckq-bt nao${sel("nao")}"onclick="ckqResponder('${chave}','valor','nao')">👎</button>
      <button class="ckq-bt na${sel("na")}" onclick="ckqResponder('${chave}','valor','na')">N/A</button>
    </div>`;
  }else if(q.tipoResp==="nota4"){
    /* B/R/I/NV — Bom / Regular / Insuficiente / Nao Verificado (RHS Mensal SEGA).
       ckqNota mapeia B=100% R=66% I=0% e NV nao entra na conta. */
    corpo=`<div class="ckq-btns">
      <button class="ckq-bt sim${sel("B")}"onclick="ckqResponder('${chave}','valor','B')" title="Bom">B</button>
      <button class="ckq-bt na${sel("R")}" onclick="ckqResponder('${chave}','valor','R')" title="Regular">R</button>
      <button class="ckq-bt nao${sel("I")}"onclick="ckqResponder('${chave}','valor','I')" title="Insuficiente">I</button>
      <button class="ckq-bt na${sel("NV")}" onclick="ckqResponder('${chave}','valor','NV')" title="Não verificado">NV</button>
    </div>`;
  }else if(q.tipoResp==="texto"){
    corpo=`<input class="ckq-texto" placeholder="Escreva a resposta" value="${esc(r.valor||"")}" onblur="ckqResponder('${chave}','valor',this.value)">`;
  }else if(q.tipoResp==="data"){
    corpo=`<input type="date" class="ckq-texto" value="${esc(r.valor||"")}" onchange="ckqResponder('${chave}','valor',this.value)">`;
  }else if(q.tipoResp==="selecao"){
    const ops=(q.opcoes||[]).map(o=>`<option value="${esc(o)}" ${r.valor===o?"selected":""}>${esc(o)}</option>`).join("");
    corpo=`<select class="ckq-texto" onchange="ckqResponder('${chave}','valor',this.value)"><option value="">—</option>${ops}</select>`;
  }else if(q.tipoResp==="assinatura"){
    const ok=r.valor||CK_ASSINATURA;
    corpo=`<button class="btn ghost sm" onclick="ckqResponder('${chave}','valor',CK_ASSINATURA||'')">✍ Usar minha assinatura</button>
      ${ok?`<img src="${ok}" style="max-height:44px;vertical-align:middle;margin-left:8px;border:1px solid #ddd;border-radius:4px">`:""}`;
  }
  const inconforme=(r.valor==="nao"||r.valor==="I");
  const precisaComentar=inconforme&&q.coment==="inconforme";
  const comentario=(q.coment!=="nao")?`<textarea class="ckq-com" placeholder="${precisaComentar?"Comentário obrigatório...":"Comentário (opcional)"}" onblur="ckqResponder('${chave}','comentario',this.value)">${esc(r.comentario||"")}</textarea>`:"";
  const acao=inconforme?`<button class="btn sm" onclick="ckqTratativa('${chave}')">📌 Abrir tratativa (5W2H)</button>`:"";
  const base=q.baseLegal?`<div class="ckq-legal">${esc(q.baseLegal)}</div>`:"";
  return `<div class="ckq-cel" data-ckq-cel="${esc(chave)}">
    <div class="ckq-cel-tit"><b>${esc(q.titulo||"")}</b>${q.descricao?`<div class="ckq-desc">${esc(q.descricao)}</div>`:""}${base}</div>
    ${corpo}
    ${comentario}
    ${acao}
  </div>`;
}

function ckqEtapaHTML(){
  const p=ckqAchar(CKQ_INSP);if(!p)return "";
  const m=ckqAchar(p.modeloUid);if(!m)return "";
  const et=ckqEtapas(m,p);
  if(CKQ_ETAPA>=et.length)CKQ_ETAPA=et.length-1;if(CKQ_ETAPA<0)CKQ_ETAPA=0;
  const e=et[CKQ_ETAPA];
  const cels=ckqCelulasDaEtapa(m,p,e);
  const trilha=et.map((x,i)=>{
    const feita=ckqCelulasDaEtapa(m,p,x).every(c=>((p.respostas||{})[c.chave]||{}).valor);
    return `<button class="ckq-trilha-bt${i===CKQ_ETAPA?" ativo":""}${feita?" feita":""}" onclick="CKQ_ETAPA=${i};renderCkq()">${feita?"✓ ":""}${esc(x.rot)}</button>`;
  }).join("");
  const antP=CKQ_ETAPA>0?`<button class="btn ghost" onclick="CKQ_ETAPA--;renderCkq()">← Etapa anterior</button>`:"";
  const proxP=CKQ_ETAPA<et.length-1?`<button class="btn" onclick="CKQ_ETAPA++;renderCkq()">Próxima etapa →</button>`:`<button class="btn" onclick="ckqConcluir()">✓ Concluir inspeção</button>`;
  const cont=cels.length?cels.map(c=>ckqCelulaHTML(p,c.chave)).join(""):`<p class="desc">Nada a responder nesta etapa.</p>`;
  return `<div class="ckq-insp">
    <div class="ckq-topo">
      <div><b>${esc(m.titulo||"")}</b> · ${esc(currentStoreName||"")} · <span class="badge">Etapa ${CKQ_ETAPA+1}/${et.length}</span></div>
      <div><button class="btn ghost sm" onclick="ckqSair()">Sair (grava parcial)</button></div>
    </div>
    <div class="ckq-trilha">${trilha}</div>
    <h3 style="margin:14px 0 8px">${esc(e.rot)}</h3>
    ${cels.filter(c=>c.q.tipoResp==="simnao"||c.q.tipoResp==="nota4").length?`<div style="margin-bottom:10px"><button class="btn ghost sm" onclick="ckqTudoSim()">👍 Tudo certo nesta etapa</button></div>`:""}
    <div class="ckq-lista">${cont}</div>
    <div class="ckq-nav">${antP}${proxP}</div>
  </div>`;
}
async function ckqTudoSim(){
  const p=ckqAchar(CKQ_INSP);if(!p)return;
  const m=ckqAchar(p.modeloUid);if(!m)return;
  const e=ckqEtapas(m,p)[CKQ_ETAPA];
  for(const c of ckqCelulasDaEtapa(m,p,e)){
    if(c.q.tipoResp==="simnao"||c.q.tipoResp==="nota4"){
      p.respostas=p.respostas||{};
      const r=p.respostas[c.chave]=p.respostas[c.chave]||{fotos:[],comentario:"",em:nowISO()};
      if(!r.valor)r.valor=(c.q.tipoResp==="nota4"?"B":"sim");
    }
  }
  await ckqSalvar(p);renderCkq();
}

function ckqConstrutorHTML(){
  const m=ckqAchar(CKQ_MODELO_ABERTO);if(!m)return "";
  const linhas=(m.perguntas||[]).map(p=>{
    const rem=p.removida?" (removida)":"";
    return `<tr class="${p.removida?"apagada":""}">
      <td><input value="${esc(p.titulo||"")}" onblur="ckqEditarPergunta('${p.uid}','titulo',this.value)" placeholder="Pergunta"></td>
      <td><input value="${esc(p.secao||"")}" onblur="ckqEditarPergunta('${p.uid}','secao',this.value)" placeholder="Seção"></td>
      <td><select onchange="ckqEditarPergunta('${p.uid}','escopoP',this.value)">
        <option value="loja" ${p.escopoP==="loja"||!p.escopoP?"selected":""}>Loja (1×)</option>
        <option value="ambiente" ${p.escopoP==="ambiente"?"selected":""}>Cada área</option>
        <option value="tipo:camara" ${p.escopoP==="tipo:camara"?"selected":""}>Só câmaras</option>
        <option value="tipo:sanitario" ${p.escopoP==="tipo:sanitario"?"selected":""}>Só sanitários</option>
        <option value="tipo:producao" ${p.escopoP==="tipo:producao"?"selected":""}>Só produção</option>
        <option value="tipo:residuo" ${p.escopoP==="tipo:residuo"?"selected":""}>Só resíduos</option>
      </select></td>
      <td><select onchange="ckqEditarPergunta('${p.uid}','escopoS',this.value)">
        <option value="loja" ${p.escopoS==="loja"||!p.escopoS?"selected":""}>Loja (1×)</option>
        <option value="setor" ${p.escopoS==="setor"?"selected":""}>Cada setor</option>
      </select></td>
      <td><select onchange="ckqEditarPergunta('${p.uid}','tipoResp',this.value)">
        ${["simnao","nota4","selecao","texto","data","assinatura"].map(k=>`<option value="${k}" ${p.tipoResp===k?"selected":""}>${k==="nota4"?"B/R/I/NV":k}</option>`).join("")}
      </select></td>
      <td><input type="number" min="0" max="10" value="${Number(p.peso)||0}" style="width:60px" onblur="ckqEditarPergunta('${p.uid}','peso',this.value)"></td>
      <td><select onchange="ckqEditarPergunta('${p.uid}','escopoDest',this.value)">
        <option value="" ${!p.escopoDest?"selected":""}>—</option>
        <option value="mnt" ${p.escopoDest==="mnt"?"selected":""}>Manutenção</option>
        <option value="nc" ${p.escopoDest==="nc"?"selected":""}>NC</option>
      </select></td>
      <td><input value="${esc(p.acaoPadrao||"")}" onblur="ckqEditarPergunta('${p.uid}','acaoPadrao',this.value)" placeholder="Ação sugerida"></td>
      <td><input value="${esc(p.baseLegal||"")}" onblur="ckqEditarPergunta('${p.uid}','baseLegal',this.value)" placeholder="Base legal"></td>
      <td><button class="btn ghost sm" onclick="ckqExcluirPergunta('${p.uid}')">🗑</button>${rem}</td>
    </tr>`;
  }).join("");
  return `<div class="ckq-const">
    <div class="ckq-topo">
      <div><b>${esc(m.titulo||"")}</b> — construtor</div>
      <div>
        <button class="btn ghost sm" onclick="ckqRenomearModelo('${m.uid}')">✎ Renomear</button>
        <button class="btn ghost sm" onclick="ckqDuplicarModelo('${m.uid}')">⧉ Duplicar</button>
        <button class="btn" onclick="ckqIniciar('${m.uid}')">▶ Iniciar inspeção</button>
        <button class="btn ghost sm" onclick="CKQ_MODELO_ABERTO=null;renderCkq()">← Voltar</button>
      </div>
    </div>
    <div class="ckq-tabela-wrap">
      <table class="ckq-tabela"><thead><tr>
        <th>Pergunta</th><th>Seção</th><th>Onde (área)</th><th>Onde (setor)</th>
        <th>Tipo</th><th>Peso</th><th>Vira</th><th>Ação sugerida</th><th>Base legal</th><th></th>
      </tr></thead><tbody>${linhas||`<tr><td colspan="10" class="desc">Sem perguntas ainda. Use o botão abaixo.</td></tr>`}</tbody></table>
    </div>
    <div style="margin-top:10px"><button class="btn" onclick="ckqNovaPergunta()">+ Nova pergunta</button></div>
  </div>`;
}

function ckqListaModelosHTML(){
  const modelos=ckqModelos();
  if(!modelos.length){
    return `<div class="ckq-vazio">
      <p>Nenhum checklist ainda nesta empresa.</p>
      <div style="display:flex;gap:9px;flex-wrap:wrap">
        <button class="btn" onclick="ckqSemearModelos()">🍞 Criar os 9 modelos prontos</button>
        <button class="btn ghost" onclick="ckqNovoModelo()">+ Criar do zero</button>
      </div></div>`;
  }
  const cards=modelos.map(m=>{
    const nP=(m.perguntas||[]).filter(x=>!x.removida).length;
    return `<div class="ckq-card" style="border-left:4px solid ${esc(m.cor||"#7c3aed")}" onclick="CKQ_MODELO_ABERTO='${m.uid}';renderCkq()">
      <div class="ckq-card-tit"><b>${esc(m.titulo||"")}</b></div>
      <div class="ckq-card-sub">${nP} pergunta${nP===1?"":"s"}${m.descricao?" · "+esc(m.descricao):""}</div>
      <div class="ckq-card-acts" onclick="event.stopPropagation()">
        <button class="btn" onclick="ckqIniciar('${m.uid}')">▶ Iniciar</button>
        <button class="btn ghost sm" onclick="ckqExcluirModelo('${m.uid}')">🗑</button>
      </div></div>`;
  }).join("");
  return `<div class="ckq-cards">${cards}</div>
    <div style="margin-top:14px;display:flex;gap:9px;flex-wrap:wrap">
      <button class="btn ghost sm" onclick="ckqNovoModelo()">+ Novo checklist</button>
      <button class="btn ghost sm" onclick="ckqSemearModelos()">🍞 Criar os prontos que faltam</button>
    </div>`;
}
function ckqListaInspecoesHTML(status){
  const lista=ckqPreenchimentos(status);
  if(!lista.length)return `<p class="desc">Nenhuma inspeção ${status==="concluido"?"concluída":"parcial"} nesta empresa.</p>`;
  return `<div class="ckq-inspecoes">`+lista.map(p=>{
    const m=ckqAchar(p.modeloUid);
    const rot=(m&&m.titulo)||p.modeloTitulo||"(modelo excluído)";
    const nota=(p.nota!=null)?` · <b>${p.nota}%</b> ${ckqClassificar(p.nota).rot}`:"";
    const acs=p.status==="andamento"
      ?`<button class="btn sm" onclick="ckqRetomar('${p.uid}')">▶ Retomar</button>`
      :`<button class="btn ghost sm" onclick="ckqAbrirRelatorio('${p.uid}')">📄 Relatório</button>`;
    return `<div class="ckq-linha">
      <div><b>${esc(rot)}</b><br><span class="desc">${brDate(p.concluidoEm||p.criadoEm||"")}${nota}</span></div>
      <div>${acs} <button class="btn ghost sm" onclick="ckqExcluirInsp('${p.uid}')">🗑</button></div>
    </div>`;
  }).join("")+`</div>`;
}
async function ckqExcluirInsp(uid){
  const p=ckqAchar(uid);if(!p)return;
  if(!confirm("Excluir esta inspeção?"))return;
  p.deleted=true;p.mod=nowISO();await putItem(p);dataChanged();renderCkq();
}

/* ---------- RENDER PRINCIPAL ---------- */
function renderCkq(){
  const wrap=document.getElementById("tab-ckq");if(!wrap)return;
  if(CKQ_INSP){wrap.innerHTML=ckqEtapaHTML();return;}
  if(CKQ_MODELO_ABERTO){wrap.innerHTML=ckqConstrutorHTML();return;}
  const abas=[["formularios","Formulários"],["enviados","Concluídas"],["parciais","Parciais"]];
  const barra=abas.map(([k,r])=>`<button class="ckq-sub${CKQ_SEC===k?" ativo":""}" onclick="ckqSetSec('${k}')">${r}</button>`).join("");
  let corpo="";
  if(CKQ_SEC==="formularios")corpo=ckqListaModelosHTML();
  else if(CKQ_SEC==="enviados")corpo=ckqListaInspecoesHTML("concluido");
  else corpo=ckqListaInspecoesHTML("andamento");
  wrap.innerHTML=`<div class="ckq-sub-barra">${barra}</div><div style="margin-top:12px">${corpo}</div>`;
}

/* ---------- RELATÓRIO / PDF ---------- */
function ckqAbrirRelatorio(uid){
  const p=ckqAchar(uid);if(!p)return;
  const m=ckqAchar(p.modeloUid);if(!m){toast("Modelo excluído");return;}
  const html=ckqRelatorioHTML(p,m);
  const w=window.open("","_blank");if(!w){toast("Libere o pop-up para ver o relatório");return;}
  const url=(typeof ckqRelPDF==="function")?URL.createObjectURL(ckqRelPDF(p,m)):"";
  const barra=`<div class="barra" style="position:sticky;top:0;background:#fff;border-bottom:1px solid #ddd;padding:10px;display:flex;gap:8px;flex-wrap:wrap;z-index:10">
    <button onclick="window.print()">🖨 Imprimir / PDF</button>
    ${url?`<a href="${url}" download="Relatorio-Qualidade_${p.uid.slice(0,6)}.pdf" style="text-decoration:none"><button>⬇ Baixar PDF</button></a>`:""}
    <button onclick="window.close()">Fechar</button>
  </div>`;
  w.document.write(`<!doctype html><html lang=pt-BR><head><meta charset=utf-8><title>Relatório</title>
    <style>body{font-family:Arial,sans-serif;max-width:920px;margin:0 auto;padding:20px;color:#222}
      h1{font-size:22px;margin:0 0 6px}h2{font-size:15px;margin:18px 0 6px;color:#555;text-transform:uppercase;letter-spacing:.5px}
      .capa{background:linear-gradient(155deg,#0f5b52,#17756a,#2a9d8a);color:#fff;padding:22px;border-radius:10px;margin-bottom:16px}
      .capa .nota{font-size:44px;font-weight:800;line-height:1}
      table{width:100%;border-collapse:collapse;margin-top:4px}th,td{border:1px solid #ddd;padding:6px 8px;font-size:13px;text-align:left;vertical-align:top}
      th{background:#f2f4f4}
      .box{border:1px solid #ddd;border-radius:8px;padding:10px;margin:8px 0}
      .desc{color:#777;font-size:13px}
      @media print{.barra{display:none!important}body{padding:0}}
    </style></head><body>${barra}${html}</body></html>`);
  w.document.close();
}
function ckqRelatorioHTML(p,m){
  const cls=ckqClassificar(p.nota);
  const cabecalho=`<div class="capa"><h1>${esc(m.titulo||"")}</h1>
    <div>${esc(currentStoreName||p.loja||"")} · ${brDate(p.concluidoEm||p.criadoEm||"")}</div>
    ${p.nota!=null?`<div style="margin-top:10px"><span class="nota">${p.nota}%</span> · <b>${cls.rot}</b></div>`:""}
    <div style="margin-top:8px;opacity:.9">${esc(p.respondente||"")}</div></div>`;
  /* problemas por área/setor */
  const cels=ckqExpandir(m,p);
  const problemas=cels.filter(c=>{const v=((p.respostas||{})[c.chave]||{}).valor;return v==="nao"||v==="I";});
  const grupos={};
  for(const c of problemas){
    const k=[c.setor?ckqSetorRot(c.setor):"",c.area].filter(Boolean).join(" · ")||"Loja — geral";
    (grupos[k]=grupos[k]||[]).push(c);
  }
  const secProblemas=Object.keys(grupos).length
    ?`<h2>Pontos de atenção</h2>`+Object.keys(grupos).sort().map(k=>{
      const items=grupos[k].map(c=>{
        const r=(p.respostas||{})[c.chave]||{};
        const trat=r.tratativa?`<div class="desc"><b>Ação:</b> ${esc(r.tratativa.oq||"")}${r.tratativa.quem?" · "+esc(r.tratativa.quem):""}${r.tratativa.prazo?" · prazo "+brDate(r.tratativa.prazo):""}</div>`:"";
        const base=c.q.baseLegal?`<div class="desc">${esc(c.q.baseLegal)}</div>`:"";
        return `<div class="box"><b>${esc(c.q.titulo||"")}</b>${r.comentario?`<div>${esc(r.comentario)}</div>`:""}${trat}${base}</div>`;
      }).join("");
      return `<div style="margin-top:10px"><b>${esc(k)}</b>${items}</div>`;
    }).join("")
    :`<h2>Pontos de atenção</h2><p class="desc">Nenhuma inconformidade registrada.</p>`;
  /* assinatura */
  const assin=p.assinatura?`<img src="${p.assinatura}" style="max-height:60px;border-bottom:1px solid #333"><div>${esc(p.respondente||"")}</div>`:`<div style="border-bottom:1px solid #333;width:280px;height:44px"></div><div>${esc(p.respondente||"")}</div>`;
  return `${cabecalho}${secProblemas}
    <h2>Assinaturas</h2>
    <div style="display:flex;gap:30px;flex-wrap:wrap;margin-top:14px">
      <div><div class="desc">Responsável Técnica</div>${assin}</div>
      <div><div class="desc">Gerente da loja</div><div style="border-bottom:1px solid #333;width:280px;height:44px"></div><div>Nome / assinatura</div></div>
    </div>`;
}

/* PDF simples com pdflite.js
   API: doc.retangulo(x,y,larg,alt,cor); doc.texto(txt,{x,y,tam,cor,negrito});
        doc.quebrar(txt,larg,tam) devolve array de linhas; doc.novaPagina(); doc.blob() */
function ckqRelPDF(p,m){
  if(typeof PDFLite==="undefined")return null;
  const doc=new PDFLite();
  doc.retangulo(0,0,595,90,"#17756a");
  doc.texto(m.titulo||"",{x:30,y:34,cor:"#fff",tam:18,negrito:true});
  doc.texto((currentStoreName||p.loja||"")+" · "+brDate(p.concluidoEm||p.criadoEm||""),{x:30,y:60,cor:"#e6f2f1",tam:11});
  let y=120;
  if(p.nota!=null){
    doc.texto(p.nota+"%  "+ckqClassificar(p.nota).rot,{x:30,y,tam:22,negrito:true});y+=32;
  }
  doc.texto("Pontos de atencao",{x:30,y,tam:13,negrito:true});y+=18;
  const cels=ckqExpandir(m,p);
  const problemas=cels.filter(c=>{const v=((p.respostas||{})[c.chave]||{}).valor;return v==="nao"||v==="I";});
  if(!problemas.length){doc.texto("Nenhuma inconformidade registrada.",{x:30,y,tam:11,cor:"#666"});y+=16;}
  for(const c of problemas){
    if(y>760){doc.novaPagina();y=40;}
    const setorRot=c.setor?ckqSetorRot(c.setor):"";
    const local=[setorRot,c.area].filter(Boolean).join(" · ")||"Loja";
    doc.texto("• "+(c.q.titulo||""),{x:30,y,tam:11,negrito:true});y+=14;
    doc.texto(local,{x:30,y,tam:10,cor:"#666"});y+=13;
    const r=(p.respostas||{})[c.chave]||{};
    if(r.comentario){for(const ln of doc.quebrar(r.comentario,530,10)){if(y>760){doc.novaPagina();y=40;}doc.texto(ln,{x:40,y,tam:10});y+=12;}}
    if(r.tratativa&&r.tratativa.oq){
      const trato="Acao: "+r.tratativa.oq+(r.tratativa.quem?" — "+r.tratativa.quem:"")+(r.tratativa.prazo?" — prazo "+brDate(r.tratativa.prazo):"");
      for(const ln of doc.quebrar(trato,530,10)){if(y>760){doc.novaPagina();y=40;}doc.texto(ln,{x:40,y,tam:10,cor:"#155e30"});y+=12;}
    }
    if(c.q.baseLegal){doc.texto(c.q.baseLegal,{x:40,y,tam:9,cor:"#888"});y+=12;}
    y+=6;
  }
  return doc.blob();
}
