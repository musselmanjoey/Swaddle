import { db } from '../db/connection.js';

/**
 * Search and retrieve liked songs with filtering options
 * @param {Object} params - Tool parameters
 * @param {string} params.query - Search query (searches track name, artist, album)
 * @param {string} params.artist - Filter by artist name
 * @param {string} params.album - Filter by album name
 * @param {number} params.limit - Maximum number of results (default: 20, max: 100)
 * @param {number} params.offset - Offset for pagination (default: 0)
 * @param {string} params.sortBy - Sort by: 'recent' (liked_at), 'name', 'artist', 'popularity' (default: 'recent')
 * @param {string} params.sortOrder - Sort order: 'asc' or 'desc' (default: 'desc' for recent, 'asc' for others)
 * @returns {Promise<Object>} - Search results with tracks
 */
export async function searchLikedSongs(params = {}) {
  try {
    const {
      query,
      artist,
      album,
      limit = 20,
      offset = 0,
      sortBy = 'recent',
      sortOrder
    } = params;

    // Validate limit
    const validLimit = Math.min(Math.max(1, parseInt(limit) || 20), 100);
    const validOffset = Math.max(0, parseInt(offset) || 0);

    // Build WHERE clause
    const conditions = [];
    const queryParams = [];
    let paramCount = 0;

    // Text search across track, artist, album
    if (query) {
      paramCount++;
      conditions.push(`(
        t.name ILIKE $${paramCount} OR
        a.name ILIKE $${paramCount} OR
        alb.name ILIKE $${paramCount}
      )`);
      queryParams.push(`%${query}%`);
    }

    // Filter by artist
    if (artist) {
      paramCount++;
      conditions.push(`a.name ILIKE $${paramCount}`);
      queryParams.push(`%${artist}%`);
    }

    // Filter by album
    if (album) {
      paramCount++;
      conditions.push(`alb.name ILIKE $${paramCount}`);
      queryParams.push(`%${album}%`);
    }

    const whereClause = conditions.length > 0
      ? `AND ${conditions.join(' AND ')}`
      : '';

    // Determine sort
    let orderByClause;
    const defaultOrder = sortBy === 'recent' ? 'DESC' : 'ASC';
    const order = sortOrder?.toUpperCase() === 'DESC' || sortOrder?.toUpperCase() === 'ASC'
      ? sortOrder.toUpperCase()
      : defaultOrder;

    switch (sortBy) {
      case 'name':
        orderByClause = `t.name ${order}`;
        break;
      case 'artist':
        orderByClause = `a.name ${order}`;
        break;
      case 'popularity':
        orderByClause = `t.popularity ${order}`;
        break;
      case 'recent':
      default:
        orderByClause = `uls.liked_at ${order}`;
        break;
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM user_liked_songs uls
      JOIN tracks t ON uls.track_id = t.id
      JOIN artists a ON t.artist_id = a.id
      LEFT JOIN albums alb ON t.album_id = alb.id
      WHERE 1=1 ${whereClause}
    `;

    const countResult = await db.query(countQuery, queryParams);
    const totalResults = parseInt(countResult.rows[0].total);

    // Get tracks
    paramCount++;
    const limitParam = paramCount;
    paramCount++;
    const offsetParam = paramCount;

    const tracksQuery = `
      SELECT
        t.id,
        t.name as track_name,
        a.name as artist_name,
        alb.name as album_name,
        t.duration_ms,
        t.popularity,
        t.explicit,
        t.preview_url,
        uls.liked_at,
        t.danceability,
        t.energy,
        t.valence,
        t.tempo,
        t.acousticness,
        t.instrumentalness,
        t.audio_features_synced
      FROM user_liked_songs uls
      JOIN tracks t ON uls.track_id = t.id
      JOIN artists a ON t.artist_id = a.id
      LEFT JOIN albums alb ON t.album_id = alb.id
      WHERE 1=1 ${whereClause}
      ORDER BY ${orderByClause}
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    const tracksResult = await db.query(
      tracksQuery,
      [...queryParams, validLimit, validOffset]
    );

    // Format results
    const tracks = tracksResult.rows.map(row => ({
      id: row.id,
      name: row.track_name,
      artist: row.artist_name,
      album: row.album_name,
      duration: formatDuration(row.duration_ms),
      durationMs: row.duration_ms,
      popularity: row.popularity,
      explicit: row.explicit,
      likedAt: row.liked_at,
      previewUrl: row.preview_url,
      audioFeatures: row.audio_features_synced ? {
        danceability: row.danceability,
        energy: row.energy,
        valence: row.valence,
        tempo: row.tempo,
        acousticness: row.acousticness,
        instrumentalness: row.instrumentalness
      } : null
    }));

    return {
      success: true,
      total: totalResults,
      count: tracks.length,
      offset: validOffset,
      limit: validLimit,
      hasMore: (validOffset + tracks.length) < totalResults,
      tracks,
      filters: {
        query: query || null,
        artist: artist || null,
        album: album || null,
        sortBy,
        sortOrder: order
      }
    };

  } catch (error) {
    console.error('Error in searchLikedSongs:', error);
    return {
      success: false,
      error: error.message,
      tracks: []
    };
  }
}

/**
 * Format duration from milliseconds to MM:SS
 */
function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Tool schema for MCP
export const searchLikedSongsSchema = {
  name: 'search_liked_songs',
  description: 'Search and retrieve liked songs from the database with filtering and sorting options. Can search by track name, artist, or album. Returns detailed track information including audio features if available.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query - searches across track name, artist name, and album name'
      },
      artist: {
        type: 'string',
        description: 'Filter by artist name (partial match supported)'
      },
      album: {
        type: 'string',
        description: 'Filter by album name (partial match supported)'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (1-100, default: 20)',
        default: 20
      },
      offset: {
        type: 'number',
        description: 'Offset for pagination (default: 0)',
        default: 0
      },
      sortBy: {
        type: 'string',
        enum: ['recent', 'name', 'artist', 'popularity'],
        description: 'Sort results by: recent (when liked), name (track name), artist, or popularity (default: recent)',
        default: 'recent'
      },
      sortOrder: {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Sort order: asc or desc (default: desc for recent, asc for others)'
      }
    }
  }
};
