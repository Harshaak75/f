import { apiClient } from "../../lib/apiClient";

export const dashboardService = {
  /** GET /adminDashboard/headcount */
  async getHeadcount() {
    const { data } = await apiClient.get<{
      total: number;
      active: number;
    }>("/adminDashboard/headcount");

    return data;
  },

  /** GET /adminDashboard/attendance-today */
  async getAttendanceToday() {
    const { data } = await apiClient.get<{
      present: number;
      absent: number;
      onLeave: number;
      presentPercentage: number;
    }>("/adminDashboard/attendance-today");

    return data;
  },

  /** GET /adminDashboard/attrition */
  async getAttrition() {
    const { data } = await apiClient.get<{
      attritionRate: number;
    }>("/adminDashboard/attrition");

    return data;
  },

  /** GET /adminDashboard/open-positions */
  async getOpenPositions() {
    const { data } = await apiClient.get<{
      count: number;
      critical: number;
    }>("/adminDashboard/open-positions");

    return data;
  },

  /** GET /adminDashboard/payroll-run */
  async getPayrollRun() {
    const { data } = await apiClient.get<{
      nextRunDate: string;
      daysRemaining: number;
    }>("/adminDashboard/payroll-run");

    return data;
  },

  /** GET /adminDashboard/headcount-trend */
  async getHeadcountTrend() {
    const { data } = await apiClient.get<
      { month: string; count: number }[]
    >("/adminDashboard/headcount-trend");

    return data;
  },

  /** GET /adminDashboard/departments */
  async getDepartmentDistribution() {
    const { data } = await apiClient.get<
      { name: string; value: number }[]
    >("/adminDashboard/departments");

    return data;
  },

  /** GET /adminDashboard/alerts */
  async getAlerts() {
    const { data } = await apiClient.get<{
      pendingOffers: number;
      pendingClearances: number;
      upcomingAnniversaries: number;
    }>("/adminDashboard/alerts");

    return data;
  },

  /** GET /adminDashboard/recent-hires */
  async getRecentHires() {
    const { data } = await apiClient.get<
      {
        id: string;
        firstName: string;
        lastName: string;
        designation: string;
        department: string;
        photoUrl: string;
      }[]
    >("/adminDashboard/recent-hires");

    return data;
  },
};
