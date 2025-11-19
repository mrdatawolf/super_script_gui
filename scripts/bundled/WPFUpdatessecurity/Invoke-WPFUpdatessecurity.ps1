<#
.SYNOPSIS
    Sets Windows Update to recommended settings

.DESCRIPTION
    Configurable Windows Update security settings:
    1. Disables driver offering through Windows Update
    2. Disables Windows Update automatic restart
    3. Defers feature updates for 365 days
    4. Defers quality updates for 4 days

.NOTES
    Requires Administrator privileges
    Based on ChrisTitusTech's WinUtil
#>

param(
    [Parameter(Mandatory=$false)]
    [switch]$DisableDriverUpdates,

    [Parameter(Mandatory=$false)]
    [switch]$DisableAutoRestart,

    [Parameter(Mandatory=$false)]
    [switch]$DeferFeatureUpdates,

    [Parameter(Mandatory=$false)]
    [switch]$DeferQualityUpdates
)

# Require Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Error "This script requires administrator privileges."
    exit 1
}

# Check if at least one option is selected
if (-not ($DisableDriverUpdates -or $DisableAutoRestart -or $DeferFeatureUpdates -or $DeferQualityUpdates)) {
    Write-Output "⚠️  No options selected. Please select at least one setting to apply."
    exit 0
}

Write-Output "========================================="
Write-Output "  Windows Update Security Settings"
Write-Output "========================================="
Write-Output ""

# 1. Disable Driver Updates
if ($DisableDriverUpdates) {
    Write-Output "→ Disabling driver offering through Windows Update..."
    If (!(Test-Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Device Metadata")) {
        New-Item -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Device Metadata" -Force | Out-Null
    }
    Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Device Metadata" -Name "PreventDeviceMetadataFromNetwork" -Type DWord -Value 1
    If (!(Test-Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DriverSearching")) {
        New-Item -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DriverSearching" -Force | Out-Null
    }
    Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DriverSearching" -Name "DontPromptForWindowsUpdate" -Type DWord -Value 1
    Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DriverSearching" -Name "DontSearchWindowsUpdate" -Type DWord -Value 1
    Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DriverSearching" -Name "DriverUpdateWizardWuSearchEnabled" -Type DWord -Value 0
    If (!(Test-Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate")) {
        New-Item -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate" | Out-Null
    }
    Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate" -Name "ExcludeWUDriversInQualityUpdate" -Type DWord -Value 1
    Write-Output "  ✓ Driver updates disabled"
    Write-Output ""
}

# 2. Disable Auto Restart
if ($DisableAutoRestart) {
    Write-Output "→ Disabling Windows Update automatic restart..."
    If (!(Test-Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU")) {
        New-Item -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" -Force | Out-Null
    }
    Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" -Name "NoAutoRebootWithLoggedOnUsers" -Type DWord -Value 1
    Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" -Name "AUPowerManagement" -Type DWord -Value 0
    Write-Output "  ✓ Automatic restart disabled"
    Write-Output ""
}

# 3. Defer Feature Updates
if ($DeferFeatureUpdates) {
    Write-Output "→ Deferring feature updates (365 days)..."
    If (!(Test-Path "HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings")) {
        New-Item -Path "HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings" -Force | Out-Null
    }
    Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings" -Name "BranchReadinessLevel" -Type DWord -Value 20
    Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings" -Name "DeferFeatureUpdatesPeriodInDays" -Type DWord -Value 365
    Write-Output "  ✓ Feature updates deferred: 365 days"
    Write-Output ""
}

# 4. Defer Quality Updates
if ($DeferQualityUpdates) {
    Write-Output "→ Deferring quality updates (4 days)..."
    If (!(Test-Path "HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings")) {
        New-Item -Path "HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings" -Force | Out-Null
    }
    Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings" -Name "DeferQualityUpdatesPeriodInDays" -Type DWord -Value 4
    Write-Output "  ✓ Quality updates deferred: 4 days"
    Write-Output ""
}

# Summary
Write-Output "========================================="
Write-Output "✓ Windows Update settings configured!"
Write-Output "========================================="
Write-Output ""
Write-Output "Settings applied:"
if ($DisableDriverUpdates) { Write-Output "  • Driver updates: Disabled" }
if ($DisableAutoRestart) { Write-Output "  • Auto restart: Disabled" }
if ($DeferFeatureUpdates) { Write-Output "  • Feature update deferral: 365 days" }
if ($DeferQualityUpdates) { Write-Output "  • Quality update deferral: 4 days" }
