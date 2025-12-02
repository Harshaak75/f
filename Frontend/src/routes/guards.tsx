import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../AuthContext";

/** Gate: requires any authenticated user */
export function RequireAuth() {
  console.log("RequireAuth check");
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="p-6">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

/** Gate: requires a specific role; redirects to the user's home if wrong role */
export function RequireRole({ role }: { role: "ADMIN" | "EMPLOYEE" }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  console.log("RequireRole check for role:", role, "user role:", user.role);
  if (user.role !== role) {
    return <Navigate to={user.role === "ADMIN" ? "/admin/dashboard" : "/employee"} replace />;
  }
  return <Outlet />;
}
