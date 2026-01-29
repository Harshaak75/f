import { apiClient } from "../../lib/apiClient";

export type LeaveRequestDTO = {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  leaveType: string;
  startDate: string;  // yyyy-mm-dd
  endDate: string;    // yyyy-mm-dd
  days: number;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  appliedDate: string; // yyyy-mm-dd
  balanceInfo: {
    daysAllotted: number;
    daysUsed: number;
    daysRemaining: number;
  };
};

export const leaveService = {
  async list(status?: "Pending" | "Approved" | "Rejected"): Promise<LeaveRequestDTO[]> {
    const { data } = await apiClient.get<LeaveRequestDTO[]>("/admin", {
      params: status ? { status } : undefined,
    });
    return data;
  },

  async stats(): Promise<LeaveRequestDTO[]> {
    const { data } = await apiClient.get<LeaveRequestDTO[]>("/admin/leave/stats");
    return data;
  },

  // matches your backend routes exactly
  async approve(id: string, adminNotes?: string) {
    const { data } = await apiClient.post(`/admin/${id}/approve`, {
      adminNotes: adminNotes || undefined,
    });
    return data;
  },

  async reject(id: string, adminNotes: string) {
    const { data } = await apiClient.post(`/admin/${id}/reject`, {
      adminNotes, // required by backend
    });
    return data;
  },
};
