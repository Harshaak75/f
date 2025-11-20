import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useToast } from "../../hooks/use-toast";

import {
  Users,
  MessageCircle,
  ClipboardCheck,
  ArrowRight,
  Award,
  UserCheck,
  CalendarDays,
  Eye,
  ArrowLeft,
  Loader2,
  Rocket,
} from "lucide-react";
import {
  CycleDetails,
  ReviewCycle,
  reviewsService,
} from "../../utils/api/admin.feedback";

/* ---------- small UI helpers ---------- */
const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => (
  <div className="w-full bg-gray-200 rounded-full h-2">
    <div
      className="h-2 rounded-full transition-all duration-500"
      style={{
        width: `${progress}%`,
        backgroundColor:
          progress === 100 ? "#10b981" : progress > 0 ? "#f59e0b" : "#ef4444",
      }}
    />
  </div>
);

function fmt(dateIso?: string) {
  if (!dateIso) return "—";
  const d = new Date(dateIso);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

/* ---------- component ---------- */

export default function ReviewDashboard() {
  const { toast } = useToast();

  // cycles
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
  const [cyclesLoading, setCyclesLoading] = useState(true);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);

  // details for selected cycle
  const [details, setDetails] = useState<CycleDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // create cycle dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [creating, setCreating] = useState(false);

  const selectedCycle = useMemo(
    () => cycles.find((c) => c.id === selectedCycleId) || null,
    [cycles, selectedCycleId]
  );

  /* ----- load cycles ----- */
  const loadCycles = async () => {
    try {
      setCyclesLoading(true);
      const data = await reviewsService.listCycles();
      setCycles(data);
      // auto-select the most recent cycle if none is selected
      if (!selectedCycleId && data.length) setSelectedCycleId(data[0].id);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to load review cycles.";
      toast({ title: "Load failed", description: msg, variant: "destructive" });
      setCycles([]);
    } finally {
      setCyclesLoading(false);
    }
  };

  /* ----- load cycle details ----- */
  const loadDetails = async (cycleId: string) => {
    try {
      setDetailsLoading(true);
      const data = await reviewsService.getCycleDetails(cycleId);
      setDetails(data);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to load cycle details.";
      toast({ title: "Load failed", description: msg, variant: "destructive" });
      setDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    loadCycles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedCycleId) loadDetails(selectedCycleId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCycleId]);

  /* ----- create & launch handlers ----- */
  const handleCreate = async () => {
    if (!name || !startDate || !endDate) {
      toast({
        title: "Missing fields",
        description: "Name, start date and end date are required.",
        variant: "destructive",
      });
      return;
    }
    try {
      setCreating(true);
      await reviewsService.createCycle({ name, startDate, endDate });
      setName("");
      setStartDate("");
      setEndDate("");
      setCreateOpen(false);
      await loadCycles();
      toast({
        title: "Cycle created",
        description: "Draft review cycle created.",
      });
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to create review cycle.";
      toast({
        title: "Create failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const [launching, setLaunching] = useState(false);
  const handleLaunch = async () => {
    if (!selectedCycleId) return;
    try {
      setLaunching(true);
      await reviewsService.launchCycle(selectedCycleId);
      toast({
        title: "Cycle launched",
        description: "Self-assessments created for all employees.",
      });
      await loadCycles();
      await loadDetails(selectedCycleId);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || "Failed to launch cycle.";
      toast({
        title: "Launch failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLaunching(false);
    }
  };

  /* ----- derived dashboard metrics (simple examples) ----- */
  const summary = useMemo(() => {
    const sa = details?.selfAssessments ?? [];
    const completed = sa.filter((x) => x.status !== "PENDING").length;
    const total = sa.length;
    const ratio = total ? Math.round((completed / total) * 100) : 0;

    return {
      cycleLabel: selectedCycle ? selectedCycle.name : "—",
      assessmentsCompletedLabel: `${completed} / ${total}`,
      feedbackReceivedLabel: `${details?.peerFeedbacks?.length ?? 0} sources`,
      currentAvgScoreLabel: "—", // placeholder if you later compute scores
      progressPct: ratio,
    };
  }, [details, selectedCycle]);

  return (
    <div className="space-y-8 sm:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to={`/performance/feedback`}>
            <ArrowLeft className="mb-5 text-indigo-600" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <UserCheck className="h-7 w-7 text-indigo-600" />
            360° Feedback & Self-Assessment
          </h1>
          <p className="text-gray-500 mt-1">
            Manage your performance review cycles.
          </p>
        </div>

        <div className="flex gap-3">
          {/* Create Cycle */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                New Cycle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Review Cycle</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Q1 2025"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Cycle selector */}
          <Select
            value={selectedCycleId || undefined}
            onValueChange={(v) => setSelectedCycleId(v)}
          >
            <SelectTrigger className="w-[220px] border-gray-300 bg-white shadow-sm">
              <SelectValue
                placeholder={
                  cyclesLoading ? "Loading cycles…" : "Select Review Cycle"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {cycles.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} &nbsp;({fmt(c.startDate)} – {fmt(c.endDate)}) [
                  {c.status}]
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Launch button (only for DRAFT) */}
          <Button
            variant="outline"
            className="text-indigo-600 border-indigo-300 hover:bg-indigo-100"
            disabled={
              !selectedCycle || selectedCycle.status !== "DRAFT" || launching
            }
            onClick={handleLaunch}
            title={
              selectedCycle?.status !== "DRAFT"
                ? "Only draft cycles can be launched"
                : "Launch cycle"
            }
          >
            {launching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="mr-2 h-4 w-4" />
            )}
            Launch
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          title="Reviews Due"
          value={summary.cycleLabel}
          unit="Cycle"
          icon={CalendarDays}
          color="text-indigo-600"
        />
        <SummaryCard
          title="Assessments Completed"
          value={summary.assessmentsCompletedLabel}
          unit="Sections"
          icon={ClipboardCheck}
          color="text-green-600"
        />
        <SummaryCard
          title="Feedback Received"
          value={summary.feedbackReceivedLabel}
          unit="Sources"
          icon={MessageCircle}
          color="text-amber-600"
        />
        <SummaryCard
          title="Current Average Score"
          value={summary.currentAvgScoreLabel}
          unit="out of 5.0"
          icon={Award}
          color="text-sky-600"
        />
      </div>

      {/* Self-Assessment Progress (from details) */}
      <Card className="p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-indigo-500" />
            Self-Assessments
          </h2>
          {detailsLoading && (
            <div className="text-sm text-muted-foreground flex items-center">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
            </div>
          )}
        </div>

        {!detailsLoading &&
        (!details || details.selfAssessments.length === 0) ? (
          <div className="text-sm text-muted-foreground">
            No self-assessments yet.
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {details?.selfAssessments.map((sa) => (
                <TableRow key={sa.id}>
                  <TableCell className="font-medium">
                    {sa.user?.name || sa.userId}
                  </TableCell>
                  <TableCell>
                    {sa.user?.employeeProfile?.designation || "—"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex px-3 py-0.5 text-xs font-semibold rounded-full border ${
                        sa.status === "PENDING"
                          ? "bg-red-100 text-red-700 border-red-300"
                          : sa.status === "SUBMITTED"
                          ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                          : "bg-green-100 text-green-700 border-green-300"
                      }`}
                    >
                      {sa.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* 360 Feedback Table (from details) */}
      <Card className="p-6 shadow-xl">
        <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-indigo-500" />
          360° Feedback (Cycle Overview)
        </h2>

        {!detailsLoading && (!details || details.peerFeedbacks.length === 0) ? (
          <div className="text-sm text-muted-foreground">
            No peer feedback yet.
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>Giver</TableHead>
                <TableHead>Receiver</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {details?.peerFeedbacks.map((pf) => (
                <TableRow key={pf.id}>
                  <TableCell className="font-medium">
                    {pf.giver?.name || pf.giverId}
                  </TableCell>
                  <TableCell>{pf.receiver?.name || pf.receiverId}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" disabled>
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

/* ---------- small presentational component ---------- */
function SummaryCard({
  title,
  value,
  unit,
  icon: Icon,
  color,
}: {
  title: string;
  value: React.ReactNode;
  unit: string;
  icon: any;
  color: string;
}) {
  return (
    <Card className="p-5 border-l-4 border-sky-500 hover:shadow-lg transition duration-200">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-sm font-medium text-gray-500">{title}</h3>
          <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
        </div>
        <Icon className={`h-8 w-8 p-1.5 rounded-full ${color} bg-opacity-10`} />
      </div>
      <p className="text-xs text-gray-400 mt-1">{unit}</p>
    </Card>
  );
}
