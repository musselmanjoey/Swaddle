// Database Sync Diagnostic Script for Swaddle
// This script checks if your sync worked correctly and identifies any issues

const { Pool } = require('pg');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

class SyncDiagnosticService {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'swaddle',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async runComprehensiveDiagnostic() {
    console.log('\n🔍 SWADDLE DATABASE SYNC DIAGNOSTIC');
    console.log('=====================================');
    console.log(`📅 Run Time: ${new Date().toISOString()}`);
    console.log(`🗄️ Database: ${process.env.DB_NAME || 'swaddle'}`);
    console.log(`🏠 Host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}\n`);

    try {
      // Test connection first
      await this.testConnection();
      
      // Run all diagnostic checks
      await this.checkTableCounts();
      await this.checkUsers();
      await this.checkAudioFeatures();
      await this.checkGeniusData();
      await this.checkDataIntegrity();
      await this.checkSampleData();
      await this.checkRecommendationReadiness();
      
      console.log('\n✅ DIAGNOSTIC COMPLETE!');
      console.log('========================');

    } catch (error) {
      console.error('\n❌ DIAGNOSTIC FAILED:', error.message);
      throw error;
    }
  }

  async testConnection() {
    console.log('🔌 CONNECTION TEST');
    console.log('------------------');
    
    try {
      const result = await this.pool.query('SELECT NOW() as current_time, version() as postgres_version');
      const { current_time, postgres_version } = result.rows[0];
      
      console.log('✅ Database connection: SUCCESSFUL');
      console.log(`   Time: ${current_time}`);
      console.log(`   PostgreSQL: ${postgres_version.split(' ')[1]}`);
      
    } catch (error) {
      console.error('❌ Database connection: FAILED');
      console.error(`   Error: ${error.message}`);
      throw error;
    }
  }

  async checkTableCounts() {
    console.log('\n📊 TABLE COUNTS');
    console.log('---------------');
    
    const tables = [
      'users', 'artists', 'albums', 'tracks', 'user_liked_songs',
      'lyrics', 'enhanced_playlists', 'genius_song_data', 
      'playlist_enhancement_sessions'
    ];

    const counts = {};
    for (const table of tables) {
      try {
        const result = await this.pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        counts[table] = parseInt(result.rows[0].count);
      } catch (error) {
        counts[table] = `ERROR: ${error.message}`;
      }
    }

    // Display results
    const maxTableNameLength = Math.max(...Object.keys(counts).map(name => name.length));
    for (const [table, count] of Object.entries(counts)) {
      const paddedName = table.padEnd(maxTableNameLength);
      const status = typeof count === 'number' ? (count > 0 ? '✅' : '⚠️ ') : '❌';
      console.log(`${status} ${paddedName}: ${count}`);
    }

    return counts;
  }

  async checkUsers() {
    console.log('\n👤 USER ANALYSIS');
    console.log('----------------');
    
    try {
      const users = await this.pool.query(`
        SELECT 
          u.id,
          u.display_name,
          u.total_liked_songs,
          COUNT(uls.track_id) as actual_liked_songs_count
        FROM users u
        LEFT JOIN user_liked_songs uls ON u.id = uls.user_id
        GROUP BY u.id, u.display_name, u.total_liked_songs
        ORDER BY actual_liked_songs_count DESC
      `);

      if (users.rows.length === 0) {
        console.log('⚠️  No users found in database');
        return;
      }

      console.log(`✅ Found ${users.rows.length} user(s):`);
      users.rows.forEach((user, index) => {
        console.log(`   ${index + 1}. User ID: ${user.id}`);
        console.log(`      Display Name: ${user.display_name || 'N/A'}`);
        console.log(`      Reported Liked Songs: ${user.total_liked_songs || 0}`);
        console.log(`      Actual Liked Songs: ${user.actual_liked_songs_count}`);
        
        if (user.total_liked_songs !== parseInt(user.actual_liked_songs_count)) {
          console.log('      ⚠️  Mismatch between reported and actual counts!');
        }
        console.log('');
      });

    } catch (error) {
      console.error('❌ User analysis failed:', error.message);
    }
  }

