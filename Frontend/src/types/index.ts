export interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  bloodGroup?: string;
  department: string;
  designation: string;
  reportingManager?: string;
  employeeType: 'Full-time' | 'Part-time' | 'Contractor';
  employmentStatus: 'Active' | 'Inactive' | 'On Leave' | 'Terminated';
  joiningDate: string;
  workLocation: string;
  office: string;
  photoUrl?: string;
  bankAccount?: string;
  ifscCode?: string;
  panNumber?: string;
  aadharNumber?: string;
  emergencyContact?: {
    name: string;
    relation: string;
    phone: string;
  };
}

export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: 'Present' | 'Absent' | 'Half Day' | 'On Leave' | 'Holiday';
  workHours?: number;
  overtime?: number;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface Leave {
  id: string;
  employeeId: string;
  leaveType: 'Casual' | 'Sick' | 'Earned' | 'Maternity' | 'Paternity';
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  appliedDate: string;
  approvedBy?: string;
  approvedDate?: string;
}

export interface Payroll {
  id: string;
  employeeId: string;
  month: string;
  year: number;
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  grossSalary: number;
  pf: number;
  esi: number;
  tax: number;
  totalDeductions: number;
  netSalary: number;
  status: 'Draft' | 'Processed' | 'Paid';
}

export interface Performance {
  id: string;
  employeeId: string;
  reviewPeriod: string;
  goals: Goal[];
  overallRating: number;
  feedback: string;
  reviewedBy: string;
  reviewDate: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  weight: number;
  startDate: string;
  endDate: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  achievement?: number;
}

export interface Document {
  id: string;
  type: 'Aadhar' | 'PAN' | 'Passport' | 'Bank Proof' | 'Education Certificate';
  fileName: string;
  fileUrl: string;
  uploadDate: string;
  verified: boolean;
}

export interface Asset {
  id: string;
  type: 'Laptop' | 'Phone' | 'ID Card' | 'SIM Card' | 'Other';
  brand?: string;
  model?: string;
  serialNumber: string;
  assignedDate: string;
  returnDate?: string;
  condition: 'New' | 'Good' | 'Fair' | 'Poor';
}

export interface OnboardingStep {
  id: string;
  title: string;
  completed: boolean;
  completedDate?: string;
}
