import { Users, UserCheck, TrendingDown, Briefcase, DollarSign } from 'lucide-react';
import { KPICard } from '../components/dashboard/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { mockEmployees, getDepartmentCount } from '../mocks/employees';
import { getAttendanceStats } from '../mocks/attendance';

const headcountTrend = [
  { month: 'Jul', count: 142 },
  { month: 'Aug', count: 148 },
  { month: 'Sep', count: 155 },
  { month: 'Oct', count: 162 },
  { month: 'Nov', count: 168 },
  { month: 'Dec', count: 175 },
];

const COLORS = ['#0000CC', '#4040DD', '#6666EE', '#8888FF', '#AAAAFF'];

export default function Dashboard() {
  const attendanceStats = getAttendanceStats();
  const departmentData = getDepartmentCount();
  const activeEmployees = mockEmployees.filter(e => e.employmentStatus === 'Active').length;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <KPICard
          title="Total Headcount"
          value={mockEmployees.length}
          change="+8.2% from last month"
          changeType="positive"
          icon={Users}
        />
        <KPICard
          title="Active Today"
          value={attendanceStats.present}
          change={`${attendanceStats.presentPercentage}% attendance`}
          changeType="positive"
          icon={UserCheck}
        />
        <KPICard
          title="Attrition (12m)"
          value="4.2%"
          change="Industry avg: 12%"
          changeType="positive"
          icon={TrendingDown}
        />
        <KPICard
          title="Open Positions"
          value={8}
          change="3 critical"
          changeType="neutral"
          icon={Briefcase}
        />
        <KPICard
          title="Payroll Run"
          value="Jan 31"
          change="In 17 days"
          changeType="neutral"
          icon={DollarSign}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Headcount Trend */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Headcount Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={headcountTrend}>
                <XAxis dataKey="month" stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#0000CC"
                  strokeWidth={2}
                  dot={{ fill: '#0000CC', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Department Distribution */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Department Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={departmentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {departmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Snapshot & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Today's Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div>
                  <div className="text-sm text-muted-foreground">Present</div>
                  <div className="text-2xl font-semibold text-green-700">{attendanceStats.present}</div>
                </div>
                <div className="text-3xl">✅</div>
              </div>
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                <div>
                  <div className="text-sm text-muted-foreground">Absent</div>
                  <div className="text-2xl font-semibold text-red-700">{attendanceStats.absent}</div>
                </div>
                <div className="text-3xl">❌</div>
              </div>
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <div className="text-sm text-muted-foreground">On Leave</div>
                  <div className="text-2xl font-semibold text-blue-700">{attendanceStats.onLeave}</div>
                </div>
                <div className="text-3xl">🏖️</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts & To-Dos */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Alerts & To-Dos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                <div className="font-medium text-sm">Pending Offer Signatures</div>
                <div className="text-xs text-muted-foreground mt-1">2 candidates waiting</div>
                <Button variant="link" size="sm" className="h-auto p-0 mt-2 text-primary">
                  Review →
                </Button>
              </div>
              <div className="p-3 bg-red-50 border-l-4 border-red-400 rounded">
                <div className="font-medium text-sm">Pending Exit Clearances</div>
                <div className="text-xs text-muted-foreground mt-1">1 employee needs clearance</div>
                <Button variant="link" size="sm" className="h-auto p-0 mt-2 text-primary">
                  Process →
                </Button>
              </div>
              <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                <div className="font-medium text-sm">Upcoming Anniversaries</div>
                <div className="text-xs text-muted-foreground mt-1">3 employees this week</div>
                <Button variant="link" size="sm" className="h-auto p-0 mt-2 text-primary">
                  View →
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Hires */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-lg">Recent Hires</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockEmployees.slice(0, 3).map((emp) => (
              <div key={emp.id} className="flex items-center justify-between p-3 hover:bg-secondary rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <img
                    src={emp.photoUrl}
                    alt={`${emp.firstName} ${emp.lastName}`}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <div className="font-medium text-sm">{`${emp.firstName} ${emp.lastName}`}</div>
                    <div className="text-xs text-muted-foreground">{emp.designation} • {emp.department}</div>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  View Profile
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
