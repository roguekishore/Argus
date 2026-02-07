package com.backend.springapp.notification;

import java.util.List;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.backend.springapp.security.UserContext;
import com.backend.springapp.security.UserContextHolder;

/**
 * REST API for user notifications.
 * 
 * SECURITY:
 * All endpoints require authentication via JWT.
 * User context is extracted from the token by JwtAuthenticationFilter.
 * Users can only access their own notifications.
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
    
    /**
     * Get current user ID from JWT context.
     */
    private Long getCurrentUserId() {
        UserContext context = UserContextHolder.getContext();
        if (context == null) {
            throw new SecurityException("User not authenticated");
        }
        return context.userId();
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
     * @param unreadOnly If true, return only unread notifications
     * @return List of notifications, most recent first
     */
    @GetMapping
    public ResponseEntity<List<NotificationDTO>> getNotifications(
            @RequestParam(required = false, defaultValue = "false") boolean unreadOnly) {
        
        Long userId = getCurrentUserId();
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
     * @return Count of unread notifications
     */
    @GetMapping("/count")
    public ResponseEntity<UnreadCountResponse> getUnreadCount() {
        Long userId = getCurrentUserId();
        long count = notificationService.getUnreadCount(userId);
        return ResponseEntity.ok(new UnreadCountResponse(count));
    }

    /**
     * Get notifications for a specific complaint.
     * 
     * GET /api/notifications/complaint/{complaintId}
     * 
     * @param complaintId The complaint ID
     * @return List of notifications for this complaint
     */
    @GetMapping("/complaint/{complaintId}")
    public ResponseEntity<List<NotificationDTO>> getNotificationsForComplaint(
            @PathVariable Long complaintId) {
        
        Long userId = getCurrentUserId();
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
     * @param notificationId The notification ID
     * @return Updated notification
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<NotificationDTO> markAsRead(
            @PathVariable("id") Long notificationId) {
        
        Long userId = getCurrentUserId();
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
     * @return Count of notifications marked as read
     */
    @PutMapping("/read-all")
    public ResponseEntity<MarkReadResponse> markAllAsRead() {
        Long userId = getCurrentUserId();
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
     * @param complaintId The complaint ID
     * @return Count of notifications marked as read
     */
    @PutMapping("/complaint/{complaintId}/read-all")
    public ResponseEntity<MarkReadResponse> markComplaintNotificationsAsRead(
            @PathVariable Long complaintId) {
        
        Long userId = getCurrentUserId();
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
