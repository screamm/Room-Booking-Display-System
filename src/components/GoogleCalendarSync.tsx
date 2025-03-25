import React, { useState, useEffect } from 'react';
import { googleCalendarService } from '../lib/googleCalendar';
import { googleCalendarApi } from '../lib/googleCalendarApi';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';

interface GoogleCalendarSyncProps {
  onSyncComplete?: () => void;
}

const GoogleCalendarSync: React.FC<GoogleCalendarSyncProps> = ({ onSyncComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const { showToast } = useToast();

  // Hämta synkroniseringsstatus
  useEffect(() => {
    const fetchSyncStatus = async () => {
      try {
        const status = await googleCalendarApi.getSyncStatus();
        setSyncStatus(status);
      } catch (error) {
        console.error('Fel vid hämtning av synkroniseringsstatus:', error);
      }
    };

    fetchSyncStatus();
  }, []);

  const handleSyncToGoogle = async () => {
    try {
      setIsLoading(true);
      showToast('Synkronisering till Google Kalender påbörjad', 'info');

      // Hämta alla bokningar som inte redan är synkade
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .is('google_calendar_id', null);

      if (error) throw error;

      if (!bookings || bookings.length === 0) {
        showToast('Inga nya bokningar att synka', 'info');
        return;
      }

      const results = await googleCalendarApi.syncToGoogleCalendar(bookings);
      
      // Visa resultat
      const successCount = results.filter(r => r.status === 'success').length;
      const alreadySyncedCount = results.filter(r => r.status === 'already_synced').length;
      
      showToast(
        `Synkronisering slutförd: ${successCount} nya bokningar synkade, ${alreadySyncedCount} redan synkade`,
        'success'
      );
      
      onSyncComplete?.();
    } catch (error) {
      console.error('Fel vid synkronisering:', error);
      showToast('Fel vid synkronisering till Google Kalender', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncFromGoogle = async () => {
    try {
      setIsLoading(true);
      showToast('Synkronisering från Google Kalender påbörjad', 'info');

      const results = await googleCalendarApi.syncFromGoogleCalendar();
      
      // Visa resultat
      const createdCount = results.filter(r => r.status === 'created').length;
      const updatedCount = results.filter(r => r.status === 'updated').length;
      
      showToast(
        `Synkronisering slutförd: ${createdCount} nya bokningar skapade, ${updatedCount} uppdaterade`,
        'success'
      );
      
      onSyncComplete?.();
    } catch (error) {
      console.error('Fel vid synkronisering:', error);
      showToast('Fel vid synkronisering från Google Kalender', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button
          onClick={handleSyncToGoogle}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Synkroniserar...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              Synka till Google Kalender
            </>
          )}
        </button>
        <button
          onClick={handleSyncFromGoogle}
          disabled={isLoading}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Synkroniserar...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              Synka från Google Kalender
            </>
          )}
        </button>
      </div>

      {syncStatus && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p>Senaste synkronisering:</p>
          <ul className="list-disc list-inside">
            {syncStatus.map((status: any) => (
              <li key={status.id}>
                {status.sync_type === 'to_google' ? 'Till Google Kalender' : 'Från Google Kalender'}:{' '}
                {new Date(status.last_sync).toLocaleString('sv-SE')} - {status.status}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default GoogleCalendarSync; 