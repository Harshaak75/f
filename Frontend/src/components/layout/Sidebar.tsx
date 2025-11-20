// import { useState } from 'react';
// import { NavLink } from 'react-router-dom';
// import { motion, AnimatePresence } from 'framer-motion';
// import {
//   LayoutDashboard,
//   Users,
//   UserPlus,
//   UserCircle,
//   BookUser,
//   BadgeCheck,
//   Clock,
//   Calendar,
//   FileText,
//   DollarSign,
//   Target,
//   MessageCircle,
//   Shield,
//   FileSpreadsheet,
//   Settings,
//   ChevronLeft,
//   ChevronRight,
//   Search,
//   LogOut,
//   Briefcase,
//   TrendingUp,
//   Heart,
//   Award,
// } from 'lucide-react';
// import { cn } from '../../lib/utils';
// import { Input } from '../../components/ui/input';

// interface MenuItem {
//   title: string;
//   icon: any;
//   path: string;
//   children?: MenuItem[];
// }

// const menuItems: MenuItem[] = [
//   { title: 'Dashboard', icon: LayoutDashboard, path: '/' },
//   {
//     title: 'Employees',
//     icon: Users,
//     path: '/employees',
//     children: [
//       { title: 'Employee Onboarding', icon: UserPlus, path: '/employees/onboarding' },
//       { title: 'Profile Management', icon: UserCircle, path: '/employees/profiles' },
//       { title: 'Employee Directory', icon: BookUser, path: '/employees/directory' },
//       { title: 'Digital Employee ID Card', icon: BadgeCheck, path: '/employees/id-card' },
//     ],
//   },
//   {
//     title: 'Attendance & Time',
//     icon: Clock,
//     path: '/attendance',
//     children: [
//       { title: 'Attendance Register', icon: FileText, path: '/attendance/register' },
//       { title: 'Shift & Rules', icon: Calendar, path: '/attendance/shifts' },
//       { title: 'Geo & Biometric Logs', icon: Target, path: '/attendance/logs' },
//     ],
//   },
//   {
//     title: 'Leave Management',
//     icon: Calendar,
//     path: '/leave',
//     children: [
//       { title: 'Apply Leave', icon: FileText, path: '/leave/apply' },
//       { title: 'Leave Approvals', icon: BadgeCheck, path: '/leave/approvals' },
//       { title: 'Leave Policies', icon: Shield, path: '/leave/policies' },
//     ],
//   },
//   {
//     title: 'Payroll & Compensation',
//     icon: DollarSign,
//     path: '/payroll',
//     children: [
//       { title: 'Payroll Run', icon: TrendingUp, path: '/payroll/run' },
//       { title: 'Payslips', icon: FileText, path: '/payroll/payslips' },
//       { title: 'Statutory Reports', icon: FileSpreadsheet, path: '/payroll/reports' },
//     ],
//   },
//   {
//     title: 'Performance',
//     icon: Target,
//     path: '/performance',
//     children: [
//       { title: 'Goals (KRAs / OKRs)', icon: Target, path: '/performance/goals' },
//       { title: '360° Feedback', icon: MessageCircle, path: '/performance/feedback' },
//       { title: 'Appraisals', icon: Award, path: '/performance/appraisals' },
//       { title: 'Promotion', icon: Award, path: '/performance/promotion' },
//     ],
//   },
//   {
//     title: 'Engagement',
//     icon: Heart,
//     path: '/engagement',
//     children: [
//       { title: 'Internal Announcement', icon: MessageCircle, path: '/engagement/newsfeed' },
//       { title: 'Polls & Recognition', icon: Award, path: '/engagement/polls' },
//       { title: 'Rewards & Recognitions', icon: Award, path: '/engagement/rewards' },
//       { title: 'Birthday & Anniversay Greetings', icon: Award, path: '/engagement/greets' },
//     ],
//   },
//   { title: 'Compliance & Policies', icon: Shield, path: '/compliance' },
//   { title: 'Separation & Exit', icon: LogOut, path: '/separation' },
//   { title: 'Reports & Analytics', icon: FileSpreadsheet, path: '/reports' },
//   { title: 'Settings', icon: Settings, path: '/settings' },
// ];

