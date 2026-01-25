package com.backend.springapp.whatsapp.service;

import com.backend.springapp.enums.UserType;
import com.backend.springapp.model.Complaint;
import com.backend.springapp.model.User;
import com.backend.springapp.repository.ComplaintRepository;
import com.backend.springapp.repository.UserRepository;
import com.backend.springapp.service.ComplaintService;
import com.backend.springapp.whatsapp.model.ConversationSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

/**
 * Tools/Functions that the WhatsApp AI agent can call.
 * These are the "actions" the AI can take to interact with the system.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WhatsAppTools {
    
    private final UserRepository userRepository;
    private final ComplaintRepository complaintRepository;
    private final ComplaintService complaintService;
    
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("MMM dd, yyyy");
    private static final DateTimeFormatter DATETIME_FORMAT = DateTimeFormatter.ofPattern("MMM dd, HH:mm");
    
    // ============ User Tools ============
    
    /**
     * Check if a user is registered by phone number
     */
    public UserInfo getUserByPhone(String phoneNumber) {
        Optional<User> userOpt = userRepository.findByMobile(phoneNumber);
        
        if (userOpt.isEmpty()) {
            return new UserInfo(false, null, null, phoneNumber);
        }
        
        User user = userOpt.get();
        return new UserInfo(true, user.getUserId(), user.getName(), user.getMobile());
    }
    
    /**
     * Register a new citizen user
     */
    public UserInfo registerUser(String name, String phoneNumber) {
        // Check if already exists
        if (userRepository.findByMobile(phoneNumber).isPresent()) {
            return getUserByPhone(phoneNumber);
        }
        
        User user = new User();
        user.setName(name);
        user.setMobile(phoneNumber);
        user.setUserType(UserType.CITIZEN);
        user.setPassword("whatsapp_user_" + System.currentTimeMillis()); // Placeholder password
        
        User saved = userRepository.save(user);
        log.info("Registered new WhatsApp user: {} ({})", name, phoneNumber);
        
        return new UserInfo(true, saved.getUserId(), saved.getName(), saved.getMobile());
    }
    
    // ============ Complaint Tools ============
    
    /**
     * Create a new complaint from collected information
     */
    public ComplaintResult createComplaint(
            Long citizenId,
            String title,
            String description,
            String location,
            Double latitude,
            Double longitude
    ) {
        try {
            Complaint complaint = new Complaint();
            complaint.setTitle(title);
            complaint.setDescription(description);
            complaint.setLocation(location);
            
            // Set citizen
            User citizen = userRepository.findById(citizenId).orElse(null);
            if (citizen == null) {
                return new ComplaintResult(false, null, "User not found");
            }
            complaint.setCitizen(citizen);
            
            // Let the service handle AI classification and save
            var savedDTO = complaintService.createComplaint(complaint, citizenId);
            
            String displayId = "GRV-2026-" + String.format("%05d", savedDTO.getComplaintId());
            
            return new ComplaintResult(
                true, 
                savedDTO.getComplaintId(),
                displayId,
                savedDTO.getCategoryName() != null ? savedDTO.getCategoryName() : "OTHER",
                savedDTO.getPriority() != null ? savedDTO.getPriority().name() : "MEDIUM",
                savedDTO.getSlaDaysAssigned() != null ? savedDTO.getSlaDaysAssigned() : 3,
                savedDTO.getDepartmentName() != null ? savedDTO.getDepartmentName() : "General",
                savedDTO.getSlaDeadline() != null ? savedDTO.getSlaDeadline().toString() : "TBD"
            );
            
        } catch (Exception e) {
            log.error("Failed to create complaint: {}", e.getMessage());
            return new ComplaintResult(false, null, "Failed to create complaint: " + e.getMessage());
        }
    }
    
    /**
     * Get all complaints for a user
     */
    public List<ComplaintSummary> listUserComplaints(Long citizenId) {
        List<Complaint> complaints = complaintRepository.findByCitizenUserIdOrderByCreatedTimeDesc(citizenId);
        
        return complaints.stream()
            .limit(10) // Show last 10
            .map(c -> new ComplaintSummary(
                c.getComplaintId(),
                "GRV-2026-" + String.format("%05d", c.getComplaintId()),
                c.getTitle(),
                c.getStatus() != null ? c.getStatus().name() : "FILED",
                c.getCategory() != null ? c.getCategory().getName() : "OTHER",
                c.getCreatedTime() != null ? c.getCreatedTime().format(DATE_FORMAT) : "",
                c.getSlaDeadline() != null ? c.getSlaDeadline().format(DATE_FORMAT) : ""
            ))
            .toList();
    }
    
    /**
     * Get detailed status of a specific complaint
     */
    public ComplaintDetails getComplaintDetails(Long complaintId) {
        Optional<Complaint> complaintOpt = complaintRepository.findById(complaintId);
        
        if (complaintOpt.isEmpty()) {
            return null;
        }
        
        Complaint c = complaintOpt.get();
        
        String staffName = null;
        String staffPhone = null;
        if (c.getStaff() != null) {
            staffName = c.getStaff().getName();
            staffPhone = c.getStaff().getMobile();
        }
        
        return new ComplaintDetails(
            c.getComplaintId(),
            "GRV-2026-" + String.format("%05d", c.getComplaintId()),
            c.getTitle(),
            c.getDescription(),
            c.getLocation(),
            c.getStatus() != null ? c.getStatus().name() : "FILED",
            c.getPriority() != null ? c.getPriority().name() : "MEDIUM",
            c.getCategory() != null ? c.getCategory().getName() : "OTHER",
            c.getDepartment() != null ? c.getDepartment().getName() : "",
            staffName,
            staffPhone,
            c.getCreatedTime() != null ? c.getCreatedTime().format(DATETIME_FORMAT) : "",
            c.getSlaDeadline() != null ? c.getSlaDeadline().format(DATE_FORMAT) : "",
            c.getAiReasoning()
        );
    }
    
    /**
     * Submit rating for a resolved complaint
     */
    public boolean submitRating(Long complaintId, int rating, String feedback) {
        Optional<Complaint> complaintOpt = complaintRepository.findById(complaintId);
        
        if (complaintOpt.isEmpty()) {
            return false;
        }
        
        Complaint complaint = complaintOpt.get();
        complaint.setCitizenSatisfaction(rating);
        // TODO: Add feedback field to Complaint entity
        complaintRepository.save(complaint);
        
        log.info("Rating submitted for complaint {}: {} stars", complaintId, rating);
        return true;
    }
    
    // ============ Result Classes ============
    
    public record UserInfo(
        boolean isRegistered,
        Long userId,
        String name,
        String phoneNumber
    ) {}
    
    public record ComplaintResult(
        boolean success,
        Long complaintId,
        String error
    ) {
        public ComplaintResult(boolean success, Long complaintId, String displayId, 
                String category, String priority, int slaDays, String department, String deadline) {
            this(success, complaintId, null);
            // Store additional info - in practice, use a proper class
        }
    }
    
    public record ComplaintSummary(
        Long id,
        String displayId,
        String title,
        String status,
        String category,
        String filedDate,
        String dueDate
    ) {}
    
    public record ComplaintDetails(
        Long id,
        String displayId,
        String title,
        String description,
        String location,
        String status,
        String priority,
        String category,
        String department,
        String staffName,
        String staffPhone,
        String filedDate,
        String dueDate,
        String aiReasoning
    ) {}
}
