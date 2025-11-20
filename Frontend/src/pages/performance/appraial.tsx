import React, { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Label } from "../../components/ui/label";
import { useToast } from "../../hooks/use-toast";

import {
  Settings,
  TrendingUp,
  Zap,
  Clock,
  Users,
  DollarSign,
  RefreshCw,
  ArrowRight,
  Loader2,
} from "lucide-react";
import {
  DashboardStats,
  ReviewCycle,
  reviewsServiceAppraisal,
} from "../../utils/api/admin.appraisal.api";

/* ---------- helpers ---------- */
const getCompletionColor = (progress: number) => {
  if (progress >= 90) return "#10b981"; // green
  if (progress >= 50) return "#f97316"; // orange
  return "#ef4444"; // red
};

const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => (
  <div className="w-full bg-gray-200 rounded-full h-2">
    <div
      className="h-2 rounded-full transition-all duration-500"
      style={{
        width: `${progress}%`,
        backgroundColor: getCompletionColor(progress),
      }}
    />
  </div>
);

function fmtINR(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function fmtDateRange(c?: ReviewCycle | null) {
  if (!c) return "—";
  const s = new Date(c.startDate);
  const e = new Date(c.endDate);
  const opt: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
  };
  return `${s.toLocaleDateString("en-IN", opt)} – ${e.toLocaleDateString(
    "en-IN",
    opt
  )}`;
}

/* ---------- component ---------- */

