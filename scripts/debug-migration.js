// Debug Migration Runner
// Simple version to test database connection and see what's happening

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

console.log('🔧 [DEBUG] Starting debug migration script...');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

console.log('📋 [DEBUG] Environment variables loaded:');
console.log(`   DB_HOST: ${process.env.DB_HOST}`);
console.log(`   DB_PORT: ${process.env.DB_PORT}`);
console.log(`   DB_NAME: ${process.env.DB_NAME}`);
console.log(`   DB_USER: ${process.env.DB_USER}`);
console.log(`   DB_PASSWORD: ${process.env.DB_PASSWORD ? '***hidden***' : 'NOT SET'}`);

async function debugMigration() {
  console.log('🔍 [DEBUG] Creating database connection...');
  
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'swaddle',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || ''
  });

  try {
    console.log('🔌 [DEBUG] Testing database connection...');
    
    // Test basic connection
    const testResult = await pool.query('SELECT NOW() as current_time');
    console.log('✅ [DEBUG] Database connection successful!');
    console.log(`   Current time: ${testResult.rows[0].current_time}`);
    
    // Check if migration file exists
    const migrationPath = path.join(__dirname, '../src/database/migrations/002_playlist_enhancer.sql');
    console.log(`📄 [DEBUG] Checking migration file: ${migrationPath}`);
    
    if (fs.existsSync(migrationPath)) {
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      console.log(`✅ [DEBUG] Migration file found (${migrationSQL.length} characters)`);
      console.log('📖 [DEBUG] First 200 characters:');
      console.log(migrationSQL.substring(0, 200) + '...');
      
      // Check if tables already exist
      console.log('🔍 [DEBUG] Checking existing tables...');
      const existingTables = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN ('enhanced_playlists', 'genius_song_data', 'playlist_enhancement_sessions')
        ORDER BY table_name
      `);
      
      console.log(`📊 [DEBUG] Found ${existingTables.rows.length} existing tables:`);
      existingTables.rows.forEach(row => {
        console.log(`   ✓ ${row.table_name}`);
      });
      
      if (existingTables.rows.length === 0) {
        console.log('🚀 [DEBUG] No existing tables found, running migration...');
        
        // Execute migration
        await pool.query(migrationSQL);
        console.log('✅ [DEBUG] Migration executed successfully!');
        
        // Verify again
        const newTables = await pool.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
            AND table_name IN ('enhanced_playlists', 'genius_song_data', 'playlist_enhancement_sessions')
          ORDER BY table_name
        `);
        
        console.log(`🎉 [DEBUG] Migration complete! Created ${newTables.rows.length} tables:`);
        newTables.rows.forEach(row => {
          console.log(`   ✓ ${row.table_name}`);
        });
        
      } else {
        console.log('ℹ️ [DEBUG] Tables already exist, skipping migration');
      }
      
    } else {
      console.error('❌ [DEBUG] Migration file not found!');
    }
    
  } catch (error) {
    console.error('❌ [DEBUG] Error occurred:');
    console.error(`   Message: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    console.error(`   Detail: ${error.detail || 'No additional details'}`);
    console.error('📝 [DEBUG] Full error:', error);
  } finally {
    await pool.end();
    console.log('🔒 [DEBUG] Database connection closed');
  }
}

// Run debug migration
debugMigration().catch(error => {
  console.error('💥 [DEBUG] Unhandled error:', error);
  process.exit(1);
});

console.log('🏁 [DEBUG] Script setup complete, running migration...');