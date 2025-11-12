Write-Host "Stopping Services..." -ForegroundColor Yellow
net stop wuauserv
net stop cryptSvc
net stop bits
net stop msiserver
Write-Host "Removing cruft..." -ForegroundColor Yellow
Remove-Item -Path "$env:ALLUSERSPROFILE\Application Data\Microsoft\Network\Downloader\qmgr*.dat" -Recurse -Force
Remove-Item -Path "$env:SystemRoot\SoftwareDistribution\*" -Recurse -Force
Remove-Item -Path "$env:SystemRoot\system32\catroot2\*" -Recurse -Force
Remove-Item -Path "$env:SystemRoot\WindowsUpdate.log" -Force
Write-Host "Starting Services..." -ForegroundColor Green
net start wuauserv
net start cryptSvc
net start bits
net start msiserver 
Write-Host "Done" -ForegroundColor Green
Pause