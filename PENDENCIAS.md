# PENDÊNCIAS — Central de Demandas NP
### atualizado em 30/07/2026 (v9.33) · este arquivo é a memória entre conversas

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
| **F-3** | Painel de configuração da aba MNT |
| **F-4** | Folha sair em **Word e WhatsApp** |
| **F-5** | Trazer ID e Anotações da planilha |
| **F-7** | Refazer a frase do rodapé do salão |
| **F-8** | Portão: **não vira "orçar"** — serviço + ideia técnica na observação |
| **SJ-1** | Revisar os 121 serviços como **PhD em soluções** (padrão por trás: toda a ferrugem de Arraial é 1 problema — maresia — com 30 sintomas) |
| **SJ-3** | Folha do **Matheus** (37 de elétrica + os 5 sinalizados hoje) |
| ~~DEF-1~~ | ✅ feito em v9.28. Provado no navegador: **0 crachás trocados** em 12 modelos / 161 perguntas, e 0 modelos regravados à toa. Correção do plano: trocar por `metaSetU` **não** faria a trava viajar (essa chave não entra no envelope da sincronização) — o que resolve é preservar o crachá, e isso está feito |
| ~~DEF-2 / AR-3~~ | ✅ feito em v9.29. **O diagnóstico estava errado:** conferi no navegador e as áreas **chegam** no celular (entram no envelope e o `areasMod` sobe). O defeito real era pior: área apagada **não tinha Ctrl+Z**. Agora volta, e a seta diz "as áreas" |
| **DEF-3 / NOT-1** | ⚠️ **meia-feita, e a tentativa deu errado.** Fiz o guardião carimbar a data sozinho — e ele **quebrou os acentos do site publicado** (o PowerShell 5.1 lê o arquivo na codificação do sistema, não em UTF-8; 16 palavras quebradas viraram 483 e a capa dela encheu de rabisco). Desfeito. Hoje o guardião **confere e barra** se a data estiver velha, mas quem troca é quem publica. Voltar a automatizar exige ler/gravar em UTF-8 explícito e testar com palavra acentuada antes |
| ~~DEF-5~~ | ✅ feito em v9.27 |
| ~~DEF-7~~ | ✅ feito em v9.27 |
| ~~DEF-8~~ | ✅ feito em v9.27 |
| ~~DEF-4 / SB-7~~ | ✅ feito em 30/07. A biblioteca virou o repositório **privado** `leticiaoliveira-gh/biblioteca-design` (13 arquivos: as 16 peças, os 8 gráficos, a paleta validada e os checklists). Se este computador morrer, o desenho do site não morre junto |
| **AR-2** | Áreas nascerem junto com a empresa (`addEmpresa` só grava nome e sigla) |
| **AR-4/5** | Padrão de nome das câmaras · padronização dos 622 textos e mover item de aba errada |
| **NOT-2/3** | Backup automático que sobrevive a trocar de PC · página com os modelos antigos de card |
| **AUD-10/11/12** | Layout da aba de NC · layout da aba Manutenções · palavras de urgência editáveis pela tela |
| **AUD-16/17** | Responder "no celular precisa de backup?" · configurações atreladas ao login |
| **SKILL-14** | Virar **skill** o "PhD em soluções" (hoje é só memória — por isso não pegou nos 121) |
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
