param([Parameter(Mandatory=$true)][string]$NodePath)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$collection = Join-Path $repo 'collection'
New-Item -ItemType Directory -Path $collection -Force | Out-Null
$log = Join-Path $collection 'daily-console.log'
# One previous console log is enough; full structured reports are separate.
if ((Test-Path -LiteralPath $log) -and (Get-Item -LiteralPath $log).Length -gt 2MB) {
    Move-Item -LiteralPath $log -Destination ($log + '.previous') -Force
}
Push-Location -LiteralPath $repo
try {
    $ErrorActionPreference = 'Continue'
    & $NodePath '--env-file-if-exists=.env' '--import' 'tsx' 'tools/daily-collect.ts' *> $log
    $result = $LASTEXITCODE
} finally { Pop-Location }
exit $result
