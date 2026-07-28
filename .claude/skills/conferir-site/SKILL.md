---
name: conferir-site
description: Confere o site banco-demandas de ponta a ponta antes de publicar — navegador de verdade, todas as abas, console sem erro, celular (375px) e tablet (768px), botões de 44px, peças da biblioteca, regras de gráfico, funcionamento offline e privacidade. Só aponta o que precisa mudar; não altera nada.
---

# Conferir o site

Roda a conferência completa do **banco-demandas** e devolve uma lista curta do que
precisa ser corrigido. **Não conserta nada** — quem conserta é quem pediu.

Antes de tudo, leia o `CLAUDE.md` da raiz (regras invioláveis, caminhos da
biblioteca, cores permitidas).

## 1. Os guardiões

```
powershell -ExecutionPolicy Bypass -File ferramentas\guardiao-offline.ps1
powershell -ExecutionPolicy Bypass -File ferramentas\guardiao-versao.ps1
```

Código 2 em qualquer um = reprovado, com o motivo escrito.

## 2. No navegador de verdade

1. Suba o site local (`python -m http.server 8794`) e abra com `preview_start`.
2. Entre numa empresa e passe por **todas** as abas de `TAB_ORDER`, uma a uma.
3. `read_console_messages` — **zero erro vermelho**. Erro = reprovado.

## 3. Celular (375px) e tablet (768px)

Em cada aba, confira:

- zero rolagem lateral (`scrollWidth > innerWidth + 1` reprova);
- nada cortado nem estourando a largura;
- **todo botão com 44px de altura**. Meça com tolerância (`altura < 43.5`) e aceite
  o botão cujo `::after` tenha 44px — é a técnica de área de toque invisível já
  usada no projeto. Sem a tolerância, o teste acusa falso positivo por fração de pixel.

## 4. Peças, cores e gráficos

- Coisa visual nova tem de usar as classes `bd-` / `bd-g-` de `biblioteca/`.
  **Nada construído do zero.** Peça inédita deveria ter nascido dentro da
  biblioteca e sido catalogada.
- Cores só as permitidas: verde da casa `#1d6b57`; gráficos com as 6 validadas,
  **nunca uma sétima** (o que sobra vira "Outros").
- Gráfico: valor sempre escrito junto da cor · 2ª série tracejada · nenhum texto
  dentro do SVG · legenda a partir de 2 séries.

## 5. O que protege a Letícia

- Nenhum dado real dela no repositório público (nome, CRN, lojas, itens).
- Nenhum número que a prejudique num documento que ela assina — sem conclusões no
  período, o certo é "em acompanhamento", nunca "0%".
- Nada que tire dela a edição pelos lápis (✎).

## 6. Auditoria de design

Rode a skill `web-design-guidelines` nos arquivos alterados e passe o
`..\..\biblioteca-design\regras\checklist-antes-de-publicar.md`.

## Como responder

```
APROVADO — ou — REPROVADO (N pontos)

1. arquivo — o que está errado e o que acontece com ela por causa disso
2. ...
```

Sem elogio e sem listar o que já está certo. Se estiver tudo certo, uma linha só.
