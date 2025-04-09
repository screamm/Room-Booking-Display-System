/// <reference types="deno" />

// @ts-ignore: Ignorera URL-importfel
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore: Ignorera URL-importfel
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @ts-ignore: Ignorera URL-importfel
import { google } from 'https://esm.sh/googleapis@126.0.1'
// @ts-ignore: Ignorera URL-importfel
import { OAuth2Client } from 'https://esm.sh/google-auth-library@9.0.0'

// Konfiguration för Google OAuth
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') || ''
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') || ''
const REDIRECT_URI = Deno.env.get('GOOGLE_REDIRECT_URI') || ''

// Skapa OAuth2-klient
const oauth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

// Skapa Google Calendar API-klient
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// Typdefinition för bokningen
interface Booking {
  id: number;
  room_id: number;
  date: string;
  start_time: string;
  end_time: string;
  purpose?: string;
  google_calendar_id?: string;
  last_synced?: string;
  sync_status?: string;
}

// Typdefinition för resultatet
interface SyncResult {
  bookingId: number;
  status: 'success' | 'error';
  error?: string;
}

// Typdefinition för Promise.allSettled-resultatet
interface SettledResult<T> {
  status: 'fulfilled' | 'rejected';
  value?: T;
  reason?: any;
}

serve(async (req: Request) => {
  try {
    // Skapa Supabase-klient
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Hämta alla bokningar som inte är synkade med Google Kalender
    const { data: bookings, error: bookingsError } = await supabaseClient
      .from('bookings')
      .select('*')
      .is('google_calendar_id', null)

    if (bookingsError) throw bookingsError

    if (!bookings || bookings.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Inga nya bokningar att synka' }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Synka varje bokning till Google Kalender
    const results = await Promise.allSettled(
      bookings.map(async (booking: Booking) => {
        try {
          // Skapa händelse i Google Kalender
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
          }

          const googleEvent = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
          })

          // Uppdatera bokningen med Google Kalender-ID
          const { error: updateError } = await supabaseClient
            .from('bookings')
            .update({
              google_calendar_id: googleEvent.data.id,
              last_synced: new Date().toISOString(),
              sync_status: 'synced'
            })
            .eq('id', booking.id)

          if (updateError) throw updateError

          return { bookingId: booking.id, status: 'success' } as SyncResult
        } catch (error: unknown) {
          console.error(`Fel vid synkronisering av bokning ${booking.id}:`, error)
          return { 
            bookingId: booking.id, 
            status: 'error', 
            error: error instanceof Error ? error.message : String(error) 
          } as SyncResult
        }
      })
    )

    // Uppdatera synkroniseringsstatus
    await supabaseClient.rpc('update_sync_status', {
      p_sync_type: 'to_google',
      p_status: 'success'
    })

    return new Response(
      JSON.stringify({
        message: 'Synkronisering slutförd',
        results: results.map((r: SettledResult<SyncResult>) => 
          r.status === 'fulfilled' ? r.value : { status: 'rejected', error: r.reason }
        )
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Fel vid synkronisering:', error)
    
    // Uppdatera synkroniseringsstatus med fel
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    await supabaseClient.rpc('update_sync_status', {
      p_sync_type: 'to_google',
      p_status: 'error',
      p_error_message: error instanceof Error ? error.message : String(error)
    })

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}) 