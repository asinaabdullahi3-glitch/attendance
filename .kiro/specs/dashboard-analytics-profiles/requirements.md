# Requirements Document

## Introduction

This feature extends the Attachee Attendance System's supervisor-facing experience with three capabilities: **Late Check-In Detection** (flagging attachees who check in after a configurable cutoff time), **Individual Attachee Profile Pages** (a dedicated page per attachee showing full attendance history, punctuality stats, and a presence calendar), and **Attendance Analytics Charts** (visual bar/line charts on the supervisor dashboard summarizing monthly trends using Recharts).

The system is a React + Firebase (Firestore) single-page application. Attendance records store `phone`, `date`, `checkIn` (time string, e.g. `"09:23 AM"`), `checkOut`, and `status`. Employee records store `phone`, `fullName`, `department`, and `email`.

---

## Glossary

- **Dashboard**: The `SupervisorDashboard` page (`/supervisor/dashboard`) viewed only by authenticated supervisors.
- **AttendanceTable**: The existing `AttendanceTable` component that renders the monthly check-in rows.
- **AttendanceRecord**: A Firestore document in the `attendance` collection containing `phone`, `date`, `checkIn`, `checkOut`, and `status`.
- **Attachee**: A registered employee tracked by the system (role: `attachee`).
- **CutoffTime**: A configurable time threshold (default `09:00 AM`) used to classify a check-in as "Late". Stored as the constant `DEFAULT_CUTOFF_TIME` in `constants.js`.
- **LateBadge**: A visual label rendered in the AttendanceTable to indicate a late check-in, displaying the text `"Late"` in amber/orange styling.
- **ProfilePage**: A new route (`/supervisor/attachee/:phone`) that displays an individual attachee's attendance analytics.
- **PresenceCalendar**: A monthly grid component on the ProfilePage that colors each day based on attendance status (present on-time = green, late = amber, absent = red, future/weekend = grey).
- **PunctualityRate**: The percentage of present days on which an attachee checked in on or before the CutoffTime, computed as `(onTimeCheckIns / totalPresentDays) * 100`.
- **AverageHoursWorked**: The mean duration between `checkIn` and `checkOut` in decimal hours across all records where both values are non-null and non-`"—"`.
- **AnalyticsSection**: A new section on the Dashboard containing Recharts-based charts for monthly attendance trends.
- **DailyTurnoutChart**: A bar chart showing the count of present attachees for each calendar day in the selected month.
- **PeakCheckInChart**: A bar chart showing the distribution of check-in counts grouped by hour of the day (6 AM–6 PM) across the selected month.
- **DEFAULT_CUTOFF_TIME**: A named constant (`"09:00 AM"`) in `src/data/constants.js` used as the default CutoffTime.

---

## Requirements

### Requirement 1: Late Check-In Detection

**User Story:** As a supervisor, I want to see which attachees checked in after the cutoff time, so that I can monitor punctuality at a glance from the dashboard table.

#### Acceptance Criteria

1. THE system SHALL define `DEFAULT_CUTOFF_TIME = "09:00 AM"` as a named constant in `src/data/constants.js`, and the Dashboard SHALL initialize its CutoffTime state to this value on mount.
2. WHEN comparing `checkIn` time strings for classification, THE `classifyPunctuality` function SHALL parse both `checkInTime` and `cutoffTime` strings (format `"hh:mm AM/PM"`) into comparable 24-hour numeric minute-of-day values before performing the comparison.
3. WHEN an AttendanceRecord's `checkIn` time, parsed to minutes-of-day, is strictly greater than the parsed `cutoffTime` minutes-of-day, THE `classifyPunctuality` function SHALL return `"Late"`.
4. WHEN an AttendanceRecord's `checkIn` time, parsed to minutes-of-day, is less than or equal to the parsed `cutoffTime` minutes-of-day, THE `classifyPunctuality` function SHALL return `"On Time"`.
5. WHEN an AttendanceRecord has a null, undefined, or empty string `checkIn` value, THE `classifyPunctuality` function SHALL return `"Absent"`.
6. THE `buildMonthlyAttendanceTable` function SHALL include a `punctuality` field on every returned row object, set to the result of calling `classifyPunctuality(record.checkIn, cutoffTime)` for that record.
7. WHEN the AttendanceTable renders a row whose `punctuality` field is `"Late"`, THE AttendanceTable SHALL display a LateBadge element with the text `"Late"` styled in amber/orange, rendered alongside the existing `"Present"` status badge in the Status column.
8. WHEN the AttendanceTable renders a row whose `punctuality` field is `"On Time"` or `"Absent"`, THE AttendanceTable SHALL NOT render a LateBadge; all other existing status badges SHALL remain unaffected.
9. THE Dashboard SHALL expose a `<select>` CutoffTime selector with options at 30-minute increments from `07:00 AM` to `10:00 AM`, defaulting to `DEFAULT_CUTOFF_TIME`.
10. WHEN the supervisor changes the CutoffTime selector value, THE Dashboard SHALL re-derive the `punctuality` field for all rows currently rendered in the AttendanceTable using the new cutoff value, updating LateBadge visibility without a full page reload or new Firestore read.
11. THE CutoffTime selector state SHALL be session-scoped: it persists for the duration of the browser session but resets to `DEFAULT_CUTOFF_TIME` on page reload.

