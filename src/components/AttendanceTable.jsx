import { formatDisplayDate } from '../utils/dateUtils';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function formatDateHeading(isoDate) {
  const [year, month, day] = isoDate.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  return {
    weekday: dayNames[d.getDay()],
    full: `${parseInt(day)} ${MONTH_NAMES[parseInt(month) - 1]} ${year}`,
  };
}

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

  // Group rows by date, preserving the sorted order (already date-desc from service)
  const groups = [];
  const seen = {};
  filtered.forEach((row) => {
    if (!seen[row.date]) {
      seen[row.date] = true;
      groups.push({ date: row.date, rows: [] });
    }
    groups[groups.length - 1].rows.push(row);
  });

  return (
    <div className="grouped-attendance">
      {groups.map(({ date, rows: groupRows }) => {
        const { weekday, full } = formatDateHeading(date);
        return (
          <div key={date} className="attendance-day-group">
            {/* Date header */}
            <div className="attendance-day-header">
              <div className="attendance-day-header__left">
                <span className="attendance-day-header__weekday">{weekday}</span>
                <span className="attendance-day-header__date">{full}</span>
              </div>
              <span className="attendance-day-header__badge">
                {groupRows.length} {groupRows.length === 1 ? 'person' : 'people'}
              </span>
            </div>

            {/* People for this date */}
            <div className="table-wrapper">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>Attachee Name</th>
                    <th>Department</th>
                    <th>Check-In</th>
                    <th>Check-Out</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {groupRows.map((row) => (
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
                      <td>{row.department || '—'}</td>
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
          </div>
        );
      })}
    </div>
  );
}
