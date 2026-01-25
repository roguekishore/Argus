/**
 * MunicipalCommissionerDashboard - Dashboard for Municipal Commissioner
 * 
 * ARCHITECTURE NOTES:
 * - Primary focus: ESCALATIONS ONLY
 * - Read-only view - Commissioner does not modify complaint state
 * - High-level oversight of system-wide escalated issues
 * - No operational actions, just visibility
 * 
 * DATA FLOW:
 * - useComplaints() automatically fetches escalated complaints for COMMISSIONER role
 * - Stats show escalation breakdown by level
 * 
 * FUTURE EXTENSIBILITY:
 * - Department performance metrics
 * - Trend analysis for escalations
 * - Notification preferences for critical issues
 */

import React, { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import { Button } from "../../components/ui";
import { ComplaintList, DashboardSection, PageHeader, StatsGrid } from "../../components/common";
import { useUser } from "../../context/UserContext";
import { useComplaints } from "../../hooks/useComplaints";
import { useAuth } from "../../hooks/useAuth";
import { ROLE_DISPLAY_NAMES } from "../../constants/roles";
import {
  LayoutDashboard,
  AlertTriangle,
  RefreshCw,
  Scale,
  FileText,
  Eye,
} from "lucide-react";

// =============================================================================
// MENU CONFIGURATION
// Commissioner has minimal menu - focused only on escalations
// =============================================================================
const commissionerMenuItems = [
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
    label: "Escalations",
    items: [
      {
        id: "all-escalations",
        label: "All Escalations",
        icon: <AlertTriangle className="h-4 w-4" />,
      },
      {
        id: "level-1",
        label: "Level 1 (Dept Head)",
        icon: <AlertTriangle className="h-4 w-4" />,
      },
      {
        id: "level-2",
        label: "Level 2+ (Commissioner)",
        icon: <Scale className="h-4 w-4" />,
      },
    ],
  },
];

