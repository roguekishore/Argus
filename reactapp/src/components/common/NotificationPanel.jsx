/**
 * NotificationPanel - Displays a list of notifications
 * 
 * ARCHITECTURE NOTES:
 * - Purely presentational - receives data via props
 * - No API calls - all data fetching happens in parent/hook
 * - Role-agnostic - works for any user type
 * - Handles loading, error, and empty states
 * 
 * DESIGN PHILOSOPHY:
 * - Notifications = awareness (transient)
 * - Different from Audit Timeline (accountability, permanent)
 * - Clean, calm UI - not noisy
 * - Human-readable timestamps
 */

import React from 'react';
import { 
  AlertCircle, 
  ArrowUpRight, 
  Bell, 
  CheckCircle2, 
  Clock, 
  MessageSquare,
  AlertTriangle,
  UserCheck,
  Info,
} from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Notification type configuration
 * Maps notification types to icons and styling
 */
const NOTIFICATION_CONFIG = {
  ESCALATION: {
    icon: ArrowUpRight,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  STATUS_CHANGE: {
    icon: CheckCircle2,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  ASSIGNMENT: {
    icon: UserCheck,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
  SLA_WARNING: {
    icon: Clock,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-800',
  },
  SLA_BREACH: {
    icon: AlertTriangle,
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800',
  },
  COMMENT: {
    icon: MessageSquare,
    color: 'text-gray-500',
    bgColor: 'bg-gray-50 dark:bg-gray-900/30',
    borderColor: 'border-gray-200 dark:border-gray-700',
  },
  RESOLUTION: {
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  GENERAL: {
    icon: Info,
    color: 'text-slate-500',
    bgColor: 'bg-slate-50 dark:bg-slate-900/30',
    borderColor: 'border-slate-200 dark:border-slate-700',
  },
};

/**
 * Format timestamp to human-readable relative time
 * @param {string} dateString - ISO date string
 * @returns {string} - Human readable time
 */
const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  
  // For older notifications, show the actual date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

/**
 * Single notification item
 */
const NotificationItem = ({ 
  notification, 
  onClick, 
  onNavigate,
}) => {
  const { 
    id, 
    title, 
    message, 
    type = 'GENERAL', 
    isRead, 
    createdAt,
    complaintId,
  } = notification;

  const config = NOTIFICATION_CONFIG[type] || NOTIFICATION_CONFIG.GENERAL;
  const IconComponent = config.icon;

  const handleClick = () => {
    onClick?.(notification);
  };

  const handleNavigate = (e) => {
    e.stopPropagation();
    if (complaintId) {
      onNavigate?.(complaintId);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      className={cn(
        'relative flex gap-3 p-3 cursor-pointer transition-colors',
        'hover:bg-muted/50',
        'border-b border-border last:border-b-0',
        !isRead && config.bgColor
      )}
    >
      {/* Unread indicator */}
      {!isRead && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
      )}

      {/* Icon */}
      <div className={cn(
        'flex-shrink-0 mt-0.5',
        config.color
      )}>
        <IconComponent className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            'text-sm font-medium truncate',
            !isRead && 'text-foreground',
            isRead && 'text-muted-foreground'
          )}>
            {title}
          </p>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
            {formatRelativeTime(createdAt)}
          </span>
        </div>
        
        <p className={cn(
          'text-xs line-clamp-2',
          !isRead && 'text-muted-foreground',
          isRead && 'text-muted-foreground/70'
        )}>
          {message}
        </p>

        {/* Complaint link */}
        {complaintId && (
          <button
            onClick={handleNavigate}
            className="text-xs text-primary hover:underline mt-1"
          >
            View Complaint #{complaintId}
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Empty state component
 */
const EmptyNotifications = () => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="rounded-full bg-muted p-3 mb-3">
      <Bell className="h-6 w-6 text-muted-foreground" />
    </div>
    <p className="text-sm font-medium text-muted-foreground">
      No notifications
    </p>
    <p className="text-xs text-muted-foreground/70 mt-1">
      You're all caught up!
    </p>
  </div>
);

/**
 * Loading state component
 */
const LoadingNotifications = () => (
  <div className="flex flex-col gap-3 p-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex gap-3 animate-pulse">
        <div className="w-4 h-4 rounded bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-full" />
        </div>
      </div>
    ))}
  </div>
);

/**
 * Error state component
 */
const ErrorNotifications = ({ error, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
    <AlertCircle className="h-8 w-8 text-destructive mb-2" />
    <p className="text-sm font-medium text-destructive">
      Failed to load notifications
    </p>
    <p className="text-xs text-muted-foreground mt-1 mb-3">
      {error}
    </p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="text-xs text-primary hover:underline"
      >
        Try again
      </button>
    )}
  </div>
);

/**
 * NotificationPanel Component
 * 
 * @param {Object} props
 * @param {Array} props.notifications - Array of notification objects
 * @param {boolean} props.isLoading - Loading state
 * @param {string} props.error - Error message
 * @param {Function} props.onNotificationClick - Callback when notification is clicked (receives notification)
 * @param {Function} props.onNavigateToComplaint - Callback to navigate to complaint (receives complaintId)
 * @param {Function} props.onMarkAllRead - Callback to mark all as read
 * @param {Function} props.onRetry - Callback to retry fetching
 * @param {number} props.unreadCount - Number of unread notifications
 * @param {string} props.className - Additional CSS classes
 */
const NotificationPanel = ({
  notifications = [],
  isLoading = false,
  error = null,
  onNotificationClick,
  onNavigateToComplaint,
  onMarkAllRead,
  onRetry,
  unreadCount = 0,
  className,
}) => {
  // Render loading state
  if (isLoading && notifications.length === 0) {
    return (
      <div className={cn('w-full', className)}>
        <LoadingNotifications />
      </div>
    );
  }

  // Render error state
  if (error && notifications.length === 0) {
    return (
      <div className={cn('w-full', className)}>
        <ErrorNotifications error={error} onRetry={onRetry} />
      </div>
    );
  }

  // Render empty state
  if (notifications.length === 0) {
    return (
      <div className={cn('w-full', className)}>
        <EmptyNotifications />
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Header with Mark All Read */}
      {unreadCount > 0 && onMarkAllRead && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
          <span className="text-xs text-muted-foreground">
            {unreadCount} unread
          </span>
          <button
            onClick={onMarkAllRead}
            className="text-xs text-primary hover:underline"
          >
            Mark all read
          </button>
        </div>
      )}

      {/* Notification list */}
      <div className="max-h-[400px] overflow-y-auto">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onClick={onNotificationClick}
            onNavigate={onNavigateToComplaint}
          />
        ))}
      </div>

      {/* Footer loading indicator for background refresh */}
      {isLoading && notifications.length > 0 && (
        <div className="flex items-center justify-center py-2 border-t border-border">
          <span className="text-xs text-muted-foreground">Refreshing...</span>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
