$ErrorActionPreference = 'Stop'

$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectPath

Write-Host 'Refreshing PATH for this PowerShell session...'
$machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$combinedPath = @()
if ($machinePath) { $combinedPath += $machinePath -split ';' }
if ($userPath) { $combinedPath += $userPath -split ';' }
$env:Path = ($combinedPath | Where-Object { $_ -and $_.Trim() } | Select-Object -Unique) -join ';'

Write-Host 'Checking for Node.js and npm...'
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    throw "Node.js is not installed or not available on PATH. Install Node.js LTS first, then reopen VS Code and run this script again."
}

$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmCmd) {
    throw "npm is not available on PATH. Install Node.js LTS first, then reopen VS Code and run this script again."
}

Write-Host "Node: $($nodeCmd.Source)"
Write-Host "npm: $($npmCmd.Source)"

Write-Host 'Running npm install with legacy peer dependencies...'
npm install --legacy-peer-deps --no-fund --no-audit

Write-Host 'Running Prisma generate...'
npx prisma generate

Write-Host 'Setting up SQLite database...'
npx prisma db push

Write-Host 'Starting Thabat development server...'
npm run dev
