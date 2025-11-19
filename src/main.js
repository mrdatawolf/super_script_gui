// Load environment variables from .env file (for GitHub token)
require('dotenv').config();

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const GitHubService = require('./github-service');

let mainWindow;
const githubService = new GitHubService();

// Cache version checks per session to avoid annoying repeated prompts
const versionCheckCache = new Map();

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
      // Production: use extraResources path (consistent with execute and download)
      const resourcesPath = process.resourcesPath;
      configPath = path.join(resourcesPath, 'scripts/scripts-config.json');
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

  // Split into lines for line-by-line filtering
  let lines = text.split('\n');

  lines = lines.filter(line => {
    // Remove winget spinner lines (lines that are just spinners: -, \, |, /)
    if (/^\s*[-\\|/]+\s*$/.test(line)) return false;

    // Remove winget progress bar lines (contain box-drawing characters or their corrupted UTF-8 equivalents)
    if (/[ΓûÆΓûêΓûÇ\u2500-\u257F]/.test(line)) return false;

    // Remove download progress lines (contain MB / MB or KB / MB)
    if (/\d+(\.\d+)?\s*(KB|MB|GB)\s*\/\s*\d+(\.\d+)?\s*(KB|MB|GB)/.test(line)) return false;

    // Remove lines that are mostly whitespace with spinners
    if (/^\s{20,}[-\\|/]\s*$/.test(line)) return false;

    // Remove "Downloading https://" lines
    if (/^Downloading https?:\/\//.test(line)) return false;

    // Remove "Starting package install..." with spinner
    if (/^Starting package install\.\.\.[-\\|/]/.test(line)) return false;

    // Keep the line
    return true;
  });

  // Join back and apply other filters
  return lines.join('\n')
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
    let scriptPath;
    if (app.isPackaged) {
      // Production: use extraResources path (same location as downloads)
      const resourcesPath = process.resourcesPath;
      scriptPath = path.join(resourcesPath, 'scripts/bundled', scriptInfo.repo, scriptInfo.file);
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

      // Create a wrapper command that redirects output to temp files with UTF-8 encoding
      const wrapperCommand = `
        try {
          ${psCommand} 2>&1 | Out-File -FilePath "${tempOutputFile}" -Encoding UTF8 -Force
          exit $LASTEXITCODE
        } catch {
          $_ | Out-File -FilePath "${tempErrorFile}" -Encoding UTF8 -Force
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

      // Poll temp files for real-time output streaming
      let outputFilePosition = 0;
      let errorFilePosition = 0;
      let pollingInterval;

      // Helper function to read new content from a file starting at a specific position
      const readNewContent = async (filePath, startPosition) => {
        try {
          const stats = await fs.stat(filePath);
          const fileSize = stats.size;

          // If file hasn't grown, return null
          if (fileSize <= startPosition) {
            return { content: null, newPosition: startPosition };
          }

          // Read only the new content
          const buffer = Buffer.alloc(fileSize - startPosition);
          const fileHandle = await fs.open(filePath, 'r');
          try {
            await fileHandle.read(buffer, 0, buffer.length, startPosition);
            const content = buffer.toString('utf-8');
            return { content, newPosition: fileSize };
          } finally {
            await fileHandle.close();
          }
        } catch (err) {
          // File doesn't exist yet or other error - this is normal at the start
          if (err.code !== 'ENOENT') {
            console.log('Error reading temp file:', err.message);
          }
          return { content: null, newPosition: startPosition };
        }
      };

      // Start polling for output
      pollingInterval = setInterval(async () => {
        // Poll output file
        const outputResult = await readNewContent(tempOutputFile, outputFilePosition);
        if (outputResult.content) {
          const cleanedOutput = cleanPowerShellOutput(outputResult.content);
          if (cleanedOutput) {
            output += cleanedOutput;
            event.sender.send('script-output', { type: 'stdout', data: cleanedOutput });
          }
          outputFilePosition = outputResult.newPosition;
        }

        // Poll error file
        const errorResult = await readNewContent(tempErrorFile, errorFilePosition);
        if (errorResult.content) {
          const cleanedError = cleanPowerShellOutput(errorResult.content);
          if (cleanedError) {
            allErrorOutput += cleanedError;
            errorOutput += cleanedError;
            event.sender.send('script-output', { type: 'stderr', data: cleanedError });
          }
          errorFilePosition = errorResult.newPosition;
        }
      }, 500); // Poll every 500ms

      // Store interval ID for cleanup
      powershell.pollingInterval = pollingInterval;

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
      // If admin elevation was used, stop polling and do final read
      if (scriptInfo.requiresAdmin && tempOutputFile) {
        // Stop the polling interval
        if (powershell.pollingInterval) {
          clearInterval(powershell.pollingInterval);
        }

        // Do a final read to catch any remaining content written after last poll
        try {
          const stats = await fs.stat(tempOutputFile);
          if (stats.size > outputFilePosition) {
            const buffer = Buffer.alloc(stats.size - outputFilePosition);
            const fileHandle = await fs.open(tempOutputFile, 'r');
            try {
              await fileHandle.read(buffer, 0, buffer.length, outputFilePosition);
              const finalContent = buffer.toString('utf-8');
              const cleanedContent = cleanPowerShellOutput(finalContent);
              if (cleanedContent) {
                output += cleanedContent;
                event.sender.send('script-output', { type: 'stdout', data: cleanedContent });
              }
            } finally {
              await fileHandle.close();
            }
          }
        } catch (err) {
          if (err.code !== 'ENOENT') {
            console.log('Error in final output read:', err.message);
          }
        }

        // Do a final read of error file
        try {
          const stats = await fs.stat(tempErrorFile);
          if (stats.size > errorFilePosition) {
            const buffer = Buffer.alloc(stats.size - errorFilePosition);
            const fileHandle = await fs.open(tempErrorFile, 'r');
            try {
              await fileHandle.read(buffer, 0, buffer.length, errorFilePosition);
              const finalContent = buffer.toString('utf-8');
              const cleanedContent = cleanPowerShellOutput(finalContent);
              if (cleanedContent) {
                allErrorOutput += cleanedContent;
                errorOutput += cleanedContent;
                event.sender.send('script-output', { type: 'stderr', data: cleanedContent });
              }
            } finally {
              await fileHandle.close();
            }
          }
        } catch (err) {
          if (err.code !== 'ENOENT') {
            console.log('Error in final error read:', err.message);
          }
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
    // Check cache first - only check GitHub once per session per repo
    const cacheKey = scriptInfo.repo;
    if (versionCheckCache.has(cacheKey)) {
      console.log(`[Version Check] Using cached result for ${scriptInfo.repo}`);
      return versionCheckCache.get(cacheKey);
    }

    // Handle both development and production paths
    let versionFile;
    if (app.isPackaged) {
      // Production: use extraResources path
      const resourcesPath = process.resourcesPath;
      versionFile = path.join(resourcesPath, 'scripts/bundled', scriptInfo.repo, '.version');
    } else {
      // Development: use regular path
      versionFile = path.join(__dirname, '../scripts/bundled', scriptInfo.repo, '.version');
    }

    const result = await githubService.checkForUpdates(scriptInfo.repo, versionFile);

    // Cache the result for this session
    versionCheckCache.set(cacheKey, result);

    return result;
  } catch (error) {
    console.error('Error checking for updates:', error);
    return { hasUpdate: false, error: error.message };
  }
});

// Download script from GitHub
ipcMain.handle('download-script', async (event, scriptInfo) => {
  try {
    console.log(`[Download Handler] Script info:`, scriptInfo);

    // Handle both development and production paths
    let scriptDir;
    if (app.isPackaged) {
      // Production: write to extraResources (writable location outside asar)
      const resourcesPath = process.resourcesPath;
      scriptDir = path.join(resourcesPath, 'scripts/bundled', scriptInfo.repo);
    } else {
      // Development: use regular path
      scriptDir = path.join(__dirname, '../scripts/bundled', scriptInfo.repo);
    }

    const scriptPath = path.join(scriptDir, scriptInfo.file);
    const versionFile = path.join(scriptDir, '.version');
    console.log(`[Download Handler] Paths: dir=${scriptDir}, file=${scriptPath}`);

    // Download script
    const result = await githubService.downloadScript(scriptInfo.repo, scriptInfo.file, scriptPath);

    if (result.success) {
      // Get and save version info
      const latestCommit = await githubService.getLatestCommit(scriptInfo.repo);
      await githubService.saveVersionInfo(versionFile, latestCommit);

      // Verify the version file was written correctly
      try {
        const savedVersion = await fs.readFile(versionFile, 'utf-8');
        console.log(`[Download] Verified version saved: ${savedVersion.trim().substring(0, 8)}`);
      } catch (err) {
        console.error(`[Download] Failed to verify version file:`, err);
      }

      // Update cache with the new version (no update available)
      versionCheckCache.set(scriptInfo.repo, {
        hasUpdate: false,
        currentVersion: latestCommit.trim(),
        latestVersion: latestCommit.trim()
      });
      console.log(`[Version Check] Cache updated for ${scriptInfo.repo} - no update needed`);

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

// Load branding configuration
ipcMain.handle('load-branding', async () => {
  try {
    const brandingPath = path.join(__dirname, '../branding.json');
    const data = await fs.readFile(brandingPath, 'utf8');
    return {
      success: true,
      config: JSON.parse(data)
    };
  } catch (error) {
    // Return default branding if file doesn't exist
    return {
      success: false,
      config: {
        appName: "Biztech Tools",
        logoPath: "assets/logo.png",
        windowTitle: "Biztech Tools - PowerShell Automation",
        welcomeTitle: "Welcome to Biztech Tools",
        welcomeSubtitle: "Select a script from the sidebar to get started",
        companyUrl: "https://trustbiztech.com"
      }
    };
  }
});

// Load custom theme CSS
ipcMain.handle('load-custom-theme', async () => {
  try {
    const themePath = path.join(__dirname, '../custom-theme.css');
    const css = await fs.readFile(themePath, 'utf8');
    return {
      success: true,
      css: css
    };
  } catch (error) {
    // No custom theme, return empty
    return {
      success: false,
      css: ''
    };
  }
});
