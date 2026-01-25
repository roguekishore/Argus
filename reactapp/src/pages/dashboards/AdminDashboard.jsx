/**
 * AdminDashboard - Dashboard for System Administrators
 * 
 * ARCHITECTURE NOTES:
 * - Primary focus: System oversight
 * - Sections: All complaints (read-only), Escalations, Management entry points
 * - Admin CANNOT change complaint state directly
 * - Provides entry points to: User management, SLA config, Categories
 * 
 * DATA FLOW:
 * - useComplaints() fetches all complaints for ADMIN role
 * - Management data (departments, users) fetched separately
 * - No direct complaint actions - admin is oversight role
 * 
 * FUTURE EXTENSIBILITY:
 * - Audit logs viewer
 * - System notifications config
 * - Analytics dashboard
 */

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import { Button, Card, CardContent, CardHeader, CardTitle } from "../../components/ui";
import { ComplaintList, DashboardSection, PageHeader, StatsGrid } from "../../components/common";
import { useUser } from "../../context/UserContext";
import { useComplaints } from "../../hooks/useComplaints";
import { useAuth } from "../../hooks/useAuth";
import { departmentsService } from "../../services";
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
  Eye,
} from "lucide-react";

// =============================================================================
// MENU CONFIGURATION
// Admin has system-wide oversight and management access
// =============================================================================
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
    label: "Complaints",
    items: [
      {
        id: "all-complaints",
        label: "All Complaints",
        icon: <FileText className="h-4 w-4" />,
        children: [
          {
            id: "complaints-all",
            label: "View All",
            icon: <Eye className="h-4 w-4" />,
          },
          {
            id: "complaints-filed",
            label: "Filed",
            icon: <Clock className="h-4 w-4" />,
          },
          {
            id: "complaints-resolved",
            label: "Resolved",
            icon: <CheckCircle2 className="h-4 w-4" />,
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
    label: "Management",
    items: [
      {
        id: "departments",
        label: "Departments",
        icon: <Building className="h-4 w-4" />,
      },
      {
        id: "users",
        label: "Users",
        icon: <Users className="h-4 w-4" />,
      },
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
        id: "settings",
        label: "Settings",
        icon: <Settings className="h-4 w-4" />,
      },
    ],
  },
];

// =============================================================================
// MANAGEMENT CARD COMPONENT
// Quick access cards for management sections
// =============================================================================
const ManagementCard = ({ icon, title, description, onClick }) => (
  <Card 
    className="cursor-pointer hover:shadow-md transition-shadow"
    onClick={onClick}
  >
    <CardHeader className="flex flex-row items-center gap-4 pb-2">
      <div className="p-2 bg-primary/10 rounded-lg">
        {icon}
      </div>
      <div>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </CardHeader>
  </Card>
);

// =============================================================================
// ADMIN DASHBOARD COMPONENT
// =============================================================================
const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState("dashboard");
  
  // Context and hooks
  const { userId, role, email, name } = useUser();
  const { logout } = useAuth();
  const {
    complaints,
    stats,
    isLoading,
    error,
    refresh,
  } = useComplaints();

  // Local state for management data
  const [departments, setDepartments] = useState([]);

  // Fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const data = await departmentsService.getAll();
        setDepartments(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch departments:', err);
      }
    };
    fetchDepartments();
  }, []);

  // ==========================================================================
  // DERIVED DATA
  // ==========================================================================
  const displayStats = useMemo(() => [
    { 
      title: "Total Complaints", 
      value: stats.total?.toString() || "0", 
      description: "System-wide",
      icon: <FileText className="h-5 w-5" /> 
    },
    { 
      title: "Filed", 
      value: stats.filed?.toString() || "0", 
      description: "Awaiting assignment",
      icon: <Clock className="h-5 w-5 text-blue-500" /> 
    },
    { 
      title: "In Progress", 
      value: stats.inProgress?.toString() || "0", 
      description: "Being handled",
      icon: <TrendingUp className="h-5 w-5 text-yellow-500" /> 
    },
    { 
      title: "Escalated", 
      value: stats.escalated?.toString() || complaints.filter(c => c.escalationLevel > 0).length.toString(), 
      description: "Needs attention",
      icon: <AlertTriangle className="h-5 w-5 text-red-500" /> 
    },
  ], [stats, complaints]);

  // Filter complaints based on active menu item
  const filteredComplaints = useMemo(() => {
    switch (activeItem) {
      case 'complaints-filed':
        return complaints.filter(c => c.state === COMPLAINT_STATES.FILED);
      case 'complaints-resolved':
        return complaints.filter(c => 
          [COMPLAINT_STATES.RESOLVED, COMPLAINT_STATES.CLOSED].includes(c.state)
        );
      case 'escalations':
        return complaints.filter(c => c.escalationLevel > 0);
      case 'complaints-all':
      default:
        return complaints;
    }
  }, [complaints, activeItem]);

  // ==========================================================================
  // ACTION HANDLERS
  // Admin has READ-ONLY access to complaints
  // ==========================================================================
  
  // View complaint details
  const handleViewDetails = useCallback((complaint) => {
    navigate(`/dashboard/admin/complaints/${complaint.complaintId || complaint.id}`);
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
    const breadcrumbs = [{ label: "Dashboard", href: "/dashboard/admin" }];
    
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
  }, [activeItem]);

  // Layout user object
  const layoutUser = {
    name: name || 'Administrator',
    email: email || 'admin@municipality.gov',
    role: ROLE_DISPLAY_NAMES[role] || 'Administrator',
  };

  // ==========================================================================
  // RENDER CONTENT
  // ==========================================================================
  const renderContent = () => {
    switch (activeItem) {
      // -----------------------------------------------------------------------
      // COMPLAINT LISTS (Read-Only)
      // -----------------------------------------------------------------------
      case 'complaints-all':
      case 'complaints-filed':
      case 'complaints-resolved':
        const titles = {
          'complaints-all': 'All Complaints',
          'complaints-filed': 'Filed Complaints',
          'complaints-resolved': 'Resolved Complaints',
        };
        const descriptions = {
          'complaints-all': 'Complete view of all complaints in the system',
          'complaints-filed': 'Complaints awaiting assignment and processing',
          'complaints-resolved': 'Complaints that have been resolved or closed',
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
            
            {/* Read-only notice */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span className="font-medium">Administrative View</span>
              </div>
              <p className="text-sm mt-1">
                Complaint state changes are handled by assigned staff and department heads.
              </p>
            </div>
            
            <ComplaintList
              complaints={filteredComplaints}
              isLoading={isLoading}
              emptyMessage="No complaints found."
              onViewDetails={handleViewDetails}
              // No action handlers - read-only view
            />
          </div>
        );

      // -----------------------------------------------------------------------
      // ESCALATIONS
      // -----------------------------------------------------------------------
      case 'escalations':
        return (
          <div className="space-y-6">
            <PageHeader
              title="Escalated Complaints"
              description="Complaints that have been escalated for attention"
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
              emptyMessage="No escalated complaints."
              onViewDetails={handleViewDetails}
            />
          </div>
        );

      // -----------------------------------------------------------------------
      // MANAGEMENT SECTIONS (Entry Points)
      // -----------------------------------------------------------------------
      case 'departments':
        return (
          <DashboardSection
            title="Department Management"
            description="View and manage departments"
          >
            <div className="space-y-2">
              {departments.length === 0 ? (
                <p className="text-muted-foreground">Loading departments...</p>
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
            title="User Management"
            description="Manage system users and roles"
          >
            {/* TODO: Integrate UserManagement component */}
            <p className="text-muted-foreground">User management interface will be rendered here.</p>
          </DashboardSection>
        );

      case 'categories':
        return (
          <DashboardSection
            title="Complaint Categories"
            description="Manage complaint categories and subcategories"
          >
            {/* TODO: Integrate CategoryManagement component */}
            <p className="text-muted-foreground">Category management interface will be rendered here.</p>
          </DashboardSection>
        );

      case 'sla-config':
        return (
          <DashboardSection
            title="SLA Configuration"
            description="Configure SLA rules for complaint resolution"
          >
            {/* TODO: Integrate SLAConfig component */}
            <p className="text-muted-foreground">SLA configuration interface will be rendered here.</p>
          </DashboardSection>
        );

      case 'settings':
        return (
          <DashboardSection
            title="System Settings"
            description="Configure system-wide settings"
          >
            {/* TODO: Integrate SystemSettings component */}
            <p className="text-muted-foreground">System settings interface will be rendered here.</p>
          </DashboardSection>
        );

      // -----------------------------------------------------------------------
      // DASHBOARD (DEFAULT)
      // -----------------------------------------------------------------------
      default:
        const escalatedComplaints = complaints.filter(c => c.escalationLevel > 0);
        
        return (
          <div className="space-y-6">
            <PageHeader
              title="Admin Dashboard"
              description="System oversight and management"
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

            {/* Escalation Alert */}
            {escalatedComplaints.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-red-800 dark:text-red-400">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">
                      {escalatedComplaints.length} escalated complaint{escalatedComplaints.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setActiveItem('escalations')}
                  >
                    View Escalations
                  </Button>
                </div>
              </div>
            )}

            {/* Management Quick Access */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Management</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <ManagementCard
                  icon={<Users className="h-5 w-5" />}
                  title="Users"
                  description="Manage users"
                  onClick={() => setActiveItem('users')}
                />
                <ManagementCard
                  icon={<Building className="h-5 w-5" />}
                  title="Departments"
                  description="View departments"
                  onClick={() => setActiveItem('departments')}
                />
                <ManagementCard
                  icon={<Map className="h-5 w-5" />}
                  title="Categories"
                  description="Manage categories"
                  onClick={() => setActiveItem('categories')}
                />
                <ManagementCard
                  icon={<Clock className="h-5 w-5" />}
                  title="SLA Config"
                  description="Configure SLAs"
                  onClick={() => setActiveItem('sla-config')}
                />
              </div>
            </div>

            {/* Recent Complaints */}
            <DashboardSection
              title="Recent Complaints"
              description="Latest complaints in the system"
              action={
                <Button 
                  variant="link" 
                  size="sm"
                  onClick={() => setActiveItem('complaints-all')}
                >
                  View All
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
      menuItems={adminMenuItems}
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

export default AdminDashboard;
