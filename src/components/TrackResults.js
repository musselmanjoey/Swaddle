import React from 'react';
import './TrackResults.css';

const TrackResults = ({ results }) => {
  if (!results || results.length === 0) {
    return null;
  }

  return (
    <div className="track-results">
      <h3 className="track-results-title">🎵 Track Search Results</h3>
      <div className="track-list">
        {results.map((result, index) => (
          <div key={index} className="track-item">
            <div className="track-info">
              <div className="track-name">
                {result.found ? result.name : result.query}
              </div>
              <div className="track-artist">
                {result.found ? result.artist : 'Not found'}
              </div>
            </div>
            <div className={`track-status ${result.found ? 'track-status--found' : 'track-status--not-found'}`}>
              {result.found ? '✅ Found' : '❌ Not Found'}
            </div>
          </div>
        ))}
      </div>
      
      <div className="track-summary">
        Found {results.filter(r => r.found).length} of {results.length} tracks
      </div>
    </div>
  );
};

export default TrackResults;