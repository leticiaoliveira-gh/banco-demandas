# banco-demandas — instruções permanentes

Site de trabalho da Lê (Central de Demandas NP). **HTML, CSS e JS puro** — sem React, sem build, sem npm.

> Este arquivo é lido automaticamente em TODA sessão aberta nesta pasta.
> Ele é autossuficiente: não depende de nenhuma conversa anterior.

---

## 0. PRIMEIRA COISA DE TODA SESSÃO (automática)

O hook `SessionStart` em `.claude/settings.json` roda sozinho
`ferramentas\sincronizar-biblioteca.ps1`, que:

- traz para `biblioteca/` a versão mais nova das peças da biblioteca de design;
- se algo mudou, **sobe sozinho o `const CACHE` do `sw.js`** (senão a peça nova
  não chega ao celular dela, que usa o site instalado e offline);
- imprime o que existe hoje e o lembrete de nunca construir do zero.

**Se você for mexer em qualquer coisa visual e o hook não tiver rodado, rode à mão:**

```
powershell -ExecutionPolicy Bypass -File ferramentas\sincronizar-biblioteca.ps1
```

---

## 1. A BIBLIOTECA DE DESIGN — é daqui que sai TODO visual novo

**Regra número um: NUNCA construir do zero.** Olhe a biblioteca primeiro.
Peça que não existe: criar **dentro da biblioteca** e catalogar lá — nunca solta
no site, nunca uma variação parecida de uma peça que já existe.

Origem (fonte da verdade, fora do site):

```
..\..\biblioteca-design\
  templates\pecas\pecas.css           16 peças, classes com prefixo bd-
  templates\pecas\catalogo.html       o catálogo que a Lê abre
  templates\graficos\graficos.css     8 gráficos, classes com prefixo bd-g-
  templates\graficos\catalogo-graficos.html
  templates\relatorios\relatorio.css  modelo A4 que vira PDF pelo navegador
  templates\relatorios\modelo-relatorio.html
  regras\paleta-e-tons.md             todas as cores permitidas
  regras\checklist-antes-de-publicar.md
  regras\relatorios.md
```

Cópias dentro do site (é o que o site usa; o script mantém iguais):

```
biblioteca/pecas.css        ligado no index.html
biblioteca/graficos.css     ligado no index.html
biblioteca/relatorio.css    NÃO ligado no index — só nas páginas de relatório
biblioteca/catalogo.html
```

Catálogos publicados (abrem no celular e funcionam offline):

- Peças: https://leticiaoliveira-gh.github.io/banco-demandas/catalogo/
- Gráficos: https://leticiaoliveira-gh.github.io/banco-demandas/catalogo/graficos/

**As 16 peças:** botões (5 tipos, tamanhos, redondo, largo, desativado,
carregando, com ícone) · campos de formulário (com rótulo, obrigatório, ajuda,
erro, busca com lupa, lista suspensa, caixa de texto, caixinha de marcar,
chavinha) · selos de status · faixas de aviso · cartões (simples, clicável, com
faixa colorida, com ícone) · painel de números (KPI) · barra de progresso ·
tabela · abas com contador · tela vazia · tela carregando · janela de
confirmação · dica flutuante.

**Os 8 gráficos:** barras deitadas · barras em pé · linha do tempo · barra
empilhada · rosca · medidor de meta · mini gráfico em cartão · antes/depois.

---

## 2. CORES — nunca inventar

| Onde | Cores |
|---|---|
| Site | verde da casa `#1d6b57`, verde escuro `#155244`, verde claro `#e8f5f0`, verde vivo `#2a9d8a` |
| Gráficos (6 validadas em script: contraste, croma, daltonismo) | `#0a7d63` `#1668b8` `#c2620a` `#7b5cff` `#d92d3a` `#2f9e86` |

**Nunca acrescentar uma sétima cor de gráfico.** Se sobrar categoria, junte em
"Outros". Cinzas: só os da escada em `regras\paleta-e-tons.md`.

Regras de gráfico: o valor vai **sempre escrito** junto da cor; a 2ª linha é
**tracejada** (para ler impresso em preto e branco); vão de 2px entre pedaços
empilhados; legenda obrigatória a partir de 2 séries; **nunca texto dentro do
SVG** (estica junto com o desenho — nome de mês e número vão fora, em HTML);
`bd-g-listrado` para impressão em preto e branco.

---

## 3. O QUE NÃO PODE MUDAR NUNCA

1. **Abre com duplo clique.** Nada de build, npm, CDN ou "programa rodando".
2. **Funciona sem internet.** É app instalado no celular dela (PWA + `sw.js`).
   **Arquivo novo TEM que entrar na lista `SHELL` do `sw.js` e o `CACHE` subir** —
   sem isso o arquivo desaparece quando ela está offline. Já aconteceu.
3. **Lê edita os textos sozinha**, pelos lápis (✎) e pelos painéis de
   configuração — sem IA e sem código. Nada pode tirar isso dela.
4. Configuração nova grava com **`metaSetU`**, nunca `metaSet` (senão o desfazer
   não pega).
5. Global de outro arquivo: sempre `typeof X!=="undefined"`, nunca `window.X`.
6. Resposta de checklist é chaveada pelo **uid da pergunta**, nunca por posição.
7. **Um número que a prejudique é pior que nenhum número** — ela assina com o
   CRN. Sem conclusões no período, mostrar "em acompanhamento", não "0%".
8. Só **um** botão verde cheio por tela. Espaçamento múltiplo de 4. No máximo 3
   sombras. **Cor nunca é a única forma de dizer algo** (sempre a palavra também).
