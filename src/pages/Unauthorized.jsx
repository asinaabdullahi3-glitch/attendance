import { Link } from 'react-router-dom';

export default function Unauthorized() {
  return (
    <div className="auth-layout auth-layout--centered">
      <div className="auth-layout__card">
        <div className="auth-layout__brand">
          <div className="auth-layout__logo">⚠️</div>
          <h1>Access Denied</h1>
          <p>
            Attachees cannot access supervisor pages. Please return to your
            attendance dashboard.
          </p>
        </div>
        <div className="btn-group">
          <Link to="/employee/attendance" className="btn btn--primary btn--lg">
            Go to Attendance
          </Link>
          <Link to="/" className="btn btn--ghost btn--lg">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
