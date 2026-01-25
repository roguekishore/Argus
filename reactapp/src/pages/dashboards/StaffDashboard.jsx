/**
 * StaffDashboard - Dashboard for Staff Members
 * 
 * ARCHITECTURE NOTES:
 * - Primary focus: Assigned Complaints
 * - Shows status, SLA deadline, priority, escalation badge (read-only)
 * - Actions: Update status, add remarks, resolve
 * - Uses shared ComplaintList and DashboardSection components
 * 
 * RESOLUTION WORKFLOW:
 * 1. Staff uploads resolution proof via ResolutionProofForm
 * 2. "Mark as Resolved" button is DISABLED until proof exists
 * 3. After proof uploaded, staff can mark complaint as RESOLVED
 * 
 * DATA FLOW:
 * - useComplaints() fetches staff's assigned complaints automatically
 * - Stats derived from actual complaint data
 * - Actions delegated to hook methods
 * 
 * FUTURE EXTENSIBILITY:
 * - Audit timeline: Add to complaint detail view
 * - Notifications: Add NotificationPanel component in header
 * - JWT: Auth abstracted via useAuth hook
 */

import React, { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import { Button } from "../../components/ui";
import { ComplaintList, ComplaintDetailPage, DashboardSection, PageHeader, StatsGrid, ResolutionProofForm } from "../../components/common";
import { useUser } from "../../context/UserContext";
import { useComplaints } from "../../hooks/useComplaints";
import { useAuth } from "../../hooks/useAuth";
import { resolutionProofService } from "../../services/api";
import { COMPLAINT_STATES, ROLE_DISPLAY_NAMES } from "../../constants/roles";
import {
  LayoutDashboard,
  FileText,
  Inbox,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Upload,
} from "lucide-react";

// =============================================================================
// MENU CONFIGURATION
// Staff focuses on managing assigned complaints
// =============================================================================
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
        id: "assigned",
        label: "Assigned Complaints",
        icon: <FileText className="h-4 w-4" />,
        children: [
          {
            id: "all-assigned",
            label: "All Assigned",
            icon: <Inbox className="h-4 w-4" />,
          },
          {
            id: "in-progress",
            label: "In Progress",
            icon: <Clock className="h-4 w-4" />,
          },
          {
            id: "resolved",
            label: "Resolved",
            icon: <CheckCircle2 className="h-4 w-4" />,
          },
        ],
      },
      {
        id: "escalated",
        label: "Escalated (View Only)",
        icon: <AlertTriangle className="h-4 w-4" />,
      },
    ],
  },
];

