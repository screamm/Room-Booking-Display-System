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

      if (method === 'GET') {
        const room = await env.DB.prepare('SELECT * FROM rooms WHERE id=?').bind(id).first();
        if (!room) return err(`Inget rum hittades med ID ${id}`, 404);
        return json(parseRoom(room as Record<string, unknown>));
      }

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
        // Overlap check for the updated booking
        const checkRoomId = body.room_id ?? (current.room_id as number);
        const checkDate = body.date ?? (current.date as string);
        const checkStart = body.start_time ?? (current.start_time as string);
        const checkEnd = body.end_time ?? (current.end_time as string);
        if (checkStart && checkEnd && checkStart >= checkEnd) {
          return err('Sluttiden måste vara efter starttiden');
        }
        const overlapCheck = await env.DB.prepare(
          'SELECT id FROM bookings WHERE room_id=? AND date=? AND start_time<? AND end_time>? AND id!=?'
        ).bind(checkRoomId, checkDate, checkEnd, checkStart, id).first();
        if (overlapCheck) {
          return json({ error: 'OVERLAP', message: 'Bokningen överlappar med en befintlig bokning' }, 409);
        }
        vals.push(id);
        await env.DB.prepare(`UPDATE bookings SET ${sets.join(',')} WHERE id=?`).bind(...vals).run();
        const booking = await env.DB.prepare('SELECT * FROM bookings WHERE id=?').bind(id).first();
        await broadcastRoomUpdate(env, current.room_id as number);
        if (body.room_id && body.room_id !== current.room_id) {
          await broadcastRoomUpdate(env, body.room_id);
        }
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
