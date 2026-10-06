# PROMPT pronto — avisar o chat do site sobre tudo que existe

Copie o bloco abaixo inteiro e mande no chat onde você constrói o site de demandas.

---

```
CONTEXTO OBRIGATÓRIO — leia antes de escrever qualquer linha.

Em 25/07/2026 foi montada uma biblioteca de design e um conjunto de ferramentas
para este projeto. Nada mais pode ser construído do zero. Antes de criar
qualquer coisa visual, você PUXA da biblioteca. Se a peça não existir, você a
cria DENTRO da biblioteca e catalioga lá — nunca solta.

=====================================================================
1. BIBLIOTECA DE PEÇAS  (é daqui que sai TODO visual novo)
=====================================================================
Pasta:
  6. REPOSITORIOS (meus-projetos)\biblioteca-design\templates\pecas\
    pecas.css      -> o arquivo com todas as peças (classes com prefixo "bd-")
    catalogo.html  -> a página que a Lê abre para escolher

Link permanente do catálogo (funciona no celular):
  https://leticiaoliveira-gh.github.io/banco-demandas/catalogo/

16 peças prontas, já nas cores da casa:
  - Botões: principal, secundário, suave, fantasma, perigo
            tamanhos P/normal/G, redondo, largo, desativado, carregando, com ícone
  - Formulários: campo com rótulo + obrigatório + frase de ajuda
                 campo com erro, busca com lupa dentro, lista suspensa,
                 caixa de texto, caixinha de marcar, chavinha liga/desliga
  - Selos de status: resolvida, vence hoje, atrasada, em análise, arquivada
                     (todos com bolinha colorida E palavra escrita)
  - Faixas de aviso: sucesso, atenção, erro, informação
  - Cartões: simples, clicável (sobe ao passar o mouse), com faixa colorida
             no topo, com ícone em quadradinho
  - Painel de números (KPI): linha de indicadores com variação ↑↓ e comparação
  - Barra de progresso com legenda (número + porcentagem)
  - Tabela profissional (rola de lado no celular, cabeçalho fixo)
  - Abas com contador em bolinha
  - Tela vazia (ícone + título + explicação + botão de ação)
  - Tela carregando (esqueleto, não rodinha)
  - Janela de confirmação (modal) com botão perigoso à direita
  - Dica flutuante (tooltip)

Todas as classes começam com "bd-" e NÃO brigam com o CSS existente.

=====================================================================
2. MODELO DE RELATÓRIO  (vira PDF pelo navegador)
=====================================================================
Pasta:
  biblioteca-design\templates\relatorios\
    relatorio.css          -> A4, cabeçalho e rodapé em toda página
    modelo-relatorio.html  -> modelo completo, botão "Gerar PDF"

Contém: capa com faixa colorida, resumo em números, GRÁFICO DE BARRAS em CSS
puro (imprime perfeito, não precisa de nada instalado), tabela que não corta
linha no meio e repete o cabeçalho, registro fotográfico com legenda,
observação em destaque, assinatura e rodapé.

Assinatura correta, já preenchida:
  Letícia Oliveira — Nutricionista, Responsável Técnica · CRN-4 22103217

Quando usar cada caminho de relatório:
  - Precisa anexar no WhatsApp -> js/pdflite.js (o gerador que o site já tem)
  - Precisa ficar bonito       -> modelo-relatorio.html -> Ctrl+P -> Salvar PDF
  - Precisa ser editável       -> skills "docx" / "xlsx"

=====================================================================
3. GRÁFICOS
=====================================================================
Não existe biblioteca de gráfico instalada no site, DE PROPÓSITO: o site
funciona offline e nada pode depender de internet.

O que existe e deve ser usado:
  - Barras horizontais em CSS puro (classe .rel-graf, no relatorio.css)
  - Barra de progresso (.bd-barra, no pecas.css)
  - Painel de indicadores (.bd-kpi, no pecas.css)
  - Para gráfico dentro do PDF gerado pelo site: desenhar em canvas e embutir
    como JPEG (o pdflite.js já aceita JPEG), ou desenhar com retângulos —
    o pdflite.js já desenha retângulo e linha.
  - Para gráfico em relatório Word/Excel feito fora do site: matplotlib
    (já instalado) ou a skill "dataviz" (paleta acessível já validada).

Regra de gráfico: nunca só a cor. Sempre a palavra ou o número escrito também.

=====================================================================
4. REGRAS ESCRITAS  (consultar antes de decidir qualquer coisa)
=====================================================================
  biblioteca-design\regras\paleta-e-tons.md
      Todas as cores permitidas, os cinzas em escada, e as 3 regras que fazem
      parecer caro. Verde da casa: #1d6b57. NUNCA inventar cor.

  biblioteca-design\regras\checklist-antes-de-publicar.md
      30 conferências obrigatórias antes de dizer que terminou.

  biblioteca-design\regras\relatorios.md
      Regras de relatório, incluindo: conferir se o número não deixa a Lê mal
      na foto (ela assina com o CRN). Índice baixo nunca vai sozinho — vai com
      o plano de correção e o prazo.

=====================================================================
5. O QUE JÁ FOI APLICADO NO SITE  (não refazer, não desfazer)
=====================================================================
  css/polimento.css  — camada de acabamento, vale em TODAS as abas porque
  atua nas classes compartilhadas. Publicado na v9.14. Corrigiu:
    - contraste do texto secundário (estava 3,4; mínimo é 4,5; hoje 4,9)
      --muted mudou de #8a8b96 para #6f707b
    - ausência total de foco visível para quem navega por teclado
    - .cell:focus acendia em LARANJA (sobra de paleta antiga) -> agora verde
    - .delbtn quase invisível (contraste 1,9)
    - alvos de toque abaixo de 44px no celular
    - atraso de ~300ms por toque (faltava touch-action:manipulation)
    - rolagem escapando para a página de trás dentro de janelas
    - ausência de prefers-reduced-motion
    - 9 sombras ad-hoc -> escada de 4; velocidades -> 3 degraus
    - números sem tabular-nums
    - campos sem estado de foco/hover/erro/desativado
    - botões sem :active e :disabled
    - impressão levava barra lateral e botões

  CLAUDE.md na raiz do banco-demandas — instruções permanentes do projeto.

  ATENÇÃO: NÃO remova o polimento.css e NÃO reintroduza os defeitos acima.
  Se precisar sobrescrever algo dele, sobrescreva de forma explícita e diga.

=====================================================================
6. FERRAMENTAS DISPONÍVEIS
=====================================================================
  frontend-design         -> acabamento profissional, anti-visual-genérico
  web-design-guidelines   -> auditoria com 100+ regras (rodar antes de publicar)
  playwright / chrome-devtools -> abrir no navegador de verdade, ler console,
                                  testar 375px e 768px, tirar print
  shadcn / flowbite       -> peças prontas (SÓ para projeto React; NÃO para
                             este site) — servem como referência de estrutura
  context7                -> documentação atualizada de qualquer biblioteca
  dataviz, docx, xlsx, pptx, pdf, matplotlib -> relatórios e gráficos

=====================================================================
7. REGRAS QUE NÃO PODEM SER QUEBRADAS NESTE SITE
=====================================================================
1. HTML, CSS e JS puro. Abre com duplo clique. NADA de build, npm ou CDN.
2. Funciona SEM INTERNET (é PWA instalado no celular dela). Nenhuma
   dependência externa em tempo de execução.
3. Arquivo novo tem que entrar na lista SHELL do sw.js E a versão do cache
   tem que subir, senão some quando ela estiver offline.
4. A Lê edita os textos sozinha, pelos lápis (✎). Nada pode tirar isso dela.
5. Só UM botão verde cheio por tela. Espaçamento múltiplo de 4. Máximo 3
   sombras. Nenhuma cor fora da paleta.
6. Cor nunca é a única forma de dizer algo.
7. Lê NÃO SABE NADA DE CÓDIGO. Explicar com analogia do dia a dia, nunca
   jargão. Quando der, MOSTRAR (montar comparação e abrir no navegador).

=====================================================================
8. ANTES DE DIZER QUE TERMINOU (obrigatório, sempre)
=====================================================================
  1. Abrir no navegador de verdade e clicar de ponta a ponta.
  2. Console sem NENHUM erro vermelho.
  3. Testar em 375px e 768px — zero rolagem lateral, nada cortado.
  4. Todo botão visível com no mínimo 44px de altura no celular.
  5. Rodar a skill "web-design-guidelines" nos arquivos alterados.
  6. Passar o checklist-antes-de-publicar.md inteiro.
  7. Nunca relatar como pronto o que você não viu funcionando.

Dúvidas só no fim, em formato de check.
```
