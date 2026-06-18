export function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTime(date = new Date()) {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDisplayDate(isoDate) {
  const [year, month, day] = isoDate.split('-');
  return `${month}/${day}/${year}`;
}

export function getCurrentMonthYear() {
  const now = new Date();
  return {
    month: now.getMonth(),
    year: now.getFullYear(),
  };
}

export function isSameMonth(isoDate, month, year) {
  const [y, m] = isoDate.split('-').map(Number);
  return y === year && m - 1 === month;
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse a locale time string ("09:23 AM") to minutes since midnight.
 * Returns -1 if the string cannot be parsed (null, undefined, empty, or malformed).
 *
 * @param {string|null|undefined} timeStr - e.g. "09:23 AM"
 * @returns {number} minutes since midnight, or -1 for invalid input
 */
export function parseTimeToMinutes(timeStr) {
  if (!timeStr) return -1;
  const parts = timeStr.trim().split(' ');
  if (parts.length !== 2) return -1;
  const [hStr, mStr] = parts[0].split(':');
  let hours = parseInt(hStr, 10);
  const minutes = parseInt(mStr, 10);
  if (isNaN(hours) || isNaN(minutes)) return -1;
  const period = parts[1].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}
