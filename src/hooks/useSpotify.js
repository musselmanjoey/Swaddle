import { useState, useCallback } from 'react';
import spotifyService from '../services/spotify';

// Custom hook for Spotify authentication - easily adaptable for React Native
export const useSpotifyAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  const authenticate = useCallback(async (accessToken = null) => {
    setLoading(true);
    setError(null);

    try {
      if (accessToken) {
        // Use provided token
        spotifyService.setAccessToken(accessToken);
        setAccessToken(accessToken);
      } else {
        // Generate auth URL for manual authentication
        const authURL = spotifyService.generateAuthURL();
        return { authURL, requiresManualAuth: true };
      }

      // Verify token by getting user info
      const userData = await spotifyService.getCurrentUser();
      setUser(userData);
      setIsAuthenticated(true);
      
      return { success: true, user: userData };
    } catch (err) {
      setError(err.message);
      setIsAuthenticated(false);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const processAuthResult = useCallback(async (url) => {
    console.log('\n🔐 [AUTH-HOOK] ===== PROCESSING AUTH RESULT =====');
    console.log('🔐 [AUTH-HOOK] URL received:', url);
    
    setLoading(true);
    setError(null);

    try {
      const token = spotifyService.extractTokenFromURL(url);
      console.log('🔐 [AUTH-HOOK] Token extracted:', token ? token.substring(0, 20) + '...' : 'null');
      
      if (!token) {
        throw new Error('No access token found in URL');
      }

      console.log('🔐 [AUTH-HOOK] Setting token in Spotify service...');
      spotifyService.setAccessToken(token);
      setAccessToken(token);
      
      console.log('🔐 [AUTH-HOOK] Getting current user data...');
      const userData = await spotifyService.getCurrentUser();
      console.log('🔐 [AUTH-HOOK] User data received:', userData);
      
      setUser(userData);
      setIsAuthenticated(true);
      
      console.log('🔐 [AUTH-HOOK] Authentication complete!');
      console.log('🔐 [AUTH-HOOK] Final state: authenticated =', true, ', user ID =', userData.id);
      console.log('🔐 [AUTH-HOOK] =======================================\n');
      
      return { success: true, user: userData };
    } catch (err) {
      console.error('\n❌ [AUTH-HOOK] ===== AUTH PROCESSING FAILED =====');
      console.error('❌ [AUTH-HOOK] Error:', err.message);
      console.error('❌ [AUTH-HOOK] Stack:', err.stack);
      console.error('❌ [AUTH-HOOK] ======================================\n');
      
      setError(err.message);
      setIsAuthenticated(false);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    spotifyService.setAccessToken(null);
    setAccessToken(null);
    setIsAuthenticated(false);
    setUser(null);
    setError(null);
  }, []);

  return {
    isAuthenticated,
    user,
    loading,
    error,
    accessToken,
    authenticate,
    processAuthResult,
    logout
  };
};

// Custom hook for playlist creation
export const usePlaylistCreator = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  const createPlaylist = useCallback(async (name, description, tracks) => {
    setLoading(true);
    setError(null);

    try {
      const result = await spotifyService.createPlaylistWithTracks(name, description, tracks);
      setLastResult(result);
      return { success: true, ...result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setLastResult(null);
  }, []);

  return {
    loading,
    error,
    lastResult,
    createPlaylist,
    reset
  };
};
