import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROLES } from '../data/constants';
import { setSessionRole, clearSessionPhone, setSessionSupervisorName, clearSessionSupervisorName } from '../services/storageService';
import { verifySupervisorCredentials, setAdminAuthenticated } from '../services/authService';
import PasswordModal from '../components/PasswordModal';
import LoadingSpinner from '../components/LoadingSpinner';

export default function LoginSelection() {
  const navigate = useNavigate();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [authError, setAuthError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const selectRole = async (role) => {
    clearSessionPhone();
    clearSessionSupervisorName();
    setSessionRole(role);

    if (role === ROLES.EMPLOYEE) {
      navigate('/employee/attendance');
    } else {
      setShowPasswordModal(true);
      setAuthError('');
    }
  };

  const handlePasswordSubmit = async (name, password) => {
    setVerifying(true);
    setAuthError('');
    
    const result = await verifySupervisorCredentials(name, password);
    setVerifying(false);
    
    if (result.success) {
      setAdminAuthenticated();
      setSessionSupervisorName(name);
      setShowPasswordModal(false);
      navigate('/supervisor/dashboard');
    } else {
      setAuthError(result.error || 'Authentication failed. Please try again.');
    }
  };

  return (
    <>
      <div className="role-cards">
        <button type="button" className="role-card" onClick={() => selectRole(ROLES.EMPLOYEE)}>
          <div className="role-card__icon" aria-hidden="true">
            👤
          </div>
          <div className="role-card__content">
            <h3>Attachee</h3>
            <p>Register, check in, and check out</p>
          </div>
        </button>
        <button
          type="button"
          className="role-card"
          onClick={() => selectRole(ROLES.SUPERVISOR)}
        >
          <div className="role-card__icon" aria-hidden="true">
            🔒
          </div>
          <div className="role-card__content">
            <h3>Supervisor</h3>
            <p>View attendance dashboard and reports</p>
          </div>
        </button>
      </div>

      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onAuthenticate={handlePasswordSubmit}
        error={authError}
        loading={verifying}
      />
    </>
  );
}
