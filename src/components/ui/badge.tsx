import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground border-border",
        success: "border-transparent bg-success/15 text-success",
        warning: "border-transparent bg-warning/15 text-warning",
        amber: "border-transparent bg-accent/15 text-accent",
        soft: "border-transparent bg-primary-light text-primary",
        softSecondary: "border-transparent bg-secondary-light text-secondary-foreground",
        verified: "border-transparent bg-primary/15 text-primary",
        unverified: "border-transparent bg-accent/15 text-accent",
        online: "border-transparent bg-primary/15 text-primary",
        offline: "border-transparent bg-muted text-muted-foreground",
        midnight: "border-transparent bg-secondary text-secondary-foreground",
        rating: "border-transparent bg-accent/15 text-accent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
