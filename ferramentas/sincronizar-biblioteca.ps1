# =====================================================================
#  CONFERIR A BIBLIOTECA DE DESIGN DO SITE
#  ---------------------------------------------------------------------
#  Desde 01/10/2026 (pedido da Le) a biblioteca mora num lugar so:
#  a pasta biblioteca\ deste site. Nao existe mais copia em outra pasta,
#  entao este script NAO copia nada: so confere se as pecas estao la e
#  lembra a regra de nunca construir do zero.
#
#  Roda sozinho no inicio de toda sessao (hook em .claude\settings.json).
#  Mudou peca na biblioteca? Suba o "const CACHE" do sw.js a mao.
# =====================================================================

$projeto = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$pasta   = Join-Path $projeto 'biblioteca'

$itens = @(
  @{ n = 'pecas.css';              o = 'pecas (botoes, cartoes, selos)' },
  @{ n = 'graficos.css';           o = 'graficos (barras, linha, rosca, medidor)' },
  @{ n = 'relatorio.css';          o = 'modelo de relatorio A4' },
  @{ n = 'catalogo.html';          o = 'catalogo das pecas' },
  @{ n = 'catalogo-graficos.html'; o = 'catalogo dos graficos' },
  @{ n = 'catalogo-capas.html';    o = 'layouts de capa' },
  @{ n = 'regras\paleta-e-tons.md';              o = 'cores permitidas' },
  @{ n = 'regras\checklist-antes-de-publicar.md'; o = 'checklist antes de publicar' }
)

Write-Output "=== BIBLIOTECA DE DESIGN (lugar unico: biblioteca\ do site) ==="
foreach ($i in $itens) {
  $alvo = Join-Path $pasta $i.n
  if (Test-Path $alvo) { Write-Output ("  OK  biblioteca\{0} - {1}" -f $i.n, $i.o) }
  else                 { Write-Output ("  --  biblioteca\{0} AUSENTE - {1}" -f $i.n, $i.o) }
}
Write-Output ""
Write-Output "REGRA: nunca construir do zero. Olhe biblioteca\catalogo.html primeiro."
Write-Output "Peca que nao existe: criar DENTRO de biblioteca\pecas.css e catalogar em biblioteca\catalogo.html."