  async checkAudioFeatures() {
    console.log('\n🎵 AUDIO FEATURES ANALYSIS');
    console.log('-------------------------');
    
    try {
      const audioFeatureStats = await this.pool.query(`
        SELECT 
          COUNT(*) as total_tracks,
          COUNT(CASE WHEN audio_features_synced = true THEN 1 END) as synced_audio_features,
          COUNT(CASE WHEN danceability IS NOT NULL THEN 1 END) as has_danceability,
          COUNT(CASE WHEN energy IS NOT NULL THEN 1 END) as has_energy,
          COUNT(CASE WHEN valence IS NOT NULL THEN 1 END) as has_valence,
          COUNT(CASE WHEN tempo IS NOT NULL THEN 1 END) as has_tempo,
          COUNT(CASE WHEN acousticness IS NOT NULL THEN 1 END) as has_acousticness,
          AVG(danceability) as avg_danceability,
          AVG(energy) as avg_energy,
          AVG(valence) as avg_valence,
          AVG(tempo) as avg_tempo
        FROM tracks
      `);

      const stats = audioFeatureStats.rows[0];
      
      console.log(`📊 Total Tracks: ${stats.total_tracks}`);
      console.log(`🎯 Audio Features Synced: ${stats.synced_audio_features} (${((stats.synced_audio_features / stats.total_tracks) * 100).toFixed(1)}%)`);
      console.log(`🕺 Has Danceability: ${stats.has_danceability}`);
      console.log(`⚡ Has Energy: ${stats.has_energy}`);
      console.log(`😊 Has Valence: ${stats.has_valence}`);
      console.log(`🥁 Has Tempo: ${stats.has_tempo}`);
      console.log(`🎸 Has Acousticness: ${stats.has_acousticness}`);
      
      if (stats.avg_danceability) {
        console.log('\n📈 Average Audio Features:');
        console.log(`   Danceability: ${parseFloat(stats.avg_danceability).toFixed(3)}`);
        console.log(`   Energy: ${parseFloat(stats.avg_energy).toFixed(3)}`);
        console.log(`   Valence: ${parseFloat(stats.avg_valence).toFixed(3)}`);
        console.log(`   Tempo: ${parseFloat(stats.avg_tempo).toFixed(1)} BPM`);
      }

      // Check for missing audio features
      if (stats.synced_audio_features < stats.total_tracks) {
        console.log(`\n⚠️  ${stats.total_tracks - stats.synced_audio_features} tracks missing audio features`);
        console.log('   💡 Run Smart Sync to populate missing audio features');
      } else {
        console.log('\n✅ All tracks have audio features synced!');
      }

    } catch (error) {
      console.error('❌ Audio features analysis failed:', error.message);
    }
  }

  async checkGeniusData() {
    console.log('\n🎭 GENIUS DATA ANALYSIS');
    console.log('----------------------');
    
    try {
      const geniusStats = await this.pool.query(`
        SELECT 
          COUNT(*) as total_tracks,
          COUNT(l.track_id) as has_lyrics,
          COUNT(gsd.track_id) as has_genius_data,
          AVG(gsd.pageviews) as avg_pageviews,
          AVG(gsd.popularity_score) as avg_popularity_score
        FROM tracks t
        LEFT JOIN lyrics l ON t.id = l.track_id
        LEFT JOIN genius_song_data gsd ON t.id = gsd.track_id
      `);

      const stats = geniusStats.rows[0];
      
      console.log(`📊 Total Tracks: ${stats.total_tracks}`);
      console.log(`📝 Has Lyrics: ${stats.has_lyrics} (${((stats.has_lyrics / stats.total_tracks) * 100).toFixed(1)}%)`);
      console.log(`🎭 Has Genius Data: ${stats.has_genius_data} (${((stats.has_genius_data / stats.total_tracks) * 100).toFixed(1)}%)`);
      
      if (stats.avg_pageviews) {
        console.log(`👁️  Average Pageviews: ${parseFloat(stats.avg_pageviews).toFixed(0)}`);
        console.log(`⭐ Average Popularity Score: ${parseFloat(stats.avg_popularity_score).toFixed(2)}`);
      }

      if (stats.has_genius_data < stats.total_tracks) {
        console.log(`\n⚠️  ${stats.total_tracks - stats.has_genius_data} tracks missing Genius data`);
        console.log('   💡 Run Smart Sync to populate missing Genius data');
      } else {
        console.log('\n✅ All tracks have Genius data!');
      }

    } catch (error) {
      console.error('❌ Genius data analysis failed:', error.message);
    }
  }

  async checkDataIntegrity() {
    console.log('\n🔍 DATA INTEGRITY CHECKS');
    console.log('------------------------');
    
    try {
      // Check for orphaned records
      const orphanChecks = [
        {
          name: 'Tracks without Artists',
          query: 'SELECT COUNT(*) as count FROM tracks WHERE artist_id IS NULL'
        },
        {
          name: 'Albums without Artists', 
          query: 'SELECT COUNT(*) as count FROM albums WHERE artist_id IS NULL'
        },
        {
          name: 'User Liked Songs without Users',
          query: 'SELECT COUNT(*) as count FROM user_liked_songs uls LEFT JOIN users u ON uls.user_id = u.id WHERE u.id IS NULL'
        },
        {
          name: 'User Liked Songs without Tracks',
          query: 'SELECT COUNT(*) as count FROM user_liked_songs uls LEFT JOIN tracks t ON uls.track_id = t.id WHERE t.id IS NULL'
        }
      ];

      for (const check of orphanChecks) {
        const result = await this.pool.query(check.query);
        const count = parseInt(result.rows[0].count);
        const status = count === 0 ? '✅' : '⚠️ ';
        console.log(`${status} ${check.name}: ${count}`);
      }

    } catch (error) {
      console.error('❌ Data integrity check failed:', error.message);
    }
  }

