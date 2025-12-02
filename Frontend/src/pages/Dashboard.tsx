import { useEffect, useState } from "react";
import {
  Users,
  UserCheck,
  TrendingDown,
  Briefcase,
  DollarSign,
} from "lucide-react";
import { KPICard } from "../components/dashboard/KPICard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { dashboardService } from "../utils/api/admin.dashboard";
import { Link } from "react-router-dom";

const COLORS = ["#0000CC", "#4040DD", "#6666EE", "#8888FF", "#AAAAFF"];

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);

  /** ---------- STATES ---------- */
  const [headcount, setHeadcount] = useState({ total: 0, active: 0 });
  const [attendance, setAttendance] = useState({
    present: 0,
    absent: 0,
    onLeave: 0,
    presentPercentage: 0,
  });
  const [attrition, setAttrition] = useState(0);
  const [positions, setPositions] = useState({ count: 0, critical: 0 });
  const [payroll, setPayroll] = useState({ nextRunDate: "", daysRemaining: 0 });
  const [trend, setTrend] = useState<{ month: string; count: number }[]>([]);
  const [departments, setDepartments] = useState<
    { name: string; value: number }[]
  >([]);
  const [alerts, setAlerts] = useState({
    pendingOffers: 0,
    pendingClearances: 0,
    upcomingAnniversaries: 0,
  });
  const [recentHires, setRecentHires] = useState<any[]>([]);

  /** ---------- LOAD ALL DASHBOARD DATA ---------- */
  useEffect(() => {
    async function loadData() {
      try {
        const [hc, att, attr, pos, pay, tr, dept, al, hires] =
          await Promise.all([
            dashboardService.getHeadcount(),
            dashboardService.getAttendanceToday(),
            dashboardService.getAttrition(),
            dashboardService.getOpenPositions(),
            dashboardService.getPayrollRun(),
            dashboardService.getHeadcountTrend(),
            dashboardService.getDepartmentDistribution(),
            dashboardService.getAlerts(),
            dashboardService.getRecentHires(),
          ]);

        setHeadcount(hc);
        setAttendance(att);
        setAttrition(attr.attritionRate);
        setPositions(pos);
        setPayroll(pay);
        setTrend(tr);
        setDepartments(dept);
        setAlerts(al);
        setRecentHires(hires);
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // --------------------------------------------------------------------
  // 🔵 SKELETON COMPONENTS
  // --------------------------------------------------------------------

  const SkeletonBox = ({ height }: { height: number }) => (
    <div
      className={`w-full bg-gray-200 animate-pulse rounded-md`}
      style={{ height }}
    ></div>
  );

  const SkeletonCard = () => (
    <Card className="p-4">
      <SkeletonBox height={20} />
      <div className="mt-3 flex gap-2">
        <SkeletonBox height={14} />
      </div>
      <div className="mt-5">
        <SkeletonBox height={30} />
      </div>
    </Card>
  );

  const SkeletonCircle = () => (
    <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
  );

  // --------------------------------------------------------------------
  // 🔵 IF LOADING → SHOW SKELETON SCREEN
  // --------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* KPI Skeleton Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        {/* Chart Skeleton Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonBox height={300} />
          <SkeletonBox height={300} />
        </div>

        {/* Attendance + Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonBox height={250} />
          <SkeletonBox height={250} />
        </div>

        {/* Recent Hires */}
        <SkeletonBox height={200} />
      </div>
    );
  }

  // --------------------------------------------------------------------
  // 🔵 MAIN DASHBOARD (DATA LOADED)
  // --------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* ---------- KPI ROW ---------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <KPICard
          title="Total Headcount"
          value={headcount.total}
          change="+8.2% from last month"
          changeType="positive"
          icon={Users}
        />
        <KPICard
          title="Active Today"
          value={attendance.present}
          change={`${attendance.presentPercentage}% attendance`}
          changeType="positive"
          icon={UserCheck}
        />
        <KPICard
          title="Attrition (12m)"
          value={`${attrition}%`}
          change="Industry avg: 12%"
          changeType="positive"
          icon={TrendingDown}
        />
        <KPICard
          title="Open Positions"
          value={positions.count}
          change={`${positions.critical} critical`}
          changeType="neutral"
          icon={Briefcase}
        />
        <KPICard
          title="Payroll Run"
          value={payroll.nextRunDate || "N/A"}
          change={`In ${payroll.daysRemaining} days`}
          changeType="neutral"
          icon={DollarSign}
        />
      </div>

      {/* ---------- CHARTS ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* HEADCOUNT TREND */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Headcount Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trend}>
                <XAxis dataKey="month" stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#0000CC"
                  strokeWidth={2}
                  dot={{ fill: "#0000CC", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* DEPARTMENT DISTRIBUTION */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Department Distribution</CardTitle>
          </CardHeader>

          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                {/* Custom Tooltip */}
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value} Employees`,
                    name,
                  ]}
                  contentStyle={{
                    background: "#fff",
                    borderRadius: "10px",
                    padding: "10px",
                    border: "1px solid #e5e5e5",
                  }}
                />

                {/* Legend */}
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  formatter={(value) => (
                    <span className="text-sm">{value}</span>
                  )}
                />

                <Pie
                  data={departments}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  animationDuration={900}
                  cornerRadius={6}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={true}
                >
                  {departments.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ---------- ATTENDANCE + ALERTS ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ATTENDANCE */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Today's Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between p-4 bg-green-50 rounded-lg">
                <div>
                  <div className="text-sm text-muted-foreground">Present</div>
                  <div className="text-2xl font-semibold text-green-700">
                    {attendance.present}
                  </div>
                </div>
                <div className="text-3xl">✅</div>
              </div>

              <div className="flex justify-between p-4 bg-red-50 rounded-lg">
                <div>
                  <div className="text-sm text-muted-foreground">Absent</div>
                  <div className="text-2xl font-semibold text-red-700">
                    {attendance.absent}
                  </div>
                </div>
                <div className="text-3xl">❌</div>
              </div>

              <div className="flex justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <div className="text-sm text-muted-foreground">On Leave</div>
                  <div className="text-2xl font-semibold text-blue-700">
                    {attendance.onLeave}
                  </div>
                </div>
                <div className="text-3xl">🏖️</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ALERTS */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Alerts & To-Dos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                <div className="font-medium text-sm">
                  Pending Offer Signatures
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {alerts.pendingOffers} candidates waiting
                </div>
                {/* <Button variant="link" size="sm" className="h-auto p-0 mt-2 text-primary">Review →</Button> */}
              </div>

              <div className="p-3 bg-red-50 border-l-4 border-red-400 rounded">
                <div className="font-medium text-sm">
                  Pending Exit Clearances
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {alerts.pendingClearances} employees need clearance
                </div>
                {/* <Button variant="link" size="sm" className="h-auto p-0 mt-2 text-primary">Process →</Button> */}
              </div>

              <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                <div className="font-medium text-sm">
                  Upcoming Anniversaries
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {alerts.upcomingAnniversaries} employees this week
                </div>
                {/* <Button variant="link" size="sm" className="h-auto p-0 mt-2 text-primary">View →</Button> */}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ---------- RECENT HIRES ---------- */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-lg">Recent Hires</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentHires.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center justify-between p-3 hover:bg-secondary rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-medium text-sm">
                      {emp.firstName} {emp.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {emp.designation}
                    </div>
                  </div>
                </div>

                <Link to={`/admin/employees/profiles?profileId=${emp.id}`}>
                  <Button variant="outline" size="sm">
                    View Profile
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
