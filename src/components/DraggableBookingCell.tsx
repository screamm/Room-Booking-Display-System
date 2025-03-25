import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import type { Room, BookingType } from '../types/database.types';
import { formatTime } from '../utils/dateUtils';

// Typer för droppable items
const ItemTypes = {
  BOOKING_CELL: 'bookingCell',
};

// Typ för drag-item
interface DragItem {
  roomId: number;
  hour: number;
  day: Date;
}

// Props för komponenten
interface DraggableBookingCellProps {
  roomId: number;
  day: Date;
  hour: number;
  isPastHour: boolean;
  isBooked: boolean;
  bookingInfo: any | null;
  formatTime: (time: string) => string;
  bookingType?: BookingType;
  onCellClick: (roomId: number, day: Date, hour: number) => void;
  onEditBooking: (bookingId: number) => void;
  onDeleteBooking: (bookingInfo: any) => void;
  onDragEnd: (roomId: number, day: Date, startHour: number, endHour: number) => void;
}

// Färgkodning för olika bokningstyper
const bookingTypeColors = {
  meeting: 'bg-blue-500',
  presentation: 'bg-green-500',
  workshop: 'bg-purple-500',
  internal: 'bg-amber-500',
  external: 'bg-red-500'
};

// Funktion för att få bakgrundsfärg baserat på bokningstyp
const getBookingTypeColor = (bookingType?: BookingType): string => {
  if (!bookingType || !bookingTypeColors[bookingType]) {
    return 'bg-gray-400'; // Standardfärg för odefinierad typ
  }
  return bookingTypeColors[bookingType];
};

const DraggableBookingCell: React.FC<DraggableBookingCellProps> = ({
  roomId,
  day,
  hour,
  isPastHour,
  isBooked,
  bookingInfo,
  formatTime,
  onCellClick,
  onEditBooking,
  onDeleteBooking,
  onDragEnd
}) => {
  const ref = useRef<HTMLDivElement>(null);
  
  // Beräkna längden på bokningen i timmar
  let bookingLength = 1;
  if (isBooked && bookingInfo) {
    const startHour = parseInt(bookingInfo.startTime.split(':')[0]);
    const endHour = parseInt(bookingInfo.endTime.split(':')[0]);
    bookingLength = endHour - startHour;
  }

  // Setup drag source
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.BOOKING_CELL,
    item: { roomId, hour, day },
    canDrag: !isBooked && !isPastHour,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult<{ roomId: number; hour: number; day: Date }>();
      if (item && dropResult) {
        // Beräkna starttid (den tidigaste av de två cellerna)
        const startHour = Math.min(item.hour, dropResult.hour);
        // Beräkna sluttid (den senaste av de två cellerna + 1)
        const endHour = Math.max(item.hour, dropResult.hour) + 1;
        
        // Anropa callback för att skapa bokning
        onDragEnd(dropResult.roomId, dropResult.day, startHour, endHour);
      }
    },
  });

  // Setup drop target
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.BOOKING_CELL,
    canDrop: () => !isBooked && !isPastHour,
    drop: () => ({ roomId, hour, day }),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  });
  
  // Kombinera drag och drop refs
  drag(drop(ref));
  
  // UI-klasser för drag and drop indikationer
  const dragDropClasses = !isBooked && !isPastHour
    ? `${isDragging ? 'opacity-50' : ''} 
       ${isOver && canDrop ? 'bg-green-100 dark:bg-green-900/20' : ''} 
       ${!isOver && canDrop ? 'bg-yellow-100 dark:bg-yellow-900/10' : ''}`
    : '';

  // Hantera tangentbordsnavigering
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!isBooked && !isPastHour) {
        onCellClick(roomId, day, hour);
      } else if (isBooked && bookingInfo) {
        onEditBooking(bookingInfo.id);
      }
    }
  };

  return (
    <div 
      ref={ref}
      className={`border-t dark:border-dark-600 p-1 h-14 
        ${isPastHour 
          ? 'bg-gray-50 dark:bg-dark-700/50' 
          : isBooked ? '' : 'hover:bg-gray-50 dark:hover:bg-dark-600 cursor-pointer'
        } 
        ${dragDropClasses}
        transition-all duration-200`}
      style={{ 
        gridRow: isBooked ? `span ${bookingLength}` : 'auto',
        opacity: isDragging ? 0.5 : 1,
      }}
      onClick={() => !isBooked && !isPastHour ? onCellClick(roomId, day, hour) : null}
      role="gridcell"
      aria-label={`Tid ${hour}:00 ${isBooked ? 'Bokad' : 'Tillgänglig'}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-grabbed={isBooked && isDragging}
      aria-dropeffect={!isBooked && !isPastHour ? 'execute' : undefined}
    >
      {!isBooked ? (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {hour}:00
        </div>
      ) : (
        bookingInfo && (hour === parseInt(bookingInfo.startTime.split(':')[0])) && (
          <div 
            className={`${getBookingTypeColor(bookingInfo.bookingType)} bg-opacity-10 p-2 rounded-lg shadow-soft h-full overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] transform-gpu border border-l-4 ${getBookingTypeColor(bookingInfo.bookingType)} border-opacity-50 relative`}
            title={`${bookingInfo.purpose || 'Bokning'} - ${bookingInfo.booker}`}
            onClick={(e) => {
              e.stopPropagation(); 
              onEditBooking(bookingInfo.id);
            }}
          >
            <div className="text-xs font-medium text-primary-800 dark:text-primary-300 mb-1">
              {formatTime(bookingInfo.startTime)} - {formatTime(bookingInfo.endTime)}
            </div>
            <div className="text-xs font-medium truncate text-primary-700 dark:text-primary-400">
              {bookingInfo.booker}
            </div>
            {bookingInfo.purpose && (
              <div className="text-xs truncate text-primary-600 dark:text-primary-500">
                {bookingInfo.purpose}
              </div>
            )}
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteBooking(bookingInfo);
                }}
                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-white dark:bg-dark-700 rounded-full p-1 shadow-sm"
                title="Ta bort bokning"
                aria-label="Ta bort bokning"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
        )
      )}
      
      {isOver && canDrop && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="p-1 bg-white dark:bg-dark-800 text-xs font-semibold rounded shadow">
            Släpp för att flytta bokning
          </div>
        </div>
      )}
    </div>
  );
};

export default DraggableBookingCell; 