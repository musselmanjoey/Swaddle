const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  openSpotifyAuth: (authUrl) => ipcRenderer.invoke('open-spotify-auth', authUrl),
  onAuthComplete: (callback) => ipcRenderer.on('spotify-auth-complete', callback),
  removeAuthListener: () => ipcRenderer.removeAllListeners('spotify-auth-complete'),
  // Add method to detect if we're in Electron
  isElectron: true
});
