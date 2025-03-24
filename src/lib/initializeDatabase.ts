import { supabase } from './supabase';

// Funktion för att skapa tabeller om de inte finns
export const initializeDatabase = async () => {
  console.log('Initialiserar databasen...');
  
  // Kontrollera om rumstabellen finns och skapa den om den inte gör det
  const { data: rooms, error: roomsError } = await supabase
    .from('rooms')
    .select('*')
    .limit(1);

  if (roomsError && roomsError.code === '42P01') { // Tabell finns inte
    console.log('Skapar rumstabellen...');
    await supabase.rpc('create_rooms_table');
  }

  // Kontrollera om bokningstabellen finns och skapa den om den inte gör det
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('*')
    .limit(1);

  if (bookingsError && bookingsError.code === '42P01') { // Tabell finns inte
    console.log('Skapar bokningstabellen...');
    await supabase.rpc('create_bookings_table');
  }

  // Om rumstabellen är tom, lägg till standardrum
  if (rooms && rooms.length === 0) {
    console.log('Lägger till standardrum...');
    
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
  }

  console.log('Databasinitieringen slutförd!');
};

// Skapa SQL-funktioner för att sätta upp tabellerna
export const setupDatabaseFunctions = async () => {
  // Skapa funktion för att skapa rumstabellen
  await supabase.rpc('create_create_rooms_table_function', {});
  
  // Skapa funktion för att skapa bokningstabellen
  await supabase.rpc('create_create_bookings_table_function', {});
};

// Denna funktion kan du köra en gång för att skapa de nödvändiga SQL-funktionerna
export const createSetupFunctions = async () => {
  // Skapa funktion för att skapa "create_rooms_table" funktion
  const createRoomsTableFunctionSql = `
  CREATE OR REPLACE FUNCTION create_create_rooms_table_function()
  RETURNS void AS $$
  BEGIN
    EXECUTE '
    CREATE OR REPLACE FUNCTION create_rooms_table()
    RETURNS void AS $func$
    BEGIN
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        capacity INTEGER NOT NULL,
        features TEXT[] NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    END;
    $func$ LANGUAGE plpgsql;';
  END;
  $$ LANGUAGE plpgsql;
  `;
  
  // Skapa funktion för att skapa "create_bookings_table" funktion
  const createBookingsTableFunctionSql = `
  CREATE OR REPLACE FUNCTION create_create_bookings_table_function()
  RETURNS void AS $$
  BEGIN
    EXECUTE '
    CREATE OR REPLACE FUNCTION create_bookings_table()
    RETURNS void AS $func$
    BEGIN
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
    END;
    $func$ LANGUAGE plpgsql;';
  END;
  $$ LANGUAGE plpgsql;
  `;

  // Kör SQL för att skapa funktionerna i databasen
  await supabase.rpc('run_sql', { sql: createRoomsTableFunctionSql });
  await supabase.rpc('run_sql', { sql: createBookingsTableFunctionSql });
}; 