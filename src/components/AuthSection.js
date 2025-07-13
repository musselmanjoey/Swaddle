import React, { useState } from 'react';
import Button from './Button';
import Input from './Input';
import StatusMessage from './StatusMessage';
import './AuthSection.css';

const AuthSection = ({ auth, className = '' }) => {
  const [clientId, setClientId] = useState('');
  const [authUrl, setAuthUrl] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [showManualAuth, setShowManualAuth] = useState(false);

  const handleAuth = async () => {
    if (!clientId.trim()) {
      return;
    }

    const result = await auth.authenticate(clientId);
    
    if (result.requiresManualAuth) {
      setAuthUrl(result.authURL);
      setShowManualAuth(true);
    }
  };

  const handleManualAuthComplete = async () => {
    if (!resultUrl.trim()) {
      return;
    }

    const result = await auth.processAuthResult(resultUrl);
    
    if (result.success) {
      setShowManualAuth(false);
      setResultUrl('');
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.log('Copy failed:', err);
    }
  };

  return (
    <section className={`auth-section ${className}`}>
      <h2 className="auth-title">🔐 Spotify Connection</h2>
      
      {!auth.isAuthenticated ? (
        <>
          <div className="input-group">
            <Input
              label="Client ID:"
              value={clientId}
              onChange={setClientId}
              placeholder="Your Spotify Client ID"
              disabled={auth.loading}
            />
          </div>
          
          <Button
            onClick={handleAuth}
            disabled={!clientId.trim() || auth.loading}
            loading={auth.loading}
            className="auth-button"
          >
            🎧 Connect to Spotify
          </Button>

          {showManualAuth && (
            <div className="manual-auth">
              <h3 className="manual-auth-title">🔐 Complete Authentication</h3>
              
              <p className="manual-auth-step">
                <strong>Step 1:</strong> Copy this URL and open it in your browser:
              </p>
              
              <div className="auth-url-container">
                <code className="auth-url">{authUrl}</code>
                <Button
                  size="small"
                  onClick={() => copyToClipboard(authUrl)}
                  className="copy-button"
                >
                  📋 Copy URL
                </Button>
              </div>
              
              <p className="manual-auth-step">
                <strong>Step 2:</strong> After logging in, copy the entire URL and paste it below:
              </p>
              
              <div className="input-group">
                <textarea
                  className="auth-result-input"
                  value={resultUrl}
                  onChange={(e) => setResultUrl(e.target.value)}
                  placeholder="Paste the complete URL from your browser after authentication..."
                  disabled={auth.loading}
                />
              </div>
              
              <Button
                onClick={handleManualAuthComplete}
                disabled={!resultUrl.trim() || auth.loading}
                loading={auth.loading}
                className="complete-auth-button"
              >
                🎵 Complete Authentication
              </Button>
              
              <p className="auth-hint">
                💡 The URL you paste should contain "access_token=" in it
              </p>
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
            🚪 Disconnect
          </Button>
        </div>
      )}

      {auth.error && (
        <StatusMessage type="error">
          {auth.error}
        </StatusMessage>
      )}
    </section>
  );
};

export default AuthSection;
