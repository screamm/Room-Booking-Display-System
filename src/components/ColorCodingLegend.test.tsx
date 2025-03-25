import React from 'react';
import { render, screen } from '@testing-library/react';
import ColorCodingLegend from './ColorCodingLegend';

describe('ColorCodingLegend', () => {
  it('bör visa alla bokningstyper med rätt färger', () => {
    render(<ColorCodingLegend />);

    // Kontrollera att alla bokningstyper visas
    expect(screen.getByText('Möte')).toBeInTheDocument();
    expect(screen.getByText('Presentation')).toBeInTheDocument();
    expect(screen.getByText('Workshop')).toBeInTheDocument();
    expect(screen.getByText('Internt')).toBeInTheDocument();
    expect(screen.getByText('Extern kund')).toBeInTheDocument();

    // Kontrollera att färgerna är korrekta
    const items = screen.getAllByRole('listitem');
    expect(items[0].querySelector('span')).toHaveClass('bg-blue-500');
    expect(items[1].querySelector('span')).toHaveClass('bg-green-500');
    expect(items[2].querySelector('span')).toHaveClass('bg-purple-500');
    expect(items[3].querySelector('span')).toHaveClass('bg-amber-500');
    expect(items[4].querySelector('span')).toHaveClass('bg-red-500');
  });

  it('bör ha korrekt rubrik', () => {
    render(<ColorCodingLegend />);
    expect(screen.getByText('Bokningstyper')).toBeInTheDocument();
  });

  it('bör ha korrekt tillgänglighetsroll', () => {
    render(<ColorCodingLegend />);
    expect(screen.getByRole('complementary')).toBeInTheDocument();
  });
}); 