import { ATTENDANCE_STATUS, DEFAULT_CUTOFF_TIME } from '../data/constants';
import { formatTime, getTodayDateString, isSameMonth, parseTimeToMinutes } from '../utils/dateUtils';
import { getEmployeeName, getAllEmployees } from './employeeService';
import { logAuditEvent } from './auditService';
import { handleError, withErrorHandling } from '../utils/errorHandler';
import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, query, where, setDoc, addDoc, deleteDoc } from 'firebase/firestore';

const ATTENDANCE_COLLECTION = 'attendance';

/**
 * Classify an employee's punctuality based on their check-in time and a cutoff.
 *
 * @param {string|null|undefined} checkInTime - e.g. "09:23 AM"
 * @param {string|null|undefined} cutoffTime  - e.g. "09:00 AM"; falls back to DEFAULT_CUTOFF_TIME
 * @returns {"Absent"|"On Time"|"Late"}
 */
export function classifyPunctuality(checkInTime, cutoffTime) {
  if (!checkInTime) return 'Absent';
  const resolvedCutoff = cutoffTime || DEFAULT_CUTOFF_TIME;
  const checkInMinutes = parseTimeToMinutes(checkInTime);
  const cutoffMinutes = parseTimeToMinutes(resolvedCutoff);
  return checkInMinutes <= cutoffMinutes ? 'On Time' : 'Late';
}

/**
 * Fetch all attendance records for a given phone number, sorted by date descending.
 *
 * @param {string} phone
 * @returns {Promise<Object[]>}
 */
export async function getAttendanceByPhone(phone) {
  try {
    const q = query(
      collection(db, ATTENDANCE_COLLECTION),
      where('phone', '==', phone)
    );
    const snap = await getDocs(q);
    const records = snap.docs.map(d => d.data());
    return records.sort((a, b) => b.date.localeCompare(a.date));
  } catch (error) {
    throw handleError(error);
  }
}

// Migration function to move localStorage data to Firestore
export async function migrateLocalStorageToFirestore() {
  try {
    const localStorageData = localStorage.getItem('at_attendance');
    if (!localStorageData) return { success: false, message: 'No localStorage data found' };
    
    const records = JSON.parse(localStorageData);
    console.log(`Found ${records.length} records in localStorage, migrating to Firestore...`);
    
    let migrated = 0;
    for (const record of records) {
      if (record.checkIn) {
        const docRef = doc(db, ATTENDANCE_COLLECTION, `${record.phone}_${record.date}`);
        await setDoc(docRef, {
          phone: record.phone,
          date: record.date,
          checkIn: record.checkIn,
          checkOut: record.checkOut || null,
          status: ATTENDANCE_STATUS.PRESENT,
          createdAt: new Date().toISOString(),
        });
        migrated++;
      }
    }
    
    console.log(`Migrated ${migrated} records to Firestore`);
    return { success: true, message: `Migrated ${migrated} records to Firestore` };
  } catch (error) {
    console.error('Migration error:', error);
    return { success: false, message: 'Migration failed: ' + error.message };
  }
}

export async function getTodayRecord(phone) {
  try {
    const today = getTodayDateString();
    const docRef = doc(db, ATTENDANCE_COLLECTION, `${phone}_${today}`);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    throw handleError(error);
  }
}

export async function checkIn(phone) {
  try {
    const today = getTodayDateString();
    const docRef = doc(db, ATTENDANCE_COLLECTION, `${phone}_${today}`);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists() && docSnap.data().checkIn) {
      return { success: false, error: 'You have already checked in today' };
    }

    const record = {
      phone,
      date: today,
      checkIn: formatTime(),
      checkOut: null,
      status: ATTENDANCE_STATUS.PRESENT,
      createdAt: new Date().toISOString(),
    };

    await setDoc(docRef, record);
    // Log audit event
    await logAuditEvent('check_in', 'employee', phone, { date: today, time: record.checkIn }, phone);
    return { success: true, record };
  } catch (error) {
    return handleError(error);
  }
}

