import React, { useRef } from 'react';
import { useDrag } from 'react-dnd';
import type { BookingType } from '../types/database.types';

// ItemTypes för drag and drop
const ItemTypes = {
  BOOKING_CELL: 'booking_cell'
};

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

interface DraggableBookingCellProps {
  roomId: number;
  day: Date;
  hour: number;
  isPastHour: boolean;
  isBooked: boolean;
  bookingInfo: any;
  formatTime: (time: string) => string;
  onCellClick: (roomId: number, date: Date, hour: number) => void;
  onEditBooking: (id: number) => void;
  onDeleteBooking: (booking: any) => void;
  onDragEnd: (roomId: number, day: Date, startHour: number, endHour: number) => void;
}

const DraggableBookingCell: React.FC<DraggableBookingCellProps> = ({
  roomId, day, hour, isPastHour, isBooked, bookingInfo, formatTime,
  onCellClick, onEditBooking, onDeleteBooking, onDragEnd
}) => {
  // Referens till cell för drag-slut koordinater
  const cellRef = useRef<HTMLDivElement>(null);
  
  // Drag-start koordinater
  const [dragStartY, setDragStartY] = React.useState<number | null>(null);
  
  // Beräkna timmar för bokningen om den redan finns
  const getBookingDuration = (): number => {
    if (!bookingInfo) return 1;
    const startHour = parseInt(bookingInfo.startTime.split(':')[0]);
    const endHour = parseInt(bookingInfo.endTime.split(':')[0]);
    return endHour - startHour;
  };
  
  // Konfigurera drag-beteende
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.BOOKING_CELL,
    item: { roomId, day, hour },
    canDrag: !isBooked && !isPastHour,
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult();
      
      if (!dropResult) return;
      
      // Hämta slutposition för draget
      if (cellRef.current && dragStartY !== null) {
        const rect = cellRef.current.getBoundingClientRect();
        const endY = monitor.getClientOffset()?.y || 0;
        
        // Beräkna drag-riktning och höjd för att avgöra antalet timmar
        const dragDistance = endY - dragStartY;
        const cellHeight = rect.height;
        
        // Antal timmar dragits (avrundat)
        const hoursDragged = Math.round(dragDistance / cellHeight);
        
        // Sätt minsta bokning till 1 timme
        const endHour = hour + Math.max(1, hoursDragged);
        
        // Meddela parent-komponenten
        onDragEnd(roomId, day, hour, endHour);
      }
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [roomId, day, hour, isBooked, isPastHour, onDragEnd, dragStartY]);
  
  // Hantera drag-start för att spara startposition
  const handleDragStart = (e: React.DragEvent) => {
    if (cellRef.current) {
      const rect = cellRef.current.getBoundingClientRect();
      setDragStartY(e.clientY);
    }
  };
  
  // Beräkna cell-height baserat på bokningstid
  const cellHeight = isBooked ? getBookingDuration() * 40 : 40; // 40px höjd per timme
  
  return (
    <div
      ref={(node) => {
        // Kombinera refs
        drag(node);
        if (cellRef) {
          // @ts-ignore
          cellRef.current = node;
        }
      }}
      className={`
        relative
        ${isBooked 
          ? 'cursor-pointer' 
          : isPastHour 
            ? 'cursor-not-allowed' 
            : 'cursor-grab active:cursor-grabbing hover:bg-primary-50 dark:hover:bg-primary-900/20'
        }
        ${isDragging ? 'opacity-50' : 'opacity-100'}
        border-b dark:border-dark-600
        ${isPastHour && !isBooked ? 'bg-gray-100 dark:bg-dark-800/70' : 'bg-white dark:bg-dark-700'}
        transition-all duration-150
      `}
      style={{ height: `${cellHeight}px` }}
      onClick={() => {
        if (!isBooked && !isPastHour) {
          onCellClick(roomId, day, hour);
        }
      }}
      onDragStart={handleDragStart}
      draggable={!isBooked && !isPastHour}
      aria-disabled={isPastHour}
    >
      {!isBooked && (
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
          <div className="text-xs text-gray-400 dark:text-gray-400">
            {hour}:00
          </div>
        </div>
      )}
      
      {isBooked && (
        <div 
          className={`absolute top-0 left-0 w-full h-full ${getBookingTypeColor(bookingInfo.bookingType)} bg-opacity-10 dark:bg-opacity-30 border border-l-4 ${getBookingTypeColor(bookingInfo.bookingType).replace('bg-', 'border-')} rounded-sm p-1 overflow-hidden`}
          onClick={(e) => {
            e.stopPropagation();
            onEditBooking(bookingInfo.id);
          }}
        >
          <div className="text-xs font-medium text-blue-800 dark:text-blue-100 mb-1">
            {formatTime(bookingInfo.startTime)}-{formatTime(bookingInfo.endTime)}
          </div>
          
          <div className="text-xs text-blue-900 dark:text-blue-50 font-medium truncate">
            {bookingInfo.booker}
          </div>
          
          {bookingInfo.purpose && (
            <div className="text-xs text-blue-700 dark:text-blue-200 truncate mt-0.5 italic">
              {bookingInfo.purpose}
            </div>
          )}
          
          <button
            className="absolute bottom-1 right-1 text-red-500 dark:text-red-300 hover:text-red-700 dark:hover:text-red-200 p-1"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteBooking(bookingInfo);
            }}
            aria-label="Ta bort bokning"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default DraggableBookingCell; 