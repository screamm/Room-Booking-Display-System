import React, { useState, useEffect } from 'react';

interface CalendarWidgetProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({ selectedDate, onDateSelect }) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date(selectedDate));
  const [calendarDays, setCalendarDays] = useState<Array<{ day: number; date: string; isCurrentMonth: boolean; isToday: boolean }>>([]);

  useEffect(() => {
    generateCalendar(currentMonth);
  }, [currentMonth, selectedDate]);

  // Generera kalenderdagar för en given månad
  const generateCalendar = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Första dagen i månaden
    const firstDayOfMonth = new Date(year, month, 1);
    // Sista dagen i månaden
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    // Dag i veckan för första dagen (0 = söndag, 1 = måndag, osv)
    let firstWeekday = firstDayOfMonth.getDay();
    // Justera för att måndag är första dagen i veckan
    firstWeekday = firstWeekday === 0 ? 6 : firstWeekday - 1;
    
    // Skapa en array med kalenderdagar
    const days = [];
    
    // Lägg till dagar från föregående månad
    const prevMonth = new Date(year, month, 0);
    const prevMonthDays = prevMonth.getDate();
    
    for (let i = firstWeekday - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const date = new Date(year, month - 1, day);
      days.push({
        day,
        date: formatDate(date),
        isCurrentMonth: false,
        isToday: isToday(date)
      });
    }
    
    // Lägg till dagar i aktuell månad
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const date = new Date(year, month, i);
      days.push({
        day: i,
        date: formatDate(date),
        isCurrentMonth: true,
        isToday: isToday(date)
      });
    }
    
    // Fyll på med dagar från nästa månad för att få en komplett kalender
    const totalDaysNeeded = 42; // 6 rader * 7 dagar
    const remainingDays = totalDaysNeeded - days.length;
    
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        day: i,
        date: formatDate(date),
        isCurrentMonth: false,
        isToday: isToday(date)
      });
    }
    
    setCalendarDays(days);
  };

  // Formatera Date-objekt till "YYYY-MM-DD" string
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Kontrollera om ett datum är idag
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Gå till föregående månad
  const goToPrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  // Gå till nästa månad
  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Gå till dagens datum
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    onDateSelect(formatDate(today));
  };

  // Formatera månadsnamnet
  const formatMonthName = (date: Date): string => {
    return new Intl.DateTimeFormat('sv-SE', { month: 'long', year: 'numeric' }).format(date);
  };

  const weekdays = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

  return (
    <div className="bg-white dark:bg-dark-700 rounded-lg shadow-soft dark:shadow-soft-dark p-4">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={goToPrevMonth}
          className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-600 text-gray-600 dark:text-gray-400"
          aria-label="Föregående månad"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        <div className="flex items-center">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {formatMonthName(currentMonth)}
          </h3>
          <button
            onClick={goToToday}
            className="ml-2 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
          >
            Idag
          </button>
        </div>
        <button
          onClick={goToNextMonth}
          className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-600 text-gray-600 dark:text-gray-400"
          aria-label="Nästa månad"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekdays.map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => (
          <button
            key={index}
            onClick={() => onDateSelect(day.date)}
            className={`
              w-8 h-8 rounded-full flex items-center justify-center text-xs transition-colors
              ${day.isCurrentMonth ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}
              ${day.date === selectedDate ? 'bg-primary-500 text-white' : ''}
              ${day.isToday && day.date !== selectedDate ? 'border border-primary-500 dark:border-primary-400' : ''}
              ${!day.isToday && day.date !== selectedDate ? 'hover:bg-gray-100 dark:hover:bg-dark-600' : ''}
            `}
          >
            {day.day}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CalendarWidget; 