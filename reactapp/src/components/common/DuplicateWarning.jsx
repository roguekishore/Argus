/**
 * DuplicateWarning - Shows potential duplicate complaints before submission
 * 
 * Displays a list of similar complaints found nearby to help users
 * avoid creating duplicate reports. Includes "Me Too" upvote button.
 */

import React, { useState } from 'react';
import { AlertTriangle, MapPin, Clock, Tag, ThumbsUp, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import communityService from '../../services/api/communityService';

const DuplicateWarning = ({ 
  duplicates, 
  isLoading,
  onDismiss,
  onUpvoteSuccess,
  userId,
  userLocation,
  className 
}) => {
  const [upvotingId, setUpvotingId] = useState(null);
  const [upvotedIds, setUpvotedIds] = useState(new Set());
  const [upvoteError, setUpvoteError] = useState(null);

  const handleMeToo = async (complaintId) => {
    if (!userId) {
      setUpvoteError('Please log in to upvote');
      return;
    }

    setUpvotingId(complaintId);
    setUpvoteError(null);

    try {
      await communityService.upvote(
        complaintId,
        userId,
        userLocation?.lat,
        userLocation?.lng
      );
      
      setUpvotedIds(prev => new Set([...prev, complaintId]));
      
      // Notify parent that user upvoted (can skip creating new complaint)
      onUpvoteSuccess?.(complaintId);
    } catch (err) {
      console.error('Upvote failed:', err);
      if (err.message?.includes('Already upvoted')) {
        setUpvotedIds(prev => new Set([...prev, complaintId]));
      } else {
        setUpvoteError('Failed to upvote. Please try again.');
      }
    } finally {
      setUpvotingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className={cn("p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800", className)}>
        <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-yellow-700 border-t-transparent" />
          <span className="text-sm font-medium">Checking for similar complaints nearby...</span>
        </div>
      </div>
    );
  }

  if (!duplicates || !duplicates.hasPotentialDuplicates) {
    return null;
  }

  const { potentialDuplicates, aiSummary } = duplicates;

  return (
    <div className={cn("rounded-lg border border-yellow-300 dark:border-yellow-700 overflow-hidden", className)}>
      {/* Header */}
      <div className="bg-yellow-100 dark:bg-yellow-900/40 px-4 py-3 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-yellow-800 dark:text-yellow-300">
            Potential Duplicate Complaints Found
          </h4>
          <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
            {aiSummary}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="text-yellow-700 hover:text-yellow-900 dark:text-yellow-400"
        >
          Dismiss
        </Button>
      </div>

      {/* Duplicate List */}
      <div className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
        {potentialDuplicates.map((dup) => (
          <div 
            key={dup.complaintId}
            className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    #{dup.complaintId}: {dup.title}
                  </span>
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                    dup.similarityScore >= 0.8 
                      ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                      : dup.similarityScore >= 0.6
                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                  )}>
                    {Math.round(dup.similarityScore * 100)}% similar
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                  {dup.description}
                </p>
                
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {dup.distanceMeters < 1000 
                      ? `${Math.round(dup.distanceMeters)}m away`
                      : `${(dup.distanceMeters / 1000).toFixed(1)}km away`
                    }
                  </span>
                  <span className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {dup.categoryName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(dup.createdTime).toLocaleDateString()}
                  </span>
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-xs",
                    dup.status === 'FILED' ? "bg-blue-100 text-blue-700" :
                    dup.status === 'IN_PROGRESS' ? "bg-yellow-100 text-yellow-700" :
                    dup.status === 'RESOLVED' ? "bg-green-100 text-green-700" :
                    "bg-gray-100 text-gray-700"
                  )}>
                    {dup.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Me Too Button */}
              <div className="flex-shrink-0">
                {upvotedIds.has(dup.complaintId) ? (
                  <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    Supported!
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => handleMeToo(dup.complaintId)}
                    disabled={upvotingId === dup.complaintId}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {upvotingId === dup.complaintId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        Me Too!
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Error Message */}
      {upvoteError && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          {upvoteError}
        </div>
      )}

      {/* Footer */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400">
        <strong>💡 Tip:</strong> Click "Me Too!" to support an existing complaint instead of creating a duplicate. This helps prioritize the issue!
      </div>
    </div>
  );
};

export default DuplicateWarning;
