/**
 * ComplaintDetailPage - Full page view for a single complaint
 * 
 * FEATURES:
 * - Shows all complaint details including image evidence
 * - Displays AI reasoning and image analysis
 * - Shows audit timeline
 * - Role-appropriate action buttons
 * 
 * USAGE:
 * This page is rendered when navigating to /dashboard/{role}/complaints/:complaintId
 * It fetches complaint details and displays them in a detailed view.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardFooter
} from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  Building,
  AlertTriangle,
  CheckCircle2,
  X,
  Image as ImageIcon,
  Brain,
  FileText,
  Loader2,
  ExternalLink,
  ZoomIn,
  Camera,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { complaintsService, resolutionProofService } from '../../services';
import { AuditTimeline, CitizenSignoffForm } from '../common';
import { useAuditLogs } from '../../hooks/useAuditLogs';
import { STATE_CONFIG, PRIORITY_CONFIG, COMPLAINT_STATES } from '../../constants/roles';
import { cn } from '../../lib/utils';

/**
 * ComplaintDetailPage Component
 */
const ComplaintDetailPage = ({
  complaintId: propComplaintId,  // Can be passed as prop
  onClose,
  onCancel,
  onResolve,
  onRate,
  onAcceptResolution,            // Citizen accepts resolution
  onSubmitDispute,               // Citizen disputes resolution
  onBack,                        // Callback for back navigation
  backPath = '..',
  role = 'citizen'
}) => {
  const { complaintId: paramComplaintId } = useParams();
  const navigate = useNavigate();
  
  // Use prop if provided, otherwise use route param
  const complaintId = propComplaintId || paramComplaintId;
  
  const [complaint, setComplaint] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  
  // Resolution proofs state
  const [resolutionProofs, setResolutionProofs] = useState([]);
  const [proofsLoading, setProofsLoading] = useState(false);
  const [proofImageModalUrl, setProofImageModalUrl] = useState(null);
  
  // Signoff/Dispute state
  const [showSignoffForm, setShowSignoffForm] = useState(false);
  const [signoffLoading, setSignoffLoading] = useState(false);
  
  // Fetch audit logs
  const { logs, isLoading: logsLoading } = useAuditLogs(complaintId, {
    autoFetch: !!complaintId,
  });

  // Fetch complaint details
  const fetchComplaint = useCallback(async () => {
    if (!complaintId) {
      setError('No complaint ID provided');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await complaintsService.getDetails(complaintId);
      setComplaint(data);
    } catch (err) {
      console.error('Failed to fetch complaint:', err);
      setError(err.message || 'Failed to load complaint details');
    } finally {
      setIsLoading(false);
    }
  }, [complaintId]);

  // Fetch resolution proofs
  const fetchResolutionProofs = useCallback(async () => {
    if (!complaintId) return;
    
    setProofsLoading(true);
    try {
      const proofs = await resolutionProofService.getForComplaint(complaintId);
      setResolutionProofs(Array.isArray(proofs) ? proofs : []);
    } catch (err) {
      console.error('Failed to fetch resolution proofs:', err);
      setResolutionProofs([]);
    } finally {
      setProofsLoading(false);
    }
  }, [complaintId]);

  useEffect(() => {
    fetchComplaint();
  }, [fetchComplaint]);

  // Fetch proofs when complaint is loaded and is resolved
  useEffect(() => {
    if (complaint && complaint.status === COMPLAINT_STATES.RESOLVED) {
      fetchResolutionProofs();
    }
  }, [complaint, fetchResolutionProofs]);

  // Handle accept resolution
  const handleAcceptResolution = async (signoffData) => {
    if (!onAcceptResolution) return;
    setSignoffLoading(true);
    try {
      await onAcceptResolution(signoffData);
      setShowSignoffForm(false);
    } catch (err) {
      console.error('Failed to accept resolution:', err);
      throw err;
    } finally {
      setSignoffLoading(false);
    }
  };

  // Handle submit dispute
  const handleSubmitDispute = async (disputeData) => {
    if (!onSubmitDispute) return;
    setSignoffLoading(true);
    try {
      await onSubmitDispute(disputeData);
      setShowSignoffForm(false);
    } catch (err) {
      console.error('Failed to submit dispute:', err);
      throw err;
    } finally {
      setSignoffLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get state config
  const stateConfig = complaint?.status ? STATE_CONFIG[complaint.status] : {};
  const priorityConfig = complaint?.priority ? PRIORITY_CONFIG[complaint.priority] : null;

  // Check SLA status
  const getSlaStatus = () => {
    if (!complaint?.slaDeadline) return null;
    const deadline = new Date(complaint.slaDeadline);
    const now = new Date();
    const isOverdue = deadline < now && 
      ![COMPLAINT_STATES.CLOSED, COMPLAINT_STATES.CANCELLED, COMPLAINT_STATES.RESOLVED].includes(complaint.status);
    return { isOverdue, date: deadline };
  };

  const slaStatus = getSlaStatus();

  // Handle back navigation
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(backPath);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading complaint details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500" />
            <h3 className="text-lg font-semibold">Error Loading Complaint</h3>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No complaint found
  if (!complaint) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Complaint Not Found</h3>
            <p className="text-muted-foreground">The complaint you're looking for doesn't exist.</p>
            <Button onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            Complaint #{complaint.complaintId}
          </h1>
        </div>
      </div>

      {/* Main complaint card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl">{complaint.title}</CardTitle>
              <CardDescription className="mt-1">
                Filed on {formatDate(complaint.createdTime)}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className={cn(stateConfig.color, stateConfig.darkColor)}>
                {stateConfig.label || complaint.status}
              </Badge>
              {priorityConfig && (
                <Badge className={cn(priorityConfig.color, priorityConfig.darkColor)}>
                  {priorityConfig.label}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Description */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Description
            </h3>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {complaint.description}
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Location */}
            {complaint.location && (
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Location</p>
                  <p className="text-sm text-muted-foreground">{complaint.location}</p>
                </div>
              </div>
            )}

            {/* Category */}
            {complaint.categoryName && (
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Building className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Category</p>
                  <p className="text-sm text-muted-foreground">{complaint.categoryName}</p>
                </div>
              </div>
            )}

            {/* Department */}
            {complaint.departmentName && (
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Building className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Department</p>
                  <p className="text-sm text-muted-foreground">{complaint.departmentName}</p>
                </div>
              </div>
            )}

            {/* Assigned Staff */}
            {complaint.staffName && (
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <User className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Assigned To</p>
                  <p className="text-sm text-muted-foreground">{complaint.staffName}</p>
                </div>
              </div>
            )}

            {/* SLA Deadline */}
            {complaint.slaDeadline && (
              <div className={cn(
                "flex items-start gap-3 p-3 rounded-lg",
                slaStatus?.isOverdue 
                  ? "bg-red-100 dark:bg-red-900/30" 
                  : "bg-muted/50"
              )}>
                <Clock className={cn(
                  "h-5 w-5 shrink-0 mt-0.5",
                  slaStatus?.isOverdue ? "text-red-600" : "text-muted-foreground"
                )} />
                <div>
                  <p className="text-sm font-medium">SLA Deadline</p>
                  <p className={cn(
                    "text-sm",
                    slaStatus?.isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"
                  )}>
                    {formatDate(complaint.slaDeadline)}
                    {slaStatus?.isOverdue && " (Overdue!)"}
                  </p>
                </div>
              </div>
            )}

            {/* SLA Days */}
            {complaint.slaDaysAssigned && (
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">SLA Duration</p>
                  <p className="text-sm text-muted-foreground">{complaint.slaDaysAssigned} days</p>
                </div>
              </div>
            )}
          </div>

          {/* Image Evidence Section */}
          {complaint.imageUrl && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Evidence Image
              </h3>
              <div className="relative group">
                <img
                  src={complaint.imageUrl}
                  alt="Complaint evidence"
                  className="w-full max-w-lg rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setImageModalOpen(true)}
                />
                <div 
                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg cursor-pointer max-w-lg"
                  onClick={() => setImageModalOpen(true)}
                >
                  <div className="flex items-center gap-2 text-white">
                    <ZoomIn className="h-6 w-6" />
                    <span>Click to enlarge</span>
                  </div>
                </div>
              </div>
              
              {/* Image Analysis */}
              {complaint.imageAnalysis && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                    AI Image Analysis:
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {complaint.imageAnalysis}
                  </p>
                  {complaint.imageAnalyzedAt && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Analyzed: {formatDate(complaint.imageAnalyzedAt)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* AI Reasoning Section */}
          {complaint.aiReasoning && (
            <div className="border rounded-lg p-4 bg-purple-50 dark:bg-purple-900/20">
              <h3 className="font-semibold mb-2 flex items-center gap-2 text-purple-800 dark:text-purple-200">
                <Brain className="h-4 w-4" />
                AI Classification Reasoning
              </h3>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                {complaint.aiReasoning}
              </p>
              {complaint.aiConfidence && (
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                  Confidence: {(complaint.aiConfidence * 100).toFixed(0)}%
                </p>
              )}
            </div>
          )}

          {/* Resolution Proofs Section (for RESOLVED complaints) */}
          {complaint.status === COMPLAINT_STATES.RESOLVED && (
            <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-green-800 dark:text-green-200">
                <Camera className="h-4 w-4" />
                Resolution Proof
              </h3>
              
              {proofsLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading resolution proofs...</span>
                </div>
              ) : resolutionProofs.length > 0 ? (
                <div className="space-y-4">
                  {resolutionProofs.map((proof, index) => (
                    <div key={proof.id || index} className="border border-green-200 dark:border-green-800 rounded-lg p-3">
                      {/* Proof Image */}
                      {proof.proofImageUrl && (
                        <div className="mb-3">
                          <img
                            src={proof.proofImageUrl}
                            alt="Resolution proof"
                            className="w-full max-w-md rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setProofImageModalUrl(proof.proofImageUrl)}
                          />
                        </div>
                      )}
                      
                      {/* Proof Details */}
                      <div className="space-y-2">
                        <p className="text-sm text-green-700 dark:text-green-300">
                          <strong>Staff Remarks:</strong> {proof.remarks || 'No remarks provided'}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Submitted: {formatDate(proof.submittedAt || proof.createdAt)}
                        </p>
                        {proof.staffName && (
                          <p className="text-xs text-green-600 dark:text-green-400">
                            By: {proof.staffName}
                          </p>
                        )}
                        {proof.isVerified && (
                          <Badge className="bg-green-600 text-white">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No resolution proof available yet.</p>
              )}

              {/* Accept/Dispute Options for Citizens */}
              {role === 'citizen' && (onAcceptResolution || onSubmitDispute) && !showSignoffForm && (
                <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                    Are you satisfied with this resolution?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {onAcceptResolution && (
                      <Button 
                        onClick={() => setShowSignoffForm(true)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <ThumbsUp className="h-4 w-4 mr-2" />
                        Accept & Close
                      </Button>
                    )}
                    {onSubmitDispute && (
                      <Button 
                        variant="outline"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => setShowSignoffForm(true)}
                      >
                        <ThumbsDown className="h-4 w-4 mr-2" />
                        Dispute Resolution
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Signoff Form */}
              {showSignoffForm && (
                <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800">
                  <CitizenSignoffForm
                    complaintId={complaintId}
                    onAccept={handleAcceptResolution}
                    onDispute={handleSubmitDispute}
                    onCancel={() => setShowSignoffForm(false)}
                    isLoading={signoffLoading}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>

        {/* Action Buttons */}
        <CardFooter className="flex flex-wrap gap-2 border-t pt-4">
          {/* Close button (for resolved complaints) */}
          {onClose && complaint.status === COMPLAINT_STATES.RESOLVED && (
            <Button onClick={() => onClose(complaint.complaintId)}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Close Complaint
            </Button>
          )}

          {/* Rate button */}
          {onRate && [COMPLAINT_STATES.RESOLVED, COMPLAINT_STATES.CLOSED].includes(complaint.status) && (
            <Button variant="outline" onClick={() => onRate(complaint.complaintId)}>
              Rate Service
            </Button>
          )}

          {/* Resolve button (for staff) */}
          {onResolve && complaint.status === COMPLAINT_STATES.IN_PROGRESS && (
            <Button onClick={() => onResolve(complaint.complaintId)}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Resolve
            </Button>
          )}

          {/* Cancel button */}
          {onCancel && ![COMPLAINT_STATES.CLOSED, COMPLAINT_STATES.CANCELLED].includes(complaint.status) && (
            <Button 
              variant="outline" 
              className="text-red-600 hover:text-red-700"
              onClick={() => onCancel(complaint.complaintId)}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}

          {/* Open image in new tab */}
          {complaint.imageUrl && (
            <Button 
              variant="ghost" 
              className="ml-auto"
              onClick={() => window.open(complaint.imageUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Image
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Audit Timeline */}
      <AuditTimeline
        logs={logs}
        isLoading={logsLoading}
        defaultExpanded={true}
      />

      {/* Image Modal */}
      {imageModalOpen && complaint.imageUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setImageModalOpen(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={complaint.imageUrl}
              alt="Complaint evidence - Full size"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
              onClick={() => setImageModalOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>
      )}

      {/* Proof Image Modal */}
      {proofImageModalUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setProofImageModalUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={proofImageModalUrl}
              alt="Resolution proof - Full size"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
              onClick={() => setProofImageModalUrl(null)}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintDetailPage;
