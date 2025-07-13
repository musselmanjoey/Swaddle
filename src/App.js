import React, { useState } from 'react';
import Header from './components/Header';
import AuthSection from './components/AuthSection';
import PlaylistSection from './components/PlaylistSection';
import { useSpotifyAuth } from './hooks/useSpotify';
import './App.css';

function App() {
  const [selectedPreset, setSelectedPreset] = useState('haunted');
  const auth = useSpotifyAuth();

  return (
    <div className="app">
      <div className="container">
        <Header />
        
        <AuthSection 
          auth={auth}
          className="fade-in"
        />
        
        <PlaylistSection
          auth={auth}
          selectedPreset={selectedPreset}
          onPresetChange={setSelectedPreset}
          className="fade-in"
        />
      </div>
    </div>
  );
}

export default App;
