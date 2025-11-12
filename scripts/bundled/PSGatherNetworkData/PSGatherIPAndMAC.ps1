function ConvertTo-Int {
    param (
        [string]$ip
    )
    $bytes = [System.Net.IPAddress]::Parse($ip).GetAddressBytes()
    [Array]::Reverse($bytes)
    return [BitConverter]::ToUInt32($bytes, 0)
}

function ConvertTo-IP {
    param (
        [uint32]$int
    )
    $bytes = [BitConverter]::GetBytes($int)
    [Array]::Reverse($bytes)
    return [System.Net.IPAddress]::new($bytes)
}

function Get-MacAddress {
    param (
        [string]$ipAddress
    )
    $arpOutput = arp -a | Select-String $ipAddress
    if ($arpOutput) {
        $arpParts = $arpOutput -split '\s{2,}'  # Split by two or more spaces
        return $arpParts[2]  # The MAC address should be the second element
    }
    return "N/A"
}
if (-not $scriptRoot) {
    $scriptRoot = $PSScriptRoot
}
$envFilePath = Join-Path -Path $scriptRoot -ChildPath ".env"
if (Test-Path $envFilePath) {
    Get-Content $envFilePath | ForEach-Object {
        if ($_ -match "^\s*([^#][^=]+?)\s*=\s*(.*?)\s*$") {
            [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
        }
    }
} else {
    Write-Host "You need a .env. I will create one with the default location of C:\ChangeMe" -ForegroundColor Red
    # Create the .env file and add the required content
    $envContent = @"
StartIP = "192.168.1.1",
EndIP = "192.168.1.254",
CommunityName = "public",
OutputDir = "C:\ChangeMe"
"@
    Set-Content -Path $envFilePath -Value $envContent
    Write-Host ".env file created with default values." -ForegroundColor Green
    [System.Environment]::SetEnvironmentVariable("StartIP", "192.168.1.1")
    [System.Environment]::SetEnvironmentVariable("EndIP", "192.168.1.254")
    [System.Environment]::SetEnvironmentVariable("OutputDir", "C:\ChangeMe")
}
$startIP = [System.Environment]::GetEnvironmentVariable("StartIP")
$endIP = [System.Environment]::GetEnvironmentVariable("EndIP")
$outputDir = [System.Environment]::GetEnvironmentVariable("OutputDir")
# Define the range of IP addresses
$startIPInt = ConvertTo-Int -ip $startIP
$endIPInt = ConvertTo-Int -ip $endIP

# Initialize an array to store results
$results = @()

# Total number of IPs to scan
$totalIPs = $endIPInt - $startIPInt + 1
$currentIPCount = 0

# Iterate through the IP range
for ($i = $startIPInt; $i -le $endIPInt; $i++) {
    $ipAddress = ConvertTo-IP -int $i

    # Ping the IP address
    $ping = Test-Connection -ComputerName $ipAddress -Count 1 -Quiet

    if ($ping) {
        # Get the MAC address using ARP
        $mac = Get-MacAddress -ipAddress $ipAddress.ToString()
        # Add the result to the array
        $results += [PSCustomObject]@{
            IPAddress = $ipAddress.ToString()
            MACAddress = $mac
        }
    }

    # Update progress
    $currentIPCount++
    Write-Progress -Activity "Pinging IPs" -Status "Processing $ipAddress" -PercentComplete (($currentIPCount / $totalIPs) * 100)
}

$results | Export-Csv -Path "$outputDir\PingResults.csv" -NoTypeInformation
Write-Host "Scanning complete. Results saved to PingResults.csv"
