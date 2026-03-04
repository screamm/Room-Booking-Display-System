# Production Readiness Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Göra Sjobergska RoD produktionsklar och säljbar — autentisera Worker-API:et, fixa tysta fel, rensa dödkod och lägga till tester för kritisk affärslogik.

**Architecture:** Cloudflare Worker (REST + WebSocket via Durable Objects) + D1 (SQLite) + React 19 (Vite, Cloudflare Pages). En `API_TOKEN` Cloudflare-secret skyddar alla Worker-HTTP-endpoints. WebSocket-endpoints lämnas öppna (skickar bara notifikationer, ingen känslig data). Frontend skickar token via `Authorization: Bearer <token>` på varje request via en central `apiFetch`-funktion.

**Tech Stack:** Cloudflare Workers, D1, Durable Objects, Wrangler CLI, Vitest, @cloudflare/vitest-pool-workers, React 19, TypeScript, Vite, Tailwind CSS, Jest (frontend tests)

---

## Översikt — 10 tasks

```
Task 1:  Worker test-infrastruktur (Vitest + miniflare)
Task 2:  Worker API-autentisering (TDD)
Task 3:  Frontend skickar auth-token (apiFetch + RoomDisplay)
Task 4:  Worker global felhantering
Task 5:  RoomDisplay felvisning (toast + error state)
Task 6:  Ta bort @ts-ignore och floor-visning
Task 7:  Rensa dödkod (Supabase, Google Calendar, gamla skript)
Task 8:  RoomDisplay kod-städning (redundant URL-parsning)
Task 9:  Reskriv frontend api.test.ts för Cloudflare
Task 10: Worker affärslogik-tester (överlapp, validering)
```

---

## Task 1: Worker test-infrastruktur

**Files:**
- Create: `worker/vitest.config.ts`
- Create: `worker/src/index.test.ts` (stub)
- Modify: `worker/package.json`

**Step 1: Installera test-beroenden**

```bash
cd worker
npm install -D vitest @cloudflare/vitest-pool-workers
```

Expected: Inga fel.

**Step 2: Skapa `worker/vitest.config.ts`**

```typescript
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.toml" },
        miniflare: {
          // Test-token som ersätter Cloudflare-secret i miniflare-miljön
          vars: { API_TOKEN: "test-token-abc123" },
        },
      },
    },
  },
});
```

**Step 3: Skapa `worker/src/index.test.ts` med ett trivialtest**

```typescript
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";

describe("Worker smoke test", () => {
  it("OPTIONS /api/rooms returnerar 200", async () => {
    const res = await SELF.fetch("http://example.com/api/rooms", {
      method: "OPTIONS",
    });
    expect(res.status).toBe(200);
  });
});
```

**Step 4: Lägg till test-script i `worker/package.json`**

Lägg till i `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

**Step 5: Kör testet**

```bash
cd worker && npm test
```

Expected: `1 passed`

**Step 6: Commit**

```bash
git add worker/vitest.config.ts worker/src/index.test.ts worker/package.json
git commit -m "test: add Worker vitest infrastructure with miniflare"
```

---

## Task 2: Worker API-autentisering (TDD)

**Files:**
- Modify: `worker/src/index.test.ts`
- Modify: `worker/src/index.ts`

### Steg 2a — Skriv de misslyckande testerna

**Step 1: Lägg till auth-tester i `worker/src/index.test.ts`**

Ersätt hela filen:

```typescript
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";

const TOKEN = "test-token-abc123";
const AUTH = { Authorization: `Bearer ${TOKEN}` };
const BASE = "http://example.com";

describe("Authentication", () => {
  it("OPTIONS /api/rooms returnerar 200 utan token (preflight)", async () => {
    const res = await SELF.fetch(`${BASE}/api/rooms`, { method: "OPTIONS" });
    expect(res.status).toBe(200);
  });

  it("GET /api/rooms utan token returnerar 401", async () => {
    const res = await SELF.fetch(`${BASE}/api/rooms`);
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Unauthorized");
  });

  it("GET /api/rooms med fel token returnerar 401", async () => {
    const res = await SELF.fetch(`${BASE}/api/rooms`, {
      headers: { Authorization: "Bearer wrong-token" },
    });
    expect(res.status).toBe(401);
  });

  it("GET /api/rooms med korrekt token returnerar 200", async () => {
    const res = await SELF.fetch(`${BASE}/api/rooms`, { headers: AUTH });
    expect(res.status).toBe(200);
    const rooms = await res.json() as unknown[];
    expect(Array.isArray(rooms)).toBe(true);
  });

  it("WebSocket /api/ws/1 kräver INTE token (publik display)", async () => {
    // WS-endpoints är undantagna från auth — skickar bara notifikationer
    const res = await SELF.fetch(`${BASE}/api/ws/1`);
    expect(res.status).not.toBe(401);
  });
});
```

**Step 2: Kör testerna — de ska misslyckas**

```bash
cd worker && npm test
```

Expected: `GET /api/rooms utan token returnerar 401` misslyckas (får 200 eller 404, inte 401).

### Steg 2b — Implementera autentisering

**Step 3: Uppdatera `worker/src/index.ts`**

**Ändring 1** — Lägg till `API_TOKEN` i `Env`-interfacet (rad 4-7):
```typescript
export interface Env {
  DB: D1Database;
  BROADCASTER: DurableObjectNamespace;
  API_TOKEN: string;
}
```

**Ändring 2** — Lägg till hjälpfunktion direkt efter `err()`-funktionen (efter rad 24):
```typescript
function isAuthorized(request: Request, env: Env): boolean {
  const authHeader = request.headers.get('Authorization');
  return !!env.API_TOKEN && authHeader === `Bearer ${env.API_TOKEN}`;
}
```

**Ändring 3** — Lägg till auth-check i fetch-handlens topp, efter CORS preflight-blocket och FÖRE WebSocket-blocket. Ny struktur:

```typescript
// CORS preflight — alltid tillåtet
if (method === 'OPTIONS') {
  return new Response(null, { headers: CORS });
}

