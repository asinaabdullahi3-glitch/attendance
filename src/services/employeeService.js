import { normalizePhone, looksLikePhone } from '../utils/phoneUtils';
import { logAuditEvent } from './auditService';
import { handleError } from '../utils/errorHandler';
import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, query, where, setDoc, addDoc } from 'firebase/firestore';

const EMPLOYEES_COLLECTION = 'employees';

export async function findEmployeeByPhone(phone) {
  try {
    const normalized = normalizePhone(phone);
    const q = query(collection(db, EMPLOYEES_COLLECTION), where('phone', '==', normalized));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (error) {
    throw handleError(error);
  }
}

export async function findEmployeeByIdentifier(identifier) {
  try {
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
  } catch (error) {
    throw handleError(error);
  }
}

export async function registerEmployee(employeeData) {
  try {
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

    // Use phone as document ID for easy lookup
    const docRef = doc(db, EMPLOYEES_COLLECTION, phone);
    await setDoc(docRef, employee);
    // Log audit event
    await logAuditEvent('employee_registered', 'employee', phone, { 
      fullName: employee.fullName, 
      department: employee.department, 
      email: employee.email 
    }, phone);
    return { success: true, employee: { id: phone, ...employee } };
  } catch (error) {
    return handleError(error);
  }
}

export async function getAllEmployees() {
  try {
    const querySnapshot = await getDocs(collection(db, EMPLOYEES_COLLECTION));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    throw handleError(error);
  }
}

export async function getEmployeeName(phone) {
  const emp = await findEmployeeByPhone(phone);
  return emp?.fullName || 'Unknown';
}
