import { useState, useCallback } from 'react';
import likedSongsWorker from '../workers/likedSongsSync';
import lyricsWorker from '../workers/lyricsSync';
import spotifyService from '../services/spotify';
import databaseService from '../services/database-ipc';

// Simplified hook for managing liked songs sync (browser-compatible)
export const useLikedSongs = () => {
  const [syncProgress, setSyncProgress] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStats, setSyncStats] = useState(null);
  const [storedSongs, setStoredSongs] = useState([]);
  const [error, setError] = useState(null);
  
  // Lyrics sync state
  const [lyricsProgress, setLyricsProgress] = useState(null);
  const [isLyricsSync, setIsLyricsSync] = useState(false);
  const [lyricsStats, setLyricsStats] = useState(null);
  
  // Helper function to get current user ID
  const getCurrentUserId = () => {
    const spotifyStatus = spotifyService.getStatus();
    if (spotifyStatus.authenticated && spotifyStatus.user?.id) {
      console.log('👤 [HOOK] Using Spotify user ID:', spotifyStatus.user.id);
      return spotifyStatus.user.id;
    }
    console.warn('⚠️ [HOOK] No authenticated Spotify user found');
    return null;
  };
  
  // Use the spotify service directly

  // Start sync process
  const startSync = useCallback(async (options = {}) => {
    // Allow userId to be passed in options, otherwise get from service
    const userId = options.userId || getCurrentUserId();
    if (!userId) {
      setError('No authenticated Spotify user found');
      return;
    }
    
    if (!spotifyService.getStatus().authenticated) {
      setError('Spotify not authenticated');
      return;
    }
    
    try {
      console.log(`🚀 Hook: Starting sync process for user: ${userId}...`);
      setError(null);
      setIsSyncing(true);
      setSyncProgress({
        total: 0,
        completed: 0,
        failed: 0,
        currentStep: 'Initializing...'
      });
      
      // Check database connection before starting
      try {
        const dbStatus = await databaseService.healthCheck();
        console.log('🔍 Hook: Database health check:', dbStatus);
        
        if (!dbStatus.connected) {
          throw new Error('Database not connected - please check PostgreSQL');
        }
      } catch (dbError) {
        console.error('❌ Hook: Database check failed:', dbError.message);
        setError(`Database connection failed: ${dbError.message}`);
        return;
      }
      
      const result = await likedSongsWorker.syncUserLikedSongs(spotifyService, {
        ...options,
        userId, // Pass the user ID to the worker
        onProgress: (progress) => {
          console.log('📊 Hook: Progress update:', progress);
          setSyncProgress(progress);
        }
      });
      
      console.log('✅ Hook: Sync completed with result:', result);
      
      // Refresh stored songs from database using the correct user ID
      try {
        const dbSongs = await databaseService.getUserLikedSongs(userId);
        console.log(`🎵 Hook: Retrieved ${dbSongs?.length || 0} songs from database for user: ${userId}`);
        setStoredSongs(dbSongs || []);
      } catch (dbError) {
        console.error('❌ Hook: Failed to retrieve songs from database:', dbError.message);
        setStoredSongs(result.songs || []); // fallback to sync result
      }
      
      setSyncStats({
        lastSync: new Date().toISOString(),
        total: result.total,
        synced: result.synced,
        failed: result.failed
      });
      
      setSyncProgress(null);
      return result;
      
    } catch (err) {
      console.error('💥 Hook: Sync failed:', err.message);
      setError(err.message);
      setSyncProgress(null);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Stop ongoing sync
  const stopSync = useCallback(() => {
    likedSongsWorker.stop();
    setIsSyncing(false);
    setSyncProgress(null);
  }, []);

  // Get stored songs from database
  const getStoredSongs = useCallback(async (userId = null) => {
    const actualUserId = userId || getCurrentUserId();
    if (!actualUserId) {
      console.warn('⚠️ Hook: No authenticated user for getStoredSongs');
      setError('No authenticated Spotify user found');
      return [];
    }
    
    try {
      console.log(`🎵 Hook: Fetching stored songs from database for user: ${actualUserId}...`);
      const dbSongs = await databaseService.getUserLikedSongs(actualUserId);
      console.log(`✅ Hook: Retrieved ${dbSongs?.length || 0} songs from database for user: ${actualUserId}`);
      setStoredSongs(dbSongs || []);
      return dbSongs || [];
    } catch (error) {
      console.error('❌ Hook: Failed to get stored songs:', error.message);
      setError(`Failed to retrieve songs: ${error.message}`);
      return storedSongs; // fallback to cached state
    }
  }, [storedSongs]);

  // Start lyrics sync process
  const startLyricsSync = useCallback(async (options = {}) => {
    const userId = getCurrentUserId();
    if (!userId) {
      setError('No authenticated Spotify user found');
      return;
    }
    
    try {
      console.log(`🎭 Hook: Starting lyrics sync process for user: ${userId}...`);
      setError(null);
      setIsLyricsSync(true);
      setLyricsProgress({
        total: 0,
        completed: 0,
        failed: 0,
        currentStep: 'Initializing lyrics sync...'
      });

      const result = await lyricsWorker.syncLyrics(userId, {
        ...options,
        onProgress: (progress) => {
          console.log('📊 Hook: Lyrics progress update:', progress);
          setLyricsProgress(progress);
        }
      });

      console.log('✅ Hook: Lyrics sync completed with result:', result);

      setLyricsStats({
        lastSync: new Date().toISOString(),
        total: result.total,
        analyzed: result.analyzed,
        skipped: result.skipped
      });

      setLyricsProgress(null);
      return result;

    } catch (err) {
      console.error('💥 Hook: Lyrics sync failed:', err.message);
      setError(`Lyrics sync failed: ${err.message}`);
      setLyricsProgress(null);
      throw err;
    } finally {
      setIsLyricsSync(false);
    }
  }, []);

  // Stop lyrics sync
  const stopLyricsSync = useCallback(() => {
    lyricsWorker.stop();
    setIsLyricsSync(false);
    setLyricsProgress(null);
  }, []);

  // Reset sync state
  const resetSync = useCallback(() => {
    likedSongsWorker.reset();
    lyricsWorker.reset();
    setSyncProgress(null);
    setLyricsProgress(null);
    setIsSyncing(false);
    setIsLyricsSync(false);
    setError(null);
  }, []);

  return {
    // Spotify sync
    syncProgress,
    isSyncing,
    syncStats,
    startSync,
    stopSync,
    getStoredSongs,
    resetSync,
    
    // Lyrics sync
    lyricsProgress,
    isLyricsSync,
    lyricsStats,
    startLyricsSync,
    stopLyricsSync,
    
    // Shared
    error
  };
};

// Hook for curation (placeholder for future implementation)
export const useCuration = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Placeholder methods
  const createSession = useCallback(async () => {
    setError('Curation features coming soon!');
  }, []);

  const generateRecommendations = useCallback(async () => {
    setError('Smart recommendations coming soon!');
  }, []);

  return {
    sessions,
    loading,
    error,
    createSession,
    generateRecommendations
  };
};

// Hook for database status (placeholder)
export const useDatabase = () => {
  const [status] = useState({ connected: false, initialized: false });
  const [loading] = useState(false);
  const [error] = useState('Database features will be available in full desktop mode');

  return {
    status,
    loading,
    error,
    initialize: () => Promise.resolve(false),
    healthCheck: () => Promise.resolve(false)
  };
};