export async function checkOut(phone) {
  try {
    const today = getTodayDateString();
    const docRef = doc(db, ATTENDANCE_COLLECTION, `${phone}_${today}`);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists() || !docSnap.data().checkIn) {
      return { success: false, error: 'You must check in before checking out' };
    }

    if (docSnap.data().checkOut) {
      return { success: false, error: 'You have already checked out today' };
    }

    const updated = {
      ...docSnap.data(),
      checkOut: formatTime(),
      status: ATTENDANCE_STATUS.PRESENT,
      updatedAt: new Date().toISOString(),
    };

    await setDoc(docRef, updated);
    // Log audit event
    await logAuditEvent('check_out', 'employee', phone, { date: today, checkIn: updated.checkIn, checkOut: updated.checkOut }, phone);
    return { success: true, record: updated };
  } catch (error) {
    return handleError(error);
  }
}

export async function getDashboardStats(departmentFilter = '') {
  const employees = await getAllEmployees();
  const today = getTodayDateString();
  const departmentEmployees = departmentFilter
    ? employees.filter((employee) => employee.department === departmentFilter)
    : employees;
  
  // Query Firestore for today's attendance records
  const q = query(collection(db, ATTENDANCE_COLLECTION), where('date', '==', today));
  const querySnapshot = await getDocs(q);
  
  const presentPhones = new Set();
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.checkIn) {
      presentPhones.add(data.phone);
    }
  });
  
  const presentDepartmentPhones = departmentFilter
    ? departmentEmployees.filter((employee) => presentPhones.has(employee.phone)).length
    : presentPhones.size;
  
  return {
    totalEmployees: departmentEmployees.length,
    presentToday: presentDepartmentPhones,
    absentToday: Math.max(0, departmentEmployees.length - presentDepartmentPhones),
  };
}

export async function buildMonthlyAttendanceTable(month, year, searchQuery = '', cutoffTime = DEFAULT_CUTOFF_TIME, departmentFilter = '') {
  const employees = await getAllEmployees();
  const departmentEmployees = departmentFilter
    ? employees.filter((employee) => employee.department === departmentFilter)
    : employees;
  const query = searchQuery.trim().toLowerCase();
  const rows = [];

  try {
    // Get ALL attendance records from Firestore (no date filter for now)
    const querySnapshot = await getDocs(collection(db, ATTENDANCE_COLLECTION));
    
    const records = [];
    querySnapshot.forEach((doc) => {
      records.push(doc.data());
    });

    console.log('Total attendance records:', records.length);
    console.log('Employees:', employees.length);

    // Only create rows for present records
    records.forEach((record) => {
      if (record.checkIn) {
        const emp = departmentEmployees.find((e) => e.phone === record.phone);
        if (emp) {
          rows.push({
            phone: emp.phone,
            employeeName: emp.fullName,
            department: emp.department,
            date: record.date,
            checkIn: record.checkIn,
            checkOut: record.checkOut || '—',
            status: ATTENDANCE_STATUS.PRESENT,
            punctuality: classifyPunctuality(record.checkIn, cutoffTime),
          });
        }
      }
    });
  } catch (error) {
    console.error('Error building attendance table:', error);
    return [];
  }

  const sorted = rows.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return a.employeeName.localeCompare(b.employeeName);
  });

  if (!query) return sorted;

  return sorted.filter(
    (row) =>
      row.employeeName.toLowerCase().includes(query) ||
      row.phone.includes(query.replace(/\D/g, ''))
  );
}

/**
 * Generate a well-formatted Word document report of attendance records,
 * grouped by date — each date gets its own section header and table.
 */
