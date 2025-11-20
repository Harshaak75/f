// src/utils/api/complianceService.ts
import { apiClient } from "../../lib/apiClient";

// --- API types (match your backend responses) ---

export type ComplianceDashboard = {
  totalPolicies: number;            // number
  avgAcknowledgmentRate: string;    // e.g. "74%"
  openGrievances: string;           // e.g. "3"
  trainingCompletion: string;       // e.g. "85%"
};

export type Policy = {
  id: string;
  name: string;
  version: string;
  category: string;
  lastUpdated: string;       // "YYYY-MM-DD"
  acknowledgmentRate: number; // e.g. 85.33
};

export type Grievance = {
  id: string;
  type: "Grievance" | "Disciplinary" | "POSH";
  status: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "Open" | "Under Review" | "Resolved";
  dateFiled: string; // "YYYY-MM-DD"
};

export const complianceService = {
  getDashboard: async () => {
    const { data } = await apiClient.get<ComplianceDashboard>("/compliance/dashboard");
    return data;
  },
  getPolicies: async () => {
    const { data } = await apiClient.get<Policy[]>("/compliance/policies");
    return data;
  },
  getGrievances: async () => {
    const { data } = await apiClient.get<Grievance[]>("/compliance/grievances");
    return data;
  },
};
