# =====================================================================
#  GUARDIÃO DA VERSÃO
#  ---------------------------------------------------------------------
#  O número da versão do site mora em 3 lugares que precisam concordar:
#     · js/app.js   -> APP_VERSAO  (é o que aparece na tela dela)
#     · sw.js       -> CACHE       (é o que faz a novidade chegar no celular)
#     · index.html  -> ?v=NN       (é o que evita o navegador usar o arquivo velho)
#  E o status.json precisa contar a versão certa, senão a capa mente.
#
#  Em 25/07 isso saiu do lugar: foi publicado como "v9.14" mas por dentro
#  o site continuava dizendo 9.13. Este guardião não deixa acontecer de novo.
#
#  Roda ANTES de cada publicação (hook em .claude/settings.json, no git commit).
#  Não altera nada — só barra e explica.
# =====================================================================

$ErrorActionPreference = 'Stop'
$proj   = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$appjs  = Join-Path $proj 'js\app.js'
$swjs   = Join-Path $proj 'sw.js'
$index  = Join-Path $proj 'index.html'
$stat   = Join-Path $proj 'status.json'
foreach ($f in @($appjs,$swjs,$index,$stat)) { if (-not (Test-Path $f)) { exit 0 } }

$ver   = [regex]::Match((Get-Content $appjs -Raw), 'APP_VERSAO\s*=\s*"([\d.]+)"')
$cache = [regex]::Match((Get-Content $swjs  -Raw), 'np-demandas-v(\d+)')
$htm   = Get-Content $index -Raw
$sj    = Get-Content $stat -Raw | ConvertFrom-Json

$problemas = @()

if (-not $ver.Success)   { $problemas += "nao achei APP_VERSAO no js/app.js" }
if (-not $cache.Success) { $problemas += "nao achei o CACHE no sw.js" }

# o status.json conta a mesma versao que o site?
if ($ver.Success -and $sj.versao -ne $ver.Groups[1].Value) {
  $problemas += "o site diz v$($ver.Groups[1].Value) mas o status.json diz v$($sj.versao) — a capa vai mentir para ela"
}

# o ?v= bate com o CACHE?
if ($cache.Success) {
  $c = $cache.Groups[1].Value
  $difs = [regex]::Matches($htm, '\?v=(\d+)') | ForEach-Object { $_.Groups[1].Value } |
          Sort-Object -Unique | Where-Object { $_ -ne $c -and $_ -ne '1' }
  if ($difs) { $problemas += "cache em v$c mas ha arquivos com ?v=$($difs -join ', ')" }
}

# o status.json ficou para tras em relacao ao site?
# (nao compara com o calendario: compara com a ultima mexida nos arquivos do site,
#  senao acusaria em dia que ninguem mexeu em nada)
$maisNovo = Get-ChildItem $appjs,$swjs,$index,(Join-Path $proj 'css'),(Join-Path $proj 'js') -Recurse -File -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($maisNovo) {
  $dataSite = $maisNovo.LastWriteTime.ToString('yyyy-MM-dd')
  if ($sj.atualizadoEm -lt $dataSite) {
    $problemas += "o site foi mexido em $dataSite mas o status.json ainda diz $($sj.atualizadoEm) — atualize o 'onde paramos', senao a capa mente para ela"
  }
}

# ── DEF-3 · A DATA DA PUBLICAÇÃO DEIXA DE SER DIGITADA À MÃO (29/07) ──
# APP_DATA é o "atualizado em <data>" que ela lê no rodapé da capa. Era digitado
# à mão: bastava esquecer e a capa passava a mentir a data para ela.
# Não é decisão de ninguém — é só o carimbo do relógio. Então o guardião carimba
# sozinho, aqui, um instante antes do commit, e avisa que carimbou.
# É o ÚNICO campo que ele altera; todo o resto ele só confere e barra.
if ($ver.Success) {
  $raw     = Get-Content $appjs -Raw
  $dataAgora = (Get-Date).ToString('dd/MM/yyyy') + ' · ' + (Get-Date).ToString('HH:mm')
  $mData   = [regex]::Match($raw, 'APP_DATA\s*=\s*"([^"]*)"')
  if ($mData.Success -and $mData.Groups[1].Value -ne $dataAgora) {
    $novo = [regex]::Replace($raw, 'APP_DATA\s*=\s*"[^"]*"', 'APP_DATA="' + $dataAgora + '"')
    [System.IO.File]::WriteAllText($appjs, $novo, (New-Object System.Text.UTF8Encoding $false))
    Write-Output "Data da publicacao carimbada sozinha: $dataAgora (antes: $($mData.Groups[1].Value))"
  }
}

if ($problemas) {
  Write-Output "=== GUARDIAO DA VERSAO — NAO PUBLIQUE AINDA ==="
  foreach ($p in $problemas) { Write-Output "  ! $p" }
  Write-Output "  Regra: subir juntos APP_VERSAO (js/app.js), CACHE (sw.js), ?v= (index.html) e o status.json."
  exit 2
}
Write-Output "Versao conferida: v$($ver.Groups[1].Value) · cache v$($cache.Groups[1].Value) · status.json em dia."
