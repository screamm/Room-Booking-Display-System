import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('visar laddningsmeddelande när appen startar', () => {
  render(<App />);
  const loadingElement = screen.getByText(/ansluter till databasen/i);
  expect(loadingElement).toBeInTheDocument();
});
