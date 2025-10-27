const fs = require('fs');
const path = require('path');
const db = require('../src/database/connection.js');

async function setupDatabase() {
  console.log('🚀 Setting up Swaddle database...\n');

  try {
    // Connect to database
    console.log('1. Connecting to PostgreSQL...');
    const connected = await db.connect();
    
    if (!connected) {
      console.error('❌ Failed to connect to database');
      console.error('Make sure PostgreSQL is running and your .env.local file is configured correctly');
      process.exit(1);
    }

    // Check if database exists and is accessible
    console.log('2. Checking database accessibility...');
    const healthCheck = await db.healthCheck();
    if (!healthCheck) {
      console.error('❌ Database health check failed');
      process.exit(1);
    }

    // Run migrations
    console.log('3. Running database migrations...');
    const migrationPath = path.join(__dirname, '../src/database/migrations/001_initial_schema.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('   Creating tables and indexes...');
    await db.query(migrationSQL);
    
    // Verify tables were created
    console.log('4. Verifying table creation...');
    const tableCheck = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    const tables = tableCheck.rows.map(row => row.table_name);
    const expectedTables = [
      'users', 'artists', 'albums', 'tracks', 
      'user_liked_songs', 'lyrics', 'curation_sessions',
      'user_taste_profiles', 'track_similarities', 'sync_status'
    ];
    
    console.log(`   Created ${tables.length} tables:`);
    tables.forEach(table => console.log(`   ✅ ${table}`));
    
    // Check for missing tables
    const missingTables = expectedTables.filter(table => !tables.includes(table));
    if (missingTables.length > 0) {
      console.warn(`   ⚠️  Missing tables: ${missingTables.join(', ')}`);
    }

    // Check views
    console.log('5. Verifying views...');
    const viewCheck = await db.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    const views = viewCheck.rows.map(row => row.table_name);
    console.log(`   Created ${views.length} views:`);
    views.forEach(view => console.log(`   ✅ ${view}`));

    // Test insert and query
    console.log('6. Testing database operations...');
    
    // Test user insert
    await db.query(`
      INSERT INTO users (id, display_name, email, country) 
      VALUES ('test_setup_user', 'Setup Test User', 'setup@test.com', 'US')
      ON CONFLICT (id) DO UPDATE SET 
        display_name = EXCLUDED.display_name,
        updated_at = NOW();
    `);
    
    // Test query
    const userTest = await db.query('SELECT * FROM users WHERE id = $1', ['test_setup_user']);
    if (userTest.rows.length > 0) {
      console.log('   ✅ Database read/write operations working');
    }
    
    // Clean up test data
    await db.query('DELETE FROM users WHERE id = $1', ['test_setup_user']);

    console.log('\n🎉 Database setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Update your .env.local file with your Spotify and Genius API keys');
    console.log('2. Run "npm install" to install the new dependencies');
    console.log('3. Start the app with "npm run electron-dev"');
    console.log('4. Begin syncing your liked songs from the new Dashboard tab');

  } catch (error) {
    console.error('\n💥 Database setup failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n🔧 Troubleshooting:');
      console.error('- Make sure PostgreSQL is installed and running');
      console.error('- Check your database connection settings in .env.local');
      console.error('- Ensure the database "swaddle" exists');
    } else if (error.code === '3D000') {
      console.error('\n🔧 Database does not exist. Please:');
      console.error('1. Connect to PostgreSQL: psql -U postgres');
      console.error('2. Create database: CREATE DATABASE swaddle;');
      console.error('3. Run this setup script again');
    } else if (error.code === '28P01') {
      console.error('\n🔧 Authentication failed:');
      console.error('- Check your database password in .env.local');
      console.error('- Ensure the database user has the correct permissions');
    }
    
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;
