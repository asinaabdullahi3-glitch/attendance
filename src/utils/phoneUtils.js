export function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

export function formatPhoneDisplay(phone) {
  const digits = normalizePhone(phone);
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return digits || phone;
}

export function looksLikePhone(input) {
  const digits = normalizePhone(input);
  return digits.length >= 7;
}
