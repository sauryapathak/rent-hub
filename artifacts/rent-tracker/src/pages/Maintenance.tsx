import { Link } from "wouter";
import { useListMaintenanceRequests } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Wrench, Droplets, Zap, Hammer, PaintBucket, Bug, Sparkles, AlertCircle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

export default function Maintenance() {
  const { data: requests, isLoading } = useListMaintenanceRequests();

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'raised': return <Badge variant="destructive">Raised</Badge>;
      case 'acknowledged': return <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-100">Acknowledged</Badge>;
      case 'in_progress': return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">In Progress</Badge>;
      case 'resolved': return <Badge className="bg-emerald-500 hover:bg-emerald-600">Resolved</Badge>;
      case 'closed': return <Badge variant="outline">Closed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch(priority) {
      case 'urgent': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'high': return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'medium': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'low': return <AlertCircle className="h-4 w-4 text-blue-400" />;
      default: return null;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch(category) {
      case 'plumbing': return <Droplets className="h-5 w-5 text-blue-500" />;
      case 'electrical': return <Zap className="h-5 w-5 text-yellow-500" />;
      case 'carpentry': return <Hammer className="h-5 w-5 text-amber-700" />;
      case 'painting': return <PaintBucket className="h-5 w-5 text-purple-500" />;
      case 'pest_control': return <Bug className="h-5 w-5 text-green-600" />;
      case 'cleaning': return <Sparkles className="h-5 w-5 text-cyan-400" />;
      default: return <Wrench className="h-5 w-5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight">Maintenance</h1>
          <p className="text-muted-foreground mt-1">Track issues and repairs across properties.</p>
        </div>
        <Link href="/maintenance/new">
          <Button><Plus className="h-4 w-4 mr-2" /> Raise Request</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-24 animate-pulse bg-muted rounded-md" />)}
        </div>
      ) : requests?.length ? (
        <div className="grid grid-cols-1 gap-4">
          {requests.map(req => (
            <Card key={req.id} className="overflow-hidden border-l-4" style={{
              borderLeftColor: req.status === 'resolved' || req.status === 'closed' ? 'var(--color-status-success)' : 'var(--color-status-warning)'
            }}>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="bg-muted p-3 rounded-full mt-1">
                  {getCategoryIcon(req.category)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">{req.propertyName} - {req.unitNumber}</h3>
                      {getPriorityIcon(req.priority)}
                    </div>
                    {getStatusBadge(req.status)}
                  </div>
                  <p className="text-sm text-foreground">{req.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 pt-2 border-t">
                    <span>Tenant: {req.tenantName}</span>
                    <span>Created: {formatDate(req.createdAt)}</span>
                    {req.assignedVendorName && <span>Assigned to: {req.assignedVendorName}</span>}
                    {req.cost ? <span className="font-medium text-foreground">Cost: {formatCurrency(req.cost)}</span> : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-card text-card-foreground">
          <Wrench className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-lg font-medium">No maintenance requests</h3>
          <p className="text-muted-foreground mt-1 mb-4">All properties are in good condition.</p>
          <Link href="/maintenance/new">
            <Button>Raise Request</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
