/**
 * AuditTimeline - Collapsible timeline of audit log entries
 * 
 * ARCHITECTURE NOTES:
 * - Purely presentational - receives logs as props
 * - NO API calls inside - data fetching is done via useAuditLogs hook
 * - Role-agnostic - shows same data to all users
 * - Collapsible by default for cleaner UI
 * 
 * DESIGN PHILOSOPHY:
 * - Audit is a source of truth
 * - Timeline is explanatory, not actionable
 * - Clear, calm, trustworthy UI
 * - Optimized for readability during disputes
 * 
 * USAGE:
 * <AuditTimeline logs={auditLogs} />
 * <AuditTimeline logs={auditLogs} defaultExpanded={true} />
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import AuditTimelineItem from './AuditTimelineItem';
import {
  ChevronDown,
  ChevronUp,
  History,
  Loader2,
  FileQuestion,
} from 'lucide-react';

/**
 * AuditTimeline Component
 * 
 * @param {Object} props
 * @param {Array} props.logs - Array of audit log entries
 * @param {boolean} props.isLoading - Loading state
 * @param {string} props.error - Error message (if any)
 * @param {boolean} props.defaultExpanded - Start expanded (default: false)
 * @param {string} props.title - Custom title (default: "Activity History")
 * @param {string} props.className - Additional CSS classes
 */
const AuditTimeline = ({
  logs = [],
  isLoading = false,
  error = null,
  defaultExpanded = false,
  title = 'Activity History',
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => setIsExpanded(!isExpanded);

  // Count for header badge
  const logCount = logs.length;

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Header - always visible, clickable to toggle */}
      <CardHeader 
        className="cursor-pointer hover:bg-muted/50 transition-colors py-3"
        onClick={toggleExpanded}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base font-medium">{title}</CardTitle>
            {logCount > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {logCount} event{logCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {/* Content - collapsible */}
      {isExpanded && (
        <CardContent className="pt-0">
          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                Loading history...
              </span>
            </div>
          )}

          {/* Error state */}
          {!isLoading && error && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-destructive text-sm">{error}</div>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && logs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileQuestion className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                No activity recorded yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Actions on this complaint will appear here
              </p>
            </div>
          )}

          {/* Timeline entries */}
          {!isLoading && !error && logs.length > 0 && (
            <div className="mt-2">
              {logs.map((entry, index) => (
                <AuditTimelineItem
                  key={entry.id || index}
                  entry={entry}
                  isFirst={index === 0}
                  isLast={index === logs.length - 1}
                />
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default AuditTimeline;
