import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { parseTimeToMinutes } from '../utils/dateUtils';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function AnalyticsSection({ rows, month, year }) {
  if (!rows || rows.length === 0) {
    return (
      <section className="analytics-section">
        <p className="analytics-section__empty">No data available for this month</p>
      </section>
    );
  }

  // Derive dailyData: map dayNumber -> Set of phones
  const turnoutMap = {};
  rows.forEach(row => {
    const day = parseInt(row.date.split('-')[2], 10);
    if (!turnoutMap[day]) turnoutMap[day] = new Set();
    turnoutMap[day].add(row.phone);
  });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dailyData = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    count: turnoutMap[i + 1]?.size ?? 0,
  }));

  // Derive peakData: hours 6 AM to 6 PM (13 slots)
  const hourLabels = [
    '6 AM', '7 AM', '8 AM', '9 AM', '10 AM', '11 AM',
    '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM',
  ];
  const hourCounts = new Array(13).fill(0);

  rows.forEach(row => {
    if (!row.checkIn) return;
    const minutes = parseTimeToMinutes(row.checkIn);
    if (minutes === -1) return;
    const hour24 = Math.floor(minutes / 60);
    if (hour24 >= 6 && hour24 <= 18) {
      hourCounts[hour24 - 6]++;
    }
  });

  const peakData = hourLabels.map((label, i) => ({ hour: label, count: hourCounts[i] }));

  return (
    <section className="analytics-section">
      <div className="analytics-section__charts">
        <div className="analytics-chart-card">
          <h3>Daily Attendance — {MONTH_NAMES[month]} {year}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#c2410c" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="analytics-chart-card">
          <h3>Check-In Times — {MONTH_NAMES[month]} {year}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={peakData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#ea580c" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
