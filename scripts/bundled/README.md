# Bundled Scripts

This directory contains the default bundled versions of PowerShell scripts that the Super Script GUI can execute.

## Initial Setup

Since these repositories may be private or have specific structures, you'll need to manually place the scripts here:

### Required Scripts:

1. **CoreSetup/CoreSetup.ps1** - From https://github.com/mrdatawolf/CoreSetup
2. **PSGatherDNSInfo/Get-DNSInfo.ps1** - From https://github.com/mrdatawolf/PSGatherDNSInfo
3. **PSNewUser/New-DomainUser.ps1** - From https://github.com/mrdatawolf/PSNewUser
4. **PSGPOGather/Get-GPOReport.ps1** - From https://github.com/mrdatawolf/PSGPOGather
5. **PSGetPatchHealth/Get-PatchHealth.ps1** - From https://github.com/mrdatawolf/PSGetPatchHealth
6. **PSGatherNetworkData/Get-NetworkData.ps1** - From https://github.com/mrdatawolf/PSGatherNetworkData
7. **PSGatherComputerInfo/Get-ComputerInfo.ps1** - From https://github.com/mrdatawolf/PSGatherComputerInfo
8. **PSDisableAndClearShadowCopyOnC/Disable-ShadowCopyC.ps1** - From https://github.com/mrdatawolf/PSDisableAndClearShadowCopyOnC

### How to Add Scripts:

1. Clone or download each repository from GitHub
2. Find the main PowerShell script file(s)
3. Copy them to the appropriate directory listed above
4. Ensure the filename matches what's in the config

### Automatic Download:

You can also use the built-in update feature in the GUI:
- Click on a script
- Look for the "Update from GitHub" button (if available)
- The app will attempt to download the latest version

Alternatively, run: `node download-scripts.js` from the project root to attempt bulk download.
