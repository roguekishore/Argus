/**
 * ComplaintCard - Universal Reusable Complaint Card Component
 * 
 * ARCHITECTURE NOTES:
 * - Prop-driven rendering - NO internal role checks
 * - Actions rendered based on callback props provided
 * - Field visibility controlled via visibleFields prop OR defaults based on role
 * - Dashboards control what to show by what props they pass
 * 
 * PROP-DRIVEN DESIGN:
 * - If onClose is passed → show Close button
 * - If onResolve is passed → show Resolve button
 * - etc.
 * 
 * This approach:
 * 1. Keeps the component role-agnostic
 * 2. Dashboards decide what actions are available
 * 3. Easy to test in isolation
 * 4. Future-proof for new roles/actions
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '../../components/ui';
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  User, 
  Building, 
  Calendar,
  MessageSquare,
  ArrowUpRight,
  X,
  Eye,
  MapPin
} from 'lucide-react';
import { 
  STATE_CONFIG,
  PRIORITY_CONFIG,
  COMPLAINT_STATES,
} from '../../constants/roles';
import { cn } from '../../lib/utils';

/**
 * Default field sets - can be overridden via props
 */
const DEFAULT_VISIBLE_FIELDS = [
  'id', 'title', 'description', 'status', 'createdTime', 'slaPromiseDate'
];

const EXTENDED_FIELDS = [
  ...DEFAULT_VISIBLE_FIELDS,
  'priority', 'escalationLevel', 'category', 'department', 
  'assignedStaff', 'citizen', 'location'
];

/**
 * ComplaintCard Component
 * 
 * @param {Object} props
 * @param {Object} props.complaint - Complaint data object
 * @param {Function} props.onClose - Callback when complaint is closed (citizen action)
 * @param {Function} props.onCancel - Callback when complaint is cancelled
 * @param {Function} props.onResolve - Callback when complaint is resolved (staff action)
 * @param {Function} props.onEscalate - Callback when complaint is escalated
 * @param {Function} props.onReassign - Callback when complaint is reassigned
 * @param {Function} props.onViewDetails - Callback to view full details
 * @param {Function} props.onRate - Callback to rate complaint resolution
 * @param {number|string} props.currentUserId - Current logged-in user ID (for checking if complaint is assigned to user)
 * @param {Array} props.visibleFields - Array of field names to display (optional)
 * @param {boolean} props.showAllFields - Show all available fields
 * @param {boolean} props.compact - Compact mode for lists
 * @param {string} props.className - Additional CSS classes
 */
