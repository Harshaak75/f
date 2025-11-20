import { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Download,
  Eye,
  Mail,
  Search,
  FileText,
  Loader2,
  RefreshCcw,
} from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import {
  payrollService,
  PayslipDto,
} from "../../utils/api/admin.payroll&payslips.api";

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

function toMonthYearKey(month: number, year: number) {
  return `${month}-${year}`;
}
function parseMonthYearKey(key: string) {
  const [m, y] = key.split("-").map(Number);
  return { month: m, year: y };
}
function mapRunStatus(s: string): "Paid" | "Processed" | "Draft" {
  const norm = (s || "").toUpperCase();
  if (norm === "PROCESSED") return "Processed";
  if (norm === "PAID") return "Paid";
  if (norm === "DRAFT") return "Draft";
  return "Processed"; // default
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

export default function Payslips() {
  const { toast } = useToast();

  // default period → current month/year
  const now = new Date();
  const defaultKey = toMonthYearKey(now.getMonth() + 1, now.getFullYear());

  const [monthKey, setMonthKey] = useState(defaultKey);
  const [{ month, year }, setPeriod] = useState(parseMonthYearKey(defaultKey));

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // id for per-row actions
  const [bulkLoading, setBulkLoading] = useState(false);

  const [payslips, setPayslips] = useState<PayslipDto[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedPayslip, setSelectedPayslip] = useState<PayslipDto | null>(
    null
  );
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const fetchPayslips = async (m: number, y: number) => {
    try {
      setLoading(true);
      const list = await payrollService.list({ month: m, year: y });
      setPayslips(list);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || "Failed to fetch payslips.";
      toast({ title: "Load failed", description: msg, variant: "destructive" });
      setPayslips([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const p = parseMonthYearKey(monthKey);
    setPeriod(p);
    fetchPayslips(p.month, p.year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return payslips;
    return payslips.filter(
      (p) =>
        p.employeeName.toLowerCase().includes(q) ||
        p.employeeId.toLowerCase().includes(q)
    );
  }, [payslips, searchQuery]);

  const stats = useMemo(() => {
    const totals = { total: payslips.length, paid: 0, processed: 0, draft: 0 };
    for (const p of payslips) {
      const s = mapRunStatus(p.status);
      if (s === "Paid") totals.paid++;
      else if (s === "Processed") totals.processed++;
      else totals.draft++;
    }
    return totals;
  }, [payslips]);

  const handleDownload = async (p: PayslipDto) => {
    try {
      setActionLoading(p.id);
      const blob = await payrollService.download(p.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const fileMonth = String(
        Object.entries(MONTH_LABEL).find(
          ([k]) => MONTH_LABEL[Number(k)] === p.month
        )?.[1] || p.month
      );
      a.download = `Payslip-${p.year}-${fileMonth}-${p.employeeId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || "Download failed.";
      toast({
        title: "Download failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSend = async (p: PayslipDto) => {
    try {
      setActionLoading(p.id);
      await payrollService.send(p.id);
      toast({
        title: "Payslip sent",
        description: `Emailed to ${p.employeeName}.`,
      });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Email failed.";
      toast({
        title: "Email failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendAll = async () => {
    try {
      setBulkLoading(true);
      const resp = await payrollService.sendAll({ month, year });
      toast({
        title: "Bulk email",
        description: resp.message || "Triggered sending.",
      });
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || "Bulk email failed.";
      toast({
        title: "Bulk email failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const monthOptions = Array.from({ length: 12 }).map((_, i) => {
    const m = i + 1;
    return toMonthYearKey(m, year);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Payslips</h1>
          <p className="text-muted-foreground mt-1">
            View and download employee payslips
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fetchPayslips(month, year)}
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
            onClick={handleSendAll}
            disabled={bulkLoading || loading || payslips.length === 0}
          >
            {bulkLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            Send All Payslips
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-6">
          <FileText className="h-8 w-8 text-primary mb-2" />
          <h3 className="text-sm text-muted-foreground">Total Payslips</h3>
          <p className="text-3xl font-semibold mt-2">{stats.total}</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm text-muted-foreground">Paid</h3>
          <p className="text-3xl font-semibold mt-2 text-green-600">
            {stats.paid}
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm text-muted-foreground">Processed</h3>
          <p className="text-3xl font-semibold mt-2 text-blue-600">
            {stats.processed}
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm text-muted-foreground">Draft</h3>
          <p className="text-3xl font-semibold mt-2 text-orange-600">
            {stats.draft}
          </p>
        </Card>
      </div>

      {/* Table + Filters */}
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by employee name or ID..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Month selector (key = "m-y") */}
          <Select value={monthKey} onValueChange={setMonthKey}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={`${MONTH_LABEL[month]} ${year}`} />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((key) => {
                const { month: m, year: y } = parseMonthYearKey(key);
                return (
                  <SelectItem key={key} value={key}>
                    {MONTH_LABEL[m]} {y}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee ID</TableHead>
                <TableHead>Employee Name</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Gross Salary</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    <TableCell colSpan={8}>
                      <div className="h-8 w-full bg-secondary/60 rounded animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <div className="text-sm text-muted-foreground py-6 text-center">
                      No payslips found for {MONTH_LABEL[month]} {year}.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => {
                  const uiStatus = mapRunStatus(p.status);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {p.employeeId}
                      </TableCell>
                      <TableCell>{p.employeeName}</TableCell>
                      <TableCell>
                        {p.month} {p.year}
                      </TableCell>
                      <TableCell>{formatINR(p.grossSalary)}</TableCell>
                      <TableCell className="text-destructive">
                        {formatINR(p.totalDeductions)}
                      </TableCell>
                      <TableCell className="font-semibold text-green-600">
                        {formatINR(p.netSalary)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            uiStatus === "Paid"
                              ? "default"
                              : uiStatus === "Processed"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {uiStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {/* View */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPayslipsForDialog(p);
                              setIsViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {/* Download */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(p)}
                            disabled={actionLoading === p.id}
                          >
                            {actionLoading === p.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>

                          {/* Email */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSend(p)}
                            disabled={actionLoading === p.id}
                          >
                            {actionLoading === p.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Mail className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payslip Details</DialogTitle>
          </DialogHeader>
          {selectedPayslip && (
            <div className="space-y-6 mt-4">
              <div className="text-center pb-4 border-b">
                <h2 className="text-2xl font-bold">Dotspeaks HRM</h2>
                <p className="text-muted-foreground">
                  Salary Slip - {selectedPayslip.month} {selectedPayslip.year}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <KV
                  label="Employee Name"
                  value={selectedPayslip.employeeName}
                />
                <KV label="Employee ID" value={selectedPayslip.employeeId} />
              </div>

              <Section title="Earnings">
                <Row
                  label="Basic Salary"
                  value={formatINR(selectedPayslip.basicSalary)}
                />
                <Row label="HRA" value={formatINR(selectedPayslip.hra)} />
                <Row
                  label="Special Allowance"
                  value={formatINR(selectedPayslip.allowances)}
                />
                <Divider />
                <Row
                  label="Gross Salary"
                  value={formatINR(selectedPayslip.grossSalary)}
                  bold
                />
              </Section>

              <Section title="Deductions">
                <Row
                  label="PF Contribution"
                  value={formatINR(selectedPayslip.pf)}
                  negative
                />
                <Row
                  label="Income Tax"
                  value={formatINR(selectedPayslip.tax)}
                  negative
                />
                <Divider />
                <Row
                  label="Total Deductions"
                  value={formatINR(selectedPayslip.totalDeductions)}
                  bold
                  negative
                />
              </Section>

              <div className="bg-primary/10 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Net Salary</span>
                  <span className="text-2xl font-bold text-green-600">
                    {formatINR(selectedPayslip.netSalary)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => handleDownload(selectedPayslip)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleSend(selectedPayslip)}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Email Payslip
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  function setSelectedPayslipsForDialog(p: PayslipDto) {
    setSelectedPayslip(p);
  }
}

/* ---------- tiny UI helpers ---------- */
function KV({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="font-semibold mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function Row({
  label,
  value,
  bold,
  negative,
}: {
  label: string;
  value: string;
  bold?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className={bold ? "font-semibold" : ""}>{label}</span>
      <span
        className={`${bold ? "font-semibold" : ""} ${
          negative ? "text-destructive" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
function Divider() {
  return <div className="border-t my-1" />;
}
