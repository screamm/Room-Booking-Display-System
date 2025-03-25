import { useState, useEffect } from 'react';
import './App.css';
import ConferenceRoomBooking from './components/ConferenceRoomBooking';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { UserPreferencesProvider } from './contexts/UserPreferencesContext';
import ThemeToggle from './components/ThemeToggle';
import { supabase } from './lib/supabase';

// Separata komponenter för att hantera Toast-kontexten
function AppContent() {
  const [initialized, setInitialized] = useState<boolean>(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [sqlScript, setSqlScript] = useState<string>('');
  const [showSqlScript, setShowSqlScript] = useState<boolean>(false);
  const { showToast } = useToast();

  // Kontrollera anslutning till Supabase när appen laddar
  useEffect(() => {
    checkSupabaseConnection();
  }, []);

  // Funktion för att kontrollera anslutningen till Supabase
  async function checkSupabaseConnection() {
    try {
      setIsLoading(true);
      console.log('Testar anslutning till Supabase...');
      
      // Testa en enkel anslutning först
      const { data, error } = await supabase.from('rooms').select('*').limit(1);
      
      if (error) {
        console.error('Fel vid anslutning till Supabase:', error);
        setErrorDetails(error);
        
        // Kontrollera om tabellen finns
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          setInitError(
            'Tabellen "rooms" hittades inte i databasen.\n\n' +
            'Du behöver köra SQL-skriptet i Supabase SQL Editor för att skapa nödvändiga tabeller.\n\n' +
            '1. Logga in på Supabase-dashboarden\n' +
            '2. Gå till SQL Editor\n' +
            '3. Skapa en ny fråga\n' +
            '4. Kopiera och klistra in innehållet från src/scripts/setupDatabase.sql\n' +
            '5. Klicka på "Run" för att köra skriptet'
          );
        } else if (error.code === 'PGRST301' || error.message.includes('permission denied')) {
          setInitError(
            'Saknar behörighet att läsa från tabellen "rooms".\n\n' +
            'Du behöver konfigurera RLS-policyer (Row Level Security) i Supabase:\n\n' +
            '1. Gå till Table Editor\n' +
            '2. Välj tabellen "rooms"\n' +
            '3. Klicka på "Auth Policies" fliken\n' +
            '4. Lägg till en ny policy för SELECT\n' +
            '5. Sätt USING-uttrycket till "true" för att tillåta offentlig läsning'
          );
        } else {
          setInitError(`Anslutning till databasen misslyckades: ${error.message || 'Okänt fel'}`);
        }
      } else {
        console.log('Anslutning till Supabase lyckades!', data);
        setInitialized(true);
        setErrorDetails(null);
      }
    } catch (err: any) {
      console.error('Ett oväntat fel uppstod vid initialisering:', err);
      setErrorDetails(err);
      setInitError(`Ett oväntat fel uppstod: ${err.message || 'Okänt fel'}`);
    } finally {
      setIsLoading(false);
    }
  }

  // Funktion för att öppna Supabase-dashboarden
  const openSupabaseDashboard = () => {
    window.open('https://app.supabase.com', '_blank');
  };

  // Funktion för att visa SQL-skriptet
  const displaySqlScript = async () => {
    try {
      // Om vi redan har skriptet, visa/dölj det
      if (sqlScript) {
        setShowSqlScript(!showSqlScript);
        return;
      }
      
      // Annars hämta och visa det
      const scriptContent = `
-- Skapa rum-tabellen
CREATE TABLE IF NOT EXISTS public.rooms (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  features TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Skapa boknings-tabellen
CREATE TABLE IF NOT EXISTS public.bookings (
  id SERIAL PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  booker TEXT NOT NULL,
  purpose TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT time_check CHECK (start_time < end_time)
);

-- Skapa index för effektiv sökning
CREATE INDEX IF NOT EXISTS bookings_room_date_idx ON public.bookings(room_id, date);

-- Aktivera Row Level Security
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Skapa RLS-policyer för anonym åtkomst
-- Rum-policyer (läsbehörighet för alla)
CREATE POLICY "Alla kan läsa rum"
ON public.rooms FOR SELECT
USING (true);

-- Boknings-policyer (fullständig behörighet för alla)
CREATE POLICY "Alla kan läsa bokningar"
ON public.bookings FOR SELECT
USING (true);

CREATE POLICY "Alla kan skapa bokningar"
ON public.bookings FOR INSERT
WITH CHECK (true);

CREATE POLICY "Alla kan uppdatera bokningar"
ON public.bookings FOR UPDATE
USING (true);

CREATE POLICY "Alla kan ta bort bokningar"
ON public.bookings FOR DELETE
USING (true);

-- Lägg till standardrum
INSERT INTO public.rooms (name, capacity, features)
VALUES 
  ('Stora', 20, ARRAY['Monitor', 'Whiteboard']),
  ('Mellan', 8, ARRAY['Videokonferens', 'Whiteboard']),
  ('Lilla', 5, ARRAY['Videokonferens', 'Whiteboard']),
  ('Båset', 2, ARRAY['Videokonferens'])
ON CONFLICT (id) DO NOTHING;
      `;
      
      setSqlScript(scriptContent);
      setShowSqlScript(true);
    } catch (error) {
      console.error('Fel vid hämtning av SQL-skript:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-800 text-gray-800 dark:text-gray-200 transition-colors duration-300 font-sans">
      {initError ? (
        <div className="flex items-center justify-center h-screen">
          <div className="max-w-2xl p-6 bg-white dark:bg-dark-700 rounded-xl shadow-soft dark:shadow-soft-dark">
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
              Anslutningsfel
            </h1>
            <p className="mb-6 whitespace-pre-line">{initError}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <button 
                onClick={() => checkSupabaseConnection()}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 text-white rounded-lg transition-colors duration-200"
              >
                Försök igen
              </button>
              <button 
                onClick={openSupabaseDashboard}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-dark-600 dark:hover:bg-dark-500 text-gray-800 dark:text-gray-200 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <span>Öppna Supabase Dashboard</span>
              </button>
              <button 
                onClick={displaySqlScript}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 sm:col-span-2"
              >
                {showSqlScript ? 'Dölj SQL-skript' : 'Visa SQL-skript'}
              </button>
            </div>
            
            {showSqlScript && (
              <div className="mt-4">
                <h3 className="font-bold mb-2">SQL-skript att köra i Supabase SQL Editor:</h3>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-96 text-sm font-mono">
                  <pre>{sqlScript}</pre>
                </div>
                <div className="mt-3 flex justify-end">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(sqlScript);
                      showToast('SQL-skriptet har kopierats till urklipp!', 'success');
                    }}
                    className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-dark-600 dark:hover:bg-dark-500 text-xs text-gray-800 dark:text-gray-200 rounded-lg transition-colors duration-200"
                  >
                    Kopiera till urklipp
                  </button>
                </div>
              </div>
            )}
            
            {errorDetails && !showSqlScript && (
              <div className="mt-6 p-3 bg-gray-100 dark:bg-dark-600 rounded-lg text-xs overflow-auto max-h-60">
                <h3 className="font-bold mb-2">Tekniska feldetaljer:</h3>
                <pre>{JSON.stringify(errorDetails, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center h-screen">
          <div className="text-primary-500 dark:text-primary-400 text-lg font-medium flex flex-col items-center gap-3">
            <svg className="animate-spin h-8 w-8 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Ansluter till databasen...
          </div>
        </div>
      ) : (
        <ConferenceRoomBooking />
      )}
      <ThemeToggle />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <UserPreferencesProvider>
          <AppContent />
        </UserPreferencesProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
