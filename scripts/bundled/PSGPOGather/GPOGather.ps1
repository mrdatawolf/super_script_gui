# Check if running on an Active Directory server
$osInfo = Get-CimInstance -ClassName Win32_OperatingSystem
if ($osInfo.ProductType -ne 2) {
    Write-Host "This script must be run on an Active Directory server." -ForegroundColor Red
    exit
}
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
# Load the System.DirectoryServices assembly
try {
    Add-Type -AssemblyName "System.DirectoryServices"
} catch {
    Write-Host "Failed to load System.DirectoryServices assembly. Please ensure it is installed." -ForegroundColor Red
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

function Get-GPOsAndOUs { # Function to get GPOs and their linked OUs using LDAP
    try {
        $domain = [System.DirectoryServices.ActiveDirectory.Domain]::GetCurrentDomain()
        $searcher = New-Object DirectoryServices.DirectorySearcher([ADSI]"LDAP://$($domain.Name)")
    } catch {
        Write-Host "Failed to connect to the domain. Please ensure you are connected to the network and have the necessary permissions." -ForegroundColor Red
        exit
    }

    $searcher.Filter = "(objectClass=groupPolicyContainer)"
    $searcher.SearchScope = "Subtree"
    $searcher.PropertiesToLoad.Add("displayName")
    $searcher.PropertiesToLoad.Add("gPCFileSysPath")
    $searcher.PropertiesToLoad.Add("distinguishedName")

    $results = @() # Initialize the array properly
    $entries = $searcher.FindAll()
    if ($entries.Count -eq 0) {
        Write-Host "No GPOs found." -ForegroundColor Yellow
    } else {
        Write-Host "$($entries.Count) GPOs found." -ForegroundColor Green
    }

    foreach ($entry in $entries) {
        $gpo = $entry.Properties
    
        $gpoName = if ($gpo.displayname) { $gpo.displayname[0] } else { "No displayName" }
        $gpoPath = if ($gpo.gpcfilesyspath) { $gpo.gpcfilesyspath[0] } else { "No gPCFileSysPath" }
        $gpoDN = if ($gpo.distinguishedname) { $gpo.distinguishedname[0] } else { "No distinguishedName" }
    
        $ouNames = @()
        if ($gpoDN -ne "No distinguishedName") {
            $ouSearcher = New-Object DirectoryServices.DirectorySearcher([ADSI]"LDAP://$($domain.Name)")
            $ouSearcher.Filter = "(gplink=*$gpoDN*)"
            $ouSearcher.SearchScope = "Subtree"
            $ouSearcher.PropertiesToLoad.Add("name")
            $ouSearcher.PropertiesToLoad.Add("distinguishedName")
            $ouSearcher.PropertiesToLoad.Add("gplink")
            $ouEntries = $ouSearcher.FindAll()
            $gpoGUID = $gpoDN -match 'CN=\{([0-9A-F-]+)\}' | Out-Null; $matches[1]
            foreach ($ouEntry in $ouEntries) {
                $ou = $ouEntry.Properties
                $ouName = if ($ou.name) { $ou.name[0] } else { "No name" }
                $ouDN = if ($ou.distinguishedname) { $ou.distinguishedname[0] } else { "No distinguishedName" }
                $ouGPLink = if ($ou.gplink) { $ou.gplink[0] } else { "No gplink" }
                # Check if gplink contains the GPO GUID
                if ($ouGPLink -like "*$gpoGUID*") {
                    $ouNames += $ouName
                }
            }
        }
        $computerName = $env:COMPUTERNAME
        $domainName = (Get-WmiObject Win32_ComputerSystem).Domain
        $ouNamesString = $ouNames -join "; "
        if ($gpoName -ne "No displayName" -and $gpoPath -ne "No gPCFileSysPath" -and $gpoDN -ne "No distinguishedName") {
            $results += [PSCustomObject]@{
                DomainName = $domainName
                ComputerName = $computerName
                GPOName = $gpoName
                GPOPath = $gpoPath
                GPODistinguishedName = $gpoDN
                OUs = $ouNamesString
            }
        }
    }
    return $results
}
function Write-ToSQLite {
    param (
        [Parameter(Mandatory=$true)]
        [string]$DatabasePath,
        [Parameter(Mandatory=$true)]
        [array]$Data
    )

    # Create a new SQLite connection
    $connection = New-Object System.Data.SQLite.SQLiteConnection("Data Source=$DatabasePath;Version=3;")
    $connection.Open()

    # Create the table if it doesn't exist
    $command = $connection.CreateCommand()
    $command.CommandText = @"
CREATE TABLE IF NOT EXISTS GPOs (
    DomainName TEXT,
    ComputerName TEXT,
    GPOName TEXT,
    GPOPath TEXT,
    GPODistinguishedName TEXT,
    OUs TEXT
);
"@
    $command.ExecuteNonQuery() | Out-Null

    # Insert data into the table
    foreach ($row in $Data) {
        $command.CommandText = "INSERT INTO GPOs (DomainName, ComputerName, GPOName, GPOPath, GPODistinguishedName, OUs) VALUES ('$($row.DomainName)', '$($row.ComputerName)','$($row.GPOName)', '$($row.GPOPath)', '$($row.GPODistinguishedName)', '$($row.OUs)');"
        $command.ExecuteNonQuery() | Out-Null
    }

    # Close the connection
    $connection.Close()
}
$modules = @("sqlite")
foreach ($module in $modules) {
    $result = Test-ModuleInstallation -ModuleName $module
    if (-not $result) {
        Write-Host "Please restart the script after installing the required modules." -ForegroundColor Red
        exit
    }
}

$results = Get-GPOsAndOUs
if ($results.Count -eq 0) {
    Write-Host "No results to export." -ForegroundColor Yellow
} else {
    Write-Host "Results to export:" -ForegroundColor Green
    # Filter the $results array
    $filteredResults = $results | Where-Object { $_.GPOName -ne $null -and $_.GPOName -ne "" }
    # Display the filtered results
    $filteredResults | Format-Table -AutoSize
    # Write the filtered results to a SQLite database
    Write-ToSQLite -DatabasePath "C:\Temp\Database.sqlite" -Data $filteredResults
}
Pause