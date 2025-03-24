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