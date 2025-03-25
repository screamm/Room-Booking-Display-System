import React, { useState, useEffect } from 'react';
import { addMonths, subMonths, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { sv } from 'date-fns/locale';

interface CalendarWidgetProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({ selectedDate, onDateChange }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));
  const selectedDateObj = new Date(selectedDate);

  const onDateSelect = (date: Date) => {
    onDateChange(format(date, 'yyyy-MM-dd'));
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    onDateSelect(today);
  };

  const renderHeader = () => {
    return (
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={prevMonth}
          aria-label="Föregående månad"
          className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-600 text-gray-600 dark:text-gray-400"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
            />
          </svg>
        </button>
        <div className="flex items-center">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {format(currentMonth, 'MMMM yyyy', { locale: sv })}
          </h3>
          <button
            onClick={goToToday}
            className="ml-2 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
          >
            Idag
          </button>
        </div>
        <button
          onClick={nextMonth}
          aria-label="Nästa månad"
          className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-600 text-gray-600 dark:text-gray-400"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            />
          </svg>
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const weekDays = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];
    return (
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = monthStart;
    const endDate = monthEnd;

    const dateFormat = 'd';
    const rows = [];

    let days = eachDayOfInterval({
      start: startDate,
      end: endDate,
    });

    let formattedDays = days.map((day) => ({
      date: day,
      dayOfMonth: format(day, dateFormat),
      isCurrentMonth: true,
    }));

    // Lägg till dagar från föregående månad
    const firstDayOfWeek = monthStart.getDay() || 7;
    if (firstDayOfWeek !== 1) {
      const prevDays = eachDayOfInterval({
        start: subMonths(monthStart, 1),
        end: subMonths(monthStart, 1),
      }).slice(-firstDayOfWeek + 1);

      formattedDays = [
        ...prevDays.map((day) => ({
          date: day,
          dayOfMonth: format(day, dateFormat),
          isCurrentMonth: false,
        })),
        ...formattedDays,
      ];
    }

    // Lägg till dagar från nästa månad
    const lastDayOfWeek = (monthEnd.getDay() || 7);
    if (lastDayOfWeek !== 7) {
      const nextDays = eachDayOfInterval({
        start: addMonths(monthStart, 1),
        end: addMonths(monthStart, 1),
      }).slice(0, 7 - lastDayOfWeek);

      formattedDays = [
        ...formattedDays,
        ...nextDays.map((day) => ({
          date: day,
          dayOfMonth: format(day, dateFormat),
          isCurrentMonth: false,
        })),
      ];
    }

    return (
      <div className="grid grid-cols-7 gap-1">
        {formattedDays.map((day, index) => (
          <button
            key={index}
            onClick={() => onDateSelect(day.date)}
            className={`
              w-8 h-8 rounded-full flex items-center justify-center text-xs transition-colors
              ${day.isCurrentMonth ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}
              ${isSameDay(day.date, selectedDateObj) ? 'bg-primary-500 text-white' : ''}
              ${!isSameDay(day.date, selectedDateObj) ? 'hover:bg-gray-100 dark:hover:bg-dark-600' : ''}
            `}
          >
            {day.dayOfMonth}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-dark-700 rounded-lg shadow-soft dark:shadow-soft-dark p-4">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  );
};

export default CalendarWidget; 