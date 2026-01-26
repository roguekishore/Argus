package com.backend.springapp.gamification.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for citizen points information.
 * Returned when checking a user's points or after points are awarded.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PointsResponseDTO {
    
    private Long userId;
    private String name;
    
    private Integer currentPoints;
    private String tier;           // BRONZE, SILVER, GOLD, PLATINUM
    private Integer rank;          // Current rank among all citizens
    
    // Benefits at current tier
    private Boolean priorityBoost;       // True if points >= 100 (priority +1 on new complaints)
    private Boolean visibleOnLeaderboard; // True if points >= 50
    
    // Progress to next tier
    private String nextTier;
    private Integer pointsToNextTier;
    
    // Recent activity
    private Integer pointsEarnedToday;
    private String lastPointReason;
    
    /**
     * Create response with tier calculation.
     */
    public static PointsResponseDTO fromPoints(Long userId, String name, int points) {
        String tier = CitizenLeaderboardDTO.calculateTier(points);
        String nextTier = getNextTier(tier);
        int pointsToNext = getPointsToNextTier(tier, points);
        
        return PointsResponseDTO.builder()
                .userId(userId)
                .name(name)
                .currentPoints(points)
                .tier(tier)
                .priorityBoost(points >= 100)
                .visibleOnLeaderboard(points >= 50)
                .nextTier(nextTier)
                .pointsToNextTier(pointsToNext)
                .build();
    }
    
    private static String getNextTier(String currentTier) {
        return switch (currentTier) {
            case "BRONZE" -> "SILVER";
            case "SILVER" -> "GOLD";
            case "GOLD" -> "PLATINUM";
            default -> null; // Already PLATINUM
        };
    }
    
    private static int getPointsToNextTier(String tier, int currentPoints) {
        return switch (tier) {
            case "BRONZE" -> 100 - currentPoints;
            case "SILVER" -> 200 - currentPoints;
            case "GOLD" -> 500 - currentPoints;
            default -> 0; // Already PLATINUM
        };
    }
}
