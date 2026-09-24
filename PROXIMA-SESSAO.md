# PRÓXIMA SESSÃO — comece por aqui, não releia mais nada

> Escrito em 22/09/2026. Este arquivo é autossuficiente: **não precisa abrir
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

## PRIORIDADE (24/09) — MELHORIAS DELA, PRONTAS E ESPERANDO O OK

Versão **11.8** pronta no teste local, **NÃO publicada**. Ela pediu: nada vai
ao ar sem ela revisar. Itens (plano v32, seção "PRIORIDADE AGORA"): feito que
não volta (só nuvem Cloudflare, rev + selo "Salvo na nuvem"), tela não pula,
destaque da edição, foto girada grava, senha (olhinho, maiúscula, troca por
código, códigos restantes em Segurança), lista de pessoas, datas dd/mm/aa,
espaçamento, símbolos de traço no lugar de emojis (peça 20 da biblioteca),
folha impressa sem fundo vermelho, cada piso em folha nova com numeração única.

Para publicar, com o OK dela:
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
