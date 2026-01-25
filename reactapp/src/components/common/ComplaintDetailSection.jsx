/**
 * ComplaintDetailSection - Complaint detail view with audit timeline
 * 
 * ARCHITECTURE NOTES:
 * - Combines ComplaintCard + AuditTimeline
 * - Fetches audit logs using useAuditLogs hook
 * - Purely presentational - receives complaint and callbacks as props
 * - Role-agnostic - same component usable across all dashboards
 * 
 * USAGE EXAMPLE:
 * 
 * // In any dashboard or complaint detail page:
 * <ComplaintDetailSection
 *   complaint={complaint}
 *   onClose={handleClose}        // optional - controls what actions show
 *   onResolve={handleResolve}    // optional
 *   showAuditTimeline={true}     // default: true
 * />
 * 
 * DATA FLOW:
 * - Complaint data passed as prop
 * - Audit logs fetched internally via hook (based on complaintId)
 * - Action callbacks passed to ComplaintCard
 */

import React from 'react';
import ComplaintCard from './ComplaintCard';
import AuditTimeline from './AuditTimeline';
import { useAuditLogs } from '../../hooks/useAuditLogs';
import { cn } from '../../lib/utils';

/**
 * ComplaintDetailSection Component
 * 
 * @param {Object} props
 * @param {Object} props.complaint - Complaint data object
 * @param {Function} props.onClose - Callback for close action (optional)
 * @param {Function} props.onCancel - Callback for cancel action (optional)
 * @param {Function} props.onResolve - Callback for resolve action (optional)
 * @param {Function} props.onEscalate - Callback for escalate action (optional)
 * @param {Function} props.onReassign - Callback for reassign action (optional)
 * @param {Function} props.onRate - Callback for rate action (optional)
 * @param {boolean} props.showAuditTimeline - Whether to show audit timeline (default: true)
 * @param {boolean} props.auditDefaultExpanded - Audit timeline expanded by default (default: false)
 * @param {string} props.className - Additional CSS classes
 */
const ComplaintDetailSection = ({
  complaint,
  onClose,
  onCancel,
  onResolve,
  onEscalate,
  onReassign,
  onRate,
  showAuditTimeline = true,
  auditDefaultExpanded = false,
  className,
}) => {
  // Fetch audit logs for this complaint
  const complaintId = complaint?.id || complaint?.complaintId;
  const { logs, isLoading, error } = useAuditLogs(complaintId, {
    autoFetch: showAuditTimeline && !!complaintId,
  });

  if (!complaint) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Complaint Card - full view (not compact) */}
      <ComplaintCard
        complaint={complaint}
        compact={false}
        showAllFields={true}
        onClose={onClose}
        onCancel={onCancel}
        onResolve={onResolve}
        onEscalate={onEscalate}
        onReassign={onReassign}
        onRate={onRate}
      />

      {/* Audit Timeline */}
      {showAuditTimeline && (
        <AuditTimeline
          logs={logs}
          isLoading={isLoading}
          error={error}
          defaultExpanded={auditDefaultExpanded}
        />
      )}
    </div>
  );
};

export default ComplaintDetailSection;
