import { supabase } from './supabase';

// Definiera alla rum som ska finnas i systemet
const DEFAULT_ROOMS = [
  { name: 'Stora', capacity: 20, features: ['Monitor', 'Whiteboard'] },
  { name: 'Mellan', capacity: 8, features: ['Videokonferens', 'Whiteboard'] },
  { name: 'Lilla', capacity: 5, features: ['Videokonferens', 'Whiteboard'] },
  { name: 'Båset', capacity: 2, features: ['Videokonferens'] },
];

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

  // Hämta alla befintliga rum
  const { data: existingRooms, error: fetchError } = await supabase
    .from('rooms')
    .select('*');

  if (fetchError) {
    console.error('Fel vid hämtning av rum:', fetchError);
    return;
  }

  // Skapa en map av befintliga rum för snabb lookup
  const existingRoomMap = new Map(
    existingRooms?.map(room => [room.name, room]) || []
  );

  // Kontrollera vilka rum som saknas och lägg till dem
  for (const defaultRoom of DEFAULT_ROOMS) {
    if (!existingRoomMap.has(defaultRoom.name)) {
      console.log(`Lägger till nytt rum: ${defaultRoom.name}`);
      const { error: insertError } = await supabase
        .from('rooms')
        .insert([defaultRoom]);
      
      if (insertError) {
        console.error(`Fel vid inläggning av rum ${defaultRoom.name}:`, insertError);
      } else {
        console.log(`Rum "${defaultRoom.name}" tillagt!`);
      }
    } else {
      // Uppdatera befintligt rum om det har ändrats
      const existingRoom = existingRoomMap.get(defaultRoom.name)!;
      if (
        existingRoom.capacity !== defaultRoom.capacity ||
        JSON.stringify(existingRoom.features) !== JSON.stringify(defaultRoom.features)
      ) {
        console.log(`Uppdaterar rum: ${defaultRoom.name}`);
        const { error: updateError } = await supabase
          .from('rooms')
          .update(defaultRoom)
          .eq('id', existingRoom.id);
        
        if (updateError) {
          console.error(`Fel vid uppdatering av rum ${defaultRoom.name}:`, updateError);
        } else {
          console.log(`Rum "${defaultRoom.name}" uppdaterat!`);
        }
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