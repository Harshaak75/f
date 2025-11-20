import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, FileText } from 'lucide-react';

interface LeavePolicy {
  id: string;
  name: string;
  code: string;
  annualQuota: number;
  accrualType: 'Monthly' | 'Yearly' | 'Quarterly';
  carryForward: boolean;
  maxCarryForward?: number;
  encashable: boolean;
  active: boolean;
}

export default function LeavePolicies() {
  const [policies, setPolicies] = useState<LeavePolicy[]>([
    {
      id: '1',
      name: 'Casual Leave',
      code: 'CL',
      annualQuota: 12,
      accrualType: 'Monthly',
      carryForward: true,
      maxCarryForward: 3,
      encashable: false,
      active: true,
    },
    {
      id: '2',
      name: 'Sick Leave',
      code: 'SL',
      annualQuota: 10,
      accrualType: 'Monthly',
      carryForward: false,
      encashable: false,
      active: true,
    },
    {
      id: '3',
      name: 'Earned Leave',
      code: 'EL',
      annualQuota: 20,
      accrualType: 'Yearly',
      carryForward: true,
      maxCarryForward: 10,
      encashable: true,
      active: true,
    },
    {
      id: '4',
      name: 'Maternity Leave',
      code: 'ML',
      annualQuota: 180,
      accrualType: 'Yearly',
      carryForward: false,
      encashable: false,
      active: true,
    },
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Leave Policies</h1>
          <p className="text-muted-foreground mt-1">Manage leave types and accrual rules</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Policy
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Leave Policy</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Policy Name</Label>
                  <Input placeholder="e.g., Casual Leave" />
                </div>
                <div>
                  <Label>Policy Code</Label>
                  <Input placeholder="e.g., CL" />
                </div>
                <div>
                  <Label>Annual Quota</Label>
                  <Input type="number" placeholder="12" />
                </div>
                <div>
                  <Label>Accrual Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Carry Forward Allowed</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Max Carry Forward</Label>
                  <Input type="number" placeholder="3" />
                </div>
                <div>
                  <Label>Encashable</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full">Create Policy</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {policies.filter(p => p.active).map((policy) => (
          <Card key={policy.id} className="p-6">
            <FileText className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-semibold">{policy.name}</h3>
            <p className="text-2xl font-semibold mt-2">{policy.annualQuota}</p>
            <p className="text-xs text-muted-foreground">days per year</p>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Leave Policy Details</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Policy Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Annual Quota</TableHead>
              <TableHead>Accrual Type</TableHead>
              <TableHead>Carry Forward</TableHead>
              <TableHead>Encashable</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {policies.map((policy) => (
              <TableRow key={policy.id}>
                <TableCell className="font-medium">{policy.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{policy.code}</Badge>
                </TableCell>
                <TableCell>{policy.annualQuota} days</TableCell>
                <TableCell>{policy.accrualType}</TableCell>
                <TableCell>
                  {policy.carryForward ? (
                    <span className="text-green-600">Yes {policy.maxCarryForward && `(Max ${policy.maxCarryForward})`}</span>
                  ) : (
                    <span className="text-muted-foreground">No</span>
                  )}
                </TableCell>
                <TableCell>
                  {policy.encashable ? (
                    <span className="text-green-600">Yes</span>
                  ) : (
                    <span className="text-muted-foreground">No</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={policy.active ? 'default' : 'secondary'}>
                    {policy.active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
