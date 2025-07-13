import { useState, useCallback } from 'react';
import spotifyService from '../services/spotify';

// Custom hook for Spotify authentication - easily adaptable for React Native
export const useSpotifyAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const authenticate = useCallback(async (clientId, accessToken = null) => {
    setLoading(true);
    setError(null);

    try {
      if (accessToken) {
        // Use provided token
        spotifyService.setAccessToken(accessToken);
      } else {
        // Generate auth URL for manual authentication
        const authURL = spotifyService.generateAuthURL(clientId);
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
    setLoading(true);
    setError(null);

    try {
      const token = spotifyService.extractTokenFromURL(url);
      if (!token) {
        throw new Error('No access token found in URL');
      }

      spotifyService.setAccessToken(token);
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

  const logout = useCallback(() => {
    spotifyService.setAccessToken(null);
    setIsAuthenticated(false);
    setUser(null);
    setError(null);
  }, []);

  return {
    isAuthenticated,
    user,
    loading,
    error,
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
