import { sampleEmployees } from '../data/sampleData';
import { registerEmployee, getAllEmployees } from './employeeService';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { isSampleSeeded, markSampleSeeded } from './storageService';

const ATTENDANCE_COLLECTION = 'attendance';

export async function initializeSampleData() {
  if (isSampleSeeded()) return;

  // Check if employees exist in Firestore
  const existingEmployees = await getAllEmployees();
  
  if (existingEmployees.length === 0) {
    // Seed sample employees to Firestore
    for (const emp of sampleEmployees) {
      await registerEmployee(emp);
    }
  }

  markSampleSeeded();
}
