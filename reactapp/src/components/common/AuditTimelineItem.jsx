/**
 * AuditTimelineItem - Individual timeline entry
 * 
 * ARCHITECTURE NOTES:
 * - Purely presentational - no logic
 * - Receives a single audit log entry as props
 * - Renders action-specific icon, badge, and content
 * - Visually distinguishes USER vs SYSTEM actions
 * 
 * DESIGN PHILOSOPHY:
 * - Clear, readable, trustworthy
 * - Human-friendly timestamps
 * - Calm colors - not alarming
 */

import React from 'react';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  ArrowRight,
  ArrowUpRight,
  Clock,
  UserCheck,
  PauseCircle,
  FileText,
  MessageSquare,
  Star,
  Zap,
  Bot,
  User,
} from 'lucide-react';

/**
 * Action type configuration
 * Maps action types to icons, colors, and labels
 */
const ACTION_CONFIG = {
  STATE_CHANGE: {
    icon: ArrowRight,
    label: 'Status Changed',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    iconColor: 'text-blue-600',
  },
  ESCALATION: {
    icon: ArrowUpRight,
    label: 'Escalated',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    iconColor: 'text-orange-600',
  },
  SLA_UPDATE: {
    icon: Clock,
    label: 'SLA Updated',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    iconColor: 'text-purple-600',
  },
  ASSIGNMENT: {
    icon: UserCheck,
    label: 'Assigned',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    iconColor: 'text-green-600',
  },
  SUSPENSION: {
    icon: PauseCircle,
    label: 'Suspended',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    iconColor: 'text-yellow-600',
  },
  CREATED: {
    icon: FileText,
    label: 'Created',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    iconColor: 'text-emerald-600',
  },
  UPDATED: {
    icon: FileText,
    label: 'Updated',
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-400',
    iconColor: 'text-slate-600',
  },
  COMMENT: {
    icon: MessageSquare,
    label: 'Comment',
    color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    iconColor: 'text-sky-600',
  },
  RATING: {
    icon: Star,
    label: 'Rated',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    iconColor: 'text-amber-600',
  },
  DEFAULT: {
    icon: Zap,
    label: 'Activity',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400',
    iconColor: 'text-gray-600',
  },
};

/**
 * Format timestamp to human-readable string
 * Shows relative time for recent, absolute for older
 */
const formatTimestamp = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Less than 1 hour: show minutes
  if (diffMins < 60) {
    return diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`;
  }
  
  // Less than 24 hours: show hours
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }
  
  // Less than 7 days: show days
  if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
  
  // Older: show full date
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format value for display
 * Handles null, undefined, and transforms snake_case to readable
 */
const formatValue = (value) => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') {
    // Convert SNAKE_CASE to Title Case
    return value
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }
  return String(value);
};

/**
 * AuditTimelineItem Component
 * 
 * @param {Object} props
 * @param {Object} props.entry - Audit log entry
 * @param {boolean} props.isFirst - Is this the first item (no line above)
 * @param {boolean} props.isLast - Is this the last item (no line below)
 */
const AuditTimelineItem = ({ entry, isFirst = false, isLast = false }) => {
  const config = ACTION_CONFIG[entry.action] || ACTION_CONFIG.DEFAULT;
  const Icon = config.icon;
  const isSystem = entry.actorType === 'SYSTEM';

  return (
    <div className="relative flex gap-4">
      {/* Timeline line and dot */}
      <div className="flex flex-col items-center">
        {/* Line above (hidden for first item) */}
        <div 
          className={cn(
            'w-0.5 flex-grow',
            isFirst ? 'bg-transparent' : 'bg-border'
          )} 
        />
        
        {/* Icon dot */}
        <div className={cn(
          'flex items-center justify-center w-8 h-8 rounded-full border-2 bg-background shrink-0',
          isSystem ? 'border-muted-foreground/30' : 'border-primary/30'
        )}>
          <Icon className={cn('h-4 w-4', config.iconColor)} />
        </div>
        
        {/* Line below (hidden for last item) */}
        <div 
          className={cn(
            'w-0.5 flex-grow',
            isLast ? 'bg-transparent' : 'bg-border'
          )} 
        />
      </div>

      {/* Content */}
      <div className="flex-1 pb-6 pt-1">
        {/* Header row: badge + timestamp */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className={cn('text-xs font-medium', config.color)}>
            {config.label}
          </Badge>
          
          {/* System badge */}
          {isSystem && (
            <Badge variant="outline" className="text-xs gap-1">
              <Bot className="h-3 w-3" />
              System
            </Badge>
          )}
          
          {/* Timestamp */}
          <span className="text-xs text-muted-foreground ml-auto">
            {formatTimestamp(entry.createdAt)}
          </span>
        </div>

        {/* Value change (if applicable) */}
        {(entry.oldValue || entry.newValue) && (
          <div className="mt-2 flex items-center gap-2 text-sm">
            {entry.oldValue && (
              <span className="text-muted-foreground line-through">
                {formatValue(entry.oldValue)}
              </span>
            )}
            {entry.oldValue && entry.newValue && (
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            )}
            {entry.newValue && (
              <span className="font-medium">
                {formatValue(entry.newValue)}
              </span>
            )}
          </div>
        )}

        {/* Reason (if provided) */}
        {entry.reason && (
          <p className="mt-2 text-sm text-muted-foreground italic">
            "{entry.reason}"
          </p>
        )}

        {/* Actor info (for user actions) */}
        {!isSystem && entry.actorId && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>User #{entry.actorId}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditTimelineItem;
