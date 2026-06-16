import { useParams, Link } from "wouter";
import { useGetProperty, useListUnits, useCreateUnit, getGetPropertyQueryKey, getListUnitsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, MapPin, Building2, User, IndianRupee, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UnitInputType } from "@workspace/api-zod";

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const propertyId = parseInt(id, 10);
  
  const { data: property, isLoading: propertyLoading } = useGetProperty(propertyId, { 
    query: { enabled: !!propertyId, queryKey: getGetPropertyQueryKey(propertyId) } 
  });
  
  const { data: units, isLoading: unitsLoading } = useListUnits(propertyId, {
    query: { enabled: !!propertyId, queryKey: getListUnitsQueryKey(propertyId) }
  });

  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const createMutation = useCreateUnit({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUnitsQueryKey(propertyId) });
        queryClient.invalidateQueries({ queryKey: getGetPropertyQueryKey(propertyId) });
        setOpen(false);
      }
    }
  });

  const [formData, setFormData] = useState({
    unitNumber: "",
    floor: "",
    type: "flat" as UnitInputType,
    rentAmount: "",
    depositAmount: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ 
      id: propertyId,
      data: {
        ...formData,
        rentAmount: Number(formData.rentAmount),
        depositAmount: Number(formData.depositAmount),
      } as any 
    });
  };

  const getStatusColor = (status?: string | null) => {
    switch (status) {
      case 'paid': return 'bg-[var(--color-status-success)] text-[var(--color-status-success-foreground)]';
      case 'due': return 'bg-[var(--color-status-warning)] text-[var(--color-status-warning-foreground)]';
      case 'overdue': return 'bg-[var(--color-status-error)] text-[var(--color-status-error-foreground)]';
      case 'partial': return 'bg-[var(--color-status-info)] text-[var(--color-status-info-foreground)]';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/properties">
          <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          {propertyLoading ? (
            <div className="h-8 w-64 bg-muted animate-pulse rounded" />
          ) : (
            <>
              <h1 className="text-3xl font-bold font-serif tracking-tight">{property?.name}</h1>
              <p className="text-muted-foreground mt-1 flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {property?.address}, {property?.city}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center mt-8 border-b pb-4">
        <h2 className="text-xl font-bold">Units</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Add Unit</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Unit</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Unit Number</label>
                  <Input required value={formData.unitNumber} onChange={e => setFormData({...formData, unitNumber: e.target.value})} placeholder="e.g. 101" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Floor</label>
                  <Input value={formData.floor} onChange={e => setFormData({...formData, floor: e.target.value})} placeholder="e.g. 1st Floor" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={formData.type} 
                  onChange={e => setFormData({...formData, type: e.target.value as UnitInputType})}
                >
                  <option value="flat">Flat</option>
                  <option value="shop">Shop</option>
                  <option value="room">Room</option>
                  <option value="pg">PG</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rent Amount (₹)</label>
                  <Input type="number" required value={formData.rentAmount} onChange={e => setFormData({...formData, rentAmount: e.target.value})} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Deposit Amount (₹)</label>
                  <Input type="number" value={formData.depositAmount} onChange={e => setFormData({...formData, depositAmount: e.target.value})} placeholder="0" />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Add Unit"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {unitsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Card key={i} className="h-40 animate-pulse bg-muted" />)}
        </div>
      ) : units?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {units.map(unit => (
            <Card key={unit.id} className={`overflow-hidden border-l-4 ${
              unit.status === 'occupied' ? 'border-l-primary' : 'border-l-muted'
            }`}>
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg font-bold">{unit.unitNumber}</CardTitle>
                  {unit.status === 'occupied' && unit.paymentStatus && (
                    <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${getStatusColor(unit.paymentStatus)}`}>
                      {unit.paymentStatus}
                    </span>
                  )}
                  {unit.status === 'vacant' && (
                    <span className="text-xs font-bold px-2 py-1 rounded bg-muted text-muted-foreground uppercase">
                      Vacant
                    </span>
                  )}
                </div>
                <CardDescription>{unit.type.toUpperCase()}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1"><IndianRupee className="h-3 w-3" /> Rent</span>
                  <span className="font-medium">{formatCurrency(unit.rentAmount)}</span>
                </div>
                {unit.tenantName ? (
                  <div className="flex items-center gap-2 pt-2 border-t text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium truncate">{unit.tenantName}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pt-2 border-t text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    <span>No tenant assigned</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-card text-card-foreground">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-lg font-medium">No units found</h3>
          <p className="text-muted-foreground mt-1 mb-4">Add units to this property to start tracking.</p>
          <Button onClick={() => setOpen(true)}>Add First Unit</Button>
        </div>
      )}
    </div>
  );
}
