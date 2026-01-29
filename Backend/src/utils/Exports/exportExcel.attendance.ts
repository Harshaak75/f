import ExcelJS from "exceljs";

export async function exportExcel(rows: any[], res: any) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Attendance");

  sheet.columns = [
    { header: "Employee ID", key: "employeeId" },
    { header: "Name", key: "name" },
    { header: "Designation", key: "designation" },
    { header: "Date", key: "date" },
    { header: "Check In", key: "checkIn" },
    { header: "Check Out", key: "checkOut" },
    { header: "Hours", key: "hours" },
    { header: "Status", key: "status" },
  ];

  sheet.addRows(rows);

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=attendance.xlsx"
  );

  await workbook.xlsx.write(res);
  res.end();
}
