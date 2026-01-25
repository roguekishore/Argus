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

// Resolution & Dispute forms
export { default as ResolutionProofForm } from './ResolutionProofForm';
export { default as DisputeForm } from './DisputeForm';
export { default as CitizenSignoffForm } from './CitizenSignoffForm';

// Dashboard layout helpers
export { default as DashboardSection, PageHeader, StatsGrid, EmptyState } from './DashboardSection';

// Audit timeline components
export { default as AuditTimeline } from './AuditTimeline';
export { default as AuditTimelineItem } from './AuditTimelineItem';

// Notification components
export { default as NotificationPanel } from './NotificationPanel';
export { default as NotificationBell } from './NotificationBell';
