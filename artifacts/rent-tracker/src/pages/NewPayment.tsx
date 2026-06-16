import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useCreatePayment, useListTenants, useListAllUnits, getListPaymentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save } from "lucide-react";
import { PaymentInputStatus, PaymentInputMode } from "@workspace/api-zod";
import { toast } from "sonner";

export default function NewPayment() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: tenants } = useListTenants();
  const { data: units } = useListAllUnits();

  const createMutation = useCreatePayment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
        toast.success("Payment logged successfully");
        setLocation("/payments");
      },
      onError: (err) => {
        toast.error("Failed to log payment");
      }
    }
  });

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState({
    tenantId: "",
    unitId: "",
    amount: "",
    month: currentMonth.toString(),
    year: currentYear.toString(),
    status: "paid" as PaymentInputStatus,
    mode: "upi" as PaymentInputMode,
    upiTransactionId: "",
    paidAt: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tenantId || !formData.unitId || !formData.amount) {
      toast.error("Please fill all required fields");
      return;
    }

    createMutation.mutate({
      data: {
        tenantId: parseInt(formData.tenantId),
        unitId: parseInt(formData.unitId),
        amount: parseFloat(formData.amount),
        month: parseInt(formData.month),
        year: parseInt(formData.year),
        status: formData.status,
        mode: formData.mode,
        upiTransactionId: formData.upiTransactionId || undefined,
        paidAt: new Date(formData.paidAt).toISOString(),
      }
    });
  };

  // When tenant is selected, try to auto-select their unit
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
        <Link href="/payments">
          <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight">Log Payment</h1>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount (₹) *</label>
                <Input type="number" required min="1" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Month *</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  required
                  value={formData.month}
                  onChange={(e) => setFormData({...formData, month: e.target.value})}
                >
                  {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Year *</label>
                <Input type="number" required value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Mode</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={formData.mode}
                  onChange={(e) => setFormData({...formData, mode: e.target.value as PaymentInputMode})}
                >
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as PaymentInputStatus})}
                >
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>

            {formData.mode === "upi" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">UPI Transaction ID</label>
                <Input value={formData.upiTransactionId} onChange={e => setFormData({...formData, upiTransactionId: e.target.value})} placeholder="Transaction reference number" />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Date Paid</label>
              <Input type="date" required value={formData.paidAt} onChange={e => setFormData({...formData, paidAt: e.target.value})} />
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving..." : <><Save className="h-4 w-4 mr-2" /> Save Payment</>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
