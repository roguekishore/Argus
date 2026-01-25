/**
 * ComplaintForm - Form for filing new complaints with image upload
 * 
 * ARCHITECTURE NOTES:
 * - Uses shadcn UI components (Card, Input, Textarea, Button, Label)
 * - Supports image upload with preview
 * - Validates required fields before submission
 * - Calls createWithImage API endpoint for multipart form data
 * 
 * FEATURES:
 * - Subject/Title field (required)
 * - Description field with character count (required, min 20 chars)
 * - Location field (optional but recommended)
 * - Image upload with drag-and-drop support
 * - Image preview with remove option
 * - Form validation with error messages
 * - Loading state during submission
 */

import React, { useState, useCallback, useRef } from "react";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  MapPin,
  FileText
} from "lucide-react";
import { cn } from "../../lib/utils";

// =============================================================================
// CONSTANTS
// =============================================================================
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MIN_DESCRIPTION_LENGTH = 20;
const MAX_DESCRIPTION_LENGTH = 2000;

// =============================================================================
// COMPLAINT FORM COMPONENT
// =============================================================================
const ComplaintForm = ({ 
  onSubmit, 
  onCancel, 
  isLoading = false,
  className 
}) => {
  // Form state
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    location: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null
  
  const fileInputRef = useRef(null);

  // ===========================================================================
  // VALIDATION
  // ===========================================================================
  const validateForm = useCallback(() => {
    const newErrors = {};

    // Subject validation
    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    } else if (formData.subject.trim().length < 5) {
      newErrors.subject = 'Subject must be at least 5 characters';
    }

    // Description validation
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < MIN_DESCRIPTION_LENGTH) {
      newErrors.description = `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters`;
    } else if (formData.description.trim().length > MAX_DESCRIPTION_LENGTH) {
      newErrors.description = `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`;
    }

    // Image validation (if selected)
    if (imageFile) {
      if (!ACCEPTED_IMAGE_TYPES.includes(imageFile.type)) {
        newErrors.image = 'Please select a valid image (JPEG, PNG, GIF, or WebP)';
      } else if (imageFile.size > MAX_FILE_SIZE) {
        newErrors.image = 'Image size cannot exceed 10MB';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, imageFile]);

  // ===========================================================================
  // HANDLERS
  // ===========================================================================
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  }, [errors]);

  const handleImageSelect = useCallback((file) => {
    if (!file) return;

    // Validate file type
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setErrors(prev => ({ ...prev, image: 'Please select a valid image (JPEG, PNG, GIF, or WebP)' }));
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setErrors(prev => ({ ...prev, image: 'Image size cannot exceed 10MB' }));
      return;
    }

    // Clear any previous image errors
    setErrors(prev => ({ ...prev, image: null }));
    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileInputChange = useCallback((e) => {
    const file = e.target.files?.[0];
    handleImageSelect(file);
  }, [handleImageSelect]);

  const handleRemoveImage = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    setErrors(prev => ({ ...prev, image: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleImageSelect(file);
    }
  }, [handleImageSelect]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitStatus(null);

    try {
      await onSubmit({
        subject: formData.subject.trim(),
        description: formData.description.trim(),
        location: formData.location.trim() || null,
      }, imageFile);

      setSubmitStatus('success');
      
      // Reset form after successful submission
      setFormData({ subject: '', description: '', location: '' });
      handleRemoveImage();
    } catch (error) {
      console.error('Failed to submit complaint:', error);
      setSubmitStatus('error');
      setErrors(prev => ({ 
        ...prev, 
        submit: error.message || 'Failed to submit complaint. Please try again.' 
      }));
    }
  }, [formData, imageFile, validateForm, onSubmit, handleRemoveImage]);

  // ===========================================================================
  // COMPUTED VALUES
  // ===========================================================================
  const descriptionLength = formData.description.length;
  const isDescriptionValid = descriptionLength >= MIN_DESCRIPTION_LENGTH;
  const descriptionHelperClass = cn(
    "text-xs",
    descriptionLength === 0 ? "text-muted-foreground" :
    descriptionLength < MIN_DESCRIPTION_LENGTH ? "text-yellow-600 dark:text-yellow-400" :
    descriptionLength > MAX_DESCRIPTION_LENGTH ? "text-red-600 dark:text-red-400" :
    "text-green-600 dark:text-green-400"
  );

  // ===========================================================================
  // RENDER
  // ===========================================================================
  return (
    <Card className={cn("w-full max-w-2xl", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          File New Complaint
        </CardTitle>
        <CardDescription>
          Describe your grievance in detail. You can optionally attach an image as evidence.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Success Message */}
          {submitStatus === 'success' && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              <span>Complaint submitted successfully! You can file another complaint or view your complaints.</span>
            </div>
          )}

          {/* Error Message */}
          {errors.submit && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              <span>{errors.submit}</span>
            </div>
          )}

          {/* Subject Field */}
          <div className="space-y-2">
            <Label htmlFor="subject" className="flex items-center gap-1">
              Subject <span className="text-red-500">*</span>
            </Label>
            <Input
              id="subject"
              name="subject"
              placeholder="Brief title describing your complaint"
              value={formData.subject}
              onChange={handleInputChange}
              disabled={isLoading}
              className={cn(errors.subject && "border-red-500 focus-visible:ring-red-500")}
            />
            {errors.subject && (
              <p className="text-sm text-red-500">{errors.subject}</p>
            )}
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-1">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Provide detailed information about your grievance. Include relevant dates, times, and any other important details."
              value={formData.description}
              onChange={handleInputChange}
              disabled={isLoading}
              rows={5}
              className={cn(errors.description && "border-red-500 focus-visible:ring-red-500")}
            />
            <div className="flex justify-between">
              {errors.description ? (
                <p className="text-sm text-red-500">{errors.description}</p>
              ) : (
                <p className={descriptionHelperClass}>
                  {descriptionLength < MIN_DESCRIPTION_LENGTH 
                    ? `${MIN_DESCRIPTION_LENGTH - descriptionLength} more characters needed`
                    : `${descriptionLength}/${MAX_DESCRIPTION_LENGTH} characters`
                  }
                </p>
              )}
            </div>
          </div>

          {/* Location Field */}
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              Location
              <span className="text-muted-foreground text-xs ml-1">(optional)</span>
            </Label>
            <Input
              id="location"
              name="location"
              placeholder="Address or area where the issue occurred"
              value={formData.location}
              onChange={handleInputChange}
              disabled={isLoading}
            />
          </div>

          {/* Image Upload Section */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <ImageIcon className="h-4 w-4" />
              Evidence Image
              <span className="text-muted-foreground text-xs ml-1">(optional)</span>
            </Label>
            
            {!imagePreview ? (
              // Upload Zone
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                  isDragging 
                    ? "border-primary bg-primary/5" 
                    : "border-muted-foreground/25 hover:border-primary/50",
                  errors.image && "border-red-500",
                  isLoading && "opacity-50 cursor-not-allowed"
                )}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !isLoading && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_IMAGE_TYPES.join(',')}
                  onChange={handleFileInputChange}
                  className="hidden"
                  disabled={isLoading}
                />
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {isDragging ? 'Drop image here' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPEG, PNG, GIF or WebP (max 10MB)
                </p>
              </div>
            ) : (
              // Image Preview
              <div className="relative rounded-lg overflow-hidden border">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full max-h-64 object-contain bg-muted"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveImage}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2">
                  {imageFile?.name} ({(imageFile?.size / 1024).toFixed(1)} KB)
                </div>
              </div>
            )}
            
            {errors.image && (
              <p className="text-sm text-red-500">{errors.image}</p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          {onCancel && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={isLoading || !formData.subject.trim() || !isDescriptionValid}
            className={cn(!onCancel && "ml-auto")}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Submit Complaint
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default ComplaintForm;
