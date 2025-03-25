import { supabase } from './supabase';
import { googleCalendarService } from './googleCalendar';
import type { Booking } from '../types/database.types';

export const googleCalendarApi = {
  // Synka bokningar till Google Kalender
  async syncToGoogleCalendar(bookings: Booking[]) {
    try {
      // Uppdatera synkroniseringsstatus
      await supabase.rpc('update_sync_status', {
        p_sync_type: 'to_google',
        p_status: 'in_progress'
      });

      const results = await Promise.allSettled(
        bookings.map(async (booking) => {
          if (!booking.google_calendar_id) {
            // Skapa ny händelse i Google Kalender
            const event = {
              summary: `Konferensrum: ${booking.room_id}`,
              description: booking.purpose || 'Ingen beskrivning',
              start: {
                dateTime: `${booking.date}T${booking.start_time}`,
                timeZone: 'Europe/Stockholm'
              },
              end: {
                dateTime: `${booking.date}T${booking.end_time}`,
                timeZone: 'Europe/Stockholm'
              }
            };

            const googleEvent = await googleCalendarService.createEvent(event);

            // Uppdatera bokningen med Google Kalender-ID
            await supabase
              .from('bookings')
              .update({
                google_calendar_id: googleEvent.id,
                last_synced: new Date().toISOString(),
                sync_status: 'synced'
              })
              .eq('id', booking.id);

            return { bookingId: booking.id, status: 'success' };
          }
          return { bookingId: booking.id, status: 'already_synced' };
        })
      );

      // Uppdatera synkroniseringsstatus
      await supabase.rpc('update_sync_status', {
        p_sync_type: 'to_google',
        p_status: 'success'
      });

      return results;
    } catch (error) {
      console.error('Fel vid synkronisering till Google Kalender:', error);
      await supabase.rpc('update_sync_status', {
        p_sync_type: 'to_google',
        p_status: 'error',
        p_error_message: error instanceof Error ? error.message : 'Okänt fel'
      });
      throw error;
    }
  },

  // Synka bokningar från Google Kalender
  async syncFromGoogleCalendar() {
    try {
      // Uppdatera synkroniseringsstatus
      await supabase.rpc('update_sync_status', {
        p_sync_type: 'from_google',
        p_status: 'in_progress'
      });

      // Hämta händelser från Google Kalender för de närmaste 30 dagarna
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const events = await googleCalendarService.getEvents(
        now.toISOString(),
        thirtyDaysFromNow.toISOString()
      );

      // Konvertera Google Kalender-händelser till bokningar
      const bookings = events.map(event => ({
        room_id: parseInt(event.summary?.split(': ')[1] || '0'),
        date: event.start?.dateTime?.split('T')[0] || '',
        start_time: event.start?.dateTime?.split('T')[1].substring(0, 5) || '',
        end_time: event.end?.dateTime?.split('T')[1].substring(0, 5) || '',
        booker: event.organizer?.email || 'Unknown',
        purpose: event.description || '',
        google_calendar_id: event.id,
        last_synced: new Date().toISOString(),
        sync_status: 'synced'
      }));

      // Uppdatera eller skapa bokningar i databasen
      const results = await Promise.allSettled(
        bookings.map(async (booking) => {
          const { data: existingBooking } = await supabase
            .from('bookings')
            .select('*')
            .eq('google_calendar_id', booking.google_calendar_id)
            .single();

          if (existingBooking) {
            // Uppdatera befintlig bokning
            await supabase
              .from('bookings')
              .update(booking)
              .eq('id', existingBooking.id);
            return { bookingId: existingBooking.id, status: 'updated' };
          } else {
            // Skapa ny bokning
            const { data: newBooking } = await supabase
              .from('bookings')
              .insert([booking])
              .select()
              .single();
            return { bookingId: newBooking?.id, status: 'created' };
          }
        })
      );

      // Uppdatera synkroniseringsstatus
      await supabase.rpc('update_sync_status', {
        p_sync_type: 'from_google',
        p_status: 'success'
      });

      return results;
    } catch (error) {
      console.error('Fel vid synkronisering från Google Kalender:', error);
      await supabase.rpc('update_sync_status', {
        p_sync_type: 'from_google',
        p_status: 'error',
        p_error_message: error instanceof Error ? error.message : 'Okänt fel'
      });
      throw error;
    }
  },

  // Hämta synkroniseringsstatus
  async getSyncStatus() {
    const { data, error } = await supabase
      .from('sync_status')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(2);

    if (error) {
      console.error('Fel vid hämtning av synkroniseringsstatus:', error);
      throw error;
    }

    return data;
  }
}; 