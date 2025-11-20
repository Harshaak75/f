// src/utils/api/recognitionService.ts
import { apiClient } from "../../lib/apiClient";

export type RecognitionFeedItem = {
  id: string;
  sender: string;
  receiver: string;
  award: string; // badge name
  message: string;
  date: string; // ISO string
};

export type LeaderboardRow = {
  rank: number;
  name: string;
  department: string;
  points: number;
};

export type Badge = {
  id: string;
  name: string;
  icon: string;   // stored in DB as text; UI will not render the icon component by name
  color: string;  // can be hex or tailwind color; UI shows a dot if hex or uses class if valid
  points: number;
};

export const recognitionService = {
  // Feed (All users)
  getFeed: async () => {
    const { data } = await apiClient.get<RecognitionFeedItem[]>("/recognition");
    return data;
  },

  // Leaderboard (All users)
  getLeaderboard: async () => {
    const { data } = await apiClient.get<LeaderboardRow[]>("/recognition/leaderboard");
    return data;
  },

  // Badges (Admin only; returns 403 for non-admins)
  getBadges: async () => {
    const { data } = await apiClient.get<Badge[]>("/recognition/badges");
    return data;
  },

  // Give Recognition (All users)
  giveRecognition: async (payload: {
    receiverId: string;
    badgeId: string;
    message: string;
  }) => {
    const { data } = await apiClient.post("/recognition", payload);
    return data;
  },

  // (Optional) Create badge (Admin)
  createBadge: async (payload: { name: string; icon: string; color: string; points: number }) => {
    const { data } = await apiClient.post("/recognition/badges", payload);
    return data;
  },
};
