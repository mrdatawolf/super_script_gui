<#
.SYNOPSIS
A script to handle the common tasks with client computers

.DESCRIPTION
It will install the base applications we always want and will also uninstall the normal set as well as letting us do optional installed for Ops and Dev computers.

.PARAMETER InstallBaseApps
Install base applications (Firefox, Chrome, Adobe Reader)

.PARAMETER InstallOptionalApps
Install optional applications (SonicWall NetExtender, PowerShell)

.PARAMETER InstallOffice365
Install Microsoft 365 (long download time)

.PARAMETER InstallDevApps
Install developer applications (Git, VSCode, GitHub Desktop, OhMyPosh, NVM)

.PARAMETER UninstallWindowsApps
Uninstall common bloatware Windows applications

.PARAMETER UninstallDellApps
Uninstall Dell-specific applications

.PARAMETER UninstallHPApps
Uninstall HP-specific applications

.PARAMETER UninstallLenovoApps
Uninstall Lenovo-specific applications

.PARAMETER RunUpdates
Update all installed applications

.PARAMETER AdjustPowerSettings
Configure power settings for maximum performance (disable hibernation, sleep, etc.)

.PARAMETER EnablePublicDiscovery
Enable network discovery and file sharing on public networks

.PARAMETER EnableRemoteDesktop
Enable Remote Desktop and install TightVNC

.PARAMETER RemoveNewOutlook
Remove and block the new Outlook app

.EXAMPLE
coreSetup.ps1 -InstallBaseApps -InstallOptionalApps

.EXAMPLE
coreSetup.ps1 -InstallDevApps -UninstallWindowsApps

.NOTES
Requires winget and administrator privileges. Run from Biztech Tools GUI or with elevated PowerShell.
Patrick Moon - 2024
Get the latest version at https://github.com/mrdatawolf/CoreSetup
#>

param(
    [switch]$InstallBaseApps,
    [switch]$InstallOptionalApps,
    [switch]$InstallOffice365,
    [switch]$InstallDevApps,
    [switch]$UninstallWindowsApps,
    [switch]$UninstallDellApps,
    [switch]$UninstallHPApps,
    [switch]$UninstallLenovoApps,
    [switch]$RunUpdates,
    [switch]$AdjustPowerSettings,
    [switch]$EnablePublicDiscovery,
    [switch]$EnableRemoteDesktop,
    [switch]$RemoveNewOutlook
)

# Detect if running in GUI mode (any parameters provided)
$guiMode = $InstallBaseApps -or $InstallOptionalApps -or $InstallOffice365 -or $InstallDevApps -or
           $UninstallWindowsApps -or $UninstallDellApps -or $UninstallHPApps -or $UninstallLenovoApps -or
           $RunUpdates -or $AdjustPowerSettings -or $EnablePublicDiscovery -or $EnableRemoteDesktop -or $RemoveNewOutlook

# Check if we are running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    if ($guiMode) {
        Write-Error "This script must be run with administrator privileges. Please run the GUI as administrator."
        exit 1
    } else {
        # CLI mode - relaunch with elevation
        Start-Process powershell.exe "-File", ($myinvocation.MyCommand.Definition) -Verb RunAs
        exit
    }
}

# List of applications ids to install
$apps = @("Mozilla.Firefox")
$appsScopeRequired = @("Google.Chrome")
$appThatNeedWingetSourceDeclared = @("Adobe Acrobat Reader DC")
$optionalApps = @("SonicWALL.NetExtender", "Microsoft.Powershell")
$optionalAppsWithComplications = @("Microsoft 365")
$devApps = @("git.git", "vscode", "github desktop", "JanDeDobbeleer.OhMyPosh", "nvm-windows")
$remoteAccessApps = @("tightvnc")

