# Migrate Supabase → Cloudflare D1 + Workers + Durable Objects

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Replace the dead Supabase backend with a Cloudflare Worker (API) + D1 (SQLite database) + Durable Objects (WebSocket real-time), keeping the same TypeScript interfaces so no React components need to change.

**Architecture:**
- `worker/` — standalone Cloudflare Worker project (TypeScript, deployed separately)
- Worker handles all HTTP API routes + WebSocket upgrades to a Durable Object per room
- Frontend replaces `supabase-js` calls with plain `fetch()` to `VITE_API_URL`
- `BookingsBroadcaster` Durable Object holds WebSocket connections; Worker notifies it after mutations

**Tech Stack:** Cloudflare Workers (TypeScript), Cloudflare D1 (SQLite), Cloudflare Durable Objects (WebSockets), Wrangler CLI, React 19 + Vite (frontend unchanged)

---

## Context for every subagent

The project root is the React frontend (`npm run dev` → Vite at localhost:5173).
A new `worker/` directory will contain the Cloudflare Worker project.
The Worker runs on `wrangler dev` at `http://localhost:8787` during local development.

**Key existing types** (do not change `src/types/database.types.ts`):
```typescript
interface Room { id: number; name: string; capacity: number; features: string[]; created_at?: string; }
interface Booking { id: number; room_id: number; date: string; start_time: string; end_time: string;
  booker: string; purpose?: string; booking_type?: BookingType; is_quick_booking?: boolean; created_at?: string; }
```

**D1 note:** `features` is stored as JSON TEXT in SQLite. `is_quick_booking` is INTEGER 0/1.
The Worker always parses/converts these before returning JSON.

---

## Task 1: Worker project scaffold

**Files:**
- Create: `worker/package.json`
- Create: `worker/tsconfig.json`
- Create: `worker/wrangler.toml`

**Step 1: Create `worker/package.json`**

```json
{
  "name": "sjobergska-api",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250101.0",
    "typescript": "^5.4.0",
    "wrangler": "^3.109.0"
  }
}
```

**Step 2: Create `worker/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "noEmit": true
  },
  "include": ["src/**/*"]
}
```

**Step 3: Create `worker/wrangler.toml`**

```toml
name = "sjobergska-api"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[[d1_databases]]
binding = "DB"
database_name = "sjobergska-db"
database_id = "PLACEHOLDER"

[durable_objects]
bindings = [
  { name = "BROADCASTER", class_name = "BookingsBroadcaster" }
]

[[migrations]]
tag = "v1"
new_classes = ["BookingsBroadcaster"]
```

Note: `database_id = "PLACEHOLDER"` will be replaced in Task 8 (deployment).

**Step 4: Install Worker dependencies**

Run in `worker/`:
```bash
cd worker && npm install
```
Expected: `node_modules/` created, no errors.

**Step 5: Commit**

```bash
git add worker/
git commit -m "chore: scaffold Cloudflare Worker project"
```

---

## Task 2: D1 schema and seed data

**Files:**
- Create: `worker/schema.sql`

**Step 1: Create `worker/schema.sql`**

```sql
-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  name    TEXT    NOT NULL,
  capacity INTEGER NOT NULL,
  features TEXT   NOT NULL DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id          INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  date             TEXT    NOT NULL,
  start_time       TEXT    NOT NULL,
  end_time         TEXT    NOT NULL,
  booker           TEXT    NOT NULL,
  purpose          TEXT,
  booking_type     TEXT    DEFAULT 'meeting',
  is_quick_booking INTEGER DEFAULT 0,
  created_at       TEXT    DEFAULT (datetime('now')),
  CHECK (start_time < end_time)
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_bookings_room_date ON bookings(room_id, date);

-- Seed: the 4 conference rooms
INSERT OR IGNORE INTO rooms (id, name, capacity, features) VALUES
  (1, 'Stora salen',   20, '["Projektor","Whiteboard","Videokonferens"]'),
  (2, 'Mellanrummet',   8, '["Whiteboard","TV-skärm"]'),
  (3, 'Lilla rummet',   5, '["Whiteboard"]'),
  (4, 'Båset',          2, '[]');
```

**Step 2: Verify SQL is valid SQLite (local only, no credentials needed)**

```bash
cd worker
npx wrangler d1 execute sjobergska-db --local --file=./schema.sql
```
Expected: tables created, 4 rows inserted, no errors.
If `sjobergska-db` doesn't exist locally yet, run first:
```bash
npx wrangler d1 create sjobergska-db --local
```

