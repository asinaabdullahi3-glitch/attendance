import { useState } from 'react';
import Alert from './Alert';

export default function ChangePasswordModal({ isOpen, onClose, onChangePassword }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    setLoading(true);
    const result = await onChangePassword(oldPassword, newPassword);
    setLoading(false);

    if (result.success) {
      handleClose();
    } else {
      setError(result.error);
    }
  };

  const handleClose = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Change Password</h2>
          <button 
            type="button" 
            className="modal-close" 
            onClick={handleClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        
        {error && <Alert type="error">{error}</Alert>}
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-field">
            <label htmlFor="old-password">Current Password</label>
            <input
              id="old-password"
              type="password"
              value={oldPassword}
              onChange={(e) => {
                setOldPassword(e.target.value);
                setError('');
              }}
              placeholder="Enter current password"
              autoFocus
              required
              disabled={loading}
            />
          </div>

          <div className="form-field">
            <label htmlFor="new-password">New Password</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setError('');
              }}
              placeholder="Enter new password"
              required
              disabled={loading}
            />
          </div>

          <div className="form-field">
            <label htmlFor="confirm-password">Confirm New Password</label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError('');
              }}
              placeholder="Confirm new password"
              required
              disabled={loading}
            />
          </div>
          
          <div className="modal-actions">
            <button type="button" className="btn btn--secondary" onClick={handleClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
