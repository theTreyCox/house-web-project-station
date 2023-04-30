const { app, BrowserWindow, ipcMain, Menu, MenuItem, shell } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile('index.html');
  win.webContents.openDevTools();
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

ipcMain.on('show-image-context-menu', (event, imagePath) => {
  const contextMenu = new Menu();
  //   contextMenu.append(
  //     new MenuItem({
  //       label: 'Open in File Explorer',
  //       click: () => {
  //         shell.showItemInFolder(imagePath);
  //       },
  //     })
  //   );
  contextMenu.append(
    new MenuItem({
      label: 'Save Image As...',
      click: () => {
        const { dialog } = require('electron');
        const dataUrl = imagePath;

        dialog
          .showSaveDialog({
            title: 'Save Image As...',
            filters: [{ name: 'Images', extensions: ['png'] }],
          })
          .then((result) => {
            if (!result.canceled) {
              const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
              fs.writeFileSync(result.filePath, base64Data, 'base64');
            }
          })
          .catch((err) => {
            console.error('Error while saving image:', err);
          });
      },
    })
  );

  // Get the BrowserWindow instance from the event
  const browserWindow = BrowserWindow.fromWebContents(event.sender);
  contextMenu.popup({ window: browserWindow });
});

ipcMain.on('show-item-in-folder', (event, imagePath) => {
  //   console.log(`Opening image in folder ${imagePath}`)
  shell.showItemInFolder(imagePath);
});

ipcMain.on('restart-app', () => {
  app.relaunch();
  app.exit();
});

// Add IPC listener for getting the user data path
ipcMain.on('get-user-data-path', (event) => {
  event.returnValue = app.getPath('userData');
});