# Swaddle MCP Server

Model Context Protocol server for Swaddle - exposes your Spotify liked songs data to Claude Desktop.

## Features

- **get_liked_songs_count**: Get the total count of your liked songs from the local PostgreSQL database

## Prerequisites

1. PostgreSQL database with Swaddle schema
2. Synced liked songs data (run the main Swaddle app first)
3. `.env.local` file in the parent directory with database credentials

## Installation

Dependencies are already installed. If you need to reinstall:

```bash
npm install
```

## Testing Locally

You can test the MCP server using the MCP inspector:

```bash
npx @modelcontextprotocol/inspector node index.js
```

This will open a web interface where you can test the tools.

## Claude Desktop Configuration

Add this to your Claude Desktop config file:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

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

**Note**: The database credentials will be read from `C:\Users\musse\Projects\Swaddle\.env.local`

## Available Tools

### get_liked_songs_count

Get the count of liked songs for a Spotify user.

**Parameters:**
- `userId` (string, optional): Spotify user ID. If not provided, uses the most recently synced user.

**Returns:**
```json
{
  "user": "username",
  "totalLikedSongs": 1234,
  "lastSynced": "2024-01-15T10:30:00.000Z",
  "syncStatus": "synced",
  "message": "You have 1234 liked songs in your Spotify library"
}
```

### search_liked_songs

Search and retrieve liked songs with filtering and sorting options.

**Parameters:**
- `query` (string, optional): Search text across track name, artist, and album
- `artist` (string, optional): Filter by artist name (partial match)
- `album` (string, optional): Filter by album name (partial match)
- `limit` (number, optional): Max results (1-100, default: 20)
- `offset` (number, optional): Pagination offset (default: 0)
- `sortBy` (string, optional): Sort by 'recent', 'name', 'artist', or 'popularity' (default: 'recent')
- `sortOrder` (string, optional): 'asc' or 'desc' (default: 'desc' for recent, 'asc' for others)

**Returns:**
```json
{
  "success": true,
  "total": 956,
  "count": 20,
  "offset": 0,
  "hasMore": true,
  "tracks": [
    {
      "id": "track_id",
      "name": "Song Name",
      "artist": "Artist Name",
      "album": "Album Name",
      "duration": "3:45",
      "durationMs": 225000,
      "popularity": 75,
      "explicit": false,
      "likedAt": "2024-01-15T10:30:00.000Z",
      "previewUrl": "https://...",
      "audioFeatures": {
        "danceability": 0.75,
        "energy": 0.82,
        "valence": 0.65,
        "tempo": 120.5,
        "acousticness": 0.15,
        "instrumentalness": 0.01
      }
    }
  ],
  "filters": {
    "query": "search term",
    "sortBy": "recent",
    "sortOrder": "DESC"
  }
}
```

## Usage Example

Once configured in Claude Desktop, you can ask:

> "How many liked songs do I have?"

Claude will use the MCP server to query your local database and return the count.

## Troubleshooting

### Database Connection Errors

Make sure:
1. PostgreSQL is running
2. `.env.local` exists in the parent directory with correct credentials
3. The `swaddle` database exists and has been migrated

### Claude Desktop Not Seeing the Server

1. Restart Claude Desktop after adding the config
2. Check the Claude Desktop logs for errors
3. Verify the path in the config matches your installation

## Development

To add more tools:

1. Create a new file in `tools/` (e.g., `tools/searchSongs.js`)
2. Export the tool function and schema
3. Import and register in `index.js`
4. Add the handler in the `CallToolRequestSchema` switch statement

## License

MIT
