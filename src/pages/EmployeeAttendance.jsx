import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '../components/Alert';
import FormField from '../components/FormField';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  checkIn,
  checkOut,
  getTodayRecord,
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
    if (idError) {
      setError(idError);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    await delay(500);

    const found = await findEmployeeByIdentifier(identifier);
    setLoading(false);

    if (!found) {
      setEmployee(null);
      setTodayRecord(null);
      setError(
        'Attachee not found. Please register first or verify your name/phone number.'
      );
      return;
    }

    setEmployee(found);
    setSessionPhone(found.phone);
    refreshRecord(found.phone);
    setSuccess(`Welcome, ${found.fullName}! Identified by phone ${formatPhoneDisplay(found.phone)}.`);
  };

  const handleCheckIn = async () => {
    if (!employee) return;
    setActionLoading(true);
    setError('');
    setSuccess('');
    await delay(500);

    const result = await checkIn(employee.phone);
    setActionLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    await refreshRecord(employee.phone);
    setSuccess(`Checked in successfully at ${result.record.checkIn}.`);
  };

  const handleCheckOut = async () => {
    if (!employee) return;
    setActionLoading(true);
    setError('');
    setSuccess('');
    await delay(500);

    const result = await checkOut(employee.phone);
    setActionLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    await refreshRecord(employee.phone);
    setSuccess(`Checked out successfully at ${result.record.checkOut}.`);
  };

  const canCheckIn = employee && !todayRecord?.checkIn;
  const canCheckOut = employee && todayRecord?.checkIn && !todayRecord?.checkOut;

  if (checkingLocation) {
    return <LoadingSpinner dark label="Checking your network access..." />;
  }

  if (locationError) {
    return (
      <>
        <header className="app-layout__header">
          <h1 className="app-layout__title">Network Access Required</h1>
          <p className="app-layout__subtitle">
            You must be connected to the hub WiFi network to access this portal
          </p>
        </header>
        <Alert type="error">
          {locationError}
        </Alert>
        <p style={{ marginTop: '2rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
          Please ensure you are connected to the Hub WiFi network.
        </p>
      </>
    );
  }

  if (loading) {
    return <LoadingSpinner dark label="Looking up attachee..." />;
  }

  return (
    <>
      <header className="app-layout__header">
        <h1 className="app-layout__title">Attachee Attendance</h1>
        <p className="app-layout__subtitle">
          Enter your name or phone number, then check in or out
        </p>
      </header>

      {success && (
        <Alert type="success" onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}
      {error && (
        <Alert type="error" onClose={() => setError('')}>
          {error}
          {error.includes('not found') && (
            <>
              {' '}
              <Link to="/attachee/register">Register here</Link>
            </>
          )}
        </Alert>
      )}

      <div className="attendance-panel">
        <div className="form-card">
          <form onSubmit={handleLookup}>
            <FormField
              id="identifier"
              label="Name or Phone Number"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setError('');
              }}
              hint="We identify you by phone number behind the scenes"
              placeholder="John Doe or 555-010-1001"
              required
            />
            <div className="btn-group">
              <button type="submit" className="btn btn--primary">
                Look Up Attachee
              </button>
            </div>
          </form>
        </div>

        {employee && (
          <>
            <div className="employee-badge">
              Signed in as <strong>{employee.fullName}</strong> ·{' '}
              {employee.department} · ID: {formatPhoneDisplay(employee.phone)}
            </div>

            <div className="attendance-status">
              <h3>Today — {formatDisplayDate(getTodayDateString())}</h3>
              <div className="attendance-status__grid">
                <div className="attendance-status__item">
                  <span>Check-In</span>
                  <strong>{todayRecord?.checkIn || 'Not yet'}</strong>
                </div>
                <div className="attendance-status__item">
                  <span>Check-Out</span>
                  <strong>{todayRecord?.checkOut || 'Not yet'}</strong>
                </div>
                <div className="attendance-status__item">
                  <span>Status</span>
                  <strong>
                    {todayRecord?.checkIn ? 'Present' : 'Not checked in'}
                  </strong>
                </div>
              </div>
            </div>

            {actionLoading ? (
              <LoadingSpinner dark label="Updating attendance..." />
            ) : (
              <div className="btn-group">
                <button
                  type="button"
                  className="btn btn--success btn--lg"
                  onClick={handleCheckIn}
                  disabled={!canCheckIn}
                >
                  Check In
                </button>
                <button
                  type="button"
                  className="btn btn--primary btn--lg"
                  onClick={handleCheckOut}
                  disabled={!canCheckOut}
                >
                  Check Out
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
