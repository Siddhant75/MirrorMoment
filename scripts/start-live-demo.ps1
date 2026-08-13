$ErrorActionPreference = 'Stop'

$env:MIRRORMOMENT_MODE = 'live'
node (Join-Path $PSScriptRoot 'start-demo.mjs') live
exit $LASTEXITCODE
