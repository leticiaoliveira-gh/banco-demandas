# PENDÊNCIAS — Central de Demandas NP
### atualizado em 13/08/2026 · este arquivo é a memória entre conversas

---

## 📊 ESTADO DE ARRAIAL DO CABO EM 13/08 — relatórios gerados

`4. TAREFAS\CODE - Relatorios Arraial (13-08-26)\` — os dois **separados**, em PDF e em texto:

| Relatório | Números |
|---|---|
| **Folha de Manutenção** | **147 serviços** · Sr. João 106 · Matheus 40 · sem responsável 1 · **34 parados há mais de um ano** · 9 páginas |
| **Relatório de Não Conformidade** | **178 em aberto** · **35 urgentes** · 172 há mais de 30 dias · 12 páginas |

Os dois já saem com a orientação técnica e a categoria (**Exigência / Recomendação / Dica funcional**)
onde ela existe.

### ✅ A separação está certa do lado da manutenção

Auditei os 147 da folha procurando tarefa de manipulador: **nenhuma**. As 5 que o filtro levantou
são falso alarme (identificar disjuntor e trocar borracha de porta **são** manutenção). A regra
"manutenção nunca recebe tarefa de manipulador" está sendo cumprida.

### 🔴 MNT-QUA-1 — mas o contrário acontece: 12 obras dentro do Relatório de Qualidade

São 12 não conformidades **abertas** que são serviço de quem conserta, não desvio de Boas Práticas.
**Não movi nada** — é dado dela e a decisão é dela:

| Onde está | O que é |
|---|---|
| 1º Piso · AÇOUGUE | vedar/fechar as peças dentro das ilhas |
| 1º Piso · ENTRADA DE CARGA E DESCARGA | porta enferrujada, amassada e vulnerável a praga |
| 1º Piso · FREEZER | pintura nas prateleiras enferrujadas — **o texto já diz "> Sr João"** |
| 1º Piso · GERAL | piso quebrado do corredor · forro aberto da produção |
| 2º Piso · CÂMARAS FRIGORÍFICAS + CORREDOR | goteira quando chove · renovação de pintura (2 registros) · utensílios enferrujados |
| 2º Piso · CÂMARAS DESATIVADAS | porta de correr e trilho precisam de pintura |
| 2º Piso · CÂMARA DE LATICÍNIOS | fundo da câmara com ferrugem |
| 2º Piso · CÂMARA ZERO | ferrugem na porta |

**Por que importa:** enquanto estiverem na aba de Qualidade, não entram na folha do Sr. João e
ninguém as executa — e ainda inflam o número de não conformidades que ela leva para a gerência.
Há também **ferrugem** aqui que é a mesma **maresia** dos 22 da folha: é uma causa só, contada duas
vezes em dois lugares.

**Também aparece o AR-1:** duas dessas estão em "CÂMARAS FRIGORÍFICAS + CORREDOR **(1º PISO)**"
mas marcadas como **2º Piso** — a área diz uma coisa e o piso diz outra.

### 📄 CF-2 — RELATÓRIO DO 2º PISO DE CABO FRIO (06/08) — entregue

Pedido dela: um documento **só** para a gerência, unindo **qualidade e manutenção**, focado no
**2º piso**, objetivo, com estratégia — e não a loja inteira. A folha de manutenção de CF para o
Sr. João sai **separada**, depois.

**Medido no banco (não estimado):** 198 pendências em aberto no 2º piso · 18 urgentes ·
153 de qualidade e 45 de manutenção. Agrupadas por causa: **5 causas** explicam tudo —
lugar indefinido para as coisas (73) · falta de rotina de fim de turno (53) · estrutura vencida (51)
· compras represadas (26) · falta de padrão de identificação (11).

**O achado mais grave:** uma única câmara acumula **frios e laticínios + hortaliças + alimentos
impróprios para consumo**. Alimento condenado dividindo porta com alimento de consumo. E a câmara
da confeitaria antiga está **vazia** desde a mudança — a solução já está dentro da loja.

**Três caminhos para a câmara vazia** (ela pediu mais uma opção além das duas registradas):
1. exclusiva de hortaliças — **recomendado**, resolve o achado grave sem obra e sem compra;
2. sala de embalamento (ideia dela) — boa, mas exige bancada e fluxo, fica como 2º passo;
3. **quarentena de impróprios/devolução** — o mais barato e o que mais protege numa fiscalização.
Recomendação: **1 + 3 juntos**, custo de uma placa e uma etiqueta.

**Ideias simples que fecham dezenas de linhas:** etiqueta única de 3 campos (o que é · feito em ·
vence em) + fita de cor por dia da semana · prateleira do manipulador na entrada da produção
(encerra 5 NCs de uma vez, base 4.6.3) · placa na porta de cada câmara e da sala da farinha ·
faixa no piso do corredor · manutenção **dentro** da parada de higienização, e dedetização só
**depois** de fechar forro e fresta.

**Base legal conferida no texto oficial da RDC 216/2004** (não de memória): **4.8.18** e **4.9.1**
identificação do alimento preparado · **4.7.6** palete/estrado liso, resistente, impermeável e
lavável · **4.1.15** utensílio que não transmita substância e resistente à corrosão · **4.2.5**
saneante em local reservado · **4.6.3** objetos pessoais em local específico · **4.1.3** piso,
parede e forro sem bolor · **4.1.9** elétrica embutida ou protegida.
Mantida a regra da casa: **a lei não obriga inox**, obriga a característica.

**Entregue:** `4. TAREFAS\CODE - Relatorio 2o piso Cabo Frio (06-08-26)\` — relatório da gerência
(**4 páginas** A4, identidade visual da casa) e briefing dela (**2 páginas**: como abrir a conversa,
respostas prontas para as três objeções e o que é técnico dela). Conferido no Chrome: sem rolagem
lateral, maior elemento cabe em 359px, PDF com todas as normas presentes.

**Fica para depois, como ela pediu:** a folha de manutenção de CF só para o Sr. João.

### ✅ AUT-1 — MODO DE EDIÇÃO TOTAL, 1ª parte (v9.49, 05/08)

Pedido dela: *"autonomia total de gerenciamento no futuro, sem alterar o
design"*. **Nenhuma cor, medida, fonte, sombra ou layout mudou** — o que entrou
só existe enquanto o modo de edição está ligado.

| O que | Como |
|---|---|
| Um botão só | o ✎ de sempre (`toggleModoEdicao`) passou a ligar também o arrastar e o esconder |
| Balanço estilo iPhone | reaproveita o `@keyframes balanca` que já existia; agora vale nos cards do Sumário e nas empresas |
| Arrastar o **card inteiro** | `SortableJS` local em `js/lib/sortable.min.js` (sem CDN, offline preservado), ligada em `js/edicao.js`. **`forceFallback:true`** — o mesmo gesto no computador e no celular; era o arraste nativo do Windows que fazia o "não consigo arrastar" dela |
| Esconder / trazer de volta | ✕ no canto do card. **Nada é apagado**: vai para `hubCfg.escondidos` e volta pela linha "1 quadro escondido — trazer de volta" |
| Onde salva | `metaSetU` → entra no desfazer **e** vai para a nuvem (`hubCfg`/`hubCfgMod` no envelope e no merge). Decisão dela: nada de localStorage |
| Rede de proteção | sem a biblioteca (`typeof Sortable==="undefined"`), `js/edicao.js` desiste em silêncio e o site segue com o arraste por alça de sempre. **Testado.** |

**Provado no navegador:** arrastar troca a ordem e grava · o ✕ esconde e a linha
traz de volta · a seta ← desfaz o esconder **e** o arrastar, com a tela
redesenhando (faltava `renderHub()` no `histAplicar` — corrigido) · desligar o
modo devolve a tela ao estado exato de antes (zero controles, zero animação) ·
375px sem rolagem lateral, botão de esconder com 36px em tela pequena ·
console limpo.

**Falta da 2ª parte:** escrever por cima de *todos* os textos (hoje já vale em
`[data-txt]`, títulos, checklists e quadro geral — falta padronizar no resto),
duplicar/criar pelo card, e a **Entrega 2: as setas sobreviverem ao recarregar**
(hoje o histórico morre ao abrir o site de novo — é o que ela reclama).

### 🔴 SINC-3 — POR QUE ELA NÃO VIA NADA CHEGAR (achado em 04/08, à noite)

Ela abriu o site, fechou, abriu de novo e continuava "Overview". **Não era falta
de publicação: o navegador dela estava DESCONECTADO da nuvem.** Medido na
própria máquina dela: `syncEnabled() = false`, usuário e repositório vazios,
nenhuma chave guardada.

**Causa:** entrar pela senha grava a chave **só no `sessionStorage`** — por
desenho (`js/sync.js`: *"Entrar por senha é SEMPRE modo temporário: fechou,
sumiu"*), regra criada para o PC do trabalho. Ela usou esse caminho em 03/08;
ao fechar o navegador, a conexão sumiu. **Desde então, nada da nuvem chegava —
e ela não tinha como saber**, porque a capa mostrava a data do último envio
("nuvem 03/08 12:20 ✓"), que parece confirmação de que está tudo certo.

**Resolvido na hora:** as decisões de 04/08 foram aplicadas direto no banco
daquele navegador, pelo mesmo caminho do botão Importar. Conferido lá:
título **Central Compliance**, folha com **144**, 1210 itens vivos, **26
lembretes 🔒** e nenhum "João" solto.

**Fica em aberto, e é dela:** reconectar a sincronização (só ela digita a
chave). E há um defeito de tela a corrigir: **quando a sincronização está
desligada, a capa não diz isso com clareza** — o rótulo de backup continua
mostrando data antiga como se fosse "✓". Enquanto isso, cada aparelho fica
sozinho e ninguém percebe.

## ✅ AS DECISÕES DE 04/08 ESTÃO APLICADAS (a pedido dela: *"importa pra mim"*)

Aplicadas **pela nuvem**, com a mesma regra do botão Importar (por item, vence o
`mod` mais novo; `deleted` vira lápide; textos entram pelo `textosMod`). Commit
`sync 2026-08-04T23:40` no repositório de dados — chega no celular e no
computador na próxima sincronização.

| Conferido depois de aplicar | |
|---|---|
| Atualizados · novos · saíram | **17 · 1 · 3** |
| Folha do Sr. João | 142 → **144 serviços** |
| Aba antiga de Manutenções | 529 → 525 (os 4 do "João" saíram de lá e entraram na folha) |
| Não Conformidade | **504 → 504, intacta** |
| Lembretes 🔒 | **26, todos preservados** |
| "João" solto como executor | **zero** |
| Nome da capa | "Overview" → **"Central Compliance"** |

Estado de antes guardado em `Backup NC - 04.08.26\ANTES das juntadas (04-08)\`
(dois arquivos: o snapshot e a cópia conferida).

**Falso alarme corrigido na hora:** o vigia acusou 6 lembretes "sumidos" — eram
os 6 ralos cujo **texto** eu reescrevi. Ele comparava por área + frase. Agora o
Excel leva a coluna **Código do serviço** e a comparação é por ele: reescrever
uma frase não acusa mais nada, e apagar um lembrete de verdade continua
acusando (testado nos dois casos, num diretório de teste).

## 🟢 DECISÕES DELA — rodada de 04/08 (respostas da tela `modelos/decisoes.html`)

| Cód | Assunto | Decidido |
|---|---|---|
| **JOÃO-1** | Os 4 itens escritos como "João" | **São do Sr. João.** Entram na folha dele. No item das baratas, a **dedetização** vai para a empresa de pragas e o **fechamento das frestas** fica com ele |
| **SJ-6 · 1** | Os dois textos de evaporador | **Juntar num só**, com observação: **verificar se é serviço do Sr. João ou de empresa especializada** |
| **SJ-6 · 2** | Ferrugem × rodapé solto na câmara F&L | **É o mesmo rodapé. Juntar** |
| **SJ-6 · 3** | O ralo do corredor | **Juntar** no item "todos os ralos do corredor", com observação atualizada: **a empresa já fez o desentupimento; o Sr. João confirma com a Monique se pode instalar o ralo** |
| **RALO-1** | Os 12 serviços de ralo | **Opção 1 com correção dela:** a solução certa (grelha com dispositivo de fechamento + ralo sifonado) vale para todos, **mas o lembrete continua em CADA área**. Agrupar por causa **não** é tirar a linha da área — o bloco explicativo é acréscimo, nunca substituição. Reescrever o texto sem travessão ` — ` e explicando melhor |
| **AUD-16** | Backup no celular | **Tirar a opção da tela do celular.** Ela não quer nem ver o botão lá |
| **AUD-17** | Configurações atreladas ao login | **Sim, sempre atreladas ao login.** Nunca configuração por aparelho. Decisão fechada, não perguntar de novo |
| **AUD-23** | Cor dos botões da barra | **Encerrado como está hoje** (claros com borda cinza). Não havia motivo registrado além de "decisão dela que caiu do plano de 29/07" |
| **AUD-14** | Nome da capa | Em aberto. Palavras dela: **Compliance · Compliance 360° · Central Compliance**. Montar rodada nova **na tela** |
| **AUD-18** | Fluxograma por áudio | Ela não entendeu o item. **Reapresentar com exemplo** antes de cobrar decisão |
| **AUD-19** | Teste do Importar | Testou, **não tem certeza se salvou** e não gostou da experiência. Vira tarefa minha: dar retorno visível do que entrou |
| **AUD-20** | Chat do token | Sem resposta nesta rodada |
| **AUD-21** | Lista cortada de 14/07 | **Encerrada** — ela não sabe mais do que se trata e nada dependia dela |
| **AUD-22** | Lembrete de sexta | **Encerrado** — ela não lembra qual é |
| **TEL-11** | Telegram | Ela acha que era sobre **áudio** e não tem o registro. **Prioridade dela: "isso tem que funcionar".** Vira BOT-12 (testar áudio e modo ronda) |

### ✅ FEITO em 04/08 (v9.46) — o backup à prova de balas

| O que | Onde |
|---|---|
| O botão **⬇ Backup** agora grava na pasta dela. Se a permissão caiu, ele pede de volta no próprio clique; só cai em Downloads se ela recusar, e o aviso diz isso | `js/app.js`, `exportExcel()` |
| **O expurgo automático saiu.** Havia um trecho que apagava sozinho toda pasta de backup além das 7 mais recentes. Decisão dela: **nunca apagar nada** | `js/app.js`, `doBackup()` |
| A capa mostra o **nome da pasta** de backup, não só "auto ✓" | `js/app.js`, `renderHome()` |
| **AUD-16 fechado**: no celular o "⬇ Exportar para Excel" do menu ⋯ some. Era o último lugar em que o backup aparecia lá | `index.html` + `ocultarBackupNoCelular()` |
| **Tarefa agendada diária "Backup diario - Central Compliance", 20h.** Não depende do navegador nem de ela abrir o site: busca o banco na **nuvem** e grava em `- BACKUPS\Backups - Relatório Não Conformidades\Backup NC - DD.MM.AA` (JSON + CSV). Cobre o trabalho feito no celular e em outros aparelhos. Log em `_log do backup diario.txt` | `4. TAREFAS\CODE + POWERSHELL - Backup a prova de balas + juntadas (04-08-26)\backup-diario.ps1` |
| Os 3 arquivos soltos de 23.07.26 foram para `Backup NC - 23.07.26\manual (22h45)`. Nada apagado | pasta de backups |

### ✅ AUD-19 — o RECIBO DO IMPORTAR (v9.47, 04/08)

Ela importou uma vez e ficou sem saber se salvou: o aviso era um toast que
sumia em segundos. Agora, ao importar um arquivo de atualização, abre uma
**janela que fica na tela** e diz, item por item: **atualizados · novos · os que
saíram da folha · os que não entraram** — com o nome da área em cada linha.
Fecha no ✕, no botão, no Esc ou clicando fora, e lembra que o **←** desfaz.

Feita com as peças da biblioteca (`bd-fundo`, `bd-janela`, `bd-kpi`, `bd-aviso`,
`bd-btn`) — nada construído do zero. Confere pelo **banco depois do merge**: o
que está escrito é o que ficou gravado, não o que o arquivo prometia.
`reciboDaImportacao()` em `js/app.js`, estilo no fim de `css/app.css`.

**Provado no navegador:** 1 atualizado, 1 novo e 1 absorvido classificados
certo; console sem erro; 375px sem rolagem lateral; botão de 44px; foco entra na
janela, o Tab não escapa e volta para onde estava ao fechar.

### 🔵 LE-1 · NOTION E WHATSAPP — **parado, é dela. NÃO FAZER NADA.**

Ela quer **ver sozinha primeiro** o que existe no Notion e no grupo do WhatsApp
do site, e só depois pedir o que aplicar. Não sugerir, não adiantar, não deixar
pronto "para o caso de". Só entra em pauta quando **ela** trouxer.

### ✅ CORREÇÃO IMPORTANTE (04/08, noite) — os VERIFICAR NÃO estavam perdidos

Conferindo campo a campo antes de mexer, apareceu o seguinte: os 9 lembretes
estão **inteiros no campo "Meu lembrete 🔒"** (`nota`). Foram **movidos** para lá
pelo botão *"🔒 Tirar N VERIFICAR da folha impressa"* (`js/mnt28.js`) — que
existe justamente para o lembrete dela não sair no papel do executor. A
observação esvaziou porque o texto **mudou de campo**, não porque sumiu.
Hoje são **26 lembretes 🔒 na folha**.

**Consequências, e valem como regra:**

1. **Procurar VERIFICAR olhando os DOIS campos** (`obs` e `nota`). Olhar só um
   dá diagnóstico errado — foi o que aconteceu comigo.
2. O arquivo de atualização **não devolve** VERIFICAR para a observação:
   devolver faria o lembrete voltar a ser impresso, o oposto do que ela quis.
   Ele **preserva** as notas intactas (conferido item a item).
3. **O VERIFICAR na observação SAI impresso.** Só o campo 🔒 nunca sai. Por isso
   o backup guarda as duas versões da folha.

### 🟠 OS 9 "VERIFICAR" — o que se fez em 04/08

Os 9 lembretes que ela deixou na folha de 29/07 esvaziaram entre 29/07 e 03/08.
**Os serviços ficaram; só as observações sumiram.** Ela só percebeu porque tinha
a folha impressa numa foto. O texto se preservou em `dados\mnt28-carga.json` —
que estava **fora do git e fora de todo backup** (arquivo único, num lugar só).

| Frente | O que ficou pronto |
|---|---|
| **O dia 29/07 virou backup** | `Backup NC - 29.07.26\` com a folha **igual à impressa** (HTML), a planilha e a carga crua. A folha é reconstituída de **duas fontes**: serviço e recado vêm do banco (é o que foi impresso), o VERIFICAR vem da carga. Nenhuma fonte sozinha reproduz o papel |
| **Os 9 voltam para a folha viva** | entram no mesmo arquivo de atualização (24 itens agora). Nos 6 de ralo a observação **começa** por "VERIFICAR — tenho dúvida." e a explicação técnica fica no campo de orientação; os 3 de sinalização entram só para receber "VERIFICAR se ainda tem." |
| **VERIFICAR em TODOS os backups** | cada pasta diária passa a ter `VERIFICAR do dia.csv`. Gerado também **retroativamente** nas pastas antigas: 17/07 (1) · 18/07 (1) · 19,20,21/07 (19) · 23/07 (20) · 29/07 (9) · 04/08 (24) |
| **Alarme** | o script diário compara com o backup **imediatamente anterior**, e só nas abas que aquele backup cobre. Caindo o número, escreve no log e grava `ATENCAO - VERIFICAR que sumiram.txt` com área e serviço. Ele nunca conserta sozinho |

### 📁 O PADRÃO FIXO DE CADA BACKUP (decisão dela, 04/08)

Toda pasta `Backup NC - DD.MM.AA` tem **sempre os mesmos arquivos, com os mesmos
nomes** — quem monta é `gerar-relatorios.py`, chamado pelo backup das 20h:

| Arquivo | O que é |
|---|---|
| `Relatorio MNT - entregue.pdf` | a folha como o Sr. João recebe: **sem** o campo 🔒 e sem observação marcada com VERIFICAR |
| `Relatorio MNT - com VERIFICAR.pdf` | a mesma folha com os lembretes dela à vista, linha destacada |
| `VERIFICAR do dia.xlsx` | a lista dela em Excel formatado (cabeçalho verde, filtro, painel congelado, coluna do lembrete em âmbar) e **dizendo de que campo veio** cada lembrete |
| `Backup completo do site (nuvem).json` · `Demandas e Manutencoes (nuvem).csv` | o banco e a planilha geral |

**Conferido nos dois PDFs:** os dois trazem os **mesmos 142 serviços** — o filtro
é da observação, nunca do serviço. O "entregue" tem **zero** VERIFICAR e zero 🔒;
o "com VERIFICAR" tem 33 e 32. Padrão aplicado também, retroativamente, em
17, 18, 19, 20, 21, 23, 29/07 e 04/08.

**Filtro do que é lembrete:** só conta **VERIFICAR em MAIÚSCULAS** — é como ela
marca. "verificar" no meio de uma frase é português comum; se entrasse, a lista
viraria ruído (51 linhas em vez de 36) e ninguém mais olharia.

**O que quebrou em 23/07, para não repetir:** o backup em pasta usa uma permissão
que o navegador **devolve quando fecha**. Sem ela, `doBackup()` saía calado e o
botão manual ia para Downloads. Ninguém percebeu por 10 dias porque a capa dizia
"auto ✓" pelo estado antigo. Agora há três camadas: o botão pede a permissão de
volta, a capa mostra o nome da pasta, e a tarefa agendada roda **fora** do
navegador — se as duas primeiras falharem, a terceira continua gravando.

### 🔴 Demandas NOVAS abertas nesta rodada

| Cód | O que | Causa raiz já apurada |
|---|---|---|
| **BKP-1** 🔴 **urgente (pedido dela)** | O botão **⬇ Backup** cai em Downloads mesmo com a pasta fixa configurada | **Achado no código:** `exportExcel()` (`js/app.js`) usa sempre `download()`, que é o baixar do navegador. A pasta escolhida (`backupDir`) só é usada por `doBackup()`, o automático de 30 s. Ou seja, o clique manual **nunca** enxergou a pasta. Correção: se existir pasta autorizada, o botão grava nela e avisa onde salvou |
| **BKP-2** | Ela não sabe mais qual é a pasta fixa do backup | A capa mostra "auto ✓" mas **não mostra o nome da pasta**. Correção: exibir o nome (`dir.name`) e o caminho ao lado do estado |
| **BKP-3** | "Nunca sei se sincronizou / se tem backup" | A capa informa em números e datas, não em estado. Proposta: uma frase única de estado ("tudo salvo na nuvem às HH:MM"), verde quando está tudo certo |

---

## 🟢 DECISÕES DELA — rodada de 03/08. **Valem sempre. Não perguntar de novo.**

> Colhidas uma a uma, com o conteúdo desenhado na tela antes de cada pergunta (pedido dela:
> *"já vem com a proposta certa pra minha visualização e não fica enrolando"*).

| Cód | Assunto | Decidido |
|---|---|---|
| **SJ-1a** | Maresia — 22 serviços de ferrugem em **AC** | **Caminho 3**: substituição progressiva — **alumínio anodizado com ferragens de inox** nos portões e grades, **inox** em prateleiras e estantes de câmara. Onde ainda não der para trocar, caminho 1 (raspar até o metal são + fundo anticorrosivo + esmalte; **nunca** tinta sobre ferrugem) |
| **SJ-1b** | Onde a explicação da causa aparece | **Opção 1** — orientação curta em cada item **+ um** bloco explicando a causa no fim da folha |
| **SJ-1c** | Quando existe bloco de causa | **Só quando muitos serviços têm a mesma origem.** Gatilho combinado: **5 ou mais**. Nos demais, item sem bloco. Achando outro caso, **sinalizar e ela decide** — nunca criar por conta própria |
| **PL-1** | Caminho da planilha de Arraial | **O site é o original; a planilha vira exportação.** Ela edita só no site (inclusive pelo celular, na loja) e a planilha sai por botão, sempre igual |
| **AR-1** | Qual lista de áreas manda em **AC** | **A dos serviços** — as áreas que ela lê na folha impressa. O cadastro se ajusta a ela. ⚠️ **Aplicar exige mais uma decisão dela** — ver o levantamento abaixo |
| **MAT-1** | Materiais de limpeza do 2º piso, **AC** | **Existe**, é área própria do 2º piso. Os 3 serviços ficam onde estão e **o VERIFICAR permanece nos três** |
| **LEG-1** | Banco de legislações da área dela, clicável | Aceito — **para o fim da fila**, palavras dela: *"é algo para se aplicar futuramente, porque tem coisa mais urgente"* |

### 🔴 LEG-0 — COMO A BASE LEGAL APARECE. Regra fixa, vale em TODO documento.

Toda orientação técnica sai com **uma das três categorias**, com cor própria. O **selo classifica**
e o texto **começa direto no que fazer** — sem repetir a palavra antes.

| Categoria | Cor | Quando | O que leva junto |
|---|---|---|---|
| **Exigência** | vermelho `#b42318` / fundo `#fee4e2` | A norma obriga | **sempre** o item citado |
| **Recomendação** | âmbar `#b3730a` / fundo `#fffaeb` | Existe norma, mas ela não obriga esse caminho | diz **o que é exigido** e **o que é melhor** |
| **Dica funcional** | azul `#1668b8` / fundo `#e7f0f9` | Ideia dela, o "sair da caixinha" | **sem norma citada** — dito na cara |

