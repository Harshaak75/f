// src/utils/api/analyticsService.ts
import { apiClient } from "../../lib/apiClient";

// ---------- Types from your backend ----------
export type SummaryResp = {
  attritionRate: { value: string; trend: string; trendType: "positive" | "negative" | "neutral" };
  avgPerformanceScore: { value: string; trend: string; trendType: "positive" | "negative" | "neutral" };
  totalMonthlyPayroll: { value: string; trend: string; trendType: "positive" | "negative" | "neutral" };
  avgAbsenceRate: { value: string; trend: string; trendType: "positive" | "negative" | "neutral" };
};

export type ChartsResp = {
  headcountData: { month: string; Headcount: number }[];
  payrollData: { department: string; cost: number; color: string }[]; // cost in Cr
  performanceData: { name: string; value: number; color: string }[];
};

export type SavedReport = {
  id: string;
  name: string;
  owner: string;
  frequency: string;
  lastRun: string;         // YYYY-MM-DD
  exportOptions: string;   // "XLS, PDF, CSV"
};

// ---------- API ----------
export const analyticsService = {
  getSummary: async () => {
    const { data } = await apiClient.get<SummaryResp>("/analytics/summary");
    return data;
  },
  getCharts: async () => {
    const { data } = await apiClient.get<ChartsResp>("/analytics/charts");
    return data;
  },
  getSavedReports: async () => {
    const { data } = await apiClient.get<SavedReport[]>("/analytics/saved-reports");
    return data;
  },
  createSavedReport: async (payload: {
    name: string;
    dataDomain: "payroll" | "attendance" | "performance" | "attrition";
    frequency: "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Ad-hoc";
    exportOptions: string[]; // ["PDF", "XLS"]
  }) => {
    const { data } = await apiClient.post("/analytics/saved-reports", payload);
    return data;
  },
  downloadReport: (id: string) => {
    // Open in new tab to trigger the server stream (PDF download)
    const url = `${apiClient.defaults.baseURL?.replace(/\/$/, "")}/analytics/saved-reports/${id}/download`;
    window.open(url, "_blank", "noopener,noreferrer");
  },
};
