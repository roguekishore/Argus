# AI Integration Guide for Complaint Classification

## Overview

The AI agent receives complaint text and must:
1. **Classify** into an existing category (NEVER create new ones)
2. **Determine priority** (can upgrade from base, rarely downgrade)
3. **Provide reasoning** for transparency

---

## Sample Prompt Template

```
You are a Grievance Classification AI for a Municipal Corporation.

## Your Task
Analyze the citizen complaint and return a JSON response.

## Available Categories (ONLY use these)
{categories_from_database}

## Priority Levels
- LOW: Minor inconvenience, no safety risk
- MEDIUM: Moderate issue, affects daily life
- HIGH: Significant impact, potential safety concern
- CRITICAL: Immediate danger, life-threatening, or affects vulnerable populations

## Priority Upgrade Rules
- Near HOSPITAL/SCHOOL/ELDERLY_HOME → upgrade by 1 level
- Involves CHILDREN/ELDERLY/DISABLED → upgrade by 1 level  
- Weather makes it dangerous (rain + electrical, flooding + drainage) → upgrade to CRITICAL
- Multiple people affected → upgrade by 1 level
- Already CRITICAL → stays CRITICAL (max level)

## Response Format (JSON only)
{
  "categoryName": "EXACT_CATEGORY_NAME",
  "priority": "LOW|MEDIUM|HIGH|CRITICAL",
  "reasoning": "Brief explanation of classification and priority decision",
  "confidence": 0.0-1.0,
  "suggestedNewCategory": null or "CATEGORY_NAME if none of the existing categories fit well"
}

## Important Rules
1. ALWAYS pick from available categories - use "OTHER" if truly unsure
2. If suggesting a new category, still classify current complaint to best existing match
3. Reasoning must be concise (under 200 chars)
4. Be conservative with CRITICAL - reserve for genuine emergencies

## Citizen Complaint
"{complaint_text}"

## Additional Context
- Location: {location}
- Current Weather: {weather_condition}
- Time of Day: {time}
- Citizen History: {previous_complaints_count} previous complaints
```

---

## Example Interactions

### Example 1: Simple Pothole
**Input:**
```
Complaint: "There is a big pothole on MG Road near the bus stop"
Location: "MG Road, Sector 5"
Weather: "Clear"
```

**AI Response:**
```json
{
  "categoryName": "POTHOLE",
  "priority": "MEDIUM",
  "reasoning": "Standard pothole complaint. Near bus stop affects commuters but no immediate safety risk.",
  "confidence": 0.95,
  "suggestedNewCategory": null
}
```

### Example 2: Priority Upgrade (Hospital)
**Input:**
```
Complaint: "Huge pothole right at the entrance of City Hospital, ambulances are struggling"
Location: "City Hospital Main Gate"
Weather: "Clear"
```

**AI Response:**
```json
{
  "categoryName": "POTHOLE",
  "priority": "HIGH",
  "reasoning": "Hospital entrance + affects ambulances = upgraded from MEDIUM to HIGH. Emergency access impacted.",
  "confidence": 0.98,
  "suggestedNewCategory": null
}
```

### Example 3: Weather Context (CRITICAL)
**Input:**
```
Complaint: "Electric wire fallen on the road, sparking badly. It's raining heavily."
Location: "Main Street, near Government School"
Weather: "Heavy Rain"
```

**AI Response:**
```json
{
  "categoryName": "ELECTRICAL_DAMAGE",
  "priority": "CRITICAL",
  "reasoning": "Sparking wire + rain + near school = extreme electrocution risk. Base was CRITICAL, confirmed.",
  "confidence": 0.99,
  "suggestedNewCategory": null
}
```

### Example 4: Unknown Category (Uses OTHER + Suggests)
**Input:**
```
Complaint: "Pack of stray dogs attacked my child near the playground"
Location: "Nehru Park, Sector 12"
Weather: "Clear"
```

**AI Response:**
```json
{
  "categoryName": "OTHER",
  "priority": "HIGH",
  "reasoning": "Stray animal attack on child = safety issue. No exact category match. Routed to ADMIN for triage.",
  "confidence": 0.75,
  "suggestedNewCategory": "STRAY_ANIMALS"
}
```
*Admin later reviews and may create STRAY_ANIMALS category + SLA config*

---

## Backend Flow (Java Service)

```java
@Service
public class ComplaintClassificationService {
    
    @Autowired
    private CategoryRepository categoryRepository;
    
    @Autowired
    private SLARepository slaRepository;
    
    @Autowired
    private AIClient aiClient;  // Your AI integration (OpenAI, Gemini, etc.)
    
    public Complaint classifyAndCreateComplaint(String complaintText, String location, Long citizenId) {
        
        // 1. Get all active categories for AI prompt
        List<Category> categories = categoryRepository.findByIsActiveTrue();
        String categoriesJson = buildCategoriesContext(categories);
        
        // 2. Build prompt and call AI
        String prompt = buildPrompt(complaintText, location, categoriesJson);
        AIResponse response = aiClient.classify(prompt);
        
        // 3. Validate AI response - category MUST exist
        Category category = categoryRepository.findByName(response.getCategoryName())
            .orElseGet(() -> categoryRepository.findByName("OTHER").orElseThrow());
        
        // 4. Look up SLA config for this category
        SLA slaConfig = slaRepository.findByCategory(category)
            .orElseThrow(() -> new RuntimeException("No SLA config for category: " + category.getName()));
        
        // 5. Create complaint with AI decisions
        Complaint complaint = new Complaint();
        complaint.setDescription(complaintText);
        complaint.setLocation(location);
        complaint.setCitizenId(citizenId);
        complaint.setCategoryId(category.getId());
        complaint.setDepartmentId(slaConfig.getDepartment().getId());
        complaint.setPriority(Priority.valueOf(response.getPriority()));
        complaint.setSlaDeadline(LocalDateTime.now().plusDays(slaConfig.getSlaDays()));
        complaint.setAiReasoning(response.getReasoning());
        complaint.setStatus(ComplaintStatus.FILED);
        complaint.setEscalationLevel(0);
        
        // 6. Log if AI suggested new category (for admin review)
        if (response.getSuggestedNewCategory() != null) {
            logCategorySuggestion(response.getSuggestedNewCategory(), complaintText);
        }
        
        return complaintRepository.save(complaint);
    }
}
```

---

## Key Points

1. **AI NEVER creates categories** - only suggests for admin review
2. **SLA Config is looked up**, not created per complaint
3. **Priority is stored on Complaint**, can differ from base priority
4. **aiReasoning provides transparency** for auditing and citizen queries
5. **Confidence score** helps identify complaints needing human review (< 0.8)
