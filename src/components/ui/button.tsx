import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        // Midnight Blue - App shell, headers
        default:
          "bg-primary text-primary-foreground shadow-md hover:bg-primary-dark",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        // Electric Teal outline  
        outline:
          "border-2 border-accent text-accent bg-transparent hover:bg-accent/10",
        // Warm Amber
        secondary:
          "bg-secondary text-secondary-foreground shadow-secondary hover:bg-secondary/90",
        ghost: "hover:bg-muted hover:text-foreground",
        link: "text-accent underline-offset-4 hover:underline",
        // Electric Teal gradient - Primary CTAs (Post Job, Accept Job, Upgrade)
        hero: "bg-accent text-primary shadow-primary hover:bg-accent/90 transition-all",
        // Soft Electric Teal
        soft: "bg-accent/10 text-accent hover:bg-accent/20",
        // Soft Warm Amber
        softSecondary: "bg-secondary/10 text-secondary hover:bg-secondary/20",
        // Success
        success: "bg-success text-success-foreground hover:bg-success/90",
        // Electric Teal solid - for verified badges, active states
        teal: "bg-accent text-primary hover:bg-accent/90",
        // Midnight solid
        midnight: "bg-primary text-primary-foreground hover:bg-primary-dark",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-10 w-10",
        iconSm: "h-8 w-8",
        iconLg: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