9. **`css/polimento.css` (v9.14) não se remove.** É a camada de acabamento que
   vale em todas as abas: contraste do texto secundário (era 3,4 → hoje 4,9),
   foco visível de teclado, brilho laranja de paleta antiga nos campos da tabela,
   botão de apagar quase invisível, alvos de toque de 44px, atraso de 300ms por
   toque, rolagem escapando em janelas, `prefers-reduced-motion`, sombras e
   velocidades padronizadas. **Não reintroduzir esses defeitos.**
10. **Lê não sabe nada de código.** Explicação sempre em analogia do dia a dia,
    nunca jargão. Quando der, **mostrar** (montar comparação e abrir no navegador).

---

## 4. FERRAMENTAS À DISPOSIÇÃO

`frontend-design` (acabamento profissional) · `web-design-guidelines` (auditoria
com 100+ regras) · `visual-do-site` (a regra visual dela) · `playwright` e
`chrome-devtools` (navegador de verdade, console, 375px/768px, print) ·
`shadcn` e `flowbite` (**só referência** — são de React, não entram neste site) ·
`context7` (documentação atualizada) · `dataviz`, `docx`, `xlsx`, `pptx`, `pdf`,
matplotlib (relatórios e gráficos fora do site).

Relatórios — qual caminho usar:

| Precisa | Use |
|---|---|
| Anexar no WhatsApp | `js/pdflite.js` (o gerador que o site já tem) |
| Ficar bonito | `templates\relatorios\modelo-relatorio.html` → Ctrl+P → Salvar PDF |
| Ser editável | skills `docx` / `xlsx` |

---

## 5. ANTES DE DIZER QUE TERMINOU (obrigatório, sempre)

1. Abrir no navegador de verdade (`preview_start` usa `.claude/launch.json`) e
   clicar de ponta a ponta: capa, sumário e as abas.
2. `read_console_messages` — **zero erro vermelho**.
3. `resize_window` em 375px e 768px — zero rolagem lateral, nada cortado.
4. Todo botão visível com no mínimo **44px** de altura no celular.
5. Rodar a skill `web-design-guidelines` nos arquivos alterados.
6. Passar o `..\..\biblioteca-design\regras\checklist-antes-de-publicar.md`.
7. Conferir que o site continua abrindo **offline**.
8. Publicar: subir `?v=NN` no index.html, `CACHE` no sw.js, `APP_VERSAO` no
   js/app.js e atualizar `status.json`. A versão aparece em **3 lugares**
   (barra lateral, topo no celular, rodapé) e vem todos de `APP_VERSAO`.
9. Confirmar no **site publicado** (não no local) — o GitHub Pages leva até
   alguns minutos.

**Nunca relatar como pronto o que não foi visto funcionando.**

---

## 6. MODO VERBOSO DE DEBUG — regra fixa, vale sempre

Sempre que usar **qualquer ferramenta visual** (Playwright, chrome-devtools ou
equivalente) para testar o site — especialmente fluxos de WhatsApp — **imprimir
cada passo na resposta**, sem resumir nem pular:

| O que mostrar | Exemplo |
|---|---|
| Ferramenta chamada | `click_element("#btn-zap")` |
| Resultado | `✓ clicou` ou `✗ timeout 5s — elemento não encontrado` |
| Estado da tela | `→ janela de compartilhar abriu` ou `→ tela ficou igual` |
| Console do navegador | `⚠ TypeError: navigator.share is not a function` |

**Regras fixas do modo verboso:**

1. **Sempre ativo** — não precisa pedir. Vale em toda sessão que abrir este
   repositório.
2. **Uma linha por ferramenta chamada**, no formato:
   `[PASSO N] ferramenta(args) → resultado (Xms)`
3. Se a ferramenta **travar** (sem resposta em 10s), registrar:
   `[PASSO N] ⏱ TRAVOU — ferramenta(args) sem resposta após 10s`
4. Se **falhar**, registrar o erro completo:
   `[PASSO N] ✗ FALHOU — ferramenta(args): mensagem de erro`
5. No final, imprimir um **resumo de saúde**:
   ```
   ── resumo debug ──
   Total de passos: 12
   ✓ OK:      10
   ✗ Falhou:   1  ← click_element("#btn-zap") — elemento não visível
   ⏱ Travou:   1  ← navigate(url) — timeout
   ```
6. Para fluxos de **WhatsApp** especificamente, verificar e reportar:
   - `navigator.share` disponível? (só funciona em HTTPS + celular)
   - `navigator.canShare({files:[...]})` retorna `true`?
   - O PDF foi gerado (`pdfURL` não vazio)?
   - `window.open` para WhatsApp Web executou?
   - Algum erro no console durante o fluxo?
7. **Nunca silenciar erro** — se algo falhou ou travou, TEM que aparecer na
   resposta, mesmo que o resto tenha funcionado.
8. Se não houver ferramenta visual disponível na sessão (ex.: sessão sem
   Playwright), dizer explicitamente: "Ferramentas visuais indisponíveis nesta
   sessão — não foi possível testar no navegador."

---

## 7. CONTEXTO DO PROJETO

- Histórico e decisões: `CONTINUIDADE.md` (é a memória entre conversas).
- Dados dela ficam no repositório **privado** `banco-demandas-dados`. Este
  repositório é **público**: nenhum dado real entra aqui.
- Duas sessões no mesmo repositório dão conflito de versão. Antes de publicar:
  `git pull` e conferir o número **dentro** do app, não só a mensagem do commit.
