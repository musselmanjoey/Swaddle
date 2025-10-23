import { db } from '../db/connection.js';

/**
 * Get the count of liked songs for a user
 * @param {Object} params - Tool parameters
 * @param {string} params.userId - Spotify user ID (optional, defaults to first user if not provided)
 * @returns {Promise<Object>} - Object containing count and user info
 */
export async function getLikedSongsCount(params = {}) {
  try {
    const { userId } = params;

    let query;
    let queryParams = [];

    if (userId) {
      // Get count for specific user
      query = `
        SELECT
          u.id,
          u.display_name,
          u.total_liked_songs,
          u.last_sync_at,
          COUNT(uls.id) as actual_count
        FROM users u
        LEFT JOIN user_liked_songs uls ON u.id = uls.user_id
        WHERE u.id = $1
        GROUP BY u.id, u.display_name, u.total_liked_songs, u.last_sync_at
      `;
      queryParams = [userId];
    } else {
      // Get the first user (or most recently synced user)
      query = `
        SELECT
          u.id,
          u.display_name,
          u.total_liked_songs,
          u.last_sync_at,
          COUNT(uls.id) as actual_count
        FROM users u
        LEFT JOIN user_liked_songs uls ON u.id = uls.user_id
        GROUP BY u.id, u.display_name, u.total_liked_songs, u.last_sync_at
        ORDER BY u.last_sync_at DESC NULLS LAST
        LIMIT 1
      `;
    }

    const result = await db.query(query, queryParams);

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'No users found in database. Have you synced your liked songs yet?',
        count: 0
      };
    }

    const user = result.rows[0];

    return {
      success: true,
      userId: user.id,
      displayName: user.display_name,
      totalLikedSongs: parseInt(user.total_liked_songs),
      actualCount: parseInt(user.actual_count),
      lastSyncAt: user.last_sync_at,
      syncStatus: user.last_sync_at ? 'synced' : 'never_synced'
    };
  } catch (error) {
    console.error('Error in getLikedSongsCount:', error);
    return {
      success: false,
      error: error.message,
      count: 0
    };
  }
}

// Tool schema for MCP
export const getLikedSongsCountSchema = {
  name: 'get_liked_songs_count',
  description: 'Get the total count of liked songs for a Spotify user from the local database',
  inputSchema: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'Spotify user ID (optional - defaults to most recently synced user)'
      }
    }
  }
};
