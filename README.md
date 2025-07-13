# 🎵 Swaddle - Spotify Playlist Creator

A beautiful desktop application built with Electron and React that makes creating Spotify playlists effortless. Choose from curated presets or create custom playlists with just a few clicks.

![Swaddle Screenshot](https://via.placeholder.com/600x400/1db954/ffffff?text=Swaddle+Playlist+Creator)

## ✨ Features

- **🎵 Curated Presets**: Choose from "Haunted By You", "Nostalgic Mornings", "Road Trip Vibes" and more
- **✨ Custom Playlists**: Create your own playlists by pasting song lists
- **🔐 Seamless Authentication**: One-click Spotify login with secure popup
- **🖥️ Desktop App**: Native Electron application for the best experience
- **🌐 Web Compatible**: Also works in web browsers with smart fallbacks
- **🎯 Smart Search**: Automatically finds and adds tracks to your Spotify account

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [Spotify Developer Account](https://developer.spotify.com/) (free)

### 1. Clone and Install
```bash
git clone https://github.com/yourusername/swaddle.git
cd swaddle
npm install
```

### 2. Spotify App Setup
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click **"Create app"**
4. Fill in the form:
   - **App name**: `Swaddle Playlist Creator`
   - **App description**: `Desktop app for creating Spotify playlists`
   - **Website**: Leave blank or `http://localhost:3000`
   - **Redirect URI**: `http://localhost:3000/auth-callback.html`
   - **API/SDKs**: Check "Web API"
5. Click **"Save"** and copy your **Client ID**

### 3. Environment Configuration
```bash
# Copy the environment template
cp .env.example .env.local

# Edit .env.local and add your Spotify Client ID:
# REACT_APP_SPOTIFY_CLIENT_ID=your_actual_client_id_here
```

### 4. Run the App
```bash
# Desktop app (recommended)
npm run electron-dev

# Or web browser version
npm start
```

## 🎯 How to Use

1. **Launch the app** using `npm run electron-dev`
2. **Click "Sign in with Spotify"** - a secure popup will handle authentication
3. **Choose a preset** or create a custom playlist:
   - **Preset**: Click on "Haunted By You", "Nostalgic Mornings", etc.
   - **Custom**: Select "Custom Playlist" and add your own songs
4. **Edit details** like playlist name and description
5. **Add songs** in the format: "Song Title Artist Name" (one per line)
6. **Click "Create Playlist"** and watch the magic happen! ✨

## 🔧 Development

### Available Scripts
```bash
npm start                # React dev server (web browser)
npm run electron-dev     # Electron app with hot reload  
npm run build           # Build for production
npm run dist            # Create distributable packages
```

### Project Structure
```
src/
├── components/          # React components
│   ├── AuthSection.js   # Spotify authentication
│   ├── PlaylistSection.js # Playlist creation interface
│   └── ...
├── hooks/              # Custom React hooks
│   └── useSpotify.js   # Spotify API integration
├── services/           # API services
│   └── spotify.js      # Spotify service class
├── data/              # Static data
│   └── presets.js     # Preset playlist definitions
└── config/            # Configuration
    └── spotify.js     # Spotify API configuration
```

## 🌐 Deployment Options

### Desktop Distribution
```bash
npm run dist
# Creates distributable files in /dist
# - Windows: .exe installer
# - macOS: .dmg file  
# - Linux: .AppImage
```

### Web Deployment
1. Update `REDIRECT_URI` in `src/config/spotify.js` to your domain
2. Add your production redirect URI to Spotify app settings
3. Build and deploy:
```bash
npm run build
# Deploy /build folder to your web server
```

## 🛠️ Tech Stack

- **Frontend**: React 18 with Hooks
- **Desktop**: Electron 27
- **Styling**: CSS3 with modern features
- **API**: Spotify Web API
- **Build**: Create React App + Electron Builder

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit: `git commit -m 'Add amazing feature'`
5. Push: `git push origin feature/amazing-feature`
6. Open a Pull Request

## 📝 Environment Variables

The app uses environment variables to keep your Spotify credentials secure:

- **`.env.example`** - Template (committed to git)
- **`.env.local`** - Your actual secrets (ignored by git)
- **`REACT_APP_SPOTIFY_CLIENT_ID`** - Your Spotify app's Client ID

Never commit your `.env.local` file - it contains your personal API credentials!

## 🐛 Troubleshooting

### Authentication Issues
- **"Client ID not configured"**: Make sure you've created `.env.local` with your Spotify Client ID
- **"Invalid redirect URI"**: Ensure your Spotify app has the correct redirect URIs added
- **Popup blocked**: Allow popups for localhost, or use the desktop app for seamless auth

### Build Issues
- **Missing dependencies**: Run `npm install` to ensure all packages are installed
- **Node.js version**: Ensure you're using Node.js v16 or higher
- **Electron issues**: Delete `node_modules` and run `npm install` again

### CORS/Network Issues
- **Web version**: Some features work better in the desktop app due to browser security policies
- **Offline mode**: The app requires internet connection for Spotify API calls

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Spotify** for their excellent Web API
- **Electron** for making desktop apps with web tech possible
- **React** for the component architecture
- **Claude AI** for helping build this project! 🤖

---

**Built with ❤️ for music lovers everywhere.**

*Create amazing playlists with ease - from nostalgic mornings to epic road trips!* 🎵✨
