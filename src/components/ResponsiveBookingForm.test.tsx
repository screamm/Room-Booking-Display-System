import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ResponsiveBookingForm from './ResponsiveBookingForm';
import { UserPreferencesProvider } from '../contexts/UserPreferencesContext';
import { bookingsApi } from '../lib/api';

// Mocka API-anrop
jest.mock('../lib/api', () => ({
  bookingsApi: {
    checkConflictsInRealtime: jest.fn().mockResolvedValue({ hasConflict: false })
  }
}));

// Mocka useUserPreferences
jest.mock('../contexts/UserPreferencesContext', () => ({
  useUserPreferences: jest.fn(() => ({
    preferences: {
      bookerName: 'Test User',
      defaultBookingType: 'meeting',
      defaultBookingDuration: 60,
      defaultRoomId: 1
    },
    updatePreferences: jest.fn()
  })),
  UserPreferencesProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

const mockRooms = [
  { id: 1, name: 'Rum 1', capacity: 10, features: ['Whiteboard'] },
  { id: 2, name: 'Rum 2', capacity: 20, features: ['Videokonferens'] }
];

const mockOnSubmit = jest.fn();
const mockOnCancel = jest.fn();
const mockOnDelete = jest.fn();
const mockOnRecurring = jest.fn();

describe('ResponsiveBookingForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mocka dagens datum för att göra testet deterministiskt
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-03-25'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('bör rendera formuläret korrekt i nytt bokningsläge', () => {
    render(
      <ResponsiveBookingForm
        rooms={mockRooms}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        onRecurring={mockOnRecurring}
      />
    );

    // Kontrollera att formuläret har rätt rubriker
    expect(screen.getByText('Ny bokning')).toBeInTheDocument();
    expect(screen.getByLabelText(/Rum/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Datum/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ditt namn/i)).toBeInTheDocument();

    // Kontrollera att formuläret har rätt knappar
    expect(screen.getByRole('button', { name: /Boka rum/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Avbryt/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Återkommande/i })).toBeInTheDocument();
  });

  it('bör rendera formuläret korrekt i redigeringsläge', () => {
    render(
      <ResponsiveBookingForm
        rooms={mockRooms}
        initialData={{ 
          id: 1, 
          roomId: 1, 
          date: '2023-06-10', 
          startTime: '09:00', 
          endTime: '10:00',
          booker: 'Test Person',
          purpose: 'Projektmöte'
        }}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        onDelete={mockOnDelete}
        isEditing={true}
      />
    );

    // Kontrollera att formuläret har rätt rubriker för redigeringsläge
    expect(screen.getByText('Redigera bokning')).toBeInTheDocument();
    
    // Kontrollera att radera-knappen finns
    expect(screen.getByRole('button', { name: /Radera bokning/i })).toBeInTheDocument();
    
    // Kontrollera att uppdatera-knappen finns
    expect(screen.getByRole('button', { name: /Uppdatera/i })).toBeInTheDocument();
  });

  it('bör fylla i formuläret med korrekta initialdata', () => {
    render(
      <ResponsiveBookingForm
        rooms={mockRooms}
        initialData={{ 
          id: 1, 
          roomId: 1, 
          date: '2023-06-10', 
          startTime: '09:00', 
          endTime: '10:00',
          booker: 'Test Person',
          purpose: 'Projektmöte',
          bookingType: 'meeting'
        }}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isEditing={true}
      />
    );

    // Kontrollera att form-elementen har korrekt initialdata
    expect(screen.getByLabelText(/Rum/i)).toHaveValue('1');
    expect(screen.getByLabelText(/Ditt namn/i)).toHaveValue('Test Person');
    expect(screen.getByLabelText(/Syfte/i)).toHaveValue('Projektmöte');
  });

  it('bör validera obligatoriska fält vid formulärsubmit', async () => {
    render(
      <ResponsiveBookingForm
        rooms={mockRooms}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Rensa namn-fältet
    fireEvent.change(screen.getByLabelText(/Ditt namn/i), { target: { value: '' } });

    // Försök skicka formuläret
    fireEvent.click(screen.getByRole('button', { name: /Boka rum/i }));

    // Kontrollera att valideringsmeddelanden visas
    await waitFor(() => {
      expect(screen.getByText(/Vänligen ange ditt namn/i)).toBeInTheDocument();
    });

    // Kontrollera att onSubmit inte anropas
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('bör anropa onSubmit med korrekt data när formuläret skickas', async () => {
    render(
      <UserPreferencesProvider>
        <ResponsiveBookingForm
          rooms={mockRooms}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          initialValues={{
            roomId: '',
            date: '2025-03-25',
            startTime: '08:00',
            endTime: '09:00',
            booker: '',
            purpose: '',
            attendees: 1,
          }}
        />
      </UserPreferencesProvider>
    );

    // Välj rum
    const roomSelect = screen.getByLabelText(/rum/i);
    fireEvent.change(roomSelect, { target: { value: '1' } });

    // Fyll i namn
    const nameInput = screen.getByLabelText(/ditt namn/i);
    fireEvent.change(nameInput, { target: { value: 'Test Person' } });

    // Fyll i syfte
    const purposeInput = screen.getByLabelText(/syfte/i);
    fireEvent.change(purposeInput, { target: { value: 'Projektmöte' } });

    // Klicka på skicka-knappen
    const submitButton = screen.getByRole('button', { name: /boka rum/i });
    fireEvent.click(submitButton);

    // Vänta på att formuläret ska skickas och kontrollera resultatet
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
        roomId: 1,
        date: '2025-03-25',
        startTime: '08:00',
        endTime: '09:00',
        booker: 'Test Person',
        purpose: 'Projektmöte',
        attendees: 1,
        bookingType: 'meeting',
      }));
    }, { timeout: 3000 });
  });

  it('bör visa konfliktvarning när det finns överlappande bokningar', async () => {
    // Mocka API för att returnera en konflikt
    (bookingsApi.checkConflictsInRealtime as jest.Mock).mockResolvedValue({
      hasConflict: true,
      conflictingBookings: [
        { id: 2, start_time: '09:30', end_time: '10:30', booker: 'Annan person', purpose: 'Annat möte' }
      ]
    });

    render(
      <ResponsiveBookingForm
        rooms={mockRooms}
        initialData={{ 
          roomId: 1, 
          date: '2023-06-10', 
          startTime: '09:00', 
          endTime: '10:00',
          booker: 'Test Person'
        }}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Vänta på att konfliktvarningen visas
    await waitFor(() => {
      expect(screen.getByText('Det finns redan en bokning för denna tid')).toBeInTheDocument();
      expect(screen.getByText('Krockar med följande bokningar:')).toBeInTheDocument();
      expect(screen.getByText('09:30 - 10:30')).toBeInTheDocument();
      expect(screen.getByText('Bokad av: Annan person')).toBeInTheDocument();
    });

    // Kontrollera att Boka rum-knappen är inaktiverad
    expect(screen.getByRole('button', { name: /Boka rum/i })).toBeDisabled();
  });

  it('bör anropa onCancel när Avbryt-knappen klickas', () => {
    render(
      <ResponsiveBookingForm
        rooms={mockRooms}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Avbryt/i }));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('bör anropa onDelete när Radera bokning-knappen klickas i redigeringsläge', () => {
    render(
      <ResponsiveBookingForm
        rooms={mockRooms}
        initialData={{ id: 1 }}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        onDelete={mockOnDelete}
        isEditing={true}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Radera bokning/i }));
    expect(mockOnDelete).toHaveBeenCalled();
  });
}); 