package com.backend.springapp.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.backend.springapp.dto.response.ComplaintResponseDTO;
import com.backend.springapp.exception.DuplicateResourceException;
import com.backend.springapp.exception.ResourceNotFoundException;
import com.backend.springapp.model.Category;
import com.backend.springapp.model.Complaint;
import com.backend.springapp.model.ComplaintUpvote;
import com.backend.springapp.model.Department;
import com.backend.springapp.model.User;
import com.backend.springapp.repository.CategoryRepository;
import com.backend.springapp.repository.ComplaintRepository;
import com.backend.springapp.repository.ComplaintUpvoteRepository;
import com.backend.springapp.repository.DepartmentRepository;
import com.backend.springapp.repository.UserRepository;

import lombok.extern.slf4j.Slf4j;

/**
 * Service for community engagement features:
 * - Upvoting complaints ("Me Too")
 * - Finding nearby community complaints
 * - Tracking community impact
 */
@Service
@Transactional
@Slf4j
public class CommunityService {
    
    @Autowired
    private ComplaintRepository complaintRepository;
    
    @Autowired
    private ComplaintUpvoteRepository upvoteRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private CategoryRepository categoryRepository;
    
    @Autowired
    private DepartmentRepository departmentRepository;
    
    @Autowired
    private S3StorageService s3StorageService;
    
    // ==================== UPVOTING ====================
    
    /**
     * Upvote a complaint ("Me Too" / "This affects me")
     * 
     * @param complaintId The complaint to upvote
     * @param citizenId The citizen upvoting
     * @param latitude Optional: citizen's location for heatmap
     * @param longitude Optional: citizen's location for heatmap
     * @return Updated complaint with new upvote count
     */
    public ComplaintResponseDTO upvoteComplaint(Long complaintId, Long citizenId, 
                                                 Double latitude, Double longitude) {
        // Validate complaint exists
        Complaint complaint = complaintRepository.findById(complaintId)
            .orElseThrow(() -> new ResourceNotFoundException("Complaint not found: " + complaintId));
        
        // Validate citizen exists
        if (!userRepository.existsById(citizenId)) {
            throw new ResourceNotFoundException("Citizen not found: " + citizenId);
        }
        
        // Check if citizen is the complaint owner (can't upvote your own)
        if (complaint.getCitizenId().equals(citizenId)) {
            throw new DuplicateResourceException("Cannot upvote your own complaint");
        }
        
        // Check if already upvoted
        if (upvoteRepository.existsByComplaintIdAndCitizenId(complaintId, citizenId)) {
            throw new DuplicateResourceException("Already upvoted this complaint");
        }
        
        // Create upvote
        ComplaintUpvote upvote = new ComplaintUpvote(complaintId, citizenId, latitude, longitude);
        upvoteRepository.save(upvote);
        
        // Increment count on complaint
        Integer currentCount = complaint.getUpvoteCount() != null ? complaint.getUpvoteCount() : 0;
        complaint.setUpvoteCount(currentCount + 1);
        complaintRepository.save(complaint);
        
        log.info("👍 Citizen {} upvoted complaint #{} (now {} upvotes)", 
                 citizenId, complaintId, complaint.getUpvoteCount());
        
        return buildResponseDTO(complaint, citizenId);
    }
    
    /**
     * Remove upvote from a complaint
     */
    public ComplaintResponseDTO removeUpvote(Long complaintId, Long citizenId) {
        Complaint complaint = complaintRepository.findById(complaintId)
            .orElseThrow(() -> new ResourceNotFoundException("Complaint not found: " + complaintId));
        
        if (!upvoteRepository.existsByComplaintIdAndCitizenId(complaintId, citizenId)) {
            throw new ResourceNotFoundException("Upvote not found");
        }
        
        upvoteRepository.deleteByComplaintIdAndCitizenId(complaintId, citizenId);
        
        // Decrement count
        Integer currentCount = complaint.getUpvoteCount() != null ? complaint.getUpvoteCount() : 0;
        complaint.setUpvoteCount(Math.max(0, currentCount - 1));
        complaintRepository.save(complaint);
        
        log.info("👎 Citizen {} removed upvote from complaint #{}", citizenId, complaintId);
        
        return buildResponseDTO(complaint, citizenId);
    }
    
