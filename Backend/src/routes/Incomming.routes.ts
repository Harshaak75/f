import { Router } from "express";
import prisma from "../prisma/client";
import { AttendanceStatus } from "@prisma/client";
import {
  protectTenantApi,
  TenantRequest,
} from "../middleware/protectRoute.middlware";
import { protect } from "../middleware/auth.middleware";

const router = Router();

// This is the route Acme Corp's server will call
// It is protected by our new API key middleware
router.post(
  "/attendance/check-in",
  protect,
  async (req: TenantRequest, res) => {
    // We get the tenantId from the middleware (which got it from the API key)
    const { tenantId, userId } = req.user!;
    const { employeeId, checkInTime } = req.body;

    if (!employeeId || !checkInTime) {
      return res.status(400).json({
        message:
          "Missing required fields: employeeId, latitude, longitude, checkInTime",
      });
    }

    try {
      // 1. Find the employee this request is for
      // const profile = await prisma.employeeProfile.findUnique({
      //   where: {
      //     tenantId_employeeId: {
      //       tenantId: tenantId, // We know this is valid from the middleware
      //       employeeId: employeeId,
      //     },
      //   },
      //   select: { userId: true },
      // });

      // if (!profile) {
      //   return res.status(404).json({
      //     message: `Employee with ID '${employeeId}' not found for this tenant.`,
      //   });
      // }

      // 2. [Validation Logic] - You would add your geofence validation here
      // ... (fetch tenant.officeLatitude, etc., and compare)
      // ... if (distance > radius) return res.status(403).json(...)

      // 3. Create the attendance record
      const today = new Date(checkInTime);
      today.setHours(0, 0, 0, 0); // Normalize to the start of the day

      const record = await prisma.attendanceRecord.upsert({
        where: {
          tenantId_userId_date: {
            tenantId: tenantId,
            userId: userId,
            date: today,
          },
        },
        update: {
          status: AttendanceStatus.PRESENT,
          checkIn: new Date(checkInTime),
        },
        create: {
          tenantId: tenantId,
          userId: userId,
          date: today,
          status: AttendanceStatus.PRESENT,
          checkIn: new Date(checkInTime),
          notes: "Checked in via API",
        },
      });

      res.status(201).json({
        message: "Check-in recorded successfully.",
        recordId: record.id,
      });
    } catch (error) {
      console.error("API check-in failed:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// '/attendance/check-out' route

// router.post(
//   "/attendance/check-out",
//   protect,
//   async (req: TenantRequest, res) => {
//     // We get the tenantId from the middleware (which got it from the API key)
//     const { tenantId, userId } = req.user!;
//     const { employeeId, checkOutTime } = req.body;

//     if (!employeeId || !checkOutTime) {
//       return res.status(400).json({
//         message:
//           "Missing required fields: employeeId, latitude, longitude, checkOutTime",
//       });
//     }

//     try {
//       // 1. Find the employee this request is for
//       // const profile = await prisma.employeeProfile.findUnique({
//       //   where: {
//       //     tenantId_employeeId: {
//       //       tenantId: tenantId!, // We know this is valid from the middleware
//       //       employeeId: employeeId,
//       //     },
//       //   },
//       //   select: { userId: true },
//       // });

//       // if (!profile) {
//       //   return res.status(404).json({
//       //     message: `Employee with ID '${employeeId}' not found for this tenant.`,
//       //   });
//       // }

//       // 2. [Validation Logic] - You can add your geofence validation here too
//       // ... (fetch tenant.officeLatitude, etc., and compare)
//       // ... if (distance > radius) return res.status(403).json({ message: 'Must be in office to check out.' })

//       // 3. Find the existing attendance record for today
//       const today = new Date(checkOutTime);
//       today.setHours(0, 0, 0, 0); // Normalize to the start of the day

//       const existingRecord = await prisma.attendanceRecord.findUnique({
//         where: {
//           tenantId_userId_date: {
//             tenantId: tenantId,
//             userId: userId,
//             date: today,
//           },
//         },
//       });

//       // 4. Validate the record
//       if (!existingRecord) {
//         return res.status(404).json({
//           message: "Cannot check out. No check-in record found for today.",
//         });
//       }
//       if (existingRecord.checkOut) {
//         return res
//           .status(409)
//           .json({ message: "Conflict: Already checked out for today." });
//       }

//       // 5. Calculate hours worked
//       const checkIn = existingRecord.checkIn || today; // Fallback to start of day if checkIn is somehow null
//       const checkOut = new Date(checkOutTime);
//       const hoursWorked =
//         (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60); // in hours

//       // 6. Update the record
//       const updatedRecord = await prisma.attendanceRecord.update({
//         where: {
//           id: existingRecord.id,
//         },
//         data: {
//           checkOut: checkOut,
//           hoursWorked: parseFloat(hoursWorked.toFixed(2)),
//         },
//       });

//       res.status(200).json({
//         message: "Check-out recorded successfully.",
//         record: updatedRecord,
//       });
//     } catch (error) {
//       console.error("API check-out failed:", error);
//       res.status(500).json({ message: "Internal server error" });
//     }
//   }
// );

router.post(
  "/attendance/check-out",
  protect,
  async (req: TenantRequest, res) => {
    const { tenantId, userId } = req.user!;
    const { employeeId, checkOutTime } = req.body;

    if (!employeeId || !checkOutTime) {
      return res.status(400).json({
        message: "Missing required fields: employeeId, checkOutTime",
      });
    }

    try {
      // 1. Find today's date (normalized)
      const today = new Date(checkOutTime);
      today.setHours(0, 0, 0, 0);

      // 2. Find today's attendance record
      const existingRecord = await prisma.attendanceRecord.findUnique({
        where: {
          tenantId_userId_date: {
            tenantId: tenantId,
            userId: userId,
            date: today,
          },
        },
      });

      if (!existingRecord) {
        return res.status(404).json({
          message: "Cannot check out. No check-in record found for today.",
        });
      }

      if (existingRecord.checkOut) {
        return res.status(409).json({
          message: "You have already checked out today.",
        });
      }

      // 3. Calculate hours worked
      const checkIn: any = existingRecord.checkIn;
      const checkOut = new Date(checkOutTime);

      const hoursWorked =
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);

      // 4. APPLY YOUR ATTENDANCE RULES
      let status: AttendanceStatus;

      if (hoursWorked < 4.5) {
        status = "ABSENT";
      } else if (hoursWorked >= 4.5 && hoursWorked < 9) {
        status = "HALF_DAY";
      } else {
        status = "PRESENT";
      }

      // 5. Update record in DB
      const updatedRecord = await prisma.attendanceRecord.update({
        where: { id: existingRecord.id },
        data: {
          checkOut: checkOut,
          hoursWorked: parseFloat(hoursWorked.toFixed(2)),
          status: status, // <--- IMPORTANT
        },
      });

      return res.status(200).json({
        message: "Check-out recorded successfully.",
        record: updatedRecord,
      });
    } catch (error) {
      console.error("API check-out failed:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.get("/status/today", protect, async (req, res) => {
  const { userId, tenantId } = req.user!;
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  try {
    const record = await prisma.attendanceRecord.findFirst({
      where: {
        tenantId,
        userId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (!record) {
      return res.json({ checkedIn: false, checkedOut: false });
    }

    res.json({
      checkedIn: !!record.checkIn,
      checkedOut: !!record.checkOut,
      checkInTime: record.checkIn,
      checkOutTime: record.checkOut,
    });
  } catch (err) {
    console.error("Error fetching today's attendance:", err);
    res.status(500).json({ error: "Failed to fetch attendance status" });
  }
});

export default router;
