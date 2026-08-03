# PENDÊNCIAS — Central de Demandas NP
### atualizado em 03/08/2026 (v9.42) · este arquivo é a memória entre conversas

> **Como usar:** cada item tem um código. É por ele que a Lê cobra e que eu marco como
> feito. Toda conversa nova deve ler este arquivo antes de propor qualquer coisa.
> Nasceu porque a conversa de 28.07 acumulou 1073 mensagens e o fio se perdeu na troca.
> **Fontes unificadas aqui:** os 5 arquivos que ela manda ler (`CLAUDE.md`, `status.json`,
> `CONTINUIDADE.md`, `AUDITORIA`, `PLANO REESTRUTURADO`), o PROMPT do 3º chat, as 50
> mensagens dela da conversa 28.07, as 3 folhas anotadas à caneta, o bloco do Notion e o
> QA de 29/07.

---

## ✅ FEITO EM 29/07 (v9.26) — não refazer

| Cód | O que |
|---|---|
| T1 | **A folha do Sr. João estava incompleta.** Conferidas todas as fontes de Arraial: as 2 planilhas já estavam 100% (61+29−capinagem = 89), mas o PPR de junho e as 2 folhas de atualização tinham **32 manutenções fora**. Folha: **89 → 121 serviços** |
| T2 | **12 fotos** entraram junto dos serviços (11 itens), comprimidas a 30 KB |
| T3 | **DEFEITO:** a carga tinha `fotos:[]` fixo e **descartava toda foto** — corrigido em `js/mnt28.js` |
| T4 | **DEFEITO:** `css/polimento.css` estava preso em `?v=1` — a camada de acabamento **nunca chegava no aparelho dela**. Corrigido |
| T5 | 15 dúvidas da folha resolvidas com ela · rodapé frontal movido para AÇOUGUE – VENDAS |
| T6 | As 9 configurações de design conferidas uma a uma |
| T7 | 5 itens de elétrica **sinalizados ao Matheus** e não incluídos |

## ✅ FEITO EM 29/07 (v9.27) — os 4 defeitos que não dependiam dela

| Cód | O que | Como conferi |
|---|---|---|
| **DEF-5** | **A data de emissão que ela edita agora vai para a folha impressa.** A tela mostrava a data trocada, a folha voltava para a data de hoje (`js/mnt28.js` usava `today()` na impressão) | pus 15/06/2026 e a folha saiu 15/06/2026 |
| **F-1** | **Separado o que imprime do que é só dela.** São duas caixas agora: *Recado para quem vai executar* (sai na folha) e *Meu lembrete 🔒* (nunca é impresso). Botão de um clique na barra: **"🔒 Tirar 9 'VERIFICAR' da folha impressa"** — não movi sozinho porque é texto dela | gravei um lembrete e ele não apareceu na folha gerada |
| **F-2** | **"VERIFICAR" virou selo escrito**, vermelho **com a palavra** (cor nunca sozinha). Os 9 aparecem na tela | 9 selos desenhados |
| **DEF-7** | **Chavinha Ativa/Inativa**: o desenho continua igual, mas a área que aceita o dedo foi de 20px para **44px**. Ganhou também foco de teclado. Mesmo problema no lápis da data (16px → 44px de toque) | medido: 44×44 |
| **DEF-8** | **Tablet agora conta como dedo.** A regra dos 44px morria em 640px de largura; passou a valer por **tipo de toque** (`pointer:coarse`), então vale em celular, tablet e qualquer tela sensível ao toque | regra lida no navegador |

Conferido em navegador de verdade, 375px e 768px: **zero erro no console**, zero rolagem
lateral, 121 serviços na tela. **Está em v9.27 aqui no computador — NÃO foi publicado**,
porque publicar é pedido dela.

---


## 🟠 APROVADO EM 30/07 — ✅ APLICADO em 31/07 (recuperação concluída)

> **Recuperação de 29/07 CONCLUÍDA em 31/07**: folha impressa reconstruída (21+2 VERIFICAR devolvidos), renomes aplicados por arquivo de atualização. Lição gravada: item com VERIFICAR é intocável em consolidação.

