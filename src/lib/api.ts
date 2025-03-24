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
  }
}; 