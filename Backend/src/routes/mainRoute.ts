import express from "express";
import prisma from "../prisma/client";
import { hashPassword, createJWT, comparePassword } from "../utils/auth.utils";
import { Role, SubStatus } from "@prisma/client";
import { protect } from "../middleware/auth.middleware";
const router = express.Router();

router.post("/register-tenant", async (req, res) => {
  const {
    // Tenant info
    tenantName,
    tenantEmail,
    tenantCode,
    // First Admin User info
    adminName,
    adminEmail,
    adminPassword,
    // Subscription info
    planName,
  } = req.body;

  // --- Basic Validation ---
  if (
    !tenantName ||
    !tenantEmail ||
    !tenantCode ||
    !adminName ||
    !adminEmail ||
    !adminPassword ||
    !planName
  ) {
    return res.status(400).json({
      message:
        "Missing required fields. Please provide all tenant, admin, and plan information.",
    });
  }

  try {
    // 1. Hash the admin's password
    const hashedPassword = await hashPassword(adminPassword);

    // 2. Set subscription end date (e.g., 30 days from now)
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setDate(subscriptionEndDate.getDate() + 30);

    // 3. Use a Prisma transaction to ensure all or nothing
    const result = await prisma.$transaction(async (tx) => {
      // Step A: Create the Tenant
      const newTenant = await tx.tenant.create({
        data: {
          name: tenantName,
          email: tenantEmail,
          tenantCode: tenantCode,
        },
      });

      // Step B: Create the first User (the ADMIN)
      // We manually set the role to 'ADMIN' here, overriding the schema default
      const newAdminUser = await tx.user.create({
        data: {
          name: adminName,
          email: adminEmail,
          password: hashedPassword,
          role: Role.ADMIN, // Explicitly set the first user as ADMIN
          tenantId: newTenant.id, // Link to the new tenant
        },
      });

      // Step C: Create their initial Subscription
      const newSubscription = await tx.subscription.create({
        data: {
          planName: planName,
          status: SubStatus.ACTIVE,
          startDate: new Date(),
          endDate: subscriptionEndDate,
          tenantId: newTenant.id, // Link to the new tenant
        },
      });

      return { newTenant, newAdminUser, newSubscription };
    });

    // 4. Create a JWT for the new admin user
    const token = createJWT({
      userId: result.newAdminUser.id,
      tenantId: result.newTenant.id,
      role: result.newAdminUser.role,
    });

    // 5. Success! Send back the new data and the token
    // This is in response to your question: "when i register what should we return?"
    // We return everything the frontend needs to initialize the session
    // without making a separate login call.
    res.status(201).json({
      message: "Tenant and admin user created successfully!",
      token,
      user: {
        id: result.newAdminUser.id,
        email: result.newAdminUser.email,
        name: result.newAdminUser.name,
        role: result.newAdminUser.role,
        tenantId: result.newTenant.id,
      },
      tenant: result.newTenant,
    });
  } catch (error: any) {
    // Handle potential errors, e.g., unique constraint violation (email/tenantCode)
    if (error.code === "P2002") {
      return res.status(409).json({
        message:
          "Conflict: A user with this email or a tenant with this code already exists.",
        details: error.meta?.target,
      });
    }
    console.error("Tenant registration failed:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    // 1. Find the user by their email
    const user = await prisma.user.findUnique({
      where: { email },
    });
    
    console.log(user)

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log("hi")

    // 2. Compare the provided password with the hashed password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 3. Create a JWT for the user
    const token = createJWT({
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
    });

    let isSSO = req.query.sso === "1";

    res.cookie('token', token, {
      httpOnly: true, // Javascript can't access this
      sameSite: isSSO ? "none" : "strict",
      secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
      path: '/', // Make it available site-wide
    });

    // 4. Success! Send back the token and user data
    // This is in response to your question: "when we login can you send the jwt token and userid and tenatid"
    // The token contains all three (userId, tenantId, role)
    // We also send back the 'user' object for the frontend to use.
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
    });
  } catch (error) {
    console.error("Login failed:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


router.get('/me', protect, async (req, res) => {
  const { userId } = req.user!;
  console.log("GET /me -> userId:", userId);
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ====================================================================
// NEW: Logout Route
// ====================================================================
/**
 * @route   POST /api/auth/logout
 * @desc    Clear the HttpOnly cookie
 * @access  Public
 */
router.post('/logout', (req, res) => {
  // Clear the cookie
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0), // Set to a past date
    path: '/',
  });
  
  res.status(200).json({ message: 'Logged out successfully' });
});




export default router;
