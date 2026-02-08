/**
 * CitizenSignoffForm - Form for citizens to accept or dispute a resolution
 * 
 * ARCHITECTURE NOTES:
 * - Provides clear choice between Accept (Close) and Dispute
 * - Accept requires rating
 * - Dispute shows DisputeForm
 * 
 * PROP-DRIVEN DESIGN:
 * - No role checks - dashboard controls visibility
 * - Only shows for RESOLVED complaints
 */

import React, { useState, useCallback } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Label, Textarea } from '../ui';
import { CheckCircle, AlertTriangle, Star, Loader2 } from 'lucide-react';
import DisputeForm from './DisputeForm';
import { cn } from '../../lib/utils';

/**
 * StarRating Component - Simple 5-star rating
 */
const StarRating = ({ rating, onRate, disabled }) => {
  const [hover, setHover] = useState(0);
  
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          className={cn(
            "p-1 transition-colors",
            disabled && "cursor-not-allowed opacity-50"
          )}
          onMouseEnter={() => !disabled && setHover(star)}
          onMouseLeave={() => !disabled && setHover(0)}
          onClick={() => !disabled && onRate(star)}
        >
          <Star
            className={cn(
              "h-6 w-6",
              (hover || rating) >= star
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            )}
          />
        </button>
      ))}
    </div>
  );
};

/**
 * CitizenSignoffForm Component
 * 
 * @param {Object} props
 * @param {number} props.complaintId - Complaint ID
 * @param {Function} props.onAccept - Callback when citizen accepts resolution
 * @param {Function} props.onDispute - Callback when citizen disputes resolution
 * @param {boolean} props.isLoading - Show loading state
 * @param {string} props.className - Additional CSS classes
 */
const CitizenSignoffForm = ({
  complaintId,
  onAccept,
  onDispute,
  isLoading = false,
  className,
}) => {
  // Mode: 'choose' | 'accept' | 'dispute'
  const [mode, setMode] = useState('choose');
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState(null);

  // Handle accept submission
  const handleAccept = useCallback(async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError('Please rate the resolution');
      return;
    }

    try {
      await onAccept({
        complaintId,
        rating,
        feedback: feedback.trim() || undefined,
        isAccepted: true,
      });
    } catch (err) {
      setError(err.message || 'Failed to accept resolution');
    }
  }, [complaintId, rating, feedback, onAccept]);

  // Choice mode - select accept or dispute
  if (mode === 'choose') {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="text-lg">Resolution Response</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The staff has marked this complaint as resolved. Please review and respond:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Accept Option */}
            <Card 
              className="cursor-pointer hover:border-green-500 transition-colors"
              onClick={() => setMode('accept')}
            >
              <CardContent className="pt-6 text-center">
                <CheckCircle className="h-10 w-10 mx-auto text-green-500" />
                <h3 className="mt-3 font-medium text-green-700 dark:text-green-400">
                  Accept & Close
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  The issue has been resolved to my satisfaction
                </p>
              </CardContent>
            </Card>

            {/* Dispute Option */}
            <Card 
              className="cursor-pointer hover:border-amber-500 transition-colors"
              onClick={() => setMode('dispute')}
            >
              <CardContent className="pt-6 text-center">
                <AlertTriangle className="h-10 w-10 mx-auto text-amber-500" />
                <h3 className="mt-3 font-medium text-amber-700 dark:text-amber-400">
                  Dispute Resolution
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  The issue is not resolved, I have evidence
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Accept mode - rating form
  if (mode === 'accept') {
    return (
      <Card className={cn("border-green-200 dark:border-green-800", className)}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle className="h-5 w-5" />
            Accept Resolution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAccept} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Rating */}
            <div className="space-y-2">
              <Label>Rate the Resolution *</Label>
              <StarRating rating={rating} onRate={setRating} disabled={isLoading} />
              {rating > 0 && (
                <p className="text-sm text-muted-foreground">
                  {rating === 1 && "Poor"}
                  {rating === 2 && "Below Average"}
                  {rating === 3 && "Average"}
                  {rating === 4 && "Good"}
                  {rating === 5 && "Excellent"}
                </p>
              )}
            </div>

            {/* Feedback */}
            <div className="space-y-2">
              <Label htmlFor="accept-feedback">Feedback (Optional)</Label>
              <Textarea
                id="accept-feedback"
                placeholder="Any comments about the resolution..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={2}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-2">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setMode('choose')}
                className="w-full sm:w-auto"
              >
                Back
              </Button>
              <Button 
                type="submit" 
                className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                disabled={isLoading || rating === 0}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Closing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Accept & Close
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  // Dispute mode - show dispute form
  return (
    <div className="space-y-4">
      <Button 
        variant="ghost" 
        onClick={() => setMode('choose')}
        className="mb-2"
      >
        ← Back to options
      </Button>
      <DisputeForm
        complaintId={complaintId}
        onSubmit={onDispute}
        onCancel={() => setMode('choose')}
        isLoading={isLoading}
        className={className}
      />
    </div>
  );
};

export default CitizenSignoffForm;
