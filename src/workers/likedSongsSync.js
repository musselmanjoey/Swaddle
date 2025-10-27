// Browser-compatible liked songs sync worker
// Database operations will be handled via IPC to main process
import databaseService from '../services/database-ipc';

class LikedSongsWorker {
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

  // Main sync process (simplified for browser compatibility)
  async syncUserLikedSongs(spotifyService, options = {}) {
    if (this.isRunning) {
      throw new Error('Sync already in progress');
    }

    this.isRunning = true;
    this.shouldStop = false;
    
    const {
      userId,  // Extract userId from options
      onProgress = null,
      batchSize = 50
    } = options;
    
    // Validate userId
    if (!userId) {
      throw new Error('User ID is required for sync operation');
    }
    
    console.log(`🎵 Starting liked songs sync for user: ${userId}`);

    try {
      
      // Stage 1: Get all liked songs from Spotify
      this.currentProgress.currentStep = 'Fetching your liked songs from Spotify...';
      if (onProgress) onProgress(this.currentProgress);
      
      // Get first batch to determine total
      const firstBatch = await spotifyService.getLikedSongs(0, 50);
      this.currentProgress.total = firstBatch.total;
      
      console.log(`📚 Found ${firstBatch.total} liked songs`);
      
      // Stage 2: Collect all songs
      this.currentProgress.currentStep = 'Collecting all your liked songs...';
      
      const allSongs = [...firstBatch.items];
      const totalBatches = Math.ceil(firstBatch.total / 50);
      
      // Get remaining batches
      for (let i = 1; i < totalBatches; i++) {
        if (this.shouldStop) break;
        
        try {
          const batch = await spotifyService.getLikedSongs(i * 50, 50);
          allSongs.push(...batch.items);
          
          this.currentProgress.completed = allSongs.length;
          this.currentProgress.currentStep = `Collected ${allSongs.length} of ${firstBatch.total} songs...`;
          
          if (onProgress) onProgress(this.currentProgress);
          
        } catch (error) {
          console.error(`Batch ${i} failed:`, error.message);
          this.currentProgress.failed += 50;
        }
        
        // Rate limiting
        await this.delay(100);
      }
      
      // Stage 3: Process and store in database
      this.currentProgress.currentStep = 'Processing song data...';
      if (onProgress) onProgress(this.currentProgress);
      
      console.log('🗃️ Starting database operations...');
      
      // Check database connection first
      try {
        const dbStatus = await databaseService.healthCheck();
        console.log('📊 Database status:', dbStatus);
        
        if (!dbStatus.connected) {
          throw new Error('Database not connected - check PostgreSQL connection');
        }
      } catch (dbError) {
        console.error('❌ Database connection failed:', dbError.message);
        throw new Error(`Database connection failed: ${dbError.message}`);
      }
      
      // Process and store songs in database
      this.currentProgress.currentStep = 'Saving to database...';
      if (onProgress) onProgress(this.currentProgress);
      
      const processedSongs = [];
      let savedCount = 0;
      let failedCount = 0;
      
      for (let i = 0; i < allSongs.length; i++) {
        if (this.shouldStop) break;
        
        const item = allSongs[i];
        try {
          console.log(`💾 Processing song ${i + 1}/${allSongs.length}: ${item.track.name}`);
          
          const songData = {
            spotify_id: item.track.id,
            track_name: item.track.name,
            artist_name: item.track.artists[0]?.name,
            album_name: item.track.album.name,
            album_image_url: item.track.album.images[0]?.url,
            duration_ms: item.track.duration_ms,
            added_at: item.added_at,
            preview_url: item.track.preview_url,
            external_urls: item.track.external_urls
          };
          
          // Save to database using the correct user ID
          const savedSong = await databaseService.saveLikedSong(userId, songData);
          console.log(`✅ Saved song for user ${userId}: ${songData.track_name}`, savedSong);
          
          processedSongs.push(songData);
          savedCount++;
          
          // Update progress
          this.currentProgress.completed = savedCount;
          this.currentProgress.currentStep = `Saved ${savedCount} of ${allSongs.length} songs to database...`;
          if (onProgress) onProgress(this.currentProgress);
          
        } catch (error) {
          console.error(`❌ Failed to save song: ${item.track.name}`, error.message);
          failedCount++;
          this.currentProgress.failed = failedCount;
        }
        
        // Rate limiting for database operations
        if (i % 10 === 0) {
          await this.delay(100);
        }
      }
      
      console.log(`📈 Database sync complete - Saved: ${savedCount}, Failed: ${failedCount}`);
      
      this.currentProgress.completed = savedCount;
      this.currentProgress.failed = failedCount;
      this.currentProgress.currentStep = `Database sync completed! Saved ${savedCount} songs.`;
      if (onProgress) onProgress(this.currentProgress);
      
      console.log('✅ Liked songs sync completed successfully');
      
      return {
        success: true,
        total: this.currentProgress.total,
        synced: savedCount,
        failed: failedCount,
        songs: processedSongs
      };
      
    } catch (error) {
      console.error('💥 Liked songs sync failed:', error.message);
      
      this.currentProgress.currentStep = `Sync failed: ${error.message}`;
      if (onProgress) onProgress(this.currentProgress);
      
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  // Stop the sync process
  stop() {
    console.log('🛑 Stopping liked songs sync...');
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

export default new LikedSongsWorker();
