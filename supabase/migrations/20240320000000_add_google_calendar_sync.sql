-- Skapa en funktion för att köra synkronisering
CREATE OR REPLACE FUNCTION run_google_calendar_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Anropa Edge Function via HTTP
  PERFORM net.http_post(
    url := current_setting('app.settings.edge_function_url') || '/google-calendar-sync',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    )
  );
END;
$$;

-- Kommentera bort den problematiska koden som beror på cron-schemat
/*
CREATE OR REPLACE FUNCTION schedule_google_calendar_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ta bort existerande jobb om det finns
  PERFORM cron.unschedule('google-calendar-sync');
  
  -- Schemalägg nytt jobb som körs varje timme
  PERFORM cron.schedule(
    'google-calendar-sync',
    '0 * * * *', -- Kör varje timme
    $$
    SELECT run_google_calendar_sync();
    $$
  );
END;
$$;

-- Kör schemaläggningen
SELECT schedule_google_calendar_sync();
*/

-- Skapa en tabell för att logga synkroniseringsstatus
CREATE TABLE IF NOT EXISTS sync_status (
  id SERIAL PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'not_configured',
  last_sync TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  error_message TEXT
); 