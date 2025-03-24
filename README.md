# Sjöbergska Konferensrumsbokningssystem

Ett modernt bokningssystem för konferensrum med stöd för mörkt och ljust tema.

## Funktioner

- Boka konferensrum för specifika datum och tider
- Veckokalendervy och dagsvy
- Redigera eller ta bort bokningar
- Mörkt/ljust tema
- Responsiv design

## Installation

1. Klona projektet
2. Installera beroenden: `npm install`
3. Konfigurera Supabase (se nedan)
4. Starta utvecklingsservern: `npm run dev`

## Konfiguration av Supabase

### Skapa databastabeller

1. Logga in på Supabase-kontot: [https://app.supabase.com](https://app.supabase.com)
2. Välj projektet med ID "dujhsevqigspbuckegnx"
3. Gå till SQL Editor i vänstermenyn
4. Klicka på "New Query" för att skapa en ny fråga
5. Kopiera och klistra in innehållet från `src/scripts/setupDatabase.sql`
6. Klicka på "Run" för att köra SQL-skriptet

### Verifikation

Efter att ha kört skriptet, gå till "Table Editor" i vänstermenyn och kontrollera att följande tabeller har skapats:

- `rooms` - Bör innehålla fyra standardrum (Stora, Mellan, Lilla, Båset)
- `bookings` - Tom tabell som kommer att innehålla bokningar

### Om du får RLS-fel (Row Level Security)

Om du får behörighetsfel när du försöker komma åt tabellerna i appen, gå till:

1. "Table Editor" i vänstermenyn
2. Välj tabellen (rooms eller bookings)
3. Klicka på "Auth Policies" fliken
4. Klicka på "New Policy"
5. Välj "For full customization"
6. Fyll i följande för rum:
   - Policy name: "Alla kan läsa rum"
   - Allowed operation: SELECT
   - USING expression: true
7. Fyll i följande för bokningar (skapa fyra separata policyer):
   - Policy för SELECT med USING: true
   - Policy för INSERT med CHECK: true
   - Policy för UPDATE med USING: true
   - Policy för DELETE med USING: true

## Anpassning

För att anpassa färgteman, ändra i `tailwind.config.js`-filen.

## Licens

MIT 