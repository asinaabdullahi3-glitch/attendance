import { formatDisplayDate } from '../utils/dateUtils';

export default function AttendanceTable({ rows, statusFilter, cutoffTime, onRowClick }) {
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
              <td>
                {onRowClick ? (
                  <button
                    className="table-name-link"
                    onClick={() => onRowClick(row.phone)}
                  >
                    {row.employeeName}
                  </button>
                ) : (
                  row.employeeName
                )}
              </td>
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
                {row.punctuality === 'Late' && (
                  <span
                    className="status-badge status-badge--late"
                    style={{ marginLeft: '0.4rem' }}
                  >
                    Late
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
