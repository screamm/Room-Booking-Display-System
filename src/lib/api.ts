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
