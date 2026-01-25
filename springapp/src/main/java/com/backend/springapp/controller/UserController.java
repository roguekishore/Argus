package com.backend.springapp.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.backend.springapp.dto.request.UserRequestDTO;
import com.backend.springapp.dto.response.UserResponseDTO;
import com.backend.springapp.service.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
@Validated
public class UserController {
    
    @Autowired
    private UserService userService;
    
    @PostMapping
    public ResponseEntity<UserResponseDTO> createUser(@Valid @RequestBody UserRequestDTO request) {
        UserResponseDTO response = userService.createUser(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }
    
    @GetMapping
    public ResponseEntity<List<UserResponseDTO>> getAllUsers() {
        List<UserResponseDTO> users = userService.getAllUsers();
        return ResponseEntity.ok(users);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<UserResponseDTO> getUserById(@PathVariable Long id) {
        UserResponseDTO user = userService.getUserById(id);
        return ResponseEntity.ok(user);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<UserResponseDTO> updateUser(
            @PathVariable Long id, 
            @Valid @RequestBody UserRequestDTO request) {
        UserResponseDTO updated = userService.updateUser(id, request);
        return ResponseEntity.ok(updated);
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
    
    @GetMapping("/mobile")
    public ResponseEntity<UserResponseDTO> getUserByMobile(@RequestParam String mobile) {
        UserResponseDTO user = userService.getUserByMobile(mobile);
        return ResponseEntity.ok(user);
    }
    
    @GetMapping("/email")
    public ResponseEntity<UserResponseDTO> getUserByEmail(@RequestParam String email) {
        UserResponseDTO user = userService.getUserByEmail(email);
        return ResponseEntity.ok(user);
    }

    // ==================== STAFF MANAGEMENT ENDPOINTS ====================

    /**
     * Create a staff member and assign to a department.
     * POST /api/users/staff?deptId=1
     */
    @PostMapping("/staff")
    public ResponseEntity<UserResponseDTO> createStaff(
            @Valid @RequestBody UserRequestDTO request,
            @RequestParam Long deptId) {
        UserResponseDTO staff = userService.createStaff(request, deptId);
        return new ResponseEntity<>(staff, HttpStatus.CREATED);
    }

    /**
     * Assign a staff member as department head.
     * PUT /api/users/{userId}/assign-head?deptId=1
     */
    @PutMapping("/{userId}/assign-head")
    public ResponseEntity<UserResponseDTO> assignDepartmentHead(
            @PathVariable Long userId,
            @RequestParam Long deptId) {
        UserResponseDTO deptHead = userService.assignDepartmentHead(userId, deptId);
        return ResponseEntity.ok(deptHead);
    }

    /**
     * Get all staff members of a department.
     * GET /api/users/department/{deptId}/staff
     */
    @GetMapping("/department/{deptId}/staff")
    public ResponseEntity<List<UserResponseDTO>> getStaffByDepartment(@PathVariable Long deptId) {
        List<UserResponseDTO> staff = userService.getStaffByDepartment(deptId);
        return ResponseEntity.ok(staff);
    }

    /**
     * Get department head of a specific department.
     * GET /api/users/department/{deptId}/head
     */
    @GetMapping("/department/{deptId}/head")
    public ResponseEntity<UserResponseDTO> getDepartmentHead(@PathVariable Long deptId) {
        UserResponseDTO head = userService.getDepartmentHead(deptId);
        return ResponseEntity.ok(head);
    }
}
