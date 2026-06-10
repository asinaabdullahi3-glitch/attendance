export default function LoadingSpinner({ dark = false, label = 'Loading...' }) {
  return (
    <div className="loading-overlay">
      <div className={`spinner ${dark ? 'spinner--dark' : ''}`} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
