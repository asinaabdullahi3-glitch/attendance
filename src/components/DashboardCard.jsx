export default function DashboardCard({ label, value, variant = '' }) {
  return (
    <div className={`dashboard-card dashboard-card--${variant}`}>
      <div className="dashboard-card__label">{label}</div>
      <div className="dashboard-card__value">{value}</div>
    </div>
  );
}