// =============================================================================
// STAFF DASHBOARD COMPONENT
// =============================================================================
const StaffDashboard = () => {
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState("dashboard");
  const [selectedComplaintId, setSelectedComplaintId] = useState(null);
  
  // Context and hooks
  const { userId, role, email, name } = useUser();
  const { logout } = useAuth();
  const {
    complaints,
    stats,
    isLoading,
    error,
    refresh,
    resolveComplaint,
    updateComplaintState,
  } = useComplaints();

  // ==========================================================================
  // RESOLUTION PROOF STATE
  // Track which complaints have proof uploaded
  // ==========================================================================
  const [proofStatus, setProofStatus] = useState({}); // { complaintId: true/false }
  const [proofLoading, setProofLoading] = useState({}); // { complaintId: true/false }
  const [selectedComplaintForProof, setSelectedComplaintForProof] = useState(null);

  // Check if a complaint has proof (cached or fetch)
  const checkProofStatus = useCallback(async (complaintId) => {
    if (proofStatus[complaintId] !== undefined) {
      return proofStatus[complaintId];
    }
    try {
      const hasProof = await resolutionProofService.hasProof(complaintId);
      setProofStatus(prev => ({ ...prev, [complaintId]: hasProof }));
      return hasProof;
    } catch (err) {
      console.error('Failed to check proof status:', err);
      return false;
    }
  }, [proofStatus]);

  // Handle proof submission - uploads proof AND resolves the complaint
  const handleSubmitProof = useCallback(async (proofData) => {
    const { complaintId, image, description } = proofData;
    setProofLoading(prev => ({ ...prev, [complaintId]: true }));
    
    try {
      // Step 1: Upload the resolution proof
      await resolutionProofService.submit(complaintId, { description }, image);
      setProofStatus(prev => ({ ...prev, [complaintId]: true }));
      
      // Step 2: Automatically resolve the complaint after proof upload
      await resolveComplaint(complaintId);
      
      setSelectedComplaintForProof(null);
      
      // Step 3: Refresh complaints list to show updated status
      await refresh();
      
      // Step 4: Navigate back to complaints list
      setSelectedComplaintId(null);
      setActiveItem('my-complaints');
    } catch (err) {
      console.error('Failed to submit proof and resolve:', err);
      throw err;
    } finally {
      setProofLoading(prev => ({ ...prev, [complaintId]: false }));
    }
  }, [resolveComplaint, refresh]);

  // Handle resolve with proof guard
  const handleResolveWithProofCheck = useCallback(async (complaintId) => {
    const hasProof = await checkProofStatus(complaintId);
    if (!hasProof) {
      // Show proof form instead
      setSelectedComplaintForProof(complaintId);
      return;
    }
    // Proof exists, proceed with resolve
    try {
      await resolveComplaint(complaintId);
      // Refresh complaints list to show updated status
      await refresh();
    } catch (err) {
      console.error('Failed to resolve complaint:', err);
    }
  }, [checkProofStatus, resolveComplaint, refresh]);

  // ==========================================================================
  // DERIVED DATA
  // Stats computed from actual complaint data
  // ==========================================================================
  const displayStats = useMemo(() => [
    { 
      title: "Total Assigned", 
      value: stats.total?.toString() || "0", 
      description: "All your assignments",
      icon: <Inbox className="h-5 w-5" /> 
    },
    { 
      title: "In Progress", 
      value: stats.inProgress?.toString() || "0", 
      description: "Currently working",
      icon: <Clock className="h-5 w-5 text-yellow-500" /> 
    },
    { 
      title: "Resolved", 
      value: stats.resolved?.toString() || "0", 
      description: "Pending citizen closure",
      icon: <CheckCircle2 className="h-5 w-5 text-green-500" /> 
    },
    { 
      title: "Closed", 
      value: stats.closed?.toString() || "0", 
      description: "Completed",
      icon: <TrendingUp className="h-5 w-5 text-blue-500" /> 
    },
  ], [stats]);

  // Escalated complaints count for badge display
  const escalatedCount = useMemo(() => 
    complaints.filter(c => c.escalationLevel > 0).length
  , [complaints]);

  // Filter complaints based on active menu item
  const filteredComplaints = useMemo(() => {
    switch (activeItem) {
      case 'in-progress':
        return complaints.filter(c => c.state === COMPLAINT_STATES.IN_PROGRESS);
      case 'resolved':
        return complaints.filter(c => 
          [COMPLAINT_STATES.RESOLVED, COMPLAINT_STATES.CLOSED].includes(c.state)
        );
      case 'escalated':
        return complaints.filter(c => c.escalationLevel > 0);
      case 'all-assigned':
      default:
        return complaints;
    }
  }, [complaints, activeItem]);

  // ==========================================================================
  // ACTION HANDLERS
  // Staff can: resolve complaints, update status, add remarks
  // NOTE: handleResolveWithProofCheck (above) replaces direct resolveComplaint
  // ==========================================================================
  
  // Resolve a complaint (with proof check)
  const handleResolveComplaint = useCallback(async (complaintId) => {
    await handleResolveWithProofCheck(complaintId);
  }, [handleResolveWithProofCheck]);

  // Update complaint status (e.g., FILED → IN_PROGRESS)
  const handleUpdateStatus = useCallback(async (complaintId, newStatus) => {
    try {
      await updateComplaintState(complaintId, newStatus);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  }, [updateComplaintState]);

  // View complaint details (for adding remarks, viewing history)
  const handleViewDetails = useCallback((complaint) => {
    const id = complaint.complaintId || complaint.id;
    if (id) {
      setSelectedComplaintId(id);
      setActiveItem('complaint-detail');
    }
  }, []);

  // Logout
  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  // ==========================================================================
  // BREADCRUMB GENERATION
  // ==========================================================================
  const getBreadcrumbs = useCallback(() => {
    const breadcrumbs = [{ label: "Dashboard", href: "/dashboard/staff" }];
    
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
  }, [activeItem]);

  // Layout user object
  const layoutUser = {
    name: name || 'Staff Member',
    email: email || 'staff@municipality.gov',
    role: ROLE_DISPLAY_NAMES[role] || 'Staff',
  };

  // ==========================================================================
  // RENDER CONTENT BASED ON ACTIVE ITEM
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
            onResolve={handleResolveComplaint}
            onBack={() => {
              setSelectedComplaintId(null);
              setActiveItem('all-assigned');
            }}
            role="staff"
          />
        );

      // -----------------------------------------------------------------------
      // COMPLAINT LISTS (All Assigned, In Progress, Resolved)
      // -----------------------------------------------------------------------
      case 'all-assigned':
      case 'in-progress':
      case 'resolved':
        const titles = {
          'all-assigned': 'All Assigned Complaints',
          'in-progress': 'In Progress',
          'resolved': 'Resolved Complaints',
        };
        const descriptions = {
          'all-assigned': 'All complaints assigned to you',
          'in-progress': 'Complaints you are currently working on',
          'resolved': 'Complaints you have resolved, pending citizen closure',
        };
        const emptyMessages = {
          'all-assigned': 'No complaints assigned to you yet.',
          'in-progress': 'No complaints in progress.',
          'resolved': 'No resolved complaints yet.',
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
              emptyMessage={emptyMessages[activeItem]}
              onResolve={handleResolveComplaint}
              onViewDetails={handleViewDetails}
            />
          </div>
        );

      // -----------------------------------------------------------------------
      // ESCALATED COMPLAINTS (Read-Only View)
      // Staff can see escalations but cannot act on them
      // -----------------------------------------------------------------------
      case 'escalated':
        return (
          <div className="space-y-6">
            <PageHeader
              title="Escalated Complaints"
              description="Complaints that have been escalated - view only"
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
            
            {/* Info banner - Staff cannot act on escalated complaints */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Read-only view</span>
              </div>
              <p className="text-sm mt-1">
                Escalated complaints require attention from your Department Head or higher authority.
              </p>
            </div>
            
            <ComplaintList
              complaints={filteredComplaints}
              isLoading={isLoading}
              emptyMessage="No escalated complaints."
              onViewDetails={handleViewDetails}
              // Note: No action handlers passed - read-only
            />
          </div>
        );

      // -----------------------------------------------------------------------
      // DASHBOARD (DEFAULT) - Overview
      // -----------------------------------------------------------------------
      default:
        return (
          <div className="space-y-6">
            <PageHeader
              title="Staff Dashboard"
              description="Manage and resolve your assigned complaints"
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

            {/* Escalation Alert (if any) */}
            {escalatedCount > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-red-800 dark:text-red-400">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">
                      {escalatedCount} complaint{escalatedCount > 1 ? 's' : ''} escalated
                    </span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setActiveItem('escalated')}
                  >
                    View Escalations
                  </Button>
                </div>
              </div>
            )}

            {/* Active Complaints - In Progress */}
            <DashboardSection
              title="Complaints In Progress"
              description="Complaints you are currently working on"
              action={
                <Button 
                  variant="link" 
                  size="sm"
                  onClick={() => setActiveItem('all-assigned')}
                >
                  View All
                </Button>
              }
            >
              <ComplaintList
                complaints={complaints.filter(c => c.state === COMPLAINT_STATES.IN_PROGRESS).slice(0, 5)}
                isLoading={isLoading}
                emptyMessage="No complaints in progress. Pick up a new assignment!"
                compact={true}
                onResolve={handleResolveComplaint}
                onViewDetails={handleViewDetails}
              />
            </DashboardSection>

            {/* Pending Assignment - FILED status */}
            <DashboardSection
              title="Pending Your Action"
              description="Newly assigned complaints awaiting your attention"
            >
              <ComplaintList
                complaints={complaints.filter(c => c.state === COMPLAINT_STATES.FILED).slice(0, 5)}
                isLoading={isLoading}
                emptyMessage="No pending complaints."
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
      menuItems={staffMenuItems}
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

      {/* Resolution Proof Form Modal */}
      {selectedComplaintForProof && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Resolution Proof
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                You must upload proof before marking this complaint as resolved.
              </p>
            </div>
            <div className="p-4">
              <ResolutionProofForm
                complaintId={selectedComplaintForProof}
                onSubmit={handleSubmitProof}
                onCancel={() => setSelectedComplaintForProof(null)}
                isLoading={proofLoading[selectedComplaintForProof]}
                hasExistingProof={proofStatus[selectedComplaintForProof]}
              />
            </div>
          </div>
        </div>
      )}

      {renderContent()}
    </DashboardLayout>
  );
};

export default StaffDashboard;
