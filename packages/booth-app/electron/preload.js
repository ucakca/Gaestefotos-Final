const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('boothAPI', {
  getSystemInfo: () => ipcRenderer.invoke('booth:getSystemInfo'),
  toggleFullscreen: () => ipcRenderer.invoke('booth:toggleFullscreen'),
  exitKiosk: () => ipcRenderer.invoke('booth:exitKiosk'),
});
