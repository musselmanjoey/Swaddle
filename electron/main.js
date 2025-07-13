const { app, BrowserWindow, shell, ipcMain } = require('electron');
const isDev = require('electron-is-dev');
const path = require('path');

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
