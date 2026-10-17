$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
Write-Host 'Create your own administrator. Existing accounts are never changed.'
$adminEmail = Read-Host 'Email for the new admin account'
$adminUsername = Read-Host 'Username (3-20 letters, digits or underscores)'
$securePassword = Read-Host 'New password (at least 12 characters)' -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
  $adminPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  if ($adminPassword.Length -lt 12 -or [Text.Encoding]::UTF8.GetByteCount($adminPassword) -gt 72) {
    throw 'Choose a password of at least 12 characters and no more than 72 UTF-8 bytes.'
  }
  $payload = @{ email = $adminEmail; username = $adminUsername; password = $adminPassword } | ConvertTo-Json -Compress
  $payload | docker compose exec -T api node -e 'const data=JSON.parse(require("fs").readFileSync(0,"utf8"));process.env.ADMIN_EMAIL=data.email;process.env.ADMIN_USERNAME=data.username;process.env.ADMIN_PASSWORD=data.password;require("./dist/bootstrapAdmin.js");'
  if ($LASTEXITCODE -ne 0) { throw 'Admin creation failed. Use a new email/username and check that CodeForge is running.' }
  Write-Host 'Sign in at http://localhost:3000/login, then open Admin > Problems or Admin > Courses.'
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  $adminPassword = $null
  $payload = $null
  if ($securePassword) { $securePassword.Dispose() }
}
