import React, { useEffect, useState } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Skeleton } from "../../components/ui/skeleton";
import { Badge } from "../../components/ui/badge";
import { Plus, Edit, Trash2, FileText, Loader2 } from "lucide-react";
import { LeavePoliciesAPI } from "../../utils/api/leave.policies.api";
import { useToast } from "../../hooks/use-toast";

export default function LeavePolicies() {
  const { toast } = useToast();

  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // CREATE states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [name, setName] = useState("");
  const [defaultDays, setDefaultDays] = useState("");

  // EDIT states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editPolicy, setEditPolicy] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(false);

  // DELETE loading per policy
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

  // Load policies
  const loadPolicies = async () => {
    try {
      setLoading(true);
      const data = await LeavePoliciesAPI.getPolicies();
      setPolicies(data || []);
    } catch (err: any) {
      toast({
        title: "Failed to load policies",
        description: err?.response?.data?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  // CREATE POLICY
  const onCreate = async () => {
    if (!name || !defaultDays) {
      toast({ title: "Missing fields", variant: "destructive" });
      return;
    }

    try {
      setCreateLoading(true);

      await LeavePoliciesAPI.createPolicy({
        name,
        defaultDays: Number(defaultDays),
      });

      toast({ title: "Policy created successfully" });

      setIsDialogOpen(false);
      setName("");
      setDefaultDays("");
      loadPolicies();

    } catch (err: any) {
      toast({
        title: "Failed to create policy",
        description: err?.response?.data?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setCreateLoading(false);
    }
  };

  // OPEN EDIT MODAL
  const openEdit = (policy: any) => {
    setEditPolicy(policy);
    setEditDialogOpen(true);
  };

  // UPDATE POLICY
  const onUpdate = async () => {
    if (!editPolicy?.name || !editPolicy?.defaultDays) {
      toast({ title: "Missing fields", variant: "destructive" });
      return;
    }

    try {
      setEditLoading(true);

      await LeavePoliciesAPI.updatePolicy(editPolicy.id, {
        name: editPolicy.name,
        defaultDays: Number(editPolicy.defaultDays),
      });

      toast({ title: "Policy updated successfully" });
      setEditDialogOpen(false);

      loadPolicies();

    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err?.response?.data?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setEditLoading(false);
    }
  };

  // DELETE POLICY
  const onDelete = async (id: string) => {
    try {
      setDeleteLoadingId(id);
      await LeavePoliciesAPI.deletePolicy(id);

      toast({ title: "Policy deleted" });
      loadPolicies();

    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err?.response?.data?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setDeleteLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Leave Policies</h1>
          <p className="text-muted-foreground">Manage leave types</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Policy
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Leave Policy</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div>
                <Label>Policy Name</Label>
                <Input
                  placeholder="e.g., Sick Leave"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <Label>Default Days</Label>
                <Input
                  type="number"
                  placeholder="e.g., 10"
                  value={defaultDays}
                  onChange={(e) => setDefaultDays(e.target.value)}
                />
              </div>

              <Button
                disabled={createLoading}
                className="w-full"
                onClick={onCreate}
              >
                {createLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Create Policy"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ================== SKELETON LOADING ================== */}
      {loading ? (
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {policies.map((policy) => (
            <Card key={policy.id} className="p-6">
              <FileText className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold">{policy.name}</h3>
              <p className="text-2xl font-semibold mt-2">{policy.defaultDays}</p>
              <p className="text-xs text-muted-foreground">days per year</p>
            </Card>
          ))}
        </div>
      )}

      {/* ================== TABLE ================== */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Leave Policy Details</h2>

        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Default Days</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {policies.map((policy) => (
                <TableRow key={policy.id}>
                  <TableCell className="font-medium">{policy.name}</TableCell>
                  <TableCell>{policy.defaultDays} days</TableCell>

                  <TableCell>
                    <div className="flex gap-2">
                      
                      {/* EDIT BUTTON */}
                      <Button variant="ghost" size="sm" onClick={() => openEdit(policy)}>
                        <Edit className="h-4 w-4" />
                      </Button>

                      {/* DELETE BUTTON */}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deleteLoadingId === policy.id}
                        onClick={() => onDelete(policy.id)}
                      >
                        {deleteLoadingId === policy.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-destructive" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* ================== EDIT MODAL ================== */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Leave Policy</DialogTitle>
          </DialogHeader>

          {editPolicy && (
            <div className="space-y-4 mt-4">
              <div>
                <Label>Policy Name</Label>
                <Input
                  value={editPolicy.name}
                  onChange={(e) =>
                    setEditPolicy({ ...editPolicy, name: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>Default Days</Label>
                <Input
                  type="number"
                  value={editPolicy.defaultDays}
                  onChange={(e) =>
                    setEditPolicy({ ...editPolicy, defaultDays: e.target.value })
                  }
                />
              </div>

              <Button
                disabled={editLoading}
                className="w-full"
                onClick={onUpdate}
              >
                {editLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Update Policy"
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
