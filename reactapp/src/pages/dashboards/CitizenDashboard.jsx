import React, { useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui";
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  History,
  User,
  HelpCircle,
} from "lucide-react";

// Citizen Menu Items
const citizenMenuItems = [
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
        label: "My Complaints",
        icon: <FileText className="h-4 w-4" />,
        children: [
          {
            id: "new-complaint",
            label: "New Complaint",
            icon: <PlusCircle className="h-4 w-4" />,
          },
          {
            id: "pending",
            label: "Pending",
            icon: <Clock className="h-4 w-4" />,
          },
          {
            id: "resolved",
            label: "Resolved",
            icon: <CheckCircle2 className="h-4 w-4" />,
          },
          {
            id: "rejected",
            label: "Rejected",
            icon: <AlertCircle className="h-4 w-4" />,
          },
        ],
      },
      {
        id: "history",
        label: "History",
        icon: <History className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        id: "profile",
        label: "My Profile",
        icon: <User className="h-4 w-4" />,
      },
      {
        id: "help",
        label: "Help & Support",
        icon: <HelpCircle className="h-4 w-4" />,
      },
    ],
  },
];

// Sample Dashboard Content
const DashboardContent = ({ activeItem }) => {
  const stats = [
    { title: "Total Complaints", value: "12", description: "All time submissions", icon: <FileText className="h-5 w-5" /> },
    { title: "Pending", value: "3", description: "Awaiting response", icon: <Clock className="h-5 w-5 text-yellow-500" /> },
    { title: "Resolved", value: "8", description: "Successfully closed", icon: <CheckCircle2 className="h-5 w-5 text-green-500" /> },
    { title: "Rejected", value: "1", description: "Not accepted", icon: <AlertCircle className="h-5 w-5 text-red-500" /> },
  ];

  const contentMap = {
    dashboard: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Welcome back!</h2>
          <p className="text-muted-foreground">Here's an overview of your grievance submissions.</p>
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
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Complaints</CardTitle>
            <CardDescription>Your latest grievance submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Complaint #{2024001 + i}</p>
                    <p className="text-sm text-muted-foreground">Water supply issue in sector {i}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    i === 1 ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" :
                    i === 2 ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  }`}>
                    {i === 1 ? "Pending" : i === 2 ? "Resolved" : "In Progress"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    ),
    "new-complaint": (
      <Card>
        <CardHeader>
          <CardTitle>Submit New Complaint</CardTitle>
          <CardDescription>Fill in the details to register your grievance</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Complaint form will be rendered here...</p>
        </CardContent>
      </Card>
    ),
    pending: (
      <Card>
        <CardHeader>
          <CardTitle>Pending Complaints</CardTitle>
          <CardDescription>Complaints awaiting response</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Pending complaints list...</p>
        </CardContent>
      </Card>
    ),
    resolved: (
      <Card>
        <CardHeader>
          <CardTitle>Resolved Complaints</CardTitle>
          <CardDescription>Successfully closed complaints</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Resolved complaints list...</p>
        </CardContent>
      </Card>
    ),
    profile: (
      <Card>
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
          <CardDescription>Manage your account settings</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Profile settings...</p>
        </CardContent>
      </Card>
    ),
  };

  return contentMap[activeItem] || contentMap.dashboard;
};

// Citizen Dashboard
const CitizenDashboard = () => {
  const [activeItem, setActiveItem] = useState("dashboard");
  
  const user = {
    name: "John Doe",
    email: "john@example.com",
    role: "Citizen",
  };

  const getBreadcrumbs = () => {
    const breadcrumbs = [{ label: "Dashboard", href: "/" }];
    
    if (activeItem !== "dashboard") {
      // Find the item label
      for (const group of citizenMenuItems) {
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

  const handleLogout = () => {
    console.log("Logging out...");
  };

  return (
    <DashboardLayout
      menuItems={citizenMenuItems}
      user={user}
      breadcrumbs={getBreadcrumbs()}
      activeItem={activeItem}
      setActiveItem={setActiveItem}
      onLogout={handleLogout}
    >
      <DashboardContent activeItem={activeItem} />
    </DashboardLayout>
  );
};

export default CitizenDashboard;
