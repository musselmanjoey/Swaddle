// Spotify App Configuration
// This file uses environment variables to keep secrets out of git

export const SPOTIFY_CONFIG = {
  CLIENT_ID: process.env.REACT_APP_SPOTIFY_CLIENT_ID || 'your_spotify_client_id_here',
  
  // Smart redirect URI selection
  REDIRECT_URI: process.env.NODE_ENV === 'production' 
    ? 'https://yourdomain.com/auth-callback.html'  // Replace with your actual domain
    : 'http://localhost:3000/auth-callback.html',  // For local development
    
  // Fallback for Electron/development
  REDIRECT_URI_FALLBACK: 'https://developer.spotify.com/documentation/web-api/concepts/authorization',
  
  SCOPES: 'playlist-modify-private playlist-modify-public'
};

// Validation
if (SPOTIFY_CONFIG.CLIENT_ID === 'your_spotify_client_id_here' || !SPOTIFY_CONFIG.CLIENT_ID) {
  console.error('🚨 SPOTIFY CLIENT ID NOT CONFIGURED!');
  console.error('📝 Please create a .env.local file with your Spotify Client ID');
  console.error('💡 Copy .env.example to .env.local and fill in your values');
}

// Instructions for new developers:
// 1. Copy .env.example to .env.local
// 2. Get your Client ID from https://developer.spotify.com/dashboard
// 3. Add: REACT_APP_SPOTIFY_CLIENT_ID=your_actual_client_id
// 4. Save .env.local (this file is ignored by git)
