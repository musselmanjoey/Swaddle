# Database Reset Script

This script safely clears all data from your Swaddle database while preserving the table structure.

## How to Use

### Option 1: Using npm script (Recommended)
```bash
npm run db:reset
```

### Option 2: Direct execution
```bash
node scripts/reset-database.js
```

## What It Does

### ✅ **Safely Clears Data:**
- Deletes all rows from all Swaddle tables
- Preserves table structure and indexes
- Resets auto-increment sequences
- Respects foreign key constraints

### 📊 **Shows Progress:**
- Displays current data counts before reset
- Shows clearing progress for each table
- Verifies reset completion
- Reports final statistics

### 🛡️ **Safety Features:**
- Tests database connection first
- Uses proper deletion order to avoid constraint violations
- Handles missing tables gracefully
- Provides detailed error messages

## Tables Cleared

The script clears data from these tables in the correct order:

1. `playlist_enhancement_sessions`
2. `enhanced_playlists`
3. `genius_song_data`
4. `lyrics`
5. `user_liked_songs`
6. `track_similarities`
7. `curation_sessions`
8. `user_taste_profiles`
9. `sync_status`
10. `tracks`
11. `albums`
12. `artists`
13. `users`

## Example Output

```
🎵 SWADDLE DATABASE RESET SCRIPT
================================
🔍 TESTING DATABASE CONNECTION...

✅ Database connection successful!
   Current time: 2024-01-15T10:30:45.123Z
   PostgreSQL: PostgreSQL 15.0
   Database: swaddle
   Host: localhost:5432

🧹 STARTING DATABASE RESET...

📊 CURRENT DATA COUNTS:
   users                     : 1
   artists                   : 45
   albums                    : 32
   tracks                    : 762
   user_liked_songs          : 762
   lyrics                    : 256
   enhanced_playlists        : 0 (empty)
   genius_song_data          : 0 (empty)

🗑️  CLEARING DATA (preserving table structure)...

✅ Cleared 762 rows from user_liked_songs
✅ Cleared 762 rows from tracks
✅ Cleared 32 rows from albums
✅ Cleared 45 rows from artists
✅ Cleared 1 rows from users
✅ Cleared 256 rows from lyrics

🔄 RESETTING SEQUENCES...
✅ Reset sequence: enhanced_playlists_id_seq

🔍 VERIFYING RESET...

📊 FINAL DATA COUNTS:
   users                     : 0 (empty)
   artists                   : 0 (empty)
   albums                    : 0 (empty)
   tracks                    : 0 (empty)
   user_liked_songs          : 0 (empty)
   lyrics                    : 0 (empty)

🎉 DATABASE RESET COMPLETE!
   Cleared 1858 total rows
   All tables are now empty
   Table structure preserved

✨ Your database is ready for fresh data!

🔒 Database connection closed
```

## When to Use

- **Starting fresh** after significant schema changes
- **Testing** with clean data
- **Development** when you want to reset your local database
- **Before major migrations** to ensure clean state

## Prerequisites

- PostgreSQL database running
- Correct `.env.local` configuration
- Node.js and npm installed

## Troubleshooting

If the script fails:

1. **Check database connection:**
   - Ensure PostgreSQL is running
   - Verify `.env.local` has correct credentials
   - Test connection manually

2. **Check permissions:**
   - User must have DELETE permissions on all tables
   - User must have ALTER permissions for sequence resets

3. **Check foreign key constraints:**
   - Script handles this automatically
   - If issues persist, check for custom constraints

## Safety Note

⚠️ **This script permanently deletes all data!**

- Only run on development/test databases
- Always backup production data before running
- Double-check your database connection settings
- The script does NOT ask for confirmation

## Recovery

If you need to restore data after reset:

1. **Re-run migrations** to ensure schema is current
2. **Re-sync data** using the app's sync features
3. **Restore from backup** if available

---

**Need help?** Check the main Swaddle documentation or create an issue in the project repository.
