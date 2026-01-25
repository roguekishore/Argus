package com.backend.springapp.notification;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * Data Transfer Object for notification API responses.
 * 
 * Decouples API contract from JPA entity.
 */
@Getter
@Builder
public class NotificationDTO {

    private final Long id;
    private final Long userId;
    private final String type;
    private final String title;
    private final String message;
    private final Long complaintId;
    private final String link;
    private final Boolean isRead;
    private final LocalDateTime readAt;
    private final LocalDateTime createdAt;

    /**
     * Convert entity to DTO.
     */
    public static NotificationDTO fromEntity(Notification entity) {
        if (entity == null) return null;

        return NotificationDTO.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .type(entity.getType() != null ? entity.getType().name() : null)
                .title(entity.getTitle())
                .message(entity.getMessage())
                .complaintId(entity.getComplaintId())
                .link(entity.getLink())
                .isRead(entity.getIsRead())
                .readAt(entity.getReadAt())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
