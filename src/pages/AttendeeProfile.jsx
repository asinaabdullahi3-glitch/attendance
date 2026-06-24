import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { findEmployeeByPhone } from '../services/employeeService';
import { getAttendanceByPhone, classifyPunctuality } from '../services/attendanceService';
import { parseTimeToMinutes, getCurrentMonthYear, formatDisplayDate } from '../utils/dateUtils';
import { DEFAULT_CUTOFF_TIME } from '../data/constants';
import LoadingSpinner from '../components/LoadingSpinner';
import DashboardCard from '../components/DashboardCard';
import PresenceCalendar from '../components/PresenceCalendar';
import SearchBar from '../components/SearchBar';

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

    return () => {
      cancelled = true;
    };
  }, [phone]);

  const { month, year } = getCurrentMonthYear();

  // Filter records based on search and status
  const filteredRecords = useMemo(() => {
    let filtered = records;
    
    // Apply status filter
    if (statusFilter === 'present') {
      filtered = filtered.filter(r => r.checkIn);
    } else if (statusFilter === 'absent') {
      filtered = filtered.filter(r => !r.checkIn);
    } else if (statusFilter === 'late') {
      filtered = filtered.filter(r => r.checkIn && classifyPunctuality(r.checkIn, DEFAULT_CUTOFF_TIME) === 'Late');
    } else if (statusFilter === 'ontime') {
      filtered = filtered.filter(r => r.checkIn && classifyPunctuality(r.checkIn, DEFAULT_CUTOFF_TIME) === 'On Time');
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.date.toLowerCase().includes(query) ||
        (r.checkIn && r.checkIn.toLowerCase().includes(query)) ||
        (r.checkOut && r.checkOut.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [records, searchQuery, statusFilter]);

  // Stats computed from records (not stored in state)
  const totalPresentDays = records.filter(r => r.checkIn).length;

  const onTimeCount = records.filter(
    r => r.checkIn && classifyPunctuality(r.checkIn, DEFAULT_CUTOFF_TIME) === 'On Time'
  ).length;

  const lateCount = records.filter(
    r => r.checkIn && classifyPunctuality(r.checkIn, DEFAULT_CUTOFF_TIME) === 'Late'
  ).length;

  const punctualityRate =
    totalPresentDays === 0
      ? '0.0%'
      : (onTimeCount / totalPresentDays * 100).toFixed(1) + '%';

  const completedRecords = records.filter(
    r => r.checkIn && r.checkOut && r.checkOut !== '—'
  );

  let avgHours;
  if (completedRecords.length === 0) {
    avgHours = 'N/A';
  } else {
    const total = completedRecords.reduce((sum, r) => {
      const inMin = parseTimeToMinutes(r.checkIn);
      const outMin = parseTimeToMinutes(r.checkOut);
      return sum + Math.max(0, (outMin - inMin) / 60);
    }, 0);
    avgHours = (total / completedRecords.length).toFixed(1) + ' hrs';
  }

  return (
    <>
      <Link to="/supervisor/dashboard" className="profile-back-link">← Back to Dashboard</Link>

      {loading && <LoadingSpinner dark label="Loading profile..." />}

      {!loading && !employee && (
        <>
          <p className="profile-not-found">Attachee not found.</p>
        </>
      )}

      {!loading && employee && (
        <>
          <div className="profile-header">
            <div className="profile-header__name">{employee.fullName}</div>
            <div className="profile-header__meta">{employee.department} · {employee.email}</div>
          </div>

          <div className="profile-stats">
            <DashboardCard label="Total Days Present" value={totalPresentDays} variant="primary" />
            <DashboardCard label="On Time" value={onTimeCount} variant="success" />
            <DashboardCard label="Late" value={lateCount} variant="warning" />
            <DashboardCard label="Punctuality Rate" value={punctualityRate} variant="success" />
            <DashboardCard label="Avg Hours Worked" value={avgHours} variant="primary" />
          </div>

          <div className="profile-section">
            <h2>This Month — Presence Calendar</h2>
            <PresenceCalendar records={records} month={month} year={year} cutoffTime={DEFAULT_CUTOFF_TIME} />
          </div>

          <div className="profile-section">
            <h2>Attendance History</h2>
            <div className="table-section__header">
              <div className="table-filters">
                <button
                  type="button"
                  className={`filter-chip ${statusFilter === 'all' ? 'filter-chip--active' : ''}`}
                  onClick={() => setStatusFilter('all')}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`filter-chip ${statusFilter === 'present' ? 'filter-chip--active' : ''}`}
                  onClick={() => setStatusFilter('present')}
                >
                  Present
                </button>
                <button
                  type="button"
                  className={`filter-chip ${statusFilter === 'absent' ? 'filter-chip--active' : ''}`}
                  onClick={() => setStatusFilter('absent')}
                >
                  Absent
                </button>
                <button
                  type="button"
                  className={`filter-chip ${statusFilter === 'ontime' ? 'filter-chip--active' : ''}`}
                  onClick={() => setStatusFilter('ontime')}
                >
                  On Time
                </button>
                <button
                  type="button"
                  className={`filter-chip ${statusFilter === 'late' ? 'filter-chip--active' : ''}`}
                  onClick={() => setStatusFilter('late')}
                >
                  Late
                </button>
              </div>
            </div>
            <div style={{ padding: '0 0 1rem' }}>
              <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by date, check-in, or check-out time" />
            </div>
            {filteredRecords.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                {records.length === 0 ? 'No attendance records found.' : 'No records match your search.'}
              </p>
            ) : (
              <div className="table-wrapper">
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Check-In</th>
                      <th>Check-Out</th>
                      <th>Punctuality</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map(r => (
                      <tr key={r.date}>
                        <td>{formatDisplayDate(r.date)}</td>
                        <td>{r.checkIn || '—'}</td>
                        <td>{r.checkOut || '—'}</td>
                        <td>
                          {r.checkIn ? (
                            <span className={`status-badge status-badge--${classifyPunctuality(r.checkIn, DEFAULT_CUTOFF_TIME) === 'Late' ? 'late' : 'present'}`}>
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
