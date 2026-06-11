import { useEffect, useMemo, useState } from 'react';
import AttendanceTable from '../components/AttendanceTable';
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

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function SupervisorDashboard() {
  const { month, year } = getCurrentMonthYear();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Present');
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
          buildMonthlyAttendanceTable(month, year, search),
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
  }, [month, year, search]);

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
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleDownloadReport}
          style={{ marginTop: '1rem' }}
        >
          📥 Download Report
        </button>
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
        </div>
        <div style={{ padding: '0 1.5rem 1rem' }}>
          <SearchBar value={search} onChange={setSearch} />
        </div>
        <AttendanceTable rows={tableRows} statusFilter={statusFilter || null} />
      </section>

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        onChangePassword={handleChangePassword}
      />
    </>
  );
}
