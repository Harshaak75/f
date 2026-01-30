import { Request, Response, NextFunction } from "express";
import prisma from "../prisma/client";
import { isDevAuth } from "../config/env";

// This is a new interface, separate from the user one
export interface TenantRequest extends Request {
  tenantId?: string;
}

/**
 * This middleware protects server-to-server API routes.
 * It checks for a valid Tenant API Key in the Authorization header.
 */
export const protectTenantApi = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {

  // DEV → tenant comes from JWT
  if (isDevAuth()) {
    if (!req.user?.tenantId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.tenantId = req.user.tenantId;
    return next();
  }

  let token: string | undefined;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  console.log("token:", token);

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no API key" });
  }

  try {
    // Check if the key exists in the database
    const apiKey = await prisma.tenant_api_table.findUnique({
      where: { apiKey: token },
      select: { tenantId: true },
    });

    if (!apiKey) {
      return res
        .status(401)
        .json({ message: "Not authorized, invalid API key" });
    }

    // Attach the tenantId to the request object
    req.tenantId = apiKey.tenantId;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized, invalid API key" });
  }
};
