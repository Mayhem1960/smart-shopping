<#
.SYNOPSIS
    Smart Shopping - debug + EAS APK build routine.

.DESCRIPTION
    One command to reproduce the local workflow:
      1. Prepares PATH (adds Git's bin so pnpm's `sh` preinstall hook works on Windows).
      2. Verifies node / pnpm / eas are available.
      3. `pnpm install`.
      4. Typechecks the shippable packages (mobile, libs, api-server, scripts) as a GATE.
         The non-shipped `artifacts/mockup-sandbox` playground is skipped (known pre-existing
         React 19 @types/react errors, not part of the app or the APK).
      5. If the typecheck passes, runs the EAS Android build (profile `preview` => APK).

    The Expo access token is NEVER stored in this file. It is read from the
    EXPO_TOKEN environment variable (or the -Token parameter). Create one at
    https://expo.dev/accounts/mayhem1960/settings/access-tokens and revoke it when done.

.PARAMETER Token
    Expo access token. Defaults to $env:EXPO_TOKEN. Required unless -SkipBuild is used.

.PARAMETER Platform
    EAS build platform. Default: android.

.PARAMETER Profile
    eas.json build profile. Default: preview (Android buildType = apk).

.PARAMETER Wait
    Wait for the cloud build to finish and print the artifact URL.
    Omitted => --no-wait (returns as soon as the build is queued).

.PARAMETER SkipInstall
    Skip `pnpm install` (use when deps are already current).

.PARAMETER SkipBuild
    Run install + typecheck only (debug), do not trigger an EAS build. No token needed.

.EXAMPLE
    $env:EXPO_TOKEN = "xxxxxxxx"; .\build-apk.ps1
        Install, typecheck, and queue an APK build (no-wait).

.EXAMPLE
    .\build-apk.ps1 -Token "xxxxxxxx" -Wait
        Same, but block until the APK is built and print the download URL.

.EXAMPLE
    .\build-apk.ps1 -SkipBuild
        Debug only: install + typecheck. No token required.
#>
[CmdletBinding()]
param(
    [string]$Token       = $env:EXPO_TOKEN,
    [string]$Platform    = "android",
    [string]$Profile     = "preview",
    [switch]$Wait,
    [switch]$SkipInstall,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$RepoRoot = $PSScriptRoot
Set-Location $RepoRoot

# eas-cli prints an "update available" notice to stderr; under ErrorActionPreference
# "Stop" that stderr is treated as a terminating error and aborts the build step.
$env:NO_UPDATE_NOTIFIER = "1"

function Info($m){ Write-Host "==> $m" -ForegroundColor Cyan }
function Ok($m){   Write-Host "OK  $m"  -ForegroundColor Green }
function Die($m){  Write-Host "ERR $m"  -ForegroundColor Red; exit 1 }

# --- 1. PATH setup ------------------------------------------------------------
# Start from the machine + user PATH (what a fresh terminal sees), then add Git's
# bin dir so the workspace preinstall hook (sh -c ...) can find sh.exe.
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
            [System.Environment]::GetEnvironmentVariable("Path","User")

$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if ($gitCmd) {
    $gitRoot = Split-Path (Split-Path $gitCmd.Source)   # ...\Git\cmd\git.exe -> ...\Git
    foreach ($b in @("$gitRoot\bin","$gitRoot\usr\bin")) {
        if ((Test-Path "$b\sh.exe") -and ($env:Path -notlike "*$b*")) { $env:Path = "$b;" + $env:Path }
    }
}

# --- 2. Tool checks -----------------------------------------------------------
Info "Checking toolchain"
foreach ($t in @("node","pnpm")) {
    if (-not (Get-Command $t -ErrorAction SilentlyContinue)) {
        Die "$t not found on PATH. Install Node.js LTS + pnpm, then re-run. See CLAUDE.md."
    }
}
if (-not (Get-Command sh -ErrorAction SilentlyContinue)) {
    Die "sh not found (needed by the pnpm preinstall hook). Install Git for Windows."
}
Ok ("node " + (node --version) + " / pnpm " + (pnpm --version))

# --- 3. Install ---------------------------------------------------------------
if ($SkipInstall) {
    Info "Skipping pnpm install (-SkipInstall)"
} else {
    Info "pnpm install"
    pnpm install
    if ($LASTEXITCODE -ne 0) { Die "pnpm install failed (exit $LASTEXITCODE)." }
    Ok "Dependencies installed"
}

# --- 4. Typecheck gate --------------------------------------------------------
Info "Typechecking shippable packages (debug gate)"
$tsc = Join-Path $RepoRoot "node_modules\.bin\tsc.CMD"
if (-not (Test-Path $tsc)) { Die "tsc not found at $tsc (did pnpm install run?)" }

$targets = @(
    @{ Name = "libs (tsc --build)";      Args = @("--build") },
    @{ Name = "artifacts/mobile";        Args = @("-p","artifacts/mobile/tsconfig.json","--noEmit") },
    @{ Name = "artifacts/api-server";    Args = @("-p","artifacts/api-server/tsconfig.json","--noEmit") },
    @{ Name = "artifacts/mockup-sandbox"; Args = @("-p","artifacts/mockup-sandbox/tsconfig.json","--noEmit") },
    @{ Name = "scripts";                 Args = @("-p","scripts/tsconfig.json","--noEmit") }
)

$failed = @()
foreach ($t in $targets) {
    Write-Host "  - $($t.Name) ..." -NoNewline
    & $tsc @($t.Args) | Out-Null
    if ($LASTEXITCODE -eq 0) { Write-Host " ok" -ForegroundColor Green }
    else { Write-Host " FAILED" -ForegroundColor Red; $failed += $t.Name }
}
if ($failed.Count -gt 0) {
    Die ("Typecheck failed for: " + ($failed -join ", ") + ". Fix before building.")
}
Ok "Typecheck passed"

# --- 5. EAS build -------------------------------------------------------------
if ($SkipBuild) {
    Info "Debug complete. Skipping EAS build (-SkipBuild)."
    exit 0
}

if (-not (Get-Command eas -ErrorAction SilentlyContinue)) {
    Die "eas CLI not found. Install with: npm install -g eas-cli"
}
if ([string]::IsNullOrWhiteSpace($Token)) {
    Die "No Expo token. Set `$env:EXPO_TOKEN or pass -Token. Create one at https://expo.dev/accounts/mayhem1960/settings/access-tokens"
}

$env:EXPO_TOKEN = $Token
Info "Authenticating with Expo"
$who = eas whoami 2>&1
if ($LASTEXITCODE -ne 0) { Die "eas whoami failed: $who" }
Ok "Authenticated: $who"

Set-Location (Join-Path $RepoRoot "artifacts\mobile")
$buildArgs = @("build","--platform",$Platform,"--profile",$Profile,"--non-interactive")
if (-not $Wait) { $buildArgs += "--no-wait" }

Info ("eas " + ($buildArgs -join " "))
# eas writes progress to stderr; don't let it terminate under -ErrorActionPreference Stop.
$prevEAP = $ErrorActionPreference
$ErrorActionPreference = "Continue"
eas @buildArgs 2>&1 | Write-Host
$code = $LASTEXITCODE
$ErrorActionPreference = $prevEAP
Set-Location $RepoRoot
if ($code -ne 0) { Die "eas build failed (exit $code)." }

Ok "Build submitted. Track it at https://expo.dev/accounts/mayhem1960/projects/mobile/builds"
Write-Host "Reminder: revoke the access token when finished:" -ForegroundColor Yellow
Write-Host "  https://expo.dev/accounts/mayhem1960/settings/access-tokens" -ForegroundColor Yellow
