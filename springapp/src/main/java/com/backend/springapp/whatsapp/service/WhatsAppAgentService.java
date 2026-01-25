package com.backend.springapp.whatsapp.service;

import com.backend.springapp.model.Category;
import com.backend.springapp.model.SLA;
import com.backend.springapp.repository.CategoryRepository;
import com.backend.springapp.repository.SLARepository;
import com.backend.springapp.service.AIService;
import com.backend.springapp.whatsapp.model.ConversationSession;
import com.backend.springapp.whatsapp.model.ConversationSession.PartialComplaint;
import com.backend.springapp.whatsapp.model.SessionState;
import com.backend.springapp.whatsapp.model.WhatsAppMessage;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Main AI Agent service for WhatsApp conversations.
 * This is where the "agentic" behavior happens - the AI decides what to do next.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WhatsAppAgentService {
    
    private final SessionManager sessionManager;
    private final WhatsAppTools tools;
    private final CategoryRepository categoryRepository;
    private final SLARepository slaRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    
    @Value("${gemini.api.key:}")
    private String geminiApiKey;
    
    private static final String GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
    
    /**
     * Main entry point - process an incoming WhatsApp message and generate response
     */
    public String processMessage(WhatsAppMessage message) {
        String phoneNumber = message.getCleanPhoneNumber();
        String userMessage = message.getBody();
        
        log.info("Processing message from {}: {}", phoneNumber, userMessage);
        
        // Get or create session
        ConversationSession session = sessionManager.getOrCreateSession(phoneNumber);
        
        // Add user message to history
        session.addMessage(ConversationSession.ChatMessage.userMessage(userMessage));
        
        // Handle location if shared
        if (message.hasLocation()) {
            return handleLocationShared(session, message);
        }
        
        // Check if user is registered
        if (!session.isRegistered()) {
            WhatsAppTools.UserInfo userInfo = tools.getUserByPhone(phoneNumber);
            if (userInfo.isRegistered()) {
                session.setRegistered(true);
                session.setUserId(userInfo.userId());
                session.setUserName(userInfo.name());
            }
        }
        
        // Generate AI response based on conversation context
        String response = generateAgentResponse(session, userMessage);
        
        // Add response to history
        session.addMessage(ConversationSession.ChatMessage.assistantMessage(response));
        
        // Save session
        sessionManager.saveSession(session);
        
        return response;
    }
    
    /**
     * Handle when user shares their location
     */
    private String handleLocationShared(ConversationSession session, WhatsAppMessage message) {
        String phoneNumber = session.getPhoneNumber();
        
        if (session.getState() == SessionState.COLLECTING_AWAITING_LOCATION) {
            // We were waiting for location
            PartialComplaint partial = session.getPartialComplaint();
            if (partial == null) {
                partial = new PartialComplaint();
                session.setPartialComplaint(partial);
            }
            
            partial.setLatitude(message.getLatitude());
            partial.setLongitude(message.getLongitude());
            
            // Try to get address from coordinates (in production, use geocoding API)
            String locationText = message.getAddress() != null 
                ? message.getAddress() 
                : String.format("Lat: %.6f, Long: %.6f", message.getLatitude(), message.getLongitude());
            partial.setLocation(locationText);
            
            session.setState(SessionState.COLLECTING_CONFIRMING);
            sessionManager.saveSession(session);
            
            return generateConfirmationMessage(session);
        }
        
        // Location shared but we weren't specifically asking for it
        return "📍 Got your location! How can I help you today?\n\n" +
               "You can:\n" +
               "• Report a civic issue\n" +
               "• Check complaint status\n" +
               "• Type 'help' for more options";
    }
    
    /**
     * Main AI decision-making - generate response based on context
     */
    private String generateAgentResponse(ConversationSession session, String userMessage) {
        // Check for special commands first
        String lowerMessage = userMessage.toLowerCase().trim();
        
        if (lowerMessage.equals("help") || lowerMessage.equals("menu")) {
            return getHelpMessage();
        }
        
        if (lowerMessage.equals("start over") || lowerMessage.equals("reset") || lowerMessage.equals("cancel")) {
            session.reset();
            sessionManager.saveSession(session);
            return "🔄 Starting fresh!\n\nHow can I help you today?";
        }
        
        if (lowerMessage.equals("status") || lowerMessage.contains("my complaint") || lowerMessage.contains("check status")) {
            return handleStatusCheck(session);
        }
        
        // If not registered, start onboarding
        if (!session.isRegistered()) {
            return handleOnboarding(session, userMessage);
        }
        
        // IMPORTANT: Handle confirmation state BEFORE calling AI
        // This is when user says "yes" to create the complaint
        if (session.getState() == SessionState.COLLECTING_CONFIRMING) {
            if (lowerMessage.equals("yes") || lowerMessage.equals("y") || lowerMessage.equals("हाँ") || lowerMessage.equals("haan") || lowerMessage.equals("confirm")) {
                PartialComplaint partial = session.getPartialComplaint();
                if (partial != null && partial.hasMinimumInfo()) {
                    var result = tools.createComplaint(
                        session.getUserId(),
                        partial.getTitle(),
                        partial.getDescription(),
                        partial.getLocation(),
                        partial.getLatitude(),
                        partial.getLongitude()
                    );
                    
                    session.reset();
                    sessionManager.saveSession(session);
                    
                    if (result.success()) {
                        return formatComplaintCreated(result);
                    } else {
                        return "❌ Sorry, couldn't create complaint: " + result.error() + "\n\nPlease try again.";
                    }
                } else {
                    return "⚠️ Missing information. Please start over and describe your issue.";
                }
            } else if (lowerMessage.equals("no") || lowerMessage.equals("n") || lowerMessage.equals("नहीं") || lowerMessage.equals("cancel")) {
                session.reset();
                sessionManager.saveSession(session);
                return "🔄 Cancelled. Feel free to start again anytime!\n\nJust describe your issue to file a new complaint.";
            } else {
                // User said something else, re-prompt
                return "Please confirm:\n\n✅ Type *yes* to submit\n❌ Type *no* to cancel";
            }
        }
        
        // Handle location collection state
        if (session.getState() == SessionState.COLLECTING_AWAITING_LOCATION) {
            PartialComplaint partial = session.getPartialComplaint();
            if (partial != null) {
                partial.setLocation(userMessage);
                session.setState(SessionState.COLLECTING_CONFIRMING);
                sessionManager.saveSession(session);
                return generateConfirmationMessage(session);
            }
        }
        
        // Use AI to understand intent and generate response
        return callGeminiAgent(session, userMessage);
    }
    
    /**
     * Handle new user onboarding
     */
    private String handleOnboarding(ConversationSession session, String userMessage) {
        if (session.getState() == SessionState.ONBOARDING_AWAITING_NAME) {
            // User is providing their name
            String name = userMessage.trim();
            if (name.length() < 2 || name.length() > 100) {
                return "Please enter a valid name (2-100 characters).";
            }
            
            // Register user
            WhatsAppTools.UserInfo userInfo = tools.registerUser(name, session.getPhoneNumber());
            session.setRegistered(true);
            session.setUserId(userInfo.userId());
            session.setUserName(userInfo.name());
            session.setState(SessionState.IDLE);
            sessionManager.saveSession(session);
            
            return String.format("""
                ✅ Welcome, %s!
                
                Your number %s is now registered.
                
                You can now:
                📝 Report a civic issue (pothole, street light, garbage, etc.)
                🔍 Check complaint status
                
                Just describe your problem or type 'help' for more options.
                """, name, maskPhoneNumber(session.getPhoneNumber()));
        }
        
        // First message from unregistered user
        session.setState(SessionState.ONBOARDING_AWAITING_NAME);
        sessionManager.saveSession(session);
        
        return """
            👋 Welcome to Municipal Grievance Portal!
            
            I'm your AI assistant for reporting civic issues like:
            • 🕳️ Potholes & road damage
            • 💡 Street light problems
            • 🚰 Water supply issues
            • 🗑️ Garbage collection
            • 🚽 Drainage problems
            
            I don't see your number registered yet.
            
            📝 What's your name?
            """;
    }
    
    /**
     * Handle complaint status check
     */
    private String handleStatusCheck(ConversationSession session) {
        if (!session.isRegistered() || session.getUserId() == null) {
            return "Please register first by sending any message.";
        }
        
        List<WhatsAppTools.ComplaintSummary> complaints = tools.listUserComplaints(session.getUserId());
        
        if (complaints.isEmpty()) {
            return """
                📋 You don't have any complaints yet.
                
                Would you like to report an issue? Just describe the problem!
                """;
        }
        
        StringBuilder sb = new StringBuilder("📋 *Your Complaints:*\n\n");
        
        for (int i = 0; i < complaints.size(); i++) {
            WhatsAppTools.ComplaintSummary c = complaints.get(i);
            String statusEmoji = getStatusEmoji(c.status());
            sb.append(String.format("%d️⃣ *%s*\n", i + 1, c.displayId()));
            sb.append(String.format("   %s %s\n", statusEmoji, c.status()));
            sb.append(String.format("   📍 %s\n", truncate(c.title(), 30)));
            sb.append(String.format("   📅 Filed: %s\n\n", c.filedDate()));
        }
        
        sb.append("Reply with complaint number (e.g., '1') for details.");
        
        session.setState(SessionState.STATUS_CHECKING);
        sessionManager.saveSession(session);
        
        return sb.toString();
    }
    
    /**
     * Call Gemini AI to understand intent and generate response
     */
    private String callGeminiAgent(ConversationSession session, String userMessage) {
        if (geminiApiKey == null || geminiApiKey.isBlank() || geminiApiKey.equals("YOUR_API_KEY_HERE")) {
            // Fallback to rule-based if no API key
            return handleWithRules(session, userMessage);
        }
        
        try {
            String systemPrompt = buildAgentSystemPrompt(session);
            String conversationContext = session.getHistoryAsString();
            
            String fullPrompt = systemPrompt + "\n\n" +
                "CONVERSATION HISTORY:\n" + conversationContext + "\n\n" +
                "USER'S LATEST MESSAGE: " + userMessage + "\n\n" +
                "Generate your response:";
            
            // Call Gemini
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            Map<String, Object> requestBody = Map.of(
                "contents", List.of(Map.of(
                    "parts", List.of(Map.of("text", fullPrompt))
                )),
                "generationConfig", Map.of(
                    "temperature", 0.7,
                    "maxOutputTokens", 500
                )
            );
            
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            String url = GEMINI_URL + "?key=" + geminiApiKey;
            
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                String aiResponse = root.path("candidates").path(0)
                    .path("content").path("parts").path(0)
                    .path("text").asText();
                
                // Process any actions in the response
                return processAgentResponse(session, aiResponse, userMessage);
            }
            
        } catch (Exception e) {
            log.error("Gemini API error: {}", e.getMessage());
        }
        
        // Fallback
        return handleWithRules(session, userMessage);
    }
    
    /**
     * Process AI response and execute any actions
     */
    private String processAgentResponse(ConversationSession session, String aiResponse, String userMessage) {
        // Check if AI wants to create a complaint
        if (aiResponse.contains("[CREATE_COMPLAINT]") && session.getPartialComplaint() != null) {
            PartialComplaint partial = session.getPartialComplaint();
            if (partial.hasMinimumInfo()) {
                // Create the complaint
                var result = tools.createComplaint(
                    session.getUserId(),
                    partial.getTitle() != null ? partial.getTitle() : "Civic Issue",
                    partial.getDescription(),
                    partial.getLocation(),
                    partial.getLatitude(),
                    partial.getLongitude()
                );
                
                if (result.success()) {
                    session.reset();
                    sessionManager.saveSession(session);
                    return formatComplaintCreated(result);
                }
            }
        }
        
        // Check if AI detected we need location
        if (aiResponse.contains("[NEED_LOCATION]")) {
            session.setState(SessionState.COLLECTING_AWAITING_LOCATION);
            
            // Extract description from message and store
            PartialComplaint partial = session.getPartialComplaint();
            if (partial == null) {
                partial = new PartialComplaint();
                session.setPartialComplaint(partial);
            }
            partial.setDescription(userMessage);
            partial.setTitle(truncate(userMessage, 50));
            
            sessionManager.saveSession(session);
        }
        
        // Clean up action markers from response
        return aiResponse
            .replace("[CREATE_COMPLAINT]", "")
            .replace("[NEED_LOCATION]", "")
            .replace("[NEED_DESCRIPTION]", "")
            .trim();
    }
    
    /**
     * Rule-based fallback when AI is not available
     */
    private String handleWithRules(ConversationSession session, String userMessage) {
        String lower = userMessage.toLowerCase();
        
        // Check if it looks like a complaint
        boolean looksLikeComplaint = lower.contains("pothole") || lower.contains("road") ||
            lower.contains("light") || lower.contains("water") || lower.contains("garbage") ||
            lower.contains("drain") || lower.contains("broken") || lower.contains("not working") ||
            lower.contains("problem") || lower.contains("issue");
        
        if (looksLikeComplaint) {
            // Start complaint collection
            PartialComplaint partial = new PartialComplaint();
            partial.setDescription(userMessage);
            partial.setTitle(truncate(userMessage, 50));
            session.setPartialComplaint(partial);
            session.setState(SessionState.COLLECTING_AWAITING_LOCATION);
            sessionManager.saveSession(session);
            
            return """
                I understand you're reporting an issue.
                
                📍 *Where exactly is this problem?*
                
                You can:
                • Share your live location 📍
                • Type the address/landmark
                """;
        }
        
        // Check if user is providing location
        if (session.getState() == SessionState.COLLECTING_AWAITING_LOCATION) {
            PartialComplaint partial = session.getPartialComplaint();
            if (partial != null) {
                partial.setLocation(userMessage);
                session.setState(SessionState.COLLECTING_CONFIRMING);
                sessionManager.saveSession(session);
                
                return generateConfirmationMessage(session);
            }
        }
        
        // Check for confirmation
        if (session.getState() == SessionState.COLLECTING_CONFIRMING) {
            if (lower.equals("yes") || lower.equals("y") || lower.equals("हाँ") || lower.equals("haan")) {
                PartialComplaint partial = session.getPartialComplaint();
                if (partial != null && partial.hasMinimumInfo()) {
                    var result = tools.createComplaint(
                        session.getUserId(),
                        partial.getTitle(),
                        partial.getDescription(),
                        partial.getLocation(),
                        partial.getLatitude(),
                        partial.getLongitude()
                    );
                    
                    session.reset();
                    sessionManager.saveSession(session);
                    
                    if (result.success()) {
                        return formatComplaintCreated(result);
                    } else {
                        return "❌ Sorry, couldn't create complaint. Please try again.";
                    }
                }
            } else if (lower.equals("no") || lower.equals("n") || lower.equals("नहीं")) {
                session.reset();
                sessionManager.saveSession(session);
                return "🔄 Cancelled. Feel free to start again anytime!";
            }
        }
        
        // Default response
        return """
            I'm not sure what you need. 🤔
            
            You can:
            📝 *Report an issue* - Just describe the problem
            🔍 *Check status* - Type "status"
            ❓ *Get help* - Type "help"
            
            Example: "There's a big pothole on MG Road near the bus stop"
            """;
    }
    
    /**
     * Generate confirmation message before submitting complaint
     */
    private String generateConfirmationMessage(ConversationSession session) {
        PartialComplaint partial = session.getPartialComplaint();
        if (partial == null) {
            return "Something went wrong. Please start again.";
        }
        
        return String.format("""
            📋 *Complaint Summary*
            ━━━━━━━━━━━━━━━━━━━━
            
            🔹 *Issue:* %s
            📍 *Location:* %s
            
            Should I submit this complaint?
            
            Reply *Yes* to confirm or *No* to cancel.
            """,
            partial.getDescription() != null ? partial.getDescription() : "Not specified",
            partial.getLocation() != null ? partial.getLocation() : "Not specified"
        );
    }
    
    /**
     * Format success message after complaint creation
     */
    private String formatComplaintCreated(WhatsAppTools.ComplaintResult result) {
        return String.format("""
            ✅ *Complaint Registered Successfully!*
            
            📋 Complaint ID: *GRV-2026-%05d*
            📅 Filed: Today
            
            You'll receive updates on this number.
            
            Type "status" anytime to check progress.
            
            Is there anything else I can help with?
            """, result.complaintId());
    }
    
    /**
     * Build system prompt for the AI agent
     */
    private String buildAgentSystemPrompt(ConversationSession session) {
        List<Category> categories = categoryRepository.findAll();
        String categoryList = categories.stream()
            .map(c -> "- " + c.getName() + ": " + c.getDescription())
            .collect(Collectors.joining("\n"));
        
        String sessionContext = String.format("""
            USER CONTEXT:
            - Name: %s
            - Phone: %s
            - Registered: %s
            - Current State: %s
            """,
            session.getUserName() != null ? session.getUserName() : "Unknown",
            maskPhoneNumber(session.getPhoneNumber()),
            session.isRegistered() ? "Yes" : "No",
            session.getState()
        );
        
        if (session.getPartialComplaint() != null) {
            PartialComplaint p = session.getPartialComplaint();
            sessionContext += String.format("""
                
                PARTIAL COMPLAINT BEING BUILT:
                - Description: %s
                - Location: %s
                - Has Location: %s
                """,
                p.getDescription() != null ? p.getDescription() : "Not provided",
                p.getLocation() != null ? p.getLocation() : "Not provided",
                p.hasLocation() ? "Yes" : "No"
            );
        }
        
        return String.format("""
            You are a helpful AI assistant for a Municipal Grievance Redressal System on WhatsApp.
            
            YOUR ROLE:
            - Help citizens report civic issues (potholes, street lights, water, garbage, etc.)
            - Check status of existing complaints
            - Be friendly, concise, and helpful
            - Support English and Hindi
            
            AVAILABLE CATEGORIES:
            %s
            
            %s
            
            RULES:
            1. Keep messages SHORT (WhatsApp-friendly, max 300 words)
            2. Use emojis sparingly for clarity
            3. If complaint description is given but location is missing, ask for location
               Include [NEED_LOCATION] in your response
            4. If you have both description and location, generate confirmation and include [CREATE_COMPLAINT]
            5. ONE question at a time
            6. For emergencies (electric wire, gas leak), emphasize urgency
            
            RESPONSE FORMAT:
            - Use bullet points
            - Use *bold* for emphasis (WhatsApp markdown)
            - Keep paragraphs short
            """, categoryList, sessionContext);
    }
    
    // ============ Helper Methods ============
    
    private String getHelpMessage() {
        return """
            📱 *Municipal Grievance Portal - Help*
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            
            🆕 *Report New Issue*
            Just describe your problem!
            Example: "Street light not working near my house"
            
            📋 *Check Status*
            Type "status" to see your complaints
            
            🔄 *Start Over*
            Type "reset" to start fresh
            
            📞 *Emergency?*
            For life-threatening issues, also call:
            🚨 Emergency: 112
            🔥 Fire: 101
            🚑 Ambulance: 108
            
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            Just send a message to begin!
            """;
    }
    
    private String getStatusEmoji(String status) {
        return switch(status.toUpperCase()) {
            case "FILED", "OPEN" -> "🔵";
            case "IN_PROGRESS" -> "🟡";
            case "RESOLVED" -> "✅";
            case "CLOSED" -> "✅";
            case "CANCELLED" -> "❌";
            case "HOLD" -> "⏸️";
            default -> "⚪";
        };
    }
    
    private String truncate(String text, int maxLength) {
        if (text == null) return "";
        return text.length() > maxLength ? text.substring(0, maxLength) + "..." : text;
    }
    
    private String maskPhoneNumber(String phone) {
        if (phone == null || phone.length() < 6) return phone;
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }
}
