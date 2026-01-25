package com.backend.springapp.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import com.backend.springapp.enums.Priority;
import com.backend.springapp.enums.UserType;
import com.backend.springapp.model.Category;
import com.backend.springapp.model.Department;
import com.backend.springapp.model.SLA;
import com.backend.springapp.model.User;
import com.backend.springapp.repository.CategoryRepository;
import com.backend.springapp.repository.DepartmentRepository;
import com.backend.springapp.repository.SLARepository;
import com.backend.springapp.repository.UserRepository;

/**
 * Pre-populates the database with initial data on application startup.
 * 
 * Initialization order matters:
 * 1. Departments (organizational structure)
 * 2. Categories (complaint types with AI keywords)
 * 3. SLA Configs (links Category → Department + SLA rules)
 * 4. Sample Staff (for testing)
 */
@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private SLARepository slaRepository;

    private static final String DEFAULT_PASSWORD = "argusargus";

    @Override
    public void run(String... args) throws Exception {
        initializeDepartments();
        initializeCategories();
        initializeSLAConfigs();
        initializeSampleStaff();
        initializeCitizenUser();
        initializeAdminUser();
        initializeSuperAdminUser();
        initializeMunicipalCommissionerUser();
    }

    /**
     * Pre-populate departments if not already present.
     * IDs are fixed for easy reference:
     * 1 - ROADS
     * 2 - ELECTRICAL
     * 3 - WATER_SUPPLY
     * 4 - SEWERAGE
     * 5 - SANITATION
     * 6 - TRAFFIC
     * 7 - PARKS
     * 
     * NOTE: No ADMIN department. Administrators are system-wide users
     * who don't belong to any specific department. Low-confidence complaints
     * have NULL departmentId and are manually routed by admins.
     */
    private void initializeDepartments() {
        if (departmentRepository.count() == 0) {
            departmentRepository.save(new Department(1L, "ROADS", null));
            departmentRepository.save(new Department(2L, "ELECTRICAL", null));
            departmentRepository.save(new Department(3L, "WATER_SUPPLY", null));
            departmentRepository.save(new Department(4L, "SEWERAGE", null));
            departmentRepository.save(new Department(5L, "SANITATION", null));
            departmentRepository.save(new Department(6L, "TRAFFIC", null));
            departmentRepository.save(new Department(7L, "PARKS", null));
            // NOTE: No ADMIN department - Admins don't belong to a department
            // Low-confidence complaints have NULL departmentId and are manually routed
            
            System.out.println("✓ Departments initialized successfully");
        }
    }

    /**
     * Initialize complaint categories with AI-friendly keywords.
     * Keywords help AI classify citizen complaints into correct categories.
     * 
     * Categories can be added/modified via admin UI later.
     * AI can also suggest new categories for admin approval.
     */
    private void initializeCategories() {
        if (categoryRepository.count() == 0) {
            categoryRepository.save(new Category(
                "POTHOLE", 
                "Road surface damage and potholes",
                "pothole,road damage,crater,hole in road,broken road,road repair"
            ));
            categoryRepository.save(new Category(
                "STREETLIGHT", 
                "Non-functional or damaged street lights",
                "streetlight,street lamp,light not working,dark street,broken light,lamp post"
            ));
            categoryRepository.save(new Category(
                "WATER_SHORTAGE", 
                "Water supply issues and shortages",
                "no water,water shortage,low pressure,water supply,tap not working,dry tap"
            ));
            categoryRepository.save(new Category(
                "SEWER_DRAINAGE", 
                "Sewerage and drainage problems",
                "sewer,drainage,blocked drain,overflow,sewage,gutter,clogged,flooding"
            ));
            categoryRepository.save(new Category(
                "GARBAGE", 
                "Garbage collection and waste management",
                "garbage,trash,waste,litter,not collected,dump,rubbish,debris"
            ));
            categoryRepository.save(new Category(
                "TRAFFIC_SIGNALS", 
                "Traffic signal malfunctions",
                "traffic light,signal,red light,not working,traffic jam,broken signal"
            ));
            categoryRepository.save(new Category(
                "PARK_MAINTENANCE", 
                "Public park and garden maintenance",
                "park,garden,playground,bench,grass,tree,public space,maintenance"
            ));
            categoryRepository.save(new Category(
                "ELECTRICAL_DAMAGE", 
                "Dangerous electrical hazards (HIGH PRIORITY)",
                "electric,wire,shock,sparks,transformer,cable,dangerous,hazard,exposed wire"
            ));
            categoryRepository.save(new Category(
                "OTHER", 
                "General complaints not fitting other categories",
                "other,general,miscellaneous,complaint"
            ));

            System.out.println("✓ Categories initialized successfully");
        }
    }

    /**
     * Initialize SLA configurations for each category.
     * Maps Category → Department, SLA Days, Base Priority
     * 
     * This is the "rulebook" - AI determines category, then system
     * uses this config to set department, deadline, and base priority.
     * 
     * Escalation is handled at service level with fixed intervals:
     * - Level 1: SLA + 1 day overdue (notify supervisor, priority → HIGH)
     * - Level 2: SLA + 3 days overdue (notify dept head, priority → HIGH)  
     * - Level 3: SLA + 5 days overdue (notify commissioner, priority → CRITICAL)
     */
    private void initializeSLAConfigs() {
        if (slaRepository.count() == 0) {
            // Fetch departments (no ADMIN department anymore)
            Department roads = departmentRepository.findById(1L).orElseThrow();
            Department electrical = departmentRepository.findById(2L).orElseThrow();
            Department waterSupply = departmentRepository.findById(3L).orElseThrow();
            Department sewerage = departmentRepository.findById(4L).orElseThrow();
            Department sanitation = departmentRepository.findById(5L).orElseThrow();
            Department traffic = departmentRepository.findById(6L).orElseThrow();
            Department parks = departmentRepository.findById(7L).orElseThrow();

            // Fetch categories
            Category pothole = categoryRepository.findByName("POTHOLE").orElseThrow();
            Category streetlight = categoryRepository.findByName("STREETLIGHT").orElseThrow();
            Category waterShortage = categoryRepository.findByName("WATER_SHORTAGE").orElseThrow();
            Category sewerDrainage = categoryRepository.findByName("SEWER_DRAINAGE").orElseThrow();
            Category garbage = categoryRepository.findByName("GARBAGE").orElseThrow();
            Category trafficSignals = categoryRepository.findByName("TRAFFIC_SIGNALS").orElseThrow();
            Category parkMaintenance = categoryRepository.findByName("PARK_MAINTENANCE").orElseThrow();
            Category electricalDamage = categoryRepository.findByName("ELECTRICAL_DAMAGE").orElseThrow();
            Category other = categoryRepository.findByName("OTHER").orElseThrow();

            // Category → Department mapping with SLA and Base Priority
            slaRepository.save(new SLA(pothole, 7, Priority.MEDIUM, roads));
            slaRepository.save(new SLA(streetlight, 10, Priority.MEDIUM, electrical));
            slaRepository.save(new SLA(waterShortage, 5, Priority.HIGH, waterSupply));
            slaRepository.save(new SLA(sewerDrainage, 7, Priority.MEDIUM, sewerage));
            slaRepository.save(new SLA(garbage, 3, Priority.LOW, sanitation));
            slaRepository.save(new SLA(trafficSignals, 5, Priority.MEDIUM, traffic));
            slaRepository.save(new SLA(parkMaintenance, 10, Priority.LOW, parks));
            slaRepository.save(new SLA(electricalDamage, 3, Priority.CRITICAL, electrical));  // Safety!
            // OTHER category maps to ROADS as default fallback (but typically AI confidence
            // will be low for OTHER, triggering manual routing anyway)
            slaRepository.save(new SLA(other, 14, Priority.LOW, roads));

            System.out.println("✓ SLA configurations initialized successfully");
        }
    }
    /**
     * Pre-populate a sample citizen user for testing.
     */
    private void initializeCitizenUser() {
        if (userRepository.findByUserType(UserType.CITIZEN).isEmpty()) {
            User citizen = new User();
            citizen.setName("Test Citizen");
            citizen.setEmail("citizen@gmail.com");
            citizen.setMobile("9876543000");
            citizen.setPassword(DEFAULT_PASSWORD);
            citizen.setUserType(UserType.CITIZEN);
            userRepository.save(citizen);
            System.out.println("✓ Citizen user initialized successfully");
        }
    }

    /**
     * Pre-populate an admin user for testing.
     * Admin users are system-wide and don't belong to any department.
     * They handle manual routing of low-confidence AI complaints.
     */
    private void initializeAdminUser() {
        if (userRepository.findByUserType(UserType.ADMIN).isEmpty()) {
            User admin = new User();
            admin.setName("System Admin");
            admin.setEmail("admin@gmail.com");
            admin.setMobile("9876541111");
            admin.setPassword(DEFAULT_PASSWORD);
            admin.setUserType(UserType.ADMIN);
            // NOTE: No deptId - Admins are system-wide, not department-specific
            admin.setDeptId(null);
            userRepository.save(admin);
            System.out.println("✓ Admin user initialized successfully");
        }
    }

    /**
     * Pre-populate a superadmin user for testing.
     */
    private void initializeSuperAdminUser() {
        if (userRepository.findByUserType(UserType.SUPER_ADMIN).isEmpty()) {
            User superadmin = new User();
            superadmin.setName("Super Admin");
            superadmin.setEmail("superadmin@gmail.com");
            superadmin.setMobile("9876540000");
            superadmin.setPassword(DEFAULT_PASSWORD);
            superadmin.setUserType(UserType.SUPER_ADMIN);
            userRepository.save(superadmin);
            System.out.println("✓ Superadmin user initialized successfully");
        }
    }

    /**
     * Pre-populate a municipal commissioner user for testing.
     */
    private void initializeMunicipalCommissionerUser() {
        if (userRepository.findByUserType(UserType.MUNICIPAL_COMMISSIONER).isEmpty()) {
            User commissioner = new User();
            commissioner.setName("Municipal Commissioner");
            commissioner.setEmail("commissioner@gmail.com");
            commissioner.setMobile("9876549999");
            commissioner.setPassword(DEFAULT_PASSWORD);
            commissioner.setUserType(UserType.MUNICIPAL_COMMISSIONER);
            userRepository.save(commissioner);
            System.out.println("✓ Municipal Commissioner user initialized successfully");
        }
    }
    /**
     * Pre-populate sample staff and department heads for testing.
     * Each department gets 3 staff members and 1 department head.
     */
    private void initializeSampleStaff() {
        if (userRepository.findByUserType(UserType.STAFF).isEmpty() && 
            userRepository.findByUserType(UserType.DEPT_HEAD).isEmpty()) {

            // ===== DEPARTMENT 1: ROADS =====
            createStaff("Roads Staff 1", "roads1@gmail.com", "9876543101", 1L);
            createStaff("Roads Staff 2", "roads2@gmail.com", "9876543102", 1L);
            createStaff("Roads Staff 3", "roads3@gmail.com", "9876543103", 1L);
            createDeptHead("Roads Head", "roadshead@gmail.com", "9876543100", 1L);

            // ===== DEPARTMENT 2: ELECTRICAL =====
            createStaff("Electrical Staff 1", "electrical1@gmail.com", "9876543201", 2L);
            createStaff("Electrical Staff 2", "electrical2@gmail.com", "9876543202", 2L);
            createStaff("Electrical Staff 3", "electrical3@gmail.com", "9876543203", 2L);
            createDeptHead("Electrical Head", "electricalhead@gmail.com", "9876543200", 2L);

            // ===== DEPARTMENT 3: WATER_SUPPLY =====
            createStaff("Water Staff 1", "water1@gmail.com", "9876543301", 3L);
            createStaff("Water Staff 2", "water2@gmail.com", "9876543302", 3L);
            createStaff("Water Staff 3", "water3@gmail.com", "9876543303", 3L);
            createDeptHead("Water Head", "waterhead@gmail.com", "9876543300", 3L);

            // ===== DEPARTMENT 4: SEWERAGE =====
            createStaff("Sewerage Staff 1", "sewerage1@gmail.com", "9876543401", 4L);
            createStaff("Sewerage Staff 2", "sewerage2@gmail.com", "9876543402", 4L);
            createStaff("Sewerage Staff 3", "sewerage3@gmail.com", "9876543403", 4L);
            createDeptHead("Sewerage Head", "seweragehead@gmail.com", "9876543400", 4L);

            // ===== DEPARTMENT 5: SANITATION =====
            createStaff("Sanitation Staff 1", "sanitation1@gmail.com", "9876543501", 5L);
            createStaff("Sanitation Staff 2", "sanitation2@gmail.com", "9876543502", 5L);
            createStaff("Sanitation Staff 3", "sanitation3@gmail.com", "9876543503", 5L);
            createDeptHead("Sanitation Head", "sanitationhead@gmail.com", "9876543500", 5L);

            // ===== DEPARTMENT 6: TRAFFIC =====
            createStaff("Traffic Staff 1", "traffic1@gmail.com", "9876543601", 6L);
            createStaff("Traffic Staff 2", "traffic2@gmail.com", "9876543602", 6L);
            createStaff("Traffic Staff 3", "traffic3@gmail.com", "9876543603", 6L);
            createDeptHead("Traffic Head", "traffichead@gmail.com", "9876543600", 6L);

            // ===== DEPARTMENT 7: PARKS =====
            createStaff("Parks Staff 1", "parks1@gmail.com", "9876543701", 7L);
            createStaff("Parks Staff 2", "parks2@gmail.com", "9876543702", 7L);
            createStaff("Parks Staff 3", "parks3@gmail.com", "9876543703", 7L);
            createDeptHead("Parks Head", "parkshead@gmail.com", "9876543700", 7L);

            // NOTE: No ADMIN department staff - Admins are system-wide users without department

            System.out.println("✓ Sample staff and department heads initialized successfully");
        }
    }

    private void createStaff(String name, String email, String mobile, Long deptId) {
        User staff = new User();
        staff.setName(name);
        staff.setEmail(email);
        staff.setMobile(mobile);
        staff.setPassword(DEFAULT_PASSWORD);
        staff.setDeptId(deptId);
        staff.setUserType(UserType.STAFF);
        userRepository.save(staff);
    }

    private void createDeptHead(String name, String email, String mobile, Long deptId) {
        User head = new User();
        head.setName(name);
        head.setEmail(email);
        head.setMobile(mobile);
        head.setPassword(DEFAULT_PASSWORD);
        head.setDeptId(deptId);
        head.setUserType(UserType.DEPT_HEAD);
        userRepository.save(head);
    }
}
