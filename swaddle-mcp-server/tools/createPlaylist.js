import { db } from '../db/connection.js';

/**
 * Create a Spotify playlist with specific tracks
 * @param {Object} spotifyService - Initialized Spotify service
 * @param {Object} params - Playlist parameters
 * @param {string} params.name - Playlist name
 * @param {string} params.description - Playlist description (optional)
 * @param {boolean} params.public - Whether playlist is public (default: false)
 * @param {string[]} params.trackIds - Array of Spotify track IDs to add
 * @param {boolean} params.skipValidation - Skip database validation (allows any Spotify track) - default: false
 * @returns {Promise<Object>} Result with playlist info and track count
 */
export async function createPlaylist(spotifyService, params = {}) {
  const {
    name,
    description = '',
    public: isPublic = false,
    trackIds = [],
    skipValidation = false
  } = params;

  if (!name) {
    return {
      success: false,
      error: 'Playlist name is required'
    };
  }

  if (!Array.isArray(trackIds) || trackIds.length === 0) {
    return {
      success: false,
      error: 'At least one track ID is required'
    };
  }

  try {
    let validTrackIds = trackIds;
    let invalidTrackIds = [];

    // If not skipping validation, check database for track IDs
    if (!skipValidation) {
      // Validate track IDs exist in database
      // Note: The 'id' column in tracks table IS the Spotify ID
      const validationQuery = `
        SELECT id, name, artist_id
        FROM tracks
        WHERE id = ANY($1)
      `;
      const validationResult = await db.query(validationQuery, [trackIds]);

      if (validationResult.rows.length === 0) {
        return {
          success: false,
          error: 'No valid tracks found in database. Use skipValidation: true to add any Spotify tracks, or use search_spotify to find tracks first.'
        };
      }

      validTrackIds = validationResult.rows.map(row => row.id);
      invalidTrackIds = trackIds.filter(id => !validTrackIds.includes(id));
    } else {
      // When skipping validation, verify tracks exist on Spotify
      console.error(`⚠️  Skipping database validation, will attempt to add ${trackIds.length} tracks directly from Spotify`);

      // Validate tracks exist on Spotify by fetching them in batches
      const batches = [];
      for (let i = 0; i < trackIds.length; i += 50) {
        batches.push(trackIds.slice(i, i + 50));
      }

      const allValidIds = [];
      const allInvalidIds = [];

      for (const batch of batches) {
        try {
          const result = await spotifyService.getTracks(batch);
          result.tracks.forEach((track, idx) => {
            if (track) {
              allValidIds.push(track.id);
            } else {
              allInvalidIds.push(batch[idx]);
            }
          });
        } catch (error) {
          console.error(`❌ Error validating tracks on Spotify: ${error.message}`);
          // If validation fails, try all tracks anyway
          allValidIds.push(...batch);
        }
      }

      validTrackIds = allValidIds;
      invalidTrackIds = allInvalidIds;
    }

    // Create playlist on Spotify
    const playlist = await spotifyService.createPlaylist(name, description, isPublic);

    // Add tracks to playlist (Spotify expects URIs)
    const trackUris = validTrackIds.map(id => `spotify:track:${id}`);

    // Spotify API has a limit of 100 tracks per request
    const batchSize = 100;
    for (let i = 0; i < trackUris.length; i += batchSize) {
      const batch = trackUris.slice(i, i + batchSize);
      await spotifyService.addTracksToPlaylist(playlist.id, batch);
    }

    return {
      success: true,
      playlist: {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        public: playlist.public,
        url: playlist.external_urls?.spotify,
        uri: playlist.uri
      },
      tracksAdded: validTrackIds.length,
      tracksRequested: trackIds.length,
      invalidTrackIds: invalidTrackIds.length > 0 ? invalidTrackIds : undefined
    };

  } catch (error) {
    console.error('❌ Error creating playlist:', error);
    return {
      success: false,
      error: error.message || 'Failed to create playlist'
    };
  }
}
