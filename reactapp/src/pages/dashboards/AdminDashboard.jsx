import React, { useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from "../../components/ui";
import {
  LayoutDashboard,
  FileText,
  Building,
  Building2,
  Users,
  UserPlus,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Settings,
  PieChart,
  Shield,
  Map,
  Bell,
} from "lucide-react";

// Admin Menu Items
const adminMenuItems = [
  {
    label: "Overview",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "Management",
    items: [
      {
        id: "complaints",
        label: "All Complaints",
        icon: <FileText className="h-4 w-4" />,
        children: [
          {
            id: "pending-review",
            label: "Pending Review",
            icon: <Clock className="h-4 w-4" />,
          },
          {
            id: "escalated",
            label: "Escalated",
            icon: <AlertTriangle className="h-4 w-4" />,
          },
          {
            id: "resolved",
            label: "Resolved",
            icon: <CheckCircle2 className="h-4 w-4" />,
          },
        ],
      },
      {
        id: "departments",
        label: "Departments",
        icon: <Building className="h-4 w-4" />,
      },
      {
        id: "users",
        label: "User Management",
        icon: <Users className="h-4 w-4" />,
        children: [
          {
            id: "all-users",
            label: "All Users",
            icon: <Users className="h-4 w-4" />,
          },
          {
            id: "add-user",
            label: "Add User",
            icon: <UserPlus className="h-4 w-4" />,
          },
          {
            id: "roles",
            label: "Roles & Permissions",
            icon: <Shield className="h-4 w-4" />,
          },
        ],
      },
    ],
  },
  {
    label: "Analytics",
    items: [
      {
        id: "reports",
        label: "Reports",
        icon: <BarChart3 className="h-4 w-4" />,
      },
      {
        id: "analytics",
        label: "System Analytics",
        icon: <PieChart className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "Configuration",
    items: [
      {
        id: "categories",
        label: "Categories",
        icon: <Map className="h-4 w-4" />,
      },
      {
        id: "notifications",
        label: "Notifications",
        icon: <Bell className="h-4 w-4" />,
      },
      {
        id: "settings",
        label: "System Settings",
        icon: <Settings className="h-4 w-4" />,
      },
    ],
  },
];

const AdminDashboard = () => {
  const [activeItem, setActiveItem] = useState("dashboard");
  
  const user = {
    name: "Administrator",
    email: "admin@municipality.gov",
    role: "Admin",
  };

  const getBreadcrumbs = () => {
    const breadcrumbs = [{ label: "Dashboard", href: "/" }];
    if (activeItem !== "dashboard") {
      for (const group of adminMenuItems) {
        for (const item of group.items) {
          if (item.id === activeItem) {
            breadcrumbs.push({ label: item.label, href: "#" });
          }
          if (item.children) {
            for (const child of item.children) {
              if (child.id === activeItem) {
                breadcrumbs.push({ label: item.label, href: "#" });
                breadcrumbs.push({ label: child.label, href: "#" });
              }
            }
          }
        }
      }
    }
    return breadcrumbs;
  };

  const stats = [
    { title: "Total Complaints", value: "1,234", change: "+18%", icon: <FileText className="h-5 w-5" /> },
    { title: "Active Users", value: "856", change: "+24", icon: <Users className="h-5 w-5 text-blue-500" /> },
    { title: "Departments", value: "12", icon: <Building className="h-5 w-5 text-green-500" /> },
    { title: "Resolution Rate", value: "92%", change: "+3%", icon: <TrendingUp className="h-5 w-5 text-green-500" /> },
  ];

  const departments = [
    { name: "Water & Sanitation", complaints: 156, resolved: 142 },
    { name: "Roads & Infrastructure", complaints: 234, resolved: 198 },
    { name: "Electricity", complaints: 189, resolved: 175 },
    { name: "Waste Management", complaints: 145, resolved: 130 },
  ];

  return (
    <DashboardLayout
      menuItems={adminMenuItems}
      user={user}
      breadcrumbs={getBreadcrumbs()}
      activeItem={activeItem}
      setActiveItem={setActiveItem}
      onLogout={() => console.log("Logout")}
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Admin Dashboard</h2>
          <p className="text-muted-foreground">System-wide overview and management.</p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                {stat.icon}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                {stat.change && (
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-500">{stat.change}</span> from last month
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Department Performance</CardTitle>
              <CardDescription>Complaints vs Resolutions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {departments.map((dept, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{dept.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {dept.resolved}/{dept.complaints}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full" 
                        style={{ width: `${(dept.resolved / dept.complaints) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>System-wide events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { action: "New user registered", time: "2 min ago", type: "user" },
                  { action: "Complaint #1234 escalated", time: "15 min ago", type: "alert" },
                  { action: "Water Dept. resolved 5 complaints", time: "1 hr ago", type: "success" },
                  { action: "System backup completed", time: "3 hrs ago", type: "info" },
                ].map((activity, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm">{activity.action}</span>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
