// Entry point for the main process

const fs = require('fs');
const { app, BrowserWindow} = require('electron');
const renderInterface = require('./js/interface.js');

/*Create new browser window and load "index.html"*/
function createWindow () {

  const win = new BrowserWindow({
    icon: 'icon/tw-logo.png',
    center: true,
    useContentSize: true,
    webPreferences: {
      nodeIntegration: true
    },
    width: 1360,
    height: 900,
    minWidth: 1360,
    minHeight: 900
  });

  win.removeMenu();
  win.setTouchBar(null);
  renderInterface.initializeIpcEvents();
  win.loadFile('./src/renderer/index.html');
  renderInterface.cacheMainWindow(win);
  //win.webContents.openDevTools()
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

