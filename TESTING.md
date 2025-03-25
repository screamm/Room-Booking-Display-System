# Testdokumentation för konferensrumsbokningsapplikationen

## Översikt

Detta dokument beskriver teststrategin för vår konferensrumsbokningsapplikation. Vi använder Jest och React Testing Library för att skapa enhetstester och integrationstester.

## Teststruktur

Testerna följer en hierarkisk struktur som speglar projektets uppbyggnad:

- **Utilities**: Tester för hjälpfunktioner (`src/utils/`)
- **Hooks**: Tester för anpassade React-hooks (`src/hooks/`)
- **Context**: Tester för React-contexts (`src/contexts/`)
- **API**: Tester för API-anrop (`src/lib/`)
- **Komponenter**: Tester för React-komponenter (`src/components/`)

## Köra tester

För att köra testerna har vi konfigurerat följande npm-skript:

- `npm test`: Kör alla tester en gång
- `npm run test:watch`: Kör tester i watch-läge (kör tester när filer ändras)
- `npm run test:coverage`: Kör tester och generera täckningsrapport
- `npm run test:ci`: Kör tester i CI-miljö

## Teststruktur

### Enhets- och integrationstester

Vi följer en standard för teststruktur som gör det enkelt att läsa och förstå testerna:

1. **Mock-upp av beroenden**
2. **Rendering/anrop av funktioner som ska testas**
3. **Verifikation av förväntat resultat**

Testerna för varje modul finns i en `.test.ts` eller `.test.tsx`-fil bredvid koden som testas.

### Mockade funktionaliteter

Vi använder Jest-mocks för att simulera externa beroenden:

- **API-anrop**: Mock-upp av Supabase-anrop
- **LocalStorage**: Mock-upp för konsekvent beteende i tester
- **Contexts**: Mock-upp för att testa komponenter i isolation

## Kodtäckning

Vi siktar på en kodtäckning på minst 70% för kritiska delar av applikationen:

- Datamodeller och logik
- API-integrationer
- Komplexa komponenter

Vi prioriterar att testa:

1. **Affärslogik**: Bokningskonflikter, datumhantering, etc.
2. **Användarinteraktioner**: Formulärhantering, drag & drop, etc.
3. **Tillgänglighet**: ARIA-attribut och tangentbordsnavigering

## Testfiler

Här är en lista på de viktigaste testfilerna:

- `src/utils/dateUtils.test.ts`: Tester för datum- och tidshantering
- `src/hooks/useLocalStorage.test.ts`: Tester för localStorage-hook
- `src/contexts/UserPreferencesContext.test.tsx`: Tester för användarpreferenskontext
- `src/lib/api.test.ts`: Tester för API-funktioner
- `src/components/ResponsiveBookingForm.test.tsx`: Tester för bokningsformulär
- `src/components/DraggableBookingCell.test.tsx`: Tester för drag & drop-funktionalitet

## Bästa praxis

1. **Isolerade tester**: Varje test ska vara oberoende och inte påverka andra tester
2. **Meningsfulla testnamn**: Använd beskrivande namn för `describe` och `it`
3. **Teståterställning**: Rensa allt tillstånd mellan tester (mocks, localStorage, etc.)
4. **Testa användarflöden**: Skriv tester som simulerar hur en användare interagerar med appen
5. **Undvik implementation-detaljer**: Testa beteende, inte implementation 