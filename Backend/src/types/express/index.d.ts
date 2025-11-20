// This file augments the global Express 'Request' object
// to include a 'user' property.

// Make sure to set "typeRoots": ["./src/types"] in your tsconfig.json

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

// You need this empty export for the file to be treated as a module
export {};