export function generateAttendanceReport(rows, month, year) {
  const monthNames = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];
  const dayNames   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  // Summary stats
  const onTimeCount = rows.filter(r => classifyPunctuality(r.checkIn, DEFAULT_CUTOFF_TIME) === 'On Time').length;
  const lateCount   = rows.filter(r => classifyPunctuality(r.checkIn, DEFAULT_CUTOFF_TIME) === 'Late').length;

  // Group rows by date (already sorted date-desc from service; keep that order)
  const groupMap = {};
  const groupOrder = [];
  rows.forEach(row => {
    if (!groupMap[row.date]) {
      groupMap[row.date] = [];
      groupOrder.push(row.date);
    }
    groupMap[row.date].push(row);
  });

  // Build one section per date
  let dateSections = '';

  if (rows.length === 0) {
    dateSections = `
      <tr><td colspan="4" style="padding: 24px; text-align: center; color: #888; font-size: 11pt; border: 1px solid #dee2e6;">
        No attendance records for this period.
      </td></tr>`;
  } else {
    groupOrder.forEach(date => {
      const [y, m, d] = date.split('-');
      const jsDate  = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      const weekday = dayNames[jsDate.getDay()];
      const label   = `${weekday}, ${parseInt(d)} ${monthNames[parseInt(m) - 1]} ${y}`;
      const group   = groupMap[date];

      // Date section header row
      dateSections += `
        <tr>
          <td colspan="4" style="
            background-color: #7c2d12;
            padding: 9px 14px;
            font-size: 10pt;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: 0.03em;
            border: 1px solid #6b2410;">
            ${label}
            <span style="margin-left: 12px; background-color: rgba(255,255,255,0.2);
              padding: 1px 8px; border-radius: 10px; font-size: 9pt; font-weight: 600;">
              ${group.length} ${group.length === 1 ? 'person' : 'people'}
            </span>
          </td>
        </tr>`;

      // Rows for this date
      group.forEach((row, i) => {
        const punctuality      = classifyPunctuality(row.checkIn, DEFAULT_CUTOFF_TIME);
        const rowBg            = i % 2 === 0 ? '#ffffff' : '#f7f7f7';
        const punctualityColor = punctuality === 'Late' ? '#c05c00' : '#166534';
        const punctualityBg    = punctuality === 'Late' ? '#fff3cd' : '#d4edda';

        dateSections += `
          <tr style="background-color: ${rowBg};">
            <td style="padding: 9px 14px; border: 1px solid #dee2e6; font-size: 11pt; width: 40%;">${row.employeeName}</td>
            <td style="padding: 9px 14px; border: 1px solid #dee2e6; font-size: 11pt; text-align: center; width: 20%;">${row.checkIn}</td>
            <td style="padding: 9px 14px; border: 1px solid #dee2e6; font-size: 11pt; text-align: center; width: 20%;">${row.checkOut}</td>
            <td style="padding: 9px 14px; border: 1px solid #dee2e6; font-size: 11pt; text-align: center; width: 20%;">
              <span style="background-color: ${punctualityBg}; color: ${punctualityColor};
                padding: 2px 10px; border-radius: 12px; font-weight: 600; font-size: 10pt;">
                ${punctuality}
              </span>
            </td>
          </tr>`;
      });

      // Spacer between date groups
      dateSections += `
        <tr><td colspan="4" style="padding: 6px; border: none; background-color: #f0f0f0;"></td></tr>`;
    });
  }

  const htmlContent = `
<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <meta name=ProgId content=Word.Document>
  <meta name=Generator content="Microsoft Word">
  <meta name=Originator content="Microsoft Word">
</head>
<body style="font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1a1a1a; margin: 0; padding: 0;">

  <!-- Cover band -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 0;">
    <tr>
      <td style="background-color: #7c2d12; padding: 32px 40px;">
        <p style="margin: 0; font-size: 22pt; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">
          Attachee Attendance Report
        </p>
        <p style="margin: 6px 0 0; font-size: 12pt; color: #fca49a;">
          ${monthNames[month]} ${year}
        </p>
      </td>
    </tr>
  </table>

  <!-- Summary strip -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
    <tr>
      <td style="background-color: #fff8f0; border-bottom: 2px solid #c2410c; padding: 14px 40px;">
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-right: 40px;">
              <p style="margin: 0; font-size: 9pt; color: #7c2d12; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600;">Total Check-Ins</p>
              <p style="margin: 2px 0 0; font-size: 18pt; font-weight: 700; color: #1a1a1a;">${rows.length}</p>
            </td>
            <td style="padding-right: 40px;">
              <p style="margin: 0; font-size: 9pt; color: #7c2d12; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600;">Active Days</p>
              <p style="margin: 2px 0 0; font-size: 18pt; font-weight: 700; color: #1a1a1a;">${groupOrder.length}</p>
            </td>
            <td style="padding-right: 40px;">
              <p style="margin: 0; font-size: 9pt; color: #7c2d12; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600;">On Time</p>
              <p style="margin: 2px 0 0; font-size: 18pt; font-weight: 700; color: #166534;">${onTimeCount}</p>
            </td>
            <td style="padding-right: 40px;">
              <p style="margin: 0; font-size: 9pt; color: #7c2d12; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600;">Late</p>
              <p style="margin: 2px 0 0; font-size: 18pt; font-weight: 700; color: #c05c00;">${lateCount}</p>
            </td>
            <td>
              <p style="margin: 0; font-size: 9pt; color: #7c2d12; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600;">Generated</p>
              <p style="margin: 2px 0 0; font-size: 10pt; font-weight: 600; color: #1a1a1a;">${new Date().toLocaleString()}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- Column headers -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 0; border-collapse: collapse;">
    <thead>
      <tr style="background-color: #f0f0f0;">
        <th style="padding: 9px 14px; text-align: left;   color: #555; font-size: 9pt; font-weight: 700; letter-spacing: 0.05em; border: 1px solid #dee2e6; width: 40%;">ATTACHEE NAME</th>
        <th style="padding: 9px 14px; text-align: center; color: #555; font-size: 9pt; font-weight: 700; letter-spacing: 0.05em; border: 1px solid #dee2e6; width: 20%;">CHECK-IN</th>
        <th style="padding: 9px 14px; text-align: center; color: #555; font-size: 9pt; font-weight: 700; letter-spacing: 0.05em; border: 1px solid #dee2e6; width: 20%;">CHECK-OUT</th>
        <th style="padding: 9px 14px; text-align: center; color: #555; font-size: 9pt; font-weight: 700; letter-spacing: 0.05em; border: 1px solid #dee2e6; width: 20%;">PUNCTUALITY</th>
      </tr>
    </thead>
    <tbody>
      ${dateSections}
    </tbody>
  </table>

  <!-- Footer -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
    <tr>
      <td style="border-top: 1px solid #dee2e6; padding-top: 12px; text-align: center; color: #888; font-size: 9pt;">
        Attachee Attendance System &nbsp;·&nbsp; ${monthNames[month]} ${year} Report &nbsp;·&nbsp; Confidential
      </td>
    </tr>
  </table>

</body>
</html>`;

  const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `attendance_report_${year}_${String(month + 1).padStart(2, '0')}.doc`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get present records for report (only those who checked in)
 */
