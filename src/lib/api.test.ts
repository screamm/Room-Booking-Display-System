import { roomsApi, bookingsApi } from './api';
import { supabase } from './supabase';

// Mocka Supabase-klienten
jest.mock('./supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
  }
}));

describe('API funktioner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('roomsApi', () => {
    const mockRooms = [
      { id: 1, name: 'Rum 1', capacity: 10, features: ['Whiteboard'] },
      { id: 2, name: 'Rum 2', capacity: 20, features: ['Videokonferens'] }
    ];

    describe('getAll', () => {
      it('bör hämta alla rum', async () => {
        (supabase.from as jest.Mock).mockReturnThis();
        (supabase.select as jest.Mock).mockReturnThis();
        (supabase.order as jest.Mock).mockResolvedValue({
          data: mockRooms,
          error: null
        });

        const result = await roomsApi.getAll();

        expect(supabase.from).toHaveBeenCalledWith('rooms');
        expect(supabase.select).toHaveBeenCalledWith('*');
        expect(supabase.order).toHaveBeenCalledWith('name');
        expect(result).toEqual(mockRooms);
      });

      it('bör kasta fel om hämtningen misslyckas', async () => {
        const mockError = new Error('Databasfel');
        (supabase.from as jest.Mock).mockReturnThis();
        (supabase.select as jest.Mock).mockReturnThis();
        (supabase.order as jest.Mock).mockResolvedValue({
          data: null,
          error: mockError
        });

        await expect(roomsApi.getAll()).rejects.toThrow('Databasfel');
        expect(supabase.from).toHaveBeenCalledWith('rooms');
      });
    });

    describe('getById', () => {
      it('bör hämta ett rum med specifikt ID', async () => {
        const mockRoom = mockRooms[0];
        (supabase.from as jest.Mock).mockReturnThis();
        (supabase.select as jest.Mock).mockReturnThis();
        (supabase.eq as jest.Mock).mockReturnThis();
        (supabase.single as jest.Mock).mockResolvedValue({
          data: mockRoom,
          error: null
        });

        const result = await roomsApi.getById(1);

        expect(supabase.from).toHaveBeenCalledWith('rooms');
        expect(supabase.select).toHaveBeenCalledWith('*');
        expect(supabase.eq).toHaveBeenCalledWith('id', 1);
        expect(result).toEqual(mockRoom);
      });
    });
  });

  describe('bookingsApi', () => {
    const mockBookings = [
      { id: 1, room_id: 1, date: '2023-06-01', start_time: '09:00', end_time: '10:00', booker: 'Anna' },
      { id: 2, room_id: 2, date: '2023-06-01', start_time: '14:00', end_time: '15:00', booker: 'Erik' }
    ];

    describe('getByDateRange', () => {
      it('bör hämta bokningar inom ett datumintervall', async () => {
        (supabase.from as jest.Mock).mockReturnThis();
        (supabase.select as jest.Mock).mockReturnThis();
        (supabase.gte as jest.Mock).mockReturnThis();
        (supabase.lte as jest.Mock).mockReturnThis();
        (supabase.order as jest.Mock).mockResolvedValue({
          data: mockBookings,
          error: null
        });

        const result = await bookingsApi.getByDateRange('2023-06-01', '2023-06-07');

        expect(supabase.from).toHaveBeenCalledWith('bookings');
        expect(supabase.select).toHaveBeenCalledWith('*');
        expect(supabase.gte).toHaveBeenCalledWith('date', '2023-06-01');
        expect(supabase.lte).toHaveBeenCalledWith('date', '2023-06-07');
        expect(result).toEqual(mockBookings);
      });
    });

    describe('create', () => {
      it('bör skapa en ny bokning', async () => {
        const newBooking = {
          room_id: 1,
          date: '2023-06-10',
          start_time: '13:00',
          end_time: '14:00',
          booker: 'Maria',
          purpose: 'Möte'
        };
        
        (supabase.from as jest.Mock).mockReturnThis();
        (supabase.insert as jest.Mock).mockReturnThis();
        (supabase.select as jest.Mock).mockReturnThis();
        (supabase.single as jest.Mock).mockResolvedValue({
          data: { id: 3, ...newBooking },
          error: null
        });

        const result = await bookingsApi.create(newBooking);

        expect(supabase.from).toHaveBeenCalledWith('bookings');
        expect(supabase.insert).toHaveBeenCalledWith([newBooking]);
        expect(result).toEqual({ id: 3, ...newBooking });
      });
    });
  });

  describe('checkOverlap', () => {
    it('bör returnera true om det finns överlappande bokningar', async () => {
      (supabase.from as jest.Mock).mockReturnThis();
      (supabase.select as jest.Mock).mockReturnThis();
      (supabase.eq as jest.Mock).mockReturnThis();
      (supabase.or as jest.Mock).mockResolvedValue({
        data: [{ id: 1 }], // Simulera att det finns en överlappande bokning
        error: null
      });

      const result = await bookingsApi.checkOverlap(1, '2023-06-10', '10:00', '11:00');

      expect(supabase.from).toHaveBeenCalledWith('bookings');
      expect(supabase.eq).toHaveBeenCalledWith('room_id', 1);
      expect(supabase.eq).toHaveBeenCalledWith('date', '2023-06-10');
      expect(result).toBe(true);
    });

    it('bör returnera false om det inte finns överlappande bokningar', async () => {
      (supabase.from as jest.Mock).mockReturnThis();
      (supabase.select as jest.Mock).mockReturnThis();
      (supabase.eq as jest.Mock).mockReturnThis();
      (supabase.or as jest.Mock).mockResolvedValue({
        data: [], // Inga överlappande bokningar
        error: null
      });

      const result = await bookingsApi.checkOverlap(1, '2023-06-10', '10:00', '11:00');

      expect(result).toBe(false);
    });
  });

  describe('checkConflictsInRealtime', () => {
    it('bör returnera konfliktinformation om det finns överlappande bokningar', async () => {
      const conflictingBookings = [
        { id: 1, room_id: 1, date: '2023-06-10', start_time: '09:30', end_time: '10:30', booker: 'Peter' }
      ];
      
      (supabase.from as jest.Mock).mockReturnThis();
      (supabase.select as jest.Mock).mockReturnThis();
      (supabase.eq as jest.Mock).mockReturnThis();
      (supabase.or as jest.Mock).mockResolvedValue({
        data: conflictingBookings,
        error: null
      });

      const result = await bookingsApi.checkConflictsInRealtime(1, '2023-06-10', '10:00', '11:00');

      expect(result.hasConflict).toBe(true);
      expect(result.conflictingBookings).toEqual(conflictingBookings);
    });

    it('bör exkludera bokning med angivet ID', async () => {
      (supabase.from as jest.Mock).mockReturnThis();
      (supabase.select as jest.Mock).mockReturnThis();
      (supabase.eq as jest.Mock).mockReturnThis();
      (supabase.or as jest.Mock).mockReturnThis();
      (supabase.neq as jest.Mock).mockResolvedValue({
        data: [],
        error: null
      });

      await bookingsApi.checkConflictsInRealtime(1, '2023-06-10', '10:00', '11:00', 5);

      expect(supabase.neq).toHaveBeenCalledWith('id', 5);
    });
  });
}); 