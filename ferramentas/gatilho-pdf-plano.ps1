# =====================================================================
#  GATILHO DO PDF DO PLANO  (21/09/2026)
#  Roda sozinho no fim de cada resposta do Claude neste projeto (Stop).
#  Chama entregar-pdf-plano.ps1. Se saiu PDF novo, segura o Claude e manda
#  ele entregar o PDF a ela (SendUserFile). Se nao saiu, fica quieto.
#  ASCII puro de proposito (acento dentro do .ps1 quebra o PowerShell 5.1).
# =====================================================================
$ErrorActionPreference = 'SilentlyContinue'
$s = Join-Path $PSScriptRoot 'entregar-pdf-plano.ps1'
if (-not (Test-Path $s)) { exit 0 }
$novos = & powershell -NoProfile -ExecutionPolicy Bypass -File $s | Where-Object { $_ -like 'PDF NOVO:*' }
if (-not $novos) { exit 0 }
$lista = ($novos | ForEach-Object { $_.Substring(9).Trim() }) -join ' | '
$msg = "O plano mudou e saiu PDF novo. Mande agora para a Le com SendUserFile (status normal), em uma linha: $lista"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
@{ decision = 'block'; reason = $msg } | ConvertTo-Json -Compress
exit 0
