import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react"; // For a loading spinner
import { useAuth } from "../../AuthContext";

/**
 * Checks if a user is logged in.
 * If not, redirects to the /login page.
 * This wraps ALL routes except /login.
 */
export const AuthGuard: React.FC = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    // Show a loading spinner while the AuthContext
    // is checking the cookie with the backend
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // If not loading and still no user, redirect to login.
    // We pass the 'from' location so the user can be redirected
    // back to the page they were trying to access after they log in.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If logged in, render the child routes (in your case, the <MainLayout />)
  return <Outlet />;
};

/**
 * Checks if a logged-in user has the correct role.
 * If not, redirects to a "Not Found" page.
 */
interface ProtectedRouteProps {
  allowedRoles: ("ADMIN" | "EMPLOYEE")[];
}
export const RoleGuard: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user } = useAuth(); // We know user is not null because this is inside AuthGuard

  if (allowedRoles.includes(user!.role)) {
    // Role is allowed, render the child routes (e.g., <PayrollRun /> or <ApplyLeave />)
    return <Outlet />;
  }

  // Role is not allowed, send them to a "Not Found" page.
  return <Navigate to="/not-found" replace />;
};
