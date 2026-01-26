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
import { ComplaintList, ComplaintDetailPage, DashboardSection, PageHeader, StatsGrid } from "../../components/common";
import { UserManagement, DepartmentManagement, CategoryManagement, SLAManagement } from "../../components/admin";
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
  RefreshCw,
  Shield,
  Map,
  TrendingUp,
  Eye,
  Route,
  Search,
  X,
  User,
  Folder,
  Timer,
  Filter,
  ArrowUpDown,
  SlidersHorizontal,
  Trophy,
} from "lucide-react";
import { CitizenLeaderboard, StaffLeaderboard } from "../../components/gamification";
import { usersService, categoriesService, slaService } from "../../services";

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
    label: "Gamification",
    items: [
      {
        id: "leaderboards",
        label: "Leaderboards",
        icon: <Trophy className="h-4 w-4" />,
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
  
  // Complaint detail view state
  const [selectedComplaintId, setSelectedComplaintId] = useState(null);
  const [previousActiveItem, setPreviousActiveItem] = useState("complaints-all");
  
  // State for pending routing complaints
  const [pendingRoutingComplaints, setPendingRoutingComplaints] = useState([]);
  const [pendingRoutingCount, setPendingRoutingCount] = useState(0);
  const [routingLoading, setRoutingLoading] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [routingReason, setRoutingReason] = useState("");
  const [routingError, setRoutingError] = useState(null);

  // Global Search State
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({
    users: [],
    complaints: [],
    categories: [],
    slaConfigs: [],
    departments: [],
  });
  const [searchLoading, setSearchLoading] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [allSlaConfigs, setAllSlaConfigs] = useState([]);
  const [searchFilter, setSearchFilter] = useState("all"); // all, users, complaints, categories, sla, departments
  const [searchSort, setSearchSort] = useState("relevance"); // relevance, name, date, status

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

  // Fetch all searchable data (users, categories, SLAs)
  useEffect(() => {
    const fetchSearchData = async () => {
      try {
        const [usersData, categoriesData, slaData] = await Promise.all([
          usersService.getAll(),
          categoriesService.getAll(),
          slaService.getAll()
        ]);
        setAllUsers(Array.isArray(usersData) ? usersData : []);
        setAllCategories(Array.isArray(categoriesData) ? categoriesData : []);
        setAllSlaConfigs(Array.isArray(slaData) ? slaData : []);
      } catch (err) {
        console.error('Failed to fetch search data:', err);
      }
    };
    fetchSearchData();
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

  // Keyboard shortcuts for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+K or Cmd+K to open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      // ESC to close search
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen]);

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
  // Note: Backend returns 'status' property, not 'state'
  const filteredComplaints = useMemo(() => {
    switch (activeItem) {
      case 'complaints-filed':
        return complaints.filter(c => c.status === COMPLAINT_STATES.FILED);
      case 'complaints-resolved':
        return complaints.filter(c => 
          [COMPLAINT_STATES.RESOLVED, COMPLAINT_STATES.CLOSED].includes(c.status)
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
  // Admin can only CANCEL complaints, not change to other states
  // ==========================================================================
  
  // View complaint details
  const handleViewDetails = useCallback((complaint) => {
    setSelectedComplaintId(complaint.complaintId || complaint.id);
    setPreviousActiveItem(activeItem);
    setActiveItem('complaint-detail');
  }, [activeItem]);

  // Cancel a complaint (Admin can cancel any complaint)
  const handleCancelComplaint = useCallback(async (complaintId) => {
    if (!window.confirm('Are you sure you want to cancel this complaint? This action cannot be undone.')) {
      return;
    }
    
    try {
      await complaintsService.cancel(complaintId, 'Cancelled by Administrator');
      await refresh();
      // Navigate back to the list after cancellation
      setSelectedComplaintId(null);
      setActiveItem(previousActiveItem);
    } catch (err) {
      console.error('Failed to cancel complaint:', err);
      alert(err.message || 'Failed to cancel complaint. Please try again.');
    }
  }, [refresh, previousActiveItem]);

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
  // GLOBAL SEARCH
  // ==========================================================================
  
  // Sort helper functions
  const sortByName = (a, b) => (a.name || a.title || '').localeCompare(b.name || b.title || '');
  const sortByDate = (a, b) => new Date(b.createdTime || b.createdAt || 0) - new Date(a.createdTime || a.createdAt || 0);
  const sortByStatus = (a, b) => (a.status || '').localeCompare(b.status || '');

  const performSearch = useCallback((query, filter, sort) => {
    if (!query || query.trim().length < 2) {
      setSearchResults({ users: [], complaints: [], categories: [], slaConfigs: [], departments: [] });
      return;
    }

    setSearchLoading(true);
    const lowerQuery = query.toLowerCase().trim();
    const maxResults = filter === 'all' ? 5 : 15;

    // Search users
    let matchedUsers = (filter === 'all' || filter === 'users') ? allUsers.filter(user => 
      user.name?.toLowerCase().includes(lowerQuery) ||
      user.email?.toLowerCase().includes(lowerQuery) ||
      user.mobile?.toLowerCase().includes(lowerQuery) ||
      user.userType?.toLowerCase().includes(lowerQuery)
    ) : [];

    // Search complaints
    let matchedComplaints = (filter === 'all' || filter === 'complaints') ? complaints.filter(c =>
      c.title?.toLowerCase().includes(lowerQuery) ||
      c.description?.toLowerCase().includes(lowerQuery) ||
      c.location?.toLowerCase().includes(lowerQuery) ||
      c.complaintId?.toString().includes(lowerQuery) ||
      c.categoryName?.toLowerCase().includes(lowerQuery) ||
      c.status?.toLowerCase().includes(lowerQuery)
    ) : [];

    // Search categories
    let matchedCategories = (filter === 'all' || filter === 'categories') ? allCategories.filter(cat =>
      cat.name?.toLowerCase().includes(lowerQuery) ||
      cat.description?.toLowerCase().includes(lowerQuery) ||
      cat.keywords?.toLowerCase().includes(lowerQuery)
    ) : [];

    // Search SLA configs
    let matchedSlaConfigs = (filter === 'all' || filter === 'sla') ? allSlaConfigs.filter(sla =>
      sla.categoryName?.toLowerCase().includes(lowerQuery) ||
      sla.departmentName?.toLowerCase().includes(lowerQuery) ||
      sla.basePriority?.toLowerCase().includes(lowerQuery)
    ) : [];

    // Search departments
    let matchedDepartments = (filter === 'all' || filter === 'departments') ? departments.filter(dept =>
      dept.name?.toLowerCase().includes(lowerQuery) ||
      dept.description?.toLowerCase().includes(lowerQuery)
    ) : [];

    // Apply sorting
    if (sort === 'name') {
      matchedUsers = matchedUsers.sort(sortByName);
      matchedComplaints = matchedComplaints.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      matchedCategories = matchedCategories.sort(sortByName);
      matchedSlaConfigs = matchedSlaConfigs.sort((a, b) => (a.categoryName || '').localeCompare(b.categoryName || ''));
      matchedDepartments = matchedDepartments.sort(sortByName);
    } else if (sort === 'date') {
      matchedUsers = matchedUsers.sort(sortByDate);
      matchedComplaints = matchedComplaints.sort(sortByDate);
      matchedCategories = matchedCategories.sort(sortByDate);
      matchedSlaConfigs = matchedSlaConfigs.sort(sortByDate);
      matchedDepartments = matchedDepartments.sort(sortByDate);
    } else if (sort === 'status') {
      matchedComplaints = matchedComplaints.sort(sortByStatus);
      matchedUsers = matchedUsers.sort((a, b) => (a.userType || '').localeCompare(b.userType || ''));
    }

    setSearchResults({
      users: matchedUsers.slice(0, maxResults),
      complaints: matchedComplaints.slice(0, maxResults),
      categories: matchedCategories.slice(0, maxResults),
      slaConfigs: matchedSlaConfigs.slice(0, maxResults),
      departments: matchedDepartments.slice(0, maxResults),
    });
    setSearchLoading(false);
  }, [allUsers, complaints, allCategories, allSlaConfigs, departments]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery, searchFilter, searchSort);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchFilter, searchSort, performSearch]);

  const handleSearchSelect = useCallback((type, item) => {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchFilter("all");
    setSearchSort("relevance");
    
    switch (type) {
      case 'complaint':
        handleViewDetails(item);
        break;
      case 'user':
        setActiveItem('users');
        break;
      case 'category':
        setActiveItem('categories');
        break;
      case 'sla':
        setActiveItem('sla-config');
        break;
      case 'department':
        setActiveItem('departments');
        break;
      default:
        break;
    }
  }, [handleViewDetails]);

  const totalResults = useMemo(() => 
    searchResults.users.length + 
    searchResults.complaints.length + 
    searchResults.categories.length + 
    searchResults.slaConfigs.length + 
    searchResults.departments.length
  , [searchResults]);

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
      // COMPLAINT DETAIL VIEW
      // Admin can only cancel complaints, not change to other states
      // -----------------------------------------------------------------------
      case 'complaint-detail':
        return (
          <ComplaintDetailPage
            complaintId={selectedComplaintId}
            onCancel={handleCancelComplaint}
            onBack={() => {
              setSelectedComplaintId(null);
              setActiveItem(previousActiveItem);
            }}
            role="admin"
          />
        );

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
      // MANAGEMENT SECTIONS
      // -----------------------------------------------------------------------
      case 'departments':
        return <DepartmentManagement />;

      case 'users':
        return <UserManagement />;

      case 'categories':
        return <CategoryManagement />;

      case 'sla-config':
        return <SLAManagement />;

      // -----------------------------------------------------------------------
      // LEADERBOARDS
      // -----------------------------------------------------------------------
      case 'leaderboards':
        return (
          <div className="space-y-6">
            <PageHeader
              title="Gamification Leaderboards"
              description="View citizen engagement and staff performance rankings"
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CitizenLeaderboard limit={10} />
              <StaffLeaderboard limit={10} />
            </div>
          </div>
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
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchOpen(true)}
                    className="gap-2"
                  >
                    <Search className="h-4 w-4" />
                    Search
                    <kbd className="hidden md:inline-flex px-1.5 py-0.5 bg-muted rounded text-xs font-mono">⌘K</kbd>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refresh}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              }
            />

            {/* Global Search Modal - Command Palette Style */}
            {searchOpen && (
              <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh] z-50"
                onClick={(e) => { if (e.target === e.currentTarget) { setSearchOpen(false); setSearchQuery(""); setSearchFilter("all"); setSearchSort("relevance"); } }}
              >
                <div className="w-full max-w-2xl mx-4 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
                  {/* Search Input */}
                  <div className="flex items-center border-b border-border px-4">
                    <Search className="h-5 w-5 text-muted-foreground shrink-0" />
                    <input
                      type="text"
                      placeholder="Search users, complaints, categories, SLAs..."
                      className="flex-1 h-14 px-4 bg-transparent text-base placeholder:text-muted-foreground focus:outline-none"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                    />
                    <button 
                      onClick={() => { setSearchOpen(false); setSearchQuery(""); setSearchFilter("all"); setSearchSort("relevance"); }}
                      className="p-1.5 rounded-md hover:bg-muted transition-colors"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>

                  {/* Filter Tabs & Sort */}
                  <div className="flex items-center justify-between border-b border-border px-2 py-2 bg-muted/30">
                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1 overflow-x-auto">
                      {[
                        { id: 'all', label: 'All', icon: <SlidersHorizontal className="h-3 w-3" /> },
                        { id: 'users', label: 'Users', icon: <User className="h-3 w-3" /> },
                        { id: 'complaints', label: 'Complaints', icon: <FileText className="h-3 w-3" /> },
                        { id: 'categories', label: 'Categories', icon: <Folder className="h-3 w-3" /> },
                        { id: 'sla', label: 'SLA', icon: <Timer className="h-3 w-3" /> },
                        { id: 'departments', label: 'Departments', icon: <Building className="h-3 w-3" /> },
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setSearchFilter(tab.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                            searchFilter === tab.id
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          }`}
                        >
                          {tab.icon}
                          {tab.label}
                        </button>
                      ))}
                    </div>
                    
                    {/* Sort Dropdown */}
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                      <select
                        value={searchSort}
                        onChange={(e) => setSearchSort(e.target.value)}
                        className="text-xs bg-transparent border border-border rounded-md px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                      >
                        <option value="relevance">Relevance</option>
                        <option value="name">Name A-Z</option>
                        <option value="date">Newest First</option>
                        <option value="status">Status</option>
                      </select>
                    </div>
                  </div>

                  {/* Search Results */}
                  <div className="max-h-[45vh] overflow-y-auto">
                    {searchQuery.length < 2 ? (
                      <div className="py-14 px-4 text-center">
                        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                          <Search className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground">Search across your system</p>
                        <p className="text-xs text-muted-foreground mt-1">Find users, complaints, categories, SLAs, and departments</p>
                      </div>
                    ) : searchLoading ? (
                      <div className="py-14 text-center">
                        <RefreshCw className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mt-3">Searching...</p>
                      </div>
                    ) : totalResults === 0 ? (
                      <div className="py-14 px-4 text-center">
                        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                          <Search className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground">No results found</p>
                        <p className="text-xs text-muted-foreground mt-1">Try a different filter or search term</p>
                      </div>
                    ) : (
                      <div className="py-2">
                        {/* Users Results */}
                        {searchResults.users.length > 0 && (
                          <div className="px-2 mb-2">
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                              <span>Users</span>
                              <span className="text-[10px] font-normal">{searchResults.users.length} result{searchResults.users.length > 1 ? 's' : ''}</span>
                            </div>
                            {searchResults.users.map(user => (
                              <div
                                key={user.id}
                                className="flex items-center gap-3 px-3 py-2.5 mx-1 rounded-lg cursor-pointer hover:bg-accent transition-colors group"
                                onClick={() => handleSearchSelect('user', user)}
                              >
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                  <User className="h-4 w-4 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                </div>
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground uppercase">
                                  {user.userType}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Complaints Results */}
                        {searchResults.complaints.length > 0 && (
                          <div className="px-2 mb-2">
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                              <span>Complaints</span>
                              <span className="text-[10px] font-normal">{searchResults.complaints.length} result{searchResults.complaints.length > 1 ? 's' : ''}</span>
                            </div>
                            {searchResults.complaints.map(c => (
                              <div
                                key={c.complaintId}
                                className="flex items-center gap-3 px-3 py-2.5 mx-1 rounded-lg cursor-pointer hover:bg-accent transition-colors group"
                                onClick={() => handleSearchSelect('complaint', c)}
                              >
                                <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                                  <FileText className="h-4 w-4 text-orange-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">#{c.complaintId}: {c.title}</p>
                                  <p className="text-xs text-muted-foreground truncate">{c.description}</p>
                                </div>
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase ${
                                  c.status === 'RESOLVED' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
                                  c.status === 'CLOSED' ? 'bg-gray-500/10 text-gray-600 dark:text-gray-400' :
                                  c.status === 'FILED' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                                  'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                                }`}>{c.status?.replace('_', ' ')}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Categories Results */}
                        {searchResults.categories.length > 0 && (
                          <div className="px-2 mb-2">
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                              <span>Categories</span>
                              <span className="text-[10px] font-normal">{searchResults.categories.length} result{searchResults.categories.length > 1 ? 's' : ''}</span>
                            </div>
                            {searchResults.categories.map(cat => (
                              <div
                                key={cat.id}
                                className="flex items-center gap-3 px-3 py-2.5 mx-1 rounded-lg cursor-pointer hover:bg-accent transition-colors group"
                                onClick={() => handleSearchSelect('category', cat)}
                              >
                                <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                                  <Folder className="h-4 w-4 text-purple-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground">{cat.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{cat.description || 'No description'}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* SLA Results */}
                        {searchResults.slaConfigs.length > 0 && (
                          <div className="px-2 mb-2">
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                              <span>SLA Configuration</span>
                              <span className="text-[10px] font-normal">{searchResults.slaConfigs.length} result{searchResults.slaConfigs.length > 1 ? 's' : ''}</span>
                            </div>
                            {searchResults.slaConfigs.map(sla => (
                              <div
                                key={sla.id}
                                className="flex items-center gap-3 px-3 py-2.5 mx-1 rounded-lg cursor-pointer hover:bg-accent transition-colors group"
                                onClick={() => handleSearchSelect('sla', sla)}
                              >
                                <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0">
                                  <Timer className="h-4 w-4 text-cyan-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground">{sla.categoryName || 'Unknown'}</p>
                                  <p className="text-xs text-muted-foreground">{sla.departmentName} • {sla.slaDays} days</p>
                                </div>
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground uppercase">
                                  {sla.basePriority}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Departments Results */}
                        {searchResults.departments.length > 0 && (
                          <div className="px-2 mb-2">
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                              <span>Departments</span>
                              <span className="text-[10px] font-normal">{searchResults.departments.length} result{searchResults.departments.length > 1 ? 's' : ''}</span>
                            </div>
                            {searchResults.departments.map(dept => (
                              <div
                                key={dept.id}
                                className="flex items-center gap-3 px-3 py-2.5 mx-1 rounded-lg cursor-pointer hover:bg-accent transition-colors group"
                                onClick={() => handleSearchSelect('department', dept)}
                              >
                                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                                  <Building className="h-4 w-4 text-emerald-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground">{dept.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{dept.description || 'Municipal department'}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-muted/30 text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">↑</kbd>
                        <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">↓</kbd>
                        <span className="ml-1">Navigate</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">↵</kbd>
                        <span className="ml-1">Select</span>
                      </span>
                    </div>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">esc</kbd>
                      <span className="ml-1">Close</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

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
