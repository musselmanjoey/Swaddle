#!/usr/bin/env node

import { spotifyService } from './services/spotifyService.js';
import { db } from './db/connection.js';

console.log('🧪 Testing Spotify refresh token...\n');

async function test() {
  try {
    // Connect to database
    await db.connect();

    console.log('1. Testing token refresh and user fetch...');
    const user = await spotifyService.getCurrentUser();
    console.log(`✅ Successfully got user: ${user.display_name} (${user.id})`);

    console.log('\n2. Testing liked songs fetch...');
    const likedSongs = await spotifyService.getLikedSongs(0, 5);
    console.log(`✅ Successfully fetched liked songs: ${likedSongs.total} total`);
    console.log(`   First 5 tracks:`);
    likedSongs.items.forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.track.name} by ${item.track.artists[0].name}`);
    });

    console.log('\n✅ All tests passed! Refresh token is working correctly.');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await db.close();
  }
}

test();
