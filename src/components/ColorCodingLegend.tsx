import React from 'react';

const ColorCodingLegend: React.FC = () => {
  // Olika bokningstyper med färgkoder
  const bookingTypes = [
    { type: 'Möte', color: 'bg-blue-500' },
    { type: 'Presentation', color: 'bg-green-500' },
    { type: 'Workshop', color: 'bg-purple-500' },
    { type: 'Internt', color: 'bg-amber-500' },
    { type: 'Extern kund', color: 'bg-red-500' },
  ];

  return (
    <aside className="p-3 bg-white dark:bg-dark-700 rounded-lg shadow-sm ">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Bokningstyper
      </h3>
      <ul className="flex flex-wrap gap-2">
        {bookingTypes.map((type) => (
          <li key={type.type} className="flex items-center text-xs">
            <span className={`inline-block w-3 h-3 rounded-full mr-1 ${type.color}`} />
            <span className="text-gray-600 dark:text-gray-400">{type.type}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default ColorCodingLegend; 