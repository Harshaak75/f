import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'your-very-strong-secret-key';
const SALT_ROUNDS = 10;

export const hashPassword = (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};


export const comparePassword = (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};


export interface JwtPayload {
  userId: string;
  tenantId: string;
  role: Role;
}


export const createJWT = (payload: JwtPayload): string => {
  // Token expires in 30 days
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
};


export const verifyJWT = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch (error: any) {
    console.error('Invalid token:', error.message);
    throw new Error('Invalid token');
  }
};  