export default function AppraisalDashboard() {
  const { toast } = useToast();

  // cycles / selection
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
  const [cyclesLoading, setCyclesLoading] = useState(true);
  const [selectedCycleId, setSelectedCycleId] = useState<string | undefined>(
    undefined
  );

  // stats
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const selectedCycle = useMemo(
    () => cycles.find((c) => c.id === selectedCycleId),
    [cycles, selectedCycleId]
  );

  // load cycles once
  useEffect(() => {
    (async () => {
      try {
        setCyclesLoading(true);
        const list = await reviewsServiceAppraisal.listCycles();
        setCycles(list);
        if (list.length && !selectedCycleId) setSelectedCycleId(list[0].id);
      } catch (e: any) {
        const msg =
          e?.response?.data?.message || e?.message || "Failed to load cycles.";
        toast({ title: "Error", description: msg, variant: "destructive" });
      } finally {
        setCyclesLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load stats when cycle changes
  useEffect(() => {
    if (!selectedCycleId) return;
    (async () => {
      try {
        setStatsLoading(true);
        const data = await reviewsServiceAppraisal.getDashboardStats(
          selectedCycleId
        );
        setStats(data);
      } catch (e: any) {
        const msg =
          e?.response?.data?.message ||
          e?.message ||
          "Failed to load dashboard stats.";
        toast({ title: "Error", description: msg, variant: "destructive" });
        setStats(null);
      } finally {
        setStatsLoading(false);
      }
    })();
  }, [selectedCycleId, toast]);

  // derived summary cards
  const cycleSummaryCards = useMemo(() => {
    const overall = stats?.summaryCards?.overallCompletion ?? 0;
    const allocatedPct = stats
      ? Math.round(
          (stats.meritBudget.allocated /
            Math.max(1, stats.meritBudget.totalPool)) *
            100
        )
      : 0;

    return [
      {
        title: "Appraisal Cycle",
        value: selectedCycle?.name || (cyclesLoading ? "Loading…" : "—"),
        unit: fmtDateRange(selectedCycle),
        icon: Clock,
        color: "text-indigo-600",
      },
      {
        title: "Overall Completion",
        value: `${overall}%`,
        unit: "Employee Reviews",
        icon: TrendingUp,
        color: "text-green-600",
      },
      {
        title: "Calibration Status",
        value: "Pending",
        unit: "Final Review Stage",
        icon: RefreshCw,
        color: "text-amber-600",
      },
      {
        title: "Merit Budget Allocated",
        value: `${allocatedPct}%`,
        unit: `of ${stats ? fmtINR(stats.meritBudget.totalPool) : "—"}`,
        icon: DollarSign,
        color: "text-sky-600",
      },
    ];
  }, [stats, selectedCycle, cyclesLoading]);

  return (
    <div className="space-y-8 p-4 sm:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Settings className="h-7 w-7 text-indigo-600" />
            Appraisal Cycle Management
          </h1>
          <p className="text-gray-500 mt-1">
            Configure and monitor the organization's performance review cycle.
          </p>
        </div>

        <div className="flex gap-3 items-center">
          <Label className="text-sm text-gray-500">Cycle</Label>
          <Select
            value={selectedCycleId}
            onValueChange={(v) => setSelectedCycleId(v)}
          >
            <SelectTrigger className="w-[240px] border-gray-300 bg-white shadow-sm">
              <SelectValue
                placeholder={cyclesLoading ? "Loading cycles…" : "Select cycle"}
              />
            </SelectTrigger>
            <SelectContent>
              {cycles.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} &nbsp;({fmtDateRange(c)}) [{c.status}]
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="default"
            className="bg-indigo-600 hover:bg-indigo-700 shadow-md"
            disabled
          >
            <Zap className="mr-2 h-4 w-4" />
            Start New Cycle
          </Button>
        </div>
      </div>

      {/* Summary Cards (dynamic) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cycleSummaryCards.map((card) => {
          const Icon = card.icon as any;
          return (
            <Card
              key={card.title}
              className="p-5 border-l-4 border-indigo-500 hover:shadow-lg transition duration-200"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    {card.title}
                  </h3>
                  <p className={`text-3xl font-bold mt-2 ${card.color}`}>
                    {card.value}
                  </p>
                </div>
                <Icon
                  className={`h-8 w-8 p-1.5 rounded-full ${card.color} bg-opacity-10`}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{card.unit}</p>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Automation Settings (dynamic) */}
        <Card className="p-6 shadow-xl lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Zap className="h-5 w-5 text-indigo-500" />
              Cycle Automation Settings
            </h2>
            {statsLoading && (
              <span className="text-sm text-muted-foreground flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading…
              </span>
            )}
          </div>

          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow className="hover:bg-gray-50">
                <TableHead className="w-[30%] text-gray-600">Setting</TableHead>
                <TableHead className="w-[50%] text-gray-600">
                  Description
                </TableHead>
                <TableHead className="w-[20%] text-gray-600 text-center">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats?.automationSettings?.map((setting) => (
                <TableRow
                  key={setting.name}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <TableCell className="font-medium text-gray-700">
                    {setting.name}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {setting.description}
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`inline-flex items-center px-3 py-0.5 text-xs font-semibold rounded-full border ${
                        setting.isEnabled
                          ? "bg-green-100 text-green-700 border-green-300"
                          : "bg-red-100 text-red-700 border-red-300"
                      }`}
                    >
                      {setting.action}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {!stats?.automationSettings?.length && !statsLoading && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-sm text-muted-foreground"
                  >
                    No settings.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <Button variant="link" className="mt-4 p-0 text-indigo-600 h-auto">
            Go to Automation Configuration{" "}
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Card>

        {/* Budget Allocation (dynamic) */}
        <Card className="p-6 shadow-xl lg:col-span-1 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-sky-500" />
              Merit Budget Overview
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-600">
                  Total Budget Pool:
                </p>
                <span className="text-lg font-bold text-sky-600">
                  {stats ? fmtINR(stats.meritBudget.totalPool) : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-600">Allocated:</p>
                <span className="text-lg font-bold text-sky-600">
                  {stats ? fmtINR(stats.meritBudget.allocated) : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-gray-600">Remaining:</p>
                <span className="text-lg font-bold text-green-600">
                  {stats ? fmtINR(stats.meritBudget.remaining) : "—"}
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full mt-6 justify-center text-sky-600 border-sky-300 hover:bg-sky-100"
          >
            Manage Compensation Matrix
          </Button>
        </Card>
      </div>

      {/* Stage Progress (dynamic) */}
      <Card className="p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-500" />
            Current Cycle Stage Progression
          </h2>
          {statsLoading && (
            <span className="text-sm text-muted-foreground flex items-center">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading…
            </span>
          )}
        </div>

        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow className="hover:bg-gray-50">
              <TableHead className="w-[30%] text-gray-600">Stage</TableHead>
              <TableHead className="w-[50%] text-gray-600">
                Completion Rate
              </TableHead>
              <TableHead className="w-[20%] text-gray-600 text-right">
                Pending Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats?.stageProgressData?.map((row) => (
              <TableRow
                key={row.stage}
                className="hover:bg-gray-50/50 transition-colors"
              >
                <TableCell className="font-medium text-gray-700">
                  {row.stage}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <ProgressBar progress={row.completionRate} />
                    <span className="text-sm font-semibold text-gray-700 w-12 text-right">
                      {row.completionRate}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={`font-bold ${
                      row.pendingCount > 100
                        ? "text-red-600"
                        : row.pendingCount > 50
                        ? "text-orange-600"
                        : "text-gray-600"
                    }`}
                  >
                    {row.pendingCount}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {!stats?.stageProgressData?.length && !statsLoading && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-sm text-muted-foreground"
                >
                  No data.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Button variant="link" className="mt-4 p-0 text-indigo-600 h-auto">
          View Departmental Breakdown <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </Card>
    </div>
  );
}
