import { SPOTIFY_CONFIG } from '../config/spotify';

// Spotify API service - easily adaptable for React Native
class SpotifyService {
  constructor() {
    this.accessToken = null;
    this.userId = null;
    this.baseURL = 'https://api.spotify.com/v1';
  }

  // Generate auth URL
  generateAuthURL() {
    const params = new URLSearchParams({
      client_id: SPOTIFY_CONFIG.CLIENT_ID,
      response_type: 'token',
      redirect_uri: SPOTIFY_CONFIG.REDIRECT_URI,
      scope: SPOTIFY_CONFIG.SCOPES,
      show_dialog: 'true'
    });
    
    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  // Extract token from URL
  extractTokenFromURL(url) {
    if (!url.includes('access_token=')) {
      return null;
    }
    
    const parts = url.split('access_token=')[1];
    if (parts) {
      return parts.split('&')[0];
    }
    
    return null;
  }

  // Set access token
  setAccessToken(token) {
    this.accessToken = token;
  }

  // Get current user
  async getCurrentUser() {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    const response = await fetch(`${this.baseURL}/me`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.status}`);
    }

    const userData = await response.json();
    this.userId = userData.id;
    return userData;
  }

  // Search for tracks
  async searchTrack(query) {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    const response = await fetch(
      `${this.baseURL}/search?q=${encodeURIComponent(query)}&type=track&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.tracks && data.tracks.items.length > 0) {
      const track = data.tracks.items[0];
      return {
        found: true,
        name: track.name,
        artist: track.artists[0].name,
        uri: track.uri,
        id: track.id
      };
    }

    return {
      found: false,
      query
    };
  }

