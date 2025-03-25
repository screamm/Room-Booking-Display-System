import { useState, useEffect } from 'react';

/**
 * Hook för att hantera data i localStorage med typning
 * @param key Nyckeln för att lagra data i localStorage
 * @param initialValue Standardvärde om inget finns lagrat
 * @returns [värde, sätt värde]
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Funktion för att hämta initialt värde från localStorage eller använda standard
  const getStoredValue = (): T => {
    try {
      // Hämta från localStorage baserat på nyckel
      const item = localStorage.getItem(key);
      // Parsera lagrat JSON eller returnera initialValue om inget finns
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // Vid fel, använd initialValue
      console.error('Error reading from localStorage', error);
      return initialValue;
    }
  };

  // State för att lagra vårt värde
  const [storedValue, setStoredValue] = useState<T>(getStoredValue);

  // Funktion för att uppdatera både state och localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Tillåt value att vara en funktion så att vi har samma API som useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      
      // Spara till state
      setStoredValue(valueToStore);
      
      // Spara till localStorage
      localStorage.setItem(key, JSON.stringify(valueToStore));
      
      // Trigga en custom event så att andra komponenter kan lyssna på ändringar
      window.dispatchEvent(new Event('local-storage-updated'));
    } catch (error) {
      console.error('Error writing to localStorage', error);
    }
  };

  // Lyssna på localStorage ändringar från andra komponenter
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.error('Error parsing localStorage change', error);
        }
      }
    };

    // Lyssna på custom event för interna ändringar
    const handleLocalUpdate = () => {
      const newValue = localStorage.getItem(key);
      if (newValue) {
        try {
          setStoredValue(JSON.parse(newValue));
        } catch (error) {
          console.error('Error parsing localStorage update', error);
        }
      }
    };

    // Lyssna på ändringar i localStorage från andra tabs/windows
    window.addEventListener('storage', handleStorageChange);
    // Lyssna på ändringar från andra komponenter i samma fönster
    window.addEventListener('local-storage-updated', handleLocalUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage-updated', handleLocalUpdate);
    };
  }, [key]);

  return [storedValue, setValue];
} 