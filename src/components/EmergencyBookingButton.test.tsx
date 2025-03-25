import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EmergencyBookingButton from './EmergencyBookingButton';
import { bookingsApi } from '../lib/api';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useToast } from '../contexts/ToastContext';

// Mocka beroenden
jest.mock('../lib/api', () => ({
  bookingsApi: {
    findLargestAvailableRoom: jest.fn(),
    create: jest.fn()
  }
}));

jest.mock('../contexts/UserPreferencesContext', () => ({
  useUserPreferences: jest.fn()
}));

jest.mock('../contexts/ToastContext', () => ({
  useToast: jest.fn()
}));

describe('EmergencyBookingButton', () => {
  const mockShowToast = jest.fn();
  const mockRefreshBookings = jest.fn();
  
  beforeEach(() => {
    // Återställ mocks
    jest.clearAllMocks();
    
    // Konfigurera mocks
    (useToast as jest.Mock).mockReturnValue({
      showToast: mockShowToast
    });
    
    (useUserPreferences as jest.Mock).mockReturnValue({
      preferences: {
        bookerName: 'Testanvändare',
        defaultBookingDuration: 60
      }
    });
    
    // Standard-datum och tid
    const now = new Date();
    jest.useFakeTimers();
    jest.setSystemTime(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0)); // 10:00
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });

  it('ska rendera knappen korrekt', () => {
    render(<EmergencyBookingButton onBookingCreated={mockRefreshBookings} />);
    
    const button = screen.getByRole('button', { name: /akutbokning/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-red-500');
  });

  it('ska visa bekräftelsemodal när knappen klickas', () => {
    render(<EmergencyBookingButton onBookingCreated={mockRefreshBookings} />);
    
    fireEvent.click(screen.getByRole('button', { name: /akutbokning/i }));
    
    expect(screen.getByText('Bekräfta akutbokning')).toBeInTheDocument();
    expect(screen.getByText(/Vill du boka ett rum nu\?/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /boka nu/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /avbryt/i })).toBeInTheDocument();
  });

  it('ska stänga modalen när avbryt klickas', () => {
    render(<EmergencyBookingButton onBookingCreated={mockRefreshBookings} />);
    
    // Öppna modalen
    fireEvent.click(screen.getByRole('button', { name: /akutbokning/i }));
    
    // Klicka på avbryt
    fireEvent.click(screen.getByRole('button', { name: /avbryt/i }));
    
    // Kontrollera att modalen är stängd
    expect(screen.queryByText('Bekräfta akutbokning')).not.toBeInTheDocument();
  });

  it('ska försöka boka ett rum när bekräfta klickas och ett rum är tillgängligt', async () => {
    const mockRoom = { id: 1, name: 'Stora rummet', capacity: 20, features: ['Whiteboard'] };
    
    // Konfigurera mocks
    (bookingsApi.findLargestAvailableRoom as jest.Mock).mockResolvedValue(mockRoom);
    (bookingsApi.create as jest.Mock).mockResolvedValue({
      id: 100,
      room_id: 1,
      date: '2023-06-01',
      start_time: '10:00',
      end_time: '11:00',
      booker: 'Testanvändare'
    });
    
    render(<EmergencyBookingButton onBookingCreated={mockRefreshBookings} />);
    
    // Öppna modalen
    fireEvent.click(screen.getByRole('button', { name: /akutbokning/i }));
    
    // Klicka på bekräfta
    fireEvent.click(screen.getByRole('button', { name: /boka nu/i }));
    
    // Vänta på att bokningen skapas
    await waitFor(() => {
      expect(bookingsApi.findLargestAvailableRoom).toHaveBeenCalled();
      expect(bookingsApi.create).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Akutbokning skapad'),
        })
      );
      expect(mockRefreshBookings).toHaveBeenCalled();
    });
  });

  it('ska visa ett felmeddelande när inget rum är tillgängligt', async () => {
    // Konfigurera mocks: inget rum tillgängligt
    (bookingsApi.findLargestAvailableRoom as jest.Mock).mockResolvedValue(null);
    
    render(<EmergencyBookingButton onBookingCreated={mockRefreshBookings} />);
    
    // Öppna modalen
    fireEvent.click(screen.getByRole('button', { name: /akutbokning/i }));
    
    // Klicka på bekräfta
    fireEvent.click(screen.getByRole('button', { name: /boka nu/i }));
    
    // Vänta på att felmeddelandet visas
    await waitFor(() => {
      expect(bookingsApi.findLargestAvailableRoom).toHaveBeenCalled();
      expect(bookingsApi.create).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Fel'),
          status: 'error'
        })
      );
    });
  });

  it('ska hantera fel under API-anropet', async () => {
    // Konfigurera mocks: kasta fel
    (bookingsApi.findLargestAvailableRoom as jest.Mock).mockRejectedValue(new Error('API-fel'));
    
    render(<EmergencyBookingButton onBookingCreated={mockRefreshBookings} />);
    
    // Öppna modalen
    fireEvent.click(screen.getByRole('button', { name: /akutbokning/i }));
    
    // Klicka på bekräfta
    fireEvent.click(screen.getByRole('button', { name: /boka nu/i }));
    
    // Vänta på att felmeddelandet visas
    await waitFor(() => {
      expect(bookingsApi.findLargestAvailableRoom).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Fel'),
          status: 'error'
        })
      );
    });
  });
}); 