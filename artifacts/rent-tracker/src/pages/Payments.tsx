import { Link } from "wouter";
import { useListPayments } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IndianRupee, Plus, Receipt } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

export default function Payments() {
  const { data: payments, isLoading } = useListPayments();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-[var(--color-status-success)] text-[var(--color-status-success-foreground)]';
      case 'due': return 'bg-[var(--color-status-warning)] text-[var(--color-status-warning-foreground)]';
      case 'overdue': return 'bg-[var(--color-status-error)] text-[var(--color-status-error-foreground)]';
      case 'partial': return 'bg-[var(--color-status-info)] text-[var(--color-status-info-foreground)]';
      case 'pending': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getMonthName = (month: number) => {
    const d = new Date();
    d.setMonth(month - 1);
    return d.toLocaleString('default', { month: 'short' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight">Payments</h1>
          <p className="text-muted-foreground mt-1">Rent collection log.</p>
        </div>
        <Link href="/payments/new">
          <Button><Plus className="h-4 w-4 mr-2" /> Log Payment</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 animate-pulse bg-muted rounded-md" />)}
        </div>
      ) : payments?.length ? (
        <div className="border rounded-md bg-card">
          <div className="grid grid-cols-12 gap-4 p-4 border-b font-medium text-sm text-muted-foreground">
            <div className="col-span-2">Month</div>
            <div className="col-span-3">Tenant & Unit</div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-2 text-center">Status</div>
            <div className="col-span-3 text-right">Details</div>
          </div>
          <div className="divide-y">
            {payments.map(payment => (
              <div key={payment.id} className="grid grid-cols-12 gap-4 p-4 items-center text-sm hover:bg-muted/50 transition-colors">
                <div className="col-span-2 font-medium">
                  {getMonthName(payment.month)} {payment.year}
                </div>
                <div className="col-span-3">
                  <div className="font-bold truncate">{payment.tenantName}</div>
                  <div className="text-xs text-muted-foreground truncate">{payment.propertyName} - {payment.unitNumber}</div>
                </div>
                <div className="col-span-2 text-right font-bold">
                  {formatCurrency(payment.amount)}
                </div>
                <div className="col-span-2 text-center">
                  <Badge className={`${getStatusColor(payment.status)} border-none shadow-none`}>
                    {payment.status}
                  </Badge>
                </div>
                <div className="col-span-3 text-right text-xs space-y-1">
                  <div className="uppercase font-medium text-muted-foreground">
                    {payment.mode.replace('_', ' ')}
                  </div>
                  {payment.paidAt && (
                    <div className="text-muted-foreground">
                      {formatDate(payment.paidAt)}
                    </div>
                  )}
                  {payment.upiTransactionId && (
                    <div className="text-muted-foreground font-mono text-[10px]">
                      TXN: {payment.upiTransactionId}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-card text-card-foreground">
          <Receipt className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-lg font-medium">No payments logged</h3>
          <p className="text-muted-foreground mt-1 mb-4">Record your first rent payment.</p>
          <Link href="/payments/new">
            <Button>Log Payment</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
