import React, { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge as UiBadge } from "../../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { useToast } from "../../hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";

// Icons
import {
  LogOut,
  FileText,
  Clock,
  ListChecks,
  Users,
  DollarSign,
  TrendingUp,
  Send,
  ArrowRight,
  RefreshCw,
  Search,
  CheckCircle,
} from "lucide-react";
import {
  ClearanceStatusCounts,
  ExitCase,
  ExitDashboardStats,
  exitService,
} from "../../utils/api/admin.exit.api";

// ---------- Small UI helpers ----------
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

const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} />
);

const TinyProgress: React.FC<{ value: number }> = ({ value }) => {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const bar =
    pct >= 95 ? "bg-green-500" : pct >= 70 ? "bg-orange-500" : "bg-red-500";
  return (
    <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
      <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
    </div>
  );
};

const CaseStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const normalized = status.toUpperCase();
  const map: Record<string, { label: string; style: string }> = {
    ACTIVE: {
      label: "In Progress",
      style: "bg-orange-100 hover:bg-orange-50 transition-colors text-orange-800 border-orange-300",
    },
    PENDING_FNF: {
      label: "Pending F&F",
      style: "bg-yellow-100 text-yellow-800 border-yellow-300",
    },
    COMPLETED: {
      label: "Complete",
      style: "bg-green-100 text-green-800 border-green-300",
    },
  };
  const def = {
    label: status,
    style: "bg-gray-100 text-gray-800 border-gray-300",
  };
  const cfg = map[normalized] || def;
  return (
    <UiBadge className={`font-medium border ${cfg.style}`}>{cfg.label}</UiBadge>
  );
};

