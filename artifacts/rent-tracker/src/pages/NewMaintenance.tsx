import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useCreateMaintenanceRequest, useListTenants, useListAllUnits, getListMaintenanceRequestsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save } from "lucide-react";
import { MaintenanceInputCategory, MaintenanceInputPriority } from "@workspace/api-zod";
import { toast } from "sonner";

export default function NewMaintenance() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: tenants } = useListTenants();
  const { data: units } = useListAllUnits();

  const createMutation = useCreateMaintenanceRequest({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMaintenanceRequestsQueryKey() });
        toast.success("Maintenance request created");
        setLocation("/maintenance");
      },
      onError: () => {
        toast.error("Failed to create request");
      }
    }
  });

  const [formData, setFormData] = useState({
    tenantId: "",
    unitId: "",
    category: "plumbing" as MaintenanceInputCategory,
    priority: "medium" as MaintenanceInputPriority,
    description: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tenantId || !formData.unitId || !formData.description) {
      toast.error("Please fill all required fields");
      return;
    }

    createMutation.mutate({
      data: {
        tenantId: parseInt(formData.tenantId),
        unitId: parseInt(formData.unitId),
        category: formData.category,
        priority: formData.priority,
        description: formData.description,
        notes: formData.notes || undefined,
      }
    });
  };

  const handleTenantChange = (tenantId: string) => {
    const tenant = tenants?.find(t => t.id.toString() === tenantId);
    setFormData(prev => ({
      ...prev,
      tenantId,
      unitId: tenant?.unitId?.toString() || prev.unitId
    }));
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/maintenance">
          <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight">Raise Request</h1>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tenant *</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  required
                  value={formData.tenantId}
                  onChange={(e) => handleTenantChange(e.target.value)}
                >
                  <option value="">Select Tenant</option>
                  {tenants?.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Unit *</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  required
                  value={formData.unitId}
                  onChange={(e) => setFormData({...formData, unitId: e.target.value})}
                >
                  <option value="">Select Unit</option>
                  {units?.map(u => (
                    <option key={u.id} value={u.id}>{u.propertyName} - {u.unitNumber}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value as MaintenanceInputCategory})}
                >
                  <option value="plumbing">Plumbing</option>
                  <option value="electrical">Electrical</option>
                  <option value="carpentry">Carpentry</option>
                  <option value="painting">Painting</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="pest_control">Pest Control</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value as MaintenanceInputPriority})}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Issue Description *</label>
              <Textarea 
                required
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
                placeholder="Describe the problem..."
                className="h-24"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Internal Notes</label>
              <Input value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Optional notes" />
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving..." : <><Save className="h-4 w-4 mr-2" /> Submit Request</>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
