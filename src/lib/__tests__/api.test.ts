import { roomsApi, bookingsApi } from '../api';
import { supabase } from '../supabase';

// Mock Supabase-klienten
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('roomsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('skulle hämta alla rum', async () => {
      const mockRooms = [
        { id: 1, name: 'Rum 1', capacity: 10 },
        { id: 2, name: 'Rum 2', capacity: 20 },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockRooms, error: null }),
      });

      const result = await roomsApi.getAll();
      expect(result).toEqual(mockRooms);
    });

    it('skulle hantera fel vid hämtning av rum', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: new Error('Databasfel') }),
      });

      await expect(roomsApi.getAll()).rejects.toThrow('Kunde inte hämta rum');
    });
  });

  describe('getById', () => {
    it('skulle hämta ett specifikt rum', async () => {
      const mockRoom = { id: 1, name: 'Rum 1', capacity: 10 };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockRoom, error: null }),
      });

      const result = await roomsApi.getById(1);
      expect(result).toEqual(mockRoom);
    });

    it('skulle returnera null för icke-existerande rum', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      const result = await roomsApi.getById(999);
      expect(result).toBeNull();
    });

    it('skulle validera rum-ID', async () => {
      await expect(roomsApi.getById(0)).rejects.toThrow('Ogiltigt rum-ID');
      await expect(roomsApi.getById(-1)).rejects.toThrow('Ogiltigt rum-ID');
    });
  });
});

describe('bookingsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('skulle skapa en ny bokning', async () => {
      const mockBooking = {
        room_id: 1,
        date: '2024-03-25',
        start_time: '09:00',
        end_time: '10:00',
        booker: 'Test User',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 1, ...mockBooking }, error: null }),
      });

      const result = await bookingsApi.create(mockBooking);
      expect(result).toEqual({ id: 1, ...mockBooking });
    });

    it('skulle validera obligatoriska fält', async () => {
      const invalidBooking = {
        room_id: 1,
        date: '2024-03-25',
        // Saknar start_time, end_time och booker
      };

      await expect(bookingsApi.create(invalidBooking as any)).rejects.toThrow(
        'Alla obligatoriska fält måste fyllas i'
      );
    });

    it('skulle validera tider', async () => {
      const invalidBooking = {
        room_id: 1,
        date: '2024-03-25',
        start_time: '10:00',
        end_time: '09:00', // Sluttid före starttid
        booker: 'Test User',
      };

      await expect(bookingsApi.create(invalidBooking)).rejects.toThrow(
        'Sluttiden måste vara efter starttiden'
      );
    });
  });

  describe('checkOverlap', () => {
    it('skulle upptäcka överlappande bokningar', async () => {
      const mockOverlappingBookings = [
        {
          id: 1,
          room_id: 1,
          date: '2024-03-25',
          start_time: '09:00',
          end_time: '10:00',
        },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockResolvedValue({ data: mockOverlappingBookings, error: null }),
      });

      const result = await bookingsApi.checkOverlap(1, '2024-03-25', '09:30', '10:30');
      expect(result).toBe(true);
    });

    it('skulle validera input för överlappningskontroll', async () => {
      await expect(
        bookingsApi.checkOverlap(0, '2024-03-25', '09:00', '10:00')
      ).rejects.toThrow('Alla obligatoriska fält måste fyllas i för överlappningskontroll');

      await expect(
        bookingsApi.checkOverlap(1, '', '09:00', '10:00')
      ).rejects.toThrow('Alla obligatoriska fält måste fyllas i för överlappningskontroll');

      await expect(
        bookingsApi.checkOverlap(1, '2024-03-25', '10:00', '09:00')
      ).rejects.toThrow('Sluttiden måste vara efter starttiden');
    });
  });

  describe('findLargestAvailableRoom', () => {
    it('skulle hitta det största lediga rummet', async () => {
      const mockRooms = [
        { id: 1, name: 'Stort rum', capacity: 20 },
        { id: 2, name: 'Mellanstort rum', capacity: 10 },
        { id: 3, name: 'Litet rum', capacity: 5 },
      ];

      const mockBookings = [
        {
          id: 1,
          room_id: 1,
          date: '2024-03-25',
          start_time: '09:00',
          end_time: '10:00',
        },
      ];

      (supabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockRooms, error: null }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: mockBookings, error: null }),
        });

      const result = await bookingsApi.findLargestAvailableRoom(
        '2024-03-25',
        '10:00',
        '11:00'
      );

      expect(result).toEqual(mockRooms[1]); // Mellanstort rum eftersom stort rum är upptaget
    });

    it('skulle returnera null om inga lediga rum finns', async () => {
      const mockRooms = [
        { id: 1, name: 'Rum 1', capacity: 10 },
        { id: 2, name: 'Rum 2', capacity: 5 },
      ];

      const mockBookings = [
        {
          id: 1,
          room_id: 1,
          date: '2024-03-25',
          start_time: '09:00',
          end_time: '17:00',
        },
        {
          id: 2,
          room_id: 2,
          date: '2024-03-25',
          start_time: '09:00',
          end_time: '17:00',
        },
      ];

      (supabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockRooms, error: null }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: mockBookings, error: null }),
        });

      const result = await bookingsApi.findLargestAvailableRoom(
        '2024-03-25',
        '10:00',
        '11:00'
      );

      expect(result).toBeNull();
    });
  });
}); 