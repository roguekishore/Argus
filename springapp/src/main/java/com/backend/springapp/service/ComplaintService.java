package com.backend.springapp.service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.backend.springapp.audit.AuditActorContext;
import com.backend.springapp.audit.AuditService;
import com.backend.springapp.dto.response.ComplaintResponseDTO;
import com.backend.springapp.notification.NotificationService;
import com.backend.springapp.enums.ComplaintStatus;
import com.backend.springapp.enums.Priority;
import com.backend.springapp.exception.ResourceNotFoundException;
import com.backend.springapp.model.Category;
import com.backend.springapp.model.Complaint;
import com.backend.springapp.model.Department;
import com.backend.springapp.model.SLA;
import com.backend.springapp.model.User;
import com.backend.springapp.repository.CategoryRepository;
import com.backend.springapp.repository.ComplaintRepository;
import com.backend.springapp.repository.DepartmentRepository;
import com.backend.springapp.repository.SLARepository;
import com.backend.springapp.repository.UserRepository;
import com.backend.springapp.service.AIService.AIDecision;
import com.backend.springapp.service.ImageAnalysisService.ImageAnalysisResult;

import lombok.extern.slf4j.Slf4j;

@Service
@Transactional
@Slf4j
public class ComplaintService {
    
    /**
     * Confidence threshold for automatic routing.
     * Below this threshold, complaints are flagged for manual admin routing.
     */
    private static final double AI_CONFIDENCE_THRESHOLD = 0.7;
    
    @Autowired
    private ComplaintRepository complaintRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private SLARepository slaRepository;

    @Autowired
    private AIService aiService;

    @Autowired
    private AuditService auditService;

    @Autowired
    private NotificationService notificationService;
    
    @Autowired
    private S3StorageService s3StorageService;
    
    @Autowired
    private ImageAnalysisService imageAnalysisService;

    /**
     * Create a new complaint (filed by citizen)
     * AI automatically analyzes and assigns: category, department, priority, SLA
     */
    public ComplaintResponseDTO createComplaint(Complaint complaint, Long citizenId) {
        if (!userRepository.existsById(citizenId)) {
            throw new ResourceNotFoundException("Citizen not found with id: " + citizenId);
        }
        
        // Set basic fields
        complaint.setCitizenId(citizenId);
        complaint.setStatus(ComplaintStatus.FILED);
        complaint.setStaffId(null);
        complaint.setStartTime(null);
        complaint.setUpdatedTime(null);
        complaint.setResolvedTime(null);
        complaint.setClosedTime(null);
        complaint.setCitizenSatisfaction(null);

        // Save first to get ID
        Complaint saved = complaintRepository.save(complaint);

        // AI analyzes the complaint
        AIDecision aiDecision = aiService.analyzeComplaint(saved);

        // Apply AI decision
        Category category = categoryRepository.findByName(aiDecision.categoryName)
            .orElseGet(() -> categoryRepository.findByName("OTHER").orElseThrow());

        SLA slaConfig = slaRepository.findByCategory(category)
            .orElseThrow(() -> new ResourceNotFoundException("SLA not found for category: " + category.getName()));

        saved.setCategoryId(category.getId());
        saved.setPriority(Priority.valueOf(aiDecision.priority));
        saved.setSlaDaysAssigned(aiDecision.slaDays);
        saved.setSlaDeadline(LocalDateTime.now().plusDays(aiDecision.slaDays));
        saved.setAiReasoning(aiDecision.reasoning);
        saved.setAiConfidence(aiDecision.confidence);

        // Check AI confidence for automatic vs manual routing
        String departmentName;
        if (aiDecision.confidence < AI_CONFIDENCE_THRESHOLD) {
            // Low confidence: leave department unassigned for manual routing by admin
            saved.setDepartmentId(null);
            saved.setNeedsManualRouting(true);
            departmentName = "Pending Assignment";
            log.warn("⚠️ Low AI confidence ({}) for complaint #{} - flagged for manual routing", 
                     aiDecision.confidence, saved.getComplaintId());
        } else {
            // High confidence: auto-assign to AI-determined department
            saved.setDepartmentId(slaConfig.getDepartment().getId());
            saved.setNeedsManualRouting(false);
            departmentName = slaConfig.getDepartment().getName();
        }

        Complaint finalComplaint = complaintRepository.save(saved);

        // AUDIT: Record complaint creation with FILED status
        auditService.recordComplaintStateChange(
            finalComplaint.getComplaintId(),
            null,  // No previous state - this is creation
            ComplaintStatus.FILED.name(),
            AuditActorContext.forUser(citizenId),
            "Complaint filed by citizen"
        );
        
        // AUDIT: Record initial department assignment by AI
        String auditReason = saved.getNeedsManualRouting() 
            ? "Low AI confidence (" + aiDecision.confidence + ") - pending manual routing"
            : "AI-assigned department: " + departmentName;
        auditService.recordDepartmentAssignment(
            finalComplaint.getComplaintId(),
            null,  // No previous department
            saved.getDepartmentId(),
            AuditActorContext.system(),
            auditReason
        );

        // NOTIFY: Confirm to citizen that complaint was filed
        // String title = "Complaint #" + finalComplaint.getComplaintId();
        // notificationService.notifyStatusChange(
        //     citizenId,
        //     finalComplaint.getComplaintId(),
        //     title,
        //     null,  // No previous status
        //     ComplaintStatus.FILED.name()
        // );

        // Build response with all details
        return buildResponseDTO(finalComplaint, category.getName(), departmentName);
    }
    
