# PROMPT PARA O PRÓXIMO CHAT — Central de Demandas NP

> Copie TUDO daqui para baixo e cole na primeira mensagem do chat novo.

---

Leia o arquivo **CONTINUIDADE.md** na raiz deste repositório (banco-demandas) antes de
responder — ele tem o histórico completo. Este prompt é o resumo do estado atual.

## QUEM É A LETÍCIA E COMO TRABALHAR COM ELA (regras inegociáveis)

- **PT-BR sempre.** Ela **não programa**: nada de jargão, nada de explicar código.
- **Passo a passo minucioso**, dizendo exatamente onde clicar. UM passo por vez.
- **MONTE PRIMEIRO, ela confirma vendo.** Ela disse: *"eu só consigo entender vendo e
  lendo"*. Não encher de perguntas — implementar, testar e mostrar pronto.
- **NUNCA publicar sem testar** no site no ar.
- **NÃO concordar automaticamente** com ela: avaliar tecnicamente e dizer com franqueza.
- **Nunca refazer do zero** — só edições incrementais.
- Ela se frustra (com razão) quando um ponto já explicado é esquecido.
- **Celular = iPhone.** Samsung e Lenovo são notebooks. PC do trabalho é compartilhado.
- Exportações/backups sempre em
  `Desktop\CLAUDE (CENTRAL)\- BACKUPS\Backups - Relatório Não Conformidades`.

### AS DUAS REGRAS QUE ELA MAIS COBROU (4x, em caixa alta)
1. **ABSOLUTAMENTE TUDO TEM QUE SER EDITÁVEL** por ela, pela interface, sem mexer em
   código — textos, títulos, rótulos e **as opções dos filtros**. Toda tela nova nasce
   com caminho de edição. Marcar textos novos com `data-txt="chave"`.
   ⚠️ Mas **editável ≠ editável por acidente**: configuração (nome de aba, de empresa)
   só muda dentro do MODO EDIÇÃO. Conteúdo (demandas, itens) edita direto.
2. **Configuração feita para uma aba vale para TODAS.** Não perguntar isso de novo.

## O SITE HOJE

https://leticiaoliveira-gh.github.io/banco-demandas/ — **versão 7.7**, cache do sw em
**v47**. Publicar = commit direto na `main`.
**A cada deploy, bumpar os dois: `?v=NN` no index.html E o `CACHE` no sw.js.**
**E atualizar `status.json`** (é o "Onde paramos" da capa) — regra fixa.
GitHub Pages tem cache de até 10 min: esperar e revalidar antes de achar que quebrou.

Dados: repo **privado** `banco-demandas-dados` (`banco.json`, ~1,1 MB, 1.512 itens).
O repo do código é **público** — nenhum dado dela pode entrar aqui.

### Arquitetura
`index.html` + `css/app.css` + `js/app.js` (núcleo: IndexedDB, empresas, abas, backup,
textos editáveis, desfazer) · `js/dg.js` (aba Quadro Geral) · `js/nc.js` (Não
Conformidade) · `js/arquivos.js` (ler Excel/Word/PDF/CSV/imagem e anexos) ·
`js/sync.js` · `js/docxlite.js` · `sw.js` (PWA) · `status.json`.

### O que existe e funciona (testado no ar)
- **Capa** verde-degradê com cards claros; busca e filtros de empresa; empresa inativa
  mostra 🔒 e não clica; pendências com "Onde paramos"; Mapa do site.
- **Hub de cards** ao entrar na empresa + navegação de 1 clique (barra lateral colorida,
  barra inferior no celular, Ctrl+K).
- **Quadro Geral** (aba `dg`): duas visões (☰ Lista / ▦ Painel), grupos recolhíveis,
  arraste fluido com linha indicadora, checklist aninhado editável (Enter/Tab/Backspace),
  triagem, folha do dia imprimível, fluxograma, ações em massa, modo foco em tela cheia,
  anexos, concluídas ocultas, agenda **compartilhada entre CF e AC** (grupo "SF") com
  escopo por loja.
- **Desfazer/Refazer** no site inteiro: Ctrl+Z, Ctrl+Shift+Z e botões ← → (barra lateral
  e barra do celular). 40 passos; o que é feito junto desfaz junto.
- **Modo edição de textos** (⋯ → ✏️): 82 textos editáveis + restaurar originais.
- **Opções dos filtros configuráveis** (⚙ Prioridades / ⚙ Situações / ⚙ urgências da NC):
  renomear, cor, ordem, criar, excluir com migração. **A CHAVE INTERNA NUNCA MUDA.**
- **Arquivos**: trazer Excel/CSV/Word/PDF-de-texto/imagem, com prévia e escolha do
  destino; anexo dentro de cada demanda e de cada NC.

## O QUE VEM AGORA (ela definiu)

**PRÓXIMO ASSUNTO: layout da aba "Relatório de Não Conformidade - Gerência".**
Ela vai orientar. Ouça antes de mexer; monte e mostre.

### Fila depois disso
1. Layout da aba Manutenções e Elétrica.
2. Palavras-chave da urgência (`NC_KW` em js/nc.js) — hoje fixas no código, ela não
   consegue editar. É a pendência dela "colar o interpretador.py".
3. Cadastrar as áreas de Cabo Frio.
4. Conferir os dados de CF e AC.
5. Configurações atreladas ao login + passar do Lenovo para o Samsung.
6. Backup automático no Samsung — **SEMPRE POR ÚLTIMO** (regra fixa dela).

### Sugestões oferecidas e ainda não escolhidas por ela
Rolagem interna nas colunas · modo compacto · focar uma coluna · densidade ajustável ·
juntar Exportar/Importar na capa (hoje estão no menu ⋯).

## AVISOS / ARMADILHAS (aprendidos na marra)

- **Ao remover um elemento do HTML, procure quem lê aquele id.** Remover o banner da RT
  quebrou o relatório de NC por horas, sem ninguém perceber.
- **Ao mexer numa função compartilhada, teste o que já existia.** Uma linha no lugar
  errado derrubou Triagem e Folha do dia.
- **Nunca escrever chave de opção à mão** ("concluido", "URGENTE"). Usar
  `DG_CHAVE_CONCLUIDO` / `DG_CHAVE_ANDAMENTO` / `DG_CHAVE_URGENTE`.
- **O navegador embutido do Claude é o MESMO que ela usa para conferir.** Limpar o
  IndexedDB e o localStorage ao terminar os testes — dados de teste já a confundiram.
- **Sync**: acima de 1 MB o GitHub devolve o arquivo sem conteúdo; o pull já trata isso
  buscando pelo blob. Não regredir.
- **Não criar empresa com o código de um grupo** (ex.: "SF") — já virou empresa fantasma.
- **Importar** só aceita o `.json` de backup do próprio site, e o padrão é JUNTAR
  (substituir tudo exige duas confirmações).
- Merge do sync é *last-write-wins por item inteiro*: editar a mesma demanda em dois
  aparelhos ao mesmo tempo faz um sobrescrever o outro. Ela sabe e aceitou.

## COMO COMEÇAR ESTE CHAT

1. Confirme que leu o CONTINUIDADE.md.
2. Pergunte a ela **o que quer mudar na aba Relatório de Não Conformidade**.
3. Ela costuma apontar os elementos com o **seletor ▸ do navegador embutido** — confirme
   logo no começo se o elemento chegou até você; se não chegar, peça um print.
