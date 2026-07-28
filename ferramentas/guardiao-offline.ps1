# =====================================================================
#  GUARDIÃO DO OFFLINE
#  ---------------------------------------------------------------------
#  O site da Lê funciona sem internet porque guarda uma cópia dos seus
#  arquivos. Essa cópia tem uma LISTA (no sw.js). Arquivo que fica de fora
#  da lista simplesmente DESAPARECE quando ela está sem sinal na loja.
#
#  Isso já aconteceu 3 vezes em 25/07 (aparencia.css, os catálogos e os
#  gráficos). Este guardião confere sozinho, depois de cada mexida, e avisa.
#
#  Confere 3 coisas:
#   1) todo arquivo ligado no index.html está na lista do sw.js
#   2) o número da cópia (CACHE) subiu quando algum desses arquivos mudou
#   3) o ?v= dos arquivos está igual ao número do CACHE
#
#  Não altera nada — só avisa. Roda sozinho pelo hook em .claude/settings.json
# =====================================================================

$ErrorActionPreference = 'Stop'
$proj = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$index = Join-Path $proj 'index.html'
$swjs  = Join-Path $proj 'sw.js'
if (-not (Test-Path $index) -or -not (Test-Path $swjs)) { exit 0 }

$htm = Get-Content $index -Raw
$sw  = Get-Content $swjs  -Raw
$avisos = @()

# 1) arquivos ligados no index que não estão na lista do offline
$ligados = [regex]::Matches($htm, '(?:href|src)="([^":]+?)\?v=\d+"') |
           ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
$fora = $ligados | Where-Object { $sw -notmatch [regex]::Escape($_) }
if ($fora) {
  $avisos += "SUMIRIA SEM INTERNET: $($fora -join ', ') nao esta(o) na lista SHELL do sw.js."
}

# 2) o ?v= dos arquivos bate com o numero do CACHE?
$cache = [regex]::Match($sw, 'np-demandas-v(\d+)')
$vs = [regex]::Matches($htm, '\?v=(\d+)') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
if ($cache.Success -and $vs) {
  $c = $cache.Groups[1].Value
  $difs = $vs | Where-Object { $_ -ne $c -and $_ -ne '1' }   # ?v=1 = arquivo que nunca muda
  if ($difs) {
    $avisos += "NUMEROS DESALINHADOS: o cache esta em v$c mas ha arquivos pedindo ?v=$($difs -join ', '). O navegador dela pode servir o arquivo velho."
  }
}

# 3) arquivo de estilo/script novo dentro do projeto que ninguem ligou no index
$soltos = @()
foreach ($p in @('css','js','biblioteca')) {
  $dir = Join-Path $proj $p
  if (Test-Path $dir) {
    Get-ChildItem $dir -File -Include *.css,*.js -Recurse | ForEach-Object {
      $rel = ($_.FullName.Substring($proj.Length + 1) -replace '\\','/')
      if ($htm -notmatch [regex]::Escape($rel) -and $sw -notmatch [regex]::Escape($rel)) { $soltos += $rel }
    }
  }
}
if ($soltos) { $avisos += "ARQUIVO SOLTO (ninguem usa): $($soltos -join ', ')" }

if ($avisos) {
  Write-Output "=== GUARDIAO DO OFFLINE — ACHOU PROBLEMA ==="
  foreach ($a in $avisos) { Write-Output "  ! $a" }
  Write-Output "  Corrija antes de publicar: sem isso o site quebra para ela sem internet."
  exit 2   # exit 2 = o Claude Code mostra o aviso e volta para o modelo corrigir
}
