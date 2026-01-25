/**
 * DepartmentHeadDashboard - Dashboard for Department Heads
 * 
 * ARCHITECTURE NOTES:
 * - Primary focus: Department Complaints & Escalations
 * - Two main sections: All department complaints + Escalated complaints
 * - Can reassign staff, resolve complaints
 * - Read-only escalation visibility (cannot de-escalate)
 * 
 * DATA FLOW:
 * - useComplaints() fetches department complaints automatically
 * - Staff list fetched separately for reassignment
 * - Actions delegated to hook methods
 * 
 * FUTURE EXTENSIBILITY:
 * - Team performance metrics
 * - Audit logs per complaint
 * - Notification preferences
 */

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import { Button } from "../../components/ui";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { ComplaintList, ComplaintDetailPage, DashboardSection, PageHeader, StatsGrid } from "../../components/common";
import { useUser } from "../../context/UserContext";
import { useComplaints } from "../../hooks/useComplaints";
import { useAuth } from "../../hooks/useAuth";
import { usersService, disputeService } from "../../services";
import { COMPLAINT_STATES, ROLE_DISPLAY_NAMES } from "../../constants/roles";
import {
  LayoutDashboard,
  FileText,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  UserPlus,
  Building,
  MessageSquareWarning,
  ThumbsUp,
  ThumbsDown,
  Eye,
} from "lucide-react";

