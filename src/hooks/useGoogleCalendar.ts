import { useState, useCallback } from 'react';
import { google } from '../mocks/googleapis';
import { BookingType, Booking } from '../types/database.types';

// Interface för Google Calendar-event
interface CalendarEvent {
  id?: string;
  summary?: string;
  description?: string;
  start?: {
    dateTime?: string;
    date?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
  };
}

export const useGoogleCalendar = () => {
  const [isSynced, setIsSynced] = useState(false);

  const fetchBookings = useCallback(async (roomId: number): Promise<Booking[]> => {
    try {
      // Eftersom detta är en mock som alltid kommer att kasta ett fel,
      // loggar vi en varning och returnerar en tom array
      console.warn('Google Calendar integration är inte tillgänglig i denna version');
      
      // Returnera en tom array
      return [];
    } catch (error) {
      console.error('Fel vid hämtning av Google Calendar-bokningar:', error);
      setIsSynced(false);
      return [];
    }
  }, []);

  return {
    fetchBookings,
    isSynced,
  };
}; 