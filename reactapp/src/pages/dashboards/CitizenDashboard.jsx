/**
 * CitizenDashboard - Dashboard for Citizens
 * 
 * ARCHITECTURE NOTES:
 * - Complaint-centric: Primary focus is "My Complaints"
 * - No analytics/charts/system data - citizens just manage their complaints
 * - Uses shared ComplaintList and DashboardSection components
 * - Role-specific actions (close, cancel, rate) passed as props to shared components
 * 
 * RESOLUTION SIGNOFF WORKFLOW:
 * 1. Citizen sees RESOLVED complaint
 * 2. Can Accept (with rating) → Closes complaint
 * 3. Can Dispute (with counter-proof) → Reopens if approved by dept head
 * 
 * DATA FLOW:
 * - useComplaints() fetches citizen's complaints automatically
 * - Stats derived from actual complaint data
 * - Actions handled locally, delegated to hook methods
 * 
 * FUTURE EXTENSIBILITY:
 * - Audit timeline: Add AuditTimeline component to complaint detail view
 * - Notifications: Add NotificationPanel in sidebar or header
 * - JWT: Auth already abstracted via useAuth hook - no changes needed here
 */

import React, { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import { Button } from "../../components/ui";
import { ComplaintList, ComplaintForm, ComplaintDetailPage, DashboardSection, PageHeader, StatsGrid, CitizenSignoffForm, NearbyComplaints } from "../../components/common";
import { useUser } from "../../context/UserContext";
import { useComplaints } from "../../hooks/useComplaints";
import { useAuth } from "../../hooks/useAuth";
import { signoffService, disputeService } from "../../services/api";
import { COMPLAINT_STATES, ROLE_DISPLAY_NAMES } from "../../constants/roles";
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Clock,
  CheckCircle2,
  User,
  HelpCircle,
  RefreshCw,
  AlertTriangle,
  Users,
  Trophy,
} from "lucide-react";
import { PointsBadge, CitizenLeaderboard } from "../../components/gamification";

// =============================================================================
// MENU CONFIGURATION
// Citizens have simple navigation: Dashboard, Complaints, Profile
// =============================================================================
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
        id: "my-complaints",
        label: "My Complaints",
        icon: <FileText className="h-4 w-4" />,
        children: [
          {
            id: "all-complaints",
            label: "All Complaints",
            icon: <FileText className="h-4 w-4" />,
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
        ],
      },
      {
        id: "new-complaint",
        label: "File New Complaint",
        icon: <PlusCircle className="h-4 w-4" />,
      },
      {
        id: "community",
        label: "Community Issues",
        icon: <Users className="h-4 w-4" />,
      },
      {
        id: "leaderboard",
        label: "Citizen Leaderboard",
        icon: <Trophy className="h-4 w-4" />,
      },
    ],
  },
  // {
  //   label: "Account",
  //   items: [
  //     {
  //       id: "profile",
  //       label: "My Profile",
  //       icon: <User className="h-4 w-4" />,
  //     },
  //     {
  //       id: "help",
  //       label: "Help & Support",
  //       icon: <HelpCircle className="h-4 w-4" />,
  //     },
  //   ],
  // },
];

