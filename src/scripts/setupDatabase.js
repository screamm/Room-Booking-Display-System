const { createClient } = require('@supabase/supabase-js');

// Hämta miljövariabler från .env-filen
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dujhsevqigspbuckegnx.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1amhzZXZxaWdzcGJ1Y2tlZ254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4MTk1MTYsImV4cCI6MjA1ODM5NTUxNn0.WXL3M2U3poyBr0cs5yKTYy6G9-FF4iKGtMBSxU-NwVk';

const supabase = createClient(supabaseUrl, supabaseKey);

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