| O que | Decidido |
|---|---|
| CORREDOR DE ENTRADA - INTERNO (1º piso) | vira **"Corredor - Acesso Interno"** |
| CÂMARA: FLV | vira **CÂMARA: FRUTAS, LEGUMES E VERDURAS (FLV)** |
| CÂMARA: C&A | vira **CÂMARA: CARNES E AVES (C&A)** |
| CÂMARA: F&L (LATICÍNIOS) | vira **CÂMARA: FRIOS E LATICÍNIOS (F&L)** |
| CÂMARA: HORTIFRUTI | **mantém** (decisão dela) |
| Proposta SJ-1 (maresia etc.) | aguarda o OK dela e a mesma recuperação |

## 🔵 ESCOLHIDO POR ELA EM 30/07 — próxima construção

Layouts: **NC na opção C** (desenho da folha do Sr. João: colunas-pergunta, tempo
em vermelho) e **Manutenções na opção B** (folha por executor — casa com SJ-3, a
folha do Matheus). Ver `modelos/layouts.html`.

Fotos do mercado (Folha 2): ela vai reunir e mandar; inserir nos relatórios.

### ✅ AS 3 ESCOLHAS FORAM RESPONDIDAS E CONSTRUÍDAS (03/08, v9.43) — não refazer

| Cód | Escolha dela | Construído |
|---|---|---|
| **LAY-1** | **Foto à vista + coluna de observações** (opção 1) | A aba de NC saiu do cartão e virou **folha de conferência**: 5 colunas (*Foi resolvida? · O que está errado? · Desde quando · Urgência · Observações*), agrupada por piso → área, cabeçalho de colunas repetido a cada área, foto pequena junto do problema, ação corretiva e observação juntas na última coluna. A caixinha resolve e reabre. `js/nc.js` + `.nc-fl-*` em `css/app.css` |
| **LAY-2** | **30 dias** | `ncDesde()` conta em **dias** (a MNT conta em meses, não servia), passa de 30 fica vermelho **com a palavra escrita**, e NC já resolvida nunca acende. Número **editável no ⚙** |
| **LAY-3** | **Na aba MNT, com seletor de responsável** | `M28F.exec` + *"Folha de: Sr. João · Matheus · Todos"*. Trocar o nome troca **capa, números, lista e folha impressa**. `executor` virou campo por serviço no lápis, usando a lista `EXECUTORES` que ela já edita. A aba antiga **não foi tocada** |
| **Matheus** | **Todos entram como não feitos** | 41 serviços gerados e testados |

**Também nasceram:** `NC_TXT_PADRAO` + `ncGerirTextos()` (os 5 títulos de coluna e o limite de dias,
graváveis com `metaSetU`, campo vazio volta ao padrão) e 2 linhas novas em `CFG_ABAS.nc`.

### ✅ CONSERTO DE RAIZ — o que ela editava não chegava no celular (03/08, v9.44)

**Achado conferindo o banco dela na nuvem:** as chaves `mnt28Textos`, `mnt28Cabecalho`,
`mnt28Visual`, `mnt28Ordem` e `ncTextos` **nunca entraram no envelope da sincronização**
(`buildBackupEnvelope`, `js/app.js`). Na prática: **tudo que ela edita pelos 6 lápis da capa da
MNT** — nome, cargo/registro, responsável pelos serviços, data de emissão e os 10 textos da folha
— **e** os 5 títulos novos da folha de NC ficavam presos no aparelho onde ela editou. Ela trocava
o título no computador e o celular continuava com o antigo. **Vale desde 30/07**, quando os lápis
nasceram (F-3): a metade "ela edita sozinha" funcionava, a metade "chega no celular" não.

**Corrigido:** `FOLHAS_CHAVES` + `FOLHAS_CFG` + `folhasCfgSet()` em `js/app.js` (grava com
`metaSetU`, carimba a hora e agenda a sincronização), as 5 chaves no envelope, e o outro lado no
`js/sync.js` — que ainda **recarrega a memória da página e repinta a aba**, senão o texto novo
chegaria no banco e a tela continuaria com o velho. **Provado nas duas pontas:** editei aqui e o
envelope levou; zerei como se fosse o celular, sincronizei, e o título e o limite de dias
chegaram — inclusive na tela, sem recarregar.