// WebSocket upgrade — auth skippas (display-tavlor, bara notifikationer)
if (path.startsWith('/api/ws/')) {
  const roomId = path.slice('/api/ws/'.length);
  if (!roomId) return err('Room ID required');
  const id = env.BROADCASTER.idFromName(`room-${roomId}`);
  const obj = env.BROADCASTER.get(id);
  return obj.fetch(request);
}

// Alla övriga HTTP-requests kräver Bearer-token
if (!isAuthorized(request, env)) {
  return json({ error: 'Unauthorized' }, 401);
}
```

**Step 4: Kör testerna — de ska nu passa**

```bash
cd worker && npm test
```

Expected: `5 passed`

**Step 5: Sätt upp `API_TOKEN` som Cloudflare-secret för produktion**

Generera ett starkt slumpmässigt värde:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Spara värdet och kör:
```bash
cd worker && npx wrangler secret put API_TOKEN
```

Klistra in det genererade värdet. Obs: detta värde lämnar ALDRIG koden — det lagras säkert i Cloudflare.

**Step 6: Commit**

```bash
git add worker/src/index.ts worker/src/index.test.ts
git commit -m "feat: add Bearer token authentication to Worker API"
```

---

## Task 3: Frontend skickar auth-token

**Files:**
- Modify: `src/lib/api.ts`
- Modify: `src/components/RoomDisplay.tsx`
- Modify: `.env.local`
- Modify: `.env.production.local`

**Step 1: Lägg till `VITE_API_TOKEN` i `.env.local`**

Använd SAMMA värde som du angav till `wrangler secret put API_TOKEN`:
```
VITE_API_TOKEN=<ditt-genererade-token-värde>
```

**Step 2: Lägg till `VITE_API_TOKEN` i `.env.production.local`**

Samma värde.

**Step 3: Exportera `apiFetch` och lägg till auth-header i `src/lib/api.ts`**

Rad 25 — ändra `async function apiFetch` till `export async function apiFetch`, och lägg till Authorization-header:

```typescript
export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = import.meta.env.VITE_API_TOKEN as string | undefined;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: response.statusText }));
    if (response.status === 409 && (data as { error?: string }).error === 'OVERLAP') {
      throw new OverlapError((data as { message?: string }).message);
    }
    throw new Error((data as { error?: string }).error ?? `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}
```

**Step 4: Lägg till `import { apiFetch }` i `src/components/RoomDisplay.tsx`**

Lägg till import överst (rad 3 räcker):
```typescript
import { apiFetch } from '../lib/api';
```

**Step 5: Ersätt alla direkta `fetch()`-anrop i RoomDisplay.tsx med `apiFetch`**

Det finns 7 direkta fetch-anrop. Ersätt alla. Här är varje ersättning:

**a) `fetchBookings` — hämta bokningar (~rad 100-107):**

```typescript
// REPLACE allt från const bookingsRes till const bookings:
// WITH:
const bookings = await apiFetch<Booking[]>(
  `/api/bookings?room_id=${room.id}&start_date=${today}&end_date=${tomorrow}`
);
```

**b) `fetchRoomData` — hämta rum (~rad 136-145):**

```typescript
// REPLACE: const apiUrl = ...; const roomsRes = await fetch(...); if (!roomsRes.ok) {...} const allRooms = await roomsRes.json();
// WITH:
const allRooms = await apiFetch<Room[]>('/api/rooms');
```

**c) `handleQuickBook` — hämta dagens bokningar (~rad 325-330):**

```typescript
// REPLACE:
const quickApiUrl = import.meta.env.VITE_API_URL as string;
const todayRes = await fetch(`${quickApiUrl}/api/bookings?room_id=${room.id}&date=${today}`);
const bookingsError = !todayRes.ok;
const allTodaysBookings: Booking[] | null = todayRes.ok ? await todayRes.json() : null;

// WITH:
let allTodaysBookings: Booking[] | null = null;
let bookingsError = false;
try {
  allTodaysBookings = await apiFetch<Booking[]>(`/api/bookings?room_id=${room.id}&date=${today}`);
} catch {
  bookingsError = true;
}
```

**d) `handleQuickBook` — POST ny bokning (~rad 374-386):**

```typescript
// REPLACE: const insertApiUrl = ...; const insertRes = await fetch(...); if (!insertRes.ok) {...} else { const insertedData = await insertRes.json(); ... }
// WITH:
const insertedData = await apiFetch<Booking>('/api/bookings', {
  method: 'POST',
  body: JSON.stringify(bookingData),
});
if (insertedData && insertedData.id) {
  setCurrentBooking(insertedData);
  setCurrentTime(new Date());
}
```