export async function getPresentRecords(month, year, departmentFilter = '') {
  const tableRows = await buildMonthlyAttendanceTable(month, year, '', DEFAULT_CUTOFF_TIME, departmentFilter);
  // Filter to only show records where attachee checked in (has checkIn time)
  return tableRows.filter((row) => row.checkIn && row.checkIn !== '—');
}

/**
 * Get paginated attendance records
 * @param {number} page - Page number (1-based)
 * @param {number} pageSize - Number of records per page
 * @param {string} searchQuery - Optional search query
 * @param {string} departmentFilter - Optional department filter
 * @returns {Promise<{records: Array, totalPages: number, currentPage: number, totalRecords: number}>}
 */
export async function getPaginatedAttendanceRecords(page = 1, pageSize = 50, searchQuery = '', departmentFilter = '') {
  try {
    const { month, year } = getCurrentMonthYear();
    const allRecords = await buildMonthlyAttendanceTable(month, year, searchQuery, DEFAULT_CUTOFF_TIME, departmentFilter);
    
    const filteredRecords = allRecords;
    
    const totalRecords = filteredRecords.length;
    const totalPages = Math.ceil(totalRecords / pageSize);
    const currentPage = Math.min(page, totalPages || 1);
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedRecords = filteredRecords.slice(startIndex, endIndex);
    
    return {
      records: paginatedRecords,
      totalPages,
      currentPage,
      totalRecords,
      pageSize,
    };
  } catch (error) {
    throw handleError(error);
  }
}

/**
 * Generate a CSV report of attendance records
 */
export function generateAttendanceCSV(rows, month, year) {
  const monthNames = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];
  
  // CSV header
  const headers = ['Date', 'Employee Name', 'Department', 'Check-In', 'Check-Out', 'Status', 'Punctuality'];
  
  // CSV rows
  const csvRows = rows.map(row => [
    row.date,
    `"${row.employeeName}"`,
    `"${row.department}"`,
    row.checkIn,
    row.checkOut,
    row.status,
    classifyPunctuality(row.checkIn, DEFAULT_CUTOFF_TIME)
  ]);
  
  // Combine header and rows
  const csvContent = [
    headers.join(','),
    ...csvRows.map(row => row.join(','))
  ].join('\n');
  
  // Create and download CSV file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `attendance_report_${year}_${String(month + 1).padStart(2, '0')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
