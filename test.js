console.log('Testing electron import');
try {
  const electron = require('electron');
  console.log('Type:', typeof electron);
  console.log('Has app?:', !!electron.app);
  console.log('Keys sample:', Object.keys(electron).slice(0, 5));

  if (electron.app) {
    electron.app.whenReady().then(() => {
      console.log('Electron ready!');
      electron.app.quit();
    });
  }
} catch (e) {
  console.error('Error:', e.message);
}
