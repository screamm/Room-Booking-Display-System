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
        const status = await googleCalendarApi.getSyncStatus();
        setSyncStatus(status);
      } catch (error) {
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
    <div className="space-y-4">
      <div className="flex items-center text-sm">
        <span className="mr-2">{syncStatus?.status === 'success' ? '✓' : '⚠️'}</span>
        <span>{syncStatus?.status === 'success' 
          ? `Senast synkad: ${new Date(syncStatus.last_sync).toLocaleString('sv-SE')}` 
          : 'Inte synkroniserad med Google Calendar'}
        </span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <button 
          className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded"
          onClick={handleSyncToGoogle}
          disabled={isLoading}
        >
          {isLoading ? 'Synkar...' : 'Synka till Google Calendar'}
        </button>
        
        <button 
          className="px-3 py-1.5 text-sm bg-green-500 hover:bg-green-600 text-white rounded"
          onClick={handleSyncFromGoogle}
          disabled={isLoading}
        >
          {isLoading ? 'Importerar...' : 'Importera från Google Calendar'}
        </button>
      </div>
    </div>
  );
};

export default GoogleCalendarSync; 