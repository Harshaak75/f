// middleware/internalAuth.ts
import { Request, Response, NextFunction } from "express";

export function internalAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers["x-internal-api-key"];

  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return res.status(401).json({ error: "Unauthorized internal request" });
  }

  next();
}
