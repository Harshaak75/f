import { apiClient } from "../../lib/apiClient";

/** Wire to your /api/promotions routes */

export type PromotionStatus =
  | "PENDING_HR"
  | "PENDING_MANAGER"
  | "APPROVED"
  | "REJECTED"
  | "DRAFT";

export interface PromotionRequestDTO {
  id: string;
  employeeName: string;
  currentRole: string;
  proposedRole: string;
  incrementPercentage: number;
  budgetImpact: string; // already formatted "₹…"
  status: string;       // backend sends raw enum string; show as-is or map
  lastUpdated: string;  // string in the formatted response
}

export interface CreatePromotionPayload {
  userId: string;
  cycleId: string;
  proposedDesignation: string;
  proposedAnnualCTC: number | string;
  managerNotes?: string;
}

export const promotionsService = {
  /** GET /api/promotions?cycleId=... */
  async list(cycleId: string) {
    const { data } = await apiClient.get<PromotionRequestDTO[]>("/promotions/getPromotion", {
      params: { cycleId },
    });
    return data;
  },

  /** POST /api/promotions */
  async create(payload: CreatePromotionPayload) {
    const { data } = await apiClient.post("/promotions/createPromotion", payload);
    return data;
  },

  /** POST /api/promotions/:requestId/approve */
  async approve(requestId: string, hrNotes?: string) {
    const { data } = await apiClient.post(`/promotions/${requestId}/approve`, {
      hrNotes,
    });
    return data;
  },

  /** POST /api/promotions/:requestId/reject */
  async reject(requestId: string, hrNotes: string) {
    const { data } = await apiClient.post(`/promotions/${requestId}/reject`, {
      hrNotes,
    });
    return data;
  },
};
