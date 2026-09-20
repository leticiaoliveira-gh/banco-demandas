# PRÓXIMA SESSÃO — comece por aqui, não releia mais nada

> Escrito em 20/09/2026. Este arquivo é autossuficiente: **não precisa abrir
> CONTINUIDADE.md, PENDENCIAS.md nem o PDF do plano para começar a trabalhar.**
> O plano completo em PDF (versão 6) está em
> `4. TAREFAS\CODE - Plano migracao Cloudflare (20-09-26)\`.

## Em uma frase

A mudança para a Cloudflare **não está fechada**. O site novo está no ar e os
dois quadros já estão no cofre, mas faltam 3 blocos de trabalho, nesta ordem
que ela escolheu: **1) arrumar o que foi feito errado · 2) segurança dos dados ·
3) a entrada no site (login).**

## Estado real, conferido ao vivo

| Coisa | Situação |
|---|---|
| Site novo na Cloudflare | no ar, `conexaoempresas.leticiaoliveira.workers.dev` |
| Endereço antigo `central-demandas...` | **ainda no ar também** — dois sites iguais |
| Quadros migrados | `mnt28` e `cmp`, 184 fichas |
| Fotos | **resolvido em 20/09**: 48 fotos no cofre, 37 fichas religadas, 37/37 |
| Sistema antigo (GitHub) | continua ligado e gravando. Só desliga quando ela mandar |
| Versão publicada | Cloudflare 10.1 · GitHub Pages 9.98 |
| Ideias das 5 | 1 Lixeira, 2 Histórico, 3 Aviso de parada = prontas. 4 e 5 nunca feitas |

## Decisões dela que não se discutem mais

- Endereço fica `conexaoempresas`. **No celular nada muda até tudo estar pronto.**
- Entrada: **e-mail e senha**, com caixinha escrita exatamente **"manter conectado"**.
- Trava com **20 minutos** parada; acesso morre **no fim do dia**.
- **A cada atualização do site, gerar e mandar um PDF novo. Sem ela pedir.**
- Nunca escolher nome/domínio por conta própria.

## O que fazer, na ordem (é isto que a próxima sessão executa)

### Parte 1 — arrumar o que está torto
1. `js/nuvem.js`: a tela tem que **avisar quando o cofre novo falha**. Hoje
   continua dizendo "sincronizado" mentindo.
2. `js/app.js` linha ~1745 (`dataChanged`): chama só `syncSchedule()`.
   **Chamar também `nuvemSchedule()`** (existe em `js/nuvem.js` e está órfã) —
   hoje o cofre novo só percebe a edição de minuto em minuto.
3. Deixar **um endereço só** respondendo: `wrangler deploy` como
   `conexaoempresas` e aposentar `central-demandas`.
4. Refazer os **3 cofres de ensaio** (foram apagados; não há onde testar).
5. Impedir resposta velha em cache do cofre (`cache: "no-store"` nas leituras).
6. Acertar as anotações: tirar o "fechado" e trocar o endereço velho pelo novo
   em `status.json`, `CLAUDE.md`, `CONTINUIDADE.md`.

### Parte 2 — segurança dos dados
7. Selo de salvamento honesto ("Tudo salvo às 14:32"), valendo para os dois
   sistemas ao mesmo tempo.
8. Aviso antes de fechar com coisa não salva + aviso entre duas abas abertas.
9. `navigator.storage.persist()` — pedir ao navegador para nunca apagar a cópia
   do aparelho.
10. Aba **Cópias de segurança**: cópia automática toda madrugada, teste de
    restauração todo domingo, selos "Conferida"/"Testada", baixar PDF/planilha/
    arquivo completo, faixa vermelha após 1 dia sem cópia, botão **Restaurar**
    (nome dela) com confirmação e cópia antes. O cofre `central-copias` já
    existe e está **vazio, nunca usado** — é para isto.

### Parte 3 — a entrada no site
11. E-mail e senha + "manter conectado".
12. Trava de 20 min e fim de acesso no fim do dia.
13. Lista "Computadores conectados" no celular, com Desconectar.
14. Digital como atalho, nunca obrigatória.
15. PDF com 10 códigos de emergência + folha "Como recuperar tudo".
16. Tirar a chave de pendrive e a senha do cofre antigo.
    As tabelas `sessoes` e `pareamentos` já existem vazias em
    `servidor/schema.sql` — reusar.

### Só depois (não entra agora)
Ideias 4 (buscar em todas as lojas) e 5 (resumo do mês) · trocar o app do
celular para o endereço novo · arrumação das pastas · os outros quadros.

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
- Gerar PDF neste PC: **Chrome headless funciona, Edge não.**
  `chrome.exe --headless=new --disable-gpu --user-data-dir=<temp> --no-pdf-header-footer --print-to-pdf=<saida> file:///<html>`

## Causa do problema das fotos (para não repetir)

As 62 fotos subiram certas desde o começo. O que quebrou foi o **caminho de
volta**: as fichas foram enviadas numa passagem antiga com `fotos: []`, e quando
o conserto foi publicado o servidor **recusou** a versão corrigida, porque o
`mod` guardado já era mais novo. Conserto aplicado à mão em 20/09 (37 fichas,
`mod` atualizado). Cópia do estado anterior ficou no scratchpad da sessão.
**Lição: publicar correção de dados não basta; é preciso subir o `mod`.**
