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
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true
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
    // Handle both development and production paths
    let configPath;
    if (app.isPackaged) {
      // Production: use app.asar.unpacked path
      const asarUnpackedPath = __dirname.replace('app.asar', 'app.asar.unpacked');
      configPath = path.join(asarUnpackedPath, '../scripts/scripts-config.json');
    } else {
      // Development: use regular path
      configPath = path.join(__dirname, '../scripts/scripts-config.json');
    }

    const data = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading scripts config:', error);
    return { scripts: [] };
  }
});

// Helper function to clean PowerShell formatting artifacts
const cleanPowerShellOutput = (text) => {
  if (!text) return text;

  // Remove PowerShell error formatting artifacts
  return text
    // Remove "At line:X char:Y" location lines
    .replace(/At line:\d+\s+char:\d+\s*\n/g, '')
    // Remove "At <path>:<line>:<char>" location lines
    .replace(/At [^\n]+\.ps1:\d+\s+char:\d+\s*\n/g, '')
    // Remove Read-Host errors in NonInteractive mode
    .replace(/Read-Host : Windows PowerShell is in NonInteractive mode\. Read and Prompt functionality is not available\.\s*\n/g, '')
    // Remove the actual Read-Host command line that caused the error
    .replace(/\+\s+\$null\s*=\s*Read-Host[^\n]*\n/g, '')
    // Remove "+ ~~~" indicator lines
    .replace(/\+\s+~+\s*\n/g, '')
    // Remove CategoryInfo lines
    .replace(/\s+\+\s+CategoryInfo\s+:[^\n]+\n/g, '')
    // Remove FullyQualifiedErrorId lines
    .replace(/\s+\+\s+FullyQualifiedErrorId\s+:[^\n]+\n/g, '')
    // Remove extra blank lines (more than 2 in a row)
    .replace(/\n{3,}/g, '\n\n')
    // Remove ANSI color codes and special characters
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
};

// Execute PowerShell script
ipcMain.handle('execute-script', async (event, scriptInfo, parameters) => {
  return new Promise((resolve, reject) => {
    // Handle both development and production paths
    // In production, scripts are unpacked from asar to app.asar.unpacked
    let scriptPath;
    if (app.isPackaged) {
      // Production: use app.asar.unpacked path
      const asarUnpackedPath = __dirname.replace('app.asar', 'app.asar.unpacked');
      scriptPath = path.join(asarUnpackedPath, '../scripts/bundled', scriptInfo.repo, scriptInfo.file);
    } else {
      // Development: use regular path
      scriptPath = path.join(__dirname, '../scripts/bundled', scriptInfo.repo, scriptInfo.file);
    }

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
            const stringValue = String(value);
            // Check if the value contains commas (indicating multiple values)
            // Convert to PowerShell array syntax: "value1","value2","value3"
            if (stringValue.includes(',')) {
              const values = stringValue.split(',').map(v => v.trim()).filter(v => v);
              const arrayValues = values.map(v => {
                const escapedValue = v.replace(/"/g, '`"');
                return `"${escapedValue}"`;
              }).join(',');
              psCommand += ` -${key} ${arrayValues}`;
            } else {
              // Escape quotes in string values
              const escapedValue = stringValue.replace(/"/g, '`"');
              psCommand += ` -${key} "${escapedValue}"`;
            }
          }
        }
      }
    }

    console.log('Executing PowerShell command:', psCommand);
    console.log('Requires admin:', scriptInfo.requiresAdmin);

    let powershell;
    let tempOutputFile;
    let tempErrorFile;

    // Check if script requires admin elevation
    if (scriptInfo.requiresAdmin) {
      // Create temporary files to capture output from elevated process
      const os = require('os');
      const crypto = require('crypto');
      const tempId = crypto.randomBytes(8).toString('hex');
      tempOutputFile = path.join(os.tmpdir(), `biztech-output-${tempId}.txt`);
      tempErrorFile = path.join(os.tmpdir(), `biztech-error-${tempId}.txt`);

      // Create a wrapper command that redirects output to temp files
      const wrapperCommand = `
        try {
          ${psCommand} *> "${tempOutputFile}" 2>&1
          exit $LASTEXITCODE
        } catch {
          $_ | Out-File -FilePath "${tempErrorFile}" -Encoding UTF8
          exit 1
        }
      `.trim();

      // Escape the wrapper command for passing to Start-Process
      const escapedWrapper = wrapperCommand.replace(/"/g, '\\"').replace(/\n/g, '; ');

      // Use Start-Process with -Verb RunAs to trigger UAC
      // -WindowStyle Hidden hides the window
      const elevatedCommand = `
        $process = Start-Process powershell.exe -ArgumentList '-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command','${escapedWrapper}' -Verb RunAs -PassThru -Wait -WindowStyle Hidden
        exit $process.ExitCode
      `.trim();

      powershell = spawn('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-Command', elevatedCommand
      ]);

      // Send message that UAC prompt is expected
      event.sender.send('script-output', {
        type: 'stdout',
        data: '⚠️  This script requires administrator privileges.\nPlease approve the UAC prompt to continue...\n\n'
      });

    } else {
      // Normal execution without elevation
      powershell = spawn('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy', 'Bypass',
        '-Command', psCommand
      ]);
    }

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

    powershell.on('close', async (code) => {
      // If admin elevation was used, read output from temp files
      if (scriptInfo.requiresAdmin && tempOutputFile) {
        try {
          let outputContent = await fs.readFile(tempOutputFile, 'utf-8');
          if (outputContent) {
            // Clean the output before displaying
            outputContent = cleanPowerShellOutput(outputContent);
            output += outputContent;
            event.sender.send('script-output', { type: 'stdout', data: outputContent });
          }
        } catch (err) {
          // File might not exist if script didn't produce output
          console.log('No output file found (may be normal):', err.message);
        }

        try {
          let errorContent = await fs.readFile(tempErrorFile, 'utf-8');
          if (errorContent) {
            // Clean error output too
            errorContent = cleanPowerShellOutput(errorContent);
            allErrorOutput += errorContent;
            errorOutput += errorContent;
            event.sender.send('script-output', { type: 'stderr', data: errorContent });
          }
        } catch (err) {
          // File might not exist if no errors occurred
          console.log('No error file found (this is good!):', err.message);
        }

        // Clean up temp files
        try {
          await fs.unlink(tempOutputFile).catch(() => {});
          await fs.unlink(tempErrorFile).catch(() => {});
        } catch (err) {
          console.log('Error cleaning up temp files:', err);
        }
      }

      // Check if exit code is 1 but only due to Read-Host error (script actually succeeded)
      // For elevated scripts, also check the output content
      const combinedContent = output + allErrorOutput;
      const isOnlyReadHostError = code === 1 &&
                                   (combinedContent.includes('Read-Host') ||
                                    combinedContent.includes('NonInteractive mode') ||
                                    combinedContent.includes('PSInvalidOperationException')) &&
                                   !combinedContent.includes('AuthorizationManager') &&
                                   !combinedContent.includes('execution policy') &&
                                   !combinedContent.includes('UnauthorizedAccess');

      if (code === 0 || isOnlyReadHostError) {
        resolve({ success: true, output, exitCode: 0 });
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
