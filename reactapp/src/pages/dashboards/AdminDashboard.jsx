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
import { departmentsService, complaintsService } from "../../services";
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
  Route,
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
      {
        id: "pending-routing",
        label: "Pending Routing",
        icon: <Shield className="h-4 w-4" />,
        badge: true, // Will show count badge
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
  
  // State for pending routing complaints
  const [pendingRoutingComplaints, setPendingRoutingComplaints] = useState([]);
  const [pendingRoutingCount, setPendingRoutingCount] = useState(0);
  const [routingLoading, setRoutingLoading] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [routingReason, setRoutingReason] = useState("");
  const [routingError, setRoutingError] = useState(null);

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

  // Fetch pending routing complaints
  useEffect(() => {
    const fetchPendingRouting = async () => {
      try {
        const [complaintsData, countData] = await Promise.all([
          complaintsService.getPendingRouting(),
          complaintsService.getPendingRoutingCount()
        ]);
        setPendingRoutingComplaints(Array.isArray(complaintsData) ? complaintsData : []);
        setPendingRoutingCount(countData?.pendingCount || 0);
      } catch (err) {
        console.error('Failed to fetch pending routing:', err);
      }
    };
    fetchPendingRouting();
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
      title: "Pending Routing", 
      value: pendingRoutingCount.toString(), 
      description: "Low AI confidence",
      icon: <Route className="h-5 w-5 text-orange-500" /> 
    },
    { 
      title: "Escalated", 
      value: stats.escalated?.toString() || complaints.filter(c => c.escalationLevel > 0).length.toString(), 
      description: "Needs attention",
      icon: <AlertTriangle className="h-5 w-5 text-red-500" /> 
    },
  ], [stats, complaints, pendingRoutingCount]);

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
  // Admin has READ-ONLY access to complaints, except for manual routing
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

  // Manual Routing Handlers
  const handleOpenRouting = useCallback((complaint) => {
    setSelectedComplaint(complaint);
    setSelectedDepartment("");
    setRoutingReason("");
    setRoutingError(null);
  }, []);

  const handleCloseRouting = useCallback(() => {
    setSelectedComplaint(null);
    setSelectedDepartment("");
    setRoutingReason("");
    setRoutingError(null);
  }, []);

  const handleSubmitRouting = useCallback(async () => {
    if (!selectedComplaint || !selectedDepartment) {
      setRoutingError("Please select a department");
      return;
    }

    setRoutingLoading(true);
    setRoutingError(null);

    try {
      await complaintsService.manualRoute(
        selectedComplaint.complaintId || selectedComplaint.id,
        {
          departmentId: parseInt(selectedDepartment),
          adminId: userId,
          reason: routingReason || "Admin manual routing"
        }
      );

      // Refresh pending routing list
      const [complaintsData, countData] = await Promise.all([
        complaintsService.getPendingRouting(),
        complaintsService.getPendingRoutingCount()
      ]);
      setPendingRoutingComplaints(Array.isArray(complaintsData) ? complaintsData : []);
      setPendingRoutingCount(countData?.pendingCount || 0);

      handleCloseRouting();
    } catch (err) {
      console.error('Failed to route complaint:', err);
      setRoutingError("Failed to route complaint. Please try again.");
    } finally {
      setRoutingLoading(false);
    }
  }, [selectedComplaint, selectedDepartment, routingReason, userId, handleCloseRouting]);

  const refreshPendingRouting = useCallback(async () => {
    setRoutingLoading(true);
    try {
      const [complaintsData, countData] = await Promise.all([
        complaintsService.getPendingRouting(),
        complaintsService.getPendingRoutingCount()
      ]);
      setPendingRoutingComplaints(Array.isArray(complaintsData) ? complaintsData : []);
      setPendingRoutingCount(countData?.pendingCount || 0);
    } catch (err) {
      console.error('Failed to refresh pending routing:', err);
    } finally {
      setRoutingLoading(false);
    }
  }, []);

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
      // PENDING ROUTING (Low AI Confidence)
      // -----------------------------------------------------------------------
      case 'pending-routing':
        return (
          <div className="space-y-6">
            <PageHeader
              title="Pending Manual Routing"
              description="Complaints with low AI confidence that need manual department assignment"
              actions={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshPendingRouting}
                  disabled={routingLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${routingLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              }
            />

            {/* Info banner */}
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-md text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400">
              <div className="flex items-center gap-2">
                <Route className="h-4 w-4" />
                <span className="font-medium">Manual Routing Required</span>
              </div>
              <p className="text-sm mt-1">
                These complaints have AI confidence below 70%. Review and assign to the correct department.
              </p>
            </div>

            {/* Pending complaints list */}
            {pendingRoutingComplaints.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <p className="text-lg font-medium">All Clear!</p>
                  <p className="text-muted-foreground">No complaints pending manual routing.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingRoutingComplaints.map((complaint) => (
                  <Card key={complaint.complaintId} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium truncate">#{complaint.complaintId}: {complaint.title}</span>
                            <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-800 rounded-full dark:bg-orange-900 dark:text-orange-300">
                              AI: {((complaint.aiConfidence || 0) * 100).toFixed(0)}%
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {complaint.description}
                          </p>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span>📍 {complaint.location || 'No location'}</span>
                            <span>📁 {complaint.categoryName || 'Unknown'}</span>
                            <span>🏢 {complaint.departmentName || 'Pending'}</span>
                          </div>
                          {complaint.aiReasoning && (
                            <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                              <span className="font-medium">AI Reasoning: </span>
                              {complaint.aiReasoning}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleOpenRouting(complaint)}
                          >
                            <Route className="h-4 w-4 mr-1" />
                            Assign
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewDetails(complaint)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Routing Modal */}
            {selectedComplaint && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <Card className="w-full max-w-md mx-4">
                  <CardHeader>
                    <CardTitle>Route Complaint #{selectedComplaint.complaintId}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-1">Complaint</p>
                      <p className="text-sm text-muted-foreground">{selectedComplaint.title}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium mb-1">AI Suggestion</p>
                      <p className="text-sm text-muted-foreground">
                        Category: {selectedComplaint.categoryName || 'Unknown'} 
                        (Confidence: {((selectedComplaint.aiConfidence || 0) * 100).toFixed(0)}%)
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1 block">Select Department *</label>
                      <select
                        className="w-full p-2 border rounded-md bg-background"
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                      >
                        <option value="">-- Select Department --</option>
                        {departments
                          .filter(dept => dept.name !== 'ADMIN')
                          .map(dept => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name}
                            </option>
                          ))
                        }
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1 block">Reason (optional)</label>
                      <textarea
                        className="w-full p-2 border rounded-md bg-background min-h-[80px]"
                        placeholder="Why is this department the correct choice?"
                        value={routingReason}
                        onChange={(e) => setRoutingReason(e.target.value)}
                      />
                    </div>

                    {routingError && (
                      <div className="p-2 bg-red-50 border border-red-200 rounded text-red-800 text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                        {routingError}
                      </div>
                    )}

                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={handleCloseRouting}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSubmitRouting} 
                        disabled={routingLoading || !selectedDepartment}
                      >
                        {routingLoading ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Routing...
                          </>
                        ) : (
                          <>
                            <Route className="h-4 w-4 mr-2" />
                            Route to Department
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
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
