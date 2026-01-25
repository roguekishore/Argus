package com.backend.springapp.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.backend.springapp.dto.response.ComplaintResponseDTO;
import com.backend.springapp.service.CommunityService;

/**
 * Controller for community engagement features:
 * - Upvoting complaints ("Me Too")
 * - Viewing nearby community complaints
 * - Trending complaints
 */
@RestController
@RequestMapping("/api/community")
public class CommunityController {

    @Autowired
    private CommunityService communityService;

    // ==================== UPVOTING ====================
    
    /**
     * Upvote a complaint ("Me Too" / "This affects me")
     * POST /api/community/complaints/{complaintId}/upvote
     */
    @PostMapping("/complaints/{complaintId}/upvote")
    public ResponseEntity<ComplaintResponseDTO> upvoteComplaint(
            @PathVariable Long complaintId,
            @RequestParam("citizenId") Long citizenId,
            @RequestParam(value = "latitude", required = false) Double latitude,
            @RequestParam(value = "longitude", required = false) Double longitude) {
        
        ComplaintResponseDTO result = communityService.upvoteComplaint(
            complaintId, citizenId, latitude, longitude
        );
        return ResponseEntity.ok(result);
    }
    
    /**
     * Remove upvote from a complaint
     * DELETE /api/community/complaints/{complaintId}/upvote
     */
    @DeleteMapping("/complaints/{complaintId}/upvote")
    public ResponseEntity<ComplaintResponseDTO> removeUpvote(
            @PathVariable Long complaintId,
            @RequestParam("citizenId") Long citizenId) {
        
        ComplaintResponseDTO result = communityService.removeUpvote(complaintId, citizenId);
        return ResponseEntity.ok(result);
    }
    
    /**
     * Check if user has upvoted a complaint
     * GET /api/community/complaints/{complaintId}/upvote/status
     */
    @GetMapping("/complaints/{complaintId}/upvote/status")
    public ResponseEntity<Map<String, Boolean>> checkUpvoteStatus(
            @PathVariable Long complaintId,
            @RequestParam("citizenId") Long citizenId) {
        
        boolean hasUpvoted = communityService.hasUpvoted(complaintId, citizenId);
        return ResponseEntity.ok(Map.of("hasUpvoted", hasUpvoted));
    }
    
    /**
     * Get all complaint IDs upvoted by a citizen
     * GET /api/community/citizens/{citizenId}/upvotes
     */
    @GetMapping("/citizens/{citizenId}/upvotes")
    public ResponseEntity<List<Long>> getUpvotedComplaintIds(@PathVariable Long citizenId) {
        List<Long> ids = communityService.getUpvotedComplaintIds(citizenId);
        return ResponseEntity.ok(ids);
    }
    
    // ==================== NEARBY/COMMUNITY COMPLAINTS ====================
    
    /**
     * Get nearby complaints for community view
     * GET /api/community/complaints/nearby
     */
    @GetMapping("/complaints/nearby")
    public ResponseEntity<List<ComplaintResponseDTO>> getNearbyComplaints(
            @RequestParam("latitude") Double latitude,
            @RequestParam("longitude") Double longitude,
            @RequestParam(value = "radiusMeters", required = false) Double radiusMeters,
            @RequestParam(value = "userId", required = false) Long userId) {
        
        List<ComplaintResponseDTO> complaints = communityService.getNearbyComplaints(
            latitude, longitude, radiusMeters, userId
        );
        return ResponseEntity.ok(complaints);
    }
    
    /**
     * Get trending complaints (most upvoted)
     * GET /api/community/complaints/trending
     */
    @GetMapping("/complaints/trending")
    public ResponseEntity<List<ComplaintResponseDTO>> getTrendingComplaints(
            @RequestParam(value = "userId", required = false) Long userId,
            @RequestParam(value = "limit", required = false, defaultValue = "10") int limit) {
        
        List<ComplaintResponseDTO> complaints = communityService.getTrendingComplaints(userId, limit);
        return ResponseEntity.ok(complaints);
    }
}
