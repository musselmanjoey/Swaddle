const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  openSpotifyAuth: (authUrl) => ipcRenderer.invoke('open-spotify-auth', authUrl),
  onAuthComplete: (callback) => ipcRenderer.on('spotify-auth-complete', callback),
  removeAuthListener: () => ipcRenderer.removeAllListeners('spotify-auth-complete'),
  
  // Database IPC methods
  dbHealthCheck: () => ipcRenderer.invoke('db-health-check'),
  dbSaveLikedSong: (userId, songData) => ipcRenderer.invoke('db-save-liked-song', userId, songData),
  dbGetUserLikedSongs: (userId) => ipcRenderer.invoke('db-get-user-liked-songs', userId),
  dbInitialize: () => ipcRenderer.invoke('db-initialize'),
  dbSaveLyricsAnalysis: (trackId, lyricsData) => ipcRenderer.invoke('db-save-lyrics-analysis', trackId, lyricsData),
  dbGetLyricsAnalysis: (trackIds) => ipcRenderer.invoke('db-get-lyrics-analysis', trackIds),
  
  // Playlist Enhancer IPC methods
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  
  // Add method to detect if we're in Electron
  isElectron: true
});