  // Search multiple tracks
  async searchTracks(trackQueries) {
    const results = [];
    
    for (const query of trackQueries) {
      try {
        const result = await this.searchTrack(query);
        results.push({
          query,
          ...result
        });
      } catch (error) {
        results.push({
          query,
          found: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  // Create playlist
  async createPlaylist(name, description = '', isPublic = false) {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    if (!this.userId) {
      await this.getCurrentUser();
    }

    const response = await fetch(`${this.baseURL}/users/${this.userId}/playlists`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        description,
        public: isPublic
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create playlist: ${response.status}`);
    }

    return await response.json();
  }

  // Add tracks to playlist
  async addTracksToPlaylist(playlistId, trackUris) {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    const response = await fetch(`${this.baseURL}/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uris: trackUris
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to add tracks: ${response.status}`);
    }

    return await response.json();
  }

  // Get user's liked songs (paginated)
  async getLikedSongs(offset = 0, limit = 50) {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    const response = await fetch(
      `${this.baseURL}/me/tracks?offset=${offset}&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get liked songs: ${response.status}`);
    }

    return await response.json();
  }

  // Get ALL user's liked songs (handles pagination automatically)
  async getAllLikedSongs(onProgress = null) {
    const allTracks = [];
    let offset = 0;
    const limit = 50;
    let totalCount = null;

    while (true) {
      const batch = await this.getLikedSongs(offset, limit);
      
      if (totalCount === null) {
        totalCount = batch.total;
      }
      
      allTracks.push(...batch.items);
      
      if (onProgress) {
        onProgress(allTracks.length, totalCount);
      }
      
      // Check if we've got all tracks
      if (batch.items.length < limit || allTracks.length >= totalCount) {
        break;
      }
      
      offset += limit;
      
      // Rate limiting - be respectful to Spotify API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      items: allTracks,
      total: totalCount
    };
  }

  // Get audio features for multiple tracks
  async getAudioFeatures(trackIds) {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    // Spotify allows up to 100 track IDs per request
    const chunks = [];
    for (let i = 0; i < trackIds.length; i += 100) {
      chunks.push(trackIds.slice(i, i + 100));
    }

    const allFeatures = [];
    
    for (const chunk of chunks) {
      const response = await fetch(
        `${this.baseURL}/audio-features?ids=${chunk.join(',')}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get audio features: ${response.status}`);
      }

      const data = await response.json();
      allFeatures.push(...data.audio_features);
      
      // Rate limiting between chunks
      if (chunks.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return allFeatures;
  }

  // Get detailed artist information
  async getArtist(artistId) {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    const response = await fetch(
      `${this.baseURL}/artists/${artistId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get artist: ${response.status}`);
    }

    return await response.json();
  }

  // Get multiple artists (batch)
  async getArtists(artistIds) {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    const chunks = [];
    for (let i = 0; i < artistIds.length; i += 50) {
      chunks.push(artistIds.slice(i, i + 50));
    }

    const allArtists = [];
    
    for (const chunk of chunks) {
      const response = await fetch(
        `${this.baseURL}/artists?ids=${chunk.join(',')}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get artists: ${response.status}`);
      }

      const data = await response.json();
      allArtists.push(...data.artists);
      
      if (chunks.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return allArtists;
  }

  // Get recommendations based on seed tracks and audio features
  async getRecommendations({
    seedTracks = [],
    seedArtists = [],
    seedGenres = [],
    targetAudioFeatures = {},
    limit = 20
  }) {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    const params = new URLSearchParams({
      limit: limit.toString()
    });

    // Add seed parameters
    if (seedTracks.length > 0) {
      params.append('seed_tracks', seedTracks.slice(0, 5).join(','));
    }
    if (seedArtists.length > 0) {
      params.append('seed_artists', seedArtists.slice(0, 5).join(','));
    }
    if (seedGenres.length > 0) {
      params.append('seed_genres', seedGenres.slice(0, 5).join(','));
    }

    // Add target audio features
    Object.entries(targetAudioFeatures).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        if (value.min !== undefined) params.append(`min_${key}`, value.min.toString());
        if (value.max !== undefined) params.append(`max_${key}`, value.max.toString());
        if (value.target !== undefined) params.append(`target_${key}`, value.target.toString());
      } else if (value !== undefined) {
        params.append(`target_${key}`, value.toString());
      }
    });

    const response = await fetch(
      `${this.baseURL}/recommendations?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get recommendations: ${response.status}`);
    }

    return await response.json();
  }

  // Get service status
  getStatus() {
    return {
      authenticated: !!this.accessToken,
      userId: this.userId,
      baseURL: this.baseURL
    };
  }

  // Complete playlist creation process (enhanced)
  async createPlaylistWithTracks(name, description, trackQueries) {
    try {
      // Create the playlist
      const playlist = await this.createPlaylist(name, description);
      
      // Search for tracks
      const trackResults = await this.searchTracks(trackQueries);
      
      // Add found tracks to playlist
      const foundTracks = trackResults.filter(t => t.found);
      if (foundTracks.length > 0) {
        const trackUris = foundTracks.map(t => t.uri);
        await this.addTracksToPlaylist(playlist.id, trackUris);
      }
      
      return {
        playlist,
        trackResults,
        foundCount: foundTracks.length,
        totalCount: trackResults.length
      };
    } catch (error) {
      throw new Error(`Playlist creation failed: ${error.message}`);
    }
  }

  // Get user's created playlists (not followed playlists)
  async getUserPlaylists() {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }
    
    if (!this.userId) {
      await this.getCurrentUser();
    }

    try {
      const allPlaylists = [];
      let offset = 0;
      const limit = 50;

      while (true) {
        const response = await fetch(`${this.baseURL}/me/playlists?limit=${limit}&offset=${offset}`, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch playlists: ${response.status}`);
        }

        const data = await response.json();
        
        // Filter to only user-created playlists (not followed ones)
        const userPlaylists = data.items.filter(playlist => 
          playlist.owner.id === this.userId
        );
        
        allPlaylists.push(...userPlaylists);

        // Check if we need more pages
        if (data.items.length < limit || !data.next) {
          break;
        }

        offset += limit;
      }

      console.log(`🎵 Found ${allPlaylists.length} user-created playlists`);
      
      return allPlaylists.map(playlist => ({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        track_count: playlist.tracks.total,
        image_url: playlist.images[0]?.url,
        public: playlist.public,
        collaborative: playlist.collaborative,
        external_urls: playlist.external_urls,
        created_at: playlist.created_at || null
      }));

    } catch (error) {
      console.error('Error fetching user playlists:', error.message);
      throw error;
    }
  }

  // Get tracks from a specific playlist
  async getPlaylistTracks(playlistId) {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    try {
      const allTracks = [];
      let offset = 0;
      const limit = 50;

      while (true) {
        const response = await fetch(`${this.baseURL}/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}&fields=items(track(id,name,artists,album,duration_ms,preview_url)),total,next`, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch playlist tracks: ${response.status}`);
        }

        const data = await response.json();
        
        // Filter out null tracks (removed/unavailable songs)
        const validTracks = data.items.filter(item => 
          item.track && item.track.id
        );
        
        allTracks.push(...validTracks);

        // Check if we need more pages
        if (data.items.length < limit || !data.next) {
          break;
        }

        offset += limit;
      }

      console.log(`🎵 Retrieved ${allTracks.length} tracks from playlist`);
      
      return allTracks.map(item => ({
        id: item.track.id,
        name: item.track.name,
        artist_name: item.track.artists[0]?.name,
        album_name: item.track.album.name,
        duration_ms: item.track.duration_ms,
        preview_url: item.track.preview_url
      }));

    } catch (error) {
      console.error('Error fetching playlist tracks:', error.message);
      throw error;
    }
  }
}

export default new SpotifyService();
