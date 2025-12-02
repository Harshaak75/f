import { apiClient } from "../../lib/apiClient";

export interface CreateOnboardingPayload {
  email: string;
  name: string;
  password: string;

  firstName: string;
  lastName: string;
  personalEmail?: string;
  phone: string;
  employeeId?: string;
  altPhone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  designation: string;
  joiningDate: string; // yyyy-mm-dd
  employeeType: string; // full-time | part-time | contractor
  dateOfBirth: string; // yyyy-mm-dd
}

export interface OnboardingEmployee {
  id: string; // user id
  profile: { id: string };
  tenantId: string;
  // plus other fields returned by your route
}

export type DocumentItem = {
  documentType: string; // e.g., "Aadhar Card"
  file: File;
};

export type OfferPayload = {
  annualCTC: string | number;
  roleTitle: string;
  basic: string | number;
  hra: string | number;
  da?: string | number;
  specialAllowance?: string | number;
  grossSalary: string | number;
  pfDeduction: string | number;
  tax: string | number;
  netSalary: string | number;
};

export type AssetPayload = {
  assetType: string; // e.g. "Laptop" | "ESI" | "PF" | "COMPANY_EMAIL" | "COMPANY_ID" | "SIM" | "INSURANCE"
  brand?: string;
  model?: string;
  serialNumber?: string;
  esiNumber?: string;
  pfNumber?: string;
  insuranceNumber?: string;
  companyEmail?: string;
  idNumber?: string;
  simNumber?: string;
};

// employee list

export type CombinedEmployee = {
  id: string; // profile id
  userId: string; // user id
  tenantId: string;
  employeeId: string | null;
  firstName: string;
  lastName: string;
  personalEmail: string | null;
  phone: string;
  altPhone: string | null;
  dateOfBirth: string; // ISO
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  designation: string;
  joiningDate: string; // ISO
  employeeType: string; // "full-time" | "part-time" | "contractor" | etc.

  user: {
    name: string;
    email: string;
    role: "ADMIN" | "EMPLOYEE";
  };

  // “joined” arrays/objects from your GET route
  documents: Array<{
    id: string;
    documentType: string;
    fileName: string;
    storagePath: string;
    uploadedAt: string;
    userId: string;
    tenantId: string;
  }>;

  offerLetter: {
    id: string;
    userId: string;
    tenantId: string;
    roleTitle: string;
    annualCTC: number;
    basic: number;
    hra: number;
    da: number;
    specialAllowance: number;
    grossSalary: number;
    pfDeduction: number;
    tax: number;
    netSalary: number;
    createdAt?: string;
    updatedAt?: string;
  } | null;

  assets: Array<{
    id: string;
    assetType: string; // "Laptop" | "ESI" | "PF" | "INSURANCE" | "COMPANY_EMAIL" | "COMPANY_ID" | "SIM"
    brand?: string | null;
    model?: string | null;
    serialNumber?: string | null;
    esiNumber?: string | null;
    pfNumber?: string | null;
    insuranceNumber?: string | null;
    companyEmail?: string | null;
    idNumber?: string | null;
    simNumber?: string | null;
    userId: string;
    tenantId: string;
  }>;
};

export type IdCardProfile = {
  employeeId: string | null;
  firstName: string;
  lastName: string;
  designation: string;
  joiningDate: string; // ISO
  phone: string;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
};