// export function Sidebar() {
//   const [collapsed, setCollapsed] = useState(false);
//   const [expandedItems, setExpandedItems] = useState<string[]>(['/employees']);
//   const [searchQuery, setSearchQuery] = useState('');

//   const toggleExpanded = (path: string) => {
//     setExpandedItems((prev) =>
//       prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
//     );
//   };

//   const filteredMenuItems = menuItems.filter((item) =>
//     item.title.toLowerCase().includes(searchQuery.toLowerCase())
//   );

//   return (
//     <motion.div
//       initial={false}
//       animate={{ width: collapsed ? 80 : 280 }}
//       transition={{ duration: 0.3, ease: 'easeInOut' }}
//       className="relative h-screen bg-sidebar border-r border-sidebar-border flex flex-col"
//     >
//       {/* Logo */}
//       <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
//         <AnimatePresence mode="wait">
//           {!collapsed && (
//             <motion.div
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               exit={{ opacity: 0 }}
//               className="flex items-center gap-3"
//             >
//               <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-lg">
//                 D
//               </div>
//               <div>
//                 <div className="font-semibold text-sm">Dotspeaks</div>
//                 <div className="text-xs text-muted-foreground">HRM System</div>
//               </div>
//             </motion.div>
//           )}
//         </AnimatePresence>
//         <button
//           onClick={() => setCollapsed(!collapsed)}
//           className="p-2 hover:bg-sidebar-accent rounded-lg transition-colors"
//         >
//           {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
//         </button>
//       </div>

//       {/* Search */}
//       {!collapsed && (
//         <div className="p-4">
//           <div className="relative">
//             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
//             <Input
//               placeholder="Search..."
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               className="pl-9 bg-secondary border-0"
//             />
//           </div>
//         </div>
//       )}

//       {/* Navigation */}
//       <nav className="flex-1 overflow-y-auto py-4 px-2">
//         {filteredMenuItems.map((item) => (
//           <div key={item.path} className="mb-1">
//             <NavLink
//               to={item.path}
//               end={!item.children}
//               onClick={(e) => {
//                 if (item.children) {
//                   e.preventDefault();
//                   toggleExpanded(item.path);
//                 }
//               }}
//               className={({ isActive }) =>
//                 cn(
//                   'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative group',
//                   isActive && !item.children
//                     ? 'bg-sidebar-accent text-sidebar-accent-foreground'
//                     : 'hover:bg-sidebar-accent/50'
//                 )
//               }
//             >
//               {({ isActive }) => (
//                 <>
//                   {isActive && !item.children && (
//                     <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r" />
//                   )}
//                   <item.icon size={20} />
//                   {!collapsed && <span className="flex-1 text-sm font-medium">{item.title}</span>}
//                   {!collapsed && item.children && (
//                     <ChevronRight
//                       size={16}
//                       className={cn(
//                         'transition-transform',
//                         expandedItems.includes(item.path) && 'rotate-90'
//                       )}
//                     />
//                   )}
//                 </>
//               )}
//             </NavLink>

//             {/* Submenu */}
//             {item.children && !collapsed && expandedItems.includes(item.path) && (
//               <motion.div
//                 initial={{ height: 0, opacity: 0 }}
//                 animate={{ height: 'auto', opacity: 1 }}
//                 exit={{ height: 0, opacity: 0 }}
//                 className="ml-4 mt-1 space-y-1 overflow-hidden"
//               >
//                 {item.children.map((child) => (
//                   <NavLink
//                     key={child.path}
//                     to={child.path}
//                     className={({ isActive }) =>
//                       cn(
//                         'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm',
//                         isActive
//                           ? 'bg-sidebar-accent text-sidebar-accent-foreground'
//                           : 'hover:bg-sidebar-accent/50'
//                       )
//                     }
//                   >
//                     <child.icon size={16} />
//                     <span>{child.title}</span>
//                   </NavLink>
//                 ))}
//               </motion.div>
//             )}
//           </div>
//         ))}
//       </nav>
//     </motion.div>
//   );
// }

