import { useEffect, useMemo, useState, useCallback } from 'react';
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
  generateAttendanceCSV,
  getPresentRecords,
  getPaginatedAttendanceRecords,
  subscribeToAttendanceRecords,
} from '../services/attendanceService';
import { changeAdminPassword, sendSupervisorPasswordReset } from '../services/authService';
import { getCurrentMonthYear, getTodayDateString } from '../utils/dateUtils';
import { useChangePassword } from '../layouts/MainLayout';
import { getSessionSupervisorName, getSessionSupervisorDepartment } from '../services/storageService';
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
  const [departmentFilter, setDepartmentFilter] = useState(getSessionSupervisorDepartment() || '');
  const [cutoffTime, setCutoffTime] = useState(DEFAULT_CUTOFF_TIME);
  const [stats, setStats] = useState({ totalEmployees: 0, presentToday: 0, absentToday: 0 });
  const [tableRows, setTableRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, totalRecords: 0, pageSize: 50 });
  const supervisorName = getSessionSupervisorName();
  const { showChangePassword, setShowChangePassword } = useChangePassword();

  useEffect(() => {
    // Subscribe to live Firestore updates — rebuilds table whenever any attendance doc changes
    setLoading(true);

    const unsubscribe = subscribeToAttendanceRecords(async () => {
      try {
        const [statsData, paginatedData] = await Promise.all([
          getDashboardStats(departmentFilter),
          getPaginatedAttendanceRecords(currentPage, 50, search, departmentFilter),
        ]);
        setStats(statsData);
        setTableRows(paginatedData.records);
        setPagination({
          totalPages: paginatedData.totalPages,
          totalRecords: paginatedData.totalRecords,
          pageSize: paginatedData.pageSize,
        });
      } catch (error) {
        console.error('Error loading dashboard:', error);
        setStats({ totalEmployees: 0, presentToday: 0, absentToday: 0 });
        setTableRows([]);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [month, year, search, departmentFilter, currentPage]);

  const presentRows = tableRows.filter((r) => r.status === 'Present');
  
  // Reset to page 1 when search or department filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, departmentFilter]);

  const filteredRows = useMemo(() => {
    let rows = tableRows;
    if (departmentFilter) {
      rows = rows.filter(r => r.department === departmentFilter);
    }
    return rows;
  }, [tableRows, departmentFilter]);

  const handleChangePassword = async (oldPassword, newPassword) => {
    // With Firebase Auth, password changes go through email reset.
    // Keeping this wired to the legacy modal for now — it will return
    // an informative message.
    return await changeAdminPassword(oldPassword, newPassword);
  };

  const handleDownloadReport = async (format = 'word') => {
    const presentRecords = await getPresentRecords(month, year);
    if (format === 'csv') {
      generateAttendanceCSV(presentRecords, month, year);
    } else {
      generateAttendanceReport(presentRecords, month, year);
    }
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
        <p className="app-layout__subtitle" style={{ marginTop: '0.35rem' }}>
          {departmentFilter ? `Assigned department: ${departmentFilter}` : 'No department assigned'}
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
        <div className="report-action-bar__actions">
          <button
            type="button"
            className="btn btn--download"
            onClick={() => handleDownloadReport('word')}
          >
            <span>📥</span> Word
          </button>
          <button
            type="button"
            className="btn btn--download"
            onClick={() => handleDownloadReport('csv')}
          >
            <span>📊</span> CSV
          </button>
        </div>
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
          <div className="department-selector">
            <span className="department-pill">Department: {departmentFilter || 'All'}</span>
          </div>
        </div>
        <div style={{ padding: '0 1.5rem 1rem' }}>
          <SearchBar value={search} onChange={setSearch} />
        </div>
        <AttendanceTable
          rows={filteredRows}
          statusFilter={statusFilter || null}
          cutoffTime={cutoffTime}
          onRowClick={(phone) => navigate(`/supervisor/attachee/${phone}`)}
        />
        {pagination.totalPages > 1 && (
          <div className="pagination-controls">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span>Page {currentPage} of {pagination.totalPages} ({pagination.totalRecords} total)</span>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={currentPage === pagination.totalPages}
            >
              Next
            </button>
          </div>
        )}
      </section>

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        onChangePassword={handleChangePassword}
      />
    </>
  );
}
