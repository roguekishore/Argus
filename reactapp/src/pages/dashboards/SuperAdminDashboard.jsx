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
  TrendingDown,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Settings,
  PieChart,
  Shield,
  Map,
  Globe,
  Target,
  Award,
  Activity,
} from "lucide-react";

// Super Admin Menu Items
const superAdminMenuItems = [
  {
    label: "Overview",
    items: [
      {
        id: "dashboard",
        label: "Executive Dashboard",
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
      {
        id: "real-time",
        label: "Real-time Monitor",
        icon: <Activity className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "Organization",
    items: [
      {
        id: "municipalities",
        label: "Municipalities",
        icon: <Globe className="h-4 w-4" />,
      },
      {
        id: "departments",
        label: "All Departments",
        icon: <Building className="h-4 w-4" />,
      },
      {
        id: "users",
        label: "User Management",
        icon: <Users className="h-4 w-4" />,
        children: [
          {
            id: "admins",
            label: "Administrators",
            icon: <Shield className="h-4 w-4" />,
          },
          {
            id: "all-staff",
            label: "All Staff",
            icon: <Users className="h-4 w-4" />,
          },
          {
            id: "citizens",
            label: "Citizens",
            icon: <UserPlus className="h-4 w-4" />,
          },
        ],
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
      },
      {
        id: "critical",
        label: "Critical Issues",
        icon: <AlertTriangle className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "Intelligence",
    items: [
      {
        id: "analytics",
        label: "Analytics",
        icon: <PieChart className="h-4 w-4" />,
      },
      {
        id: "reports",
        label: "Reports",
        icon: <BarChart3 className="h-4 w-4" />,
      },
      {
        id: "kpi",
        label: "KPI Dashboard",
        icon: <Target className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        id: "audit-logs",
        label: "Audit Logs",
        icon: <Shield className="h-4 w-4" />,
      },
      {
        id: "settings",
        label: "System Settings",
        icon: <Settings className="h-4 w-4" />,
      },
    ],
  },
];

const SuperAdminDashboard = () => {
  const [activeItem, setActiveItem] = useState("dashboard");
  
  const user = {
    name: "Super Administrator",
    email: "superadmin@gov.in",
    role: "Super Admin",
  };

  const getBreadcrumbs = () => {
    const breadcrumbs = [{ label: "Dashboard", href: "/" }];
    if (activeItem !== "dashboard") {
      for (const group of superAdminMenuItems) {
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
    { title: "Total Complaints", value: "45,678", change: "+12%", up: true, icon: <FileText className="h-5 w-5" /> },
    { title: "Active Municipalities", value: "24", icon: <Globe className="h-5 w-5 text-blue-500" /> },
    { title: "Total Users", value: "12,456", change: "+8%", up: true, icon: <Users className="h-5 w-5 text-green-500" /> },
    { title: "Avg. Resolution", value: "1.8d", change: "-0.3d", up: false, icon: <Clock className="h-5 w-5 text-yellow-500" /> },
  ];

  const topMunicipalities = [
    { name: "Mumbai Municipal Corp", score: 98, complaints: 12450 },
    { name: "Delhi Municipal Corp", score: 94, complaints: 10230 },
    { name: "Bangalore Municipal Corp", score: 91, complaints: 8920 },
    { name: "Chennai Municipal Corp", score: 89, complaints: 7650 },
  ];

  return (
    <DashboardLayout
      menuItems={superAdminMenuItems}
      user={user}
      breadcrumbs={getBreadcrumbs()}
      activeItem={activeItem}
      setActiveItem={setActiveItem}
      onLogout={() => console.log("Logout")}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Executive Dashboard</h2>
            <p className="text-muted-foreground">System-wide performance and analytics.</p>
          </div>
          <Badge variant="outline" className="text-green-600 border-green-600">
            <span className="mr-1 h-2 w-2 rounded-full bg-green-500 inline-block animate-pulse" />
            All Systems Operational
          </Badge>
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
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {stat.up ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-green-500" />
                    )}
                    <span className="text-green-500">{stat.change}</span> vs last month
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Top Performing Municipalities
              </CardTitle>
              <CardDescription>Based on resolution rate & response time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topMunicipalities.map((muni, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                        i === 0 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" :
                        i === 1 ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" :
                        i === 2 ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-medium">{muni.name}</p>
                        <p className="text-xs text-muted-foreground">{muni.complaints.toLocaleString()} complaints</p>
                      </div>
                    </div>
                    <Badge variant="secondary">{muni.score}%</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Critical Alerts</CardTitle>
              <CardDescription>Issues requiring immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { title: "High volume spike in Mumbai", level: "warning", time: "10 min ago" },
                  { title: "SLA breach risk - Delhi Water Dept", level: "critical", time: "25 min ago" },
                  { title: "System performance degradation", level: "warning", time: "1 hr ago" },
                ].map((alert, i) => (
                  <div 
                    key={i} 
                    className={`flex items-center justify-between p-3 border rounded-lg ${
                      alert.level === "critical" 
                        ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950" 
                        : "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`h-4 w-4 ${
                        alert.level === "critical" ? "text-red-500" : "text-yellow-500"
                      }`} />
                      <span className="text-sm font-medium">{alert.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{alert.time}</span>
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

export default SuperAdminDashboard;
