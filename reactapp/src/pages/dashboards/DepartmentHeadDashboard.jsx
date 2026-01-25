import React, { useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from "../../components/ui";
import {
  LayoutDashboard,
  FileText,
  Building,
  Users,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Settings,
  PieChart,
} from "lucide-react";

// Department Head Menu Items
const deptHeadMenuItems = [
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
    label: "Department",
    items: [
      {
        id: "complaints",
        label: "Department Complaints",
        icon: <FileText className="h-4 w-4" />,
        children: [
          {
            id: "all",
            label: "All Complaints",
            icon: <FileText className="h-4 w-4" />,
          },
          {
            id: "escalated",
            label: "Escalated",
            icon: <AlertTriangle className="h-4 w-4" />,
          },
          {
            id: "overdue",
            label: "Overdue",
            icon: <Clock className="h-4 w-4" />,
          },
        ],
      },
      {
        id: "team",
        label: "Team Management",
        icon: <Users className="h-4 w-4" />,
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
        label: "Analytics",
        icon: <PieChart className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "Settings",
    items: [
      {
        id: "dept-settings",
        label: "Department Settings",
        icon: <Settings className="h-4 w-4" />,
      },
    ],
  },
];

const DepartmentHeadDashboard = () => {
  const [activeItem, setActiveItem] = useState("dashboard");
  
  const user = {
    name: "Dept. Head Name",
    email: "depthead@municipality.gov",
    role: "Department Head",
  };

  const getBreadcrumbs = () => {
    const breadcrumbs = [{ label: "Dashboard", href: "/" }];
    if (activeItem !== "dashboard") {
      for (const group of deptHeadMenuItems) {
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
    { title: "Total Complaints", value: "156", change: "+12%", icon: <FileText className="h-5 w-5" /> },
    { title: "Resolution Rate", value: "87%", change: "+5%", icon: <TrendingUp className="h-5 w-5 text-green-500" /> },
    { title: "Avg. Resolution Time", value: "2.3d", change: "-0.5d", icon: <Clock className="h-5 w-5 text-blue-500" /> },
    { title: "Escalated", value: "12", change: "-3", icon: <AlertTriangle className="h-5 w-5 text-red-500" /> },
  ];

  return (
    <DashboardLayout
      menuItems={deptHeadMenuItems}
      user={user}
      breadcrumbs={getBreadcrumbs()}
      activeItem={activeItem}
      setActiveItem={setActiveItem}
      onLogout={() => console.log("Logout")}
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Department Head Dashboard</h2>
          <p className="text-muted-foreground">Water & Sanitation Department Overview</p>
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
                <p className="text-xs text-muted-foreground">
                  <span className={stat.change.startsWith("+") ? "text-green-500" : stat.change.startsWith("-") && stat.title !== "Escalated" ? "text-red-500" : "text-green-500"}>
                    {stat.change}
                  </span> from last month
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Supervisor Performance</CardTitle>
              <CardDescription>Monthly resolution statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {["Supervisor A", "Supervisor B", "Supervisor C"].map((name, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">{name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full" 
                          style={{ width: `${90 - i * 10}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{90 - i * 10}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Category Distribution</CardTitle>
              <CardDescription>Complaints by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "Water Supply", count: 45, color: "bg-blue-500" },
                  { name: "Drainage", count: 32, color: "bg-green-500" },
                  { name: "Sewage", count: 28, color: "bg-yellow-500" },
                  { name: "Other", count: 15, color: "bg-gray-500" },
                ].map((cat, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${cat.color}`} />
                      <span>{cat.name}</span>
                    </div>
                    <span className="font-medium">{cat.count}</span>
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

export default DepartmentHeadDashboard;
