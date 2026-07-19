# Prompt para o próximo chat — Central de Demandas NP (banco-demandas)

> Copie TUDO daqui para baixo e cole na primeira mensagem do chat novo.

---

Leia o arquivo CONTINUIDADE.md na raiz deste repositório (banco-demandas) antes de
responder — ele tem o contexto completo do projeto e as regras de trabalho da Letícia
(falar sempre em português; passo a passo minucioso, clique a clique; nunca refazer
nada do zero; não reler arquivos inteiros à toa; ela não programa; nunca publicar sem
testar no site no ar).

## ONDE ESTAMOS (o que já foi feito)

O site "Central de Demandas NP" está no ar em
https://leticiaoliveira-gh.github.io/banco-demandas/ — **versão 4.8**, cache do
sw.js em **v15**, publicação = commit direto na branch `main`.

Dados 100% importados e sincronizando em todos os aparelhos dela (Lenovo/Chrome,
iPhone e Samsung): 499 não conformidades na aba "Relatório de Não Conformidade -
Gerência" e 518 itens na aba "Manutenções e Elétrica" (executores Sr. João e
Matheus), nas duas lojas (CF = Cabo Frio, AC = Arraial do Cabo). Repositório de
dados: `leticiaoliveira-gh/banco-demandas-dados` (privado, via servidor MCP "gh").

**Concluído no chat anterior (19/07/2026):**

1. **Design do relatório de entrega ao gerente** — a Letícia escolheu a proposta
   "Verde Qualidade" e pediu ajustes, que foram implementados nas funções
   `ncRelatorioPrint` e `ncRelatorioDocx` (js/nc.js). O relatório agora sai:
   - agrupado por **piso → área**, na ordem oficial das áreas (1º Piso primeiro);
   - item **URGENTE sem a palavra escrita** — ele só é destacado com barra lateral
     e texto em vermelho;
   - **ação corretiva** em caixinha verde com **✔**;
   - **observação** em caixinha amarela com **👁**;
   - etiqueta "Reincidente — Nº mês" e os 4 cartões de resumo
     (Em aberto / Urgentes / Reincidentes / Resolvidas);
   - fotos mantidas como já eram. Vale para Imprimir/PDF **e** para o Word (.docx).
2. **Campos novos por NC**: "Ação corretiva" e "Observação", no formulário de
   registro e na tela de edição — sincronizam junto com o item. Se a ação não for
   preenchida, o relatório usa uma recomendação padrão conforme a urgência; itens
   antigos continuam funcionando normalmente.
3. **Backup automático do Lenovo (Chrome) ativado** e testado: grava em
   `Desktop\CLAUDE (CENTRAL)\- BACKUPS\Backups - Relatório Não Conformidades`,
   em subpasta datada "Backup NC - DD.MM.AA". Antes ele estava apontado para a
   raiz da CLAUDE (CENTRAL) por engano — já corrigido e as pastas soltas foram
   movidas para o lugar certo.
4. O card "PENDÊNCIAS DE CONFIGURAÇÃO" da capa do site já foi atualizado (sincroniza
   sozinho para os outros aparelhos).

## O QUE FAZER AGORA — nesta ordem

A regra da Letícia é: **primeiro o mais pesado/difícil, o mais fácil por último.**
Ela quer mexer no **layout do site POR PARTES**, uma tela de cada vez, antes de
qualquer conferência de dados.

1. **LAYOUT DA CAPA (Central de Empresas)** ← COMEÇAR POR AQUI.
   Ela vai apontar o que quer mudar. Ouvir tudo, confirmar o entendimento com ela
   ANTES de mexer no código, implementar, testar no site publicado e só então avisar.
2. **LAYOUT DA ABA "Demandas Gerais".**
3. **LAYOUT DAS DEMAIS ABAS** ("Relatório de Não Conformidade - Gerência" e
   "Manutenções e Elétrica"), uma de cada vez, na ordem que ela pedir.
4. Conferir no site as NCs de CF e AC e as manutenções das duas lojas.
5. Montar as configurações atreladas ao login.
6. Transferir as configurações do Lenovo para o Samsung.
7. Confirmar o formato da aba Demandas Gerais.
8. **Ativar o backup automático no Samsung — SEMPRE POR ÚLTIMO** (regra fixa dela:
   qualquer pendência nova entra ANTES da do Samsung).

## COMO ELA VAI MOSTRAR O QUE QUER MUDAR

Ela vai usar o **seletor de elemento (a setinha ▸)** do navegador embutido do Claude:
clica na seta e depois no pedaço da página que quer alterar, para que você receba
exatamente qual elemento é. **No começo do chat, confirme para ela se o elemento
chegou mesmo até você.** Se não chegar, peça um print da tela — funciona igual.

## LEMBRETES OPERACIONAIS

- Publicar = commit na `main`; **sempre bumpar o cache do sw.js** (está em v15 → v16).
- O GitHub Pages tem cache de até 10 minutos: depois de publicar, se o site ainda
  mostrar o formato antigo, é isso — esperar/revalidar antes de achar que quebrou.
- Nunca refazer do zero (gasta tokens): edições incrementais no que já existe.
- Exportações e backups vão sempre para
  `Desktop\CLAUDE (CENTRAL)\- BACKUPS\Backups - Relatório Não Conformidades`.
- Não concordar automaticamente com ela: avaliar tecnicamente e dizer com franqueza
  se a ideia é boa ou não.

**Comece confirmando que leu o CONTINUIDADE.md e me pergunte o que eu quero mudar
na CAPA.**
