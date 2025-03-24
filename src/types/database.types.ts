export interface Room {
  id: number;
  name: string;
  capacity: number;
  features: string[];
  created_at?: string;
}

export interface Booking {
  id: number;
  room_id: number;
  date: string;
  start_time: string;
  end_time: string;
  booker: string;
  purpose?: string;
  created_at?: string;
}

export type Database = {
  public: {
    Tables: {
      rooms: {
        Row: Room;
        Insert: Omit<Room, 'id' | 'created_at'>;
        Update: Partial<Omit<Room, 'id' | 'created_at'>>;
      };
      bookings: {
        Row: Booking;
        Insert: Omit<Booking, 'id' | 'created_at'>;
        Update: Partial<Omit<Booking, 'id' | 'created_at'>>;
      };
    };
  };
}; 