Nenhuma orientação sai sem a sua categoria. Na folha impressa (preto e branco) a categoria vai
**escrita entre colchetes** — cor nunca é a única forma de dizer algo.

**LEG-0b · vocabulário:** **"Boas Práticas" sempre no plural** — é o nome do regulamento (BPF); no
singular soa amador num documento assinado com o CRN. E **não** usar "Boas Práticas" como nome de
selo: o selo é **Recomendação**.

### 📗 BASE LEGAL VERIFICADA no texto oficial da RDC 216/2004 (não de memória)

| Item | O que exige | Onde se usa |
|---|---|---|
| **4.1.3** | Piso, parede e teto lisos, impermeáveis e laváveis; íntegros, livres de **bolores** e **descascamentos**; não podem transmitir contaminante | mofo, infiltração, rodapé, pintura descascando |
| **4.1.8** | Luminárias sobre a área de preparação **protegidas contra explosão e quedas acidentais** | luminária sem capa |
| **4.1.9** | Instalações elétricas **embutidas ou protegidas em tubulações externas e íntegras** | fiação exposta |
| **4.1.15** | Equipamentos e móveis **resistentes à corrosão** e em adequado estado de conservação | os 22 da maresia |

Complementam: **RDC 275/2002** (POPs e checklist de BPF) e **RDC 854/2024** (metais em contato com
alimento; substituiu a RDC 20/07 — serve para exigir do fornecedor que o inox seja de liga própria
para alimento).

