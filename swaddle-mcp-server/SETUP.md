# Swaddle MCP Server Setup Guide

## ✅ What's Been Built

A Node.js MCP (Model Context Protocol) server that exposes your Spotify liked songs data to Claude Desktop.

### POC Tool: `get_liked_songs_count`
Returns the count of your liked songs from the local PostgreSQL database.

**Current Status**: ✅ Working! Found **762 liked songs** in your database.

---

## 🚀 Quick Start

### 1. Test Locally (Already Working!)

```bash
cd swaddle-mcp-server
node test.js
```

This tests the database connection and tool execution.

### 2. Configure Claude Desktop

**Step 1**: Find your Claude Desktop config file:
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Step 2**: Add the Swaddle MCP server configuration:

```json
{
  "mcpServers": {
    "swaddle": {
      "command": "node",
      "args": [
        "C:\\Users\\musse\\Projects\\Swaddle\\swaddle-mcp-server\\index.js"
      ]
    }
  }
}
```

**Step 3**: Restart Claude Desktop

### 3. Test in Claude Desktop

Once configured, you can ask Claude:

> "How many liked songs do I have in Spotify?"

Claude will use the MCP server to query your local database and tell you that you have 762 liked songs!

---

## 📁 Project Structure

```
swaddle-mcp-server/
├── index.js                      # Main MCP server (stdio transport)
├── package.json                  # Dependencies (@modelcontextprotocol/sdk, pg)
├── test.js                       # Local testing script
├── README.md                     # Full documentation
├── SETUP.md                      # This file
├── claude-desktop-config.json    # Example config for Claude Desktop
├── db/
│   └── connection.js            # PostgreSQL connection (reuses .env.local)
└── tools/
    └── getLikedSongsCount.js    # POC tool implementation
```

---

## 🔧 How It Works

1. **Database Connection**: Uses existing `.env.local` from parent directory
2. **MCP Protocol**: Implements stdio transport (same as OpTracker Python implementation)
3. **Tool Registration**: Registers `get_liked_songs_count` tool with schema
4. **Query**: Queries `users` and `user_liked_songs` tables
5. **Response**: Returns formatted JSON with count and metadata

---

## 🎯 Next Steps: Expanding the MCP Server

Now that the POC is working, you can add more powerful tools:

### Suggested Tools to Add Next

#### 1. `search_liked_songs`
Search your library by vibe/mood/features
```javascript
{
  vibe: "energetic workout songs",
  audioFeatures: {
    energy: [0.7, 1.0],
    tempo: [120, 180]
  },
  limit: 20
}
```

#### 2. `get_audio_feature_ranges`
Understand your listening preferences
```javascript
// Returns min/max/avg for each feature across all your liked songs
```

#### 3. `find_similar_songs`
Find songs similar to a seed track
```javascript
{
  trackName: "Song Name",
  artistName: "Artist Name",
  limit: 10
}
```

#### 4. `get_songs_by_artist`
Get all liked songs by a specific artist
```javascript
{
  artistName: "Artist Name"
}
```

#### 5. `get_recent_likes`
Get your most recently liked songs
```javascript
{
  limit: 50,
  days: 30 // Last 30 days
}
```

---

## 🐛 Troubleshooting

### Database Connection Failed
- Check PostgreSQL is running: `pg_ctl status` or check services
- Verify `.env.local` exists with correct credentials
- Test connection manually: `psql -U postgres -d swaddle`

### Claude Desktop Not Seeing the Server
- Restart Claude Desktop after adding config
- Check the path in config matches your actual path
- Look for errors in Claude Desktop logs (Help → View Logs)

### Tool Returns "No users found"
- Run the main Swaddle Electron app first
- Sync your liked songs to populate the database
- The database needs data before the MCP server can query it

---

## 🔒 Security Notes

- Database credentials are read from `.env.local` (not committed to git)
- MCP server only runs locally (no network exposure)
- All data stays on your machine
- No Spotify API calls (queries local database only)

---

## 📊 Database Schema Reference

The MCP server queries these tables:

```sql
-- User info and total liked count (auto-updated by trigger)
users (id, display_name, total_liked_songs, last_sync_at)

-- Individual liked songs with timestamps
user_liked_songs (user_id, track_id, liked_at)

-- Track metadata and audio features
tracks (
  id, name, artist_id, album_id,
  danceability, energy, valence, tempo, acousticness,
  instrumentalness, liveness, speechiness, popularity
)

-- Artist info
artists (id, name, genres)

-- Albums
albums (id, name, artist_id)
```

---

## 🎉 Success!

Your Swaddle MCP server is working! You've successfully:

✅ Created a Node.js MCP server (vs Python in OpTracker)
✅ Connected to your existing PostgreSQL database
✅ Implemented the POC `get_liked_songs_count` tool
✅ Tested it successfully (found 762 liked songs)
✅ Generated Claude Desktop configuration

Next: Configure Claude Desktop and start querying your music library naturally!
