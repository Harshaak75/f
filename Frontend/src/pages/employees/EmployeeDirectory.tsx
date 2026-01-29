import { useEffect, useMemo, useState } from "react";
import { Search, Filter, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Link } from "react-router-dom";
import { useToast } from "../../hooks/use-toast";
import { cn } from "../../lib/utils";
import { CombinedEmployee, EmployeeDirectoryList } from "../../utils/api/Admin.employeeFunctionality";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Checkbox } from "../../components/ui/checkbox";
import { Label } from "recharts";
import { exportEmployeesToExcel } from "../../utils/exportEmployees";
import { AlertDialog } from "@radix-ui/react-alert-dialog";
import { AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../../components/ui/alert-dialog";

export default function EmployeeDirectory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [employees, setEmployees] = useState<CombinedEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await EmployeeDirectoryList.getAllEmployeeDetails();
        if (!mounted) return;

        // Backend returns:
        // - ADMIN: array of all profiles in tenant
        // - EMPLOYEE: array with their single combined profile
        setEmployees(Array.isArray(data) ? data : []);
      } catch (e: any) {
        const msg = e?.response?.data?.message || e?.message || "Failed to load employees.";
        setErr(msg);
        toast({ title: "Fetch failed", description: msg, variant: "destructive" });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [toast]);

  type EmployeeFilters = {
    employeeType?: string;
    designation?: string;
    accessRole?: string;

    hasDocuments?: boolean;
    hasAssets?: boolean;

    joiningFrom?: Date;
    joiningTo?: Date;
  };

  const [draftFilters, setDraftFilters] = useState<EmployeeFilters>({});
  const [appliedFilters, setAppliedFilters] = useState<EmployeeFilters>({});

  const designationOptions = useMemo(() => {
    const set = new Set<string>();

    employees.forEach((emp) => {
      if (emp.designation) {
        set.add(emp.designation);
      }
    });

    return Array.from(set).sort();
  }, [employees]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return employees.filter((emp: any) => {
      // 🔍 Search filter
      if (q) {
        const fullName = `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.toLowerCase();
        const email = emp.user?.email?.toLowerCase() ?? "";
        const designation = emp.designation?.toLowerCase() ?? "";
        const empId = emp.employeeId?.toLowerCase() ?? "";

        const matchesSearch =
          fullName.includes(q) ||
          email.includes(q) ||
          designation.includes(q) ||
          empId.includes(q);

        if (!matchesSearch) return false;
      }

      // 🎯 Employee Type
      if (
        appliedFilters.employeeType &&
        emp.employeeType !== appliedFilters.employeeType
      ) {
        return false;
      }

      // 🎯 Designation
      if (
        appliedFilters.designation &&
        emp.designation !== appliedFilters.designation
      ) {
        return false;
      }

      // 🎯 Access Role
      if (
        appliedFilters.accessRole &&
        emp.accessRole !== appliedFilters.accessRole
      ) {
        return false;
      }

      // 🎯 Has Documents
      if (
        appliedFilters.hasDocuments &&
        (emp.documents?.length ?? 0) === 0
      ) {
        return false;
      }

      if (appliedFilters.hasAssets && (emp.assets?.length ?? 0) === 0) {
        return false;
      }

      if (
        appliedFilters.joiningFrom &&
        new Date(emp.joiningDate) < appliedFilters.joiningFrom
      ) {
        return false;
      }

      if (
        appliedFilters.joiningTo &&
        new Date(emp.joiningDate) > appliedFilters.joiningTo
      ) {
        return false;
      }

      return true;
    });
  }, [employees, searchQuery, appliedFilters]);



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Employee Directory</h1>
          <p className="text-muted-foreground mt-1">Manage and view all employees</p>
        </div>
        <div className="flex gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter size={16} />
                Filter
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-[340px] space-y-5">
              <h4 className="font-medium">Filter Employees</h4>

              {/* Employee Type */}
              <Select
                value={draftFilters.employeeType}
                onValueChange={(v) =>
                  setDraftFilters((f) => ({ ...f, employeeType: v || undefined }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Employee Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-time">Full-time</SelectItem>
                  <SelectItem value="part-time">Part-time</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={draftFilters.designation}
                onValueChange={(v) =>
                  setDraftFilters((f) => ({ ...f, designation: v || undefined }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Designation" />
                </SelectTrigger>

                <SelectContent>
                  {designationOptions.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No designations
                    </div>
                  ) : (
                    designationOptions.map((designation) => (
                      <SelectItem key={designation} value={designation}>
                        {designation}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>


              <Select
                value={draftFilters.accessRole}
                onValueChange={(v) =>
                  setDraftFilters((f) => ({ ...f, accessRole: v || undefined }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Access Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="OPERATOR">Operator</SelectItem>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                </SelectContent>
              </Select>




              {/* Has Documents */}
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={draftFilters.hasDocuments ?? false}
                  onCheckedChange={(v) =>
                    setDraftFilters((f) => ({ ...f, hasDocuments: Boolean(v) }))
                  }
                />
                <span className="text-sm">Has documents</span>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={draftFilters.hasAssets ?? false}
                  onCheckedChange={(v) =>
                    setDraftFilters((f) => ({ ...f, hasAssets: Boolean(v) }))
                  }
                />
                <span className="text-sm">Has assets</span>
              </div>


              <div className="space-y-2">
                <Label className="text-sm">Joining Date</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    onChange={(e) =>
                      setDraftFilters((f) => ({
                        ...f,
                        joiningFrom: e.target.value
                          ? new Date(e.target.value)
                          : undefined,
                      }))
                    }
                  />
                  <Input
                    type="date"
                    onChange={(e) =>
                      setDraftFilters((f) => ({
                        ...f,
                        joiningTo: e.target.value
                          ? new Date(e.target.value)
                          : undefined,
                      }))
                    }
                  />
                </div>
              </div>



              <div className="flex justify-between pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDraftFilters({});
                    setAppliedFilters({});
                  }}
                >
                  Reset
                </Button>

                <Button
                  size="sm"
                  onClick={() => {
                    setAppliedFilters(draftFilters);
                  }}
                >
                  Apply
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download size={16} />
                Export
              </Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Export Employees</AlertDialogTitle>
                <AlertDialogDescription>
                  Export the currently filtered employees.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
                <Button
                  onClick={() => exportEmployeesToExcel(filtered)}
                >
                  Export Excel
                </Button>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {/* Use absolute route that matches your router: /admin/employees/onboarding */}
          <Link to="/admin/employees/onboarding">
            <Button className="gap-2">+ Add Employee</Button>
          </Link>
        </div>
      </div>

      <Card className="card-shadow">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={18}
              />
              <Input
                placeholder="Search employees by name, email, designation, employee ID…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Loading / error states */}
          {loading && (
            <div className="p-6 text-sm text-muted-foreground">Loading employees…</div>
          )}
          {!loading && err && (
            <div className="p-6 text-sm text-red-600">{err}</div>
          )}
          {!loading && !err && filtered.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground">No employees found.</div>
          )}

          {!loading && !err && filtered.length > 0 && (
            <div className="space-y-3">
              {filtered.map((emp) => {
                const fullName = `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim() || emp.user?.name || "—";
                const email = emp.user?.email || emp.personalEmail || "—";
                const designation = emp.designation || "—";
                const empId = emp.employeeId || "—";

                // Simple initials avatar (since no photoUrl in schema)
                const initials = fullName
                  .split(" ")
                  .filter(Boolean)
                  .map((s) => s[0]?.toUpperCase())
                  .slice(0, 2)
                  .join("");

                // You don’t have an employmentStatus in your schema; omit/replace with a badge that shows role
                const isAdmin = emp.user?.role === "ADMIN";

                return (
                  <div
                    key={emp.id}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg transition-colors cursor-pointer",
                      "hover:bg-secondary"
                    )}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                        {initials || "E"}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{fullName}</div>
                        <div className="text-sm text-muted-foreground truncate">{email}</div>
                      </div>

                      <div className="hidden md:block">
                        <div className="text-sm font-medium truncate">{designation}</div>
                        {/* no department in your schema; remove it */}
                      </div>

                      <div className="hidden lg:block">
                        <div className="text-sm">{empId}</div>
                      </div>

                      <Badge
                        variant={isAdmin ? "secondary" : "default"}
                        className={isAdmin ? "" : "bg-green-100 text-green-700 hover:bg-green-100"}
                      >
                        {isAdmin ? "Admin" : "Employee"}
                      </Badge>
                    </div>

                    <div className="flex gap-2">
                      {/* ID Card page — your route is /employees/id-card (no :id), so pass query param */}
                      <Link to={`/admin/employees/id-card?profileId=${emp.id}`}>
                        <Button variant="outline" size="sm">View ID</Button>
                      </Link>

                      {/* Profile page — your route is /employees/profiles; if it expects query, do same */}
                      <Link to={`/admin/employees/profiles?profileId=${emp.id}`}>
                        <Button variant="outline" size="sm">Profile</Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
