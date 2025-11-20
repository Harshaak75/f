import React, { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { useToast } from "../../hooks/use-toast";

import {
  Bell, MailOpen, CalendarCheck, TrendingUp, Filter, MessageSquare, Plus, Clock, ChevronsRight,
  Loader2
} from "lucide-react";
import {
  AdminListResponse,
  AnnouncementCategory,
  AnnouncementItem,
  announcementsService,
  AnnouncementStatus
} from "../../utils/api/announcementsService";

/* ---------------- helpers ---------------- */

const getCategoryStyle = (category: AnnouncementCategory) => {
  switch (category) {
    case "HR": return "bg-blue-500 hover:bg-blue-600";
    case "IT": return "bg-purple-500 hover:bg-purple-600";
    case "Culture": return "bg-pink-500 hover:bg-pink-600";
    case "Event": return "bg-amber-500 hover:bg-amber-600";
    case "Policy": return "bg-red-500 hover:bg-red-600";
    default: return "bg-gray-500 hover:bg-gray-600";
  }
};

const isAdminResponse = (data: any): data is AdminListResponse =>
  data && typeof data === "object" && Array.isArray(data.announcements) && !!data.summaryCards;

/* ---------------- item ---------------- */

const AnnouncementItemRow: React.FC<{
  announcement: AnnouncementItem;
}> = ({ announcement }) => (
  <Card
    className={`p-4 flex gap-4 items-center transition-all ${
      announcement.isRead
        ? "bg-white"
        : "bg-blue-50"
    }`}
  >
    <div className="flex-shrink-0">
      {announcement.isRead
        ? <Bell className="h-6 w-6 text-gray-400" />
        : <Bell className="h-6 w-6 text-red-500" />
      }
    </div>
    <div className="flex-grow">
      <div className="flex justify-between items-start">
        <h3 className={`font-semibold ${announcement.isRead ? "text-gray-700" : "text-gray-900"}`}>{announcement.title}</h3>
        <Badge className={`ml-4 text-xs font-medium text-white ${getCategoryStyle(announcement.category)}`}>
          {announcement.category}
        </Badge>
      </div>
      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{announcement.snippet}</p>
    </div>
    <div className="flex-shrink-0 w-24 text-right">
      <p className="text-xs font-medium text-gray-500">{announcement.date}</p>
      <p className="text-xs text-gray-400 mt-1">Eng: {announcement.engagement ?? 0}%</p>
    </div>
  </Card>
);

/* ---------------- main ---------------- */

export default function AnnouncementFeedDashboard() {
  const { toast } = useToast();

  const [filter, setFilter] = useState<"all" | AnnouncementCategory>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // data (admin or employee normalized to a simple list + maybe summary)
  const [items, setItems] = useState<AnnouncementItem[]>([]);
  const [summary, setSummary] = useState<AdminListResponse["summaryCards"] | null>(null);

  // create dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<AnnouncementCategory>("HR");
  const [status, setStatus] = useState<AnnouncementStatus>("DRAFT");
  const [publishAt, setPublishAt] = useState<string>("");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await announcementsService.list();
      if (isAdminResponse(data)) {
        setItems(data.announcements);
        setSummary(data.summaryCards);
      } else {
        setItems(data);
        setSummary(null);
      }
    } catch (e: any) {
      toast({
        title: "Failed to load announcements",
        description: e?.response?.data?.message || e?.message,
        variant: "destructive",
      });
      setItems([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let list = items;
    if (filter !== "all") list = list.filter(a => a.category === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.snippet.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, filter, search]);

  // NOTE: Removed mark-read function and any click handlers

  const createAnnouncement = async () => {
    if (!title.trim() || !status || !category) {
      toast({ title: "Missing fields", description: "Title, category and status are required.", variant: "destructive" });
      return;
    }
    if (status === "SCHEDULED" && !publishAt) {
      toast({ title: "Schedule required", description: "Provide a publish date/time for scheduled announcements.", variant: "destructive" });
      return;
    }
    try {
      setCreating(true);
      await announcementsService.create({
        title: title.trim(),
        content: content.trim() || undefined,
        category,
        status,
        publishAt: publishAt ? new Date(publishAt).toISOString() : null,
      });
      toast({ title: "Created", description: "Announcement has been created." });
      setIsCreateOpen(false);
      setTitle(""); setContent(""); setPublishAt(""); setStatus("DRAFT"); setCategory("HR");
      await load();
    } catch (e: any) {
      toast({ title: "Create failed", description: e?.response?.data?.message || e?.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  // summary cards — prefer admin summary when present; otherwise derive basic values
  const cards = useMemo(() => {
    if (summary) {
      return [
        { title: "Unread", value: String(summary.unread ?? 0), unit: "Announcements", icon: MailOpen, color: "text-red-600", bgColor: "bg-red-50" },
        { title: "Upcoming Events", value: String(summary.upcomingEvents ?? 0), unit: "Scheduled this month", icon: CalendarCheck, color: "text-indigo-600", bgColor: "bg-indigo-50" },
        { title: "Avg Engagement Rate", value: String(summary.engagementRate ?? "N/A"), unit: "Last 7 Days", icon: TrendingUp, color: "text-green-600", bgColor: "bg-green-50" },
        { title: "Drafts", value: String(summary.drafts ?? 0), unit: "Unpublished", icon: Clock, color: "text-gray-600", bgColor: "bg-gray-50" },
      ];
    }
    const unread = items.filter(i => !i.isRead).length;
    return [
      { title: "Unread", value: String(unread), unit: "Announcements", icon: MailOpen, color: "text-red-600", bgColor: "bg-red-50" },
      { title: "Upcoming Events", value: "—", unit: "Scheduled this month", icon: CalendarCheck, color: "text-indigo-600", bgColor: "bg-indigo-50" },
      { title: "Avg Engagement Rate", value: "—", unit: "Last 7 Days", icon: TrendingUp, color: "text-green-600", bgColor: "bg-green-50" },
      { title: "Drafts", value: "—", unit: "Unpublished", icon: Clock, color: "text-gray-600", bgColor: "bg-gray-50" },
    ];
  }, [summary, items]);

  return (
    <div className="space-y-8 p-4 sm:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Bell className="h-7 w-7 text-indigo-600" />
            Internal Announcement Feed
          </h1>
          <p className="text-gray-500 mt-1">Official company communications and updates.</p>
        </div>
        <div className="flex gap-3">
          <div className="hidden sm:block">
            <Input
              placeholder="Search announcements…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[220px]"
            />
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-[180px] border-gray-300 bg-white shadow-sm">
              <Filter className="h-4 w-4 mr-2 text-gray-400" />
              <SelectValue placeholder="Filter Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="HR">HR & Policy</SelectItem>
              <SelectItem value="IT">IT & Security</SelectItem>
              <SelectItem value="Event">Events & Culture</SelectItem>
              <SelectItem value="Culture">Culture</SelectItem>
              <SelectItem value="Policy">Policy</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setIsCreateOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 shadow-md">
            <Plus className="mr-2 h-4 w-4" />
            Create Announcement
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => {
          const Icon = card.icon as any;
          return (
            <Card key={card.title} className={`p-5 border-l-4 border-indigo-500 hover:shadow-lg transition duration-200 ${card.bgColor}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">{card.title}</h3>
                  <p className={`text-3xl font-bold mt-2 ${card.color}`}>{card.value}</p>
                </div>
                <Icon className={`h-8 w-8 p-1.5 rounded-full ${card.color} bg-opacity-20`} />
              </div>
              <p className="text-xs text-gray-400 mt-1">{card.unit}</p>
            </Card>
          );
        })}
      </div>

      {/* Feed + Side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Feed */}
        <Card className="p-6 shadow-xl lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-indigo-500" />
              Latest Company Updates
            </h2>
            <Button variant="outline" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Refresh
            </Button>
          </div>

          <div className="space-y-4">
            {filtered.map((announcement) => (
              <AnnouncementItemRow
                key={announcement.id}
                announcement={announcement}
              />
            ))}
            {!filtered.length && !loading && (
              <p className="text-sm text-muted-foreground py-6 text-center">No announcements found.</p>
            )}
          </div>

          <Button variant="link" className="mt-6 p-0 text-indigo-600 h-auto">
            Load More History <ChevronsRight className="ml-1 h-3 w-3" />
          </Button>
        </Card>

        {/* Side: placeholders (scheduled/drafts) */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 shadow-xl">
            <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-green-500" />
              Scheduled Posts
            </h3>
            <p className="text-sm text-muted-foreground">Coming soon — hook to a calendar list from backend if needed.</p>
          </Card>

          <Card className="p-6 shadow-xl">
            <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Drafts and Review
            </h3>
            <p className="text-sm text-muted-foreground">Show drafts for admins; hidden for employees.</p>
          </Card>
        </div>
      </div>

      {/* Create Announcement Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Announcement</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm">Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quarterly update…" />
            </div>

            <div>
              <Label className="text-sm">Content (optional)</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} placeholder="Write the full announcement…" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm">Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as AnnouncementCategory)}>
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HR">HR</SelectItem>
                    <SelectItem value="IT">IT</SelectItem>
                    <SelectItem value="Culture">Culture</SelectItem>
                    <SelectItem value="Event">Event</SelectItem>
                    <SelectItem value="Policy">Policy</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as AnnouncementStatus)}>
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PUBLISHED">Publish Now</SelectItem>
                    <SelectItem value="SCHEDULED">Schedule</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm">Publish At (if Scheduled)</Label>
                <Input
                  type="datetime-local"
                  value={publishAt}
                  onChange={(e) => setPublishAt(e.target.value)}
                  disabled={status !== "SCHEDULED"}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={createAnnouncement} disabled={creating}>
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
