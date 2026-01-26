/**
 * Common Components Index
 * 
 * Exports all reusable, role-agnostic components
 */

// Complaint components
export { default as ComplaintCard } from './ComplaintCard';
export { default as ComplaintList } from './ComplaintList';
export { default as ComplaintDetailSection } from './ComplaintDetailSection';
export { default as ComplaintDetailPage } from './ComplaintDetailPage';
export { default as ComplaintForm } from './ComplaintForm';

// Location & Duplicate Detection
export { default as LocationPicker } from './LocationPicker';
export { default as DuplicateWarning } from './DuplicateWarning';

// Community features (upvoting, nearby complaints)
export { default as NearbyComplaints } from './NearbyComplaints';

// Resolution & Dispute forms
export { default as ResolutionProofForm } from './ResolutionProofForm';
export { default as DisputeForm } from './DisputeForm';
export { default as CitizenSignoffForm } from './CitizenSignoffForm';

// Assignment modals
export { default as StaffAssignmentModal } from './StaffAssignmentModal';

// Dashboard layout helpers
export { default as DashboardSection, PageHeader, StatsGrid, EmptyState } from './DashboardSection';

// Audit timeline components
export { default as AuditTimeline } from './AuditTimeline';
export { default as AuditTimelineItem } from './AuditTimelineItem';

// Notification components
export { default as NotificationPanel } from './NotificationPanel';
export { default as NotificationBell } from './NotificationBell';
