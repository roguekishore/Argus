package com.backend.springapp.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    /**
     * Create a new complaint (filed by citizen)
     * Initially: status = FILED, no department, no staff assigned
     * Department will be assigned later by AI
     * Staff will be assigned later by department head
     */
    public Complaint createComplaint(Complaint complaint, Long citizenId) {
        if (!userRepository.existsById(citizenId)) {
            throw new ResourceNotFoundException("Citizen not found with id: " + citizenId);
        }
        
        complaint.setCitizenId(citizenId);
        complaint.setStatus(ComplaintStatus.FILED);
        complaint.setDepartmentId(null);
        complaint.setStaffId(null);
        
        complaint.setStartTime(null);
        complaint.setUpdatedTime(null);
        complaint.setResolvedTime(null);
        complaint.setClosedTime(null);
        complaint.setCitizenSatisfaction(null);
        
        return complaintRepository.save(complaint);
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
        complaint.setStatus(ComplaintStatus.OPEN);
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
}
