import { Navigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

/** Sends a logged-in user to their home area by role */
export function RoleRedirect() {
  console.log("🔥 RoleRedirect RAN");
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "ADMIN" ? "/admin/dashboard" : "/employee"} replace />;
}
