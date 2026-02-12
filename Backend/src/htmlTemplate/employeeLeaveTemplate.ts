export function employeeLeaveAppliedTemplate({
    employeeName,
    startDate,
    endDate,
    days,
    reason,
    companyName,
}: {
    employeeName: string;
    startDate: string;
    endDate: string;
    days: number;
    reason: string;
    companyName: string;
}) {
    return `
  <div style="font-family: Arial, sans-serif; background:#f6f7fb; padding:24px;">
    <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:8px; padding:24px;">
      
      <h2 style="color:#2d3748;">Leave Request Submitted</h2>

      <p>Hi <b>${employeeName}</b>,</p>

      <p>
        Your leave request has been successfully submitted and is currently
        <b style="color:#d69e2e;">Pending Approval</b>.
      </p>

      <table style="width:100%; margin-top:16px; border-collapse:collapse;">
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
        You will be notified once your request is reviewed by HR.
      </p>

      <p style="margin-top:32px;">
        Regards,<br/>
        <b>${companyName} HR Team</b>
      </p>

    </div>
  </div>
  `;
}