// =============================================================================
// MENU CONFIGURATION
// Department heads focus on department oversight and escalations
// =============================================================================
const deptHeadMenuItems = [
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
        id: "department-complaints",
        label: "Department Complaints",
        icon: <FileText className="h-4 w-4" />,
        children: [
          {
            id: "all-complaints",
            label: "All Complaints",
            icon: <FileText className="h-4 w-4" />,
          },
          {
            id: "unassigned",
            label: "Unassigned",
            icon: <UserPlus className="h-4 w-4" />,
          },
          {
            id: "in-progress",
            label: "In Progress",
            icon: <Clock className="h-4 w-4" />,
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
      {
        id: "disputes",
        label: "Pending Disputes",
        icon: <MessageSquareWarning className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "Team",
    items: [
      {
        id: "team",
        label: "Team Management",
        icon: <Users className="h-4 w-4" />,
      },
    ],
  },
];

// =============================================================================
// DEPARTMENT HEAD DASHBOARD COMPONENT
// =============================================================================
const DepartmentHeadDashboard = () => {
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState("dashboard");
  const [selectedComplaintId, setSelectedComplaintId] = useState(null);
  
  // Context and hooks
  const { userId, role, email, name, departmentId } = useUser();
  const { logout } = useAuth();
  const {
    complaints,
    stats,
    isLoading,
    error,
    refresh,
    resolveComplaint,
    assignStaff,
    getUnassigned,
  } = useComplaints();

  // Local state for department staff
  const [departmentStaff, setDepartmentStaff] = useState([]);
  const [unassignedComplaints, setUnassignedComplaints] = useState([]);
  
  // Disputes state
  const [pendingDisputes, setPendingDisputes] = useState([]);
  const [disputesLoading, setDisputesLoading] = useState(false);
  const [disputeActionLoading, setDisputeActionLoading] = useState({});

  // Fetch department staff for reassignment
  useEffect(() => {
    const fetchStaff = async () => {
      if (departmentId) {
        try {
          const staff = await usersService.getDepartmentStaff(departmentId);
          setDepartmentStaff(Array.isArray(staff) ? staff : []);
        } catch (err) {
          console.error('Failed to fetch staff:', err);
        }
      }
    };
    fetchStaff();
  }, [departmentId]);

  // Fetch unassigned complaints
  useEffect(() => {
    const fetchUnassigned = async () => {
      if (departmentId) {
        try {
          const data = await getUnassigned();
          setUnassignedComplaints(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error('Failed to fetch unassigned:', err);
        }
      }
    };
    fetchUnassigned();
  }, [departmentId, getUnassigned]);

  // Fetch pending disputes
  const fetchPendingDisputes = useCallback(async () => {
    setDisputesLoading(true);
    try {
      const disputes = await disputeService.getPending();
      setPendingDisputes(Array.isArray(disputes) ? disputes : []);
    } catch (err) {
      console.error('Failed to fetch pending disputes:', err);
      setPendingDisputes([]);
    } finally {
      setDisputesLoading(false);
    }
  }, []);

  // Fetch disputes on mount and when navigating to disputes section
  useEffect(() => {
    if (activeItem === 'disputes' || activeItem === 'dashboard') {
      fetchPendingDisputes();
    }
  }, [activeItem, fetchPendingDisputes]);

  // ==========================================================================
  // DERIVED DATA
  // ==========================================================================
  const displayStats = useMemo(() => [
    { 
      title: "Total Complaints", 
      value: stats.total?.toString() || "0", 
      description: "In your department",
      icon: <FileText className="h-5 w-5" /> 
    },
    { 
      title: "Unassigned", 
      value: stats.unassigned?.toString() || unassignedComplaints.length.toString(), 
      description: "Need staff assignment",
      icon: <UserPlus className="h-5 w-5 text-orange-500" /> 
    },
    { 
      title: "In Progress", 
      value: stats.inProgress?.toString() || "0", 
      description: "Being worked on",
      icon: <Clock className="h-5 w-5 text-yellow-500" /> 
    },
    { 
      title: "Pending Disputes", 
      value: pendingDisputes.length.toString(), 
      description: "Need your review",
      icon: <MessageSquareWarning className="h-5 w-5 text-red-500" /> 
    },
  ], [stats, unassignedComplaints, pendingDisputes]);

  // Filter complaints based on active menu item
  // Note: Backend returns 'status' property, not 'state'
  const filteredComplaints = useMemo(() => {
    switch (activeItem) {
      case 'unassigned':
        return unassignedComplaints;
      case 'in-progress':
        return complaints.filter(c => c.status === COMPLAINT_STATES.IN_PROGRESS);
      case 'overdue':
        return complaints.filter(c => {
          const deadline = new Date(c.slaDeadline || c.slaPromiseDate);
          return deadline < new Date() && 
                 ![COMPLAINT_STATES.CLOSED, COMPLAINT_STATES.CANCELLED].includes(c.status);
        });
      case 'escalations':
        return complaints.filter(c => c.escalationLevel > 0);
      case 'all-complaints':
      default:
        return complaints;
    }
  }, [complaints, unassignedComplaints, activeItem]);

  // ==========================================================================
  // ACTION HANDLERS
  // ==========================================================================
  
  // Resolve a complaint
  const handleResolveComplaint = useCallback(async (complaintId) => {
    try {
      await resolveComplaint(complaintId);
      // Refresh complaints list to show updated status
      await refresh();
    } catch (err) {
      console.error('Failed to resolve complaint:', err);
    }
  }, [resolveComplaint, refresh]);

  // Reassign complaint to different staff
  const handleReassign = useCallback(async (complaint) => {
    // TODO: Open a staff selection modal
    // For now, using a simple prompt
    const complaintId = complaint.complaintId || complaint.id;
    const staffOptions = departmentStaff.map(s => `${s.id}: ${s.name}`).join('\n');
    const staffId = window.prompt(`Select staff ID to assign:\n${staffOptions}`);
    if (staffId) {
      try {
        await assignStaff(complaintId, staffId);
        // Refresh unassigned list and all complaints
        const data = await getUnassigned();
        setUnassignedComplaints(Array.isArray(data) ? data : []);
        await refresh();
      } catch (err) {
        console.error('Failed to assign staff:', err);
      }
    }
  }, [departmentStaff, assignStaff, getUnassigned, refresh]);

  // View complaint details
  const handleViewDetails = useCallback((complaint) => {
    const id = complaint.complaintId || complaint.id;
    if (id) {
      setSelectedComplaintId(id);
      setActiveItem('complaint-detail');
    }
  }, []);

  // Approve a dispute - reopen the complaint
  const handleApproveDispute = useCallback(async (dispute) => {
    const complaintId = dispute.complaintId;
    const signoffId = dispute.id;
    
    setDisputeActionLoading(prev => ({ ...prev, [signoffId]: true }));
    try {
      await disputeService.approve(complaintId, signoffId);
      // Refresh disputes and complaints
      await fetchPendingDisputes();
      refresh();
    } catch (err) {
      console.error('Failed to approve dispute:', err);
      alert('Failed to approve dispute: ' + (err.message || 'Unknown error'));
    } finally {
      setDisputeActionLoading(prev => ({ ...prev, [signoffId]: false }));
    }
  }, [fetchPendingDisputes, refresh]);

  // Reject a dispute - complaint stays resolved
  const handleRejectDispute = useCallback(async (dispute) => {
    const complaintId = dispute.complaintId;
    const signoffId = dispute.id;
    
    const reason = window.prompt('Enter rejection reason:');
    if (!reason) return;
    
    setDisputeActionLoading(prev => ({ ...prev, [signoffId]: true }));
    try {
      await disputeService.reject(complaintId, signoffId, reason);
      // Refresh disputes
      await fetchPendingDisputes();
    } catch (err) {
      console.error('Failed to reject dispute:', err);
      alert('Failed to reject dispute: ' + (err.message || 'Unknown error'));
    } finally {
      setDisputeActionLoading(prev => ({ ...prev, [signoffId]: false }));
    }
  }, [fetchPendingDisputes]);

  // Logout
  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  // ==========================================================================
  // BREADCRUMB GENERATION
  // ==========================================================================
  const getBreadcrumbs = useCallback(() => {
    const breadcrumbs = [{ label: "Dashboard", href: "/dashboard/dept-head" }];
    
    if (activeItem !== "dashboard") {
      for (const group of deptHeadMenuItems) {
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
    name: name || 'Department Head',
    email: email || 'depthead@municipality.gov',
    role: ROLE_DISPLAY_NAMES[role] || 'Department Head',
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
            onResolve={handleResolveComplaint}
            onBack={() => {
              setSelectedComplaintId(null);
              setActiveItem('all-complaints');
            }}
            role="dept-head"
          />
        );

      // -----------------------------------------------------------------------
      // COMPLAINT LISTS
      // -----------------------------------------------------------------------
      case 'all-complaints':
      case 'unassigned':
      case 'in-progress':
      case 'overdue':
        const titles = {
          'all-complaints': 'All Department Complaints',
          'unassigned': 'Unassigned Complaints',
          'in-progress': 'In Progress',
          'overdue': 'Overdue Complaints',
        };
        const descriptions = {
          'all-complaints': 'All complaints in your department',
          'unassigned': 'Complaints that need staff assignment',
          'in-progress': 'Complaints currently being worked on',
          'overdue': 'Complaints that have exceeded their SLA deadline',
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
              emptyMessage={`No ${activeItem.replace('-', ' ')} complaints.`}
              onResolve={handleResolveComplaint}
              onReassign={handleReassign}
              onViewDetails={handleViewDetails}
            />
          </div>
        );

      // -----------------------------------------------------------------------
      // ESCALATIONS (Read-Only visibility)
      // -----------------------------------------------------------------------
      case 'escalations':
        return (
          <div className="space-y-6">
            <PageHeader
              title="Escalated Complaints"
              description="Complaints that have been escalated within or beyond your department"
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
            
            {/* Info about escalation levels */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Escalation Levels</span>
              </div>
              <p className="text-sm mt-1">
                <strong>Level 1:</strong> Escalated to you (Department Head) | 
                <strong> Level 2+:</strong> Escalated to Admin/Commissioner
              </p>
            </div>
            
            <ComplaintList
              complaints={filteredComplaints}
              isLoading={isLoading}
              emptyMessage="No escalated complaints in your department."
              onResolve={handleResolveComplaint}
              onReassign={handleReassign}
              onViewDetails={handleViewDetails}
            />
          </div>
        );

      // -----------------------------------------------------------------------
      // PENDING DISPUTES
      // -----------------------------------------------------------------------
      case 'disputes':
        return (
          <div className="space-y-6">
            <PageHeader
              title="Pending Disputes"
              description="Citizens who dispute the resolution of their complaints"
              actions={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchPendingDisputes}
                  disabled={disputesLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${disputesLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              }
            />
            
            {/* Info about disputes */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400">
              <div className="flex items-center gap-2">
                <MessageSquareWarning className="h-4 w-4" />
                <span className="font-medium">Dispute Review</span>
              </div>
              <p className="text-sm mt-1">
                <strong>Approve:</strong> Reopens the complaint with escalated priority and stricter SLA | 
                <strong> Reject:</strong> Complaint stays closed, citizen is notified
              </p>
            </div>
            
            {disputesLoading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading disputes...</span>
              </div>
            ) : pendingDisputes.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                <MessageSquareWarning className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No pending disputes in your department.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {pendingDisputes.map((dispute) => (
                  <Card key={dispute.id} className="border-l-4 border-l-orange-500">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            Complaint #{dispute.complaintId}
                          </CardTitle>
                          <CardDescription>
                            Disputed on {new Date(dispute.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                          Pending Review
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Dispute Reason</p>
                        <p className="text-sm">{dispute.disputeReason || 'No reason provided'}</p>
                      </div>
                      {dispute.feedback && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Additional Feedback</p>
                          <p className="text-sm">{dispute.feedback}</p>
                        </div>
                      )}
                      {dispute.disputeImageS3Key && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Counter-Proof Image</p>
                          <Badge variant="secondary">Image attached</Badge>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="flex justify-between gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedComplaintId(dispute.complaintId);
                          setActiveItem('complaint-detail');
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Complaint
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                          onClick={() => handleRejectDispute(dispute)}
                          disabled={disputeActionLoading[dispute.id]}
                        >
                          <ThumbsDown className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleApproveDispute(dispute)}
                          disabled={disputeActionLoading[dispute.id]}
                        >
                          <ThumbsUp className="h-4 w-4 mr-2" />
                          Approve & Reopen
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      // -----------------------------------------------------------------------
      // TEAM MANAGEMENT
      // -----------------------------------------------------------------------
      case 'team':
        return (
          <DashboardSection
            title="Team Management"
            description={`Manage staff in your department (${departmentStaff.length} members)`}
          >
            {/* TODO: Integrate TeamList component */}
            <div className="space-y-2">
              {departmentStaff.length === 0 ? (
                <p className="text-muted-foreground">No staff members found.</p>
              ) : (
                departmentStaff.map(staff => (
                  <div key={staff.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <p className="font-medium">{staff.name}</p>
                      <p className="text-sm text-muted-foreground">{staff.email}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
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
              title="Department Head Dashboard"
              description="Oversee your department's complaint handling"
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

            {/* Pending Disputes Alert (if any) */}
            {pendingDisputes.length > 0 && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-md dark:bg-orange-900/20 dark:border-orange-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-orange-800 dark:text-orange-400">
                    <MessageSquareWarning className="h-5 w-5" />
                    <span className="font-medium">
                      {pendingDisputes.length} pending dispute{pendingDisputes.length > 1 ? 's' : ''} awaiting your review
                    </span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setActiveItem('disputes')}
                  >
                    Review Disputes
                  </Button>
                </div>
              </div>
            )}

            {/* Escalation Alert (if any) */}
            {escalatedComplaints.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-red-800 dark:text-red-400">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">
                      {escalatedComplaints.length} escalated complaint{escalatedComplaints.length > 1 ? 's' : ''} require attention
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

            {/* Unassigned Complaints - Priority */}
            {unassignedComplaints.length > 0 && (
              <DashboardSection
                title="Unassigned Complaints"
                description="These complaints need staff assignment"
                action={
                  <Button 
                    variant="link" 
                    size="sm"
                    onClick={() => setActiveItem('unassigned')}
                  >
                    View All ({unassignedComplaints.length})
                  </Button>
                }
              >
                <ComplaintList
                  complaints={unassignedComplaints.slice(0, 3)}
                  isLoading={isLoading}
                  emptyMessage="All complaints are assigned."
                  compact={true}
                  onReassign={handleReassign}
                  onViewDetails={handleViewDetails}
                />
              </DashboardSection>
            )}

            {/* Department Complaints Overview */}
            <DashboardSection
              title="Recent Department Complaints"
              description="Latest complaints in your department"
              action={
                <Button 
                  variant="link" 
                  size="sm"
                  onClick={() => setActiveItem('all-complaints')}
                >
                  View All
                </Button>
              }
            >
              <ComplaintList
                complaints={complaints.slice(0, 5)}
                isLoading={isLoading}
                emptyMessage="No complaints in your department."
                compact={true}
                onResolve={handleResolveComplaint}
                onReassign={handleReassign}
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
      menuItems={deptHeadMenuItems}
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

export default DepartmentHeadDashboard;
