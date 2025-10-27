// Apply the updated view fix
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

async function applyFix() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'swaddle',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || ''
  });

  try {
    console.log('🔧 [APPLY-FIX] Applying updated view fix...');
    
    const fixSQL = fs.readFileSync(path.join(__dirname, 'fix-view-v2.sql'), 'utf8');
    await pool.query(fixSQL);
    
    console.log('✅ [APPLY-FIX] Updated view applied successfully!');
    
    // Test the view
    const testResult = await pool.query('SELECT COUNT(*) as count FROM track_recommendation_data');
    console.log(`🎉 [APPLY-FIX] View now has ${testResult.rows[0].count} records!`);
    
    // Show a sample
    if (testResult.rows[0].count > 0) {
      const sample = await pool.query('SELECT track_name, artist_name, spotify_popularity FROM track_recommendation_data LIMIT 3');
      console.log('📋 [APPLY-FIX] Sample records:');
      sample.rows.forEach((row, i) => {
        console.log(`   ${i + 1}. ${row.track_name} - ${row.artist_name} (popularity: ${row.spotify_popularity})`);
      });
    }
    
  } catch (error) {
    console.error('❌ [APPLY-FIX] Fix failed:', error.message);
    throw error;
  } finally {
    await pool.end();
    console.log('🔒 [APPLY-FIX] Database connection closed');
  }
}

applyFix().catch(console.error);