import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AttendanceTable from '../components/AttendanceTable';
import AnalyticsSection from '../components/AnalyticsSection';
import DashboardCard from '../components/DashboardCard';
import SearchBar from '../components/SearchBar';
import LoadingSpinner from '../components/LoadingSpinner';
import ChangePasswordModal from '../components/ChangePasswordModal';
import {
  buildMonthlyAttendanceTable,
  getDashboardStats,
  generateAttendanceReport,
  getPresentRecords,
} from '../services/attendanceService';
import { changeAdminPassword } from '../services/authService';
import { getCurrentMonthYear, getTodayDateString } from '../utils/dateUtils';
import { useChangePassword } from '../layouts/MainLayout';
import { getSessionSupervisorName } from '../services/storageService';
import { DEFAULT_CUTOFF_TIME } from '../data/constants';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CUTOFF_OPTIONS = [
  '07:00 AM', '07:30 AM', '08:00 AM', '08:30 AM',
  '09:00 AM', '09:30 AM', '10:00 AM',
];

export default function SupervisorDashboard() {
  const { month, year } = getCurrentMonthYear();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Present');
  const [cutoffTime, setCutoffTime] = useState(DEFAULT_CUTOFF_TIME);
  const [stats, setStats] = useState({ totalEmployees: 0, presentToday: 0, absentToday: 0 });
  const [tableRows, setTableRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const supervisorName = getSessionSupervisorName();
  const { showChangePassword, setShowChangePassword } = useChangePassword();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [statsData, rowsData] = await Promise.all([
          getDashboardStats(),
          buildMonthlyAttendanceTable(month, year, search, cutoffTime),
        ]);
        setStats(statsData);
        setTableRows(rowsData);
      } catch (error) {
        console.error('Error loading dashboard:', error);
        setStats({ totalEmployees: 0, presentToday: 0, absentToday: 0 });
        setTableRows([]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [month, year, search, cutoffTime]);

  const presentRows = tableRows.filter((r) => r.status === 'Present');

  const handleChangePassword = async (oldPassword, newPassword) => {
    return await changeAdminPassword(oldPassword, newPassword);
  };

  const handleDownloadReport = async () => {
    const presentRecords = await getPresentRecords(month, year);
    generateAttendanceReport(presentRecords, month, year);
  };

  if (loading) {
    return <LoadingSpinner dark label="Loading dashboard..." />;
  }

  return (
    <>
      <header className="app-layout__header">
        <h1 className="app-layout__title">Supervisor Dashboard</h1>
        <p className="app-layout__subtitle">
          Welcome, {supervisorName} · Monitor team attendance and monthly records
        </p>
      </header>

      <div className="dashboard-cards">
        <DashboardCard
          label="Total Attachees"
          value={stats.totalEmployees}
          variant="primary"
        />
        <DashboardCard
          label="Present Today"
          value={stats.presentToday}
          variant="success"
        />
      </div>

      <div className="report-action-bar">
        <div className="report-action-bar__info">
          <span className="report-action-bar__icon">📄</span>
          <div>
            <p className="report-action-bar__title">Monthly Attendance Report</p>
            <p className="report-action-bar__subtitle">{MONTH_NAMES[month]} {year} · {presentRows.length} record(s)</p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn--download"
          onClick={handleDownloadReport}
        >
          <span>📥</span> Download Report
        </button>
      </div>

      <AnalyticsSection rows={tableRows} month={month} year={year} />

      <section className="table-section">
        <div className="table-section__header">
          <div>
            <h2>
              Monthly Attendance — {MONTH_NAMES[month]} {year}
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              {presentRows.length} check-in record(s) this month
            </p>
          </div>
          <div className="table-filters">
            <button
              type="button"
              className={`filter-chip ${statusFilter === '' ? 'filter-chip--active' : ''}`}
              onClick={() => setStatusFilter('')}
            >
              All
            </button>
            <button
              type="button"
              className={`filter-chip ${statusFilter === 'Present' ? 'filter-chip--active' : ''}`}
              onClick={() => setStatusFilter('Present')}
            >
              Present
            </button>
          </div>
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
        </div>
        <div style={{ padding: '0 1.5rem 1rem' }}>
          <SearchBar value={search} onChange={setSearch} />
        </div>
        <AttendanceTable
          rows={tableRows}
          statusFilter={statusFilter || null}
          cutoffTime={cutoffTime}
          onRowClick={(phone) => navigate(`/supervisor/attachee/${phone}`)}
        />
      </section>

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        onChangePassword={handleChangePassword}
      />
    </>
  );
}