// ---------- Main ----------
export default function ExitWorkflowDashboard() {
  const { toast } = useToast();

  // Data
  const [stats, setStats] = useState<ExitDashboardStats | null>(null);
  const [cases, setCases] = useState<ExitCase[] | null>(null);
  const [clearance, setClearance] = useState<ClearanceStatusCounts | null>(
    null
  );
  const [approvingTaskId, setApprovingTaskId] = useState<string | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [pastOpen, setPastOpen] = useState(false);
  const [pastExits, setPastExits] = useState<ExitCase[]>([]);
  const [pastLoading, setPastLoading] = useState(false);

  const [pastFilters, setPastFilters] = useState({
    search: "",
    department: "all",
    fromDate: "",
    toDate: "",
  });


  // Modal: Log resignation
  const [openCreate, setOpenCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [form, setForm] = useState({
    userId: "",
    resignationDate: "",
    lastDay: "",
    reason: "",
  });

  const [employeeQuery, setEmployeeQuery] = useState("");
  const [employeeResults, setEmployeeResults] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [openDetails, setOpenDetails] = useState(false);
  const [activeExitCase, setActiveExitCase] = useState<ExitCase | null>(null);
  const [clearanceTasks, setClearanceTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const [fnfOpen, setFnfOpen] = useState(false);
  const [fnfLoading, setFnfLoading] = useState(false);
  const [activeFnfCase, setActiveFnfCase] = useState<ExitCase | null>(null);

  const [fnfForm, setFnfForm] = useState({
    salaryPayable: "",
    leaveEncashment: "",
    deductions: "",
    remarks: "",
  });

  const exportExcel = () => {
    const params = new URLSearchParams();

    Object.entries(pastFilters).forEach(([key, value]) => {
      if (value && value !== "all") {
        params.append(key, value);
      }
    });

    window.open(
      `${import.meta.env.VITE_API_URL}/exit/past/export/excel?${params.toString()}`,
      "_blank"
    );
  };

  const exportPdf = () => {
    const params = new URLSearchParams();

    Object.entries(pastFilters).forEach(([key, value]) => {
      if (value && value !== "all") {
        params.append(key, value);
      }
    });

    window.open(
      `${import.meta.env.VITE_API_URL}/exit/past/export/pdf?${params.toString()}`,
      "_blank"
    );
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, c, cl] = await Promise.all([
        exitService.getDashboardStats(),
        exitService.getActiveExitCases(),
        exitService.getClearanceStatus(),
      ]);
      setStats(s);
      setCases(c);
      setClearance(cl);
      setLastRefreshedAt(new Date());
    } catch (err: any) {
      toast({
        title: "Failed to load exit workflow data",
        description: err?.response?.data?.message || err?.message,
        variant: "destructive",
      });
      setStats({
        activeExitCases: "0",
        avgNoticePeriod: "0",
        pendingClearances: "0",
        fnfAutomation: "0%",
      });
      setCases([]);
      setClearance({ IT: 0, FINANCE: 0, HR: 0, MANAGER: 0 });
    } finally {
      setLoading(false);
    }
  };


  const netPay =
    Number(fnfForm.salaryPayable || 0) +
    Number(fnfForm.leaveEncashment || 0) -
    Number(fnfForm.deductions || 0);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Header actions
  const headerActions = useMemo(
    () => (
      <div className="flex gap-3">
        <Button
          variant="default"
          className="bg-orange-600 hover:bg-orange-700 shadow-md"
          onClick={() => setOpenCreate(true)}
        >
          <Send className="mr-2 h-4 w-4" />
          Log New Resignation
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
            <LogOut className="h-7 w-7 text-orange-600" />
            Separation and Exit Workflow
          </h1>
          <p className="text-gray-500 mt-1">
            Manage digital resignation, clearance, and full & final settlement
            processes.
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
        {!stats ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <Card className="p-5 border-l-4 border-orange-500 hover:shadow-lg transition bg-orange-50">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Active Exit Cases
                  </h3>
                  <p className="text-3xl font-bold mt-2 text-orange-600">
                    {stats.activeExitCases}
                  </p>
                </div>
                <LogOut className="h-8 w-8 p-1.5 rounded-full text-orange-600 bg-orange-100" />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Currently in Progress
              </p>
            </Card>

            <Card className="p-5 border-l-4 border-indigo-500 hover:shadow-lg transition bg-indigo-50">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Avg Notice Period
                  </h3>
                  <p className="text-3xl font-bold mt-2 text-indigo-600">
                    {stats.avgNoticePeriod}
                  </p>
                </div>
                <Clock className="h-8 w-8 p-1.5 rounded-full text-indigo-600 bg-indigo-100" />
              </div>
              <p className="text-xs text-gray-400 mt-1">Days Served</p>
            </Card>

            <Card className="p-5 border-l-4 border-red-500 hover:shadow-lg transition bg-red-50">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Pending Clearances
                  </h3>
                  <p className="text-3xl font-bold mt-2 text-red-600">
                    {stats.pendingClearances}
                  </p>
                </div>
                <ListChecks className="h-8 w-8 p-1.5 rounded-full text-red-600 bg-red-100" />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Departmental Sign-offs
              </p>
            </Card>

            <Card className="p-5 border-l-4 border-green-500 hover:shadow-lg transition bg-green-50">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Full & Final Automation
                  </h3>
                  <p className="text-3xl font-bold mt-2 text-green-600">
                    {stats.fnfAutomation}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 p-1.5 rounded-full text-green-600 bg-green-100" />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Successful Auto-Settlements
              </p>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Table: Active Exit Cases */}
        <Card className="p-6 shadow-xl lg:col-span-2">
          <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-600" />
            Active Resignations & Notice Tracking
          </h2>

          {!cases ? (
            <div className="space-y-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : cases.length === 0 ? (
            <div className="text-sm text-gray-500 border rounded-lg p-6 bg-white">
              No active exit cases.
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow className="hover:bg-gray-50">
                  <TableHead className="w-[24%] text-gray-600">
                    Employee / Dept
                  </TableHead>
                  <TableHead className="w-[14%] text-gray-600">
                    Resignation Date
                  </TableHead>
                  <TableHead className="w-[14%] text-gray-600">
                    Last Day
                  </TableHead>
                  <TableHead className="w-[12%] text-gray-600">
                    Notice
                  </TableHead>
                  <TableHead className="w-[24%] text-gray-600">
                    Clearance
                  </TableHead>
                  <TableHead className="w-[12%] text-gray-600 text-center">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-orange-50"
                    onClick={async () => {
                      setActiveExitCase(c);
                      setOpenDetails(true);
                      setLoadingTasks(true);

                      const tasks = await exitService.getClearanceTasks(c.id);
                      setClearanceTasks(tasks);
                      setLoadingTasks(false);
                    }}
                  >
                    <TableCell className="font-medium text-gray-700">
                      {c.employee}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {c.department} ({c.id})
                      </p>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {c.resignationDate}
                    </TableCell>
                    <TableCell className="text-gray-600 font-medium">
                      {c.lastDay}
                    </TableCell>
                    <TableCell>
                      <UiBadge
                        variant="outline"
                        className="bg-gray-100 text-gray-700"
                      >
                        {c.noticePeriod} Days
                      </UiBadge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TinyProgress value={c.clearanceProgress} />
                        <span className="text-sm font-medium text-gray-700 min-w-[3ch] text-right">
                          {Math.round(c.clearanceProgress)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center space-y-1">
                      <CaseStatusBadge status={c.status} />

                      {c.status === "PENDING_FNF" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation(); // ⭐ THIS IS CRITICAL
                            setActiveFnfCase(c);
                            setFnfOpen(true);
                          }}
                        >
                          Process F&F
                        </Button>
                      )}
                    </TableCell>

                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <Button
            variant="link"
            className="mt-6 p-0 text-orange-600 h-auto"
            onClick={async () => {
              setPastOpen(true);
              setPastLoading(true);
              const data = await exitService.getPastExitCases({});
              setPastExits(data);
              setPastLoading(false);
            }}
          >
            View All Past Exits <Search className="ml-1 h-3 w-3" />
          </Button>

        </Card>

        {/* Side: No-Dues Clearance Status + Quick POSH info */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 shadow-xl">
            <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-blue-500" />
              No-Dues Clearance Status
            </h3>

            {!clearance ? (
              <div className="space-y-2">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : (
              <div className="space-y-3">
                <DeptRow
                  label="IT Department Pending"
                  value={clearance.IT}
                  icon={<Users className="h-4 w-4 mr-2 text-blue-500" />}
                  tone="red"
                />
                <DeptRow
                  label="Finance Approval Needed"
                  value={clearance.FINANCE}
                  icon={<DollarSign className="h-4 w-4 mr-2 text-blue-500" />}
                  tone="orange"
                />
                <DeptRow
                  label="HR Exit Interview Due"
                  value={clearance.HR}
                  icon={<Users className="h-4 w-4 mr-2 text-blue-500" />}
                  tone="green"
                />
                <DeptRow
                  label="Manager Clearance Pending"
                  value={clearance.MANAGER}
                  icon={<Users className="h-4 w-4 mr-2 text-blue-500" />}
                  tone="gray"
                />
              </div>
            )}
          </Card>

          <Card className="p-6 shadow-xl">
            <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-teal-500" />
              Settlement / POSH Snapshot
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-teal-50 rounded-lg">
                <p className="text-sm text-gray-600 font-medium">
                  Ready for F&F Processing
                </p>
                <span className="text-sm font-bold text-teal-600">
                  {stats ? stats.fnfAutomation : "--"}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-teal-50 rounded-lg">
                <p className="text-sm text-gray-600 font-medium">
                  Average Notice (days)
                </p>
                <span className="text-sm font-bold text-teal-600">
                  {stats ? stats.avgNoticePeriod : "--"}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Create Resignation Modal */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Log New Resignation</DialogTitle>
            <DialogDescription>
              Record a resignation and auto-create clearance tasks.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-700 font-medium">
                Search by name or ID
              </label>
              <Input
                placeholder="Search employee by name or ID"
                value={employeeQuery}
                onChange={async (e) => {
                  const q = e.target.value;
                  setEmployeeQuery(q);

                  if (q.length < 2) {
                    setEmployeeResults([]);
                    return;
                  }

                  const res = await exitService.searchEmployees(q);
                  setEmployeeResults(res);
                }}
              />

              {employeeResults.length > 0 && (
                <div className="border rounded-md mt-2 max-h-48 overflow-y-auto">
                  {employeeResults.map((emp) => (
                    <div
                      key={emp.userId}
                      className="p-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        setSelectedEmployee(emp);
                        setForm((f) => ({ ...f, userId: emp.userId }));
                        setEmployeeResults([]);
                        setEmployeeQuery(
                          `${emp.name} (${emp.employeeId})`
                        );
                      }}
                    >
                      <div className="font-medium">{emp.name}</div>
                      <div className="text-xs text-gray-500">
                        {emp.employeeId} · {emp.designation}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-700 font-medium">
                Resignation Date
              </label>
              <Input
                type="date"
                value={form.resignationDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, resignationDate: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-700 font-medium">
                Last Working Day
              </label>
              <Input
                type="date"
                value={form.lastDay}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lastDay: e.target.value }))
                }
              />
            </div>
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-sm text-gray-700 font-medium">
                Reason (optional)
              </label>
              <Textarea
                rows={3}
                value={form.reason}
                onChange={(e) =>
                  setForm((f) => ({ ...f, reason: e.target.value }))
                }
                placeholder="(Optional) Reason for leaving"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              Cancel
            </Button>
            <Button
              className={`bg-orange-600 hover:bg-orange-700`}
              disabled={createLoading}
              onClick={async () => {
                setCreateLoading(true);
                try {
                  if (!form.userId || !form.resignationDate || !form.lastDay) {
                    throw new Error(
                      "Employee, resignation date, and last day are required."
                    );
                  }
                  await exitService.logResignation({
                    userId: form.userId,
                    resignationDate: form.resignationDate,
                    lastDay: form.lastDay,
                    reason: form.reason || undefined,
                  });
                  toast({
                    title: "Resignation logged",
                    description: "Clearance tasks created.",
                    variant: "success",
                  });
                  setOpenCreate(false);
                  setForm({
                    userId: "",
                    resignationDate: "",
                    lastDay: "",
                    reason: "",
                  });
                  await loadAll();
                } catch (err: any) {
                  toast({
                    title: "Failed to log resignation",
                    description: err?.response?.data?.message || err?.message,
                    variant: "destructive",
                  });
                } finally {
                  setCreateLoading(false);
                }
              }}
            >
              {createLoading ? (
                <>
                  <Spinner className="mr-2" /> Logging…
                </>
              ) : (
                "Log Resignation"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openDetails} onOpenChange={setOpenDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Exit Case Details</DialogTitle>
            <DialogDescription>
              Case ID: {activeExitCase?.id}
            </DialogDescription>
          </DialogHeader>

          {/* Employee Info */}
          <div className="border rounded-md p-4 bg-gray-50">
            <p className="font-medium">{activeExitCase?.employee}</p>
            <p className="text-sm text-gray-500">
              {activeExitCase?.department}
            </p>
            <p className="text-sm mt-1">
              Status: <CaseStatusBadge status={activeExitCase?.status || ""} />
            </p>
          </div>

          {/* Clearance Table */}
          {loadingTasks ? (
            <p className="text-sm text-gray-500">Loading clearance tasks…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clearanceTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>{task.department}</TableCell>
                    <TableCell>
                      <UiBadge
                        variant="outline"
                        className={
                          task.status === "APPROVED"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }
                      >
                        {task.status}
                      </UiBadge>
                    </TableCell>
                    <TableCell className="text-right">
                      {task.status === "PENDING" && (
                        <Button
                          size="sm"
                          disabled={approvingTaskId === task.id}
                          onClick={async () => {
                            try {
                              setApprovingTaskId(task.id);

                              await exitService.approveClearance(task.id);

                              const refreshed =
                                await exitService.getClearanceTasks(activeExitCase!.id);
                              setClearanceTasks(refreshed);

                              await loadAll(); // refresh dashboard
                            } finally {
                              setApprovingTaskId(null);
                            }
                          }}
                        >
                          {approvingTaskId === task.id ? (
                            <>
                              <Spinner className="mr-2" />
                              Approving…
                            </>
                          ) : (
                            "Approve"
                          )}
                        </Button>
                      )}
                    </TableCell>

                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={fnfOpen} onOpenChange={setFnfOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Full & Final Settlement</DialogTitle>
            <DialogDescription>
              Complete settlement and close exit case
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="bg-gray-50 p-3 rounded-md text-sm">
              <div className="font-medium">{activeFnfCase?.employee}</div>
              <div className="text-gray-500">
                Last Working Day: {activeFnfCase?.lastDay}
              </div>
            </div>
            <Input
              type="number"
              placeholder="Salary Payable (₹)"
              value={fnfForm.salaryPayable}
              onChange={(e) =>
                setFnfForm((f) => ({ ...f, salaryPayable: e.target.value }))
              }
            />

            <Input
              type="number"
              placeholder="Leave Encashment (₹)"
              value={fnfForm.leaveEncashment}
              onChange={(e) =>
                setFnfForm((f) => ({ ...f, leaveEncashment: e.target.value }))
              }
            />

            <Input
              type="number"
              placeholder="Deductions (₹)"
              value={fnfForm.deductions}
              onChange={(e) =>
                setFnfForm((f) => ({ ...f, deductions: e.target.value }))
              }
            />
            <Textarea
              placeholder="Remarks (e.g. Salary paid via bank on 30th Jan)"
              value={fnfForm.remarks}
              onChange={(e) =>
                setFnfForm((f) => ({ ...f, remarks: e.target.value }))
              }
            />

            <div className="flex justify-between items-center bg-green-50 p-3 rounded-md">
              <span className="text-sm font-medium text-green-700">
                Net Payable
              </span>
              <span className="text-lg font-bold text-green-800">
                ₹ {netPay}
              </span>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              I confirm that all dues are settled and this exit case can be closed.
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFnfOpen(false)}>
              Cancel
            </Button>

            <Button
              disabled={!confirmed || fnfLoading}
              onClick={async () => {
                try {
                  setFnfLoading(true);

                  await exitService.completeFnf(
                    activeFnfCase!.id,
                    fnfForm
                  );

                  toast({
                    title: "F&F Completed",
                    description: "Exit case successfully closed.",
                    variant: "success",
                  });

                  setFnfOpen(false);
                  setFnfForm({
                    salaryPayable: "",
                    leaveEncashment: "",
                    deductions: "",
                    remarks: "",
                  });

                  await loadAll();
                } catch (err: any) {
                  toast({
                    title: "Failed to complete F&F",
                    description: err?.message,
                    variant: "destructive",
                  });
                } finally {
                  setFnfLoading(false);
                }
              }}
            >
              {fnfLoading ? "Processing..." : "Complete F&F"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pastOpen} onOpenChange={setPastOpen}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Exit History (Audit)</DialogTitle>
            <DialogDescription>
              Completed exit cases – read-only, exportable
            </DialogDescription>
          </DialogHeader>

          {/* Filters */}
          <Card className="p-4">
            <div className="grid grid-cols-5 gap-3 pr-6">
              <Input
                placeholder="Search name / employee ID"
                value={pastFilters.search}
                onChange={(e) =>
                  setPastFilters((f) => ({ ...f, search: e.target.value }))
                }
              />

              <Input
                type="date"
                value={pastFilters.fromDate}
                onChange={(e) =>
                  setPastFilters((f) => ({ ...f, fromDate: e.target.value }))
                }
              />

              <Input
                type="date"
                value={pastFilters.toDate}
                onChange={(e) =>
                  setPastFilters((f) => ({ ...f, toDate: e.target.value }))
                }
              />

              <Button
                onClick={async () => {
                  setPastLoading(true);
                  const data = await exitService.getPastExitCases(pastFilters);
                  setPastExits(data);
                  setPastLoading(false);
                }}
              >
                Apply Filters
              </Button>

              <div className="flex gap-2">
                <Button variant="outline" onClick={exportExcel}>
                  Export Excel
                </Button>
                <Button variant="outline" onClick={exportPdf}>Export PDF</Button>
              </div>
            </div>
          </Card>

          {/* Table */}
          <div className="max-h-[60vh] overflow-y-auto mt-4">
            {pastLoading ? (
              <Skeleton className="h-40" />
            ) : pastExits.length === 0 ? (
              <p className="text-sm text-gray-500 p-4">No past exits found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Resigned</TableHead>
                    <TableHead>Last Day</TableHead>
                    <TableHead>F&F Completed</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {pastExits.map((c: any) => (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        setActiveExitCase(c);
                        setOpenDetails(true);
                        setPastOpen(false);
                      }}
                    >
                      <TableCell className="font-medium">{c.employee}</TableCell>
                      <TableCell>{c.id}</TableCell>
                      <TableCell>{c.department}</TableCell>
                      <TableCell>{c.resignationDate}</TableCell>
                      <TableCell>{c.lastDay}</TableCell>
                      <TableCell>{c.fnfCompletedAt || "-"}</TableCell>
                      <TableCell>
                        <UiBadge className="bg-green-100 text-green-700 border-green-300">
                          Completed
                        </UiBadge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPastOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
}

// ---- small subcomponent for the clearance card rows ----
const DeptRow: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "red" | "orange" | "green" | "gray";
}> = ({ label, value, icon, tone }) => {
  const color = {
    red: "text-red-600",
    orange: "text-orange-600",
    green: "text-green-600",
    gray: "text-gray-700",
  }[tone];

  return (
    <div className="flex justify-between items-center p-3 rounded-lg border border-blue-100 bg-white hover:bg-blue-50/50">
      <p className="font-medium text-gray-800 flex items-center">
        <span className="mr-2">{icon}</span> {label}
      </p>
      <span className={`text-sm font-bold ${color}`}>
        {value} {value === 1 ? "Case" : "Cases"}
      </span>
    </div>
  );
};
