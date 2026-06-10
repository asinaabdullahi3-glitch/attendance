import { NavLink, useNavigate } from 'react-router-dom';
import { ROLES } from '../data/constants';
import { clearSessionRole, clearSessionPhone } from '../services/storageService';

const employeeLinks = [
  { to: '/employee/attendance', label: 'Attendance', icon: '⏱' },
  { to: '/employee/register', label: 'Registration', icon: '📝' },
];

const supervisorLinks = [
  { to: '/supervisor/dashboard', label: 'Dashboard', icon: '📊' },
];

export default function Sidebar({ role, open, onToggle, onClose, onChangePassword }) {
  const navigate = useNavigate();
  const links = role === ROLES.SUPERVISOR ? supervisorLinks : employeeLinks;

  const handleLogout = () => {
    clearSessionRole();
    clearSessionPhone();
    navigate('/');
    onClose?.();
  };

  return (
    <>
      <button
        type="button"
        className="sidebar__toggle"
        onClick={onToggle}
        aria-label="Toggle menu"
      >
        ☰
      </button>
      {open && (
        <div
          className="sidebar__overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
        <div className="sidebar__brand">
          <div className="sidebar__logo">AT</div>
          <div>
            <div className="sidebar__title">Attendance</div>
            <div className="sidebar__role">{role}</div>
          </div>
        </div>
        <nav className="sidebar__nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
              }
              onClick={onClose}
            >
              <span aria-hidden="true">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__footer">
          <button
            type="button"
            className="btn btn--ghost btn--block"
            onClick={handleLogout}
          >
            Switch Role
          </button>
          {role === ROLES.SUPERVISOR && onChangePassword && (
            <button
              type="button"
              className="btn btn--ghost btn--block"
              onClick={() => {
                onChangePassword();
                onClose?.();
              }}
            >
              Change Password
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
