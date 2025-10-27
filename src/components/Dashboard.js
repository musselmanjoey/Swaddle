import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from './Button';
import './Dashboard.css';

const Dashboard = ({ auth }) => {
  const navigate = useNavigate();

  const dashboardCards = [
    {
      id: 'create-playlist',
      title: 'Create Playlist',
      description: 'Generate AI-powered playlists using presets or custom criteria',
      icon: '🎵',
      path: '/create-playlist',
      color: 'primary'
    },
    {
      id: 'sync-liked',
      title: 'Sync Liked Songs',
      description: 'Analyze and sync your Spotify liked songs with enhanced metadata',
      icon: '❤️',
      path: '/sync-liked',
      color: 'secondary'
    },

    {
      id: 'playlist-enhancer',
      title: 'Playlist Enhancer',
      description: 'Advanced playlist enhancement with Genius and Spotify integration',
      icon: '🚀',
      path: '/playlist-enhancer',
      color: 'primary'
    },

  ];

  const handleCardClick = (card) => {
    if (card.disabled) return;
    navigate(card.path);
  };

  if (!auth.isAuthenticated) {
    return (
      <div className="dashboard">
        <div className="dashboard-welcome">
          <h1>Welcome to Swaddle</h1>
          <p>Your intelligent Spotify playlist companion</p>
          <div className="auth-prompt">
            <p>Connect your Spotify account to get started</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome back, {auth.user?.display_name || 'Music Lover'}!</h1>
        <p>What would you like to do today?</p>
      </div>

      <div className="dashboard-grid">
        {dashboardCards.map((card) => (
          <div
            key={card.id}
            className={`dashboard-card ${card.color} ${card.disabled ? 'disabled' : ''}`}
            onClick={() => handleCardClick(card)}
          >
            <div className="card-icon">{card.icon}</div>
            <div className="card-content">
              <h3>{card.title}</h3>
              <p>{card.description}</p>
              {card.disabled && <span className="coming-soon">Coming Soon</span>}
            </div>
            <div className="card-arrow">→</div>
          </div>
        ))}
      </div>

      <div className="dashboard-footer">
        <div className="quick-stats">
          <div className="stat">
            <span className="stat-label">Connected Account</span>
            <span className="stat-value">{auth.user?.display_name}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Premium Status</span>
            <span className="stat-value">{auth.user?.product === 'premium' ? 'Premium' : 'Free'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