### ✅ CONSERTO DE RAIZ — o desfazer não repintava a tela (03/08)

O `Ctrl+Z` voltava o dado no banco e a **tela continuava com o texto velho**: ela desfazia e parecia
que não funcionou. Valia para os textos da folha de NC **e** da MNT. Duas causas:
`recarregarConfig()` (`js/app.js`) não recarregava `NC_TXT` nem `M28_TXT/M28_CAB/M28_VIS`, e
`histAplicar()` não repintava a aba `mnt28`. Corrigido com `ncRecarregarTextos()` e
`m28RecarregarConfig()`. **Provado no navegador:** trocou o título, desfez, a tela voltou sozinha.

### ⚠️ AR-1 — o que a varredura de 03/08 provou (a raiz, agora com número)

**Das 34 áreas usadas pelos 122 serviços da folha do Sr. João, ZERO batem com o cadastro de áreas
da loja.** Nem o piso: os serviços dizem `1º PISO`, o cadastro diz `1º Piso` — e o cadastro ainda
tem `1º Piso — Parte Central` e `1º Piso — Parte Interna`. São duas listas que nunca se encontraram.

**Consequência real (medida, não suposta):** o seletor de piso mostra os dois conjuntos somados —
`1º Piso`, `2º Piso` **e** `1º PISO` — três opções onde deveriam ser duas.
**O que NÃO acontece:** o lápis **não** troca a área do serviço sozinho. Eu afirmei que trocava e
estava errado — `m28ListaAreas()` (`js/mnt28.js:510-521`) já acrescenta à lista as áreas usadas na
folha, justamente para nada ficar órfão. Testado no navegador: salvar sem mexer preserva piso e área.

**Decisão dela (03/08):** a folha do Matheus nasce com os **mesmos nomes da folha do Sr. João**;
o AR-1 depois arruma as duas de uma vez.

### 🟣 A PÁGINA DE COMPARAÇÃO CONTINUA NO AR (para consultar)

> Eu perguntei em texto e ela disse que **não decide por texto, só vendo**. As três foram
> puladas e refeitas com desenho: **`modelos/comparar-layouts.html`** (estática, sem
> JavaScript, não toca em dado). Cada opção diz o que ela **ganha** e o que ela **perde**.
> **Regra combinada:** se durante a execução eu esbarrar em algo que dependa de uma delas,
> **paro e devolvo a pergunta na hora** — não assumo caminho provisório.

| Cód | Pergunta | Opções desenhadas |
|---|---|---|
| **LAY-1** | Na folha de NC (opção C), **onde fica a foto** e a ação corretiva? | 1) foto à vista + coluna de observações · 2) linha limpa, abre ao tocar · 3) só as 4 colunas |
| **LAY-2** | A partir de **quantos dias** parada a NC fica vermelha? | 15 (acende 5 de 6) · 30 (acende 4) · 60 (acende 1). Fica editável no ⚙ de qualquer jeito |
| **LAY-3** | **Onde nasce a folha do Matheus?** | 1) na aba MNT com seletor de responsável · 2) aba nova só dele · 3) a aba antiga troca de desenho — **é o único caminho que mexe nos dados dela** |

**Já respondidas** — a página fica como registro do que foi comparado e por quê.

### ✅ FEITO EM 03/08 — não refazer

