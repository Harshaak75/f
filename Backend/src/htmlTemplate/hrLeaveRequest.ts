export function hrLeaveRequestTemplate({
    employeeName,
    employeeEmail,
    startDate,
    endDate,
    days,
    reason,
    companyName,
}: {
    employeeName: string;
    employeeEmail: string;
    startDate: string;
    endDate: string;
    days: number;
    reason: string;
    companyName: string;
}) {
    return `
  <div style="font-family: Arial, sans-serif; background:#f6f7fb; padding:24px;">
    <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:8px; padding:24px;">
      
      <h2 style="color:#2d3748;">New Leave Request</h2>

      <p>
        A new leave request has been submitted and requires your review.
      </p>

      <table style="width:100%; margin-top:16px; border-collapse:collapse;">
        <tr>
          <td style="padding:8px; font-weight:bold;">Employee Name</td>
          <td style="padding:8px;">${employeeName}</td>
        </tr>
        <tr>
          <td style="padding:8px; font-weight:bold;">Employee Email</td>
          <td style="padding:8px;">${employeeEmail}</td>
        </tr>
        <tr>
          <td style="padding:8px; font-weight:bold;">Start Date</td>
          <td style="padding:8px;">${startDate}</td>
        </tr>
        <tr>
          <td style="padding:8px; font-weight:bold;">End Date</td>
          <td style="padding:8px;">${endDate}</td>
        </tr>
        <tr>
          <td style="padding:8px; font-weight:bold;">Total Days</td>
          <td style="padding:8px;">${days}</td>
        </tr>
        <tr>
          <td style="padding:8px; font-weight:bold;">Reason</td>
          <td style="padding:8px;">${reason}</td>
        </tr>
        <tr>
          <td style="padding:8px; font-weight:bold;">Status</td>
          <td style="padding:8px; color:#d69e2e;"><b>PENDING</b></td>
        </tr>
      </table>

      <p style="margin-top:20px;">
        Please review this request in the HR portal.
      </p>

      <p style="margin-top:32px;">
        Regards,<br/>
        <b>${companyName} System</b>
      </p>

    </div>
  </div>
  `;
}
