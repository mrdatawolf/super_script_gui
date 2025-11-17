const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getScripts: () => ipcRenderer.invoke('get-scripts'),
  executeScript: (scriptInfo, parameters) => ipcRenderer.invoke('execute-script', scriptInfo, parameters),
  onScriptOutput: (callback) => ipcRenderer.on('script-output', (event, data) => callback(data)),
  checkUpdates: (scriptInfo) => ipcRenderer.invoke('check-updates', scriptInfo),
  downloadScript: (scriptInfo) => ipcRenderer.invoke('download-script', scriptInfo),
  loadBranding: () => ipcRenderer.invoke('load-branding'),
  loadCustomTheme: () => ipcRenderer.invoke('load-custom-theme')
});
