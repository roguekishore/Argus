package com.backend.springapp.gamification.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for staff leaderboard entries.
 * Ranks staff by composite score: resolved complaints + speed + satisfaction.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class StaffLeaderboardDTO {
    
    private Long userId;
    private String name;
    private String departmentName;
    
    private Integer rank;
    private Double compositeScore;  // 0-100 scale
    
    // Individual metrics
    private Long complaintsResolved;
    private Double avgResolutionHours;  // Lower is better
    private Double satisfactionRate;    // % of resolutions without disputes (0-100)
    
    // Weighted score breakdown (for transparency)
    private Double resolvedScore;      // 60% weight
    private Double speedScore;         // 25% weight  
    private Double satisfactionScore;  // 15% weight
    
    /**
     * Calculate composite score from individual metrics.
     * 
     * Formula:
     * - Resolved Score (60%): Normalized count of resolved complaints
     * - Speed Score (25%): Based on average resolution time (faster = higher)
     * - Satisfaction Score (15%): % of resolutions without disputes
     */
    public static Double calculateCompositeScore(
            double resolvedScore,
            double speedScore, 
            double satisfactionScore) {
        return (resolvedScore * 0.60) + (speedScore * 0.25) + (satisfactionScore * 0.15);
    }
}
