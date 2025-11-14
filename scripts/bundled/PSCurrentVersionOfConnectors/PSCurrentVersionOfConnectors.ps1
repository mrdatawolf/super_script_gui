<#
.SYNOPSIS
Check Cloudflare tunnel connector versions

.DESCRIPTION
Retrieves information about Cloudflare tunnels and checks for outdated connector versions.
Credentials can be provided via parameters (recommended for GUI) or .env file (for CLI use).

.PARAMETER AuthEmail
Cloudflare account email (overrides .env)

.PARAMETER AuthKey
Cloudflare API key (overrides .env)

.PARAMETER AccountId
Cloudflare account ID (overrides .env)

.PARAMETER ZoneId
Cloudflare zone ID (overrides .env, currently not used by script)

.PARAMETER CurrentVersion
Current/expected connector version to compare against (overrides .env)

.PARAMETER OutputLocation
Output location for data export (overrides .env, currently not used by script)

.PARAMETER More
Show detailed tunnel information grouped by status

.EXAMPLE
PSCurrentVersionOfConnectors.ps1 -More
Uses .env file for credentials and shows detailed output

.EXAMPLE
PSCurrentVersionOfConnectors.ps1 -AuthEmail "user@example.com" -AuthKey "abc123" -AccountId "def456" -CurrentVersion "2025.1.0"
Uses provided parameters instead of .env file

.NOTES
Patrick Moon - 2024
Modified for GUI compatibility - parameters override .env values
#>

param (
    [Parameter(Mandatory=$false)]
    [string]$AuthEmail,

    [Parameter(Mandatory=$false)]
    [string]$AuthKey,

    [Parameter(Mandatory=$false)]
    [string]$AccountId,

    [Parameter(Mandatory=$false)]
    [string]$ZoneId,

    [Parameter(Mandatory=$false)]
    [string]$CurrentVersion,

    [Parameter(Mandatory=$false)]
    [string]$OutputLocation,

    [switch]$More
)

function Load-EnvFile {
    param (
        [string]$envFilePath
    )

    if (-Not (Test-Path $envFilePath)) {
        Write-Output "INFO: No .env file found at: $envFilePath"
        Write-Output "INFO: You can create one with the following format:"
        Write-Output @"
AUTH_EMAIL=your_email
AUTH_KEY=your_api_key
ACCOUNT_ID=your_account_id
ZONE_ID=your_zone_id
OUTPUT_LOCATION=S:\PBIData\Biztech\CloudFlared_Versions
CURRENT_VERSION=2025.1.0
"@
        return $false
    }

    Write-Output "INFO: Loading .env file from: $envFilePath"
    Get-Content $envFilePath | ForEach-Object {
        if ($_ -match "^(.*?)=(.*)$") {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [System.Environment]::SetEnvironmentVariable($key, $value)
        }
    }
    return $true
}

function Check-Login {
    param (
        [string]$authEmail,
        [string]$authKey
    )
    $apiUrl = "https://api.cloudflare.com/client/v4/accounts"
    $headers = @{
        "X-Auth-Email" = $authEmail
        "X-Auth-Key"   = $authKey
        "Content-Type" = "application/json"
    }
    try {
        $response = Invoke-RestMethod -Uri $apiUrl -Method Get -Headers $headers
        if ($response.success) {
            Write-Output "✓ Login successful. Your Account ID is: $($response.result[0].id)"
            return $true
        } else {
            Write-Error "Failed to fetch account details: $($response.errors)"
            return $false
        }
    } catch {
        Write-Error "Exception occurred: $_"
        return $false
    }
}

# Function to get the current connector version
function Get-ConnectorVersion {
    param (
        [string]$apiUrlVersion,
        [hashtable]$headers
    )
    $responseVersion = Invoke-RestMethod -Uri $apiUrlVersion -Method Get -Headers $headers
    if ($responseVersion.success) {
        return $responseVersion.result.version
    } else {
        Write-Output "Failed to retrieve current connector version: $($responseVersion.errors)"
        return $null
    }
}

# Function to get the list of tunnels
function Get-Tunnels {
    param (
        [string]$apiUrlTunnels,
        [hashtable]$headers
    )
    $responseTunnels = Invoke-RestMethod -Uri $apiUrlTunnels -Method Get -Headers $headers
    if ($responseTunnels.success) {
        return $responseTunnels.result
    } else {
        Write-Output "Failed to retrieve tunnels: $($responseTunnels.errors)"
        return $null
    }
}

