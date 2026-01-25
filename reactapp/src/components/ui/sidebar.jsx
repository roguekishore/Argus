import React, { createContext, useContext, useState } from "react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Tooltip } from "./tooltip";
import { Sheet } from "./sheet";
import { 
  ChevronLeft, 
  ChevronRight,
  PanelLeft
} from "lucide-react";

// Sidebar Context
const SidebarContext = createContext({
  isCollapsed: false,
  isMobile: false,
  isOpen: false,
  setIsCollapsed: () => {},
  setIsOpen: () => {},
  toggleSidebar: () => {},
});

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

// Sidebar Provider
export const SidebarProvider = ({ children, defaultCollapsed = false }) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) {
      setIsOpen(!isOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <SidebarContext.Provider
      value={{ isCollapsed, isMobile, isOpen, setIsCollapsed, setIsOpen, toggleSidebar }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

// Sidebar Component
export const Sidebar = ({ children, className }) => {
  const { isCollapsed, isMobile, isOpen, setIsOpen } = useSidebar();

  // Mobile sidebar (Sheet)
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex h-full flex-col bg-background border-r w-64">
          {children}
        </div>
      </Sheet>
    );
  }

  // Desktop sidebar
  return (
    <aside
      className={cn(
        "relative flex h-screen flex-col flex-shrink-0 border-r bg-background transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
        className
      )}
    >
      {children}
    </aside>
  );
};

// Sidebar Header
export const SidebarHeader = ({ children, className }) => {
  const { isCollapsed } = useSidebar();
  return (
    <div
      className={cn(
        "flex h-14 items-center border-b px-4",
        isCollapsed && "justify-center px-2",
        className
      )}
    >
      {children}
    </div>
  );
};

// Sidebar Content
export const SidebarContent = ({ children, className }) => {
  return (
    <div className={cn("flex-1 overflow-auto py-2", className)}>
      {children}
    </div>
  );
};

// Sidebar Footer
export const SidebarFooter = ({ children, className }) => {
  const { isCollapsed } = useSidebar();
  return (
    <div
      className={cn(
        "border-t p-4",
        isCollapsed && "p-2",
        className
      )}
    >
      {children}
    </div>
  );
};

// Sidebar Group
export const SidebarGroup = ({ children, className }) => {
  return <div className={cn("px-3 py-2", className)}>{children}</div>;
};

// Sidebar Group Label
export const SidebarGroupLabel = ({ children, className }) => {
  const { isCollapsed } = useSidebar();
  
  if (isCollapsed) return null;
  
  return (
    <h4
      className={cn(
        "mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground",
        className
      )}
    >
      {children}
    </h4>
  );
};

// Sidebar Group Content
export const SidebarGroupContent = ({ children, className }) => {
  return <div className={cn("space-y-1", className)}>{children}</div>;
};

// Sidebar Menu
export const SidebarMenu = ({ children, className }) => {
  return <nav className={cn("space-y-1", className)}>{children}</nav>;
};

// Sidebar Menu Item
export const SidebarMenuItem = ({ children, className }) => {
  return <div className={cn("", className)}>{children}</div>;
};

// Sidebar Menu Button
export const SidebarMenuButton = ({ 
  children, 
  className, 
  isActive = false,
  tooltip,
  onClick,
  asChild = false,
  ...props 
}) => {
  const { isCollapsed } = useSidebar();

  const buttonContent = (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        isActive && "bg-accent text-accent-foreground",
        isCollapsed && "justify-center px-2",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );

  if (isCollapsed && tooltip) {
    return (
      <Tooltip content={tooltip} side="right">
        {buttonContent}
      </Tooltip>
    );
  }

  return buttonContent;
};

// Sidebar Menu Sub (Collapsible submenu)
export const SidebarMenuSub = ({ children, className }) => {
  const { isCollapsed } = useSidebar();
  
  if (isCollapsed) return null;
  
  return (
    <div className={cn("ml-4 mt-1 space-y-1 border-l pl-4", className)}>
      {children}
    </div>
  );
};

// Sidebar Menu Sub Item
export const SidebarMenuSubItem = ({ children, className }) => {
  return <div className={cn("", className)}>{children}</div>;
};

// Sidebar Menu Sub Button
export const SidebarMenuSubButton = ({ 
  children, 
  className, 
  isActive = false,
  onClick,
  ...props 
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        isActive && "bg-accent/50 text-accent-foreground",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

// Sidebar Trigger Button (for mobile)
export const SidebarTrigger = ({ className }) => {
  const { toggleSidebar } = useSidebar();
  
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-9 w-9", className)}
      onClick={toggleSidebar}
    >
      <PanelLeft className="h-5 w-5" />
      <span className="sr-only">Toggle sidebar</span>
    </Button>
  );
};

// Sidebar Rail (collapse toggle for desktop)
export const SidebarRail = ({ className }) => {
  const { isCollapsed, toggleSidebar, isMobile } = useSidebar();
  
  if (isMobile) return null;
  
  return (
    <button
      onClick={toggleSidebar}
      className={cn(
        "absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-accent",
        className
      )}
    >
      {isCollapsed ? (
        <ChevronRight className="h-4 w-4" />
      ) : (
        <ChevronLeft className="h-4 w-4" />
      )}
    </button>
  );
};

// Sidebar Inset (Main content area)
export const SidebarInset = ({ children, className }) => {
  return (
    <main className={cn("flex-1 overflow-hidden", className)}>
      {children}
    </main>
  );
};
