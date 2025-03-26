-- Lägg till is_quick_booking kolumn till bookings-tabellen
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS is_quick_booking BOOLEAN DEFAULT FALSE;

-- Uppdatera befintliga snabbmöten baserat på purpose-fältet
UPDATE bookings
SET is_quick_booking = TRUE
WHERE purpose = 'Snabbmöte' OR purpose = 'Akutbokning';

-- Lägg till en kommentar som förklarar kolumnen
COMMENT ON COLUMN bookings.is_quick_booking IS 'Flagga som indikerar om bokningen är ett snabbmöte som kan avbokas direkt från display'; 