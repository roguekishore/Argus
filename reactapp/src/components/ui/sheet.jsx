import * as React from "react";
import { cn } from "../../lib/utils";

const Sheet = React.forwardRef(({ className, open, onOpenChange, children, ...props }, ref) => {
  if (!open) return null;
  
  return (
    <>
      <div 
        className="fixed inset-0 z-50 bg-black/80"
        onClick={() => onOpenChange?.(false)}
      />
      <div
        ref={ref}
        className={cn(
          "fixed inset-y-0 left-0 z-50 h-full w-3/4 max-w-sm border-r bg-background p-6 shadow-lg transition-transform",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </>
  );
});
Sheet.displayName = "Sheet";

const SheetTrigger = React.forwardRef(({ className, children, onClick, ...props }, ref) => (
  <button
    ref={ref}
    className={cn("", className)}
    onClick={onClick}
    {...props}
  >
    {children}
  </button>
));
SheetTrigger.displayName = "SheetTrigger";

const SheetContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props}>
    {children}
  </div>
));
SheetContent.displayName = "SheetContent";

const SheetHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-2 text-center sm:text-left", className)}
    {...props}
  />
));
SheetHeader.displayName = "SheetHeader";

const SheetTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
));
SheetTitle.displayName = "SheetTitle";

export { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle };
