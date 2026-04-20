# ============================
# Windows 11 Time Sync Repair
# With UAC Elevation + DNS Check
# ============================

# --- PowerShell 7+ Requirement ---
if ($PSVersionTable.PSVersion.Major -lt 7) {
    $pwshCmd = Get-Command pwsh -ErrorAction SilentlyContinue
    $pwsh = if ($pwshCmd) { $pwshCmd.Source } else { $null }
    if (-not $pwsh) { $pwsh = "$env:ProgramFiles\PowerShell\7\pwsh.exe" }
    if (Test-Path $pwsh) {
        & $pwsh -ExecutionPolicy Bypass -File $PSCommandPath
    } else {
        Write-Host "ERROR: PowerShell 7+ is required but was not found." -ForegroundColor Red
        Write-Host "Please install it from https://aka.ms/pscore6" -ForegroundColor Yellow
    }
    exit
}

Add-Type -AssemblyName System.Windows.Forms

# --- UAC Elevation Check ---
If (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {

    Write-Host "Elevation required. Relaunching as Administrator..." -ForegroundColor Yellow

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "pwsh.exe"
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

$BadDNS = @(
    "fec0:0:0:ffff::1"
    "fec0:0:0:ffff::2"
    "fec0:0:0:ffff::3"
)

$allDns = Get-DnsClientServerAddress -AddressFamily IPv6,IPv4 | Select-Object -ExpandProperty ServerAddresses
$HasBadDNS = ($allDns | Where-Object { $BadDNS -contains $_ } | Sort-Object -Unique)

if ($HasBadDNS) {
    Write-Host "`n⚠️  Deprecated IPv6 placeholder DNS entries detected on one or more adapters:" -ForegroundColor Yellow
    $HasBadDNS | ForEach-Object { Write-Host " - $_" -ForegroundColor Yellow }

    # Test whether DNS actually resolves before deciding to block
    $dnsWorks = $false
    try {
        $resolved = [System.Net.Dns]::GetHostEntry("time.windows.com")
        $dnsWorks = $resolved.AddressList.Count -gt 0
    } catch { }

    if ($dnsWorks) {
        Write-Host "`nDNS resolution is working despite legacy entries — skipping DNS fix." -ForegroundColor Green

        $choice = [System.Windows.Forms.MessageBox]::Show(
            "Deprecated IPv6 DNS entries were found but DNS is resolving correctly.`n`nWould you like to clean them up anyway?",
            "Legacy DNS Entries Found",
            [System.Windows.Forms.MessageBoxButtons]::YesNo,
            [System.Windows.Forms.MessageBoxIcon]::Information
        )
    } else {
        Write-Host "`nDNS resolution is failing — this will prevent time synchronization." -ForegroundColor Red

        $choice = [System.Windows.Forms.MessageBox]::Show(
            "DNS resolution is failing due to deprecated IPv6 placeholder servers.`n`nWould you like the script to fix DNS automatically?",
            "DNS Misconfiguration Detected",
            [System.Windows.Forms.MessageBoxButtons]::YesNo,
            [System.Windows.Forms.MessageBoxIcon]::Warning
        )

        if ($choice -ne [System.Windows.Forms.DialogResult]::Yes) {
            Write-Host "`nTime sync cannot succeed until DNS is fixed." -ForegroundColor Red
            exit
        }
    }

    if ($choice -eq [System.Windows.Forms.DialogResult]::Yes) {
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
} else {
    Write-Host "DNS configuration looks clean." -ForegroundColor Green
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
