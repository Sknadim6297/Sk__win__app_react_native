import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { redirectStandaloneMarketingToPwa } from './pwaRedirect';
import './index.css';

// Home Screen icon was often saved from this marketing site (Download page).
// Standalone → jump to the real WAREZONE web app login.
if (!redirectStandaloneMarketingToPwa()) {
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
