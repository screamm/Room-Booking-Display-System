import React from 'react';

interface MobileBottomMenuProps {
  currentView: string;
  onChangeView: (view: string) => void;
  onNewBooking: () => void;
  onEmergencyBooking?: () => void;
}

const MobileBottomMenu: React.FC<MobileBottomMenuProps> = ({
  currentView,
  onChangeView,
  onNewBooking,
  onEmergencyBooking
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-700 shadow-up p-2 border-t border-gray-200 dark:border-dark-600 z-50 md:hidden">
      <div className="flex justify-around items-center">
        {/* Kalendervy */}
        <button
          onClick={() => onChangeView('calendar')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-md transition-colors ${
            currentView === 'calendar' 
              ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20' 
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs mt-1">Kalender</span>
        </button>

        {/* Veckoplanering */}
        <button
          onClick={() => onChangeView('week-view')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-md transition-colors ${
            currentView === 'week-view' 
              ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20' 
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="text-xs mt-1">Vecka</span>
        </button>

        {/* Ny bokning */}
        <button
          onClick={onNewBooking}
          className="flex flex-col items-center justify-center py-1 px-3 text-white bg-primary-500 rounded-md shadow-soft"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-xs mt-1">Boka</span>
        </button>

        {/* Akut-knapp */}
        {onEmergencyBooking && (
          <button
            onClick={onEmergencyBooking}
            className="flex flex-col items-center justify-center py-1 px-3 text-white bg-red-600 rounded-md shadow-soft"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs mt-1">Akut</span>
          </button>
        )}

        {/* Lista */}
        <button
          onClick={() => onChangeView('list')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-md transition-colors ${
            currentView === 'list' 
              ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20' 
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          <span className="text-xs mt-1">Lista</span>
        </button>
      </div>
    </div>
  );
};

export default MobileBottomMenu; 