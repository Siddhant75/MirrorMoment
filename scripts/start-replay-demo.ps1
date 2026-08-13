$ErrorActionPreference = 'Stop'

$env:MIRRORMOMENT_MODE = 'replay'
Remove-Item Env:YOUCAM_API_KEY -ErrorAction SilentlyContinue
node (Join-Path $PSScriptRoot 'start-demo.mjs') replay
exit $LASTEXITCODE
