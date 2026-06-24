import { useState } from 'react';
import Alert from './Alert';
import { clearAdminData } from '../services/authService';

export default function PasswordModal({
  isOpen,
  onClose,
  onAuthenticate,
  error: externalError,
  loading,
  departments = [],
  selectedDepartment,
  onDepartmentChange,
}) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter a password');
      return;
    }
    if (!selectedDepartment) {
      setError('Please select your department.');
      return;
    }
    onAuthenticate(name.trim(), password, selectedDepartment);
  };

  const handleResetPassword = async () => {
    if (window.confirm('This will clear the existing admin password. You will need to set a new password on the next login. Continue?')) {
      const result = await clearAdminData();
      if (result.success) {
        setError('');
        alert('Admin password has been reset. Please enter a new password.');
      } else {
        setError('Failed to reset password: ' + result.error);
      }
    }
  };

  const handleClose = () => {
    setName('');
    setPassword('');
    setError('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Supervisor Login</h2>
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
          <div className="form-field">
            <label htmlFor="supervisor-name">Your Name (Optional)</label>
            <input
              id="supervisor-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="Enter your name for display"
              autoFocus
              disabled={loading}
            />
          </div>
          <div className="form-field">
            <label htmlFor="supervisor-department">Department</label>
            <select
              id="supervisor-department"
              value={selectedDepartment}
              onChange={(e) => {
                onDepartmentChange(e.target.value);
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
              placeholder="Enter password"
              required
              disabled={loading}
            />
          </div>
          
          <div className="modal-actions">
            <button type="button" className="btn btn--secondary" onClick={handleClose} disabled={loading}>
              Cancel
            </button>
            <button type="button" className="btn btn--secondary" onClick={handleResetPassword} disabled={loading}>
              Reset Password
            </button>
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? 'Verifying...' : 'Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
