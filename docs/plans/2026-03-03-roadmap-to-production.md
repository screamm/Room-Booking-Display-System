# Sjobergska RoD – Roadmap to Production

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Göra Sjobergska Room on Display produktionsklar – säker, stabil och säljbar.

**Architecture:** React 19 + TypeScript frontend (Vite), Supabase (PostgreSQL) backend via REST. Två vyer: `ConferenceRoomBooking` (bokningssystem) och `RoomDisplay` (tavla utanför rummet). Deploy rekommenderas till Cloudflare Pages (frontend) + Supabase (backend) – se analys nedan.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, Supabase JS v2, react-dnd, date-fns, react-router-dom v7

---

## Var är vi nu?

### Vad som fungerar
- Komplett bokningsgränssnitt: kalendervy, veckovy, mobilvy
- Skapa/redigera/ta bort bokningar
- Drag-and-drop-bokning
- Återkommande bokningar (RecurringBookingForm)
- Akutbokning (EmergencyBookingButton) – fullt implementerad i desktop
- RoomDisplay – tavla per rum med snabbbokning, portätt-/landskapsläge, caching
- Mörkt/ljust tema
- Toast-notifikationer
- Sök och filtrering
- Färgkodning per bokningstyp
- Enhetstester (Jest) för nyckelkomponenter

### Vad som är trasigt / inte produktionssäkert

| Problem | Allvarlighetsgrad | Fil |
|---------|-------------------|-----|
| Ingen autentisering – vem som helst kan radera alla bokningar | KRITISK | `setupDatabase.sql` (RLS-policyer tillåter allt) |
| Supabase-nyckel hårdkodad som fallback | HÖG | `src/lib/supabase.ts:4-5` |
| Debug-loggar på varje API-anrop i produktion | HÖG | `src/lib/supabase.ts:31-55` |
| `console.log` i RoomDisplay | MEDIUM | `src/components/RoomDisplay.tsx:134,141,155` |
| Akut-knapp saknas i MobileBottomMenu | MEDIUM | `AKUT_BOKNING_IMPLEMENTERING.md` (ej integrerard) |
| Ingen admin-UI för att lägga till/redigera rum | MEDIUM | Saknas |
| Inga error boundaries – en krasch kraschar hela appen | MEDIUM | `src/App.tsx` |
| Race condition: överlapp-check + insert är inte atomär | LÅG | `src/lib/api.ts:160-178` |
| RoomDisplay pollar (30s) istället för realtid | LÅG | `src/components/RoomDisplay.tsx:90-116` |
| Google Calendar-sync är oklart om den fungerar i prod | LÅG | `src/components/GoogleCalendarSync.tsx` |

---

## Cloudflare D1 vs Supabase – Analys och Rekommendation

### Cloudflare D1 + Workers + R2
**Fördelar:**
- Edge-distribuerat: data serveras från närmaste Cloudflare-nod globalt (<10ms)
- Generöst gratis-tier (5M läsningar/dag gratis)
- Sammanhållen Cloudflare-stack om ni ändå vill ha Pages
- R2 för fillagring utan egress-kostnader

**Nackdelar:**
- SQLite-bas: stöder inte PostgreSQL-arrayer (`features TEXT[]`) – kräver omschematisering
- Ingen inbyggd auth – måste implementera Cloudflare Access eller JWT manuellt
- Ingen realtid – måste byta till polling eller WebSocket via Worker
- Kräver en Workers API-layer – kan inte anropa D1 direkt från webbläsaren
- Signifikant omskrivning av hela `src/lib/api.ts` + `src/lib/supabase.ts`
- D1 är fortfarande relativt nytt och under aktiv utveckling

**Konkret arbetsvolym för migration:** ~3-5 dagars arbete

### Supabase (nuvarande)
**Fördelar:**
- Redan integrerat och fungerande
- PostgreSQL-styrka (arrayer, transaktioner, RLS)
- Realtid tillgängligt (Supabase Realtime – ni pollar idag, men kan enkelt byta)
- Inbyggd auth (Supabase Auth)
- Automatisk REST-API via PostgREST
- Stabilare ekosystem

