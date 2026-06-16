import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="h-16 border-b bg-card text-card-foreground flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-4 md:hidden">
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
        <span className="font-serif font-bold text-lg">RentSaathi</span>
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-4">
        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium text-sm">
          A
        </div>
      </div>
    </header>
  );
}
