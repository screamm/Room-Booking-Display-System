import React, { useState, useEffect } from 'react';
import type { Room } from '../types/database.types';

interface SearchAndFilterProps {
  rooms: Room[];
  onFilterChange: (filters: FilterState) => void;
}

interface FilterState {
  searchQuery: string;
  selectedRooms: number[];
  selectedFeatures: string[];
  minCapacity: number;
  dateRange: { start: string; end: string | null };
}

const SearchAndFilter: React.FC<SearchAndFilterProps> = ({ rooms, onFilterChange }) => {
  // Samla alla möjliga features från alla rum
  const allFeatures = Array.from(
    new Set(rooms.flatMap(room => room.features))
  ).sort();

  // Initial filtertillstånd
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    selectedRooms: [],
    selectedFeatures: [],
    minCapacity: 0,
    dateRange: { start: new Date().toISOString().split('T')[0], end: null }
  });

  // Expandera/kollapsa filter
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Skicka filterändringar till föräldrakomponenten
  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  // Hantera rumsfilter
  const handleRoomToggle = (roomId: number) => {
    setFilters(prev => {
      const newRooms = prev.selectedRooms.includes(roomId)
        ? prev.selectedRooms.filter(id => id !== roomId)
        : [...prev.selectedRooms, roomId];

      return { ...prev, selectedRooms: newRooms };
    });
  };

  // Hantera funktionsfilter
  const handleFeatureToggle = (feature: string) => {
    setFilters(prev => {
      const newFeatures = prev.selectedFeatures.includes(feature)
        ? prev.selectedFeatures.filter(f => f !== feature)
        : [...prev.selectedFeatures, feature];

      return { ...prev, selectedFeatures: newFeatures };
    });
  };

  // Hantera kapacitetsfilter
  const handleCapacityChange = (capacity: number) => {
    setFilters(prev => ({ ...prev, minCapacity: capacity }));
  };

  // Hantera sökfråga
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, searchQuery: e.target.value }));
  };

  // Återställ filter
  const resetFilters = () => {
    setFilters({
      searchQuery: '',
      selectedRooms: [],
      selectedFeatures: [],
      minCapacity: 0,
      dateRange: { start: new Date().toISOString().split('T')[0], end: null }
    });
  };

  return (
    <div className="bg-white dark:bg-dark-700 rounded-lg shadow-soft dark:shadow-soft-dark mb-6 overflow-hidden">
      {/* Sökfält och växla filter */}
      <div className="p-4 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Sök bokningar..."
            value={filters.searchQuery}
            onChange={handleSearchChange}
            className="pl-10 pr-4 py-2 w-full border dark:border-dark-500 rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:outline-none transition-shadow duration-200 bg-white dark:bg-dark-600 text-gray-800 dark:text-gray-200"
          />
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-dark-600 dark:hover:bg-dark-500 rounded-lg transition-colors text-gray-700 dark:text-gray-300 whitespace-nowrap"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
          </svg>
          Filter
          {(filters.selectedRooms.length > 0 || filters.selectedFeatures.length > 0 || filters.minCapacity > 0) && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-primary-500 text-white rounded-full">
              {filters.selectedRooms.length + filters.selectedFeatures.length + (filters.minCapacity > 0 ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {/* Expanderade filter */}
      {isExpanded && (
        <div className="p-4 border-t dark:border-dark-600 bg-gray-50 dark:bg-dark-800/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Rumsfilter */}
            <div>
              <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Rummen</h3>
              <div className="space-y-1">
                {rooms.map(room => (
                  <div key={room.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`room-${room.id}`}
                      checked={filters.selectedRooms.includes(room.id)}
                      onChange={() => handleRoomToggle(room.id)}
                      className="h-4 w-4 text-primary-500 focus:ring-primary-500 dark:focus:ring-primary-400 rounded"
                    />
                    <label htmlFor={`room-${room.id}`} className="ml-2 text-gray-700 dark:text-gray-300">
                      {room.name} ({room.capacity} pers)
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Funktionsfilter */}
            <div>
              <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Funktioner</h3>
              <div className="flex flex-wrap gap-2">
                {allFeatures.map(feature => (
                  <button
                    key={feature}
                    onClick={() => handleFeatureToggle(feature)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      filters.selectedFeatures.includes(feature)
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-200 dark:bg-dark-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {feature}
                  </button>
                ))}
              </div>
            </div>

            {/* Kapacitetsfilter */}
            <div>
              <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Kapacitet (min)</h3>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={filters.minCapacity}
                  onChange={e => handleCapacityChange(parseInt(e.target.value))}
                  className="w-full accent-primary-500"
                />
                <span className="text-gray-700 dark:text-gray-300 w-8 text-center">
                  {filters.minCapacity}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-dark-600 dark:hover:bg-dark-500 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
            >
              Återställ filter
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchAndFilter; 