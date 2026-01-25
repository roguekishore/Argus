/**
 * SuperAdminDashboard - Dashboard for Super Administrators
 * 
 * ARCHITECTURE NOTES:
 * - Full visibility like Admin, but no UI restrictions
 * - Can see everything across all municipalities/departments
 * - System-wide oversight with complete access
 * - No artificial limitations on data visibility
 * 
 * DATA FLOW:
 * - useComplaints() fetches all complaints for SUPER_ADMIN role
 * - Full access to users, departments, system config
 * 
 * FUTURE EXTENSIBILITY:
 * - Multi-municipality support
 * - System audit logs
 * - Advanced analytics
 */

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import { Button, Card, CardContent, CardHeader, CardTitle } from "../../components/ui";
import { ComplaintList, DashboardSection, PageHeader, StatsGrid } from "../../components/common";
import { useUser } from "../../context/UserContext";
import { useComplaints } from "../../hooks/useComplaints";
import { useAuth } from "../../hooks/useAuth";
import { departmentsService, usersService } from "../../services";
import { COMPLAINT_STATES, ROLE_DISPLAY_NAMES } from "../../constants/roles";
import {
  LayoutDashboard,
  FileText,
  Building,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Settings,
  RefreshCw,
  Shield,
  Map,
  TrendingUp,
  Activity,
  Globe,
} from "lucide-react";

