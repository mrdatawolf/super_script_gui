console.log('Starting require test...');
const electron = require('electron');
console.log('Electron type:', typeof electron);
console.log('Electron value:', electron);
console.log('Electron.app:', electron?.app);
const { app } = electron || {};
console.log('Destructured app:', app);
