// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

async function checkDebugResults() {
  console.log('🔍 CHECKING DEBUG SYNC RESULTS');
  console.log('===============================');

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'swaddle',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    // Check the specific tracks that were processed
    const debugTrackIds = [
      "4zF4lgNU7h9fV9bTwrnYGY",
      "0q21FNwES2bbtcduB6kjEU", 
      "1wk75kMSczrkJwQWgBC3te",
      "2zzKV4f4a4kfBBeo5EsG98",
      "2BVrXiverPgKKSG7P1qm60"
    ];

    // Check Genius debug tracks
    const geniusDebugTrackIds = [
      "3WQMrWcMztN1OJAnxzITjr", // Black Holes
      "3zz7A3ly5GHKoJaRrZQaYG", // A&W Orange and Brown
      "53ZtLF68ztNqe2bPCv7sQu", // Little Henrietta
      "2Oncrlkf7SZZJcxiaEIdGm", // Crabapples in the Century's Storm
      "1WfaepSEaRFtnsCT5wNRq2"  // I Do My Father's Drugs
    ];

    console.log('📊 Checking first 5 debug tracks for audio features:');
    
    for (const trackId of debugTrackIds) {
      const result = await pool.query(`
        SELECT 
          t.id,
          t.name,
          a.name as artist_name,
          t.audio_features_synced,
          t.danceability,
          t.energy,
          t.valence,
          t.tempo
        FROM tracks t
        JOIN artists a ON t.artist_id = a.id
        WHERE t.id = $1
      `, [trackId]);
      
      if (result.rows.length > 0) {
        const track = result.rows[0];
        console.log(`\n🎵 "${track.name}" by ${track.artist_name}`);
        console.log(`   Audio Features Synced: ${track.audio_features_synced ? '✅' : '❌'}`);
        if (track.audio_features_synced) {
          console.log(`   Danceability: ${track.danceability}`);
          console.log(`   Energy: ${track.energy}`);
          console.log(`   Valence: ${track.valence}`);
          console.log(`   Tempo: ${track.tempo}`);
        }
      } else {
        console.log(`❌ Track ${trackId} not found in database`);
      }
    }

    console.log('\n🎭 Checking first 5 Genius debug tracks:');
    
    for (const trackId of geniusDebugTrackIds) {
      const result = await pool.query(`
        SELECT 
          t.id,
          t.name,
          a.name as artist_name,
          gsd.genius_id,
          gsd.pageviews,
          gsd.annotation_count,
          gsd.popularity_score,
          gsd.tags
        FROM tracks t
        JOIN artists a ON t.artist_id = a.id
        LEFT JOIN genius_song_data gsd ON t.id = gsd.track_id
        WHERE t.id = $1
      `, [trackId]);
      
      if (result.rows.length > 0) {
        const track = result.rows[0];
        console.log(`\n🎭 "${track.name}" by ${track.artist_name}`);
        if (track.genius_id) {
          console.log(`   Genius ID: ${track.genius_id}`);
          console.log(`   Pageviews: ${track.pageviews}`);
          console.log(`   Annotations: ${track.annotation_count}`);
          console.log(`   Popularity Score: ${track.popularity_score}`);
          console.log(`   Tags: ${track.tags ? track.tags.join(', ') : 'None'}`);
        } else {
          console.log(`   ❌ No Genius data found`);
        }
      } else {
        console.log(`❌ Track ${trackId} not found in database`);
      }
    }

    // Check overall sync status
    console.log('\n📊 OVERALL SYNC STATUS:');
    const syncStatus = await pool.query(`
      SELECT 
        COUNT(*) as total_tracks,
        COUNT(CASE WHEN audio_features_synced = true THEN 1 END) as with_audio_features,
        COUNT(CASE WHEN danceability IS NOT NULL THEN 1 END) as with_danceability,
        COUNT(CASE WHEN energy IS NOT NULL THEN 1 END) as with_energy,
        (SELECT COUNT(*) FROM genius_song_data) as with_genius_data
      FROM tracks
    `);
    
    const stats = syncStatus.rows[0];
    console.log(`Total Tracks: ${stats.total_tracks}`);
    console.log(`Audio Features Synced: ${stats.with_audio_features} (${Math.round(stats.with_audio_features/stats.total_tracks*100)}%)`);
    console.log(`With Danceability: ${stats.with_danceability}`);
    console.log(`With Energy: ${stats.with_energy}`);
    console.log(`With Genius Data: ${stats.with_genius_data} (${Math.round(stats.with_genius_data/stats.total_tracks*100)}%)`);

    // Check if the sync analysis would see these changes
    console.log('\n🔍 SYNC ANALYSIS CHECK:');
    const analysisResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN audio_features_synced = false THEN 1 END) as missing_audio_features,
        COUNT(CASE WHEN gsd.track_id IS NULL THEN 1 END) as missing_genius_data
      FROM tracks t
      LEFT JOIN genius_song_data gsd ON t.id = gsd.track_id
    `);
    
    const analysis = analysisResult.rows[0];
    console.log(`Missing Audio Features: ${analysis.missing_audio_features}`);
    console.log(`Missing Genius Data: ${analysis.missing_genius_data}`);

  } catch (error) {
    console.error('❌ Error checking debug results:', error);
  } finally {
    await pool.end();
  }
}

checkDebugResults().catch(console.error);
