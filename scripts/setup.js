#!/usr/bin/env node

// Enhanced setup script for Swaddle with database integration
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎵 Setting up Swaddle - Enhanced Music Intelligence System\n');

// Check if we're in the right directory
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ Please run this script from the Swaddle project root directory');
  process.exit(1);
}

try {
  // Step 1: Install dependencies
  console.log('📦 Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });

  // Step 2: Check if .env.local exists
  const envLocalPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envLocalPath)) {
    console.log('\n⚙️  Creating .env.local from template...');
    const envExamplePath = path.join(process.cwd(), '.env.example');
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envLocalPath);
      console.log('✅ Created .env.local - Please edit it with your API keys');
    }
  }

  // Step 3: Check PostgreSQL
  console.log('\n🗄️  Checking PostgreSQL...');
  try {
    execSync('psql --version', { stdio: 'pipe' });
    console.log('✅ PostgreSQL is installed');
  } catch (error) {
    console.log('⚠️  PostgreSQL not found. Please install PostgreSQL:');
    console.log('   Windows: https://www.postgresql.org/download/windows/');
    console.log('   Mac: brew install postgresql');
    console.log('   Linux: sudo apt-get install postgresql');
  }

  // Step 4: Instructions for next steps
  console.log('\n🚀 Setup complete! Next steps:\n');
  
  console.log('1. 📝 Configure your API keys in .env.local:');
  console.log('   - REACT_APP_SPOTIFY_CLIENT_ID (required)');
  console.log('   - REACT_APP_GENIUS_ACCESS_TOKEN (optional, for lyrics)');
  console.log('   - Database credentials (DB_USER, DB_PASSWORD, etc.)\n');
  
  console.log('2. 🗄️  Set up PostgreSQL database:');
  console.log('   - Create database: createdb swaddle');
  console.log('   - Or via psql: CREATE DATABASE swaddle;\n');
  
  console.log('3. 🏗️  Initialize database schema:');
  console.log('   npm run db:setup\n');
  
  console.log('4. 🎵 Start the application:');
  console.log('   npm run electron-dev\n');
  
  console.log('5. 📊 Sync your Spotify liked songs:');
  console.log('   - Open the app and go to the Dashboard tab');
  console.log('   - Click "Sync Liked Songs" to import your music\n');
  
  console.log('🎉 You\'re ready to create intelligent playlists with Swaddle!');
  
  // Optional: Try to set up database if PostgreSQL is available
  console.log('\n🤖 Attempting automatic database setup...');
  try {
    execSync('npm run db:setup', { stdio: 'inherit' });
  } catch (error) {
    console.log('⚠️  Automatic database setup failed. Please run "npm run db:setup" manually after configuring PostgreSQL.');
  }

} catch (error) {
  console.error('\n💥 Setup failed:', error.message);
  console.error('\nPlease check the error above and try again.');
  process.exit(1);
}
