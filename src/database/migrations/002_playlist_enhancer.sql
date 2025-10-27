-- Playlist Enhancer Database Migration
-- Migration: 002_playlist_enhancer.sql
-- Description: Add tables for enhanced playlist tracking, Genius data enrichment, and session management

-- Enhanced playlists tracking table
CREATE TABLE IF NOT EXISTS enhanced_playlists (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    spotify_playlist_id VARCHAR(50) NOT NULL,
    playlist_name VARCHAR(255) NOT NULL,
    enhancement_count INTEGER DEFAULT 1,
    last_enhanced_at TIMESTAMP DEFAULT NOW(),
    seed_tracks TEXT[], -- Array of track IDs used as seeds
    enhancement_sessions INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, spotify_playlist_id)
);

-- Genius song data table for enriched metadata
CREATE TABLE IF NOT EXISTS genius_song_data (
    id SERIAL PRIMARY KEY,
    track_id VARCHAR(50) REFERENCES tracks(id) ON DELETE CASCADE,
    genius_id INTEGER UNIQUE,
    genius_url TEXT,
    pageviews INTEGER DEFAULT 0,
    annotation_count INTEGER DEFAULT 0,
    chart_genre VARCHAR(50), -- pop, rock, country, etc.
    tags TEXT[], -- Array of Genius tags
    popularity_score FLOAT DEFAULT 0, -- Our calculated weighted score
    last_updated TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(track_id)
);

