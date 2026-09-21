# =====================================================================
#  GUARDIAO DO PLANO  (caderno vivo da migracao)
#  ---------------------------------------------------------------------
#  Medo dela (20/09/2026): "a cada sessao o plano e atualizado, mas como
#  eu vou saber se foi atualizado corretamente, sem terem feito besteira?"
#  E: quando ela baixa o modelo (Opus -> Sonnet) para economizar, a
#  protecao nao pode enfraquecer.
#
#  Por isso a conferencia mora AQUI, num programa que roda sozinho por
#  gancho, e nao num texto que o modelo pode pular.
#
#  ABERTURA (SessionStart): guarda uma copia datada do caderno vivo.
#           E o "antes" daquela sessao. Nenhuma copia e apagada.
#  COMMIT  (PreToolUse em git commit): compara o agora com esse "antes":
#           - a contagem de itens nao pode diminuir;
#           - item nao pode desaparecer (so pode ficar riscado);
#           - se o plano mudou, a versao tem de subir.
#           Achou problema: NAO conserta. Barra com codigo 2 e mostra.
#
#  Custo: quem le as 13 paginas do plano e este script. A sessao recebe
#  uma linha. Conferencia que custaria paginas de leitura custa uma linha.
#
#  REGRA HERDADA DO GUARDIAO DA VERSAO: este script fica em ASCII puro
#  (acento dentro do .ps1 quebra o PowerShell 5.1) e NAO ESCREVE no
#  plano. Ele so le, copia e barra.
# =====================================================================

param([string]$Modo = "abertura")

$ErrorActionPreference = 'Stop'

function Ler-Utf8($caminho) {
  return [System.IO.File]::ReadAllText($caminho, [System.Text.Encoding]::UTF8)
}

# --- acha os cadernos vivos -------------------------------------------
#  21/09/2026: sao DOIS planos vigiados.
#   1) migracao Cloudflare -> o HTML "Plano atualizado*" mais novo em 4. TAREFAS
#   2) migracao OneDrive   -> o HTML "Plano atualizado*" dentro de
#      (CENTRAL) SOFTWARES\...\3. Transferencia (One Drive)
#      (21/09: tudo foi para o OneDrive; os nomes tem acento, por isso as
#      pastas sao achadas por busca e nao escritas aqui)
#  21/09 (depois): o site passou a usar a pasta que SOBE para a nuvem
#  (USERPROFILE\OneDrive) e o plano Cloudflare foi morar em
#  2. Transferencia (CloudFlare)\Plano - caderno vivo.
$od = Join-Path $env:USERPROFILE 'OneDrive\*'
$bases = @(
  (Resolve-Path (Join-Path $od '(CENTRAL) SOFTWARES\PROJETOS\Projeto I WebSite Consultoria\2. Transfer*\Plano - caderno vivo') -ErrorAction SilentlyContinue | Select-Object -First 1),
  (Resolve-Path (Join-Path $od '(CENTRAL) SOFTWARES\PROJETOS\Projeto I WebSite Consultoria\3. Transfer*') -ErrorAction SilentlyContinue | Select-Object -First 1)
) | Where-Object { $_ } | ForEach-Object { $_.Path }
$planos = @()
foreach ($b in $bases) {
  if (-not (Test-Path $b)) { continue }
  $achado = Get-ChildItem -Path $b -Recurse -Filter '*.html' -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -like 'Plano atualizado*' -and $_.DirectoryName -notlike '*copias-antes*' } |
            Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($achado) { $planos += $achado }
}

if (-not $planos) { exit 0 }   # sem caderno vivo por perto: nada a conferir

# --- como se mede o plano ---------------------------------------------
function Contar-Itens($txt) {
  return ([regex]::Matches($txt, 'class="marca ')).Count
}

function Ler-Versao($txt) {
  $m = [regex]::Match($txt, 'class="selo">[^<]*?vers.{1,2}o\s+(\d+)')
  if ($m.Success) { return [int]$m.Groups[1].Value }
  # cabecalho novo (v24 em diante): <span>Versao NN</span> no canto da capa
  $m = [regex]::Match($txt, '<span>Vers.{1,2}o\s+(\d+)</span>')
  if ($m.Success) { return [int]$m.Groups[1].Value }
  return 0
}