**Step 3: Verify seed data**

```bash
npx wrangler d1 execute sjobergska-db --local --command="SELECT id, name, capacity FROM rooms"
```
Expected output:
```
┌────┬───────────────┬──────────┐
│ id │ name          │ capacity │
├────┼───────────────┼──────────┤
│ 1  │ Stora salen   │ 20       │
│ 2  │ Mellanrummet  │ 8        │
│ 3  │ Lilla rummet  │ 5        │
│ 4  │ Båset         │ 2        │
└────┴───────────────┴──────────┘
```

**Step 4: Commit**

```bash
git add worker/schema.sql
git commit -m "feat: D1 schema with rooms and bookings tables"
```

---

## Task 3: Worker — Rooms + Bookings REST API

**Files:**
- Create: `worker/src/index.ts`

This is the main Worker. It handles all REST endpoints. The Durable Object (Task 4) will be imported here.

**Step 1: Create `worker/src/index.ts`**

```typescript
import { BookingsBroadcaster } from './durable-object';
export { BookingsBroadcaster };

export interface Env {
  DB: D1Database;
  BROADCASTER: DurableObjectNamespace;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function err(message: string, status = 400): Response {
  return json({ error: message }, status);
}

// Parse a room row: features is stored as JSON string
function parseRoom(row: Record<string, unknown>) {
  return {
    ...row,
    features: JSON.parse((row.features as string) || '[]'),
  };
}

// Parse a booking row: is_quick_booking is stored as 0/1
function parseBooking(row: Record<string, unknown>) {
  return {
    ...row,
    is_quick_booking: row.is_quick_booking === 1,
  };
}

async function broadcastRoomUpdate(env: Env, roomId: number): Promise<void> {
  const id = env.BROADCASTER.idFromName(`room-${roomId}`);
  const obj = env.BROADCASTER.get(id);
  await obj.fetch('http://do/broadcast', { method: 'POST' });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname: path, searchParams } = url;
    const method = request.method;

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    // ── WebSocket upgrade ──────────────────────────────────────────────────
    if (path.startsWith('/api/ws/')) {
      const roomId = path.slice('/api/ws/'.length);
      if (!roomId) return err('Room ID required');
      const id = env.BROADCASTER.idFromName(`room-${roomId}`);
      const obj = env.BROADCASTER.get(id);
      return obj.fetch(request);
    }

    // ── Overlap check (must be before /api/bookings/:id) ──────────────────
    if (path === '/api/bookings/check-overlap' && method === 'POST') {
      const body = await request.json() as {
        room_id: number; date: string; start_time: string; end_time: string; exclude_id?: number;
      };
      let q = 'SELECT id FROM bookings WHERE room_id=? AND date=? AND start_time<? AND end_time>?';
      const p: unknown[] = [body.room_id, body.date, body.end_time, body.start_time];
      if (body.exclude_id) { q += ' AND id!=?'; p.push(body.exclude_id); }
      const result = await env.DB.prepare(q).bind(...p).first();
      return json({ overlaps: !!result });
    }

    // ── /api/rooms ─────────────────────────────────────────────────────────
    if (path === '/api/rooms') {
      if (method === 'GET') {
        const { results } = await env.DB.prepare(
          'SELECT * FROM rooms ORDER BY name ASC'
        ).all();
        return json(results.map(parseRoom));
      }

      if (method === 'POST') {
        const body = await request.json() as { name: string; capacity: number; features?: string[] };
        if (!body.name?.trim()) return err('Rumsnamn måste anges');
        if (!body.capacity || body.capacity <= 0) return err('Kapacitet måste vara ett positivt tal');
        const room = await env.DB.prepare(
          'INSERT INTO rooms (name, capacity, features) VALUES (?, ?, ?) RETURNING *'
        ).bind(body.name.trim(), body.capacity, JSON.stringify(body.features || [])).first();
        return json(parseRoom(room as Record<string, unknown>), 201);
      }
    }

    // ── /api/rooms/:id ─────────────────────────────────────────────────────
    const roomIdMatch = path.match(/^\/api\/rooms\/(\d+)$/);
    if (roomIdMatch) {
      const id = parseInt(roomIdMatch[1]);

      if (method === 'PUT') {
        const body = await request.json() as Partial<{ name: string; capacity: number; features: string[] }>;
        const sets: string[] = [];
        const vals: unknown[] = [];
        if (body.name !== undefined) { sets.push('name=?'); vals.push(body.name.trim()); }
        if (body.capacity !== undefined) { sets.push('capacity=?'); vals.push(body.capacity); }
        if (body.features !== undefined) { sets.push('features=?'); vals.push(JSON.stringify(body.features)); }
        if (sets.length === 0) return err('Inga fält att uppdatera');
        vals.push(id);
        await env.DB.prepare(`UPDATE rooms SET ${sets.join(',')} WHERE id=?`).bind(...vals).run();
        const room = await env.DB.prepare('SELECT * FROM rooms WHERE id=?').bind(id).first();
        if (!room) return err(`Inget rum hittades med ID ${id}`, 404);
        return json(parseRoom(room as Record<string, unknown>));
      }

      if (method === 'DELETE') {
        const existing = await env.DB.prepare('SELECT id FROM rooms WHERE id=?').bind(id).first();
        if (!existing) return err(`Inget rum hittades med ID ${id}`, 404);
        await env.DB.prepare('DELETE FROM rooms WHERE id=?').bind(id).run();
        return json({ success: true });
      }
    }

    // ── /api/bookings ──────────────────────────────────────────────────────
    if (path === '/api/bookings') {
      if (method === 'GET') {
        let q = 'SELECT * FROM bookings WHERE 1=1';
        const p: unknown[] = [];
        const roomId = searchParams.get('room_id');
        const date = searchParams.get('date');
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');
        if (roomId) { q += ' AND room_id=?'; p.push(parseInt(roomId)); }
        if (date) { q += ' AND date=?'; p.push(date); }
        if (startDate) { q += ' AND date>=?'; p.push(startDate); }
        if (endDate) { q += ' AND date<=?'; p.push(endDate); }
        q += ' ORDER BY date ASC, start_time ASC';
        const { results } = await env.DB.prepare(q).bind(...p).all();
        return json(results.map(parseBooking));
      }

      if (method === 'POST') {
        const body = await request.json() as {
          room_id: number; date: string; start_time: string; end_time: string;
          booker: string; purpose?: string; booking_type?: string; is_quick_booking?: boolean;
        };
        if (!body.room_id || !body.date || !body.start_time || !body.end_time || !body.booker) {
          return err('Alla obligatoriska fält måste fyllas i');
        }
        if (body.start_time >= body.end_time) {
          return err('Sluttiden måste vara efter starttiden');
        }
        // Overlap check
        const overlap = await env.DB.prepare(
          'SELECT id FROM bookings WHERE room_id=? AND date=? AND start_time<? AND end_time>?'
        ).bind(body.room_id, body.date, body.end_time, body.start_time).first();
        if (overlap) {
          return json({ error: 'OVERLAP', message: 'Bokningen överlappar med en befintlig bokning' }, 409);
        }
        const booking = await env.DB.prepare(
          `INSERT INTO bookings (room_id, date, start_time, end_time, booker, purpose, booking_type, is_quick_booking)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
        ).bind(
          body.room_id, body.date, body.start_time, body.end_time,
          body.booker, body.purpose ?? null, body.booking_type ?? 'meeting',
          body.is_quick_booking ? 1 : 0
        ).first();
        await broadcastRoomUpdate(env, body.room_id);
        return json(parseBooking(booking as Record<string, unknown>), 201);
      }
    }

    // ── /api/bookings/:id ──────────────────────────────────────────────────
    const bookingIdMatch = path.match(/^\/api\/bookings\/(\d+)$/);
    if (bookingIdMatch) {
      const id = parseInt(bookingIdMatch[1]);

      if (method === 'PUT') {
        const current = await env.DB.prepare('SELECT * FROM bookings WHERE id=?').bind(id).first();
        if (!current) return err(`Ingen bokning hittades med ID ${id}`, 404);
        const body = await request.json() as Partial<{
          room_id: number; date: string; start_time: string; end_time: string;
          booker: string; purpose: string; booking_type: string; is_quick_booking: boolean;
        }>;
        const sets: string[] = [];
        const vals: unknown[] = [];
        if (body.room_id !== undefined) { sets.push('room_id=?'); vals.push(body.room_id); }
        if (body.date !== undefined) { sets.push('date=?'); vals.push(body.date); }
        if (body.start_time !== undefined) { sets.push('start_time=?'); vals.push(body.start_time); }
        if (body.end_time !== undefined) { sets.push('end_time=?'); vals.push(body.end_time); }
        if (body.booker !== undefined) { sets.push('booker=?'); vals.push(body.booker); }
        if (body.purpose !== undefined) { sets.push('purpose=?'); vals.push(body.purpose); }
        if (body.booking_type !== undefined) { sets.push('booking_type=?'); vals.push(body.booking_type); }
        if (body.is_quick_booking !== undefined) { sets.push('is_quick_booking=?'); vals.push(body.is_quick_booking ? 1 : 0); }
        if (sets.length === 0) return err('Inga fält att uppdatera');
        vals.push(id);
        await env.DB.prepare(`UPDATE bookings SET ${sets.join(',')} WHERE id=?`).bind(...vals).run();
        const booking = await env.DB.prepare('SELECT * FROM bookings WHERE id=?').bind(id).first();
        await broadcastRoomUpdate(env, current.room_id as number);
        return json(parseBooking(booking as Record<string, unknown>));
      }

      if (method === 'DELETE') {
        const booking = await env.DB.prepare('SELECT room_id FROM bookings WHERE id=?').bind(id).first();
        if (!booking) return err(`Ingen bokning hittades med ID ${id}`, 404);
        await env.DB.prepare('DELETE FROM bookings WHERE id=?').bind(id).run();
        await broadcastRoomUpdate(env, booking.room_id as number);
        return json({ success: true });
      }
    }

    return err('Not found', 404);
  },
};
```

**Step 2: Verify TypeScript compiles**

```bash
cd worker && npx tsc --noEmit
```
Expected: no errors. (The `BookingsBroadcaster` import will fail until Task 4 — create a stub first.)

Create stub `worker/src/durable-object.ts` so TypeScript doesn't complain:
```typescript
export class BookingsBroadcaster {}
```

Then run `npx tsc --noEmit` — should pass.

**Step 3: Commit**

```bash
git add worker/src/
git commit -m "feat: Worker REST API for rooms and bookings"
```

---

## Task 4: Durable Object — BookingsBroadcaster WebSocket hub

**Files:**
- Modify: `worker/src/durable-object.ts` (replace stub)

**Step 1: Replace stub with full implementation**

```typescript
import type { Env } from './index';

