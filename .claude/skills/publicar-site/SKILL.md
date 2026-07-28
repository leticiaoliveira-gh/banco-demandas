---
name: publicar-site
description: Publica o site banco-demandas do jeito certo, do começo ao fim — confere tudo antes, sobe os quatro números que precisam andar juntos, atualiza o "onde paramos", faz o commit, envia e confirma no site publicado de verdade. Use quando a Letícia pedir para publicar, subir ou colocar no ar.
disable-model-invocation: true
---

# Publicar o site

O ritual completo de publicação. **Não pule etapa**: cada uma existe por causa de
um erro que já aconteceu de verdade.

## 1. Antes de mexer nos números

1. `git pull` — **sempre**. Já houve duas sessões publicando ao mesmo tempo e a
   segunda apagou o trabalho da primeira.
2. Rode a skill `conferir-site`. **Reprovou, não publique** — conserte primeiro.

## 2. Os quatro números que andam juntos

Se um ficar para trás, a novidade não chega no celular dela ou a capa mente.
Já aconteceu na v9.14 (publicado como 9.14, mas por dentro dizia 9.13).

| Onde | O quê |
|---|---|
| `js/app.js` | `APP_VERSAO="X.Y"` — é o que ela vê na tela (aparece em 3 lugares, todos saem daqui) |
| `sw.js` | `const CACHE = "np-demandas-vNN"` — é o que faz a novidade chegar |
| `index.html` | todos os `?v=NN` — mesmo número do CACHE |
| `status.json` | `versao`, `atualizadoEm` (AAAA-MM-DD) e `ondeParamos` |

**Arquivo novo?** Ele tem de entrar na lista `SHELL` do `sw.js` também, senão
desaparece quando ela estiver sem internet.

## 3. O "onde paramos"

`status.json` → `ondeParamos` é o que ela lê na capa quando volta no dia seguinte.
Escreva **do jeito que ela entende**: o que mudou e o que isso resolve para ela.
Sem nome de arquivo, sem jargão. Guarde o texto anterior na frente do novo (a
história inteira mora aí).

Em `qa`, registre o que foi testado de verdade — não o que se pretendia testar.

## 4. Publicar

```
git add -A
git commit -m "vX.Y: o que mudou, em português"
git push
```

O guardião da versão roda sozinho antes do commit e barra se algo estiver
desalinhado.

## 5. Confirmar no site publicado (não no local)

O GitHub Pages leva de 1 a 3 minutos. Fique tentando até bater:

```
curl -s "https://leticiaoliveira-gh.github.io/banco-demandas/js/app.js?cb=$RANDOM" | grep APP_VERSAO
```

Depois abra o site no navegador e confira: versão certa, console sem erro,
arquivo novo respondendo 200.

**Nunca diga que publicou antes de ver o número novo no site no ar.**

## 6. Contar para ela

Mensagem separada, só o essencial: o que mudou para ela, onde clicar para ver, e
como atualizar (computador: Ctrl+Shift+R · celular: fechar o aplicativo de vez e
abrir de novo). Sem código, sem nome de arquivo, sem problema que você já resolveu.