# impressao digital de cada linha do plano (texto limpo, 70 primeiros caracteres)
function Digitais($txt) {
  $set = New-Object 'System.Collections.Generic.HashSet[string]'
  foreach ($m in [regex]::Matches($txt, '(?s)<tr>(.*?)</tr>')) {
    # so o PRIMEIRO <td> da linha: e o texto do item.
    # A coluna da situacao fica de fora de proposito - riscar um item muda a
    # marca dele, e isso e permitido; o que nao pode e o TEXTO sumir.
    $cel = [regex]::Match($m.Groups[1].Value, '(?s)<td[^>]*>(.*?)</td>')
    if (-not $cel.Success) { continue }
    $limpo = [regex]::Replace($cel.Groups[1].Value, '(?s)<[^>]+>', ' ')
    $limpo = [System.Net.WebUtility]::HtmlDecode($limpo)
    $limpo = [regex]::Replace($limpo, '\s+', ' ').Trim()
    if ($limpo.Length -ge 25) {
      $n = [Math]::Min(60, $limpo.Length)
      [void]$set.Add($limpo.Substring(0, $n))
    }
  }
  return $set
}

$barrou = $false
foreach ($plano in $planos) {
  $copias = Join-Path $plano.DirectoryName 'copias-antes'
  $agora    = Ler-Utf8 $plano.FullName
  $nItens   = Contar-Itens $agora
  $nVersao  = Ler-Versao $agora

  # =====================================================================
  #  MODO ABERTURA — guarda o "antes" da sessao
  # =====================================================================
  if ($Modo -eq 'abertura') {
    if (-not (Test-Path $copias)) { New-Item -ItemType Directory -Path $copias | Out-Null }
    $destino = Join-Path $copias ('antes-' + (Get-Date).ToString('yyyyMMdd-HHmmss') + '.html')
    Copy-Item $plano.FullName $destino
    Write-Output ($plano.BaseName + ": v" + $nVersao + ", " + $nItens + " itens. Copia do antes guardada (nenhuma copia e apagada).")
    continue
  }

  # =====================================================================
  #  MODO COMMIT — compara com o "antes" e barra se sumiu alguma coisa
  # =====================================================================
  if (-not (Test-Path $copias)) { continue }

  $antesArq = Get-ChildItem -Path $copias -Filter 'antes-*.html' -ErrorAction SilentlyContinue |
              Sort-Object Name -Descending | Select-Object -First 1
  if (-not $antesArq) { continue }

  $antes   = Ler-Utf8 $antesArq.FullName
  $aItens  = Contar-Itens $antes
  $aVersao = Ler-Versao $antes
  $mudou   = ($antes -ne $agora)

  $problemas = @()

  if ($nItens -lt $aItens) {
    $problemas += ("a contagem caiu de " + $aItens + " para " + $nItens + " itens - o plano so pode crescer")
  }

  if ($mudou -and $nVersao -le $aVersao) {
    $problemas += ("o plano mudou mas a versao continua " + $nVersao + " - suba a versao e a linhagem no rodape")
  }

  if ($mudou) {
    $dAntes = Digitais $antes
    $dAgora = Digitais $agora
    $sumidos = @()
    foreach ($d in $dAntes) { if (-not $dAgora.Contains($d)) { $sumidos += $d } }
    if ($sumidos.Count -gt 0) {
      $problemas += ($sumidos.Count.ToString() + " item(ns) sumiram do plano em vez de ficar riscados:")
      foreach ($s in ($sumidos | Select-Object -First 5)) { $problemas += ("   -> " + $s) }
      if ($sumidos.Count -gt 5) { $problemas += ("   -> (e mais " + ($sumidos.Count - 5) + ")") }
    }
  }

  if ($problemas) {
    Write-Output ("=== GUARDIAO DO PLANO - NAO PUBLIQUE AINDA (" + $plano.BaseName + ") ===")
    foreach ($p in $problemas) { Write-Output ("  ! " + $p) }
    Write-Output ("  O 'antes' desta sessao esta em: " + $antesArq.FullName)
    Write-Output "  Regra dela: NADA se apaga e NADA vai para arquivo morto. Item que nao serve mais"
    Write-Output "  fica RISCADO no lugar, com o motivo escrito, e ela e informada."
    $barrou = $true; continue
  }

  Write-Output ($plano.BaseName + " - integro: v" + $nVersao + ", " + $nItens + " itens, nada removido.")
}
if ($barrou) { exit 2 }
exit 0
