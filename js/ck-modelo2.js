/* ===== CHECKLIST "Infraestrutura e Manutenção 2" =====
   O checklist COMPLETO de infraestrutura, tirado da legislação de boas práticas.

   AS PERGUNTAS NÃO FORAM INVENTADAS. Elas são a lista de verificação oficial:
   · RDC ANVISA 275/2002, ANEXO II — Lista de Verificação das Boas Práticas de Fabricação.
     Bloco 1 (Edificação e Instalações, itens 1.1 a 1.20) e Bloco 2 (Equipamentos, Móveis
     e Utensílios, 2.1 a 2.4). É o formulário que o fiscal usa.
   · RDC ANVISA 216/2004 — Boas Práticas para SERVIÇOS DE ALIMENTAÇÃO. Item 4.1
     (Edificação, instalações, equipamentos, móveis e utensílios), 4.2 (Higienização),
     4.3 (Vetores e pragas), 4.4 (Água). É a norma-mãe da UAN, padaria, açougue e cozinha.
   · Portaria SVS/MS 326/1997 — complementar.
   O texto foi reescrito em linguagem de leitura rápida; a referência legal fica no campo
   `baseLegal` de cada pergunta, para não pesar a leitura.

   RÉGUA DA NOTA (ckClassifica): Saccol, Hecktheuer, Richards e Stangarlin (2006),
   adaptada da RDC 216 — a classificação usada na área de nutrição.

   O QUE ESTE ARQUIVO RESOLVE: ela tem 60 áreas em [loja-A] e 50 em Arraial. Repetir
   91 perguntas em cada área seria impossível. Por isso cada pergunta tem um ESCOPO
   (`escopoP`) e cada área um TIPO (`tipoAmb`):
     ""/loja      → respondida UMA vez na inspeção inteira
     ambiente     → respondida uma vez em CADA área visitada
     tipo:xxx     → só nas áreas daquele tipo (câmara, sanitário, produção, resíduo)
   Uma câmara vira 38 perguntas, um banheiro 36 — não 91. */

/* ---------- TIPOS DE AMBIENTE ---------- */
const CK_TIPOS_AMB={
  producao :{rotulo:"Produção / manipulação",ico:"🔪",cor:"#1d6b57"},
  camara   :{rotulo:"Câmara / refrigeração", ico:"❄️",cor:"#1668b8"},
  sanitario:{rotulo:"Banheiro / vestiário",  ico:"🚻",cor:"#a23bb0"},
  estoque  :{rotulo:"Estoque / depósito",    ico:"📦",cor:"#b3730a"},
  vendas   :{rotulo:"Salão / vendas",        ico:"🛒",cor:"#0e7490"},
  circula  :{rotulo:"Corredor / circulação", ico:"🚪",cor:"#8a8b96"},
  externa  :{rotulo:"Área externa / carga",  ico:"🏗",cor:"#6b7280"},
  residuo  :{rotulo:"Área de lixo",          ico:"🗑",cor:"#7c3aed"},
  apoio    :{rotulo:"Apoio / administrativo",ico:"🗄",cor:"#4b5563"}
};
/* Sugestão pelo NOME da área. É só um palpite — ela confirma ou troca na tela.
   A ordem importa: a primeira regra que casar vence. */
const CK_REGRAS_AMB=[
  [/lixo|residuo|resíduo|papel[aã]o|reciclagem|descarte/i,"residuo"],
  [/c[aâ]mara|freezer|congelad|resfriad|expositor|ilha /i,"camara"],
  [/banheiro|sanit[aá]rio|vestiario|vestiário|lavabo|ducha|chuveiro/i,"sanitario"],
  [/produ[cç][aã]o|manipula|a[cç]ougue|padaria|confeitaria|cozinha|uan|salgado|farinha|embalamento|preparo/i,"producao"],
  [/estoque|dep[oó]sito|almoxarifado|arquivo/i,"estoque"],
  [/sal[aã]o|hortifr|venda|checkout|caixa |atendimento/i,"vendas"],
  [/corredor|elevador|escada|entrada|passagem/i,"circula"],
  [/externa|carga|descarga|fornecedor|estacionamento|p[aá]tio|fachada|telhado|muro/i,"externa"],
  [/adm|escrit[oó]rio|descanso|refeit[oó]rio|sala|dml|limpeza/i,"apoio"]
];
function ckSugerirTipo(nome){
  const n=String(nome||"");
  for(const [rx,t] of CK_REGRAS_AMB)if(rx.test(n))return t;
  return "apoio";
}
/* mapa {nomeDaArea: tipo} da empresa atual, guardado no meta e sincronizado */
let CK_AMB={};
async function ckAmbCarregar(){
  CK_AMB=(await metaGet("ambTipos_"+currentStore))||{};
}
async function ckAmbSalvar(){
  await metaSet("ambTipos_"+currentStore,CK_AMB);
  await metaSet("ambTiposMod",nowISO());
  dataChanged();
}
function ckTipoDaArea(area){
  const a=String(area||"").trim();
  return CK_AMB[a]||ckSugerirTipo(a);
}
/* todas as áreas que a empresa atual realmente usa (vem dos itens + do cadastro) */
function ckAreasDaLoja(){
  const s=new Set();
  for(const d of DATA)if(!d.deleted&&d.loja===currentStore&&d.area)s.add(String(d.area).trim());
  for(const a of (AREAS_ALL&&AREAS_ALL[currentStore])||[])if(a)s.add(String(a).trim());
  return [...s].filter(Boolean).sort((a,b)=>a.localeCompare(b,"pt-BR"));
}

/* =======================================================================
   AS 91 PERGUNTAS
   [ titulo, descricao, secao, escopo, acaoPadrao, baseLegal, tipoResp?, peso? ]
   Sem tipoResp = "simnao". Sem peso = 1. na = sempre permitido.
   ======================================================================= */