    /**
     * Check if citizen has upvoted a complaint
     */
    @Transactional(readOnly = true)
    public boolean hasUpvoted(Long complaintId, Long citizenId) {
        return upvoteRepository.existsByComplaintIdAndCitizenId(complaintId, citizenId);
    }
    
    /**
     * Get all complaint IDs upvoted by a citizen
     */
    @Transactional(readOnly = true)
    public List<Long> getUpvotedComplaintIds(Long citizenId) {
        return upvoteRepository.findComplaintIdsByCitizenId(citizenId);
    }
    
    // ==================== NEARBY/COMMUNITY COMPLAINTS ====================
    
    /**
     * Get nearby active complaints for community view.
     * Shows complaints that citizens can upvote.
     * 
     * @param latitude Center latitude
     * @param longitude Center longitude
     * @param radiusMeters Search radius (default 2000m = 2km)
     * @param currentUserId Current user (to check their upvotes)
     * @return List of nearby complaints with upvote info
     */
    @Transactional(readOnly = true)
    public List<ComplaintResponseDTO> getNearbyComplaints(
            Double latitude, Double longitude, 
            Double radiusMeters, Long currentUserId) {
        
        double radius = radiusMeters != null ? radiusMeters : 2000.0;
        
        List<Complaint> nearby = complaintRepository.findNearbyComplaints(latitude, longitude, radius);
        
        // Get upvoted IDs for current user
        List<Long> upvotedIds = currentUserId != null 
            ? upvoteRepository.findComplaintIdsByCitizenId(currentUserId)
            : List.of();
        
        return nearby.stream()
            .map(c -> buildResponseDTOWithUpvoteStatus(c, upvotedIds))
            .collect(Collectors.toList());
    }
    
    /**
     * Get trending complaints (most upvoted active complaints)
     */
    @Transactional(readOnly = true)
    public List<ComplaintResponseDTO> getTrendingComplaints(Long currentUserId, int limit) {
        List<Complaint> all = complaintRepository.findAllByOrderByCreatedTimeDesc();
        
        // Get upvoted IDs for current user
        List<Long> upvotedIds = currentUserId != null 
            ? upvoteRepository.findComplaintIdsByCitizenId(currentUserId)
            : List.of();
        
        return all.stream()
            .filter(c -> c.getUpvoteCount() != null && c.getUpvoteCount() > 0)
            .sorted((a, b) -> b.getUpvoteCount().compareTo(a.getUpvoteCount()))
            .limit(limit)
            .map(c -> buildResponseDTOWithUpvoteStatus(c, upvotedIds))
            .collect(Collectors.toList());
    }
    
    // ==================== HELPERS ====================
    
    private ComplaintResponseDTO buildResponseDTO(Complaint complaint, Long currentUserId) {
        List<Long> upvotedIds = currentUserId != null 
            ? upvoteRepository.findComplaintIdsByCitizenId(currentUserId)
            : List.of();
        return buildResponseDTOWithUpvoteStatus(complaint, upvotedIds);
    }
    
    private ComplaintResponseDTO buildResponseDTOWithUpvoteStatus(Complaint complaint, List<Long> upvotedIds) {
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
                .orElse("Pending Assignment");
        }
        
        String staffName = null;
        if (complaint.getStaffId() != null) {
            staffName = userRepository.findById(complaint.getStaffId())
                .map(User::getName)
                .orElse(null);
        }
        
        String imageUrl = null;
        if (complaint.getImageS3Key() != null && !complaint.getImageS3Key().isBlank()) {
            imageUrl = s3StorageService.getPresignedUrl(complaint.getImageS3Key());
        }
        
        boolean hasUpvoted = upvotedIds.contains(complaint.getComplaintId());
        
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
            .hasUserUpvoted(hasUpvoted)
            .build();
    }
}
