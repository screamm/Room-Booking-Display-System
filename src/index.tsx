import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Aktivera prestandamätning
reportWebVitals((metric) => {
  // Skicka metrics till analytics-tjänst
  console.log(metric);
  
  // Skicka till Supabase för lagring
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
      navigationType: metric.navigationType,
      timestamp: new Date().toISOString(),
    }),
  }).catch(console.error);
});