const CK_MODELO_INFRA2=[

/* ---------- ESCOPO LOJA: respondidas UMA vez ---------- */
["Área externa livre de entulho, lixo acumulado, água parada e objetos sem uso?",
 "Olhe o pátio, a vizinhança imediata e os fundos.","Área externa e acessos","loja",
 "Remover o entulho e os objetos sem uso, eliminar focos de água parada e organizar a coleta do lixo da área externa.",
 "RDC 275/2002, 1.1.1 · RDC 216/2004, 4.1.7"],
["Vias de acesso interno pavimentadas, limpas e com escoamento de água?",
 "Caminho de carga e descarga até a loja.","Área externa e acessos","loja",
 "Pavimentar ou recuperar o piso das vias internas e corrigir o escoamento, mantendo-as limpas.",
 "RDC 275/2002, 1.1.2"],
["Acesso ao estabelecimento é próprio, sem passar por moradia?",
 "O acesso não pode ser comum a outros usos.","Área externa e acessos","loja",
 "Providenciar acesso independente e controlado para o estabelecimento.",
 "RDC 275/2002, 1.2.1 · RDC 216/2004, 4.1.1"],
["Estabelecimento livre de animais?",
 "Nenhum animal, nem no pátio.","Área externa e acessos","loja",
 "Impedir a entrada e a permanência de animais, vedando os acessos e removendo o que os atrai.",
 "RDC 216/2004, 4.1.7 · RDC 275/2002, 1.1.1"],

["Água vem da rede pública de abastecimento?",
 "Se for poço ou captação própria, marque Não e descreva.","Abastecimento de água","loja",
 "Ligar o estabelecimento à rede pública ou, na captação própria, protegê-la e comprovar a potabilidade por laudo.",
 "RDC 275/2002, 1.17.1 e 1.17.2 · RDC 216/2004, 4.4.1"],
["Caixa d'água tampada, sem vazamento, infiltração ou descascamento?",
 "Suba e olhe a tampa e as paredes do reservatório.","Abastecimento de água","loja",
 "Recuperar e vedar o reservatório, trocando a tampa e corrigindo vazamentos e descascamentos.",
 "RDC 275/2002, 1.17.3"],
["Existe responsável treinado pela limpeza da caixa d'água?",
 "Pode ser funcionário capacitado ou empresa contratada.","Abastecimento de água","loja",
 "Designar responsável capacitado ou contratar empresa especializada para a higienização do reservatório.",
 "RDC 275/2002, 1.17.4"],
["Limpeza da caixa d'água está em dia (a cada 6 meses)?",
 "Confira a data da última.","Abastecimento de água","loja",
 "Realizar a higienização do reservatório e implantar o intervalo máximo de 6 meses.",
 "RDC 275/2002, 1.17.5 · RDC 216/2004, 4.4.2"],
["Existe registro ou comprovante da última limpeza da caixa d'água?",
 "Papel, laudo ou planilha.","Abastecimento de água","loja",
 "Arquivar o comprovante ou a planilha de registro da higienização do reservatório.",
 "RDC 275/2002, 1.17.6 · RDC 216/2004, 4.4.2"],
["Encanamento sem vazamento e sem ligação entre água potável e não potável?",
 "Procure infiltração e conexão cruzada.","Abastecimento de água","loja",
 "Reparar os vazamentos e eliminar qualquer conexão cruzada entre água potável e não potável.",
 "RDC 275/2002, 1.17.7"],
["Laudo de potabilidade da água dentro da validade?",
 "Análise laboratorial assinada por responsável técnico.","Abastecimento de água","loja",
 "Providenciar a análise laboratorial de potabilidade da água e mantê-la na periodicidade exigida.",
 "RDC 275/2002, 1.17.9 · RDC 216/2004, 4.4.1"],
["Gelo feito com água potável e guardado protegido?",
 "Marque Não se aplica se não produzir gelo.","Abastecimento de água","loja",
 "Produzir o gelo somente com água potável e armazená-lo protegido de contaminação.",
 "RDC 275/2002, 1.17.12 · RDC 216/2004, 4.4.3"],

["Esgoto ligado à rede pública ou fossa, em bom estado?",
 "Sem refluxo nem cheiro.","Esgoto e caixa de gordura","loja",
 "Recuperar a rede de esgoto e garantir a ligação adequada à rede pública ou fossa séptica.",
 "RDC 275/2002, 1.19.1 · RDC 216/2004, 4.1.5"],
["Caixa de gordura fora da área de alimentos e funcionando bem?",
 "Não pode ficar dentro da produção nem do estoque.","Esgoto e caixa de gordura","loja",
 "Relocar ou adequar a caixa de gordura para fora das áreas de preparo e armazenamento, com dimensão compatível.",
 "RDC 216/2004, 4.1.6"],
["Caixa de gordura limpa periodicamente, com registro?",
 "Confira a data da última limpeza.","Esgoto e caixa de gordura","loja",
 "Estabelecer a frequência de limpeza da caixa de gordura e registrar cada execução.",
 "RDC 216/2004, 4.2.2"],

["Sem sinal de insetos, roedores ou pragas (fezes, ninhos, marcas)?",
 "Procure atrás dos equipamentos e nos cantos.","Controle de pragas","loja",
 "Eliminar a infestação por empresa especializada e corrigir o que atrai e abriga as pragas.",
 "RDC 275/2002, 1.16.1 · RDC 216/2004, 4.3.1"],
["Existem barreiras que impedem a entrada e o abrigo de pragas?",
 "Telas, vedação de frestas, portas ajustadas, ralos fechados.","Controle de pragas","loja",
 "Instalar e recuperar as barreiras físicas: telas, vedação de frestas, portas ajustadas e ralos com fechamento.",
 "RDC 275/2002, 1.16.2 · RDC 216/2004, 4.3.2"],
["Dedetização feita por empresa licenciada?",
 "A empresa precisa ter licença sanitária.","Controle de pragas","loja",
 "Contratar empresa especializada e licenciada para o controle químico de vetores e pragas.",
 "RDC 275/2002, 1.16.3 · RDC 216/2004, 4.3.3"],
["Comprovante da dedetização está arquivado e dentro da validade?",
 "Certificado com data e validade.","Controle de pragas","loja",
 "Arquivar o certificado de execução do controle de pragas e renovar o serviço antes do vencimento.",
 "RDC 275/2002, 1.16.3 · RDC 216/2004, 4.3.3"],

["O caminho do alimento evita cruzar o sujo com o limpo?",
 "Do recebimento até a venda, sem retorno nem cruzamento.","Leiaute e fluxo","loja",
 "Reorganizar o fluxo de preparo para que não haja cruzamento entre etapas sujas e limpas.",
 "RDC 275/2002, 1.20.1 · RDC 216/2004, 4.1.1"],
["Recebimento e estoque separados da produção e da expedição?",
 "Áreas distintas.","Leiaute e fluxo","loja",
 "Separar fisicamente as áreas de recebimento e estoque das áreas de produção e expedição.",
 "RDC 275/2002, 1.20.2"],
["Atividades diferentes separadas para evitar contaminação cruzada?",
 "Carne, hortifrúti e produtos prontos não podem se misturar.","Leiaute e fluxo","loja",
 "Separar as atividades por barreira física ou por escalonamento de horário, evitando contaminação cruzada.",
 "RDC 216/2004, 4.1.2"],

["Existe manutenção preventiva programada dos equipamentos, com registro?",
 "Não só o conserto quando quebra.","Manutenção e registros","loja",
 "Implantar cronograma de manutenção preventiva dos equipamentos e registrar cada intervenção.",
 "RDC 275/2002, 2.1.7 · RDC 216/2004, 4.1.16"],
["Balanças e termômetros calibrados, com comprovante?",
 "Certificado de calibração dentro da validade.","Manutenção e registros","loja",
 "Calibrar os instrumentos de medição e arquivar os certificados dentro da validade.",
 "RDC 275/2002, 2.1.8 · RDC 216/2004, 4.1.16"],
["Existe registro da limpeza e da troca de filtros do ar-condicionado?",
 "Deve ficar afixado em local visível.","Manutenção e registros","loja",
 "Implantar e afixar o registro periódico de limpeza dos componentes e troca de filtros da climatização.",
 "RDC 275/2002, 1.14.4 · RDC 216/2004, 4.1.11"],
["Produtos de limpeza têm registro no Ministério da Saúde e ficam em local próprio?",
 "Identificados e longe dos alimentos.","Manutenção e registros","loja",
 "Usar somente saneantes regularizados e guardá-los identificados, em local exclusivo e afastado dos alimentos.",
 "RDC 275/2002, 1.15.4 e 1.15.7 · RDC 216/2004, 4.2.5"],

/* ---------- ESCOPO AMBIENTE: repetidas em CADA área ---------- */
["Piso liso, impermeável e lavável?",
 "Material que permite lavar de verdade.","Piso","ambiente",
 "Substituir o revestimento do piso por material liso, impermeável, lavável e resistente.",
 "RDC 275/2002, 1.4.1 · RDC 216/2004, 4.1.3"],
["Piso sem trinca, buraco, peça solta ou desnível perigoso?",
 "Olhe o piso inteiro da área.","Piso","ambiente",
 "Reparar as trincas, buracos e peças soltas do piso, eliminando desníveis que ofereçam risco.",
 "RDC 275/2002, 1.4.2 · RDC 216/2004, 4.1.3"],
["Ralos sifonados, com grelha e sem acúmulo de resíduo?",
 "O ralo precisa fechar contra pragas.","Piso","ambiente",
 "Instalar ralos sifonados com dispositivo de fechamento e manter a limpeza, garantindo o escoamento.",
 "RDC 275/2002, 1.4.3 · RDC 216/2004, 4.1.5"],

["Parede lisa, impermeável, lavável e de cor clara?",
 "Até a altura das operações.","Paredes e divisórias","ambiente",
 "Revestir a parede com material liso, impermeável, lavável e de cor clara até a altura adequada.",
 "RDC 275/2002, 1.6.1 · RDC 216/2004, 4.1.3"],
["Parede sem infiltração, mofo, rachadura ou reboco descascando?",
 "Procure manchas de umidade.","Paredes e divisórias","ambiente",
 "Tratar a causa da umidade e recuperar o revestimento da parede, eliminando mofo e descascamento.",
 "RDC 275/2002, 1.6.2 · RDC 216/2004, 4.1.3"],
["Encontro entre parede, piso e teto vedado, sem frestas?",
 "Cantos abaulados facilitam a limpeza e não abrigam praga.","Paredes e divisórias","ambiente",
 "Vedar as frestas e executar o abaulamento nos encontros de parede com piso e teto.",
 "RDC 275/2002, 1.6.3"],

["Teto ou forro liso, claro, impermeável e fácil de limpar?",
 "Sem material poroso.","Teto e forro","ambiente",
 "Substituir o forro por material liso, claro, impermeável e de fácil higienização.",
 "RDC 275/2002, 1.5.1 · RDC 216/2004, 4.1.3"],
["Teto sem goteira, mancha de umidade, bolor ou descascamento?",
 "Olhe para cima em toda a área.","Teto e forro","ambiente",
 "Eliminar a origem da goteira ou infiltração e recuperar o forro, removendo bolor e descascamento.",
 "RDC 275/2002, 1.5.2 · RDC 216/2004, 4.1.3"],

["Porta lisa, ajustada ao batente e sem revestimento faltando?",
 "Não pode ter vão embaixo.","Portas","ambiente",
 "Ajustar a porta ao batente, vedar o vão inferior e recuperar o revestimento.",
 "RDC 275/2002, 1.7.1 · RDC 216/2004, 4.1.4"],
["Porta com fechamento automático e barreira contra pragas?",
 "Mola ou sistema equivalente nas áreas de alimento.","Portas","ambiente",
 "Instalar dispositivo de fechamento automático e barreira física contra a entrada de vetores.",
 "RDC 275/2002, 1.7.2 · RDC 216/2004, 4.1.4"],
["Porta sem falha, ferrugem, rachadura ou dobradiça solta?",
 "Abra e feche para conferir.","Portas","ambiente",
 "Reparar ou substituir a porta e as ferragens danificadas.",
 "RDC 275/2002, 1.7.3"],

["Janela lisa, ajustada ao batente e conservada?",
 "Marque Não se aplica se a área não tiver janela.","Janelas e aberturas","ambiente",
 "Ajustar e recuperar a janela e o batente, eliminando falhas de revestimento.",
 "RDC 275/2002, 1.8.1 e 1.8.3"],
["Abertura externa com tela milimetrada contra insetos e roedores?",
 "Inclui a saída do exaustor.","Janelas e aberturas","ambiente",
 "Instalar tela milimetrada em todas as aberturas externas, inclusive no sistema de exaustão.",
 "RDC 275/2002, 1.8.2 · RDC 216/2004, 4.1.4"],
["Tela limpa, sem furo ou rasgo, e removível para limpeza?",
 "Tela furada é o mesmo que não ter tela.","Janelas e aberturas","ambiente",
 "Substituir a tela danificada por modelo removível e implantar a limpeza periódica.",
 "RDC 216/2004, 4.1.4"],

["Iluminação suficiente para trabalhar, sem sombra nem ofuscamento?",
 "Precisa dar para enxergar o alimento de verdade.","Iluminação e instalação elétrica","ambiente",
 "Adequar a iluminação da área ao nível necessário à atividade, sem sombras nem ofuscamento.",
 "RDC 275/2002, 1.13.1 · RDC 216/2004, 4.1.8"],
["Todas as lâmpadas estão funcionando?",
 "Conte as apagadas e diga onde.","Iluminação e instalação elétrica","ambiente",
 "Substituir as lâmpadas queimadas e verificar reatores e circuitos.",
 "RDC 275/2002, 1.13.1 · RDC 216/2004, 4.1.8"],
["Luminária com proteção contra queda e estouro?",
 "Sobre a área de alimento é obrigatório.","Iluminação e instalação elétrica","ambiente",
 "Instalar proteção adequada nas luminárias sobre as áreas de manipulação e armazenamento.",
 "RDC 275/2002, 1.13.2 · RDC 216/2004, 4.1.8"],
["Fiação embutida ou em canaleta fechada, sem fio solto ou desencapado?",
 "Fio exposto é risco elétrico e impede a limpeza.","Iluminação e instalação elétrica","ambiente",
 "Embutir a fiação ou protegê-la em tubulação externa íntegra, eliminando fios soltos e desencapados.",
 "RDC 275/2002, 1.13.3 · RDC 216/2004, 4.1.9"],
["Tomadas e quadro elétrico íntegros, fechados e identificados?",
 "Sem tampa faltando.","Iluminação e instalação elétrica","ambiente",
 "Recuperar tomadas e quadros elétricos, repondo tampas e identificando os circuitos.",
 "RDC 275/2002, 1.13.3 · RDC 216/2004, 4.1.9"],

["Ambiente sem calor excessivo, mofo, fumaça ou condensação no teto?",
 "Gota no teto cai no alimento.","Ventilação e climatização","ambiente",
 "Adequar a ventilação e a renovação de ar para eliminar condensação, fungos e excesso de calor.",
 "RDC 275/2002, 1.14.1 · RDC 216/2004, 4.1.10"],
["Ar-condicionado ou ventilador limpo e funcionando?",
 "Marque Não se aplica se não houver.","Ventilação e climatização","ambiente",
 "Executar a manutenção e a limpeza do equipamento de ventilação artificial.",
 "RDC 275/2002, 1.14.2 · RDC 216/2004, 4.1.11"],
["Exaustor ou coifa funcionando, com filtro limpo?",
 "Marque Não se aplica se não houver.","Ventilação e climatização","ambiente",
 "Recuperar o sistema de exaustão e implantar a limpeza e a troca periódica dos filtros.",
 "RDC 275/2002, 1.14.5 e 1.14.6 · RDC 216/2004, 4.1.11"],
["O ar não sopra direto no alimento nem vem de área suja para área limpa?",
 "Confira a direção da corrente de ar.","Ventilação e climatização","ambiente",
 "Redirecionar o fluxo de ar para que não incida sobre o alimento nem venha de área contaminada.",
 "RDC 275/2002, 1.14.7 · RDC 216/2004, 4.1.10"],

["Escada, elevador de serviço ou monta-carga sem risco de contaminar?",
 "Marque Não se aplica se a área não tiver.","Estruturas auxiliares","ambiente",
 "Adequar a estrutura auxiliar para que não seja fonte de contaminação, vedando frestas e recuperando o revestimento.",
 "RDC 275/2002, 1.9.1"],
["Estrutura auxiliar de material resistente, liso e conservado?",
 "Sem ferrugem nem parte solta.","Estruturas auxiliares","ambiente",
 "Recuperar ou substituir a estrutura por material resistente, liso, impermeável e conservado.",
 "RDC 275/2002, 1.9.2"],

["Bancadas, mesas, prateleiras e estantes íntegras e laváveis?",
 "Sem ferrugem, sem parte solta.","Móveis e superfícies","ambiente",
 "Recuperar ou substituir os móveis por material resistente, impermeável e em bom estado de conservação.",
 "RDC 275/2002, 2.2.1 · RDC 216/2004, 4.1.17"],
["Móveis lisos, sem fresta, rugosidade ou ferrugem?",
 "Fresta acumula sujeira e abriga praga.","Móveis e superfícies","ambiente",
 "Eliminar frestas e rugosidades dos móveis ou substituí-los por modelo de fácil higienização.",
 "RDC 275/2002, 2.2.2 · RDC 216/2004, 4.1.17"],
["Estrados e paletes conservados e afastados da parede e do piso?",
 "Nada de caixa direto no chão.","Móveis e superfícies","ambiente",
 "Repor os estrados danificados e afastar o material estocado da parede e do piso.",
 "RDC 275/2002, 2.2.1 · RDC 216/2004, 4.1.17"],

/* ---------- SÓ NAS CÂMARAS E EXPOSITORES ---------- */
["Termômetro da câmara ou expositor funcionando e visível?",
 "Precisa dar para ler sem abrir.","Refrigeração e câmaras","tipo:camara",
 "Instalar ou substituir o termômetro em local apropriado e de leitura visível.",
 "RDC 275/2002, 2.1.5 · RDC 216/2004, 4.1.16"],
["Temperatura dentro da faixa correta no momento da visita?",
 "Anote a temperatura lida no comentário.","Refrigeração e câmaras","tipo:camara",
 "Regular ou reparar o sistema de refrigeração até restabelecer a temperatura adequada ao produto.",
 "RDC 275/2002, 2.1.5 · RDC 216/2004, 4.1.16"],
["Planilha de registro de temperatura preenchida e em dia?",
 "Confira as últimas datas.","Refrigeração e câmaras","tipo:camara",
 "Implantar e manter o registro periódico das temperaturas, conservando as planilhas.",
 "RDC 275/2002, 2.1.6"],
["Borracha de vedação da porta íntegra, sem rasgo nem ressecamento?",
 "Passe a mão em toda a volta.","Refrigeração e câmaras","tipo:camara",
 "Substituir a borracha de vedação da porta para restabelecer a estanqueidade.",
 "RDC 275/2002, 2.1.4 · RDC 216/2004, 4.1.16"],
["Porta da câmara fecha e veda corretamente?",
 "Fecha sozinha e não fica entreaberta.","Refrigeração e câmaras","tipo:camara",
 "Reparar o alinhamento, as ferragens e o sistema de fechamento da porta da câmara.",
 "RDC 275/2002, 2.1.4 · RDC 216/2004, 4.1.4"],
["Sem acúmulo de gelo no evaporador, no teto ou no piso?",
 "Gelo demais indica defeito.","Refrigeração e câmaras","tipo:camara",
 "Executar o degelo e a manutenção do sistema, corrigindo a causa do acúmulo de gelo.",
 "RDC 275/2002, 2.1.4 · RDC 216/2004, 4.1.16"],
["Dreno da câmara desobstruído, sem água parada no piso?",
 "Água no chão da câmara é risco de queda e contaminação.","Refrigeração e câmaras","tipo:camara",
 "Desobstruir e adequar o dreno da câmara, eliminando o acúmulo de água no piso.",
 "RDC 275/2002, 1.4.3 · RDC 216/2004, 4.1.5"],
["Iluminação interna da câmara funcionando e protegida?",
 "Lâmpada sem proteção não pode.","Refrigeração e câmaras","tipo:camara",
 "Restabelecer a iluminação interna com luminária protegida contra quedas e estouros.",
 "RDC 275/2002, 1.13.2 · RDC 216/2004, 4.1.8"],
["Cortina de ar ou cortina de PVC íntegra e completa?",
 "Marque Não se aplica se não houver.","Refrigeração e câmaras","tipo:camara",
 "Repor as tiras faltantes ou recuperar a cortina, restabelecendo a barreira contra troca de ar e vetores.",
 "RDC 275/2002, 1.7.2 · RDC 216/2004, 4.1.4"],
["Superfícies internas lisas, impermeáveis e sem ferrugem?",
 "Piso, parede, teto e prateleiras da câmara.","Refrigeração e câmaras","tipo:camara",
 "Recuperar as superfícies internas, eliminando ferrugem e restabelecendo o revestimento liso e impermeável.",
 "RDC 275/2002, 2.1.3 · RDC 216/2004, 4.1.15"],

/* ---------- SÓ EM BANHEIROS E VESTIÁRIOS ---------- */
["Banheiro ou vestiário sem comunicação direta com área de alimentos?",
 "Nem pela porta, nem pela exaustão.","Banheiros e vestiários","tipo:sanitario",
 "Eliminar a comunicação direta com as áreas de preparo, armazenamento e refeições.",
 "RDC 275/2002, 1.10.5 · RDC 216/2004, 4.1.12"],
["Porta com fechamento automático?",
 "Mola ou sistema equivalente.","Banheiros e vestiários","tipo:sanitario",
 "Instalar dispositivo de fechamento automático na porta externa do sanitário.",
 "RDC 275/2002, 1.10.6 · RDC 216/2004, 4.1.12"],
["Vaso, mictório e pia íntegros e em número suficiente?",
 "Conte pelo número de funcionários.","Banheiros e vestiários","tipo:sanitario",
 "Reparar ou substituir as peças danificadas e adequar a quantidade ao número de funcionários.",
 "RDC 275/2002, 1.10.3"],
["Pia com água corrente, sabonete líquido e papel toalha não reciclado?",
 "Os três juntos.","Banheiros e vestiários","tipo:sanitario",
 "Suprir o sanitário com sabonete líquido inodoro antisséptico e papel toalha não reciclado, com água corrente.",
 "RDC 275/2002, 1.10.9 · RDC 216/2004, 4.1.13"],
["Lixeira com tampa e pedal, sem precisar encostar a mão?",
 "Acionamento não manual.","Banheiros e vestiários","tipo:sanitario",
 "Substituir por coletor com tampa e acionamento sem contato manual.",
 "RDC 275/2002, 1.10.10 · RDC 216/2004, 4.1.13"],
["Cartaz de como lavar as mãos afixado?",
 "Precisa estar visível na pia.","Banheiros e vestiários","tipo:sanitario",
 "Afixar cartaz com o procedimento correto de lavagem das mãos em local visível.",
 "RDC 275/2002, 1.10.12"],
["Armário individual para cada funcionário?",
 "Para os pertences pessoais.","Banheiros e vestiários","tipo:sanitario",
 "Instalar armários individuais em número suficiente para todos os manipuladores.",
 "RDC 275/2002, 1.10.13"],
["Chuveiro em número suficiente e funcionando?",
 "Marque Não se aplica se a atividade não exigir.","Banheiros e vestiários","tipo:sanitario",
 "Instalar ou reparar os chuveiros em número compatível com o quadro de funcionários.",
 "RDC 275/2002, 1.10.14"],

/* ---------- SÓ NAS ÁREAS DE MANIPULAÇÃO ---------- */
["Existe lavatório exclusivo para as mãos na área, em posição acessível?",
 "Não vale a pia de lavar louça ou alimento.","Áreas de manipulação","tipo:producao",
 "Instalar lavatório exclusivo para higiene das mãos, em posição estratégica no fluxo de preparo.",
 "RDC 275/2002, 1.12.1 · RDC 216/2004, 4.1.14"],
["Lavatório com sabonete líquido, papel toalha e coletor sem contato manual?",
 "Os três juntos, sempre abastecidos.","Áreas de manipulação","tipo:producao",
 "Suprir o lavatório com sabonete líquido antisséptico, papel toalha não reciclado e coletor de acionamento não manual.",
 "RDC 275/2002, 1.12.2 · RDC 216/2004, 4.1.14"],
["Torneira de acionamento automático, sem encostar a mão?",
 "Pedal, sensor ou cotovelo.","Áreas de manipulação","tipo:producao",
 "Substituir a torneira por modelo de acionamento automático ou sem contato manual.",
 "RDC 275/2002, 1.12.1 · RDC 216/2004, 4.1.14"],
["Equipamentos em bom estado de conservação e funcionamento?",
 "Serra, moedor, fatiador, forno, masseira, balança.","Áreas de manipulação","tipo:producao",
 "Executar a manutenção corretiva dos equipamentos e substituir o que não tiver reparo.",
 "RDC 275/2002, 2.1.4 · RDC 216/2004, 4.1.15"],
["Equipamentos dispostos com espaço para limpar em volta?",
 "Precisa dar para passar atrás e embaixo.","Áreas de manipulação","tipo:producao",
 "Reposicionar os equipamentos garantindo acesso para higienização em toda a volta.",
 "RDC 275/2002, 2.1.2"],
["Superfície que toca o alimento lisa, sem trinca e sem ferrugem?",
 "Tábuas, mesas, bandejas, esteiras.","Áreas de manipulação","tipo:producao",
 "Substituir as superfícies de contato por material liso, impermeável, resistente à corrosão e não contaminante.",
 "RDC 275/2002, 2.1.3 · RDC 216/2004, 4.1.15"],
["Utensílios de material adequado, sem madeira nem plástico rachado?",
 "Material não pode soltar resíduo no alimento.","Áreas de manipulação","tipo:producao",
 "Substituir os utensílios por material não contaminante, resistente à corrosão e de fácil higienização.",
 "RDC 275/2002, 2.3.1 · RDC 216/2004, 4.1.15"],
["Utensílios guardados em local protegido e organizado?",
 "Não podem ficar expostos.","Áreas de manipulação","tipo:producao",
 "Definir local apropriado e protegido para o armazenamento organizado dos utensílios.",
 "RDC 275/2002, 2.3.2"],
["Área livre de objeto sem uso ou estranho ao ambiente?",
 "Caixa vazia, equipamento quebrado, item pessoal.","Áreas de manipulação","tipo:producao",
 "Retirar da área os objetos em desuso e estranhos ao ambiente, destinando-os a local próprio.",
 "RDC 275/2002, 1.3.1 · RDC 216/2004, 4.1.7"],
["Higienização da área feita e registrada na frequência definida?",
 "Confira a planilha.","Áreas de manipulação","tipo:producao",
 "Definir a frequência de higienização da área e implantar o registro de cada execução.",
 "RDC 275/2002, 1.15.2 e 1.15.3 · RDC 216/2004, 4.2.1"],
["Produtos e material de limpeza guardados fora da área de alimento?",
 "Identificados e separados.","Áreas de manipulação","tipo:producao",
 "Remover os saneantes da área de alimentos e guardá-los identificados em local exclusivo.",
 "RDC 275/2002, 1.15.7 · RDC 216/2004, 4.2.5"],
["Panos, escovas e esponjas em bom estado e próprios para a área?",
 "Sem pano velho ou esponja rasgada.","Áreas de manipulação","tipo:producao",
 "Substituir os utensílios de higienização danificados e destinar um jogo exclusivo por área.",
 "RDC 275/2002, 1.15.8 · RDC 216/2004, 4.2.1"],

/* ---------- SÓ NA ÁREA DE LIXO ---------- */
["Lixeira com tampa e acionamento por pedal?",
 "Sem precisar encostar a mão.","Resíduos","tipo:residuo",
 "Substituir os coletores por modelo com tampa e acionamento não manual.",
 "RDC 275/2002, 1.18.1 · RDC 216/2004, 4.1.17"],
["Lixo retirado com frequência, sem acúmulo na área?",
 "Nada de saco acumulado.","Resíduos","tipo:residuo",
 "Estabelecer a frequência de retirada dos resíduos e cumpri-la, evitando acúmulo.",
 "RDC 275/2002, 1.18.2 · RDC 216/2004, 4.2.2"],
["Existe área específica para guardar o lixo até a coleta?",
 "Fora da área de alimentos.","Resíduos","tipo:residuo",
 "Destinar área exclusiva e adequada para a estocagem dos resíduos até a coleta.",
 "RDC 275/2002, 1.18.3"],
["Área de lixo limpa, fechada e protegida de pragas?",
 "Não pode atrair rato nem inseto.","Resíduos","tipo:residuo",
 "Higienizar e vedar a área de resíduos, eliminando o acesso e o abrigo de vetores e pragas.",
 "RDC 275/2002, 1.18.3 e 1.16.2 · RDC 216/2004, 4.3.2"],

/* ---------- FECHO (não conta na nota) ---------- */
["Data da inspeção","Dia em que a inspeção foi feita.","Fecho","loja","","","data",0],
["Observações gerais da inspeção","Qualquer ponto que não coube nas perguntas.","Fecho","loja","","","texto",0],
["Responsável pela inspeção","Assinatura da Responsável Técnica.","Fecho","loja","","","assinatura",0]
];

