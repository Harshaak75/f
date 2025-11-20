import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Download, Printer } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { EmployeeDirectoryList, IdCardProfile } from "../../utils/api/Admin.employeeFunctionality";

export default function EmployeeIDCard() {
  const [searchParams] = useSearchParams();
  const profileId = searchParams.get("profileId") || "";
  const { toast } = useToast();

  const [data, setData] = useState<IdCardProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const cardRef = useRef<HTMLDivElement | null>(null);

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
        const res = await EmployeeDirectoryList.getIdCard(profileId);
        if (!mounted) return;
        setData(res);
      } catch (e: any) {
        const msg = e?.response?.data?.message || e?.message || "Failed to load ID card.";
        setErr(msg);
        toast({ title: "Fetch failed", description: msg, variant: "destructive" });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [profileId, toast]);

  const fullName = useMemo(() => {
    if (!data) return "—";
    return `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim() || "—";
  }, [data]);

  const handlePrint = () => window.print();

  // Optional: implement an actual PNG/PDF download using html2canvas
  const handleDownload = async () => {
    // Simple fallback: tell users to use the Print → Save as PDF flow
    toast({
      title: "Tip",
      description: "Use Print → Save as PDF to download.",
    });
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading ID card…</div>;
  }
  if (err) {
    return <div className="p-6 text-sm text-red-600">{err}</div>;
  }
  if (!data) {
    return <div className="p-6 text-sm text-muted-foreground">No data.</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-semibold">Digital Employee ID Card</h1>
          <p className="text-muted-foreground mt-1">Official employee identification</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2" onClick={handleDownload}>
            <Download size={16} />
            Download
          </Button>
          <Button className="gap-2" onClick={handlePrint}>
            <Printer size={16} />
            Print
          </Button>
        </div>
      </div>

      {/* ID Card */}
      <Card
        ref={cardRef}
        className="card-shadow overflow-hidden print:shadow-none"
      >
        <div className="bg-gradient-to-br from-primary to-primary/80 p-8 text-primary-foreground">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Dotspeaks</h2>
              <p className="text-primary-foreground/80">Employee Identification Card</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
              D
            </div>
          </div>
        </div>

        <CardContent className="p-8">
          <div className="flex gap-8">
            {/* Photo (optional placeholder) */}
            <div className="flex-shrink-0">
              <div className="w-32 h-32 rounded-lg border-4 border-primary bg-secondary flex items-center justify-center text-sm text-muted-foreground">
                Photo
              </div>
              <div className="mt-4 bg-secondary p-2 rounded">
                <QRCodeSVG
                  value={data.employeeId || fullName || "DS-EMP"}
                  size={128}
                  level="H"
                  includeMargin
                />
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 space-y-4">
              <div>
                <div className="text-2xl font-bold">
                  {fullName}
                </div>
                <div className="text-lg text-muted-foreground">{data.designation || "—"}</div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <Detail label="Employee ID" value={data.employeeId || "—"} mono />
                {/* You don't store department/workLocation/bloodGroup; omit or hardcode as N/A */}
                <Detail label="Joining Date" value={formatDateIN(data.joiningDate)} />
                <Detail label="Contact" value={data.phone || "—"} />
                <Detail
                  label="Emergency"
                  value={
                    [data.emergencyContactName, data.emergencyContactPhone].filter(Boolean).join(" / ") || "—"
                  }
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              This card is property of Dotspeaks. If found, please return to HR Department.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Emergency Contact: +91 1800-123-4567
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase mb-1">{label}</div>
      <div className={mono ? "font-mono font-semibold text-primary break-all" : "font-medium"}>
        {value}
      </div>
    </div>
  );
}

function formatDateIN(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN");
}
