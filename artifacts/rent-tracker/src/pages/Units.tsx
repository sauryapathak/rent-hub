import { useListAllUnits } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { DoorOpen, Building2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Units() {
  const { data: units, isLoading } = useListAllUnits();

  const getStatusColor = (status?: string | null) => {
    switch (status) {
      case 'paid': return 'bg-[var(--color-status-success)] text-[var(--color-status-success-foreground)] hover:bg-[var(--color-status-success)]';
      case 'due': return 'bg-[var(--color-status-warning)] text-[var(--color-status-warning-foreground)] hover:bg-[var(--color-status-warning)]';
      case 'overdue': return 'bg-[var(--color-status-error)] text-[var(--color-status-error-foreground)] hover:bg-[var(--color-status-error)]';
      case 'partial': return 'bg-[var(--color-status-info)] text-[var(--color-status-info-foreground)] hover:bg-[var(--color-status-info)]';
      default: return 'bg-muted text-muted-foreground hover:bg-muted';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-serif tracking-tight">Units</h1>
        <p className="text-muted-foreground mt-1">All units across your properties.</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => <div key={i} className="h-16 animate-pulse bg-muted rounded-md" />)}
        </div>
      ) : units?.length ? (
        <div className="border rounded-md bg-card">
          <div className="grid grid-cols-12 gap-4 p-4 border-b font-medium text-sm text-muted-foreground">
            <div className="col-span-3">Unit</div>
            <div className="col-span-3">Property</div>
            <div className="col-span-2">Rent</div>
            <div className="col-span-3">Tenant</div>
            <div className="col-span-1 text-right">Status</div>
          </div>
          <div className="divide-y">
            {units.map(unit => (
              <div key={unit.id} className="grid grid-cols-12 gap-4 p-4 items-center text-sm">
                <div className="col-span-3 font-bold flex items-center gap-2">
                  <DoorOpen className="h-4 w-4 text-muted-foreground" />
                  {unit.unitNumber}
                </div>
                <div className="col-span-3 flex items-center gap-2 truncate">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  {unit.propertyName}
                </div>
                <div className="col-span-2 font-medium">
                  {formatCurrency(unit.rentAmount)}
                </div>
                <div className="col-span-3 flex items-center gap-2 truncate">
                  {unit.tenantName ? (
                    <>
                      <User className="h-4 w-4 text-muted-foreground" />
                      {unit.tenantName}
                    </>
                  ) : (
                    <span className="text-muted-foreground italic">Vacant</span>
                  )}
                </div>
                <div className="col-span-1 text-right">
                  {unit.status === 'occupied' ? (
                    <Badge className={`${getStatusColor(unit.paymentStatus)} border-none shadow-none`}>
                      {unit.paymentStatus || 'unknown'}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="shadow-none">Vacant</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-card text-card-foreground">
          <DoorOpen className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-lg font-medium">No units found</h3>
          <p className="text-muted-foreground mt-1">Add units to your properties first.</p>
        </div>
      )}
    </div>
  );
}