/* RÉGUA DA NOTA — Saccol et al. (2006), adaptada da RDC 216/2004 */
function ckClassifica(pct){
  if(pct==null)return {rot:"—",cor:"#8a8b96",grupo:""};
  if(pct>=91)return {rot:"Muito bom",cor:"#12b76a",grupo:"Grupo 1"};
  if(pct>=70)return {rot:"Bom",      cor:"#4d9a2a",grupo:"Grupo 2"};
  if(pct>=50)return {rot:"Regular",  cor:"#b3730a",grupo:"Grupo 3"};
  if(pct>=20)return {rot:"Ruim",     cor:"#e5484d",grupo:"Grupo 4"};
  return {rot:"Muito ruim",cor:"#c0212a",grupo:"Grupo 5"};
}

/* ---------- CRIAR O MODELO ---------- */
async function ckModeloInfra2(){
  if(!currentStore){toast("Escolha uma empresa primeiro");return;}
  const ja=ckModelos().find(m=>(m.titulo||"").trim()===CK_INFRA2_NOME);
  if(ja){
    if(!confirm("Você já tem o checklist \""+CK_INFRA2_NOME+"\".\n\n"
      +"Criar OUTRO igual? (o que você já tem continua guardado)"))
      {ckAbrirConstrutor(ja.uid);return;}
  }
  const o={uid:newUid(),mod:nowISO(),tipo:"ckm",loja:ckLojaBase(),escopo:"",
    criado:"modelo",criadoEm:today(),ordem:ckModelos().length,ativo:true,
    titulo:CK_INFRA2_NOME,
    descricao:"Checklist completo de infraestrutura, com as perguntas da RDC 216/2004 e da "
      +"Lista de Verificação da RDC 275/2002 (Anexo II). Cada resposta 👎 já abre o plano de "
      +"ação com a correção sugerida pela própria norma.",
    perguntas:CK_MODELO_INFRA2.map(([t,d,sec,esc,acao,legal,tipo,peso],i)=>({
      uid:newUid(),titulo:t,descricao:d,secao:sec,escopoP:esc,
      acaoPadrao:acao||"",baseLegal:legal||"",
      tipoResp:tipo||"simnao",opcoesLista:"",
      na:true,coment:"inconforme",foto:"opcional",
      peso:peso==null?1:peso,ordem:i,removida:false}))};
  o.id=await putItem(o);DATA.push(o);dataChanged();
  CK_SEC="formularios";renderCk();ckAbrirConstrutor(o.uid);
  toast("Checklist criado ✓ "+CK_MODELO_INFRA2.length+" perguntas");
}
const CK_INFRA2_NOME="Infraestrutura e Manutenção 2";

