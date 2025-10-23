#!/usr/bin/env node

import { db } from './db/connection.js';
import { getLikedSongsCount } from './tools/getLikedSongsCount.js';

async function test() {
  console.log('🧪 Testing Swaddle MCP Server...\n');

  try {
    // Test database connection
    console.log('1. Testing database connection...');
    await db.connect();
    console.log('   ✅ Database connected\n');

    // Test getting liked songs count
    console.log('2. Testing get_liked_songs_count tool...');
    const result = await getLikedSongsCount();

    if (result.success) {
      console.log('   ✅ Tool executed successfully');
      console.log('   📊 Result:');
      console.log(`      User: ${result.displayName || result.userId}`);
      console.log(`      Total Liked Songs: ${result.totalLikedSongs}`);
      console.log(`      Last Synced: ${result.lastSyncAt || 'Never'}`);
      console.log(`      Status: ${result.syncStatus}`);
    } else {
      console.log('   ⚠️  Tool returned error:', result.error);
      console.log('   💡 Make sure you have synced your liked songs in the main Swaddle app first');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Make sure PostgreSQL is running');
    console.error('   2. Check that .env.local exists in the parent directory');
    console.error('   3. Verify database credentials are correct');
    console.error('   4. Ensure the swaddle database exists');
  } finally {
    await db.close();
    console.log('\n✅ Test complete');
    process.exit(0);
  }
}

test();
