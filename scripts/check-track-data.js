// Check the current state of track data for recommendations
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

async function checkTrackData() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'swaddle',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || ''
  });

  try {
    console.log('🔍 [TRACK-CHECK] Analyzing current track data quality...');
    
    // Check total tracks
    const totalTracks = await pool.query('SELECT COUNT(*) as count FROM tracks');
    console.log(`📊 [TRACK-CHECK] Total tracks in database: ${totalTracks.rows[0].count}`);
    
    // Check audio features sync status
    const audioFeatures = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE audio_features_synced = true) as synced,
        COUNT(*) FILTER (WHERE danceability IS NOT NULL) as has_danceability,
        COUNT(*) FILTER (WHERE energy IS NOT NULL) as has_energy,
        COUNT(*) FILTER (WHERE tempo IS NOT NULL) as has_tempo
      FROM tracks
    `);
    
    const af = audioFeatures.rows[0];
    console.log(`🎵 [TRACK-CHECK] Audio Features Status:`);
    console.log(`   Total tracks: ${af.total}`);
    console.log(`   Synced flag: ${af.synced}/${af.total} (${Math.round(af.synced/af.total*100)}%)`);
    console.log(`   Has danceability: ${af.has_danceability}/${af.total} (${Math.round(af.has_danceability/af.total*100)}%)`);
    console.log(`   Has energy: ${af.has_energy}/${af.total} (${Math.round(af.has_energy/af.total*100)}%)`);
    console.log(`   Has tempo: ${af.has_tempo}/${af.total} (${Math.round(af.has_tempo/af.total*100)}%)`);
    
    // Check Genius data
    const geniusData = await pool.query('SELECT COUNT(*) as count FROM genius_song_data');
    console.log(`🎭 [TRACK-CHECK] Genius data records: ${geniusData.rows[0].count}`);
    
    // Check recommendation view data
    const recData = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE danceability IS NOT NULL) as has_audio_features,
        COUNT(*) FILTER (WHERE genius_popularity IS NOT NULL) as has_genius_data,
        AVG(spotify_popularity) as avg_spotify_popularity,
        AVG(combined_popularity_score) as avg_combined_score
      FROM track_recommendation_data
    `);
    
    const rd = recData.rows[0];
    console.log(`🚀 [TRACK-CHECK] Recommendation Data Quality:`);
    console.log(`   Available for recommendations: ${rd.total}`);
    console.log(`   With audio features: ${rd.has_audio_features}/${rd.total} (${Math.round(rd.has_audio_features/rd.total*100)}%)`);
    console.log(`   With Genius data: ${rd.has_genius_data}/${rd.total} (${Math.round(rd.has_genius_data/rd.total*100)}%)`);
    console.log(`   Avg Spotify popularity: ${Math.round(rd.avg_spotify_popularity || 0)}`);
    console.log(`   Avg combined score: ${(rd.avg_combined_score || 0).toFixed(2)}`);
    
    // Show sample tracks
    console.log(`\n📋 [TRACK-CHECK] Sample tracks for recommendations:`);
    const samples = await pool.query(`
      SELECT track_name, artist_name, spotify_popularity, danceability, energy, genius_popularity
      FROM track_recommendation_data 
      ORDER BY combined_popularity_score DESC 
      LIMIT 5
    `);
    
    samples.rows.forEach((track, i) => {
      console.log(`   ${i+1}. ${track.track_name} - ${track.artist_name}`);
      console.log(`      Popularity: ${track.spotify_popularity || 'N/A'} | Dance: ${track.danceability || 'N/A'} | Energy: ${track.energy || 'N/A'} | Genius: ${track.genius_popularity || 'N/A'}`);
    });
    
    // Recommendations
    console.log(`\n💡 [TRACK-CHECK] Recommendations:`);
    if (af.synced < af.total * 0.1) {
      console.log(`   🔄 SYNC LIKED SONGS - Only ${Math.round(af.synced/af.total*100)}% have audio features`);
    }
    if (geniusData.rows[0].count === 0) {
      console.log(`   🎭 ADD GENIUS DATA - No Genius enrichment data found`);
    }
    if (rd.total < 100) {
      console.log(`   📈 MORE DATA NEEDED - Only ${rd.total} tracks available for recommendations`);
    }
    
  } catch (error) {
    console.error('❌ [TRACK-CHECK] Error:', error.message);
  } finally {
    await pool.end();
    console.log('🔒 [TRACK-CHECK] Database connection closed');
  }
}

checkTrackData().catch(console.error);