---

### Requirement 2: Individual Attachee Profile Page

**User Story:** As a supervisor, I want to click on an attachee's name in the dashboard table and open a dedicated profile page, so that I can review their complete attendance history and punctuality statistics.

#### Acceptance Criteria

1. WHEN a supervisor clicks an attachee name cell in the AttendanceTable, THE AttendanceTable SHALL trigger navigation to `/supervisor/attachee/:phone` where `:phone` is the attachee's normalized (digits-only) phone number, using `react-router-dom`'s `useNavigate` hook.
2. THE `/supervisor/attachee/:phone` route SHALL be wrapped in the existing `MainLayout` component with `requiredRole={ROLES.SUPERVISOR}`, so that non-supervisor sessions are redirected by MainLayout's existing role-enforcement logic.
3. WHEN the ProfilePage mounts with a valid `:phone` URL parameter, THE ProfilePage SHALL call `findEmployeeByPhone(phone)` from `employeeService.js` and display the returned `fullName`, `department`, and `email` fields.
4. WHEN the ProfilePage mounts, THE ProfilePage SHALL call a new `getAttendanceByPhone(phone)` function in `attendanceService.js` that queries Firestore for all documents in the `attendance` collection where `phone == :phone`, and display the results in a table sorted by `date` descending, showing `date`, `checkIn`, `checkOut`, and the `punctuality` classification (derived using `classifyPunctuality` with `DEFAULT_CUTOFF_TIME`).
5. THE ProfilePage SHALL display the attachee's PunctualityRate as a percentage formatted to one decimal place, computed as `Math.round((onTimeCheckIns / totalPresentDays) * 1000) / 10` where `onTimeCheckIns` is the count of records with `classifyPunctuality` returning `"On Time"` and `totalPresentDays` is the count of records with a non-null `checkIn`.
6. THE ProfilePage SHALL display the attachee's AverageHoursWorked formatted to one decimal place in decimal hours, computed by parsing each `checkIn` and `checkOut` locale string into a `Date` object, subtracting to get milliseconds, dividing by 3,600,000, and averaging across only records where both `checkIn` and `checkOut` are non-null and not equal to `"—"`.
7. THE ProfilePage SHALL display a PresenceCalendar grid for the current calendar month: each day cell SHALL be colored green if `classifyPunctuality` returns `"On Time"`, amber if `"Late"`, red if no record exists for that date, and grey if the date is after today's date or falls on a Saturday or Sunday.
8. WHEN `findEmployeeByPhone(phone)` returns null for the `:phone` URL parameter, THE ProfilePage SHALL render an `"Attachee not found"` message and a link labeled `"← Back to Dashboard"` that navigates to `/supervisor/dashboard`.
9. WHEN the ProfilePage is awaiting Firestore responses for either the employee lookup or attendance fetch, THE ProfilePage SHALL render the existing `LoadingSpinner` component with `label="Loading profile..."`.
10. THE ProfilePage SHALL render a `"← Back to Dashboard"` link at the top of the page that navigates to `/supervisor/dashboard` regardless of whether the employee was found.
11. WHEN the `:phone` URL parameter changes while the ProfilePage is mounted (navigating from one profile to another), THE ProfilePage SHALL re-execute the employee lookup and attendance fetch for the new phone value, discarding all previously displayed data.

---

### Requirement 3: Attendance Analytics Charts

**User Story:** As a supervisor, I want to see visual charts on my dashboard summarizing monthly attendance trends, so that I can identify patterns such as low-attendance days and peak check-in hours without reading raw table data.

#### Acceptance Criteria

