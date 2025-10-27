import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLikedSongs } from '../hooks/useLikedSongs';
import smartSyncService from '../services/smart-sync-service';
import spotifyService from '../services/spotify';
import Button from './Button';
import StatusMessage from './StatusMessage';
import './SyncLikedSongsPage.css';

const SyncLikedSongsPage = ({ auth }) => {
  const navigate = useNavigate();
  const { getStoredSongs, startSync } = useLikedSongs();
  
  const [storedSongs, setStoredSongs] = useState([]);
  const [viewMode, setViewMode] = useState('overview'); // 'overview', 'songs', 'insights'
  const [syncAnalysis, setSyncAnalysis] = useState(null);
  const [smartSyncProgress, setSmartSyncProgress] = useState(null);
  const [isSmartSyncing, setIsSmartSyncing] = useState(false);
  const [isRegularSyncing, setIsRegularSyncing] = useState(false);
  const [showForceResync, setShowForceResync] = useState(false);
  const [isDebugSyncing, setIsDebugSyncing] = useState(false);
  const [debugResults, setDebugResults] = useState(null);

  // Debug authentication state
  useEffect(() => {
    console.log('\n🔍 [SYNC-PAGE] ===== AUTHENTICATION DEBUG =====');
    console.log('🔍 [SYNC-PAGE] Auth object:', auth);
    console.log('🔍 [SYNC-PAGE] Is authenticated:', auth?.isAuthenticated);
    console.log('🔍 [SYNC-PAGE] User data:', auth?.user);
    console.log('🔍 [SYNC-PAGE] User ID:', auth?.user?.id);
    console.log('🔍 [SYNC-PAGE] Access token exists:', !!auth?.accessToken);
    
    // Also check what the Spotify service thinks
    const spotifyStatus = spotifyService.getStatus();
    console.log('🔍 [SYNC-PAGE] Spotify service status:', spotifyStatus);
    console.log('🔍 [SYNC-PAGE] ========================================\n');
  }, [auth]);

  useEffect(() => {
    if (auth.isAuthenticated) {
      loadStoredSongs();
      analyzeSyncNeeds();
    }
  }, [auth.isAuthenticated]);

  useEffect(() => {
    // Listen to smart sync progress
    const handleProgress = (progress) => {
      setSmartSyncProgress(progress);
    };
    
    smartSyncService.addProgressListener(handleProgress);
    
    return () => {
      smartSyncService.removeProgressListener(handleProgress);
    };
  }, []);

  const loadStoredSongs = async () => {
    try {
      const userId = auth?.user?.id;
      if (!userId) {
        console.warn('⚠️ [SYNC-UI] No user ID available for loadStoredSongs');
        return;
      }
      
      console.log('🎵 [SYNC-UI] Loading stored songs for user:', userId);
      const songs = await getStoredSongs(userId);
      setStoredSongs(songs);
      console.log(`✅ [SYNC-UI] Loaded ${songs?.length || 0} stored songs`);
    } catch (error) {
      console.error('❌ [SYNC-UI] Failed to load stored songs:', error);
    }
  };

  const analyzeSyncNeeds = async () => {
    if (!auth.user?.id) return;
    
    try {
      console.log('🔍 [SYNC-UI] Analyzing sync needs...');
      const analysis = await smartSyncService.analyzeMissingData(auth.user.id);
      setSyncAnalysis(analysis);
      
      // Show force resync option if everything is up to date
      const needsSync = analysis.missingAudioFeatures > 0 || analysis.missingGeniusData > 0;
      setShowForceResync(!needsSync);
      
      console.log('✅ [SYNC-UI] Sync analysis complete:', analysis);
    } catch (error) {
      console.error('❌ [SYNC-UI] Failed to analyze sync needs:', error);
    }
  };

  const handleSmartSync = async (forceResync = false) => {
    try {
      setIsSmartSyncing(true);
      console.log('🚀 [SYNC-UI] Starting smart sync...');
      
      const result = await smartSyncService.startComprehensiveSync(auth.user.id, { forceResync });
      
      console.log('✅ [SYNC-UI] Smart sync completed:', result);
      
      // Refresh data after sync
      await loadStoredSongs();
      await analyzeSyncNeeds();
      
    } catch (error) {
      console.error('❌ [SYNC-UI] Smart sync failed:', error);
    } finally {
      setIsSmartSyncing(false);
    }
  };

  const handleStopSync = () => {
    smartSyncService.stopSync();
    setIsSmartSyncing(false);
  };

  // Debug sync functions
  const handleDebugSyncAudioFeatures = async () => {
    try {
      setIsDebugSyncing(true);
      console.log('🔍 [DEBUG] Starting debug sync for audio features (10 tracks)...');
      
      const result = await window.electronAPI.invoke('debug:sync-audio-features');
      
      setDebugResults({
        type: 'audio_features',
        result,
        timestamp: new Date().toLocaleString()
      });
      
      console.log('✅ [DEBUG] Audio features debug sync completed:', result);
      
      // Refresh analysis after debug sync
      await analyzeSyncNeeds();
      
    } catch (error) {
      console.error('❌ [DEBUG] Audio features debug sync failed:', error);
      setDebugResults({
        type: 'audio_features',
        error: error.message,
        timestamp: new Date().toLocaleString()
      });
    } finally {
      setIsDebugSyncing(false);
    }
  };

  const handleDebugSyncGenius = async () => {
    try {
      setIsDebugSyncing(true);
      console.log('🔍 [DEBUG] Starting debug sync for Genius data (10 tracks)...');
      
      const result = await window.electronAPI.invoke('debug:sync-genius-data');
      
      setDebugResults({
        type: 'genius_data',
        result,
        timestamp: new Date().toLocaleString()
      });
      
      console.log('✅ [DEBUG] Genius debug sync completed:', result);
      
      // Refresh analysis after debug sync
      await analyzeSyncNeeds();
      
    } catch (error) {
      console.error('❌ [DEBUG] Genius debug sync failed:', error);
      setDebugResults({
        type: 'genius_data',
        error: error.message,
        timestamp: new Date().toLocaleString()
      });
    } finally {
      setIsDebugSyncing(false);
    }
  };

  const handleRegularSync = async () => {
    try {
      const userId = auth?.user?.id;
      if (!userId) {
        console.error('❌ [SYNC-UI] No user ID available for regular sync');
        setError('No authenticated Spotify user found');
        return;
      }
      
      setIsRegularSyncing(true);
      console.log(`🎵 [SYNC-UI] Starting regular liked songs sync for user: ${userId}...`);
      
      const result = await startSync({ userId });
      
      console.log('✅ [SYNC-UI] Regular sync completed:', result);
      
      // Refresh data after sync
      await loadStoredSongs();
      await analyzeSyncNeeds();
      
    } catch (error) {
      console.error('❌ [SYNC-UI] Regular sync failed:', error);
    } finally {
      setIsRegularSyncing(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!auth.isAuthenticated) {
    return (
      <div className="sync-page">
        <div className="page-header">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="back-button"
          >
            ← Back to Dashboard
          </Button>
          <h1>Sync Liked Songs</h1>
        </div>
        
        <div className="auth-required">
          <h2>Authentication Required</h2>
          <p>Please connect your Spotify account to sync your liked songs</p>
          <Button onClick={() => navigate('/')}>
            Go Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="sync-page">
      <div className="page-header">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="back-button"
        >
          ← Back to Dashboard
        </Button>
        <h1>Sync Liked Songs</h1>
        <p>Analyze and sync your Spotify liked songs with enhanced metadata</p>
      </div>

      {/* Navigation Tabs */}
      <div className="view-tabs">
        <button 
          className={`tab ${viewMode === 'overview' ? 'active' : ''}`}
          onClick={() => setViewMode('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab ${viewMode === 'songs' ? 'active' : ''}`}
          onClick={() => setViewMode('songs')}
        >
          Songs ({storedSongs.length})
        </button>
        <button 
          className={`tab ${viewMode === 'insights' ? 'active' : ''}`}
          onClick={() => setViewMode('insights')}
        >
          Insights
        </button>
      </div>

      <div className="sync-content">
        {/* Overview Tab */}
        {viewMode === 'overview' && (
          <div className="overview-section">
            {/* Sync Status Card */}
            <div className="status-card">
              <h2>Smart Sync Status</h2>
              
              {/* Data Analysis Results */}
              {syncAnalysis && (
                <div className="sync-analysis">
                  <div className="analysis-stats">
                    <div className="stat">
                      <span className="stat-number">{syncAnalysis.totalTracks}</span>
                      <span className="stat-label">Total Tracks</span>
                    </div>
                    <div className="stat">
                      <span className="stat-number">{syncAnalysis.missingAudioFeatures}</span>
                      <span className="stat-label">Need Audio Features</span>
                    </div>
                    <div className="stat">
                      <span className="stat-number">{syncAnalysis.missingGeniusData}</span>
                      <span className="stat-label">Need Genius Data</span>
                    </div>
                    <div className="stat">
                      <span className="stat-number">{syncAnalysis.staleData}</span>
                      <span className="stat-label">Stale Data</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Progress Display */}
              {isSmartSyncing && smartSyncProgress ? (
                <div className="sync-progress">
                  <div className="progress-header">
                    <span className="progress-phase">{smartSyncProgress.phase.toUpperCase()}</span>
                    <span className="progress-count">
                      {smartSyncProgress.completed} / {smartSyncProgress.total}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${(smartSyncProgress.completed / smartSyncProgress.total) * 100}%` }}
                    ></div>
                  </div>
                  <p className="progress-step">{smartSyncProgress.currentStep}</p>
                  
                  {smartSyncProgress.errors.length > 0 && (
                    <div className="progress-errors">
                      ⚠️ {smartSyncProgress.errors.length} errors occurred
                    </div>
                  )}
                </div>
              ) : (
                <div className="sync-ready">
                  {/* Smart Sync Recommendations */}
                  {syncAnalysis && (
                    <div className="sync-recommendations">
                      {syncAnalysis.totalTracks === 0 ? (
                        <div className="no-data-found">
                          <div className="no-data-icon">🎵</div>
                          <h3>No Liked Songs Found</h3>
                          <p>It looks like you don't have any liked songs synced yet. You'll need to sync your liked songs first before using Smart Sync.</p>
                          <div className="sync-suggestions">
                            <p><strong>How to get started:</strong></p>
                            <ol>
                              <li>Use the "Regular Sync" button below to sync your Spotify liked songs</li>
                              <li>This will download all your liked songs to the database</li>
                              <li>Then Smart Sync can analyze and enhance your data</li>
                            </ol>
                          </div>
                          
                          {/* Add Regular Sync Button */}
                          <div className="regular-sync-section">
                            <Button 
                              onClick={handleRegularSync}
                              variant="primary"
                              size="large"
                              className="regular-sync-button"
                              disabled={isRegularSyncing}
                            >
                              {isRegularSyncing ? '🔄 Syncing Liked Songs...' : '🎵 Start Regular Sync'}
                            </Button>
                            <p className="sync-description">
                              This will download your liked songs from Spotify and save them to the database.
                            </p>
                          </div>
                          
                          {syncAnalysis.error && (
                            <div className="error-details">
                              <p><strong>Technical Details:</strong> {syncAnalysis.error}</p>
                            </div>
                          )}
                        </div>
                      ) : syncAnalysis.missingAudioFeatures === 0 && syncAnalysis.missingGeniusData === 0 ? (
                        <div className="up-to-date">
                          ✅ All data is up to date!
                          {showForceResync && (
                            <p className="resync-note">You can force a complete resync if needed.</p>
                          )}
                        </div>
                      ) : (
                        <div className="needs-sync">
                          <p>Missing data detected - smart sync will only update what's needed:</p>
                          <ul className="sync-todo">
                            {syncAnalysis.missingAudioFeatures > 0 && (
                              <li>🎵 Sync {syncAnalysis.missingAudioFeatures} tracks with audio features</li>
                            )}
                            {syncAnalysis.missingGeniusData > 0 && (
                              <li>🎭 Analyze {syncAnalysis.missingGeniusData} tracks with Genius</li>
                            )}
                            {syncAnalysis.staleData > 0 && (
                              <li>🔄 Update {syncAnalysis.staleData} tracks with stale data</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Sync Buttons */}
                  <div className="sync-buttons">
                    {syncAnalysis && syncAnalysis.totalTracks === 0 ? (
                      // Show regular sync button when no data
                      <Button 
                        onClick={handleRegularSync}
                        variant="primary"
                        size="large"
                        className="sync-button"
                        disabled={isRegularSyncing || !auth.isAuthenticated}
                      >
                        {isRegularSyncing ? '🔄 Syncing Liked Songs...' : '🎵 Sync Your Liked Songs'}
                      </Button>
                    ) : (
                      // Show smart sync buttons when data exists
                      <>
                        <Button 
                          onClick={() => handleSmartSync(false)}
                          variant="primary"
                          size="large"
                          className="sync-button"
                          disabled={isSmartSyncing || !syncAnalysis}
                        >
                          {syncAnalysis && syncAnalysis.missingAudioFeatures === 0 && syncAnalysis.missingGeniusData === 0
                            ? '✅ Data Up to Date'
                            : '🧠 Smart Sync (Update Missing Data)'}
                        </Button>
                        
                        {showForceResync && (
                          <Button 
                            onClick={() => handleSmartSync(true)}
                            variant="secondary"
                            size="large"
                            className="sync-button force-sync"
                            disabled={isSmartSyncing}
                          >
                            🔄 Force Complete Resync
                          </Button>
                        )}
                      </>
                    )}
                    
                    {(isSmartSyncing || isRegularSyncing) && (
                      <Button 
                        onClick={isSmartSyncing ? handleStopSync : () => setIsRegularSyncing(false)}
                        variant="danger"
                        size="medium"
                        className="stop-sync-button"
                      >
                        ⏹️ Stop Sync
                      </Button>
                    )}
                  </div>
                  
                  {/* Debug Sync Section */}
                  {syncAnalysis && syncAnalysis.totalTracks > 0 && (
                    <div className="debug-sync-section">
                      <h3>🔍 Debug Sync (10 tracks at a time)</h3>
                      <p className="debug-description">
                        Test sync functionality in small batches to debug issues
                      </p>
                      
                      <div className="debug-buttons">
                        <Button 
                          onClick={handleDebugSyncAudioFeatures}
                          variant="secondary"
                          size="medium"
                          className="debug-button"
                          disabled={isDebugSyncing || isSmartSyncing}
                        >
                          {isDebugSyncing ? '🔄 Syncing...' : '🎵 Just Sync 10 Audio Features'}
                        </Button>
                        
                        <Button 
                          onClick={handleDebugSyncGenius}
                          variant="secondary"
                          size="medium"
                          className="debug-button"
                          disabled={isDebugSyncing || isSmartSyncing}
                        >
                          {isDebugSyncing ? '🔄 Syncing...' : '🎭 Just Sync 10 Genius Data'}
                        </Button>
                      </div>
                      
                      {/* Debug Results */}
                      {debugResults && (
                        <div className="debug-results">
                          <h4>🔍 Debug Results ({debugResults.timestamp})</h4>
                          {debugResults.error ? (
                            <div className="debug-error">
                              <p><strong>❌ Error:</strong> {debugResults.error}</p>
                            </div>
                          ) : (
                            <div className="debug-success">
                              <p><strong>✅ Success:</strong> {debugResults.type} debug sync completed</p>
                              {debugResults.result && (
                                <pre className="debug-data">
                                  {JSON.stringify(debugResults.result, null, 2)}
                                </pre>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Insights */}
            {storedSongs.length > 0 && (
              <div className="quick-insights">
                <h2>Quick Insights</h2>
                <div className="insights-grid">
                  <div className="insight-card">
                    <span className="insight-icon">🎵</span>
                    <span className="insight-value">{storedSongs.length}</span>
                    <span className="insight-label">Total Tracks</span>
                  </div>
                  <div className="insight-card">
                    <span className="insight-icon">🎤</span>
                    <span className="insight-value">
                      {new Set(storedSongs.map(song => song.artist_name)).size}
                    </span>
                    <span className="insight-label">Unique Artists</span>
                  </div>
                  <div className="insight-card">
                    <span className="insight-icon">💿</span>
                    <span className="insight-value">
                      {new Set(storedSongs.map(song => song.album_name)).size}
                    </span>
                    <span className="insight-label">Albums</span>
                  </div>
                  <div className="insight-card">
                    <span className="insight-icon">⏱️</span>
                    <span className="insight-value">
                      {Math.round(storedSongs.reduce((acc, song) => acc + (song.duration_ms || 0), 0) / 1000 / 60)} min
                    </span>
                    <span className="insight-label">Total Duration</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Songs Tab */}
        {viewMode === 'songs' && (
          <div className="songs-section">
            <div className="songs-header">
              <h2>Your Liked Songs</h2>
              <div className="songs-controls">
                <input 
                  type="text" 
                  placeholder="Search songs, artists, albums..."
                  className="search-input"
                />
                <select className="sort-select">
                  <option value="added_at">Recently Added</option>
                  <option value="track_name">Song Name</option>
                  <option value="artist_name">Artist</option>
                  <option value="album_name">Album</option>
                </select>
              </div>
            </div>

            <div className="songs-list">
              {storedSongs.length === 0 ? (
                <div className="empty-state">
                  <p>No songs synced yet. Start a sync to see your liked songs here.</p>
                </div>
              ) : (
                storedSongs.slice(0, 50).map((song, index) => (
                  <div key={song.spotify_id || index} className="song-item">
                    <div className="song-info">
                      <img 
                        src={song.album_image_url || '/placeholder-album.png'} 
                        alt={song.album_name}
                        className="album-art"
                      />
                      <div className="song-details">
                        <h4>{song.track_name}</h4>
                        <p>{song.artist_name}</p>
                        <span className="album-name">{song.album_name}</span>
                      </div>
                    </div>
                    <div className="song-meta">
                      <span className="duration">
                        {Math.floor((song.duration_ms || 0) / 60000)}:
                        {String(Math.floor(((song.duration_ms || 0) % 60000) / 1000)).padStart(2, '0')}
                      </span>
                      <span className="added-date">
                        {formatDate(song.added_at)}
                      </span>
                    </div>
                  </div>
                ))
              )}
              
              {storedSongs.length > 50 && (
                <div className="load-more">
                  <p>Showing first 50 songs of {storedSongs.length}</p>
                  <Button variant="secondary">Load More</Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Insights Tab */}
        {viewMode === 'insights' && (
          <div className="insights-section">
            <h2>Music Insights</h2>
            <div className="insights-content">
              {storedSongs.length === 0 ? (
                <div className="empty-state">
                  <p>Sync your liked songs to see detailed insights about your music taste.</p>
                </div>
              ) : (
                <div className="coming-soon-insights">
                  <div className="feature-preview">
                    <h3>Coming Soon</h3>
                    <ul>
                      <li>📊 Audio feature analysis (energy, danceability, valence)</li>
                      <li>🎭 Genre distribution charts</li>
                      <li>📈 Listening patterns over time</li>
                      <li>🔍 Mood and tempo insights</li>
                      <li>💝 Favorite artists and discovery trends</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SyncLikedSongsPage;
