  package com.backend.springapp.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.backend.springapp.model.Complaint;
import com.backend.springapp.service.AIService;
import com.backend.springapp.service.AIService.AIDecision;

import java.util.List;
import java.util.Map;

/**
 * Test controller for AI classification
 * Use this to test AI responses without creating actual complaints
 */
@RestController
@RequestMapping("/api/ai")
public class AITestController {

    @Autowired
    private AIService aiService;

    /**
     * Test AI classification with a sample complaint
     * POST /api/ai/test
     * Body: { "title": "...", "description": "...", "location": "..." }
     */
    @PostMapping("/test")
    public ResponseEntity<AIDecision> testClassification(@RequestBody Complaint testComplaint) {
        AIDecision decision = aiService.analyzeComplaint(testComplaint);
        return ResponseEntity.ok(decision);
    }

    /**
     * Test AI with predefined scenarios - COMPREHENSIVE SUITE
     * GET /api/ai/test/scenarios
     */
    @GetMapping("/test/scenarios")
    public ResponseEntity<Map<String, Object>> testScenarios() {
        Map<String, List<Map<String, String>>> scenarioGroups = getScenarioGroups();

        List<Map<String, Object>> allResults = new java.util.ArrayList<>();
        Map<String, Object> summary = new java.util.LinkedHashMap<>();
        
        for (Map.Entry<String, List<Map<String, String>>> group : scenarioGroups.entrySet()) {
            String groupName = group.getKey();
            List<Map<String, Object>> groupResults = new java.util.ArrayList<>();
            
            for (Map<String, String> scenario : group.getValue()) {
                Complaint complaint = new Complaint();
                complaint.setTitle(scenario.get("title"));
                complaint.setDescription(scenario.get("description"));
                complaint.setLocation(scenario.get("location"));
                
                AIDecision decision = aiService.analyzeComplaint(complaint);
                
                groupResults.add(Map.of(
                    "input", Map.of(
                        "title", scenario.get("title"),
                        "description", scenario.get("description"),
                        "location", scenario.get("location")
                    ),
                    "expected", scenario.get("expected"),
                    "aiDecision", Map.of(
                        "categoryName", decision.categoryName,
                        "priority", decision.priority,
                        "slaDays", decision.slaDays,
                        "reasoning", decision.reasoning,
                        "confidence", decision.confidence
                    )
                ));
            }
            
            allResults.add(Map.of(
                "testGroup", groupName,
                "description", getGroupDescription(groupName),
                "scenarioCount", groupResults.size(),
                "results", groupResults
            ));
        }
        
        int totalScenarios = scenarioGroups.values().stream().mapToInt(List::size).sum();
        summary.put("totalTestGroups", scenarioGroups.size());
        summary.put("totalScenarios", totalScenarios);
        summary.put("testGroups", allResults);
        
        return ResponseEntity.ok(summary);
    }

