import { useEffect, useState } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Calendar } from "../../components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  CalendarIcon,
  MoveLeft,
  Send,
  RefreshCw,
  Clock,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "../../lib/utils";
import { useToast } from "../../hooks/use-toast";
import { Link } from "react-router-dom";
import { employeeService } from "../../utils/api/EmployeeApi/employee.dashbaord.api";
import { Badge } from "../../components/ui/badge";

interface LeaveBalance {
  policyId: string;
  policyName: string;
  daysAllotted: number;
  daysUsed: number;
  daysRemaining: number;
  year: number;
}

interface LeaveRequest {
  id: string;
  policy: { name: string };
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
  appliedDate: string;
}

export default function ApplyLeave() {
  const { toast } = useToast();

  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [policyId, setPolicyId] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [reason, setReason] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // days calculated inclusive
  const computedDays =
    startDate && endDate ? differenceInDays(endDate, startDate) + 1 : 0;

  // find currently selected policy object
  const selectedPolicy =
    balances.find((b) => b.policyId === policyId) ?? null;

  const fetchLeaveData = async () => {
    try {
      setFetching(true);
      const data: any = await employeeService.getLeaveDashboard();
      setBalances(data.balances || []);
      setRequests(data.requests || []);
    } catch (err: any) {
      toast({
        title: "Failed to fetch leave data",
        description:
          err?.response?.data?.message || err.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchLeaveData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!policyId || !startDate || !endDate || !reason) {
      toast({
        title: "Missing fields",
        description: "Please fill required fields",
        variant: "destructive",
      });
      return;
    }

    if (!selectedPolicy) {
      toast({
        title: "Invalid leave type",
        description: "Please select a valid leave type",
        variant: "destructive",
      });
      return;
    }

    if (computedDays > selectedPolicy.daysRemaining) {
      toast({
        title: "Insufficient balance",
        description: `You only have ${selectedPolicy.daysRemaining} day(s) remaining for ${selectedPolicy.policyName}.`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await employeeService.applyLeave(
        policyId,
        startDate.toISOString(),
        endDate.toISOString(),
        computedDays,
        reason
      );

      toast({
        title: "Leave submitted",
        description:
          response.message || "Your leave request has been submitted",
      });

      await fetchLeaveData();

      // reset form
      setPolicyId("");
      setDuration("");
      setStartDate(undefined);
      setEndDate(undefined);
      setReason("");
    } catch (err: any) {
      toast({
        title: "Failed to submit",
        description:
          err?.response?.data?.message || err.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      case "CANCELLED":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-yellow-100 text-yellow-800"; // Pending
    }
  };

  return (
    <div className="p-10 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-5">
            <Link to="/employee">
              <MoveLeft className="cursor-pointer" />
            </Link>
          </div>
          <h1 className="text-3xl font-semibold text-foreground">
            Apply Leave
          </h1>
          <p className="text-muted-foreground mt-1">
            Submit your leave request for approval
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchLeaveData}
          disabled={fetching}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${fetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Leave Balances */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {fetching ? (
          <p>Loading leave balances...</p>
        ) : balances.length === 0 ? (
          <p>No leave balances found.</p>
        ) : (
          balances.map((b) => (
            <Card key={b.policyId} className="p-6 shadow-sm">
              <h3 className="text-sm text-muted-foreground mb-2">
                {b.policyName}
              </h3>
              <div className="flex items-baseline gap-1">
                <p className="text-3xl font-semibold">{b.daysRemaining}</p>
                <p className="text-muted-foreground">/ {b.daysAllotted}</p>
              </div>
              <div className="mt-3 h-2 bg-secondary rounded-full">
                <div
                  className="h-2 bg-primary rounded-full"
                  style={{
                    width: `${(b.daysRemaining / b.daysAllotted) * 100}%`,
                  }}
                />
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Leave Form */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">Leave Application Form</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Leave Type */}
            <div>
              <Label>Leave Type *</Label>
              <Select value={policyId} onValueChange={setPolicyId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {balances.map((b) => (
                    <SelectItem key={b.policyId} value={b.policyId}>
                      {b.policyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div>
              <Label>Duration *</Label>
              <Select value={duration} onValueChange={setDuration} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Day</SelectItem>
                  <SelectItem value="first-half">First Half</SelectItem>
                  <SelectItem value="second-half">Second Half</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dates */}
            <div>
              <Label>Start Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>End Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Computed Days */}
          {computedDays > 0 && (
            <p className="text-sm text-gray-500">
              Total Leave Days: <strong>{computedDays}</strong>
              {selectedPolicy && (
                <span className="ml-2 text-gray-600">
                  ({selectedPolicy.daysRemaining} day(s) remaining)
                </span>
              )}
            </p>
          )}

          <div>
            <Label>Reason *</Label>
            <Textarea
              placeholder="Provide a reason for leave..."
              className="min-h-[120px]"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="flex gap-4">
            <Button type="submit" className="flex-1" disabled={loading}>
              <Send className="mr-2 h-4 w-4" />
              {loading ? "Submitting..." : "Submit Leave Request"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setPolicyId("");
                setDuration("");
                setStartDate(undefined);
                setEndDate(undefined);
                setReason("");
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>

      {/* -------------------------- */}
      {/* Applied Leave Requests Table */}
      {/* -------------------------- */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Applied Leaves
          </h2>
          <span className="text-sm text-gray-500">
            Total: {requests.length}
          </span>
        </div>

        {requests.length === 0 ? (
          <p className="text-sm text-gray-500">No leave requests found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-gray-700">
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Start</th>
                  <th className="px-4 py-2 text-left">End</th>
                  <th className="px-4 py-2 text-center">Days</th>
                  <th className="px-4 py-2 text-left">Reason</th>
                  <th className="px-4 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-2 font-medium text-gray-800">
                      {r.policy?.name || "—"}
                    </td>
                    <td className="px-4 py-2">
                      {format(new Date(r.startDate), "dd MMM yyyy")}
                    </td>
                    <td className="px-4 py-2">
                      {format(new Date(r.endDate), "dd MMM yyyy")}
                    </td>
                    <td className="px-4 py-2 text-center">{r.days}</td>
                    <td className="px-4 py-2 text-gray-600 truncate max-w-[200px]">
                      {r.reason}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <Badge className={getStatusColor(r.status)}>
                        {r.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
