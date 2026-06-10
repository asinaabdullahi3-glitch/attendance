export function validateRegistration(form) {
  const errors = {};

  if (!form.fullName?.trim()) {
    errors.fullName = 'Full name is required';
  } else if (form.fullName.trim().length < 2) {
    errors.fullName = 'Enter at least 2 characters';
  }

  const phoneDigits = String(form.phone || '').replace(/\D/g, '');
  if (!phoneDigits) {
    errors.phone = 'Phone number is required';
  } else if (phoneDigits.length < 10) {
    errors.phone = 'Enter a valid 10-digit phone number';
  }

  if (!form.department?.trim()) {
    errors.department = 'Department is required';
  }

  const email = form.email?.trim();
  if (!email) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address';
  }

  return errors;
}

export function validateIdentifier(identifier) {
  if (!identifier?.trim()) {
    return 'Enter your name or phone number';
  }
  return null;
}
