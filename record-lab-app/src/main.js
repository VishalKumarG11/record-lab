const { app, BrowserWindow, ipcMain, desktopCapturer, session, screen, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');
const iconPath = require('./assets/record-lab-icon.png');
const windowIcon = nativeImage.createFromPath(iconPath);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// IPC handler screen sources lane ke liye
ipcMain.handle('get-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['window', 'screen'],
    thumbnailSize: { width: 150, height: 150 }
  });
  return sources;
});

let cursorInterval = null;
let mouseEvents = [];
let recordingStartTime = 0;

// Cursor recording start karna
ipcMain.handle('start-mouse-tracking', () => {
  mouseEvents = [];
  recordingStartTime = Date.now();
  
  // Har 50ms par cursor ke exact (x, y) coordinates record karega
  cursorInterval = setInterval(() => {
    const point = screen.getCursorScreenPoint();
    mouseEvents.push({
      time: Date.now() - recordingStartTime,
      x: point.x,
      y: point.y
    });
  }, 50);

  return true;
});

// Cursor recording stop karna aur data return karna
ipcMain.handle('stop-mouse-tracking', () => {
  if (cursorInterval) {
    clearInterval(cursorInterval);
    cursorInterval = null;
  }
  return mouseEvents;
});

ipcMain.handle('choose-export-directory', async () => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  const result = await require('electron').dialog.showOpenDialog(focusedWindow, {
    title: 'Choose export folder',
    properties: ['openDirectory', 'createDirectory'],
  });
  return result.canceled ? null : result.filePaths[0] || null;
});

ipcMain.handle('save-exported-video', async (_event, directory, fileName, data) => {
  if (!directory || !fileName || !data) throw new Error('Export path or file data is missing');
  const outputPath = path.join(directory, path.basename(fileName));
  await fs.promises.writeFile(outputPath, Buffer.from(data));
  return outputPath;
});


const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: windowIcon,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });
  mainWindow.setIcon(windowIcon);

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  
  // Session headers bypass (Backup Fix) - CSP block hatane ke liye
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' data: blob:; media-src 'self' blob: data:; script-src 'self' 'unsafe-eval' 'unsafe-inline';"
        ]
      }
    });
  });

  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});