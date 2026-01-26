package com.backend.springapp.gamification.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.backend.springapp.gamification.dto.CitizenLeaderboardDTO;
import com.backend.springapp.gamification.dto.PointsResponseDTO;
import com.backend.springapp.gamification.dto.StaffLeaderboardDTO;
import com.backend.springapp.gamification.service.CitizenPointsService;
import com.backend.springapp.gamification.service.StaffLeaderboardService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * REST controller for gamification features.
 * 
 * Endpoints:
 * - GET /api/gamification/citizens/leaderboard - Public citizen leaderboard
 * - GET /api/gamification/citizens/{id}/points - Get citizen's points info
 * - GET /api/gamification/staff/leaderboard - Staff performance leaderboard
 * - GET /api/gamification/staff/{id}/stats - Get staff member's stats
 * - GET /api/gamification/thresholds - Get point thresholds and benefits
 */
@RestController
@RequestMapping("/api/gamification")
@RequiredArgsConstructor
@Slf4j
public class GamificationController {
    
    private final CitizenPointsService citizenPointsService;
    private final StaffLeaderboardService staffLeaderboardService;
    
    // ==================== CITIZEN ENDPOINTS ====================
    
    /**
     * Get public citizen leaderboard.
     * Only shows citizens with 50+ points.
     * 
     * @param limit Maximum entries (default 20, max 100)
     */
    @GetMapping("/citizens/leaderboard")
    public ResponseEntity<List<CitizenLeaderboardDTO>> getCitizenLeaderboard(
            @RequestParam(defaultValue = "20") int limit) {
        
        limit = Math.min(limit, 100); // Cap at 100
        List<CitizenLeaderboardDTO> leaderboard = citizenPointsService.getLeaderboard(limit);
        
        log.info("Fetched citizen leaderboard with {} entries", leaderboard.size());
        return ResponseEntity.ok(leaderboard);
    }
    
    /**
     * Get a specific citizen's points and tier info.
     * 
     * @param citizenId The citizen's user ID
     */
    @GetMapping("/citizens/{citizenId}/points")
    public ResponseEntity<PointsResponseDTO> getCitizenPoints(@PathVariable Long citizenId) {
        PointsResponseDTO points = citizenPointsService.getPointsInfo(citizenId);
        return ResponseEntity.ok(points);
    }
    
    // ==================== STAFF ENDPOINTS ====================
    
    /**
     * Get staff performance leaderboard.
     * 
     * @param limit Maximum entries (default 20, max 100)
     * @param departmentId Optional filter by department
     */
    @GetMapping("/staff/leaderboard")
    public ResponseEntity<List<StaffLeaderboardDTO>> getStaffLeaderboard(
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) Long departmentId) {
        
        limit = Math.min(limit, 100); // Cap at 100
        List<StaffLeaderboardDTO> leaderboard = staffLeaderboardService.getLeaderboard(limit, departmentId);
        
        log.info("Fetched staff leaderboard with {} entries (dept: {})", 
                leaderboard.size(), departmentId);
        return ResponseEntity.ok(leaderboard);
    }
    
    /**
     * Get a specific staff member's performance stats.
     * 
     * @param staffId The staff member's user ID
     */
    @GetMapping("/staff/{staffId}/stats")
    public ResponseEntity<StaffLeaderboardDTO> getStaffStats(@PathVariable Long staffId) {
        StaffLeaderboardDTO stats = staffLeaderboardService.getStaffStats(staffId);
        return ResponseEntity.ok(stats);
    }
    
    // ==================== INFO ENDPOINTS ====================
    
    /**
     * Get gamification thresholds and point values.
     * Useful for frontend to display rules and progress.
     */
    @GetMapping("/thresholds")
    public ResponseEntity<Map<String, Object>> getThresholds() {
        Map<String, Object> thresholds = new HashMap<>();
        
        // Point values
        Map<String, Integer> pointValues = new HashMap<>();
        pointValues.put("fileComplaint", CitizenPointsService.POINTS_FILE_COMPLAINT);
        pointValues.put("complaintResolved", CitizenPointsService.POINTS_COMPLAINT_RESOLVED);
        pointValues.put("upvoteReceived", CitizenPointsService.POINTS_UPVOTE_RECEIVED);
        pointValues.put("cleanRecordBonus", CitizenPointsService.POINTS_CLEAN_RECORD_BONUS);
        thresholds.put("pointValues", pointValues);
        
        // Tier thresholds
        Map<String, Integer> tiers = new HashMap<>();
        tiers.put("BRONZE", 0);
        tiers.put("SILVER", 100);
        tiers.put("GOLD", 200);
        tiers.put("PLATINUM", 500);
        thresholds.put("tiers", tiers);
        
        // Benefit thresholds
        Map<String, Object> benefits = new HashMap<>();
        benefits.put("leaderboardVisible", CitizenPointsService.THRESHOLD_LEADERBOARD_VISIBLE);
        benefits.put("priorityBoost", CitizenPointsService.THRESHOLD_PRIORITY_BOOST);
        thresholds.put("benefits", benefits);
        
        return ResponseEntity.ok(thresholds);
    }
}
