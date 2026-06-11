import { STORAGE_KEYS } from '../data/constants';

// Session-related functions (keep using sessionStorage)
export function getSessionRole() {
  return sessionStorage.getItem(STORAGE_KEYS.SESSION_ROLE);
}

export function setSessionRole(role) {
  sessionStorage.setItem(STORAGE_KEYS.SESSION_ROLE, role);
}

export function clearSessionRole() {
  sessionStorage.removeItem(STORAGE_KEYS.SESSION_ROLE);
}

export function getSessionPhone() {
  return sessionStorage.getItem(STORAGE_KEYS.SESSION_PHONE);
}

export function setSessionPhone(phone) {
  sessionStorage.setItem(STORAGE_KEYS.SESSION_PHONE, phone);
}

export function clearSessionPhone() {
  sessionStorage.removeItem(STORAGE_KEYS.SESSION_PHONE);
}

export function getSessionSupervisorName() {
  return sessionStorage.getItem('supervisor_name') || 'Supervisor';
}

export function setSessionSupervisorName(name) {
  if (name && name.trim()) {
    sessionStorage.setItem('supervisor_name', name.trim());
  }
}

export function clearSessionSupervisorName() {
  sessionStorage.removeItem('supervisor_name');
}

// Sample data seeding (keep using localStorage)
export function isSampleSeeded() {
  return localStorage.getItem(STORAGE_KEYS.SEEDED) === 'true';
}

export function markSampleSeeded() {
  localStorage.setItem(STORAGE_KEYS.SEEDED, 'true');
}
