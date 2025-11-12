const { app, BrowserWindow } = require('electron');

console.log('Starting standalone test...');
console.log('app:', !!app);

app.whenReady().then(() => {
  console.log('App is ready!');
  const win = new BrowserWindow({ width: 400, height: 300 });
  win.loadURL('data:text/html,<h1>Test</h1>');

  setTimeout(() => {
    console.log('Quitting...');
    app.quit();
  }, 2000);
});
