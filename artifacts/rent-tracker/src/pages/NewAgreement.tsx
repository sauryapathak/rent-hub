import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useCreateAgreement, useListTenants, useListAllUnits, getListAgreementsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save } from "lucide-react";
import { AgreementInputType } from "@workspace/api-zod";
import { toast } from "sonner";

export default function NewAgreement() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: tenants } = useListTenants();
  const { data: units } = useListAllUnits();

  const createMutation = useCreateAgreement({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAgreementsQueryKey() });
        toast.success("Agreement created successfully");
        setLocation("/agreements");
      },
      onError: () => {
        toast.error("Failed to create agreement");
      }
    }
  });

  const [formData, setFormData] = useState({
    tenantId: "",
    unitId: "",
    type: "residential" as AgreementInputType,
    startDate: "",
    endDate: "",
    rentAmount: "",
    depositAmount: "",
    noticePeriodDays: "30",
    terms: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tenantId || !formData.unitId || !formData.startDate || !formData.endDate) {
      toast.error("Please fill all required fields");
      return;
    }

    createMutation.mutate({
      data: {
        tenantId: parseInt(formData.tenantId),
        unitId: parseInt(formData.unitId),
        type: formData.type,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        rentAmount: parseFloat(formData.rentAmount),
        depositAmount: parseFloat(formData.depositAmount),
        noticePeriodDays: parseInt(formData.noticePeriodDays),
        terms: formData.terms,
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
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/agreements">
          <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight">New Agreement</h1>
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Agreement Type</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value as AgreementInputType})}
              >
                <option value="residential">Residential</option>
                <option value="shop">Shop</option>
                <option value="pg">PG</option>
                <option value="room">Room</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date *</label>
                <Input type="date" required value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date *</label>
                <Input type="date" required value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Rent Amount (₹) *</label>
                <Input type="number" required min="0" value={formData.rentAmount} onChange={e => setFormData({...formData, rentAmount: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Deposit Amount (₹) *</label>
                <Input type="number" required min="0" value={formData.depositAmount} onChange={e => setFormData({...formData, depositAmount: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notice Period (Days)</label>
                <Input type="number" min="0" value={formData.noticePeriodDays} onChange={e => setFormData({...formData, noticePeriodDays: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Additional Terms</label>
              <Textarea 
                value={formData.terms} 
                onChange={e => setFormData({...formData, terms: e.target.value})} 
                placeholder="Any special conditions..."
                className="h-32"
              />
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving..." : <><Save className="h-4 w-4 mr-2" /> Save Agreement</>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
