import { useState } from "react";
import { useListExpenses, useCreateExpense, getListExpensesQueryKey, useListProperties } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Receipt, Search } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { ExpenseInputCategory } from "@workspace/api-zod";

export default function Expenses() {
  const { data: expenses, isLoading } = useListExpenses();
  const { data: properties } = useListProperties();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const createMutation = useCreateExpense({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
        setOpen(false);
      }
    }
  });

  const [formData, setFormData] = useState({
    propertyId: "",
    category: "repair" as ExpenseInputCategory,
    amount: "",
    date: new Date().toISOString().split('T')[0],
    description: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      data: {
        propertyId: parseInt(formData.propertyId),
        category: formData.category,
        amount: parseFloat(formData.amount),
        date: new Date(formData.date).toISOString(),
        description: formData.description,
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight">Expenses</h1>
          <p className="text-muted-foreground mt-1">Track outgoing costs and repairs.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Expense</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log New Expense</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Property</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  required
                  value={formData.propertyId}
                  onChange={(e) => setFormData({...formData, propertyId: e.target.value})}
                >
                  <option value="">Select Property</option>
                  {properties?.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value as ExpenseInputCategory})}
                  >
                    <option value="repair">Repair</option>
                    <option value="painting">Painting</option>
                    <option value="property_tax">Property Tax</option>
                    <option value="insurance">Insurance</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="utilities">Utilities</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount (₹)</label>
                  <Input type="number" required min="1" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} placeholder="0" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <Input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="What was this for?" />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving..." : "Add Expense"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3,4].map(i => <div key={i} className="h-16 animate-pulse bg-muted rounded-md" />)}
        </div>
      ) : expenses?.length ? (
        <Card>
          <div className="grid grid-cols-12 gap-4 p-4 border-b font-medium text-sm text-muted-foreground bg-muted/50 rounded-t-xl">
            <div className="col-span-2">Date</div>
            <div className="col-span-3">Property</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-3">Description</div>
            <div className="col-span-2 text-right">Amount</div>
          </div>
          <div className="divide-y">
            {expenses.map(expense => (
              <div key={expense.id} className="grid grid-cols-12 gap-4 p-4 items-center text-sm">
                <div className="col-span-2 text-muted-foreground">{formatDate(expense.date)}</div>
                <div className="col-span-3 font-medium">{expense.propertyName}</div>
                <div className="col-span-2 capitalize">{expense.category.replace('_', ' ')}</div>
                <div className="col-span-3 truncate">{expense.description}</div>
                <div className="col-span-2 text-right font-bold text-destructive">
                  -{formatCurrency(expense.amount)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-card text-card-foreground">
          <Receipt className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-lg font-medium">No expenses</h3>
          <p className="text-muted-foreground mt-1 mb-4">You haven't logged any expenses yet.</p>
          <Button onClick={() => setOpen(true)}>Add Expense</Button>
        </div>
      )}
    </div>
  );
}
