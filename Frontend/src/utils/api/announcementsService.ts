import { apiClient } from "../../lib/apiClient";

export type AnnouncementCategory = 'HR' | 'IT' | 'Culture' | 'Event' | 'Policy';
export type AnnouncementStatus = 'DRAFT' | 'PUBLISHED' | 'SCHEDULED';

export interface AnnouncementItem {
  id: string;
  title: string;
  category: AnnouncementCategory;
  snippet: string;
  date: string;       // "YYYY-MM-DD"
  isRead: boolean;
  engagement: number; // currently 0 from API (admin path returns summaryCards too)
  status?: AnnouncementStatus; // present for admin payload
}

export interface AdminListResponse {
  announcements: AnnouncementItem[];
  summaryCards: {
    unread: number;
    upcomingEvents: number;
    engagementRate: string;
    drafts: number;
  };
}

export interface CreateAnnouncementPayload {
  title: string;
  content?: string;
  category: AnnouncementCategory;
  status: AnnouncementStatus;   // DRAFT, PUBLISHED, SCHEDULED
  publishAt?: string | null;    // ISO string (when SCHEDULED)
}

export const announcementsService = {
  async list() {
    // Admin gets { announcements, summaryCards }, Employee gets AnnouncementItem[]
    const { data } = await apiClient.get("/announcements");
    return data as AdminListResponse | AnnouncementItem[];
  },

  async create(payload: CreateAnnouncementPayload) {
    const { data } = await apiClient.post("/announcements", payload);
    return data;
  },

  async markRead(id: string) {
    const { data } = await apiClient.post(`/announcements/${id}/read`);
    return data;
  },
};
