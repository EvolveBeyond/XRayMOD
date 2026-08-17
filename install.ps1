# ═══════════════════════════════════════════════════════════════
#  XrayMOD — Fully Automatic Installer (Windows)
#  Version: 2026.07.16-oss1
#
#  PowerShell (prompt PS C:\...):
#    irm https://raw.githubusercontent.com/askarniroomand/XRayMOD/main/install.ps1 | iex
#
#  CMD (prompt C:\... without PS):
#    powershell -NoProfile -ExecutionPolicy Bypass -Command "iex (iwr -UseBasicParsing 'https://raw.githubusercontent.com/askarniroomand/XRayMOD/main/install.ps1').Content"
#
#  Auto: Node · Python/uv · source ZIP · deploy  (git NOT required)
#  You only enter: Cloudflare token · username · password
#  Tokens are never written to the GitHub repo.
#
#  Support: https://t.me/MRROBOT_DT
# ═══════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"
$XrayModInstallerVersion = "2026.07.16-oss1"

Write-Host "DEPRECATED primary path: prefer the in-panel Wizard (/install) and rolling Worker artifacts." -ForegroundColor Yellow
Write-Host "This PowerShell installer remains for compatibility until cleanup is approved." -ForegroundColor DarkGray

$RepoUrl = if ($env:XRAYMOD_REPO) { $env:XRAYMOD_REPO } else { "https://github.com/askarniroomand/XRayMOD.git" }
$Branch  = if ($env:XRAYMOD_BRANCH) { $env:XRAYMOD_BRANCH } else { "main" }
$InstallerDir = Join-Path $env:USERPROFILE ".xraymod"
$RepoDir = Join-Path $InstallerDir "XRayMOD"

function Write-Step([string]$msg) { Write-Host "→ $msg" -ForegroundColor Yellow }
function Write-Ok([string]$msg)   { Write-Host "✓ $msg" -ForegroundColor Green }
function Write-Dim([string]$msg)  { Write-Host "  $msg" -ForegroundColor DarkGray }
function Die([string]$msg) {
  Write-Host "✗ $msg" -ForegroundColor Red
  Write-Host "  پشتیبانی: https://t.me/MRROBOT_DT" -ForegroundColor Yellow
  exit 1
}

