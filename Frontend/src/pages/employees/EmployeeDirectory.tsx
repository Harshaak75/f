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

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((emp) => {
      const fullName = `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.toLowerCase();
      const email = emp.user?.email?.toLowerCase() ?? "";
      const designation = emp.designation?.toLowerCase() ?? "";
      const empId = emp.employeeId?.toLowerCase() ?? "";
      return (
        fullName.includes(q) ||
        email.includes(q) ||
        designation.includes(q) ||
        empId.includes(q)
      );
    });
  }, [employees, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Employee Directory</h1>
          <p className="text-muted-foreground mt-1">Manage and view all employees</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Filter size={16} />
            Filter
          </Button>
          <Button variant="outline" className="gap-2">
            <Download size={16} />
            Export
          </Button>
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
