param(
  [ValidateSet('replay', 'live')]
  [string]$Mode = 'replay'
)

$ErrorActionPreference = 'Stop'
$PackageRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$NodeVersion = (& node -p "process.versions.node").Trim()
if ($LASTEXITCODE -ne 0 -or -not ($NodeVersion -match '^(\d+)\.')) {
  throw 'Node.js could not be found. Install Node.js 20 or newer.'
}
if ([int]$Matches[1] -lt 20) {
  throw "Node.js 20 or newer is required. Found $NodeVersion."
}

if ($Mode -eq 'live' -and [string]::IsNullOrWhiteSpace($env:YOUCAM_API_KEY)) {
  throw 'Live mode requires a non-empty YOUCAM_API_KEY in this PowerShell session.'
}

$KindFile = Join-Path $PackageRoot 'PACKAGE_KIND.txt'
$PackageKind = if (Test-Path -LiteralPath $KindFile) {
  (Get-Content -LiteralPath $KindFile -Raw).Trim()
} else {
  'standalone'
}

if ($PackageKind -eq 'source') {
  Push-Location $PackageRoot
  try {
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' }
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Production build failed.' }
  } finally {
    Pop-Location
  }
  $WorkingDirectory = $PackageRoot
  $ServerArguments = @('node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3000')
} else {
  $WorkingDirectory = Join-Path $PackageRoot 'app'
  $ServerArguments = @('server.js')
}

$NodeExecutable = (Get-Command node -ErrorAction Stop).Source
$StartInfo = New-Object System.Diagnostics.ProcessStartInfo
$StartInfo.FileName = $NodeExecutable
$StartInfo.Arguments = $ServerArguments -join ' '
$StartInfo.WorkingDirectory = $WorkingDirectory
$StartInfo.UseShellExecute = $false
$StartInfo.CreateNoWindow = $true
$Server = New-Object System.Diagnostics.Process
$Server.StartInfo = $StartInfo

$PreviousMode = [System.Environment]::GetEnvironmentVariable('MIRRORMOMENT_MODE', 'Process')
$PreviousHostname = [System.Environment]::GetEnvironmentVariable('HOSTNAME', 'Process')
$PreviousPort = [System.Environment]::GetEnvironmentVariable('PORT', 'Process')
$PreviousApiKey = [System.Environment]::GetEnvironmentVariable('YOUCAM_API_KEY', 'Process')
try {
  [System.Environment]::SetEnvironmentVariable('MIRRORMOMENT_MODE', $Mode, 'Process')
  [System.Environment]::SetEnvironmentVariable('HOSTNAME', '127.0.0.1', 'Process')
  [System.Environment]::SetEnvironmentVariable('PORT', '3000', 'Process')
  if ($Mode -eq 'replay') {
    [System.Environment]::SetEnvironmentVariable('YOUCAM_API_KEY', $null, 'Process')
  }
  if (-not $Server.Start()) {
    throw 'MirrorMoment server process could not be started.'
  }
} finally {
  [System.Environment]::SetEnvironmentVariable('MIRRORMOMENT_MODE', $PreviousMode, 'Process')
  [System.Environment]::SetEnvironmentVariable('HOSTNAME', $PreviousHostname, 'Process')
  [System.Environment]::SetEnvironmentVariable('PORT', $PreviousPort, 'Process')
  [System.Environment]::SetEnvironmentVariable('YOUCAM_API_KEY', $PreviousApiKey, 'Process')
}

try {
  $Deadline = [DateTime]::UtcNow.AddSeconds(30)
  $Ready = $false
  while ([DateTime]::UtcNow -lt $Deadline -and -not $Server.HasExited) {
    try {
      $Runtime = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/runtime' -TimeoutSec 2
      if ($Runtime.mode -eq $Mode) {
        $Ready = $true
        break
      }
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }
  if (-not $Ready) {
    throw 'MirrorMoment did not become ready within 30 seconds.'
  }

  Write-Host "MirrorMoment mode: $Mode"
  Write-Host 'MirrorMoment is ready at http://127.0.0.1:3000'
  Write-Host 'Open that URL manually. Press Ctrl+C here when finished.'
  Wait-Process -Id $Server.Id
  $Server.Refresh()
  if ($Server.ExitCode -ne 0) {
    throw "MirrorMoment exited with code $($Server.ExitCode)."
  }
} finally {
  if (-not $Server.HasExited) {
    Stop-Process -Id $Server.Id -Force
  }
}