/* =======================================================================
   TELA 1 — TIPOS DE AMBIENTE
   Diz ao site o que é cada área, para ele saber quais perguntas fazer nela.
   O site SUGERE pelo nome; quem decide é ela.
   ======================================================================= */
async function ckAmbientes(){
  if(!currentStore){toast("Escolha uma empresa primeiro");return;}
  await ckAmbCarregar();
  ckAmbDesenha();
}
function ckAmbDesenha(){
  const areas=ckAreasDaLoja();
  const conta={};
  for(const a of areas){const t=ckTipoDaArea(a);conta[t]=(conta[t]||0)+1;}
  const defin=areas.filter(a=>CK_AMB[a]).length;
  ncModal(`<h2>O que é cada área de ${esc(nomeCurto((empresa(currentStore)||{}).name||currentStore))}?</h2>
    <p class="desc">O site precisa saber o que é cada lugar para perguntar só o que faz sentido:
    numa <b>câmara</b> ele pergunta do termômetro e da borracha da porta; num <b>banheiro</b>,
    do papel toalha e da lixeira de pedal. Já deixei tudo sugerido pelo nome —
    <b>confira e corrija o que estiver errado</b>.</p>

    <div class="ck-amb-resumo">
      ${Object.keys(CK_TIPOS_AMB).filter(t=>conta[t]).map(t=>
        `<span class="ck-amb-chip" style="border-color:${CK_TIPOS_AMB[t].cor}">
           ${CK_TIPOS_AMB[t].ico} ${esc(CK_TIPOS_AMB[t].rotulo)} <b>${conta[t]}</b></span>`).join("")}
    </div>
    <p class="ck-amb-cont">${areas.length} áreas · <b>${defin}</b> já confirmadas por você
      · ${areas.length-defin} ainda no palpite do site</p>

    <div class="ck-amb-lista">
      ${areas.map(a=>{
        const t=ckTipoDaArea(a),meu=!!CK_AMB[a];
        return `<div class="ck-amb-lin${meu?" ok":""}">
          <span class="nm" title="${esc(a)}">${esc(a)}</span>
          <select onchange="ckAmbSet('${esc(a).replace(/'/g,"&#39;")}',this.value)">
            ${Object.keys(CK_TIPOS_AMB).map(k=>
              `<option value="${k}"${t===k?" selected":""}>${CK_TIPOS_AMB[k].ico} ${esc(CK_TIPOS_AMB[k].rotulo)}</option>`).join("")}
          </select></div>`;}).join("")}
    </div>
    <div class="form-actions">
      <button class="btn ghost" onclick="ckAmbConfirmarTodos()">✔ Aceitar todas as sugestões</button>
      <button class="btn" onclick="ncFechar()">Pronto</button>
    </div>`);
}
async function ckAmbSet(area,tipo){
  CK_AMB[String(area)]=tipo;await ckAmbSalvar();ckAmbDesenha();
}
async function ckAmbConfirmarTodos(){
  for(const a of ckAreasDaLoja())if(!CK_AMB[a])CK_AMB[a]=ckSugerirTipo(a);
  await ckAmbSalvar();ckAmbDesenha();toast("Todas as áreas confirmadas ✓");
}