**Nackdelar:**
- Hosted i specifik region (inte edge-distribuerat)
- Free-tier kan pausa projekt efter inaktivitet

### Rekommendation: Behåll Supabase + Lägg till Cloudflare Pages

**För ett internt bokningssystem med 10-30 simultana användare spelar latensfördelarna med D1 ingen praktisk roll.** Supabase i EU (Frankfurt) ger ~20-50ms för svenska användare – helt acceptabelt.

Det bästa av två världar: **Deploya frontend till Cloudflare Pages** (gratis, snabb CDN för statiska assets, enkelt CI/CD från GitHub) **och behåll Supabase som databas.**

Om ni i framtiden vill ha D1 för global skalning är det ett separat projekt.

---

## Kan vi sälja produkten nu?

**Nej, ännu inte.** Tre blockers:

1. **Ingen autentisering** – vem som helst med URL-en kan radera bokningar
2. **Ingen admin-UI för rum** – kunden kan inte själv konfigurera sina rum
3. **Debug-kod i produktion** – professionalism och säkerhet

Med faserna nedan kan produkten vara säljbar inom ~1-2 veckors fokuserat arbete.

---

## Fasplan

```
Fas 1: Säkerhet & Stabilitet  (blockar försäljning)
Fas 2: Admin-funktioner       (blockar försäljning)
Fas 3: Mobile & UX-polish     (behövs för professionellt intryck)
Fas 4: Infrastructure         (valfritt – Cloudflare Pages deploy)
```

---

## FAS 1: Säkerhet & Stabilitet

### Task 1: Ta bort debug-logs från `supabase.ts`

**Files:**
- Modify: `src/lib/supabase.ts`

**Step 1: Läs filen och förstå den nuvarande fetch-wrappern**

Filen `src/lib/supabase.ts` wrappar varje fetch-anrop med console.log. Ta bort den anpassade `fetch`-wrappern helt och ersätt med en enklare klient.

**Step 2: Skriv det uppdaterade `supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('VITE_SUPABASE_URL och VITE_SUPABASE_ANON_KEY måste sättas i .env');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});
```

**Step 3: Skapa `.env.local` (om den inte finns) och verifiera att variablerna finns**

```bash
# .env.local (lägg ALDRIG till git)
VITE_SUPABASE_URL=https://dujhsevqigspbuckegnx.supabase.co
VITE_SUPABASE_ANON_KEY=<din anon key>
```

Kontrollera att `.gitignore` inkluderar `.env.local`.

**Step 4: Verifiera att appen startar**

```bash
npm run dev
```
Expected: Inga errors, inga debug-loggar i consolen vid sidladdning.

**Step 5: Ta bort console.logs från `RoomDisplay.tsx`**

Sök efter alla `console.log` och `console.error` i `src/components/RoomDisplay.tsx` (rader 134, 141, 155) och ta bort de som är rent diagnostiska.

**Step 6: Commit**

```bash
git add src/lib/supabase.ts src/components/RoomDisplay.tsx .gitignore
git commit -m "security: remove debug logs and hardcoded fallback keys"
```

---

### Task 2: Lägg till basic autentisering med PIN-kod

> **Bakgrund:** Full user-auth med konton är overkill för ett internt system. En PIN-kod som skyddar mot externa besökare är rimlig MVP. Supabase Auth används som källa för sessionshantering men med en enkel admin-PIN.

**Alternativ A (enklare):** Environment-variabel PIN – ingen databas
**Alternativ B (skalbart):** Supabase Auth med email/lösenord

Vi implementerar **Alternativ A** (YAGNI) – kan uppgraderas senare.

**Files:**
- Create: `src/components/PinGate.tsx`
- Modify: `src/App.tsx`
- Modify: `src/lib/supabase.ts` (uppdatera RLS-policyer)

**Step 1: Skapa `PinGate.tsx`**

