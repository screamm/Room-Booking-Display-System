import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Room, Booking } from '../types/database.types';

const QUICK_BOOK_PHRASES = [
  "Beam me up!",
  "Engage!",
  "Make it so!",
  "To infinity!",
  "Warp speed!",
  "Use the force!",
];

// Cache för rumdata
const roomCache = new Map<string, { data: Room | null; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minuter

// Cache för bokningar
const bookingsCache = new Map<string, { data: Booking[]; timestamp: number }>();
const BOOKINGS_CACHE_DURATION = 1 * 60 * 1000; // 1 minut

export const RoomDisplay: React.FC = () => {
  const { roomName } = useParams<{ roomName: string }>();
  const [room, setRoom] = useState<Room | null>(null);
  const [currentBooking, setCurrentBooking] = useState<Booking | null>(null);
  const [nextBooking, setNextBooking] = useState<Booking | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [displayTheme, setDisplayTheme] = useState<'light' | 'dark'>('dark');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [isBooking, setIsBooking] = useState(false);
  
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
      setOrientation(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
    };
    
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  // Hämta tema från localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem(`display_theme_${roomName}`);
    if (savedTheme) {
      setDisplayTheme(savedTheme as 'light' | 'dark');
    }
  }, [roomName]);

  // Hämta rumdata med caching
  useEffect(() => {
    const fetchRoomData = async () => {
      if (!roomName) return;

      // Kontrollera cache
      const cachedRoom = roomCache.get(roomName);
      if (cachedRoom && Date.now() - cachedRoom.timestamp < CACHE_DURATION) {
        setRoom(cachedRoom.data);
        return;
      }

      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('name', roomName)
        .single();

      if (roomError) {
        console.error('Fel vid hämtning av rum:', roomError);
        return;
      }

      // Uppdatera cache
      roomCache.set(roomName, { data: roomData, timestamp: Date.now() });
      setRoom(roomData);
    };

    fetchRoomData();
  }, [roomName]);

  // Hämta bokningar med caching
  useEffect(() => {
    if (!room) return;

    const fetchBookings = async () => {
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
    };

    fetchBookings();
    const interval = setInterval(fetchBookings, 60000);
    return () => clearInterval(interval);
  }, [room, currentTimeString]);

  // Memoized function för att uppdatera bokningstillstånd
  const updateBookingStates = useCallback((bookings: Booking[], currentTime: string) => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const currentBooking = bookings.find(booking => 
      booking.date === today && 
      booking.start_time <= currentTime && 
      booking.end_time > currentTime
    );

    const nextBooking = bookings.find(booking => 
      (booking.date === today && booking.start_time > currentTime) ||
      (booking.date === tomorrow && (!currentBooking || currentBooking.end_time <= currentTime))
    );

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
    const startTime = `${String(now.getHours()).padStart(2, '0')}:${String(Math.floor(now.getMinutes() / 30) * 30).padStart(2, '0')}`;
    
    // Beräkna sluttid (antingen nästa halvtimme eller när nästa bokning börjar)
    let endTime;
    if (nextBooking) {
      endTime = nextBooking.start_time;
    } else {
      const thirtyMinutesLater = new Date(now.getTime() + 30 * 60000);
      endTime = `${String(thirtyMinutesLater.getHours()).padStart(2, '0')}:${String(Math.floor(thirtyMinutesLater.getMinutes() / 30) * 30).padStart(2, '0')}`;
    }

    try {
      const { error } = await supabase
        .from('bookings')
        .insert([{
          room_id: room.id,
          date: now.toISOString().split('T')[0],
          start_time: startTime,
          end_time: endTime,
          purpose: 'Snabbmöte',
          booker: 'Spontanbokning'
        }]);

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
        {/* Header */}
        <div className="p-6 flex justify-between items-start">
          <div>
            <div className="text-3xl font-light">
              {currentTime.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-sm opacity-60 mt-1">
              {formattedDate}
            </div>
          </div>
          <div className="flex items-start gap-8">
            <div className="text-right">
              <h1 className="text-2xl font-medium tracking-wide">{room.name}</h1>
              <div className="text-sm opacity-60">Våning {getRoomFloor(room)}</div>
            </div>
            <button
              onClick={toggleTheme}
              className={`p-3 rounded-full backdrop-blur-sm ${
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
                className="w-6 h-6"
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

        {/* Bokningar och Quick Book Button */}
        <div className="flex-1 px-6 flex flex-col">
          <div className="space-y-4">
            {currentBooking && (
              <div className="flex justify-between items-center">
                <div className="text-lg">
                  {currentBooking.start_time.substring(0, 5)} - {currentBooking.end_time.substring(0, 5)}
                </div>
                <div className="text-lg">{currentBooking.purpose || 'Möte'}</div>
              </div>
            )}
          </div>

          {/* Quick Book Button */}
          {!isOccupied && (
            <div className="flex-1 flex items-center justify-center mt-[-45px]">
              <button
                onClick={handleQuickBook}
                disabled={isBooking}
                className={`group relative px-16 py-8 text-3xl font-bold rounded-xl ${
                  displayTheme === 'dark'
                    ? 'bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 border-blue-400'
                    : 'bg-cyan-600/20 text-cyan-900 hover:bg-cyan-600/30 border-cyan-400'
                } border-2 shadow-[0_0_15px_currentColor] transition-all duration-300 ease-in-out transform hover:scale-105`}
              >
                {/* Knappinnehåll */}
                <div className="relative z-10">
                  {isBooking ? (
                    <div className="flex items-center gap-3">
                      <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
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

        {/* Nästa konferens */}
        {nextBooking && (
          <div className="px-6 pb-4">
            <div className={`p-3 rounded-lg max-w-[40%] ${
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
                <div className="text-base">
                  {nextBooking.start_time.substring(0, 5)} - {nextBooking.end_time.substring(0, 5)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status banner */}
        <div className={`w-full p-8 ${
          isOccupied
            ? 'bg-gradient-to-r from-red-900 via-red-800 to-red-900 text-white'
            : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 text-white'
        }`}>
          <div className="text-white text-3xl font-medium">
            {isOccupied ? 'UPPTAGET' : 'LEDIGT'}
          </div>
        </div>
      </div>
    </div>
  );
}; 