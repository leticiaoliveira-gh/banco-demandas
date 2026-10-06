# Layouts de capa (atualizado em 01/10/2026)

REGRA FIXA (pedido de Le): o layout de capa escolhido manda em TUDO junto, automaticamente:
capa, quadros, faixa dos relatórios na tela e folhas de imprimir/PDF.
Voltar ao Vidro verde = tudo verde de novo. Trocar para Aurora = tudo Aurora. Todo layout novo segue a mesma regra.

## Layouts hoje
1. Vidro verde (padrão original)
2. Aurora (original)
3. Aurora fluida (fundo com a foto fluida) — v11.47, 01/10/2026
   - Foto: `templates/fundos/fundo-aurora.jpg` (imagem de inspiração dela; no site vive em `img/fundo-aurora.jpg`).
   - Usada na capa, barra de cima, faixa dos relatórios e capa do PDF (no PDF a foto vai embutida, função `capaFotoPreparar()`).
   - Capa do PDF só neste layout: título "MANUTENÇÃO E INFRAESTRUTURA" em negrito, menor, letras espaçadas (3,2px);
     faixa Loja/Piso/Mês em vidro escuro; mês em VERMELHO DE VIDRO (translúcido, quadrado, sem pílula; vinho foi recusado).
   - Os outros dois layouts NÃO mudam (Aurora segue com o degradê escuro).

## Como funciona (para o Claude)
- Layout = CSS escopado por `body[data-capa="vidro|aurora|..."]` em css/capas.css.
- Folhas impressas: função `capaFundoFolha()` em js/app.js devolve o fundo certo.
- Quadros por dentro: padrão branco; escuro é só opção (ela não gostou do escuro).
- Layout novo aprovado = 1 linha no registro CAPA_LAYOUTS + 1 bloco de CSS; nunca apaga os outros.

Versões: 11.38 a 11.51 (ver pasta Tarefas do projeto).
