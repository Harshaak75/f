import { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Calendar } from "../../components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
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
import { CalendarIcon, Download, Filter, Search } from "lucide-react";
import { format } from "date-fns";
import { cn } from "../../lib/utils";
import {
  AttendanceLog,
  attendanceService,
} from "../../utils/api/attandance.admin.api";
import {
  EmployeeCombined,
  EmployeeDirectoryList,
} from "../../utils/api/Admin.employeeFunctionality";

type DailyRow = {
  profileId?: string; // from employees list (if available)
  userId?: string; // from employees list (if available)
  employeeId: string; // public employeeId
  name: string;
  employeeType?: string | null;
  designation?: string | null;
  checkIn?: string; // HH:mm
  checkOut?: string; // HH:mm
  workHours?: number; // hours (1 decimal)
  status: "Present" | "Half Day" | "Absent" | "On Leave";
};

export default function AttendanceRegister() {
  const [date, setDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [employees, setEmployees] = useState<EmployeeCombined[]>([]);

  // Initial fetch: logs + employees
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const [l, emps] = await Promise.all([
          attendanceService.getLogs(),
          EmployeeDirectoryList.getAllEmployeeDetails(),
        ]);

        if (!mounted) return;
        setLogs(l || []);
        setEmployees(emps || []);
      } catch (e: any) {
        const msg =
          e?.response?.data?.message ||
          e?.message ||
          "Failed to load attendance data.";
        setErr(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Build a map from employeeId (public code) to employee info for enrichment
  const empByPublicId = useMemo(() => {
    const m = new Map<string, EmployeeCombined>();
    for (const e of employees) {
      if (e.employeeId) m.set(e.employeeId, e);
    }
    return m;
  }, [employees]);

  // Compute per-employee summary for the selected day
  const dailyRows: DailyRow[] = useMemo(() => {
    if (!logs?.length) return [];

    const dayStr = format(date, "yyyy-MM-dd"); // compare by day
    // Group events by employeeId for the chosen day
    const grouped = new Map<string, AttendanceLog[]>();

    for (const log of logs) {
      // Only keep same day events
      const ts = new Date(log.timestamp);
      const tsStr = format(ts, "yyyy-MM-dd");
      if (tsStr !== dayStr) continue;

      const key = log.employeeId || "UNKNOWN";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(log);
    }

    // Make a set of ALL employees we know (from employees list)
    // If you want to also include employees with zero logs (show as Absent), do it from employees array
    const publicEmployeeIds = new Set<string>();
    employees.forEach((e) => {
      if (e.employeeId) publicEmployeeIds.add(e.employeeId);
    });
    // Also include those who appear only in logs (e.g., if employees endpoint is partial)
    for (const k of grouped.keys()) publicEmployeeIds.add(k);

    const rows: DailyRow[] = [];

    for (const empCode of publicEmployeeIds) {
      const evs = grouped.get(empCode) || [];
      // Find earliest CHECK_IN and latest CHECK_OUT
      const checkIns = evs
        .filter((e) => e.action === "CHECK_IN")
        .map((e) => new Date(e.timestamp));
      const checkOuts = evs
        .filter((e) => e.action === "CHECK_OUT")
        .map((e) => new Date(e.timestamp));

      let checkInStr: string | undefined;
      let checkOutStr: string | undefined;
      let workHours: number | undefined;
      let status: DailyRow["status"] = "Absent";

      if (checkIns.length) {
        const earliestIn = new Date(
          Math.min(...checkIns.map((d) => d.getTime()))
        );
        checkInStr = format(earliestIn, "HH:mm");
      }
      if (checkOuts.length) {
        const latestOut = new Date(
          Math.max(...checkOuts.map((d) => d.getTime()))
        );
        checkOutStr = format(latestOut, "HH:mm");
      }
      if (checkInStr && checkOutStr) {
        // compute hours
        const inT = new Date(`${dayStr}T${checkInStr}:00`);
        const outT = new Date(`${dayStr}T${checkOutStr}:00`);
        const diff = Math.max(
          0,
          (outT.getTime() - inT.getTime()) / (1000 * 60 * 60)
        );
        workHours = Math.round(diff * 10) / 10;
        status = "Present";
      } else if (checkInStr && !checkOutStr) {
        status = "Half Day";
      } else {
        status = "Absent";
      }

      const meta = empByPublicId.get(empCode);
      const fullName =
        `${meta?.firstName ?? ""} ${meta?.lastName ?? ""}`.trim() ||
        meta?.user?.name ||
        evs[0]?.employeeName ||
        "—";

      rows.push({
        profileId: meta?.id,
        userId: meta?.userId,
        employeeId: empCode,
        name: fullName,
        employeeType: meta?.employeeType ?? null,
        designation: meta?.designation ?? null,
        checkIn: checkInStr,
        checkOut: checkOutStr,
        workHours,
        status,
      });
    }

    // Sort by name
    rows.sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  }, [logs, employees, empByPublicId, date]);

  // Unique employee types for filter
  const employeeTypes = useMemo(() => {
    const s = new Set<string>();
    employees.forEach((e) => e.employeeType && s.add(e.employeeType));
    return Array.from(s).sort();
  }, [employees]);

  // Client-side filters
  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return dailyRows.filter((r) => {
      const matchesQ =
        !q ||
        r.name.toLowerCase().includes(q) ||
        (r.employeeId ?? "").toLowerCase().includes(q);
      const matchesType =
        typeFilter === "all" || (r.employeeType ?? "") === typeFilter;
      return matchesQ && matchesType;
    });
  }, [dailyRows, searchQuery, typeFilter]);

  // Stats
  const stats = useMemo(() => {
    const present = dailyRows.filter((r) => r.status === "Present").length;
    const absent = dailyRows.filter((r) => r.status === "Absent").length;
    const halfDay = dailyRows.filter((r) => r.status === "Half Day").length;
    const onLeave = dailyRows.filter((r) => r.status === "On Leave").length; // currently 0
    return { present, absent, halfDay, onLeave };
  }, [dailyRows]);

  const getStatusBadge = (status: DailyRow["status"]) => {
    const variants: Record<
      DailyRow["status"],
      "default" | "secondary" | "destructive" | "outline"
    > = {
      Present: "default",
      "Half Day": "secondary",
      Absent: "destructive",
      "On Leave": "outline",
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-secondary rounded" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="h-4 w-24 bg-secondary rounded" />
              <div className="h-8 w-16 mt-2 bg-secondary rounded" />
            </Card>
          ))}
        </div>
        <Card className="p-6">
          <div className="h-10 bg-secondary rounded mb-4" />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 bg-secondary/60 rounded mb-2" />
          ))}
        </Card>
      </div>
    );
  }

  if (err) {
    return <div className="text-sm text-red-600">{err}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">
            Attendance Register
          </h1>
          <p className="text-muted-foreground mt-1">
            Track daily attendance records
          </p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-6">
          <h3 className="text-sm text-muted-foreground">Present</h3>
          <p className="text-3xl font-semibold mt-2 text-green-600">
            {stats.present}
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm text-muted-foreground">Absent</h3>
          <p className="text-3xl font-semibold mt-2 text-destructive">
            {stats.absent}
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm text-muted-foreground">Half Day</h3>
          <p className="text-3xl font-semibold mt-2 text-orange-600">
            {stats.halfDay}
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm text-muted-foreground">On Leave</h3>
          <p className="text-3xl font-semibold mt-2 text-blue-600">
            {stats.onLeave}
          </p>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or employee code…"
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[220px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Employee type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {employeeTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(date, "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
              />
            </PopoverContent>
          </Popover>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Check In</TableHead>
              <TableHead>Check Out</TableHead>
              <TableHead>Work Hours</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.map((row) => (
              <TableRow key={row.employeeId}>
                <TableCell className="font-medium">
                  {row.employeeId || "—"}
                </TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.employeeType || "—"}</TableCell>
                <TableCell>{row.checkIn || "-"}</TableCell>
                <TableCell>{row.checkOut || "-"}</TableCell>
                <TableCell>
                  {row.workHours ? `${row.workHours}h` : "-"}
                </TableCell>
                <TableCell>{getStatusBadge(row.status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
