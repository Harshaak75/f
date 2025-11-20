import { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
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
import { Badge } from "../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Checkbox } from "../../components/ui/checkbox";
import {
  DollarSign,
  Play,
  Download,
  AlertCircle,
  Loader2,
  RefreshCcw,
} from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import {
  PayrollEmployeeRow,
  PayrollRunDetails,
  payrollService,
} from "../../utils/api/admin.payroll&payslips.api";

type MonthKey =
  | "1-2025"
  | "2-2025"
  | "3-2025"
  | "4-2025"
  | "5-2025"
  | "6-2025"
  | "7-2025"
  | "8-2025"
  | "9-2025"
  | "10-2025"
  | "11-2025"
  | "12-2025";

const MONTH_LABEL: Record<number, string> = {
  1: "January",
  2: "February",
  3: "March",
  4: "April",
  5: "May",
  6: "June",
  7: "July",
  8: "August",
  9: "September",
  10: "October",
  11: "November",
  12: "December",
};

function parseSelectedMonth(value: string) {
  // "11-2025" -> { month: 11, year: 2025 }
  const [m, y] = value.split("-").map(Number);
  return { month: m, year: y };
}

export default function PayrollRun() {
  const { toast } = useToast();

  // Default to current month/year
  const now = new Date();
  const defaultKey = `${now.getMonth() + 1}-${now.getFullYear()}`;

  const [monthKey, setMonthKey] = useState<string>(defaultKey);
  const [{ month, year }, setPeriod] = useState<{
    month: number;
    year: number;
  }>(parseSelectedMonth(defaultKey));

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [employees, setEmployees] = useState<PayrollEmployeeRow[]>([]);
  const [isProcessed, setIsProcessed] = useState(false);
  const [runDetails, setRunDetails] = useState<PayrollRunDetails | null>(null);

  const selectedEmployees = useMemo(
    () => employees.filter((e) => e.selected),
    [employees]
  );
  const totalGross = useMemo(
    () => selectedEmployees.reduce((sum, e) => sum + e.grossSalary, 0),
    [selectedEmployees]
  );
  const totalDeductions = useMemo(
    () => selectedEmployees.reduce((sum, e) => sum + e.deductions, 0),
    [selectedEmployees]
  );
  const totalNet = useMemo(
    () => selectedEmployees.reduce((sum, e) => sum + e.netSalary, 0),
    [selectedEmployees]
  );

  const fetchPayroll = async (m: number, y: number) => {
    try {
      setLoading(true);
      const data = await payrollService.getPayrollData({ month: m, year: y });
      setEmployees(data.employees);
      setIsProcessed(data.isProcessed);
      setRunDetails(data.runDetails);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to fetch payroll data.";
      toast({ title: "Load failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const p = parseSelectedMonth(monthKey);
    setPeriod(p);
    fetchPayroll(p.month, p.year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey]);

  const toggleEmployee = (id: string) => {
    setEmployees((prev) =>
      prev.map((e) => (e.id === id ? { ...e, selected: !e.selected } : e))
    );
  };

  const toggleAll = (checked: boolean) => {
    setEmployees((prev) => prev.map((e) => ({ ...e, selected: checked })));
  };

  const handleRunPayroll = async () => {
    try {
      setActionLoading(true);
      const employeeIds = selectedEmployees.map((e) => e.id);
      const { payrollRun } = await payrollService.runPayroll({
        month,
        year,
        employeeIds,
      });
      toast({
        title: "Payroll processed",
        description: `Processed for ${employeeIds.length} employees.`,
      });
      // Refresh to load processed state
      await fetchPayroll(month, year);
      setIsPreviewOpen(false);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || "Processing failed.";
      toast({ title: "Run failed", description: msg, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      if (!runDetails?.id) {
        toast({
          title: "Nothing to export",
          description: "No processed run found for this period.",
          variant: "destructive",
        });
        return;
      }
      const blob = await payrollService.exportRun(runDetails.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const mm = MONTH_LABEL[month];
      a.href = url;
      a.download = `Payroll-${year}-${String(month).padStart(2, "0")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Export failed.";
      toast({
        title: "Export failed",
        description: msg,
        variant: "destructive",
      });
    }
  };

  const monthOptions: string[] = Array.from({ length: 12 }).map((_, i) => {
    const m = i + 1;
    return `${m}-${year}`;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">
            Payroll Run
          </h1>
          <p className="text-muted-foreground mt-1">
            {isProcessed
              ? "Processed payroll for this month"
              : "Process monthly salary for employees"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fetchPayroll(month, year)}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={!isProcessed || !runDetails}
          >
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>

          <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            <DialogTrigger asChild>
              <Button disabled={isProcessed || selectedEmployees.length === 0}>
                <Play className="mr-2 h-4 w-4" />
                Run Payroll
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>
                  {MONTH_LABEL[month]} {year} — Confirm Payroll Run
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Summary</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <KV
                      label="Employees"
                      value={String(selectedEmployees.length)}
                      bold
                    />
                    <KV label="Total Gross" value={formatINR(totalGross)} />
                    <KV label="Total Net" value={formatINR(totalNet)} />
                  </div>
                </div>
                <div className="flex items-start gap-2 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-orange-900">
                      Please review carefully
                    </p>
                    <p className="text-sm text-orange-700">
                      Once processed, this action cannot be undone.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleRunPayroll}
                    className="flex-1"
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Confirm & Process
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsPreviewOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-6">
          <DollarSign className="h-8 w-8 text-primary mb-2" />
          <h3 className="text-sm text-muted-foreground">Total Employees</h3>
          <p className="text-3xl font-semibold mt-2">
            {selectedEmployees.length}
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm text-muted-foreground">Gross Salary</h3>
          <p className="text-3xl font-semibold mt-2">
            {formatINRShort(totalGross)}
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm text-muted-foreground">Total Deductions</h3>
          <p className="text-3xl font-semibold mt-2">
            {formatINRShort(totalDeductions)}
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm text-muted-foreground">Net Payable</h3>
          <p className="text-3xl font-semibold mt-2">
            {formatINRShort(totalNet)}
          </p>
        </Card>
      </div>

      {/* Period selector */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">
            Select Employees for Payroll
          </h2>
          <div className="flex items-center gap-4">
            <Label>Month</Label>
            <Select value={monthKey} onValueChange={(v) => setMonthKey(v)}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder={`${MONTH_LABEL[month]} ${year}`} />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }).map((_, i) => {
                  const m = i + 1;
                  const key = `${m}-${year}`;
                  return (
                    <SelectItem key={key} value={key}>
                      {MONTH_LABEL[m]} {year}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      employees.length > 0 && employees.every((e) => e.selected)
                    }
                    onCheckedChange={(c) => toggleAll(!!c)}
                    disabled={isProcessed || loading}
                  />
                </TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Basic</TableHead>
                <TableHead>HRA</TableHead>
                <TableHead>Allowances</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net Salary</TableHead>
                {isProcessed && <TableHead>Status</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    <TableCell colSpan={isProcessed ? 11 : 10}>
                      <div className="h-8 w-full bg-secondary/60 rounded animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isProcessed ? 11 : 10}>
                    <div className="text-sm text-muted-foreground py-6 text-center">
                      No employees found for this period.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <Checkbox
                        checked={employee.selected}
                        onCheckedChange={() => toggleEmployee(employee.id)}
                        disabled={isProcessed}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {employee.employeeId}
                    </TableCell>
                    <TableCell>{employee.name}</TableCell>
                    <TableCell>{employee.designation || "—"}</TableCell>
                    <TableCell>{formatINR(employee.basicSalary)}</TableCell>
                    <TableCell>{formatINR(employee.hra)}</TableCell>
                    <TableCell>{formatINR(employee.allowances)}</TableCell>
                    <TableCell className="font-semibold">
                      {formatINR(employee.grossSalary)}
                    </TableCell>
                    <TableCell className="text-destructive">
                      {formatINR(employee.deductions)}
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {formatINR(employee.netSalary)}
                    </TableCell>
                    {isProcessed && (
                      <TableCell>
                        <Badge>Included</Badge>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Processed banner */}
        {isProcessed && runDetails && (
          <div className="mt-4 rounded-lg border p-4 bg-green-50">
            <p className="text-sm">
              <span className="font-medium">Processed:</span>{" "}
              {MONTH_LABEL[runDetails.month]} {runDetails.year} —{" "}
              <span className="font-medium">{runDetails.totalEmployees}</span>{" "}
              employees, Gross {formatINR(runDetails.totalGross)}, Net{" "}
              {formatINR(runDetails.totalNet)}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ---------- helpers ---------- */
function KV({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div>
      <p className={`text-sm text-muted-foreground`}>{label}</p>
      <p className={`text-2xl ${bold ? "font-semibold" : ""}`}>{value}</p>
    </div>
  );
}
function formatINR(n: number) {
  try {
    return n.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    });
  } catch {
    return `₹${Math.round(n)}`;
  }
}
function formatINRShort(n: number) {
  // e.g., ₹1.2L for lakhs (rough, for dashboard display)
  if (n >= 100000) {
    return `₹${(n / 100000).toFixed(1)}L`;
  }
  return formatINR(n);
}
