# ============================
# Windows 11 Time Sync Repair
# With UAC Elevation + DNS Check
# ============================

# --- UAC Elevation Check ---
If (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {

    Write-Host "Elevation required. Relaunching as Administrator..." -ForegroundColor Yellow

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "powershell.exe"
    $psi.Arguments = "-ExecutionPolicy Bypass -File `"$PSCommandPath`""
    $psi.Verb = "runas"

    try {
        [System.Diagnostics.Process]::Start($psi) | Out-Null
    } catch {
        Write-Host "User declined elevation. Exiting." -ForegroundColor Red
    }

    exit
}

Write-Host "Running with Administrator privileges." -ForegroundColor Green
Write-Host "=== Windows Time Sync Repair Tool ===" -ForegroundColor Cyan


# ============================
# DNS CHECK
# ============================

Write-Host "`nChecking DNS configuration..." -ForegroundColor Cyan

$dns = (Get-DnsClientServerAddress -AddressFamily IPv6,IPv4 | Select-Object -ExpandProperty ServerAddresses)

$BadDNS = @(
    "fec0:0:0:ffff::1"
    "fec0:0:0:ffff::2"
    "fec0:0:0:ffff::3"
)

$HasBadDNS = $dns | Where-Object { $BadDNS -contains $_ }

if ($HasBadDNS) {
    Write-Host "`n⚠️  DNS appears to be misconfigured." -ForegroundColor Yellow
    Write-Host "Your system is using deprecated IPv6 placeholder DNS servers:"
    $HasBadDNS | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }

    Write-Host "`nThis WILL prevent time synchronization because the system cannot resolve NTP servers." -ForegroundColor Red

    $choice = Read-Host "`nWould you like the script to fix DNS automatically? (Y/N)"

    if ($choice -notin @("Y","y")) {
        Write-Host "`nTime sync cannot succeed until DNS is fixed." -ForegroundColor Red
        Write-Host "Press any key to exit..."
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit
    }

    # ============================
    # DNS FIX
    # ============================

    Write-Host "`nFixing DNS..." -ForegroundColor Cyan

    $goodDNSv4 = @("1.1.1.1","8.8.8.8")
    $goodDNSv6 = @("2606:4700:4700::1111","2001:4860:4860::8888")

    $adapters = Get-DnsClient | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" }

    foreach ($adapter in $adapters) {
        Write-Host "Applying DNS to adapter: $($adapter.InterfaceAlias)"
        Set-DnsClientServerAddress -InterfaceAlias $adapter.InterfaceAlias -ServerAddresses ($goodDNSv4 + $goodDNSv6) -ErrorAction SilentlyContinue
    }

    ipconfig /flushdns | Out-Null

    Write-Host "DNS repaired successfully." -ForegroundColor Green
}


# ============================
# TIME SERVICE REPAIR
# ============================

Write-Host "`nRepairing Windows Time service..." -ForegroundColor Cyan

Stop-Service w32time -Force -ErrorAction SilentlyContinue

w32tm /unregister | Out-Null
Start-Sleep -Seconds 2

w32tm /register | Out-Null
Start-Sleep -Seconds 2

Set-Service w32time -StartupType Automatic
Start-Service w32time

$TimeServer = "time.windows.com"
Write-Host "Setting time server to $TimeServer..."
w32tm /config /manualpeerlist:$TimeServer /syncfromflags:manual /reliable:yes /update | Out-Null

Write-Host "Forcing time resync..."
w32tm /resync /force

Write-Host "`n=== Current Time Service Status ==="
w32tm /query /status

Write-Host "`n=== NTP Configuration ==="
w32tm /query /configuration

Write-Host "`nDone. Time sync repair completed." -ForegroundColor Green
