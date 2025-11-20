import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, Edit, Trash2 } from 'lucide-react';

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  weekends: string[];
  overtimeMultiplier: number;
  active: boolean;
}

export default function ShiftRules() {
  const [shifts, setShifts] = useState<Shift[]>([
    {
      id: '1',
      name: 'Morning Shift',
      startTime: '09:00',
      endTime: '18:00',
      breakDuration: 60,
      weekends: ['Saturday', 'Sunday'],
      overtimeMultiplier: 1.5,
      active: true,
    },
    {
      id: '2',
      name: 'Night Shift',
      startTime: '22:00',
      endTime: '06:00',
      breakDuration: 45,
      weekends: ['Saturday', 'Sunday'],
      overtimeMultiplier: 2.0,
      active: true,
    },
    {
      id: '3',
      name: 'Flexible Shift',
      startTime: '10:00',
      endTime: '19:00',
      breakDuration: 60,
      weekends: ['Saturday', 'Sunday'],
      overtimeMultiplier: 1.5,
      active: false,
    },
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Shift & Rules</h1>
          <p className="text-muted-foreground mt-1">Configure work shifts and attendance rules</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Shift
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Shift</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Shift Name</Label>
                  <Input placeholder="e.g., Morning Shift" />
                </div>
                <div>
                  <Label>Overtime Multiplier</Label>
                  <Input type="number" step="0.1" placeholder="1.5" />
                </div>
                <div>
                  <Label>Start Time</Label>
                  <Input type="time" />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input type="time" />
                </div>
                <div>
                  <Label>Break Duration (minutes)</Label>
                  <Input type="number" placeholder="60" />
                </div>
                <div className="flex items-center space-x-2 mt-8">
                  <Switch id="active" />
                  <Label htmlFor="active">Active</Label>
                </div>
              </div>
              <Button className="w-full">Create Shift</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-6">
          <Clock className="h-8 w-8 text-primary mb-2" />
          <h3 className="text-sm text-muted-foreground">Total Shifts</h3>
          <p className="text-3xl font-semibold mt-2">{shifts.length}</p>
        </Card>
        <Card className="p-6">
          <Clock className="h-8 w-8 text-green-600 mb-2" />
          <h3 className="text-sm text-muted-foreground">Active Shifts</h3>
          <p className="text-3xl font-semibold mt-2">{shifts.filter(s => s.active).length}</p>
        </Card>
        <Card className="p-6">
          <Clock className="h-8 w-8 text-orange-600 mb-2" />
          <h3 className="text-sm text-muted-foreground">Inactive Shifts</h3>
          <p className="text-3xl font-semibold mt-2">{shifts.filter(s => !s.active).length}</p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Configured Shifts</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shift Name</TableHead>
              <TableHead>Timing</TableHead>
              <TableHead>Break Duration</TableHead>
              <TableHead>Overtime</TableHead>
              <TableHead>Weekends</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shifts.map((shift) => (
              <TableRow key={shift.id}>
                <TableCell className="font-medium">{shift.name}</TableCell>
                <TableCell>{shift.startTime} - {shift.endTime}</TableCell>
                <TableCell>{shift.breakDuration} min</TableCell>
                <TableCell>{shift.overtimeMultiplier}x</TableCell>
                <TableCell>{shift.weekends.join(', ')}</TableCell>
                <TableCell>
                  <Badge variant={shift.active ? 'default' : 'secondary'}>
                    {shift.active ? 'Active' : 'Inactive'}
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

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Attendance Rules</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Auto Mark Half Day</h3>
              <p className="text-sm text-muted-foreground">If working hours less than 4 hours</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Late Coming Grace Period</h3>
              <p className="text-sm text-muted-foreground">15 minutes grace period</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Auto Calculate Overtime</h3>
              <p className="text-sm text-muted-foreground">After 8 hours of work</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Geo-Fencing Required</h3>
              <p className="text-sm text-muted-foreground">Must be within 500m of office</p>
            </div>
            <Switch />
          </div>
        </div>
      </Card>
    </div>
  );
}
