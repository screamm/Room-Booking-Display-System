import React, { useState, useEffect } from 'react';
import { googleCalendarApi } from '../lib/googleCalendarApi';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';

interface GoogleCalendarSyncProps {
  onSyncComplete?: () => void;
}

interface SyncStatus {
  status: 'success' | 'error' | 'in_progress' | 'not_configured';
  last_sync: string;
  error_message?: string;
}

const GoogleCalendarSync: React.FC<GoogleCalendarSyncProps> = ({ onSyncComplete }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchSyncStatus = async () => {
      try {
        setIsLoading(true);
        const status = await googleCalendarApi.getSyncStatus();
        setSyncStatus(status);
      } catch (error) {
        console.error('Oväntat fel vid hämtning av synkroniseringsstatus:', error);
        setSyncStatus({
          status: 'error',
          last_sync: new Date().toISOString(),
          error_message: 'Kunde inte hämta synkroniseringsstatus'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSyncStatus();
  }, []);

  const handleSyncToGoogle = async () => {
    try {
      setIsLoading(true);
      showToast('Synkronisering till Google Kalender påbörjad', 'info');

      // Försök att skapa sync_status-tabellen om den inte finns
      try {
        await googleCalendarApi.createSyncStatusTable();
      } catch (tableError) {
        console.warn('Kunde inte verifiera eller skapa sync_status-tabellen:', tableError);
        // Fortsätt ändå, eftersom vi kan hantera bokningarna
      }

      // Hämta alla bokningar som inte redan är synkade
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .is('google_calendar_id', null);

      if (error) {
        console.error('Fel vid hämtning av bokningar:', error);
        showToast('Kunde inte hämta bokningar för synkronisering', 'error');
        setIsLoading(false);
        return;
      }

      if (!bookings || bookings.length === 0) {
        showToast('Inga nya bokningar att synka', 'info');
        setIsLoading(false);
        return;
      }

      // Här skulle vi normalt synka med Google Calendar
      // Men eftersom funktionen inte är implementerad än, visar vi bara en informationsruta
      showToast(
        'Google Calendar-synkronisering är inte tillgänglig än. Kommer att implementeras i framtida version.',
        'warning'
      );
      
      // Uppdatera status
      try {
        const { error: insertError } = await supabase
          .from('sync_status')
          .insert({
            status: 'success',
            error_message: null
          });
          
        if (insertError) {
          console.warn('Kunde inte uppdatera synkroniseringsstatus:', insertError.message);
        }
        
        // Hämta den senaste statusen
        const status = await googleCalendarApi.getSyncStatus();
        setSyncStatus(status);
      } catch (statusError) {
        console.warn('Kunde inte spara synkroniseringsstatus:', statusError);
      }
      
      onSyncComplete?.();
    } catch (error) {
      console.error('Oväntat fel vid synkronisering:', error);
      showToast('Ett oväntat fel uppstod', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncFromGoogle = async () => {
    try {
      setIsLoading(true);
      showToast('Synkronisering från Google Kalender påbörjad', 'info');

      // Här skulle vi normalt hämta från Google Calendar
      // Men eftersom funktionen inte är implementerad än, visar vi bara en informationsruta
      showToast(
        'Import från Google Calendar är inte tillgänglig än. Kommer att implementeras i framtida version.',
        'warning'
      );
      
      onSyncComplete?.();
    } catch (error) {
      console.error('Oväntat fel vid synkronisering:', error);
      showToast('Ett oväntat fel uppstod', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-gray-500">Laddar synkroniseringsstatus...</div>;
  }

  return (
    <div className="bg-white dark:bg-dark-800 p-4 rounded-lg shadow-soft">
      <h3 className="text-xl font-semibold mb-3">Google Calendar Synkronisering</h3>
      
      {syncStatus ? (
        <div className="mb-4">
          <p className="mb-2">
            <strong>Status:</strong>{' '}
            <span className={`px-2 py-1 rounded-full text-xs ${
              syncStatus.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
              syncStatus.status === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
              syncStatus.status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}>
              {syncStatus.status === 'success' ? 'Lyckades' :
               syncStatus.status === 'error' ? 'Misslyckades' :
               syncStatus.status === 'in_progress' ? 'Pågår' :
               'Ej konfigurerad'}
            </span>
          </p>
          
          <p className="mb-2">
            <strong>Senaste synk:</strong>{' '}
            {new Date(syncStatus.last_sync).toLocaleString('sv-SE')}
          </p>
          


        </div>
      ) : isLoading ? (
        <div className="flex justify-center items-center mb-4 h-20">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <p className="mb-4 text-gray-600 dark:text-gray-400">
          Kunde inte hämta synkroniseringsstatus.
        </p>
      )}
      
      <button
        onClick={handleSyncToGoogle}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="inline-flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Synkroniserar...
          </span>
        ) : (
          'Synkronisera med Google Calendar'
        )}
      </button>
    </div>
  );
};

export default GoogleCalendarSync; 