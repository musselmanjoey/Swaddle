#!/usr/bin/env node

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { tokenStore } from './tokenStore.js';
import http from 'http';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env.local');
dotenv.config({ path: envPath });

const CLIENT_ID = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:8888/callback';
const PORT = 8888;

// Scopes needed
const SCOPES = [
  'user-library-read',
  'user-top-read',
  'user-read-private',
  'user-read-email',
  'playlist-modify-private',
  'playlist-modify-public'
].join(' ');

console.log('🎵 Spotify Refresh Token Generator\n');

// Validate environment
if (!CLIENT_ID) {
  console.error('❌ Error: REACT_APP_SPOTIFY_CLIENT_ID not found in .env.local');
  process.exit(1);
}

if (!CLIENT_SECRET) {
  console.error('❌ Error: SPOTIFY_CLIENT_SECRET not found in .env.local');
  console.error('\n📝 To get your Client Secret:');
  console.error('   1. Go to https://developer.spotify.com/dashboard');
  console.error('   2. Click on your app');
  console.error('   3. Click "Settings"');
  console.error('   4. Copy the Client Secret');
  console.error('   5. Add to .env.local: SPOTIFY_CLIENT_SECRET=your_secret_here\n');
  process.exit(1);
}

// Create auth URL
const authURL = `https://accounts.spotify.com/authorize?` + new URLSearchParams({
  client_id: CLIENT_ID,
  response_type: 'code',
  redirect_uri: REDIRECT_URI,
  scope: SCOPES,
  show_dialog: 'true'
}).toString();

console.log('📖 Step 1: Opening browser for Spotify authorization...');
console.log('   If browser doesn\'t open, go to:');
console.log(`   ${authURL}\n`);

// Create simple HTTP server to receive the callback
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/callback') {
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      console.error(`❌ Authorization error: ${error}`);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>Authorization Failed</h1><p>You can close this window.</p>');
      server.close();
      process.exit(1);
      return;
    }

    if (!code) {
      console.error('❌ No authorization code received');
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<h1>Error: No code received</h1><p>You can close this window.</p>');
      server.close();
      process.exit(1);
      return;
    }

    console.log('✅ Authorization code received!');
    console.log('🔄 Exchanging code for tokens...');

    try {
      // Exchange code for tokens
      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: REDIRECT_URI
        })
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorText}`);
      }

      const tokens = await tokenResponse.json();

      // Save tokens
      await tokenStore.saveTokens(tokens);

      console.log('✅ Tokens saved successfully!');
      console.log('\n📊 Token Info:');
      console.log(`   Access Token: ${tokens.access_token.substring(0, 20)}...`);
      console.log(`   Refresh Token: ${tokens.refresh_token.substring(0, 20)}...`);
      console.log(`   Expires In: ${tokens.expires_in} seconds`);
      console.log('\n✨ You\'re all set! The MCP server can now access your Spotify data.');
      console.log('   Restart Claude Desktop to use the new tools.\n');

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <head><title>Success!</title></head>
          <body style="font-family: sans-serif; max-width: 600px; margin: 100px auto; text-align: center;">
            <h1 style="color: #1DB954;">✅ Authentication Successful!</h1>
            <p>Your Spotify account has been connected to the Swaddle MCP server.</p>
            <p>You can close this window and return to the terminal.</p>
          </body>
        </html>
      `);

      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 1000);

    } catch (error) {
      console.error('❌ Error exchanging code for tokens:', error.message);
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end('<h1>Error</h1><p>Failed to exchange code for tokens. See terminal for details.</p>');
      server.close();
      process.exit(1);
    }
  }
});

server.listen(PORT, () => {
  console.log(`🌐 Local server listening on http://localhost:${PORT}`);
  console.log('⏳ Waiting for authorization...\n');

  // Open browser
  const command = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  exec(`${command} "${authURL}"`);
});

// Handle timeouts
setTimeout(() => {
  console.error('\n⏰ Timeout: No authorization received after 5 minutes');
  server.close();
  process.exit(1);
}, 5 * 60 * 1000);
