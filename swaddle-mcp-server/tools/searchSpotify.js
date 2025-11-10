/**
 * Search Spotify for tracks, artists, albums, or playlists
 * @param {Object} spotifyService - Initialized Spotify service
 * @param {Object} params - Search parameters
 * @param {string} params.query - Search query
 * @param {string} params.type - Type of search (track, artist, album, playlist) - default: track
 * @param {number} params.limit - Number of results (1-50, default: 20)
 * @param {number} params.offset - Offset for pagination (default: 0)
 * @returns {Promise<Object>} Search results
 */
export async function searchSpotify(spotifyService, params = {}) {
  const {
    query,
    type = 'track',
    limit = 20,
    offset = 0
  } = params;

  if (!query) {
    return {
      success: false,
      error: 'Search query is required'
    };
  }

  // Validate type
  const validTypes = ['track', 'artist', 'album', 'playlist'];
  if (!validTypes.includes(type)) {
    return {
      success: false,
      error: `Invalid type. Must be one of: ${validTypes.join(', ')}`
    };
  }

  try {
    const result = await spotifyService.search(query, type, limit, offset);

    // Format results based on type
    if (type === 'track') {
      const tracks = result.tracks.items.map(track => ({
        id: track.id,
        name: track.name,
        artist: track.artists[0]?.name || 'Unknown Artist',
        artists: track.artists.map(a => a.name),
        album: track.album?.name || 'Unknown Album',
        duration: formatDuration(track.duration_ms),
        durationMs: track.duration_ms,
        popularity: track.popularity,
        explicit: track.explicit,
        previewUrl: track.preview_url,
        uri: track.uri,
        externalUrl: track.external_urls?.spotify
      }));

      return {
        success: true,
        type: 'track',
        query,
        total: result.tracks.total,
        count: tracks.length,
        offset,
        limit,
        hasMore: (offset + tracks.length) < result.tracks.total,
        tracks
      };
    } else if (type === 'artist') {
      const artists = result.artists.items.map(artist => ({
        id: artist.id,
        name: artist.name,
        genres: artist.genres || [],
        popularity: artist.popularity,
        followers: artist.followers?.total || 0,
        uri: artist.uri,
        externalUrl: artist.external_urls?.spotify,
        images: artist.images
      }));

      return {
        success: true,
        type: 'artist',
        query,
        total: result.artists.total,
        count: artists.length,
        offset,
        limit,
        hasMore: (offset + artists.length) < result.artists.total,
        artists
      };
    } else if (type === 'album') {
      const albums = result.albums.items.map(album => ({
        id: album.id,
        name: album.name,
        artist: album.artists[0]?.name || 'Unknown Artist',
        artists: album.artists.map(a => a.name),
        releaseDate: album.release_date,
        totalTracks: album.total_tracks,
        albumType: album.album_type,
        uri: album.uri,
        externalUrl: album.external_urls?.spotify,
        images: album.images
      }));

      return {
        success: true,
        type: 'album',
        query,
        total: result.albums.total,
        count: albums.length,
        offset,
        limit,
        hasMore: (offset + albums.length) < result.albums.total,
        albums
      };
    } else if (type === 'playlist') {
      const playlists = result.playlists.items.map(playlist => ({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        owner: playlist.owner?.display_name || 'Unknown',
        totalTracks: playlist.tracks?.total || 0,
        public: playlist.public,
        collaborative: playlist.collaborative,
        uri: playlist.uri,
        externalUrl: playlist.external_urls?.spotify,
        images: playlist.images
      }));

      return {
        success: true,
        type: 'playlist',
        query,
        total: result.playlists.total,
        count: playlists.length,
        offset,
        limit,
        hasMore: (offset + playlists.length) < result.playlists.total,
        playlists
      };
    }

  } catch (error) {
    console.error('❌ Error searching Spotify:', error);
    return {
      success: false,
      error: error.message || 'Failed to search Spotify'
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

// Schema for MCP tool registration
export const searchSpotifySchema = {
  name: 'search_spotify',
  description: 'Search Spotify for tracks, artists, albums, or playlists. Use this to find any music on Spotify, not just your liked songs.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query (e.g., "Bohemian Rhapsody", "Queen", "Dark Side of the Moon")'
      },
      type: {
        type: 'string',
        enum: ['track', 'artist', 'album', 'playlist'],
        description: 'Type of search (default: track)',
        default: 'track'
      },
      limit: {
        type: 'number',
        description: 'Number of results to return (1-50, default: 20)',
        minimum: 1,
        maximum: 50,
        default: 20
      },
      offset: {
        type: 'number',
        description: 'Offset for pagination (default: 0)',
        minimum: 0,
        default: 0
      }
    },
    required: ['query']
  }
};
