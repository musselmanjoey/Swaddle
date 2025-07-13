import React, { useState } from 'react';
import { presetPlaylists, customPlaylist } from '../data/presets';
import { usePlaylistCreator } from '../hooks/useSpotify';
import Button from './Button';
import Input from './Input';
import StatusMessage from './StatusMessage';
import PresetCard from './PresetCard';
import TrackResults from './TrackResults';
import './PlaylistSection.css';

const PlaylistSection = ({ auth, selectedPreset, onPresetChange, className = '' }) => {
  const [playlistName, setPlaylistName] = useState('');
  const [playlistDescription, setPlaylistDescription] = useState('');
  const [trackList, setTrackList] = useState('');
  
  const playlistCreator = usePlaylistCreator();

  // Get all presets including custom
  const allPresets = { ...presetPlaylists, custom: customPlaylist };

  const handlePresetSelect = (presetKey) => {
    onPresetChange(presetKey);
    
    if (presetKey === 'custom') {
      setPlaylistName('');
      setPlaylistDescription('');
      setTrackList('');
    } else {
      const preset = presetPlaylists[presetKey];
      setPlaylistName(preset.name);
      setPlaylistDescription(preset.description);
      setTrackList(preset.tracks.join('\n'));
    }
  };

  const handleCreatePlaylist = async () => {
    if (!playlistName.trim() || !trackList.trim()) {
      return;
    }

    if (!auth.isAuthenticated) {
      return;
    }

    const tracks = trackList
      .split('\n')
      .map(track => track.trim())
      .filter(track => track.length > 0);

    await playlistCreator.createPlaylist(
      playlistName,
      playlistDescription,
      tracks
    );
  };

  // Initialize with haunted preset
  React.useEffect(() => {
    if (selectedPreset && selectedPreset !== 'custom') {
      const preset = presetPlaylists[selectedPreset];
      if (preset) {
        setPlaylistName(preset.name);
        setPlaylistDescription(preset.description);
        setTrackList(preset.tracks.join('\n'));
      }
    }
  }, [selectedPreset]);

  return (
    <section className={`playlist-section ${className}`}>
      <h2 className="playlist-title">🎵 Create Playlist</h2>
      
      {/* Preset Selection */}
      <div className="preset-grid">
        {Object.entries(allPresets).map(([key, preset]) => (
          <PresetCard
            key={key}
            preset={preset}
            isSelected={selectedPreset === key}
            onClick={() => handlePresetSelect(key)}
          />
        ))}
      </div>

      {/* Playlist Form */}
      <div className="playlist-form">
        <Input
          label="Playlist Name:"
          value={playlistName}
          onChange={setPlaylistName}
          placeholder="Enter playlist name"
          disabled={playlistCreator.loading}
        />
        
        <Input
          label="Description:"
          value={playlistDescription}
          onChange={setPlaylistDescription}
          placeholder="Enter playlist description"
          disabled={playlistCreator.loading}
        />
        
        <div className="input-group">
          <label className="input-label">
            Songs (one per line, format: "Song Title Artist"):
          </label>
          <textarea
            className="track-input"
            value={trackList}
            onChange={(e) => setTrackList(e.target.value)}
            placeholder="Enter songs here, one per line..."
            disabled={playlistCreator.loading}
          />
        </div>
        
        <Button
          onClick={handleCreatePlaylist}
          disabled={
            !auth.isAuthenticated || 
            !playlistName.trim() || 
            !trackList.trim() || 
            playlistCreator.loading
          }
          loading={playlistCreator.loading}
          className="create-button"
        >
          🎵 Create Playlist
        </Button>
      </div>

      {/* Status Messages */}
      {playlistCreator.error && (
        <StatusMessage type="error">
          {playlistCreator.error}
        </StatusMessage>
      )}

      {playlistCreator.lastResult && (
        <StatusMessage type="success">
          🎉 Success! Created "{playlistCreator.lastResult.playlist.name}" with{' '}
          {playlistCreator.lastResult.foundCount} of {playlistCreator.lastResult.totalCount} tracks.
          Check your Spotify app!
        </StatusMessage>
      )}

      {/* Track Results */}
      {playlistCreator.lastResult && (
        <TrackResults results={playlistCreator.lastResult.trackResults} />
      )}
    </section>
  );
};

export default PlaylistSection;