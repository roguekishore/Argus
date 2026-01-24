# 🤖 WhatsApp AI Agent - Technical Documentation

## Overview

This document describes the WhatsApp-based AI Agent for the Municipal Grievance Redressal System. The agent allows citizens to file complaints, check status, and interact with the system through WhatsApp - making it accessible to users who may not be comfortable with web applications.

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   WhatsApp      │────▶│   Twilio        │────▶│   Spring Boot   │
│   (Citizen)     │◀────│   (Webhook)     │◀────│   (Backend)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │   Gemini AI     │
                                               │   (Intent &     │
                                               │   Classification)│
                                               └─────────────────┘
```

### Components

| Component | Purpose | Location |
|-----------|---------|----------|
| `WhatsAppWebhookController` | Receives Twilio webhooks | `whatsapp/controller/` |
| `WhatsAppAgentService` | Main AI agent logic | `whatsapp/service/` |
| `WhatsAppTools` | Database operations (create complaint, check status) | `whatsapp/service/` |
| `SessionManager` | In-memory conversation sessions | `whatsapp/service/` |
| `TwilioService` | Send messages via Twilio API | `whatsapp/service/` |
| `ConversationSession` | Session state & message history | `whatsapp/model/` |

---

## Conversation Flow

### 1. New User Registration
```
User: hello
Bot: 👋 Welcome to Municipal Grievance Portal!
     Please enter your name to register.

User: Rajesh Kumar
Bot: ✅ Welcome, Rajesh Kumar!
     Your number +91****543210 is now registered.
```

### 2. Filing a Complaint
```
User: There's a big pothole on MG Road near bus stop
Bot: I understand you're reporting an issue.
     📍 Where exactly is this problem?
     
User: Near Gandhi Statue, MG Road
Bot: 📋 Complaint Summary
     🔹 Issue: There's a big pothole on MG Road...
     📍 Location: Near Gandhi Statue, MG Road
     
     ✅ Type 'yes' to submit
     ❌ Type 'no' to cancel

User: yes
Bot: ✅ Complaint Registered Successfully!
     
     📋 Complaint ID: GRV-2026-00042
     🏷️ Category: ROAD_MAINTENANCE
     🏢 Department: Public Works
     ⏰ SLA: 3 days (Due: Jan 23, 2026)
```

### 3. Checking Status
```
User: status
Bot: 📋 Your Complaints:
     
     1️⃣ GRV-2026-00042
        🟡 IN_PROGRESS
        📍 Pothole on MG Road
        📅 Filed: Jan 20, 2026
```

---

## Session States

```java
public enum SessionState {
    IDLE,                          // Default state
    ONBOARDING_AWAITING_NAME,      // New user, waiting for name
    COLLECTING_AWAITING_LOCATION,  // Got complaint, need location
    COLLECTING_CONFIRMING,         // Have all info, awaiting yes/no
    STATUS_CHECKING                // User is checking complaint status
}
```

### State Transitions

```
                    ┌──────────────────────┐
                    │        IDLE          │
                    └──────────┬───────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   ONBOARDING    │  │   COLLECTING    │  │     STATUS      │
│  AWAITING_NAME  │  │AWAITING_LOCATION│  │    CHECKING     │
└────────┬────────┘  └────────┬────────┘  └─────────────────┘
         │                    │
         │                    ▼
         │           ┌─────────────────┐
         │           │   COLLECTING    │
         │           │   CONFIRMING    │
         │           └────────┬────────┘
         │                    │
         └────────────────────┴───────▶ IDLE (after completion)
```

---

## API Endpoints

### Webhook Endpoint (Twilio)
```
POST /api/whatsapp/webhook
Content-Type: application/x-www-form-urlencoded

Parameters (from Twilio):
- From: whatsapp:+919876543210
- To: whatsapp:+14155238886
- Body: Message text
- Latitude/Longitude: If location shared
- ProfileName: WhatsApp profile name

Response: TwiML XML
```

### Test Endpoint (Development)
```
POST /api/whatsapp/test
Content-Type: application/json

{
  "phoneNumber": "+919876543210",
  "message": "hello"
}

Response: Plain text response (what would be sent to WhatsApp)
```

---

## Configuration

### application.properties
```properties
# Twilio Configuration
twilio.enabled=true
twilio.account.sid=${TWILIO_ACCOUNT_SID}
twilio.auth.token=${TWILIO_AUTH_TOKEN}
twilio.whatsapp.number=whatsapp:+14155238886

