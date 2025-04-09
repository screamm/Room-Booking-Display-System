/**
 * Formaterar en tid från "HH:MM" till "HH:MM" eller ett annat format
 * @param time - Tid i formatet "HH:MM"
 * @returns Formaterad tid
 */
export const formatTime = (time: string): string => {
  if (!time || !time.includes(':')) return time;
  
  // Enkel formatering - i framtiden kan vi lägga till mer avancerad formatering
  return time;
};

/**
 * Formaterar en tid från timme (8, 9, etc) till "08:00", "09:00" format
 * @param hour - Timme som heltal
 * @returns Formaterad tid i "HH:00" format
 */
export const hourToTimeString = (hour: number): string => {
  return `${hour.toString().padStart(2, '0')}:00`;
};

/**
 * Beräknar sluttid baserat på starttid och varaktighet
 * @param startTime - Starttid i formatet "HH:MM"
 * @param durationHours - Varaktighet i timmar
 * @returns Sluttid i formatet "HH:MM"
 */
export const calculateEndTime = (startTime: string, durationHours: number): string => {
  console.log(`Beräknar sluttid: ${startTime} + ${durationHours} timmar`);

  if (!startTime || !startTime.includes(':')) {
    console.error('Ogiltig starttid:', startTime);
    return '17:00'; // Använd en default sluttid
  }

  const [hours, minutes] = startTime.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    console.error('Ogiltig tid format:', { hours, minutes });
    return '17:00';
  }

  let endHours = hours + Math.floor(durationHours);
  let endMinutes = minutes + Math.round((durationHours % 1) * 60);
  
  // Om minuter rinner över, justera timmar
  if (endMinutes >= 60) {
    endHours += 1;
    endMinutes -= 60;
  }
  
  // Hantera fall där sluttiden skulle vara efter 17:00
  if (endHours > 17 || (endHours === 17 && endMinutes > 0)) {
    endHours = 17;
    endMinutes = 0;
  }
  
  const result = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  console.log(`Beräknad sluttid: ${result}`);
  
  return result;
};

/**
 * Kontrollerar om en tid är i det förflutna
 * @param date - Datum att kontrollera
 * @param time - Tid i formatet "HH:MM"
 * @returns true om tiden är i det förflutna
 */
export const isTimeInPast = (date: Date, time: string): boolean => {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  const dateToCheck = new Date(
    date.getFullYear(), 
    date.getMonth(), 
    date.getDate(), 
    hours, 
    minutes
  );
  
  return dateToCheck < now;
}; 