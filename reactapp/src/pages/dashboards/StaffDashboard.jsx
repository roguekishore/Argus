import React, { useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from "../../components/ui";
import {
  LayoutDashboard,
  FileText,
  Inbox,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  BarChart3,
  Settings,
} from "lucide-react";

// Staff Menu Items
const staffMenuItems = [
  {
    label: "Main",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
      {
        id: "complaints",
        label: "Complaints",
        icon: <FileText className="h-4 w-4" />,
        children: [
          {
            id: "inbox",
            label: "Inbox",
            icon: <Inbox className="h-4 w-4" />,
          },
          {
            id: "assigned",
            label: "Assigned to Me",
            icon: <Send className="h-4 w-4" />,
          },
          {
            id: "in-progress",
            label: "In Progress",
            icon: <Clock className="h-4 w-4" />,
          },
          {
            id: "completed",
            label: "Completed",
            icon: <CheckCircle2 className="h-4 w-4" />,
          },
        ],
      },
      {
        id: "escalated",
        label: "Escalated",
        icon: <AlertTriangle className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "Reports",
    items: [
      {
        id: "my-performance",
        label: "My Performance",
        icon: <BarChart3 className="h-4 w-4" />,
      },
    ],
  },
];

const StaffDashboard = () => {
  const [activeItem, setActiveItem] = useState("dashboard");
  
  const user = {
    name: "Staff Member",
    email: "staff@municipality.gov",
    role: "Staff",
  };

  const getBreadcrumbs = () => {
    const breadcrumbs = [{ label: "Dashboard", href: "/" }];
    if (activeItem !== "dashboard") {
      for (const group of staffMenuItems) {
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
    { title: "Inbox", value: "15", icon: <Inbox className="h-5 w-5" /> },
    { title: "In Progress", value: "8", icon: <Clock className="h-5 w-5 text-yellow-500" /> },
    { title: "Completed Today", value: "5", icon: <CheckCircle2 className="h-5 w-5 text-green-500" /> },
    { title: "Escalated", value: "2", icon: <AlertTriangle className="h-5 w-5 text-red-500" /> },
  ];

  return (
    <DashboardLayout
      menuItems={staffMenuItems}
      user={user}
      breadcrumbs={getBreadcrumbs()}
      activeItem={activeItem}
      setActiveItem={setActiveItem}
      onLogout={() => console.log("Logout")}
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Staff Dashboard</h2>
          <p className="text-muted-foreground">Manage and resolve assigned complaints.</p>
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
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Assignments</CardTitle>
            <CardDescription>Complaints assigned to you</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">Complaint #{2024100 + i}</p>
                    <p className="text-sm text-muted-foreground">Street light not working - Ward {i}</p>
                  </div>
                  <Badge variant={i === 1 ? "destructive" : "secondary"}>
                    {i === 1 ? "High Priority" : "Normal"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StaffDashboard;
