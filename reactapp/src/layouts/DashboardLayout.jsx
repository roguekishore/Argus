import React, { useState } from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarTrigger,
  SidebarRail,
  SidebarInset,
  useSidebar,
  Avatar,
  AvatarFallback,
  Button,
  Separator,
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "../components/ui";
import { ThemeToggle } from "../components/theme-toggle";
import { NotificationBell, ArgusLogo } from "../components/common";
import {
  ChevronDown,
  LogOut,
  Settings,
  User,
} from "lucide-react";

// Sidebar Content Component
const SidebarNav = ({ menuItems, activeItem, setActiveItem, user }) => {
  const { isCollapsed } = useSidebar();
  const [expandedItems, setExpandedItems] = useState([]);

  const toggleExpand = (itemId) => {
    setExpandedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <ArgusLogo className="h-5 w-5 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Argus</span>
              <span className="text-xs text-muted-foreground">{user?.role || "Dashboard"}</span>
            </div>
          )}
        </div>
        <SidebarRail />
      </SidebarHeader>

      <SidebarContent>
        {menuItems.map((group, groupIndex) => (
          <SidebarGroup key={groupIndex}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={activeItem === item.id}
                      tooltip={item.label}
                      onClick={() => {
                        if (item.children) {
                          toggleExpand(item.id);
                        } else {
                          setActiveItem(item.id);
                        }
                      }}
                    >
                      {item.icon}
                      {!isCollapsed && (
                        <>
                          <span className="flex-1">{item.label}</span>
                          {item.children && (
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${
                                expandedItems.includes(item.id) ? "rotate-180" : ""
                              }`}
                            />
                          )}
                        </>
                      )}
                    </SidebarMenuButton>

                    {item.children && expandedItems.includes(item.id) && (
                      <SidebarMenuSub>
                        {item.children.map((child) => (
                          <SidebarMenuSubItem key={child.id}>
                            <SidebarMenuSubButton
                              isActive={activeItem === child.id}
                              onClick={() => setActiveItem(child.id)}
                            >
                              {child.icon}
                              <span>{child.label}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        {/* <Separator className="mb-2" /> */}
        <SidebarMenu>
          {/* <SidebarMenuItem>
            <SidebarMenuButton tooltip="Settings">
              <Settings className="h-4 w-4" />
              {!isCollapsed && <span>Settings</span>}
            </SidebarMenuButton>
          </SidebarMenuItem> */}
        </SidebarMenu>
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-muted p-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {user?.name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || "User"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || "user@example.com"}</p>
            </div>
          )}
        </div>
      </SidebarFooter>
    </>
  );
};

// Header Component
const DashboardHeader = ({ breadcrumbs, user, onLogout, onNavigateToComplaint }) => {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 sm:gap-4 border-b bg-background px-2 sm:px-4 md:px-6">
      <SidebarTrigger className="flex-shrink-0" />
      
      <Separator orientation="vertical" className="h-6 hidden sm:block" />
      
      <Breadcrumb className="flex-1 min-w-0 overflow-hidden">
        <BreadcrumbList className="flex-nowrap overflow-hidden">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              <BreadcrumbItem className="hidden sm:inline-flex">
                {index === breadcrumbs.length - 1 ? (
                  <BreadcrumbPage className="truncate max-w-[150px] md:max-w-[250px]">{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={crumb.href} className="truncate max-w-[100px] md:max-w-[150px]">{crumb.label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {/* On mobile, show only last breadcrumb */}
              {index === breadcrumbs.length - 1 && (
                <BreadcrumbItem className="inline-flex sm:hidden">
                  <BreadcrumbPage className="truncate max-w-[120px]">{crumb.label}</BreadcrumbPage>
                </BreadcrumbItem>
              )}
              {index < breadcrumbs.length - 1 && <BreadcrumbSeparator className="hidden sm:inline-flex" />}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        <NotificationBell onNavigateToComplaint={onNavigateToComplaint} />
        <ThemeToggle />
        <Separator orientation="vertical" className="h-6 hidden sm:block" />
        <Button variant="ghost" size="icon" onClick={onLogout} className="h-8 w-8 sm:h-9 sm:w-9">
          <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>
    </header>
  );
};

// Main Dashboard Layout
const DashboardLayout = ({ 
  menuItems, 
  children, 
  user, 
  breadcrumbs = [{ label: "Dashboard", href: "/" }],
  activeItem,
  setActiveItem,
  onLogout,
  onNavigateToComplaint,
}) => {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-screen overflow-hidden">
        <Sidebar>
          <SidebarNav 
            menuItems={menuItems} 
            activeItem={activeItem}
            setActiveItem={setActiveItem}
            user={user}
          />
        </Sidebar>
        
        <SidebarInset className="flex flex-col min-w-0">
          <DashboardHeader 
            breadcrumbs={breadcrumbs} 
            user={user}
            onLogout={onLogout}
            onNavigateToComplaint={onNavigateToComplaint}
          />
          
          <div className="flex-1 overflow-auto p-4 sm:p-6">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
