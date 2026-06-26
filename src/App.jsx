import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ROLES } from './data/constants';
import AuthLayout from './layouts/AuthLayout';
import MainLayout from './layouts/MainLayout';
import EmployeeAttendance from './pages/EmployeeAttendance';
import EmployeeRegistration from './pages/EmployeeRegistration';
import LoginSelection from './pages/LoginSelection';
import AdminSetup from './pages/AdminSetup';
import AttendeeProfile from './pages/AttendeeProfile';
import SupervisorDashboard from './pages/SupervisorDashboard';
import SupervisorAuth from './pages/SupervisorAuth';
import Unauthorized from './pages/Unauthorized';
import { initializeSampleData } from './services/seedService';
import { ThemeProvider } from './utils/ThemeContext';
import './styles/global.css';
import './styles/layout.css';
import './styles/components.css';

export default function App() {
  useEffect(() => {
    initializeSampleData();
  }, []);

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
        <Route
          path="/"
          element={
            <AuthLayout
              title="Attachee Attendance System"
              subtitle="Select your role to continue"
            >
              <LoginSelection />
            </AuthLayout>
          }
        />
        <Route path="/supervisor/register" element={<AdminSetup />} />

        <Route
          element={<MainLayout requiredRole={ROLES.EMPLOYEE} />}
        >
          <Route path="/attachee/register" element={<EmployeeRegistration />} />
          <Route path="/attachee/attendance" element={<EmployeeAttendance />} />
          <Route
            path="/attachee"
            element={<Navigate to="/attachee/attendance" replace />}
          />
        </Route>

        <Route path="/supervisor/login" element={<SupervisorAuth />} />

        <Route
          element={<MainLayout requiredRole={ROLES.SUPERVISOR} />}
        >
          <Route
            path="/supervisor/dashboard"
            element={<SupervisorDashboard />}
          />
          <Route path="/supervisor/attachee/:phone" element={<AttendeeProfile />} />
          <Route
            path="/supervisor"
            element={<Navigate to="/supervisor/dashboard" replace />}
          />
        </Route>

        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  );
}
