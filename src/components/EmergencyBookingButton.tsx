import React, { useState } from 'react';
import { bookingsApi } from '../lib/api';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useToast } from '../contexts/ToastContext';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { calculateEndTime } from '../utils/dateUtils';

interface EmergencyBookingButtonProps {
  onBookingCreated: () => void;
}

const EmergencyBookingButton: React.FC<EmergencyBookingButtonProps> = ({ onBookingCreated }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();
  const { preferences } = useUserPreferences();

  const handleEmergencyBooking = async () => {
    setIsLoading(true);
    
    try {
      // Hämta aktuellt datum och tid
      const now = new Date();
      const currentDate = format(now, 'yyyy-MM-dd');
      const currentHour = format(now, 'HH:00');
      
      // Användarens prefererade längd på bokning, eller 60 minuter som standard
      const durationMinutes = preferences.defaultBookingDuration || 60;
      
      // Beräkna sluttid
      const endTime = calculateEndTime(currentHour, durationMinutes / 60);
      
      // Hitta det största lediga rummet just nu
      const availableRoom = await bookingsApi.findLargestAvailableRoom(
        currentDate,
        currentHour,
        endTime
      );
      
      if (!availableRoom) {
        // Inget rum tillgängligt
        showToast({
          title: 'Fel: Inga rum tillgängliga',
          description: 'Det finns inga lediga rum just nu.',
          status: 'error',
          duration: 5000
        });
        setIsModalOpen(false);
        return;
      }
      
      // Skapa bokningen
      const booking = {
        room_id: availableRoom.id,
        date: currentDate,
        start_time: currentHour,
        end_time: endTime,
        booker: preferences.bookerName || 'Akutbokning',
        purpose: 'Akutbokning',
        booking_type: 'meeting'
      };
      
      const createdBooking = await bookingsApi.create(booking);
      
      // Visa bekräftelse
      showToast({
        title: 'Akutbokning skapad',
        description: `Rum ${availableRoom.name} bokat från ${currentHour} till ${endTime}`,
        status: 'success',
        duration: 5000
      });
      
      // Stäng modalen och uppdatera bokningslistan
      setIsModalOpen(false);
      onBookingCreated();
      
    } catch (error) {
      console.error('Fel vid akutbokning:', error);
      
      // Visa felmeddelande
      showToast({
        title: 'Fel vid akutbokning',
        description: 'Det gick inte att skapa akutbokningen. Försök igen senare.',
        status: 'error',
        duration: 5000
      });
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
              Vill du boka ett rum nu? Systemet kommer automatiskt att hitta det största tillgängliga rummet för en bokning på {preferences.defaultBookingDuration || 60} minuter.
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