1. THE Dashboard SHALL include an AnalyticsSection rendered as a `<section>` element positioned below the `dashboard-cards` div and above the `table-section`.
2. THE AnalyticsSection SHALL render a DailyTurnoutChart using the Recharts `BarChart` component inside a `ResponsiveContainer` with `width="100%"`, displaying one bar per calendar day of the current month (day numbers 1–31 on the x-axis), where each bar's height equals the count of distinct `phone` values present on that day.
3. THE AnalyticsSection SHALL render a PeakCheckInChart using a Recharts `BarChart` component inside a `ResponsiveContainer` with `width="100%"`, displaying one bar per hour from 6 AM through 6 PM inclusive (13 bars), where each bar's height equals the count of `checkIn` records whose parsed hour falls within that hour slot across the current month's data.
4. WHEN the Dashboard loads monthly attendance data into `tableRows` state, THE AnalyticsSection SHALL derive all chart data from `tableRows` using client-side computation, with no additional Firestore reads.
5. WHEN `tableRows` is empty or contains no records for the current month, THE AnalyticsSection SHALL render a `<p>` element with the text `"No data available for this month"` in place of both charts.
6. THE DailyTurnoutChart SHALL use a Recharts `XAxis` with `dataKey` set to the day number and a `YAxis` with `allowDecimals={false}`; both axes SHALL display their labels.
7. THE PeakCheckInChart SHALL use a Recharts `XAxis` with `dataKey` set to the hour label (e.g., `"8 AM"`) and a `YAxis` with `allowDecimals={false}`; both axes SHALL display their labels.
8. THE `recharts` package SHALL be declared as a production dependency in `package.json` and installed via `npm install recharts` before the charts are implemented.
9. Both Recharts charts SHALL use `ResponsiveContainer` so their rendered width adapts to the width of the parent container without a fixed pixel width.

---

### Requirement 4: Punctuality Classification Consistency

**User Story:** As a supervisor, I want the same punctuality rules applied consistently across the table, profile page, and charts, so that I never see conflicting late/on-time labels for the same record.

#### Acceptance Criteria

1. THE `attendanceService.js` module SHALL export a named function `classifyPunctuality(checkInTime, cutoffTime)` that is a pure function (no side effects, no Firestore calls) returning one of the string literals `"On Time"`, `"Late"`, or `"Absent"`.
2. WHEN `classifyPunctuality` is called with a non-empty `checkInTime` string in zero-padded `"hh:mm AM/PM"` format (matching `formatTime()` output) and a non-empty `cutoffTime` string in the same format, THE function SHALL parse both strings to minutes-of-day and return `"On Time"` if `checkInMinutes <= cutoffMinutes`, otherwise `"Late"`.
3. WHEN `classifyPunctuality` is called with a null, undefined, or empty string `checkInTime`, THE function SHALL return `"Absent"` without throwing.
4. WHEN `classifyPunctuality` is called with a null, undefined, or empty string `cutoffTime`, THE function SHALL fall back to parsing against `DEFAULT_CUTOFF_TIME` from `constants.js` rather than throwing.
5. FOR any fixed pair of valid `checkInTime` and `cutoffTime` inputs, calling `classifyPunctuality` multiple times SHALL always return the identical result (idempotent, no random or time-dependent behavior).
6. THE `buildMonthlyAttendanceTable` function, the `AttendanceTable` component rendering logic, and the ProfilePage statistics computation SHALL each import and call `classifyPunctuality` from `attendanceService.js` rather than implementing inline time-comparison logic.

---

### Requirement 5: Profile Page Data Accuracy

**User Story:** As a supervisor, I want the statistics on an attachee's profile page to accurately reflect their Firestore records, so that I can trust the numbers when making decisions.

#### Acceptance Criteria

1. WHEN the ProfilePage computes PunctualityRate, THE computation SHALL use as its denominator only the count of records where `checkIn` is a non-null, non-empty string; records with no `checkIn` value SHALL NOT increment `totalPresentDays`.
2. WHEN the ProfilePage computes AverageHoursWorked, THE computation SHALL exclude any record where `checkOut` is null, undefined, or equal to the string `"—"`; only records with both a valid `checkIn` and a valid `checkOut` string SHALL contribute to the sum and count.
3. WHEN `totalPresentDays` equals zero, THE ProfilePage SHALL display `"0.0%"` for PunctualityRate and `"N/A"` for AverageHoursWorked without performing a division operation.
4. WHEN `totalPresentDays` is greater than zero but the count of records with both valid `checkIn` and `checkOut` is zero, THE ProfilePage SHALL display `"N/A"` for AverageHoursWorked.
5. WHEN the `:phone` URL parameter changes while the ProfilePage component remains mounted, THE ProfilePage SHALL clear all previously computed statistics and re-fetch Firestore records using the new phone value, triggered by a `useEffect` dependency on the `phone` parameter.
6. THE `getAttendanceByPhone(phone)` service function SHALL query Firestore for ALL attendance records matching the given phone, with no month or date filter, so the ProfilePage statistics reflect the attachee's complete history.