# List of applications names to uninstall
$appsToRemove = @(
    "Game Bar",
    "LinkedIn",
    "McAfee Personal Security",
    "Mail and Calendar",
    "Microsoft Family",
    "Movies & TV",
    "MSN Weather",
    "News",
    "Phone Link",
    "Skype",
    "Spotify Music",
    "xbox",
    "Xbox Game Speech Window",
    "Xbox Game Bar Plugin",
    "Xbox Identity Provider",
    "Your Phone",
    "Xbox TCUI"
)
$dellAppsToRemove = @(
    "Dell Command | Update for Windows Universal",
    "Dell Core Services",
    "Dell Customer Connect",
    "Dell Digital Delivery",
    "Dell Digital Delivery Services",
    "Dell Display Manager",
    "Dell Display Manager 2.1",
    "Dell Display Manager 2.2",
    "Dell Display Manager 2.3",
    "Dell Mobile Connect",
    "Dell Optimizer Core",
    "Dell PremierColor",
    "{389E5E66-84BC-4CCF-B0D2-3887E9E2E271}",
    "{16AE9E0C-0E0C-4AD6-82B4-D0F8AB94082F}",
    "Dell Peripheral Manager",
    "Dell SupportAssist",
    "Dell SupportAssist for Dell Update",
    "Dell SupportAssist for Home PCs",
    "Dell SupportAssist OS Recovery Plugin for Dell Update",
    "Dell SupportAssist Remediation",
    "Dell Trusted Device Agent",
    "{2F3E37A4-8F48-465A-813B-1F2964DBEB6A}",
    "Dell Watchdog Timer",
    "Power2Go for Dell",
    "PowerDirector for Dell",
    "DellTypeCStatus",
    "DB6EA5DB.MediaSuiteEssentialsforDell_mcezb6ze687jp",
    "DB6EA5DB.Power2GoforDell_mcezb6ze687jp",
    "DB6EA5DB.PowerDirectorforDell_mcezb6ze687jp",
    "DB6EA5DB.PowerMediaPlayerforDell_mcezb6ze687jp"
)
$hpAppsToRemove = @(
    "HP Audio Switch",
    "HP Documentation",
    "HP JumpStart Bridge",
    "HP JumpStart Launch",
    "HP Support Assistant",
    "HP System Event Utility",
    "HP Sure Run Module",
    "HP One Agent",
    "HP Sure Recover",
    "HP Wolf Security",
    "HP Wolf Security - Console",
    "HP Security Update Service",
    "HP Notifications",
    "HP Insights",
    "HP Connection Optimizer",
    "HP Desktop Support Utilities",
    "HP Easy Clean",
    "HP PC Hardware Diagnostics Windows",
    "HP Privacy Settings",
    "myHP",
    "Poly Lens"
)
$lenovoAppsToRemove = @(
    "Lenovo Vantage",
    "Lenovo System Update",
    "Lenovo Utility",
    "Lenovo Service Bridge",
    "Lenovo Quick Clean",
    "Lenovo Migration Assistant"
)

# Functions
function Invoke-Sanity-Checks {
    # Check if the script is running in PowerShell
    if ($PSVersionTable.PSVersion.Major -lt 5) {
        Write-Output "This script must be run in PowerShell 5 or later."
        exit 1
    }

    # Check if winget is installed
    try {
        $wingetCheck = Get-Command winget -ErrorAction Stop
        Write-Host "✓ Winget is installed" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Winget is not installed or had an error." -ForegroundColor Red
        Write-Host "  Please update 'App Installer' from the Microsoft Store" -ForegroundColor Yellow
        exit 1
    }
}

function Install-App {
    param (
        [Parameter(Mandatory = $true)]
        [string]$app,
        [string]$source,
        [string]$scope
    )

    if ($source -and $scope) {
        winget install $app -s $source --scope $scope --silent --accept-package-agreements --accept-source-agreements
    }
    elseif ($source) {
        winget install $app -s $source --silent --accept-package-agreements --accept-source-agreements
    }
    else {
        winget install $app --silent --accept-package-agreements --accept-source-agreements
    }
}

function Install-Apps {
    param (
        [Parameter(Mandatory = $true)]
        [string[]]$apps,
        [string]$source,
        [string]$scope
    )

    $totalApps = $apps.Count
    for ($i = 0; $i -lt $totalApps; $i++) {
        $app = $apps[$i]
        $percentComplete = [Math]::Floor((($i + 1) / $totalApps) * 100)
        Write-Host "[$percentComplete%] Installing $app..." -ForegroundColor Cyan

        $wingetList = winget list --id $app 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ $app already installed" -ForegroundColor Green
        }
        else {
            Install-App -app $app -source $source -scope $scope
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✓ $app installed successfully" -ForegroundColor Green
            }
            else {
                Write-Host "  ✗ $app failed to install" -ForegroundColor Red
            }
        }
    }
}

