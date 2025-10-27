import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import spotifyService from '../../services/spotify';
import playlistEnhancerService from '../../services/playlist-enhancer-service';
import Button from '../Button';
import StatusMessage from '../StatusMessage';
import './EnhancerPage.css';

const EnhancerPage = ({ auth }) => {
  const { playlistId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [playlist, setPlaylist] = useState(location.state?.playlist || null);
  const [seedTracks, setSeedTracks] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recommendationType, setRecommendationType] = useState(null);

  useEffect(() => {
    if (auth.isAuthenticated && playlistId) {
      loadPlaylistDetails();
    }
  }, [auth.isAuthenticated, playlistId]);

  const loadPlaylistDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      let playlistData = playlist;
      
      if (!playlistData) {
        // If no playlist data passed via state, fetch it
        console.log(`🎵 [PE-UI] Loading playlist details for: ${playlistId}`);
        playlistData = await spotifyService.getPlaylistDetails(playlistId);
        setPlaylist(playlistData);
      }
      
      // Load playlist tracks if not already loaded
      if (!playlistData.tracks || playlistData.tracks.length === 0) {
        console.log(`🎵 [PE-UI] Loading tracks for playlist: ${playlistData.name}`);
        const tracks = await spotifyService.getPlaylistTracks(playlistId);
        playlistData = {
          ...playlistData,
          tracks: tracks
        };
        setPlaylist(playlistData);
        console.log(`✅ [PE-UI] Loaded ${tracks.length} tracks`);
      }

      // Select seed tracks (first 5 tracks for now)
      // TODO: Implement smart seed selection algorithm based on audio features
      const availableTracks = playlistData.tracks || [];
      const selectedSeeds = availableTracks.slice(0, Math.min(5, availableTracks.length));
      setSeedTracks(selectedSeeds);
      
      console.log(`🎯 [PE-UI] Selected ${selectedSeeds.length} seed tracks:`);
      selectedSeeds.forEach((track, i) => {
        console.log(`   ${i + 1}. ${track.name} - ${track.artist_name}`);
      });

    } catch (err) {
      console.error('Failed to load playlist details:', err);
      setError(`Failed to load playlist: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getRecommendations = async (sourceType) => {
    try {
      setLoading(true);
      setError(null);
      setRecommendationType(sourceType);
      
      console.log(`🎯 Getting recommendations from ${sourceType}...`);
      
      if (!auth.user?.id) {
        throw new Error('User not authenticated');
      }
      
      if (!seedTracks || seedTracks.length === 0) {
        throw new Error('No seed tracks available');
      }
      
      // Get real recommendations from database
      const recommendations = await playlistEnhancerService.getRecommendations(
        seedTracks,
        sourceType,
        auth.user.id,
        10
      );
      
      // Format recommendations for display
      const formattedRecommendations = recommendations.map((track, index) => {
        const formatted = playlistEnhancerService.formatTrackForDisplay(track);
        
        console.log(`🐛 [DEBUG] Raw track data for ${track.name}:`, {
          name: track.name,
          similarity_score: track.similarity_score,
          combined_popularity_score: track.combined_popularity_score,
          spotify_popularity: track.spotify_popularity || track.popularity
        });
        
        // Calculate similarity score if we have seed tracks with audio features
        if (seedTracks.length > 0 && seedTracks[0].danceability !== undefined) {
          const avgSeedFeatures = calculateAverageSeedFeatures(seedTracks);
          formatted.similarity_score = playlistEnhancerService.calculateSimilarityScore(
            avgSeedFeatures,
            track
          );
          formatted.reason = playlistEnhancerService.generateSimilarityReason(
            avgSeedFeatures,
            track,
            formatted.similarity_score
          );
          console.log(`🐛 [DEBUG] Calculated similarity for ${track.name}: ${formatted.similarity_score}`);
        } else {
          // Normalize the combined popularity score to 0-1 range
          // Genius scores can be very high (thousands), so we'll use a more aggressive normalization
          const maxExpectedScore = 50000; // Reasonable maximum for very popular songs
          const normalizedScore = Math.min(track.combined_popularity_score / maxExpectedScore, 1.0);
          formatted.similarity_score = normalizedScore;
          formatted.reason = 'Based on popularity and genre matching';
          console.log(`🐛 [DEBUG] Using popularity-based similarity for ${track.name}: ${formatted.similarity_score.toFixed(4)} (normalized from ${track.combined_popularity_score})`);
        }
        
        return {
          ...formatted,
          source: sourceType,
          added: false
        };
      });
      
      setRecommendations(formattedRecommendations);
      
      // Save session to database
      await saveEnhancementSession(sourceType, formattedRecommendations);
      
    } catch (err) {
      console.error('Failed to get recommendations:', err);
      setError(`Failed to get recommendations: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate average audio features from seed tracks
  const calculateAverageSeedFeatures = (seeds) => {
    const features = ['danceability', 'energy', 'valence', 'acousticness', 'tempo'];
    const avg = {};
    
    features.forEach(feature => {
      const values = seeds
        .map(track => track[feature])
        .filter(val => val !== undefined && val !== null);
      
      if (values.length > 0) {
        avg[feature] = values.reduce((sum, val) => sum + val, 0) / values.length;
      }
    });
    
    return avg;
  };
  
  // Save enhancement session to database
  const saveEnhancementSession = async (sourceType, recommendations) => {
    try {
      console.log('💾 [PE-UI] Attempting to save enhancement session...');
      
      // Check if user ID exists
      if (!auth.user?.id) {
        console.warn('⚠️ [PE-UI] No user ID available, skipping session save');
        return;
      }
      
      const sessionData = {
        userId: auth.user.id,
        spotifyPlaylistId: playlistId,
        playlistName: playlist?.name || 'Unknown Playlist',
        sessionType: sourceType,
        seedTracks: seedTracks.map(track => track.id),
        recommendedTracks: recommendations.map(track => track.id),
        addedTracks: [] // Will be updated when user adds tracks
      };
      
      console.log(`📝 [PE-UI] Session data:`, {
        userId: sessionData.userId,
        playlistName: sessionData.playlistName,
        sessionType: sessionData.sessionType,
        seedCount: sessionData.seedTracks.length,
        recommendedCount: sessionData.recommendedTracks.length
      });
      
      await playlistEnhancerService.saveEnhancementSession(sessionData);
      console.log('✅ [PE-UI] Enhancement session saved successfully');
      
    } catch (error) {
      console.warn('⚠️ [PE-UI] Failed to save enhancement session (continuing anyway):', error.message);
      // Don't throw error - this shouldn't block the UI
    }
  };

  // Mock recommendation generator until we implement the real engine
  const generateMockRecommendations = (sourceType) => {
    const mockTracks = [
      {
        id: 'mock1',
        name: 'Wild Mountain Honey',
        artist_name: 'Steve Miller Band',
        album_name: 'Rock Love',
        similarity_score: 0.92,
        reason: 'Similar banjo elements and folk energy'
      },
      {
        id: 'mock2', 
        name: 'Wagon Wheel',
        artist_name: 'Darius Rucker',
        album_name: 'Learn to Live',
        similarity_score: 0.88,
        reason: 'Matching acoustic folk style'
      },
      {
        id: 'mock3',
        name: 'Little Lion Man',
        artist_name: 'Mumford & Sons',
        album_name: 'Sigh No More',
        similarity_score: 0.85,
        reason: 'Similar banjo-driven energy'
      },
      {
        id: 'mock4',
        name: 'Ho Hey',
        artist_name: 'The Lumineers',
        album_name: 'The Lumineers',
        similarity_score: 0.83,
        reason: 'Folk rhythm and harmonies'
      },
      {
        id: 'mock5',
        name: 'I Will Wait',
        artist_name: 'Mumford & Sons',
        album_name: 'Babel',
        similarity_score: 0.81,
        reason: 'Banjo-driven upbeat folk'
      }
    ];

    return mockTracks.map(track => ({
      ...track,
      source: sourceType,
      added: false
    }));
  };

  const handleAddToPlaylist = async (track) => {
    try {
      setLoading(true);
      
      console.log('Adding track to playlist:', track.name);
      
      // TODO: Implement actual Spotify playlist modification
      // For now, just add to local state
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Add track to current playlist state
      setPlaylist(prev => ({
        ...prev,
        tracks: [...(prev.tracks || []), {
          id: track.id,
          name: track.name,
          artist_name: track.artist_name,
          album_name: track.album_name,
          added_via_enhancer: true // Mark as added through enhancer
        }],
        track_count: (prev.track_count || 0) + 1
      }));
      
      // Mark track as added in recommendations
      setRecommendations(prev => 
        prev.map(t => t.id === track.id ? {...t, added: true} : t)
      );
      
      console.log(`✅ [PE-UI] Added ${track.name} to playlist`);
      
      // TODO: Update enhancement session with added track in database
      
    } catch (err) {
      console.error('Failed to add track:', err);
      setError(`Failed to add track: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const PlaylistHeader = ({ playlist }) => (
    <div className="playlist-header">
      <div className="playlist-header-image">
        {playlist?.image_url ? (
          <img src={playlist.image_url} alt={playlist.name} />
        ) : (
          <div className="playlist-placeholder">🎵</div>
        )}
      </div>
      <div className="playlist-header-info">
        <h1>{playlist?.name || 'Loading...'}</h1>
        <p className="playlist-stats">
          {playlist?.track_count || 0} tracks
          {playlist?.description && ` • ${playlist.description}`}
        </p>
      </div>
    </div>
  );

  const SeedSongsSection = ({ tracks }) => (
    <div className="section-card">
      <h2>🎯 Seed Songs</h2>
      <p>These songs are being analyzed to find similar tracks</p>
      
      <div className="seed-tracks-list">
        {tracks.length === 0 ? (
          <div className="loading-seeds">Analyzing playlist tracks...</div>
        ) : (
          tracks.map((track, index) => (
            <div key={track.id || index} className="seed-track">
              <div className="seed-track-number">{index + 1}</div>
              <div className="track-info">
                <span className="track-name">{track.name}</span>
                <span className="track-artist">{track.artist_name}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const CurrentPlaylistSection = ({ tracks }) => (
    <div className="section-card">
      <h2>🎵 Current Playlist</h2>
      <p>Songs currently in your playlist</p>
      
      <div className="current-tracks-list">
        {!tracks || tracks.length === 0 ? (
          <div className="loading-tracks">Loading playlist tracks...</div>
        ) : (
          <div className="tracks-grid">
            {tracks.map((track, index) => (
              <div 
                key={track.id || index} 
                className={`current-track ${track.added_via_enhancer ? 'enhanced-track' : ''}`}
              >
                <div className="track-info">
                  <span className="track-name">{track.name}</span>
                  <span className="track-artist">{track.artist_name}</span>
                  {track.added_via_enhancer && (
                    <span className="enhanced-indicator">✨ Added via Enhancer</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const ActionButton = ({ onClick, loading, children, variant = "primary" }) => (
    <Button 
      onClick={onClick}
      disabled={loading}
      variant={variant}
      className="action-button"
    >
      {loading ? (
        <span>
          <div className="button-spinner"></div>
          Analyzing...
        </span>
      ) : children}
    </Button>
  );

  const RecommendationsSection = ({ recommendations, onAddToPlaylist }) => (
    <div className="section-card recommendations-section">
      <h2>🚀 Recommendations</h2>
      {recommendationType && (
        <p>
          Found {recommendations.length} similar songs from {recommendationType === 'liked_songs' ? 'your liked songs' : 'all music'}
        </p>
      )}
      
      <div className="recommendations-list">
        {recommendations.map(track => (
          <div key={track.id} className={`recommendation-track ${track.added ? 'added' : ''}`}>
            <div className="track-main-info">
              <div className="track-details">
                <span className="track-name">{track.name}</span>
                <span className="track-artist">{track.artist_name}</span>
                <span className="track-album">{track.album_name}</span>
              </div>
              <div className="similarity-info">
                <span className="similarity-score">
                  {Math.round(track.similarity_score * 100)}% match
                  {/* Debug: raw={track.similarity_score.toFixed(4)} */}
                </span>
                <span className="similarity-reason">{track.reason}</span>
              </div>
            </div>
            <div className="track-actions">
              {track.added ? (
                <Button variant="ghost" disabled>
                  ✓ Added
                </Button>
              ) : (
                <Button 
                  variant="primary" 
                  size="small"
                  onClick={() => onAddToPlaylist(track)}
                >
                  Add to Playlist
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (!auth.isAuthenticated) {
    return (
      <div className="enhancer-page">
        <div className="page-header">
          <Button 
            onClick={() => navigate('/playlist-enhancer')} 
            variant="ghost" 
            className="back-button"
          >
            ← Back to Playlist Enhancer
          </Button>
          <h1>Playlist Enhancement</h1>
          <p>Spotify authentication required</p>
        </div>
        
        <StatusMessage 
          type="warning" 
          message="Please authenticate with Spotify first" 
        />
      </div>
    );
  }

  return (
    <div className="enhancer-page">
      <div className="page-header">
        <Button 
          onClick={() => navigate('/playlist-enhancer')} 
          variant="ghost" 
          className="back-button"
        >
          ← Back to Playlist Enhancer
        </Button>
      </div>

      {error && (
        <StatusMessage 
          type="error" 
          message={error}
          onRetry={loadPlaylistDetails}
        />
      )}

      <div className="enhancer-content">
        <PlaylistHeader playlist={playlist} />
        
        <div className="enhancer-sections">
          <div className="left-column">
            <SeedSongsSection tracks={seedTracks} />
            <CurrentPlaylistSection tracks={playlist?.tracks} />
          </div>
          
          <div className="right-column">
            <div className="section-card recommendation-actions">
              <h2>🎯 Find Similar Songs</h2>
              <p>Choose where to search for recommendations</p>
              
              <div className="action-buttons">
                <ActionButton
                  onClick={() => getRecommendations('liked_songs')}
                  loading={loading && recommendationType === 'liked_songs'}
                  variant="secondary"
                >
                  Find 10 similar songs from my liked songs
                </ActionButton>
                
                <ActionButton
                  onClick={() => getRecommendations('all_music')}
                  loading={loading && recommendationType === 'all_music'}
                  variant="primary"
                >
                  Find 10 similar songs from all music
                </ActionButton>
              </div>
            </div>
            
            {recommendations.length > 0 && (
              <RecommendationsSection 
                recommendations={recommendations}
                onAddToPlaylist={handleAddToPlaylist}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancerPage;