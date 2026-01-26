package com.backend.springapp.gamification.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for citizen leaderboard entries.
 * Shows responsible citizens with their points and stats.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CitizenLeaderboardDTO {
    
    private Long userId;
    private String name;
    private String mobile;  // Masked for privacy: "98****1234"
    
    private Integer points;
    private Integer rank;
    
    // Stats
    private Long totalComplaints;
    private Long resolvedComplaints;
    private Long upvotesReceived;
    
    // Badge tier based on points
    private String tier;  // BRONZE, SILVER, GOLD, PLATINUM
    
    /**
     * Calculate tier based on points.
     */
    public static String calculateTier(int points) {
        if (points >= 500) return "PLATINUM";
        if (points >= 200) return "GOLD";
        if (points >= 100) return "SILVER";
        return "BRONZE";
    }
    
    /**
     * Mask mobile number for privacy.
     * "9876543210" -> "98****3210"
     */
    public static String maskMobile(String mobile) {
        if (mobile == null || mobile.length() < 10) return "****";
        return mobile.substring(0, 2) + "****" + mobile.substring(mobile.length() - 4);
    }
}
