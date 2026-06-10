import { useState, createContext, useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { ROLES } from '../data/constants';
import { getSessionRole } from '../services/storageService';

const ChangePasswordContext = createContext(null);

export function useChangePassword() {
  return useContext(ChangePasswordContext);
}

export default function MainLayout({ requiredRole }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const role = getSessionRole();

  if (!role) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && role !== requiredRole) {
    return (
      <Navigate
        to={role === ROLES.SUPERVISOR ? '/supervisor/dashboard' : '/unauthorized'}
        replace
      />
    );
  }

  return (
    <ChangePasswordContext.Provider value={{ showChangePassword, setShowChangePassword }}>
      <div className="app-layout">
        <Sidebar
          role={role}
          open={sidebarOpen}
          onToggle={() => setSidebarOpen((o) => !o)}
          onClose={() => setSidebarOpen(false)}
          onChangePassword={() => setShowChangePassword(true)}
        />
        <main className="app-layout__main">
          <Outlet />
        </main>
      </div>
    </ChangePasswordContext.Provider>
  );
}
