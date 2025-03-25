import { supabase } from './supabase';
import type { Room, Booking } from '../types/database.types';

// Rum API
export const roomsApi = {
  async getAll(): Promise<Room[]> {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Fel vid hämtning av rum:', error);
      throw error;
    }
    
    return data || [];
  },
  
  async getById(id: number): Promise<Room | null> {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Fel vid hämtning av rum med id ${id}:`, error);
      throw error;
    }
    
    return data || null;
  }
};

// Bokningar API
export const bookingsApi = {
  async getAll(): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('date', { ascending: true });
    
    if (error) {
      console.error('Fel vid hämtning av bokningar:', error);
      throw error;
    }
    
    return data || [];
  },
  
  async getByDateRange(startDate: string, endDate: string): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });
    
    if (error) {
      console.error(`Fel vid hämtning av bokningar mellan ${startDate} och ${endDate}:`, error);
      throw error;
    }
    
    return data || [];
  },
  
  async getByDate(date: string): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('date', date)
      .order('start_time', { ascending: true });
    
    if (error) {
      console.error(`Fel vid hämtning av bokningar för datum ${date}:`, error);
      throw error;
    }
    
    return data || [];
  },
  
  async create(booking: Omit<Booking, 'id' | 'created_at'>): Promise<Booking> {
    const { data, error } = await supabase
      .from('bookings')
      .insert([booking])
      .select()
      .single();
    
    if (error) {
      console.error('Fel vid skapande av bokning:', error);
      throw error;
    }
    
    return data;
  },
  
  async update(id: number, booking: Partial<Omit<Booking, 'id' | 'created_at'>>): Promise<Booking> {
    const { data, error } = await supabase
      .from('bookings')
      .update(booking)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Fel vid uppdatering av bokning med id ${id}:`, error);
      throw error;
    }
    
    return data;
  },
  
  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Fel vid borttagning av bokning med id ${id}:`, error);
      throw error;
    }
  },
  
  // Kontrollera om en bokning överlappar med befintliga bokningar
  async checkOverlap(roomId: number, date: string, startTime: string, endTime: string, excludeId?: number): Promise<boolean> {
    let query = supabase
      .from('bookings')
      .select('*')
      .eq('room_id', roomId)
      .eq('date', date)
      .or(`start_time.gte.${startTime},and(start_time.lt.${endTime})`)
      .or(`end_time.gt.${startTime},and(end_time.lte.${endTime})`)
      .or(`start_time.lte.${startTime},and(end_time.gte.${endTime})`);
    
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Fel vid kontroll av överlappning:', error);
      throw error;
    }
    
    return data && data.length > 0;
  },

  // Hitta det största lediga rummet för akutbokning
  async findLargestAvailableRoom(date: string, startTime: string, endTime: string): Promise<Room | null> {
    try {
      // 1. Hämta alla rum
      const { data: rooms, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .order('capacity', { ascending: false }); // Sorterar efter kapacitet, störst först
      
      if (roomsError) {
        console.error('Fel vid hämtning av rum:', roomsError);
        throw roomsError;
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
        console.error(`Fel vid hämtning av bokningar för datum ${date}:`, bookingsError);
        throw bookingsError;
      }
      
      // 3. Hitta lediga rum genom att filtrera bort rum med överlappande bokningar
      for (const room of rooms) {
        const hasOverlap = bookings?.some(booking => 
          booking.room_id === room.id && 
          (
            (booking.start_time <= startTime && booking.end_time > startTime) ||
            (booking.start_time < endTime && booking.end_time >= endTime) ||
            (booking.start_time >= startTime && booking.end_time <= endTime)
          )
        );
        
        if (!hasOverlap) {
          // Returnera det första (största) lediga rummet
          return room;
        }
      }
      
      // Inget ledigt rum hittades
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
  // Konstruera Supabase-fråga
  let query = supabase
    .from('bookings')
    .select('*')
    .eq('room_id', roomId)
    .eq('date', date)
    .or(`start_time.lt.${endTime},end_time.gt.${startTime}`);

  // Exkludera aktuell bokning vid redigering
  if (excludeBookingId) {
    query = query.neq('id', excludeBookingId);
  }

  // Utför frågan
  const { data, error } = await query;

  if (error) {
    console.error('Fel vid kontroll av överlappande bokningar:', error);
    throw error;
  }

  // Om vi har data, finns det överlapp
  return data && data.length > 0;
}; 