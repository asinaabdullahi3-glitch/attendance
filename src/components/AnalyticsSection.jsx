import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { classifyPunctuality } from '../services/attendanceService';
import { DEFAULT_CUTOFF_TIME } from '../data/constants';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Custom label renderer — shows percentage inside the slice
function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      style={{ fontSize: '0.78rem', fontWeight: 700 }}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export default function AnalyticsSection({ rows, month, year }) {
  if (!rows || rows.length === 0) {
    return (
      <section className="analytics-section">
        <p className="analytics-section__empty">No data available for this month</p>
      </section>
    );
  }

  // ── Daily breakdown ──────────────────────────────────────────────
  // Group distinct attendees by date
  const dayMap = {};
  rows.forEach(row => {
    if (!dayMap[row.date]) dayMap[row.date] = new Set();
    dayMap[row.date].add(row.phone);
  });

  // Sort dates ascending
  const dailyBreakdown = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, phones]) => {
      const [y, m, d] = date.split('-');
      const dayOfWeek = new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).getDay();
      return {
        date,
        label: `${d} ${MONTH_NAMES[parseInt(m) - 1].slice(0, 3)}`,
        dayName: DAY_NAMES[dayOfWeek],
        count: phones.size,
      };
    });

  // ── Pie chart: month punctuality overview ─────────────────────────
  let onTimeCount = 0;
  let lateCount = 0;
  let notAttendingCount = 0;

  rows.forEach(row => {
    if (row.status === 'Not Attending') {
      notAttendingCount++;
    } else {
      const p = classifyPunctuality(row.checkIn, DEFAULT_CUTOFF_TIME);
      if (p === 'On Time') onTimeCount++;
      else if (p === 'Late') lateCount++;
    }
  });

  const pieData = [
    { name: 'On Time',      value: onTimeCount,      color: '#16a34a' },
    { name: 'Late',         value: lateCount,         color: '#f59e0b' },
    { name: 'Not Attending',value: notAttendingCount, color: '#b91c1c' },
  ].filter(d => d.value > 0);

  const totalCheckIns = onTimeCount + lateCount;
  const punctualityPct = totalCheckIns > 0
    ? Math.round((onTimeCount / totalCheckIns) * 100)
    : 0;

  return (
    <section className="analytics-section">
      <div className="analytics-section__grid">

        {/* ── Daily attendance breakdown ── */}
        <div className="analytics-chart-card analytics-chart-card--scroll">
          <h3>Daily Attendance — {MONTH_NAMES[month]} {year}</h3>
          <p className="analytics-chart-card__sub">{dailyBreakdown.length} active day(s) this month</p>
          <div className="daily-breakdown">
            {dailyBreakdown.map(({ date, label, dayName, count }) => (
              <div key={date} className="daily-breakdown__row">
                <div className="daily-breakdown__date">
                  <span className="daily-breakdown__day-name">{dayName}</span>
                  <span className="daily-breakdown__label">{label}</span>
                </div>
                <div className="daily-breakdown__bar-wrap">
                  <div
                    className="daily-breakdown__bar"
                    style={{ width: `${Math.min(100, (count / (rows.length || 1)) * 300)}%` }}
                  />
                </div>
                <span className="daily-breakdown__count">{count} {count === 1 ? 'person' : 'people'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Monthly punctuality pie chart ── */}
        <div className="analytics-chart-card">
          <h3>Monthly Progress — {MONTH_NAMES[month]} {year}</h3>
          <p className="analytics-chart-card__sub">{punctualityPct}% on-time rate · {totalCheckIns} total check-ins</p>

          {pieData.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '1rem' }}>
              No check-in data yet.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  labelLine={false}
                  label={renderCustomLabel}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value} check-in(s)`, name]}
                  contentStyle={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    color: 'var(--color-text)',
                  }}
                />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: 'var(--color-text)', fontSize: '0.85rem' }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}

          {/* Pill summary below pie */}
          <div className="punctuality-pills">
            <span className="punctuality-pill punctuality-pill--on-time">
              ✓ On Time: {onTimeCount}
            </span>
            <span className="punctuality-pill punctuality-pill--late">
              ⚠ Late: {lateCount}
            </span>
            {notAttendingCount > 0 && (
              <span className="punctuality-pill punctuality-pill--absent">
                ✗ Not Attending: {notAttendingCount}
              </span>
            )}
          </div>
        </div>

      </div>
    </section>
  );
}
