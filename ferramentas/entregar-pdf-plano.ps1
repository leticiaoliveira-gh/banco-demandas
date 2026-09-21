# =====================================================================
#  ENTREGAR O PDF DO PLANO  (21/09/2026)
#  ---------------------------------------------------------------------
#  Pedido dela: "por que nao esta me entregando as atualizacoes em pdf".
#  O PDF so nascia no /fechar-sessao, que so existe em conversa aberta na
#  pasta do site, e caia em 4. TAREFAS. Ela guarda os planos em outras
#  pastas e copiava na mao, numerando.
#
#  Este script transforma cada caderno vivo em PDF e ja deixa o arquivo
#  NUMERADO na pasta onde ela guarda os planos:
#    Cloudflare -> ...\2. Transferencia (CloudFlare)\Atualizacoes Plano\
#    OneDrive   -> ...\3. Transferencia (One Drive)\
#  Se o PDF daquela versao ja existe, nao gera de novo. Nao apaga nada.
#  Imprime o caminho de cada PDF novo (para mandar a ela com SendUserFile).
#
#  Uso: powershell -ExecutionPolicy Bypass -File ferramentas\entregar-pdf-plano.ps1
#  ASCII puro de proposito (acento dentro do .ps1 quebra o PowerShell 5.1).
# =====================================================================

$ErrorActionPreference = 'Stop'

$chrome = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
            "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
            "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe") |
          Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $chrome) { Write-Output "CHROME NAO ENCONTRADO - nenhum PDF gerado."; exit 1 }

# 21/09/2026: o site passou a usar a pasta que SOBE para a nuvem (USERPROFILE\OneDrive)
# e o plano Cloudflare foi morar junto do projeto (2. Transferencia\Plano - caderno vivo).
$od   = Join-Path $env:USERPROFILE 'OneDrive\*'
$proj = '(CENTRAL) SOFTWARES\PROJETOS\Projeto I WebSite Consultoria'
function Achar($rel) { $r = Resolve-Path (Join-Path $od $rel) -ErrorAction SilentlyContinue | Select-Object -First 1; if ($r) { $r.Path } }

$cc = [char]0x00E7; $at = [char]0x00E3   # c-cedilha e a-til
$planos = @(
  @{ html  = (Achar "$proj\2. Transfer*\Plano - caderno vivo\Plano atualizado - migracao Cloudflare*.html");
     pasta = (Achar "$proj\2. Transfer*\Atualiza*Plano");
     nome  = { param($n, $v) "$n. Plano atualizado - migracao Cloudflare 20-09-26 - v$v.pdf" } },
  @{ html  = (Achar "$proj\3. Transfer*\Plano atualizado - migracao OneDrive.html");
     pasta = (Achar "$proj\3. Transfer*");
     nome  = { param($n, $v) "$n. Plano Atualizado - (migra$cc$at" + "o onedrive) 21-09-26 - v$v.pdf" } }
)

foreach ($p in $planos) {
  if (-not $p.html -or -not $p.pasta) { Write-Output "Plano ou pasta nao encontrados: $($p.html) | $($p.pasta)"; continue }
  $txt = [System.IO.File]::ReadAllText($p.html, [System.Text.Encoding]::UTF8)
  $m = [regex]::Match($txt, '<span>Vers.{1,2}o\s+(\d+)</span>')
  if (-not $m.Success) { Write-Output "Versao nao achada em $($p.html)"; continue }
  $v = $m.Groups[1].Value

  $pdfs = Get-ChildItem -Path $p.pasta -Filter '*.pdf' -File
  if ($pdfs | Where-Object { $_.Name -like "* - v$v.pdf" }) { Write-Output "Ja entregue: versao $v ($(Split-Path $p.pasta -Leaf))"; continue }

  $n = 1 + (($pdfs | ForEach-Object { if ($_.Name -match '^(\d+)\.') { [int]$matches[1] } else { 0 } } | Measure-Object -Maximum).Maximum)
  $alvo = Join-Path $p.pasta (& $p.nome $n $v)
  $tmp  = Join-Path $p.pasta ("_gerando-" + [guid]::NewGuid().ToString("N") + ".pdf")   # %TEMP% aqui tem nome curto que o PowerShell nao acha
  $uri  = ([System.Uri]$p.html).AbsoluteUri
  # Chrome escreve o aviso "bytes written" no canal de erro; com Stop isso
  # derrubaria o script. Por isso roda por Start-Process, com o aviso num arquivo.
  $log = "$tmp.log"
  Start-Process -FilePath $chrome -Wait -NoNewWindow -RedirectStandardError $log -ArgumentList @(
    '--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=15000',
    "`"--print-to-pdf=$tmp`"", "`"$uri`"")
  Remove-Item -LiteralPath $log -ErrorAction SilentlyContinue
  for ($i = 0; $i -lt 30 -and -not (Test-Path $tmp); $i++) { Start-Sleep -Milliseconds 500 }
  if (-not (Test-Path $tmp) -or (Get-Item $tmp).Length -lt 10000) { Write-Output "FALHOU o PDF da versao $v"; continue }
  Move-Item -LiteralPath $tmp -Destination $alvo
  Write-Output "PDF NOVO: $alvo"
}
