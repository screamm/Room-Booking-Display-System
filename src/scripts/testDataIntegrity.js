// JavaScript-version av dataintegritetstestet för enklare körning
const { createClient } = require('@supabase/supabase-js');

// Hämta miljövariabler från .env-filen
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dujhsevqigspbuckegnx.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1amhzZXZxaWdzcGJ1Y2tlZ254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4MTk1MTYsImV4cCI6MjA1ODM5NTUxNn0.WXL3M2U3poyBr0cs5yKTYy6G9-FF4iKGtMBSxU-NwVk';

// Skapa Supabase-klienten
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Testskript för att kontrollera dataintegritet i databasen
 */
async function testDataIntegrity() {
  console.log('=== Supabase Dataintegritetstester ===');
  
  try {
    // Test 1: Kontrollera referensintegritet mellan bokningar och rum
    console.log('1. Kontrollerar referensintegritet mellan bokningar och rum...');
    
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('room_id');
      
    if (bookingsError) {
      console.error('❌ Kunde inte hämta bokningar:', bookingsError.message);
      return false;
    }
    
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('id');
      
    if (roomsError) {
      console.error('❌ Kunde inte hämta rum:', roomsError.message);
      return false;
    }
    
    // Skapa en uppsättning av giltiga rum-ID:n
    const roomIds = new Set(rooms.map((room) => room.id));
    
    // Kontrollera att alla bokningar refererar till giltiga rum
    const invalidBookings = bookings.filter((booking) => !roomIds.has(booking.room_id));
    
    if (invalidBookings.length > 0) {
      console.error(`❌ Hittade ${invalidBookings.length} bokningar med ogiltiga rum-ID:n`);
      console.error('Exempel på ogiltiga bokningar:', invalidBookings.slice(0, 3));
      return false;
    }
    
    console.log(`✅ Alla ${bookings.length} bokningar har giltiga rum-referenser`);
    
    // Test 2: Kontrollera dubbletter av bokningar (samma rum, datum, tid)
    console.log('\n2. Kontrollerar dubletter av bokningar...');
    
    const { data: allBookings, error: allBookingsError } = await supabase
      .from('bookings')
      .select('*')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });
      
    if (allBookingsError) {
      console.error('❌ Kunde inte hämta alla bokningar:', allBookingsError.message);
      return false;
    }
    
    // Skapa en uppsättning av unika bokningsnyckel-strängar
    const bookingKeys = new Set();
    const duplicateBookings = [];
    
    for (const booking of allBookings) {
      const key = `${booking.room_id}-${booking.date}-${booking.start_time}-${booking.end_time}`;
      if (bookingKeys.has(key)) {
        duplicateBookings.push(booking);
      } else {
        bookingKeys.add(key);
      }
    }
    
    if (duplicateBookings.length > 0) {
      console.error(`❌ Hittade ${duplicateBookings.length} dubblettbokningar`);
      console.error('Exempel på dubbletter:', duplicateBookings.slice(0, 3));
      return false;
    }
    
    console.log(`✅ Inga dubblettbokningar hittades bland ${allBookings.length} bokningar`);
    
    // Test 3: Kontrollera överlappande bokningar
    console.log('\n3. Kontrollerar överlappande bokningar...');
    
    const overlappingBookings = [];
    
    // Gruppera bokningar efter rum och datum
    const bookingsByRoomAndDate = {};
    
    for (const booking of allBookings) {
      const key = `${booking.room_id}-${booking.date}`;
      if (!bookingsByRoomAndDate[key]) {
        bookingsByRoomAndDate[key] = [];
      }
      bookingsByRoomAndDate[key].push(booking);
    }
    
    // Kontrollera överlapp inom varje grupp
    for (const [key, bookingsGroup] of Object.entries(bookingsByRoomAndDate)) {
      for (let i = 0; i < bookingsGroup.length; i++) {
        const a = bookingsGroup[i];
        for (let j = i + 1; j < bookingsGroup.length; j++) {
          const b = bookingsGroup[j];
          
          // Kontrollera överlapp: start_a < end_b && end_a > start_b
          if (a.start_time < b.end_time && a.end_time > b.start_time) {
            overlappingBookings.push([a, b]);
          }
        }
      }
    }
    
    if (overlappingBookings.length > 0) {
      console.error(`❌ Hittade ${overlappingBookings.length} överlappande bokningspar`);
      console.error('Exempel på överlappande bokningar:', overlappingBookings[0]);
      return false;
    }
    
    console.log(`✅ Inga överlappande bokningar hittades bland ${allBookings.length} bokningar`);
    
    // Test 4: Kontrollera datavaliditet
    console.log('\n4. Kontrollerar datavaliditet...');
    
    const invalidData = [];
    
    for (const booking of allBookings) {
      // Kontrollera att start_time < end_time
      if (booking.start_time >= booking.end_time) {
        invalidData.push({
          id: booking.id,
          problem: 'starttid >= sluttid',
          booking
        });
      }
      
      // Kontrollera att booker inte är tom
      if (!booking.booker || booking.booker.trim() === '') {
        invalidData.push({
          id: booking.id,
          problem: 'tom bokare',
          booking
        });
      }
      
      // Kontrollera datumformat
      if (!/^\d{4}-\d{2}-\d{2}$/.test(booking.date)) {
        invalidData.push({
          id: booking.id,
          problem: 'ogiltigt datumformat',
          booking
        });
      }
      
      // Kontrollera tidsformat - acceptera både HH:MM och HH:MM:SS
      const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;
      if (!timeRegex.test(booking.start_time) || !timeRegex.test(booking.end_time)) {
        invalidData.push({
          id: booking.id,
          problem: 'ogiltigt tidsformat',
          booking
        });
      }
    }
    
    if (invalidData.length > 0) {
      console.error(`❌ Hittade ${invalidData.length} bokningar med ogiltig data`);
      console.error('Exempel på ogiltig data:', invalidData.slice(0, 3));
      return false;
    }
    
    console.log(`✅ Alla ${allBookings.length} bokningar har giltig data`);
    
    console.log('\nAlla dataintegritetstester klarade! ✅');
    return true;
    
  } catch (error) {
    console.error('❌ Ett oväntat fel uppstod:', error);
    return false;
  }
}

// Kör testfunktionen
testDataIntegrity().then((success) => {
  console.log('\n=== Testresultat: ' + (success ? 'Framgång ✅' : 'Misslyckades ❌') + ' ===');
  process.exit(success ? 0 : 1);
}); 