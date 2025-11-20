import React, { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge as UiBadge } from "../../components/ui/badge";
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
  Shield,
  BookOpen,
  FileCheck,
  AlertTriangle,
  CheckCircle,
  Upload,
  Gavel,
  Users,
  Search,
  Download,
  RefreshCw,
  Clock,
} from "lucide-react";
import {
  ComplianceDashboard,
  complianceService,
  Grievance,
  Policy,
} from "../../utils/api/admin.compliance.api";

// ----- Small UI helpers -----
const Spinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={`animate-spin h-4 w-4 ${className || ""}`}
    viewBox="0 0 24 24"
  >
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

const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} />
);

// A very lightweight progress bar (Tailwind only)
const TinyProgress: React.FC<{ value: number }> = ({ value }) => {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const bar =
    pct >= 95 ? "bg-green-500" : pct >= 80 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
      <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
    </div>
  );
};

// Normalize grievance status to consistent label + color
const GrievanceBadge: React.FC<{ status: Grievance["status"] }> = ({
  status,
}) => {
  const normalized =
    typeof status === "string"
      ? status.toUpperCase().replace(" ", "_")
      : status;

  const style =
    normalized === "OPEN"
      ? "bg-red-100 text-red-800 border-red-300"
      : normalized === "UNDER_REVIEW"
      ? "bg-yellow-100 text-yellow-800 border-yellow-300"
      : "bg-green-100 text-green-800 border-green-300";

  const label =
    normalized === "OPEN"
      ? "Open"
      : normalized === "UNDER_REVIEW"
      ? "Under Review"
      : "Resolved";

  return <UiBadge className={`font-medium border ${style}`}>{label}</UiBadge>;
};

