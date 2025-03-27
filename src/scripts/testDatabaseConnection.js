// JavaScript-version av testskriptet för enklare körning
const { createClient } = require('@supabase/supabase-js');

// Hämta miljövariabler från .env-filen
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dujhsevqigspbuckegnx.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1amhzZXZxaWdzcGJ1Y2tlZ254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4MTk1MTYsImV4cCI6MjA1ODM5NTUxNn0.WXL3M2U3poyBr0cs5yKTYy6G9-FF4iKGtMBSxU-NwVk';

// Skapa Supabase-klienten
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Testskript för att verifiera databasanslutning och tabellstruktur
 */
async function testDatabaseConnection() {
  console.log('=== Supabase Databasanslutningstest ===');
  
  try {
    // Test 1: Kontrollera anslutningen genom att hämta en enkel standardtabell
    console.log('1. Kontrollerar databasanslutningen...');
    
    const { data: healthData, error: healthError } = await supabase
      .from('rooms')
      .select('count')
      .limit(1);
    
    if (healthError) {
      console.error('❌ Kunde inte ansluta till databasen:', healthError.message);
      return false;
    }
    
    console.log('✅ Databasanslutning fungerar!');

    // Test 2: Kontrollera om tabellerna finns
    console.log('\n2. Kontrollerar om tabellerna finns...');
    
    // Testa rooms-tabellen
    const { data: roomsData, error: roomsError } = await supabase
      .from('rooms')
      .select('count')
      .limit(1);
      
    if (roomsError) {
      console.error('❌ Kunde inte hämta från "rooms"-tabellen:', roomsError.message);
      return false;
    }
    
    console.log('✅ "rooms"-tabellen finns och är tillgänglig');
    
    // Testa bookings-tabellen
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select('count')
      .limit(1);
      
    if (bookingsError) {
      console.error('❌ Kunde inte hämta från "bookings"-tabellen:', bookingsError.message);
      return false;
    }
    
    console.log('✅ "bookings"-tabellen finns och är tillgänglig');
    
    // Test 3: Testa att läsa ett faktiskt värde
    console.log('\n3. Testar att läsa data från databasen...');
    
    const { data: sampleRoom, error: sampleError } = await supabase
      .from('rooms')
      .select('*')
      .limit(1)
      .single();
      
    if (sampleError) {
      console.error('❌ Kunde inte läsa data från "rooms"-tabellen:', sampleError.message);
      return false;
    }
    
    console.log('✅ Lyckades läsa data:');
    console.log(sampleRoom);
    
    console.log('\nAlla tester klarade! ✅');
    return true;
    
  } catch (error) {
    console.error('❌ Ett oväntat fel uppstod:', error);
    return false;
  }
}

// Kör testfunktionen
testDatabaseConnection().then((success) => {
  console.log('\n=== Testresultat: ' + (success ? 'Framgång ✅' : 'Misslyckades ❌') + ' ===');
  process.exit(success ? 0 : 1);
}); 