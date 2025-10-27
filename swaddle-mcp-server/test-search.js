#!/usr/bin/env node

import { db } from './db/connection.js';
import { searchLikedSongs } from './tools/searchLikedSongs.js';

console.log('🧪 Testing search_liked_songs tool...\n');

async function test() {
  try {
    await db.connect();

    // Test 1: Get first 5 most recently liked songs
    console.log('1. Testing: Get 5 most recently liked songs');
    const recent = await searchLikedSongs({ limit: 5 });
    console.log(`   ✅ Found ${recent.total} total songs, returning ${recent.count}`);
    console.log(`   First song: "${recent.tracks[0].name}" by ${recent.tracks[0].artist}`);
    console.log(`   Has more: ${recent.hasMore}\n`);

    // Test 2: Search for a specific artist
    console.log('2. Testing: Search by artist name');
    const artistSearch = await searchLikedSongs({ artist: 'hey', limit: 3 });
    console.log(`   ✅ Found ${artistSearch.total} songs`);
    if (artistSearch.tracks.length > 0) {
      artistSearch.tracks.forEach((t, i) => {
        console.log(`   ${i + 1}. "${t.name}" by ${t.artist} (${t.duration})`);
      });
    }
    console.log();

    // Test 3: Search with a query
    console.log('3. Testing: Text search across tracks');
    const querySearch = await searchLikedSongs({ query: 'love', limit: 3 });
    console.log(`   ✅ Found ${querySearch.total} songs matching "love"`);
    if (querySearch.tracks.length > 0) {
      querySearch.tracks.forEach((t, i) => {
        console.log(`   ${i + 1}. "${t.name}" by ${t.artist}`);
      });
    }
    console.log();

    // Test 4: Sort by popularity
    console.log('4. Testing: Sort by popularity (descending)');
    const popular = await searchLikedSongs({ sortBy: 'popularity', sortOrder: 'desc', limit: 3 });
    console.log(`   ✅ Top 3 most popular songs:`);
    popular.tracks.forEach((t, i) => {
      console.log(`   ${i + 1}. "${t.name}" by ${t.artist} (popularity: ${t.popularity})`);
    });
    console.log();

    console.log('✅ All search tests passed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await db.close();
  }
}

test();
