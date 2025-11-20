import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileText, Shield } from 'lucide-react';

interface StatutoryReport {
  id: string;
  name: string;
  description: string;
  frequency: string;
  lastGenerated: string;
  format: string;
}

export default function StatutoryReports() {
  const reports: StatutoryReport[] = [
    {
      id: '1',
      name: 'PF Challan (ECR)',
      description: 'Employee Provident Fund Contribution Report',
      frequency: 'Monthly',
      lastGenerated: '2025-01-05',
      format: 'TXT / Excel',
    },
    {
      id: '2',
      name: 'ESI Challan',
      description: 'Employee State Insurance Contribution Report',
      frequency: 'Monthly',
      lastGenerated: '2025-01-05',
      format: 'Excel',
    },
    {
      id: '3',
      name: 'Form 16',
      description: 'Annual Tax Deduction Certificate',
      frequency: 'Yearly',
      lastGenerated: '2024-06-15',
      format: 'PDF',
    },
    {
      id: '4',
      name: 'Form 24Q',
      description: 'Quarterly TDS Return Statement',
      frequency: 'Quarterly',
      lastGenerated: '2024-12-31',
      format: 'TXT',
    },
    {
      id: '5',
      name: 'PT Challan',
      description: 'Professional Tax Payment Report',
      frequency: 'Monthly',
      lastGenerated: '2025-01-05',
      format: 'Excel',
    },
    {
      id: '6',
      name: 'LWF Return',
      description: 'Labour Welfare Fund Contribution Report',
      frequency: 'Half-Yearly',
      lastGenerated: '2024-10-01',
      format: 'PDF',
    },
  ];

  const summaryCards = [
    { title: 'PF Contribution', amount: '₹2.4L', period: 'January 2025', color: 'text-blue-600' },
    { title: 'ESI Contribution', amount: '₹45K', period: 'January 2025', color: 'text-green-600' },
    { title: 'TDS Deducted', amount: '₹3.2L', period: 'Q3 FY2024-25', color: 'text-orange-600' },
    { title: 'PT Collected', amount: '₹18K', period: 'January 2025', color: 'text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Statutory Reports</h1>
          <p className="text-muted-foreground mt-1">Generate compliance and tax reports</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="january-2025">
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="january-2025">January 2025</SelectItem>
              <SelectItem value="december-2024">December 2024</SelectItem>
              <SelectItem value="november-2024">November 2024</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className="p-6">
            <Shield className="h-8 w-8 text-primary mb-2" />
            <h3 className="text-sm text-muted-foreground">{card.title}</h3>
            <p className={`text-3xl font-semibold mt-2 ${card.color}`}>{card.amount}</p>
            <p className="text-xs text-muted-foreground mt-1">{card.period}</p>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Available Reports</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Report Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Last Generated</TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((report) => (
              <TableRow key={report.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    {report.name}
                  </div>
                </TableCell>
                <TableCell>{report.description}</TableCell>
                <TableCell>{report.frequency}</TableCell>
                <TableCell>{report.lastGenerated}</TableCell>
                <TableCell>{report.format}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Generate
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Quick Links</h3>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start">
              <FileText className="mr-2 h-4 w-4" />
              EPF Portal
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <FileText className="mr-2 h-4 w-4" />
              ESIC Portal
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <FileText className="mr-2 h-4 w-4" />
              Income Tax e-Filing
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <FileText className="mr-2 h-4 w-4" />
              TRACES
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">Upcoming Deadlines</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <div>
                <p className="font-medium">PF Payment</p>
                <p className="text-sm text-muted-foreground">January 2025</p>
              </div>
              <span className="text-sm font-semibold text-orange-600">15 Jan</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <div>
                <p className="font-medium">ESI Payment</p>
                <p className="text-sm text-muted-foreground">January 2025</p>
              </div>
              <span className="text-sm font-semibold text-orange-600">21 Jan</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <div>
                <p className="font-medium">TDS Payment (Q3)</p>
                <p className="text-sm text-muted-foreground">Oct-Dec 2024</p>
              </div>
              <span className="text-sm font-semibold text-destructive">07 Jan (Overdue)</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
