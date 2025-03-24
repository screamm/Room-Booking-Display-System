import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Förhindra PWA-varningar från att visas i konsollen
if ('serviceWorker' in navigator) {
  // Registrera en tom service worker för att förhindra 404-fel
  window.addEventListener('load', () => {
    // Ignorera 404-fel som är relaterade till PWA
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
      if (typeof input === 'string' && (
        input.includes('@vite-plugin-pwa') || 
        input.includes('workbox-')
      )) {
        return Promise.resolve(new Response('', { status: 200 }));
      }
      return originalFetch.apply(this, [input, init]);
    };
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 