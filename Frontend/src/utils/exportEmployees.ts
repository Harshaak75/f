import * as XLSX from "xlsx";
import { CombinedEmployee } from "./api/Admin.employeeFunctionality";

export function exportEmployeesToExcel(
  employees: CombinedEmployee[],
  fileName = "employee-directory.xlsx"
) {
  const rows = employees.map((emp: any) => ({
    "Employee ID": emp.employeeId,
    "Name": `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim(),
    "Email": emp.user?.email ?? "",
    "Designation": emp.designation ?? "",
    "Employee Type": emp.employeeType ?? "",
    "Access Role": emp.accessRole ?? "",
    "Date of Birth": emp.dateOfBirth
      ? emp.dateOfBirth.split("T")[0]
      : "",
    "Joining Date": emp.joiningDate
      ? emp.joiningDate.split("T")[0]
      : "",
    "Has Documents": (emp.documents?.length ?? 0) > 0 ? "Yes" : "No",
    "Has Assets": (emp.assets?.length ?? 0) > 0 ? "Yes" : "No",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
  XLSX.writeFile(workbook, fileName);
}
