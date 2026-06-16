import { useGetDashboardSummary, useGetRecentActivity, useGetRentStatus, useGetIncomeChart, useGetExpiringAgreements } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { Building2, DoorOpen, IndianRupee, AlertCircle, Clock, FileText, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: recentActivity, isLoading: loadingActivity } = useGetRecentActivity();
  const { data: rentStatus, isLoading: loadingRentStatus } = useGetRentStatus();
  const { data: incomeChart, isLoading: loadingIncome } = useGetIncomeChart();
  const { data: expiringAgreements, isLoading: loadingAgreements } = useGetExpiringAgreements();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-serif tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Your portfolio at a glance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Income"
          value={summary ? formatCurrency(summary.collectedThisMonth) : null}
          icon={IndianRupee}
          description="Collected this month"
          loading={loadingSummary}
        />
        <SummaryCard
          title="Occupancy Rate"
          value={summary ? `${summary.occupancyRate.toFixed(1)}%` : null}
          icon={Building2}
          description={`${summary?.occupiedUnits || 0} / ${summary?.totalUnits || 0} units occupied`}
          loading={loadingSummary}
        />
        <SummaryCard
          title="Pending Dues"
          value={summary ? formatCurrency(summary.pendingDues) : null}
          icon={Clock}
          description="Awaiting payment"
          loading={loadingSummary}
          alert={summary && summary.pendingDues > 0}
        />
        <SummaryCard
          title="Overdue Dues"
          value={summary ? summary.overdueCount.toString() : null}
          icon={AlertCircle}
          description="Payments past due date"
          loading={loadingSummary}
          alert={summary && summary.overdueCount > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Income vs Expenses</CardTitle>
            <CardDescription>Trailing 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingIncome ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={incomeChart}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} 
                    />
                    <Tooltip 
                      formatter={(val: number) => formatCurrency(val)}
                      cursor={{ fill: 'var(--muted)' }}
                    />
                    <Legend />
                    <Bar dataKey="income" name="Income" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="var(--color-destructive)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rent Status</CardTitle>
            <CardDescription>Current month collection</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRentStatus ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                <StatusTile
                  label="Paid"
                  count={rentStatus?.paid || 0}
                  color="bg-[var(--color-status-success)] text-[var(--color-status-success-foreground)]"
                  icon={CheckCircle2}
                />
                <StatusTile
                  label="Due"
                  count={rentStatus?.due || 0}
                  color="bg-[var(--color-status-warning)] text-[var(--color-status-warning-foreground)]"
                  icon={Clock}
                />
                <StatusTile
                  label="Overdue"
                  count={rentStatus?.overdue || 0}
                  color="bg-[var(--color-status-error)] text-[var(--color-status-error-foreground)]"
                  icon={AlertCircle}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Expiring Agreements</CardTitle>
            <CardDescription>Requires attention soon</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAgreements ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : expiringAgreements && expiringAgreements.length > 0 ? (
              <div className="space-y-4">
                {expiringAgreements.map((agreement) => (
                  <div key={agreement.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="bg-muted p-2 rounded-full">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{agreement.tenantName}</p>
                        <p className="text-xs text-muted-foreground">{agreement.propertyName} - {agreement.unitNumber}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={agreement.daysToExpiry! < 15 ? "destructive" : "secondary"}>
                        {agreement.daysToExpiry} days left
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-3 opacity-20" />
                <p>No agreements expiring soon.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates across portfolio</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingActivity ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 border-b pb-4 last:border-0 last:pb-0">
                    <div className="bg-muted p-2 rounded-full mt-0.5">
                      <ActivityIcon type={activity.type} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{formatDate(activity.timestamp)}</span>
                        {activity.propertyName && (
                          <>
                            <span>•</span>
                            <span>{activity.propertyName}</span>
                          </>
                        )}
                        {activity.amount && (
                          <>
                            <span>•</span>
                            <span className="font-medium text-foreground">{formatCurrency(activity.amount)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-3 opacity-20" />
                <p>No recent activity.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, description, loading, alert = false }: any) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className={`text-3xl font-bold ${alert ? 'text-destructive' : ''}`}>{value}</p>
            )}
          </div>
          <div className={`p-3 rounded-full ${alert ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4">
          {loading ? (
            <Skeleton className="h-4 w-32" />
          ) : (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusTile({ label, count, color, icon: Icon }: any) {
  return (
    <div className={`flex items-center justify-between p-4 rounded-lg border`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="font-medium">{label}</span>
      </div>
      <span className="text-xl font-bold">{count}</span>
    </div>
  );
}

function ActivityIcon({ type }: { type: string }) {
  switch (type) {
    case 'payment':
      return <IndianRupee className="h-4 w-4 text-emerald-500" />;
    case 'maintenance':
      return <AlertCircle className="h-4 w-4 text-amber-500" />;
    case 'agreement':
      return <FileText className="h-4 w-4 text-blue-500" />;
    case 'vacancy':
      return <DoorOpen className="h-4 w-4 text-purple-500" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
}
