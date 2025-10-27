// Debug Fix Script for Database View
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

console.log('🔧 [DEBUG-FIX] Starting debug fix script...');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

console.log('📋 [DEBUG-FIX] Environment variables loaded:');
console.log(`   DB_HOST: ${process.env.DB_HOST}`);
console.log(`   DB_PORT: ${process.env.DB_PORT}`);
console.log(`   DB_NAME: ${process.env.DB_NAME}`);
console.log(`   DB_USER: ${process.env.DB_USER}`);
console.log(`   DB_PASSWORD: ${process.env.DB_PASSWORD ? '***hidden***' : 'NOT SET'}`);

async function debugFix() {
  console.log('🔍 [DEBUG-FIX] Creating database connection...');
  
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'swaddle',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || ''
  });

  try {
    console.log('🔌 [DEBUG-FIX] Testing database connection...');
    
    // Test basic connection
    const testResult = await pool.query('SELECT NOW() as current_time');
    console.log('✅ [DEBUG-FIX] Database connection successful!');
    console.log(`   Current time: ${testResult.rows[0].current_time}`);
    
    // Check if the problematic view exists
    console.log('🔍 [DEBUG-FIX] Checking if track_recommendation_data view exists...');
    const viewCheck = await pool.query(`
      SELECT schemaname, viewname 
      FROM pg_views 
      WHERE viewname = 'track_recommendation_data'
    `);
    
    if (viewCheck.rows.length > 0) {
      console.log('✅ [DEBUG-FIX] View exists, will recreate it');
    } else {
      console.log('⚠️ [DEBUG-FIX] View does not exist, will create it');
    }
    
    // Check if fix SQL file exists
    const fixPath = path.join(__dirname, 'fix-view.sql');
    console.log(`📄 [DEBUG-FIX] Checking fix file: ${fixPath}`);
    
    if (fs.existsSync(fixPath)) {
      const fixSQL = fs.readFileSync(fixPath, 'utf8');
      console.log(`✅ [DEBUG-FIX] Fix file found (${fixSQL.length} characters)`);
      console.log('📖 [DEBUG-FIX] Fix SQL preview:');
      console.log(fixSQL.substring(0, 300) + '...');
      
      console.log('🚀 [DEBUG-FIX] Executing fix SQL...');
      
      // Execute the fix
      await pool.query(fixSQL);
      console.log('✅ [DEBUG-FIX] Fix SQL executed successfully!');
      
      // Test the fixed view
      console.log('🧪 [DEBUG-FIX] Testing the fixed view...');
      const testViewResult = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'track_recommendation_data' 
        ORDER BY ordinal_position
      `);
      
      console.log(`📊 [DEBUG-FIX] View has ${testViewResult.rows.length} columns:`);
      testViewResult.rows.forEach(row => {
        console.log(`   ✓ ${row.column_name} (${row.data_type})`);
      });
      
      // Try a simple query on the view
      try {
        const sampleQuery = await pool.query('SELECT COUNT(*) as count FROM track_recommendation_data');
        console.log(`🎉 [DEBUG-FIX] View query test successful! Found ${sampleQuery.rows[0].count} records`);
      } catch (queryError) {
        console.error('❌ [DEBUG-FIX] View query test failed:', queryError.message);
      }
      
    } else {
      console.error('❌ [DEBUG-FIX] Fix file not found!');
    }
    
  } catch (error) {
    console.error('❌ [DEBUG-FIX] Error occurred:');
    console.error(`   Message: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    console.error(`   Detail: ${error.detail || 'No additional details'}`);
    console.error('📝 [DEBUG-FIX] Full error:', error);
  } finally {
    await pool.end();
    console.log('🔒 [DEBUG-FIX] Database connection closed');
  }
}

console.log('🏁 [DEBUG-FIX] Script setup complete, running fix...');

// Run debug fix
debugFix().catch(error => {
  console.error('💥 [DEBUG-FIX] Unhandled error:', error);
  process.exit(1);
});