const ComplaintCard = ({
  complaint,
  onClose,
  onCancel,
  onResolve,
  onEscalate,
  onReassign,
  onViewDetails,
  onRate,
  currentUserId,
  visibleFields,
  showAllFields = false,
  compact = false,
  className,
}) => {
  // Determine which fields to show
  const fieldsToShow = useMemo(() => {
    if (visibleFields) return visibleFields;
    if (showAllFields) return EXTENDED_FIELDS;
    return DEFAULT_VISIBLE_FIELDS;
  }, [visibleFields, showAllFields]);

  // Get display configurations
  // Note: Backend returns 'status' property, not 'state'
  const stateConfig = STATE_CONFIG[complaint.status] || {};
  const priorityConfig = complaint.priority ? PRIORITY_CONFIG[complaint.priority] : null;

  // Check if a field should be visible
  const showField = (field) => fieldsToShow.includes(field);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Calculate SLA status
  const getSlaStatus = () => {
    const slaDate = complaint.slaPromiseDate || complaint.slaDeadline;
    if (!slaDate) return null;
    const deadline = new Date(slaDate);
    const now = new Date();
    const isOverdue = deadline < now && 
      ![COMPLAINT_STATES.CLOSED, COMPLAINT_STATES.CANCELLED, COMPLAINT_STATES.RESOLVED].includes(complaint.status);
    return { isOverdue, date: deadline };
  };

  const slaStatus = getSlaStatus();

  // ==========================================================================
  // DETERMINE WHICH ACTIONS TO SHOW
  // Actions are shown based on what callbacks are passed + complaint state
  // ==========================================================================
  const actions = useMemo(() => {
    const available = [];

    // View Details - always show if callback provided
    if (onViewDetails) {
      available.push({
        key: 'viewDetails',
        label: 'View Details',
        icon: <Eye className="h-3 w-3 mr-1" />,
        variant: 'outline',
        onClick: () => onViewDetails(complaint),
      });
    }

    // Close - citizen can close resolved complaints
    if (onClose && complaint.status === COMPLAINT_STATES.RESOLVED) {
      available.push({
        key: 'close',
        label: 'Close',
        icon: <CheckCircle2 className="h-3 w-3 mr-1" />,
        variant: 'default',
        onClick: () => onClose(complaint.id || complaint.complaintId),
      });
    }

    // Rate - only for resolved complaints that haven't been rated yet
    // Once closed (via signoff), the rating has already been submitted
    if (onRate && complaint.status === COMPLAINT_STATES.RESOLVED && !complaint.rating) {
      available.push({
        key: 'rate',
        label: 'Rate Service',
        icon: null,
        variant: 'outline',
        onClick: () => onRate(complaint.id || complaint.complaintId),
      });
    }

    // Resolve - staff/dept head can resolve in-progress complaints
    // If currentUserId is provided, only show resolve if complaint is assigned to that user
    if (onResolve && complaint.status === COMPLAINT_STATES.IN_PROGRESS) {
      const complaintStaffId = complaint.staffId || complaint.assignedStaffId;
      const canResolve = !currentUserId || (complaintStaffId && String(complaintStaffId) === String(currentUserId));
      if (canResolve) {
        available.push({
          key: 'resolve',
          label: 'Resolve',
          icon: <CheckCircle2 className="h-3 w-3 mr-1" />,
          variant: 'default',
          onClick: () => onResolve(complaint.id || complaint.complaintId),
        });
      }
    }
    
    // Reassign/Assign - dept head can assign/reassign (not for closed, cancelled, or resolved)
    if (onReassign && ![COMPLAINT_STATES.CLOSED, COMPLAINT_STATES.CANCELLED, COMPLAINT_STATES.RESOLVED].includes(complaint.status)) {
      // Show "Assign" if no staff assigned, "Reassign" if already assigned
      const isUnassigned = !complaint.staffId && !complaint.assignedStaff;
      available.push({
        key: 'reassign',
        label: isUnassigned ? 'Assign' : 'Reassign',
        icon: null,
        variant: 'outline',
        onClick: () => onReassign(complaint),
      });
    }

    // Escalate - admin can escalate
    if (onEscalate && ![COMPLAINT_STATES.CLOSED, COMPLAINT_STATES.CANCELLED, COMPLAINT_STATES.RESOLVED].includes(complaint.status)) {
      available.push({
        key: 'escalate',
        label: 'Escalate',
        icon: <ArrowUpRight className="h-3 w-3 mr-1" />,
        variant: 'outline',
        className: 'text-orange-600 hover:text-orange-700',
        onClick: () => onEscalate(complaint.id || complaint.complaintId),
      });
    }

    // Cancel - citizen/admin can cancel
    if (onCancel && ![COMPLAINT_STATES.CLOSED, COMPLAINT_STATES.CANCELLED].includes(complaint.status)) {
      available.push({
        key: 'cancel',
        label: 'Cancel',
        icon: <X className="h-3 w-3 mr-1" />,
        variant: 'outline',
        className: 'text-red-600 hover:text-red-700',
        onClick: () => onCancel(complaint.id || complaint.complaintId),
      });
    }

    return available;
  }, [complaint, onViewDetails, onClose, onRate, onResolve, onReassign, onEscalate, onCancel]);

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <Card className={cn('transition-all hover:shadow-md', className)}>
      <CardHeader className={cn('pb-2', compact && 'py-3')}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Complaint ID */}
              <CardTitle className={cn('font-semibold', compact ? 'text-sm' : 'text-base')}>
                #{complaint.id || complaint.complaintId}
              </CardTitle>

              {/* Priority Badge */}
              {showField('priority') && priorityConfig && (
                <Badge className={cn(priorityConfig.color, priorityConfig.darkColor)}>
                  {priorityConfig.label}
                </Badge>
              )}

              {/* Escalation Badge */}
              {showField('escalationLevel') && complaint.escalationLevel > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  L{complaint.escalationLevel}
                </Badge>
              )}
            </div>

            {/* Title/Topic */}
            {showField('title') && (
              <p className={cn(
                'font-medium mt-1',
                compact ? 'text-sm' : 'text-base'
              )}>
                {complaint.title || complaint.topic}
              </p>
            )}

            {/* Description */}
            {showField('description') && complaint.description && (
              <p className={cn(
                'text-muted-foreground mt-1 line-clamp-2',
                compact ? 'text-xs' : 'text-sm'
              )}>
                {complaint.description}
              </p>
            )}

            {/* Compact mode - show filed date inline */}
            {compact && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Calendar className="h-3 w-3" />
                <span>Filed: {formatDate(complaint.createdTime || complaint.createdAt)}</span>
              </div>
            )}
          </div>

          {/* Right side - SLA and Status badges */}
          <div className="flex flex-row sm:flex-col items-start sm:items-end gap-2 shrink-0">
            {/* Status Badge on right */}
            <Badge className={cn(stateConfig.color, stateConfig.darkColor)}>
              {stateConfig.label || complaint.status}
            </Badge>

            {/* SLA Indicator */}
            {showField('slaPromiseDate') && slaStatus && (
              <div className={cn(
                'flex items-center gap-1 text-xs px-2 py-1 rounded-full',
                slaStatus.isOverdue 
                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                  : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              )}>
                <Clock className="h-3 w-3" />
                {slaStatus.isOverdue ? 'Overdue' : formatDate(slaStatus.date)}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className={compact ? 'py-2' : ''}>
        {/* Metadata Grid - only show in non-compact mode */}
        {!compact && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-muted-foreground mb-4">
            {/* Location */}
            {showField('location') && complaint.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>{complaint.location}</span>
              </div>
            )}

            {/* Category */}
            {showField('category') && complaint.category && (
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                <span>{complaint.category.name || complaint.category}</span>
              </div>
            )}

            {/* Department */}
            {showField('department') && complaint.department && (
              <div className="flex items-center gap-1">
                <Building className="h-3 w-3" />
                <span>{complaint.department.name || complaint.department}</span>
              </div>
            )}

            {/* Assigned Staff */}
            {showField('assignedStaff') && complaint.assignedStaff && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{complaint.assignedStaff.name || 'Assigned'}</span>
              </div>
            )}

            {/* Created Date */}
            {showField('createdTime') && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Filed: {formatDate(complaint.createdTime || complaint.createdAt)}</span>
              </div>
            )}

            {/* Citizen (for staff/admin views) */}
            {showField('citizen') && complaint.citizen && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>By: {complaint.citizen.name || complaint.citizen}</span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons - rendered based on provided callbacks */}
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-3 border-t">
            {actions.map((action) => (
              <Button 
                key={action.key}
                variant={action.variant} 
                size="sm" 
                onClick={action.onClick}
                className={action.className}
              >
                {action.icon}
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ComplaintCard;