// ----- Main Component -----
export default function ComplianceHubDashboard() {
  const { toast } = useToast();

  // Data state
  const [cards, setCards] = useState<ComplianceDashboard | null>(null);
  const [policies, setPolicies] = useState<Policy[] | null>(null);
  const [grievances, setGrievances] = useState<Grievance[] | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [d, p, g] = await Promise.all([
        complianceService.getDashboard(),
        complianceService.getPolicies(),
        complianceService.getGrievances(),
      ]);
      setCards(d);
      setPolicies(p);
      setGrievances(g);
      setLastRefreshedAt(new Date());
    } catch (err: any) {
      toast({
        title: "Failed to load compliance data",
        description: err?.response?.data?.message || err?.message,
        variant: "destructive",
      });
      setCards({
        totalPolicies: 0,
        avgAcknowledgmentRate: "0%",
        openGrievances: "0",
        trainingCompletion: "0%",
      });
      setPolicies([]);
      setGrievances([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDownload = async (policy: Policy) => {
    // Hook up to your actual download route if you have one (e.g., /policies/:id/download)
    // Showing a loader inside the clicked button for better UX
    setDownloadingId(policy.id);
    try {
      // await apiClient.get(`/policies/${policy.id}/download`, { responseType: 'blob' })
      // ... trigger file save
      toast({
        title: "Download",
        description: `Prepare download for "${policy.name}" (wire your route).`,
      });
    } catch (err: any) {
      toast({
        title: "Download failed",
        description: err?.response?.data?.message || err?.message,
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  // Header right actions
  const headerActions = useMemo(
    () => (
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="text-gray-700 border-gray-300 hover:bg-gray-100 shadow-sm"
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload New Policy
        </Button>
        <Button
          variant="default"
          className="bg-indigo-600 hover:bg-indigo-700 shadow-md"
        >
          <Gavel className="mr-2 h-4 w-4" />
          File Grievance
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
            <Shield className="h-7 w-7 text-indigo-600" />
            Policy and Compliance Hub
          </h1>
          <p className="text-gray-500 mt-1">
            Manage documents, track employee acknowledgements, and monitor
            regulatory compliance.
          </p>
          {lastRefreshedAt && (
            <p className="text-xs text-gray-400 mt-1">
              Last refreshed: {lastRefreshedAt.toLocaleString()}
            </p>
          )}
        </div>
        {headerActions}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {!cards ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <Card className="p-5 border-l-4 border-indigo-500 hover:shadow-lg transition bg-indigo-50">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Total Policies
                  </h3>
                  <p className={`text-3xl font-bold mt-2 text-indigo-600`}>
                    {cards.totalPolicies}
                  </p>
                </div>
                <BookOpen className="h-8 w-8 p-1.5 rounded-full text-indigo-600 bg-indigo-100" />
              </div>
              <p className="text-xs text-gray-400 mt-1">In Repository</p>
            </Card>

            <Card className="p-5 border-l-4 border-green-500 hover:shadow-lg transition bg-green-50">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Avg Acknowledgment Rate
                  </h3>
                  <p className={`text-3xl font-bold mt-2 text-green-600`}>
                    {cards.avgAcknowledgmentRate}
                  </p>
                </div>
                <FileCheck className="h-8 w-8 p-1.5 rounded-full text-green-600 bg-green-100" />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Across Active Policies
              </p>
            </Card>

            <Card className="p-5 border-l-4 border-red-500 hover:shadow-lg transition bg-red-50">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Open Grievances
                  </h3>
                  <p className={`text-3xl font-bold mt-2 text-red-600`}>
                    {cards.openGrievances}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 p-1.5 rounded-full text-red-600 bg-red-100" />
              </div>
              <p className="text-xs text-gray-400 mt-1">Requires Action</p>
            </Card>

            <Card className="p-5 border-l-4 border-blue-500 hover:shadow-lg transition bg-blue-50">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Training Completion
                  </h3>
                  <p className={`text-3xl font-bold mt-2 text-blue-600`}>
                    {cards.trainingCompletion}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 p-1.5 rounded-full text-blue-600 bg-blue-100" />
              </div>
              <p className="text-xs text-gray-400 mt-1">POSH Module</p>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Policies table */}
        <Card className="p-6 shadow-xl lg:col-span-2">
          <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-600" />
            Policy Repository & Acknowledgement Status
          </h2>

          {!policies ? (
            <div className="space-y-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : policies.length === 0 ? (
            <div className="text-sm text-gray-500 border rounded-lg p-6 bg-white">
              No policies found.
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow className="hover:bg-gray-50">
                  <TableHead className="w-[30%] text-gray-600">
                    Policy Name
                  </TableHead>
                  <TableHead className="w-[12%] text-gray-600">
                    Version
                  </TableHead>
                  <TableHead className="w-[15%] text-gray-600">
                    Category
                  </TableHead>
                  <TableHead className="w-[18%] text-gray-600">
                    Last Updated
                  </TableHead>
                  <TableHead className="w-[20%] text-gray-600">
                    Acknowledgement Rate
                  </TableHead>
                  <TableHead className="w-[5%] text-gray-600 text-center">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((policy) => {
                  const pct = Math.round(policy.acknowledgmentRate);
                  return (
                    <TableRow
                      key={policy.id}
                      className="hover:bg-indigo-50/50 transition-colors"
                    >
                      <TableCell className="font-medium text-gray-700">
                        {policy.name}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {policy.version}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {policy.category}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {policy.lastUpdated}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TinyProgress value={pct} />
                          <span className="text-sm font-medium text-gray-700 min-w-[3ch] text-right">
                            {pct}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-indigo-600 hover:bg-indigo-100"
                          onClick={() => onDownload(policy)}
                          disabled={downloadingId === policy.id}
                        >
                          {downloadingId === policy.id ? (
                            <Spinner />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          <Button variant="link" className="mt-6 p-0 text-indigo-600 h-auto">
            View All Policies & Handbook <Search className="ml-1 h-3 w-3" />
          </Button>
        </Card>

        {/* Side: Grievance log + POSH info (grievances dynamic, POSH info placeholder) */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 shadow-xl">
            <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
              <Gavel className="h-5 w-5 text-red-500" />
              Grievance & Disciplinary Log
            </h3>

            {!grievances ? (
              <div className="space-y-2">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : grievances.length === 0 ? (
              <div className="text-sm text-gray-500">No recent cases.</div>
            ) : (
              <div className="space-y-3">
                {grievances.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center p-3 rounded-lg border border-gray-100 bg-white hover:bg-red-50/50"
                  >
                    <div>
                      <p className="font-medium text-gray-800">
                        {item.type} ({item.id})
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Filed: {item.dateFiled}
                      </p>
                    </div>
                    <GrievanceBadge status={item.status} />
                  </div>
                ))}
              </div>
            )}

            <Button
              variant="outline"
              className="w-full mt-6 justify-center text-red-600 border-red-300 hover:bg-red-100"
            >
              View Full Case Log
            </Button>
          </Card>

          <Card className="p-6 shadow-xl">
            <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-teal-500" />
              Compliance Training Module
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600 font-medium">
                  Mandatory POSH Training
                </p>
                <span className="text-sm font-bold text-teal-600">
                  {cards ? cards.trainingCompletion : "--"}
                </span>
              </div>
              {/* simple visual bar using TinyProgress */}
              <TinyProgress
                value={
                  cards
                    ? parseInt(
                        String(cards.trainingCompletion).replace("%", "")
                      ) || 0
                    : 0
                }
              />

              <div className="flex justify-between items-center pt-2">
                <p className="text-sm text-gray-600 font-medium">
                  Next Mandatory Module:
                </p>
                <span className="text-sm font-bold text-gray-800 flex items-center">
                  <Clock className="h-4 w-4 mr-1 text-gray-500" /> Data Privacy
                </span>
              </div>
            </div>

            <Button
              variant="default"
              className="w-full mt-6 justify-center bg-teal-600 hover:bg-teal-700"
            >
              Assign Training
            </Button>
          </Card>

          <Card className="p-6 shadow-xl">
            <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              Internal Complaints Committee (ICC)
            </h3>

            {/* Keep this static unless you have an endpoint */}
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                <span className="font-semibold text-gray-800">
                  Chairperson:
                </span>{" "}
                Emily Rodriguez
              </p>
              <p>
                <span className="font-semibold text-gray-800">Members:</span> 4
                total members
              </p>
              <p>
                <span className="font-semibold text-gray-800">Contact:</span>{" "}
                icc@company.com
              </p>
            </div>

            <Button variant="link" className="mt-4 p-0 text-purple-600 h-auto">
              View ICC Contact Details
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
