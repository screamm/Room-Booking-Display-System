import { supabase } from './supabase';
import type { Room, Booking } from '../types/database.types';

// Custom error klass för överlappande bokningar
export class OverlapError extends Error {
  constructor(message: string = 'Bokningen överlappar med en befintlig bokning') {
    super(message);
    this.name = 'OverlapError';
  }
}

// Hjälpfunktion för att formatera tid för jämförelse
export function formatTimeForComparison(timeString: string): number {
  // Omvandla tid från format "HH:MM" till minuter sedan midnatt
  try {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  } catch (error) {
    console.error(`Ogiltigt tidsformat: ${timeString}`, error);
    return 0;
  }
}

// Hjälpfunktion för loggning
const logError = (message: string, error: any) => {
  console.error(`API ERROR: ${message}`, error);
  if (error.response) {
    console.error('Response data:', error.response.data);
    console.error('Response status:', error.response.status);
  }
};

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
      logError('Fel vid hämtning av rum:', error);
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
      logError(`Fel vid hämtning av rum med id ${id}:`, error);
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
      logError('Fel vid hämtning av bokningar:', error);
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
      logError(`Fel vid hämtning av bokningar mellan ${startDate} och ${endDate}:`, error);
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
      logError(`Fel vid hämtning av bokningar för datum ${date}:`, error);
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
      logError('Fel vid skapande av bokning:', error);
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
      logError(`Fel vid uppdatering av bokning med id ${id}:`, error);
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
      logError(`Fel vid borttagning av bokning med id ${id}:`, error);
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
    console.log('%c SÖKER STÖRSTA LEDIGA RUM ', 'background: #0066cc; color: white; font-weight: bold;');
    console.log('Parametrar:', { date, startTime, endTime });
    
    try {
      // Validera indata
      if (!date || !startTime || !endTime) {
        console.error('Ogiltiga parametrar - datum eller tid saknas');
        throw new Error('Datum eller tid saknas för rumsökning');
      }
      
      // Formatera tider för korrekt jämförelse
      const formattedStartTime = formatTimeForComparison(startTime);
      const formattedEndTime = formatTimeForComparison(endTime);
      
      // Validera att starttid är före sluttid
      if (formattedStartTime >= formattedEndTime) {
        console.error('Ogiltig tidsperiod - starttid måste vara före sluttid');
        throw new Error('Starttid måste vara före sluttid');
      }
      
      // Hämta alla rum
      const roomsResponse = await supabase.from('rooms').select('*');
      
      if (roomsResponse.error) {
        console.error('Fel vid hämtning av rum:', roomsResponse.error);
        throw new Error(`Kunde inte hämta rum: ${roomsResponse.error.message}`);
      }
      
      const rooms = roomsResponse.data;
      console.log(`Hittade ${rooms.length} rum totalt`);
      
      // Hämta bokningar för det valda datumet
      const bookingsResponse = await supabase
        .from('bookings')
        .select('*')
        .eq('date', date);
      
      if (bookingsResponse.error) {
        console.error('Fel vid hämtning av bokningar:', bookingsResponse.error);
        throw new Error(`Kunde inte hämta bokningar: ${bookingsResponse.error.message}`);
      }
      
      const bookings = bookingsResponse.data;
      console.log(`Hittade ${bookings.length} bokningar för datum ${date}`);
      
      // Sök efter lediga rum
      console.log('Söker efter lediga rum...');
      
      // För att bättre diagnostisera problem, samla rummen med överlapp
      const roomsWithOverlap: string[] = [];
      
      const availableRooms = rooms.filter(room => {
        // Hitta bokningar för detta rum
        const roomBookings = bookings.filter(booking => booking.room_id === room.id);
        
        // Kontrollera om det finns överlappande bokningar
        const hasOverlap = roomBookings.some(booking => {
          const bookingStartTime = formatTimeForComparison(booking.start_time);
          const bookingEndTime = formatTimeForComparison(booking.end_time);
          
          // Kontrollera överlappning
          const overlap = (
            (formattedStartTime < bookingEndTime && formattedEndTime > bookingStartTime) ||
            (bookingStartTime < formattedEndTime && bookingEndTime > formattedStartTime)
          );
          
          if (overlap) {
            console.log(`Rum ${room.name} har överlappande bokning ${booking.start_time}-${booking.end_time}`);
            roomsWithOverlap.push(`${room.name} (${booking.start_time}-${booking.end_time})`);
          }
          
          return overlap;
        });
        
        return !hasOverlap;
      });
      
      console.log(`Hittade ${availableRooms.length} lediga rum av ${rooms.length} totalt`);
      
      if (availableRooms.length === 0) {
        console.log('Inga lediga rum hittades');
        
        if (roomsWithOverlap.length > 0) {
          console.log('Rum med överlappande bokningar:', roomsWithOverlap);
          throw new OverlapError(`Alla rum är upptagna för tiden ${startTime}-${endTime}`);
        }
        
        return null;
      }
      
      // Sortera rum efter kapacitet (största först)
      const sortedRooms = [...availableRooms].sort((a, b) => b.capacity - a.capacity);
      
      // Returnera det största rummet
      const largestRoom = sortedRooms[0];
      console.log(`Största lediga rum: ${largestRoom.name} (kapacitet: ${largestRoom.capacity})`);
      
      return largestRoom;
    } catch (error) {
      console.error('%c FEL VID SÖKNING AV RUM ', 'background: #c10000; color: white; font-weight: bold;');
      console.error('Error in findLargestAvailableRoom:', error);
      
      // Rethrow OverlapError för att kunna hantera det särskilt i UI
      if (error instanceof OverlapError) {
        throw error;
      }
      
      // För andra fel, kasta ett generiskt fel
      throw new Error(`Kunde inte hitta ledigt rum: ${error instanceof Error ? error.message : 'Okänt fel'}`);
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
    logError('Fel vid kontroll av överlappningar:', error);
    throw error;
  }
}; 