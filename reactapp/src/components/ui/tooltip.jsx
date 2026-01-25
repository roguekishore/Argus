import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const tooltipVariants = cva(
  "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
);

const TooltipProvider = ({ children }) => children;

const Tooltip = ({ children, content, side = "right", delayDuration = 0 }) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const triggerRef = React.useRef(null);
  const timeoutRef = React.useRef(null);

  const showTooltip = () => {
    if (delayDuration > 0) {
      timeoutRef.current = setTimeout(() => setIsVisible(true), delayDuration);
    } else {
      setIsVisible(true);
    }
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  React.useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const pos = {
        top: rect.top + rect.height / 2,
        left: side === "right" ? rect.right + 8 : rect.left - 8,
      };
      setPosition(pos);
    }
  }, [isVisible, side]);

  return (
    <div className="relative inline-flex">
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        {children}
      </div>
      {isVisible && content && (
        <div
          className={cn(tooltipVariants(), "fixed -translate-y-1/2 whitespace-nowrap")}
          style={{ top: position.top, left: position.left }}
        >
          {content}
        </div>
      )}
    </div>
  );
};

const TooltipTrigger = React.forwardRef(({ className, ...props }, ref) => (
  <span ref={ref} className={cn("", className)} {...props} />
));
TooltipTrigger.displayName = "TooltipTrigger";

const TooltipContent = React.forwardRef(({ className, sideOffset = 4, ...props }, ref) => (
  <div ref={ref} className={cn(tooltipVariants(), className)} {...props} />
));
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
