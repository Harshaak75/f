import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import prisma from "../prisma/client";
import { Role } from "@prisma/client";

const router = Router();

/**
 * Helper function to check if two dates are on the same day (ignores time)
 */
const isSameDay = (date1: Date, date2: Date) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

/**
 * Helper to format a date as MM/DD (e.g., 10/14)
 */
const formatAsMMDD = (date: Date) => {
  // Using 'en-GB' to get DD/MM format, then swapping.
  // 'en-US' (MM/DD) is also fine if that's what you prefer.
  const parts = date
    .toLocaleDateString("en-US", { month: "2-digit", day: "2-digit" })
    .split("/");
  return `${parts[0]}/${parts[1]}`; // Returns MM/DD
};

// ====================================================================
// ADMIN: Get Upcoming Birthdays & Anniversaries Dashboard
// ====================================================================
/**
 * @route   GET /api/milestones
 * @desc    Get upcoming birthdays, anniversaries, and summary card data.
 * @access  Private (Admin)
 */
router.get("/", protect, async (req, res) => {
  const { tenantId, role } = req.user!;

  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: "Forbidden." });
  }

  try {
    // 1. Fetch all employees and tenant settings
    const [employees, tenantSettings] = await Promise.all([
      prisma.employeeProfile.findMany({
        where: { tenantId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          designation: true,
          joiningDate: true,
          dateOfBirth: true, // From our schema update
        },
      }),
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          enableBirthdayEmails: true,
          enableAnniversaryEmails: true,
        },
      }),
    ]);

    // 2. Initialize lists and counters
    const upcomingBirthdays: any[] = [];
    const upcomingAnniversaries: any[] = [];
    let monthBirthdayCount = 0;
    let monthAnniversaryCount = 0;
    const todayEventNames: string[] = [];

    // 3. Define date ranges
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    const next30Days = new Date(today);
    next30Days.setDate(today.getDate() + 30);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // 4. Loop through all employees and calculate
    for (const emp of employees) {
      const name = `${emp.firstName} ${emp.lastName}`;

      // --- Check Birthdays ---
      if (emp.dateOfBirth) {
        const dob = new Date(emp.dateOfBirth);
        // Set birthday to this year
        const thisYearBirthday = new Date(
          today.getFullYear(),
          dob.getMonth(),
          dob.getDate()
        );
        const isToday = isSameDay(thisYearBirthday, today);

        // Check for 30-day "upcoming" list
        if (thisYearBirthday >= today && thisYearBirthday <= next30Days) {
          upcomingBirthdays.push({
            id: `B-${emp.id}`,
            name: name,
            department: emp.designation || "N/A",
            date: formatAsMMDD(thisYearBirthday),
            isToday: isToday,
          });
        }

        // Check for "current month" summary
        if (
          thisYearBirthday >= startOfMonth &&
          thisYearBirthday <= endOfMonth
        ) {
          monthBirthdayCount++;
        }

        if (isToday) {
          todayEventNames.push(emp.firstName);
        }
      }

      // --- Check Anniversaries ---
      if (emp.joiningDate) {
        const joinDate = new Date(emp.joiningDate);
        const years = today.getFullYear() - joinDate.getFullYear();

        // Skip 0-year anniversaries
        if (years > 0) {
          const thisYearAnniversary = new Date(
            today.getFullYear(),
            joinDate.getMonth(),
            joinDate.getDate()
          );
          const isToday = isSameDay(thisYearAnniversary, today);

          // Check for 30-day "upcoming" list
          if (
            thisYearAnniversary >= today &&
            thisYearAnniversary <= next30Days
          ) {
            upcomingAnniversaries.push({
              id: `A-${emp.id}`,
              name: name,
              department: emp.designation || "N/A",
              date: formatAsMMDD(thisYearAnniversary),
              isToday: isToday,
              years: years,
            });
          }

          // Check for "current month" summary
          if (
            thisYearAnniversary >= startOfMonth &&
            thisYearAnniversary <= endOfMonth
          ) {
            monthAnniversaryCount++;
          }

          if (isToday) {
            todayEventNames.push(emp.firstName);
          }
        }
      }
    }

    // 5. Sort lists by date
    // We parse the MM/DD date correctly for sorting
    const sortFn = (a: any, b: any) => {
      const [aMonth, aDay] = a.date.split("/").map(Number);
      const [bMonth, bDay] = b.date.split("/").map(Number);
      return (
        new Date(today.getFullYear(), aMonth - 1, aDay).getTime() -
        new Date(today.getFullYear(), bMonth - 1, bDay).getTime()
      );
    };
    upcomingBirthdays.sort(sortFn);
    upcomingAnniversaries.sort(sortFn);

    // 6. Format summary data to match your static data
    const automationStatus =
      tenantSettings?.enableBirthdayEmails ||
      tenantSettings?.enableAnniversaryEmails
        ? "Active"
        : "Disabled";

    let nextEvent =
      todayEventNames.length > 0
        ? todayEventNames.slice(0, 2).join(" & ") // Max 2 names
        : "None Today";
    if (todayEventNames.length > 2)
      nextEvent += ` & ${todayEventNames.length - 2} more`;

    const summaryCards = [
      {
        title: "Total Birthdays (Month)",
        value: monthBirthdayCount.toString(),
        unit: "Upcoming",
        icon: "Cake",
      },
      {
        title: "Work Anniversaries (Month)",
        value: monthAnniversaryCount.toString(),
        unit: "Milestones",
        icon: "Briefcase",
      },
      {
        title: "Next Event",
        value: nextEvent,
        unit: todayEventNames.length > 0 ? "Today!" : "No events today",
        icon: "Clock",
      },
      {
        title: "Email Automation Status",
        value: automationStatus,
        unit: "System Running",
        icon: "Mail",
      },
    ];

    // 7. Send the complete dashboard data
    res.status(200).json({
      summaryCards,
      birthdays: upcomingBirthdays,
      anniversaries: upcomingAnniversaries,
    });
  } catch (error) {
    console.error("Failed to fetch milestones:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ====================================================================
// ADMIN: Get & Update Automation Settings
// ====================================================================
/**
 * @route   GET /api/milestones/settings
 * @desc    Get the milestone automation settings for the tenant.
 * @access  Private (Admin)
 */
router.get("/settings", protect, async (req, res) => {
  const { tenantId, role } = req.user!;

  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: "Forbidden." });
  }

  try {
    const settings = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        enableBirthdayEmails: true,
        enableAnniversaryEmails: true,
        milestoneEmailTemplate: true,
      },
    });
    res.status(200).json(settings);
  } catch (error) {
    console.error("Failed to get settings:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * @route   PUT /api/milestones/settings
 * @desc    Update the milestone automation settings.
 * @access  Private (Admin)
 */
router.put("/settings", protect, async (req, res) => {
  const { tenantId, role } = req.user!;
  const { enableBirthdayEmails, enableAnniversaryEmails } = req.body;

  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: "Forbidden." });
  }

  try {
    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        enableBirthdayEmails: !!enableBirthdayEmails,
        enableAnniversaryEmails: !!enableAnniversaryEmails,
      },
    });
    res.status(200).json(updatedTenant);
  } catch (error) {
    console.error("Failed to update settings:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
