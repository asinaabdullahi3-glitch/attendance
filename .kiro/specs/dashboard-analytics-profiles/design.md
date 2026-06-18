# Technical Design Document

## Feature: Dashboard Analytics & Attachee Profiles

---

## Overview

This design adds three supervisor-facing capabilities to the existing React + Firebase SPA:

1. **Late Check-In Detection** — a `classifyPunctuality()` pure function and amber "Late" badge in `AttendanceTable`, driven by a configurable CutoffTime selector on the Dashboard.
2. **Individual Attachee Profile Page** — a new `/supervisor/attachee/:phone` route showing full attendance history, punctuality rate, average hours worked, and a monthly PresenceCalendar.
3. **Attendance Analytics Charts** — a Recharts-powered AnalyticsSection on the Dashboard with a DailyTurnoutChart and a PeakCheckInChart, derived from already-fetched data.

No new Firestore collections or schema changes are required. The only new dependency is `recharts`.

---

## Architecture

```
src/
├── data/
│   └── constants.js            ← add DEFAULT_CUTOFF_TIME
├── services/
│   └── attendanceService.js    ← add classifyPunctuality(), getAttendanceByPhone()
├── components/
│   ├── AttendanceTable.jsx     ← add cutoffTime prop, Late badge, clickable name
│   ├── PresenceCalendar.jsx    ← NEW: monthly day-grid component
│   └── AnalyticsSection.jsx   ← NEW: DailyTurnoutChart + PeakCheckInChart
├── pages/
│   ├── SupervisorDashboard.jsx ← add CutoffTime selector + AnalyticsSection
│   └── AttendeeProfile.jsx     ← NEW: profile page
└── App.jsx                     ← add /supervisor/attachee/:phone route
```

---

## Component & Module Designs

### 1. `src/data/constants.js` — Add DEFAULT_CUTOFF_TIME

Add one export:

```js
export const DEFAULT_CUTOFF_TIME = '09:00 AM';
```

No other changes to this file.

---

### 2. `src/services/attendanceService.js` — Add `classifyPunctuality` and `getAttendanceByPhone`

#### `classifyPunctuality(checkInTime, cutoffTime)`

Pure function, exported. No Firestore calls.

```
Input:  checkInTime  — string like "09:23 AM" or null/undefined/""
        cutoffTime   — string like "09:00 AM" or null/undefined/""
Output: "On Time" | "Late" | "Absent"
```

Algorithm:
1. If `checkInTime` is falsy → return `"Absent"`.
2. If `cutoffTime` is falsy → use `DEFAULT_CUTOFF_TIME`.
3. Parse both strings to minutes-of-day using a helper `parseTimeToMinutes(timeStr)`:
   - Split on space: `["09:23", "AM"]`
   - Split hours/minutes on `:`: `[9, 23]`
   - Convert to 24h: if PM and hours ≠ 12, add 600; if AM and hours === 12, set to 0.
   - Return `hours * 60 + minutes`.
4. If `checkInMinutes <= cutoffMinutes` → return `"On Time"`.
5. Otherwise → return `"Late"`.

#### `getAttendanceByPhone(phone)`

New async export. Queries Firestore for all attendance records for a given phone (no date filter), sorted by date descending.

```js
export async function getAttendanceByPhone(phone) {
  const q = query(
    collection(db, ATTENDANCE_COLLECTION),
    where('phone', '==', phone)
  );
  const snap = await getDocs(q);
  const records = snap.docs.map(d => d.data());
  return records.sort((a, b) => b.date.localeCompare(a.date));
}
```

#### `buildMonthlyAttendanceTable` — add `punctuality` field

Pass `cutoffTime` as an optional third argument (default `DEFAULT_CUTOFF_TIME`). For each row pushed into `rows[]`, add:

```js
punctuality: classifyPunctuality(record.checkIn, cutoffTime),
```

Signature change: `buildMonthlyAttendanceTable(month, year, searchQuery = '', cutoffTime = DEFAULT_CUTOFF_TIME)`

---

### 3. `src/components/AttendanceTable.jsx` — Late Badge + Clickable Name

#### Props change

```js
// Before
AttendanceTable({ rows, statusFilter })

// After
AttendanceTable({ rows, statusFilter, cutoffTime, onRowClick })
```

