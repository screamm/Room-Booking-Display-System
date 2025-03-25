import React, { useState } from 'react';

interface RecurringBookingFormProps {
  onSubmit: (bookings: any[]) => void;
  onCancel: () => void;
  initialData: {
    roomId: number;
    date: string;
    startTime: string;
    endTime: string;
    booker: string;
    purpose: string;
  };
}

type RecurrenceType = 'daily' | 'weekly' | 'monthly';

const RecurringBookingForm: React.FC<RecurringBookingFormProps> = ({ 
  onSubmit, 
  onCancel,
  initialData 
}) => {
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('weekly');
  const [occurrences, setOccurrences] = useState<number>(4);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([new Date(initialData.date).getDay()]);
  const [endDate, setEndDate] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<'occurrences' | 'endDate'>('occurrences');

  // Beräkna slutdatum baserat på antalet förekomster
  const calculateEndDate = (startDate: string, type: RecurrenceType, count: number): string => {
    const date = new Date(startDate);
    
    switch (type) {
      case 'daily':
        date.setDate(date.getDate() + count - 1);
        break;
      case 'weekly':
        date.setDate(date.getDate() + (count * 7) - 1);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + count - 1);
        break;
    }
    
    return date.toISOString().split('T')[0];
  };

  // Generera en serie bokningar baserat på återkommande mönster
  const generateRecurringBookings = () => {
    const bookings = [];
    const startDate = new Date(initialData.date);
    const maxDate = selectedOption === 'endDate' 
      ? new Date(endDate) 
      : new Date(calculateEndDate(initialData.date, recurrenceType, occurrences));
    
    let currentDate = new Date(startDate);
    let count = 0;
    
    // Loopa tills vi når slutdatumet eller max antal förekomster
    while (currentDate <= maxDate && (selectedOption === 'endDate' || count < occurrences)) {
      if (recurrenceType === 'weekly') {
        // För veckovis återkommande, kontrollera om veckodagen är vald
        const dayOfWeek = currentDate.getDay();
        const adjustedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek; // Anpassa för söndagar (0 -> 7)
        
        if (daysOfWeek.includes(adjustedDayOfWeek)) {
          bookings.push({
            ...initialData,
            date: currentDate.toISOString().split('T')[0]
          });
          count++;
        }
      } else {
        // För dagliga och månatliga, lägg bara till datumet
        bookings.push({
          ...initialData,
          date: currentDate.toISOString().split('T')[0]
        });
        count++;
      }
      
      // Gå till nästa datum baserat på återkomsttyp
      if (recurrenceType === 'daily') {
        currentDate.setDate(currentDate.getDate() + 1);
      } else if (recurrenceType === 'weekly') {
        if (daysOfWeek.length > 0 && currentDate.getDay() === 6) { // Om det är lördag och vi har valda dagar
          currentDate.setDate(currentDate.getDate() + 1); // Gå till nästa vecka
        } else {
          currentDate.setDate(currentDate.getDate() + 1); // Gå till nästa dag i veckan
        }
      } else if (recurrenceType === 'monthly') {
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }
    
    return bookings;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const bookings = generateRecurringBookings();
    onSubmit(bookings);
  };

  const handleDayToggle = (day: number) => {
    if (daysOfWeek.includes(day)) {
      setDaysOfWeek(daysOfWeek.filter(d => d !== day));
    } else {
      setDaysOfWeek([...daysOfWeek, day]);
    }
  };

  // Dagar i veckan (Måndag=1, Söndag=7)
  const weekdays = [
    { value: 1, label: 'Mån' },
    { value: 2, label: 'Tis' },
    { value: 3, label: 'Ons' },
    { value: 4, label: 'Tor' },
    { value: 5, label: 'Fre' },
    { value: 6, label: 'Lör' },
    { value: 7, label: 'Sön' }
  ];

  return (
    <div className="bg-white dark:bg-dark-700 rounded-xl shadow-xl p-6 max-w-md w-full">
      <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">
        Skapa återkommande bokning
      </h2>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
            Återkomst
          </label>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setRecurrenceType('daily')}
              className={`flex-1 py-2 px-3 rounded-lg ${
                recurrenceType === 'daily'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-dark-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              Dagligen
            </button>
            <button
              type="button"
              onClick={() => setRecurrenceType('weekly')}
              className={`flex-1 py-2 px-3 rounded-lg ${
                recurrenceType === 'weekly'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-dark-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              Veckovis
            </button>
            <button
              type="button"
              onClick={() => setRecurrenceType('monthly')}
              className={`flex-1 py-2 px-3 rounded-lg ${
                recurrenceType === 'monthly'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-dark-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              Månadsvis
            </button>
          </div>
        </div>
        
        {recurrenceType === 'weekly' && (
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
              Dagar i veckan
            </label>
            <div className="flex flex-wrap gap-2">
              {weekdays.map(day => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => handleDayToggle(day.value)}
                  className={`w-10 h-10 rounded-full ${
                    daysOfWeek.includes(day.value)
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 dark:bg-dark-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
            Bokningsperiod
          </label>
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="radio"
                id="option-occurrences"
                name="end-option"
                className="h-4 w-4 text-primary-500 focus:ring-primary-500 dark:focus:ring-primary-400"
                checked={selectedOption === 'occurrences'}
                onChange={() => setSelectedOption('occurrences')}
              />
              <div className="ml-2 flex items-center">
                <label htmlFor="option-occurrences" className="text-gray-700 dark:text-gray-300 mr-2">
                  Upprepa
                </label>
                <input
                  type="number"
                  min="1"
                  max="52"
                  value={occurrences}
                  onChange={e => setOccurrences(parseInt(e.target.value))}
                  className="border rounded-md px-2 py-1 w-16 text-gray-700 dark:text-gray-200 bg-white dark:bg-dark-600 border-gray-300 dark:border-dark-500"
                  disabled={selectedOption !== 'occurrences'}
                />
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {recurrenceType === 'daily' ? 'dagar' : recurrenceType === 'weekly' ? 'veckor' : 'månader'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center">
              <input
                type="radio"
                id="option-enddate"
                name="end-option"
                className="h-4 w-4 text-primary-500 focus:ring-primary-500 dark:focus:ring-primary-400"
                checked={selectedOption === 'endDate'}
                onChange={() => setSelectedOption('endDate')}
              />
              <div className="ml-2 flex items-center">
                <label htmlFor="option-enddate" className="text-gray-700 dark:text-gray-300 mr-2">
                  Slutdatum
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="border rounded-md px-2 py-1 text-gray-700 dark:text-gray-200 bg-white dark:bg-dark-600 border-gray-300 dark:border-dark-500"
                  min={initialData.date}
                  disabled={selectedOption !== 'endDate'}
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-dark-600 dark:hover:bg-dark-500 rounded-lg transition-colors text-gray-800 dark:text-gray-200"
          >
            Avbryt
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 text-white rounded-lg transition-colors shadow-soft"
          >
            Skapa återkommande bokning
          </button>
        </div>
      </form>
    </div>
  );
};

export default RecurringBookingForm; 