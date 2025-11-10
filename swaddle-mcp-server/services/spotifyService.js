import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { tokenStore } from '../auth/tokenStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env.local');
dotenv.config({ path: envPath });

/**
 * Spotify API Service with refresh token support
 */
class SpotifyService {
  constructor() {
    this.baseURL = 'https://api.spotify.com/v1';
    this.clientId = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    this.accessToken = null;
  }

  /**
   * Get a valid access token (refreshes if needed)
   * @returns {Promise<string>}
   */
  async getValidAccessToken() {
    console.error('🔑 Checking access token validity...');

    // Check if we have a cached token that's still valid
    if (this.accessToken) {
      const isExpired = await tokenStore.isAccessTokenExpired();
      if (!isExpired) {
        console.error('✅ Using cached access token');
        return this.accessToken;
      }
      console.error('⏰ Cached token expired, refreshing...');
    }

    // Try to load from storage
    const storedToken = await tokenStore.getAccessToken();
    if (storedToken) {
      console.error('✅ Loaded valid token from storage');
      this.accessToken = storedToken;
      return storedToken;
    }

    // Need to refresh
    console.error('🔄 No valid token found, attempting refresh...');
    await this.refreshAccessToken();
    return this.accessToken;
  }

  /**
   * Refresh the access token using refresh token
   */
  async refreshAccessToken() {
    const refreshToken = await tokenStore.getRefreshToken();

    if (!refreshToken) {
      throw new Error(
        'No refresh token available. Please authenticate first using the Swaddle app.'
      );
    }

    if (!this.clientId || !this.clientSecret) {
      throw new Error(
        'Spotify Client ID or Client Secret not configured in .env.local'
      );
    }

    console.error('🔄 Refreshing Spotify access token...');

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh token: ${response.status} - ${error}`);
    }

    const data = await response.json();

    // Update stored tokens
    await tokenStore.updateAccessToken(data.access_token, data.expires_in);
    this.accessToken = data.access_token;

    console.error('✅ Access token refreshed successfully');
  }

  /**
   * Make authenticated request to Spotify API
   */
  async request(endpoint, options = {}) {
    const token = await this.getValidAccessToken();

    console.error(`📡 Making Spotify API request: ${options.method || 'GET'} ${endpoint}`);

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Spotify API error: ${response.status}`);
      console.error(`   Endpoint: ${endpoint}`);
      console.error(`   Response: ${error}`);

      // Provide more context for common errors
      if (response.status === 401) {
        console.error('   ℹ️  Token is unauthorized - may need to re-authenticate');
      } else if (response.status === 403) {
        console.error('   ℹ️  Access forbidden - check scopes or token validity');
      } else if (response.status === 429) {
        console.error('   ℹ️  Rate limited - too many requests');
      }

      throw new Error(`Spotify API error: ${response.status} - ${error}`);
    }

    console.error(`✅ Request successful`);
    return response.json();
  }

  /**
   * Get current user info
   */
  async getCurrentUser() {
    return this.request('/me');
  }

  /**
   * Get user's liked songs (paginated)
   */
  async getLikedSongs(offset = 0, limit = 50) {
    return this.request(`/me/tracks?offset=${offset}&limit=${limit}`);
  }

  /**
   * Get ALL user's liked songs with progress callback
   */
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

  /**
   * Get audio features for multiple tracks
   */
  async getAudioFeatures(trackIds) {
    // Spotify allows up to 100 track IDs per request
    const chunks = [];
    for (let i = 0; i < trackIds.length; i += 100) {
      chunks.push(trackIds.slice(i, i + 100));
    }

    const allFeatures = [];
    for (const chunk of chunks) {
      const ids = chunk.join(',');
      const data = await this.request(`/audio-features?ids=${ids}`);
      allFeatures.push(...data.audio_features);

      // Rate limiting
      if (chunks.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return allFeatures;
  }

  /**
   * Create a playlist for the current user
   * @param {string} name - Playlist name
   * @param {string} description - Playlist description
   * @param {boolean} isPublic - Whether playlist is public
   * @returns {Promise<Object>} Created playlist object
   */
  async createPlaylist(name, description = '', isPublic = false) {
    // Get current user ID first
    const user = await this.getCurrentUser();

    return this.request(`/users/${user.id}/playlists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        description,
        public: isPublic
      })
    });
  }

  /**
   * Add tracks to a playlist
   * @param {string} playlistId - Spotify playlist ID
   * @param {string[]} trackUris - Array of Spotify track URIs (spotify:track:xxx)
   * @returns {Promise<Object>} Snapshot ID
   */
  async addTracksToPlaylist(playlistId, trackUris) {
    return this.request(`/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uris: trackUris
      })
    });
  }
}

export const spotifyService = new SpotifyService();
