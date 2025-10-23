import { db } from '../db/connection.js';
import { spotifyService } from '../services/spotifyService.js';

/**
 * Normalize Spotify release dates to PostgreSQL DATE format
 * Spotify returns dates as: "YYYY", "YYYY-MM", or "YYYY-MM-DD"
 * PostgreSQL needs: "YYYY-MM-DD"
 */
function normalizeReleaseDate(releaseDate, precision) {
  if (!releaseDate) return null;

  // Extract year to check validity
  const yearMatch = releaseDate.match(/^(\d{4})/);
  if (!yearMatch) return null;

  const year = parseInt(yearMatch[1]);

  // Invalid years (0, or unreasonably old/future dates)
  if (year < 1000 || year > 2100) {
    return null;
  }

  // Already full date format
  if (releaseDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return releaseDate;
  }

  // Year and month only (e.g., "1965-03")
  if (releaseDate.match(/^\d{4}-\d{2}$/)) {
    return `${releaseDate}-01`;
  }

  // Year only (e.g., "1965")
  if (releaseDate.match(/^\d{4}$/)) {
    return `${releaseDate}-01-01`;
  }

  // Invalid format
  return null;
}

/**
 * Sync liked songs from Spotify to database
 * @param {Object} params - Tool parameters
 * @param {boolean} params.includeAudioFeatures - Whether to fetch audio features (default: true)
 * @returns {Promise<Object>} - Sync results
 */
