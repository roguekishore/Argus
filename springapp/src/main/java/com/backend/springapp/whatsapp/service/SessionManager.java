package com.backend.springapp.whatsapp.service;

import com.backend.springapp.whatsapp.model.ConversationSession;
import com.backend.springapp.whatsapp.model.SessionState;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Manages conversation sessions for WhatsApp users.
 * 
 * Current implementation: In-memory ConcurrentHashMap
 * Production recommendation: Redis for persistence across restarts
 * 
 * TODO: Replace with Redis implementation for production:
 * - Add spring-boot-starter-data-redis dependency
 * - Create RedisSessionManager implementing SessionManager interface
 */
@Service
public class SessionManager {
    
    // In-memory session storage (replace with Redis for production)
    private final Map<String, ConversationSession> sessions = new ConcurrentHashMap<>();
    
    // Session timeout in minutes
    private static final int SESSION_TIMEOUT_MINUTES = 30;
    
    // Max messages to keep in history
    private static final int MAX_HISTORY_SIZE = 20;
    
    /**
     * Get or create session for a phone number
     */
    public ConversationSession getOrCreateSession(String phoneNumber) {
        String sessionId = "whatsapp:" + phoneNumber;
        
        ConversationSession session = sessions.get(sessionId);
        
        if (session == null || session.isExpired()) {
            // Create new session
            session = ConversationSession.builder()
                .sessionId(sessionId)
                .phoneNumber(phoneNumber)
                .state(SessionState.IDLE)
                .createdAt(LocalDateTime.now())
                .lastActivity(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusMinutes(SESSION_TIMEOUT_MINUTES))
                .build();
            
            sessions.put(sessionId, session);
        } else {
            // Extend expiry on activity
            session.extendExpiry(SESSION_TIMEOUT_MINUTES);
        }
        
        return session;
    }
    
    /**
     * Get existing session (returns null if not found or expired)
     */
    public ConversationSession getSession(String phoneNumber) {
        String sessionId = "whatsapp:" + phoneNumber;
        ConversationSession session = sessions.get(sessionId);
        
        if (session != null && session.isExpired()) {
            sessions.remove(sessionId);
            return null;
        }
        
        return session;
    }
    
    /**
     * Save/update session
     */
    public void saveSession(ConversationSession session) {
        session.setLastActivity(LocalDateTime.now());
        session.extendExpiry(SESSION_TIMEOUT_MINUTES);
        sessions.put(session.getSessionId(), session);
    }
    
    /**
     * Delete session
     */
    public void deleteSession(String phoneNumber) {
        String sessionId = "whatsapp:" + phoneNumber;
        sessions.remove(sessionId);
    }
    
    /**
     * Remove session by session ID (works for web and whatsapp)
     */
    public void removeSession(String sessionId) {
        sessions.remove(sessionId);
    }
    
    /**
     * Reset session to idle state
     */
    public void resetSession(String phoneNumber) {
        ConversationSession session = getSession(phoneNumber);
        if (session != null) {
            session.reset();
            saveSession(session);
        }
    }
    
    /**
     * Update session state
     */
    public void updateState(String phoneNumber, SessionState newState) {
        ConversationSession session = getSession(phoneNumber);
        if (session != null) {
            session.setState(newState);
            saveSession(session);
        }
    }
    
    /**
     * Add message to session history
     */
    public void addUserMessage(String phoneNumber, String message) {
        ConversationSession session = getSession(phoneNumber);
        if (session != null) {
            session.addMessage(ConversationSession.ChatMessage.userMessage(message));
            saveSession(session);
        }
    }
    
    /**
     * Add assistant response to session history
     */
    public void addAssistantMessage(String phoneNumber, String message) {
        ConversationSession session = getSession(phoneNumber);
        if (session != null) {
            session.addMessage(ConversationSession.ChatMessage.assistantMessage(message));
            saveSession(session);
        }
    }
    
    /**
     * Clean up expired sessions (call periodically)
     */
    public void cleanupExpiredSessions() {
        sessions.entrySet().removeIf(entry -> entry.getValue().isExpired());
    }
    
    /**
     * Get all active sessions (for monitoring)
     */
    public Map<String, ConversationSession> getAllSessions() {
        cleanupExpiredSessions();
        return Map.copyOf(sessions);
    }
    
    /**
     * Get session count (for monitoring)
     */
    public int getActiveSessionCount() {
        cleanupExpiredSessions();
        return sessions.size();
    }
}
