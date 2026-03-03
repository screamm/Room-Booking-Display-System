import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import ConferenceRoomBooking from './components/ConferenceRoomBooking';
import DisplayRoom from './pages/DisplayRoom';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { UserPreferencesProvider } from './contexts/UserPreferencesContext';
import ThemeToggle from './components/ThemeToggle';
import PinGate from './components/PinGate';
import ErrorBoundary from './components/ErrorBoundary';

// Laddningsindikator för lazy loaded komponenter
const LoadingFallback = () => (
  <div className="loading-container">
    <div className="loading-spinner"></div>
    <p>Laddar...</p>
  </div>
);

// Separata komponenter för att hantera Toast-kontexten
const AppContent: React.FC = () => {
  return (
    <div className="app">
      <ThemeToggle />
      <Routes>
        <Route
          path="/"
          element={
            <ErrorBoundary>
              <PinGate>
                <ConferenceRoomBooking />
              </PinGate>
            </ErrorBoundary>
          }
        />
        <Route
          path="/display/:roomName"
          element={
            <ErrorBoundary>
              <DisplayRoom />
            </ErrorBoundary>
          }
        />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <Router>
      <ThemeProvider>
        <ToastProvider>
          <UserPreferencesProvider>
            <Suspense fallback={<LoadingFallback />}>
              <AppContent />
            </Suspense>
          </UserPreferencesProvider>
        </ToastProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
