# MÉTODO DE ORGANIZAÇÃO — projeto do site (Central de Demandas NP)

> Este arquivo é o combinado de como as ideias e o planejamento do site são
> guardados. Toda sessão nova deste repositório deve lê-lo junto com o
> `CONTINUIDADE.md`. Ele não depende de nenhuma conversa anterior.
>
> Criado em 30/08/2026. Substitui o hábito de jogar tudo no grupo de WhatsApp
> "Projeto: Site Central".

---

## O caminho de uma ideia

```
Telegram  ──►  ponte 24h  ──►  Notion "Central do site"  ──►  Claude organiza
(a Lê joga)    (robô fixo,      (uma base, várias abas)       (todo dia + no
               não é o Claude)                                 início de cada chat)
```

1. **A Lê joga a ideia no Telegram** — numa conversa fixa no topo (o bot pessoal
   dela). Texto, áudio, foto, link. No iPhone, também pelo botão Compartilhar →
   atalho "Ideia Site".
2. **A ponte copia sozinha para o Notion**, 24 horas, sem depender do PC. Cada
   mensagem vira uma linha nova na base, sempre em `Situação = Chegando`,
   `Tipo = Ideia solta`, com data e origem. Link entra com um resuminho do
   conteúdo.
3. **O Claude organiza** — lê o que chegou, move para a coluna certa, põe
   etiqueta, escreve o "Onde paramos" e o "Diário do plano", e manda no Telegram
   a lista do que recolheu, marcando cada mensagem.

---

## Onde fica cada coisa

**Notion, página "Central do site":**
`https://app.notion.com/p/3cdffd666ec1818a8f98ded6044373f5`
Base "Ideias & Passos" com as abas: **A - Uma lista so** · **B - Caixa de
entrada** · **B - Demandas** · **Em ordem** · **Urgentes**. O "Diário do plano" e
o bloco "Onde paramos" ficam no corpo da página.

- **Bloco "Onde paramos"** (topo): 4 linhas — onde paramos · o que é urgente ·
  próximo passo · nº de ideias novas. O Claude reescreve a cada sessão.
- **Base "Ideias & Passos"** — uma só, com estas abas:
  - **A — Uma lista só**: quadro por situação, tudo junto, separado por etiqueta.
  - **B — Caixa de entrada + Demandas**: "Caixa de entrada" = o cru do Telegram;
    "Demandas" = já organizado, cada uma com a lista de passos dentro.
  - **Em ordem**: fila única; a Lê arrasta para intercalar.
  - **Urgentes**: só o que é urgência alta.
  - **Diário do plano**: o Claude escreve aqui toda vez o que mudou. Nunca apaga.
    Mais recente em cima. É onde a Lê confere se algo foi esquecido.

As abas A e B existem ao mesmo tempo de propósito: a Lê está testando os dois
jeitos. Quando ela decidir, o Claude ajusta.

**Propriedades de cada item:** Situação (Chegando / Fazendo agora / Feito) · Tipo
(Ideia solta / Demanda) · Urgência (Alta / Normal) · Etiqueta (visual /
estrutura / conteúdo / manutenção / outro) · Data que chegou · De onde veio ·
Ordem. No corpo: lista de passos + Histórico.

---

## Regras fixas da Lê (não quebrar)

1. **Nada é apagado.** Nem mensagem no Telegram, nem linha no Notion. O que entra
   no painel **só sai se o Claude perguntar antes e ela aprovar**.
2. **O Claude nunca deleta a mensagem no Telegram.** Ele manda a lista do que foi
   recolhido e **marca** cada mensagem transferida. A Lê confere e apaga em lote,
   na mão.
3. **A ordem é a Lê quem define** — arrastando na aba "Em ordem". O Claude não
   reordena por conta própria.
4. **Link → guardar o link e um resuminho** do que é.
5. **Áudio conta.** O Claude transcreve na hora da triagem.
6. **Toda sessão do projeto começa com as 4 linhas de "Onde paramos"** e com a
   triagem do que entrou desde a última vez.
7. **O Notion é a verdade, não a memória do Claude.** Se está no painel, existe;
   se não está, não existe. O "Diário do plano" é o rastro de tudo que mudou.

---

## Rotina automática

- **Tarefa agendada diária** ("Triagem de ideias do site", ~19h): o Claude
  recolhe o que chegou, organiza, atualiza "Onde paramos" e "Diário do plano",
  e avisa no Telegram. Se o PC estiver desligado, roda na sessão seguinte.
- **Início de cada conversa do projeto:** mesma triagem para o intervalo desde a
  última, e abre com as 4 linhas.

