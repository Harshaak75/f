import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { User, FileText, Package, Clock, Activity } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import {
  EmployeeCombined,
  EmployeeDirectoryList,
} from "../../utils/api/Admin.employeeFunctionality";

export default function ProfileManagement() {
  const [searchParams] = useSearchParams();
  const profileId = searchParams.get("profileId") || "";

  const { toast } = useToast();
  const [selectedEmployee, setSelectedEmployee] =
    useState<EmployeeCombined | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!profileId) {
        setErr("Missing profileId in URL.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const emp = await EmployeeDirectoryList.getByProfileId(profileId);
        if (!mounted) return;
        if (!emp) {
          setErr("Profile not found.");
        } else {
          setSelectedEmployee(emp);
        }
      } catch (e: any) {
        const msg =
          e?.response?.data?.message || e?.message || "Failed to load profile.";
        setErr(msg);
        toast({
          title: "Fetch failed",
          description: msg,
          variant: "destructive",
        });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [profileId, toast]);

  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading profile…</div>
    );
  }
  if (err) {
    return <div className="p-6 text-sm text-red-600">{err}</div>;
  }
  if (!selectedEmployee) {
    return <div className="p-6 text-sm text-muted-foreground">No profile.</div>;
  }

  const fullName =
    `${selectedEmployee.firstName ?? ""} ${
      selectedEmployee.lastName ?? ""
    }`.trim() ||
    selectedEmployee.user?.name ||
    "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">
            Profile Management
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage employee profiles
          </p>
        </div>
        <Button>
          <User className="mr-2 h-4 w-4" />
          Edit Profile
        </Button>
      </div>

      <Card className="p-6">
        {/* Header */}
        <div className="flex items-start gap-6 mb-6">
          <Avatar className="h-24 w-24">
            {/* You don't currently store a photo; keep placeholder */}
            <AvatarImage src={""} />
            <AvatarFallback className="text-2xl">
              {selectedEmployee.firstName?.[0] || "E"}
              {selectedEmployee.lastName?.[0] || "M"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-2xl font-semibold">{fullName}</h2>
            <p className="text-muted-foreground">
              {selectedEmployee.designation || "—"}
            </p>
            <div className="flex gap-2 mt-3">
              <Badge variant="secondary">
                {selectedEmployee.employeeId || "—"}
              </Badge>
              {/* employmentStatus / department aren’t in your schema; omit */}
              <Badge variant="outline">
                {selectedEmployee.employeeType || "—"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="employment">Employment</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="compensation">Compensation</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Personal */}
          <TabsContent value="personal" className="space-y-4 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <Field label="First Name" value={selectedEmployee.firstName} />
              <Field label="Last Name" value={selectedEmployee.lastName} />
              <Field label="Email" value={selectedEmployee.user?.email} />
              <Field label="Phone" value={selectedEmployee.phone} />
              <Field
                label="Date of Birth"
                value={formatDateIN(selectedEmployee.dateOfBirth)}
              />
              <Field
                label="Personal Email"
                value={selectedEmployee.personalEmail || "—"}
              />
              <Field
                label="Emergency Name"
                value={selectedEmployee.emergencyContactName || "—"}
              />
              <Field
                label="Emergency Phone"
                value={selectedEmployee.emergencyContactPhone || "—"}
              />
            </div>
          </TabsContent>

          {/* Employment */}
          <TabsContent value="employment" className="space-y-4 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Designation" value={selectedEmployee.designation} />
              <Field
                label="Employee Type"
                value={selectedEmployee.employeeType}
              />
              <Field
                label="Joining Date"
                value={formatDateIN(selectedEmployee.joiningDate)}
              />
              <Field
                label="Employee ID"
                value={selectedEmployee.employeeId || "—"}
              />
            </div>
          </TabsContent>

          {/* Documents */}
          <TabsContent value="documents" className="mt-6">
            {selectedEmployee.documents?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {selectedEmployee.documents.map((doc) => (
                  <Card key={doc.id} className="p-4">
                    <FileText className="h-8 w-8 text-primary mb-2" />
                    <h4 className="font-medium">{doc.documentType}</h4>
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {doc.fileName}
                    </p>
                    {/* storagePath is a Supabase path (not public). You can add a signed URL endpoint later. */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full"
                      onClick={() =>
                        alert(
                          "Preview/Download requires a signed URL route. Add later."
                        )
                      }
                    >
                      View
                    </Button>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No documents uploaded.
              </div>
            )}
          </TabsContent>

          {/* Compensation (Offer) */}
          {/* Compensation (Offer) */}
          <TabsContent value="compensation" className="mt-6">
            {selectedEmployee.offerLetter ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <Card className="p-5">
                    <div className="text-xs text-muted-foreground">Role</div>
                    <div className="text-lg font-semibold">
                      {selectedEmployee.offerLetter.roleTitle}
                    </div>
                  </Card>
                  <Card className="p-5">
                    <div className="text-xs text-muted-foreground">
                      Annual CTC
                    </div>
                    <div className="text-lg font-semibold">
                      {money(selectedEmployee.offerLetter.annualCTC)}
                    </div>
                  </Card>
                  <Card className="p-5">
                    <div className="text-xs text-muted-foreground">
                      Net (Monthly)
                    </div>
                    <div className="text-lg font-semibold">
                      {money(selectedEmployee.offerLetter.netSalary)}
                    </div>
                  </Card>
                </div>

                <Card className="p-6">
                  <h3 className="font-semibold text-lg mb-1">
                    Monthly Breakdown
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Clear split of earnings and deductions for this employee.
                  </p>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Earnings */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Earnings</span>
                        <span className="text-xs text-muted-foreground">
                          Basic + HRA + DA + Special Allowance
                        </span>
                      </div>
                      <div className="rounded-lg border">
                        <div className="px-4 divide-y">
                          <Row
                            label="Basic"
                            value={money(selectedEmployee.offerLetter.basic)}
                          />
                          <Row
                            label="HRA"
                            value={money(selectedEmployee.offerLetter.hra)}
                          />
                          <Row
                            label="DA"
                            value={money(selectedEmployee.offerLetter.da ?? 0)}
                          />
                          <Row
                            label="Special Allowance"
                            value={money(
                              selectedEmployee.offerLetter.specialAllowance ?? 0
                            )}
                          />
                        </div>
                        <div className="px-4 py-3 border-t bg-muted/50 rounded-b-lg">
                          <Row
                            label="Gross (Monthly)"
                            value={money(
                              selectedEmployee.offerLetter.grossSalary
                            )}
                            bold
                            className="py-0"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Deductions */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Deductions</span>
                        <span className="text-xs text-muted-foreground">
                          PF + TDS
                        </span>
                      </div>
                      <div className="rounded-lg border">
                        <div className="px-4 divide-y">
                          <Row
                            label="PF Deduction"
                            value={money(
                              selectedEmployee.offerLetter.pfDeduction
                            )}
                            negative
                          />
                          <Row
                            label="Tax (TDS)"
                            value={money(selectedEmployee.offerLetter.tax)}
                            negative
                          />
                        </div>
                        <div className="px-4 py-3 border-t bg-muted/50 rounded-b-lg">
                          <Row
                            label="Net (Monthly)"
                            value={money(
                              selectedEmployee.offerLetter.netSalary
                            )}
                            bold
                            className="py-0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No offer details available.
              </div>
            )}
          </TabsContent>

          {/* Attendance (placeholder until backend exists) */}
          <TabsContent value="attendance" className="mt-6">
            <div className="grid grid-cols-3 gap-4">
              <StatCard
                icon={<Clock className="h-8 w-8 text-primary mb-2" />}
                title="Total Days"
                value="—"
              />
              <StatCard
                icon={<Activity className="h-8 w-8 text-green-600 mb-2" />}
                title="Present"
                value="—"
              />
              <StatCard
                icon={<Activity className="h-8 w-8 text-destructive mb-2" />}
                title="Absent"
                value="—"
              />
            </div>
          </TabsContent>

          {/* Assets */}
          {/* Assets */}
          <TabsContent value="assets" className="mt-6">
            {selectedEmployee.assets?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {selectedEmployee.assets.map((asset) => (
                  <Card key={asset.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{asset.assetType}</div>
                          <div className="text-xs text-muted-foreground">
                            {[asset.brand, asset.model]
                              .filter(Boolean)
                              .join(" ")}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary">Assigned</Badge>
                    </div>

                    <div className="mt-4 rounded-lg border divide-y">
                      {/* Show only the rows that exist, consistently aligned */}
                      {asset.serialNumber && (
                        <KVRow k="Serial" v={asset.serialNumber} />
                      )}
                      {asset.esiNumber && <KVRow k="ESI" v={asset.esiNumber} />}
                      {asset.pfNumber && <KVRow k="PF" v={asset.pfNumber} />}
                      {asset.insuranceNumber && (
                        <KVRow k="Insurance" v={asset.insuranceNumber} />
                      )}
                      {asset.companyEmail && (
                        <KVRow k="Company Email" v={asset.companyEmail} />
                      )}
                      {asset.idNumber && (
                        <KVRow k="ID Number" v={asset.idNumber} />
                      )}
                      {asset.simNumber && <KVRow k="SIM" v={asset.simNumber} />}
                      {!asset.serialNumber &&
                        !asset.esiNumber &&
                        !asset.pfNumber &&
                        !asset.insuranceNumber &&
                        !asset.companyEmail &&
                        !asset.idNumber &&
                        !asset.simNumber && (
                          <div className="px-4 py-3 text-sm text-muted-foreground">
                            No extra details
                          </div>
                        )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No assets assigned.
              </div>
            )}
          </TabsContent>

          {/* Activity (placeholder) */}
          <TabsContent value="activity" className="mt-6">
            <div className="text-sm text-muted-foreground">
              No activity yet.
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

/* ---------- helpers / small components ---------- */

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value || "—"} readOnly />
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  negative,
  className = "",
}: {
  label: string;
  value: string;
  bold?: boolean;
  negative?: boolean;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-12 items-center py-2 ${className}`}>
      <div className="col-span-7 text-sm text-muted-foreground">{label}</div>
      <div
        className={`col-span-5 text-right tabular-nums ${
          bold ? "font-semibold text-foreground text-base" : "text-sm"
        } ${negative ? "text-destructive" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function KVRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="px-4 py-3 grid grid-cols-12 items-center">
      <div className="col-span-6 text-xs text-muted-foreground">{k}</div>
      <div className="col-span-6 text-right text-sm font-medium truncate">{v}</div>
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <Card className="p-6">
      {icon}
      <h4 className="text-sm text-muted-foreground">{title}</h4>
      <p className="text-3xl font-semibold mt-1">{value}</p>
    </Card>
  );
}

function formatDateIN(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN");
}
function money(n: number) {
  try {
    return n.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    });
  } catch {
    return `₹${n}`;
  }
}
function serialLine(a: EmployeeCombined["assets"][number]) {
  const parts = [
    a.serialNumber ? `Serial: ${a.serialNumber}` : "",
    a.esiNumber ? `ESI: ${a.esiNumber}` : "",
    a.pfNumber ? `PF: ${a.pfNumber}` : "",
    a.insuranceNumber ? `INS: ${a.insuranceNumber}` : "",
    a.companyEmail ? `Email: ${a.companyEmail}` : "",
    a.idNumber ? `ID: ${a.idNumber}` : "",
    a.simNumber ? `SIM: ${a.simNumber}` : "",
  ].filter(Boolean);
  return parts.join(" · ") || "—";
}