/* =======================================================================
   TELA 2 — TRIAGEM: ligar as não conformidades já existentes às perguntas
   GARANTIAS: nada é criado, nada é apagado, nada some. Só grava `perguntaRef`
   em itens que já existem. O contador no topo é a prova.
   ======================================================================= */
const CK_FORA="__fora";   /* marcador: conferido por ela, não é infraestrutura */

function ckItensMnt(){
  return DATA.filter(d=>!d.deleted&&d.tipo==="mnt"&&d.loja===currentStore);
}
function ckNCsDaPergunta(qUid,area){
  return ckItensMnt().filter(d=>d.perguntaRef===qUid&&(!area||String(d.area||"").trim()===area));
}
/* palavras que ligam o texto da NC a uma seção do checklist */
const CK_TEMAS=[
  [/l[aâ]mpad|ilumina|lumin[aá]r|reator|refletor/i,"Iluminação e instalação elétrica"],
  [/el[eé]tric|tomada|fia[cç][aã]o|disjuntor|quadro de|fio |desencapad|curto|energia/i,"Iluminação e instalação elétrica"],
  [/c[aâ]mara|freezer|geladeira|refrigera|compressor|termostato|term[oô]metro|expositor|ilha|resfriad|congelad|gelo|degelo|borracha|veda[cç][aã]o/i,"Refrigeração e câmaras"],
  [/piso|azulejo|ladrilho|cer[aâ]mic|rejunte|desn[ií]vel|buraco no ch[aã]o|ralo/i,"Piso"],
  [/parede|divis[oó]r|infiltra|mofo|bolor|reboco|fresta|vedad|rachadura|trinca/i,"Paredes e divisórias"],
  [/teto|forro|goteira|telhado/i,"Teto e forro"],
  [/porta|batente|dobradi[cç]|fechadura|mola|cortina de ar/i,"Portas"],
  [/janela|tela |telas |milimetr|basculante/i,"Janelas e aberturas"],
  [/torneira|pia |pias|vazamento|encanamento|cano|esgoto|caixa de gordura|bomba|hidr[aá]ul|sif[aã]o|descarga|vaso sanit|v[aá]lvula|[aá]gua/i,"Abastecimento de água"],
  [/exaust|ventila|ar.condicionado|climatiz|coifa|duto|filtro/i,"Ventilação e climatização"],
  [/banheiro|sanit[aá]rio|vestiario|vestiário|privada|mict[oó]rio|chuveiro|papel toalha|dispen|arm[aá]rio individual/i,"Banheiros e vestiários"],
  [/bancada|mesa|estante|prateleira|arm[aá]rio|g[oô]ndola|vitrine|estrado|palete|balc[aã]o/i,"Móveis e superfícies"],
  [/praga|inseto|rato|roedor|barata|mosca|dedetiz|desratiz/i,"Controle de pragas"],
  [/lixeira|lixo|res[ií]duo|coletor|papel[aã]o/i,"Resíduos"],
  [/balan[cç]a|serra|moedor|fatiad|amaciad|forno|masseira|cilindro|batedeira|selador|embalador|utens[ií]lio|bandeja|faca|m[aá]quina/i,"Áreas de manipulação"],
  [/elevador|escada|monta.carga/i,"Estruturas auxiliares"],
  [/estacionamento|p[aá]tio|muro|port[aã]o|fachada|calha|externa/i,"Área externa e acessos"],
  [/contraflux|fluxo|leiaute|layout/i,"Leiaute e fluxo"]
];
function ckSecSugerida(texto){
  for(const [rx,sec] of CK_TEMAS)if(rx.test(texto))return sec;
  return "";
}
/* palavras que Lê usa no dia a dia e que a norma escreve de outro jeito */
const CK_SINON={
  privada:"vaso",bacia:"vaso",descarga:"vaso",
  lampada:"lampadas",lampadas:"lampadas",queimada:"lampadas",reator:"lampadas",
  palete:"estrados",estrado:"estrados",
  descascando:"descascamento",descascada:"descascamento",
  gelo:"gelo",dreno:"dreno",borracha:"borracha",termometro:"termometro",
  mola:"fechamento",dispenser:"papel",dispenrs:"papel",
  fresta:"frestas",vedar:"frestas",vedacao:"frestas",
  mofo:"mofo",goteira:"goteira",inox:"ferrugem",enferrujad:"ferrugem",
  fio:"fios",fiacao:"fiacao",desencapad:"desencapado",disjuntor:"quadro",
  tela:"tela",exaustor:"exaustao",coifa:"exaustao"
};
/* radical: corta o fim da palavra, para "descascando" casar com "descascamento" */
const ckRad=w=>w.slice(0,6);
function ckTokens(s){
  const t=semAcento(String(s||"").toLowerCase()).split(/[^a-z0-9]+/).filter(w=>w.length>=4);
  const out=new Set();
  for(const w of t){out.add(ckRad(w));if(CK_SINON[w])out.add(ckRad(CK_SINON[w]));}
  return out;
}
/* dentro da seção sugerida, escolhe a pergunta cujo texto mais casa com a não conformidade */
function ckPerguntaSugerida(item,perg){
  /* a ÁREA escolhe a seção; o casamento fino usa só o texto da não conformidade.
     Senão "BANHEIRO" no nome da área faz vencer qualquer pergunta que diga "banheiro". */
  const alvo=ckTokens(item.nc||"");
  const sec=ckSecSugerida((item.nc||"")+" "+(item.area||""));
  const cand=sec?perg.filter(q=>q.secao===sec):perg;
  if(!cand.length)return "";
  /* palavra que aparece em quase toda pergunta da seção não distingue nada
     ("teto" na seção Teto). A rara é que decide ("descascamento"). */
  const freq={};
  for(const q of cand)for(const r of ckTokens((q.titulo||"")+" "+(q.descricao||"")))freq[r]=(freq[r]||0)+1;
  const peso=r=>freq[r]>cand.length/2?1:3;
  let melhor=cand[0],score=-1;
  for(const q of cand){
    let s=0;
    for(const r of ckTokens(q.titulo))if(alvo.has(r))s+=2*peso(r);
    for(const r of ckTokens(q.descricao))if(alvo.has(r))s+=peso(r);
    if(s>score){score=s;melhor=q;}
  }
  return melhor.uid;
}

