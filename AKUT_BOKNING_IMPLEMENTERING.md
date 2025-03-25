# Implementering av Akut-knappfunktionalitet

Vi har skapat följande komponenter och funktioner för att implementera "Akut"-funktionaliteten:

1. En ny API-funktion för att hitta det största lediga rummet
2. En ny EmergencyBookingButton-komponent 

## Steg för att integrera funktionaliteten

### 1. Importera EmergencyBookingButton i ConferenceRoomBooking.tsx

```tsx
// Högst upp i filen, bland de andra importerna
import EmergencyBookingButton from './EmergencyBookingButton';
```

### 2. Lägg till Akut-knappen i knappmenyn

Hitta knappmenyn i ConferenceRoomBooking.tsx. Detta är vanligtvis i huvudrenderingsdelen, i närheten av de andra navigeringsknapparna. Lägg till Akut-knappen där:

```tsx
{/* Ungefär runt rad 740-760 där de andra navigeringsknapparna finns */}
<div className="mb-4 flex flex-wrap gap-2">
  {/* Befintliga knappar */}
  <button
    onClick={() => updateCurrentView('calendar')}
    className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
      currentView === 'calendar'
        ? 'bg-primary-500 text-white'
        : 'bg-gray-200 hover:bg-gray-300 dark:bg-dark-600 dark:hover:bg-dark-500 text-gray-800 dark:text-gray-200'
    }`}
  >
    Kalendervy
  </button>
  
  {/* Fler befintliga knappar... */}

  {/* Lägg till den nya Akut-knappen här */}
  <EmergencyBookingButton onBookingCreated={loadAllBookings} />
</div>
```

### 3. Lägg till Akut-knapp i MobileBottomMenu (valfritt)

Om du vill lägga till Akut-knappen även i mobilgränssnittet, uppdatera MobileBottomMenu.tsx:

1. Uppdatera MobileBottomMenuProps-interfacet:

```tsx
interface MobileBottomMenuProps {
  currentView: string;
  onChangeView: (view: string) => void;
  onNewBooking: () => void;
  onEmergencyBooking: () => void; // Ny prop
}
```

2. Uppdatera komponenten för att acceptera den nya proppen:

```tsx
const MobileBottomMenu: React.FC<MobileBottomMenuProps> = ({
  currentView,
  onChangeView,
  onNewBooking,
  onEmergencyBooking // Lägg till denna
}) => {
```

3. Lägg till en ny knapp i komponentens render-del:

```tsx
{/* Lägg till nära den andra "Boka"-knappen */}
<button
  onClick={onEmergencyBooking}
  className="flex flex-col items-center justify-center py-1 px-3 text-white bg-red-600 rounded-md shadow-soft"
>
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
  <span className="text-xs mt-1">Akut</span>
</button>
```

4. Uppdatera anropet till MobileBottomMenu i ConferenceRoomBooking.tsx:

```tsx
<MobileBottomMenu
  currentView={currentView}
  onChangeView={updateCurrentView}
  onNewBooking={showBookingForm}
  onEmergencyBooking={() => {
    // Referens till EmergencyBookingButton-komponenten
    const emergencyButtonRef = React.createRef();
    if (emergencyButtonRef.current) {
      emergencyButtonRef.current.click();
    }
  }}
/>
```

## Verifiering

Efter implementering ska användare kunna:

1. Klicka på "Akut"-knappen
2. Systemet kommer automatiskt att hitta det största lediga rummet för nästa tillgängliga timme
3. Användaren får en bekräftelseprompter som visar rummets information och start/sluttid
4. Vid bekräftelse skapas bokningen automatiskt med "Akutbokning" som bokare 