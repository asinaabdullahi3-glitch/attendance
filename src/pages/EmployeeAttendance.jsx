import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '../components/Alert';
import FormField from '../components/FormField';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  checkIn,
  checkOut,
  getTodayRecord,
  markNotAttending,
} from '../services/attendanceService';
import { findEmployeeByIdentifier } from '../services/employeeService';
import {
  getSessionPhone,
  setSessionPhone,
} from '../services/storageService';
import { checkLocationPermission } from '../services/locationService';
import { formatPhoneDisplay } from '../utils/phoneUtils';
import { delay, formatDisplayDate, getTodayDateString } from '../utils/dateUtils';
import { validateIdentifier } from '../utils/validation';

const REASON_CATEGORIES = [
  'Sick',
  'Personal Emergency',
  'Transport Issue',
  'Family Matter',
  'Other',
];

// ─── Not Attending Dialog ─────────────────────────────────────────────────────
function NotAttendingDialog({ onConfirm, onCancel, loading }) {
  const [reasonCategory, setReasonCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!reasonCategory) errs.reasonCategory = 'Please select a reason.';
    if (!notes.trim()) errs.notes = 'Please add a brief note.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onConfirm(reasonCategory, notes.trim());
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content not-attending-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Mark as Not Attending</h2>
          <button type="button" className="modal-close" onClick={onCancel} aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <p className="not-attending-dialog__hint">
            Let your supervisor know why you won't be in today.
          </p>

          <div className="form-field">
            <label htmlFor="reason-category">Reason Category *</label>
            <select
              id="reason-category"
              value={reasonCategory}
              onChange={(e) => { setReasonCategory(e.target.value); setErrors((p) => ({ ...p, reasonCategory: '' })); }}
              className={errors.reasonCategory ? 'error' : ''}
              disabled={loading}
            >
              <option value="">Select a reason…</option>
              {REASON_CATEGORIES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {errors.reasonCategory && <p className="form-field__error">{errors.reasonCategory}</p>}
          </div>

          <div className="form-field">
            <label htmlFor="absence-notes">Notes *</label>
            <textarea
              id="absence-notes"
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setErrors((p) => ({ ...p, notes: '' })); }}
              placeholder="Briefly describe your situation…"
              rows={3}
              className={`attendance-textarea${errors.notes ? ' error' : ''}`}
              disabled={loading}
              required
            />
            {errors.notes && <p className="form-field__error">{errors.notes}</p>}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn--absent btn--lg" disabled={loading}>
              {loading ? 'Submitting…' : 'Submit Absence'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Status Card ──────────────────────────────────────────────────────────────
function StatusCard({ label, value, accent }) {
  return (
    <div className={`attendance-status-card${accent ? ` attendance-status-card--${accent}` : ''}`}>
      <span className="attendance-status-card__label">{label}</span>
      <strong className="attendance-status-card__value">{value}</strong>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EmployeeAttendance() {
  const [identifier, setIdentifier] = useState('');
  const [employee, setEmployee] = useState(null);
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [locationError, setLocationError] = useState('');
  const [checkingLocation, setCheckingLocation] = useState(true);
  const [showNotAttendingDialog, setShowNotAttendingDialog] = useState(false);

  const refreshRecord = async (phone) => {
    const record = await getTodayRecord(phone);
    setTodayRecord(record);
  };

  useEffect(() => {
    const checkLocation = async () => {
      const locationResult = await checkLocationPermission();
      setCheckingLocation(false);

      if (!locationResult.allowed) {
        setLocationError(
          locationResult.error ||
          'Your IP address is not in the allowed hub network range. Please connect to the office WiFi network.'
        );
        return;
      }

      const savedPhone = getSessionPhone();
      if (savedPhone) {
        const emp = await findEmployeeByIdentifier(savedPhone);
        if (emp) {
          setEmployee(emp);
          setIdentifier(emp.fullName);
          refreshRecord(emp.phone);
        }
      }
    };
    checkLocation();
  }, []);

  const handleLookup = async (e) => {
    e.preventDefault();
    const idError = validateIdentifier(identifier);
    if (idError) { setError(idError); return; }

    setLoading(true);
    setError('');
    setSuccess('');
    await delay(500);

    const found = await findEmployeeByIdentifier(identifier);
    setLoading(false);

    if (!found) {
      setEmployee(null);
      setTodayRecord(null);
      setError('Attachee not found. Please register first or verify your name/phone number.');
      return;
    }

    setEmployee(found);
    setSessionPhone(found.phone);
    refreshRecord(found.phone);
    setSuccess(`Welcome, ${found.fullName}!`);
  };

  const handleCheckIn = async () => {
    if (!employee) return;
    setActionLoading(true);
    setError('');
    setSuccess('');
    await delay(400);

    const result = await checkIn(employee.phone);
    setActionLoading(false);

    if (!result.success) { setError(result.error); return; }
    await refreshRecord(employee.phone);
    setSuccess(`✅ Checked in at ${result.record.checkIn}. Have a great day!`);
  };

  const handleCheckOut = async () => {
    if (!employee) return;
    setActionLoading(true);
    setError('');
    setSuccess('');
    await delay(400);

    const result = await checkOut(employee.phone);
    setActionLoading(false);

    if (!result.success) { setError(result.error); return; }
    await refreshRecord(employee.phone);
    setSuccess(`👋 Checked out at ${result.record.checkOut}. See you tomorrow!`);
  };

  const handleNotAttendingConfirm = async (reasonCategory, notes) => {
    setActionLoading(true);
    setError('');
    setSuccess('');

    const result = await markNotAttending(employee.phone, reasonCategory, notes);
    setActionLoading(false);

    if (!result.success) { setError(result.error); return; }
    setShowNotAttendingDialog(false);
    await refreshRecord(employee.phone);
    setSuccess(`📋 Absence recorded (${reasonCategory}). Your supervisor has been notified.`);
  };

  const canCheckIn = employee && !todayRecord?.checkIn && todayRecord?.status !== 'not_attending';
  const canCheckOut = employee && todayRecord?.checkIn && !todayRecord?.checkOut;
  const alreadyNotAttending = todayRecord?.status === 'not_attending';
  const alreadyDone = todayRecord?.checkIn || alreadyNotAttending;

  // ── render states ──
  if (checkingLocation) return <LoadingSpinner dark label="Checking your network access…" />;

  if (locationError) {
    return (
      <>
        <header className="app-layout__header">
          <h1 className="app-layout__title">Network Access Required</h1>
          <p className="app-layout__subtitle">Connect to the hub WiFi network to use this portal</p>
        </header>
        <Alert type="error">{locationError}</Alert>
        <p style={{ marginTop: '2rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
          Please ensure you are connected to the Hub WiFi network.
        </p>
      </>
    );
  }

  if (loading) return <LoadingSpinner dark label="Looking up attachee…" />;

  return (
    <>
      {showNotAttendingDialog && (
        <NotAttendingDialog
          onConfirm={handleNotAttendingConfirm}
          onCancel={() => setShowNotAttendingDialog(false)}
          loading={actionLoading}
        />
      )}

      <header className="app-layout__header">
        <h1 className="app-layout__title">Attachee Attendance</h1>
        <p className="app-layout__subtitle">
          Enter your name or phone number to check in or out
        </p>
      </header>

      {success && <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>}
      {error && (
        <Alert type="error" onClose={() => setError('')}>
          {error}
          {error.includes('not found') && (
            <> — <Link to="/attachee/register">Register here</Link></>
          )}
        </Alert>
      )}

      <div className="attendance-panel">
        {/* Lookup card */}
        <div className="attendance-lookup-card">
          <form onSubmit={handleLookup}>
            <FormField
              id="identifier"
              label="Name or Phone Number"
              value={identifier}
              onChange={(e) => { setIdentifier(e.target.value); setError(''); }}
              hint="We identify you by phone number behind the scenes"
              placeholder="John Doe or 555-010-1001"
              required
            />
            <div className="btn-group">
              <button type="submit" className="btn btn--primary">
                Look Up
              </button>
            </div>
          </form>
        </div>

        {employee && (
          <>
            {/* Employee badge */}
            <div className="employee-badge">
              <span className="employee-badge__avatar" aria-hidden="true">
                {employee.fullName.charAt(0).toUpperCase()}
              </span>
              <div>
                <strong>{employee.fullName}</strong>
                <span> · {employee.department} · {formatPhoneDisplay(employee.phone)}</span>
              </div>
            </div>

            {/* Today status */}
            <div className="attendance-status">
              <h3>Today — {formatDisplayDate(getTodayDateString())}</h3>
              <div className="attendance-status__grid">
                <StatusCard
                  label="Check-In"
                  value={todayRecord?.checkIn || 'Not yet'}
                  accent={todayRecord?.checkIn ? 'present' : null}
                />
                <StatusCard
                  label="Check-Out"
                  value={todayRecord?.checkOut || 'Not yet'}
                  accent={todayRecord?.checkOut ? 'present' : null}
                />
                <StatusCard
                  label="Status"
                  value={
                    alreadyNotAttending
                      ? `Absent — ${todayRecord?.reasonCategory || 'Other'}`
                      : todayRecord?.checkIn
                      ? 'Present'
                      : 'Not checked in'
                  }
                  accent={
                    alreadyNotAttending ? 'absent' : todayRecord?.checkIn ? 'present' : null
                  }
                />
              </div>
              {alreadyNotAttending && todayRecord?.notes && (
                <p className="attendance-status__note">
                  <strong>Note:</strong> {todayRecord.notes}
                </p>
              )}
            </div>

            {/* Action buttons */}
            {actionLoading ? (
              <LoadingSpinner dark label="Updating attendance…" />
            ) : (
              <div className="attendance-actions">
                <button
                  type="button"
                  className="btn btn--success btn--lg attendance-actions__btn"
                  onClick={handleCheckIn}
                  disabled={!canCheckIn}
                  title={!canCheckIn ? 'Already checked in or absent today' : 'Clock in for today'}
                >
                  <span aria-hidden="true">✅</span> Check In
                </button>
                <button
                  type="button"
                  className="btn btn--primary btn--lg attendance-actions__btn"
                  onClick={handleCheckOut}
                  disabled={!canCheckOut}
                  title={!canCheckOut ? 'Must check in first' : 'Clock out for today'}
                >
                  <span aria-hidden="true">🚪</span> Check Out
                </button>
                <button
                  type="button"
                  className="btn btn--absent btn--lg attendance-actions__btn"
                  onClick={() => setShowNotAttendingDialog(true)}
                  disabled={alreadyDone}
                  title={alreadyDone ? 'Already recorded for today' : 'Mark yourself as not attending'}
                >
                  <span aria-hidden="true">📋</span> Not Attending
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <p style={{ marginTop: '2rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
        New attachee? <Link to="/attachee/register">Complete registration</Link>
      </p>
    </>
  );
}
