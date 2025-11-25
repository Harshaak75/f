// src/lib/services/employeeService.ts
import { apiClient } from "../../../lib/apiClient";

// ---------- Types (aligned with your backend responses) ----------
export type AttendanceRecord = {
  id: string;
  date: string;                // ISO (from DB Date)
  checkIn: string | null;      // ISO
  checkOut: string | null;     // ISO
  hoursWorked: number | null;
  status: "PRESENT" | "ABSENT" | "LEAVE" | "HALF_DAY";
};

export type LeaveBalanceRow = {
  policyId: string;
  policyName: string;
  year: number;
  daysAllotted: number;
  daysUsed: number;
  daysRemaining: number;
};

export type LeaveDashboard = {
  balances: LeaveBalanceRow[];
  requests: Array<{
    id: string;
    policyId: string;
    startDate: string;
    endDate: string;
    days: number;
    reason: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  }>;
};

export type RecognitionFeedItem = {
  id: string;
  sender: string;
  receiver: string;
  award: string;
  message: string;
  date: string; // ISO
};

export type AnnouncementListItem = {
  id: string;
  title: string;
  category: string;
  snippet: string;
  date: string; // YYYY-MM-DD
  isRead: boolean;
  status?: "DRAFT" | "PUBLISHED" | "SCHEDULED" | "ARCHIVED"; // admin only
};

// Latest payslip shape: your employee route returns a PayrollRun
// with an included array of PayrollRunItems for the current user.
// We'll normalize it to what the UI needs.
export type LatestPayslip = {
  payslipId: string;
  month: string; // e.g. "February"
  year: number;
  netSalary: number;
};

// ---------- Helpers ----------
const downloadBlob = (blob: Blob, fallbackFilename: string, contentDisposition?: string | null) => {
  let filename = fallbackFilename;
  if (contentDisposition) {
    const match = /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(contentDisposition);
    if (match?.[1]) filename = decodeURIComponent(match[1]);
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
};

// ---------- API Calls ----------
export const employeeService = {
  // ATTENDANCE (Tenant API expects geolocation + timestamps)
  checkIn: async (employeeId: string, checkInTime: string) => {
    const { data } = await apiClient.post(`/incoming/attendance/check-in`, {
      employeeId,
      checkInTime,
    });
    return data as { message: string; recordId: string };
  },

  checkOut: async (employeeId: string, checkOutTime: string) => {
    const { data } = await apiClient.post(`/incoming/attendance/check-out`, {
      employeeId,
      checkOutTime,
    });
    return data as { message: string; record: AttendanceRecord };
  },

  getTodayAttendance : async() =>{
    const {data} = await apiClient.get("/incoming/status/today")

    return data as {
    checkedIn: boolean;
    checkedOut: boolean;
    checkInTime?: string;
    checkOutTime?: string;
  };
  },


  // LEAVE (Employee)
  getLeaveDashboard: async () => {
    const { data } = await apiClient.get<LeaveDashboard>(`/employee/getLeave`); 
    // path explanation:
    // your leave router shows: router.get("/getLeave", protect, ...)
    // if your axios baseURL already includes /api, this resolves to /api/getLeave
    // using a relative path here keeps it robust if your routes are mounted under /api
    return data;
  },

  applyLeave: async (policyId: string, startDate: string, endDate: string, days: number, reason: string) => {
    const { data } = await apiClient.post(`/employee/ApplyLeave`, {
      policyId,
      startDate,
      endDate,
      days,
      reason,
    });
    return data as { message: string; request: any };
  },

  // RECOGNITION
  getRecognitionFeed: async () => {
    const { data } = await apiClient.get<RecognitionFeedItem[]>(`/recognition`);
    return data;
  },

  submitRecognition: async (receiverId: string, badgeId: string, message: string) => {
    const { data } = await apiClient.post(`/recognition`, {
      receiverId,
      badgeId,
      message,
    });
    return data;
  },

  // ANNOUNCEMENTS
  getAnnouncements: async () => {
    const { data } = await apiClient.get<AnnouncementListItem[]>(`/announcements`);
    return data;
  },

  markAnnouncementRead: async (announcementId: string) => {
    const { data } = await apiClient.post(`/announcements/${announcementId}/read`);
    return data as { message: string };
  },

  // PAYSLIP (Employee latest + download)
  getLatestPayslip: async (): Promise<LatestPayslip | null> => {
    // your employee route example was "router.get('/GetmuPayslip', ...)"
    // It's likely mounted under /api/payslips OR /api. Here we call it directly.
    const { data } = await apiClient.get<any>(`/payroll/GetmyPayslip`);
    // "data" is a PayrollRun with "payrollRunItems" (filtered client-side in BE fix).
    if (!data || !data.payrollRunItems || data.payrollRunItems.length === 0) return null;

    const item = data.payrollRunItems[0];
    const monthIndex = data.month ? Number(data.month) - 1 : new Date().getMonth();
    const monthName = new Date(data.year, monthIndex).toLocaleString("default", { month: "long" });

    return {
      payslipId: item.id,
      month: monthName,
      year: Number(data.year),
      netSalary: Number(item.netSalary ?? 0),
    };
  },

  downloadPayslip: async (payslipId: string) => {
    // your admin download route: router.get('/:payslipId/download', ...)
    // assuming this router is mounted at /api/payslips:
    const response = await apiClient.get(`/payroll/${payslipId}/download`, {
      responseType: "blob",
    });
    const cd = response.headers["content-disposition"] as string | undefined;
    downloadBlob(response.data, `Payslip-${payslipId}.pdf`, cd ?? null);
  },

  // LEADERBOARD (if you use it elsewhere)
  getLeaderboard: async () => {
    const { data } = await apiClient.get(`/recognition/leaderboard`);
    return data as Array<{ rank: number; name: string; department: string; points: number }>;
  },
};
