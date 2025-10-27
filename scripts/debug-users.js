// Debug the user ID being used in enhancement sessions
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

async function debugUserIds() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'swaddle',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || ''
  });

  try {
    console.log('🔍 [DEBUG-USERS] Checking all users and their IDs...');
    
    // Check all users
    const users = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    console.log(`📊 [DEBUG-USERS] Found ${users.rows.length} users:`);
    users.rows.forEach(user => {
      console.log(`   ✓ ID: "${user.id}" | Name: "${user.display_name}" | Email: "${user.email || 'N/A'}"`);
      console.log(`     Created: ${user.created_at} | Updated: ${user.updated_at}`);
    });
    
    // Check enhanced playlists table structure
    console.log('\\n🔍 [DEBUG-USERS] Checking enhanced_playlists foreign key constraint...');
    const constraints = await pool.query(`
      SELECT 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'enhanced_playlists'
    `);
    
    console.log('📋 [DEBUG-USERS] Foreign key constraints on enhanced_playlists:');
    constraints.rows.forEach(constraint => {
      console.log(`   ${constraint.column_name} -> ${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
    });
    
    // Check if there are any failed enhancement sessions
    console.log('\\n🔍 [DEBUG-USERS] Checking for any existing enhancement data...');
    const enhancedCount = await pool.query('SELECT COUNT(*) as count FROM enhanced_playlists');
    const sessionsCount = await pool.query('SELECT COUNT(*) as count FROM playlist_enhancement_sessions');
    
    console.log(`📊 [DEBUG-USERS] Enhanced playlists: ${enhancedCount.rows[0].count}`);
    console.log(`📊 [DEBUG-USERS] Enhancement sessions: ${sessionsCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ [DEBUG-USERS] Error:', error.message);
    console.error('📝 [DEBUG-USERS] Full error:', error);
  } finally {
    await pool.end();
    console.log('🔒 [DEBUG-USERS] Database connection closed');
  }
}

debugUserIds().catch(console.error);