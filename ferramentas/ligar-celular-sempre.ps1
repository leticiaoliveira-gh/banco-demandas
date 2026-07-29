# =====================================================================
#  LIGAR O CELULAR SEMPRE (controle remoto + aviso no celular)
#  ---------------------------------------------------------------------
#  O que faz, em portugues simples:
#
#  Hoje, toda vez que a Le abre o Claude no PC, ela precisa digitar
#     /remote-control wpp ia
#  para a conversa aparecer no celular. Este script deixa isso ligado
#  DE FABRICA: a partir de agora toda conversa nova no PC ja nasce
#  espelhada no celular, sem pedir nada.
#
#  E tambem liga os dois avisos no celular:
#    - quando o Claude precisa de autorizacao (chega notificacao no
#      celular em vez de a Le ficar olhando a tela do PC);
#    - quando o Claude termina uma tarefa demorada.
#
#  Como rodar (uma unica vez, no PC):
#     powershell -ExecutionPolicy Bypass -File ferramentas\ligar-celular-sempre.ps1
#
#  Depois disso, FECHAR e ABRIR o Claude no PC. Nao apaga nada:
#  guarda uma copia de seguranca do arquivo antes de mexer.
# =====================================================================

$ErrorActionPreference = 'Stop'

$pasta   = Join-Path $env:USERPROFILE '.claude'
$arquivo = Join-Path $pasta 'settings.json'

if (-not (Test-Path $pasta)) { New-Item -ItemType Directory -Path $pasta | Out-Null }

# ---- le o que ja existe (sem perder nada) ----------------------------
$config = [ordered]@{}
if (Test-Path $arquivo) {
  $texto = Get-Content $arquivo -Raw -Encoding UTF8
  if ($texto.Trim().Length -gt 0) {
    try {
      $lido = $texto | ConvertFrom-Json
      foreach ($p in $lido.PSObject.Properties) { $config[$p.Name] = $p.Value }
    } catch {
      Write-Output "O settings.json esta com algum erro de digitacao e nao pode ser lido."
      Write-Output "Nada foi alterado. Arquivo: $arquivo"
      exit 1
    }
  }
  # copia de seguranca
  $backup = Join-Path $pasta ('settings.backup-' + (Get-Date -Format 'yyyy-MM-dd-HHmmss') + '.json')
  Copy-Item $arquivo $backup
  Write-Output "Copia de seguranca guardada em: $backup"
}

# ---- as tres chaves que interessam -----------------------------------
$config['remoteControlAtStartup']  = $true   # "Enable Remote Control for all sessions"
$config['inputNeededNotifEnabled'] = $true   # "Push when actions required"
$config['agentPushNotifEnabled']   = $true   # "Push when Claude decides"

# ---- nome fixo das sessoes: "wpp ia-..." -----------------------------
$env_ = [ordered]@{}
if ($config['env']) {
  foreach ($p in $config['env'].PSObject.Properties) { $env_[$p.Name] = $p.Value }
}
$env_['CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX'] = 'wpp ia'
$config['env'] = $env_

# ---- grava ------------------------------------------------------------
($config | ConvertTo-Json -Depth 20) | Set-Content $arquivo -Encoding UTF8

Write-Output ""
Write-Output "PRONTO. Ligado no arquivo $arquivo :"
Write-Output "  - toda conversa nova no PC ja aparece sozinha no celular (nome 'wpp ia-...')"
Write-Output "  - notificacao no celular quando o Claude precisar de autorizacao"
Write-Output "  - notificacao no celular quando terminar tarefa demorada"
Write-Output ""
Write-Output "FALTA SO: fechar e abrir o Claude no PC."
Write-Output "Se as notificacoes nao chegarem, abra o aplicativo Claude no celular"
Write-Output "uma vez (com a mesma conta) para ele registrar o telefone."
