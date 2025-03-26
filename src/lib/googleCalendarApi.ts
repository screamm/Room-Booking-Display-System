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

  // Hämta synkroniseringsstatus
  getSyncStatus: async () => {
    try {
      const { data, error } = await supabase
        .from('sync_status')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.log('Kunde inte hämta sync_status:', error.message);
        // Om tabellen inte finns eller annat fel, returnera ett standardsvar
        return {
          status: 'not_configured',
          last_sync: new Date().toISOString(),
          error_message: 'Google Calendar-synkronisering är inte konfigurerad'
        };
      }

      return data;
    } catch (error) {
      console.error('Fel vid hämtning av synkroniseringsstatus:', error);
      return {
        status: 'error',
        last_sync: new Date().toISOString(),
        error_message: 'Kunde inte hämta synkroniseringsstatus'
      };
    }
  }
}; 