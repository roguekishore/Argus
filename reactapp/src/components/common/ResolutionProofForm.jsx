/**
 * ResolutionProofForm - Form for staff to upload resolution proof
 * 
 * ARCHITECTURE NOTES:
 * - Used exclusively by StaffDashboard
 * - Handles S3 image upload
 * - Enables "Mark as Resolved" button after proof submitted
 * 
 * PROP-DRIVEN DESIGN:
 * - No role checks here - dashboard controls visibility
 * - onSubmit callback handles API call
 */

import React, { useState, useCallback } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Textarea, Label } from '../ui';
import { Upload, CheckCircle, Loader2, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * ResolutionProofForm Component
 * 
 * @param {Object} props
 * @param {number} props.complaintId - Complaint ID to attach proof to
 * @param {Function} props.onSubmit - Callback when proof is submitted (proofData)
 * @param {Function} props.onCancel - Callback to close/cancel the form
 * @param {boolean} props.isLoading - Show loading state
 * @param {boolean} props.hasExistingProof - Whether proof already exists
 * @param {string} props.className - Additional CSS classes
 */
const ResolutionProofForm = ({
  complaintId,
  onSubmit,
  onCancel,
  isLoading = false,
  hasExistingProof = false,
  className,
}) => {
  // Form state
  const [proofImage, setProofImage] = useState(null);
  const [proofImagePreview, setProofImagePreview] = useState(null);
  const [description, setDescription] = useState('');
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
      setProofImage(file);
      setProofImagePreview(URL.createObjectURL(file));
      setError(null);
    }
  }, []);

  // Clear image selection
  const handleClearImage = useCallback(() => {
    setProofImage(null);
    if (proofImagePreview) {
      URL.revokeObjectURL(proofImagePreview);
    }
    setProofImagePreview(null);
  }, [proofImagePreview]);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!proofImage) {
      setError('Please upload a proof image');
      return;
    }

    if (!description.trim()) {
      setError('Please describe what was done to resolve the issue');
      return;
    }

    try {
      await onSubmit({
        complaintId,
        image: proofImage,
        description: description.trim(),
      });
      // Clear form on success
      handleClearImage();
      setDescription('');
    } catch (err) {
      setError(err.message || 'Failed to submit proof');
    }
  }, [complaintId, proofImage, description, onSubmit, handleClearImage]);

  // If proof already exists, show success state
  if (hasExistingProof) {
    return (
      <Card className={cn("border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800", className)}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-green-700 dark:text-green-400">
            <CheckCircle className="h-5 w-5" />
            <div>
              <p className="font-medium">Resolution proof submitted</p>
              <p className="text-sm text-green-600 dark:text-green-500">
                You can now mark this complaint as resolved
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Resolution Proof
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Image Upload */}
          <div className="space-y-2">
            <Label htmlFor="proof-image">Proof Image *</Label>
            {proofImagePreview ? (
              <div className="relative">
                <img
                  src={proofImagePreview}
                  alt="Proof preview"
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
                className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => document.getElementById('proof-image')?.click()}
              >
                <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Click to upload proof image
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG up to 5MB
                </p>
              </div>
            )}
            <Input
              id="proof-image"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="proof-description">Resolution Description *</Label>
            <Textarea
              id="proof-description"
              placeholder="Describe what was done to resolve the issue..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isLoading || !proofImage}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Submit Proof
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ResolutionProofForm;
