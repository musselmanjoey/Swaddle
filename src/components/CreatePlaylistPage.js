import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { presetPlaylists, customPlaylist } from '../data/presets';
import { usePlaylistCreator } from '../hooks/useSpotify';
import Button from './Button';
import Input from './Input';
import StatusMessage from './StatusMessage';
import PresetCard from './PresetCard';
import TrackResults from './TrackResults';
import './CreatePlaylistPage.css';

const CreatePlaylistPage = ({ auth }) => {
  const navigate = useNavigate();
  const [selectedPreset, setSelectedPreset] = useState('haunted');
  const [playlistName, setPlaylistName] = useState('');
  const [playlistDescription, setPlaylistDescription] = useState('');
  const [trackList, setTrackList] = useState('');
  
  const playlistCreator = usePlaylistCreator();

  // Get all presets including custom
  const allPresets = { ...presetPlaylists, custom: customPlaylist };
  const currentPreset = allPresets[selectedPreset];

  const handleCreatePlaylist = async () => {
    if (!auth.isAuthenticated) {
      alert('Please connect your Spotify account first');
      return;
    }

    if (!playlistName.trim()) {
      alert('Please enter a playlist name');
      return;
    }

    try {
      const tracks = selectedPreset === 'custom' 
        ? trackList.split('\n').filter(track => track.trim()) 
        : [];
      
      await playlistCreator.createPlaylist({
        name: playlistName,
        description: playlistDescription,
        preset: selectedPreset !== 'custom' ? currentPreset : null,
        customTracks: tracks
      });
    } catch (error) {
      console.error('Failed to create playlist:', error);
    }
  };

  // Update playlist name when preset changes
  React.useEffect(() => {
    if (selectedPreset !== 'custom' && currentPreset) {
      setPlaylistName(currentPreset.name);
      setPlaylistDescription(currentPreset.description);
    }
  }, [selectedPreset, currentPreset]);

  if (!auth.isAuthenticated) {
    return (
      <div className="create-playlist-page">
        <div className="page-header">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="back-button"
          >
            ← Back to Dashboard
          </Button>
          <h1>Create Playlist</h1>
        </div>
        
        <div className="auth-required">
          <h2>Authentication Required</h2>
          <p>Please connect your Spotify account to create playlists</p>
          <Button onClick={() => navigate('/')}>
            Go Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="create-playlist-page">
      <div className="page-header">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="back-button"
        >
          ← Back to Dashboard
        </Button>
        <h1>Create Playlist</h1>
        <p>Generate AI-powered playlists using presets or custom criteria</p>
      </div>

      <div className="playlist-content">
        {/* Preset Selection */}
        <section className="preset-section">
          <h2>Choose a Preset</h2>
          <div className="presets-grid">
            {Object.entries(allPresets).map(([key, preset]) => (
              <PresetCard
                key={key}
                preset={preset}
                isSelected={selectedPreset === key}
                onClick={() => setSelectedPreset(key)}
              />
            ))}
          </div>
        </section>

        {/* Custom Track Input */}
        {selectedPreset === 'custom' && (
          <section className="custom-section">
            <h2>Custom Track List</h2>
            <p>Enter track names, one per line:</p>
            <textarea
              value={trackList}
              onChange={(e) => setTrackList(e.target.value)}
              placeholder="Enter track names or artist - song combinations..."
              className="track-input"
              rows={10}
            />
          </section>
        )}

        {/* Playlist Configuration */}
        <section className="config-section">
          <h2>Playlist Details</h2>
          <div className="config-form">
            <Input
              label="Playlist Name"
              value={playlistName}
              onChange={setPlaylistName}
              placeholder="Enter playlist name..."
              required
            />
            
            <div className="input-group">
              <label htmlFor="description">Description (Optional)</label>
              <textarea
                id="description"
                value={playlistDescription}
                onChange={(e) => setPlaylistDescription(e.target.value)}
                placeholder="Describe your playlist..."
                className="description-input"
                rows={3}
              />
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <section className="actions-section">
          <div className="action-buttons">
            <Button
              onClick={handleCreatePlaylist}
              disabled={!playlistName.trim() || playlistCreator.isLoading}
              variant="primary"
              size="large"
            >
              {playlistCreator.isLoading ? 'Creating...' : 'Create Playlist'}
            </Button>
            
            {selectedPreset !== 'custom' && currentPreset && (
              <Button
                variant="secondary"
                onClick={() => {
                  // Preview functionality could go here
                  console.log('Preview preset:', currentPreset);
                }}
              >
                Preview Tracks
              </Button>
            )}
          </div>
        </section>

        {/* Status Messages */}
        {playlistCreator.status && (
          <StatusMessage
            type={playlistCreator.status.type}
            message={playlistCreator.status.message}
          />
        )}

        {/* Track Results */}
        {playlistCreator.results && (
          <TrackResults 
            tracks={playlistCreator.results.tracks}
            playlistUrl={playlistCreator.results.playlistUrl}
          />
        )}
      </div>
    </div>
  );
};

export default CreatePlaylistPage;
