# Modo rascunho — decidir formato mexendo, não respondendo

Ela pediu em **25/08/2026** que toda decisão de formato venha assim:

> *"será que eu consigo editar os elementos aqui antes da gente decidir, tipo eu vou
> apagando e vou escrevendo e vou mesclando?"*
> *"eu amei, grave isso p proximas vezes ja me mandar assim se eu precisar."*

## O que é

A página **do jeito que ela sai de verdade**, com todo texto liberado para escrever por
cima. Ela apaga, escreve, mistura, e no fim aperta um botão que devolve **só o que
mudou**, em português, no formato `"era isso" -> "virou isso"` — já copiado para colar
na conversa.

Assim ela decide olhando, e o que decidir vira mudança **fixa no código**, nunca ajuste
solto num arquivo.

## Como usar

1. Suba o servidor local (`site-local`, porta 8787).
2. Grave os itens a mostrar em `_dados-rascunho.json`, na raiz do site
   (lista de itens do banco, no formato que o site já usa).
3. Abra:
   `http://localhost:8787/ferramentas/modo-rascunho/folha-editavel.html?loja=XX&exec=NOME&piso=1º%20PISO`
   — `exec` e `piso` são os mesmos filtros da aba de manutenções (`piso` vazio traz os
   dois pisos juntos); `loja` é a sigla e `nomeLoja` o nome que sai na capa. Nada disso
   fica escrito no código: este repositório é público.
4. Ela mexe. Aperta **"Ficou assim, me mostre"**. Manda o texto.
5. Você aplica no arquivo que gera o documento de verdade (para a folha de manutenção,
   é `js/mnt28.js`, função `m28Imprimir()`).

## Para usar em OUTRO documento

Ligue só o `modo-rascunho.js` na página que já monta aquele documento e chame
`ligarEdicao()` depois que ela terminar de montar. Se os seletores mudarem, ajuste a
lista `SELETORES` no topo do arquivo.

## Três coisas que já deram errado — não repetir

1. **PDF não serve.** Ela tentou usar o seletor de elemento num PDF e nada acontecia.
   PDF é imagem congelada. Para decidir formato, sempre a versão de tela.
2. **Injetar pelo console não dura.** A página se recarregou e levou tudo embora. O
   código precisa estar **dentro do arquivo**.
3. **Texto solto não fica editável.** O nome do responsável e a data eram nós de texto
   sem etiqueta nenhuma em volta. O script envolve cada um num `<b class="valor">`
   antes de liberar a edição — se um campo novo não aceitar escrita, é isso.

## O que este modo NÃO faz

Não toca no banco, não toca no site publicado, não grava nada. É rascunho.