function Uninstall-Apps {
    param (
        [Parameter(Mandatory = $true)]
        [string[]]$apps
    )

    $totalApps = $apps.Count
    for ($i = 0; $i -lt $totalApps; $i++) {
        $app = $apps[$i]
        $percentComplete = [Math]::Floor((($i + 1) / $totalApps) * 100)
        Write-Host "[$percentComplete%] Checking $app..." -ForegroundColor Cyan

        # Check if the application is installed
        $wingetList = winget list --name $app 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Uninstalling $app..." -ForegroundColor Yellow
            winget uninstall $app --silent 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✓ $app uninstalled" -ForegroundColor Green
            }
            else {
                Write-Host "  ~ $app uninstall attempted (may require manual removal)" -ForegroundColor Yellow
            }
        }
        else {
            Write-Host "  - $app not installed (skipping)" -ForegroundColor Gray
        }
    }
}

function RunUpdates {
    Write-Host "Updating winget sources..." -ForegroundColor Cyan
    winget source update
    Write-Host "Updating all installed applications..." -ForegroundColor Cyan
    winget update --all --silent --accept-package-agreements --accept-source-agreements
}

function PowerSetup {
    Write-Host "Configuring power settings for maximum performance..." -ForegroundColor Cyan
    powercfg.exe -x -monitor-timeout-ac 0
    powercfg.exe -x -monitor-timeout-dc 0
    powercfg.exe -x -disk-timeout-ac 0
    powercfg.exe -x -disk-timeout-dc 0
    powercfg.exe -x -standby-timeout-ac 0
    powercfg.exe -x -standby-timeout-dc 0
    powercfg.exe -x -hibernate-timeout-ac 0
    powercfg.exe -x -hibernate-timeout-dc 0
    powercfg.exe -h off
    Write-Host "  ✓ Power settings configured" -ForegroundColor Green
}

function DoPublicDiscovery {
    Write-Host "Enabling network discovery on public networks..." -ForegroundColor Cyan
    Set-NetFirewallRule -DisplayGroup "Network Discovery" -Enabled True -Profile Public
    Set-NetFirewallRule -DisplayGroup "File And Printer Sharing" -Enabled True -Profile Public
    Write-Host "  ✓ Public network discovery enabled" -ForegroundColor Green
}

function DoRemoteDesktop {
    Write-Host "Enabling Remote Desktop..." -ForegroundColor Cyan
    Set-ItemProperty -Path 'HKLM:\System\CurrentControlSet\Control\Terminal Server' -name "fDenyTSConnections" -value 0
    Enable-NetFirewallRule -DisplayGroup "Remote Desktop"
    Write-Host "  ✓ Remote Desktop enabled" -ForegroundColor Green
    Write-Host "Installing remote access tools..." -ForegroundColor Cyan
    Install-Apps -apps $remoteAccessApps
}

function RemoveAndBlockNewOutlook {
    Write-Host "Removing and blocking new Outlook..." -ForegroundColor Cyan

    # Path to the registry key
    $regPath = "HKLM:\SOFTWARE\Microsoft\WindowsUpdate\Orchestrator\UScheduler_Oobe"

    # Create the registry key if it doesn't exist
    if (-not (Test-Path $regPath)) {
        New-Item -Path $regPath -Force | Out-Null
    }

    # Set the registry value to block new Outlook
    $propertyName = "BlockedOobeUpdaters"
    $propertyValue = "MS_Outlook"

    try {
        Set-ItemProperty -Path $regPath -Name $propertyName -Value $propertyValue
    } catch {
        New-ItemProperty -Path $regPath -Name $propertyName -Value $propertyValue -PropertyType String -Force | Out-Null
    }

    # Remove the new Outlook app if it's already installed
    $outlookPackage = Get-AppxPackage -Name "Microsoft.OutlookForWindows"
    if ($outlookPackage) {
        Remove-AppxProvisionedPackage -AllUsers -Online -PackageName $outlookPackage.PackageFullName | Out-Null
        Write-Host "  ✓ New Outlook removed and blocked" -ForegroundColor Green
    } else {
        Write-Host "  ✓ New Outlook blocked (was not installed)" -ForegroundColor Green
    }
}

# ============================================
# Main Execution
# ============================================

Write-Host "==============================" -ForegroundColor Cyan
Write-Host "  Core Setup Script" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Run sanity checks
Invoke-Sanity-Checks

