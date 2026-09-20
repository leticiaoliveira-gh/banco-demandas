# PRÓXIMA SESSÃO — comece por aqui, não releia mais nada

> Escrito em 20/09/2026. Este arquivo é autossuficiente: **não precisa abrir
> CONTINUIDADE.md nem PENDENCIAS.md para começar a trabalhar.**

## COMO ESTA SESSÃO TRABALHA (ordem dela, 20/09/2026)

1. **Investigar antes de perguntar.** Dúvida se resolve olhando este arquivo, o
   caderno vivo, o histórico do git e os arquivos. No máximo **uma** pergunta
   por sessão, e só se for gosto, dinheiro ou risco — com opções e recomendação.
   Nunca perguntar o que já está em "Decisões dela que não se discutem mais".
2. **Uma demanda por sessão** = um item numerado da lista lá embaixo. Terminou,
   roda o `/fechar-sessao` e avisa que ela pode abrir uma nova conversa.
3. **Nada se apaga e nada vai para arquivo morto.** O que não serve mais fica
   **riscado no lugar, com o motivo escrito**, e ela é informada.
4. **Abertura barata:** no começo, ler só este arquivo. Não abrir o plano
   inteiro, o PDF, o `CONTINUIDADE.md` nem o `PENDENCIAS.md`.

Detalhe completo: seção 9 do `CLAUDE.md`. Guardiões: seção 7.

## PASSO 0 — antes de qualquer outra coisa

Abrir o **caderno vivo do plano** e trabalhar em cima dele:

```
4. TAREFAS\CODE - Plano migracao Cloudflare (20-09-26)\Plano atualizado - migracao Cloudflare (20-09-26).html
```

- É o arquivo mais atual (**versão 12, 135 itens**). O PDF ao lado é só a
  fotografia dele.
- **Nunca escrever um plano novo do zero.** Só riscar, marcar e acrescentar
  linha neste. Ele descende do primeiro plano; nenhum item foi ou será apagado.
- Se o HTML sumir, **reconstruir a partir do PDF mais recente** antes de
  trabalhar.
- Ao terminar qualquer mudança no site: atualizar o HTML, gerar o PDF novo
  (subindo a versão e a linhagem no rodapé) e mandar para ela, sem ela pedir.

## Em uma frase

A mudança para a Cloudflare **não está fechada**. O site novo está no ar, os
dois quadros estão no cofre, o selo de salvamento é honesto para os dois
sistemas, e agora só um endereço responde. Falta terminar a **Parte 1**
(arrumar o que está torto) antes de ir para segurança dos dados e login.

## Estado real, conferido em 20/09

| Coisa | Situação |
|---|---|
| Site novo na Cloudflare | no ar, `conexaoempresas.leticiaoliveira.workers.dev` |
| Endereço antigo | **desligado em 20/09** — só `conexaoempresas` responde agora |
| Quadros migrados | `mnt28` e `cmp`, 184 fichas |
| Fotos | resolvido em 20/09: 48 fotos no cofre, 37 fichas religadas |
| Sistema antigo (GitHub) | continua ligado e gravando. Só desliga quando ela mandar |
| Tela avisa quando o cofre novo falha | **feito em 20/09** |
| Selo com os três recados (GitHub + cofre novo juntos) | **feito em 20/09** |
| Um endereço só respondendo | **feito em 20/09** |
| Versão publicada | Cloudflare 10.1 · GitHub Pages 10.2 · Plano v13 |

## Decisões dela que não se discutem mais

- Endereço fica `conexaoempresas`. **No celular nada muda até tudo estar pronto.**
- Entrada: **e-mail e senha**, com caixinha escrita exatamente **"manter conectado"**.
  - **Marcada** = PC dela: sessão longa, só pede de novo se ela sair do Chrome
    e entrar do zero.
  - **Desmarcada** = o site entende sozinho que o PC não é dela e exige
    **segunda etapa: aprovação vinda do celular** (verificação em duas etapas).
    Nesse caso, **nenhum rastro fica naquele PC**: nada gravado em disco, tudo
    apagado ao fechar a aba.
- Trava com **20 minutos** parada; acesso morre **no fim do dia**.
- **A cada atualização do site, gerar e mandar um PDF novo. Sem ela pedir.**
- **O plano é CUMULATIVO: nada sai, nunca.** Item descartado fica **riscado
  com o motivo**, não some. A contagem só cresce.
- **Cópia das 20h no PC dela:** recomendação escrita no plano é **manter**.
  Ela ainda não respondeu — é o único ❓ aberto.
- Nunca escolher nome/domínio por conta própria.
- Endereço de teste/duplicado que não serve mais: **desligar de vez**, sem
  deixar aviso no ar. Decisão dela em 20/09, depois de eu ter perguntado.

## A PRÓXIMA DEMANDA (é este o item que a próxima sessão executa)

**Item 4 da Parte 1 do plano: refazer os 3 cofres de ensaio.**

O item 3 (deixar um endereço só respondendo) **já foi feito em 20/09**: o
`central-demandas` principal já tinha sido renomeado numa sessão anterior;
apareceu um worker de teste esquecido (`central-demandas-teste`, vazio, sem
dado nenhum) ainda no ar — foi desligado por ordem dela (ela preferiu desligar
de vez a deixar um aviso). Confirmado: só `conexaoempresas` responde.

