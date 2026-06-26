import { classifyPunctuality } from '../services/attendanceService';
import { getTodayDateString } from '../utils/dateUtils';

/**
 * PresenceCalendar — renders a 7-column monthly day-grid.
 *
 * @param {Object[]} records    - raw attendance records with `date` and `checkIn` fields
 * @param {number}   month      - 0-indexed month (0 = January)
 * @param {number}   year       - full year (e.g. 2025)
 * @param {string}   cutoffTime - e.g. "09:00 AM", used to classify punctuality
 */
export default function PresenceCalendar({ records, month, year, cutoffTime }) {
  // Build lookup: ISO date string -> record
  const recordMap = {};
  records.forEach(r => { recordMap[r.date] = r; });

  const today = getTodayDateString();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday

  // Build cells array
  const cells = [];

  // Leading empty cells for first-week offset
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push({ empty: true, key: `empty-${i}` });
  }

  // One cell per day in the month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const cellDate = new Date(year, month, d);
    const isFuture = dateStr > today; // ISO string comparison is safe
    const isWeekend = cellDate.getDay() === 0 || cellDate.getDay() === 6;

    let color = 'grey'; // default: future or weekend

    if (!isFuture && !isWeekend) {
      const record = recordMap[dateStr];
      if (record?.checkIn) {
        const punctuality = classifyPunctuality(record.checkIn, cutoffTime);
        color = punctuality === 'Late' ? 'amber' : 'green';
      } else if (record?.status === 'not_attending') {
        color = 'red';
      } else {
        color = 'red';
      }
    }

    cells.push({ day: d, color, dateStr });
  }

  return (
    <div className="presence-calendar">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
        <div key={d} className="presence-calendar__header">{d}</div>
      ))}
      {cells.map((cell, i) =>
        cell.empty ? (
          <div
            key={cell.key}
            className="presence-calendar__cell presence-calendar__cell--empty"
          />
        ) : (
          <div
            key={cell.dateStr}
            className={`presence-calendar__cell presence-calendar__cell--${cell.color}`}
            title={cell.dateStr}
          >
            {cell.day}
          </div>
        )
      )}
    </div>
  );
}