export class BookingsBroadcaster implements DurableObject {
  private state: DurableObjectState;

  constructor(state: DurableObjectState, _env: Env) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    // Called by Worker to broadcast a booking change to all connected clients
    if (request.method === 'POST' && new URL(request.url).pathname === '/broadcast') {
      const sockets = this.state.getWebSockets();
      const message = JSON.stringify({ type: 'bookings-updated' });
      for (const ws of sockets) {
        try {
          ws.send(message);
        } catch {
          // Socket already closed — DO cleanup handles it
        }
      }
      return new Response('ok');
    }

    // WebSocket upgrade — client wants real-time updates for this room
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];

    // acceptWebSocket enables hibernation: DO can sleep between messages
    this.state.acceptWebSocket(server);

    return new Response(null, { status: 101, webSocket: client });
  }

  // Called by DO runtime on incoming message (ping/pong keepalive)
  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void {
    if (message === 'ping') ws.send('pong');
  }

  webSocketClose(_ws: WebSocket): void {
    // DO runtime handles cleanup automatically with hibernation
  }

  webSocketError(_ws: WebSocket, error: unknown): void {
    console.error('BookingsBroadcaster WebSocket error:', error);
  }
}
```

**Step 2: Verify TypeScript compiles**

```bash
cd worker && npx tsc --noEmit
```
Expected: no errors.

**Step 3: Test locally — start Worker**

```bash
cd worker && npx wrangler dev --local
```
Expected output includes: `Ready on http://localhost:8787`

