import { supabase } from './supabase';

// Mock för Google Calendar API-integration
// Faktisk integration kommer att implementeras i framtida version

export const googleCalendarApi = {
  // Returnerar en URL som skulle användas för OAuth i en faktisk implementation
  getAuthUrl: () => {
    console.log('getAuthUrl anropad - skulle returnera faktisk URL i produktion');
    return 'https://example.com/mock-auth-url';
  },

  // Simulerar hantering av OAuth-callback
  handleCallback: async (code: string) => {
    console.log('handleCallback anropad med kod:', code);
    return {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expiry_date: Date.now() + 3600000
    };
  },

  // Returnerar tomma händelser istället för att försöka hämta från Google
  getEvents: async (timeMin: string, timeMax: string) => {
    console.log(`getEvents anropad för tidsperiod: ${timeMin} till ${timeMax}`);
    return [];  // Tom array av händelser
  },

  // Simulerar skapande av en händelse
  createEvent: async (event: {
    summary: string;
    description?: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
  }) => {
    console.log('createEvent anropad med:', event);
    return {
      id: 'mock-event-id-' + Math.random().toString(36).substring(2, 9),
      htmlLink: 'https://calendar.google.com/mock-event',
      ...event
    };
  },

  // Simulerar borttagning av en händelse
  deleteEvent: async (eventId: string) => {
    console.log('deleteEvent anropad för eventId:', eventId);
    return true;
  },

  // Skapa sync_status-tabellen om den inte finns
  createSyncStatusTable: async () => {
    try {
      console.info('Försöker skapa sync_status-tabellen...');
      
      // Försök med direkt DB-anrop via Storage Bucket-metoden som inte kräver privilegier
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.sync_status (
            id SERIAL PRIMARY KEY,
            status TEXT NOT NULL DEFAULT 'not_configured',
            last_sync TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            error_message TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `
      });
      
      if (error) {
        // Om RPC inte finns, logga felet
        console.warn('Kunde inte skapa tabellen via SQL exekvering:', error.message);
        
        // Fallback-plan: säg till användaren att skapa tabellen manuellt
        console.info('För att manuellt skapa tabellen, kör följande SQL i Supabase SQL Editor:');
        console.info(`
          CREATE TABLE IF NOT EXISTS public.sync_status (
            id SERIAL PRIMARY KEY,
            status TEXT NOT NULL DEFAULT 'not_configured',
            last_sync TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            error_message TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
          
          -- Skapa row level security för tabellen
          ALTER TABLE public.sync_status ENABLE ROW LEVEL SECURITY;
          
          -- Skapa policys för RLS
          CREATE POLICY "Alla kan läsa sync_status" ON public.sync_status 
            FOR SELECT USING (true);
            
          CREATE POLICY "Alla kan skapa sync_status" ON public.sync_status
            FOR INSERT WITH CHECK (true);
        `);
        
        return false;
      }
      
      console.info('sync_status-tabellen har skapats eller fanns redan');
      return true;
    } catch (error) {
      console.error('Fel vid försök att skapa sync_status-tabellen:', error);
      
      // Visa instruktioner även vid oväntat fel
      console.info('För att manuellt skapa tabellen, kör följande SQL i Supabase SQL Editor:');
      console.info(`
        CREATE TABLE IF NOT EXISTS public.sync_status (
          id SERIAL PRIMARY KEY,
          status TEXT NOT NULL DEFAULT 'not_configured',
          last_sync TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          error_message TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      return false;
    }
  },

  // Hämta synkroniseringsstatus
  getSyncStatus: async () => {
    try {
      // Använd inte single() eftersom det kastar ett fel om tabellen är tom
      const { data, error } = await supabase
        .from('sync_status')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.warn('Kunde inte hämta sync_status:', error.message);
        
        // Kontrollera om felet beror på att tabellen inte existerar
        if (error.message.includes('does not exist')) {
          console.info('sync_status-tabellen finns inte. Försöker skapa den automatiskt...');
          
          try {
            // Skapa tabellen
            const tableCreated = await googleCalendarApi.createSyncStatusTable();
            
            if (tableCreated) {
              console.info('sync_status-tabellen skapades. Skapar första statusposten...');
              await googleCalendarApi.createInitialSyncStatus();
            }
          } catch (createError) {
            console.error('Fel vid skapande av tabellen:', createError);
          }
        }
        
        // Returnera standardsvar oavsett om vi lyckades skapa tabellen eller inte
        return {
          status: 'not_configured',
          last_sync: new Date().toISOString(),
          error_message: 'Google Calendar-synkronisering är inte konfigurerad'
        };
      }

      // Om vi kommer hit finns tabellen men den kan vara tom
      if (!data || data.length === 0) {
        console.info('sync_status-tabellen är tom. Skapar första statusposten...');
        
        try {
          await googleCalendarApi.createInitialSyncStatus();
          
          // Prova att hämta den nya posten
          const { data: newData, error: newError } = await supabase
            .from('sync_status')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (newError || !newData || newData.length === 0) {
            // Om vi fortfarande inte har data, returnera standardsvar
            return {
              status: 'not_configured',
              last_sync: new Date().toISOString(),
              error_message: 'Google Calendar-synkronisering är inte konfigurerad'
            };
          }
          
          return newData[0];
        } catch (insertError) {
          console.warn('Kunde inte skapa initial statuspost:', insertError);
          return {
            status: 'not_configured',
            last_sync: new Date().toISOString(),
            error_message: 'Google Calendar-synkronisering är inte konfigurerad'
          };
        }
      }

      // Returnera första (senaste) raden från resultatet
      return data[0];
    } catch (error) {
      console.error('Fel vid hämtning av synkroniseringsstatus:', error);
      return {
        status: 'error',
        last_sync: new Date().toISOString(),
        error_message: 'Kunde inte hämta synkroniseringsstatus'
      };
    }
  },
  
  // Skapa initial statuspost
  createInitialSyncStatus: async () => {
    try {
      const { error: insertError } = await supabase
        .from('sync_status')
        .insert({
          status: 'not_configured',
          error_message: 'Ej konfigurerad'
        });
        
      if (insertError) {
        console.warn('Kunde inte skapa initial statuspost:', insertError.message);
        return false;
      } else {
        console.info('Initial statuspost skapad i sync_status-tabellen');
        return true;
      }
    } catch (error) {
      console.error('Fel vid skapande av initial statuspost:', error);
      return false;
    }
  }
}; 