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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Slider } from "../../components/ui/slider";
import { useToast } from "../../hooks/use-toast";

import {
  Target,
  TrendingUp,
  CheckCircle,
  Users,
  ListPlus,
  CalendarCheck,
  Loader2,
} from "lucide-react";
import {
  KeyResultDTO,
  ObjectiveDTO,
  okrService,
  OkrStatus,
  uiToServerStatus,
} from "../../utils/api/admin.okr.api";
import { EmployeeDirectoryList } from "../../utils/api/Admin.employeeFunctionality";

/* ----- small UI helpers ----- */
const getStatusChip = (status: KeyResultDTO["status"]) => {
  const base =
    "inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border";
  if (status === "On Track")
    return `${base} bg-green-100 text-green-700 border-green-300`;
  if (status === "At Risk")
    return `${base} bg-orange-100 text-orange-700 border-orange-300`;
  if (status === "Completed")
    return `${base} bg-blue-100 text-blue-700 border-blue-300`;
  return `${base} bg-gray-100 text-gray-700 border-gray-300`;
};
const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => (
  <div className="w-full bg-gray-200 rounded-full h-2">
    <div
      className="h-2 rounded-full transition-all duration-500"
      style={{
        width: `${progress}%`,
        backgroundColor:
          progress >= 75 ? "#10b981" : progress >= 40 ? "#f59e0b" : "#ef4444",
      }}
    />
  </div>
);

/* ----- quarter parsing ----- */
function parseQuarterKey(key: string) {
  // 'q1-2025' -> { quarter: 1, year: 2025 }
  const [q, y] = key.split("-");
  return { quarter: Number(q.replace("q", "")), year: Number(y) };
}
const QUARTER_OPTIONS = ["q1-2025", "q4-2024", "q3-2024"];