- `cutoffTime` — string, used to derive punctuality when not already on the row (fallback; in practice rows already have the `punctuality` field).
- `onRowClick(phone)` — optional callback; when provided, the name cell becomes a clickable `<button>`.

#### Name cell

```jsx
<td>
  {onRowClick ? (
    <button
      className="table-name-link"
      onClick={() => onRowClick(row.phone)}
    >
      {row.employeeName}
    </button>
  ) : (
    row.employeeName
  )}
</td>
```

#### Status column

Render the existing `status-badge--present` badge, then conditionally render a `status-badge--late` badge:

```jsx
<td>
  <span className={`status-badge status-badge--${row.status === 'Present' ? 'present' : 'absent'}`}>
    {row.status}
  </span>
  {row.punctuality === 'Late' && (
    <span className="status-badge status-badge--late" style={{ marginLeft: '0.4rem' }}>
      Late
    </span>
  )}
</td>
```

#### New CSS classes (add to `components.css`)

```css
.status-badge--late {
  background: #fef3c7;
  color: #92400e;
}

.table-name-link {
  background: none;
  border: none;
  color: var(--color-primary);
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  font-size: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.table-name-link:hover {
  color: var(--color-primary-hover);
}
```

---

### 4. `src/components/AnalyticsSection.jsx` — NEW

Receives `rows` (the full `tableRows` array already fetched by the Dashboard) and `month`/`year` for the label. Derives all chart data client-side.

#### Props

```js
AnalyticsSection({ rows, month, year })
```

#### DailyTurnoutChart data derivation

```js
// Build a map: dayNumber -> Set of phones
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
```

#### PeakCheckInChart data derivation

```js
// Hours 6–18 (6 AM to 6 PM)
const hourLabels = ['6 AM','7 AM','8 AM','9 AM','10 AM','11 AM',
                    '12 PM','1 PM','2 PM','3 PM','4 PM','5 PM','6 PM'];
const hourCounts = new Array(13).fill(0);

rows.forEach(row => {
  if (!row.checkIn) return;
  const minutes = parseTimeToMinutes(row.checkIn); // reuse helper
  const hour24 = Math.floor(minutes / 60);
  if (hour24 >= 6 && hour24 <= 18) {
    hourCounts[hour24 - 6]++;
  }
});

const peakData = hourLabels.map((label, i) => ({ hour: label, count: hourCounts[i] }));
```

> `parseTimeToMinutes` is not exported from `attendanceService`; duplicate it locally in this component or extract it to `src/utils/dateUtils.js`.

#### JSX structure

```jsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function AnalyticsSection({ rows, month, year }) {
  if (!rows || rows.length === 0) {
    return (
      <section className="analytics-section">
        <p className="analytics-section__empty">No data available for this month</p>
      </section>
    );
  }

  // ... derive dailyData and peakData ...

  return (
    <section className="analytics-section">
      <div className="analytics-section__charts">
        <div className="analytics-chart-card">
          <h3>Daily Attendance — {MONTH_NAMES[month]} {year}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" label={{ value: 'Day', position: 'insideBottom', offset: -4 }} />
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
```

#### New CSS classes (add to `components.css`)

```css
.analytics-section {
  margin-bottom: 2rem;
}

.analytics-section__empty {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 2rem;
  text-align: center;
  color: var(--color-text-muted);
}

.analytics-section__charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.25rem;
}

.analytics-chart-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1.25rem 1.5rem 1.5rem;
  box-shadow: var(--shadow-sm);
}

.analytics-chart-card h3 {
  font-size: 0.95rem;
  color: var(--color-text-muted);
  margin-bottom: 1rem;
  font-weight: 600;
}
```

---

### 5. `src/components/PresenceCalendar.jsx` — NEW

Renders a 7-column grid of day cells for the current month.

#### Props

```js
PresenceCalendar({ records, month, year, cutoffTime })
```

