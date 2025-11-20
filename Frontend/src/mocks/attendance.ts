import { Attendance } from '@/types';

export const mockAttendance: Attendance[] = [
  {
    id: '1',
    employeeId: '1',
    date: '2025-01-14',
    checkIn: '09:15',
    checkOut: '18:30',
    status: 'Present',
    workHours: 9.25,
  },
  {
    id: '2',
    employeeId: '2',
    date: '2025-01-14',
    checkIn: '09:00',
    checkOut: '18:00',
    status: 'Present',
    workHours: 9,
  },
  {
    id: '3',
    employeeId: '3',
    date: '2025-01-14',
    checkIn: '09:30',
    status: 'Present',
    workHours: 0,
  },
  {
    id: '4',
    employeeId: '4',
    date: '2025-01-14',
    checkIn: '09:10',
    checkOut: '18:15',
    status: 'Present',
    workHours: 9.08,
  },
  {
    id: '5',
    employeeId: '5',
    date: '2025-01-14',
    status: 'On Leave',
  },
];

export const getAttendanceStats = () => {
  const total = mockAttendance.length;
  const present = mockAttendance.filter(a => a.status === 'Present').length;
  const absent = mockAttendance.filter(a => a.status === 'Absent').length;
  const onLeave = mockAttendance.filter(a => a.status === 'On Leave').length;

  return {
    total,
    present,
    absent,
    onLeave,
    presentPercentage: ((present / total) * 100).toFixed(1),
  };
};