# Gemini AI (for intent understanding)
gemini.api.key=${API_SECRET_KEY}
```

### Environment Variables
```bash
TWILIO_ENABLED=true
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
API_SECRET_KEY=your_gemini_api_key
```

---

## Session Management

### Current Implementation (In-Memory)
```java
// 30-minute session timeout
private static final Duration SESSION_TIMEOUT = Duration.ofMinutes(30);

// ConcurrentHashMap for thread-safety
private final Map<String, ConversationSession> sessions = new ConcurrentHashMap<>();
```

### Session Data Stored
- Phone number (key)
- User ID (after registration)
- User name
- Current state
- Partial complaint data
- Message history (last 20 messages)
- Session expiry time

---

## AI Integration

### Gemini 2.0 Flash
- Used for understanding user intent
- Classifies complaints into categories
- Extracts relevant information from natural language

### Fallback Rules
If Gemini API fails, rule-based processing kicks in:
- Keyword matching for complaint types
- Pattern matching for location requests
- Simple state machine for conversation flow

---

## Database Schema

### Users Table (argus_users)
```sql
- user_id (PK)
- name
- mobile (unique)
- user_type (CITIZEN)
- created_at
```

### Complaints Table
```sql
- complaint_id (PK)
- title
- description
- location
- status (FILED, ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED)
- priority (LOW, MEDIUM, HIGH, CRITICAL)
- citizen_id (FK → users)
- category_id (FK → categories)
- department_id (FK → departments)
- sla_deadline
- created_time
```

---

## Error Handling

| Error | Handling |
|-------|----------|
| Twilio not configured | WhatsApp features disabled, logged warning |
| Gemini API failure | Falls back to rule-based processing |
| Database error | Returns user-friendly error message |
| Session expired | Creates new session automatically |
| Invalid input | Prompts user to try again |

---

## Testing

### Local Testing (Without Twilio)
```bash
curl -X POST http://localhost:8080/api/whatsapp/test \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210", "message": "hello"}'
```

### With ngrok + Twilio Sandbox
1. Start ngrok: `ngrok http 8080`
2. Configure webhook in Twilio: `https://xxx.ngrok.io/api/whatsapp/webhook`
3. Join sandbox from WhatsApp
4. Send messages!

---

## Logging

Key log points:
```
INFO  - Received WhatsApp message from: +91... | Body: ...
INFO  - Processing message from +91...: ...
INFO  - Session state: IDLE -> COLLECTING_AWAITING_LOCATION
INFO  - Complaint created: GRV-2026-00042
ERROR - Failed to create complaint: ...
ERROR - Gemini API error: ...
```

---

## Security Considerations

1. **Phone Number Masking**: Displayed as +91****543210
2. **No Password for WhatsApp Users**: Phone number is the identity
3. **Session Expiry**: 30 minutes of inactivity
4. **Twilio Signature Validation**: (Recommended for production)

---

## Limitations

1. **In-Memory Sessions**: Lost on server restart
2. **Single Server**: No session sharing across instances
3. **Free Tier ngrok**: URL changes on restart
4. **Sandbox**: Only 3 days before re-join needed
5. **Media**: Images/videos not processed yet

---

## File Structure

```
springapp/src/main/java/com/backend/springapp/
├── whatsapp/
│   ├── config/
│   │   └── TwilioConfig.java          # Twilio SDK initialization
│   ├── controller/
│   │   └── WhatsAppWebhookController.java  # Webhook endpoint
│   ├── model/
│   │   ├── ConversationSession.java   # Session with history
│   │   ├── SessionState.java          # State enum
│   │   └── WhatsAppMessage.java       # Incoming message model
│   └── service/
│       ├── SessionManager.java        # Session storage
│       ├── TwilioService.java         # Send messages
│       ├── WhatsAppAgentService.java  # Main AI agent
│       └── WhatsAppTools.java         # DB operations
```

---

# 🚀 Enhancement Roadmap

## Phase 1: Production Ready (Priority: HIGH)

### 1. Redis Session Storage
Replace in-memory sessions with Redis for:
- Persistence across restarts
- Horizontal scaling
- Session sharing across servers

```java
// Example
@Service
public class RedisSessionManager {
    @Autowired
    private RedisTemplate<String, ConversationSession> redisTemplate;
    
    public void saveSession(ConversationSession session) {
        redisTemplate.opsForValue().set(
            "wa:session:" + session.getPhoneNumber(),
            session,
            Duration.ofMinutes(30)
        );
    }
}
```

