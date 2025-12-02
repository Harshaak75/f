// src/pages/employees/ProfileManagement.tsx
import React, { useEffect, useState } from "react";
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
import {
  User,
  FileText,
  Package,
  Clock,
  Activity,
  Trash2,
  Plus,
  Edit2,
  Check,
  X,
} from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import {
  EmployeeCombined,
  EmployeeDirectoryList,
} from "../../utils/api/Admin.employeeFunctionality";

/* ---------- Skeletons ---------- */
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />;
}
function ProfileSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      <Card className="p-6 space-y-6">
        <div className="flex items-start gap-6">
          <Skeleton className="h-24 w-24 rounded-full" />

          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20 rounded-md" />
              <Skeleton className="h-6 w-24 rounded-md" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ---------- Small helpers ---------- */
function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value ?? "—"} readOnly />
    </div>
  );
}
function EditableField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        type={type}
      />
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
      <div className="col-span-6 text-right text-sm font-medium truncate">
        {v}
      </div>
    </div>
  );
}

function formatDateIN(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN");
}
function money(n?: number) {
  if (n === undefined || n === null) return "—";
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

/* ---------- Main component ---------- */
export default function ProfileManagement(): JSX.Element {
  const [searchParams] = useSearchParams();
  const profileId = searchParams.get("profileId") || "";

  const { toast } = useToast();
  const [selectedEmployee, setSelectedEmployee] =
    useState<EmployeeCombined | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [editSection, setEditSection] = useState<string | null>(null);
  const [savingSection, setSavingSection] = useState<string | null>(null);

  // forms
  const [personalForm, setPersonalForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    personalEmail: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    dateOfBirth: "",
  });

  const [employmentForm, setEmploymentForm] = useState({
    designation: "",
    employeeType: "",
    joiningDate: "",
    employeeId: "",
  });

  // Documents
  const [docUploading, setDocUploading] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docType, setDocType] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Assets
  const [assetsLocal, setAssetsLocal] = useState<any[]>([]);
  const [assetEditId, setAssetEditId] = useState<string | null>(null);
  const [assetForm, setAssetForm] = useState({
    assetType: "",
    brand: "",
    model: "",
    serialNumber: "",
    esiNumber: "",
    pfNumber: "",
    insuranceNumber: "",
    companyEmail: "",
    idNumber: "",
    simNumber: "",
  });
  const [assetSaving, setAssetSaving] = useState(false);
  const [assetAdding, setAssetAdding] = useState(false);

  // Compensation (offer)
  const [offerForm, setOfferForm] = useState<any>(null);
  const [offerSaving, setOfferSaving] = useState(false);

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
          // init forms
          setPersonalForm({
            firstName: emp.firstName ?? "",
            lastName: emp.lastName ?? "",
            phone: emp.phone ?? "",
            personalEmail: emp.personalEmail ?? "",
            emergencyContactName: emp.emergencyContactName ?? "",
            emergencyContactPhone: emp.emergencyContactPhone ?? "",
            dateOfBirth: emp.dateOfBirth ?? "",
          });
          setEmploymentForm({
            designation: emp.designation ?? "",
            employeeType: emp.employeeType ?? "",
            joiningDate: emp.joiningDate ?? "",
            employeeId: emp.employeeId ?? "",
          });
          setAssetsLocal(emp.assets ?? []);
          setOfferForm(emp.offerLetter ?? null);
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

  if (loading) return <ProfileSkeleton />;
  if (err) return <div className="p-6 text-sm text-red-600">{err}</div>;
  if (!selectedEmployee)
    return <div className="p-6 text-sm text-muted-foreground">No profile.</div>;

  const fullName =
    `${selectedEmployee.firstName ?? ""} ${
      selectedEmployee.lastName ?? ""
    }`.trim() ||
    selectedEmployee.user?.name ||
    "—";

  /* ---------- SAVE HANDLERS ---------- */

  async function handleSavePersonal() {
    if (!selectedEmployee) return;
    setSavingSection("personal");
    try {
      const payload = {
        firstName: personalForm.firstName,
        lastName: personalForm.lastName,
        phone: personalForm.phone,
        personalEmail: personalForm.personalEmail,
        emergencyContactName: personalForm.emergencyContactName,
        emergencyContactPhone: personalForm.emergencyContactPhone,
        dateOfBirth: personalForm.dateOfBirth,
      };
      if (EmployeeDirectoryList.updatePersonal) {
        const updated = await EmployeeDirectoryList.updatePersonal(
          selectedEmployee.id,
          payload
        );
        // backend returns updatedEmployee (partial) — merge
        setSelectedEmployee((s) =>
          s ? ({ ...s, ...updated } as EmployeeCombined) : s
        );
      } else {
        // optimistic
        setSelectedEmployee((s) =>
          s ? ({ ...s, ...payload } as EmployeeCombined) : s
        );
      }
      setEditSection(null);
      toast({ title: "Saved", description: "Personal details updated." });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Save failed.";
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    } finally {
      setSavingSection(null);
    }
  }

  async function handleSaveEmployment() {
    if (!selectedEmployee) return;
    setSavingSection("employment");
    try {
      const payload = {
        designation: employmentForm.designation,
        employeeType: employmentForm.employeeType,
        joiningDate: employmentForm.joiningDate,
        employeeId: employmentForm.employeeId,
      };
      if (EmployeeDirectoryList.updateEmployment) {
        const updated = await EmployeeDirectoryList.updateEmployment(
          selectedEmployee.id,
          payload
        );
        setSelectedEmployee((s) =>
          s ? ({ ...s, ...updated } as EmployeeCombined) : s
        );
      } else {
        setSelectedEmployee((s) =>
          s ? ({ ...s, ...payload } as EmployeeCombined) : s
        );
      }
      setEditSection(null);
      toast({ title: "Saved", description: "Employment details updated." });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Save failed.";
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    } finally {
      setSavingSection(null);
    }
  }

  /* ---------- Documents ---------- */

  function onDocFileChange(f?: File) {
    setDocFile(f ?? null);
  }

  async function handleUploadDocument() {
    if (!selectedEmployee?.id) return;
    if (!selectedFile || !docType) return;

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("documentType", docType);

      const uploaded = await EmployeeDirectoryList.addDocument(
        selectedEmployee.id,
        formData
      );

      setSelectedEmployee((prev) =>
        prev
          ? {
              ...prev,
              documents: [...(prev.documents ?? []), uploaded],
            }
          : prev
      );

      toast({
        title: "Document uploaded",
        description: `${docType} added successfully.`,
      });

      setSelectedFile(null);
      setDocType("");
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err?.response?.data?.message || "Something went wrong",
        variant: "destructive",
      });
    }
  }

  async function handleDeleteDocument(documentId?: string) {
    if (!documentId) return;
    if (!window.confirm("Delete this document?")) return;
    try {
      await EmployeeDirectoryList.deleteDocument(documentId);
      setSelectedEmployee((s) =>
        s
          ? ({
              ...s,
              documents: (s.documents ?? []).filter((d) => d.id !== documentId),
            } as EmployeeCombined)
          : s
      );
      toast({ title: "Deleted", description: "Document removed." });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Delete failed.";
      toast({
        title: "Delete failed",
        description: msg,
        variant: "destructive",
      });
    }
  }

  /* ---------- Assets (add / edit / delete) ---------- */

  function startEditAsset(assetId: string) {
    const a = assetsLocal?.find((x: any) => x.id === assetId);
    if (!a) return;
    setAssetForm({
      assetType: a.assetType ?? "",
      brand: a.brand ?? "",
      model: a.model ?? "",
      serialNumber: a.serialNumber ?? "",
      esiNumber: a.esiNumber ?? "",
      pfNumber: a.pfNumber ?? "",
      insuranceNumber: a.insuranceNumber ?? "",
      companyEmail: a.companyEmail ?? "",
      idNumber: a.idNumber ?? "",
      simNumber: a.simNumber ?? "",
    });
    setAssetEditId(assetId);
  }

  function resetAssetForm() {
    setAssetForm({
      assetType: "",
      brand: "",
      model: "",
      serialNumber: "",
      esiNumber: "",
      pfNumber: "",
      insuranceNumber: "",
      companyEmail: "",
      idNumber: "",
      simNumber: "",
    });
    setAssetEditId(null);
    setAssetAdding(false);
  }

  async function handleSaveAsset() {
    // edit existing asset
    if (!assetEditId) return;
    setAssetSaving(true);
    try {
      const payload = { ...assetForm };
      const updated = await EmployeeDirectoryList.updateAsset(
        assetEditId,
        payload
      );
      // merge
      setAssetsLocal((list = []) =>
        list.map((it: any) =>
          it.id === assetEditId ? { ...it, ...updated } : it
        )
      );
      // update top-level selectedEmployee assets too
      setSelectedEmployee((s: any) =>
        s
          ? ({
              ...s,
              assets: assetsLocal.map((it: any) =>
                it.id === assetEditId ? { ...it, ...updated } : it
              ),
            } as EmployeeCombined)
          : s
      );
      toast({ title: "Saved", description: "Asset updated." });
      resetAssetForm();
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || "Asset update failed.";
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    } finally {
      setAssetSaving(false);
    }
  }

  async function handleAddAsset() {
    if (!selectedEmployee) return;
    setAssetSaving(true);
    try {
      const payload = { ...assetForm };
      const created = await EmployeeDirectoryList.addAsset(
        selectedEmployee.id,
        payload
      );
      setAssetsLocal((l = []) => [...(l ?? []), created]);
      setSelectedEmployee((s) =>
        s
          ? ({
              ...s,
              assets: [...(s.assets ?? []), created],
            } as EmployeeCombined)
          : s
      );
      toast({ title: "Added", description: "Asset assigned." });
      resetAssetForm();
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || "Add asset failed.";
      toast({ title: "Add failed", description: msg, variant: "destructive" });
    } finally {
      setAssetSaving(false);
    }
  }

  async function handleDeleteAsset(assetId?: string) {
    if (!assetId) return;
    if (!window.confirm("Delete this asset assignment?")) return;
    try {
      await EmployeeDirectoryList.deleteAsset(assetId);
      setAssetsLocal((l = []) =>
        (l ?? []).filter((a: any) => a.id !== assetId)
      );
      setSelectedEmployee((s) =>
        s
          ? ({
              ...s,
              assets: (s.assets ?? []).filter((a) => a.id !== assetId),
            } as EmployeeCombined)
          : s
      );
      toast({ title: "Deleted", description: "Asset removed." });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Delete failed.";
      toast({
        title: "Delete failed",
        description: msg,
        variant: "destructive",
      });
    }
  }

  /* ---------- Compensation (Offer) ---------- */

  function enableOfferEdit() {
    if (!selectedEmployee) return;
    setOfferForm(
      selectedEmployee.offerLetter
        ? { ...selectedEmployee.offerLetter }
        : {
            roleTitle: "",
            annualCTC: 0,
            basic: 0,
            hra: 0,
            da: 0,
            specialAllowance: 0,
            grossSalary: 0,
            pfDeduction: 0,
            tax: 0,
            netSalary: 0,
          }
    );
    setEditSection("compensation");
  }

  async function handleSaveOffer() {
    if (!selectedEmployee) return;
    setOfferSaving(true);
    try {
      const userId = selectedEmployee.id;
      const payload = { ...offerForm };
      const updated = await EmployeeDirectoryList.updateOffer(userId, payload);
      // backend returns updated; merge into state
      setOfferForm(updated);
      setSelectedEmployee((s) =>
        s ? ({ ...s, offerLetter: updated } as EmployeeCombined) : s
      );
      setEditSection(null);
      toast({ title: "Saved", description: "Offer updated." });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Save failed.";
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    } finally {
      setOfferSaving(false);
    }
  }

  /* ---------- Render ---------- */
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

        <div className="flex items-center gap-2">
          {/* Full-profile edit could be added; we keep section-level editing */}
        </div>
      </div>

      <Card className="p-6">
        <div className="flex items-start gap-6 mb-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src="" />
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
              <Badge variant="outline">
                {selectedEmployee.employeeType || "—"}
              </Badge>
            </div>
          </div>
        </div>

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

          {/* ---------------- PERSONAL ---------------- */}
          <TabsContent value="personal" className="space-y-4 mt-6">
            <div className="flex justify-end mb-2">
              {editSection === "personal" ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditSection(null);
                      /* reset form from state */ setPersonalForm({
                        firstName: selectedEmployee.firstName ?? "",
                        lastName: selectedEmployee.lastName ?? "",
                        phone: selectedEmployee.phone ?? "",
                        personalEmail: selectedEmployee.personalEmail ?? "",
                        emergencyContactName:
                          selectedEmployee.emergencyContactName ?? "",
                        emergencyContactPhone:
                          selectedEmployee.emergencyContactPhone ?? "",
                        dateOfBirth: selectedEmployee.dateOfBirth ?? "",
                      });
                    }}
                    disabled={savingSection === "personal"}
                  >
                    <X className="mr-2 h-4 w-4" /> Cancel
                  </Button>
                  <Button
                    className="ml-2"
                    onClick={handleSavePersonal}
                    disabled={savingSection === "personal"}
                  >
                    {savingSection === "personal" ? (
                      "Saving…"
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" /> Save
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Button onClick={() => setEditSection("personal")}>
                  <Edit2 className="mr-2 h-4 w-4" /> Edit
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {editSection === "personal" ? (
                <>
                  <EditableField
                    label="First Name"
                    value={personalForm.firstName}
                    onChange={(v) =>
                      setPersonalForm({ ...personalForm, firstName: v })
                    }
                  />
                  <EditableField
                    label="Last Name"
                    value={personalForm.lastName}
                    onChange={(v) =>
                      setPersonalForm({ ...personalForm, lastName: v })
                    }
                  />
                  <div>
                    <Label>Email</Label>
                    <Input
                      value={selectedEmployee.user?.email ?? ""}
                      readOnly
                    />
                  </div>
                  <EditableField
                    label="Phone"
                    value={personalForm.phone}
                    onChange={(v) =>
                      setPersonalForm({ ...personalForm, phone: v })
                    }
                  />
                  <EditableField
                    label="Date of Birth"
                    value={personalForm.dateOfBirth ?? ""}
                    onChange={(v) =>
                      setPersonalForm({ ...personalForm, dateOfBirth: v })
                    }
                    type="date"
                  />
                  <EditableField
                    label="Personal Email"
                    value={personalForm.personalEmail ?? ""}
                    onChange={(v) =>
                      setPersonalForm({ ...personalForm, personalEmail: v })
                    }
                  />
                  <EditableField
                    label="Emergency Name"
                    value={personalForm.emergencyContactName ?? ""}
                    onChange={(v) =>
                      setPersonalForm({
                        ...personalForm,
                        emergencyContactName: v,
                      })
                    }
                  />
                  <EditableField
                    label="Emergency Phone"
                    value={personalForm.emergencyContactPhone ?? ""}
                    onChange={(v) =>
                      setPersonalForm({
                        ...personalForm,
                        emergencyContactPhone: v,
                      })
                    }
                  />
                </>
              ) : (
                <>
                  <Field
                    label="First Name"
                    value={selectedEmployee.firstName}
                  />
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
                </>
              )}
            </div>
          </TabsContent>

          {/* ---------------- EMPLOYMENT ---------------- */}
          <TabsContent value="employment" className="space-y-4 mt-6">
            <div className="flex justify-end mb-2">
              {editSection === "employment" ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditSection(null);
                      setEmploymentForm({
                        designation: selectedEmployee.designation ?? "",
                        employeeType: selectedEmployee.employeeType ?? "",
                        joiningDate: selectedEmployee.joiningDate ?? "",
                        employeeId: selectedEmployee.employeeId ?? "",
                      });
                    }}
                    disabled={savingSection === "employment"}
                  >
                    <X className="mr-2 h-4 w-4" /> Cancel
                  </Button>
                  <Button
                    className="ml-2"
                    onClick={handleSaveEmployment}
                    disabled={savingSection === "employment"}
                  >
                    {savingSection === "employment" ? (
                      "Saving…"
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" /> Save
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Button onClick={() => setEditSection("employment")}>
                  <Edit2 className="mr-2 h-4 w-4" /> Edit
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {editSection === "employment" ? (
                <>
                  <EditableField
                    label="Designation"
                    value={employmentForm.designation}
                    onChange={(v) =>
                      setEmploymentForm({ ...employmentForm, designation: v })
                    }
                  />
                  <EditableField
                    label="Employee Type"
                    value={employmentForm.employeeType}
                    onChange={(v) =>
                      setEmploymentForm({ ...employmentForm, employeeType: v })
                    }
                  />
                  <EditableField
                    label="Joining Date"
                    value={employmentForm.joiningDate ?? ""}
                    onChange={(v) =>
                      setEmploymentForm({ ...employmentForm, joiningDate: v })
                    }
                    type="date"
                  />
                  <div>
                    <Label>Employee ID</Label>
                    <Input value={employmentForm.employeeId || ""} readOnly />
                  </div>
                </>
              ) : (
                <>
                  <Field
                    label="Designation"
                    value={selectedEmployee.designation}
                  />
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
                </>
              )}
            </div>
          </TabsContent>
          {/* ---------------- DOCUMENTS ---------------- */}
          <TabsContent value="documents" className="mt-6">
            {/* ⛳ Hidden input OUTSIDE any conditional rendering issues */}
            <input
              type="file"
              id="doc-file-input"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                console.log("Selected file:", file); // DEBUG
                setSelectedFile(file);
              }}
            />

            <div className="flex items-center gap-3 mb-4">
              {/* Trigger button */}
              <Button asChild variant="outline">
                <label htmlFor="doc-file-input" className="cursor-pointer">
                  + Choose File
                </label>
              </Button>

              {/* Doc type */}
              <Input
                placeholder="Document type (e.g. ID Proof)"
                className="w-56"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
              />

              {/* Upload */}
              <Button
                onClick={handleUploadDocument}
                disabled={!selectedFile || !docType}
              >
                Upload
              </Button>
            </div>

            {/* Existing documents */}
            {(selectedEmployee.documents ?? []).length ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(selectedEmployee.documents ?? []).map((doc) => (
                  <Card key={doc.id} className="p-4 relative">
                    <FileText className="h-8 w-8 text-primary mb-2" />
                    <h4 className="font-medium">{doc.documentType}</h4>
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {doc.fileName}
                    </p>
                    <Button variant="outline" className="mt-3 w-full">
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

          {/* ---------------- COMPENSATION ---------------- */}
          <TabsContent value="compensation" className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Compensation</h3>
              <div>
                {editSection === "compensation" ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditSection(null);
                        setOfferForm(selectedEmployee.offerLetter ?? null);
                      }}
                      disabled={offerSaving}
                    >
                      <X className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                    <Button
                      className="ml-2"
                      onClick={handleSaveOffer}
                      disabled={offerSaving}
                    >
                      {offerSaving ? (
                        "Saving…"
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" /> Save
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <Button onClick={enableOfferEdit}>
                    <Edit2 className="mr-2 h-4 w-4" /> Edit Offer
                  </Button>
                )}
              </div>
            </div>

            {editSection === "compensation" ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div>
                  <Label>Role</Label>
                  <Input
                    value={offerForm?.roleTitle ?? ""}
                    onChange={(e) =>
                      setOfferForm({ ...offerForm, roleTitle: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Annual CTC</Label>
                  <Input
                    type="number"
                    value={offerForm?.annualCTC ?? 0}
                    onChange={(e) =>
                      setOfferForm({
                        ...offerForm,
                        annualCTC: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Net (Monthly)</Label>
                  <Input
                    type="number"
                    value={offerForm?.netSalary ?? 0}
                    onChange={(e) =>
                      setOfferForm({
                        ...offerForm,
                        netSalary: Number(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="lg:col-span-2">
                  <Card className="p-4">
                    <Label>Basic</Label>
                    <Input
                      type="number"
                      value={offerForm?.basic ?? 0}
                      onChange={(e) =>
                        setOfferForm({
                          ...offerForm,
                          basic: Number(e.target.value),
                        })
                      }
                    />
                    <Label className="mt-2">HRA</Label>
                    <Input
                      type="number"
                      value={offerForm?.hra ?? 0}
                      onChange={(e) =>
                        setOfferForm({
                          ...offerForm,
                          hra: Number(e.target.value),
                        })
                      }
                    />
                    <Label className="mt-2">DA</Label>
                    <Input
                      type="number"
                      value={offerForm?.da ?? 0}
                      onChange={(e) =>
                        setOfferForm({
                          ...offerForm,
                          da: Number(e.target.value),
                        })
                      }
                    />
                    <Label className="mt-2">Special Allowance</Label>
                    <Input
                      type="number"
                      value={offerForm?.specialAllowance ?? 0}
                      onChange={(e) =>
                        setOfferForm({
                          ...offerForm,
                          specialAllowance: Number(e.target.value),
                        })
                      }
                    />
                    <Label className="mt-2">PF Deduction</Label>
                    <Input
                      type="number"
                      value={offerForm?.pfDeduction ?? 0}
                      onChange={(e) =>
                        setOfferForm({
                          ...offerForm,
                          pfDeduction: Number(e.target.value),
                        })
                      }
                    />
                    <Label className="mt-2">Tax (TDS)</Label>
                    <Input
                      type="number"
                      value={offerForm?.tax ?? 0}
                      onChange={(e) =>
                        setOfferForm({
                          ...offerForm,
                          tax: Number(e.target.value),
                        })
                      }
                    />
                    <Label className="mt-2">Gross Salary</Label>
                    <Input
                      type="number"
                      value={offerForm?.grossSalary ?? 0}
                      onChange={(e) =>
                        setOfferForm({
                          ...offerForm,
                          grossSalary: Number(e.target.value),
                        })
                      }
                    />
                  </Card>
                </div>
              </div>
            ) : selectedEmployee.offerLetter ? (
              <div className="space-y-4">
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
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
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

                    <div>
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

          {/* ---------------- ATTENDANCE ---------------- */}
          <TabsContent value="attendance" className="mt-6">
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-6">
                <Clock className="h-6 w-6 text-primary mb-2" />
                <h4 className="text-sm text-muted-foreground">Total Days</h4>
                <p className="text-3xl font-semibold mt-1">—</p>
              </Card>
              <Card className="p-6">
                <Activity className="h-6 w-6 text-green-600 mb-2" />
                <h4 className="text-sm text-muted-foreground">Present</h4>
                <p className="text-3xl font-semibold mt-1">—</p>
              </Card>
              <Card className="p-6">
                <Activity className="h-6 w-6 text-destructive mb-2" />
                <h4 className="text-sm text-muted-foreground">Absent</h4>
                <p className="text-3xl font-semibold mt-1">—</p>
              </Card>
            </div>
          </TabsContent>

          {/* ---------------- ASSETS ---------------- */}
          <TabsContent value="assets" className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Assets</h3>
              <div className="flex items-center gap-2">
                {assetAdding ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        resetAssetForm();
                        setAssetAdding(false);
                      }}
                    >
                      <X className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                    <Button
                      onClick={handleAddAsset}
                      disabled={assetSaving}
                      className="ml-2"
                    >
                      {assetSaving ? (
                        "Adding…"
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" /> Add
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => {
                      setAssetAdding(true);
                      setAssetEditId(null);
                      resetAssetForm();
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Assign Asset
                  </Button>
                )}
              </div>
            </div>

            {/* add/edit form */}
            {(assetAdding || assetEditId) && (
              <Card className="p-4 mb-4">
                <div className="grid grid-cols-2 gap-3">
                  <EditableField
                    label="Asset Type"
                    value={assetForm.assetType}
                    onChange={(v) =>
                      setAssetForm({ ...assetForm, assetType: v })
                    }
                  />
                  <EditableField
                    label="Brand"
                    value={assetForm.brand}
                    onChange={(v) => setAssetForm({ ...assetForm, brand: v })}
                  />
                  <EditableField
                    label="Model"
                    value={assetForm.model}
                    onChange={(v) => setAssetForm({ ...assetForm, model: v })}
                  />
                  <EditableField
                    label="Serial Number"
                    value={assetForm.serialNumber}
                    onChange={(v) =>
                      setAssetForm({ ...assetForm, serialNumber: v })
                    }
                  />
                  <EditableField
                    label="ESI Number"
                    value={assetForm.esiNumber}
                    onChange={(v) =>
                      setAssetForm({ ...assetForm, esiNumber: v })
                    }
                  />
                  <EditableField
                    label="PF Number"
                    value={assetForm.pfNumber}
                    onChange={(v) =>
                      setAssetForm({ ...assetForm, pfNumber: v })
                    }
                  />
                  <EditableField
                    label="Insurance Number"
                    value={assetForm.insuranceNumber}
                    onChange={(v) =>
                      setAssetForm({ ...assetForm, insuranceNumber: v })
                    }
                  />
                  <EditableField
                    label="Company Email"
                    value={assetForm.companyEmail}
                    onChange={(v) =>
                      setAssetForm({ ...assetForm, companyEmail: v })
                    }
                  />
                  <EditableField
                    label="ID Number"
                    value={assetForm.idNumber}
                    onChange={(v) =>
                      setAssetForm({ ...assetForm, idNumber: v })
                    }
                  />
                  <EditableField
                    label="SIM Number"
                    value={assetForm.simNumber}
                    onChange={(v) =>
                      setAssetForm({ ...assetForm, simNumber: v })
                    }
                  />
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  {assetEditId ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          resetAssetForm();
                        }}
                        disabled={assetSaving}
                      >
                        <X className="mr-2 h-4 w-4" /> Cancel
                      </Button>
                      <Button onClick={handleSaveAsset} disabled={assetSaving}>
                        {assetSaving ? (
                          "Saving…"
                        ) : (
                          <>
                            <Check className="mr-2 h-4 w-4" /> Save
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          resetAssetForm();
                          setAssetAdding(false);
                        }}
                        disabled={assetSaving}
                      >
                        <X className="mr-2 h-4 w-4" /> Cancel
                      </Button>
                      <Button onClick={handleAddAsset} disabled={assetSaving}>
                        {assetSaving ? (
                          "Adding…"
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" /> Add
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            )}

            {assetsLocal?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {assetsLocal.map((asset: any) => (
                  <Card key={asset.id} className="p-4">
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

                    <div className="mt-3 rounded-lg border divide-y">
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
                    </div>

                    <div className="flex justify-end gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEditAsset(asset.id)}
                      >
                        <Edit2 className="mr-2 h-4 w-4" /> Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteAsset(asset.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </Button>
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

          {/* ---------------- ACTIVITY ---------------- */}
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
