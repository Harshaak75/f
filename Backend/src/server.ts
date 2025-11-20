import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from 'cookie-parser';

import employeeRoutes from "./routes/employee.routes";
import mainRoute from "./routes/mainRoute";
import IncommingRoute from "./routes/Incomming.routes";
import AdminRoute from "./routes/admin.routes";
import PayrollRoute from "./routes/payslip.route";
import OKRRoute from "./routes/OKR.route";
import AdminReviewCycleRoute from "./routes/adminReviewCycle.route";
import EmployeeReviewCycleRoute from "./routes/employeeReviewCycle";
import PromotionReviewRoute from "./routes/promotion.route";
import AnnoucemtReviewRoute from "./routes/announcement.routes";
import SurveyReviewRoute from "./routes/survey.routes";
import RecognostionRoute from "./routes/Recognition.routes";
import BirthdayRoute from "./routes/birthday.route";
import ComplianceRoute from "./routes/compliance.routes";
import ExitRoute from "./routes/exit.routes";
import AnalyticsRoute from "./routes/analytics.routes";
import tenantApi from "./routes/idp.manage";
// import dashboardRoutes from "./routes/dashboard.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'f-jet-eight.vercel.app';

// ✅ Middlewares
app.use(cors({
  origin: [FRONTEND_ORIGIN, "https://f-bf0y.onrender.com", "http://localhost:4000"],             // ❗ NOT "*"
  credentials: true,                   // allow sending cookies
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  res.removeHeader("X-Frame-Options");
  res.setHeader("Content-Security-Policy", "frame-ancestors 'self' f-jet-eight.vercel.app");
  next();
});

app.use((req, res, next) => {
  res.removeHeader("X-Frame-Options"); // you already had this
  res.setHeader(
    "Content-Security-Policy",
    "frame-ancestors 'self' f-jet-eight.vercel.app"
  );
  res.setHeader("Permissions-Policy", "geolocation=(self)");
  next();
});

// ✅ Routes
app.use("/api/employee", employeeRoutes);
app.use("/api/mainRoute", mainRoute);
app.use("/api/incoming", IncommingRoute);
app.use("/api/admin", AdminRoute);
app.use("/api/payroll", PayrollRoute);
app.use("/api/okr", OKRRoute);
app.use("/api/admin/reviews", AdminReviewCycleRoute);
app.use("/api/employee/reviews", EmployeeReviewCycleRoute);
app.use("/api/promotions", PromotionReviewRoute);
app.use("/api/announcements", AnnoucemtReviewRoute);
app.use("/api/surveys", SurveyReviewRoute);
app.use("/api/recognition", RecognostionRoute);
app.use("/api/birthdays", BirthdayRoute);
app.use("/api/compliance", ComplianceRoute);
app.use("/api/exit", ExitRoute);
app.use("/api/analytics", AnalyticsRoute);
app.use("/api/tenant", tenantApi)
// app.use("/api/dashboard", dashboardRoutes);

// ✅ Root test route
app.get("/", (req, res) => {
  res.send("🚀 HRM Backend Server is running!");
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
