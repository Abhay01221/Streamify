param([switch]$NoBuild, [switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

function New-LocalSecret {
  $bytes = New-Object byte[] 48
  $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
  return [BitConverter]::ToString($bytes).Replace('-', '').ToLowerInvariant()
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Install Docker Desktop, then run this script again.' }
if (-not (Test-Path -LiteralPath '.env')) {
  $values = @{
    'replace-with-random-database-password' = (New-LocalSecret)
    'replace-with-random-redis-password' = (New-LocalSecret)
    'replace-with-at-least-32-random-characters-access' = (New-LocalSecret)
    'replace-with-at-least-32-different-random-characters-refresh' = (New-LocalSecret)
  }
  $template = Get-Content -LiteralPath '.env.example' -Raw
  foreach ($pair in $values.GetEnumerator()) { $template = $template.Replace($pair.Key, $pair.Value) }
  [IO.File]::WriteAllText((Join-Path $PSScriptRoot '.env'), $template, (New-Object Text.UTF8Encoding($false)))
  Write-Host 'Created a private local .env with independent random secrets. Social login and AI stay disabled until configured.'
}

docker info --format '{{.ServerVersion}}' 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Starting Docker Desktop...'
  docker desktop start --detach
  if ($LASTEXITCODE -ne 0) { throw 'Open Docker Desktop, wait until its engine is running, then run this script again.' }
  $engineReady = $false
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    docker info --format '{{.ServerVersion}}' 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $engineReady = $true; break }
    Start-Sleep -Seconds 2
  }
  if (-not $engineReady) { throw 'Docker Desktop did not become ready. Open Docker Desktop and resolve its startup error, then run this script again.' }
}

if ($CheckOnly) { docker compose ps; exit $LASTEXITCODE }
Write-Host 'Starting CodeForge. Database volumes and existing accounts are preserved.'
if ($NoBuild) { docker compose up -d --wait --wait-timeout 180 }
else { docker compose up --build -d --wait --wait-timeout 300 }
if ($LASTEXITCODE -ne 0) {
  throw 'CodeForge could not start. Run docker compose logs --tail 50 api. If this is an older database, follow docs/deployment.md; do not delete its volumes.'
}
$catalog = Invoke-RestMethod -Uri 'http://localhost:3000/api/problems?limit=1'
$courses = Invoke-RestMethod -Uri 'http://localhost:3000/api/study-plans?limit=1'
Write-Host ("Ready: http://localhost:3000 — {0} published problems, {1} courses." -f $catalog.catalogTotal, $courses.pagination.total)
Write-Host 'To add a question: sign in as an admin, then Admin > Problems > Add problem.'
Write-Host 'To add a course: Admin > Courses > Create course.'
