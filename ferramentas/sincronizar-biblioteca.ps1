# =====================================================================
#  SINCRONIZAR A BIBLIOTECA DE DESIGN COM O SITE
#  ---------------------------------------------------------------------
#  O que faz, em português simples:
#  A biblioteca de peças (botões, cartões, gráficos, modelo de relatório)
#  mora numa pasta só dela. O site usa CÓPIAS dessas peças. Este script
#  compara as duas e, se a biblioteca mudou, traz a versão nova para o
#  site — e sobe o número do cache, para a peça nova não desaparecer
#  quando a Lê estiver sem internet.
#
#  Como rodar (botão direito > Executar com PowerShell), ou:
#     powershell -ExecutionPolicy Bypass -File ferramentas\sincronizar-biblioteca.ps1
#
#  Roda sozinho no início de toda sessão (hook em .claude\settings.json).
#  Não apaga nada. Se a biblioteca não for encontrada, avisa e para.
# =====================================================================

$ErrorActionPreference = 'Stop'

$projeto    = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$biblioteca = Resolve-Path (Join-Path $projeto '..\..\biblioteca-design') -ErrorAction SilentlyContinue
$destino    = Join-Path $projeto 'biblioteca'
$swjs       = Join-Path $projeto 'sw.js'

if (-not $biblioteca) {
  Write-Output "BIBLIOTECA NAO ENCONTRADA em ..\..\biblioteca-design - nada foi copiado."
  Write-Output "Confira se a pasta 'biblioteca-design' continua em 6. REPOSITORIOS (meus-projetos)."
  exit 1
}
if (-not (Test-Path $destino)) { New-Item -ItemType Directory -Path $destino | Out-Null }

# origem -> destino (nome dentro do site)
$pares = @(
  @{ de = 'templates\pecas\pecas.css';           para = 'pecas.css';     o_que = 'pecas (botoes, cartoes, selos)' },
  @{ de = 'templates\graficos\graficos.css';     para = 'graficos.css';  o_que = 'graficos (barras, linha, rosca, medidor)' },
  @{ de = 'templates\relatorios\relatorio.css';  para = 'relatorio.css'; o_que = 'modelo de relatorio A4' },
  @{ de = 'templates\pecas\catalogo.html';       para = 'catalogo.html'; o_que = 'catalogo das pecas' }
)

function Hash-Arquivo($caminho) {
  if (-not (Test-Path $caminho)) { return '' }
  return (Get-FileHash -Path $caminho -Algorithm SHA256).Hash
}

$atualizados = @()
$faltando    = @()

foreach ($p in $pares) {
  $origem = Join-Path $biblioteca $p.de
  $alvo   = Join-Path $destino  $p.para
  if (-not (Test-Path $origem)) { $faltando += $p.de; continue }
  if ((Hash-Arquivo $origem) -ne (Hash-Arquivo $alvo)) {
    Copy-Item $origem $alvo -Force
    $atualizados += $p.o_que
  }
}

# Se algo mudou, o cache do site TEM que subir, senao a peca nova nao chega
# ao celular dela (o site guarda a versao antiga para funcionar offline).
$cacheNovo = ''
if ($atualizados.Count -gt 0 -and (Test-Path $swjs)) {
  $texto = Get-Content $swjs -Raw
  $m = [regex]::Match($texto, 'np-demandas-v(\d+)')
  if ($m.Success) {
    $n = [int]$m.Groups[1].Value + 1
    $cacheNovo = "np-demandas-v$n"
    $texto = [regex]::Replace($texto, 'np-demandas-v\d+', $cacheNovo)
    Set-Content -Path $swjs -Value $texto -Encoding utf8 -NoNewline
  }
}

# ---------------------------------------------------------------- relatorio
Write-Output "=== BIBLIOTECA DE DESIGN — o site usa estas pecas ==="
foreach ($p in $pares) {
  $alvo = Join-Path $destino $p.para
  if (Test-Path $alvo) {
    $kb = [math]::Round((Get-Item $alvo).Length / 1KB)
    Write-Output ("  OK  biblioteca/{0}  ({1} KB) - {2}" -f $p.para, $kb, $p.o_que)
  } else {
    Write-Output ("  --  biblioteca/{0} AUSENTE - {1}" -f $p.para, $p.o_que)
  }
}
if ($faltando.Count -gt 0) {
  Write-Output "AVISO: nao achei na biblioteca: $($faltando -join ', ')"
}
if ($atualizados.Count -gt 0) {
  Write-Output ""
  Write-Output "ATUALIZADO AGORA (a biblioteca tinha versao mais nova):"
  foreach ($a in $atualizados) { Write-Output "  - $a" }
  if ($cacheNovo) { Write-Output "  Cache do site subiu para $cacheNovo (senao a peca nova nao chegaria no celular)." }
  Write-Output "  Confira no navegador antes de publicar."
} else {
  Write-Output ""
  Write-Output "Nada mudou - o site ja esta com a versao mais nova da biblioteca."
}
Write-Output ""
Write-Output "REGRA: nunca construir do zero. Olhe o catalogo primeiro:"
Write-Output "  https://leticiaoliveira-gh.github.io/banco-demandas/catalogo/           (16 pecas, bd-*)"
Write-Output "  https://leticiaoliveira-gh.github.io/banco-demandas/catalogo/graficos/  (8 graficos, bd-g-*)"
Write-Output "Peca que nao existe: criar DENTRO da biblioteca-design e catalogar la."
