# =====================================================================
#  INSTALAR O SITE NUM COMPUTADOR NOVO (o Lenovo) - faz tudo sozinho
#  ---------------------------------------------------------------------
#  O que faz, em portugues simples:
#
#  1. Confere se o Git esta instalado. Se nao estiver, instala.
#  2. Assina o Git com o nome e o e-mail da Le.
#  3. Cria a pasta C:\Projetos - de proposito SEM acento, SEM espaco e
#     FORA do OneDrive. Esse e o remedio: caminho tipo
#     "OneDrive\Area de Trabalho\6. REPOSITORIOS" quebra qualquer script
#     (e o erro aparece so na hora de copiar os arquivos).
#  4. Procura no computador as pastas antigas do projeto (banco-demandas,
#     biblioteca-design, banco-demandas-dados) e mostra onde estao.
#  5. Baixa o site do GitHub para C:\Projetos\site\banco-demandas.
#  6. COPIA a biblioteca de design para C:\Projetos\biblioteca-design,
#     que e o lugar exato que o site procura (..\..\biblioteca-design).
#  7. Deixa um atalho ABRIR-SITE.bat em C:\Projetos.
#  8. Imprime um relatorio: o que ficou pronto e o que sobrou.
#
#  NAO APAGA NADA. Nunca. So copia. As pastas antigas continuam onde estao.
#
#  Como rodar:
#     duplo clique em  ferramentas\instalar-no-lenovo.bat
#  ou, se o site ainda nao estiver no computador, cole no Prompt de Comando:
#     powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/leticiaoliveira-gh/banco-demandas/main/ferramentas/instalar-no-lenovo.ps1 | iex"
# =====================================================================

$ErrorActionPreference = 'Continue'
$ProgressPreference    = 'SilentlyContinue'

$REPO_SITE  = 'https://github.com/leticiaoliveira-gh/banco-demandas.git'
$REPO_DADOS = 'https://github.com/leticiaoliveira-gh/banco-demandas-dados.git'
$NOME       = 'Leticia Oliveira'
$EMAIL      = 'leticiaoliveira.sn@hotmail.com'

$global:RAIZ    = 'C:\Projetos'
$global:feito    = @()
$global:pendente = @()

function Titulo($t) { Write-Host ""; Write-Host "=== $t ===" -ForegroundColor Cyan }
function Ok($t)     { Write-Host "  OK    $t" -ForegroundColor Green;  $global:feito    += $t }
function Aviso($t)  { Write-Host "  !     $t" -ForegroundColor Yellow; $global:pendente += $t }
function Falha($t)  { Write-Host "  X     $t" -ForegroundColor Red;    $global:pendente += $t }
function Nota($t)   { Write-Host "        $t" -ForegroundColor Gray }

# Diz o que ha de errado com um caminho do Windows (o tal "path error").
function DefeitoDoCaminho($p) {
  $m = @()
  if ($p -match '[^\x00-\x7F]') { $m += 'acento'   }
  if ($p -match ' ')            { $m += 'espaco'   }
  if ($p -match 'OneDrive')     { $m += 'OneDrive' }
  if ($m.Count -gt 0) { return ($m -join ' + ') }
  return ''
}

Write-Host ""
Write-Host "#############################################################"
Write-Host "  INSTALADOR DO SITE - Central de Demandas NP"
Write-Host "  Nada e apagado. So copia."
Write-Host "#############################################################"

# ------------------------------------------------------------ PASSO 1: Git
Titulo 'PASSO 1 - o Git (o programa que conversa com o GitHub)'

