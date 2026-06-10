import { sampleEmployees, sampleAttendance } from '../data/sampleData';
import {
  getEmployees,
  saveEmployees,
  getAttendanceRecords,
  saveAttendanceRecords,
  isSampleSeeded,
  markSampleSeeded,
} from './storageService';

export function initializeSampleData() {
  if (isSampleSeeded()) return;

  if (getEmployees().length === 0) {
    saveEmployees(sampleEmployees);
  }

  if (getAttendanceRecords().length === 0) {
    saveAttendanceRecords(sampleAttendance);
  }

  markSampleSeeded();
}
