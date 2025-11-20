import { apiClient } from "../../lib/apiClient";

export type AttendanceLog = {
  id: string;
  employeeId: string;     // public-facing employeeId (from profile)
  employeeName: string;   // built in backend
  timestamp: string;      // ISO
  type: "GEO" | string;   // hardcoded in backend right now
  action: "CHECK_IN" | "CHECK_OUT";
  location?: string;
  verified?: boolean;
};

export const attendanceService = {
  // You can pass optional params if/when backend adds filtering.
  getLogs: async (params?: { dateFrom?: string; dateTo?: string; type?: string }) => {
    const { data } = await apiClient.get<AttendanceLog[]>("/employee/logs", { params });
    return data;
  },
};
