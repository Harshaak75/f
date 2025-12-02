// import { Toaster } from "./components/ui/toaster";
// import { Toaster as Sonner } from "./components/ui/sonner";
// import { TooltipProvider } from "./components/ui/tooltip";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { BrowserRouter, Routes, Route } from "react-router-dom";
// import { MainLayout } from "./components/layout/MainLayout";
// import Dashboard from "./pages/Dashboard";
// import EmployeeDirectory from "./pages/employees/EmployeeDirectory";
// import EmployeeOnboarding from "./pages/employees/EmployeeOnboarding";
// import EmployeeIDCard from "./pages/employees/EmployeeIDCard";
// import ComingSoon from "./pages/ComingSoon";
// import NotFound from "./pages/NotFound";
// import ProfileManagement from "./pages/employees/ProfileManagement";
// import AttendanceRegister from "./pages/attendance/AttendanceRegister";
// import ShiftRules from "./pages/attendance/ShiftRules";
// import GeoBiometricLogs from "./pages/attendance/GeoBiometricLogs";
// import ApplyLeave from "./pages/leave/ApplyLeave";
// import LeaveApprovals from "./pages/leave/LeaveApprovals";
// import LeavePolicies from "./pages/leave/LeavePolicies";
// import PayrollRun from "./pages/payroll/PayrollRun";
// import Payslips from "./pages/payroll/Payslips";
// import StatutoryReports from "./pages/payroll/StatutoryReports";
// import OKRsDashboard from "./pages/performance/goals";
// import ReviewDashboard from "./pages/performance/feedback";
// import AppraisalDashboard from "./pages/performance/appraial";
// import PromotionAndIncrementDashboard from "./pages/performance/promotion";
// import AnnouncementFeedDashboard from "./pages/engagement/InternalAnnouncemntFeed";
// import SurveysDashboard from "./pages/engagement/polls";
// import BirthdayAnniversaryDashboard from "./pages/engagement/greets";
// import RewardsAndRecognitionDashboard from "./pages/engagement/rewards";
// import ComplianceHubDashboard from "./pages/Compliance/Policy&Compliance";
// import ExitWorkflowDashboard from "./pages/ExitWorkflow/Seperation&ExitWrokflow";
// import AnalyticsDashboard from "./pages/Reports&Analysis/reportAnalytics";
// import SettingsDashboard from "./pages/Settings/settingsDashboard";
// import LoginPage from "./pages/login";
// import ReviewCycleManagement from "./pages/performance/reviewCycle";
// import EmployeeDashboard from "./pages/EmployeeHRM/employeeDashboard";

// const queryClient = new QueryClient();

// const App = () => (
//   <QueryClientProvider client={queryClient}>
//     <TooltipProvider>
//       <Toaster />
//       <Sonner />
//       <BrowserRouter>
//         <Routes>
//           <Route path="/login" element={<LoginPage />}/>
//           <Route path="/myDashboard" element={<EmployeeDashboard />}/>
//           <Route path="/" element={<MainLayout />}>
//             <Route index element={<Dashboard />} />
//             <Route path="employees">
//               <Route path="directory" element={<EmployeeDirectory />} />
//               <Route path="onboarding" element={<EmployeeOnboarding />} />
//               <Route path="profiles" element={<ProfileManagement />} />
//               <Route path="id-card" element={<EmployeeIDCard />} />
//             </Route>
//             <Route path="attendance">
//               <Route path="register" element={<AttendanceRegister />} />
//               <Route path="shifts" element={<ShiftRules />} />
//               <Route path="logs" element={<GeoBiometricLogs />} />
//             </Route>
//             <Route path="leave">
//               <Route path="apply" element={<ApplyLeave />} />
//               <Route path="approvals" element={<LeaveApprovals />} />
//               <Route path="policies" element={<LeavePolicies />} />
//             </Route>
//             <Route path="payroll">
//               <Route path="run" element={<PayrollRun />} />
//               <Route path="payslips" element={<Payslips />} />
//               <Route path="reports" element={<StatutoryReports />} />
//             </Route>
//             <Route path="performance">
//               <Route path="goals" element={<OKRsDashboard />} />
//               <Route path="feedback" element={<ReviewCycleManagement />} />
//               <Route path="reviewCycle/:id" element={<ReviewDashboard />} />
//               <Route path="appraisals" element={<AppraisalDashboard />} />
//               <Route path="promotion" element={<PromotionAndIncrementDashboard />} />
//             </Route>
//             <Route path="engagement">
//               <Route path="newsfeed" element={<AnnouncementFeedDashboard />} />
//               <Route path="polls" element={<SurveysDashboard />} />
//               <Route path="rewards" element={<RewardsAndRecognitionDashboard />} />
//               <Route path="greets" element={<BirthdayAnniversaryDashboard />} />
//             </Route>
//             <Route path="compliance" element={<ComplianceHubDashboard />} />
//             <Route path="separation" element={<ExitWorkflowDashboard />} />
//             <Route path="reports" element={<AnalyticsDashboard />} />
//             <Route path="settings" element={<SettingsDashboard />} />
//           </Route>
//           {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
//           <Route path="*" element={<NotFound />} />
//         </Routes>
//       </BrowserRouter>
//     </TooltipProvider>
//   </QueryClientProvider>
// );

// export default App;

