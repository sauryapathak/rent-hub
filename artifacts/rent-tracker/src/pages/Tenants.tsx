import { useState } from "react";
import { Link } from "wouter";
import { useListTenants, useCreateTenant, getListTenantsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Phone, Home, ShieldAlert, ShieldCheck } from "lucide-react";
import { TenantInput } from "@workspace/api-zod";

export default function Tenants() {
  const { data: tenants, isLoading } = useListTenants();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const createMutation = useCreateTenant({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTenantsQueryKey() });
        setOpen(false);
      }
    }
  });

  const [formData, setFormData] = useState<Partial<TenantInput>>({
    name: "",
    phone: "",
    email: "",
    aadhaarNumber: "",
    panNumber: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ data: formData as TenantInput });
  };

  const getKycBadge = (status?: string) => {
    switch(status) {
      case 'complete': return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">KYC Complete</Badge>;
      case 'partial': return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">KYC Partial</Badge>;
      default: return <Badge variant="secondary" className="text-muted-foreground">KYC Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight">Tenants</h1>
          <p className="text-muted-foreground mt-1">Manage tenant directory and KYC.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Tenant</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Tenant</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Full name" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <Input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="Phone number" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email (Optional)</label>
                <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="Email address" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Aadhaar (Optional)</label>
                  <Input value={formData.aadhaarNumber} onChange={e => setFormData({...formData, aadhaarNumber: e.target.value})} placeholder="12 digit number" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">PAN (Optional)</label>
                  <Input value={formData.panNumber} onChange={e => setFormData({...formData, panNumber: e.target.value})} placeholder="10 char code" />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Add Tenant"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <Card key={i} className="h-32 animate-pulse bg-muted" />)}
        </div>
      ) : tenants?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tenants.map(tenant => (
            <Card key={tenant.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <Link href={`/tenants/${tenant.id}`} className="block h-full cursor-pointer p-0">
                <CardContent className="p-4 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-lg">{tenant.name}</div>
                    {getKycBadge(tenant.kycStatus)}
                  </div>
                  
                  <div className="space-y-2 mt-auto text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3" /> {tenant.phone}
                    </div>
                    {tenant.unitNumber ? (
                      <div className="flex items-center gap-2">
                        <Home className="h-3 w-3" /> {tenant.propertyName} - {tenant.unitNumber}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-amber-600">
                        <Home className="h-3 w-3" /> Unassigned
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      {tenant.policeVerified ? (
                        <span className="text-emerald-600 flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Police Verified</span>
                      ) : (
                        <span className="text-amber-600 flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> Verification Pending</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-card text-card-foreground">
          <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-lg font-medium">No tenants found</h3>
          <p className="text-muted-foreground mt-1 mb-4">Start by adding your first tenant.</p>
          <Button onClick={() => setOpen(true)}>Add Tenant</Button>
        </div>
      )}
    </div>
  );
}
