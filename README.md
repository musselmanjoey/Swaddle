# 🎵 Swaddle - AI-Powered Spotify Music Curator

> **Intelligent music curation meets seamless playlist creation**
> Desktop application and MCP server that analyzes your Spotify library to create perfectly curated playlists using AI-powered recommendations, audio feature analysis, and lyrical sentiment analysis.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)
[![Electron](https://img.shields.io/badge/Electron-27-blue)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)

![Swaddle Screenshot](https://via.placeholder.com/800x450/1db954/ffffff?text=Swaddle+Music+Curator)

## 🌟 What Makes This Special

Swaddle is a **full-stack intelligent music curation system** that goes beyond simple playlist creation:

- 🧠 **AI-Powered Analysis**: Combines Spotify's audio features, Genius lyrics sentiment analysis, and your listening patterns
- 🎯 **Model Context Protocol (MCP)**: First-class integration with Claude Desktop for natural language playlist creation
- 💾 **PostgreSQL Intelligence Layer**: Local caching and analysis of 10+ data tables for lightning-fast curation
- 🔄 **Background Workers**: Multi-stage sync system with progress tracking and audio feature analysis
- 🎨 **React + Electron**: Beautiful desktop experience with modern UI/UX

**Key Innovation**: Instead of manually curating playlists, ask Claude: *"Create a playlist with high-energy songs from artists I like but with melancholic lyrics"* - and it happens automatically using your music data.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Swaddle Ecosystem                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────┐        ┌──────────────────┐            │
│  │  Electron App   │◄──────►│  PostgreSQL DB   │            │
│  │  (React UI)     │        │  (10+ tables)    │            │
│  └────────┬────────┘        └────────┬─────────┘            │
│           │                          │                       │
│           │                          │                       │
│  ┌────────▼──────────────────────────▼─────────┐            │
│  │        Background Workers                    │            │
│  │  • likedSongsSync  • lyricsSync             │            │
│  │  • audioFeaturesSync                        │            │
│  └────────┬─────────────────────────────────────┘            │
│           │                                                   │
│           ▼                                                   │
│  ┌─────────────────────────────────────────────┐            │
│  │          MCP Server (stdio)                  │            │
│  │  6 Tools:                                    │            │
│  │  • search_liked_songs                       │            │
│  │  • search_spotify                           │            │
│  │  • create_playlist                          │            │
│  │  • sync_liked_songs                         │            │
│  │  • get_liked_songs_count                    │            │
│  │  • get_sync_status                          │            │
│  └────────┬─────────────────────────────────────┘            │
│           │                                                   │
│           ▼                                                   │
│  ┌─────────────────────────────────────────────┐            │
│  │          Claude Desktop                      │            │
│  │  Natural language music curation             │            │
│  └──────────────────────────────────────────────┘            │
│                                                               │
└───────────────────────────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │     External APIs               │
        │  • Spotify Web API              │
        │  • Genius Lyrics API            │
        └─────────────────────────────────┘
```

---

## ✨ Features

### 🎵 Intelligent Music Analysis
- **Audio Features**: Analyze danceability, energy, valence, tempo, acousticness, and more
- **Lyrics Sentiment**: NLP-powered sentiment analysis from Genius (copyright-compliant themes only)
- **Listening Patterns**: Track your music preferences and trends over time
- **Smart Recommendations**: Get suggestions based on multi-dimensional music intelligence

### 🤖 MCP Integration (Claude Desktop)
- **Natural Language Playlists**: "Create a chill playlist with songs similar to Bon Iver"
- **Search Entire Spotify**: Not limited to liked songs - search and add any track
- **Background Sync**: One-command sync of your entire library with progress tracking
- **Real-time Status**: Check sync progress and database state

### 🖥️ Desktop Application
- **Beautiful UI**: Modern React interface with smooth animations
- **Curated Presets**: Quick-start templates like "Haunted By You", "Road Trip Vibes"
- **Custom Playlists**: Manual playlist creation with smart search
- **Seamless Auth**: One-click Spotify OAuth with secure token management

### 💾 Data Layer
- **PostgreSQL Database**: 10+ tables for comprehensive music intelligence
- **Local Caching**: Lightning-fast queries without API rate limits
- **Background Workers**: Non-blocking sync with multi-stage processing
- **Audio Features Storage**: Complete Spotify audio analysis for every track

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 16+ ([Download](https://nodejs.org/))
- **PostgreSQL** 13+ ([Download](https://www.postgresql.org/download/))
- **Spotify Developer Account** ([Sign up](https://developer.spotify.com/))
- **Genius API Key** (Optional, for lyrics analysis) ([Get key](https://genius.com/api-clients))

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/swaddle.git
cd swaddle
npm install
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb swaddle

# Run migrations (creates 10+ tables)
npm run db:migrate
```

### 3. Spotify App Configuration

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create new app with these settings:
   - **Redirect URI**: `http://localhost:3000/auth-callback.html`
   - **Scopes**: Check "Web API"
3. Copy your **Client ID** and **Client Secret**

### 4. Environment Configuration

```bash
# Copy template
cp .env.example .env.local

# Edit .env.local with your credentials:
REACT_APP_SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
REACT_APP_GENIUS_ACCESS_TOKEN=your_genius_token_here  # Optional

# PostgreSQL connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=swaddle
DB_USER=postgres
DB_PASSWORD=your_password
```

### 5. Run the Application

```bash
# Desktop app (recommended)
npm run electron-dev

# Web browser (limited features)
npm start
```

---

## 🤖 MCP Server Setup (Claude Desktop Integration)

Want to create playlists using natural language with Claude? Set up the MCP server:

### 1. Configure Claude Desktop

Add to `%APPDATA%\Claude\claude_desktop_config.json` (Windows) or `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac):

```json
{
  "mcpServers": {
    "swaddle": {
      "command": "node",
      "args": ["C:\\path\\to\\Swaddle\\swaddle-mcp-server\\index.js"]
    }
  }
}
```

### 2. Restart Claude Desktop

```bash
# Use the included restart script
./restart-claude.bat  # Windows
```

### 3. Start Using Natural Language!

Now you can ask Claude:
- *"How many liked songs do I have?"*
- *"Search Spotify for songs by Radiohead and create a playlist"*
- *"Create a workout playlist with high-energy tracks from my library"*
- *"Find songs similar to Bon Iver and make a chill evening playlist"*

See [MCP Server Documentation](swaddle-mcp-server/README.md) for all available tools.

---

## 🎯 Usage Examples

### Desktop App

1. **Launch**: `npm run electron-dev`
2. **Authenticate**: Click "Sign in with Spotify"
3. **Sync Your Library** (first time):
   - Click "Sync Liked Songs"
   - Wait for background workers to analyze tracks (~5 min for 1000 songs)
4. **Create Playlists**:
   - Choose a preset or go custom
   - Use smart search to find tracks
   - Click "Create Playlist" - done!

### MCP/Claude Desktop

```
You: Sync my liked songs from Spotify
Claude: [Uses sync_liked_songs tool]
✓ Synced 957 songs with audio features and lyrics analysis

You: Create a playlist called "Morning Vibes" with 20 of my most popular upbeat songs
Claude: [Uses search_liked_songs with filters, then create_playlist]
✓ Created playlist "Morning Vibes" with 20 tracks
🔗 https://open.spotify.com/playlist/...

You: Search Spotify for Bohemian Rhapsody and add it to a new playlist
Claude: [Uses search_spotify, then create_playlist with skipValidation]
✓ Found "Bohemian Rhapsody - Remastered 2011" by Queen
✓ Created playlist with 1 track
```

---

## 🛠️ Technology Stack

### Frontend
- **React 18**: Modern hooks-based architecture
- **Electron 27**: Cross-platform desktop wrapper
- **CSS3**: Custom styling with animations
- **React Router**: Client-side routing

### Backend
- **Node.js**: Server-side JavaScript runtime
- **PostgreSQL**: Relational database for music intelligence
- **pg**: Node.js PostgreSQL client
- **Express**: Web framework (for Electron IPC)

### APIs & Services
- **Spotify Web API**: Music data and playlist management
- **Genius API**: Lyrics and sentiment analysis
- **MCP Protocol**: Claude Desktop integration via stdio

### Data Processing
- **Natural (NLP)**: Sentiment analysis with Porter Stemmer
- **Cheerio**: HTML parsing for lyrics scraping
- **Axios**: HTTP client for API requests
- **Lodash**: Utility functions

### Development
- **CRACO**: Create React App Configuration Override
- **Electron Builder**: Desktop app packaging
- **Concurrently**: Run multiple npm scripts
- **dotenv**: Environment variable management

---

## 📊 Database Schema

10+ tables for comprehensive music intelligence:

| Table | Purpose |
|-------|---------|
| `users` | Spotify user profiles |
| `artists` | Artist metadata with genres |
| `albums` | Album information and release dates |
| `tracks` | Complete track data with audio features |
| `user_liked_songs` | User's saved tracks with timestamps |
| `lyrics` | Lyrics metadata and sentiment analysis |
| `curation_sessions` | Playlist creation history |
| `user_taste_profiles` | Aggregated listening preferences |
| `track_similarities` | Computed track relationships |
| `sync_status` | Background worker progress tracking |

Full schema: [001_initial_schema.sql](src/database/migrations/001_initial_schema.sql)

---

## 🎨 Key Technical Highlights

### Background Workers
Multi-stage sync process with progress tracking:
```javascript
// Non-blocking sync with progress updates
1. Fetch liked songs from Spotify API (paginated)
2. Store tracks, albums, artists in database
3. Fetch audio features for all tracks (batch of 100)
4. Search Genius for lyrics matches
5. Perform NLP sentiment analysis
6. Update sync status and complete
```

### MCP Server Architecture
```javascript
// Tools communicate via stdio using JSON-RPC 2.0
Server → Claude Desktop (via MCP SDK)
  ↓
Tool handlers (6 tools)
  ↓
Spotify Service (with token refresh)
  ↓
PostgreSQL Database
```

### Smart Token Management
```javascript
// Automatic token refresh with caching
1. Check cached access token expiry
2. If expired, use refresh token to get new access token
3. Update stored tokens in .spotify-tokens.json
4. Retry original request with fresh token
```

### Audio Feature Analysis
Every track stores 11 audio features from Spotify:
- **Danceability**: 0.0 to 1.0
- **Energy**: Intensity and activity
- **Valence**: Musical positivity
- **Tempo**: BPM
- **Acousticness, Instrumentalness, Liveness, Speechiness**
- **Key, Mode, Time Signature**

---

## 📝 Available Scripts

```bash
# Development
npm run electron-dev       # Run Electron app with hot reload
npm start                  # Run React dev server only
npm test                   # Run test suite

# Database
npm run db:setup          # Initial database setup
npm run db:migrate        # Run migrations
npm run db:reset          # Reset database (WARNING: deletes data)
npm run db:diagnostic     # Database health check

# Build & Distribution
npm run build             # Build React app for production
npm run dist              # Create distributable (Windows/Mac/Linux)
```

---

## 🔒 Security & Privacy

- **No Password Storage**: Uses OAuth 2.0 with refresh tokens
- **Local Data**: All music data cached locally in PostgreSQL
- **Environment Variables**: Secrets never committed to git
- **Token Encryption**: Tokens stored in gitignored `.spotify-tokens.json`
- **Copyright Compliant**: Lyrics analysis stores themes only, not full text

---

## 🚧 Development Roadmap

- [ ] **Collaborative Playlists**: Multi-user curation sessions
- [ ] **Real-time Recommendations**: Live suggestions as you add tracks
- [ ] **Advanced Filters**: Filter by BPM range, key, mood, decade
- [ ] **Playlist Analytics**: Visualize your playlist's audio features
- [ ] **Export/Import**: Save and share curation templates
- [ ] **Mobile App**: iOS/Android companion apps
- [ ] **Web App**: Full-featured web version with authentication

---

## 🐛 Troubleshooting

<details>
<summary><b>Database Connection Failed</b></summary>

- Ensure PostgreSQL is running: `pg_ctl status`
- Check credentials in `.env.local`
- Verify database exists: `psql -l | grep swaddle`
- Run migrations: `npm run db:migrate`
</details>

<details>
<summary><b>Spotify Authentication Issues</b></summary>

- Verify Client ID in `.env.local`
- Check redirect URI in Spotify Dashboard
- Clear browser cache and try again
- Use desktop app for best auth experience
</details>

<details>
<summary><b>MCP Server Not Found in Claude</b></summary>

- Check path in `claude_desktop_config.json`
- Restart Claude Desktop: `./restart-claude.bat`
- Check logs: `%APPDATA%\Claude\logs\mcp-server-swaddle.log`
- Verify Node.js is in PATH: `node --version`
</details>

<details>
<summary><b>Sync Taking Too Long</b></summary>

- Audio features fetch is rate-limited by Spotify
- ~1000 songs = 5-10 minutes
- Check progress: MCP `get_sync_status` or database `sync_status` table
- Pause/resume supported - won't re-fetch existing tracks
</details>

---

## 🤝 Contributing

Contributions welcome! This project is actively developed and open to improvements.

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Development Guidelines
- Follow existing code style (ESLint configuration included)
- Add tests for new features
- Update documentation for API changes
- Test on Windows/Mac before submitting PR

---

## 📄 License

**MIT License** - see [LICENSE](LICENSE) file for details.

You're free to use, modify, and distribute this project. Attribution appreciated but not required!

---

## 🙏 Acknowledgments

- **Spotify** - Excellent Web API and audio analysis
- **Genius** - Lyrics and song metadata
- **Anthropic** - Claude AI and Model Context Protocol (MCP)
- **Electron** - Cross-platform desktop framework
- **React** - UI component architecture
- **PostgreSQL** - Robust database system

---

## 👤 Author

**Your Name**
- Portfolio: [yourportfolio.com](https://yourportfolio.com)
- GitHub: [@yourusername](https://github.com/yourusername)
- LinkedIn: [your-linkedin](https://linkedin.com/in/your-profile)

---

## 📧 Contact & Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/swaddle/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/swaddle/discussions)
- **Email**: your.email@example.com

---

<div align="center">

**Built with ❤️ for music lovers and AI enthusiasts**

*From nostalgic mornings to epic road trips - create the perfect soundtrack for every moment* 🎵✨

[⬆ Back to Top](#-swaddle---ai-powered-spotify-music-curator)

</div>
