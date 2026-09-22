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

Login (e-mail/senha + "manter conectado") já está no ar. Nesta sessão (22/09)
foi corrigido: dentro do modo de edição de um item ("mudar este serviço aqui
mesmo sem sair da tela"), a foto anexada agora abre grande e gira, em
manutenção, não conformidade, PPR e checklist de qualidade — antes só
funcionava nas listas prontas. Publicado, versão **11.4**, conferido no site
no ar. Plano em **v27**, PDF novo já mandado.

## A PRÓXIMA DEMANDA

**Nenhuma aberta.** Ela vai revisar o conserto de hoje no site publicado e
mandar a próxima melhoria. Não iniciar nada por conta própria — só investigar
e escrever aqui quando ela mandar.

## O que não pode ser mexido

- Abre com duplo clique / funciona sem internet (PWA + `sw.js`): arquivo novo
  entra na lista `SHELL` do `sw.js` e o `CACHE` sobe junto, senão some offline.
- Ela edita os textos sozinha, sem código.
- Toda peça visual nova vem da biblioteca de design, nunca construída do zero.
- Versão anda em 3 lugares (`APP_VERSAO` em `js/app.js`, `CACHE` em `sw.js`,
  `?v=` em `index.html`) + `status.json`, sempre juntos.

## Arquivos envolvidos no conserto de hoje (se precisar revisar)

`js/arquivos.js` (o visualizador `verImagemGrande`/`girarImagemGrande`,
já existia) · `js/mnt28.js`, `js/nc.js`, `js/ppr.js`, `js/ck.js` (as
miniaturas do modo de edição, que não chamavam o visualizador — corrigido).

## Como saber que terminou

Site publicado mostra versão **11.4** (rodapé/barra lateral/topo do celular).
`status.json.proximoPasso` diz "aguardando Le revisar e mandar a próxima
melhoria". Plano em `2. Transferência (CloudFlare)\Plano - caderno vivo\
Plano atualizado - migracao Cloudflare (20-09-26).html`, versão 27, 156 itens.

## Dados técnicos que evitam pesquisa

- Conta Cloudflare `4566ede1efe9ba567dcc8cc72330e624`.
- Cofres D1: `central-demandas` (DB) · `central-fotos` (FOTOS) ·
  `central-copias` (COPIAS). Sem R2, sem KV. Foto é BLOB no D1, id = 32
  primeiros hex do SHA-256 da data-URL (duplicata some sozinha).
- Rotas em `servidor/index.js`: `/api/situacao` `/api/itens` `/api/meta`
  `/api/foto` `/api/ping` `/api/acesso`. Autenticação pelo cabeçalho `X-Chave`.
- `juntarCampos()` (servidor/index.js:82) descarta o lote se o `mod` guardado
  for mais novo — publicar correção de dados exige subir o `mod` junto.
- PDF do plano: `powershell -ExecutionPolicy Bypass -File
  ferramentas\entregar-pdf-plano.ps1` (roda sozinho a cada atualização de
  site, cai direto nas pastas dela, manda com `SendUserFile`).
- Caderno vivo real do plano fica em `2. Transferência (CloudFlare)\Plano -
  caderno vivo\`, não em `4. TAREFAS` (lá existe uma cópia antiga parada,
  não usada pelo script do PDF — não editar ela, editar a de cima).
