import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dujhsevqigspbuckegnx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1amhzZXZxaWdzcGJ1Y2tlZ254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4MTk1MTYsImV4cCI6MjA1ODM5NTUxNn0.WXL3M2U3poyBr0cs5yKTYy6G9-FF4iKGtMBSxU-NwVk';

// För felsökning, logga ut anslutningsinformation
console.log(`Ansluter till Supabase med URL: ${supabaseUrl}`);
console.log('API-nyckel tillgänglig:', !!supabaseKey);

// Skapa Supabase-klienten med utökad loggning
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
  // Global error handling
  global: {
    fetch: (...args) => {
      console.log('Supabase fetch request:', args[0]);
      return fetch(...args).then(response => {
        if (!response.ok) {
          console.error('Supabase fetch failed:', {
            url: args[0], 
            status: response.status, 
            statusText: response.statusText
          });
        }
        return response;
      }).catch(error => {
        console.error('Supabase fetch error:', error);
        throw error;
      });
    },
  },
}); 