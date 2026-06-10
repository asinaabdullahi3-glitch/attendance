import { normalizePhone, looksLikePhone } from '../utils/phoneUtils';
import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, query, where, setDoc, addDoc } from 'firebase/firestore';

const EMPLOYEES_COLLECTION = 'employees';

export async function findEmployeeByPhone(phone) {
  const normalized = normalizePhone(phone);
  const q = query(collection(db, EMPLOYEES_COLLECTION), where('phone', '==', normalized));
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }
  return null;
}

export async function findEmployeeByIdentifier(identifier) {
  const trimmed = identifier.trim();
  if (!trimmed) return null;

  if (looksLikePhone(trimmed)) {
    const phone = normalizePhone(trimmed);
    return await findEmployeeByPhone(phone);
  }

  // Search by name
  const q = query(collection(db, EMPLOYEES_COLLECTION));
  const querySnapshot = await getDocs(q);
  
  const lower = trimmed.toLowerCase();
  const employees = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  return (
    employees.find((emp) => emp.fullName.toLowerCase() === lower) ||
    employees.find((emp) => emp.fullName.toLowerCase().includes(lower)) ||
    null
  );
}

export async function registerEmployee(employeeData) {
  const phone = normalizePhone(employeeData.phone);
  
  // Check if phone already exists
  const existing = await findEmployeeByPhone(phone);
  if (existing) {
    return { success: false, error: 'This phone number is already registered' };
  }

  const employee = {
    phone,
    fullName: employeeData.fullName.trim(),
    department: employeeData.department.trim(),
    email: employeeData.email.trim().toLowerCase(),
    registeredAt: new Date().toISOString(),
  };

  try {
    // Use phone as document ID for easy lookup
    const docRef = doc(db, EMPLOYEES_COLLECTION, phone);
    await setDoc(docRef, employee);
    return { success: true, employee: { id: phone, ...employee } };
  } catch (error) {
    console.error('Error registering employee:', error);
    return { success: false, error: 'Failed to register employee. Please try again.' };
  }
}

export async function getAllEmployees() {
  const querySnapshot = await getDocs(collection(db, EMPLOYEES_COLLECTION));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getEmployeeName(phone) {
  const emp = await findEmployeeByPhone(phone);
  return emp?.fullName || 'Unknown';
}
