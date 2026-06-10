import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '../components/Alert';
import FormField from '../components/FormField';
import LoadingSpinner from '../components/LoadingSpinner';
import { setAdminData, isSupervisorRegistered } from '../services/authService';

export default function AdminSetup() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [alreadySetup, setAlreadySetup] = useState(false);

  useState(() => {
    const checkIfSetup = async () => {
      const isRegistered = await isSupervisorRegistered();
      setCheckingSetup(false);
      if (isRegistered) {
        setAlreadySetup(true);
      }
    };
    checkIfSetup();
  }, []);

  const validateForm = () => {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setSubmitError('');

    const result = await setAdminData(name.trim(), password);
    setLoading(false);

    if (!result.success) {
      setSubmitError(result.error || 'Failed to register supervisor');
      return;
    }

    setSuccess(true);
    setName('');
    setPassword('');
    setConfirmPassword('');
  };

  if (checkingSetup) {
    return <LoadingSpinner dark label="Checking setup status..." />;
  }

  if (alreadySetup) {
    return (
      <div className="auth-layout auth-layout--centered">
        <div className="auth-layout__card">
          <div className="auth-layout__brand">
            <div className="auth-layout__logo">✅</div>
            <h1>Supervisor Already Registered</h1>
            <p>The supervisor has already been registered.</p>
          </div>
          <div className="btn-group">
            <button
              type="button"
              className="btn btn--primary btn--lg"
              onClick={() => navigate('/')}
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="auth-layout auth-layout--centered">
        <div className="auth-layout__card">
          <div className="auth-layout__brand">
            <div className="auth-layout__logo">✅</div>
            <h1>Registration Complete</h1>
            <p>Supervisor has been registered successfully. You can now access the supervisor dashboard.</p>
          </div>
          <div className="btn-group">
            <button
              type="button"
              className="btn btn--primary btn--lg"
              onClick={() => navigate('/')}
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-layout auth-layout--centered">
      <div className="auth-layout__card">
        <div className="auth-layout__brand">
          <div className="auth-layout__logo">🔐</div>
          <h1>Supervisor Registration</h1>
          <p>Register your name and set your password to access the supervisor dashboard</p>
        </div>

        {submitError && <Alert type="error">{submitError}</Alert>}

        <form onSubmit={handleSubmit} className="form-card">
          <FormField
            id="name"
            label="Supervisor Name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((prev) => ({ ...prev, name: '' }));
              setSubmitError('');
            }}
            error={errors.name}
            placeholder="Enter your full name"
            required
          />
          <FormField
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors((prev) => ({ ...prev, password: '' }));
              setSubmitError('');
            }}
            error={errors.password}
            placeholder="Enter password"
            required
          />
          <FormField
            id="confirmPassword"
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setErrors((prev) => ({ ...prev, confirmPassword: '' }));
              setSubmitError('');
            }}
            error={errors.confirmPassword}
            placeholder="Confirm password"
            required
          />
          <div className="btn-group">
            <button type="submit" className="btn btn--primary btn--lg" disabled={loading}>
              {loading ? 'Registering...' : 'Register Supervisor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
