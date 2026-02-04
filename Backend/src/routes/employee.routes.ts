import express from "express";
import prisma from "../prisma/client";
import { protect } from "../middleware/auth.middleware"; // Import the middleware
import { Role, LeaveStatus } from "@prisma/client";
import { hashPassword } from "../utils/auth.utils";
import { calculatePayrollPreview } from "../utils/payroll.utils";
import { generatePayrollPdf } from "../utils/generatePDF.utils";
import multer from "multer";
import { supabase } from "../utils/Client";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { createKeycloakUser } from "../services/keycloakUsers";
import { assignRealmRole } from "../services/keycloakRoles";
import { exportExcel } from "../utils/Exports/exportExcel.attendance";
import { exportPDF } from "../utils/Exports/exportPDF.attendance";

const router = express.Router();

const storage = multer.memoryStorage();
const multerUpload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
  },
});

const BUCKET_NAME = "PersonalData";

/**
 * POST /api/employees/create-onboarding
 * Protected Route: Only ADMINs can access this.
 * Creates a new employee, which involves two steps:
 * 1. Create a new User (with 'EMPLOYEE' role).
 * 2. Create their EmployeeProfile (the onboarding form data).
 */
router.post("/create-onboarding", protect, async (req, res) => {
  const { tenantId, role } = req.user!;
  if (role !== Role.ADMIN) {
    return res
      .status(403)
      .json({ message: "Forbidden: Only admins can create employees." });
  }

  const {
    email,
    name,
    password,
    firstName,
    lastName,
    personalEmail,
    phone,
    employeeId,
    altPhone,
    emergencyContactName,
    emergencyContactPhone,
    designation,
    joiningDate, // "YYYY-MM-DD"
    employeeType,
    dateOfBirth, // "YYYY-MM-DD"
    accessRole,
  } = req.body;

  if (
    !email ||
    !name ||
    !password ||
    !firstName ||
    !lastName ||
    !phone ||
    !designation ||
    !joiningDate ||
    !employeeType ||
    !dateOfBirth
  ) {
    return res
      .status(400)
      .json({ message: "Missing required fields for new employee." });
  }

  if (!accessRole) {
    return res.status(400).json({ message: "Access role is required" });
  }

  // Normalize date-only strings to IST midnight to avoid TZ shifts
  const toISTMidnight = (ymd: string) => new Date(`${ymd}T00:00:00+05:30`);
  const joiningDateIso = toISTMidnight(joiningDate);
  const dobIso = toISTMidnight(dateOfBirth);

  try {
    const result = await prisma.$transaction(async (tx: any) => {
      // 1) Does a user with this email already exist?
      const existingUser = await tx.user.findUnique({ where: { email } });

      // Case A: user exists
      if (existingUser) {
        // If user is in a different tenant, this is a true conflict
        if (existingUser.tenantId !== tenantId) {
          throw Object.assign(
            new Error("User with this email belongs to another tenant."),
            { code: "DIFF_TENANT" }
          );
        }

        // Find or create profile for this user in this tenant
        let profile = await tx.employeeProfile.findFirst({
          where: { userId: existingUser.id, tenantId },
        });

        if (!profile) {
          // Create a fresh profile
          profile = await tx.employeeProfile.create({
            data: {
              employeeId,
              firstName,
              lastName,
              personalEmail,
              phone,
              altPhone,
              dateOfBirth: dobIso,
              emergencyContactName,
              emergencyContactPhone,
              designation,
              joiningDate: joiningDateIso,
              employeeType,
              accessRole,
              userId: existingUser.id,
              tenantId,
            },
          });
        } else {
          // Optional: PATCH-like update if you want the latest values to persist
          profile = await tx.employeeProfile.update({
            where: { id: profile.id },
            data: {
              employeeId,
              firstName,
              lastName,
              personalEmail,
              phone,
              altPhone,
              dateOfBirth: dobIso,
              emergencyContactName,
              emergencyContactPhone,
              designation,
              joiningDate: joiningDateIso,
              employeeType,
            },
          });
        }

        return {
          alreadyExists: true,
          user: existingUser,
          profile,
        };
      }

      // Case B: user does not exist -> create user + profile
      const hashedPassword = await hashPassword(password);

      const newUser = await tx.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          tenantId,
          role: Role.EMPLOYEE,
        },
      });

      const newProfile = await tx.employeeProfile.create({
        data: {
          employeeId,
          firstName,
          lastName,
          personalEmail,
          phone,
          altPhone,
          dateOfBirth: dobIso,
          emergencyContactName,
          emergencyContactPhone,
          designation,
          joiningDate: joiningDateIso,
          employeeType,
          accessRole,
          userId: newUser.id,
          tenantId,
        },
      });

      return {
        alreadyExists: false,
        user: newUser,
        profile: newProfile,
      };
    });

    // Shape the response to your frontend’s expectation
    res.status(result.alreadyExists ? 200 : 201).json({
      message: result.alreadyExists
        ? "Resumed existing employee profile."
        : "New employee created and onboarding started.",
      employee: {
        ...result.user,
        profile: { id: result.profile.id },
      },
      alreadyExists: result.alreadyExists,
    });
  } catch (error: any) {
    if (error.code === "DIFF_TENANT") {
      return res.status(409).json({ message: error.message });
    }
    if (error.code === "P2002") {
      // Unique constraint (shouldn’t hit anymore in same-tenant path)
      return res
        .status(409)
        .json({ message: "Conflict: A user with this email already exists." });
    }
    console.error("create-onboarding failed:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * --- UPDATED WITH MANUAL UPSERT ---
 * POST /api/employees/:profileId/document
 * Protected Route: Only ADMINs can access this.
 * Upserts a document reference (Step 2) for an EmployeeProfile.
 */
router.post(
  "/document",
  protect,
  multerUpload.array("files", 10), // up to 10 files; adjust as needed
  async (req, res) => {
    const { tenantId, role } = req.user!;
    const { profileId } = req.body.profileId;
    const docTypesRaw = req.body.documentType;
    const files = req.files as Express.Multer.File[];

    if (role !== Role.ADMIN) {
      return res
        .status(403)
        .json({ message: "Forbidden: Only admins can add documents." });
    }
    if (!files?.length) {
      return res.status(400).json({ message: "No files uploaded." });
    }
    // Normalize documentType to array and check lengths
    const documentTypes: string[] = Array.isArray(docTypesRaw)
      ? docTypesRaw
      : [docTypesRaw].filter(Boolean);

    if (!documentTypes.length || documentTypes.length !== files.length) {
      return res.status(400).json({
        message: "documentType count must match files count.",
      });
    }

    // Find profile to get userId
    const profile = await prisma.employeeProfile.findFirst({
      where: { id: profileId, tenantId },
      select: { userId: true },
    });
    if (!profile)
      return res.status(404).json({ message: "Employee profile not found." });
    const { userId } = profile;

    try {
      const results: any[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const documentType = documentTypes[i];
        const ext = path.extname(file.originalname) || "";
        const safeType = documentType.replace(/\s+/g, "_"); // folder-friendly
        const supabasePath = `tenants/${tenantId}/${userId}/${safeType}/${uuidv4()}${ext}`;

        const { data, error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(supabasePath, file.buffer, {
            contentType: file.mimetype,
            upsert: true, // overwrite if same path (unlikely with uuid)
          });

        if (uploadError) {
          // Optionally: collect per-file errors and continue
          throw new Error(
            `Supabase upload failed for ${file.originalname}: ${uploadError.message}`
          );
        }

        const fileName = file.originalname;
        const storagePath = data.path;

        // ---------- Choose ONE behavior below ----------

        // (A) SINGLE FILE PER TYPE (upsert by (userId, documentType, tenantId))
        // Ensures only one "PAN Card" per user; replaces old file.
        const existing = await prisma.documentUpload.findFirst({
          where: { userId, tenantId, documentType },
          select: { id: true, storagePath: true },
        });

        let row;
        if (existing) {
          // Optional: delete old file from bucket to avoid orphaned storage
          // await supabase.storage.from(BUCKET_NAME).remove([existing.storagePath]);

          row = await prisma.documentUpload.update({
            where: { id: existing.id },
            data: {
              fileName,
              storagePath,
              uploadedAt: new Date(),
            },
          });
        } else {
          row = await prisma.documentUpload.create({
            data: {
              userId,
              tenantId,
              documentType,
              fileName,
              storagePath,
              uploadedAt: new Date(),
            },
          });
        }

        // (B) MULTIPLE FILES PER TYPE (uncomment to allow many of same type)
        // const row = await prisma.documentUpload.create({
        //   data: {
        //     userId,
        //     tenantId,
        //     documentType,
        //     fileName,
        //     storagePath,
        //     uploadedAt: new Date(),
        //   },
        // });

        results.push({ documentType, fileName, storagePath, id: row.id });
      }

      return res.status(201).json({
        message: "Documents saved successfully.",
        count: results.length,
        documents: results,
      });
    } catch (err: any) {
      console.error("Failed to save document details:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

/**
 * --- UPDATED WITH UPSERT on UserID ---
 * POST /api/employees/:profileId/offer
 * Protected Route: Only ADMINs can access this.
 * Upserts the Offer Letter details (Step 3) for an Employee.
 */
// router.post("/:profileId/offer", protect, async (req, res) => {
//   const { tenantId, role } = req.user!;
//   const { profileId } = req.params;
//   const {
//     annualCTC,
//     roleTitle,
//     basic,
//     hra,
//     da,
//     specialAllowance,
//     grossSalary, // Matched to schema
//     pfDeduction, // Matched to schema
//     tax, // Matched to schema
//     netSalary, // Matched to schema
//   } = req.body;

//   if (role !== Role.ADMIN) {
//     return res
//       .status(403)
//       .json({ message: "Forbidden: Only admins can add offer details." });
//   }

//   // --- Logic to match new schema ---
//   const profile = await prisma.employeeProfile.findFirst({
//     where: { id: profileId, tenantId },
//     select: {
//       userId: true,
//       firstName: true,
//       lastName: true,
//       personalEmail: true,
//       accessRole: true,

//       user: {
//         select: {
//           email: true,
//         },
//       },
//       tenant: {
//         select: {
//           tenantCode: true, // 🔥 THIS IS WHAT WE NEED
//         },
//       },
//     },
//   });
//   if (!profile) {
//     return res.status(404).json({ message: "Employee profile not found." });
//   }
//   const { userId } = profile;

//   if (
//     !annualCTC ||
//     !roleTitle ||
//     !basic ||
//     !hra ||
//     !grossSalary ||
//     !pfDeduction ||
//     !tax ||
//     !netSalary
//   ) {
//     return res.status(400).json({ message: "Missing required offer fields." });
//   }

//   try {
//     const offerData = {
//       annualCTC: parseFloat(annualCTC),
//       roleTitle,
//       basic: parseFloat(basic),
//       hra: parseFloat(hra),
//       da: da ? parseFloat(da) : 0,
//       specialAllowance: specialAllowance ? parseFloat(specialAllowance) : 0,
//       grossSalary: parseFloat(grossSalary),
//       pfDeduction: parseFloat(pfDeduction),
//       tax: parseFloat(tax),
//       netSalary: parseFloat(netSalary),
//       userId: userId, // Linked to User
//       tenantId: tenantId, // Linked to Tenant
//     };

//     // Upsert works because `userId` is @unique on the Offer model
//     const upsertedOffer = await prisma.offer.upsert({
//       where: {
//         userId: userId,
//       },
//       update: offerData,
//       create: offerData,
//     });

//     // call the keyclock to create the employee

//     // const keycloakUserId = await createKeycloakUser({
//     //   email: profile.personalEmail || "",
//     //   firstName: profile.firstName,
//     //   lastName: profile.lastName,
//     //   designation: profile.designation,
//     //   tenantId: tenantId,
//     // });

//     // await prisma.externalIdentity.upsert({
//     //   where: {
//     //     email: profile.personalEmail || "",
//     //   },
//     //   update: {
//     //     provider: "keycloak",
//     //     subject: keycloakUserId.keycloakUserId,
//     //     tenantId: tenantId,
//     //     email: profile.personalEmail || "",
//     //   },
//     //   create: {
//     //     userId: userId,
//     //     provider: "keycloak",
//     //     subject: keycloakUserId.keycloakUserId,
//     //     tenantId: tenantId,
//     //     email: profile.personalEmail || "",
//     //   },
//     // });

//     res.status(201).json({
//       message: "Offer details saved successfully.",
//       offer: upsertedOffer,
//     });
//   } catch (error) {
//     console.error("Failed to save offer details:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

router.post("/:profileId/offer", protect, async (req, res) => {
  const { tenantId, role } = req.user!;
  const { profileId } = req.params;

  if (role !== Role.ADMIN) {
    return res
      .status(403)
      .json({ message: "Forbidden: Only admins can add offer details." });
  }

  // 1️⃣ Fetch profile + tenantCode + accessRole
  const profile: any = await prisma.employeeProfile.findFirst({
    where: { id: profileId, tenantId },
    select: {
      userId: true,
      firstName: true,
      lastName: true,
      personalEmail: true,
      accessRole: true,
      user: {
        select: { email: true },
      },
      tenant: {
        select: { tenantCode: true },
      },
    },
  });

  if (!profile) {
    return res.status(404).json({ message: "Employee profile not found." });
  }

  const userEmail: any = profile.personalEmail || profile.user.email;

  // 2️⃣ Save / upsert offer
  const offerData: any = {
    annualCTC: Number(req.body.annualCTC),
    roleTitle: req.body.roleTitle,
    basic: Number(req.body.basic),
    hra: Number(req.body.hra),
    da: Number(req.body.da || 0),
    specialAllowance: Number(req.body.specialAllowance || 0),
    grossSalary: Number(req.body.grossSalary),
    pfDeduction: Number(req.body.pfDeduction),
    tax: Number(req.body.tax),
    netSalary: Number(req.body.netSalary),
    userId: profile.userId,
    tenantId,
  };

  const upsertedOffer = await prisma.offer.upsert({
    where: { userId: profile.userId },
    update: offerData,
    create: offerData,
  });

  // 3️⃣ Check if Keycloak identity already exists
  const existingIdentity: any = await prisma.externalIdentity.findFirst({
    where: {
      userId: profile.userId,
      provider: "keycloak",
    },
  });

  if (!existingIdentity) {
    // 4️⃣ Create Keycloak user
    const kcUser: any = await createKeycloakUser(tenantId, {
      email: userEmail,
      firstName: profile.firstName,
      lastName: profile.lastName,
    });

    // 5️⃣ Assign roles (BUSINESS + TENANT)
    await assignRealmRole(
      tenantId,
      kcUser.id,
      profile.accessRole,
    );

    // 6️⃣ Persist mapping
    await prisma.externalIdentity.create({
      data: {
        provider: "keycloak",
        subject: kcUser.id,
        email: userEmail,
        tenantId,
        userId: profile.userId,
      },
    });
  }

  return res.status(201).json({
    message: "Offer saved & employee provisioned successfully.",
    offer: upsertedOffer,
  });
});


/**
 * --- UPDATED WITH MANUAL UPSERT ---
 * POST /api/employees/:profileId/asset
 * Protected Route: Only ADMINs can access this.
 * Upserts a single asset assignment (Step 4) for an Employee.
 * This route should be called for each asset (e.g., "Laptop", "ESI").
 */
router.post("/:profileId/asset", protect, async (req, res) => {
  const { tenantId, role } = req.user!;
  const { profileId } = req.params;
  const {
    assetType, // e.g., "Laptop", "ESI", "PF"
    brand,
    model,
    serialNumber,
    esiNumber,
    pfNumber,
    insuranceNumber,
    companyEmail,
    idNumber,
    simNumber,
  } = req.body;

  if (role !== Role.ADMIN) {
    return res
      .status(403)
      .json({ message: "Forbidden: Only admins can assign assets." });
  }

  if (!assetType) {
    return res
      .status(400)
      .json({ message: "Missing required field: assetType." });
  }

  // --- Logic to match new schema ---
  const profile = await prisma.employeeProfile.findFirst({
    where: { id: profileId, tenantId: tenantId },
  });
  if (!profile) {
    return res.status(404).json({ message: "Employee profile not found." });
  }
  const { userId } = profile;

  try {
    // Manual Upsert based on assetType and userId
    const existingAsset = await prisma.assignedAsset.findFirst({
      where: {
        userId: userId,
        assetType: assetType,
        tenantId: tenantId,
      },
    });

    const assetData = {
      assetType,
      brand,
      model,
      serialNumber,
      esiNumber,
      pfNumber,
      insuranceNumber,
      companyEmail,
      idNumber,
      simNumber,
      userId: userId,
      tenantId: tenantId,
    };

    if (existingAsset) {
      // Update
      const updatedAsset = await prisma.assignedAsset.update({
        where: { id: existingAsset.id },
        data: assetData,
      });
      res
        .status(200)
        .json({ message: "Asset updated successfully.", asset: updatedAsset });
    } else {
      // Create
      const newAsset = await prisma.assignedAsset.create({
        data: assetData,
      });
      res
        .status(201)
        .json({ message: "Asset assigned successfully.", asset: newAsset });
    }
  } catch (error: any) {
    if (error.code === "P2002") {
      // Handle unique constraint fail (e.g., serialNumber)
      return res.status(409).json({
        message: "Conflict: This asset (or serial number) is already assigned.",
      });
    }
    console.error("Failed to assign asset:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * --- ROUTE DELETED ---
 * POST /api/employees/:profileId/orientation
 * This route has been removed because the `OrientationChecklist` model
 * does not exist in the provided schema.prisma file.
 */

/**
 * --- COMPLETELY REBUILT ---
 * GET /api/employees
 * This is a protected route.
 * Fetches all data based on the new schema.
 */
router.get("/GetEmployeeDetails", protect, async (req, res) => {
  const { tenantId, role, userId } = req.user!;

  try {
    // --- AUTHORIZATION LOGIC ---
    if (role !== Role.ADMIN) {
      // An EMPLOYEE can only see their own profile.
      // We must fetch all their data in pieces and combine it.

      // 1. Get Profile (and user info)
      const myProfile = await prisma.employeeProfile.findFirst({
        where: { userId: userId, tenantId: tenantId, isActive: true },
        include: { user: { select: { name: true, email: true, role: true } } },
      });

      if (!myProfile) {
        return res.status(404).json({ message: "Your profile was not found." });
      }

      // 2. Get related data
      const [myDocs, myOffer, myAssets] = await Promise.all([
        prisma.documentUpload.findMany({
          where: { userId: userId, tenantId: tenantId },
        }),
        prisma.offer.findUnique({ where: { userId: userId } }), // userId is unique
        prisma.assignedAsset.findMany({
          where: { userId: userId, tenantId: tenantId },
        }),
      ]);

      // Security check for Offer (since query only used userId)
      if (myOffer && myOffer.tenantId !== tenantId) {
        return res
          .status(403)
          .json({ message: "Error fetching related offer data." });
      }

      // 3. Combine and return
      const combinedProfile = {
        ...myProfile,
        documents: myDocs,
        offerLetter: myOffer,
        assets: myAssets,
      };

      return res.json([combinedProfile]); // Return in an array for consistency
    }

    // --- ADMIN LOGIC ---
    // If we reach here, the user is an ADMIN.
    // 1. Get all profiles for the tenant
    const profiles = await prisma.employeeProfile.findMany({
      where: {
        tenantId: tenantId,
        isActive: true,
      },
      include: {
        user: {
          select: { name: true, email: true, role: true },
        },
      },
    });

    // 2. Get all related data for the tenant
    const [allDocs, allOffers, allAssets] = await Promise.all([
      prisma.documentUpload.findMany({ where: { tenantId: tenantId } }),
      prisma.offer.findMany({ where: { tenantId: tenantId } }),
      prisma.assignedAsset.findMany({ where: { tenantId: tenantId } }),
    ]);

    // 3. Map data together (this is faster than N+1 queries)
    const allDocsByUser = allDocs.reduce((acc, doc) => {
      (acc[doc.userId] = acc[doc.userId] || []).push(doc);
      return acc;
    }, {} as Record<string, any[]>);

    const allOffersByUser = allOffers.reduce((acc, offer) => {
      acc[offer.userId] = offer;
      return acc;
    }, {} as Record<string, any>);

    const allAssetsByUser = allAssets.reduce((acc, asset) => {
      (acc[asset.userId] = acc[asset.userId] || []).push(asset);
      return acc;
    }, {} as Record<string, any[]>);

    // 4. Combine and return
    const combinedEmployees = profiles.map((profile) => ({
      ...profile,
      documents: allDocsByUser[profile.userId] || [],
      offerLetter: allOffersByUser[profile.userId] || null,
      assets: allAssetsByUser[profile.userId] || [],
    }));

    res.json(combinedEmployees);
  } catch (error) {
    console.error("Failed to get employees:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// id card fetching

router.get("/id-card/:profileId", protect, async (req, res) => {
  const { profileId } = req.params;
  if (!profileId) {
    res.status(500).json({ message: "The profileId not found" });
  }
  try {
    const Profile_data = await prisma.employeeProfile.findUnique({
      where: {
        id: profileId,
      },
      select: {
        employeeId: true,
        firstName: true,
        lastName: true,
        designation: true,
        joiningDate: true,
        phone: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
      },
    });

    res.status(200).json({ Profile_data });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "The error in the id card fetching", error });
  }
});

// attendance

/**
 * @route   GET /api/admin/attendance/logs
 * @desc    Get all attendance logs (check-ins/check-outs) for the admin's tenant.
 * @access  Private (Admin only)
 */
// router.get("/logs", protect, async (req, res) => {
//   // 1. Check Authorization
//   const { tenantId, role } = req.user!;
//   if (role !== Role.ADMIN) {
//     return res
//       .status(403)
//       .json({ message: "Forbidden: Only admins can view company-wide logs." });
//   }

//   // 2. Get query params for filtering (optional)
//   const { dateFrom, dateTo, type } = req.query;

//   // TODO: Add robust date and type filtering logic here
//   // For now, we fetch all logs.

//   try {
//     // 3. Fetch daily summary records from the database
//     const dailyRecords = await prisma.attendanceRecord.findMany({
//       where: {
//         tenantId: tenantId,
//       },
//       include: {
//         // We need to get the employee's name and ID from their profile
//         user: {
//           select: {
//             employeeProfile: {
//               select: {
//                 firstName: true,
//                 lastName: true,
//                 employeeId: true, // The public-facing Employee ID
//               },
//             },
//           },
//         },
//       },
//       orderBy: {
//         date: "desc", // Show the most recent dates first
//       },
//       take: 100, // Limit to 100 daily records for now
//     });

//     // 4. Transform the daily records into individual log events
//     const formattedLogs: any[] = [];
//     for (const record of dailyRecords) {
//       const employeeId = record.user.employeeProfile?.employeeId || "N/A";
//       const employeeName = `${record.user.employeeProfile?.firstName || ""} ${
//         record.user.employeeProfile?.lastName || ""
//       }`.trim();

//       // Note: Your 'AttendanceRecord' model (designed for daily summaries)
//       // doesn't store logType, location, or verification status.
//       // We are hardcoding these values to match the frontend component's needs.
//       // You may want to update your schema to store this info.

//       // Create a "Check In" log event
//       if (record.checkIn) {
//         formattedLogs.push({
//           id: `${record.id}-checkin`,
//           employeeId: employeeId,
//           employeeName: employeeName,
//           timestamp: record.checkIn.toISOString(),
//           type: "GEO", // TODO: Hardcoded as 'GEO'
//           action: "CHECK_IN",
//           location: "Office", // TODO: Hardcoded
//           verified: true, // TODO: Hardcoded
//         });
//       }

//       // Create a "Check Out" log event
//       if (record.checkOut) {
//         formattedLogs.push({
//           id: `${record.id}-checkout`,
//           employeeId: employeeId,
//           employeeName: employeeName,
//           timestamp: record.checkOut.toISOString(),
//           type: "GEO", // TODO: Hardcoded as 'GEO'
//           action: "CHECK_OUT",
//           location: "Office", // TODO: Hardcoded
//           verified: true, // TODO: Hardcoded
//         });
//       }
//     }

//     // Sort the combined list of events by timestamp
//     formattedLogs.sort(
//       (a, b) =>
//         new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
//     );

//     // 5. Send the formatted logs
//     res.status(200).json(formattedLogs);
//   } catch (error) {
//     console.error("Failed to fetch attendance logs:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });


router.get("/logs", protect, async (req, res) => {
  // 1. Authorization
  const { tenantId, role } = req.user!;
  if (role !== Role.ADMIN) {
    return res
      .status(403)
      .json({ message: "Forbidden: Only admins can view company-wide logs." });
  }

  // 2. Query params (can extend with dateFrom/dateTo/type later)
  // const { dateFrom, dateTo, type } = req.query;

  try {
    // 3. Fetch attendance records WITH status and user profile
    const dailyRecords = await prisma.attendanceRecord.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            employeeProfile: {
              select: {
                firstName: true,
                lastName: true,
                employeeId: true,
              },
            },
          },
        },
      },
      orderBy: { date: "desc" },
      take: 100,
    });

    // 4. Format into events but attach the authoritative daily status
    const formattedLogs: any[] = [];
    for (const record of dailyRecords) {
      const employeeId =
        record.user?.employeeProfile?.employeeId ?? "N/A";
      const employeeName = `${record.user?.employeeProfile?.firstName ?? ""} ${record.user?.employeeProfile?.lastName ?? ""
        }`.trim();

      // dailyStatus: the DB field that should be trusted by frontend
      const dailyStatus = record.status ?? "UNKNOWN";

      // Create a "Check In" event (if exists)
      if (record.checkIn) {
        formattedLogs.push({
          id: `${record.id}-checkin`,
          attendanceId: record.id,
          userId: record.user?.id ?? null,
          employeeId,
          employeeName,
          timestamp: record.checkIn.toISOString(),
          action: "CHECK_IN",
          type: "GEO", // keep for frontend, consider storing actual type in schema later
          location: "Office",
          verified: true,
          hoursWorked: record.hoursWorked ?? null,
          dailyStatus, // <-- important: authoritative status for the day
        });
      }

      // Create a "Check Out" event (if exists)
      if (record.checkOut) {
        formattedLogs.push({
          id: `${record.id}-checkout`,
          attendanceId: record.id,
          userId: record.user?.id ?? null,
          employeeId,
          employeeName,
          timestamp: record.checkOut.toISOString(),
          action: "CHECK_OUT",
          type: "GEO",
          location: "Office",
          verified: true,
          hoursWorked: record.hoursWorked ?? null,
          dailyStatus,
        });
      }

      // Also push a summary event for the day (so UI can show final state at glance)
      formattedLogs.push({
        id: `${record.id}-summary`,
        attendanceId: record.id,
        userId: record.user?.id ?? null,
        employeeId,
        employeeName,
        timestamp: (record.checkOut ?? record.checkIn ?? record.date).toISOString(),
        action: "DAILY_SUMMARY",
        type: "SYSTEM",
        location: null,
        verified: true,
        hoursWorked: record.hoursWorked ?? null,
        dailyStatus,
      });
    }

    // 5. Sort events by timestamp desc
    formattedLogs.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // 6. Response
    res.status(200).json(formattedLogs);
  } catch (error) {
    console.error("Failed to fetch attendance logs:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


// leave management

/**
 * @route   GET /api/leave/me
 * @desc    Get all leave balances and request history for the logged-in employee.
 * @access  Private (Employee)
 */
router.get("/getLeave", protect, async (req, res) => {
  const { userId, tenantId, role } = req.user!;

  // This route is for employees

  // note: can only applied for employee

  // if (role !== Role.EMPLOYEE) {
  //   return res
  //     .status(403)
  //     .json({ message: "Forbidden: This route is for employees." });
  // }

  // Get the current year to fetch the correct balance
  const currentYear = new Date().getFullYear();

  try {
    // 1. Fetch all leave policies for the company
    const policies = await prisma.leavePolicy.findMany({
      where: { tenantId },
    });

    console.log("Policies found:", policies.length);

    // 2. Fetch the employee's current balances for those policies
    //    We use `findMany` in case a balance record hasn't been created yet
    const balances = await prisma.leaveBalance.findMany({
      where: {
        tenantId,
        userId,
        year: currentYear,
      },
      include: {
        policy: {
          select: { name: true }, // Include the policy name
        },
      },
    });

    // 3. (Important!) Create balance records if they don't exist
    //    This handles new employees or new leave policies.
    const balancesToReturn = await Promise.all(
      policies.map(async (policy) => {
        let balance = balances.find((b) => b.policyId === policy.id);

        // If no balance exists for this policy this year, create one
        if (!balance) {
          try {
            balance = await prisma.leaveBalance.create({
              data: {
                tenantId,
                userId,
                policyId: policy.id,
                year: currentYear,
                daysAllotted: policy.defaultDays, // Use default
                daysUsed: 0,
              },
              include: {
                policy: { select: { name: true } },
              },
            });
          } catch (e: any) {
            // This handles a rare race condition where two requests try to create it at once
            if (e.code === "P2002") {
              balance = (await prisma.leaveBalance.findUnique({
                where: {
                  tenantId_userId_policyId_year: {
                    tenantId,
                    userId,
                    policyId: policy.id,
                    year: currentYear,
                  },
                },
                include: {
                  policy: { select: { name: true } },
                },
              }))!;
            } else {
              throw e;
            }
          }
        }

        // Calculate remaining days
        return {
          policyId: balance.policyId,
          policyName: balance.policy.name,
          year: balance.year,
          daysAllotted: balance.daysAllotted,
          daysUsed: balance.daysUsed,
          daysRemaining: balance.daysAllotted - balance.daysUsed,
        };
      })
    );

    // 4. Fetch all leave requests for the employee
    const requests = await prisma.leaveRequest.findMany({
      where: {
        tenantId,
        userId,
      },
      include: {
        policy: {
          select: { name: true }, // Include policy name
        },
      },
      orderBy: {
        startDate: "desc", // Show most recent first
      },
    });

    // 5. Send the complete "dashboard" data
    res.status(200).json({
      balances: balancesToReturn,
      requests: requests,
    });
  } catch (error) {
    console.error("Failed to fetch employee leave dashboard:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ====================================================================
// EMPLOYEE: Apply for Leave
// ====================================================================
/**
 * @route   POST /api/leave/request
 * @desc    Submit a new leave request.
 * @access  Private (Employee)
 */
router.post("/ApplyLeave", protect, async (req, res) => {
  const { userId, tenantId, role } = req.user!;

  // if (role !== Role.EMPLOYEE) {
  //   return res
  //     .status(403)
  //     .json({ message: "Forbidden: This route is for employees." });
  // }

  const {
    policyId, // ID of the LeavePolicy (e.g., "Casual Leave")
    startDate, // "2025-01-20"
    endDate, // "2025-01-22"
    days, // 3
    reason,
  } = req.body;

  if (!policyId || !startDate || !endDate || !days || !reason) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  const currentYear = new Date(startDate).getFullYear();

  try {
    // 1. Get the employee's balance for this leave type
    const balance = await prisma.leaveBalance.findUnique({
      where: {
        tenantId_userId_policyId_year: {
          tenantId,
          userId,
          policyId,
          year: currentYear,
        },
      },
    });

    // 2. Check if they have enough days
    const remainingDays = balance ? balance.daysAllotted - balance.daysUsed : 0;
    if (!balance || remainingDays < days) {
      return res.status(400).json({
        message: "Insufficient leave balance.",
        daysRemaining: remainingDays,
      });
    }

    // 3. Create the leave request
    const newRequest = await prisma.leaveRequest.create({
      data: {
        tenantId,
        userId,
        policyId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        days: parseFloat(days),
        reason,
        status: LeaveStatus.PENDING,
        appliedDate: new Date(),
      },
    });

    // 4. TODO: Send a notification to the HR Admin (e.g., email) new leave request
    // 5. TODO: Send a notification to the employee (e.g., email) applied
    // 6. TODO: Send a notification to the hr (e.g., email) new leave request

    res
      .status(201)
      .json({ message: "Leave request submitted.", request: newRequest });
  } catch (error) {
    console.error("Failed to submit leave request:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ====================================================================
// ADMIN: Get Payroll Data (Smart Route: Preview or Processed)
// ====================================================================
/**
 * @route   GET /api/payroll
 * @desc    Gets a calculated payroll preview OR a saved, processed payroll run.
 * @access  Private (Admin)
 * @query   ?month=1&year=2025 (Month is 1-indexed, e.g., 1=Jan, 12=Dec)
 */
router.get("/payrollData", protect, async (req, res) => {
  const { tenantId, role } = req.user!;

  if (role !== Role.ADMIN) {
    return res
      .status(403)
      .json({ message: "Forbidden: You do not have permission." });
  }

  // --- Get and Validate Month/Year ---
  // Default to the current month/year if none are provided
  const { month: monthStr, year: yearStr } = req.query;
  const currentMonth = new Date().getMonth() + 1; // 1-indexed (1-12)
  const currentYear = new Date().getFullYear();

  const month = monthStr ? parseInt(monthStr as string) : currentMonth;
  const year = yearStr ? parseInt(yearStr as string) : currentYear;

  if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
    return res.status(400).json({ message: "Invalid month or year provided." });
  }

  try {
    // --- 1. Check if payroll for this month has ALREADY been processed ---
    const processedRun = await prisma.payrollRun.findUnique({
      where: {
        // Use the @@unique index to find the run
        tenantId_month_year: {
          tenantId: tenantId!,
          month: month,
          year: year,
        },
      },
      include: {
        // Include the saved payslip items
        items: {
          include: {
            user: {
              select: {
                employeeProfile: {
                  where: { isActive: true },
                  select: {
                    employeeId: true,
                    firstName: true,
                    lastName: true,
                    designation: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // --- 2. If YES: Send the saved, historical data ---
    if (processedRun) {
      // Format the saved data to match the frontend component's needs
      const formattedItems = processedRun.items.map((item) => ({
        id: item.userId, // Use userId as the unique key for the list
        employeeId: item.user.employeeProfile?.employeeId || "N/A",
        name:
          `${item.user.employeeProfile?.firstName || ""} ${item.user.employeeProfile?.lastName || ""
            }`.trim() || "N/A",
        designation: item.user.employeeProfile?.designation || "N/A",
        basicSalary: item.basicSalary,
        hra: item.hra,
        allowances: item.allowances,
        grossSalary: item.grossSalary,
        // Combine all deductions for the table
        deductions: item.otherDeductions + item.lwpDeduction,
        netSalary: item.netSalary,
        lwpDays: item.lwpDays,
        lwpDeduction: item.lwpDeduction,
        selected: true, // All items in a processed run are included
      }));

      return res.status(200).json({
        isProcessed: true,
        runDetails: processedRun,
        employees: formattedItems,
      });
    }

    // --- 3. If NO: Calculate a new, live PREVIEW ---
    // This calls the helper function from `payroll.utils.ts`
    const previewData = await calculatePayrollPreview(tenantId!, month, year);

    // Format the preview data to match the frontend
    const formattedPreview = previewData.map((item) => ({
      id: item.userId, // Use userId as the key
      employeeId: item.employeeId,
      name: item.name,
      department: item.department,
      basicSalary: item.basicSalary,
      hra: item.hra,
      allowances: item.allowances,
      grossSalary: item.grossSalary,
      deductions: item.totalDeductions,
      netSalary: item.netSalary,
      lwpDays: item.lwpDays,
      lwpDeduction: item.lwpDeduction,
      selected: true, // Default all employees to selected for preview
    }));

    res.status(200).json({
      isProcessed: false,
      runDetails: null, // No run details because it's just a preview
      employees: formattedPreview,
    });
  } catch (error: any) {
    console.error("Failed to get payroll data:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
});

// ====================================================================
// ADMIN: Run (Confirm & Save) Payroll
// ====================================================================
/**
 * @route   POST /api/payroll/run
 * @desc    Calculates and saves the final payroll for a month.
 * @access  Private (Admin)
 * @body    { month: number, year: number, employeeIds: string[] }
 */
router.post("/run", protect, async (req, res) => {
  const { tenantId, role, userId: adminUserId } = req.user!;

  if (role !== Role.ADMIN) {
    return res
      .status(403)
      .json({ message: "Forbidden: You do not have permission." });
  }

  const { month, year, employeeIds } = req.body;

  if (
    !month ||
    !year ||
    !employeeIds ||
    !Array.isArray(employeeIds) ||
    employeeIds.length === 0
  ) {
    return res.status(400).json({
      message:
        "Invalid request: month, year, and employeeIds array are required.",
    });
  }

  try {
    // 1. Check if payroll for this month is already processed
    const existingRun = await prisma.payrollRun.findUnique({
      where: {
        tenantId_month_year: {
          tenantId: tenantId!,
          month: month,
          year: year,
        },
      },
    });

    if (existingRun) {
      return res.status(409).json({
        message: "Conflict: Payroll for this month has already been processed.",
      });
    }

    // 2. Re-calculate the payroll data (security/integrity check)
    const allCalculatedData = await calculatePayrollPreview(
      tenantId!,
      month,
      year
    );

    // 3. Filter for only the employees the admin selected in the UI
    const selectedEmployeeData = allCalculatedData.filter((e) =>
      employeeIds.includes(e.userId)
    );

    if (selectedEmployeeData.length === 0) {
      return res
        .status(400)
        .json({ message: "No valid employees selected for this payroll run." });
    }

    // 4. Calculate final totals for the summary
    const totalEmployees = selectedEmployeeData.length;
    const totalGross = selectedEmployeeData.reduce(
      (sum, e) => sum + e.grossSalary,
      0
    );
    const totalDeductions = selectedEmployeeData.reduce(
      (sum, e) => sum + e.totalDeductions,
      0
    );
    const totalNet = selectedEmployeeData.reduce(
      (sum, e) => sum + e.netSalary,
      0
    );

    // 5. Save everything in a single database transaction
    const newPayrollRun = await prisma.$transaction(async (tx) => {
      // a. Create the main PayrollRun summary
      const run = await tx.payrollRun.create({
        data: {
          tenantId: tenantId!,
          month,
          year,
          status: "PROCESSED",
          totalEmployees,
          totalGross: parseFloat(totalGross.toFixed(2)),
          totalDeductions: parseFloat(totalDeductions.toFixed(2)),
          totalNet: parseFloat(totalNet.toFixed(2)),
        },
      });

      // b. Create all the individual PayrollRunItem "payslips"
      await tx.payrollRunItem.createMany({
        data: selectedEmployeeData.map((item) => ({
          runId: run.id,
          tenantId: tenantId!,
          userId: item.userId,
          basicSalary: item.basicSalary,
          hra: item.hra,
          allowances: item.allowances,
          grossSalary: item.grossSalary,
          pfDeduction: item.pfDeduction,
          taxDeduction: item.taxDeduction,
          lwpDeduction: item.lwpDeduction,
          otherDeductions: item.otherDeductions,
          netSalary: item.netSalary,
          lwpDays: item.lwpDays,
        })),
      });

      // c. Log this action
      await tx.activityLog.create({
        data: {
          tenantId: tenantId!,
          action: "PAYROLL_PROCESSED",
          description: `Processed payroll for ${month}/${year} for ${totalEmployees} employees.`,
          performedById: adminUserId!,
        },
      });

      return run;
    });

    res.status(201).json({
      message: "Payroll processed and saved.",
      payrollRun: newPayrollRun,
    });
  } catch (error: any) {
    console.error("Failed to run payroll:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ====================================================================
// ADMIN: Export Processed Payroll as PDF
// ====================================================================
/**
 * @route   GET /api/payroll/run/:runId/export
 * @desc    Exports a saved payroll run as a PDF.
 * @access  Private (Admin)
 */
router.get("/run/:runId/export", protect, async (req, res) => {
  const { tenantId, role } = req.user!;
  const { runId } = req.params;

  if (role !== Role.ADMIN) {
    return res
      .status(403)
      .json({ message: "Forbidden: You do not have permission." });
  }

  try {
    // 1. Fetch the saved payroll run from the database
    const payrollRun = await prisma.payrollRun.findFirst({
      where: {
        id: runId,
        tenantId: tenantId!, // Security: Ensure it belongs to this admin's tenant
      },
      include: {
        // We need all the items to put in the table
        items: {
          include: {
            user: {
              select: {
                employeeProfile: {
                  select: {
                    employeeId: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        // We need the tenant name for the PDF header
        tenant: {
          select: { name: true },
        },
      },
    });

    // 2. Validate
    if (!payrollRun) {
      return res.status(404).json({
        message:
          "Processed payroll run not found or you do not have permission to access it.",
      });
    }

    // 3. Set HTTP headers for a PDF file download
    const filename = `Payroll-${payrollRun.year}-${payrollRun.month
      .toString()
      .padStart(2, "0")}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // 4. Call the PDF generation utility and stream the PDF to the response
    // This function is in `src/utils/pdf.utils.ts`
    generatePayrollPdf(payrollRun, res);
  } catch (error: any) {
    console.error("Failed to generate payroll PDF:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/profile/personal/:profileId", protect, async (req, res) => {
  try {
    const profileId = req.params.profileId;

    const {
      firstName,
      lastName,
      phone,
      personalEmail,
      emergencyContactName,
      emergencyContactPhone,
      dateOfBirth,
    } = req.body;

    const updated = await prisma.employeeProfile.update({
      where: { id: profileId },
      data: {
        firstName,
        lastName,
        phone,
        personalEmail,
        emergencyContactName,
        emergencyContactPhone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      },
      include: {
        user: true,
        tenant: true,
      },
    });

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "PROFILE_UPDATED",
        description: `Updated personal info for ${updated.firstName} ${updated.lastName}`,
        tenantId: updated.tenantId,
        performedById: req.user?.userId,
        targetUserId: updated.userId,
      },
    });

    res.json({ message: "Personal info updated", updated });
  } catch (err) {
    res.status(500).json({ message: "Update failed", error: err });
  }
});

router.put("/profile/employment/:profileId", protect, async (req, res) => {
  try {
    const profileId = req.params.profileId;

    const { designation, employeeType, joiningDate } = req.body;

    const updated = await prisma.employeeProfile.update({
      where: { id: profileId },
      data: {
        designation,
        employeeType,
        joiningDate: joiningDate ? new Date(joiningDate) : undefined,
      },
      include: {
        user: true,
        tenant: true,
      },
    });

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await prisma.activityLog.create({
      data: {
        action: "EMPLOYMENT_UPDATED",
        description: `Updated employment info for ${updated.firstName}`,
        tenantId: updated.tenantId,
        performedById: req.user?.userId,
        targetUserId: updated.userId,
      },
    });

    res.json({ message: "Employment info updated", updated });
  } catch (err) {
    res.status(500).json({ message: "Employment update failed", error: err });
  }
});

router.post(
  "/documents/:userId",
  protect,
  multerUpload.single("file"), // 🔑 REQUIRED
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { tenantId, role, userId: actorId } = req.user!;
      const { documentType } = req.body;
      const { id }: any = req.user?.userId;
      if (!req.file) {
        return res.status(400).json({ message: "File is required" });
      }

      if (!documentType) {
        return res.status(400).json({ message: "documentType is required" });
      }

      // ✅ Verify employee exists
      const employee = await prisma.employeeProfile.findFirst({
        where: { id: userId, tenantId },
      });

      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // 🔐 Build Supabase path (SAME as onboarding)
      const ext = path.extname(req.file.originalname) || "";
      const safeType = documentType.replace(/\s+/g, "_");

      const storagePath = `tenants/${tenantId}/${userId}/${safeType}/${uuidv4()}${ext}`;

      // ☁️ Upload to Supabase
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (error) {
        throw new Error(error.message);
      }

      const CurrentUserId = await prisma.employeeProfile.findFirst({
        where: {
          id: userId
        },
        select: {
          userId: true
        }
      })

      if (!CurrentUserId?.userId) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // 💾 Save metadata
      const uploaded = await prisma.documentUpload.create({
        data: {
          documentType,
          fileName: req.file.originalname,
          storagePath: data.path,
          userId: CurrentUserId.userId,
          tenantId,
        },
      });

      // 🧾 Activity log
      await prisma.activityLog.create({
        data: {
          action: "DOCUMENT_UPLOADED",
          description: `Uploaded ${documentType}`,
          tenantId,
          performedById: actorId,
          targetUserId: CurrentUserId.userId,
        },
      });

      return res.status(201).json(uploaded);
    } catch (err) {
      console.error("HR document upload failed:", err);
      return res.status(500).json({ message: "Upload failed" });
    }
  }
);


router.delete("/documents/:documentId", protect, async (req, res) => {
  try {
    const documentId = req.params.documentId;

    const doc = await prisma.documentUpload.delete({
      where: { id: documentId },
    });

    res.json({ message: "Document deleted", doc });
  } catch (err) {
    res.status(500).json({ message: "Delete failed", error: err });
  }
});

// ASSETS

router.post("/assets/:userId", protect, async (req, res) => {
  try {
    const userId = req.params.userId;

    const {
      assetType,
      brand,
      model,
      serialNumber,
      esiNumber,
      pfNumber,
      insuranceNumber,
      companyEmail,
      idNumber,
      simNumber,
    } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });

    const asset = await prisma.assignedAsset.create({
      data: {
        assetType,
        brand,
        model,
        serialNumber,
        esiNumber,
        pfNumber,
        insuranceNumber,
        companyEmail,
        idNumber,
        simNumber,
        userId,
        tenantId: user?.tenantId!,
      },
    });

    res.json({ message: "Asset added", asset });
  } catch (err) {
    res.status(500).json({ message: "Failed to add asset", error: err });
  }
});

router.put("/assets/:assetId", protect, async (req, res) => {
  try {
    const assetId = req.params.assetId;

    const updated = await prisma.assignedAsset.update({
      where: { id: assetId },
      data: req.body,
    });

    res.json({ message: "Asset updated", updated });
  } catch (err) {
    res.status(500).json({ message: "Update failed", error: err });
  }
});

router.delete("/assets/:assetId", protect, async (req, res) => {
  try {
    const assetId = req.params.assetId;

    const asset = await prisma.assignedAsset.delete({
      where: { id: assetId },
    });

    res.json({ message: "Asset removed", asset });
  } catch (err) {
    res.status(500).json({ message: "Delete failed", error: err });
  }
});

// COMPENSATION / OFFER
router.put("/offer/:userId", protect, async (req, res) => {
  try {
    const userId = req.params.userId;

    const {
      annualCTC,
      roleTitle,
      basic,
      hra,
      da,
      specialAllowance,
      grossSalary,
      pfDeduction,
      tax,
      netSalary,
      isSigned,
    } = req.body;

    const existing = await prisma.offer.findUnique({ where: { userId } });

    let updated;

    if (existing) {
      updated = await prisma.offer.update({
        where: { userId },
        data: {
          annualCTC,
          roleTitle,
          basic,
          hra,
          da,
          specialAllowance,
          grossSalary,
          pfDeduction,
          tax,
          netSalary,
          isSigned,
        },
      });
    } else {
      const user = await prisma.user.findUnique({ where: { id: userId } });

      updated = await prisma.offer.create({
        data: {
          userId,
          tenantId: user?.tenantId!,
          annualCTC,
          roleTitle,
          basic,
          hra,
          da,
          specialAllowance,
          grossSalary,
          pfDeduction,
          tax,
          netSalary,
          isSigned,
        },
      });
    }

    res.json({ message: "Offer updated", updated });
  } catch (err) {
    res.status(500).json({ message: "Offer update failed", error: err });
  }
});


// get the attendance details for export

const formatRows = (records: any[]) =>
  records.map((r) => ({
    employeeId: r.user.employeeProfile.employeeId,
    name: `${r.user.employeeProfile.firstName} ${r.user.employeeProfile.lastName}`,
    designation: r.user.employeeProfile.designation,
    date: r.date.toISOString().split("T")[0],
    checkIn: r.checkIn ? r.checkIn.toISOString().substring(11, 16) : "-",
    checkOut: r.checkOut ? r.checkOut.toISOString().substring(11, 16) : "-",
    hours: r.hoursWorked ?? "-",
    status: r.status,
  }));

router.get("/attendance/export", protect, async (req, res) => {
  const { tenantId, role } = req.user!;
  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const { fromDate, toDate, employeeId, designation, format } = req.query;

  if (!fromDate || !toDate || !format) {
    return res.status(400).json({ message: "Missing required filters" });
  }

  const records = await prisma.attendanceRecord.findMany({
    where: {
      tenantId,
      date: {
        gte: new Date(fromDate as string),
        lte: new Date(toDate as string),
      },
      ...(employeeId && {
        user: {
          employeeProfile: { employeeId: employeeId as string },
        },
      }),
      ...(designation && {
        user: {
          employeeProfile: { designation: designation as string },
        },
      }),
    },
    include: {
      user: {
        select: {
          employeeProfile: {
            select: {
              firstName: true,
              lastName: true,
              employeeId: true,
              designation: true,
            },
          },
        },
      },
    },
  });

  const rows = formatRows(records);

  if (format === "excel") return exportExcel(rows, res);
  if (format === "pdf") return exportPDF(rows, res);

  res.status(400).json({ message: "Invalid format" });
});


export default router;
