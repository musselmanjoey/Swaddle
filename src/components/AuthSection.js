import React, { useState, useEffect } from 'react';
import { SPOTIFY_CONFIG } from '../config/spotify';
import Button from './Button';
import StatusMessage from './StatusMessage';
import './AuthSection.css';

const AuthSection = ({ auth, className = '' }) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showManualFlow, setShowManualFlow] = useState(false);
  const [resultUrl, setResultUrl] = useState('');

  // Check if we're running in Electron - more robust detection
  const isElectron = typeof window !== 'undefined' && (
    window.electronAPI?.isElectron || 
    window.process?.type === 'renderer' ||
    window.require !== undefined ||
    navigator.userAgent.includes('Electron')
  );
  
  console.log('🔍 [FRONTEND] Environment detection:', {
    hasElectronAPI: !!window.electronAPI,
    isElectronFlag: window.electronAPI?.isElectron,
    processType: window.process?.type,
    hasRequire: typeof window.require !== 'undefined',
    userAgent: navigator.userAgent.includes('Electron'),
    finalIsElectron: isElectron
  });

  useEffect(() => {
    // Listen for Electron auth completion
    if (isElectron) {
      console.log('🎵 [FRONTEND] Setting up auth event listener...');
      
      const handleAuthComplete = (event, result) => {
        console.log('🎉 [FRONTEND] Auth complete event received:', result);
        setIsAuthenticating(false);
        
        if (result.success) {
          console.log('✅ [FRONTEND] Auth successful, processing result...');
          // Process the auth result
          auth.processAuthResult(result.url);
        } else {
          console.log('❌ [FRONTEND] Auth failed or cancelled:', result);
        }
      };

      window.electronAPI.onAuthComplete(handleAuthComplete);

      // Cleanup listener on unmount
      return () => {
        console.log('🧹 [FRONTEND] Cleaning up auth listener...');
        window.electronAPI.removeAuthListener();
      };
    } else {
      console.log('🌐 [FRONTEND] Running in web mode, no Electron API available');
    }
  }, [auth, isElectron]);

  const handleElectronAuth = async () => {
    console.log('🚀 [FRONTEND] Starting Electron auth...');
    
    // Check if Client ID is configured
    if (SPOTIFY_CONFIG.CLIENT_ID === 'your_spotify_client_id_here') {
      console.log('⚠️ [FRONTEND] Client ID not configured!');
      alert('Please configure your Spotify Client ID in src/config/spotify.js');
      return;
    }

    console.log('📝 [FRONTEND] Client ID configured:', SPOTIFY_CONFIG.CLIENT_ID.substring(0, 10) + '...');
    setIsAuthenticating(true);

    console.log('🗗️ [FRONTEND] Calling auth.authenticate()...');
    const result = await auth.authenticate();
    console.log('📝 [FRONTEND] Auth result:', result);
    
    if (result.requiresManualAuth) {
      console.log('🔐 [FRONTEND] Manual auth required, opening Electron window...');
      try {
        // Use Electron's native auth window - fully automated!
        console.log('🔗 [FRONTEND] Calling electronAPI.openSpotifyAuth...');
        const authResult = await window.electronAPI.openSpotifyAuth(result.authURL);
        console.log('📝 [FRONTEND] Electron auth result:', authResult);
        
        if (!authResult.success) {
          console.log('❌ [FRONTEND] Electron auth failed');
          setIsAuthenticating(false);
        }
        // Success case is handled by the event listener
      } catch (error) {
        console.error('🚫 [FRONTEND] Electron auth failed:', error);
        setIsAuthenticating(false);
      }
    } else {
      console.log('ℹ️ [FRONTEND] Direct auth completed (no manual auth required)');
    }
  };

  const handleWebAuth = async () => {
    console.log('🌐 [FRONTEND] Starting web auth...');
    
    // Check if Client ID is configured
    if (SPOTIFY_CONFIG.CLIENT_ID === 'your_spotify_client_id_here') {
      console.log('⚠️ [FRONTEND] Client ID not configured!');
      alert('Please configure your Spotify Client ID in src/config/spotify.js');
      return;
    }

    setIsAuthenticating(true);

    const result = await auth.authenticate();
    
    if (result.requiresManualAuth) {
      console.log('🔐 [FRONTEND] Manual auth required for web, opening new tab...');
      
      // For web, we can't monitor popups due to COOP, so we'll use a different approach
      const popup = window.open(
        result.authURL,
        'spotify-auth',
        'width=500,height=700,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        console.log('🚫 [FRONTEND] Popup blocked!');
        setIsAuthenticating(false);
        alert('Popup blocked! Please allow popups for this site.');
        return;
      }

      console.log('✅ [FRONTEND] Popup opened successfully');
      
      // Since we can't monitor the popup due to COOP, we'll use a message-based approach
      const messageListener = (event) => {
        console.log('📬 [FRONTEND] Received message:', event.data);
        
        // Check if this is our auth completion message
        if (event.data && event.data.type === 'SPOTIFY_AUTH_COMPLETE') {
          console.log('🎉 [FRONTEND] Auth complete message received!');
          
          if (event.data.success && event.data.url) {
            console.log('✅ [FRONTEND] Processing auth result...');
            auth.processAuthResult(event.data.url);
            setIsAuthenticating(false);
            popup.close();
          } else {
            console.log('❌ [FRONTEND] Auth failed in popup');
            setIsAuthenticating(false);
          }
          
          window.removeEventListener('message', messageListener);
        }
      };
      
      window.addEventListener('message', messageListener);
      
      // Fallback: Show manual flow after 10 seconds if no message received
      setTimeout(() => {
        console.log('⏰ [FRONTEND] No auth message received, showing manual flow...');
        setShowManualFlow(true);
        setIsAuthenticating(false);
        window.removeEventListener('message', messageListener);
      }, 10000);
    }
  };

  const handleAuth = () => {
    if (isElectron) {
      handleElectronAuth();
    } else {
      handleWebAuth();
    }
  };

  const handleCancel = () => {
    console.log('💴 [FRONTEND] User cancelled authentication');
    setIsAuthenticating(false);
    setShowManualFlow(false);
  };

  const handleManualAuthComplete = async () => {
    if (!resultUrl.trim()) {
      return;
    }

    const result = await auth.processAuthResult(resultUrl);
    
    if (result.success) {
      setShowManualFlow(false);
      setResultUrl('');
    }
  };

  return (
    <section className={`auth-section ${className}`}>
      <h2 className="auth-title">🔐 Connect to Spotify</h2>
      
      {!auth.isAuthenticated ? (
        <>
          <p className="auth-description">
            Sign in to your Spotify account to create and manage playlists.
            {isElectron ? ' Authentication will open in a secure popup window.' : ' A popup window will open for authentication.'}
          </p>
          
          <Button
            onClick={handleAuth}
            disabled={auth.loading || isAuthenticating}
            loading={auth.loading || isAuthenticating}
            className="auth-button"
          >
            {isAuthenticating ? 
              (isElectron ? '🔄 Authenticating...' : '🔄 Popup opened, please complete login...') : 
              '🎧 Sign in with Spotify'
            }
          </Button>

          {isAuthenticating && (
            <div className="auth-progress">
              <StatusMessage type="loading">
                {isElectron ? 
                  '🔄 Spotify login window opened. Please complete the sign-in process.' :
                  '🔄 Popup opened. Complete the login in the popup window - it will close automatically when done.'
                }
              </StatusMessage>
              
              <Button
                onClick={handleCancel}
                variant="secondary"
                size="small"
                className="cancel-button"
              >
                Cancel
              </Button>
            </div>
          )}

          {!isElectron && (
            <div className="web-notice">
              <StatusMessage type="info">
                💡 For the best experience, download the desktop app for seamless authentication.
              </StatusMessage>
            </div>
          )}
        </>
      ) : (
        <div className="auth-success">
          <StatusMessage type="success">
            ✅ Connected as {auth.user?.display_name || auth.user?.id}! 
            You can now create playlists.
          </StatusMessage>
          
          <Button
            onClick={auth.logout}
            variant="secondary"
            size="small"
            className="logout-button"
          >
            🚪 Sign Out
          </Button>
        </div>
      )}

      {auth.error && (
        <StatusMessage type="error">
          {auth.error}
        </StatusMessage>
      )}

      {SPOTIFY_CONFIG.CLIENT_ID === 'your_spotify_client_id_here' && (
        <StatusMessage type="error">
          ⚠️ Spotify Client ID not configured. Please update src/config/spotify.js with your Spotify app's Client ID.
        </StatusMessage>
      )}
    </section>
  );
};

export default AuthSection;
