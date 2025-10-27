// Playlist Enhancer Service - Frontend service layer for communicating with backend

class PlaylistEnhancerService {
  constructor() {
    console.log('🚀 [PE-SERVICE] Playlist Enhancer service initialized');
  }

  // Get user's enhanced playlists
  async getEnhancedPlaylists(userId) {
    console.log(`📁 [PE-SERVICE] Getting enhanced playlists for user: ${userId}`);
    
    try {
      const result = await window.electronAPI.invoke(
        'playlist-enhancer:get-enhanced-playlists', 
        userId
      );
      
      console.log(`✅ [PE-SERVICE] Retrieved ${result.length} enhanced playlists`);
      return result;
      
    } catch (error) {
      console.error('❌ [PE-SERVICE] Failed to get enhanced playlists:', error);
      throw new Error(`Failed to load enhanced playlists: ${error.message}`);
    }
  }

  // Save enhancement session
  async saveEnhancementSession(sessionData) {
    console.log(`💾 [PE-SERVICE] Saving enhancement session for: ${sessionData.playlistName}`);
    
    try {
      const sessionId = await window.electronAPI.invoke(
        'playlist-enhancer:save-session',
        sessionData
      );
      
      console.log(`✅ [PE-SERVICE] Saved enhancement session with ID: ${sessionId}`);
      return sessionId;
      
    } catch (error) {
      console.error('❌ [PE-SERVICE] Failed to save enhancement session:', error);
      throw new Error(`Failed to save enhancement session: ${error.message}`);
    }
  }

  // Get recommendations based on seed tracks
  async getRecommendations(seedTracks, sourceType, userId, limit = 10) {
    console.log(`🎯 [PE-SERVICE] Getting ${limit} recommendations from ${sourceType}`);
    
    try {
      // Extract track IDs if full track objects are passed
      const seedTrackIds = seedTracks.map(track => 
        typeof track === 'string' ? track : track.id
      );
      
      const result = await window.electronAPI.invoke(
        'playlist-enhancer:get-recommendations',
        seedTrackIds,
        sourceType,
        userId,
        limit
      );
      
      console.log(`✅ [PE-SERVICE] Retrieved ${result.length} recommendations`);
      return result;
      
    } catch (error) {
      console.error('❌ [PE-SERVICE] Failed to get recommendations:', error);
      throw new Error(`Failed to get recommendations: ${error.message}`);
    }
  }

  // Check if playlist is enhanced
  async isPlaylistEnhanced(userId, spotifyPlaylistId) {
    console.log(`🔍 [PE-SERVICE] Checking if playlist is enhanced: ${spotifyPlaylistId}`);
    
    try {
      const result = await window.electronAPI.invoke(
        'playlist-enhancer:is-enhanced',
        userId,
        spotifyPlaylistId
      );
      
      console.log(`✅ [PE-SERVICE] Playlist enhancement status: ${!!result}`);
      return result;
      
    } catch (error) {
      console.error('❌ [PE-SERVICE] Failed to check playlist enhancement status:', error);
      throw new Error(`Failed to check playlist status: ${error.message}`);
    }
  }

  // Save Genius song data
  async saveGeniusData(trackId, geniusData) {
    console.log(`🎭 [PE-SERVICE] Saving Genius data for track: ${trackId}`);
    
    try {
      const result = await window.electronAPI.invoke(
        'playlist-enhancer:save-genius-data',
        trackId,
        geniusData
      );
      
      console.log(`✅ [PE-SERVICE] Saved Genius data for track: ${trackId}`);
      return result;
      
    } catch (error) {
      console.error('❌ [PE-SERVICE] Failed to save Genius data:', error);
      throw new Error(`Failed to save Genius data: ${error.message}`);
    }
  }

