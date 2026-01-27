import { z } from "zod";

export const basicInfoSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  name: z.string().min(1, "Display name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be minimum 6 characters"),
  personalEmail: z.string().email().optional().or(z.literal("")),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Invalid Indian phone number"),
  altPhone: z.string()
    .regex(/^[6-9]\d{9}$/, "Invalid Indian phone number"),
  emergencyContactName: z.string(),
  emergencyContactPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Invalid phone")
    .or(z.literal("")),
  designation: z.string().min(1, "Designation is required"),
  employeeId: z.string().min(1, "Employee ID is required"),
  joiningDate: z.string().min(1, "Joining date is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  employeeType: z.enum(["full-time", "part-time", "contractor"]),
  accessRole: z.enum(["OPERATOR", "MANAGER", "PROJECT_MANAGER"]),
});

// export const documentsSchema = z.object({
//   aadhar: z.array(z.any()).min(1, "Please upload Aadhar"),
//   pan: z.array(z.any()).min(1, "Please upload PAN"),
//   bank: z.array(z.any()).min(1, "Please upload Bank proof"),
//   education: z.array(z.any()).min(1, "Please upload Education docs"),
// });

export const documentsSchema = z.object({
  aadhar: z.array(z.any()).optional(),
  pan: z.array(z.any()).optional(),
  bank: z.array(z.any()).optional(),
  education: z.array(z.any()).optional(),
});
export const offerSchema = z.object({
  roleTitle: z.string().min(1, "Role title is required"),
  annualCTC: z.string().min(1, "Annual CTC required"),
  basic: z.string().min(1),
  hra: z.string().min(1),
  da: z.string().optional(),
  specialAllowance: z.string().min(1),
  grossSalary: z.string().min(1),
  pfDeduction: z.string().min(1),
  tax: z.string().min(1),
  netSalary: z.string().min(1),
});

// export const assetsSchema = z.object({
//   laptopBrand: z.string().optional(),
//   laptopModel: z.string().optional(),
//   serialNumber: z.string().optional(),

//   esiNumber: z.string().min(1, "ESI number is required"),
//   pfNumber: z.string().min(1, "PF number is required"),
//   insuranceNumber: z.string().min(1, "Insurance number is required"),
//   companyEmail: z.string().email("Invalid company email"),
//   idNumber: z.string().min(1, "ID number is required"),
//   simNumber: z
//     .string()
//     .regex(/^[6-9]\d{9}$/, "Invalid Indian phone number")
//     .optional(),
// });

export const assetsSchema = z.object({
  laptopBrand: z.string().optional(),
  laptopModel: z.string().optional(),
  serialNumber: z.string().optional(),

  esiNumber: z
    .string()
    .optional()
    .refine((v) => !v || v.length >= 3, {
      message: "Invalid ESI number",
    }),

  pfNumber: z
    .string()
    .optional()
    .refine((v) => !v || v.length >= 3, {
      message: "Invalid PF number",
    }),

  insuranceNumber: z
    .string()
    .optional()
    .refine((v) => !v || v.length >= 3, {
      message: "Invalid insurance number",
    }),

  companyEmail: z
    .string()
    .optional()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: "Invalid company email",
    }),

  idNumber: z
    .string()
    .optional()
    .refine((v) => !v || v.length >= 3, {
      message: "Invalid ID number",
    }),

  simNumber: z
    .string()
    .optional()
    .refine((v) => !v || /^[6-9]\d{9}$/.test(v), {
      message: "Invalid SIM number",
    }),
});
