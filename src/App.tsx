import React, { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import ConferenceRoomBooking from './components/ConferenceRoomBooking';
import DisplayRoom from './pages/DisplayRoom';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { UserPreferencesProvider } from './contexts/UserPreferencesContext';
import ThemeToggle from './components/ThemeToggle';
import { supabase } from './lib/supabase';

// Lazy load mindre kritiska komponenter
const RecurringBookingForm = lazy(() => import('./components/RecurringBookingForm'));
const GoogleCalendarSync = lazy(() => import('./components/GoogleCalendarSync'));
const MobileBookingView = lazy(() => import('./components/MobileBookingView'));

// Laddningsindikator för lazy loaded komponenter
const LoadingFallback = () => (
  <div className="loading-container">
    <div className="loading-spinner"></div>
    <p>Laddar...</p>
  </div>
);

// Separata komponenter för att hantera Toast-kontexten
const AppContent: React.FC = () => {
  const { showToast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="app">
      <ThemeToggle />
      <Routes>
        <Route path="/" element={<ConferenceRoomBooking />} />
        <Route path="/display/:roomName" element={<DisplayRoom />} />
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
