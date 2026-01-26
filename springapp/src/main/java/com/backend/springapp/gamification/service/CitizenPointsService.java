package com.backend.springapp.gamification.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.backend.springapp.enums.ComplaintStatus;
import com.backend.springapp.enums.Priority;
import com.backend.springapp.enums.UserType;
import com.backend.springapp.gamification.dto.CitizenLeaderboardDTO;
import com.backend.springapp.gamification.dto.PointsResponseDTO;
import com.backend.springapp.model.User;
import com.backend.springapp.repository.ComplaintRepository;
import com.backend.springapp.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service for managing citizen points and gamification.
 * 
 * POINT SYSTEM:
 * - File a complaint: +10 points
 * - Complaint resolved: +20 points
 * - Upvote received on complaint: +5 points
 * - Clean record bonus (no disputes): +50 points
 * 
 * BENEFITS:
 * - 50+ points: Visible on public leaderboard
 * - 100+ points: Complaints get PRIORITY BOOST (+1 level)
 * - 200+ points: GOLD tier recognition
 * - 500+ points: PLATINUM tier recognition
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CitizenPointsService {
    
    private final UserRepository userRepository;
    private final ComplaintRepository complaintRepository;
    
    // Point values
    public static final int POINTS_FILE_COMPLAINT = 10;
    public static final int POINTS_COMPLAINT_RESOLVED = 20;
    public static final int POINTS_UPVOTE_RECEIVED = 5;
    public static final int POINTS_CLEAN_RECORD_BONUS = 50;
    
    // Thresholds
    public static final int THRESHOLD_LEADERBOARD_VISIBLE = 0;  // Show all citizens (was 50)
    public static final int THRESHOLD_PRIORITY_BOOST = 100;
    
    /**
     * Award points to a citizen for filing a complaint.
     * Called when a new complaint is created.
     */
    @Transactional
    public void awardPointsForFilingComplaint(Long citizenId) {
        awardPoints(citizenId, POINTS_FILE_COMPLAINT, "Filing a complaint");
    }
    
    /**
     * Award points when a citizen's complaint is resolved.
     */
    @Transactional
    public void awardPointsForResolution(Long citizenId) {
        awardPoints(citizenId, POINTS_COMPLAINT_RESOLVED, "Complaint resolved");
    }
    
    /**
     * Award points when someone upvotes a citizen's complaint.
     */
    @Transactional
    public void awardPointsForUpvote(Long citizenId) {
        awardPoints(citizenId, POINTS_UPVOTE_RECEIVED, "Upvote received");
    }
    
    /**
     * Core method to add points to a citizen's account.
     */
    @Transactional
    public void awardPoints(Long citizenId, int points, String reason) {
        Optional<User> userOpt = userRepository.findById(citizenId);
        if (userOpt.isEmpty()) {
            log.warn("Cannot award points: User {} not found", citizenId);
            return;
        }
        
        User user = userOpt.get();
        if (user.getUserType() != UserType.CITIZEN) {
            log.debug("Points only awarded to citizens, user {} is {}", citizenId, user.getUserType());
            return;
        }
        
        int currentPoints = user.getCitizenPoints() != null ? user.getCitizenPoints() : 0;
        int newPoints = currentPoints + points;
        user.setCitizenPoints(newPoints);
        userRepository.save(user);
        
        log.info("Awarded {} points to citizen {} for: {}. Total: {}", 
                points, citizenId, reason, newPoints);
    }
    
    /**
     * Check if a citizen qualifies for priority boost.
     * Citizens with 100+ points get their complaints boosted by one priority level.
     * 
     * @return The boosted priority, or the original if not eligible
     */
    public Priority getBoostedPriority(Long citizenId, Priority originalPriority) {
        Optional<User> userOpt = userRepository.findById(citizenId);
        if (userOpt.isEmpty()) {
            return originalPriority;
        }
        
        User user = userOpt.get();
        int points = user.getCitizenPoints() != null ? user.getCitizenPoints() : 0;
        
        if (points >= THRESHOLD_PRIORITY_BOOST) {
            Priority boosted = boostPriority(originalPriority);
            log.info("Citizen {} has {} points - boosting priority from {} to {}", 
                    citizenId, points, originalPriority, boosted);
            return boosted;
        }
        
        return originalPriority;
    }
    
    /**
     * Boost priority by one level.
     * LOW -> MEDIUM -> HIGH -> CRITICAL (max)
     */
    private Priority boostPriority(Priority priority) {
        return switch (priority) {
            case LOW -> Priority.MEDIUM;
            case MEDIUM -> Priority.HIGH;
            case HIGH, CRITICAL -> Priority.CRITICAL;
        };
    }
    
    /**
     * Get points info for a specific citizen.
     */
    public PointsResponseDTO getPointsInfo(Long citizenId) {
        User user = userRepository.findById(citizenId)
                .orElseThrow(() -> new RuntimeException("User not found: " + citizenId));
        
        int points = user.getCitizenPoints() != null ? user.getCitizenPoints() : 0;
        int rank = calculateRank(citizenId);
        
        PointsResponseDTO response = PointsResponseDTO.fromPoints(user.getUserId(), user.getName(), points);
        response.setRank(rank);
        
        return response;
    }
    
    /**
     * Calculate citizen's rank among all citizens.
     */
    private int calculateRank(Long citizenId) {
        List<User> citizens = userRepository.findByUserType(UserType.CITIZEN);
        citizens.sort((a, b) -> {
            int pointsA = a.getCitizenPoints() != null ? a.getCitizenPoints() : 0;
            int pointsB = b.getCitizenPoints() != null ? b.getCitizenPoints() : 0;
            return Integer.compare(pointsB, pointsA); // Descending
        });
        
        for (int i = 0; i < citizens.size(); i++) {
            if (citizens.get(i).getUserId().equals(citizenId)) {
                return i + 1;
            }
        }
        return -1;
    }
    
    /**
     * Get the citizen leaderboard.
     * Only shows citizens with 50+ points (THRESHOLD_LEADERBOARD_VISIBLE).
     * 
     * @param limit Max number of entries to return
     */
    public List<CitizenLeaderboardDTO> getLeaderboard(int limit) {
        List<User> citizens = userRepository.findByUserType(UserType.CITIZEN);
        
        // Filter and sort by points descending
        List<User> ranked = citizens.stream()
                .filter(u -> {
                    int points = u.getCitizenPoints() != null ? u.getCitizenPoints() : 0;
                    return points >= THRESHOLD_LEADERBOARD_VISIBLE;
                })
                .sorted((a, b) -> {
                    int pointsA = a.getCitizenPoints() != null ? a.getCitizenPoints() : 0;
                    int pointsB = b.getCitizenPoints() != null ? b.getCitizenPoints() : 0;
                    return Integer.compare(pointsB, pointsA);
                })
                .limit(limit)
                .collect(Collectors.toList());
        
        List<CitizenLeaderboardDTO> leaderboard = new ArrayList<>();
        int rank = 1;
        
        for (User user : ranked) {
            int points = user.getCitizenPoints() != null ? user.getCitizenPoints() : 0;
            
            // Get stats
            long totalComplaints = complaintRepository.countByCitizenId(user.getUserId());
            long resolvedComplaints = complaintRepository.countByCitizenIdAndStatus(
                    user.getUserId(), ComplaintStatus.CLOSED);
            
            CitizenLeaderboardDTO entry = CitizenLeaderboardDTO.builder()
                    .userId(user.getUserId())
                    .name(user.getName())
                    .mobile(CitizenLeaderboardDTO.maskMobile(user.getMobile()))
                    .points(points)
                    .rank(rank++)
                    .totalComplaints(totalComplaints)
                    .resolvedComplaints(resolvedComplaints)
                    .tier(CitizenLeaderboardDTO.calculateTier(points))
                    .build();
            
            leaderboard.add(entry);
        }
        
        return leaderboard;
    }
}
