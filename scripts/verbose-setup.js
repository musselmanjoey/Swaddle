import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎵 Swaddle Database Setup - Verbose Mode');
console.log('=====================================\n');

try {
  // Check if .env.local exists
  const envPath = path.join(process.cwd(), '.env.local');
  console.log('1. Checking environment configuration...');
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env.local not found');
    console.log('📝 Please create .env.local with your database configuration');
    process.exit(1);
  }
  
  console.log('✅ .env.local found');
  
  // Read and display env vars (without passwords)
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  console.log('\n2. Environment variables:');
  lines.forEach(line => {
    if (line.startsWith('DB_') && !line.includes('PASSWORD')) {
      console.log(`   ${line}`);
    } else if (line.startsWith('DB_PASSWORD')) {
      console.log('   DB_PASSWORD=***hidden***');
    }
  });
  
  // Try to import database connection
  console.log('\n3. Testing database connection...');
  
  // Load environment variables
  const dotenv = await import('dotenv');
  dotenv.config({ path: '.env.local' });
  
  // Test database import
  const db = await import('../src/database/connection.js');
  console.log('✅ Database module loaded successfully');
  
  // Test connection
  console.log('4. Attempting database connection...');
  const connected = await db.default.connect();
  
  if (connected) {
    console.log('✅ Database connection successful!');
    
    // Test basic query
    console.log('5. Testing basic query...');
    const result = await db.default.query('SELECT NOW() as current_time');
    console.log(`✅ Query successful: ${result.rows[0].current_time}`);
    
    // Check if tables exist
    console.log('6. Checking existing tables...');
    const tableResult = await db.default.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    if (tableResult.rows.length > 0) {
      console.log('📋 Existing tables found:');
      tableResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    } else {
      console.log('📋 No tables found - need to run migrations');
      
      // Run migrations
      console.log('7. Running database migrations...');
      const migrationPath = path.join(__dirname, '../src/database/migrations/001_initial_schema.sql');
      
      if (fs.existsSync(migrationPath)) {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        await db.default.query(migrationSQL);
        console.log('✅ Database schema created successfully!');
        
        // Verify tables were created
        const newTableResult = await db.default.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          ORDER BY table_name;
        `);
        
        console.log(`📋 Created ${newTableResult.rows.length} tables:`);
        newTableResult.rows.forEach(row => {
          console.log(`   ✅ ${row.table_name}`);
        });
      } else {
        console.log('❌ Migration file not found:', migrationPath);
      }
    }
    
    await db.default.close();
    console.log('\n🎉 Database setup completed successfully!');
    
  } else {
    console.log('❌ Database connection failed');
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Make sure PostgreSQL is installed and running');
    console.log('2. Check your .env.local database credentials');
    console.log('3. Ensure the "swaddle" database exists');
    process.exit(1);
  }
  
} catch (error) {
  console.error('\n💥 Setup failed with error:');
  console.error(error.message);
  
  if (error.code === 'ECONNREFUSED') {
    console.log('\n🔧 PostgreSQL Connection Failed:');
    console.log('- Make sure PostgreSQL is installed and running');
    console.log('- Check if the service is started in Windows Services');
    console.log('- Verify your DB_HOST and DB_PORT in .env.local');
  } else if (error.code === '3D000') {
    console.log('\n🔧 Database Does Not Exist:');
    console.log('- Create the database: CREATE DATABASE swaddle;');
    console.log('- Or use pgAdmin 4 to create it via GUI');
  } else if (error.code === '28P01') {
    console.log('\n🔧 Authentication Failed:');
    console.log('- Check your DB_PASSWORD in .env.local');
    console.log('- Make sure it matches your PostgreSQL password');
  }
  
  process.exit(1);
}
