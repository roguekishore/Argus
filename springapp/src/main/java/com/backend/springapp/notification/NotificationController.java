package com.backend.springapp.notification;

import java.util.List;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST API for user notifications.
 * 
 * SECURITY NOTE:
 * All endpoints require authentication (when JWT is implemented).
 * Users can only access their own notifications.
 * Currently uses X-User-Id header for user identification (temporary).
 * 
 * API DESIGN:
 * - GET endpoints for fetching notifications
 * - PUT endpoint for marking as read (not POST - idempotent operation)
 * - No DELETE - notifications are managed by system lifecycle
 * - No POST - notifications are created by system events, not user actions
 */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private static final Logger log = LoggerFactory.getLogger(NotificationController.class);

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // READ ENDPOINTS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get all notifications for the current user.
     * 
     * GET /api/notifications
     * 
     * Optional query params:
     * - unreadOnly=true: Return only unread notifications
     * 
     * @param userId     User ID from header (temporary until JWT)
     * @param unreadOnly If true, return only unread notifications
     * @return List of notifications, most recent first
     */
    @GetMapping
    public ResponseEntity<List<NotificationDTO>> getNotifications(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(required = false, defaultValue = "false") boolean unreadOnly) {
        
        log.debug("Fetching notifications for user {}, unreadOnly={}", userId, unreadOnly);

        List<Notification> notifications;
        if (unreadOnly) {
            notifications = notificationService.getUnreadForUser(userId);
        } else {
            notifications = notificationService.getAllForUser(userId);
        }

        List<NotificationDTO> dtos = notifications.stream()
                .map(NotificationDTO::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    /**
     * Get unread notification count for badge display.
     * 
     * GET /api/notifications/count
     * 
     * @param userId User ID from header
     * @return Count of unread notifications
     */
    @GetMapping("/count")
    public ResponseEntity<UnreadCountResponse> getUnreadCount(
            @RequestHeader("X-User-Id") Long userId) {
        
        long count = notificationService.getUnreadCount(userId);
        return ResponseEntity.ok(new UnreadCountResponse(count));
    }

    /**
     * Get notifications for a specific complaint.
     * 
     * GET /api/notifications/complaint/{complaintId}
     * 
     * @param userId      User ID from header
     * @param complaintId The complaint ID
     * @return List of notifications for this complaint
     */
    @GetMapping("/complaint/{complaintId}")
    public ResponseEntity<List<NotificationDTO>> getNotificationsForComplaint(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long complaintId) {
        
        log.debug("Fetching notifications for user {} and complaint {}", userId, complaintId);

        List<Notification> notifications = notificationService.getForComplaint(userId, complaintId);

        List<NotificationDTO> dtos = notifications.stream()
                .map(NotificationDTO::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // WRITE ENDPOINTS: Mark as read
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Mark a single notification as read.
     * 
     * PUT /api/notifications/{id}/read
     * 
     * @param userId         User ID from header
     * @param notificationId The notification ID
     * @return Updated notification
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<NotificationDTO> markAsRead(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable("id") Long notificationId) {
        
        log.debug("Marking notification {} as read for user {}", notificationId, userId);

        try {
            Notification updated = notificationService.markAsRead(notificationId, userId);
            return ResponseEntity.ok(NotificationDTO.fromEntity(updated));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).build();
        }
    }

    /**
     * Mark all notifications as read for the current user.
     * 
     * PUT /api/notifications/read-all
     * 
     * @param userId User ID from header
     * @return Count of notifications marked as read
     */
    @PutMapping("/read-all")
    public ResponseEntity<MarkReadResponse> markAllAsRead(
            @RequestHeader("X-User-Id") Long userId) {
        
        log.debug("Marking all notifications as read for user {}", userId);

        int count = notificationService.markAllAsRead(userId);
        return ResponseEntity.ok(new MarkReadResponse(count));
    }

    /**
     * Mark all notifications for a complaint as read.
     * 
     * PUT /api/notifications/complaint/{complaintId}/read-all
     * 
     * Called when user views a complaint detail page.
     * 
     * @param userId      User ID from header
     * @param complaintId The complaint ID
     * @return Count of notifications marked as read
     */
    @PutMapping("/complaint/{complaintId}/read-all")
    public ResponseEntity<MarkReadResponse> markComplaintNotificationsAsRead(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long complaintId) {
        
        log.debug("Marking complaint {} notifications as read for user {}", complaintId, userId);

        int count = notificationService.markComplaintNotificationsAsRead(userId, complaintId);
        return ResponseEntity.ok(new MarkReadResponse(count));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // RESPONSE DTOs
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Response for unread count endpoint.
     */
    public record UnreadCountResponse(long count) {}

    /**
     * Response for mark-as-read endpoints.
     */
    public record MarkReadResponse(int markedAsRead) {}
}