**Step 4: Verify rooms endpoint**

In a new terminal:
```bash
curl http://localhost:8787/api/rooms
```
Expected:
```json
[
  {"id":1,"name":"Stora salen","capacity":20,"features":["Projektor","Whiteboard","Videokonferens"],...},
  {"id":2,"name":"Mellanrummet","capacity":8,"features":["Whiteboard","TV-skärm"],...},
  {"id":3,"name":"Lilla rummet","capacity":5,"features":["Whiteboard"],...},
  {"id":4,"name":"Båset","capacity":2,"features":[],...}
]
```

**Step 5: Verify booking creation**

```bash
curl -X POST http://localhost:8787/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"room_id":1,"date":"2026-03-04","start_time":"09:00","end_time":"10:00","booker":"Test"}'
```
Expected: `201` response with booking object.

**Step 6: Verify overlap detection**

```bash
curl -X POST http://localhost:8787/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"room_id":1,"date":"2026-03-04","start_time":"09:30","end_time":"10:30","booker":"Test2"}'
```
Expected: `409` response with `{"error":"OVERLAP","message":"..."}`

**Step 7: Commit**

```bash
git add worker/src/durable-object.ts
git commit -m "feat: BookingsBroadcaster Durable Object with WebSocket hibernation"
```

---

## Task 5: Frontend — rewrite `src/lib/api.ts`

