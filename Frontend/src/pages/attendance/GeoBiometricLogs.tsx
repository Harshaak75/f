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
import { MapPin, Fingerprint, Download, Search, Filter } from "lucide-react";
import { apiClient } from "../../lib/apiClient";

// -------- Types --------
type BackendLog = {
  id: string;
  employeeId: string;     // public-facing employee code from backend
  employeeName: string;
  timestamp: string;      // ISO
  type: string;           // e.g. "GEO" (your backend currently hardcodes this)
  action: string;         // "CHECK_IN" | "CHECK_OUT"
  location?: string;
  verified?: boolean;
};

type UILog = {
  id: string;
  employeeId: string;
  employeeName: string;
  timestamp: string;  // formatted "yyyy-mm-dd HH:mm:ss"
  type: "Geo" | "Biometric" | "Web";
  action: "Check In" | "Check Out";
  location?: string;
  coordinates?: { lat: number; lng: number };
  verified: boolean;
};

// -------- Helpers --------
function toUIType(t?: string): UILog["type"] {
  // Normalize a few common cases; backend currently uses "GEO"
  const up = (t || "").toUpperCase();
  if (up === "GEO" || up === "GEO_LOCATION") return "Geo";
  if (up === "BIOMETRIC") return "Biometric";
  if (up === "WEB") return "Web";
  return "Geo"; // fallback
}

function toUIAction(a?: string): UILog["action"] {
  const up = (a || "").toUpperCase();
  if (up === "CHECK_IN") return "Check In";
  if (up === "CHECK_OUT") return "Check Out";
  return "Check In";
}

function fmtTS(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso || "-";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

export default function GeoBiometricLogs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [logs, setLogs] = useState<UILog[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        // Call your backend: GET /employee/logs
        const { data } = await apiClient.get<BackendLog[]>("/employee/logs");

        if (!mounted) return;

        const normalized: UILog[] = (data || []).map((l) => ({
          id: l.id,
          employeeId: l.employeeId,
          employeeName: l.employeeName,
          timestamp: fmtTS(l.timestamp),
          type: toUIType(l.type),
          action: toUIAction(l.action),
          location: l.location || "-",
          verified: Boolean(l.verified),
          // backend doesn’t return coordinates right now; keep undefined
        }));

        setLogs(normalized);
      } catch (e: any) {
        const msg =
          e?.response?.data?.message || e?.message || "Failed to load logs.";
        setErr(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesSearch =
        !q ||
        log.employeeName.toLowerCase().includes(q) ||
        (log.employeeId || "").toLowerCase().includes(q);
      const matchesType = typeFilter === "all" || log.type === (typeFilter as UILog["type"]);
      return matchesSearch && matchesType;
    });
  }, [logs, searchQuery, typeFilter]);

  const stats = useMemo(() => {
    return {
      total: logs.length,
      geo: logs.filter((l) => l.type === "Geo").length,
      biometric: logs.filter((l) => l.type === "Biometric").length,
      web: logs.filter((l) => l.type === "Web").length,
    };
  }, [logs]);

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
          <h1 className="text-3xl font-semibold text-foreground">Geo & Biometric Logs</h1>
          <p className="text-muted-foreground mt-1">Monitor attendance verification logs</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-6">
          <h3 className="text-sm text-muted-foreground">Total Logs</h3>
          <p className="text-3xl font-semibold mt-2">{stats.total}</p>
        </Card>
        <Card className="p-6">
          <MapPin className="h-6 w-6 text-blue-600 mb-2" />
          <h3 className="text-sm text-muted-foreground">Geo Logs</h3>
          <p className="text-3xl font-semibold mt-2">{stats.geo}</p>
        </Card>
        <Card className="p-6">
          <Fingerprint className="h-6 w-6 text-green-600 mb-2" />
          <h3 className="text-sm text-muted-foreground">Biometric Logs</h3>
          <p className="text-3xl font-semibold mt-2">{stats.biometric}</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm text-muted-foreground">Web Logs</h3>
          <p className="text-3xl font-semibold mt-2">{stats.web}</p>
        </Card>
      </div>

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
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[200px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Log Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Geo">Geo Location</SelectItem>
              <SelectItem value="Biometric">Biometric</SelectItem>
              <SelectItem value="Web">Web Login</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Employee ID</TableHead>
              <TableHead>Employee Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Verified</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium">{log.timestamp}</TableCell>
                <TableCell>{log.employeeId}</TableCell>
                <TableCell>{log.employeeName}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {log.type === "Geo" && <MapPin className="h-3 w-3 mr-1" />}
                    {log.type === "Biometric" && (
                      <Fingerprint className="h-3 w-3 mr-1" />
                    )}
                    {log.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={log.action === "Check In" ? "default" : "secondary"}>
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell>
                  {log.location || "-"}
                  {log.coordinates && (
                    <p className="text-xs text-muted-foreground">
                      {log.coordinates.lat.toFixed(4)}, {log.coordinates.lng.toFixed(4)}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={log.verified ? "default" : "destructive"}>
                    {log.verified ? "Verified" : "Failed"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
