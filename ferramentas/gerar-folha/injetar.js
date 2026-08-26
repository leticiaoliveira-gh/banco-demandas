/* =================================================================
   FERRAMENTA DE TRABALHO — não faz parte do site.

   O gerar.py cola este arquivo no fim de uma CÓPIA do index.html. Por
   isso aqui dentro tudo já existe: DATA, M28F, m28Imprimir, EMPRESAS.

   POR QUE NUMA PÁGINA SÓ
   As duas primeiras tentativas falharam por motivos diferentes, e as duas
   ensinaram a mesma coisa:
     1. carregar só app.js + mnt28.js numa página vazia — o app.js procura
        os campos do index.html ao carregar e morre sem eles;
     2. carregar o index.html num quadro e mandar de fora — as variáveis do
        site são `let`, que não vira propriedade do window: de fora elas
        nem existem. E o Chrome imprimia antes de a folha ficar pronta.
   Rodando DENTRO de uma cópia do index, o escopo é o mesmo do site e não
   há nada para sincronizar: quando esta página termina, a folha está lá.

   A folha continua sendo montada pelo js/mnt28.js de verdade. Refazê-la
   em Python daria uma folha parecida, nunca a mesma — a paginação mede
   altura de bloco no navegador, e ela assina esse papel com o CRN.
   ================================================================= */
(function(){
  var p = new URLSearchParams(location.search);

  function morrer(t){
    document.title = "ERRO";
    document.body.innerHTML = '<pre style="font:14px system-ui;color:#b42318;padding:16px;'
      + 'white-space:pre-wrap">ERRO: ' + t + '</pre>';
  }
  if (typeof DADOS_DA_FOLHA === "undefined") return morrer("faltou dados-da-folha.js");
  if (typeof m28Imprimir !== "function")     return morrer("o site não carregou a folha");

  var itens = DADOS_DA_FOLHA.itens;

  /* O CORTE. Para a via de julho: a folha não pode mostrar o que ainda não
     existia naquele dia, senão deixa de ser prova e vira ficção. */
  var corte = p.get("corte");
  if (corte){
    itens = itens.filter(function(d){
      var quando = (d.dataRegistro || d.relato || "").slice(0,10);
      return !quando || quando <= corte;
    });
  }

  /* EM BRANCO: os quadradinhos saem todos vazios, mesmo o do que ja esta feito
     no site. E' a via que ela leva a empresa e marca a mao -- papel que ja chega
     marcado nao prova serviço nenhum. O banco nao muda: a copia e' so daqui. */
  if (p.get("embranco")){
    itens = itens.map(function(d){
      var c = Object.assign({}, d);
      c.feito = false;
      return c;
    });
  }

  DATA = itens;
  currentStore = p.get("loja") || DADOS_DA_FOLHA.loja || "";
  currentStoreName = DADOS_DA_FOLHA.nomeLoja || "";
  currentTipo = "mnt28";
  if (DADOS_DA_FOLHA.rtInfo) RT_INFO = DADOS_DA_FOLHA.rtInfo;

  if (Array.isArray(EMPRESAS) && DADOS_DA_FOLHA.nomeLoja &&
      !EMPRESAS.some(function(e){ return e.code === currentStore; })){
    EMPRESAS.push({code: currentStore, name: DADOS_DA_FOLHA.nomeLoja});
  }

  M28F.piso = p.get("piso") || "";
  M28F.area = p.get("area") || "";
  M28F.exec = p.get("exec") || "";
  M28F.ver  = p.get("ver")  || "todos";

  /* o mês da faixa vem da data de emissão. Sem mandar uma, valeria a que ela
     gravou no site — de julho — e a folha de agosto sairia dizendo julho. */
  M28_CAB = Object.assign({}, DADOS_DA_FOLHA.cabecalho || {});
  var emitido = p.get("emitido") || corte;
  if (emitido) M28_CAB.emitidoEm = emitido;
  if (DADOS_DA_FOLHA.textos && Object.keys(DADOS_DA_FOLHA.textos).length)
    M28_TXT = DADOS_DA_FOLHA.textos;

  /* m28Imprimir escreve numa janela nova. Aqui a janela é ESTA página: o
     doc.open()/write() dela troca o conteúdo, e o paginador do site entra no
     body e roda — tudo no mesmo lugar, sem nada para esperar de fora. */
  var falhou = null;
  var abrirAntigo = window.open, alertaAntigo = window.alert;
  window.open  = function(){ return window; };
  window.alert = function(t){ falhou = t; };
  window.print = function(){};          /* o Chrome imprime; a página não pede */
  try { m28Imprimir(); } catch(e){ falhou = e.message; }
  window.open = abrirAntigo; window.alert = alertaAntigo;

  if (falhou) return morrer(falhou);

  /* o aviso é recado para quem imprime à mão pelo site; no PDF ele só ocupa
     o alto da primeira página */
  setTimeout(function(){
    var a = document.querySelector(".aviso");
    if (a) a.remove();
    document.title = "folha pronta";
  }, 50);
})();
