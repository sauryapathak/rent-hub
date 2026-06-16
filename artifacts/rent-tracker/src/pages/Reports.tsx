import { useGetIncomeChart, useGetExpenseSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { BarChart3 } from "lucide-react";

export default function Reports() {
  const { data: incomeChart, isLoading: chartLoading } = useGetIncomeChart();
  const { data: expenseSummary, isLoading: expenseLoading } = useGetExpenseSummary();

  const chartData = incomeChart?.map(d => ({
    ...d,
    net: d.income - d.expenses
  })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-serif tracking-tight">Reports</h1>
        <p className="text-muted-foreground mt-1">Financial overview and analytics.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cash Flow</CardTitle>
            <CardDescription>Income vs Expenses (Last 12 Months)</CardDescription>
          </CardHeader>
          <CardContent>
            {chartLoading ? (
              <div className="h-[300px] bg-muted animate-pulse rounded-md" />
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
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
            <CardTitle>Expense Breakdown</CardTitle>
            <CardDescription>By category (All time)</CardDescription>
          </CardHeader>
          <CardContent>
            {expenseLoading ? (
              <div className="space-y-4">
                {[1,2,3,4].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}
              </div>
            ) : expenseSummary?.categories?.length ? (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                  <p className="text-3xl font-bold text-destructive">{formatCurrency(expenseSummary.total)}</p>
                </div>
                <div className="space-y-3">
                  {expenseSummary.categories.map((cat, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="capitalize">{cat.category.replace('_', ' ')}</span>
                      <span className="font-medium">{formatCurrency(cat.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p>No expense data available.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
