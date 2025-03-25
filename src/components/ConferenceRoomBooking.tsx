import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { roomsApi, bookingsApi } from '../lib/api';
import type { Room, Booking as DBBooking, BookingType } from '../types/database.types';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from './ConfirmModal';
import ResponsiveBookingForm from './ResponsiveBookingForm';
import MobileBookingView from './MobileBookingView';
import CalendarWidget from './CalendarWidget';
import SearchAndFilter from './SearchAndFilter';
import RecurringBookingForm from './RecurringBookingForm';
import MobileBottomMenu from './MobileBottomMenu';
import ColorCodingLegend from './ColorCodingLegend';
import DraggableBookingCell from './DraggableBookingCell';
import EmergencyBookingButton from './EmergencyBookingButton';
import GoogleCalendarSync from './GoogleCalendarSync';
import { format, addDays, startOfWeek, parseISO, isAfter, isBefore, subDays, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { sv } from 'date-fns/locale';
import { formatTime } from '../utils/dateUtils';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import ThemeToggle from './ThemeToggle';

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
  bookingType?: BookingType;
}

// Färgkodning för olika bokningstyper
const bookingTypeColors = {
  meeting: 'bg-blue-500',
  presentation: 'bg-green-500',
  workshop: 'bg-purple-500',
  internal: 'bg-amber-500',
  external: 'bg-red-500'
};

// Funktion för att få bakgrundsfärg baserat på bokningstyp
const getBookingTypeColor = (bookingType?: BookingType): string => {
  if (!bookingType || !bookingTypeColors[bookingType]) {
    return 'bg-gray-400'; // Standardfärg för odefinierad typ
  }
  return bookingTypeColors[bookingType];
};

