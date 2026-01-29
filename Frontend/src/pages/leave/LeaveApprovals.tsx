import { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Check, X, Eye, Clock, Loader2 } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { LeaveRequestDTO, leaveService } from "../../utils/api/admin.leave.api";

export default function LeaveApprovals() {
  const { toast } = useToast();

  const [requests, setRequests] = useState<LeaveRequestDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  type ActionType = "approve" | "reject" | null;

  const [selectedRequest, setSelectedRequest] = useState<LeaveRequestDTO | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<ActionType>(null);
  const [adminNotes, setAdminNotes] = useState(""); // NEW

  const fetchAll = async () => {
    try {
      setLoading(true);
      setErr(null);
      const data = await leaveService.list(); // optionally pass "Pending"
      setRequests(data);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Failed to load leave requests.";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    const res: any = await leaveService.stats();
    setStats(res);
  };


  useEffect(() => {
    fetchAll();
    fetchStats();
  }, []);

  const openDialog = (req: LeaveRequestDTO) => {
    setSelectedRequest(req);
    setAdminNotes(""); // reset notes each time
    setIsViewDialogOpen(true);
  };

  const handleApprove = async (requestId: string) => {
    try {
      setActionLoading("approve");
      await leaveService.approve(requestId, adminNotes || undefined);
      await fetchStats();
      // optimistic update
      setRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: "Approved" } : r)));
      toast({ title: "Leave Approved", description: "The leave request has been approved." });
      setIsViewDialogOpen(false);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Approval failed.";
      toast({ title: "Action failed", description: msg, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!adminNotes.trim()) {
      toast({ title: "Rejection reason required", description: "Please add notes before rejecting.", variant: "destructive" });
      return;
    }
    try {
      setActionLoading("reject");
      await leaveService.reject(requestId, adminNotes.trim());
      await fetchStats();
      // optimistic update
      setRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: "Rejected" } : r)));
      toast({ title: "Leave Rejected", description: "The leave request has been rejected.", variant: "destructive" });
      setIsViewDialogOpen(false);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Rejection failed.";
      toast({ title: "Action failed", description: msg, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-secondary rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="h-4 w-24 bg-secondary rounded" />
              <div className="h-8 w-16 mt-2 bg-secondary rounded" />
            </Card>
          ))}
        </div>
        <Card className="p-6">
          <div className="h-6 w-40 bg-secondary rounded mb-4" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-secondary/60 rounded mb-2" />
          ))}
        </Card>
      </div>
    );
  }
  if (err) return <div className="text-sm text-red-600">{err}</div>;
  const isPending =
    selectedRequest?.status?.toUpperCase() === "PENDING";
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Leave Approvals</h1>
        <p className="text-muted-foreground mt-1">Review and approve leave requests</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-6">
          <Clock className="h-8 w-8 text-orange-600 mb-2" />
          <h3 className="text-sm text-muted-foreground">Pending</h3>
          <p className="text-3xl font-semibold mt-2">{stats.pending}</p>
        </Card>
        <Card className="p-6">
          <Check className="h-8 w-8 text-green-600 mb-2" />
          <h3 className="text-sm text-muted-foreground">Approved</h3>
          <p className="text-3xl font-semibold mt-2">{stats.approved}</p>
        </Card>
        <Card className="p-6">
          <X className="h-8 w-8 text-destructive mb-2" />
          <h3 className="text-sm text-muted-foreground">Rejected</h3>
          <p className="text-3xl font-semibold mt-2">{stats.rejected}</p>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Leave Requests</h2>
          <Button variant="outline" onClick={fetchAll}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Refresh
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Leave Type</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Applied On</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{request.employeeName}</p>
                    <p className="text-xs text-muted-foreground">{request.employeeId}</p>
                  </div>
                </TableCell>
                <TableCell>{request.department}</TableCell>
                <TableCell>{request.leaveType}</TableCell>
                <TableCell>{request.startDate}</TableCell>
                <TableCell>{request.endDate}</TableCell>
                <TableCell>{request.days}</TableCell>
                <TableCell>{request.appliedDate}</TableCell>
                <TableCell>
                  <Badge
                    className={
                      request.status.split(" ")[0].toLowerCase() === "approved"
                        ? "bg-green-100 hover:bg-green-200 text-green-700 border border-green-200"
                        : request.status.split(" ")[0].toLowerCase() === "rejected"
                          ? "bg-red-100 hover:bg-red-200 text-red-700 border border-red-200"
                          : "bg-yellow-100 hover:bg-yellow-200 text-yellow-700 border border-yellow-200"
                    }
                  >
                    {request.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openDialog(request)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {request.status === "Pending" && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAdminNotes("");
                            setSelectedRequest(request);
                            setIsViewDialogOpen(true);
                          }}
                          disabled={actionLoading !== null}
                          title="Approve / Reject in dialog"
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAdminNotes("");
                            setSelectedRequest(request);
                            setIsViewDialogOpen(true);
                          }}
                          disabled={actionLoading !== null}
                          title="Approve / Reject in dialog"
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog
        open={isViewDialogOpen}
        onOpenChange={(o) => {
          setIsViewDialogOpen(o);
          if (!o) setAdminNotes("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Request Details</DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 mt-2">
              <div>
                <Label>Employee</Label>
                <p className="text-sm font-medium mt-1">
                  {selectedRequest.employeeName} ({selectedRequest.employeeId})
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <KV label="Leave Type" value={selectedRequest.leaveType} />
                <KV label="Days" value={`${selectedRequest.days} days`} />
                <KV label="Start Date" value={selectedRequest.startDate} />
                <KV label="End Date" value={selectedRequest.endDate} />
              </div>

              <div>
                <Label>Reason</Label>
                <p className="text-sm mt-1">{selectedRequest.reason}</p>
              </div>

              {/* Balance info */}
              <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                <KV label="Allotted" value={String(selectedRequest.balanceInfo.daysAllotted)} />
                <KV label="Used" value={String(selectedRequest.balanceInfo.daysUsed)} />
                <KV label="Remaining" value={String(selectedRequest.balanceInfo.daysRemaining)} />
              </div>

              {/* Admin Notes (optional for approve, required for reject) */}
              <div className="pt-2">
                <Label>Admin Notes {selectedRequest.status === "Pending" ? "(required for rejection)" : ""}</Label>
                <Textarea
                  className="mt-2"
                  placeholder="Add approval justification or rejection reason…"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={4}
                />
              </div>

              {isPending && (
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => handleApprove(selectedRequest.id)}
                    disabled={actionLoading !== null}
                  >
                    {actionLoading === "approve" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 h-4 w-4" />
                    )}
                    Approve
                  </Button>

                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleReject(selectedRequest.id)}
                    disabled={actionLoading !== null}
                  >
                    {actionLoading === "reject" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <X className="mr-2 h-4 w-4" />
                    )}
                    Reject
                  </Button>
                </div>
              )}

            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* Small key-value helper */
function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="text-sm mt-1">{value || "—"}</div>
    </div>
  );
}