# Update winget sources
Write-Host "Updating winget sources..." -ForegroundColor Cyan
winget source update 2>$null
Write-Host ""

# Track if anything was selected
$operationsRun = 0

# Install base applications
if ($InstallBaseApps) {
    $operationsRun++
    Write-Host "=== Installing Base Applications ===" -ForegroundColor Yellow
    Install-Apps -apps $apps
    Write-Host "Installing apps requiring MS Store source..." -ForegroundColor Cyan
    Install-Apps -apps $appThatNeedWingetSourceDeclared -source "msstore"
    Write-Host "Installing apps requiring machine scope..." -ForegroundColor Cyan
    Install-Apps -apps $appsScopeRequired -source "winget" -scope "machine"
    Write-Host ""
}

# Install optional applications
if ($InstallOptionalApps) {
    $operationsRun++
    Write-Host "=== Installing Optional Applications ===" -ForegroundColor Yellow
    Install-Apps -apps $optionalApps
    Write-Host ""
}

# Install Office 365
if ($InstallOffice365) {
    $operationsRun++
    Write-Host "=== Installing Microsoft 365 ===" -ForegroundColor Yellow
    Write-Host "Warning: This may take a long time to download" -ForegroundColor Yellow
    Install-Apps -apps $optionalAppsWithComplications
    Write-Host ""
}

# Install developer applications
if ($InstallDevApps) {
    $operationsRun++
    Write-Host "=== Installing Developer Applications ===" -ForegroundColor Yellow
    Install-Apps -apps $devApps -source "winget"
    Write-Host ""
}

# Uninstall Windows bloatware
if ($UninstallWindowsApps) {
    $operationsRun++
    Write-Host "=== Uninstalling Windows Bloatware ===" -ForegroundColor Yellow
    Uninstall-Apps -apps $appsToRemove
    Write-Host ""
}

# Uninstall Dell apps
if ($UninstallDellApps) {
    $operationsRun++
    Write-Host "=== Uninstalling Dell Applications ===" -ForegroundColor Yellow
    Uninstall-Apps -apps $dellAppsToRemove
    Write-Host ""
}

# Uninstall HP apps
if ($UninstallHPApps) {
    $operationsRun++
    Write-Host "=== Uninstalling HP Applications ===" -ForegroundColor Yellow
    Uninstall-Apps -apps $hpAppsToRemove
    Write-Host ""
}

# Uninstall Lenovo apps
if ($UninstallLenovoApps) {
    $operationsRun++
    Write-Host "=== Uninstalling Lenovo Applications ===" -ForegroundColor Yellow
    Uninstall-Apps -apps $lenovoAppsToRemove
    Write-Host ""
}

# Run updates
if ($RunUpdates) {
    $operationsRun++
    Write-Host "=== Updating Installed Applications ===" -ForegroundColor Yellow
    RunUpdates
    Write-Host ""
}

# Adjust power settings
if ($AdjustPowerSettings) {
    $operationsRun++
    Write-Host "=== Adjusting Power Settings ===" -ForegroundColor Yellow
    PowerSetup
    Write-Host ""
}

# Enable public discovery
if ($EnablePublicDiscovery) {
    $operationsRun++
    Write-Host "=== Enabling Public Network Discovery ===" -ForegroundColor Yellow
    DoPublicDiscovery
    Write-Host ""
}

# Enable remote desktop
if ($EnableRemoteDesktop) {
    $operationsRun++
    Write-Host "=== Enabling Remote Desktop ===" -ForegroundColor Yellow
    DoRemoteDesktop
    Write-Host ""
}

# Remove and block new Outlook
if ($RemoveNewOutlook) {
    $operationsRun++
    Write-Host "=== Removing and Blocking New Outlook ===" -ForegroundColor Yellow
    RemoveAndBlockNewOutlook
    Write-Host ""
}

# Summary
Write-Host "==============================" -ForegroundColor Cyan
if ($operationsRun -gt 0) {
    Write-Host "✓ Completed $operationsRun operation(s)" -ForegroundColor Green
} else {
    Write-Host "No operations selected" -ForegroundColor Yellow
}
Write-Host "==============================" -ForegroundColor Cyan

# Exit cleanly (no pause in GUI mode)
if (-not $guiMode) {
    Pause
}

exit 0