### 2. Twilio Signature Validation
Verify incoming webhooks are from Twilio:

```java
@PostMapping("/webhook")
public ResponseEntity<String> handleMessage(
    @RequestHeader("X-Twilio-Signature") String signature,
    HttpServletRequest request) {
    
    if (!twilioService.validateSignature(signature, request)) {
        return ResponseEntity.status(403).build();
    }
    // ... process message
}
```

### 3. Message Queue (Async Processing)
Use RabbitMQ/Kafka for:
- Handling high load
- Retry failed messages
- Better reliability

```
WhatsApp → Twilio → Webhook → Queue → Worker → Response
```

### 4. Rate Limiting
Prevent abuse:
```java
@RateLimiter(name = "whatsapp", fallbackMethod = "rateLimitFallback")
public String processMessage(WhatsAppMessage message) {
    // ...
}
```

---

## Phase 2: Enhanced AI (Priority: HIGH)

### 1. True Function Calling (Agentic AI)
Use Gemini's function calling for autonomous decisions:

```java
// Define tools for AI
List<Tool> tools = List.of(
    new Tool("create_complaint", "Create a new complaint", params),
    new Tool("check_status", "Check complaint status", params),
    new Tool("get_department_info", "Get department contact info", params),
    new Tool("escalate_complaint", "Escalate to supervisor", params)
);

// AI decides which tool to call
GeminiResponse response = gemini.generateWithTools(prompt, tools);
if (response.hasFunctionCall()) {
    String toolName = response.getFunctionCall().getName();
    // Execute the tool
}
```

### 2. Multi-Language Support
Detect language and respond accordingly:

```java
String language = detectLanguage(userMessage); // "hi", "ta", "te", etc.
String prompt = getLocalizedPrompt(language);
String response = generateResponse(prompt);
return translateIfNeeded(response, language);
```

Supported languages for India:
- Hindi (हिंदी)
- Tamil (தமிழ்)
- Telugu (తెలుగు)
- Kannada (ಕನ್ನಡ)
- Malayalam (മലയാളം)
- Bengali (বাংলা)
- Marathi (मराठी)

### 3. Image Processing
Accept photos of issues:

```java
if (message.hasMedia() && message.isImage()) {
    String imageUrl = message.getMediaUrl0();
    
    // Send to Gemini Vision
    String analysis = geminiVision.analyzeImage(imageUrl, 
        "Describe this civic issue. What category does it belong to?");
    
    // Auto-fill complaint details
    partial.setDescription(analysis);
    partial.setImageUrl(imageUrl);
}
```

### 4. Voice Message Support
Transcribe and process voice messages:

```java
if (message.hasMedia() && message.isAudio()) {
    String audioUrl = message.getMediaUrl0();
    String transcription = speechToText.transcribe(audioUrl);
    
    // Process as text
    return processTextMessage(session, transcription);
}
```

---

## Phase 3: Smart Features (Priority: MEDIUM)

### 1. Proactive Notifications
Send updates when complaint status changes:

```java
@EventListener
public void onComplaintStatusChanged(ComplaintStatusEvent event) {
    Complaint complaint = event.getComplaint();
    String phone = complaint.getCitizen().getMobile();
    
    String message = String.format(
        "📢 Update on %s\n\nStatus: %s → %s\n\n%s",
        complaint.getDisplayId(),
        event.getOldStatus(),
        event.getNewStatus(),
        event.getRemarks()
    );
    
    twilioService.sendMessage(phone, message);
}
```

### 2. Smart Follow-ups
Automated reminders:

```java
@Scheduled(cron = "0 0 10 * * ?") // Daily at 10 AM
public void sendPendingReminders() {
    List<Complaint> pending = complaintRepo.findPendingOver48Hours();
    
    for (Complaint c : pending) {
        String message = String.format(
            "⏰ Reminder: Your complaint %s is still pending.\n" +
            "We're working on it. Expected resolution: %s",
            c.getDisplayId(),
            c.getSlaDeadline()
        );
        twilioService.sendMessage(c.getCitizen().getMobile(), message);
    }
}
```

### 3. Satisfaction Survey
After complaint resolution:

