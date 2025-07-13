import React from 'react';
import './PresetCard.css';

const PresetCard = ({ preset, isSelected, onClick }) => {
  const cardClass = `preset-card ${isSelected ? 'preset-card--selected' : ''}`;
  
  return (
    <div className={cardClass} onClick={onClick}>
      <div className="preset-emoji">{preset.emoji}</div>
      <h3 className="preset-name">{preset.name}</h3>
      <p className="preset-description">{preset.description}</p>
      <div className="preset-track-count">
        {preset.tracks ? preset.tracks.length : 'Your choice'} tracks
      </div>
    </div>
  );
};

export default PresetCard;