```typescript
// src/components/PinGate.tsx
import React, { useState, useEffect } from 'react';

const PIN_KEY = 'rod_session_pin';
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 timmar

interface PinGateProps {
  children: React.ReactNode;
}

const PinGate: React.FC<PinGateProps> = ({ children }) => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const correctPin = import.meta.env.VITE_ACCESS_PIN;

  useEffect(() => {
    const stored = localStorage.getItem(PIN_KEY);
    if (stored) {
      const { pin: storedPin, timestamp } = JSON.parse(stored);
      if (storedPin === correctPin && Date.now() - timestamp < SESSION_DURATION) {
        setIsAuthorized(true);
      }
    }
  }, [correctPin]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === correctPin) {
      localStorage.setItem(PIN_KEY, JSON.stringify({ pin, timestamp: Date.now() }));
      setIsAuthorized(true);
    } else {
      setError('Fel PIN-kod. Försök igen.');
      setPin('');
    }
  };

  if (isAuthorized) return <>{children}</>;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-dark-900 flex items-center justify-center">
      <div className="bg-white dark:bg-dark-700 rounded-xl shadow-xl p-8 max-w-sm w-full mx-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
          Sjobergska RoD
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
          Ange PIN-koden för att fortsätta
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN-kod"
            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-500 rounded-lg bg-white dark:bg-dark-600 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            autoFocus
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            Logga in
          </button>
        </form>
      </div>
    </div>
  );
};

export default PinGate;
```

**Step 2: Lägg till env-variabel för PIN**

```bash
# .env.local
VITE_ACCESS_PIN=1234  # Byt till ett säkert värde
```

**Step 3: Wrappa appen i `PinGate` i `App.tsx`**

I `src/App.tsx`, importera `PinGate` och wrappa `AppContent`:

```typescript
// OBS: RoomDisplay (/display/:roomName) ska INTE kräva PIN – det är en display-tavla
// Lösning: visa PIN-gate bara för routen "/"

// Lägg till i AppContent:
return (
  <div className="app">
    <ThemeToggle />
    <Routes>
      <Route path="/" element={
        <PinGate>
          <ConferenceRoomBooking />
        </PinGate>
      } />
      <Route path="/display/:roomName" element={<DisplayRoom />} />
    </Routes>
  </div>
);
```

**Step 4: Testa manuellt**

```bash
npm run dev
```
- Besök `/` → ska se PIN-gate
- Ange fel PIN → ska se felmeddelande
- Ange rätt PIN → ska komma in i bokningsgränssnittet
- Besök `/display/Stora` → ska INTE kräva PIN

**Step 5: Commit**

```bash
git add src/components/PinGate.tsx src/App.tsx
git commit -m "feat: add PIN authentication gate for booking interface"
```

---

### Task 3: Lägg till Error Boundaries

**Files:**
- Create: `src/components/ErrorBoundary.tsx`
- Modify: `src/App.tsx`

**Step 1: Skapa `ErrorBoundary.tsx`**

```typescript
// src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-dark-900">
          <div className="bg-white dark:bg-dark-700 rounded-xl p-8 max-w-md text-center shadow-xl">
            <h2 className="text-xl font-bold text-red-500 mb-2">Något gick fel</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Ett oväntat fel uppstod. Ladda om sidan för att försöka igen.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            >
              Ladda om
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

**Step 2: Wrappa `AppContent` i `App.tsx`**

```typescript
import ErrorBoundary from './components/ErrorBoundary';

