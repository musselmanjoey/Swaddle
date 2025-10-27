import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import AuthSection from './components/AuthSection';
import Dashboard from './components/Dashboard';
import CreatePlaylistPage from './components/CreatePlaylistPage';
import SyncLikedSongsPage from './components/SyncLikedSongsPage';

import PlaylistSelectionPage from './components/PlaylistEnhancer/PlaylistSelectionPage';
import EnhancerPage from './components/PlaylistEnhancer/EnhancerPage';
import { useSpotifyAuth } from './hooks/useSpotify';
import './App.css';

function App() {
  const auth = useSpotifyAuth();

  return (
    <Router>
      <div className="app">
        <div className="container">
          <Header />
          
          <AuthSection 
            auth={auth}
            className="fade-in"
          />
          
          <main className="main-content">
            <Routes>
              <Route 
                path="/" 
                element={<Dashboard auth={auth} />} 
              />
              <Route 
                path="/create-playlist" 
                element={<CreatePlaylistPage auth={auth} />} 
              />
              <Route 
                path="/sync-liked" 
                element={<SyncLikedSongsPage auth={auth} />} 
              />

              <Route 
                path="/playlist-enhancer" 
                element={<PlaylistSelectionPage auth={auth} />} 
              />
              <Route 
                path="/playlist-enhancer/:playlistId" 
                element={<EnhancerPage auth={auth} />} 
              />

            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
