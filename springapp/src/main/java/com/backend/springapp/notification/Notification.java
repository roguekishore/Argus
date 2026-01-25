package com.backend.springapp.notification;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * User-facing notification entity.
 * 
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  NOTIFICATION vs AUDIT - KEY DIFFERENCES                                     ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  AUDIT (AuditLog)              │  NOTIFICATION (Notification)                ║
 * ║  ─────────────────────────────────────────────────────────────────────────── ║
 * ║  System-facing                 │  User-facing                                ║
 * ║  Immutable (INSERT-ONLY)       │  Mutable (read status changes)              ║
 * ║  Technical precision           │  Human-readable messages                    ║
 * ║  Never deleted                 │  Can be archived/cleaned up                 ║
 * ║  Tracks "what happened"        │  Tells user "what you should know"          ║
 * ║  Compliance/forensics          │  User engagement/UX                         ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * DESIGN DECISIONS:
 * 1. Separate from audit - different lifecycle and purpose
 * 2. userId is required - notifications are always for a specific user
 * 3. complaintId is optional - some notifications may be system-wide
 * 4. link provides navigation context for UI
 * 5. read flag enables unread count badges
 * 
 * FUTURE EXTENSIBILITY:
 * - Add channel (IN_APP, EMAIL, SMS, PUSH) for multi-channel delivery
 * - Add priority (HIGH, NORMAL, LOW) for importance filtering
 * - Add expiresAt for auto-cleanup of old notifications
 */
@Entity
@Table(name = "notifications", indexes = {
    @Index(name = "idx_notification_user", columnList = "user_id"),
    @Index(name = "idx_notification_user_read", columnList = "user_id, is_read"),
    @Index(name = "idx_notification_complaint", columnList = "complaint_id"),
    @Index(name = "idx_notification_created", columnList = "created_at")
})
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ═══════════════════════════════════════════════════════════════════════════
    // WHO: Target user
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * The user who should receive this notification.
     * This is the target audience, not the actor who triggered the event.
     */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    // ═══════════════════════════════════════════════════════════════════════════
    // WHAT: Notification content
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Type of notification - determines icon, color, and behavior in UI.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 50)
    private NotificationType type;

    /**
     * Short title for the notification (displayed prominently).
     * Example: "Complaint Resolved"
     */
    @Column(name = "title", nullable = false, length = 200)
    private String title;

    /**
     * Detailed message body.
     * Example: "Your complaint #12345 about 'Street Light Issue' has been resolved."
     */
    @Column(name = "message", nullable = false, columnDefinition = "TEXT")
    private String message;

    // ═══════════════════════════════════════════════════════════════════════════
    // CONTEXT: Related entities
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Related complaint ID (optional).
     * NULL for system-wide notifications not tied to a specific complaint.
     */
    @Column(name = "complaint_id")
    private Long complaintId;

    /**
     * Deep link for navigation.
     * Example: "/complaints/12345" or "/dashboard/escalations"
     * UI uses this to navigate when notification is clicked.
     */
    @Column(name = "link", length = 500)
    private String link;

    // ═══════════════════════════════════════════════════════════════════════════
    // STATE: Read status
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Whether the user has read/acknowledged this notification.
     * Defaults to false (unread).
     */
    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private Boolean isRead = false;

    /**
     * Timestamp when the notification was read.
     * NULL if not yet read.
     */
    @Column(name = "read_at")
    private LocalDateTime readAt;

    // ═══════════════════════════════════════════════════════════════════════════
    // WHEN: Timestamps
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * When the notification was created.
     */
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
