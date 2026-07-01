function buildAttendanceQuery(filters, departmentId, isSuperAdmin) {
  let query = `
    SELECT
      a.id,
      u.full_name,
      u.email,
      u.phone,
      d.name AS department,
      a.role,
      a.check_in_time,
      a.check_out_time,
      a.check_in_lat,
      a.check_in_lng,
      a.check_out_lat,
      a.check_out_lng,
      a.status,
      a.attendance_date
    FROM attendance a
    JOIN users u ON a.user_id = u.id
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE 1=1
  `;
  const params = [];

  if (!isSuperAdmin) {
    query += " AND u.department_id = ?";
    params.push(departmentId);
  }

  if (filters.start_date) {
    query += " AND a.attendance_date >= ?";
    params.push(filters.start_date);
  }

  if (filters.end_date) {
    query += " AND a.attendance_date <= ?";
    params.push(filters.end_date);
  }

  if (filters.department_id && isSuperAdmin) {
    query += " AND u.department_id = ?";
    params.push(filters.department_id);
  }

  if (filters.role) {
    query += " AND a.role = ?";
    params.push(filters.role);
  }

  if (filters.user_id) {
    query += " AND a.user_id = ?";
    params.push(filters.user_id);
  }

  if (filters.status) {
    query += " AND a.status = ?";
    params.push(filters.status);
  }

  query += " ORDER BY a.attendance_date DESC, a.check_in_time DESC";

  return { query, params };
}

function calculateHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return "N/A";
  const diffMs = new Date(checkOut) - new Date(checkIn);
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function formatRecord(record) {
  return {
    "Full Name": record.full_name,
    "Email": record.email,
    "Phone": record.phone,
    "Department": record.department || "N/A",
    "Role": record.role,
    "Attendance Date": record.attendance_date
      ? new Date(record.attendance_date).toLocaleDateString()
      : "N/A",
    "Check-In Time": record.check_in_time
      ? new Date(record.check_in_time).toLocaleString()
      : "N/A",
    "Check-Out Time": record.check_out_time
      ? new Date(record.check_out_time).toLocaleString()
      : "N/A",
    "Check-In Lat": record.check_in_lat || "N/A",
    "Check-In Lng": record.check_in_lng || "N/A",
    "Check-Out Lat": record.check_out_lat || "N/A",
    "Check-Out Lng": record.check_out_lng || "N/A",
    "Total Hours": calculateHours(record.check_in_time, record.check_out_time),
    "Status": record.status || "N/A"
  };
}

module.exports = { buildAttendanceQuery, calculateHours, formatRecord };