let CK_TRI_MODELO="",CK_TRI_FILTRO="pendentes";
async function ckTriagem(modeloUid){
  if(!currentStore){toast("Escolha uma empresa primeiro");return;}
  const m=modeloUid?ckAchar(modeloUid):ckModelos().find(x=>(x.titulo||"").trim()===CK_INFRA2_NOME);
  if(!m){toast("Crie o checklist \""+CK_INFRA2_NOME+"\" primeiro");return;}
  CK_TRI_MODELO=m.uid;await ckAmbCarregar();ckTriDesenha();
}
function ckTriDesenha(){
  const m=ckAchar(CK_TRI_MODELO);if(!m)return ncFechar();
  const perg=ckPerguntas(m).filter(q=>q.peso!==0);
  const todos=ckItensMnt();
  const classif=todos.filter(d=>d.perguntaRef&&d.perguntaRef!==CK_FORA).length;
  const fora=todos.filter(d=>d.perguntaRef===CK_FORA).length;
  const faltam=todos.length-classif-fora;
  let lista=todos.filter(d=>!d.perguntaRef);
  if(CK_TRI_FILTRO==="todos")lista=todos;
  if(CK_TRI_FILTRO==="fora")lista=todos.filter(d=>d.perguntaRef===CK_FORA);
  /* as difíceis primeiro: as que o site não conseguiu adivinhar */
  lista=[...lista].sort((a,b)=>{
    const sa=ckSecSugerida((a.nc||"")+" "+(a.area||""))?1:0;
    const sb=ckSecSugerida((b.nc||"")+" "+(b.area||""))?1:0;
    return sa-sb||String(a.area||"").localeCompare(String(b.area||""));
  });
  const secoes=[...new Set(perg.map(q=>q.secao))];
  const optPerg=q=>`<option value="${q.uid}">${esc((q.titulo||"").slice(0,70))}</option>`;
  ncModal(`<h2>Ligar as manutenções às perguntas — ${esc(nomeCurto((empresa(currentStore)||{}).name||currentStore))}</h2>
    <p class="desc">Cada não conformidade que você já tem vira a <b>prova</b> de uma pergunta do
    checklist. Nada é criado e nada é apagado: só estou dizendo a qual pergunta cada uma pertence.
    O site já chutou pelo texto — <b>confira e corrija</b>.</p>

    <div class="ck-tri-cont">
      <span class="ok"><b>${classif}</b> ligadas</span>
      <span class="fora"><b>${fora}</b> fora do escopo</span>
      <span class="${faltam?"falta":"ok"}"><b>${faltam}</b> a fazer</span>
      <span class="tot">de <b>${todos.length}</b> no total</span>
    </div>

    <div class="ck-tri-barra">
      <button class="btn ghost sm${CK_TRI_FILTRO==="pendentes"?" on":""}" onclick="CK_TRI_FILTRO='pendentes';ckTriDesenha()">A fazer</button>
      <button class="btn ghost sm${CK_TRI_FILTRO==="todos"?" on":""}" onclick="CK_TRI_FILTRO='todos';ckTriDesenha()">Todas</button>
      <button class="btn ghost sm${CK_TRI_FILTRO==="fora"?" on":""}" onclick="CK_TRI_FILTRO='fora';ckTriDesenha()">Fora do escopo</button>
      <button class="btn sm" onclick="ckTriAceitarTudo()" title="Aceitar de uma vez todos os palpites do site">✨ Aceitar os palpites</button>
    </div>

    <div class="ck-tri-lista">
      ${lista.length?lista.slice(0,400).map(d=>{
        const sug=d.perguntaRef||ckPerguntaSugerida(d,perg);
        return `<div class="ck-tri-lin${d.perguntaRef?" ok":""}">
          <div class="tx">
            <b>${esc(d.nc||"(sem texto)")}</b>
            <span class="meta">${esc(d.area||"sem área")} · ${esc(d.status||"")}</span>
          </div>
          <select onchange="ckTriSet('${d.uid}',this.value)">
            <option value="">— ainda não ligada —</option>
            ${secoes.map(s=>`<optgroup label="${esc(s)}">
              ${perg.filter(q=>q.secao===s).map(q=>
                optPerg(q).replace(`value="${q.uid}"`,`value="${q.uid}"${sug===q.uid?" selected":""}`)).join("")}
            </optgroup>`).join("")}
            <option value="${CK_FORA}"${d.perguntaRef===CK_FORA?" selected":""}>— não é infraestrutura —</option>
          </select>
        </div>`;}).join(""):`<p class="desc">Nada aqui. 🎉</p>`}
      ${lista.length>400?`<p class="desc">Mostrando as 400 primeiras de ${lista.length}. Vá salvando que as próximas aparecem.</p>`:""}
    </div>
    <div class="form-actions"><button class="btn" onclick="ncFechar()">Fechar</button></div>`);
}
async function ckTriSet(uid,qUid){
  const d=ckAchar(uid);if(!d)return;
  d.perguntaRef=qUid||"";d.mod=nowISO();
  await putItem(d);dataChanged();ckTriDesenha();
}
async function ckTriAceitarTudo(){
  const m=ckAchar(CK_TRI_MODELO);if(!m)return;
  const perg=ckPerguntas(m).filter(q=>q.peso!==0);
  const alvo=ckItensMnt().filter(d=>!d.perguntaRef);
  if(!alvo.length){toast("Nada pendente");return;}
  if(!confirm("Aceitar o palpite do site para "+alvo.length+" manutenção(ões)?\n\n"
    +"Nada é apagado. Você pode corrigir uma a uma depois."))return;
  if(typeof dgPodeGravarEmMassa==="function"&&!dgPodeGravarEmMassa(alvo.length))return;
  for(const d of alvo){
    const q=ckPerguntaSugerida(d,perg);
    if(!q)continue;
    d.perguntaRef=q;d.mod=nowISO();await putItem(d);
  }
  dataChanged();ckTriDesenha();toast(alvo.length+" ligadas ✓ Confira as que ficaram estranhas");
}

