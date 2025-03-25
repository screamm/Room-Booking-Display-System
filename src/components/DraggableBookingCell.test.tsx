import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import DraggableBookingCell from './DraggableBookingCell';

// Wrapper för att tillhandahålla DndProvider
const DndWrapper = ({ children }: { children: React.ReactNode }) => (
  <DndProvider backend={HTML5Backend}>
    {children}
  </DndProvider>
);

describe('DraggableBookingCell', () => {
  const mockOnCellClick = jest.fn();
  const mockOnEditBooking = jest.fn();
  const mockOnDeleteBooking = jest.fn();
  const mockOnDragEnd = jest.fn();
  const mockFormatTime = jest.fn((time) => time);
  const currentDate = new Date();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('bör rendera en ledig cell korrekt', () => {
    render(
      <DndWrapper>
        <DraggableBookingCell
          roomId={1}
          day={currentDate}
          hour={9}
          isPastHour={false}
          isBooked={false}
          bookingInfo={null}
          formatTime={mockFormatTime}
          onCellClick={mockOnCellClick}
          onEditBooking={mockOnEditBooking}
          onDeleteBooking={mockOnDeleteBooking}
          onDragEnd={mockOnDragEnd}
        />
      </DndWrapper>
    );
    
    // Kontrollera att timmen visas
    expect(screen.getByText('9:00')).toBeInTheDocument();
    
    // Kontrollera att cellen är klickbar
    const cell = screen.getByRole('gridcell');
    expect(cell).toHaveAttribute('aria-label', expect.stringContaining('Tillgänglig'));
  });
  
  it('bör rendera en bokad cell korrekt', () => {
    const mockBooking = {
      id: 1,
      room_id: 1,
      date: '2023-06-10',
      startTime: '09:00',
      endTime: '10:00',
      start_time: '09:00',
      end_time: '10:00',
      booker: 'Test Person',
      purpose: 'Viktigt möte',
      bookingType: 'meeting'
    };
    
    render(
      <DndWrapper>
        <DraggableBookingCell
          roomId={1}
          day={currentDate}
          hour={9}
          isPastHour={false}
          isBooked={true}
          bookingInfo={mockBooking}
          formatTime={mockFormatTime}
          onCellClick={mockOnCellClick}
          onEditBooking={mockOnEditBooking}
          onDeleteBooking={mockOnDeleteBooking}
          onDragEnd={mockOnDragEnd}
        />
      </DndWrapper>
    );
    
    // Kontrollera att bokningsinformation visas
    expect(screen.getByText('Test Person')).toBeInTheDocument();
    expect(screen.getByText('Viktigt möte')).toBeInTheDocument();
    
    // Kontrollera att tiden visas
    expect(screen.getByText('09:00 - 10:00')).toBeInTheDocument();
  });
  
  it('bör anropa onCellClick när en ledig cell klickas', () => {
    render(
      <DndWrapper>
        <DraggableBookingCell
          roomId={1}
          day={currentDate}
          hour={9}
          isPastHour={false}
          isBooked={false}
          bookingInfo={null}
          formatTime={mockFormatTime}
          onCellClick={mockOnCellClick}
          onEditBooking={mockOnEditBooking}
          onDeleteBooking={mockOnDeleteBooking}
          onDragEnd={mockOnDragEnd}
        />
      </DndWrapper>
    );
    
    // Klicka på cellen
    fireEvent.click(screen.getByRole('gridcell'));
    
    // Kontrollera att onCellClick anropas med rätt parametrar
    expect(mockOnCellClick).toHaveBeenCalledWith(1, currentDate, 9);
  });
  
  it('bör anropa onEditBooking när en bokad cell klickas', () => {
    const mockBooking = {
      id: 1,
      room_id: 1,
      date: '2023-06-10',
      startTime: '09:00',
      endTime: '10:00',
      start_time: '09:00',
      end_time: '10:00',
      booker: 'Test Person',
      purpose: 'Viktigt möte',
      bookingType: 'meeting'
    };
    
    render(
      <DndWrapper>
        <DraggableBookingCell
          roomId={1}
          day={currentDate}
          hour={9}
          isPastHour={false}
          isBooked={true}
          bookingInfo={mockBooking}
          formatTime={mockFormatTime}
          onCellClick={mockOnCellClick}
          onEditBooking={mockOnEditBooking}
          onDeleteBooking={mockOnDeleteBooking}
          onDragEnd={mockOnDragEnd}
        />
      </DndWrapper>
    );
    
    // Hitta bokningsdiven inne i cellen och klicka på den
    const bookingDiv = screen.getByText('Test Person').closest('div');
    fireEvent.click(bookingDiv!);
    
    // Kontrollera att onEditBooking anropas med rätt ID
    expect(mockOnEditBooking).toHaveBeenCalledWith(1);
  });
  
  it('bör inte vara klickbar om det är en tidigare tidpunkt', () => {
    render(
      <DndWrapper>
        <DraggableBookingCell
          roomId={1}
          day={currentDate}
          hour={9}
          isPastHour={true}
          isBooked={false}
          bookingInfo={null}
          formatTime={mockFormatTime}
          onCellClick={mockOnCellClick}
          onEditBooking={mockOnEditBooking}
          onDeleteBooking={mockOnDeleteBooking}
          onDragEnd={mockOnDragEnd}
        />
      </DndWrapper>
    );
    
    // Klicka på cellen
    fireEvent.click(screen.getByRole('gridcell'));
    
    // Kontrollera att onCellClick inte anropas
    expect(mockOnCellClick).not.toHaveBeenCalled();
  });
  
  it('bör ha rätt tillgänglighetsattribut', () => {
    render(
      <DndWrapper>
        <DraggableBookingCell
          roomId={1}
          day={currentDate}
          hour={9}
          isPastHour={false}
          isBooked={false}
          bookingInfo={null}
          formatTime={mockFormatTime}
          onCellClick={mockOnCellClick}
          onEditBooking={mockOnEditBooking}
          onDeleteBooking={mockOnDeleteBooking}
          onDragEnd={mockOnDragEnd}
        />
      </DndWrapper>
    );
    
    const cell = screen.getByRole('gridcell');
    expect(cell).toHaveAttribute('role', 'gridcell');
    expect(cell).toHaveAttribute('tabIndex', '0');
    expect(cell).toHaveAttribute('aria-disabled', 'false');
  });
  
  it('bör reagera på tangentbordsinteraktioner', () => {
    render(
      <DndWrapper>
        <DraggableBookingCell
          roomId={1}
          day={currentDate}
          hour={9}
          isPastHour={false}
          isBooked={false}
          bookingInfo={null}
          formatTime={mockFormatTime}
          onCellClick={mockOnCellClick}
          onEditBooking={mockOnEditBooking}
          onDeleteBooking={mockOnDeleteBooking}
          onDragEnd={mockOnDragEnd}
        />
      </DndWrapper>
    );
    
    // Tryck Enter-tangenten
    fireEvent.keyDown(screen.getByRole('gridcell'), { key: 'Enter' });
    expect(mockOnCellClick).toHaveBeenCalledWith(1, currentDate, 9);
    
    mockOnCellClick.mockClear();
    
    // Tryck mellanslagstangenten
    fireEvent.keyDown(screen.getByRole('gridcell'), { key: ' ' });
    expect(mockOnCellClick).toHaveBeenCalledWith(1, currentDate, 9);
  });
}); 