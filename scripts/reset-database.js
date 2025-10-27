// Database Reset Script for Swaddle
// This script clears all data while preserving table structure
// Run this when you want to start fresh with clean data

const { Pool } = require('pg');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

class DatabaseResetService {
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

  async connect() {
    try {
      const client = await this.pool.connect();
      console.log('✅ Connected to PostgreSQL database');
      client.release();
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to database:', error.message);
      console.error('💡 Make sure your .env.local file has the correct database credentials');
      return false;
    }
  }

  async clearAllData() {
    console.log('\n🧹 STARTING DATABASE RESET...\n');
    
    try {
      // Get initial counts
      const initialCounts = await this.getTableCounts();
      console.log('📊 CURRENT DATA COUNTS:');
      this.displayCounts(initialCounts);

      console.log('\n⚠️  WARNING: This will delete ALL data from the following tables:');
      console.log('   - playlist_enhancement_sessions');
      console.log('   - enhanced_playlists');
      console.log('   - genius_song_data');
      console.log('   - lyrics');
      console.log('   - user_liked_songs');
      console.log('   - tracks');
      console.log('   - albums');
      console.log('   - artists');
      console.log('   - users');
      console.log('   - curation_sessions');
      console.log('   - user_taste_profiles');
      console.log('   - track_similarities');
      console.log('   - sync_status');

      // In a real scenario, you might want to add a confirmation prompt
      // For script usage, we'll proceed directly

      console.log('\n🗑️  CLEARING DATA (preserving table structure)...\n');

      // Clear tables in correct order (respecting foreign key constraints)
      const clearOrder = [
        'playlist_enhancement_sessions',
        'enhanced_playlists', 
        'genius_song_data',
        'lyrics',
        'user_liked_songs',
        'track_similarities',
        'curation_sessions',
        'user_taste_profiles',
        'sync_status',
        'tracks',
        'albums', 
        'artists',
        'users'
      ];

      let totalCleared = 0;

      for (const tableName of clearOrder) {
        try {
          const result = await this.pool.query(`DELETE FROM ${tableName}`);
          const rowCount = result.rowCount || 0;
          totalCleared += rowCount;
          
          if (rowCount > 0) {
            console.log(`✅ Cleared ${rowCount} rows from ${tableName}`);
          } else {
            console.log(`📭 ${tableName} was already empty`);
          }
        } catch (error) {
          if (error.message.includes('does not exist')) {
            console.log(`⚠️  Table ${tableName} does not exist (skipping)`);
          } else {
            console.error(`❌ Error clearing ${tableName}:`, error.message);
          }
        }
      }

      // Reset any sequences (for SERIAL columns)
      console.log('\n🔄 RESETTING SEQUENCES...');
      
      const sequenceResets = [
        'ALTER SEQUENCE IF EXISTS enhanced_playlists_id_seq RESTART WITH 1',
        'ALTER SEQUENCE IF EXISTS genius_song_data_id_seq RESTART WITH 1', 
        'ALTER SEQUENCE IF EXISTS playlist_enhancement_sessions_id_seq RESTART WITH 1',
        'ALTER SEQUENCE IF EXISTS curation_sessions_id_seq RESTART WITH 1',
        'ALTER SEQUENCE IF EXISTS track_similarities_id_seq RESTART WITH 1',
        'ALTER SEQUENCE IF EXISTS sync_status_id_seq RESTART WITH 1'
      ];

      for (const resetQuery of sequenceResets) {
        try {
          await this.pool.query(resetQuery);
          console.log(`✅ Reset sequence: ${resetQuery.split(' ')[4]}`);
        } catch (error) {
          // Silently ignore if sequence doesn't exist
          if (!error.message.includes('does not exist')) {
            console.warn(`⚠️  Sequence reset warning:`, error.message);
          }
        }
      }

      // Verify all tables are empty
      console.log('\n🔍 VERIFYING RESET...');
      const finalCounts = await this.getTableCounts();
      console.log('\n📊 FINAL DATA COUNTS:');
      this.displayCounts(finalCounts);

      const totalRemaining = Object.values(finalCounts).reduce((sum, count) => sum + count, 0);

      if (totalRemaining === 0) {
        console.log('\n🎉 DATABASE RESET COMPLETE!');
        console.log(`   Cleared ${totalCleared} total rows`);
        console.log('   All tables are now empty');
        console.log('   Table structure preserved');
        console.log('\n✨ Your database is ready for fresh data!');
      } else {
        console.log('\n⚠️  Reset completed with some data remaining:');
        console.log(`   ${totalRemaining} rows still present`);
        console.log('   This might be expected for system tables');
      }

    } catch (error) {
      console.error('\n❌ RESET FAILED:', error.message);
      throw error;
    }
  }

  async getTableCounts() {
    const tables = [
      'users', 'artists', 'albums', 'tracks', 'user_liked_songs',
      'lyrics', 'enhanced_playlists', 'genius_song_data', 
      'playlist_enhancement_sessions', 'curation_sessions',
      'user_taste_profiles', 'track_similarities', 'sync_status'
    ];

    const counts = {};

    for (const table of tables) {
      try {
        const result = await this.pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        counts[table] = parseInt(result.rows[0].count);
      } catch (error) {
        if (error.message.includes('does not exist')) {
          counts[table] = 0; // Table doesn't exist
        } else {
          console.warn(`⚠️  Could not count ${table}:`, error.message);
          counts[table] = '?';
        }
      }
    }

    return counts;
  }

  displayCounts(counts) {
    const maxTableNameLength = Math.max(...Object.keys(counts).map(name => name.length));
    
    for (const [table, count] of Object.entries(counts)) {
      const paddedName = table.padEnd(maxTableNameLength);
      if (count === 0) {
        console.log(`   ${paddedName}: ${count} (empty)`);
      } else if (count === '?') {
        console.log(`   ${paddedName}: ? (error)`);
      } else {
        console.log(`   ${paddedName}: ${count}`);
      }
    }
  }

  async testConnection() {
    console.log('🔍 TESTING DATABASE CONNECTION...\n');
    
    try {
      const result = await this.pool.query('SELECT NOW() as current_time, version() as postgres_version');
      const { current_time, postgres_version } = result.rows[0];
      
      console.log('✅ Database connection successful!');
      console.log(`   Current time: ${current_time}`);
      console.log(`   PostgreSQL: ${postgres_version.split(' ')[0]} ${postgres_version.split(' ')[1]}`);
      console.log(`   Database: ${process.env.DB_NAME || 'swaddle'}`);
      console.log(`   Host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}`);
      return true;
      
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Check your .env.local file has correct database credentials');
      console.error('   2. Ensure PostgreSQL is running');
      console.error('   3. Verify the database exists');
      console.error('   4. Check network connectivity');
      return false;
    }
  }

  async close() {
    await this.pool.end();
    console.log('\n🔒 Database connection closed');
  }
}

// Main execution function
async function main() {
  const resetService = new DatabaseResetService();
  
  try {
    // Test connection first
    const connected = await resetService.testConnection();
    if (!connected) {
      process.exit(1);
    }

    // Perform the reset
    await resetService.clearAllData();
    
  } catch (error) {
    console.error('\n💥 SCRIPT FAILED:', error.message);
    process.exit(1);
  } finally {
    await resetService.close();
  }
}

// Run if called directly
if (require.main === module) {
  console.log('🎵 SWADDLE DATABASE RESET SCRIPT');
  console.log('================================');
  main().catch(console.error);
}

module.exports = DatabaseResetService;
