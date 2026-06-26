import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { findEmployeeByPhone } from '../services/employeeService';
import { getAttendanceByPhone, classifyPunctuality } from '../services/attendanceService';
import { parseTimeToMinutes, getCurrentMonthYear, formatDisplayDate, getTodayDateString } from '../utils/dateUtils';
import { DEFAULT_CUTOFF_TIME } from '../data/constants';
import LoadingSpinner from '../components/LoadingSpinner';
import DashboardCard from '../components/DashboardCard';
import PresenceCalendar from '../components/PresenceCalendar';
import SearchBar from '../components/SearchBar';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ─── Not Attending Row Detail ─────────────────────────────────────────────────
function AbsenceDetail({ record }) {
  const [open, setOpen] = useState(false);
  if (!record.notes) return null;
  return (
    <>
      <button
        type="button"
        className="absence-detail__toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {open ? 'Hide note ▲' : 'View note ▼'}
      </button>
      {open && (
        <p className="absence-detail__note">{record.notes}</p>
      )}
    </>
  );
}

// ─── 30-day Trend Chart ───────────────────────────────────────────────────────
function TrendChart({ records }) {
  const today = getTodayDateString();

  // Build last-30-days array
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const rec = records.find((r) => r.date === iso);

    let status = 'future';
    if (iso > today) {
      status = 'future';
    } else if (isWeekend) {
      status = 'weekend';
    } else if (rec?.checkIn) {
      status = classifyPunctuality(rec.checkIn, DEFAULT_CUTOFF_TIME) === 'Late' ? 'late' : 'present';
    } else if (rec?.status === 'not_attending') {
      status = 'absent';
    } else {
      status = 'absent';
    }

    const shortLabel = `${d.getDate()}/${d.getMonth() + 1}`;
    days.push({ iso, label: shortLabel, status, value: status === 'future' || status === 'weekend' ? 0 : 1 });
  }

  const colorMap = {
    present: '#16a34a',
    late: '#f59e0b',
    absent: '#b91c1c',
    weekend: '#374151',
    future: '#1f2937',
  };

  return (
    <ResponsiveContainer width="100%" height={100}>
      <BarChart data={days} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barSize={8}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: '0.65rem', fill: 'var(--color-text-muted)' }}
          tickLine={false}
          axisLine={false}
          interval={4}
        />
        <YAxis hide />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '0.8rem',
                color: 'var(--color-text)',
              }}>
                <p style={{ margin: 0 }}>{d.iso}</p>
                <p style={{ margin: '2px 0 0', fontWeight: 600, color: colorMap[d.status] }}>
                  {d.status === 'weekend' ? 'Weekend' : d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                </p>
              </div>
            );
          }}
        />
        <Bar dataKey="value" radius={[2, 2, 0, 0]}>
          {days.map((d) => (
            <Cell key={d.iso} fill={colorMap[d.status]} opacity={d.status === 'future' ? 0.2 : 0.9} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AttendeeProfile() {
  const { phone } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState(null);
  const [records, setRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

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

  const { month, year } = getCurrentMonthYear();

  // ── Stats ──
  const presentRecords = records.filter((r) => r.checkIn);
  const absentRecords = records.filter((r) => r.status === 'not_attending');
  const totalPresentDays = presentRecords.length;
  const totalAbsentDays = absentRecords.length;

  const onTimeCount = presentRecords.filter(
    (r) => classifyPunctuality(r.checkIn, DEFAULT_CUTOFF_TIME) === 'On Time'
  ).length;
  const lateCount = totalPresentDays - onTimeCount;

  const punctualityRate =
    totalPresentDays === 0 ? '0.0%' : ((onTimeCount / totalPresentDays) * 100).toFixed(1) + '%';

  const totalWorkdays = totalPresentDays + totalAbsentDays;
  const attendanceRate =
    totalWorkdays === 0 ? 'N/A' : ((totalPresentDays / totalWorkdays) * 100).toFixed(1) + '%';

  const completedRecords = presentRecords.filter((r) => r.checkIn && r.checkOut && r.checkOut !== '—');
  let avgHours = 'N/A';
  if (completedRecords.length > 0) {
    const total = completedRecords.reduce((sum, r) => {
      const inMin = parseTimeToMinutes(r.checkIn);
      const outMin = parseTimeToMinutes(r.checkOut);
      return sum + Math.max(0, (outMin - inMin) / 60);
    }, 0);
    avgHours = (total / completedRecords.length).toFixed(1) + ' hrs';
  }

  // ── Filtered records for history table ──
  const filteredRecords = useMemo(() => {
    let filtered = records;

    if (statusFilter === 'present') {
      filtered = filtered.filter((r) => r.checkIn);
    } else if (statusFilter === 'absent') {
      filtered = filtered.filter((r) => !r.checkIn && r.status !== 'not_attending');
    } else if (statusFilter === 'not_attending') {
      filtered = filtered.filter((r) => r.status === 'not_attending');
    } else if (statusFilter === 'late') {
      filtered = filtered.filter(
        (r) => r.checkIn && classifyPunctuality(r.checkIn, DEFAULT_CUTOFF_TIME) === 'Late'
      );
    } else if (statusFilter === 'ontime') {
      filtered = filtered.filter(
        (r) => r.checkIn && classifyPunctuality(r.checkIn, DEFAULT_CUTOFF_TIME) === 'On Time'
      );
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.date.toLowerCase().includes(q) ||
          (r.checkIn && r.checkIn.toLowerCase().includes(q)) ||
          (r.reasonCategory && r.reasonCategory.toLowerCase().includes(q)) ||
          (r.notes && r.notes.toLowerCase().includes(q))
      );
    }

    return filtered;
  }, [records, searchQuery, statusFilter]);

  // ── render ──
  return (
    <>
      <Link to="/supervisor/dashboard" className="profile-back-link">← Back to Dashboard</Link>

      {loading && <LoadingSpinner dark label="Loading profile…" />}

      {!loading && !employee && (
        <p className="profile-not-found">Attachee not found.</p>
      )}

      {!loading && employee && (
        <>
          {/* ── Header ── */}
          <div className="profile-header">
            <div className="profile-header__avatar" aria-hidden="true">
              {employee.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="profile-header__name">{employee.fullName}</div>
              <div className="profile-header__meta">
                {employee.department}
                {employee.email && <> · <a href={`mailto:${employee.email}`}>{employee.email}</a></>}
                {employee.registeredAt && (
                  <> · Joined {formatDisplayDate(employee.registeredAt.slice(0, 10))}</>
                )}
              </div>
            </div>
          </div>

          {/* ── Stats ── */}
          <div className="profile-stats">
            <DashboardCard label="Attendance Rate"   value={attendanceRate}   variant="primary" />
            <DashboardCard label="Days Present"      value={totalPresentDays} variant="success" />
            <DashboardCard label="On Time"           value={onTimeCount}      variant="success" />
            <DashboardCard label="Late"              value={lateCount}        variant="warning" />
            <DashboardCard label="Absent Days"       value={totalAbsentDays}  variant="danger" />
            <DashboardCard label="Avg Hours Worked"  value={avgHours}         variant="primary" />
          </div>

          {/* ── 30-day trend ── */}
          <div className="profile-section">
            <h2>30-Day Attendance Trend</h2>
            <div className="profile-chart-legend">
              <span className="legend-dot legend-dot--present" /> Present
              <span className="legend-dot legend-dot--late" /> Late
              <span className="legend-dot legend-dot--absent" /> Absent
            </div>
            <TrendChart records={records} />
          </div>

          {/* ── Calendar ── */}
          <div className="profile-section">
            <h2>This Month — {MONTH_NAMES[month]} {year}</h2>
            <PresenceCalendar records={records} month={month} year={year} cutoffTime={DEFAULT_CUTOFF_TIME} />
          </div>

          {/* ── Attendance History ── */}
          <div className="profile-section">
            <h2>Attendance History</h2>

            <div className="table-section__header" style={{ border: 'none', padding: '0 0 1rem' }}>
              <div className="table-filters">
                {['all','present','late','ontime','absent','not_attending'].map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`filter-chip ${statusFilter === f ? 'filter-chip--active' : ''}`}
                    onClick={() => setStatusFilter(f)}
                  >
                    {f === 'all' ? 'All' :
                     f === 'not_attending' ? 'Not Attending' :
                     f.charAt(0).toUpperCase() + f.slice(1).replace('ontime', 'On Time')}
                  </button>
                ))}
              </div>
            </div>

            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by date, time, or reason…"
            />

            {filteredRecords.length === 0 ? (
              <p className="profile-empty">
                {records.length === 0 ? 'No attendance records yet.' : 'No records match your search.'}
              </p>
            ) : (
              <div className="table-wrapper">
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Check-In</th>
                      <th>Check-Out</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((r) => (
                      <tr
                        key={r.date}
                        className={r.status === 'not_attending' ? 'row--not-attending' : ''}
                      >
                        <td>{formatDisplayDate(r.date)}</td>
                        <td>{r.checkIn || '—'}</td>
                        <td>{r.checkOut || '—'}</td>
                        <td>
                          {r.status === 'not_attending' ? (
                            <div>
                              <span className="status-badge status-badge--not-attending">
                                Not Attending · {r.reasonCategory || 'Other'}
                              </span>
                              <AbsenceDetail record={r} />
                            </div>
                          ) : r.checkIn ? (
                            <span
                              className={`status-badge status-badge--${
                                classifyPunctuality(r.checkIn, DEFAULT_CUTOFF_TIME) === 'Late'
                                  ? 'late'
                                  : 'present'
                              }`}
                            >
                              {classifyPunctuality(r.checkIn, DEFAULT_CUTOFF_TIME)}
                            </span>
                          ) : (
                            <span className="status-badge status-badge--absent">Absent</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