**Files:**
- Modify: `src/lib/api.ts`

Replace all `supabase` calls with `fetch()`. Keep the same exported interface (`roomsApi`, `bookingsApi`, `checkOverlap`, `OverlapError`, `formatTimeForComparison`) so no other component needs to change.

**Step 1: Replace entire `src/lib/api.ts`**

```typescript
import type { Room, Booking } from '../types/database.types';

const API_URL = import.meta.env.VITE_API_URL as string;

export class OverlapError extends Error {
  constructor(message = 'Bokningen överlappar med en befintlig bokning') {
    super(message);
    this.name = 'OverlapError';
  }
}

export function formatTimeForComparison(timeString: string): number {
  try {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  } catch {
    return 0;
  }
}

const logError = (message: string, error: unknown) => {
  console.error(`API ERROR: ${message}`, error);
};

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
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

export const roomsApi = {
  async getAll(): Promise<Room[]> {
    try {
      return await apiFetch<Room[]>('/api/rooms');
    } catch (error) {
      logError('Fel vid hämtning av rum:', error);
      throw new Error('Ett oväntat fel uppstod vid hämtning av rum');
    }
  },

  async getById(id: number): Promise<Room | null> {
    if (!id || id <= 0) throw new Error('Ogiltigt rum-ID');
    try {
      return await apiFetch<Room>(`/api/rooms/${id}`);
    } catch (error) {
      logError(`Fel vid hämtning av rum med id ${id}:`, error);
      throw error;
    }
  },

  async create(room: Omit<Room, 'id' | 'created_at'>): Promise<Room> {
    if (!room.name?.trim()) throw new Error('Rumsnamn måste anges');
    if (!room.capacity || room.capacity <= 0) throw new Error('Kapacitet måste vara ett positivt tal');
    try {
      return await apiFetch<Room>('/api/rooms', { method: 'POST', body: JSON.stringify(room) });
    } catch (error) {
      logError('Fel vid skapande av rum:', error);
      throw error;
    }
  },

  async update(id: number, room: Partial<Omit<Room, 'id' | 'created_at'>>): Promise<Room> {
    if (!id || id <= 0) throw new Error('Ogiltigt rum-ID');
    try {
      return await apiFetch<Room>(`/api/rooms/${id}`, { method: 'PUT', body: JSON.stringify(room) });
    } catch (error) {
      logError(`Fel vid uppdatering av rum med id ${id}:`, error);
      throw error;
    }
  },

  async delete(id: number): Promise<void> {
    if (!id || id <= 0) throw new Error('Ogiltigt rum-ID');
    try {
      await apiFetch<{ success: boolean }>(`/api/rooms/${id}`, { method: 'DELETE' });
    } catch (error) {
      logError(`Fel vid borttagning av rum med id ${id}:`, error);
      throw error;
    }
  },
};

export const bookingsApi = {
  async getAll(): Promise<Booking[]> {
    try {
      return await apiFetch<Booking[]>('/api/bookings');
    } catch (error) {
      logError('Fel vid hämtning av bokningar:', error);
      throw new Error('Ett oväntat fel uppstod vid hämtning av bokningar');
    }
  },

  async getByDateRange(startDate: string, endDate: string): Promise<Booking[]> {
    if (!startDate || !endDate) throw new Error('Start- och slutdatum måste anges');
    if (startDate > endDate) throw new Error('Startdatum kan inte vara efter slutdatum');
    try {
      return await apiFetch<Booking[]>(`/api/bookings?start_date=${startDate}&end_date=${endDate}`);
    } catch (error) {
      logError(`Fel vid hämtning av bokningar mellan ${startDate} och ${endDate}:`, error);
      throw error;
    }
  },

  async getByDate(date: string): Promise<Booking[]> {
    if (!date) throw new Error('Datum måste anges');
    try {
      return await apiFetch<Booking[]>(`/api/bookings?date=${date}`);
    } catch (error) {
      logError(`Fel vid hämtning av bokningar för datum ${date}:`, error);
      throw error;
    }
  },

  async create(booking: Omit<Booking, 'id' | 'created_at'>): Promise<Booking> {
    if (!booking.room_id || !booking.date || !booking.start_time || !booking.end_time || !booking.booker) {
      throw new Error('Alla obligatoriska fält måste fyllas i');
    }
    if (booking.start_time >= booking.end_time) throw new Error('Sluttiden måste vara efter starttiden');
    try {
      return await apiFetch<Booking>('/api/bookings', { method: 'POST', body: JSON.stringify(booking) });
    } catch (error) {
      logError('Fel vid skapande av bokning:', error);
      throw error;
    }
  },

  async update(id: number, booking: Partial<Omit<Booking, 'id' | 'created_at'>>): Promise<Booking> {
    if (!id || id <= 0) throw new Error('Ogiltigt boknings-ID');
    if (booking.start_time && booking.end_time && booking.start_time >= booking.end_time) {
      throw new Error('Sluttiden måste vara efter starttiden');
    }
    try {
      return await apiFetch<Booking>(`/api/bookings/${id}`, { method: 'PUT', body: JSON.stringify(booking) });
    } catch (error) {
      logError(`Fel vid uppdatering av bokning med id ${id}:`, error);
      throw error;
    }
  },

  async delete(id: number): Promise<void> {
    if (!id || id <= 0) throw new Error('Ogiltigt boknings-ID');
    try {
      await apiFetch<{ success: boolean }>(`/api/bookings/${id}`, { method: 'DELETE' });
    } catch (error) {
      logError(`Fel vid borttagning av bokning med id ${id}:`, error);
      throw error;
    }
  },

  async checkOverlap(
    roomId: number, date: string, startTime: string, endTime: string, excludeId?: number
  ): Promise<boolean> {
    if (!roomId || !date || !startTime || !endTime) throw new Error('Alla obligatoriska fält måste fyllas i');
    if (startTime >= endTime) throw new Error('Sluttiden måste vara efter starttiden');
    return checkOverlap(roomId, date, startTime, endTime, excludeId);
  },

  async findLargestAvailableRoom(date: string, startTime: string, endTime: string): Promise<Room | null> {
    if (!date || !startTime || !endTime) throw new Error('Datum eller tid saknas för rumsökning');
    const formattedStart = formatTimeForComparison(startTime);
    const formattedEnd = formatTimeForComparison(endTime);
    if (formattedStart >= formattedEnd) throw new Error('Starttid måste vara före sluttid');

    const [rooms, bookings] = await Promise.all([
      apiFetch<Room[]>('/api/rooms'),
      apiFetch<Booking[]>(`/api/bookings?date=${date}`),
    ]);

    const available = rooms.filter(room => {
      const roomBookings = bookings.filter(b => b.room_id === room.id);
      return !roomBookings.some(b => {
        const bStart = formatTimeForComparison(b.start_time);
        const bEnd = formatTimeForComparison(b.end_time);
        return formattedStart < bEnd && formattedEnd > bStart;
      });
    });

    if (available.length === 0) {
      throw new OverlapError(`Alla rum är upptagna för tiden ${startTime}-${endTime}`);
    }

    return [...available].sort((a, b) => b.capacity - a.capacity)[0];
  },
};

export const checkOverlap = async (
  roomId: number, date: string, startTime: string, endTime: string, excludeBookingId?: number
): Promise<boolean> => {
  try {
    const result = await apiFetch<{ overlaps: boolean }>('/api/bookings/check-overlap', {
      method: 'POST',
      body: JSON.stringify({ room_id: roomId, date, start_time: startTime, end_time: endTime, exclude_id: excludeBookingId }),
    });
    return result.overlaps;
  } catch (error) {
    logError('Fel vid kontroll av överlappningar:', error);
    throw error;
  }
};
```

