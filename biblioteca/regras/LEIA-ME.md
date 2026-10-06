# Biblioteca de Design

Peças de site prontas, profissionais, no estilo do banco-demandas. Serve para **parar de construir tudo do zero**.

## Pra que serve

Antes: cada botão, formulário ou cartão novo era desenhado na mão, do zero, e cada um saía um pouco diferente.
Agora: as peças já existem, prontas e conferidas. É só escolher.

## Como usar (você, sem saber código)

1. Abra **`templates/pecas/catalogo.html`** com duplo clique.
2. Ache a peça que quer.
3. Clique em **Copiar**.
4. Me mande: *"quero esse cartão na tela de Não Conformidades"*.

Pronto. Você nunca precisa abrir arquivo de código.

## Como o Claude usa

1. Antes de criar qualquer peça nova, olha se já existe aqui.
2. Se existir, usa a que existe (não inventa outra parecida).
3. Se não existir, cria **e guarda aqui** para a próxima vez.
4. Antes de publicar, roda a revisão de `regras/checklist-antes-de-publicar.md` e a skill `web-design-guidelines`.
5. Abre no navegador de verdade e confere com os próprios olhos, inclusive no tamanho de celular.

## O que tem em cada pasta

| Pasta | O que guarda |
|---|---|
| `templates/pecas/` | O catálogo e o arquivo de estilos (`pecas.css`) |
| `templates/capas/` | Catálogo dos 3 layouts de capa (site + PDF); abra `catalogo-capas.html` |
| `templates/fundos/` | Fotos de fundo dos layouts (ex.: `fundo-aurora.jpg`) |
| `regras/` | Paleta de cores, checklist antes de publicar |
| `ferramentas/` | Lista das ferramentas instaladas e o que cada uma faz |

## Plano B (regra de portabilidade)

Tudo aqui é **HTML e CSS puro**. Abre com duplo clique, funciona sem internet, sem instalar nada, em qualquer computador. Se um dia não houver mais IA nenhuma, o catálogo continua funcionando e você continua copiando as peças.
