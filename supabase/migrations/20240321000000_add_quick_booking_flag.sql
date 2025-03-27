-- Skapa boknings-tabellen om den inte finns först
CREATE TABLE IF NOT EXISTS public.bookings (
  id SERIAL PRIMARY KEY,
  room_id INTEGER NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  booker TEXT NOT NULL,
  purpose TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT time_check CHECK (start_time < end_time)
);

-- Lägg till is_quick_booking kolumn till bookings-tabellen
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS is_quick_booking BOOLEAN DEFAULT FALSE;

-- Uppdatera befintliga snabbmöten baserat på purpose-fältet
UPDATE public.bookings
SET is_quick_booking = TRUE
WHERE purpose = 'Snabbmöte' OR purpose = 'Akutbokning';

-- Lägg till en kommentar som förklarar kolumnen
COMMENT ON COLUMN public.bookings.is_quick_booking IS 'Flagga som indikerar om bokningen är ett snabbmöte som kan avbokas direkt från display'; 