```java
public void sendSatisfactionSurvey(Complaint complaint) {
    String message = """
        📊 Quick Survey for %s
        
        How satisfied are you with the resolution?
        
        1️⃣ Very Satisfied
        2️⃣ Satisfied
        3️⃣ Neutral
        4️⃣ Dissatisfied
        5️⃣ Very Dissatisfied
        
        Reply with a number (1-5)
        """.formatted(complaint.getDisplayId());
    
    twilioService.sendMessage(complaint.getCitizen().getMobile(), message);
}
```

### 4. Location Intelligence
Use Google Maps API for:
- Address autocomplete
- Ward/zone detection
- Nearby complaints deduplication

```java
public void enrichLocation(PartialComplaint partial) {
    if (partial.hasCoordinates()) {
        // Reverse geocode
        Address address = mapsService.reverseGeocode(
            partial.getLatitude(), 
            partial.getLongitude()
        );
        
        partial.setFormattedAddress(address.getFormatted());
        partial.setWard(address.getWard());
        partial.setZone(address.getZone());
        
        // Check for duplicates nearby
        List<Complaint> nearby = complaintRepo.findNearby(
            partial.getLatitude(),
            partial.getLongitude(),
            100 // meters
        );
        
        if (!nearby.isEmpty()) {
            // Suggest existing complaint
        }
    }
}
```

---

## Phase 4: Scale & Analytics (Priority: MEDIUM)

### 1. Metrics & Monitoring
```java
@Timed(name = "whatsapp.message.processing")
public String processMessage(WhatsAppMessage message) {
    meterRegistry.counter("whatsapp.messages.received").increment();
    // ...
}
```

Dashboard metrics:
- Messages per hour
- Average response time
- Complaints filed via WhatsApp
- User satisfaction scores
- Session duration

### 2. A/B Testing for Prompts
Test different conversation styles:

```java
String variant = abTestService.getVariant(phoneNumber, "greeting");
String greeting = switch (variant) {
    case "A" -> "👋 Hi! How can I help?";
    case "B" -> "🙏 Namaste! What issue can I help resolve?";
    default -> "Hello! Describe your problem.";
};
```

### 3. Conversation Analytics
Store and analyze conversations:

```java
@Entity
public class ConversationLog {
    private Long id;
    private String phoneNumber;
    private String userMessage;
    private String botResponse;
    private SessionState stateAtMessage;
    private Long responseTimeMs;
    private Boolean complaintCreated;
    private LocalDateTime timestamp;
}
```

---

## Phase 5: Integration (Priority: LOW)

### 1. CRM Integration
Sync with existing municipal CRM:

```java
public void syncToCRM(Complaint complaint) {
    crmClient.createTicket(CRMTicket.builder()
        .externalId(complaint.getDisplayId())
        .channel("WHATSAPP")
        .citizenPhone(complaint.getCitizen().getMobile())
        .description(complaint.getDescription())
        .build());
}
```

### 2. Payment Integration
For paid services (birth certificates, etc.):

```java
// Send payment link via WhatsApp
String paymentLink = razorpayService.createPaymentLink(
    amount, 
    "Birth Certificate Request"
);

twilioService.sendMessage(phone, 
    "💳 Please complete payment: " + paymentLink);
```

### 3. Document Upload
Accept and process documents:

```java
if (message.isPdf() || message.isDocument()) {
    String docUrl = message.getMediaUrl0();
    Document doc = documentService.store(docUrl, citizenId);
    
    // OCR if needed
    String extractedText = ocrService.extract(doc);
}
```

---

## Quick Wins (Can Do Now)

| Enhancement | Effort | Impact |
|-------------|--------|--------|
| Add emojis to responses | Low | Medium |
| Support "hi", "hey", "namaste" greetings | Low | Medium |
| Add complaint category in confirmation | Low | High |
| Send follow-up after 24 hours | Medium | High |
| Add "track" command for single complaint | Low | Medium |
| Support editing complaint before confirm | Medium | Medium |

---

## Recommended Next Steps

1. **Immediate**: Add Redis for session storage
2. **This Week**: Implement Twilio signature validation
3. **This Month**: Add image processing with Gemini Vision
4. **Next Month**: Multi-language support (Hindi first)
5. **Quarter**: Full agentic AI with function calling

---

## Resources

- [Twilio WhatsApp API Docs](https://www.twilio.com/docs/whatsapp)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Spring Boot Reference](https://docs.spring.io/spring-boot/docs/current/reference/html/)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)

---

*Last Updated: January 20, 2026*
*Version: 1.0.0*