// =============================================================================
// CITIZEN DASHBOARD COMPONENT
// =============================================================================
const CitizenDashboard = () => {
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState("dashboard");
  const [selectedComplaintId, setSelectedComplaintId] = useState(null);
  
  // Context and hooks
  const { user, role, userId } = useUser();
  const { logout } = useAuth();
  const { 
    complaints, 
    stats, 
    isLoading, 
    error,
    createComplaint,
    closeComplaint, 
    cancelComplaint,
    rateComplaint,
    refresh 
  } = useComplaints();

  // Loading state for complaint form submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // ==========================================================================
  // SIGNOFF/DISPUTE STATE
  // Track which complaint is being signed off or disputed
  // ==========================================================================
  const [selectedComplaintForSignoff, setSelectedComplaintForSignoff] = useState(null);
  const [signoffLoading, setSignoffLoading] = useState(false);

  // Handle accept/close via signoff service
  const handleAcceptResolution = useCallback(async (signoffData) => {
    setSignoffLoading(true);
    try {
      await signoffService.accept(
        signoffData.complaintId,
        signoffData.rating,
        signoffData.feedback
      );
      setSelectedComplaintForSignoff(null);
      
      // Refresh to show updated status
      await refresh();
      
      // Navigate back to complaints list
      setSelectedComplaintId(null);
      setActiveItem('all-complaints');
    } catch (err) {
      console.error('Failed to accept resolution:', err);
      throw err;
    } finally {
      setSignoffLoading(false);
    }
  }, [refresh]);

  // Handle dispute submission
  const handleSubmitDispute = useCallback(async (disputeData) => {
    setSignoffLoading(true);
    try {
      await disputeService.submit(
        disputeData.complaintId,
        {
          disputeReason: disputeData.disputeReason,
          feedback: disputeData.feedback,
        },
        disputeData.counterProofImage
      );
      setSelectedComplaintForSignoff(null);
      
      // Refresh to show updated status
      await refresh();
      
      // Navigate back to complaints list
      setSelectedComplaintId(null);
      setActiveItem('all-complaints');
    } catch (err) {
      console.error('Failed to submit dispute:', err);
      throw err;
    } finally {
      setSignoffLoading(false);
    }
  }, [refresh]);

  // Open signoff form for a resolved complaint
  const handleOpenSignoff = useCallback((complaintId) => {
    setSelectedComplaintForSignoff(complaintId);
  }, []);

  // ==========================================================================
  // DERIVED DATA
  // Stats computed from actual complaint data - no fake numbers
  // ==========================================================================
  const displayStats = useMemo(() => [
    { 
      title: "Total Complaints", 
      value: stats.total?.toString() || "0", 
      description: "All submissions", 
      icon: <FileText className="h-5 w-5" /> 
    },
    { 
      title: "Pending", 
      value: stats.pending?.toString() || "0", 
      description: "Awaiting response", 
      icon: <Clock className="h-5 w-5 text-yellow-500" /> 
    },
    { 
      title: "Resolved", 
      value: stats.resolved?.toString() || "0", 
      description: "Ready to close", 
      icon: <CheckCircle2 className="h-5 w-5 text-green-500" /> 
    },
    { 
      title: "Closed", 
      value: stats.closed?.toString() || "0", 
      description: "Completed", 
      icon: <CheckCircle2 className="h-5 w-5 text-gray-500" /> 
    },
  ], [stats]);

  // Filter complaints based on active menu item
  // Note: Backend returns 'status' property, not 'state'
  const filteredComplaints = useMemo(() => {
    switch (activeItem) {
      case 'pending':
        return complaints.filter(c => 
          [COMPLAINT_STATES.FILED, COMPLAINT_STATES.IN_PROGRESS].includes(c.status)
        );
      case 'resolved':
        return complaints.filter(c => 
          [COMPLAINT_STATES.RESOLVED, COMPLAINT_STATES.CLOSED].includes(c.status)
        );
      case 'all-complaints':
      default:
        return complaints;
    }
  }, [complaints, activeItem]);

  // ==========================================================================
  // ACTION HANDLERS
  // These are passed to ComplaintCard/ComplaintList via props
  // ==========================================================================
  
  // Close/Signoff a resolved complaint - opens the signoff form
  const handleCloseComplaint = useCallback((complaintId) => {
    // Open the signoff form instead of direct close
    handleOpenSignoff(complaintId);
  }, [handleOpenSignoff]);

  // Cancel a complaint (citizen decides not to proceed)
  const handleCancelComplaint = useCallback(async (complaintId) => {
    if (window.confirm('Are you sure you want to cancel this complaint?')) {
      try {
        await cancelComplaint(complaintId);
      } catch (err) {
        console.error('Failed to cancel complaint:', err);
      }
    }
  }, [cancelComplaint]);

  // Rate complaint resolution
  const handleRateComplaint = useCallback(async (complaintId) => {
    // TODO: Replace with proper rating modal
    const rating = window.prompt('Rate this complaint resolution (1-5):');
    if (rating && rating >= 1 && rating <= 5) {
      try {
        await rateComplaint(complaintId, parseInt(rating));
      } catch (err) {
        console.error('Failed to rate complaint:', err);
      }
    }
  }, [rateComplaint]);

  // View complaint details
  const handleViewDetails = useCallback((complaint) => {
    const id = complaint.complaintId || complaint.id;
    if (id) {
      setSelectedComplaintId(id);
      setActiveItem('complaint-detail');
    }
  }, []);

  // Create new complaint with optional image
  const handleCreateComplaint = useCallback(async (complaintData, imageFile) => {
    setIsSubmitting(true);
    try {
      await createComplaint(complaintData, imageFile);
      // Stay on the form to let user see success message
      // They can file another or navigate away
    } finally {
      setIsSubmitting(false);
    }
  }, [createComplaint]);

  // Logout
  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  // ==========================================================================
  // BREADCRUMB GENERATION
  // ==========================================================================
  const getBreadcrumbs = useCallback(() => {
    const breadcrumbs = [{ label: "Dashboard", href: "/dashboard/citizen" }];
    
    if (activeItem !== "dashboard") {
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
  }, [activeItem]);

  // Layout user object
  const layoutUser = {
    name: user?.name || "Citizen",
    email: user?.email || "",
    role: ROLE_DISPLAY_NAMES[role] || "Citizen",
  };

  // ==========================================================================
  // RENDER CONTENT BASED ON ACTIVE ITEM
  // Clean separation - each section is focused on a single purpose
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
            onClose={handleCloseComplaint}
            onCancel={handleCancelComplaint}
            onRate={handleRateComplaint}
            onAcceptResolution={handleAcceptResolution}
            onSubmitDispute={handleSubmitDispute}
            onBack={() => {
              setSelectedComplaintId(null);
              setActiveItem('all-complaints');
            }}
            role="citizen"
          />
        );

      // -----------------------------------------------------------------------
      // NEW COMPLAINT FORM
      // -----------------------------------------------------------------------
      case 'new-complaint':
        return (
          <div className="space-y-6">
            <PageHeader
              title="File New Complaint"
              description="Submit a new grievance for resolution. You can optionally attach an image as evidence."
            />
            <ComplaintForm
              onSubmit={handleCreateComplaint}
              onCancel={() => setActiveItem('dashboard')}
              isLoading={isSubmitting}
              userId={userId}
            />
          </div>
        );

      // -----------------------------------------------------------------------
      // COMMUNITY COMPLAINTS (Nearby Issues)
      // -----------------------------------------------------------------------
      case 'community':
        return (
          <div className="space-y-6">
            <PageHeader
              title="Community Issues"
              description="See complaints in your area. Support existing issues with 'Me Too' to help prioritize them."
            />
            <NearbyComplaints userId={userId} />
          </div>
        );

      // -----------------------------------------------------------------------
      // COMPLAINT LISTS (All, Pending, Resolved)
      // -----------------------------------------------------------------------
      case 'all-complaints':
      case 'pending':
      case 'resolved':
        const titles = {
          'all-complaints': 'All My Complaints',
          'pending': 'Pending Complaints',
          'resolved': 'Resolved Complaints',
        };
        const descriptions = {
          'all-complaints': 'Complete list of your submitted complaints',
          'pending': 'Complaints awaiting response or in progress',
          'resolved': 'Complaints that have been resolved - you can close them',
        };
        const emptyMessages = {
          'all-complaints': 'You haven\'t filed any complaints yet.',
          'pending': 'No pending complaints. Great!',
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
              onClose={handleCloseComplaint}
              onCancel={handleCancelComplaint}
              onRate={handleRateComplaint}
              onViewDetails={handleViewDetails}
            />
          </div>
        );

      // -----------------------------------------------------------------------
      // CITIZEN LEADERBOARD
      // -----------------------------------------------------------------------
      case 'leaderboard':
        return (
          <div className="space-y-6">
            <PageHeader
              title="Citizen Leaderboard"
              description="Recognizing responsible citizens who actively contribute to improving our community"
            />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <PointsBadge citizenId={userId} />
              </div>
              <div className="lg:col-span-2">
                <CitizenLeaderboard limit={20} />
              </div>
            </div>
          </div>
        );

      // -----------------------------------------------------------------------
      // PROFILE
      // -----------------------------------------------------------------------
      case 'profile':
        return (
          <DashboardSection
            title="My Profile"
            description="Manage your account settings"
          >
            {/* TODO: Integrate ProfileForm component here */}
            <p className="text-muted-foreground">Profile settings will be rendered here.</p>
          </DashboardSection>
        );

      // -----------------------------------------------------------------------
      // HELP
      // -----------------------------------------------------------------------
      case 'help':
        return (
          <DashboardSection
            title="Help & Support"
            description="Get help with using the grievance system"
          >
            <p className="text-muted-foreground">Help content will be rendered here.</p>
          </DashboardSection>
        );

      // -----------------------------------------------------------------------
      // DASHBOARD (DEFAULT) - Overview with quick stats and recent complaints
      // -----------------------------------------------------------------------
      default:
        return (
          <div className="space-y-6">
            <PageHeader
              title="My Grievance Dashboard"
              description="Track and manage your submitted complaints"
              actions={
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refresh}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setActiveItem('new-complaint')}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    New Complaint
                  </Button>
                </div>
              }
            />

            {/* Points Badge - Gamification */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3">
                <StatsGrid stats={displayStats} />
              </div>
              <div className="md:col-span-1">
                <PointsBadge citizenId={userId} />
              </div>
            </div>

            {/* Recent Complaints - show last 5 */}
            <DashboardSection
              title="Recent Complaints"
              description="Your latest grievance submissions"
              action={
                complaints.length > 5 && (
                  <Button 
                    variant="link" 
                    size="sm"
                    onClick={() => setActiveItem('all-complaints')}
                  >
                    View All
                  </Button>
                )
              }
            >
              <ComplaintList
                complaints={complaints.slice(0, 5)}
                isLoading={isLoading}
                emptyMessage="No complaints yet. File your first complaint!"
                compact={true}
                onClose={handleCloseComplaint}
                onCancel={handleCancelComplaint}
                onRate={handleRateComplaint}
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
      menuItems={citizenMenuItems}
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

      {/* Citizen Signoff Modal (Accept/Dispute) */}
      {selectedComplaintForSignoff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Review Resolution</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Complaint #{selectedComplaintForSignoff}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedComplaintForSignoff(null)}
              >
                ✕
              </Button>
            </div>
            <div className="p-4">
              <CitizenSignoffForm
                complaintId={selectedComplaintForSignoff}
                onAccept={handleAcceptResolution}
                onDispute={handleSubmitDispute}
                isLoading={signoffLoading}
              />
            </div>
          </div>
        </div>
      )}

      {renderContent()}
    </DashboardLayout>
  );
};

export default CitizenDashboard;
