# CONTINUIDADE — Central de Demandas NP (banco-demandas)

> Arquivo de passagem de contexto entre chats. Num chat novo deste repositório,
> a Letícia dirá: **"Leia o CONTINUIDADE.md e continue de onde paramos"**.
> Última atualização: 19/07/2026 (v4.8: relatório no design aprovado + campos ação/obs).

## O que é este projeto
Site único (GitHub Pages, arquivos estáticos, sem build) que unificou os projetos da
Letícia: **Demandas Gerais**, **NP · Gestão de NC** (porte das regras do sistema Python
local `nao-conformidades-uan` do Lenovo) e **Manutenções e Elétrica**, separados por
empresa (Cabo Frio/CF e Arraial do Cabo/AC · Super Fricarnes).
- Site no ar: https://leticiaoliveira-gh.github.io/banco-demandas/ — **versão 4.8**,
  tema "Verde Qualidade" (#1d6b57 / fundo #f7f7f5).
- Publicação: commits direto na `main` (a branch `claude/unified-demand-system-2lxhro`
  ficou para trás; a main é a fonte da verdade desde 18/07).
- Repo de dados (sincronização): `leticiaoliveira-gh/banco-demandas-dados` (PRIVADO).

## Como trabalhar com a Letícia (REGRAS FIXAS dela — inegociáveis)
- PT-BR sempre; comandos exatos e diretos; SEM aula técnica; UM passo por vez;
  dizer exatamente ONDE clicar/digitar. Ela não programa.
- Máximo de automatização sempre. Nunca refazer do zero — ajustar o que existe.
- **NÃO concordar automaticamente com ela** — avaliar tecnicamente a sugestão e dizer
  com franqueza se é boa ou não (pedido explícito dela em 18/07).
- **NUNCA publicar sem testar** (abrir o site e clicar; conferir resultado real).
- **Celular dela = iPhone.** Samsung e Lenovo são NOTEBOOKS dela.
- **PC do trabalho = COMPARTILHADO**, sem login fixo. NADA dela fica salvo lá
  (modo de sync temporário via checkbox "Não salvar neste dispositivo").
- Bump do CACHE em sw.js a cada deploy (está em v17).
- ATENÇÃO ao testar logo após deploy: o GitHub Pages tem cache HTTP de 10 min
  (max-age=600) — o site pode servir arquivos velhos por até 10 min mesmo com o
  sw novo; esperar ou revalidar antes de concluir que "não funcionou".
- Ela se frustra (com razão) quando um ponto que já explicou é esquecido. Reler o
  histórico/este arquivo antes de orientar. Pedir print quando algo "der erro".
- EXPORTAÇÕES/BACKUPS: salvar sempre em Desktop\\CLAUDE (CENTRAL)\\- BACKUPS\\Backups - Relatório Não Conformidades.
- **PASSO A PASSO MINUCIOSO**: detalhar cada clique/tela, sem pular etapa (regra 19/07).
- **NUNCA refazer/reenviar do zero** (gasta tokens): edições incrementais; na dúvida, pausar e perguntar (regra 19/07).
- **Regra das abas**: item de manutenção/elétrica (Sr. João ou Matheus) fica SÓ na aba Manutenções e Elétrica — nunca na aba de NC; se aparecer lá, transferir.
- **REGRA FIXA (19/07) — status.json**: a capa mostra "Onde paramos" lendo o arquivo
  `status.json` da raiz do repo (o site busca com cache:no-store toda vez que abre).
  **EM TODA PUBLICAÇÃO, ANTES DO COMMIT, atualizar `status.json`** (`atualizadoEm`
  no formato AAAA-MM-DD, `ondeParamos` em 1-2 frases e `proximoPasso`). Sem isso o
  card fica mentindo e Lê se perde ao voltar no dia seguinte. Não é opcional.
- MANTER ESTE ARQUIVO ATUALIZADO ao fim de cada etapa — ele é a memória entre chats.

## Arquitetura
- `index.html` + `css/app.css` + `js/app.js` (núcleo: IndexedDB `banco_nc_v3_base`;
  registro de abas TABS/TAB_ORDER; empresas, executores, pendências e rtInfo no store
  `meta`; itens travados por empresa; só UMA empresa ativa por vez; ▶ Iniciar central;
  botão "🧹 Limpar dados deste dispositivo").
- `js/nc.js` (aba NC: áreas por piso; urgência = porte FIEL do bot/interpretador.py com
  detecção de área "Área: descrição"; reincidência dinâmica mês a mês; relatório
  impressão + .docx).
- `js/docxlite.js` (gerador .docx puro, sem dependências).
- `js/sync.js` (GitHub Contents API → banco.json no repo privado; merge por uid/mod;
  tombstones; modo permanente=localStorage e TEMPORÁRIO=sessionStorage).
  **UI da sync (v4.5): o botão ⚙ de configurar fica SÓ NA CAPA (syncPillHome); dentro
  da empresa a pill (syncPill) só aparece quando está sincronizando ou com erro.**
- PWA: manifest.json + sw.js (instalável no iPhone; abre offline).
- Backup automático: File System Access → subpasta "Backup NC - DD.MM.AA" com json+csvs,
  mantém últimas 7.

## ESTADO ATUAL (19/07/2026) — v4.8, relatório no design aprovado
- **Relatório da gerência (Imprimir/PDF e Word) no design aprovado por Lê em 19/07**
  ("Proposta 2 revisada"): agrupado por piso → área (ordem oficial das áreas);
  URGENTE sem rótulo escrito — card com barra lateral e texto em vermelho;
  ação corretiva em caixinha verde com ✔; observação em caixinha amarela com 👁;
  etiqueta "Reincidente — Nº mês"; KPIs Em aberto/Urgentes/Reincidentes/Resolvidas.
- **Campos novos por NC**: "Ação corretiva" e "Observação" (formulário de registro e
  edição; sincronizam como parte do item). Sem ação preenchida, o relatório usa a
  recomendação padrão por urgência. Itens antigos continuam funcionando.
- Ordem de trabalho combinada com Lê: fazer primeiro o mais difícil/pesado.

- Sincronização OK em Lenovo (Chrome), iPhone (app instalado) e Samsung. Token válido até 17/07/2027.
- CRN fixo na capa: "Letícia Oliveira (Nutricionista de Produção – RT) · CRN-4: 22103217".
- Urgência em **2 níveis**: URGENTE e OBSERVAÇÃO (decisão de Lê; ATENCAO virou alias visual).
- Aba renomeada: **"Relatório de Não Conformidade - Gerência"** (ex NP · Gestão de NC).
- Áreas de CF pelo mapeamento oficial (PDF da pasta Sincronização) + extras; áreas AGORA SINCRONIZAM (envelope areas/areasMod desde v4.6).
- Conteúdo do banco (banco-demandas-dados/banco.json, ~750 KB):
  · Aba NC: 499 itens vivos (CF: Vt+PPR jun/26; AC: PPR mai/26 + Atualizações 25.06/06.07 + 1 NC do bot).
  · Aba Manutenções: 518 itens (CF 167 do Vt manutenção; AC ~351 do VT abril xlsx + Pendências xlsx), executor João/Matheus e status Realizado.
  · 465 itens de NC viraram tombstones (deleted) ao aplicar a regra das abas — não ressuscitar.
- Fontes todas convertidas a .md ao lado dos originais (regra markdown-auto).
- Exportações/backups: SEMPRE em Desktop\CLAUDE (CENTRAL)\- BACKUPS\Backups - Relatório Não Conformidades.

## PENDÊNCIAS em ordem (espelhadas no card da capa)
1. ~~Design do relatório de entrega ao gerente~~ FEITO 19/07 (v4.8; já marcado no card da capa).
2. ~~Backup automático no LENOVO (Chrome)~~ FEITO 19/07 — apontado para
   Desktop\CLAUDE (CENTRAL)\- BACKUPS\Backups - Relatório Não Conformidades,
   permissão "granted", gravação confirmada.
3. **LAYOUT — CAPA**: 1ª rodada FEITA 19/07 (cache v17): removidos o botão ▶ Iniciar
   do topo e o bloco ÚLTIMAS NCS; backup (info + ⬇ Fazer backup + ⚙ Ativar automático)
   subiu compacto para o topo, ao lado do ⚙ Sincronização; "v4.8" foi para a coluna
   lateral (.rail-ver); capa em 2 colunas (.home-cols): empresas à esquerda e card
   PENDÊNCIAS à direita (300px); barra de busca + filtros (Todas/ativas/inativas e
   A–Z/Mais pendentes) sob o título EMPRESAS. css/js agora versionados com ?v=17 no
   index.html — bumpar junto com o CACHE do sw.js a cada deploy.
   Aguardando novas indicações dela pelo seletor ▸.
4. **NAVEGAÇÃO NOVA (v4.9, 19/07) — FEITA**: ao entrar na empresa abre o HUB de
   cards (gerados de TAB_ORDER, campos icone/cor/corFundo/hub em TABS). Navegação
   permanente: #railTabs na barra lateral, #mobileNav fixo no celular, breadcrumb
   #crumb e busca Ctrl+K (#palOverlay). Criar aba nova = 1 entrada em TABS +
   TAB_ORDER + um .tab-panel; todo o resto se atualiza sozinho.
   Corrigido de quebra: quickAdd() sem empresa criava item órfão.
5. **LAYOUT — dentro da aba Demandas Gerais.**
5. **LAYOUT — demais abas** (Relatório de NC · Gerência, Manutenções e Elétrica),
   uma de cada vez, na ordem que ela pedir.
6. Conferir no site as NCs de CF e AC e as manutenções das duas lojas.
7. Configurações atreladas ao login.
8. Transferir configurações Lenovo → Samsung.
9. Confirmar formato da aba Demandas Gerais.
10. **Backup automático no SAMSUNG — SEMPRE POR ÚLTIMO** (regra de Lê, 19/07):
    toda pendência nova entra ANTES desta.

> Regra de ordem (Lê, 19/07): primeiro o mais pesado/difícil, o mais fácil por último.
> O LAYOUT vem antes de tudo porque ela quer mexer no visual POR PARTES (capa →
> Demandas Gerais → demais abas) antes de qualquer conferência de dados.

## Cuidados / armadilhas
- Dados dela são locais por navegador (no Lenovo, o navegador com dados é o CHROME).
  NUNCA sugerir limpar navegador/dados sem backup exportado antes. Seeds/dados de
  trabalho NÃO entram no código público.
- "Ativar automático" (backup) é POR PC, por design — no PC de terceiros, não ativar.
- ARMADILHA do backup automático (vista em 19/07): o site grava a subpasta datada
  DENTRO da pasta escolhida no seletor. Se escolherem "CLAUDE (CENTRAL)" em vez de
  "Backups - Relatório Não Conformidades", as pastas "Backup NC - DD.MM.AA" caem na
  raiz. Conferir a pasta escolhida (metaGet("backupDir").name) ao ativar.
- O card "PENDÊNCIAS DE CONFIGURAÇÃO" na capa do site espelha esta lista — manter os
  dois em dia (a lista sincroniza entre dispositivos). Marcar lá como feita a pendência
  "Configurar a sincronização entre dispositivos" (já concluída).
- Há um artefato de design publicado (link acima) aguardando as respostas dela.
- Lembretes automáticos das 18h podem disparar fora de hora — checar o histórico real
  antes de agir como se a etapa não tivesse sido feita.
