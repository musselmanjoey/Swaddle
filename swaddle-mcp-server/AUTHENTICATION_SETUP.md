# Spotify Authentication Setup for MCP Server

The MCP server needs a **Client Secret** and **Refresh Token** to access your Spotify data automatically.

## Step 1: Get Your Client Secret

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click on your existing app (the one with Client ID: `3963891cad264c52b58547aecf7a82ee`)
3. Click "Settings"
4. Copy the **Client Secret**
5. Add it to `.env.local`:

```env
SPOTIFY_CLIENT_SECRET=your_client_secret_here
```

## Step 2: Get a Refresh Token

You need to authenticate once to get a refresh token. I've created a helper script to do this.

### Run the Auth Helper:

```bash
cd swaddle-mcp-server
node auth/getRefreshToken.js
```

This will:
1. Open your browser to Spotify auth page
2. You log in and approve
3. It exchanges the code for a refresh token
4. Saves it to `.spotify-tokens.json` (git-ignored)

## Step 3: Test It Works

```bash
cd swaddle-mcp-server
node test.js
```

This should now:
- Load the refresh token
- Get a fresh access token from Spotify
- Query your liked songs count
- Show your actual current count

## Step 4: Restart Claude Desktop

Once authentication is set up, restart Claude Desktop and you can:

- Ask: "How many liked songs do I have?"
- Ask: "Sync my Spotify liked songs"
- Ask: "When was my last sync?"

---

## Troubleshooting

### "No refresh token available"
- Run the auth helper script again
- Make sure `.spotify-tokens.json` was created

### "Client ID or Client Secret not configured"
- Check that `.env.local` has both `REACT_APP_SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`

### "Failed to refresh token: 400"
- Your refresh token may be invalid
- Run the auth helper script again to get a new one

---

## Security Notes

- ⚠️ `.spotify-tokens.json` contains your refresh token - **never commit this file!**
- ⚠️ `.env.local` contains your client secret - **never commit this file!**
- ✅ Both files are already in `.gitignore`
- ✅ Tokens are stored locally on your machine only

---

## How It Works

```
1. You authenticate once → Get refresh token
2. MCP server uses refresh token → Gets fresh access tokens automatically
3. Access tokens expire after 1 hour → MCP refreshes them automatically
4. Refresh tokens last forever (until you revoke access)
```

This means you only need to authenticate **once**, and the MCP server can access your Spotify data forever!
