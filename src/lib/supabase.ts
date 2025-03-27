import { createClient } from '@supabase/supabase-js';

// Använd miljövariabler istället för hårdkodade värden
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dujhsevqigspbuckegnx.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1amhzZXZxaWdzcGJ1Y2tlZ254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4MTk1MTYsImV4cCI6MjA1ODM5NTUxNn0.WXL3M2U3poyBr0cs5yKTYy6G9-FF4iKGtMBSxU-NwVk';

// För felsökning, logga ut anslutningsinformation
console.log(`Ansluter till Supabase med URL: ${supabaseUrl}`);
console.log('API-nyckel tillgänglig:', !!supabaseKey);

// Skapa Supabase-klienten med rätt headers
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
  // Global error handling
  global: {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Client-Info': 'supabase-js/2.0.0'
    },
    fetch: (...args) => {
      const url = args[0] as string;
      const method = args[1]?.method || 'GET';
      const body = args[1]?.body;
      
      console.log('Supabase request:', {
        url,
        method,
        body: body ? JSON.parse(body as string) : undefined,
        headers: args[1]?.headers
      });
      
      return fetch(...args).then(async response => {
        const responseData = await response.clone().text().catch(() => '');
        
        if (!response.ok) {
          console.error('Supabase fetch failed:', {
            url, 
            method,
            status: response.status, 
            statusText: response.statusText,
            responseBody: responseData
          });
        } else {
          console.log('Supabase fetch succeeded:', {
            url,
            method,
            status: response.status
          });
        }
        return response;
      }).catch(error => {
        console.error('Supabase fetch error:', {
          url,
          method,
          error: error.message,
          stack: error.stack
        });
        throw error;
      });
    },
  },
}); 