**e) `handleQuickBook` — refetch efter bokning (~rad 395-412):**

```typescript
// REPLACE: hela blocket från const refetchApiUrl till updateBookingStates(...)
// WITH:
const refetchDate = now.toISOString().split('T')[0];
const refetchTomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
try {
  const freshBookings = await apiFetch<Booking[]>(
    `/api/bookings?room_id=${room.id}&start_date=${refetchDate}&end_date=${refetchTomorrow}`
  );
  const cacheKey = `${room.id}-${refetchDate}-${refetchTomorrow}`;
  bookingsCache.set(cacheKey, { data: freshBookings, timestamp: Date.now() });
  updateBookingStates(freshBookings, currentTimeString);
} catch {
  // WebSocket triggar nästa uppdatering — tyst misslyckas är OK
}
```

**f) `handleCancelQuickMeeting` — DELETE (~rad 426-429):**

```typescript
// REPLACE: const cancelApiUrl = ...; const deleteRes = await fetch(...); if (!deleteRes.ok) throw ...
// WITH:
await apiFetch<{ success: boolean }>(`/api/bookings/${currentBooking.id}`, {
  method: 'DELETE',
});
```

**g) `handleCancelQuickMeeting` — refetch (~rad 435-444):**

```typescript
// REPLACE: const cancelRefetchRes = await fetch(...); if (cancelRefetchRes.ok) { const bookings = ... }
// WITH:
const canceledBookings = await apiFetch<Booking[]>(
  `/api/bookings?room_id=${room.id}&start_date=${cancelDate}&end_date=${cancelTomorrow}`
);
const cacheKey = `${room.id}-${cancelDate}-${cancelTomorrow}`;
bookingsCache.set(cacheKey, { data: canceledBookings, timestamp: Date.now() });
updateBookingStates(canceledBookings, currentTimeString);
```

**Step 6: Kompilera TypeScript**

```bash
npm run build
```

Expected: Inga fel.

**Step 7: Manuellt test**

```bash
# Terminal 1
cd worker && npx wrangler dev --local

# Terminal 2
npm run dev
```

- `http://localhost:5173` → PIN-gate → bokningsgränssnittet laddar
- `http://localhost:5173/display/Stora salen` → displaytavla utan PIN

Verifiera i DevTools → Network → varje API-request har headern `Authorization: Bearer ...`

**Step 8: Verifiera att Worker avvisar utan token**

```bash
curl -s http://localhost:8787/api/rooms
# Expected: {"error":"Unauthorized"}

curl -s -H "Authorization: Bearer test-token-abc123" http://localhost:8787/api/rooms
# Expected: JSON-array med rum
```

**Step 9: Commit**

```bash
git add src/lib/api.ts src/components/RoomDisplay.tsx
git commit -m "feat: send Bearer token from frontend to authenticated Worker API"
```

---

## Task 4: Worker global felhantering

**Files:**
- Modify: `worker/src/index.ts`
- Modify: `worker/src/index.test.ts`

**Step 1: Lägg till felhanteringstest i `worker/src/index.test.ts`**

Lägg till nytt describe-block i slutet av filen:

```typescript
describe("Error handling", () => {
  it("POST /api/bookings med ogiltig JSON returnerar 400", async () => {
    const res = await SELF.fetch("http://example.com/api/bookings", {
      method: "POST",
      headers: { Authorization: "Bearer test-token-abc123", "Content-Type": "application/json" },
      body: "{ invalid json }",
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(typeof body.error).toBe("string");
  });
});
```

**Step 2: Kör testet — det ska misslyckas**

```bash
cd worker && npm test
```

Expected: `POST /api/bookings med ogiltig JSON returnerar 400` FAIL (kastar troligen ett ohanterat undantag → 500 eller oväntat beteende).

**Step 3: Uppdatera `parseRoom` i `worker/src/index.ts`**

Hitta och uppdatera `parseRoom`-funktionen (rad 27-32):

```typescript
function parseRoom(row: Record<string, unknown>) {
  let features: string[] = [];
  try {
    features = JSON.parse((row.features as string) || '[]');
  } catch {
    features = [];
  }
  return { ...row, features };
}
```

**Step 4: Wrappa hela fetch-handelns innehåll med yttre try/catch**

Lägg till try/catch runt ALL kod innanför `async fetch(request, env)`:

```typescript
async fetch(request: Request, env: Env): Promise<Response> {
  try {

    // ... ALLT BEFINTLIGT INNEHÅLL HÄR (flytta in ett steg) ...

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Internal server error';
    console.error('Worker unhandled error:', message);
    return json({ error: 'Internal server error' }, 500);
  }
},
```

**Step 5: Lägg till try/catch runt varje `await request.json()`**

Det finns 5 stycken. Mönstret är detsamma för alla:

```typescript
// MÖNSTER — för varje request.json()-anrop:
let body: <lämplig typ>;
try {
  body = await request.json() as <lämplig typ>;
} catch {
  return err('Ogiltig JSON i request-body', 400);
}
```

Gör detta för:
1. `check-overlap` POST (~rad 70)
2. `POST /api/rooms` (~rad 90)
3. `PUT /api/rooms/:id` (~rad 112)
4. `POST /api/bookings` (~rad 153)
5. `PUT /api/bookings/:id` (~rad 191)

**Step 6: Kör testerna**

