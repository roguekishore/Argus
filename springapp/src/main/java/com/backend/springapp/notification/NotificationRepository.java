package com.backend.springapp.notification;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Repository for notification data access.
 * 
 * QUERY DESIGN:
 * - Primary access pattern is by userId (user's notification feed)
 * - Unread notifications are the most frequently accessed
 * - Complaint-based queries support complaint detail views
 * 
 * Unlike AuditLogRepository (read-only), this repository supports
 * updates for marking notifications as read.
 */
@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // ═══════════════════════════════════════════════════════════════════════════
    // USER-CENTRIC QUERIES: "Show me my notifications"
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Find all notifications for a user, most recent first.
     * Used for the main notification feed.
     */
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * Find unread notifications for a user, most recent first.
     * Used for notification badge/dropdown.
     */
    List<Notification> findByUserIdAndIsReadFalseOrderByCreatedAtDesc(Long userId);

    /**
     * Count unread notifications for a user.
     * Used for badge count display.
     */
    long countByUserIdAndIsReadFalse(Long userId);

    /**
     * Find notifications by type for a user.
     * Used for filtered views.
     */
    List<Notification> findByUserIdAndTypeOrderByCreatedAtDesc(Long userId, NotificationType type);

    // ═══════════════════════════════════════════════════════════════════════════
    // COMPLAINT-CENTRIC QUERIES: "Show notifications for this complaint"
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Find all notifications related to a complaint.
     * Useful for complaint detail pages.
     */
    List<Notification> findByComplaintIdOrderByCreatedAtDesc(Long complaintId);

    /**
     * Find notifications for a specific user and complaint.
     * Useful for showing a user's notification history for a complaint.
     */
    List<Notification> findByUserIdAndComplaintIdOrderByCreatedAtDesc(Long userId, Long complaintId);

    // ═══════════════════════════════════════════════════════════════════════════
    // BULK OPERATIONS: Mark all as read
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Mark all unread notifications as read for a user.
     * Used for "Mark all as read" functionality.
     */
    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = CURRENT_TIMESTAMP WHERE n.userId = :userId AND n.isRead = false")
    int markAllAsReadForUser(@Param("userId") Long userId);

    /**
     * Mark all unread notifications as read for a specific complaint.
     * Used when user views a complaint detail page.
     */
    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = CURRENT_TIMESTAMP WHERE n.userId = :userId AND n.complaintId = :complaintId AND n.isRead = false")
    int markAllAsReadForComplaint(@Param("userId") Long userId, @Param("complaintId") Long complaintId);

    // ═══════════════════════════════════════════════════════════════════════════
    // IDEMPOTENCY CHECK: Prevent duplicate notifications
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Check if a similar notification already exists.
     * Used for idempotency in notification creation.
     * 
     * Prevents duplicate notifications for the same event
     * (e.g., multiple escalation notifications for the same level).
     */
    boolean existsByUserIdAndComplaintIdAndType(Long userId, Long complaintId, NotificationType type);

    /**
     * Check for recent duplicate within a time window.
     * More sophisticated idempotency for edge cases.
     */
    @Query("SELECT COUNT(n) > 0 FROM Notification n WHERE n.userId = :userId AND n.complaintId = :complaintId AND n.type = :type AND n.createdAt > :since")
    boolean existsRecentNotification(
            @Param("userId") Long userId, 
            @Param("complaintId") Long complaintId, 
            @Param("type") NotificationType type,
            @Param("since") java.time.LocalDateTime since);
}
