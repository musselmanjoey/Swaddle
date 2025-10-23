import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Store tokens in a JSON file - use absolute path to avoid issues with CWD
// This resolves to C:\Users\musse\Projects\Swaddle\.spotify-tokens.json
const TOKEN_FILE = path.resolve(__dirname, '../../.spotify-tokens.json');

/**
 * Token storage for Spotify refresh tokens
 * Stores refresh token, access token, and expiry info
 */
export class TokenStore {
  /**
   * Save tokens to file
   * @param {Object} tokens - Token data
   * @param {string} tokens.access_token - Spotify access token
   * @param {string} tokens.refresh_token - Spotify refresh token
   * @param {number} tokens.expires_in - Seconds until expiry
   */
  async saveTokens(tokens) {
    const data = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + (tokens.expires_in * 1000),
      updated_at: new Date().toISOString()
    };

    try {
      await fs.writeFile(TOKEN_FILE, JSON.stringify(data, null, 2), 'utf8');
      console.error('✅ Tokens saved successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to save tokens:', error.message);
      throw error;
    }
  }

  /**
   * Load tokens from file
   * @returns {Promise<Object|null>} Token data or null if not found
   */
  async loadTokens() {
    try {
      console.error(`🔍 Loading tokens from: ${TOKEN_FILE}`);
      const data = await fs.readFile(TOKEN_FILE, 'utf8');
      const tokens = JSON.parse(data);
      console.error(`✅ Tokens loaded. Has refresh_token: ${!!tokens.refresh_token}, Expires: ${new Date(tokens.expires_at).toISOString()}`);
      return tokens;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.error(`⚠️  Token file not found at: ${TOKEN_FILE}`);
        return null; // File doesn't exist yet
      }
      console.error('❌ Failed to load tokens:', error.message);
      throw error;
    }
  }

  /**
   * Check if access token is expired
   * @returns {Promise<boolean>}
   */
  async isAccessTokenExpired() {
    const tokens = await this.loadTokens();
    if (!tokens || !tokens.expires_at) {
      return true;
    }

    // Consider expired if less than 5 minutes remaining
    return Date.now() > (tokens.expires_at - 5 * 60 * 1000);
  }

  /**
   * Get refresh token
   * @returns {Promise<string|null>}
   */
  async getRefreshToken() {
    const tokens = await this.loadTokens();
    return tokens?.refresh_token || null;
  }

  /**
   * Get access token
   * @returns {Promise<string|null>}
   */
  async getAccessToken() {
    const tokens = await this.loadTokens();
    if (!tokens || await this.isAccessTokenExpired()) {
      return null;
    }
    return tokens.access_token;
  }

  /**
   * Update just the access token (after refresh)
   * @param {string} accessToken - New access token
   * @param {number} expiresIn - Seconds until expiry
   */
  async updateAccessToken(accessToken, expiresIn) {
    const tokens = await this.loadTokens();
    if (!tokens) {
      throw new Error('No tokens to update');
    }

    tokens.access_token = accessToken;
    tokens.expires_at = Date.now() + (expiresIn * 1000);
    tokens.updated_at = new Date().toISOString();

    await fs.writeFile(TOKEN_FILE, JSON.stringify(tokens, null, 2), 'utf8');
  }

  /**
   * Clear all tokens
   */
  async clearTokens() {
    try {
      await fs.unlink(TOKEN_FILE);
      console.error('🗑️  Tokens cleared');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }
}

export const tokenStore = new TokenStore();
