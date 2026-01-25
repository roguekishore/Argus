# WhatsApp Integration Guide - Agentic Grievance System

## Overview

This document outlines the architecture and implementation for WhatsApp-based grievance registration using conversational AI.

## Table of Contents
1. [Twilio Setup](#1-twilio-setup)
2. [Session Management](#2-session-management)
3. [Conversation Flow Design](#3-conversation-flow-design)
4. [Code Architecture](#4-code-architecture)
5. [AI Agent with Tools](#5-ai-agent-with-tools)

---

## 1. Twilio Setup

### Step 1: Create Twilio Account
1. Go to https://www.twilio.com/try-twilio
2. Sign up with email (free trial gives $15 credit)
3. Verify your phone number

### Step 2: Access WhatsApp Sandbox
1. Go to **Console** → **Messaging** → **Try it out** → **Send a WhatsApp message**
2. You'll see a sandbox number like: `+14155238886`
3. Note the **join code** (e.g., "join hungry-cat")

### Step 3: Connect Your Phone to Sandbox
1. Save Twilio sandbox number in your contacts
2. Send WhatsApp message: `join hungry-cat` (your specific code)
3. You'll receive confirmation: "You're connected to the sandbox!"

### Step 4: Get API Credentials
1. Go to **Console** → **Account** → **API keys & tokens**
2. Note down:
   - Account SID: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Auth Token: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 5: Configure Webhook
1. Go to **Console** → **Messaging** → **Settings** → **WhatsApp Sandbox Settings**
2. Set webhook URL:
   - **When a message comes in**: `https://your-domain.com/api/whatsapp/webhook`
   - Method: `POST`
3. For local development, use **ngrok**:
   ```bash
   ngrok http 8080
   ```
   Then use: `https://abc123.ngrok.io/api/whatsapp/webhook`

### Step 6: Add Dependencies to pom.xml
```xml
<!-- Twilio SDK -->
<dependency>
    <groupId>com.twilio.sdk</groupId>
    <artifactId>twilio</artifactId>
    <version>10.9.2</version>
</dependency>

<!-- Redis for session management (optional, can use DB) -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

### Step 7: Add to application.properties
```properties
# Twilio Configuration
twilio.account.sid=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
twilio.auth.token=your_auth_token_here
twilio.whatsapp.number=whatsapp:+14155238886

# Redis for sessions (optional)
spring.redis.host=localhost
spring.redis.port=6379
```

---

## 2. Session Management

### Why Sessions Are Needed

In web app:
- User fills form with ALL fields → Submit → Done

In WhatsApp:
- User: "pothole on my street"
- Bot: "Where exactly? Please share location or address"
- User: "near SBI bank"
- Bot: "Which area/sector?"
- User: "Sector 15"
- Bot: "Got it! Registering complaint about pothole near SBI bank, Sector 15..."

**The bot needs to remember**:
1. What information is collected
2. What's still missing
3. Conversation context
4. User identification

### Session States

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   IDLE      │────▶│  COLLECTING  │────▶│   CONFIRMING    │
│             │     │  COMPLAINT   │     │                 │
└─────────────┘     └──────────────┘     └─────────────────┘
      │                    │                      │
      │                    ▼                      ▼
      │           ┌──────────────┐        ┌─────────────┐
      │           │   CHECKING   │        │  SUBMITTED  │
      │           │   STATUS     │        │             │
      │           └──────────────┘        └─────────────┘
      │                    │
      ▼                    ▼
┌─────────────┐     ┌──────────────┐
│  ONBOARDING │     │   FEEDBACK   │
│  NEW USER   │     │   RATING     │
└─────────────┘     └──────────────┘
```

### Session Data Structure

```json
{
  "sessionId": "whatsapp:+919876543210",
  "phoneNumber": "+919876543210",
  "userId": 123,
  "isRegistered": true,
  "state": "COLLECTING_COMPLAINT",
  "subState": "AWAITING_LOCATION",
  "partialComplaint": {
    "title": "Pothole on road",
    "description": "Big pothole causing accidents",
    "location": null
  },
  "messageHistory": [
    {"role": "user", "content": "pothole on my street causing accidents"},
    {"role": "assistant", "content": "I understand there's a pothole issue. Could you please share the exact location?"}
  ],
  "createdAt": "2026-01-20T10:00:00",
  "lastActivity": "2026-01-20T10:05:00",
  "expiresAt": "2026-01-20T10:30:00"
}
```

### Session Timeout
- Active conversation: **30 minutes** timeout
- After timeout: Session cleared, start fresh
- User can say "start over" to reset anytime

---

## 3. Conversation Flow Design

### Flow 1: New User Onboarding

```
User: Hi
Bot: 👋 Welcome to Municipal Grievance Portal!
     
     I'm your AI assistant for reporting civic issues like:
     • Potholes & road damage
     • Street light problems  
     • Water supply issues
     • Garbage collection
     • Drainage problems
     
     I don't see your number registered. Let me help you get started!
     What's your name?

User: Rajesh Kumar

Bot: Nice to meet you, Rajesh! 
     Your number +91-98765-43210 is now registered.
     
     You can now:
     📝 Report a new complaint
     🔍 Check complaint status
     
     How can I help you today?
```

### Flow 2: Complaint Registration (Happy Path)

```
User: There's a big pothole near my house

Bot: I'll help you register this pothole complaint.
     
     📍 Where exactly is this pothole? 
     You can:
     • Share your live location 📍
     • Type the address/landmark

User: [Shares location pin]

Bot: Got it! Location: Near Sector 15, MG Road
     
     Can you describe the pothole? (size, how long it's been there, any accidents?)

User: It's a deep pothole, about 2 feet wide. My neighbor's scooter fell yesterday.

Bot: Thank you for the details.
     
     📋 **Complaint Summary**
     ━━━━━━━━━━━━━━━━━━
     🔹 Issue: Pothole
     🔹 Location: Sector 15, MG Road
     🔹 Description: Deep pothole, ~2 feet wide. Accident reported (scooter).
     
     🤖 AI Assessment:
     • Category: POTHOLE
     • Priority: HIGH (accident occurred)
     • Expected resolution: 2 days
     
     Should I submit this complaint? (Yes/No)

User: Yes

Bot: ✅ Complaint Registered Successfully!
     
     📋 Complaint ID: GRV-2026-00142
     📅 Filed: Jan 20, 2026
     🏢 Assigned to: Roads Department
     ⏰ Target Resolution: Jan 22, 2026
     
     You'll receive updates on this number.
     
     Is there anything else I can help with?
```

### Flow 3: Missing Information Loop

```
User: light not working

Bot: I'll help with this street light issue.
     
     📍 Where is this street light located?

User: near my house

Bot: Could you be more specific? Please share:
     • Your area/sector name
     • Nearby landmark (school, temple, shop)
     • Or share your live location 📍

User: Gandhi Nagar

Bot: Which part of Gandhi Nagar? Any landmark nearby?

User: Near Shiv Mandir, House No 45

Bot: Perfect! 
     
     📋 **Complaint Summary**
     ━━━━━━━━━━━━━━━━━━
     🔹 Issue: Street light not working
     🔹 Location: Gandhi Nagar, Near Shiv Mandir, House No 45
     
     Should I submit this complaint? (Yes/No)
```

### Flow 4: Check Status

```
User: Check my complaint status

Bot: 📋 Your Active Complaints:
     
     1️⃣ GRV-2026-00142 - Pothole
        Status: 🟡 IN PROGRESS
        Location: Sector 15, MG Road
        Assigned to: Ramesh (Roads Dept)
        Filed: Jan 18 | Due: Jan 20
     
     2️⃣ GRV-2026-00138 - Street Light
        Status: ✅ RESOLVED
        Location: Gandhi Nagar
        Resolved: Jan 19
        
     Reply with complaint number for details, or type "new" to file a new complaint.

User: 142

Bot: 📋 Complaint Details: GRV-2026-00142
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     
     🔹 Issue: Pothole - Deep pothole causing accidents
     📍 Location: Sector 15, MG Road
     📅 Filed: Jan 18, 2026
     
     📊 Status: IN PROGRESS
     👷 Assigned to: Ramesh Kumar (Roads Dept)
     📞 Contact: +91-98765-00001
     
     📝 Updates:
     • Jan 19: Complaint assigned to field staff
     • Jan 19: Site inspection completed
     • Jan 20: Repair materials ordered
     
     ⏰ Expected completion: Jan 21, 2026
     
     Reply "escalate" if this needs urgent attention.
```

### Flow 5: Vague/Unclear Messages

```
User: problem

Bot: I'd like to help! Could you tell me more about the problem?
     
     Common issues I can help with:
     • 🕳️ Pothole/Road damage
     • 💡 Street light
     • 🚰 Water supply
     • 🗑️ Garbage
     • 🚽 Drainage/Sewer
     
     What issue are you facing?

User: aslkfjasf

Bot: I didn't quite understand that. 😅
     
     Could you describe your problem in simple words?
     For example: "pothole on my street" or "no water since morning"

User: ok leave it

Bot: No problem! Feel free to reach out anytime.
     
     Just send a message when you need to:
     📝 Report an issue
     🔍 Check complaint status
     
     Have a good day! 🙏
```

### Flow 6: Hindi/Mixed Language

```
User: Bijli ka taar gir gaya hai sadak pe

Bot: ⚠️ यह एक गंभीर समस्या है!
     
     मैं समझ गया - बिजली का तार सड़क पर गिर गया है।
     
     📍 कृपया सटीक स्थान बताएं:
     • अपना लोकेशन शेयर करें 📍
     • या पता/लैंडमार्क लिखें

User: Sector 12 market ke paas

Bot: 📋 शिकायत सारांश:
     ━━━━━━━━━━━━━━
     🔹 समस्या: गिरा हुआ बिजली का तार
     📍 स्थान: Sector 12, मार्केट के पास
     
     🚨 प्राथमिकता: CRITICAL (जानलेवा खतरा)
     ⏰ अपेक्षित समाधान: 4 घंटे
     
     क्या मैं यह शिकायत दर्ज करूं? (हाँ/नहीं)
```

---

## 4. Code Architecture

### Package Structure

```
com.backend.springapp
├── whatsapp/
│   ├── controller/
│   │   └── WhatsAppWebhookController.java
│   ├── service/
│   │   ├── WhatsAppAgentService.java      # Main AI agent
│   │   ├── TwilioService.java             # Send messages
│   │   ├── SessionManager.java            # Conversation state
│   │   └── WhatsAppTools.java             # Tools for AI
│   ├── model/
│   │   ├── ConversationSession.java
│   │   ├── WhatsAppMessage.java
│   │   └── SessionState.java (enum)
│   └── config/
│       └── TwilioConfig.java
```

### Key Components

1. **WhatsAppWebhookController**: Receives Twilio webhook
2. **SessionManager**: Manages conversation state (Redis/DB)
3. **WhatsAppAgentService**: AI with function calling
4. **TwilioService**: Sends responses back
5. **WhatsAppTools**: Functions AI can call

---

## 5. AI Agent with Tools

### Why This is "Agentic"

**Current Web AI** (One-shot):
```
Input: complaint text
Output: {category, priority, slaDays}
Done.
```

**WhatsApp AI** (Agentic):
```
Loop:
  1. Receive user message
  2. Check session state
  3. AI decides: 
     - Need more info? → Ask user
     - Ready to submit? → Call createComplaint tool
     - User asking status? → Call checkStatus tool
  4. Send response
  5. Update session
  6. Repeat until conversation ends
```

### Tools Available to AI

```java
// Tool 1: Create Complaint
@Tool("Creates a new complaint after all information is collected")
ComplaintResponse createComplaint(
    String title,
    String description, 
    String location,
    String phoneNumber
);

// Tool 2: Check Complaint Status
@Tool("Checks status of a specific complaint")
ComplaintStatus checkComplaintStatus(
    String complaintId,
    String phoneNumber
);

// Tool 3: List User Complaints  
@Tool("Lists all complaints filed by a user")
List<ComplaintSummary> listUserComplaints(String phoneNumber);

// Tool 4: Register User
@Tool("Registers a new user with name and phone")
UserInfo registerUser(String name, String phoneNumber);

// Tool 5: Get User Info
@Tool("Gets user details by phone number")
UserInfo getUserByPhone(String phoneNumber);

// Tool 6: Provide Feedback
@Tool("Records user rating for resolved complaint")
void provideRating(String complaintId, int rating, String feedback);
```

### AI System Prompt for WhatsApp Agent

```
You are a helpful AI assistant for a Municipal Grievance Redressal System, 
communicating via WhatsApp.

YOUR CAPABILITIES:
1. Register new citizens using their phone number and name
2. Help citizens file complaints about civic issues
3. Check status of existing complaints
4. Collect ratings/feedback for resolved complaints

CONVERSATION RULES:
1. Be friendly, concise, and helpful
2. Use emojis sparingly for better readability
3. Support both English and Hindi
4. If information is missing, ask for it ONE THING AT A TIME
5. Always confirm before submitting a complaint
6. For emergencies (electric wire, gas leak), mark as CRITICAL priority

AVAILABLE TOOLS:
- createComplaint: Use when ALL required info is collected
- checkComplaintStatus: When user asks about existing complaint
- listUserComplaints: When user wants to see all their complaints
- registerUser: For first-time users
- getUserByPhone: To check if user is registered

COMPLAINT CATEGORIES:
- POTHOLE: Road damage, potholes, craters
- STREETLIGHT: Street lights, lamp posts
- WATER_SHORTAGE: No water, low pressure
- SEWER_DRAINAGE: Blocked drains, sewage overflow
- GARBAGE: Uncollected garbage, dumping
- TRAFFIC_SIGNALS: Traffic light issues
- PARK_MAINTENANCE: Parks, trees, public spaces
- ELECTRICAL_DAMAGE: Fallen wires, transformer issues
- OTHER: Anything not matching above

PRIORITY UPGRADE TRIGGERS:
- Location near hospital/school/elderly home → Upgrade priority
- Safety hazard (sparking wire, open manhole) → CRITICAL
- Vulnerable population affected → Upgrade priority

INFORMATION REQUIRED FOR COMPLAINT:
1. What is the problem (will become title + description)
2. Where exactly (location - address or coordinates)

RESPONSE FORMAT:
- Keep messages short (WhatsApp limits: 1600 chars)
- Use bullet points and line breaks
- Include emojis for visual clarity
- For complaint summary, use a structured format
```

---

## Next Steps

1. Add Twilio dependency to pom.xml
2. Create WhatsApp package structure
3. Implement webhook controller
4. Create session management
5. Build AI agent with tools
6. Test with Twilio sandbox
7. Setup ngrok for local testing

---

## Testing Checklist

- [ ] New user registration flow
- [ ] Returning user recognition  
- [ ] Complete complaint registration
- [ ] Missing location handling
- [ ] Missing description handling
- [ ] Complaint status check
- [ ] Hindi language handling
- [ ] Mixed language (Hinglish)
- [ ] Vague message handling
- [ ] Session timeout handling
- [ ] Emergency priority detection
- [ ] Confirmation before submit
- [ ] Multiple complaints check
- [ ] Rating/feedback flow
