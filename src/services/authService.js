// Admin authentication service
// Password is hashed using bcrypt before storing in Firestore

import { db } from '../firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import bcrypt from 'bcryptjs';
import { logAuditEvent } from './auditService';

const ADMIN_DOC_ID = 'admin_config';
const ADMIN_PASSWORD_KEY = 'admin_authenticated';

/**
 * Get stored admin data from Firestore
 */
export async function getAdminData() {
  try {
    const docRef = doc(db, 'admin_config', ADMIN_DOC_ID);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error('Error getting admin data:', error);
    return null;
  }
}

function isSupervisorDataComplete(data) {
  return !!data?.password && !!data?.name?.trim() && !!data?.department?.trim();
}

export async function isSupervisorRegistered() {
  const data = await getAdminData();
  return isSupervisorDataComplete(data);
}
 
/**
 * Get stored admin password from Firestore
 */
export async function getAdminPassword() {
  const data = await getAdminData();
  return data?.password || null;
}

/**
 * Get stored admin name from Firestore
 */
export async function getAdminName() {
  const data = await getAdminData();
  return data?.name || null;
}

/**
 * Set admin data in Firestore (for registration)
 * Password is hashed before storage
 */
export async function setAdminData(name, password, email = '', department = '') {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const docRef = doc(db, 'admin_config', ADMIN_DOC_ID);
    await setDoc(docRef, {
      name: name?.trim() || 'Supervisor',
      email: email?.trim().toLowerCase() || '',
      department: department?.trim() || '',
      password: hashedPassword,
      registeredAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error setting admin data:', error);
    return { success: false, error: 'Failed to set admin data' };
  }
}

/**
 * Verify supervisor credentials with full identity and password.
 */
export async function verifySupervisorCredentials(name, department, password) {
  const data = await getAdminData();
  if (!data) {
    return { success: false, isFirstTime: false, error: 'Supervisor account has not been registered yet' };
  }

  if (!isSupervisorDataComplete(data)) {
    return {
      success: false,
      error: 'Supervisor record is incomplete. Please register again or contact support.',
    };
  }

  if (data.name.trim().toLowerCase() !== name.trim().toLowerCase() ||
      data.department.trim().toLowerCase() !== department.trim().toLowerCase()) {
    return { success: false, isFirstTime: false, error: 'Full name or department does not match our records' };
  }

  const isMatch = await bcrypt.compare(password, data.password);
  if (isMatch) {
    return { success: true, isFirstTime: false, data };
  }

  return { success: false, isFirstTime: false, error: 'Invalid password' };
}

export async function requestSupervisorPasswordReset(email) {
  const data = await getAdminData();
  if (!data) {
    return { success: false, error: 'No supervisor account is registered yet.' };
  }

  if (!data.email || data.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
    return { success: false, error: 'Email address not found. Please use the email address associated with your supervisor account.' };
  }

  const temporaryPassword = generateTemporaryPassword(10);
  const result = await setAdminPassword(temporaryPassword);
  if (!result.success) {
    return result;
  }

  await logAuditEvent('password_reset_requested', 'admin', ADMIN_DOC_ID, { email: data.email }, data.name || 'admin');

  return {
    success: true,
    email: data.email,
    temporaryPassword,
    name: data.name,
    department: data.department,
  };
}

function generateTemporaryPassword(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let value = '';
  for (let i = 0; i < length; i += 1) {
    value += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return value;
}

/**
 * Set admin password in Firestore (for change password)
 * Password is hashed before storage
 */
export async function setAdminPassword(password) {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const docRef = doc(db, 'admin_config', ADMIN_DOC_ID);
    const existingData = await getAdminData();
    await setDoc(docRef, { ...existingData, password: hashedPassword });
    return { success: true };
  } catch (error) {
    console.error('Error setting admin password:', error);
    return { success: false, error: 'Failed to set admin password' };
  }
}

export function setAdminAuthenticated() {
  localStorage.setItem(ADMIN_PASSWORD_KEY, 'true');
}

export function isAdminAuthenticated() {
  return localStorage.getItem(ADMIN_PASSWORD_KEY) === 'true';
}

export function clearAdminAuth() {
  localStorage.removeItem(ADMIN_PASSWORD_KEY);
}

/**
 * Clear admin data from Firestore (for reset/migration)
 * This allows setting a fresh password on next login
 */
export async function clearAdminData() {
  try {
    const docRef = doc(db, 'admin_config', ADMIN_DOC_ID);
    await deleteDoc(docRef);
    clearAdminAuth(); // Also clear local storage
    return { success: true };
  } catch (error) {
    console.error('Error clearing admin data:', error);
    return { success: false, error: 'Failed to clear admin data' };
  }
}

/**
 * Change admin password
 */
export async function changeAdminPassword(oldPassword, newPassword) {
  const storedPassword = await getAdminPassword();
  
  // Verify old password matches using bcrypt
  const isMatch = await bcrypt.compare(oldPassword, storedPassword);
  if (!isMatch) {
    return { success: false, error: 'Current password is incorrect' };
  }
  
  // Set new password
  const result = await setAdminPassword(newPassword);
  if (result.success) {
    // Log audit event
    await logAuditEvent('password_changed', 'admin', ADMIN_DOC_ID, { action: 'password_change' }, 'admin');
  }
  return result;
}
