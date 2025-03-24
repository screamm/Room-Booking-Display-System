import React, { useState, useEffect } from 'react';

// Definiera bokningstypen
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

// Definiera rumstypen
interface Room {
  id: number;
  name: string;
  capacity: number;
  features: string[];
}

const ConferenceRoomBooking: React.FC = () => {
  // Rum data
  const rooms: Room[] = [
    { id: 1, name: 'Svea', capacity: 8, features: ['Projektor', 'Whiteboard'] },
    { id: 2, name: 'Göta', capacity: 12, features: ['Projektor', 'Whiteboard', 'Videokonferens'] },
    { id: 3, name: 'Vasa', capacity: 4, features: ['Skärm', 'Whiteboard'] },
    { id: 4, name: 'Kalmar', capacity: 20, features: ['Projektor', 'Whiteboard', 'Videokonferens'] },
  ];

  // State för bokningar och formulär
  const [bookings, setBookings] = useState<Booking[]>([]);
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

  // Ladda sparade bokningar från localStorage vid start
  useEffect(() => {
    const savedBookings = localStorage.getItem('roomBookings');
    if (savedBookings) {
      setBookings(JSON.parse(savedBookings));
    }
  }, []);

  // Spara bokningar till localStorage när de ändras
  useEffect(() => {
    localStorage.setItem('roomBookings', JSON.stringify(bookings));
  }, [bookings]);

  // Dagens datum som default för bokningsformuläret
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setBookingDate(today);
  }, []);

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
  const handleBookingSubmit = (e: React.FormEvent): void => {
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
    
    // Kontrollera överlapp med befintliga bokningar
    const overlappingBooking = bookings.find(booking => 
      booking.roomId === parseInt(selectedRoom) && 
      booking.date === bookingDate &&
      ((startTime >= booking.startTime && startTime < booking.endTime) ||
       (endTime > booking.startTime && endTime <= booking.endTime) ||
       (startTime <= booking.startTime && endTime >= booking.endTime))
    );
    
    if (overlappingBooking) {
      setErrorMessage('Det finns redan en bokning för denna tid');
      return;
    }
    
    // Skapa ny bokning
    const selectedRoomObj = rooms.find(room => room.id === parseInt(selectedRoom));
    
    if (!selectedRoomObj) {
      setErrorMessage('Valt rum hittades inte');
      return;
    }
    
    const newBooking: Booking = {
      id: Date.now(),
      roomId: parseInt(selectedRoom),
      roomName: selectedRoomObj.name,
      date: bookingDate,
      startTime,
      endTime,
      booker,
      purpose
    };
    
    setBookings([...bookings, newBooking]);
    
    // Återställ formulär
    setSelectedRoom('');
    setStartTime('');
    setEndTime('');
    setPurpose('');
    setErrorMessage('');
    setCurrentView('week-view');
  };

  // Ta bort bokning
  const handleDeleteBooking = (id: number): void => {
    setBookings(bookings.filter(booking => booking.id !== id));
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
    setCurrentView('form');
    const today = new Date().toISOString().split('T')[0];
    setBookingDate(today);
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

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-center">Konferensrumsbokningssystem</h1>
      
      <div className="flex space-x-2 mb-4">
        <button 
          onClick={() => setCurrentView('week-view')} 
          className={`px-4 py-2 rounded ${currentView === 'week-view' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Veckokalender
        </button>
        <button 
          onClick={() => setCurrentView('calendar')} 
          className={`px-4 py-2 rounded ${currentView === 'calendar' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Dagsvy
        </button>
      </div>
      
      {currentView === 'week-view' && (
        <div className="bg-white rounded shadow overflow-x-auto">
          <div className="flex justify-between items-center p-4 border-b">
            <div className="flex space-x-2">
              <button 
                onClick={handlePrevWeek}
                className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded"
              >
                &lt;
              </button>
              <button 
                onClick={handleCurrentWeek}
                className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded"
              >
                Idag
              </button>
              <button 
                onClick={handleNextWeek}
                className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded"
              >
                &gt;
              </button>
            </div>
            <button 
              onClick={showBookingForm}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Ny bokning
            </button>
          </div>
          
          <div className="min-w-max">
            <div className="grid grid-cols-8 border-b">
              <div className="p-2 font-medium border-r bg-gray-100"></div>
              {weekDays.map((day, i) => (
                <div key={i} className={`p-2 text-center font-medium ${new Date().toISOString().split('T')[0] === day.toISOString().split('T')[0] ? 'bg-blue-50' : 'bg-gray-100'}`}>
                  {formatDateHeader(day)}
                </div>
              ))}
            </div>
            
            {rooms.map(room => (
              <div key={room.id} className="grid grid-cols-8 border-b">
                <div className="p-2 font-medium border-r bg-gray-50">
                  {room.name}
                </div>
                {weekDays.map((day, dayIndex) => (
                  <div key={dayIndex} className="border-r last:border-r-0">
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
                          className={`border-t p-1 h-12 ${isPastHour ? 'bg-gray-100' : ''}`}
                          style={{ 
                            gridRow: isBooked ? `span ${bookingLength}` : 'auto',
                          }}
                          onClick={() => !isBooked && !isPastHour ? handleCellClick(room.id, new Date(day), hour) : null}
                        >
                          {!isBooked ? (
                            <div className="text-xs text-gray-500">
                              {hour}:00
                            </div>
                          ) : (
                            bookingInfo && (hour === parseInt(bookingInfo.startTime.split(':')[0])) && (
                              <div className="bg-blue-100 p-1 rounded h-full overflow-hidden cursor-pointer" 
                                   title={`${bookingInfo.purpose || 'Bokning'} - ${bookingInfo.booker}`}>
                                <div className="text-xs font-medium text-blue-800">
                                  {formatTime(bookingInfo.startTime)} - {formatTime(bookingInfo.endTime)}
                                </div>
                                <div className="text-xs truncate text-blue-600">
                                  {bookingInfo.booker}
                                </div>
                                {bookingInfo.purpose && (
                                  <div className="text-xs truncate text-blue-500">
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
          <div className="flex justify-between items-center mb-4">
            <div>
              <label htmlFor="date-select" className="mr-2 font-medium">Välj datum:</label>
              <input 
                id="date-select"
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border rounded px-2 py-1" 
              />
            </div>
            <button 
              onClick={showBookingForm}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Ny bokning
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {bookingsByRoom.map(({ room, bookings }) => (
              <div key={room.id} className="border rounded p-4">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-xl font-semibold">{room.name} ({room.capacity} personer)</h2>
                  <div className="text-sm text-gray-600">
                    {room.features.join(', ')}
                  </div>
                </div>
                
                {bookings.length > 0 ? (
                  <ul>
                    {bookings
                      .sort((a, b) => a.startTime.localeCompare(b.startTime))
                      .map(booking => (
                        <li key={booking.id} className="border-t py-2 flex justify-between">
                          <div>
                            <span className="font-medium">
                              {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                            </span>
                            <span className="mx-2">•</span>
                            <span>{booking.booker}</span>
                            {booking.purpose && <p className="text-sm text-gray-600">{booking.purpose}</p>}
                          </div>
                          <button 
                            onClick={() => handleDeleteBooking(booking.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            Ta bort
                          </button>
                        </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 py-2">Inga bokningar för detta datum</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      
      {currentView === 'form' && (
        <div className="bg-white rounded shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Boka konferensrum</h2>
          
          {errorMessage && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
              {errorMessage}
            </div>
          )}
          
          <form onSubmit={handleBookingSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block mb-1 font-medium">Rum *</label>
                <select 
                  value={selectedRoom} 
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  className="w-full border rounded px-3 py-2"
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
                <label className="block mb-1 font-medium">Datum *</label>
                <input 
                  type="date" 
                  value={bookingDate} 
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block mb-1 font-medium">Starttid *</label>
                <input 
                  type="time" 
                  value={startTime} 
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              
              <div>
                <label className="block mb-1 font-medium">Sluttid *</label>
                <input 
                  type="time" 
                  value={endTime} 
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block mb-1 font-medium">Bokad av *</label>
              <input 
                type="text" 
                value={booker} 
                onChange={(e) => setBooker(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="Ditt namn"
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block mb-1 font-medium">Syfte</label>
              <input 
                type="text" 
                value={purpose} 
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="T.ex. Projektmöte, Kundmöte, etc."
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <button 
                type="button" 
                onClick={() => setCurrentView('calendar')}
                className="border px-4 py-2 rounded hover:bg-gray-100"
              >
                Avbryt
              </button>
              <button 
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                Boka rum
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ConferenceRoomBooking; 