  async checkSampleData() {
    console.log('\n🎵 SAMPLE DATA PREVIEW');
    console.log('---------------------');
    
    try {
      const sampleTracks = await this.pool.query(`
        SELECT 
          t.name as track_name,
          a.name as artist_name,
          t.danceability,
          t.energy,
          t.valence,
          t.tempo,
          t.audio_features_synced,
          CASE WHEN l.track_id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_lyrics,
          CASE WHEN gsd.track_id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_genius_data
        FROM tracks t
        JOIN artists a ON t.artist_id = a.id
        LEFT JOIN lyrics l ON t.id = l.track_id
        LEFT JOIN genius_song_data gsd ON t.id = gsd.track_id
        ORDER BY RANDOM()
        LIMIT 5
      `);

      if (sampleTracks.rows.length === 0) {
        console.log('⚠️  No tracks found for sample preview');
        return;
      }

      console.log('📋 Random Sample of 5 Tracks:');
      sampleTracks.rows.forEach((track, index) => {
        console.log(`\n   ${index + 1}. "${track.track_name}" by ${track.artist_name}`);
        console.log(`      Audio Features: ${track.audio_features_synced ? '✅' : '❌'}`);
        if (track.danceability !== null) {
          console.log(`      Danceability: ${parseFloat(track.danceability).toFixed(3)}, Energy: ${parseFloat(track.energy).toFixed(3)}`);
          console.log(`      Valence: ${parseFloat(track.valence).toFixed(3)}, Tempo: ${parseFloat(track.tempo).toFixed(1)} BPM`);
        }
        console.log(`      Lyrics: ${track.has_lyrics}, Genius Data: ${track.has_genius_data}`);
      });

    } catch (error) {
      console.error('❌ Sample data preview failed:', error.message);
    }
  }

  async checkRecommendationReadiness() {
    console.log('\n🎯 RECOMMENDATION SYSTEM READINESS');
    console.log('----------------------------------');
    
    try {
      const readinessCheck = await this.pool.query(`
        SELECT 
          COUNT(*) as total_tracks,
          COUNT(CASE WHEN danceability IS NOT NULL AND energy IS NOT NULL AND valence IS NOT NULL THEN 1 END) as recommendation_ready_tracks,
          COUNT(CASE WHEN audio_features_synced = true THEN 1 END) as audio_synced_tracks
        FROM tracks
      `);

      const stats = readinessCheck.rows[0];
      const readinessPercentage = (stats.recommendation_ready_tracks / stats.total_tracks) * 100;
      
      console.log(`📊 Total Tracks: ${stats.total_tracks}`);
      console.log(`🎯 Recommendation Ready: ${stats.recommendation_ready_tracks} (${readinessPercentage.toFixed(1)}%)`);
      console.log(`🎵 Audio Features Synced: ${stats.audio_synced_tracks}`);

      if (readinessPercentage >= 100) {
        console.log('\n✅ RECOMMENDATION SYSTEM: FULLY READY');
        console.log('   All tracks have the required audio features for similarity matching!');
      } else if (readinessPercentage >= 80) {
        console.log('\n🟡 RECOMMENDATION SYSTEM: MOSTLY READY');
        console.log(`   ${100 - readinessPercentage.toFixed(1)}% of tracks need audio features`);
      } else {
        console.log('\n🔴 RECOMMENDATION SYSTEM: NOT READY');
        console.log('   ⚠️  Most tracks are missing audio features required for recommendations');
        console.log('   💡 Run Smart Sync to populate audio features from Spotify');
      }

      // Check if any enhanced playlists exist
      const enhancedPlaylists = await this.pool.query('SELECT COUNT(*) as count FROM enhanced_playlists');
      const playlistCount = parseInt(enhancedPlaylists.rows[0].count);
      
      console.log(`\n🚀 Enhanced Playlists: ${playlistCount}`);
      if (playlistCount === 0) {
        console.log('   💡 Try the Playlist Enhancer feature to test recommendations!');
      }

    } catch (error) {
      console.error('❌ Recommendation readiness check failed:', error.message);
    }
  }

  async close() {
    await this.pool.end();
    console.log('\n🔒 Database connection closed');
  }
}

// Main execution
async function main() {
  const diagnostic = new SyncDiagnosticService();
  
  try {
    await diagnostic.runComprehensiveDiagnostic();
  } catch (error) {
    console.error('\n💥 DIAGNOSTIC SCRIPT FAILED:', error.message);
    process.exit(1);
  } finally {
    await diagnostic.close();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = SyncDiagnosticService;