    /**
     * Run a specific test group only
     * GET /api/ai/test/scenarios/{groupName}
     */
    @GetMapping("/test/scenarios/{groupName}")
    public ResponseEntity<?> testSpecificGroup(@PathVariable String groupName) {
        Map<String, List<Map<String, String>>> scenarioGroups = getScenarioGroups();
        
        if (!scenarioGroups.containsKey(groupName.toUpperCase())) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Unknown test group: " + groupName,
                "availableGroups", scenarioGroups.keySet()
            ));
        }
        
        List<Map<String, String>> scenarios = scenarioGroups.get(groupName.toUpperCase());
        List<Map<String, Object>> results = new java.util.ArrayList<>();
        
        for (Map<String, String> scenario : scenarios) {
            Complaint complaint = new Complaint();
            complaint.setTitle(scenario.get("title"));
            complaint.setDescription(scenario.get("description"));
            complaint.setLocation(scenario.get("location"));
            
            AIDecision decision = aiService.analyzeComplaint(complaint);
            
            results.add(Map.of(
                "input", Map.of(
                    "title", scenario.get("title"),
                    "description", scenario.get("description"),
                    "location", scenario.get("location")
                ),
                "expected", scenario.get("expected"),
                "aiDecision", Map.of(
                    "categoryName", decision.categoryName,
                    "priority", decision.priority,
                    "slaDays", decision.slaDays,
                    "reasoning", decision.reasoning,
                    "confidence", decision.confidence
                )
            ));
        }
        
        return ResponseEntity.ok(Map.of(
            "testGroup", groupName.toUpperCase(),
            "description", getGroupDescription(groupName.toUpperCase()),
            "scenarioCount", results.size(),
            "results", results
        ));
    }

    /**
     * List available test groups
     * GET /api/ai/test/groups
     */
    @GetMapping("/test/groups")
    public ResponseEntity<Map<String, Object>> listTestGroups() {
        Map<String, List<Map<String, String>>> groups = getScenarioGroups();
        Map<String, Object> response = new java.util.LinkedHashMap<>();
        
        response.put("totalGroups", groups.size());
        response.put("groups", groups.entrySet().stream()
            .map(e -> Map.of(
                "name", e.getKey(),
                "scenarioCount", e.getValue().size(),
                "description", getGroupDescription(e.getKey())
            ))
            .toList()
        );
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * All test scenario groups - organized by AI intelligence aspect being tested
     */
    private Map<String, List<Map<String, String>>> getScenarioGroups() {
        return Map.ofEntries(
            
            // ============== 1. BASIC CATEGORIZATION ==============
            // Tests if AI correctly identifies the right category from clear descriptions
            Map.entry("BASIC_CATEGORIZATION", List.of(
                Map.of("title", "Pothole on road", 
                       "description", "Big pothole on the main road causing problems for vehicles", 
                       "location", "MG Road Sector 5", 
                       "expected", "POTHOLE - MEDIUM priority, 3 days SLA"),
                Map.of("title", "Street light not working", 
                       "description", "The street light near my house has been off for a week", 
                       "location", "Nehru Nagar House 45", 
                       "expected", "STREETLIGHT - MEDIUM priority, 2 days SLA"),
                Map.of("title", "Garbage not collected", 
                       "description", "Garbage has not been collected for 3 days, starting to smell", 
                       "location", "Residential Colony Block A", 
                       "expected", "GARBAGE - LOW/MEDIUM priority, 1 day SLA"),
                Map.of("title", "No water supply", 
                       "description", "Water not coming since morning, need for cooking and cleaning", 
                       "location", "Gandhi Nagar", 
                       "expected", "WATER_SHORTAGE - MEDIUM priority, 1 day SLA"),
                Map.of("title", "Blocked drain overflowing", 
                       "description", "The drain near my house is completely blocked and overflowing", 
                       "location", "Industrial Area Road 5", 
                       "expected", "SEWER_DRAINAGE - MEDIUM priority, 2 days SLA"),
                Map.of("title", "Traffic signal not working", 
                       "description", "Traffic light at the junction has stopped working", 
                       "location", "Main Chowk Intersection", 
                       "expected", "TRAFFIC_SIGNALS - HIGH priority, 1 day SLA"),
                Map.of("title", "Park grass overgrown", 
                       "description", "The park grass has not been cut in months, looks neglected", 
                       "location", "Central Park Sector 8", 
                       "expected", "PARK_MAINTENANCE - LOW priority, 7 days SLA")
            )),
            
            // ============== 2. SAFETY HAZARD DETECTION ==============
            // Tests if AI correctly upgrades priority for immediately dangerous situations
            Map.entry("SAFETY_HAZARD_UPGRADE", List.of(
                Map.of("title", "Live wire fallen on road", 
                       "description", "Electric wire has fallen on the road and is sparking continuously, people are gathering around looking at it", 
                       "location", "Main Market Road", 
                       "expected", "ELECTRICAL_DAMAGE - CRITICAL (immediate electrocution danger)"),
                Map.of("title", "Transformer exploded", 
                       "description", "Transformer caught fire and exploded, smoke everywhere, could spread", 
                       "location", "Substation near Colony", 
                       "expected", "ELECTRICAL_DAMAGE - CRITICAL (fire hazard)"),
                Map.of("title", "Deep open manhole", 
                       "description", "Manhole cover missing on busy road, deep hole open, a child almost fell in yesterday", 
                       "location", "School Road Sector 12", 
                       "expected", "SEWER_DRAINAGE - CRITICAL (fall hazard, near school)"),
                Map.of("title", "Gas leak smell strong", 
                       "description", "Very strong gas smell coming from underground pipe, people feeling dizzy", 
                       "location", "Commercial Complex", 
                       "expected", "OTHER - CRITICAL (potential explosion hazard)"),
                Map.of("title", "Tree about to fall on house", 
                       "description", "Large tree tilting 45 degrees towards my neighbor's house, roots exposed, could fall anytime", 
                       "location", "Residential Area Lane 3", 
                       "expected", "PARK_MAINTENANCE - CRITICAL (imminent structural damage)"),
                Map.of("title", "Sinkhole forming on road", 
                       "description", "Road is sinking and cracking, hole getting bigger every day, vehicles avoiding it", 
                       "location", "Highway Service Road", 
                       "expected", "POTHOLE - CRITICAL (structural failure)"),
                Map.of("title", "Sewage overflow into street", 
                       "description", "Raw sewage overflowing onto main street, health hazard, children playing nearby", 
                       "location", "Slum Area Block C", 
                       "expected", "SEWER_DRAINAGE - CRITICAL (public health emergency)")
            )),
            
            // ============== 3. SENSITIVE LOCATION DETECTION ==============
            // Tests if AI upgrades priority for hospitals, schools, elderly homes, etc.
            Map.entry("SENSITIVE_LOCATION_UPGRADE", List.of(
                Map.of("title", "Pothole at hospital emergency gate", 
                       "description", "Large pothole right at hospital emergency entrance, ambulances getting stuck and delayed", 
                       "location", "City Hospital Emergency Gate", 
                       "expected", "POTHOLE - CRITICAL (delays emergency medical care)"),
                Map.of("title", "No street light near girls school", 
                       "description", "Street lights on the road to girls school have been broken, students walk in dark during winter mornings", 
                       "location", "Government Girls School Road", 
                       "expected", "STREETLIGHT - HIGH (child safety, women safety)"),
                Map.of("title", "Garbage dump next to maternity ward", 
                       "description", "Garbage piling up right under the maternity ward windows, smell and flies entering ward", 
                       "location", "District Hospital Maternity Wing", 
                       "expected", "GARBAGE - CRITICAL (newborn health risk)"),
                Map.of("title", "No water at dialysis center", 
                       "description", "Kidney dialysis center has no water supply for 2 days, patients missing treatment", 
                       "location", "Kidney Care Center Civil Lines", 
                       "expected", "WATER_SHORTAGE - CRITICAL (life-threatening for patients)"),
                Map.of("title", "Exposed wire near kindergarten", 
                       "description", "Electrical wire hanging low near kindergarten playground, children could touch it", 
                       "location", "Little Stars School Playground", 
                       "expected", "ELECTRICAL_DAMAGE - CRITICAL (small children at risk)"),
                Map.of("title", "Drain blocked at old age home", 
                       "description", "Drain blocked causing water logging at old age home entrance, elderly residents cannot go out", 
                       "location", "Senior Citizen Home Gate", 
                       "expected", "SEWER_DRAINAGE - HIGH (mobility impaired residents)"),
                Map.of("title", "Traffic signal broken near school", 
                       "description", "Traffic signal at school crossing not working, children cross busy road without signal", 
                       "location", "Central School Main Gate Road", 
                       "expected", "TRAFFIC_SIGNALS - CRITICAL (children crossing danger)"),
                Map.of("title", "Broken bench at cancer hospital garden", 
                       "description", "Bench in cancer hospital garden has nails sticking out, patients sit there for fresh air", 
                       "location", "Cancer Institute Garden", 
                       "expected", "PARK_MAINTENANCE - HIGH (sick patients using it)")
            )),
            
            // ============== 4. MULTI-ISSUE COMPLEXITY ==============
            // Tests AI's ability to identify the PRIMARY/ROOT issue when multiple problems mentioned
            Map.entry("MULTI_ISSUE_COMPLEXITY", List.of(
                Map.of("title", "Multiple problems in my area", 
                       "description", "Road has potholes, street light broken, and garbage piled up on corner. Everything is bad.", 
                       "location", "Old Town Area", 
                       "expected", "Should pick most dangerous OR route to appropriate dept"),
                Map.of("title", "Waterlogging causing accidents", 
                       "description", "Blocked drain causing water to accumulate on road, potholes hidden under water, two bikes slipped today", 
                       "location", "Low lying area near market", 
                       "expected", "SEWER_DRAINAGE - HIGH (root cause: blocked drain)"),
                Map.of("title", "Dark pothole accident trap", 
                       "description", "Street light broken AND big pothole on same road, at night you cannot see the pothole, very dangerous", 
                       "location", "Industrial Area Night Shift Road", 
                       "expected", "POTHOLE or STREETLIGHT - HIGH (compound danger)"),
                Map.of("title", "Garbage attracting dogs", 
                       "description", "Garbage not collected for week, now stray dogs fighting over it, dogs also attacking people", 
                       "location", "Market Back Road", 
                       "expected", "GARBAGE - HIGH (root cause) or OTHER - HIGH (dog menace)"),
                Map.of("title", "Water shortage causing fire risk", 
                       "description", "No water in fire hydrants in industrial area, what if fire breaks out? Also no drinking water.", 
                       "location", "Industrial Estate Fire Point", 
                       "expected", "WATER_SHORTAGE - CRITICAL (fire safety implications)")
            )),
            
            // ============== 5. VAGUE/INCOMPLETE DESCRIPTIONS ==============
            // Tests AI's handling of ambiguous, poorly written citizen complaints
            Map.entry("VAGUE_COMPLAINTS", List.of(
                Map.of("title", "Road problem", 
                       "description", "Bad road condition near my house", 
                       "location", "My area", 
                       "expected", "POTHOLE - MEDIUM (assume common road issue)"),
                Map.of("title", "Light issue", 
                       "description", "Light not working", 
                       "location", "Sector 15", 
                       "expected", "STREETLIGHT - MEDIUM (likely street light, not home)"),
                Map.of("title", "Water problem", 
                       "description", "Having water issues since yesterday", 
                       "location", "Colony B", 
                       "expected", "WATER_SHORTAGE - MEDIUM (most common water issue)"),
                Map.of("title", "Help needed urgent", 
                       "description", "Please help us with the issue in our area, it is very bad", 
                       "location", "Unknown locality", 
                       "expected", "OTHER - LOW (insufficient info, low confidence)"),
                Map.of("title", "Problem since long time", 
                       "description", "Same problem happening again and again nobody doing anything", 
                       "location", "Somewhere in city", 
                       "expected", "OTHER - LOW (no specific problem mentioned)"),
                Map.of("title", "Urgent", 
                       "description", "Urgent", 
                       "location", "NA", 
                       "expected", "OTHER - LOW (no information at all)"),
                Map.of("title", "Issue with municipality", 
                       "description", "Municipality department not working properly, very frustrated", 
                       "location", "All areas", 
                       "expected", "OTHER - LOW (complaint about service, not infrastructure)")
            )),
            
            // ============== 6. EDGE CASES / UNUSUAL SCENARIOS ==============
            // Tests AI's handling of complaints that don't fit standard categories
            Map.entry("EDGE_CASES", List.of(
                Map.of("title", "Stray dog pack attack", 
                       "description", "Pack of 10+ stray dogs attacked a child near playground yesterday, child hospitalized", 
                       "location", "Central Park Gate", 
                       "expected", "OTHER - CRITICAL (public safety, animal control)"),
                Map.of("title", "Illegal construction blocking drain", 
                       "description", "Someone built shop over storm drain, now entire street floods every rain", 
                       "location", "Market Area Lane 5", 
                       "expected", "SEWER_DRAINAGE - HIGH (focus on drain) or OTHER (illegal construction)"),
                Map.of("title", "Snake in park", 
                       "description", "Saw cobra in public park, people scared to go there now", 
                       "location", "Nehru Park", 
                       "expected", "OTHER - HIGH (wildlife, safety concern)"),
                Map.of("title", "Mosquito breeding", 
                       "description", "Stagnant water in empty plot becoming mosquito breeding ground, dengue cases increasing", 
                       "location", "Vacant Plot Behind Hospital", 
                       "expected", "SEWER_DRAINAGE - HIGH (stagnant water) or OTHER (health)"),
                Map.of("title", "Noise pollution from generator", 
                       "description", "Shop running loud generator on street 24/7, cannot sleep", 
                       "location", "Commercial Area", 
                       "expected", "OTHER - LOW (noise complaint, different jurisdiction)"),
                Map.of("title", "Road marking faded", 
                       "description", "Zebra crossing and lane markings completely faded, confusion at junction", 
                       "location", "Main Junction", 
                       "expected", "TRAFFIC_SIGNALS - MEDIUM (traffic safety) or OTHER"),
                Map.of("title", "Public toilet locked always", 
                       "description", "Public toilet always locked, people forced to defecate in open", 
                       "location", "Bus Stand", 
                       "expected", "OTHER - MEDIUM (sanitation, maintenance)")
            )),
            
            // ============== 7. TIME/URGENCY CONTEXT ==============
            // Tests AI's understanding of urgency based on time-sensitive situations
            Map.entry("TIME_SENSITIVITY", List.of(
                Map.of("title", "Wedding function tomorrow no power", 
                       "description", "Marriage hall has no electricity, wedding function starting tomorrow morning", 
                       "location", "Community Hall Ring Road", 
                       "expected", "ELECTRICAL_DAMAGE - HIGH (time-critical event)"),
                Map.of("title", "No water elderly and infants suffering", 
                       "description", "No water supply for 3 days, we have bedridden elderly and 2 month old infant at home", 
                       "location", "Old Age Home Area", 
                       "expected", "WATER_SHORTAGE - CRITICAL (vulnerable population)"),
                Map.of("title", "Festival next week light request", 
                       "description", "Diwali festival next week, requesting additional street lights decoration in our area", 
                       "location", "Temple Road", 
                       "expected", "STREETLIGHT - LOW (request not repair, not urgent)"),
                Map.of("title", "Exam center power issue", 
                       "description", "Board exam center has power fluctuation, exams starting day after tomorrow", 
                       "location", "Government School Exam Center", 
                       "expected", "ELECTRICAL_DAMAGE - CRITICAL (affects many students)"),
                Map.of("title", "VIP visit route pothole", 
                       "description", "CM visit next week, main route has potholes, need immediate repair", 
                       "location", "VIP Road", 
                       "expected", "POTHOLE - HIGH (political pressure but also visibility)"),
                Map.of("title", "Monsoon coming drain issue", 
                       "description", "Monsoon starting next month, drains still clogged from last year, will flood again", 
                       "location", "Flood Prone Area", 
                       "expected", "SEWER_DRAINAGE - HIGH (preventive urgency)")
            )),
            
            // ============== 8. LANGUAGE/PHRASING VARIATIONS ==============
            // Tests AI's understanding of same issue described differently
            Map.entry("SEMANTIC_VARIATIONS", List.of(
                Map.of("title", "Pothole causing tire burst", 
                       "description", "My bike tire burst due to pothole on MG Road yesterday", 
                       "location", "MG Road near SBI bank", 
                       "expected", "POTHOLE - HIGH (damage already occurring)"),
                Map.of("title", "Road damaged crater", 
                       "description", "Deep crater in road, several people have fallen from bikes", 
                       "location", "Near SBI bank MG Road", 
                       "expected", "POTHOLE - HIGH (same issue, different words)"),
                Map.of("title", "Road pit dangerous", 
                       "description", "Large hole in middle of road causing accidents daily", 
                       "location", "SBI Bank Road", 
                       "expected", "POTHOLE - HIGH (hole=pothole understanding)"),
                Map.of("title", "Bijli ka taar gir gaya", 
                       "description", "Bijli ka taar sadak pe gir gaya hai, bahut khatarnak hai", 
                       "location", "Bazaar Road", 
                       "expected", "ELECTRICAL_DAMAGE - CRITICAL (Hindi: wire fallen)"),
                Map.of("title", "Pani nahi aa raha", 
                       "description", "Subah se pani nahi aa raha, bohot problem ho rahi hai", 
                       "location", "Gandhi Nagar", 
                       "expected", "WATER_SHORTAGE - MEDIUM (Hindi: no water)"),
                Map.of("title", "Lamp post down", 
                       "description", "The lamp post near bus stop has fallen down", 
                       "location", "Bus Stand Area", 
                       "expected", "STREETLIGHT - HIGH (physical hazard, not just not working)")
            ))
        );
    }
    
    private String getGroupDescription(String groupName) {
        return switch(groupName) {
            case "BASIC_CATEGORIZATION" -> "Tests basic category identification from clear descriptions";
            case "SAFETY_HAZARD_UPGRADE" -> "Tests if AI correctly upgrades priority for immediately dangerous situations";
            case "SENSITIVE_LOCATION_UPGRADE" -> "Tests priority upgrade for hospitals, schools, elderly homes, etc.";
            case "MULTI_ISSUE_COMPLEXITY" -> "Tests picking the primary/root issue when multiple problems mentioned";
            case "VAGUE_COMPLAINTS" -> "Tests handling of poorly written, ambiguous, incomplete descriptions";
            case "EDGE_CASES" -> "Tests unusual scenarios that don't fit standard categories";
            case "TIME_SENSITIVITY" -> "Tests understanding of urgency based on time-critical situations";
            case "SEMANTIC_VARIATIONS" -> "Tests understanding same issue described with different words/languages";
            default -> "Test group for AI classification accuracy";
        };
    }
}
