# Attachee Attendance System

A modern attendance tracking system built with React, Vite, and Firebase. Designed for organizations to track attachee check-in/check-out times, generate reports, and monitor attendance patterns.

## Features

- **Role-Based Access Control**: Separate interfaces for attachees and supervisors
- **Check-In/Check-Out Tracking**: Real-time attendance recording with location verification
- **Employee Registration**: Self-service registration for new attachees
- **Supervisor Dashboard**: Comprehensive analytics and attendance monitoring
- **Monthly Reports**: Export attendance data in Word (.doc) or CSV format
- **Attendance Analytics**: Visual charts showing attendance patterns and punctuality
- **Employee Profiles**: Detailed attendance history for individual attachees
- **Department Filtering**: Filter attendance by department
- **Punctuality Tracking**: Configurable cutoff times for late arrival detection
- **Audit Trail**: Complete logging of all system events
- **Secure Authentication**: Password hashing with bcrypt
- **Location-Based Access**: IP-based network access control

## Tech Stack

- **Frontend**: React 18.3.1, Vite 8.0.12
- **Backend**: Firebase (Firestore)
- **Routing**: React Router DOM 7.6.2
- **Charts**: Recharts 2.12.7
- **Security**: bcryptjs for password hashing
- **Styling**: Custom CSS with CSS variables

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Firebase project with Firestore enabled

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd attendance-Homies
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure Firebase:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or select existing one
   - Enable Firestore Database
   - Go to Project Settings > General > Your apps
   - Add a Web app and copy the configuration
   - Update `.env` file with your Firebase credentials:
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

5. Start the development server:
```bash
npm run dev
```

6. Open your browser and navigate to `http://localhost:5173`

## Usage

### For Attachees

1. **Registration**: First-time users register with their details (name, phone, department, email)
2. **Check-In**: Enter name or phone number, then click "Check In"
3. **Check-Out**: Click "Check Out" when leaving
4. **Location**: Must be connected to the approved office WiFi network

### For Supervisors

1. **Login**: Enter supervisor credentials (password set on first use)
2. **Dashboard**: View real-time attendance statistics
3. **Reports**: Download monthly attendance reports (Word or CSV)
4. **Employee Profiles**: Click on any attachee to view detailed history
5. **Analytics**: View attendance trends and punctuality charts
6. **Filter**: Search by name, filter by department, adjust cutoff time

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Alert.jsx
│   ├── AnalyticsSection.jsx
│   ├── AttendanceTable.jsx
│   ├── DashboardCard.jsx
│   └── ...
├── pages/              # Page components
│   ├── EmployeeAttendance.jsx
│   ├── EmployeeRegistration.jsx
│   ├── SupervisorDashboard.jsx
│   └── ...
├── services/           # Business logic and API calls
│   ├── attendanceService.js
│   ├── authService.js
│   ├── employeeService.js
│   ├── locationService.js
│   └── auditService.js
├── utils/              # Utility functions
│   ├── dateUtils.js
│   ├── phoneUtils.js
│   ├── validation.js
│   └── errorHandler.js
├── layouts/            # Layout components
│   ├── AuthLayout.jsx
│   └── MainLayout.jsx
├── data/               # Constants and sample data
│   ├── constants.js
│   └── sampleData.js
└── styles/             # Global styles
    ├── global.css
    ├── layout.css
    └── components.css
```

## Configuration

### Location Access Control

Configure allowed IP addresses in `src/services/locationService.js`:

```javascript
const ALLOWED_IP_ADDRESSES = [
  '196.216.66.22', // Add your office IP addresses
];
```

### Default Cutoff Time

Change the default punctuality cutoff time in `src/data/constants.js`:

```javascript
export const DEFAULT_CUTOFF_TIME = '09:00 AM';
```

### Departments

Modify department list in `src/data/constants.js`:

```javascript
export const DEPARTMENTS = [
  'Technology',
  'Creatives',
  'Communication',
  // Add more departments as needed
];
```

## Security Features

- **Password Hashing**: Admin passwords are hashed using bcrypt before storage
- **Environment Variables**: Sensitive configuration stored in environment variables
- **Audit Logging**: All critical actions are logged for accountability
- **Location Verification**: IP-based access control for check-in/check-out
- **Role-Based Access**: Separate authentication for attachees and supervisors

## Deployment

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Deploy to Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Set environment variables in Vercel dashboard

### Deploy to Firebase Hosting

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Initialize Firebase:
```bash
firebase login
firebase init
```

3. Deploy:
```bash
firebase deploy
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build locally

## Recent Improvements

- ✅ Environment variables for Firebase configuration
- ✅ Password hashing with bcrypt
- ✅ CSV export functionality
- ✅ Enhanced employee attendance history with filtering
- ✅ Comprehensive audit trail system
- ✅ Centralized error handling
- ✅ Pagination for large datasets
- ✅ Improved security and performance

## Future Enhancements

See `IMPROVEMENT_PLAN.md` for detailed roadmap including:
- TypeScript migration
- Leave management system
- Overtime tracking
- Mobile responsiveness improvements
- Offline support with service workers
- Advanced analytics and reporting

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

## Support

For issues or questions, please contact the development team.
