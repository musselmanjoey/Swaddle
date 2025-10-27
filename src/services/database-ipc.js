// Browser-compatible database service that communicates with Electron main process via IPC
// This replaces the direct PostgreSQL connection in the renderer process

class DatabaseIPCService {
  constructor() {
    this.isElectron = typeof window !== 'undefined' && window.electronAPI;
    console.log('🔌 [DB-IPC] Database IPC service initialized, Electron available:', this.isElectron);
  }

  // Health check - communicate with main process
  async healthCheck() {
    console.log('🏥 [DB-IPC] Requesting health check from main process...');
    
    if (!this.isElectron) {
      console.warn('⚠️ [DB-IPC] Electron not available, simulating disconnected state');
      return { 
        connected: false, 
        error: 'Database only available in Electron desktop mode',
        simulation: true 
      };
    }
    
    try {
      const result = await window.electronAPI.dbHealthCheck();
      console.log('✅ [DB-IPC] Health check response:', result);
      return result;
    } catch (error) {
      console.error('❌ [DB-IPC] Health check IPC failed:', error.message);
      return { connected: false, error: error.message };
    }
  }

  // Save liked song via IPC
  async saveLikedSong(userId, songData) {
    console.log(`💾 [DB-IPC] Requesting save liked song for user: ${userId}`);
    console.log('🎵 [DB-IPC] Song:', songData.track_name, 'by', songData.artist_name);
    
    if (!this.isElectron) {
      console.warn('⚠️ [DB-IPC] Electron not available, simulating save operation');
      return { 
        success: true, 
        simulation: true, 
        spotify_id: songData.spotify_id,
        message: 'Simulated save - database only available in Electron desktop mode' 
      };
    }
    
    try {
      const result = await window.electronAPI.dbSaveLikedSong(userId, songData);
      console.log('✅ [DB-IPC] Song saved via IPC:', result?.spotify_id);
      return result;
    } catch (error) {
      console.error('❌ [DB-IPC] Save song IPC failed:', error.message);
      throw new Error(`Failed to save song: ${error.message}`);
    }
  }

  // Get user liked songs via IPC
  async getUserLikedSongs(userId) {
    console.log(`🎵 [DB-IPC] Requesting user liked songs for user: ${userId}`);
    
    if (!this.isElectron) {
      console.warn('⚠️ [DB-IPC] Electron not available, returning empty array');
      return [];
    }
    
    try {
      const songs = await window.electronAPI.dbGetUserLikedSongs(userId);
      console.log(`✅ [DB-IPC] Retrieved ${songs?.length || 0} songs via IPC`);
      return songs || [];
    } catch (error) {
      console.error('❌ [DB-IPC] Get songs IPC failed:', error.message);
      throw new Error(`Failed to get songs: ${error.message}`);
    }
  }

  // Initialize database via IPC
  async initialize() {
    console.log('🚀 [DB-IPC] Requesting database initialization...');
    
    if (!this.isElectron) {
      console.warn('⚠️ [DB-IPC] Electron not available, simulating initialization');
      return { success: true, simulation: true, message: 'Database only available in Electron desktop mode' };
    }
    
    try {
      const result = await window.electronAPI.dbInitialize();
      console.log('✅ [DB-IPC] Database initialized via IPC');
      return result;
    } catch (error) {
      console.error('❌ [DB-IPC] Initialize IPC failed:', error.message);
      throw new Error(`Failed to initialize database: ${error.message}`);
    }
  }

  // Get connection status
  getStatus() {
    return {
      isElectron: this.isElectron,
      available: this.isElectron,
      mode: this.isElectron ? 'electron-ipc' : 'browser-simulation'
    };
  }

  // Save lyrics analysis via IPC
  async saveLyricsAnalysis(trackId, lyricsData) {
    console.log(`🎭 [DB-IPC] Requesting save lyrics analysis for track: ${trackId}`);
    
    if (!this.isElectron) {
      console.warn('⚠️ [DB-IPC] Electron not available, simulating lyrics save');
      return { 
        success: true, 
        simulation: true, 
        track_id: trackId,
        message: 'Simulated lyrics save - database only available in Electron desktop mode' 
      };
    }
    
    try {
      const result = await window.electronAPI.dbSaveLyricsAnalysis(trackId, lyricsData);
      console.log(`✅ [DB-IPC] Lyrics analysis saved via IPC for track: ${trackId}`);
      return result;
    } catch (error) {
      console.error(`❌ [DB-IPC] Save lyrics analysis IPC failed for ${trackId}:`, error.message);
      throw new Error(`Failed to save lyrics analysis: ${error.message}`);
    }
  }

  // Get lyrics analysis for multiple tracks
  async getLyricsAnalysis(trackIds) {
    console.log(`🎭 [DB-IPC] Requesting lyrics analysis for ${trackIds.length} tracks`);
    
    if (!this.isElectron) {
      console.warn('⚠️ [DB-IPC] Electron not available, returning empty results');
      return [];
    }
    
    try {
      const result = await window.electronAPI.dbGetLyricsAnalysis(trackIds);
      console.log(`✅ [DB-IPC] Retrieved lyrics analysis for ${result?.length || 0} tracks`);
      return result || [];
    } catch (error) {
      console.error(`❌ [DB-IPC] Get lyrics analysis IPC failed:`, error.message);
      throw new Error(`Failed to get lyrics analysis: ${error.message}`);
    }
  }

  // Mock methods for compatibility with existing code
  async createUser(userData) {
    console.log('👤 [DB-IPC] Create user not yet implemented');
    throw new Error('Create user not implemented yet');
  }

  async getUser(userId) {
    console.log('👤 [DB-IPC] Get user not yet implemented');
    throw new Error('Get user not implemented yet');
  }

  async saveTrack(trackData) {
    console.log('🎵 [DB-IPC] Save track not yet implemented');
    throw new Error('Save track not implemented yet');
  }

  async getTrack(spotifyId) {
    console.log('🎵 [DB-IPC] Get track not yet implemented');
    throw new Error('Get track not implemented yet');
  }
}

// Export singleton instance
export default new DatabaseIPCService();