// =============================================================================
// MUNICIPAL COMMISSIONER DASHBOARD COMPONENT
// =============================================================================
const MunicipalCommissionerDashboard = () => {
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState("dashboard");
  
  // Context and hooks
  const { userId, role, email, name } = useUser();
  const { logout } = useAuth();
  const {
    complaints, // For COMMISSIONER role, this returns only escalated complaints
    stats,
    isLoading,
    error,
    refresh,
  } = useComplaints();

  // ==========================================================================
  // DERIVED DATA
  // Commissioner sees only escalations - stats reflect escalation levels
  // ==========================================================================
  const escalationStats = useMemo(() => {
    const level1 = complaints.filter(c => c.escalationLevel === 1).length;
    const level2Plus = complaints.filter(c => c.escalationLevel >= 2).length;
    
    return [
      { 
        title: "Total Escalated", 
        value: complaints.length.toString(), 
        description: "All escalations",
        icon: <AlertTriangle className="h-5 w-5 text-red-500" /> 
      },
      { 
        title: "Level 1", 
        value: level1.toString(), 
        description: "At Department Head",
        icon: <AlertTriangle className="h-5 w-5 text-yellow-500" /> 
      },
      { 
        title: "Level 2+", 
        value: level2Plus.toString(), 
        description: "Requires your attention",
        icon: <Scale className="h-5 w-5 text-red-500" /> 
      },
      { 
        title: "System Total", 
        value: stats.total?.toString() || "0", 
        description: "All complaints",
        icon: <FileText className="h-5 w-5" /> 
      },
    ];
  }, [complaints, stats]);

  // Filter escalations based on level
  const filteredComplaints = useMemo(() => {
    switch (activeItem) {
      case 'level-1':
        return complaints.filter(c => c.escalationLevel === 1);
      case 'level-2':
        return complaints.filter(c => c.escalationLevel >= 2);
      case 'all-escalations':
      default:
        return complaints;
    }
  }, [complaints, activeItem]);

  // ==========================================================================
  // ACTION HANDLERS
  // Commissioner has READ-ONLY access - only view details
  // ==========================================================================
  
  // View complaint details
  const handleViewDetails = useCallback((complaint) => {
    navigate(`/dashboard/commissioner/complaints/${complaint.complaintId || complaint.id}`);
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
    const breadcrumbs = [{ label: "Dashboard", href: "/dashboard/commissioner" }];
    
    if (activeItem !== "dashboard") {
      for (const group of commissionerMenuItems) {
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
    name: name || 'Municipal Commissioner',
    email: email || 'commissioner@municipality.gov',
    role: ROLE_DISPLAY_NAMES[role] || 'Municipal Commissioner',
  };

  // ==========================================================================
  // RENDER CONTENT
  // ==========================================================================
  const renderContent = () => {
    switch (activeItem) {
      // -----------------------------------------------------------------------
      // ESCALATION LISTS BY LEVEL
      // -----------------------------------------------------------------------
      case 'all-escalations':
      case 'level-1':
      case 'level-2':
        const titles = {
          'all-escalations': 'All Escalated Complaints',
          'level-1': 'Level 1 Escalations',
          'level-2': 'Level 2+ Escalations',
        };
        const descriptions = {
          'all-escalations': 'All complaints that have been escalated system-wide',
          'level-1': 'Escalated to Department Head level',
          'level-2': 'Escalated to Commissioner level - requires your review',
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
                <span className="font-medium">Read-Only View</span>
              </div>
              <p className="text-sm mt-1">
                As Municipal Commissioner, you have oversight visibility. Complaint resolution is handled by departments.
              </p>
            </div>
            
            <ComplaintList
              complaints={filteredComplaints}
              isLoading={isLoading}
              emptyMessage="No escalated complaints at this level."
              onViewDetails={handleViewDetails}
              // No action handlers - read-only view
            />
          </div>
        );

      // -----------------------------------------------------------------------
      // DASHBOARD (DEFAULT) - Escalation Overview
      // -----------------------------------------------------------------------
      default:
        const criticalEscalations = complaints.filter(c => c.escalationLevel >= 2);
        
        return (
          <div className="space-y-6">
            <PageHeader
              title="Municipal Commissioner Dashboard"
              description="High-level oversight of escalated grievances"
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

            {/* Escalation Stats */}
            <StatsGrid stats={escalationStats} />

            {/* Critical Escalations Alert */}
            {criticalEscalations.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-red-800 dark:text-red-400">
                    <Scale className="h-5 w-5" />
                    <span className="font-medium">
                      {criticalEscalations.length} escalation{criticalEscalations.length > 1 ? 's' : ''} at Commissioner level
                    </span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setActiveItem('level-2')}
                  >
                    Review Now
                  </Button>
                </div>
              </div>
            )}

            {/* Commissioner-Level Escalations */}
            <DashboardSection
              title="Escalations Requiring Your Attention"
              description="Level 2+ escalations - elevated to Commissioner"
              action={
                <Button 
                  variant="link" 
                  size="sm"
                  onClick={() => setActiveItem('level-2')}
                >
                  View All
                </Button>
              }
            >
              <ComplaintList
                complaints={criticalEscalations.slice(0, 5)}
                isLoading={isLoading}
                emptyMessage="No escalations at Commissioner level."
                compact={true}
                onViewDetails={handleViewDetails}
              />
            </DashboardSection>

            {/* All Escalations Overview */}
            <DashboardSection
              title="All System Escalations"
              description="Complete view of all escalated complaints"
              action={
                <Button 
                  variant="link" 
                  size="sm"
                  onClick={() => setActiveItem('all-escalations')}
                >
                  View All ({complaints.length})
                </Button>
              }
            >
              <ComplaintList
                complaints={complaints.slice(0, 5)}
                isLoading={isLoading}
                emptyMessage="No escalated complaints in the system."
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
      menuItems={commissionerMenuItems}
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

export default MunicipalCommissionerDashboard;
