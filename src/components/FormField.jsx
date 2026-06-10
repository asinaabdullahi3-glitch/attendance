export default function FormField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  error,
  hint,
  placeholder,
  required,
}) {
  return (
    <div className="form-field">
      <label htmlFor={id}>
        {label}
        {required && ' *'}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={error ? 'error' : ''}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      />
      {error && (
        <p id={`${id}-error`} className="form-field__error" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${id}-hint`} className="form-field__hint">
          {hint}
        </p>
      )}
    </div>
  );
}
