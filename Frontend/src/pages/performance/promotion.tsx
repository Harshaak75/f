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
import { Input } from "../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { useToast } from "../../hooks/use-toast";
import {
  Users,
  CheckCircle,
  Clock,
  TrendingUp,
  DollarSign,
  ListPlus,
  Settings,
  ArrowRight,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import {
  promotionsService,
  type PromotionRequestDTO,
} from "../../utils/api/Admin.promotionsService";
import { ReviewCycle, reviewsService } from "../../utils/api/admin.feedback";

/* ---------- helpers ---------- */

const getStatusStyle = (status: string) => {
  switch (status) {
    case "APPROVED":
      return "bg-green-100 text-green-700 border-green-300";
    case "PENDING_HR":
    case "PENDING_MANAGER":
      return "bg-amber-100 text-amber-700 border-amber-300";
    case "REJECTED":
      return "bg-red-100 text-red-700 border-red-300";
    case "DRAFT":
      return "bg-gray-100 text-gray-700 border-gray-300";
    default:
      return "bg-gray-100 text-gray-700 border-gray-300";
  }
};

const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => (
  <div className="w-full bg-gray-200 rounded-full h-2">
    <div
      className="h-2 rounded-full transition-all duration-500"
      style={{
        width: `${progress}%`,
        backgroundColor:
          progress >= 75 ? "#10b981" : progress >= 40 ? "#f97316" : "#ef4444",
      }}
    />
  </div>
);

const fmtDateRange = (c?: ReviewCycle) => {
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
};

/* ---------- cards (some are illustrative/static; you can replace with real stats later) ---------- */
const budgetSummaryCards = (count: number) => [
  {
    title: "Total Requests",
    value: String(count),
    unit: "in Selected Cycle",
    icon: Users,
    color: "text-indigo-600",
  },
  {
    title: "Approved Value",
    value: "₹—",
    unit: "Annualized Impact",
    icon: DollarSign,
    color: "text-green-600",
  },
  {
    title: "Pending HR Approvals",
    value: "—",
    unit: "Requires Review",
    icon: Clock,
    color: "text-amber-600",
  },
  {
    title: "Budget Utilized",
    value: "—",
    unit: "Promotion Budget",
    icon: TrendingUp,
    color: "text-sky-600",
  },
];

/* ---------- main component ---------- */

export default function PromotionAndIncrementDashboard() {
  const { toast } = useToast();

  // cycles
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string | undefined>(
    undefined
  );
  const [cyclesLoading, setCyclesLoading] = useState(true);

  // list
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<PromotionRequestDTO[]>([]);

  // approve/reject dialogs
  const [targetId, setTargetId] = useState<string | null>(null);
  const [hrNotes, setHrNotes] = useState("");
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [acting, setActing] = useState(false);

  // new request dialog
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newUserId, setNewUserId] = useState("");
  const [newDesignation, setNewDesignation] = useState("");
  const [newCTC, setNewCTC] = useState<string>("");
  const [newManagerNotes, setNewManagerNotes] = useState("");

  const selectedCycle = useMemo(
    () => cycles.find((c) => c.id === selectedCycleId),
    [cycles, selectedCycleId]
  );

  /* load cycles */
  useEffect(() => {
    (async () => {
      try {
        setCyclesLoading(true);
        const list = await reviewsService.listCycles();
        setCycles(list);
        if (list.length && !selectedCycleId) setSelectedCycleId(list[0].id);
      } catch (e: any) {
        toast({
          title: "Failed to load cycles",
          description: e?.response?.data?.message || e?.message,
          variant: "destructive",
        });
      } finally {
        setCyclesLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* load requests when cycle changes */
  useEffect(() => {
    if (!selectedCycleId) return;
    (async () => {
      try {
        setLoading(true);
        const data = await promotionsService.list(selectedCycleId);
        setRequests(data);
      } catch (e: any) {
        toast({
          title: "Failed to load promotion requests",
          description: e?.response?.data?.message || e?.message,
          variant: "destructive",
        });
        setRequests([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedCycleId, toast]);

  const refresh = async () => {
    if (!selectedCycleId) return;
    setLoading(true);
    try {
      const data = await promotionsService.list(selectedCycleId);
      setRequests(data);
    } catch (e: any) {
      toast({
        title: "Refresh failed",
        description: e?.response?.data?.message || e?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openAction = (id: string, which: "approve" | "reject") => {
    setTargetId(id);
    setAction(which);
    setHrNotes("");
  };

  const doAction = async () => {
    if (!targetId || !action) return;
    try {
      setActing(true);
      if (action === "approve") {
        await promotionsService.approve(targetId, hrNotes || undefined);
        toast({
          title: "Approved",
          description: "Promotion request approved.",
        });
      } else {
        if (!hrNotes.trim()) {
          toast({
            title: "Notes required",
            description: "Please provide a rejection reason.",
            variant: "destructive",
          });
          setActing(false);
          return;
        }
        await promotionsService.reject(targetId, hrNotes.trim());
        toast({
          title: "Rejected",
          description: "Promotion request rejected.",
        });
      }
      setTargetId(null);
      setAction(null);
      setHrNotes("");
      await refresh();
    } catch (e: any) {
      toast({
        title: "Action failed",
        description: e?.response?.data?.message || e?.message,
        variant: "destructive",
      });
    } finally {
      setActing(false);
    }
  };

  const submitNew = async () => {
    if (!selectedCycleId) {
      toast({
        title: "Select a cycle",
        description: "Choose a review cycle first.",
        variant: "destructive",
      });
      return;
    }
    if (!newUserId || !newDesignation || !newCTC) {
      toast({
        title: "Missing fields",
        description: "User, designation and CTC are required.",
        variant: "destructive",
      });
      return;
    }
    try {
      await promotionsService.create({
        userId: newUserId,
        cycleId: selectedCycleId,
        proposedDesignation: newDesignation,
        proposedAnnualCTC: Number(newCTC),
        managerNotes: newManagerNotes || undefined,
      });
      toast({ title: "Submitted", description: "Promotion request created." });
      setIsNewOpen(false);
      setNewUserId("");
      setNewDesignation("");
      setNewCTC("");
      setNewManagerNotes("");
      await refresh();
    } catch (e: any) {
      toast({
        title: "Create failed",
        description: e?.response?.data?.message || e?.message,
        variant: "destructive",
      });
    }
  };

  // Derived cards
  const cards = useMemo(
    () => budgetSummaryCards(requests.length),
    [requests.length]
  );

  // Dummy utilization sidebar
  const budgetUtilization = 75;

  return (
    <div className="space-y-8 p-4 sm:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <DollarSign className="h-7 w-7 text-green-600" />
            Promotion & Increment Approval
          </h1>
          <p className="text-gray-500 text-[0.8rem] ml-10 mt-1">
            Review, approve, and track compensation adjustments.
          </p>
          {selectedCycle && (
            <p className="text-xs font-bold text-muted-foreground mt-1">
              Current cycle:{" "}
              <span className="font-medium">{selectedCycle.name}</span> &nbsp;(
              {fmtDateRange(selectedCycle)}) [{selectedCycle.status}]
            </p>
          )}
        </div>

        <div className="flex gap-3 items-center">
          <Button
            variant="default"
            className="bg-green-600 hover:bg-green-700 shadow-md"
            onClick={() => setIsNewOpen(true)}
          >
            <ListPlus className="mr-2 h-4 w-4" />
            Submit New Request
          </Button>

          <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
            <SelectTrigger className="w-[240px] border-gray-300 bg-white shadow-sm">
              <SelectValue
                placeholder={cyclesLoading ? "Loading cycles…" : "Select Cycle"}
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
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => {
          const Icon = card.icon as any;
          return (
            <Card
              key={card.title}
              className="p-5 border-l-4 border-green-500 hover:shadow-lg transition duration-200"
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* List */}
        <Card className="p-6 shadow-xl lg:col-span-3">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              Pending & Recent Requests
            </h2>
            <Button variant="outline" onClick={refresh} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Refresh
            </Button>
          </div>

          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow className="hover:bg-gray-50">
                <TableHead className="w-[18%] text-gray-600">
                  Employee
                </TableHead>
                <TableHead className="w-[24%] text-gray-600">Change</TableHead>
                <TableHead className="w-[12%] text-gray-600">
                  Increment (%)
                </TableHead>
                <TableHead className="w-[16%] text-gray-600">
                  Budget Impact
                </TableHead>
                <TableHead className="w-[14%] text-gray-600 text-center">
                  Status
                </TableHead>
                <TableHead className="w-[16%] text-gray-600 text-center">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow
                  key={r.id}
                  className="hover:bg-green-50/40 transition-colors"
                >
                  <TableCell className="font-medium text-gray-700">
                    {r.employeeName}
                  </TableCell>
                  <TableCell className="text-sm text-gray-700">
                    {r.currentRole}{" "}
                    <ArrowRight className="inline h-3 w-3 mx-1 text-indigo-500" />{" "}
                    {r.proposedRole}
                  </TableCell>
                  <TableCell className="font-semibold text-indigo-600">
                    {r.incrementPercentage?.toFixed?.(2) ??
                      r.incrementPercentage}
                    %
                  </TableCell>
                  <TableCell className="font-semibold text-green-700">
                    {r.budgetImpact}
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`inline-flex px-3 py-0.5 text-xs font-semibold rounded-full border ${getStatusStyle(
                        r.status
                      )}`}
                    >
                      {r.status.replace("_", " ")}
                    </span>
                  </TableCell>
                  <TableCell className="text-center space-x-2">
                    {r.status === "PENDING_HR" && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => openAction(r.id, "approve")}
                        >
                          <ShieldCheck className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAction(r.id, "reject")}
                        >
                          <XCircle className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </>
                    )}
                    {r.status !== "PENDING_HR" && (
                      <Button size="sm" variant="outline">
                        Details
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!requests.length && !loading && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-sm text-muted-foreground text-center py-8"
                  >
                    No promotion requests for this cycle.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Budget Sidebar (placeholder) */}
        <Card className="p-6 shadow-xl lg:col-span-1 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-500" />
              Budget Controls
            </h3>

            <div className="space-y-4 pt-2">
              <p className="font-medium text-sm text-gray-700">
                Selected Cycle Budget Utilization
              </p>
              <div className="relative pt-1">
                <ProgressBar progress={budgetUtilization} />
                <div className="text-right mt-1">
                  <span className="text-xl font-bold text-green-600">
                    {budgetUtilization}%
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <p className="text-sm text-gray-600">Current Remaining:</p>
                <span className="font-bold text-green-600">₹—</span>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">Total Budget:</p>
                <span className="font-bold text-gray-800">₹—</span>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full mt-6 justify-center text-indigo-600 border-indigo-300 hover:bg-indigo-100"
          >
            Configure Budget Pools
          </Button>
        </Card>
      </div>

      {/* Approve/Reject Dialog */}
      <Dialog
        open={!!action}
        onOpenChange={(open) => {
          if (!open) {
            setAction(null);
            setTargetId(null);
            setHrNotes("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "approve" ? "Approve Promotion" : "Reject Promotion"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Label htmlFor="hr-notes" className="text-sm">
              HR Notes {action === "reject" ? "(required)" : "(optional)"}
            </Label>
            <Textarea
              id="hr-notes"
              value={hrNotes}
              onChange={(e) => setHrNotes(e.target.value)}
              placeholder={
                action === "reject"
                  ? "Reason for rejection…"
                  : "Notes (optional)"
              }
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setAction(null);
                setTargetId(null);
                setHrNotes("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={doAction} disabled={acting}>
              {acting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {action === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Request Dialog */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit New Promotion Request</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm">Employee (userId)</Label>
              <Input
                placeholder="user_12345"
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Proposed Designation</Label>
                <Input
                  placeholder="Senior Software Engineer"
                  value={newDesignation}
                  onChange={(e) => setNewDesignation(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm">Proposed Annual CTC (₹)</Label>
                <Input
                  type="number"
                  placeholder="1200000"
                  value={newCTC}
                  onChange={(e) => setNewCTC(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label className="text-sm">Manager Notes (optional)</Label>
              <Textarea
                placeholder="Context for this promotion…"
                value={newManagerNotes}
                onChange={(e) => setNewManagerNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsNewOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitNew}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