function Test-Cmd([string]$name) {
  return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Add-ToPath([string]$dir) {
  if ($dir -and (Test-Path $dir) -and ($env:Path -notlike "*$dir*")) {
    $env:Path = "$dir;$env:Path"
  }
}

function Refresh-PathFromMachine {
  try {
    $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $user    = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($machine -or $user) {
      $env:Path = "$user;$machine;$env:Path"
    }
  } catch {}
}

function Ensure-ToolPaths {
  Refresh-PathFromMachine

  @(
    "${env:ProgramFiles}\Git\cmd",
    "${env:ProgramFiles}\Git\bin",
    "${env:ProgramFiles(x86)}\Git\cmd",
    "${env:LocalAppData}\Programs\Git\cmd",
    "${env:ProgramFiles}\nodejs",
    "${env:ProgramFiles(x86)}\nodejs",
    "${env:LocalAppData}\Programs\node",
    "${env:APPDATA}\npm",
    "${env:LocalAppData}\Programs\Python\Python313",
    "${env:LocalAppData}\Programs\Python\Python313\Scripts",
    "${env:LocalAppData}\Programs\Python\Python312",
    "${env:LocalAppData}\Programs\Python\Python312\Scripts",
    "${env:LocalAppData}\Programs\Python\Python311",
    "${env:LocalAppData}\Programs\Python\Python311\Scripts",
    "${env:LocalAppData}\Programs\Python\Python310",
    "${env:LocalAppData}\Programs\Python\Python310\Scripts",
    "${env:LocalAppData}\uv\bin",
    "$env:USERPROFILE\.local\bin",
    "$env:USERPROFILE\.cargo\bin",
    "${env:ProgramFiles}\Python313",
    "${env:ProgramFiles}\Python312",
    "${env:ProgramFiles}\Python311",
    "${env:ProgramFiles}\Python310"
  ) | ForEach-Object { Add-ToPath $_ }

  foreach ($root in @("${env:LocalAppData}\Programs\Python", "${env:ProgramFiles}")) {
    if (Test-Path $root) {
      Get-ChildItem -Path $root -Filter "python.exe" -Recurse -ErrorAction SilentlyContinue |
        Select-Object -First 5 |
        ForEach-Object { Add-ToPath $_.DirectoryName }
    }
  }
}

function Invoke-WingetInstall([string]$packageId, [string]$label) {
  if (-not (Test-Cmd "winget")) { return $false }
  Write-Step "نصب خودکار $label (winget)..."
  try {
    $p = Start-Process -FilePath "winget" -ArgumentList @(
      "install", "-e", "--id", $packageId,
      "--accept-package-agreements", "--accept-source-agreements",
      "--disable-interactivity", "--silent"
    ) -Wait -PassThru -NoNewWindow
    Refresh-PathFromMachine
    Ensure-ToolPaths
    return ($p.ExitCode -eq 0 -or $p.ExitCode -eq -1978335189) # already installed
  } catch {
    return $false
  }
}

function Ensure-Node {
  Ensure-ToolPaths
  if (Test-Cmd "node") {
    $nodeVer = (node -v).Trim()
    $nodeMajor = 0
    if ($nodeVer -match "v?(\d+)") { $nodeMajor = [int]$Matches[1] }
    if ($nodeMajor -ge 18) {
      Write-Ok "Node $nodeVer"
      return
    }
    Write-Dim "Node قدیمی است ($nodeVer) — ارتقا..."
  }

  # 1) winget
  if (Invoke-WingetInstall "OpenJS.NodeJS.LTS" "Node.js LTS") {
    Ensure-ToolPaths
    if (Test-Cmd "node") {
      Write-Ok "Node $((node -v).Trim())"
      return
    }
  }

  # 2) direct MSI from nodejs.org (silent)
  Write-Step "دانلود و نصب Node.js LTS..."
  try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $index = Invoke-RestMethod -Uri "https://nodejs.org/dist/index.json" -UseBasicParsing
    $lts = $index | Where-Object { $_.lts -ne $false } | Select-Object -First 1
    $ver = $lts.version
    $msi = Join-Path $env:TEMP "node-$ver-x64.msi"
    $url = "https://nodejs.org/dist/$ver/node-$ver-x64.msi"
    Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $msi
    $args = "/i `"$msi`" /qn /norestart ADDLOCAL=ALL"
    $p = Start-Process msiexec.exe -ArgumentList $args -Wait -PassThru
    Remove-Item $msi -Force -ErrorAction SilentlyContinue
    Refresh-PathFromMachine
    Ensure-ToolPaths
    # node often installs to Program Files
    Add-ToPath "${env:ProgramFiles}\nodejs"
    if (Test-Cmd "node") {
      Write-Ok "Node $((node -v).Trim())"
      return
    }
  } catch {
    Write-Dim "نصب مستقیم Node ناموفق: $($_.Exception.Message)"
  }

  Die @"
Node.js 18+ نصب نشد.

دستی: https://nodejs.org (LTS) → تیک Add to PATH
بعد ترمینال را ببند/باز کن و دوباره همان یک دستور را بزن.
"@
}

function Ensure-PythonRuntime {
  Ensure-ToolPaths

  # Prefer uv (ships its own Python)
  if (-not (Test-Cmd "uv")) {
    Write-Step "نصب uv (پایتون خودکار)..."
    try {
      [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
      irm https://astral.sh/uv/install.ps1 | iex
    } catch {
      Write-Dim "uv نصب نشد: $($_.Exception.Message)"
    }
    Ensure-ToolPaths
  }

  if (Test-Cmd "uv") {
    Write-Ok "uv آماده است"
    return
  }

  # System Python
  if (Test-Cmd "python") {
    try {
      $v = & python --version 2>&1 | Out-String
      if ($v -match "Python 3") {
        Write-Ok $v.Trim()
        return
      }
    } catch {}
  }
  if (Test-Cmd "py") {
    Write-Ok "Python launcher (py) پیدا شد"
    return
  }

  if (Invoke-WingetInstall "Python.Python.3.12" "Python 3.12") {
    Ensure-ToolPaths
    if ((Test-Cmd "python") -or (Test-Cmd "py")) {
      Write-Ok "Python نصب شد"
      return
    }
  }

  Die @"
Python نصب نشد (uv هم در دسترس نیست).

دستی یکی از این‌ها:
  • https://www.python.org/downloads  (تیک Add to PATH)
  • یا winget install Python.Python.3.12
بعد ترمینال را ببند/باز کن و دوباره همان یک دستور را بزن.
"@
}

function Get-GitHubZipUrl {
  if ($RepoUrl -match 'github\.com[/:]([^/]+)/([^/\.]+)') {
    $owner = $Matches[1]
    $repo  = $Matches[2] -replace '\.git$', ''
    return "https://github.com/$owner/$repo/archive/refs/heads/$Branch.zip"
  }
  return $null
}

function Install-FromZip {
  $zipUrl = Get-GitHubZipUrl
  if (-not $zipUrl) {
    Die "آدرس ریپو نامعتبر است"
  }

  $zipPath = Join-Path $InstallerDir "xraymod-src.zip"
  $extractDir = Join-Path $InstallerDir "_extract"

  Write-Step "دانلود XrayMOD از GitHub..."
  try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -UseBasicParsing -Uri $zipUrl -OutFile $zipPath
  } catch {
    Die "دانلود ناموفق: $($_.Exception.Message)`n  دسترسی به GitHub را چک کن"
  }

  if (Test-Path $extractDir) { Remove-Item -Recurse -Force $extractDir }
  if (Test-Path $RepoDir) { Remove-Item -Recurse -Force $RepoDir }
  New-Item -ItemType Directory -Force -Path $extractDir | Out-Null

  Write-Step "استخراج..."
  Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force
  Remove-Item -Force $zipPath -ErrorAction SilentlyContinue

  $inner = Get-ChildItem -Path $extractDir -Directory | Select-Object -First 1
  if (-not $inner) { Die "استخراج ZIP خالی بود" }
  Move-Item -Path $inner.FullName -Destination $RepoDir
  Remove-Item -Recurse -Force $extractDir -ErrorAction SilentlyContinue
}