import { useState, useMemo } from "react";
import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  UserCircle,
  BookUser,
  BadgeCheck,
  Clock,
  Calendar,
  FileText,
  DollarSign,
  Target,
  MessageCircle,
  Shield,
  FileSpreadsheet,
  Settings,
  ChevronLeft,
  ChevronRight,
  Search,
  LogOut,
  TrendingUp,
  Award,
  Gift,
  UserCheck,
  Heart,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Input } from "../../components/ui/input";
import { useAuth } from "../../AuthContext";

interface MenuItem {
  title: string;
  icon: any;
  path: string;
  children?: MenuItem[];
}

/* ------------------------- Admin menu definition ------------------------- */
const adminMenuItems: MenuItem[] = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/" },
  {
    title: "Employees",
    icon: Users,
    path: "/admin/employees",
    children: [
      {
        title: "Employee Onboarding",
        icon: UserPlus,
        path: "/admin/employees/onboarding",
      },
      // {
      //   title: "Profile Management",
      //   icon: UserCircle,
      //   path: "/admin/employees/profiles",
      // },
      {
        title: "Employee Directory",
        icon: BookUser,
        path: "/admin/employees/directory",
      },
      // {
      //   title: "Digital Employee ID Card",
      //   icon: BadgeCheck,
      //   path: "/admin/employees/id-card",
      // },
    ],
  },
  {
    title: "Attendance & Time",
    icon: Clock,
    path: "/admin/attendance",
    children: [
      {
        title: "Attendance Register",
        icon: FileText,
        path: "/admin/attendance/register",
      },
      // { title: "Shift & Rules", icon: Calendar, path: "/admin/attendance/shifts" },
      { title: "Geo & Biometric Logs", icon: Target, path: "/admin/attendance/logs" },
    ],
  },
  {
    title: "Leave Management",
    icon: Calendar,
    path: "/admin/leave",
    children: [
      { title: "Leave Approvals", icon: BadgeCheck, path: "/admin/leave/approvals" },
      // { title: "Leave Policies", icon: Shield, path: "/admin/leave/policies" },
    ],
  },
  {
    title: "Payroll & Compensation",
    icon: DollarSign,
    path: "/admin/payroll",
    children: [
      { title: "Payroll Run", icon: TrendingUp, path: "/admin/payroll/run" },
      { title: "Payslips", icon: FileText, path: "/admin/payroll/payslips" },
      // {
      //   title: "Statutory Reports",
      //   icon: FileSpreadsheet,
      //   path: "/admin/payroll/reports",
      // },
    ],
  },
  {
    title: "Performance",
    icon: Target,
    path: "/admin/performance",
    children: [
      {
        title: "Goals (KRAs / OKRs)",
        icon: Target,
        path: "/admin/performance/goals",
      },
      { title: "Feedback", icon: MessageCircle, path: "/admin/performance/feedback" },
      { title: "Appraisals", icon: Award, path: "/admin/performance/appraisals" },
      { title: "Promotion", icon: Award, path: "/admin/performance/promotion" },
    ],
  },
  {
    title: "Engagement",
    icon: Heart,
    path: "/admin/engagement",
    children: [
      {
        title: "Internal Announcement",
        icon: MessageCircle,
        path: "/admin/engagement/newsfeed",
      },
      { title: "Polls & Survey", icon: Award, path: "/admin/engagement/polls" },
      {
        title: "Rewards & Recognitions",
        icon: Award,
        path: "/admin/engagement/rewards",
      },
      {
        title: "Birthday & Anniversary",
        icon: Award,
        path: "/admin/engagement/greets",
      },
    ],
  },
  { title: "Compliance & Policies", icon: Shield, path: "/admin/compliance" },
  { title: "Separation & Exit", icon: LogOut, path: "/admin/separation" },
  { title: "Reports & Analytics", icon: FileSpreadsheet, path: "/admin/reports" },
  { title: "Settings", icon: Settings, path: "/admin/settings" },
];

