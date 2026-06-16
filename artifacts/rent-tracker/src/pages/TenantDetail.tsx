import { useParams, Link } from "wouter";
import { useGetTenant, useGetTenantPaymentHistory, getGetTenantQueryKey, getGetTenantPaymentHistoryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Phone, Mail, Home, ShieldCheck, ShieldAlert, CreditCard, Building2, Calendar, FileText } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

export default function TenantDetail() {
  const { id } = useParams<{ id: string }>();
  const tenantId = parseInt(id, 10);
  
  const { data: tenant, isLoading: tenantLoading } = useGetTenant(tenantId, { 
    query: { enabled: !!tenantId, queryKey: getGetTenantQueryKey(tenantId) } 
  });
  
  const { data: payments, isLoading: paymentsLoading } = useGetTenantPaymentHistory(tenantId, {
    query: { enabled: !!tenantId, queryKey: getGetTenantPaymentHistoryQueryKey(tenantId) }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-[var(--color-status-success)] text-[var(--color-status-success-foreground)]';
      case 'due': return 'bg-[var(--color-status-warning)] text-[var(--color-status-warning-foreground)]';
      case 'overdue': return 'bg-[var(--color-status-error)] text-[var(--color-status-error-foreground)]';
      case 'partial': return 'bg-[var(--color-status-info)] text-[var(--color-status-info-foreground)]';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (tenantLoading) return <div className="animate-pulse space-y-4"><div className="h-8 w-48 bg-muted rounded"></div><div className="h-64 bg-muted rounded"></div></div>;
  if (!tenant) return <div>Tenant not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/tenants">
          <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight">{tenant.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={tenant.kycStatus === 'complete' ? 'default' : 'secondary'}>
              KYC {tenant.kycStatus}
            </Badge>
            {tenant.policeVerified && <Badge variant="outline" className="text-emerald-600 border-emerald-600 bg-emerald-50"><ShieldCheck className="h-3 w-3 mr-1" /> Verified</Badge>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <div className="bg-muted p-2 rounded-full text-muted-foreground"><Phone className="h-4 w-4" /></div>
              <div>
                <p className="text-muted-foreground text-xs">Phone</p>
                <p className="font-medium">{tenant.phone}</p>
              </div>
            </div>
            {tenant.email && (
              <div className="flex items-center gap-3 text-sm">
                <div className="bg-muted p-2 rounded-full text-muted-foreground"><Mail className="h-4 w-4" /></div>
                <div>
                  <p className="text-muted-foreground text-xs">Email</p>
                  <p className="font-medium">{tenant.email}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <div className="bg-muted p-2 rounded-full text-muted-foreground"><CreditCard className="h-4 w-4" /></div>
              <div>
                <p className="text-muted-foreground text-xs">Aadhaar</p>
                <p className="font-medium">{tenant.aadhaarNumber || 'Not provided'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="bg-muted p-2 rounded-full text-muted-foreground"><FileText className="h-4 w-4" /></div>
              <div>
                <p className="text-muted-foreground text-xs">PAN</p>
                <p className="font-medium">{tenant.panNumber || 'Not provided'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Current Assignment</CardTitle>
          </CardHeader>
          <CardContent>
            {tenant.unitId ? (
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="bg-primary/10 p-2 rounded-full text-primary"><Building2 className="h-4 w-4" /></div>
                    <div>
                      <p className="text-muted-foreground text-xs">Property</p>
                      <p className="font-medium">{tenant.propertyName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="bg-primary/10 p-2 rounded-full text-primary"><Home className="h-4 w-4" /></div>
                    <div>
                      <p className="text-muted-foreground text-xs">Unit</p>
                      <p className="font-medium">{tenant.unitNumber}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="bg-primary/10 p-2 rounded-full text-primary"><Calendar className="h-4 w-4" /></div>
                    <div>
                      <p className="text-muted-foreground text-xs">Move In Date</p>
                      <p className="font-medium">{formatDate(tenant.moveInDate)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Home className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p>Not currently assigned to any unit.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
            </div>
          ) : payments?.length ? (
            <div className="border rounded-md">
              <div className="grid grid-cols-5 gap-4 p-3 border-b text-sm font-medium text-muted-foreground">
                <div>Month/Year</div>
                <div>Amount</div>
                <div>Status</div>
                <div>Mode</div>
                <div>Paid On</div>
              </div>
              <div className="divide-y">
                {payments.map(payment => (
                  <div key={payment.id} className="grid grid-cols-5 gap-4 p-3 text-sm items-center">
                    <div className="font-medium">{payment.month}/{payment.year}</div>
                    <div className="font-bold">{formatCurrency(payment.amount)}</div>
                    <div>
                      <Badge className={`${getStatusColor(payment.status)} border-none shadow-none`}>
                        {payment.status}
                      </Badge>
                    </div>
                    <div className="uppercase text-xs">{payment.mode.replace('_', ' ')}</div>
                    <div className="text-muted-foreground">{formatDate(payment.paidAt) || '-'}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <p>No payment history found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
