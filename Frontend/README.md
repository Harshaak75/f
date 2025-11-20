# Dotspeaks HRM

A modern, enterprise-grade HR/CRM system built with React, TypeScript, and Tailwind CSS.

## Features

- **Dashboard**: Real-time KPIs, charts, and quick insights
- **Employee Management**: Comprehensive onboarding, directory, and profile management
- **Digital Employee ID**: Auto-generated ID cards with QR codes
- **Attendance & Time Tracking**: Multiple tracking methods and shift management
- **Leave Management**: Apply, approve, and track leave requests
- **Payroll & Compensation**: Salary structure, payroll runs, and payslips
- **Performance Management**: Goals, 360° feedback, and appraisals
- **Employee Engagement**: Newsfeed, polls, and recognition
- **Reports & Analytics**: Comprehensive reporting with export capabilities

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Icons**: lucide-react
- **QR Codes**: qrcode.react
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd dotspeaks-hrm

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:8080`

## Project Structure

```
src/
├── components/
│   ├── dashboard/       # Dashboard-specific components
│   ├── layout/          # Layout components (Sidebar, Topbar)
│   └── ui/              # Reusable UI components (shadcn)
├── pages/               # Page components
│   ├── Dashboard.tsx
│   ├── employees/
│   └── ...
├── types/               # TypeScript type definitions
├── mocks/               # Mock data and API endpoints
├── lib/                 # Utility functions
└── hooks/               # Custom React hooks
```

## Mock API Endpoints

The following endpoints are mocked for frontend development. Replace with actual backend:

- `GET /api/employees` - List all employees
- `GET /api/employees/:id` - Get employee profile
- `POST /api/employees` - Create new employee
- `GET /api/attendance?date=YYYY-MM-DD` - Get attendance records
- `POST /api/leave` - Submit leave request
- `POST /api/payroll/run` - Process payroll
- `GET /api/reports/attrition?from=YYYY-MM-DD&to=YYYY-MM-DD` - Get attrition report

## Design System

The application uses a consistent design system based on:

- **Primary Color**: #0000CC (Blue)
- **Background**: White
- **Typography**: Inter font family
- **Border Radius**: 0.75rem (12px)
- **Spacing**: Tailwind's default scale

All colors are defined as HSL values in `src/index.css` and can be customized via CSS variables.

## Employee ID Format

Digital employee IDs follow this pattern:
```
DOT-<DEPT ABBR>-<YYYY>-<4 digit sequence>

Example: DOT-HR-2025-0005
```

## Building for Production

```bash
npm run build
```

The production build will be in the `dist` directory.

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## License

Proprietary - Dotspeaks © 2025
