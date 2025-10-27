import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import spotifyService from '../../services/spotify';
import playlistEnhancerService from '../../services/playlist-enhancer-service';
import Button from '../Button';
import StatusMessage from '../StatusMessage';
import './PlaylistSelectionPage.css';

const PlaylistSelectionPage = ({ auth }) => {
  const navigate = useNavigate();
  const [view, setView] = useState('select'); // 'select', 'continue', 'new'
  const [playlists, setPlaylists] = useState([]);
  const [enhancedPlaylists, setEnhancedPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (auth.isAuthenticated) {
      loadPlaylists();
    }
  }, [auth.isAuthenticated]);

  const loadPlaylists = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load all user playlists
      const userPlaylists = await spotifyService.getUserPlaylists();
      
      // Filter out empty playlists for "new enhancement" option
      const playlistsWithTracks = userPlaylists.filter(playlist => playlist.track_count > 0);
      setPlaylists(playlistsWithTracks);
      
      // Load enhanced playlists from database
      if (auth.user?.id) {
        try {
          const enhancedPlaylistsData = await playlistEnhancerService.getEnhancedPlaylists(auth.user.id);
          
          // Map enhanced playlist data to include Spotify playlist details
          const enhancedWithDetails = enhancedPlaylistsData.map(enhanced => {
            const spotifyPlaylist = userPlaylists.find(p => p.id === enhanced.playlist_id);
            return {
              ...spotifyPlaylist,
              enhancement_count: enhanced.enhancement_count,
              last_enhanced_at: enhanced.last_enhanced_at,
              total_sessions: enhanced.total_sessions
            };
          }).filter(p => p.id); // Only include playlists that still exist in Spotify
          
          setEnhancedPlaylists(enhancedWithDetails);
          console.log(`✅ [PE-UI] Loaded ${enhancedWithDetails.length} enhanced playlists`);
        } catch (enhancedError) {
          console.warn('⚠️ [PE-UI] Could not load enhanced playlists (migration may not have run):', enhancedError.message);
          setEnhancedPlaylists([]); // Fallback to empty array
        }
      }
      
    } catch (err) {
      console.error('Failed to load playlists:', err);
      setError(`Failed to load playlists: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaylistSelect = (playlist, isEnhanced = false) => {
    console.log('🎯 Selected playlist:', playlist.name, isEnhanced ? '(continuing enhancement)' : '(new enhancement)');
    navigate(`/playlist-enhancer/${playlist.id}`, { 
      state: { playlist, isEnhanced } 
    });
  };

  const OptionCard = ({ title, description, icon, onClick, disabled = false }) => (
    <div 
      className={`option-card ${disabled ? 'disabled' : ''}`}
      onClick={disabled ? undefined : onClick}
    >
      <div className="option-icon">{icon}</div>
      <div className="option-content">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="option-arrow">→</div>
    </div>
  );

  const PlaylistCard = ({ playlist, onSelect, isEnhanced = false }) => (
    <div 
      className={`playlist-card ${isEnhanced ? 'enhanced' : ''}`}
      onClick={() => onSelect(playlist, isEnhanced)}
    >
      <div className="playlist-image">
        {playlist.image_url ? (
          <img src={playlist.image_url} alt={playlist.name} />
        ) : (
          <div className="playlist-placeholder">🎵</div>
        )}
      </div>
      
      <div className="playlist-info">
        <h3 className="playlist-name">{playlist.name}</h3>
        {playlist.description && (
          <p className="playlist-description">{playlist.description}</p>
        )}
        <div className="playlist-meta">
          <span className="track-count">{playlist.track_count} tracks</span>
          {isEnhanced && (
            <>
              <span className="enhanced-badge">✨ Enhanced {playlist.enhancement_count}x</span>
              <span className="last-enhanced">
                Last: {new Date(playlist.last_enhanced_at).toLocaleDateString()}
              </span>
            </>
          )}
          {playlist.public && <span className="public-badge">Public</span>}
        </div>
      </div>
      
      <div className="playlist-actions">
        <Button variant="secondary" size="small">
          {isEnhanced ? 'Continue →' : 'Enhance →'}
        </Button>
      </div>
    </div>
  );

  if (!auth.isAuthenticated) {
    return (
      <div className="playlist-selection-page">
        <div className="page-header">
          <Button 
            onClick={() => navigate('/')} 
            variant="ghost" 
            className="back-button"
          >
            ← Back to Dashboard
          </Button>
          <h1>🚀 Playlist Enhancer</h1>
          <p>Spotify authentication required to access your playlists</p>
        </div>
        
        <StatusMessage 
          type="warning" 
          message="Please authenticate with Spotify first" 
        />
      </div>
    );
  }

  return (
    <div className="playlist-selection-page">
      <div className="page-header">
        <Button 
          onClick={() => navigate('/')} 
          variant="ghost" 
          className="back-button"
        >
          ← Back to Dashboard
        </Button>
        <h1>🚀 Playlist Enhancer</h1>
        <p>Advanced playlist enhancement with Genius and Spotify integration</p>
      </div>

      {error && (
        <StatusMessage 
          type="error" 
          message={error}
          onRetry={loadPlaylists}
        />
      )}

      {loading ? (
        <div className="loading-section">
          <div className="loading-spinner"></div>
          <p>Loading your playlists...</p>
        </div>
      ) : (
        <>
          {view === 'select' && (
            <div className="selection-options">
              <OptionCard
                title="Continue Enhancing"
                description="Resume work on previously enhanced playlists"
                icon="🔄"
                onClick={() => setView('continue')}
                disabled={enhancedPlaylists.length === 0}
              />
              <OptionCard
                title="Start New Enhancement"
                description="Enhance a playlist for the first time"
                icon="✨"
                onClick={() => setView('new')}
              />
            </div>
          )}

          {view === 'continue' && (
            <div className="playlist-section">
              <div className="section-header">
                <Button 
                  onClick={() => setView('select')} 
                  variant="ghost" 
                  className="back-button"
                >
                  ← Back to Options
                </Button>
                <h2>Continue Enhancing</h2>
                <p>Select a playlist you've previously enhanced</p>
              </div>

              {enhancedPlaylists.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🔄</div>
                  <h3>No Enhanced Playlists Yet</h3>
                  <p>Start enhancing a playlist first, then it will appear here for continuation.</p>
                  <Button onClick={() => setView('new')} variant="primary">
                    Start New Enhancement
                  </Button>
                </div>
              ) : (
                <div className="playlists-grid">
                  {enhancedPlaylists.map(playlist => (
                    <PlaylistCard
                      key={playlist.id}
                      playlist={playlist}
                      onSelect={handlePlaylistSelect}
                      isEnhanced={true}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {view === 'new' && (
            <div className="playlist-section">
              <div className="section-header">
                <Button 
                  onClick={() => setView('select')} 
                  variant="ghost" 
                  className="back-button"
                >
                  ← Back to Options
                </Button>
                <h2>Start New Enhancement</h2>
                <p>Select a playlist to enhance for the first time</p>
              </div>

              {playlists.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🎵</div>
                  <h3>No Playlists with Tracks Found</h3>
                  <p>Create playlists with songs in Spotify to get started with enhancement!</p>
                </div>
              ) : (
                <div className="playlists-grid">
                  {playlists.map(playlist => (
                    <PlaylistCard
                      key={playlist.id}
                      playlist={playlist}
                      onSelect={handlePlaylistSelect}
                      isEnhanced={false}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PlaylistSelectionPage;