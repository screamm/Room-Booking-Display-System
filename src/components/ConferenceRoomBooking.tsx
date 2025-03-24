import React, { useState, useEffect } from 'react';
import { roomsApi, bookingsApi } from '../lib/api';
import type { Room, Booking as DBBooking } from '../types/database.types';

// Intern bokningstyp för komponenten
interface Booking {
  id: number;
  roomId: number;
  roomName: string;
  date: string;
  startTime: string;
  endTime: string;
  booker: string;
  purpose: string;
}

const ConferenceRoomBooking: React.FC = () => {
  // State för rum, bokningar och formulär
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [bookingDate, setBookingDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [booker, setBooker] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('');
  const [currentView, setCurrentView] = useState<string>('calendar'); // 'calendar', 'form', 'week-view'
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [weekStart, setWeekStart] = useState<string>(getWeekStartDate(new Date()));
  const [editingBookingId, setEditingBookingId] = useState<number | null>(null);

  // Ladda rum och bokningar från API
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        
        // Hämta rum
        const roomsData = await roomsApi.getAll();
        setRooms(roomsData);
        
        // Hämta alla bokningar initialt
        await loadAllBookings();
        
        setLoading(false);
      } catch (err) {
        console.error('Fel vid laddning av data:', err);
        setError('Kunde inte ladda data från servern. Försök igen senare.');
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  // Ladda bokningar för ett specifikt datum
  useEffect(() => {
    async function loadBookingsForDate() {
      try {
        if (!selectedDate) return;
        
        const bookingsData = await bookingsApi.getByDate(selectedDate);
        const mappedBookings = mapDbBookingsToLocal(bookingsData);
        
        setBookings(prevBookings => {
          // Ta bort bokningar för det valda datumet och lägg till de nya
          const otherDatesBookings = prevBookings.filter(b => b.date !== selectedDate);
          return [...otherDatesBookings, ...mappedBookings];
        });
      } catch (err) {
        console.error(`Fel vid laddning av bokningar för datum ${selectedDate}:`, err);
        setError('Kunde inte ladda bokningar för det valda datumet.');
      }
    }
    
    loadBookingsForDate();
  }, [selectedDate]);

  // Ladda bokningar för veckan när veckostart ändras
  useEffect(() => {
    async function loadBookingsForWeek() {
      try {
        const endDate = new Date(weekStart);
        endDate.setDate(endDate.getDate() + 6);
        
        const bookingsData = await bookingsApi.getByDateRange(
          weekStart, 
          endDate.toISOString().split('T')[0]
        );
        
        const mappedBookings = mapDbBookingsToLocal(bookingsData);
        
        setBookings(prevBookings => {
          // Filtrera bort bokningar som ingår i veckointervallet
          const otherBookings = prevBookings.filter(b => {
            const bookingDate = new Date(b.date);
            const startDate = new Date(weekStart);
            const endWeekDate = new Date(endDate);
            return bookingDate < startDate || bookingDate > endWeekDate;
          });
          
          return [...otherBookings, ...mappedBookings];
        });
      } catch (err) {
        console.error(`Fel vid laddning av bokningar för veckan från ${weekStart}:`, err);
        setError('Kunde inte ladda bokningar för veckan.');
      }
    }
    
    loadBookingsForWeek();
  }, [weekStart]);

  // Dagens datum som default för bokningsformuläret
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setBookingDate(today);
  }, []);

  // Konvertera DB-bokningar till lokal bokningsmodell
  const mapDbBookingsToLocal = (dbBookings: DBBooking[]): Booking[] => {
    return dbBookings.map(booking => {
      // Hitta rumsnamnet baserat på room_id
      const room = rooms.find(r => r.id === booking.room_id);
      
      return {
        id: booking.id,
        roomId: booking.room_id,
        roomName: room ? room.name : 'Okänt rum',
        date: booking.date,
        startTime: booking.start_time,
        endTime: booking.end_time,
        booker: booking.booker,
        purpose: booking.purpose || ''
      };
    });
  };

  // Konvertera lokal bokning till DB-format
  const mapLocalBookingToDb = (booking: Partial<Booking>): Partial<DBBooking> => {
    return {
      room_id: booking.roomId,
      date: booking.date,
      start_time: booking.startTime,
      end_time: booking.endTime,
      booker: booking.booker,
      purpose: booking.purpose
    };
  };

  // Ladda alla bokningar
  const loadAllBookings = async () => {
    try {
      const bookingsData = await bookingsApi.getAll();
      setBookings(mapDbBookingsToLocal(bookingsData));
    } catch (err) {
      console.error('Fel vid laddning av alla bokningar:', err);
      setError('Kunde inte ladda alla bokningar.');
    }
  };

  // Funktion för att få veckostart (måndag)
  function getWeekStartDate(date: Date): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Justera för att få måndag som första dag
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  }

  // Generera veckodagar från startdatum
  function getWeekDays(startDate: string): Date[] {
    const days: Date[] = [];
    const currentDay = new Date(startDate);
    
    for (let i = 0; i < 7; i++) {
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    return days;
  }
  
  // Formatera datum för visning
  function formatDateHeader(date: Date): string {
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
    return date.toLocaleDateString('sv-SE', options);
  }

  // Kontrollera om bokning finns vid viss tid/datum/rum
  function hasBookingAt(roomId: number, date: Date, hour: number): boolean {
    const dateStr = date.toISOString().split('T')[0];
    return bookings.some(booking => {
      if (booking.roomId !== roomId || booking.date !== dateStr) return false;
      
      const startHour = parseInt(booking.startTime.split(':')[0]);
      const endHour = parseInt(booking.endTime.split(':')[0]);
      
      return hour >= startHour && hour < endHour;
    });
  }

  // Få bokningsinfo för cell
  function getBookingInfo(roomId: number, date: Date, hour: number): Booking | null {
    const dateStr = date.toISOString().split('T')[0];
    return bookings.find(booking => {
      if (booking.roomId !== roomId || booking.date !== dateStr) return false;
      
      const startHour = parseInt(booking.startTime.split(':')[0]);
      const endHour = parseInt(booking.endTime.split(':')[0]);
      
      return hour >= startHour && hour < endHour;
    }) || null;
  }

  // Hantera föregående vecka
  function handlePrevWeek(): void {
    const prevWeek = new Date(weekStart);
    prevWeek.setDate(prevWeek.getDate() - 7);
    setWeekStart(prevWeek.toISOString().split('T')[0]);
  }

  // Hantera nästa vecka
  function handleNextWeek(): void {
    const nextWeek = new Date(weekStart);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setWeekStart(nextWeek.toISOString().split('T')[0]);
  }

  // Gå till nuvarande vecka
  function handleCurrentWeek(): void {
    setWeekStart(getWeekStartDate(new Date()));
  }

  // Hantera bokning
  const handleBookingSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    // Validering
    if (!selectedRoom || !bookingDate || !startTime || !endTime || !booker) {
      setErrorMessage('Vänligen fyll i alla obligatoriska fält');
      return;
    }
    
    // Kontrollera tid
    if (startTime >= endTime) {
      setErrorMessage('Sluttiden måste vara efter starttiden');
      return;
    }
    
    try {
      const roomId = parseInt(selectedRoom);
      
      // Kontrollera om det finns överlappande bokningar via API
      const hasOverlap = await bookingsApi.checkOverlap(
        roomId,
        bookingDate,
        startTime,
        endTime,
        editingBookingId || undefined
      );
      
      if (hasOverlap) {
        setErrorMessage('Det finns redan en bokning för denna tid');
        return;
      }
      
      // Hämta valt rum
      const selectedRoomObj = rooms.find(room => room.id === roomId);
      
      if (!selectedRoomObj) {
        setErrorMessage('Valt rum hittades inte');
        return;
      }
      
      // Skapa bokningsobjekt för API
      const bookingData = {
        room_id: roomId,
        date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        booker,
        purpose: purpose || undefined
      };
      
      let updatedBooking: DBBooking;
      
      if (editingBookingId) {
        // Uppdatera existerande bokning
        updatedBooking = await bookingsApi.update(editingBookingId, bookingData);
        
        // Uppdatera lokal state
        setBookings(prevBookings => 
          prevBookings.map(booking => 
            booking.id === editingBookingId 
              ? {
                  id: updatedBooking.id,
                  roomId: updatedBooking.room_id,
                  roomName: selectedRoomObj.name,
                  date: updatedBooking.date,
                  startTime: updatedBooking.start_time,
                  endTime: updatedBooking.end_time,
                  booker: updatedBooking.booker,
                  purpose: updatedBooking.purpose || ''
                } 
              : booking
          )
        );
      } else {
        // Skapa ny bokning
        updatedBooking = await bookingsApi.create(bookingData);
        
        // Lägg till i lokal state
        const newBooking: Booking = {
          id: updatedBooking.id,
          roomId: updatedBooking.room_id,
          roomName: selectedRoomObj.name,
          date: updatedBooking.date,
          startTime: updatedBooking.start_time,
          endTime: updatedBooking.end_time,
          booker: updatedBooking.booker,
          purpose: updatedBooking.purpose || ''
        };
        
        setBookings(prevBookings => [...prevBookings, newBooking]);
      }
      
      // Återställ formulär
      resetForm();
      setCurrentView('week-view');
    } catch (err) {
      console.error('Fel vid bokning:', err);
      setErrorMessage('Ett fel uppstod vid bokningen. Försök igen senare.');
    }
  };

  // Återställ formulär
  const resetForm = (): void => {
    setSelectedRoom('');
    setStartTime('');
    setEndTime('');
    setPurpose('');
    setBooker('');
    setErrorMessage('');
    setEditingBookingId(null);
  };

  // Ta bort bokning
  const handleDeleteBooking = async (id: number): Promise<void> => {
    try {
      await bookingsApi.delete(id);
      setBookings(prevBookings => prevBookings.filter(booking => booking.id !== id));
    } catch (err) {
      console.error(`Fel vid borttagning av bokning med id ${id}:`, err);
      setError('Kunde inte ta bort bokningen. Försök igen senare.');
    }
  };

  // Filtera bokningar baserat på datum
  const filteredBookings = bookings.filter(booking => booking.date === selectedDate);

  // Gruppera bokningar per rum
  const bookingsByRoom = rooms.map(room => ({
    room,
    bookings: filteredBookings.filter(booking => booking.roomId === room.id)
  }));

  // Formatera tid för visning
  const formatTime = (timeString: string): string => {
    return timeString.substring(0, 5);
  };

  // Visa formulär för ny bokning
  const showBookingForm = (): void => {
    resetForm();
    setCurrentView('form');
    const today = new Date().toISOString().split('T')[0];
    setBookingDate(today);
  };

  // Öppna formulär för att redigera en existerande bokning
  const openEditBookingForm = (booking: Booking): void => {
    setSelectedRoom(booking.roomId.toString());
    setBookingDate(booking.date);
    setStartTime(booking.startTime);
    setEndTime(booking.endTime);
    setBooker(booking.booker);
    setPurpose(booking.purpose || '');
    setEditingBookingId(booking.id);
    setCurrentView('form');
  };

  // Hantera klick på en tidscell i kalendern
  const handleCellClick = (roomId: number, date: Date, hour: number): void => {
    setSelectedRoom(roomId.toString());
    setBookingDate(date.toISOString().split('T')[0]);
    setStartTime(`${hour.toString().padStart(2, '0')}:00`);
    setEndTime(`${(hour + 1).toString().padStart(2, '0')}:00`);
    setCurrentView('form');
  };
  
  // Generera arbetstimmar (8-18)
  const workHours = Array.from({ length: 11 }, (_, i) => i + 8);
  const weekDays = getWeekDays(weekStart);

  // Visa laddningsindikator
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4 text-center">
        <div className="text-primary-500 dark:text-primary-400 text-lg font-medium">Laddar...</div>
      </div>
    );
  }

  // Visa felmeddelande
  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          <p className="font-medium">Ett fel uppstod</p>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 text-white rounded-lg transition-colors duration-200"
          >
            Ladda om sidan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 text-gray-800 dark:text-gray-200">
      <h1 className="text-3xl font-bold mb-8 text-center text-primary-700 dark:text-primary-300">
        Sjöbergska Konferensrum
      </h1>
      
      <div className="flex space-x-2 mb-6">
        <button 
          onClick={() => setCurrentView('week-view')} 
          className={`px-4 py-2 rounded-lg transition-colors duration-200 ${currentView === 'week-view' 
            ? 'bg-primary-500 text-white dark:bg-primary-600 shadow-soft' 
            : 'bg-white dark:bg-dark-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-600 border border-gray-200 dark:border-dark-600'}`}
        >
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v10H5V5z" clipRule="evenodd" />
              <path d="M7 7h2v2H7V7zm0 4h2v2H7v-2zm4-4h2v2h-2V7zm0 4h2v2h-2v-2z" />
            </svg>
            Veckokalender
          </div>
        </button>
        <button 
          onClick={() => setCurrentView('calendar')} 
          className={`px-4 py-2 rounded-lg transition-colors duration-200 ${currentView === 'calendar' 
            ? 'bg-primary-500 text-white dark:bg-primary-600 shadow-soft' 
            : 'bg-white dark:bg-dark-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-600 border border-gray-200 dark:border-dark-600'}`}
        >
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
            Dagsvy
          </div>
        </button>
      </div>
      
      {currentView === 'week-view' && (
        <div className="bg-white dark:bg-dark-700 rounded-xl shadow-soft dark:shadow-soft-dark overflow-x-auto">
          <div className="flex justify-between items-center p-4 border-b dark:border-dark-600">
            <div className="flex space-x-2">
              <button 
                onClick={handlePrevWeek}
                className="bg-white hover:bg-gray-100 dark:bg-dark-600 dark:hover:bg-dark-500 dark:text-gray-200 p-2 rounded-lg border border-gray-200 dark:border-dark-500 transition-all duration-200 flex items-center justify-center"
                aria-label="Föregående vecka"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <button 
                onClick={handleCurrentWeek}
                className="bg-white hover:bg-gray-100 dark:bg-dark-600 dark:hover:bg-dark-500 dark:text-gray-200 px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-500 transition-all duration-200 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-500 dark:text-primary-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                Idag
              </button>
              <button 
                onClick={handleNextWeek}
                className="bg-white hover:bg-gray-100 dark:bg-dark-600 dark:hover:bg-dark-500 dark:text-gray-200 p-2 rounded-lg border border-gray-200 dark:border-dark-500 transition-all duration-200 flex items-center justify-center"
                aria-label="Nästa vecka"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <button 
              onClick={showBookingForm}
              className="bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-all duration-200 shadow-soft hover:shadow-soft-lg flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Ny bokning
            </button>
          </div>
          
          <div className="min-w-max">
            <div className="grid grid-cols-8 border-b dark:border-dark-600">
              <div className="p-3 font-medium border-r dark:border-dark-600 bg-gray-50 dark:bg-dark-600"></div>
              {weekDays.map((day, i) => (
                <div key={i} className={`p-3 text-center font-medium ${
                  new Date().toISOString().split('T')[0] === day.toISOString().split('T')[0] 
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border-b-2 border-primary-500 dark:border-primary-400' 
                    : 'bg-gray-50 dark:bg-dark-600 text-gray-700 dark:text-gray-300'
                }`}>
                  {formatDateHeader(day)}
                </div>
              ))}
            </div>
            
            {rooms.map(room => (
              <div key={room.id} className="grid grid-cols-8 border-b dark:border-dark-600 hover:bg-gray-50/50 dark:hover:bg-dark-600/50 transition-colors duration-150">
                <div className="p-3 font-medium border-r dark:border-dark-600 bg-gray-50 dark:bg-dark-700 text-primary-700 dark:text-primary-400 flex items-center">
                  {room.name}
                </div>
                {weekDays.map((day, dayIndex) => (
                  <div key={dayIndex} className="border-r last:border-r-0 dark:border-dark-600">
                    {workHours.map(hour => {
                      const isBooked = hasBookingAt(room.id, day, hour);
                      const bookingInfo = isBooked ? getBookingInfo(room.id, day, hour) : null;
                      const isPastHour = (new Date() > new Date(day.setHours(hour + 1, 0, 0, 0)));
                      
                      // Om denna timme är bokad men förra timmen också var bokad med samma ID, visa inte den här
                      if (isBooked && hour > 8) {
                        const prevBooking = getBookingInfo(room.id, day, hour - 1);
                        if (prevBooking && bookingInfo && prevBooking.id === bookingInfo.id) {
                          return null;
                        }
                      }
                      
                      // Beräkna längden på bokningen i timmar
                      let bookingLength = 1;
                      if (isBooked && bookingInfo) {
                        const startHour = parseInt(bookingInfo.startTime.split(':')[0]);
                        const endHour = parseInt(bookingInfo.endTime.split(':')[0]);
                        bookingLength = endHour - startHour;
                      }
                      
                      return (
                        <div 
                          key={hour} 
                          className={`border-t dark:border-dark-600 p-1 h-14 ${
                            isPastHour 
                              ? 'bg-gray-50 dark:bg-dark-700/50' 
                              : isBooked ? '' : 'hover:bg-gray-50 dark:hover:bg-dark-600 cursor-pointer'
                          } transition-all duration-200`}
                          style={{ 
                            gridRow: isBooked ? `span ${bookingLength}` : 'auto',
                          }}
                          onClick={() => !isBooked && !isPastHour ? handleCellClick(room.id, new Date(day), hour) : null}
                        >
                          {!isBooked ? (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {hour}:00
                            </div>
                          ) : (
                            bookingInfo && (hour === parseInt(bookingInfo.startTime.split(':')[0])) && (
                              <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-lg shadow-soft h-full overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] transform-gpu border border-primary-200 dark:border-primary-800/50" 
                                   title={`${bookingInfo.purpose || 'Bokning'} - ${bookingInfo.booker}`}
                                   onClick={() => openEditBookingForm(bookingInfo)}>
                                <div className="text-xs font-medium text-primary-800 dark:text-primary-300 mb-1">
                                  {formatTime(bookingInfo.startTime)} - {formatTime(bookingInfo.endTime)}
                                </div>
                                <div className="text-xs font-medium truncate text-primary-700 dark:text-primary-400">
                                  {bookingInfo.booker}
                                </div>
                                {bookingInfo.purpose && (
                                  <div className="text-xs truncate text-primary-600 dark:text-primary-500">
                                    {bookingInfo.purpose}
                                  </div>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {currentView === 'calendar' && (
        <>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
            <div className="flex items-center">
              <label htmlFor="date-select" className="mr-2 font-medium text-gray-700 dark:text-gray-300">Välj datum:</label>
              <input 
                id="date-select"
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border dark:border-dark-500 rounded-lg px-3 py-2 bg-white dark:bg-dark-600 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:outline-none transition-shadow duration-200 text-gray-800 dark:text-gray-200" 
              />
            </div>
            <button 
              onClick={showBookingForm}
              className="bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-all duration-200 shadow-soft hover:shadow-soft-lg flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Ny bokning
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {bookingsByRoom.map(({ room, bookings }) => (
              <div key={room.id} className="border dark:border-dark-600 rounded-xl p-6 bg-white dark:bg-dark-700 shadow-soft dark:shadow-soft-dark transition-all duration-300 hover:shadow-soft-lg dark:hover:shadow-soft-lg-dark">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-5 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-300 font-semibold">
                      {room.name.charAt(0)}
                    </div>
                    <h2 className="text-xl font-bold text-primary-700 dark:text-primary-400">
                      {room.name} 
                      <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-400">
                        ({room.capacity} personer)
                      </span>
                    </h2>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 flex flex-wrap gap-2">
                    {room.features.map((feature, index) => (
                      <span key={index} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-dark-600 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-dark-500">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
                
                {bookings.length > 0 ? (
                  <ul className="divide-y dark:divide-dark-600">
                    {bookings
                      .sort((a, b) => a.startTime.localeCompare(b.startTime))
                      .map(booking => (
                        <li key={booking.id} className="py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 group hover:bg-gray-50 dark:hover:bg-dark-600/50 -mx-4 px-4 rounded-lg transition-colors duration-200">
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 border border-primary-200 dark:border-primary-800/30">
                                {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                              </span>
                              <span className="font-medium text-gray-800 dark:text-gray-200">{booking.booker}</span>
                            </div>
                            {booking.purpose && 
                              <p className="text-sm text-gray-600 dark:text-gray-400 ml-1">{booking.purpose}</p>
                            }
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => openEditBookingForm(booking)}
                              className="text-primary-500 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors duration-200 flex items-center gap-1.5 text-sm opacity-0 group-hover:opacity-100"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 20h9"></path>
                                <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                              </svg>
                              Redigera
                            </button>
                            <button 
                              onClick={() => handleDeleteBooking(booking.id)}
                              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200 flex items-center gap-1.5 text-sm opacity-0 group-hover:opacity-100"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18"></path>
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                              </svg>
                              Ta bort
                            </button>
                          </div>
                        </li>
                    ))}
                  </ul>
                ) : (
                  <div className="py-8 text-center border-t dark:border-dark-600">
                    <div className="mx-auto w-16 h-16 mb-4 text-gray-300 dark:text-gray-600">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">Inga bokningar för detta datum</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      
      {currentView === 'form' && (
        <div className="bg-white dark:bg-dark-700 rounded-xl shadow-soft dark:shadow-soft-dark p-6">
          <div className="flex items-center mb-6 gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-primary-700 dark:text-primary-400">
              {editingBookingId ? 'Redigera bokning' : 'Boka konferensrum'}
            </h2>
          </div>
          
          {errorMessage && (
            <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6 flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}
          
          <form onSubmit={handleBookingSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Rum <span className="text-red-500">*</span></label>
                <select 
                  value={selectedRoom} 
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  className="w-full border dark:border-dark-500 rounded-lg px-4 py-2.5 bg-white dark:bg-dark-600 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:outline-none transition-shadow duration-200 text-gray-800 dark:text-gray-200"
                  required
                >
                  <option value="">Välj rum</option>
                  {rooms.map(room => (
                    <option key={room.id} value={room.id}>
                      {room.name} ({room.capacity} personer)
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Datum <span className="text-red-500">*</span></label>
                <input 
                  type="date" 
                  value={bookingDate} 
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full border dark:border-dark-500 rounded-lg px-4 py-2.5 bg-white dark:bg-dark-600 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:outline-none transition-shadow duration-200 text-gray-800 dark:text-gray-200"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Starttid <span className="text-red-500">*</span></label>
                <input 
                  type="time" 
                  value={startTime} 
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full border dark:border-dark-500 rounded-lg px-4 py-2.5 bg-white dark:bg-dark-600 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:outline-none transition-shadow duration-200 text-gray-800 dark:text-gray-200"
                  required
                />
              </div>
              
              <div>
                <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Sluttid <span className="text-red-500">*</span></label>
                <input 
                  type="time" 
                  value={endTime} 
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full border dark:border-dark-500 rounded-lg px-4 py-2.5 bg-white dark:bg-dark-600 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:outline-none transition-shadow duration-200 text-gray-800 dark:text-gray-200"
                  required
                />
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Bokad av <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                value={booker} 
                onChange={(e) => setBooker(e.target.value)}
                className="w-full border dark:border-dark-500 rounded-lg px-4 py-2.5 bg-white dark:bg-dark-600 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:outline-none transition-shadow duration-200 text-gray-800 dark:text-gray-200"
                placeholder="Ditt namn"
                required
              />
            </div>
            
            <div className="mb-8">
              <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Syfte</label>
              <input 
                type="text" 
                value={purpose} 
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full border dark:border-dark-500 rounded-lg px-4 py-2.5 bg-white dark:bg-dark-600 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:outline-none transition-shadow duration-200 text-gray-800 dark:text-gray-200"
                placeholder="T.ex. Projektmöte, Kundmöte, etc."
              />
            </div>
            
            <div className="flex justify-end space-x-4">
              <button 
                type="button" 
                onClick={() => setCurrentView(editingBookingId ? 'calendar' : 'calendar')}
                className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-dark-500 bg-white hover:bg-gray-50 dark:bg-dark-600 dark:hover:bg-dark-500 dark:text-gray-200 transition-all duration-200 shadow-sm"
              >
                Avbryt
              </button>
              <button 
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 text-white font-medium transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {editingBookingId ? 'Spara ändringar' : 'Boka rum'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ConferenceRoomBooking; 