```bash
cd worker && npm test
```

Expected: Alla tester passerar.

**Step 7: Commit**

```bash
git add worker/src/index.ts worker/src/index.test.ts
git commit -m "fix: global try/catch in Worker, safe JSON.parse in parseRoom, request body validation"
```

---

## Task 5: RoomDisplay felvisning

**Files:**
- Modify: `src/components/RoomDisplay.tsx`

**Step 1: Importera `useToast` i `src/components/RoomDisplay.tsx`**

Lägg till bland importerna överst:
```typescript
import { useToast } from '../contexts/ToastContext';
```

**Step 2: Hämta `showToast` i komponentens body**

Direkt innanför `const RoomDisplay: React.FC = () => {`, efter befintliga state-deklarationer:
```typescript
const { showToast } = useToast();
```

**Step 3: Uppdatera `handleQuickBook`-catch**

Hitta `catch (error)` i `handleQuickBook` och ersätt:

```typescript
// REPLACE:
} catch (error) {
  console.error('Fel vid snabbbokning:', error);
}

// WITH:
} catch (error) {
  const message = error instanceof Error ? error.message : 'Okänt fel';
  console.error('Fel vid snabbbokning:', error);
  showToast(`Kunde inte boka rummet: ${message}`, 'error');
}
```

**Step 4: Uppdatera `handleCancelQuickMeeting`-catch**

```typescript
// REPLACE:
} catch (error) {
  console.error('Fel vid avbokning av snabbmöte:', error);
}

// WITH:
} catch (error) {
  const message = error instanceof Error ? error.message : 'Okänt fel';
  console.error('Fel vid avbokning av snabbmöte:', error);
  showToast(`Kunde inte avboka: ${message}`, 'error');
}
```

**Step 5: Lägg till error-visning i JSX**

Hitta `if (!room) { return (<div ...>Laddar...</div>); }` och lägg till ett `if (error)`-block direkt EFTER det (men FÖRE return-satsen för `!loading && !room`). Lägg det direkt efter `setLoading(false)` i JSX-strukturen:

```typescript
// Direkt efter if (!room) { return (...Laddar...); } blocket:
if (error) {
  return (
    <div className={`flex items-center justify-center min-h-screen ${
      displayTheme === 'dark'
        ? 'bg-gradient-to-br from-gray-900 via-[#001233] to-black'
        : 'bg-gradient-to-br from-slate-100 via-[#e0f2fe] to-white'
    }`}>
      <div className={`text-center p-8 ${displayTheme === 'dark' ? 'text-white' : 'text-black'}`}>
        <div className="text-5xl mb-4 opacity-50">!</div>
        <p className={`text-xl ${displayTheme === 'dark' ? 'text-red-300' : 'text-red-600'}`}>
          {error}
        </p>
      </div>
    </div>
  );
}
```

**Step 6: Manuellt test**

```bash
npm run dev
```

Stäng av Worker och besök `/display/Stora salen` — ska nu visa felmeddelandet istället för oändlig laddning.

**Step 7: Commit**

```bash
git add src/components/RoomDisplay.tsx
git commit -m "fix: show toast and error state on RoomDisplay failures"
```

---

## Task 6: Ta bort @ts-ignore och floor-visning

**Files:**
- Modify: `src/components/RoomDisplay.tsx`

**Step 1: Ta bort `getRoomFloor`-funktionen**

Hitta och ta bort dessa rader (~rad 558-561):
```typescript
const getRoomFloor = (room: Room) => {
  // @ts-ignore - Vi ignorerar TypeScript-felet här
  return room.floor || 1;
};
```

**Step 2: Ta bort "Våning X"-visningen i JSX**

Hitta och ta bort denna rad (~rad 600):
```typescript
<div className="text-xs md:text-sm lg:text-base xl:text-lg opacity-60">Våning {getRoomFloor(room)}</div>
```

**Step 3: Verifiera inga TypeScript-fel**

```bash
npm run build
```

Expected: Bygger utan fel.

**Step 4: Commit**

```bash
git add src/components/RoomDisplay.tsx
git commit -m "fix: remove @ts-ignore and dead floor display (floor not in D1 schema)"
```

---

## Task 7: Rensa dödkod

**Files:**
- Delete: `supabase/` (hela katalogen)
- Delete: `src/scripts/` (hela katalogen)
- Delete: `src/lib/initializeDatabase.ts`
- Delete: `src/lib/googleCalendar.ts`
- Delete: `src/lib/googleCalendarApi.ts`
- Delete: `src/hooks/useGoogleCalendar.ts`
- Delete: `src/components/GoogleCalendarSync.tsx`
- Delete: `src/lib/__tests__/api.test.ts` (gammal Supabase-version)
- Delete: `src/lib/api.test.ts` (duplikat)
- Delete: `src/mocks/googleapis.ts`
- Modify: `src/components/ConferenceRoomBooking.tsx`

**Step 1: Ta bort alla döda filer**

```bash
rm -rf supabase/
rm -rf src/scripts/
rm src/lib/initializeDatabase.ts
rm src/lib/googleCalendar.ts
rm src/lib/googleCalendarApi.ts
rm src/hooks/useGoogleCalendar.ts
rm src/components/GoogleCalendarSync.tsx
rm src/lib/__tests__/api.test.ts
rm src/lib/api.test.ts
rm src/mocks/googleapis.ts
```