| Cód | O que |
|---|---|
| **CSS-1** | **6 estilos que não existiam.** O `js/mnt28.js` escrevia 6 classes que **não estavam em nenhum arquivo de estilo** — o selo **URGENTE** saía como texto solto, a setinha de fechar área saía como botão cinza do navegador e **sem os 44px de toque**, o card **Urgentes** ficava preto ao lado dos irmãos coloridos, e o **lápis da área era branco sobre fundo verde claro** (invisível). Causa raiz: o `js` recebeu o urgente e o abre-fecha em 31/07 e o `css` parou em 30/07. Corrigido em `css/mnt28.css` e **provado no navegador** (selo `#912018` sobre `#fee4e2`, card `#b42318`, abre-fecha 44×44, lápis `#2a6b5c`) |
| **LAY-0** | `modelos/comparar-layouts.html` criada, no `SHELL` do `sw.js` e com link em `modelos/index.html`. Conferida em navegador de verdade: **zero erro no console**, **zero rolagem lateral** em 375px e 768px, links com 44px, tabelas largas rolando **dentro** da moldura |
| **SJ-3** | ✅ **Folha do Matheus pronta.** Carga gerada e **testada no navegador**: `4. TAREFAS\CODE - Layouts e folha do Matheus (03-08-26)\IMPORTAR NO SITE - Folha do Matheus (41 servicos).json` (22 KB). **41 serviços** (40 da planilha − 1 que era pergunta + 2 sinalizados em 29/07 que não existiam: iluminação das ilhas e da carga e descarga), todos **não feitos**, 21 áreas. Provado: os serviços do Sr. João ficam **intactos**, a folha impressa sai com **"Responsável: Matheus"** e **não cita o Sr. João**, **nenhum lembrete 🔒 dela vaza** para o papel, 7 selos VERIFICAR na tela. Falta só ela **importar**. Análise (5 causas, RDC 216) no `FOLHA DO MATHEUS (SJ-3) - levantamento conferido.md` |
| **CSS-2** | O traço de "vazio" da folha de NC estava em contraste 2,0 (sumia no celular na luz da loja) → `#767783` |

### Anotações dela no Notion (31/07, guardadas a pedido) — códigos novos

| Cód | O que |
|---|---|
| **DOC-9** | Reenviar os **3 arquivos atualizados**: AUDITORIA · PLANO REESTRUTURADO · PROMPT PARA A CONVERSA NOVA (caixinha dela no Notion segue desmarcada) |
| **SINC-1** | **Sincronização de pendências 1**: plano + as anotações da aba do Notion dela — revisar e unificar ("me ajudar a não me perder mais") |
| **SINC-2** | **Sincronização de pendências 2**: plano + o grupo do site no **WhatsApp** — revisar e incluir no plano |

### 🔍 Achados da varredura de 31/07 (Penúltima → SITE 28.07 → SITE 29.07)

| Cód | O que |
|---|---|
| **AUD-23** | **A cor dos botões da barra** — decisão dela, estava no plano de 29/07 e tinha caído |
| **AUD-24** | Conferir se o "Quadro Geral estilo Notion" (checklists DENTRO das demandas, categorias urgente/alta/média/baixa) já está atendido ou ficou pela metade |
| 📌 | **AR-1 já tem ferramenta pronta**: o documento editável das 95 áreas/622 textos (entregue em 28/07, com mover-de-aba e campo de destino) — ela ainda não devolveu as decisões |
| 📌 | O Word "PLANO PARA O MAPA MENTAL (29-07)" e a regeração interrompida na SITE 29.07 estão **obsoletos** — vale o **PLANO NOVO (31-07)** |
| 📌 | Existe um **prompt do "chat de orientações"** (3º chat, só aconselha) no OneDrive → ARRAIAL - Planilhas (28-07-26) |

## 🔴 EM ABERTO — na ordem em que uma destrava a outra

### Decisões dela (em clique, em lote)

| Ordem | Cód | O que | Meu voto |
|---|---|---|---|
| 1º | **SJ-6** | 3 dúvidas da folha: evaporadores (novo ou juntar?) · ferrugem no fundo da câmara (novo ou o mesmo do rodapé?) · confirmar o ralo do corredor | é o que está na mão dela agora |
| 2º | **AR-1** | Fechar as 95 áreas **por grupo** (~10 cliques) — ela recusou item a item | **é a raiz**: sem isso toda carga nova recria a bagunça |
| 3º | **PL-2** | O piso dos 6 itens marcados ⚠, inclusive "Corredor de Entrada", que não existe no cadastro | depende do 2º |
| 4º | **PL-1** | O caminho da planilha de Arraial | **editar no site e a planilha virar só exportação** — o único em que nada desencontra |
| 5º | **N8N-13** | Autorizar a esteira (n8n) | vale, **mas só aqui** — antes disso ela separaria errado mais rápido |
| 6º | **PL-3** | Revisar as ações corretivas (são sugestão gerada por regra) | depois do SJ-1; ela assina com o CRN |
| 7º | **BOT-12** | Testar áudio e modo ronda dos bots (as mensagens de 27/07 se perderam) | independente |
| 8º | **AUD-13** | Os 18 itens de manipulação para virar NC | parado desde 20/07 |
| 9º | **PRO-1** | As 11 seções ⚠ REVISAR do Checklist de CF | a única revisão em dupla |
| 10º | **AUD-18/19/20/21/22** | Fluxograma por áudio · teste do Importar · apagar o chat do token · a lista cortada de 14/07 · lembrete de sexta | 5 cliques de um minuto, numa tela só |

