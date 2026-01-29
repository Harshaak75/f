// src/utils/api/exitService.ts
import { apiClient } from "../../lib/apiClient";

// ---- Types (match your backend responses) ----
export type ExitDashboardStats = {
  activeExitCases: string;     // "12"
  avgNoticePeriod: string;     // "48"
  pendingClearances: string;   // "55"
  fnfAutomation: string;       // "88%"
};

export type ExitCase = {
  id: string;
  employee: string;
  department: string;
  resignationDate: string; // "YYYY-MM-DD"
  lastDay: string;         // "YYYY-MM-DD"
  noticePeriod: number;    // days
  status: string;          // e.g., "ACTIVE" | "PENDING_FNF" | "COMPLETED"
  clearanceProgress: number; // 0..100
  fnfCompletedAt?: string | null;
};

export type ClearanceStatusCounts = {
  IT: number;
  FINANCE: number;
  HR: number;
  MANAGER: number;
};

// ---- API client ----
export const exitService = {
  getDashboardStats: async () => {
    const { data } = await apiClient.get<ExitDashboardStats>("/exit/dashboard-stats");
    return data;
  },
  getClearanceTasks: async (exitCaseId: string) => {
    const { data } = await apiClient.get<any[]>(`/exit/${exitCaseId}/clearance`);
    return data;
  },
  approveClearance: async (taskId: string) => {
    const { data } = await apiClient.post(`/exit/clearance/${taskId}/approve`);
    return data;
  },
  completeFnf: async (exitCaseId: string, payload: any) => {
    const { data } = await apiClient.post(
      `/exit/${exitCaseId}/complete-fnf`,
      payload
    );
    return data;
  },
  getPastExitCases: async (filters: any) => {
    const params = new URLSearchParams(filters);
    const res = await apiClient.get(`/exit/past?${params.toString()}`);
    return res.data;
  },
  searchEmployees: async (q: string) => {
    const { data } = await apiClient.get<any[]>(`/exit/employees/search?q=${q}`);
    return data;
  },
  getActiveExitCases: async () => {
    const { data } = await apiClient.get<ExitCase[]>("/exit");
    return data;
  },
  getClearanceStatus: async () => {
    const { data } = await apiClient.get<ClearanceStatusCounts>("/exit/clearance-status");
    return data;
  },
  logResignation: async (payload: {
    userId: string;
    resignationDate: string; // ISO (YYYY-MM-DD)
    lastDay: string;         // ISO (YYYY-MM-DD)
    reason?: string;
  }) => {
    const { data } = await apiClient.post("/exit", payload);
    return data;
  },
  // Optional: approve clearance task (wire when you add UI)
  approveClearanceTask: async (taskId: string) => {
    const { data } = await apiClient.post(`/exit/clearance/${taskId}/approve`);
    return data;
  },
};
