import { db } from '../db/connection.js';

/**
 * Get sync status for liked songs
 * @param {Object} params - Tool parameters
 * @param {string} params.userId - Spotify user ID (optional)
 * @returns {Promise<Object>} - Sync status information
 */
export async function getSyncStatus(params = {}) {
  try {
    const { userId } = params;

    let query;
    let queryParams = [];

    if (userId) {
      query = `
        SELECT
          ss.sync_type,
          ss.last_sync_at,
          ss.total_items,
          ss.synced_items,
          ss.failed_items,
          ss.status,
          ss.error_message,
          u.display_name,
          u.total_liked_songs
        FROM sync_status ss
        JOIN users u ON ss.user_id = u.id
        WHERE ss.user_id = $1
        ORDER BY ss.sync_type
      `;
      queryParams = [userId];
    } else {
      // Get most recently synced user
      query = `
        SELECT
          ss.sync_type,
          ss.last_sync_at,
          ss.total_items,
          ss.synced_items,
          ss.failed_items,
          ss.status,
          ss.error_message,
          u.id as user_id,
          u.display_name,
          u.total_liked_songs
        FROM sync_status ss
        JOIN users u ON ss.user_id = u.id
        ORDER BY ss.last_sync_at DESC NULLS LAST
        LIMIT 5
      `;
    }

    const result = await db.query(query, queryParams);

    if (result.rows.length === 0) {
      return {
        success: true,
        synced: false,
        message: 'No sync history found. Run a sync to get started.',
        syncHistory: []
      };
    }

    const syncs = result.rows.map(row => ({
      syncType: row.sync_type,
      lastSyncAt: row.last_sync_at,
      totalItems: parseInt(row.total_items || 0),
      syncedItems: parseInt(row.synced_items || 0),
      failedItems: parseInt(row.failed_items || 0),
      status: row.status,
      errorMessage: row.error_message,
      displayName: row.display_name,
      totalLikedSongs: parseInt(row.total_liked_songs || 0)
    }));

    // Find the liked_songs sync specifically
    const likedSongsSync = syncs.find(s => s.syncType === 'liked_songs');

    return {
      success: true,
      synced: !!likedSongsSync?.lastSyncAt,
      lastSync: likedSongsSync?.lastSyncAt || null,
      totalLikedSongs: syncs[0]?.totalLikedSongs || 0,
      user: syncs[0]?.displayName || userId,
      syncHistory: syncs
    };
  } catch (error) {
    console.error('Error in getSyncStatus:', error);
    return {
      success: false,
      error: error.message,
      synced: false
    };
  }
}

// Tool schema for MCP
export const getSyncStatusSchema = {
  name: 'get_sync_status',
  description: 'Get the sync status for Spotify liked songs. Shows when the last sync happened and if data is up to date.',
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
