# Setup Instructions

## Current Issue

There appears to be an Electron installation issue on this Windows environment. The Electron binary is not properly loading the Electron API modules.

## Troubleshooting Steps

### Option 1: Clean Reinstall on Different Machine

Try setting up on a different Windows machine with fresh Node.js installation:

```bash
# Clone the repository
git clone https://github.com/mrdatawolf/super_script_gui
cd super_script_gui

# Install dependencies
npm install

# Run the application
npm start
```

### Option 2: Try Different Electron Version

Edit `package.json` and try different Electron versions:

```json
"devDependencies": {
  "electron": "^25.9.8",  // Or try 26, 27, etc.
  "electron-builder": "^24.9.0"
}
```

Then:
```bash
npm install
npm start
```

### Option 3: Use WSL2 (Windows Subsystem for Linux)

If the issue persists on Windows, you can try running in WSL2:

```bash
# In WSL2 terminal
npm install
DISPLAY=:0 npm start  # Requires X server on Windows
```

## Adding Your Scripts

### Manual Method (Recommended Until GitHub API Works)

1. Download each repository from GitHub:
   - CoreSetup
   - PSGatherDNSInfo
   - PSNewUser
   - PSGPOGather
   - PSGetPatchHealth
   - PSGatherNetworkData
   - PSGatherComputerInfo
   - PSDisableAndClearShadowCopyOnC

2. Find the main PowerShell script in each repository

3. Place them in the appropriate directory:
   ```
   scripts/bundled/[RepoName]/[ScriptFile.ps1]
   ```

Example:
```
scripts/bundled/CoreSetup/CoreSetup.ps1
scripts/bundled/PSGatherDNSInfo/Get-DNSInfo.ps1
...
```

### Automatic Method

Once GitHub rate limits reset:
```bash
node download-scripts.js
```

## Building the .exe

Once the application runs successfully:

```bash
npm run build:win
```

The executable will be in `dist/` directory.

## Configuringadditional Scripts

Edit `scripts/scripts-config.json` to add more scripts. Each script needs:

```json
{
  "name": "Display Name",
  "repo": "GitHubRepoName",
  "file": "ScriptFileName.ps1",
  "description": "What the script does",
  "githubUrl": "https://github.com/mrdatawolf/RepoName",
  "parameters": [
    {
      "name": "ParameterName",
      "label": "Display Label",
      "type": "text",  // or "number", "switch", "select", "email"
      "required": true,
      "placeholder": "Example value",
      "description": "Help text"
    }
  ]
}
```

## Known Issues

1. **Electron Module Loading**: The current environment has issues loading Electron modules
   - Symptom: `Cannot read properties of undefined (reading 'whenReady')`
   - Potential causes: Node/Electron version mismatch, Windows environment issues, PATH problems

2. **GitHub Rate Limiting**: Limited to 60 requests/hour without authentication
   - Solution: Add GitHub Personal Access Token to `src/github-service.js`

## Next Steps

1. Get Electron running properly
2. Test the GUI with actual scripts
3. Build the .exe file
4. Test script execution
5. Deploy to users