> ⚠️ **A lei NÃO obriga inox.** Ela obriga **característica**: resistente à corrosão e superfície
> íntegra. Dizer "a lei manda inox" é falso e derruba a fala dela. O que ela diz é: *"a norma exige
> material resistente à corrosão e superfície íntegra — o que está lá está corroído e descascando
> sobre alimento. O inox é o material que cumpre."*
>
> 🚫 **Nunca citar a CVS 6/99**: é do estado de **São Paulo** (não vale no RJ) **e foi revogada**
> pela Portaria CVS 5/2013. A base dela é a **federal**.

### ✅ APLICADO EM 03/08 (v9.45) — as decisões dela viraram código

| Cód | O que foi construído |
|---|---|
| **LEG-0** | **A peça da orientação técnica existe e é uma só** para as duas folhas (`orientacaoHTML`, `orientacaoTexto`, `orientacaoFormHTML`, `orientacaoLer` em `js/app.js`; `.ori-*` em `css/app.css`). Cada serviço/NC ganhou `orientacao`, `orientacaoTipo` e `orientacaoBase`. **Provado no navegador:** os três selos na tela com as cores certas; no papel a categoria sai **entre colchetes** (`[Exigência] RDC 216/2004, item 4.1.15`); o campo da norma **some sozinho** quando é Dica; item sem orientação não mostra nada; os 3 botões com **44px** no celular; contraste da norma âmbar subido de 3,9 → **7,5** |
| **SJ-1c** | **Bloco de causa** no fim da folha (`m28CausaHTML` + `causaTitulo`/`causaTexto` no ⚙). **Não existe até ela escrever** — não nasce sozinho. Aparece na tela com lápis e fecha a folha impressa |
| **SEG-1** | ✅ **Corrigido** o passo a passo do PC do trabalho (`js/app.js`, "Como faço para..."). O texto antigo mandava usar a "Configuração manual" — o único caminho em que o token do GitHub podia ficar gravado para sempre no PC de terceiro. Agora ensina o caminho da senha, avisa para recusar o "salvar senha" do navegador, e diz que **fechar a aba não basta** (o banco inteiro fica no PC; só o 🚪 apaga) |
| **F-4** | ✅ **A folha sai em Word e em WhatsApp.** `m28ParaWord()` (via `js/docxlite.js`, que já existia) e `m28ParaWhatsApp()`, que copia o texto pronto — com `*negrito*`, `⬜`/`✅` e a base legal — e, se o navegador não deixar copiar, mostra numa caixa para ela copiar à mão. **Provado:** respeitam os filtros da barra (escolhida a folha do Matheus, sai só a dele, e o nome do arquivo já vem com o nome dele), e **nenhum lembrete 🔒 vaza** |
| **PL-1** | ✅ **A planilha virou exportação.** `m28ParaPlanilha()` gera CSV com ponto e vírgula e BOM (é assim que o Excel em português abre certo), com 13 colunas — incluindo Orientação técnica, Tipo e Base legal. O site é o original; a planilha sai igual, quando ela precisar mandar para alguém |
| **F-5** | ⚠️ **Parado por falta de fonte.** O pedido é "trazer ID e Anotações da planilha". O **ID** existe (coluna `Nº`, 357/357 preenchidos). Mas a coluna **`Observação` está VAZIA em todas as 357 linhas** — e também nas outras três planilhas de Arraial. Todas elas foram *geradas pelo site* em 28/07 ("direto do banco"), não são as originais dela. **Precisa dela:** onde está a planilha com as anotações, ou se o que ela quer é outra coisa |
| **AUD-24** | ✅ **Conferido: não ficou pela metade.** O Quadro Geral já tem checklist dentro da demanda (campo "Passos", subitens por indentação, criação por voz) e as 4 categorias URGENTE / ALTA / MÉDIA / BAIXA editáveis (`DG_PRIOS_PADRAO`, `js/dg.js:15-20`). Nada a fazer |

