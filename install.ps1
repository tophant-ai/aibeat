[CmdletBinding()]
param(
    [string]$Version = $(if ($env:AIBEAT_VERSION) { $env:AIBEAT_VERSION } else { "0.3-agentbeat-preview" }),
    [string]$InstallDir = $(if ($env:AIBEAT_INSTALL_DIR) { $env:AIBEAT_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA "aibeat" }),
    [string]$BinDir = $(if ($env:AIBEAT_BIN_DIR) { $env:AIBEAT_BIN_DIR } else { Join-Path $env:LOCALAPPDATA "aibeat\bin" }),
    [string]$CacheDir = $(if ($env:AIBEAT_CACHE_DIR) { $env:AIBEAT_CACHE_DIR } else { Join-Path $env:LOCALAPPDATA "aibeat\cache" }),
    [switch]$RuntimeOnly
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$NodeVersion = "22.22.2"
$PromptfooVersion = "0.121.9"
$NodeFile = "node-v$NodeVersion-win-x64.zip"
$NodeSha256 = if ($env:AIBEAT_NODE_SHA256) { $env:AIBEAT_NODE_SHA256 } else { "7c93e9d92bf68c07182b471aa187e35ee6cd08ef0f24ab060dfff605fcc1c57c" }
$PromptfooSha512 = if ($env:AIBEAT_PROMPTFOO_SHA512) { $env:AIBEAT_PROMPTFOO_SHA512 } else { "6fb07170db60eee94625ca3aeca354aa2b727226001a5d7d85c7307815dcaace275ce49f3a1ac4f07936a700e899d78a3835e0ea9e636c9ce0aaaf70048a7bfe" }
$ReleaseBase = if ($env:AIBEAT_RELEASE_BASE) { $env:AIBEAT_RELEASE_BASE.TrimEnd("/") } else { "https://github.com/tophant-ai/aibeat/releases/download" }
$NodeBase = if ($env:AIBEAT_NODE_BASE) { $env:AIBEAT_NODE_BASE.TrimEnd("/") } else { "https://nodejs.org/dist/v$NodeVersion" }
$PromptfooUrl = if ($env:AIBEAT_PROMPTFOO_URL) { $env:AIBEAT_PROMPTFOO_URL } else { "https://registry.npmjs.org/promptfoo/-/promptfoo-$PromptfooVersion.tgz" }
$Platform = "windows-x64"
$script:ActiveLock = $null

if (-not [Environment]::Is64BitOperatingSystem) {
    throw "Unsupported platform: Windows x64 is required."
}

function Get-Digest([string]$Path, [string]$Algorithm) {
    return (Get-FileHash -LiteralPath $Path -Algorithm $Algorithm).Hash.ToLowerInvariant()
}

function Assert-Digest([string]$Path, [string]$Algorithm, [string]$Expected) {
    $actual = Get-Digest $Path $Algorithm
    if ($actual -ne $Expected.ToLowerInvariant()) {
        throw "$Algorithm verification failed for $Path`nexpected: $Expected`nactual:   $actual"
    }
}

function Receive-File([string]$Url, [string]$Output) {
    $parent = Split-Path -Parent $Output
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
    Invoke-WebRequest -Uri $Url -OutFile $Output -UseBasicParsing
}

function Enter-InstallLock([string]$Path) {
    for ($attempt = 0; $attempt -lt 120; $attempt++) {
        try {
            New-Item -ItemType Directory -Path $Path -ErrorAction Stop | Out-Null
            Set-Content -LiteralPath (Join-Path $Path "owner") -Value $PID -NoNewline
            $script:ActiveLock = $Path
            return
        } catch {
            $ownerFile = Join-Path $Path "owner"
            if (Test-Path -LiteralPath $ownerFile) {
                $ownerPid = Get-Content -LiteralPath $ownerFile -ErrorAction SilentlyContinue
                if ($ownerPid -match '^\d+$' -and -not (Get-Process -Id $ownerPid -ErrorAction SilentlyContinue)) {
                    Remove-Item -LiteralPath $ownerFile -Force -ErrorAction SilentlyContinue
                    Remove-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
                    continue
                }
            }
            Start-Sleep -Seconds 1
        }
    }
    throw "Timed out waiting for install lock: $Path"
}

function Exit-InstallLock([string]$Path) {
    Remove-Item -LiteralPath (Join-Path $Path "owner") -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
    $script:ActiveLock = $null
}

try {
    $nodeDir = Join-Path $CacheDir "runtime\node\$NodeVersion\$Platform"
    $promptfooDir = Join-Path $CacheDir "runtime\promptfoo\$PromptfooVersion\$Platform"
    $downloadDir = Join-Path $CacheDir "downloads"
    $nodeMarker = Join-Path $nodeDir ".aibeat-runtime"
    $nodeExe = Join-Path $nodeDir "node.exe"
    $npmCmd = Join-Path $nodeDir "npm.cmd"
    $promptfooCmd = Join-Path $promptfooDir "node_modules\.bin\promptfoo.cmd"
    $promptfooMarker = Join-Path $promptfooDir ".aibeat-runtime"
    $expectedNodeMarker = "node=$NodeVersion sha256=$NodeSha256"
    $expectedPromptfooMarker = "promptfoo=$PromptfooVersion sha512=$PromptfooSha512 node=$NodeVersion"

    function Test-NodeRuntime {
        if (-not (Test-Path -LiteralPath $nodeExe) -or -not (Test-Path -LiteralPath $nodeMarker)) { return $false }
        if ((Get-Content -LiteralPath $nodeMarker -Raw).Trim() -ne $expectedNodeMarker) { return $false }
        try { return (& $nodeExe --version) -eq "v$NodeVersion" } catch { return $false }
    }

    if (Test-NodeRuntime) {
        Write-Host "Reusing Node.js $NodeVersion from $nodeDir"
    } else {
        $nodeLock = "$nodeDir.lock"
        New-Item -ItemType Directory -Force -Path (Split-Path -Parent $nodeDir) | Out-Null
        Enter-InstallLock $nodeLock
        if (-not (Test-NodeRuntime)) {
            Write-Host "Installing Node.js $NodeVersion for $Platform"
            $nodeArchive = Join-Path $downloadDir $NodeFile
            $nodeTempArchive = "$nodeArchive.tmp-$PID"
            Receive-File "$NodeBase/$NodeFile" $nodeTempArchive
            Assert-Digest $nodeTempArchive SHA256 $NodeSha256
            Move-Item -LiteralPath $nodeTempArchive -Destination $nodeArchive -Force
            $extractRoot = Join-Path $CacheDir "extract-node-$PID"
            Remove-Item -LiteralPath $extractRoot -Recurse -Force -ErrorAction SilentlyContinue
            Expand-Archive -LiteralPath $nodeArchive -DestinationPath $extractRoot -Force
            $sourceDir = Get-ChildItem -LiteralPath $extractRoot -Directory | Select-Object -First 1
            if (-not $sourceDir) { throw "Node.js archive did not contain a root directory." }
            $nodeTempDir = "$nodeDir.tmp-$PID"
            Remove-Item -LiteralPath $nodeTempDir -Recurse -Force -ErrorAction SilentlyContinue
            Move-Item -LiteralPath $sourceDir.FullName -Destination $nodeTempDir
            Set-Content -LiteralPath (Join-Path $nodeTempDir ".aibeat-runtime") -Value $expectedNodeMarker -NoNewline
            Remove-Item -LiteralPath $extractRoot -Recurse -Force
            Remove-Item -LiteralPath $nodeDir -Recurse -Force -ErrorAction SilentlyContinue
            Move-Item -LiteralPath $nodeTempDir -Destination $nodeDir
            if (-not (Test-NodeRuntime)) { throw "Node.js runtime validation failed." }
        }
        Exit-InstallLock $nodeLock
    }

    function Test-PromptfooRuntime {
        if (-not (Test-Path -LiteralPath $promptfooCmd) -or -not (Test-Path -LiteralPath $promptfooMarker)) { return $false }
        if ((Get-Content -LiteralPath $promptfooMarker -Raw).Trim() -ne $expectedPromptfooMarker) { return $false }
        try { & $promptfooCmd --version *> $null; return $LASTEXITCODE -eq 0 } catch { return $false }
    }

    if (Test-PromptfooRuntime) {
        Write-Host "Reusing promptfoo $PromptfooVersion from $promptfooDir"
    } else {
        $promptfooLock = "$promptfooDir.lock"
        New-Item -ItemType Directory -Force -Path (Split-Path -Parent $promptfooDir) | Out-Null
        Enter-InstallLock $promptfooLock
        if (-not (Test-PromptfooRuntime)) {
            Write-Host "Installing promptfoo $PromptfooVersion for $Platform"
            $promptfooArchive = Join-Path $downloadDir "promptfoo-$PromptfooVersion.tgz"
            $promptfooTempArchive = "$promptfooArchive.tmp-$PID"
            Receive-File $PromptfooUrl $promptfooTempArchive
            Assert-Digest $promptfooTempArchive SHA512 $PromptfooSha512
            Move-Item -LiteralPath $promptfooTempArchive -Destination $promptfooArchive -Force
            $promptfooTempDir = "$promptfooDir.tmp-$PID"
            Remove-Item -LiteralPath $promptfooTempDir -Recurse -Force -ErrorAction SilentlyContinue
            New-Item -ItemType Directory -Force -Path $promptfooTempDir | Out-Null
            & $npmCmd install --prefix $promptfooTempDir $promptfooArchive --omit=optional --no-audit --no-fund
            if ($LASTEXITCODE -ne 0) { throw "npm failed to install promptfoo $PromptfooVersion." }
            Set-Content -LiteralPath (Join-Path $promptfooTempDir ".aibeat-runtime") -Value $expectedPromptfooMarker -NoNewline
            Remove-Item -LiteralPath $promptfooDir -Recurse -Force -ErrorAction SilentlyContinue
            Move-Item -LiteralPath $promptfooTempDir -Destination $promptfooDir
            if (-not (Test-PromptfooRuntime)) { throw "promptfoo runtime validation failed." }
        }
        Exit-InstallLock $promptfooLock
    }

    if ($RuntimeOnly) {
        Write-Host "Runtime ready in $(Join-Path $CacheDir 'runtime')"
        exit 0
    }

    $engineDir = Join-Path $InstallDir "versions\$Version\$Platform"
    New-Item -ItemType Directory -Force -Path $engineDir, $BinDir | Out-Null

    function Install-Product([string]$Product, [string]$EngineName) {
        $asset = "$Product-$Version-$Platform.exe"
        $assetUrl = "$ReleaseBase/v$Version/$asset"
        $engine = Join-Path $engineDir $EngineName
        $checksumFile = Join-Path $engineDir "$asset.sha256"
        $expectedEngineSha256 = $null
        if ((Test-Path -LiteralPath $engine) -and (Test-Path -LiteralPath $checksumFile)) {
            $checksumText = Get-Content -LiteralPath $checksumFile -Raw
            $match = [regex]::Match($checksumText, '(?i)[0-9a-f]{64}')
            if ($match.Success -and (Get-Digest $engine SHA256) -eq $match.Value.ToLowerInvariant()) {
                $expectedEngineSha256 = $match.Value.ToLowerInvariant()
            }
        }

        if (-not $expectedEngineSha256) {
            $checksumTemp = "$checksumFile.tmp-$PID"
            Receive-File "$assetUrl.sha256" $checksumTemp
            $match = [regex]::Match((Get-Content -LiteralPath $checksumTemp -Raw), '(?i)[0-9a-f]{64}')
            if (-not $match.Success) { throw "Invalid SHA-256 file for $asset." }
            $expectedEngineSha256 = $match.Value.ToLowerInvariant()
            $engineTemp = "$engine.tmp-$PID"
            Receive-File $assetUrl $engineTemp
            Assert-Digest $engineTemp SHA256 $expectedEngineSha256
            Move-Item -LiteralPath $engineTemp -Destination $engine -Force
            Move-Item -LiteralPath $checksumTemp -Destination $checksumFile -Force
        } else {
            Write-Host "Reusing $Product $Version from $engine"
        }
        return $engine
    }

    $promptbeatEngine = Install-Product "promptbeat" "promptbeat-go.exe"
    $agentbeatEngine = Install-Product "agentbeat" "agentbeat-go.exe"

    $wrapper = Join-Path $BinDir "promptbeat.cmd"
    $wrapperTemp = "$wrapper.tmp-$PID"
    @"
@echo off
setlocal
set "PATH=$nodeDir;$promptfooDir\node_modules\.bin;%PATH%"
if "%PROMPTFOO_CONFIG_DIR%"=="" set "PROMPTFOO_CONFIG_DIR=$CacheDir\promptfoo\config"
if "%PROMPTFOO_LOG_DIR%"=="" set "PROMPTFOO_LOG_DIR=$CacheDir\promptfoo\logs"
if not exist "%PROMPTFOO_CONFIG_DIR%" mkdir "%PROMPTFOO_CONFIG_DIR%"
if not exist "%PROMPTFOO_LOG_DIR%" mkdir "%PROMPTFOO_LOG_DIR%"
"$promptbeatEngine" %*
"@ | Set-Content -LiteralPath $wrapperTemp -Encoding Ascii
    Move-Item -LiteralPath $wrapperTemp -Destination $wrapper -Force

    $agentbeatWrapper = Join-Path $BinDir "agentbeat.cmd"
    $agentbeatWrapperTemp = "$agentbeatWrapper.tmp-$PID"
    @"
@echo off
setlocal
set "PATH=$nodeDir;$promptfooDir\node_modules\.bin;%PATH%"
if "%PROMPTFOO_CONFIG_DIR%"=="" set "PROMPTFOO_CONFIG_DIR=$CacheDir\promptfoo\config"
if "%PROMPTFOO_LOG_DIR%"=="" set "PROMPTFOO_LOG_DIR=$CacheDir\promptfoo\logs"
if not exist "%PROMPTFOO_CONFIG_DIR%" mkdir "%PROMPTFOO_CONFIG_DIR%"
if not exist "%PROMPTFOO_LOG_DIR%" mkdir "%PROMPTFOO_LOG_DIR%"
"$agentbeatEngine" %*
"@ | Set-Content -LiteralPath $agentbeatWrapperTemp -Encoding Ascii
    Move-Item -LiteralPath $agentbeatWrapperTemp -Destination $agentbeatWrapper -Force
    Write-Host "AI Beat $Version installed: $wrapper, $agentbeatWrapper"
    Write-Host "Add $BinDir to PATH to run promptbeat and agentbeat."
} finally {
    if ($script:ActiveLock) { Exit-InstallLock $script:ActiveLock }
}
