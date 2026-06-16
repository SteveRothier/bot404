# Enregistre les taches planifiees Bot404 (sans ouvrir de terminal visible).
# Executer une fois: npm run npc:schedule:install

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$vbsPath = Join-Path $projectRoot "scripts\windows\run-npc.vbs"
$wscript = Join-Path $env:SystemRoot "System32\wscript.exe"

if (-not (Test-Path $vbsPath)) {
  throw "Fichier introuvable: $vbsPath"
}

function Register-Bot404Task {
  param(
    [string]$Name,
    [string]$Mode,
    [string]$Schedule
  )

  $action = New-ScheduledTaskAction `
    -Execute $wscript `
    -Argument ('"' + $vbsPath + '" ' + $Mode) `
    -WorkingDirectory $projectRoot

  $trigger = switch ($Schedule) {
    "hourly" {
      New-ScheduledTaskTrigger -Once -At (Get-Date).Date.AddMinutes(5) `
        -RepetitionInterval (New-TimeSpan -Hours 1) `
        -RepetitionDuration (New-TimeSpan -Days 3650)
    }
    "30min" {
      New-ScheduledTaskTrigger -Once -At (Get-Date).Date.AddMinutes(2) `
        -RepetitionInterval (New-TimeSpan -Minutes 30) `
        -RepetitionDuration (New-TimeSpan -Days 3650)
    }
    "30min-offset" {
      New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(17) `
        -RepetitionInterval (New-TimeSpan -Minutes 30) `
        -RepetitionDuration (New-TimeSpan -Days 3650)
    }
    "daily" {
      New-ScheduledTaskTrigger -Daily -At "00:05"
    }
    "15min" {
      New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(3) `
        -RepetitionInterval (New-TimeSpan -Minutes 15) `
        -RepetitionDuration (New-TimeSpan -Days 3650)
    }
    "60min" {
      New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(10) `
        -RepetitionInterval (New-TimeSpan -Minutes 60) `
        -RepetitionDuration (New-TimeSpan -Days 3650)
    }
    default { throw "Schedule inconnu: $Schedule" }
  }

  $settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -MultipleInstances IgnoreNew

  $existing = Get-ScheduledTask -TaskName $Name -ErrorAction SilentlyContinue
  if ($existing) {
    Unregister-ScheduledTask -TaskName $Name -Confirm:$false
  }

  Register-ScheduledTask `
    -TaskName $Name `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "Bot404 generation NPC via Ollama (sans fenetre)" | Out-Null

  Write-Host ("OK: {0} [{1}] mode={2}" -f $Name, $Schedule, $Mode)
}

Register-Bot404Task -Name "bot404-narrative-tick" -Mode "tick" -Schedule "15min"
Register-Bot404Task -Name "bot404-generate-posts" -Mode "posts" -Schedule "30min"
Register-Bot404Task -Name "bot404-generate-comments" -Mode "comments" -Schedule "30min-offset"
Register-Bot404Task -Name "bot404-daily-theme" -Mode "daily-theme" -Schedule "daily"

Write-Host ""
Write-Host "Taches installees. Aucune fenetre ne s ouvrira."
Write-Host "Logs: $projectRoot\logs\"
Write-Host ""
Write-Host "Priorite narrative: bot404-narrative-tick (15 min) appelle npm run npc:tick."
Write-Host "bot404-daily-theme (00:05) appelle npm run npc:daily-theme."
Write-Host "Les taches posts/comments appellent npc-generate-local (tick narratif en premier)."
Write-Host ""
Write-Host "Tester:"
Write-Host "  npm run npc:schedule:tick"
Write-Host "  npm run npc:schedule:posts"
Write-Host "  npm run npc:schedule:comments"
Write-Host "  npm run npc:schedule:both"
