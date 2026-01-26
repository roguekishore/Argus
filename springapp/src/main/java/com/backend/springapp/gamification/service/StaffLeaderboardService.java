package com.backend.springapp.gamification.service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.backend.springapp.enums.ComplaintStatus;
import com.backend.springapp.enums.UserType;
import com.backend.springapp.gamification.dto.StaffLeaderboardDTO;
import com.backend.springapp.model.Complaint;
import com.backend.springapp.model.User;
import com.backend.springapp.repository.ComplaintRepository;
import com.backend.springapp.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service for staff performance leaderboard.
 * 
 * SIMPLE POINT SYSTEM:
 * - +10 points if complaint closed BEFORE SLA deadline
 * - +2 points per star rating (1-5 stars = 2-10 points)
 * - Max 20 points per complaint (10 deadline + 10 rating)
 * 
 * Staff are ranked by total points across all departments.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StaffLeaderboardService {
    
    private final UserRepository userRepository;
    private final ComplaintRepository complaintRepository;
    
    // Point values
    private static final int POINTS_BEFORE_DEADLINE = 10;
    private static final int POINTS_PER_STAR = 2;  // 5 stars = 10 points
    
    /**
     * Get the staff leaderboard across all departments.
     * 
     * @param limit Maximum entries to return
     * @param departmentId Optional filter by department (null = all departments)
     */
    public List<StaffLeaderboardDTO> getLeaderboard(int limit, Long departmentId) {
        // Get all staff members
        List<User> staffList;
        if (departmentId != null) {
            staffList = userRepository.findByDeptIdAndUserType(departmentId, UserType.STAFF);
        } else {
            staffList = userRepository.findByUserType(UserType.STAFF);
        }
        
        // Calculate points for each staff member
        List<StaffLeaderboardDTO> leaderboard = new ArrayList<>();
        
        for (User staff : staffList) {
            Long staffId = staff.getUserId();
            
            // Get all closed complaints for this staff
            List<Complaint> closedComplaints = complaintRepository
                    .findByStaffIdAndStatusOrderByCreatedTimeDesc(staffId, ComplaintStatus.CLOSED);
            
            // Skip staff with no closed complaints
            if (closedComplaints.isEmpty()) {
                continue;
            }
            
            // Calculate points
            int totalPoints = 0;
            int deadlineBonus = 0;
            int ratingPoints = 0;
            int complaintsBeforeDeadline = 0;
            int totalRating = 0;
            int ratedComplaints = 0;
            
            for (Complaint c : closedComplaints) {
                // Check if completed before deadline
                if (c.getClosedTime() != null && c.getSlaDeadline() != null) {
                    if (c.getClosedTime().isBefore(c.getSlaDeadline())) {
                        deadlineBonus += POINTS_BEFORE_DEADLINE;
                        complaintsBeforeDeadline++;
                    }
                }
                
                // Check rating (1-5 stars)
                if (c.getCitizenSatisfaction() != null && c.getCitizenSatisfaction() > 0) {
                    int rating = c.getCitizenSatisfaction();
                    ratingPoints += rating * POINTS_PER_STAR;
                    totalRating += rating;
                    ratedComplaints++;
                }
            }
            
            totalPoints = deadlineBonus + ratingPoints;
            
            // Calculate average rating for display
            double avgRating = ratedComplaints > 0 ? (double) totalRating / ratedComplaints : 0;
            
            String deptName = staff.getDepartment() != null 
                    ? staff.getDepartment().getName() 
                    : "Unassigned";
            
            StaffLeaderboardDTO entry = StaffLeaderboardDTO.builder()
                    .userId(staffId)
                    .name(staff.getName())
                    .departmentName(deptName)
                    .complaintsResolved((long) closedComplaints.size())
                    .avgResolutionHours(avgRating)  // Repurpose: now shows avg rating (1-5)
                    .satisfactionRate(avgRating * 20)  // Convert 5-star to 100% scale for display
                    .resolvedScore((double) complaintsBeforeDeadline)  // Count before deadline
                    .speedScore((double) deadlineBonus)  // Deadline bonus points
                    .satisfactionScore((double) ratingPoints)  // Rating points
                    .compositeScore((double) totalPoints)  // Total points
                    .build();
            
            leaderboard.add(entry);
        }
        
        // Sort by total points descending
        leaderboard.sort((a, b) -> Double.compare(b.getCompositeScore(), a.getCompositeScore()));
        
        // Assign ranks
        for (int i = 0; i < leaderboard.size(); i++) {
            leaderboard.get(i).setRank(i + 1);
        }
        
        // Limit results
        return leaderboard.stream().limit(limit).collect(Collectors.toList());
    }
    
    /**
     * Get stats for a specific staff member.
     */
    public StaffLeaderboardDTO getStaffStats(Long staffId) {
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new RuntimeException("Staff not found: " + staffId));
        
        List<StaffLeaderboardDTO> leaderboard = getLeaderboard(1000, null);
        
        return leaderboard.stream()
                .filter(e -> e.getUserId().equals(staffId))
                .findFirst()
                .orElseGet(() -> {
                    // Staff with no closed complaints
                    String deptName = staff.getDepartment() != null 
                            ? staff.getDepartment().getName() 
                            : "Unassigned";
                    return StaffLeaderboardDTO.builder()
                            .userId(staffId)
                            .name(staff.getName())
                            .departmentName(deptName)
                            .complaintsResolved(0L)
                            .compositeScore(0.0)
                            .rank(leaderboard.size() + 1)
                            .build();
                });
    }
}