**Step 2: Verify TypeScript compiles**

```bash
npm run build
```
Expected: build succeeds (exit 0). `supabase` import in RoomDisplay.tsx will still compile since `supabase.ts` still exists — it will be removed in Task 7.

**Step 3: Commit**

```bash
git add src/lib/api.ts
git commit -m "feat: replace supabase-js with fetch() in api.ts"
```

---

## Task 6: Frontend — replace Supabase Realtime with WebSocket in RoomDisplay.tsx

**Files:**
- Modify: `src/components/RoomDisplay.tsx` (lines 1-4 and 199-242)

There are two changes:
1. Remove the `supabase` import from line 3
2. Replace the Supabase Realtime `useEffect` (lines 205-242) with a native WebSocket effect

**Step 1: Remove supabase import and replace Realtime block**

Remove line 3:
```typescript
import { supabase } from '../lib/supabase';
```

Replace the entire Supabase Realtime `useEffect` block (lines 205–242):

```typescript
  // Supabase Realtime subscription för realtidsuppdateringar
  useEffect(() => {
    if (!room) return;

    // Initial fetch
    fetchBookingsRef.current();

    const channel = supabase
      .channel(`room-display-${room.id}`)
      // ... (everything to the closing brace)
  }, [room]); // Bara room som dependency – fetchBookings via ref
```

