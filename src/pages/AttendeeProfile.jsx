import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { findEmployeeByPhone } from '../services/employeeService';
import { getAttendanceByPhone, classifyPunctuality } from '../services/attendanceService';
import { parseTimeToMinutes, getCurrentMonthYear, formatDisplayDate } from '../utils/dateUtils';
import { DEFAULT_CUTOFF_TIME } from '../data/constants';
import LoadingSpinner from '../components/LoadingSpinner';
import DashboardCard from '../components/DashboardCard';
import PresenceCalendar from '../components/PresenceCalendar';

export default function AttendeeProfile() {
  const { phone } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState(null);
  const [records, setRecords] = useState([]);

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

  // Stats computed from records (not stored in state)
  const totalPresentDays = records.filter(r => r.checkIn).length;

  const onTimeCount = records.filter(
    r => r.checkIn && classifyPunctuality(r.checkIn, DEFAULT_CUTOFF_TIME) === 'On Time'
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
            <DashboardCard label="Punctuality Rate" value={punctualityRate} variant="success" />
            <DashboardCard label="Avg Hours Worked" value={avgHours} variant="primary" />
          </div>

          <div className="profile-section">
            <h2>This Month — Presence Calendar</h2>
            <PresenceCalendar records={records} month={month} year={year} cutoffTime={DEFAULT_CUTOFF_TIME} />
          </div>

          <div className="profile-section">
            <h2>Attendance History</h2>
            {records.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>No attendance records found.</p>
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
                    {records.map(r => (
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
