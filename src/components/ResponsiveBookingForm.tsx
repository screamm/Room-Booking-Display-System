import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Room, BookingType } from '../types/database.types';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { bookingsApi } from '../lib/api';

interface ResponsiveBookingFormProps {
  rooms: Room[];
  initialData?: {
    id?: number;
    roomId?: number;
    date?: string;
    startTime?: string;
    endTime?: string;
    booker?: string;
    purpose?: string;
    attendees?: number;
    bookingType?: BookingType;
  };
  onSubmit: (formData: any) => void;
  onCancel: () => void;
  onDelete?: () => void;
  onRecurring?: () => void;
  isEditing?: boolean;
}

const ResponsiveBookingForm: React.FC<ResponsiveBookingFormProps> = ({
  rooms,
  initialData = {},
  onSubmit,
  onCancel,
  onDelete,
  onRecurring,
  isEditing = false
}) => {
  // Hämta användarpreferenser
  const { preferences, updatePreferences } = useUserPreferences();
  
  // Form state
  const [formData, setFormData] = useState({
    roomId: initialData.roomId?.toString() || preferences.defaultRoomId?.toString() || '',
    date: initialData.date || new Date().toISOString().split('T')[0],
    startTime: initialData.startTime || '08:00',
    endTime: initialData.endTime || calculateEndTime('08:00', preferences.defaultBookingDuration),
    booker: initialData.booker || preferences.bookerName || '',
    purpose: initialData.purpose || '',
    attendees: initialData.attendees || 1,
    bookingType: initialData.bookingType || preferences.defaultBookingType as BookingType,
  });

  // Memoized calculateEndTime function
  const calculateEndTime = useCallback((startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    
    let endHour = hours;
    let endMinute = minutes + durationMinutes;
    
    while (endMinute >= 60) {
      endMinute -= 60;
      endHour += 1;
    }
    
    // Begränsa till max 17:00
    if (endHour > 17 || (endHour === 17 && endMinute > 0)) {
      endHour = 17;
      endMinute = 0;
    }
    
    return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
  }, []);

  // Rekommenderat rum
  const [suggestedRoom, setSuggestedRoom] = useState<Room | null>(null);

  // Validation state
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  // Memoized availableRooms
  const availableRooms = useMemo(() => {
    return rooms.filter(room => {
      // Lägg till eventuella filter här
      return true;
    });
  }, [rooms]);
  
  // Memoized timeOptions
  const timeOptions = useMemo(() => {
    const options = [];
    for (let hour = 8; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        options.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      }
    }
    return options;
  }, []);
  
  // Bokningstyper med färger
  const bookingTypes = [
    { id: 'meeting', name: 'Möte', color: 'bg-blue-500' },
    { id: 'presentation', name: 'Presentation', color: 'bg-green-500' },
    { id: 'workshop', name: 'Workshop', color: 'bg-purple-500' },
    { id: 'internal', name: 'Internt', color: 'bg-amber-500' },
    { id: 'external', name: 'Extern kund', color: 'bg-red-500' },
  ];
  
  // Hantera input-ändringar
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Ta bort felet när användaren börjar skriva
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Sätt snabbtider baserat på startid
  const setQuickTime = (durationMinutes: number) => {
    const newEndTime = calculateEndTime(formData.startTime, durationMinutes);
    
    setFormData(prev => ({
      ...prev,
      endTime: newEndTime
    }));
    
    // Spara den valda varaktigheten till användarpreferenser
    updatePreferences({
      defaultBookingDuration: durationMinutes
    });
  };
  
  // Validera formuläret
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    // Kontrollera att ett rum är valt
    if (!formData.roomId) {
      newErrors.roomId = 'Välj ett rum';
    }
    
    // Kontrollera att ett datum är valt
    if (!formData.date) {
      newErrors.date = 'Välj ett datum';
    }
    
    // Kontrollera att sluttiden är efter starttiden
    if (formData.startTime >= formData.endTime) {
      newErrors.endTime = 'Sluttid måste vara efter starttid';
    }
    
    // Kontrollera att det finns en bokare
    if (!formData.booker.trim()) {
      newErrors.booker = 'Vänligen ange ditt namn';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Hantera formulärsubmit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Spara användarval om det inte är i redigeringsläge
      savePreferences();
      
      // Konvertera roomId till nummer innan submit
      const processedData: {
        roomId: number;
        date: string;
        startTime: string;
        endTime: string;
        booker: string;
        purpose: string;
        id?: number;
        attendees: number;
        bookingType: BookingType;
      } = {
        ...formData,
        roomId: parseInt(formData.roomId),
        attendees: Number(formData.attendees),
        bookingType: formData.bookingType as BookingType,
      };
      
      // Lägg till ID om vi redigerar
      if (isEditing && initialData.id) {
        processedData.id = initialData.id;
      }
      
      onSubmit(processedData);
    }
  };
  
  // Hämta valt rum för att visa detaljer
  const selectedRoom = formData.roomId 
    ? rooms.find(room => room.id === parseInt(formData.roomId))
    : null;

  // Memoized suggestRoom function
  const suggestRoom = useCallback((attendees: number) => {
    if (!rooms.length) return;
    
    // Hitta rum med tillräcklig kapacitet, sorterade från minst till störst
    const suitableRooms = rooms
      .filter(room => room.capacity >= attendees)
      .sort((a, b) => a.capacity - b.capacity);
    
    if (suitableRooms.length) {
      // Föreslå det minsta rummet som passar gruppen
      setSuggestedRoom(suitableRooms[0]);
      
      // Auto-välj rummet om inget rum är valt
      if (!formData.roomId) {
        setFormData(prev => ({
          ...prev,
          roomId: suitableRooms[0].id.toString()
        }));
      }
    } else {
      // Om inget rum har tillräcklig kapacitet, visa största rummet
      const largestRoom = [...rooms].sort((a, b) => b.capacity - a.capacity)[0];
      setSuggestedRoom(largestRoom);
    }
  }, [rooms, formData.roomId]);

  // Uppdatera rumrekommendation när antalet deltagare ändras
  useEffect(() => {
    suggestRoom(formData.attendees);
  }, [formData.attendees, rooms]);

  // Spara användarval till preferences när bokningen slutförs
  const savePreferences = () => {
    if (!isEditing) {
      updatePreferences({
        bookerName: formData.booker,
        defaultBookingType: formData.bookingType,
        defaultRoomId: formData.roomId ? parseInt(formData.roomId) : null
      });
    }
  };

  // State för konfliktkontroll
  const [isCheckingConflicts, setIsCheckingConflicts] = useState<boolean>(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [conflictingBookings, setConflictingBookings] = useState<any[]>([]);

  // Debounced conflict check
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!formData.roomId || !formData.date || !formData.startTime || !formData.endTime) {
        setConflictError(null);
        setConflictingBookings([]);
        return;
      }

      if (formData.startTime >= formData.endTime) {
        return;
      }

      const checkBookingConflicts = async () => {
        setIsCheckingConflicts(true);
        try {
          const roomId = parseInt(formData.roomId);
          const bookingId = isEditing && initialData.id ? initialData.id : undefined;
          
          const result = await bookingsApi.checkConflictsInRealtime(
            roomId,
            formData.date,
            formData.startTime,
            formData.endTime,
            bookingId
          );
          
          if (result.hasConflict) {
            setConflictError('Det finns redan en bokning för denna tid');
            setConflictingBookings(result.conflictingBookings || []);
          } else {
            setConflictError(null);
            setConflictingBookings([]);
          }
        } catch (error) {
          console.error('Fel vid kontroll av bokningskonflikter:', error);
        } finally {
          setIsCheckingConflicts(false);
        }
      };
      
      checkBookingConflicts();
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [formData.roomId, formData.date, formData.startTime, formData.endTime, isEditing, initialData.id]);

  return (
    <div className="bg-white dark:bg-dark-700 rounded-xl shadow-xl max-w-2xl w-full mx-auto p-6">
      <h2 className="text-xl md:text-2xl font-bold mb-6 text-gray-800 dark:text-gray-200">
        {isEditing ? 'Redigera bokning' : 'Ny bokning'}
      </h2>
      
      {/* Visa konfliktmeddelanden om de finns */}
      {conflictError && (
        <div className="mb-6 p-4 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <strong className="font-medium">{conflictError}</strong>
          </div>
          
          {conflictingBookings.length > 0 && (
            <div className="text-sm mt-2 bg-white dark:bg-dark-700 p-3 rounded-lg shadow-sm">
              <p className="font-medium mb-2">Krockar med följande bokningar:</p>
              <ul className="space-y-2">
                {conflictingBookings.map(booking => (
                  <li key={booking.id} className="border-l-2 border-red-500 dark:border-red-700 pl-3">
                    <strong>{booking.start_time} - {booking.end_time}</strong>
                    <div>Bokad av: {booking.booker}</div>
                    {booking.purpose && <div className="text-xs mt-1">{booking.purpose}</div>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      {isCheckingConflicts && (
        <div className="text-sm text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Kontrollerar tillgänglighet...
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Rum */}
          <div className="space-y-2">
            <label htmlFor="roomId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Rum <span className="text-red-500">*</span>
            </label>
            <select
              id="roomId"
              name="roomId"
              value={formData.roomId}
              onChange={handleInputChange}
              className={`w-full border rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-dark-600 border-gray-300 dark:border-dark-500 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:outline-none transition-shadow ${
                errors.roomId ? 'border-red-500 dark:border-red-500' : ''
              }`}
              aria-invalid={errors.roomId ? 'true' : 'false'}
            >
              <option value="">Välj rum...</option>
              {availableRooms.map(room => (
                <option key={room.id} value={room.id}>
                  {room.name} ({room.capacity} pers)
                </option>
              ))}
            </select>
            {errors.roomId && (
              <p className="text-red-500 text-sm mt-1">{errors.roomId}</p>
            )}
          </div>

          {/* Antal deltagare */}
          <div className="space-y-2">
            <label htmlFor="attendees" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Antal deltagare
            </label>
            <div className="flex items-center">
              <input
                type="number"
                id="attendees"
                name="attendees"
                min="1"
                max="50"
                value={formData.attendees}
                onChange={handleInputChange}
                className="w-full border rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-dark-600 border-gray-300 dark:border-dark-500 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:outline-none transition-shadow"
              />
            </div>
            {suggestedRoom && suggestedRoom.id.toString() !== formData.roomId && (
              <p className="text-xs text-primary-600 dark:text-primary-400 mt-1 font-medium">
                Rekommendation: {suggestedRoom.name} (kapacitet: {suggestedRoom.capacity})
                <button 
                  type="button"
                  onClick={() => setFormData(prev => ({...prev, roomId: suggestedRoom.id.toString()}))}
                  className="ml-2 underline text-primary-700 dark:text-primary-500 hover:text-primary-800 dark:hover:text-primary-400"
                >
                  Välj
                </button>
              </p>
            )}
          </div>
          
          {/* Datum */}
          <div className="space-y-2">
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Datum <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              min={new Date().toISOString().split('T')[0]}
              className={`w-full border rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-dark-600 border-gray-300 dark:border-dark-500 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:outline-none transition-shadow ${
                errors.date ? 'border-red-500 dark:border-red-500' : ''
              }`}
              aria-invalid={errors.date ? 'true' : 'false'}
            />
            {errors.date && (
              <p className="text-red-500 text-sm mt-1">{errors.date}</p>
            )}
          </div>
          
          {/* Starttid */}
          <div className="space-y-2">
            <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Starttid <span className="text-red-500">*</span>
            </label>
            <select
              id="startTime"
              name="startTime"
              value={formData.startTime}
              onChange={handleInputChange}
              className="w-full border rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-dark-600 border-gray-300 dark:border-dark-500 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:outline-none transition-shadow"
            >
              {timeOptions.slice(0, -1).map(time => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>
          
          {/* Sluttid */}
          <div className="space-y-2">
            <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Sluttid <span className="text-red-500">*</span>
            </label>
            <select
              id="endTime"
              name="endTime"
              value={formData.endTime}
              onChange={handleInputChange}
              className={`w-full border rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-dark-600 border-gray-300 dark:border-dark-500 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:outline-none transition-shadow ${
                errors.endTime ? 'border-red-500 dark:border-red-500' : ''
              }`}
              aria-invalid={errors.endTime ? 'true' : 'false'}
            >
              {timeOptions.slice(1).map(time => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
            {errors.endTime && (
              <p className="text-red-500 text-sm mt-1">{errors.endTime}</p>
            )}
          </div>
        </div>
        
        {/* Snabbval för varaktighet */}
        <div className="flex gap-2 mt-1 mb-4">
          <span className="text-sm text-gray-600 dark:text-gray-400 self-center">Varaktighet:</span>
          <button 
            type="button" 
            onClick={() => setQuickTime(30)} 
            className="px-3 py-1 text-xs bg-primary-100 hover:bg-primary-200 dark:bg-primary-900/30 dark:hover:bg-primary-900/50 text-primary-700 dark:text-primary-300 rounded-full transition-colors"
          >
            30 min
          </button>
          <button 
            type="button" 
            onClick={() => setQuickTime(60)} 
            className="px-3 py-1 text-xs bg-primary-100 hover:bg-primary-200 dark:bg-primary-900/30 dark:hover:bg-primary-900/50 text-primary-700 dark:text-primary-300 rounded-full transition-colors"
          >
            1 timme
          </button>
          <button 
            type="button" 
            onClick={() => setQuickTime(120)} 
            className="px-3 py-1 text-xs bg-primary-100 hover:bg-primary-200 dark:bg-primary-900/30 dark:hover:bg-primary-900/50 text-primary-700 dark:text-primary-300 rounded-full transition-colors"
          >
            2 timmar
          </button>
        </div>
        
        {/* Bokningstyp */}
        <div className="space-y-2">
          <label htmlFor="bookingType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Typ av bokning
          </label>
          <div className="flex flex-wrap gap-2">
            {bookingTypes.map(type => (
              <button
                key={type.id}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, bookingType: type.id as BookingType }))}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors flex items-center ${
                  formData.bookingType === type.id
                    ? `${type.color} text-white`
                    : 'bg-gray-100 hover:bg-gray-200 dark:bg-dark-600 dark:hover:bg-dark-500 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${type.color} ${formData.bookingType === type.id ? 'bg-white' : ''} mr-1.5`}></span>
                {type.name}
              </button>
            ))}
          </div>
        </div>
        
        {/* Bokare */}
        <div className="space-y-2">
          <label htmlFor="booker" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Ditt namn <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="booker"
            name="booker"
            value={formData.booker}
            onChange={handleInputChange}
            placeholder="Ditt namn"
            className={`w-full border rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-dark-600 border-gray-300 dark:border-dark-500 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:outline-none transition-shadow ${
              errors.booker ? 'border-red-500 dark:border-red-500' : ''
            }`}
            aria-invalid={errors.booker ? 'true' : 'false'}
          />
          {errors.booker && (
            <p className="text-red-500 text-sm mt-1">{errors.booker}</p>
          )}
        </div>
        
        {/* Syfte */}
        <div className="space-y-2">
          <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Syfte med bokningen
          </label>
          <textarea
            id="purpose"
            name="purpose"
            value={formData.purpose}
            onChange={handleInputChange}
            rows={3}
            placeholder="Beskriv kort syftet med bokningen..."
            className="w-full border rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-dark-600 border-gray-300 dark:border-dark-500 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:outline-none transition-shadow"
          ></textarea>
        </div>
        
        {/* Rumsdetaljer om ett rum är valt */}
        {selectedRoom && (
          <div className="bg-gray-50 dark:bg-dark-600/50 rounded-lg p-4 border border-gray-200 dark:border-dark-500">
            <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rumsinformation:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400 block">
                  Kapacitet:
                </span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {selectedRoom.capacity} personer
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400 block">
                  Utrustning:
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedRoom.features.map((feature, index) => (
                    <span 
                      key={index}
                      className="inline-block bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 px-2 py-0.5 rounded-md text-xs"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Formulärknappar */}
        <div className="flex flex-col-reverse sm:flex-row justify-between sm:items-center gap-3 pt-4">
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-dark-600 dark:hover:bg-dark-500 rounded-lg transition-colors text-gray-800 dark:text-gray-200"
            >
              Avbryt
            </button>
            {isEditing && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-lg transition-colors shadow-soft"
              >
                Radera bokning
              </button>
            )}
          </div>
          
          <div className="flex gap-2">
            {!isEditing && onRecurring && (
              <button
                type="button"
                onClick={onRecurring}
                className="px-4 py-2 bg-primary-100 dark:bg-primary-900/20 hover:bg-primary-200 dark:hover:bg-primary-900/40 text-primary-700 dark:text-primary-400 rounded-lg transition-colors border border-primary-300 dark:border-primary-800"
                disabled={!!conflictError}
              >
                Återkommande
              </button>
            )}
            <button
              type="submit"
              className={`px-4 py-2 ${
                conflictError 
                  ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' 
                  : 'bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700'
              } text-white rounded-lg transition-colors shadow-soft`}
              disabled={!!conflictError}
            >
              {isEditing ? 'Uppdatera' : 'Boka rum'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ResponsiveBookingForm; 