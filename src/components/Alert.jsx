export default function Alert({ type = 'info', children, onClose }) {
  return (
    <div className={`alert alert--${type}`} role="alert">
      <span style={{ flex: 1 }}>{children}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.1rem',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