export default function OKRsDashboard() {
  const { toast } = useToast();
  const [quarterKey, setQuarterKey] = useState("q1-2025");
  const [{ quarter, year }, setPeriod] = useState(parseQuarterKey("q1-2025"));

  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<ObjectiveDTO[]>([]);

  // create objective dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [objTitle, setObjTitle] = useState("");
  const [objOwnerId, setObjOwnerId] = useState(""); // required by BE
  const [creating, setCreating] = useState(false);

  // create KR dialog
  const [krOpenFor, setKrOpenFor] = useState<string | null>(null);
  const [krTitle, setKrTitle] = useState("");
  const [krOwnerId, setKrOwnerId] = useState("");
  const [creatingKR, setCreatingKR] = useState(false);
  const [employees, setEmployees] = useState([]);

  const [availablePeriods, setAvailablePeriods] = useState<
    { quarter: number; year: number }[]
  >([]);

  useEffect(() => {
    okrService.getPeriods().then(setAvailablePeriods);
  }, []);

  useEffect(() => {
    EmployeeDirectoryList.getAllEmployeeDetails().then(setEmployees);
  }, []);

  // per-KR inline update (progress/status)
  const [savingKR, setSavingKR] = useState<string | null>(null);

  const fetchOKR = async (q: number, y: number) => {
    try {
      setLoading(true);
      const data = await okrService.list({ quarter: q, year: y });
      setList(data);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || "Failed to load OKRs.";
      toast({ title: "Load failed", description: msg, variant: "destructive" });
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const p = parseQuarterKey(quarterKey);
    setPeriod(p);
    fetchOKR(p.quarter, p.year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quarterKey]);

  const summary = useMemo(() => {
    let totalKrs = 0,
      completed = 0,
      onTrack = 0,
      atRisk = 0;
    list.forEach((o) => {
      totalKrs += o.keyResults.length;
      o.keyResults.forEach((kr) => {
        if (kr.status === "Completed") completed++;
        else if (kr.status === "On Track") onTrack++;
        else if (kr.status === "At Risk") atRisk++;
      });
    });
    const totalObjectives = list.length;
    const avg = (() => {
      const all = list.flatMap((o) => o.keyResults.map((k) => k.progress));
      if (!all.length) return 0;
      return Math.round(all.reduce((a, b) => a + b, 0) / all.length);
    })();
    return { totalObjectives, avg, completed, totalKrs, onTrack, atRisk };
  }, [list]);

  const handleCreateObjective = async () => {
    if (!objTitle || !objOwnerId) {
      toast({
        title: "Missing fields",
        description: "Title and ownerId are required.",
        variant: "destructive",
      });
      return;
    }
    try {
      setCreating(true);
      await okrService.createObjective({
        title: objTitle,
        quarter,
        year,
        ownerId: objOwnerId,
      });
      setObjTitle("");
      setObjOwnerId("");
      setCreateOpen(false);
      await fetchOKR(quarter, year);
      toast({
        title: "Objective created",
        description: "New objective added.",
      });
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to create objective.";
      toast({
        title: "Create failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleCreateKR = async (objectiveId: string) => {
    if (!krTitle || !krOwnerId) {
      toast({
        title: "Missing fields",
        description: "Title and ownerId are required.",
        variant: "destructive",
      });
      return;
    }
    try {
      setCreatingKR(true);
      await okrService.createKeyResult({
        title: krTitle,
        ownerId: krOwnerId,
        objectiveId,
      });
      setKrTitle("");
      setKrOwnerId("");
      setKrOpenFor(null);
      await fetchOKR(quarter, year);
      toast({
        title: "Key result added",
        description: "New KR added to objective.",
      });
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || "Failed to add key result.";
      toast({
        title: "Create failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setCreatingKR(false);
    }
  };

  const handleUpdateKR = async (
    krId: string,
    next: { progress?: number; status?: KeyResultDTO["status"] }
  ) => {
    try {
      setSavingKR(krId);
      const current = list
        .flatMap((o) => o.keyResults)
        .find((k) => k.id === krId);
      if (!current) return;

      const newProgress = next.progress ?? current.progress;
      const newStatusUi = next.status ?? current.status;
      const payload = {
        progress: newProgress,
        status: uiToServerStatus(newStatusUi),
      };
      await okrService.updateKeyResult(
        krId,
        payload as { progress: number; status: OkrStatus }
      );

      // Optimistic UI update
      setList((prev) =>
        prev.map((o) => ({
          ...o,
          keyResults: o.keyResults.map((k) =>
            k.id === krId
              ? { ...k, progress: newProgress, status: newStatusUi }
              : k
          ),
        }))
      );
      toast({ title: "Updated", description: "Key result saved." });
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to update key result.";
      toast({
        title: "Update failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSavingKR(null);
    }
  };

  return (
    <div className="space-y-8 p-4 sm:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Target className="h-7 w-7 text-primary" />
            OKR & Goal Tracking
          </h1>
          <p className="text-gray-500 mt-1">
            Strategic objectives and key results for the organization.
          </p>
        </div>

        <div className="flex gap-3">
          {/* Create Objective */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-md">
                <ListPlus className="mr-2 h-4 w-4" />
                Create Objective
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>New Objective</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={objTitle}
                    onChange={(e) => setObjTitle(e.target.value)}
                    placeholder="e.g., Elevate Customer Success"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Quarter</Label>
                    <Input readOnly value={`Q${quarter}`} />
                  </div>
                  <div>
                    <Label>Year</Label>
                    <Input readOnly value={year} />
                  </div>
                </div>
                <div>
                  <Label>Owner</Label>
                  <Select value={objOwnerId} onValueChange={setObjOwnerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp: any) => (
                        <SelectItem key={emp.userId} value={emp.userId}>
                          {emp.firstName} {emp.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreateObjective} disabled={creating}>
                  {creating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Quarter switcher */}
          <Select value={quarterKey} onValueChange={setQuarterKey}>
            <SelectTrigger className="w-[180px] border-gray-300 bg-white shadow-sm">
              <SelectValue placeholder="Select Quarter" />
            </SelectTrigger>
            <SelectContent>
              {availablePeriods.map((p) => (
                <SelectItem
                  key={`q${p.quarter}-${p.year}`}
                  value={`q${p.quarter}-${p.year}`}
                >
                  Q{p.quarter} {p.year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-5 border-l-4 border-indigo-500">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-medium text-gray-500">
                Total Q{quarter} Objectives
              </h3>
              <p className={`text-4xl font-bold mt-2 text-indigo-600`}>
                {summary.totalObjectives}
              </p>
            </div>
            <Target className="h-8 w-8 p-1.5 rounded-full text-indigo-600 bg-indigo-50" />
          </div>
          <p className="text-xs text-gray-400 mt-1">Goals</p>
        </Card>

        <Card className="p-5 border-l-4 border-green-500">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-medium text-gray-500">
                Average Achievement
              </h3>
              <p className={`text-4xl font-bold mt-2 text-green-600`}>
                {summary.avg}%
              </p>
            </div>
            <TrendingUp className="h-8 w-8 p-1.5 rounded-full text-green-600 bg-green-50" />
          </div>
          <p className="text-xs text-gray-400 mt-1">Company-wide</p>
        </Card>

        <Card className="p-5 border-l-4 border-amber-500">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-medium text-gray-500">
                Completed Key Results
              </h3>
              <p className={`text-4xl font-bold mt-2 text-amber-600`}>
                {summary.completed} / {summary.totalKrs}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 p-1.5 rounded-full text-amber-600 bg-amber-50" />
          </div>
          <p className="text-xs text-gray-400 mt-1">Total KRs</p>
        </Card>

        <Card className="p-5 border-l-4 border-sky-500">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-medium text-gray-500">
                Teams Actively Tracking
              </h3>
              <p className={`text-4xl font-bold mt-2 text-sky-600`}>
                {Math.max(1, list.length)}
              </p>
            </div>
            <Users className="h-8 w-8 p-1.5 rounded-full text-sky-600 bg-sky-50" />
          </div>
          <p className="text-xs text-gray-400 mt-1">Departments</p>
        </Card>
      </div>

      {/* Objectives */}
      <Card className="p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">
            Quarterly Objectives & Key Results
          </h2>
          {loading && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
            </div>
          )}
        </div>

        {!loading && list.length === 0 && (
          <div className="text-sm text-muted-foreground">
            No objectives yet for Q{quarter} {year}.
          </div>
        )}

        {list.map((objective) => (
          <div
            key={objective.id}
            className="mb-8 border border-gray-200 rounded-xl overflow-hidden"
          >
            {/* header */}
            <div className="bg-indigo-50 p-4 border-b border-indigo-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-indigo-800">
                {objective.objective}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-indigo-600">
                  {
                    objective.keyResults.filter((k) => k.status === "Completed")
                      .length
                  }{" "}
                  / {objective.keyResults.length} KRs Done
                </span>

                {/* Add KR */}
                <Dialog
                  open={krOpenFor === objective.id}
                  onOpenChange={(o) => !o && setKrOpenFor(null)}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setKrOpenFor(objective.id)}
                    >
                      Add KR
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add Key Result</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Title</Label>
                        <Input
                          value={krTitle}
                          onChange={(e) => setKrTitle(e.target.value)}
                          placeholder="e.g., Achieve CSAT of 90%"
                        />
                      </div>
                      <div>
                        {/* <Label>Owner ID</Label>
                        <Input
                          value={krOwnerId}
                          onChange={(e) => setKrOwnerId(e.target.value)}
                          placeholder="userId of owner"
                        /> */}
                        <Label>Owner</Label>
                  <Select value={krOwnerId} onValueChange={setKrOwnerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp: any) => (
                        <SelectItem key={emp.userId} value={emp.userId}>
                          {emp.firstName} {emp.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                      </div>
                      <Button
                        onClick={() => handleCreateKR(objective.id)}
                        disabled={creatingKR}
                      >
                        {creatingKR ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Create KR
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* table */}
<Table>
  <TableHeader className="bg-gray-50">
    <TableRow className="hover:bg-gray-50">
      <TableHead className="w-[45%] text-gray-600">Key Result Metric</TableHead>
      <TableHead className="w-[15%] text-gray-600">Owner</TableHead>
      <TableHead className="w-[25%] text-gray-600">Progress</TableHead>
      <TableHead className="w-[15%] text-gray-600 text-center">Status</TableHead>
    </TableRow>
  </TableHeader>

  <TableBody>
    {objective.keyResults.map((kr) => (
      <TableRow key={kr.id} className="hover:bg-indigo-50/50 h-[90px]">

        {/* Key Result */}
        <TableCell className="font-medium text-gray-700 align-middle w-[45%]">
          {kr.keyResult}
        </TableCell>

        {/* Owner */}
        <TableCell className="text-sm text-gray-600 align-middle w-[15%]">
          {kr.owner}
        </TableCell>

        {/* Progress */}
        <TableCell className="w-[25%] align-middle">
          <div className="flex items-center gap-4">
            {/* Slider + bar stacked */}
            <div className="flex flex-col gap-1 w-full">
              <Slider
                value={[kr.progress]}
                max={100}
                step={5}
                onValueChange={(v) => handleUpdateKR(kr.id, { progress: v[0] })}
                disabled={savingKR === kr.id}
              />

              <ProgressBar progress={kr.progress} />
            </div>

            {/* Percentage */}
            <div className="text-sm font-semibold text-gray-700 w-12 text-right">
              {savingKR === kr.id ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : (
                `${kr.progress}%`
              )}
            </div>
          </div>
        </TableCell>

        {/* Status */}
        <TableCell className="w-[15%] text-center align-middle">
          <div className="flex flex-col items-center gap-2">

            <Select
              value={kr.status}
              onValueChange={(v) =>
                handleUpdateKR(kr.id, { status: v as KeyResultDTO["status"] })
              }
              disabled={savingKR === kr.id}
            >
              <SelectTrigger className="w-[130px] mx-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Planned">Planned</SelectItem>
                <SelectItem value="On Track">On Track</SelectItem>
                <SelectItem value="At Risk">At Risk</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            {/* Chip */}
            <span className={getStatusChip(kr.status)}>{kr.status}</span>
          </div>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>

          </div>
        ))}
      </Card>

      {/* Secondary cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-amber-500" />
            Goal Status Breakdown
          </h3>
          <div className="space-y-3">
            <BreakRow
              label="High Priority / At Risk"
              note="Immediate attention required"
              value={summary.atRisk}
              color="red"
            />
            <BreakRow
              label="On Track"
              note="Progressing as expected"
              value={summary.onTrack}
              color="green"
            />
            <BreakRow
              label="Completed"
              note="Achieved this quarter"
              value={summary.completed}
              color="gray"
            />
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-sky-500" />
            Upcoming Check-ins & Reviews
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-sky-50 rounded-lg border border-sky-200">
              <div>
                <p className="font-medium">Product Team Quarterly Review</p>
                <p className="text-sm text-gray-500">
                  Objective: New Feature Launch
                </p>
              </div>
              <span className="text-sm font-semibold text-sky-600">28 Mar</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-sky-50 rounded-lg border border-sky-200">
              <div>
                <p className="font-medium">KR Status Sync</p>
                <p className="text-sm text-gray-500">Owners: All</p>
              </div>
              <span className="text-sm font-semibold text-sky-600">10 Apr</span>
            </div>
            <Button
              variant="outline"
              className="w-full mt-3 justify-center text-sky-600 border-sky-300 hover:bg-sky-100"
            >
              View Full Calendar
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function BreakRow({
  label,
  note,
  value,
  color,
}: {
  label: string;
  note: string;
  value: number;
  color: "red" | "green" | "gray";
}) {
  const palette = {
    red: ["bg-red-50", "border-red-200", "text-red-600", "text-red-500"],
    green: [
      "bg-green-50",
      "border-green-200",
      "text-green-600",
      "text-green-500",
    ],
    gray: ["bg-gray-50", "border-gray-200", "text-gray-600", "text-gray-500"],
  }[color];
  return (
    <div
      className={`flex justify-between items-center p-3 rounded-lg border ${palette[0]} ${palette[1]}`}
    >
      <div>
        <p className="font-medium text-gray-700">{label}</p>
        <p className={`text-sm ${palette[3]}`}>{note}</p>
      </div>
      <span className={`text-2xl font-bold ${palette[2]}`}>{value}</span>
    </div>
  );
}