- `records` — array of raw Firestore attendance records for this attachee (all time, but we only render the current month's days).
- `month`, `year` — current month/year (0-indexed month).
- `cutoffTime` — used to classify each present day.

#### Logic

```js
const today = new Date();
const daysInMonth = new Date(year, month + 1, 0).getDate();
const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun

// Build lookup: dateString -> record
const recordMap = {};
records.forEach(r => { recordMap[r.date] = r; });

// Produce day cells
const cells = [];
// Leading empty cells for first-week offset
for (let i = 0; i < firstDayOfWeek; i++) cells.push({ empty: true });
for (let d = 1; d <= daysInMonth; d++) {
  const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const cellDate = new Date(year, month, d);
  const isFuture = cellDate > today;
  const isWeekend = cellDate.getDay() === 0 || cellDate.getDay() === 6;
  const record = recordMap[dateStr];
  
  let color = 'grey'; // default: future or weekend
  if (!isFuture && !isWeekend) {
    if (record?.checkIn) {
      const p = classifyPunctuality(record.checkIn, cutoffTime);
      color = p === 'Late' ? 'amber' : 'green';
    } else {
      color = 'red';
    }
  }
  cells.push({ day: d, color, dateStr });
}
```

#### JSX

```jsx
<div className="presence-calendar">
  {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
    <div key={d} className="presence-calendar__header">{d}</div>
  ))}
  {cells.map((cell, i) =>
    cell.empty ? (
      <div key={`empty-${i}`} className="presence-calendar__cell presence-calendar__cell--empty" />
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
```

#### New CSS classes

```css
.presence-calendar {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-top: 1rem;
}

.presence-calendar__header {
  text-align: center;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-text-muted);
  padding: 0.25rem 0;
}

.presence-calendar__cell {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 500;
}

.presence-calendar__cell--empty {
  background: transparent;
}

.presence-calendar__cell--green {
  background: #dcfce7;
  color: #166534;
}

.presence-calendar__cell--amber {
  background: #fef3c7;
  color: #92400e;
}

.presence-calendar__cell--red {
  background: #fee2e2;
  color: #991b1b;
}

.presence-calendar__cell--grey {
  background: rgba(255,255,255,0.05);
  color: var(--color-text-muted);
  opacity: 0.5;
}
```

---

### 6. `src/pages/AttendeeProfile.jsx` — NEW

Route: `/supervisor/attachee/:phone`

#### Data fetching

```js
const { phone } = useParams();
const navigate = useNavigate();

useEffect(() => {
  let cancelled = false;
  setLoading(true);
  setEmployee(null);
  setRecords([]);

  Promise.all([
    findEmployeeByPhone(phone),
    getAttendanceByPhone(phone),
  ]).then(([emp, recs]) => {
    if (cancelled) return;
    setEmployee(emp);
    setRecords(recs);
    setLoading(false);
  });

  return () => { cancelled = true; };
}, [phone]);
```

#### Statistics computation (derived values, no state)

```js
const { month, year } = getCurrentMonthYear();

const totalPresentDays = records.filter(r => r.checkIn).length;

const onTimeCheckIns = records.filter(
  r => r.checkIn && classifyPunctuality(r.checkIn, DEFAULT_CUTOFF_TIME) === 'On Time'
).length;

const punctualityRate = totalPresentDays === 0
  ? '0.0%'
  : `${(Math.round((onTimeCheckIns / totalPresentDays) * 1000) / 10).toFixed(1)}%`;

const completedRecords = records.filter(r => r.checkIn && r.checkOut && r.checkOut !== '—');
const avgHours = completedRecords.length === 0
  ? (totalPresentDays === 0 ? 'N/A' : 'N/A')
  : (() => {
      const total = completedRecords.reduce((sum, r) => {
        const inMin = parseTimeToMinutes(r.checkIn);
        const outMin = parseTimeToMinutes(r.checkOut);
        return sum + Math.max(0, outMin - inMin) / 60;
      }, 0);
      return (total / completedRecords.length).toFixed(1);
    })();
```

#### JSX layout

```
← Back to Dashboard

[Header: fullName, department, email]

[Stat cards row]
  - Total Days Present
  - Punctuality Rate
  - Avg Hours Worked

[PresenceCalendar — current month]

[Attendance History table]
  Date | Check In | Check Out | Punctuality
```

#### Not-found state

If `employee` is null after loading:

```jsx
<>
  <p className="profile-not-found">Attachee not found.</p>
  <Link to="/supervisor/dashboard">← Back to Dashboard</Link>
</>
```

#### New CSS classes

```css
.profile-header {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.profile-header__name {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-text);
}

.profile-header__meta {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  margin-top: 0.25rem;
}

.profile-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.profile-section {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1.25rem 1.5rem;
  margin-bottom: 1.5rem;
}

.profile-section h2 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.75rem;
}

.profile-back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--color-primary);
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  margin-bottom: 1.25rem;
}

.profile-back-link:hover {
  text-decoration: underline;
}

.profile-not-found {
  color: var(--color-text-muted);
  margin-bottom: 1rem;
}
```

---

### 7. `src/pages/SupervisorDashboard.jsx` — CutoffTime Selector + AnalyticsSection

#### State addition

```js
const [cutoffTime, setCutoffTime] = useState(DEFAULT_CUTOFF_TIME);
```

#### Pass cutoffTime to buildMonthlyAttendanceTable

```js
buildMonthlyAttendanceTable(month, year, search, cutoffTime)
```

Re-run the effect when `cutoffTime` changes (add to dependency array).

#### CutoffTime selector JSX (add inside the `table-section__header`)

```jsx
<div className="cutoff-selector">
  <label htmlFor="cutoff-select" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginRight: '0.5rem' }}>
    Late after:
  </label>
  <select
    id="cutoff-select"
    className="cutoff-select"
    value={cutoffTime}
    onChange={e => setCutoffTime(e.target.value)}
  >
    {CUTOFF_OPTIONS.map(opt => (
      <option key={opt} value={opt}>{opt}</option>
    ))}
  </select>
</div>
```

Where `CUTOFF_OPTIONS` is a constant array at the top of the file:

```js
const CUTOFF_OPTIONS = [
  '07:00 AM','07:30 AM','08:00 AM','08:30 AM',
  '09:00 AM','09:30 AM','10:00 AM',
];
```

#### Pass onRowClick to AttendanceTable

```jsx
<AttendanceTable
  rows={tableRows}
  statusFilter={statusFilter || null}
  cutoffTime={cutoffTime}
  onRowClick={(phone) => navigate(`/supervisor/attachee/${phone}`)}
/>
```

Add `useNavigate` import from `react-router-dom`.

#### AnalyticsSection placement

```jsx
{/* Below dashboard-cards, above table-section */}
<AnalyticsSection rows={tableRows} month={month} year={year} />
```

#### New CSS class (add to `components.css`)

```css
.cutoff-select {
  padding: 0.35rem 0.65rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.85rem;
}
```

---

### 8. `src/App.jsx` — New Route

Add inside the supervisor `<Route element={<MainLayout requiredRole={ROLES.SUPERVISOR} />}>` block:

```jsx
import AttendeeProfile from './pages/AttendeeProfile';

// inside the supervisor route group:
<Route path="/supervisor/attachee/:phone" element={<AttendeeProfile />} />
```

---

## Utility: `parseTimeToMinutes`

This helper is needed in both `attendanceService.js` (for `classifyPunctuality`) and `AnalyticsSection.jsx` (for PeakCheckInChart bucketing). Extract it to `src/utils/dateUtils.js`:

```js
/**
 * Parse a locale time string ("09:23 AM") to minutes since midnight.
 * Returns -1 if the string cannot be parsed.
 */
export function parseTimeToMinutes(timeStr) {
  if (!timeStr) return -1;
  const parts = timeStr.trim().split(' ');
  if (parts.length !== 2) return -1;
  const [hStr, mStr] = parts[0].split(':');
  let hours = parseInt(hStr, 10);
  const minutes = parseInt(mStr, 10);
  const period = parts[1].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}
```

---

## Dependency: `recharts`

Run before implementation:

```bash
npm install recharts@2.12.7
```

Recharts v2 is stable, well-maintained, and compatible with React 19.

---

## Implementation Order (Tasks)

1. Install `recharts` and add `parseTimeToMinutes` to `dateUtils.js`
2. Add `DEFAULT_CUTOFF_TIME` to `constants.js`
3. Add `classifyPunctuality` and `getAttendanceByPhone` to `attendanceService.js`; update `buildMonthlyAttendanceTable` signature
4. Update `AttendanceTable.jsx` (Late badge, clickable name, new CSS)
5. Create `AnalyticsSection.jsx` and add its CSS
6. Create `PresenceCalendar.jsx` and add its CSS
7. Create `AttendeeProfile.jsx` and add its CSS
8. Update `SupervisorDashboard.jsx` (CutoffTime selector, AnalyticsSection, onRowClick)
9. Update `App.jsx` (new route)
