if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    if ($null -ne $email -and $null -ne $password) {
        $arguments = "-File `"$($myinvocation.MyCommand.Definition)`" -email `"$email`" -password `"$password`" -client `"$client`" -scriptRoot `"$scriptRoot`""
        Start-Process powershell.exe -ArgumentList $arguments -Verb RunAs
    } else {
        $arguments = "-File `"$($myinvocation.MyCommand.Definition)`" -scriptRoot `"$scriptRoot`""
        Start-Process powershell.exe -ArgumentList $arguments -Verb RunAs
    }
    exit
}

function Test-ModuleInstallation {
    param (
        [Parameter(Mandatory=$true)]
        [string]$ModuleName
    )

    if (!(Get-Module -ListAvailable -Name $ModuleName)) {
        Write-Host "The $ModuleName module is not installed. Installing..." -ForegroundColor Yellow
        Install-Module -Name $ModuleName -Force
        
        return $false
    } else {
        Write-Host "Importing $ModuleName..." -ForegroundColor Green
        Import-Module $ModuleName
    }

    return $true
}

function Get-PendingUpdates {
    $updates = Get-WindowsUpdate -NotCategory 'Drivers'
    if ($updates.Count -ge 1) {
        Write-Host "$serverName is not fully updated. Pending updates:" -ForegroundColor Yellow
        $updates | ForEach-Object {
            Write-Host $_.Title -ForegroundColor Cyan
        }
    } else {
        Write-Host "$serverName is up to date" -ForegroundColor Green
    }
}

$modules = @("PSWindowsUpdate")
foreach ($module in $modules) {
    $result = Test-ModuleInstallation -ModuleName $module
    if (-not $result) {
        Write-Host "Please restart the script after installing the required modules." -ForegroundColor Red
        exit
    }
}

$serverName = (Get-WmiObject -Class Win32_ComputerSystem).Name

Get-PendingUpdates

Pause
