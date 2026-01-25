package com.backend.springapp.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.backend.springapp.dto.response.ComplaintResponseDTO;
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

@Service
@Transactional
public class ComplaintService {
    
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
        saved.setDepartmentId(slaConfig.getDepartment().getId());
        saved.setPriority(Priority.valueOf(aiDecision.priority));
        saved.setSlaDaysAssigned(aiDecision.slaDays);
        saved.setSlaDeadline(LocalDateTime.now().plusDays(aiDecision.slaDays));
        saved.setAiReasoning(aiDecision.reasoning);
        saved.setAiConfidence(aiDecision.confidence);

        Complaint finalComplaint = complaintRepository.save(saved);

        // Build response with all details
        return buildResponseDTO(finalComplaint, category.getName(), slaConfig.getDepartment().getName());
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

        return ComplaintResponseDTO.builder()
            .complaintId(complaint.getComplaintId())
            .title(complaint.getTitle())
            .description(complaint.getDescription())
            .location(complaint.getLocation())
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
            .staffId(complaint.getStaffId())
            .staffName(staffName)
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
        
        complaint.setDepartmentId(department.getId());
        complaint.setUpdatedTime(LocalDateTime.now());
        
        return complaintRepository.save(complaint);
    }

    // assign staff to complaint (by department head)
    public Complaint assignStaff(Long complaintId, Long staffId) {
        Complaint complaint = complaintRepository.findById(complaintId)
            .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + complaintId));
        
        if (!userRepository.existsById(staffId)) {
            throw new ResourceNotFoundException("Staff not found with id: " + staffId);
        }
        
        complaint.setStaffId(staffId);
        complaint.setStatus(ComplaintStatus.IN_PROGRESS);
        complaint.setStartTime(LocalDateTime.now());
        complaint.setUpdatedTime(LocalDateTime.now());
        
        return complaintRepository.save(complaint);
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
}
