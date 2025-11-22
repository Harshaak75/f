import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useEffect } from "react";
import { jwtDecode } from "jwt-decode";

/** Gate: requires any authenticated user */
export function RequireAuth() {
  const { user, isLoading, setUserFromStorage } = useAuth();
  console.log("RequireAuth -> user:", user);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      localStorage.setItem("accessToken", token);

      const decoded: any = jwtDecode(token);

      const userData = {
        id: decoded.userId,
        email: decoded.email || "",
        name: decoded.name || "Employee",
        role: decoded.role,
        tenantId: decoded.tenantId,
      };

      setUserFromStorage(userData);

      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);
  if (isLoading) return <div className="p-6">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

/** Gate: requires a specific role; redirects to the user's home if wrong role */
export function RequireRole({ role }: { role: "ADMIN" | "EMPLOYEE" }) {
  const { user } = useAuth();
  console.log("RequireRole -> user:", user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) {
    return <Navigate to={user.role === "ADMIN" ? "/admin" : "/employee"} replace />;
  }
  return <Outlet />;
}
