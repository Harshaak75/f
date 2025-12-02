import { apiClient } from "../../lib/apiClient";

export const NotificationAPI = {
  getMy: async () => {
    const { data } = await apiClient.get("/admin/notifications/my");
    return data;
  },
  markRead: async (id: string) => {
    const { data } = await apiClient.post("/admin/notifications/mark-read", { id });
    return data;
  }
};