    /**
     * Create a new complaint WITH image evidence (from frontend multipart upload).
     * 
     * ENHANCED FEATURE:
     * - Accepts raw image bytes from frontend
     * - Uploads image to S3 for permanent storage
     * - Performs multimodal AI analysis (text + image)
     * - Can upgrade priority based on visual severity
     * - Caches image analysis results with complaint
     * 
     * @param complaint The complaint entity with text fields
     * @param citizenId The citizen filing the complaint
     * @param imageBytes Raw image bytes (can be null)
     * @param imageMimeType MIME type of the image (required if imageBytes present)
     * @return ComplaintResponseDTO with AI decision and image analysis
     */
    public ComplaintResponseDTO createComplaintWithImage(Complaint complaint, Long citizenId, 
                                                          byte[] imageBytes, String imageMimeType) {
        if (!userRepository.existsById(citizenId)) {
            throw new ResourceNotFoundException("Citizen not found with id: " + citizenId);
        }
        
        // Set basic fields
        complaint.setCitizenId(citizenId);
        complaint.setStatus(ComplaintStatus.FILED);
        complaint.setStaffId(null);
        complaint.setStartTime(null);
        complaint.setUpdatedTime(null);
        complaint.setResolvedTime(null);
        complaint.setClosedTime(null);
        complaint.setCitizenSatisfaction(null);

        // STEP 1: Upload image to S3 if provided (before saving complaint)
        if (imageBytes != null && imageBytes.length > 0) {
            try {
                String s3Key = s3StorageService.uploadImage(imageBytes, imageMimeType, null);
                if (s3Key != null) {
                    complaint.setImageS3Key(s3Key);
                    complaint.setImageMimeType(imageMimeType);
                    log.info("📷 Image uploaded to S3: {} ({} bytes)", s3Key, imageBytes.length);
                }
            } catch (Exception e) {
                // Non-blocking: log error but continue with complaint creation
                log.error("❌ Image upload failed (non-blocking): {}", e.getMessage());
            }
        }

        // Save first to get ID
        Complaint saved = complaintRepository.save(complaint);

        // STEP 2: Multimodal AI analysis (text + image if available)
        AIDecision aiDecision;
        if (imageBytes != null && imageBytes.length > 0) {
            log.info("📷 Running multimodal AI analysis for complaint #{}", saved.getComplaintId());
            aiDecision = aiService.analyzeComplaint(saved, imageBytes, imageMimeType);
        } else {
            aiDecision = aiService.analyzeComplaint(saved);
        }

        // Apply AI decision
        Category category = categoryRepository.findByName(aiDecision.categoryName)
            .orElseGet(() -> categoryRepository.findByName("OTHER").orElseThrow());

        SLA slaConfig = slaRepository.findByCategory(category)
            .orElseThrow(() -> new ResourceNotFoundException("SLA not found for category: " + category.getName()));

        saved.setCategoryId(category.getId());
        saved.setPriority(Priority.valueOf(aiDecision.priority));
        saved.setSlaDaysAssigned(aiDecision.slaDays);
        saved.setSlaDeadline(LocalDateTime.now().plusDays(aiDecision.slaDays));
        saved.setAiReasoning(aiDecision.getFullReasoning());  // Includes image findings
        saved.setAiConfidence(aiDecision.confidence);

        // Check AI confidence for automatic vs manual routing
        String departmentName;
        if (aiDecision.confidence < AI_CONFIDENCE_THRESHOLD) {
            // Low confidence: leave department unassigned for manual routing by admin
            saved.setDepartmentId(null);
            saved.setNeedsManualRouting(true);
            departmentName = "Pending Assignment";
            log.warn("⚠️ Low AI confidence ({}) for complaint #{} - flagged for manual routing", 
                     aiDecision.confidence, saved.getComplaintId());
        } else {
            // High confidence: auto-assign to AI-determined department
            saved.setDepartmentId(slaConfig.getDepartment().getId());
            saved.setNeedsManualRouting(false);
            departmentName = slaConfig.getDepartment().getName();
        }

        // STEP 3: Cache image analysis results if image was analyzed
        if (aiDecision.hasImageFindings()) {
            saved.setImageAnalysis(aiDecision.imageFindings);
            saved.setImageAnalyzedAt(LocalDateTime.now());
        }

        Complaint finalComplaint = complaintRepository.save(saved);

        // AUDIT: Record complaint creation
        auditService.recordComplaintStateChange(
            finalComplaint.getComplaintId(),
            null,
            ComplaintStatus.FILED.name(),
            AuditActorContext.forUser(citizenId),
            "Complaint filed by citizen" + (imageBytes != null ? " (with image evidence)" : "")
        );
        
        String auditReason = saved.getNeedsManualRouting() 
            ? "Low AI confidence (" + aiDecision.confidence + ") - pending manual routing"
            : "AI-assigned department: " + departmentName;
        auditService.recordDepartmentAssignment(
            finalComplaint.getComplaintId(),
            null,
            saved.getDepartmentId(),
            AuditActorContext.system(),
            auditReason
        );

        return buildResponseDTO(finalComplaint, category.getName(), departmentName);
    }
    
