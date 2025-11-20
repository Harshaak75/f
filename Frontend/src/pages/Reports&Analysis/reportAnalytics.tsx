import React, { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
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
import { useToast } from "../../hooks/use-toast";

import {
  LayoutDashboard,
  TrendingUp,
  DollarSign,
  Clock,
  Download,
  FileText,
  Settings,
  Table2,
  Database,
  RefreshCw,
} from "lucide-react";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import {
  analyticsService,
  type SummaryResp,
  type ChartsResp,
  type SavedReport,
} from "../../utils/api/admin.analytics.api";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Textarea } from "../../components/ui/textarea";

// ---------- helpers ----------
const Spinner = ({ className = "" }) => (
  <svg className={`animate-spin h-4 w-4 ${className}`} viewBox="0 0 24 24">
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
const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} />
);

const TrendPill: React.FC<{
  text: string;
  type: "positive" | "negative" | "neutral";
}> = ({ text, type }) => {
  const cls =
    type === "positive"
      ? "text-green-700 bg-green-100"
      : type === "negative"
      ? "text-red-700 bg-red-100"
      : "text-gray-700 bg-gray-100";
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${cls}`}>
      {text}
    </span>
  );
};

// ---------- main ----------
export default function AnalyticsDashboard() {
  const { toast } = useToast();

  // api data
  const [summary, setSummary] = useState<SummaryResp | null>(null);
  const [charts, setCharts] = useState<ChartsResp | null>(null);
  const [reports, setReports] = useState<SavedReport[] | null>(null);

  // ui state
  const [loading, setLoading] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  // create report modal
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    dataDomain: "" as
      | ""
      | "payroll"
      | "attendance"
      | "performance"
      | "attrition",
    frequency: "" as
      | ""
      | "Daily"
      | "Weekly"
      | "Monthly"
      | "Quarterly"
      | "Ad-hoc",
    exportOptions: [] as string[],
    notes: "",
  });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, c, r] = await Promise.all([
        analyticsService.getSummary(),
        analyticsService.getCharts(),
        analyticsService.getSavedReports(),
      ]);
      setSummary(s);
      setCharts(c);
      setReports(r);
      setLastRefreshedAt(new Date());
    } catch (err: any) {
      toast({
        title: "Failed to load analytics",
        description: err?.response?.data?.message || err?.message,
        variant: "destructive",
      });
      setSummary(null);
      setCharts(null);
      setReports([]);
    } finally {
      setLoading(false);
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
          <Database className="mr-2 h-4 w-4" />
          Create Custom Report
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
            <LayoutDashboard className="h-7 w-7 text-blue-600" />
            HR & Management Analytics Hub
          </h1>
          <p className="text-gray-500 mt-1">
            Real-time data visualization and custom reporting across HR domains.
          </p>
          {lastRefreshedAt && (
            <p className="text-xs text-gray-400 mt-1">
              Last refreshed: {lastRefreshedAt.toLocaleString()}
            </p>
          )}
        </div>
        {headerActions}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {!summary ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <KpiCard
              title="Annual Attrition Rate"
              icon={TrendingUp}
              color="text-green-600"
              bg="bg-green-50"
              value={summary.attritionRate.value}
              trend={summary.attritionRate.trend}
              type={summary.attritionRate.trendType}
            />
            <KpiCard
              title="Avg Performance Score"
              icon={TrendingUp}
              color="text-indigo-600"
              bg="bg-indigo-50"
              value={summary.avgPerformanceScore.value}
              trend={summary.avgPerformanceScore.trend}
              type={summary.avgPerformanceScore.trendType}
            />
            <KpiCard
              title="Total Monthly Payroll"
              icon={DollarSign}
              color="text-purple-600"
              bg="bg-purple-50"
              value={summary.totalMonthlyPayroll.value}
              trend={summary.totalMonthlyPayroll.trend}
              type={summary.totalMonthlyPayroll.trendType}
            />
            <KpiCard
              title="Avg Absence Rate"
              icon={Clock}
              color="text-red-600"
              bg="bg-red-50"
              value={summary.avgAbsenceRate.value}
              trend={summary.avgAbsenceRate.trend}
              type={summary.avgAbsenceRate.trendType}
            />
          </>
        )}
      </div>

      {/* Charts */}
      <Card className="p-6 shadow-xl">
        <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Workforce Trends & Matrix Dashboard
        </h2>

        {!charts ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Headcount (Line) */}
            <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-inner h-64">
              <h3 className="font-semibold text-gray-700 mb-3">
                Headcount & Growth
              </h3>
              <ResponsiveContainer width="100%" height="80%">
                <LineChart
                  data={charts.headcountData}
                  margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" style={{ fontSize: "10px" }} />
                  <YAxis style={{ fontSize: "10px" }} />
                  <Tooltip />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: "12px" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Headcount"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Payroll (Bar) */}
            <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-inner h-64">
              <h3 className="font-semibold text-gray-700 mb-3">
                Payroll Cost by Department (₹ Cr, Annualized)
              </h3>
              <ResponsiveContainer width="100%" height="80%">
                <BarChart
                  data={charts.payrollData}
                  margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="department"
                    style={{ fontSize: "10px" }}
                    interval={0}
                    angle={-10}
                    textAnchor="end"
                    height={30}
                  />
                  <YAxis style={{ fontSize: "10px" }} />
                  <Tooltip
                    formatter={(value: number) => [
                      `₹${value.toFixed(2)} Cr`,
                      "Cost",
                    ]}
                  />
                  <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                    {charts.payrollData.map((d, i) => (
                      <Cell key={i} fill={d.color || "#4c51bf"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Performance (Pie) */}
            <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-inner h-64">
              <h3 className="font-semibold text-gray-700 mb-3">
                Performance Rating Distribution
              </h3>
              <ResponsiveContainer width="100%" height="80%">
                <PieChart>
                  <Pie
                    data={charts.performanceData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    labelLine={false}
                  >
                    {charts.performanceData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report builder (quick create) */}
        <Card className="p-6 shadow-xl lg:col-span-1">
          <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
            <Settings className="h-5 w-5 text-amber-600" />
            Custom Report Builder
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Report Name
              </label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g., Q1 Attrition by Manager"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Domain
              </label>
              <Select
                value={form.dataDomain}
                onValueChange={(v: any) =>
                  setForm((f) => ({ ...f, dataDomain: v }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Data Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="payroll">Payroll</SelectItem>
                  <SelectItem value="attendance">Attendance</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="attrition">
                    Separation/Attrition
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frequency
              </label>
              <Select
                value={form.frequency}
                onValueChange={(v: any) =>
                  setForm((f) => ({ ...f, frequency: v }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Daily">Daily</SelectItem>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                  <SelectItem value="Ad-hoc">Ad-hoc</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Formats
              </label>
              <div className="flex flex-wrap gap-2">
                {["XLS", "PDF", "CSV", "HRLT"].map((fmt) => {
                  const selected = form.exportOptions.includes(fmt);
                  return (
                    <Button
                      key={fmt}
                      variant={selected ? "default" : "outline"}
                      className={
                        selected ? "bg-amber-600 hover:bg-amber-700" : ""
                      }
                      size="sm"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          exportOptions: selected
                            ? f.exportOptions.filter((x) => x !== fmt)
                            : [...f.exportOptions, fmt],
                        }))
                      }
                    >
                      {fmt}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Add context for this report..."
              />
            </div>
          </div>

          <Button
            variant="default"
            className="w-full mt-6 justify-center bg-amber-600 hover:bg-amber-700"
            disabled={creating}
            onClick={async () => {
              try {
                if (
                  !form.name ||
                  !form.dataDomain ||
                  !form.frequency ||
                  form.exportOptions.length === 0
                ) {
                  throw new Error(
                    "Please fill all fields and select at least one format."
                  );
                }
                setCreating(true);
                await analyticsService.createSavedReport({
                  name: form.name,
                  dataDomain: form.dataDomain,
                  frequency: form.frequency,
                  exportOptions: form.exportOptions,
                });
                toast({
                  title: "Report saved",
                  description: "Your report configuration was created.",
                  variant: "success",
                });
                setForm({
                  name: "",
                  dataDomain: "",
                  frequency: "",
                  exportOptions: [],
                  notes: "",
                });
                await loadAll();
              } catch (err: any) {
                toast({
                  title: "Failed to save report",
                  description: err?.response?.data?.message || err?.message,
                  variant: "destructive",
                });
              } finally {
                setCreating(false);
              }
            }}
          >
            {creating ? (
              <>
                <Spinner className="mr-2" /> Saving…
              </>
            ) : (
              <>
                <Table2 className="mr-2 h-4 w-4" /> Save Report
              </>
            )}
          </Button>
        </Card>

        {/* Saved Reports */}
        <Card className="p-6 shadow-xl lg:col-span-2">
          <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Scheduled & Saved Reports
          </h2>

          {!reports ? (
            <div className="space-y-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-sm text-gray-500 border rounded-lg p-6 bg-white">
              No saved reports.
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow className="hover:bg-gray-50">
                  <TableHead className="w-[30%] text-gray-600">
                    Report Name
                  </TableHead>
                  <TableHead className="w-[15%] text-gray-600">
                    Frequency
                  </TableHead>
                  <TableHead className="w-[20%] text-gray-600">
                    Last Run
                  </TableHead>
                  <TableHead className="w-[15%] text-gray-600">
                    Formats
                  </TableHead>
                  <TableHead className="w-[20%] text-gray-600 text-center">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((r) => (
                  <TableRow
                    key={r.id}
                    className="hover:bg-blue-50/50 transition-colors"
                  >
                    <TableCell className="font-medium text-gray-700">
                      {r.name}
                      <p className="text-xs text-gray-400 mt-0.5">
                        Owner: {r.owner}
                      </p>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {r.frequency}
                    </TableCell>
                    <TableCell className="text-gray-500">{r.lastRun}</TableCell>
                    <TableCell>
                      <div className="flex gap-1.5 flex-wrap">
                        {r.exportOptions.split(", ").map((fmt) => (
                          <Badge
                            key={fmt}
                            variant="outline"
                            className="bg-gray-100 text-gray-600 text-[10px] uppercase h-5"
                          >
                            {fmt}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-600 border-blue-300 hover:bg-blue-100"
                        onClick={() => analyticsService.downloadReport(r.id)}
                      >
                        <Download className="h-4 w-4 mr-1" /> Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <Button variant="link" className="mt-6 p-0 text-blue-600 h-auto">
            Manage Scheduled Reports <Settings className="ml-1 h-3 w-3" />
          </Button>
        </Card>
      </div>

      {/* (Optional) Dedicated create modal if you prefer separate from side card) */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Create Saved Report</DialogTitle>
            <DialogDescription>
              Configure a scheduled or ad-hoc report.
            </DialogDescription>
          </DialogHeader>
          {/* You can reuse the same form fields as above here if needed */}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              Close
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- subcomponents ----------
const KpiCard: React.FC<{
  title: string;
  value: string;
  trend: string;
  type: "positive" | "negative" | "neutral";
  icon: React.ElementType;
  color: string;
  bg: string;
}> = ({ title, value, trend, type, icon: Icon, color, bg }) => (
  <Card
    className={`p-5 border-l-4 border-blue-500 hover:shadow-lg transition duration-200 ${bg}`}
  >
    <div className="flex justify-between items-start">
      <div>
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
      </div>
      <Icon className={`h-8 w-8 p-1.5 rounded-full ${color} bg-opacity-20`} />
    </div>
    <div className="mt-2">
      <TrendPill text={trend} type={type} />
    </div>
  </Card>
);
