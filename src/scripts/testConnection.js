const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dujhsevqigspbuckegnx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1amhzZXZxaWdzcGJ1Y2tlZ254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4MTk1MTYsImV4cCI6MjA1ODM5NTUxNn0.WXL3M2U3poyBr0cs5yKTYy6G9-FF4iKGtMBSxU-NwVk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('------------- Supabase Anslutningstest -------------');
  console.log(`URL: ${supabaseUrl}`);
  console.log(`API-nyckel tillgänglig: ${!!supabaseKey}`);
  console.log('----------------------------------------------------');
  
  try {
    // Test 1: Försök hämta rooms-tabellen
    console.log('1. Testar om "rooms"-tabellen finns...');
    const { data: roomsData, error: roomsError } = await supabase
      .from('rooms')
      .select('*')
      .limit(1);
    
    if (roomsError) {
      console.log('Fel vid hämtning av "rooms":', roomsError);
      
      if (roomsError.code === '42P01' || roomsError.message.includes('does not exist')) {
        console.log('\nTabellen "rooms" finns inte! Du behöver köra SQL-skriptet.');
        console.log('Gå till Supabase-dashboarden (https://app.supabase.com), välj "SQL Editor",');
        console.log('skapa en ny fråga och kör innehållet från src/scripts/setupDatabase.sql.');
      } else if (roomsError.code === 'PGRST301' || roomsError.message.includes('permission denied')) {
        console.log('\nBehörighetsfel! Du behöver konfigurera RLS-policyer.');
        console.log('Gå till Supabase-dashboarden, välj "Table Editor", välj "rooms",');
        console.log('klicka på "Auth Policies" och lägg till en ny policy för SELECT.');
      }
    } else {
      console.log('Rooms-tabellen finns!');
      console.log('Hittade data:', roomsData);
      
      // Test 2: Om rooms-tabellen finns, försök hämta bookings-tabellen
      console.log('\n2. Testar om "bookings"-tabellen finns...');
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .limit(1);
      
      if (bookingsError) {
        console.log('Fel vid hämtning av "bookings":', bookingsError);
        
        if (bookingsError.code === '42P01' || bookingsError.message.includes('does not exist')) {
          console.log('\nTabellen "bookings" finns inte! Du behöver köra SQL-skriptet.');
        } else if (bookingsError.code === 'PGRST301' || bookingsError.message.includes('permission denied')) {
          console.log('\nBehörighetsfel för "bookings"! Du behöver konfigurera RLS-policyer.');
        }
      } else {
        console.log('Bookings-tabellen finns!');
        console.log('Hittade data:', bookingsData);
        console.log('\nBra! Båda tabellerna finns och är tillgängliga.');
      }
    }
    
    console.log('\n----------------------------------------------------');
    console.log('Test slutfört!');
    
  } catch (error) {
    console.error('Ett oväntat fel uppstod under testet:', error);
  }
}

testConnection(); 