# Build script for Windows (PowerShell)
# Usage: .\build.ps1 -targets windows/amd64,linux/amd64
param(
  [string[]]$targets = @("windows/amd64"),
  [string]$outputDir = "dist"
)

if (!(Test-Path $outputDir)) { New-Item -ItemType Directory -Path $outputDir | Out-Null }

foreach ($t in $targets) {
  $parts = $t -split "/"
  $goos = $parts[0]
  $goarch = $parts[1]
  $ext = ""
  if ($goos -eq "windows") { $ext = ".exe" }
  $name = "anyrun-$goos-$goarch$ext"
  Write-Host "Building $name..."
  $env:GOOS = $goos
  $env:GOARCH = $goarch
  go build -ldflags "-s -w" -o "$outputDir/$name" .
  if ($LASTEXITCODE -ne 0) { Write-Host "Build failed for $t"; exit $LASTEXITCODE }
}

Write-Host "Builds placed in $outputDir"