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

# ── DEF-3 · A DATA DA PUBLICAÇÃO (29/07) ──
# TENTATIVA QUE DEU ERRADO, registrada para ninguém repetir: eu fiz este guardião
# CARIMBAR o APP_DATA sozinho antes do commit. Ele quebrou o site publicado.
# Motivo: no Windows PowerShell 5.1, "Get-Content -Raw" lê o arquivo na codificação
# do sistema, não em UTF-8. Os acentos do js/app.js voltavam errados e eram gravados
# assim — a cada commit piorava (16 palavras quebradas viraram 483) e a capa dela
# apareceu cheia de rabisco no lugar de "ç" e "ã".
# REGRA: este guardião NÃO ESCREVE em arquivo nenhum. Ele só confere e barra.
# Se um dia o carimbo automático voltar, tem de ler e gravar em UTF-8 explícito
# e ser testado com uma palavra acentuada ANTES de publicar.
# Por ora o APP_DATA é conferido abaixo, e quem o atualiza é quem publica.
if ($ver.Success) {
  $raw   = [System.IO.File]::ReadAllText($appjs, [System.Text.Encoding]::UTF8)
  $mData = [regex]::Match($raw, 'APP_DATA\s*=\s*"([^"]*)"')
  $hoje  = (Get-Date).ToString('dd/MM/yyyy')
  if ($mData.Success -and -not $mData.Groups[1].Value.StartsWith($hoje)) {
    $problemas += "o APP_DATA ainda diz '$($mData.Groups[1].Value)' mas hoje e $hoje - atualize a data no js/app.js, senao a capa mente a data para ela"
  }
}

# ── ACENTO QUEBRADO (mojibake) — nunca mais publicar rabisco ──
# Nasceu do erro acima. Se algum arquivo do site voltar com acento quebrado,
# este guardião barra o commit ANTES de a Lê ver a capa cheia de rabisco.
# A marca do acento quebrado e a sequencia de bytes C3 83 (o "A-til" seguido de
# outro acentuado). Comparamos por NUMERO do caractere, nunca escrevendo o
# caractere no script - senao o proprio guardiao quebraria, como ja quebrou.
$marca = [string][char]0x00C3 + [string][char]0x0083
foreach ($alvo in @($appjs, $index, $swjs)) {
  $txt = [System.IO.File]::ReadAllText($alvo, [System.Text.Encoding]::UTF8)
  if ($txt.Contains($marca)) {
    $problemas += "acento quebrado (mojibake) em $(Split-Path $alvo -Leaf) - alguma ferramenta gravou o arquivo na codificacao errada; restaure do git e refaca a edicao"
  }
}

if ($problemas) {
  Write-Output "=== GUARDIAO DA VERSAO — NAO PUBLIQUE AINDA ==="
  foreach ($p in $problemas) { Write-Output "  ! $p" }
  Write-Output "  Regra: subir juntos APP_VERSAO (js/app.js), CACHE (sw.js), ?v= (index.html) e o status.json."
  exit 2
}
Write-Output "Versao conferida: v$($ver.Groups[1].Value) · cache v$($cache.Groups[1].Value) · status.json em dia."