// Wrappa varje route-komponent:
<Route path="/" element={
  <ErrorBoundary>
    <PinGate>
      <ConferenceRoomBooking />
    </PinGate>
  </ErrorBoundary>
} />
<Route path="/display/:roomName" element={
  <ErrorBoundary>
    <DisplayRoom />
  </ErrorBoundary>
} />
```

**Step 3: Commit**

```bash
git add src/components/ErrorBoundary.tsx src/App.tsx
git commit -m "feat: add error boundaries to prevent full app crashes"
```

---

### Task 4: Fixa Akut-knappen i MobileBottomMenu

> `AKUT_BOKNING_IMPLEMENTERING.md` dokumenterar att detta inte gjordes. Nu gör vi det rätt.

**Files:**
- Modify: `src/components/MobileBottomMenu.tsx`
- Modify: `src/components/ConferenceRoomBooking.tsx`

**Step 1: Läs `MobileBottomMenu.tsx` för att förstå nuvarande interface**

**Step 2: Uppdatera interface i `MobileBottomMenu.tsx`**

Lägg till `onEmergencyBooking` prop och en Akut-knapp i renderingen. Se `AKUT_BOKNING_IMPLEMENTERING.md` för exakt kod.

**Step 3: Hitta MobileBottomMenu-anropet i `ConferenceRoomBooking.tsx`**

```bash
grep -n "MobileBottomMenu" src/components/ConferenceRoomBooking.tsx
```

**Step 4: Lägg till `onEmergencyBooking`-prop**

I `ConferenceRoomBooking.tsx`, hitta `<EmergencyBookingButton>` (är redan renderad i desktop) och koppla den till MobileBottomMenu via en ref eller callback-funktion.

Enklast: lägg till en `handleEmergencyClick` state/callback och skicka den till MobileBottomMenu.

**Step 5: Verifiera på mobilstorlek**

```bash
npm run dev
```
Öppna DevTools → mobilvy (375px bredd) → verifiera att Akut-knappen syns i bottom-menyn.

**Step 6: Commit**

```bash
git add src/components/MobileBottomMenu.tsx src/components/ConferenceRoomBooking.tsx
git commit -m "feat: integrate emergency booking button in mobile bottom menu"
```

---

## FAS 2: Admin-funktioner

### Task 5: Admin-UI för rumshantering

> Kunden måste kunna lägga till, redigera och ta bort rum utan att behöva kontakta oss.

**Files:**
- Create: `src/components/RoomManagement.tsx`
- Modify: `src/components/ConferenceRoomBooking.tsx` (lägg till admin-vy)
- Modify: `src/lib/api.ts` (lägg till `roomsApi.create`, `update`, `delete`)

**Step 1: Lägg till CRUD-metoder i `roomsApi` i `src/lib/api.ts`**

```typescript
// Lägg till efter getById():
async create(room: Omit<Room, 'id' | 'created_at'>): Promise<Room> {
  const { data, error } = await supabase
    .from('rooms')
    .insert([room])
    .select()
    .single();
  if (error) throw new Error(`Kunde inte skapa rum: ${error.message}`);
  return data;
},

async update(id: number, room: Partial<Omit<Room, 'id' | 'created_at'>>): Promise<Room> {
  const { data, error } = await supabase
    .from('rooms')
    .update(room)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`Kunde inte uppdatera rum: ${error.message}`);
  return data;
},

async delete(id: number): Promise<void> {
  const { error } = await supabase
    .from('rooms')
    .delete()
    .eq('id', id);
  if (error) throw new Error(`Kunde inte ta bort rum: ${error.message}`);
},
```

**Step 2: Uppdatera RLS-policyer i Supabase**

Kör i Supabase SQL Editor:

```sql
-- Ta bort de öppna admin-policyerna för rum
DROP POLICY IF EXISTS "Alla kan skapa rum" ON public.rooms;
DROP POLICY IF EXISTS "Alla kan uppdatera rum" ON public.rooms;
DROP POLICY IF EXISTS "Alla kan ta bort rum" ON public.rooms;

-- Lägg till skrivåtkomst (för anon i MVP – kan låsas med auth senare)
CREATE POLICY "Anon kan skriva rum"
ON public.rooms FOR ALL
USING (true)
WITH CHECK (true);
```

**Step 3: Skapa `RoomManagement.tsx`**

En enkel lista med rum, knappar för Redigera/Ta bort, och ett formulär för att lägga till nytt rum:

```typescript
// src/components/RoomManagement.tsx
import React, { useState } from 'react';
import { roomsApi } from '../lib/api';
import type { Room } from '../types/database.types';
import { useToast } from '../contexts/ToastContext';

interface RoomManagementProps {
  rooms: Room[];
  onRoomsChanged: () => void;
}

