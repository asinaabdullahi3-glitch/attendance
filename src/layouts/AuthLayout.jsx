export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="auth-layout">
      <div className="auth-layout__card">
        <div className="auth-layout__brand">
          <div className="auth-layout__logo">AT</div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