### ⚠️ AR-1 — o levantamento completo (03/08). **Não executado: mexe em dado dela.**

Não são duas listas de áreas. **São três, e nenhuma tem uma única área em comum com as outras.**
Medido no banco dela, em **Arraial do Cabo**:

| Aba | Itens | Áreas | Pisos que usa |
|---|---|---|---|
| **MNT** (Sr. João + Matheus) | 142 | 35 | `1º PISO` · `2º PISO` |
| **Não Conformidade** | 175 | 31 | `1º Piso` · `1º Piso — Parte Interna` · `2º Piso` |
| **Manutenções e Elétrica** (antiga) | 357 | 50 | sem piso |
| **Cadastro da loja** | — | 90 | 4 pisos, incluindo "Parte Central" e "Parte Interna" |

**60 das 90 áreas do cadastro não têm nenhum item** em nenhuma aba.

**Por que parei:** aplicar "a lista dos serviços manda" significa **renomear a área de 175 não
conformidades** — onde ela trabalha a Qualidade e assina com o CRN. É mudança em massa em dado
real. Pela regra dela, isso vai por **arquivo de atualização, com checkpoint antes, e ela vendo
antes** — nunca escrito direto.

**O que falta ela decidir** (montar na tela, não perguntar por texto): se as três abas passam a
usar **uma lista só** (e qual nome vence em cada área), ou se cada aba mantém a sua e o site só
para de misturá-las no seletor. E o que fazer com "Parte Central" e "Parte Interna", que só a NC
usa.

