$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($env:YOUCAM_API_KEY)) {
  throw 'Set your own YOUCAM_API_KEY in this PowerShell session before starting live mode.'
}

& (Join-Path $PSScriptRoot 'RUN_JUDGE_DEMO.ps1') -Mode live
exit $LASTEXITCODE
