[CmdletBinding()]
param(
  [string]$RuntimeEnv = (Join-Path $env:LOCALAPPDATA 'Notcards/dev/runtime.env'),
  [string]$TunnelCredential = (Join-Path $env:USERPROFILE '.cloudflared/1e391707-1dee-43e8-847e-0adb76605b2e.json'),
  [string]$GoogleClientFile,
  [switch]$Stop
)
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$compose = Join-Path $PSScriptRoot 'compose.yml'
$env:NOTCARDS_RUNTIME_ENV = [IO.Path]::GetFullPath($RuntimeEnv)
$env:NOTCARDS_TUNNEL_CREDENTIALS = [IO.Path]::GetFullPath($TunnelCredential)
if ($Stop) {
  docker compose -f $compose down
  exit $LASTEXITCODE
}
if (-not (Test-Path -LiteralPath $env:NOTCARDS_TUNNEL_CREDENTIALS -PathType Leaf)) {
  throw 'Configure the dedicated Notcards tunnel credential before starting the dev stack.'
}
if (-not (Test-Path -LiteralPath $env:NOTCARDS_RUNTIME_ENV -PathType Leaf)) {
  [void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($env:NOTCARDS_RUNTIME_ENV))
  $file = [IO.File]::Open($env:NOTCARDS_RUNTIME_ENV, 'CreateNew', 'Write', 'None')
  try {
    $serialized = [Text.Encoding]::UTF8.GetBytes("# Notcards development Google web client configuration" + [Environment]::NewLine)
    $file.Write($serialized, 0, $serialized.Length)
  } finally { $file.Dispose() }
}
if ($GoogleClientFile) {
  $client = (Get-Content -LiteralPath $GoogleClientFile -Raw | ConvertFrom-Json).web
  if (-not $client -or $client.client_id -notmatch '^[A-Za-z0-9._-]+\.apps\.googleusercontent\.com$' -or $client.client_secret -notmatch '^[A-Za-z0-9._-]+$') {
    throw 'Select the downloaded Notcards Web application JSON.'
  }
  if ($client.redirect_uris -notcontains 'https://not.maremoto.dev/auth/google/callback') {
    throw 'Register the Notcards dev callback in Google and download the updated Web application JSON.'
  }
  $envPath = $env:NOTCARDS_RUNTIME_ENV
  $lines = @([IO.File]::ReadAllLines($envPath) | Where-Object { $_ -notmatch '^NOTCARDS_GOOGLE_CLIENT_(ID|SECRET)=' })
  $lines += 'NOTCARDS_GOOGLE_CLIENT_ID=' + $client.client_id
  $lines += 'NOTCARDS_GOOGLE_CLIENT_SECRET=' + $client.client_secret
  $tempPath = $envPath + '.' + [Guid]::NewGuid().ToString('N') + '.tmp'
  try {
    [IO.File]::WriteAllLines($tempPath, [string[]]$lines, (New-Object Text.UTF8Encoding($false)))
    [IO.File]::Replace($tempPath, $envPath, [System.Management.Automation.Language.NullString]::Value)
  } finally {
    if ([IO.File]::Exists($tempPath)) { [IO.File]::Delete($tempPath) }
  }
}
Push-Location $repoRoot
try {
  node scripts/notcards-extension.mjs
  if ($LASTEXITCODE) { throw 'Extension package failed to build.' }
  docker compose -f $compose up -d --build --wait --wait-timeout 120
  if ($LASTEXITCODE) { throw 'Notcards dev stack failed its readiness check.' }
} finally { Pop-Location }
