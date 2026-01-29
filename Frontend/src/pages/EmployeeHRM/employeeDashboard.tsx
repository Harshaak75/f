// src/pages/employee/EmployeeDashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import {
  ArrowRight,
  Check,
  Gift,
  LogIn,
  LogOut,
  MessageSquare,
  RefreshCw,
  Download,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "../../hooks/use-toast";
import {
  employeeService,
  LeaveDashboard,
  RecognitionFeedItem,
  AnnouncementListItem,
  LatestPayslip,
} from "../../utils/api/EmployeeApi/employee.dashbaord.api";
import { jwtDecode } from "jwt-decode";

// ----------------------------------------------------
// ⚡ Attendance Tracker Component (Fully Responsive)
// ----------------------------------------------------
const AttendanceTracker: React.FC<{ employeeId: string }> = ({
  employeeId,
}) => {
  const { toast } = useToast();
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [status, setStatus] = useState("Loading attendance status...");
  const [loading, setLoading] = useState<"IN" | "OUT" | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await employeeService.getTodayAttendance();
        if (data.checkedIn && !data.checkedOut) {
          setIsCheckedIn(true);
          setStatus(
            `Checked in at ${new Date(data.checkInTime!).toLocaleTimeString()}`
          );
        } else if (data.checkedOut) {
          setIsCheckedIn(false);
          setStatus(
            `Checked out at ${new Date(
              data.checkOutTime!
            ).toLocaleTimeString()}`
          );
        } else {
          setIsCheckedIn(false);
          setStatus("You are checked out.");
        }
      } catch (err) {
        setStatus("Could not load attendance status.");
      }
    };
    fetchStatus();
  }, []);

  const handleCheckIn = async () => {
    try {
      setLoading("IN");
      const now = new Date().toISOString();
      await employeeService.checkIn(employeeId, now);
      setIsCheckedIn(true);
      setStatus(`Checked in at ${new Date().toLocaleTimeString()}`);
      toast({
        title: "Check-in Successful",
        description: "Your attendance has been marked.",
      });
    } catch (e: any) {
      setStatus("Check-in failed.");
      toast({
        title: "Check-in failed",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleCheckOut = async () => {
    try {
      setLoading("OUT");
      const now = new Date().toISOString();
      await employeeService.checkOut(employeeId, now);
      setIsCheckedIn(false);
      setStatus(`Checked out at ${new Date().toLocaleTimeString()}`);
      toast({
        title: "Check-out Successful",
        description: "Have a great evening!",
      });
    } catch (e: any) {
      toast({
        title: "Check-out failed",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className="p-4 sm:p-5 bg-gray-50 shadow-sm rounded-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`h-10 w-10 rounded-full flex items-center justify-center ${isCheckedIn ? "bg-green-100" : "bg-red-100"
              }`}
          >
            {isCheckedIn ? (
              <Check className="h-5 w-5 text-green-600" />
            ) : (
              <LogOut className="h-5 w-5 text-red-600" />
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-800">Attendance Status</p>
            <p className="text-sm text-gray-500">{status}</p>
          </div>
        </div>

        {/* Responsive Check In / Out Button */}
        {isCheckedIn ? (
          <Button
            variant="destructive"
            onClick={handleCheckOut}
            className="w-full sm:w-auto"
            disabled={loading !== null}
          >
            {loading === "OUT" ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" /> Checking out...
              </span>
            ) : (
              <>
                <LogOut className="mr-2 h-4 w-4" /> Check Out
              </>
            )}
          </Button>
        ) : (
          <Button
            className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
            onClick={handleCheckIn}
            disabled={loading !== null}
          >
            {loading === "IN" ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" /> Checking in...
              </span>
            ) : (
              <>
                <LogIn className="mr-2 h-4 w-4" /> Check In
              </>
            )}
          </Button>
        )}
      </div>
    </Card>
  );
};

// ----------------------------------------------------
// ⚡ Main Employee Dashboard (Fully Responsive)
// ----------------------------------------------------
export default function EmployeeDashboard() {
  const { toast } = useToast();
  const employeeStr = localStorage.getItem("user");
  const employee = employeeStr ? JSON.parse(employeeStr) : null;
  const employeeName = employee?.name || "Employee";

  const [refreshing, setRefreshing] = useState(false);
  const [leave, setLeave] = useState<LeaveDashboard | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementListItem[]>(
    []
  );
  const [recognitions, setRecognitions] = useState<RecognitionFeedItem[]>([]);
  const [latestPayslip, setLatestPayslip] = useState<LatestPayslip | null>(
    null
  );

  const [surveys, setSurveys] = useState<any[]>([]);
  const [surveyLoading, setSurveyLoading] = useState(false);

  const loadSurveys = async () => {
    try {
      setSurveyLoading(true);
      const data = await employeeService.getMySurveys(); // GET /api/surveys/me
      setSurveys(data ?? []);
    } catch (e: any) {
      toast({
        title: "Failed to load surveys",
        description: e?.message ?? "Please try again",
        variant: "destructive",
      });
    } finally {
      setSurveyLoading(false);
    }
  };



  const balances = useMemo(() => leave?.balances ?? [], [leave]);

  const fetchAll = async () => {
    setRefreshing(true);
    try {
      const [lv, anns, recs, pay, srv] = await Promise.all([
        employeeService.getLeaveDashboard().catch(() => null),
        employeeService.getAnnouncements().catch(() => []),
        employeeService.getRecognitionFeed().catch(() => []),
        employeeService.getLatestPayslip().catch(() => null),
        employeeService.getMySurveys().catch(() => []),
      ]);

      if (lv) setLeave(lv);
      setAnnouncements(anns ?? []);
      setRecognitions(recs ?? []);
      setLatestPayslip(pay);
      setSurveys(srv ?? []);

      toast({ title: "Refreshed", description: "Dashboard data updated." });
    } catch (e: any) {
      toast({
        title: "Refresh failed",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };


  useEffect(() => {
    fetchAll();
  }, []);

  const handleDownloadPayslip = async () => {
    if (!latestPayslip) return;
    try {
      await employeeService.downloadPayslip(latestPayslip.payslipId);
    } catch (e: any) {
      toast({
        title: "Download failed",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            Welcome back, {employeeName}!
          </h1>
          <p className="text-gray-500 mt-1">Here's your summary for today.</p>
        </div>

        <Button
          variant="outline"
          onClick={fetchAll}
          disabled={refreshing}
          className="w-full sm:w-auto"
        >
          {refreshing ? (
            <span className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" /> Refreshing...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh
            </span>
          )}
        </Button>
      </div>

      {/* Responsive Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Left Section (spans 2 cols on large screen) */}
        <div className="md:col-span-2 space-y-6">
          <AttendanceTracker employeeId={employee?.id || ""} />

          {/* Recognition Wall */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-3">
              <CardTitle className="text-lg sm:text-xl">
                Recognition Wall
              </CardTitle>

              {/* MOBILE BUTTON - only visible below 640px */}
              <Button
                asChild
                size="sm"
                className="block sm:hidden w-full bg-indigo-600 text-white py-2 rounded-md"
              >
                <Link to="/engagement/rewards">
                  <MessageSquare className="inline h-4 w-4 mr-2" />
                  Give Recognition
                </Link>
              </Button>

              {/* DESKTOP BUTTON - only visible above 640px */}
              <Button asChild size="sm" className="hidden sm:flex">
                <Link to="/engagement/rewards">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Give Recognition
                </Link>
              </Button>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                {recognitions.length === 0 ? (
                  <p className="text-sm text-gray-500">No recognitions yet.</p>
                ) : (
                  recognitions.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-4 border rounded-lg bg-white shadow-sm flex gap-3"
                    >
                      <Gift className="h-5 w-5 text-amber-500 mt-1" />
                      <div className="flex-1">
                        <Badge className="bg-amber-100 text-amber-800">
                          {rec.award}
                        </Badge>
                        <p className="text-sm text-gray-600 mt-2 italic">
                          "{rec.message}"
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          — {rec.sender} → {rec.receiver}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Section */}
        <div className="space-y-6">
          {/* My Leave */}
          <Card>
            <CardHeader className="flex justify-between">
              <CardTitle>My Leave</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link to="my-leave">Apply</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {balances.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No leave balances available.
                </p>
              ) : (
                balances.map((leave) => (
                  <div key={leave.policyId}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{leave.policyName}</span>
                      <span>
                        <strong>{leave.daysRemaining}</strong> /{" "}
                        {leave.daysAllotted} days
                      </span>
                    </div>
                    <Progress
                      value={(leave.daysRemaining / leave.daysAllotted) * 100}
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Payslip */}
          <Card>
            <CardHeader>
              <CardTitle>My Latest Payslip</CardTitle>
            </CardHeader>
            <CardContent>
              {latestPayslip ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-green-50 rounded-lg gap-4">
                  <div>
                    <p className="text-sm text-gray-500">
                      {latestPayslip.month} {latestPayslip.year}
                    </p>
                    <p className="text-2xl font-bold text-green-700">
                      ₹{latestPayslip.netSalary.toLocaleString("en-IN")}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleDownloadPayslip}
                    className="w-full sm:w-auto"
                  >
                    <Download className="mr-2 h-4 w-4" /> Download
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No payslip found.</p>
              )}
            </CardContent>
          </Card>

          {/* Announcements */}
          <Card>
            <CardHeader>
              <CardTitle>Announcements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {announcements.length === 0 ? (
                  <p className="text-sm text-gray-500">No announcements yet.</p>
                ) : (
                  announcements.map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-col sm:flex-row items-start gap-3"
                    >
                      <Badge className="bg-indigo-500 text-white mt-1">
                        {a.category}
                      </Badge>

                      <div className="flex-1">
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold text-gray-800">
                            {a.title}
                          </span>{" "}
                          <span className="text-gray-400">({a.date})</span>
                        </p>

                        <p className="text-sm text-gray-600">{a.snippet}</p>

                        {!a.isRead && (
                          <Button
                            variant="link"
                            className="p-0 text-xs"
                            onClick={async () => {
                              try {
                                await employeeService.markAnnouncementRead(
                                  a.id
                                );
                                setAnnouncements((prev) =>
                                  prev.map((x) =>
                                    x.id === a.id ? { ...x, isRead: true } : x
                                  )
                                );
                              } catch (e: any) {
                                toast({
                                  title: "Failed to mark as read",
                                  description:
                                    e?.message ?? "Please try again.",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            Mark as read
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Pending Surveys</CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              {surveyLoading ? (
                <p className="text-sm text-gray-500">Loading surveys...</p>
              ) : surveys.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No surveys pending 🎉
                </p>
              ) : (
                surveys.map((survey) => (
                  <div
                    key={survey.id}
                    className="p-4 border rounded-lg flex justify-between items-center"
                  >
                    <div>
                      <p className="font-semibold text-gray-800">{survey.title}</p>
                      <p className="text-xs text-gray-500">
                        Due: {survey.dueDate ?? "N/A"}
                      </p>
                    </div>

                    <Button size="sm" asChild>
                      <Link to={`/employee/surveys/${survey.id}`}>
                        Take Survey
                      </Link>
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
