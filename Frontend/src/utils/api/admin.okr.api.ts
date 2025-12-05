import { apiClient } from "../../lib/apiClient";

/** Server enum is OkrStatus; we map it to UI labels. */
export type OkrStatus = "PLANNED" | "ON_TRACK" | "AT_RISK" | "COMPLETED";

export type KeyResultDTO = {
  id: string;
  keyResult: string;
  owner: string;
  progress: number; // 0..100
  status: "On Track" | "At Risk" | "Completed" | "Planned";
};

export type ObjectiveDTO = {
  id: string;
  objective: string;
  keyResults: KeyResultDTO[];
};

export const okrService = {
  /** GET /api/okr/getOKR?quarter=1&year=2025 */
  async list(params: { quarter: number; year: number }) {
    const { data } = await apiClient.get<ObjectiveDTO[]>("/okr/getOKR", {
      params,
    });
    return data;
  },

  /** POST /api/okr/objective */
  async createObjective(payload: {
    title: string;
    quarter: number;
    year: number;
    ownerId: string;
  }) {
    const { data } = await apiClient.post("/okr/objective", payload);
    return data as { id: string };
  },

  /** POST /api/okr/keyresult */
  async createKeyResult(payload: {
    title: string;
    ownerId: string;
    objectiveId: string;
  }) {
    const { data } = await apiClient.post("/okr/keyresult", payload);
    return data as { id: string };
  },

  /** PUT /api/okr/keyresult/:krId */
  async updateKeyResult(
    krId: string,
    payload: { progress: number; status: OkrStatus }
  ) {
    const { data } = await apiClient.put(`/okr/keyresult/${krId}`, payload);
    return data as { id: string };
  },

  async getPeriods() {
    const { data } = await apiClient.get<{ quarter: number; year: number }[]>(
      "/okr/available-periods"
    );
    return data;
  },
};

/* ----- helpers for status mapping between BE enum & UI ----- */

export function uiToServerStatus(ui: KeyResultDTO["status"]): OkrStatus {
  const s = ui.toLowerCase();
  if (s === "on track") return "ON_TRACK";
  if (s === "at risk") return "AT_RISK";
  if (s === "completed") return "COMPLETED";
  return "PLANNED";
}
export function serverToUiStatus(server: OkrStatus): KeyResultDTO["status"] {
  if (server === "ON_TRACK") return "On Track";
  if (server === "AT_RISK") return "At Risk";
  if (server === "COMPLETED") return "Completed";
  return "Planned";
}
