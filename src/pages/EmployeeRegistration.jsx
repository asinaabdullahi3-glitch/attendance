import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Alert from '../components/Alert';
import FormField from '../components/FormField';
import LoadingSpinner from '../components/LoadingSpinner';
import { registerEmployee } from '../services/employeeService';
import { setSessionPhone } from '../services/storageService';
import { checkLocationPermission } from '../services/locationService';
import { delay } from '../utils/dateUtils';
import { validateRegistration } from '../utils/validation';
import { DEPARTMENTS } from '../data/constants';

const initialForm = {
  fullName: '',
  phone: '',
  department: '',
  email: '',
};

export default function EmployeeRegistration() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [checkingLocation, setCheckingLocation] = useState(true);

  useEffect(() => {
    const checkLocation = async () => {
      const locationResult = await checkLocationPermission();
      setCheckingLocation(false);
      
      if (!locationResult.allowed) {
        setLocationError(
          locationResult.error || 
          'Your IP address is not in the allowed office network range. Please connect to the office WiFi network.'
        );
      }
    };
    checkLocation();
  }, []);

  const updateField = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
    setSubmitError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateRegistration(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setSubmitError('');
    await delay(600);

    const result = await registerEmployee(form);
    setLoading(false);

    if (!result.success) {
      setSubmitError(result.error);
      return;
    }

    setSessionPhone(result.employee.phone);
    setSuccess(true);
    setForm(initialForm);
  };

  if (checkingLocation) {
    return <LoadingSpinner dark label="Checking your network access..." />;
  }

  if (locationError) {
    return (
      <>
        <header className="app-layout__header">
          <h1 className="app-layout__title">Network Access Required</h1>
          <p className="app-layout__subtitle">
            You must be connected to the office WiFi network to register
          </p>
        </header>
        <Alert type="error">
          {locationError}
        </Alert>
        <p style={{ marginTop: '2rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
          Please ensure you are connected to the office WiFi network.
        </p>
      </>
    );
  }

  if (loading) {
    return <LoadingSpinner dark label="Saving your registration..." />;
  }

  return (
    <>
      <header className="app-layout__header">
        <h1 className="app-layout__title">Attachee Registration</h1>
        <p className="app-layout__subtitle">
          First-time setup — your name will be your unique ID
        </p>
      </header>

      {success && (
        <Alert type="success" onClose={() => setSuccess(false)}>
          Registration successful! Your details have been saved. You can now check
          in using your name or phone number.
        </Alert>
      )}

      {submitError && <Alert type="error">{submitError}</Alert>}

      <div className="form-card">
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <FormField
              id="fullName"
              label="Full Name"
              value={form.fullName}
              onChange={updateField('fullName')}
              error={errors.fullName}
              placeholder="John Doe"
              required
            />
            <FormField
              id="phone"
              label="Phone Number"
              type="tel"
              value={form.phone}
              onChange={updateField('phone')}
              error={errors.phone}
              hint="Used as your unique attachee ID (10 digits)"
              placeholder="555-010-1001"
              required
            />
            <div className="form-field">
              <label htmlFor="department">
                Department *
              </label>
              <select
                id="department"
                value={form.department}
                onChange={updateField('department')}
                className={errors.department ? 'error' : ''}
                style={{
                  width: '100%',
                  padding: '0.7rem 0.9rem',
                  border: errors.department ? '1px solid var(--color-error)' : '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-input-text)',
                  fontSize: '1rem',
                }}
              >
                <option value="">Select Department</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              {errors.department && (
                <p className="form-field__error" role="alert">
                  {errors.department}
                </p>
              )}
            </div>
            <FormField
              id="email"
              label="Email"
              type="email"
              value={form.email}
              onChange={updateField('email')}
              error={errors.email}
              placeholder="john.doe@company.com"
              required
            />
          </div>
          <div className="btn-group">
            <button type="submit" className="btn btn--primary btn--lg">
              Submit Registration
            </button>
            {success && (
              <button
                type="button"
                className="btn btn--success btn--lg"
                onClick={() => navigate('/employee/attendance')}
              >
                Go to Attendance
              </button>
            )}
          </div>
        </form>
      </div>

      <p style={{ marginTop: '1.5rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
        Already registered?{' '}
        <Link to="/employee/attendance">Go to attendance page</Link>
      </p>
    </>
  );
}
