/**
 * ComplaintList - Reusable Complaint List Component
 * 
 * Renders a list of complaints using ComplaintCard.
 * Handles loading, empty states, and pagination.
 */

import React from 'react';
import ComplaintCard from './ComplaintCard';
import { Card, CardContent } from '../../components/ui';
import { FileText, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * ComplaintList Component
 * 
 * @param {Object} props
 * @param {Array} props.complaints - Array of complaint objects
 * @param {boolean} props.isLoading - Loading state
 * @param {string} props.emptyMessage - Message when no complaints
 * @param {boolean} props.compact - Compact mode
 * @param {Function} props.onClose - Passed to ComplaintCard
 * @param {Function} props.onCancel - Passed to ComplaintCard
 * @param {Function} props.onResolve - Passed to ComplaintCard
 * @param {Function} props.onEscalate - Passed to ComplaintCard
 * @param {Function} props.onReassign - Passed to ComplaintCard
 * @param {Function} props.onViewDetails - Passed to ComplaintCard
 * @param {Function} props.onRate - Passed to ComplaintCard
 * @param {string} props.className - Additional CSS classes
 */
const ComplaintList = ({
  complaints = [],
  isLoading = false,
  emptyMessage = 'No complaints found',
  compact = false,
  onClose,
  onCancel,
  onResolve,
  onEscalate,
  onReassign,
  onViewDetails,
  onRate,
  className,
}) => {
  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground mt-4">Loading complaints...</p>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!complaints || complaints.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground mt-4">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  // List of complaints
  return (
    <div className={cn('space-y-4', className)}>
      {complaints.map((complaint) => (
        <ComplaintCard
          key={complaint.id}
          complaint={complaint}
          compact={compact}
          onClose={onClose}
          onCancel={onCancel}
          onResolve={onResolve}
          onEscalate={onEscalate}
          onReassign={onReassign}
          onViewDetails={onViewDetails}
          onRate={onRate}
        />
      ))}
    </div>
  );
};

export default ComplaintList;
