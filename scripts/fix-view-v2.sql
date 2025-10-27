-- Updated view to include tracks without audio features synced
-- This will allow recommendations to work even without full audio feature data

DROP VIEW IF EXISTS track_recommendation_data;

CREATE OR REPLACE VIEW track_recommendation_data AS
SELECT 
    t.id as track_id,
    t.name as track_name,
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
-- Removed the WHERE clause to include all tracks, not just those with audio features synced
ORDER BY t.popularity DESC;