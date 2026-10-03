import React from 'react';
import ReactDOM from 'react-dom/client';
import flagsmith from '@flagsmith/flagsmith';
import { FlagsmithProvider } from '@flagsmith/flagsmith/react';
import App from './App.js';
import './index.css';

import { GoogleOAuthProvider } from '@react-oauth/google';

const environmentID = (import.meta as any).env?.VITE_FLAGSMITH_CLIENT_KEY || '';
const googleClientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <FlagsmithProvider
        flagsmith={flagsmith}
        options={{
          environmentID,
          preventFetch: !environmentID,
          cacheFlags: true,
        }}
      >
        <App />
      </FlagsmithProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
