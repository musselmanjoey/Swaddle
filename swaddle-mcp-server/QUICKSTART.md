# Swaddle MCP Server - Quick Start Guide

## 🎯 What You'll Get

After setup, you can ask Claude Desktop:
- "How many liked songs do I have?" → Get real-time count from Spotify
- "Sync my Spotify liked songs" → Pull latest data into database
- "When was my last sync?" → Check sync status

---

## ⚡ Quick Setup (5 minutes)

### Step 1: Get Your Spotify Client Secret

1. Go to https://developer.spotify.com/dashboard
2. Click on your app (Client ID: `3963891cad264c52b58547aecf7a82ee`)
3. Click "Settings"
4. Copy the **Client Secret**
5. Open `.env.local` and add:
   ```env
   SPOTIFY_CLIENT_SECRET=paste_your_secret_here
   ```

### Step 2: Authenticate and Get Refresh Token

```bash
cd swaddle-mcp-server
node auth/getRefreshToken.js
```

This will:
- Open your browser to Spotify
- You log in and approve
- Get a refresh token and save it automatically

You should see:
```
✅ Tokens saved successfully!
✨ You're all set! The MCP server can now access your Spotify data.
```

### Step 3: Restart Claude Desktop

Close and reopen Claude Desktop completely.

### Step 4: Test It!

Ask Claude Desktop:
> "How many liked songs do I have in Spotify?"

Claude will use the MCP server to query Spotify and tell you!

Then try:
> "Sync my Spotify liked songs"

This will fetch all your songs from Spotify and save them to the database.

---

## 🧪 Testing Locally (Optional)

Before using with Claude Desktop, you can test the MCP server directly:

```bash
cd swaddle-mcp-server
node test.js
```

This will connect to Spotify and show your current liked songs count.

---

## 🛠️ Available MCP Tools

Once configured, Claude Desktop has access to these tools:

### 1. `get_liked_songs_count`
Get the total count of your liked songs from the database.

**Example questions:**
- "How many liked songs do I have?"
- "What's my Spotify library count?"

### 2. `get_sync_status`
Check when you last synced and if your data is up to date.

**Example questions:**
- "When was my last Spotify sync?"
- "Is my liked songs data current?"

### 3. `sync_liked_songs`
Sync all your liked songs from Spotify to the local database.

**Example questions:**
- "Sync my Spotify library"
- "Pull my latest liked songs from Spotify"
- "Update my music database"

---

## 🔍 How It Works

```
You authenticate once (Step 2)
    ↓
Get refresh token (lasts forever)
    ↓
MCP server uses it to get access tokens automatically
    ↓
Access tokens expire after 1 hour
    ↓
MCP server refreshes them automatically when needed
```

**You never need to re-authenticate!** The refresh token works indefinitely.

---

## 📊 What Gets Synced

When you run `sync_liked_songs`, the MCP server:

1. **Fetches from Spotify:**
   - All your liked songs
   - Track metadata (name, artist, album, duration, etc.)
   - Audio features (energy, danceability, valence, tempo, etc.)

2. **Saves to Database:**
   - Users table (your profile)
   - Artists table
   - Albums table
   - Tracks table (with audio features)
   - User_liked_songs table (with timestamps)

3. **Updates Sync Status:**
   - Last sync time
   - Total items synced
   - Any errors

---

## 🚨 Troubleshooting

### "No refresh token available"
- Run `node auth/getRefreshToken.js` again
- Make sure `.spotify-tokens.json` was created in the Swaddle root directory

### "Client ID or Client Secret not configured"
- Check that `.env.local` has both:
  - `REACT_APP_SPOTIFY_CLIENT_ID=...`
  - `SPOTIFY_CLIENT_SECRET=...`

### "Failed to refresh token: 400"
- Your refresh token might be invalid
- Run `node auth/getRefreshToken.js` again to get a new one

### Claude Desktop doesn't see the tools
- Make sure you restarted Claude Desktop completely (quit and reopen)
- Check that `claude_desktop_config.json` has the swaddle server configured
- Check Claude Desktop logs: Help → View Logs

### Database connection failed
- Make sure PostgreSQL is running
- Check database credentials in `.env.local`
- Test connection: `psql -U postgres -d swaddle`

---

## 🔐 Security

✅ **Safe:**
- Tokens stored locally on your machine only
- `.spotify-tokens.json` and `.env.local` are in `.gitignore`
- No cloud services involved
- All data stays local

⚠️ **Never commit:**
- `.env.local` (contains client secret)
- `.spotify-tokens.json` (contains refresh token)

---

## 🎵 Next Steps

Once you have syncing working, you could expand the MCP server with:

- **Search by vibe:** "Find energetic songs from my library"
- **Mood-based playlists:** "Create a chill playlist from my liked songs"
- **Audio feature analysis:** "Show me my most danceable songs"
- **Artist insights:** "Who are my top artists?"
- **Similarity search:** "Find songs similar to [track name]"

All the data is already in your database - just need to add more MCP tools!

---

## 📞 Need Help?

Check the detailed guides:
- `AUTHENTICATION_SETUP.md` - Full auth documentation
- `README.md` - Complete technical documentation
- `SETUP.md` - Original setup guide

Happy music querying! 🎵
