-- Swaddle Database Schema - Complete Music Intelligence System
-- This file contains all table definitions for the enhanced Swaddle app

-- Enable UUID extension for better ID generation (optional)
-- CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";

-- Users table (cache Spotify user data)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    display_name VARCHAR(255),
    email VARCHAR(255),
    country VARCHAR(10),
    followers_count INTEGER DEFAULT 0,
    total_liked_songs INTEGER DEFAULT 0,
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Artists table (with user preference tracking)
CREATE TABLE IF NOT EXISTS artists (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    genres TEXT[],
    popularity INTEGER DEFAULT 0,
    followers_count INTEGER DEFAULT 0,
    user_like_count INTEGER DEFAULT 0, -- How many liked songs from this artist
    external_urls JSONB,
    images JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Albums table
CREATE TABLE IF NOT EXISTS albums (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    artist_id VARCHAR(50) REFERENCES artists(id) ON DELETE CASCADE,
    release_date DATE,
    release_date_precision VARCHAR(10), -- year, month, day
    total_tracks INTEGER DEFAULT 0,
    album_type VARCHAR(20), -- album, single, compilation
    label VARCHAR(255),
    popularity INTEGER DEFAULT 0,
    external_urls JSONB,
    images JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tracks table (comprehensive audio features and metadata)
CREATE TABLE IF NOT EXISTS tracks (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    artist_id VARCHAR(50) REFERENCES artists(id) ON DELETE CASCADE,
    album_id VARCHAR(50) REFERENCES albums(id) ON DELETE SET NULL,
    track_number INTEGER,
    disc_number INTEGER DEFAULT 1,
    duration_ms INTEGER NOT NULL,
    explicit BOOLEAN DEFAULT FALSE,
    is_local BOOLEAN DEFAULT FALSE,
    popularity INTEGER DEFAULT 0,
    preview_url TEXT,
    external_urls JSONB,
    
    -- Spotify Audio Features
    danceability FLOAT CHECK (danceability >= 0 AND danceability <= 1),
    energy FLOAT CHECK (energy >= 0 AND energy <= 1),
    key INTEGER CHECK (key >= -1 AND key <= 11), -- -1 for no key detected
    loudness FLOAT,
    mode INTEGER CHECK (mode IN (0, 1)), -- 0 = minor, 1 = major
    speechiness FLOAT CHECK (speechiness >= 0 AND speechiness <= 1),
    acousticness FLOAT CHECK (acousticness >= 0 AND acousticness <= 1),
    instrumentalness FLOAT CHECK (instrumentalness >= 0 AND instrumentalness <= 1),
    liveness FLOAT CHECK (liveness >= 0 AND liveness <= 1),
    valence FLOAT CHECK (valence >= 0 AND valence <= 1),
    tempo FLOAT CHECK (tempo > 0),
    time_signature INTEGER CHECK (time_signature >= 3 AND time_signature <= 7),
    
    -- Lyrics and Analysis Data
    has_lyrics BOOLEAN DEFAULT FALSE,
    lyrics_themes TEXT[],
    sentiment_score FLOAT CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
    audio_features_synced BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User liked songs (with timestamp for trend analysis)
CREATE TABLE IF NOT EXISTS user_liked_songs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    track_id VARCHAR(50) REFERENCES tracks(id) ON DELETE CASCADE,
    liked_at TIMESTAMP NOT NULL,
    added_at TIMESTAMP DEFAULT NOW(), -- When we discovered this like
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, track_id)
);

-- Lyrics cache (from Genius API)
CREATE TABLE IF NOT EXISTS lyrics (
    track_id VARCHAR(50) PRIMARY KEY REFERENCES tracks(id) ON DELETE CASCADE,
    genius_id INTEGER UNIQUE,
    genius_url TEXT,
    lyrics_text TEXT,
    themes TEXT[],
    sentiment_score FLOAT CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
    language VARCHAR(10) DEFAULT 'en',
    word_count INTEGER,
    has_explicit_content BOOLEAN DEFAULT FALSE,
    fetched_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Playlist generation sessions (for learning user preferences)
CREATE TABLE IF NOT EXISTS curation_sessions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    session_name VARCHAR(255),
    seed_tracks TEXT[] NOT NULL, -- Array of track IDs used as starting point
    theme_keywords TEXT[],
    target_audio_features JSONB, -- Target ranges for danceability, energy, etc.
    generated_tracks TEXT[], -- Array of suggested track IDs in order
    accepted_tracks TEXT[], -- User-approved tracks
    rejected_tracks TEXT[], -- User-rejected tracks
    final_playlist_id VARCHAR(50), -- Spotify playlist ID if created
    status VARCHAR(20) DEFAULT 'active', -- active, completed, abandoned
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User taste profile (aggregated analytics)
CREATE TABLE IF NOT EXISTS user_taste_profiles (
    user_id VARCHAR(50) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    
    -- Top genres (weighted by listen frequency)
    top_genres JSONB, -- {\"indie rock\": 0.3, \"electronic\": 0.25, ...}
    
    -- Average audio features across liked songs
    avg_danceability FLOAT,
    avg_energy FLOAT,
    avg_valence FLOAT,
    avg_acousticness FLOAT,
    avg_tempo FLOAT,
    
    -- Listening patterns
    most_active_decades TEXT[], -- ['2010s', '2000s', ...]
    preferred_track_length_ms INTEGER, -- Average preferred duration
    explicit_content_ratio FLOAT, -- Percentage of explicit tracks liked
    
    -- Discovery preferences
    mainstream_vs_niche_score FLOAT, -- 0 = very niche, 1 = very mainstream
    familiar_vs_discovery_ratio FLOAT, -- Ratio of known vs new artists
    
    last_calculated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Track relationships (similar tracks for recommendations)
CREATE TABLE IF NOT EXISTS track_similarities (
    id SERIAL PRIMARY KEY,
    track_id_1 VARCHAR(50) REFERENCES tracks(id) ON DELETE CASCADE,
    track_id_2 VARCHAR(50) REFERENCES tracks(id) ON DELETE CASCADE,
    similarity_score FLOAT CHECK (similarity_score >= 0 AND similarity_score <= 1),
    similarity_type VARCHAR(20), -- audio_features, lyrics, artist, genre
    calculated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(track_id_1, track_id_2, similarity_type)
);

-- Sync status tracking
CREATE TABLE IF NOT EXISTS sync_status (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL, -- liked_songs, audio_features, lyrics
    last_sync_at TIMESTAMP,
    total_items INTEGER DEFAULT 0,
    synced_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending', -- pending, running, completed, failed
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, sync_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_liked_songs_user_id ON user_liked_songs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_liked_songs_track_id ON user_liked_songs(track_id);
CREATE INDEX IF NOT EXISTS idx_user_liked_songs_liked_at ON user_liked_songs(liked_at);
CREATE INDEX IF NOT EXISTS idx_tracks_artist_id ON tracks(artist_id);
CREATE INDEX IF NOT EXISTS idx_tracks_album_id ON tracks(album_id);
CREATE INDEX IF NOT EXISTS idx_tracks_popularity ON tracks(popularity);
CREATE INDEX IF NOT EXISTS idx_tracks_audio_features ON tracks(danceability, energy, valence, tempo);
CREATE INDEX IF NOT EXISTS idx_artists_user_like_count ON artists(user_like_count DESC);
CREATE INDEX IF NOT EXISTS idx_albums_artist_id ON albums(artist_id);
CREATE INDEX IF NOT EXISTS idx_curation_sessions_user_id ON curation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_curation_sessions_status ON curation_sessions(status);
CREATE INDEX IF NOT EXISTS idx_track_similarities_track_id_1 ON track_similarities(track_id_1);
CREATE INDEX IF NOT EXISTS idx_track_similarities_similarity_score ON track_similarities(similarity_score DESC);
CREATE INDEX IF NOT EXISTS idx_sync_status_user_type ON sync_status(user_id, sync_type);

-- Create GIN indexes for array and JSONB columns
CREATE INDEX IF NOT EXISTS idx_artists_genres_gin ON artists USING GIN(genres);
CREATE INDEX IF NOT EXISTS idx_tracks_themes_gin ON tracks USING GIN(lyrics_themes);
CREATE INDEX IF NOT EXISTS idx_user_taste_profiles_genres_gin ON user_taste_profiles USING GIN(top_genres);

-- Views for common queries
CREATE OR REPLACE VIEW user_top_artists AS
SELECT 
    uls.user_id,
    a.id as artist_id,
    a.name as artist_name,
    COUNT(*) as liked_count,
    AVG(t.popularity) as avg_popularity,
    ARRAY_AGG(t.id ORDER BY uls.liked_at DESC) as recent_tracks
FROM user_liked_songs uls
JOIN tracks t ON uls.track_id = t.id
JOIN artists a ON t.artist_id = a.id
GROUP BY uls.user_id, a.id, a.name
ORDER BY uls.user_id, liked_count DESC;

CREATE OR REPLACE VIEW user_audio_profile AS
SELECT 
    uls.user_id,
    COUNT(*) as total_liked_songs,
    AVG(t.danceability) as avg_danceability,
    AVG(t.energy) as avg_energy,
    AVG(t.valence) as avg_valence,
    AVG(t.acousticness) as avg_acousticness,
    AVG(t.tempo) as avg_tempo,
    AVG(t.popularity) as avg_popularity,
    AVG(t.duration_ms) as avg_duration_ms
FROM user_liked_songs uls
JOIN tracks t ON uls.track_id = t.id
WHERE t.audio_features_synced = true
GROUP BY uls.user_id;

-- Function to update artist like counts
CREATE OR REPLACE FUNCTION update_artist_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE artists 
        SET user_like_count = user_like_count + 1,
            updated_at = NOW()
        WHERE id = (SELECT artist_id FROM tracks WHERE id = NEW.track_id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE artists 
        SET user_like_count = GREATEST(user_like_count - 1, 0),
            updated_at = NOW()
        WHERE id = (SELECT artist_id FROM tracks WHERE id = OLD.track_id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update artist like counts
DROP TRIGGER IF EXISTS trigger_update_artist_like_count ON user_liked_songs;
CREATE TRIGGER trigger_update_artist_like_count
    AFTER INSERT OR DELETE ON user_liked_songs
    FOR EACH ROW
    EXECUTE FUNCTION update_artist_like_count();

-- Function to update user total liked songs count
CREATE OR REPLACE FUNCTION update_user_liked_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE users 
        SET total_liked_songs = total_liked_songs + 1,
            updated_at = NOW()
        WHERE id = NEW.user_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE users 
        SET total_liked_songs = GREATEST(total_liked_songs - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.user_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update user liked songs count
DROP TRIGGER IF EXISTS trigger_update_user_liked_count ON user_liked_songs;
CREATE TRIGGER trigger_update_user_liked_count
    AFTER INSERT OR DELETE ON user_liked_songs
    FOR EACH ROW
    EXECUTE FUNCTION update_user_liked_count();

-- Initial data: Create a test user for development
-- INSERT INTO users (id, display_name, email, country) 
-- VALUES ('test_user', 'Test User', 'test@example.com', 'US')
-- ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE users IS 'Spotify user accounts and basic profile information';
COMMENT ON TABLE artists IS 'Artist information with user preference tracking';
COMMENT ON TABLE albums IS 'Album metadata and relationships';
COMMENT ON TABLE tracks IS 'Track metadata including Spotify audio features';
COMMENT ON TABLE user_liked_songs IS 'User liked songs with timestamps for trend analysis';
COMMENT ON TABLE lyrics IS 'Cached lyrics from Genius API with analysis';
COMMENT ON TABLE curation_sessions IS 'Theme-based playlist generation sessions';
COMMENT ON TABLE user_taste_profiles IS 'Aggregated user music taste analytics';
COMMENT ON TABLE track_similarities IS 'Calculated similarity scores between tracks';
COMMENT ON TABLE sync_status IS 'Status tracking for background sync operations';
