import { apiClient } from "../../lib/apiClient";

export type PayrollRunDetails = {
  id: string;
  tenantId: string;
  month: number;
  year: number;
  status: "PROCESSED" | "DRAFT" | string;
  totalEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  createdAt: string;
  updatedAt: string;
};

export type PayrollEmployeeRow = {
  id: string;                // userId (key)
  employeeId: string;        // human-facing employee code
  name: string;
  designation?: string;
  department?: string;
  basicSalary: number;
  hra: number;
  allowances: number;
  grossSalary: number;
  deductions: number;
  netSalary: number;
  lwpDays?: number;
  lwpDeduction?: number;
  selected: boolean;
};

export type PayrollDataResponse = {
  isProcessed: boolean;
  runDetails: PayrollRunDetails | null;
  employees: PayrollEmployeeRow[];
};

export type PayslipDto = {
  id: string;                // PayrollRunItem id
  employeeId: string;
  employeeName: string;
  month: string;             // e.g., "January"
  year: number;
  basicSalary: number;
  hra: number;
  allowances: number;
  grossSalary: number;
  pf: number;
  tax: number;
  totalDeductions: number;
  netSalary: number;
  status: string;            // backend returns e.g. "PROCESSED"
};

export const payrollService = {
  async getPayrollData(params: { month: number; year: number }): Promise<PayrollDataResponse> {
    const { data } = await apiClient.get<PayrollDataResponse>("/employee/payrollData", {
      params,
    });
    return data;
  },

  async runPayroll(body: { month: number; year: number; employeeIds: string[] }) {
    const { data } = await apiClient.post("/employee/run", body);
    return data as {
      message: string;
      payrollRun: PayrollRunDetails;
    };
  },

  async exportRun(runId: string): Promise<Blob> {
    const resp = await apiClient.get(`/employee/run/${runId}/export`, {
      responseType: "blob",
    });
    return resp.data; // PDF blob
  },

  async list(params: { month: number; year: number }) {
    const { data } = await apiClient.get<PayslipDto[]>("/payroll/payslips", { params });
    return data;
  },

  async download(payslipId: string) {
    const resp = await apiClient.get(`/payroll/${payslipId}/download`, {
      responseType: "blob",
    });
    return resp.data as Blob;
  },

  async send(payslipId: string) {
    const { data } = await apiClient.post(`/payroll/${payslipId}/send`, {});
    return data as { message: string };
  },

  async sendAll(params: { month: number; year: number }) {
    const { data } = await apiClient.post(`/payroll/send-all`, params);
    return data as { message: string };
  },
};
