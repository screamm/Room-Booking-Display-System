import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import ConferenceRoomBooking from './ConferenceRoomBooking';
import { ToastProvider } from '../contexts/ToastContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { UserPreferencesProvider } from '../contexts/UserPreferencesContext';
import { roomsApi, bookingsApi } from '../lib/api';

// Mocka API-anrop
jest.mock('../lib/api', () => ({
  roomsApi: {
    getAll: jest.fn(),
  },
  bookingsApi: {
    getByDateRange: jest.fn(),
    getByDate: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    checkOverlap: jest.fn(),
  },
}));

describe('ConferenceRoomBooking', () => {
  const mockRooms = [
    { id: 1, name: 'Rum 1', capacity: 10 },
    { id: 2, name: 'Rum 2', capacity: 20 },
  ];

  const mockBookings = [];

  const renderComponent = () => {
    return render(
      <DndProvider backend={HTML5Backend}>
        <ThemeProvider>
          <ToastProvider>
            <UserPreferencesProvider>
              <ConferenceRoomBooking />
            </UserPreferencesProvider>
          </ToastProvider>
        </ThemeProvider>
      </DndProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Sätt upp mock-implementationer
    (roomsApi.getAll as jest.Mock).mockResolvedValue(mockRooms);
    (bookingsApi.getByDateRange as jest.Mock).mockResolvedValue(mockBookings);
    (bookingsApi.getByDate as jest.Mock).mockResolvedValue(mockBookings);
  });

  it('bör visa laddningsindikator medan data hämtas', () => {
    renderComponent();
    expect(screen.getByText(/laddar/i)).toBeInTheDocument();
  });

  it('bör visa rumlista när data har laddats', async () => {
    renderComponent();
    
    // Vänta på att API-anropet slutförs
    await waitFor(() => {
      expect(roomsApi.getAll).toHaveBeenCalled();
    });

    // Vänta på att laddningsindikatorn försvinner
    await waitFor(() => {
      expect(screen.queryByText(/laddar/i)).not.toBeInTheDocument();
    });

    // Kontrollera att rummen visas
    const roomElements = screen.getAllByText(/rum \d/i);
    expect(roomElements).toHaveLength(2);
    expect(roomElements[0]).toHaveTextContent('Rum 1');
    expect(roomElements[1]).toHaveTextContent('Rum 2');
  });

  it('bör visa felmeddelande när datahämtning misslyckas', async () => {
    // Simulera ett fel vid hämtning av rum
    (roomsApi.getAll as jest.Mock).mockRejectedValueOnce(new Error('API error'));
    
    renderComponent();
    
    // Vänta på att API-anropet slutförs
    await waitFor(() => {
      expect(roomsApi.getAll).toHaveBeenCalled();
    });

    // Kontrollera att felmeddelandet visas
    const errorElement = screen.getAllByText(/ett fel uppstod/i)[0];
    expect(errorElement).toBeInTheDocument();
  });

  it('bör öppna bokningsformulär när en ledig cell klickas', async () => {
    renderComponent();
    
    // Vänta på att API-anropet slutförs
    await waitFor(() => {
      expect(roomsApi.getAll).toHaveBeenCalled();
    });

    // Vänta på att laddningsindikatorn försvinner
    await waitFor(() => {
      expect(screen.queryByText(/laddar/i)).not.toBeInTheDocument();
    });

    // Hitta och klicka på en ledig cell
    const cells = screen.getAllByTestId('booking-cell');
    fireEvent.click(cells[0]);

    // Kontrollera att bokningsformuläret visas
    expect(screen.getByText(/ny bokning/i)).toBeInTheDocument();
  });

  it('bör visa bekräftelsedialog när en bokning tas bort', async () => {
    // Lägg till en mock-bokning
    const mockBookingWithDelete = [{
      id: 1,
      roomId: 1,
      date: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '10:00',
      booker: 'Test Person',
      purpose: 'Test Meeting'
    }];
    
    (bookingsApi.getByDateRange as jest.Mock).mockResolvedValue(mockBookingWithDelete);
    (bookingsApi.getByDate as jest.Mock).mockResolvedValue(mockBookingWithDelete);
    
    renderComponent();
    
    // Vänta på att API-anropet slutförs
    await waitFor(() => {
      expect(roomsApi.getAll).toHaveBeenCalled();
    });

    // Vänta på att laddningsindikatorn försvinner
    await waitFor(() => {
      expect(screen.queryByText(/laddar/i)).not.toBeInTheDocument();
    });

    // Hitta och klicka på ta bort-knappen
    const deleteButton = screen.getByTestId('delete-booking-button');
    fireEvent.click(deleteButton);

    // Kontrollera att bekräftelsedialogen visas
    expect(screen.getByText(/vill du verkligen ta bort/i)).toBeInTheDocument();
  });
}); 