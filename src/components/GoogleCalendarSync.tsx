import React, { useState, useEffect } from 'react';
import { googleCalendarService } from '../lib/googleCalendar';
import { googleCalendarApi } from '../lib/googleCalendarApi';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';

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
  const { fetchBookings, isSynced } = useGoogleCalendar();

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

      // Kontrollera om googleCalendarApi.syncToGoogleCalendar finns
      if (!googleCalendarApi.syncToGoogleCalendar) {
        console.error('syncToGoogleCalendar-funktionen saknas');
        showToast('Google Calendar-synkronisering är inte konfigurerad', 'warning');
        setIsLoading(false);
        return;
      }

      try {
        const results = await googleCalendarApi.syncToGoogleCalendar(bookings);
        
        // Visa resultat
        const successCount = results.filter(r => r.status === 'success').length;
        const alreadySyncedCount = results.filter(r => r.status === 'already_synced').length;
        
        showToast(
          `Synkronisering slutförd: ${successCount} nya bokningar synkade, ${alreadySyncedCount} redan synkade`,
          'success'
        );
      } catch (syncError) {
        console.error('Fel vid synkronisering med Google Calendar:', syncError);
        showToast('Kunde inte synkronisera med Google Calendar', 'error');
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

      // Kontrollera om googleCalendarApi.syncFromGoogleCalendar finns
      if (!googleCalendarApi.syncFromGoogleCalendar) {
        console.error('syncFromGoogleCalendar-funktionen saknas');
        showToast('Google Calendar-synkronisering är inte konfigurerad', 'warning');
        setIsLoading(false);
        return;
      }

      try {
        const results = await googleCalendarApi.syncFromGoogleCalendar();
        
        // Visa resultat
        const createdCount = results.filter(r => r.status === 'created').length;
        const updatedCount = results.filter(r => r.status === 'updated').length;
        
        showToast(
          `Synkronisering slutförd: ${createdCount} nya bokningar skapade, ${updatedCount} uppdaterade`,
          'success'
        );
      } catch (syncError) {
        console.error('Fel vid synkronisering från Google Calendar:', syncError);
        showToast('Kunde inte synkronisera från Google Calendar', 'error');
      }
      
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

  if (!syncStatus || syncStatus.status === 'error' || syncStatus.status === 'not_configured') {
    return (
      <div className="flex items-center text-yellow-600">
        <span className="mr-2">⚠️</span>
        <span>{syncStatus?.error_message || 'Synkronisering inte tillgänglig'}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center text-green-600">
      <span className="mr-2">✓</span>
      <span>Senast synkad: {new Date(syncStatus.last_sync).toLocaleString('sv-SE')}</span>
    </div>
  );
};

export default GoogleCalendarSync; 