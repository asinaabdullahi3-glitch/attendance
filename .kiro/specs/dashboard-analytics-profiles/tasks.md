# Tasks

- [x] 1. Install recharts and add parseTimeToMinutes utility
  - Install `recharts@2.12.7` as a production dependency via npm
  - Add `parseTimeToMinutes(timeStr)` export to `src/utils/dateUtils.js` — parses "hh:mm AM/PM" strings to integer minutes since midnight; returns -1 for invalid/null input
  - _Requirements: 3.8, 3.9, 4.2_

- [x] 2. Add DEFAULT_CUTOFF_TIME constant
  - Add `export const DEFAULT_CUTOFF_TIME = '09:00 AM';` to `src/data/constants.js`
  - _Requirements: 1.1, 4.1_

- [x] 3. Add classifyPunctuality and getAttendanceByPhone to attendanceService
  - Export `classifyPunctuality(checkInTime, cutoffTime)` pure function in `src/services/attendanceService.js`
  - Uses `parseTimeToMinutes` from `dateUtils.js`
  - Returns `"Absent"` if `checkInTime` is falsy
  - Falls back to `DEFAULT_CUTOFF_TIME` if `cutoffTime` is falsy
  - Returns `"On Time"` if `checkInMinutes <= cutoffMinutes`, else `"Late"`
  - Export `getAttendanceByPhone(phone)` async function that queries Firestore `attendance` collection where `phone == phone` and returns records sorted by `date` descending
  - Update `buildMonthlyAttendanceTable` signature to accept 4th argument `cutoffTime = DEFAULT_CUTOFF_TIME`
  - For each row built in `buildMonthlyAttendanceTable`, add `punctuality: classifyPunctuality(record.checkIn, cutoffTime)` field
  - _Requirements: 1.2, 1.3, 1.4, 1.6, 2.4, 4.1, 4.2, 4.3, 4.4, 5.6_
  - _Depends on: 1, 2_

- [x] 4. Update AttendanceTable with Late badge and clickable name
  - Add props `cutoffTime` and `onRowClick` to `AttendanceTable` in `src/components/AttendanceTable.jsx`
  - Name cell: when `onRowClick` is provided, render `<button className="table-name-link">` calling `onRowClick(row.phone)`; otherwise plain text
  - Status cell: after existing status-badge, conditionally render `<span className="status-badge status-badge--late">Late</span>` when `row.punctuality === 'Late'`
  - Add to `src/styles/components.css`: `.status-badge--late` (amber bg `#fef3c7`, text `#92400e`) and `.table-name-link` (unstyled button, primary color, underlined)
  - _Requirements: 1.5, 1.6, 1.7, 2.1_
  - _Depends on: 3_

- [x] 5. Create AnalyticsSection component
  - Create `src/components/AnalyticsSection.jsx`
  - Props: `rows`, `month`, `year`
  - If `rows` is empty, render `<p className="analytics-section__empty">No data available for this month</p>`
  - Derive `dailyData` — array of `{ day, count }` counting distinct phones per calendar day in the month
  - Derive `peakData` — array of `{ hour, count }` counting check-ins per hour slot 6 AM–6 PM using `parseTimeToMinutes`
  - Render two chart cards inside `.analytics-section__charts` grid
  - DailyTurnoutChart: `BarChart` + `ResponsiveContainer`, `XAxis dataKey="day"`, `YAxis allowDecimals={false}`, `Bar dataKey="count"` fill `#c2410c`, plus `CartesianGrid` and `Tooltip`
  - PeakCheckInChart: same structure, `XAxis dataKey="hour"`, `Bar dataKey="count"` fill `#ea580c`
  - Add CSS to `src/styles/components.css`: `.analytics-section`, `.analytics-section__empty`, `.analytics-section__charts`, `.analytics-chart-card`
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_
  - _Depends on: 1, 3_

- [x] 6. Create PresenceCalendar component
  - Create `src/components/PresenceCalendar.jsx`
  - Props: `records`, `month`, `year`, `cutoffTime`
  - Build `recordMap` keyed by date string
  - Render 7-column CSS grid with day headers Sun–Sat and leading empty cells for first-week offset
  - Color each day: grey (future or weekend), green (on-time), amber (late), red (past weekday, no record)
  - Each cell shows day number and `title` of ISO date string
  - Add CSS to `src/styles/components.css`: `.presence-calendar`, `.presence-calendar__header`, `.presence-calendar__cell`, and `--empty`, `--green`, `--amber`, `--red`, `--grey` variants
  - _Requirements: 2.7_
  - _Depends on: 3_

- [x] 7. Create AttendeeProfile page
  - Create `src/pages/AttendeeProfile.jsx`
  - Use `useParams()` for `phone`, `useNavigate()` for navigation
  - `useEffect` on `phone`: parallel fetch of `findEmployeeByPhone(phone)` and `getAttendanceByPhone(phone)`; show `LoadingSpinner label="Loading profile..."` while loading
  - Not-found: render "Attachee not found" message and `← Back to Dashboard` link
  - Found: render back link, profile header (fullName/department/email), stats row (DashboardCard: total days, punctuality rate, avg hours), PresenceCalendar for current month, attendance history table
  - Stats: totalPresentDays = records with checkIn; punctualityRate = `(onTime/total*100).toFixed(1)%` or `"0.0%"`; avgHours = mean decimal hours of complete records or `"N/A"`
  - Use `DEFAULT_CUTOFF_TIME` for all `classifyPunctuality` calls
  - Add CSS to `src/styles/components.css`: `.profile-header`, `.profile-header__name`, `.profile-header__meta`, `.profile-stats`, `.profile-section`, `.profile-back-link`, `.profile-not-found`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 5.1, 5.2, 5.3, 5.4, 5.5_
  - _Depends on: 3, 6_

- [x] 8. Update SupervisorDashboard with CutoffTime selector and AnalyticsSection
  - Import `AnalyticsSection`, `DEFAULT_CUTOFF_TIME`; add `useNavigate` from `react-router-dom`
  - Add `cutoffTime` state initialized to `DEFAULT_CUTOFF_TIME`
  - Define `CUTOFF_OPTIONS` constant array: `['07:00 AM','07:30 AM','08:00 AM','08:30 AM','09:00 AM','09:30 AM','10:00 AM']`
  - Pass `cutoffTime` as 4th arg to `buildMonthlyAttendanceTable`; add `cutoffTime` to `useEffect` dependency array
  - Render `<AnalyticsSection rows={tableRows} month={month} year={year} />` between `.dashboard-cards` and `.table-section`
  - Add CutoffTime `<select>` (label "Late after:") inside `.table-section__header`
  - Pass `cutoffTime` and `onRowClick` to `AttendanceTable`
  - Add `.cutoff-selector` and `.cutoff-select` CSS to `src/styles/components.css`
  - _Requirements: 1.1, 1.7, 1.8, 1.9, 1.10, 1.11, 3.1, 3.4_
  - _Depends on: 4, 5_

- [x] 9. Add AttendeeProfile route to App.jsx
  - Import `AttendeeProfile` from `./pages/AttendeeProfile`
  - Add `<Route path="/supervisor/attachee/:phone" element={<AttendeeProfile />} />` inside the supervisor `MainLayout` route group
  - _Requirements: 2.2_
  - _Depends on: 7_
