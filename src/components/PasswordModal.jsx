import { useState } from 'react';
import Alert from './Alert';

export default function PasswordModal({
  isOpen,
  onClose,
  mode = 'login',
  onAuthenticate,
  onRegister,
  onPasswordReset,
  onSwitchMode,
  error: externalError,
  loading,
  departments = [],
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (!name.trim() || !email.trim() || !department || !password.trim() || !confirmPassword.trim()) {
        setError('Please fill in all registration fields.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      await onRegister?.({
        name: name.trim(),
        email: email.trim(),
        department,
        password,
      });
      return;
    }

    if (mode === 'login') {
      if (!name.trim() || !department || !password.trim()) {
        setError('Please enter your full name, department, and password.');
        return;
      }
      await onAuthenticate?.({
        name: name.trim(),
        department,
        password,
      });
      return;
    }

    if (mode === 'reset') {
      if (!email.trim()) {
        setError('Please enter your supervisor email.');
        return;
      }
      await onPasswordReset?.(email.trim());
      return;
    }
  };

  const handleClose = () => {
    setName('');
    setEmail('');
    setDepartment('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    onClose();
  };

  const switchMode = (newMode) => {
    setName('');
    setEmail('');
    setDepartment('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    onSwitchMode?.(newMode);
  };

  if (!isOpen) return null;

  const title =
    mode === 'register'
      ? 'Supervisor Registration'
      : mode === 'reset'
      ? 'Reset Supervisor Password'
      : 'Supervisor Login';

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button
            type="button"
            className="modal-close"
            onClick={handleClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {(error || externalError) && <Alert type="error">{error || externalError}</Alert>}

        <form onSubmit={handleSubmit} className="modal-form">
          {(mode === 'register' || mode === 'login') && (
            <div className="form-field">
              <label htmlFor="supervisor-name">Full Name</label>
              <input
                id="supervisor-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                placeholder="Enter full name"
                autoFocus
                disabled={loading}
              />
            </div>
          )}
          {mode === 'register' && (
            <div className="form-field">
              <label htmlFor="supervisor-email">Email Address</label>
              <input
                id="supervisor-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="Enter email address"
                disabled={loading}
              />
            </div>
          )}

          {(mode === 'register' || mode === 'login') && (
            <div className="form-field">
              <label htmlFor="supervisor-department">Department</label>
              <select
                id="supervisor-department"
                value={department}
                onChange={(e) => {
                  const value = e.target.value;
                  setDepartment(value);
                  setError('');
                }}
                disabled={loading}
                required
              >
                <option value="">Select your department</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          )}

          {mode !== 'reset' && (
            <div className="form-field">
              <label htmlFor="supervisor-password">Password</label>
              <input
                id="supervisor-password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder={mode === 'register' ? 'Create a secure password' : 'Enter your password'}
                required
                disabled={loading}
              />
            </div>
          )}

          {mode === 'register' && (
            <div className="form-field">
              <label htmlFor="confirm-password">Confirm Password</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError('');
                }}
                placeholder="Confirm password"
                required
                disabled={loading}
              />
            </div>
          )}

          {mode === 'reset' && (
            <div className="form-field">
              <label htmlFor="reset-email">Email Address</label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="Enter your supervisor email"
                required
                disabled={loading}
              />
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn--secondary" onClick={handleClose} disabled={loading}>
              Cancel
            </button>

            {mode === 'login' && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => switchMode('reset')}
                disabled={loading}
              >
                Forgot password?
              </button>
            )}

            {mode === 'reset' && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => switchMode('login')}
                disabled={loading}
              >
                Back to login
              </button>
            )}

            {mode === 'register' && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => switchMode('login')}
                disabled={loading}
              >
                Already have an account?
              </button>
            )}

            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? (mode === 'reset' ? 'Sending...' : 'Processing...') : mode === 'register' ? 'Register' : mode === 'reset' ? 'Send Reset Email' : 'Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
