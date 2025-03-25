import React, { createContext, useContext, ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

// Typer för användarinställningar
interface UserPreferences {
  // Användarinformation
  bookerName: string;
  
  // Tema och visningsinställningar
  theme: 'light' | 'dark' | 'system';
  defaultView: 'calendar' | 'week-view';
  
  // Bokningsinställningar
  defaultRoomId: number | null;
  defaultBookingType: string;
  defaultBookingDuration: number; // minuter
  
  // Filtreringsinställningar
  favoriteRooms: number[];
  hideHistoricalBookings: boolean;
}

// Default-inställningar
const defaultPreferences: UserPreferences = {
  bookerName: '',
  theme: 'system',
  defaultView: 'calendar',
  defaultRoomId: null,
  defaultBookingType: 'meeting',
  defaultBookingDuration: 60,
  favoriteRooms: [],
  hideHistoricalBookings: true,
};

// Typ för kontextens värde
interface UserPreferencesContextValue {
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  resetPreferences: () => void;
}

// Skapa kontexten
const UserPreferencesContext = createContext<UserPreferencesContextValue | null>(null);

// Props för providern
interface UserPreferencesProviderProps {
  children: ReactNode;
}

// Provider-komponent
export const UserPreferencesProvider: React.FC<UserPreferencesProviderProps> = ({ children }) => {
  // Använd useLocalStorage för att spara/hämta inställningar
  const [preferences, setPreferences] = useLocalStorage<UserPreferences>(
    'user_preferences',
    defaultPreferences
  );

  // Uppdatera specifika inställningar
  const updatePreferences = (updates: Partial<UserPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  };

  // Återställ alla inställningar till default
  const resetPreferences = () => {
    setPreferences(defaultPreferences);
  };

  return (
    <UserPreferencesContext.Provider
      value={{ preferences, updatePreferences, resetPreferences }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
};

// Custom hook för att använda kontexten
export const useUserPreferences = (): UserPreferencesContextValue => {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error('useUserPreferences måste användas inom en UserPreferencesProvider');
  }
  return context;
}; 