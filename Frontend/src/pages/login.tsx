import React, { useState } from 'react';
// Assuming these Shadcn/ui components are available
import { Card } from '../components/ui/card'; // Changed path to standard Shadcn/ui import
import { Button } from '../components/ui/button'; // Changed path to standard Shadcn/ui import
import { Input } from '../components/ui/input'; // Changed path to standard Shadcn/ui import
import { Label } from '../components/ui/label'; // Changed path to standard Shadcn/ui import
import { Users, Lock, ChevronRight, Briefcase, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

// --- Main Component ---

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      // If your backend expects "email", pass email as email here:
      const user = await login({ email, password }); // calls backend, sets cookie & context

      // Route by role
      if (user.role === "ADMIN") {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/employee", { replace: true });
      }
    } catch (err: any) {
      // You can swap this alert with your toast component
      alert(err?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };


  return (
    // Outer container: Full screen height, centered content, consistent mobile padding (p-4)
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 font-sans">
      <Card className="w-full max-w-6xl overflow-hidden shadow-2xl rounded-xl">
        {/* Grid Container: Single column on mobile, two columns on large screens (lg) */}
        <div className="grid lg:grid-cols-2">

          {/* Left Column: Login Form */}
          {/* Responsive Padding: p-6 on mobile, p-10 on small screens, p-16 on large screens */}
          <div className="p-6 sm:p-10 lg:p-16 flex flex-col justify-center">

            {/* Logo and Branding */}
            <div className="mb-8 flex items-center">
              <Briefcase className="h-8 w-8 text-indigo-600 mr-2" />
              <span className="text-3xl font-extrabold text-gray-900">
                HRM Portal
              </span>
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome Back</h2>
            <p className="text-gray-500 mb-8">Sign in to access your Human Resources management tools.</p>

            <form onSubmit={handleLogin} className="space-y-6">

              {/* HR Code Input */}
              <div>
                <Label htmlFor="hr-code" className="text-sm font-medium text-gray-700">HR Code</Label>
                <div className="relative mt-1 rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Users className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="hr-code"
                    type="text"
                    placeholder="Enter your unique HR Code"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 h-11 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                <div className="relative mt-1 rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 h-11 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <a href="#" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                  Forgot Password?
                </a>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-lg font-semibold bg-indigo-600 hover:bg-indigo-700 shadow-lg transition duration-150"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing In...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    Login <ChevronRight className="ml-1 h-5 w-5" />
                  </span>
                )}
              </Button>
            </form>
          </div>

          {/* Right Column: Visual/Image Panel */}
          {/* Hidden on mobile (default) and shown only on large screens (lg:flex) */}
          <div className="hidden lg:flex flex-col justify-between p-12 bg-indigo-600 text-white">
            <h3 className="text-3xl font-extrabold tracking-tight">
              Powering HR Excellence
            </h3>

            <div className="space-y-4">
              <p className="text-indigo-200 text-lg">
                Manage performance cycles, compliance, payroll, and employee engagement—all in one centralized platform.
              </p>
              <ul className="space-y-2 text-indigo-100">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-indigo-300" />
                  Real-time Analytics & Reporting
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-indigo-300" />
                  Automated Appraisal Workflows
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-indigo-300" />
                  Integrated Compliance Tracking
                </li>
              </ul>
            </div>

            {/* Image Placeholder (using a stylized block for consistency) */}
            <div className="mt-8">
              <div className="h-48 w-full bg-indigo-700/50 rounded-lg border-2 border-dashed border-indigo-400 flex items-center justify-center">
                <span className="text-indigo-200 text-lg font-medium">
                  [Replace with Marketing/Branding Image]
                </span>
              </div>
            </div>

          </div>
        </div>
      </Card>
    </div>
  );
}