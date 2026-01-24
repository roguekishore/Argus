package com.backend.springapp.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import com.backend.springapp.enums.UserType;
import com.backend.springapp.model.Department;
import com.backend.springapp.model.User;
import com.backend.springapp.repository.DepartmentRepository;
import com.backend.springapp.repository.UserRepository;

/**
 * Pre-populates the database with initial data on application startup.
 * Departments are seeded with fixed IDs for consistency.
 * Sample staff and department heads are created for testing.
 */
@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private UserRepository userRepository;

    private static final String DEFAULT_PASSWORD = "argusargus";

    @Override
    public void run(String... args) throws Exception {
        initializeDepartments();
        initializeSampleStaff();
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
     */
    private void initializeDepartments() {
        if (departmentRepository.count() == 0) {
            departmentRepository.save(new Department(1L, "ROADS", null));
            departmentRepository.save(new Department(2L, "ELECTRICAL", null));
            departmentRepository.save(new Department(3L, "WATER_SUPPLY", null));
            departmentRepository.save(new Department(4L, "SEWERAGE", null));
            departmentRepository.save(new Department(5L, "SANITATION", null));
            departmentRepository.save(new Department(6L, "TRAFFIC", null));
            
            System.out.println("✓ Departments initialized successfully");
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