function Install-FromGit {
  $gitDir = Join-Path $RepoDir ".git"
  if (Test-Path $gitDir) {
    Write-Step "به‌روزرسانی مخزن..."
    try { & git -C $RepoDir remote set-url origin $RepoUrl 2>$null } catch {}
    try { & git -C $RepoDir fetch --depth 1 origin $Branch --quiet 2>$null } catch {}
    try { & git -C $RepoDir checkout -f $Branch --quiet 2>$null } catch {}
    try { & git -C $RepoDir reset --hard "origin/$Branch" --quiet 2>$null } catch {
      try { & git -C $RepoDir pull --ff-only --quiet 2>$null } catch {}
    }
    return
  }

  Write-Step "دانلود XrayMOD (git)..."
  if (Test-Path $RepoDir) { Remove-Item -Recurse -Force $RepoDir }
  & git clone --depth 1 -b $Branch $RepoUrl $RepoDir
  if ($LASTEXITCODE -ne 0) {
    Write-Dim "git clone ناموفق — ZIP..."
    Install-FromZip
  }
}

try {
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  $OutputEncoding = [System.Text.Encoding]::UTF8
  chcp 65001 | Out-Null
} catch {}

try {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
} catch {}

Ensure-ToolPaths

Clear-Host
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   XrayMOD  ·  نصب کاملاً خودکار                  ║" -ForegroundColor Green
Write-Host "║   Node · Python · سورس · دیپلوی  (بدون git)      ║" -ForegroundColor Green
Write-Host "║   فقط توکن · یوزر · رمز                          ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  installer $XrayModInstallerVersion" -ForegroundColor DarkGray
Write-Host "  پشتیبانی: https://t.me/MRROBOT_DT" -ForegroundColor Cyan
Write-Host ""

# ── auto prerequisites ──────────────────────────────────────
Ensure-Node
if (-not (Test-Cmd "npm")) {
  Die "npm پیدا نشد بعد از نصب Node — ترمینال را ببند و دوباره باز کن، سپس همان دستور را بزن"
}

$hasGit = Test-Cmd "git"
if ($hasGit) { Write-Ok "git" } else { Write-Dim "بدون git — دانلود ZIP" }

Ensure-PythonRuntime

# ── fetch source ────────────────────────────────────────────
New-Item -ItemType Directory -Force -Path $InstallerDir | Out-Null

if ($hasGit) {
  try { Install-FromGit } catch {
    Write-Dim "git خطا — ZIP..."
    Install-FromZip
  }
} else {
  Install-FromZip
}

Set-Location $RepoDir
$cliDeploy = Join-Path $RepoDir "installer\cli_deploy.py"
if (-not (Test-Path $cliDeploy)) {
  Die "installer/cli_deploy.py پیدا نشد — دوباره امتحان کن"
}
Write-Ok "سورس آماده است"
Write-Host ""

# ── run interactive deploy ──────────────────────────────────
if (Test-Cmd "uv") {
  & uv run --with httpx python installer/cli_deploy.py @args
  exit $LASTEXITCODE
}

$pyExe = $null
$pyArgs = @()
if (Test-Cmd "python") {
  try {
    $v = & python --version 2>&1 | Out-String
    if ($v -match "Python 3") { $pyExe = "python" }
  } catch {}
}
if (-not $pyExe -and (Test-Cmd "python3")) { $pyExe = "python3" }
if (-not $pyExe -and (Test-Cmd "py")) {
  $pyExe = "py"
  $pyArgs = @("-3")
}
if (-not $pyExe) {
  Die "پایتون پیدا نشد بعد از نصب خودکار — ترمینال را ببند/باز کن و دوباره بزن"
}

Write-Step "نصب httpx..."
try { & $pyExe @pyArgs -m pip install --user -q httpx 2>$null | Out-Null } catch {}

& $pyExe @pyArgs installer/cli_deploy.py @args
exit $LASTEXITCODE
