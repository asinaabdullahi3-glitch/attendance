import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROLES, DEPARTMENTS } from '../data/constants';
import {
  setSessionRole,
  clearSessionPhone,
  setSessionSupervisorName,
  clearSessionSupervisorName,
  setSessionSupervisorDepartment,
  clearSessionSupervisorDepartment,
} from '../services/storageService';
import {
  verifySupervisorCredentials,
  setAdminAuthenticated,
  setAdminData,
  isSupervisorRegistered,
  requestSupervisorPasswordReset,
} from '../services/authService';
import PasswordModal from '../components/PasswordModal';
import LoadingSpinner from '../components/LoadingSpinner';

export default function LoginSelection() {
  const navigate = useNavigate();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [authError, setAuthError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [supervisorMode, setSupervisorMode] = useState('login');
  const [modalLoading, setModalLoading] = useState(false);

  const selectRole = async (role) => {
    clearSessionPhone();
    clearSessionSupervisorName();
    clearSessionSupervisorDepartment();

    if (role === ROLES.EMPLOYEE) {
      setSessionRole(role);
      navigate('/attachee/attendance');
      return;
    }

    setModalLoading(true);
    setAuthError('');

    const registered = await isSupervisorRegistered();
    setSupervisorMode(registered ? 'login' : 'register');
    setShowPasswordModal(true);
    setModalLoading(false);
  };

  const handleLoginSubmit = async ({ name, department, password }) => {
    setVerifying(true);
    setAuthError('');

    const result = await verifySupervisorCredentials(name, department, password);
    setVerifying(false);

    if (result.success) {
      setAdminAuthenticated();
      setSessionRole(ROLES.SUPERVISOR);
      setSessionSupervisorName(name);
      setSessionSupervisorDepartment(department);
      setShowPasswordModal(false);
      navigate('/supervisor/dashboard');
    } else {
      setAuthError(result.error || 'Authentication failed. Please try again.');
    }
  };

  const handleRegisterSubmit = async ({ name, email, department, password }) => {
    setVerifying(true);
    setAuthError('');

    const result = await setAdminData(name, password, email, department);
    setVerifying(false);

    if (result.success) {
      setAdminAuthenticated();
      setSessionRole(ROLES.SUPERVISOR);
      setSessionSupervisorName(name);
      setSessionSupervisorDepartment(department);
      setShowPasswordModal(false);
      navigate('/supervisor/dashboard');
    } else {
      setAuthError(result.error || 'Failed to register supervisor. Please try again.');
    }
  };

  const handleResetSubmit = async (email) => {
    setVerifying(true);
    setAuthError('');

    const result = await requestSupervisorPasswordReset(email);
    setVerifying(false);
    if (result.success) {
      const message = `Your temporary password has been generated and updated in the system. An email has been prepared for ${result.email}.`;
      window.open(
        `mailto:${encodeURIComponent(result.email)}?subject=${encodeURIComponent('Supervisor Password Reset')}&body=${encodeURIComponent(
          `Hello ${result.name},\n\nA temporary password has been generated for your supervisor account. Use the password below to login and reset it immediately:\n\nTemporary password: ${result.temporaryPassword}\nDepartment: ${result.department}\n\nOnce logged in, please update your password from the dashboard.\n\nIf you did not request this, contact support.`
        )}`,
        '_blank'
      );
      setAuthError(message);
      setSupervisorMode('login');
    } else {
      setAuthError(result.error || 'Unable to reset password. Please try again.');
    }
  };

  if (modalLoading) {
    return <LoadingSpinner dark label="Loading supervisor authorization..." />;
  }

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
            <p>Register or login to view department attendance</p>
          </div>
        </button>
      </div>

      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        mode={supervisorMode}
        onAuthenticate={handleLoginSubmit}
        onRegister={handleRegisterSubmit}
        onPasswordReset={handleResetSubmit}
        onSwitchMode={setSupervisorMode}
        error={authError}
        loading={verifying}
        departments={DEPARTMENTS}
      />
    </>
  );
}
