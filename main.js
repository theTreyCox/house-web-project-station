const sharp = require('sharp');
const { app, BrowserWindow, ipcMain, Menu, MenuItem, shell, nativeImage, dialog } = require('electron');
const path = require('path');
const fs = require('fs');


function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 700,
    minHeight: 300,
    fullscreenable: true, // Ensure that fullscreen is allowed (macOS specific)
    frame: true, // Ensure that the frame is visible, including traffic light buttons (macOS) or minimize, maximize, and close buttons (Windows)
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'customButtonsOnHover',
  });

  win.loadFile('index.html');

  // Open dev tools on app load
  //   win.webContents.openDevTools();
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
  contextMenu.append(
    new MenuItem({
      label: 'Save Image As...',
      click: async() => {
        const { dialog } = require('electron');
        const dataUrl = imagePath;

        // Determine the file format
        const formatMatch = dataUrl.match(/^data:image\/(.*?);base64,/);
        const format = formatMatch ? formatMatch[1] : 'png';

        // Convert the data URL to a Buffer
        const base64Data = dataUrl.replace(/^data:image\/.*?;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');

        // Configure the save dialog filters based on the file format
        let filters;
        if (format === 'avif') {
          filters = [{ name: 'Images', extensions: ['avif'] }];
        } else if (format === 'webp') {
          filters = [{ name: 'Images', extensions: ['webp'] }];
        } else {
          filters = [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }];
        }

        // Show the save dialog
        const result = await dialog.showSaveDialog({
          title: 'Save Image As...',
          filters,
        });

        if (!result.canceled) {
          try {
            const sharpImage = sharp(imageBuffer);

            if (format === 'avif') {
              sharpImage.avif();
            } else if (format === 'webp') {
              sharpImage.webp();
            } else if (format === 'jpg' || format === 'jpeg') {
              sharpImage.jpeg();
            } else {
              sharpImage.png();
            }

            const outputBuffer = await sharpImage.toBuffer();
            fs.writeFileSync(result.filePath, outputBuffer);
          } catch (err) {
            console.error('Error while saving image:', err);
          }
        }
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

ipcMain.on('confirm-delete', (event, index) => {
  const focusedWindow = BrowserWindow.getFocusedWindow();

  const options = {
    type: 'warning',
    buttons: ['Cancel', 'Delete'],
    defaultId: 0,
    cancelId: 0,
    title: 'Confirm Delete',
    message: 'Are you sure you want to delete this project?',
  };

  dialog.showMessageBox(focusedWindow, options).then((result) => {
    if (result.response === 1) {
      event.sender.send('confirmed-delete', index);
    }
  });
});

ipcMain.on('confirm-delete-image', (event, projectIndex, imageIndex) => {
  const focusedWindow = BrowserWindow.getFocusedWindow();

  const options = {
    type: 'warning',
    buttons: ['Cancel', 'Delete'],
    defaultId: 0,
    cancelId: 0,
    title: 'Confirm Image Delete',
    message: 'Are you sure you want to delete this image?',
  };

  dialog.showMessageBox(focusedWindow, options).then((result) => {
    if (result.response === 1) {
      event.sender.send('confirmed-delete-image', projectIndex, imageIndex);
    }
  });
});

ipcMain.on('get-app-version', (event) => {
  const appVersion = app.getVersion();
  event.returnValue = appVersion;
});