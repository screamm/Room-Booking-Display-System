import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CalendarWidget from './CalendarWidget';

describe('CalendarWidget', () => {
  const mockOnDateChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('bör visa aktuell månad och år', () => {
    render(<CalendarWidget selectedDate="2025-03-25" onDateChange={mockOnDateChange} />);
    expect(screen.getByText('mars 2025')).toBeInTheDocument();
  });

  it('bör markera valt datum', () => {
    render(<CalendarWidget selectedDate="2025-03-25" onDateChange={mockOnDateChange} />);
    const selectedDay = screen.getByText('25');
    expect(selectedDay.closest('button')).toHaveClass('bg-primary-500');
  });

  it('bör navigera till föregående månad när vänsterpilen klickas', () => {
    render(<CalendarWidget selectedDate="2025-03-25" onDateChange={mockOnDateChange} />);
    const prevButton = screen.getByLabelText('Föregående månad');
    fireEvent.click(prevButton);
    expect(screen.getByText('februari 2025')).toBeInTheDocument();
  });

  it('bör navigera till nästa månad när högerpilen klickas', () => {
    render(<CalendarWidget selectedDate="2025-03-25" onDateChange={mockOnDateChange} />);
    const nextButton = screen.getByLabelText('Nästa månad');
    fireEvent.click(nextButton);
    expect(screen.getByText('april 2025')).toBeInTheDocument();
  });

  it('bör anropa onDateChange när ett datum väljs', () => {
    render(<CalendarWidget selectedDate="2025-03-25" onDateChange={mockOnDateChange} />);
    const dayButton = screen.getByText('15');
    fireEvent.click(dayButton);
    expect(mockOnDateChange).toHaveBeenCalledWith(expect.any(String));
  });
}); 