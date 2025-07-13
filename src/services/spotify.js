// Spotify API service - easily adaptable for React Native
class SpotifyService {
  constructor() {
    this.accessToken = null;
    this.userId = null;
    this.baseURL = 'https://api.spotify.com/v1';
  }

  // Generate auth URL
  generateAuthURL(clientId, redirectUri = 'https://developer.spotify.com/documentation/web-api/concepts/authorization') {
    const scopes = 'playlist-modify-private playlist-modify-public';
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'token',
      redirect_uri: redirectUri,
      scope: scopes,
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

  // Complete playlist creation process
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
}

export default new SpotifyService();
