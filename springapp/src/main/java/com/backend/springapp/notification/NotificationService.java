package com.backend.springapp.notification;

import java.time.LocalDateTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.backend.springapp.exception.ResourceNotFoundException;

/**
 * Service for managing user notifications.
 * 
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  CRITICAL DESIGN PRINCIPLE: NOTIFICATION ≠ AUDIT                             ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  This service MUST NOT:                                                      ║
 * ║  - Write audit logs (that's AuditService's job)                              ║
 * ║  - Throw exceptions that break business logic                                ║
 * ║  - Be called from within the audit package                                   ║
 * ║                                                                              ║
 * ║  This service MUST:                                                          ║
 * ║  - Be called AFTER audit logging completes                                   ║
 * ║  - Fail gracefully (log error, don't throw)                                  ║
 * ║  - Be idempotent-safe (duplicate calls don't duplicate notifications)        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * TRANSACTION STRATEGY:
 * - Uses REQUIRES_NEW for isolation from calling transaction
 * - If notification fails, business transaction still commits
 * - Notifications are BEST-EFFORT, not guaranteed delivery
 * 
 * CALL FLOW:
 * 1. Business logic executes (state change, escalation, etc.)
 * 2. Audit log is written (via AuditService)
 * 3. Notification is sent (via this service) - failure is logged, not thrown
 * 
 * FUTURE EXTENSIBILITY:
 * - Add async processing with @Async for high-volume scenarios
 * - Add email/SMS channels via strategy pattern
 * - Add notification preferences checking before sending
 */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // WRITE OPERATIONS: Create notifications
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Send a notification to a user.
     * 
     * This is the primary method for creating notifications.
     * Uses a separate transaction so notification failures don't
     * affect the calling business transaction.
     * 
     * IMPORTANT: This method catches all exceptions internally.
     * Callers should not wrap this in try-catch unless they need
     * to know if the notification succeeded.
     * 
     * @param userId      Target user ID
     * @param type        Notification type
     * @param title       Short title
     * @param message     Detailed message
     * @param complaintId Related complaint (nullable)
     * @param link        Navigation link (nullable)
     * @return Created notification, or null if failed
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Notification send(
            Long userId,
            NotificationType type,
            String title,
            String message,
            Long complaintId,
            String link) {
        
        try {
            // Validate required fields
            if (userId == null) {
                log.warn("Cannot send notification: userId is null");
                return null;
            }
            if (type == null || title == null || message == null) {
                log.warn("Cannot send notification: missing required fields");
                return null;
            }

            // Build notification
            Notification notification = Notification.builder()
                    .userId(userId)
                    .type(type)
                    .title(title)
                    .message(message)
                    .complaintId(complaintId)
                    .link(link)
                    .isRead(false)
                    .build();

            Notification saved = notificationRepository.save(notification);

            log.info("NOTIFICATION: user={}, type={}, complaint={}, title='{}'",
                    userId, type, complaintId, title);

            return saved;

        } catch (Exception e) {
            // CRITICAL: Log but don't throw - notifications are best-effort
            log.error("Failed to send notification to user {}: {}", userId, e.getMessage(), e);
            return null;
        }
    }

    /**
     * Send notification with idempotency check.
     * 
     * Prevents duplicate notifications for the same event within a time window.
     * Use this for events that might be triggered multiple times
     * (e.g., retries, race conditions).
     * 
     * @param userId           Target user ID
     * @param type             Notification type
     * @param title            Short title
     * @param message          Detailed message
     * @param complaintId      Related complaint
     * @param link             Navigation link
     * @param dedupeWindowMins Minutes to check for duplicates (0 = no check)
     * @return Created notification, existing notification, or null
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Notification sendWithDeduplication(
            Long userId,
            NotificationType type,
            String title,
            String message,
            Long complaintId,
            String link,
            int dedupeWindowMins) {
        
        try {
            // Check for recent duplicate
            if (dedupeWindowMins > 0 && complaintId != null) {
                LocalDateTime since = LocalDateTime.now().minusMinutes(dedupeWindowMins);
                boolean exists = notificationRepository.existsRecentNotification(
                        userId, complaintId, type, since);
                
                if (exists) {
                    log.debug("Skipping duplicate notification: user={}, type={}, complaint={}",
                            userId, type, complaintId);
                    return null;
                }
            }

            return send(userId, type, title, message, complaintId, link);

        } catch (Exception e) {
            log.error("Failed to send notification with deduplication: {}", e.getMessage(), e);
            return null;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // READ OPERATIONS: Fetch notifications
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get all notifications for a user.
     */
    @Transactional(readOnly = true)
    public List<Notification> getAllForUser(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    /**
     * Get unread notifications for a user.
     */
    @Transactional(readOnly = true)
    public List<Notification> getUnreadForUser(Long userId) {
        return notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
    }

    /**
     * Get unread notification count for badge display.
     */
    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    /**
     * Get notifications for a specific complaint.
     */
    @Transactional(readOnly = true)
    public List<Notification> getForComplaint(Long userId, Long complaintId) {
        return notificationRepository.findByUserIdAndComplaintIdOrderByCreatedAtDesc(userId, complaintId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // UPDATE OPERATIONS: Mark as read
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Mark a single notification as read.
     * 
     * @param notificationId The notification ID
     * @param userId         The user ID (for authorization)
     * @return Updated notification
     * @throws ResourceNotFoundException if notification not found
     * @throws SecurityException if notification doesn't belong to user
     */
    @Transactional
    public Notification markAsRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Notification not found with id: " + notificationId));

        // Security check: ensure notification belongs to user
        if (!notification.getUserId().equals(userId)) {
            throw new SecurityException("Notification does not belong to user");
        }

        if (!notification.getIsRead()) {
            notification.setIsRead(true);
            notification.setReadAt(LocalDateTime.now());
            return notificationRepository.save(notification);
        }

        return notification;
    }

    /**
     * Mark all notifications as read for a user.
     * 
     * @param userId The user ID
     * @return Number of notifications marked as read
     */
    @Transactional
    public int markAllAsRead(Long userId) {
        return notificationRepository.markAllAsReadForUser(userId);
    }

    /**
     * Mark all notifications for a complaint as read.
     * Called when user views a complaint detail page.
     * 
     * @param userId      The user ID
     * @param complaintId The complaint ID
     * @return Number of notifications marked as read
     */
    @Transactional
    public int markComplaintNotificationsAsRead(Long userId, Long complaintId) {
        return notificationRepository.markAllAsReadForComplaint(userId, complaintId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CONVENIENCE METHODS: Pre-built notification types
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Notify citizen about complaint status change.
     */
    public Notification notifyStatusChange(
            Long citizenId,
            Long complaintId,
            String complaintTitle,
            String oldStatus,
            String newStatus) {
        
        String title = "Complaint Status Updated";
        String message = String.format(
                "Your complaint '%s' status changed from %s to %s.",
                truncate(complaintTitle, 50), oldStatus, newStatus);
        String link = "/complaints/" + complaintId;

        return send(citizenId, NotificationType.COMPLAINT_STATUS_CHANGED, title, message, complaintId, link);
    }

    /**
     * Notify citizen about complaint resolution.
     */
    public Notification notifyResolution(
            Long citizenId,
            Long complaintId,
            String complaintTitle) {
        
        String title = "Complaint Resolved";
        String message = String.format(
                "Great news! Your complaint '%s' has been resolved. Please review and provide feedback.",
                truncate(complaintTitle, 50));
        String link = "/complaints/" + complaintId;

        return send(citizenId, NotificationType.COMPLAINT_RESOLVED, title, message, complaintId, link);
    }

    /**
     * Request citizen rating after resolution.
     */
    public Notification requestRating(
            Long citizenId,
            Long complaintId,
            String complaintTitle) {
        
        String title = "Please Rate Your Experience";
        String message = String.format(
                "How was your experience with the resolution of '%s'? Your feedback helps us improve.",
                truncate(complaintTitle, 50));
        String link = "/complaints/" + complaintId + "/rate";

        return sendWithDeduplication(
                citizenId, NotificationType.RATING_REQUEST, title, message, 
                complaintId, link, 60); // 60 min deduplication window
    }

    /**
     * Notify staff about new assignment.
     */
    public Notification notifyAssignment(
            Long staffId,
            Long complaintId,
            String complaintTitle) {
        
        String title = "New Complaint Assigned";
        String message = String.format(
                "You have been assigned to handle complaint: '%s'. Please review and take action.",
                truncate(complaintTitle, 50));
        String link = "/staff/complaints/" + complaintId;

        return send(staffId, NotificationType.COMPLAINT_ASSIGNED, title, message, complaintId, link);
    }

    /**
     * Notify department head or higher about escalation.
     */
    public Notification notifyEscalation(
            Long recipientId,
            Long complaintId,
            String complaintTitle,
            String escalationLevel,
            String reason) {
        
        String title = "Escalation Alert: " + escalationLevel;
        String message = String.format(
                "Complaint '%s' has been escalated to %s. Reason: %s",
                truncate(complaintTitle, 40), escalationLevel, reason);
        String link = "/escalations/" + complaintId;

        return sendWithDeduplication(
                recipientId, NotificationType.ESCALATION_ALERT, title, message,
                complaintId, link, 30); // 30 min deduplication window
    }

    /**
     * Notify about approaching SLA deadline.
     */
    public Notification notifySLAWarning(
            Long recipientId,
            Long complaintId,
            String complaintTitle,
            int hoursRemaining) {
        
        String title = "SLA Deadline Approaching";
        String message = String.format(
                "Complaint '%s' has only %d hours until SLA deadline. Please prioritize.",
                truncate(complaintTitle, 40), hoursRemaining);
        String link = "/complaints/" + complaintId;

        return sendWithDeduplication(
                recipientId, NotificationType.SLA_WARNING, title, message,
                complaintId, link, 120); // 2 hour deduplication window
    }
    
    /**
     * Send a generic notification with custom type and message.
     * 
     * Flexible method for notifications that don't fit the specific helpers.
     * Used for:
     * - Resolution progress updates
     * - Dispute notifications
     * - Custom system messages
     * 
     * @param recipientId    User to notify
     * @param complaintId    Related complaint (nullable)
     * @param typeName       Notification type as string (will be converted to enum)
     * @param title          Notification title
     * @param message        Notification message
     * @return Created notification, or null if failed
     */
    public Notification notifyGeneric(
            Long recipientId,
            Long complaintId,
            String typeName,
            String title,
            String message) {
        
        NotificationType type;
        try {
            type = NotificationType.valueOf(typeName.toUpperCase());
        } catch (IllegalArgumentException e) {
            log.warn("Unknown notification type: {}, using GENERIC", typeName);
            type = NotificationType.GENERIC;
        }
        
        String link = complaintId != null ? "/complaints/" + complaintId : null;
        
        return send(recipientId, type, title, message, complaintId, link);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    private String truncate(String text, int maxLength) {
        if (text == null) return "";
        if (text.length() <= maxLength) return text;
        return text.substring(0, maxLength - 3) + "...";
    }
}
