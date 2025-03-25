import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserPreferencesProvider, useUserPreferences } from './UserPreferencesContext';
import { act } from 'react-dom/test-utils';

// Mock useLocalStorage-hooken
jest.mock('../hooks/useLocalStorage', () => ({
  useLocalStorage: jest.fn((key, initialValue) => {
    const [value, setValue] = React.useState(initialValue);
    return [value, setValue];
  })
}));

// Testkomponent som använder context
const TestComponent = () => {
  const { preferences, updatePreferences, resetPreferences } = useUserPreferences();
  
  return (
    <div>
      <div data-testid="booker-name">{preferences.bookerName}</div>
      <div data-testid="theme">{preferences.theme}</div>
      <div data-testid="default-duration">{preferences.defaultBookingDuration}</div>
      
      <button 
        data-testid="update-name" 
        onClick={() => updatePreferences({ bookerName: 'Testanvändare' })}
      >
        Uppdatera namn
      </button>
      
      <button 
        data-testid="update-theme" 
        onClick={() => updatePreferences({ theme: 'dark' })}
      >
        Uppdatera tema
      </button>
      
      <button 
        data-testid="reset" 
        onClick={resetPreferences}
      >
        Återställ
      </button>
    </div>
  );
};

describe('UserPreferencesContext', () => {
  it('bör tillhandahålla standardinställningar', () => {
    render(
      <UserPreferencesProvider>
        <TestComponent />
      </UserPreferencesProvider>
    );
    
    expect(screen.getByTestId('booker-name').textContent).toBe('');
    expect(screen.getByTestId('theme').textContent).toBe('system');
    expect(screen.getByTestId('default-duration').textContent).toBe('60');
  });
  
  it('bör uppdatera inställningar när updatePreferences anropas', () => {
    render(
      <UserPreferencesProvider>
        <TestComponent />
      </UserPreferencesProvider>
    );
    
    // Uppdatera användarnamn
    fireEvent.click(screen.getByTestId('update-name'));
    expect(screen.getByTestId('booker-name').textContent).toBe('Testanvändare');
    
    // Uppdatera tema
    fireEvent.click(screen.getByTestId('update-theme'));
    expect(screen.getByTestId('theme').textContent).toBe('dark');
  });
  
  it('bör återställa inställningar till standardvärden när resetPreferences anropas', () => {
    render(
      <UserPreferencesProvider>
        <TestComponent />
      </UserPreferencesProvider>
    );
    
    // Uppdatera inställningar
    fireEvent.click(screen.getByTestId('update-name'));
    fireEvent.click(screen.getByTestId('update-theme'));
    
    // Kontrollera att inställningarna har ändrats
    expect(screen.getByTestId('booker-name').textContent).toBe('Testanvändare');
    expect(screen.getByTestId('theme').textContent).toBe('dark');
    
    // Återställ inställningar
    fireEvent.click(screen.getByTestId('reset'));
    
    // Kontrollera att inställningarna har återställts
    expect(screen.getByTestId('booker-name').textContent).toBe('');
    expect(screen.getByTestId('theme').textContent).toBe('system');
  });
  
  it('bör kasta ett fel när useUserPreferences används utanför en provider', () => {
    // Tysta felmeddelanden i konsolen för detta test
    const originalConsoleError = console.error;
    console.error = jest.fn();
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useUserPreferences måste användas inom en UserPreferencesProvider');
    
    // Återställ console.error
    console.error = originalConsoleError;
  });
}); 