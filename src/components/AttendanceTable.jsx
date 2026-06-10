import { formatDisplayDate } from '../utils/dateUtils';

export default function AttendanceTable({ rows, statusFilter }) {
  const filtered = statusFilter
    ? rows.filter((row) => row.status === statusFilter)
    : rows;

  if (filtered.length === 0) {
    return (
      <div className="table-empty">
        No attendance records match your search or filter.
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table className="attendance-table">
        <thead>
          <tr>
            <th>Attachee Name</th>
            <th>Date</th>
            <th>Check-In</th>
            <th>Check-Out</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => (
            <tr key={`${row.phone}-${row.date}`}>
              <td>{row.employeeName}</td>
              <td>{formatDisplayDate(row.date)}</td>
              <td>{row.checkIn}</td>
              <td>{row.checkOut}</td>
              <td>
                <span
                  className={`status-badge status-badge--${
                    row.status === 'Present' ? 'present' : 'absent'
                  }`}
                >
                  {row.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
