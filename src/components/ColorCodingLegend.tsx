import React from 'react';

interface ColorCodingLegendProps {
  className?: string;
}

const ColorCodingLegend: React.FC<ColorCodingLegendProps> = ({ className = '' }) => {
  // Olika bokningstyper med färgkoder
  const bookingTypes = [
    { id: 'meeting', name: 'Möte', color: 'bg-blue-500' },
    { id: 'presentation', name: 'Presentation', color: 'bg-green-500' },
    { id: 'workshop', name: 'Workshop', color: 'bg-purple-500' },
    { id: 'internal', name: 'Internt', color: 'bg-amber-500' },
    { id: 'external', name: 'Extern kund', color: 'bg-red-500' },
  ];

  return (
    <div className={`p-3 bg-white dark:bg-dark-700 rounded-lg shadow-sm ${className}`}>
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Förklaring</h3>
      <div className="flex flex-wrap gap-2">
        {bookingTypes.map(type => (
          <div key={type.id} className="flex items-center text-xs">
            <span className={`inline-block w-3 h-3 rounded-full mr-1 ${type.color}`}></span>
            <span className="text-gray-600 dark:text-gray-400">{type.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ColorCodingLegend; 