/* ---- transferir para a aba de Não Conformidades (o que é de manipulação) ---- */
async function ckTransferirNC(){
  const alvo=ckItensMnt().filter(d=>d.perguntaRef===CK_FORA);
  if(!alvo.length){toast("Nenhum item marcado como \"não é infraestrutura\"");return;}
  ncModal(`<h2>Transferir para o Relatório de Não Conformidade</h2>
    <p class="desc">Estes ${alvo.length} itens você marcou como <b>não sendo de infraestrutura</b> —
    são de manipulação e boas práticas. Eles saem da aba Manutenções e Elétrica e passam para a
    aba de Não Conformidade, onde é o lugar deles. O texto vai inteiro; a <b>urgência e o piso
    ficam em branco</b> para você preencher lá.</p>
    <div class="ck-tri-lista">
      ${alvo.map(d=>`<div class="ck-tri-lin"><div class="tx"><b>${esc(d.nc||"")}</b>
        <span class="meta">${esc(d.area||"sem área")}</span></div></div>`).join("")}
    </div>
    <div class="form-actions">
      <button class="btn ghost" onclick="ncFechar()">Cancelar</button>
      <button class="btn" onclick="ckTransferirNCFazer()">Transferir os ${alvo.length}</button>
    </div>`);
}
async function ckTransferirNCFazer(){
  const alvo=ckItensMnt().filter(d=>d.perguntaRef===CK_FORA);
  if(!alvo.length)return;
  if(typeof dgPodeGravarEmMassa==="function"&&!dgPodeGravarEmMassa(alvo.length))return;
  for(const d of alvo){
    d.tipo="nc";
    d.texto_bruto=d.nc||"";
    d.texto_tecnico=d.texto_tecnico||"";
    d.pontos=d.pontos||[];
    d.urgencia=d.urgencia||"";        /* ela define depois, na aba de NC */
    d.piso=d.piso||"";
    d.revisar=true;                   /* nasce marcada para ela revisar */
    d.obs=[d.obs,"Veio da aba Manutenções e Elétrica em "+brDate(today())].filter(Boolean).join(" · ");
    d.perguntaRef="";
    d.mod=nowISO();d.atualizacao=today();
    await putItem(d);
  }
  dataChanged();ncFechar();
  toast(alvo.length+" transferidas ✓ Estão na aba de Não Conformidade, marcadas para revisar");
}
