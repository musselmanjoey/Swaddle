# 🎵 Swaddle Setup Instructions

## Quick Setup (5 minutes)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd swaddle
npm install
```

### 2. Environment Setup

```bash
# Copy the environment template
cp .env.example .env.local

# Edit .env.local and add your Spotify Client ID
```

### 3. Get Your Spotify Client ID

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click **"Create app"**
4. Fill in the form:
   - **App name**: `Swaddle Playlist Creator` (or whatever you want)
   - **App description**: `Desktop app for creating Spotify playlists`
   - **Website**: Leave blank or put `http://localhost:3000`
   - **Redirect URI**: `https://developer.spotify.com/documentation/web-api/concepts/authorization`
   - **API/SDKs**: Check "Web API"
5. Click **"Save"**
6. Copy your **Client ID** (it looks like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)

### 2. Configure Your App

1. Open `src/config/spotify.js` in VS Code
2. Replace `'your_spotify_client_id_here'` with your actual Client ID:

```javascript
export const SPOTIFY_CONFIG = {
  CLIENT_ID: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', // Your actual Client ID here
  REDIRECT_URI: 'https://developer.spotify.com/documentation/web-api/concepts/authorization',
  SCOPES: 'playlist-modify-private playlist-modify-public'
};
```

3. Save the file

### 3. You're Done! 🎉

Now anyone can use your app with **completely automated authentication**:

**🖥️ In Electron (Desktop App) - FULLY AUTOMATED:**
- Click "Sign in with Spotify"
- Secure popup opens automatically
- Login to Spotify
- **Window closes automatically** when done
- **No copy/paste needed!** ✨

**🌐 In Web Browser - MOSTLY AUTOMATED:**
- Click "Sign in with Spotify"
- Popup opens for Spotify login
- Login to Spotify
- **Popup closes automatically** when done
- **No copy/paste needed!** ✨

## Important Notes

- ✅ **Your Client ID is safe to share** - it's not a secret
- ✅ **Users login with their own accounts** - they don't need developer accounts
- ✅ **Each user gets their own playlists** - created in their Spotify account
- ✅ **Ready for distribution** - you can share your built app with anyone

## Troubleshooting

**"Invalid client" error**: Double-check your Client ID is correct and matches exactly

**"Invalid redirect URI" error**: Make sure your Spotify app settings have the exact redirect URI: `https://developer.spotify.com/documentation/web-api/concepts/authorization`

**App won't start**: Run `npm install` first, then `npm run electron-dev`