export type EmployeeCombined = {
  id: string; // profile id
  userId: string;
  tenantId: string;

  // profile fields
  employeeId: string | null;
  firstName: string;
  lastName: string;
  personalEmail: string | null;
  phone: string;
  altPhone?: string | null;
  dateOfBirth?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  designation: string;
  joiningDate: string; // ISO
  employeeType: string; // "full-time" | ...

  // joined user
  user: { name: string; email: string; role: string };

  // joins you build server-side
  documents: Array<{
    id: string;
    documentType: string;
    fileName: string;
    storagePath: string; // Supabase path (not necessarily public)
    uploadedAt: string;
    userId: string;
    tenantId: string;
  }>;

  offerLetter: null | {
    id: string;
    annualCTC: number;
    roleTitle: string;
    basic: number;
    hra: number;
    da: number | null;
    specialAllowance: number | null;
    grossSalary: number;
    pfDeduction: number;
    tax: number;
    netSalary: number;
    userId: string;
    tenantId: string;
    createdAt?: string;
    updatedAt?: string;
  };

  assets: Array<{
    id: string;
    assetType: string; // "Laptop" | "PF" | etc.
    brand?: string | null;
    model?: string | null;
    serialNumber?: string | null;
    esiNumber?: string | null;
    pfNumber?: string | null;
    insuranceNumber?: string | null;
    companyEmail?: string | null;
    idNumber?: string | null;
    simNumber?: string | null;
    userId: string;
    tenantId: string;
  }>;
};

export const employeeFunctionalityService = {
  createOnboarding: async (payload: CreateOnboardingPayload) => {
    const { data } = await apiClient.post(
      "/employee/create-onboarding",
      payload
    );
    return data.employee; // contains profile.id
  },

  saveDocumentMeta: async (profileId: string, docs: DocumentItem[]) => {
    const form = new FormData();
    form.append("profileId", profileId);

    // parallel arrays: documentType[] and files[]
    for (const d of docs) {
      form.append("documentType", d.documentType);
      form.append("files", d.file); // key name matches multer array field
    }

    const { data } = await apiClient.post("/employee/document", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data; // whatever your route returns
  },

  saveOffer: async (profileId: string, payload: OfferPayload) => {
    // Backend parses with parseFloat, so strings or numbers are fine.
    const { data } = await apiClient.post(
      `/employee/${profileId}/offer`,
      payload
    );
    return data; // { message, offer }
  },

  saveAsset: async (profileId: string, payload: AssetPayload) => {
    const { data } = await apiClient.post(
      `/employee/${profileId}/asset`,
      payload
    );
    return data; // { message, asset }
  },
};

export const EmployeeDirectoryList = {
  getAllEmployeeDetails: async () => {
    const { data } = await apiClient.get("/employee/GetEmployeeDetails");
    return data;
  },
  getIdCard: async (profileId: string): Promise<IdCardProfile> => {
    const { data } = await apiClient.get(`/employee/id-card/${profileId}`);
    // backend responds { Profile_data: {...} }
    return data.Profile_data;
  },

  getByProfileId: async (
    profileId: string
  ): Promise<EmployeeCombined | null> => {
    const list = await EmployeeDirectoryList.getAllEmployeeDetails();
    return list.find((p: any) => p.id === profileId) ?? null;
  },

  updatePersonal: async (profileId: string, payload: any) => {
    const { data } = await apiClient.put(
      `/employee/profile/personal/${profileId}`,
      payload
    );
    return data.updatedEmployee; // backend will return updated record
  },

  /** ------------------ NEW: Update EMPLOYMENT INFO ------------------ */
  updateEmployment: async (profileId: string, payload: any) => {
    const { data } = await apiClient.put(
      `/employee/profile/employment/${profileId}`,
      payload
    );
    return data.updatedEmployee;
  },

  updateOffer: async (userId: string, payload: any) => {
    const { data } = await apiClient.put(`/employee/offer/${userId}`, payload);
    return data.updated;
  },

  addDocument: async (userId: string, payload: any) => {
    const { data } = await apiClient.post(
      `/employee/documents/${userId}`,
      payload
    );
    return data.uploaded;
  },

  deleteDocument: async (documentId: string) => {
    const { data } = await apiClient.delete(
      `/employee/documents/${documentId}`
    );
    return data;
  },

  addAsset: async (userId: string, payload: any) => {
    const { data } = await apiClient.post(
      `/employee/assets/${userId}`,
      payload
    );
    return data.asset;
  },

  updateAsset: async (assetId: string, payload: any) => {
    const { data } = await apiClient.put(
      `/employee/assets/${assetId}`,
      payload
    );
    return data.updated;
  },

  deleteAsset: async (assetId: string) => {
    const { data } = await apiClient.delete(`/employee/assets/${assetId}`);
    return data;
  },
};
