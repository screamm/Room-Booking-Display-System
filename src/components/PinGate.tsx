import React, { useState, useEffect } from 'react';

const PIN_KEY = 'rod_session_auth';
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 timmar i millisekunder

interface PinGateProps {
  children: React.ReactNode;
}

const PinGate: React.FC<PinGateProps> = ({ children }) => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const correctPin = import.meta.env.VITE_ACCESS_PIN;

  useEffect(() => {
    // Kontrollera om det finns en aktiv session
    try {
      const stored = localStorage.getItem(PIN_KEY);
      if (stored) {
        const { timestamp } = JSON.parse(stored);
        if (Date.now() - timestamp < SESSION_DURATION) {
          setIsAuthorized(true);
        } else {
          // Session har gått ut
          localStorage.removeItem(PIN_KEY);
        }
      }
    } catch {
      localStorage.removeItem(PIN_KEY);
    }
  }, [correctPin]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctPin) {
      // Om ingen PIN är konfigurerad, tillåt åtkomst
      setIsAuthorized(true);
      return;
    }
    if (pin === correctPin) {
      localStorage.setItem(PIN_KEY, JSON.stringify({ timestamp: Date.now() }));
      setIsAuthorized(true);
      setError('');
    } else {
      setError('Fel PIN-kod. Försök igen.');
      setPin('');
    }
  };

  if (isAuthorized) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            Sjobergska RoD
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Rumsbokning
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="pin-input"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              PIN-kod
            </label>
            <input
              id="pin-input"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError('');
              }}
              placeholder="Ange PIN-kod"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-red-500 dark:text-red-400 text-sm text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-lg transition-colors duration-150"
          >
            Logga in
          </button>
        </form>
      </div>
    </div>
  );
};

export default PinGate;
