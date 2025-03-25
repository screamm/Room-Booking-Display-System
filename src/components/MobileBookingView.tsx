import React from 'react';
import type { Room, Booking as DBBooking } from '../types/database.types';

interface MobileBookingViewProps {
  rooms: Room[];
  bookings: {
    id: number;
    roomId: number;
    roomName: string;
    date: string;
    startTime: string;
    endTime: string;
    booker: string;
    purpose: string;
  }[];
  selectedDate: string;
  onNewBooking: () => void;
  onEditBooking: (booking: any) => void;
}

const MobileBookingView: React.FC<MobileBookingViewProps> = ({
  rooms,
  bookings,
  selectedDate,
  onNewBooking,
  onEditBooking,
}) => {
  // Gruppera bokningar efter rumsID
  const bookingsByRoom = rooms.map(room => {
    return {
      room,
      bookings: bookings.filter(
        booking => booking.roomId === room.id && booking.date === selectedDate
      ).sort((a, b) => a.startTime.localeCompare(b.startTime))
    };
  });

  // Formatera tid från "HH:MM:SS" till "HH:MM"
  const formatTime = (time: string) => {
    return time.substring(0, 5);
  };

  // Formatera dagens datum på ett trevligt sätt
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('sv-SE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }).format(date);
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">
          {formatDate(selectedDate)}
        </h2>
        <button
          onClick={onNewBooking}
          className="bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 text-white p-2 rounded-lg transition-all duration-200 shadow-soft"
          aria-label="Ny bokning"
        >
          <div className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            <span>Ny</span>
          </div>
        </button>
      </div>

      <div className="space-y-4">
        {bookingsByRoom.map(({ room, bookings }) => (
          <div
            key={room.id}
            className="bg-white dark:bg-dark-700 rounded-lg shadow-soft dark:shadow-soft-dark overflow-hidden"
          >
            <div className="bg-gray-50 dark:bg-dark-600 p-3 flex justify-between items-center">
              <div>
                <h3 className="font-medium text-primary-700 dark:text-primary-400">
                  {room.name}
                </h3>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap gap-1">
                  {room.features.map((feature, index) => (
                    <span 
                      key={index}
                      className="inline-block bg-gray-100 dark:bg-dark-500 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-md"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Max: {room.capacity} personer
              </div>
            </div>
            
            <div className="divide-y dark:divide-dark-600">
              {bookings.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  Inga bokningar idag
                </div>
              ) : (
                bookings.map(booking => (
                  <div
                    key={booking.id}
                    className="p-3 hover:bg-gray-50 dark:hover:bg-dark-600/50 transition-colors"
                    onClick={() => onEditBooking(booking)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="font-medium text-primary-700 dark:text-primary-400">
                        {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                        {booking.booker}
                      </div>
                    </div>
                    {booking.purpose && (
                      <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {booking.purpose}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MobileBookingView; 