const ConferenceRoomBooking: React.FC = () => {
  // Använd toast-notifikationer
  const { showToast } = useToast();
  
  // State för rum, bokningar och formulär
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Legacy state för bakåtkompatibilitet
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [bookingDate, setBookingDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [booker, setBooker] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('');
  
  const [currentView, setCurrentView] = useState<string>(
    localStorage.getItem('conferenceRoomView') || 'calendar'
  ); // 'calendar', 'form', 'week-view', 'mobile-view', 'recurring-form'
  const [previousView, setPreviousView] = useState<string>('calendar'); // För att spara föregående vy
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [weekStart, setWeekStart] = useState<string>(getWeekStartDate(new Date()));
  const [editingBookingId, setEditingBookingId] = useState<number | null>(null);
  
  // State för bekräftelsedialog
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<boolean>(false);
  const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);
  
  // State för mobilanpassning
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);
  
  // State för sök och filter
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [searchFilters, setSearchFilters] = useState({
    searchQuery: '',
    selectedRooms: [] as number[],
    selectedFeatures: [] as string[],
    minCapacity: 0,
    dateRange: { start: selectedDate, end: null as string | null }
  });
  
  // State för återkommande bokningar
  const [showRecurringForm, setShowRecurringForm] = useState<boolean>(false);
  const [recurringBookingData, setRecurringBookingData] = useState<any>(null);
  
  // State för ResponsiveBookingForm
  const [formData, setFormData] = useState({
    id: null as number | null,
    roomId: null as number | null,
    date: selectedDate,
    startTime: '08:00',
    endTime: '09:00',
    booker: '',
    purpose: '',
    bookingType: 'meeting' as BookingType | undefined
  });

  // Ref för tabellkontainern för tangentbordsnavigering
  const gridRef = useRef<HTMLDivElement>(null);
  const [focusPosition, setFocusPosition] = useState({ roomIndex: 0, dayIndex: 0, hourIndex: 0 });

  // Lyssna på fönsterstorlek för mobilanpassning
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
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
        showToast('Kunde inte ladda data från servern', 'error');
        setLoading(false);
      }
    }
    
    loadData();
  }, [showToast]);

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

  // Generera arbetstimmar (8-18)
  const workHours = Array.from({ length: 11 }, (_, i) => i + 8);
  
  // Generera veckodagar från startdatum
  const weekDays = getWeekDays(weekStart);

  // Visa formulär för ny bokning
  const showBookingForm = (): void => {
    resetForm();
    setPreviousView(currentView); // Spara nuvarande vy
    setCurrentView('form');
    const today = new Date().toISOString().split('T')[0];
    setBookingDate(today);
  };

  // Öppna formulär för att redigera en existerande bokning
  const handleEditBooking = (id: number): void => {
    const booking = bookings.find(b => b.id === id);
    if (booking) {
      setSelectedRoom(booking.roomId.toString());
      setBookingDate(booking.date);
      setStartTime(booking.startTime);
      setEndTime(booking.endTime);
      setBooker(booking.booker);
      setPurpose(booking.purpose || '');
      setEditingBookingId(booking.id);
      setFormData({
        id: booking.id,
        roomId: booking.roomId,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        booker: booking.booker,
        purpose: booking.purpose,
        bookingType: booking.bookingType || 'meeting',
      });
      setPreviousView(currentView);
      setCurrentView('form');
    }
  };

  // Hantera klick på en tidscell i kalendern
  const handleCellClick = (roomId: number, date: Date, hour: number): void => {
    setSelectedRoom(roomId.toString());
    setBookingDate(date.toISOString().split('T')[0]);
    setStartTime(`${hour.toString().padStart(2, '0')}:00`);
    setEndTime(`${(hour + 1).toString().padStart(2, '0')}:00`);
    setPreviousView(currentView);
    setCurrentView('form');
  };

  // Hantera drag-end för att skapa bokning
  const handleDragEndBooking = (roomId: number, day: Date, startHour: number, endHour: number): void => {
    // Formatera data för formuläret
    const date = day.toISOString().split('T')[0];
    const startTime = `${startHour.toString().padStart(2, '0')}:00`;
    const endTime = `${endHour.toString().padStart(2, '0')}:00`;
    
    // Sätt formulärdata och öppna bokningsformuläret
    setSelectedRoom(roomId.toString());
    setBookingDate(date);
    setStartTime(startTime);
    setEndTime(endTime);
    setPreviousView(currentView);
    setCurrentView('form');
    
    // Visa en toast-notifiering
    showToast('Släpp och dra för att skapa ny bokning!', 'success');
  };

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
        purpose: booking.purpose || '',
        bookingType: booking.booking_type || 'meeting',
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
      purpose: booking.purpose,
      booking_type: booking.bookingType,
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

  // Funktion för att formatera tid (24h -> mer läsbar)
  function formatTime(time: string): string {
    if (!time) return '';
    
    const [hours, minutes] = time.split(':');
    
    // Returnera som 24-timmarsformat (8:00 istället för 08:00)
    return `${parseInt(hours)}:${minutes}`;
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
                  purpose: updatedBooking.purpose || '',
                  bookingType: updatedBooking.booking_type || 'meeting',
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
          purpose: updatedBooking.purpose || '',
          bookingType: updatedBooking.booking_type || 'meeting',
        };
        
        setBookings(prevBookings => [...prevBookings, newBooking]);
      }
      
      // Återställ formulär
      resetForm();
      updateCurrentView(previousView); // Återgå till föregående vy
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
      setShowDeleteConfirmation(false);
      setBookingToDelete(null);
      
      // Om vi tar bort i redigeringsläge, återgå till föregående vy
      if (currentView === 'form' && editingBookingId === id) {
        updateCurrentView(previousView);
      }
    } catch (err) {
      console.error(`Fel vid borttagning av bokning med id ${id}:`, err);
      setError('Kunde inte ta bort bokningen. Försök igen senare.');
    }
  };
  
  // Visa bekräftelsedialog för borttagning
  const confirmDeleteBooking = (booking: Booking): void => {
    setBookingToDelete(booking);
    setShowDeleteConfirmation(true);
  };

  // Filtera bokningar baserat på datum
  const dateFilteredBookings = bookings.filter(booking => booking.date === selectedDate);

  // Gruppera bokningar per rum
  const bookingsByRoom = rooms.map(room => ({
    room,
    bookings: dateFilteredBookings.filter(booking => booking.roomId === room.id)
  }));

  // Funktion för att uppdatera aktuell vy och spara i localStorage
  const updateCurrentView = (view: string): void => {
    setCurrentView(view);
    localStorage.setItem('conferenceRoomView', view);
  };

  // Hantera filterändringar
  const handleFilterChange = useCallback((filters: any) => {
    setSearchFilters(filters);
    
    // Filtrera bokningar baserat på sökfilter
    let filtered = [...bookings];
    
    // Filtrera baserat på datum/datumintervall
    if (filters.dateRange.start) {
      if (filters.dateRange.end) {
        // Datumintervall
        filtered = filtered.filter(booking => {
          const bookingDate = new Date(booking.date);
          const startDate = new Date(filters.dateRange.start);
          const endDate = new Date(filters.dateRange.end);
          return bookingDate >= startDate && bookingDate <= endDate;
        });
      } else {
        // Enskilt datum
        filtered = filtered.filter(booking => booking.date === filters.dateRange.start);
      }
    }
    
    // Filtrera baserat på rum
    if (filters.selectedRooms.length > 0) {
      filtered = filtered.filter(booking => 
        filters.selectedRooms.includes(booking.roomId)
      );
    }
    
    // Filtrera baserat på kapacitet
    if (filters.minCapacity > 0) {
      filtered = filtered.filter(booking => {
        const room = rooms.find(r => r.id === booking.roomId);
        return room && room.capacity >= filters.minCapacity;
      });
    }
    
    // Filtrera baserat på features
    if (filters.selectedFeatures.length > 0) {
      filtered = filtered.filter(booking => {
        const room = rooms.find(r => r.id === booking.roomId);
        if (!room) return false;
        
        // Kontrollera om rummet har alla valda features
        return filters.selectedFeatures.every((feature: string) => 
          room.features.includes(feature)
        );
      });
    }
    
    // Filtrera baserat på sökfråga
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(booking => 
        booking.roomName.toLowerCase().includes(query) ||
        booking.booker.toLowerCase().includes(query) ||
        (booking.purpose && booking.purpose.toLowerCase().includes(query))
      );
    }
    
    setFilteredBookings(filtered);
  }, [bookings, rooms]);
  
  // Uppdatera filtrerade bokningar när bookings eller selectedDate ändras
  useEffect(() => {
    handleFilterChange({
      ...searchFilters,
      dateRange: { start: selectedDate, end: null }
    });
  }, [bookings, selectedDate, handleFilterChange]);
  
  // Hantera återkommande bokningar
  const handleShowRecurringForm = () => {
    setRecurringBookingData({
      roomId: formData.roomId || parseInt(selectedRoom),
      date: formData.date || bookingDate,
      startTime: formData.startTime || startTime,
      endTime: formData.endTime || endTime,
      booker: formData.booker || booker,
      purpose: formData.purpose || purpose
    });
    setShowRecurringForm(true);
    setPreviousView(currentView);
    updateCurrentView('recurring-form');
  };
  
  // Skapa flera återkommande bokningar
  const handleCreateRecurringBookings = async (recurringBookings: any[]) => {
    try {
      setLoading(true);
      let createdCount = 0;
      
      for (const bookingData of recurringBookings) {
        // Kontrollera överlapp för varje bokning
        const hasOverlap = await bookingsApi.checkOverlap(
          bookingData.roomId,
          bookingData.date,
          bookingData.startTime,
          bookingData.endTime
        );
        
        if (!hasOverlap) {
          // Mappa till DB-format
          const dbBooking = {
            room_id: bookingData.roomId,
            date: bookingData.date,
            start_time: bookingData.startTime,
            end_time: bookingData.endTime,
            booker: bookingData.booker,
            purpose: bookingData.purpose || undefined
          };
          
          // Skapa bokning
          const createdBooking = await bookingsApi.create(dbBooking);
          createdCount++;
          
          // Hämta rumsnamn
          const selectedRoomObj = rooms.find(room => room.id === bookingData.roomId);
          
          // Lägg till i lokal state
          if (createdBooking) {
            const newBooking: Booking = {
              id: createdBooking.id,
              roomId: createdBooking.room_id,
              roomName: selectedRoomObj ? selectedRoomObj.name : 'Okänt rum',
              date: createdBooking.date,
              startTime: createdBooking.start_time,
              endTime: createdBooking.end_time,
              booker: createdBooking.booker,
              purpose: createdBooking.purpose || '',
              bookingType: createdBooking.booking_type || 'meeting',
            };
            
            setBookings(prevBookings => [...prevBookings, newBooking]);
          }
        }
      }
      
      setLoading(false);
      showToast(`${createdCount} återkommande bokningar skapade`, 'success');
      
      // Återgå till föregående vy
      setShowRecurringForm(false);
      updateCurrentView(previousView);
      
    } catch (err) {
      console.error('Fel vid skapande av återkommande bokningar:', err);
      showToast('Ett fel uppstod vid skapande av återkommande bokningar', 'error');
      setLoading(false);
    }
  };

  // Renderingslogik för bokningslista
  const renderBookingsList = () => {
    const currentDateBookings = filteredBookings.length > 0 
      ? filteredBookings.filter(b => b.date === selectedDate)
      : bookings.filter(b => b.date === selectedDate);
    
    if (currentDateBookings.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Inga bokningar för det valda datumet.
        </div>
      );
    }
    
    // Sortera bokningar efter starttid
    const sortedBookings = [...currentDateBookings].sort((a, b) => 
      a.startTime.localeCompare(b.startTime)
    );
    
    return (
      <div className="space-y-3">
        {sortedBookings.map(booking => (
          <div 
            key={booking.id} 
            className={`p-4 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md ${getBookingTypeColor(booking.bookingType)} bg-opacity-10 hover:bg-opacity-20 border border-l-4 ${getBookingTypeColor(booking.bookingType).replace('bg-', 'border-')}`}
            onClick={() => handleEditBooking(booking.id)}
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{booking.startTime} - {booking.endTime}</span>
                <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{booking.roomName}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Bokat av: {booking.booker}</p>
                {booking.purpose && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{booking.purpose}</p>
                )}
              </div>
              <div className="flex flex-col items-end">
                <span className={`text-xs px-2 py-0.5 rounded-full ${getBookingTypeColor(booking.bookingType)} text-white mb-2`}>
                  {booking.bookingType && booking.bookingType.charAt(0).toUpperCase() + booking.bookingType.slice(1) || 'Möte'}
                </span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setBookingToDelete(booking);
                    setShowDeleteConfirmation(true);
                  }}
                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                >
                  Ta bort
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Funktion för att hantera tangentbordsnavigation i rutnätet
  const handleGridKeyDown = (e: React.KeyboardEvent) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      return;
    }
    
    e.preventDefault();
    
    const roomsCount = rooms.length;
    const daysCount = 5; // Måndag till fredag
    const hoursCount = 9; // 8:00 till 17:00
    
    let { roomIndex, dayIndex, hourIndex } = focusPosition;
    
    switch (e.key) {
      case 'ArrowUp':
        hourIndex = Math.max(0, hourIndex - 1);
        break;
      case 'ArrowDown':
        hourIndex = Math.min(hoursCount - 1, hourIndex + 1);
        break;
      case 'ArrowLeft':
        dayIndex = Math.max(0, dayIndex - 1);
        break;
      case 'ArrowRight':
        dayIndex = Math.min(daysCount - 1, dayIndex + 1);
        break;
      case 'Home':
        if (e.ctrlKey) {
          roomIndex = 0;
          dayIndex = 0;
          hourIndex = 0;
        } else {
          dayIndex = 0;
        }
        break;
      case 'End':
        if (e.ctrlKey) {
          roomIndex = roomsCount - 1;
          dayIndex = daysCount - 1;
          hourIndex = hoursCount - 1;
        } else {
          dayIndex = daysCount - 1;
        }
        break;
    }
    
    setFocusPosition({ roomIndex, dayIndex, hourIndex });
    
    // Hitta den relevanta cellen och fokusera på den
    const grid = gridRef.current;
    if (grid) {
      const targetCell = grid.querySelector(`[data-room-index="${roomIndex}"][data-day-index="${dayIndex}"][data-hour-index="${hourIndex}"]`);
      if (targetCell instanceof HTMLElement) {
        targetCell.focus();
      }
    }
  };

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
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Konferensrumsbokning</h1>
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <GoogleCalendarSync onSyncComplete={() => {
            // Ladda om bokningar efter synkronisering
            loadAllBookings();
          }} />
          <ThemeToggle />
        </div>
      </div>
      
      <div className="flex space-x-2 mb-6">
        <button 
          onClick={() => updateCurrentView('week-view')} 
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
          onClick={() => updateCurrentView('calendar')} 
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
        
        <EmergencyBookingButton onBookingCreated={loadAllBookings} />
      </div>
      
      {currentView === 'week-view' && (
        <DndProvider backend={HTML5Backend}>
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
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400 italic hidden md:inline">Du kan dra för att boka flera timmar</span>
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
            </div>
            
            <div className="min-w-max">
              <div className="grid grid-cols-8 border-b dark:border-dark-600" role="row">
                <div className="p-3 font-medium border-r dark:border-dark-600 bg-gray-50 dark:bg-dark-600" role="columnheader"></div>
                {weekDays.map((day, i) => (
                  <div 
                    key={i} 
                    className={`p-3 text-center font-medium ${
                      new Date().toISOString().split('T')[0] === day.toISOString().split('T')[0] 
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border-b-2 border-primary-500 dark:border-primary-400' 
                        : 'bg-gray-50 dark:bg-dark-600 text-gray-700 dark:text-gray-300'
                    }`}
                    role="columnheader"
                    aria-label={formatDateHeader(day)}
                  >
                    {formatDateHeader(day)}
                  </div>
                ))}
              </div>
              
              {rooms.map(room => (
                <div 
                  key={room.id} 
                  className="grid grid-cols-8 border-b dark:border-dark-600 hover:bg-gray-50/50 dark:hover:bg-dark-600/50 transition-colors duration-150"
                  role="row"
                >
                  <div 
                    className="p-3 font-medium border-r dark:border-dark-600 bg-gray-50 dark:bg-dark-700 text-primary-700 dark:text-primary-400 flex items-center"
                    role="rowheader"
                  >
                    {room.name}
                  </div>
                  {weekDays.map((day, dayIndex) => (
                    <div 
                      key={dayIndex} 
                      className="border-r last:border-r-0 dark:border-dark-600"
                      role="gridcell"
                    >
                      {workHours.map(hour => {
                        const isBooked = hasBookingAt(room.id, day, hour);
                        const bookingInfo = isBooked ? getBookingInfo(room.id, day, hour) : null;
                        const isPastHour = (new Date() > new Date(new Date(day).setHours(hour + 1, 0, 0, 0)));
                        
                        // Om denna timme är bokad men förra timmen också var bokad med samma ID, visa inte den här
                        if (isBooked && hour > 8) {
                          const prevBooking = getBookingInfo(room.id, day, hour - 1);
                          if (prevBooking && bookingInfo && prevBooking.id === bookingInfo.id) {
                            return null;
                          }
                        }
                        
                        return (
                          <DraggableBookingCell
                            key={hour}
                            roomId={room.id}
                            day={new Date(day)}
                            hour={hour}
                            isPastHour={isPastHour}
                            isBooked={isBooked}
                            bookingInfo={bookingInfo}
                            formatTime={formatTime}
                            onCellClick={handleCellClick}
                            onEditBooking={handleEditBooking}
                            onDeleteBooking={confirmDeleteBooking}
                            onDragEnd={handleDragEndBooking}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </DndProvider>
      )}
      
      {currentView === 'calendar' && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">
              Bokningar {selectedDate && new Date(selectedDate).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>
            <button
              onClick={showBookingForm}
              className="bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 text-white p-2 rounded-lg transition-all duration-200 shadow-soft"
              aria-label="Ny bokning"
            >
              <div className="flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                <span>Ny bokning</span>
              </div>
            </button>
          </div>
        
          {/* Visa för stationära enheter */}
          <div className="hidden md:block">
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
                                onClick={() => handleEditBooking(booking.id)}
                                className="text-primary-500 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors duration-200 flex items-center gap-1.5 text-sm opacity-0 group-hover:opacity-100"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M12 20h9"></path>
                                  <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                </svg>
                                Redigera
                              </button>
                              <button 
                                onClick={() => confirmDeleteBooking(booking)}
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
          </div>
          
          {/* Visa för mobila enheter */}
          <div className="md:hidden">
            <MobileBookingView 
              rooms={rooms}
              bookings={dateFilteredBookings}
              selectedDate={selectedDate}
              onNewBooking={showBookingForm}
              onEditBooking={handleEditBooking}
            />
          </div>
        </div>
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
              {editingBookingId && (
                <button 
                  type="button" 
                  onClick={() => confirmDeleteBooking({
                    id: editingBookingId,
                    roomId: parseInt(selectedRoom),
                    roomName: rooms.find(r => r.id === parseInt(selectedRoom))?.name || 'Okänt rum',
                    date: bookingDate,
                    startTime,
                    endTime,
                    booker,
                    purpose: purpose || '',
                    bookingType: bookings.find(b => b.id === editingBookingId)?.bookingType || 'meeting',
                  })}
                  className="px-5 py-2.5 rounded-lg border border-red-300 dark:border-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 transition-all duration-200 shadow-sm flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  </svg>
                  Ta bort bokning
                </button>
              )}
              <button 
                type="button" 
                onClick={() => updateCurrentView(previousView)}
                className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-dark-500 bg-white hover:bg-gray-50 dark:bg-dark-600 dark:hover:bg-dark-500 dark:text-gray-200 transition-all duration-200 shadow-sm"
              >
                Avbryt
              </button>
              <button 
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 text-white font-medium transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {editingBookingId ? 'Spara ändringar' : 'Boka rum'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bekräftelsedialog för borttagning */}
      {showDeleteConfirmation && bookingToDelete && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-700 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="text-center mb-4">
              <div className="mx-auto w-12 h-12 mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">Bekräfta borttagning</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Är du säker på att du vill ta bort denna bokning?
              </p>
              <div className="text-sm text-left bg-gray-50 dark:bg-dark-600 p-3 rounded-lg mb-4">
                <p><strong>Rum:</strong> {bookingToDelete.roomName}</p>
                <p><strong>Datum:</strong> {new Date(bookingToDelete.date).toLocaleDateString('sv-SE')}</p>
                <p><strong>Tid:</strong> {formatTime(bookingToDelete.startTime)} - {formatTime(bookingToDelete.endTime)}</p>
                <p><strong>Bokad av:</strong> {bookingToDelete.booker}</p>
                {bookingToDelete.purpose && <p><strong>Syfte:</strong> {bookingToDelete.purpose}</p>}
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirmation(false)}
                className="w-1/2 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-dark-500 bg-white hover:bg-gray-50 dark:bg-dark-600 dark:hover:bg-dark-500 dark:text-gray-200 transition-all duration-200 shadow-sm"
              >
                Avbryt
              </button>
              <button
                onClick={() => handleDeleteBooking(bookingToDelete.id)}
                className="w-1/2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white font-medium transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                </svg>
                Ta bort
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobil-meny i botten */}
      {isMobile && (
        <MobileBottomMenu
          currentView={currentView}
          onChangeView={updateCurrentView}
          onNewBooking={showBookingForm}
          onEmergencyBooking={() => {
            // Vi skapar en referens till en ny EmergencyBookingButton för att trigga dess funktion
            const button = document.querySelector('.emergency-booking-button') as HTMLElement;
            if (button) button.click();
          }}
        />
      )}
    </div>
  );
};

export default ConferenceRoomBooking; 