$git = Get-Command git -ErrorAction SilentlyContinue
if (-not $git) {
  Nota 'Git nao encontrado. Instalando agora - isso pode demorar alguns minutos.'
  try {
    winget install --id Git.Git -e --source winget `
           --accept-source-agreements --accept-package-agreements 2>&1 | Out-Null
  } catch {
    Nota 'O winget nao deu conta.'
  }
  # o PATH so atualiza em janela nova; aqui a gente forca na marra
  $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' +
              [Environment]::GetEnvironmentVariable('Path','User')
  $git = Get-Command git -ErrorAction SilentlyContinue
}

if ($git) {
  Ok ("Git pronto - " + (git --version))
} else {
  Falha 'Git NAO instalou. Baixe a mao em https://git-scm.com/download/win e rode isto de novo.'
  Write-Host ""
  Write-Host 'Sem o Git nao da para seguir. Parando aqui.' -ForegroundColor Red
  return
}

# ------------------------------------------------------- PASSO 2: assinatura
Titulo 'PASSO 2 - assinar o Git com o seu nome'

$nomeAtual  = git config --global user.name  2>$null
$emailAtual = git config --global user.email 2>$null
if (-not $nomeAtual)  { git config --global user.name  $NOME  | Out-Null; $nomeAtual  = $NOME  }
if (-not $emailAtual) { git config --global user.email $EMAIL | Out-Null; $emailAtual = $EMAIL }
# no Windows os finais de linha baguncam o historico se isto ficar solto
git config --global core.autocrlf true | Out-Null
Ok "Assinado como $nomeAtual <$emailAtual>"

# --------------------------------------------------- PASSO 3: a pasta limpa
Titulo 'PASSO 3 - a pasta limpa (o conserto do erro de caminho)'

$SITEDIR = Join-Path $global:RAIZ 'site'
try {
  New-Item -ItemType Directory -Force -Path $SITEDIR -ErrorAction Stop | Out-Null
} catch {
  # sem permissao na raiz do C: - cai para a pasta do usuario
  $global:RAIZ = Join-Path $env:USERPROFILE 'Projetos'
  $SITEDIR     = Join-Path $global:RAIZ 'site'
  New-Item -ItemType Directory -Force -Path $SITEDIR -ErrorAction SilentlyContinue | Out-Null
  Aviso "Sem permissao em C:\Projetos - usando $global:RAIZ"
}

$PROJ   = Join-Path $SITEDIR     'banco-demandas'
$DADOS  = Join-Path $SITEDIR     'banco-demandas-dados'
$BIBLIO = Join-Path $global:RAIZ 'biblioteca-design'

$defeito = DefeitoDoCaminho $global:RAIZ
if ($defeito) {
  Aviso "A pasta escolhida ainda tem problema ($defeito): $global:RAIZ"
} else {
  Ok "Pasta limpa: $global:RAIZ  (sem acento, sem espaco, fora do OneDrive)"
}
Nota "O site vai ficar em      $PROJ"
Nota "A biblioteca vai ficar em $BIBLIO   (e o ..\..\biblioteca-design que o site procura)"

# --------------------------------------- PASSO 4: procurar as pastas antigas
Titulo 'PASSO 4 - procurando as pastas antigas neste computador'

$raizes = @(
  (Join-Path $env:USERPROFILE 'Desktop'),
  (Join-Path $env:USERPROFILE 'Documents'),
  (Join-Path $env:USERPROFILE 'Downloads'),
  'C:\'
)
if ($env:OneDrive)           { $raizes += $env:OneDrive }
if ($env:OneDriveCommercial) { $raizes += $env:OneDriveCommercial }
if (Test-Path 'D:\')         { $raizes += 'D:\' }
$raizes = $raizes | Where-Object { $_ -and (Test-Path $_) } | Select-Object -Unique

$procurados = @('banco-demandas', 'biblioteca-design', 'banco-demandas-dados')
$achados = @()
foreach ($r in $raizes) {
  $prof = if ($r -match '^[A-Z]:\\$') { 3 } else { 5 }
  Get-ChildItem -LiteralPath $r -Directory -Recurse -Depth $prof -Force -ErrorAction SilentlyContinue |
    Where-Object { $procurados -contains $_.Name -and $_.FullName -notlike "$($global:RAIZ)*" } |
    ForEach-Object { $achados += $_.FullName }
}
$achados = $achados | Select-Object -Unique

if ($achados.Count -eq 0) {
  Nota 'Nenhuma pasta antiga encontrada - este computador esta comecando do zero.'
} else {
  foreach ($a in $achados) {
    $d = DefeitoDoCaminho $a
    if ($d) { Write-Host "  achei  $a" -ForegroundColor Yellow; Nota "       ^ caminho problematico: $d" }
    else    { Write-Host "  achei  $a" -ForegroundColor Gray }
  }
  Nota ''
  Nota 'Estas pastas NAO foram tocadas. Continuam exatamente onde estao.'
}

# -------------------------------------------------- PASSO 5: baixar o site
Titulo 'PASSO 5 - baixando o site do GitHub'

$env:GIT_TERMINAL_PROMPT = '0'   # se pedir senha no terminal, falha rapido em vez de travar

if (Test-Path (Join-Path $PROJ '.git')) {
  Push-Location $PROJ
  git fetch origin 2>&1 | Out-Null
  git pull --ff-only 2>&1 | Out-Null
  $ramo = git rev-parse --abbrev-ref HEAD 2>$null
  Pop-Location
  Ok "Site ja estava aqui e foi atualizado (ramo $ramo)"
} else {
  $saida = git clone $REPO_SITE $PROJ 2>&1
  if ($LASTEXITCODE -eq 0) {
    Ok "Site baixado em $PROJ"
  } else {
    Falha 'Nao consegui baixar o site do GitHub.'
    Nota ($saida | Select-Object -Last 3)
  }
}

# -------------------------------------------- PASSO 6: a biblioteca de design
Titulo 'PASSO 6 - a biblioteca de design (as pecas prontas)'

$fontes = $achados | Where-Object { $_ -like '*\biblioteca-design' }
$melhor = $fontes | Where-Object { Test-Path (Join-Path $_ 'templates\pecas\pecas.css') } | Select-Object -First 1
if (-not $melhor) { $melhor = $fontes | Select-Object -First 1 }

if ($melhor) {
  try {
    if (Test-Path $BIBLIO) {
      Copy-Item -LiteralPath (Join-Path $melhor '*') -Destination $BIBLIO -Recurse -Force -ErrorAction Stop
    } else {
      Copy-Item -LiteralPath $melhor -Destination $BIBLIO -Recurse -Force -ErrorAction Stop
    }
    Ok "Biblioteca copiada para $BIBLIO"
    Nota "veio de: $melhor"
    Nota 'A pasta de origem continua intacta - isto foi copia, nao mudanca de lugar.'
  } catch {
    Falha "Nao consegui copiar a biblioteca de $melhor"
    Nota $_.Exception.Message
  }
} else {
  Aviso 'A pasta biblioteca-design nao existe neste computador.'
  Nota  "Ela precisa ficar em: $BIBLIO"
  Nota  'Traga a pasta do outro computador (pen drive ou OneDrive) e cole ai.'
  Nota  'Sem ela o site abre normal - so nao da para mexer no visual.'
}

# ---------------------------------------------- PASSO 7: o cofre dos dados
Titulo 'PASSO 7 - o repositorio privado dos dados'

if (Test-Path (Join-Path $DADOS '.git')) {
  Ok 'O repositorio de dados ja esta neste computador.'
} else {
  $saida = git clone $REPO_DADOS $DADOS 2>&1
  if ($LASTEXITCODE -eq 0) {
    Ok "Dados baixados em $DADOS"
  } else {
    Aviso 'Nao baixei o repositorio de dados - ele e privado e pede login.'
    Nota  'Isso nao atrapalha nada agora: o site pega os dados pela nuvem, no navegador.'
    Nota  'Se um dia precisar da copia local, rode este instalador de novo e faca o login quando a janela do GitHub abrir.'
  }
}

# ------------------------------------------------------- PASSO 8: o atalho
Titulo 'PASSO 8 - o atalho para abrir o site'

$atalho = Join-Path $global:RAIZ 'ABRIR-SITE.bat'
$indice = Join-Path $PROJ 'index.html'
$conteudo = @"
@echo off
rem Abre o site no navegador. Duplo clique aqui.
start "" "$indice"
"@
try {
  Set-Content -LiteralPath $atalho -Value $conteudo -Encoding ASCII -ErrorAction Stop
  Ok "Atalho criado: $atalho  (duplo clique abre o site)"
} catch {
  Aviso 'Nao consegui criar o atalho.'
}

# ------------------------------------------------- PASSO 9: conferir a sinc
Titulo 'PASSO 9 - conferindo se o site enxerga a biblioteca'

$sinc = Join-Path $PROJ 'ferramentas\sincronizar-biblioteca.ps1'
if (Test-Path $sinc) {
  & powershell -NoProfile -ExecutionPolicy Bypass -File $sinc
} else {
  Aviso 'Nao achei o script de sincronizar - o site pode nao ter baixado direito.'
}

# ------------------------------------------------------------- RELATORIO
Write-Host ""
Write-Host "#############################################################"
Write-Host "  RELATORIO FINAL"
Write-Host "#############################################################"
Write-Host ""
Write-Host "PRONTO:" -ForegroundColor Green
foreach ($f in $global:feito) { Write-Host "  - $f" }

if ($global:pendente.Count -gt 0) {
  Write-Host ""
  Write-Host "SOBROU (precisa de voce):" -ForegroundColor Yellow
  foreach ($p in $global:pendente) { Write-Host "  - $p" }
}

Write-Host ""
Write-Host "ONDE FICOU TUDO:"
Write-Host "  site .......... $PROJ"
Write-Host "  biblioteca .... $BIBLIO"
Write-Host "  abrir o site .. $atalho"
Write-Host ""
Write-Host "Quando for abrir o Claude Code neste computador, abra a pasta:"
Write-Host "  $PROJ" -ForegroundColor Cyan
Write-Host "Assim as ferramentas e os guardioes ligam sozinhos."
Write-Host ""
