import { supabase } from './supabase';
import type { Room, Booking } from '../types/database.types';

// Rum API
export const roomsApi = {
  async getAll(): Promise<Room[]> {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('name');
      
      if (error) {
        throw new Error(`Kunde inte hämta rum: ${error.message}`);
      }
      
      return data || [];
    } catch (error) {
      console.error('Fel vid hämtning av rum:', error);
      throw new Error('Ett oväntat fel uppstod vid hämtning av rum');
    }
  },
  
  async getById(id: number): Promise<Room | null> {
    if (!id || id <= 0) {
      throw new Error('Ogiltigt rum-ID');
    }

    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error(`Inget rum hittades med ID ${id}`);
        }
        throw new Error(`Kunde inte hämta rum: ${error.message}`);
      }
      
      return data || null;
    } catch (error) {
      console.error(`Fel vid hämtning av rum med id ${id}:`, error);
      throw error;
    }
  }
};

// Bokningar API
export const bookingsApi = {
  async getAll(): Promise<Booking[]> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('date', { ascending: true });
      
      if (error) {
        throw new Error(`Kunde inte hämta bokningar: ${error.message}`);
      }
      
      return data || [];
    } catch (error) {
      console.error('Fel vid hämtning av bokningar:', error);
      throw new Error('Ett oväntat fel uppstod vid hämtning av bokningar');
    }
  },
  
  async getByDateRange(startDate: string, endDate: string): Promise<Booking[]> {
    if (!startDate || !endDate) {
      throw new Error('Start- och slutdatum måste anges');
    }

    if (startDate > endDate) {
      throw new Error('Startdatum kan inte vara efter slutdatum');
    }

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });
      
      if (error) {
        throw new Error(`Kunde inte hämta bokningar: ${error.message}`);
      }
      
      return data || [];
    } catch (error) {
      console.error(`Fel vid hämtning av bokningar mellan ${startDate} och ${endDate}:`, error);
      throw error;
    }
  },
  
  async getByDate(date: string): Promise<Booking[]> {
    if (!date) {
      throw new Error('Datum måste anges');
    }

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('date', date)
        .order('start_time', { ascending: true });
      
      if (error) {
        throw new Error(`Kunde inte hämta bokningar: ${error.message}`);
      }
      
      return data || [];
    } catch (error) {
      console.error(`Fel vid hämtning av bokningar för datum ${date}:`, error);
      throw error;
    }
  },
  
  async create(booking: Omit<Booking, 'id' | 'created_at'>): Promise<Booking> {
    if (!booking.room_id || !booking.date || !booking.start_time || !booking.end_time || !booking.booker) {
      throw new Error('Alla obligatoriska fält måste fyllas i');
    }

    if (booking.start_time >= booking.end_time) {
      throw new Error('Sluttiden måste vara efter starttiden');
    }

    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert([booking])
        .select()
        .single();
      
      if (error) {
        if (error.code === '23505') {
          throw new Error('Det finns redan en bokning för denna tid');
        }
        throw new Error(`Kunde inte skapa bokning: ${error.message}`);
      }
      
      return data;
    } catch (error) {
      console.error('Fel vid skapande av bokning:', error);
      throw error;
    }
  },
  
  async update(id: number, booking: Partial<Omit<Booking, 'id' | 'created_at'>>): Promise<Booking> {
    if (!id || id <= 0) {
      throw new Error('Ogiltigt boknings-ID');
    }

    if (booking.start_time && booking.end_time && booking.start_time >= booking.end_time) {
      throw new Error('Sluttiden måste vara efter starttiden');
    }

    try {
      const { data, error } = await supabase
        .from('bookings')
        .update(booking)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error(`Ingen bokning hittades med ID ${id}`);
        }
        if (error.code === '23505') {
          throw new Error('Det finns redan en bokning för denna tid');
        }
        throw new Error(`Kunde inte uppdatera bokning: ${error.message}`);
      }
      
      return data;
    } catch (error) {
      console.error(`Fel vid uppdatering av bokning med id ${id}:`, error);
      throw error;
    }
  },
  
  async delete(id: number): Promise<void> {
    if (!id || id <= 0) {
      throw new Error('Ogiltigt boknings-ID');
    }

    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id);
      
      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error(`Ingen bokning hittades med ID ${id}`);
        }
        throw new Error(`Kunde inte ta bort bokning: ${error.message}`);
      }
    } catch (error) {
      console.error(`Fel vid borttagning av bokning med id ${id}:`, error);
      throw error;
    }
  },
  
  // Kontrollera om en bokning överlappar med befintliga bokningar
  async checkOverlap(roomId: number, date: string, startTime: string, endTime: string, excludeId?: number): Promise<boolean> {
    if (!roomId || !date || !startTime || !endTime) {
      throw new Error('Alla obligatoriska fält måste fyllas i för överlappningskontroll');
    }

    if (startTime >= endTime) {
      throw new Error('Sluttiden måste vara efter starttiden');
    }

    return checkOverlap(roomId, date, startTime, endTime, excludeId);
  },

  // Hitta det största lediga rummet för akutbokning
  async findLargestAvailableRoom(date: string, startTime: string, endTime: string): Promise<Room | null> {
    if (!date || !startTime || !endTime) {
      throw new Error('Alla obligatoriska fält måste fyllas i för att hitta ledigt rum');
    }

    if (startTime >= endTime) {
      throw new Error('Sluttiden måste vara efter starttiden');
    }

    try {
      // 1. Hämta alla rum
      const { data: rooms, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .order('capacity', { ascending: false }); // Sorterar efter kapacitet, störst först
      
      if (roomsError) {
        throw new Error(`Kunde inte hämta rum: ${roomsError.message}`);
      }
      
      if (!rooms || rooms.length === 0) {
        return null;
      }
      
      // 2. Hämta alla bokningar för det angivna datumet
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('date', date);
      
      if (bookingsError) {
        throw new Error(`Kunde inte hämta bokningar: ${bookingsError.message}`);
      }
      
      // 3. Hitta lediga rum genom att filtrera bort rum med överlappande bokningar
      for (const room of rooms) {
        const hasOverlap = bookings?.some(booking => {
          // Endast kontrollera bokningar för detta rum
          if (booking.room_id !== room.id) {
            return false;
          }
          
          const requestedStart = startTime;
          const requestedEnd = endTime;
          const bookingStart = booking.start_time;
          const bookingEnd = booking.end_time;
          
          // Korrekt överlappningslogik: 
          // två tidsintervall överlappar om den ena startar innan den andra slutar
          // OCH den ena slutar efter att den andra startar
          return bookingStart < requestedEnd && bookingEnd > requestedStart;
        });
        
        if (!hasOverlap) {
          return room;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Fel vid sökning av ledigt rum:', error);
      throw error;
    }
  }
};

// Kontrollera om det finns överlappande bokningar för ett rum vid en viss tid
export const checkOverlap = async (
  roomId: number,
  date: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: number
): Promise<boolean> => {
  try {
    // Konstruera Supabase-fråga
    let query = supabase
      .from('bookings')
      .select('*')
      .eq('room_id', roomId)
      .eq('date', date)
      .lt('start_time', endTime)
      .gt('end_time', startTime);

    // Exkludera en specifik bokning om ID anges
    if (excludeBookingId) {
      query = query.neq('id', excludeBookingId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Kunde inte kontrollera överlappningar: ${error.message}`);
    }

    return data && data.length > 0;
  } catch (error) {
    console.error('Fel vid kontroll av överlappningar:', error);
    throw error;
  }
}; 