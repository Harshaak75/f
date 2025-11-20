// src/utils/api/milestonesService.ts
import { apiClient } from "../../lib/apiClient";

export type MilestoneEvent = {
  id: string;
  name: string;
  department: string;
  date: string;       // "MM/DD"
  isToday: boolean;
  years?: number;     // present for anniversaries
};

export type SummaryCard = {
  title: string;
  value: string;
  unit: string;
  icon: "Cake" | "Briefcase" | "Clock" | "Mail";
};

export type MilestonesDashboard = {
  summaryCards: SummaryCard[];
  birthdays: MilestoneEvent[];
  anniversaries: MilestoneEvent[];
};

export type MilestoneSettings = {
  enableBirthdayEmails: boolean;
  enableAnniversaryEmails: boolean;
  milestoneEmailTemplate?: string | null;
};

export const milestonesService = {
  // Admin only (per backend)
  getDashboard: async () => {
    const { data } = await apiClient.get<MilestonesDashboard>("/birthdays");
    return data;
  },

  getSettings: async () => {
    const { data } = await apiClient.get<MilestoneSettings>("/birthdays/settings");
    return data;
  },

  updateSettings: async (payload: {
    enableBirthdayEmails: boolean;
    enableAnniversaryEmails: boolean;
  }) => {
    const { data } = await apiClient.put("/birthdays/settings", payload);
    return data;
  },
};
