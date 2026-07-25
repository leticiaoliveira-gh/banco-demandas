# banco-demandas — instruções permanentes

Site de trabalho da Lê (Central de Demandas NP). **HTML, CSS e JS puro** — sem React, sem build, sem npm.

## O que não pode mudar nunca

1. **Abre com duplo clique.** Nada de build, npm, CDN ou "programa rodando".
2. **Funciona sem internet.** É um app instalável (PWA, service worker `sw.js`). Nenhuma dependência externa em tempo de execução — isso quebraria justamente o que ele tem de melhor.
3. **Lê edita textos sozinha.** Toda tela precisa continuar editável por ela pelos lápis (✎) e pelos painéis de configuração, sem IA e sem código.
4. Lê **não sabe nada de código**. Explicação sempre em analogia do dia a dia, nunca jargão.

## Visual (obrigatório — regra visual-v1, 25/07/26)

Qualquer trabalho de tela: invocar a skill **visual-do-site** ANTES de escrever código.

- **Nunca construir do zero.** Puxar da biblioteca:
  `..\..\biblioteca-design\templates\pecas\pecas.css` (classes com prefixo `bd-`)
  Catálogo que a Lê abre: `..\..\biblioteca-design\templates\pecas\catalogo.html`
- Peça que não existe: criar **dentro** de `pecas.css` e catalogar. Nunca solta, nunca variação parecida de uma que já existe.
- Cores só as de `..\..\biblioteca-design\regras\paleta-e-tons.md`. O verde da casa é `#1d6b57`.
- MCPs de componentes (`shadcn`, `flowbite`) servem só como **referência para o Claude**. O que entra no site é sempre CSS local traduzido para o estilo da casa.

## Antes de dizer que terminou

1. Abrir no navegador de verdade: `preview_start` usa o `.claude/launch.json` (python http.server na porta 8787).
2. `read_console_messages` — zero erro vermelho.
3. `resize_window` em `mobile` (375px) e `tablet` (768px).
4. Rodar a skill `web-design-guidelines` nos arquivos alterados.
5. Passar o `..\..\biblioteca-design\regras\checklist-antes-de-publicar.md`.

Nunca relatar como pronto o que não foi visto funcionando.

## Contexto do projeto

- Histórico e decisões: `CONTINUIDADE.md`
- Versão aparece em 3 lugares (barra lateral, topo no celular, rodapé) — atualizar todos juntos.
