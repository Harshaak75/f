import { apiClient } from "../../lib/apiClient";

/** Already used elsewhere */
export type CycleStatus = "DRAFT" | "ACTIVE" | "CLOSED";

export interface ReviewCycle {
  id: string;
  tenantId: string;
  name: string;
  startDate: string; // ISO
  endDate: string;   // ISO
  status: CycleStatus;
}

/** New: Dashboard Stats types */
export interface DashboardStageProgress {
  stage: string;
  completionRate: number; // 0-100
  pendingCount: number;
}

export interface DashboardSummaryCards {
  overallCompletion: number;      // %
  assessmentsCompleted: string;   // "x / y"
  feedbackReceived: string;       // "x / y"
  averageScore: string;           // "4.2"
}

export interface DashboardAutomationSetting {
  name: string;
  description: string;
  isEnabled: boolean;
  action: string; // "Enabled" | "Configured" | "Disabled"
}

export interface DashboardMeritBudget {
  totalPool: number;   // e.g. 25000000
  allocated: number;   // e.g. 16000000
  remaining: number;   // e.g.  9000000
}

export interface DashboardStats {
  stageProgressData: DashboardStageProgress[];
  summaryCards: DashboardSummaryCards;
  automationSettings: DashboardAutomationSetting[];
  meritBudget: DashboardMeritBudget;
}

export const reviewsServiceAppraisal = {
  /** Cycles list (optional, for selector) */
  async listCycles() {
    const { data } = await apiClient.get<ReviewCycle[]>("/admin/reviews/cycles");
    return data;
  },

  /** Dashboard stats for a cycle */
  async getDashboardStats(cycleId: string) {
    const { data } = await apiClient.get<DashboardStats>(
      "/admin/reviews/dashboard-stats",
      { params: { cycleId } }
    );
    return data;
  },
};