// =============================================================================
// MENU CONFIGURATION
// Super Admin has complete system access
// =============================================================================
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
    label: "Complaints",
    items: [
      {
        id: "all-complaints",
        label: "All Complaints",
        icon: <FileText className="h-4 w-4" />,
      },
      {
        id: "escalations",
        label: "Escalations",
        icon: <AlertTriangle className="h-4 w-4" />,
      },
      {
        id: "critical",
        label: "Critical Issues",
        icon: <AlertTriangle className="h-4 w-4" />,
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
        label: "All Users",
        icon: <Users className="h-4 w-4" />,
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
        id: "sla-config",
        label: "SLA Configuration",
        icon: <Clock className="h-4 w-4" />,
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

// =============================================================================
// SUPER ADMIN DASHBOARD COMPONENT
// =============================================================================
const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState("dashboard");
  
  // Context and hooks
  const { user: contextUser, role } = useUser();
  const { logout } = useAuth();
  const {
    complaints,
    stats,
    isLoading,
    error,
    refresh,
  } = useComplaints();

  // Local state for system data
  const [departments, setDepartments] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Fetch system data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [deptResponse, usersResponse] = await Promise.all([
          departmentsService.getAll(),
          usersService.getAll()
        ]);
        setDepartments(Array.isArray(deptResponse) ? deptResponse : deptResponse?.data || []);
        setAllUsers(Array.isArray(usersResponse) ? usersResponse : usersResponse?.data || []);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  // ==========================================================================
  // DERIVED DATA
  // Full system visibility - no restrictions
  // ==========================================================================
  const displayStats = useMemo(() => [
    { 
      title: "Total Complaints", 
      value: stats.total?.toString() || complaints.length.toString(), 
      description: "System-wide",
      icon: <FileText className="h-5 w-5" /> 
    },
    { 
      title: "In Progress", 
      value: stats.inProgress?.toString() || "0", 
      description: "Being handled",
      icon: <TrendingUp className="h-5 w-5 text-yellow-500" /> 
    },
    { 
      title: "Escalated", 
      value: complaints.filter(c => c.escalationLevel > 0).length.toString(), 
      description: "Needs attention",
      icon: <AlertTriangle className="h-5 w-5 text-red-500" /> 
    },
    { 
      title: "Departments", 
      value: departments.length.toString(), 
      description: "Active",
      icon: <Building className="h-5 w-5 text-blue-500" /> 
    },
  ], [stats, complaints, departments]);

  // Filter complaints based on active menu item
  const filteredComplaints = useMemo(() => {
    switch (activeItem) {
      case 'escalations':
        return complaints.filter(c => c.escalationLevel > 0);
      case 'critical':
        return complaints.filter(c => 
          c.priority === 'CRITICAL' || c.escalationLevel >= 2
        );
      case 'all-complaints':
      default:
        return complaints;
    }
  }, [complaints, activeItem]);

  // ==========================================================================
  // ACTION HANDLERS
  // Super Admin has full access but typically for oversight
  // ==========================================================================
  
  // View complaint details
  const handleViewDetails = useCallback((complaint) => {
    navigate(`/dashboard/super-admin/complaints/${complaint.complaintId || complaint.id}`);
  }, [navigate]);

  // Logout
  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  // ==========================================================================
  // BREADCRUMB GENERATION
  // ==========================================================================
  const getBreadcrumbs = useCallback(() => {
    const breadcrumbs = [{ label: "Dashboard", href: "/dashboard/super-admin" }];
    
    if (activeItem !== "dashboard") {
      for (const group of superAdminMenuItems) {
        for (const item of group.items) {
          if (item.id === activeItem) {
            breadcrumbs.push({ label: item.label, href: "#" });
          }
        }
      }
    }
    return breadcrumbs;
  }, [activeItem]);

  // Layout user object
  const layoutUser = {
    name: contextUser?.name || 'Super Administrator',
    email: contextUser?.email || '',
    role: ROLE_DISPLAY_NAMES[role] || 'Super Admin',
  };

  // ==========================================================================
  // RENDER CONTENT
  // ==========================================================================
  const renderContent = () => {
    switch (activeItem) {
      // -----------------------------------------------------------------------
      // COMPLAINT LISTS
      // -----------------------------------------------------------------------
      case 'all-complaints':
      case 'escalations':
      case 'critical':
        const titles = {
          'all-complaints': 'All System Complaints',
          'escalations': 'Escalated Complaints',
          'critical': 'Critical Issues',
        };
        const descriptions = {
          'all-complaints': 'Complete view of all complaints across the system',
          'escalations': 'All escalated complaints requiring attention',
          'critical': 'Critical priority complaints and high-level escalations',
        };

        return (
          <div className="space-y-6">
            <PageHeader
              title={titles[activeItem]}
              description={descriptions[activeItem]}
              actions={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              }
            />
            
            <ComplaintList
              complaints={filteredComplaints}
              isLoading={isLoading}
              emptyMessage="No complaints found."
              onViewDetails={handleViewDetails}
            />
          </div>
        );

      // -----------------------------------------------------------------------
      // REAL-TIME MONITOR
      // -----------------------------------------------------------------------
      case 'real-time':
        return (
          <DashboardSection
            title="Real-time System Monitor"
            description="Live view of system activity"
          >
            {/* TODO: Integrate real-time monitoring component */}
            <p className="text-muted-foreground">Real-time monitoring will be rendered here.</p>
          </DashboardSection>
        );

      // -----------------------------------------------------------------------
      // ORGANIZATION SECTIONS
      // -----------------------------------------------------------------------
      case 'municipalities':
        return (
          <DashboardSection
            title="Municipalities"
            description="Manage all municipalities in the system"
          >
            {/* TODO: Integrate municipality management */}
            <p className="text-muted-foreground">Municipality management will be rendered here.</p>
          </DashboardSection>
        );

      case 'departments':
        return (
          <DashboardSection
            title="All Departments"
            description={`${departments.length} departments in the system`}
          >
            <div className="space-y-2">
              {loadingData ? (
                <p className="text-muted-foreground">Loading departments...</p>
              ) : departments.length === 0 ? (
                <p className="text-muted-foreground">No departments found.</p>
              ) : (
                departments.map(dept => (
                  <div key={dept.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-3">
                      <Building className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{dept.name}</p>
                        <p className="text-sm text-muted-foreground">{dept.description || 'No description'}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DashboardSection>
        );

      case 'users':
        return (
          <DashboardSection
            title="All Users"
            description={`${allUsers.length} users in the system`}
          >
            {/* TODO: Integrate full user management */}
            <div className="space-y-2">
              {loadingData ? (
                <p className="text-muted-foreground">Loading users...</p>
              ) : (
                <p className="text-muted-foreground">
                  {allUsers.length} total users. Full user management interface will be rendered here.
                </p>
              )}
            </div>
          </DashboardSection>
        );

      // -----------------------------------------------------------------------
      // CONFIGURATION SECTIONS
      // -----------------------------------------------------------------------
      case 'categories':
        return (
          <DashboardSection
            title="Complaint Categories"
            description="Manage system-wide complaint categories"
          >
            <p className="text-muted-foreground">Category management interface will be rendered here.</p>
          </DashboardSection>
        );

      case 'sla-config':
        return (
          <DashboardSection
            title="SLA Configuration"
            description="Configure global SLA rules"
          >
            <p className="text-muted-foreground">SLA configuration interface will be rendered here.</p>
          </DashboardSection>
        );

      // -----------------------------------------------------------------------
      // SYSTEM SECTIONS
      // -----------------------------------------------------------------------
      case 'audit-logs':
        return (
          <DashboardSection
            title="Audit Logs"
            description="View system-wide audit trail"
          >
            {/* TODO: Integrate audit log viewer */}
            <p className="text-muted-foreground">Audit logs will be rendered here.</p>
          </DashboardSection>
        );

      case 'settings':
        return (
          <DashboardSection
            title="System Settings"
            description="Configure global system settings"
          >
            <p className="text-muted-foreground">System settings interface will be rendered here.</p>
          </DashboardSection>
        );

      // -----------------------------------------------------------------------
      // DASHBOARD (DEFAULT)
      // -----------------------------------------------------------------------
      default:
        const escalatedComplaints = complaints.filter(c => c.escalationLevel > 0);
        const criticalComplaints = complaints.filter(c => 
          c.priority === 'CRITICAL' || c.escalationLevel >= 2
        );
        
        return (
          <div className="space-y-6">
            <PageHeader
              title="Super Admin Dashboard"
              description="Complete system oversight and control"
              actions={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              }
            />

            {/* Stats Grid */}
            <StatsGrid stats={displayStats} />

            {/* Critical Alert */}
            {criticalComplaints.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-red-800 dark:text-red-400">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">
                      {criticalComplaints.length} critical issue{criticalComplaints.length > 1 ? 's' : ''} requiring attention
                    </span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setActiveItem('critical')}
                  >
                    View Critical
                  </Button>
                </div>
              </div>
            )}

            {/* System Overview Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="cursor-pointer hover:shadow-md" onClick={() => setActiveItem('departments')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building className="h-5 w-5" />
                    Departments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{departments.length}</p>
                  <p className="text-sm text-muted-foreground">Active departments</p>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-md" onClick={() => setActiveItem('users')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-5 w-5" />
                    Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{allUsers.length}</p>
                  <p className="text-sm text-muted-foreground">Total users</p>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-md" onClick={() => setActiveItem('escalations')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5" />
                    Escalations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{escalatedComplaints.length}</p>
                  <p className="text-sm text-muted-foreground">Require attention</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Complaints */}
            <DashboardSection
              title="Recent System Complaints"
              description="Latest complaints across all departments"
              action={
                <Button 
                  variant="link" 
                  size="sm"
                  onClick={() => setActiveItem('all-complaints')}
                >
                  View All ({complaints.length})
                </Button>
              }
            >
              <ComplaintList
                complaints={complaints.slice(0, 5)}
                isLoading={isLoading}
                emptyMessage="No complaints in the system."
                compact={true}
                onViewDetails={handleViewDetails}
              />
            </DashboardSection>
          </div>
        );
    }
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <DashboardLayout
      menuItems={superAdminMenuItems}
      user={layoutUser}
      breadcrumbs={getBreadcrumbs()}
      activeItem={activeItem}
      setActiveItem={setActiveItem}
      onLogout={handleLogout}
    >
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}
      {renderContent()}
    </DashboardLayout>
  );
};

export default SuperAdminDashboard;