    /**
     * Attach image to an EXISTING complaint.
     * Use when citizen adds evidence after initial filing.
     * 
     * @param complaintId The complaint to attach image to
     * @param imageBytes Raw image bytes
     * @param imageMimeType MIME type of image
     * @return Updated ComplaintResponseDTO
     */
    public ComplaintResponseDTO attachImageToComplaint(Long complaintId, byte[] imageBytes, String imageMimeType) {
        Complaint complaint = complaintRepository.findById(complaintId)
            .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + complaintId));
        
        if (imageBytes == null || imageBytes.length == 0) {
            throw new IllegalArgumentException("Image bytes cannot be empty");
        }
        
        // Upload to S3
        String s3Key = s3StorageService.uploadImage(imageBytes, imageMimeType, complaintId);
        if (s3Key == null) {
            throw new RuntimeException("Failed to upload image to S3");
        }
        
        // Update complaint with image reference
        complaint.setImageS3Key(s3Key);
        complaint.setImageMimeType(imageMimeType);
        
        // Analyze image and cache results (async-safe, non-blocking on errors)
        try {
            ImageAnalysisResult analysis = imageAnalysisService.analyzeImage(
                imageBytes, imageMimeType, 
                complaint.getDescription(), complaint.getLocation()
            );
            
            if (analysis != null) {
                complaint.setImageAnalysis(analysis.toJson());
                complaint.setImageAnalyzedAt(LocalDateTime.now());
                
                // Upgrade priority if image shows safety hazards
                if (analysis.suggestsUpgrade() && complaint.getPriority() != Priority.CRITICAL) {
                    Priority currentPriority = complaint.getPriority();
                    Priority upgradedPriority = upgradePriority(currentPriority);
                    
                    complaint.setPriority(upgradedPriority);
                    complaint.setAiReasoning(
                        (complaint.getAiReasoning() != null ? complaint.getAiReasoning() : "") +
                        " | Image analysis upgraded priority: " + analysis.priorityReason()
                    );
                    
                    log.info("📷 Priority upgraded {} → {} based on image analysis", 
                             currentPriority, upgradedPriority);
                }
            }
        } catch (Exception e) {
            // Non-blocking: log but continue
            log.error("❌ Image analysis failed (non-blocking): {}", e.getMessage());
        }
        
        complaint.setUpdatedTime(LocalDateTime.now());
        Complaint saved = complaintRepository.save(complaint);
        
        // Fetch category and department names
        String categoryName = complaint.getCategoryId() != null 
            ? categoryRepository.findById(complaint.getCategoryId()).map(Category::getName).orElse("OTHER")
            : "OTHER";
        String departmentName = complaint.getDepartmentId() != null 
            ? departmentRepository.findById(complaint.getDepartmentId()).map(Department::getName).orElse("Unknown")
            : "Pending Assignment";
        
        return buildResponseDTO(saved, categoryName, departmentName);
    }
    
    /**
     * Get image analysis results for a complaint.
     * Returns cached results if available, otherwise returns null.
     */
    public Map<String, Object> getImageAnalysisForComplaint(Long complaintId) {
        Complaint complaint = complaintRepository.findById(complaintId)
            .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + complaintId));
        
        if (complaint.getImageS3Key() == null) {
            return null;  // No image attached
        }
        
        Map<String, Object> result = new HashMap<>();
        result.put("hasImage", true);
        result.put("imageS3Key", complaint.getImageS3Key());
        result.put("imageMimeType", complaint.getImageMimeType());
        
        if (complaint.getImageAnalysis() != null) {
            result.put("hasAnalysis", true);
            result.put("analysis", complaint.getImageAnalysis());
            result.put("analyzedAt", complaint.getImageAnalyzedAt());
        } else {
            result.put("hasAnalysis", false);
        }
        
        return result;
    }
    
    /**
     * Helper: Upgrade priority by one level
     */
    private Priority upgradePriority(Priority current) {
        if (current == null) return Priority.MEDIUM;
        return switch (current) {
            case LOW -> Priority.MEDIUM;
            case MEDIUM -> Priority.HIGH;
            case HIGH, CRITICAL -> Priority.CRITICAL;
        };
    }

    /**
     * Build response DTO with AI analysis details
     */
    private ComplaintResponseDTO buildResponseDTO(Complaint complaint, String categoryName, String departmentName) {
        String staffName = null;
        if (complaint.getStaffId() != null) {
            staffName = userRepository.findById(complaint.getStaffId())
                .map(User::getName)
                .orElse(null);
        }
        
        // Generate presigned URL for image if available
        String imageUrl = null;
        if (complaint.getImageS3Key() != null && !complaint.getImageS3Key().isBlank()) {
            imageUrl = s3StorageService.getPresignedUrl(complaint.getImageS3Key());
        }

        return ComplaintResponseDTO.builder()
            .complaintId(complaint.getComplaintId())
            .title(complaint.getTitle())
            .description(complaint.getDescription())
            .location(complaint.getLocation())
            .latitude(complaint.getLatitude())
            .longitude(complaint.getLongitude())
            .status(complaint.getStatus())
            .createdTime(complaint.getCreatedTime())
            .citizenId(complaint.getCitizenId())
            .categoryName(categoryName)
            .departmentName(departmentName)
            .priority(complaint.getPriority())
            .slaDaysAssigned(complaint.getSlaDaysAssigned())
            .slaDeadline(complaint.getSlaDeadline())
            .aiReasoning(complaint.getAiReasoning())
            .aiConfidence(complaint.getAiConfidence())
            .needsManualRouting(complaint.getNeedsManualRouting())
            .staffId(complaint.getStaffId())
            .staffName(staffName)
            .imageUrl(imageUrl)
            .imageMimeType(complaint.getImageMimeType())
            .imageAnalysis(complaint.getImageAnalysis())
            .imageAnalyzedAt(complaint.getImageAnalyzedAt())
            .upvoteCount(complaint.getUpvoteCount() != null ? complaint.getUpvoteCount() : 0)
            .build();
    }

    /**
     * Get complaint by ID with full details
     */
    @Transactional(readOnly = true)
    public ComplaintResponseDTO getComplaintResponseById(Long complaintId) {
        Complaint complaint = complaintRepository.findById(complaintId)
            .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + complaintId));
        
        String categoryName = "Unknown";
        String departmentName = "Unknown";
        
        if (complaint.getCategoryId() != null) {
            categoryName = categoryRepository.findById(complaint.getCategoryId())
                .map(Category::getName)
                .orElse("Unknown");
        }
        if (complaint.getDepartmentId() != null) {
            departmentName = departmentRepository.findById(complaint.getDepartmentId())
                .map(Department::getName)
                .orElse("Unknown");
        }
        
        return buildResponseDTO(complaint, categoryName, departmentName);
    }

    @Transactional(readOnly = true)
    public Complaint getComplaintById(Long complaintId) {
        return complaintRepository.findById(complaintId)
            .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + complaintId));
    }

    @Transactional(readOnly = true)
    public List<Complaint> getAllComplaints() {
        return complaintRepository.findAll();
    }
    
    public Complaint updateComplaint(Long complaintId, Complaint updatedComplaint) {
        Complaint existingComplaint = complaintRepository.findById(complaintId)
            .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + complaintId));
        
        if (updatedComplaint.getTitle() != null) {
            existingComplaint.setTitle(updatedComplaint.getTitle());
        }
        if (updatedComplaint.getDescription() != null) {
            existingComplaint.setDescription(updatedComplaint.getDescription());
        }
        if (updatedComplaint.getLocation() != null) {
            existingComplaint.setLocation(updatedComplaint.getLocation());
        }
        if (updatedComplaint.getStatus() != null) {
            existingComplaint.setStatus(updatedComplaint.getStatus());
        }
        existingComplaint.setUpdatedTime(LocalDateTime.now());
        
        return complaintRepository.save(existingComplaint);
    }

    public void deleteComplaint(Long complaintId) {
        if (!complaintRepository.existsById(complaintId)) {
            throw new ResourceNotFoundException("Complaint not found with id: " + complaintId);
        }
        complaintRepository.deleteById(complaintId);
    }

    // assign department to complaint by department name(by AI)
    public Complaint assignDepartmentByName(Long complaintId, String departmentName) {
        Complaint complaint = complaintRepository.findById(complaintId)
            .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + complaintId));
        
        Department department = departmentRepository.findByName(departmentName)
            .orElseThrow(() -> new ResourceNotFoundException("Department not found with name: " + departmentName));
        
        Long oldDepartmentId = complaint.getDepartmentId();
        complaint.setDepartmentId(department.getId());
        complaint.setUpdatedTime(LocalDateTime.now());
        
        Complaint saved = complaintRepository.save(complaint);
        
        // AUDIT: Record department assignment (SYSTEM actor for AI assignment)
        auditService.recordDepartmentAssignment(
            complaintId,
            oldDepartmentId,
            department.getId(),
            AuditActorContext.system(),
            "AI-assigned department: " + departmentName
        );
        
        return saved;
    }

    // assign staff to complaint (by department head)
    public Complaint assignStaff(Long complaintId, Long staffId) {
        Complaint complaint = complaintRepository.findById(complaintId)
            .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + complaintId));
        
        if (!userRepository.existsById(staffId)) {
            throw new ResourceNotFoundException("Staff not found with id: " + staffId);
        }
        
        Long oldStaffId = complaint.getStaffId();
        ComplaintStatus oldStatus = complaint.getStatus();
        
        complaint.setStaffId(staffId);
        complaint.setStatus(ComplaintStatus.IN_PROGRESS);
        complaint.setStartTime(LocalDateTime.now());
        complaint.setUpdatedTime(LocalDateTime.now());
        
        Complaint saved = complaintRepository.save(complaint);
        
        // AUDIT: Record staff assignment
        // Note: Using SYSTEM actor here as this method doesn't have UserContext
        // In production, pass UserContext from controller for proper attribution
        auditService.recordStaffAssignment(
            complaintId,
            oldStaffId,
            staffId,
            AuditActorContext.system(),
            "Staff assigned to complaint"
        );
        
        // AUDIT: Record state change if status changed
        if (oldStatus != ComplaintStatus.IN_PROGRESS) {
            auditService.recordComplaintStateChange(
                complaintId,
                oldStatus != null ? oldStatus.name() : "null",
                ComplaintStatus.IN_PROGRESS.name(),
                AuditActorContext.system(),
                "Status changed due to staff assignment"
            );
        }
        
        // NOTIFY: Notify the assigned staff member
        String title = "Complaint #" + complaintId;
        notificationService.notifyAssignment(staffId, complaintId, title);
        
        // NOTIFY: Notify citizen that their complaint is being worked on
        if (complaint.getCitizenId() != null) {
            notificationService.notifyStatusChange(
                complaint.getCitizenId(),
                complaintId,
                title,
                oldStatus != null ? oldStatus.name() : "FILED",
                ComplaintStatus.IN_PROGRESS.name()
            );
        }
        
        return saved;
    }

    // ==================== AI METHODS (Priority & SLA) ====================

    /**
     * AI assigns category to complaint
     * This also sets department and SLA defaults from SLA config
     */
    public Complaint assignCategory(Long complaintId, String categoryName, String aiReasoning, Double aiConfidence) {
        Complaint complaint = complaintRepository.findById(complaintId)
            .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + complaintId));

        Category category = categoryRepository.findByName(categoryName)
            .orElseThrow(() -> new ResourceNotFoundException("Category not found with name: " + categoryName));

        // Get SLA config for this category (provides defaults)
        SLA slaConfig = slaRepository.findByCategory(category)
            .orElseThrow(() -> new ResourceNotFoundException("SLA config not found for category: " + categoryName));

        // Set category
        complaint.setCategoryId(category.getId());

        // Set department from SLA default
        complaint.setDepartmentId(slaConfig.getDepartment().getId());

        // Set priority from SLA default (AI can override later)
        complaint.setPriority(slaConfig.getBasePriority());

        // Set SLA deadline from SLA default (AI can override later)
        complaint.setSlaDaysAssigned(slaConfig.getSlaDays());
        complaint.setSlaDeadline(LocalDateTime.now().plusDays(slaConfig.getSlaDays()));

        // AI transparency
        complaint.setAiReasoning(aiReasoning);
        complaint.setAiConfidence(aiConfidence);

        complaint.setUpdatedTime(LocalDateTime.now());

        return complaintRepository.save(complaint);
    }

    /**
     * AI assigns/overrides priority for a complaint
     * Can be different from SLA base priority based on context
     */
    public Complaint assignPriority(Long complaintId, Priority priority, String aiReasoning) {
        Complaint complaint = complaintRepository.findById(complaintId)
            .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + complaintId));

        complaint.setPriority(priority);
        
        // Append to existing reasoning if present
        if (aiReasoning != null) {
            String existingReasoning = complaint.getAiReasoning();
            if (existingReasoning != null && !existingReasoning.isEmpty()) {
                complaint.setAiReasoning(existingReasoning + " | Priority: " + aiReasoning);
            } else {
                complaint.setAiReasoning("Priority: " + aiReasoning);
            }
        }
        
        complaint.setUpdatedTime(LocalDateTime.now());

        return complaintRepository.save(complaint);
    }

    /**
     * AI assigns/overrides SLA deadline for a complaint
     * Can shorten deadline for urgent cases
     */
    public Complaint assignSlaDeadline(Long complaintId, Integer slaDays, String aiReasoning) {
        Complaint complaint = complaintRepository.findById(complaintId)
            .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + complaintId));

        complaint.setSlaDaysAssigned(slaDays);
        complaint.setSlaDeadline(LocalDateTime.now().plusDays(slaDays));
        
        // Append to existing reasoning if present
        if (aiReasoning != null) {
            String existingReasoning = complaint.getAiReasoning();
            if (existingReasoning != null && !existingReasoning.isEmpty()) {
                complaint.setAiReasoning(existingReasoning + " | SLA: " + aiReasoning);
            } else {
                complaint.setAiReasoning("SLA: " + aiReasoning);
            }
        }
        
        complaint.setUpdatedTime(LocalDateTime.now());

        return complaintRepository.save(complaint);
    }

    /**
     * Combined AI processing - assigns category, priority, and SLA in one call
     * This is the main method AI agent will use
     */
    public Complaint processComplaintByAI(
            Long complaintId,
            String categoryName,
            Priority priority,
            Integer slaDays,
            String aiReasoning,
            Double aiConfidence) {
        
        Complaint complaint = complaintRepository.findById(complaintId)
            .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + complaintId));

        Category category = categoryRepository.findByName(categoryName)
            .orElseThrow(() -> new ResourceNotFoundException("Category not found with name: " + categoryName));

        // Get SLA config for department assignment
        SLA slaConfig = slaRepository.findByCategory(category)
            .orElseThrow(() -> new ResourceNotFoundException("SLA config not found for category: " + categoryName));

        // Set category and department (from SLA config)
        complaint.setCategoryId(category.getId());
        complaint.setDepartmentId(slaConfig.getDepartment().getId());

        // Set AI-determined priority (can differ from SLA base)
        complaint.setPriority(priority != null ? priority : slaConfig.getBasePriority());

        // Set AI-determined SLA days (can differ from SLA default)
        int actualSlaDays = slaDays != null ? slaDays : slaConfig.getSlaDays();
        complaint.setSlaDaysAssigned(actualSlaDays);
        complaint.setSlaDeadline(LocalDateTime.now().plusDays(actualSlaDays));

        // AI transparency
        complaint.setAiReasoning(aiReasoning);
        complaint.setAiConfidence(aiConfidence);

        complaint.setUpdatedTime(LocalDateTime.now());

        return complaintRepository.save(complaint);
    }

    // ==================== STATUS CHANGE METHODS ====================

    /**
     * Change complaint status (with validation)
     * Status flow: FILED → OPEN → IN_PROGRESS → RESOLVED → CLOSED
     *              (can also go to HOLD or CANCELLED from most states)
     */
    public Complaint changeStatus(Long complaintId, ComplaintStatus newStatus) {
        Complaint complaint = complaintRepository.findById(complaintId)
            .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + complaintId));

        ComplaintStatus currentStatus = complaint.getStatus();
        LocalDateTime now = LocalDateTime.now();

        // Update timestamps based on status change
        switch (newStatus) {
            case OPEN:
                complaint.setStartTime(now);
                break;
            case IN_PROGRESS:
                if (complaint.getStartTime() == null) {
                    complaint.setStartTime(now);
                }
                break;
            case RESOLVED:
                complaint.setResolvedTime(now);
                break;
            case CLOSED:
                complaint.setClosedTime(now);
                break;
            default:
                break;
        }

        complaint.setStatus(newStatus);
        complaint.setUpdatedTime(now);

        return complaintRepository.save(complaint);
    }

    /**
     * Mark complaint as IN_PROGRESS (by staff)
     */
    public Complaint startWork(Long complaintId) {
        return changeStatus(complaintId, ComplaintStatus.IN_PROGRESS);
    }

    /**
     * Mark complaint as RESOLVED (by staff)
     */
    public Complaint resolveComplaint(Long complaintId) {
        return changeStatus(complaintId, ComplaintStatus.RESOLVED);
    }

    /**
     * Mark complaint as CLOSED (after citizen feedback or auto-close)
     */
    public Complaint closeComplaint(Long complaintId) {
        return changeStatus(complaintId, ComplaintStatus.CLOSED);
    }

    /**
     * Put complaint on HOLD
     */
    public Complaint holdComplaint(Long complaintId) {
        return changeStatus(complaintId, ComplaintStatus.HOLD);
    }

    /**
     * Cancel complaint
     */
    public Complaint cancelComplaint(Long complaintId) {
        return changeStatus(complaintId, ComplaintStatus.CANCELLED);
    }

    /**
     * Citizen rates the resolved complaint (1-5)
     */
    public Complaint rateSatisfaction(Long complaintId, Integer rating) {
        if (rating < 1 || rating > 5) {
            throw new IllegalArgumentException("Rating must be between 1 and 5");
        }

        Complaint complaint = complaintRepository.findById(complaintId)
            .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + complaintId));

        complaint.setCitizenSatisfaction(rating);
        complaint.setUpdatedTime(LocalDateTime.now());

        return complaintRepository.save(complaint);
    }

    // ==================== MANUAL OVERRIDE METHODS ====================

    /**
     * Manual priority change (by dept head or admin)
     */
    public Complaint manualPriorityChange(Long complaintId, Priority priority) {
        Complaint complaint = complaintRepository.findById(complaintId)
            .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + complaintId));

        complaint.setPriority(priority);
        complaint.setUpdatedTime(LocalDateTime.now());

        return complaintRepository.save(complaint);
    }

    /**
     * Manual SLA deadline change (by dept head or admin)
     */
    public Complaint manualSlaChange(Long complaintId, Integer slaDays) {
        Complaint complaint = complaintRepository.findById(complaintId)
            .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + complaintId));

        complaint.setSlaDaysAssigned(slaDays);
        complaint.setSlaDeadline(LocalDateTime.now().plusDays(slaDays));
        complaint.setUpdatedTime(LocalDateTime.now());

        return complaintRepository.save(complaint);
    }

    // ============================================================
    // ⚠️  TEST-ONLY METHODS - NOT FOR PRODUCTION USE  ⚠️
    // ============================================================

    /**
     * ============================================================
     * ⚠️  TEST-ONLY: Override filed date for escalation testing  ⚠️
     * ============================================================
     * 
     * Backdates a complaint's createdTime to simulate overdue conditions.
     * 
     * WHY THIS EXISTS:
     * - @CreationTimestamp sets createdTime automatically on INSERT
     * - Hibernate ignores manual changes to @CreationTimestamp fields
     * - We use native query to bypass Hibernate's restrictions
     * - This allows testing escalation without waiting days
     * 
     * WHAT THIS METHOD DOES:
     * 1. Validates complaint exists
     * 2. Updates createdTime via native query (bypasses @CreationTimestamp)
     * 3. Optionally recalculates slaDeadline = newFiledDate + slaDaysAssigned
     * 4. Returns summary of changes for verification
     * 
     * WHAT THIS METHOD DOES NOT DO:
     * - Does NOT trigger escalation logic
     * - Does NOT modify complaint status
     * - Does NOT affect any other complaint fields
     * 
     * @param complaintId The complaint to modify
     * @param newFiledDate The new filed date (must be in past/present)
     * @param recalculateSlaDeadline Whether to recalculate SLA deadline
     * @return Map containing before/after values for verification
     */
    public java.util.Map<String, Object> updateFiledDateForTesting(
            Long complaintId, 
            LocalDateTime newFiledDate,
            Boolean recalculateSlaDeadline) {
        
        // Step 1: Load and validate complaint exists
        Complaint complaint = complaintRepository.findById(complaintId)
            .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + complaintId));

        // Capture before values for response
        LocalDateTime previousCreatedTime = complaint.getCreatedTime();
        LocalDateTime previousSlaDeadline = complaint.getSlaDeadline();

        // Step 2: Update createdTime
        // NOTE: We update directly on the entity. Since @CreationTimestamp only acts on INSERT,
        // setting the value manually before save() will persist it on UPDATE operations.
        complaint.setCreatedTime(newFiledDate);

        // Step 3: Optionally recalculate SLA deadline
        LocalDateTime newSlaDeadline = previousSlaDeadline;
        if (Boolean.TRUE.equals(recalculateSlaDeadline) && complaint.getSlaDaysAssigned() != null) {
            newSlaDeadline = newFiledDate.plusDays(complaint.getSlaDaysAssigned());
            complaint.setSlaDeadline(newSlaDeadline);
        }

        // Step 4: Save (updatedTime intentionally NOT changed - this is a test backdating)
        complaintRepository.save(complaint);

        // Step 5: Build response with before/after values
        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("complaintId", complaintId);
        result.put("message", "TEST-ONLY: Filed date updated successfully");
        
        java.util.Map<String, Object> changes = new java.util.LinkedHashMap<>();
        changes.put("createdTime", java.util.Map.of(
            "before", previousCreatedTime != null ? previousCreatedTime.toString() : null,
            "after", newFiledDate.toString()
        ));
        
        if (Boolean.TRUE.equals(recalculateSlaDeadline)) {
            changes.put("slaDeadline", java.util.Map.of(
                "before", previousSlaDeadline != null ? previousSlaDeadline.toString() : null,
                "after", newSlaDeadline.toString(),
                "slaDaysAssigned", complaint.getSlaDaysAssigned()
            ));
        }
        
        result.put("changes", changes);
        result.put("warning", "⚠️ This endpoint is for TESTING ONLY. Do not use in production.");
        
        return result;
    }

    // ==================== DASHBOARD LISTING METHODS ====================

    /**
     * Get all complaints for a citizen
     */
    @Transactional(readOnly = true)
    public List<Complaint> getComplaintsByCitizen(Long citizenId) {
        return complaintRepository.findByCitizenIdOrderByCreatedTimeDesc(citizenId);
    }

    /**
     * Get stats for citizen dashboard
     */
    @Transactional(readOnly = true)
    public java.util.Map<String, Object> getCitizenStats(Long citizenId) {
        java.util.Map<String, Object> stats = new java.util.LinkedHashMap<>();
        
        stats.put("total", complaintRepository.countByCitizenId(citizenId));
        stats.put("filed", complaintRepository.countByCitizenIdAndStatus(citizenId, ComplaintStatus.FILED));
        stats.put("inProgress", complaintRepository.countByCitizenIdAndStatus(citizenId, ComplaintStatus.IN_PROGRESS));
        stats.put("resolved", complaintRepository.countByCitizenIdAndStatus(citizenId, ComplaintStatus.RESOLVED));
        stats.put("closed", complaintRepository.countByCitizenIdAndStatus(citizenId, ComplaintStatus.CLOSED));
        stats.put("cancelled", complaintRepository.countByCitizenIdAndStatus(citizenId, ComplaintStatus.CANCELLED));
        
        // Pending = FILED + IN_PROGRESS
        long pending = (long) stats.get("filed") + (long) stats.get("inProgress");
        stats.put("pending", pending);
        
        return stats;
    }

    /**
     * Get all complaints assigned to a staff member
     */
    @Transactional(readOnly = true)
    public List<Complaint> getComplaintsByStaff(Long staffId) {
        return complaintRepository.findByStaffIdOrderByCreatedTimeDesc(staffId);
    }

    /**
     * Get stats for staff dashboard
     */
    @Transactional(readOnly = true)
    public java.util.Map<String, Object> getStaffStats(Long staffId) {
        java.util.Map<String, Object> stats = new java.util.LinkedHashMap<>();
        
        stats.put("total", complaintRepository.countByStaffId(staffId));
        stats.put("inProgress", complaintRepository.countByStaffIdAndStatus(staffId, ComplaintStatus.IN_PROGRESS));
        stats.put("resolved", complaintRepository.countByStaffIdAndStatus(staffId, ComplaintStatus.RESOLVED));
        stats.put("closed", complaintRepository.countByStaffIdAndStatus(staffId, ComplaintStatus.CLOSED));
        
        return stats;
    }

    /**
     * Get all complaints for a department
     */
    @Transactional(readOnly = true)
    public List<Complaint> getComplaintsByDepartment(Long deptId) {
        return complaintRepository.findByDepartmentIdOrderByCreatedTimeDesc(deptId);
    }

    /**
     * Get unassigned complaints for a department (excluding cancelled/closed)
     */
    @Transactional(readOnly = true)
    public List<Complaint> getUnassignedComplaintsByDepartment(Long deptId) {
        return complaintRepository.findUnassignedActiveByDepartment(deptId);
    }

    /**
     * Get stats for department dashboard
     */
    @Transactional(readOnly = true)
    public java.util.Map<String, Object> getDepartmentStats(Long deptId) {
        java.util.Map<String, Object> stats = new java.util.LinkedHashMap<>();
        
        stats.put("total", complaintRepository.countByDepartmentId(deptId));
        stats.put("filed", complaintRepository.countByDepartmentIdAndStatus(deptId, ComplaintStatus.FILED));
        stats.put("inProgress", complaintRepository.countByDepartmentIdAndStatus(deptId, ComplaintStatus.IN_PROGRESS));
        stats.put("resolved", complaintRepository.countByDepartmentIdAndStatus(deptId, ComplaintStatus.RESOLVED));
        stats.put("closed", complaintRepository.countByDepartmentIdAndStatus(deptId, ComplaintStatus.CLOSED));
        
        // Count unassigned (excluding cancelled/closed complaints)
        long unassigned = complaintRepository.countUnassignedActiveByDepartment(deptId);
        stats.put("unassigned", unassigned);
        
        return stats;
    }

    /**
     * Get all escalated complaints (for commissioner)
     */
    @Transactional(readOnly = true)
    public List<Complaint> getEscalatedComplaints() {
        return complaintRepository.findEscalatedComplaints();
    }

    /**
     * Get system-wide stats (for admin dashboard)
     */
    @Transactional(readOnly = true)
    public java.util.Map<String, Object> getSystemStats() {
        java.util.Map<String, Object> stats = new java.util.LinkedHashMap<>();
        
        stats.put("total", complaintRepository.count());
        stats.put("filed", complaintRepository.countByStatus(ComplaintStatus.FILED));
        stats.put("inProgress", complaintRepository.countByStatus(ComplaintStatus.IN_PROGRESS));
        stats.put("resolved", complaintRepository.countByStatus(ComplaintStatus.RESOLVED));
        stats.put("closed", complaintRepository.countByStatus(ComplaintStatus.CLOSED));
        stats.put("cancelled", complaintRepository.countByStatus(ComplaintStatus.CANCELLED));
        stats.put("escalated", complaintRepository.countByEscalationLevelGreaterThan(0));
        stats.put("pendingManualRouting", complaintRepository.countByNeedsManualRoutingTrue());
        
        return stats;
    }
    
    // ==================== ADMIN MANUAL ROUTING ====================
    
    /**
     * Get all complaints pending manual routing (low AI confidence).
     * Used by admin to review and assign departments manually.
     * 
     * @return List of complaints with needsManualRouting=true
     */
    @Transactional(readOnly = true)
    public List<ComplaintResponseDTO> getComplaintsPendingManualRouting() {
        List<Complaint> pendingComplaints = complaintRepository.findByNeedsManualRoutingTrueOrderByCreatedTimeDesc();
        
        return pendingComplaints.stream()
            .map(c -> {
                String categoryName = c.getCategoryId() != null 
                    ? categoryRepository.findById(c.getCategoryId()).map(Category::getName).orElse("UNKNOWN")
                    : "UNKNOWN";
                String departmentName = c.getDepartmentId() != null 
                    ? departmentRepository.findById(c.getDepartmentId()).map(Department::getName).orElse("UNKNOWN")
                    : "Pending Assignment";
                return buildResponseDTO(c, categoryName, departmentName);
            })
            .collect(java.util.stream.Collectors.toList());
    }
    
    /**
     * Admin manually routes a complaint to a department.
     * Clears the needsManualRouting flag and assigns to specified department.
     * 
     * @param complaintId The complaint to route
     * @param departmentId Target department ID
     * @param adminId The admin performing the routing
     * @param reason Optional reason for the routing decision
     * @return Updated complaint response
     */
    public ComplaintResponseDTO manualRouteComplaint(Long complaintId, Long departmentId, Long adminId, String reason) {
        Complaint complaint = complaintRepository.findById(complaintId)
            .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + complaintId));
        
        Department department = departmentRepository.findById(departmentId)
            .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + departmentId));
        
        Long previousDepartmentId = complaint.getDepartmentId();
        
        // Update department and clear manual routing flag
        complaint.setDepartmentId(departmentId);
        complaint.setNeedsManualRouting(false);
        complaint.setUpdatedTime(LocalDateTime.now());
        
        // Append routing info to AI reasoning
        String routingNote = String.format(
            " | MANUAL ROUTING by Admin (ID:%d): Assigned to %s. Reason: %s",
            adminId, department.getName(), reason != null ? reason : "Admin override"
        );
        complaint.setAiReasoning(
            (complaint.getAiReasoning() != null ? complaint.getAiReasoning() : "") + routingNote
        );
        
        Complaint saved = complaintRepository.save(complaint);
        
        // AUDIT: Record manual department assignment
        auditService.recordDepartmentAssignment(
            complaintId,
            previousDepartmentId,
            departmentId,
            AuditActorContext.forUser(adminId),
            "Manual routing by admin. Reason: " + (reason != null ? reason : "Admin override")
        );
        
        log.info("✅ Complaint #{} manually routed to {} by admin {}", 
                 complaintId, department.getName(), adminId);
        
        String categoryName = saved.getCategoryId() != null 
            ? categoryRepository.findById(saved.getCategoryId()).map(Category::getName).orElse("UNKNOWN")
            : "UNKNOWN";
        
        return buildResponseDTO(saved, categoryName, department.getName());
    }
    
    /**
     * Count complaints pending manual routing.
     * 
     * @return Number of complaints with low AI confidence awaiting admin routing
     */
    @Transactional(readOnly = true)
    public long countPendingManualRouting() {
        return complaintRepository.countByNeedsManualRoutingTrue();
    }
}
