# PENDÊNCIAS — Central de Demandas NP
### atualizado em 29/07/2026 (v9.26) · este arquivo é a memória entre conversas

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
| **DOC-1..8** | Atualizar os 3 documentos + `CONTINUIDADE.md`, gerar PDFs, preencher os 2 blocos vazios do **Notion** e marcar as caixinhas prontas. Incluir o **Telegram** (TEL-11), que ela mandou e não entrou em nenhum |
| **F-1** | Separar **"Recado para o Sr. João"** (imprime) de **"Meu lembrete"** (só ela vê). Hoje as observações dela **saem impressas na folha dele** |
| **F-2** | "VERIFICAR" em **vermelho com selo escrito** (cor nunca sozinha) |
| **F-3** | Painel de configuração da aba MNT |
| **F-4** | Folha sair em **Word e WhatsApp** |
| **F-5** | Trazer ID e Anotações da planilha |
| **F-7** | Refazer a frase do rodapé do salão |
| **F-8** | Portão: **não vira "orçar"** — serviço + ideia técnica na observação |
| **SJ-1** | Revisar os 121 serviços como **PhD em soluções** (padrão por trás: toda a ferrugem de Arraial é 1 problema — maresia — com 30 sintomas) |
| **SJ-3** | Folha do **Matheus** (37 de elétrica + os 5 sinalizados hoje) |
| **DEF-1** | Qualidade/BPF: a migração troca o uid das perguntas e grava a trava com `metaSet`. Plano pronto em `~/.claude/plans/attach-wobbly-turtle.md` |
| **DEF-2 / AR-3** | Áreas gravadas com `metaSet` (local) em vez de `metaSetU` — **o que ela cadastra no PC pode não chegar no celular** |
| **DEF-3 / NOT-1** | `APP_DATA` digitado à mão — publicar e esquecer = data errada. Automatizar na publicação |
| **DEF-5** | **A data de emissão que ela edita é ignorada na impressão** (`js/mnt28.js:522` usa `today()`) |
| **DEF-7** | Chavinha Ativa/Inativa com **20px** de toque — o `polimento.css` não cobre `label.switch` |
| **DEF-8** | A regra dos 44px morre acima de 640px: no tablet, 5 botões da capa ficam entre 25 e 37px |
| **DEF-4 / SB-7** | A biblioteca de design **só existe neste computador** — subir para repositório privado |
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
