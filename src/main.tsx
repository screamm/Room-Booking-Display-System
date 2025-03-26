import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import reportWebVitals from './reportWebVitals';

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

// Aktivera prestandamätning
reportWebVitals((metric) => {
  // Logga alltid metrics till konsollen för debugging
  console.log(metric);
  
  // Endast skicka till backend i produktionsmiljö eller om vi har en miljövariabel som aktiverar det
  const isMetricsEnabled = import.meta.env.VITE_ENABLE_METRICS === 'true';
  const isProduction = import.meta.env.MODE === 'production';
  
  if (isProduction || isMetricsEnabled) {
    // Skicka till Supabase för lagring med förbättrad felhantering
    fetch('/api/metrics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: metric.name,
        value: metric.value,
        id: metric.id,
        delta: metric.delta,
        entries: metric.entries,
        timestamp: new Date().toISOString(),
      }),
    }).catch((error) => {
      // Tyst felhantering för att undvika konsolstörningar
      console.debug('Metrics API not available:', error);
    });
  }
}); 