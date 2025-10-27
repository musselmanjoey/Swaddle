# Swaddle Project

## Project Overview
Intelligent music curation system that enhances Spotify playlist creation. Transforms simple playlist creation into an AI-powered music discovery experience with:
- PostgreSQL-cached music library analysis
- Audio feature analysis (energy, valence, danceability)
- Lyrics sentiment analysis via Genius API
- Real-time intelligent recommendations from user's own taste
- Background sync workers for heavy data processing

## Technology Stack
- **Frontend**: React + Electron desktop app
- **Backend**: Node.js with enhanced Spotify/Genius APIs
- **Database**: PostgreSQL with 10+ tables for music intelligence
- **Key Libraries**: pg, axios, natural (NLP), cheerio, lodash
- **Architecture**: CommonJS modules, React hooks pattern, background workers

## Key Files & Structure
```
src/
├── database/
│   ├── connection.js           # PostgreSQL connection
│   └── migrations/001_initial_schema.sql  # Complete schema
├── services/
│   ├── spotify.js             # Enhanced API (300+ lines)
│   ├── genius.js              # Copyright-compliant lyrics analysis
│   └── database.js            # Database operations & CRUD
├── workers/
│   └── likedSongsSync.js      # Multi-stage background sync
├── hooks/
│   ├── useSpotify.js          # Original hooks
│   └── useLikedSongs.js       # Enhanced hooks (sync, curation)
├── components/
│   ├── Dashboard.js           # [NEEDS BUILDING] Main dashboard
│   ├── CreatePlaylistPage.js  # Existing functionality
│   └── SyncLikedSongsPage.js  # Existing functionality
```

## Development Setup
1. Install dependencies: `npm install`
2. Set up PostgreSQL database named `swaddle`
3. Configure `.env.local` with:
   - `REACT_APP_SPOTIFY_CLIENT_ID`
   - `REACT_APP_GENIUS_ACCESS_TOKEN`
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
4. Run migrations to create database schema
5. Start app: `npm run electron-dev`

## Common Commands
- `npm run electron-dev` - Start Electron development app
- `npm start` - Start React development server
- `npm run build` - Build for production
- `npm test` - Run tests

## Conventions
- **Architecture**: React hooks pattern for state management
- **Database**: PostgreSQL for lightning-fast local caching
- **API Integration**: Enhanced scopes (user-library-read, user-top-read, user-read-private)
- **Background Processing**: Worker pattern for heavy operations
- **Copyright Compliance**: Lyrics analysis (themes only, no full text storage)
- **Module System**: CommonJS for Node.js compatibility

## Configuration
**Database Tables**: users, artists, albums, tracks, user_liked_songs, lyrics, curation_sessions, user_taste_profiles, track_similarities, sync_status

**Environment Variables**:
- Spotify API credentials with enhanced scopes
- Genius API token for lyrics analysis
- PostgreSQL connection details

## Notes
**✅ COMPLETED BACKEND:**
- Complete database schema with music intelligence
- Enhanced Spotify service with audio features & recommendations
- Genius lyrics service with sentiment analysis
- Background sync workers with progress tracking
- React hooks for sync and curation management

**🎯 NEXT PHASE - UI DEVELOPMENT:**
- **Priority 1**: Dashboard tab with sync functionality and progress bars
- **Priority 2**: Enhanced App.js with tab navigation (Dashboard, Curation, Legacy, Settings)
- **Priority 3**: Intelligent Curation interface with seed track selection and real-time recommendations

**Target User Flow**: Authenticate → Sync liked songs → Intelligent curation with seed tracks → Real-time recommendations → Create cohesive playlists