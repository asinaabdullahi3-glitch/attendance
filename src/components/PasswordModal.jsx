import { useState } from 'react';
import Alert from './Alert';

export default function PasswordModal({ isOpen, onClose, onAuthenticate, error: externalError, loading }) {
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
    onAuthenticate(name.trim(), password);
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
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? 'Verifying...' : 'Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
