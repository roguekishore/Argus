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
 * FEATURES:
 * - Global search with filters
 * - Pending routing for low-confidence AI complaints
 * - Full management access (users, departments, categories, SLA)
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
import { departmentsService, usersService, complaintsService, categoriesService, slaService, auditService, AUDIT_ACTIONS } from "../../services";
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
  Activity,
  Globe,
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
  History,
  ArrowRightLeft,
  AlertCircle,
  UserCheck,
  Zap,
  Settings,
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
        icon: <Route className="h-4 w-4" />,
        badge: true,
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
        id: "audit-logs",
        label: "Audit Logs",
        icon: <Shield className="h-4 w-4" />,
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
  const { user: contextUser, role, userId } = useUser();
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

  // Complaint detail view state
  const [selectedComplaintId, setSelectedComplaintId] = useState(null);
  const [previousActiveItem, setPreviousActiveItem] = useState("all-complaints");
  
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
  const [allCategories, setAllCategories] = useState([]);
  const [allSlaConfigs, setAllSlaConfigs] = useState([]);
  const [searchFilter, setSearchFilter] = useState("all");
  const [searchSort, setSearchSort] = useState("relevance");

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilter, setAuditFilter] = useState("all"); // all, STATE_CHANGE, ESCALATION, ASSIGNMENT, etc.
  const [auditLimit, setAuditLimit] = useState(100);

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

  // Fetch all searchable data (categories, SLAs)
  useEffect(() => {
    const fetchSearchData = async () => {
      try {
        const [categoriesData, slaData] = await Promise.all([
          categoriesService.getAll(),
          slaService.getAll()
        ]);
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
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen]);

  // Fetch audit logs when audit-logs tab is active
  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      let data;
      if (auditFilter === 'all') {
        data = await auditService.getRecent(auditLimit);
      } else {
        data = await auditService.getByAction(auditFilter);
      }
      setAuditLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  }, [auditFilter, auditLimit]);

  // Fetch audit logs when navigating to audit-logs
  useEffect(() => {
    if (activeItem === 'audit-logs') {
      fetchAuditLogs();
    }
  }, [activeItem, fetchAuditLogs]);

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
      title: "Pending Routing", 
      value: pendingRoutingCount.toString(), 
      description: "Low AI confidence",
      icon: <Route className="h-5 w-5 text-orange-500" /> 
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
  ], [stats, complaints, departments, pendingRoutingCount]);

  // Filter complaints based on active menu item
  const filteredComplaints = useMemo(() => {
    switch (activeItem) {
      case 'complaints-filed':
        return complaints.filter(c => c.status === 'FILED');
      case 'complaints-resolved':
        return complaints.filter(c => 
          ['RESOLVED', 'CLOSED'].includes(c.status)
        );
      case 'escalations':
        return complaints.filter(c => c.escalationLevel > 0);
      case 'critical':
        return complaints.filter(c => 
          c.priority === 'CRITICAL' || c.escalationLevel >= 2
        );
      case 'complaints-all':
      case 'all-complaints':
      default:
        return complaints;
    }
  }, [complaints, activeItem]);

  // ==========================================================================
  // GLOBAL SEARCH
  // ==========================================================================
  
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

    let matchedUsers = (filter === 'all' || filter === 'users') ? allUsers.filter(user => 
      user.name?.toLowerCase().includes(lowerQuery) ||
      user.email?.toLowerCase().includes(lowerQuery) ||
      user.mobile?.toLowerCase().includes(lowerQuery) ||
      user.userType?.toLowerCase().includes(lowerQuery)
    ) : [];

    let matchedComplaints = (filter === 'all' || filter === 'complaints') ? complaints.filter(c =>
      c.title?.toLowerCase().includes(lowerQuery) ||
      c.description?.toLowerCase().includes(lowerQuery) ||
      c.location?.toLowerCase().includes(lowerQuery) ||
      c.complaintId?.toString().includes(lowerQuery) ||
      c.categoryName?.toLowerCase().includes(lowerQuery) ||
      c.status?.toLowerCase().includes(lowerQuery)
    ) : [];

    let matchedCategories = (filter === 'all' || filter === 'categories') ? allCategories.filter(cat =>
      cat.name?.toLowerCase().includes(lowerQuery) ||
      cat.description?.toLowerCase().includes(lowerQuery) ||
      cat.keywords?.toLowerCase().includes(lowerQuery)
    ) : [];

    let matchedSlaConfigs = (filter === 'all' || filter === 'sla') ? allSlaConfigs.filter(sla =>
      sla.categoryName?.toLowerCase().includes(lowerQuery) ||
      sla.departmentName?.toLowerCase().includes(lowerQuery) ||
      sla.basePriority?.toLowerCase().includes(lowerQuery)
    ) : [];

    let matchedDepartments = (filter === 'all' || filter === 'departments') ? departments.filter(dept =>
      dept.name?.toLowerCase().includes(lowerQuery) ||
      dept.description?.toLowerCase().includes(lowerQuery)
    ) : [];

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
        setSelectedComplaintId(item.complaintId || item.id);
        setPreviousActiveItem(activeItem);
        setActiveItem('complaint-detail');
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
  }, [activeItem]);

  const totalResults = useMemo(() => 
    searchResults.users.length + 
    searchResults.complaints.length + 
    searchResults.categories.length + 
    searchResults.slaConfigs.length + 
    searchResults.departments.length
  , [searchResults]);

  // ==========================================================================
  // ACTION HANDLERS
  // Super Admin has full access but typically for oversight
  // ==========================================================================
  
  // View complaint details
  const handleViewDetails = useCallback((complaint) => {
    setSelectedComplaintId(complaint.complaintId || complaint.id);
    setPreviousActiveItem(activeItem);
    setActiveItem('complaint-detail');
  }, [activeItem]);

  // Cancel a complaint
  const handleCancelComplaint = useCallback(async (complaintId) => {
    if (!window.confirm('Are you sure you want to cancel this complaint? This action cannot be undone.')) {
      return;
    }
    
    try {
      await complaintsService.cancel(complaintId, 'Cancelled by Super Administrator');
      await refresh();
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
          reason: routingReason || "Super Admin manual routing"
        }
      );

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
    const breadcrumbs = [{ label: "Dashboard", href: "/dashboard/super-admin" }];
    
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
      // COMPLAINT DETAIL VIEW
      // -----------------------------------------------------------------------
      case 'complaint-detail':
        return (
          <ComplaintDetailPage
            complaintId={selectedComplaintId}
            onBack={() => {
              setSelectedComplaintId(null);
              setActiveItem(previousActiveItem);
            }}
            onCancel={handleCancelComplaint}
            showCancelButton={true}
          />
        );

      // -----------------------------------------------------------------------
      // COMPLAINT LISTS
      // -----------------------------------------------------------------------
      case 'complaints-all':
      case 'complaints-filed':
      case 'complaints-resolved':
      case 'all-complaints':
      case 'escalations':
      case 'critical': {
        const titles = {
          'complaints-all': 'All Complaints',
          'complaints-filed': 'Filed Complaints',
          'complaints-resolved': 'Resolved Complaints',
          'all-complaints': 'All System Complaints',
          'escalations': 'Escalated Complaints',
          'critical': 'Critical Issues',
        };
        const descriptions = {
          'complaints-all': 'Complete view of all complaints across the system',
          'complaints-filed': 'New complaints awaiting processing',
          'complaints-resolved': 'Completed and closed complaints',
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
      }

      // -----------------------------------------------------------------------
      // PENDING ROUTING - LOW AI CONFIDENCE
      // -----------------------------------------------------------------------
      case 'pending-routing':
        return (
          <div className="space-y-6">
            <PageHeader
              title="Pending Routing"
              description={`${pendingRoutingComplaints.length} complaints need manual department assignment`}
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
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-md dark:bg-orange-900/20 dark:border-orange-800">
              <div className="flex items-center gap-2 text-orange-800 dark:text-orange-400">
                <Route className="h-5 w-5" />
                <span className="font-medium">
                  These complaints have low AI confidence scores (&lt;0.7) and require manual department assignment.
                </span>
              </div>
            </div>

            {routingLoading ? (
              <div className="flex justify-center p-8">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : pendingRoutingComplaints.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="font-medium">All complaints have been routed!</p>
                <p className="text-sm">No pending routing complaints at this time.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRoutingComplaints.map((complaint) => (
                  <Card key={complaint.complaintId || complaint.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-mono text-muted-foreground">
                              #{complaint.complaintId || complaint.id}
                            </span>
                            {complaint.aiConfidence && (
                              <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded-full dark:bg-orange-900/30 dark:text-orange-400">
                                AI Confidence: {(complaint.aiConfidence * 100).toFixed(1)}%
                              </span>
                            )}
                          </div>
                          <h4 className="font-medium">{complaint.title || 'No title'}</h4>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {complaint.description || 'No description'}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Folder className="h-4 w-4" />
                              {complaint.categoryName || 'Uncategorized'}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {complaint.citizenName || 'Unknown'}
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleOpenRouting(complaint)}
                        >
                          <Route className="h-4 w-4 mr-1" />
                          Assign Department
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Routing Modal */}
            {selectedComplaint && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                <Card className="w-full max-w-md mx-4">
                  <CardHeader>
                    <CardTitle>Assign Department</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Complaint #{selectedComplaint.complaintId || selectedComplaint.id}</p>
                      <p className="font-medium">{selectedComplaint.title}</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Select Department</label>
                      <select
                        className="w-full p-2 border rounded-md bg-background"
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                      >
                        <option value="">Choose a department...</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Reason (Optional)</label>
                      <textarea
                        className="w-full p-2 border rounded-md bg-background resize-none"
                        rows={3}
                        placeholder="Enter reason for this routing decision..."
                        value={routingReason}
                        onChange={(e) => setRoutingReason(e.target.value)}
                      />
                    </div>

                    {routingError && (
                      <p className="text-sm text-red-500">{routingError}</p>
                    )}

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={handleCloseRouting}>
                        Cancel
                      </Button>
                      <Button onClick={handleSubmitRouting} disabled={routingLoading}>
                        {routingLoading ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Routing...
                          </>
                        ) : (
                          'Confirm Assignment'
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
      // SYSTEM SECTIONS - AUDIT LOGS DASHBOARD
      // -----------------------------------------------------------------------
      case 'audit-logs':
        // Helper function to get action icon
        const getActionIcon = (action) => {
          switch (action) {
            case 'STATE_CHANGE':
              return <ArrowRightLeft className="h-4 w-4" />;
            case 'ESCALATION':
              return <AlertTriangle className="h-4 w-4 text-red-500" />;
            case 'ASSIGNMENT':
              return <UserCheck className="h-4 w-4 text-blue-500" />;
            case 'CREATED':
              return <FileText className="h-4 w-4 text-green-500" />;
            case 'SLA_UPDATE':
              return <Clock className="h-4 w-4 text-orange-500" />;
            case 'COMMENT':
              return <FileText className="h-4 w-4 text-purple-500" />;
            case 'SUSPENSION':
              return <AlertCircle className="h-4 w-4 text-yellow-500" />;
            default:
              return <History className="h-4 w-4" />;
          }
        };

        // Helper function to format action for display
        const formatAction = (action) => {
          return action?.replace(/_/g, ' ') || 'Unknown';
        };

        // Helper function to get action badge color
        const getActionBadgeClass = (action) => {
          switch (action) {
            case 'STATE_CHANGE':
              return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'ESCALATION':
              return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            case 'ASSIGNMENT':
              return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
            case 'CREATED':
              return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'SLA_UPDATE':
              return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
            case 'COMMENT':
              return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
            case 'SUSPENSION':
              return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            default:
              return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
          }
        };

        // Filter options
        const actionFilters = [
          { id: 'all', label: 'All Actions' },
          { id: 'STATE_CHANGE', label: 'State Changes', icon: <ArrowRightLeft className="h-3 w-3" /> },
          { id: 'ESCALATION', label: 'Escalations', icon: <AlertTriangle className="h-3 w-3" /> },
          { id: 'ASSIGNMENT', label: 'Assignments', icon: <UserCheck className="h-3 w-3" /> },
          { id: 'CREATED', label: 'Created', icon: <FileText className="h-3 w-3" /> },
          { id: 'SLA_UPDATE', label: 'SLA Updates', icon: <Clock className="h-3 w-3" /> },
        ];

        return (
          <div className="space-y-6">
            <PageHeader
              title="System Audit Logs"
              description="Complete audit trail of all system activities"
              actions={
                <div className="flex items-center gap-2">
                  <select
                    value={auditLimit}
                    onChange={(e) => setAuditLimit(parseInt(e.target.value))}
                    className="text-sm border rounded px-2 py-1.5 bg-background"
                  >
                    <option value={50}>Last 50</option>
                    <option value={100}>Last 100</option>
                    <option value={200}>Last 200</option>
                    <option value={500}>Last 500</option>
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchAuditLogs}
                    disabled={auditLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${auditLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              }
            />

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg overflow-x-auto">
              {actionFilters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setAuditFilter(filter.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-md whitespace-nowrap transition-colors ${
                    auditFilter === filter.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {filter.icon}
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Logs</p>
                      <p className="text-2xl font-bold">{auditLogs.length}</p>
                    </div>
                    <History className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">State Changes</p>
                      <p className="text-2xl font-bold">{auditLogs.filter(l => l.action === 'STATE_CHANGE').length}</p>
                    </div>
                    <ArrowRightLeft className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Escalations</p>
                      <p className="text-2xl font-bold">{auditLogs.filter(l => l.action === 'ESCALATION').length}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Assignments</p>
                      <p className="text-2xl font-bold">{auditLogs.filter(l => l.action === 'ASSIGNMENT').length}</p>
                    </div>
                    <UserCheck className="h-8 w-8 text-indigo-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Audit Logs Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Audit Trail
                  {auditFilter !== 'all' && (
                    <span className="text-sm font-normal text-muted-foreground">
                      — Filtered by {formatAction(auditFilter)}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {auditLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="font-medium">No audit logs found</p>
                    <p className="text-sm">System activities will appear here</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="pb-3 font-medium text-muted-foreground">Time</th>
                          <th className="pb-3 font-medium text-muted-foreground">Action</th>
                          <th className="pb-3 font-medium text-muted-foreground">Entity</th>
                          <th className="pb-3 font-medium text-muted-foreground">Change</th>
                          <th className="pb-3 font-medium text-muted-foreground">Actor</th>
                          <th className="pb-3 font-medium text-muted-foreground">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-muted/50">
                            <td className="py-3 pr-4">
                              <div className="text-sm">
                                {log.createdAt ? new Date(log.createdAt).toLocaleDateString() : '-'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : ''}
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full ${getActionBadgeClass(log.action)}`}>
                                {getActionIcon(log.action)}
                                {formatAction(log.action)}
                              </span>
                            </td>
                            <td className="py-3 pr-4">
                              <div className="text-sm font-medium">{log.entityType || '-'}</div>
                              <div className="text-xs text-muted-foreground font-mono">
                                #{log.entityId || '-'}
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-2 text-sm">
                                {log.oldValue && (
                                  <span className="px-1.5 py-0.5 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded text-xs line-through">
                                    {log.oldValue}
                                  </span>
                                )}
                                {log.oldValue && log.newValue && (
                                  <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                                )}
                                {log.newValue && (
                                  <span className="px-1.5 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded text-xs">
                                    {log.newValue}
                                  </span>
                                )}
                                {!log.oldValue && !log.newValue && (
                                  <span className="text-muted-foreground text-xs">-</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-1.5">
                                {log.actorType === 'SYSTEM' ? (
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Zap className="h-3 w-3" />
                                    System
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-xs">
                                    <User className="h-3 w-3" />
                                    User #{log.actorId || '-'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3">
                              <p className="text-sm text-muted-foreground truncate max-w-[200px]" title={log.reason || ''}>
                                {log.reason || '-'}
                              </p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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
                <div className="flex items-center gap-2">
                  {/* Search Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchOpen(true)}
                    className="gap-2"
                  >
                    <Search className="h-4 w-4" />
                    <span className="hidden sm:inline">Search</span>
                    <kbd className="hidden md:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                      <span className="text-xs">⌘</span>K
                    </kbd>
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

            {/* Stats Grid */}
            <StatsGrid stats={displayStats} />

            {/* Pending Routing Alert */}
            {pendingRoutingCount > 0 && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-md dark:bg-orange-900/20 dark:border-orange-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-orange-800 dark:text-orange-400">
                    <Route className="h-5 w-5" />
                    <span className="font-medium">
                      {pendingRoutingCount} complaint{pendingRoutingCount > 1 ? 's' : ''} pending manual routing
                    </span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setActiveItem('pending-routing')}
                  >
                    Review Now
                  </Button>
                </div>
              </div>
            )}

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
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="cursor-pointer hover:shadow-md" onClick={() => setActiveItem('pending-routing')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Route className="h-5 w-5 text-orange-500" />
                    Pending Routing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{pendingRoutingCount}</p>
                  <p className="text-sm text-muted-foreground">Need assignment</p>
                </CardContent>
              </Card>
              
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
                  onClick={() => setActiveItem('complaints-all')}
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

            {/* Global Search Modal */}
            {searchOpen && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-[15vh]">
                <div className="w-full max-w-2xl mx-4 bg-background rounded-lg shadow-2xl border overflow-hidden">
                  {/* Search Header */}
                  <div className="flex items-center border-b px-4 py-3">
                    <Search className="h-5 w-5 text-muted-foreground mr-3" />
                    <input
                      type="text"
                      placeholder="Search users, complaints, categories, SLA, departments..."
                      className="flex-1 bg-transparent outline-none text-lg placeholder:text-muted-foreground"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                    />
                    <Button variant="ghost" size="sm" onClick={() => { setSearchOpen(false); setSearchQuery(""); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Filter Tabs */}
                  <div className="flex items-center gap-1 px-4 py-2 border-b bg-muted/30">
                    <div className="flex items-center gap-1 mr-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                    </div>
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'users', label: 'Users', icon: <User className="h-3 w-3" /> },
                      { id: 'complaints', label: 'Complaints', icon: <FileText className="h-3 w-3" /> },
                      { id: 'categories', label: 'Categories', icon: <Folder className="h-3 w-3" /> },
                      { id: 'sla', label: 'SLA', icon: <Timer className="h-3 w-3" /> },
                      { id: 'departments', label: 'Departments', icon: <Building className="h-3 w-3" /> },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setSearchFilter(tab.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                          searchFilter === tab.id 
                            ? 'bg-primary text-primary-foreground' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        {tab.icon}
                        {tab.label}
                      </button>
                    ))}
                    
                    <div className="ml-auto flex items-center gap-2">
                      <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                      <select
                        value={searchSort}
                        onChange={(e) => setSearchSort(e.target.value)}
                        className="text-sm bg-transparent border rounded px-2 py-1"
                      >
                        <option value="relevance">Relevance</option>
                        <option value="name">Name A-Z</option>
                        <option value="date">Newest First</option>
                        <option value="status">Status</option>
                      </select>
                    </div>
                  </div>

                  {/* Search Results */}
                  <div className="max-h-[50vh] overflow-y-auto">
                    {searchLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : searchQuery.length < 2 ? (
                      <div className="px-4 py-8 text-center text-muted-foreground">
                        <Search className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p>Type at least 2 characters to search</p>
                        <p className="text-sm mt-1">Press <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">ESC</kbd> to close</p>
                      </div>
                    ) : totalResults === 0 ? (
                      <div className="px-4 py-8 text-center text-muted-foreground">
                        <p>No results found for "{searchQuery}"</p>
                      </div>
                    ) : (
                      <div className="py-2">
                        {/* Result counts summary */}
                        <div className="px-4 py-2 text-xs text-muted-foreground border-b">
                          Found {totalResults} result{totalResults !== 1 ? 's' : ''}
                          {searchFilter === 'all' && (
                            <span> across {[
                              searchResults.users.length > 0 && 'users',
                              searchResults.complaints.length > 0 && 'complaints',
                              searchResults.categories.length > 0 && 'categories',
                              searchResults.slaConfigs.length > 0 && 'SLA configs',
                              searchResults.departments.length > 0 && 'departments'
                            ].filter(Boolean).join(', ')}</span>
                          )}
                        </div>

                        {/* Users */}
                        {searchResults.users.length > 0 && (
                          <div className="border-b last:border-b-0">
                            <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide bg-muted/50 flex items-center gap-2">
                              <User className="h-3 w-3" />
                              Users ({searchResults.users.length})
                            </div>
                            {searchResults.users.map((user) => (
                              <button
                                key={user.id}
                                className="w-full px-4 py-2 text-left hover:bg-muted flex items-center gap-3"
                                onClick={() => handleSearchSelect('user', user)}
                              >
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <User className="h-4 w-4 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{user.name}</p>
                                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                                </div>
                                <span className="px-2 py-0.5 text-xs rounded-full bg-muted">{user.userType}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Complaints */}
                        {searchResults.complaints.length > 0 && (
                          <div className="border-b last:border-b-0">
                            <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide bg-muted/50 flex items-center gap-2">
                              <FileText className="h-3 w-3" />
                              Complaints ({searchResults.complaints.length})
                            </div>
                            {searchResults.complaints.map((complaint) => (
                              <button
                                key={complaint.complaintId || complaint.id}
                                className="w-full px-4 py-2 text-left hover:bg-muted flex items-center gap-3"
                                onClick={() => handleSearchSelect('complaint', complaint)}
                              >
                                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                  <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{complaint.title || 'No title'}</p>
                                  <p className="text-sm text-muted-foreground truncate">
                                    #{complaint.complaintId || complaint.id} • {complaint.categoryName || 'Uncategorized'}
                                  </p>
                                </div>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${
                                  complaint.status === 'RESOLVED' || complaint.status === 'CLOSED' 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                }`}>{complaint.status}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Categories */}
                        {searchResults.categories.length > 0 && (
                          <div className="border-b last:border-b-0">
                            <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide bg-muted/50 flex items-center gap-2">
                              <Folder className="h-3 w-3" />
                              Categories ({searchResults.categories.length})
                            </div>
                            {searchResults.categories.map((category) => (
                              <button
                                key={category.id}
                                className="w-full px-4 py-2 text-left hover:bg-muted flex items-center gap-3"
                                onClick={() => handleSearchSelect('category', category)}
                              >
                                <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                  <Folder className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{category.name}</p>
                                  <p className="text-sm text-muted-foreground truncate">{category.description || 'No description'}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* SLA Configs */}
                        {searchResults.slaConfigs.length > 0 && (
                          <div className="border-b last:border-b-0">
                            <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide bg-muted/50 flex items-center gap-2">
                              <Timer className="h-3 w-3" />
                              SLA Configurations ({searchResults.slaConfigs.length})
                            </div>
                            {searchResults.slaConfigs.map((sla) => (
                              <button
                                key={sla.id}
                                className="w-full px-4 py-2 text-left hover:bg-muted flex items-center gap-3"
                                onClick={() => handleSearchSelect('sla', sla)}
                              >
                                <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                  <Timer className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{sla.categoryName || 'Unknown Category'}</p>
                                  <p className="text-sm text-muted-foreground truncate">
                                    {sla.departmentName || 'All Departments'} • {sla.responseTimeHours}h response
                                  </p>
                                </div>
                                <span className="px-2 py-0.5 text-xs rounded-full bg-muted">{sla.basePriority}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Departments */}
                        {searchResults.departments.length > 0 && (
                          <div className="border-b last:border-b-0">
                            <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide bg-muted/50 flex items-center gap-2">
                              <Building className="h-3 w-3" />
                              Departments ({searchResults.departments.length})
                            </div>
                            {searchResults.departments.map((dept) => (
                              <button
                                key={dept.id}
                                className="w-full px-4 py-2 text-left hover:bg-muted flex items-center gap-3"
                                onClick={() => handleSearchSelect('department', dept)}
                              >
                                <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                  <Building className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{dept.name}</p>
                                  <p className="text-sm text-muted-foreground truncate">{dept.description || 'No description'}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Search Footer */}
                  <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <kbd className="px-1.5 py-0.5 bg-muted rounded">↑</kbd>
                      <kbd className="px-1.5 py-0.5 bg-muted rounded">↓</kbd>
                      <span>to navigate</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <kbd className="px-1.5 py-0.5 bg-muted rounded">Enter</kbd>
                      <span>to select</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <kbd className="px-1.5 py-0.5 bg-muted rounded">ESC</kbd>
                      <span>to close</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
