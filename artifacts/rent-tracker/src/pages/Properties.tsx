import { useState } from "react";
import { Link } from "wouter";
import { useListProperties, useCreateProperty, getListPropertiesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Plus, MapPin } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { PropertyInput, PropertyType, PropertyInputType } from "@workspace/api-zod"; // assuming these types exist, will use casting if not

export default function Properties() {
  const { data: properties, isLoading } = useListProperties();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const createMutation = useCreateProperty({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPropertiesQueryKey() });
        setOpen(false);
      }
    }
  });

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    type: "residential" as PropertyInputType
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ data: formData as any });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight">Properties</h1>
          <p className="text-muted-foreground mt-1">Manage your real estate portfolio.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Property</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Property</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Sunrise Apartments" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Address</label>
                <Input required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Street address" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">City</label>
                  <Input required value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="City" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">State</label>
                  <Input required value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} placeholder="State" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.type} 
                  onChange={e => setFormData({...formData, type: e.target.value as PropertyInputType})}
                >
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Property"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <Card key={i} className="h-64 animate-pulse bg-muted" />)}
        </div>
      ) : properties?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map(property => (
            <Card key={property.id} className="flex flex-col hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-xl">{property.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {property.city}, {property.state}
                  </CardDescription>
                </div>
                <div className="bg-primary/10 text-primary p-2 rounded-full">
                  <Building2 className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="flex-1 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Income</p>
                    <p className="text-lg font-bold">{formatCurrency(property.monthlyIncome)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Units (Occ/Total)</p>
                    <p className="text-lg font-bold">{property.occupiedUnits} / {property.totalUnits}</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-4 border-t">
                <Link href={`/properties/${property.id}`} className="w-full">
                  <Button variant="outline" className="w-full">View Details</Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-card text-card-foreground">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-lg font-medium">No properties found</h3>
          <p className="text-muted-foreground mt-1 mb-4">Start by adding your first property.</p>
          <Button onClick={() => setOpen(true)}>Add Property</Button>
        </div>
      )}
    </div>
  );
}
