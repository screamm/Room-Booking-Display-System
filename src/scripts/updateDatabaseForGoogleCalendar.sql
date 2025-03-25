-- Lägg till kolumner för Google Kalender-integration
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS google_calendar_id TEXT,
ADD COLUMN IF NOT EXISTS last_synced TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending';

-- Skapa index för effektiv sökning av Google Kalender-ID
CREATE INDEX IF NOT EXISTS bookings_google_calendar_id_idx ON public.bookings(google_calendar_id);

-- Skapa en tabell för att spåra synkroniseringsstatus
CREATE TABLE IF NOT EXISTS public.sync_status (
    id SERIAL PRIMARY KEY,
    last_sync TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sync_type TEXT NOT NULL, -- 'to_google' eller 'from_google'
    status TEXT NOT NULL, -- 'success', 'error', 'in_progress'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Aktivera RLS för sync_status-tabellen
ALTER TABLE public.sync_status ENABLE ROW LEVEL SECURITY;

-- Skapa RLS-policy för sync_status
CREATE POLICY "Alla kan läsa sync_status"
ON public.sync_status FOR SELECT
USING (true);

CREATE POLICY "Alla kan skapa sync_status"
ON public.sync_status FOR INSERT
WITH CHECK (true);

-- Skapa en funktion för att uppdatera synkroniseringsstatus
CREATE OR REPLACE FUNCTION update_sync_status(
    p_sync_type TEXT,
    p_status TEXT,
    p_error_message TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
    INSERT INTO public.sync_status (sync_type, status, error_message)
    VALUES (p_sync_type, p_status, p_error_message);
END;
$$ LANGUAGE plpgsql; 