const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const GitHubService = require('./github-service');

let mainWindow;
const githubService = new GitHubService();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers

// Get list of available scripts
ipcMain.handle('get-scripts', async () => {
  try {
    const configPath = path.join(__dirname, '../scripts/scripts-config.json');
    const data = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading scripts config:', error);
    return { scripts: [] };
  }
});

// Execute PowerShell script
ipcMain.handle('execute-script', async (event, scriptInfo, parameters) => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '../scripts/bundled', scriptInfo.repo, scriptInfo.file);

    // Build PowerShell command with parameters
    let psCommand = `& "${scriptPath}"`;

    // Add parameters
    if (parameters && Object.keys(parameters).length > 0) {
      for (const [key, value] of Object.entries(parameters)) {
        if (value !== null && value !== undefined && value !== '') {
          // Handle boolean switches
          if (typeof value === 'boolean') {
            if (value) {
              psCommand += ` -${key}`;
            }
          } else {
            // Escape quotes in string values
            const escapedValue = String(value).replace(/"/g, '`"');
            psCommand += ` -${key} "${escapedValue}"`;
          }
        }
      }
    }

    console.log('Executing PowerShell command:', psCommand);

    const powershell = spawn('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy', 'Bypass',
      '-Command', psCommand
    ]);

    let output = '';
    let errorOutput = '';
    let allErrorOutput = ''; // Collect ALL errors for detection, even filtered ones

    powershell.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      // Stream output back to renderer
      event.sender.send('script-output', { type: 'stdout', data: chunk });
    });

    powershell.stderr.on('data', (data) => {
      const chunk = data.toString();
      allErrorOutput += chunk; // Always collect for error detection

      // Filter out errors that we provide helpful messages for
      const isReadHostError = chunk.includes('Read-Host') ||
                              chunk.includes('NonInteractive mode') ||
                              chunk.includes('PSInvalidOperationException') ||
                              chunk.includes('InvalidOperation,Microsoft.PowerShell.Commands.ReadHostCommand');

      const isAuthorizationError = chunk.includes('AuthorizationManager') ||
                                   chunk.includes('UnauthorizedAccess') ||
                                   chunk.includes('PSSecurityException');

      const isExecutionPolicyError = chunk.includes('execution policy') ||
                                     chunk.includes('ExecutionPolicy');

      // Only show errors we don't have helpful messages for
      if (!isReadHostError && !isAuthorizationError && !isExecutionPolicyError) {
        errorOutput += chunk;
        event.sender.send('script-output', { type: 'stderr', data: chunk });
      }
    });

    powershell.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output, exitCode: code });
      } else {
        // Check for common errors and provide helpful guidance
        // Use allErrorOutput for detection (includes filtered errors)
        let helpMessage = '';

        // Check for "downloaded file blocked" error
        if (allErrorOutput.includes('AuthorizationManager check failed') ||
            allErrorOutput.includes('UnauthorizedAccess')) {
          helpMessage = '\n\n⚠️  SCRIPT BLOCKED BY WINDOWS SECURITY\n\n' +
                       'Windows has blocked this script because it was downloaded from the internet.\n\n' +
                       'To fix this:\n' +
                       '1. Right-click the script file in Windows Explorer:\n' +
                       `   ${scriptPath}\n` +
                       '2. Select "Properties"\n' +
                       '3. Check the "Unblock" box at the bottom\n' +
                       '4. Click "OK"\n' +
                       '5. Try running the script again\n\n' +
                       'OR run this PowerShell command to unblock all scripts:\n' +
                       `   Unblock-File -Path "${path.join(__dirname, '../scripts/bundled', scriptInfo.repo, '*.ps1')}"\n`;
        }

        // Check for winget license acceptance needed
        const combinedOutput = output + allErrorOutput;
        if (combinedOutput.includes('accept the source agreements') ||
            combinedOutput.includes('msstore source agreement') ||
            combinedOutput.includes('accept source agreement') ||
            combinedOutput.includes('Terms of Transaction')) {
          helpMessage += '\n\n⚠️  WINGET LICENSE AGREEMENT REQUIRED\n\n' +
                        'Winget requires you to accept the license agreement on first use.\n\n' +
                        'To fix this:\n' +
                        '1. Open PowerShell or Command Prompt\n' +
                        '2. Run this command:\n' +
                        '   winget list\n' +
                        '3. When prompted, press "Y" to accept the source agreements\n' +
                        '4. Try running this script again\n\n' +
                        'OR run this to accept all agreements automatically:\n' +
                        '   winget list --accept-source-agreements\n';
        }

        // Check for execution policy errors (though we use -ExecutionPolicy Bypass)
        if (allErrorOutput.includes('execution policy') ||
            allErrorOutput.includes('ExecutionPolicy') ||
            combinedOutput.includes('cannot be loaded because running scripts is disabled')) {
          helpMessage += '\n\n⚠️  POWERSHELL EXECUTION POLICY RESTRICTION\n\n' +
                        'PowerShell is blocking script execution on this system.\n\n' +
                        'To fix this permanently:\n' +
                        '1. Open PowerShell as Administrator\n' +
                        '2. Run this command:\n' +
                        '   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned\n' +
                        '3. Press "Y" to confirm\n' +
                        '4. Close and reopen this application\n\n' +
                        'OR for less restrictive (use with caution):\n' +
                        '   Set-ExecutionPolicy -Scope CurrentUser Unrestricted\n\n' +
                        'Note: This app uses "-ExecutionPolicy Bypass" but some systems may still block it.\n';
        }

        resolve({
          success: false,
          output,
          error: errorOutput + helpMessage,
          exitCode: code
        });
      }
    });

    powershell.on('error', (error) => {
      reject({ success: false, error: error.message });
    });
  });
});

// Check for script updates from GitHub
ipcMain.handle('check-updates', async (event, scriptInfo) => {
  try {
    const versionFile = path.join(__dirname, '../scripts/bundled', scriptInfo.repo, '.version');
    const result = await githubService.checkForUpdates(scriptInfo.repo, versionFile);
    return result;
  } catch (error) {
    console.error('Error checking for updates:', error);
    return { hasUpdate: false, error: error.message };
  }
});

// Download script from GitHub
ipcMain.handle('download-script', async (event, scriptInfo) => {
  try {
    const scriptDir = path.join(__dirname, '../scripts/bundled', scriptInfo.repo);
    const scriptPath = path.join(scriptDir, scriptInfo.file);
    const versionFile = path.join(scriptDir, '.version');

    // Download script
    const result = await githubService.downloadScript(scriptInfo.repo, scriptInfo.file, scriptPath);

    if (result.success) {
      // Get and save version info
      const latestCommit = await githubService.getLatestCommit(scriptInfo.repo);
      await githubService.saveVersionInfo(versionFile, latestCommit);

      return {
        success: true,
        message: 'Script downloaded successfully',
        path: scriptPath
      };
    }

    return result;
  } catch (error) {
    console.error('Error downloading script:', error);
    return {
      success: false,
      message: error.message
    };
  }
});
