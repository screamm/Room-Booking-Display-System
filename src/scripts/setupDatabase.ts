import { supabase } from '../lib/supabase';

async function setupDatabase() {
  console.log('Skapar tabeller i Supabase...');
  
  try {
    // Skapa rumstabellen
    await supabase.rpc('run_sql', { 
      sql: `
        CREATE TABLE IF NOT EXISTS rooms (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          capacity INTEGER NOT NULL,
          features TEXT[] NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `
    });
    console.log('Rumstabellen skapad!');
    
    // Skapa bokningstabellen
    await supabase.rpc('run_sql', { 
      sql: `
        CREATE TABLE IF NOT EXISTS bookings (
          id SERIAL PRIMARY KEY,
          room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
          date DATE NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          booker TEXT NOT NULL,
          purpose TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT time_check CHECK (start_time < end_time)
        );
        
        CREATE INDEX IF NOT EXISTS bookings_room_date_idx ON bookings(room_id, date);
      `
    });
    console.log('Bokningstabellen skapad!');
    
    // Kontrollera om rumstabellen är tom
    const { data: rooms } = await supabase
      .from('rooms')
      .select('*');
      
    if (!rooms || rooms.length === 0) {
      // Lägga till standardrum
      const defaultRooms = [
        { name: 'Stora', capacity: 20, features: ['Monitor', 'Whiteboard'] },
        { name: 'Mellan', capacity: 8, features: ['Videokonferens', 'Whiteboard'] },
        { name: 'Lilla', capacity: 5, features: ['Videokonferens', 'Whiteboard'] },
        { name: 'Båset', capacity: 2, features: ['Videokonferens'] },
      ];
      
      for (const room of defaultRooms) {
        const { error } = await supabase
          .from('rooms')
          .insert([room]);
          
        if (error) {
          console.error('Fel vid inläggning av rum:', error);
        }
      }
      console.log('Standardrum tillagda!');
    }
    
    console.log('Databasuppsättningen är klar!');
  } catch (error) {
    console.error('Fel vid uppsättning av databasen:', error);
  }
}

// Kör skriptet
setupDatabase(); 