### TEL-12 — os 6 registros do Telegram de 11/08 (corrigidos em 13/08)

Ela mandou 6 coisas pelo bot em 11/08 (08:32 às 09:04, Arraial) e **ficou tudo perdido**. Não foi
só área errada — foram **três causas somadas**:

1. **O bot mandava manutenção para a aba ERRADA.** `bot2/ponte2.py` gravava `tipo:"mnt"`, que é a
   aba antiga "Manutenções e Elétrica". Ela procurava na folha do Sr. João e não achava. Dos 12
   registros que já vieram pelo Telegram, **7 foram para a aba antiga e nenhum para a folha nova**.
2. **O formato antigo não tem piso** — então o `piso` que a ponte já tinha em mãos era descartado.
   Os 3 de manutenção chegaram sem piso nenhum.
3. **Áreas trocadas no envio** (ela selecionou correndo): o texto dizia "Açougue" e foi para Câmara:
   Corredor · dizia "câmara zero" e foi para Câmara de Laticínios · dizia "Corredor" e foi para
   Produção - Confeitaria.

**Corrigido no bot (13/08):** `montar_item` passou a gravar `tipo:"mnt28"` com **piso**, `executor`
(`EXECUTOR_PADRAO = "Sr. João"`), `origem:"Telegram"`, `dataRegistro` e `ordem` alta (entra no fim
da área, sem embaralhar a ordem que ela arrumou). ⚠️ **Vale para os próximos envios — o bot precisa
ser reiniciado.**

