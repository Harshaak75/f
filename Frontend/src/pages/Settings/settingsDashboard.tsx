import React, { useState } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Image, Palette } from "lucide-react";

/* -------------------------------------------------
   TASK MANAGEMENT – REALISTIC BRANDING PREVIEW
--------------------------------------------------*/

export default function TaskManagementBrandingPreview() {
  const [logo, setLogo] = useState<string | null>(null);
  const [dashboardLogo, setDashboardLogo] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#1e3a8a"); // Default blue
  const [loginPageBackgroundColor, setLoginPageBackgroundColor] = useState("#1e3a8a"); // Default blue
  const [loginPageTextColor, setLoginPageTextColor] = useState("#ffffff"); // Default blue
  const [dashboardSidebarTextColor, setDashboardSidebarTextColor] = useState("#ffffff"); // Default blue
  const [secondaryColor, setSecondaryColor] = useState("#64748b");

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setLogo(URL.createObjectURL(file));
  };

  const handleDashboardLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setDashboardLogo(URL.createObjectURL(file));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ================= LEFT : BRANDING CONTROLS ================= */}
      <Card className="p-6 space-y-5">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Task Management Branding
        </h2>

        <div>
          <label className="text-sm font-medium">Company Logo</label>
          <Input type="file" onChange={handleLogoUpload} />
        </div>

        <div>
          <label className="text-sm font-medium">Dashboard Logo</label>
          <Input type="file" onChange={handleDashboardLogoUpload} />
        </div>

        <div>
          <label className="text-sm font-medium">Login Page Background Color</label>
          <Input
            type="color"
            value={loginPageBackgroundColor}
            onChange={(e) => setLoginPageBackgroundColor(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Login Page Text Color</label>
          <Input
            type="color"
            value={loginPageTextColor}
            onChange={(e) => setLoginPageTextColor(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Dashboard Sidebar Background Color</label>
          <Input
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Dashboard Sidebar Text Color</label>
          <Input
            type="color"
            value={dashboardSidebarTextColor}
            onChange={(e) => setDashboardSidebarTextColor(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Secondary Color</label>
          <Input
            type="color"
            value={secondaryColor}
            onChange={(e) => setSecondaryColor(e.target.value)}
          />
        </div>
      </Card>

      {/* ================= RIGHT : LIVE PREVIEW ================= */}
      <div className="space-y-6">
        {/* -------- LOGIN PAGE PREVIEW -------- */}
        <Card className="p-6">
          <p className="text-sm font-semibold mb-3 text-gray-600">
            Login Page Preview
          </p>

          <div className="rounded-xl border shadow-sm p-6 text-center">
            {logo ? (
              <img src={logo} className="h-12 mx-auto mb-4" />
            ) : (
              <div
                className="h-12 w-32 mx-auto mb-4 rounded"
                style={{ background: primaryColor }}
              />
            )}

            <h2
              className="text-xl font-bold"
              style={{ color: primaryColor }}
            >
              Sign in to your account
            </h2>

            <div className="mt-4 space-y-3">
              <Input disabled placeholder="Email" />
              <Input disabled placeholder="Password" />

              <Button
                className={`w-full`}
                style={{ background: loginPageBackgroundColor, color: loginPageTextColor }}
              >
                Login
              </Button>
            </div>
          </div>
        </Card>

        {/* -------- DASHBOARD PREVIEW -------- */}
        <Card className="overflow-hidden">
          <p className="text-sm font-semibold p-4 text-gray-600">
            Dashboard Preview
          </p>

          <div className="flex h-[280px] border rounded-lg overflow-hidden">
            {/* Sidebar */}
            <div
              className="w-50 p-4 text-white"
              style={{ background: primaryColor }}
            >
              <div className="flex items-center gap-2 mb-6">
                {dashboardLogo && <img src={dashboardLogo} className="h-8" />}
              </div>

              <div className="space-y-2 text-sm">
                <div className="opacity-90">Dashboard</div>
                <div className="opacity-70">My Tasks</div>
                <div className="opacity-70">Performance</div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 bg-white">
              <h1
                className="text-2xl font-bold"
                style={{ color: primaryColor }}
              >
                My Task Performance Dashboard
              </h1>

              <p
                className="mt-1 text-sm"
                style={{ color: secondaryColor }}
              >
                Track daily productivity
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
