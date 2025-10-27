// Browser-compatible lyrics sync worker
// Analyzes themes from lyrics while respecting copyright
import databaseService from '../services/database-ipc';

class LyricsSyncWorker {
  constructor() {
    this.isRunning = false;
    this.shouldStop = false;
    this.currentProgress = {
      total: 0,
      completed: 0,
      failed: 0,
      currentStep: 'idle',
      currentBatch: 0,
      totalBatches: 0
    };
  }

  // Main lyrics sync process
  async syncLyrics(userId, options = {}) {
    if (this.isRunning) {
      throw new Error('Lyrics sync already in progress');
    }

    this.isRunning = true;
    this.shouldStop = false;
    
    const {
      onProgress = null,
      batchSize = 10, // Process 10 songs at a time
      maxSongs = -1 // -1 means all songs, otherwise limit to this number
    } = options;

    try {
      console.log('🎭 Starting lyrics analysis sync...');
      
      // Stage 1: Get all songs without lyrics analysis
      this.currentProgress.currentStep = 'Finding songs that need lyrics analysis...';
      if (onProgress) onProgress(this.currentProgress);
      
      // Get all user's liked songs from database
      const allSongs = await databaseService.getUserLikedSongs(userId);
      console.log(`📚 Found ${allSongs.length} liked songs in database`);
      
      if (allSongs.length === 0) {
        throw new Error('No songs found in database. Please run liked songs sync first.');
      }
      
      // Get track IDs that already have lyrics analysis
      const trackIds = allSongs.map(song => song.spotify_id);
      const existingLyrics = await databaseService.getLyricsAnalysis(trackIds);
      const songsWithLyrics = new Set(existingLyrics.map(l => l.track_id));
      
      // Filter to songs that need lyrics analysis
      let songsNeedingLyrics = allSongs.filter(song => !songsWithLyrics.has(song.spotify_id));
      
      // Apply maxSongs limit if specified
      if (maxSongs > 0 && songsNeedingLyrics.length > maxSongs) {
        songsNeedingLyrics = songsNeedingLyrics.slice(0, maxSongs);
        console.log(`🔢 Limited to first ${maxSongs} songs for analysis`);
      }
      
      console.log(`🔍 Found ${songsNeedingLyrics.length} songs needing lyrics analysis`);
      
      if (songsNeedingLyrics.length === 0) {
        this.currentProgress.currentStep = 'All songs already have lyrics analysis!';
        if (onProgress) onProgress(this.currentProgress);
        return {
          success: true,
          total: allSongs.length,
          analyzed: 0,
          skipped: allSongs.length,
          message: 'All songs already analyzed'
        };
      }
      
      this.currentProgress.total = songsNeedingLyrics.length;
      this.currentProgress.totalBatches = Math.ceil(songsNeedingLyrics.length / batchSize);
      
      // Stage 2: Process in batches
      const { default: geniusService } = await import('../services/genius');
      
      let totalAnalyzed = 0;
      let totalSkipped = 0;
      
      for (let batchNum = 0; batchNum < this.currentProgress.totalBatches; batchNum++) {
        if (this.shouldStop) break;
        
        this.currentProgress.currentBatch = batchNum + 1;
        
        const startIdx = batchNum * batchSize;
        const endIdx = Math.min(startIdx + batchSize, songsNeedingLyrics.length);
        const batch = songsNeedingLyrics.slice(startIdx, endIdx);
        
        console.log(`🎭 Processing batch ${batchNum + 1}/${this.currentProgress.totalBatches} (${batch.length} songs)`);
        this.currentProgress.currentStep = `Processing batch ${batchNum + 1}/${this.currentProgress.totalBatches}...`;
        if (onProgress) onProgress(this.currentProgress);
        
        let batchAnalyzed = 0;
        let batchSkipped = 0;
        
        // Process songs in current batch
        for (let i = 0; i < batch.length; i++) {
          if (this.shouldStop) break;
          
          const song = batch[i];
          
          try {
            console.log(`🎵 Analyzing ${startIdx + i + 1}/${songsNeedingLyrics.length}: ${song.track_name} by ${song.artist_name}`);
            
            // Get lyrics analysis (themes only, copyright compliant)
            const lyricsData = await geniusService.getSongAnalysis(
              song.track_name,
              song.artist_name
            );
            
            if (lyricsData.found && lyricsData.analysis) {
              const analysisData = {
                genius_id: lyricsData.genius_id,
                genius_url: lyricsData.genius_url,
                themes: lyricsData.analysis.themes || [],
                sentiment_score: lyricsData.analysis.sentiment_score || 0,
                language: lyricsData.analysis.language || 'en',
                word_count: lyricsData.analysis.word_count || 0,
                has_explicit_content: lyricsData.analysis.has_explicit_content || false
              };
              
              // Save analysis to database
              await databaseService.saveLyricsAnalysis(song.spotify_id, analysisData);
              
              console.log(`✅ Analyzed: ${song.track_name} (${analysisData.themes.length} themes)`);
              batchAnalyzed++;
              totalAnalyzed++;
              
            } else {
              console.log(`❌ No lyrics: ${song.track_name} - ${lyricsData.error || 'Not available'}`);
              batchSkipped++;
              totalSkipped++;
            }
            
            this.currentProgress.completed = totalAnalyzed;
            this.currentProgress.failed = totalSkipped;
            
            // Rate limiting - respect Genius API
            await this.delay(700); // 700ms between requests
            
          } catch (error) {
            console.error(`❌ Analysis failed for ${song.track_name}:`, error.message);
            batchSkipped++;
            totalSkipped++;
            this.currentProgress.failed = totalSkipped;
          }
          
          // Update progress
          this.currentProgress.currentStep = `Batch ${batchNum + 1}/${this.currentProgress.totalBatches}: Analyzed ${batchAnalyzed}/${batch.length} songs`;
          if (onProgress) onProgress(this.currentProgress);
        }
        
        console.log(`📊 Batch ${batchNum + 1} complete - Analyzed: ${batchAnalyzed}, Skipped: ${batchSkipped}`);
        
        // Longer delay between batches to be respectful
        if (batchNum < this.currentProgress.totalBatches - 1) {
          console.log('⏳ Waiting between batches...');
          await this.delay(2000); // 2 second pause between batches
        }
      }
      
      console.log(`🎭 Lyrics sync complete - Total analyzed: ${totalAnalyzed}, Skipped: ${totalSkipped}`);
      
      this.currentProgress.completed = totalAnalyzed;
      this.currentProgress.failed = totalSkipped;
      this.currentProgress.currentStep = `Lyrics sync completed! Analyzed ${totalAnalyzed} songs.`;
      if (onProgress) onProgress(this.currentProgress);
      
      return {
        success: true,
        total: songsNeedingLyrics.length,
        analyzed: totalAnalyzed,
        skipped: totalSkipped
      };
      
    } catch (error) {
      console.error('💥 Lyrics sync failed:', error.message);
      
      this.currentProgress.currentStep = `Lyrics sync failed: ${error.message}`;
      if (onProgress) onProgress(this.currentProgress);
      
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  // Stop the sync process
  stop() {
    console.log('🛑 Stopping lyrics sync...');
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
      currentStep: 'idle',
      currentBatch: 0,
      totalBatches: 0
    };
  }
}

export default new LyricsSyncWorker();