Replace it with this WebSocket block:

```typescript
  // WebSocket-anslutning för realtidsuppdateringar via Cloudflare Durable Object
  useEffect(() => {
    if (!room) return;

    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let isMounted = true;

    function connect() {
      if (!isMounted) return;
      const apiUrl = import.meta.env.VITE_API_URL as string;
      const wsProto = apiUrl.startsWith('https') ? 'wss' : 'ws';
      const host = apiUrl.replace(/^https?:\/\//, '');
      ws = new WebSocket(`${wsProto}://${host}/api/ws/${room!.id}`);

      ws.onopen = () => {
        fetchBookingsRef.current();
      };

      ws.onmessage = () => {
        // Rensa cache och hämta om vid varje bokning-ändring
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        bookingsCache.delete(`${room!.id}-${today}-${tomorrow}`);
        fetchBookingsRef.current();
      };

      ws.onclose = () => {
        if (isMounted) {
          reconnectTimeout = setTimeout(connect, 5000);
        }
      };
    }

    fetchBookingsRef.current();
    connect();

    // 60s fallback-polling som säkerhetsnät om WebSocket missar något
    const fallbackTimer = setInterval(() => {
      fetchBookingsRef.current();
    }, 60000);

    return () => {
      isMounted = false;
      if (reconnectTimeout !== null) clearTimeout(reconnectTimeout);
      ws?.close();
      clearInterval(fallbackTimer);
    };
  }, [room]); // Bara room som dependency
```

**Step 2: Verify TypeScript compiles**

```bash
npm run build
```
Expected: exit 0. (`supabase` may still appear in other files — that's fine until Task 7.)

**Step 3: Quick smoke test with local Worker**

Make sure both are running:
- Terminal 1: `cd worker && npx wrangler dev --local` (http://localhost:8787)
- Terminal 2: `npm run dev` (http://localhost:5173)

Ensure `.env.local` has `VITE_API_URL=http://localhost:8787`

Open browser → http://localhost:5173 → enter PIN → app should load rooms.
Open http://localhost:5173/display/Stora%20salen → should show room display.

**Step 4: Commit**

```bash
git add src/components/RoomDisplay.tsx
git commit -m "feat: replace Supabase Realtime with native WebSocket in RoomDisplay"
```

---

## Task 7: Frontend cleanup — remove Supabase entirely

**Files:**
- Delete: `src/lib/supabase.ts`
- Modify: `vite.config.ts`
- Modify: `.env.local`
- Modify: `package.json`

**Step 1: Delete `src/lib/supabase.ts`**

```bash
rm src/lib/supabase.ts
```

**Step 2: Update `.env.local`**

Replace the entire file contents with:
```
VITE_API_URL=http://localhost:8787
VITE_ACCESS_PIN=1234
```

