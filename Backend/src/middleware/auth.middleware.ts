import { Request, Response, NextFunction } from "express";
import { verifyJWT, JwtPayload } from "../utils/auth.utils";
import { Role } from '@prisma/client';

declare global {
  namespace Express {
    export interface Request {
      user?: {
        userId: string;
        tenantId: string;
        role: Role;
      };
    }
  }
}

// export const protect = (req: Request, res: Response, next: NextFunction) => {
//   const bearer = req.headers.authorization;

//   if (!bearer || !bearer.startsWith("Bearer ")) {
//     return res.status(401).json({ message: "Unauthorized: No token provided" });
//   }

//   const [, token] = bearer.split(" ");

//   if (!token) {
//     return res
//       .status(500)
//       .json({ message: "Unauthorized: Invalid token format" });
//   }

//   try {
//     // Verify the token using the utility function
//     const payload = verifyJWT(token) as JwtPayload;

//     // Attach user payload to the request object
//     // This works because of the type definition in 'src/types/express/index.d.ts'
//     req.user = payload;

//     next(); // Move to the next middleware or route handler
//   } catch (error: any) {
//     console.error("Token verification failed:", error.message);
//     return res.status(401).json({ message: "Unauthorized: Invalid token" });
//   }
// };


export const protect = (req: Request, res: Response, next: NextFunction) => {
  // 1. Get the token from the cookie
  const token = req.cookies.token;
  console.log("protect middleware -> token:", token);

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  try {
    // 2. Verify the token
    const payload = verifyJWT(token) as JwtPayload;

    // 3. Attach user payload to the request object
    req.user = payload;
    
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};