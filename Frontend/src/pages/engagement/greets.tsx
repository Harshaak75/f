import React, { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge as UiBadge } from "../../components/ui/badge";
import { useToast } from "../../hooks/use-toast";
import {
  Dialog,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Switch } from "../../components/ui/switch";

import {
  CalendarDays,
  Cake,
  Briefcase,
  Mail,
  Clock,
  Users,
  Settings,
  ArrowRight,
  RefreshCw,
  Star,
} from "lucide-react";
import {
  MilestoneEvent,
  MilestonesDashboard,
  MilestoneSettings,
  milestonesService,
  SummaryCard,
} from "../../utils/api/admin.birthday.api";

// Small spinner for buttons
const Spinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={`animate-spin h-4 w-4 ${className || ""}`}
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
    />
  </svg>
);

// Skeleton div
const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} />
);

// Icons map for summary cards from API
const summaryIconMap: Record<SummaryCard["icon"], React.ElementType> = {
  Cake,
  Briefcase,
  Clock,
  Mail,
};

const EventItem: React.FC<{
  event: MilestoneEvent;
  isAnniversary?: boolean;
}> = ({ event, isAnniversary }) => (
  <div
    className={`flex items-center p-3 rounded-xl transition duration-150 ${
      event.isToday
        ? "bg-yellow-100 border border-yellow-300 shadow-md"
        : "bg-white hover:bg-gray-50 border border-gray-100"
    }`}
  >
    <div
      className={`flex-shrink-0 p-2 rounded-full ${
        isAnniversary ? "bg-indigo-100" : "bg-pink-100"
      }`}
    >
      {isAnniversary ? (
        <Briefcase className="h-5 w-5 text-indigo-500" />
      ) : (
        <Cake className="h-5 w-5 text-pink-500" />
      )}
    </div>
    <div className="flex-grow ml-4">
      <p
        className={`font-semibold ${
          event.isToday ? "text-gray-900" : "text-gray-700"
        }`}
      >
        {event.name}
      </p>
      <p className="text-xs text-gray-500">{event.department}</p>
    </div>
    <div className="text-right">
      <UiBadge
        className={`font-bold ${
          event.isToday
            ? "bg-red-500 hover:bg-red-600"
            : "bg-gray-200 text-gray-700"
        }`}
      >
        {event.isToday ? "TODAY!" : event.date}
      </UiBadge>
      {isAnniversary && event.years && (
        <p
          className={`text-xs mt-1 font-medium ${
            event.years >= 5 ? "text-green-600" : "text-gray-500"
          }`}
        >
          {event.years} Year{event.years !== 1 ? "s" : ""}
          {event.years >= 5 && (
            <Star className="inline ml-1 h-3 w-3 fill-green-400 text-green-500" />
          )}
        </p>
      )}
    </div>
  </div>
);