# Function to group tunnels by status and display them
function Show-TunnelsByStatus {
    param (
        [array]$tunnels
    )
    $groupedTunnels = $tunnels | Group-Object -Property status
    foreach ($group in $groupedTunnels) {
        Write-Output "Status: $($group.Name)"
        foreach ($tunnel in $group.Group) {
            $tunnelName = $tunnel.name
            Write-Output "  $tunnelName"
        }
    }
}

# Function to check if any connector versions are older than the current version and list the tunnel names
function List-OlderVersionTunnels {
    param (
        [array]$tunnels,
        [string]$currentVersion
    )
    $olderVersionTunnels = @()
    foreach ($tunnel in $tunnels) {
        $connectorVersion = $tunnel.connections.client_version
        if ($connectorVersion -lt $currentVersion) {
            $olderVersionTunnels += $tunnel.name
        }
    }
    return $olderVersionTunnels
}

# Determine script directory for .env file location
$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Get-Location }
$envFilePath = Join-Path $scriptDir ".env"

# Load .env file if it exists (values will be used as fallbacks)
$envFileLoaded = Load-EnvFile -envFilePath $envFilePath

# Get credentials - parameters override .env values
$finalAuthEmail = if ($AuthEmail) { $AuthEmail } else { [System.Environment]::GetEnvironmentVariable("AUTH_EMAIL") }
$finalAuthKey = if ($AuthKey) { $AuthKey } else { [System.Environment]::GetEnvironmentVariable("AUTH_KEY") }
$finalAccountId = if ($AccountId) { $AccountId } else { [System.Environment]::GetEnvironmentVariable("ACCOUNT_ID") }
$finalZoneId = if ($ZoneId) { $ZoneId } else { [System.Environment]::GetEnvironmentVariable("ZONE_ID") }
$finalCurrentVersion = if ($CurrentVersion) { $CurrentVersion } else { [System.Environment]::GetEnvironmentVariable("CURRENT_VERSION") }
$finalOutputLocation = if ($OutputLocation) { $OutputLocation } else { [System.Environment]::GetEnvironmentVariable("OUTPUT_LOCATION") }

# Validate required credentials
$missingCredentials = @()
if (-not $finalAuthEmail) { $missingCredentials += "AUTH_EMAIL" }
if (-not $finalAuthKey) { $missingCredentials += "AUTH_KEY" }
if (-not $finalAccountId) { $missingCredentials += "ACCOUNT_ID" }

if ($missingCredentials.Count -gt 0) {
    Write-Error "Missing required credentials: $($missingCredentials -join ', ')"
    Write-Error "Please provide them via parameters or create a .env file at: $envFilePath"
    exit 1
}

if (-not $finalCurrentVersion) {
    Write-Output "WARNING: CURRENT_VERSION not set. Version comparison will be skipped."
}

# Check login
Write-Output "Authenticating with Cloudflare API..."
if (-not (Check-Login -authEmail $finalAuthEmail -authKey $finalAuthKey)) {
    Write-Error "Login failed. Please check your credentials."
    exit 1
}

# Define the API URLs
$apiUrlTunnels = "https://api.cloudflare.com/client/v4/accounts/$finalAccountId/cfd_tunnel"
$apiUrlVersion = "https://api.cloudflare.com/client/v4/accounts/$finalAccountId/cfd_tunnel/version"
$headers = @{
    "X-Auth-Email" = $finalAuthEmail
    "X-Auth-Key"   = $finalAuthKey
    "Content-Type" = "application/json"
}

if ($finalCurrentVersion) {
    Write-Output ""
    Write-Output "Current Connector Version: $finalCurrentVersion"
}

Write-Output ""
Write-Output "Fetching tunnels..."
$tunnels = Get-Tunnels -apiUrlTunnels $apiUrlTunnels -headers $headers

if ($tunnels) {
    Write-Output "Number of tunnels: $($tunnels.Count)"
    Write-Output ""

    if ($More) {
        Show-TunnelsByStatus -tunnels $tunnels
        Write-Output ""
    }

    # List tunnels with older versions
    if ($finalCurrentVersion) {
        $olderVersionTunnels = List-OlderVersionTunnels -tunnels $tunnels -currentVersion $finalCurrentVersion
        if ($olderVersionTunnels.Count -gt 0) {
            Write-Output "Tunnels with older connector versions:"
            $olderVersionTunnels | ForEach-Object { Write-Output "  $_" }
        } else {
            Write-Output "✓ No tunnels with older connector versions found. All tunnels are up to date!"
        }
    }
} else {
    Write-Output "No tunnels found or failed to retrieve tunnels."
    exit 1
}

Write-Output ""
Write-Output "✓ Script completed successfully"
exit 0
