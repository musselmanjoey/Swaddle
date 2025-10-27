// CommonJS database service for Electron main process
const { Pool } = require('pg');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

class DatabaseMainService {
  constructor() {
    this.pool = null;
    this.initialized = false;
    console.log('🗄️ [DB-MAIN] Database service created');
  }

  // Initialize PostgreSQL connection
  async initialize() {
    if (this.initialized && this.pool) return true;
    
    try {
      console.log('🚀 [DB-MAIN] Initializing PostgreSQL connection...');
      console.log('🔧 [DB-MAIN] Connection details:', {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'swaddle',
        user: process.env.DB_USER || 'postgres'
      });

      this.pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'swaddle',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Test connection
      const client = await this.pool.connect();
      console.log('✅ [DB-MAIN] PostgreSQL connected successfully');
      client.release();
      
      this.initialized = true;
      return true;
      
    } catch (error) {
      console.error('❌ [DB-MAIN] PostgreSQL connection failed:', error.message);
      this.initialized = false;
      return false;
    }
  }

  // Health check
  async healthCheck() {
    console.log('🏥 [DB-MAIN] Running health check...');
    
    if (!this.pool) {
      await this.initialize();
    }
    
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      
      console.log('✅ [DB-MAIN] Health check passed:', result.rows[0].now);
      return { 
        connected: true, 
        timestamp: result.rows[0].now,
        initialized: this.initialized 
      };
      
    } catch (error) {
      console.error('❌ [DB-MAIN] Health check failed:', error.message);
      return { 
        connected: false, 
        error: error.message,
        initialized: false 
      };
    }
  }

  // Save liked song with enhanced debugging
  async saveLikedSong(userId, songData) {
    console.log(`\n💾 [DB-MAIN] ===== SAVING LIKED SONG =====`);
    console.log(`👤 [DB-MAIN] User ID: ${userId}`);
    console.log(`🎵 [DB-MAIN] Full song data:`, JSON.stringify(songData, null, 2));
    console.log(`🎵 [DB-MAIN] Key fields:`, {
      spotify_id: songData.spotify_id,
      track_name: songData.track_name,
      artist_name: songData.artist_name,
      album_name: songData.album_name,
      duration_ms: songData.duration_ms,
      added_at: songData.added_at
    });

    if (!this.pool) {
      console.log(`🔄 [DB-MAIN] Pool not initialized, initializing...`);
      await this.initialize();
    }

    const client = await this.pool.connect();
    console.log(`🔗 [DB-MAIN] Database client connected`);
    
    try {
      console.log(`🚀 [DB-MAIN] Starting transaction...`);
      await client.query('BEGIN');

      // Step 1: Ensure user exists
      console.log(`\n👤 [DB-MAIN] Step 1: Ensuring user exists...`);
      const userResult = await client.query(`
        INSERT INTO users (id, display_name) 
        VALUES ($1, $2) 
        ON CONFLICT (id) DO NOTHING
        RETURNING id
      `, [userId, userId]);
      
      if (userResult.rows.length > 0) {
        console.log(`✅ [DB-MAIN] User created: ${userId}`);
      } else {
        console.log(`✅ [DB-MAIN] User already exists: ${userId}`);
      }

      // Step 2: Create artist if doesn't exist
      console.log(`\n🎤 [DB-MAIN] Step 2: Processing artist...`);
      let artistId = null;
      if (songData.artist_name) {
        artistId = songData.artist_name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        console.log(`🎤 [DB-MAIN] Generated artist ID: ${artistId}`);
        
        const artistResult = await client.query(`
          INSERT INTO artists (id, name) 
          VALUES ($1, $2) 
          ON CONFLICT (id) DO NOTHING
          RETURNING id
        `, [artistId, songData.artist_name]);
        
        if (artistResult.rows.length > 0) {
          console.log(`✅ [DB-MAIN] Artist created: ${songData.artist_name}`);
        } else {
          console.log(`✅ [DB-MAIN] Artist already exists: ${songData.artist_name}`);
          // Verify the artist exists
          const existingArtist = await client.query(`
            SELECT id FROM artists WHERE id = $1
          `, [artistId]);
          if (existingArtist.rows.length === 0) {
            console.error(`❌ [DB-MAIN] Artist not found after insert: ${artistId}`);
          }
        }
      } else {
        console.warn(`⚠️ [DB-MAIN] No artist name provided`);
      }

      // Step 3: Create album if doesn't exist
      console.log(`\n💿 [DB-MAIN] Step 3: Processing album...`);
      let albumId = null;
      if (songData.album_name && artistId) {
        albumId = `${artistId}-${songData.album_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        console.log(`💿 [DB-MAIN] Generated album ID: ${albumId}`);
        
        const albumResult = await client.query(`
          INSERT INTO albums (id, name, artist_id, images) 
          VALUES ($1, $2, $3, $4) 
          ON CONFLICT (id) DO NOTHING
          RETURNING id
        `, [
          albumId,
          songData.album_name, 
          artistId,
          songData.album_image_url ? JSON.stringify([{url: songData.album_image_url}]) : null
        ]);
        
        if (albumResult.rows.length > 0) {
          console.log(`✅ [DB-MAIN] Album created: ${songData.album_name}`);
        } else {
          console.log(`✅ [DB-MAIN] Album already exists: ${songData.album_name}`);
        }
      } else {
        console.warn(`⚠️ [DB-MAIN] No album name or artist ID for album creation`);
      }

      // Step 4: Save the track
      console.log(`\n🎵 [DB-MAIN] Step 4: Saving track...`);
      console.log(`🎵 [DB-MAIN] Track details:`, {
        id: songData.spotify_id,
        name: songData.track_name,
        artist_id: artistId,
        album_id: albumId,
        duration_ms: songData.duration_ms,
        preview_url: songData.preview_url
      });
      
      const trackResult = await client.query(`
        INSERT INTO tracks (id, name, artist_id, album_id, duration_ms, preview_url) 
        VALUES ($1, $2, $3, $4, $5, $6) 
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          artist_id = EXCLUDED.artist_id,
          album_id = EXCLUDED.album_id,
          duration_ms = EXCLUDED.duration_ms,
          preview_url = EXCLUDED.preview_url,
          updated_at = NOW()
        RETURNING id
      `, [
        songData.spotify_id,
        songData.track_name,
        artistId,
        albumId,
        songData.duration_ms,
        songData.preview_url
      ]);
      
      console.log(`✅ [DB-MAIN] Track saved with ID: ${trackResult.rows[0].id}`);

      // Step 5: Save user liked song relationship
      console.log(`\n❤️ [DB-MAIN] Step 5: Saving liked song relationship...`);
      const likedAt = songData.added_at || new Date().toISOString();
      console.log(`❤️ [DB-MAIN] Liked at timestamp: ${likedAt}`);
      
      const likedSongResult = await client.query(`
        INSERT INTO user_liked_songs (user_id, track_id, liked_at) 
        VALUES ($1, $2, $3) 
        ON CONFLICT (user_id, track_id) DO UPDATE SET
          liked_at = EXCLUDED.liked_at,
          created_at = NOW()
        RETURNING id, user_id, track_id, liked_at
      `, [userId, songData.spotify_id, likedAt]);
      
      console.log(`✅ [DB-MAIN] Liked song relationship saved:`, likedSongResult.rows[0]);

      // Step 6: Commit transaction
      console.log(`\n✅ [DB-MAIN] Step 6: Committing transaction...`);
      await client.query('COMMIT');
      
      console.log(`🎉 [DB-MAIN] ===== SONG SAVED SUCCESSFULLY =====`);
      console.log(`🎉 [DB-MAIN] Song: ${songData.track_name} by ${songData.artist_name}`);
      console.log(`🎉 [DB-MAIN] Spotify ID: ${songData.spotify_id}`);
      console.log(`🎉 [DB-MAIN] User: ${userId}`);
      console.log(`🎉 [DB-MAIN] Liked song record ID: ${likedSongResult.rows[0].id}\n`);
      
      return {
        success: true,
        spotify_id: songData.spotify_id,
        user_id: userId,
        saved_at: likedSongResult.rows[0].liked_at,
        record_id: likedSongResult.rows[0].id
      };

    } catch (error) {
      console.error(`\n❌ [DB-MAIN] ===== SAVE OPERATION FAILED =====`);
      console.error(`❌ [DB-MAIN] Error details:`, error);
      console.error(`❌ [DB-MAIN] Error message:`, error.message);
      console.error(`❌ [DB-MAIN] Error stack:`, error.stack);
      console.error(`❌ [DB-MAIN] Song data that failed:`, JSON.stringify(songData, null, 2));
      
      console.log(`🔄 [DB-MAIN] Rolling back transaction...`);
      await client.query('ROLLBACK');
      console.log(`✅ [DB-MAIN] Transaction rolled back`);
      
      throw error;
      
    } finally {
      console.log(`🔗 [DB-MAIN] Releasing database client`);
      client.release();
    }
  }

  // Get user liked songs with enhanced debugging
  async getUserLikedSongs(userId) {
    console.log(`\n🎵 [DB-MAIN] ===== GETTING LIKED SONGS =====`);
    console.log(`👤 [DB-MAIN] User ID: ${userId}`);

    if (!this.pool) {
      console.log(`🔄 [DB-MAIN] Pool not initialized, initializing...`);
      await this.initialize();
    }

    try {
      console.log(`🔍 [DB-MAIN] Executing query to get liked songs...`);
      const result = await this.pool.query(`
        SELECT 
          t.id as spotify_id,
          t.name as track_name,
          a.name as artist_name,
          alb.name as album_name,
          t.duration_ms,
          t.preview_url,
          uls.liked_at as added_at,
          uls.id as liked_song_record_id
        FROM user_liked_songs uls
        JOIN tracks t ON uls.track_id = t.id
        JOIN artists a ON t.artist_id = a.id
        LEFT JOIN albums alb ON t.album_id = alb.id
        WHERE uls.user_id = $1
        ORDER BY uls.liked_at DESC
      `, [userId]);

      console.log(`📊 [DB-MAIN] Query executed successfully`);
      console.log(`📊 [DB-MAIN] Raw result row count: ${result.rows.length}`);
      
      if (result.rows.length > 0) {
        console.log(`📊 [DB-MAIN] Sample first row:`, result.rows[0]);
        console.log(`📊 [DB-MAIN] Sample last row:`, result.rows[result.rows.length - 1]);
      } else {
        console.warn(`⚠️ [DB-MAIN] No liked songs found for user: ${userId}`);
        
        // Let's check if user exists and has any data
        console.log(`🔍 [DB-MAIN] Checking if user exists...`);
        const userCheck = await this.pool.query('SELECT id FROM users WHERE id = $1', [userId]);
        console.log(`📊 [DB-MAIN] User exists: ${userCheck.rows.length > 0}`);
        
        console.log(`🔍 [DB-MAIN] Checking user_liked_songs table...`);
        const likedCheck = await this.pool.query('SELECT COUNT(*) as count FROM user_liked_songs WHERE user_id = $1', [userId]);
        console.log(`📊 [DB-MAIN] User liked songs count: ${likedCheck.rows[0].count}`);
        
        console.log(`🔍 [DB-MAIN] Checking tracks table...`);
        const trackCheck = await this.pool.query('SELECT COUNT(*) as count FROM tracks');
        console.log(`📊 [DB-MAIN] Total tracks in database: ${trackCheck.rows[0].count}`);
        
        console.log(`🔍 [DB-MAIN] Checking artists table...`);
        const artistCheck = await this.pool.query('SELECT COUNT(*) as count FROM artists');
        console.log(`📊 [DB-MAIN] Total artists in database: ${artistCheck.rows[0].count}`);
      }

      const formattedResults = result.rows.map(row => {
        const formatted = {
          spotify_id: row.spotify_id,
          track_name: row.track_name,
          artist_name: row.artist_name,
          album_name: row.album_name,
          duration_ms: row.duration_ms,
          preview_url: row.preview_url,
          added_at: row.added_at,
          liked_song_record_id: row.liked_song_record_id
        };
        return formatted;
      });
      
      console.log(`✅ [DB-MAIN] ===== LIKED SONGS RETRIEVED =====`);
      console.log(`✅ [DB-MAIN] Retrieved ${formattedResults.length} liked songs`);
      if (formattedResults.length > 0) {
        console.log(`✅ [DB-MAIN] First song: ${formattedResults[0].track_name} by ${formattedResults[0].artist_name}`);
        console.log(`✅ [DB-MAIN] Last song: ${formattedResults[formattedResults.length - 1].track_name} by ${formattedResults[formattedResults.length - 1].artist_name}`);
      }
      console.log(`\n`);
      
      return formattedResults;

    } catch (error) {
      console.error(`\n❌ [DB-MAIN] ===== GET LIKED SONGS FAILED =====`);
      console.error(`❌ [DB-MAIN] Error details:`, error);
      console.error(`❌ [DB-MAIN] Error message:`, error.message);
      console.error(`❌ [DB-MAIN] User ID that failed: ${userId}`);
      console.error(`\n`);
      throw error;
    }
  }

  // Save lyrics analysis
  async saveLyricsAnalysis(trackId, lyricsData) {
    console.log(`🎭 [DB-MAIN] Saving lyrics analysis for track: ${trackId}`);

    if (!this.pool) {
      await this.initialize();
    }

    try {
      const result = await this.pool.query(`
        INSERT INTO lyrics (track_id, genius_id, genius_url, themes, sentiment_score, language, word_count, has_explicit_content)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (track_id) DO UPDATE SET
          genius_id = EXCLUDED.genius_id,
          genius_url = EXCLUDED.genius_url,
          themes = EXCLUDED.themes,
          sentiment_score = EXCLUDED.sentiment_score,
          language = EXCLUDED.language,
          word_count = EXCLUDED.word_count,
          has_explicit_content = EXCLUDED.has_explicit_content,
          fetched_at = NOW()
        RETURNING track_id
      `, [
        trackId,
        lyricsData.genius_id,
        lyricsData.genius_url,
        lyricsData.themes,
        lyricsData.sentiment_score,
        lyricsData.language,
        lyricsData.word_count,
        lyricsData.has_explicit_content
      ]);

      console.log(`✅ [DB-MAIN] Lyrics analysis saved for track: ${trackId}`);
      return { success: true, track_id: trackId };

    } catch (error) {
      console.error(`❌ [DB-MAIN] Failed to save lyrics analysis for ${trackId}:`, error.message);
      throw error;
    }
  }

  // Get lyrics analysis for multiple tracks
  async getLyricsAnalysis(trackIds) {
    console.log(`🎭 [DB-MAIN] Getting lyrics analysis for ${trackIds.length} tracks`);

    if (!this.pool) {
      await this.initialize();
    }

    try {
      const result = await this.pool.query(`
        SELECT 
          track_id,
          genius_id,
          genius_url,
          themes,
          sentiment_score,
          language,
          word_count,
          has_explicit_content,
          fetched_at
        FROM lyrics
        WHERE track_id = ANY($1::text[])
      `, [trackIds]);

      console.log(`✅ [DB-MAIN] Retrieved lyrics analysis for ${result.rows.length} tracks`);
      return result.rows;

    } catch (error) {
      console.error('❌ [DB-MAIN] Failed to get lyrics analysis:', error.message);
      throw error;
    }
  }

  // === PLAYLIST ENHANCER METHODS ===

  // Get user's enhanced playlists
  async getUserEnhancedPlaylists(userId) {
    console.log(`🚀 [DB-MAIN] Getting enhanced playlists for user: ${userId}`);

    if (!this.pool) {
      await this.initialize();
    }

    try {
      const result = await this.pool.query(
        'SELECT * FROM get_user_enhanced_playlists($1)',
        [userId]
      );

      console.log(`✅ [DB-MAIN] Retrieved ${result.rows.length} enhanced playlists`);
      return result.rows;

    } catch (error) {
      console.error('❌ [DB-MAIN] Failed to get enhanced playlists:', error.message);
      throw error;
    }
  }

  // Save enhancement session
  async saveEnhancementSession(sessionData) {
    console.log(`💾 [DB-MAIN] Saving enhancement session for playlist: ${sessionData.playlistName}`);

    if (!this.pool) {
      await this.initialize();
    }

    try {
      // First, ensure the user exists in the users table
      console.log(`👤 [DB-MAIN] Ensuring user exists: ${sessionData.userId}`);
      
      await this.pool.query(`
        INSERT INTO users (id, display_name, created_at, updated_at)
        VALUES ($1, $1, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `, [sessionData.userId]);
      
      console.log(`✅ [DB-MAIN] User ensured in database`);
      
      // Now save the enhancement session
      const result = await this.pool.query(`
        SELECT save_enhancement_session($1, $2, $3, $4, $5, $6, $7) as session_id
      `, [
        sessionData.userId,
        sessionData.spotifyPlaylistId,
        sessionData.playlistName,
        sessionData.sessionType,
        sessionData.seedTracks,
        sessionData.recommendedTracks,
        sessionData.addedTracks
      ]);

      const sessionId = result.rows[0].session_id;
      console.log(`✅ [DB-MAIN] Saved enhancement session with ID: ${sessionId}`);
      return sessionId;

    } catch (error) {
      console.error('❌ [DB-MAIN] Failed to save enhancement session:', error.message);
      throw error;
    }
  }

  // Get recommendations based on seed tracks (core recommendation engine)
  async getRecommendations(seedTracks, sourceType, userId, limit = 10) {
    console.log(`🎵 [DB-MAIN] Getting ${limit} recommendations from ${sourceType}`);

    if (!this.pool) {
      await this.initialize();
    }

    try {
      let query;
      let params;

      if (sourceType === 'liked_songs') {
        // Recommend from user's liked songs
        query = `
          SELECT 
            trd.*,
            uls.liked_at
          FROM track_recommendation_data trd
          JOIN user_liked_songs uls ON trd.track_id = uls.track_id
          WHERE uls.user_id = $1
            AND trd.track_id != ALL($2::text[])
          ORDER BY 
            trd.combined_popularity_score DESC,
            uls.liked_at DESC
          LIMIT $3
        `;
        params = [userId, seedTracks, limit];
      } else {
        // Recommend from all music (excluding seed tracks)
        query = `
          SELECT trd.*
          FROM track_recommendation_data trd
          WHERE trd.track_id != ALL($1::text[])
          ORDER BY trd.combined_popularity_score DESC
          LIMIT $2
        `;
        params = [seedTracks, limit];
      }

      const result = await this.pool.query(query, params);

      console.log(`✅ [DB-MAIN] Retrieved ${result.rows.length} recommendations`);
      return result.rows;

    } catch (error) {
      console.error('❌ [DB-MAIN] Failed to get recommendations:', error.message);
      throw error;
    }
  }

  // Check if playlist is enhanced
  async isPlaylistEnhanced(userId, spotifyPlaylistId) {
    console.log(`🔍 [DB-MAIN] Checking if playlist is enhanced: ${spotifyPlaylistId}`);

    if (!this.pool) {
      await this.initialize();
    }

    try {
      const result = await this.pool.query(`
        SELECT id, enhancement_count, last_enhanced_at
        FROM enhanced_playlists
        WHERE user_id = $1 AND spotify_playlist_id = $2
      `, [userId, spotifyPlaylistId]);

      const isEnhanced = result.rows.length > 0;
      console.log(`✅ [DB-MAIN] Playlist enhanced status: ${isEnhanced}`);
      
      return isEnhanced ? result.rows[0] : null;

    } catch (error) {
      console.error('❌ [DB-MAIN] Failed to check playlist enhancement status:', error.message);
      throw error;
    }
  }

  // Save Genius song data
  async saveGeniusSongData(trackId, geniusData) {
    console.log(`🎭 [DB-MAIN] Saving Genius data for track: ${trackId}`);

    if (!this.pool) {
      await this.initialize();
    }

    try {
      const result = await this.pool.query(`
        INSERT INTO genius_song_data (
          track_id, genius_id, genius_url, pageviews, 
          annotation_count, chart_genre, tags
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (track_id) 
        DO UPDATE SET
          genius_id = EXCLUDED.genius_id,
          genius_url = EXCLUDED.genius_url,
          pageviews = EXCLUDED.pageviews,
          annotation_count = EXCLUDED.annotation_count,
          chart_genre = EXCLUDED.chart_genre,
          tags = EXCLUDED.tags,
          last_updated = NOW()
        RETURNING id
      `, [
        trackId,
        geniusData.geniusId,
        geniusData.geniusUrl,
        geniusData.pageviews || 0,
        geniusData.annotationCount || 0,
        geniusData.chartGenre,
        geniusData.tags || []
      ]);

      console.log(`✅ [DB-MAIN] Saved Genius data for track: ${trackId}`);
      return result.rows[0].id;

    } catch (error) {
      console.error(`❌ [DB-MAIN] Failed to save Genius data for ${trackId}:`, error.message);
      throw error;
    }
  }

  // === SMART SYNC METHODS ===

  // Analyze what data is missing for intelligent syncing
  async analyzeMissingData(userId) {
    console.log(`🔍 [DB-MAIN] Analyzing missing data for user: ${userId}`);

    if (!this.pool) {
      await this.initialize();
    }

    try {
      // Get comprehensive data analysis
      const result = await this.pool.query(`
        WITH user_tracks AS (
          SELECT t.* 
          FROM tracks t
          JOIN user_liked_songs uls ON t.id = uls.track_id
          WHERE uls.user_id = $1
        ),
        missing_audio AS (
          SELECT id, name, artist_id 
          FROM user_tracks 
          WHERE audio_features_synced = false 
             OR danceability IS NULL 
             OR energy IS NULL 
             OR tempo IS NULL
        ),
        missing_genius AS (
          SELECT ut.id, ut.name, ut.artist_id
          FROM user_tracks ut
          LEFT JOIN genius_song_data gsd ON ut.id = gsd.track_id
          WHERE gsd.track_id IS NULL
        ),
        stale_data AS (
          SELECT ut.id, ut.name, ut.artist_id
          FROM user_tracks ut
          LEFT JOIN genius_song_data gsd ON ut.id = gsd.track_id
          WHERE gsd.last_updated < NOW() - INTERVAL '7 days'
        )
        SELECT 
          (SELECT COUNT(*) FROM user_tracks) as total_tracks,
          (SELECT COUNT(*) FROM missing_audio) as missing_audio_features,
          (SELECT COUNT(*) FROM missing_genius) as missing_genius_data,
          (SELECT COUNT(*) FROM stale_data) as stale_data,
          (SELECT json_agg(json_build_object('id', id, 'name', name, 'artist_id', artist_id)) FROM missing_audio) as tracks_needing_audio_features,
          (SELECT json_agg(json_build_object('id', id, 'name', name, 'artist_id', artist_id)) FROM missing_genius) as tracks_needing_genius_data
      `, [userId]);

      const analysis = result.rows[0];
      
      console.log(`✅ [DB-MAIN] Analysis complete:`);
      console.log(`   Total tracks: ${analysis.total_tracks}`);
      console.log(`   Missing audio features: ${analysis.missing_audio_features}`);
      console.log(`   Missing Genius data: ${analysis.missing_genius_data}`);
      console.log(`   Stale data: ${analysis.stale_data}`);
      
      return {
        totalTracks: parseInt(analysis.total_tracks),
        missingAudioFeatures: parseInt(analysis.missing_audio_features),
        missingGeniusData: parseInt(analysis.missing_genius_data),
        staleData: parseInt(analysis.stale_data),
        tracksNeedingAudioFeatures: analysis.tracks_needing_audio_features || [],
        tracksNeedingGeniusData: analysis.tracks_needing_genius_data || []
      };
      
    } catch (error) {
      console.error('❌ [DB-MAIN] Failed to analyze missing data:', error.message);
      throw error;
    }
  }

  // Smart Spotify data sync (only sync what's needed)
  async smartSyncSpotifyData(options) {
    console.log(`🎵 [DB-MAIN] Smart Spotify sync starting...`);

    if (!this.pool) {
      await this.initialize();
    }

    try {
      // This would integrate with existing Spotify sync logic
      // For now, return a mock response
      const { userId, forceResync, trackIds } = options;
      
      console.log(`🎵 [DB-MAIN] Syncing ${trackIds?.length || 'all'} tracks for user: ${userId}`);
      
      // TODO: Implement actual Spotify API calls for specific tracks
      // This should call the existing liked songs sync but filtered to specific tracks
      
      return {
        synced: trackIds?.length || 0,
        success: true
      };
      
    } catch (error) {
      console.error('❌ [DB-MAIN] Smart Spotify sync failed:', error.message);
      throw error;
    }
  }

  // Smart Genius batch sync (process tracks in batches)
  async smartSyncGeniusBatch(options) {
    console.log(`🎭 [DB-MAIN] Smart Genius batch sync starting...`);

    if (!this.pool) {
      await this.initialize();
    }

    try {
      const { userId, trackIds, forceResync } = options;
      
      console.log(`🎭 [DB-MAIN] Processing Genius data for ${trackIds.length} tracks`);
      
      // TODO: Implement actual Genius API calls for specific tracks
      // This should call the existing Genius sync but filtered to specific tracks
      
      let processed = 0;
      for (const trackId of trackIds) {
        try {
          // Simulate Genius API call
          await new Promise(resolve => setTimeout(resolve, 100));
          processed++;
        } catch (trackError) {
          console.warn(`⚠️ [DB-MAIN] Failed to process track ${trackId}:`, trackError.message);
        }
      }
      
      return {
        processed,
        total: trackIds.length,
        success: true
      };
      
    } catch (error) {
      console.error('❌ [DB-MAIN] Smart Genius batch sync failed:', error.message);
      throw error;
    }
  }

  // === DEBUG SYNC METHODS ===

  // Get tracks missing audio features (for debug)
  async getTracksMissingAudioFeatures(userId, limit = 10) {
    console.log(`🔎 [DB-MAIN] Getting ${limit} tracks missing audio features for user: ${userId}`);

    if (!this.pool) {
      await this.initialize();
    }

    try {
      const result = await this.pool.query(`
        SELECT t.id, t.name, a.name as artist_name, t.audio_features_synced
        FROM tracks t
        JOIN user_liked_songs uls ON t.id = uls.track_id
        JOIN artists a ON t.artist_id = a.id
        WHERE uls.user_id = $1 
          AND (t.audio_features_synced = false OR t.danceability IS NULL)
        ORDER BY t.name
        LIMIT $2
      `, [userId, limit]);

      console.log(`✅ [DB-MAIN] Found ${result.rows.length} tracks missing audio features`);
      return result.rows;

    } catch (error) {
      console.error('❌ [DB-MAIN] Failed to get tracks missing audio features:', error.message);
      throw error;
    }
  }

  // Get tracks missing Genius data (for debug)
  async getTracksMissingGeniusData(userId, limit = 10) {
    console.log(`🔎 [DB-MAIN] Getting ${limit} tracks missing Genius data for user: ${userId}`);

    if (!this.pool) {
      await this.initialize();
    }

    try {
      const result = await this.pool.query(`
        SELECT t.id, t.name, a.name as artist_name
        FROM tracks t
        JOIN user_liked_songs uls ON t.id = uls.track_id
        JOIN artists a ON t.artist_id = a.id
        LEFT JOIN genius_song_data gsd ON t.id = gsd.track_id
        WHERE uls.user_id = $1 AND gsd.track_id IS NULL
        ORDER BY t.name
        LIMIT $2
      `, [userId, limit]);

      console.log(`✅ [DB-MAIN] Found ${result.rows.length} tracks missing Genius data`);
      return result.rows;

    } catch (error) {
      console.error('❌ [DB-MAIN] Failed to get tracks missing Genius data:', error.message);
      throw error;
    }
  }

  // Sync audio features for a single track (debug)
  async syncSingleTrackAudioFeatures(trackId) {
    console.log(`🔎 [DB-MAIN] Syncing audio features for track: ${trackId}`);

    if (!this.pool) {
      await this.initialize();
    }

    try {
      // This is a placeholder - you'll need to implement actual Spotify API call
      // For now, let's simulate the process and see if we can update the database
      
      console.log(`🔎 [DB-MAIN] Would call Spotify API for track: ${trackId}`);
      
      // TODO: Replace with actual Spotify API call
      // const audioFeatures = await spotifyAPI.getAudioFeatures(trackId);
      
      // For debugging, let's use mock data
      const mockAudioFeatures = {
        danceability: Math.random(),
        energy: Math.random(),
        valence: Math.random(),
        tempo: 100 + Math.random() * 80,
        acousticness: Math.random(),
        instrumentalness: Math.random(),
        liveness: Math.random(),
        speechiness: Math.random(),
        key: Math.floor(Math.random() * 12),
        mode: Math.floor(Math.random() * 2),
        loudness: -20 + Math.random() * 15,
        time_signature: 4
      };
      
      console.log(`🔎 [DB-MAIN] Mock audio features:`, mockAudioFeatures);
      
      // Update the track with audio features
      const updateResult = await this.pool.query(`
        UPDATE tracks 
        SET 
          danceability = $2,
          energy = $3,
          valence = $4,
          tempo = $5,
          acousticness = $6,
          instrumentalness = $7,
          liveness = $8,
          speechiness = $9,
          key = $10,
          mode = $11,
          loudness = $12,
          time_signature = $13,
          audio_features_synced = true,
          updated_at = NOW()
        WHERE id = $1
        RETURNING id, name
      `, [
        trackId,
        mockAudioFeatures.danceability,
        mockAudioFeatures.energy,
        mockAudioFeatures.valence,
        mockAudioFeatures.tempo,
        mockAudioFeatures.acousticness,
        mockAudioFeatures.instrumentalness,
        mockAudioFeatures.liveness,
        mockAudioFeatures.speechiness,
        mockAudioFeatures.key,
        mockAudioFeatures.mode,
        mockAudioFeatures.loudness,
        mockAudioFeatures.time_signature
      ]);

      if (updateResult.rows.length === 0) {
        throw new Error(`Track ${trackId} not found`);
      }

      console.log(`✅ [DB-MAIN] Audio features updated for: ${updateResult.rows[0].name}`);
      
      return {
        success: true,
        trackId,
        trackName: updateResult.rows[0].name,
        audioFeatures: mockAudioFeatures
      };

    } catch (error) {
      console.error(`❌ [DB-MAIN] Failed to sync audio features for ${trackId}:`, error.message);
      return {
        success: false,
        trackId,
        error: error.message
      };
    }
  }

  // Sync Genius data for a single track (debug)
  async syncSingleTrackGeniusData(trackId, trackName, artistName) {
    console.log(`🔎 [DB-MAIN] Syncing Genius data for: ${trackName} by ${artistName}`);

    if (!this.pool) {
      await this.initialize();
    }

    try {
      // This is a placeholder - you'll need to implement actual Genius API call
      console.log(`🔎 [DB-MAIN] Would call Genius API for: ${trackName} by ${artistName}`);
      
      // TODO: Replace with actual Genius API call
      // const geniusData = await geniusAPI.searchSong(trackName, artistName);
      
      // For debugging, let's use mock data
      const mockGeniusData = {
        genius_id: Math.floor(Math.random() * 1000000),
        genius_url: `https://genius.com/songs/${Math.floor(Math.random() * 1000000)}`,
        pageviews: Math.floor(Math.random() * 100000),
        annotation_count: Math.floor(Math.random() * 50),
        tags: ['rock', 'alternative', 'indie'],
        popularity_score: Math.random() * 100
      };
      
      console.log(`🔎 [DB-MAIN] Mock Genius data:`, mockGeniusData);
      
      // Insert Genius data
      const insertResult = await this.pool.query(`
        INSERT INTO genius_song_data (
          track_id, genius_id, genius_url, pageviews, 
          annotation_count, tags, popularity_score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (track_id) 
        DO UPDATE SET
          genius_id = EXCLUDED.genius_id,
          genius_url = EXCLUDED.genius_url,
          pageviews = EXCLUDED.pageviews,
          annotation_count = EXCLUDED.annotation_count,
          tags = EXCLUDED.tags,
          popularity_score = EXCLUDED.popularity_score,
          last_updated = NOW()
        RETURNING track_id
      `, [
        trackId,
        mockGeniusData.genius_id,
        mockGeniusData.genius_url,
        mockGeniusData.pageviews,
        mockGeniusData.annotation_count,
        mockGeniusData.tags,
        mockGeniusData.popularity_score
      ]);

      console.log(`✅ [DB-MAIN] Genius data saved for: ${trackName}`);
      
      return {
        success: true,
        trackId,
        trackName,
        artistName,
        geniusData: mockGeniusData
      };

    } catch (error) {
      console.error(`❌ [DB-MAIN] Failed to sync Genius data for ${trackName}:`, error.message);
      return {
        success: false,
        trackId,
        trackName,
        artistName,
        error: error.message
      };
    }
  }

  // Get tracks missing audio features for debug sync (limit 10)
  async getTracksNeedingAudioFeaturesDebug() {
    const query = `
      SELECT t.id, t.name, a.name as artist_name
      FROM tracks t
      JOIN artists a ON t.artist_id = a.id
      WHERE t.audio_features_synced = false
      ORDER BY t.created_at ASC
      LIMIT 10
    `;
    const result = await this.pool.query(query);
    console.log(`🔍 [DEBUG] Found ${result.rows.length} tracks needing audio features`);
    return result.rows;
  }

  // Get tracks missing Genius data for debug sync (limit 10)
  async getTracksNeedingGeniusDataDebug() {
    const query = `
      SELECT t.id, t.name, a.name as artist_name
      FROM tracks t
      JOIN artists a ON t.artist_id = a.id
      LEFT JOIN genius_song_data gsd ON t.id = gsd.track_id
      WHERE gsd.track_id IS NULL
      ORDER BY t.created_at ASC
      LIMIT 10
    `;
    const result = await this.pool.query(query);
    console.log(`🔍 [DEBUG] Found ${result.rows.length} tracks needing Genius data`);
    return result.rows;
  }

  // Get recommendations based on seed tracks
  async getRecommendations(seedTrackIds, sourceType, userId, limit = 10) {
    console.log(`🎯 [DB-MAIN] Getting ${limit} recommendations from ${sourceType}`);
    console.log(`🎯 [DB-MAIN] Seed tracks:`, seedTrackIds);
    
    if (!this.pool) {
      await this.initialize();
    }
    
    try {
      if (sourceType === 'liked_songs') {
        // Recommend from user's liked songs
        const query = `
          SELECT 
            t.id,
            t.name as track_name,
            a.name as artist_name,
            alb.name as album_name,
            t.danceability,
            t.energy,
            t.valence,
            t.acousticness,
            t.tempo,
            t.popularity as spotify_popularity,
            COALESCE(gsd.popularity_score, 0) as genius_popularity,
            (t.popularity * 0.6 + COALESCE(gsd.popularity_score, 0) * 0.4) as combined_popularity_score
          FROM user_liked_songs uls
          JOIN tracks t ON uls.track_id = t.id
          JOIN artists a ON t.artist_id = a.id
          JOIN albums alb ON t.album_id = alb.id
          LEFT JOIN genius_song_data gsd ON t.id = gsd.track_id
          WHERE uls.user_id = $1
            AND t.id != ALL($2)
            AND t.audio_features_synced = true
          ORDER BY RANDOM()
          LIMIT $3
        `;
        
        const result = await this.pool.query(query, [userId, seedTrackIds, limit]);
        console.log(`✅ [DB-MAIN] Found ${result.rows.length} recommendations from liked songs`);
        return result.rows;
        
      } else {
        // Recommend from all music (for now, still use liked songs but with different scoring)
        // TODO: Implement actual Spotify catalog search
        const query = `
          SELECT 
            t.id,
            t.name as track_name,
            a.name as artist_name,
            alb.name as album_name,
            t.danceability,
            t.energy,
            t.valence,
            t.acousticness,
            t.tempo,
            t.popularity as spotify_popularity,
            COALESCE(gsd.popularity_score, 0) as genius_popularity,
            (t.popularity * 0.4 + COALESCE(gsd.popularity_score, 0) * 0.6) as combined_popularity_score
          FROM tracks t
          JOIN artists a ON t.artist_id = a.id
          JOIN albums alb ON t.album_id = alb.id
          LEFT JOIN genius_song_data gsd ON t.id = gsd.track_id
          WHERE t.id != ALL($1)
            AND t.audio_features_synced = true
          ORDER BY combined_popularity_score DESC
          LIMIT $2
        `;
        
        const result = await this.pool.query(query, [seedTrackIds, limit]);
        console.log(`✅ [DB-MAIN] Found ${result.rows.length} recommendations from all music`);
        return result.rows;
      }
      
    } catch (error) {
      console.error('❌ [DB-MAIN] Failed to get recommendations:', error.message);
      throw error;
    }
  }

  // Get user's enhanced playlists
  async getUserEnhancedPlaylists(userId) {
    console.log(`📁 [DB-MAIN] Getting enhanced playlists for user: ${userId}`);
    
    if (!this.pool) {
      await this.initialize();
    }
    
    try {
      const query = `
        SELECT 
          spotify_playlist_id,
          playlist_name,
          enhancement_count,
          last_enhanced_at,
          created_at
        FROM enhanced_playlists
        WHERE user_id = $1
        ORDER BY last_enhanced_at DESC
      `;
      
      const result = await this.pool.query(query, [userId]);
      console.log(`✅ [DB-MAIN] Found ${result.rows.length} enhanced playlists`);
      return result.rows;
      
    } catch (error) {
      console.error('❌ [DB-MAIN] Failed to get enhanced playlists:', error.message);
      throw error;
    }
  }

  // Save enhancement session
  async saveEnhancementSession(sessionData) {
    console.log(`💾 [DB-MAIN] Saving enhancement session for: ${sessionData.playlistName}`);
    
    if (!this.pool) {
      await this.initialize();
    }
    
    try {
      // First, insert or update the enhanced playlist record
      const playlistQuery = `
        INSERT INTO enhanced_playlists (
          user_id, spotify_playlist_id, playlist_name, enhancement_count, last_enhanced_at
        ) VALUES ($1, $2, $3, 1, NOW())
        ON CONFLICT (user_id, spotify_playlist_id)
        DO UPDATE SET 
          enhancement_count = enhanced_playlists.enhancement_count + 1,
          last_enhanced_at = NOW()
        RETURNING id
      `;
      
      const playlistResult = await this.pool.query(playlistQuery, [
        sessionData.userId,
        sessionData.spotifyPlaylistId,
        sessionData.playlistName
      ]);
      
      const enhancedPlaylistId = playlistResult.rows[0].id;
      
      // Then, save the session details
      const sessionQuery = `
        INSERT INTO playlist_enhancement_sessions (
          enhanced_playlist_id, user_id, session_type, 
          seed_tracks, recommended_tracks, added_tracks
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;
      
      const sessionResult = await this.pool.query(sessionQuery, [
        enhancedPlaylistId,
        sessionData.userId,
        sessionData.sessionType,
        sessionData.seedTracks || [],
        sessionData.recommendedTracks || [],
        sessionData.addedTracks || []
      ]);
      
      const sessionId = sessionResult.rows[0].id;
      console.log(`✅ [DB-MAIN] Saved enhancement session with ID: ${sessionId}`);
      return sessionId;
      
    } catch (error) {
      console.error('❌ [DB-MAIN] Failed to save enhancement session:', error.message);
      throw error;
    }
  }

  // Check if playlist is enhanced
  async isPlaylistEnhanced(userId, spotifyPlaylistId) {
    console.log(`🔍 [DB-MAIN] Checking if playlist is enhanced: ${spotifyPlaylistId}`);
    
    if (!this.pool) {
      await this.initialize();
    }
    
    try {
      const query = `
        SELECT id, enhancement_count, last_enhanced_at
        FROM enhanced_playlists
        WHERE user_id = $1 AND spotify_playlist_id = $2
      `;
      
      const result = await this.pool.query(query, [userId, spotifyPlaylistId]);
      const isEnhanced = result.rows.length > 0;
      
      console.log(`✅ [DB-MAIN] Playlist enhancement status: ${isEnhanced}`);
      return isEnhanced ? result.rows[0] : null;
      
    } catch (error) {
      console.error('❌ [DB-MAIN] Failed to check playlist enhancement status:', error.message);
      throw error;
    }
  }

  // Save Genius song data
  async saveGeniusSongData(trackId, geniusData) {
    console.log(`🎭 [DB-MAIN] Saving Genius data for track: ${trackId}`);
    
    if (!this.pool) {
      await this.initialize();
    }
    
    try {
      const query = `
        INSERT INTO genius_song_data (
          track_id, genius_id, genius_url, pageviews, 
          annotation_count, chart_genre, tags
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (track_id)
        DO UPDATE SET 
          genius_id = $2,
          genius_url = $3,
          pageviews = $4,
          annotation_count = $5,
          chart_genre = $6,
          tags = $7,
          last_updated = NOW()
        RETURNING id
      `;
      
      const result = await this.pool.query(query, [
        trackId,
        geniusData.genius_id || null,
        geniusData.genius_url || null,
        geniusData.pageviews || 0,
        geniusData.annotation_count || 0,
        geniusData.chart_genre || null,
        geniusData.tags || []
      ]);
      
      console.log(`✅ [DB-MAIN] Saved Genius data for track: ${trackId}`);
      return result.rows[0].id;
      
    } catch (error) {
      console.error('❌ [DB-MAIN] Failed to save Genius data:', error.message);
      throw error;
    }
  }

  // Close connection
  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('🔒 [DB-MAIN] Database connection closed');
    }
  }
}

module.exports = new DatabaseMainService();