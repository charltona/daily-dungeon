import React from 'react';
import ReactDOM from 'react-dom/client';
import flagsmith from '@flagsmith/flagsmith';
import { FlagsmithProvider } from '@flagsmith/flagsmith/react';
import { DEFAULT_FEATURE_FLAG_VALUES } from '@daily-dungeon/shared';
import App from './App.js';
import './index.css';

const environmentID = (import.meta as any).env?.VITE_FLAGSMITH_CLIENT_KEY || '';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FlagsmithProvider
      flagsmith={flagsmith}
      options={{
        environmentID,
        preventFetch: !environmentID,
        defaultFlags: DEFAULT_FEATURE_FLAG_VALUES as any,
        cacheFlags: true,
      }}
    >
      <App />
    </FlagsmithProvider>
  </React.StrictMode>
);
