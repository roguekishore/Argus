/**
 * DisputeForm - Form for citizens to dispute a resolution
 * 
 * ARCHITECTURE NOTES:
 * - Used exclusively by CitizenDashboard
 * - Handles counter-proof image upload
 * - Requires dispute reason
 * 
 * PROP-DRIVEN DESIGN:
 * - No role checks here - dashboard controls visibility
 * - onSubmit callback handles API call
 */

import React, { useState, useCallback } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Textarea, Label } from '../ui';
import { AlertTriangle, Loader2, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * DisputeForm Component
 * 
 * @param {Object} props
 * @param {number} props.complaintId - Complaint ID to dispute
 * @param {Function} props.onSubmit - Callback when dispute is submitted (disputeData)
 * @param {Function} props.onCancel - Callback to close/cancel the form
 * @param {boolean} props.isLoading - Show loading state
 * @param {string} props.className - Additional CSS classes
 */
const DisputeForm = ({
  complaintId,
  onSubmit,
  onCancel,
  isLoading = false,
  className,
}) => {
  // Form state
  const [counterProofImage, setCounterProofImage] = useState(null);
  const [counterProofPreview, setCounterProofPreview] = useState(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState(null);

  // Handle image selection
  const handleImageChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }
      setCounterProofImage(file);
      setCounterProofPreview(URL.createObjectURL(file));
      setError(null);
    }
  }, []);

  // Clear image selection
  const handleClearImage = useCallback(() => {
    setCounterProofImage(null);
    if (counterProofPreview) {
      URL.revokeObjectURL(counterProofPreview);
    }
    setCounterProofPreview(null);
  }, [counterProofPreview]);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!counterProofImage) {
      setError('Please upload counter-proof showing the issue is not resolved');
      return;
    }

    if (!disputeReason.trim()) {
      setError('Please explain why you are disputing this resolution');
      return;
    }

    if (disputeReason.trim().length < 20) {
      setError('Please provide a more detailed reason (at least 20 characters)');
      return;
    }

    try {
      await onSubmit({
        complaintId,
        counterProofImage,
        disputeReason: disputeReason.trim(),
        feedback: feedback.trim() || undefined,
      });
      // Clear form on success
      handleClearImage();
      setDisputeReason('');
      setFeedback('');
    } catch (err) {
      setError(err.message || 'Failed to submit dispute');
    }
  }, [complaintId, counterProofImage, disputeReason, feedback, onSubmit, handleClearImage]);

  return (
    <Card className={cn("border-amber-200 dark:border-amber-800", className)}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5" />
          Dispute Resolution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400">
          <p className="font-medium">Not satisfied with the resolution?</p>
          <p className="mt-1">
            Upload photo evidence showing the issue is not resolved and explain why.
            The department head will review your dispute.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Counter-Proof Image Upload */}
          <div className="space-y-2">
            <Label htmlFor="counter-proof-image">Counter-Proof Image *</Label>
            <p className="text-xs text-muted-foreground">
              Upload a photo showing the issue is still present
            </p>
            {counterProofPreview ? (
              <div className="relative">
                <img
                  src={counterProofPreview}
                  alt="Counter-proof preview"
                  className="w-full h-48 object-cover rounded-md border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={handleClearImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-amber-300 rounded-md p-6 text-center cursor-pointer hover:border-amber-500 transition-colors dark:border-amber-700 dark:hover:border-amber-500"
                onClick={() => document.getElementById('counter-proof-image')?.click()}
              >
                <ImageIcon className="h-10 w-10 mx-auto text-amber-500" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Click to upload counter-proof
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG up to 5MB
                </p>
              </div>
            )}
            <Input
              id="counter-proof-image"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          {/* Dispute Reason */}
          <div className="space-y-2">
            <Label htmlFor="dispute-reason">Reason for Dispute *</Label>
            <Textarea
              id="dispute-reason"
              placeholder="Explain why you believe the issue is not resolved..."
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              {disputeReason.length}/20 characters minimum
            </p>
          </div>

          {/* Optional Feedback */}
          <div className="space-y-2">
            <Label htmlFor="feedback">Additional Feedback (Optional)</Label>
            <Textarea
              id="feedback"
              placeholder="Any additional comments about the resolution attempt..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button 
              type="submit" 
              variant="destructive"
              disabled={isLoading || !counterProofImage || disputeReason.length < 20}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Submit Dispute
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default DisputeForm;
