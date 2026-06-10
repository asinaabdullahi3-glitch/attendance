import { STORAGE_KEYS } from '../data/constants';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getEmployees() {
  return read(STORAGE_KEYS.EMPLOYEES, []);
}

export function saveEmployees(employees) {
  write(STORAGE_KEYS.EMPLOYEES, employees);
}

export function getAttendanceRecords() {
  return read(STORAGE_KEYS.ATTENDANCE, []);
}

export function saveAttendanceRecords(records) {
  write(STORAGE_KEYS.ATTENDANCE, records);
}

export function isSampleSeeded() {
  return localStorage.getItem(STORAGE_KEYS.SEEDED) === 'true';
}

export function markSampleSeeded() {
  localStorage.setItem(STORAGE_KEYS.SEEDED, 'true');
}

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
