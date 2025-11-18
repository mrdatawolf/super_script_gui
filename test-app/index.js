const { app, BrowserWindow } = require('electron');

console.log('App:', app);
console.log('App type:', typeof app);

app.whenReady().then(() => {
  console.log('App ready!');
  app.quit();
});