-- Enhancement session details for tracking user interactions
CREATE TABLE IF NOT EXISTS playlist_enhancement_sessions (
    id SERIAL PRIMARY KEY,
    enhanced_playlist_id INTEGER REFERENCES enhanced_playlists(id) ON DELETE CASCADE,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    session_type VARCHAR(20) NOT NULL, -- 'liked_songs' or 'all_music'
    seed_tracks TEXT[] NOT NULL,
    recommended_tracks TEXT[], -- Track IDs recommended
    added_tracks TEXT[], -- Track IDs actually added to playlist
    session_date TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_enhanced_playlists_user_id ON enhanced_playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_playlists_last_enhanced ON enhanced_playlists(last_enhanced_at DESC);
CREATE INDEX IF NOT EXISTS idx_genius_song_data_track_id ON genius_song_data(track_id);
CREATE INDEX IF NOT EXISTS idx_genius_song_data_popularity_score ON genius_song_data(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_genius_song_data_tags_gin ON genius_song_data USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_playlist_enhancement_sessions_playlist_id ON playlist_enhancement_sessions(enhanced_playlist_id);

-- Function to calculate Genius popularity score
CREATE OR REPLACE FUNCTION calculate_genius_popularity_score(
    p_pageviews INTEGER,
    p_annotation_count INTEGER,
    p_chart_bonus INTEGER DEFAULT 0
) RETURNS FLOAT AS $$
BEGIN
    RETURN (
        (p_pageviews * 0.4) +
        (p_annotation_count * 0.3) +
        (p_chart_bonus * 0.2) +
        (1.0 * 0.1) -- Base recency multiplier
    );
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate popularity scores
CREATE OR REPLACE FUNCTION update_genius_popularity_score()
RETURNS TRIGGER AS $$
BEGIN
    NEW.popularity_score := calculate_genius_popularity_score(
        NEW.pageviews,
        NEW.annotation_count,
        CASE WHEN NEW.chart_genre IS NOT NULL THEN 1000 ELSE 0 END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_genius_popularity_score
    BEFORE INSERT OR UPDATE ON genius_song_data
    FOR EACH ROW
    EXECUTE FUNCTION update_genius_popularity_score();

-- Enhanced view for recommendation engine
CREATE OR REPLACE VIEW track_recommendation_data AS
SELECT 
    t.id,
    t.name,
    t.artist_id,
    a.name as artist_name,
    al.name as album_name,
    t.danceability,
    t.energy,
    t.valence,
    t.acousticness,
    t.tempo,
    t.popularity as spotify_popularity,
    gsd.popularity_score as genius_popularity,
    gsd.tags as genius_tags,
    gsd.pageviews,
    gsd.annotation_count,
    COALESCE(gsd.popularity_score, 0) + (t.popularity * 0.1) as combined_popularity_score
FROM tracks t
JOIN artists a ON t.artist_id = a.id
LEFT JOIN albums al ON t.album_id = al.id
LEFT JOIN genius_song_data gsd ON t.id = gsd.track_id
WHERE t.audio_features_synced = true;

-- Function to get enhanced playlists for a user
CREATE OR REPLACE FUNCTION get_user_enhanced_playlists(p_user_id VARCHAR(50))
RETURNS TABLE (
    playlist_id VARCHAR(50),
    playlist_name VARCHAR(255),
    enhancement_count INTEGER,
    last_enhanced_at TIMESTAMP,
    total_sessions INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ep.spotify_playlist_id,
        ep.playlist_name,
        ep.enhancement_count,
        ep.last_enhanced_at,
        ep.enhancement_sessions
    FROM enhanced_playlists ep
    WHERE ep.user_id = p_user_id
    ORDER BY ep.last_enhanced_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to save enhancement session
CREATE OR REPLACE FUNCTION save_enhancement_session(
    p_user_id VARCHAR(50),
    p_spotify_playlist_id VARCHAR(50),
    p_playlist_name VARCHAR(255),
    p_session_type VARCHAR(20),
    p_seed_tracks TEXT[],
    p_recommended_tracks TEXT[],
    p_added_tracks TEXT[]
) RETURNS INTEGER AS $$
DECLARE
    v_enhanced_playlist_id INTEGER;
    v_session_id INTEGER;
BEGIN
    -- Insert or update enhanced_playlists
    INSERT INTO enhanced_playlists (
        user_id, 
        spotify_playlist_id, 
        playlist_name, 
        seed_tracks,
        enhancement_count,
        enhancement_sessions,
        last_enhanced_at
    ) VALUES (
        p_user_id,
        p_spotify_playlist_id,
        p_playlist_name,
        p_seed_tracks,
        1,
        1,
        NOW()
    )
    ON CONFLICT (user_id, spotify_playlist_id) 
    DO UPDATE SET
        playlist_name = EXCLUDED.playlist_name,
        seed_tracks = EXCLUDED.seed_tracks,
        enhancement_count = enhanced_playlists.enhancement_count + 1,
        enhancement_sessions = enhanced_playlists.enhancement_sessions + 1,
        last_enhanced_at = NOW(),
        updated_at = NOW()
    RETURNING id INTO v_enhanced_playlist_id;

    -- Insert session record
    INSERT INTO playlist_enhancement_sessions (
        enhanced_playlist_id,
        user_id,
        session_type,
        seed_tracks,
        recommended_tracks,
        added_tracks
    ) VALUES (
        v_enhanced_playlist_id,
        p_user_id,
        p_session_type,
        p_seed_tracks,
        p_recommended_tracks,
        p_added_tracks
    ) RETURNING id INTO v_session_id;

    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get recommendation data for tracks
CREATE OR REPLACE FUNCTION get_track_recommendation_data(p_track_ids TEXT[])
RETURNS TABLE (
    track_id VARCHAR(50),
    track_name VARCHAR(255),
    artist_name VARCHAR(255),
    album_name VARCHAR(255),
    danceability FLOAT,
    energy FLOAT,
    valence FLOAT,
    acousticness FLOAT,
    tempo FLOAT,
    spotify_popularity INTEGER,
    genius_popularity FLOAT,
    genius_tags TEXT[],
    combined_popularity_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        trd.id,
        trd.name,
        trd.artist_name,
        trd.album_name,
        trd.danceability,
        trd.energy,
        trd.valence,
        trd.acousticness,
        trd.tempo,
        trd.spotify_popularity,
        trd.genius_popularity,
        trd.genius_tags,
        trd.combined_popularity_score
    FROM track_recommendation_data trd
    WHERE trd.id = ANY(p_track_ids);
END;
$$ LANGUAGE plpgsql;