Remove the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` lines — they're no longer used.

**Step 3: Update `vite.config.ts` — remove Supabase env var references**

In `vite.config.ts`, find the `define` block:
```typescript
define: {
  'process.env': {
    GOOGLE_SDK_NODE_LOGGING: 'false',
    NODE_ENV: mode,
    VITE_SUPABASE_URL: env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY
  },
```

Replace with:
```typescript
define: {
  'process.env': {
    GOOGLE_SDK_NODE_LOGGING: 'false',
    NODE_ENV: mode,
    VITE_API_URL: env.VITE_API_URL,
  },
```

**Step 4: Remove @supabase/supabase-js from package.json**

Remove from `dependencies`:
```
"@supabase/supabase-js": "^2.49.1",
```

Then run:
```bash
npm install
```
Expected: package-lock.json updated, `@supabase/supabase-js` removed from node_modules.

**Step 5: Verify build passes without supabase**

```bash
npm run build
```
Expected: exit 0, no references to supabase in output.

If any file still imports from `../lib/supabase` or `@supabase/supabase-js`, the build will fail with a clear import error. Fix those imports before proceeding.

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove Supabase dependency, clean up env vars"
```

---

## Task 8: Deploy to Cloudflare

**Files:**
- Modify: `worker/wrangler.toml` (update database_id)
- Create: `.env.production.local` (not committed)

### Part A: Deploy the Worker

**Step 1: Log in to Cloudflare (if not already)**
```bash
cd worker && npx wrangler login
```
Browser opens → authorize. Expected: "Successfully logged in."

**Step 2: Create the D1 database in production**
```bash
npx wrangler d1 create sjobergska-db
```
Expected output includes:
```
✅ Successfully created DB 'sjobergska-db'
...
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**Step 3: Update `worker/wrangler.toml` with the real database_id**

Replace `database_id = "PLACEHOLDER"` with the ID from Step 2.

**Step 4: Apply schema to production D1**
```bash
npx wrangler d1 execute sjobergska-db --file=./schema.sql
```
Expected: 4 rooms seeded, no errors.

**Verify:**
```bash
npx wrangler d1 execute sjobergska-db --command="SELECT name, capacity FROM rooms"
```
Expected: all 4 rooms returned.

**Step 5: Deploy the Worker**
```bash
npx wrangler deploy
```
Expected output:
```
✅ Deployed sjobergska-api (https://sjobergska-api.USERNAME.workers.dev)
```

**Step 6: Verify deployed API works**
```bash
curl https://sjobergska-api.USERNAME.workers.dev/api/rooms
```
Expected: JSON array with 4 rooms.

### Part B: Deploy the Frontend

**Step 7: Update `.env.local` with production Worker URL**

Create `.env.production.local` (never commit this file):
```
VITE_API_URL=https://sjobergska-api.USERNAME.workers.dev
VITE_ACCESS_PIN=1234
```

Note: `.env.local` keeps `http://localhost:8787` for local dev. Vite uses `.env.production.local` for `npm run build`.

**Step 8: Build with production env**
```bash
npm run build
```
Expected: `dist/` built using the production Worker URL.

**Step 9: Deploy to Cloudflare Pages**

Option A — via Wrangler (from repo root):
```bash
npx wrangler pages deploy dist --project-name=sjobergska-rod
```

Option B — Connect GitHub repo in Cloudflare Pages dashboard:
1. https://dash.cloudflare.com → Pages → Create project
2. Connect GitHub → select `Sjobergska_RoD` repo
3. Build command: `npm run build`
4. Build output: `dist`
5. Add environment variable: `VITE_API_URL=https://sjobergska-api.USERNAME.workers.dev`
6. Add environment variable: `VITE_ACCESS_PIN=1234`

**Step 10: Test full stack**

- Open `https://sjobergska-rod.pages.dev` → enter PIN → rooms load ✓
- Open `https://sjobergska-rod.pages.dev/display/Stora%20salen` → room display ✓
- Create a booking from the booking interface
- Watch the room display update automatically (WebSocket broadcast) ✓

**Step 11: Final commit**

```bash
git add worker/wrangler.toml
git commit -m "chore: add production D1 database_id to wrangler.toml"
git push
```

---

## Summary of all changed files

| File | Action | Why |
|------|--------|-----|
| `worker/` (entire dir) | Create | New Cloudflare Worker project |
| `worker/schema.sql` | Create | D1 database schema + seed data |
| `worker/src/index.ts` | Create | REST API (rooms + bookings) |
| `worker/src/durable-object.ts` | Create | WebSocket hub per room |
| `worker/wrangler.toml` | Create | Cloudflare config |
| `src/lib/api.ts` | Rewrite | fetch() instead of supabase-js |
| `src/components/RoomDisplay.tsx` | Modify | Native WebSocket instead of Realtime |
| `src/lib/supabase.ts` | Delete | No longer needed |
| `vite.config.ts` | Modify | Remove Supabase env refs |
| `.env.local` | Modify | Use VITE_API_URL |
| `package.json` | Modify | Remove @supabase/supabase-js |

## What does NOT change

- `src/types/database.types.ts` — Room and Booking interfaces are unchanged
- All React components except `RoomDisplay.tsx` — they call `roomsApi`/`bookingsApi` which still have the same signatures
- `src/components/PinGate.tsx`, `ErrorBoundary.tsx`, `RoomManagement.tsx` — untouched
- `src/App.tsx` — untouched