### O que é meu (não depende dela)

| Cód | O que |
|---|---|
| ~~DOC-1..8~~ | ✅ feito em 29/07 (v9.27): `PENDENCIAS.md`, `status.json` e `CONTINUIDADE.md` (estava parado em 19/07) atualizados. No **Notion** (página "2.0 PROJETO SITE (CENTRAL TRABALHO) > Claude CODE"): os **2 blocos vazios preenchidos** (AUDITORIA e PROMPT PARA A CONVERSA NOVA), seção **"0 · JÁ FEITO"** com as caixinhas marcadas, seção **"0.1 · DECISÕES QUE SÓ ELA PODE TOMAR"** e STATUS de "Não iniciado" → "Em andamento". **Falta só o PDF dos documentos** — e o TEL-11 abaixo |
| **TEL-11** | ❓ **preciso dela:** o Telegram entrou na AUDITORIA como frente ("2 bots no ar, falta testar áudio e ronda") e nos passos do plano, mas **não sei o que exatamente ela mandou sobre Telegram** que não entrou em nenhum documento. Ela precisa reenviar ou dizer onde está |
| ~~F-1~~ | ✅ feito em v9.27 |
| ~~F-2~~ | ✅ feito em v9.27 |
| ~~F-3~~ | ✅ feito em v9.34. A aba MNT entrou no "⚙ Ver configurações" (a porta abria vazia — foi isso que ela viu no PC do trabalho em 30/07): nome, cargo/registro, responsável, data de emissão, **os 10 textos da folha** (título, colunas, rótulos — tela E impressão), esconder/mostrar painel de números e selos de origem. E o **título duplicado do topo saiu** da aba, por pedido dela — ficam "← Capa" e o ⚙ |
| **F-4** | Folha sair em **Word e WhatsApp** |
| **F-5** | Trazer ID e Anotações da planilha |
| **F-7** | 📄 reescrita proposta no documento SJ-1 — espera o OK dela |
| **F-8** | 📄 reescrita proposta no documento SJ-1 (alumínio anodizado + inox na observação) — espera o OK dela |
| **SJ-1** | 📄 **proposta pronta** (30/07): `4. TAREFAS\CODE - Resgate MNT (30-07-26)\PROPOSTA SJ-1...md` — 3 causas raiz (maresia 22+, umidade, rodapés 8-em-1), reescritas F-7/F-8, base RDC 216/275. **Não aplicada**: espera a recuperação da tarde de 29/07 e o OK dela |
| **SJ-3** | Folha do **Matheus**. **Levantamento feito e conferido em 03/08** — e o número mudou: são **40** na planilha (não 37), zero linhas escondidas por filtro. Dos 5 sinalizados em 29/07, **2 já estavam lá** (lâmpada da câmara de laticínios e as 2 da cozinha), então a conta é **40 + 3 = 43**. **Não são 40 problemas, são 5 causas**: sem rotina de troca de lâmpada (14 itens) · luminária/tomada sem capa protetora (4 — RDC 216 item 4.1.15, risco de caco de vidro no alimento) · fiação exposta perto de água (3 — o mais grave) · disjuntor sem identificação (3, todos parados desde 10/02/2025) · forno da UAN (3 linhas que são o mesmo serviço). **7 serviços passaram de 1 ano parados.** Falta: a resposta de **LAY-3**, se os 25 já "concluídos" entram, o que são os **4 itens do "João"** (nome separado de "Sr. João" na planilha) e **as fotos dos documentos** — sem elas eu não afirmo que a folha está completa |
| ~~DEF-1~~ | ✅ feito em v9.28. Provado no navegador: **0 crachás trocados** em 12 modelos / 161 perguntas, e 0 modelos regravados à toa. Correção do plano: trocar por `metaSetU` **não** faria a trava viajar (essa chave não entra no envelope da sincronização) — o que resolve é preservar o crachá, e isso está feito |
| ~~DEF-2 / AR-3~~ | ✅ feito em v9.29. **O diagnóstico estava errado:** conferi no navegador e as áreas **chegam** no celular (entram no envelope e o `areasMod` sobe). O defeito real era pior: área apagada **não tinha Ctrl+Z**. Agora volta, e a seta diz "as áreas" |
| ~~DEF-3 / NOT-1~~ | ✅ feito em v9.37, agora do jeito certo: UTF-8 explícito e **prova do acento** antes e depois de gravar — se falhar, não escreve e cobra à mão. (1ª tentativa registrada: Fiz o guardião carimbar a data sozinho — e ele **quebrou os acentos do site publicado** (o PowerShell 5.1 lê o arquivo na codificação do sistema, não em UTF-8; 16 palavras quebradas viraram 483 e a capa dela encheu de rabisco). Desfeito. Hoje o guardião **confere e barra** se a data estiver velha, mas quem troca é quem publica. Voltar a automatizar exige ler/gravar em UTF-8 explícito e testar com palavra acentuada antes |
| ~~DEF-5~~ | ✅ feito em v9.27 |
| ~~DEF-7~~ | ✅ feito em v9.27 |
| ~~DEF-8~~ | ✅ feito em v9.27 |
| ~~DEF-4 / SB-7~~ | ✅ feito em 30/07. A biblioteca virou o repositório **privado** `leticiaoliveira-gh/biblioteca-design` (13 arquivos: as 16 peças, os 8 gráficos, a paleta validada e os checklists). Se este computador morrer, o desenho do site não morre junto |
| ~~AR-2~~ | ✅ feito em v9.38: criar empresa **oferece copiar o mapa de áreas** de outra — um clique e nasce organizada |
| **AR-4/5** | Padrão de nome das câmaras · padronização dos 622 textos e mover item de aba errada |
| ~~NOT-2/3~~ | ✅ feito em v9.37: a **nuvem** aparece como backup na capa ("nuvem HH:MM ✓" — guarda todas as versões e sobrevive a trocar de PC) · página `modelos/` com os cards antigos (museu, só olhar) |
| **AUD-10/11** ~~12~~ | ✅ AUD-12 feito em v9.38: **palavras de urgência editáveis** pela janela do painel ⚙ da NC, sincronizadas, campo vazio = padrão. AUD-10/11: as **propostas estão na tela** (`modelos/layouts.html` — 3 opções para NC, 2 para Manutenções); falta ela escolher |
| **AUD-16/17** | Responder "no celular precisa de backup?" · configurações atreladas ao login |
| ~~SKILL-14~~ | ✅ feito em 30/07. Virou a skill `phd-em-solucoes` (`~/.claude/skills/`). Como memória ela só era *lembrada*; como skill ela **dispara sozinha** sempre que eu for entregar levantamento, lista, achado, NC, serviço de manutenção ou ação corretiva — que é exatamente onde ela falhou nos 121 |
| **AUD-14 / NOT-6** | Nome da capa: **Central Técnica** por ora, ela não está contente. Montar rodada nova **na tela**, não no chat |

---

## 🚫 NUNCA PROPOR DE NOVO (Ramo 5 dela)

Samsung · card de pendências na capa · setas ▲▼ · a palavra "URGENTE" escrita · listra de
prioridade · nota em percentual no consolidado · bot único para duas lojas.

---

## Regras que valem sempre

Manutenção **nunca** recebe tarefa de manipulador de alimento · elétrica é do **Matheus**,
sinalizar e não incluir · demanda começa **no verbo** ("Limpar o esterilizador de facas.")
· ela **nunca orça**, só dá a ideia · **"VERIFICAR" não se apaga** · `dados/` não viaja:
sem o arquivo de importação nada chega no celular dela · carga **abaixo de 1 MB** ou a
sincronização trava · antes de dizer que chegou nela, conferir o `?v=` **e** a lista
`SHELL` do `sw.js`.