const RoomManagement: React.FC<RoomManagementProps> = ({ rooms, onRoomsChanged }) => {
  const { showToast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState({ name: '', capacity: 0, features: '' });

  const handleCreate = async () => {
    try {
      await roomsApi.create({
        name: formData.name,
        capacity: Number(formData.capacity),
        features: formData.features.split(',').map(f => f.trim()).filter(Boolean),
      });
      showToast(`Rum "${formData.name}" skapat`, 'success');
      setIsAdding(false);
      setFormData({ name: '', capacity: 0, features: '' });
      onRoomsChanged();
    } catch (err) {
      showToast('Kunde inte skapa rummet', 'error');
    }
  };

  const handleDelete = async (room: Room) => {
    if (!window.confirm(`Är du säker på att du vill ta bort "${room.name}"? Alla bokningar i rummet tas också bort.`)) return;
    try {
      await roomsApi.delete(room.id);
      showToast(`Rum "${room.name}" borttaget`, 'success');
      onRoomsChanged();
    } catch (err) {
      showToast('Kunde inte ta bort rummet', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Rumshantering</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
        >
          + Nytt rum
        </button>
      </div>

      {/* Rum-lista */}
      <div className="space-y-2">
        {rooms.map(room => (
          <div key={room.id} className="flex items-center justify-between p-4 bg-white dark:bg-dark-700 rounded-lg shadow-sm">
            <div>
              <span className="font-medium text-gray-800 dark:text-gray-100">{room.name}</span>
              <span className="text-gray-500 text-sm ml-2">({room.capacity} pers)</span>
              <span className="text-gray-400 text-xs ml-2">{room.features.join(', ')}</span>
            </div>
            <button
              onClick={() => handleDelete(room)}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Ta bort
            </button>
          </div>
        ))}
      </div>

      {/* Lägg till rum-formulär */}
      {isAdding && (
        <div className="p-4 bg-gray-50 dark:bg-dark-600 rounded-lg space-y-3">
          <input
            type="text"
            placeholder="Rumsnamn"
            value={formData.name}
            onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg dark:bg-dark-700 dark:border-dark-500 dark:text-gray-200"
          />
          <input
            type="number"
            placeholder="Kapacitet"
            value={formData.capacity || ''}
            onChange={e => setFormData(p => ({ ...p, capacity: Number(e.target.value) }))}
            className="w-full px-3 py-2 border rounded-lg dark:bg-dark-700 dark:border-dark-500 dark:text-gray-200"
          />
          <input
            type="text"
            placeholder="Funktioner (kommaseparerade, t.ex. Whiteboard, Videokonferens)"
            value={formData.features}
            onChange={e => setFormData(p => ({ ...p, features: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg dark:bg-dark-700 dark:border-dark-500 dark:text-gray-200"
          />
          <div className="flex gap-2">
            <button onClick={handleCreate} className="px-4 py-2 bg-primary-500 text-white rounded-lg">Skapa</button>
            <button onClick={() => setIsAdding(false)} className="px-4 py-2 bg-gray-200 dark:bg-dark-500 rounded-lg">Avbryt</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomManagement;
```

**Step 4: Lägg till "Admin"-vy i `ConferenceRoomBooking.tsx`**

Lägg till `'admin'` som ett möjligt värde för `currentView`. Lägg till en "Inställningar"-knapp i navigeringen som växlar till admin-vyn. Rendera `<RoomManagement>` när `currentView === 'admin'`.

**Step 5: Testa**

- Lägg till ett rum → ska synas i listan
- Ta bort ett rum → ska försvinna och bokningar tas bort via CASCADE

**Step 6: Commit**

```bash
git add src/components/RoomManagement.tsx src/components/ConferenceRoomBooking.tsx src/lib/api.ts
git commit -m "feat: add room management admin UI"
```

---

## FAS 3: Mobile & UX-polish

### Task 6: Mobile-audit och bugfix

**Files:**
- Modify: Varierar beroende på vad som hittas

**Step 1: Testa på faktiska mobilstorlekar**

Öppna DevTools i Chrome → Toggle device toolbar → Testa följande enheter:
- iPhone SE (375×667) – litet format
- iPhone 14 Pro (393×852) – standard iPhone
- Samsung Galaxy S21 (360×800)

Dokumentera visuella problem.

**Step 2: Vanliga problem att kontrollera**

- [ ] Navigeringsknappar flödar ut ur skärmen på smal bredd?
- [ ] Bokningsformulär är användbart på touch?
- [ ] Tidsväljare är fingervänliga (>44px touch-targets)?
- [ ] Textstorlekar är läsbara utan zoom?
- [ ] Dark mode fungerar korrekt på mobil?
- [ ] Akutknappen syns i bottom-menyn (från Task 4)?

**Step 3: Prioritera och åtgärda de tre mest kritiska problemen**

**Step 4: Commit**

```bash
git add src/
git commit -m "fix: mobile UI audit fixes"
```

---

### Task 7: Byt polling mot Supabase Realtime i RoomDisplay

> RoomDisplay pollar var 30:e sekund. Supabase Realtime ger instant uppdateringar.

**Files:**
- Modify: `src/components/RoomDisplay.tsx`

**Step 1: Förstå den nuvarande polling-logiken**

`fetchBookings` anropas via `useEffect` med ett interval. Identifiera exakt var.

**Step 2: Ersätt polling med Supabase-prenumeration**

```typescript
// Lägg till efter att room har hämtats:
useEffect(() => {
  if (!room) return;

  const channel = supabase
    .channel(`room-${room.id}-bookings`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: `room_id=eq.${room.id}`,
      },
      () => {
        fetchBookings(); // Hämta om vid förändring
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [room, fetchBookings]);
```

Behåll den initiala `fetchBookings`-anropet och 60-sekunders fallback-polling som säkerhetsnät.

**Step 3: Testa**

- Öppna RoomDisplay i ett fönster
- Skapa en bokning i ConferenceRoomBooking i ett annat fönster
- Verifiera att RoomDisplay uppdateras inom ~1 sekund

**Step 4: Commit**

```bash
git add src/components/RoomDisplay.tsx
git commit -m "feat: replace polling with Supabase Realtime in RoomDisplay"
```

---

## FAS 4: Infrastruktur (Rekommenderat)

### Task 8: Deploya till Cloudflare Pages

> Frontend deployas till Cloudflare Pages för CDN, automatiska previews och HTTPS.

**Files:**
- Create: `.github/workflows/pages.yml` (valfritt för CI)
- Supabase behålls som-är

**Step 1: Bygg projektet lokalt och verifiera**

```bash
npm run build
```
Expected: `dist/`-mapp skapas utan fel.

**Step 2: Skapa Cloudflare Pages-projekt**

1. Logga in på dash.cloudflare.com
2. Pages → Create a project → Connect to Git → Välj GitHub-repot
3. Build settings:
   - Framework preset: Vite
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Environment variables: Lägg till `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ACCESS_PIN`

**Step 3: Verifiera att appen fungerar på Pages-URL:en**

Testa alla routes: `/`, `/display/Stora` m.fl.

**Step 4: Konfigurera custom domain (valfritt)**

Om kunden har en domän: lägg till i Cloudflare DNS.

**Step 5: Commit eventuella config-ändringar**

```bash
git commit -m "infra: add Cloudflare Pages configuration"
```

---

## Prioriteringsordning

```
Fas 1, Task 1: Debug-logs → 20 min
Fas 1, Task 2: PIN-auth   → 45 min
Fas 1, Task 3: Error boundaries → 20 min
Fas 1, Task 4: Akut-knapp mobil → 30 min

Fas 2, Task 5: Admin rum-UI → 90 min

Fas 3, Task 6: Mobile audit → 60 min (beroende på vad som hittas)
Fas 3, Task 7: Realtime → 30 min

Fas 4, Task 8: Cloudflare Pages deploy → 30 min
```

**Total estimat:** ~6 timmar fokuserat arbete för att nå en säljbar MVP.

---

## Noteringar inför nästa session

- Supabase anon key är public och det är OK – men **PIN-koden** måste vara stark
- `features TEXT[]` är PostgreSQL-specifikt och är ett hinder om man byter till D1 framöver
- Google Calendar-integrationen (`src/components/GoogleCalendarSync.tsx`) är oklart om den fungerar – kräver separat Google Cloud-projekt med OAuth. Lämna det utanför MVP.
- `src/scripts/updateDatabaseForGoogleCalendar.sql` finns men har inte körts – ignorera i MVP
- Tomma `dist/`-mapp inkluderas i Git men bör ligga i `.gitignore`
