// Smart Sync Service - Intelligent syncing with progress tracking and record checking

class SmartSyncService {
  constructor() {
    this.isRunning = false;
    this.currentPhase = null;
    this.progress = {
      currentStep: '',
      completed: 0,
      total: 0,
      phase: '',
      errors: []
    };
    this.listeners = [];
    
    // Bind methods to ensure 'this' context
    this.addProgressListener = this.addProgressListener.bind(this);
    this.removeProgressListener = this.removeProgressListener.bind(this);
    this.notifyProgress = this.notifyProgress.bind(this);
    this.analyzeMissingData = this.analyzeMissingData.bind(this);
    this.startComprehensiveSync = this.startComprehensiveSync.bind(this);
    this.stopSync = this.stopSync.bind(this);
    this.getSyncStatus = this.getSyncStatus.bind(this);
  }

  // Add progress listener
  addProgressListener(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
      console.log('🔊 [SMART-SYNC] Progress listener added, total listeners:', this.listeners.length);
    } else {
      console.warn('⚠️ [SMART-SYNC] Attempted to add non-function as progress listener');
    }
  }

  // Remove progress listener
  removeProgressListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
    console.log('🔇 [SMART-SYNC] Progress listener removed, total listeners:', this.listeners.length);
  }

  // Notify all listeners of progress update
  notifyProgress(update) {
    this.progress = { ...this.progress, ...update };
    console.log('📊 [SMART-SYNC] Progress update:', this.progress);
    
    this.listeners.forEach((callback, index) => {
      try {
        callback(this.progress);
      } catch (error) {
        console.error(`❌ [SMART-SYNC] Error in progress listener ${index}:`, error);
      }
    });
  }

  // Check what data is missing for each track
  async analyzeMissingData(userId) {
    console.log('🔍 [SMART-SYNC] Analyzing missing data...');
    console.log('📋 [SMART-SYNC] User ID:', userId);
    
    try {
      // Check if Electron API is available
      if (!window.electronAPI) {
        console.warn('⚠️ [SMART-SYNC] Electron API not available, using mock data');
        return {
          totalTracks: 762,
          missingAudioFeatures: 762,
          missingGeniusData: 762,
          staleData: 0,
          tracksNeedingAudioFeatures: [],
          tracksNeedingGeniusData: []
        };
      }
      
      const analysis = await window.electronAPI.invoke('smart-sync:analyze-missing-data', userId);
      
      console.log('📊 [SMART-SYNC] Data analysis complete:');
      console.log('📊 [SMART-SYNC] Raw analysis result:', analysis);
      console.log(`   Total tracks: ${analysis.totalTracks}`);
      console.log(`   Missing audio features: ${analysis.missingAudioFeatures}`);
      console.log(`   Missing Genius data: ${analysis.missingGeniusData}`);
      console.log(`   Stale data (>7 days): ${analysis.staleData}`);
      
      // Check if user has any liked songs at all
      if (analysis.totalTracks === 0) {
        console.warn('⚠️ [SMART-SYNC] No tracks found for user. User may need to sync liked songs first.');
        
        // Try to get user's liked songs count from database
        const userSongs = await window.electronAPI.invoke('db-get-user-liked-songs', userId);
        console.log('📋 [SMART-SYNC] User liked songs from DB:', userSongs?.length || 0);
      }
      
      return analysis;
      
    } catch (error) {
      console.error('❌ [SMART-SYNC] Failed to analyze missing data:', error);
      
      // Return fallback data instead of throwing
      console.warn('⚠️ [SMART-SYNC] Using fallback analysis data due to error');
      return {
        totalTracks: 0,
        missingAudioFeatures: 0,
        missingGeniusData: 0,
        staleData: 0,
        tracksNeedingAudioFeatures: [],
        tracksNeedingGeniusData: [],
        error: error.message
      };
    }
  }

  // Main comprehensive sync function
  async startComprehensiveSync(userId, options = {}) {
    if (this.isRunning) {
      throw new Error('Sync already in progress');
    }

    this.isRunning = true;
    const forceResync = options.forceResync || false;
    
    try {
      console.log('🚀 [SMART-SYNC] Starting comprehensive sync...');
      
      // Phase 1: Analyze what's missing
      this.notifyProgress({
        phase: 'analysis',
        currentStep: 'Analyzing current data state...',
        completed: 0,
        total: 100
      });
      
      const analysis = await this.analyzeMissingData(userId);
      
      // Phase 2: Sync Spotify data (liked songs + audio features)
      let spotifyResult = { synced: 0, failed: 0, total: 0 };
      if (analysis.missingAudioFeatures > 0 || forceResync) {
        spotifyResult = await this.syncSpotifyData(userId, analysis, forceResync);
      } else {
        console.log('✅ [SMART-SYNC] Spotify data is up to date, skipping');
      }
      
      // Phase 3: Sync Genius data (only for tracks without it)
      let geniusResult = { synced: 0, failed: 0, total: 0 };
      if (analysis.missingGeniusData > 0 || forceResync) {
        geniusResult = await this.syncGeniusData(userId, analysis, forceResync);
      } else {
        console.log('✅ [SMART-SYNC] Genius data is up to date, skipping');
      }
      
      // Phase 4: Complete
      this.notifyProgress({
        phase: 'complete',
        currentStep: `Sync completed! Spotify: ${spotifyResult.synced}/${spotifyResult.total}, Genius: ${geniusResult.synced}/${geniusResult.total}`,
        completed: 100,
        total: 100
      });
      
      console.log('🎉 [SMART-SYNC] Comprehensive sync completed!');
      console.log(`🎉 [SMART-SYNC] Spotify: ${spotifyResult.synced} synced, ${spotifyResult.failed} failed`);
      console.log(`🎉 [SMART-SYNC] Genius: ${geniusResult.synced} synced, ${geniusResult.failed} failed`);
      
      return { 
        success: true, 
        analysis,
        spotify: spotifyResult,
        genius: geniusResult
      };
      
    } catch (error) {
      console.error('❌ [SMART-SYNC] Sync failed:', error);
      
      this.notifyProgress({
        phase: 'error',
        currentStep: `Sync failed: ${error.message}`,
        errors: [...this.progress.errors, error.message]
      });
      
      throw error;
      
    } finally {
      this.isRunning = false;
    }
  }

  // Get current sync status
  getSyncStatus() {
    return {
      isRunning: this.isRunning,
      progress: this.progress
    };
  }

  // Sync Spotify data with progress tracking
  async syncSpotifyData(userId, analysis, forceResync) {
    console.log('🎵 [SMART-SYNC] Phase 2: Syncing Spotify data...');
    
    const tracksNeedingAudioFeatures = analysis.missingAudioFeatures || 0;
    
    if (tracksNeedingAudioFeatures === 0 && !forceResync) {
      console.log('✅ [SMART-SYNC] No audio features needed, skipping');
      return { synced: 0, failed: 0, total: 0 };
    }
    
    this.notifyProgress({
      phase: 'spotify',
      currentStep: `Syncing audio features for ${tracksNeedingAudioFeatures} tracks...`,
      completed: 0,
      total: tracksNeedingAudioFeatures
    });
    
    try {
      if (!window.electronAPI) {
        // Mock sync for testing
        for (let i = 0; i <= 100; i += 10) {
          this.notifyProgress({
            currentStep: `Syncing Spotify data... ${i}%`,
            completed: i
          });
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        console.log('✅ [SMART-SYNC] Spotify sync complete (mock)');
        return { synced: 0, failed: 0, total: 0 };
      }
      
      // Use working debug logic in batches
      const batchSize = 50; // Process 50 tracks at a time
      let totalSynced = 0;
      let totalFailed = 0;
      let processed = 0;
      
      // Process all tracks needing audio features
      while (processed < tracksNeedingAudioFeatures) {
        console.log(`🎵 [SMART-SYNC] Processing audio features batch ${Math.floor(processed/batchSize) + 1}...`);
        
        // Get next batch of tracks
        const tracksToSync = await window.electronAPI.invoke('debug-sync:get-tracks-missing-audio', userId, batchSize);
        
        if (tracksToSync.length === 0) {
          console.log('✅ [SMART-SYNC] No more tracks need audio features');
          break;
        }
        
        // Process each track in the batch
        for (let i = 0; i < tracksToSync.length; i++) {
          const track = tracksToSync[i];
          
          try {
            const result = await window.electronAPI.invoke('debug-sync:sync-track-audio-features', track.id);
            
            if (result.success) {
              totalSynced++;
            } else {
              totalFailed++;
              console.error(`❌ [SMART-SYNC] Audio features failed for "${track.name}": ${result.error}`);
            }
          } catch (error) {
            totalFailed++;
            console.error(`❌ [SMART-SYNC] Error processing "${track.name}":`, error);
          }
          
          processed++;
          
          // Update progress
          this.notifyProgress({
            currentStep: `Syncing audio features... ${processed}/${tracksNeedingAudioFeatures} (${totalSynced} synced, ${totalFailed} failed)`,
            completed: processed
          });
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        console.log(`✅ [SMART-SYNC] Batch complete: ${totalSynced} synced, ${totalFailed} failed`);
        
        // Brief pause between batches
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      console.log(`🎉 [SMART-SYNC] Spotify sync complete: ${totalSynced} tracks synced, ${totalFailed} failed`);
      
      return {
        synced: totalSynced,
        failed: totalFailed,
        total: processed
      };
      
    } catch (error) {
      console.error('❌ [SMART-SYNC] Spotify sync failed:', error);
      throw error;
    }
  }

  // Sync Genius data with progress tracking
  async syncGeniusData(userId, analysis, forceResync) {
    console.log('🎭 [SMART-SYNC] Phase 3: Syncing Genius data...');
    
    const tracksNeedingGeniusData = analysis.missingGeniusData || 0;
    
    if (tracksNeedingGeniusData === 0 && !forceResync) {
      console.log('✅ [SMART-SYNC] No Genius data needed, skipping');
      return { synced: 0, failed: 0, total: 0 };
    }
    
    this.notifyProgress({
      phase: 'genius',
      currentStep: `Starting Genius analysis for ${tracksNeedingGeniusData} tracks...`,
      completed: 0,
      total: tracksNeedingGeniusData
    });
    
    try {
      if (!window.electronAPI) {
        // Mock sync for testing
        for (let i = 0; i <= 100; i += 20) {
          this.notifyProgress({
            currentStep: `Analyzing lyrics... ${i}%`,
            completed: i
          });
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        console.log('✅ [SMART-SYNC] Genius sync complete (mock)');
        return { synced: 0, failed: 0, total: 0 };
      }
      
      // Use working debug logic in batches
      const batchSize = 25; // Smaller batches for Genius due to rate limits
      let totalSynced = 0;
      let totalFailed = 0;
      let processed = 0;
      
      // Process all tracks needing Genius data
      while (processed < tracksNeedingGeniusData) {
        console.log(`🎭 [SMART-SYNC] Processing Genius batch ${Math.floor(processed/batchSize) + 1}...`);
        
        // Get next batch of tracks
        const tracksToSync = await window.electronAPI.invoke('debug-sync:get-tracks-missing-genius', userId, batchSize);
        
        if (tracksToSync.length === 0) {
          console.log('✅ [SMART-SYNC] No more tracks need Genius data');
          break;
        }
        
        // Process each track in the batch
        for (let i = 0; i < tracksToSync.length; i++) {
          const track = tracksToSync[i];
          
          try {
            const result = await window.electronAPI.invoke('debug-sync:sync-track-genius-data', track.id, track.name, track.artist_name);
            
            if (result.success) {
              totalSynced++;
            } else {
              totalFailed++;
              console.error(`❌ [SMART-SYNC] Genius data failed for "${track.name}": ${result.error}`);
            }
          } catch (error) {
            totalFailed++;
            console.error(`❌ [SMART-SYNC] Error processing "${track.name}":`, error);
          }
          
          processed++;
          
          // Update progress
          this.notifyProgress({
            currentStep: `Analyzing lyrics... ${processed}/${tracksNeedingGeniusData} (${totalSynced} synced, ${totalFailed} failed)`,
            completed: processed
          });
          
          // Longer delay for Genius to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log(`✅ [SMART-SYNC] Genius batch complete: ${totalSynced} synced, ${totalFailed} failed`);
        
        // Longer pause between Genius batches to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log(`🎉 [SMART-SYNC] Genius sync complete: ${totalSynced} tracks analyzed, ${totalFailed} failed`);
      
      return {
        synced: totalSynced,
        failed: totalFailed,
        total: processed
      };
      
    } catch (error) {
      console.error('❌ [SMART-SYNC] Genius sync failed:', error);
      throw error;
    }
  }

  // Stop sync (for user cancellation)
  stopSync() {
    if (this.isRunning) {
      console.log('⏹️ [SMART-SYNC] Sync stopped by user');
      this.isRunning = false;
      
      this.notifyProgress({
        phase: 'stopped',
        currentStep: 'Sync stopped by user',
        errors: [...this.progress.errors, 'Sync cancelled by user']
      });
    }
  }

  // Debug sync with limited tracks and enhanced logging
  async startDebugSync(userId, options = {}) {
    const { trackLimit = 10, syncType = 'audio_features' } = options;
    
    console.log(`\n🔎 [DEBUG-SYNC] ===== STARTING DEBUG SYNC =====`);
    console.log(`🔎 [DEBUG-SYNC] User ID: ${userId}`);
    console.log(`🔎 [DEBUG-SYNC] Track Limit: ${trackLimit}`);
    console.log(`🔎 [DEBUG-SYNC] Sync Type: ${syncType}`);
    
    if (this.isRunning) {
      throw new Error('Sync already in progress');
    }

    this.isRunning = true;
    
    try {
      // Phase 1: Get tracks that need syncing
      this.notifyProgress({
        phase: 'analysis',
        currentStep: `Finding ${trackLimit} tracks that need ${syncType}...`,
        completed: 0,
        total: 100
      });
      
      let tracksToSync = [];
      
      if (syncType === 'audio_features') {
        const result = await window.electronAPI.invoke('debug-sync:get-tracks-missing-audio', userId, trackLimit);
        tracksToSync = result;
        console.log(`🔎 [DEBUG-SYNC] Found ${tracksToSync.length} tracks missing audio features`);
      } else if (syncType === 'genius_data') {
        const result = await window.electronAPI.invoke('debug-sync:get-tracks-missing-genius', userId, trackLimit);
        tracksToSync = result;
        console.log(`🔎 [DEBUG-SYNC] Found ${tracksToSync.length} tracks missing Genius data`);
      }
      
      if (tracksToSync.length === 0) {
        console.log(`✅ [DEBUG-SYNC] No tracks need ${syncType} sync`);
        this.notifyProgress({
          phase: 'complete',
          currentStep: `No tracks need ${syncType} sync`,
          completed: 100,
          total: 100
        });
        return { success: true, synced: 0, message: `No tracks need ${syncType}` };
      }
      
      console.log(`🔎 [DEBUG-SYNC] Sample tracks to sync:`);
      tracksToSync.slice(0, 3).forEach((track, i) => {
        console.log(`   ${i + 1}. "${track.name}" by ${track.artist_name} (${track.id})`);
      });
      
      // Phase 2: Sync the tracks
      this.notifyProgress({
        phase: syncType,
        currentStep: `Syncing ${syncType} for ${tracksToSync.length} tracks...`,
        completed: 0,
        total: tracksToSync.length
      });
      
      let synced = 0;
      let failed = 0;
      
      for (let i = 0; i < tracksToSync.length; i++) {
        const track = tracksToSync[i];
        
        try {
          console.log(`\n🔎 [DEBUG-SYNC] Processing track ${i + 1}/${tracksToSync.length}`);
          console.log(`🔎 [DEBUG-SYNC] Track: "${track.name}" by ${track.artist_name}`);
          console.log(`🔎 [DEBUG-SYNC] Track ID: ${track.id}`);
          
          if (syncType === 'audio_features') {
            const result = await window.electronAPI.invoke('debug-sync:sync-track-audio-features', track.id);
            console.log(`🔎 [DEBUG-SYNC] Audio features result:`, result);
            if (result.success) {
              synced++;
              console.log(`✅ [DEBUG-SYNC] Audio features synced for "${track.name}"`);
            } else {
              failed++;
              console.error(`❌ [DEBUG-SYNC] Audio features failed for "${track.name}":`, result.error);
            }
          } else if (syncType === 'genius_data') {
            const result = await window.electronAPI.invoke('debug-sync:sync-track-genius-data', track.id, track.name, track.artist_name);
            console.log(`🔎 [DEBUG-SYNC] Genius data result:`, result);
            if (result.success) {
              synced++;
              console.log(`✅ [DEBUG-SYNC] Genius data synced for "${track.name}"`);
            } else {
              failed++;
              console.error(`❌ [DEBUG-SYNC] Genius data failed for "${track.name}":`, result.error);
            }
          }
          
          this.notifyProgress({
            currentStep: `Processed ${i + 1}/${tracksToSync.length} tracks - ${synced} synced, ${failed} failed`,
            completed: i + 1
          });
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          failed++;
          console.error(`❌ [DEBUG-SYNC] Error processing "${track.name}":`, error);
        }
      }
      
      // Phase 3: Complete
      this.notifyProgress({
        phase: 'complete',
        currentStep: `Debug sync complete! Synced: ${synced}, Failed: ${failed}`,
        completed: tracksToSync.length,
        total: tracksToSync.length
      });
      
      console.log(`\n🎉 [DEBUG-SYNC] ===== DEBUG SYNC COMPLETE =====`);
      console.log(`🎉 [DEBUG-SYNC] Synced: ${synced}`);
      console.log(`🎉 [DEBUG-SYNC] Failed: ${failed}`);
      console.log(`🎉 [DEBUG-SYNC] Success Rate: ${((synced / tracksToSync.length) * 100).toFixed(1)}%\n`);
      
      return { 
        success: true, 
        synced, 
        failed, 
        total: tracksToSync.length,
        successRate: (synced / tracksToSync.length) * 100
      };
      
    } catch (error) {
      console.error(`\n❌ [DEBUG-SYNC] ===== DEBUG SYNC FAILED =====`);
      console.error(`❌ [DEBUG-SYNC] Error:`, error);
      
      this.notifyProgress({
        phase: 'error',
        currentStep: `Debug sync failed: ${error.message}`,
        errors: [...this.progress.errors, error.message]
      });
      
      throw error;
      
    } finally {
      this.isRunning = false;
    }
  }
}

// Create and export singleton instance
const smartSyncService = new SmartSyncService();

// Export as default - this should fix the import issue
export default smartSyncService;

// Also export the class for testing
export { SmartSyncService };