import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { MainLayout } from "./components/layout/MainLayout";
// ADMIN (HR) pages
import Dashboard from "./pages/Dashboard";
import EmployeeDirectory from "./pages/employees/EmployeeDirectory";
import EmployeeOnboarding from "./pages/employees/EmployeeOnboarding";
import EmployeeIDCard from "./pages/employees/EmployeeIDCard";
import ProfileManagement from "./pages/employees/ProfileManagement";
import AttendanceRegister from "./pages/attendance/AttendanceRegister";
import ShiftRules from "./pages/attendance/ShiftRules";
import GeoBiometricLogs from "./pages/attendance/GeoBiometricLogs";
import ApplyLeave from "./pages/leave/ApplyLeave";
import LeaveApprovals from "./pages/leave/LeaveApprovals";
import LeavePolicies from "./pages/leave/LeavePolicies";
import PayrollRun from "./pages/payroll/PayrollRun";
import Payslips from "./pages/payroll/Payslips";
import StatutoryReports from "./pages/payroll/StatutoryReports";
import OKRsDashboard from "./pages/performance/goals";
import ReviewDashboard from "./pages/performance/feedback";
import AppraisalDashboard from "./pages/performance/appraial";
import PromotionAndIncrementDashboard from "./pages/performance/promotion";
import AnnouncementFeedDashboard from "./pages/engagement/InternalAnnouncemntFeed";
import SurveysDashboard from "./pages/engagement/polls";
import BirthdayAnniversaryDashboard from "./pages/engagement/greets";
import RewardsAndRecognitionDashboard from "./pages/engagement/rewards";
import ComplianceHubDashboard from "./pages/Compliance/Policy&Compliance";
import ExitWorkflowDashboard from "./pages/ExitWorkflow/Seperation&ExitWrokflow";
import AnalyticsDashboard from "./pages/Reports&Analysis/reportAnalytics";
import SettingsDashboard from "./pages/Settings/settingsDashboard";

// EMPLOYEE pages
import EmployeeDashboard from "./pages/EmployeeHRM/employeeDashboard";

// Common
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/login";

// Auth context
import { AuthProvider } from "./AuthContext";

// Guards & role redirect
import { RequireAuth, RequireRole } from "./routes/guards";
import { RoleRedirect } from "./routes/RoleRedirect";

const queryClient = new QueryClient();

const App = () => (
  <AuthProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />

            {/* Default landing: redirect by role if logged in */}
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home/*" element={<RequireAuth />}>
              <Route index element={<RoleRedirect />} />
            </Route>

            {/* ========================= ADMIN AREA ========================= */}
            <Route element={<RequireAuth />}>
              <Route element={<RequireRole role="ADMIN" />}>
                <Route path="/admin" element={<MainLayout />}>
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="employees">
                    <Route path="directory" element={<EmployeeDirectory />} />
                    <Route path="onboarding" element={<EmployeeOnboarding />} />
                    <Route path="profiles" element={<ProfileManagement />} />
                    <Route path="id-card" element={<EmployeeIDCard />} />
                  </Route>
                  <Route path="attendance">
                    <Route path="register" element={<AttendanceRegister />} />
                    <Route path="shifts" element={<ShiftRules />} />
                    <Route path="logs" element={<GeoBiometricLogs />} />
                  </Route>
                  <Route path="leave">
                    <Route path="apply" element={<ApplyLeave />} />
                    <Route path="approvals" element={<LeaveApprovals />} />
                    <Route path="policies" element={<LeavePolicies />} />
                  </Route>
                  <Route path="payroll">
                    <Route path="run" element={<PayrollRun />} />
                    <Route path="payslips" element={<Payslips />} />
                    <Route path="reports" element={<StatutoryReports />} />
                  </Route>
                  <Route path="performance">
                    <Route path="goals" element={<OKRsDashboard />} />
                    <Route path="feedback" element={<ReviewDashboard />} />
                    <Route path="appraisals" element={<AppraisalDashboard />} />
                    <Route
                      path="promotion"
                      element={<PromotionAndIncrementDashboard />}
                    />
                  </Route>
                  <Route path="engagement">
                    <Route
                      path="newsfeed"
                      element={<AnnouncementFeedDashboard />}
                    />
                    <Route path="polls" element={<SurveysDashboard />} />
                    <Route
                      path="rewards"
                      element={<RewardsAndRecognitionDashboard />}
                    />
                    <Route
                      path="greets"
                      element={<BirthdayAnniversaryDashboard />}
                    />
                  </Route>
                  <Route
                    path="compliance"
                    element={<ComplianceHubDashboard />}
                  />
                  <Route
                    path="separation"
                    element={<ExitWorkflowDashboard />}
                  />
                  <Route path="reports" element={<AnalyticsDashboard />} />
                  <Route path="settings" element={<SettingsDashboard />} />
                </Route>
              </Route>
            </Route>

            {/* ======================== EMPLOYEE AREA ======================= */}
            <Route element={<RequireAuth />}>
              <Route element={<RequireRole role="EMPLOYEE" />}>
                <Route path="/employee">
                  <Route index element={<EmployeeDashboard />} />
                  <Route path="my-leave" element={<ApplyLeave />} />
                  {/* Add more employee-only routes here */}
                </Route>
              </Route>
            </Route>

            {/* 404 */}
            {/* Design pending for 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </AuthProvider>
);

export default App;
