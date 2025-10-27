const { app, BrowserWindow, shell, ipcMain } = require('electron');
const isDev = require('electron-is-dev');
const path = require('path');

// Import CommonJS database service for main process
const databaseService = require('./database-main');

let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allow CORS for Spotify API in development
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../public/icon.png'), // Add icon later
    titleBarStyle: 'default',
    show: false, // Don't show until ready
  });

  // Load the app
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../build/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
    console.log('🔍 Development mode: Enhanced logging enabled');
  }
}

// Handle Spotify authentication with extensive debugging
ipcMain.handle('open-spotify-auth', async (event, authUrl) => {
  console.log('🎵 [AUTH] Starting authentication process...');
  console.log('🎵 [AUTH] Auth URL:', authUrl);
  
  return new Promise((resolve) => {
    const authWindow = new BrowserWindow({
      width: 500,
      height: 650,
      show: true,
      modal: true,
      parent: mainWindow,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    console.log('🎵 [AUTH] Auth window created');
    authWindow.loadURL(authUrl);
    console.log('🎵 [AUTH] Loading auth URL in window...');
    
    let checkCount = 0;
    
    // Monitor URL changes more comprehensively
    const checkForToken = (source = 'manual') => {
      checkCount++;
      try {
        const currentUrl = authWindow.webContents.getURL();
        console.log(`🔍 [AUTH-CHECK-${checkCount}] (${source}) Current URL:`, currentUrl);
        
        // Check for different token patterns
        const patterns = [
          { name: 'Query Parameter', regex: /[?&]access_token=([^&]+)/ },
          { name: 'URL Fragment', regex: /#.*access_token=([^&]+)/ },
          { name: 'Direct Match', regex: /access_token=([^&]+)/ }
        ];
        
        for (const pattern of patterns) {
          const match = currentUrl.match(pattern.regex);
          if (match) {
            const token = match[1];
            console.log(`✅ [AUTH] Token found using ${pattern.name}:`, token.substring(0, 20) + '...');
            
            mainWindow.webContents.send('spotify-auth-complete', { 
              success: true, 
              token, 
              url: currentUrl,
              method: pattern.name
            });
            
            console.log('🎵 [AUTH] Closing auth window...');
            authWindow.close();
            resolve({ success: true });
            return true;
          }
        }
        
        // Log specific redirect pages
        if (currentUrl.includes('developer.spotify.com')) {
          console.log('🔄 [AUTH] On Spotify developer page - checking for token...');
          console.log('🔄 [AUTH] Full URL for analysis:', currentUrl);
          
          // Try to parse the entire URL more carefully
          if (currentUrl.includes('#')) {
            const fragment = currentUrl.split('#')[1];
            console.log('🔍 [AUTH] URL Fragment:', fragment);
            
            if (fragment && fragment.includes('access_token=')) {
              const tokenMatch = fragment.match(/access_token=([^&]+)/);
              if (tokenMatch) {
                const token = tokenMatch[1];
                console.log('✅ [AUTH] Token extracted from fragment:', token.substring(0, 20) + '...');
                
                mainWindow.webContents.send('spotify-auth-complete', { 
                  success: true, 
                  token, 
                  url: currentUrl,
                  method: 'Fragment Parsing'
                });
                
                console.log('🎵 [AUTH] Closing auth window...');
                authWindow.close();
                resolve({ success: true });
                return true;
              }
            }
          }
        }
        
        console.log(`❌ [AUTH-CHECK-${checkCount}] No token found in URL`);
        
      } catch (error) {
        console.log(`⚠️ [AUTH-CHECK-${checkCount}] Error checking URL:`, error.message);
      }
      return false;
    };

    // Listen to all possible navigation events
    authWindow.webContents.on('did-start-loading', () => {
      console.log('🔄 [AUTH] Page started loading...');
    });

    authWindow.webContents.on('did-finish-load', () => {
      console.log('✅ [AUTH] Page finished loading');
      setTimeout(() => checkForToken('did-finish-load'), 100);
    });

    authWindow.webContents.on('did-navigate', (event, url) => {
      console.log('🧭 [AUTH] did-navigate to:', url);
      setTimeout(() => checkForToken('did-navigate'), 100);
    });

    authWindow.webContents.on('did-navigate-in-page', (event, url) => {
      console.log('🧭 [AUTH] did-navigate-in-page to:', url);
      setTimeout(() => checkForToken('did-navigate-in-page'), 100);
    });

    authWindow.webContents.on('will-redirect', (event, url) => {
      console.log('↪️ [AUTH] will-redirect to:', url);
      if (url.includes('access_token=')) {
        console.log('✅ [AUTH] Token found in redirect URL!');
        const tokenMatch = url.match(/access_token=([^&]+)/);
        if (tokenMatch) {
          const token = tokenMatch[1];
          console.log('🎵 [AUTH] Token from redirect:', token.substring(0, 20) + '...');
          mainWindow.webContents.send('spotify-auth-complete', { success: true, token, url });
          authWindow.close();
          resolve({ success: true });
        }
      }
    });

    // Even more aggressive periodic check
    const intervalCheck = setInterval(() => {
      if (authWindow.isDestroyed()) {
        console.log('🔴 [AUTH] Auth window destroyed, stopping checks');
        clearInterval(intervalCheck);
        return;
      }
      
      if (checkForToken('periodic-check')) {
        clearInterval(intervalCheck);
      }
    }, 250); // Check every 250ms

    // Handle window closed without auth
    authWindow.on('closed', () => {
      console.log('🔴 [AUTH] Auth window closed');
      clearInterval(intervalCheck);
      resolve({ success: false, cancelled: true });
    });

    // Timeout after 10 minutes
    setTimeout(() => {
      if (!authWindow.isDestroyed()) {
        console.log('⏰ [AUTH] Authentication timeout');
        clearInterval(intervalCheck);
        authWindow.close();
        resolve({ success: false, timeout: true });
      }
    }, 600000);

    console.log('🎵 [AUTH] All event listeners set up, waiting for authentication...');
  });
});

// Database IPC handlers
console.log('🗄️ [DB] Setting up database IPC handlers...');

// Database health check
ipcMain.handle('db-health-check', async () => {
  console.log('🏥 [DB] Health check requested from renderer');
  try {
    const result = await databaseService.healthCheck();
    console.log('✅ [DB] Health check result:', result);
    return result;
  } catch (error) {
    console.error('❌ [DB] Health check failed:', error.message);
    return { connected: false, error: error.message };
  }
});

// Save liked song
ipcMain.handle('db-save-liked-song', async (event, userId, songData) => {
  console.log(`\n📡 [IPC] ===== DB-SAVE-LIKED-SONG REQUEST =====`);
  console.log(`📡 [IPC] User ID: ${userId}`);
  console.log(`📡 [IPC] Song data received:`, JSON.stringify(songData, null, 2));
  console.log(`📡 [IPC] Request timestamp: ${new Date().toISOString()}`);
  
  try {
    console.log(`🔄 [IPC] Calling database service...`);
    const result = await databaseService.saveLikedSong(userId, songData);
    console.log(`✅ [IPC] Database service returned:`, result);
    console.log(`✅ [IPC] Song saved successfully: ${result?.spotify_id}`);
    console.log(`📡 [IPC] ===== DB-SAVE-LIKED-SONG SUCCESS =====\n`);
    return result;
  } catch (error) {
    console.error(`\n❌ [IPC] ===== DB-SAVE-LIKED-SONG FAILED =====`);
    console.error(`❌ [IPC] Error message:`, error.message);
    console.error(`❌ [IPC] Error stack:`, error.stack);
    console.error(`❌ [IPC] Failed song data:`, JSON.stringify(songData, null, 2));
    console.error(`❌ [IPC] ===== END ERROR =====\n`);
    throw error;
  }
});

// Get user liked songs
ipcMain.handle('db-get-user-liked-songs', async (event, userId) => {
  console.log(`\n📡 [IPC] ===== DB-GET-USER-LIKED-SONGS REQUEST =====`);
  console.log(`📡 [IPC] User ID: ${userId}`);
  console.log(`📡 [IPC] Request timestamp: ${new Date().toISOString()}`);
  
  try {
    console.log(`🔄 [IPC] Calling database service...`);
    const songs = await databaseService.getUserLikedSongs(userId);
    console.log(`✅ [IPC] Database service returned ${songs?.length || 0} songs`);
    if (songs && songs.length > 0) {
      console.log(`✅ [IPC] First song: ${songs[0].track_name} by ${songs[0].artist_name}`);
      console.log(`✅ [IPC] Last song: ${songs[songs.length - 1].track_name} by ${songs[songs.length - 1].artist_name}`);
    }
    console.log(`📡 [IPC] ===== DB-GET-USER-LIKED-SONGS SUCCESS =====\n`);
    return songs;
  } catch (error) {
    console.error(`\n❌ [IPC] ===== DB-GET-USER-LIKED-SONGS FAILED =====`);
    console.error(`❌ [IPC] Error message:`, error.message);
    console.error(`❌ [IPC] Error stack:`, error.stack);
    console.error(`❌ [IPC] User ID that failed: ${userId}`);
    console.error(`❌ [IPC] ===== END ERROR =====\n`);
    throw error;
  }
});

// Initialize database
ipcMain.handle('db-initialize', async () => {
  console.log('🚀 [DB] Database initialization requested');
  try {
    const result = await databaseService.initialize();
    console.log('✅ [DB] Database initialized successfully');
    return result;
  } catch (error) {
    console.error('❌ [DB] Database initialization failed:', error.message);
    throw error;
  }
});

// Save lyrics analysis
ipcMain.handle('db-save-lyrics-analysis', async (event, trackId, lyricsData) => {
  console.log(`🎭 [DB] Save lyrics analysis request for track: ${trackId}`);
  try {
    const result = await databaseService.saveLyricsAnalysis(trackId, lyricsData);
    console.log(`✅ [DB] Lyrics analysis saved for track: ${trackId}`);
    return result;
  } catch (error) {
    console.error(`❌ [DB] Failed to save lyrics analysis for ${trackId}:`, error.message);
    throw error;
  }
});

// Get lyrics analysis for multiple tracks
ipcMain.handle('db-get-lyrics-analysis', async (event, trackIds) => {
  console.log(`🎭 [DB] Get lyrics analysis request for ${trackIds.length} tracks`);
  try {
    const result = await databaseService.getLyricsAnalysis(trackIds);
    console.log(`✅ [DB] Retrieved lyrics analysis for ${result.length} tracks`);
    return result;
  } catch (error) {
    console.error('❌ [DB] Failed to get lyrics analysis:', error.message);
    throw error;
  }
});

// === PLAYLIST ENHANCER IPC HANDLERS ===

// Get user's enhanced playlists
ipcMain.handle('playlist-enhancer:get-enhanced-playlists', async (event, userId) => {
  console.log(`🚀 [IPC] Get enhanced playlists request for user: ${userId}`);
  try {
    const result = await databaseService.getUserEnhancedPlaylists(userId);
    console.log(`✅ [IPC] Retrieved ${result.length} enhanced playlists`);
    return result;
  } catch (error) {
    console.error('❌ [IPC] Failed to get enhanced playlists:', error.message);
    throw error;
  }
});

// Save enhancement session
ipcMain.handle('playlist-enhancer:save-session', async (event, sessionData) => {
  console.log(`💾 [IPC] Save enhancement session request for playlist: ${sessionData.playlistName}`);
  try {
    const result = await databaseService.saveEnhancementSession(sessionData);
    console.log(`✅ [IPC] Saved enhancement session with ID: ${result}`);
    return result;
  } catch (error) {
    console.error('❌ [IPC] Failed to save enhancement session:', error.message);
    throw error;
  }
});

// Get recommendations
ipcMain.handle('playlist-enhancer:get-recommendations', async (event, seedTracks, sourceType, userId, limit) => {
  console.log(`🎯 [IPC] Get recommendations request: ${sourceType}, ${seedTracks.length} seeds`);
  try {
    const result = await databaseService.getRecommendations(seedTracks, sourceType, userId, limit);
    console.log(`✅ [IPC] Retrieved ${result.length} recommendations`);
    return result;
  } catch (error) {
    console.error('❌ [IPC] Failed to get recommendations:', error.message);
    throw error;
  }
});

// Check if playlist is enhanced
ipcMain.handle('playlist-enhancer:is-enhanced', async (event, userId, spotifyPlaylistId) => {
  console.log(`🔍 [IPC] Check playlist enhancement status: ${spotifyPlaylistId}`);
  try {
    const result = await databaseService.isPlaylistEnhanced(userId, spotifyPlaylistId);
    console.log(`✅ [IPC] Playlist enhancement status retrieved`);
    return result;
  } catch (error) {
    console.error('❌ [IPC] Failed to check playlist enhancement status:', error.message);
    throw error;
  }
});

// Save Genius song data
ipcMain.handle('playlist-enhancer:save-genius-data', async (event, trackId, geniusData) => {
  console.log(`🎭 [IPC] Save Genius data request for track: ${trackId}`);
  try {
    const result = await databaseService.saveGeniusSongData(trackId, geniusData);
    console.log(`✅ [IPC] Saved Genius data for track: ${trackId}`);
    return result;
  } catch (error) {
    console.error('❌ [IPC] Failed to save Genius data:', error.message);
    throw error;
  }
});

// === SMART SYNC IPC HANDLERS ===

// Analyze missing data for smart sync
ipcMain.handle('smart-sync:analyze-missing-data', async (event, userId) => {
  console.log(`🔍 [IPC] Analyzing missing data for user: ${userId}`);
  try {
    const result = await databaseService.analyzeMissingData(userId);
    console.log(`✅ [IPC] Data analysis complete`);
    return result;
  } catch (error) {
    console.error('❌ [IPC] Failed to analyze missing data:', error.message);
    throw error;
  }
});

// Sync Spotify data for specific tracks
ipcMain.handle('smart-sync:sync-spotify-data', async (event, options) => {
  console.log(`🎵 [IPC] Smart Spotify sync request`);
  try {
    const result = await databaseService.smartSyncSpotifyData(options);
    console.log(`✅ [IPC] Smart Spotify sync complete`);
    return result;
  } catch (error) {
    console.error('❌ [IPC] Smart Spotify sync failed:', error.message);
    throw error;
  }
});

// Sync Genius data for track batch
ipcMain.handle('smart-sync:sync-genius-batch', async (event, options) => {
  console.log(`🎭 [IPC] Smart Genius batch sync request`);
  try {
    const result = await databaseService.smartSyncGeniusBatch(options);
    console.log(`✅ [IPC] Smart Genius batch sync complete`);
    return result;
  } catch (error) {
    console.error('❌ [IPC] Smart Genius batch sync failed:', error.message);
    throw error;
  }
});

// === DEBUG SYNC IPC HANDLERS ===

// Debug sync audio features for 10 tracks
ipcMain.handle('debug:sync-audio-features', async (event) => {
  console.log('🔍 [DEBUG-IPC] Debug sync audio features (10 tracks)...');
  try {
    const tracks = await databaseService.getTracksNeedingAudioFeaturesDebug();
    console.log(`🔍 [DEBUG-IPC] Found ${tracks.length} tracks needing audio features`);
    
    const results = [];
    for (const track of tracks) {
      const result = await databaseService.syncSingleTrackAudioFeatures(track.id);
      results.push({
        trackId: track.id,
        trackName: track.name,
        artistName: track.artist_name,
        success: result.success,
        error: result.error
      });
      console.log(`🔍 [DEBUG-IPC] Audio features for "${track.name}": ${result.success ? '✅' : '❌'}`);
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`✅ [DEBUG-IPC] Debug audio features sync complete: ${successCount}/${results.length} successful`);
    
    return {
      success: true,
      tracksProcessed: results.length,
      successCount,
      results
    };
  } catch (error) {
    console.error('❌ [DEBUG-IPC] Debug audio features sync failed:', error.message);
    return { success: false, error: error.message };
  }
});

// Debug sync Genius data for 10 tracks
ipcMain.handle('debug:sync-genius-data', async (event) => {
  console.log('🔍 [DEBUG-IPC] Debug sync Genius data (10 tracks)...');
  try {
    const tracks = await databaseService.getTracksNeedingGeniusDataDebug();
    console.log(`🔍 [DEBUG-IPC] Found ${tracks.length} tracks needing Genius data`);
    
    const results = [];
    for (const track of tracks) {
      const result = await databaseService.syncSingleTrackGeniusData(track.id, track.name, track.artist_name);
      results.push({
        trackId: track.id,
        trackName: track.name,
        artistName: track.artist_name,
        success: result.success,
        error: result.error
      });
      console.log(`🔍 [DEBUG-IPC] Genius data for "${track.name}": ${result.success ? '✅' : '❌'}`);
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`✅ [DEBUG-IPC] Debug Genius data sync complete: ${successCount}/${results.length} successful`);
    
    return {
      success: true,
      tracksProcessed: results.length,
      successCount,
      results
    };
  } catch (error) {
    console.error('❌ [DEBUG-IPC] Debug Genius data sync failed:', error.message);
    return { success: false, error: error.message };
  }
});

// Get tracks missing audio features for debug
ipcMain.handle('debug-sync:get-tracks-missing-audio', async (event, userId, limit) => {
  console.log(`🔎 [DEBUG-IPC] Get ${limit} tracks missing audio features for user: ${userId}`);
  try {
    const result = await databaseService.getTracksMissingAudioFeatures(userId, limit);
    console.log(`✅ [DEBUG-IPC] Found ${result.length} tracks missing audio features`);
    return result;
  } catch (error) {
    console.error('❌ [DEBUG-IPC] Failed to get tracks missing audio features:', error.message);
    throw error;
  }
});

// Get tracks missing Genius data for debug
ipcMain.handle('debug-sync:get-tracks-missing-genius', async (event, userId, limit) => {
  console.log(`🔎 [DEBUG-IPC] Get ${limit} tracks missing Genius data for user: ${userId}`);
  try {
    const result = await databaseService.getTracksMissingGeniusData(userId, limit);
    console.log(`✅ [DEBUG-IPC] Found ${result.length} tracks missing Genius data`);
    return result;
  } catch (error) {
    console.error('❌ [DEBUG-IPC] Failed to get tracks missing Genius data:', error.message);
    throw error;
  }
});

// Sync audio features for a single track
ipcMain.handle('debug-sync:sync-track-audio-features', async (event, trackId) => {
  console.log(`🔎 [DEBUG-IPC] Sync audio features for track: ${trackId}`);
  try {
    const result = await databaseService.syncSingleTrackAudioFeatures(trackId);
    console.log(`✅ [DEBUG-IPC] Audio features sync result:`, result);
    return result;
  } catch (error) {
    console.error('❌ [DEBUG-IPC] Failed to sync audio features for track:', error.message);
    return { success: false, error: error.message };
  }
});

// Sync Genius data for a single track
ipcMain.handle('debug-sync:sync-track-genius-data', async (event, trackId, trackName, artistName) => {
  console.log(`🔎 [DEBUG-IPC] Sync Genius data for track: ${trackName} by ${artistName}`);
  try {
    const result = await databaseService.syncSingleTrackGeniusData(trackId, trackName, artistName);
    console.log(`✅ [DEBUG-IPC] Genius data sync result:`, result);
    return result;
  } catch (error) {
    console.error('❌ [DEBUG-IPC] Failed to sync Genius data for track:', error.message);
    return { success: false, error: error.message };
  }
});

// App event handlers
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

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });
});