**Os 6 corrigidos com ela, um a um, mostrando a foto e o texto original** (arquivo
`4. TAREFAS\CODE - Layouts e folha do Matheus (03-08-26)\ATUALIZAR NO SITE - Telegram 11-08 corrigido.json`):

| # | Ficou | Decisão dela |
|---|---|---|
| 1 | 2º PISO · Corredor das Câmaras · **folha** | rejuntar o piso; era "Câmara: Corredor" sem piso |
| 2 | 2º PISO · Câmara Açougue · NC | **só a crosta** — a foto da água no chão saiu |
| 3 | 2º PISO · Câmara Desativada · NC | **um registro só**, ela não quis separar os 3 assuntos |
| 4a | 2º PISO · Câmara F&L · **folha** | ferrugem das **bancadas/armários** (não era trilho — ela corrigiu), com as 2 fotos |
| 4b | 2º PISO · Câmara F&L · **folha** | desamassar e pintar a porta — separado do 4a |
| 5 | 2º PISO · Câmara Zero · **folha** | **VERIFICAR** — veio sem foto e ela não lembra |
| 6 | 2º PISO · Corredor das Câmaras · NC | **VERIFICAR** — veio sem foto e ela não lembra |

**✅ APLICADO NA NUVEM EM 13/08** (ela mandou: *"faça sozinho tudo"*). Checkpoint salvo antes em
`- BACKUPS\...\Backup NC - 13.08.26\ANTES da correcao do Telegram (13-08).json`.
**Conferido no banco depois de subir:** os **7 estão lá**, todos com `2º PISO` · não conformidades
**507, intactas** · **35 lembretes 🔒 preservados** · 6 alterados, **0 sumidos**, 1 novo · a foto da
água saiu (17 → 16) · VERIFICAR subiu de 31 para 33 · folha do Sr. João/Matheus em AC:
**147 serviços**. Chega no aparelho dela na próxima sincronização.

