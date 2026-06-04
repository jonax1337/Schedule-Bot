import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageSpinnerProps {
  /** Override the container (e.g. "min-h-[200px]"); merged over the default. */
  className?: string;
  /** Override the spinner icon size/colour. */
  iconClassName?: string;
}

export function PageSpinner({ className, iconClassName }: PageSpinnerProps) {
  return (
    <div className={cn("min-h-[400px] flex items-center justify-center", className)}>
      <Loader2 className={cn("w-8 h-8 animate-spin", iconClassName)} />
    </div>
  );
}
