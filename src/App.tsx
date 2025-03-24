import React from 'react';
import './App.css';
import ConferenceRoomBooking from './components/ConferenceRoomBooking';
import { ThemeProvider } from './contexts/ThemeContext';
import ThemeToggle from './components/ThemeToggle';

function App() {
  return (
    <ThemeProvider>
      <div className="App bg-white dark:bg-gray-900 min-h-screen transition-colors duration-200">
        <ConferenceRoomBooking />
        <ThemeToggle />
      </div>
    </ThemeProvider>
  );
}

export default App;