**Step 2: Ta bort GoogleCalendarSync från ConferenceRoomBooking.tsx**

Kör:
```bash
grep -n "GoogleCalendar\|googleCalendar" src/components/ConferenceRoomBooking.tsx
```

Ta bort alla träffar: import-raden och alla JSX-användningar av `<GoogleCalendarSync .../>`.

**Step 3: Kör tester och bygg**

```bash
npm test && npm run build
```

Expected: Alla tester passerar. Bygget lyckas.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove dead Supabase and Google Calendar code"
```

---

## Task 8: RoomDisplay kod-städning

**Files:**
- Modify: `src/components/RoomDisplay.tsx`

**Step 1: Fixa redundant URL-parsning i `fetchRoomData`**

I `fetchRoomData`-funktionen används `window.location.pathname` manuellt (rad ~121-123) trots att `urlRoomName` redan finns från `useParams` (rad ~24). Ersätt:

```typescript
// REPLACE:
const pathSegments = window.location.pathname.split('/');
const roomNameFromUrl = pathSegments[pathSegments.length - 1];
const decodedRoomName = decodeURIComponent(roomNameFromUrl);

// WITH:
const decodedRoomName = urlRoomName ? decodeURIComponent(urlRoomName) : '';
if (!decodedRoomName) {
  setError('Inget rumsnamn angett i URL:en.');
  setLoading(false);
  return;
}
```

**Step 2: Kör TypeScript-kompilering**

```bash
npm run build
```

Expected: Inga fel.

**Step 3: Commit**

```bash
git add src/components/RoomDisplay.tsx
git commit -m "refactor: use useParams instead of manual URL parsing in RoomDisplay"
```

---

## Task 9: Reskriv frontend api.test.ts

**Files:**
- Create: `src/lib/__tests__/api.test.ts`

**Step 1: Skapa den nya testfilen**

Skapa `src/lib/__tests__/api.test.ts`:

```typescript
import { roomsApi, bookingsApi, OverlapError } from '../api';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as typeof fetch;

function mockResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response);
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('roomsApi', () => {
  describe('getAll', () => {
    it('anropar GET /api/rooms och returnerar rum-array', async () => {
      const mockRooms = [
        { id: 1, name: 'Stora salen', capacity: 20, features: ['Projektor'] },
      ];
      mockFetch.mockReturnValue(mockResponse(mockRooms));

      const result = await roomsApi.getAll();
      expect(result).toEqual(mockRooms);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('kastar Error vid HTTP-fel', async () => {
      mockFetch.mockReturnValue(mockResponse({ error: 'Server error' }, 500));
      await expect(roomsApi.getAll()).rejects.toThrow();
    });
  });

  describe('getById', () => {
    it('kastar Error vid ogiltigt ID 0', async () => {
      await expect(roomsApi.getById(0)).rejects.toThrow('Ogiltigt rum-ID');
    });

    it('kastar Error vid negativt ID', async () => {
      await expect(roomsApi.getById(-1)).rejects.toThrow('Ogiltigt rum-ID');
    });

    it('anropar GET /api/rooms/:id med korrekt ID', async () => {
      const mockRoom = { id: 1, name: 'Stora salen', capacity: 20, features: [] };
      mockFetch.mockReturnValue(mockResponse(mockRoom));

      const result = await roomsApi.getById(1);
      expect(result).toEqual(mockRoom);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/rooms/1'),
        expect.anything()
      );
    });
  });

  describe('create', () => {
    it('kastar Error för tomt rumsnamn', async () => {
      await expect(roomsApi.create({ name: '', capacity: 10, features: [] }))
        .rejects.toThrow('Rumsnamn måste anges');
    });

    it('kastar Error för ogiltig kapacitet 0', async () => {
      await expect(roomsApi.create({ name: 'Rum', capacity: 0, features: [] }))
        .rejects.toThrow('Kapacitet måste vara ett positivt tal');
    });

    it('anropar POST /api/rooms med korrekt body', async () => {
      const newRoom = { name: 'Nytt rum', capacity: 5, features: [] };
      mockFetch.mockReturnValue(mockResponse({ id: 5, ...newRoom }, 201));

      await roomsApi.create(newRoom);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/rooms'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newRoom),
        })
      );
    });
  });

  describe('delete', () => {
    it('kastar Error vid ogiltigt ID', async () => {
      await expect(roomsApi.delete(0)).rejects.toThrow('Ogiltigt rum-ID');
    });

    it('anropar DELETE /api/rooms/:id', async () => {
      mockFetch.mockReturnValue(mockResponse({ success: true }));
      await roomsApi.delete(3);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/rooms/3'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});

describe('bookingsApi', () => {
  const validBooking = {
    room_id: 1,
    date: '2026-03-10',
    start_time: '09:00',
    end_time: '10:00',
    booker: 'Anna Svensson',
    is_quick_booking: false as const,
  };

  describe('create', () => {
    it('kastar Error om booker saknas', async () => {
      await expect(
        bookingsApi.create({ ...validBooking, booker: '' })
      ).rejects.toThrow('Alla obligatoriska fält måste fyllas i');
    });

    it('kastar Error om sluttid inte är efter starttid', async () => {
      await expect(
        bookingsApi.create({ ...validBooking, start_time: '10:00', end_time: '09:00' })
      ).rejects.toThrow('Sluttiden måste vara efter starttiden');
    });

    it('anropar POST /api/bookings med korrekt body', async () => {
      mockFetch.mockReturnValue(mockResponse({ id: 1, ...validBooking }, 201));
      await bookingsApi.create(validBooking);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/bookings'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('kastar OverlapError vid 409 OVERLAP-svar', async () => {
      mockFetch.mockReturnValue(
        mockResponse({ error: 'OVERLAP', message: 'Bokningen överlappar' }, 409)
      );
      await expect(bookingsApi.create(validBooking)).rejects.toThrow(OverlapError);
    });

    it('OverlapError har rätt name', async () => {
      mockFetch.mockReturnValue(
        mockResponse({ error: 'OVERLAP', message: 'Bokningen överlappar' }, 409)
      );
      try {
        await bookingsApi.create(validBooking);
      } catch (e) {
        expect(e).toBeInstanceOf(OverlapError);
        expect((e as Error).name).toBe('OverlapError');
      }
    });
  });

  describe('getByDateRange', () => {
    it('kastar Error om startdatum är efter slutdatum', async () => {
      await expect(
        bookingsApi.getByDateRange('2026-03-10', '2026-03-01')
      ).rejects.toThrow('Startdatum kan inte vara efter slutdatum');
    });

    it('anropar med rätt query-parametrar', async () => {
      mockFetch.mockReturnValue(mockResponse([]));
      await bookingsApi.getByDateRange('2026-03-01', '2026-03-07');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('start_date=2026-03-01&end_date=2026-03-07'),
        expect.anything()
      );
    });
  });

  describe('checkOverlap', () => {
    it('returnerar true när Worker svarar overlaps: true', async () => {
      mockFetch.mockReturnValue(mockResponse({ overlaps: true }));
      const result = await bookingsApi.checkOverlap(1, '2026-03-10', '09:00', '10:00');
      expect(result).toBe(true);
    });

    it('returnerar false när Worker svarar overlaps: false', async () => {
      mockFetch.mockReturnValue(mockResponse({ overlaps: false }));
      const result = await bookingsApi.checkOverlap(1, '2026-03-10', '09:00', '10:00');
      expect(result).toBe(false);
    });

    it('kastar Error om sluttid inte är efter starttid', async () => {
      await expect(
        bookingsApi.checkOverlap(1, '2026-03-10', '10:00', '09:00')
      ).rejects.toThrow('Sluttiden måste vara efter starttiden');
    });
  });

  describe('delete', () => {
    it('kastar Error vid ogiltigt ID', async () => {
      await expect(bookingsApi.delete(0)).rejects.toThrow('Ogiltigt boknings-ID');
    });

    it('anropar DELETE /api/bookings/:id', async () => {
      mockFetch.mockReturnValue(mockResponse({ success: true }));
      await bookingsApi.delete(42);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/bookings/42'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});
```

**Step 2: Kör testerna**

```bash
npm test -- --testPathPattern="src/lib/__tests__/api.test.ts"
```

Expected: Alla 20+ tester passerar. Om `import.meta.env` inte fungerar i Jest, verifiera att `jest.config.js` har en `globals`-sektion:
```javascript
globals: {
  'import.meta': {
    env: {
      VITE_API_URL: 'http://localhost:8787',
      VITE_API_TOKEN: 'test-token',
    }
  }
}
```

**Step 3: Commit**

```bash
git add src/lib/__tests__/api.test.ts
git commit -m "test: rewrite api.test.ts for Cloudflare fetch-based API"
```

---

## Task 10: Worker affärslogik-tester

**Files:**
- Modify: `worker/src/index.test.ts`

**Step 1: Ersätt hela `worker/src/index.test.ts` med full test-suite**

Observera: Vi använder `DB.prepare().run()` och `DB.batch()` istället för `DB.exec()` för databasseeding — det är D1:s rekommenderade API.

```typescript
import { SELF, env } from "cloudflare:test";
import { describe, it, expect, beforeAll, beforeEach } from "vitest";

const TOKEN = "test-token-abc123";
const AUTH = { Authorization: `Bearer ${TOKEN}` };
const BASE = "http://example.com";

// Skapa schema en gång
beforeAll(async () => {
  await env.DB.batch([
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        capacity INTEGER NOT NULL,
        features TEXT NOT NULL DEFAULT '[]',
        created_at TEXT DEFAULT (datetime('now'))
      )
    `),
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        booker TEXT NOT NULL,
        purpose TEXT,
        booking_type TEXT DEFAULT 'meeting',
        is_quick_booking INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        CHECK (start_time < end_time)
      )
    `),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_bookings_room_date ON bookings(room_id, date)`),
  ]);
});

// Rensa och seed testdata inför varje test
beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM bookings'),
    env.DB.prepare('DELETE FROM rooms'),
    env.DB.prepare(`INSERT INTO rooms (id, name, capacity, features) VALUES (1, 'Testrum', 10, '["Whiteboard"]')`),
  ]);
});

// Hjälp: POST med auth
function post(path: string, body: unknown) {
  return SELF.fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { ...AUTH, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Hjälp: GET med auth
function get(path: string) {
  return SELF.fetch(`${BASE}${path}`, { headers: AUTH });
}

// ── Authentication ──────────────────────────────────────────────────────────

describe("Authentication", () => {
  it("OPTIONS returnerar 200 utan token (preflight)", async () => {
    const res = await SELF.fetch(`${BASE}/api/rooms`, { method: "OPTIONS" });
    expect(res.status).toBe(200);
  });

  it("GET /api/rooms utan token returnerar 401", async () => {
    const res = await SELF.fetch(`${BASE}/api/rooms`);
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Unauthorized");
  });

  it("GET /api/rooms med fel token returnerar 401", async () => {
    const res = await SELF.fetch(`${BASE}/api/rooms`, {
      headers: { Authorization: "Bearer wrong-token" },
    });
    expect(res.status).toBe(401);
  });

  it("GET /api/rooms med korrekt token returnerar 200", async () => {
    const res = await get("/api/rooms");
    expect(res.status).toBe(200);
  });

  it("WS /api/ws/1 kräver INTE token", async () => {
    const res = await SELF.fetch(`${BASE}/api/ws/1`);
    expect(res.status).not.toBe(401);
  });
});

// ── Rooms ───────────────────────────────────────────────────────────────────

describe("Rooms API", () => {
  it("GET /api/rooms returnerar seedat rum med features som array", async () => {
    const res = await get("/api/rooms");
    expect(res.status).toBe(200);
    const rooms = await res.json() as { id: number; name: string; features: string[] }[];
    expect(rooms).toHaveLength(1);
    expect(rooms[0].name).toBe("Testrum");
    expect(Array.isArray(rooms[0].features)).toBe(true);
    expect(rooms[0].features).toContain("Whiteboard");
  });

  it("POST /api/rooms skapar nytt rum och returnerar 201", async () => {
    const res = await post("/api/rooms", { name: "Nytt rum", capacity: 5, features: ["TV"] });
    expect(res.status).toBe(201);
    const room = await res.json() as { id: number; name: string; features: string[] };
    expect(room.name).toBe("Nytt rum");
    expect(room.features).toEqual(["TV"]);
  });

  it("POST /api/rooms utan namn returnerar 400", async () => {
    const res = await post("/api/rooms", { capacity: 5 });
    expect(res.status).toBe(400);
  });

  it("POST /api/rooms med kapacitet 0 returnerar 400", async () => {
    const res = await post("/api/rooms", { name: "Rum", capacity: 0 });
    expect(res.status).toBe(400);
  });

  it("GET /api/rooms/:id returnerar 404 för okänt ID", async () => {
    const res = await get("/api/rooms/999");
    expect(res.status).toBe(404);
  });

  it("DELETE /api/rooms/:id tar bort rum", async () => {
    const del = await SELF.fetch(`${BASE}/api/rooms/1`, {
      method: "DELETE",
      headers: AUTH,
    });
    expect(del.status).toBe(200);
    const check = await get("/api/rooms");
    const rooms = await check.json() as unknown[];
    expect(rooms).toHaveLength(0);
  });
});

// ── Bookings — Validering ───────────────────────────────────────────────────

describe("Bookings — Validering", () => {
  it("POST /api/bookings utan obligatoriska fält returnerar 400", async () => {
    const res = await post("/api/bookings", { room_id: 1 });
    expect(res.status).toBe(400);
  });

  it("POST /api/bookings med start >= end returnerar 400", async () => {
    const res = await post("/api/bookings", {
      room_id: 1, date: "2026-03-10",
      start_time: "10:00", end_time: "09:00", booker: "Test",
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/bookings med ogiltig JSON returnerar 400", async () => {
    const res = await SELF.fetch(`${BASE}/api/bookings`, {
      method: "POST",
      headers: { ...AUTH, "Content-Type": "application/json" },
      body: "{ invalid }",
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/bookings giltig data returnerar 201 med is_quick_booking: false", async () => {
    const res = await post("/api/bookings", {
      room_id: 1, date: "2026-03-10",
      start_time: "09:00", end_time: "10:00", booker: "Anna",
    });
    expect(res.status).toBe(201);
    const booking = await res.json() as { id: number; booker: string; is_quick_booking: boolean };
    expect(booking.booker).toBe("Anna");
    expect(booking.is_quick_booking).toBe(false);
  });

  it("POST /api/bookings med is_quick_booking: true returnerar is_quick_booking: true", async () => {
    const res = await post("/api/bookings", {
      room_id: 1, date: "2026-03-10",
      start_time: "09:00", end_time: "09:30",
      booker: "Spontanbokning", is_quick_booking: true,
    });
    expect(res.status).toBe(201);
    const booking = await res.json() as { is_quick_booking: boolean };
    expect(booking.is_quick_booking).toBe(true);
  });
});

// ── Bookings — Överlapp ─────────────────────────────────────────────────────

describe("Bookings — Överlapp", () => {
  beforeEach(async () => {
    // Seed en befintlig bokning 09:00-10:00
    await env.DB.prepare(
      `INSERT INTO bookings (room_id, date, start_time, end_time, booker)
       VALUES (1, '2026-03-10', '09:00', '10:00', 'Befintlig')`
    ).run();
  });

  it("POST /api/bookings som täcker befintlig bokning returnerar 409 OVERLAP", async () => {
    const res = await post("/api/bookings", {
      room_id: 1, date: "2026-03-10",
      start_time: "09:30", end_time: "10:30", booker: "Anna",
    });
    expect(res.status).toBe(409);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("OVERLAP");
  });

  it("POST /api/bookings angränsande (08:00-09:00) är INTE överlapp", async () => {
    const res = await post("/api/bookings", {
      room_id: 1, date: "2026-03-10",
      start_time: "08:00", end_time: "09:00", booker: "Bo",
    });
    expect(res.status).toBe(201);
  });

  it("POST /api/bookings angränsande (10:00-11:00) är INTE överlapp", async () => {
    const res = await post("/api/bookings", {
      room_id: 1, date: "2026-03-10",
      start_time: "10:00", end_time: "11:00", booker: "Bo",
    });
    expect(res.status).toBe(201);
  });

  it("POST /api/bookings annat datum är INTE överlapp", async () => {
    const res = await post("/api/bookings", {
      room_id: 1, date: "2026-03-11",
      start_time: "09:00", end_time: "10:00", booker: "Bo",
    });
    expect(res.status).toBe(201);
  });

  it("POST /api/bookings/check-overlap returnerar { overlaps: true } vid överlapp", async () => {
    const res = await post("/api/bookings/check-overlap", {
      room_id: 1, date: "2026-03-10",
      start_time: "09:30", end_time: "10:30",
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { overlaps: boolean };
    expect(body.overlaps).toBe(true);
  });

  it("POST /api/bookings/check-overlap returnerar { overlaps: false } utan överlapp", async () => {
    const res = await post("/api/bookings/check-overlap", {
      room_id: 1, date: "2026-03-10",
      start_time: "10:00", end_time: "11:00",
    });
    const body = await res.json() as { overlaps: boolean };
    expect(body.overlaps).toBe(false);
  });

  it("check-overlap med exclude_id exkluderar rätt bokning", async () => {
    // Hämta ID på den seedade bokningen
    const bookings = await get("/api/bookings?room_id=1&date=2026-03-10");
    const list = await bookings.json() as { id: number }[];
    const existingId = list[0].id;

    // Kontrollera överlapp men exkludera sig själv (simulate edit)
    const res = await post("/api/bookings/check-overlap", {
      room_id: 1, date: "2026-03-10",
      start_time: "09:00", end_time: "10:00",
      exclude_id: existingId,
    });
    const body = await res.json() as { overlaps: boolean };
    expect(body.overlaps).toBe(false);
  });
});

// ── Bookings — DELETE ───────────────────────────────────────────────────────

describe("Bookings — DELETE", () => {
  it("DELETE /api/bookings/:id som inte finns returnerar 404", async () => {
    const res = await SELF.fetch(`${BASE}/api/bookings/999`, {
      method: "DELETE",
      headers: AUTH,
    });
    expect(res.status).toBe(404);
  });

  it("DELETE /api/bookings/:id tar bort bokning och verifierar", async () => {
    const createRes = await post("/api/bookings", {
      room_id: 1, date: "2026-03-10",
      start_time: "09:00", end_time: "10:00", booker: "Anna",
    });
    const created = await createRes.json() as { id: number };

    const deleteRes = await SELF.fetch(`${BASE}/api/bookings/${created.id}`, {
      method: "DELETE", headers: AUTH,
    });
    expect(deleteRes.status).toBe(200);

    const checkRes = await get("/api/bookings?room_id=1&date=2026-03-10");
    const remaining = await checkRes.json() as unknown[];
    expect(remaining).toHaveLength(0);
  });
});
```

**Step 2: Kör alla Worker-tester**

```bash
cd worker && npm test
```

Expected: 25+ tester passerar.

**Step 3: Commit**

```bash
git add worker/src/index.test.ts
git commit -m "test: comprehensive Worker API tests — auth, rooms, bookings, overlap"
```

---

## Slutverifiering

**Step 1: Kör alla tester**

```bash
# Frontend (från projektrot)
npm test

# Worker
cd worker && npm test && cd ..
```

Expected: Alla tester passerar i båda.

**Step 2: Bygg frontend**

```bash
npm run build
```

Expected: Inga fel.

**Step 3: End-to-end manuellt test**

```bash
# Terminal 1
cd worker && npx wrangler dev --local

# Terminal 2 (projektrot)
npm run dev
```

Kontrollera:
- `http://localhost:5173` → PIN-gate → ange PIN → bokningsgränssnittet → skapa bokning
- `http://localhost:5173/display/Testrum` → displaytavla utan PIN → snabbbokning fungerar
- DevTools → Network → alla API-requests har `Authorization: Bearer ...`
- `curl -s http://localhost:8787/api/rooms` → `{"error":"Unauthorized"}`

---

## Noteringar för kunden

**PIN-kod:** Lagras i `.env.production.local` och Cloudflare Pages environment variables. Syns som literal sträng i JS-bunten (Vite bäddar in env-variabler). Acceptabelt för internt kontorsbruk — den som aktivt söker i bunten kan hitta PIN-koden.

**API-token:** Lagras som Cloudflare Worker-secret (aldrig i koden) och som `VITE_API_TOKEN` i `.env.production.local` + Cloudflare Pages env vars. Skyddar mot anonyma internetbots men syns i JS-bunten. För högre säkerhet: lägg Cloudflare Access (Zero Trust/SSO) framför Worker.

**CORS:** `Access-Control-Allow-Origin: '*'` tillåter anrop från vilken domän som helst. Om produkten driftsätts på en fast domän, begränsa till den domänen i Worker.