Agora falta o **cofre de ensaio**: antes de qualquer mudança arriscada no
banco, existiam 3 cofres D1 de teste (cópias dos cofres reais `central-demandas`,
`central-fotos`, `central-copias`) para ensaiar sem risco. Eles foram apagados
durante os testes de 20/09 e precisam ser recriados, para voltar a existir um
lugar seguro de testar antes de publicar mudança de banco.

- Como criar cofre D1 novo: `npx wrangler d1 create <nome>` (conta Cloudflare
  `4566ede1efe9ba567dcc8cc72330e624`, já autenticada nesta máquina — não pedir
  login de novo).
- Cofres reais para copiar a estrutura: `central-demandas` (DB),
  `central-fotos` (FOTOS), `central-copias` (COPIAS) — ver `wrangler.toml` e
  `servidor/schema.sql`.
- Sugestão de nome para os cofres de ensaio: `central-demandas-ensaio`,
  `central-fotos-ensaio`, `central-copias-ensaio` (evitar o nome
  "-teste" sozinho, que foi o que confundiu nesta sessão).
- Como saber que terminou: os 3 cofres de ensaio existem na conta Cloudflare,
  com a mesma estrutura de tabelas dos reais (rodar `servidor/schema.sql`
  neles), vazios ou com dado de mentira — nunca dado real de Le. Anotar no
  plano onde ficam e como usar para ensaiar antes de publicar.
- Depois desta, seguem na mesma ordem: item 5 (impedir resposta velha em
  cache do cofre — `cache: "no-store"` nas leituras em `servidor/index.js`),
  item 6 (acertar as anotações: tirar o "fechado" e trocar o endereço velho
  pelo novo em `CLAUDE.md`, `CONTINUIDADE.md`).

### O que vem depois (não é para agora)

**Parte 2 — segurança dos dados:** aviso antes de fechar com coisa não salva +
aviso entre duas abas abertas · `navigator.storage.persist()` · aba **Cópias
de segurança** completa (cópia automática de madrugada, teste todo domingo,
botão Restaurar).

**Parte 3 — a entrada no site:** e-mail e senha + "manter conectado" · trava
de 20 min · lista "Computadores conectados" · digital como atalho · PDF de
códigos de emergência.

**Parte 4 — arrumação das pastas** (ela cobrou em 20/09; não é opcional):
dois PDFs idênticos em `Desktop\Site Trabalho (claudflare)` · rascunhos soltos
na raiz do repositório (`_comparacoes`, `_dados-rascunho.json`,
`_teste-joao.json`, `cofre.json` — riscado em 20/09: **nada vai para arquivo
morto**, só marcar no README que não são usados) · `scratch-2piso*.txt` soltos ·
quatro folhas de instrução concorrendo (`PROXIMA-SESSAO.md` já é a única que
manda) · modelo de pastas dela (`ferramentas/`, `memorias/`, `projetos/`,
`regras/`, `templates/`, `README.md`).

⚠️ **Arquivo que está na lista `SHELL` do `sw.js` ou ligado no `index.html`
não sai do lugar** sem atualizar as duas coisas, senão o site para de abrir
offline. Mostrar a lista a ela antes de mover.

### Só depois (não entra agora)

Ideias 4 (buscar em todas as lojas) e 5 (resumo do mês) · trocar o app do
celular para o endereço novo · os outros quadros.

## Dados técnicos que evitam pesquisa

- Conta Cloudflare `4566ede1efe9ba567dcc8cc72330e624`.
- Cofres D1: `central-demandas` (DB) · `central-fotos` (FOTOS) ·
  `central-copias` (COPIAS, vazio). Sem R2, sem KV. Foto é BLOB no D1.
- Foto é **endereçada pelo conteúdo**: id = 32 primeiros hex do SHA-256 da
  data-URL; a ficha guarda `"foto:<id>"`. Duplicata some sozinha.
- Rotas em `servidor/index.js`: `/api/situacao` `/api/itens` `/api/meta`
  `/api/foto` `/api/ping` `/api/acesso`. Autenticação pelo cabeçalho `X-Chave`.
- **`juntarCampos()` (servidor/index.js:82) descarta o lote se o `mod` guardado
  for mais novo.** Foi isto que impediu o conserto das fotos de chegar sozinho.
- Backup dela: `Desktop\Site Trabalho (claudflare)\Backup completo do site - 19.09.26.json`.
- Gerar PDF neste PC: **Chrome headless funciona, Edge não.** Usar
  `--headless` (não `--headless=new`) e passar o caminho como file-URI de
  verdade (ex.: `([System.Uri]$caminho).AbsoluteUri` no PowerShell) — o
  `--headless=new` com caminho estilo `/c/Users/...` gerou um PDF de 1 página
  em branco nesta sessão (20/09); com `--headless` clássico e URI correta,
  saiu certo (15 páginas).
  `chrome.exe --headless --disable-gpu --no-sandbox --user-data-dir=<temp> --no-pdf-header-footer --print-to-pdf=<saida> <file-uri>`

## Causa do problema das fotos (para não repetir)

As 62 fotos subiram certas desde o começo. O que quebrou foi o **caminho de
volta**: as fichas foram enviadas numa passagem antiga com `fotos: []`, e quando
o conserto foi publicado o servidor **recusou** a versão corrigida, porque o
`mod` guardado já era mais novo. Conserto aplicado à mão em 20/09 (37 fichas,
`mod` atualizado). **Lição: publicar correção de dados não basta; é preciso
subir o `mod`.**
