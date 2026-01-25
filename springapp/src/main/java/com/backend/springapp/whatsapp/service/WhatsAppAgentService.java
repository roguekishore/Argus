package com.backend.springapp.whatsapp.service;

import com.backend.springapp.whatsapp.model.ConversationSession;
import com.backend.springapp.whatsapp.model.WhatsAppMessage;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

/**
 * TRUE AGENTIC AI - Gemini Function Calling with High Quality Responses
 * 
 * Uses Gemini 1.5 Pro for superior understanding and natural responses.
 * The AI AUTONOMOUSLY decides which tool to call based on conversation context.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WhatsAppAgentService {

    private final SessionManager sessionManager;
    private final WhatsAppTools tools;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    // Using Gemini 2.5 Pro (stable) for highest quality responses
    private static final String GEMINI_URL = 
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.0-pro:generateContent";

    // ==================== ENTRY POINT ====================

    public String processMessage(WhatsAppMessage message) {
        String phone = message.getCleanPhoneNumber();
        String userMsg = message.getBody();
        
        log.info("📩 {} : {}", phone, userMsg);

        ConversationSession session = sessionManager.getOrCreateSession(phone);
        session.addMessage(ConversationSession.ChatMessage.userMessage(userMsg));

        // Check if already registered in DB
        if (!session.isRegistered()) {
            var user = tools.getUserByPhone(phone);
            if (user.isRegistered()) {
                session.setRegistered(true);
                session.setUserId(user.userId());
                session.setUserName(user.name());
            }
        }

        // AI decides what to do
        String response = callGeminiWithTools(session, userMsg);
        
        session.addMessage(ConversationSession.ChatMessage.assistantMessage(response));
        sessionManager.saveSession(session);
        
        return response;
    }

    // ==================== GEMINI + FUNCTION CALLING ====================

    private String callGeminiWithTools(ConversationSession session, String userMsg) {
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
                    "temperature", 0.8,
                    "maxOutputTokens", 1024,
                    "topP", 0.95
                )
            );

            ResponseEntity<String> resp = restTemplate.postForEntity(
                GEMINI_URL + "?key=" + geminiApiKey,
                new HttpEntity<>(request, headers),
                String.class
            );

            log.info("🤖 Gemini response status: {}", resp.getStatusCode());
            log.debug("🤖 Gemini response body: {}", resp.getBody());

            if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null) {
                log.error("❌ Gemini API error: status={}, body={}", resp.getStatusCode(), resp.getBody());
                return "I'm having trouble connecting. Please try again in a moment.";
            }

            JsonNode root = objectMapper.readTree(resp.getBody());
            
            // Check for API errors in response
            if (root.has("error")) {
                log.error("❌ Gemini API returned error: {}", root.path("error"));
                return "I'm experiencing technical difficulties. Please try again.";
            }
            
            JsonNode candidate = root.path("candidates").path(0);
            
            // Check for safety blocks
            if (candidate.has("finishReason") && 
                candidate.path("finishReason").asText().equals("SAFETY")) {
                return "I couldn't process that request. Please try rephrasing.";
            }

            JsonNode part = candidate.path("content").path("parts").path(0);

            // AI chose to call a function
            if (part.has("functionCall")) {
                return executeFunction(session, part.get("functionCall"));
            }

            // AI responds with text
            String text = part.path("text").asText("");
            log.info("🤖 AI response text: {}", text.length() > 100 ? text.substring(0, 100) + "..." : text);
            return text.isEmpty() ? "How can I help you today?" : text;

        } catch (org.springframework.web.client.HttpClientErrorException e) {
            log.error("❌ Gemini HTTP error: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            return "I'm experiencing technical difficulties. Please try again.";
        } catch (Exception e) {
            log.error("❌ Gemini error: {}", e.getMessage(), e);
            return "Sorry, I encountered an issue. Please try again.";
        }
    }

    // ==================== EXECUTE AI'S CHOICE ====================

    private String executeFunction(ConversationSession session, JsonNode fn) {
        String name = fn.path("name").asText();
        JsonNode args = fn.path("args");
        
        log.info("🤖 AI called function: {} with args: {}", name, args);

        return switch (name) {
            case "register_user" -> {
                String userName = args.path("name").asText().trim();
                if (userName.isEmpty() || userName.length() < 2) {
                    yield "I didn't catch your name. Could you please tell me your full name?";
                }
                var r = tools.registerUser(userName, session.getPhoneNumber());
                session.setRegistered(true);
                session.setUserId(r.userId());
                session.setUserName(r.name());
                sessionManager.saveSession(session);
                yield String.format("""
                    ✅ *Welcome, %s!* 🎉
                    
                    You're now registered with the Municipal Grievance Portal.
                    
                    I can help you with:
                    📝 *Report an issue* - Just describe the problem and location
                    🔍 *Check status* - Say "status" or "my complaints"
                    
                    What would you like to do today?""", r.name());
            }

            case "create_complaint" -> {
                if (!session.isRegistered()) {
                    yield "Before I can file a complaint, I need to register you. What's your name?";
                }
                
                String title = args.path("title").asText();
                String description = args.path("description").asText();
                String location = args.path("location").asText();
                
                if (description.isEmpty() || location.isEmpty()) {
                    yield "I need both the issue description and location to file a complaint. Could you provide the missing details?";
                }
                
                var r = tools.createComplaint(
                    session.getUserId(),
                    title.isEmpty() ? description.substring(0, Math.min(50, description.length())) : title,
                    description,
                    location, null, null
                );
                
                if (r.success()) {
                    yield String.format("""
                        ✅ *Complaint Registered Successfully!*
                        
                        📋 *Complaint ID:* %s
                        🏷️ *Category:* %s
                        🏢 *Assigned to:* %s Department
                        ⏰ *Resolution Time:* %d working days
                        📅 *Expected by:* %s
                        
                        💡 *Tip:* Save your complaint ID to track progress.
                        Type "status" anytime to check updates!""",
                        r.displayId(),
                        r.category(),
                        r.department(),
                        r.slaDays(),
                        r.deadline());
                } else {
                    yield "❌ I couldn't register your complaint. Please try again or contact support.";
                }
            }

            case "list_complaints" -> {
                if (!session.isRegistered()) {
                    yield "I need to register you first. What's your name?";
                }
                var list = tools.listUserComplaints(session.getUserId());
                if (list.isEmpty()) {
                    yield """
                        📋 *No Complaints Found*
                        
                        You haven't filed any complaints yet.
                        
                        Want to report an issue? Just describe the problem and its location!""";
                }
                StringBuilder sb = new StringBuilder("📋 *Your Complaints:*\n\n");
                for (var c : list) {
                    sb.append(String.format("*%s* %s\n", c.displayId(), getStatusEmoji(c.status())));
                    sb.append(String.format("└ %s\n", truncate(c.title(), 40)));
                    sb.append(String.format("└ Status: *%s*\n", formatStatus(c.status())));
                    sb.append(String.format("└ Filed: %s\n\n", c.filedDate()));
                }
                sb.append("_Reply with complaint ID for more details_");
                yield sb.toString();
            }

            case "get_complaint_status" -> {
                String complaintIdInput = args.path("complaint_id").asText();
                Long id = extractComplaintId(complaintIdInput);
                
                if (id == null) {
                    yield "I couldn't find that complaint ID. Please check and try again.\n\nFormat: GRV-2026-00001 or just the number";
                }
                
                var c = tools.getComplaintDetails(id);
                if (c == null) {
                    // Try to be helpful
                    if (session.isRegistered()) {
                        var userComplaints = tools.listUserComplaints(session.getUserId());
                        if (!userComplaints.isEmpty()) {
                            yield String.format("""
                                ❌ Complaint not found with ID: %s
                                
                                Your recent complaints:
                                %s
                                
                                Please use one of these IDs.""",
                                complaintIdInput,
                                userComplaints.stream()
                                    .limit(3)
                                    .map(comp -> "• " + comp.displayId())
                                    .reduce((a, b) -> a + "\n" + b)
                                    .orElse("None"));
                        }
                    }
                    yield "❌ Complaint not found. Please check the ID and try again.";
                }
                
                StringBuilder sb = new StringBuilder();
                sb.append(String.format("📋 *Complaint Details*\n\n"));
                sb.append(String.format("🔖 *ID:* %s\n", c.displayId()));
                sb.append(String.format("%s *Status:* %s\n\n", getStatusEmoji(c.status()), formatStatus(c.status())));
                sb.append(String.format("📍 *Issue:* %s\n", c.title()));
                sb.append(String.format("📌 *Location:* %s\n", c.location()));
                sb.append(String.format("🏢 *Department:* %s\n", c.department()));
                sb.append(String.format("📅 *Filed:* %s\n", c.filedDate()));
                sb.append(String.format("⏰ *Due by:* %s\n", c.dueDate()));
                
                if (c.staffName() != null && !c.staffName().isEmpty()) {
                    sb.append(String.format("\n👤 *Assigned to:* %s\n", c.staffName()));
                }
                
                yield sb.toString();
            }

            default -> "I'm not sure how to help with that. Could you please rephrase?";
        };
    }

    // ==================== TOOL DEFINITIONS ====================

    private List<Map<String, Object>> getTools() {
        return List.of(
            tool("register_user", 
                 "Register a new citizen user. Call this ONLY when an unregistered user explicitly provides their name for registration. Do not call for greetings.",
                 Map.of("name", prop("string", "The user's full name as they provided it")), 
                 List.of("name")),
            
            tool("create_complaint",
                 "Create a new civic complaint. ONLY call when you have BOTH: 1) A clear description of the issue/problem, AND 2) A specific location. If either is missing, ask the user for it first - do NOT call this function.",
                 Map.of(
                     "title", prop("string", "A brief title summarizing the issue (max 50 chars)"),
                     "description", prop("string", "Detailed description of the problem"),
                     "location", prop("string", "Specific location/address where the issue exists")
                 ), 
                 List.of("description", "location")),
            
            tool("list_complaints",
                 "List all complaints filed by the current user. Call when user asks about 'my complaints', 'status', 'check status', or wants to see their filed complaints.",
                 Map.of(), 
                 List.of()),
            
            tool("get_complaint_status",
                 "Get detailed status of a specific complaint by its ID. Call when user provides a complaint ID like 'GRV-2026-00001' or asks about a specific complaint number.",
                 Map.of("complaint_id", prop("string", "The complaint ID (e.g., GRV-2026-00001 or just the number)")), 
                 List.of("complaint_id"))
        );
    }

    // ==================== SYSTEM PROMPT ====================

    private String buildPrompt(ConversationSession session, String userMsg) {
        String userStatus = session.isRegistered() 
            ? String.format("REGISTERED USER: %s (ID: %d)", session.getUserName(), session.getUserId())
            : "UNREGISTERED USER - Must register with name before filing complaints";

        return String.format("""
            You are a friendly and helpful Municipal Grievance Assistant on WhatsApp for an Indian city.
            Your role is to help citizens report civic issues and track their complaints.
            
            === CURRENT USER STATUS ===
            %s
            
            === YOUR AVAILABLE TOOLS ===
            1. register_user - Register a new user (only when they provide their name for registration)
            2. create_complaint - File a new complaint (REQUIRES both issue description AND location)
            3. list_complaints - Show user's complaints (when they ask for status/my complaints)
            4. get_complaint_status - Get details of a specific complaint ID
            
            === CRITICAL RULES ===
            1. For UNREGISTERED users: Warmly greet them and ask for their name to register. Don't file complaints until registered.
            
            2. For filing complaints: You MUST have BOTH:
               - A clear description of the issue (pothole, street light, water leak, garbage, drainage, etc.)
               - A specific location (street name, landmark, area)
               If EITHER is missing, politely ask for it. Do NOT call create_complaint without both.
            
            3. When user says "status" or "my complaints" - call list_complaints
            
            4. When user provides a complaint ID (like GRV-2026-00001) - call get_complaint_status
            
            5. Be conversational, warm, and use appropriate emojis. Keep responses concise but helpful.
            
            6. IMPORTANT: When you have sufficient information, CALL THE APPROPRIATE FUNCTION. Don't just describe what you'll do.
            
            === CONVERSATION HISTORY ===
            %s
            
            === USER'S MESSAGE ===
            %s
            
            Respond naturally and helpfully. If you need to call a function, do so. Otherwise, respond with text.""",
            userStatus, 
            session.getHistoryAsString(), 
            userMsg);
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
        
        // Remove common prefixes and extract number
        String cleaned = input.toUpperCase()
            .replace("GRV-2026-", "")
            .replace("GRV2026", "")
            .replace("GRV-", "")
            .replace("GRV", "")
            .replaceAll("[^0-9]", "");
        
        if (cleaned.isEmpty()) return null;
        
        try {
            return Long.parseLong(cleaned);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String getStatusEmoji(String status) {
        if (status == null) return "⚪";
        return switch (status.toUpperCase()) {
            case "FILED", "OPEN" -> "🟡";
            case "ASSIGNED" -> "🔵";
            case "IN_PROGRESS" -> "🟠";
            case "RESOLVED" -> "🟢";
            case "CLOSED" -> "✅";
            case "HOLD" -> "⏸️";
            case "CANCELLED" -> "❌";
            default -> "⚪";
        };
    }

    private String formatStatus(String status) {
        if (status == null) return "Filed";
        return switch (status.toUpperCase()) {
            case "FILED" -> "Filed - Awaiting Review";
            case "OPEN" -> "Open";
            case "ASSIGNED" -> "Assigned to Staff";
            case "IN_PROGRESS" -> "Work In Progress";
            case "RESOLVED" -> "Resolved";
            case "CLOSED" -> "Closed";
            case "HOLD" -> "On Hold";
            case "CANCELLED" -> "Cancelled";
            default -> status;
        };
    }

    private String truncate(String s, int maxLen) {
        if (s == null) return "";
        return s.length() > maxLen ? s.substring(0, maxLen - 3) + "..." : s;
    }
}
