import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input"> & {
    variant?: "default" | "filled" | "underlined";
  }
>(({ className, type, variant = "default", ...props }, ref) => {
  const variants = {
    default: "border border-input bg-background focus:border-primary focus:ring-2 focus:ring-primary/20",
    filled: "border-0 bg-muted focus:bg-background focus:ring-2 focus:ring-primary/20",
    underlined: "border-0 border-b-2 border-input rounded-none bg-transparent focus:border-primary px-0",
  };

  return (
    <input
      type={type}
      className={cn(
        "flex h-12 w-full rounded-lg px-4 py-3 text-base transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        variants[variant],
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
