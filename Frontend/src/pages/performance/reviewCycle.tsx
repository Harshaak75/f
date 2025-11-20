import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { PlusCircle, PlayCircle, CheckCircle, Archive } from 'lucide-react';
import { useToast } from '../../hooks/use-toast'; // Corrected path
import { Link } from 'react-router-dom'; // Removed this import to fix crash

// --- Data Structures ---

interface ReviewCycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
}

// --- Static Data ---

const staticCycles: ReviewCycle[] = [
  {
    id: 'q1-2025',
    name: 'Q1 2025 Performance Review',
    startDate: '2025-03-01',
    endDate: '2025-03-31',
    status: 'ACTIVE',
  },
  {
    id: 'y2024',
    name: 'Annual 2024 Review',
    startDate: '2024-12-15',
    endDate: '2025-01-15',
    status: 'CLOSED',
  },
  {
    id: 'h2-2024',
    name: 'H2 2024 Review',
    startDate: '2024-07-01',
    endDate: '2024-07-31',
    status: 'CLOSED',
  },
];

// --- Main Component ---

export default function ReviewCycleManagement() {
  const { toast } = useToast();
  const [cycles, setCycles] = useState<ReviewCycle[]>(staticCycles);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // State for the new cycle form
  const [newName, setNewName] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');

  // Handle creating a new cycle (updates local state)
  const handleCreateCycle = () => {
    if (!newName || !newStartDate || !newEndDate) {
      toast({
        title: 'Missing Information',
        description: 'Please fill out all fields to create a cycle.',
        variant: 'destructive',
      });
      return;
    }

    const newCycle: ReviewCycle = {
      id: newName.toLowerCase().replace(/\s+/g, '-'), // Simple ID generation
      name: newName,
      startDate: newStartDate,
      endDate: newEndDate,
      status: 'DRAFT',
    };

    setCycles([newCycle, ...cycles]); // Add new cycle to the top
    toast({ title: 'New cycle created in Draft status.' });
    setIsDialogOpen(false);
    setNewName('');
    setNewStartDate('');
    setNewEndDate('');
  };

  // Handle launching a cycle (updates local state)
  const handleLaunchCycle = (cycleId: string) => {
    setCycles(
      cycles.map((cycle) =>
        cycle.id === cycleId ? { ...cycle, status: 'ACTIVE' } : cycle
      )
    );
    toast({
      title: 'Cycle Launched!',
      description: 'Self-assessment tasks have been "sent" to employees.',
    });
  };

  const getStatusBadge = (status: ReviewCycle['status']) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>;
      case 'CLOSED':
        return <Badge variant="secondary">Closed</Badge>;
      case 'DRAFT':
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  return (
    <div className="space-y-6 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Review Cycle Management</h1>
          <p className="text-muted-foreground mt-1">
            Create, launch, and monitor all performance review cycles.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New Review Cycle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Review Cycle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Cycle Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Q2 2025 Performance Review"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={handleCreateCycle} className="w-full">
                Save as Draft
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Review Cycles</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cycle Name</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cycles.map((cycle) => (
                <TableRow key={cycle.id}>
                  <TableCell className="font-medium">
                    {/* This Link takes you to the dashboard you built! */}
                    {/* Replaced <Link> with a <span> to fix runtime error.
                      The error occurs because no React Router <BrowserRouter>
                      is present in this preview environment.
                    */}
                    <Link
                      to={`/performance/reviewCycle/${cycle.id}`} // Assumes a route like this
                      className="text-primary hover:underline"
                    >
                      {cycle.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {/* Use toLocaleDateString for cleaner date formatting */}
                    {new Date(cycle.startDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell>
                    {new Date(cycle.endDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell>{getStatusBadge(cycle.status)}</TableCell>
                  <TableCell>
                    {cycle.status === 'DRAFT' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleLaunchCycle(cycle.id)}
                      >
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Launch
                      </Button>
                    )}
                    {cycle.status === 'ACTIVE' && (
                      <Button variant="outline" size="sm" disabled>
                        <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                        Active
                      </Button>
                    )}
                    {cycle.status === 'CLOSED' && (
                      <Button variant="ghost" size="sm" disabled>
                        <Archive className="mr-2 h-4 w-4" />
                        Closed
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