**✅ BOTS REINICIADOS EM 13/08, 07:18.** `ponte2.py` alterado às 07:00, bots subidos às 07:18 —
pegaram o código novo. Log: *"Bot de Cabo Frio no ar"*, *"Bot de Arraial do Cabo no ar"*.
O bot **antigo** (`iniciar_bot.py`) não foi tocado — continua rodando como estava.

⚠️ **Sobraram 4 manutenções na aba antiga**, vindas do bot em 25 e 28/07. **Não foram movidas de
propósito:** não passaram pela revisão foto a foto, e podem ter área errada como estas tinham.
Movê-las às cegas propagaria o erro em vez de corrigi-lo.

**Lição:** os dois que ela não conseguiu identificar são **exatamente os dois que vieram sem foto**.
Sem imagem não há como reconstruir de memória dois dias depois — o que reforça pedir foto sempre.

### 🔴 REGRAS DE TRABALHO que nasceram desta rodada

| Cód | Regra |
|---|---|
| **REG-1** | **Sempre dizer de qual loja se trata.** Ela tem mais de uma. Nunca "a área existe" — sempre "em AC, a área existe". Vale em pergunta, documento, folha e conversa |
| **REG-2** | **O VERIFICAR é o método dela**: marcar para conferir **na loja** se o serviço já foi feito, **e só depois cobrar**. Não é dúvida do sistema. **Nunca oferecer tirá-lo, nunca perguntar se pode apagar** |
| **REG-3** | **Antes de perguntar, reler as decisões já anotadas.** Duas vezes em 03/08 eu re-perguntei algo já respondido, com outras palavras, e ela cobrou — com razão |
| **REG-4** | **Provar antes de afirmar.** Eu disse que o lápis trocava a área do serviço sozinho e pedi decisão baseada nisso; fui testar e estava errado. Medir no navegador **antes** de relatar |
| **REG-5** | **Decisão que ela não toma por texto vira desenho na tela** — nunca a mesma pergunta reformulada. Ver [[pergunta-sem-resposta-vira-desenho]] |

---

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
| **SJ-3** | Folha do **Matheus**. **Levantamento feito e conferido em 03/08** — e o número mudou: são **40** na planilha (não 37), zero linhas escondidas por filtro. Dos 5 sinalizados em 29/07, **2 já estavam lá** (lâmpada da câmara de laticínios e as 2 da cozinha), então a conta é **40 + 3 = 43**. **Não são 40 problemas, são 5 causas**: sem rotina de troca de lâmpada (14 itens) · luminária/tomada sem capa protetora (4 — RDC 216 **item 4.1.8**, risco de caco de vidro no alimento) · fiação exposta perto de água (RDC 216 **item 4.1.9**) · fiação exposta perto de água (3 — o mais grave) · disjuntor sem identificação (3, todos parados desde 10/02/2025) · forno da UAN (3 linhas que são o mesmo serviço). **7 serviços passaram de 1 ano parados.** Falta: a resposta de **LAY-3**, se os 25 já "concluídos" entram, o que são os **4 itens do "João"** (nome separado de "Sr. João" na planilha) e **as fotos dos documentos** — sem elas eu não afirmo que a folha está completa |
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
