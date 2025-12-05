import { apiClient } from "../../lib/apiClient";

export const LeavePoliciesAPI = {
  // GET all policies
  getPolicies: async () => {
    const { data } = await apiClient.get("/leave/policies");
    return data;
  },

  // CREATE new policy
  createPolicy: async (payload: { name: string; defaultDays: number }) => {
    const { data } = await apiClient.post("/leave/policies", payload);
    return data;
  },

  // UPDATE policy
  updatePolicy: async (
    id: string,
    payload: { name: string; defaultDays: number }
  ) => {
    const { data } = await apiClient.put(`/leave/policies/${id}`, payload);
    return data;
  },

  // DELETE policy
  deletePolicy: async (id: string) => {
    const { data } = await apiClient.delete(`/leave/policies/${id}`);
    return data;
  },
};
