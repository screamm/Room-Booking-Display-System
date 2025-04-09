import React, { useState } from 'react';
import { bookingsApi, OverlapError } from '../lib/api';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useToast } from '../contexts/ToastContext';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { calculateEndTime } from '../utils/dateUtils';
import { BookingType } from '../types/database.types';

interface EmergencyBookingButtonProps {
  onBookingCreated?: () => void;
}

const EmergencyBookingButton: React.FC<EmergencyBookingButtonProps> = ({ onBookingCreated }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();
  const { preferences } = useUserPreferences();

  // Funktion för att formatera datum till 'ÅÅÅÅ-MM-DD'
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Funktion för att formatera tid till 'TT:MM'
  const formatTime = (date: Date): string => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleEmergencyBooking = async () => {
    setIsLoading(true);
    
    try {
      console.log('%c AKUTBOKNING INITIERAD ', 'background: #c10000; color: white; font-weight: bold;');
      
      // Hämta aktuellt datum och tid
      const now = new Date();
      const currentDate = formatDate(now);
      
      // Avrunda till närmaste 5 minuter
      const currentMinutes = now.getMinutes();
      const roundedMinutes = Math.ceil(currentMinutes / 5) * 5;
      
      now.setMinutes(roundedMinutes, 0, 0);
      const currentTime = formatTime(now);
      
      // Beräkna sluttid (baserat på användarens inställningar eller 30 minuter som standard)
      const durationMinutes = preferences.defaultBookingDuration || 30;
      
      // Beräkna sluttid (60 minuter framåt)
      const endTime = new Date(now);
      endTime.setMinutes(endTime.getMinutes() + durationMinutes);
      const formattedEndTime = formatTime(endTime);
      
      console.log('Akutbokning data:', {
        datum: currentDate,
        starttid: currentTime,
        sluttid: formattedEndTime
      });
      
      // Hitta det största lediga rummet just nu
      const availableRoom = await bookingsApi.findLargestAvailableRoom(
        currentDate,
        currentTime,
        formattedEndTime
      );
      
      if (!availableRoom) {
        console.error('Inga lediga rum hittades');
        showToast(
          'Det finns inga lediga rum just nu.',
          'error'
        );
        setIsModalOpen(false);
        setIsLoading(false);
        return;
      }
      
      // Skapa bokningen med is_quick_booking-flaggan
      const booking = {
        room_id: availableRoom.id,
        date: currentDate,
        start_time: currentTime,
        end_time: formattedEndTime,
        booker: preferences.bookerName || 'Akutbokning',
        purpose: 'Akutbokning',
        booking_type: 'meeting' as BookingType,
        is_quick_booking: true // Markera som snabbmöte
      };
      
      const createdBooking = await bookingsApi.create(booking);
      
      // Visa bekräftelse
      showToast(
        `Rum ${availableRoom.name} bokat från ${currentTime} till ${formattedEndTime}`,
        'success'
      );
      
      // Stäng modalen och uppdatera bokningslistan
      setIsModalOpen(false);
      
      // Anropa callback för att uppdatera bokningslistan om den finns
      if (onBookingCreated) {
        onBookingCreated();
      }
      
    } catch (error) {
      console.error('Fel vid akutbokning:', error);
      
      // Hantera specifika feltyper
      if (error instanceof OverlapError) {
        showToast(
          'Alla rum är redan bokade under denna tid. Försök senare eller välj en annan tid.',
          'error'
        );
      } else {
        showToast(
          'Det gick inte att skapa akutbokningen. Försök igen senare.',
          'error'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-4 py-2 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-lg transition-colors shadow-soft font-medium flex items-center gap-2"
        aria-label="Akutbokning"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-2 4 2V6z" clipRule="evenodd" />
        </svg>
        Akutbokning
      </button>
      
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-700 rounded-xl shadow-xl max-w-md w-full p-6 space-y-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Bekräfta akutbokning</h2>
            
            <p className="text-gray-700 dark:text-gray-300">
              Vill du boka ett rum nu? Systemet kommer automatiskt att hitta det största tillgängliga rummet för en bokning på {preferences.defaultBookingDuration || 30} minuter.
            </p>
            
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-dark-600 dark:hover:bg-dark-500 text-gray-800 dark:text-gray-200 rounded-lg transition-colors"
                disabled={isLoading}
              >
                Avbryt
              </button>
              
              <button
                onClick={handleEmergencyBooking}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-lg transition-colors shadow-soft"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Bokar...
                  </span>
                ) : (
                  'Boka nu'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmergencyBookingButton; 