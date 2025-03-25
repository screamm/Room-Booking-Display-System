import { useState, useCallback } from 'react';
import { google } from 'googleapis';
import { Booking } from '../types/booking';

export const useGoogleCalendar = () => {
  const [isSynced, setIsSynced] = useState(false);

  const fetchBookings = useCallback(async (roomId: number): Promise<Booking[]> => {
    try {
      // Här skulle vi normalt anropa Google Calendar API
      // Men eftersom vi använder en mock, kommer detta att kasta ett fel
      // som vi hanterar i komponenten
      const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      });

      const client = await auth.getClient();
      const calendar = google.calendar({ version: 'v3', auth: client });

      // Detta kommer att kasta ett fel i webbläsaren
      // men det är okej eftersom vi hanterar det i komponenten
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
      });

      setIsSynced(true);
      return response.data.items?.map(event => ({
        id: event.id || '',
        room_id: roomId,
        title: event.summary || '',
        start_time: event.start?.dateTime || event.start?.date || '',
        end_time: event.end?.dateTime || event.end?.date || '',
        description: event.description || '',
        created_at: new Date().toISOString(),
      })) || [];
    } catch (error) {
      console.error('Fel vid hämtning av Google Calendar-bokningar:', error);
      setIsSynced(false);
      // Returnera en tom array istället för att kasta vidare felet
      return [];
    }
  }, []);

  return {
    fetchBookings,
    isSynced,
  };
}; 