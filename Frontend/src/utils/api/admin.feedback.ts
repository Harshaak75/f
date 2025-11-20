import { apiClient } from "../../lib/apiClient";

/** ---- Types that mirror your backend payloads ---- */

export type CycleStatus = "DRAFT" | "ACTIVE" | "CLOSED";

export interface ReviewCycle {
  id: string;
  tenantId: string;
  name: string;
  startDate: string; // ISO
  endDate: string; // ISO
  status: CycleStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface SelfAssessment {
  id: string;
  userId: string;
  cycleId: string;
  status: "PENDING" | "SUBMITTED" | "REVIEWED";
  // included relations from BE:
  user?: {
    name: string | null;
    employeeProfile?: { designation?: string | null } | null;
  };
}

export interface PeerFeedback {
  id: string;
  cycleId: string;
  giverId: string;
  receiverId: string;
  // included relations from BE:
  giver?: { name: string | null };
  receiver?: { name: string | null };
}

export interface CycleDetails {
  cycle: ReviewCycle;
  selfAssessments: SelfAssessment[];
  peerFeedbacks: PeerFeedback[];
}

/** ---- Service wrappers ---- */

export const reviewsService = {
  /** GET /api/admin/reviews/cycles */
  async listCycles() {
    const { data } = await apiClient.get<ReviewCycle[]>(
      "/admin/reviews/cycles"
    );
    return data;
  },

  /** POST /api/admin/reviews/reviews/cycle  { name, startDate, endDate } */
  async createCycle(payload: {
    name: string;
    startDate: string;
    endDate: string;
  }) {
    const { data } = await apiClient.post<ReviewCycle>(
      "/admin/reviews/cycle",
      payload
    );
    return data;
  },

  /** POST /api/admin/reviews/reviews/cycle/:cycleId/launch */
  async launchCycle(cycleId: string) {
    const { data } = await apiClient.post<{ message: string }>(
      `/admin/reviews/cycle/${cycleId}/launch`,
      {}
    );
    return data;
  },

  /** GET /api/admin/reviews/reviews/cycle/:cycleId */
  async getCycleDetails(cycleId: string) {
    const { data } = await apiClient.get<CycleDetails>(
      `/admin/reviews/cycle/${cycleId}`
    );
    return data;
  },
};
