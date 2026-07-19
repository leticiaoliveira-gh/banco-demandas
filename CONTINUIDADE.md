# CONTINUIDADE — Central de Demandas NP (banco-demandas)

> Arquivo de passagem de contexto entre chats. Num chat novo deste repositório,
> a Letícia dirá: **"Leia o CONTINUIDADE.md e continue de onde paramos"**.
> Última atualização: 19/07/2026 (v4.8: relatório no design aprovado + campos ação/obs).

## O que é este projeto
Site único (GitHub Pages, arquivos estáticos, sem build) que unificou os projetos da
Letícia: **Demandas Gerais**, **NP · Gestão de NC** (porte das regras do sistema Python
local `nao-conformidades-uan` do Lenovo) e **Manutenções e Elétrica**, separados por
empresa (Cabo Frio/CF e Arraial do Cabo/AC · Super Fricarnes).
- Site no ar: https://leticiaoliveira-gh.github.io/banco-demandas/ — **versão 4.8**,
  tema "Verde Qualidade" (#1d6b57 / fundo #f7f7f5).
- Publicação: commits direto na `main` (a branch `claude/unified-demand-system-2lxhro`
  ficou para trás; a main é a fonte da verdade desde 18/07).
- Repo de dados (sincronização): `leticiaoliveira-gh/banco-demandas-dados` (PRIVADO).

## Como trabalhar com a Letícia (REGRAS FIXAS dela — inegociáveis)
- PT-BR sempre; comandos exatos e diretos; SEM aula técnica; UM passo por vez;
  dizer exatamente ONDE clicar/digitar. Ela não programa.
- Máximo de automatização sempre. Nunca refazer do zero — ajustar o que existe.
- **NÃO concordar automaticamente com ela** — avaliar tecnicamente a sugestão e dizer
  com franqueza se é boa ou não (pedido explícito dela em 18/07).
- **NUNCA publicar sem testar** (abrir o site e clicar; conferir resultado real).
- **Celular dela = iPhone.** Samsung e Lenovo são NOTEBOOKS dela.
- **PC do trabalho = COMPARTILHADO**, sem login fixo. NADA dela fica salvo lá
  (modo de sync temporário via checkbox "Não salvar neste dispositivo").
- Bump do CACHE em sw.js a cada deploy (está em v17).
- ATENÇÃO ao testar logo após deploy: o GitHub Pages tem cache HTTP de 10 min
  (max-age=600) — o site pode servir arquivos velhos por até 10 min mesmo com o
  sw novo; esperar ou revalidar antes de concluir que "não funcionou".
- Ela se frustra (com razão) quando um ponto que já explicou é esquecido. Reler o
  histórico/este arquivo antes de orientar. Pedir print quando algo "der erro".
- EXPORTAÇÕES/BACKUPS: salvar sempre em Desktop\\CLAUDE (CENTRAL)\\- BACKUPS\\Backups - Relatório Não Conformidades.
- **PASSO A PASSO MINUCIOSO**: detalhar cada clique/tela, sem pular etapa (regra 19/07).
- **NUNCA refazer/reenviar do zero** (gasta tokens): edições incrementais; na dúvida, pausar e perguntar (regra 19/07).
- **Regra das abas**: item de manutenção/elétrica (Sr. João ou Matheus) fica SÓ na aba Manutenções e Elétrica — nunca na aba de NC; se aparecer lá, transferir.
- **REGRA FIXA (19/07) — status.json**: a capa mostra "Onde paramos" lendo o arquivo
  `status.json` da raiz do repo (o site busca com cache:no-store toda vez que abre).
  **EM TODA PUBLICAÇÃO, ANTES DO COMMIT, atualizar `status.json`** (`atualizadoEm`
  no formato AAAA-MM-DD, `ondeParamos` em 1-2 frases e `proximoPasso`). Sem isso o
  card fica mentindo e Lê se perde ao voltar no dia seguinte. Não é opcional.
- MANTER ESTE ARQUIVO ATUALIZADO ao fim de cada etapa — ele é a memória entre chats.

## Arquitetura
- `index.html` + `css/app.css` + `js/app.js` (núcleo: IndexedDB `banco_nc_v3_base`;
  registro de abas TABS/TAB_ORDER; empresas, executores, pendências e rtInfo no store
  `meta`; itens travados por empresa; só UMA empresa ativa por vez; ▶ Iniciar central;
  botão "🧹 Limpar dados deste dispositivo").
- `js/nc.js` (aba NC: áreas por piso; urgência = porte FIEL do bot/interpretador.py com
  detecção de área "Área: descrição"; reincidência dinâmica mês a mês; relatório
  impressão + .docx).
- `js/docxlite.js` (gerador .docx puro, sem dependências).
- `js/sync.js` (GitHub Contents API → banco.json no repo privado; merge por uid/mod;
  tombstones; modo permanente=localStorage e TEMPORÁRIO=sessionStorage).
  **UI da sync (v4.5): o botão ⚙ de configurar fica SÓ NA CAPA (syncPillHome); dentro
  da empresa a pill (syncPill) só aparece quando está sincronizando ou com erro.**
- PWA: manifest.json + sw.js (instalável no iPhone; abre offline).
- Backup automático: File System Access → subpasta "Backup NC - DD.MM.AA" com json+csvs,
  mantém últimas 7.

## ESTADO ATUAL (19/07/2026) — v4.8, relatório no design aprovado
- **Relatório da gerência (Imprimir/PDF e Word) no design aprovado por Lê em 19/07**
  ("Proposta 2 revisada"): agrupado por piso → área (ordem oficial das áreas);
  URGENTE sem rótulo escrito — card com barra lateral e texto em vermelho;
  ação corretiva em caixinha verde com ✔; observação em caixinha amarela com 👁;
  etiqueta "Reincidente — Nº mês"; KPIs Em aberto/Urgentes/Reincidentes/Resolvidas.
- **Campos novos por NC**: "Ação corretiva" e "Observação" (formulário de registro e
  edição; sincronizam como parte do item). Sem ação preenchida, o relatório usa a
  recomendação padrão por urgência. Itens antigos continuam funcionando.
- Ordem de trabalho combinada com Lê: fazer primeiro o mais difícil/pesado.

- Sincronização OK em Lenovo (Chrome), iPhone (app instalado) e Samsung. Token válido até 17/07/2027.
- CRN fixo na capa: "Letícia Oliveira (Nutricionista de Produção – RT) · CRN-4: 22103217".
- Urgência em **2 níveis**: URGENTE e OBSERVAÇÃO (decisão de Lê; ATENCAO virou alias visual).
- Aba renomeada: **"Relatório de Não Conformidade - Gerência"** (ex NP · Gestão de NC).
- Áreas de CF pelo mapeamento oficial (PDF da pasta Sincronização) + extras; áreas AGORA SINCRONIZAM (envelope areas/areasMod desde v4.6).
- Conteúdo do banco (banco-demandas-dados/banco.json, ~750 KB):
  · Aba NC: 499 itens vivos (CF: Vt+PPR jun/26; AC: PPR mai/26 + Atualizações 25.06/06.07 + 1 NC do bot).
  · Aba Manutenções: 518 itens (CF 167 do Vt manutenção; AC ~351 do VT abril xlsx + Pendências xlsx), executor João/Matheus e status Realizado.
  · 465 itens de NC viraram tombstones (deleted) ao aplicar a regra das abas — não ressuscitar.
- Fontes todas convertidas a .md ao lado dos originais (regra markdown-auto).
- Exportações/backups: SEMPRE em Desktop\CLAUDE (CENTRAL)\- BACKUPS\Backups - Relatório Não Conformidades.

## PENDÊNCIAS em ordem (espelhadas no card da capa)
1. ~~Design do relatório de entrega ao gerente~~ FEITO 19/07 (v4.8; já marcado no card da capa).
2. ~~Backup automático no LENOVO (Chrome)~~ FEITO 19/07 — apontado para
   Desktop\CLAUDE (CENTRAL)\- BACKUPS\Backups - Relatório Não Conformidades,
   permissão "granted", gravação confirmada.
3. **LAYOUT — CAPA**: 1ª rodada FEITA 19/07 (cache v17): removidos o botão ▶ Iniciar
   do topo e o bloco ÚLTIMAS NCS; backup (info + ⬇ Fazer backup + ⚙ Ativar automático)
   subiu compacto para o topo, ao lado do ⚙ Sincronização; "v4.8" foi para a coluna
   lateral (.rail-ver); capa em 2 colunas (.home-cols): empresas à esquerda e card
   PENDÊNCIAS à direita (300px); barra de busca + filtros (Todas/ativas/inativas e
   A–Z/Mais pendentes) sob o título EMPRESAS. css/js agora versionados com ?v=17 no
   index.html — bumpar junto com o CACHE do sw.js a cada deploy.
   Aguardando novas indicações dela pelo seletor ▸.
4. **NAVEGAÇÃO NOVA (v4.9, 19/07) — FEITA**: ao entrar na empresa abre o HUB de
   cards (gerados de TAB_ORDER, campos icone/cor/corFundo/hub em TABS). Navegação
   permanente: #railTabs na barra lateral, #mobileNav fixo no celular, breadcrumb
   #crumb e busca Ctrl+K (#palOverlay). Criar aba nova = 1 entrada em TABS +
   TAB_ORDER + um .tab-panel; todo o resto se atualiza sozinho.
   Corrigido de quebra: quickAdd() sem empresa criava item órfão.
5. **DEMANDAS GERAIS = AGENDA (v5.0, 19/07) — FEITA**: painel próprio `#tab-dg` +
   `js/dg.js`. Item {tipo:"dg"} tem titulo/prioridade/situacao/prazo/notionUrl e
   `itens[]` = lista PLANA com campo `nivel` (a hierarquia mora aí; `tipoLinha`
   check|secao|texto). Grupos por prioridade (ou situação), contador de progresso,
   seções que abrem/fecham, busca que varre o conteúdo dos itens. Sem cards de
   estatística e sem subtítulo (updateSubtitle agora zera #appSubtitle em TODAS as abas).
   IMPORTADAS 15 tarefas do Notion (banco "Overview", as sem prioridade em aberto) =
   1.106 linhas, escritas DIRETO no banco.json privado (commit 49bda99a). Entraram na
   empresa AC (era a ativa) — mover se Lê pedir.
6. **PRIVACIDADE (19/07) — FEITO**: o repo do código é PÚBLICO e o histórico continha
   32 NCs reais de CF. Histórico consolidado em 1 commit limpo + branch antiga
   `claude/unified-demand-system-2lxhro` apagada do GitHub (ela também vazava tudo).
   Backup em "- BACKUPS\Backups - Relatório Não Conformidades\Backup repo banco-demandas
   - 19.07.26". Conta é plano FREE: repo privado NÃO pode ter GitHub Pages — por isso
   ficou público e limpo. REGRA: nenhum dado real de Lê entra no repo do código.
5. **LAYOUT — demais abas** (Relatório de NC · Gerência, Manutenções e Elétrica),
   uma de cada vez, na ordem que ela pedir.
6. Conferir no site as NCs de CF e AC e as manutenções das duas lojas.
7. Configurações atreladas ao login.
8. Transferir configurações Lenovo → Samsung.
9. Confirmar formato da aba Demandas Gerais.
10. **Backup automático no SAMSUNG — SEMPRE POR ÚLTIMO** (regra de Lê, 19/07):
    toda pendência nova entra ANTES desta.

> Regra de ordem (Lê, 19/07): primeiro o mais pesado/difícil, o mais fácil por último.
> O LAYOUT vem antes de tudo porque ela quer mexer no visual POR PARTES (capa →
> Demandas Gerais → demais abas) antes de qualquer conferência de dados.

## v5.1 (19/07) — visual e agenda compartilhada
- Fundo `--bg:#ffffff` (BRANCO PURO, v5.2 — referência explícita dela: o Notion).
  REGRA VISUAL: página branca; a cor aparece em **etiquetas com fundo pastel**
  (igual às pílulas de prioridade do Notion), na barrinha do card do hub e no ícone —
  nunca preenchendo áreas grandes de fundo.
- Grupos e blocos da agenda são RECOLHÍVEIS no ▸ (`DG_FECHADOS` em localStorage,
  por aparelho — não sincroniza). Fechado mostra só etiqueta + contagem, como no Notion.
- Banner "Responsável Técnica" saiu do #view-app (fica só na Capa, em #rt-linha).
- `nomeCurto()` (js/app.js): dentro das abas e na trilha o nome vai curto
  ("Cabo Frio"); na Capa fica "Cabo Frio · Super Fricarnes (CF)" — a pílula sumiu.
- **GRUPO DE EMPRESAS** (`GRUPO_SF="SF"`): CF e AC têm `grupo:"SF"` e dividem UMA agenda
  de Demandas Gerais. Item dg é gravado com `loja` = código do GRUPO e um campo `escopo`
  ("" = as duas lojas; "CF"/"AC" = exclusiva). `dgLojaBase()`/`dgVivos()` em js/dg.js.
  As exclusivas aparecem num bloco à parte ACIMA das compartilhadas. Filtro por loja na barra.
  ⚠️ EMPRESA NOVA NASCE SEM GRUPO = agenda própria (regra explícita de Lê, não mudar).
  Migração `mig_grupo_sf` + migração de itens dg antigos (loja CF/AC -> SF) no boot.
- Ordem manual das demandas: campo `ordem`, arrastar-e-soltar no PC e setas ▲▼ no celular.

## v5.3 (19/07) — combate à poluição visual (queixa forte de Lê)
- Lê disse literalmente que o site estava "uma grande poluição visual" e que "a cabeça buga".
  TRATAR DENSIDADE COMO REQUISITO, não como detalhe: menos elementos na tela, cards baixos.
- Barra de abas de TEXTO (#tabs) foi ESCONDIDA (hidden). renderTabs() agora só popula a
  barra lateral e a do celular. Navegação = ícones da rail + hub + Ctrl+K.
- Cards da agenda compactos (39px de altura; padding 8px 11px, fonte 12.5px).
- Agenda em DUAS COLUNAS (.dg-colunas, auto-fit minmax(330px,1fr)): cada bloco é uma
  coluna com MOLDURA própria envolvendo todas as prioridades — "📍 Só [loja]" (borda
  cinza) e "🔗 As duas lojas" (borda verde), cabeçalho preenchido. No celular vira 1 coluna.
- PENDÊNCIA NOVA no banco dela: "AUTONOMIA: aprender/ter no site como editar tudo sozinha
  (layout, abas, cores, textos) sem depender do Claude". Ela NÃO quer explicação sobre isso
  agora — só registrado. Quando for tratar, lembrar da REGRA DE PORTABILIDADE do CLAUDE.md.
- Ideias de melhoria já oferecidas (aguardando escolha dela): modo compacto extremo,
  ocultar concluídas, card só com título+progresso, focar uma coluna por vez, altura
  máxima com rolagem interna, controle Confortável/Compacto.

## v5.4/v5.5 (19/07) — nomes das colunas e ARRASTE
- Colunas da agenda (nomes escolhidos por Lê): ESQUERDA "Demandas e Prioridades"
  (valem para as duas lojas) · DIREITA "[Nome da loja] (exclusivas)".
- ARRASTE pela alça ⠿ (pointer events: funciona com mouse E com o dedo).
  `dgArrastarIni/Move/Fim` em js/dg.js. Regras que ela definiu:
  · dentro da COLUNA vai para onde quiser, inclusive para outro grupo de prioridade —
    e aí a PRIORIDADE muda sozinha (comportamento do Notion, com toast avisando);
  · NÃO pula para a outra coluna (isso mudaria a loja; para isso existe o seletor).
  · As setas ▲▼ foram REMOVIDAS a pedido dela ("esquece esse botão de sobe desce").
- ARMADILHA CORRIGIDA: `setPointerCapture` lança exceção quando o pointerId não existe
  e derrubava o registro dos handlers — está em try/catch. Sem isso o arraste "não pega".
- LIMITAÇÃO conhecida: só dá para arrastar para grupos que já têm alguma tarefa
  (grupos vazios não são desenhados). Ela foi avisada; se pedir, mostrar grupos vazios.

## v5.6 (19/07) — DUAS VISOES da agenda (Le vai escolher uma)
- Pedido dela: a aba Demandas Gerais tem de ser "o quadro geral, todo o pensamento,
  da pequena a grande demanda" e deixar claro "o que eu quero, o que devo fazer,
  o que e prioridade". Ela gostou da visao Lista mas quis uma SEGUNDA opcao, minha,
  para comparar. MANTER AS DUAS ate ela decidir — nao apagar nenhuma sem pedido.
- Alternador na barra: `dgSetVisao('lista'|'painel')`, preferencia em localStorage
  (`dg_visao`), portanto e por aparelho.
- VISAO PAINEL (`dgPainelHTML`, `dgCartaoHTML` em js/dg.js), baseada na Matriz de
  Eisenhower + board view: (1) faixa de FOCO no topo com Atrasadas / Para hoje /
  Urgentes / Em andamento, cada uma clicavel para filtrar (`DG_FOCO`); (2) quadro com
  uma coluna por prioridade e cartoes compactos (progresso, situacao, prazo, 📍 quando
  e exclusiva da loja; prazo vencido sai em vermelho com ⚠). Arraste continua valendo.
- Referencias usadas: Eisenhower Matrix (Asana/Airtable/Monday) e a distincao
  "List view para ler, Board view para enxergar o todo".

## v5.7 (19/07) — nome da aba e Capa verde
- Aba "Demandas Gerais" foi RENOMEADA para "QUADRO GERAL" (so em TABS.dg.label —
  o hub, a rail, a trilha e o Ctrl+K pegam sozinhos, prova de que a fonte unica funciona).
- CAPA (#view-home) com o VERDE da marca (--accent) e letras brancas, no estilo da
  referencia que ela escolheu (hero verde do Shopify): cards e lista de empresas ficam
  BRANCOS por cima, com sombra; botoes ghost translucidos; busca/filtros translucidos.
  DENTRO das abas (#view-app) continua tudo BRANCO — a Capa e vitrine, o trabalho e no branco.
- As DUAS VISOES (Lista e Painel) ficam mantidas por decisao dela.

## v5.8/v5.9 (19/07) — IDENTIDADE VISUAL APROVADA ("simplesmente AMEI")
Referencia escolhida por ela: dashboard "Launch tracker" (sidebar em degrade + conteudo
em cartao branco). NAO mexer nisso sem pedido dela — foi o unico visual que a agradou.
- Degrade da marca: `linear-gradient(155deg,#0f5b52,#17756a,#2a9d8a)` na CAPA e
  `170deg` na BARRA LATERAL. Icones/logo/versao da rail em branco translucido.
- Conteudo em PAINEL BRANCO FLUTUANTE: `.main` com `border-radius:18px 0 0 18px`,
  margem negativa de -6px (encaixa na rail) e sombra suave; `.app` com fundo #f2f4f4.
  No celular (<=1000px) a margem/raio/sombra sao zerados e a rail some.
- Pilula com o NOME da aba ao passar o mouse nos icones da rail (`::after` com attr(title))
  — repoe a clareza perdida quando a barra de abas de texto foi removida.
- LISTRA de prioridade: `box-shadow:inset 3px 0 0 <cor>` na borda esquerda de cada tarefa
  (vermelho/roxo/ambar/verde). Menos texto na tela, prioridade lida pela cor.
- Titulo da pagina 33px com ar em volta.

## v6.0 (19/07) — 4 recursos vindos dos exemplos de apps do Airtable
Le mandou 4 repos (apps-print-records, apps-update-records, apps-todo-list,
apps-base-schema) e pediu "todas" as ideias. O CODIGO deles nao serve (rodam dentro do
Airtable); as IDEIAS viraram:
1. `dgImprimir()` (js/dg.js) — FOLHA DO DIA: imprime/PDF a agenda agrupada por prioridade,
   com quadradinhos para riscar a mao na unidade. Respeita busca, filtros e a faixa de foco
   (via `dgVisiveis()`), e lista os subitens pendentes (corta em 14 por tarefa).
2. ACOES EM MASSA: `DG_SEL` (Set) + `dgMassa/dgMassaExcluir/dgBarraMassaHTML`. Checkbox que
   aparece no hover de cada tarefa; barra verde com prioridade/situacao/concluir/excluir.
   `dgPodeGravarEmMassa()` avisa antes de alterar em lote em DISPOSITIVO TEMPORARIO
   (a trava do PC compartilhado do trabalho).
3. MODO FOCO: `dgFoco(uid)` abre a demanda sozinha em tela cheia (botao ⤢); Esc fecha
   (tratado no listener global de app.js, ANTES do Ctrl+K).
4. `mapaDoSite()` (js/app.js) — MAPA DO SITE, link no rodape da Capa. 6 secoes em
   portugues simples: onde os dados moram, empresas/grupos, abas, contagens ao vivo,
   o que cada arquivo faz (+ a regra de bumpar ?v= e CACHE) e como exportar tudo e sair.
   >>> E a resposta a pendencia de AUTONOMIA dela. Manter atualizado quando a estrutura mudar.

## v6.1-v6.3 (19/07) — correcoes e EDICAO DIRETA
- REGRA QUE EU QUEBREI E ELA COBROU EM CAIXA ALTA: "ABSOLUTAMENTE TUDO TEM QUE SER
  EDITAVEL". Ao criar telas novas, sempre permitir editar o texto no lugar, nao so marcar.
- Edicao inline com `contenteditable="plaintext-only"` (classe .dg-ed / .dg-ed-tit):
  `dgTexto()` salva no blur (sem redesenhar, para nao perder o cursor) e `dgTecla()` trata
  Enter (nova linha abaixo), Tab/Shift+Tab (nivel), Backspace em linha vazia (remove).
  `dgRedesenhaFoco(uid,idx)` redesenha e devolve o cursor para a linha certa.
- ARRASTE: os handlers ficam no DOCUMENT, nunca na alca. setPointerCapture + mover o nó
  no DOM = o navegador cancela a captura e o gesto morre. Foi esse o bug de "nao consigo
  arrastar". Alca sempre visivel (ela nao achava a alca invisivel).
- MODO FOCO: tela cheia opaca (z-index 200), nao modal — pedido dela.
- Listra colorida de prioridade nos cards: REMOVIDA, ela nao gostou.
- Notion: botoes/links removidos (ela vai apagar as tarefas de la depois de conferir).
- Migracao no boot limpa restos de HTML da importacao (linhas que sao so uma tag, ex "<tr>").
- BUG ACHADO DE QUEBRA: remover o banner .rt-banner (v5.1) quebrou `ncRelatorioPrint`
  e `ncRelatorioDocx`, que liam o nome da RT de `#rtName`. Agora usam RT_INFO||RT_DEFAULT.
  LICAO: ao remover elemento do HTML, procurar quem le aquele id.
- NOVOS: `ordemDeServico()` (js/app.js, aba Manutencoes) — folha por executor com espaco
  de assinatura; `dgTriagem()` (js/dg.js) — uma demanda por vez para classificar prioridade.

## v7.0-v7.5 (19/07) — o site virou CONFIGURAVEL por ela
REGRA MAIOR DELA, repetida 4x e agora estrutural: "ABSOLUTAMENTE TUDO TEM QUE SER
EDITAVEL". Nada novo pode nascer sem caminho de edicao pela interface.
- `txt(chave,padrao)` + dicionario TEXTOS em meta + atributo `data-txt` no HTML.
  MODO EDICAO (menu ... > Editar os textos do site) liga contenteditable em todos de uma
  vez, com barra flutuante e "Restaurar os originais". 82 textos ja marcados.
  Ao criar tela nova: marcar os textos com data-txt (e data-txt-ph para placeholder).
- OPCOES DOS FILTROS configuraveis: DG_PRIOS/DG_SIT (js/dg.js) e NC_URG (js/nc.js) sairam
  de constantes para meta. Tela unica `dgGerirOpcoes(qual)` com qual = prios|sits|urg —
  renomear, cor (paleta ciclica), reordenar, criar, excluir (bloqueia/migra se em uso).
  >>> REGRA DE OURO: a CHAVE nunca muda; so o rotulo/cor. E o que protege os itens gravados.
  Papeis especiais em DG_CHAVE_CONCLUIDO/ANDAMENTO/URGENTE — nunca voltar a escrever
  "concluido"/"URGENTE" na mao.
- DESFAZER/REFAZER no site inteiro: putItem/delDB registram antes/depois; `HIST` guarda 40
  passos; operacoes em ate 350ms viram UM passo. Ctrl+Z / Ctrl+Shift+Z e botoes na rail.
  Nao captura enquanto ela digita em campo (deixa o navegador desfazer as letras).
- ANEXO POR ITEM: `anexarNoItem(uid)` (js/arquivos.js) em cada demanda e em cada NC —
  imagem vira miniatura, planilha/Word/PDF viram itens da lista (dg) ou vao para obs (nc).
- ARRASTE: card segue o cursor (transform) + `.dg-marca` (linha verde) mostrando onde cai.
  Sem isso ela dizia que "nao era fluido como o Notion".
- Concluidas ficam OCULTAS (so aparecem filtrando por Concluido). Grupos vazios APARECEM,
  para poder arrastar para eles.
- ERRO MEU QUE CUSTOU CARO: deixei o titulo sempre contenteditable e ela renomeou
  "Quadro Geral" para "Arraial do Cabo" so de clicar. Restaurei no banco (commit 806caf65)
  e agora titulo/pilula so editam DENTRO do modo edicao.
  LICAO: editavel != editavel por acidente. Edicao de CONFIGURACAO exige modo edicao;
  edicao de CONTEUDO (itens, titulos de demanda) pode ser direta.
- Empresa inativa: `<span class="btn iniciar off">🔒</span>` — mesmo tamanho, sem texto.
- CUIDADO OPERACIONAL: eu testo no navegador embutido do Claude, que ela tambem usa para
  conferir. Meus dados de teste apareceram para ela e a confundiram. LIMPAR o IndexedDB
  do navegador de teste ao terminar (indexedDB.deleteDatabase + localStorage.clear).

## Cuidados / armadilhas
- Dados dela são locais por navegador (no Lenovo, o navegador com dados é o CHROME).
  NUNCA sugerir limpar navegador/dados sem backup exportado antes. Seeds/dados de
  trabalho NÃO entram no código público.
- "Ativar automático" (backup) é POR PC, por design — no PC de terceiros, não ativar.
- ARMADILHA do backup automático (vista em 19/07): o site grava a subpasta datada
  DENTRO da pasta escolhida no seletor. Se escolherem "CLAUDE (CENTRAL)" em vez de
  "Backups - Relatório Não Conformidades", as pastas "Backup NC - DD.MM.AA" caem na
  raiz. Conferir a pasta escolhida (metaGet("backupDir").name) ao ativar.
- O card "PENDÊNCIAS DE CONFIGURAÇÃO" na capa do site espelha esta lista — manter os
  dois em dia (a lista sincroniza entre dispositivos). Marcar lá como feita a pendência
  "Configurar a sincronização entre dispositivos" (já concluída).
- Há um artefato de design publicado (link acima) aguardando as respostas dela.
- Lembretes automáticos das 18h podem disparar fora de hora — checar o histórico real
  antes de agir como se a etapa não tivesse sido feita.

## SENTINELA AUTOMÁTICA DO GITHUB (gravado em 19/07/2026 — v7.8)
- **O que foi corrigido em v7.8**: o aviso de vencimento do token de sincronização era um palpite (1 ano a partir da colagem). Agora `js/sync.js` lê a validade REAL pelo cabeçalho `github-authentication-token-expiration` da API do GitHub: avisa com dias restantes + data exata (≤21 dias), alerta forte se já venceu, e o "Testar conexão" mostra "Token válido até DD/MM/AAAA". Chave local: `gh_sync_token_expires` (limpa ao trocar/desativar token).
- **Rotina permanente**: Routine "Sentinela GitHub — banco-demandas" (trig_01QBuWfpLATSDwDUNiHtBWPn), toda segunda ~9h (Brasília), abre sessão nova e sozinha: checa Actions/issues/PRs, roda node --check em todos os js, carrega o site headless (Playwright) caçando erros de runtime, confere expirações de token, corrige o que achar, faz push em branch claude/* e avisa Lê por push/e-mail. Cadastrada como AUT-0014 no Cadastro de Automações (Notion).
- **Tokens conhecidos** (print de 19/07/2026): "demandas de sincronização de banco" expira 17/07/2027 (o do site, OK); "Site de Sincronização UAN" expira 16/08/2026 e NUNCA foi usado (outro projeto — renovar ou excluir).
