# PRÓXIMA SESSÃO — comece por aqui, não releia mais nada

> Escrito em 22/09/2026, atualizado em 28/09/2026. Este arquivo é autossuficiente: **não precisa abrir
> CONTINUIDADE.md, PENDENCIAS.md nem o PDF do plano para começar a trabalhar.**

## COMO ESTA SESSÃO TRABALHA (ordem dela, 20/09/2026 — detalhe completo: seção 9 do `CLAUDE.md`)

1. **Investigar antes de perguntar.** Dúvida se resolve olhando este arquivo, o
   caderno vivo do plano, o histórico do git e os arquivos. No máximo **uma**
   pergunta por sessão, e só se for gosto, dinheiro ou risco.
2. **Uma demanda por sessão.** Terminou, roda o `/fechar-sessao` e avisa que
   ela pode abrir uma nova conversa.
3. **Nada se apaga e nada vai para arquivo morto.** O que não serve mais fica
   **riscado no lugar, com o motivo escrito**, e ela é informada.
4. **Abertura barata:** no começo, ler só este arquivo.

## Onde está hoje

Nesta sessão (22/09) entrou o botão **Revisar** nos relatórios: dentro do
relatório (o mesmo modelo que já vira PDF), ela clica num trecho e escreve
o que quer mudar ali, num painel do lado, igual comentário do Word. No fim
aperta "Copiar pedidos" e cola na conversa, para as mudanças serem feitas.
Ligado por enquanto em dois relatórios: Não Conformidades e Checklist de
Qualidade. Publicado, versão **11.5**, conferido pelos programas-guardião
(versão, cache e `status.json` batendo). Plano em **v31** (24/09: Melhoria 12 URGENTE — controle para a folha de manutenção sair certa; folha sempre separada por pessoa, conferência antes de imprimir, comparar com a folha anterior). PDF novo já mandado.

## 30/09 — PERDA DE 28/09 NO PC DO TRABALHO E PROTEÇÃO NOVA (v11.18)

Ela saiu do PC do trabalho por "Sair e apagar deste PC" e o que digitou em 28/09 não tinha
chegado à nuvem (uma ficha com foto defeituosa travava o envio de aparelho novo, em silêncio).
Feito: as 6 fotos marcadas voltaram para as 4 demandas; o site só apaga o aparelho depois de
enviar e conferir; faixa grande avisa quando algo ainda não foi para a nuvem. Os TEXTOS que ela
digitou em 28/09 não existem em lugar nenhum: se ela mandar o relatório impresso/PDF daquele dia,
redigitar tudo por ela. Detalhe: fim do `CONTINUIDADE.md` (seção 30/09).

## ▶ COMEÇAR POR AQUI — sem pedido aberto (28/09, fim da noite)

Último pedido dela (faixa verde da área + mover a demanda da lixeira do
recebimento) foi feito e publicado. Nada pendente dela neste momento — ver
seção "28/09" logo abaixo para o que foi feito, e "A PRÓXIMA DEMANDA" (Cabo
Frio) para o próximo passo natural quando ela mandar.

## 28/09 (fim da noite) — FAIXA VERDE REDESENHADA (v11.10) + lixeira do recebimento virou Qualidade/Compras

