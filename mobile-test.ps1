param(
    [string]$Mode = "preview",
    [string]$Port = "3000"
)

Write-Host "Mobile Testing Tool" -ForegroundColor Cyan

function Show-QRCode {
    param([string]$Url)
    Write-Host ""
    Write-Host "SCAN QR CODE WITH PHONE:" -ForegroundColor Yellow
    npx qrcode-terminal $Url
    Write-Host ""
    Write-Host "Or open: $Url" -ForegroundColor Green
}

function Test-PreviewDeployment {
    Write-Host ""
    Write-Host "Fetching preview deployment..." -ForegroundColor Yellow
    Set-Location "C:\Users\DELL\uibac"
    $previewUrl = vercel list --all --environment preview 2>&1 | Select-String "https://" | Select-Object -First 1
    if ($previewUrl) {
        $url = $previewUrl.ToString().Trim()
        Write-Host "Preview URL: $url" -ForegroundColor Green
        Show-QRCode -Url $url
    } else {
        Write-Host "No preview deployment found" -ForegroundColor Red
    }
}

function Test-Localhost {
    param([string]$Port)
    Write-Host ""
    Write-Host "Testing localhost:$Port" -ForegroundColor Yellow
    $portCheck = netstat -ano | Select-String ":$Port"
    if ($portCheck) {
        Write-Host "Local server running on port $Port" -ForegroundColor Green
        $localIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike "*Virtual*"} | Select-Object -First 1).IPAddress
        $localUrl = "http://" + $localIp + ":" + $Port
        Write-Host "On same WiFi: $localUrl" -ForegroundColor Green
        Show-QRCode -Url $localUrl
        Write-Host ""
        Write-Host "Starting ngrok tunnel..." -ForegroundColor Yellow
        ngrok http $Port
    } else {
        Write-Host "Local server not running" -ForegroundColor Red
        Write-Host "Start with: npm run dev" -ForegroundColor Yellow
    }
}

function Test-Production {
    Write-Host ""
    Write-Host "Testing production..." -ForegroundColor Yellow
    $prodUrl = "https://uibac.vercel.app"
    try {
        $response = Invoke-WebRequest -Uri $prodUrl -UseBasicParsing -TimeoutSec 5
        Write-Host "Production is live" -ForegroundColor Green
        Show-QRCode -Url $prodUrl
    } catch {
        Write-Host "Production unreachable" -ForegroundColor Red
    }
}

switch ($Mode) {
    "preview" { Test-PreviewDeployment }
    "local" { Test-Localhost -Port $Port }
    "production" { Test-Production }
    default {
        Write-Host "Usage: .\mobile-test.ps1 -Mode [preview|local|production]"
    }
}
