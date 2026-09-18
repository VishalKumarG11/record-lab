// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSources: () => ipcRenderer.invoke('get-sources'),
  startMouseTracking: () => ipcRenderer.invoke('start-mouse-tracking'),
  stopMouseTracking: () => ipcRenderer.invoke('stop-mouse-tracking'),
  chooseExportDirectory: () => ipcRenderer.invoke('choose-export-directory'),
  saveExportedVideo: (directory, fileName, data) => ipcRenderer.invoke('save-exported-video', directory, fileName, data)
});