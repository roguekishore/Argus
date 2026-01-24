package com.backend.springapp.controller;

import com.backend.springapp.whatsapp.model.ConversationSession;
import com.backend.springapp.whatsapp.service.SessionManager;
import com.backend.springapp.whatsapp.service.WhatsAppTools;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.*;

/**
 * Simple Chat API for React frontend testing
 * Uses same Gemini model and tools as WhatsApp
 */
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class ChatController {

    private final SessionManager sessionManager;
    private final WhatsAppTools tools;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    private static final String GEMINI_URL = 
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

    // ==================== CHAT ENDPOINT ====================

    @PostMapping("/message")
    public ResponseEntity<ChatResponse> chat(@RequestBody ChatRequest request) {
        String sessionId = request.sessionId();
        String userMessage = request.message();
        
        if (sessionId == null || sessionId.isBlank()) {
            sessionId = "web-" + UUID.randomUUID().toString().substring(0, 8);
        }
        
        log.info("💬 [{}] User: {}", sessionId, userMessage);
        
        ConversationSession session = sessionManager.getOrCreateSession(sessionId);
        session.addMessage(ConversationSession.ChatMessage.userMessage(userMessage));
        
        // Process with AI
        String response = processWithGemini(session, userMessage);
        
        session.addMessage(ConversationSession.ChatMessage.assistantMessage(response));
        sessionManager.saveSession(session);
        
        // Generate quick reply options based on context
        List<QuickReply> quickReplies = generateQuickReplies(session, response);
        
        log.info("💬 [{}] Bot: {}", sessionId, response.length() > 100 ? response.substring(0, 100) + "..." : response);
        
        return ResponseEntity.ok(new ChatResponse(
            sessionId,
            response,
            session.isRegistered(),
            session.getUserName(),
            quickReplies
        ));
    }

    @PostMapping("/reset")
    public ResponseEntity<Map<String, String>> resetSession(@RequestBody Map<String, String> body) {
        String sessionId = body.get("sessionId");
        if (sessionId != null) {
            sessionManager.removeSession(sessionId);
        }
        return ResponseEntity.ok(Map.of("status", "reset", "newSessionId", "web-" + UUID.randomUUID().toString().substring(0, 8)));
    }

    // ==================== GEMINI PROCESSING ====================

    private String processWithGemini(ConversationSession session, String userMsg) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            return "⚠️ System not configured. Please contact support.";
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            Map<String, Object> request = Map.of(
                "contents", List.of(Map.of(
                    "role", "user",
                    "parts", List.of(Map.of("text", buildPrompt(session, userMsg)))
                )),
                "tools", List.of(Map.of("functionDeclarations", getTools())),
                "generationConfig", Map.of(
                    "temperature", 0.7,
                    "maxOutputTokens", 1024
                )
            );

            ResponseEntity<String> resp = restTemplate.postForEntity(
                GEMINI_URL + "?key=" + geminiApiKey,
                new HttpEntity<>(request, headers),
                String.class
            );

            if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null) {
                return "I'm having trouble. Please try again.";
            }

            JsonNode root = objectMapper.readTree(resp.getBody());
            JsonNode part = root.path("candidates").path(0).path("content").path("parts").path(0);

            if (part.has("functionCall")) {
                return executeFunction(session, part.get("functionCall"));
            }

            return part.path("text").asText("How can I help you?");

        } catch (Exception e) {
            log.error("❌ Gemini error: {}", e.getMessage());
            return "Sorry, something went wrong. Please try again.";
        }
    }

    // ==================== FUNCTION EXECUTION ====================

    private String executeFunction(ConversationSession session, JsonNode fn) {
        String name = fn.path("name").asText();
        JsonNode args = fn.path("args");
        
        log.info("🔧 Function: {} | Args: {}", name, args);

        return switch (name) {
            case "register_user" -> {
                String userName = args.path("name").asText().trim();
                String phone = args.path("phone").asText().trim();
                String email = args.path("email").asText().trim();
                
                if (userName.isEmpty() || userName.length() < 2) {
                    yield "Please provide your full name to register.";
                }
                if (phone.isEmpty() || phone.length() < 10) {
                    yield "Please provide a valid phone number (10+ digits).";
                }
                
                var r = tools.registerUser(userName, phone, email.isEmpty() ? null : email);
                session.setRegistered(true);
                session.setUserId(r.userId());
                session.setUserName(r.name());
                session.setPhoneNumber(phone);
                sessionManager.saveSession(session);
                
                yield String.format("""
                    ✅ **Welcome, %s!** 🎉
                    
                    You're now registered with the Municipal Grievance Portal.
                    
                    I can help you:
                    • 📝 **Report an issue** - Describe the problem and location
                    • 🔍 **Check status** - View your complaints
                    
                    What would you like to do?""", r.name());
            }

            case "create_complaint" -> {
                if (!session.isRegistered()) {
                    yield "Please register first by providing your name and phone number.";
                }
                
                String title = args.path("title").asText();
                String description = args.path("description").asText();
                String location = args.path("location").asText();
                
                if (description.isEmpty() || location.isEmpty()) {
                    yield "I need both the issue description and location to file a complaint.";
                }
                
                var r = tools.createComplaint(
                    session.getUserId(),
                    title.isEmpty() ? description.substring(0, Math.min(50, description.length())) : title,
                    description,
                    location, null, null
                );
                
                if (r.success()) {
                    yield String.format("""
                        ✅ **Complaint Registered!**
                        
                        📋 **ID:** %s
                        🏷️ **Category:** %s
                        🏢 **Department:** %s
                        ⏰ **SLA:** %d working days
                        📅 **Due by:** %s
                        
                        Save your complaint ID to track progress!""",
                        r.displayId(), r.category(), r.department(), r.slaDays(), r.deadline());
                } else {
                    yield "❌ Couldn't register complaint. Please try again.";
                }
            }

            case "list_complaints" -> {
                if (!session.isRegistered()) {
                    yield "Please register first to view your complaints.";
                }
                var list = tools.listUserComplaints(session.getUserId());
                if (list.isEmpty()) {
                    yield "📋 **No complaints found.**\n\nWant to report an issue?";
                }
                StringBuilder sb = new StringBuilder("📋 **Your Complaints:**\n\n");
                for (var c : list) {
                    sb.append(String.format("**%s** %s\n", c.displayId(), getStatusEmoji(c.status())));
                    sb.append(String.format("• %s\n", truncate(c.title(), 40)));
                    sb.append(String.format("• Status: **%s**\n\n", formatStatus(c.status())));
                }
                yield sb.toString();
            }

            case "get_complaint_status" -> {
                String complaintId = args.path("complaint_id").asText();
                Long id = extractComplaintId(complaintId);
                
                if (id == null) {
                    yield "Please provide a valid complaint ID (e.g., GRV-2026-00001).";
                }
                
                var c = tools.getComplaintDetails(id);
                if (c == null) {
                    yield "❌ Complaint not found. Please check the ID.";
                }
                
                yield String.format("""
                    📋 **Complaint Details**
                    
                    🔖 **ID:** %s
                    %s **Status:** %s
                    
                    📍 **Issue:** %s
                    📌 **Location:** %s
                    🏢 **Department:** %s
                    📅 **Filed:** %s
                    ⏰ **Due:** %s""",
                    c.displayId(), getStatusEmoji(c.status()), formatStatus(c.status()),
                    c.title(), c.location(), c.department(), c.filedDate(), c.dueDate());
            }

            default -> "I'm not sure how to help with that.";
        };
    }

    // ==================== QUICK REPLIES ====================

    private List<QuickReply> generateQuickReplies(ConversationSession session, String response) {
        List<QuickReply> replies = new ArrayList<>();
        
        String lowerResponse = response.toLowerCase();
        
        // Not registered - offer registration options
        if (!session.isRegistered()) {
            if (lowerResponse.contains("name") || lowerResponse.contains("register")) {
                replies.add(new QuickReply("register", "📝 Register Me", "I want to register"));
            }
            replies.add(new QuickReply("help", "❓ What can you do?", "What can you help me with?"));
            return replies;
        }
        
        // Registered user options
        if (lowerResponse.contains("welcome") || lowerResponse.contains("what would you like")) {
            replies.add(new QuickReply("report", "📝 Report Issue", "I want to report a problem"));
            replies.add(new QuickReply("status", "🔍 My Complaints", "Show my complaints"));
        }
        
        // After complaint is filed
        if (lowerResponse.contains("complaint registered") || lowerResponse.contains("successfully")) {
            replies.add(new QuickReply("another", "📝 Report Another", "I want to report another issue"));
            replies.add(new QuickReply("status", "🔍 View All", "Show my complaints"));
        }
        
        // Asking for location/description
        if (lowerResponse.contains("location") && lowerResponse.contains("where")) {
            replies.add(new QuickReply("loc1", "📍 Near me", "Near my current location"));
        }
        
        // Email prompt
        if (lowerResponse.contains("email")) {
            replies.add(new QuickReply("no_email", "❌ No Email", "I don't have an email"));
            replies.add(new QuickReply("has_email", "✅ I Have Email", "I have an email address"));
        }
        
        // Default options for registered users
        if (replies.isEmpty()) {
            replies.add(new QuickReply("report", "📝 Report Issue", "I want to report a problem"));
            replies.add(new QuickReply("status", "🔍 My Complaints", "Show my complaints"));
            replies.add(new QuickReply("help", "❓ Help", "What can you help me with?"));
        }
        
        return replies;
    }

    // ==================== TOOL DEFINITIONS ====================

    private List<Map<String, Object>> getTools() {
        return List.of(
            tool("register_user", 
                 "Register a new user. REQUIRED: name and phone. Optional: email. Call when user provides name and phone for registration.",
                 Map.of(
                     "name", prop("string", "User's full name"),
                     "phone", prop("string", "Phone number with country code (e.g., +919876543210)"),
                     "email", prop("string", "Email address (optional, can be empty)")
                 ), 
                 List.of("name", "phone")),
            
            tool("create_complaint",
                 "Create a new complaint. REQUIRES: description AND location. Ask for missing info first.",
                 Map.of(
                     "title", prop("string", "Brief title (max 50 chars)"),
                     "description", prop("string", "Detailed problem description"),
                     "location", prop("string", "Specific location/address")
                 ), 
                 List.of("description", "location")),
            
            tool("list_complaints",
                 "List user's complaints. Call for 'my complaints', 'status', 'check status'.",
                 Map.of(), 
                 List.of()),
            
            tool("get_complaint_status",
                 "Get specific complaint details by ID.",
                 Map.of("complaint_id", prop("string", "Complaint ID (e.g., GRV-2026-00001)")), 
                 List.of("complaint_id"))
        );
    }

    private String buildPrompt(ConversationSession session, String userMsg) {
        String userStatus = session.isRegistered() 
            ? String.format("REGISTERED: %s (ID: %d, Phone: %s)", session.getUserName(), session.getUserId(), session.getPhoneNumber())
            : "NOT REGISTERED - Need name and phone to register. Email is OPTIONAL.";

        return String.format("""
            You are a Municipal Grievance Assistant chatbot.
            
            === USER STATUS ===
            %s
            
            === RULES ===
            1. For registration: ONLY name and phone are REQUIRED. Email is OPTIONAL.
               - If user says "no email" or "I don't have email", register without email.
               - Ask for name first, then phone. Only ask email if user wants to provide it.
            
            2. For complaints: Need BOTH description AND location.
            
            3. Be concise and helpful. Use emojis sparingly.
            
            4. CALL FUNCTIONS when you have required info. Don't just describe.
            
            === HISTORY ===
            %s
            
            === USER MESSAGE ===
            %s""",
            userStatus, session.getHistoryAsString(), userMsg);
    }

    // ==================== HELPERS ====================

    private Map<String, Object> tool(String name, String desc, Map<String, Object> props, List<String> req) {
        Map<String, Object> params = new HashMap<>();
        params.put("type", "object");
        params.put("properties", props);
        if (!req.isEmpty()) params.put("required", req);
        return Map.of("name", name, "description", desc, "parameters", params);
    }

    private Map<String, String> prop(String type, String desc) {
        return Map.of("type", type, "description", desc);
    }

    private Long extractComplaintId(String input) {
        if (input == null || input.isBlank()) return null;
        String cleaned = input.toUpperCase()
            .replace("GRV-2026-", "").replace("GRV-", "").replace("GRV", "")
            .replaceAll("[^0-9]", "");
        if (cleaned.isEmpty()) return null;
        try { return Long.parseLong(cleaned); } catch (Exception e) { return null; }
    }

    private String getStatusEmoji(String status) {
        if (status == null) return "⚪";
        return switch (status.toUpperCase()) {
            case "FILED", "OPEN" -> "🟡";
            case "IN_PROGRESS" -> "🟠";
            case "RESOLVED" -> "🟢";
            case "CLOSED" -> "✅";
            default -> "⚪";
        };
    }

    private String formatStatus(String status) {
        if (status == null) return "Filed";
        return switch (status.toUpperCase()) {
            case "FILED" -> "Filed";
            case "IN_PROGRESS" -> "In Progress";
            case "RESOLVED" -> "Resolved";
            case "CLOSED" -> "Closed";
            default -> status;
        };
    }

    private String truncate(String s, int max) {
        return s == null ? "" : (s.length() > max ? s.substring(0, max - 3) + "..." : s);
    }

    // ==================== DTOs ====================

    public record ChatRequest(String sessionId, String message) {}
    public record ChatResponse(String sessionId, String message, boolean registered, String userName, List<QuickReply> quickReplies) {}
    public record QuickReply(String id, String label, String value) {}
}
