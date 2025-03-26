import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Room, Booking } from '../types/database.types';

const QUICK_BOOK_PHRASES = [
  // "Beam me up!",
  // "Engage!",
  // "Make it so!",
  // "To infinity!",
  // "Warp speed!",
  // "Use the force!",
  "Boka nu",
];

// Cache för rumdata
const roomCache = new Map<string, { data: Room | null; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minuter

// Cache för bokningar
const bookingsCache = new Map<string, { data: Booking[]; timestamp: number }>();
const BOOKINGS_CACHE_DURATION = 1 * 60 * 1000; // 1 minut

export const RoomDisplay: React.FC = () => {
  const { roomName: urlRoomName } = useParams<{ roomName: string }>();
  const [room, setRoom] = useState<Room | null>(null);
  const [roomName, setRoomName] = useState<string | undefined>(urlRoomName);
  const [currentBooking, setCurrentBooking] = useState<Booking | null>(null);
  const [nextBooking, setNextBooking] = useState<Booking | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [displayTheme, setDisplayTheme] = useState<'light' | 'dark'>('dark');
  const [isPortrait, setIsPortrait] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
  
  // Memoized booking phrase
  const bookingPhrase = useMemo(() => 
    QUICK_BOOK_PHRASES[Math.floor(Math.random() * QUICK_BOOK_PHRASES.length)],
    []
  );

  // Memoized current time string
  const currentTimeString = useMemo(() => 
    currentTime.toLocaleTimeString('sv-SE', { hour12: false }),
    [currentTime]
  );

  // Uppdatera tiden varje minut
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Kontrollera skärmorientering
  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    checkOrientation();

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Hämta tema från localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem(`display_theme_${roomName}`);
    if (savedTheme) {
      setDisplayTheme(savedTheme as 'light' | 'dark');
    }
  }, [roomName]);

  // Hämta bokningar med caching
  const fetchBookings = useCallback(async () => {
    if (!room) return;

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const cacheKey = `${room.id}-${today}-${tomorrow}`;

    // Kontrollera cache
    const cachedBookings = bookingsCache.get(cacheKey);
    if (cachedBookings && Date.now() - cachedBookings.timestamp < BOOKINGS_CACHE_DURATION) {
      updateBookingStates(cachedBookings.data, currentTimeString);
      return;
    }

    // Hämta alla bokningar för rum och datum
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('room_id', room.id)
      .gte('date', today)
      .lte('date', tomorrow)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Fel vid hämtning av bokningar:', error);
      return;
    }

    // Uppdatera cache
    bookingsCache.set(cacheKey, { data: bookings, timestamp: Date.now() });
    updateBookingStates(bookings, currentTimeString);
  }, [room, currentTimeString]);

  // Hämta rumdata med caching
  useEffect(() => {
    const fetchRoomData = async () => {
      try {
        setLoading(true);
        
        // Hämta rumsnamnets parameter från URL
        const pathSegments = window.location.pathname.split('/');
        const roomNameFromUrl = pathSegments[pathSegments.length - 1];
        const decodedRoomName = decodeURIComponent(roomNameFromUrl);
        
        // Kontrollera om rummet redan finns i cachen
        const cacheKey = `room-${decodedRoomName}`;
        const cachedRoom = roomCache.get(cacheKey);
        if (cachedRoom && Date.now() - cachedRoom.timestamp < CACHE_DURATION) {
          console.log('Använder cachat rum:', decodedRoomName);
          setRoom(cachedRoom.data);
          setRoomName(cachedRoom.data?.name || '');
          setLoading(false);
          return;
        }
        
        console.log('Söker efter rum med namn:', decodedRoomName);
        
        // Hämta alla rum först för att hitta en matchning
        const { data: allRooms, error: roomsError } = await supabase
          .from('rooms')
          .select('*');
          
        if (roomsError) {
          console.error('Kunde inte hämta rumlistan:', roomsError);
          setError('Ett fel uppstod vid sökning efter rum.');
          setLoading(false);
          return;
        }
        
        console.log('Alla rum:', allRooms);
        
        // Försök hitta en matchning, även delvis
        let matchedRoom = null;
        if (allRooms && allRooms.length > 0) {
          // Exakt matchning
          matchedRoom = allRooms.find(r => 
            r.name.toLowerCase() === decodedRoomName.toLowerCase()
          );
          
          // Om ingen exakt matchning, prova innehåller-matchning
          if (!matchedRoom) {
            matchedRoom = allRooms.find(r => 
              r.name.toLowerCase().includes(decodedRoomName.toLowerCase()) || 
              decodedRoomName.toLowerCase().includes(r.name.toLowerCase())
            );
          }
        }

        if (!matchedRoom) {
          console.error('Inget rum hittades med namn:', decodedRoomName);
          setError(`Kunde inte hitta rummet: ${decodedRoomName}`);
          setLoading(false);
          return;
        }

        // Uppdatera cache med matchat rum
        roomCache.set(cacheKey, { data: matchedRoom, timestamp: Date.now() });
        
        console.log('Rum hittades:', matchedRoom);
        setRoom(matchedRoom);
        setRoomName(matchedRoom.name);
        setLoading(false);
      } catch (err) {
        console.error('Fel vid hämtning av rum:', err);
        setError('Ett oväntat fel uppstod vid hämtning av rumsinformation.');
        setLoading(false);
      }
    };

    fetchRoomData();
    const intervalId = setInterval(fetchBookings, 5 * 60 * 1000); // Uppdatera var 5:e minut
    
    // Initial hämtning av bokningar kommer att göras när room är satt
    
    return () => {
      clearInterval(intervalId);
    };
  }, [fetchBookings]);

  // Uppdatera bokningar när rum eller tid ändras
  useEffect(() => {
    if (room) {
      fetchBookings();
    }
  }, [room, currentTimeString, fetchBookings]);

  // Memoized function för att uppdatera bokningstillstånd
  const updateBookingStates = useCallback((bookings: Booking[], currentTime: string) => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Formatera currentTime för att endast jämföra timmar och minuter (HH:MM) utan sekunder
    const timeFormatted = currentTime.substring(0, 5);
    
    console.log('Uppdaterar bokningsstatus:', { 
      bookings, 
      currentTime: timeFormatted, 
      today, 
      tomorrow 
    });
    
    // Gå igenom bokningar och logga detaljer för felsökning
    bookings.forEach(booking => {
      console.log(`Bokning: ${booking.date} ${booking.start_time}-${booking.end_time}, Aktuell tid: ${timeFormatted}`,
        {
          isToday: booking.date === today,
          startBeforeNow: booking.start_time <= timeFormatted,
          endAfterNow: booking.end_time > timeFormatted
        });
    });
    
    const currentBooking = bookings.find(booking => 
      booking.date === today && 
      booking.start_time <= timeFormatted && 
      booking.end_time > timeFormatted
    );

    const nextBooking = bookings.find(booking => 
      (booking.date === today && booking.start_time > timeFormatted) ||
      (booking.date === tomorrow && (!currentBooking || currentBooking.end_time <= timeFormatted))
    );

    console.log('Bokningsstatus:', { 
      currentBooking, 
      nextBooking, 
      isCurrentBookingValid: currentBooking !== undefined
    });

    setCurrentBooking(currentBooking || null);
    setNextBooking(nextBooking || null);
  }, []);

  const toggleTheme = () => {
    const newTheme = displayTheme === 'light' ? 'dark' : 'light';
    setDisplayTheme(newTheme);
    localStorage.setItem(`display_theme_${roomName}`, newTheme);
  };

  const handleQuickBook = async () => {
    if (!room || isBooking) return;
    
    setIsBooking(true);
    const now = new Date();
    
    // Skapa starttid som närmaste föregående 5-minutersintervall för att följa databasens begränsningar
    const minutes = Math.floor(now.getMinutes() / 5) * 5;
    const startTime = `${String(now.getHours()).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    
    // Standardsluttid, 30 minuter senare
    const defaultEndDate = new Date(now);
    defaultEndDate.setMinutes(minutes + 30);
    
    // Hämta bokningar för nuvarande datum för att kontrollera kommande bokningar
    const today = now.toISOString().split('T')[0];
    const { data: todaysBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .eq('room_id', room.id)
      .eq('date', today)
      .gte('start_time', startTime)
      .order('start_time', { ascending: true });
    
    // Bestäm sluttid baserat på nästa bokning (om någon finns inom 30 minuter)
    let endTime;
    
    if (!bookingsError && todaysBookings && todaysBookings.length > 0) {
      // Konvertera nästa boknings starttid till Date-objekt för jämförelse
      const nextBookingStartTime = todaysBookings[0].start_time;
      const [nextHour, nextMinute] = nextBookingStartTime.split(':').map(Number);
      
      const nextBookingDate = new Date(now);
      nextBookingDate.setHours(nextHour, nextMinute, 0, 0);
      
      // Beräkna tidsskillnad i minuter
      const timeDiffMinutes = (nextBookingDate.getTime() - now.getTime()) / (1000 * 60);
      
      console.log(`Nästa bokning: ${nextBookingStartTime}, tidsskillnad: ${timeDiffMinutes} minuter`);
      
      // Om nästa bokning är inom 30 minuter, sluta 1 minut innan
      if (timeDiffMinutes <= 30 && timeDiffMinutes > 0) {
        // Sluttid är 1 minut innan nästa bokning
        const endMinute = nextMinute > 0 ? nextMinute - 1 : 59;
        const endHour = nextMinute > 0 ? nextHour : nextHour - 1;
        
        endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
        console.log(`Bokning anpassad till nästa bokning: ${startTime} - ${endTime}`);
      } else {
        // Använd standardsluttid (30 minuter)
        endTime = `${String(defaultEndDate.getHours()).padStart(2, '0')}:${String(defaultEndDate.getMinutes()).padStart(2, '0')}`;
        console.log(`Standardbokning 30 minuter: ${startTime} - ${endTime}`);
      }
    } else {
      // Ingen kommande bokning, använd standardsluttid (30 minuter)
      endTime = `${String(defaultEndDate.getHours()).padStart(2, '0')}:${String(defaultEndDate.getMinutes()).padStart(2, '0')}`;
      console.log(`Standardbokning 30 minuter: ${startTime} - ${endTime}`);
    }

    console.log(`Försöker boka: ${startTime} till ${endTime}`);

    try {
      // Kontrollera om is_quick_booking stöds i databasen
      const bookingData = {
        room_id: room.id,
        date: now.toISOString().split('T')[0],
        start_time: startTime,
        end_time: endTime,
        purpose: 'Snabbmöte',
        booker: 'Spontanbokning'
      };
      
      // Endast lägg till is_quick_booking om kolumnen finns 
      try {
        const { data: schemaInfo } = await supabase
          .from('bookings')
          .select('is_quick_booking')
          .limit(1);
          
        // Om ovanstående inte kastar fel lägger vi till is_quick_booking
        (bookingData as any).is_quick_booking = true;
      } catch (e) {
        console.log('is_quick_booking stöds inte av databasen ännu');
      }

      const { error } = await supabase
        .from('bookings')
        .insert([bookingData]);

      if (error) throw error;
      
      // Uppdatera bokning direkt istället för att vänta på intervallet
      const { data: bookings, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('room_id', room.id)
        .gte('date', now.toISOString().split('T')[0])
        .lte('date', new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });
        
      if (!fetchError && bookings) {
        // Uppdatera cache och tillstånd
        const cacheKey = `${room.id}-${now.toISOString().split('T')[0]}-${new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`;
        bookingsCache.set(cacheKey, { data: bookings, timestamp: Date.now() });
        updateBookingStates(bookings, currentTimeString);
      }
    } catch (error) {
      console.error('Fel vid snabbbokning:', error);
    } finally {
      setIsBooking(false);
    }
  };

  // Ny funktion för att avboka ett snabbmöte
  const handleCancelQuickMeeting = async () => {
    if (!currentBooking || !currentBooking.is_quick_booking || !room) return;
    
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', currentBooking.id);

      if (error) throw error;
      
      // Uppdatera bokningslistan
      const now = new Date();
      const { data: bookings, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('room_id', room.id)
        .gte('date', now.toISOString().split('T')[0])
        .lte('date', new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });
        
      if (!fetchError && bookings) {
        // Uppdatera cache och tillstånd
        const cacheKey = `${room.id}-${now.toISOString().split('T')[0]}-${new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`;
        bookingsCache.set(cacheKey, { data: bookings, timestamp: Date.now() });
        updateBookingStates(bookings, currentTimeString);
      }
    } catch (error) {
      console.error('Fel vid avbokning av snabbmöte:', error);
    }
  };

  // Auto-fullscreen implementation
  useEffect(() => {
    // Lägger till en auto-fullscreen funktion när sidan laddas
    const handleAutoFullscreen = () => {
      // Vi flyttar implementationen till användarinteraktionshanterare
      // eftersom fullscreen API kräver användarinteraktion
    };

    // Definiera en funktion som kan anropas vid användarinteraktion
    const tryFullscreen = () => {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.log('Kunde inte aktivera fullskärm:', err);
        });
      }
    };

    // Lyssna endast på användarinteraktioner för fullscreen
    const events = ['click', 'touchstart'];
    
    events.forEach(event => {
      window.addEventListener(event, tryFullscreen, { once: true });
    });
    
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, tryFullscreen);
      });
    };
  }, []);
  
  // Försök återupprätta fullskärm om användaren lämnar det
  useEffect(() => {
    const handleFullscreenChange = () => {
      // Om fullskärm avslutas och vi är på en display-sida, försök återupprätta
      if (!document.fullscreenElement && window.location.pathname.includes('/display/')) {
        // Vänta på nästa användarinteraktion för att återupprätta
        const handleNextInteraction = (e: MouseEvent | TouchEvent) => {
          // Endast aktivera fullscreen vid direkt interaktion med sidan
          document.documentElement.requestFullscreen().catch(() => {
            console.log('Användaren måste interagera med sidan för fullskärm');
          });
        };
        
        // Lyssna på nästa interaktion
        window.addEventListener('click', handleNextInteraction, { once: true });
        window.addEventListener('touchstart', handleNextInteraction, { once: true });
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!room) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${
        displayTheme === 'dark' 
          ? 'bg-gradient-to-br from-gray-900 via-[#001233] to-black' 
          : 'bg-gradient-to-br from-slate-100 via-[#e0f2fe] to-white'
      }`}>
        <div className={`text-2xl ${displayTheme === 'dark' ? 'text-white' : 'text-black'}`}>
          Laddar...
        </div>
      </div>
    );
  }

  const isOccupied = !!currentBooking;
  const formattedDate = currentTime.toLocaleDateString('sv-SE', { weekday: 'short', month: 'short', day: 'numeric' });

  // Fixa linter-felet med floor
  const getRoomFloor = (room: Room) => {
    // @ts-ignore - Vi ignorerar TypeScript-felet här
    return room.floor || 1;
  };

  return (
    <div className={`min-h-screen relative ${
      displayTheme === 'dark'
        ? 'bg-gradient-to-br from-[#000428] via-[#001233] to-[#004e92] text-white'
        : 'bg-gradient-to-br from-[#00C6FB] via-[#38EF7D] to-[#72FFB6] text-gray-800'
    }`}>
      {/* Sci-fi overlay pattern */}
      <div className={`absolute inset-0 ${
        displayTheme === 'dark'
          ? 'bg-[radial-gradient(ellipse_at_top,_rgba(13,110,253,0.15)_0%,_rgba(0,38,89,0.15)_100%)] backdrop-blur-[1px]'
          : 'bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.3)_0%,_rgba(255,255,255,0.1)_100%)] backdrop-blur-[1px]'
      }`}></div>

      {/* Animated wave pattern */}
      <div className={`absolute inset-0 ${
        displayTheme === 'dark'
          ? 'bg-[url("data:image/svg+xml,%3Csvg width=\'2000\' height=\'1000\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 800q100-150 200-150t200 150 200-150 200 150 200-150 200 150 200-150 200 150 200-150 200 150\' fill=\'none\' stroke=\'rgba(0,100,255,0.05)\' stroke-width=\'2\'%3E%3Canimate attributeName=\'d\' dur=\'20s\' repeatCount=\'indefinite\' values=\'M0 800q100-150 200-150t200 150 200-150 200 150 200-150 200 150 200-150 200 150 200-150 200 150;M0 800q100 150 200 150t200-150 200 150 200-150 200 150 200-150 200 150 200-150 200 150 200-150;M0 800q100-150 200-150t200 150 200-150 200 150 200-150 200 150 200-150 200 150 200-150 200 150\'/%3E%3C/path%3E%3C/svg%3E")] opacity-30'
          : 'bg-[url("data:image/svg+xml,%3Csvg width=\'2000\' height=\'1000\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 800q100-150 200-150t200 150 200-150 200 150 200-150 200 150 200-150 200 150 200-150 200 150\' fill=\'none\' stroke=\'rgba(255,255,255,0.1)\' stroke-width=\'2\'%3E%3Canimate attributeName=\'d\' dur=\'20s\' repeatCount=\'indefinite\' values=\'M0 800q100-150 200-150t200 150 200-150 200 150 200-150 200 150 200-150 200 150 200-150 200 150;M0 800q100 150 200 150t200-150 200 150 200-150 200 150 200-150 200 150 200-150 200 150 200-150;M0 800q100-150 200-150t200 150 200-150 200 150 200-150 200 150 200-150 200 150 200-150 200 150\'/%3E%3C/path%3E%3C/svg%3E")] opacity-20'
      }`}></div>

      <div className="min-h-screen flex flex-col relative z-10">
        {/* Header - anpassad för olika skärmstorlekar */}
        <div className="p-4 md:p-6 flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4 sm:gap-0">
          <div className="text-center sm:text-left">
            <div className="text-2xl md:text-3xl font-light">
              {currentTime.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-xs md:text-sm opacity-60 mt-1">
              {formattedDate}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-8">
            <div className="text-center sm:text-right">
              <h1 className="text-xl md:text-2xl font-medium tracking-wide">{room.name}</h1>
              <div className="text-xs md:text-sm opacity-60">Våning {getRoomFloor(room)}</div>
            </div>
            <button
              onClick={toggleTheme}
              className={`p-2 md:p-3 rounded-full backdrop-blur-sm ${
                displayTheme === 'dark' 
                  ? 'bg-gray-800/50 text-blue-300 shadow-[0_0_15px_rgba(0,100,255,0.3)]' 
                  : 'bg-white/50 text-blue-600 shadow-[0_0_15px_rgba(0,100,255,0.1)]'
              } hover:shadow-[0_0_20px_rgba(0,100,255,0.5)] transition-all duration-300 ease-in-out`}
              aria-label="Växla tema"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                strokeWidth="1.5" 
                stroke="currentColor" 
                className="w-5 h-5 md:w-6 md:h-6"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" 
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Bokningar och Quick Book Button - anpassad för olika skärmstorlekar */}
        <div className={`flex-1 px-4 md:px-6 flex flex-col ${isPortrait ? 'justify-start pt-4' : ''}`}>
          <div className="space-y-4 w-full">
            {currentBooking && (
              <div className="flex flex-col w-full">
                <div className="flex flex-col sm:flex-row justify-between items-center">
                  <div className="text-base md:text-lg mb-2 sm:mb-0">
                    {currentBooking.start_time.substring(0, 5)} - {currentBooking.end_time.substring(0, 5)}
                  </div>
                  <div className="text-base md:text-lg font-medium">{currentBooking.purpose || 'Möte'}</div>
                </div>
                
                {/* Avbokningsknapp för snabbmöten */}
                {currentBooking.is_quick_booking && (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={handleCancelQuickMeeting}
                      className={`px-3 py-2 md:px-4 md:py-2 rounded-lg flex items-center gap-2 ${
                        displayTheme === 'dark'
                          ? 'bg-red-600/80 hover:bg-red-700 text-white'
                          : 'bg-red-500 hover:bg-red-600 text-white'
                      } transition-colors text-sm md:text-base`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      Avboka snabbmöte
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Book Button - anpassad för olika skärmstorlekar */}
          {!isOccupied && (
            <div className={`flex-1 flex items-center justify-center ${isPortrait ? 'mt-8' : 'mt-[-45px]'}`}>
              <button
                onClick={handleQuickBook}
                disabled={isBooking}
                className={`group relative ${isPortrait ? 'px-8 py-6 text-xl' : 'px-16 py-8 text-3xl'} font-bold rounded-xl ${
                  displayTheme === 'dark'
                    ? 'bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 border-blue-400'
                    : 'bg-cyan-600/20 text-cyan-900 hover:bg-cyan-600/30 border-cyan-400'
                } border-2 shadow-[0_0_15px_currentColor] transition-all duration-300 ease-in-out transform hover:scale-105`}
              >
                {/* Knappinnehåll */}
                <div className="relative z-10">
                  {isBooking ? (
                    <div className="flex items-center justify-center gap-3">
                      <svg className="animate-spin h-5 w-5 md:h-6 md:w-6" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Bokar...</span>
                    </div>
                  ) : (
                    <span>{bookingPhrase}</span>
                  )}
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Nästa konferens - anpassad för olika skärmstorlekar */}
        {nextBooking && (
          <div className="px-4 md:px-6 pb-4">
            <div className={`p-3 rounded-lg ${isPortrait ? 'max-w-full' : 'max-w-[30%] sm:max-w-[40%] md:max-w-[30%]'} ${
              displayTheme === 'dark' 
                ? 'bg-blue-900/20 border border-blue-800/50' 
                : 'bg-blue-100/50 border border-blue-200'
            }`}>
              <div className={`text-xs uppercase font-semibold ${
                displayTheme === 'dark' ? 'text-blue-400' : 'text-blue-700'
              }`}>
                Nästa konferens
              </div>
              <div className="flex items-center">
                <div className="text-sm md:text-base">
                  {nextBooking.start_time.substring(0, 5)} - {nextBooking.end_time.substring(0, 5)}
                </div>
              </div>
              {nextBooking.booker && (
                <div className={`text-xs mt-1 ${
                  displayTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {nextBooking.booker}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status banner - anpassad för olika skärmstorlekar */}
        <div className={`w-full p-4 md:p-8 ${
          isOccupied
            ? 'bg-gradient-to-r from-red-900 via-red-800 to-red-900 text-white'
            : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 text-white'
        }`}>
          <div className="text-white text-center md:text-left text-2xl md:text-3xl font-medium">
            {isOccupied ? 'UPPTAGET' : 'LEDIGT'}
          </div>
        </div>
      </div>
    </div>
  );
}; 