/* ------------------------ Employee menu definition ----------------------- */
const employeeMenuItems: MenuItem[] = [
  { title: "My Dashboard", icon: LayoutDashboard, path: "/employee/myDashboard" },
  { title: "My Leave", icon: Calendar, path: "/employee/my-leave" },
  { title: "My Payslips", icon: FileText, path: "/employee/my-payslips" },
  { title: "My Reviews", icon: UserCheck, path: "/employee/my-reviews" },
  { title: "Announcements", icon: MessageCircle, path: "/employee/engagement/newsfeed" },
  { title: "Recognition", icon: Gift, path: "/employee/engagement/rewards" },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const isEmployee = user?.role === "EMPLOYEE";

  const menuItems = isEmployee ? employeeMenuItems : adminMenuItems;

  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(
    isEmployee ? [] : ["/employees"] // sensible default for admins
  );
  const [searchQuery, setSearchQuery] = useState("");

  const toggleExpanded = (path: string) => {
    setExpandedItems((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  // Search across parents and children (parent shows if either matches)
  const filteredMenuItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return menuItems;
    return menuItems
      .map((item) => {
        const parentMatch = item.title.toLowerCase().includes(q);
        if (!item.children) return parentMatch ? item : null;

        const filteredChildren = item.children.filter((c) =>
          c.title.toLowerCase().includes(q)
        );
        if (parentMatch || filteredChildren.length) {
          return {
            ...item,
            children: parentMatch ? item.children : filteredChildren,
          };
        }
        return null;
      })
      .filter(Boolean) as MenuItem[];
  }, [menuItems, searchQuery]);

  return (
    <motion.div
      initial={false}
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="relative h-screen bg-sidebar border-r border-sidebar-border flex flex-col"
    >
      {/* Header / Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              key="brand"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-lg">
                D
              </div>
              <div>
                <div className="font-semibold text-sm">Dotspeaks</div>
                <div className="text-xs text-muted-foreground">
                  {isEmployee ? "Employee Portal" : "HRM System"}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setCollapsed((c) => !c)}
          className="p-2 hover:bg-sidebar-accent rounded-lg transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Search (Admins only, and only when expanded) */}
      {!collapsed && !isEmployee && (
        <div className="p-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-secondary border-0"
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {filteredMenuItems.map((item) => {
          const hasChildren = !!item.children?.length;

          return (
            <div key={item.path} className="mb-1">
              <NavLink
                to={item.path}
                end={!hasChildren}
                onClick={(e) => {
                  if (hasChildren) {
                    e.preventDefault();
                    toggleExpanded(item.path);
                  }
                }}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative group",
                    isActive && !hasChildren
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "hover:bg-sidebar-accent/50"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && !hasChildren && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r" />
                    )}
                    <item.icon size={20} />
                    {!collapsed && (
                      <span className="flex-1 text-sm font-medium">
                        {item.title}
                      </span>
                    )}
                    {!collapsed && hasChildren && (
                      <ChevronRight
                        size={16}
                        className={cn(
                          "transition-transform",
                          expandedItems.includes(item.path) && "rotate-90"
                        )}
                      />
                    )}
                  </>
                )}
              </NavLink>

              {/* Submenu */}
              <AnimatePresence initial={false}>
                {hasChildren &&
                  !collapsed &&
                  expandedItems.includes(item.path) && (
                    <motion.div
                      key={`${item.path}-submenu`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="ml-4 mt-1 space-y-1 overflow-hidden"
                    >
                      {item.children!.map((child) => (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm",
                              isActive
                                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                : "hover:bg-sidebar-accent/50"
                            )
                          }
                        >
                          <child.icon size={16} />
                          <span>{child.title}</span>
                        </NavLink>
                      ))}
                    </motion.div>
                  )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-sidebar-border mt-auto">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors text-sm font-medium text-red-500 hover:bg-red-500/10"
        >
          <LogOut size={20} />
          <span className={cn(collapsed && "sr-only")}>Logout</span>
        </button>
      </div>
    </motion.div>
  );
}