export default function BirthdayAnniversaryDashboard() {
  const { toast } = useToast();

  // Data
  const [dash, setDash] = useState<MilestonesDashboard | null>(null);
  const [settings, setSettings] = useState<MilestoneSettings | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  // Local toggles for settings dialog
  const [birthEmails, setBirthEmails] = useState(false);
  const [annivEmails, setAnnivEmails] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const dashboard = await milestonesService.getDashboard();
      setDash(dashboard);
      setLastRefreshedAt(new Date());
    } catch (err: any) {
      toast({
        title: "Failed to load milestones",
        description: err?.response?.data?.message || err?.message,
        variant: "destructive",
      });
      setDash({ summaryCards: [], birthdays: [], anniversaries: [] });
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const s = await milestonesService.getSettings();
      setSettings(s);
      setBirthEmails(!!s.enableBirthdayEmails);
      setAnnivEmails(!!s.enableAnniversaryEmails);
    } catch (err: any) {
      toast({
        title: "Failed to load settings",
        description: err?.response?.data?.message || err?.message,
        variant: "destructive",
      });
      setSettings(null);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      await milestonesService.updateSettings({
        enableBirthdayEmails: birthEmails,
        enableAnniversaryEmails: annivEmails,
      });
      toast({
        title: "Settings updated",
        description: "Automation settings saved successfully.",
      });
      setSettingsOpen(false);
      // reload summary cards since automation status may change wording
      loadAll();
    } catch (err: any) {
      toast({
        title: "Failed to save settings",
        description: err?.response?.data?.message || err?.message,
        variant: "destructive",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const headerActions = useMemo(
    () => (
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="text-gray-700 border-gray-300 hover:bg-gray-100 shadow-sm"
        >
          <Users className="mr-2 h-4 w-4" />
          View All Employee Dates
        </Button>
        <Button
          variant="default"
          className="bg-pink-600 hover:bg-pink-700 shadow-md"
          onClick={async () => {
            setSettingsOpen(true);
            await loadSettings();
          }}
        >
          <Settings className="mr-2 h-4 w-4" />
          Automation Settings
        </Button>
        <Button
          variant="outline"
          onClick={loadAll}
          disabled={loading}
          className="border-gray-300"
        >
          {loading ? (
            <Spinner className="mr-2" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>
    ),
    [loading]
  );

  return (
    <div className="space-y-8 p-4 sm:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <CalendarDays className="h-7 w-7 text-pink-600" />
            Employee Milestones & Greetings
          </h1>
          <p className="text-gray-500 mt-1">
            Automate well-wishes and view upcoming employee celebrations.
          </p>
          {lastRefreshedAt && (
            <p className="text-xs text-gray-400 mt-1">
              Last refreshed: {lastRefreshedAt.toLocaleString()}
            </p>
          )}
        </div>
        {headerActions}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {!dash
          ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)
          : (dash.summaryCards || []).map((card) => {
              const Icon = summaryIconMap[card.icon] || Clock;
              const color =
                card.icon === "Cake"
                  ? "text-pink-600"
                  : card.icon === "Briefcase"
                  ? "text-indigo-600"
                  : card.icon === "Mail"
                  ? "text-blue-600"
                  : "text-green-600";
              const bg =
                card.icon === "Cake"
                  ? "bg-pink-50"
                  : card.icon === "Briefcase"
                  ? "bg-indigo-50"
                  : card.icon === "Mail"
                  ? "bg-blue-50"
                  : "bg-green-50";

              return (
                <Card
                  key={card.title}
                  className={`p-5 border-l-4 border-pink-500 hover:shadow-lg transition ${bg}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">
                        {card.title}
                      </h3>
                      <p className={`text-3xl font-bold mt-2 ${color}`}>
                        {card.value}
                      </p>
                    </div>
                    <Icon
                      className={`h-8 w-8 p-1.5 rounded-full ${color} bg-opacity-20`}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{card.unit}</p>
                </Card>
              );
            })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Birthdays */}
        <Card className="p-6 shadow-xl lg:col-span-2">
          <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-2">
            <Cake className="h-5 w-5 text-pink-600" />
            Upcoming Birthdays
          </h2>

          {!dash ? (
            <div className="space-y-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : dash.birthdays.length === 0 ? (
            <div className="text-sm text-gray-500 border rounded-lg p-6 bg-white">
              No upcoming birthdays in the next 30 days.
            </div>
          ) : (
            <div className="space-y-3">
              {dash.birthdays.map((event) => (
                <EventItem key={event.id} event={event} />
              ))}
            </div>
          )}

          <Button variant="link" className="mt-6 p-0 text-pink-600 h-auto">
            View Full Birthday Calendar <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Card>

        {/* Work Anniversaries */}
        <Card className="p-6 shadow-xl">
          <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-indigo-600" />
            Work Anniversaries
          </h2>

          {!dash ? (
            <div className="space-y-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : dash.anniversaries.length === 0 ? (
            <div className="text-sm text-gray-500 border rounded-lg p-6 bg-white">
              No upcoming anniversaries in the next 30 days.
            </div>
          ) : (
            <div className="space-y-3">
              {dash.anniversaries.map((event) => (
                <EventItem key={event.id} event={event} isAnniversary />
              ))}
            </div>
          )}

          <Button variant="link" className="mt-6 p-0 text-indigo-600 h-auto">
            View All Milestones <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Card>
      </div>

      {/* Settings dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="w-full max-w-xl">
          <DialogTitle>Greeting Automation & Customization</DialogTitle>
          <DialogDescription>
            Manage birthday and work-anniversary email automation.
          </DialogDescription>

          {!settings ? (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 mt-4">
              <div className="p-4 rounded-lg border border-blue-200 bg-blue-50 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-blue-800">Birthday Emails</p>
                  <p className="text-sm text-blue-700">
                    Send greetings at 9:00 AM on the birthday.
                  </p>
                </div>
                <Switch
                  checked={birthEmails}
                  onCheckedChange={(v) => setBirthEmails(!!v)}
                />
              </div>

              <div className="p-4 rounded-lg border border-indigo-200 bg-indigo-50 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-indigo-800">
                    Anniversary Emails
                  </p>
                  <p className="text-sm text-indigo-700">
                    Celebrate milestones automatically.
                  </p>
                </div>
                <Switch
                  checked={annivEmails}
                  onCheckedChange={(v) => setAnnivEmails(!!v)}
                />
              </div>

              {settings?.milestoneEmailTemplate ? (
                <div className="p-3 rounded-lg border border-gray-200 bg-white">
                  <p className="text-xs text-gray-500 mb-1">
                    Current Template (preview):
                  </p>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-4">
                    {settings.milestoneEmailTemplate}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={saveSettings}
              disabled={!settings || savingSettings}
              className={`bg-pink-600 hover:bg-pink-700 ${
                savingSettings ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {savingSettings ? <Spinner className="mr-2" /> : null}
              {savingSettings ? "Saving..." : "Save Settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
