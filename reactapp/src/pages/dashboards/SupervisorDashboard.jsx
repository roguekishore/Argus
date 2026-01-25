import React, { useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from "../../components/ui";
import {
  LayoutDashboard,
  FileText,
  Users,
  UserCheck,
  ClipboardList,
  BarChart3,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";

// Supervisor Menu Items
const supervisorMenuItems = [
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
    label: "Complaints",
    items: [
      {
        id: "all-complaints",
        label: "All Complaints",
        icon: <FileText className="h-4 w-4" />,
        children: [
          {
            id: "unassigned",
            label: "Unassigned",
            icon: <ClipboardList className="h-4 w-4" />,
          },
          {
            id: "assigned",
            label: "Assigned",
            icon: <UserCheck className="h-4 w-4" />,
          },
          {
            id: "overdue",
            label: "Overdue",
            icon: <AlertTriangle className="h-4 w-4" />,
          },
        ],
      },
      {
        id: "escalations",
        label: "Escalations",
        icon: <AlertTriangle className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "Team",
    items: [
      {
        id: "staff-management",
        label: "Staff Management",
        icon: <Users className="h-4 w-4" />,
      },
      {
        id: "performance",
        label: "Team Performance",
        icon: <BarChart3 className="h-4 w-4" />,
      },
    ],
  },
];

const SupervisorDashboard = () => {
  const [activeItem, setActiveItem] = useState("dashboard");
  
  const user = {
    name: "Supervisor Name",
    email: "supervisor@municipality.gov",
    role: "Supervisor",
  };

  const getBreadcrumbs = () => {
    const breadcrumbs = [{ label: "Dashboard", href: "/" }];
    if (activeItem !== "dashboard") {
      for (const group of supervisorMenuItems) {
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
    { title: "Unassigned", value: "23", icon: <ClipboardList className="h-5 w-5" /> },
    { title: "In Progress", value: "45", icon: <Clock className="h-5 w-5 text-yellow-500" /> },
    { title: "Resolved Today", value: "12", icon: <CheckCircle2 className="h-5 w-5 text-green-500" /> },
    { title: "Overdue", value: "8", icon: <AlertTriangle className="h-5 w-5 text-red-500" /> },
  ];

  const staffPerformance = [
    { name: "Staff A", resolved: 15, pending: 3 },
    { name: "Staff B", resolved: 12, pending: 5 },
    { name: "Staff C", resolved: 8, pending: 2 },
  ];

  return (
    <DashboardLayout
      menuItems={supervisorMenuItems}
      user={user}
      breadcrumbs={getBreadcrumbs()}
      activeItem={activeItem}
      setActiveItem={setActiveItem}
      onLogout={() => console.log("Logout")}
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Supervisor Dashboard</h2>
          <p className="text-muted-foreground">Monitor and manage your team's complaint resolution.</p>
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

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Staff Performance</CardTitle>
              <CardDescription>This week's resolution stats</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {staffPerformance.map((staff, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="font-medium">{staff.name}</span>
                    <div className="flex gap-4 text-sm">
                      <span className="text-green-600">{staff.resolved} resolved</span>
                      <span className="text-yellow-600">{staff.pending} pending</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Urgent Escalations</CardTitle>
              <CardDescription>Requires immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950">
                    <div>
                      <p className="font-medium">Complaint #{2024200 + i}</p>
                      <p className="text-sm text-muted-foreground">Overdue by {i * 2} days</p>
                    </div>
                    <Badge variant="destructive">Urgent</Badge>
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

export default SupervisorDashboard;