Ela escolheu a **Opção A** da página de comparação: pastilha "N serviços" no
canto direito, na mesma linha do nome da área; "Data registrada" numa linha
fina, alinhada à direita, logo abaixo. `js/mnt28.js`, `m28ImprimirFolha`
(~linha 1995): `.ar-top` (linha com `.ar-e` + pastilha `<b>`) e `.ar-sub`
(linha de baixo, só "Data registrada"). Pastilha do piso (`.ar-piso`) igual à
pastilha de serviços (mesma altura/fonte/acolchoamento). O indicador de tempo
de espera ao lado de cada data continua igual, nada foi tirado dali.
Publicado em **v11.10** (28/09, ~18h). PDFs de Arraial (1º e 2º piso, Sr.
João) gerados de novo com a faixa nova e mandados por SendUserFile; salvos em
`...\2. Transferência (CloudFlare)\memorias\Folhas Arraial (28-09-26)\`
(substituíram os PDFs antigos, mesmo nome).

Também em 28/09 (direto no banco, pedido dela por foto): a demanda "trocar a
lixeira do recebimento" (AC, 1º piso, doca) **saiu de Manutenção** — o
problema era o tipo de lixeira, não conserto. Virou NC de Qualidade
`nc-ac-lixo-receb-280926` (texto reescrito, sem citar a Vigilância Sanitária
e sem a frase da vassoura/rodo, pedido dela) e pedido de compra
`cmp-ac-lixeira-pedal-receb` (lixeira com tampa e pedal). Item antigo de
manutenção riscado (`apagado=1`) com nota explicando, histórico preservado.
Backup da nuvem antes da mudança: `../memorias/Copia da nuvem antes de mover
lixeira receb (28-09-26).sql`.

Também feito antes, mesmo dia (já registrado): gaiola do recebimento AC virou
"verificar manutenção da gaiola" na manutenção; entrou NC
`nc-ac-lixo-gaiola-280926` e a compra `cmp-ac-conteiner-lixo-receb`
(contêiner 240 L com tampa). Folhas do Matheus não geradas (regra dela:
esquecer por ora).

## 28/09 — FOLHA DE MANUTENÇÃO AJUSTADA E PUBLICADA (v11.9)

Pedido dela vendo a folha impressa (1º piso, Arraial, setembro), tudo em
`js/mnt28.js` (ESTILO e PAGINADOR de `m28ImprimirFolha`):
- **Demandas gerais à ESQUERDA, Urgentes à DIREITA** (regra fixa, ela já
  falou "50 vezes").
- Espaço entre áreas: `.grupo` margin-top 20px (era 12).
- "Data registrada" em `.ar-r` com 160px, a mesma largura da coluna da data
  em `.li`; a pastilha fica dentro de `.ar-e`, na mesma linha do nome.
- **Sem buraco no pé da folha:** antes de empurrar a demanda para a página
  seguinte, `tentaEncolher` diminui a foto (88/80/70/62/55%). Sempre avisa
  na tela (`.aviso.encolhi`, não sai no papel). Regra dela: "ajusta e recorta
  um pouquinho a imagem pra caber. Mas sempre me avisa".
- ARMADILHA: dentro de ESTILO/PAGINADOR a barra invertida some, então nada de regex.
- Ela disse que "tem mais algumas coisas que ficaram perdidas" na folha, mas não
  detalhou. Perguntar quando ela voltar ao assunto.
- **GitHub:** ela não usa mais. Anotado no plano v34 para ver depois. Saiu do
  O QUE FALTA (item 15 removido, item 13 só Cloudflare).
- Teste: rodar `m28ImprimirFolha({})` na página local `ferramentas/modo-rascunho/folha-editavel.html`,
  com `window.open` desviado para um iframe e `brDateCurta` definido à mão.

## PRIORIDADE (24/09) — MELHORIAS DELA: PUBLICADAS EM 26/09 (v11.8)

Ela deu o OK e a versão **11.8** foi publicada em 26/09. Migração `rev`
já rodada na nuvem. Cópia da nuvem antes: `../memorias/Copia da nuvem antes da versao 11.8 (26-09-26).sql`.
Conferido depois: 187 fichas e 53 fotos, iguais a antes. Itens (plano v32, seção "PRIORIDADE AGORA"): feito que
não volta (só nuvem Cloudflare, rev + selo "Salvo na nuvem"), tela não pula,
destaque da edição, foto girada grava, senha (olhinho, maiúscula, troca por
código, códigos restantes em Segurança), lista de pessoas, datas dd/mm/aa,
espaçamento, símbolos de traço no lugar de emojis (peça 20 da biblioteca),
folha impressa sem fundo vermelho, cada piso em folha nova com numeração única.

JÁ FEITO em 26/09 (fica de registro):
1. `npx wrangler d1 execute central-demandas --remote --file=servidor/migracao-rev.sql`
2. `npx wrangler deploy`
3. Conferir no site publicado a versão 11.8.

Falta ainda:
- Ordem do urgente (urgente em 1º dentro da área, pedido de 17/09): ela vai
  testar e dizer se fica.
- Emojis nas outras telas (`js/dg.js`, menu em `js/app.js`, `index.html`).
- Código de senha por e-mail: ela disse "sem e-mail por enquanto".

## A PRÓXIMA DEMANDA

**PEDIDO DELA (24/09): folha de manutenção de CABO FRIO, 1º e 2º piso, só do
Sr. João.** Quando ela mandar mensagem, ir direto, sem perguntar. Receita
completa, passo a passo e com as ferramentas prontas:
`ferramentas/folha-manutencao-pdf/RECEITA.md`.
- Uma folha por piso (1º e 2º), **só Sr. João, só o que falta**, com fotos,
  áreas em ordem alfabética. **Matheus: esquecer por enquanto** (pedido dela).
- ATENÇÃO: no sistema, Cabo Frio (loja `CF`) tinha em 24/09 **só 2 serviços do
  Sr. João no 1º piso e nenhum no 2º**. Se ela mandar anotações/fotos junto,
  lançar primeiro e depois gerar. Se não mandar nada, a base que existe é o
  relatório de 06/08 (45 itens de manutenção do 2º piso de CF):
  `2. Transferência (CloudFlare)\memorias\CODE - Relatorio 2o piso Cabo Frio (06-08-26)\`
  Nesse caso, essa é a UMA pergunta da sessão: "uso o relatório de 06/08 como
  base?"
- Fazer a conferência (QA) antes de entregar — foi o que faltou em 24/09.

---

(Pendência anterior, continua valendo:)

**Nenhuma aberta, mas já hà um próximo passo natural esperando aprovação
dela:** ela testar o botão Revisar no site publicado e, se aprovar, eu ligo
o mesmo botão nos demais relatórios do site (manutenção, PPR etc). Não
iniciar isso por conta própria, só quando ela mandar.

Uma decisão pequena em aberto, para ela responder quando quiser (sem
pressa, não trava nada): o painel do Revisar hoje foi construído direto no
arquivo do site (não é uma "peça" igual as outras da biblioteca de design,
por ser uma função e não um visual fixo). Perguntar a ela se quer que eu
depois organize isso dentro da biblioteca também, ou se pode ficar como
está.

## O que não pode ser mexido

- Abre com duplo clique / funciona sem internet (PWA + `sw.js`): arquivo novo
  entra na lista `SHELL` do `sw.js` e o `CACHE` sobe junto, senão some offline.
- Ela edita os textos sozinha, sem código.
- Toda peça visual nova vem da biblioteca de design, nunca construída do zero.
- Versão anda em 3 lugares (`APP_VERSAO` em `js/app.js`, `CACHE` em `sw.js`,
  `?v=` em `index.html`) + `status.json`, sempre juntos.

## Arquivos envolvidos no conserto de hoje (se precisar revisar)

`js/revisar.js` (o painel novo, chamado de dentro de cada relatório) ·
`js/nc.js` e `js/ck-qualidade.js` (onde o botão foi ligado, um por relatório).

## Como saber que terminou

Site publicado mostra versão **11.5** (rodapé/barra lateral/topo do celular).
Abrir um relatório de Não Conformidades ou de Checklist de Qualidade mostra
o botão "✎ Revisar" no canto. `status.json.proximoPasso` diz "aguardando Le
testar e aprovar, para ligar nos demais relatórios". Plano em
`2. Transferência (CloudFlare)\Plano - caderno vivo\Plano atualizado -
migracao Cloudflare (20-09-26).html`, versão 28, 159 itens.

## Dados técnicos que evitam pesquisa

- Conta Cloudflare `4566ede1efe9ba567dcc8cc72330e624`.
- Backup diário (27/09/26): tarefa do Windows "Backup diario - Central Compliance", 20h,
  roda `..\Backups\ferramentas\backup_diario.py` (lê o D1 e grava em `..\Backups\Backup NC - dd.mm.aa`).
  Regra em `..\..\1. Regras\REGRAS DO BACKUP.md`.
- Cofres D1: `central-demandas` (DB) · `central-fotos` (FOTOS) ·
  `central-copias` (COPIAS). Sem R2, sem KV. Foto é BLOB no D1, id = 32
  primeiros hex do SHA-256 da data-URL (duplicata some sozinha).
- Rotas em `servidor/index.js`: `/api/situacao` `/api/itens` `/api/meta`
  `/api/foto` `/api/ping` `/api/acesso`. Autenticação pelo cabeçalho `X-Chave`.
- `juntarCampos()` (servidor/index.js:82) descarta o lote se o `mod` guardado
  for mais novo — publicar correção de dados exige subir o `mod` junto.
- Publicação é manual: `npx wrangler deploy` (não tem robô de publicação
  automática rodando sozinho).
- PDF do plano: `powershell -ExecutionPolicy Bypass -File
  ferramentas\entregar-pdf-plano.ps1` (roda sozinho a cada atualização de
  site, cai direto nas pastas dela, manda com `SendUserFile`).
- Caderno vivo real do plano fica em `2. Transferência (CloudFlare)\Plano -
  caderno vivo\`, não em `4. TAREFAS` (lá existe uma cópia antiga parada,
  não usada pelo script do PDF — não editar ela, editar a de cima).
- O carimbo de versão da tela de login só troca DEPOIS que ela entra de
  verdade (fica escrito "v9.12" por fora até o login acontecer) — isso é
  normal, não é bug.


## PENDENTE 28/09 (v11.11 publicada)
- FEITO 28/09 (com OK de Le): o rodape solto do Acougue - Manipulacao (URGENTE, 23/02/25) virou nao conformidade nc-ac-rodape-acougue-280926 na QUALIDADE, com a Obs do chapatex, e o item mnt28-ac-acm-1787768501-1 foi apagado da Manutencao (lapide).