  // Calculate similarity score between tracks (frontend utility)
  calculateSimilarityScore(track1, track2) {
    console.log(`📊 [PE-SERVICE] Calculating similarity between tracks`);
    
    // Audio feature weights for similarity calculation
    const featureWeights = {
      danceability: 0.2,
      energy: 0.2,
      valence: 0.15,
      acousticness: 0.15,
      tempo: 0.1,
      key: 0.05,
      mode: 0.05,
      speechiness: 0.05,
      instrumentalness: 0.03,
      liveness: 0.02
    };
    
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const [feature, weight] of Object.entries(featureWeights)) {
      if (track1[feature] !== undefined && track2[feature] !== undefined) {
        let featureScore;
        
        if (feature === 'tempo') {
          // Tempo similarity (normalize to 0-1 range)
          const tempoDiff = Math.abs(track1.tempo - track2.tempo);
          featureScore = Math.max(0, 1 - tempoDiff / 100); // 100 BPM difference = 0 similarity
        } else if (feature === 'key' || feature === 'mode') {
          // Exact match for categorical features
          featureScore = track1[feature] === track2[feature] ? 1 : 0;
        } else {
          // Euclidean distance for continuous features (0-1 range)
          const diff = Math.abs(track1[feature] - track2[feature]);
          featureScore = 1 - diff;
        }
        
        totalScore += featureScore * weight;
        totalWeight += weight;
      }
    }
    
    const similarity = totalWeight > 0 ? totalScore / totalWeight : 0;
    console.log(`✅ [PE-SERVICE] Calculated similarity score: ${similarity.toFixed(3)}`);
    
    return similarity;
  }

  // Generate similarity explanation (frontend utility)
  generateSimilarityReason(track1, track2, score) {
    const reasons = [];
    
    // Check major similarity factors
    if (Math.abs(track1.energy - track2.energy) < 0.2) {
      reasons.push('similar energy levels');
    }
    
    if (Math.abs(track1.danceability - track2.danceability) < 0.2) {
      reasons.push('matching danceability');
    }
    
    if (Math.abs(track1.valence - track2.valence) < 0.2) {
      reasons.push('similar mood/valence');
    }
    
    if (Math.abs(track1.acousticness - track2.acousticness) < 0.3) {
      reasons.push('comparable acoustic elements');
    }
    
    if (Math.abs(track1.tempo - track2.tempo) < 20) {
      reasons.push('similar tempo');
    }
    
    if (track1.key === track2.key) {
      reasons.push('same musical key');
    }
    
    // Fallback based on score
    if (reasons.length === 0) {
      if (score > 0.8) {
        return 'Strong overall musical similarity';
      } else if (score > 0.6) {
        return 'Good musical compatibility';
      } else {
        return 'Some shared musical characteristics';
      }
    }
    
    // Format reasons nicely
    if (reasons.length === 1) {
      return reasons[0].charAt(0).toUpperCase() + reasons[0].slice(1);
    } else if (reasons.length === 2) {
      return reasons[0].charAt(0).toUpperCase() + reasons[0].slice(1) + ' and ' + reasons[1];
    } else {
      const lastReason = reasons.pop();
      return reasons.join(', ').charAt(0).toUpperCase() + reasons.join(', ').slice(1) + ', and ' + lastReason;
    }
  }

  // Format track data for display (frontend utility)
  formatTrackForDisplay(track) {
    return {
      id: track.track_id || track.id,
      name: track.track_name || track.name,
      artist_name: track.artist_name,
      album_name: track.album_name,
      similarity_score: track.similarity_score || 0,
      spotify_popularity: track.spotify_popularity || track.popularity || 0,
      genius_popularity: track.genius_popularity || 0,
      combined_popularity_score: track.combined_popularity_score || 0,
      audio_features: {
        danceability: track.danceability,
        energy: track.energy,
        valence: track.valence,
        acousticness: track.acousticness,
        tempo: track.tempo
      }
    };
  }
}

// Create and export singleton instance
const playlistEnhancerService = new PlaylistEnhancerService();
export default playlistEnhancerService;