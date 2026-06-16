import { Link } from "wouter";
import { useListAgreements } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Calendar, IndianRupee } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

export default function Agreements() {
  const { data: agreements, isLoading } = useListAgreements();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'expired': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'terminated': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'draft': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight">Agreements</h1>
          <p className="text-muted-foreground mt-1">Manage rental contracts and expiries.</p>
        </div>
        <Link href="/agreements/new">
          <Button><Plus className="h-4 w-4 mr-2" /> New Agreement</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-32 animate-pulse bg-muted rounded-md" />)}
        </div>
      ) : agreements?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agreements.map(agreement => (
            <Card key={agreement.id} className="flex flex-col hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex flex-col h-full space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{agreement.tenantName}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{agreement.propertyName} - {agreement.unitNumber}</p>
                  </div>
                  <Badge variant="outline" className={getStatusColor(agreement.status)}>
                    {agreement.status.toUpperCase()}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm mt-2 border-t pt-4">
                  <div>
                    <p className="text-muted-foreground text-xs flex items-center gap-1 mb-1"><IndianRupee className="h-3 w-3" /> Rent</p>
                    <p className="font-medium">{formatCurrency(agreement.rentAmount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs flex items-center gap-1 mb-1"><IndianRupee className="h-3 w-3" /> Deposit</p>
                    <p className="font-medium">{formatCurrency(agreement.depositAmount)}</p>
                  </div>
                </div>

                <div className="mt-auto border-t pt-4">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(agreement.startDate)} - {formatDate(agreement.endDate)}</span>
                    </div>
                  </div>
                  {agreement.status === 'active' && agreement.daysToExpiry !== undefined && agreement.daysToExpiry !== null && (
                    <div className="mt-3">
                      {agreement.daysToExpiry < 30 ? (
                        <div className="text-xs font-medium text-destructive bg-destructive/10 py-1.5 px-3 rounded text-center">
                          Expiring in {agreement.daysToExpiry} days
                        </div>
                      ) : (
                        <div className="text-xs font-medium text-muted-foreground bg-muted py-1.5 px-3 rounded text-center">
                          {agreement.daysToExpiry} days left
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-card text-card-foreground">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-lg font-medium">No agreements</h3>
          <p className="text-muted-foreground mt-1 mb-4">Create your first rental agreement.</p>
          <Link href="/agreements/new">
            <Button>Create Agreement</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
