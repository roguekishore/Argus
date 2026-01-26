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
 * - Location field with interactive map pin (REQUIRED - must pin on map)
 * - Image upload with drag-and-drop support
 * - Image preview with remove option
 * - Form validation with error messages
 * - Loading state during submission
 * - Duplicate detection based on location + description similarity
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
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
  FileText,
  Map
} from "lucide-react";
import { cn } from "../../lib/utils";
import LocationPicker from "./LocationPicker";
import DuplicateWarning from "./DuplicateWarning";
import complaintsService from "../../services/api/complaintsService";

// =============================================================================
// CONSTANTS
// =============================================================================
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MIN_DESCRIPTION_LENGTH = 20;
const MAX_DESCRIPTION_LENGTH = 2000;
const DUPLICATE_CHECK_DEBOUNCE_MS = 1000;

// =============================================================================
// COMPLAINT FORM COMPONENT
// =============================================================================
const ComplaintForm = ({ 
  onSubmit, 
  onCancel, 
  isLoading = false,
  userId,
  className 
}) => {
  // Form state
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    location: '',
  });
  const [coordinates, setCoordinates] = useState(null); // { lat, lng }
  const [showMap, setShowMap] = useState(true); // Show map by default since location is required
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null
  
  // AI Validation state (pre-submission check)
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  
  // Duplicate detection state
  const [duplicateData, setDuplicateData] = useState(null);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [duplicatesDismissed, setDuplicatesDismissed] = useState(false);
  const duplicateCheckTimeoutRef = useRef(null);
  
  const fileInputRef = useRef(null);

  // ===========================================================================
  // DUPLICATE DETECTION (debounced)
  // ===========================================================================
  useEffect(() => {
    // Clear previous timeout
    if (duplicateCheckTimeoutRef.current) {
      clearTimeout(duplicateCheckTimeoutRef.current);
    }
    
    // Only check if we have coordinates AND sufficient description
    if (!coordinates || formData.description.length < MIN_DESCRIPTION_LENGTH) {
      setDuplicateData(null);
      return;
    }
    
    // Reset dismissed state when location or description changes significantly
    setDuplicatesDismissed(false);
    
    // Debounce the duplicate check
    duplicateCheckTimeoutRef.current = setTimeout(async () => {
      setIsCheckingDuplicates(true);
      try {
        const result = await complaintsService.checkDuplicates(
          formData.description,
          coordinates.lat,
          coordinates.lng
        );
        setDuplicateData(result);
      } catch (error) {
        console.error('Duplicate check failed:', error);
        // Don't block submission on duplicate check failure
        setDuplicateData(null);
      } finally {
        setIsCheckingDuplicates(false);
      }
    }, DUPLICATE_CHECK_DEBOUNCE_MS);
    
    return () => {
      if (duplicateCheckTimeoutRef.current) {
        clearTimeout(duplicateCheckTimeoutRef.current);
      }
    };
  }, [coordinates, formData.description]);

  // ===========================================================================
  // VALIDATION
  // ===========================================================================
  
  // Check if text looks like gibberish (no real words)
  const isGibberish = (text) => {
    if (!text || text.length < 10) return false;
    
    // Common civic keywords that indicate a real complaint
    const civicKeywords = [
      'garbage', 'pothole', 'water', 'road', 'street', 'light', 'drain', 
      'sewage', 'electricity', 'broken', 'leak', 'flood', 'blocked',
      'not working', 'damaged', 'problem', 'issue', 'complaint', 'help',
      'fix', 'repair', 'clean', 'collect', 'maintenance', 'days', 'weeks'
    ];
    
    const lowerText = text.toLowerCase();
    
    // If any civic keyword is found, it's not gibberish
    if (civicKeywords.some(keyword => lowerText.includes(keyword))) {
      return false;
    }
    
    // Check for repeating patterns (like "jjjjjj" or "asdfasdf")
    if (/(.)\1{4,}/.test(text)) return true; // Same char 5+ times
    if (/(.{2,4})\1{2,}/.test(text)) return true; // Pattern repeating 3+ times
    
    // Check consonant-to-vowel ratio (gibberish has too many consonants)
    const vowels = (text.match(/[aeiouAEIOU]/g) || []).length;
    const consonants = (text.match(/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]/g) || []).length;
    if (consonants > 0 && vowels / consonants < 0.15) return true; // Less than 15% vowels
    
    return false;
  };
  
  const validateForm = useCallback(() => {
    const newErrors = {};

    // Subject validation
    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    } else if (formData.subject.trim().length < 5) {
      newErrors.subject = 'Subject must be at least 5 characters';
    } else if (isGibberish(formData.subject.trim())) {
      newErrors.subject = 'Please enter a valid subject describing your issue';
    }

    // Description validation
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < MIN_DESCRIPTION_LENGTH) {
      newErrors.description = `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters`;
    } else if (formData.description.trim().length > MAX_DESCRIPTION_LENGTH) {
      newErrors.description = `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`;
    } else if (isGibberish(formData.description.trim())) {
      newErrors.description = 'Please describe your issue clearly. Random text is not accepted.';
    }

    // Location validation (required)
    if (!coordinates) {
      newErrors.location = 'Please pin the location on the map';
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
  }, [formData, imageFile, coordinates]);

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
    setValidationResult(null);
    setErrors(prev => ({ ...prev, validation: null }));

    // Step 1: AI validates complaint text BEFORE submission
    setIsValidating(true);
    try {
      console.log('Calling validation API...');
      const validation = await complaintsService.validateText(
        formData.subject.trim(),
        formData.description.trim(),
        formData.location.trim() || ''
      );
      console.log('Validation response:', validation);
      
      // Check if validation explicitly says invalid (valid === false)
      // Note: Java Boolean 'isValid' serializes as 'valid' in JSON
      if (validation && validation.valid === false) {
        setValidationResult(validation);
        setIsValidating(false);
        setErrors(prev => ({
          ...prev,
          validation: validation.message || 'This is not a valid municipal complaint.'
        }));
        return;
      }
      // If valid is true, proceed with submission
      console.log('Validation passed, submitting...');
    } catch (validationError) {
      console.error('Validation API error:', validationError);
      // Block submission if validation fails - don't let invalid complaints through
      setIsValidating(false);
      setErrors(prev => ({
        ...prev,
        validation: 'Unable to validate complaint. Please try again.'
      }));
      return;
    } finally {
      setIsValidating(false);
    }

    // Step 2: Submit the complaint (validation passed)
    try {
      await onSubmit({
        subject: formData.subject.trim(),
        description: formData.description.trim(),
        location: formData.location.trim() || null,
        latitude: coordinates?.lat || null,
        longitude: coordinates?.lng || null,
      }, imageFile);

      setSubmitStatus('success');
      
      // Reset form after successful submission
      setFormData({ subject: '', description: '', location: '' });
      setCoordinates(null);
      setShowMap(false);
      setDuplicateData(null);
      setValidationResult(null);
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

          {/* AI Validation Error - Vague Complaint */}
          {errors.validation && errors.validation !== 'OK' && (
            <div className="p-4 rounded-md bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    Please be more specific
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    {errors.validation}
                  </p>
                  {validationResult?.suggestion && (
                    <div className="mt-2 p-2 rounded bg-amber-100 dark:bg-amber-900/40">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        💡 <strong>Tip:</strong> {validationResult.suggestion}
                      </p>
                    </div>
                  )}
                  <button
                    type="button"
                    className="text-xs text-amber-600 dark:text-amber-400 underline mt-1"
                    onClick={() => {
                      setErrors(prev => ({ ...prev, validation: null }));
                      setValidationResult(null);
                    }}
                  >
                    Dismiss and edit complaint
                  </button>
                </div>
              </div>
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
          <div className="space-y-3">
            <Label htmlFor="location" className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              Location <span className="text-red-500">*</span>
            </Label>
            <Input
              id="location"
              name="location"
              placeholder="Address or area where the issue occurred"
              value={formData.location}
              onChange={handleInputChange}
              disabled={isLoading}
            />
            
            {/* Map Pin Toggle */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={showMap ? "default" : "outline"}
                size="sm"
                onClick={() => setShowMap(!showMap)}
                disabled={isLoading}
              >
                <Map className="h-4 w-4 mr-1" />
                {showMap ? 'Hide Map' : '📍 Pick Location on Map'}
              </Button>
              {coordinates ? (
                <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Location pinned
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Click the button to pin your complaint location
                </span>
              )}
            </div>
            {errors.location && (
              <p className="text-sm text-red-500">{errors.location}</p>
            )}
            
            {/* Location Picker Map */}
            {showMap && (
              <LocationPicker
                value={coordinates}
                onChange={setCoordinates}
                onClear={() => setCoordinates(null)}
                disabled={isLoading}
              />
            )}
          </div>

          {/* Duplicate Warning */}
          {(isCheckingDuplicates || (duplicateData?.hasPotentialDuplicates && !duplicatesDismissed)) && (
            <DuplicateWarning
              duplicates={duplicateData}
              isLoading={isCheckingDuplicates}
              onDismiss={() => setDuplicatesDismissed(true)}
              userId={userId}
              userLocation={coordinates}
              onUpvoteSuccess={(complaintId) => {
                // User upvoted an existing complaint
                setSubmitStatus('upvoted');
                setDuplicatesDismissed(true);
              }}
            />
          )}

          {/* Upvote Success Message */}
          {submitStatus === 'upvoted' && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              <span>Thanks! You've supported an existing complaint. No need to create a duplicate.</span>
            </div>
          )}

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
              disabled={isLoading || isValidating}
            >
              Cancel
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={isLoading || isValidating || !formData.subject.trim() || !isDescriptionValid}
            className={cn(!onCancel && "ml-auto")}
          >
            {isValidating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : isLoading ? (
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
