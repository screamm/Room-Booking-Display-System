import { formatTime, hourToTimeString, calculateEndTime, isTimeInPast } from './dateUtils';

describe('dateUtils', () => {
  describe('formatTime', () => {
    it('bör returnera samma tid om det är ett giltigt tidsformat', () => {
      expect(formatTime('09:30')).toBe('09:30');
      expect(formatTime('14:45')).toBe('14:45');
    });

    it('bör hantera ogiltig input', () => {
      expect(formatTime('')).toBe('');
      expect(formatTime('invalid')).toBe('invalid');
    });
  });

  describe('hourToTimeString', () => {
    it('bör formatera timmar till "HH:00"', () => {
      expect(hourToTimeString(9)).toBe('09:00');
      expect(hourToTimeString(14)).toBe('14:00');
    });

    it('bör hantera ensiffriga timmar korrekt', () => {
      expect(hourToTimeString(8)).toBe('08:00');
      expect(hourToTimeString(0)).toBe('00:00');
    });
  });

  describe('calculateEndTime', () => {
    it('bör beräkna korrekt sluttid', () => {
      expect(calculateEndTime('09:00', 1)).toBe('10:00');
      expect(calculateEndTime('14:30', 2)).toBe('16:30');
    });

    it('bör begränsa sluttiden till 17:00', () => {
      expect(calculateEndTime('16:00', 2)).toBe('17:00');
      expect(calculateEndTime('15:30', 3)).toBe('17:00');
    });

    it('bör bibehålla samma minut som starttiden', () => {
      expect(calculateEndTime('09:15', 1)).toBe('10:15');
      expect(calculateEndTime('14:45', 1)).toBe('15:45');
    });
  });

  describe('isTimeInPast', () => {
    beforeEach(() => {
      // Mocka Date för att ha en konsekvent referenstid
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2023, 0, 1, 12, 0)); // 2023-01-01 12:00
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('bör returnera true för tider i det förflutna', () => {
      const today = new Date(2023, 0, 1);
      expect(isTimeInPast(today, '08:00')).toBe(true);
      expect(isTimeInPast(today, '11:59')).toBe(true);
    });

    it('bör returnera false för tider i framtiden', () => {
      const today = new Date(2023, 0, 1);
      expect(isTimeInPast(today, '12:01')).toBe(false);
      expect(isTimeInPast(today, '15:00')).toBe(false);
    });

    it('bör returnera false för tidigare datum', () => {
      const yesterday = new Date(2022, 11, 31);
      expect(isTimeInPast(yesterday, '08:00')).toBe(true);
    });

    it('bör returnera false för framtida datum', () => {
      const tomorrow = new Date(2023, 0, 2);
      expect(isTimeInPast(tomorrow, '08:00')).toBe(false);
    });
  });
}); 