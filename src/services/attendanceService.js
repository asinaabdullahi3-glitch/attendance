import { ATTENDANCE_STATUS } from '../data/constants';
import { formatTime, getTodayDateString, isSameMonth } from '../utils/dateUtils';
import { getEmployeeName, getAllEmployees } from './employeeService';
import { getAttendanceRecords, saveAttendanceRecords } from './storageService';

export function getTodayRecord(phone) {
  const today = getTodayDateString();
  return getAttendanceRecords().find(
    (r) => r.phone === phone && r.date === today
  );
}

export function checkIn(phone) {
  const today = getTodayDateString();
  const records = getAttendanceRecords();
  const existing = records.find((r) => r.phone === phone && r.date === today);

  if (existing?.checkIn) {
    return { success: false, error: 'You have already checked in today' };
  }

  const record = {
    phone,
    date: today,
    checkIn: formatTime(),
    checkOut: null,
    status: ATTENDANCE_STATUS.PRESENT,
  };

  saveAttendanceRecords([...records, record]);
  return { success: true, record };
}

export function checkOut(phone) {
  const today = getTodayDateString();
  const records = getAttendanceRecords();
  const existing = records.find((r) => r.phone === phone && r.date === today);

  if (!existing?.checkIn) {
    return { success: false, error: 'You must check in before checking out' };
  }

  if (existing.checkOut) {
    return { success: false, error: 'You have already checked out today' };
  }

  const updated = records.map((r) =>
    r.phone === phone && r.date === today
      ? { ...r, checkOut: formatTime(), status: ATTENDANCE_STATUS.PRESENT }
      : r
  );

  saveAttendanceRecords(updated);
  return {
    success: true,
    record: updated.find((r) => r.phone === phone && r.date === today),
  };
}

export async function getDashboardStats() {
  const employees = await getAllEmployees();
  const today = getTodayDateString();
  const records = getAttendanceRecords();
  const presentPhones = new Set(
    records
      .filter((r) => r.date === today && r.checkIn)
      .map((r) => r.phone)
  );

  return {
    totalEmployees: employees.length,
    presentToday: presentPhones.size,
    absentToday: Math.max(0, employees.length - presentPhones.size),
  };
}

export async function buildMonthlyAttendanceTable(month, year, searchQuery = '') {
  const employees = await getAllEmployees();
  const records = getAttendanceRecords();
  const query = searchQuery.trim().toLowerCase();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const rows = [];

  employees.forEach((emp) => {
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (!isSameMonth(dateStr, month, year)) continue;

      const record = records.find(
        (r) => r.phone === emp.phone && r.date === dateStr
      );

      if (record?.checkIn) {
        rows.push({
          phone: emp.phone,
          employeeName: emp.fullName,
          date: dateStr,
          checkIn: record.checkIn,
          checkOut: record.checkOut || '—',
          status: ATTENDANCE_STATUS.PRESENT,
        });
      } else {
        rows.push({
          phone: emp.phone,
          employeeName: emp.fullName,
          date: dateStr,
          checkIn: '—',
          checkOut: '—',
          status: ATTENDANCE_STATUS.ABSENT,
        });
      }
    }
  });

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
 * Generate Word document report of attendance records
 */
export function generateAttendanceReport(rows, month, year) {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  
  // Format date to readable format (e.g., "2026-06-10" -> "10/06/2026")
  const formatDate = (dateStr) => {
    const dateParts = dateStr.split('-');
    return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
  };

  // Create HTML content for Word document
  let htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word'
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <meta name=ProgId content=Word.Document>
      <meta name=Generator content="Microsoft Word">
      <meta name=Originator content="Microsoft Word">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Times New Roman', 'Arial', serif;
          font-size: 12pt;
          line-height: 1.5;
          margin: 1in;
          color: #000000;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #000000;
          padding-bottom: 15px;
        }
        .header h1 {
          font-size: 24pt;
          font-weight: bold;
          color: #000000;
          margin-bottom: 5px;
        }
        .header p {
          font-size: 12pt;
          color: #666666;
        }
        .info-section {
          margin-bottom: 25px;
          padding: 15px;
          background-color: #f5f5f5;
          border: 1px solid #cccccc;
        }
        .info-section p {
          margin: 5px 0;
          font-size: 12pt;
        }
        .info-section strong {
          font-weight: bold;
        }
        .table-title {
          font-size: 16pt;
          font-weight: bold;
          margin-bottom: 15px;
          color: #000000;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 20px;
        }
        th {
          background-color: #4472C4;
          color: white;
          font-weight: bold;
          font-size: 12pt;
          padding: 10px;
          border: 1px solid #4472C4;
          text-align: center;
        }
        td {
          padding: 10px;
          border: 1px solid #cccccc;
          font-size: 12pt;
          text-align: center;
        }
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        tr:hover {
          background-color: #e8e8e8;
        }
        .footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #cccccc;
          text-align: center;
          font-size: 10pt;
          color: #666666;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Attendance Report</h1>
        <p>${monthNames[month]} ${year}</p>
      </div>
      
      <div class="info-section">
        <p><strong>Total Records:</strong> ${rows.length}</p>
        <p><strong>Report Generated:</strong> ${new Date().toLocaleString()}</p>
      </div>

      <div class="table-title">Attendance Details</div>
      <table>
        <thead>
          <tr>
            <th width="20%">Date</th>
            <th width="40%">Name</th>
            <th width="20%">Check In</th>
            <th width="20%">Check Out</th>
          </tr>
        </thead>
        <tbody>
  `;

  rows.forEach((row) => {
    htmlContent += `
          <tr>
            <td>${formatDate(row.date)}</td>
            <td>${row.employeeName}</td>
            <td>${row.checkIn}</td>
            <td>${row.checkOut}</td>
          </tr>
    `;
  });

  htmlContent += `
        </tbody>
      </table>
      
      <div class="footer">
        <p>End of Report</p>
      </div>
    </body>
    </html>
  `;

  // Create blob and download
  const blob = new Blob(['\ufeff', htmlContent], { 
    type: 'application/msword' 
  });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `attendance_report_${year}_${month + 1}.doc`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Get present records for report
 */
export async function getPresentRecords(month, year) {
  const tableRows = await buildMonthlyAttendanceTable(month, year);
  return tableRows.filter((row) => row.status === ATTENDANCE_STATUS.PRESENT);
}
