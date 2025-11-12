console.log('=== Minimal Electron Test ===');
console.log('process.type:', process.type);
console.log('process.versions.electron:', process.versions.electron);

// Try different ways to import
try {
  console.log('\n1. Testing require("electron")');
  const electron1 = require('electron');
  console.log('   Type:', typeof electron1);
  console.log('   Has app?:', !!electron1.app);
} catch (e) {
  console.log('   Error:', e.message);
}

try {
  console.log('\n2. Testing process.electronBinding');
  if (process.electronBinding) {
    console.log('   electronBinding exists');
  } else {
    console.log('   electronBinding NOT available');
  }
} catch (e) {
  console.log('   Error:', e.message);
}

try {
  console.log('\n3. Direct electron/main import');
  const { app } = require('electron/main');
  console.log('   Has app?:', !!app);
  if (app) {
    app.whenReady().then(() => {
      console.log('SUCCESS: Electron app is ready!');
      app.quit();
    });
  }
} catch (e) {
  console.log('   Error:', e.message);
}
