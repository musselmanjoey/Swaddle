// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

async function checkSmartSyncResults() {
  console.log('🎉 SMART SYNC VERIFICATION REPORT');
  console.log('==================================');

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'swaddle',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    // Overall sync status
    console.log('📊 OVERALL SYNC STATUS:');
    console.log('========================');
    
    const overallStats = await pool.query(`
      SELECT 
        COUNT(*) as total_tracks,
        COUNT(CASE WHEN audio_features_synced = true THEN 1 END) as with_audio_features,
        COUNT(CASE WHEN danceability IS NOT NULL THEN 1 END) as with_danceability,
        COUNT(CASE WHEN energy IS NOT NULL THEN 1 END) as with_energy,
        COUNT(CASE WHEN valence IS NOT NULL THEN 1 END) as with_valence,
        COUNT(CASE WHEN tempo IS NOT NULL THEN 1 END) as with_tempo,
        (SELECT COUNT(*) FROM genius_song_data) as with_genius_data
      FROM tracks
    `);
    
    const stats = overallStats.rows[0];
    const audioFeaturesPercent = Math.round((stats.with_audio_features / stats.total_tracks) * 100);
    const geniusPercent = Math.round((stats.with_genius_data / stats.total_tracks) * 100);
    
    console.log(`📈 Total Tracks: ${stats.total_tracks}`);
    console.log(`🎵 Audio Features Synced: ${stats.with_audio_features} (${audioFeaturesPercent}%)`);
    console.log(`🎭 Genius Data Records: ${stats.with_genius_data} (${geniusPercent}%)`);
    console.log(`🕺 With Danceability: ${stats.with_danceability}`);
    console.log(`⚡ With Energy: ${stats.with_energy}`);
    console.log(`😊 With Valence: ${stats.with_valence}`);
    console.log(`🥁 With Tempo: ${stats.with_tempo}`);

    // Check what's still missing
    console.log('\n❓ WHAT\'S STILL MISSING:');
    console.log('=========================');
    
    const missingStats = await pool.query(`
      SELECT 
        COUNT(CASE WHEN audio_features_synced = false THEN 1 END) as missing_audio_features,
        COUNT(CASE WHEN gsd.track_id IS NULL THEN 1 END) as missing_genius_data
      FROM tracks t
      LEFT JOIN genius_song_data gsd ON t.id = gsd.track_id
    `);
    
    const missing = missingStats.rows[0];
    console.log(`🎵 Missing Audio Features: ${missing.missing_audio_features}`);
    console.log(`🎭 Missing Genius Data: ${missing.missing_genius_data}`);

    // Sample of recently synced tracks
    console.log('\n✅ RECENTLY SYNCED SAMPLES:');
    console.log('============================');
    
    // Audio features samples
    console.log('\n🎵 Recent Audio Features (last 10 synced):');
    const recentAudio = await pool.query(`
      SELECT 
        t.name,
        a.name as artist_name,
        t.danceability,
        t.energy,
        t.valence,
        t.tempo,
        t.updated_at
      FROM tracks t
      JOIN artists a ON t.artist_id = a.id
      WHERE t.audio_features_synced = true
      ORDER BY t.updated_at DESC
      LIMIT 10
    `);
    
    recentAudio.rows.forEach((track, i) => {
      console.log(`   ${i + 1}. "${track.name}" by ${track.artist_name}`);
      console.log(`      Dance: ${track.danceability?.toFixed(3)}, Energy: ${track.energy?.toFixed(3)}, Valence: ${track.valence?.toFixed(3)}, Tempo: ${track.tempo?.toFixed(1)}`);
    });

    // Genius data samples
    console.log('\n🎭 Recent Genius Data (last 10 synced):');
    const recentGenius = await pool.query(`
      SELECT 
        t.name,
        a.name as artist_name,
        gsd.genius_id,
        gsd.pageviews,
        gsd.annotation_count,
        gsd.popularity_score,
        gsd.tags,
        gsd.last_updated
      FROM genius_song_data gsd
      JOIN tracks t ON gsd.track_id = t.id
      JOIN artists a ON t.artist_id = a.id
      ORDER BY gsd.last_updated DESC
      LIMIT 10
    `);
    
    recentGenius.rows.forEach((track, i) => {
      console.log(`   ${i + 1}. "${track.name}" by ${track.artist_name}`);
      console.log(`      Genius ID: ${track.genius_id}, Views: ${track.pageviews}, Score: ${track.popularity_score?.toFixed(1)}`);
      console.log(`      Tags: ${track.tags ? track.tags.join(', ') : 'None'}`);
    });

    // Recommendation readiness check
    console.log('\n🎯 RECOMMENDATION SYSTEM READINESS:');
    console.log('===================================');
    
    const readinessCheck = await pool.query(`
      SELECT 
        COUNT(*) as total_tracks,
        COUNT(CASE WHEN 
          audio_features_synced = true AND 
          danceability IS NOT NULL AND 
          energy IS NOT NULL AND 
          valence IS NOT NULL AND 
          tempo IS NOT NULL 
        THEN 1 END) as recommendation_ready
      FROM tracks
    `);
    
    const readiness = readinessCheck.rows[0];
    const readinessPercent = Math.round((readiness.recommendation_ready / readiness.total_tracks) * 100);
    
    console.log(`🎯 Recommendation Ready: ${readiness.recommendation_ready}/${readiness.total_tracks} (${readinessPercent}%)`);
    
    if (readinessPercent >= 10) {
      console.log('✅ RECOMMENDATION SYSTEM: READY FOR TESTING!');
      console.log('   You should now see match percentages instead of 0%');
    } else if (readinessPercent >= 1) {
      console.log('⚠️  RECOMMENDATION SYSTEM: PARTIALLY READY');
      console.log('   Some recommendations may work, but more data would be better');
    } else {
      console.log('❌ RECOMMENDATION SYSTEM: NOT READY YET');
      console.log('   Need more audio features for similarity matching');
    }

    // Sync quality check
    console.log('\n🏆 SYNC QUALITY ASSESSMENT:');
    console.log('============================');
    
    // Check for tracks with partial data
    const qualityCheck = await pool.query(`
      SELECT 
        COUNT(CASE WHEN audio_features_synced = true AND danceability IS NULL THEN 1 END) as incomplete_audio,
        COUNT(CASE WHEN audio_features_synced = false AND danceability IS NOT NULL THEN 1 END) as flag_mismatch,
        AVG(CASE WHEN danceability IS NOT NULL THEN danceability END) as avg_danceability,
        AVG(CASE WHEN energy IS NOT NULL THEN energy END) as avg_energy,
        AVG(CASE WHEN valence IS NOT NULL THEN valence END) as avg_valence,
        AVG(CASE WHEN tempo IS NOT NULL THEN tempo END) as avg_tempo
      FROM tracks
    `);
    
    const quality = qualityCheck.rows[0];
    
    console.log(`🔍 Data Quality Checks:`);
    console.log(`   Incomplete Audio Records: ${quality.incomplete_audio} (should be 0)`);
    console.log(`   Flag Mismatches: ${quality.flag_mismatch} (should be 0)`);
    console.log(`   Average Danceability: ${quality.avg_danceability?.toFixed(3)} (0-1 range)`);
    console.log(`   Average Energy: ${quality.avg_energy?.toFixed(3)} (0-1 range)`);
    console.log(`   Average Valence: ${quality.avg_valence?.toFixed(3)} (0-1 range)`);
    console.log(`   Average Tempo: ${quality.avg_tempo?.toFixed(1)} BPM`);

    // Success determination
    console.log('\n🎊 SMART SYNC SUCCESS EVALUATION:');
    console.log('==================================');
    
    const successCriteria = {
      audioFeaturesGood: audioFeaturesPercent >= 50,
      geniusDataGood: geniusPercent >= 25,
      recommendationReady: readinessPercent >= 10,
      qualityGood: quality.incomplete_audio === 0 && quality.flag_mismatch === 0,
      dataRealistic: quality.avg_danceability > 0 && quality.avg_energy > 0 && quality.avg_tempo > 50
    };
    
    const successCount = Object.values(successCriteria).filter(Boolean).length;
    const totalCriteria = Object.keys(successCriteria).length;
    
    console.log(`📊 Success Criteria Met: ${successCount}/${totalCriteria}`);
    console.log(`   ✅ Audio Features (≥50%): ${successCriteria.audioFeaturesGood ? '✅' : '❌'} (${audioFeaturesPercent}%)`);
    console.log(`   ✅ Genius Data (≥25%): ${successCriteria.geniusDataGood ? '✅' : '❌'} (${geniusPercent}%)`);
    console.log(`   ✅ Recommendation Ready (≥10%): ${successCriteria.recommendationReady ? '✅' : '❌'} (${readinessPercent}%)`);
    console.log(`   ✅ Data Quality: ${successCriteria.qualityGood ? '✅' : '❌'}`);
    console.log(`   ✅ Realistic Values: ${successCriteria.dataRealistic ? '✅' : '❌'}`);
    
    if (successCount >= 4) {
      console.log('\n🎉 SMART SYNC: SUCCESSFUL! 🎉');
      console.log('Your playlist enhancer should now work with real match percentages!');
    } else if (successCount >= 3) {
      console.log('\n⚠️  SMART SYNC: PARTIALLY SUCCESSFUL');
      console.log('Most features should work, but you may want to sync more data.');
    } else {
      console.log('\n❌ SMART SYNC: NEEDS MORE WORK');
      console.log('Consider running the sync again or checking for errors.');
    }

    // Next steps
    console.log('\n🚀 NEXT STEPS:');
    console.log('==============');
    
    if (readinessPercent >= 10) {
      console.log('1. 🎵 Test the Playlist Enhancer - match percentages should now work!');
      console.log('2. 🔍 Try both recommendation modes (liked songs vs all music)');
      console.log('3. 📊 Check if recommendations make sense based on audio features');
    }
    
    if (missing.missing_audio_features > 0) {
      console.log(`4. 🎯 Consider syncing remaining ${missing.missing_audio_features} audio features`);
    }
    
    if (missing.missing_genius_data > 0) {
      console.log(`5. 🎭 Consider syncing remaining ${missing.missing_genius_data} Genius records`);
    }
    
  } catch (error) {
    console.error('❌ Error checking Smart Sync results:', error);
  } finally {
    await pool.end();
    console.log('\n🔒 Database connection closed');
  }
}

checkSmartSyncResults().catch(console.error);
