import { useState } from "react";
import { useListVendors, useCreateVendor, getListVendorsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Contact2, Phone, Star, Hammer, Wrench, Droplets, Zap, PaintBucket, Bug, Sparkles } from "lucide-react";
import { VendorInputCategory } from "@workspace/api-zod";

export default function Vendors() {
  const { data: vendors, isLoading } = useListVendors();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const createMutation = useCreateVendor({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListVendorsQueryKey() });
        setOpen(false);
      }
    }
  });

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    category: "plumber" as VendorInputCategory,
    rating: "5",
    rateCard: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      data: {
        name: formData.name,
        phone: formData.phone,
        category: formData.category,
        rating: parseInt(formData.rating),
        rateCard: formData.rateCard || undefined,
      }
    });
  };

  const getCategoryIcon = (category: string) => {
    switch(category) {
      case 'plumber': return <Droplets className="h-4 w-4" />;
      case 'electrician': return <Zap className="h-4 w-4" />;
      case 'carpenter': return <Hammer className="h-4 w-4" />;
      case 'painter': return <PaintBucket className="h-4 w-4" />;
      case 'pest_control': return <Bug className="h-4 w-4" />;
      case 'cleaner': return <Sparkles className="h-4 w-4" />;
      default: return <Wrench className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight">Vendors</h1>
          <p className="text-muted-foreground mt-1">Directory of repairmen and service providers.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Vendor</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Vendor</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Full name or company" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <Input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="Phone number" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value as VendorInputCategory})}
                  >
                    <option value="plumber">Plumber</option>
                    <option value="electrician">Electrician</option>
                    <option value="carpenter">Carpenter</option>
                    <option value="painter">Painter</option>
                    <option value="pest_control">Pest Control</option>
                    <option value="cleaner">Cleaner</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rating (1-5)</label>
                  <Input type="number" min="1" max="5" value={formData.rating} onChange={e => setFormData({...formData, rating: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Rate Card / Notes</label>
                <Input value={formData.rateCard} onChange={e => setFormData({...formData, rateCard: e.target.value})} placeholder="e.g. ₹500 visiting charge" />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding..." : "Add Vendor"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4].map(i => <Card key={i} className="h-32 animate-pulse bg-muted" />)}
        </div>
      ) : vendors?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendors.map(vendor => (
            <Card key={vendor.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg">{vendor.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1 capitalize">
                      {getCategoryIcon(vendor.category)}
                      <span>{vendor.category.replace('_', ' ')}</span>
                    </div>
                  </div>
                  {vendor.rating && (
                    <div className="flex items-center bg-amber-100 text-amber-800 px-2 py-1 rounded text-sm font-medium">
                      {vendor.rating} <Star className="h-3 w-3 ml-1 fill-current" />
                    </div>
                  )}
                </div>
                
                <div className="mt-auto space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{vendor.phone}</span>
                  </div>
                  {vendor.rateCard && (
                    <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                      {vendor.rateCard}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-card text-card-foreground">
          <Contact2 className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-lg font-medium">No vendors</h3>
          <p className="text-muted-foreground mt-1 mb-4">Build your directory of trusted repairmen.</p>
          <Button onClick={() => setOpen(true)}>Add Vendor</Button>
        </div>
      )}
    </div>
  );
}