---

## Ferramentas (o "como está ligado", para referência)

- **Telegram:** bot pessoal criado pela Lê no `@BotFather`. Conversa fixa no topo.
- **Ponte:** um serviço no-code que vigia o bot e escreve no Notion sozinho.
  Candidatos: bot pronto "Telegram → Notion" (mais simples) ou Make.com (grátis,
  1.000 operações/mês). Não é o Claude e não precisa do PC ligado.
- **Notion:** plano grátis (uso individual) cobre tudo. Uma integração autoriza a
  escrita na página.

O manual passo a passo para a Lê criar os próprios bots (ela tem vários grupos de
WhatsApp que quer separar) é entregue **depois** que este painel estiver de pé —
uma coisa de cada vez.

---

## Estado da ponte (Make.com) — 03/09/2026 — FUNCIONANDO (à prova de travamento)

Cenário no Make: **"Integration Notion"** (time 2833750, id 6106969). **Ativo e
testado de ponta a ponta.**

- Fluxo: **Bot do Telegram (Watch Updates) → Notion (Criar item na base)**.
- Base do Notion: `ef216e54-d8c5-4aa1-a226-4312f33d1546`.
- Gatilho: **webhook** (instantâneo). Agenda de 15 min = rede de segurança.
- Mapeamento do módulo do Notion:
  - **Nome (título)** = `{{substring(3.message.text; 0; 1990)}}` — corta em
    1.990 letras, nunca estoura o limite de 2.000 do título do Notion.
  - **De onde veio** = `Telegram` (pílula azul) — **é o único marcador**
  - **Situação** e **Tipo** ficam vazios de propósito: eram eles que faziam
    aparecer um grupo novo no quadro da Lê (03/09/2026).
- **Onde o que vem do Telegram aparece:** hoje cai direto na base da Lê
  (`ef216e54-...`) só com a pílula azul **De onde veio = Telegram**, sem
  Situação nem Prioridade. No quadro **"A - Uma lista so"** (agrupado por
  **PRIOR.**) ele aparece na coluna **"Sem PRIOR."**, à espera de triagem.
- **As 18 mensagens que estavam presas** (fila de setembro) foram guardadas
  numa base separada, **"📥 Caixa de entrada do Telegram"**
  (`7c88c752d4904905b0fa5bc385286198`), fora do quadro organizado.
- **Recuperação de 03/09:** o quadro "A - Uma lista so" tinha sido reagrupado
  por um campo vazio (Situação) e mostrava tudo num monte só. Voltou a agrupar
  por **PRIOR.** — as colunas ALTA / BAIXA / MÉDIA / URG. > TRAB. / URGENTE +
  "Sem PRIOR." voltaram, com a ordem manual dos cards preservada. Nenhum dos 71
  cards da Lê foi editado.
- **Backup:** antes de qualquer escrita na base, duplicar a página. A cópia
  "BACKUP pré-sessão 03-09" é a rede de segurança daquele dia.
- `maxErrors = 1000`: **uma mensagem com erro não desliga mais o cenário** — ele
  ignora a ruim e segue.
- Gatilho do Telegram: `maxResults = 50` (pega várias mensagens por ciclo).

**Causa do travamento de setembro (registrada para não repetir):** uma mensagem
com mais de 2.000 caracteres foi mandada; o Notion recusou o título; com
`maxErrors` baixo, o cenário se **desativou sozinho** e 18 mensagens ficaram na
fila. Corrigido com o `substring` no título + `maxErrors = 1000`. As 18 presas
foram reprocessadas (todas entraram, zero foi para a DLQ).

**Causa do bloqueio de agosto (ainda vale):** o módulo "Watch Updates" é gatilho
**por webhook**. Montado via API só com a *conexão*, sem *webhook*, dá
*"dispositivo inválido"*. Correção: criar o webhook no editor do Make apontando
para a conexão do Telegram. O token do bot é `número : letras`, inteiro.

**Quando aparecer um erro (o que a Lê faz):** nada urgente — o cenário não cai
mais. No Make, aba **"Execuções incompletas" (DLQ)** aparece a mensagem que
falhou, com o texto dela à vista, para reprocessar depois de ajeitar. A ponte
continua rodando para todas as outras.

**Próximo passo (decisão da Lê):** hoje o texto inteiro vai no **título**
(cortado em 1.990). A Lê quer título só com um resumo curto e o texto completo
**dentro** do cartão. Isso exige um segundo módulo ("Append a Page Content") e
tem que ser montado desativado e testado à parte, sem arriscar a ponte atual.
