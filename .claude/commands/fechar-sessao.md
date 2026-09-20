---
description: Fecha a sessão com segurança - confere, corrige, audita, publica, atualiza o plano, manda o PDF e deixa a próxima demanda pronta.
---

Rotina obrigatória de fechamento. **Seis passos, nesta ordem.** Não pule nenhum
e não relate como pronto o que você não viu funcionando.

## 1. Conferir
- Abrir o site num navegador de verdade (`preview_start` usa `.claude/launch.json`).
- `read_console_messages`: zero erro vermelho.
- `resize_window` em 375px e 768px: zero rolagem lateral, botões com 44px.
- Mexeu em tela? Chamar o subagente `revisor-do-site`.

## 2. Corrigir
Tudo que apareceu no passo 1 se conserta **agora**. Nada de empurrar problema
para a próxima sessão — se dava para resolver hoje, resolve hoje.

## 3. Auditar
Chamar o subagente `auditor-da-sessao`, dizendo qual era a demanda do dia.
- Achou coisa fora do combinado → **parar e confirmar com a Letícia** antes de
  publicar. Não desfazer nada por conta própria.
- Guardião da versão ou do plano com código 2 → corrigir e auditar de novo.

## 4. Publicar
- Subir `APP_VERSAO` (js/app.js), `CACHE` (sw.js), `?v=` (index.html) e `status.json`.
- `git pull` antes (duas sessões no mesmo repositório dão conflito de versão).
- Commit, deploy e **conferir a versão no site que está no ar**, não no local.

## 5. Plano
- Atualizar o caderno vivo (o HTML do plano em `4. TAREFAS`): marcar o item do
  dia, acrescentar o que apareceu.
- **Nada se apaga e nada vai para arquivo morto.** Item que não serve mais fica
  **riscado no lugar, com o motivo escrito**, e ela é informada.
- Subir a versão do plano e a linhagem no rodapé. A contagem de itens só cresce.
- Gerar o PDF novo com Chrome headless (Edge não funciona neste PC) e mandar
  para ela com `SendUserFile` — **sem ela pedir**.

## 6. Preparar a próxima sessão
Reescrever `PROXIMA-SESSAO.md` em **uma página**, com:
- onde está hoje (uma frase);
- **a próxima demanda, escrita por extenso** (um item numerado do plano);
- o que não pode ser mexido;
- os arquivos envolvidos;
- como saber que terminou.

A próxima sessão não pode precisar reler conversa nenhuma.

## Cartão de fechamento (é o que você manda para ela)

Seis linhas, português simples, sem jargão:

```
DEMANDA: o que foi trabalhado
RESULTADO: resolvida / não feita / cancelada / pendente
CONFERIDO: o que foi testado e onde
PLANO: como foi atualizado (e o PDF novo foi enviado)
PUBLICADO: versão no ar e commit
PRÓXIMA: a demanda que já está pronta esperando

Esta sessão terminou. Abra uma nova para continuar.
```

Se ela mandar outra demanda depois disso: **avisar uma vez** que sai da regra de
uma demanda por sessão e, se ela mantiver, fazer. Quem decide é ela.