export async function syncLikedSongs(params = {}) {
  const { includeAudioFeatures = true } = params;

  try {
    console.error('🎵 Starting Spotify liked songs sync...');

    // Step 1: Get current user
    console.error('👤 Fetching user info...');
    const user = await spotifyService.getCurrentUser();
    const userId = user.id;

    // Step 2: Upsert user to database
    await db.query(`
      INSERT INTO users (id, display_name, email, country, followers_count, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (id) DO UPDATE SET
        display_name = $2,
        email = $3,
        country = $4,
        followers_count = $5,
        updated_at = NOW()
    `, [userId, user.display_name, user.email, user.country, user.followers?.total || 0]);

    console.error(`✅ User: ${user.display_name}`);

    // Step 3: Update sync status to 'running'
    await db.query(`
      INSERT INTO sync_status (user_id, sync_type, status, updated_at)
      VALUES ($1, 'liked_songs', 'running', NOW())
      ON CONFLICT (user_id, sync_type) DO UPDATE SET
        status = 'running',
        updated_at = NOW()
    `, [userId]);

    // Step 4: Fetch all liked songs from Spotify
    console.error('🎵 Fetching liked songs from Spotify...');
    let fetchedCount = 0;
    const likedSongs = await spotifyService.getAllLikedSongs((current, total) => {
      fetchedCount = current;
      if (current % 100 === 0 || current === total) {
        console.error(`   Progress: ${current}/${total} songs`);
      }
    });

    console.error(`✅ Fetched ${likedSongs.total} liked songs`);

    // Step 5: Process and store tracks
    console.error('💾 Saving to database...');
    let savedTracks = 0;
    let savedArtists = 0;
    let savedAlbums = 0;
    let savedLikes = 0;

    for (const item of likedSongs.items) {
      const track = item.track;
      const likedAt = item.added_at;

      if (!track || !track.id) continue;

      // Save artist
      const artist = track.artists[0];
      if (artist) {
        await db.query(`
          INSERT INTO artists (id, name, external_urls, created_at, updated_at)
          VALUES ($1, $2, $3, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET
            name = $2,
            external_urls = $3,
            updated_at = NOW()
        `, [artist.id, artist.name, JSON.stringify(artist.external_urls || {})]);
        savedArtists++;
      }

      // Save album
      const album = track.album;
      if (album) {
        const normalizedDate = normalizeReleaseDate(album.release_date, album.release_date_precision);

        await db.query(`
          INSERT INTO albums (id, name, artist_id, release_date, release_date_precision, album_type, total_tracks, external_urls, images, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET
            name = $2,
            artist_id = $3,
            release_date = $4,
            release_date_precision = $5,
            album_type = $6,
            total_tracks = $7,
            external_urls = $8,
            images = $9,
            updated_at = NOW()
        `, [
          album.id,
          album.name,
          artist?.id || null,
          normalizedDate,
          album.release_date_precision || 'year',
          album.album_type,
          album.total_tracks || 0,
          JSON.stringify(album.external_urls || {}),
          JSON.stringify(album.images || [])
        ]);
        savedAlbums++;
      }

      // Save track (without audio features for now)
      await db.query(`
        INSERT INTO tracks (
          id, name, artist_id, album_id, track_number, disc_number,
          duration_ms, explicit, popularity, preview_url, external_urls,
          audio_features_synced, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = $2,
          artist_id = $3,
          album_id = $4,
          track_number = $5,
          disc_number = $6,
          duration_ms = $7,
          explicit = $8,
          popularity = $9,
          preview_url = $10,
          external_urls = $11,
          updated_at = NOW()
      `, [
        track.id,
        track.name,
        artist?.id || null,
        album?.id || null,
        track.track_number || 0,
        track.disc_number || 1,
        track.duration_ms,
        track.explicit || false,
        track.popularity || 0,
        track.preview_url || null,
        JSON.stringify(track.external_urls || {})
      ]);
      savedTracks++;

      // Save user liked song relationship
      await db.query(`
        INSERT INTO user_liked_songs (user_id, track_id, liked_at, added_at, created_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (user_id, track_id) DO UPDATE SET
          liked_at = $3
      `, [userId, track.id, likedAt]);
      savedLikes++;

      // Progress logging
      if (savedTracks % 50 === 0) {
        console.error(`   Saved ${savedTracks}/${likedSongs.total} tracks...`);
      }
    }

    console.error(`✅ Saved ${savedTracks} tracks, ${savedArtists} artists, ${savedAlbums} albums`);

    // Step 6: Fetch audio features if requested
    let audioFeaturesCount = 0;
    if (includeAudioFeatures) {
      console.error('🎼 Fetching audio features...');
      const trackIds = likedSongs.items.map(item => item.track.id).filter(Boolean);

      try {
        const audioFeatures = await spotifyService.getAudioFeatures(trackIds);

        for (const features of audioFeatures) {
          if (!features) continue;

          await db.query(`
            UPDATE tracks SET
              danceability = $2,
              energy = $3,
              key = $4,
              loudness = $5,
              mode = $6,
              speechiness = $7,
              acousticness = $8,
              instrumentalness = $9,
              liveness = $10,
              valence = $11,
              tempo = $12,
              time_signature = $13,
              audio_features_synced = true,
              updated_at = NOW()
            WHERE id = $1
          `, [
            features.id,
            features.danceability,
            features.energy,
            features.key,
            features.loudness,
            features.mode,
            features.speechiness,
            features.acousticness,
            features.instrumentalness,
            features.liveness,
            features.valence,
            features.tempo,
            features.time_signature
          ]);
          audioFeaturesCount++;
        }

        console.error(`✅ Saved audio features for ${audioFeaturesCount} tracks`);
      } catch (audioError) {
        console.error(`⚠️  Failed to fetch audio features (will continue without them): ${audioError.message}`);
        console.error(`   This is OK - your liked songs are still synced!`);
      }
    }

    // Step 7: Update user's last sync timestamp
    await db.query(`
      UPDATE users SET
        last_sync_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
    `, [userId]);

    // Step 8: Update sync status to 'completed'
    await db.query(`
      UPDATE sync_status SET
        last_sync_at = NOW(),
        total_items = $2,
        synced_items = $3,
        failed_items = 0,
        status = 'completed',
        error_message = NULL,
        updated_at = NOW()
      WHERE user_id = $1 AND sync_type = 'liked_songs'
    `, [userId, likedSongs.total, savedTracks]);

    console.error('✅ Sync completed successfully!');

    return {
      success: true,
      user: user.display_name,
      totalLikedSongs: likedSongs.total,
      savedTracks,
      savedArtists,
      savedAlbums,
      audioFeaturesCount,
      message: `Successfully synced ${likedSongs.total} liked songs from Spotify!`
    };

  } catch (error) {
    console.error('❌ Sync failed:', error);

    // Enhanced error details
    let errorDetails = {
      message: error.message,
      type: error.constructor.name,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    };

    // Check for specific error types
    if (error.message.includes('403')) {
      errorDetails.possibleCause = 'Spotify API returned 403 - This could be: expired token, rate limit, or insufficient permissions';
      errorDetails.suggestion = 'Try re-authenticating by running: node auth/getRefreshToken.js';
    } else if (error.message.includes('401')) {
      errorDetails.possibleCause = 'Unauthorized - Access token is invalid or expired';
      errorDetails.suggestion = 'Token needs to be refreshed. Check if refresh token is valid.';
    } else if (error.message.includes('429')) {
      errorDetails.possibleCause = 'Rate limit exceeded';
      errorDetails.suggestion = 'Wait a few minutes and try again.';
    } else if (error.message.includes('refresh token')) {
      errorDetails.possibleCause = 'No refresh token available';
      errorDetails.suggestion = 'Run: node auth/getRefreshToken.js to authenticate';
    }

    // Update sync status to 'failed'
    try {
      const user = await spotifyService.getCurrentUser().catch(() => null);
      if (user) {
        await db.query(`
          UPDATE sync_status SET
            status = 'failed',
            error_message = $2,
            updated_at = NOW()
          WHERE user_id = $1 AND sync_type = 'liked_songs'
        `, [user.id, JSON.stringify(errorDetails)]);
      }
    } catch (updateError) {
      console.error('Failed to update sync status:', updateError);
    }

    return {
      success: false,
      error: error.message,
      errorDetails: errorDetails,
      message: `Sync failed: ${error.message}`,
      debugInfo: errorDetails
    };
  }
}

// Tool schema for MCP
export const syncLikedSongsSchema = {
  name: 'sync_liked_songs',
  description: 'Sync all liked songs from Spotify to the local database. This fetches the latest data from Spotify including track metadata and audio features.',
  inputSchema: {
    type: 'object',
    properties: {
      includeAudioFeatures: {
        type: 'boolean',
        description: 'Whether to fetch audio features (danceability, energy, etc.). Default: true',
        default: true
      }
    }
  }
};
