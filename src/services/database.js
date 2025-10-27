import db from '../database/connection.js';
import { withTransaction } from '../database/connection.js';

class DatabaseService {
  constructor() {
    this.initialized = false;
  }

  // Initialize database connection
  async initialize() {
    if (this.initialized) return true;
    
    const connected = await db.connect();
    if (connected) {
      this.initialized = true;
      console.log('✅ Database service initialized');
    }
    return connected;
  }

  // User operations
  async saveUser(userData) {
    const query = `
      INSERT INTO users (id, display_name, email, country, followers_count)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        email = EXCLUDED.email,
        country = EXCLUDED.country,
        followers_count = EXCLUDED.followers_count,
        updated_at = NOW()
      RETURNING *;
    `;
    
    const result = await db.query(query, [
      userData.id,
      userData.display_name,
      userData.email,
      userData.country,
      userData.followers
    ]);
    
    return result.rows[0];
  }

  async getUser(userId) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await db.query(query, [userId]);
    return result.rows[0];
  }

  // Track operations
  async saveTrack(trackData, audioFeatures = null) {
    const query = `
      INSERT INTO tracks (
        id, name, artist_id, album_id, track_number, disc_number, duration_ms, explicit, popularity, preview_url, external_urls,
        danceability, energy, key, loudness, mode, speechiness, acousticness, instrumentalness, liveness, valence, tempo, time_signature, audio_features_synced
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        artist_id = EXCLUDED.artist_id,
        album_id = EXCLUDED.album_id,
        track_number = EXCLUDED.track_number,
        disc_number = EXCLUDED.disc_number,
        duration_ms = EXCLUDED.duration_ms,
        explicit = EXCLUDED.explicit,
        popularity = EXCLUDED.popularity,
        preview_url = EXCLUDED.preview_url,
        external_urls = EXCLUDED.external_urls,
        danceability = EXCLUDED.danceability,
        energy = EXCLUDED.energy,
        key = EXCLUDED.key,
        loudness = EXCLUDED.loudness,
        mode = EXCLUDED.mode,
        speechiness = EXCLUDED.speechiness,
        acousticness = EXCLUDED.acousticness,
        instrumentalness = EXCLUDED.instrumentalness,
        liveness = EXCLUDED.liveness,
        valence = EXCLUDED.valence,
        tempo = EXCLUDED.tempo,
        time_signature = EXCLUDED.time_signature,
        audio_features_synced = EXCLUDED.audio_features_synced,
        updated_at = NOW()
      RETURNING *;
    `;
    
    const result = await db.query(query, [
      trackData.id,
      trackData.name,
      trackData.artists?.[0]?.id,
      trackData.album?.id,
      trackData.track_number,
      trackData.disc_number || 1,
      trackData.duration_ms,
      trackData.explicit || false,
      trackData.popularity || 0,
      trackData.preview_url,
      JSON.stringify(trackData.external_urls || {}),
      audioFeatures?.danceability,
      audioFeatures?.energy,
      audioFeatures?.key,
      audioFeatures?.loudness,
      audioFeatures?.mode,
      audioFeatures?.speechiness,
      audioFeatures?.acousticness,
      audioFeatures?.instrumentalness,
      audioFeatures?.liveness,
      audioFeatures?.valence,
      audioFeatures?.tempo,
      audioFeatures?.time_signature,
      !!audioFeatures
    ]);
    
    return result.rows[0];
  }

  // Liked songs operations
  async saveLikedSong(userId, trackId, likedAt) {
    const query = `
      INSERT INTO user_liked_songs (user_id, track_id, liked_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, track_id) DO UPDATE SET
        liked_at = EXCLUDED.liked_at,
        created_at = NOW()
      RETURNING *;
    `;
    
    const result = await db.query(query, [userId, trackId, new Date(likedAt)]);
    return result.rows[0];
  }

  async getUserLikedSongs(userId, limit = 50, offset = 0) {
    const query = `
      SELECT 
        uls.*,
        t.name as track_name,
        t.duration_ms,
        t.explicit,
        t.popularity,
        t.danceability,
        t.energy,
        t.valence,
        t.acousticness,
        t.tempo,
        a.name as artist_name,
        al.name as album_name
      FROM user_liked_songs uls
      JOIN tracks t ON uls.track_id = t.id
      LEFT JOIN artists a ON t.artist_id = a.id
      LEFT JOIN albums al ON t.album_id = al.id
      WHERE uls.user_id = $1
      ORDER BY uls.liked_at DESC
      LIMIT $2 OFFSET $3;
    `;
    
    const result = await db.query(query, [userId, limit, offset]);
    return result.rows;
  }

  // Sync status operations
  async updateSyncStatus(userId, syncType, status, progress = {}) {
    const query = `
      INSERT INTO sync_status (user_id, sync_type, status, total_items, synced_items, failed_items, error_message)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id, sync_type) DO UPDATE SET
        status = EXCLUDED.status,
        total_items = EXCLUDED.total_items,
        synced_items = EXCLUDED.synced_items,
        failed_items = EXCLUDED.failed_items,
        error_message = EXCLUDED.error_message,
        last_sync_at = CASE WHEN EXCLUDED.status = 'completed' THEN NOW() ELSE sync_status.last_sync_at END,
        updated_at = NOW()
      RETURNING *;
    `;
    
    const result = await db.query(query, [
      userId,
      syncType,
      status,
      progress.total || 0,
      progress.synced || 0,
      progress.failed || 0,
      progress.error || null
    ]);
    
    return result.rows[0];
  }

  async getSyncStatus(userId, syncType = null) {
    const query = syncType
      ? 'SELECT * FROM sync_status WHERE user_id = $1 AND sync_type = $2'
      : 'SELECT * FROM sync_status WHERE user_id = $1 ORDER BY updated_at DESC';
    
    const params = syncType ? [userId, syncType] : [userId];
    const result = await db.query(query, params);
    
    return syncType ? result.rows[0] : result.rows;
  }

  // Health check
  async healthCheck() {
    return await db.healthCheck();
  }

  // Get connection status
  getStatus() {
    return {
      initialized: this.initialized,
      ...db.getStatus()
    };
  }
}

export default new DatabaseService();
