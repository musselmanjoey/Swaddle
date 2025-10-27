// Browser-compatible lyrics sync worker
// Fetches lyrics for existing tracks using Genius API

import geniusService from '../services/genius';
import databaseService from '../services/database-ipc';

class LyricsSyncWorker {
  constructor() {
    this.isRunning = false;
    this.shouldStop = false;
    this.currentProgress = {
      total: 0,
      completed: 0,
      failed: 0,
      currentStep: 'idle'
    };
  }

  // Main lyrics sync process
  async syncLyricsForUser(userId, options = {}) {
    if (this.isRunning) {
      throw new Error('Lyrics sync already in progress');
    }

    this.isRunning = true;
    this.shouldStop = false;
    
    const {
      onProgress = null,
      batchSize = 10, // Smaller batches for Genius API rate limiting
      delayBetweenRequests = 1000, // 1 second delay between requests
      maxSongs = -1 // -1 means all songs, positive number limits songs
    } = options;

    try {
      console.log('🎭 [LYRICS] Starting lyrics sync for user:', userId);
      
      // Stage 1: Get tracks that need lyrics
      this.currentProgress.currentStep = 'Finding tracks without lyrics...';
      if (onProgress) onProgress(this.currentProgress);
      
      const allTracksNeedingLyrics = await this.getTracksNeedingLyrics(userId);
      
      // Limit number of songs if specified
      const tracksNeedingLyrics = maxSongs > 0 
        ? allTracksNeedingLyrics.slice(0, maxSongs)
        : allTracksNeedingLyrics;
      
      this.currentProgress.total = tracksNeedingLyrics.length;
      
      console.log(`📚 [LYRICS] Found ${allTracksNeedingLyrics.length} total tracks, processing ${tracksNeedingLyrics.length} tracks ${maxSongs > 0 ? `(limited to ${maxSongs})` : '(all)'}`);
      
      if (tracksNeedingLyrics.length === 0) {
        this.currentProgress.currentStep = 'All tracks already have lyrics!';
        if (onProgress) onProgress(this.currentProgress);
        
        return {
          success: true,
          total: 0,
          synced: 0,
          failed: 0,
          message: 'All tracks already have lyrics'
        };
      }

      // Stage 2: Process tracks in batches
      this.currentProgress.currentStep = 'Fetching lyrics from Genius...';
      
      let processedCount = 0;
      let successCount = 0;
      let failedCount = 0;

      for (let i = 0; i < tracksNeedingLyrics.length; i++) {
        if (this.shouldStop) break;
        
        const track = tracksNeedingLyrics[i];
        
        try {
          console.log(`🎭 [LYRICS] Processing ${i + 1}/${tracksNeedingLyrics.length}: ${track.track_name} by ${track.artist_name}`);
          
          // Search for song on Genius
          const searchResults = await geniusService.searchSong(track.track_name, track.artist_name);
          
          if (searchResults && searchResults.length > 0) {
            const bestMatch = searchResults[0];
            console.log(`🎯 [LYRICS] Found match: ${bestMatch.title} by ${bestMatch.primary_artist.name}`);
            
            // Get lyrics analysis (themes and sentiment, not full text)
            const lyricsAnalysis = await geniusService.getSongAnalysis(track.track_name, track.artist_name);
            
            if (lyricsAnalysis && lyricsAnalysis.found && lyricsAnalysis.analysis) {
              // Save lyrics analysis to database
              await this.saveLyricsAnalysis(track.spotify_id, {
                genius_id: lyricsAnalysis.genius_id,
                genius_url: lyricsAnalysis.genius_url,
                themes: lyricsAnalysis.analysis.themes,
                sentiment_score: lyricsAnalysis.analysis.sentiment_score,
                language: lyricsAnalysis.analysis.language || 'en',
                word_count: lyricsAnalysis.analysis.word_count,
                has_explicit_content: lyricsAnalysis.analysis.has_explicit_content
              });
              
              successCount++;
              console.log(`✅ [LYRICS] Saved lyrics analysis for: ${track.track_name}`);
            } else {
              failedCount++;
              console.log(`❌ [LYRICS] Could not analyze lyrics for: ${track.track_name}`);
            }
          } else {
            failedCount++;
            console.log(`❌ [LYRICS] No Genius match found for: ${track.track_name}`);
          }
          
        } catch (error) {
          console.error(`❌ [LYRICS] Failed to process ${track.track_name}:`, error.message);
          failedCount++;
        }
        
        processedCount++;
        
        // Update progress
        this.currentProgress.completed = successCount;
        this.currentProgress.failed = failedCount;
        this.currentProgress.currentStep = `Processed ${processedCount}/${tracksNeedingLyrics.length} tracks (${successCount} successful)`;
        
        if (onProgress) onProgress(this.currentProgress);
        
        // Rate limiting delay
        if (i < tracksNeedingLyrics.length - 1) {
          await this.delay(delayBetweenRequests);
        }
      }
      
      this.currentProgress.currentStep = `Lyrics sync completed! ${successCount} tracks processed.`;
      if (onProgress) onProgress(this.currentProgress);
      
      console.log(`✅ [LYRICS] Lyrics sync completed - Success: ${successCount}, Failed: ${failedCount}`);
      
      return {
        success: true,
        total: tracksNeedingLyrics.length,
        synced: successCount,
        failed: failedCount
      };
      
    } catch (error) {
      console.error('💥 [LYRICS] Lyrics sync failed:', error.message);
      
      this.currentProgress.currentStep = `Lyrics sync failed: ${error.message}`;
      if (onProgress) onProgress(this.currentProgress);
      
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  // Get tracks that need lyrics analysis
  async getTracksNeedingLyrics(userId) {
    try {
      // Get all user's tracks that don't have lyrics yet
      const userTracks = await databaseService.getUserLikedSongs(userId);
      
      // For now, return all tracks - in a full implementation, we'd check which ones
      // already have lyrics in the database
      return userTracks.filter(track => 
        track.track_name && 
        track.artist_name && 
        track.track_name.length > 0 && 
        track.artist_name.length > 0
      );
      
    } catch (error) {
      console.error('❌ [LYRICS] Failed to get tracks needing lyrics:', error.message);
      return [];
    }
  }

  // Save lyrics analysis to database
  async saveLyricsAnalysis(trackId, lyricsData) {
    try {
      console.log(`💾 [LYRICS] Saving lyrics analysis for track ${trackId}:`, {
        themes: lyricsData.themes?.slice(0, 3), // First 3 themes
        sentiment: lyricsData.sentiment_score,
        wordCount: lyricsData.word_count
      });
      
      // Save to database via IPC
      const result = await databaseService.saveLyricsAnalysis(trackId, lyricsData);
      console.log(`✅ [LYRICS] Successfully saved lyrics analysis for ${trackId}`);
      
      return result;
      
    } catch (error) {
      console.error(`❌ [LYRICS] Failed to save lyrics analysis for ${trackId}:`, error.message);
      throw error;
    }
  }

  // Stop the sync process
  stop() {
    console.log('🛑 [LYRICS] Stopping lyrics sync...');
    this.shouldStop = true;
  }

  // Get current progress
  getProgress() {
    return {
      ...this.currentProgress,
      isRunning: this.isRunning
    };
  }

  // Utility function
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Reset progress
  reset() {
    this.isRunning = false;
    this.shouldStop = false;
    this.currentProgress = {
      total: 0,
      completed: 0,
      failed: 0,
      currentStep: 'idle'
    };
  }
}

export default new LyricsSyncWorker();