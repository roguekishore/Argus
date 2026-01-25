package com.backend.springapp.whatsapp.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Represents a WhatsApp conversation session with a user.
 * Stored in Redis/Database for persistence across messages.
 * 
 * PHASE MANAGEMENT:
 * The `phase` field tracks the current conversation state.
 * This ensures the AI respects workflow boundaries and doesn't skip steps.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConversationSession {
    
    // Session identifier (whatsapp:+91xxxxxxxxxx)
    private String sessionId;
    
    // User's phone number (without whatsapp: prefix)
    private String phoneNumber;
    
    // Database user ID (null if not registered)
    private Long userId;
    
    // User's name (for personalization)
    private String userName;
    
    // Whether user is registered in system
    private boolean isRegistered;
    
    // Current conversation state (DEPRECATED - use phase instead)
    private SessionState state;
    
    // ===== NEW: Explicit Conversation Phase =====
    /**
     * Current conversation phase - controls what actions are allowed.
     * This is the PRIMARY state management field.
     */
    @Builder.Default
    private ConversationPhase phase = ConversationPhase.GREETING;
    
    /**
     * Tracks if we've already asked for an image in this complaint flow.
     * Reset when complaint is filed or flow is cancelled.
     */
    @Builder.Default
    private boolean imagePromptSent = false;
    
    /**
     * Number of times we've asked for registration name.
     * Used to detect if user is stuck or confused.
     */
    @Builder.Default
    private int registrationAttempts = 0;
    
    /**
     * Timestamp of last registration check from DB.
     * Prevents repeated DB lookups within same session.
     */
    private LocalDateTime lastRegistrationCheck;
    
    // Partial complaint being built (before submission)
    private PartialComplaint partialComplaint;
    
    // Complaint ID user is currently viewing/interacting with
    private Long activeComplaintId;
    
    // Message history for context (last N messages)
    @Builder.Default
    private List<ChatMessage> messageHistory = new ArrayList<>();
    
    // Session timestamps
    private LocalDateTime createdAt;
    private LocalDateTime lastActivity;
    private LocalDateTime expiresAt;
    
    // Language preference detected from messages
    @Builder.Default
    private String language = "en";
    
    // Number of clarification attempts (to avoid infinite loops)
    @Builder.Default
    private int clarificationAttempts = 0;
    
    // ===== PENDING IMAGE (from current conversation, not yet submitted) =====
    
    /**
     * S3 key of image uploaded during this conversation (awaiting complaint creation)
     */
    private String pendingImageS3Key;
    
    /**
     * MIME type of pending image
     */
    private String pendingImageMimeType;
    
    /**
     * Raw bytes of pending image (transient, for immediate AI analysis)
     */
    private byte[] pendingImageBytes;
    
    /**
     * Partial complaint being built during conversation
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PartialComplaint {
        private String title;
        private String description;
        private String location;
        private Double latitude;
        private Double longitude;
        
        // AI-determined fields (set after analysis)
        private String suggestedCategory;
        private String suggestedPriority;
        private Integer suggestedSlaDays;
        private String aiReasoning;
        
        public boolean hasMinimumInfo() {
            return description != null && !description.isBlank() 
                && location != null && !location.isBlank();
        }
        
        public boolean hasLocation() {
            return (location != null && !location.isBlank()) 
                || (latitude != null && longitude != null);
        }
    }
    
    /**
     * Single message in conversation history
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ChatMessage {
        private String role;  // "user" or "assistant"
        private String content;
        private LocalDateTime timestamp;
        
        public static ChatMessage userMessage(String content) {
            return ChatMessage.builder()
                .role("user")
                .content(content)
                .timestamp(LocalDateTime.now())
                .build();
        }
        
        public static ChatMessage assistantMessage(String content) {
            return ChatMessage.builder()
                .role("assistant")
                .content(content)
                .timestamp(LocalDateTime.now())
                .build();
        }
    }
    
    // ============ Helper Methods ============
    
    /**
     * Add a message to history (keep last 20 messages)
     */
    public void addMessage(ChatMessage message) {
        if (messageHistory == null) {
            messageHistory = new ArrayList<>();
        }
        messageHistory.add(message);
        
        // Keep only last 20 messages for context
        if (messageHistory.size() > 20) {
            messageHistory = new ArrayList<>(messageHistory.subList(messageHistory.size() - 20, messageHistory.size()));
        }
        
        this.lastActivity = LocalDateTime.now();
    }
    
    /**
     * Reset session to idle state
     */
    public void reset() {
        this.state = SessionState.IDLE;
        this.partialComplaint = null;
        this.activeComplaintId = null;
        this.clarificationAttempts = 0;
        this.imagePromptSent = false;
        clearPendingImage();
        // Keep messageHistory for context
        // Keep phase - it should be set explicitly
    }
    
    /**
     * Reset complaint flow and return to idle phase.
     * Call after filing a complaint or cancelling.
     */
    public void resetComplaintFlow() {
        this.partialComplaint = null;
        this.imagePromptSent = false;
        clearPendingImage();
        if (this.isRegistered) {
            this.phase = ConversationPhase.REGISTERED_IDLE;
        }
    }
    
    /**
     * Start a new complaint flow.
     */
    public void startComplaintFlow() {
        this.partialComplaint = new PartialComplaint();
        this.imagePromptSent = false;
        this.phase = ConversationPhase.AWAITING_ISSUE_DESCRIPTION;
    }
    
    /**
     * Clear pending image data after it's been used
     */
    public void clearPendingImage() {
        this.pendingImageS3Key = null;
        this.pendingImageMimeType = null;
        this.pendingImageBytes = null;
    }
    
    /**
     * Check if there's a pending image
     */
    public boolean hasPendingImage() {
        return pendingImageS3Key != null && !pendingImageS3Key.isBlank();
    }
    
    /**
     * Check if session has expired
     */
    public boolean isExpired() {
        return expiresAt != null && LocalDateTime.now().isAfter(expiresAt);
    }
    
    /**
     * Extend session expiry (call on each activity)
     */
    public void extendExpiry(int minutes) {
        this.expiresAt = LocalDateTime.now().plusMinutes(minutes);
        this.lastActivity = LocalDateTime.now();
    }
    
    /**
     * Get conversation history as string for AI context
     */
    public String getHistoryAsString() {
        if (messageHistory == null || messageHistory.isEmpty()) {
            return "";
        }
        
        StringBuilder sb = new StringBuilder();
        for (ChatMessage msg : messageHistory) {
            sb.append(msg.getRole().equals("user") ? "User: " : "Assistant: ");
            sb.append(msg.getContent());
            sb.append("\n");
        }
        return sb.toString();
    }
}
