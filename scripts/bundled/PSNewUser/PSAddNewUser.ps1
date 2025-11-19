<#
.SYNOPSIS
Calls an advanced function to streamline New-ADUser creation by individual user or multiple users.
 
.DESCRIPTION
This is not mine.  It comes from https://www.reddit.com/r/PowerShell/comments/1hghpg7/i_recently_updated_my_user_creation_script_after/
This CMDlet is designed to prompt for each required parameter field dictated by the Domain Admin. It is also designed to take input by csv. 
It also adds the parameter 'Groups' and 'SourceUser' which will allow you to copy the memberships from a Source User, or add a specific Group(s). The password for the account is supplied by a random password generator and is shown in the console and copied to the clipboard.
.PARAMETER FirstName
Passes the Firstname to Given Name, Name, and SamAccountName
.PARAMETER LastName
Passes LastName to Surname, Name, and SamAccountName
.PARAMETER SourceUser
Passes details from the source user account like the Path, Title, Email and Department to directly place them into the new users info.
.PARAMETER Groups
Passes specific groups to be added to the new user that are outside the scope of the Sourceuser.
.EXAMPLE
Will prompt each mandatory parameter (which is all except Groups).
PS> New-CADUser
.EXAMPLE
Add multiple users from a CSV with all mandatory parameters included.
PS> Import-CSV .\users.csv | foreach-object {New-CADUser}
#>

function New-CADUser {
    [CMDletBinding(SupportsShouldProcess)]
    param(
        [Parameter(
            Mandatory=$True,
            ValueFromPipeline=$True,
            ValueFromPipelinebyPropertyName=$True
        )]
        [string]$FirstName,
        [Parameter(
            Mandatory=$True,
            ValueFromPipeline=$True,
            ValueFromPipelinebyPropertyName=$True
        )]
        [string]$LastName,
        [Parameter(
            Mandatory=$True,
            ValueFromPipeline=$True,
            ValueFromPipelinebyPropertyName=$True
        )]
        [string]$SourceUser,
    [Parameter(
            Mandatory=$False,
            ValueFromPipeline=$True,
            ValueFromPipelinebyPropertyName=$True
        )]
        [array]$Groups
    )
    try {
        $spw = Invoke-RandomPassword -Length 10 | Tee-Object -Variable pw | ConvertTo-SecureString -AsPlainText -Force #Converts the pw to a securestring
        $SourceUserInfo = Get-ADUser -Identity $SourceUser -Properties Title,Department,Emailaddress #Applies the SourceUserInfo to progagate the Title, Department, and Path.
        $SourceDistinguishedName = (($SourceUserInfo.Distinguishedname).split(',')) #Calls the DistinguishedName of the SourceUser to a variable and splits each section into objects
        $First, $Rest = $SourceDistinguishedName #assigns the CN entry to the first variable and assigns the rest to the rest variable
        $Path = $Rest -join ',' #loads the remaining objects and rejoins them to use as a path for the new user
        $FirstLast = $FirstName[0] + $LastName #Joins the first letter of firstname and lastname
        $userparam = @{
            Name            = $FirstLast
            SamAccountName  = $FirstLast
            GivenName       = $FirstName
            Surname         = $LastName
            Title           = $SourceUserInfo.Title
            Department      = $SourceUserInfo.Department
            Path            = $Path
            Email           = "$($FirstLast)@$($SourceUserinfo.Emailaddress.split('@')[1])"
            AccountPassword = $spw
            Enabled         = $true
        }
        $NewUser = New-ADUser @userParam -ErrorAction Stop #Actual use of New-ADUser with all parameters
        Write-Host "Created user account for '$FirstLast'"
        $Sourceusergroups = Get-ADPrincipalGroupMembership -Identity $SourceUser | Select-Object -ExpandProperty SamAccountName | Where-Object -FilterScript {"$_ -notlike 'Domain Users'"} #Creates a joined string of all of the groups the SourceUser is a member of.
        foreach ($sourceusergroup in $sourceusergroups) {
            try {
                    Add-ADPrincipalGroupMembership -Identity $FirstLast -MemberOf $_ -ErrorAction Continue
                    Write-Verbose "Group '$Sourceusergroup' added to user '$FirstLast' from the source user '$sourceuser'."
            } #adds groups from the source user
            catch {
                    Write-Error "Unable to add group '$sourceusergroup' to user '$FirstLast' from source user '$sourceuser'. : $_"
            }
        }
        if ($Groups) { #checks for values in groups# 
            foreach ($group in $groups) {
                    try {
                            Add-ADPrincipalGroupMembership -Identity $FirstLast -MemberOf $Group -ErrorAction Continue #allows for seperatre groups to be added
                            Write-Verbose "Group '$group' added to user '$FirstLast'."
                    }
                    catch {
                            Write-Error "Unable to add group '$group' to user '$FirstLast'. : $_"
                    }
            }
        }
    }
    catch {
            Write-Error "Unable to create user account for '$FirstLast'. : $_"
    }
    finally {
            Write-Output $NewUser # writes the output of the user properties
            $pw | clip #passes the password to the clipboard
    }
}
